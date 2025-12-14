import {
  TABLEAU_COLUMN_COUNT,
  type Card,
  type GameState,
  findAutoMoveTargetWithTableauAdjacentFallback,
} from '../../../src/solitaire/klondike'

const createEmptyState = (): GameState => ({
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
})

describe('findAutoMoveTargetWithTableauAdjacentFallback', () => {
  it('falls back to the adjacent (below) face-up card when the tapped tableau card cannot auto-move', () => {
    const aceClubs: Card = { id: 'ac', suit: 'clubs', rank: 1, faceUp: true }
    const twoClubs: Card = { id: '2c', suit: 'clubs', rank: 2, faceUp: true }

    const state = createEmptyState()
    state.tableau[0] = [twoClubs, aceClubs]

    const resolved = findAutoMoveTargetWithTableauAdjacentFallback(state, {
      source: 'tableau',
      columnIndex: 0,
      cardIndex: 0,
    })

    expect(resolved).toEqual({
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 1 },
      target: { type: 'foundation', suit: 'clubs' },
    })
  })

  it('falls back to the adjacent (above) face-up card when it can auto-move', () => {
    const sevenClubs: Card = { id: '7c', suit: 'clubs', rank: 7, faceUp: true }
    const sixDiamonds: Card = { id: '6d', suit: 'diamonds', rank: 6, faceUp: true }
    const eightDiamonds: Card = { id: '8d', suit: 'diamonds', rank: 8, faceUp: true }

    const state = createEmptyState()
    state.tableau[0] = [sevenClubs, sixDiamonds]
    state.tableau[1] = [eightDiamonds]

    const resolved = findAutoMoveTargetWithTableauAdjacentFallback(state, {
      source: 'tableau',
      columnIndex: 0,
      cardIndex: 1,
    })

    expect(resolved).toEqual({
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
      target: { type: 'tableau', columnIndex: 1 },
    })
  })

  it('does not consider adjacent face-down tableau cards for fallback', () => {
    const aceClubsFaceDown: Card = { id: 'ac-down', suit: 'clubs', rank: 1, faceUp: false }
    const twoClubs: Card = { id: '2c', suit: 'clubs', rank: 2, faceUp: true }

    const state = createEmptyState()
    state.tableau[0] = [aceClubsFaceDown, twoClubs]

    const resolved = findAutoMoveTargetWithTableauAdjacentFallback(state, {
      source: 'tableau',
      columnIndex: 0,
      cardIndex: 1,
    })

    expect(resolved).toBeNull()
  })

  it('returns the tapped tableau selection when it has a valid auto-move target', () => {
    const aceClubs: Card = { id: 'ac', suit: 'clubs', rank: 1, faceUp: true }

    const state = createEmptyState()
    state.tableau[0] = [aceClubs]

    const resolved = findAutoMoveTargetWithTableauAdjacentFallback(state, {
      source: 'tableau',
      columnIndex: 0,
      cardIndex: 0,
    })

    expect(resolved).toEqual({
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
      target: { type: 'foundation', suit: 'clubs' },
    })
  })
})
