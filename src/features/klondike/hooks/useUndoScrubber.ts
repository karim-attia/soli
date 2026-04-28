import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions } from 'react-native'
import { Gesture } from 'react-native-gesture-handler'
import type { GestureType } from 'react-native-gesture-handler'
import { runOnJS, useSharedValue } from 'react-native-reanimated'

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
  maxIndex: number
  leftSteps: number
  rightSteps: number
  trackLeft: number
  trackRight: number
  fingerStartX: number
  fingerLeftRange: number
  fingerRightRange: number
}

type ScrubBounds = {
  trackLeft: number
  trackRight: number
  maxIndex: number
}

const EMPTY_TRACK_METRIC = -1

const resolveScrubBounds = ({
  timelineRange,
  windowWidth,
  safeAreaLeft,
  safeAreaRight,
  measuredTrackLeft,
  measuredTrackRight,
}: {
  timelineRange: number
  windowWidth: number
  safeAreaLeft: number
  safeAreaRight: number
  measuredTrackLeft: number
  measuredTrackRight: number
}): ScrubBounds => {
  'worklet'

  const defaultTrackLeft = safeAreaLeft + UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING
  const defaultTrackRight =
    windowWidth - safeAreaRight - UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING
  const trackLeft =
    measuredTrackLeft !== EMPTY_TRACK_METRIC ? measuredTrackLeft : defaultTrackLeft
  const trackRight =
    measuredTrackRight !== EMPTY_TRACK_METRIC ? measuredTrackRight : defaultTrackRight

  return {
    trackLeft,
    trackRight,
    maxIndex: Math.max(timelineRange, 0),
  }
}

const createScrubOrigin = (
  anchorIndex: number,
  absoluteX: number,
  bounds: ScrubBounds
): ScrubOrigin => {
  'worklet'

  const maxIndex = bounds.maxIndex
  const clampedAnchor = Math.max(0, Math.min(anchorIndex, maxIndex))
  const clampedFingerStart = Math.min(
    Math.max(absoluteX, bounds.trackLeft),
    bounds.trackRight
  )

  return {
    anchorIndex: clampedAnchor,
    maxIndex,
    leftSteps: clampedAnchor,
    rightSteps: Math.max(maxIndex - clampedAnchor, 0),
    trackLeft: bounds.trackLeft,
    trackRight: bounds.trackRight,
    fingerStartX: clampedFingerStart,
    fingerLeftRange: Math.max(clampedFingerStart - bounds.trackLeft, 1),
    fingerRightRange: Math.max(bounds.trackRight - clampedFingerStart, 1),
  }
}

