import { useEffect } from 'react'

import type { GameAction, GameState, Selection } from '../../../solitaire/klondike'

export type AutoQueueRunnerParams = {
  state: GameState
  dispatchWithFlight: (action: GameAction, selection?: Selection | null) => void
  moveDelayMs: number
  intervalMs: number
}

// Runs the auto-complete queue, dispatching queued actions after the configured delays.
export const useAutoQueueRunner = ({
  state,
  dispatchWithFlight,
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
    const selection = nextAction.type === 'move' ? nextAction.selection ?? null : null

    const timeoutId = setTimeout(() => {
      dispatchWithFlight({ type: 'ADVANCE_AUTO_QUEUE' }, selection)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [dispatchWithFlight, intervalMs, moveDelayMs, state.autoQueue, state.isAutoCompleting])
}
