import { SOLVABLE_DEALS_V2 } from './solvableDealsV2.generated'
import {
  EXACT_ID_PREFIX,
  hasDrawCountInMask,
  type ExactDealId,
} from '../solitaire/dealIdentity'
import type { DrawCount } from '../solitaire/drawCount'

export type SolvableDealV2 = {
  exactId: ExactDealId
  drawMask: number
}

let parsedDeals: readonly SolvableDealV2[] | null = null
let maskByExactId: ReadonlyMap<string, number> | null = null
const dealsByDrawCount = new Map<DrawCount, readonly SolvableDealV2[]>()

export const getSolvableDealsV2 = (): readonly SolvableDealV2[] => {
  if (!parsedDeals) {
    parsedDeals = SOLVABLE_DEALS_V2.map(parseGeneratedRow)
  }
  return parsedDeals
}

export const getSolvableDealMaskByExactId = (): ReadonlyMap<string, number> => {
  if (!maskByExactId) {
    maskByExactId = new Map(
      getSolvableDealsV2().map((deal) => [deal.exactId, deal.drawMask])
    )
  }
  return maskByExactId
}

export const getSolvableDealsForDrawCount = (
  drawCount: DrawCount
): readonly SolvableDealV2[] => {
  const cached = dealsByDrawCount.get(drawCount)
  if (cached) {
    return cached
  }

  const deals = getSolvableDealsV2().filter((deal) =>
    hasDrawCountInMask(deal.drawMask, drawCount)
  )
  dealsByDrawCount.set(drawCount, deals)
  return deals
}

export const isExactDealSolvableForDrawCount = (
  exactId: string | null | undefined,
  drawCount: DrawCount
): boolean => {
  if (!exactId) {
    return false
  }
  const mask = getSolvableDealMaskByExactId().get(exactId)
  return typeof mask === 'number' && hasDrawCountInMask(mask, drawCount)
}

const parseGeneratedRow = (row: string): SolvableDealV2 => {
  const [exactId, rawMask] = row.split(':')
  // Cheap structural checks only. Full BigInt decoding of every row here
  // (parseExactDealId) blocked the JS thread at first catalog access during
  // startup (~86ms in V8 for 45k rows, far slower on Hermes devices). The deep
  // validation now lives in test/unit/data/solvableDealsV2.generated.test.ts,
  // so a bad regeneration fails tests instead of taxing every app launch.
  if (!exactId || !exactId.startsWith(EXACT_ID_PREFIX)) {
    throw new Error(`Invalid v2 solvable exact ID row: ${row}`)
  }
  const validatedExactId = exactId as ExactDealId

  const drawMask = Number(rawMask)
  if (!Number.isInteger(drawMask) || drawMask <= 0 || drawMask > 31) {
    throw new Error(`Invalid v2 solvable draw mask row: ${row}`)
  }

  return {
    exactId: validatedExactId,
    drawMask,
  }
}
