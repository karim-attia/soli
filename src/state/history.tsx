import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
  type PropsWithChildren,
} from 'react'

import type { GameSnapshot, GameState, Rank, Suit } from '../solitaire/klondike'
import { FOUNDATION_SUIT_ORDER, TABLEAU_COLUMN_COUNT } from '../solitaire/klondike'
import {
  DEFAULT_DRAW_COUNT,
  normalizeDrawCount,
  type DrawCount,
} from '../solitaire/drawCount'
import {
  HISTORY_PAGE_SIZE,
  clearHistoryEntries,
  getHistoryEntryById,
  getHistoryPage,
  getHistorySummary,
  getSolvableHistoryStats,
  importLegacyHistory,
  initializeHistoryRepository,
  insertHistoryEntry,
  isHistorySupported,
  updateHistoryEntry,
} from '../storage/historyRepository'
import type { HistorySummary } from '../storage/historyRepository.types'
import { extractSolvableBaseId, SOLVABLE_SHUFFLES } from '../data/solvableShuffles'
import { devLog } from '../utils/devLogger'
import { computeElapsedWithReference } from '../utils/time'

const SOLVABLE_SHUFFLE_NAME_LOOKUP = new Map<string, string>(
  SOLVABLE_SHUFFLES.map((shuffle) => [shuffle.id, shuffle.name])
)

const formatTitleCase = (value: string): string =>
  value
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

// Task 10-6: Game status - 'active' for in-progress, 'incomplete' for abandoned, 'solved' for won
export type HistoryEntryStatus = 'active' | 'incomplete' | 'solved'

export type HistoryEntry = {
  id: string
  shuffleId: string
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
  shuffleId: string
  solved: boolean
  solvable?: boolean
  drawCount?: DrawCount
  solvableForDrawCount?: DrawCount | null
  startedAt?: string | Date // Task 10-6: When game started
  finishedAt?: string | Date | null // Task 10-6: When game completed
  moves?: number
  durationMs?: number
  preview: HistoryPreview
  displayName?: string
  status?: HistoryEntryStatus
}

export type RecordGameResultOptions = {
  solved?: boolean
}

// Task 10-6: Partial updates for existing entries
export type UpdateEntryInput = {
  solved?: boolean
  status?: HistoryEntryStatus
  moves?: number
  durationMs?: number
  finishedAt?: string | Date | null
  preview?: HistoryPreview
}

export type RecordGameResultFromStateParams = {
  state: GameState
  lastRecordedShuffleRef: MutableRefObject<string | null>
  recordResult: (input: RecordGameResultInput) => string
  preview: HistoryPreview
  displayName: string
  options?: RecordGameResultOptions
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
  activeCount: number
  solvableStats: ReadonlyMap<string, SolvableHistoryStat>
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => Promise<void>
  recordResult: (input: RecordGameResultInput) => string // Task 10-6: returns entry ID
  updateEntry: (id: string, updates: UpdateEntryInput) => void // Task 10-6: update existing entry
  clearHistory: () => void
  getEntryById: (id: string) => HistoryEntry | undefined
}

const HistoryContext = createContext<HistoryContextValue | undefined>(undefined)

const STORAGE_KEY = '@soli/history/v1'

