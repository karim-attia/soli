import {
  FOUNDATION_SUIT_ORDER,
  TABLEAU_COLUMN_COUNT,
  type Card,
  type GameState,
  type Rank,
  type Suit,
  klondikeReducer,
} from '../../../src/solitaire/klondike'

let cardCounter = 0

const card = (suit: Suit, rank: Rank, faceUp = true): Card => ({
  id: `${suit}-${rank}-${cardCounter++}`,
  suit,
  rank,
  faceUp,
})

const createEmptyState = (overrides: Partial<GameState> = {}): GameState => ({
  stock: [],
  waste: [],
  foundations: {
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: [],
  },
  tableau: Array.from({ length: TABLEAU_COLUMN_COUNT }, () => []),
  moveCount: 0,
  autoCompleteRuns: 0,
  autoQueue: [],
  isAutoCompleting: false,
  hasWon: false,
  winCelebrations: 0,
  shuffleId: 'test',
  solvableId: null,
  elapsedMs: 0,
  timerState: 'idle',
  timerStartedAt: null,
  history: [],
  future: [],
  selected: null,
  autoUpEnabled: true,
  ...overrides,
})

const createPileThrough = (suit: Suit, topRank: Rank): Card[] =>
  Array.from({ length: topRank }, (_, index) => card(suit, (index + 1) as Rank))

describe('Auto Up setting', () => {
  beforeEach(() => {
    cardCounter = 0
  })

  it('keeps Auto Up enabled by default and schedules the existing queue on a ready board', () => {
    const state = createEmptyState({
      tableau: [[card('hearts', 1)], ...Array.from({ length: 6 }, () => [])],
    })

    const nextState = klondikeReducer(state, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: true,
    })

    expect(nextState.autoUpEnabled).toBe(true)
    expect(nextState.isAutoCompleting).toBe(true)
    expect(nextState.autoQueue).toHaveLength(1)
  })

  it('does not start Auto Up when the final covered card is uncovered while disabled', () => {
    const state = createEmptyState({
      autoUpEnabled: false,
      tableau: [
        [card('hearts', 1, false), card('clubs', 1)],
        ...Array.from({ length: 6 }, () => []),
      ],
    })

    const nextState = klondikeReducer(state, {
      type: 'APPLY_MOVE',
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 1 },
      target: { type: 'foundation', suit: 'clubs' },
    })

    expect(nextState.tableau[0][0].faceUp).toBe(true)
    expect(nextState.foundations.clubs).toHaveLength(1)
    expect(nextState.autoUpEnabled).toBe(false)
    expect(nextState.isAutoCompleting).toBe(false)
    expect(nextState.autoQueue).toHaveLength(0)
  })

  it('still starts Auto Up after the final covered card is uncovered while enabled', () => {
    const state = createEmptyState({
      tableau: [
        [card('hearts', 1, false), card('clubs', 1)],
        ...Array.from({ length: 6 }, () => []),
      ],
    })

    const nextState = klondikeReducer(state, {
      type: 'APPLY_MOVE',
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 1 },
      target: { type: 'foundation', suit: 'clubs' },
    })

    expect(nextState.tableau[0][0].faceUp).toBe(true)
    expect(nextState.isAutoCompleting).toBe(true)
    expect(nextState.autoQueue).toHaveLength(1)
  })

  it('lets the player manually finish and win with Auto Up disabled', () => {
    const foundations = FOUNDATION_SUIT_ORDER.reduce(
      (acc, suit) => {
        acc[suit] =
          suit === 'hearts'
            ? createPileThrough(suit, 12)
            : createPileThrough(suit, 13)
        return acc
      },
      {} as GameState['foundations']
    )
    const state = createEmptyState({
      autoUpEnabled: false,
      foundations,
      tableau: [[card('hearts', 13)], ...Array.from({ length: 6 }, () => [])],
    })

    const nextState = klondikeReducer(state, {
      type: 'APPLY_MOVE',
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
      target: { type: 'foundation', suit: 'hearts' },
    })

    expect(nextState.hasWon).toBe(true)
    expect(nextState.winCelebrations).toBe(1)
    expect(nextState.isAutoCompleting).toBe(false)
    expect(nextState.autoQueue).toHaveLength(0)
  })

  it('stops an active Auto Up queue when the setting is turned off', () => {
    const queuedMove = {
      type: 'move' as const,
      selection: { source: 'tableau' as const, columnIndex: 0, cardIndex: 0 },
      target: { type: 'foundation' as const, suit: 'hearts' as const },
    }
    const state = createEmptyState({
      autoQueue: [queuedMove],
      isAutoCompleting: true,
    })

    const nextState = klondikeReducer(state, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: false,
    })

    expect(nextState.autoUpEnabled).toBe(false)
    expect(nextState.isAutoCompleting).toBe(false)
    expect(nextState.autoQueue).toHaveLength(0)
  })
})
