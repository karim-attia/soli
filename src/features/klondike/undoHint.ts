// Discovery hint for the undo scrubber (see
// docs/product/undo-scrubber-hint/undo-scrubber-hint.md).
//
// Product reasoning for the thresholds (from the original user prompt + v2 follow-up):
// - Lifetime > 50: some users barely undo; showing the hint early would be cognitive
//   overload, especially right after install. Only proven undo users qualify.
// - Escalating streaks 10/20/30 (v2): a single undo doesn't benefit from the scrubber.
//   The scrubber shines when walking back many moves in a row to explore a different
//   line of play. Up to 3 showings total, each requiring a longer streak AND a later
//   game than the previous one — the escalation keeps repeat hints from feeling naggy
//   while still catching users who missed the earlier ones.
// - Scrub consumption (v2): users who demonstrably already use the scrubber (a scrub
//   session that ended at a different timeline position) shouldn't be taught what they
//   already know — each successful scrub silently consumes one remaining hint.
export const UNDO_HINT_LIFETIME_THRESHOLD = 50
export const UNDO_HINT_MAX_SHOWINGS = 3
export const UNDO_HINT_STREAK_STEP = 10
// v2: 6s → 10s per user request; gives time to read while mid-play. No X close button
// instead — the pan gesture's hitSlop extends 50px above the undo button, exactly
// where an X would sit, and it would steal touches from the gesture we're teaching.
export const UNDO_HINT_AUTO_DISMISS_MS = 10000
// Copy must say "drag" — the scrubber gesture is a horizontal pan (minDistance 5px in
// useUndoScrubber.ts), NOT a long-press. "Tap and hold" would teach the wrong gesture.
// "Time travel" matches the Play Store listing's wording for the feature and avoids
// the jargon "scrub" (device review 2026-07-07: even fluent non-native speakers may
// not have "scrub" in their active vocabulary).
export const UNDO_HINT_COPY =
  'Tip: Drag the Undo button sideways to time travel through your game'

// 3 remaining → 10, 2 → 20, 1 → 30. One derived formula instead of a schedule table.
export const requiredStreakFor = (hintsRemaining: number): number =>
  UNDO_HINT_STREAK_STEP * (UNDO_HINT_MAX_SHOWINGS + 1 - hintsRemaining)

export type UndoHintTracker = {
  // Persisted across sessions.
  lifetimeUndoTaps: number
  // In-memory only: the hint targets an in-the-moment behavior, so a streak
  // deliberately does not survive an app restart.
  streak: number
  // Persisted. Starts at 3; decremented the moment a hint is displayed AND on each
  // scrub consumption. 0 = never hint again.
  hintsRemaining: number
  // Per-deal flags, in-memory only, reset on new deal. Trade-off: an app restart
  // mid-game resets them, so in rare restart cases a hint could show or a scrub could
  // consume in the "same" game again — acceptable; not worth persisting deal ids.
  hintShownThisDeal: boolean
  scrubConsumedThisDeal: boolean
}

export const recordUndoTap = (
  tracker: UndoHintTracker
): { tracker: UndoHintTracker; showHint: boolean } => {
  const lifetimeUndoTaps = tracker.lifetimeUndoTaps + 1
  const streak = tracker.streak + 1
  // !hintShownThisDeal: never two hints in the same deal — a follow-up hint may only
  // appear in a later game than the previous showing.
  const showHint =
    lifetimeUndoTaps > UNDO_HINT_LIFETIME_THRESHOLD &&
    tracker.hintsRemaining > 0 &&
    streak >= requiredStreakFor(tracker.hintsRemaining) &&
    !tracker.hintShownThisDeal

  return {
    tracker: {
      ...tracker,
      lifetimeUndoTaps,
      streak,
      hintsRemaining: showHint ? tracker.hintsRemaining - 1 : tracker.hintsRemaining,
      hintShownThisDeal: tracker.hintShownThisDeal || showHint,
    },
    showHint,
  }
}

export const breakStreak = (tracker: UndoHintTracker): UndoHintTracker => {
  // Same reference when already 0: breakStreak is called on every non-undo game
  // action, so keep the common case allocation-free.
  if (tracker.streak === 0) {
    return tracker
  }
  return { ...tracker, streak: 0 }
}

// A successful scrub (session ended at a different timeline index than it started)
// consumes one remaining hint: the user just proved they know the feature.
// - !scrubConsumedThisDeal: at most one consumption per deal, so one heavy scrubbing
//   session can't instantly burn all 3 hints.
// - !hintShownThisDeal: "except if just in the same game" (user prompt) — a scrub
//   right after seeing the hint in the same deal doesn't ALSO consume the next one.
export const consumeHintForScrub = (
  tracker: UndoHintTracker
): { tracker: UndoHintTracker; consumed: boolean } => {
  if (
    tracker.hintsRemaining <= 0 ||
    tracker.scrubConsumedThisDeal ||
    tracker.hintShownThisDeal
  ) {
    return { tracker, consumed: false }
  }
  return {
    tracker: {
      ...tracker,
      hintsRemaining: tracker.hintsRemaining - 1,
      scrubConsumedThisDeal: true,
    },
    consumed: true,
  }
}

// Resets the per-deal flags on a fresh deal. Streak reset is left to the existing
// breakStreak call in dealNewGame (both fire there).
export const noteNewDeal = (tracker: UndoHintTracker): UndoHintTracker => {
  if (!tracker.hintShownThisDeal && !tracker.scrubConsumedThisDeal) {
    return tracker
  }
  return { ...tracker, hintShownThisDeal: false, scrubConsumedThisDeal: false }
}
