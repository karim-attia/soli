import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject } from 'react'

import { MOVE_LOG_VERSION } from '../../../solitaire/klondike'
import type { GameAction, GameState } from '../../../solitaire/klondike'
import type { HistoryEntryMoveLog } from '../../../storage/historyRepository.types'
import { computeElapsedWithReference } from '../../../utils/time'
import { devLog } from '../../../utils/devLogger'
import {
  createHistoryPreviewFromState,
  createStartedHistoryEntryInputFromState,
  formatDealDisplayName,
  useHistory,
  type CreateStartedHistoryEntryInputOptions,
} from '../../../state/history'

// Review fix R4 (2026-07-06): a session hydrated via the snapshot fallback carries
// moveLog: [] while moveCount > 0 — its play line was truncated, not "no moves made".
// Recording that as an empty-but-valid log would let a future resume-from-history
// feature misread it as the initial deal. Store SQL NULL instead: "no replayable
// log for this game". Exported for direct unit testing (the hook itself needs a
// heavy harness).
export const moveLogForGameRecord = (
  state: Pick<GameState, 'moveLog' | 'moveCount'>
): HistoryEntryMoveLog | null =>
  state.moveLog.length === 0 && state.moveCount > 0
    ? null
    : { version: MOVE_LOG_VERSION, entries: state.moveLog }

// Scores written at game end (solved AND incomplete — a Vegas loss is a meaningful
// number). Standard is always honest (same point table, at most stricter rules), so
// every game records it. Vegas is recorded ONLY for Vegas-rules games: an unlimited
// game has no honest Vegas number (the player used passes a casino would not sell),
// and `vegas_score IS NOT NULL` doubles as "played under Vegas rules" — no schema
// change (plan § Phase 2, P-F). EVERY Vegas deal is charged, zero-move abandons
// included (user decision round 2 / prompt 5: "in the casino it costs you" —
// exempting them would let players re-deal until aces show). The earlier
// zero-move exemption (PySolFC-style) was deliberately reversed; the row then
// shows "Vegas −$52" and the cumulative total counts it.
// Exported for unit tests.
export const scoresForGameRecord = (
  state: Pick<GameState, 'score' | 'vegasRules'>
): { standardScore: number; vegasScore: number | undefined } => ({
  standardScore: state.score.standard,
  vegasScore: state.vegasRules ? state.score.vegas : undefined,
})

type UseKlondikeHistoryEntryParams = {
  state: GameState
  stateRef: MutableRefObject<GameState>
  // A1 extraction: this ref stays created in useKlondikeGame (not here) because
  // useKlondikePersistence restores the persisted historyEntryId into it during
  // saved-game hydration and saves from it on every debounced write.
  currentGameEntryIdRef: MutableRefObject<string | null>
  previousHasWonRef: MutableRefObject<boolean>
  // Demo playback replaces the live game; while it runs, no history rows may be
  // created or completed for the replay fixtures.
  demoPlaybackActiveRef: MutableRefObject<boolean>
  storageHydrated: boolean
  animationsEnabled: boolean
  celebrationAnimationsEnabled: boolean
  dispatch: Dispatch<GameAction>
}

export type UseKlondikeHistoryEntryResult = {
  recordStartedGame: (
    nextState: GameState,
    options?: CreateStartedHistoryEntryInputOptions
  ) => string
  recordCurrentGameResult: (options?: { solved?: boolean }) => void
  clearCurrentGameEntryLink: () => void
  flushPendingSolvedResultAfterHandoff: () => void
  // History row of the game on the board (P2-C cumulative total). Unlike
  // currentGameEntryIdRef (nulled the moment a result is recorded, so the next
  // deal creates a fresh row), this stays set across the win → Deal Again window
  // so the HUD can tell "this game's row is already settled" from the in-memory
  // entries. null for fixtures that never got a row (demo playback).
  // Invariant (G8): whichever row RECEIVES the board game's result becomes
  // boardEntryId — set by the write itself (recordCurrentGameResult), not only by
  // the hydration/deal effects. A result can be written before the hydration
  // effect ever links the row (relaunch + auto-complete win), and a row that is
  // scored but unlinked would be counted twice (settled sum + live tally).
  boardEntryId: string | null
}

