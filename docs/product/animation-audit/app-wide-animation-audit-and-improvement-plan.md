# Animation Audit App-Wide Animation Audit and Improvement Plan

## User prompt

```text
Hey, I've got a question about the iOS scrubber mechanism. We used to have different versions here for iOS and Android because the animations had issues with the scrubber or with the gesture. First of all, please find the documentation for this and tell me if we've accidentally also directly solved this so we can implement like the full nice Android animations again there. Please give me for now just a full analysis on this and a recommendation if we can also simplify so we have the same thing. And also the animation was a bit nicer on Android. Maybe we can even take that as an improvement as well. Meanwhile, I am testing your previous update just now. Thank you.
```

```text
I quickly tested on the iOS simulator, and the scoreboard looks good, it looks stable, it doesn't abort anything. So it looks really good, I'm really happy with that. Thank you very much. Please implement your recommendations now to further cleanup. Thank you very much.
```

```text
Continue
```

> Follow-up note (2026-06-15): the custom app-wide system reduced-motion policy added
> during this audit was later removed by product decision. Soli now uses its in-app
> animation toggles instead of globally suppressing motion from the OS/browser preference.
> See
> `docs/product/refresh-rate-setting-removal/remove-refresh-rate-setting.md`.

## Description

Audit the entire animation surface area in the app, compare the current implementation against current React Native / Reanimated / Gesture Handler guidance, and propose concrete improvements for performance, code simplicity, layering correctness, accessibility, and maintainability.

Current animation surface area reviewed:

- Klondike card flights, flips, waste fan slide, invalid-move wiggle, foundation glow, win celebration, and undo scrubber.
- Navigation and modal/sheet/toast motion.
- Supporting animation settings and platform configuration.

This follow-up finishes the undo-scrubber unification made possible by the permanent
absolute card layer. It removes stale iOS-workaround plumbing and lets the shared UI-thread
gesture state drive one polished overlay/button transition on both platforms.

## Framing context

The documented iOS cancellation was caused by the old pile-local `CardView` architecture:
rapid scrub previews triggered an `onLayout -> measure -> shared-value` storm. The absolute
card layer removed that measurement architecture, and the current scrubber already runs pan
math and thumb/track updates on the UI thread. The user has now manually confirmed that the
current unified card animations remain stable in the iOS simulator.

## Acceptance Criteria

- Every animation path in the shipped app is identified and grouped by system responsibility.
- The audit calls out concrete code-level risks with file references.
- Recommendations are prioritized by ROI and implementation risk, not just listed.
- Online guidance comes from primary sources where possible.
- The output distinguishes:
  - keep as-is,
  - simplify,
  - optimize soon,
  - investigate later.
- A phased implementation plan exists so follow-up work can be split into small tasks.
- iOS and Android use the same scrubber gesture and animation implementation.
- The overlay appears above the dimmed Undo button without becoming a touch target.
- Overlay reveal and button dimming are driven directly by shared UI-thread state.
- Board preview animations continue during scrubbing.
- Obsolete props and no-op gesture relations are removed; the remaining Android-only positive
  gesture hit slop is explicit and retains the previously shipped target expansion.

## Design links

- No dedicated design file for this audit.
- Existing internal references:
  - `docs/delivery/26/animation-layering-research.md`
  - `docs/performance-improvements-react19-check-2026-03-03.md`
  - `docs/product/auto-up-win-handoff/28-2-end-of-auto-up-jitter.md`

## Possible approaches incl. pros and cons

### 1. Incremental optimization on top of the current architecture

- Pros:
  - Lowest migration risk.
  - Preserves the current board behavior and timing feel.
  - Lets us land improvements in small PRs.
- Cons:
  - Leaves some architecture debt in place.
  - Card-flight measurement and per-card animation state stay fairly complex.

### 2. Refactor flights into a dedicated overlay host

- Pros:
  - Solves current stacking-context fragility.
  - Makes layering logic easier to reason about.
  - Pairs well with reducing hidden in-pile animation work.
- Cons:
  - Medium/high migration cost.
  - Requires coordinate conversion and source-card hiding rules.

### 3. Broader animation-system simplification

- Pros:
  - Can remove duplicated timing/state patterns across cards, celebration, and scrubber.
  - Makes future tuning safer.
- Cons:
  - Easy to over-scope.
  - Should happen only after the main hotspots are fixed.

### Recommendation

- Use approach 1 immediately.
- Start approach 2 for card flights once the hot-path cleanup lands.
- Use approach 3 only where it naturally falls out of the earlier refactors.

### Undo scrubber follow-up: shared UI-thread presentation

