import { getDemoAutoSolvePlaylist } from '../../../src/data/demoAutoSolvePlaylist'
import {
  SCRUBBED_DEMO_SCRUB_INDEX,
  SCRUBBED_DEMO_STEPS,
  applyDemoReplayMoveForValidation,
  createDemoReplayGameState,
  createScrubbedMidGameState,
} from '../../../src/solitaire/demoReplay'
import { klondikeReducer } from '../../../src/solitaire/klondike'
import { boardSignature } from '../../../src/storage/gamePersistence'

// Device tests (scrubber-test-automation Part C) copy their expected card labels
// from the pins below — keep them in sync if the fixture constants ever change.
describe('createScrubbedMidGameState', () => {
  const state = createScrubbedMidGameState()

  it('lands mid-timeline with full undo/redo depths on the playlist deal', () => {
    expect(SCRUBBED_DEMO_STEPS).toBe(80)
    expect(SCRUBBED_DEMO_SCRUB_INDEX).toBe(40)
    expect(state.history).toHaveLength(SCRUBBED_DEMO_SCRUB_INDEX)
    expect(state.future).toHaveLength(SCRUBBED_DEMO_STEPS - SCRUBBED_DEMO_SCRUB_INDEX)
    expect(state.moveCount).toBe(SCRUBBED_DEMO_STEPS)
    expect(state.autoUpEnabled).toBe(false)
    expect(state.exactId).toBe(getDemoAutoSolvePlaylist()[0]?.exactId)
    // Real move log (80 actions + 1 coalesced scrub) → persistence replays the
    // state after kill/relaunch with full depths (acceptance criterion 6).
    expect(state.moveLog).toHaveLength(SCRUBBED_DEMO_STEPS + 1)
    expect(state.moveLog[state.moveLog.length - 1]).toEqual({
      k: 'scrub',
      i: SCRUBBED_DEMO_SCRUB_INDEX,
    })
  })

  it('is deterministic across calls', () => {
    expect(boardSignature(createScrubbedMidGameState())).toBe(boardSignature(state))
  })

  it('pins exact cards for device-test label assertions', () => {
    // Six of hearts on waste; tableau tops left → right (all face up).
    const topWaste = state.waste[state.waste.length - 1]
    expect(topWaste).toMatchObject({ suit: 'hearts', rank: 6, faceUp: true })
    expect(state.stock).toHaveLength(10)
    expect(state.waste).toHaveLength(10)
    expect(
      state.tableau.map((column) => {
        const top = column[column.length - 1]
        return top ? { suit: top.suit, rank: top.rank, faceUp: top.faceUp } : null
      })
    ).toEqual([
      { suit: 'diamonds', rank: 7, faceUp: true },
      { suit: 'diamonds', rank: 2, faceUp: true },
      { suit: 'spades', rank: 2, faceUp: true },
      { suit: 'hearts', rank: 7, faceUp: true },
      { suit: 'clubs', rank: 5, faceUp: true },
      { suit: 'clubs', rank: 9, faceUp: true },
      { suit: 'clubs', rank: 12, faceUp: true },
    ])
  })

  it('scrubs back to the fold end: SCRUB_TO_INDEX 80 restores the step-80 board', () => {
    const entry = getDemoAutoSolvePlaylist()[0]
    if (!entry) {
      throw new Error('Demo auto-solve playlist is empty.')
    }
    let folded = createDemoReplayGameState(entry)
    for (const move of entry.moves.slice(0, SCRUBBED_DEMO_STEPS)) {
      folded = applyDemoReplayMoveForValidation(folded, move)
    }

    const redone = klondikeReducer(state, {
      type: 'SCRUB_TO_INDEX',
      index: SCRUBBED_DEMO_STEPS,
    })
    expect(redone.history).toHaveLength(SCRUBBED_DEMO_STEPS)
    expect(redone.future).toHaveLength(0)
    expect(boardSignature(redone)).toBe(boardSignature(folded))
    expect(redone.waste[redone.waste.length - 1]).toMatchObject({
      suit: 'hearts',
      rank: 10,
    })
  })
})
