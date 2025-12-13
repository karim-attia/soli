import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions } from 'react-native'
import { Gesture } from 'react-native-gesture-handler'
import type { GestureType } from 'react-native-gesture-handler'

import type { GameAction, GameState } from '../../../solitaire/klondike'
import { UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING } from '../constants'

type UseUndoScrubberOptions = {
  state: GameState
  boardLocked: boolean
  celebrationActive: boolean
  safeArea: { left: number; right: number }
  dispatch: React.Dispatch<GameAction>
  handleUndo: () => void
}

type ScrubOrigin = {
  anchorIndex: number
  anchorAbsoluteX: number
  leftSpace: number
  rightSpace: number
  maxIndex: number
  leftSteps: number
  rightSteps: number
  trackLeft: number
  trackRight: number
  fingerStartX: number
  fingerLeftRange: number
  fingerRightRange: number
}

export const useUndoScrubber = ({
  state,
  boardLocked,
  celebrationActive,
  safeArea,
  dispatch,
  handleUndo,
}: UseUndoScrubberOptions) => {
  const hasUndo = state.history.length > 0
  const timelineRange = state.history.length + state.future.length
  const shouldShowUndo = !state.hasWon && !celebrationActive && timelineRange > 0
  const canUndo = !boardLocked && hasUndo
  
  // requirement 20-6: Refs for all state values to prevent callback recreation during scrubbing
  const stateRef = useRef(state)
  stateRef.current = state
  const timelineRangeRef = useRef(timelineRange)
  timelineRangeRef.current = timelineRange
  const shouldShowUndoRef = useRef(shouldShowUndo)
  shouldShowUndoRef.current = shouldShowUndo
  const boardLockedRef = useRef(boardLocked)
  boardLockedRef.current = boardLocked

  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubValue, setScrubValue] = useState(0)
  const isScrubbingRef = useRef(false)
  const scrubPointerRef = useRef(0)
  const scrubPendingIndexRef = useRef<number | null>(null)
  const scrubDispatchRafRef = useRef<number | null>(null)
  const lastDispatchedScrubIndexRef = useRef(state.history.length)
  const trackMetricsRef = useRef<{ left: number; right: number } | null>(null)
  const scrubOriginRef = useRef<ScrubOrigin | null>(null)
  

  useEffect(() => {
    isScrubbingRef.current = isScrubbing
  }, [isScrubbing])

  useEffect(() => {
    if (!isScrubbing) {
      lastDispatchedScrubIndexRef.current = state.history.length
    }
  }, [isScrubbing, state.history.length])

  useEffect(() => {
    if (!shouldShowUndo && isScrubbing) {
      setIsScrubbing(false)
      scrubPointerRef.current = 0
      setScrubValue(0)
      scrubOriginRef.current = null
    }
  }, [shouldShowUndo, isScrubbing])

  useEffect(() => {
    if (isScrubbing) {
      return
    }
    scrubOriginRef.current = null
    const pointer = state.history.length
    if (scrubPointerRef.current !== pointer) {
      scrubPointerRef.current = pointer
    }
    setScrubValue((current) => (current === pointer ? current : pointer))
  }, [isScrubbing, state.history.length])

  const scrubSliderMax = useMemo(() => Math.max(timelineRange, 1), [timelineRange])
  const scrubSliderValue = useMemo(() => [scrubValue], [scrubValue])

  const handleTrackMetrics = useCallback((metrics: { left: number; right: number }) => {
    if (metrics.right <= metrics.left) {
      return
    }
    trackMetricsRef.current = metrics
  }, [])

  // requirement 20-6: ROOT CAUSE FIX - Use refs in dependencies to prevent callback recreation
  // When we dispatch SCRUB_TO_INDEX, state.history changes, which changes timelineRange.
  // If timelineRange is in the dependency array, callbacks are recreated, gesture is recreated,
  // and iOS cancels the gesture. Using refs prevents this callback recreation chain.
  const safeAreaRef = useRef(safeArea)
  safeAreaRef.current = safeArea

  const computeScrubGeometry = useCallback(
    (anchorIndex: number) => {
      const windowWidth = Dimensions.get('window').width || 1
      const metrics = trackMetricsRef.current
      const currentSafeArea = safeAreaRef.current
      const currentTimelineRange = timelineRangeRef.current
      const defaultTrackLeft = currentSafeArea.left + UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING
      const defaultTrackRight = windowWidth - currentSafeArea.right - UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING
      const trackLeft = metrics ? metrics.left : defaultTrackLeft
      const trackRight = metrics ? metrics.right : defaultTrackRight
      const usableWidth = Math.max(trackRight - trackLeft, 1)
      const maxIndex = Math.max(currentTimelineRange, 0)

      if (maxIndex <= 0) {
        const anchorAbsoluteX = trackLeft + usableWidth / 2
        return {
          anchorAbsoluteX,
          leftSpace: Math.max(anchorAbsoluteX - trackLeft, 0),
          rightSpace: Math.max(trackRight - anchorAbsoluteX, 0),
          maxIndex,
          leftSteps: 0,
          rightSteps: 0,
          trackLeft,
          trackRight,
        }
      }

      const clampedAnchor = Math.max(0, Math.min(anchorIndex, maxIndex))
      const anchorNormalized = clampedAnchor / maxIndex
      const anchorAbsoluteX = trackLeft + anchorNormalized * usableWidth
      const leftSpace = Math.max(anchorAbsoluteX - trackLeft, 0)
      const rightSpace = Math.max(trackRight - anchorAbsoluteX, 0)

      return {
        anchorAbsoluteX,
        leftSpace,
        rightSpace,
        maxIndex,
        leftSteps: clampedAnchor,
        rightSteps: Math.max(maxIndex - clampedAnchor, 0),
        trackLeft,
        trackRight,
      }
    },
    [], // Empty deps - all values come from refs
  )

  const cancelScheduledScrub = useCallback(() => {
    if (scrubDispatchRafRef.current !== null) {
      cancelAnimationFrame(scrubDispatchRafRef.current)
      scrubDispatchRafRef.current = null
    }
    scrubPendingIndexRef.current = null
  }, [])

  useEffect(() => cancelScheduledScrub, [cancelScheduledScrub])

  const computeScrubIndexFromAbsolute = useCallback(
    (absoluteX: number): number => {
      // requirement 20-6: Use refs to prevent callback recreation during scrubbing
      const totalRange = timelineRangeRef.current
      if (totalRange <= 0) {
        return 0
      }
      const windowWidth = Dimensions.get('window').width || 1
      const metrics = trackMetricsRef.current
      const currentSafeArea = safeAreaRef.current
      const defaultTrackLeft = currentSafeArea.left + UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING
      const defaultTrackRight = windowWidth - currentSafeArea.right - UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING
      const trackLeft = metrics ? metrics.left : defaultTrackLeft
      const trackRight = metrics ? metrics.right : defaultTrackRight
      const usableWidth = Math.max(trackRight - trackLeft, 1)
      const clamped = Math.min(Math.max(absoluteX, trackLeft), trackRight)
      const normalized = (clamped - trackLeft) / usableWidth
      return Math.max(0, Math.min(Math.round(normalized * totalRange), totalRange))
    },
    [], // Empty deps - all values come from refs
  )

  const scheduleScrubDispatch = useCallback(
    (index: number) => {
      scrubPendingIndexRef.current = index
      if (scrubDispatchRafRef.current !== null) {
        return
      }
      scrubDispatchRafRef.current = requestAnimationFrame(() => {
        scrubDispatchRafRef.current = null
        const desiredPending = scrubPendingIndexRef.current
        scrubPendingIndexRef.current = null
        if (desiredPending === null || desiredPending === lastDispatchedScrubIndexRef.current) {
          return
        }
        // requirement 20-6: Yield to gesture handler, then dispatch with startTransition
        lastDispatchedScrubIndexRef.current = desiredPending
        setTimeout(() => {
          startTransition(() => {
            dispatch({ type: 'SCRUB_TO_INDEX', index: desiredPending })
          })
        }, 0)
      })
    },
    [dispatch],
  )

  const handleScrubGestureStart = useCallback(
    (absoluteX: number, absoluteY: number, translationX: number, translationY: number, gestureState: number) => {
      // requirement 20-6: Use refs to avoid callback recreation during scrubbing
      const currentState = stateRef.current
      // requirement 20-6: Use ref for enabled check to avoid stale closure values
      if (!gestureEnabledRef.current) {
        return
      }
      cancelScheduledScrub()
      const pointer = currentState.history.length
      const geometry = computeScrubGeometry(pointer)
      const clampedFingerStart = Math.min(
        Math.max(absoluteX, geometry.trackLeft),
        geometry.trackRight,
      )
      const fingerLeftRange = Math.max(clampedFingerStart - geometry.trackLeft, 1)
      const fingerRightRange = Math.max(geometry.trackRight - clampedFingerStart, 1)
      // requirement 20-4: anchor scrub start to the current history index
      scrubOriginRef.current = {
        anchorIndex: pointer,
        anchorAbsoluteX: geometry.anchorAbsoluteX,
        leftSpace: geometry.leftSpace,
        rightSpace: geometry.rightSpace,
        maxIndex: geometry.maxIndex,
        leftSteps: geometry.leftSteps,
        rightSteps: geometry.rightSteps,
        trackLeft: geometry.trackLeft,
        trackRight: geometry.trackRight,
        fingerStartX: clampedFingerStart,
        fingerLeftRange,
        fingerRightRange,
      }
      scrubPointerRef.current = pointer
      lastDispatchedScrubIndexRef.current = pointer
      isScrubbingRef.current = true
      setScrubValue(pointer)
      setIsScrubbing(true)
    },
    // requirement 20-6: Stable deps - only refs and stable callbacks, no state values
    [cancelScheduledScrub, computeScrubGeometry],
  )
  const handleScrubGestureUpdate = useCallback(
    (absoluteX: number, absoluteY: number, translationX: number, translationY: number, gestureState: number) => {
      // requirement 20-6: Use refs to avoid callback recreation during scrubbing
      const currentShouldShowUndo = shouldShowUndoRef.current
      const currentTimelineRange = timelineRangeRef.current
      if (!currentShouldShowUndo || !isScrubbingRef.current) {
        return
      }
      const totalRange = currentTimelineRange
      if (totalRange <= 0) {
        return
      }
      const origin = scrubOriginRef.current
      let nextIndex = origin?.anchorIndex ?? scrubPointerRef.current

      if (origin) {
        // requirement 20-5: map finger delta proportionally to the available timeline span
        const clampedX = Math.min(Math.max(absoluteX, origin.trackLeft), origin.trackRight)
        const clampMax = Math.max(0, Math.min(origin.maxIndex, totalRange))
        if (clampedX < origin.fingerStartX) {
          if (origin.leftSteps > 0 && origin.fingerLeftRange > 0) {
            const normalized = Math.min(
              (origin.fingerStartX - clampedX) / origin.fingerLeftRange,
              1,
            )
            const stepChange = Math.round(normalized * origin.leftSteps)
            nextIndex = origin.anchorIndex - stepChange
          }
        } else if (clampedX > origin.fingerStartX) {
          if (origin.rightSteps > 0 && origin.fingerRightRange > 0) {
            const normalized = Math.min(
              (clampedX - origin.fingerStartX) / origin.fingerRightRange,
              1,
            )
            const stepChange = Math.round(normalized * origin.rightSteps)
            nextIndex = origin.anchorIndex + stepChange
          }
        }
        nextIndex = Math.max(0, Math.min(nextIndex, clampMax))
      } else {
        nextIndex = computeScrubIndexFromAbsolute(absoluteX)
      }

      if (nextIndex === scrubPointerRef.current) {
        return
      }
      scrubPointerRef.current = nextIndex
      setScrubValue(nextIndex)
      scheduleScrubDispatch(nextIndex)
    },
    // requirement 20-6: Stable deps - only refs and stable callbacks, no state values
    [computeScrubIndexFromAbsolute, scheduleScrubDispatch],
  )

  const handleScrubGestureEnd = useCallback((source: string, gestureState?: number) => {
    if (!isScrubbingRef.current) {
      return
    }
    const finalIndex = scrubPointerRef.current
    scheduleScrubDispatch(finalIndex)
    isScrubbingRef.current = false
    setIsScrubbing(false)
    scrubOriginRef.current = null
  }, [scheduleScrubDispatch])

  // requirement 20-6: compose Tap + Pan to avoid iOS gesture conflicts with Button's onPress
  // Use ref for canUndo check to avoid gesture recreation
  const canUndoRef = useRef(false)
  canUndoRef.current = canUndo
  
  // requirement 20-6: CRITICAL - Use ref for handleUndo to prevent callback recreation
  // handleUndo changes on state updates, which would cause gesture rebuild
  const handleUndoRef = useRef(handleUndo)
  handleUndoRef.current = handleUndo
  
  // requirement 20-6: Wrap handleUndo to check canUndo ref - NO dependencies to prevent recreation
  const handleTapEnd = useCallback(() => {
    if (canUndoRef.current) {
      handleUndoRef.current()
    }
  }, []) // NO dependencies - uses refs only

  // requirement 20-6: Dedicated Tap gesture for plain undo press (works on iOS and Android).
  const undoTapGesture = useMemo(() => {
    return Gesture.Tap()
      .runOnJS(true)
      .enabled(true)
      .onEnd(() => {
        handleTapEnd()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleTapEnd])

  // requirement 20-6: Keep gesture enabled during active scrubbing even if timeline changes
  // Use a ref to prevent gesture recreation when state changes during scrubbing
  const gestureEnabledRef = useRef(false)
  gestureEnabledRef.current = !boardLocked && (shouldShowUndo || isScrubbingRef.current)
  
  const undoPanGesture = useMemo(() => {
    return Gesture.Pan()
      // requirement 20-6: Run pan callbacks on JS thread to avoid worklet->JS bridging during state refresh
      // Empirically, iOS cancels shortly after the first React commit; this keeps gesture callbacks consistent.
      .runOnJS(true)
      // requirement 20-6: Always check ref for enabled state to avoid gesture rebuild during scrubbing
      .enabled(true)
      .minDistance(5)
      // requirement 20-6: Tolerate natural vertical finger drift during horizontal scrubbing
      .failOffsetY([-100, 100])
      .shouldCancelWhenOutside(false)
      // requirement 20-6: Improve iOS gesture arbitration with external/system gestures.
      .simultaneousWithExternalGesture()
      .requireExternalGestureToFail()
      // requirement 20-6: iOS gesture handling - extend hit area to help iOS gesture system
      .hitSlop({ bottom: 50, top: 50, left: 20, right: 20 })
      .cancelsTouchesInView(false)
      .onStart((event) => {
        handleScrubGestureStart(event.absoluteX, event.absoluteY, event.translationX, event.translationY, event.state)
      })
      .onUpdate((event) => {
        handleScrubGestureUpdate(event.absoluteX, event.absoluteY, event.translationX, event.translationY, event.state)
      })
      .onEnd((event) => {
        handleScrubGestureEnd('onEnd', event.state)
      })
      .onFinalize((event, success) => {
        handleScrubGestureEnd('onFinalize', event.state)
      })
      .maxPointers(1)
  // requirement 20-6: Minimal dependencies to prevent gesture recreation during scrubbing
  // The gesture callbacks use refs internally so they don't need to be recreated
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleScrubGestureEnd, handleScrubGestureStart, handleScrubGestureUpdate, handleTapEnd])

  // requirement 20-6: Compose Pan + Tap so:
  // - Tap always triggers undo
  // - Pan takes over when user actually scrubs
  const undoScrubGesture = useMemo(
    () => Gesture.Exclusive(undoPanGesture, undoTapGesture) as unknown as GestureType,
    [undoPanGesture, undoTapGesture],
  )

  // requirement 20-6: handleUndoTap no longer exported - tap handled internally by composed gesture
  return {
    shouldShowUndo,
    canUndo,
    isScrubbing,
    scrubSliderValue,
    scrubSliderMax,
    undoScrubGesture,
    handleTrackMetrics,
  }
}


