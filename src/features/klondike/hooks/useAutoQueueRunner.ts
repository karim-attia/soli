import { useEffect } from 'react'

import type { GameAction, GameState } from '../../../solitaire/klondike'

export type AutoQueueRunnerParams = {
  state: GameState
  dispatchGameAction: (action: GameAction) => void
  moveDelayMs: number
  intervalMs: number
  // Same flag dispatchGameAction guards on. Passed in as React state (not the ref)
  // on purpose: the effect must re-run when the lock clears, see below.
  boardLocked: boolean
}

// Runs the auto-complete queue, dispatching queued actions after the configured delays.
export const useAutoQueueRunner = ({
  state,
  dispatchGameAction,
  moveDelayMs,
  intervalMs,
  boardLocked,
}: AutoQueueRunnerParams) => {
  useEffect(() => {
    // The queue used to freeze for good while the board was locked: the timeout
    // fired, dispatchGameAction dropped the ADVANCE_AUTO_QUEUE (boardLockedRef), the
    // state therefore did not change, this effect never re-ran and no new timeout
    // was ever armed — leaving isAutoCompleting true with a queue nobody advances.
    // Skipping the timeout while locked and depending on `boardLocked` re-arms the
    // run the moment the lock clears.
    if (boardLocked || !state.isAutoCompleting || state.autoQueue.length === 0) {
      return
    }

    const [nextAction] = state.autoQueue
    if (!nextAction) {
      return
    }

    const delay = nextAction.type === 'move' ? moveDelayMs : intervalMs

    const timeoutId = setTimeout(() => {
      dispatchGameAction({ type: 'ADVANCE_AUTO_QUEUE' })
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [
    boardLocked,
    dispatchGameAction,
    intervalMs,
    moveDelayMs,
    state.autoQueue,
    state.isAutoCompleting,
  ])
}
