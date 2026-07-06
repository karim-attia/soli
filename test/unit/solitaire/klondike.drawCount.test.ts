import {
  TABLEAU_COLUMN_COUNT,
  createDemoGameState,
  createInitialState,
  createSolvableGameState,
  klondikeReducer,
  type Card,
  type GameState,
  type Rank,
} from '../../../src/solitaire/klondike'
import { normalizeDrawCount } from '../../../src/solitaire/drawCount'

const card = (id: string, rank: Rank): Card => ({
  id,
  suit: 'clubs',
  rank,
  faceUp: false,
})

const createState = (drawCount: GameState['drawCount'], stock: Card[]): GameState => ({
  stock,
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
  exactId: 'E1_0',
  deckChecksum: 'D1_TEST',
  drawCount,
  elapsedMs: 0,
  timerState: 'idle',
  timerStartedAt: null,
  history: [],
  future: [],
  selected: null,
  autoUpEnabled: false,
  moveLog: [],
  initialWasteRevealed: true,
})

const ids = (cards: Card[]): string[] => cards.map((item) => item.id)

describe('Klondike draw count', () => {
  it('defaults new games to Draw 1 and preserves the existing initial reveal', () => {
    const state = createInitialState()

    expect(state.drawCount).toBe(1)
    expect(state.waste).toHaveLength(1)
    expect(state.stock).toHaveLength(23)
  })

  it('uses the selected draw count for the initial reveal', () => {
    const state = createInitialState(5)

    expect(state.drawCount).toBe(5)
    expect(state.waste).toHaveLength(5)
    expect(state.stock).toHaveLength(19)
  })

  it('creates curated v2 deals from exact catalog entries', () => {
    const deal = { exactId: 'E1_0' as const, drawMask: 1 }
    const state = createSolvableGameState(deal, 1)

    expect(state.drawCount).toBe(1)
    expect(state.waste).toHaveLength(1)
    expect(state.exactId).toBe(deal.exactId)
    expect(state.deckChecksum).toMatch(/^D1_/)
  })

  it('rejects curated v2 deals that do not cover the selected draw count', () => {
    const deal = { exactId: 'E1_0' as const, drawMask: 1 }

    expect(() => createSolvableGameState(deal, 2)).toThrow('is not cataloged for Draw 2')
  })

  it('defaults the developer demo to Draw 1', () => {
    const state = createDemoGameState()

    expect(state.drawCount).toBe(1)
    expect(state.waste).toHaveLength(1)
    expect(state.stock).toHaveLength(9)
    expect(state.exactId).toMatch(/^E1_/)
    expect(state.deckChecksum).toMatch(/^D1_/)
  })

  it('can create the developer demo with the selected draw count', () => {
    const state = createDemoGameState(4)

    expect(state.drawCount).toBe(4)
    expect(state.waste).toHaveLength(4)
    expect(state.stock).toHaveLength(6)
  })

  it('normalizes missing and invalid persisted values to Draw 1', () => {
    expect(normalizeDrawCount(undefined)).toBe(1)
    expect(normalizeDrawCount(0)).toBe(1)
    expect(normalizeDrawCount(6)).toBe(1)
    expect(normalizeDrawCount(3.5)).toBe(1)
    expect(normalizeDrawCount('3')).toBe(1)
    expect(normalizeDrawCount(3)).toBe(3)
  })

  it('draws cards in repeated-pop order and counts the action as one move', () => {
    const state = createState(3, [
      card('a', 1),
      card('b', 2),
      card('c', 3),
      card('d', 4),
      card('e', 5),
    ])

    const next = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })

    expect(ids(next.stock)).toEqual(['a', 'b'])
    expect(ids(next.waste)).toEqual(['e', 'd', 'c'])
    expect(next.waste.every((item) => item.faceUp)).toBe(true)
    expect(next.moveCount).toBe(1)
    expect(next.history).toHaveLength(1)
    expect(next.history[0].drawCount).toBe(3)
  })

  it.each([2, 3, 4, 5] as const)(
    'draws all remaining cards when Draw %i exceeds the stock size',
    (drawCount) => {
      const state = createState(drawCount, [card('a', 1), card('b', 2)])

      const next = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })

      expect(next.stock).toHaveLength(0)
      expect(ids(next.waste)).toEqual(['b', 'a'])
    }
  )

  it('recycles the complete waste without changing the stock order', () => {
    const initialStock = [
      card('a', 1),
      card('b', 2),
      card('c', 3),
      card('d', 4),
      card('e', 5),
    ]
    let state = createState(3, initialStock)

    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    expect(ids(state.waste)).toEqual(['e', 'd', 'c', 'b', 'a'])

    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })

    expect(ids(state.stock)).toEqual(ids(initialStock))
    expect(state.waste).toHaveLength(0)
    expect(state.drawCount).toBe(3)
  })

  it('restores the game rule through undo and redo scrubbing', () => {
    const initial = createState(4, [
      card('a', 1),
      card('b', 2),
      card('c', 3),
      card('d', 4),
      card('e', 5),
    ])
    const drawn = klondikeReducer(initial, { type: 'DRAW_OR_RECYCLE' })
    const undone = klondikeReducer(drawn, { type: 'UNDO' })

    expect(undone.drawCount).toBe(4)
    expect(ids(undone.stock)).toEqual(ids(initial.stock))
    expect(undone.future[0].drawCount).toBe(4)

    const redone = klondikeReducer(undone, { type: 'SCRUB_TO_INDEX', index: 1 })

    expect(redone.drawCount).toBe(4)
    expect(ids(redone.waste)).toEqual(ids(drawn.waste))
  })

  it('only applies a changed setting when a fresh game carries it', () => {
    const active = createState(2, [card('a', 1), card('b', 2), card('c', 3)])
    const unchanged = klondikeReducer(active, {
      type: 'HYDRATE_STATE',
      state: active,
    })
    expect(unchanged.drawCount).toBe(2)

    // A4: NEW_GAME was removed to keep the reducer pure; fresh deals are built
    // outside the reducer (createInitialState) and hydrated in.
    const nextGame = klondikeReducer(active, {
      type: 'HYDRATE_STATE',
      state: createInitialState(5),
    })
    expect(nextGame.drawCount).toBe(5)
  })
})
