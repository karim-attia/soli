import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Gesture } from 'react-native-gesture-handler'
import type { GestureType } from 'react-native-gesture-handler'
import { runOnJS, useSharedValue, withTiming } from 'react-native-reanimated'
import type { SharedValue } from 'react-native-reanimated'

import {
  getDropHints,
  previewSelectionStack,
  type Card,
  type GameAction,
  type GameState,
  type Selection,
  type Suit,
} from '../../../solitaire/klondike'
import { devLog } from '../../../utils/devLogger'
import {
  DRAG_ACTIVATION_DISTANCE_PX,
  DRAG_LIFT_DURATION_MS,
  DRAG_SNAP_BACK_DURATION_MS,
} from '../constants'
import type { CardMetrics, DropHints } from '../types'
import type { DragOverlayLayerProps } from '../components/cards/DragOverlayLayer'
import {
  buildDragSourceModel,
  buildDropCandidates,
  computeLiftedRunOffsets,
  createCardTransformRegistry,
  hitTestDragSource,
  resolveDropCandidate,
  type CardTransformRegistry,
  type DragSourceHit,
  type DragSourceModel,
  type DropResolution,
} from '../components/cards/dragGeometry'
import type { AbsoluteCardLayerLayouts, HintRect } from '../components/cards/utils'

// Card drag-and-drop (docs/product/card-drag-and-drop/card-drag-and-drop.md).
//
// *** A drop is exactly the existing tap move. ***
// It dispatches the same APPLY_MOVE with the same Selection and MoveTarget a tap
// would have produced, so the reducer, the legality rules and the emitted
// { k:'move', sel, tgt } log entry are byte-identical. Drag is a new INPUT to an
// unchanged action — which is why MOVE_LOG_VERSION (klondike.ts) stays 1 and a
// persisted game replays identically whether it was played by tapping or dragging.
// Anything that changes WHICH move a drop produces is still a reducer-behaviour
// change and would need that version bump.

type UseCardDragOptions = {
  state: GameState
  stateRef: MutableRefObject<GameState>
  cardMetrics: CardMetrics
  layouts: AbsoluteCardLayerLayouts
  // One gate for "dragging is impossible right now": board locked, celebration,
  // auto-complete/auto-queue. A disabled drag builds a null source model, which
  // makes onTouchesDown state.fail() — leaving the RN touch, and therefore
  // tap-to-move, completely undisturbed.
  enabled: boolean
  animationsEnabled: boolean
  animationResetKey: number
  // Owned by useKlondikeGame so useUndoScrubber can read it too (the two gestures
  // guard each other reciprocally; they live in disjoint subtrees, so a shared
  // value is simpler than RNGH cross-detector relations).
  dragActiveShared: SharedValue<number>
  scrubActiveShared: SharedValue<number>
  dispatchGameAction: (action: GameAction) => void
  notifyInvalidMove: (options?: { selection?: Selection | null }) => void
  onTableauCardPress: (columnIndex: number, cardIndex: number) => void
  onWasteTap: () => void
  onFoundationPress: (suit: Suit) => void
}

type DragSession = {
  selection: Selection
  cards: Card[]
  offsets: number[]
  originRect: HintRect
  // Where inside the grabbed card the finger went down, so the release point can be
  // reconstructed from the translation for the sloppy-tap fallback.
  touchOffset: { x: number; y: number }
  hiddenCardIds: ReadonlySet<string>
  dropHints: DropHints
}

export type UseCardDragResult = {
  dragGesture: GestureType
  hiddenCardIds: ReadonlySet<string> | null
  // Fed into TopRow/TableauSection in place of the selection-based mask while a
  // drag runs, which lights up the EXISTING COLOR_DROP_BORDER paths — zero new UI.
  dragDropHints: DropHints | null
  cardTransforms: CardTransformRegistry
  dragOverlayProps: DragOverlayLayerProps | null
}

const selectionFromHit = (hit: DragSourceHit): Selection => {
  if (hit.source === 'tableau') {
    return { source: 'tableau', columnIndex: hit.columnIndex, cardIndex: hit.cardIndex }
  }
  if (hit.source === 'waste') {
    return { source: 'waste' }
  }
  return { source: 'foundation', suit: hit.suit }
}

const isPointInRect = (rect: HintRect, x: number, y: number): boolean =>
  x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height