const computeScrubIndexFromAbsolute = (
  absoluteX: number,
  origin: ScrubOrigin | null,
  bounds: ScrubBounds,
  currentIndex: number
) => {
  'worklet'

  const totalRange = bounds.maxIndex
  if (totalRange <= 0) {
    return 0
  }

  if (!origin) {
    const usableWidth = Math.max(bounds.trackRight - bounds.trackLeft, 1)
    const clamped = Math.min(Math.max(absoluteX, bounds.trackLeft), bounds.trackRight)
    const normalized = (clamped - bounds.trackLeft) / usableWidth
    return Math.max(0, Math.min(Math.round(normalized * totalRange), totalRange))
  }

  let nextIndex = origin.anchorIndex
  const clampedX = Math.min(Math.max(absoluteX, origin.trackLeft), origin.trackRight)
  const clampMax = Math.max(0, Math.min(origin.maxIndex, totalRange))

  if (clampedX < origin.fingerStartX) {
    if (origin.leftSteps > 0 && origin.fingerLeftRange > 0) {
      const normalized = Math.min(
        (origin.fingerStartX - clampedX) / origin.fingerLeftRange,
        1
      )
      const stepChange = Math.round(normalized * origin.leftSteps)
      nextIndex = origin.anchorIndex - stepChange
    }
  } else if (clampedX > origin.fingerStartX) {
    if (origin.rightSteps > 0 && origin.fingerRightRange > 0) {
      const normalized = Math.min(
        (clampedX - origin.fingerStartX) / origin.fingerRightRange,
        1
      )
      const stepChange = Math.round(normalized * origin.rightSteps)
      nextIndex = origin.anchorIndex + stepChange
    }
  } else {
    nextIndex = currentIndex
  }

  return Math.max(0, Math.min(nextIndex, clampMax))
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

  const [isScrubbing, setIsScrubbing] = useState(false)
  const scrubDispatchRafRef = useRef<number | null>(null)
  const scrubPendingIndexRef = useRef<number | null>(null)
  const lastDispatchedScrubIndexRef = useRef(state.history.length)

  const timelineRangeShared = useSharedValue(timelineRange)
  const historyLengthShared = useSharedValue(state.history.length)
  const boardLockedShared = useSharedValue(boardLocked ? 1 : 0)
  const shouldShowUndoShared = useSharedValue(shouldShowUndo ? 1 : 0)
  const safeAreaLeftShared = useSharedValue(safeArea.left)
  const safeAreaRightShared = useSharedValue(safeArea.right)
  const windowWidthShared = useSharedValue(Dimensions.get('window').width || 1)
  const trackLeftShared = useSharedValue(EMPTY_TRACK_METRIC)
  const trackRightShared = useSharedValue(EMPTY_TRACK_METRIC)
  const scrubAnimatedIndex = useSharedValue(state.history.length)
  const scrubOriginShared = useSharedValue<ScrubOrigin | null>(null)
  const isScrubbingShared = useSharedValue(0)

  useEffect(() => {
    timelineRangeShared.value = timelineRange
  }, [timelineRange, timelineRangeShared])

  useEffect(() => {
    historyLengthShared.value = state.history.length
    if (!isScrubbing) {
      scrubAnimatedIndex.value = state.history.length
    }
  }, [historyLengthShared, isScrubbing, scrubAnimatedIndex, state.history.length])

  useEffect(() => {
    boardLockedShared.value = boardLocked ? 1 : 0
  }, [boardLocked, boardLockedShared])

  useEffect(() => {
    shouldShowUndoShared.value = shouldShowUndo ? 1 : 0
  }, [shouldShowUndo, shouldShowUndoShared])

  useEffect(() => {
    safeAreaLeftShared.value = safeArea.left
    safeAreaRightShared.value = safeArea.right
  }, [safeArea.left, safeArea.right, safeAreaLeftShared, safeAreaRightShared])

  useEffect(() => {
    isScrubbingShared.value = isScrubbing ? 1 : 0
  }, [isScrubbing, isScrubbingShared])

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      windowWidthShared.value = window.width || 1
    })
    return () => {
      subscription.remove()
    }
  }, [windowWidthShared])

  useEffect(() => {
    if (!isScrubbing) {
      lastDispatchedScrubIndexRef.current = state.history.length
    }
  }, [isScrubbing, state.history.length])

  const cancelScheduledScrub = useCallback(() => {
    if (scrubDispatchRafRef.current !== null) {
      cancelAnimationFrame(scrubDispatchRafRef.current)
      scrubDispatchRafRef.current = null
    }
    scrubPendingIndexRef.current = null
  }, [])

  useEffect(() => cancelScheduledScrub, [cancelScheduledScrub])

  useEffect(() => {
    if (!shouldShowUndo && isScrubbing) {
      cancelScheduledScrub()
      isScrubbingShared.value = 0
      scrubOriginShared.value = null
      scrubAnimatedIndex.value = 0
      setIsScrubbing(false)
    }
  }, [
    cancelScheduledScrub,
    isScrubbing,
    isScrubbingShared,
    scrubAnimatedIndex,
    scrubOriginShared,
    shouldShowUndo,
  ])

  const scrubSliderMax = useMemo(() => Math.max(timelineRange, 1), [timelineRange])

  const handleTrackMetrics = useCallback(
    (metrics: { left: number; right: number }) => {
      if (metrics.right <= metrics.left) {
        return
      }
      trackLeftShared.value = metrics.left
      trackRightShared.value = metrics.right
    },
    [trackLeftShared, trackRightShared]
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
        if (
          desiredPending === null ||
          desiredPending === lastDispatchedScrubIndexRef.current
        ) {
          return
        }

        // Keep reducer commits on JS, but only after the worklet-side gesture math
        // has already settled on the newest target index for this frame.
        lastDispatchedScrubIndexRef.current = desiredPending
        setTimeout(() => {
          startTransition(() => {
            dispatch({ type: 'SCRUB_TO_INDEX', index: desiredPending })
          })
        }, 0)
      })
    },
    [dispatch]
  )

  const beginScrubSession = useCallback(
    (pointer: number) => {
      cancelScheduledScrub()
      lastDispatchedScrubIndexRef.current = pointer
      setIsScrubbing(true)
    },
    [cancelScheduledScrub]
  )

  const finishScrubSession = useCallback(
    (finalIndex: number) => {
      scheduleScrubDispatch(finalIndex)
      setIsScrubbing(false)
    },
    [scheduleScrubDispatch]
  )

  const canUndoRef = useRef(false)
  canUndoRef.current = canUndo

  const handleUndoRef = useRef(handleUndo)
  handleUndoRef.current = handleUndo

  const handleTapEnd = useCallback(() => {
    if (canUndoRef.current) {
      handleUndoRef.current()
    }
  }, [])

  const undoTapGesture = useMemo(() => {
    return Gesture.Tap()
      .runOnJS(true)
      .enabled(true)
      .onEnd(() => {
        handleTapEnd()
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleTapEnd])

  const undoPanGesture = useMemo(() => {
    return (
      Gesture.Pan()
        // Keep the hot path on the UI thread; only the reducer updates cross back to JS.
        .enabled(true)
        .minDistance(5)
        .failOffsetY([-100, 100])
        .shouldCancelWhenOutside(false)
        .simultaneousWithExternalGesture()
        .requireExternalGestureToFail()
        .hitSlop({ bottom: 50, top: 50, left: 20, right: 20 })
        .cancelsTouchesInView(false)
        .onStart((event) => {
          if (boardLockedShared.value > 0 || shouldShowUndoShared.value === 0) {
            return
          }

          const bounds = resolveScrubBounds({
            timelineRange: timelineRangeShared.value,
            windowWidth: windowWidthShared.value,
            safeAreaLeft: safeAreaLeftShared.value,
            safeAreaRight: safeAreaRightShared.value,
            measuredTrackLeft: trackLeftShared.value,
            measuredTrackRight: trackRightShared.value,
          })
          const pointer = historyLengthShared.value

          scrubOriginShared.value = createScrubOrigin(pointer, event.absoluteX, bounds)
          scrubAnimatedIndex.value = pointer
          isScrubbingShared.value = 1
          runOnJS(beginScrubSession)(pointer)
        })
        .onUpdate((event) => {
          if (isScrubbingShared.value === 0) {
            return
          }

          const bounds = resolveScrubBounds({
            timelineRange: timelineRangeShared.value,
            windowWidth: windowWidthShared.value,
            safeAreaLeft: safeAreaLeftShared.value,
            safeAreaRight: safeAreaRightShared.value,
            measuredTrackLeft: trackLeftShared.value,
            measuredTrackRight: trackRightShared.value,
          })
          const nextIndex = computeScrubIndexFromAbsolute(
            event.absoluteX,
            scrubOriginShared.value,
            bounds,
            scrubAnimatedIndex.value
          )

          if (nextIndex === scrubAnimatedIndex.value) {
            return
          }

          scrubAnimatedIndex.value = nextIndex
          runOnJS(scheduleScrubDispatch)(nextIndex)
        })
        .onEnd(() => {
          if (isScrubbingShared.value === 0) {
            return
          }

          const finalIndex = scrubAnimatedIndex.value
          isScrubbingShared.value = 0
          scrubOriginShared.value = null
          runOnJS(finishScrubSession)(finalIndex)
        })
        .onFinalize(() => {
          if (isScrubbingShared.value === 0) {
            return
          }

          const finalIndex = scrubAnimatedIndex.value
          isScrubbingShared.value = 0
          scrubOriginShared.value = null
          runOnJS(finishScrubSession)(finalIndex)
        })
        .maxPointers(1)
    )
  }, [
    beginScrubSession,
    boardLockedShared,
    finishScrubSession,
    historyLengthShared,
    safeAreaLeftShared,
    safeAreaRightShared,
    scheduleScrubDispatch,
    scrubAnimatedIndex,
    scrubOriginShared,
    shouldShowUndoShared,
    timelineRangeShared,
    trackLeftShared,
    trackRightShared,
    windowWidthShared,
    isScrubbingShared,
  ])

  const undoScrubGesture = useMemo(
    () => Gesture.Exclusive(undoPanGesture, undoTapGesture) as unknown as GestureType,
    [undoPanGesture, undoTapGesture]
  )

  return {
    shouldShowUndo,
    canUndo,
    isScrubbing,
    scrubAnimatedIndex,
    scrubSliderMax,
    undoScrubGesture,
    handleTrackMetrics,
  }
}
