import { SOLVABLE_DEALS_V2 } from '../../../src/data/solvableDealsV2.generated'
import { parseExactDealId } from '../../../src/solitaire/dealIdentity'

// The runtime catalog parser (src/data/solvableDealsV2.ts) intentionally skips
// per-row BigInt validation for startup performance. This test carries that deep
// validation instead: every generated row must decode to a valid 52-card
// permutation rank and carry a draw mask in range.
describe('solvableDealsV2 generated catalog', () => {
  it('contains only decodable exact deal IDs with valid draw masks', () => {
    const violations: string[] = []

    for (const row of SOLVABLE_DEALS_V2) {
      const [exactId, rawMask] = row.split(':')
      try {
        parseExactDealId(exactId)
      } catch (error) {
        violations.push(`${row} (${(error as Error).message})`)
        continue
      }

      const drawMask = Number(rawMask)
      if (!Number.isInteger(drawMask) || drawMask <= 0 || drawMask > 31) {
        violations.push(`${row} (invalid draw mask)`)
      }
    }

    expect(violations).toEqual([])
    expect(SOLVABLE_DEALS_V2.length).toBeGreaterThan(0)
  })
})
