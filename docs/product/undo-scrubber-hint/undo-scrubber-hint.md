# Undo Scrubber Hint — Discovery hint on the Undo button

## User prompt

> many users don’t know the undo scrubber yet which is one of the coolest features. idea: show small hint on undo button after user has already clicked undo more than 50 times and has clicked it 10x in a row. say that you can swipe or tap and hold or something like this. like a small hint. reason for 50: some users dont play with a lot of undo and it might be cognitive overload. also dont want to cognitive overload when just downloading the app. reason for 10: 1 undo doesn’t really benefit from scrubber. it’s about going back to the point in the game where you did a move that is a different path in the game and to explore. makes sense in the moment where you click undo many times otherwise.

Follow-up (v2, 2026-07-07, after reviewing the shipped v1):

> let's make it 10s instead of 6s?
> or add a small x to close it and make it even longer?
> would a little arrow to the undo button be nice?
> don't remove it when scrubbing starts, 10s is fine and users might still be reading it. or what do you think?
> should we show it 3x? once after 10x undo. and then only in the next game after 20x undo and then only in the next game after 30x undo?
> what should we do with users who already use it? maybe from the 3x above, delete the next one per successful scrub (except if just in the same game). what do you think?

Follow-up (v4, 2026-07-07, after testing v2+v3 on device):

> pls dont make the hint disappear when the user starts to scrub. it's visually above anyway, not on top. 
>
> nitpick: there's a small line between the arrow and the hint.
>
> question: do users know what scrub means? me as non-native english speaker with very good english didnt really have that in my active vocabulary before. in play store, i call the feature to time travel through the game.

## Summary

