// Dev-only history seeding (agent-testing-skill plan, Workstream B).
//
// Why this exists: testing the History tab / stats / solvable-deal balancing used
// to require playing real games or wiping the DB. The Android test device is
// Karim's MAIN PHONE and his real history is precious, so seeding is strictly
// ADDITIVE (only inserts rows with the `seed-` id prefix) and precisely
// REVERSIBLE (clear deletes exactly `id LIKE 'seed-%'` and nothing else).
// Real gameplay rows use `hist_*` ids and can never match the prefix.
import {
  computeDeckChecksum,
  decodeExactDealId,
  formatExactDealDisplayName,
  type ExactDealId,
} from '../solitaire/dealIdentity'
import { TABLEAU_COLUMN_COUNT } from '../solitaire/klondike'
import type { DrawCount } from '../solitaire/drawCount'
import {
  getSolvableDealsForDrawCount,
  isExactDealSolvableForDrawCount,
} from '../data/solvableDealsV2'
import type { HistoryEntry, HistoryPreview } from '../state/history'
import {
  deleteHistoryEntriesByIdPrefix,
  getActiveHistoryEntry,
  insertHistoryEntry,
} from './historyRepository'
import { devLog } from '../utils/devLogger'

export const HISTORY_SEED_ID_PREFIX = 'seed-'

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

// Fixed low-rank permutation ids (valid E1_ payloads, decode to near-canonical
// decks). They are deliberately NOT in the solvable catalog (catalog ids are
// random 226-bit ranks), giving the "random deal" coverage cases.
const RANDOM_DEAL_A = 'E1_1' as ExactDealId
const RANDOM_DEAL_B = 'E1_2' as ExactDealId
const RANDOM_DEAL_C = 'E1_3' as ExactDealId

type SeedSpec = {
  id: string
  exactId: ExactDealId
  drawCount: DrawCount
  status: HistoryEntry['status']
  // How long before "now" the game started; keeps the catalog deterministic
  // relative to seed time while spreading entries over hours/days/weeks so the
  // History tab's date grouping has real material.
  startedAgoMs: number
  moves: number | null
  durationMs: number | null
}

// Initial-deal board derived from the entry's actual deck, so previews render as
// plausibly as a real recorded game (same card backs/fronts a screenshot expects).
const createInitialDealPreview = (exactId: ExactDealId): HistoryPreview => {
  const deck = decodeExactDealId(exactId)
  let next = 0
  const tableau = Array.from({ length: TABLEAU_COLUMN_COUNT }, (_, columnIndex) => ({
    cards: Array.from({ length: columnIndex + 1 }, (_unused, cardIndex) => {
      const card = deck[next]
      next += 1
      return { suit: card.suit, rank: card.rank, faceUp: cardIndex === columnIndex }
    }),
  }))

  return {
    tableau,
    wasteTop: null,
    foundations: { hearts: null, diamonds: null, clubs: null, spades: null },
    stockCount: deck.length - next,
  }
}

// Solved games record their final board: full foundations, empty tableau.
const createSolvedPreview = (): HistoryPreview => ({
  tableau: Array.from({ length: TABLEAU_COLUMN_COUNT }, () => ({ cards: [] })),
  wasteTop: null,
  foundations: {
    hearts: { suit: 'hearts', rank: 13, faceUp: true },
    diamonds: { suit: 'diamonds', rank: 13, faceUp: true },
    clubs: { suit: 'clubs', rank: 13, faceUp: true },
    spades: { suit: 'spades', rank: 13, faceUp: true },
  },
  stockCount: 0,
})

const toSeedEntry = (spec: SeedSpec, now: Date): HistoryEntry => {
  const startedAtMs = now.getTime() - spec.startedAgoMs
  const solved = spec.status === 'solved'
  const solvable = isExactDealSolvableForDrawCount(spec.exactId, spec.drawCount)

  return {
    id: spec.id,
    exactId: spec.exactId,
    deckChecksum: computeDeckChecksum(decodeExactDealId(spec.exactId)),
    displayName: formatExactDealDisplayName(spec.exactId),
    startedAt: new Date(startedAtMs).toISOString(),
    // Mirrors real writers: only solved rows carry finished_at (incomplete rows
    // keep it null, see markOtherActiveRowsIncomplete / createEntry).
    finishedAt: solved
      ? new Date(startedAtMs + (spec.durationMs ?? 0)).toISOString()
      : null,
    solved,
    solvable,
    drawCount: spec.drawCount,
    solvableForDrawCount: solvable ? spec.drawCount : null,
    moves: spec.moves,
    durationMs: spec.durationMs,
    preview: solved ? createSolvedPreview() : createInitialDealPreview(spec.exactId),
    status: spec.status,
  }
}

