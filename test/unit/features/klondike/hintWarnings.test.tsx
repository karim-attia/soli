import { act, useRef } from 'react'
import TestRenderer from 'react-test-renderer'
import { AccessibilityInfo } from 'react-native'

import {
  NO_HINT_BUBBLE_TEXT,
  STUCK_BUBBLE_TEXT,
  UNWINNABLE_BUBBLE_TEXT,
  useHint,
} from '../../../../src/features/klondike/hooks/useHint'
import {
  createInitialState,
  klondikeReducer,
  type GameAction,
  type GameState,
} from '../../../../src/solitaire/klondike'
import type { SolverHint } from '../../../../src/solitaire/solverBridge'
import type { WarningMode } from '../../../../src/state/settings'

// Hook-level tests for the F14 sticky dead era and the F15 hint × warning
// decision table. The solver native module and the useful-move enumeration
// are mocked (the real enumeration has its own suite in usefulMoves.test.ts);
// board states are REAL reducer states so position keys, history depths and
// stock/waste counts behave exactly like production.
jest.mock('../../../../modules/soli-solver', () => ({
  solvePosition: jest.fn(),
}))
jest.mock('../../../../src/solitaire/usefulMoves', () => ({
  hasUsefulMove: jest.fn(() => true),
  findFirstUsefulMove: jest.fn(() => null),
}))

const { solvePosition } = jest.requireMock('../../../../modules/soli-solver') as {
  solvePosition: jest.Mock
}
const { hasUsefulMove, findFirstUsefulMove } = jest.requireMock(
  '../../../../src/solitaire/usefulMoves'
) as { hasUsefulMove: jest.Mock; findFirstUsefulMove: jest.Mock }

// React act() outside react-dom needs the env flag (React 19).
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const BACKGROUND_DEBOUNCE_MS = 600

const solverResponds = (status: string, extra: Record<string, unknown> = {}) => {
  solvePosition.mockResolvedValue(
    JSON.stringify({ status, solveMs: 0.5, visited: 1, ...extra })
  )
}

// Hands control of the solve's completion to the test (F16 races: the board
// moves on BEFORE the proof lands). The returned resolver must be called
// inside act().
const solverDefers = () => {
  let resolve!: (status: string) => void
  solvePosition.mockReturnValueOnce(
    new Promise<string>((done) => {
      resolve = (status) => done(JSON.stringify({ status, solveMs: 0.5, visited: 1 }))
    })
  )
  return resolve
}

// The board the solver was asked about, decoded from the n-th call's request.
const solvedRequest = (callIndex: number): { stock: string[] } =>
  JSON.parse(solvePosition.mock.calls[callIndex][0] as string)

const FALLBACK_HINT: SolverHint = {
  kind: 'move',
  card: 'h7',
  from: { type: 'tableau', index: 2 },
  to: { type: 'tableau', index: 4 },
}

type HookResult = ReturnType<typeof useHint>

let hookResult: HookResult

const demoPlaybackActiveRef = { current: false }

const Harness = ({
  state,
  warningMode,
  hintButtonEnabled,
}: {
  state: GameState
  warningMode: WarningMode
  hintButtonEnabled: boolean
}) => {
  const stateRef = useRef(state)
  stateRef.current = state
  hookResult = useHint({
    state,
    stateRef,
    warningMode,
    hintButtonEnabled,
    demoPlaybackActiveRef,
  })
  return null
}