// A1 extraction: owns the active history-entry lifecycle for the Klondike screen —
// active-row recovery after hydration, started-row creation, solved/incomplete
// recording (including the celebration-delayed solved write), and the display-name
// cache used by fallback recording. Kept separate from useKlondikeGame so changes to
// new-game/celebration/demo flows can't silently duplicate or orphan history rows.
export const useKlondikeHistoryEntry = ({
  state,
  stateRef,
  currentGameEntryIdRef,
  previousHasWonRef,
  demoPlaybackActiveRef,
  storageHydrated,
  animationsEnabled,
  celebrationAnimationsEnabled,
  dispatch,
}: UseKlondikeHistoryEntryParams): UseKlondikeHistoryEntryResult => {
  const {
    entries: historyEntries,
    hydrated: historyHydrated,
    recordResult,
    updateEntry,
    getActiveEntry,
  } = useHistory()

  // Display name is cached in a ref so the fallback recording path never depends on
  // render timing. (A write-only currentStartingPreviewRef used to live next to this;
  // it was removed in the A1 extraction because nothing ever read it — the fallback
  // path recomputes the preview from history[0] instead.)
  const currentDisplayNameRef = useRef(formatDealDisplayName(state.exactId))
  const [boardEntryId, setBoardEntryId] = useState<string | null>(null)
  const pendingSolvedResultRef = useRef(false)
  const pendingSolvedResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearPendingSolvedResultTimer = useCallback(() => {
    if (pendingSolvedResultTimeoutRef.current) {
      clearTimeout(pendingSolvedResultTimeoutRef.current)
      pendingSolvedResultTimeoutRef.current = null
    }
  }, [])

  // Creates the 'active' history row for a freshly dealt game and links it to the
  // current session. Replaces the previously duplicated entry-creation code in both
  // dealNewGame branches (solvable + normal).
  const recordStartedGame = useCallback(
    (nextState: GameState, options?: CreateStartedHistoryEntryInputOptions): string => {
      const displayName = options?.displayName ?? formatDealDisplayName(nextState.exactId)
      currentDisplayNameRef.current = displayName
      const entryId = recordResult(
        createStartedHistoryEntryInputFromState(nextState, { ...options, displayName })
      )
      currentGameEntryIdRef.current = entryId
      setBoardEntryId(entryId)
      return entryId
    },
    [currentGameEntryIdRef, recordResult]
  )

  const currentExactId = state.exactId
  const currentDrawCount = state.drawCount
  const currentHasWon = state.hasWon

  // Task 10-7: After hydration, ensure the current game has one active history row.
  // Must wait for BOTH history and saved-game hydration, otherwise a row would be
  // created before persistence restores the existing linkage (duplicate-row risk).
  useEffect(() => {
    if (!historyHydrated || !storageHydrated) {
      return
    }
    if (demoPlaybackActiveRef.current) {
      return
    }
    if (currentHasWon) {
      return
    }

    const entryId = currentGameEntryIdRef.current
    if (entryId) {
      const linked = historyEntries.find((entry) => entry.id === entryId)
      if (!linked) {
        return
      }
      if (linked.exactId !== currentExactId || linked.drawCount !== currentDrawCount) {
        currentGameEntryIdRef.current = null
      } else {
        if (linked.status !== 'active') {
          updateEntry(entryId, { status: 'active', solved: false, finishedAt: null })
        }
        setBoardEntryId(entryId)
        return
      }
    }

    const matchingActive = historyEntries.find(
      (entry) =>
        entry.status === 'active' &&
        entry.exactId === currentExactId &&
        entry.drawCount === currentDrawCount
    )
    if (matchingActive) {
      currentGameEntryIdRef.current = matchingActive.id
      setBoardEntryId(matchingActive.id)
      return
    }

    // Recovered mid-game states must keep the *start* board as preview, so prefer the
    // oldest undo snapshot over the current board.
    const currentState = stateRef.current
    recordStartedGame(currentState, {
      preview: createHistoryPreviewFromState(currentState.history[0] ?? currentState),
    })
  }, [
    currentDrawCount,
    currentGameEntryIdRef,
    currentHasWon,
    currentExactId,
    demoPlaybackActiveRef,
    historyEntries,
    historyHydrated,
    recordStartedGame,
    stateRef,
    storageHydrated,
    updateEntry,
  ])

  // Task 10-6: Updates or records game result in history
  const recordCurrentGameResult = useCallback(
    (options?: { solved?: boolean }) => {
      if (demoPlaybackActiveRef.current) {
        return
      }

      const currentState = stateRef.current
      const solved = options?.solved ?? currentState.hasWon
      const status = solved ? 'solved' : 'incomplete'
      const elapsedForRecord = computeElapsedWithReference(
        currentState.elapsedMs,
        currentState.timerState,
        currentState.timerStartedAt,
        Date.now()
      )

      // Task 10-6: finishedAt only set when solved, null for incomplete
      const finishedAt = solved ? new Date().toISOString() : null
      const resultFields = {
        solved,
        status,
        moves: currentState.moveCount,
        durationMs: elapsedForRecord,
        // Scoring: see scoresForGameRecord — the Scoring SETTING never decides what
        // is recorded (it only picks what the history row shows); the game's own
        // rules do.
        ...scoresForGameRecord(currentState),
        finishedAt,
        // Move-log persistence: game boundaries are the only history writes that
        // carry the log (kv payload covers the live session). Demo playback never
        // reaches this line (early return above). Null when the session's log was
        // truncated by a snapshot-fallback load (see moveLogForGameRecord).
        moveLog: moveLogForGameRecord(currentState),
      } as const

      // If we have a tracked entry ID, update it; otherwise find or create one.
      // Every branch below also publishes the written row as boardEntryId (G8
      // invariant, see the result type): the HUD's "already settled" check must
      // follow the WRITE, whatever the effect ordering around it.
      if (currentGameEntryIdRef.current) {
        const entryId = currentGameEntryIdRef.current
        updateEntry(entryId, {
          ...resultFields,
          // Task 10-7: Never overwrite preview on completion; it must remain the start snapshot.
        })
        currentGameEntryIdRef.current = null
        setBoardEntryId(entryId)
        return
      }

      // No tracked entry - only record if there's been meaningful play. A
      // Vegas-rules deal is always recorded: the deck was bought (−$52) even at
      // zero moves (round 2, see scoresForGameRecord).
      if (!solved && currentState.moveCount === 0 && !currentState.vegasRules) {
        return
      }

      // Task 10-7: If we lost the entry-id linkage (e.g. restart), update the matching
      // active entry instead of creating a duplicate solved/incomplete row.
      const matchingActive = historyEntries.find(
        (entry) =>
          entry.status === 'active' &&
          entry.exactId === currentState.exactId &&
          entry.drawCount === currentState.drawCount
      )
      if (matchingActive) {
        updateEntry(matchingActive.id, resultFields)
        setBoardEntryId(matchingActive.id)
        return
      }

      // R3: the in-memory entries only hold loaded pages (first page = 50 rows), so an
      // active row that paged out would be missed above and duplicated below. Ask the
      // repository for the single possible active row (the partial unique index
      // `history_entries_one_active` guarantees at most one) before creating a new row.
      // The sync in-memory match above stays the fast path so common flows (demo
      // launcher's record → clear link → hydrate sequence, win recording) keep their
      // original synchronous ordering; this rare branch is async, but every recorded
      // value was snapshotted synchronously above, so a late completion only decides
      // *which* row is written, never *what* is written.
      const displayName = currentDisplayNameRef.current
      const recordCalledAt = new Date().toISOString()
      // Late completion: the board may already show the NEXT game (its row linked
      // synchronously by recordStartedGame) — then the written row is history, not
      // the board's, and boardEntryId must stay on the new game.
      const publishBoardRow = (entryId: string) => {
        if (currentGameEntryIdRef.current === null) {
          setBoardEntryId(entryId)
        }
      }
      void (async () => {
        try {
          const activeEntry = await getActiveEntry()
          if (
            activeEntry &&
            activeEntry.exactId === currentState.exactId &&
            activeEntry.drawCount === currentState.drawCount &&
            // The query resolves after queued writes, so a NEW deal's active row may
            // already exist; if it coincidentally replays the same deal, it must not
            // be completed on behalf of the old game. Rows started after this call
            // belong to the next game (ISO timestamps compare lexicographically).
            activeEntry.startedAt <= recordCalledAt
          ) {
            updateEntry(activeEntry.id, resultFields)
            publishBoardRow(activeEntry.id)
            return
          }
        } catch (error) {
          devLog(
            'warn',
            '[history] Active-entry lookup failed; recording a new row',
            error
          )
        }

        publishBoardRow(
          recordResult({
            exactId: currentState.exactId,
            deckChecksum: currentState.deckChecksum,
            drawCount: currentState.drawCount,
            startedAt: new Date().toISOString(), // Best approximation when no tracked entry
            // Task 10-7: Prefer the game start snapshot for history preview (sheet shows start state).
            preview: createHistoryPreviewFromState(currentState.history[0] ?? currentState),
            displayName,
            ...resultFields,
          })
        )
      })()
    },
    [
      currentGameEntryIdRef,
      demoPlaybackActiveRef,
      getActiveEntry,
      historyEntries,
      recordResult,
      stateRef,
      updateEntry,
    ]
  )

  const flushPendingSolvedResultAfterHandoff = useCallback(() => {
    if (!pendingSolvedResultRef.current) {
      return
    }
    pendingSolvedResultRef.current = false
    clearPendingSolvedResultTimer()
    // Task 28-2: Let the last winning-card settle/handoff breathe before history persistence
    // runs, otherwise the exact `hasWon` frame does extra JS work that earlier moves avoid.
    pendingSolvedResultTimeoutRef.current = setTimeout(() => {
      pendingSolvedResultTimeoutRef.current = null
      if (!stateRef.current.hasWon) {
        return
      }
      recordCurrentGameResult({ solved: true })
    }, 0)
  }, [clearPendingSolvedResultTimer, recordCurrentGameResult, stateRef])

  useEffect(() => {
    return () => {
      clearPendingSolvedResultTimer()
    }
  }, [clearPendingSolvedResultTimer])

  // Narrow API for the demo launcher so history-link mutation stays inside this hook
  // instead of the launcher writing to currentGameEntryIdRef directly.
  const clearCurrentGameEntryLink = useCallback(() => {
    currentGameEntryIdRef.current = null
  }, [currentGameEntryIdRef])

  // Refreshes the cached display name whenever a new game begins (covers hydrated
  // saved games and demo fixtures, which don't go through recordStartedGame).
  useEffect(() => {
    if (state.moveCount === 0) {
      currentDisplayNameRef.current = formatDealDisplayName(state.exactId)
    }
  }, [state.exactId, state.moveCount])

  // Checks if the game was freshly won to record the result.
  useEffect(() => {
    const wasWon = previousHasWonRef.current
    const isWon = state.hasWon
    const delaySolvedResultRecording = animationsEnabled && celebrationAnimationsEnabled

    if (!wasWon && isWon) {
      if (state.timerState === 'running') {
        dispatch({ type: 'TIMER_STOP', timestamp: Date.now() })
      }
      devLog(
        'info',
        `[Game] hasWon set true (moves=${state.moveCount}, winCelebrations=${state.winCelebrations}).`
      )
      if (demoPlaybackActiveRef.current) {
        pendingSolvedResultRef.current = false
        clearPendingSolvedResultTimer()
      } else if (delaySolvedResultRecording) {
        // Solved recording waits for the win-frame handoff (flushPendingSolvedResult-
        // AfterHandoff) so the celebration start stays jank-free (Task 28-2).
        pendingSolvedResultRef.current = true
      } else {
        pendingSolvedResultRef.current = false
        clearPendingSolvedResultTimer()
        recordCurrentGameResult({ solved: true })
      }
    }

    if (wasWon && !isWon) {
      pendingSolvedResultRef.current = false
      clearPendingSolvedResultTimer()
    }

    previousHasWonRef.current = isWon
  }, [
    animationsEnabled,
    celebrationAnimationsEnabled,
    clearPendingSolvedResultTimer,
    demoPlaybackActiveRef,
    dispatch,
    previousHasWonRef,
    recordCurrentGameResult,
    state.hasWon,
    state.moveCount,
    state.timerState,
    state.winCelebrations,
  ])

  return {
    recordStartedGame,
    recordCurrentGameResult,
    clearCurrentGameEntryLink,
    flushPendingSolvedResultAfterHandoff,
    boardEntryId,
  }
}
