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
import type { ExactDealId } from './dealIdentity'

export type DemoReplayCard = {
  readonly suit: Suit
  readonly rank: Rank
}

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
