import {
  FOUNDATION_SUIT_ORDER,
  TABLEAU_COLUMN_COUNT,
  type Card,
  type GameState,
  type Rank,
  type Suit,
  klondikeReducer,
} from '../../../src/solitaire/klondike'
import { DRAW_COUNT_OPTIONS } from '../../../src/solitaire/drawCount'

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
  exactId: 'E1_0',
  deckChecksum: 'D1_TEST',
  elapsedMs: 0,
  timerState: 'idle',
  timerStartedAt: null,
  history: [],
  future: [],
  selected: null,
  autoUpEnabled: true,
  moveLog: [],
  initialWasteRevealed: true,
  ...overrides,
  drawCount: overrides.drawCount ?? 1,
})

const createPileThrough = (suit: Suit, topRank: Rank): Card[] =>
  Array.from({ length: topRank }, (_, index) => card(suit, (index + 1) as Rank))

// Drives the queue the way useAutoQueueRunner does, minus the timers. The guard is
// deliberately generous and asserted on: a run that never stops is itself the bug.
const drainAutoQueue = (state: GameState): GameState => {
  let current = state
  let guard = 0
  while (current.isAutoCompleting && guard < 100) {
    current = klondikeReducer(current, { type: 'ADVANCE_AUTO_QUEUE' })
    guard += 1
  }
  expect(guard).toBeLessThan(100)
  return current
}