**Status: v1 AND v2 complete (2026-07-07). v2 step 9 Android device smoke passed — full 3/6/9 escalation, per-deal suppression, 10s dismiss, scrub-dismiss, scrub-consumption and exhaustion all verified on device; no bugs found. v3 (2026-07-07): "Reset undo hint" button added to the dev demo sheet for manual testing — resets to lifetime 51 / 3 hints so a 10-tap streak shows hint 1 immediately (see "Steps to implement — v3"); checks green (25 suites, 232 tests). v4 (2026-07-07, Karim's device review): hint no longer dismisses on scrub start or other actions (10s timer is the only dismissal besides the dock unmounting — reverses the v2 #8 decision after seeing on device that the bubble sits above the overlay, not on top); caret seam fixed with a 1px overlap; copy now says "time travel through your game" instead of the jargon "scrub" (matches the Play Store listing). Checks green (25 suites, 232 tests).**

v2 implementation notes:

- All v2 code changes done per plan: 10s dismiss, caret, `hintsRemaining` (3→0) with 10/20/30 escalation, per-deal flags, scrub consumption via new `onScrubEnd(changed)` plumbing, storage shape `{ lifetimeUndoTaps, hintsRemaining }` on the same `/v1` key with fallback for old rows.
- `yarn typecheck && yarn lint && yarn jest` green: 25 suites, 232 tests (undoHint.test.ts extended to 22 tests covering escalation, per-deal rules, consumption, storage fallback).
- One layout tweak beyond the plan text: the bubble is now wrapped in a full-dock-width `pointerEvents="none"` layer so the caret can sit at `right: 25%` (= the Undo button's horizontal center, since the button fills the right 50% of the dock). Visual position of the bubble itself is unchanged (right-aligned).

v2 changes on top of v1 (decisions in "Open questions" #5–#10):

- Auto-dismiss 6s → 10s. No X close button (rejected — would sit inside the pan gesture's hitSlop). Small downward caret added to the bubble, pointing at the Undo button.
- Keep dismiss-on-scrub-start (user leaned otherwise but accepted the recommendation — see trade-off in Open questions #8).
- Show up to **3 times** with escalating streak thresholds 10/20/30, derived from a single persisted `hintsRemaining` counter (3→0). Never two hints in the same game (deal); lifetime > 50 gate applies to all showings.
- **Successful scrubs consume hints**: a scrub session that ends at a different timeline index than it started decrements `hintsRemaining` (at most once per deal, and not in a deal where a hint was already shown) — users who already use the scrubber shouldn't be nagged.
- Persistence shape becomes `{ lifetimeUndoTaps, hintsRemaining }` (key stays `soli/undoHint/v1`, no migration — v1 never shipped; old rows fall back to defaults).

v1 summary (implemented):

- New pure logic (`undoHint.ts`), storage (`undoHintStorage.ts`), and hook (`useUndoHint.ts`) modules; wired into `useKlondikeGame` (streak break in `dispatchGameAction`/`dealNewGame`/failed undo, counting in `handleUndo`), `useUndoScrubber` (new optional `onScrubBegin`), and the UI (`UndoHintBubble` rendered from `UndoScrubber` via new `hintVisible` prop).
- The bubble has `testID="undo-hint"` (added beyond the plan so the device test agent can locate it).
- `yarn typecheck && yarn lint && yarn jest` all pass (222 tests, incl. 12 new in `undoHint.test.ts` covering thresholds, once-ever, streak breaks, and storage parsing).
- No deviations from the plan besides the testID and a tiny `bottom` prop on `UndoHintBubble` (the dock offset is computed in `UndoScrubber`, so it's passed down instead of recomputed).

## Description

The undo scrubber (press the Undo button and drag horizontally to scrub back/forward through the whole move timeline) is one of the app's best features, but it is invisible: the Undo button looks like a plain tap button and nothing ever teaches the drag gesture. Users who would benefit most — those who undo many moves in a row to explore a different line of play — never discover it.

We show a small hint bubble anchored above the Undo button, exactly in the moment the scrubber would have helped: when the user has tapped undo a lot over their lifetime (they're an undo user, > 50 lifetime taps) AND is currently tapping it many times in a row (i.e. they're walking back through history one step at a time right now). The hint auto-dismisses and never blocks touches.

**v2 refinement:** instead of once ever, the hint can show up to 3 times total, each requiring a longer streak (10, then 20, then 30 consecutive undos) and each in a different game (deal) than the previous one — the escalation keeps it from feeling naggy while still catching users who missed it the first time. Users who demonstrably already use the scrubber (a successful scrub = the session ended at a different timeline position) have their remaining hints consumed silently, at most one per game, so existing scrubber users are never taught what they already know. A small downward caret points the bubble at the Undo button.

**Critical copy note:** the actual gesture is press Undo and **drag horizontally** (pan gesture, `minDistance(5)` in `useUndoScrubber.ts`). It is NOT a long-press. The copy must say "drag", not "tap and hold" / "long press".

## Acceptance Criteria

(v2 — supersedes the v1 criteria; changes marked.)

1. When the user performs a successful tap-undo and, after that tap, `lifetimeUndoTaps > 50` AND `currentStreak >= requiredStreak` AND `hintsRemaining > 0` AND no hint was shown in this deal yet → a hint bubble appears above the Undo button immediately (within the same interaction). **(v2)** `requiredStreak = 10 * (4 - hintsRemaining)`: 3 remaining → 10, 2 → 20, 1 → 30.
2. **(v4)** Copy: "Tip: Drag the Undo button sideways to time travel through your game" ("time travel" matches the Play Store listing; "scrub" was jargon). **(v2)** The bubble has a small downward caret on its bottom edge pointing at the Undo button (no visible seam between caret and bubble, v4).
3. **(v4)** The hint auto-dismisses after 10 seconds (fade out) — this is the ONLY dismissal besides the dock unmounting on win. It does NOT dismiss on further undo taps, on other game actions, or when a scrub session begins (reverses the v2 decision: on device the bubble sits visually above the scrub overlay, not on top of it, and users may still be reading it). There is no X close button (see Open questions #6).
4. The hint disappears together with the Undo button on win/celebration (Undo dock hides entirely; hint must not linger).
5. **(v2)** The hint is shown at most 3 times per install: `hintsRemaining` starts at 3, is decremented and persisted the moment a hint is displayed, and a subsequent hint can only appear in a later game (deal) than the previous showing.
6. **(v2)** A successful scrub (session ends at a different history index than it started) decrements `hintsRemaining` — at most once per deal, and not in a deal where a hint was already shown. Scrubs that end where they started (no timeline change) consume nothing.
7. The hint never intercepts touches (`pointerEvents="none"`, caret included) — tapping undo and starting a scrub work exactly as before while it is visible.
8. Counting rules (see below) hold: scrub steps don't increment the counters, demo playback undos don't increment the counters, timer ticks don't reset the streak.
9. **(v2)** `lifetimeUndoTaps` and `hintsRemaining` persist across app restarts; streak and per-deal flags are session/in-memory only.
10. Screen-reader users get the hint announced via `AccessibilityInfo.announceForAccessibility` each time it is shown.
11. `yarn typecheck && yarn lint && yarn jest` pass; unit tests cover the v2 scheduling (escalating thresholds, per-deal rules, scrub consumption).

## Counting rules (exact)

**Lifetime counter (`lifetimeUndoTaps`, persisted) and streak (`streak`, in-memory) increment together** — only in `handleUndo` in `src/features/klondike/hooks/useKlondikeGame.ts` (currently lines ~523–531), and only when the undo will actually apply:

- `stateRef.current.history.length > 0` AND `!boardLockedRef.current` (mirrors the guard inside `dispatchGameAction`, which silently drops actions while the board is locked). Count before/alongside `dispatchGameAction({ type: 'UNDO' })`.
- `handleUndo` is only reachable from the tap gesture (`handleTapEnd` in `useUndoScrubber.ts` line ~311). Verified: demo playback (`useDemoGameLauncher.ts` line ~416) calls `dispatchGameAction({ type: 'UNDO' })` directly and never goes through `handleUndo`, so demo undos are excluded automatically. Add a belt-and-braces guard anyway: skip counting when `demoPlaybackActiveRef.current` is true (the ref already exists in `useKlondikeGame`), with a comment explaining that it's defensive.
- Scrub steps dispatch `SCRUB_TO_INDEX` (raw `dispatch` in `useUndoScrubber.ts` line ~280) and never touch `handleUndo` → they never increment. Correct by construction.

**Streak resets to 0 on:**

1. Any other game action through `dispatchGameAction` (`action.type !== 'UNDO'`) — draws, moves, selections, auto-queue advances. Verified: `TIMER_START/TICK/STOP` are dispatched via raw `dispatch` in `useKlondikeTimer.ts` and `useKlondikeHistoryEntry.ts`, so timer ticks correctly do NOT reset the streak. Demo-playback actions also route through `dispatchGameAction`; resetting the streak during demos is harmless (demos never increment it).
2. Failed undo in `handleUndo` (empty history → `notifyInvalidMove`, or board locked).
3. A scrub session beginning — hook into `beginScrubSession` in `useUndoScrubber.ts` (line ~288) via a new optional `onScrubBegin?: () => void` option. (Scrubbing proves the user knows the feature. v4: a visible hint deliberately STAYS — the streak still breaks.)
4. New game: inside `dealNewGame`'s flow in `useKlondikeGame.ts` (reset alongside the deal). App restart / hydration needs no handling: the streak lives in a ref and starts at 0.

**Trigger check (v2)** runs in `handleUndo` immediately after incrementing:

```
requiredStreak = 10 * (4 - hintsRemaining)   // 3 remaining → 10, 2 → 20, 1 → 30
show iff lifetimeUndoTaps > 50
      && hintsRemaining > 0
      && streak >= requiredStreak
      && !hintShownThisDeal
```

On show: `hintsRemaining -= 1` and `hintShownThisDeal = true`, persist `{ lifetimeUndoTaps, hintsRemaining }` right away (fire-and-forget async write).

**Scrub consumption (v2):** a "successful scrub" is a scrub session that ended at a different history index than it started at (`finalIndex !== startIndex`). On the first successful scrub in a deal — if `!scrubConsumedThisDeal && !hintShownThisDeal && hintsRemaining > 0` — decrement `hintsRemaining`, set `scrubConsumedThisDeal = true`, persist. Further scrubs in the same deal consume nothing (per-game dedupe prevents one heavy scrubbing session from instantly burning all 3). The `!hintShownThisDeal` guard implements "except if just in the same game" from the user prompt: a scrub performed right after seeing the hint in the same deal doesn't ALSO consume the next one. Rationale: users who already use the scrubber shouldn't be nagged with hints for it.

**Per-deal flags** (`hintShownThisDeal`, `scrubConsumedThisDeal`) are in-memory only, reset on new deal (`dealNewGame`). Trade-off: an app restart mid-game resets them, so in rare restart cases a hint could show or a scrub could consume in the "same" game again — acceptable; not worth persisting deal ids. Document this in a code comment.

## Possible approaches incl. pros and cons

### A. Pure tracker module + small hook + bubble inside `UndoScrubber` (recommended)

- Pure function module (`undoHint.ts`) holds thresholds + streak/eligibility logic → trivially unit-testable without React.
- Small hook (`useUndoHint.ts`) owns refs, persistence, auto-dismiss timer; returns stable callbacks (internals via refs) so `dispatchGameAction`/`handleUndo` in `useKlondikeGame` don't gain unstable deps.
- Bubble rendered inside `UndoScrubber`'s container via one new `hintVisible: boolean` prop, absolutely positioned above the button — same pattern as the existing scrub overlay (`bottom: bottomDockOffset`), and it disappears automatically with the whole dock on win (component returns `null` when `!visible`).
- Pros: minimal surface, testable core, reuses existing positioning pattern, isolated from the memoized `GestureWrapper` hot path. Cons: one more prop through the memoized `UndoScrubber` (re-render only on show/hide — rare, fine).

### B. Track counters inside the reducer (`klondike.ts`)

- Pros: single source of truth for actions. Cons: rejected — the reducer is pure game logic; lifetime persistence, "tap vs demo vs scrub" distinctions, and one-time-UI concerns don't belong there, and `GameState` snapshots/undo semantics would fight the counters (undoing would undo the counter). Clear no.

### C. Render the bubble as a sibling in `KlondikeGameView`'s `bottomDock`

- Pros: `UndoScrubber` untouched. Cons: duplicates the safe-area/dock offset geometry that `UndoScrubber` already computes (`safeArea.bottom + UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING`), needs its own win/celebration hiding logic. Approach A gets both for free.

**Decision: A.**

## Open questions to the user

(Proceeding with recommendations per AGENTS.md; flagged in the final summary.)

1. **Dismiss on subsequent undo taps?** (a) Yes — hint is fleeting. (b) No — user is mid-rapid-tapping; dismissing on the very next tap gives them <1s to read it, defeating the purpose. **Recommendation: (b)** — keep visible through further taps; auto-dismiss after 6s or on scrub start.
2. **Re-show if the user never scrubs afterwards?** (a) Once ever — simplest, zero nag risk. (b) Re-show up to N times if no scrub was ever performed — more teaching power, but needs scrub-usage tracking and risks annoyance. **Recommendation: (a)** once ever; revisit later if analytics/feedback suggest it (see Follow-ups).
3. **Exact copy.** (a) "Tip: Drag the Undo button sideways to scrub through your moves" — explicit, names the button. (b) "Drag sideways to scrub through your moves" — shorter, relies on anchoring. **Recommendation: (a)**; it reads fine even if the user notices the bubble a beat later.
4. **Dev/testing override for the thresholds?** (a) Ship a `__DEV__`/developerMode low-threshold override — convenient forever, but shipped test code and `developerMode` is often on during normal dev play (would distort behavior). (b) No shipped override; the smoke test temporarily lowers the constants locally and reverts after. **Recommendation: (b)** — unit tests cover the threshold math; the smoke test only needs to prove the wiring once. Avoids gold plating.

### v2 decisions (from the follow-up prompt — decided with the user, encode exactly)

5. **Auto-dismiss duration.** 6s → **10s** (`UNDO_HINT_AUTO_DISMISS_MS = 10000`). User's request; gives time to read while mid-play.
6. **X close button?** **Rejected.** The bubble is `pointerEvents="none"` by design, and the pan gesture's hitSlop extends 50px above the undo button (`hitSlop({ bottom: 50, top: 50, ... })` in `useUndoScrubber.ts` line ~346) — exactly where an X would sit. A tappable X would compete with (and risk stealing touches from) the scrub gesture we're trying to teach. The longer 10s timeout covers the "more time to read" motivation instead.
7. **Arrow/caret pointing at the undo button?** **Yes.** Small downward caret on the bubble's bottom edge, pure visual (part of the same `pointerEvents="none"` bubble). Plain RN `View` triangle (border trick) or small rotated square — keep it simple, match the bubble background color. (This reverses v1's "skip the caret" call — the user explicitly wants it.)
8. **Keep dismiss-on-scrub-start?** ~~Keep dismissing~~ **REVERSED in v4 after device testing:** the clash argument (a) turned out wrong on device — the bubble sits visually above the scrub overlay, not on top of it — so the hint now stays visible through scrubs and all other actions; the 10s timer is the only dismissal (besides the dock unmounting on win). Decision recorded as a code comment in `noteStreakBreak`.
9. **Show 3× with escalating thresholds?** **Yes.** Single persisted counter `hintsRemaining` starting at 3, decremented on each showing AND on each scrub-consumption (see #10). `requiredStreak = 10 * (4 - hintsRemaining)` → 10/20/30. Lifetime > 50 gate applies to all showings. Never two hints in the same deal — a subsequent hint may only appear in a later game than the previous one was shown in.
10. **Users who already use the scrubber?** **Successful scrubs consume hints.** Successful = the session ended at a different history index than it started. At most one consumption per deal; no consumption in a deal where a hint was just shown. See "Scrub consumption (v2)" in Counting rules.

## Dependencies

None new. Uses existing `expo-sqlite/kv-store`, `react-native-reanimated`, `react-native` (`AccessibilityInfo`). No expo-haptics (deliberately — not a dependency today, don't add). No toast library (Tamagui toast was deliberately removed for an Android a11y regression, see `components/Provider.tsx` lines 31–36).

## UX/UI Considerations

- **Placement:** small bubble above the Undo button (button = right 50% of the bottom dock, `styles.undoButton` in `UndoScrubber.tsx`). Absolutely positioned inside `styles.container`, right-aligned (`right: 0`), sitting just above the button: `bottom: bottomDockOffset + UNDO_BUTTON_HEIGHT + 8` where `bottomDockOffset = safeArea.bottom + UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING` (same offset the scrub overlay already uses, line ~189) and `UNDO_BUTTON_HEIGHT = 48` (14px vertical padding ×2 + 20px icon; extract as a constant next to the styles). `zIndex: 4` (above the overlay's 3) — the overlay only shows while scrubbing, which dismisses the hint anyway; both fade at 140ms so a brief crossfade is fine.
- **Visual language:** match the scrub overlay's dark glass panel: background `rgba(15, 23, 42, 0.92)` (slightly more opaque than the overlay's 0.55 for text legibility over the felt), `borderRadius: 16`, white text `fontSize: 13`, `fontWeight: '600'`, padding 10×14, same soft shadow as `styles.overlay`. ~~Optionally a small downward caret — skip it~~ **(v2)** Add a small downward caret on the bubble's bottom edge, horizontally centered over the Undo button (bubble is right-aligned above the right-half button, so center the caret relative to the button, e.g. `alignSelf` positioning or `right: <button center offset>`). Implementation: plain RN `View` triangle via the border trick (`borderLeft/RightWidth: 6, borderTopWidth: 6, borderTopColor: <bubble bg>`, transparent sides) or a small rotated square — whichever is fewer lines. Same color as the bubble background; part of the same `pointerEvents="none"` subtree.
- **Animation:** mirror the overlay pattern exactly — always render the bubble node while `visible` (the whole `UndoScrubber` already returns `null` when hidden), drive `opacity`/`scale` from the `hintVisible` prop with `withTiming({ duration: 140 })` (same `SCRUBBER_TRANSITION` value). No `useAnimationToggles()` gating: the scrub overlay itself doesn't gate its fade, and a 140ms functional fade is not a decorative animation (leave a comment noting this precedent).
- **Touch:** `pointerEvents="none"` on the bubble — it must never compete with the tap/pan gesture (same reasoning as the overlay's `pointerEvents="none"`, see comment at `UndoScrubber.tsx` line ~247).
- **A11y:** `accessible`, `accessibilityLabel` = the copy, `accessibilityLiveRegion="polite"` (Android), and call `AccessibilityInfo.announceForAccessibility(UNDO_HINT_COPY)` once when shown (iOS + Android). No focus trap, no focus stealing.
- **Timing (v2):** shows immediately after the qualifying tap (10th/20th/30th consecutive undo depending on `hintsRemaining`); auto-dismiss after `UNDO_HINT_AUTO_DISMISS_MS = 10000`; instant dismiss on scrub start (kept deliberately — see Open questions #8; leave a code comment with the overlay-clash rationale); unmounts with the dock on win/celebration (`shouldShowUndo` false). Clear the dismiss timer on unmount. No X close button (Open questions #6 — would sit inside the pan hitSlop).

## Components

- **New:** `src/features/klondike/components/UndoHintBubble.tsx` — tiny presentational component (`{ visible: boolean }` prop or inlined into `UndoScrubber.tsx` if < ~40 lines; prefer a separate file for readability). Plain react-native `View`/`Text` + Reanimated, consistent with `UndoScrubber.tsx`. Deliberately NOT a Tamagui/expo-ui component: the AGENTS.md rule prefers those, but this dock deliberately uses plain RN + Reanimated (Tamagui Button was removed here due to iOS gesture conflicts — see git history/comments in `UndoScrubber.tsx`); staying consistent inside this gesture-sensitive subtree matters more. Leave a comment saying so.
- **Reuse:** `UndoScrubber` container geometry & transition constants; `expo-sqlite/kv-store` persistence pattern from `src/storage/uiPreferences.ts`.

## How to fetch data, how to cache

n/a — one tiny kv-store row, sync read once at startup, async fire-and-forget writes (pattern of `src/storage/uiPreferences.ts`). Write on every successful undo tap: a single-row SQLite upsert at user tap cadence (~5/s worst case) is negligible — `gamePersistence` already writes far bigger blobs per move. Trade-off comment in code: no throttling on purpose; revisit only if profiling ever shows it.

## Related tasks

- `docs/product/scrubber-test-automation/scrubber-test-automation.md` — scrubber gesture mechanics + device-test recipes (deterministic scrub drag documented in `UndoScrubber.tsx` comment lines ~196–206).
- `docs/product/klondike-card-accessibility/klondike-card-accessibility.md` — a11y conventions for the board.

## Simplification ideas

- Streak is in-memory only (a ref) — no persistence, no cross-session semantics. Restarting the app mid-streak resets it; acceptable, since the hint targets an in-the-moment behavior.
- One kv row, no schema versioning beyond the `/v1` key suffix, no migration. (v2 changes the payload shape in place — v1 is unshipped, so old/invalid rows just fall back to defaults via parse validation.)
- No new gesture, no haptics, no coach-mark library, no analytics. (v2: caret IS added per user request — a ~10-line static View, not a library.)
- Reuse the dock's existing offset math instead of measuring the button (`measureInWindow`) — the button geometry is static per layout.
- `hintsRemaining` is decremented when displayed (not when dismissed) — no "was it really read" logic.
- v2: one derived formula (`10 * (4 - hintsRemaining)`) instead of a threshold array/schedule table; per-deal flags are plain refs, no persisted deal ids.

## Steps to implement

- [x] 1. **Pure logic module** `src/features/klondike/undoHint.ts`:
  - Constants: `UNDO_HINT_LIFETIME_THRESHOLD = 50` (show requires `lifetime > 50`), `UNDO_HINT_STREAK_THRESHOLD = 10` (`streak >= 10`), `UNDO_HINT_AUTO_DISMISS_MS = 6000`, `UNDO_HINT_COPY = 'Tip: Drag the Undo button sideways to scrub through your moves'`.
  - `type UndoHintTracker = { lifetimeUndoTaps: number; streak: number; hintShown: boolean }`
  - `recordUndoTap(tracker): { tracker: UndoHintTracker; showHint: boolean }` — increments both counters; `showHint` true iff thresholds met post-increment and `!hintShown`; when true, returned tracker has `hintShown: true`.
  - `breakStreak(tracker): UndoHintTracker` — `streak: 0` (returns same reference if already 0, to keep callers cheap).
  - Comments documenting the 50/10 product reasoning from the user prompt.
- [x] 2. **Storage module** `src/storage/undoHintStorage.ts` (mirror `uiPreferences.ts`): key `soli/undoHint/v1`, payload `{ lifetimeUndoTaps: number, hintShown: boolean }`; `loadUndoHintStateSync()` (try/catch, validate numbers/booleans, fall back to `{ lifetimeUndoTaps: 0, hintShown: false }`), `saveUndoHintState(state)` async with `devLog('warn', ...)` on failure. Comment: sync read is intentional (tiny row, read once at startup — same rationale as board metrics).
- [x] 3. **Hook** `src/features/klondike/hooks/useUndoHint.ts`: seeds a tracker ref from `loadUndoHintStateSync()` (streak starts 0); returns `{ undoHintVisible: boolean, noteUndoSuccess: () => void, noteStreakBreak: () => void, dismissUndoHint: () => void }`, all stable (`useCallback` with ref internals, no state deps). `noteUndoSuccess` runs `recordUndoTap`, persists `{ lifetimeUndoTaps, hintShown }`, and on `showHint` sets `undoHintVisible`, calls `AccessibilityInfo.announceForAccessibility(UNDO_HINT_COPY)`, and arms the 6s auto-dismiss timeout (cleared on dismiss/unmount). `noteStreakBreak` runs `breakStreak` and calls `dismissUndoHint` (covers scrub-start dismissal).
- [x] 4. **Wire into `useKlondikeGame.ts`:** call `useUndoHint()` near the other hooks (before `dispatchGameAction` is defined). In `dispatchGameAction` (~line 424): after the `boardLockedRef` guard, if `action.type !== 'UNDO'` call `noteStreakBreak()`. In `handleUndo` (~line 524): on the failure path call `noteStreakBreak()`; on success (history non-empty; also check `!boardLockedRef.current` and skip counting when `demoPlaybackActiveRef.current` — defensive, see Counting rules) call `noteUndoSuccess()` alongside the dispatch. In `dealNewGame` (~line 380 area) call `noteStreakBreak()`. Pass `onScrubBegin: noteStreakBreak` to `useUndoScrubber`. Add `hintVisible: undoHintVisible` to `undoScrubProps` (~line 816).
- [x] 5. **`useUndoScrubber.ts`:** add optional `onScrubBegin?: () => void` to `UseUndoScrubberOptions`; keep it in a ref (like `handleUndoRef`) and invoke it inside `beginScrubSession` (~line 288). No gesture changes.
- [x] 6. **UI:** create `src/features/klondike/components/UndoHintBubble.tsx` and render it from `UndoScrubber.tsx` inside `styles.container` (sibling of the overlay and `GestureWrapper`); add `hintVisible: boolean` to `UndoScrubberProps`. Styling/animation/a11y per UX section. Extract `UNDO_BUTTON_HEIGHT = 48` constant beside the styles. (Done; bubble also got `testID="undo-hint"` for device testing, and takes a `bottom` prop since the dock offset is computed in `UndoScrubber`.)
- [x] 7. **Unit tests** `test/unit/features/klondike/undoHint.test.ts`: threshold boundaries (lifetime 50 vs 51; streak 9 vs 10), once-ever (`hintShown` blocks re-show), streak break resets progress, counters keep incrementing after hint shown. Optionally a parse-validation test for `undoHintStorage` (mirror `gamePersistence.test.ts` mocking if cheap — skip if kv-store mocking is fiddly, the parse function can be exported and tested pure). (Done — went the pure route: `parseUndoHintState` is exported and tested without kv-store mocking.)
- [x] 8. **Cheap checks:** `yarn typecheck && yarn lint && yarn jest`. (All green — 25 suites, 222 tests.)
- [x] 9. **Device smoke test** (single build, no parallel builds): temporarily lower the two thresholds locally (e.g. lifetime > 0, streak >= 3), `yarn ios` (or `yarn release`), use demo "scrubbed" deal (`app/(tabs)/index.tsx` ~154–158; 40 history / 40 future) or just make a few moves, tap `testID="undo"` 3× → bubble appears above the button with correct copy; verify auto-dismiss ~6s; verify taps still undo while visible; scrub → bubble gone instantly; relaunch app → bubble never reappears. Revert the threshold edits, re-run step 8. (Done 2026-07-07 on iOS simulator — all checks passed; scrub-dismiss skipped on device by design, covered by code path review + unit logic. Screenshots in `.test-artifacts/undo-hint-smoke/`. Thresholds reverted, cheap checks green again.)

## Steps to implement — v2

- [x] 1. **Rework pure logic** `src/features/klondike/undoHint.ts`:
  - Constants: keep `UNDO_HINT_LIFETIME_THRESHOLD = 50` and `UNDO_HINT_COPY`; change `UNDO_HINT_AUTO_DISMISS_MS = 10000`; replace `UNDO_HINT_STREAK_THRESHOLD` with `UNDO_HINT_MAX_SHOWINGS = 3`, `UNDO_HINT_STREAK_STEP = 10`, and `requiredStreakFor(hintsRemaining): number` = `UNDO_HINT_STREAK_STEP * (UNDO_HINT_MAX_SHOWINGS + 1 - hintsRemaining)` → 10/20/30.
  - `type UndoHintTracker = { lifetimeUndoTaps: number; streak: number; hintsRemaining: number; hintShownThisDeal: boolean; scrubConsumedThisDeal: boolean }` (per-deal flags live in the tracker for testability; only `lifetimeUndoTaps` + `hintsRemaining` are persisted).
  - `recordUndoTap(tracker): { tracker; showHint }` — increments lifetime + streak; `showHint` true iff `lifetimeUndoTaps > 50 && hintsRemaining > 0 && streak >= requiredStreakFor(hintsRemaining) && !hintShownThisDeal`; when true, returned tracker has `hintsRemaining - 1` and `hintShownThisDeal: true`.
  - `breakStreak(tracker)` — unchanged semantics (streak → 0, same reference if already 0).
  - `consumeHintForScrub(tracker): { tracker; consumed: boolean }` — decrements `hintsRemaining` and sets `scrubConsumedThisDeal: true` iff `hintsRemaining > 0 && !scrubConsumedThisDeal && !hintShownThisDeal`; otherwise returns the same reference with `consumed: false`.
  - `noteNewDeal(tracker)` — resets `hintShownThisDeal`/`scrubConsumedThisDeal` (and can leave streak to the existing `breakStreak` call).
  - Comments documenting the v2 product reasoning: 10/20/30 escalation (anti-nag), scrub consumption (don't teach existing scrubber users), per-deal dedupe (one heavy scrub session must not burn all 3), restart-resets-deal-flags trade-off.
- [x] 2. **Storage shape** `src/storage/undoHintStorage.ts`: payload becomes `{ lifetimeUndoTaps: number, hintsRemaining: number }`; keep key `soli/undoHint/v1` (feature unshipped — no migration). `parseUndoHintState` validates `lifetimeUndoTaps` (finite number >= 0) and `hintsRemaining` (integer 0–3); anything else — including old `{ hintShown }` rows — falls back to `{ lifetimeUndoTaps: 0, hintsRemaining: 3 }`. Comment why /v1 is kept.
- [x] 3. **Scrub-end detection** `src/features/klondike/hooks/useUndoScrubber.ts`: add optional `onScrubEnd?: (changed: boolean) => void` to `UseUndoScrubberOptions` (kept in a ref like the existing `onScrubBeginRef`, line ~294). Record the session's start index in a new `scrubStartIndexRef` inside `beginScrubSession(pointer)` (~line 297, `pointer` IS the anchor history index) and in `finishScrubSession(finalIndex)` (~line 307) call `onScrubEndRef.current?.(finalIndex !== scrubStartIndexRef.current)`. Both `onEnd` and `onFinalize` route through `finishScrubSession` and are single-fire (guarded by `isScrubbingShared`), so no double-call handling needed. No gesture changes.
- [x] 4. **Hook** `src/features/klondike/hooks/useUndoHint.ts`: seed tracker from new storage shape (per-deal flags start false, streak 0); timer 10s; add `noteScrubEnd(changed: boolean)` (calls `consumeHintForScrub` when `changed`, persists on consumption) and `noteNewDeal()` (resets per-deal flags); persist `{ lifetimeUndoTaps, hintsRemaining }` on tap counting and on consumption. All callbacks stay stable (ref internals).
- [x] 5. **Wiring** `src/features/klondike/hooks/useKlondikeGame.ts`: pass `onScrubEnd: noteScrubEnd` to `useUndoScrubber` (alongside the existing `onScrubBegin: noteStreakBreak`); call `noteNewDeal()` in `dealNewGame` next to the existing `noteStreakBreak()` call. Everything else unchanged.
- [x] 6. **UI** `src/features/klondike/components/UndoHintBubble.tsx`: add the downward caret (border-trick triangle, bubble background color, centered over the Undo button, inside the same `pointerEvents="none"` subtree). Code comments: no X button (pan hitSlop extends 50px above the button — a tappable X there would steal touches from the gesture we're teaching); dismiss-on-scrub-start kept deliberately (overlay fades in over the same area + user is performing the taught gesture).
- [x] 7. **Unit tests** `test/unit/features/klondike/undoHint.test.ts`: update/extend — escalating thresholds 10/20/30 as hints get shown; showing blocked in same deal, allowed in a later deal (`noteNewDeal` between); scrub consumption decrements + raises next threshold; per-deal scrub dedupe (second scrub same deal consumes nothing); no consumption in a deal where a hint was shown; unchanged-index scrub consumes nothing; `hintsRemaining` floor at 0; storage parse fallback for the old v1 `{ hintShown }` shape and invalid values.
- [x] 8. **Cheap checks:** `yarn typecheck && yarn lint && yarn jest`. (All green — 25 suites, 232 tests.)
- [x] 9. **Device smoke test — Android this time** (`yarn release`; agent-device pans natively on Android, so scrub-dismiss AND scrub-consumption are verifiable on device, unlike the iOS v1 smoke). Temporarily lower the lifetime gate to 0 and optionally scale streak thresholds down (e.g. `UNDO_HINT_STREAK_STEP = 3` → 3/6/9). Verify: hint after 3rd consecutive undo (caret visible, copy exact); still undoes while visible; auto-dismiss ~10s; scrub start dismisses instantly; hint #2 requires a NEW deal AND streak 6 (not in the same deal even with streak 6); a successful scrub in a fresh deal (no hint shown) silently consumes one (next hint then needs the higher threshold); a no-move scrub (press-drag back to start) consumes nothing; relaunch persists `hintsRemaining`. Unlock device with `scripts/android-unlock-pattern.sh` if needed. Revert the threshold edits, re-run step 8. (Done 2026-07-07 on the A065 phone — all executed checks passed, see "v2 testing" results; no-move-scrub check skipped (covered by unit test), a11y-label query gap noted in learnings. Thresholds reverted, cheap checks green: 25 suites, 232 tests.)

## Steps to implement — v3 (demo-sheet reset button, 2026-07-07)

(User request; supersedes Follow-up #3's "skip a settings toggle" — the button lives in the dev-only demo sheet instead, which avoids the settings-clutter concern.)

- [x] 1. **`useUndoHint.ts`:** expose `resetUndoHintForTesting()` — resets the live tracker ref (a storage-only write wouldn't affect the running app; the tracker is seeded once at mount) to a **testable** state: `lifetimeUndoTaps = UNDO_HINT_LIFETIME_THRESHOLD + 1` (just past the >50 gate — NOT 0, which would require 51 real undos before anything shows, defeating the button's purpose), `hintsRemaining = 3`, streak + per-deal flags cleared; persists and dismisses any visible bubble. Rationale in a code comment.
- [x] 2. **Plumbing:** `useKlondikeGame` returns it → `KlondikeGameSessionControls` (`KlondikeGameSession.tsx`) → demo sheet handler in `app/(tabs)/index.tsx` (same path as `handleLaunchDemoGame`).
- [x] 3. **UI:** "Reset undo hint" button appended to the demo sheet (same `size="$3"` styling; closes the sheet on press; no confirmation dialog — harmless dev-only action). After pressing: a 10-tap undo streak immediately shows hint 1.
- [x] 4. **Cheap checks:** `yarn typecheck && yarn lint && yarn jest`. (All green — 25 suites, 232 tests; no new unit tests: the reset is a trivial constant assignment, the tracker math is already covered.)

Watch-out for any future device test: the sheet now has 7 buttons — the Android detent previously clipped the 6th at default button sizes (fixed via `size="$3"`); verify the 7th ("Reset undo hint") is visible.

## Steps to implement — v4 (device-review fixes, 2026-07-07)

- [x] 1. **No dismissal on scrub start / other actions:** `noteStreakBreak` in `useUndoHint.ts` no longer calls `dismissUndoHint` (streak still resets; scrub consumption unchanged). `dismissUndoHint` removed from the hook's return value (nothing outside the hook uses it anymore; the reset helper still uses it internally). Decision comment left in `noteStreakBreak`; related comments updated in `useKlondikeGame`, `useUndoScrubber`, and the bubble's zIndex note.
- [x] 2. **Caret seam fix:** caret `bottom: -CARET_SIZE + 1` — 1px overlap into the bubble removes the subpixel hairline seen on device.
- [x] 3. **Copy:** `UNDO_HINT_COPY = 'Tip: Drag the Undo button sideways to time travel through your game'` — "time travel" matches the Play Store listing and avoids the jargon "scrub" (comment added). No test asserted the old copy, so no test changes.
- [x] 4. **Cheap checks:** `yarn typecheck && yarn lint && yarn jest`. (All green — 25 suites, 232 tests.)

## Plan: Files to modify

| File | Change |
|---|---|
| `src/features/klondike/undoHint.ts` | NEW — constants + pure tracker logic |
| `src/storage/undoHintStorage.ts` | NEW — kv-store persistence (`soli/undoHint/v1`) |
| `src/features/klondike/hooks/useUndoHint.ts` | NEW — stateful hook (refs, timer, persistence, a11y announce) |
| `src/features/klondike/hooks/useKlondikeGame.ts` | wire counting/reset calls + `hintVisible` prop |
| `src/features/klondike/hooks/useUndoScrubber.ts` | optional `onScrubBegin` callback in `beginScrubSession` |
| `src/features/klondike/components/UndoHintBubble.tsx` | NEW — presentational bubble |
| `src/features/klondike/components/UndoScrubber.tsx` | render bubble, `hintVisible` prop, `UNDO_BUTTON_HEIGHT` const |
| `test/unit/features/klondike/undoHint.test.ts` | NEW — unit tests |

### v2

| File | Change |
|---|---|
| `src/features/klondike/undoHint.ts` | tracker gains `hintsRemaining` + per-deal flags; `requiredStreakFor()`, `consumeHintForScrub()`, `noteNewDeal()`; 10s constant |
| `src/storage/undoHintStorage.ts` | payload `{ lifetimeUndoTaps, hintsRemaining }`, parse fallback to defaults (incl. old v1 shape); key stays `soli/undoHint/v1` |
| `src/features/klondike/hooks/useUndoHint.ts` | new `noteScrubEnd(changed)` + `noteNewDeal()`; persist on consumption; 10s timer |
| `src/features/klondike/hooks/useUndoScrubber.ts` | optional `onScrubEnd?: (changed: boolean)`; `scrubStartIndexRef` recorded in `beginScrubSession`, compared in `finishScrubSession` |
| `src/features/klondike/hooks/useKlondikeGame.ts` | pass `onScrubEnd`; call `noteNewDeal()` in `dealNewGame` |
| `src/features/klondike/components/UndoHintBubble.tsx` | downward caret; code comments for no-X and dismiss-on-scrub decisions |
| `test/unit/features/klondike/undoHint.test.ts` | extend for v2 scheduling, consumption, per-deal rules, storage fallback |

## Files actually modified

| File | Change |
|---|---|
| `src/features/klondike/undoHint.ts` | NEW — constants + pure tracker logic (`recordUndoTap`, `breakStreak`) |
| `src/storage/undoHintStorage.ts` | NEW — kv-store persistence (`soli/undoHint/v1`); `parseUndoHintState` exported for pure testing |
| `src/features/klondike/hooks/useUndoHint.ts` | NEW — tracker ref, persistence, 6s auto-dismiss timer, a11y announce; all callbacks stable |
| `src/features/klondike/hooks/useKlondikeGame.ts` | streak break in `dispatchGameAction` (non-UNDO), `dealNewGame`, failed undo; counting in `handleUndo` (with board-locked mirror guard + defensive demo check); `onScrubBegin` passed to `useUndoScrubber`; `hintVisible` in `undoScrubProps` |
| `src/features/klondike/hooks/useUndoScrubber.ts` | optional `onScrubBegin` option, kept in a ref (like `handleUndoRef`), invoked in `beginScrubSession` |
| `src/features/klondike/components/UndoHintBubble.tsx` | NEW — presentational bubble (`visible`, `bottom` props), `testID="undo-hint"` |
| `src/features/klondike/components/UndoScrubber.tsx` | render bubble, `hintVisible` prop, `UNDO_BUTTON_HEIGHT = 48` const |
| `test/unit/features/klondike/undoHint.test.ts` | NEW — 12 tests: thresholds, once-ever, streak break, post-hint counting, storage parsing |

### v2 (2026-07-07)

| File | Change |
|---|---|
| `src/features/klondike/undoHint.ts` | tracker gains `hintsRemaining` + per-deal flags; `requiredStreakFor()` (10/20/30), `consumeHintForScrub()`, `noteNewDeal()`; `UNDO_HINT_AUTO_DISMISS_MS = 10000`; v2 product-reasoning comments |
| `src/storage/undoHintStorage.ts` | payload `{ lifetimeUndoTaps, hintsRemaining }` (0–3 validated); old v1 `{ hintShown }` rows fall back to defaults; key stays `soli/undoHint/v1` (comment explains why) |
| `src/features/klondike/hooks/useUndoHint.ts` | seeds v2 tracker; `noteScrubEnd(changed)` + `noteNewDeal()`; shared `persistTracker` helper (persists on tap AND on consumption); 10s timer; scrub-dismiss trade-off comment moved here (dismissal site) |
| `src/features/klondike/hooks/useUndoScrubber.ts` | optional `onScrubEnd?: (changed: boolean)` in a ref; `scrubStartIndexRef` set in `beginScrubSession`, compared in `finishScrubSession` |
| `src/features/klondike/hooks/useKlondikeGame.ts` | `onScrubEnd: noteScrubEnd` passed to scrubber; `noteNewDeal()` in `dealNewGame` |
| `src/features/klondike/components/UndoHintBubble.tsx` | downward caret (border-trick triangle at the Undo button's center, `right: 25%` of a full-dock-width layer); no-X comment; still one `pointerEvents="none"` subtree |
| `test/unit/features/klondike/undoHint.test.ts` | extended to 22 tests: escalation 10/20/30, per-deal hint dedupe, scrub consumption (+ per-deal dedupe, same-deal-hint guard, floor at 0, threshold raise), `noteNewDeal`, storage fallback incl. old shape |

### v3 (2026-07-07)

| File | Change |
|---|---|
| `src/features/klondike/hooks/useUndoHint.ts` | new `resetUndoHintForTesting()` (testable state: lifetime 51, hintsRemaining 3, flags/streak cleared; persists + dismisses) |
| `src/features/klondike/hooks/useKlondikeGame.ts` | returns `resetUndoHintForTesting` in `UseKlondikeGameResult` |
| `src/features/klondike/components/KlondikeGameSession.tsx` | `resetUndoHintForTesting` added to `KlondikeGameSessionControls` |
| `app/(tabs)/index.tsx` | "Reset undo hint" button in the demo sheet (`onResetUndoHint` prop, closes sheet on press) |

### v4 (2026-07-07)

| File | Change |
|---|---|
| `src/features/klondike/hooks/useUndoHint.ts` | `noteStreakBreak` no longer dismisses the hint (decision comment); `dismissUndoHint` now internal-only |
| `src/features/klondike/undoHint.ts` | copy → "…time travel through your game" (Play Store wording, comment) |
| `src/features/klondike/components/UndoHintBubble.tsx` | caret overlaps bubble by 1px (seam fix); zIndex comment updated (hint stays during scrub) |
| `src/features/klondike/hooks/useKlondikeGame.ts` | `onScrubBegin` comment updated (streak break only, no dismissal) |
| `src/features/klondike/hooks/useUndoScrubber.ts` | `onScrubBegin` doc comment updated |

## Intermediary learnings

- Device smoke test (2026-07-07): to get a clean `hintShown=false` state on the simulator, `xcrun simctl uninstall` + reinstall of the built `Soli.app` (from DerivedData) works well — the kv row lives in the app data container and is wiped with it. The app auto-draws one card on a fresh deal (stock starts at 23, waste 1), useful as a baseline when counting draws/undos via a11y labels.
- The hint bubble is fully visible to the a11y tree on iOS (`id="undo-hint"`, text readable via `get text`) — agent-device can assert presence, copy, and absence without screenshots.
- `handleUndo` previously did NOT check `boardLockedRef` itself (it relied on `dispatchGameAction` dropping the action silently). For correct counting the guard is now mirrored in `handleUndo`; behavior is unchanged (`notifyInvalidMove` still only fires for empty history, matching the old flow where a locked `notifyInvalidMove` no-ops anyway).
- `UndoHintBubble` takes a `bottom` prop rather than computing the dock offset itself — `UndoScrubber` already has `bottomDockOffset` and the `UNDO_BUTTON_HEIGHT` constant lives beside its styles.
- Repo test layout confirmed as `test/unit/<area>/...` with plain relative imports; no kv-store mocking needed since `parseUndoHintState` is exported and tested pure.
- Added `testID="undo-hint"` to the bubble (not in the original plan) so the device smoke test agent can locate it on iOS.
- v2: `undoHintStorage.ts` now imports `UNDO_HINT_MAX_SHOWINGS` from `features/klondike/undoHint.ts` (storage → features direction). No cycle — the pure module imports nothing from storage — and it avoids duplicating the "3" constant.
- v2 caret positioning: the bubble was wrapped in a full-dock-width absolute layer so the caret can use `right: '25%'` (the Undo button fills the right 50% of the dock, so its center is 25% from the right edge). The caret hangs `CARET_SIZE` (6px) below the bubble, leaving ~2px of the original 8px gap above the button.
- v2 scrub-end plumbing: `finishScrubSession` is the single exit point for both `onEnd` and `onFinalize` (both guarded by `isScrubbingShared`), so `onScrubEnd` fires exactly once per session with no extra dedupe logic.
- v2 Android smoke (2026-07-07): the hint bubble is NOT queryable via a11y label on Android (`is visible 'label="Tip: …"'` never matched even with the bubble on screen) — unlike iOS, where testID/`get text` worked. Screenshots were the evidence instead. Likely the `accessible` Animated.View isn't surfaced to uiautomator-based queries; TalkBack users are covered separately by `announceForAccessibility`. If automated Android assertions on the bubble are ever needed, investigate exposing it (e.g. `importantForAccessibility="yes"`) — not done now to avoid touching shipped a11y behavior for a test-only need.
- v2 Android smoke: deals whose first draws contain an ace can break the undo streak mid-test — auto-up plays the ace via the auto-queue through `dispatchGameAction`, which (correctly, by design) resets the streak. One test run "failed" this way before being recognized as expected product behavior; retried on an ace-free draw sequence.
- v2 Android smoke: `yarn release` left the phone with the lowered-threshold test build and consumed hint state — rebuild + `pm clear` before manual testing of the real 50/10/20/30 behavior.

## Identified issues

None — v1 iOS smoke (step 9) and v2 Android smoke (v2 step 9) both found no bugs; no feature-code changes were needed. Minor observation (not a bug): the bubble's a11y label isn't queryable by Android automation tooling (see Intermediary learnings).

## Testing

1. `yarn typecheck && yarn lint && yarn jest` (new `undoHint.test.ts` must pass).
2. Unit coverage: threshold boundary cases, once-ever behavior, streak resets, post-hint counting.
3. Device smoke (steps in "Steps to implement" #9): one build only, temporarily lowered thresholds, verify show → readable copy → non-blocking touches → auto-dismiss → scrub-dismiss → persistence across relaunch. Revert threshold edits afterwards and re-run cheap checks.
   **Results (2026-07-07, iPhone simulator, Release build via `yarn ios`, thresholds temporarily lifetime>0 / streak>=3):**
   - Fresh-install state (simctl uninstall + reinstall): no hint before trigger — PASS
   - Hint appears after 3rd consecutive undo tap — PASS (`.test-artifacts/undo-hint-smoke/04-fresh-hint-visible.png`)
   - Copy exact: "Tip: Drag the Undo button sideways to scrub through your moves" (via `get text 'id="undo-hint"'`) — PASS
   - Non-blocking: 4th undo tap while hint visible still undid (stock returned to baseline 23) and hint stayed visible — PASS
   - Auto-dismiss after ~6s — PASS (verified twice; `05-fresh-auto-dismissed.png`)
   - Once-ever in session: 4 more draws + 4 undos → no hint — PASS (`06-once-ever-no-hint.png`)
   - Persistence: simctl terminate + relaunch, rebuild history, 4 undos → no hint — PASS (`07-relaunch-no-hint.png`)
   - Scrub-dismiss on device: SKIPPED by design — agent-device can't pan on iOS and `hintShown` is already persisted at that point; covered by code review (`onScrubBegin` → `noteStreakBreak` → `dismissUndoHint`) and unit tests.
   - Thresholds reverted to 50/10; `yarn typecheck && yarn lint && yarn jest` green (25 suites, 222 tests).
4. Plausibility checks that need no build: timer ticks must not reset the streak (guaranteed structurally — `TIMER_*` bypasses `dispatchGameAction`); demo playback must not trigger the hint (demo undos bypass `handleUndo`).
5. Not worth testing on device: exact 50/10 thresholds (unit-tested), frame-by-frame animation review (per AGENTS.md testing guidance — ask Karim if the bubble looks right instead).

### v2 testing

1. `yarn typecheck && yarn lint && yarn jest` with the extended `undoHint.test.ts` (escalating thresholds, per-deal rules, scrub consumption + dedupe, storage fallback for the old shape).
2. Device smoke on **Android** (`yarn release`), per "Steps to implement — v2" #9 — chosen over iOS because agent-device pans natively on Android, so scrub-dismiss and scrub-consumption CAN be verified on device this time (they were skipped in the v1 iOS smoke). Clean state via app uninstall/reinstall or clearing app data. One build only; temporarily lowered gates (lifetime 0, streak step 3), reverted after with cheap checks re-run.
   **Results (2026-07-07, physical A065 phone over Wi-Fi adb, Release build via `yarn release`, thresholds temporarily lifetime>0 / streaks 3/6/9; screenshots in `.test-artifacts/undo-hint-smoke-v2/`):**
   - (a) Hint 1 after 3rd consecutive undo on fresh data (`pm clear`), bubble + caret above Undo button, copy exact — PASS (`check-a-hint1.png`)
   - (b) 10s auto-dismiss: visible at t≈0 and t≈7-8s, gone at t≈11-12s — PASS (`check-b-t0.png`, `check-b-t7.png`, `check-b-t11.png`)
   - (c) Same-deal suppression: 6-streak in the same deal after hint 1 → no hint — PASS (`check-c-same-deal.png`)
   - (d) Hint 2 in a NEW deal: no hint at 5-streak, hint at 6-streak — PASS (`check-d-hint2.png`)
   - (e) Scrub-start dismisses the visible bubble instantly (~4s into the 10s window, so unambiguous) — PASS (`check-e-before-scrub.png` / `check-e-after-scrub.png`)
   - (f) Scrub consumption: fresh data, successful pan-scrub with NO hint ever shown → in a new deal 3-streak shows nothing, 6-streak shows the hint (threshold escalated 3→6) — PASS (`check-f-no-hint-at-3.png` / `check-f-hint-at-6.png`)
   - (g) Exhaustion: after all 3 consumed, new deal + 9-streak → nothing — PASS (`check-g-exhausted.png`)
   - Persistence: app relaunch kept `hintsRemaining` (new deal + 6-streak → hint; weak-form check, storage parsing also unit-tested and the same kv row was persistence-tested in the v1 iOS smoke) — PASS (`check-persist-hint2-after-relaunch.png`)
   - Hint 3 at 9-streak also observed (`check-e-hint3.png`) — full 3/6/9 escalation seen on device.
   - No-move scrub (release at start index consumes nothing): SKIPPED on device — hard to do deterministically with an injected pan; covered by the `consumeHintForScrub`/`onScrubEnd(changed=false)` unit tests.
   - Non-blocking touches: not re-verified explicitly on Android — the tap-through-while-visible case was verified in the v1 iOS smoke, the bubble is `pointerEvents="none"` structurally, and the scrub pan in check (e) started from the Undo button while the bubble was visible and worked (which is the touch that matters most here).
3. Not worth testing on device: exact 10/20/30 values (unit-tested); caret pixel-alignment (screenshot + ask Karim if it looks right instead of iterating).

## Follow-ups

1. **Re-show logic if the user still never scrubs** — ~~skip now~~ DONE in v2 (3 showings with 10/20/30 escalation + scrub consumption).
2. **General hint/coach-mark primitive** — if we ever add a second hint (e.g. auto-up, draw-3), extract `UndoHintBubble` into `components/` as a shared `HintBubble`. Pro: reuse. Con: premature abstraction for one call site today. Recommendation: wait for the second use case.
3. **Settings toggle "Reset hints"** — ~~skip~~ SUPERSEDED by v3 (2026-07-07): a "Reset undo hint" button now lives in the dev-only demo sheet instead of settings, which avoids the settings-clutter concern while giving easy manual re-testing. It resets to a testable state (lifetime 51, 3 hints), not a fresh-install one.
