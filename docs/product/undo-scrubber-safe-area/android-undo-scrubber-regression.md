# Undo Scrubber Safe Area Android undo scrubber regression

## Description

Investigate a recently reported Android layout regression where the Klondike undo scrubber no longer sits at the expected bottom offset. Review the most recent commits first, identify the most likely regression window, and land the narrowest fix that restores the intended floating placement without changing unrelated board spacing.

Current investigation notes:
- The last few gameplay/perf commits did not change the scrubber layout directly.
- The most relevant recent platform change is the Expo SDK 55 upgrade in [`android/gradle.properties`](/Users/karim/kDrive/Code/soli/android/gradle.properties), which enabled `edgeToEdgeEnabled=true`.
- Expo’s current Android system-bar guidance says edge-to-edge layouts now need explicit safe-area handling.
- The current scrubber uses additive bottom padding (`safeArea.bottom + fixedPadding`), which is a less precise fit for a floating bottom control than the library’s documented `SafeAreaView` `maximum` edge mode.
- Follow-up note: the first `maximum`-margin fix also reduced some of the old visual breathing room, because it intentionally stopped stacking the system inset and the fixed dock gap together.

## Acceptance Criteria

- The undo scrubber sits above the Android navigation / gesture area again.
- The scrubber keeps a minimum visual bottom offset even on devices that report a very small or zero bottom inset.
- The fix is scoped to the undo scrubber container only and does not retune the board, header, or celebration overlays.
- The implementation leaves a concise code note explaining why a safe-area-aware floating-bar pattern is used instead of additive manual padding.
- The undo button retains a little extra bottom breathing room so it does not feel tighter than the pre-fix layout.
- The recent-commit analysis is captured here so later regressions can be traced back quickly.

## Design links