- Pros:
  - Uses the already-proven unified gesture and absolute-card architecture.
  - Removes the JS render hop from overlay visibility and button dimming.
  - Restores the stronger Android-style visual treatment on iOS without another platform branch.
  - Deletes compatibility code that no longer changes behavior.
- Cons:
  - Raising the overlay above the gesture target must be regression-tested on iOS because the old
    pile-local architecture once made that layering unstable.

Recommendation: implement one shared presentation. Keep the gesture target memoized and native,
keep the overlay `pointerEvents="none"`, and use the existing shared scrubbing value for a short
opacity/scale transition.

## Open questions to the user incl. recommendations (if any)

- Should win celebrations stay as visually rich as they are today on lower-end devices?
  - Recommendation: keep the premium version as default, but add a lower-cost mode triggered by reduced-motion or weaker devices.
- Do we want to keep the current scrubber behavior optimized for iOS stability even if it means JS-thread gesture callbacks?
  - Recommendation: keep the current workaround short term, but revisit after reducing board churn and gesture conflicts.
- Are card-flight visuals more important than absolute code simplicity?
  - Recommendation: yes. Preserve flights, but simplify the measurement + layering architecture around them.
- Resolved: the user manually verified the unified scrubber and animated board previews on the iOS
  simulator, so proceed with the shared overlay polish and cleanup.

## New dependencies

- None recommended for the first pass.
- Optional later investigation only:
  - `@tamagui/portal` or existing Tamagui portal primitives if we formalize a flight overlay host.
  - `@shopify/react-native-skia` only if we eventually decide the celebration should become a particle/canvas effect instead of many animated card views.

No new dependency is needed for the scrubber follow-up. It uses the installed Reanimated and
Gesture Handler APIs:

- Reanimated worklets: https://docs.swmansion.com/react-native-reanimated/docs/guides/worklets/
- Gesture Handler/Reanimated integration: https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/reanimated-interactions/
- Gesture composition: https://docs.swmansion.com/react-native-gesture-handler/docs/2.x/fundamentals/gesture-composition/

## UX/UI Considerations

- Preserve the current quick, tactile feel of manual card movement.
- Avoid regressing the “settle before celebration” handoff that was explicitly tuned in prior work.
- Respect system reduced-motion preferences instead of relying only on in-app toggles.
- Keep animation timing consistent enough that undo, draw, auto-play, and celebration feel like one system.
- Avoid abrupt disappear/reappear behavior when cleaning up cards or empty outlines.
- Keep the overlay touch-transparent even when it is visually above the Undo control.
- Use a short, restrained opacity/scale transition rather than adding spring or layout motion.

## Components

### Reuse

- `CardView` / `CardVisual`
- `useCardAnimations`
- `useFoundationGlowAnimation`
- `useCelebrationController`
- `useUndoScrubber`
- `CurrentToast`
- History `Sheet`
- Existing `isScrubbingShared`, `Gesture.Exclusive`, and memoized native gesture target.

### Create

- A board-level flight overlay host for cross-pile card flights.
- A shared animation config module for naming timings, durations, and motion policies.
- A reduced-motion adapter that maps system preference + in-app settings into one motion policy.

## How to fetch data, how to cache

- No remote data fetching is involved.
- For profiling and validation:
  - Use release/dev-build measurements rather than Expo web or debug mode for animation conclusions.
  - Cache only the minimum layout data required for flights; avoid mirroring large snapshot maps on every layout event unless the value actually changed.

The scrubber uses no fetched or cached data. History/future state remains reducer-owned; shared
values only mirror the current gesture position and active state for UI-thread presentation.

## Related tasks

- `docs/delivery/14/14-5.md`
- `docs/delivery/26/26-1.md`
- `docs/delivery/26/26-2.md`
- `docs/product/auto-up-win-handoff/28-2-end-of-auto-up-jitter.md`
- `docs/product/game-history-performance/many-games-slowdown-investigation.md`
- `docs/performance-improvements-react19-check-2026-03-03.md`
- `docs/delivery/20/20-6.md`
- `docs/product/game-history-performance/absolute-card-layer-animation-architecture.md`

## Simplification ideas

- Remove `boardLocked` from `UndoScrubberProps`; the gesture hook already owns enablement.
- Remove empty `simultaneousWithExternalGesture()` and `requireExternalGestureToFail()` calls;
  without gesture arguments they add no relations.
- Keep positive hit slop on the Gesture Handler recognizer. In this hierarchy, moving `hitSlop` to
  the attached `Animated.View` did not enlarge the iOS pan/tap target during device testing. The
  positive gesture expansion therefore remains an Android enhancement while iOS keeps the visible
  48pt target.
