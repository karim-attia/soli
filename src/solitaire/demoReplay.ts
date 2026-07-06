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

// Deterministic mid-game state for scrubber/undo/redo device tests: same deal
// (playlist entry `default-0-draw-1`), same board, same labels on every launch,
// so tests can assert exact cards and the readout "position 40 of 80".
// The fold goes through applyDemoReplayMoveForValidation on purpose — each move
// is validated against the expected card and THROWS on mismatch, so a future
// playlist regeneration cannot silently change this fixture.
// Because the fold runs the real reducer, the state carries a real exactId and
// a populated moveLog → the move-log persistence path replays it after
// kill/relaunch with full undo/redo depths (acceptance criterion 6).
export const createScrubbedMidGameState = (options?: {
  steps?: number
  scrubIndex?: number
}): GameState => {
  const steps = options?.steps ?? SCRUBBED_DEMO_STEPS
  const scrubIndex = options?.scrubIndex ?? SCRUBBED_DEMO_SCRUB_INDEX
  const entry = getDemoAutoSolvePlaylist()[0]
  if (!entry) {
    throw new Error('Demo auto-solve playlist is empty.')
  }
  if (steps > entry.moves.length) {
    throw new Error(
      `Scrubbed demo needs ${steps} steps but playlist entry ${entry.id} has ${entry.moves.length}.`
    )
  }

  let state = createDemoReplayGameState(entry)
  for (const move of entry.moves.slice(0, steps)) {
    state = applyDemoReplayMoveForValidation(state, move)
  }
  return klondikeReducer(state, { type: 'SCRUB_TO_INDEX', index: scrubIndex })
}