describe('Auto Up setting', () => {
  beforeEach(() => {
    cardCounter = 0
  })

  // R2b (review fix batch, 2026-07-06): same-value toggles must be pure no-ops.
  // The enable branch used to run finalizeState, which could schedule an auto
  // queue — and scheduling pushes a history snapshot WITHOUT a move-log entry,
  // silently drifting the persisted replay. A halted queue (e.g. after SELECT_*)
  // is legitimately rescheduled by the next logged action's finalize instead.
  it('treats a same-value enable as a pure no-op even on an auto-ready board', () => {
    const state = createEmptyState({
      tableau: [[card('hearts', 1)], ...Array.from({ length: 6 }, () => [])],
    })

    const nextState = klondikeReducer(state, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: true,
    })

    expect(nextState).toBe(state)
    expect(nextState.autoQueue).toHaveLength(0)
    expect(nextState.history).toHaveLength(0)
    expect(nextState.moveLog).toHaveLength(0)
  })

  it('treats a same-value disable as a pure no-op', () => {
    const state = createEmptyState({ autoUpEnabled: false })

    expect(klondikeReducer(state, { type: 'SET_AUTO_UP_ENABLED', enabled: false })).toBe(
      state
    )
  })

  it('still schedules the queue when enabling flips the value on a ready board', () => {
    const state = createEmptyState({
      autoUpEnabled: false,
      tableau: [[card('hearts', 1)], ...Array.from({ length: 6 }, () => [])],
    })

    const nextState = klondikeReducer(state, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: true,
    })

    expect(nextState.autoUpEnabled).toBe(true)
    expect(nextState.isAutoCompleting).toBe(true)
    expect(nextState.autoQueue).toHaveLength(1)
    expect(nextState.moveLog).toEqual([{ k: 'autoUp', on: true }])
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

  it('keeps the existing Draw 1 trigger while cards remain in the stock', () => {
    // Enabling must flip the value: same-value dispatches are pure no-ops (R2b).
    const state = createEmptyState({
      autoUpEnabled: false,
      drawCount: 1,
      stock: [card('hearts', 1, false)],
    })

    const nextState = klondikeReducer(state, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: true,
    })

    expect(nextState.isAutoCompleting).toBe(true)
    expect(nextState.autoQueue).toEqual([
      { type: 'draw' },
      {
        type: 'move',
        selection: { source: 'waste' },
        target: { type: 'foundation', suit: 'hearts' },
      },
    ])
  })

  // 2026-09-09 (auto-complete reliability): the next two tests used to pin the
  // OPPOSITE expectation — Draw 2-5 refused to start Auto Up while anything was
  // left in the stock or waste. That rule was a proxy for "the run can finish",
  // and a bad one: a Draw 3 board with every tableau card face up and playable
  // cards still in the waste was refused even though the auto run would have
  // emptied it. That is the reported bug ("sometimes the board does not
  // auto-complete despite being in a state where cards just need to be moved to
  // the foundation"). The gate is now the simulated outcome of the run itself
  // (scheduleAutoQueue → planAutoActions), so the draw count no longer decides
  // anything; see the "does not schedule a run it cannot finish" tests below for
  // the other direction, which the old Draw 1 branch got wrong.
  it('starts Auto Up for Draw 2-5 while the stock still holds cards the run will play', () => {
    // Enabling must flip the value: same-value dispatches are pure no-ops (R2b).
    const state = createEmptyState({
      autoUpEnabled: false,
      drawCount: 2,
      stock: [card('hearts', 1, false)],
    })

    const nextState = klondikeReducer(state, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: true,
    })

    expect(nextState.isAutoCompleting).toBe(true)
    expect(nextState.autoQueue).toEqual([
      { type: 'draw' },
      {
        type: 'move',
        selection: { source: 'waste' },
        target: { type: 'foundation', suit: 'hearts' },
      },
    ])
  })

  it('starts Auto Up for Draw 2-5 after the final draw even though the waste still holds a card', () => {
    const state = createEmptyState({
      drawCount: 2,
      stock: [card('hearts', 1, false)],
    })

    const nextState = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })

    expect(nextState.stock).toHaveLength(0)
    expect(nextState.waste).toHaveLength(1)
    expect(nextState.isAutoCompleting).toBe(true)
    expect(nextState.autoQueue).toEqual([
      {
        type: 'move',
        selection: { source: 'waste' },
        target: { type: 'foundation', suit: 'hearts' },
      },
    ])
  })

  it('starts Auto Up for Draw 2-5 after the last waste card leaves the top-right area', () => {
    const state = createEmptyState({
      drawCount: 2,
      waste: [card('hearts', 1)],
      tableau: [[card('clubs', 1)], ...Array.from({ length: 6 }, () => [])],
    })

    const nextState = klondikeReducer(state, {
      type: 'APPLY_MOVE',
      selection: { source: 'waste' },
      target: { type: 'foundation', suit: 'hearts' },
    })

    expect(nextState.stock).toHaveLength(0)
    expect(nextState.waste).toHaveLength(0)
    expect(nextState.isAutoCompleting).toBe(true)
    expect(nextState.autoQueue).toEqual([
      {
        type: 'move',
        selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
        target: { type: 'foundation', suit: 'clubs' },
      },
    ])
  })

  it('drains a trivially winnable Draw 3 board all the way to a won state', () => {
    // The board the bug report was about: Draw 3, every tableau card face up, and
    // the last few cards spread across tableau, waste and stock. Nothing asserted
    // end-to-end draining before, so the run is advanced here until it stops.
    const foundations = FOUNDATION_SUIT_ORDER.reduce(
      (acc, suit) => {
        acc[suit] = createPileThrough(suit, 12)
        return acc
      },
      {} as GameState['foundations']
    )
    const state = createEmptyState({
      autoUpEnabled: false,
      drawCount: 3,
      foundations,
      tableau: [
        [card('clubs', 13)],
        [card('spades', 13)],
        ...Array.from({ length: 5 }, () => []),
      ],
      waste: [card('hearts', 13)],
      stock: [card('diamonds', 13, false)],
    })

    let nextState = klondikeReducer(state, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: true,
    })

    expect(nextState.isAutoCompleting).toBe(true)
    expect(nextState.autoQueue).toHaveLength(5)

    // Same loop the runner drives, minus the timers.
    let guard = 0
    while (nextState.isAutoCompleting && guard < 50) {
      nextState = klondikeReducer(nextState, { type: 'ADVANCE_AUTO_QUEUE' })
      guard += 1
    }

    expect(nextState.autoQueue).toHaveLength(0)
    expect(nextState.stock).toHaveLength(0)
    expect(nextState.waste).toHaveLength(0)
    expect(nextState.tableau.every((column) => column.length === 0)).toBe(true)
    expect(
      FOUNDATION_SUIT_ORDER.every((suit) => nextState.foundations[suit].length === 13)
    ).toBe(true)
    expect(nextState.hasWon).toBe(true)
  })

  it('does not schedule a run it cannot finish on an all-face-up Draw 1 board', () => {
    // Runaway guard. The old gate said "Draw 1 + tableau all face up = ready", so a
    // board like this one queued MAX_AUTO_COMPLETE_ITERATIONS (500) draws/recycles,
    // animated all of them, was still "ready" afterwards and scheduled another 500 —
    // forever, each schedule also pushing a history snapshot. Nothing here can ever
    // reach a foundation (no aces), so the simulated run cannot clear the board and
    // the queue must not start at all.
    const state = createEmptyState({
      autoUpEnabled: false,
      drawCount: 1,
      tableau: [
        [card('spades', 5)],
        [card('diamonds', 9)],
        ...Array.from({ length: 5 }, () => []),
      ],
      stock: [card('clubs', 7, false)],
    })

    const nextState = klondikeReducer(state, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: true,
    })

    expect(nextState.isAutoCompleting).toBe(false)
    expect(nextState.autoQueue).toHaveLength(0)
    // No queue means no scheduling push either — an unlogged history push is the
    // replay-drift hazard the R2 review batch fixed elsewhere.
    expect(nextState.history).toHaveLength(0)
  })

  // The acceptance criterion is "in EVERY draw mode", but the tests above only
  // spell out Draw 1, 2 and 3. This is the same finishable board in all five
  // modes, played out to an empty board — a draw count creeping back into the
  // gate (or into planAutoActions' drawing) fails here for 2, 4 and 5 the way it
  // did before the fix. The fixture is draw-count agnostic on purpose: only one
  // card is ever in the stock, so every mode draws exactly it.
  DRAW_COUNT_OPTIONS.forEach((drawCount) => {
    it(`starts and finishes a run on a finishable board in Draw ${drawCount}`, () => {
      const state = createEmptyState({
        autoUpEnabled: false,
        drawCount,
        // 3♥ only becomes playable after A♥ (waste) and 2♥ (stock) have gone up,
        // so the run has to interleave tableau, waste and stock.
        tableau: [[card('hearts', 3)], ...Array.from({ length: 6 }, () => [])],
        waste: [card('hearts', 1)],
        stock: [card('hearts', 2, false)],
      })

      const scheduled = klondikeReducer(state, {
        type: 'SET_AUTO_UP_ENABLED',
        enabled: true,
      })

      expect(scheduled.isAutoCompleting).toBe(true)

      const finished = drainAutoQueue(scheduled)

      expect(finished.isAutoCompleting).toBe(false)
      expect(finished.autoQueue).toHaveLength(0)
      expect(finished.stock).toHaveLength(0)
      expect(finished.waste).toHaveLength(0)
      expect(finished.tableau.every((column) => column.length === 0)).toBe(true)
      expect(finished.foundations.hearts.map((pileCard) => pileCard.rank)).toEqual([
        1, 2, 3,
      ])
    })
  })

  // Safety envelope for the "stop at a second recycle with no move in between"
  // bound in planAutoActions. The bound itself is invisible from the outside (a
  // hopeless plan is discarded whether it is 3 actions or 500), but tightening it
  // by one step IS visible: this board is only finishable *because* the planner is
  // allowed to recycle once, and forbidding that recycle silently stops Auto Up on
  // every endgame whose last cards sit in the waste in the wrong order.
  it('plans a recycle when the run only becomes possible after one', () => {
    const state = createEmptyState({
      autoUpEnabled: false,
      drawCount: 1,
      // Waste top is 2♥ with an empty hearts foundation: nothing is playable until
      // the waste is recycled back into the stock and redrawn ace first.
      waste: [card('hearts', 1), card('hearts', 2)],
      stock: [],
    })

    const scheduled = klondikeReducer(state, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: true,
    })

    expect(scheduled.isAutoCompleting).toBe(true)
    expect(scheduled.autoQueue[0]).toEqual({ type: 'recycle' })

    const finished = drainAutoQueue(scheduled)

    expect(finished.stock).toHaveLength(0)
    expect(finished.waste).toHaveLength(0)
    expect(finished.foundations.hearts.map((pileCard) => pileCard.rank)).toEqual([1, 2])
  })

  // Pins the documented limitation of the greedy planner (see the comment in
  // scheduleAutoQueue and the "Open questions" section of the auto-complete
  // reliability doc): it knows tableau-top → foundation, waste-top → foundation and
  // waste-top → tableau, and nothing else. This board is finishable by hand and the
  // planner refuses it — deliberately. If someone teaches the planner tableau →
  // tableau moves, this test failing is the intended signal to update the doc, not
  // a regression to paper over.
  it('refuses an all-face-up board that only a tableau to tableau move can finish', () => {
    const state = createEmptyState({
      autoUpEnabled: false,
      drawCount: 1,
      foundations: {
        hearts: createPileThrough('hearts', 5),
        diamonds: [],
        clubs: createPileThrough('clubs', 3),
        spades: [],
      },
      // 5♣ sits on the 4♣ the clubs foundation is waiting for. Moving 5♣ onto the
      // red 6 frees 4♣, and then 5♣ and 6♥ both go up — but only a human can make
      // that first move.
      tableau: [
        [card('clubs', 4), card('clubs', 5)],
        [card('hearts', 6)],
        ...Array.from({ length: 5 }, () => []),
      ],
    })

    const enabled = klondikeReducer(state, { type: 'SET_AUTO_UP_ENABLED', enabled: true })

    expect(enabled.isAutoCompleting).toBe(false)
    expect(enabled.autoQueue).toHaveLength(0)
    expect(enabled.history).toHaveLength(0)

    // ...and the board really was finishable: make the one move the planner will
    // not make and the very same gate schedules a run that clears it.
    const afterPlayerMove = klondikeReducer(enabled, {
      type: 'APPLY_MOVE',
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 1 },
      target: { type: 'tableau', columnIndex: 1 },
    })

    expect(afterPlayerMove.isAutoCompleting).toBe(true)

    const finished = drainAutoQueue(afterPlayerMove)

    expect(finished.tableau.every((column) => column.length === 0)).toBe(true)
    expect(finished.foundations.clubs.map((pileCard) => pileCard.rank)).toEqual([
      1, 2, 3, 4, 5,
    ])
    expect(finished.foundations.hearts.map((pileCard) => pileCard.rank)).toEqual([
      1, 2, 3, 4, 5, 6,
    ])
  })

  it('lets the player manually finish and win with Auto Up disabled', () => {
    const foundations = FOUNDATION_SUIT_ORDER.reduce(
      (acc, suit) => {
        acc[suit] =
          suit === 'hearts' ? createPileThrough(suit, 12) : createPileThrough(suit, 13)
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
