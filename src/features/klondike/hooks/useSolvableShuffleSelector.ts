import { useCallback } from 'react'

import {
  SOLVABLE_SHUFFLES,
  type SolvableShuffleConfig,
} from '../../../data/solvableShuffles'
import type { HistoryEntry, SolvableHistoryStat } from '../../../state/history'

export const isDrawOneSolvabilityResult = (entry: HistoryEntry): boolean =>
  entry.solvable && entry.drawCount === 1

export const selectSolvableShuffle = (
  solvableStats: ReadonlyMap<string, SolvableHistoryStat>,
  randomValue = Math.random()
): SolvableShuffleConfig | null => {
  if (!SOLVABLE_SHUFFLES.length) {
    return null
  }

  const unsolved = SOLVABLE_SHUFFLES.filter((shuffle) => {
    const record = solvableStats.get(shuffle.id)
    return !record || record.solves === 0
  })

  const pool = unsolved.length ? unsolved : SOLVABLE_SHUFFLES
  if (!pool.length) {
    return null
  }

  let minimumPlayCount = Number.POSITIVE_INFINITY
  const candidates: SolvableShuffleConfig[] = []

  for (const shuffle of pool) {
    const plays = solvableStats.get(shuffle.id)?.plays ?? 0
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

  const randomIndex = Math.floor(Math.max(randomValue, 0) * candidates.length)
  return candidates[Math.min(randomIndex, candidates.length - 1)]
}

// History owns Draw 1 filtering and base-ID normalization so pagination cannot skew selection.
export const useSolvableShuffleSelector = (
  solvableStats: ReadonlyMap<string, SolvableHistoryStat>
) => {
  return useCallback(() => selectSolvableShuffle(solvableStats), [solvableStats])
}
