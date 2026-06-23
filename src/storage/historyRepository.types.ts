import type { HistoryEntry } from '../state/history'

export const HISTORY_PAGE_SIZE = 50

export type HistorySummary = {
  totalCount: number
  solvedCount: number
  incompleteCount: number
  activeCount: number
}

export type SolvableDealHistoryStats = {
  exactId: string
  plays: number
  solves: number
}

export type HistoryRepository = {
  readonly isHistorySupported: boolean
  initializeHistoryRepository: () => Promise<void>
  getHistoryPage: (limit: number, offset: number) => Promise<HistoryEntry[]>
  getHistoryEntryById: (id: string) => Promise<HistoryEntry | null>
  getHistorySummary: () => Promise<HistorySummary>
  getSolvableDealHistoryStats: () => Promise<SolvableDealHistoryStats[]>
  insertHistoryEntry: (entry: HistoryEntry) => Promise<void>
  updateHistoryEntry: (entry: HistoryEntry) => Promise<void>
  clearHistoryEntries: () => Promise<void>
}
