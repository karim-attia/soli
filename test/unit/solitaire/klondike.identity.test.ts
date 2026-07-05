import { klondikeReducer } from '../../../src/solitaire/klondike'
import { card, createTestState, tableauWith } from './helpers'

// Render memoization (P3/A2) relies on the reducer keeping referential identity for
// piles an action does not touch. These tests lock in that guarantee; breaking it
// silently re-enables full-board re-renders on every move/tick.
describe('klondikeReducer pile referential identity', () => {
  it('TIMER_TICK keeps every pile identical', () => {
    const state = createTestState({
      stock: [card('hearts', 5, false)],
      waste: [card('clubs', 9)],
      tableau: tableauWith([card('spades', 13)]),
      timerState: 'running',
      timerStartedAt: 1000,
    })

    const next = klondikeReducer(state, { type: 'TIMER_TICK', timestamp: 2000 })

    expect(next).not.toBe(state)
    expect(next.stock).toBe(state.stock)
    expect(next.waste).toBe(state.waste)
    expect(next.foundations).toBe(state.foundations)
    expect(next.tableau).toBe(state.tableau)
  })

  it('selection keeps every pile identical', () => {
    const state = createTestState({
      tableau: tableauWith([card('spades', 13)]),
    })

    const next = klondikeReducer(state, {
      type: 'SELECT_TABLEAU',
      columnIndex: 0,
      cardIndex: 0,
    })

    expect(next.selected).toEqual({ source: 'tableau', columnIndex: 0, cardIndex: 0 })
    expect(next.stock).toBe(state.stock)
    expect(next.waste).toBe(state.waste)
    expect(next.foundations).toBe(state.foundations)
    expect(next.tableau).toBe(state.tableau)
  })

  it('tableau-to-tableau move keeps untouched columns, waste, and foundations identical', () => {
    const state = createTestState({
      waste: [card('clubs', 9)],
      tableau: tableauWith(
        [card('hearts', 5)],
        [card('spades', 6)],
        [card('diamonds', 12)]
      ),
    })

    const next = klondikeReducer(state, {
      type: 'APPLY_MOVE',
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
      target: { type: 'tableau', columnIndex: 1 },
    })

    expect(next.tableau[1].map((c) => c.rank)).toEqual([6, 5])
    expect(next.tableau[0]).not.toBe(state.tableau[0])
    expect(next.tableau[1]).not.toBe(state.tableau[1])
    expect(next.tableau[2]).toBe(state.tableau[2])
    expect(next.waste).toBe(state.waste)
    expect(next.foundations).toBe(state.foundations)
  })

  it('waste-to-foundation move keeps tableau and other foundation piles identical', () => {
    const state = createTestState({
      waste: [card('hearts', 1)],
      tableau: tableauWith([card('spades', 13)]),
    })

    const next = klondikeReducer(state, {
      type: 'APPLY_MOVE',
      selection: { source: 'waste' },
      target: { type: 'foundation', suit: 'hearts' },
    })

    expect(next.foundations.hearts).toHaveLength(1)
    expect(next.tableau).toBe(state.tableau)
    expect(next.waste).not.toBe(state.waste)
    expect(next.foundations).not.toBe(state.foundations)
    expect(next.foundations.clubs).toBe(state.foundations.clubs)
    expect(next.foundations.spades).toBe(state.foundations.spades)
    expect(next.foundations.diamonds).toBe(state.foundations.diamonds)
  })

  it('draw keeps tableau and foundations identical', () => {
    const state = createTestState({
      stock: [card('hearts', 5, false)],
      tableau: tableauWith([card('spades', 13)]),
    })

    const next = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })

    expect(next.waste).toHaveLength(1)
    expect(next.tableau).toBe(state.tableau)
    expect(next.foundations).toBe(state.foundations)
  })

  it('move does not mutate the previous state piles', () => {
    const state = createTestState({
      tableau: tableauWith(
        [card('hearts', 6, false), card('hearts', 5)],
        [card('spades', 6)]
      ),
    })

    klondikeReducer(state, {
      type: 'APPLY_MOVE',
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 1 },
      target: { type: 'tableau', columnIndex: 1 },
    })

    // Source column untouched on the old state (including the face-down flip).
    expect(state.tableau[0]).toHaveLength(2)
    expect(state.tableau[0][0].faceUp).toBe(false)
    expect(state.tableau[1]).toHaveLength(1)
  })
})