- Expo system bars guide: [System bars](https://docs.expo.dev/develop/user-interface/system-bars/)
- Expo safe area library guide: [react-native-safe-area-context](https://docs.expo.dev/versions/latest/sdk/safe-area-context/)
- Safe Area Context `SafeAreaView` API: [SafeAreaView](https://appandflow.github.io/react-native-safe-area-context/api/safe-area-view/)

## Possible approaches incl. pros and cons

### 1. Keep the current hook and tune the numeric padding

Pros:
- Smallest code diff.
- No component swap.

Cons:
- Hard-codes behavior instead of using the safe-area library’s floating-element pattern.
- Still adds the inset and padding together, which can overshoot on devices that already report a bottom inset.
- Leaves the regression brittle if Android/system-bar behavior shifts again.

### 2. Switch the scrubber wrapper to `SafeAreaView` with bottom `maximum` spacing

Pros:
- Matches the library’s documented floating-bottom-element pattern.
- Keeps a minimum bottom gap while respecting larger safe-area insets.
- Lets us use `mode="margin"` so the scrubber’s internal overlay height stays stable instead of growing with inset padding.
- Keeps the safe-area logic correct while still allowing us to tune the minimum dock gap separately.

Cons:
- Slightly larger refactor than a one-line padding tweak.
- Needs a quick visual sanity check on Android and iOS/web.

Recommended:
- Approach 2.

### 3. Move all bottom safe-area handling to the parent screen container

Pros:
- Centralizes screen-level safe-area ownership.
- Could help if more bottom controls are added later.

Cons:
- Broader scope than this bug needs.
- Risks changing unrelated spacing for the board and other overlays.

## Open questions to the user incl. recommendations

- None currently blocking.
- Recommendation: keep this fix narrow and avoid a larger screen-layout refactor unless we find a second bottom-control bug while testing.

## New dependencies

- None.
- Existing package guidance refreshed in [`undo-scrubber-safe-area-react-native-safe-area-context-guide.md`](/Users/karim/kDrive/Code/soli/docs/product/undo-scrubber-safe-area/undo-scrubber-safe-area-react-native-safe-area-context-guide.md).

## UX/UI Considerations

- The undo button should feel intentionally docked above the system navigation area, not glued to it and not floating excessively high.
- The scrubber overlay should preserve its current visual proportions while only the outer placement logic changes.
- Android gesture navigation and three-button navigation should both remain usable.

## Components

- Reuse [`UndoScrubber.tsx`](/Users/karim/kDrive/Code/soli/src/features/klondike/components/UndoScrubber.tsx) for the actual fix.
- Reuse [`constants.ts`](/Users/karim/kDrive/Code/soli/src/features/klondike/constants.ts) for bottom-offset constants.
- Reuse [`KlondikeGameView.tsx`](/Users/karim/kDrive/Code/soli/src/features/klondike/components/KlondikeGameView.tsx) only if the investigation proves the parent layout is part of the regression. Current recommendation is not to touch it.

## How to fetch data, how to cache

- No remote product data is involved.
- Investigation inputs come from:
  - local git history (`git log`, `git blame`, `git diff`)
  - current component tree inspection
  - official safe-area / system-bar docs for the existing dependency

## Related tasks

- [`exact-android-card-font-rendering.md`](/Users/karim/kDrive/Code/soli/docs/product/card-font-parity/exact-android-card-font-rendering.md)
- [`28-2-end-of-auto-up-jitter.md`](/Users/karim/kDrive/Code/soli/docs/product/auto-up-win-handoff/28-2-end-of-auto-up-jitter.md)

## Steps to implement and status of these steps

- [completed] Locate the undo scrubber layout code and review recent commit history.
- [completed] Review the existing safe-area dependency guidance for Android edge-to-edge behavior.
- [completed] Replace the scrubber’s additive bottom padding with a safer floating-element bottom-spacing pattern.
- [completed] Verify the scrubber position in a real app run and record the result.
- [completed] Restore a small amount of visual bottom breathing room after the first `maximum`-margin pass trimmed it.

## Plan: Files to modify

- [`docs/product/undo-scrubber-safe-area/android-undo-scrubber-regression.md`](/Users/karim/kDrive/Code/soli/docs/product/undo-scrubber-safe-area/android-undo-scrubber-regression.md)
- [`docs/product/undo-scrubber-safe-area/undo-scrubber-safe-area-react-native-safe-area-context-guide.md`](/Users/karim/kDrive/Code/soli/docs/product/undo-scrubber-safe-area/undo-scrubber-safe-area-react-native-safe-area-context-guide.md)
- [`src/features/klondike/components/UndoScrubber.tsx`](/Users/karim/kDrive/Code/soli/src/features/klondike/components/UndoScrubber.tsx)

## Files actually modified

- [`docs/product/undo-scrubber-safe-area/android-undo-scrubber-regression.md`](/Users/karim/kDrive/Code/soli/docs/product/undo-scrubber-safe-area/android-undo-scrubber-regression.md)
- [`docs/product/undo-scrubber-safe-area/undo-scrubber-safe-area-react-native-safe-area-context-guide.md`](/Users/karim/kDrive/Code/soli/docs/product/undo-scrubber-safe-area/undo-scrubber-safe-area-react-native-safe-area-context-guide.md)
- [`src/features/klondike/components/UndoScrubber.tsx`](/Users/karim/kDrive/Code/soli/src/features/klondike/components/UndoScrubber.tsx)

## Identified issues and status of these issues

- Expo SDK 55 enabled Android edge-to-edge in [`android/gradle.properties`](/Users/karim/kDrive/Code/soli/android/gradle.properties).
  Status: confirmed regression window candidate.
- The most recent gameplay / animation commits do not directly move the scrubber.
  Status: confirmed; likely not the source of this layout shift.
- The scrubber currently uses additive manual bottom padding with `useSafeAreaInsets()`.
  Status: confirmed; replaced with `SafeAreaView` `mode="margin"` plus `bottom: 'maximum'` so the scrubber keeps a minimum dock gap without stacking the inset on top.
- The first `maximum`-margin pass can feel a bit tighter than before because it removes the old “inset + fixed gap” double-count.
  Status: confirmed in code review; mitigated by increasing the minimum dock gap while keeping the `maximum` safe-area strategy.

## Testing

- Static:
  - `yarn typecheck:fallback`
- Targeted lint:
  - `yarn exec oxlint --tsconfig tsconfig.json src/features/klondike/components/UndoScrubber.tsx`
- Real environment:
  - `yarn release`
  - launch the app on the connected Android device or emulator
  - open a game state where undo is available
  - verify the undo scrubber clears the navigation / gesture area without excessive extra gap
- Optional cross-check:
  - `yarn web` to confirm the wrapper change does not break the scrubber on web
- Result:
  - `yarn typecheck:fallback` passed.
  - `yarn exec oxlint --tsconfig tsconfig.json src/features/klondike/components/UndoScrubber.tsx` passed with 0 warnings / 0 errors.
  - `yarn release` completed successfully and installed `ch.karimattia.soli` version `0.6.0` on physical Android `A065`.
  - Device package metadata reported `lastUpdateTime=2026-04-01 12:58:38`.
  - Manual screenshot verification on `A065` showed the undo scrubber sitting above the Android three-button navigation bar again, with the button no longer colliding with the system controls.
