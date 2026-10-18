import { act } from 'react'
import type { MutableRefObject } from 'react'
import TestRenderer from 'react-test-renderer'

import { HistoryProvider, useHistory, type HistoryEntry } from '../../../src/state/history'

// G8 regression (scoring plan, round 3): a result written BEFORE history hydration
// finished (relaunch + auto-complete win) targets a row that is not loaded yet, so
// updateEntry takes the DB-only branch. The initial page read runs before that
// queued write and loads the STALE row (still active, no score); the provider must
// replace it once the write lands, or the History tab and the TOTAL badge keep the
// stale copy until the next restart.
jest.mock('../../../src/storage/historyRepository', () => ({
  HISTORY_PAGE_SIZE: 50,
  isHistorySupported: true,
  initializeHistoryRepository: jest.fn(),
  getHistoryPage: jest.fn(),
  getHistorySummary: jest.fn(),
  getSolvableDealHistoryStats: jest.fn(async () => []),
  getHistoryEntryById: jest.fn(),
  updateHistoryEntry: jest.fn(async () => undefined),
  insertHistoryEntry: jest.fn(async () => undefined),
  clearHistoryEntries: jest.fn(async () => undefined),
  getActiveHistoryEntry: jest.fn(async () => null),
}))
jest.mock('../../../src/storage/historySeeds', () => ({
  clearSeededHistoryEntries: jest.fn(async () => undefined),
  seedHistoryEntries: jest.fn(async () => undefined),
}))

const repository = jest.requireMock('../../../src/storage/historyRepository') as Record<
  string,
  jest.Mock
>

// React act() outside react-dom needs the env flag (React 19).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const staleRow: HistoryEntry = {
  id: 'row-1',
  exactId: 'E1_vegas',
  deckChecksum: 'D1_TEST',
  displayName: 'Vegas near win',
  startedAt: '2026-10-13T10:00:00.000Z',
  finishedAt: null,
  solved: false,
  solvable: false,
  drawCount: 1,
  solvableForDrawCount: null,
  moves: 0,
  durationMs: null,
  preview: {
    tableau: [],
    wasteTop: null,
    foundations: { hearts: null, diamonds: null, clubs: null, spades: null },
    stockCount: 0,
  },
  status: 'active',
  standardScore: null,
  vegasScore: null,
}

const summary = {
  totalCount: 1,
  solvedCount: 0,
  incompleteCount: 0,
  activeCount: 1,
  vegasTotal: 0,
}

const flush = async () => {
  for (let i = 0; i < 6; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

const Probe = ({ latest }: { latest: MutableRefObject<ReturnType<typeof useHistory> | null> }) => {
  latest.current = useHistory()
  return null
}

describe('HistoryProvider · updateEntry before hydration (G8)', () => {
  it('refreshes the loaded copy of a row updated DB-only while the page was loading', async () => {
    let finishInit!: () => void
    repository.initializeHistoryRepository.mockReturnValue(
      new Promise<void>((resolve) => {
        finishInit = resolve
      })
    )
    repository.getHistoryPage.mockResolvedValue([staleRow])
    repository.getHistorySummary.mockResolvedValue(summary)
    repository.getHistoryEntryById.mockResolvedValue(staleRow)

    const latest: MutableRefObject<ReturnType<typeof useHistory> | null> = { current: null }
    act(() => {
      TestRenderer.create(
        <HistoryProvider>
          <Probe latest={latest} />
        </HistoryProvider>
      )
    })
    expect(latest.current?.hydrated).toBe(false)

    // The win is recorded while history is still initialising: nothing is loaded,
    // so the update is queued DB-only.
    act(() => {
      latest.current?.updateEntry('row-1', {
        solved: true,
        status: 'solved',
        moves: 244,
        durationMs: 1000,
        standardScore: 700,
        vegasScore: 208,
        finishedAt: '2026-10-13T10:05:00.000Z',
      })
    })
    expect(latest.current?.entries).toEqual([])

    await act(async () => {
      finishInit()
      await flush()
    })

    expect(latest.current?.hydrated).toBe(true)
    expect(repository.updateHistoryEntry).toHaveBeenCalledTimes(1)
    expect(repository.updateHistoryEntry.mock.calls[0][0]).toMatchObject({
      id: 'row-1',
      status: 'solved',
      vegasScore: 208,
    })
    // The page loaded the stale copy before the write; the provider must not keep it.
    expect(latest.current?.entries).toHaveLength(1)
    expect(latest.current?.entries[0]).toMatchObject({
      id: 'row-1',
      status: 'solved',
      solved: true,
      vegasScore: 208,
    })
  })
})
