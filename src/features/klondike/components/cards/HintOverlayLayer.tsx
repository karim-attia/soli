import React, { useEffect, useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import type { Card } from '../../../../solitaire/klondike'
import {
  parseSolverCardCode,
  type SolverHint,
  type SolverMoveHint,
} from '../../../../solitaire/solverBridge'
import { useAnimationToggles } from '../../../../state/settings'
import type { CardMetrics } from '../../types'
import { COLOR_HINT } from '../../constants'
import { CardVisual } from './CardVisual'
// Rect resolution stays in ./utils (pure geometry, jest-importable) — this
// module now imports CardVisual (tamagui-heavy chain) for the ghost glide, so
// unit tests must never import it. See utils.ts.
import {
  resolveHintRects,
  resolveStockRect,
  type AbsoluteCardLayerLayouts,
  type HintRect,
} from './utils'

// Solver-hint visuals, redesigned in feedback round 2 (F8, 2026-07-23). The
// round-1 design used ONE green ring for source and target, which failed two
// ways (user feedback): the drop-border green blended into the felt, and
// identical rings left the move's DIRECTION ambiguous — a card→foundation
// hint read as "move something down from the foundation". Now the roles are
// visually asymmetric in one amber family:
//   - SOURCE (the card/run to move, or the stock to tap): loud — thick amber
//     ring, glow, dark contrast contours, gentle pulse.
//   - TARGET (where it goes): quiet — thinner, translucent, static ring.
//   - GHOST: a translucent copy of the hinted card's face glides source→target
//     once when the hint appears (and again on repeat presses) — the actual
//     direction disambiguator, reusing CardVisual instead of new iconography.
// Deliberately decoupled from game selection state — see useHint.

// Z-order (F13, 2026-07-24 — "hint visuals render behind cards" fix). All
// cards live in ONE native stacking plane: Fabric flattens AbsoluteCardLayer's
// pointerEvents="box-none" absoluteFill wrapper (box-none forms no stacking
// context, see RN ViewShadowNode.cpp), hoisting every card view into the
// board shell's child list, which the renderer then stable-sorts by zIndex
// (ShadowNode orderIndex — shared C++ core, so Android and iOS order
// identically; Android elevation is NOT involved, no card sets one). Sibling
// JSX order therefore does NOT put this overlay above the cards: card
// zIndexes (100–~1700 at rest, 10000 + item.zIndex mid-flight — see
// AbsoluteLayerCard's settle boost) beat an un-zIndexed overlay root, which
// is exactly how the ghost flew UNDER foundation piles and ring bands
// vanished under waste-fan/column neighbors. This constant rides the SAME
// orderIndex mechanism the real card flights use for their above-everything
// treatment, one band higher, so rings and ghost paint over every card in
// every scenario (waste-fan neighbors, stacked columns, foundation piles,
// cards mid-flight). Keep any future value above the flight band's ceiling
// (10000 + max item zIndex) and below nothing board-local — bubbles/dock live
// outside the board shell's stacking context and stay above by tree order.
//
// UPDATE (card-drag-and-drop, 2026-09-09): the card plane described above is no
// longer flattened. AbsoluteCardLayer's box-none root is now wrapped in a
// GestureDetector for the drag pan, and GestureDetector clones its child with
// collapsable={false}. Cards therefore sort INSIDE that plane instead of inside
// the board shell. The outcome here is unchanged: the plane itself carries no
// explicit zIndex, so it sorts as 0 among the board shell's children where it is
// a LATER sibling than TopRow/TableauSection (RN's zIndex sort is stable, so
// equal values keep document order) — cards still paint over the structural
// slots, and this constant still beats the whole plane. DragOverlayLayer's
// DRAG_OVERLAY_Z_INDEX (15000) sits between the flight band and this one.
const HINT_OVERLAY_Z_INDEX = 20000

const overlayStyle: StyleProp<ViewStyle> = [
  StyleSheet.absoluteFill,
  { zIndex: HINT_OVERLAY_Z_INDEX },
]

const RING_OUTSET = 3
// 4 px after the on-device contrast pass (2026-07-23): 3 px read modest at
// phone density; the source ring must be the unmistakably loud element.
const SOURCE_RING_BORDER_WIDTH = 4
const TARGET_RING_BORDER_WIDTH = 2
// Same amber family as COLOR_HINT, translucent: the target must read as
// subordinate ("goes THERE, quietly") next to the loud source ring.
const TARGET_RING_COLOR = 'rgba(255, 176, 32, 0.62)'
// 1px near-black contours hugging the amber band on BOTH sides (outer spread +
// inset), plus an amber glow. The dark edges are the cheap fix for blend-in:
// they separate the ring from white card faces and from bright felt areas.
// boxShadow (incl. inset + multi-shadow) is native on RN 0.76+/New Arch.
const SOURCE_RING_SHADOW =
  '0 0 0 1px rgba(26, 19, 3, 0.55), 0 0 10px 2px rgba(255, 176, 32, 0.55), inset 0 0 0 1px rgba(26, 19, 3, 0.4)'
const TARGET_RING_SHADOW = '0 0 0 1px rgba(26, 19, 3, 0.3)'

// Source-ring pulse: 2 full cycles per 2.5 s highlight window
// (HINT_HIGHLIGHT_MS in useHint). Runs as an infinite loop and dies with the
// ring, so a repeat hint press that extends the window keeps pulsing.
const PULSE_HALF_MS = 625
// Dim floor stays ABOVE the target ring's constant opacity: a screenshot (or a
// glance) at the pulse's low point must still show source > target, or the
// role hierarchy inverts for that instant (seen in the first device pass).
const PULSE_MIN_OPACITY = 0.72
const PULSE_MAX_SCALE = 1.03

// Ghost glide: one-shot direction cue. Fades in over the source card (it
// starts pixel-aligned on the identical real card, so the entry is masked —
// it reads as the card "lifting off"), glides with a soft ease, fades out on
// arrival at the target.
const GHOST_GLIDE_MS = 520
const GHOST_FADE_IN_MS = 90
const GHOST_FADE_OUT_MS = 180
const GHOST_MAX_OPACITY = 0.7
const GHOST_OUTLINE_WIDTH = 2

export type HintRingProps = HintRect & {
  radius: number
  testID: string
  // 'source' = loud treatment (thick ring + glow + pulse) for the thing the
  // user should act on; 'target' = quiet static ring. The stock draw ring
  // uses the source default on purpose: for a draw hint the stock IS the tap
  // target, so it gets the act-on-this language.
  role?: 'source' | 'target'
}

// Shared ring visual for every hint kind. Receives the CARD rect (or run
// rect) and applies the outset itself: the board renders the absolute card
// layer above structural slots, so an inset border would be covered — the
// ring must sit outside the card bounds.
export const HintRing = ({
  x,
  y,
  width,
  height,
  radius,
  testID,
  role = 'source',
}: HintRingProps) => {
  // Pulse gates on the MASTER animations toggle only: it is a stationary
  // emphasis effect (not a card flight), and inventing a dedicated sub-toggle
  // for hints would be scope creep. Master off → static ring, still amber and
  // role-distinct.
  const { master: animationsEnabled } = useAnimationToggles()
  const pulsing = role === 'source' && animationsEnabled
  const phase = useSharedValue(0)

  useEffect(() => {
    if (!pulsing) {
      cancelAnimation(phase)
      phase.value = 0
      return
    }
    phase.value = 0
    phase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: PULSE_HALF_MS, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: PULSE_HALF_MS, easing: Easing.inOut(Easing.quad) })
      ),
      -1
    )
    return () => cancelAnimation(phase)
  }, [phase, pulsing])

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 1 - phase.value * (1 - PULSE_MIN_OPACITY),
    transform: [{ scale: 1 + phase.value * (PULSE_MAX_SCALE - 1) }],
  }))

  const isSource = role === 'source'
  return (
    <Animated.View
      pointerEvents="none"
      testID={testID}
      style={[
        {
          position: 'absolute',
          left: x - RING_OUTSET,
          top: y - RING_OUTSET,
          width: width + RING_OUTSET * 2,
          height: height + RING_OUTSET * 2,
          borderRadius: radius + RING_OUTSET,
          borderWidth: isSource ? SOURCE_RING_BORDER_WIDTH : TARGET_RING_BORDER_WIDTH,
          borderColor: isSource ? COLOR_HINT : TARGET_RING_COLOR,
          boxShadow: isSource ? SOURCE_RING_SHADOW : TARGET_RING_SHADOW,
        },
        pulseStyle,
      ]}
    />
  )
}

