import {
  INITIAL_SCORE,
  addScore,
  formatStandardScore,
  formatVegasScore,
  formatVegasScoreSpoken,
  scoreMove,
  scoreRecycle,
} from '../../../src/solitaire/scoring'

// Pure point tables + formatting (docs/product/scoring/scoring.md). Reducer
// integration lives in klondike.scoring.test.ts.
describe('scoring tables', () => {
  it('starts at 0 points and the −$52 Vegas buy-in', () => {
    expect(INITIAL_SCORE).toEqual({ standard: 0, vegas: -52 })
  })

  it.each([
    ['waste → tableau', { source: 'waste', targetType: 'tableau', flipped: false }, 5, 0],
    ['waste → foundation', { source: 'waste', targetType: 'foundation', flipped: false }, 10, 5],
    ['tableau → foundation', { source: 'tableau', targetType: 'foundation', flipped: false }, 10, 5],
    ['tableau → foundation + flip', { source: 'tableau', targetType: 'foundation', flipped: true }, 15, 5],
    ['tableau → tableau', { source: 'tableau', targetType: 'tableau', flipped: false }, 0, 0],
    ['tableau → tableau + flip', { source: 'tableau', targetType: 'tableau', flipped: true }, 5, 0],
    ['foundation → tableau', { source: 'foundation', targetType: 'tableau', flipped: false }, -15, -5],
  ] as const)('%s', (_label, input, standard, vegas) => {
    expect(scoreMove(input)).toEqual({ standard, vegas })
  })

  it('charges every recycle −100 in Draw 1, never in Vegas', () => {
    expect(scoreRecycle({ drawCount: 1, recyclesSoFar: 0 })).toEqual({ standard: -100, vegas: 0 })
    expect(scoreRecycle({ drawCount: 1, recyclesSoFar: 5 })).toEqual({ standard: -100, vegas: 0 })
  })

  it('gives Draw ≥ 2 two free recycles, then −20 each (Windows Draw-3 rule)', () => {
    expect(scoreRecycle({ drawCount: 3, recyclesSoFar: 0 }).standard).toBe(0)
    expect(scoreRecycle({ drawCount: 3, recyclesSoFar: 1 }).standard).toBe(0)
    expect(scoreRecycle({ drawCount: 3, recyclesSoFar: 2 }).standard).toBe(-20)
    expect(scoreRecycle({ drawCount: 3, recyclesSoFar: 9 }).standard).toBe(-20)
    expect(scoreRecycle({ drawCount: 5, recyclesSoFar: 2 }).standard).toBe(-20)
    expect(scoreRecycle({ drawCount: 2, recyclesSoFar: 1 }).standard).toBe(0)
  })

  it('clamps Standard at 0 but lets Vegas go negative', () => {
    expect(addScore({ standard: 30, vegas: -52 }, { standard: -100, vegas: -5 })).toEqual({
      standard: 0,
      vegas: -57,
    })
    expect(addScore({ standard: 30, vegas: -52 }, { standard: 10, vegas: 5 })).toEqual({
      standard: 40,
      vegas: -47,
    })
  })
})

describe('score formatting', () => {
  it('formats Standard with device-locale grouping', () => {
    expect(formatStandardScore(0)).toBe('0')
    expect(formatStandardScore(385)).toBe('385')
    // Locale-robust: whatever the separator is, it is what toLocaleString uses.
    expect(formatStandardScore(1240)).toBe((1240).toLocaleString())
    expect(formatStandardScore(1240).replace(/\D/g, '')).toBe('1240')
    expect(formatStandardScore(-5)).toBe('0')
  })

  it('formats Vegas as a dollar total with a U+2212 minus and no plus sign', () => {
    expect(formatVegasScore(-52)).toBe('−$52')
    expect(formatVegasScore(0)).toBe('$0')
    expect(formatVegasScore(158)).toBe('$158')
    expect(formatVegasScore(158)).not.toContain('+')
    expect(formatVegasScore(-1240)).toBe(`−$${(1240).toLocaleString()}`)
  })

  // Spoken form for the HUD badge a11y label (round 2): the U+2212 and `$` are
  // not read reliably by screen readers.
  it('speaks the Vegas amount as plain words', () => {
    expect(formatVegasScoreSpoken(-47)).toBe('minus 47 dollars')
    expect(formatVegasScoreSpoken(0)).toBe('0 dollars')
    expect(formatVegasScoreSpoken(208)).toBe('208 dollars')
  })
})
