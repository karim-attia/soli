import { act, useRef } from 'react'
import TestRenderer from 'react-test-renderer'

import { useRewindToWinnable } from '../../../../src/features/klondike/hooks/useRewindToWinnable'
import { resolveRewindStepDelayMs } from '../../../../src/features/klondike/constants'
import {
  createInitialState,
  klondikeReducer,
  type GameAction,
  type GameSnapshot,
  type GameState,
} from '../../../../src/solitaire/klondike'
import type { WinnableProbeResult } from '../../../../src/solitaire/winnableBoundary'
import type { WarningMode } from '../../../../src/state/settings'

// Hook-level tests for the two things this hook owns that no pure helper can
// cover: the LIFETIME of a proven boundary (it has to outlive the warning era
// that produced it, or the marker unmounts the moment the player starts
// dragging towards it) and the stepped playback's interference handling.
//
// The search itself is mocked — findLastWinnableIndex has its own suite in
// winnableBoundary.test.ts — but the mock keeps hold of the probe it was
// handed, which is how the per-probe generation guard is tested below.
jest.mock('../../../../modules/soli-solver', () => ({
  solvePosition: jest.fn(),
}))
jest.mock('../../../../src/solitaire/winnableBoundary', () => ({
  findLastWinnableIndex: jest.fn(),
}))

const { solvePosition } = jest.requireMock('../../../../modules/soli-solver') as {
  solvePosition: jest.Mock
}
const { findLastWinnableIndex } = jest.requireMock(
  '../../../../src/solitaire/winnableBoundary'
) as { findLastWinnableIndex: jest.Mock }

// React act() outside react-dom needs the env flag (React 19).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// The shipped stuck fixture's shape: 214 moves played, boundary proven at
// timeline index 210 (`[rewind] boundary=210 timeline=215`).
const DEAD_END_DEPTH = 214
const BOUNDARY = 210
const TIMELINE_RANGE = DEAD_END_DEPTH

type SearchCall = {
  snapshots: readonly GameSnapshot[]
  probe: (snapshot: GameSnapshot, index: number) => Promise<WinnableProbeResult>
}

let searchCalls: SearchCall[] = []
let dispatched: GameAction[] = []
let pendingSolves: Promise<void>[] = []

// STABLE identities, defined once at module scope: an earlier attempt at a
// hook-level test here spun forever because a fresh enqueueSolve/dispatch on
// every render re-ran the search effect, which re-rendered, which…
let dispatchHandler: (action: GameAction) => void = () => {}
const dispatch = (action: GameAction) => {
  dispatched.push(action)
  dispatchHandler(action)
}
const enqueueSolve = (task: () => Promise<void>) => {
  pendingSolves.push(task())
}

const BASE_DEAL = createInitialState(1)

// Synthetic boards instead of 214 real moves. They model exactly the two
// reducer facts the lifetime rule rests on — a scrub keeps moveCount and the
// timeline's total range, a committed move bumps moveCount and truncates the
// future — and the last test in this file pins those facts against the REAL
// reducer so this shortcut cannot drift away from production.
const boardWith = ({
  historyLength,
  futureLength = 0,
  moveCount = historyLength,
  deal = BASE_DEAL,
}: {
  historyLength: number
  futureLength?: number
  moveCount?: number
  deal?: GameState
}): GameState => ({
  ...deal,
  moveCount,
  history: Array.from({ length: historyLength }, () => deal as GameSnapshot),
  future: Array.from({ length: futureLength }, () => deal as GameSnapshot),
})

// What SCRUB_TO_INDEX does to the board, in the two fields this hook reads.
const scrubbedTo = (index: number, deal: GameState = BASE_DEAL): GameState =>
  boardWith({
    historyLength: index,
    futureLength: TIMELINE_RANGE - index,
    moveCount: DEAD_END_DEPTH,
    deal,
  })

type HookResult = ReturnType<typeof useRewindToWinnable>

let hookResult: HookResult

