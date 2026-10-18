// Classic "useful move" enumeration (hints plan, F11) — the pure-TS heuristic
// behind the Microsoft-style "no more useful moves" warning AND the Hint
// button's classic fallback when the solver has no winning line. Research:
// docs/product/hints/hints-and-unwinnable-warning.md, sections "Classic
// no-more-moves heuristic research" + "Microsoft-style stuck warning — deep
// dive" (2026-07-23). Blend of Aisleriot's exclusions and PySolFC's stuck
// filter, made exact for this single ruleset.
//
// Counted as useful (in priority order — findFirstUsefulMove returns the
// first hit, which doubles as the classic hint):
//   1. tableau top → foundation
//   2. waste top → foundation
//   3. waste top → tableau (incl. king → empty column)
//   4. full-run tableau→tableau moves that reveal a face-down card or free a
//      column (king-based runs with nothing beneath are skipped — they can
//      only shuffle empty→empty, the classic no-op)
//   5. partial-run splits, only when the card they expose plays to a
//      foundation right now (PySolFC step020 — cuts the equal-rank-run false
//      warnings without counting pure rearrangements)
//   6. draw — exact reachable-stock simulation (draw 1–5, two passes)
// Excluded on purpose, matching every classic app: foundation→tableau digs
// and non-revealing rearrangements. The solver-proven unwinnable warning is
// the separate, stronger feature; this heuristic is additionally CONFIRMED by
// a solver call before the stuck warning ever shows (see useHint).
// Unlimited recycles are assumed throughout: Vegas-rules games (pass limit =
// draw count) never run this enumeration — hints and warnings are off there
// (useHint). A pass-aware variant existed in rounds 1–2 of the scoring plan as
// the Vegas game end and was removed with it (round 3).
//
// Everything here reads only face-up knowledge a player has (face-down cards
// are never inspected — "we do not cheat"), stays allocation-light, and runs
// in microseconds: worst case a few hundred comparisons plus a ≤ ~50-tap
// stock simulation.

import {
  KING_RANK,
  canDropOnFoundation,
  canDropOnTableau,
  type Card,
  type Foundations,
  type GameSnapshot,
  type Tableau,
} from './klondike'
import { cardToSolverCode, type SolverHint } from './solverBridge'

// Narrow board slice so callers (useHint) can pass a full GameState and tests
// can build minimal fixtures.
export type UsefulMoveBoard = Pick<
  GameSnapshot,
  'tableau' | 'foundations' | 'stock' | 'waste' | 'drawCount'
>

const playsToFoundation = (card: Card, foundations: Foundations): boolean =>
  canDropOnFoundation(card, foundations[card.suit], card.suit)

const firstTableauTarget = (
  tableau: Tableau,
  sourceIndex: number,
  stack: Card[]
): number | null => {
  for (let index = 0; index < tableau.length; index += 1) {
    if (index !== sourceIndex && canDropOnTableau(tableau[index], stack)) {
      return index
    }
  }
  return null
}

// Simulates stock taps from the CURRENT (stock, waste) with no plays and
// collects every card that can surface as the waste top. Draw-N phase-correct:
// which cards surface depends on the draw grouping AND on recycles (a played
// waste card regroups the next pass), so this must be re-run fresh after every
// committed move — never cache across moves.
//
// Model: cards surface in a fixed "entry order" — the rest of the current
// stock in draw order (array end first), and after a recycle the whole pile in
// the order cards originally entered the waste (the waste array is append-only
// between recycles, so its array order IS entry order; recycling flips it back
// so its bottom is drawn first, then the current stock repeats). Each tap
// takes the next `drawCount` cards of the sequence and the LAST of that group
// is the visible waste top (draw groups land reversed on the waste). Every
// pass after the first recycle is identical (no plays happen in-simulation),
// so exactly two passes cover all reachable configurations — the "≤ 2 passes"
// bound from the research section. Exported for unit tests (the draw-3
// phase-shift fixtures assert on it).
export const collectReachableWasteTops = (
  stock: readonly Card[],
  waste: readonly Card[],
  drawCount: number
): Card[] => {
  const reachable: Card[] = []
  const collectPassTops = (sequence: readonly Card[]) => {
    for (let start = 0; start < sequence.length; start += drawCount) {
      const groupEnd = Math.min(start + drawCount, sequence.length)
      reachable.push(sequence[groupEnd - 1])
    }
  }

  // Pass 1: the rest of the current stock (array end is drawn next).
  const currentStockDrawOrder = stock.slice().reverse()
  collectPassTops(currentStockDrawOrder)
  // Pass 2: one full recycled pass. Skipped when the waste is empty — the
  // recycled pass would group exactly like pass 1.
  if (waste.length > 0) {
    collectPassTops([...waste, ...currentStockDrawOrder])
  }

  return reachable
}

