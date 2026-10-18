import {
  createGameStateFromExactId,
  createInitialState,
  klondikeReducer,
  replayMoveLog,
  type GameState,
} from '../../../src/solitaire/klondike'
import { canRecycle, recyclesAllowed, recyclesLeft } from '../../../src/solitaire/scoring'
import { card, createTestState, foundationPileThrough, tableauWith } from './helpers'

// Vegas pass limits (docs/product/scoring/scoring.md § Phase 2, slice P2-A):
// a game dealt with vegasRules may recycle the waste at most drawCount − 1 times.
const draw = (state: GameState): GameState =>
  klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })

describe('pass-limit helpers', () => {
  it('passes = draw count on Vegas-rules games, unlimited otherwise', () => {
    expect(recyclesAllowed({ vegasRules: true, drawCount: 1 })).toBe(0)
    expect(recyclesAllowed({ vegasRules: true, drawCount: 2 })).toBe(1)
    expect(recyclesAllowed({ vegasRules: true, drawCount: 3 })).toBe(2)
    expect(recyclesAllowed({ vegasRules: true, drawCount: 5 })).toBe(4)
    expect(recyclesAllowed({ vegasRules: false, drawCount: 1 })).toBe(Infinity)
  })

  it('counts the remaining recycles and refuses on an empty waste', () => {
    const vegas3 = { vegasRules: true, drawCount: 3 as const }
    expect(recyclesLeft({ ...vegas3, stockPasses: 0 })).toBe(2)
    expect(recyclesLeft({ ...vegas3, stockPasses: 2 })).toBe(0)
    expect(recyclesLeft({ vegasRules: false, drawCount: 3, stockPasses: 40 })).toBe(Infinity)
    expect(canRecycle({ ...vegas3, stockPasses: 1, waste: [card('hearts', 7)] })).toBe(true)
    expect(canRecycle({ ...vegas3, stockPasses: 2, waste: [card('hearts', 7)] })).toBe(false)
    expect(canRecycle({ ...vegas3, stockPasses: 0, waste: [] })).toBe(false)
  })
})

