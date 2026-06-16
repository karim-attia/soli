import { SOLVABLE_SHUFFLES } from '../../../src/data/solvableShuffles'
import {
  createHistoryPreviewFromState,
  createStartedHistoryEntryInputFromState,
} from '../../../src/state/history'
import {
  createInitialState,
  createSolvableGameState,
} from '../../../src/solitaire/klondike'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

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
      shuffleId: state.shuffleId,
      solved: false,
      solvable: false,
      drawCount: 3,
      solvableForDrawCount: null,
      startedAt,
      finishedAt: null,
      moves: 0,
      durationMs: 0,
      status: 'active',
    })
    expect(input?.preview).toBe(preview)
  })

  it('keeps curated deals marked as Draw 1-solvable when starting history', () => {
    const state = createSolvableGameState(SOLVABLE_SHUFFLES[0], 5)

    const input = createStartedHistoryEntryInputFromState(state)

    expect(input?.solvable).toBe(true)
    expect(input?.drawCount).toBe(5)
    expect(input?.solvableForDrawCount).toBe(1)
    expect(input?.status).toBe('active')
  })
})
