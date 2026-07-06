import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'

import type { GameSnapshot, GameState, Rank, Suit } from '../solitaire/klondike'
import { FOUNDATION_SUIT_ORDER, TABLEAU_COLUMN_COUNT } from '../solitaire/klondike'
import { normalizeDrawCount, type DrawCount } from '../solitaire/drawCount'
import {
  HISTORY_PAGE_SIZE,
  clearHistoryEntries,
  getActiveHistoryEntry,
  getHistoryEntryById,
  getHistoryPage,
  getHistorySummary,
  getSolvableDealHistoryStats,
  initializeHistoryRepository,
  insertHistoryEntry,
  isHistorySupported,
  updateHistoryEntry,
} from '../storage/historyRepository'
import type {
  HistoryEntryMoveLog,
  HistorySummary,
} from '../storage/historyRepository.types'
import { isExactDealSolvableForDrawCount } from '../data/solvableDealsV2'
import { formatExactDealDisplayName } from '../solitaire/dealIdentity'
import { devLog } from '../utils/devLogger'

// Task 10-6: Game status - 'active' for in-progress, 'incomplete' for abandoned, 'solved' for won
export type HistoryEntryStatus = 'active' | 'incomplete' | 'solved'

export type HistoryEntry = {
  id: string
  exactId: string
  deckChecksum: string
  displayName: string
  startedAt: string // Task 10-6: When game started
  finishedAt: string | null // Task 10-6: When game completed (null if still active/incomplete)
  solved: boolean
  solvable: boolean
  drawCount: DrawCount
  solvableForDrawCount: DrawCount | null
  moves: number | null
  durationMs: number | null
  preview: HistoryPreview
  status: HistoryEntryStatus
}

export type RecordGameResultInput = {
  exactId: string
  deckChecksum: string
  solved: boolean
  drawCount?: DrawCount
  startedAt?: string | Date // Task 10-6: When game started
  finishedAt?: string | Date | null // Task 10-6: When game completed
  moves?: number
  // null is allowed so active rows can explicitly carry "no duration yet"
  // (createEntry stores non-numbers as null either way, but the type makes it visible).
  durationMs?: number | null
  preview: HistoryPreview
  displayName?: string
  status?: HistoryEntryStatus
  // Move log recorded at game boundaries (solved/incomplete). Not part of
  // HistoryEntry — page queries never load it; it goes straight to the repository.
  moveLog?: HistoryEntryMoveLog | null
}

// Task 10-6: Partial updates for existing entries
export type UpdateEntryInput = {
  solved?: boolean
  status?: HistoryEntryStatus
  moves?: number
  durationMs?: number
  finishedAt?: string | Date | null
  preview?: HistoryPreview
  // undefined = leave the stored move log untouched; null = clear; value = write.
  moveLog?: HistoryEntryMoveLog | null
}

export type CreateStartedHistoryEntryInputOptions = {
  startedAt?: string | Date
  preview?: HistoryPreview
  displayName?: string
}

export type HistoryPreview = {
  tableau: HistoryPreviewColumn[]
  wasteTop: HistoryPreviewCard | null
  foundations: Record<Suit, HistoryPreviewCard | null>
  stockCount: number
}

export type HistoryPreviewColumn = {
  cards: HistoryPreviewCard[]
}

