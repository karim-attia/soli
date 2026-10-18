import { getDemoAutoSolvePlaylist } from '../../../src/data/demoAutoSolvePlaylist'
import {
  VEGAS_FIXTURE_DRAW_COUNT,
  VEGAS_FIXTURE_EXACT_ID,
  applyDemoReplayMoveForValidation,
  createVegasDealGameState,
  createVegasLastPassGameState,
  createVegasNearWinGameState,
  resolveVegasLastPassTapsLeft,
} from '../../../src/solitaire/demoReplay'
import { klondikeReducer } from '../../../src/solitaire/klondike'
import { recyclesLeft } from '../../../src/solitaire/scoring'
import { findFirstUsefulMove } from '../../../src/solitaire/usefulMoves'
import { boardSignature } from '../../../src/storage/gamePersistence'

// Vegas-rules fixtures (scoring plan round 3): ?demo=vegas | vegaslastpass |
// vegasnearwin and the Demo sheet. Device scripts rely on the exact states
// asserted here.
describe('createVegasDealGameState', () => {
  it('is a fresh Draw-3 Vegas deal with A♦ playable from column 7 and 2 recycles left', () => {
    const state = createVegasDealGameState()
    expect(state.vegasRules).toBe(true)
    expect(state.drawCount).toBe(VEGAS_FIXTURE_DRAW_COUNT)
    expect(state.exactId).toBe(VEGAS_FIXTURE_EXACT_ID)
    expect(state.autoUpEnabled).toBe(false)
    expect(state.moveCount).toBe(0)
    expect(state.score.vegas).toBe(-52)
    expect(recyclesLeft(state)).toBe(2)
    expect(findFirstUsefulMove(state)).toEqual({
      kind: 'move',
      card: 'd1',
      from: { type: 'tableau', index: 6 },
      to: { type: 'foundation' },
    })
  })
})

describe('createVegasLastPassGameState', () => {
  it('stops one tap before the last pass is exhausted; the tap shows ⊘ and undo gives it back', () => {
    const state = createVegasLastPassGameState()
    expect(state.vegasRules).toBe(true)
    expect(state.stockPasses).toBe(2)
    expect(recyclesLeft(state)).toBe(0)
    expect(state.stock.length).toBeGreaterThan(0)
    expect(state.stock.length).toBeLessThanOrEqual(3)
    // Every tap was a real action → full undo depth.
    expect(state.history).toHaveLength(state.moveCount)

    const exhausted = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    expect(exhausted.stock).toHaveLength(0)
    expect(exhausted.waste).toHaveLength(24)
    expect(recyclesLeft(exhausted)).toBe(0)
    // A further tap is the refused recycle (reducer no-op).
    expect(klondikeReducer(exhausted, { type: 'DRAW_OR_RECYCLE' })).toBe(exhausted)
    // Undo restores the stock cards (dock New Game button condition false again).
    expect(klondikeReducer(exhausted, { type: 'UNDO' }).stock.length).toBe(state.stock.length)
    // The foundation play is still there at the end (score change after exhaustion).
    expect(findFirstUsefulMove(exhausted)?.kind).toBe('move')
  })

  it('honours tapsLeft and clamps out-of-range values', () => {
    expect(Math.ceil(createVegasLastPassGameState(3).stock.length / 3)).toBe(3)
    // 8 taps = a full last pass (stock refilled by the second recycle).
    expect(createVegasLastPassGameState(8).stock).toHaveLength(24)
    expect(createVegasLastPassGameState(99).stock).toHaveLength(24)
    expect(resolveVegasLastPassTapsLeft()).toEqual({ tapsLeft: 1, clamped: false })
    expect(resolveVegasLastPassTapsLeft(0)).toEqual({ tapsLeft: 1, clamped: true })
    expect(resolveVegasLastPassTapsLeft(9)).toEqual({ tapsLeft: 8, clamped: true })
  })

  it('is deterministic', () => {
    expect(boardSignature(createVegasLastPassGameState(2))).toBe(
      boardSignature(createVegasLastPassGameState(2))
    )
  })
})

describe('createVegasNearWinGameState', () => {
  const entry = getDemoAutoSolvePlaylist()[0]!
  const totalMoves = entry.moves.length

  it('is the near-win board under Vegas rules, on every undo snapshot, with the log cleared', () => {
    const state = createVegasNearWinGameState()
    expect(state.vegasRules).toBe(true)
    expect(state.hasWon).toBe(false)
    expect(state.moveCount).toBe(totalMoves - 1)
    expect(state.history.every((snapshot) => snapshot.vegasRules)).toBe(true)
    expect(state.moveLog).toEqual([])
    // Undo keeps the Vegas rules.
    expect(klondikeReducer(state, { type: 'UNDO' }).vegasRules).toBe(true)
  })

  it('wins with the remaining move at exactly $208', () => {
    const won = applyDemoReplayMoveForValidation(
      createVegasNearWinGameState(),
      entry.moves[totalMoves - 1]!
    )
    expect(won.hasWon).toBe(true)
    expect(won.vegasRules).toBe(true)
    expect(won.score.vegas).toBe(208)
  })
})
