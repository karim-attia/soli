import { getDemoAutoSolvePlaylist } from '../../../src/data/demoAutoSolvePlaylist'
import {
  UNWINNABLE_DEMO_KILLING_MOVE,
  UNWINNABLE_DEMO_SOLUTION_STEPS,
  applyDemoReplayMoveForValidation,
  createUnwinnableGameState,
  createDemoReplayGameState,
} from '../../../src/solitaire/demoReplay'
import { buildSolverRequest } from '../../../src/solitaire/solverBridge'
import { hasUsefulMove } from '../../../src/solitaire/usefulMoves'
import { boardSignature } from '../../../src/storage/gamePersistence'

// ?demo=unwinnable fixture (rewind-to-winnable): a solver-PROVEN unwinnable
// position whose own history is provably winnable, so the `unwinnable` warning
// mode and the rewind boundary are both reachable from one deep link. Lost but
// NOT stuck — moves remain legal; the stuck twin is demoReplay.stuck.test.ts.
//
// The two request strings below are byte-identical copies of the ones pinned in
// rust/soli-solver-ffi/tests/solver_tests.rs
// (`unwinnable_demo_fixture_boundary_is_real`), which asserts the verdicts
// `solved` / `unsolvable` for exactly these boards. That is the coupling that
// makes the "really unwinnable" claim machine-checked on both sides: this suite
// pins the boards the fixture produces, the Rust suite pins their verdicts.
const SOLVER_BUDGET_MS = 2000
const REQUEST_BEFORE_KILLING_MOVE =
  '{"drawCount":1,"budgetMs":2000,"foundations":{"c":1,"d":0,"h":2,"s":0},"tableau":[{"hidden":[],"visible":["s8","d7","c6"]},{"hidden":[],"visible":[]},{"hidden":["s5","d5"],"visible":["s4","h3","s2"]},{"hidden":["c4","h11"],"visible":["h7"]},{"hidden":["d8","c8","s9","d1"],"visible":["d6","c5","d4","c3","d2"]},{"hidden":["s7","h4","c2","d10","s3"],"visible":["c9"]},{"hidden":["d12","s1","h12","c10","h13","h8"],"visible":["c12"]}],"stock":["d3","h5","d13","s11","d9","d11","s12","h6","s6","c11","c13","c7"],"waste":["h9","s10","h10","s13"]}'
const REQUEST_AFTER_KILLING_MOVE =
  '{"drawCount":1,"budgetMs":2000,"foundations":{"c":1,"d":0,"h":2,"s":0},"tableau":[{"hidden":[],"visible":["s8","d7","c6"]},{"hidden":[],"visible":["s13"]},{"hidden":["s5","d5"],"visible":["s4","h3","s2"]},{"hidden":["c4","h11"],"visible":["h7"]},{"hidden":["d8","c8","s9","d1"],"visible":["d6","c5","d4","c3","d2"]},{"hidden":["s7","h4","c2","d10","s3"],"visible":["c9"]},{"hidden":["d12","s1","h12","c10","h13","h8"],"visible":["c12"]}],"stock":["d3","h5","d13","s11","d9","d11","s12","h6","s6","c11","c13","c7"],"waste":["h9","s10","h10"]}'

describe('createUnwinnableGameState', () => {
  const entry = getDemoAutoSolvePlaylist()[0]!
  const totalMoves = UNWINNABLE_DEMO_SOLUTION_STEPS + 1
  const state = createUnwinnableGameState()

  const foldSolutionSteps = (steps: number) => {
    let folded = createDemoReplayGameState(entry)
    for (const move of entry.moves.slice(0, steps)) {
      folded = applyDemoReplayMoveForValidation(folded, move)
    }
    return folded
  }

  it('pins the recipe: 81 solution steps plus one killing move', () => {
    expect(UNWINNABLE_DEMO_SOLUTION_STEPS).toBe(81)
    expect(UNWINNABLE_DEMO_KILLING_MOVE).toEqual({
      type: 'move',
      card: { suit: 'spades', rank: 13 },
      source: { type: 'waste' },
      target: { type: 'tableau', columnIndex: 1 },
    })
  })

  it('builds on the playlist deal with Auto Up off and no win', () => {
    expect(state.exactId).toBe(entry.exactId)
    expect(state.drawCount).toBe(entry.drawCount)
    expect(state.autoUpEnabled).toBe(false)
    expect(state.hasWon).toBe(false)
  })

  it('carries a real timeline for the rewind binary search', () => {
    // 82 reducer snapshots + the live position = an 83-index timeline, so the
    // boundary search has ~7 solver probes of genuine work.
    expect(state.moveCount).toBe(totalMoves)
    expect(state.history).toHaveLength(totalMoves)
    expect(state.future).toHaveLength(0)
    // A populated move log means the fixture survives kill/relaunch with full
    // undo depth (same guarantee as the scrubbed fixture).
    expect(state.moveLog).toHaveLength(totalMoves)
  })

  it('parks the king in the board’s only empty column', () => {
    const beforeKill = foldSolutionSteps(UNWINNABLE_DEMO_SOLUTION_STEPS)
    // The step-81 draw is what puts the K♠ on the waste; column 2 (index 1) is
    // the only empty one, and the sole route to unload column 7 (A♠ buried
    // under six face-down cards). Filling it is what kills the game.
    expect(beforeKill.waste[beforeKill.waste.length - 1]).toMatchObject({
      suit: 'spades',
      rank: 13,
    })
    expect(beforeKill.tableau[1]).toHaveLength(0)
    expect(state.tableau[1]).toHaveLength(1)
    expect(state.tableau[1]?.[0]).toMatchObject({
      suit: 'spades',
      rank: 13,
      faceUp: true,
    })
    expect(state.tableau[6]?.filter((card) => !card.faceUp)).toHaveLength(6)
  })

  it('is lost but NOT stuck — this is what separates it from ?demo=stuck', () => {
    // The DEFAULT `noUsefulMoves` warning needs stock empty AND no useful move.
    // This board has neither, so only the solver-proven `unwinnable` mode warns
    // here. Pinning it stops the two fixtures from silently converging.
    expect(state.stock.length).toBeGreaterThan(0)
    expect(hasUsefulMove(state)).toBe(true)
  })

  it('is deterministic across calls', () => {
    expect(boardSignature(createUnwinnableGameState())).toBe(boardSignature(state))
  })

  it('holds the replay validation: the killing move is legal only there', () => {
    // applyDemoReplayMoveForValidation THROWS on mismatch, so a regenerated
    // playlist can never silently turn this fixture into a live game.
    expect(() =>
      applyDemoReplayMoveForValidation(
        foldSolutionSteps(UNWINNABLE_DEMO_SOLUTION_STEPS - 1),
        UNWINNABLE_DEMO_KILLING_MOVE
      )
    ).toThrow(/Expected spades-13 on waste/)
  })

  it('produces the exact boards the Rust solver test pins verdicts for', () => {
    expect(
      JSON.stringify(
        buildSolverRequest(
          foldSolutionSteps(UNWINNABLE_DEMO_SOLUTION_STEPS),
          SOLVER_BUDGET_MS
        )
      )
    ).toBe(REQUEST_BEFORE_KILLING_MOVE)
    expect(JSON.stringify(buildSolverRequest(state, SOLVER_BUDGET_MS))).toBe(
      REQUEST_AFTER_KILLING_MOVE
    )
  })
})
