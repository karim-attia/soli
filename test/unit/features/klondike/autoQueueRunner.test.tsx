import { act, useCallback, useReducer, useState } from 'react'
import TestRenderer from 'react-test-renderer'

import { useAutoQueueRunner } from '../../../../src/features/klondike/hooks/useAutoQueueRunner'
import {
  klondikeReducer,
  type AutoAction,
  type GameAction,
  type GameState,
} from '../../../../src/solitaire/klondike'
import {
  card,
  createTestState,
  foundationPileThrough,
  resetCardCounter,
  tableauWith,
} from '../../solitaire/helpers'

// Hook-level tests for the auto-complete queue runner, which had zero coverage —
// which is exactly why the board-lock freeze below shipped. The reducer is not
// involved here: the runner's whole job is "arm one timeout, dispatch one
// ADVANCE_AUTO_QUEUE", and these tests pin when it may and may not do that.

// React act() outside react-dom needs the env flag (React 19).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Production cadence (AUTO_QUEUE_MOVE_DELAY_MS / AUTO_QUEUE_INTERVAL_MS); spelled
// out here so the test pins the "moves wait longer than draws" contract itself.
const MOVE_DELAY_MS = 35
const INTERVAL_MS = 25

const QUEUED_MOVE: AutoAction = {
  type: 'move',
  selection: { source: 'tableau', columnIndex: 0, cardIndex: 0 },
  target: { type: 'foundation', suit: 'hearts' },
}

const runningState = (autoQueue: AutoAction[]): GameState =>
  createTestState({
    tableau: tableauWith([card('hearts', 1)]),
    autoQueue,
    isAutoCompleting: true,
  })

const setup = (options: { state: GameState; boardLocked?: boolean }) => {
  let state = options.state
  let boardLocked = options.boardLocked ?? false
  // Stable identity across rerenders on purpose: a changing dispatch identity would
  // re-run the effect by itself and hide the missing `boardLocked` dependency.
  const dispatchGameAction = jest.fn<void, [GameAction]>()

  const Harness = () => {
    useAutoQueueRunner({
      state,
      dispatchGameAction,
      moveDelayMs: MOVE_DELAY_MS,
      intervalMs: INTERVAL_MS,
      boardLocked,
    })
    return null
  }

  let renderer!: TestRenderer.ReactTestRenderer
  act(() => {
    renderer = TestRenderer.create(<Harness />)
  })

  const rerender = () =>
    act(() => {
      renderer.update(<Harness />)
    })

  return {
    dispatchGameAction,
    advance(ms: number) {
      act(() => {
        jest.advanceTimersByTime(ms)
      })
    },
    setBoardLocked(next: boolean) {
      boardLocked = next
      rerender()
    },
    replaceState(next: GameState) {
      state = next
      rerender()
    },
    unmount() {
      act(() => {
        renderer.unmount()
      })
    },
  }
}