// Small driver around a TestRenderer instance: dispatch real reducer actions,
// flush the background debounce, press the hint button.
const setup = (options: { warningMode: WarningMode; state?: GameState }) => {
  let state = options.state ?? createInitialState(1)
  let warningMode = options.warningMode
  const hintButtonEnabled = true

  let renderer!: TestRenderer.ReactTestRenderer
  act(() => {
    renderer = TestRenderer.create(
      <Harness
        state={state}
        warningMode={warningMode}
        hintButtonEnabled={hintButtonEnabled}
      />
    )
  })

  const rerender = () =>
    act(() => {
      renderer.update(
        <Harness
          state={state}
          warningMode={warningMode}
          hintButtonEnabled={hintButtonEnabled}
        />
      )
    })

  return {
    get state() {
      return state
    },
    dispatch(action: GameAction) {
      state = klondikeReducer(state, action)
      rerender()
    },
    draw() {
      this.dispatch({ type: 'DRAW_OR_RECYCLE' })
    },
    undo() {
      this.dispatch({ type: 'UNDO' })
    },
    replaceState(next: GameState) {
      state = next
      rerender()
    },
    setWarningMode(mode: WarningMode) {
      warningMode = mode
      rerender()
    },
    // Runs the background debounce and flushes the (mocked) async solve.
    async settle() {
      await act(async () => {
        jest.advanceTimersByTime(BACKGROUND_DEBOUNCE_MS)
      })
      await act(async () => {})
    },
    async pressHint() {
      await act(async () => {
        hookResult.requestHint()
      })
      await act(async () => {})
    },
    unmount() {
      act(() => {
        renderer.unmount()
      })
    },
  }
}

// Plays the stock out to the recycle-flip moment (stock empty) with real
// draws. Fresh draw-1 deal: 24 stock cards → 24 draws.
const drawUntilStockEmpty = (driver: ReturnType<typeof setup>) => {
  let guard = 0
  while (driver.state.stock.length > 0) {
    driver.draw()
    if (++guard > 60) {
      throw new Error('stock never emptied')
    }
  }
}

let announceSpy: jest.SpyInstance

beforeEach(() => {
  jest.useFakeTimers()
  solvePosition.mockReset()
  hasUsefulMove.mockReset()
  hasUsefulMove.mockReturnValue(true)
  findFirstUsefulMove.mockReset()
  findFirstUsefulMove.mockReturnValue(null)
  announceSpy = jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {})
})

afterEach(() => {
  jest.useRealTimers()
  announceSpy.mockRestore()
})

