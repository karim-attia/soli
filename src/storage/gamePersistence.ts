// Storage engine: expo-sqlite/kv-store (AsyncStorage-compatible API, backed by SQLite).
// Move-log persistence: instead of serializing the full undo `history`/`future`
// snapshot arrays (~3.5 KB per move, hundreds of KB mid-game), we persist the
// base deal identity + the ordered move log + ONE final snapshot. Load replays the log
// through the pure reducer to rebuild the identical in-memory state including the full
// undo depth; the final snapshot verifies the replay and doubles as a fallback board.
// Stays on the ASYNC API so the (now small) debounced write remains off the JS thread.
// See docs/product/move-log-persistence/move-log-persistence-and-resumable-history.md.
import Storage from 'expo-sqlite/kv-store'

import {
  FOUNDATION_SUIT_ORDER,
  MOVE_LOG_VERSION,
  cloneSnapshot,
  createGameStateFromExactId,
  initialAutoUpFromMoveLog,
  replayMoveLog,
  snapshotFromState,
  type Card,
  type GameSnapshot,
  type GameState,
  type MoveLogEntry,
} from '../solitaire/klondike'
import { DEMO_EXACT_DEAL_ID } from '../solitaire/demoDeal'
import { normalizeDrawCount, type DrawCount } from '../solitaire/drawCount'
import { devLog } from '../utils/devLogger'

// Requirement PBI-13: persist in-progress Klondike sessions locally.
// Pre-release clean slate (2026-07-06, per Karim): nothing shipped, so the key and
// version were reset to a plain v1 — earlier payload formats only ever existed on the
// two test devices, whose data is throwaway.
export const KLONDIKE_STORAGE_KEY = 'soli/klondike/v1'
export const PERSISTENCE_VERSION = 1

export type PersistedGameErrorReason = 'invalid' | 'unsupported-version'

export class PersistedGameError extends Error {
  readonly reason: PersistedGameErrorReason

  constructor(
    reason: PersistedGameErrorReason,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message)
    this.name = 'PersistedGameError'
    this.reason = reason
    if (options?.cause) {
      ;(this as { cause?: unknown }).cause = options.cause
    }
  }
}

export type PersistedGameStatus = 'in-progress' | 'won'

export type LoadedGameState = {
  status: PersistedGameStatus
  state: GameState
  savedAt: string
  // Task 10-7: Link persisted game session to its history entry.
  historyEntryId: string | null
}

interface PersistedGamePayload {
  version: number
  savedAt: string
  status: PersistedGameStatus
  // Task 10-7: Link persisted game session to its history entry.
  historyEntryId: string | null
  moveLogVersion: number
  deal: {
    exactId: string
    drawCount: DrawCount
    revealInitialWaste: boolean
  }
  moveLog: MoveLogEntry[]
  finalSnapshot: GameSnapshot
  autoUpEnabled: boolean
  // The clock is one live monotonic value persisted once at top level (snapshots are
  // boards, not clocks — GameSnapshot carries no timer fields). timerState/
  // timerStartedAt are deliberately not persisted; load derives them (see below).
  elapsedMs: number
}

const deriveStatus = (state: GameState): PersistedGameStatus =>
  state.hasWon ? 'won' : 'in-progress'

const serializeState = (
  state: GameState,
  historyEntryId: string | null
): PersistedGamePayload => ({
  version: PERSISTENCE_VERSION,
  savedAt: new Date().toISOString(),
  status: deriveStatus(state),
  historyEntryId,
  moveLogVersion: MOVE_LOG_VERSION,
  deal: {
    exactId: state.exactId,
    drawCount: state.drawCount,
    revealInitialWaste: state.initialWasteRevealed,
  },
  // Demo board: custom 42-card layout, NOT reconstructible from its exactId — persist
  // an empty log so load takes the snapshot-fallback path by design (empty undo
  // history after a demo restart is acceptable, dev-only).
  moveLog: state.exactId === DEMO_EXACT_DEAL_ID ? [] : state.moveLog,
  finalSnapshot: snapshotFromState(state),
  autoUpEnabled: state.autoUpEnabled,
  elapsedMs: state.elapsedMs,
})

