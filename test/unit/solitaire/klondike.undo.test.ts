import { createInitialState, klondikeReducer } from '../../../src/solitaire/klondike'

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
    const scrubbed = klondikeReducer(undone, { type: 'SCRUB_TO_INDEX', index: scrubIndex })

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

    const scrubbed = klondikeReducer(state, { type: 'SCRUB_TO_INDEX', index: 0 })

    expect(scrubbed.moveCount).toBe(beforeScrubMoveCount)
  })
})