- Keep RAF coalescing and `startTransition` for reducer commits; consider the extra `setTimeout(0)`
  separately only after native profiling.
- Keep the memo boundary around the native gesture target so board preview commits do not update it.

## Steps to implement and status of these steps

- [completed] Audit the animation surface area and document the current architecture.
- [completed] Review current React Native / Reanimated / Gesture Handler best practices from primary sources.
- [completed] Add memo boundaries around heavy pure animation consumers (`TopRow`, `TableauSection`, `CardView` subtree entry points) while React Compiler is off.
- [completed] Reduce hidden mounted animation work in stock and foundation piles.
- [completed] Restore keyed remount behavior for the top stock card so every newly exposed draw card records a fresh stock snapshot before it can be drawn.
- [completed] Stop broad object-spread writes in the flight snapshot registry hot path.
- [completed] Replace polling-style readiness / measurement loops with narrower invalidation and bounded retry paths.
- [completed] Dedupe delayed flight-gated actions and drop stale queued work when the originating card identities no longer match the live board.
- [completed] Respect system reduced-motion across gameplay motion policy, toast motion, history sheet behavior, and stack navigation.
- [completed] Reduce JS-thread persistence churn caused by timer-only writes during active games.
- [completed] Re-measure mounted cards when layout tracking is re-enabled after iOS scrubbing so post-scrub flights have fresh origins again.
- [pending] Move cross-pile flights into a dedicated overlay host.
- [completed] Degrade celebration-related work gracefully for reduced-motion users and stop redundant glow work once celebration takes over.
- [pending] Reduce celebration per-frame math further for lower-end devices that still keep celebrations enabled.
- [completed] Move undo scrubber pan tracking and overlay visuals back toward UI-thread handling while keeping reducer commits as coarse JS-boundary work.
- [pending] Validate Reanimated static feature flags in a native dev build.
- [completed] Reassess the old iOS scrubber workaround after the absolute-card-layer migration.
- [completed-via-user] Verify that unified animated board previews do not cancel iOS simulator scrubbing.
- [completed] Drive the scrubber reveal/button dim from shared UI-thread state and restore the
  touch-transparent overlay above the button on both platforms.
- [completed] Remove stale scrubber props and no-op gesture relations; retain Gesture Handler hit
  slop after device testing showed that moving it to the attached view silently removed Android's
  expanded native gesture target.
- [completed] Run static checks and fresh native iOS/Android scrubber verification; retain the
  user's successful manual iOS scrub as the gesture assertion because the automation runner could
  tap the same coordinate but did not reliably activate the composed pan gesture.

## Plan: Files to modify

- `src/features/klondike/components/cards/animations.ts`
- `src/animation/flightController.ts`
- `src/features/klondike/components/cards/CardView.tsx`
- `src/features/klondike/components/cards/FoundationPile.tsx`
- `src/features/klondike/components/cards/StockStack.tsx`
- `src/features/klondike/components/cards/WasteFan.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/hooks/useCelebrationController.ts`
- `src/features/klondike/hooks/useUndoScrubber.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/state/settings.tsx`
- `components/CurrentToast.tsx`
- `app/history.tsx`
- `package.json` (only if testing Reanimated static feature flags)
- `src/features/klondike/components/UndoScrubber.tsx`
- `docs/product/animation-audit/app-wide-animation-audit-and-improvement-plan.md`

## Files actually modified

- `app/_layout.tsx`
- `app/history.tsx`
- `app/settings.tsx`
- `components/CurrentToast.tsx`
- `src/animation/flightController.ts`
- `src/features/klondike/components/UndoScrubber.tsx`
- `src/features/klondike/components/cards/animations.ts`
- `src/features/klondike/components/cards/CardView.tsx`
- `src/features/klondike/components/cards/FoundationPile.tsx`
- `src/features/klondike/components/cards/StockStack.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/hooks/useUndoScrubber.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/state/settings.tsx`
- `docs/product/animation-audit/app-wide-animation-audit-and-improvement-plan.md`

## Intermediary learnings

- The absolute card layer had already made the old `Platform.OS === 'ios'` scrub animation
  exception dead; cleanup commit `5125a53` only removed the obsolete prop plumbing.
- The current Gesture Handler implementation accepts empty relation argument lists, but the
  installed source loops over those lists, so `simultaneousWithExternalGesture()` and
  `requireExternalGestureToFail()` without arguments were no-ops.
- Gesture Handler documents positive gesture hit slop as Android-specific. Moving the same hit
  area to the attached native view preserves the intended target expansion on both platforms.
