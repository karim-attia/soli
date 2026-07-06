import { klondikeReducer, type GameState } from '../../../src/solitaire/klondike'
import {
  card,
  createTestState,
  foundationPileThrough,
  resetCardCounter,
  tableauWith,
} from './helpers'

const advance = (state: GameState): GameState =>
  klondikeReducer(state, { type: 'ADVANCE_AUTO_QUEUE' })

beforeEach(() => {
  resetCardCounter()
})

describe('ADVANCE_AUTO_QUEUE', () => {
  it('clears the auto-completing flag when the queue is already empty', () => {
    const state = createTestState({ isAutoCompleting: true })

    const next = advance(state)

    expect(next.isAutoCompleting).toBe(false)
    expect(next.autoQueue).toHaveLength(0)
  })

  it('is a reference-equal no-op with an empty queue and the flag already off', () => {
    const state = createTestState()

    expect(advance(state)).toBe(state)
  })

  // R2b (review fix batch, 2026-07-06): the dangling empty-queue advance must not
  // run finalizeState — it could newly schedule an auto queue, and scheduling
  // pushes a history snapshot without a move-log entry (persisted replay drift).
  it('does not schedule a new queue from a dangling advance on an auto-ready board', () => {
    const state = createTestState({
      autoUpEnabled: true,
      tableau: tableauWith([card('hearts', 1)]),
      isAutoCompleting: true,
    })

    const next = advance(state)

    expect(next.isAutoCompleting).toBe(false)
    expect(next.autoQueue).toHaveLength(0)
    expect(next.history).toHaveLength(0)
    expect(next.moveLog).toHaveLength(0)
  })

  it('applies a queued move without recording history and stays auto-completing while items remain', () => {
    const state = createTestState({
      tableau: tableauWith([card('hearts', 1)]),
      stock: [card('clubs', 5, false)],
      autoQueue: [
        {
          type: 'move',
          selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
          target: { type: 'foundation', suit: 'hearts' },
        },
        { type: 'draw' },
      ],
      isAutoCompleting: true,
    })

    const next = advance(state)

    expect(next.foundations.hearts.map((c) => c.rank)).toEqual([1])
    expect(next.tableau[0]).toHaveLength(0)
    expect(next.history).toHaveLength(0)
    expect(next.autoQueue).toEqual([{ type: 'draw' }])
    expect(next.isAutoCompleting).toBe(true)
    expect(next.autoCompleteRuns).toBe(0)
  })

  it('pops a queued move that is no longer valid and leaves the board unchanged', () => {
    const state = createTestState({
      autoQueue: [
        {
          type: 'move',
          selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
          target: { type: 'foundation', suit: 'hearts' },
        },
      ],
      isAutoCompleting: true,
    })

    const next = advance(state)

    expect(next.foundations.hearts).toHaveLength(0)
    expect(next.tableau).toEqual(state.tableau)
    expect(next.autoQueue).toHaveLength(0)
    expect(next.isAutoCompleting).toBe(false)
    expect(next.autoCompleteRuns).toBe(1)
  })

  it('draws from the stock without recording history for a queued draw', () => {
    const hidden = card('clubs', 5, false)
    const state = createTestState({
      stock: [hidden],
      autoQueue: [{ type: 'draw' }],
      isAutoCompleting: true,
    })

    const next = advance(state)

    expect(next.stock).toHaveLength(0)
    expect(next.waste.map((c) => c.id)).toEqual([hidden.id])
    expect(next.waste[0].faceUp).toBe(true)
    expect(next.history).toHaveLength(0)
  })

  it('recycles the waste back into the stock face-down for a queued recycle', () => {
    const first = card('clubs', 5)
    const second = card('hearts', 9)
    const state = createTestState({
      waste: [first, second],
      autoQueue: [{ type: 'recycle' }],
      isAutoCompleting: true,
    })

    const next = advance(state)

    expect(next.waste).toHaveLength(0)
    expect(next.stock.map((c) => c.id)).toEqual([second.id, first.id])
    expect(next.stock.every((c) => !c.faceUp)).toBe(true)
    expect(next.history).toHaveLength(0)
  })

  it('increments autoCompleteRuns exactly when the last queue item is consumed', () => {
    const state = createTestState({
      stock: [card('clubs', 5, false), card('hearts', 9, false)],
      autoQueue: [{ type: 'draw' }, { type: 'draw' }],
      isAutoCompleting: true,
    })

    const afterFirst = advance(state)
    expect(afterFirst.autoCompleteRuns).toBe(0)

    const afterSecond = advance(afterFirst)
    expect(afterSecond.autoCompleteRuns).toBe(1)
    expect(afterSecond.isAutoCompleting).toBe(false)
  })

  it('sets the win flag when the queue completes all foundations', () => {
    const state = createTestState({
      foundations: {
        hearts: foundationPileThrough('hearts', 12),
        diamonds: foundationPileThrough('diamonds', 13),
        clubs: foundationPileThrough('clubs', 13),
        spades: foundationPileThrough('spades', 13),
      },
      tableau: tableauWith([card('hearts', 13)]),
      autoQueue: [
        {
          type: 'move',
          selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
          target: { type: 'foundation', suit: 'hearts' },
        },
      ],
      isAutoCompleting: true,
    })

    const next = advance(state)

    expect(next.foundations.hearts).toHaveLength(13)
    expect(next.hasWon).toBe(true)
    expect(next.winCelebrations).toBe(1)
    expect(next.isAutoCompleting).toBe(false)
    expect(next.autoCompleteRuns).toBe(1)
  })
})
