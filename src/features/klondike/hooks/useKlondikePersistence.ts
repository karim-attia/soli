import { useEffect, useRef, useState } from 'react'

import { devLog } from '../../../utils/devLogger'
import {
  PersistedGameError,
  clearGameState,
  loadGameState,
  saveGameStateWithHistory,
} from '../../../storage/gamePersistence'
import {
  createInitialState,
  type GameAction,
  type GameState,
} from '../../../solitaire/klondike'
import type { DrawCount } from '../../../solitaire/drawCount'
import { useHistory } from '../../../state/history'
import { moveLogForGameRecord } from './useKlondikeHistoryEntry'

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
    previous.drawCount !== next.drawCount ||
    // Covers SET_AUTO_UP_ENABLED, the only log-appending action that changes none of
    // the board fields above (the log itself must reach the persisted payload).
    previous.moveLog !== next.moveLog
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
  // Review fix R6 (2026-07-06): both callbacks are referentially stable (their
  // useCallback deps bottom out in []), so using them in the one-shot load effect
  // below keeps it single-run.
  const { getActiveEntry, updateEntry } = useHistory()
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

    // A4: the reducer must stay pure (StrictMode double-invokes reducers in dev),
    // so fresh games are always built outside the reducer and dispatched via
    // HYDRATE_STATE — the same pattern as dealNewGame in useKlondikeGame.
    const dispatchFreshGame = () => {
      dispatch({
        type: 'HYDRATE_STATE',
        state: createInitialState(preferredDrawCountRef.current),
        autoUpEnabled: autoUpEnabledRef.current,
      })
    }

    ;(async () => {
      try {
        const persisted = await loadGameState()
        if (isCancelled) {
          return
        }

        if (!persisted) {
          // No saved game: replace the reducer's placeholder deal with one that uses
          // the user's preferred draw-count rule.
          dispatchFreshGame()
          return
        }

        if (persisted.status === 'won') {
          // Review fix R6 (2026-07-06): if the app died after the won payload was
          // saved but before the async history update committed, the linked row is
          // still 'active' without a result — and clearing the session below would
          // orphan it forever. Finalize it from the payload first. getActiveEntry
          // resolves after queued history writes, so when the normal win recording
          // DID commit the row is already 'solved' (not active) and this is a no-op.
          if (persisted.historyEntryId) {
            try {
              const activeEntry = await getActiveEntry()
              if (!isCancelled && activeEntry?.id === persisted.historyEntryId) {
                devLog(
                  'info',
                  '[Game] Repairing history row for a won session whose result never committed.'
                )
                updateEntry(activeEntry.id, {
                  solved: true,
                  status: 'solved',
                  moves: persisted.state.moveCount,
                  // The win handler stops the clock, so the saved elapsedMs is the
                  // final duration; savedAt approximates the win time.
                  durationMs: persisted.state.elapsedMs,
                  finishedAt: persisted.savedAt,
                  moveLog: moveLogForGameRecord(persisted.state),
                })
              }
            } catch (repairError) {
              devLog('warn', '[Game] Failed repairing won-game history row', repairError)
            }
          }
          if (isCancelled) {
            return
          }
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
          dispatchFreshGame()
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
        dispatchFreshGame()
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
  }, [currentGameEntryIdRef, dispatch, getActiveEntry, previousHasWonRef, updateEntry])

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