beforeEach(() => {
  resetCardCounter()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

describe('useAutoQueueRunner', () => {
  it('arms a timeout and dispatches one ADVANCE_AUTO_QUEUE per queued action', () => {
    const driver = setup({ state: runningState([QUEUED_MOVE, { type: 'draw' }]) })

    driver.advance(MOVE_DELAY_MS - 1)
    expect(driver.dispatchGameAction).not.toHaveBeenCalled()

    driver.advance(1)
    expect(driver.dispatchGameAction).toHaveBeenCalledTimes(1)
    expect(driver.dispatchGameAction).toHaveBeenCalledWith({ type: 'ADVANCE_AUTO_QUEUE' })

    // One timeout per effect run: without a state change nothing re-arms.
    driver.advance(MOVE_DELAY_MS * 5)
    expect(driver.dispatchGameAction).toHaveBeenCalledTimes(1)
    driver.unmount()
  })

  it('waits the shorter interval delay when the next action is a draw', () => {
    const driver = setup({ state: runningState([{ type: 'draw' }]) })

    driver.advance(INTERVAL_MS)
    expect(driver.dispatchGameAction).toHaveBeenCalledTimes(1)
    driver.unmount()
  })

  it('stays idle when there is no run in progress', () => {
    const driver = setup({ state: createTestState() })

    driver.advance(MOVE_DELAY_MS * 5)
    expect(driver.dispatchGameAction).not.toHaveBeenCalled()
    driver.unmount()
  })

  it('does not arm the timeout while the board is locked', () => {
    const driver = setup({ state: runningState([QUEUED_MOVE]), boardLocked: true })

    driver.advance(MOVE_DELAY_MS * 5)

    expect(driver.dispatchGameAction).not.toHaveBeenCalled()
    driver.unmount()
  })

  // Regression test for the board-lock freeze (2026-09-09). Before the fix the
  // runner armed its timeout regardless of the lock; the dispatch that fired was
  // then swallowed by dispatchGameAction's boardLockedRef guard, so no state
  // changed, the effect never re-ran, no new timeout was ever armed — and the game
  // sat at isAutoCompleting: true with a queue nobody advanced. `boardLocked` is a
  // dependency of the effect precisely so unlocking re-arms it.
  it('re-arms the run when the board lock clears without any state change', () => {
    const driver = setup({ state: runningState([QUEUED_MOVE]), boardLocked: true })

    driver.advance(MOVE_DELAY_MS * 5)
    driver.dispatchGameAction.mockClear()

    // Same state object as before — only the lock flips, exactly like a dialog
    // closing mid-run.
    driver.setBoardLocked(false)
    driver.advance(MOVE_DELAY_MS)

    expect(driver.dispatchGameAction).toHaveBeenCalledTimes(1)
    expect(driver.dispatchGameAction).toHaveBeenCalledWith({ type: 'ADVANCE_AUTO_QUEUE' })
    driver.unmount()
  })
})

// Everything above pins the runner in isolation against a mocked dispatch. These
// wire the real reducer to the real hook through a dispatcher that swallows actions
// while the board is locked, exactly like useKlondikeGame.dispatchGameAction — so
// what they assert is what the player sees: does the board actually empty itself.
// Three separate defects on this branch each stopped a started run dead, and each
// of them is invisible to a test that only counts dispatches.

// The reported endgame: Draw 3, every tableau card face up, the last cards spread
// across tableau, waste and stock. Auto Up starts off so the run is kicked off by a
// real SET_AUTO_UP_ENABLED through the reducer, gate included.
const nearWinBoard = (): GameState =>
  createTestState({
    autoUpEnabled: false,
    drawCount: 3,
    foundations: {
      hearts: foundationPileThrough('hearts', 12),
      diamonds: foundationPileThrough('diamonds', 12),
      clubs: foundationPileThrough('clubs', 12),
      spades: foundationPileThrough('spades', 12),
    },
    tableau: tableauWith([card('clubs', 13)], [card('spades', 13)]),
    waste: [card('hearts', 13)],
    stock: [card('diamonds', 13, false)],
  })

const mountGame = (initialState: GameState) => {
  // Lives outside React so dispatchGameAction can stay referentially stable across
  // rerenders, like the production callback — an unstable identity re-runs the
  // runner's effect on its own and hides a missing dependency.
  const boardLockedRef = { current: false }
  let currentState = initialState
  let rawDispatch!: (action: GameAction) => void
  let lockedDispatch!: (action: GameAction) => void
  let setBoardLockedState!: (locked: boolean) => void

  const Harness = () => {
    const [state, dispatch] = useReducer(klondikeReducer, initialState)
    const [boardLocked, setBoardLocked] = useState(false)

    currentState = state
    rawDispatch = dispatch
    setBoardLockedState = setBoardLocked

    // Mirrors useKlondikeGame.dispatchGameAction: silently drops everything while
    // the board is locked (dialog, deal-again, demo launcher).
    lockedDispatch = useCallback(
      (action: GameAction) => {
        if (boardLockedRef.current) {
          return
        }
        dispatch(action)
      },
      [dispatch]
    )

    useAutoQueueRunner({
      state,
      dispatchGameAction: lockedDispatch,
      moveDelayMs: MOVE_DELAY_MS,
      intervalMs: INTERVAL_MS,
      boardLocked,
    })
    return null
  }

  let renderer!: TestRenderer.ReactTestRenderer
  act(() => {
    renderer = TestRenderer.create(<Harness />)
  })

  const runSteps = (steps: number) => {
    for (let index = 0; index < steps; index += 1) {
      act(() => {
        jest.advanceTimersByTime(MOVE_DELAY_MS)
      })
    }
  }

  return {
    get state() {
      return currentState
    },
    // Player-initiated actions take the lock-aware path.
    dispatch: (action: GameAction) => {
      act(() => {
        lockedDispatch(action)
      })
    },
    // The undo scrubber dispatches raw, bypassing the board lock.
    dispatchRaw: (action: GameAction) => {
      act(() => {
        rawDispatch(action)
      })
    },
    setBoardLocked: (locked: boolean) => {
      // updateBoardLocked keeps the ref and the React state in step.
      boardLockedRef.current = locked
      act(() => {
        setBoardLockedState(locked)
      })
    },
    runSteps,
    runToIdle: () => {
      let guard = 0
      while (currentState.isAutoCompleting && guard < 40) {
        runSteps(1)
        guard += 1
      }
      expect(guard).toBeLessThan(40)
    },
    unmount: () => {
      act(() => {
        renderer.unmount()
      })
    },
  }
}

const expectBoardCleared = (state: GameState) => {
  expect(state.isAutoCompleting).toBe(false)
  expect(state.autoQueue).toHaveLength(0)
  expect(state.stock).toHaveLength(0)
  expect(state.waste).toHaveLength(0)
  expect(state.tableau.every((column) => column.length === 0)).toBe(true)
  expect(state.hasWon).toBe(true)
}

describe('auto-complete run, reducer and runner together', () => {
  it('empties the board once a run starts', () => {
    const game = mountGame(nearWinBoard())

    game.dispatch({ type: 'SET_AUTO_UP_ENABLED', enabled: true })
    expect(game.state.isAutoCompleting).toBe(true)
    expect(game.state.autoQueue).toHaveLength(5)

    game.runToIdle()

    expectBoardCleared(game.state)
    game.unmount()
  })

  // The freeze: a dialog opens mid-run, the runner's dispatch is swallowed, no
  // state changes, the effect never re-runs — and the board sat at
  // isAutoCompleting: true with a queue nobody advanced, for good. Locking here
  // does not change a single field of the game state, which is the whole point:
  // only `boardLocked` moves, so only a dependency on `boardLocked` can restart it.
  it('resumes and finishes a run that was interrupted by the board lock', () => {
    const game = mountGame(nearWinBoard())

    game.dispatch({ type: 'SET_AUTO_UP_ENABLED', enabled: true })
    game.runSteps(1)
    expect(game.state.autoQueue).toHaveLength(4)

    game.setBoardLocked(true)
    const frozenState = game.state
    game.runSteps(10)

    // Locked means paused, not cancelled: nothing advanced, nothing was lost.
    expect(game.state).toBe(frozenState)
    expect(game.state.autoQueue).toHaveLength(4)
    expect(game.state.isAutoCompleting).toBe(true)

    game.setBoardLocked(false)
    game.runToIdle()

    expectBoardCleared(game.state)
    game.unmount()
  })

  // A tap that resolves against a stale ref during the 25-35 ms auto cadence used
  // to halt the queue and return without rescheduling, stranding the player with a
  // half-finished board. Column 6 is empty, so this move can never be applied.
  it('finishes a run that a rejected tap lands in the middle of', () => {
    const game = mountGame(nearWinBoard())

    game.dispatch({ type: 'SET_AUTO_UP_ENABLED', enabled: true })
    game.runSteps(1)

    game.dispatch({
      type: 'APPLY_MOVE',
      selection: { source: 'tableau', columnIndex: 6, cardIndex: 0 },
      target: { type: 'foundation', suit: 'hearts' },
    })

    expect(game.state.isAutoCompleting).toBe(true)

    game.runToIdle()

    expectBoardCleared(game.state)
    game.unmount()
  })

  // Same hazard from the undo scrubber, which dispatches raw (bypassing the board
  // lock) dozens of times per drag: a scrub that lands on the index the timeline is
  // already at changes nothing and must not kill the run either.
  it('finishes a run that a no-op scrub lands in the middle of', () => {
    const game = mountGame(nearWinBoard())

    game.dispatch({ type: 'SET_AUTO_UP_ENABLED', enabled: true })
    game.runSteps(1)

    game.dispatchRaw({ type: 'SCRUB_TO_INDEX', index: game.state.history.length })

    expect(game.state.isAutoCompleting).toBe(true)

    game.runToIdle()

    expectBoardCleared(game.state)
    game.unmount()
  })
})
