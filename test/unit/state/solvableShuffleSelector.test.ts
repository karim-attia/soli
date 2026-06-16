import { SOLVABLE_SHUFFLES } from '../../../src/data/solvableShuffles'
import { selectSolvableShuffle } from '../../../src/features/klondike/hooks/useSolvableShuffleSelector'

describe('solvable shuffle selection', () => {
  it('avoids solved shuffles and prefers the least-played unsolved pool', () => {
    const [first, second, third] = SOLVABLE_SHUFFLES
    const stats = new Map([
      [first.id, { plays: 1, solves: 1 }],
      [second.id, { plays: 4, solves: 0 }],
      [third.id, { plays: 2, solves: 0 }],
    ])

    const selected = selectSolvableShuffle(stats, 0)

    expect(selected?.id).not.toBe(first.id)
    expect(stats.get(selected?.id ?? '')?.plays ?? 0).toBe(0)
  })

  it('uses the least-played pool after every curated shuffle has been solved', () => {
    const stats = new Map(
      SOLVABLE_SHUFFLES.map((shuffle, index) => [
        shuffle.id,
        {
          plays: index === 0 ? 1 : 2,
          solves: 1,
        },
      ])
    )

    expect(selectSolvableShuffle(stats, 0)?.id).toBe(SOLVABLE_SHUFFLES[0].id)
  })

  it('clamps injected random values to the candidate pool', () => {
    const selected = selectSolvableShuffle(new Map(), 1)

    expect(selected?.id).toBe(SOLVABLE_SHUFFLES[SOLVABLE_SHUFFLES.length - 1].id)
  })
})
