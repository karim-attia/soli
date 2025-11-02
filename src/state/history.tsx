import AsyncStorage from '@react-native-async-storage/async-storage'
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

import type { GameState, Rank, Suit } from '../solitaire/klondike'
import { FOUNDATION_SUIT_ORDER } from '../solitaire/klondike'

export type HistoryEntry = {
  id: string
  shuffleId: string
  displayName: string
  finishedAt: string
  solved: boolean
  solvable: boolean
  moves: number | null
  durationMs: number | null
  preview: HistoryPreview
}

export type RecordGameResultInput = {
  shuffleId: string
  solved: boolean
  solvable?: boolean
  finishedAt?: string | Date
  moves?: number
  durationMs?: number
  preview: HistoryPreview
  displayName?: string
}

export type HistoryPreview = {
  tableau: HistoryPreviewColumn[]
  wasteTop: HistoryPreviewCard | null
  foundations: Record<Suit, HistoryPreviewCard | null>
  stockCount: number
}

export type HistoryPreviewColumn = {
  hiddenCount: number
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
  recordResult: (input: RecordGameResultInput) => void
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
          console.warn('[history] Failed to load persisted history entries', error)
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
      console.warn('[history] Failed to persist history entries', error)
    })
  }, [entries, hydrated])

  const recordResult = useCallback((input: RecordGameResultInput) => {
    setEntries((previous) => {
      const next = [createEntry(input), ...previous]
      return next.slice(0, MAX_HISTORY_ENTRIES)
    })
  }, [])

  const clearHistory = useCallback(() => {
    setEntries([])
    AsyncStorage.removeItem(STORAGE_KEY).catch((error) => {
      console.warn('[history] Failed to clear persisted history entries', error)
    })
  }, [])

  const solvedCount = useMemo(() => entries.filter((entry) => entry.solved).length, [entries])

  const getEntryById = useCallback(
    (id: string) => entries.find((entry) => entry.id === id),
    [entries],
  )

  const value = useMemo<HistoryContextValue>(
    () => ({
      entries,
      hydrated,
      solvedCount,
      recordResult,
      clearHistory,
      getEntryById,
    }),
    [clearHistory, entries, getEntryById, hydrated, recordResult, solvedCount],
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

const createEntry = (input: RecordGameResultInput): HistoryEntry => {
  const finishedAt = typeof input.finishedAt === 'string' ? input.finishedAt : input.finishedAt?.toISOString()
  const preview = sanitizePreview(input.preview)
  const displayName = input.displayName ?? formatShuffleDisplayName(input.shuffleId)
  return {
    id: generateHistoryId(),
    shuffleId: input.shuffleId,
    displayName,
    solved: input.solved,
    solvable: input.solvable ?? false,
    finishedAt: finishedAt ?? new Date().toISOString(),
    moves: typeof input.moves === 'number' ? input.moves : null,
    durationMs: typeof input.durationMs === 'number' ? input.durationMs : null,
    preview,
  }
}

const mergeEntries = (current: HistoryEntry[], incoming: HistoryEntry[]): HistoryEntry[] => {
  if (!incoming.length) {
    return current
  }

  const map = new Map<string, HistoryEntry>()
  incoming.forEach((entry) => {
    map.set(entry.id, entry)
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

