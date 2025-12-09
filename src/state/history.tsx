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

import type { GameState, Rank, Suit } from '../solitaire/klondike'
import { FOUNDATION_SUIT_ORDER, TABLEAU_COLUMN_COUNT } from '../solitaire/klondike'
import { extractSolvableBaseId, SOLVABLE_SHUFFLES } from '../data/solvableShuffles'
import { devLog } from '../utils/devLogger'
import { computeElapsedWithReference } from '../utils/time'

const SOLVABLE_SHUFFLE_NAME_LOOKUP = new Map<string, string>(
  SOLVABLE_SHUFFLES.map((shuffle) => [shuffle.id, shuffle.name]),
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
  moves: number | null
  durationMs: number | null
  preview: HistoryPreview
  status: HistoryEntryStatus
}

export type RecordGameResultInput = {
  shuffleId: string
  solved: boolean
  solvable?: boolean
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
  recordResult: (input: RecordGameResultInput) => void
  preview: HistoryPreview
  displayName: string
  options?: RecordGameResultOptions
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

type HistoryContextValue = {
  entries: HistoryEntry[]
  hydrated: boolean
  solvedCount: number
  activeCount: number
  recordResult: (input: RecordGameResultInput) => string // Task 10-6: returns entry ID
  updateEntry: (id: string, updates: UpdateEntryInput) => void // Task 10-6: update existing entry
  clearHistory: () => void
  getEntryById: (id: string) => HistoryEntry | undefined
}

const HistoryContext = createContext<HistoryContextValue | undefined>(undefined)

const STORAGE_KEY = '@soli/history/v1'
const STORAGE_VERSION = 1
const MAX_HISTORY_ENTRIES = 200

type HistoryStoragePayload = {
  version: number
  entries: HistoryEntry[]
}

export const HistoryProvider = ({ children }: PropsWithChildren) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [hydrated, setHydrated] = useState(false)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const serialized = await AsyncStorage.getItem(STORAGE_KEY)
        if (!serialized) {
          return
        }

        const parsed = JSON.parse(serialized) as HistoryStoragePayload | null
        if (!parsed || !Array.isArray(parsed.entries)) {
          return
        }

        const validated = parsed.entries.filter(isValidEntry)
        if (!cancelled && validated.length) {
          setEntries((previous) => mergeEntries(previous, validated))
        }
      } catch (error) {
        if (!cancelled) {
          devLog('warn', '[history] Failed to load persisted history entries', error)
        }
      } finally {
        if (!cancelled) {
          hasLoadedRef.current = true
          setHydrated(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated && !hasLoadedRef.current) {
      return
    }

    const payload: HistoryStoragePayload = {
      version: STORAGE_VERSION,
      entries,
    }

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(payload)).catch((error) => {
      devLog('warn', '[history] Failed to persist history entries', error)
    })
  }, [entries, hydrated])

  // Task 10-6: recordResult now returns the entry ID for later updates
  const recordResult = useCallback((input: RecordGameResultInput): string => {
    const entry = createEntry(input)
    setEntries((previous) => {
      const next = [entry, ...previous]
      return next.slice(0, MAX_HISTORY_ENTRIES)
    })
    return entry.id
  }, [])

  // Task 10-6: updateEntry allows updating an existing entry by its ID
  const updateEntry = useCallback((id: string, updates: UpdateEntryInput) => {
    setEntries((previous) => {
      const index = previous.findIndex((entry) => entry.id === id)
      if (index === -1) {
        devLog('warn', `[history] Attempted to update non-existent entry: ${id}`)
        return previous
      }

      const existing = previous[index]
      // Handle finishedAt: can be Date, string, null, or undefined (keep existing)
      let finishedAt: string | null = existing.finishedAt
      if (updates.finishedAt !== undefined) {
        if (updates.finishedAt === null) {
          finishedAt = null
        } else if (typeof updates.finishedAt === 'string') {
          finishedAt = updates.finishedAt
        } else {
          finishedAt = updates.finishedAt.toISOString()
        }
      }

      const updated: HistoryEntry = {
        ...existing,
        solved: updates.solved ?? existing.solved,
        status: updates.status ?? existing.status,
        moves: updates.moves ?? existing.moves,
        durationMs: updates.durationMs ?? existing.durationMs,
        finishedAt,
        preview: updates.preview ?? existing.preview,
      }

      const next = [...previous]
      next[index] = updated
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setEntries([])
    AsyncStorage.removeItem(STORAGE_KEY).catch((error) => {
      devLog('warn', '[history] Failed to clear persisted history entries', error)
    })
  }, [])

  const solvedCount = useMemo(() => entries.filter((entry) => entry.solved).length, [entries])
  const activeCount = useMemo(() => entries.filter((entry) => entry.status === 'active').length, [entries])

  const getEntryById = useCallback(
    (id: string) => entries.find((entry) => entry.id === id),
    [entries],
  )

  const value = useMemo<HistoryContextValue>(
    () => ({
      entries,
      hydrated,
      solvedCount,
      activeCount,
      recordResult,
      updateEntry,
      clearHistory,
      getEntryById,
    }),
    [activeCount, clearHistory, entries, getEntryById, hydrated, recordResult, solvedCount, updateEntry],
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
    Date.now(),
  )

  recordResult({
    shuffleId: state.shuffleId,
    solved,
    solvable: Boolean(state.solvableId),
    finishedAt: new Date().toISOString(),
    moves: state.moveCount,
    durationMs: elapsedForRecord,
    preview,
    displayName,
  })

  lastRecordedShuffleRef.current = state.shuffleId
}

const createEntry = (input: RecordGameResultInput): HistoryEntry => {
  const now = new Date().toISOString()
  const startedAt = input.startedAt
    ? typeof input.startedAt === 'string'
      ? input.startedAt
      : input.startedAt.toISOString()
    : now
  // Task 10-6: finishedAt is null for active/incomplete games, set when solved
  const finishedAt = input.finishedAt === null
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
  return {
    id: generateHistoryId(),
    shuffleId: input.shuffleId,
    displayName,
    solved: input.solved,
    solvable: input.solvable ?? false,
    startedAt,
    finishedAt,
    moves: typeof input.moves === 'number' ? input.moves : null,
    durationMs: typeof input.durationMs === 'number' ? input.durationMs : null,
    preview,
    status,
  }
}

const mergeEntries = (current: HistoryEntry[], incoming: HistoryEntry[]): HistoryEntry[] => {
  if (!incoming.length) {
    return current
  }

  const map = new Map<string, HistoryEntry>()
  incoming.forEach((entry) => {
    map.set(entry.id, normalizeEntry(entry))
  })
  current.forEach((entry) => {
    map.set(entry.id, normalizeEntry(entry))
  })

  const merged = Array.from(map.values())
  merged.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt))
  return merged.slice(0, MAX_HISTORY_ENTRIES)
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
    typeof candidate.finishedAt === 'string' &&
    typeof candidate.solved === 'boolean' &&
    typeof candidate.solvable === 'boolean' &&
    (candidate.moves === null || typeof candidate.moves === 'number' || candidate.moves === undefined) &&
    (candidate.durationMs === null || typeof candidate.durationMs === 'number' || candidate.durationMs === undefined) &&
    candidate.preview !== undefined
  )
}

