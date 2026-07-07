import * as SQLite from 'expo-sqlite'

import { isExactDealSolvableForDrawCount } from '../data/solvableDealsV2'
import { isMoveLogEntry, type MoveLogEntry } from '../solitaire/klondike'
import type { HistoryEntry } from '../state/history'
import {
  HISTORY_PAGE_SIZE,
  type HistoryEntryMoveLog,
  type HistorySummary,
  type SolvableDealHistoryStats,
} from './historyRepository.types'

export { HISTORY_PAGE_SIZE }

export const isHistorySupported = true

const DATABASE_NAME = 'soli-history.db'
// Version 1 is the frozen 1.0 baseline schema. Post-1.0 changes append MIGRATIONS
// steps with toVersion >= 2 — never edit the baseline step again, and NEVER drop
// user data in a migration after 1.0. (Pre-release test-device schemas were cleared
// manually before the freeze, so the baseline can assume a clean slate at version 0.)
const DATABASE_VERSION = 1

// Ordered migration steps; each brings the schema *to* `toVersion` and runs in its
// own exclusive transaction (the runner bumps PRAGMA user_version alongside it).
//
// 1.0 schema-freeze notes (2026-07-07):
// - The `solved` 0/1 column was removed: it always duplicated `status = 'solved'`
//   (every writer set both in lockstep). The JS HistoryEntry.solved boolean is now
//   derived from status at read time.
// - `moves` was renamed to `move_count` so it can't be confused with `moves_json`
//   (the serialized move log).
// - No `(exact_id)` index: no query filters on exact_id (row lookups go by PK; the
//   solvable-stats aggregate scans the whole table by design).
// - STRICT: rejects type-mismatched binds instead of silently coercing them.
//   Verified safe: no writer binds a boolean (the dropped `solved` column was the
//   only candidate) — every bind is a string, number, or null.
// - Paired-null CHECK on moves_json/move_log_version: getHistoryEntryMoveLog reads
//   the pair as both-or-neither, so the DB enforces exactly that.
const MIGRATIONS: ReadonlyArray<{ toVersion: number; sql: string }> = [
  {
    toVersion: 1,
    sql: `
      CREATE TABLE history_entries (
        id TEXT PRIMARY KEY NOT NULL,
        exact_id TEXT NOT NULL,
        deck_checksum TEXT NOT NULL,
        display_name TEXT NOT NULL,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        draw_count INTEGER NOT NULL CHECK (draw_count BETWEEN 1 AND 5),
        move_count INTEGER CHECK (move_count >= 0),
        duration_ms INTEGER CHECK (duration_ms >= 0),
        preview_json TEXT NOT NULL CHECK (json_valid(preview_json)),
        status TEXT NOT NULL CHECK (status IN ('active', 'incomplete', 'solved')),
        moves_json TEXT CHECK (moves_json IS NULL OR json_valid(moves_json)),
        move_log_version INTEGER,
        CHECK ((moves_json IS NULL) = (move_log_version IS NULL))
      ) STRICT;
      CREATE INDEX history_entries_started_at
        ON history_entries(started_at DESC, id DESC);
      CREATE UNIQUE INDEX history_entries_one_active
        ON history_entries(status)
        WHERE status = 'active';
    `,
  },
]

type HistoryRow = {
  id: string
  exact_id: string
  deck_checksum: string
  display_name: string
  started_at: string
  finished_at: string | null
  draw_count: number
  move_count: number | null
  duration_ms: number | null
  preview_json: string
  status: HistoryEntry['status']
}

type SummaryRow = {
  total_count: number
  solved_count: number
  incomplete_count: number
  active_count: number
}

type SolvableStatsRow = {
  exact_id: string
  draw_count: number
  plays: number
  solves: number
}

