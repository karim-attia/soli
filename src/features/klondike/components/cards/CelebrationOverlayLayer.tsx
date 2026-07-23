import React, { useCallback, useMemo, useRef, useState } from 'react'
import { PixelRatio, StyleSheet, View, useWindowDimensions } from 'react-native'
import {
  Atlas,
  Canvas,
  ClipOp,
  Group,
  Image,
  RoundedRect,
  Shadow,
  Skia,
  Text,
  rect,
  useColorBuffer,
  useFont,
  useRSXformBuffer,
  useTexture,
} from '@shopify/react-native-skia'
import type {
  SkFont,
  SkImage,
  SkPaint,
  SkRect,
  SkSurface,
} from '@shopify/react-native-skia'
import type { SharedValue } from 'react-native-reanimated'
import {
  runOnJS,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  AVALANCHE_LAUNCH_INTERVAL_RAW,
  CELEBRATION_DURATION_MS,
  CELEBRATION_LAUNCH_SPEED_MULTIPLIER,
  CELEBRATION_SPEED_MULTIPLIER,
  CELEBRATION_WOBBLE_FREQUENCY,
  IMPRINT_LAUNCH_INTERVAL_RAW,
  IMPRINT_RETURN_RAW,
  TAU,
  computeCelebrationFrame,
  easeOutQuint,
  getCelebrationModeMetadata,
  getImprintLaunchOrder,
  getImprintStampCount,
  getImprintStampRaw,
  getImprintStreamCount,
  type CelebrationAssignment,
} from '../../../../animation/celebrationModes'
import {
  CARD_REFERENCE_HEIGHT,
  CARD_REFERENCE_WIDTH,
  COLOR_CARD_BORDER,
  COLOR_CARD_FACE,
  SUIT_COLORS,
  SUIT_SYMBOLS,
} from '../../constants'
import type { CelebrationState } from '../../hooks/useCelebrationController'
import type { CardMetrics, CelebrationBindings } from '../../types'
import { rankToLabel } from './utils'

// Skia Atlas celebration renderer (celebration-skia-atlas story): the 52 card faces are
// rasterized ONCE into a texture atlas; every frame one worklet writes all sprite
// transforms (cards + trail ghosts) into an RSXform buffer and another writes alpha into
// a color buffer, and Skia draws everything in a single GPU draw call. This replaced the
// previous per-card Animated.View + CardVisual tree (up to ~208 views pushing Fabric
// updates every frame — janked and heated up budget Androids, see
// docs/product/celebration-smoothness/celebration-smoothness.md Story 5).

// Card-face layout, transcribed from CardVisual.tsx (keep in sync — the celebration
// deliberately draws its own faces instead of snapshotting CardVisual so celebration
// start stays instant, design decision 1a in the plan doc). All values are dp at the
// 48×68 reference card size and scale with the card like CardVisual's scaleValue().
const CARD_PADDING_VERTICAL = 6
const CARD_CORNER_RANK_TOP = -2
const CARD_CORNER_RANK_LEFT = 3
const CARD_CORNER_RANK_FONT = 16
const CARD_CORNER_SUIT_TOP = 1
const CARD_CORNER_SUIT_RIGHT = 2
const CARD_CORNER_SUIT_FONT = 11
const CARD_SYMBOL_FONT = 28
const CARD_SYMBOL_MARGIN_TOP = 16
const CARD_BORDER_WIDTH = 1

// Baked drop shadow (renderer-polish story, user 2026-07-08: flat cards are a release
// blocker). The old view renderer's shadow was styles.cardBase (iOS shadowRadius 6 /
// shadowOpacity 0.2, no offset — and iOS-ONLY, Android had no elevation), and it was
// dropped by design decision 1a. Skia's <Shadow blur> is the gaussian SIGMA and iOS
// shadowRadius ≈ 2σ, so radius 6 → σ 3. A small dy grounds the cards in motion. All dp.
const CARD_SHADOW_SIGMA = 3
const CARD_SHADOW_DY = 1
const CARD_SHADOW_COLOR = 'rgba(0, 0, 0, 0.2)'
// Cell padding so the blur is not clipped by the sprite rect: 3σ covers >99% of the
// gaussian, plus the dy offset. The 1px gutter alone is far too small.
const CARD_SHADOW_MARGIN = 3 * CARD_SHADOW_SIGMA + CARD_SHADOW_DY

// Transcribed from CardVisual.tsx (not exported there).
const deriveCardScale = (metrics: CardMetrics) => {
  if (metrics.width) {
    return metrics.width / CARD_REFERENCE_WIDTH
  }
  if (metrics.height) {
    return metrics.height / CARD_REFERENCE_HEIGHT
  }
  return 1
}

// 1px gutter between atlas cells so linear sampling on rotated sprites can't bleed a
// neighbor card's pixels into the rounded-corner transparency.
const ATLAS_COLUMNS = 13
const ATLAS_GUTTER = 1

// Imprint surface: permanent stamps drawn ONCE each onto an accumulating offscreen
// Skia surface (CascadeImprintLayer below) and displayed as a single <Image> under
// the live Atlas — approach B of the imprint story, adopted in polish round 2
// (2026-07-08). The previous approach (imprints as extra frozen Atlas sprites) was
// abandoned after reading the 2.6.2 source: the Canvas container re-marshals EVERY
// shared-value prop on EVERY tick (applyUpdates in cpp/api/recorder/JsiRecorder.h
// runs all stored conversion functions with no per-variable dirty tracking,
// triggered by Container.native.ts's single mapper), so a 52×111-sprite buffer
// costs ~5.7k JSI host-object unwraps per tick even when nothing in it changed —
// that marshalling (plus GPU-rasterizing thousands of shadow-padded quads per
// frame) capped mode 33 at ~31-41 fps. With the surface, per-tick cost is 52 live
// sprites + an O(1) image handle.
// Ten-crazy-modes story (2026-07-08): which modes stamp, and WHEN, is now fully
// metadata/schedule-driven — `metadata.imprint` mounts the layer, and the exported
// getImprintStampCount/Raw/StreamCount schedules (celebrationModes.ts, next to the
// mode math they must agree with) drive one generic write-once stamp loop. Only the
// mode-33 'cascade' policy keeps bespoke renderer behavior (pile reveals + launch-
// window live-card visibility).
const AVALANCHE_MODE_ID = 31
// Same-pile launch spacing in mode 33: launch order cycles the suits, so a card's
// pile predecessor launches exactly 4 intervals before it. Used by the imprint
// layer's pile-reveal schedule (pile-stability story, 2026-07-08 — mode 33's waiting
// piles are STAMPED into the imprint surface at reveal time instead of rendered as
// live sprites, so tracers from later flights paint over them like the real Windows
// framebuffer; see CascadeImprintLayer). Mode 31 still renders waiting piles as live
// sprites — it has no imprint surface (avalancheLaunch below).
const IMPRINT_PILE_GAP_RAW = 4 * IMPRINT_LAUNCH_INTERVAL_RAW