const Harness = ({
  state,
  enabled,
  warningMode,
  warningEraKey,
}: {
  state: GameState
  enabled: boolean
  warningMode: WarningMode
  warningEraKey: string | null
}) => {
  const stateRef = useRef(state)
  stateRef.current = state
  hookResult = useRewindToWinnable({
    state,
    stateRef,
    enabled,
    warningMode,
    warningEraKey,
    enqueueSolve,
    dispatch,
  })
  return null
}

const setup = (options: {
  state?: GameState
  enabled?: boolean
  warningMode?: WarningMode
  warningEraKey?: string | null
}) => {
  let state = options.state ?? boardWith({ historyLength: DEAD_END_DEPTH })
  let enabled = options.enabled ?? true
  let warningMode: WarningMode = options.warningMode ?? 'noUsefulMoves'
  let warningEraKey = options.warningEraKey ?? null

  let renderer!: TestRenderer.ReactTestRenderer
  const element = () => (
    <Harness
      state={state}
      enabled={enabled}
      warningMode={warningMode}
      warningEraKey={warningEraKey}
    />
  )

  act(() => {
    renderer = TestRenderer.create(element())
  })

  // Re-render from inside an act() the caller already opened (the playback
  // timer path) or from one it opens for us (the setters below).
  const render = () => {
    renderer.update(element())
  }

  // A real scrub commits per rAF while the finger moves, so this is what the
  // board does under the player's thumb.
  dispatchHandler = (action) => {
    if (action.type === 'SCRUB_TO_INDEX') {
      state = scrubbedTo(action.index)
      render()
    }
  }

  return {
    get state() {
      return state
    },
    setBoard(next: GameState) {
      state = next
      act(render)
    },
    scrubTo(index: number) {
      state = scrubbedTo(index)
      act(render)
    },
    setEra(key: string | null) {
      warningEraKey = key
      act(render)
    },
    setEnabled(next: boolean) {
      enabled = next
      act(render)
    },
    setWarningMode(mode: WarningMode) {
      warningMode = mode
      act(render)
    },
    // Flushes the enqueued search task.
    async settle() {
      await act(async () => {
        await Promise.all(pendingSolves)
      })
    },
    async advance(ms: number) {
      await act(async () => {
        jest.advanceTimersByTime(ms)
      })
    },
    press() {
      act(() => {
        hookResult.rewindToWinnable()
      })
    },
    unmount() {
      act(() => {
        renderer.unmount()
      })
    },
  }
}

// The common starting point: warning outstanding, boundary proven at 210.
const setupWithProvenBoundary = async () => {
  const driver = setup({ warningEraKey: 'deal|214|noUsefulMoves' })
  await driver.settle()
  expect(hookResult.rewindIndex).toBe(BOUNDARY)
  expect(hookResult.rewindAvailable).toBe(true)
  return driver
}

beforeEach(() => {
  jest.useFakeTimers()
  searchCalls = []
  dispatched = []
  pendingSolves = []
  dispatchHandler = () => {}
  solvePosition.mockReset()
  solvePosition.mockResolvedValue(JSON.stringify({ status: 'solved', solveMs: 0.4 }))
  findLastWinnableIndex.mockReset()
  findLastWinnableIndex.mockImplementation(
    async (snapshots: readonly GameSnapshot[], probe: SearchCall['probe']) => {
      searchCalls.push({ snapshots, probe })
      return BOUNDARY
    }
  )
})

afterEach(() => {
  jest.useRealTimers()
})

describe('boundary search', () => {
  it('searches the whole timeline once per warning era', async () => {
    const driver = await setupWithProvenBoundary()
    // history + the live board + the redo future, exactly as scrubToIndex
    // builds it: 214 + 1 + 0.
    expect(searchCalls).toHaveLength(1)
    expect(searchCalls[0].snapshots).toHaveLength(DEAD_END_DEPTH + 1)
    driver.unmount()
  })

  it('shows nothing while the setting is off, and never searches', async () => {
    const driver = setup({ enabled: false, warningEraKey: 'deal|214|noUsefulMoves' })
    await driver.settle()
    expect(findLastWinnableIndex).not.toHaveBeenCalled()
    expect(hookResult.rewindIndex).toBeNull()
    expect(hookResult.rewindAvailable).toBe(false)
    driver.unmount()
  })

  it('shows nothing when the solver proved nothing', async () => {
    findLastWinnableIndex.mockImplementation(async () => null)
    const driver = setup({ warningEraKey: 'deal|214|noUsefulMoves' })
    await driver.settle()
    expect(hookResult.rewindIndex).toBeNull()
    driver.unmount()
  })
})