export type HistoryPreviewCard = {
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export type SolvableHistoryStat = {
  plays: number
  solves: number
}

type HistoryContextValue = {
  entries: HistoryEntry[]
  hydrated: boolean
  totalCount: number
  solvedCount: number
  incompleteCount: number
  solvableStats: ReadonlyMap<string, SolvableHistoryStat>
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => Promise<void>
  recordResult: (input: RecordGameResultInput) => string // Task 10-6: returns entry ID
  updateEntry: (id: string, updates: UpdateEntryInput) => void // Task 10-6: update existing entry
  clearHistory: () => void
  // R3: repository-backed lookup of the single active row, for callers whose
  // in-memory page may not contain it (see useKlondikeHistoryEntry fallback).
  getActiveEntry: () => Promise<HistoryEntry | null>
}

const HistoryContext = createContext<HistoryContextValue | undefined>(undefined)

const EMPTY_HISTORY_SUMMARY: HistorySummary = {
  totalCount: 0,
  solvedCount: 0,
  incompleteCount: 0,
  activeCount: 0,
}

export const HistoryProvider = ({ children }: PropsWithChildren) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [summary, setSummary] = useState<HistorySummary>(EMPTY_HISTORY_SUMMARY)
  const [solvableStats, setSolvableStats] = useState<
    ReadonlyMap<string, SolvableHistoryStat>
  >(() => new Map())
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const entriesRef = useRef<HistoryEntry[]>([])
  const summaryRef = useRef<HistorySummary>(EMPTY_HISTORY_SUMMARY)
  const loadingMoreRef = useRef(false)
  const mountedRef = useRef(true)
  const readyPromiseRef = useRef<Promise<void> | null>(null)
  const operationQueueRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false

    mountedRef.current = true
    const initialize = async () => {
      try {
        await initializeHistoryRepository()

        const [initialEntries, nextSummary, rawSolvableStats] = await Promise.all([
          getHistoryPage(HISTORY_PAGE_SIZE, 0),
          getHistorySummary(),
          getSolvableDealHistoryStats(),
        ])
        if (cancelled) {
          return
        }

        setEntries((previous) => {
          const merged = mergeHistoryEntries(previous, initialEntries)
          entriesRef.current = merged
          setHasMore(merged.length < nextSummary.totalCount)
          return merged
        })
        summaryRef.current = nextSummary
        setSummary(nextSummary)
        setSolvableStats(createSolvableStatsMap(rawSolvableStats))
      } catch (error) {
        if (!cancelled) {
          devLog('warn', '[history] Failed to initialize native history', error)
        }
      } finally {
        if (!cancelled) {
          setHydrated(true)
        }
      }
    }

    readyPromiseRef.current = initialize()
    return () => {
      cancelled = true
      mountedRef.current = false
    }
  }, [])

  const refreshMetadata = useCallback(async () => {
    const [nextSummary, rawSolvableStats] = await Promise.all([
      getHistorySummary(),
      getSolvableDealHistoryStats(),
    ])
    if (!mountedRef.current) {
      return
    }
    summaryRef.current = nextSummary
    setSummary(nextSummary)
    setSolvableStats(createSolvableStatsMap(rawSolvableStats))
    setHasMore(entriesRef.current.length < nextSummary.totalCount)
  }, [])

  const reconcileLoadedHistory = useCallback(async () => {
    const requestedCount = Math.max(HISTORY_PAGE_SIZE, entriesRef.current.length)
    const [persistedEntries, nextSummary, rawSolvableStats] = await Promise.all([
      getHistoryPage(requestedCount, 0),
      getHistorySummary(),
      getSolvableDealHistoryStats(),
    ])
    if (!mountedRef.current) {
      return
    }

    entriesRef.current = persistedEntries
    summaryRef.current = nextSummary
    setEntries(persistedEntries)
    setSummary(nextSummary)
    setSolvableStats(createSolvableStatsMap(rawSolvableStats))
    setHasMore(persistedEntries.length < nextSummary.totalCount)
  }, [])

  const queueRepositoryTask = useCallback(
    (task: () => Promise<void>) => {
      const ready = readyPromiseRef.current ?? Promise.resolve()
      const next = operationQueueRef.current.then(async () => {
        await ready
        await task()
        await refreshMetadata()
      })
      // History writes are intentionally serialized so active-row normalization and
      // aggregate refreshes observe the same order as the synchronous gameplay API.
      operationQueueRef.current = next.catch(async (error) => {
        devLog('warn', '[history] Failed to persist history change', error)
        try {
          // Drop optimistic rows after a failed write so later offsets stay aligned.
          await reconcileLoadedHistory()
        } catch (reconcileError) {
          devLog(
            'warn',
            '[history] Failed to reconcile persisted history',
            reconcileError
          )
        }
      })
    },
    [reconcileLoadedHistory, refreshMetadata]
  )

  // Task 10-6: recordResult now returns the entry ID for later updates
  const recordResult = useCallback(
    (input: RecordGameResultInput): string => {
      const entry = createEntry(input)
      if (!isHistorySupported) {
        return entry.id
      }
      const combined = [entry, ...entriesRef.current]
      const normalized =
        entry.status === 'active'
          ? normalizeActiveEntries(combined, entry.id)
          : normalizeActiveEntries(combined)
      // Keep the ref synchronous because callers receive the ID immediately and may
      // update the same entry before React commits another render.
      entriesRef.current = normalized
      setEntries(normalized)
      queueRepositoryTask(() => insertHistoryEntry(entry, input.moveLog ?? null))
      return entry.id
    },
    [queueRepositoryTask]
  )

  // Task 10-6: updateEntry allows updating an existing entry by its ID
  const updateEntry = useCallback(
    (id: string, updates: UpdateEntryInput) => {
      if (!isHistorySupported) {
        return
      }
      const existingIndex = entriesRef.current.findIndex((entry) => entry.id === id)
      if (existingIndex === -1) {
        queueRepositoryTask(async () => {
          const persisted = await getHistoryEntryById(id)
          if (!persisted) {
            devLog('warn', `[history] Attempted to update non-existent entry: ${id}`)
            return
          }
          await updateHistoryEntry(
            applyHistoryEntryUpdates(persisted, updates),
            updates.moveLog
          )
        })
        return
      }

      const existing = entriesRef.current[existingIndex]
      const updated = applyHistoryEntryUpdates(existing, updates)
      const next = [...entriesRef.current]
      next[existingIndex] = updated
      const preferredActiveId = updated.status === 'active' ? updated.id : undefined
      const normalized = normalizeActiveEntries(next, preferredActiveId)
      entriesRef.current = normalized
      setEntries(normalized)
      queueRepositoryTask(() => updateHistoryEntry(updated, updates.moveLog))
    },
    [queueRepositoryTask]
  )

  const clearHistory = useCallback(() => {
    entriesRef.current = []
    setEntries([])
    summaryRef.current = EMPTY_HISTORY_SUMMARY
    setSummary(EMPTY_HISTORY_SUMMARY)
    setSolvableStats(new Map())
    setHasMore(false)
    queueRepositoryTask(clearHistoryEntries)
  }, [queueRepositoryTask])

  const getActiveEntry = useCallback(async (): Promise<HistoryEntry | null> => {
    if (!isHistorySupported) {
      return null
    }
    await (readyPromiseRef.current ?? Promise.resolve())
    // Wait out queued writes so a just-inserted or just-completed row is visible
    // before we decide whether an active row exists.
    await operationQueueRef.current
    return getActiveHistoryEntry()
  }, [])

  const loadMore = useCallback(async () => {
    if (!hydrated || !hasMore || loadingMoreRef.current || !isHistorySupported) {
      return
    }

    loadingMoreRef.current = true
    setLoadingMore(true)
    try {
      await (readyPromiseRef.current ?? Promise.resolve())
      // A newly inserted optimistic row must reach SQLite before its count is used as
      // the offset, otherwise the next page can skip one database row.
      await operationQueueRef.current
      const page = await getHistoryPage(HISTORY_PAGE_SIZE, entriesRef.current.length)
      if (!mountedRef.current) {
        return
      }
      setEntries((previous) => {
        const merged = mergeHistoryEntries(previous, page)
        entriesRef.current = merged
        setHasMore(merged.length < summaryRef.current.totalCount)
        return merged
      })
    } catch (error) {
      devLog('warn', '[history] Failed to load another history page', error)
    } finally {
      loadingMoreRef.current = false
      if (mountedRef.current) {
        setLoadingMore(false)
      }
    }
  }, [hasMore, hydrated])

  const value = useMemo<HistoryContextValue>(
    () => ({
      entries,
      hydrated,
      totalCount: summary.totalCount,
      solvedCount: summary.solvedCount,
      incompleteCount: summary.incompleteCount,
      solvableStats,
      hasMore,
      loadingMore,
      loadMore,
      recordResult,
      updateEntry,
      clearHistory,
      getActiveEntry,
    }),
    [
      clearHistory,
      entries,
      getActiveEntry,
      hasMore,
      hydrated,
      loadMore,
      loadingMore,
      recordResult,
      solvableStats,
      summary,
      updateEntry,
    ]
  )

  return <HistoryContext.Provider value={value}>{children}</HistoryContext.Provider>
}

