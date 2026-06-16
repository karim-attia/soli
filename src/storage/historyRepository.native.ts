import * as SQLite from 'expo-sqlite'

import { extractSolvableBaseId } from '../data/solvableShuffles'
import type { HistoryEntry } from '../state/history'
import {
  HISTORY_PAGE_SIZE,
  type HistorySummary,
  type SolvableHistoryStats,
} from './historyRepository.types'

export { HISTORY_PAGE_SIZE }

export const isHistorySupported = true

const DATABASE_NAME = 'soli-history.db'
const DATABASE_VERSION = 1

type HistoryRow = {
  id: string
  shuffle_id: string
  solvable_base_id: string | null
  display_name: string
  started_at: string
  finished_at: string | null
  solved: number
  solvable: number
  draw_count: number
  solvable_for_draw_count: number | null
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
  solvable_base_id: string
  plays: number
  solves: number
}

const INSERT_SQL = `
  INSERT INTO history_entries (
    id,
    shuffle_id,
    solvable_base_id,
    display_name,
    started_at,
    finished_at,
    solved,
    solvable,
    draw_count,
    solvable_for_draw_count,
    moves,
    duration_ms,
    preview_json,
    status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`

const INSERT_IF_MISSING_SQL = `${INSERT_SQL.trim()} ON CONFLICT(id) DO NOTHING`

const UPDATE_SQL = `
  UPDATE history_entries
  SET
    shuffle_id = ?,
    solvable_base_id = ?,
    display_name = ?,
    started_at = ?,
    finished_at = ?,
    solved = ?,
    solvable = ?,
    draw_count = ?,
    solvable_for_draw_count = ?,
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
            shuffle_id TEXT NOT NULL,
            solvable_base_id TEXT,
            display_name TEXT NOT NULL,
            started_at TEXT NOT NULL,
            finished_at TEXT,
            solved INTEGER NOT NULL,
            solvable INTEGER NOT NULL,
            draw_count INTEGER NOT NULL,
            solvable_for_draw_count INTEGER,
            moves INTEGER,
            duration_ms INTEGER,
            preview_json TEXT NOT NULL,
            status TEXT NOT NULL
          );
          CREATE INDEX IF NOT EXISTS history_entries_started_at
            ON history_entries(started_at DESC, id DESC);
          CREATE INDEX IF NOT EXISTS history_entries_solvable_base_id
            ON history_entries(solvable_base_id);
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
  entry.shuffleId,
  entry.solvable ? extractSolvableBaseId(entry.shuffleId) : null,
  entry.displayName,
  entry.startedAt,
  entry.finishedAt,
  entry.solved ? 1 : 0,
  entry.solvable ? 1 : 0,
  entry.drawCount,
  entry.solvableForDrawCount,
  entry.moves,
  entry.durationMs,
  JSON.stringify(entry.preview),
  entry.status,
]

const toUpdateParams = (entry: HistoryEntry): SQLite.SQLiteBindValue[] => [
  entry.shuffleId,
  entry.solvable ? extractSolvableBaseId(entry.shuffleId) : null,
  entry.displayName,
  entry.startedAt,
  entry.finishedAt,
  entry.solved ? 1 : 0,
  entry.solvable ? 1 : 0,
  entry.drawCount,
  entry.solvableForDrawCount,
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

const toHistoryEntry = (row: HistoryRow): HistoryEntry => ({
  id: row.id,
  shuffleId: row.shuffle_id,
  displayName: row.display_name,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  solved: row.solved === 1,
  solvable: row.solvable === 1,
  drawCount: row.draw_count as HistoryEntry['drawCount'],
  solvableForDrawCount:
    row.solvable_for_draw_count as HistoryEntry['solvableForDrawCount'],
  moves: row.moves,
  durationMs: row.duration_ms,
  preview: parsePreview(row.preview_json),
  status: row.status,
})

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

export const importLegacyHistory = async (entries: HistoryEntry[]): Promise<void> => {
  const database = await getDatabase()
  if (!entries.length) {
    return
  }

  // One exclusive transaction plus stable IDs makes interrupted imports retry-safe.
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const existingActive = await transaction.getFirstAsync<{ id: string }>(
      `SELECT id FROM history_entries WHERE status = 'active' LIMIT 1`
    )
    const statement = await transaction.prepareAsync(INSERT_IF_MISSING_SQL)
    try {
      for (const entry of entries) {
        // Preserve a newer database active game when legacy cleanup previously failed.
        const importedEntry =
          entry.status === 'active' && existingActive && existingActive.id !== entry.id
            ? { ...entry, status: 'incomplete' as const }
            : entry
        await statement.executeAsync(toInsertParams(importedEntry))
      }
    } finally {
      await statement.finalizeAsync()
    }
  })
}

export const getHistoryPage = async (
  limit: number,
  offset: number
): Promise<HistoryEntry[]> => {
  const database = await getDatabase()
  const rows = await database.getAllAsync<HistoryRow>(
    `SELECT
       id,
       shuffle_id,
       solvable_base_id,
       display_name,
       started_at,
       finished_at,
       solved,
       solvable,
       draw_count,
       solvable_for_draw_count,
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
       shuffle_id,
       solvable_base_id,
       display_name,
       started_at,
       finished_at,
       solved,
       solvable,
       draw_count,
       solvable_for_draw_count,
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

export const getSolvableHistoryStats = async (): Promise<SolvableHistoryStats[]> => {
  const database = await getDatabase()
  const rows = await database.getAllAsync<SolvableStatsRow>(`
    SELECT
      solvable_base_id,
      COUNT(*) AS plays,
      COALESCE(SUM(CASE WHEN solved = 1 THEN 1 ELSE 0 END), 0) AS solves
    FROM history_entries
    WHERE solvable = 1 AND draw_count = 1 AND solvable_base_id IS NOT NULL
    GROUP BY solvable_base_id
  `)

  return rows.map((row) => ({
    shuffleId: row.solvable_base_id,
    plays: row.plays,
    solves: row.solves,
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
