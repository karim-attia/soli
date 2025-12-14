import { useCallback, useEffect, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

import type { GameAction, GameState } from '../../../solitaire/klondike'
import { TIMER_TICK_INTERVAL_MS } from '../../../utils/time'

type UseKlondikeTimerParams = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  stateRef: React.MutableRefObject<GameState>
}

export const useKlondikeTimer = ({ state, dispatch, stateRef }: UseKlondikeTimerParams) => {
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previousMoveCountRef = useRef(state.moveCount)
  const previousAutoCompletingRef = useRef(state.isAutoCompleting)

  const pauseTimer = useCallback(() => {
    const snapshot = stateRef.current
    if (snapshot.timerState === 'running') {
      dispatch({ type: 'TIMER_STOP', timestamp: Date.now() })
    }
  }, [dispatch, stateRef])

  const resumeTimerIfNeeded = useCallback(() => {
    const snapshot = stateRef.current
    if (
      snapshot.timerState === 'paused' &&
      snapshot.moveCount > 0 &&
      !snapshot.hasWon &&
      !snapshot.isAutoCompleting
    ) {
      dispatch({ type: 'TIMER_START', startedAt: Date.now() })
    }
  }, [dispatch, stateRef])

  useFocusEffect(
    useCallback(() => {
      resumeTimerIfNeeded()
      return () => {
        pauseTimer()
      }
    }, [pauseTimer, resumeTimerIfNeeded]),
  )

  useEffect(() => {
    const previousMoveCount = previousMoveCountRef.current
    const moveIncreased = state.moveCount > previousMoveCount
    // PBI-28: Do not start/restart the timer during auto-up (auto-complete) or after a win.
    if (moveIncreased && state.timerState !== 'running' && !state.isAutoCompleting && !state.hasWon) {
      dispatch({ type: 'TIMER_START', startedAt: Date.now() })
    }
    previousMoveCountRef.current = state.moveCount
  }, [dispatch, state.hasWon, state.isAutoCompleting, state.moveCount, state.timerState])

  useEffect(() => {
    const wasAutoCompleting = previousAutoCompletingRef.current
    const isAutoCompleting = state.isAutoCompleting
    previousAutoCompletingRef.current = isAutoCompleting

    // PBI-28: Stop the timer immediately when auto-up begins.
    if (!wasAutoCompleting && isAutoCompleting && state.timerState === 'running') {
      dispatch({ type: 'TIMER_STOP', timestamp: Date.now() })
    }
  }, [dispatch, state.isAutoCompleting, state.timerState])

  useEffect(() => {
    if (state.timerState === 'running' && state.timerStartedAt === null) {
      dispatch({ type: 'TIMER_START', startedAt: Date.now() })
    }
  }, [dispatch, state.timerStartedAt, state.timerState])

  useEffect(() => {
    if (state.timerState !== 'running') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      return
    }

    if (!timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        dispatch({ type: 'TIMER_TICK', timestamp: Date.now() })
      }, TIMER_TICK_INTERVAL_MS)
      dispatch({ type: 'TIMER_TICK', timestamp: Date.now() })
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [dispatch, state.timerState])

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        resumeTimerIfNeeded()
      } else if (nextState === 'inactive' || nextState === 'background') {
        pauseTimer()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      subscription.remove()
    }
  }, [pauseTimer, resumeTimerIfNeeded])

  return { pauseTimer, resumeTimerIfNeeded }
}