type HintGhostProps = {
  hint: SolverMoveHint
  source: HintRect
  target: HintRect
  metrics: CardMetrics
}

// One-shot ghost card gliding source→target. Always card-sized: for run moves
// the source rect spans the whole run, but its top-left IS the hinted card
// (the run base), so the ghost lifts off exactly from the moved card's face.
const HintGhost = ({ hint, source, target, metrics }: HintGhostProps) => {
  const translateX = useSharedValue(source.x)
  const translateY = useSharedValue(source.y)
  const opacity = useSharedValue(0)

  useEffect(() => {
    translateX.value = source.x
    translateY.value = source.y
    opacity.value = 0
    const glide = {
      duration: GHOST_GLIDE_MS,
      easing: Easing.inOut(Easing.cubic),
    }
    translateX.value = withTiming(target.x, glide)
    translateY.value = withTiming(target.y, glide)
    opacity.value = withSequence(
      withTiming(GHOST_MAX_OPACITY, { duration: GHOST_FADE_IN_MS }),
      withDelay(
        GHOST_GLIDE_MS - GHOST_FADE_IN_MS,
        withTiming(0, { duration: GHOST_FADE_OUT_MS })
      )
    )
    return () => {
      cancelAnimation(translateX)
      cancelAnimation(translateY)
      cancelAnimation(opacity)
    }
    // `hint` in deps on purpose: a repeated Hint press solves afresh and
    // delivers a NEW hint object for the same position — the glide replays as
    // the visible press feedback (the rings alone would just sit there).
  }, [
    hint,
    opacity,
    source.x,
    source.y,
    target.x,
    target.y,
    translateX,
    translateY,
  ])

  const ghostStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
  }))

  const card: Pick<Card, 'suit' | 'rank'> = parseSolverCardCode(hint.card)
  return (
    <Animated.View
      pointerEvents="none"
      testID="hint-ghost"
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          width: metrics.width,
          height: metrics.height,
        },
        ghostStyle,
      ]}
    >
      <CardVisual card={card} metrics={metrics} />
      {/* Amber outline ties the ghost to the hint language, so a second copy
          of a card on the board reads as a projection, not a glitch. */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: metrics.radius,
            borderWidth: GHOST_OUTLINE_WIDTH,
            borderColor: COLOR_HINT,
          },
        ]}
      />
    </Animated.View>
  )
}

