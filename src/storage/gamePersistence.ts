// Storage engine: expo-sqlite/kv-store (AsyncStorage-compatible API, backed by SQLite).
// This file must stay on the ASYNC API: the persisted blob grows ~3.5 KB per move
// (undo-history snapshots) and reaches hundreds of KB mid-game. A sync write of that
// size would block the JS thread during animation-heavy play; the async API writes
// off-thread. See docs/product/expo-sqlite-kv-store-migration/asyncstorage-to-expo-sqlite-kv-store.md.
import Storage from 'expo-sqlite/kv-store'

import type { GameSnapshot, GameState, TimerState } from '../solitaire/klondike'
import { normalizeDrawCount, type DrawCount } from '../solitaire/drawCount'

// Requirement PBI-13: persist in-progress Klondike sessions locally.
export const KLONDIKE_STORAGE_KEY = 'soli/klondike/v2'
export const PERSISTENCE_VERSION = 2

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
  status?: PersistedGameStatus
  // Task 10-7: Link persisted game session to its history entry.
  historyEntryId?: string | null
  state: GameState
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
  state: {
    ...state,
    selected: null,
  },
})

const isPersistedGamePayload = (value: unknown): value is PersistedGamePayload => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Partial<PersistedGamePayload>
  if (typeof payload.version !== 'number') {
    return false
  }
  if (typeof payload.savedAt !== 'string') {
    return false
  }

  const state = (payload as PersistedGamePayload).state
  if (!state || typeof state !== 'object') {
    return false
  }

  if (
    'status' in payload &&
    payload.status !== undefined &&
    payload.status !== 'in-progress' &&
    payload.status !== 'won'
  ) {
    return false
  }

  if (
    'historyEntryId' in payload &&
    payload.historyEntryId !== undefined &&
    payload.historyEntryId !== null &&
    typeof payload.historyEntryId !== 'string'
  ) {
    return false
  }

  const candidate = state as Partial<GameState>
  return (
    Array.isArray(candidate.stock) &&
    Array.isArray(candidate.waste) &&
    candidate.foundations !== undefined &&
    Array.isArray(candidate.tableau) &&
    Array.isArray(candidate.history ?? []) &&
    Array.isArray(candidate.future ?? []) &&
    typeof candidate.exactId === 'string' &&
    typeof candidate.deckChecksum === 'string'
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

  if (!isPersistedGamePayload(parsed)) {
    throw new PersistedGameError(
      'invalid',
      'Saved game payload is missing required fields.'
    )
  }

  if (parsed.version !== PERSISTENCE_VERSION) {
    throw new PersistedGameError(
      'unsupported-version',
      'Saved game payload version is unsupported.'
    )
  }

  const parsedState = parsed.state as Partial<GameState> & {
    drawCount?: unknown
    exactId?: unknown
    deckChecksum?: unknown
    elapsedMs?: unknown
    timerState?: unknown
    timerStartedAt?: unknown
  }

  const elapsedMs =
    typeof parsedState.elapsedMs === 'number' &&
    Number.isFinite(parsedState.elapsedMs) &&
    parsedState.elapsedMs >= 0
      ? parsedState.elapsedMs
      : 0
  const drawCount = normalizeDrawCount(parsedState.drawCount)
  const exactId = parsedState.exactId as string
  const deckChecksum = parsedState.deckChecksum as string

  const rawTimerState = isTimerState(parsedState.timerState)
    ? parsedState.timerState
    : 'idle'
  const rawTimerStartedAt =
    typeof parsedState.timerStartedAt === 'number' &&
    Number.isFinite(parsedState.timerStartedAt)
      ? parsedState.timerStartedAt
      : null

  let timerState: TimerState
  let timerStartedAt: number | null
  if (rawTimerState === 'running') {
    timerState = 'paused'
    timerStartedAt = null
  } else {
    timerState = rawTimerState
    timerStartedAt = rawTimerStartedAt
  }

  const historySnapshots = normalizeSnapshots(parsed.state.history, {
    drawCount,
    exactId,
    deckChecksum,
  })
  const futureSnapshots = normalizeSnapshots(
    (parsed.state as { future?: unknown }).future,
    {
      drawCount,
      exactId,
      deckChecksum,
    }
  )

  const sanitizedState: GameState = {
    ...parsed.state,
    elapsedMs,
    timerState,
    timerStartedAt,
    drawCount,
    selected: null,
    history: historySnapshots,
    future: futureSnapshots,
    exactId,
    deckChecksum,
    autoUpEnabled:
      typeof (parsed.state as { autoUpEnabled?: unknown }).autoUpEnabled === 'boolean'
        ? (parsed.state as { autoUpEnabled: boolean }).autoUpEnabled
        : true,
  }

  const status: PersistedGameStatus =
    parsed.status === 'won' || sanitizedState.hasWon ? 'won' : 'in-progress'

  return {
    status,
    state: sanitizedState,
    savedAt: parsed.savedAt,
    historyEntryId:
      typeof (parsed as PersistedGamePayload).historyEntryId === 'string'
        ? ((parsed as PersistedGamePayload).historyEntryId ?? null)
        : null,
  }
}

export const clearGameState = async (): Promise<void> => {
  await Storage.removeItem(KLONDIKE_STORAGE_KEY)
}

const isTimerState = (value: unknown): value is TimerState =>
  value === 'idle' || value === 'running' || value === 'paused'

const normalizeSnapshots = (
  value: unknown,
  fallback: {
    drawCount: DrawCount
    exactId: string
    deckChecksum: string
  }
): GameSnapshot[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((snapshot) => normalizeSnapshot(snapshot, fallback))
    .filter((snapshot): snapshot is GameSnapshot => snapshot !== null)
}

const normalizeSnapshot = (
  value: unknown,
  fallback: {
    drawCount: DrawCount
    exactId: string
    deckChecksum: string
  }
): GameSnapshot | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const snapshot = value as Partial<GameSnapshot>
  if (
    !Array.isArray(snapshot.stock) ||
    !Array.isArray(snapshot.waste) ||
    !snapshot.foundations ||
    !Array.isArray(snapshot.tableau)
  ) {
    return null
  }

  const exactId =
    typeof snapshot.exactId === 'string' ? snapshot.exactId : fallback.exactId
  const deckChecksum =
    typeof snapshot.deckChecksum === 'string'
      ? snapshot.deckChecksum
      : fallback.deckChecksum

  return {
    ...(snapshot as GameSnapshot),
    exactId,
    deckChecksum,
    drawCount: normalizeDrawCount(snapshot.drawCount ?? fallback.drawCount),
  }
}
