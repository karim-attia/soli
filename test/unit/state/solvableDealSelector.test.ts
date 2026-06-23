import { getSolvableDealsForDrawCount } from '../../../src/data/solvableDealsV2'
import { selectSolvableDeal } from '../../../src/features/klondike/hooks/useSolvableDealSelector'
import type { SolvableHistoryStat } from '../../../src/state/history'

describe('solvable deal selection', () => {
  it('avoids solved deals and prefers the least-played unsolved pool', () => {
    const deals = getSolvableDealsForDrawCount(1)
    const [first, second, third] = deals
    const stats = new Map<string, SolvableHistoryStat>(
      deals.map((deal) => [deal.exactId, { plays: 5, solves: 0 }])
    )
    stats.set(first.exactId, { plays: 1, solves: 1 })
    stats.set(second.exactId, { plays: 4, solves: 0 })
    stats.set(third.exactId, { plays: 2, solves: 0 })

    const selected = selectSolvableDeal(stats, 1, 0)

    expect(selected?.exactId).not.toBe(first.exactId)
    expect(selected?.exactId).toBe(third.exactId)
  })

  it('uses the least-played pool after every curated deal has been solved', () => {
    const deals = getSolvableDealsForDrawCount(1)
    const stats = new Map(
      deals.map((deal, index) => [
        deal.exactId,
        {
          plays: index === 0 ? 1 : 2,
          solves: 1,
        },
      ])
    )

    expect(selectSolvableDeal(stats, 1, 0)?.exactId).toBe(deals[0].exactId)
  })

  it('clamps injected random values to the candidate pool', () => {
    const deals = getSolvableDealsForDrawCount(1)
    const selected = selectSolvableDeal(new Map(), 1, 1)

    expect(selected?.exactId).toBe(deals[deals.length - 1].exactId)
  })
})