export type HintOverlayLayerProps = {
  // Both hint kinds since F13: 'move' renders source/target rings + ghost,
  // 'draw' renders the stock ring (previously in TopRow, where the structural
  // row's position under the card plane clipped it).
  hint: SolverHint
  wasteCount: number
  tableau: ReadonlyArray<ReadonlyArray<Pick<Card, 'suit' | 'rank' | 'faceUp'>>>
  layouts: AbsoluteCardLayerLayouts
  cardMetrics: CardMetrics
}

// Every hint visual lives in this one overlay so all of it shares the
// above-cards plane (HINT_OVERLAY_Z_INDEX — see that comment for why sibling
// order alone is NOT enough). Mounted by KlondikeGameView only while a hint
// is active (normal play never renders it), separate from AbsoluteCardLayer
// so hint state cannot disturb the card layer's memo boundaries.
// pointerEvents="none" throughout — hint visuals must never intercept board
// touches.
export const HintOverlayLayer = React.memo(
  ({ hint, wasteCount, tableau, layouts, cardMetrics }: HintOverlayLayerProps) => {
    // Ghost gates on the cardFlights sub-toggle (master-gated): it mimics a
    // card flight, and a player who turned "Card flights" off asked for no
    // cards flying across the board. Rings still show role-distinct.
    const { cardFlights: ghostEnabled } = useAnimationToggles()
    const rects = useMemo(
      () =>
        hint.kind === 'move'
          ? resolveHintRects(hint, { wasteCount, tableau }, layouts, cardMetrics)
          : null,
      [cardMetrics, hint, layouts, tableau, wasteCount]
    )

    if (hint.kind === 'draw') {
      const stockRect = resolveStockRect(layouts, cardMetrics)
      if (!stockRect) {
        return null
      }
      return (
        <View pointerEvents="none" style={overlayStyle}>
          {/* Same testID as the old TopRow ring so device recipes keep working. */}
          <HintRing
            {...stockRect}
            radius={cardMetrics.radius}
            testID="hint-stock-ring"
            role="source"
          />
        </View>
      )
    }

    if (!rects) {
      return null
    }
    return (
      <View pointerEvents="none" style={overlayStyle}>
        <HintRing
          {...rects.source}
          radius={cardMetrics.radius}
          testID="hint-source-ring"
          role="source"
        />
        <HintRing
          {...rects.target}
          radius={cardMetrics.radius}
          testID="hint-target-ring"
          role="target"
        />
        {/* Ghost renders last = above both rings. */}
        {ghostEnabled ? (
          <HintGhost
            hint={hint}
            source={rects.source}
            target={rects.target}
            metrics={cardMetrics}
          />
        ) : null}
      </View>
    )
  }
)

HintOverlayLayer.displayName = 'HintOverlayLayer'
