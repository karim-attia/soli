import {
  createGameStateFromExactId,
  createInitialState,
  getDropHints,
  initialAutoUpFromMoveLog,
  klondikeReducer,
  replayMoveLog,
  type GameState,
  type MoveTarget,
  type Selection,
} from '../../../src/solitaire/klondike'
import { boardSignature } from '../../../src/storage/gamePersistence'
import {
  card as makeCard,
  createTestState,
  resetCardCounter,
  tableauWith,
} from './helpers'

const firstValidMove = (
  state: GameState
): { selection: Selection; target: MoveTarget } | null => {
  const selections: Selection[] = []
  if (state.waste.length) {
    selections.push({ source: 'waste' })
  }
  state.tableau.forEach((column, columnIndex) => {
    column.forEach((card, cardIndex) => {
      if (card.faceUp) {
        selections.push({ source: 'tableau', columnIndex, cardIndex })
      }
    })
  })

  for (const selection of selections) {
    const hints = getDropHints({ ...state, selected: selection })
    const columnIndex = hints.tableau.findIndex(Boolean)
    if (columnIndex !== -1) {
      return { selection, target: { type: 'tableau', columnIndex } }
    }
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const
    for (const suit of suits) {
      if (hints.foundations[suit]) {
        return { selection, target: { type: 'foundation', suit } }
      }
    }
  }
  return null
}

