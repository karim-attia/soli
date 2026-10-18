import { act, useRef } from 'react'
import type { MutableRefObject } from 'react'
import TestRenderer from 'react-test-renderer'

import {
  useKlondikeHistoryEntry,
  type UseKlondikeHistoryEntryResult,
} from '../../../../src/features/klondike/hooks/useKlondikeHistoryEntry'
import type { GameState } from '../../../../src/solitaire/klondike'
import type { HistoryEntry } from '../../../../src/state/history'
import { createTestState } from '../../solitaire/helpers'

// G8 regression (scoring plan, round 3 device test): the TOTAL badge double-counted
// a win recorded DURING hydration. On relaunch with Auto Up on, the auto-queue wins
// the near-win board ~35 ms after HYDRATE_STATE — before history hydration has
// finished — so the hydration effect (which links boardEntryId) sees `hasWon` and
// bails, the result is written through the tracked currentGameEntryIdRef, and the
// scored row stays UNLINKED: the HUD adds the live $208 on top of the settled sum.
// Invariant under test: whichever row receives the result becomes boardEntryId.
jest.mock('../../../../src/state/history', () => ({
  ...jest.requireActual('../../../../src/state/history'),
  useHistory: jest.fn(),
}))

const { useHistory } = jest.requireMock('../../../../src/state/history') as {
  useHistory: jest.Mock
}

// React act() outside react-dom needs the env flag (React 19).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const ROW_ID = 'row-vegas-nearwin'

const vegasState = (overrides: Partial<GameState> = {}): GameState =>
  createTestState({
    exactId: 'E1_vegas',
    drawCount: 1,
    vegasRules: true,
    moveCount: 243,
    score: { standard: 695, vegas: 203 },
    ...overrides,
  })

const rowFor = (state: GameState, patch: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: ROW_ID,
  exactId: state.exactId,
  deckChecksum: state.deckChecksum,
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
  ...patch,
})

type HarnessProps = {
  state: GameState
  entryIdRef: MutableRefObject<string | null>
  latest: MutableRefObject<UseKlondikeHistoryEntryResult | null>
}

const Harness = ({ state, entryIdRef, latest }: HarnessProps) => {
  const stateRef = useRef(state)
  stateRef.current = state
  const previousHasWonRef = useRef(false)
  const demoPlaybackActiveRef = useRef(false)
  latest.current = useKlondikeHistoryEntry({
    state,
    stateRef,
    currentGameEntryIdRef: entryIdRef,
    previousHasWonRef,
    demoPlaybackActiveRef,
    // Saved-game hydration is done; history hydration is driven by the mock.
    storageHydrated: true,
    // Animations off → the solved result is written synchronously in the win effect.
    animationsEnabled: false,
    celebrationAnimationsEnabled: false,
    dispatch: jest.fn(),
  })
  return null
}

const historyValue = (entries: HistoryEntry[], hydrated: boolean, mocks: Record<string, jest.Mock>) => ({
  entries,
  hydrated,
  recordResult: mocks.recordResult,
  updateEntry: mocks.updateEntry,
  getActiveEntry: mocks.getActiveEntry,
})

describe('useKlondikeHistoryEntry · boardEntryId follows the result write (G8)', () => {
  it('links the row scored by a win that lands before history hydration', () => {
    const mocks = {
      recordResult: jest.fn(() => 'unexpected-new-row'),
      updateEntry: jest.fn(),
      getActiveEntry: jest.fn(async () => null),
    }
    const entryIdRef: MutableRefObject<string | null> = { current: ROW_ID }
    const latest: MutableRefObject<UseKlondikeHistoryEntryResult | null> = { current: null }
    const inProgress = vegasState()

    // 1. Relaunch: persistence restored the row link, history is still loading.
    useHistory.mockReturnValue(historyValue([], false, mocks))
    let renderer!: TestRenderer.ReactTestRenderer
    act(() => {
      renderer = TestRenderer.create(
        <Harness state={inProgress} entryIdRef={entryIdRef} latest={latest} />
      )
    })
    expect(latest.current?.boardEntryId).toBeNull()

    // 2. Auto-complete wins the board while history is STILL not hydrated.
    const won = vegasState({
      hasWon: true,
      moveCount: 244,
      score: { standard: 700, vegas: 208 },
    })
    act(() => {
      renderer.update(<Harness state={won} entryIdRef={entryIdRef} latest={latest} />)
    })
    expect(mocks.updateEntry).toHaveBeenCalledTimes(1)
    expect(mocks.updateEntry).toHaveBeenCalledWith(
      ROW_ID,
      expect.objectContaining({ status: 'solved', solved: true, vegasScore: 208 })
    )
    expect(mocks.recordResult).not.toHaveBeenCalled()
    // The tracked link is consumed by the write (next deal gets a fresh row)…
    expect(entryIdRef.current).toBeNull()

    // 3. History hydrates afterwards with the (now scored) row. The hydration
    //    effect skips won boards, so only the write can have linked the row.
    const settledRow = rowFor(won, {
      status: 'solved',
      solved: true,
      vegasScore: 208,
      standardScore: 700,
    })
    useHistory.mockReturnValue(historyValue([settledRow], true, mocks))
    act(() => {
      renderer.update(<Harness state={won} entryIdRef={entryIdRef} latest={latest} />)
    })

    // …but the board still knows its row, so the HUD sees it as settled.
    expect(latest.current?.boardEntryId).toBe(ROW_ID)
    expect(mocks.updateEntry).toHaveBeenCalledTimes(1)
    expect(mocks.recordResult).not.toHaveBeenCalled()
  })

  it('links the active row completed through the in-memory match', () => {
    // Link lost (e.g. after a restart) but the active row is loaded: the result goes
    // to that row and the board must point at it.
    const state = vegasState()
    const activeRow = rowFor(state)
    const mocks = {
      recordResult: jest.fn(() => 'unexpected-new-row'),
      updateEntry: jest.fn(),
      getActiveEntry: jest.fn(async () => null),
    }
    const entryIdRef: MutableRefObject<string | null> = { current: null }
    const latest: MutableRefObject<UseKlondikeHistoryEntryResult | null> = { current: null }
    useHistory.mockReturnValue(historyValue([activeRow], true, mocks))

    act(() => {
      TestRenderer.create(<Harness state={state} entryIdRef={entryIdRef} latest={latest} />)
    })
    // The hydration effect links the matching active row.
    expect(latest.current?.boardEntryId).toBe(ROW_ID)
    expect(entryIdRef.current).toBe(ROW_ID)

    // Simulate a lost link right before the abandon write.
    entryIdRef.current = null
    act(() => {
      latest.current?.recordCurrentGameResult()
    })
    expect(mocks.updateEntry).toHaveBeenCalledWith(
      ROW_ID,
      expect.objectContaining({ status: 'incomplete', vegasScore: 203 })
    )
    expect(latest.current?.boardEntryId).toBe(ROW_ID)
  })
})
