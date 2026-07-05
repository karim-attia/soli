import * as SQLite from 'expo-sqlite'

import { isExactDealSolvableForDrawCount } from '../data/solvableDealsV2'
import type { HistoryEntry } from '../state/history'
import {
  HISTORY_PAGE_SIZE,
  type HistorySummary,
  type SolvableDealHistoryStats,
} from './historyRepository.types'

export { HISTORY_PAGE_SIZE }

export const isHistorySupported = true

// Phase 1 starts exact-ID history in a fresh SQLite file. Earlier SQLite schemas
// only existed on local test devices, so a new file is simpler than carrying
// migration code for pre-release identity columns.
const DATABASE_NAME = 'soli-history-v4.db'
const DATABASE_VERSION = 1

type HistoryRow = {
  id: string
  exact_id: string
  deck_checksum: string
  display_name: string
  started_at: string
  finished_at: string | null
  solved: number
  draw_count: number
  moves: number | null
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
  solved: number
}

const INSERT_SQL = `
  INSERT INTO history_entries (
    id,
    exact_id,
    deck_checksum,
    display_name,
    started_at,
    finished_at,
    solved,
    draw_count,
    moves,
    duration_ms,
    preview_json,
    status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

const UPDATE_SQL = `
  UPDATE history_entries
  SET
    exact_id = ?,
    deck_checksum = ?,
    display_name = ?,
    started_at = ?,
    finished_at = ?,
    solved = ?,
    draw_count = ?,
    moves = ?,
    duration_ms = ?,
    preview_json = ?,
    status = ?
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
    const currentVersion = versionRow?.user_version ?? 0

    if (currentVersion > DATABASE_VERSION) {
      throw new Error(`Unsupported history database version: ${currentVersion}`)
    }

    if (currentVersion < DATABASE_VERSION) {
      await database.withExclusiveTransactionAsync(async (transaction) => {
        await transaction.execAsync(`
          CREATE TABLE IF NOT EXISTS history_entries (
            id TEXT PRIMARY KEY NOT NULL,
            exact_id TEXT NOT NULL,
            deck_checksum TEXT NOT NULL,
            display_name TEXT NOT NULL,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            solved INTEGER NOT NULL,
            draw_count INTEGER NOT NULL,
            moves INTEGER,
            duration_ms INTEGER,
            preview_json TEXT NOT NULL,
            status TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS history_entries_started_at
            ON history_entries(started_at DESC, id DESC);
          CREATE INDEX IF NOT EXISTS history_entries_exact_id
            ON history_entries(exact_id);
          CREATE UNIQUE INDEX IF NOT EXISTS history_entries_one_active
            ON history_entries(status)
            WHERE status = 'active';
          PRAGMA user_version = 1;
        `)
      })
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

const toInsertParams = (entry: HistoryEntry): SQLite.SQLiteBindValue[] => [
  entry.id,
  entry.exactId,
  entry.deckChecksum,
  entry.displayName,
  entry.startedAt,
  entry.finishedAt,
  entry.solved ? 1 : 0,
  entry.drawCount,
  entry.moves,
  entry.durationMs,
  JSON.stringify(entry.preview),
  entry.status,
]

const toUpdateParams = (entry: HistoryEntry): SQLite.SQLiteBindValue[] => [
  entry.exactId,
  entry.deckChecksum,
  entry.displayName,
  entry.startedAt,
  entry.finishedAt,
  entry.solved ? 1 : 0,
  entry.drawCount,
  entry.moves,
  entry.durationMs,
  JSON.stringify(entry.preview),
  entry.status,
  entry.id,
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
    solved: row.solved === 1,
    solvable,
    drawCount,
    solvableForDrawCount: solvable ? drawCount : null,
    moves: row.moves,
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
     SET status = ?, solved = ?, finished_at = ?
     WHERE status = ? AND id <> ?`,
    ['incomplete', 0, null, 'active', activeEntryId]
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
       solved,
       draw_count,
       moves,
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
       solved,
       draw_count,
       moves,
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
       solved,
       draw_count,
       moves,
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
      COALESCE(SUM(CASE WHEN solved = 1 THEN 1 ELSE 0 END), 0) AS solved_count,
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

export const getSolvableDealHistoryStats = async (): Promise<
  SolvableDealHistoryStats[]
> => {
  const database = await getDatabase()
  const rows = await database.getAllAsync<SolvableStatsRow>(`
    SELECT
      exact_id,
      draw_count,
      solved
    FROM history_entries
    WHERE exact_id IS NOT NULL
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
    current.plays += 1
    current.solves += row.solved === 1 ? 1 : 0
    stats.set(row.exact_id, current)
  })

  return Array.from(stats.entries()).map(([exactId, record]) => ({
    exactId,
    plays: record.plays,
    solves: record.solves,
  }))
}

export const insertHistoryEntry = async (entry: HistoryEntry): Promise<void> => {
  const database = await getDatabase()

  if (entry.status !== 'active') {
    await database.runAsync(INSERT_SQL, toInsertParams(entry))
    return
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    await markOtherActiveRowsIncomplete(transaction, entry.id)
    await transaction.runAsync(INSERT_SQL, toInsertParams(entry))
  })
}

export const updateHistoryEntry = async (entry: HistoryEntry): Promise<void> => {
  const database = await getDatabase()

  if (entry.status !== 'active') {
    await database.runAsync(UPDATE_SQL, toUpdateParams(entry))
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
    await transaction.runAsync(UPDATE_SQL, toUpdateParams(entry))
  })
}

export const clearHistoryEntries = async (): Promise<void> => {
  const database = await getDatabase()
  await database.runAsync('DELETE FROM history_entries', [])
}
