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

// v5 schedule (rewind-to-winnable plan): 8 lifetime undos, streaks 3/6/9 —
// loosened from 50 / 10-20-30, which was so conservative the hint essentially
// never fired. See the reasoning block in undoHint.ts.
describe('requiredStreakFor', () => {
  it('escalates 3/6/9 as hints get used up', () => {
    expect(requiredStreakFor(3)).toBe(3)
    expect(requiredStreakFor(2)).toBe(6)
    expect(requiredStreakFor(1)).toBe(9)
  })
})

describe('hint schedule constants', () => {
  it('is reachable within a normal player\'s first sessions', () => {
    // The pinned numbers, asserted directly: the whole point of v5 is that a
    // player who undoes a handful of times and walks back three moves in a row
    // gets taught the gesture. Drifting these back up silently would restore
    // the "hint that never shows" bug.
    expect(UNDO_HINT_LIFETIME_THRESHOLD).toBe(8)
    expect(UNDO_HINT_STREAK_STEP).toBe(3)
    expect(UNDO_HINT_MAX_SHOWINGS).toBe(3)
    // Cheapest possible path to the first hint: 9 undo taps in one deal
    // (the 9th clears BOTH the >8 lifetime gate and the 3-streak).
    const fresh = tapTimes(tracker(), 9)
    expect(fresh.shown).toBe(true)
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
    // Tap that lands exactly ON the threshold must not show the hint...
    const atThreshold = recordUndoTap(
      tracker({
        lifetimeUndoTaps: UNDO_HINT_LIFETIME_THRESHOLD - 1,
        streak: UNDO_HINT_STREAK_STEP - 1,
      })
    )
    expect(atThreshold.tracker.lifetimeUndoTaps).toBe(UNDO_HINT_LIFETIME_THRESHOLD)
    expect(atThreshold.showHint).toBe(false)

    // ...the next one does.
    const aboveThreshold = recordUndoTap(atThreshold.tracker)
    expect(aboveThreshold.tracker.lifetimeUndoTaps).toBe(
      UNDO_HINT_LIFETIME_THRESHOLD + 1
    )
    expect(aboveThreshold.showHint).toBe(true)
  })

  it('requires streak of at least the current threshold (3 for the first hint)', () => {
    const twoInARow = recordUndoTap(tracker({ lifetimeUndoTaps: 100, streak: 1 }))
    expect(twoInARow.tracker.streak).toBe(2)
    expect(twoInARow.showHint).toBe(false)

    const threeInARow = recordUndoTap(twoInARow.tracker)
    expect(threeInARow.tracker.streak).toBe(3)
    expect(threeInARow.showHint).toBe(true)
  })

  it('decrements hintsRemaining and marks the deal when a hint fires', () => {
    const { tracker: next, showHint } = recordUndoTap(
      tracker({ lifetimeUndoTaps: 100, streak: 2 })
    )
    expect(showHint).toBe(true)
    expect(next.hintsRemaining).toBe(2)
    expect(next.hintShownThisDeal).toBe(true)
  })

  it('never shows two hints in the same deal, even at a higher streak', () => {
    // First hint at streak 3.
    const first = tapTimes(tracker({ lifetimeUndoTaps: 100 }), 3)
    expect(first.shown).toBe(true)
    expect(first.tracker.hintsRemaining).toBe(2)

    // Keep tapping in the SAME deal all the way past the next threshold (6): blocked.
    const sameDeal = tapTimes(first.tracker, 12)
    expect(sameDeal.shown).toBe(false)
    expect(sameDeal.tracker.hintsRemaining).toBe(2)
  })

  it('shows the next hint in a later deal at the escalated threshold', () => {
    const first = tapTimes(tracker({ lifetimeUndoTaps: 100 }), 3)
    const nextDeal = breakStreak(noteNewDeal(first.tracker))

    // 5 consecutive undos: below the escalated threshold of 6 → no hint.
    const five = tapTimes(nextDeal, 5)
    expect(five.shown).toBe(false)

    // The 6th shows hint #2.
    const sixth = recordUndoTap(five.tracker)
    expect(sixth.showHint).toBe(true)
    expect(sixth.tracker.hintsRemaining).toBe(1)

    // Hint #3 needs a new deal and streak 9.
    const thirdDeal = breakStreak(noteNewDeal(sixth.tracker))
    const eight = tapTimes(thirdDeal, 8)
    expect(eight.shown).toBe(false)
    const ninth = recordUndoTap(eight.tracker)
    expect(ninth.showHint).toBe(true)
    expect(ninth.tracker.hintsRemaining).toBe(0)
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
    expect(result.showHint).toBe(false)
  })
})

describe('breakStreak', () => {
  it('resets streak progress toward the hint', () => {
    const broken = breakStreak(tracker({ lifetimeUndoTaps: 100, streak: 2 }))
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

    // With 2 remaining, the next hint needs a 6-streak (in a fresh deal).
    const nextDeal = breakStreak(noteNewDeal(consumed))
    const atFive = tapTimes(nextDeal, 5)
    expect(atFive.shown).toBe(false)
    expect(recordUndoTap(atFive.tracker).showHint).toBe(true)
  })

  it('consumes at most once per deal', () => {
    const first = consumeHintForScrub(tracker())
    const second = consumeHintForScrub(first.tracker)
    expect(second.consumed).toBe(false)
    expect(second.tracker.hintsRemaining).toBe(2)
    expect(second.tracker).toBe(first.tracker)
  })

  it('does not consume in a deal where a hint was already shown', () => {
    const shown = tapTimes(tracker({ lifetimeUndoTaps: 100 }), 3)
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