const isPersistedGamePayload = (value: unknown): value is PersistedGamePayload => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Partial<PersistedGamePayload>
  if (typeof payload.savedAt !== 'string') {
    return false
  }
  if (
    payload.status !== undefined &&
    payload.status !== 'in-progress' &&
    payload.status !== 'won'
  ) {
    return false
  }
  if (
    payload.historyEntryId !== undefined &&
    payload.historyEntryId !== null &&
    typeof payload.historyEntryId !== 'string'
  ) {
    return false
  }
  if (typeof payload.moveLogVersion !== 'number') {
    return false
  }
  if (!Array.isArray(payload.moveLog)) {
    return false
  }
  if (typeof payload.elapsedMs !== 'number') {
    return false
  }

  const deal = payload.deal as Partial<PersistedGamePayload['deal']> | undefined
  if (
    !deal ||
    typeof deal !== 'object' ||
    typeof deal.exactId !== 'string' ||
    typeof deal.revealInitialWaste !== 'boolean'
  ) {
    return false
  }

  const snapshot = payload.finalSnapshot as Partial<GameSnapshot> | undefined
  return Boolean(
    snapshot &&
    typeof snapshot === 'object' &&
    Array.isArray(snapshot.stock) &&
    Array.isArray(snapshot.waste) &&
    snapshot.foundations !== undefined &&
    Array.isArray(snapshot.tableau) &&
    typeof snapshot.exactId === 'string' &&
    typeof snapshot.deckChecksum === 'string'
  )
}

// H3: a history-less `saveGameState(state)` variant used to exist but was
// production-dead — the app always saves with history linkage (pass null when
// there is no linked entry).
export const saveGameStateWithHistory = async (
  state: GameState,
  historyEntryId: string | null
): Promise<void> => {
  const payload = serializeState(state, historyEntryId)
  const serialized = JSON.stringify(payload)
  await Storage.setItem(KLONDIKE_STORAGE_KEY, serialized)
}

// Cheap structural signature used to verify the replayed board against the stored
// final snapshot. Card `id`s are deliberately ignored: they carry a per-process
// deck-instance suffix (animation identity), so the replaying process produces
// different ids than the saving one by design.
const pileSignature = (cards: Card[]): string =>
  cards.map((card) => `${card.suit}${card.rank}${card.faceUp ? 'u' : 'd'}`).join('.')

export const boardSignature = (
  board: Pick<GameSnapshot, 'stock' | 'waste' | 'foundations' | 'tableau' | 'moveCount'>
): string =>
  [
    pileSignature(board.stock),
    pileSignature(board.waste),
    FOUNDATION_SUIT_ORDER.map((suit) => pileSignature(board.foundations[suit])).join('|'),
    board.tableau.map(pileSignature).join('|'),
    String(board.moveCount),
  ].join('#')

// Rebuilds the live GameState (with full undo depth) by replaying the stored move
// log from the reconstructed base deal. Returns null when the snapshot fallback
// should be used instead; the game itself is never lost either way.
const buildReplayedState = (
  payload: PersistedGamePayload,
  drawCount: DrawCount
): GameState | null => {
  // Reducer behavior changed since this log was written — replaying under new rules
  // would silently diverge, so take the snapshot fallback.
  if (payload.moveLogVersion !== MOVE_LOG_VERSION) {
    devLog('warn', '[Game] Move-log version mismatch; hydrating final snapshot.', {
      stored: payload.moveLogVersion,
      current: MOVE_LOG_VERSION,
    })
    return null
  }
  // Demo board: fallback by design (see serializeState).
  if (payload.deal.exactId === DEMO_EXACT_DEAL_ID) {
    return null
  }

  try {
    const base = createGameStateFromExactId(payload.deal.exactId, drawCount, {
      revealInitialWaste: payload.deal.revealInitialWaste,
      autoUpEnabled: initialAutoUpFromMoveLog(payload.moveLog, payload.autoUpEnabled),
    })
    const replayed = replayMoveLog(base, payload.moveLog)
    if (boardSignature(replayed) !== boardSignature(payload.finalSnapshot)) {
      devLog(
        'warn',
        '[Game] Replayed board mismatches stored snapshot; hydrating final snapshot.'
      )
      return null
    }
    return replayed
  } catch (error) {
    devLog('warn', '[Game] Move-log replay failed; hydrating final snapshot.', error)
    return null
  }
}