- `isScrubbingShared` already changed synchronously inside the pan worklet. Returning that shared
  value to the component removes the delayed React-state hop for overlay visibility and button
  dimming without introducing another animation state.
- `Animated.View.hitSlop` on this detector child did not expand the target in the iOS simulator.
  Keep the recognizer's own hit slop so Android does not regress; Gesture Handler documents
  positive gesture expansion as Android-only, and iOS retains a 48pt control.

## Identified issues and status of these issues

### High priority

- Card-flight layering is still structurally fragile because flights stay inside pile wrappers.
  - Status: known, not fixed in this audit.
- Custom `React.memo` comparators on interactive card surfaces regressed correctness by letting stale press handlers survive state changes.
  - Status: fixed in follow-up by removing the comparator-based memoization from `CardView`, `TopRow`, and `TableauSection`.
- Hidden cards in stock/foundation still mount full `CardView` animation state even when visually hidden.
  - Status: fixed first pass by rendering only the top stock card and only the top foundation card outside celebration mode.
- The top-only stock optimization initially dropped the per-card `key`, which meant newly exposed stock cards reused the previous `CardView` instance and could skip `onLayout`/snapshot registration.
  - Status: fixed in follow-up by keying the visible stock-card wrapper with `topCard.id`, preserving the lighter render path without breaking repeated draw flights.
- The bounded pending-dispatch queue introduced in the flight controller could accumulate duplicate delayed actions and later replay them against a changed board state.
  - Status: fixed in follow-up by adding pending-action dedupe keys plus board-state validation before delayed dispatches are allowed to run.
- Card snapshot registry updates use broad object spreads inside a hot path.
  - Status: fixed first pass in the controller seed path and narrowed further in card measurement callbacks.
- Whole-board churn still affects animation smoothness because timer/persistence/render pressure sits close to gameplay updates.
  - Status: partially improved via memo boundaries and debounced persistence writes that skip timer-only ticks while the timer is already running.

### Medium priority

- Celebration worklet math is heavy for a long-running, many-card animation.
  - Status: partially mitigated by honoring system reduced-motion and stopping foundation glow once celebration takes over; deeper simplification still pending.
- The lighter top-only foundation rendering regressed celebration visibility because non-top cards could remount with remembered flight snapshots and stay at `opacity: 0` unless they also got a celebration-time layout pass.
  - Status: fixed in follow-up by re-enabling layout tracking for all foundation cards while celebration is active.
- Remembered flight snapshots could still hide cards that mount with layout tracking intentionally disabled, because `useCardAnimations` initialized them at `opacity: 0` without a recovery path.
  - Status: fixed in follow-up by making the shared card hook render those mounts in-place and reset any inherited flight opacity/offset state when layout tracking is off.
- Undo scrubber depended on JS-thread gesture callbacks for stability, which kept the hottest scrub path off the UI thread.
  - Status: improved in follow-up by moving pan index math and overlay thumb/track visuals onto shared values/worklets, while keeping `SCRUB_TO_INDEX` reducer commits coalesced on JS.
- The iOS scrubber reset path clears flight snapshots on scrub start, but unchanged mounted cards do not automatically re-measure when scrubbing ends.
  - Status: fixed in follow-up by triggering one shared-hook re-measure when layout tracking is re-enabled after scrubbing.
- Reduced-motion is controlled only by in-app settings, not by system accessibility preference.
  - Status: fixed for gameplay motion policy, toast motion, history sheet behavior, and stack navigation.
- Motion configuration is spread across several files and patterns.
  - Status: partially improved by routing more surfaces through the shared reduced-motion preference, but not yet centralized into a single motion config module.

### Low priority

- Toast and history sheet animations are fine functionally, but they are not yet tied into a shared motion policy.
  - Status: fixed.
- Navigation transitions are default/native and not a current bottleneck.
  - Status: still native/default, now reduced-motion aware.

## Testing

