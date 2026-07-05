// Reducer-level HYDRATE_STATE semantics only. Structural validation of
// corrupted persisted snapshots happens in src/storage/gamePersistence.ts
// before HYDRATE_STATE is ever dispatched and is covered by
// test/unit/storage/gamePersistence.test.ts — intentionally not duplicated here.
import { klondikeReducer } from '../../../src/solitaire/klondike'
import {
  card,
  createTestState,
  foundationPileThrough,
  resetCardCounter,
  tableauWith,
} from './helpers'

beforeEach(() => {
  resetCardCounter()
})

describe('HYDRATE_STATE', () => {
  it('clears any selection carried in the payload', () => {
    const current = createTestState()
    const payload = createTestState({
      waste: [card('hearts', 6)],
      selected: { source: 'waste' },
    })

    const next = klondikeReducer(current, { type: 'HYDRATE_STATE', state: payload })

    expect(next.selected).toBeNull()
  })

  it('keeps the reducer current autoUpEnabled when the action has no override', () => {
    // The payload's own autoUpEnabled is ignored; the live setting wins.
    const current = createTestState({ autoUpEnabled: false })
    const payload = createTestState({ autoUpEnabled: true })

    const next = klondikeReducer(current, { type: 'HYDRATE_STATE', state: payload })

    expect(next.autoUpEnabled).toBe(false)
  })

  it('applies the autoUpEnabled override when provided', () => {
    const current = createTestState({ autoUpEnabled: false })
    const payload = createTestState({ autoUpEnabled: false })

    const next = klondikeReducer(current, {
      type: 'HYDRATE_STATE',
      state: payload,
      autoUpEnabled: true,
    })

    expect(next.autoUpEnabled).toBe(true)
  })

  it('halts a carried-over auto queue when Auto Up is disabled', () => {
    const current = createTestState({ autoUpEnabled: false })
    const payload = createTestState({
      autoQueue: [{ type: 'draw' }],
      isAutoCompleting: true,
    })

    const next = klondikeReducer(current, { type: 'HYDRATE_STATE', state: payload })

    expect(next.autoQueue).toHaveLength(0)
    expect(next.isAutoCompleting).toBe(false)
  })

  it('schedules an auto queue when hydrating a ready board with Auto Up enabled', () => {
    const current = createTestState()
    const payload = createTestState({
      tableau: tableauWith([card('hearts', 1)]),
      drawCount: 1,
    })

    const next = klondikeReducer(current, {
      type: 'HYDRATE_STATE',
      state: payload,
      autoUpEnabled: true,
    })

    expect(next.isAutoCompleting).toBe(true)
    expect(next.autoQueue).toEqual([
      {
        type: 'move',
        selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
        target: { type: 'foundation', suit: 'hearts' },
      },
    ])
  })

  it('repairs a stale hasWon flag when the payload foundations are complete', () => {
    const current = createTestState()
    const payload = createTestState({
      foundations: {
        hearts: foundationPileThrough('hearts', 13),
        diamonds: foundationPileThrough('diamonds', 13),
        clubs: foundationPileThrough('clubs', 13),
        spades: foundationPileThrough('spades', 13),
      },
      hasWon: false,
      winCelebrations: 0,
    })

    const next = klondikeReducer(current, { type: 'HYDRATE_STATE', state: payload })

    expect(next.hasWon).toBe(true)
    expect(next.winCelebrations).toBe(1)
  })
})
