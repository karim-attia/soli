import {
  getDropHints,
  klondikeReducer,
  type GameAction,
  type GameState,
} from '../../../src/solitaire/klondike'
import {
  card,
  createTestState,
  foundationPileThrough,
  resetCardCounter,
  tableauWith,
} from './helpers'

const applyMove = (
  state: GameState,
  selection: Extract<GameAction, { type: 'APPLY_MOVE' }>['selection'],
  target: Extract<GameAction, { type: 'APPLY_MOVE' }>['target']
): GameState => klondikeReducer(state, { type: 'APPLY_MOVE', selection, target })

const ids = (cards: { id: string }[]): string[] => cards.map((item) => item.id)

beforeEach(() => {
  resetCardCounter()
})

describe('tableau drop rules', () => {
  it('accepts a single card onto an opposite-color card one rank higher', () => {
    const state = createTestState({
      tableau: tableauWith([card('spades', 7)], [card('hearts', 6)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next.tableau[0].map((c) => c.rank)).toEqual([7, 6])
    expect(next.tableau[1]).toHaveLength(0)
  })

  it('rejects a same-color card one rank higher', () => {
    const state = createTestState({
      tableau: tableauWith([card('diamonds', 7)], [card('hearts', 6)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next).toBe(state)
  })

  it('rejects an opposite-color card with the wrong rank', () => {
    const state = createTestState({
      tableau: tableauWith([card('spades', 7)], [card('hearts', 5)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next).toBe(state)
  })

  it('rejects a drop when the target column top card is face-down', () => {
    const state = createTestState({
      tableau: tableauWith([card('spades', 7, false)], [card('hearts', 6)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next).toBe(state)
  })

  it('accepts a lone king onto an empty column', () => {
    const state = createTestState({
      tableau: tableauWith([], [card('clubs', 13)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next.tableau[0].map((c) => c.rank)).toEqual([13])
    expect(next.tableau[1]).toHaveLength(0)
  })

  it('accepts a king-led stack onto an empty column and preserves order', () => {
    const king = card('clubs', 13)
    const queen = card('hearts', 12)
    const jack = card('spades', 11)
    const state = createTestState({
      tableau: tableauWith([], [king, queen, jack]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(ids(next.tableau[0])).toEqual([king.id, queen.id, jack.id])
    expect(next.tableau[1]).toHaveLength(0)
  })

  it('rejects a non-king single card onto an empty column', () => {
    const state = createTestState({
      tableau: tableauWith([], [card('hearts', 12)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next).toBe(state)
  })

  it('rejects a non-king-led stack onto an empty column', () => {
    const state = createTestState({
      tableau: tableauWith([], [card('hearts', 12), card('spades', 11)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next).toBe(state)
  })

  it('moves a multi-card alternating descending run intact', () => {
    const eight = card('clubs', 8)
    const seven = card('hearts', 7)
    const six = card('spades', 6)
    const state = createTestState({
      tableau: tableauWith([card('diamonds', 9)], [eight, seven, six]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next.tableau[0].map((c) => c.rank)).toEqual([9, 8, 7, 6])
    expect(ids(next.tableau[0]).slice(1)).toEqual([eight.id, seven.id, six.id])
    expect(next.tableau[1]).toHaveLength(0)
  })

  it('rejects a selection slice that is not itself a descending alternating run', () => {
    const state = createTestState({
      tableau: tableauWith([card('diamonds', 9)], [card('clubs', 8), card('hearts', 5)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next).toBe(state)
  })

  it('rejects a move onto the selection own source column', () => {
    const state = createTestState({
      tableau: tableauWith([card('spades', 7), card('hearts', 6)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 0, cardIndex: 1 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next).toBe(state)
  })

  it('increments moveCount, records history, clears future and selection on a valid move', () => {
    const base = createTestState()
    const { history: _h, future: _f, selected: _s, autoUpEnabled: _a, ...snapshot } = base
    const state = createTestState({
      tableau: tableauWith([card('spades', 7)], [card('hearts', 6)]),
      future: [snapshot],
      selected: { source: 'waste' },
      moveCount: 4,
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next.moveCount).toBe(5)
    expect(next.history).toHaveLength(1)
    expect(next.future).toHaveLength(0)
    expect(next.selected).toBeNull()
  })

  it('returns the exact same state reference for an invalid APPLY_MOVE', () => {
    const state = createTestState({
      tableau: tableauWith([card('diamonds', 7)], [card('hearts', 6)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next).toBe(state)
    expect(next.history).toHaveLength(0)
    expect(next.moveCount).toBe(0)
  })

  it('moves only the top waste card on a valid waste-to-tableau move', () => {
    const buried = card('clubs', 2)
    const top = card('hearts', 6)
    const seven = card('spades', 7)
    const state = createTestState({
      waste: [buried, top],
      tableau: tableauWith([seven]),
    })

    const next = applyMove(
      state,
      { source: 'waste' },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(ids(next.waste)).toEqual([buried.id])
    expect(ids(next.tableau[0])).toEqual([seven.id, top.id])
  })

  it('leaves the waste untouched on an invalid waste-to-tableau move', () => {
    const state = createTestState({
      waste: [card('hearts', 6)],
      tableau: tableauWith([card('spades', 9)]),
    })

    const next = applyMove(
      state,
      { source: 'waste' },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next).toBe(state)
    expect(next.waste).toEqual(state.waste)
  })
})

describe('foundation drop rules', () => {
  it('starts an empty foundation with the ace of its suit', () => {
    const ace = card('hearts', 1)
    const state = createTestState({ waste: [ace] })

    const next = applyMove(
      state,
      { source: 'waste' },
      { type: 'foundation', suit: 'hearts' }
    )

    expect(ids(next.foundations.hearts)).toEqual([ace.id])
    expect(next.waste).toHaveLength(0)
  })

  it('rejects a non-ace on an empty foundation', () => {
    const state = createTestState({ waste: [card('hearts', 2)] })

    const next = applyMove(
      state,
      { source: 'waste' },
      { type: 'foundation', suit: 'hearts' }
    )

    expect(next).toBe(state)
  })

  it('accepts the same-suit next rank', () => {
    const state = createTestState({
      waste: [card('hearts', 2)],
      foundations: {
        hearts: foundationPileThrough('hearts', 1),
        diamonds: [],
        clubs: [],
        spades: [],
      },
    })

    const next = applyMove(
      state,
      { source: 'waste' },
      { type: 'foundation', suit: 'hearts' }
    )

    expect(next.foundations.hearts.map((c) => c.rank)).toEqual([1, 2])
  })

  it('rejects a same-suit card with a rank gap', () => {
    const state = createTestState({
      waste: [card('hearts', 3)],
      foundations: {
        hearts: foundationPileThrough('hearts', 1),
        diamonds: [],
        clubs: [],
        spades: [],
      },
    })

    const next = applyMove(
      state,
      { source: 'waste' },
      { type: 'foundation', suit: 'hearts' }
    )

    expect(next).toBe(state)
  })

  it('rejects the right rank of the wrong suit', () => {
    const state = createTestState({
      waste: [card('spades', 2)],
      foundations: {
        hearts: foundationPileThrough('hearts', 1),
        diamonds: [],
        clubs: [],
        spades: [],
      },
    })

    const next = applyMove(
      state,
      { source: 'waste' },
      { type: 'foundation', suit: 'hearts' }
    )

    expect(next).toBe(state)
  })

  it('rejects a multi-card stack targeted at a foundation', () => {
    const state = createTestState({
      tableau: tableauWith([card('clubs', 13), card('hearts', 12)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 0, cardIndex: 0 },
      { type: 'foundation', suit: 'clubs' }
    )

    expect(next).toBe(state)
  })

  it('moves the top foundation card back onto a valid tableau card', () => {
    const state = createTestState({
      foundations: {
        hearts: foundationPileThrough('hearts', 6),
        diamonds: [],
        clubs: [],
        spades: [],
      },
      tableau: tableauWith([card('spades', 7)]),
    })

    const next = applyMove(
      state,
      { source: 'foundation', suit: 'hearts' },
      { type: 'tableau', columnIndex: 0 }
    )

    expect(next.foundations.hearts.map((c) => c.rank)).toEqual([1, 2, 3, 4, 5])
    expect(next.tableau[0].map((c) => c.rank)).toEqual([7, 6])
    expect(next.tableau[0][1].suit).toBe('hearts')
  })
})

describe('face-down flip on move', () => {
  it('flips the newly exposed face-down card after moving the face-up tail away', () => {
    const hidden = card('spades', 10, false)
    const state = createTestState({
      tableau: tableauWith([hidden, card('hearts', 6)], [card('spades', 7)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 0, cardIndex: 1 },
      { type: 'tableau', columnIndex: 1 }
    )

    expect(next.tableau[0]).toHaveLength(1)
    expect(next.tableau[0][0].id).toBe(hidden.id)
    expect(next.tableau[0][0].faceUp).toBe(true)
  })

  it('leaves an already face-up newly exposed card untouched', () => {
    const exposed = card('spades', 10)
    const state = createTestState({
      tableau: tableauWith([exposed, card('hearts', 6)], [card('spades', 7)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 0, cardIndex: 1 },
      { type: 'tableau', columnIndex: 1 }
    )

    expect(next.tableau[0][0].id).toBe(exposed.id)
    expect(next.tableau[0][0].faceUp).toBe(true)
  })

  it('empties a column without throwing when its last card moves away', () => {
    const state = createTestState({
      tableau: tableauWith([card('hearts', 6)], [card('spades', 7)]),
    })

    const next = applyMove(
      state,
      { source: 'tableau', columnIndex: 0, cardIndex: 0 },
      { type: 'tableau', columnIndex: 1 }
    )

    expect(next.tableau[0]).toEqual([])
    expect(next.tableau[1].map((c) => c.rank)).toEqual([7, 6])
  })
})

describe('drop hints', () => {
  it('returns all-false hints without a selection', () => {
    const state = createTestState({
      waste: [card('hearts', 6)],
      tableau: tableauWith([card('spades', 7)]),
    })

    const hints = getDropHints(state)

    expect(hints.tableau).toEqual(Array.from({ length: 7 }, () => false))
    expect(hints.foundations).toEqual({
      hearts: false,
      diamonds: false,
      clubs: false,
      spades: false,
    })
  })

  it('marks exactly the legal tableau columns and matching foundation for a waste selection', () => {
    const state = createTestState({
      waste: [card('hearts', 6)],
      tableau: tableauWith(
        [card('spades', 7)],
        [card('clubs', 7)],
        [card('diamonds', 7)]
      ),
      foundations: {
        hearts: foundationPileThrough('hearts', 5),
        diamonds: [],
        clubs: [],
        spades: [],
      },
      selected: { source: 'waste' },
    })

    const hints = getDropHints(state)

    expect(hints.tableau).toEqual([true, true, false, false, false, false, false])
    expect(hints.foundations).toEqual({
      hearts: true,
      diamonds: false,
      clubs: false,
      spades: false,
    })
  })

  it('always excludes the source column from tableau hints', () => {
    const state = createTestState({
      tableau: tableauWith([card('clubs', 7), card('hearts', 6)], [card('spades', 7)]),
      selected: { source: 'tableau', columnIndex: 0, cardIndex: 1 },
    })

    const hints = getDropHints(state)

    expect(hints.tableau[0]).toBe(false)
    expect(hints.tableau[1]).toBe(true)
  })
})