type HistoryStoragePayload = {
  version: number
  entries: HistoryEntry[]
}

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

        if (isHistorySupported) {
          const legacyEntries = await readLegacyHistoryEntries()
          if (legacyEntries) {
            // Stable history IDs plus ID-scoped conflict handling make retries safe.
            await importLegacyHistory(legacyEntries)
            try {
              await AsyncStorage.removeItem(STORAGE_KEY)
            } catch (error) {
              // The SQLite import already committed, so cleanup failure must not hide it.
              devLog('warn', '[history] Failed to remove migrated legacy history', error)
            }
          }
        }

        const [initialEntries, nextSummary, rawSolvableStats] = await Promise.all([
          getHistoryPage(HISTORY_PAGE_SIZE, 0),
          getHistorySummary(),
          getSolvableHistoryStats(),
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
      getSolvableHistoryStats(),
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
      getSolvableHistoryStats(),
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
      queueRepositoryTask(() => insertHistoryEntry(entry))
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
          await updateHistoryEntry(applyHistoryEntryUpdates(persisted, updates))
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
      queueRepositoryTask(() => updateHistoryEntry(updated))
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
    AsyncStorage.removeItem(STORAGE_KEY).catch((error) => {
      devLog('warn', '[history] Failed to clear legacy history entries', error)
    })
    queueRepositoryTask(clearHistoryEntries)
  }, [queueRepositoryTask])

  const getEntryById = useCallback(
    (id: string) => entries.find((entry) => entry.id === id),
    [entries]
  )

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
      activeCount: summary.activeCount,
      solvableStats,
      hasMore,
      loadingMore,
      loadMore,
      recordResult,
      updateEntry,
      clearHistory,
      getEntryById,
    }),
    [
      clearHistory,
      entries,
      getEntryById,
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

export const recordGameResultFromState = ({
  state,
  lastRecordedShuffleRef,
  recordResult,
  preview,
  displayName,
  options,
}: RecordGameResultFromStateParams) => {
  if (!state.shuffleId) {
    return
  }

  if (lastRecordedShuffleRef.current === state.shuffleId) {
    return
  }

  const solved = options?.solved ?? state.hasWon
  if (!solved && state.moveCount === 0) {
    return
  }

  const elapsedForRecord = computeElapsedWithReference(
    state.elapsedMs,
    state.timerState,
    state.timerStartedAt,
    Date.now()
  )

  recordResult({
    shuffleId: state.shuffleId,
    solved,
    solvable: Boolean(state.solvableId),
    drawCount: state.drawCount,
    solvableForDrawCount:
      state.dealSolvabilityBasis === 'draw1' ? DEFAULT_DRAW_COUNT : null,
    finishedAt: new Date().toISOString(),
    moves: state.moveCount,
    durationMs: elapsedForRecord,
    preview,
    displayName,
  })

  lastRecordedShuffleRef.current = state.shuffleId
}

export const createStartedHistoryEntryInputFromState = (
  state: GameState,
  options: CreateStartedHistoryEntryInputOptions = {}
): RecordGameResultInput | null => {
  if (!state.shuffleId) {
    return null
  }

  return {
    shuffleId: state.shuffleId,
    solved: false,
    solvable: Boolean(state.solvableId),
    drawCount: state.drawCount,
    solvableForDrawCount:
      state.dealSolvabilityBasis === 'draw1' ? DEFAULT_DRAW_COUNT : null,
    startedAt: options.startedAt ?? new Date().toISOString(),
    finishedAt: null,
    moves: 0,
    durationMs: 0,
    preview: options.preview ?? createHistoryPreviewFromState(state),
    displayName: options.displayName ?? formatShuffleDisplayName(state.shuffleId),
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
  const displayName = input.displayName ?? formatShuffleDisplayName(input.shuffleId)
  // Task 10-6: derive status from input or solved boolean
  const status: HistoryEntryStatus = input.status ?? (input.solved ? 'solved' : 'active')
  const drawCount = normalizeDrawCount(input.drawCount)
  const solvableForDrawCount = input.solvable
    ? normalizeDrawCount(input.solvableForDrawCount)
    : null
  return {
    id: generateHistoryId(),
    shuffleId: input.shuffleId,
    displayName,
    solved: input.solved,
    solvable: input.solvable ?? false,
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

const isValidEntry = (entry: unknown): entry is HistoryEntry => {
  if (!entry || typeof entry !== 'object') {
    return false
  }

  const candidate = entry as Partial<HistoryEntry>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.shuffleId === 'string' &&
    typeof candidate.displayName === 'string' &&
    // Task 10-6: finishedAt can be null/undefined for active games, or string for completed/old entries
    (candidate.finishedAt === null ||
      candidate.finishedAt === undefined ||
      typeof candidate.finishedAt === 'string') &&
    typeof candidate.solved === 'boolean' &&
    typeof candidate.solvable === 'boolean' &&
    (candidate.moves === null ||
      typeof candidate.moves === 'number' ||
      candidate.moves === undefined) &&
    (candidate.durationMs === null ||
      typeof candidate.durationMs === 'number' ||
      candidate.durationMs === undefined) &&
    candidate.preview !== undefined
  )
}

const readLegacyHistoryEntries = async (): Promise<HistoryEntry[] | null> => {
  const serialized = await AsyncStorage.getItem(STORAGE_KEY)
  if (!serialized) {
    return null
  }

  try {
    const parsed = JSON.parse(serialized) as HistoryStoragePayload | null
    if (!parsed || !Array.isArray(parsed.entries)) {
      return []
    }

    const validated = parsed.entries
      .filter(isValidEntry)
      .map((entry) => normalizeHistoryEntry(entry))
    return normalizeActiveEntries(validated)
  } catch (error) {
    // Keep unreadable legacy data in place so a future recovery remains possible.
    devLog('warn', '[history] Failed to parse legacy history entries', error)
    return null
  }
}

const createSolvableStatsMap = (
  rows: Array<{ shuffleId: string; plays: number; solves: number }>
): ReadonlyMap<string, SolvableHistoryStat> =>
  new Map(
    rows.map((row) => [
      row.shuffleId,
      {
        plays: row.plays,
        solves: row.solves,
      },
    ])
  )

const generateHistoryId = () =>
  `hist_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

export const normalizeHistoryEntry = (entry: HistoryEntry): HistoryEntry => {
  const preview = sanitizePreview(entry.preview)
  const displayName = entry.displayName || formatShuffleDisplayName(entry.shuffleId)
  // Task 10-6: backward compatibility - derive status from solved if missing
  const status: HistoryEntryStatus =
    entry.status ?? (entry.solved ? 'solved' : 'incomplete')
  // Task 10-6: backward compatibility - use finishedAt as startedAt if missing
  const startedAt = entry.startedAt ?? entry.finishedAt ?? new Date().toISOString()
  // For old entries, finishedAt was always set; keep it for solved, null for incomplete
  const finishedAt = entry.finishedAt ?? (entry.solved ? startedAt : null)
  const drawCount = normalizeDrawCount(entry.drawCount)
  const solvableForDrawCount = entry.solvable
    ? normalizeDrawCount(entry.solvableForDrawCount)
    : null

  return {
    ...entry,
    displayName,
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
  const rawColumn = column as Partial<HistoryPreviewColumn & { hiddenCount?: number }>
  const rawCards = Array.isArray(rawColumn?.cards) ? rawColumn.cards : []
  const sanitizedCards: HistoryPreviewCard[] = rawCards
    .map((card) => (isValidCard(card) ? { ...card, faceUp: Boolean(card.faceUp) } : null))
    .filter((card): card is HistoryPreviewCard => card !== null)

  const inferredHidden = sanitizedCards.filter((card) => !card.faceUp).length
  const legacyHidden =
    typeof (rawColumn as { hiddenCount?: unknown })?.hiddenCount === 'number'
      ? Math.max(
          0,
          Math.floor(((rawColumn as { hiddenCount?: number }).hiddenCount as number) ?? 0)
        )
      : inferredHidden

  const placeholdersNeeded = Math.max(0, legacyHidden - inferredHidden)
  if (placeholdersNeeded > 0) {
    const placeholders = Array.from({ length: placeholdersNeeded }, () =>
      createPlaceholderCard()
    )
    return {
      cards: [...placeholders, ...sanitizedCards],
    }
  }

  if (!sanitizedCards.length && legacyHidden > 0) {
    return {
      cards: Array.from({ length: legacyHidden }, () => createPlaceholderCard()),
    }
  }

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

const createPlaceholderCard = (): HistoryPreviewCard => ({
  suit: FOUNDATION_SUIT_ORDER[0],
  rank: 1,
  faceUp: false,
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

export const formatShuffleDisplayName = (shuffleId: string): string => {
  if (shuffleId.startsWith('SOLVABLE:')) {
    const baseId = extractSolvableBaseId(shuffleId)
    const lookupName = baseId
      ? (SOLVABLE_SHUFFLE_NAME_LOOKUP.get(baseId) ?? baseId)
      : null
    return lookupName ? formatTitleCase(lookupName) : 'Solvable Shuffle'
  }

  if (shuffleId.startsWith('LEGACY-')) {
    return `Legacy ${shuffleId.slice(-4).toUpperCase()}`
  }

  const compact = shuffleId.slice(-5).toUpperCase()
  return `Game ${compact}`
}
