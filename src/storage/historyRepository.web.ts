import type { HistoryEntry } from '../state/history'
import {
  HISTORY_PAGE_SIZE,
  type HistorySummary,
  type SolvableDealHistoryStats,
} from './historyRepository.types'

export { HISTORY_PAGE_SIZE }

export const isHistorySupported = false

// Web history is intentionally unsupported so Expo SQLite's WASM setup stays out of scope.
export const initializeHistoryRepository = async (): Promise<void> => {}

export const getHistoryPage = async (
  _limit: number,
  _offset: number
): Promise<HistoryEntry[]> => []

export const getHistoryEntryById = async (_id: string): Promise<HistoryEntry | null> =>
  null

export const getHistorySummary = async (): Promise<HistorySummary> => ({
  totalCount: 0,
  solvedCount: 0,
  incompleteCount: 0,
  activeCount: 0,
})

export const getSolvableDealHistoryStats = async (): Promise<
  SolvableDealHistoryStats[]
> => []

export const insertHistoryEntry = async (_entry: HistoryEntry): Promise<void> => {}

export const updateHistoryEntry = async (_entry: HistoryEntry): Promise<void> => {}

export const clearHistoryEntries = async (): Promise<void> => {}
