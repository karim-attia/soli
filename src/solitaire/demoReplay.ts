import {
  createGameStateFromExactId,
  getCardStableId,
  klondikeReducer,
  type GameAction,
  type GameState,
  type MoveTarget,
  type Rank,
  type Selection,
  type Suit,
} from './klondike'
import type { DrawCount } from './drawCount'
import type { DealCard, ExactDealId } from './dealIdentity'
// Value import from ../data is safe: demoAutoSolvePlaylist.ts only imports TYPES
// from this module, so there is no runtime cycle.
import { getDemoAutoSolvePlaylist } from '../data/demoAutoSolvePlaylist'

// Same shape as dealIdentity's DealCard (clean-code review #13: was a third
// structural clone of {suit, rank}).
export type DemoReplayCard = Readonly<DealCard>

export type DemoReplayMoveSource =
  | { readonly type: 'waste' }
  | { readonly type: 'tableau'; readonly columnIndex: number }
  | { readonly type: 'foundation'; readonly suit: Suit }

export type DemoReplayMoveTarget =
  | { readonly type: 'tableau'; readonly columnIndex: number }
  | { readonly type: 'foundation'; readonly suit: Suit }

export type DemoReplayMove =
  | { readonly type: 'draw' }
  | {
      readonly type: 'move'
      readonly card: DemoReplayCard
      readonly source: DemoReplayMoveSource
      readonly target: DemoReplayMoveTarget
    }

export type DemoAutoSolvePlaylistEntry = {
  readonly id: string
  readonly seedType: 'default'
  readonly seed: number
  readonly drawCount: DrawCount
  readonly exactId: ExactDealId
  readonly primitiveMoveCount: number
  readonly undoProbeMoveIndices: readonly number[]
  readonly moves: readonly DemoReplayMove[]
}

export type DemoUndoProbe = {
  readonly moveIndex: number
  readonly depth: number
}

// Back-and-forth undo probe depths live here in code instead of the generated
// fixture on purpose: regenerating the ~617 KB Lonelybot fixture for a tiny
// semantic change risks a different playlist if solver output shifts, and buys
// nothing at runtime (demo-sheet-undo-probes-info-hud, approach A). The fixture
// keeps owning the probe *locations* (undoProbeMoveIndices); this table only
// deepens the FIRST probe of selected playlist entries.
const FIRST_PROBE_DEPTH_BY_PLAYLIST_INDEX: Readonly<Record<number, number>> = {
  0: 3,
  2: 2,
  4: 2,
}

export const getDemoUndoProbePlan = (
  entry: DemoAutoSolvePlaylistEntry,
  playlistIndex: number
): DemoUndoProbe[] =>
  entry.undoProbeMoveIndices.map((moveIndex, probeIndex) => {
    const plannedDepth =
      probeIndex === 0 ? (FIRST_PROBE_DEPTH_BY_PLAYLIST_INDEX[playlistIndex] ?? 1) : 1
    // Fixture probes always sit at moveIndex >= 3, so this clamp is defensive
    // only: a probe can never undo past the start of the game.
    return { moveIndex, depth: Math.min(plannedDepth, moveIndex + 1) }
  })

export type DemoReplayActionResolution =
  | {
      readonly ok: true
      readonly action: GameAction
      readonly selection: Selection | null
    }
  | { readonly ok: false; readonly reason: string }

export const createDemoReplayGameState = (entry: DemoAutoSolvePlaylistEntry): GameState =>
  createGameStateFromExactId(entry.exactId, entry.drawCount, {
    // Lonelybot solution traces start before any stock card is drawn. The normal
    // player-facing factories keep their initial reveal; this opt-out is only for
    // replaying solver-authored paths exactly.
    revealInitialWaste: false,
    autoUpEnabled: false,
  })

