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
