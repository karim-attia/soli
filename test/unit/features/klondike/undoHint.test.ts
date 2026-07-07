import {
  breakStreak,
  consumeHintForScrub,
  noteNewDeal,
  recordUndoTap,
  requiredStreakFor,
  UNDO_HINT_LIFETIME_THRESHOLD,
  UNDO_HINT_MAX_SHOWINGS,
  UNDO_HINT_STREAK_STEP,
  type UndoHintTracker,
} from '../../../../src/features/klondike/undoHint'
import { parseUndoHintState } from '../../../../src/storage/undoHintStorage'

const tracker = (overrides: Partial<UndoHintTracker> = {}): UndoHintTracker => ({
  lifetimeUndoTaps: 0,
  streak: 0,
  hintsRemaining: UNDO_HINT_MAX_SHOWINGS,
  hintShownThisDeal: false,
  scrubConsumedThisDeal: false,
  ...overrides,
})

// Taps `count` times and returns the final tracker plus whether any tap showed a hint.
const tapTimes = (start: UndoHintTracker, count: number) => {
  let current = start
  let shown = false
  for (let i = 0; i < count; i += 1) {
    const result = recordUndoTap(current)
    current = result.tracker
    shown = shown || result.showHint
  }
  return { tracker: current, shown }
}

describe('requiredStreakFor', () => {
  it('escalates 10/20/30 as hints get used up', () => {
    expect(requiredStreakFor(3)).toBe(10)
    expect(requiredStreakFor(2)).toBe(20)
    expect(requiredStreakFor(1)).toBe(30)
  })
})

describe('recordUndoTap', () => {
  it('increments both counters on every tap', () => {
    const result = recordUndoTap(tracker({ lifetimeUndoTaps: 4, streak: 2 }))
    expect(result.tracker.lifetimeUndoTaps).toBe(5)
    expect(result.tracker.streak).toBe(3)
    expect(result.showHint).toBe(false)
  })

  it('requires lifetime strictly greater than the threshold', () => {
    // Tap that lands exactly ON the threshold (50) must not show the hint...
    const atThreshold = recordUndoTap(
      tracker({
        lifetimeUndoTaps: UNDO_HINT_LIFETIME_THRESHOLD - 1,
        streak: UNDO_HINT_STREAK_STEP - 1,
      })
    )
    expect(atThreshold.tracker.lifetimeUndoTaps).toBe(UNDO_HINT_LIFETIME_THRESHOLD)
    expect(atThreshold.showHint).toBe(false)

    // ...the next one (51) does.
    const aboveThreshold = recordUndoTap(atThreshold.tracker)
    expect(aboveThreshold.tracker.lifetimeUndoTaps).toBe(
      UNDO_HINT_LIFETIME_THRESHOLD + 1
    )
    expect(aboveThreshold.showHint).toBe(true)
  })

  it('requires streak of at least the current threshold (10 for the first hint)', () => {
    const nineInARow = recordUndoTap(tracker({ lifetimeUndoTaps: 100, streak: 8 }))
    expect(nineInARow.tracker.streak).toBe(9)
    expect(nineInARow.showHint).toBe(false)

    const tenInARow = recordUndoTap(nineInARow.tracker)
    expect(tenInARow.tracker.streak).toBe(10)
    expect(tenInARow.showHint).toBe(true)
  })

  it('decrements hintsRemaining and marks the deal when a hint fires', () => {
    const { tracker: next, showHint } = recordUndoTap(
      tracker({ lifetimeUndoTaps: 100, streak: 9 })
    )
    expect(showHint).toBe(true)
    expect(next.hintsRemaining).toBe(2)
    expect(next.hintShownThisDeal).toBe(true)
  })

  it('never shows two hints in the same deal, even at a higher streak', () => {
    // First hint at streak 10.
    const first = tapTimes(tracker({ lifetimeUndoTaps: 100 }), 10)
    expect(first.shown).toBe(true)
    expect(first.tracker.hintsRemaining).toBe(2)

    // Keep tapping in the SAME deal all the way past the next threshold (20): blocked.
    const sameDeal = tapTimes(first.tracker, 30)
    expect(sameDeal.shown).toBe(false)
    expect(sameDeal.tracker.hintsRemaining).toBe(2)
  })

  it('shows the next hint in a later deal at the escalated threshold', () => {
    const first = tapTimes(tracker({ lifetimeUndoTaps: 100 }), 10)
    const nextDeal = breakStreak(noteNewDeal(first.tracker))

    // 19 consecutive undos: below the escalated threshold of 20 → no hint.
    const nineteen = tapTimes(nextDeal, 19)
    expect(nineteen.shown).toBe(false)

    // The 20th shows hint #2.
    const twentieth = recordUndoTap(nineteen.tracker)
    expect(twentieth.showHint).toBe(true)
    expect(twentieth.tracker.hintsRemaining).toBe(1)

    // Hint #3 needs a new deal and streak 30.
    const thirdDeal = breakStreak(noteNewDeal(twentieth.tracker))
    const twentyNine = tapTimes(thirdDeal, 29)
    expect(twentyNine.shown).toBe(false)
    const thirtieth = recordUndoTap(twentyNine.tracker)
    expect(thirtieth.showHint).toBe(true)
    expect(thirtieth.tracker.hintsRemaining).toBe(0)
  })

  it('never shows again once hintsRemaining reaches 0', () => {
    const exhausted = breakStreak(
      noteNewDeal(tracker({ lifetimeUndoTaps: 500, hintsRemaining: 0 }))
    )
    const result = tapTimes(exhausted, 60)
    expect(result.shown).toBe(false)
    expect(result.tracker.hintsRemaining).toBe(0)
  })

  it('keeps incrementing counters after hints are exhausted', () => {
    const result = recordUndoTap(
      tracker({ lifetimeUndoTaps: 200, streak: 15, hintsRemaining: 0 })
    )
    expect(result.tracker.lifetimeUndoTaps).toBe(201)
    expect(result.tracker.streak).toBe(16)
  })
})

