import {
  createHistoryPreviewFromState,
  createStartedHistoryEntryInputFromState,
} from '../../../src/state/history'
import { createInitialState } from '../../../src/solitaire/klondike'

describe('started history entries', () => {
  it('creates an active entry for a newly dealt random game', () => {
    const state = createInitialState(3)
    const startedAt = '2026-06-16T10:00:00.000Z'
    const preview = createHistoryPreviewFromState(state)

    const input = createStartedHistoryEntryInputFromState(state, {
      startedAt,
      preview,
    })

    expect(input).toMatchObject({
      exactId: state.exactId,
      deckChecksum: state.deckChecksum,
      solved: false,
      drawCount: 3,
      startedAt,
      finishedAt: null,
      moves: 0,
      // Active rows carry no duration so the history screen shows no "Time 0:00".
      durationMs: null,
      status: 'active',
    })
    expect(input.preview).toBe(preview)
  })
})