const INSERT_SQL = `
  INSERT INTO history_entries (
    id,
    exact_id,
    deck_checksum,
    display_name,
    started_at,
    finished_at,
    draw_count,
    move_count,
    duration_ms,
    preview_json,
    status,
    moves_json,
    move_log_version
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

const UPDATE_COLUMNS_SQL = `
    exact_id = ?,
    deck_checksum = ?,
    display_name = ?,
    started_at = ?,
    finished_at = ?,
    draw_count = ?,
    move_count = ?,
    duration_ms = ?,
    preview_json = ?,
    status = ?`

const UPDATE_SQL = `
  UPDATE history_entries
  SET${UPDATE_COLUMNS_SQL}
  WHERE id = ?
`

// Separate statement so updates WITHOUT a moveLog argument (status flips, active-row
// normalization, …) never overwrite an already-recorded move log with NULL.
const UPDATE_WITH_MOVE_LOG_SQL = `
  UPDATE history_entries
  SET${UPDATE_COLUMNS_SQL},
    moves_json = ?,
    move_log_version = ?
  WHERE id = ?
`

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null

const openHistoryDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  const database = await SQLite.openDatabaseAsync(DATABASE_NAME)

  try {
    // WAL keeps reads responsive while the infrequent game-boundary writes commit.
    await database.execAsync('PRAGMA journal_mode = WAL;')

    const versionRow = await database.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version'
    )
    let currentVersion = versionRow?.user_version ?? 0

    // A newer app may have written a schema this build doesn't understand;
    // refuse to touch it rather than corrupt it.
    if (currentVersion > DATABASE_VERSION) {
      throw new Error(`Unsupported history database version: ${currentVersion}`)
    }

    for (const migration of MIGRATIONS) {
      if (currentVersion >= migration.toVersion) {
        continue
      }
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.execAsync(
          `${migration.sql}\nPRAGMA user_version = ${migration.toVersion};`
        )
      })
      currentVersion = migration.toVersion
    }

    return database
  } catch (error) {
    await database.closeAsync()
    throw error
  }
}

const getDatabase = (): Promise<SQLite.SQLiteDatabase> => {
  if (!databasePromise) {
    databasePromise = openHistoryDatabase().catch((error) => {
      databasePromise = null
      throw error
    })
  }

  return databasePromise
}

const toMoveLogParams = (
  moveLog: HistoryEntryMoveLog | null
): [string | null, number | null] =>
  moveLog ? [JSON.stringify(moveLog.entries), moveLog.version] : [null, null]

const toInsertParams = (
  entry: HistoryEntry,
  moveLog: HistoryEntryMoveLog | null
): SQLite.SQLiteBindValue[] => [
  entry.id,
  entry.exactId,
  entry.deckChecksum,
  entry.displayName,
  entry.startedAt,
  entry.finishedAt,
  entry.drawCount,
  entry.moves,
  entry.durationMs,
  JSON.stringify(entry.preview),
  entry.status,
  ...toMoveLogParams(moveLog),
]

const toUpdateParams = (entry: HistoryEntry): SQLite.SQLiteBindValue[] => [
  entry.exactId,
  entry.deckChecksum,
  entry.displayName,
  entry.startedAt,
  entry.finishedAt,
  entry.drawCount,
  entry.moves,
  entry.durationMs,
  JSON.stringify(entry.preview),
  entry.status,
]

const createEmptyPreview = (): HistoryEntry['preview'] => ({
  tableau: [],
  wasteTop: null,
  foundations: {
    hearts: null,
    diamonds: null,
    clubs: null,
    spades: null,
  },
  stockCount: 0,
})

const parsePreview = (serialized: string): HistoryEntry['preview'] => {
  try {
    const preview = JSON.parse(serialized) as unknown
    if (preview && typeof preview === 'object') {
      return preview as HistoryEntry['preview']
    }
  } catch {
    // A damaged preview should not make the rest of a history page unreadable.
  }

  return createEmptyPreview()
}

const toHistoryEntry = (row: HistoryRow): HistoryEntry => {
  const drawCount = row.draw_count as HistoryEntry['drawCount']
  const solvable = isExactDealSolvableForDrawCount(row.exact_id, drawCount)

  return {
    id: row.id,
    exactId: row.exact_id,
    deckChecksum: row.deck_checksum,
    displayName: row.display_name,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    // 1.0 freeze: the `solved` column was dropped; status is the single source.
    solved: row.status === 'solved',
    solvable,
    drawCount,
    solvableForDrawCount: solvable ? drawCount : null,
    moves: row.move_count,
    durationMs: row.duration_ms,
    preview: parsePreview(row.preview_json),
    status: row.status,
  }
}

const normalizePageArgument = (value: number): number =>
  Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0

const markOtherActiveRowsIncomplete = async (
  transaction: SQLite.SQLiteDatabase,
  activeEntryId: string
): Promise<void> => {
  await transaction.runAsync(
    `UPDATE history_entries
     SET status = ?, finished_at = ?
     WHERE status = ? AND id <> ?`,
    ['incomplete', null, 'active', activeEntryId]
  )
}

export const initializeHistoryRepository = async (): Promise<void> => {
  await getDatabase()
}

export const getHistoryPage = async (
  limit: number,
  offset: number
): Promise<HistoryEntry[]> => {
  const database = await getDatabase()
  const rows = await database.getAllAsync<HistoryRow>(
    `SELECT
       id,
       exact_id,
       deck_checksum,
       display_name,
       started_at,
       finished_at,
       draw_count,
       move_count,
       duration_ms,
       preview_json,
       status
     FROM history_entries
     ORDER BY started_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [normalizePageArgument(limit), normalizePageArgument(offset)]
  )

  return rows.map(toHistoryEntry)
}

