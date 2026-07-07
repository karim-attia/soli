import { getDemoAutoSolvePlaylist } from '../../../src/data/demoAutoSolvePlaylist'
import {
  NEARWIN_DEMO_DEFAULT_MOVES_LEFT,
  applyDemoReplayMoveForValidation,
  createNearWinGameState,
  resolveNearWinMovesLeft,
} from '../../../src/solitaire/demoReplay'
import { boardSignature } from '../../../src/storage/gamePersistence'

// ?demo=nearwin&left=N fixture (agent-testing-skill C5): solution replayed to N
// moves before completion so an agent plays the final move(s) manually and gets
// a REAL win + celebration.
describe('createNearWinGameState', () => {
  const entry = getDemoAutoSolvePlaylist()[0]!
  const totalMoves = entry.moves.length

  it('defaults to exactly one move left, Auto Up off, not yet won', () => {
    expect(NEARWIN_DEMO_DEFAULT_MOVES_LEFT).toBe(1)
    const state = createNearWinGameState()
    expect(state.hasWon).toBe(false)
    expect(state.autoUpEnabled).toBe(false)
    expect(state.moveCount).toBe(totalMoves - 1)
    expect(state.exactId).toBe(entry.exactId)
  })

  it('wins after playing the single remaining move', () => {
    const state = createNearWinGameState()
    const won = applyDemoReplayMoveForValidation(state, entry.moves[totalMoves - 1]!)
    expect(won.hasWon).toBe(true)
    expect(won.winCelebrations).toBe(1)
  })

  it('wins after playing the remaining N moves for left=3', () => {
    let state = createNearWinGameState(3)
    expect(state.hasWon).toBe(false)
    expect(state.moveCount).toBe(totalMoves - 3)
    for (const move of entry.moves.slice(totalMoves - 3)) {
      state = applyDemoReplayMoveForValidation(state, move)
    }
    expect(state.hasWon).toBe(true)
  })

  it('is deterministic across calls', () => {
    expect(boardSignature(createNearWinGameState(2))).toBe(
      boardSignature(createNearWinGameState(2))
    )
  })

  it('clamps out-of-range movesLeft instead of throwing', () => {
    // 0 would be an already-won board — the point is a real manual win.
    expect(createNearWinGameState(0).hasWon).toBe(false)
    expect(createNearWinGameState(0).moveCount).toBe(totalMoves - 1)
    // Larger than the solution → fresh replay board (0 moves played).
    expect(createNearWinGameState(totalMoves + 50).moveCount).toBe(0)
  })
})

describe('resolveNearWinMovesLeft', () => {
  const totalMoves = getDemoAutoSolvePlaylist()[0]!.moves.length

  it('defaults to 1 without clamping', () => {
    expect(resolveNearWinMovesLeft()).toEqual({ movesLeft: 1, clamped: false })
  })

  it('passes valid values through', () => {
    expect(resolveNearWinMovesLeft(5)).toEqual({ movesLeft: 5, clamped: false })
  })

  it('clamps to [1, solution length] and rounds non-integers', () => {
    expect(resolveNearWinMovesLeft(0)).toEqual({ movesLeft: 1, clamped: true })
    expect(resolveNearWinMovesLeft(-7)).toEqual({ movesLeft: 1, clamped: true })
    expect(resolveNearWinMovesLeft(totalMoves + 1)).toEqual({
      movesLeft: totalMoves,
      clamped: true,
    })
    expect(resolveNearWinMovesLeft(2.4)).toEqual({ movesLeft: 2, clamped: true })
  })
})