- Final scrubber-cleanup validation on June 29, 2026:
  - `yarn format`, `yarn typecheck`, `yarn lint`, `yarn format:check`, and `git diff --check` passed.
  - `yarn jest --runInBand` passed all 11 suites and 56 tests.
  - A final `yarn release` completed successfully in 30 seconds (642 Gradle tasks), installed the
    release APK on physical Android device `A065`, and launched `ch.karimattia.soli`.
  - On that Android release, four Draw actions updated the waste/stock, a normal Undo restored the
    prior waste/stock state, and no fatal/error/exception/crash appeared in the captured app logs.
  - The Android pan injector reported a successful horizontal pan over Undo, but its post-gesture
    state was not captured before the tester stopped, so this is recorded as attempted rather than
    a behavioral pass.
  - `npx expo run:ios -d 'iPhone 17 Pro' --no-build-cache` performed a clean build with zero errors,
    installed the final source on the simulator, and opened the app.
  - On that final iOS build, a coordinate Undo tap restored the initial draw state: stock changed
    from 22 to 23 and the waste card was removed; the app stayed responsive.
  - Automated iOS taps reliably hit the Undo control, but the same runner did not reliably activate
    the composed pan. The user's successful manual iOS scrub test therefore remains the conclusive
    gesture/cancellation check for this follow-up.
  - Device testing disproved the attempted `Animated.View.hitSlop` move in this hierarchy. The final
    code keeps Gesture Handler's own positive Android expansion and the existing 48pt iOS control.

- Validation completed in this pass:
  - `yarn typecheck:fallback`
  - `yarn lint`
  - `oxfmt` on the files modified for this task
- Native/device validation completed in this follow-up:
  - `yarn release` completed successfully on April 1, 2026 and produced a fresh Android release APK.
  - Installed the fresh release APK on `emulator-5554` and launched the app against Metro.
  - Verified manual draw behavior on the release build after the queue/hook fixes.
  - Verified the demo auto-solve flow reached win celebration, and the live celebration showed mixed ranks instead of the earlier kings-only regression.
- Native/device validation completed in this scrubber follow-up:
  - `npx expo run:ios -d 'iPhone 17 Pro' --no-build-cache` completed successfully on April 1, 2026 and installed a fresh debug build on the booted simulator.
  - Verified the iOS scrubber on the fresh build with a real long swipe over `Undo`; the board rewound from multiple drawn cards back to the far-left timeline state, and a normal `Draw` still worked immediately afterward.
  - `yarn release` completed successfully again on April 1, 2026.
  - Installed the fresh release APK on physical device `A065` and confirmed the app opened there.
  - Installed the same fresh release APK on `emulator-5554`, verified a long swipe over the real `Undo` bounds rewound the board back to the far-left timeline state, and verified `Draw` still worked after the scrub.
- Native/device validation still pending:
  - iOS simulator/device: repeatable automated scrub-gesture verification with a hittable `Undo` accessibility node. The current runner still reports the button as non-hittable, so the iOS assertion relies on coordinate-driven interaction instead of direct element taps.
  - Android physical device: deeper accessibility-driven scrub assertions. The fresh release install opened correctly on `A065`, but the automation snapshot returned no accessible nodes there, so the detailed gesture verification was completed on the freshly installed emulator build instead.
  - iOS simulator/device: recycle, tableau-to-foundation, auto-complete, and win celebration on the latest scrubber follow-up build.
  - Verify card layering mid-flight against HUD, scrubber, and celebration blocker.
  - Verify reduced-motion behavior with the OS accessibility setting enabled.
  - Validate any Reanimated static feature flag changes only after a full native rebuild.

## Audit Summary

### Keep as-is

- Transform/opacity-based motion choices are generally good.
- The app already has the correct Reanimated Babel setup and iOS 120fps flag.
- Card flip, waste fan, glow, and empty-slot cleanup are conceptually sound.

### Optimize soon

- Reduce hidden animated nodes.
- Add memo boundaries to heavy pure board subtrees while React Compiler is off.
- Stop copying large snapshot maps in flight hot paths.
- Reduce JS-thread work that competes with animation: timer-wide rerenders and persistence writes.

### Simplify

- Separate “measurement / flight orchestration” from “card visual rendering” more clearly.
- Unify motion policy across app/game/system reduced-motion.
- Consolidate animation constants and naming into one small vocabulary.

### Investigate later

- Reanimated static feature flags:
  - `IOS_SYNCHRONOUSLY_UPDATE_UI_PROPS`
  - `ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS`
  - `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS`
  - `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS`
- React Compiler rollout after the architecture hotspots are reduced.

## External references used for this audit

- React Native Performance Overview: `https://reactnative.dev/docs/performance`
- React Native LayoutAnimation: `https://reactnative.dev/docs/layoutanimation`
- React Native AccessibilityInfo: `https://reactnative.dev/docs/accessibilityinfo`
- Expo Reanimated docs (bundled version / setup): `https://docs.expo.dev/versions/latest/sdk/reanimated/`
- Reanimated Performance guide: `https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/`
- Reanimated measure API: `https://docs.swmansion.com/react-native-reanimated/docs/advanced/measure/`
- React Native Gesture Handler Gesture docs: `https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/gesture/`
- React Native Gesture Handler Pan gesture docs: `https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/pan-gesture/`