describe('sticky dead era (F14)', () => {
  it('unwinnable mode: warning fires once and persists across forward moves with zero further evaluations', async () => {
    solverResponds('unsolvable')
    const driver = setup({ warningMode: 'unwinnable' })

    driver.draw()
    await driver.settle()
    expect(solvePosition).toHaveBeenCalledTimes(1)
    expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)
    expect(announceSpy).toHaveBeenCalledWith(UNWINNABLE_BUBBLE_TEXT)

    // Forward moves stay inside the era: the warning keeps showing and the
    // solver is never consulted again (the monotone invariant).
    for (let i = 0; i < 3; i += 1) {
      driver.draw()
      await driver.settle()
      expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)
    }
    expect(solvePosition).toHaveBeenCalledTimes(1)
    driver.unmount()
  })

  it('undo below the era boundary clears the warning and re-arms evaluation', async () => {
    solverResponds('unsolvable')
    const driver = setup({ warningMode: 'unwinnable' })

    driver.draw() // history depth 1 = the era boundary once the warning fires
    await driver.settle()
    expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)
    expect(solvePosition).toHaveBeenCalledTimes(1)

    driver.draw() // depth 2, deeper into the era
    await driver.settle()
    expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)

    // Undo back TO the boundary (depth 1): still at the warn position → the
    // warning stays, still no re-evaluation.
    driver.undo()
    await driver.settle()
    expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)
    expect(solvePosition).toHaveBeenCalledTimes(1)

    // Undo BELOW the boundary (depth 0): era exits, warning clears, and the
    // background evaluation runs again on the now-maybe-alive position.
    solverResponds('solved', { winMovesRemaining: 42 })
    driver.undo()
    expect(hookResult.hintBubbleText).toBeNull()
    await driver.settle()
    expect(solvePosition).toHaveBeenCalledTimes(2)
    expect(hookResult.hintBubbleText).toBeNull()
    driver.unmount()
  })

  it('a new deal clears the warning', async () => {
    solverResponds('unsolvable')
    const driver = setup({ warningMode: 'unwinnable' })
    driver.draw()
    await driver.settle()
    expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)

    const freshDeal = createInitialState(1)
    expect(freshDeal.exactId).not.toBe(driver.state.exactId)
    driver.replaceState(freshDeal)
    expect(hookResult.hintBubbleText).toBeNull()
    driver.unmount()
  })

  it('noUsefulMoves mode: silent mid-stock, warns at the stuck flip, persists across draws/recycles without re-solving', async () => {
    solverResponds('unsolvable')
    hasUsefulMove.mockReturnValue(false)
    const driver = setup({ warningMode: 'noUsefulMoves' })

    // Mid-stock: not even the heuristic runs, let alone the solver.
    driver.draw()
    await driver.settle()
    expect(hasUsefulMove).not.toHaveBeenCalled()
    expect(solvePosition).not.toHaveBeenCalled()
    expect(hookResult.hintBubbleText).toBeNull()

    // Play the deck out to the recycle-flip: heuristic + confirmation solve.
    drawUntilStockEmpty(driver)
    await driver.settle()
    expect(solvePosition).toHaveBeenCalledTimes(1)
    expect(hookResult.hintBubbleText).toBe(STUCK_BUBBLE_TEXT)

    // The user's core ask: drawing/recycling INSIDE the stuck era changes the
    // position key but not the era — the warning persists and neither the
    // heuristic nor the solver runs again.
    hasUsefulMove.mockClear()
    driver.draw() // recycle: waste flips back into the stock
    await driver.settle()
    expect(hookResult.hintBubbleText).toBe(STUCK_BUBBLE_TEXT)
    driver.draw() // draw from the recycled stock
    await driver.settle()
    expect(hookResult.hintBubbleText).toBe(STUCK_BUBBLE_TEXT)
    expect(hasUsefulMove).not.toHaveBeenCalled()
    expect(solvePosition).toHaveBeenCalledTimes(1)

    // Undo below the boundary → warning clears and evaluation re-arms.
    driver.undo()
    driver.undo()
    driver.undo()
    expect(hookResult.hintBubbleText).toBeNull()
    driver.unmount()
  })

  it('mode off: never evaluates, never warns', async () => {
    solverResponds('unsolvable')
    hasUsefulMove.mockReturnValue(false)
    const driver = setup({ warningMode: 'off' })
    drawUntilStockEmpty(driver)
    await driver.settle()
    expect(solvePosition).not.toHaveBeenCalled()
    expect(hasUsefulMove).not.toHaveBeenCalled()
    expect(hookResult.hintBubbleText).toBeNull()
    driver.unmount()
  })

  it('changing the warning mode clears an active era and re-arms', async () => {
    solverResponds('unsolvable')
    const driver = setup({ warningMode: 'unwinnable' })
    driver.draw()
    await driver.settle()
    expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)

    driver.setWarningMode('noUsefulMoves')
    expect(hookResult.hintBubbleText).toBeNull()
    // Mid-stock in noUsefulMoves mode → re-armed but silent.
    await driver.settle()
    expect(solvePosition).toHaveBeenCalledTimes(1)
    driver.unmount()
  })
})