describe('breakStreak', () => {
  it('resets streak progress toward the hint', () => {
    const broken = breakStreak(tracker({ lifetimeUndoTaps: 100, streak: 9 }))
    expect(broken.streak).toBe(0)

    // After a break the user must re-earn the full streak.
    const afterBreak = recordUndoTap(broken)
    expect(afterBreak.showHint).toBe(false)
    expect(afterBreak.tracker.streak).toBe(1)
  })

  it('preserves lifetime count, hintsRemaining, and per-deal flags', () => {
    const broken = breakStreak(
      tracker({
        lifetimeUndoTaps: 77,
        streak: 5,
        hintsRemaining: 1,
        hintShownThisDeal: true,
        scrubConsumedThisDeal: true,
      })
    )
    expect(broken.lifetimeUndoTaps).toBe(77)
    expect(broken.hintsRemaining).toBe(1)
    expect(broken.hintShownThisDeal).toBe(true)
    expect(broken.scrubConsumedThisDeal).toBe(true)
  })

  it('returns the same reference when the streak is already 0', () => {
    const zero = tracker({ lifetimeUndoTaps: 10 })
    expect(breakStreak(zero)).toBe(zero)
  })
})

describe('consumeHintForScrub', () => {
  it('consumes one hint and raises the next streak threshold', () => {
    const { tracker: consumed, consumed: didConsume } = consumeHintForScrub(
      tracker({ lifetimeUndoTaps: 100 })
    )
    expect(didConsume).toBe(true)
    expect(consumed.hintsRemaining).toBe(2)
    expect(consumed.scrubConsumedThisDeal).toBe(true)

    // With 2 remaining, the next hint needs a 20-streak (in a fresh deal).
    const nextDeal = breakStreak(noteNewDeal(consumed))
    const atNineteen = tapTimes(nextDeal, 19)
    expect(atNineteen.shown).toBe(false)
    expect(recordUndoTap(atNineteen.tracker).showHint).toBe(true)
  })

  it('consumes at most once per deal', () => {
    const first = consumeHintForScrub(tracker())
    const second = consumeHintForScrub(first.tracker)
    expect(second.consumed).toBe(false)
    expect(second.tracker.hintsRemaining).toBe(2)
    expect(second.tracker).toBe(first.tracker)
  })

  it('does not consume in a deal where a hint was already shown', () => {
    const shown = tapTimes(tracker({ lifetimeUndoTaps: 100 }), 10)
    expect(shown.shown).toBe(true)

    const result = consumeHintForScrub(shown.tracker)
    expect(result.consumed).toBe(false)
    expect(result.tracker.hintsRemaining).toBe(2)
    expect(result.tracker).toBe(shown.tracker)
  })

  it('consumes again in a later deal, flooring at 0', () => {
    let current = tracker()
    for (let deal = 0; deal < 5; deal += 1) {
      current = noteNewDeal(consumeHintForScrub(current).tracker)
    }
    expect(current.hintsRemaining).toBe(0)
    expect(consumeHintForScrub(current).consumed).toBe(false)
  })
})