// RN Text centers/positions by advance width; measureText() returns ink bounds, so sum
// glyph advances instead to place glyphs like the view renderer did.
const textAdvance = (font: SkFont, text: string) =>
  font.getGlyphWidths(font.getGlyphIDs(text)).reduce((sum, width) => sum + width, 0)

// Skia's Text y is the BASELINE; RN lays the text box out from its top. ascent < 0.
const baselineFromTop = (font: SkFont, top: number) => top - font.getMetrics().ascent

type CelebrationOverlayLayerProps = {
  celebrationState: CelebrationState | null
  celebrationBindings: CelebrationBindings
  cardMetrics: CardMetrics
  // Fired once per mount when the atlas texture is ready — i.e. the overlay's first
  // visible frame can actually draw (outline-audit/flicker story, user 2026-07-09).
  // The controller uses it to keep the REAL board cards mounted until then; hiding
  // them on celebrationState alone left the foundation area EMPTY for the few frames
  // the async atlas rasterization takes (visible flicker at celebration start).
  onOverlayReady?: () => void
}

export const CelebrationOverlayLayer = ({
  celebrationState,
  celebrationBindings,
  cardMetrics,
  onOverlayReady,
}: CelebrationOverlayLayerProps) => {
  // Mounting contract (design decision 8): null state ⇒ no Canvas mounted. Unmounting
  // the inner component releases the Canvas surface and drops the atlas texture. The
  // hooks live in the inner component so none of them run while idle.
  if (!celebrationState) {
    return null
  }
  return (
    <CelebrationAtlas
      state={celebrationState}
      bindings={celebrationBindings}
      metrics={cardMetrics}
      onOverlayReady={onOverlayReady}
    />
  )
}

type CelebrationAtlasProps = {
  state: CelebrationState
  bindings: CelebrationBindings
  metrics: CardMetrics
  onOverlayReady?: () => void
}