export const useHistory = (): HistoryContextValue => {
  const context = useContext(HistoryContext)
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider')
  }
  return context
}

export const createStartedHistoryEntryInputFromState = (
  state: GameState,
  options: CreateStartedHistoryEntryInputOptions = {}
): RecordGameResultInput => {
  return {
    exactId: state.exactId,
    deckChecksum: state.deckChecksum,
    solved: false,
    drawCount: state.drawCount,
    startedAt: options.startedAt ?? new Date().toISOString(),
    finishedAt: null,
    moves: 0,
    // Product decision: active games show no "Time ..." in history (a 0 here rendered
    // as "Time 0:00"); the real duration is written when the game ends.
    durationMs: null,
    preview: options.preview ?? createHistoryPreviewFromState(state),
    displayName: options.displayName ?? formatDealDisplayName(state.exactId),
    status: 'active',
  }
}

const createEntry = (input: RecordGameResultInput): HistoryEntry => {
  const now = new Date().toISOString()
  const startedAt = input.startedAt
    ? typeof input.startedAt === 'string'
      ? input.startedAt
      : input.startedAt.toISOString()
    : now
  // Task 10-6: finishedAt is null for active/incomplete games, set when solved
  const finishedAt =
    input.finishedAt === null
      ? null
      : input.finishedAt
        ? typeof input.finishedAt === 'string'
          ? input.finishedAt
          : input.finishedAt.toISOString()
        : input.solved
          ? now
          : null
  const preview = sanitizePreview(input.preview)
  const exactId = input.exactId
  const displayName = input.displayName ?? formatDealDisplayName(exactId)
  // Task 10-6: derive status from input or solved boolean
  const status: HistoryEntryStatus = input.status ?? (input.solved ? 'solved' : 'active')
  const drawCount = normalizeDrawCount(input.drawCount)
  const derivedSolvable = isExactDealSolvableForDrawCount(exactId, drawCount)
  const solvableForDrawCount = derivedSolvable ? drawCount : null
  return {
    id: generateHistoryId(),
    exactId,
    deckChecksum: input.deckChecksum,
    displayName,
    solved: input.solved,
    solvable: derivedSolvable,
    drawCount,
    solvableForDrawCount,
    startedAt,
    finishedAt,
    moves: typeof input.moves === 'number' ? input.moves : null,
    durationMs: typeof input.durationMs === 'number' ? input.durationMs : null,
    preview,
    status,
  }
}

