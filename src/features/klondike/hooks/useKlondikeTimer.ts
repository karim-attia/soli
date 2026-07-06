import { useCallback, useEffect, useEffectEvent, useRef } from 'react'
import { AppState, type AppStateStatus } from 'react-native'
import { useFocusEffect } from 'expo-router/react-navigation'

import type { GameAction, GameState } from '../../../solitaire/klondike'
import { TIMER_TICK_INTERVAL_MS } from '../../../utils/time'

type UseKlondikeTimerParams = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  stateRef: React.MutableRefObject<GameState>
}

export const useKlondikeTimer = ({
  state,
  dispatch,
  stateRef,
}: UseKlondikeTimerParams) => {
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previousMoveCountRef = useRef(state.moveCount)
  const previousAutoCompletingRef = useRef(state.isAutoCompleting)

  const dispatchTimerTick = useEffectEvent(() => {
    dispatch({ type: 'TIMER_TICK', timestamp: Date.now() })
  })

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

  const handleAppStateChange = useEffectEvent((nextState: AppStateStatus) => {
    if (nextState === 'active') {
      resumeTimerIfNeeded()
    } else if (nextState === 'inactive' || nextState === 'background') {
      pauseTimer()
    }
  })

  useFocusEffect(
    useCallback(() => {
      resumeTimerIfNeeded()
      return () => {
        pauseTimer()
      }
    }, [pauseTimer, resumeTimerIfNeeded])
  )

  useEffect(() => {
    const previousMoveCount = previousMoveCountRef.current
    const moveIncreased = state.moveCount > previousMoveCount
    // PBI-28: Do not start/restart the timer during auto-up (auto-complete) or after a win.
    if (
      moveIncreased &&
      state.timerState !== 'running' &&
      !state.isAutoCompleting &&
      !state.hasWon
    ) {
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
      // Effect Events keep the timer callback current without recreating the interval.
      timerIntervalRef.current = setInterval(dispatchTimerTick, TIMER_TICK_INTERVAL_MS)
      dispatchTimerTick()
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [state.timerState])

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    // Effect Events let this native listener observe latest timer helpers without resubscribing.
    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      subscription.remove()
    }
  }, [])
}
