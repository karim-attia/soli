# History Sheet Android Back And Pile Counts

## User prompt

Fix Undo move counter restore. Cards/stock restore, but the visible move counter stays incremented on both iOS and Android.

-> undo should not decrement the move counter. these moves have still been done. this is the correct business logic. Add a small inline comment to document this for the future.

Fix Android Back behavior while History Sheet is open; it changes the underlying route before the sheet dismisses.

-> Please implement recommendation

stack count indicator for waste and stock:
-> is it possible that these changed color with the migration? they seem more prominent. please deemphasize. also when winning a game and the winning animation starts, the left one does not disappear. pls fix.

Please remember project rules: never commit

Does the newly introduced hideLabel param make sense?

For stock, we just hide the complete thing when in winning animation:

        if (columnIndex === stockColumnIndex) {
          return (
            <View key="stock" style={slotStyle}>
              {!showWinCleanup && (


Would it not make more sense to also not show this whole are like this in the waste?

        if (columnIndex === wasteColumnIndex) {
          return (
            <View key="waste" style={slotStyle}>
              <PileButton

Essentially, when the game is won, we hide all these things in order to make space for the win animation.

In general, there's a flicker in these both stacks when the winning animation starts. pls check and do deep fix.

Also further de-emphasize this counter

Also, is this the right place for the backhandler? Should this logic not be a part of the sheet component? So that all sheets behave the same way? Or even a part of the tamagui sheet? search web for best approach here.

(i manually changed the settings card shadow, pls ignore)

## Description

Document the intended undo move-count behavior, make Android hardware Back dismiss the
History preview Sheet before route navigation can run underneath it, and reduce the
visual emphasis of the stock/waste stack count labels. During the win cleanup handoff,
fade the complete stock and waste pile visuals together while keeping their column
containers mounted. This prevents a one-frame mismatch/flicker and preserves the stable
seven-column geometry used for card layout and celebration measurements.

## Acceptance Criteria

- Undo continues to restore card/stock/waste state without decrementing `moveCount`.
- `handleUndo` has a short inline comment explaining that undo is itself player
  activity and therefore preserves the visible move count.
- On Android, pressing hardware Back while the History Sheet is open closes the Sheet
  and consumes the Back event, so the underlying drawer route does not change.
- Back handling is active only while the History Sheet is open.
- Android Back behavior is owned by an app-level Tamagui Sheet wrapper so future
  controlled sheets receive the same dismiss-first behavior.
- The wrapper uses Tamagui's public controlled `open`/`onOpenChange` API and does not
  patch or fork Tamagui.
- Stock and waste count labels are further deemphasized after Config v5.
- `PileButton` does not need a win-specific `hideLabel` prop.
- Complete stock and waste pile visuals fade out in lockstep during win cleanup.
- Stock and waste slot containers stay mounted so the board does not reflow.
- The exact winning render is treated as celebration-pending before the effect queues
  the celebration, preventing cleanup from pulsing on, off, then on.
- The win-cleanup transition does not disable card layout tracking before the final
  winning card has settled.
- No dependency changes.
- No commit is created.

## Design links

- React Native BackHandler: https://reactnative.dev/docs/backhandler
- React Native Modal: https://reactnative.dev/docs/modal
- React Navigation custom Android Back behavior:
  https://reactnavigation.org/docs/custom-android-back-button-handling/
- Tamagui Sheet: https://tamagui.dev/ui/sheet
- Tamagui Config v5 migration context:
  `docs/product/tamagui-config-v5/config-v5-migration.md`

## Possible approaches incl. pros and cons

### Add `BackHandler` inside `HistoryScreen`

- Pros: direct, route-local, active only where the Sheet exists, follows React Native
  and React Navigation guidance.
- Cons: every future sheet must remember to duplicate the same listener and cleanup.

### Rely on Tamagui Sheet defaults

- Pros: no app code.
- Cons: Tamagui 2.2.0 exposes no Android hardware-Back prop, and current physical-device
  validation showed Back navigates behind the portal-based Sheet.

### Wrap Tamagui Sheet in an app-level component

- Pros: centralizes dismiss-first Android behavior, uses the public controlled Sheet
  contract, and gives future sheets the correct default.
- Cons: adds a small local abstraction around a third-party compound component.

### Conditionally unmount both pile buttons

- Pros: simple and removes both areas.
- Cons: abrupt unmounting can create the reported flicker and changes the mounted view
  tree at the celebration handoff.

### Keep both pile trees mounted and fade their shared visual containers

- Pros: both areas transition in lockstep, the count disappears with its pile, and
  stable column geometry/measurement nodes are preserved.
- Cons: hidden views remain mounted for the short celebration sequence.

Recommendation: use an app-level controlled Sheet wrapper for Android Back, remove the
win-specific `hideLabel` API, and apply one shared Reanimated cleanup treatment to the
complete stock and waste pile areas. Also derive an effective pending state during the
exact winning render so React's post-render celebration effect cannot cause a one-frame
cleanup pulse.

## Open questions to the user incl. recommendations (if any)

No blocking questions. The user clarified undo move count should not decrement and
requested complete pile-area cleanup rather than label-only hiding.

## New dependencies

None.

## UX/UI Considerations

- Android Back should first dismiss visible modal/sheet UI before route navigation.
- Count labels should remain legible but read as tertiary metadata.
- Stock and waste should disappear as one coordinated visual event after the final
  winning card settles.
- Empty slot columns remain mounted and retain their width so the board and celebration
  origins do not jump.

## Components

- Create an app-level `AppSheet` wrapper around Tamagui `Sheet`.
- Reuse Tamagui `Sheet.Overlay`, `Sheet.Frame`, and `Sheet.Handle` through the wrapper.
- Reuse existing `PileButton` for stock/waste controls.
- Add a small pile cleanup wrapper beside the card components if needed to keep the
  animation behavior reusable and testable.

## How to fetch data, how to cache

No data fetching or cache changes.

## Related tasks

- Tamagui Config v5 migration: `docs/product/tamagui-config-v5/config-v5-migration.md`
- Native Teleport follow-up: `docs/product/tamagui-native-teleport/`

## Steps to implement and status of these steps

- [completed] Research Tamagui Sheet, React Native BackHandler/Modal, and React
  Navigation Android Back guidance.
- [completed] Inspect History Sheet, undo reducer, and stock/waste count rendering.
- [completed] Add this implementation plan.
- [completed] Add undo move-count business-logic comment.
- [completed] Replace the History-only BackHandler with a reusable app-level Sheet
  wrapper.
- [completed] Replace `hideLabel` and asymmetric unmounting with one coordinated pile-area
  win-cleanup transition.
- [completed] Close the exact-win render/effect timing gap in the celebration
  controller.
- [completed] Further deemphasize pile count labels.
- [completed] Run existing focused undo/history tests and inspect the wrapper/cleanup
  implementation.
- [completed] Run static checks.
- [completed] Run web validation.
- [completed] Run a clean iOS build and simulator validation.
- [completed] Run Android `yarn release`, verify installation, and validate on the
  connected device/emulator.

## Plan: Files to modify

- `src/solitaire/klondike.ts`
- `components/AppSheet.tsx`
- `app/history.tsx`
- `src/features/klondike/components/cards/PileButton.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/hooks/useCelebrationController.ts`
- `docs/product/history-sheet-back-and-pile-counts/android-back-and-pile-counts.md`

## Files actually modified

- `docs/product/history-sheet-back-and-pile-counts/android-back-and-pile-counts.md`
- `src/solitaire/klondike.ts`
- `components/AppSheet.tsx`
- `app/history.tsx`
- `src/features/klondike/components/cards/PileButton.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/hooks/useCelebrationController.ts`

## Identified issues and status of these issues

- Undo move count looked suspicious during validation.
  - Status: clarified by user as correct business logic; documented in code.
- Android Back navigates behind an open History Sheet.
  - Status: fixed in `AppSheet`; physical Android hardware Back dismisses the Sheet
    without changing the underlying route, list position, or entry.
- Stock/waste count labels became too prominent after Config v5.
  - Status: fixed with a smaller `$color8` label at 45% opacity; validated on web, iOS,
    and Android.
- Waste count remains visible during win celebration.
  - Status: fixed by fading the complete waste and stock pile areas together.
- Stock and waste flicker at winning-animation start.
  - Status: two causes identified: asymmetric rendering (`waste` stays mounted while
    `stock` unmounts), plus an exact-win render where cleanup briefly turns on before
    the celebration-queue effect sets `celebrationPending`. Both causes are fixed and
    validated with web sampling plus iOS/Android recordings.

## Testing

Completed static checks:

- `yarn format:check`
- `yarn lint:strict`
- `yarn typecheck`
- `yarn typecheck:fallback`
- `yarn check:tamagui`
- `git diff --check`

All passed; strict lint reported 0 warnings and 0 errors.

- Focused Jest:
  `yarn jest --runInBand test/unit/state/history.drawCount.test.ts test/unit/solitaire/klondike.undo.test.ts`
  passed, 2 suites and 6 tests.

Completed web validation:

- Stock/waste count labels rendered at 11 px, `$color8`, and 45% opacity and remained
  legible.
- Draw changed waste/stock from `1/23` to `2/22`; Undo restored `1/23` while `MOVES`
  stayed at `3`.
- Autosolve transition was sampled every 50 ms. Stock and waste changed together, with
  no cleanup on/off/on pulse.
- Both top-row columns kept fixed `96 x 161` geometry during cleanup.
- A solved-entry History Sheet dismissed by backdrop while remaining on `/history`.
- Browser console had no errors. Existing shadow/pointer-event deprecation warnings
  originate elsewhere in the app.

Completed iOS validation:

- Clean build command:
  `yarn ios --no-build-cache --device 53E36318-51D0-44B7-996F-25BBF9C83828`.
- Build passed with 0 errors and 2 existing warnings; installed
  `ch.karimattia.soli` `0.8.0` build `13` at June 13, 2026 14:00:33 +0200.
- Draw changed stock/waste `23/1` to `22/2`; Undo restored `23/1` while `MOVES`
  remained `1`.
- Recorded autosolve showed both pile areas clearing together with no flicker,
  reappearance, or top-row movement.
- Solved-entry Sheet opened and dismissed by backdrop and drag without a crash.
- No fatal React Native, Reanimated, Tamagui, or Teleport errors.

Completed Android validation:

- `yarn release` reached Gradle `BUILD SUCCESSFUL`, installed, and launched the release
  APK. The long-running Metro watcher was stopped after installation.
- Installed `ch.karimattia.soli` `0.8.0` build `13`, with
  `lastUpdateTime = 2026-06-13 14:15:16`.
- Draw changed stock/waste `23/1` to `22/2`; Undo restored `23/1` while `MOVES`
  remained `1`.
- A 120 fps autosolve recording showed both pile areas clearing together without
  flicker, reappearance, or layout movement.
- Android hardware Back dismissed only the Sheet; History route, list position, stats,
  and top entry stayed unchanged. Reopen plus backdrop dismissal also passed.
- Logcat contained no Soli crash, ANR, fatal React Native/Reanimated/Tamagui/Teleport
  error, or native-module failure.

Native screenshots, recordings, and logs are under `/tmp`; none are committed.
