import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react'

export type HistoryEntry = {
  id: string
  shuffleId: string
  finishedAt: string
  solved: boolean
  solvable: boolean
}

export type RecordGameResultInput = {
  shuffleId: string
  solved: boolean
  solvable?: boolean
  finishedAt?: string | Date
}

type HistoryContextValue = {
  entries: HistoryEntry[]
  hydrated: boolean
  solvedCount: number
  recordResult: (input: RecordGameResultInput) => void
  clearHistory: () => void
}

const HistoryContext = createContext<HistoryContextValue | undefined>(undefined)

export const HistoryProvider = ({ children }: PropsWithChildren) => {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [hydrated] = useState(true)

  const recordResult = useCallback((input: RecordGameResultInput) => {
    setEntries((previous) => [createEntry(input), ...previous])
  }, [])

  const clearHistory = useCallback(() => {
    setEntries([])
  }, [])

  const solvedCount = useMemo(() => entries.filter((entry) => entry.solved).length, [entries])

  const value = useMemo<HistoryContextValue>(
    () => ({
      entries,
      hydrated,
      solvedCount,
      recordResult,
      clearHistory,
    }),
    [clearHistory, entries, hydrated, recordResult, solvedCount],
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
  return {
    id: generateHistoryId(),
    shuffleId: input.shuffleId,
    solved: input.solved,
    solvable: input.solvable ?? false,
    finishedAt: finishedAt ?? new Date().toISOString(),
  }
}

const generateHistoryId = () => `hist_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

