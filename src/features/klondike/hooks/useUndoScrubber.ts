import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions } from 'react-native'
import { Gesture } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

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

  const computeScrubGeometry = useCallback(
    (anchorIndex: number) => {
      const windowWidth = Dimensions.get('window').width || 1
      const metrics = trackMetricsRef.current
      const defaultTrackLeft = safeArea.left + UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING
      const defaultTrackRight = windowWidth - safeArea.right - UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING
      const trackLeft = metrics ? metrics.left : defaultTrackLeft
      const trackRight = metrics ? metrics.right : defaultTrackRight
      const usableWidth = Math.max(trackRight - trackLeft, 1)
      const maxIndex = Math.max(timelineRange, 0)

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
    [safeArea.left, safeArea.right, timelineRange],
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
      const totalRange = timelineRange
      if (totalRange <= 0) {
        return 0
      }
      const windowWidth = Dimensions.get('window').width || 1
      const metrics = trackMetricsRef.current
      const defaultTrackLeft = safeArea.left + UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING
      const defaultTrackRight = windowWidth - safeArea.right - UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING
      const trackLeft = metrics ? metrics.left : defaultTrackLeft
      const trackRight = metrics ? metrics.right : defaultTrackRight
      const usableWidth = Math.max(trackRight - trackLeft, 1)
      const clamped = Math.min(Math.max(absoluteX, trackLeft), trackRight)
      const normalized = (clamped - trackLeft) / usableWidth
      return Math.max(0, Math.min(Math.round(normalized * totalRange), totalRange))
    },
    [safeArea.left, safeArea.right, timelineRange],
  )

  const scheduleScrubDispatch = useCallback(
    (index: number) => {
      scrubPendingIndexRef.current = index
      if (scrubDispatchRafRef.current !== null) {
        return
      }
      scrubDispatchRafRef.current = requestAnimationFrame(() => {
        scrubDispatchRafRef.current = null
        const pending = scrubPendingIndexRef.current
        scrubPendingIndexRef.current = null
        if (pending === null || pending === lastDispatchedScrubIndexRef.current) {
          return
        }
        lastDispatchedScrubIndexRef.current = pending
        dispatch({ type: 'SCRUB_TO_INDEX', index: pending })
      })
    },
    [dispatch],
  )

  const handleScrubGestureStart = useCallback(
    (absoluteX: number) => {
      if (boardLocked || !shouldShowUndo) {
        return
      }
      cancelScheduledScrub()
      const pointer = state.history.length
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
    [boardLocked, cancelScheduledScrub, computeScrubGeometry, shouldShowUndo, state.history.length],
  )

  const handleScrubGestureUpdate = useCallback(
    (absoluteX: number) => {
      if (!shouldShowUndo || !isScrubbingRef.current) {
        return
      }
      const totalRange = timelineRange
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
    [computeScrubIndexFromAbsolute, scheduleScrubDispatch, shouldShowUndo, timelineRange],
  )

  const handleScrubGestureEnd = useCallback(() => {
    if (!isScrubbingRef.current) {
      return
    }
    const finalIndex = scrubPointerRef.current
    scheduleScrubDispatch(finalIndex)
    isScrubbingRef.current = false
    setIsScrubbing(false)
    scrubOriginRef.current = null
  }, [scheduleScrubDispatch])

  const undoScrubGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(!boardLocked && shouldShowUndo)
      .minDistance(2)
      .activeOffsetY([-20, 20])
      .onStart((event) => {
        runOnJS(handleScrubGestureStart)(event.absoluteX)
      })
      .onUpdate((event) => {
        runOnJS(handleScrubGestureUpdate)(event.absoluteX)
      })
      .onEnd(() => {
        runOnJS(handleScrubGestureEnd)()
      })
      .onFinalize(() => {
        runOnJS(handleScrubGestureEnd)()
      })
      .maxPointers(1)
  }, [
    boardLocked,
    handleScrubGestureEnd,
    handleScrubGestureStart,
    handleScrubGestureUpdate,
    shouldShowUndo,
  ])

  const handleUndoTap = useCallback(() => {
    if (isScrubbingRef.current || !canUndo) {
      return
    }
    handleUndo()
  }, [canUndo, handleUndo])

  return {
    shouldShowUndo,
    canUndo,
    isScrubbing,
    scrubSliderValue,
    scrubSliderMax,
    undoScrubGesture,
    handleUndoTap,
    handleTrackMetrics,
  }
}


