import { useEffect, useState } from 'react'

import { devLog } from '../../../utils/devLogger'
import {
  PersistedGameError,
  clearGameState,
  loadGameState,
  saveGameState,
} from '../../../storage/gamePersistence'
import type { GameAction, GameState } from '../../../solitaire/klondike'

type UseKlondikePersistenceParams = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  resetCardFlights: () => void
  previousHasWonRef: React.MutableRefObject<boolean>
}

export const useKlondikePersistence = ({
  state,
  dispatch,
  resetCardFlights,
  previousHasWonRef,
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
  }, [dispatch, previousHasWonRef, resetCardFlights])

  useEffect(() => {
    if (!storageHydrationComplete) {
      return
    }

    let isCancelled = false

    ;(async () => {
      try {
        await saveGameState(state)
      } catch (error) {
        if (!isCancelled) {
          devLog('warn', 'Failed to persist Klondike game state', error)
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [state, storageHydrationComplete])

  return storageHydrationComplete
}




