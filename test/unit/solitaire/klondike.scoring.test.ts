import { getDemoAutoSolvePlaylist } from '../../../src/data/demoAutoSolvePlaylist'
import {
  applyDemoReplayMoveForValidation,
  createNearWinGameState,
} from '../../../src/solitaire/demoReplay'
import {
  FOUNDATION_SUIT_ORDER,
  createGameStateFromExactId,
  createInitialState,
  klondikeReducer,
  replayMoveLog,
  type GameState,
} from '../../../src/solitaire/klondike'
import { INITIAL_SCORE } from '../../../src/solitaire/scoring'
import { card, createTestState, foundationPileThrough, tableauWith } from './helpers'

const move = (
  state: GameState,
  selection: GameState['selected'] & object,
  target: { type: 'tableau'; columnIndex: number } | { type: 'foundation'; suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' }
) => klondikeReducer(state, { type: 'APPLY_MOVE', selection, target })

const foundationCardCount = (state: GameState): number =>
  FOUNDATION_SUIT_ORDER.reduce((sum, suit) => sum + state.foundations[suit].length, 0)

// Both tallies are computed by the reducer on every board-changing action and
// stored on the snapshot (docs/product/scoring/scoring.md, approach A1 + B1).
describe('klondike reducer scoring', () => {
  it('deals with 0 points, −$52 and no stock passes', () => {
    const state = createInitialState()
    expect(state.score).toEqual(INITIAL_SCORE)
    expect(state.stockPasses).toBe(0)
  })

  it('waste → tableau: +5 Standard, Vegas unchanged', () => {
    const state = createTestState({
      waste: [card('hearts', 7)],
      tableau: tableauWith([card('spades', 8)]),
    })
    const next = move(state, { source: 'waste' }, { type: 'tableau', columnIndex: 0 })
    expect(next.score).toEqual({ standard: 5, vegas: -52 })
  })

  it('waste → foundation: +10 Standard, +$5 Vegas', () => {
    const state = createTestState({ waste: [card('hearts', 1)] })
    const next = move(state, { source: 'waste' }, { type: 'foundation', suit: 'hearts' })
    expect(next.score).toEqual({ standard: 10, vegas: -47 })
  })

  it('tableau → foundation that exposes a face-down card: +10 +5 flip bonus', () => {
    const state = createTestState({
      tableau: tableauWith([card('clubs', 5, false), card('hearts', 1)]),
    })
    const next = move(
      state,
      { source: 'tableau', columnIndex: 0, cardIndex: 1 },
      { type: 'foundation', suit: 'hearts' }
    )
    expect(next.tableau[0][0].faceUp).toBe(true)
    expect(next.score).toEqual({ standard: 15, vegas: -47 })
  })

  it('tableau → tableau: 0 without a flip, +5 with one', () => {
    const noFlip = createTestState({
      tableau: tableauWith([card('hearts', 7)], [card('spades', 8)]),
    })
    expect(
      move(noFlip, { source: 'tableau', columnIndex: 0, cardIndex: 0 }, {
        type: 'tableau',
        columnIndex: 1,
      }).score
    ).toEqual({ standard: 0, vegas: -52 })

    const flip = createTestState({
      tableau: tableauWith([card('spades', 13, false), card('hearts', 7)], [card('spades', 8)]),
    })
    expect(
      move(flip, { source: 'tableau', columnIndex: 0, cardIndex: 1 }, {
        type: 'tableau',
        columnIndex: 1,
      }).score
    ).toEqual({ standard: 5, vegas: -52 })
  })

  it('does not award a flip when the card underneath was already face-up', () => {
    const state = createTestState({
      tableau: tableauWith([card('spades', 8), card('hearts', 7)], [card('clubs', 8)]),
    })
    const next = move(
      state,
      { source: 'tableau', columnIndex: 0, cardIndex: 1 },
      { type: 'tableau', columnIndex: 1 }
    )
    expect(next.score.standard).toBe(0)
  })

  it('foundation → tableau: −15 Standard (clamped at 0), −$5 Vegas', () => {
    const state = createTestState({
      foundations: { hearts: [card('hearts', 1)], diamonds: [], clubs: [], spades: [] },
      tableau: tableauWith([card('spades', 2)]),
      score: { standard: 20, vegas: -47 },
    })
    const next = move(state, { source: 'foundation', suit: 'hearts' }, { type: 'tableau', columnIndex: 0 })
    expect(next.score).toEqual({ standard: 5, vegas: -52 })

    const clamped = move(
      { ...state, score: { standard: 10, vegas: -47 } },
      { source: 'foundation', suit: 'hearts' },
      { type: 'tableau', columnIndex: 0 }
    )
    expect(clamped.score).toEqual({ standard: 0, vegas: -52 })
  })

  it('drawing from the stock is free', () => {
    const state = createTestState({ stock: [card('hearts', 7, false)], drawCount: 1 })
    expect(klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' }).score).toEqual(INITIAL_SCORE)
  })

  it('Draw 1: every recycle costs −100 and counts a stock pass', () => {
    const state = createTestState({
      waste: [card('hearts', 7)],
      drawCount: 1,
      score: { standard: 150, vegas: -52 },
    })
    const first = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    expect(first.stockPasses).toBe(1)
    expect(first.score).toEqual({ standard: 50, vegas: -52 })

    // Draw the single card back out, then recycle again → clamps at 0.
    const drawn = klondikeReducer(first, { type: 'DRAW_OR_RECYCLE' })
    const second = klondikeReducer(drawn, { type: 'DRAW_OR_RECYCLE' })
    expect(second.stockPasses).toBe(2)
    expect(second.score).toEqual({ standard: 0, vegas: -52 })
  })

  it('Draw 3 (and 5): the first two recycles are free, the third costs −20', () => {
    const recycle = (drawCount: 3 | 5, stockPasses: number) =>
      klondikeReducer(
        createTestState({
          waste: [card('hearts', 7)],
          drawCount,
          stockPasses,
          score: { standard: 100, vegas: -52 },
        }),
        { type: 'DRAW_OR_RECYCLE' }
      )
    expect(recycle(3, 0).score.standard).toBe(100)
    expect(recycle(3, 1).score.standard).toBe(100)
    expect(recycle(3, 2).score.standard).toBe(80)
    expect(recycle(3, 2).stockPasses).toBe(3)
    expect(recycle(5, 2).score.standard).toBe(80)
  })

  it('undo restores the previous score (unlike moveCount, which keeps counting)', () => {
    const state = createTestState({ waste: [card('hearts', 1)] })
    const scored = move(state, { source: 'waste' }, { type: 'foundation', suit: 'hearts' })
    expect(scored.score).toEqual({ standard: 10, vegas: -47 })

    const undone = klondikeReducer(scored, { type: 'UNDO' })
    expect(undone.score).toEqual(INITIAL_SCORE)
    expect(undone.moveCount).toBe(scored.moveCount)
  })

  it('scrubbing restores the score that belonged to the restored position', () => {
    const state = createTestState({
      waste: [card('hearts', 7), card('hearts', 1)],
      tableau: tableauWith([card('spades', 8)]),
    })
    const one = move(state, { source: 'waste' }, { type: 'foundation', suit: 'hearts' })
    const two = move(one, { source: 'waste' }, { type: 'tableau', columnIndex: 0 })
    expect(two.score).toEqual({ standard: 15, vegas: -47 })

    const back = klondikeReducer(two, { type: 'SCRUB_TO_INDEX', index: 1 })
    expect(back.score).toEqual({ standard: 10, vegas: -47 })
    const start = klondikeReducer(back, { type: 'SCRUB_TO_INDEX', index: 0 })
    expect(start.score).toEqual(INITIAL_SCORE)
    const forward = klondikeReducer(start, { type: 'SCRUB_TO_INDEX', index: 2 })
    expect(forward.score).toEqual({ standard: 15, vegas: -47 })
  })

  it('auto-queue moves score exactly like manual moves', () => {
    const state = createTestState({
      foundations: {
        hearts: foundationPileThrough('hearts', 12),
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: tableauWith([card('hearts', 13)]),
      drawCount: 1,
      autoUpEnabled: false,
    })
    // Enabling Auto Up finalizes the state, which schedules the queue.
    const scheduled = klondikeReducer(state, { type: 'SET_AUTO_UP_ENABLED', enabled: true })
    expect(scheduled.autoQueue.length).toBeGreaterThan(0)
    const advanced = klondikeReducer(scheduled, { type: 'ADVANCE_AUTO_QUEUE' })
    expect(advanced.foundations.hearts).toHaveLength(13)
    expect(advanced.score).toEqual({ standard: 10, vegas: -47 })
  })

  it('Vegas always equals 5 × cards on foundations − 52 and reaches $208 on a win', () => {
    const entry = getDemoAutoSolvePlaylist()[0]!
    const nearWin = createNearWinGameState()
    expect(nearWin.score.vegas).toBe(5 * foundationCardCount(nearWin) - 52)

    const won = applyDemoReplayMoveForValidation(nearWin, entry.moves[entry.moves.length - 1]!)
    expect(won.hasWon).toBe(true)
    expect(won.score.vegas).toBe(208)
    // Untimed Standard caps at 740 (every card via the waste + flips).
    expect(won.score.standard).toBeGreaterThan(0)
    expect(won.score.standard).toBeLessThanOrEqual(740)
  })

  it('replaying a move log reproduces the live tally', () => {
    let state = createInitialState(1)
    // 24 draws empty the stock (23 after the initial reveal), then one recycle.
    for (let index = 0; index < 23; index += 1) {
      state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    }
    expect(state.stock).toHaveLength(0)
    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    expect(state.stockPasses).toBe(1)

    const replayed = replayMoveLog(
      createGameStateFromExactId(state.exactId, state.drawCount),
      state.moveLog
    )
    expect(replayed.score).toEqual(state.score)
    expect(replayed.stockPasses).toBe(1)
  })
})