describe('noteNewDeal', () => {
  it('resets the per-deal flags and nothing else', () => {
    const next = noteNewDeal(
      tracker({
        lifetimeUndoTaps: 60,
        streak: 4,
        hintsRemaining: 1,
        hintShownThisDeal: true,
        scrubConsumedThisDeal: true,
      })
    )
    expect(next.hintShownThisDeal).toBe(false)
    expect(next.scrubConsumedThisDeal).toBe(false)
    expect(next.lifetimeUndoTaps).toBe(60)
    expect(next.streak).toBe(4)
    expect(next.hintsRemaining).toBe(1)
  })

  it('returns the same reference when both flags are already false', () => {
    const clean = tracker()
    expect(noteNewDeal(clean)).toBe(clean)
  })
})

describe('parseUndoHintState', () => {
  const fallback = { lifetimeUndoTaps: 0, hintsRemaining: UNDO_HINT_MAX_SHOWINGS }

  it('parses a valid payload', () => {
    expect(
      parseUndoHintState(JSON.stringify({ lifetimeUndoTaps: 42, hintsRemaining: 1 }))
    ).toEqual({ lifetimeUndoTaps: 42, hintsRemaining: 1 })
    expect(
      parseUndoHintState(JSON.stringify({ lifetimeUndoTaps: 0, hintsRemaining: 0 }))
    ).toEqual({ lifetimeUndoTaps: 0, hintsRemaining: 0 })
  })

  it('falls back to defaults for the old v1 {hintShown} shape', () => {
    expect(
      parseUndoHintState(JSON.stringify({ lifetimeUndoTaps: 42, hintShown: true }))
    ).toEqual(fallback)
  })

  it('falls back to defaults for null or malformed payloads', () => {
    expect(parseUndoHintState(null)).toEqual(fallback)
    expect(parseUndoHintState('{}')).toEqual(fallback)
    expect(
      parseUndoHintState(JSON.stringify({ lifetimeUndoTaps: -1, hintsRemaining: 2 }))
    ).toEqual(fallback)
    expect(
      parseUndoHintState(JSON.stringify({ lifetimeUndoTaps: 1.5, hintsRemaining: 2 }))
    ).toEqual(fallback)
    expect(
      parseUndoHintState(JSON.stringify({ lifetimeUndoTaps: 3, hintsRemaining: 4 }))
    ).toEqual(fallback)
    expect(
      parseUndoHintState(JSON.stringify({ lifetimeUndoTaps: 3, hintsRemaining: -1 }))
    ).toEqual(fallback)
  })
})