describe('klondike reducer pass limits', () => {
  it('deals carry the flag; demo/fixture deals and the default are unlimited', () => {
    expect(createInitialState(3, true).vegasRules).toBe(true)
    expect(createInitialState(3).vegasRules).toBe(false)
    expect(createGameStateFromExactId(createInitialState().exactId, 1).vegasRules).toBe(false)
  })

  it('a refused recycle is a reducer no-op: same reference, no log, no history, no moveCount', () => {
    const lastPass = createTestState({
      waste: [card('hearts', 7)],
      drawCount: 3,
      stockPasses: 2,
      vegasRules: true,
      moveCount: 40,
      moveLog: [{ k: 'draw' }],
    })
    expect(draw(lastPass)).toBe(lastPass)

    // Draw 1 Vegas: no recycle at all.
    const draw1 = createTestState({ waste: [card('hearts', 7)], drawCount: 1, vegasRules: true })
    expect(draw(draw1)).toBe(draw1)
  })

  it('recycles while a pass is left and keeps the Vegas tally untouched', () => {
    const state = createTestState({
      waste: [card('hearts', 7)],
      drawCount: 3,
      stockPasses: 1,
      vegasRules: true,
      score: { standard: 100, vegas: -47 },
    })
    const recycled = draw(state)
    expect(recycled.stock).toHaveLength(1)
    expect(recycled.stockPasses).toBe(2)
    expect(recycled.moveLog).toEqual([{ k: 'draw' }])
    // Second recycle at Draw 3 is still free in Standard; Vegas never charges.
    expect(recycled.score).toEqual({ standard: 100, vegas: -47 })
  })

  it('unlimited games recycle no matter how many passes were used', () => {
    const state = createTestState({ waste: [card('hearts', 7)], drawCount: 1, stockPasses: 99 })
    expect(draw(state).stock).toHaveLength(1)
  })

  it('undo of a recycle gives the pass back', () => {
    // Draw 2 Vegas = one recycle. Two waste cards → recycle → one draw takes both.
    const start = createTestState({
      waste: [card('hearts', 7), card('spades', 9)],
      drawCount: 2,
      vegasRules: true,
    })
    const recycled = draw(start)
    expect(recycled.stockPasses).toBe(1)
    const drawn = draw(recycled)
    expect(drawn.stock).toHaveLength(0)
    expect(drawn.waste).toHaveLength(2)
    // No pass left: the tap is refused.
    expect(draw(drawn)).toBe(drawn)

    const undone = klondikeReducer(klondikeReducer(drawn, { type: 'UNDO' }), { type: 'UNDO' })
    expect(undone.stockPasses).toBe(0)
    expect(recyclesLeft(undone)).toBe(1)
    expect(draw(undone).stockPasses).toBe(1)
  })

  it('auto-complete stops at the limit instead of recycling', () => {
    const fixture = (vegasRules: boolean) =>
      createTestState({
        foundations: {
          hearts: foundationPileThrough('hearts', 12),
          diamonds: [],
          clubs: [],
          spades: [],
        },
        tableau: tableauWith([card('hearts', 13)]),
        // One unplayable stock card and an unplayable waste card.
        stock: [card('clubs', 5, false)],
        waste: [card('spades', 7)],
        drawCount: 1,
        vegasRules,
        autoUpEnabled: false,
      })
    const schedule = (state: GameState) =>
      klondikeReducer(state, { type: 'SET_AUTO_UP_ENABLED', enabled: true })

    // Unlimited Draw 1: the planner cycles the stock (recycles are planned).
    expect(schedule(fixture(false)).autoQueue.some((action) => action.type === 'recycle')).toBe(
      true
    )

    // Vegas Draw 1: play the king, draw the last card, then stop with the waste stuck.
    let state = schedule(fixture(true))
    expect(state.autoQueue).toEqual([
      {
        type: 'move',
        selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
        target: { type: 'foundation', suit: 'hearts' },
      },
      { type: 'draw' },
    ])
    while (state.autoQueue.length) {
      state = klondikeReducer(state, { type: 'ADVANCE_AUTO_QUEUE' })
    }
    expect(state.stock).toHaveLength(0)
    expect(state.waste).toHaveLength(2)
    expect(state.stockPasses).toBe(0)
    expect(state.isAutoCompleting).toBe(false)
  })

  it('a Vegas log replays identically, and an unlimited log is unaffected by the flag', () => {
    // Vegas Draw 1: 23 draws empty the stock, the 24th tap is refused (not logged).
    let vegas = createInitialState(1, true)
    for (let index = 0; index < 24; index += 1) {
      vegas = draw(vegas)
    }
    expect(vegas.stock).toHaveLength(0)
    expect(vegas.stockPasses).toBe(0)
    expect(vegas.moveLog).toHaveLength(23)
    const replayedVegas = replayMoveLog(
      createGameStateFromExactId(vegas.exactId, 1, { vegasRules: true }),
      vegas.moveLog
    )
    expect(replayedVegas.vegasRules).toBe(true)
    expect(replayedVegas.waste.map((c) => c.id)).toHaveLength(24)

    // Pre-Phase-2 logs come from unlimited games: 24 draws recycle on the 24th.
    let unlimited = createInitialState(1)
    for (let index = 0; index < 24; index += 1) {
      unlimited = draw(unlimited)
    }
    expect(unlimited.stockPasses).toBe(1)
    const replayedUnlimited = replayMoveLog(
      createGameStateFromExactId(unlimited.exactId, 1),
      unlimited.moveLog
    )
    expect(replayedUnlimited.stockPasses).toBe(1)
    expect(replayedUnlimited.stock).toHaveLength(unlimited.stock.length)
    expect(replayedUnlimited.score).toEqual(unlimited.score)
  })

  it('HYDRATE_STATE defaults a missing vegasRules to unlimited', () => {
    const legacy = createTestState()
    delete (legacy as Partial<GameState>).vegasRules
    const hydrated = klondikeReducer(createTestState(), { type: 'HYDRATE_STATE', state: legacy })
    expect(hydrated.vegasRules).toBe(false)
  })
})
