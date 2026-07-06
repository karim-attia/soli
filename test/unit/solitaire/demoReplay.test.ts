import { getDemoAutoSolvePlaylist } from '../../../src/data/demoAutoSolvePlaylist'
import {
  applyDemoReplayMoveForValidation,
  createDemoReplayGameState,
  getDemoUndoProbePlan,
  resolveDemoReplayAction,
} from '../../../src/solitaire/demoReplay'
import { klondikeReducer } from '../../../src/solitaire/klondike'

const demoAutoSolvePlaylist = getDemoAutoSolvePlaylist()

describe('demo auto-solve replay playlist', () => {
  it('solves every generated game through the reducer and exercises back-and-forth undo probes', () => {
    let undoProbeCount = 0
    let maxProbeDepth = 0

    demoAutoSolvePlaylist.forEach((entry, playlistIndex) => {
      let state = createDemoReplayGameState(entry)
      // Same runtime-derived plan the device launcher uses: fixture probe
      // locations, code-owned depths (depth 3 for game 1, 2 for games 3 and 5).
      const probeDepthByMoveIndex = new Map(
        getDemoUndoProbePlan(entry, playlistIndex).map((probe) => [
          probe.moveIndex,
          probe.depth,
        ])
      )

      expect(state.autoUpEnabled).toBe(false)
      expect(state.stock).toHaveLength(24)
      expect(state.waste).toHaveLength(0)

      entry.moves.forEach((move, moveIndex) => {
        state = applyDemoReplayMoveForValidation(state, move)

        const depth = probeDepthByMoveIndex.get(moveIndex)
        if (depth) {
          for (let undoStep = 0; undoStep < depth; undoStep += 1) {
            const undone = klondikeReducer(state, { type: 'UNDO' })
            expect(undone).not.toBe(state)
            state = undone
          }
          for (
            let replayIndex = moveIndex - depth + 1;
            replayIndex <= moveIndex;
            replayIndex += 1
          ) {
            const replayMove = entry.moves[replayIndex]
            if (!replayMove) {
              throw new Error(`Missing replay move ${replayIndex} in ${entry.id}.`)
            }
            state = applyDemoReplayMoveForValidation(state, replayMove)
          }
          undoProbeCount += 1
          maxProbeDepth = Math.max(maxProbeDepth, depth)
        }
      })

      expect(state.hasWon).toBe(true)
      expect(state.autoQueue).toHaveLength(0)
    })

    expect(demoAutoSolvePlaylist).toHaveLength(20)
    expect(undoProbeCount).toBeGreaterThan(0)
    expect(maxProbeDepth).toBe(3)
  })

  it('derives multi-step undo probe depths for the planned playlist entries', () => {
    const plans = demoAutoSolvePlaylist.map((entry, playlistIndex) =>
      getDemoUndoProbePlan(entry, playlistIndex)
    )

    // Game 1 gets a depth-3 first probe; games 3 and 5 get depth-2 first probes.
    expect(plans[0]?.[0]?.depth).toBe(3)
    expect(plans[2]?.[0]?.depth).toBe(2)
    expect(plans[4]?.[0]?.depth).toBe(2)

    let probeCount = 0
    plans.forEach((plan, playlistIndex) => {
      const entry = demoAutoSolvePlaylist[playlistIndex]
      expect(plan).toHaveLength(entry?.undoProbeMoveIndices.length ?? -1)
      plan.forEach((probe, probeIndex) => {
        probeCount += 1
        expect(probe.moveIndex).toBe(entry?.undoProbeMoveIndices[probeIndex])
        expect(probe.depth).toBeGreaterThanOrEqual(1)
        // Guardrail: a probe can never undo past the start of the game.
        expect(probe.depth).toBeLessThanOrEqual(probe.moveIndex + 1)
        if (probeIndex > 0) {
          expect(probe.depth).toBe(1)
        }
      })
    })
    expect(probeCount).toBeGreaterThan(0)
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