export const getHistoryEntryById = async (id: string): Promise<HistoryEntry | null> => {
  const database = await getDatabase()
  const row = await database.getFirstAsync<HistoryRow>(
    `SELECT
       id,
       exact_id,
       deck_checksum,
       display_name,
       started_at,
       finished_at,
       draw_count,
       move_count,
       duration_ms,
       preview_json,
       status
     FROM history_entries
     WHERE id = ?`,
    [id]
  )

  return row ? toHistoryEntry(row) : null
}

// R3: lets result recording find an active row that paged out of the in-memory list.
// The partial unique index `history_entries_one_active` guarantees at most one row.
export const getActiveHistoryEntry = async (): Promise<HistoryEntry | null> => {
  const database = await getDatabase()
  const row = await database.getFirstAsync<HistoryRow>(
    `SELECT
       id,
       exact_id,
       deck_checksum,
       display_name,
       started_at,
       finished_at,
       draw_count,
       move_count,
       duration_ms,
       preview_json,
       status
     FROM history_entries
     WHERE status = 'active'`
  )

  return row ? toHistoryEntry(row) : null
}

export const getHistorySummary = async (): Promise<HistorySummary> => {
  const database = await getDatabase()
  const row = await database.getFirstAsync<SummaryRow>(`
    SELECT
      COUNT(*) AS total_count,
      COALESCE(SUM(CASE WHEN status = 'solved' THEN 1 ELSE 0 END), 0) AS solved_count,
      COALESCE(
        SUM(CASE WHEN status = 'incomplete' THEN 1 ELSE 0 END),
        0
      ) AS incomplete_count,
      COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS active_count
    FROM history_entries
  `)

  return {
    totalCount: row?.total_count ?? 0,
    solvedCount: row?.solved_count ?? 0,
    incompleteCount: row?.incomplete_count ?? 0,
    activeCount: row?.active_count ?? 0,
  }
}

// Aggregation happens in SQL (one small row per deal/draw-count pair) instead of
// streaming every history row into JS at startup. The solvable-catalog filter stays
// in JS — the catalog is a bundled TS module, not a table.
export const getSolvableDealHistoryStats = async (): Promise<
  SolvableDealHistoryStats[]