describe('move log recording', () => {
  it('appends a draw entry for a board-changing draw', () => {
    let state = createInitialState()
    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })

    expect(state.moveLog).toEqual([{ k: 'draw' }])
  })

  it('does not log actions that leave the board unchanged', () => {
    let state = createInitialState()
    state = { ...state, stock: [], waste: [] }
    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    state = klondikeReducer(state, { type: 'UNDO' })
    state = klondikeReducer(state, { type: 'SCRUB_TO_INDEX', index: 0 })
    state = klondikeReducer(state, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: true,
    })

    expect(state.moveLog).toEqual([])
  })

  it('records move, undo and autoUp entries in dispatch order', () => {
    let state = createInitialState()
    state = klondikeReducer(state, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: false,
    })
    const move = firstValidMove(state)
    expect(move).not.toBeNull()
    state = klondikeReducer(state, { type: 'APPLY_MOVE', ...move! })
    state = klondikeReducer(state, { type: 'UNDO' })

    expect(state.moveLog.map((entry) => entry.k)).toEqual(['autoUp', 'move', 'undo'])
  })

  it('coalesces consecutive scrub entries to the final index', () => {
    let state = createInitialState()
    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    expect(state.history).toHaveLength(3)

    state = klondikeReducer(state, { type: 'SCRUB_TO_INDEX', index: 1 })
    state = klondikeReducer(state, { type: 'SCRUB_TO_INDEX', index: 0 })
    state = klondikeReducer(state, { type: 'SCRUB_TO_INDEX', index: 2 })

    const scrubEntries = state.moveLog.filter((entry) => entry.k === 'scrub')
    expect(scrubEntries).toEqual([{ k: 'scrub', i: 2 }])
  })

  it('replays a coalesced scrub run that returns to its origin as a no-op', () => {
    let live = createInitialState()
    live = klondikeReducer(live, { type: 'DRAW_OR_RECYCLE' })
    live = klondikeReducer(live, { type: 'DRAW_OR_RECYCLE' })
    // Scrub away and back: coalesces to a single scrub targeting the current index.
    live = klondikeReducer(live, { type: 'SCRUB_TO_INDEX', index: 0 })
    live = klondikeReducer(live, { type: 'SCRUB_TO_INDEX', index: 2 })
    expect(live.moveLog.filter((entry) => entry.k === 'scrub')).toEqual([
      { k: 'scrub', i: 2 },
    ])

    const base = createGameStateFromExactId(live.exactId, live.drawCount)
    const replayed = replayMoveLog(base, live.moveLog)
    expect(boardSignature(replayed)).toBe(boardSignature(live))
    expect(replayed.history).toHaveLength(live.history.length)
  })

  it('rebuilds board, history and future from the log alone', () => {
    let live = createInitialState()
    live = klondikeReducer(live, { type: 'DRAW_OR_RECYCLE' })
    const move = firstValidMove(live)
    expect(move).not.toBeNull()
    live = klondikeReducer(live, { type: 'APPLY_MOVE', ...move! })
    live = klondikeReducer(live, { type: 'UNDO' })

    const base = createGameStateFromExactId(live.exactId, live.drawCount)
    const replayed = replayMoveLog(base, live.moveLog)

    expect(boardSignature(replayed)).toBe(boardSignature(live))
    expect(replayed.history).toHaveLength(live.history.length)
    expect(replayed.future).toHaveLength(live.future.length)
    expect(replayed.moveCount).toBe(live.moveCount)
    // Replaying regenerates the same log, so the next persistence cycle round-trips.
    expect(replayed.moveLog).toEqual(live.moveLog)
  })

  it('throws when an entry does not apply (reducer drift guard)', () => {
    const base = createGameStateFromExactId(createInitialState().exactId, 1)
    expect(() =>
      replayMoveLog(base, [
        {
          k: 'move',
          sel: { source: 'foundation', suit: 'hearts' },
          tgt: { type: 'foundation', suit: 'hearts' },
        },
      ])
    ).toThrow(/did not apply/)
  })

  it('throws when a non-applying scrub targets a position other than the current one (R2c)', () => {
    // history is empty, so a scrub to index 3 clamps to the current position and
    // does not apply — but it is NOT a true no-op (entry.i !== history.length),
    // which means the replayed timeline diverged from the recorded one.
    const base = createGameStateFromExactId(createInitialState().exactId, 1)
    expect(() => replayMoveLog(base, [{ k: 'scrub', i: 3 }])).toThrow(/did not apply/)
  })

  it('round-trips two consecutive scrubs across an auto-ready position without depth drift (R2a)', () => {
    resetCardCounter()
    // Codex review (2026-07-06): scrub #1 landing on an auto-ready board makes
    // finalizeState schedule an auto-queue — which pushes a history snapshot and
    // clears future. Coalescing scrub #2 over scrub #1 dropped the log entry that
    // triggered that push, so replay skipped it and the undo/redo depths drifted.
    // Draw 3 makes auto-readiness vary across the timeline (requires empty
    // stock+waste), which this synthetic board exploits via a face-down card.
    const start = createTestState({
      autoUpEnabled: true,
      drawCount: 3,
      tableau: tableauWith(
        [makeCard('spades', 1)],
        [makeCard('hearts', 2, false), makeCard('hearts', 1)],
        [makeCard('spades', 2)]
      ),
    })
    const base = structuredClone(start)

    let live = start
    // Move 1: A♠ → foundation; the face-down 2♥ keeps the board not auto-ready.
    live = klondikeReducer(live, {
      type: 'APPLY_MOVE',
      selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
      target: { type: 'foundation', suit: 'spades' },
    })
    expect(live.autoQueue).toHaveLength(0)
    // Move 2: A♥ → foundation flips 2♥ face-up → auto-ready → queue scheduled
    // (history push).
    live = klondikeReducer(live, {
      type: 'APPLY_MOVE',
      selection: { source: 'tableau', columnIndex: 1, cardIndex: 1 },
      target: { type: 'foundation', suit: 'hearts' },
    })
    expect(live.autoQueue.length).toBeGreaterThan(0)
    // Move 3: manual move on the ready board (halts the queue, reschedules).
    live = klondikeReducer(live, {
      type: 'APPLY_MOVE',
      selection: { source: 'tableau', columnIndex: 1, cardIndex: 0 },
      target: { type: 'foundation', suit: 'hearts' },
    })

    // Scrub #1 lands on the auto-ready move-2 position (schedules again → push +
    // future clear); scrub #2 continues to the start — two consecutive scrub
    // dispatches, exactly the coalescing case.
    live = klondikeReducer(live, { type: 'SCRUB_TO_INDEX', index: 2 })
    live = klondikeReducer(live, { type: 'SCRUB_TO_INDEX', index: 0 })

    const replayed = replayMoveLog(base, live.moveLog)
    expect(boardSignature(replayed)).toBe(boardSignature(live))
    expect(replayed.history).toHaveLength(live.history.length)
    expect(replayed.future).toHaveLength(live.future.length)
    live.future.forEach((snapshot, index) => {
      expect(boardSignature(replayed.future[index])).toBe(boardSignature(snapshot))
    })
  })

  it('derives the deal-time Auto Up value from the first logged toggle', () => {
    expect(initialAutoUpFromMoveLog([], true)).toBe(true)
    expect(initialAutoUpFromMoveLog([], false)).toBe(false)
    expect(
      initialAutoUpFromMoveLog(
        [{ k: 'draw' }, { k: 'autoUp', on: false }, { k: 'autoUp', on: true }],
        true
      )
    ).toBe(true)
    expect(initialAutoUpFromMoveLog([{ k: 'autoUp', on: true }], true)).toBe(false)
  })

  it('replays 300 draw entries fast (timing evidence, no assertion)', () => {
    let live = createInitialState()
    for (let index = 0; index < 300; index += 1) {
      live = klondikeReducer(live, { type: 'DRAW_OR_RECYCLE' })
    }
    expect(live.moveLog).toHaveLength(300)

    const base = createGameStateFromExactId(live.exactId, live.drawCount)
    const startedAt = performance.now()
    const replayed = replayMoveLog(base, live.moveLog)
    const durationMs = performance.now() - startedAt
    // eslint-disable-next-line no-console
    console.log(`[moveLog] 300-entry replay took ${durationMs.toFixed(1)} ms`)
    expect(boardSignature(replayed)).toBe(boardSignature(live))
  })
})
