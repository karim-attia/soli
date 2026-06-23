import { normalizeHistoryEntry, type HistoryEntry } from '../../../src/state/history'
import { getSolvableDealsForDrawCount } from '../../../src/data/solvableDealsV2'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
)

const createEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry =>
  ({
    id: 'history-1',
    exactId: 'E1_0',
    deckChecksum: 'D1_TEST',
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

describe('history draw count metadata', () => {
  it('does not preserve stale solvable labels without catalog proof', () => {
    const normalized = normalizeHistoryEntry(createEntry())

    expect(normalized.drawCount).toBe(1)
    expect(normalized.solvable).toBe(false)
    expect(normalized.solvableForDrawCount).toBeNull()
  })

  it('derives solvability from exact catalog ID and the played draw count', () => {
    const [catalogDeal] = getSolvableDealsForDrawCount(1)
    const normalized = normalizeHistoryEntry(
      createEntry({
        exactId: catalogDeal.exactId,
        drawCount: 1,
        solvable: false,
        solvableForDrawCount: null,
      })
    )

    expect(normalized.drawCount).toBe(1)
    expect(normalized.solvable).toBe(true)
    expect(normalized.solvableForDrawCount).toBe(1)
  })
})
