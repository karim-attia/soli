import { useEffect, useRef, useState } from 'react'

import { devLog } from '../../../utils/devLogger'
import {
  PersistedGameError,
  clearGameState,
  loadGameState,
  saveGameStateWithHistory,
} from '../../../storage/gamePersistence'
import type { GameAction, GameState } from '../../../solitaire/klondike'
import type { DrawCount } from '../../../solitaire/drawCount'

type UseKlondikePersistenceParams = {
  state: GameState
  dispatch: React.Dispatch<GameAction>
  previousHasWonRef: React.MutableRefObject<boolean>
  // Task 10-7: Persist linkage to the active history entry across restarts.
  currentGameEntryIdRef: React.MutableRefObject<string | null>
  autoUpEnabled: boolean
  preferredDrawCount: DrawCount
}

const PERSISTENCE_WRITE_DEBOUNCE_MS = 180

const didGameShapeChange = (previous: GameState | null, next: GameState): boolean => {
  if (!previous) {
    return true
  }

  return (
    previous.stock !== next.stock ||
    previous.waste !== next.waste ||
    previous.foundations !== next.foundations ||
    previous.tableau !== next.tableau ||
    previous.history !== next.history ||
    previous.future !== next.future ||
    previous.selected !== next.selected ||
    previous.moveCount !== next.moveCount ||
    previous.autoCompleteRuns !== next.autoCompleteRuns ||
    previous.autoQueue !== next.autoQueue ||
    previous.isAutoCompleting !== next.isAutoCompleting ||
    previous.hasWon !== next.hasWon ||
    previous.winCelebrations !== next.winCelebrations ||
    // Exact ID is both the history key and replay recipe in phase 1.
    previous.exactId !== next.exactId ||
    previous.deckChecksum !== next.deckChecksum ||
    previous.drawCount !== next.drawCount
  )
}

export const useKlondikePersistence = ({
  state,
  dispatch,
  previousHasWonRef,
  currentGameEntryIdRef,
  autoUpEnabled,
  preferredDrawCount,
}: UseKlondikePersistenceParams) => {
  const [storageHydrationComplete, setStorageHydrationComplete] = useState(false)
  const lastQueuedStateRef = useRef<GameState | null>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const autoUpEnabledRef = useRef(autoUpEnabled)
  autoUpEnabledRef.current = autoUpEnabled
  const preferredDrawCountRef = useRef(preferredDrawCount)
  preferredDrawCountRef.current = preferredDrawCount

  // Settings hydrate synchronously (expo-sqlite/kv-store), so the preferred draw count
  // is already correct on mount and this effect can load the saved game right away.
  useEffect(() => {
    let isCancelled = false

    ;(async () => {
      try {
        const persisted = await loadGameState()
        if (isCancelled) {
          return
        }

        if (!persisted) {
          // No saved game: replace the reducer's placeholder deal with one that uses
          // the user's preferred draw-count rule.
          dispatch({ type: 'NEW_GAME', drawCount: preferredDrawCountRef.current })
          return
        }

        if (persisted.status === 'won') {
          devLog(
            'info',
            '[Game] Cleared completed session on startup; starting new deal.'
          )
          try {
            await clearGameState()
          } catch (clearError) {
            devLog('warn', 'Failed clearing completed saved game state', clearError)
          }
          previousHasWonRef.current = false
          dispatch({ type: 'NEW_GAME', drawCount: preferredDrawCountRef.current })
          return
        }

        devLog('info', '[Game] Hydrating saved in-progress session.', {
          savedAt: persisted.savedAt,
          exactId: persisted.state.exactId,
        })
        previousHasWonRef.current = persisted.state.hasWon
        // Task 10-7: Restore history linkage so completion updates the same entry.
        currentGameEntryIdRef.current = persisted.historyEntryId
        dispatch({
          type: 'HYDRATE_STATE',
          state: persisted.state,
          autoUpEnabled: autoUpEnabledRef.current,
        })
      } catch (error) {
        if (isCancelled) {
          return
        }

        let message = 'Saved game was corrupted and has been cleared.'
        if (
          error instanceof PersistedGameError &&
          error.reason === 'unsupported-version'
        ) {
          message = 'Saved game came from an older version and has been cleared.'
        }

        try {
          await clearGameState()
        } catch (clearError) {
          devLog('warn', 'Failed clearing invalid saved game state', clearError)
        }

        previousHasWonRef.current = false
        dispatch({ type: 'NEW_GAME', drawCount: preferredDrawCountRef.current })
        devLog('warn', '[Game] Game reset', { message })
      } finally {
        if (!isCancelled) {
          setStorageHydrationComplete(true)
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [currentGameEntryIdRef, dispatch, previousHasWonRef])

  useEffect(() => {
    if (!storageHydrationComplete) {
      return
    }

    const previousQueuedState = lastQueuedStateRef.current
    const gameShapeChanged = didGameShapeChange(previousQueuedState, state)
    const timerBoundaryChanged =
      !previousQueuedState ||
      previousQueuedState.timerState !== state.timerState ||
      previousQueuedState.timerStartedAt !== state.timerStartedAt

    // We intentionally skip writes for pure TIMER_TICK updates while the timer is
    // already running. Writing every tick steals JS time from animation-heavy play,
    // and saving on real board changes / timer boundaries still preserves the session well.
    if (!gameShapeChanged && state.timerState === 'running' && !timerBoundaryChanged) {
      return
    }

    lastQueuedStateRef.current = state

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null

      void saveGameStateWithHistory(state, currentGameEntryIdRef.current).catch(
        (error) => {
          devLog('warn', 'Failed to persist Klondike game state', error)
        }
      )
    }, PERSISTENCE_WRITE_DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [currentGameEntryIdRef, state, storageHydrationComplete])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
    }
  }, [])

  return storageHydrationComplete
}
