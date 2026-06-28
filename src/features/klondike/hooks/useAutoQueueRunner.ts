import { useEffect } from 'react'

import type { GameAction, GameState, Selection } from '../../../solitaire/klondike'

export type AutoQueueRunnerParams = {
  state: GameState
  dispatchGameAction: (action: GameAction, selection?: Selection | null) => void
  moveDelayMs: number
  intervalMs: number
}

// Runs the auto-complete queue, dispatching queued actions after the configured delays.
export const useAutoQueueRunner = ({
  state,
  dispatchGameAction,
  moveDelayMs,
  intervalMs,
}: AutoQueueRunnerParams) => {
  useEffect(() => {
    if (!state.isAutoCompleting || state.autoQueue.length === 0) {
      return
    }

    const [nextAction] = state.autoQueue
    if (!nextAction) {
      return
    }

    const delay = nextAction.type === 'move' ? moveDelayMs : intervalMs
    const selection = nextAction.type === 'move' ? (nextAction.selection ?? null) : null

    const timeoutId = setTimeout(() => {
      dispatchGameAction({ type: 'ADVANCE_AUTO_QUEUE' }, selection)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [
    dispatchGameAction,
    intervalMs,
    moveDelayMs,
    state.autoQueue,
    state.isAutoCompleting,
  ])
}