export const resolveDemoReplayAction = (
  state: GameState,
  move: DemoReplayMove
): DemoReplayActionResolution => {
  if (move.type === 'draw') {
    if (!state.stock.length && !state.waste.length) {
      return { ok: false, reason: 'Cannot draw or recycle with empty stock and waste.' }
    }
    return { ok: true, action: { type: 'DRAW_OR_RECYCLE' }, selection: null }
  }

  const selection = resolveSelection(state, move)
  if (!selection.ok) {
    return selection
  }

  const target = resolveTarget(move.target)
  return {
    ok: true,
    action: {
      type: 'APPLY_MOVE',
      selection: selection.selection,
      target,
    },
    selection: selection.selection,
  }
}

export const applyDemoReplayMoveForValidation = (
  state: GameState,
  move: DemoReplayMove
): GameState => {
  const resolved = resolveDemoReplayAction(state, move)
  if (!resolved.ok) {
    throw new Error(resolved.reason)
  }

  const nextState = klondikeReducer(state, resolved.action)
  if (nextState === state) {
    throw new Error(`Replay action was rejected: ${JSON.stringify(move)}`)
  }
  return nextState
}

const resolveSelection = (
  state: GameState,
  move: Extract<DemoReplayMove, { type: 'move' }>
):
  | { readonly ok: true; readonly selection: Selection }
  | { readonly ok: false; readonly reason: string } => {
  if (move.source.type === 'waste') {
    const topWaste = state.waste[state.waste.length - 1]
    if (!topWaste || !matchesReplayCard(topWaste, move.card)) {
      return {
        ok: false,
        reason: `Expected ${describeReplayCard(move.card)} on waste, found ${describeGameCard(topWaste)}.`,
      }
    }
    return { ok: true, selection: { source: 'waste' } }
  }

  if (move.source.type === 'foundation') {
    const pile = state.foundations[move.source.suit]
    const topFoundation = pile[pile.length - 1]
    if (!topFoundation || !matchesReplayCard(topFoundation, move.card)) {
      return {
        ok: false,
        reason: `Expected ${describeReplayCard(move.card)} on ${move.source.suit} foundation, found ${describeGameCard(topFoundation)}.`,
      }
    }
    return { ok: true, selection: { source: 'foundation', suit: move.source.suit } }
  }

  const column = state.tableau[move.source.columnIndex]
  if (!column) {
    return {
      ok: false,
      reason: `Missing tableau column ${move.source.columnIndex}.`,
    }
  }

  const cardIndex = column.findIndex((card) => matchesReplayCard(card, move.card))
  const card = column[cardIndex]
  if (!card) {
    return {
      ok: false,
      reason: `Expected ${describeReplayCard(move.card)} in tableau column ${move.source.columnIndex}.`,
    }
  }
  if (!card.faceUp) {
    return {
      ok: false,
      reason: `Expected ${describeReplayCard(move.card)} to be face up in tableau column ${move.source.columnIndex}.`,
    }
  }

  return {
    ok: true,
    selection: {
      source: 'tableau',
      columnIndex: move.source.columnIndex,
      cardIndex,
    },
  }
}

const resolveTarget = (target: DemoReplayMoveTarget): MoveTarget =>
  target.type === 'foundation'
    ? { type: 'foundation', suit: target.suit }
    : { type: 'tableau', columnIndex: target.columnIndex }

const matchesReplayCard = (
  card: { suit: Suit; rank: Rank } | null | undefined,
  replayCard: DemoReplayCard
): boolean =>
  Boolean(card && card.suit === replayCard.suit && card.rank === replayCard.rank)

const describeReplayCard = (card: DemoReplayCard): string => getCardStableId(card)

const describeGameCard = (card: { suit: Suit; rank: Rank } | null | undefined): string =>
  card ? getCardStableId(card) : 'nothing'

// --- "Far game, scrubbed to middle" fixture (scrubber-test-automation) ---
// 80 steps into playlist entry 0 (244 primitive steps) keeps mid-game texture
// (face-down cards, stock cycling) while giving 40 undos + 40 redos; tunable.
export const SCRUBBED_DEMO_STEPS = 80
export const SCRUBBED_DEMO_SCRUB_INDEX = 40

