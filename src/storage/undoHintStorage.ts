// Storage engine: expo-sqlite/kv-store (AsyncStorage-compatible API, backed by SQLite).
import Storage from 'expo-sqlite/kv-store'

import { UNDO_HINT_MAX_SHOWINGS } from '../features/klondike/undoHint'
import { devLog } from '../utils/devLogger'

// Key kept at /v1 despite the v2 payload shape change ({hintShown} → {hintsRemaining}):
// v1 never shipped, so there's nothing to migrate — old/invalid rows just fall back to
// defaults via parse validation below.
const UNDO_HINT_STORAGE_KEY = 'soli/undoHint/v1'

export type PersistedUndoHintState = {
  lifetimeUndoTaps: number
  hintsRemaining: number
}

const DEFAULT_STATE: PersistedUndoHintState = {
  lifetimeUndoTaps: 0,
  hintsRemaining: UNDO_HINT_MAX_SHOWINGS,
}

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0

// Exported for pure unit testing without mocking kv-store.
export const parseUndoHintState = (serialized: string | null): PersistedUndoHintState => {
  if (!serialized) {
    return DEFAULT_STATE
  }

  const parsed = JSON.parse(serialized) as Partial<PersistedUndoHintState>
  if (
    !isNonNegativeInteger(parsed.lifetimeUndoTaps) ||
    !isNonNegativeInteger(parsed.hintsRemaining) ||
    parsed.hintsRemaining > UNDO_HINT_MAX_SHOWINGS
  ) {
    return DEFAULT_STATE
  }

  return {
    lifetimeUndoTaps: parsed.lifetimeUndoTaps,
    hintsRemaining: parsed.hintsRemaining,
  }
}

// Sync read is intentional: a tiny single row read once at startup so useUndoHint can
// seed its tracker ref in the initializer — same rationale as loadBoardMetricsSync.
export const loadUndoHintStateSync = (): PersistedUndoHintState => {
  try {
    return parseUndoHintState(Storage.getItemSync(UNDO_HINT_STORAGE_KEY))
  } catch (error) {
    devLog('warn', '[undoHintStorage] Failed to load undo hint state', error)
    return DEFAULT_STATE
  }
}

// Written on every successful undo tap, deliberately without throttling: a single-row
// SQLite upsert at user tap cadence (~5/s worst case) is negligible — gamePersistence
// already writes far bigger blobs per move. Revisit only if profiling ever shows it.
export const saveUndoHintState = async (state: PersistedUndoHintState): Promise<void> => {
  try {
    await Storage.setItem(UNDO_HINT_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    devLog('warn', '[undoHintStorage] Failed to persist undo hint state', error)
  }
}
