import {
  mergeHistoryEntries,
  type HistoryEntry,
  type HistoryPreview,
} from '../../../src/state/history'

const preview: HistoryPreview = {
  tableau: [],
  wasteTop: null,
  foundations: {
    hearts: null,
    diamonds: null,
    clubs: null,
    spades: null,
  },
  stockCount: 0,
}

const createEntry = (index: number): HistoryEntry => ({
  id: `history-${index.toString().padStart(3, '0')}`,
  exactId: `E1_${index.toString(36)}`,
  deckChecksum: 'D1_TEST',
  displayName: `Game ${index}`,
  startedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, index)).toISOString(),
  finishedAt: null,
  solved: false,
  solvable: false,
  drawCount: 1,
  solvableForDrawCount: null,
  moves: index,
  durationMs: index * 1000,
  preview,
  status: 'incomplete',
})

describe('history pagination merging', () => {
  it('keeps entries beyond the old 200-row cap', () => {
    const entries = Array.from({ length: 250 }, (_, index) => createEntry(index))

    const merged = mergeHistoryEntries([], entries)

    expect(merged).toHaveLength(250)
    expect(merged[0].id).toBe('history-249')
    expect(merged[249].id).toBe('history-000')
  })

  it('deduplicates overlapping pages by history ID', () => {
    const firstPage = Array.from({ length: 50 }, (_, index) => createEntry(index))
    const overlappingPage = Array.from({ length: 50 }, (_, index) =>
      createEntry(index + 25)
    )

    expect(mergeHistoryEntries(firstPage, overlappingPage)).toHaveLength(75)
  })
})