// Most deterministic fixtures below fold playlist entry 0 (`default-0-draw-1`).
// The index is a parameter because the STUCK fixture needs a different deal:
// entry 0's shortest stuck-AND-unwinnable position is 34 moves off its solution
// line, while entry 19 (`default-20-draw-1`) has one four moves off its own (see
// createStuckGameState). Every entry is a solved deal, so a
// fold prefix is provably winnable whichever one is used.
const getReplayFixtureEntry = (index = 0): DemoAutoSolvePlaylistEntry => {
  const entry = getDemoAutoSolvePlaylist()[index]
  if (!entry) {
    throw new Error(`Demo auto-solve playlist has no entry ${index}.`)
  }
  return entry
}

// Shared fold for the fixtures below (agent-testing-skill C5: generalized instead
// of duplicated). Every folded move goes through applyDemoReplayMoveForValidation
// on purpose — it THROWS on mismatch, so a future playlist regeneration cannot
// silently change a fixture.
const foldReplayFixture = (
  entry: DemoAutoSolvePlaylistEntry,
  steps: number
): GameState => {
  let state = createDemoReplayGameState(entry)
  for (const move of entry.moves.slice(0, steps)) {
    state = applyDemoReplayMoveForValidation(state, move)
  }
  return state
}

const clampInt = (value: number, min: number, max: number): number =>
  Math.min(Math.max(Math.round(value), min), max)

// C5: deep links pass arbitrary integers; clamp them to the fixture's real bounds
// instead of throwing. Pure (the launcher devLogs when `clamped` is true).
// Defaults stay SCRUBBED_DEMO_STEPS/SCRUBBED_DEMO_SCRUB_INDEX so the pinned card
// assertions in demoReplay.scrubbed.test.ts (and device tests copying its labels)
// remain valid.
export const resolveScrubbedDemoOptions = (options?: {
  steps?: number
  scrubIndex?: number
}): { steps: number; scrubIndex: number; clamped: boolean } => {
  const maxSteps = getReplayFixtureEntry().moves.length
  const requestedSteps = options?.steps ?? SCRUBBED_DEMO_STEPS
  const steps = clampInt(requestedSteps, 1, maxSteps)
  const requestedScrubIndex = options?.scrubIndex ?? SCRUBBED_DEMO_SCRUB_INDEX
  const scrubIndex = clampInt(requestedScrubIndex, 0, steps)
  return {
    steps,
    scrubIndex,
    clamped: steps !== requestedSteps || scrubIndex !== requestedScrubIndex,
  }
}

// Deterministic mid-game state for scrubber/undo/redo device tests: same deal
// (playlist entry `default-0-draw-1`), same board, same labels on every launch,
// so tests can assert exact cards and the readout "position 40 of 80".
// Because the fold runs the real reducer, the state carries a real exactId and
// a populated moveLog → the move-log persistence path replays it after
// kill/relaunch with full undo/redo depths (acceptance criterion 6).
export const createScrubbedMidGameState = (options?: {
  steps?: number
  scrubIndex?: number
}): GameState => {
  const steps = options?.steps ?? SCRUBBED_DEMO_STEPS
  const scrubIndex = options?.scrubIndex ?? SCRUBBED_DEMO_SCRUB_INDEX
  const entry = getReplayFixtureEntry()
  if (steps > entry.moves.length) {
    // Still throws (not clamps) on out-of-range direct calls: only reachable on
    // fixture drift; deep links clamp via resolveScrubbedDemoOptions first.
    throw new Error(
      `Scrubbed demo needs ${steps} steps but playlist entry ${entry.id} has ${entry.moves.length}.`
    )
  }

  const state = foldReplayFixture(entry, steps)
  return klondikeReducer(state, { type: 'SCRUB_TO_INDEX', index: scrubIndex })
}

// --- "Near win" fixture (agent-testing-skill C5) ---
export const NEARWIN_DEMO_DEFAULT_MOVES_LEFT = 1