const CelebrationAtlas = ({
  state,
  bindings,
  metrics,
  onOverlayReady,
}: CelebrationAtlasProps) => {
  // Full-window canvas (renderer-polish story, user 2026-07-08): a Skia Canvas clips at
  // its bounds, so an absoluteFill canvas cut cards off at the board container's top
  // edge (the old Animated.Views overflowed freely). Fix: measure the overlay's offset
  // in the window once and stretch the canvas over the WHOLE window with negative
  // top/left. Keeping the canvas at the same spot in the element tree preserves the
  // sibling z-order (touch blocker + badge above, as before); only paint bounds grow.
  // All sprite math stays in board coordinates — the offset is added to tx/ty in the
  // RSXform worklet (two captured constants, free). Until the async measure resolves
  // (~1 frame) the offset is 0 = the old clipped extent; invisible in practice because
  // cards launch from the foundations well inside the board.
  const window = useWindowDimensions()
  const wrapperRef = useRef<View>(null)
  // null until measureInWindow resolves (~1 frame) — the floor derivation below must
  // know whether a real measurement exists, so no {0,0} sentinel.
  const [windowOffset, setWindowOffset] = useState<{ x: number; y: number } | null>(
    null
  )
  const handleWrapperLayout = useCallback(() => {
    wrapperRef.current?.measureInWindow((x, y) => {
      setWindowOffset((current) =>
        current && current.x === x && current.y === y ? current : { x, y }
      )
    })
  }, [])

  // Pixel density (design decision 5): offscreen Skia surfaces are raw pixels with no
  // automatic density scaling, so the atlas is rasterized at pd× and the 1/pd is folded
  // back into each sprite's RSXform scale. Skipping this gives visibly blurry cards.
  const pd = PixelRatio.get()
  const cardScale = deriveCardScale(metrics)
  // px-space font sizes: dp size × card scale (CardVisual's scaleValue) × pd.
  const rankFont = useFont(
    require('../../../../../assets/fonts/CardTextAndroid-Bold.ttf'),
    CARD_CORNER_RANK_FONT * cardScale * pd
  )
  const suitFont = useFont(
    require('../../../../../assets/fonts/CardTextAndroid-SemiBold.ttf'),
    CARD_CORNER_SUIT_FONT * cardScale * pd
  )
  const centerFont = useFont(
    require('../../../../../assets/fonts/CardTextAndroid-SemiBold.ttf'),
    CARD_SYMBOL_FONT * cardScale * pd
  )

  // Cell geometry (shadow margin, renderer-polish story): cell = margin + face +
  // margin with EQUAL margins on all four sides, so the face center coincides with the
  // padded-cell center — the RSXform anchor math below can keep using cell/2 and the
  // FACE still lands exactly where the motion math says.
  const faceWidth = Math.round(metrics.width * pd)
  const faceHeight = Math.round(metrics.height * pd)
  const shadowMargin = Math.ceil(CARD_SHADOW_MARGIN * pd)
  const cellWidth = faceWidth + 2 * shadowMargin
  const cellHeight = faceHeight + 2 * shadowMargin
  const atlasSize = useMemo(() => {
    const rows = Math.ceil(state.cards.length / ATLAS_COLUMNS)
    return {
      width: ATLAS_COLUMNS * (cellWidth + ATLAS_GUTTER),
      height: rows * (cellHeight + ATLAS_GUTTER),
    }
  }, [state.cards.length, cellWidth, cellHeight])

  const cellOrigin = (slot: number) => ({
    x: (slot % ATLAS_COLUMNS) * (cellWidth + ATLAS_GUTTER),
    y: Math.floor(slot / ATLAS_COLUMNS) * (cellHeight + ATLAS_GUTTER),
  })

  const atlasElement = useMemo(
    () => (
      <Group>
        {state.cards.map((config, slot) => {
          const origin = cellOrigin(slot)
          // Face top-left inside the padded cell; all face-relative drawing hangs off it.
          const x = origin.x + shadowMargin
          const y = origin.y + shadowMargin
          const scale = (value: number) => value * cardScale * pd
          const border = CARD_BORDER_WIDTH * pd
          const suitColor = SUIT_COLORS[config.card.suit]
          const rank = rankToLabel(config.card.rank)
          const suit = SUIT_SYMBOLS[config.card.suit]
          // Center suit reproduces CardVisual's flexbox result: the (text + marginTop)
          // box is vertically centered in the content box, i.e. the glyph sits
          // marginTop/2 below center. Text height ≈ descent − ascent (the font's
          // vertical metrics are patched to be identical on both platforms — see
          // components/cards/fonts.ts). Fine-tuned on device in plan step 7 if needed.
          const centerTextHeight = centerFont
            ? centerFont.getMetrics().descent - centerFont.getMetrics().ascent
            : 0
          const contentTop = border + scale(CARD_PADDING_VERTICAL)
          const contentHeight = faceHeight - 2 * contentTop
          const centerTop =
            contentTop +
            contentHeight / 2 -
            centerTextHeight / 2 +
            scale(CARD_SYMBOL_MARGIN_TOP) / 2
          return (
            <Group key={slot}>
              <RoundedRect
                x={x}
                y={y}
                width={faceWidth}
                height={faceHeight}
                r={metrics.radius * pd}
                color={COLOR_CARD_FACE}
              >
                {/* Drop shadow baked into the cell; it rotates with the card sprite —
                    same as the old transform-based view shadow did. */}
                <Shadow
                  dx={0}
                  dy={CARD_SHADOW_DY * pd}
                  blur={CARD_SHADOW_SIGMA * pd}
                  color={CARD_SHADOW_COLOR}
                />
              </RoundedRect>
              {/* RN draws borders inside the box; Skia strokes centered on the path,
                  hence the half-stroke inset. */}
              <RoundedRect
                x={x + border / 2}
                y={y + border / 2}
                width={faceWidth - border}
                height={faceHeight - border}
                r={Math.max(0, metrics.radius * pd - border / 2)}
                style="stroke"
                strokeWidth={border}
                color={COLOR_CARD_BORDER}
              />
              {rankFont ? (
                <Text
                  x={x + border + scale(CARD_CORNER_RANK_LEFT)}
                  y={y + baselineFromTop(rankFont, border + scale(CARD_CORNER_RANK_TOP))}
                  text={rank}
                  font={rankFont}
                  color={suitColor}
                />
              ) : null}
              {suitFont ? (
                <Text
                  x={
                    x +
                    faceWidth -
                    border -
                    scale(CARD_CORNER_SUIT_RIGHT) -
                    textAdvance(suitFont, suit)
                  }
                  y={y + baselineFromTop(suitFont, border + scale(CARD_CORNER_SUIT_TOP))}
                  text={suit}
                  font={suitFont}
                  color={suitColor}
                />
              ) : null}
              {centerFont ? (
                <Text
                  x={x + faceWidth / 2 - textAdvance(centerFont, suit) / 2}
                  y={y + baselineFromTop(centerFont, centerTop)}
                  text={suit}
                  font={centerFont}
                  color={suitColor}
                />
              ) : null}
            </Group>
          )
        })}
      </Group>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.cards, metrics, pd, rankFont, suitFont, centerFont]
  )

  // Texture keying (design decision 8): rebuilt only when the card list / metrics /
  // fonts change — NOT on dev badge mode cycles (they keep the cards array identity)
  // and NOT on dev-hold 60s loop restarts (no state change at all). Fonts load async,
  // so the first build may briefly lack glyphs and rebuilds once they arrive.
  const texture = useTexture(atlasElement, atlasSize, [
    state.cards,
    metrics,
    pd,
    rankFont,
    suitFont,
    centerFont,
  ])

  // Trail ghosts are just extra sprites referencing the same atlas cell at a lagged
  // progress — with Atlas their cost is near zero (same draw call), unlike the old
  // per-ghost views. Derived from state (changes on start + badge cycle) as before.
  const metadata = getCelebrationModeMetadata(state.modeId)
  const trail = metadata.trail
  const trailCount = trail?.count ?? 0
  const trailGapProgress = (trail?.gapMs ?? 0) / CELEBRATION_DURATION_MS
  // Per-mode wobble kill switch (polish round 2, user 2026-07-08): on modes where
  // cards rest/sit (31, 33) the global jitter reads as weird wiggle. A captured
  // constant, like the trail config: state.modeId changes on badge cycle → re-render
  // → the mapper worklets re-register with the new value.
  const wobbleScale = metadata.wobble === false ? 0 : 1
  // Imprint modes render their permanent stamps via CascadeImprintLayer (see the
  // comment on AVALANCHE_MODE_ID above); the Atlas only ever draws the live cards.
  // 'cascade' = mode 33's bespoke Windows behavior; every other policy shares the
  // generic schedule-driven path.
  const imprintConfig = metadata.imprint
  const usesImprintSurface = imprintConfig != null
  const isCascadeImprint = imprintConfig?.policy === 'cascade'
  const isGenericImprint = usesImprintSurface && !isCascadeImprint
  const perSlot = trailCount + 1
  const spriteCount = state.cards.length * perSlot

  const assignments = useMemo<CelebrationAssignment[]>(
    () =>
      state.cards.map((config, index) => ({
        baseX: config.baseX,
        baseY: config.baseY,
        stackIndex: config.stackIndex,
        suitIndex: config.suitIndex,
        randomSeed: config.randomSeed,
        index,
      })),
    [state.cards]
  )

  // Sprite index → (slot, lag, opacity multiplier). Shared by both buffer worklets.
  // j < trailCount is ghost k = trailCount − 1 − j (oldest first, see draw order above);
  // j === trailCount is the card itself.
  const cardWidth = metrics.width
  const cardHeight = metrics.height
  // Board → window translation for the full-window canvas (plain numbers: captured
  // once per mapper registration; a change re-registers the worklet, not per-frame).
  const offsetX = windowOffset?.x ?? 0
  const offsetY = windowOffset?.y ?? 0

  // Deterministic floor (cascade-fixes story, user item 4): state.floorY derives from
  // boardHeight, which depends on whether the undo dock was still mounted when the
  // board was measured — mid-game previews therefore got a visibly HIGHER floor than
  // real wins / fresh-board previews. The window is the stable frame of reference
  // (the canvas covers it anyway): floor in board coords = window bottom − board top
  // − bottom inset, identical for every entry path. state.floorY only bridges the
  // ~1 frame until measureInWindow resolves (cards still sit at base then).
  const insets = useSafeAreaInsets()
  const floorY = windowOffset
    ? window.height - windowOffset.y - insets.bottom
    : state.floorY
  // Captured board/mode/total constants instead of bindings.board/mode/total shared
  // values: they are fixed per celebration state (badge cycles re-render → mappers
  // re-register), and constants also close the 1-frame "board still {0,0} → frame
  // null" hole between the overlay mounting and the controller effect running.
  const board = useMemo(
    () => ({ width: state.boardWidth, height: state.boardHeight, floorY }),
    [state.boardWidth, state.boardHeight, floorY]
  )
  const modeId = state.modeId
  const totalCards = assignments.length

  // Kings-on-top draw order (cascade-fixes story, user item B): sprite z-order is
  // decoupled from the shuffled assignment order via a permutation — Aces draw first,
  // Kings last (on top), ties by suit for determinism. Celebration start then reads
  // as a clean handoff from the real foundations (K visible on top) and overlaps stay
  // rank-ordered all run. The SHUFFLED assignment order is deliberately kept for the
  // motion math (index-based variety in the modes). Pre-Skia the z-order was the
  // shuffled slot order, so Kings-on-top was never guaranteed — this is a fix, not a
  // restoration. stackIndex == rank order (foundations build Ace 0 → King 12).
  //
  // EXCEPTION — Avalanche 31 uses REVERSE LAUNCH order instead (launch-order-z story,
  // user 2026-07-08): with the rank sort, z between a flying card (+ its contiguous
  // trail ghosts) and each waiting pile top was decided by RANK — arbitrary per
  // pairing, since both ranks are random in 31's shuffled launch order. Flying cards
  // and their trails visibly clipped BEHIND higher-ranked waiting piles (the slow
  // trail is where the eye catches it). Earlier-launched cards now draw ABOVE
  // later-launching/waiting ones, so anything in flight (card + ghosts) always tops
  // the waiting piles, and each pile's visible next-to-launch card tops its own
  // hidden (alpha-0) pile mates. Mode 31 is the only mode that needs this: it is the
  // only staggered mode with LIVE waiting-pile sprites (33/36 stamp their piles into
  // the imprint surface, which always renders under the Atlas). Launch order in 31
  // is assignment.index · AVALANCHE_LAUNCH_INTERVAL_RAW, so "reverse launch" =
  // descending index.
  const drawOrder = useMemo(() => {
    const order = assignments.map((_, slot) => slot)
    if (modeId === AVALANCHE_MODE_ID) {
      order.sort((a, b) => assignments[b].index - assignments[a].index)
    } else {
      order.sort(
        (a, b) =>
          assignments[a].stackIndex - assignments[b].stackIndex ||
          assignments[a].suitIndex - assignments[b].suitIndex
      )
    }
    return order
  }, [assignments, modeId])

  // Draw order replaces zIndex (design decision 2): Atlas draws sprites in array
  // order, so per DRAW position we emit [oldest ghost … newest ghost, card], draw
  // positions in the rank-sorted permutation above — the ghost banding the old
  // renderer expressed with per-view zIndex bands, but rank-ordered between cards.
  // Sprite i belongs to slot drawOrder[⌊i/perSlot⌋] — both buffer worklets use the
  // same mapping so a sprite's rect, transform, and color always describe one card.
  const sprites = useMemo<SkRect[]>(
    () =>
      Array.from({ length: spriteCount }, (_, spriteIndex) => {
        const { x, y } = cellOrigin(drawOrder[Math.floor(spriteIndex / perSlot)])
        return rect(x, y, cellWidth, cellHeight)
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spriteCount, perSlot, cellWidth, cellHeight, drawOrder]
  )

  // Avalanche foundation-pile visibility (see IMPRINT_PILE_GAP_RAW comment): launch
  // order is the SHUFFLED assignment order, so same-pile launches are not evenly
  // spaced — precompute each card's launch time and its pile-predecessor's launch
  // time (the moment this card becomes the visible pile top). -1 = visible from t 0.
  const avalancheLaunch = useMemo(() => {
    if (modeId !== AVALANCHE_MODE_ID) {
      return null
    }
    const launchRaw = assignments.map(
      (assignment) => assignment.index * AVALANCHE_LAUNCH_INTERVAL_RAW
    )
    const prevLaunchRaw = assignments.map(() => -1)
    const bySuit: number[][] = [[], [], [], []]
    assignments.forEach((assignment, slot) => bySuit[assignment.suitIndex].push(slot))
    for (const pileSlots of bySuit) {
      pileSlots.sort((a, b) => launchRaw[a] - launchRaw[b])
      for (let i = 1; i < pileSlots.length; i += 1) {
        prevLaunchRaw[pileSlots[i]] = launchRaw[pileSlots[i - 1]]
      }
    }
    return { launchRaw, prevLaunchRaw }
  }, [assignments, modeId])

  // Launch anchor (cascade-fixes story, user item A): the launch blend used to run
  // off raw progress, which was correct pre-Skia because the old renderer kept its
  // 52 views permanently mounted — frame 1 rendered at progress ≈ 0. The Skia
  // renderer mounts the Canvas and rasterizes the atlas at celebration start, so the
  // first VISIBLE frame lands after withTiming has already advanced progress and
  // easeOutQuint(progress·40) is largely saturated (~60% at 250 ms) — cards appeared
  // mid-pattern instead of launching from the foundations. Anchoring the blend to
  // the progress value at the moment the texture becomes ready restores the visible
  // launch without touching the mode math (continuity suite unaffected). Progress
  // wrap (dev-hold loop restart / badge cycle) re-anchors so cards relaunch.
  const launchAnchor = useSharedValue(-1)
  useAnimatedReaction(
    () => ({
      ready: texture.value !== null,
      progress: bindings.progress.value,
    }),
    (current, previous) => {
      'worklet'
      if (!current.ready) {
        return
      }
      if (launchAnchor.value < 0) {
        launchAnchor.value = current.progress
        // First texture-ready of this mount: the overlay can draw from here on, so
        // tell the controller the board-side hide may engage (flicker story — see
        // the onOverlayReady prop comment). Deliberately NOT re-fired on progress
        // wraps (dev-hold restarts / badge cycles): the overlay stays mounted, the
        // board cards are already hidden.
        if (onOverlayReady) {
          runOnJS(onOverlayReady)()
        }
      } else if (current.progress < (previous?.progress ?? 0)) {
        launchAnchor.value = current.progress
      }
    }
  )

  // The math below (launch blend with baseX/baseY, wobble, end fade, instant hide on
  // active <= 0) moved from the old per-slot useAnimatedStyle worklet — it is behavior
  // tuned over several stories (see celebration-smoothness.md); the transform
  // representation changed (RSXform instead of view transforms) and the launch blend
  // is now ANCHORED (cascade-fixes story — see the launchAnchor comment).
  const transforms = useRSXformBuffer(spriteCount, (val, spriteIndex) => {
    'worklet'
    const drawPosition = Math.floor(spriteIndex / perSlot)
    const slot = drawOrder[drawPosition]
    const j = spriteIndex - drawPosition * perSlot
    const assignment = assignments[slot]
    if (!assignment || bindings.active.value <= 0) {
      val.set(0, 0, 0, 0)
      return
    }
    // Per-sprite progress: ghost k rides the exact same path, lagged by (k+1) * gap.
    // Clamped at 0: early on, a ghost simply coincides with the card at its base —
    // invisible.
    let spriteProgress = bindings.progress.value
    if (j < trailCount) {
      const ghostK = trailCount - 1 - j
      spriteProgress = Math.max(
        0,
        bindings.progress.value - (ghostK + 1) * trailGapProgress
      )
    }

    const frame = computeCelebrationFrame({
      modeId,
      assignment,
      metrics: { width: cardWidth, height: cardHeight },
      board,
      totalCards,
      progress: spriteProgress,
    })
    if (!frame) {
      val.set(0, 0, 0, 0)
      return
    }

    const { pathX, pathY, rotation, targetScale, rawProgress, relativeIndex, stackFactor } =
      frame
    // Anchored launch blend (see the launchAnchor comment): frame.launchEased is
    // deliberately IGNORED — it runs off raw progress and has mostly saturated by
    // the renderer's first visible frame. Anchor < 0 (texture not ready) falls back
    // to 0; nothing is drawn then anyway (Atlas image null).
    const anchor = Math.max(0, launchAnchor.value)
    const launchEased = easeOutQuint(
      Math.min(
        1,
        Math.max(0, (spriteProgress - anchor) * CELEBRATION_LAUNCH_SPEED_MULTIPLIER)
      )
    )
    const wobblePhase =
      rawProgress * TAU * CELEBRATION_WOBBLE_FREQUENCY + assignment.randomSeed * TAU
    const wobbleEnvelope = 0.15 + 0.85 * Math.pow(Math.sin(wobblePhase), 2)
    // wobbleScale is 0 for wobble-opt-out modes (metadata `wobble: false`) — resting
    // cards must sit perfectly still there.
    const wobbleX =
      Math.sin(wobblePhase * 1.25 + relativeIndex * 0.4) *
      cardWidth *
      0.1 *
      wobbleEnvelope *
      wobbleScale
    const wobbleY =
      Math.cos(wobblePhase * 0.95 + stackFactor * 4) *
      cardHeight *
      0.11 *
      wobbleEnvelope *
      wobbleScale
    const translateX =
      assignment.baseX * (1 - launchEased) + pathX * launchEased + wobbleX
    const translateY =
      assignment.baseY * (1 - launchEased) + pathY * launchEased + wobbleY
    const scale = 1 + (targetScale - 1) * launchEased

    // Anchor conversion (design decision 4): the frame math yields a top-left dp
    // position with rotation about the card CENTER; RSXform anchors at the sprite's
    // top-left. Compute where the center must land and back out (tx, ty). The 1/pd
    // folds the pd× atlas rasterization back to dp (decision 5). Shadow-margin note:
    // the sprite is the PADDED cell (margin + face + margin, equal margins), so the
    // padded-cell center IS the face center — cell/2 below therefore still maps the
    // FACE center to (cx, cy). offsetX/offsetY shift board coords into the
    // full-window canvas.
    const r = (rotation * launchEased * Math.PI) / 180
    const s = scale / pd
    const scos = s * Math.cos(r)
    const ssin = s * Math.sin(r)
    const cx = offsetX + translateX + cardWidth / 2
    const cy = offsetY + translateY + cardHeight / 2
    val.set(
      scos,
      ssin,
      cx - (scos * (cellWidth / 2) - ssin * (cellHeight / 2)),
      cy - (ssin * (cellWidth / 2) + scos * (cellHeight / 2))
    )
  })

  // Per-sprite alpha via colors + colorBlendMode="modulate" with UNPREMULTIPLIED
  // white (1, 1, 1, alpha). THIRD iteration on the atlas color semantics — get it
  // right from the 2.6.2 native source this time (2026-07-08):
  // - dstIn (iteration 1) rendered white silhouettes (texture is the blend SOURCE).
  // - "premultiplied (a, a, a, a)" (iteration 2) rendered DARK gray ghosts: the
  //   recorder converts each color Float32Array via SkColorSetARGB(a·255, r·255,
  //   g·255, b·255) (cpp/api/recorder/Convertor.h, also used by the shared-value
  //   applyUpdates path) into SkColor, which Skia defines as UNPREMULTIPLIED
  //   (SkColor.h) and premultiplies internally before the drawAtlas blend — so
  //   (a, a, a, a) got premultiplied AGAIN, leaving RGB at a² (dark).
  // - (1, 1, 1, a) premultiplies to (a, a, a, a); modulate (r = s·d, per premul
  //   channel) then scales every texture channel by exactly a: a clean fade.
  // Recomputing the cheap frame math here beats sharing state between the two
  // buffer worklets.
  const colors = useColorBuffer(spriteCount, (val, spriteIndex) => {
    'worklet'
    // Unpremultiplied white; only alpha varies below. Alpha 0 = hidden sprite
    // (the early-return cases).
    val[0] = 1
    val[1] = 1
    val[2] = 1
    val[3] = 0
    const drawPosition = Math.floor(spriteIndex / perSlot)
    const slot = drawOrder[drawPosition]
    const j = spriteIndex - drawPosition * perSlot
    const assignment = assignments[slot]
    // active <= 0 parks alpha at 0 → abort hides everything instantly, as before.
    if (!assignment || bindings.active.value <= 0) {
      return
    }
    // End fade: without it, all cards vanish in a single frame when the 60s run
    // completes and celebrationState is cleared. Driven by the unlagged shared progress
    // so a card and its trail ghosts fade together over the last ~2s.
    const endFade = Math.min(1, Math.max(0, (1 - bindings.progress.value) / 0.033))

    // Cascade Imprint live cards: ONLY the in-flight card(s) render as live sprites
    // — waiting piles are STAMPED into the imprint surface at reveal time (pile-
    // stability story, 2026-07-08) so tracers from later flights paint OVER them,
    // matching the real Windows never-cleared framebuffer. A live waiting sprite
    // would float above every tracer (the Atlas draws after the imprint <Image>).
    // Full alpha × endFade; the launch fade (0.5 + 0.5·eased) stays deliberately
    // skipped — a translucent live card over opaque stamps looked wrong (observed
    // on device 2026-07-08). Windows cards were opaque anyway.
    if (isCascadeImprint) {
      const rawNow = bindings.progress.value * CELEBRATION_SPEED_MULTIPLIER
      const rel = rawNow - getImprintLaunchOrder(assignment) * IMPRINT_LAUNCH_INTERVAL_RAW
      let visible = false
      if (rel >= 0) {
        // Launches wrap modulo the deck (seamless repeat, case 33): in flight until
        // IMPRINT_RETURN_RAW, then back on the pile as a stamp only.
        const cycle = totalCards * IMPRINT_LAUNCH_INTERVAL_RAW
        const tSince = rel - Math.floor(rel / cycle) * cycle
        visible = tSince <= IMPRINT_RETURN_RAW
      }
      val[3] = visible ? endFade : 0
      return
    }

    const ghostK = j < trailCount ? trailCount - 1 - j : -1
    const lagProgress = ghostK >= 0 ? (ghostK + 1) * trailGapProgress : 0
    const opacityMultiplier = ghostK >= 0 ? 0.45 * (1 - ghostK / (trailCount + 1)) : 1
    const laggedProgress = Math.max(0, bindings.progress.value - lagProgress)

    // Anchored launch blend — same derivation as the transform worklet.
    const anchor = Math.max(0, launchAnchor.value)
    const launchEased = easeOutQuint(
      Math.min(
        1,
        Math.max(0, (laggedProgress - anchor) * CELEBRATION_LAUNCH_SPEED_MULTIPLIER)
      )
    )

    // Avalanche foundation-pile rendering (user items 1+2+3): while a sprite's card
    // has not launched at the sprite's (lagged) time, ghosts are hidden outright
    // (they'd stack 4 extra shadows on the waiting card) and the card itself is
    // visible only as its pile's next-to-launch top.
    if (avalancheLaunch) {
      const spriteRaw = laggedProgress * CELEBRATION_SPEED_MULTIPLIER
      if (spriteRaw < avalancheLaunch.launchRaw[slot]) {
        if (ghostK >= 0) {
          return
        }
        const rawNow = bindings.progress.value * CELEBRATION_SPEED_MULTIPLIER
        if (rawNow < avalancheLaunch.prevLaunchRaw[slot]) {
          return
        }
        // Waiting pile top: keep the global launch fade so the start ramps in like
        // every other mode; no per-mode opacity games (case 31 targetOpacity is 1).
        val[3] = Math.min(1, 0.5 + 0.5 * launchEased) * endFade
        return
      }
    }

    const frame = computeCelebrationFrame({
      modeId,
      assignment,
      metrics: { width: cardWidth, height: cardHeight },
      board,
      totalCards,
      progress: laggedProgress,
    })
    if (!frame) {
      return
    }
    const clampedOpacity = frame.targetOpacity < 0 ? 0 : frame.targetOpacity
    // Generic (non-cascade) imprint modes skip the launch fade like mode 33 does —
    // a translucent live card over its own opaque stamps reads wrong — but KEEP the
    // path opacity (Fireworks' ember fades, You-Win's letter-gap dips) and the
    // ghost multipliers (Fireworks has trails).
    val[3] = isGenericImprint
      ? Math.min(1, clampedOpacity) * opacityMultiplier * endFade
      : Math.min(1, clampedOpacity * (0.5 + 0.5 * launchEased)) *
        opacityMultiplier *
        endFade
  })

  return (
    // The wrapper fills the board container (stable thing to measure); the canvas
    // inside is absolutely positioned to cover the whole WINDOW (see the offset
    // comment at the top). collapsable={false} so measureInWindow has a native view.
    // Abort taps are handled by the separate CelebrationTouchBlocker sibling, so
    // everything here stays pointerEvents="none".
    <View
      ref={wrapperRef}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={handleWrapperLayout}
      collapsable={false}
    >
      <Canvas
        style={{
          position: 'absolute',
          top: -offsetY,
          left: -offsetX,
          width: window.width,
          height: window.height,
        }}
        pointerEvents="none"
      >
        {/* Imprint surface renders BEFORE the Atlas → under the live cards, and is
            only mounted for imprint modes (metadata.imprint) so every other mode
            keeps zero extra mappers. */}
        {usesImprintSurface ? (
          <CascadeImprintLayer
            modeId={state.modeId}
            isCascade={isCascadeImprint}
            stampAlpha={imprintConfig?.alpha ?? 1}
            launchStamps={imprintConfig?.launchStamps === true}
            bindings={bindings}
            texture={texture}
            assignments={assignments}
            board={board}
            totalCards={totalCards}
            launchAnchor={launchAnchor}
            cardWidth={cardWidth}
            cardHeight={cardHeight}
            cellWidth={cellWidth}
            cellHeight={cellHeight}
            shadowMargin={shadowMargin}
            faceRadiusPx={metrics.radius * pd}
            pd={pd}
            offsetX={offsetX}
            offsetY={offsetY}
            windowWidth={window.width}
            windowHeight={window.height}
          />
        ) : null}
        <Atlas
          image={texture}
          sprites={sprites}
          transforms={transforms}
          colors={colors}
          colorBlendMode="modulate"
        />
      </Canvas>
    </View>
  )
}

type CascadeImprintLayerProps = {
  modeId: number
  // metadata.imprint.policy === 'cascade' (mode 33): pile reveals + early blended
  // stamps preserved; every other policy runs the generic schedule loop.
  isCascade: boolean
  // metadata.imprint.alpha — stamp paint alpha (Fireworks' faint burst marks).
  stampAlpha: number
  // metadata.imprint.launchStamps — ink launch-blend stamps too (Spirograph's
  // messy pile→orbit transit streaks; see the metadata comment).
  launchStamps: boolean
  bindings: CelebrationBindings
  texture: SharedValue<SkImage | null>
  assignments: CelebrationAssignment[]
  board: { width: number; height: number; floorY: number }
  totalCards: number
  launchAnchor: SharedValue<number>
  cardWidth: number
  cardHeight: number
  cellWidth: number
  cellHeight: number
  shadowMargin: number
  // Card corner radius in surface px — the stamp clip path (see stamp crop comment).
  faceRadiusPx: number
  pd: number
  offsetX: number
  offsetY: number
  windowWidth: number
  windowHeight: number
}

// Imprint surface (approach B, see the comment on AVALANCHE_MODE_ID), shared by all
// imprint modes: a persistent offscreen surface accumulates every stamp exactly
// once; the snapshot is displayed as ONE <Image> under the live Atlas. Stamp kinds:
// SCHEDULED imprints (a card's frame frozen at a deterministic stamp time — the
// getImprintStampCount/Raw schedules in celebrationModes.ts, e.g. mode 33's flight
// windows, path lattices for 36/38/43/46, wall-impact/rest/burst events for
// 37/45/39) and, cascade policy only, PILE REVEALS (the waiting pile top painted at
// base when its predecessor launches — pile-stability story 2026-07-08, so tracers
// paint over the piles like the real Windows framebuffer). All are deterministic,
// so drawing each once is enough.
//
// Stamp crop (alignment/wild-imprint story, user 2026-07-08 "shadows get really
// strong after many cards"): stamps draw only the FACE of the atlas cell — src
// cropped to the face rect AND dst clipped to the face's rounded-rect path. The
// baked cell shadow otherwise compounds across hundreds of overlapping stamps into
// dark halos (and bleeds into the corner notches INSIDE the face bounding box, which
// is why the rrect clip is needed on top of the rect crop). Authentic too: the real
// Windows imprints had no shadows. The LIVE Atlas card keeps its shadowed sprite.
// Mode 36 stamps rotate/scale via canvas transforms (case 36 rolls its cards);
// mode 33 passes rotation 0 / scale 1 through the same path.
const CascadeImprintLayer = ({
  modeId,
  isCascade,
  stampAlpha,
  launchStamps,
  bindings,
  texture,
  assignments,
  board,
  totalCards,
  launchAnchor,
  cardWidth,
  cardHeight,
  cellWidth,
  cellHeight,
  shadowMargin,
  faceRadiusPx,
  pd,
  offsetX,
  offsetY,
  windowWidth,
  windowHeight,
}: CascadeImprintLayerProps) => {
  const imprintImage = useSharedValue<SkImage | null>(null)
  // Independent event streams per card (Pinball stamps x-wall and y-wall impacts
  // on two separate monotonic counters; every other mode has one stream).
  const streamCount = getImprintStreamCount(modeId)

  // Launch-order → slot lookup for the pile-reveal schedule (pile-stability story):
  // reveal events must be drawn CHRONOLOGICALLY (all cards of a pile share one cell,
  // so the last-drawn reveal is the visible pile top — replaying in shuffled slot
  // order after a surface clear would leave a wrong face on the pile).
  const slotByLaunchOrder = useMemo(() => {
    const lookup = assignments.map(() => 0)
    assignments.forEach((assignment, slot) => {
      lookup[getImprintLaunchOrder(assignment)] = slot
    })
    return lookup
  }, [assignments])

  // Mapper-persistent UI-runtime state: a plain object captured by the reaction
  // worklet is copied to the UI runtime once at registration and mutated in place
  // there afterwards (same mechanism the write-once flags of the previous imprint
  // iteration relied on, verified in react-native-worklets serialization). Whenever
  // the reaction re-registers (mount, badge cycle, window-offset resolution), the UI
  // runtime gets a FRESH copy — stamped counts reset to 0 and surface to null, so the
  // layer self-heals by re-stamping everything onto a new surface. The abandoned
  // surface/snapshot are reclaimed by GC (rare events; watch device memory).
  const stampState = useMemo(
    () => ({
      surface: null as SkSurface | null,
      paint: null as SkPaint | null,
      // One write-once counter per (slot, stream) — flat slot·streamCount layout.
      // modeId is a dep because streamCount depends on it (badge cycle 36→37 must
      // re-size the array, not just reset the UI copy).
      stamped: new Array<number>(assignments.length * streamCount).fill(0),
      // Global pile-reveal counter (cumulative across passes, chronological order —
      // see slotByLaunchOrder).
      revealedCount: 0,
      lastProgress: -1,
      lastTexture: null as SkImage | null,
      // Snapshot throttle (2026-07-09, mode-46 perf headroom): see the snapshot
      // comment at the bottom of the reaction.
      tick: 0,
      snapshotDirty: false,
    }),
    [assignments, streamCount]
  )

  useAnimatedReaction(
    () => {
      'worklet'
      return {
        progress: bindings.progress.value,
        active: bindings.active.value,
        atlas: texture.value,
      }
    },
    (current) => {
      'worklet'
      const { progress, active, atlas } = current
      // While aborted/idle the <Image> is hidden via imprintOpacity; nothing to draw.
      if (!atlas || active <= 0) {
        return
      }
      if (!stampState.surface) {
        // Full-window surface at device pixels so stamps are as crisp as the Atlas
        // sprites. MakeOffscreen can fail (no GPU context) — then mode 33 just shows
        // the live cards without imprints instead of crashing.
        stampState.surface = Skia.Surface.MakeOffscreen(
          Math.ceil(windowWidth * pd),
          Math.ceil(windowHeight * pd)
        )
        if (!stampState.surface) {
          return
        }
        stampState.paint = Skia.Paint()
        // Per-mode stamp alpha (metadata.imprint.alpha): Fireworks' burst marks
        // are deliberately FAINT (0.3) — full-alpha would be indistinguishable ink.
        stampState.paint.setAlphaf(stampAlpha)
      }
      const surface = stampState.surface
      const canvas = surface.getCanvas()
      let changed = false
      // Dev-hold loop restart (progress wraps to 0) and atlas texture rebuilds (the
      // fonts arrive async ~1 frame in — early stamps may have been drawn from a
      // glyphless texture) both clear and re-stamp from scratch: counts reset to 0,
      // the loop below catches up in one pass.
      if (progress < stampState.lastProgress || atlas !== stampState.lastTexture) {
        canvas.clear(Skia.Color('transparent'))
        stampState.stamped.fill(0)
        stampState.revealedCount = 0
        changed = true
      }
      stampState.lastProgress = progress
      stampState.lastTexture = atlas

      const rawProgress = progress * CELEBRATION_SPEED_MULTIPLIER
      const anchor = Math.max(0, launchAnchor.value)
      const paint = stampState.paint!
      const faceWidth = cellWidth - 2 * shadowMargin
      const faceHeight = cellHeight - 2 * shadowMargin

      // Face-cropped, rounded-rect-clipped stamp (see the stamp crop comment on the
      // component). Centered dst so rotation/scale pivot on the card center, exactly
      // like the live sprite's RSXform anchor math; mode 33 passes 0/1 and draws
      // axis-aligned through the same path.
      const stampFace = (
        slot: number,
        translateX: number,
        translateY: number,
        rotationDeg: number,
        scale: number
      ) => {
        const src = Skia.XYWHRect(
          (slot % ATLAS_COLUMNS) * (cellWidth + ATLAS_GUTTER) + shadowMargin,
          Math.floor(slot / ATLAS_COLUMNS) * (cellHeight + ATLAS_GUTTER) +
            shadowMargin,
          faceWidth,
          faceHeight
        )
        const dst = Skia.XYWHRect(
          -faceWidth / 2,
          -faceHeight / 2,
          faceWidth,
          faceHeight
        )
        canvas.save()
        canvas.translate(
          (offsetX + translateX + cardWidth / 2) * pd,
          (offsetY + translateY + cardHeight / 2) * pd
        )
        if (rotationDeg !== 0) {
          canvas.rotate(rotationDeg, 0, 0)
        }
        if (scale !== 1) {
          canvas.scale(scale, scale)
        }
        // The rect crop alone leaves baked shadow in the corner notches (inside the
        // face bounding box, outside the rounded arc) — the antialiased rrect clip
        // removes it; repeated re-stamps would otherwise accumulate dark corner dots.
        canvas.clipRRect(
          Skia.RRectXY(dst, faceRadiusPx, faceRadiusPx),
          ClipOp.Intersect,
          true
        )
        canvas.drawImageRect(atlas, src, dst, paint)
        canvas.restore()
        changed = true
      }

      // Pile reveals (pile-stability story, 2026-07-08; cascade policy only — the
      // other imprint modes have no waiting piles): paint each reveal at its pile
      // position INTO the surface — the Windows painter's algorithm (the stamp
      // covers tracers crossing the cell; later flights paint over it again).
      // Reveal m (m = launchOrder + pass·deck, chronological) is due GAP before that
      // card's pass launch = exactly the launch frame of its pile predecessor
      // (Kings' pass-0 reveals are due at run start; the pass-wrap King re-stamps
      // exactly when the pile's Ace launches — the seamless-repeat handoff). Reveal
      // times are uniform in m: due(m) = (m − GAP/interval)·interval, so the due
      // count is closed-form. Drawn BEFORE this tick's flight imprints (a reveal
      // chronologically precedes samples frozen after it).
      if (isCascade) {
        const revealTarget =
          Math.floor(
            rawProgress / IMPRINT_LAUNCH_INTERVAL_RAW +
              IMPRINT_PILE_GAP_RAW / IMPRINT_LAUNCH_INTERVAL_RAW
          ) + 1
        for (let m = stampState.revealedCount; m < revealTarget; m += 1) {
          const slot = slotByLaunchOrder[m % totalCards]
          const assignment = assignments[slot]
          if (!assignment) {
            continue
          }
          // Waiting cards sit EXACTLY at base (flat piles since the pile-stability
          // story), so the reveal stamp is an axis-aligned draw at base.
          stampFace(slot, assignment.baseX, assignment.baseY, 0, 1)
        }
        stampState.revealedCount = revealTarget
      }

      // Generic write-once stamp loop (ten-crazy-modes story): the schedules in
      // celebrationModes.ts answer "how many stamps are due" (monotonic count) and
      // "at which raw time does stamp n fire" per (card, stream) — this loop just
      // replays them (typically 0–2 NEW stamps per tick per card) and draws the
      // mode frame frozen at each stamp time. Cumulative counts survive the
      // seamless-repeat passes (33) and periodic events (37/39/45) for free.
      for (let slot = 0; slot < assignments.length; slot += 1) {
        const assignment = assignments[slot]
        for (let stream = 0; stream < streamCount; stream += 1) {
          const target = getImprintStampCount(
            modeId,
            assignment,
            rawProgress,
            totalCards,
            stream
          )
          const key = slot * streamCount + stream
          let next = stampState.stamped[key]
          if (target <= next) {
            continue
          }
          for (; next < target; next += 1) {
            const frozenProgress =
              getImprintStampRaw(modeId, assignment, next, totalCards, stream) /
              CELEBRATION_SPEED_MULTIPLIER
            // Same ANCHORED launch blend as the live Atlas sprite
            // (frame.launchEased is ignored there too — see the launchAnchor
            // comment); no wobble (imprint modes opt out). Stamps must reproduce
            // exactly what the live card showed — including rotation/scale,
            // blended like the transform worklet.
            const launchBlendArg =
              (frozenProgress - anchor) * CELEBRATION_LAUNCH_SPEED_MULTIPLIER
            // Non-cascade modes SKIP (but count) stamps until the launch blend
            // has saturated: a blended stamp would ink a base→path lerp position
            // (fatal for You-Win's message, stray ink for the others). Cascade 33
            // keeps its blended early-fall stamps — that dense band at the pile is
            // part of its authentic look (verified on device, pile-stability
            // story). launchStamps (Spirograph 36) opts back IN: the blended
            // pile→orbit transit streaks are the messy start the user asked to
            // restore (full-review culling story, 2026-07-09).
            if (!isCascade && !launchStamps && launchBlendArg < 1) {
              continue
            }
            // Launch-transit SUB-STAMPING for launchStamps modes (tuning round 2,
            // 2026-07-12 — user: 36's "imprint starts a bit late and not just when
            // the cards leave a foundation"): the stamp lattice is uniform in TIME
            // but the launch blend is easeOutQuint(arg·40), whose initial slope is
            // 5 — one lattice interval advances the blend arg by ~0.0385, so the
            // FIRST inked point after the anchor already sat ~18% (worst ~33%) of
            // the way from base to path, leaving a visible un-inked gap at the
            // foundation. While a stamp's interval overlaps the active blend,
            // subdivide it into 4 sub-draws at intermediate frozen times (max
            // eased step ~5%, under half a card width) so the streak traces from
            // the very first movement off the pile. Deterministic from the stamp
            // index → write-once semantics intact; cost is bounded (~4× stamps
            // for the ~1.5 s blend window, mode 36 only).
            let subCount = 1
            let prevProgress = frozenProgress
            if (launchStamps && launchBlendArg > 0) {
              prevProgress =
                next > 0
                  ? getImprintStampRaw(
                      modeId,
                      assignment,
                      next - 1,
                      totalCards,
                      stream
                    ) / CELEBRATION_SPEED_MULTIPLIER
                  : 0
              if (
                (prevProgress - anchor) * CELEBRATION_LAUNCH_SPEED_MULTIPLIER <
                1
              ) {
                subCount = 4
              } else {
                prevProgress = frozenProgress
              }
            }
            for (let sub = subCount - 1; sub >= 0; sub -= 1) {
              const subProgress =
                frozenProgress - ((frozenProgress - prevProgress) * sub) / subCount
              const subBlendArg =
                (subProgress - anchor) * CELEBRATION_LAUNCH_SPEED_MULTIPLIER
              // Pre-anchor sub-times all coincide at base — one stamp (the main
              // one, sub 0) is enough.
              if (sub > 0 && subBlendArg <= 0) {
                continue
              }
              const frame = computeCelebrationFrame({
                modeId,
                assignment,
                metrics: { width: cardWidth, height: cardHeight },
                board,
                totalCards,
                progress: subProgress,
              })
              if (!frame) {
                continue
              }
              // Pen-up skip (You Win): path samples with a dipped opacity are
              // counted but not inked — letter gaps stay clean (0.98 keeps stray
              // tails at gap entries under ~3 dp). Never trips for modes whose
              // targetOpacity is constant 1 (33/36/37/38/45/46).
              if (frame.targetOpacity < 0.98) {
                continue
              }
              const launchEased = easeOutQuint(
                Math.min(1, Math.max(0, subBlendArg))
              )
              const translateX =
                assignment.baseX * (1 - launchEased) + frame.pathX * launchEased
              const translateY =
                assignment.baseY * (1 - launchEased) + frame.pathY * launchEased
              stampFace(
                slot,
                translateX,
                translateY,
                frame.rotation * launchEased,
                1 + (frame.targetScale - 1) * launchEased
              )
            }
          }
          stampState.stamped[key] = next
        }
      }
      if (changed) {
        surface.flush()
        stampState.snapshotDirty = true
      }
      // Snapshot every 2nd tick (2026-07-09, the "snapshot every Nth stamp frame"
      // follow-up from the Spirograph story): makeImageSnapshot is copy-on-write, so
      // every-frame stampers (36/38/43/46) paid one full-surface blit per frame —
      // measured as the elevated 90th-pct frame time (36: 13→20 ms; 46 ~107 fps).
      // Halving the snapshot rate trades ≤1 tick (~8 ms) of lag on the NEWEST stamps
      // — invisible, the live card covers its own fresh ink. Bursty modes are
      // unaffected (dirty flag: a pending snapshot fires on the next tick at most).
      stampState.tick += 1
      if (stampState.snapshotDirty && stampState.tick % 2 === 0) {
        imprintImage.value = surface.makeImageSnapshot()
        stampState.snapshotDirty = false
      }
    }
  )

  // End fade in sync with the live cards' colors buffer; active <= 0 hides the field
  // instantly on abort (the surface itself is only cleared on the next run/restart).
  const imprintOpacity = useDerivedValue(() => {
    'worklet'
    if (bindings.active.value <= 0) {
      return 0
    }
    return Math.min(1, Math.max(0, (1 - bindings.progress.value) / 0.033))
  })

  return (
    <Image
      image={imprintImage}
      x={0}
      y={0}
      width={windowWidth}
      height={windowHeight}
      fit="fill"
      opacity={imprintOpacity}
    />
  )
}