// The regression this suite exists for: the boundary used to be dropped the
// moment warningEraKey went null, and useHint nulls the era on the FIRST
// committed scrub step below the warn depth. So the marker unmounted while the
// player was dragging towards it, an overshoot could never be corrected, and
// the pill flipped back to Hint one step into the stepped playback.
describe('boundary lifetime across the era exit', () => {
  it('keeps the marker and the pill while the player scrubs towards them', async () => {
    const driver = await setupWithProvenBoundary()

    // The first committed scrub step exits the dead era.
    driver.setEra(null)
    driver.scrubTo(213)
    expect(hookResult.rewindIndex).toBe(BOUNDARY)
    expect(hookResult.rewindAvailable).toBe(true)

    for (const index of [212, 211]) {
      driver.scrubTo(index)
      expect(hookResult.rewindIndex).toBe(BOUNDARY)
      expect(hookResult.rewindAvailable).toBe(true)
    }
    // And no re-search: scrubbing must not put the solver back to work.
    await driver.settle()
    expect(searchCalls).toHaveLength(1)
    driver.unmount()
  })

  it('keeps the marker when the thumb lands ON it, and retires only the action', async () => {
    const driver = await setupWithProvenBoundary()
    driver.setEra(null)
    driver.scrubTo(BOUNDARY)
    // "Drag until the thumb sits on the tick" has to be completable: the tick
    // is still there when the thumb arrives.
    expect(hookResult.rewindIndex).toBe(BOUNDARY)
    // Nothing left to rewind, so the pill gives the slot back to Hint.
    expect(hookResult.rewindAvailable).toBe(false)
    driver.unmount()
  })

  it('survives an overshoot and offers the jump again after a redo', async () => {
    const driver = await setupWithProvenBoundary()
    driver.setEra(null)
    driver.scrubTo(205)
    expect(hookResult.rewindIndex).toBe(BOUNDARY)
    expect(hookResult.rewindAvailable).toBe(false)

    driver.scrubTo(212)
    expect(hookResult.rewindIndex).toBe(BOUNDARY)
    expect(hookResult.rewindAvailable).toBe(true)
    await driver.settle()
    expect(searchCalls).toHaveLength(1)
    driver.unmount()
  })

  it('keeps it while the player plays ON inside the dead era, without re-searching', async () => {
    const driver = await setupWithProvenBoundary()
    // Deeper into the dead line: the era is unchanged (useHint's monotonicity
    // invariant), so the boundary is unchanged too.
    driver.setBoard(
      boardWith({ historyLength: DEAD_END_DEPTH + 1, moveCount: DEAD_END_DEPTH + 1 })
    )
    expect(hookResult.rewindIndex).toBe(BOUNDARY)
    expect(hookResult.rewindAvailable).toBe(true)
    await driver.settle()
    expect(searchCalls).toHaveLength(1)
    driver.unmount()
  })

  it('retires once the player resumes play outside a warning', async () => {
    const driver = await setupWithProvenBoundary()
    driver.setEra(null)
    driver.scrubTo(BOUNDARY)
    expect(hookResult.rewindIndex).toBe(BOUNDARY)

    // A committed move from the boundary: the rewind is spent and the player
    // is playing again, so the affordance goes away.
    driver.setBoard(
      boardWith({ historyLength: BOUNDARY + 1, moveCount: DEAD_END_DEPTH + 1 })
    )
    expect(hookResult.rewindIndex).toBeNull()
    expect(hookResult.rewindAvailable).toBe(false)
    driver.unmount()
  })

  it('retires when the player diverges BELOW the boundary', async () => {
    const driver = await setupWithProvenBoundary()
    driver.setEra(null)
    driver.scrubTo(205)
    // A move here truncates the future, so every index above 205 — the proven
    // one included — now refers to a position nobody proved anything about.
    driver.setBoard(boardWith({ historyLength: 206, moveCount: DEAD_END_DEPTH + 1 }))
    expect(hookResult.rewindIndex).toBeNull()
    driver.unmount()
  })

  it('retires on a new deal', async () => {
    const driver = await setupWithProvenBoundary()
    const otherDeal = createInitialState(1)
    expect(otherDeal.exactId).not.toBe(BASE_DEAL.exactId)
    driver.setEra(null)
    driver.setBoard(
      boardWith({ historyLength: DEAD_END_DEPTH, deal: otherDeal, moveCount: 0 })
    )
    expect(hookResult.rewindIndex).toBeNull()
    driver.unmount()
  })

  it('retires when the setting is switched off', async () => {
    const driver = await setupWithProvenBoundary()
    driver.setEnabled(false)
    expect(hookResult.rewindIndex).toBeNull()
    // …and does not come back when it is switched on again without a warning.
    driver.setEnabled(true)
    expect(hookResult.rewindIndex).toBeNull()
    driver.unmount()
  })

  it('retires when the warning mode changes', async () => {
    const driver = await setupWithProvenBoundary()
    driver.setWarningMode('unwinnable')
    expect(hookResult.rewindIndex).toBeNull()
    driver.unmount()
  })
})

