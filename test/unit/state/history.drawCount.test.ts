import { normalizeHistoryEntry, type HistoryEntry } from '../../../src/state/history'
import { isDrawOneSolvabilityResult } from '../../../src/features/klondike/hooks/useSolvableShuffleSelector'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

const createEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry =>
  ({
    id: 'history-1',
    shuffleId: 'SOLVABLE:test',
    displayName: 'Test',
    startedAt: '2026-06-05T10:00:00.000Z',
    finishedAt: null,
    solved: false,
    solvable: true,
    moves: 0,
    durationMs: 0,
    preview: {
      tableau: [],
      wasteTop: null,
      foundations: {
        hearts: null,
        diamonds: null,
        clubs: null,
        spades: null,
      },
      stockCount: 0,
    },
    status: 'active',
    ...overrides,
  }) as HistoryEntry

describe('history draw count migration', () => {
  it('defaults legacy solvable entries to Draw 1 metadata', () => {
    const normalized = normalizeHistoryEntry(createEntry())

    expect(normalized.drawCount).toBe(1)
    expect(normalized.solvableForDrawCount).toBe(1)
    expect(isDrawOneSolvabilityResult(normalized)).toBe(true)
  })

  it('keeps higher-draw results out of Draw 1 solvability statistics', () => {
    const normalized = normalizeHistoryEntry(
      createEntry({
        drawCount: 5,
        solvableForDrawCount: 1,
      })
    )

    expect(normalized.drawCount).toBe(5)
    expect(normalized.solvableForDrawCount).toBe(1)
    expect(isDrawOneSolvabilityResult(normalized)).toBe(false)
  })
})