function applyHistoryEntryUpdates(
  existing: HistoryEntry,
  updates: UpdateEntryInput
): HistoryEntry {
  const finishedAt =
    updates.finishedAt === undefined
      ? existing.finishedAt
      : updates.finishedAt === null
        ? null
        : typeof updates.finishedAt === 'string'
          ? updates.finishedAt
          : updates.finishedAt.toISOString()

  return {
    ...existing,
    solved: updates.solved ?? existing.solved,
    status: updates.status ?? existing.status,
    moves: updates.moves ?? existing.moves,
    durationMs: updates.durationMs ?? existing.durationMs,
    finishedAt,
    preview: updates.preview ?? existing.preview,
  }
}

// Task 10-7: Ensure only one entry is ever marked as active.
const normalizeActiveEntries = (
  entries: HistoryEntry[],
  preferredActiveId?: string
): HistoryEntry[] => {
  const activeEntries = entries.filter((entry) => entry.status === 'active')
  if (activeEntries.length <= 1) {
    return entries
  }

  const preferred =
    preferredActiveId && activeEntries.some((entry) => entry.id === preferredActiveId)
      ? preferredActiveId
      : null

  const keepId =
    preferred ??
    [...activeEntries].sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0]?.id ??
    activeEntries[0].id

  return entries.map((entry) => {
    if (entry.status !== 'active' || entry.id === keepId) {
      return entry
    }
    return {
      ...entry,
      status: 'incomplete',
      solved: false,
      finishedAt: null,
    }
  })
}

export const mergeHistoryEntries = (
  current: HistoryEntry[],
  incoming: HistoryEntry[]
): HistoryEntry[] => {
  if (!incoming.length) {
    return current
  }

  const map = new Map<string, HistoryEntry>()
  incoming.forEach((entry) => {
    map.set(entry.id, normalizeHistoryEntry(entry))
  })
  current.forEach((entry) => {
    map.set(entry.id, normalizeHistoryEntry(entry))
  })

  const merged = normalizeActiveEntries(Array.from(map.values()))
  // Match the repository's deterministic order when timestamps are identical.
  merged.sort(
    (a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id)
  )
  return merged
}

const createSolvableStatsMap = (
  rows: Array<{ exactId: string; plays: number; solves: number }>
): ReadonlyMap<string, SolvableHistoryStat> =>
  new Map(
    rows.map((row) => [
      row.exactId,
      {
        plays: row.plays,
        solves: row.solves,
      },
    ])
  )