// F16 (user report 2026-10-11): fast stock cycling cancelled the debounced
// end-of-stock evaluation, so the stuck warning never showed. The end-of-stock
// check is now immediate and solves a snapshot; dead-proofs that land after
// further forward moves still fire with the boundary at the evaluated board.
describe('end-of-stock trigger + late dead-proofs (F16)', () => {
  it('(a) stock empty → solver invoked immediately (no debounce) on the stock-empty board', async () => {
    solverResponds('unsolvable')
    hasUsefulMove.mockReturnValue(false)
    const driver = setup({ warningMode: 'noUsefulMoves' })
    drawUntilStockEmpty(driver)
    // No timer advance: the heuristic ran synchronously in the effect and the
    // confirmation solve started right away.
    expect(hasUsefulMove).toHaveBeenCalledTimes(1)
    expect(solvePosition).toHaveBeenCalledTimes(1)
    expect(solvedRequest(0).stock).toEqual([])
    await act(async () => {})
    expect(hookResult.hintBubbleText).toBe(STUCK_BUBBLE_TEXT)
    driver.unmount()
  })

  it('(b) recycle commits before the proof lands → warning still fires, boundary at the stock-empty depth', async () => {
    const resolveSolve = solverDefers()
    hasUsefulMove.mockReturnValue(false)
    const driver = setup({ warningMode: 'noUsefulMoves' })
    drawUntilStockEmpty(driver)
    const stockEmptyDepth = driver.state.history.length
    expect(solvePosition).toHaveBeenCalledTimes(1)

    // The fast cycler: recycle while the solve is in flight. Post-recycle the
    // stock is non-empty, so this position itself evaluates nothing.
    driver.draw()
    expect(driver.state.stock.length).toBeGreaterThan(0)
    expect(driver.state.history.length).toBe(stockEmptyDepth + 1)
    expect(hookResult.hintBubbleText).toBeNull()

    await act(async () => {
      resolveSolve('unsolvable')
    })
    await act(async () => {})
    // The proof is about the stock-empty board, and the current position is
    // inside that era → the warning shows for the post-recycle position.
    expect(hookResult.hintBubbleText).toBe(STUCK_BUBBLE_TEXT)
    expect(announceSpy).toHaveBeenCalledWith(STUCK_BUBBLE_TEXT)
    expect(solvePosition).toHaveBeenCalledTimes(1)

    // Boundary = the EVALUATED depth, not the depth at response time: undoing
    // the recycle (back to the stock-empty position) stays inside the era;
    // one more undo leaves it.
    driver.undo()
    expect(driver.state.history.length).toBe(stockEmptyDepth)
    expect(hookResult.hintBubbleText).toBe(STUCK_BUBBLE_TEXT)
    driver.undo()
    expect(hookResult.hintBubbleText).toBeNull()
    expect(solvePosition).toHaveBeenCalledTimes(1) // mid-stock: no re-evaluation
    driver.unmount()
  })

  it('(c) undo below the stock-empty depth before the proof lands → no warning; re-arms on the next flip', async () => {
    const resolveSolve = solverDefers()
    solverResponds('unsolvable') // for the re-armed evaluation at the end
    hasUsefulMove.mockReturnValue(false)
    const driver = setup({ warningMode: 'noUsefulMoves' })
    drawUntilStockEmpty(driver)
    expect(solvePosition).toHaveBeenCalledTimes(1)

    driver.undo() // below the evaluated depth: the proof is about a line we left
    await act(async () => {
      resolveSolve('unsolvable')
    })
    await act(async () => {})
    expect(hookResult.hintBubbleText).toBeNull()
    expect(hookResult.warningEmphasisNonce).toBe(0)
    expect(announceSpy).not.toHaveBeenCalled()

    // Drawing back to the flip evaluates again (fresh snapshot) and warns.
    driver.draw()
    expect(solvePosition).toHaveBeenCalledTimes(2)
    await act(async () => {})
    expect(hookResult.hintBubbleText).toBe(STUCK_BUBBLE_TEXT)
    driver.unmount()
  })

  it('(d) unwinnable mode: proof landing after a further forward move still fires (debounce kept)', async () => {
    const resolveSolve = solverDefers()
    const driver = setup({ warningMode: 'unwinnable' })
    driver.draw() // depth 1
    expect(solvePosition).not.toHaveBeenCalled() // per-move check stays debounced
    await act(async () => {
      jest.advanceTimersByTime(BACKGROUND_DEBOUNCE_MS)
    })
    expect(solvePosition).toHaveBeenCalledTimes(1)

    driver.draw() // depth 2, before the proof for depth 1 lands
    await act(async () => {
      resolveSolve('unsolvable')
    })
    await act(async () => {})
    expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)
    // Boundary at the evaluated depth (1): undo to it keeps the warning,
    // undo below clears it.
    driver.undo()
    expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)
    driver.undo()
    expect(hookResult.hintBubbleText).toBeNull()
    driver.unmount()
  })

  it('(e) mid-stock positions in mode noUsefulMoves never call the heuristic or the solver', async () => {
    solverResponds('unsolvable')
    hasUsefulMove.mockReturnValue(false)
    const driver = setup({ warningMode: 'noUsefulMoves' })
    for (let i = 0; i < 5; i += 1) {
      driver.draw()
      await driver.settle()
    }
    expect(driver.state.stock.length).toBeGreaterThan(0)
    expect(hasUsefulMove).not.toHaveBeenCalled()
    expect(solvePosition).not.toHaveBeenCalled()
    expect(hookResult.hintBubbleText).toBeNull()
    driver.unmount()
  })
})

