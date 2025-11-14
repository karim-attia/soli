import { useCallback } from 'react'

import {
  SOLVABLE_SHUFFLES,
  extractSolvableBaseId,
  type SolvableShuffleConfig,
} from '../../../data/solvableShuffles'
import type { HistoryEntry } from '../../../state/history'

export const useSolvableShuffleSelector = (historyEntries: HistoryEntry[]) => {
  return useCallback(() => {
    if (!SOLVABLE_SHUFFLES.length) {
      return null
    }

    const stats = new Map<string, { plays: number; solves: number }>()

    historyEntries.forEach((entry) => {
      if (!entry.solvable) {
        return
      }
      const baseId = extractSolvableBaseId(entry.shuffleId) ?? entry.shuffleId
      if (!baseId) {
        return
      }
      const record = stats.get(baseId) ?? { plays: 0, solves: 0 }
      record.plays += 1
      if (entry.solved) {
        record.solves += 1
      }
      stats.set(baseId, record)
    })

    const unsolved = SOLVABLE_SHUFFLES.filter((shuffle) => {
      const record = stats.get(shuffle.id)
      return !record || record.solves === 0
    })

    const pool = unsolved.length ? unsolved : SOLVABLE_SHUFFLES
    if (!pool.length) {
      return null
    }

    let minimumPlayCount = Number.POSITIVE_INFINITY
    const candidates: SolvableShuffleConfig[] = []

    for (const shuffle of pool) {
      const plays = stats.get(shuffle.id)?.plays ?? 0
      if (plays < minimumPlayCount) {
        minimumPlayCount = plays
        candidates.length = 0
        candidates.push(shuffle)
      } else if (plays === minimumPlayCount) {
        candidates.push(shuffle)
      }
    }

    if (!candidates.length) {
      return pool[0]
    }

    const randomIndex = Math.floor(Math.random() * candidates.length)
    return candidates[randomIndex]
  }, [historyEntries])
}