describe('superseded searches', () => {
  it('stops probing as soon as it is superseded, and its answer is dropped', async () => {
    // A search that hands its probe out and then waits, so the test can
    // supersede it mid-flight.
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    findLastWinnableIndex.mockImplementationOnce(
      async (snapshots: readonly GameSnapshot[], probe: SearchCall['probe']) => {
        searchCalls.push({ snapshots, probe })
        await gate
        return 42
      }
    )

    const driver = setup({ warningEraKey: 'deal|214|noUsefulMoves' })
    await act(async () => {})
    expect(searchCalls).toHaveLength(1)
    const { probe } = searchCalls[0]

    // While current, a probe really does consult the solver.
    await expect(probe(BASE_DEAL, 100)).resolves.toBe('winnable')
    expect(solvePosition).toHaveBeenCalledTimes(1)

    // A new era supersedes it. Every further probe must short-circuit rather
    // than spend another 800 ms budget on the shared solve queue.
    driver.setEra('deal|216|noUsefulMoves')
    await expect(probe(BASE_DEAL, 100)).resolves.toBe('unknown')
    await expect(probe(BASE_DEAL, 50)).resolves.toBe('unknown')
    expect(solvePosition).toHaveBeenCalledTimes(1)

    // And when the abandoned search finally returns, its answer is ignored —
    // the replacement search's is the one that lands.
    release()
    await driver.settle()
    expect(hookResult.rewindIndex).toBe(BOUNDARY)
    driver.unmount()
  })
})

