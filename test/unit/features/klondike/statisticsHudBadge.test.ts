import { buildStatisticsRows } from '../../../../src/features/klondike/components/StatisticsHud'

// Badge rule since the scoring plan's Phase 2 (Vegas = rules mode): Off → no
// badge; a Vegas-rules game shows its Vegas tally whatever the setting says now
// (as TOTAL when "Keep Vegas total" is on, P2-C); any other game shows Standard
// (the Vegas setting applies to the next deal). Every badge carries a spoken
// a11y label (round 2).
const build = (
  scoring: 'off' | 'standard' | 'vegas',
  vegasRules: boolean,
  vegasTotal: number | null = null
) =>
  buildStatisticsRows({
    showMoves: false,
    showTime: false,
    scoring,
    vegasRules,
    score: { standard: 385, vegas: -17 },
    vegasTotal,
    moveCount: 0,
    elapsedMs: 0,
    timerState: 'idle',
    timerStartedAt: null,
  })

describe('score badge rule', () => {
  it('shows nothing when scoring is off', () => {
    expect(build('off', true)).toEqual([])
    expect(build('off', false)).toEqual([])
    expect(build('off', true, -121)).toEqual([])
  })

  it('shows the Vegas tally for a Vegas-rules game regardless of the setting', () => {
    const vegas = { label: 'Vegas', value: '−$17', accessibilityLabel: 'Vegas, minus 17 dollars' }
    expect(build('vegas', true)).toEqual([vegas])
    expect(build('standard', true)).toEqual([vegas])
  })

  it('shows the cumulative TOTAL instead of the per-game tally when keeping a total', () => {
    expect(build('vegas', true, -121)).toEqual([
      { label: 'Total', value: '−$121', accessibilityLabel: 'Total, minus 121 dollars' },
    ])
    // A Standard-rules game never shows a Vegas total, even with the switch on.
    expect(build('vegas', false, -121)).toEqual([
      { label: 'Score', value: '385', accessibilityLabel: 'Score, 385' },
    ])
  })

  it('shows Standard for an unlimited game even while Vegas is selected', () => {
    const score = { label: 'Score', value: '385', accessibilityLabel: 'Score, 385' }
    expect(build('standard', false)).toEqual([score])
    expect(build('vegas', false)).toEqual([score])
  })
})

describe('badge accessibility labels', () => {
  it('labels Moves and Time in spoken form', () => {
    const rows = buildStatisticsRows({
      showMoves: true,
      showTime: true,
      scoring: 'off',
      vegasRules: false,
      score: { standard: 0, vegas: -52 },
      vegasTotal: null,
      moveCount: 42,
      elapsedMs: 192_000,
      timerState: 'paused',
      timerStartedAt: null,
    })
    expect(rows).toEqual([
      { label: 'Moves', value: '42', accessibilityLabel: 'Moves, 42' },
      { label: 'Time', value: '3:12', accessibilityLabel: 'Time, 3 minutes 12 seconds' },
    ])
  })
})