describe('hint press × warning interplay (F15)', () => {
  it('outstanding warning → press re-affirms (no solver call, no hint, emphasis bump)', async () => {
    solverResponds('unsolvable')
    const driver = setup({ warningMode: 'unwinnable' })
    driver.draw()
    await driver.settle()
    expect(solvePosition).toHaveBeenCalledTimes(1)
    const nonceAfterWarning = hookResult.warningEmphasisNonce
    announceSpy.mockClear()

    await driver.pressHint()
    expect(solvePosition).toHaveBeenCalledTimes(1) // no new solve
    expect(hookResult.activeHint).toBeNull()
    expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)
    expect(hookResult.warningEmphasisNonce).toBe(nonceAfterWarning + 1)
    expect(announceSpy).toHaveBeenCalledWith(UNWINNABLE_BUBBLE_TEXT)
    driver.unmount()
  })

  it('no warning + solved → winning hint', async () => {
    solverResponds('solved', { hint: { kind: 'draw' }, winMovesRemaining: 12 })
    const driver = setup({ warningMode: 'noUsefulMoves' })
    await driver.pressHint()
    expect(hookResult.activeHint).toEqual({ kind: 'draw' })
    expect(hookResult.hintBubbleText).toBeNull()
    driver.unmount()
  })

  it('no warning + unsolvable + mode off → classic fallback hint, never a warning', async () => {
    solverResponds('unsolvable')
    findFirstUsefulMove.mockReturnValue(FALLBACK_HINT)
    const driver = setup({ warningMode: 'off' })
    await driver.pressHint()
    expect(hookResult.activeHint).toEqual(FALLBACK_HINT)
    expect(hookResult.hintBubbleText).toBeNull()
    expect(hookResult.warningEmphasisNonce).toBe(0)
    driver.unmount()
  })

  it('no warning + unsolvable + mode noUsefulMoves mid-stock → fallback (no winnability leak)', async () => {
    solverResponds('unsolvable')
    findFirstUsefulMove.mockReturnValue(FALLBACK_HINT)
    const driver = setup({ warningMode: 'noUsefulMoves' })
    // Mid-stock: the mode wouldn't warn here, so the press must behave
    // exactly like mode off (the user's chosen knowledge level).
    await driver.pressHint()
    expect(hookResult.activeHint).toEqual(FALLBACK_HINT)
    expect(hookResult.hintBubbleText).toBeNull()
    driver.unmount()
  })

  it('no warning + unsolvable + mode noUsefulMoves with useful moves left at stock 0 → fallback', async () => {
    solverResponds('unsolvable')
    hasUsefulMove.mockReturnValue(true)
    findFirstUsefulMove.mockReturnValue(FALLBACK_HINT)
    const driver = setup({ warningMode: 'noUsefulMoves' })
    drawUntilStockEmpty(driver)
    await driver.pressHint()
    expect(hookResult.activeHint).toEqual(FALLBACK_HINT)
    expect(hookResult.hintBubbleText).toBeNull()
    driver.unmount()
  })

  it('press while the end-of-stock proof is in flight (mode noUsefulMoves) → one warning, no hint, no double fire', async () => {
    // Since F16 the end-of-stock check starts IMMEDIATELY at the flip, so a
    // press can only race its in-flight solve (it queues behind it).
    const resolveBackground = solverDefers()
    solverResponds('unsolvable') // the queued hint solve
    hasUsefulMove.mockReturnValue(false)
    const driver = setup({ warningMode: 'noUsefulMoves' })
    drawUntilStockEmpty(driver)
    expect(solvePosition).toHaveBeenCalledTimes(1)
    expect(hookResult.hintBubbleText).toBeNull()

    await driver.pressHint()
    await act(async () => {
      resolveBackground('unsolvable')
    })
    await act(async () => {})
    // Background proof fired the era; the press's own (now redundant) proof
    // landed second and must neither hint nor fire/announce again.
    expect(solvePosition).toHaveBeenCalledTimes(2)
    expect(hookResult.activeHint).toBeNull()
    expect(hookResult.hintBubbleText).toBe(STUCK_BUBBLE_TEXT)
    expect(hookResult.warningEmphasisNonce).toBe(1)
    expect(announceSpy.mock.calls.filter(([text]) => text === STUCK_BUBBLE_TEXT)).toHaveLength(1)

    // Stuck-era edge: a further press re-affirms the stuck wording — never
    // "No hint found." — with zero solver work.
    announceSpy.mockClear()
    await driver.pressHint()
    expect(solvePosition).toHaveBeenCalledTimes(2)
    expect(hookResult.hintBubbleText).toBe(STUCK_BUBBLE_TEXT)
    expect(hookResult.warningEmphasisNonce).toBe(2)
    expect(announceSpy).toHaveBeenCalledWith(STUCK_BUBBLE_TEXT)
    expect(announceSpy).not.toHaveBeenCalledWith(NO_HINT_BUBBLE_TEXT)
    driver.unmount()
  })

  it('unknown background result + unsolvable press at the stuck flip → fire-on-discovery still reachable', async () => {
    // The press-side fire-on-discovery path in mode noUsefulMoves now only
    // matters when the background proof missed its budget.
    solvePosition.mockResolvedValueOnce(JSON.stringify({ status: 'unknown' }))
    solverResponds('unsolvable')
    hasUsefulMove.mockReturnValue(false)
    const driver = setup({ warningMode: 'noUsefulMoves' })
    drawUntilStockEmpty(driver)
    await act(async () => {})
    expect(solvePosition).toHaveBeenCalledTimes(1)
    expect(hookResult.hintBubbleText).toBeNull()

    await driver.pressHint()
    expect(solvePosition).toHaveBeenCalledTimes(2)
    expect(hookResult.activeHint).toBeNull()
    expect(hookResult.hintBubbleText).toBe(STUCK_BUBBLE_TEXT)
    driver.unmount()
  })

  it('unsolvable press in mode unwinnable → fire-on-discovery warning', async () => {
    solverResponds('unsolvable')
    const driver = setup({ warningMode: 'unwinnable' })
    await driver.pressHint()
    expect(hookResult.activeHint).toBeNull()
    expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)
    // Warning persists across a forward move (same era machinery as auto).
    driver.draw()
    await driver.settle()
    expect(hookResult.hintBubbleText).toBe(UNWINNABLE_BUBBLE_TEXT)
    expect(solvePosition).toHaveBeenCalledTimes(1)
    driver.unmount()
  })

  it('unknown never warns: classic fallback even in mode unwinnable', async () => {
    solverResponds('unknown')
    findFirstUsefulMove.mockReturnValue(FALLBACK_HINT)
    const driver = setup({ warningMode: 'unwinnable' })
    await driver.pressHint()
    expect(hookResult.activeHint).toEqual(FALLBACK_HINT)
    expect(hookResult.hintBubbleText).toBeNull()
    driver.unmount()
  })

  it('empty fallback mid-stock → transient "No hint found." notice', async () => {
    solverResponds('unsolvable')
    findFirstUsefulMove.mockReturnValue(null)
    const driver = setup({ warningMode: 'off' })
    await driver.pressHint()
    expect(hookResult.hintBubbleText).toBe(NO_HINT_BUBBLE_TEXT)
    // Transient: gone after its timer (unlike era warnings, which have none).
    await act(async () => {
      jest.advanceTimersByTime(2500)
    })
    expect(hookResult.hintBubbleText).toBeNull()
    driver.unmount()
  })
})