const generateHistoryId = () => `hist_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

const normalizeEntry = (entry: HistoryEntry): HistoryEntry => {
  const preview = sanitizePreview(entry.preview)
  const displayName = entry.displayName || formatShuffleDisplayName(entry.shuffleId)
  // Task 10-6: backward compatibility - derive status from solved if missing
  const status: HistoryEntryStatus = entry.status ?? (entry.solved ? 'solved' : 'incomplete')
  // Task 10-6: backward compatibility - use finishedAt as startedAt if missing
  const startedAt = entry.startedAt ?? entry.finishedAt ?? new Date().toISOString()
  // For old entries, finishedAt was always set; keep it for solved, null for incomplete
  const finishedAt = entry.finishedAt ?? (entry.solved ? startedAt : null)

  return {
    ...entry,
    displayName,
    preview,
    startedAt,
    finishedAt,
    moves: typeof entry.moves === 'number' ? entry.moves : null,
    durationMs: typeof entry.durationMs === 'number' ? entry.durationMs : null,
    status,
  }
}

const sanitizePreview = (preview: HistoryPreview | undefined): HistoryPreview => {
  if (!preview || typeof preview !== 'object') {
    return createEmptyPreview()
  }

  const tableau = Array.isArray((preview as HistoryPreview).tableau)
    ? ((preview as HistoryPreview).tableau as unknown[]).map((column) => sanitizePreviewColumn(column))
    : createEmptyPreview().tableau

  return {
    tableau,
    wasteTop: isValidCard((preview as HistoryPreview).wasteTop) ? (preview as HistoryPreview).wasteTop : null,
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
  const legacyHidden = typeof (rawColumn as { hiddenCount?: unknown })?.hiddenCount === 'number'
    ? Math.max(0, Math.floor(((rawColumn as { hiddenCount?: number }).hiddenCount as number) ?? 0))
    : inferredHidden

  const placeholdersNeeded = Math.max(0, legacyHidden - inferredHidden)
  if (placeholdersNeeded > 0) {
    const placeholders = Array.from({ length: placeholdersNeeded }, () => createPlaceholderCard())
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

const sanitizeFoundationPreview = (foundations: HistoryPreview['foundations'] | undefined) => {
  const base: Record<Suit, HistoryPreviewCard | null> = FOUNDATION_SUIT_ORDER.reduce((acc, suit) => {
    acc[suit] = null
    return acc
  }, {} as Record<Suit, HistoryPreviewCard | null>)

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

export const createHistoryPreviewFromState = (state: GameState): HistoryPreview => {
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

  const foundations: Record<Suit, HistoryPreviewCard | null> = FOUNDATION_SUIT_ORDER.reduce(
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
    {} as Record<Suit, HistoryPreviewCard | null>,
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
    const lookupName = baseId ? SOLVABLE_SHUFFLE_NAME_LOOKUP.get(baseId) ?? baseId : null
    return lookupName ? formatTitleCase(lookupName) : 'Solvable Shuffle'
  }

  if (shuffleId.startsWith('LEGACY-')) {
    return `Legacy ${shuffleId.slice(-4).toUpperCase()}`
  }

  const compact = shuffleId.slice(-5).toUpperCase()
  return `Game ${compact}`
}

