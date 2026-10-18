// Scoring (docs/product/scoring/scoring.md). Pure module: no RN imports, so the
// reducer, the HUD and the history screen share one definition.
//
// Product decisions (2026-10-11):
// - BOTH tallies are always computed and stored on every GameSnapshot; the
//   Settings → Scoring picker only selects which one the HUD shows (or none).
//   Switching the setting mid-game therefore shows the real score of the game
//   so far, and history rows store both so the setting stays display-only.
// - Untimed Standard (Windows Solitaire point table, no −2/10 s decay, no time
//   bonus; timed scoring was rejected by the user 2026-10-12 — arbitrary huge
//   numbers that would swamp a cumulative bankroll).
// - Vegas is a RULES mode since Phase 2 (2026-10-12): a game dealt with Scoring =
//   Vegas carries `vegasRules` on its snapshot and may pass through the stock only
//   as many times as its draw count (see recyclesAllowed). Games dealt under Off/
//   Standard stay unlimited, so the bundled solver, the solvable-deal catalog and
//   the two-pass useful-moves scan keep their unlimited-recycle assumption there;
//   Vegas-rules games run with hints and warnings off entirely (useHint).
// - No undo penalty, no hint charge: the score is a pure function of the board
//   timeline, which is exactly why undo/scrub/replay need no special handling.
import type { DrawCount } from './drawCount'

// Pass limit = draw count (Draw 1 → 1 pass = 0 recycles, Draw 3 → 3 passes, …).
// Soli's own rule for Draw 2/4/5 (no app offers those in Vegas): it generalises
// the only two conventions that exist (1 → 1, 3 → 3) and keeps the amount of
// stock a player can see roughly constant (N passes ≈ 24 waste-top exposures at
// every draw count). MobilityWare's literal "3 → 3, otherwise 1" would make Draw 5
// a single ~5-card pass. Plan: docs/product/scoring/scoring.md § Phase 2.
type PassRuleInput = { vegasRules: boolean; drawCount: DrawCount }

export const recyclesAllowed = ({ vegasRules, drawCount }: PassRuleInput): number =>
  vegasRules ? drawCount - 1 : Infinity

// Infinity on unlimited games; callers that show a count check Number.isFinite.
export const recyclesLeft = (
  game: PassRuleInput & { stockPasses: number }
): number => Math.max(0, recyclesAllowed(game) - game.stockPasses)

export const canRecycle = (
  game: PassRuleInput & { stockPasses: number; waste: readonly unknown[] }
): boolean => game.waste.length > 0 && recyclesLeft(game) > 0

export type ScoreTally = {
  standard: number
  vegas: number
}

// Vegas: you "buy the deck" for $52 at deal time.
const VEGAS_BUY_IN = 52

export const INITIAL_SCORE: ScoreTally = { standard: 0, vegas: -VEGAS_BUY_IN }

// Windows Solitaire table (plan § Research). Vegas pays $5 per card landing on a
// foundation; a card played back down refunds the $5 (Soli decision — sources are
// silent or forbid the move; keeping the board rules identical in every mode
// means Vegas is always `5 × cardsOnFoundations − 52`).
const STANDARD_WASTE_TO_TABLEAU = 5
const STANDARD_TO_FOUNDATION = 10
const STANDARD_FLIP = 5
const STANDARD_FOUNDATION_TO_TABLEAU = -15
// Recycling the waste: Draw 1 charges every recycle; Draw ≥ 2 follows the
// Windows Draw-3 rule (first two recycles free, −20 from the third on).
const STANDARD_RECYCLE_DRAW_1 = -100
const STANDARD_RECYCLE_DRAW_MANY = -20
const FREE_RECYCLES_DRAW_MANY = 2
const VEGAS_PER_FOUNDATION_CARD = 5

type MoveScoreInput = {
  source: 'tableau' | 'waste' | 'foundation'
  targetType: 'tableau' | 'foundation'
  // Whether the move exposed a face-down tableau card.
  flipped: boolean
}

export const scoreMove = ({ source, targetType, flipped }: MoveScoreInput): ScoreTally => {
  let standard = flipped ? STANDARD_FLIP : 0
  let vegas = 0
  if (targetType === 'foundation') {
    standard += STANDARD_TO_FOUNDATION
    vegas += VEGAS_PER_FOUNDATION_CARD
  } else if (source === 'foundation') {
    standard += STANDARD_FOUNDATION_TO_TABLEAU
    vegas -= VEGAS_PER_FOUNDATION_CARD
  } else if (source === 'waste') {
    standard += STANDARD_WASTE_TO_TABLEAU
  }
  return { standard, vegas }
}

// `recyclesSoFar` = recycles BEFORE this one (GameSnapshot.stockPasses).
export const scoreRecycle = ({
  drawCount,
  recyclesSoFar,
}: {
  drawCount: DrawCount
  recyclesSoFar: number
}): ScoreTally => {
  if (drawCount === 1) {
    return { standard: STANDARD_RECYCLE_DRAW_1, vegas: 0 }
  }
  return {
    standard: recyclesSoFar >= FREE_RECYCLES_DRAW_MANY ? STANDARD_RECYCLE_DRAW_MANY : 0,
    vegas: 0,
  }
}

// Standard is clamped at 0 like Windows (keeps an early −100 recycle from
// showing "−95"); Vegas is naturally negative and is NOT clamped.
export const addScore = (tally: ScoreTally, delta: ScoreTally): ScoreTally => ({
  standard: Math.max(0, tally.standard + delta.standard),
  vegas: tally.vegas + delta.vegas,
})

// U+2212 minus for typographic consistency with the badge font.
const MINUS_SIGN = '−'

// Device-locale digit grouping ("1,240" / "1.240" / "1’240"). Hermes ships Intl on
// both platforms (the history screen already relies on Intl.DateTimeFormat), and a
// Hermes build without Intl degrades toLocaleString to toString — it never throws.
// Untimed Standard maxes at 740, so grouping only shows up once timed scoring
// (follow-up F1) exists; the helper is here so both call sites agree from day one.
export const formatStandardScore = (value: number): string =>
  Math.max(0, Math.trunc(value)).toLocaleString()

// `−$52` / `$0` / `$158`. Literal `$`: Vegas dollars are notional, not the device
// currency. No `+` for profit — user decision 2026-10-11 (the total reads fine on
// its own); re-adding it is a one-liner here if wanted.
export const formatVegasScore = (value: number): string => {
  const amount = Math.abs(Math.trunc(value)).toLocaleString()
  return value < 0 ? `${MINUS_SIGN}$${amount}` : `$${amount}`
}

// Screen-reader form of the Vegas amount ("minus 47 dollars"): the badge's
// U+2212 and literal `$` are not read reliably. Always plural — the tally is
// −52 + 5 × n, so ±1 can never occur.
export const formatVegasScoreSpoken = (value: number): string => {
  const amount = Math.abs(Math.trunc(value))
  return `${value < 0 ? 'minus ' : ''}${amount} dollars`
}

// No Vegas "game over" text any more (round 3, 2026-10-13): rounds 1–2 showed a
// "Game over — result −$47" bubble from the pass-aware stuck heuristic; it could
// fire early without the solver and the user prefers to decide for themselves
// when a casino game is over. useHint simply runs with warnings off on Vegas
// games, and the dock offers New Game once the stock is exhausted.
