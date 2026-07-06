import { klondikeReducer } from '../../../src/solitaire/klondike'
import { card, createTestState, resetCardCounter, tableauWith } from './helpers'

beforeEach(() => {
  resetCardCounter()
})

describe('SELECT_TABLEAU', () => {
  it('selects a face-up tableau card', () => {
    const state = createTestState({ tableau: tableauWith([card('hearts', 6)]) })

    const next = klondikeReducer(state, {
      type: 'SELECT_TABLEAU',
      columnIndex: 0,
      cardIndex: 0,
    })

    expect(next.selected).toEqual({ source: 'tableau', columnIndex: 0, cardIndex: 0 })
  })

  it('ignores taps on face-down cards', () => {
    const state = createTestState({ tableau: tableauWith([card('hearts', 6, false)]) })

    const next = klondikeReducer(state, {
      type: 'SELECT_TABLEAU',
      columnIndex: 0,
      cardIndex: 0,
    })

    expect(next).toBe(state)
  })

  it('ignores out-of-range column and card indices', () => {
    const state = createTestState({ tableau: tableauWith([card('hearts', 6)]) })

    expect(
      klondikeReducer(state, { type: 'SELECT_TABLEAU', columnIndex: 9, cardIndex: 0 })
    ).toBe(state)
    expect(
      klondikeReducer(state, { type: 'SELECT_TABLEAU', columnIndex: 0, cardIndex: 5 })
    ).toBe(state)
  })

  it('toggles the selection off when the same card is tapped again', () => {
    const state = createTestState({
      tableau: tableauWith([card('hearts', 6)]),
      selected: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
    })

    const next = klondikeReducer(state, {
      type: 'SELECT_TABLEAU',
      columnIndex: 0,
      cardIndex: 0,
    })

    expect(next.selected).toBeNull()
  })

  it('replaces the selection when a different card is tapped', () => {
    const state = createTestState({
      tableau: tableauWith([card('hearts', 6)], [card('spades', 9)]),
      selected: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
    })

    const next = klondikeReducer(state, {
      type: 'SELECT_TABLEAU',
      columnIndex: 1,
      cardIndex: 0,
    })

    expect(next.selected).toEqual({ source: 'tableau', columnIndex: 1, cardIndex: 0 })
  })

  it('halts an active auto queue when a card is selected', () => {
    const state = createTestState({
      tableau: tableauWith([card('hearts', 6)]),
      autoQueue: [{ type: 'draw' }],
      isAutoCompleting: true,
    })

    const next = klondikeReducer(state, {
      type: 'SELECT_TABLEAU',
      columnIndex: 0,
      cardIndex: 0,
    })

    expect(next.autoQueue).toHaveLength(0)
    expect(next.isAutoCompleting).toBe(false)
    expect(next.selected).toEqual({ source: 'tableau', columnIndex: 0, cardIndex: 0 })
  })
})

describe('SELECT_WASTE', () => {
  it('selects the waste when it has cards', () => {
    const state = createTestState({ waste: [card('hearts', 6)] })

    const next = klondikeReducer(state, { type: 'SELECT_WASTE' })

    expect(next.selected).toEqual({ source: 'waste' })
  })

  it('toggles the waste selection off on a repeat tap', () => {
    const state = createTestState({
      waste: [card('hearts', 6)],
      selected: { source: 'waste' },
    })

    const next = klondikeReducer(state, { type: 'SELECT_WASTE' })

    expect(next.selected).toBeNull()
  })

  it('ignores taps on an empty waste', () => {
    const state = createTestState()

    expect(klondikeReducer(state, { type: 'SELECT_WASTE' })).toBe(state)
  })
})

describe('SELECT_FOUNDATION_TOP', () => {
  it('selects a non-empty foundation pile', () => {
    const state = createTestState({
      foundations: {
        hearts: [card('hearts', 1)],
        diamonds: [],
        clubs: [],
        spades: [],
      },
    })

    const next = klondikeReducer(state, { type: 'SELECT_FOUNDATION_TOP', suit: 'hearts' })

    expect(next.selected).toEqual({ source: 'foundation', suit: 'hearts' })
  })

  it('toggles the foundation selection off on a repeat tap', () => {
    const state = createTestState({
      foundations: {
        hearts: [card('hearts', 1)],
        diamonds: [],
        clubs: [],
        spades: [],
      },
      selected: { source: 'foundation', suit: 'hearts' },
    })

    const next = klondikeReducer(state, { type: 'SELECT_FOUNDATION_TOP', suit: 'hearts' })

    expect(next.selected).toBeNull()
  })

  it('ignores taps on an empty foundation pile', () => {
    const state = createTestState()

    expect(
      klondikeReducer(state, { type: 'SELECT_FOUNDATION_TOP', suit: 'hearts' })
    ).toBe(state)
  })
})

describe('CLEAR_SELECTION', () => {
  it('clears an active selection', () => {
    const state = createTestState({
      waste: [card('hearts', 6)],
      selected: { source: 'waste' },
    })

    const next = klondikeReducer(state, { type: 'CLEAR_SELECTION' })

    expect(next.selected).toBeNull()
  })

  it('is a reference-equal no-op without a selection', () => {
    const state = createTestState()

    expect(klondikeReducer(state, { type: 'CLEAR_SELECTION' })).toBe(state)
  })
})