// First useful move in priority order, shaped as a SolverHint so the Hint
// button fallback can feed it straight into the existing highlight/announce
// pipeline. Null = the position is heuristically stuck.
export const findFirstUsefulMove = (board: UsefulMoveBoard): SolverHint | null => {
  const { tableau, foundations, stock, waste, drawCount } = board

  // 1. Tableau top → foundation.
  for (let index = 0; index < tableau.length; index += 1) {
    const column = tableau[index]
    const top = column[column.length - 1]
    if (top && top.faceUp && playsToFoundation(top, foundations)) {
      return {
        kind: 'move',
        card: cardToSolverCode(top),
        from: { type: 'tableau', index },
        to: { type: 'foundation' },
      }
    }
  }

  const wasteTop = waste[waste.length - 1]

  // 2. Waste top → foundation.
  if (wasteTop && playsToFoundation(wasteTop, foundations)) {
    return {
      kind: 'move',
      card: cardToSolverCode(wasteTop),
      from: { type: 'waste' },
      to: { type: 'foundation' },
    }
  }

  // 3. Waste top → tableau (canDropOnTableau covers king → empty column).
  if (wasteTop) {
    const target = firstTableauTarget(tableau, -1, [wasteTop])
    if (target !== null) {
      return {
        kind: 'move',
        card: cardToSolverCode(wasteTop),
        from: { type: 'waste' },
        to: { type: 'tableau', index: target },
      }
    }
  }

  // 4. Full-run tableau→tableau moves that reveal a face-down card or free a
  //    column. King-based runs with nothing beneath are skipped (they could
  //    only go empty→empty — Aisleriot's classic exclusion).
  for (let index = 0; index < tableau.length; index += 1) {
    const column = tableau[index]
    const runStart = column.findIndex((candidate) => candidate.faceUp)
    if (runStart < 0) {
      continue
    }
    const runBase = column[runStart]
    if (runStart === 0 && runBase.rank === KING_RANK) {
      continue
    }
    const run = column.slice(runStart)
    const target = firstTableauTarget(tableau, index, run)
    if (target !== null) {
      return {
        kind: 'move',
        card: cardToSolverCode(runBase),
        from: { type: 'tableau', index },
        to: { type: 'tableau', index: target },
      }
    }
  }

  // 5. Partial-run splits — only when the exposed card plays to a foundation
  //    right now. (A split whose moving part is the single top card is still a
  //    split: the top card itself was handled by rule 1 only for foundations.)
  for (let index = 0; index < tableau.length; index += 1) {
    const column = tableau[index]
    const runStart = column.findIndex((candidate) => candidate.faceUp)
    if (runStart < 0) {
      continue
    }
    for (let splitIndex = runStart + 1; splitIndex < column.length; splitIndex += 1) {
      const exposed = column[splitIndex - 1]
      if (!playsToFoundation(exposed, foundations)) {
        continue
      }
      const movingStack = column.slice(splitIndex)
      const target = firstTableauTarget(tableau, index, movingStack)
      if (target !== null) {
        return {
          kind: 'move',
          card: cardToSolverCode(column[splitIndex]),
          from: { type: 'tableau', index },
          to: { type: 'tableau', index: target },
        }
      }
    }
  }

  // 6. Reachable-stock scan: does ANY card that can still surface as waste top
  //    (without further plays) go to a foundation or a tableau top?
  for (const candidate of collectReachableWasteTops(stock, waste, drawCount)) {
    if (
      playsToFoundation(candidate, foundations) ||
      firstTableauTarget(tableau, -1, [candidate]) !== null
    ) {
      return { kind: 'draw' }
    }
  }

  return null
}

export const hasUsefulMove = (board: UsefulMoveBoard): boolean =>
  findFirstUsefulMove(board) !== null