describe('stepped playback', () => {
  // 4 steps → an even split of the 900 ms target is 225 ms, clamped to 140.
  const STEP_DELAY = resolveRewindStepDelayMs(DEAD_END_DEPTH - BOUNDARY)

  const scrubIndices = () =>
    dispatched
      .filter((action) => action.type === 'SCRUB_TO_INDEX')
      .map((action) => (action as { index: number }).index)

  // One act() per tick on purpose: a single advanceTimersByTime spanning
  // several ticks would run them all before React flushed the re-render that
  // publishes the new board into stateRef, and the hook would (correctly) read
  // that as the board not having moved and abandon the walk.
  const advanceSteps = async (
    driver: { advance: (ms: number) => Promise<void> },
    ticks: number
  ) => {
    for (let tick = 0; tick < ticks; tick += 1) {
      await driver.advance(STEP_DELAY)
    }
  }

  it('walks one move per tick down to the boundary and then stops', async () => {
    const driver = await setupWithProvenBoundary()
    driver.press()
    expect(scrubIndices()).toEqual([213])
    expect(hookResult.rewinding).toBe(true)

    await advanceSteps(driver, 3)
    expect(scrubIndices()).toEqual([213, 212, 211, 210])
    expect(hookResult.rewinding).toBe(false)

    // Nothing keeps ticking past the boundary.
    await driver.advance(STEP_DELAY * 5)
    expect(scrubIndices()).toEqual([213, 212, 211, 210])
    // The marker stays on the move it landed on; only the action is spent.
    expect(hookResult.rewindIndex).toBe(BOUNDARY)
    expect(hookResult.rewindAvailable).toBe(false)
    driver.unmount()
  })

  it('abandons playback when the player scrubs FORWARD underneath it', async () => {
    const driver = await setupWithProvenBoundary()
    driver.press()
    expect(scrubIndices()).toEqual([213])

    // A redo or a rightwards scrub during the walk. The old guard only bailed
    // on `current <= index`, so playback kept dragging the player back down —
    // and walked the new, longer distance at the original step delay.
    driver.scrubTo(220)
    await driver.advance(STEP_DELAY * 10)
    expect(scrubIndices()).toEqual([213])
    expect(hookResult.rewinding).toBe(false)
    driver.unmount()
  })

  it('abandons playback when the player undoes underneath it', async () => {
    const driver = await setupWithProvenBoundary()
    driver.press()
    driver.scrubTo(207)
    await driver.advance(STEP_DELAY * 10)
    expect(scrubIndices()).toEqual([213])
    expect(hookResult.rewinding).toBe(false)
    driver.unmount()
  })

  it('ignores a second press inside the first step delay', async () => {
    const driver = await setupWithProvenBoundary()
    driver.press()
    expect(hookResult.rewinding).toBe(true)
    // The dock renders the pill inert while this is true; the hook refuses the
    // press anyway, so a double tap cannot restart the walk from the top.
    driver.press()
    driver.press()
    expect(scrubIndices()).toEqual([213])

    await advanceSteps(driver, 4)
    expect(scrubIndices()).toEqual([213, 212, 211, 210])
    expect(hookResult.rewinding).toBe(false)
    driver.unmount()
  })

  it('does nothing when there is nothing to rewind', async () => {
    const driver = await setupWithProvenBoundary()
    driver.setEra(null)
    driver.scrubTo(BOUNDARY)
    driver.press()
    expect(dispatched).toHaveLength(0)
    expect(hookResult.rewinding).toBe(false)
    driver.unmount()
  })

  it('stops when the deal changes mid-walk', async () => {
    const driver = await setupWithProvenBoundary()
    driver.press()
    expect(scrubIndices()).toEqual([213])

    const otherDeal = createInitialState(1)
    driver.setBoard(boardWith({ historyLength: 0, deal: otherDeal, moveCount: 0 }))
    await driver.advance(STEP_DELAY * 10)
    expect(scrubIndices()).toEqual([213])
    expect(hookResult.rewinding).toBe(false)
    driver.unmount()
  })
})

describe('the reducer facts the lifetime rule rests on', () => {
  it('scrubs preserve moveCount and the timeline range; a committed move truncates it', () => {
    let real = createInitialState(1)
    for (let i = 0; i < 3; i += 1) {
      real = klondikeReducer(real, { type: 'DRAW_OR_RECYCLE' })
    }
    const range = (board: GameState) => board.history.length + board.future.length
    expect(real.history).toHaveLength(3)

    const scrubbed = klondikeReducer(real, { type: 'SCRUB_TO_INDEX', index: 1 })
    // Walking back — by scrub, and equally by undo/redo — changes neither the
    // move count nor the index space the boundary lives in.
    expect(scrubbed.moveCount).toBe(real.moveCount)
    expect(range(scrubbed)).toBe(range(real))

    const diverged = klondikeReducer(scrubbed, { type: 'DRAW_OR_RECYCLE' })
    // A move commits a new line: moveCount grows and everything above the
    // move's depth is gone.
    expect(diverged.moveCount).toBe(real.moveCount + 1)
    expect(diverged.future).toHaveLength(0)
    expect(range(diverged)).toBe(2)
  })
})