export const loadGameState = async (): Promise<LoadedGameState | null> => {
  const serialized = await Storage.getItem(KLONDIKE_STORAGE_KEY)
  if (!serialized) {
    return null
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(serialized)
  } catch (error) {
    throw new PersistedGameError('invalid', 'Saved game payload is not valid JSON.', {
      cause: error,
    })
  }

  const version = (parsed as Partial<PersistedGamePayload> | null)?.version
  if (typeof version !== 'number' || version !== PERSISTENCE_VERSION) {
    throw new PersistedGameError(
      'unsupported-version',
      'Saved game payload version is unsupported.'
    )
  }

  if (!isPersistedGamePayload(parsed)) {
    throw new PersistedGameError(
      'invalid',
      'Saved game payload is missing required fields.'
    )
  }

  const drawCount = normalizeDrawCount(parsed.deal.drawCount)
  const finalSnapshot = parsed.finalSnapshot
  const autoUpEnabled =
    typeof parsed.autoUpEnabled === 'boolean' ? parsed.autoUpEnabled : true

  const replayed = buildReplayedState(parsed, drawCount)

  // All cards in the hydrated state must come from ONE source. The replayed state's
  // card ids are internally consistent across board + history + future, which keeps
  // undo animations glitch-free (cards animate by id). Never mix stored-snapshot
  // cards with replayed history — that would remount every animated card on the
  // first undo. On fallback the snapshot is the single source, with empty undo arrays.
  const hydrated: GameState = replayed
    ? { ...replayed, autoUpEnabled }
    : {
        ...cloneSnapshot(finalSnapshot),
        history: [],
        future: [],
        selected: null,
        autoUpEnabled,
        // The dropped log no longer replays from the base deal, so future saves of
        // this session keep taking the snapshot path (game preserved, undo depth lost).
        moveLog: [],
        initialWasteRevealed: parsed.deal.revealInitialWaste,
        // Placeholder clock; the real values are derived below.
        elapsedMs: 0,
        timerState: 'idle',
        timerStartedAt: null,
      }

  // The clock is restored from the top-level elapsedMs. timerState is derived, not
  // persisted: a game with progress resumes paused (useKlondikeTimer restarts it on
  // focus/next move, and never for a won game), a pristine game is idle. The
  // wall-clock anchor timerStartedAt is transient and always null after load.
  const elapsedMs =
    Number.isFinite(parsed.elapsedMs) && parsed.elapsedMs >= 0 ? parsed.elapsedMs : 0

  const state: GameState = {
    ...hydrated,
    selected: null,
    elapsedMs,
    timerState: hydrated.moveCount > 0 || elapsedMs > 0 ? 'paused' : 'idle',
    timerStartedAt: null,
  }

  const status: PersistedGameStatus =
    parsed.status === 'won' || state.hasWon ? 'won' : 'in-progress'

  return {
    status,
    state,
    savedAt: parsed.savedAt,
    historyEntryId:
      typeof parsed.historyEntryId === 'string' ? parsed.historyEntryId : null,
  }
}

export const clearGameState = async (): Promise<void> => {
  await Storage.removeItem(KLONDIKE_STORAGE_KEY)
}
