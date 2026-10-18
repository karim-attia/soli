import {
  findLastWinnableIndex,
  MAX_BOUNDARY_PROBES,
  type WinnableProbeResult,
} from '../../../src/solitaire/winnableBoundary'

// The search is solver-injected on purpose, so every case here runs against a
// fake solver: no native module, no board fixtures, and the interesting cases
// (unknown verdicts, boundary at either edge) become one-liners.
//
// Notation: 'W' = solver proved the position winnable, 'U' = proved unwinnable,
// '?' = budget exhaustion ('unknown' — NOT a verdict).
const SYMBOLS: Record<string, WinnableProbeResult> = {
  W: 'winnable',
  U: 'unwinnable',
  '?': 'unknown',
}

const fakeSolver = (line: string) => {
  const calls: number[] = []
  const probe = async (symbol: string, index: number) => {
    calls.push(index)
    return SYMBOLS[symbol]
  }
  return { snapshots: line.split(''), probe, calls }
}

const search = async (line: string, maxProbes?: number) => {
  const { snapshots, probe, calls } = fakeSolver(line)
  const index = await findLastWinnableIndex(snapshots, probe, maxProbes)
  return { index, calls }
}

describe('findLastWinnableIndex', () => {
  it('finds the boundary of a monotone timeline', async () => {
    await expect(search('WWWUU').then((r) => r.index)).resolves.toBe(2)
    await expect(search('WWWWWWWUUUUUUUU').then((r) => r.index)).resolves.toBe(6)
  })

  it('finds a boundary at index 0 (only the deal was winnable)', async () => {
    await expect(search('WUUUU').then((r) => r.index)).resolves.toBe(0)
  })

  it('finds a boundary at the last index', async () => {
    await expect(search('WWWWU').then((r) => r.index)).resolves.toBe(3)
  })

  it('returns the last index when every position is winnable', async () => {
    await expect(search('WWWWW').then((r) => r.index)).resolves.toBe(4)
  })

  it('returns null when no position can be proven winnable', async () => {
    await expect(search('UUUUU').then((r) => r.index)).resolves.toBeNull()
  })

  it('returns null for an empty timeline without calling the solver', async () => {
    const { index, calls } = await search('')
    expect(index).toBeNull()
    expect(calls).toEqual([])
  })

  it('binary-searches instead of scanning', async () => {
    // 63 positions must cost ~log2(63) ≈ 6 probes, never 63. This is the whole
    // performance premise of the feature.
    const { index, calls } = await search('W'.repeat(32) + 'U'.repeat(31))
    expect(index).toBe(31)
    expect(calls.length).toBeLessThanOrEqual(8)
  })

  describe("'unknown' verdicts", () => {
    // NOTE (found while mutation-testing this suite): these fixtures only bite
    // when the '?' sits exactly on a search MIDPOINT — otherwise the binary
    // search never asks about it and the case proves nothing. The first probe
    // of an n-long line is index floor((n-1)/2), hence the paddings below.
    it('widens to the left neighbour instead of treating unknown as a verdict', async () => {
      // First midpoint (index 3) is unproven; index 2 is winnable and index 4
      // is the real boundary. Reading '?' as "unwinnable" would answer 2.
      const { index } = await search('WWW?WUU')
      expect(index).toBe(4)
    })

    it('widens past several unproven positions', async () => {
      // Midpoint 3 and its left neighbour 2 are both unproven; the search has
      // to step right to index 4 to get a verdict.
      const { index } = await search('WW??WUU')
      expect(index).toBe(4)
    })

    it('never claims an index the solver did not prove', async () => {
      // Index 2 (the first midpoint) stays unproven and everything above it is
      // dead. The honest answer is the deepest PROVEN position, 1 — reading
      // '?' as "winnable" would claim 2, which was never established.
      const { index } = await search('WW?UU')
      expect(index).toBe(1)
    })

    it('returns null when the solver never produces a verdict', async () => {
      const { index } = await search('?????')
      expect(index).toBeNull()
    })

    it('never re-probes an index that already answered unknown', async () => {
      // Index 2 is the midpoint of the first window AND of the last one, so an
      // uncached search would ask the solver about it twice.
      const { calls } = await search('WW?UU')
      expect(new Set(calls).size).toBe(calls.length)
    })
  })

  it('stops at the probe budget instead of solving forever', async () => {
    // A solver that only ever answers on the first probe: the budget must cap
    // the run, and the answer must still be one that was actually proven.
    const { index, calls } = await search('W' + '?'.repeat(400))
    expect(calls.length).toBeLessThanOrEqual(MAX_BOUNDARY_PROBES)
    expect(index === null || index === 0).toBe(true)
  })

  it('honours an explicit probe budget', async () => {
    const { calls } = await search('W'.repeat(64), 3)
    expect(calls.length).toBe(3)
  })
})
