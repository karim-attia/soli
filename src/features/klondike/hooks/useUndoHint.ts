import { useCallback, useEffect, useRef, useState } from 'react'
import { AccessibilityInfo } from 'react-native'

import {
  loadUndoHintStateSync,
  saveUndoHintState,
} from '../../../storage/undoHintStorage'
import {
  breakStreak,
  consumeHintForScrub,
  noteNewDeal as noteNewDealPure,
  recordUndoTap,
  UNDO_HINT_AUTO_DISMISS_MS,
  UNDO_HINT_COPY,
  UNDO_HINT_LIFETIME_THRESHOLD,
  UNDO_HINT_MAX_SHOWINGS,
  type UndoHintTracker,
} from '../undoHint'

// Owns the undo-scrubber hint lifecycle: counters, persistence, auto-dismiss timer,
// a11y announcement. All returned callbacks are stable (ref internals, no state deps)
// so callers like dispatchGameAction/handleUndo in useKlondikeGame don't gain
// unstable dependencies.
export const useUndoHint = () => {
  const trackerRef = useRef<UndoHintTracker | null>(null)
  if (trackerRef.current === null) {
    const stored = loadUndoHintStateSync()
    // Streak and per-deal flags always start fresh: they're in-the-moment signals and
    // deliberately don't survive an app restart (see UndoHintTracker comments).
    trackerRef.current = {
      lifetimeUndoTaps: stored.lifetimeUndoTaps,
      streak: 0,
      hintsRemaining: stored.hintsRemaining,
      hintShownThisDeal: false,
      scrubConsumedThisDeal: false,
    }
  }

  const [undoHintVisible, setUndoHintVisible] = useState(false)
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistTracker = useCallback(() => {
    // Fire-and-forget; hintsRemaining is persisted the moment it changes (hint shown
    // or scrub consumed) so a crash/kill can't replay a hint.
    const tracker = trackerRef.current!
    void saveUndoHintState({
      lifetimeUndoTaps: tracker.lifetimeUndoTaps,
      hintsRemaining: tracker.hintsRemaining,
    })
  }, [])

  const dismissUndoHint = useCallback(() => {
    if (dismissTimeoutRef.current !== null) {
      clearTimeout(dismissTimeoutRef.current)
      dismissTimeoutRef.current = null
    }
    setUndoHintVisible(false)
  }, [])

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current !== null) {
        clearTimeout(dismissTimeoutRef.current)
      }
    }
  }, [])

  const noteUndoSuccess = useCallback(() => {
    const { tracker, showHint } = recordUndoTap(trackerRef.current!)
    trackerRef.current = tracker
    persistTracker()

    if (!showHint) {
      return
    }

    setUndoHintVisible(true)
    AccessibilityInfo.announceForAccessibility(UNDO_HINT_COPY)
    // Deliberately NOT dismissed by further undo taps: the user is mid-rapid-tapping
    // and needs time to read the copy. Only the 10s timer or the dock unmounting
    // (win/celebration) hides it.
    if (dismissTimeoutRef.current !== null) {
      clearTimeout(dismissTimeoutRef.current)
    }
    dismissTimeoutRef.current = setTimeout(() => {
      dismissTimeoutRef.current = null
      setUndoHintVisible(false)
    }, UNDO_HINT_AUTO_DISMISS_MS)
  }, [persistTracker])

  const noteStreakBreak = useCallback(() => {
    trackerRef.current = breakStreak(trackerRef.current!)
    // Product decision (tested on device): the bubble sits above the scrub overlay,
    // not on top, so we deliberately do NOT dismiss on scrub start or other actions —
    // users may still be reading it; the 10s timer is the only dismissal.
  }, [])

  // Scrub session ended; `changed` = it landed on a different timeline index than it
  // started (a "successful" scrub) → consume one remaining hint (at most once per
  // deal; see consumeHintForScrub for the rules).
  const noteScrubEnd = useCallback(
    (changed: boolean) => {
      if (!changed) {
        return
      }
      const { tracker, consumed } = consumeHintForScrub(trackerRef.current!)
      trackerRef.current = tracker
      if (consumed) {
        persistTracker()
      }
    },
    [persistTracker]
  )

  const noteNewDeal = useCallback(() => {
    trackerRef.current = noteNewDealPure(trackerRef.current!)
  }, [])

  // Manual-testing helper (demo sheet): resets to a TESTABLE state, not a true
  // fresh-install one — lifetime is set just past the >50 gate so a 10-tap undo
  // streak immediately shows hint 1. Resetting lifetime to 0 would require 51 real
  // undos before anything shows, defeating the button's purpose.
  const resetUndoHintForTesting = useCallback(() => {
    trackerRef.current = {
      lifetimeUndoTaps: UNDO_HINT_LIFETIME_THRESHOLD + 1,
      streak: 0,
      hintsRemaining: UNDO_HINT_MAX_SHOWINGS,
      hintShownThisDeal: false,
      scrubConsumedThisDeal: false,
    }
    persistTracker()
    dismissUndoHint()
  }, [dismissUndoHint, persistTracker])

  // dismissUndoHint stays internal: since the on-device v3 review, nothing outside
  // this hook dismisses the bubble (only the 10s timer, the reset helper, and the
  // dock unmounting on win).
  return {
    undoHintVisible,
    noteUndoSuccess,
    noteStreakBreak,
    noteScrubEnd,
    noteNewDeal,
    resetUndoHintForTesting,
  }
}
