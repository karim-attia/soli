import type { MoveLogEntry } from '../solitaire/klondike'

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

// Note: a `HistoryRepository` interface used to live here as an (unenforced)
// contract for the .native/.web split; it was never referenced, so it was removed
// in the clean-code review. The web stub must still mirror the native module's
// exports manually — typecheck catches missing exports at the import sites.
