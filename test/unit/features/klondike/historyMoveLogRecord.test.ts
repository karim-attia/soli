import { MOVE_LOG_VERSION } from '../../../../src/solitaire/klondike'
import {
  moveLogForGameRecord,
  scoresForGameRecord,
} from '../../../../src/features/klondike/hooks/useKlondikeHistoryEntry'

// Review fix R4: what recordCurrentGameResult writes into the history row's
// moves_json at game end.
describe('moveLogForGameRecord', () => {
  it('stores NULL for a fallback-truncated session (empty log but progressed game)', () => {
    expect(moveLogForGameRecord({ moveLog: [], moveCount: 7 })).toBeNull()
  })

  it('stores an empty log for a genuinely untouched game', () => {
    expect(moveLogForGameRecord({ moveLog: [], moveCount: 0 })).toEqual({
      version: MOVE_LOG_VERSION,
      entries: [],
    })
  })

  it('stores the full log for a normally played game', () => {
    const entries = [{ k: 'draw' as const }, { k: 'undo' as const }]
    expect(moveLogForGameRecord({ moveLog: entries, moveCount: 2 })).toEqual({
      version: MOVE_LOG_VERSION,
      entries,
    })
  })
})

// Scoring plan, Phase 2 (P-F): vegas_score is written only for Vegas-rules games
// (NULL = "not a Vegas game", no schema change); Standard for every game. Round 2
// (prompt 5): EVERY Vegas deal is charged — a zero-move abandon stores the −$52
// buy-in (the earlier PySolFC-style exemption was reversed by the user).
describe('scoresForGameRecord', () => {
  const score = { standard: 35, vegas: -17 }

  it('records only the Standard tally for an unlimited game', () => {
    expect(scoresForGameRecord({ score, vegasRules: false })).toEqual({
      standardScore: 35,
      vegasScore: undefined,
    })
  })

  it('records both tallies for a Vegas-rules game, won or abandoned', () => {
    expect(scoresForGameRecord({ score, vegasRules: true })).toEqual({
      standardScore: 35,
      vegasScore: -17,
    })
    expect(
      scoresForGameRecord({ score: { standard: 700, vegas: 208 }, vegasRules: true })
    ).toEqual({ standardScore: 700, vegasScore: 208 })
  })

  it('charges the buy-in for a zero-move Vegas abandon ("deal, dislike, re-deal")', () => {
    expect(
      scoresForGameRecord({ score: { standard: 0, vegas: -52 }, vegasRules: true })
    ).toEqual({ standardScore: 0, vegasScore: -52 })
  })
})
