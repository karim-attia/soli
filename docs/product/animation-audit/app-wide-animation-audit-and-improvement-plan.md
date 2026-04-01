# Animation Audit App-Wide Animation Audit and Improvement Plan

## Description

Audit the entire animation surface area in the app, compare the current implementation against current React Native / Reanimated / Gesture Handler guidance, and propose concrete improvements for performance, code simplicity, layering correctness, accessibility, and maintainability.

Current animation surface area reviewed:

- Klondike card flights, flips, waste fan slide, invalid-move wiggle, foundation glow, win celebration, and undo scrubber.
- Navigation and modal/sheet/toast motion.
- Supporting animation settings and platform configuration.

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

## Open questions to the user incl. recommendations (if any)

- Should win celebrations stay as visually rich as they are today on lower-end devices?
  - Recommendation: keep the premium version as default, but add a lower-cost mode triggered by reduced-motion or weaker devices.
- Do we want to keep the current scrubber behavior optimized for iOS stability even if it means JS-thread gesture callbacks?
  - Recommendation: keep the current workaround short term, but revisit after reducing board churn and gesture conflicts.
- Are card-flight visuals more important than absolute code simplicity?
  - Recommendation: yes. Preserve flights, but simplify the measurement + layering architecture around them.

## New dependencies

- None recommended for the first pass.
- Optional later investigation only:
  - `@tamagui/portal` or existing Tamagui portal primitives if we formalize a flight overlay host.
  - `@shopify/react-native-skia` only if we eventually decide the celebration should become a particle/canvas effect instead of many animated card views.

## UX/UI Considerations

- Preserve the current quick, tactile feel of manual card movement.
- Avoid regressing the “settle before celebration” handoff that was explicitly tuned in prior work.
- Respect system reduced-motion preferences instead of relying only on in-app toggles.
- Keep animation timing consistent enough that undo, draw, auto-play, and celebration feel like one system.
- Avoid abrupt disappear/reappear behavior when cleaning up cards or empty outlines.

## Components

### Reuse

- `CardView` / `CardVisual`
- `useCardAnimations`
- `useFoundationGlowAnimation`
- `useCelebrationController`
- `useUndoScrubber`
- `CurrentToast`
- History `Sheet`

### Create

- A board-level flight overlay host for cross-pile card flights.
- A shared animation config module for naming timings, durations, and motion policies.
- A reduced-motion adapter that maps system preference + in-app settings into one motion policy.

## How to fetch data, how to cache

- No remote data fetching is involved.
- For profiling and validation:
  - Use release/dev-build measurements rather than Expo web or debug mode for animation conclusions.
  - Cache only the minimum layout data required for flights; avoid mirroring large snapshot maps on every layout event unless the value actually changed.

## Related tasks

- `docs/delivery/14/14-5.md`
- `docs/delivery/26/26-1.md`
- `docs/delivery/26/26-2.md`
- `docs/product/auto-up-win-handoff/28-2-end-of-auto-up-jitter.md`
- `docs/product/game-history-performance/many-games-slowdown-investigation.md`
- `docs/performance-improvements-react19-check-2026-03-03.md`

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
- [pending] Move cross-pile flights into a dedicated overlay host.
- [completed] Degrade celebration-related work gracefully for reduced-motion users and stop redundant glow work once celebration takes over.
- [pending] Reduce celebration per-frame math further for lower-end devices that still keep celebrations enabled.
- [pending] Revisit undo scrubber so gestures can move back toward UI-thread handling after board churn drops.
- [pending] Validate Reanimated static feature flags in a native dev build.

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

## Files actually modified

- `app/_layout.tsx`
- `app/history.tsx`
- `app/settings.tsx`
- `components/CurrentToast.tsx`
- `src/animation/flightController.ts`
- `src/features/klondike/components/cards/animations.ts`
- `src/features/klondike/components/cards/CardView.tsx`
- `src/features/klondike/components/cards/FoundationPile.tsx`
- `src/features/klondike/components/cards/StockStack.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/state/settings.tsx`
- `docs/product/animation-audit/app-wide-animation-audit-and-improvement-plan.md`

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
- Undo scrubber depends on JS-thread gesture callbacks for stability, which is understandable but not ideal long term.
  - Status: unchanged in this pass because there is parallel scrubber safe-area work in flight and the threading refactor should be handled together.
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

- Validation completed in this pass:
  - `yarn typecheck:fallback`
  - `yarn lint`
  - `oxfmt` on the files modified for this task
- Native/device validation completed in this follow-up:
  - `yarn release` completed successfully on April 1, 2026 and produced a fresh Android release APK.
  - Installed the fresh release APK on `emulator-5554` and launched the app against Metro.
  - Verified manual draw behavior on the release build after the queue/hook fixes.
  - Verified the demo auto-solve flow reached win celebration, and the live celebration showed mixed ranks instead of the earlier kings-only regression.
- Native/device validation still pending:
  - iOS simulator/device: repeated draw, recycle, undo scrub, tableau-to-foundation, auto-complete, and win celebration.
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