// Deterministic catalog: same ids every run (idempotent re-seed = delete `seed-%`
// then insert fresh), dates relative to `now`. Coverage: solved draw-1/draw-3
// solvable, solved random (non-solvable) deal, incomplete draw-1/draw-5, one
// solvable deal played twice (replay -> exercises getSolvableDealHistoryStats),
// plus one active entry (inserted conditionally, see seedHistoryEntries).
export const createHistorySeedEntries = (now: Date = new Date()): HistoryEntry[] => {
  // Real catalog ids so solvable badges/stats behave exactly like live data.
  const solvableDraw1A = getSolvableDealsForDrawCount(1)[0].exactId
  const solvableDraw1B = getSolvableDealsForDrawCount(1)[1].exactId
  // Must be a DIFFERENT deal than the draw-1 picks: many catalog deals are
  // solvable for several draw counts, and picking [0] of both lists once yielded
  // the same deal — silently merging the replay stats of two seed groups.
  const solvableDraw3 = getSolvableDealsForDrawCount(3).find(
    (deal) => deal.exactId !== solvableDraw1A && deal.exactId !== solvableDraw1B
  )!.exactId

  const specs: SeedSpec[] = [
    {
      id: 'seed-solved-draw1-a',
      exactId: solvableDraw1A,
      drawCount: 1,
      status: 'solved',
      startedAgoMs: 2 * HOUR_MS,
      moves: 96,
      durationMs: 9 * MINUTE_MS,
    },
    {
      id: 'seed-solved-draw3',
      exactId: solvableDraw3,
      drawCount: 3,
      status: 'solved',
      startedAgoMs: 1 * DAY_MS,
      moves: 131,
      durationMs: 12 * MINUTE_MS,
    },
    {
      id: 'seed-incomplete-draw1',
      exactId: RANDOM_DEAL_A,
      drawCount: 1,
      status: 'incomplete',
      startedAgoMs: 3 * DAY_MS,
      moves: 23,
      durationMs: 3 * MINUTE_MS,
    },
    {
      id: 'seed-solved-random',
      exactId: RANDOM_DEAL_B,
      drawCount: 1,
      status: 'solved',
      startedAgoMs: 6 * DAY_MS,
      moves: 148,
      durationMs: 15 * MINUTE_MS,
    },
    {
      // Same deal as seed-solved-draw1-a: a replayed exact_id makes
      // getSolvableDealHistoryStats report plays=2/solves=1 for this deal.
      id: 'seed-incomplete-draw1-a-replay',
      exactId: solvableDraw1A,
      drawCount: 1,
      status: 'incomplete',
      startedAgoMs: 9 * DAY_MS,
      moves: 41,
      durationMs: 5 * MINUTE_MS,
    },
    {
      id: 'seed-incomplete-draw5',
      exactId: RANDOM_DEAL_C,
      drawCount: 5,
      status: 'incomplete',
      startedAgoMs: 16 * DAY_MS,
      moves: 57,
      durationMs: 7 * MINUTE_MS,
    },
    {
      id: 'seed-solved-draw1-b',
      exactId: solvableDraw1B,
      drawCount: 1,
      status: 'solved',
      startedAgoMs: 25 * DAY_MS,
      moves: 112,
      durationMs: 18 * MINUTE_MS,
    },
    {
      id: 'seed-solved-draw3-weeks-old',
      exactId: solvableDraw3,
      drawCount: 3,
      status: 'solved',
      startedAgoMs: 40 * DAY_MS,
      moves: 104,
      durationMs: 11 * MINUTE_MS,
    },
    {
      // Kept LAST so seedHistoryEntries inserts it after the finished rows;
      // mirrors real active rows: no finished_at, no duration yet.
      id: 'seed-active-draw1',
      exactId: RANDOM_DEAL_A,
      drawCount: 1,
      status: 'active',
      startedAgoMs: 8 * MINUTE_MS,
      moves: 0,
      durationMs: null,
    },
  ]

  return specs.map((spec) => toSeedEntry(spec, now))
}

// Idempotent, additive seed. Ordering matters:
// 1. Delete previous seed rows first (also removes a stale seed active row, so
//    the active check below only ever sees REAL rows).
// 2. Check for a real active row and skip the active seed if one exists — the
//    unique partial index history_entries_one_active would otherwise abort, and
//    insertHistoryEntry's active-row normalization would DEMOTE Karim's real
//    active game to 'incomplete'. Real rows must never be modified by seeding.
export const seedHistoryEntries = async (): Promise<void> => {
  await deleteHistoryEntriesByIdPrefix(HISTORY_SEED_ID_PREFIX)

  const entries = createHistorySeedEntries()
  const existingActive = await getActiveHistoryEntry()
  const toInsert = existingActive
    ? entries.filter((entry) => entry.status !== 'active')
    : entries
  if (existingActive) {
    devLog(
      'info',
      `[HistorySeeds] Skipped active seed: real active row exists (${existingActive.id}).`
    )
  }

  for (const entry of toInsert) {
    await insertHistoryEntry(entry)
  }
  devLog('info', `[HistorySeeds] Inserted ${toInsert.length} seed history entries.`)
}

// Reversal: removes exactly the seeded rows, never real gameplay rows.
export const clearSeededHistoryEntries = async (): Promise<void> => {
  await deleteHistoryEntriesByIdPrefix(HISTORY_SEED_ID_PREFIX)
  devLog('info', '[HistorySeeds] Cleared seed history entries.')
}
