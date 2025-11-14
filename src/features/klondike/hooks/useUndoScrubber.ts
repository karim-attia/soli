import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions } from 'react-native'
import { Gesture } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'

import type { GameAction, GameState } from '../../../solitaire/klondike'

type UseUndoScrubberOptions = {
  state: GameState
  boardLocked: boolean
  celebrationActive: boolean
  safeArea: { left: number; right: number }
  dispatch: React.Dispatch<GameAction>
  handleUndo: () => void
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
    }
  }, [shouldShowUndo, isScrubbing])

  useEffect(() => {
    if (isScrubbing) {
      return
    }
    const pointer = state.history.length
    if (scrubPointerRef.current !== pointer) {
      scrubPointerRef.current = pointer
    }
    setScrubValue((current) => (current === pointer ? current : pointer))
  }, [isScrubbing, state.history.length])

  const scrubSliderMax = useMemo(() => Math.max(timelineRange, 1), [timelineRange])
  const scrubSliderValue = useMemo(() => [scrubValue], [scrubValue])

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
      const usableWidth = Math.max(windowWidth - safeArea.left - safeArea.right, 1)
      const relativeX = Math.min(Math.max(absoluteX - safeArea.left, 0), usableWidth)
      const normalized = relativeX / usableWidth
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
      const pointer = computeScrubIndexFromAbsolute(absoluteX)
      scrubPointerRef.current = pointer
      lastDispatchedScrubIndexRef.current = pointer
      isScrubbingRef.current = true
      setScrubValue(pointer)
      setIsScrubbing(true)
    },
    [boardLocked, computeScrubIndexFromAbsolute, shouldShowUndo],
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
      const nextIndex = computeScrubIndexFromAbsolute(absoluteX)
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
  }
}


