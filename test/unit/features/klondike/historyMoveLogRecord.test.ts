import { MOVE_LOG_VERSION } from '../../../../src/solitaire/klondike'
import { moveLogForGameRecord } from '../../../../src/features/klondike/hooks/useKlondikeHistoryEntry'

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
