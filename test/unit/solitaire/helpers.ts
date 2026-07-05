import {
  TABLEAU_COLUMN_COUNT,
  type Card,
  type GameState,
  type Rank,
  type Suit,
} from '../../../src/solitaire/klondike'

let cardCounter = 0

export const resetCardCounter = () => {
  cardCounter = 0
}

export const card = (suit: Suit, rank: Rank, faceUp = true): Card => ({
  id: `${suit}-${rank}-${cardCounter++}`,
  suit,
  rank,
  faceUp,
})

// Pads the given columns with empty ones up to the full 7-column tableau so
// fixtures only spell out the columns they care about.
export const tableauWith = (...columns: Card[][]): Card[][] => [
  ...columns,
  ...Array.from({ length: TABLEAU_COLUMN_COUNT - columns.length }, () => []),
]

export const foundationPileThrough = (suit: Suit, topRank: Rank): Card[] =>
  Array.from({ length: topRank }, (_, index) => card(suit, (index + 1) as Rank))

export const createTestState = (overrides: Partial<GameState> = {}): GameState => ({
  stock: [],
  waste: [],
  foundations: {
    hearts: [],
    diamonds: [],
    clubs: [],
    spades: [],
  },
  tableau: tableauWith(),
  moveCount: 0,
  autoCompleteRuns: 0,
  autoQueue: [],
  isAutoCompleting: false,
  hasWon: false,
  winCelebrations: 0,
  exactId: 'E1_0',
  deckChecksum: 'D1_TEST',
  drawCount: 1,
  elapsedMs: 0,
  timerState: 'idle',
  timerStartedAt: null,
  history: [],
  future: [],
  selected: null,
  // Auto Up defaults to OFF here (unlike the app) so finalizeState never
  // schedules an auto queue mid-assertion; Auto Up scheduling behaviour is
  // owned by klondike.autoUpSetting.test.ts. Override per test when needed.
  autoUpEnabled: false,
  ...overrides,
})