// Clamp the ?demo=nearwin&left=N param: at least 1 move left (0 would be an
// already-won board — the point is a REAL manually-played win), at most the full
// solution (= fresh replay board).
export const resolveNearWinMovesLeft = (
  movesLeft?: number
): { movesLeft: number; clamped: boolean } => {
  const maxMoves = getReplayFixtureEntry().moves.length
  const requested = movesLeft ?? NEARWIN_DEMO_DEFAULT_MOVES_LEFT
  const resolved = clampInt(requested, 1, maxMoves)
  return { movesLeft: resolved, clamped: resolved !== requested }
}

// Replays the playlist solution to `movesLeft` primitive steps before completion,
// Auto Up off (inherited from createDemoReplayGameState) — an agent then plays the
// final move(s) manually and gets a real win + celebration end-to-end.
export const createNearWinGameState = (
  movesLeft: number = NEARWIN_DEMO_DEFAULT_MOVES_LEFT
): GameState => {
  const entry = getReplayFixtureEntry()
  const { movesLeft: resolved } = resolveNearWinMovesLeft(movesLeft)
  return foldReplayFixture(entry, entry.moves.length - resolved)
}

// --- "Unwinnable" fixture (rewind-to-winnable) ---
// Exercises the `unwinnable` WARNING MODE: a position the solver can PROVE is
// lost while legal moves are still available, whose own history is provably
// winnable — i.e. a real rewind boundary — reachable from one deep link.
// Before this existed the only way to reach a lost game was to deal random
// deals until one died, which took minutes and was not reproducible.
//
// Naming (2026-09-10, after a device session): the fixtures are named after
// the warning MODE each one trips, because that is the distinction that
// matters and it confused a reader once already. This board is lost but NOT
// stuck — draws and plays remain legal — so only the solver-proven
// `unwinnable` mode warns here. For the DEFAULT `noUsefulMoves` mode use
// createStuckGameState below.
//
// Recipe: replay 81 primitive steps of playlist entry 0's solution, then play
// ONE deliberately bad move. Step 81 is a draw that puts the K♠ on the waste;
// the killing move drops that K♠ into the board's only empty column. That
// column is the sole route to unload tableau column 7 (six face-down cards on
// top of the A♠), so filling it with a king that nothing can ever move again
// is irreversible — and it is exactly the move a real player would make.
//
// VERIFIED against the vendored Rust solver (rust/, `solve_request_json`,
// budget 2000 ms, 2026-09-10) — both verdicts are pinned as a permanent
// regression test in rust/soli-solver-ffi/tests/solver_tests.rs
// (`unwinnable_demo_fixture_boundary_is_real`):
//   after 81 solution steps  → {"status":"solved"}       (0.1 ms)
//   after the K♠ move        → {"status":"unsolvable"}   (0.1 ms)
// So the last winnable timeline index is 81 and the current position (82) is
// dead. Verified on a real phone: `[rewind] boundary=81 timeline=83`.
// Change either constant below and the Rust test must be re-verified.
export const UNWINNABLE_DEMO_SOLUTION_STEPS = 81
// Exported so the tests (and any future device recipe) name the same move.
export const UNWINNABLE_DEMO_KILLING_MOVE: DemoReplayMove = {
  type: 'move',
  card: { suit: 'spades', rank: 13 },
  source: { type: 'waste' },
  target: { type: 'tableau', columnIndex: 1 },
}

// Auto Up off (inherited from createDemoReplayGameState) so the board does not
// clean itself up underneath the warning, and the fold runs the real reducer,
// so the state carries a real exactId plus an 82-entry moveLog and 82 undo
// snapshots — the binary search in useRewindToWinnable gets a genuine timeline
// to search (83 indices → ~7 solver probes).
export const createUnwinnableGameState = (): GameState => {
  const entry = getReplayFixtureEntry()
  const state = foldReplayFixture(entry, UNWINNABLE_DEMO_SOLUTION_STEPS)
  // Same THROWING validation as the fold: if a regenerated playlist ever left a
  // different card on the waste, this fails loudly instead of silently shipping
  // a fixture that is not actually dead.
  return applyDemoReplayMoveForValidation(state, UNWINNABLE_DEMO_KILLING_MOVE)
}

