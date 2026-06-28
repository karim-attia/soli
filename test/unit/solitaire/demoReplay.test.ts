import { demoAutoSolvePlaylist } from '../../../src/data/demoAutoSolvePlaylist'
import {
  applyDemoReplayMoveForValidation,
  createDemoReplayGameState,
  resolveDemoReplayAction,
} from '../../../src/solitaire/demoReplay'
import { klondikeReducer } from '../../../src/solitaire/klondike'

describe('demo auto-solve replay playlist', () => {
  it('solves every generated game through the reducer and exercises undo probes', () => {
    let undoProbeCount = 0

    demoAutoSolvePlaylist.forEach((entry) => {
      let state = createDemoReplayGameState(entry)
      const undoProbeMoveIndices = new Set(entry.undoProbeMoveIndices)

      expect(state.autoUpEnabled).toBe(false)
      expect(state.stock).toHaveLength(24)
      expect(state.waste).toHaveLength(0)

      entry.moves.forEach((move, moveIndex) => {
        state = applyDemoReplayMoveForValidation(state, move)

        if (undoProbeMoveIndices.has(moveIndex)) {
          state = klondikeReducer(state, { type: 'UNDO' })
          state = applyDemoReplayMoveForValidation(state, move)
          undoProbeCount += 1
        }
      })

      expect(state.hasWon).toBe(true)
      expect(state.autoQueue).toHaveLength(0)
    })

    expect(demoAutoSolvePlaylist).toHaveLength(20)
    expect(undoProbeCount).toBeGreaterThan(0)
  })

  it('reports a useful error when a replay card is not at the expected source', () => {
    const [entry] = demoAutoSolvePlaylist
    const firstMove = entry.moves.find((move) => move.type === 'move')
    if (!firstMove || firstMove.type !== 'move') {
      throw new Error('Generated fixture should contain at least one card move.')
    }

    const state = createDemoReplayGameState(entry)
    const resolved = resolveDemoReplayAction(state, {
      ...firstMove,
      card: { suit: 'spades', rank: 13 },
    })

    expect(resolved.ok).toBe(false)
    if (!resolved.ok) {
      expect(resolved.reason).toContain('Expected spades-13')
    }
  })
})
