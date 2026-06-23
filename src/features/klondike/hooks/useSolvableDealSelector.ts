import { useCallback } from 'react'

import {
  getSolvableDealsForDrawCount,
  type SolvableDealV2,
} from '../../../data/solvableDealsV2'
import type { SolvableHistoryStat } from '../../../state/history'
import { randomUnitInterval } from '../../../solitaire/dealIdentity'
import { DEFAULT_DRAW_COUNT, type DrawCount } from '../../../solitaire/drawCount'

export const selectSolvableDeal = (
  solvableStats: ReadonlyMap<string, SolvableHistoryStat>,
  drawCount: DrawCount = DEFAULT_DRAW_COUNT,
  randomValue = randomUnitInterval()
): SolvableDealV2 | null => {
  // Phase 1 deliberately has no runtime legacy fallback: an empty v2 catalog should
  // behave like no curated deal exists, not silently deal old tableau-only layouts.
  const deals = getSolvableDealsForDrawCount(drawCount)
  if (!deals.length) {
    return null
  }

  const unsolved = deals.filter((deal) => {
    const record = solvableStats.get(deal.exactId)
    return !record || record.solves === 0
  })

  const pool = unsolved.length ? unsolved : deals
  if (!pool.length) {
    return null
  }

  let minimumPlayCount = Number.POSITIVE_INFINITY
  const candidates: SolvableDealV2[] = []

  for (const deal of pool) {
    const plays = solvableStats.get(deal.exactId)?.plays ?? 0
    if (plays < minimumPlayCount) {
      minimumPlayCount = plays
      candidates.length = 0
      candidates.push(deal)
    } else if (plays === minimumPlayCount) {
      candidates.push(deal)
    }
  }

  if (!candidates.length) {
    return pool[0]
  }

  // Catalog selector: choose among bundled exact-ID deals already proven for the
  // requested draw count. The `randomValue` only breaks ties; it does not create decks.
  const randomIndex = Math.floor(Math.max(randomValue, 0) * candidates.length)
  return candidates[Math.min(randomIndex, candidates.length - 1)]
}

// Catalog filtering owns the draw-count guarantee; history stats only balance repeats.
export const useSolvableDealSelector = (
  solvableStats: ReadonlyMap<string, SolvableHistoryStat>,
  drawCount: DrawCount
) => {
  return useCallback(
    () => selectSolvableDeal(solvableStats, drawCount),
    [drawCount, solvableStats]
  )
}