// --- "Stuck" fixture (rewind-to-winnable, round 2) ---
// Exercises the DEFAULT `noUsefulMoves` WARNING MODE — the one that actually
// ships and the one players see. That mode's predicate is exactly
// `stock.length === 0 && !hasUsefulMove(board)` (useHint's background check),
// i.e. the deck is played out AND the classic heuristic finds no useful move.
// The `unwinnable` fixture above does NOT satisfy it (that board is lost but
// still has plays), which is precisely why this second fixture exists.
//
// The heuristic alone is NOT enough: the app solver-CONFIRMS before it warns,
// and a heuristically-stuck board is very often still winnable (the heuristic
// deliberately ignores non-revealing rearrangements and foundation digs — the
// first 100 candidates the search produced were all solver-`solved`). So this
// board had to satisfy the predicate AND be proven unsolvable.
//
// Deal: playlist entry 19 (`default-20-draw-1`), NOT entry 0. Entry 0 does have
// stuck-and-unwinnable positions, but the shortest is 34 moves off its solution
// line; this one is four, which is a fixture a human can still read.
//
// Recipe: replay 210 primitive steps of entry 19's solution, then play four
// deliberately bad moves: 6♦ from the waste up to its foundation (the move that
// actually kills it — that 6♦ was the last red six, and the 5♣ sitting on the
// A♠ needs a red six to move onto), then the lone 6♣ out of column 5 (which
// empties it), then two draws to run the stock out. The A♠ ends up buried under
// three cards in column 7 with no spade on its foundation, and nothing can dig
// it out.
//
// VERIFIED against the vendored Rust solver (rust/, `solve_request_json`,
// budget 2000 ms, 2026-09-10) — both verdicts are pinned as a permanent
// regression test in rust/soli-solver-ffi/tests/solver_tests.rs
// (`stuck_demo_fixture_boundary_is_real`):
//   after 210 solution steps → {"status":"solved"}
//   after the four moves     → {"status":"unsolvable"}
// The stuck PREDICATE itself is pinned in demoReplay.stuck.test.ts, so a change
// to hasUsefulMove cannot silently make this board non-stuck.
export const STUCK_DEMO_PLAYLIST_INDEX = 19
export const STUCK_DEMO_SOLUTION_STEPS = 210
// Exported so tests and device recipes name the same moves.
export const STUCK_DEMO_KILLING_MOVES: readonly DemoReplayMove[] = [
  {
    type: 'move',
    card: { suit: 'diamonds', rank: 6 },
    source: { type: 'waste' },
    target: { type: 'foundation', suit: 'diamonds' },
  },
  {
    type: 'move',
    card: { suit: 'clubs', rank: 6 },
    source: { type: 'tableau', columnIndex: 4 },
    target: { type: 'tableau', columnIndex: 2 },
  },
  { type: 'draw' },
  { type: 'draw' },
]

// Auto Up off (inherited from createDemoReplayGameState), real reducer fold, so
// the state carries a real exactId plus a 214-entry moveLog and 214 undo
// snapshots — a 215-index timeline for the rewind's binary search.
export const createStuckGameState = (): GameState => {
  const entry = getReplayFixtureEntry(STUCK_DEMO_PLAYLIST_INDEX)
  let state = foldReplayFixture(entry, STUCK_DEMO_SOLUTION_STEPS)
  for (const move of STUCK_DEMO_KILLING_MOVES) {
    // Same THROWING validation as the fold: a regenerated playlist that moved
    // any of these cards fails loudly instead of shipping a board that is not
    // actually stuck.
    state = applyDemoReplayMoveForValidation(state, move)
  }
  return state
}
