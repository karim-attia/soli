import type { MoveLogEntry } from '../solitaire/klondike'
import type { HistoryEntry } from '../state/history'

export const HISTORY_PAGE_SIZE = 50

// Version-tagged move log stored on a history row at game boundaries (moves_json /
// move_log_version columns). Enables the future resume-from-history scrubber.
export type HistoryEntryMoveLog = {
  version: number
  entries: MoveLogEntry[]
}

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
  getActiveHistoryEntry: () => Promise<HistoryEntry | null>
  getHistorySummary: () => Promise<HistorySummary>
  getSolvableDealHistoryStats: () => Promise<SolvableDealHistoryStats[]>
  insertHistoryEntry: (
    entry: HistoryEntry,
    moveLog?: HistoryEntryMoveLog | null
  ) => Promise<void>
  updateHistoryEntry: (
    entry: HistoryEntry,
    moveLog?: HistoryEntryMoveLog | null
  ) => Promise<void>
  getHistoryEntryMoveLog: (
    id: string
  ) => Promise<{ moveLogVersion: number; moveLog: MoveLogEntry[] } | null>
  clearHistoryEntries: () => Promise<void>
}