// Row ID generator only; it is not a deck generator and does not identify a deal.
const generateHistoryId = () =>
  `hist_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

export const normalizeHistoryEntry = (entry: HistoryEntry): HistoryEntry => {
  const preview = sanitizePreview(entry.preview)
  const exactId = entry.exactId
  const displayName = entry.displayName || formatDealDisplayName(exactId)
  const status = entry.status
  const startedAt = entry.startedAt
  const finishedAt = entry.finishedAt
  const drawCount = normalizeDrawCount(entry.drawCount)
  const derivedSolvable = isExactDealSolvableForDrawCount(exactId, drawCount)
  const solvableForDrawCount = derivedSolvable ? drawCount : null

  return {
    ...entry,
    exactId,
    displayName,
    solvable: derivedSolvable,
    preview,
    startedAt,
    finishedAt,
    moves: typeof entry.moves === 'number' ? entry.moves : null,
    durationMs: typeof entry.durationMs === 'number' ? entry.durationMs : null,
    drawCount,
    solvableForDrawCount,
    status,
  }
}

const sanitizePreview = (preview: HistoryPreview | undefined): HistoryPreview => {
  if (!preview || typeof preview !== 'object') {
    return createEmptyPreview()
  }

  const tableau = Array.isArray((preview as HistoryPreview).tableau)
    ? ((preview as HistoryPreview).tableau as unknown[]).map((column) =>
        sanitizePreviewColumn(column)
      )
    : createEmptyPreview().tableau

  return {
    tableau,
    wasteTop: isValidCard((preview as HistoryPreview).wasteTop)
      ? (preview as HistoryPreview).wasteTop
      : null,
    foundations: sanitizeFoundationPreview((preview as HistoryPreview).foundations),
    stockCount:
      typeof (preview as HistoryPreview).stockCount === 'number' &&
      Number.isFinite((preview as HistoryPreview).stockCount) &&
      (preview as HistoryPreview).stockCount >= 0
        ? Math.floor((preview as HistoryPreview).stockCount)
        : 0,
  }
}

const sanitizePreviewColumn = (column: unknown): HistoryPreviewColumn => {
  const rawColumn = column as Partial<HistoryPreviewColumn>
  const rawCards = Array.isArray(rawColumn?.cards) ? rawColumn.cards : []
  const sanitizedCards: HistoryPreviewCard[] = rawCards
    .map((card) => (isValidCard(card) ? { ...card, faceUp: Boolean(card.faceUp) } : null))
    .filter((card): card is HistoryPreviewCard => card !== null)

  return {
    cards: sanitizedCards,
  }
}

const sanitizeFoundationPreview = (
  foundations: HistoryPreview['foundations'] | undefined
) => {
  const base: Record<Suit, HistoryPreviewCard | null> = FOUNDATION_SUIT_ORDER.reduce(
    (acc, suit) => {
      acc[suit] = null
      return acc
    },
    {} as Record<Suit, HistoryPreviewCard | null>
  )

  if (!foundations || typeof foundations !== 'object') {
    return base
  }

  FOUNDATION_SUIT_ORDER.forEach((suit) => {
    const card = (foundations as Record<Suit, HistoryPreviewCard | null>)[suit]
    base[suit] = isValidCard(card) ? card : null
  })

  return base
}

const isValidCard = (value: unknown): value is HistoryPreviewCard => {
  if (!value || typeof value !== 'object') {
    return false
  }
  const card = value as HistoryPreviewCard
  return isSuit(card.suit) && isRank(card.rank) && typeof card.faceUp === 'boolean'
}

const isSuit = (value: unknown): value is Suit =>
  value === 'clubs' || value === 'diamonds' || value === 'hearts' || value === 'spades'

const isRank = (value: unknown): value is Rank =>
  typeof value === 'number' && value >= 1 && value <= 13 && Number.isInteger(value)

const createEmptyPreview = (): HistoryPreview => ({
  tableau: Array.from({ length: TABLEAU_COLUMN_COUNT }, () => ({ cards: [] })),
  wasteTop: null,
  foundations: sanitizeFoundationPreview(undefined),
  stockCount: 0,
})

// Task 10-7: Preview is derived from a snapshot (start state preferred).
export const createHistoryPreviewFromState = (state: GameSnapshot): HistoryPreview => {
  const tableau = state.tableau.map((column) => ({
    cards: column.map((card) => ({
      suit: card.suit,
      rank: card.rank,
      faceUp: card.faceUp,
    })),
  }))

  const wasteTopCard = state.waste[state.waste.length - 1]
  const wasteTop = wasteTopCard
    ? {
        suit: wasteTopCard.suit,
        rank: wasteTopCard.rank,
        faceUp: wasteTopCard.faceUp,
      }
    : null

  const foundations: Record<Suit, HistoryPreviewCard | null> =
    FOUNDATION_SUIT_ORDER.reduce(
      (acc, suit) => {
        const pile = state.foundations[suit]
        const top = pile[pile.length - 1]
        acc[suit] = top
          ? {
              suit: top.suit,
              rank: top.rank,
              faceUp: true,
            }
          : null
        return acc
      },
      {} as Record<Suit, HistoryPreviewCard | null>
    )

  return {
    tableau,
    wasteTop,
    foundations,
    stockCount: state.stock.length,
  }
}

export const formatDealDisplayName = (exactId: string): string => {
  const exactDisplay = formatExactDealDisplayName(exactId)
  if (exactDisplay) {
    return exactDisplay
  }

  const compact = exactId.slice(-5).toUpperCase()
  return `Game ${compact}`
}
