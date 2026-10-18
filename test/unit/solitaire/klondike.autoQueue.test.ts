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

  // 2026-09-09 (auto-complete reliability): both actions used to halt the queue
  // FIRST and then return the halted state without finalizing when they turned out
  // to be no-ops, so the run stopped mid-board and nothing ever restarted it.
  // Rescheduling instead of not halting was not an option: scheduleAutoQueue pushes
  // a history snapshot and neither path appends a move-log entry, which is the
  // replay drift the R2 review batch fixed. An action that changes nothing now
  // changes nothing at all — including the queue.
  it('keeps a running auto queue alive when a move is rejected', () => {
    const state = createTestState({
      tableau: tableauWith([card('hearts', 5)]),
      autoQueue: [{ type: 'draw' }],
      isAutoCompleting: true,
    })

    // 5♥ cannot go to an empty hearts foundation.
    const next = klondikeReducer(state, {
      type: 'APPLY_MOVE',
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
      target: { type: 'foundation', suit: 'hearts' },
    })

    expect(next).toBe(state)
    expect(next.autoQueue).toEqual([{ type: 'draw' }])
    expect(next.isAutoCompleting).toBe(true)
  })

  it('keeps a running auto queue alive when a scrub lands on the current index', () => {
    const state = createTestState({
      tableau: tableauWith([card('hearts', 5)]),
      autoQueue: [{ type: 'draw' }],
      isAutoCompleting: true,
    })

    const next = klondikeReducer(state, { type: 'SCRUB_TO_INDEX', index: 0 })

    expect(next).toBe(state)
    expect(next.autoQueue).toEqual([{ type: 'draw' }])
    expect(next.isAutoCompleting).toBe(true)
  })

  // "pops a queued move that is no longer valid" above covers the drop itself, but
  // only on a one-item queue, where "dropped it and carried on" and "gave up" look
  // identical. Two things are pinned here instead: the run keeps going through a
  // dropped step, and the state identity changes when it does — a bail-out that
  // returned `state` would leave useAutoQueueRunner's effect deps untouched, so no
  // new timeout is ever armed and the run freezes at isAutoCompleting: true (the
  // same shape as the board-lock freeze). Plus the move-log parity below.
  it('drops a queued move that no longer applies and keeps advancing', () => {
    const state = createTestState({
      tableau: tableauWith([card('hearts', 1)]),
      autoQueue: [
        // Column 1 is empty, so this queued move can never apply.
        {
          type: 'move',
          selection: { source: 'tableau', columnIndex: 1, cardIndex: 0 },
          target: { type: 'foundation', suit: 'hearts' },
        },
        {
          type: 'move',
          selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
          target: { type: 'foundation', suit: 'hearts' },
        },
      ],
      isAutoCompleting: true,
    })

    const afterDrop = advance(state)

    expect(afterDrop).not.toBe(state)
    expect(afterDrop.autoQueue).toHaveLength(1)
    expect(afterDrop.isAutoCompleting).toBe(true)
    expect(afterDrop.foundations.hearts).toHaveLength(0)
    // The dropped step still has to be logged: replay advances the queue by counting
    // 'adv' entries, so skipping one here would desync every later entry.
    expect(afterDrop.moveLog).toEqual([{ k: 'adv' }])

    const afterRest = advance(afterDrop)

    expect(afterRest.autoQueue).toHaveLength(0)
    expect(afterRest.isAutoCompleting).toBe(false)
    expect(afterRest.foundations.hearts).toHaveLength(1)
    expect(afterRest.autoCompleteRuns).toBe(1)
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