> => {
  const database = await getDatabase()
  const rows = await database.getAllAsync<SolvableStatsRow>(`
    SELECT
      exact_id,
      draw_count,
      COUNT(*) AS plays,
      SUM(CASE WHEN status = 'solved' THEN 1 ELSE 0 END) AS solves
    FROM history_entries
    GROUP BY exact_id, draw_count
  `)

  const stats = new Map<string, { plays: number; solves: number }>()
  rows.forEach((row) => {
    if (
      !isExactDealSolvableForDrawCount(
        row.exact_id,
        row.draw_count as HistoryEntry['drawCount']
      )
    ) {
      return
    }

    const current = stats.get(row.exact_id) ?? { plays: 0, solves: 0 }
    current.plays += row.plays
    current.solves += row.solves
    stats.set(row.exact_id, current)
  })

  return Array.from(stats.entries()).map(([exactId, record]) => ({
    exactId,
    plays: record.plays,
    solves: record.solves,
  }))
}

// moveLog semantics (insert + update): `undefined` leaves the moves_json column
// untouched (rows are created without a log; only game-boundary writes carry one),
// `null` clears it, a value writes it.
export const insertHistoryEntry = async (
  entry: HistoryEntry,
  moveLog: HistoryEntryMoveLog | null = null
): Promise<void> => {
  const database = await getDatabase()

  if (entry.status !== 'active') {
    await database.runAsync(INSERT_SQL, toInsertParams(entry, moveLog))
    return
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await markOtherActiveRowsIncomplete(transaction, entry.id)
    await transaction.runAsync(INSERT_SQL, toInsertParams(entry, moveLog))
  })
}

export const updateHistoryEntry = async (
  entry: HistoryEntry,
  moveLog?: HistoryEntryMoveLog | null
): Promise<void> => {
  const database = await getDatabase()
  const sql = moveLog === undefined ? UPDATE_SQL : UPDATE_WITH_MOVE_LOG_SQL
  const params: SQLite.SQLiteBindValue[] =
    moveLog === undefined
      ? [...toUpdateParams(entry), entry.id]
      : [...toUpdateParams(entry), ...toMoveLogParams(moveLog), entry.id]

  if (entry.status !== 'active') {
    await database.runAsync(sql, params)
    return
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const existing = await transaction.getFirstAsync<{ id: string }>(
      'SELECT id FROM history_entries WHERE id = ?',
      [entry.id]
    )
    if (!existing) {
      return
    }

    await markOtherActiveRowsIncomplete(transaction, entry.id)
    await transaction.runAsync(sql, params)
  })
}

// moves_json is intentionally NOT part of the page/active/summary SELECTs (a full
// log is ~15–25 KB per row; pages stay light). The future resume-from-history UI
// fetches a single row's log on demand through this function.
export const getHistoryEntryMoveLog = async (
  id: string
): Promise<{ moveLogVersion: number; moveLog: MoveLogEntry[] } | null> => {
  const database = await getDatabase()
  const row = await database.getFirstAsync<{
    moves_json: string | null
    move_log_version: number | null
  }>('SELECT moves_json, move_log_version FROM history_entries WHERE id = ?', [id])

  if (!row || row.moves_json === null || row.move_log_version === null) {
    return null
  }

  try {
    const parsed = JSON.parse(row.moves_json) as unknown
    // Review fix R4 (2026-07-06): structural validation instead of a blind cast —
    // a damaged entry would otherwise only surface as a crash/drift deep inside a
    // future resume replay.
    if (!Array.isArray(parsed) || !parsed.every(isMoveLogEntry)) {
      return null
    }
    return {
      moveLogVersion: row.move_log_version,
      moveLog: parsed as MoveLogEntry[],
    }
  } catch {
    // A damaged log must not break callers; they treat the game as non-resumable.
    return null
  }
}

export const clearHistoryEntries = async (): Promise<void> => {
  const database = await getDatabase()
  await database.runAsync('DELETE FROM history_entries', [])
}
