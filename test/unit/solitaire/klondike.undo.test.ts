import {
  createInitialState,
  klondikeReducer,
  snapshotFromState,
} from '../../../src/solitaire/klondike'
import { createTestState, foundationPileThrough } from './helpers'

describe('klondike undo history behaviour', () => {
  it('does not increment move count when undoing a move', () => {
    const initial = createInitialState()

    const afterDraw = klondikeReducer(initial, { type: 'DRAW_OR_RECYCLE' })
    expect(afterDraw.moveCount).toBe(initial.moveCount + 1)

    const undone = klondikeReducer(afterDraw, { type: 'UNDO' })
    expect(undone.moveCount).toBe(afterDraw.moveCount)
  })

  it('restores move count from snapshots when scrubbing timeline', () => {
    const initial = createInitialState()
    const afterDraw = klondikeReducer(initial, { type: 'DRAW_OR_RECYCLE' })
    const undone = klondikeReducer(afterDraw, { type: 'UNDO' })

    expect(undone.future.length).toBeGreaterThan(0)

    const scrubIndex = undone.history.length + 1
    const scrubbed = klondikeReducer(undone, {
      type: 'SCRUB_TO_INDEX',
      index: scrubIndex,
    })

    expect(scrubbed.moveCount).toBe(undone.moveCount)
  })

  it('retains history beyond the previous undo cap', () => {
    let state = createInitialState()
    const iterations = 220

    for (let step = 0; step < iterations; step += 1) {
      state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    }

    expect(state.history.length).toBeGreaterThanOrEqual(iterations)
  })

  it('keeps move count stable when scrubbing backward', () => {
    let state = createInitialState()
    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    const beforeScrubMoveCount = state.moveCount

    const scrubbed = klondikeReducer(state, {
      type: 'SCRUB_TO_INDEX',
      index: 0,
    })

    expect(scrubbed.moveCount).toBe(beforeScrubMoveCount)
  })

  // Product decision: undo rewinds the board, not the clock — once the game is
  // started, it runs. Since 2026-07-06 this is structural (GameSnapshot carries no
  // timer fields, so undo/scrub cannot touch the live clock by construction); one
  // behavioral pin per flow remains as a regression tripwire.
  describe('undo/scrub never change the clock', () => {
    it('keeps the live running clock across undo and scrub, even at move 0', () => {
      let state = createInitialState()
      state = klondikeReducer(state, { type: 'TIMER_START', startedAt: 1_000 })
      state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
      state = klondikeReducer(state, { type: 'TIMER_TICK', timestamp: 31_000 })
      expect(state.elapsedMs).toBe(30_000)

      const undone = klondikeReducer(state, { type: 'UNDO' })

      // Back at the move-0 deal board — but the clock stays live.
      expect(undone.history).toHaveLength(0)
      expect(undone.elapsedMs).toBe(30_000)
      expect(undone.timerState).toBe('running')
      expect(undone.timerStartedAt).toBe(31_000)

      const scrubbed = klondikeReducer(undone, {
        type: 'SCRUB_TO_INDEX',
        index: 1,
      })
      expect(scrubbed.elapsedMs).toBe(30_000)
      expect(scrubbed.timerState).toBe('running')
    })

    it('undoing from a won state keeps the stopped clock (board rewinds, win flag recomputes)', () => {
      const beforeWin = createTestState({
        foundations: {
          hearts: foundationPileThrough('hearts', 13),
          diamonds: foundationPileThrough('diamonds', 13),
          clubs: foundationPileThrough('clubs', 13),
          spades: foundationPileThrough('spades', 12),
        },
        waste: foundationPileThrough('spades', 13).slice(-1),
        moveCount: 51,
      })
      // The win handler stopped the live timer at the final duration.
      const won = createTestState({
        foundations: {
          hearts: foundationPileThrough('hearts', 13),
          diamonds: foundationPileThrough('diamonds', 13),
          clubs: foundationPileThrough('clubs', 13),
          spades: foundationPileThrough('spades', 13),
        },
        hasWon: true,
        winCelebrations: 1,
        moveCount: 52,
        elapsedMs: 105_000,
        timerState: 'paused',
        timerStartedAt: null,
        history: [snapshotFromState(beforeWin)],
      })

      const undone = klondikeReducer(won, { type: 'UNDO' })

      // The timer stays paused at the recorded duration until the next move restarts
      // it (useKlondikeTimer starts on moveCount increase; undo does not increase it).
      expect(undone.hasWon).toBe(false)
      expect(undone.elapsedMs).toBe(105_000)
      expect(undone.timerState).toBe('paused')
      expect(undone.timerStartedAt).toBeNull()
    })
  })
})
