import { getDemoAutoSolvePlaylist } from '../../../src/data/demoAutoSolvePlaylist'
import {
  STUCK_DEMO_KILLING_MOVES,
  STUCK_DEMO_PLAYLIST_INDEX,
  STUCK_DEMO_SOLUTION_STEPS,
  applyDemoReplayMoveForValidation,
  createDemoReplayGameState,
  createStuckGameState,
} from '../../../src/solitaire/demoReplay'
import { buildSolverRequest } from '../../../src/solitaire/solverBridge'
import { hasUsefulMove } from '../../../src/solitaire/usefulMoves'
import { boardSignature } from '../../../src/storage/gamePersistence'

// ?demo=stuck fixture (rewind-to-winnable, round 2): the fixture for the
// DEFAULT `noUsefulMoves` warning mode — the one that ships and the one players
// actually see. Its twin, ?demo=unwinnable, is lost but still has plays and
// therefore only ever trips the solver-only `unwinnable` mode.
//
// The two request strings are byte-identical copies of the ones pinned in
// rust/soli-solver-ffi/tests/solver_tests.rs
// (`stuck_demo_fixture_boundary_is_real`), which asserts the verdicts `solved` /
// `unsolvable` for exactly these boards. This suite pins the boards and the
// stuck predicate; the Rust suite pins their verdicts. Both halves are needed:
// the heuristic predicate is NOT proof of unwinnability (it ignores
// non-revealing rearrangements and foundation digs, which the solver uses), so a
// board can satisfy it and still be winnable — in which case the app would log a
// false positive and never warn at all.
const SOLVER_BUDGET_MS = 2000
const REQUEST_BEFORE_KILLING_MOVES =
  '{"drawCount":1,"budgetMs":2000,"foundations":{"c":3,"d":5,"h":2,"s":0},"tableau":[{"hidden":[],"visible":["d13","s12","h11","s10","h9","s8","h7","s6"]},{"hidden":[],"visible":["c13","h12","s11","h10","s9","d8","c7","h6","s5","h4","s3"]},{"hidden":[],"visible":["d9","c8","d7"]},{"hidden":[],"visible":["s13","d12","c11","d10"]},{"hidden":[],"visible":["c6","h5","c4","h3","s2"]},{"hidden":["c12","c10"],"visible":["d11"]},{"hidden":["s1","c9","h13"],"visible":["c5"]}],"stock":["h8","s7"],"waste":["s4","d6"]}'
const REQUEST_AFTER_KILLING_MOVES =
  '{"drawCount":1,"budgetMs":2000,"foundations":{"c":3,"d":6,"h":2,"s":0},"tableau":[{"hidden":[],"visible":["d13","s12","h11","s10","h9","s8","h7","s6"]},{"hidden":[],"visible":["c13","h12","s11","h10","s9","d8","c7","h6","s5","h4","s3"]},{"hidden":[],"visible":["d9","c8","d7","c6","h5","c4","h3","s2"]},{"hidden":[],"visible":["s13","d12","c11","d10"]},{"hidden":[],"visible":[]},{"hidden":["c12","c10"],"visible":["d11"]},{"hidden":["s1","c9","h13"],"visible":["c5"]}],"stock":[],"waste":["s4","s7","h8"]}'

describe('createStuckGameState', () => {
  const entry = getDemoAutoSolvePlaylist()[STUCK_DEMO_PLAYLIST_INDEX]!
  const totalMoves = STUCK_DEMO_SOLUTION_STEPS + STUCK_DEMO_KILLING_MOVES.length
  const state = createStuckGameState()

  const foldSolutionSteps = (steps: number) => {
    let folded = createDemoReplayGameState(entry)
    for (const move of entry.moves.slice(0, steps)) {
      folded = applyDemoReplayMoveForValidation(folded, move)
    }
    return folded
  }

  it('pins the recipe: entry 19, 210 solution steps, four killing moves', () => {
    expect(STUCK_DEMO_PLAYLIST_INDEX).toBe(19)
    expect(entry.id).toBe('default-20-draw-1')
    expect(STUCK_DEMO_SOLUTION_STEPS).toBe(210)
    expect(STUCK_DEMO_KILLING_MOVES).toEqual([
      {
        type: 'move',
        card: { suit: 'diamonds', rank: 6 },
        source: { type: 'waste' },
        target: { type: 'foundation', suit: 'diamonds' },
      },
      {
        type: 'move',
        card: { suit: 'clubs', rank: 6 },
        source: { type: 'tableau', columnIndex: 4 },
        target: { type: 'tableau', columnIndex: 2 },
      },
      { type: 'draw' },
      { type: 'draw' },
    ])
  })

  // THE load-bearing assertion. useHint's background check fires the default
  // warning on exactly `stock.length === 0 && !hasUsefulMove(board)`; pinning it
  // here means a future change to hasUsefulMove cannot silently make this
  // fixture non-stuck without failing a gate.
  it('satisfies the shipped stuck predicate exactly', () => {
    expect(state.stock).toHaveLength(0)
    expect(hasUsefulMove(state)).toBe(false)
    // A won board also has no useful move — the fixture must be stuck, not won.
    expect(state.hasWon).toBe(false)
  })

  it('is only stuck AFTER the killing moves', () => {
    // Otherwise there would be no boundary to rewind to.
    const before = foldSolutionSteps(STUCK_DEMO_SOLUTION_STEPS)
    expect(hasUsefulMove(before)).toBe(true)
  })

  it('builds on the playlist deal with Auto Up off', () => {
    expect(state.exactId).toBe(entry.exactId)
    expect(state.drawCount).toBe(entry.drawCount)
    expect(state.autoUpEnabled).toBe(false)
  })

  it('carries a real timeline for the rewind binary search', () => {
    expect(state.moveCount).toBe(totalMoves)
    expect(state.history).toHaveLength(totalMoves)
    expect(state.future).toHaveLength(0)
    expect(state.moveLog).toHaveLength(totalMoves)
  })

  it('leaves the ace of spades buried with nothing on its foundation', () => {
    expect(state.foundations.spades).toHaveLength(0)
    const column = state.tableau[6] ?? []
    expect(column.filter((card) => !card.faceUp)).toHaveLength(3)
    expect(column[0]).toMatchObject({ suit: 'spades', rank: 1, faceUp: false })
  })

  it('is deterministic across calls', () => {
    expect(boardSignature(createStuckGameState())).toBe(boardSignature(state))
  })

  it('holds the replay validation: the killing moves are legal only there', () => {
    expect(() =>
      applyDemoReplayMoveForValidation(
        foldSolutionSteps(STUCK_DEMO_SOLUTION_STEPS - 1),
        STUCK_DEMO_KILLING_MOVES[0]!
      )
    ).toThrow(/Expected diamonds-6 on waste/)
  })

  it('produces the exact boards the Rust solver test pins verdicts for', () => {
    expect(
      JSON.stringify(
        buildSolverRequest(foldSolutionSteps(STUCK_DEMO_SOLUTION_STEPS), SOLVER_BUDGET_MS)
      )
    ).toBe(REQUEST_BEFORE_KILLING_MOVES)
    expect(JSON.stringify(buildSolverRequest(state, SOLVER_BUDGET_MS))).toBe(
      REQUEST_AFTER_KILLING_MOVES
    )
  })
})
