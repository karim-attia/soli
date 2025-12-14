import { useEffect, useState } from 'react'

import { devLog } from '../../../utils/devLogger'
import {
  PersistedGameError,
  clearGameState,
  loadGameState,
  saveGameStateWithHistory,
} from '../../../storage/gamePersistence'
import type { GameAction, GameState } from '../../../solitaire/klondike'

type UseKlondikePersistenceParams = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  resetCardFlights: () => void
  previousHasWonRef: React.MutableRefObject<boolean>
  // Task 10-7: Persist linkage to the active history entry across restarts.
  currentGameEntryIdRef: React.MutableRefObject<string | null>
}

export const useKlondikePersistence = ({
  state,
  dispatch,
  resetCardFlights,
  previousHasWonRef,
  currentGameEntryIdRef,
}: UseKlondikePersistenceParams) => {
  const [storageHydrationComplete, setStorageHydrationComplete] = useState(false)

  useEffect(() => {
    let isCancelled = false

    ;(async () => {
      try {
        const persisted = await loadGameState()
        if (isCancelled || !persisted) {
          return
        }

        if (persisted.status === 'won') {
          devLog('info', '[Game] Cleared completed session on startup; starting new shuffle.')
          try {
            await clearGameState()
          } catch (clearError) {
            devLog('warn', 'Failed clearing completed saved game state', clearError)
          }
          resetCardFlights()
          previousHasWonRef.current = false
          return
        }

        devLog('info', '[Game] Hydrating saved in-progress session.', {
          savedAt: persisted.savedAt,
          shuffleId: persisted.state.shuffleId,
        })
        previousHasWonRef.current = persisted.state.hasWon
        // Task 10-7: Restore history linkage so completion updates the same entry.
        currentGameEntryIdRef.current = persisted.historyEntryId
        resetCardFlights()
        dispatch({ type: 'HYDRATE_STATE', state: persisted.state })
      } catch (error) {
        if (isCancelled) {
          return
        }

        let message = 'Saved game was corrupted and has been cleared.'
        if (error instanceof PersistedGameError && error.reason === 'unsupported-version') {
          message = 'Saved game came from an older version and has been cleared.'
        }

        try {
          await clearGameState()
        } catch (clearError) {
          devLog('warn', 'Failed clearing invalid saved game state', clearError)
        }

        devLog('warn', '[Toast suppressed] Game reset', { message })
      } finally {
        if (!isCancelled) {
          setStorageHydrationComplete(true)
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [currentGameEntryIdRef, dispatch, previousHasWonRef, resetCardFlights])

  useEffect(() => {
    if (!storageHydrationComplete) {
      return
    }

    let isCancelled = false

    ;(async () => {
      try {
        await saveGameStateWithHistory(state, currentGameEntryIdRef.current)
      } catch (error) {
        if (!isCancelled) {
          devLog('warn', 'Failed to persist Klondike game state', error)
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [currentGameEntryIdRef, state, storageHydrationComplete])

  return storageHydrationComplete
}