export const useCardDrag = ({
  state,
  stateRef,
  cardMetrics,
  layouts,
  enabled,
  animationsEnabled,
  animationResetKey,
  dragActiveShared,
  scrubActiveShared,
  dispatchGameAction,
  notifyInvalidMove,
  onTableauCardPress,
  onWasteTap,
  onFoundationPress,
}: UseCardDragOptions): UseCardDragResult => {
  const [dragSession, setDragSession] = useState<DragSession | null>(null)
  const dragSessionRef = useRef<DragSession | null>(null)
  dragSessionRef.current = dragSession
  // Written synchronously by begin/clear as well, not only on the next render:
  // endDrag runs from a runOnJS hop and a very fast flick can land before React
  // has committed beginDrag's setState.
  const commitSession = useCallback((session: DragSession | null) => {
    dragSessionRef.current = session
    setDragSession(session)
  }, [])

  // Ref-backed inputs so beginDrag/endDrag (and therefore the memoized gesture)
  // never change identity — a new Gesture object re-attaches the native recognizer
  // (R5 in the design; same pattern as useUndoScrubber).
  const cardMetricsRef = useRef(cardMetrics)
  cardMetricsRef.current = cardMetrics
  const layoutsRef = useRef(layouts)
  layoutsRef.current = layouts
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled
  const dispatchGameActionRef = useRef(dispatchGameAction)
  dispatchGameActionRef.current = dispatchGameAction
  const notifyInvalidMoveRef = useRef(notifyInvalidMove)
  notifyInvalidMoveRef.current = notifyInvalidMove
  const tapHandlersRef = useRef({ onTableauCardPress, onWasteTap, onFoundationPress })
  tapHandlersRef.current = { onTableauCardPress, onWasteTap, onFoundationPress }

  // Identity-stable for the lifetime of the hook, which is exactly why
  // areAbsoluteLayerCardPropsEqual can (correctly) ignore this prop.
  const cardTransformsRef = useRef<CardTransformRegistry | null>(null)
  if (!cardTransformsRef.current) {
    cardTransformsRef.current = createCardTransformRegistry()
  }
  const cardTransforms = cardTransformsRef.current

  const sourceModelShared = useSharedValue<DragSourceModel | null>(null)
  const pendingHitShared = useSharedValue<DragSourceHit | null>(null)
  const touchStartShared = useSharedValue({ x: 0, y: 0 })
  const dragX = useSharedValue(0)
  const dragY = useSharedValue(0)
  const lift = useSharedValue(0)
  const animationsEnabledShared = useSharedValue(animationsEnabled ? 1 : 0)

  useEffect(() => {
    animationsEnabledShared.value = animationsEnabled ? 1 : 0
  }, [animationsEnabled, animationsEnabledShared])

  // The model is rebuilt once per board change, never per frame. It is null during
  // auto-complete (the only high-frequency path), so the 25 ms auto cadence costs
  // nothing here.
  useEffect(() => {
    sourceModelShared.value = buildDragSourceModel({
      tableau: state.tableau,
      waste: state.waste,
      foundations: state.foundations,
      layouts,
      cardMetrics,
      enabled,
    })
  }, [
    cardMetrics,
    enabled,
    layouts,
    sourceModelShared,
    state.foundations,
    state.tableau,
    state.waste,
  ])

  const resetDragValues = useCallback(() => {
    dragActiveShared.value = 0
    pendingHitShared.value = null
    dragX.value = 0
    dragY.value = 0
    lift.value = 0
  }, [dragActiveShared, dragX, dragY, lift, pendingHitShared])

  const clearSession = useCallback(() => {
    resetDragValues()
    commitSession(null)
  }, [commitSession, resetDragValues])

  // A drag cannot survive the board being taken away from under it (celebration
  // start, auto-complete, board lock) or a fresh deal.
  useEffect(() => {
    if (!enabled && dragSessionRef.current) {
      clearSession()
    }
  }, [clearSession, enabled])

  useEffect(() => {
    if (dragSessionRef.current) {
      clearSession()
    }
    // Deliberately keyed on the deal reset only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationResetKey])

  useEffect(() => clearSession, [clearSession])

  const beginDrag = useCallback(
    (hit: DragSourceHit, touchX: number, touchY: number) => {
      const current = stateRef.current
      const selection = selectionFromHit(hit)
      // previewSelectionStack is the reducer's own answer to "what does this
      // selection lift", so the overlay, the hidden ids and the eventual move can
      // never disagree. Re-derived from LIVE state: the shared-value model can be
      // one frame stale if the board changed just before touch-down.
      const cards = previewSelectionStack(current, selection)
      if (!cards.length || cards[0].id !== hit.cardId) {
        devLog('warn', '[Drag] Aborted: board changed under the finger', {
          cardId: hit.cardId,
        })
        clearSession()
        return
      }

      const hints = getDropHints({
        selected: selection,
        tableau: current.tableau,
        foundations: current.foundations,
        waste: current.waste,
      })

      devLog('log', '[Drag] Begin', { selection, cards: cards.length })
      commitSession({
        selection,
        cards,
        offsets: computeLiftedRunOffsets(cards.length, cardMetricsRef.current.stackOffset),
        originRect: hit.rect,
        touchOffset: { x: touchX - hit.rect.x, y: touchY - hit.rect.y },
        hiddenCardIds: new Set(cards.map((card) => card.id)),
        dropHints: hints,
      })
    },
    [clearSession, commitSession, stateRef]
  )

  // Runs after the snap-back animation (or immediately with animations off): the
  // copies are back at the origin, and the real cards never moved, so unhiding them
  // is a pixel-identical swap. The wiggle must come AFTER the unhide in the same
  // task — wiggling hidden cards would be invisible.
  const finishReturn = useCallback(
    (shouldWiggle: boolean, selection: Selection) => {
      clearSession()
      if (shouldWiggle) {
        notifyInvalidMoveRef.current({ selection })
      }
    },
    [clearSession]
  )

  const endDrag = useCallback(
    (translationX: number, translationY: number) => {
      const session = dragSessionRef.current
      if (!session) {
        resetDragValues()
        return
      }

      const current = stateRef.current
      const metrics = cardMetricsRef.current
      const cardRect: HintRect = {
        x: session.originRect.x + translationX,
        y: session.originRect.y + translationY,
        width: metrics.width,
        height: metrics.height,
      }

      // The mask cached at beginDrag is for HIGHLIGHTING only; the drop always
      // re-validates against live state. That closes the "something else dispatched
      // mid-drag" class of races (undo, a second finger tapping another card, the
      // auto-queue), and applyMove validates once more anyway.
      //
      // First: does this selection still lift the card we picked up? If not, the
      // board moved under the drag and the selection now points at something else —
      // dropping it would move a card the player never grabbed. Snap back silently.
      const liveStack = previewSelectionStack(current, session.selection)
      const boardMoved = !liveStack.length || liveStack[0].id !== session.cards[0].id
      const hints = getDropHints({
        selected: session.selection,
        tableau: current.tableau,
        foundations: current.foundations,
        waste: current.waste,
      })
      const resolution: DropResolution = boardMoved
        ? { kind: 'none' }
        : resolveDropCandidate(
            buildDropCandidates({
              tableau: current.tableau,
              layouts: layoutsRef.current,
              cardMetrics: metrics,
              hints,
              selection: session.selection,
            }),
            cardRect
          )
      devLog('log', '[Drag] Drop', { resolution, selection: session.selection })

      // If the board was taken away mid-drag (lock, celebration, auto-complete),
      // dispatchGameAction would silently drop the move while the cards had already
      // been seeded to the drop point — they would then sit there with no flight to
      // correct them. Snap back instead.
      if (resolution.kind === 'legal' && enabledRef.current) {
        // Seed the real (still hidden) cards to the drop point, then dispatch and
        // unhide in the SAME JS task: React 19 batches both into one commit, so the
        // cards become visible already at the drop position and the existing 90 ms
        // flight carries them from there to the destination. No jump, no second
        // animation, no timer — see the plan doc's "release handoff".
        cardTransforms.seed(
          session.cards.map((card, index) => ({
            cardId: card.id,
            x: cardRect.x,
            y: cardRect.y + session.offsets[index],
          }))
        )
        dispatchGameActionRef.current({
          type: 'APPLY_MOVE',
          selection: session.selection,
          target: resolution.target,
        })
        commitSession(null)
        // dragX/dragY/lift are deliberately NOT reset here: the overlay is still
        // mounted for this commit, and zeroing them would flash the copies back to
        // the origin for a frame. The next drag's onStart zeroes them.
        dragActiveShared.value = 0
        pendingHitShared.value = null
        return
      }

      // Sloppy tap / drag-back-onto-itself: activating the pan cancelled the RN
      // touch, so without this a finger that rolled 10 px and came back would be a
      // dead no-op. Route it to the SAME handler the tap would have used.
      const releaseX = session.originRect.x + session.touchOffset.x + translationX
      const releaseY = session.originRect.y + session.touchOffset.y + translationY
      if (
        !boardMoved &&
        resolution.kind !== 'illegal' &&
        isPointInRect(session.originRect, releaseX, releaseY)
      ) {
        clearSession()
        const handlers = tapHandlersRef.current
        if (session.selection.source === 'tableau') {
          handlers.onTableauCardPress(
            session.selection.columnIndex,
            session.selection.cardIndex
          )
        } else if (session.selection.source === 'waste') {
          handlers.onWasteTap()
        } else {
          handlers.onFoundationPress(session.selection.suit)
        }
        return
      }

      // 'illegal' snaps back AND wiggles (matching invalid-tap feedback); 'self' and
      // 'none' snap back silently — the player aborted, and wiggling an abort is noise.
      const shouldWiggle = resolution.kind === 'illegal'
      if (animationsEnabledShared.value === 0) {
        finishReturn(shouldWiggle, session.selection)
        return
      }

      const timing = { duration: DRAG_SNAP_BACK_DURATION_MS }
      const selection = session.selection
      dragX.value = withTiming(0, timing)
      lift.value = withTiming(0, timing)
      dragY.value = withTiming(0, timing, (finished) => {
        'worklet'
        // An unfinished snap-back means a NEW drag interrupted it (onStart is the
        // only other writer of these values). Clearing then would wipe the fresh
        // session; beginDrag's own commit already replaces the old one.
        if (!finished) {
          return
        }
        runOnJS(finishReturn)(shouldWiggle, selection)
      })
    },
    [
      animationsEnabledShared,
      cardTransforms,
      clearSession,
      commitSession,
      dragActiveShared,
      dragX,
      dragY,
      finishReturn,
      lift,
      pendingHitShared,
      resetDragValues,
      stateRef,
    ]
  )

  const dragGesture = useMemo(() => {
    // onEnd fires only for an activated gesture, onFinalize for every terminal case
    // (failure, cancellation, app backgrounding). Both route here behind a
    // single-fire guard — same pattern as useUndoScrubber.
    const finish = () => {
      'worklet'
      pendingHitShared.value = null
      if (dragActiveShared.value === 0) {
        return
      }
      dragActiveShared.value = 0
      runOnJS(endDrag)(dragX.value, dragY.value)
    }

    return Gesture.Pan()
      .manualActivation(true)
      .maxPointers(1)
      // Dragging past the board edge must not cancel the drag.
      .shouldCancelWhenOutside(false)
      // cancelsTouchesInView stays at its default `true`: once we activate, the
      // card's Pressable must NOT also fire onPress.
      .onTouchesDown((event, stateManager) => {
        'worklet'
        // Anything we do not claim is failed immediately, so the RN touch is never
        // disturbed and tap-to-move behaves exactly as it does today.
        if (dragActiveShared.value > 0 || scrubActiveShared.value > 0) {
          stateManager.fail()
          return
        }
        const touch = event.changedTouches[0] ?? event.allTouches[0]
        if (!touch) {
          stateManager.fail()
          return
        }
        const hit = hitTestDragSource(sourceModelShared.value, touch.x, touch.y)
        if (!hit) {
          pendingHitShared.value = null
          stateManager.fail()
          return
        }
        pendingHitShared.value = hit
        touchStartShared.value = { x: touch.x, y: touch.y }
      })
      .onTouchesMove((event, stateManager) => {
        'worklet'
        if (dragActiveShared.value > 0 || !pendingHitShared.value) {
          return
        }
        const touch = event.changedTouches[0] ?? event.allTouches[0]
        if (!touch) {
          return
        }
        const dx = touch.x - touchStartShared.value.x
        const dy = touch.y - touchStartShared.value.y
        if (
          dx * dx + dy * dy >=
          DRAG_ACTIVATION_DISTANCE_PX * DRAG_ACTIVATION_DISTANCE_PX
        ) {
          stateManager.activate()
        }
      })
      .onStart(() => {
        'worklet'
        const hit = pendingHitShared.value
        if (!hit) {
          return
        }
        dragActiveShared.value = 1
        dragX.value = 0
        dragY.value = 0
        // Dragging is an input method and never turns off; only the decorative lift
        // gates on the animations master toggle.
        lift.value =
          animationsEnabledShared.value > 0
            ? withTiming(1, { duration: DRAG_LIFT_DURATION_MS })
            : 0
        runOnJS(beginDrag)(hit, touchStartShared.value.x, touchStartShared.value.y)
      })
      .onUpdate((event) => {
        'worklet'
        if (dragActiveShared.value === 0) {
          return
        }
        dragX.value = event.translationX
        dragY.value = event.translationY
      })
      .onEnd(finish)
      .onFinalize(finish) as unknown as GestureType
  }, [
    animationsEnabledShared,
    beginDrag,
    dragActiveShared,
    dragX,
    dragY,
    endDrag,
    lift,
    pendingHitShared,
    scrubActiveShared,
    sourceModelShared,
    touchStartShared,
  ])

  const dragOverlayProps = useMemo<DragOverlayLayerProps | null>(
    () =>
      dragSession
        ? {
            cards: dragSession.cards,
            offsets: dragSession.offsets,
            origin: { x: dragSession.originRect.x, y: dragSession.originRect.y },
            cardMetrics,
            dragX,
            dragY,
            lift,
          }
        : null,
    [cardMetrics, dragSession, dragX, dragY, lift]
  )

  return {
    dragGesture,
    hiddenCardIds: dragSession?.hiddenCardIds ?? null,
    dragDropHints: dragSession?.dropHints ?? null,
    cardTransforms,
    dragOverlayProps,
  }
}
