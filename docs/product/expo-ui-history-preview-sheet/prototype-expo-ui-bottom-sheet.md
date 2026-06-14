# Expo UI History Preview Sheet Production Expo UI Bottom Sheet

## User prompt

```text
Do this now: 
Third migration: History preview sheet
Target: [AppSheet.tsx (line 23)](/Users/karim/kDrive/Code/soli/components/AppSheet.tsx:23), [history.tsx (line 488)](/Users/karim/kDrive/Code/soli/app/history.tsx:488)
Prototype Expo UI BottomSheet. This could remove custom Android back handling and feel more native, but it is higher risk because snap points and board preview layout matter.

Same way of operating this.
FYI: We were on a different branch. Moved to main, stay there.
```

```text
Install agent-device binary, so you can run tests.
The sheet looks really good! Except one issue: Sometimes there is a crash. Check logs on connected Android device. I think it happens after dragging the sheet up so it becomes full screen and then closing it after. check adb logs
After fixing, don't treat this as experiment anymore, but instead make the sheet use this cleanly so that this approach is used everywhere. 
```

```text
Thank you for the fix. Quick question, is this really the best way to handle this? It seems kind of complicated to have all of these files with all of this code like this. Shouldn't Expo UI handle all of this kind of out of the box? Please search the web a little bit for best practices here. And maybe one side comment, when making it full screen, you don't see the handle anymore, which you have seen before, which makes me think that it's kind of a weird custom solution on Android. And second, I don't even think we need to go full screen. Like, what's the like fully native or like the recommended approach by Expo UI? Thank you.
```

```text
# Selected text:

## Selection 1
Expo’s native Material sheet does normally keep its drag handle. A content-sized universal sheet should restore the normal appearance without custom handle code.

## My request for Codex:
Hey, so this history feature is not really a very, I don't know, core feature. I think it's cool to see a history board. Let's make this as simple as possible, as close to the recommendations as possible, to the best practices. I don't need snap points. I don't need any of this. Let's please implement a very simple solution that when you click on a game, that you see the board and it somehow looks good with a very simple solution. You can also take the liberty to drastically simplify here and stay close to the export recommendations. Please do this now. Thank you.
```

```text
1. remove that whole reducedMotionEnabled from history.
2. Make HistoryPreviewSheet as close to BottomSheet, e.g. adopt onDismiss terminology.
3. can we also simplify handleSheetOpenChange? needed?
4. implement your theoretical minimum, let's see from there.
5. also adopt these simplifications to history. i think we are doing things complicated in the sheet because history is complicated and doing things complicated in history because sheet is complicated. really simplify this into just showing some content in a sheet according to simplest best practices.
6. better explain RNHostView. why can't we just give the sheet content to the sheet and the sheet paints it?
```

## Description

Use Expo UI's universal, content-sized `BottomSheet` as Soli's production `AppSheet`.
The History preview is intentionally a lightweight secondary feature, so it should not
manage snap points, full-screen expansion, or platform-specific sheet lifecycles.

The final implementation should keep the useful History flow and board preview while
removing Android-only wrappers and all board-to-sheet-height calculations.

The final simplification should also use one source of presentation state: a selected
History entry. `AppSheet` should mirror Expo's `BottomSheet` terminology and contain
only the React Native-to-native bridge required for existing Tamagui content.

## Acceptance Criteria

- Confirm the working branch is `main` before edits and do not switch branches.
- Do not stage or commit.
- Install `@expo/ui` with `npx expo install @expo/ui`.
- Use official Expo docs as the source for `@expo/ui` API decisions.
- Create a package guide for `@expo/ui`, date-stamped `2026-06-14`.
- Install the pinned `agent-device` CLI and use it for Android validation.
- Inspect ADB logs from the connected Android device and reproduce the expand-then-close
  crash.
- Fix the underlying crash rather than masking it.
- Replace `components/AppSheet.tsx` with the production Expo UI sheet abstraction.
- Remove the History-specific experimental wrapper and use `AppSheet` from History.
- Use Expo UI's universal `BottomSheet` on Android, iOS, and web.
- Omit `snapPoints` so Expo UI sizes the native sheet to its content.
- Use universal `RNHostView matchContents` for the React Native/Tamagui content.
- Remove Android-specific sheet wrapper files and lifecycle workarounds.
- Remove History snap-point state and board-height calculations.
- Remove History's separate `sheetOpen` state, reduced-motion sheet cleanup, delayed
  entry cleanup, and `handleSheetOpenChange`.
- Present the preview whenever `selectedEntry` is non-null and clear it directly from
  `onDismiss`.
- Expose `isPresented` and `onDismiss` from `AppSheet` to match Expo UI terminology.
- Keep `AppSheet` at the theoretical minimum: `BottomSheet` wrapping
  `RNHostView matchContents`.
- Do not add custom width, padding, safe-area, animation, handle, or layout policy to
  `AppSheet`.
- Keep Settings, DrawCountSelector, and the game board out of scope; there are no other
  active sheet callsites to migrate.
- Preserve entry-open and native dismiss-close behavior.
- Do not render the preview sheet when no History entry is selected.
- Clear the selected entry directly from `onDismiss`; no reduced-motion branch or
  delayed cleanup is needed.
- Avoid unrelated refactors or visual redesign.
- Leave only small comments where the implementation reason matters.
- Run dependency, type, lint, format, Jest, and practical web validation.
- Run a fresh Android release build, verify installation, and confirm an upward drag
  does not produce the former full-screen state.
- Test drag close, scrim close, and Android Back sequentially on the connected device.
- Verify the Soli process remains stable and the known native sheet crash signatures
  are absent from ADB logs.
- Do not stage or commit.

## Design links

- Expo UI overview: https://docs.expo.dev/versions/latest/sdk/ui/
- Universal BottomSheet: https://docs.expo.dev/versions/latest/sdk/ui/universal/bottomsheet/
- Drop-in replacement BottomSheet: https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/bottomsheet/
- Universal RNHostView: https://docs.expo.dev/versions/latest/sdk/ui/universal/rnhostview/
- SwiftUI RNHostView: https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/rnhostview/
- Previous History sheet work:
  `docs/product/history-sheet-back-and-pile-counts/android-back-and-pile-counts.md`

## Possible approaches incl. pros and cons

### Use universal `BottomSheet` from `@expo/ui`

- Pros: official cross-platform Expo UI component with controlled `isPresented` and
  `onDismiss` props.
- Pros: supports semantic `half` and `full` snap points across platforms.
- Cons: precise `{ fraction }` and `{ height }` snap points are honored on iOS and web,
  but Android maps them to the nearest `half` or `full` state.
- Cons: React Native content inside the native Expo UI tree needs `RNHostView`; this
  adds layout risk for the Tamagui/React Native preview board.

### Use drop-in `BottomSheet` from `@expo/ui/community/bottom-sheet`

- Pros: closest to the current snap point shape because it accepts string percentage
  snap points like `65%`.
- Pros: built for React Native content and documents `BottomSheetView` as the content
  wrapper.
- Pros: `enablePanDownToClose` enables native Android Back/scrim dismissal behavior,
  directly addressing the previous custom Back handler reason.
- Cons: Android still maps snap behavior to native partial/expanded states, so precise
  dynamic percentages need native validation.
- Cons: animation customization props are accepted for compatibility but do not change
  native behavior.

### Replace `AppSheet` globally

- Pros: one production abstraction for all sheets, removes the unused Tamagui wrapper,
  and prevents future sheet callsites from reintroducing custom Back handling.
- Cons: changes the compound Tamagui API, but there are no remaining callsites and this
  repo does not guarantee backward compatibility.

Previous recommendation: use the low-level Jetpack Compose `ModalBottomSheet` on
Android to preserve partial/full snap behavior while working around the SDK 56 crash.
This was implemented and validated, but it is no longer appropriate after removing the
product requirement for snap points and full-screen expansion.

### Use the universal content-sized `BottomSheet`

- Pros: this is Expo's documented cross-platform API for new code.
- Pros: omitting `snapPoints` enables native content sizing and removes full-screen
  expansion.
- Pros: the native drag indicator, Back, scrim, and dismissal behavior remain owned by
  Expo UI and the platform.
- Pros: removes platform branches, imperative native refs, animation-frame delays, and
  custom Android viewport sizing.
- Cons: the published SDK 56 native module predates an upstream
  `ShadowNodeProxy` validity guard, so repeated Android dismissal still needs real
  device regression testing.

Updated recommendation: use this universal content-sized approach. The previous
low-level approach was justified only by the combination of multiple detents and the
SDK 56 Android race; neither warrants the complexity for this secondary preview.

## Open questions to the user incl. recommendations (if any)

No blocking questions. The user approved the visual direction and requested production
adoption through the shared `AppSheet`.

## New dependencies

- `@expo/ui`
  - Install with `npx expo install @expo/ui`.
  - Guide: `docs/product/expo-ui-history-preview-sheet/expo-ui-history-preview-sheet-expo-ui-guide.md`.
  - Note: `external-packages.mdc` was referenced by repo instructions but is not present
    in this workspace; this guide follows the documented external-package requirement.
- Global test tool: `agent-device@0.17.5`
  - Install with `npm install -g agent-device@0.17.5`.
  - This is a developer-machine CLI, not an application dependency.
  - Guide:
    `docs/product/expo-ui-history-preview-sheet/expo-ui-history-preview-sheet-agent-device-guide.md`.

## UX/UI Considerations

- The preview sheet should still feel like a bottom modal preview: entry metadata,
  badges, and the board preview remain the core content.
- Android Back, scrim tap, and pan-down close should dismiss the sheet rather than
  navigating under it.
- The sheet should use its content height instead of exposing partial/full detents.
- Native sheet backgrounds and handles may differ slightly by platform; keep content
  styling close to the current design without forcing non-native chrome.
- Reduced motion still controls when selected-entry state is cleared.
- Web should remain usable through an Expo UI drawer fallback without dev accessibility
  warnings.

## Components

- Reuse current History list, badges, and preview board components in `app/history.tsx`.
- Use `components/AppSheet.tsx` as the production Expo UI wrapper.
- Remove `components/ExpoHistoryPreviewSheet.tsx` after the production wrapper is in
  place.
- Use universal `RNHostView matchContents` to host the Tamagui/React Native preview.
- Use universal Expo UI `BottomSheet` for every platform.
- Remove `components/AndroidAppSheet.tsx` and
  `components/AndroidAppSheet.android.tsx`.

## How to fetch data, how to cache

No data fetching or cache changes. History data continues to come from `useHistory()`
and local state.

## Related tasks

- Prior Android Back wrapper work:
  `docs/product/history-sheet-back-and-pile-counts/android-back-and-pile-counts.md`
- Expo SDK 56 upgrade context:
  `docs/product/expo-rn-sdk-56-upgrade/upgrade-to-expo-sdk-56-and-react-native-0-85.md`

## Steps to implement and status of these steps

- [completed] Confirm branch is `main` and working tree state before editing.
- [completed] Verify official Expo UI BottomSheet and RNHostView docs.
- [completed] Inspect existing `AppSheet` and History preview sheet callsites.
- [completed] Create implementation plan and package guide.
- [completed] Install `@expo/ui` with Expo CLI.
- [completed] Inspect installed package types for exact import/ref names.
- [completed] Create the local Expo UI History preview sheet wrapper.
- [completed] Replace the History preview `AppSheet` usage with the new wrapper.
- [completed] Run dependency/static checks.
- [completed] Run focused Jest if practical.
- [completed] Run web smoke validation if practical.
- [completed] Document native validation status and residual risk.
- [completed] Confirm the follow-up work is still on `main` and inspect current
  callsites.
- [completed] Research the official `agent-device` install and pin version `0.17.5`.
- [completed] Install and verify the `agent-device` binary.
- [completed] Capture connected-device ADB logs and reproduce expand-then-close crash.
- [completed] Identify the crash root cause and document it.
- [completed] Fix the Android sheet lifecycle/state race.
- [completed] Promote the Expo UI wrapper to production `AppSheet`.
- [completed] Remove the History-specific wrapper and update History to use `AppSheet`.
- [completed] Run `npx expo install --check` after the fix.
- [completed] Run `yarn typecheck` after the fix.
- [completed] Run `yarn lint` after the fix.
- [completed] Run `yarn format:check` after the fix.
- [completed] Run Jest after the fix.
- [completed] Run a fresh Android release build and verify installation.
- [completed] Re-test the first hide-before-unmount fix on the connected Android
  device; the same crash remained.
- [completed] Remove Android RNHostView's dynamic Fabric size reporting while preserving
  native partial/full sheet states.
- [completed] Rebuild and re-test the final Android sizing/lifecycle fix.
- [completed] Validate partial/full expansion and all dismiss paths on connected Android.
- [completed] Re-run web smoke validation.
- [completed] Re-run final automated checks after the platform module split.
- [completed] Research Expo's recommended content-sized universal sheet approach.
- [completed] Simplify `AppSheet` to universal `BottomSheet` plus `RNHostView`.
- [completed] Remove History snap-point state and height calculations.
- [completed] Remove Android-specific sheet wrapper files.
- [completed] Re-run dependency, type, lint, format, and Jest checks.
- [completed] Run web smoke validation for the simplified sheet.
- [completed] Build, install, and test the simplified sheet on connected Android.
- [completed] Record the final one-state History and minimal-wrapper simplification.
- [completed] Reduce `AppSheet` to `BottomSheet` plus `RNHostView matchContents`.
- [completed] Remove History's reduced-motion, duplicate open state, delayed cleanup, and
  open-change handler.
- [completed] Re-run dependency, type, lint, format, Jest, web, and connected Android
  validation for the theoretical-minimum implementation.

## Plan: Files to modify

- `package.json`
- `yarn.lock`
- `app/history.tsx`
- `components/AppSheet.tsx`
- `docs/product/expo-ui-history-preview-sheet/prototype-expo-ui-bottom-sheet.md`
- `docs/product/expo-ui-history-preview-sheet/expo-ui-history-preview-sheet-expo-ui-guide.md`
- `docs/product/expo-ui-history-preview-sheet/expo-ui-history-preview-sheet-agent-device-guide.md`

## Files actually modified

- `docs/product/expo-ui-history-preview-sheet/prototype-expo-ui-bottom-sheet.md`
- `docs/product/expo-ui-history-preview-sheet/expo-ui-history-preview-sheet-expo-ui-guide.md`
- `package.json`
- `yarn.lock`
- `app/history.tsx`
- `components/AppSheet.tsx`
- `docs/product/expo-ui-history-preview-sheet/expo-ui-history-preview-sheet-agent-device-guide.md`

## Identified issues and status of these issues

- `external-packages.mdc` is referenced by repo instructions but not present.
  - Status: non-blocking; created the required package guide from official docs.
- `npx expo install @expo/ui` completed with Yarn peer-requirement warnings.
  - Status: dependency installed; Expo dependency check, TypeScript, lint, format, and
    Jest all pass.
- `agent-device` is not installed in this environment.
  - Status: resolved; globally installed and verified at version `0.17.5`.
- Intermittent Android crash after expanding to full height and dismissing.
  - Status: reproduced on the connected A065. Four prior crashes and a clean
    `agent-device` reproduction all fail in
    `NativeStatePropsGetter.updateViewSizeImmediate`, called from
    `ShadowNodeProxy.onPreDraw` after `RNHostView` has already been removed.
  - Root cause: the community drop-in sheet unmounts its Expo UI `Host` immediately
    from `onDismissRequest`, while an RN content size update is still queued for the
    next native pre-draw. Expo's low-level `ModalBottomSheet` documentation requires
    awaiting `ref.hide()` before unmounting.
  - First fix result: awaiting `hide()` and two additional frames still reproduced the
    same crash. Native `RNHostView` with `matchContents={false}` schedules
    `shadowNodeProxy.setViewSize()` during the sheet's own full-height dismissal, so
    the stale Fabric callback can occur before React removes the host.
  - Final status: resolved for this feature by removing the unnecessary full-screen
    detent and low-level lifecycle implementation. The production wrapper now uses the
    universal content-sized sheet with `RNHostView matchContents`.
  - Final evidence: after an upward drag and dismissal, plus repeated Back, scrim, and
    swipe dismissals, the process PID stayed `8809`, History remained in
    `ch.karimattia.soli/.MainActivity`, and the targeted ADB query contained no Soli
    fatal, `NativeStatePropsGetter`, or `ShadowNodeProxy` matches.
- `agent-device swipe` produced one fatal log from its separate
  `com.callstack.agentdevice.multitouchhelper` instrumentation process.
  - Status: unrelated to Soli; the gesture completed, Soli stayed foreground with PID
    `8809`, and package-specific crash queries were empty.
- Removing all width policy from both `AppSheet` and History caused the seven-column
  board's 564 px intrinsic width to clip on a 390 px web viewport.
  - Status: kept `AppSheet` at the theoretical minimum and moved one responsive width
    calculation into `HistoryPreviewSheet`. The board now uses the viewport minus
    Expo's 16-per-side sheet content inset, and the previous board `onLayout` state and
    callback are gone.
- Android Material still exposes a small upward settle for sufficiently tall boards.
  - Status: confirmed as native `ModalBottomSheet` behavior. With no `snapPoints`,
    Expo leaves Compose partial expansion enabled; when intrinsic content exceeds half
    of the available height, Material creates partial and expanded anchors. The tested
    board moved upward by roughly 200 physical pixels, remained content-sized, and
    retained the native handle.
  - Recommendation: accept the native settle for this secondary preview. Preventing
    it unconditionally requires returning to an Android-specific lower-level API or
    artificially constraining the preview height.

## Testing

Results:

- `npx expo install --check` passed.
- `yarn typecheck` passed.
- `yarn lint` passed with 0 warnings and 0 errors after switching to the named
  `BottomSheet` import.
- `yarn format:check` passed.
- `yarn jest --runInBand` passed: 6 suites, 40 tests.
- Web smoke passed on `http://localhost:8081/history`.
  - A clean browser context rendered the zero-history empty state with no page errors.
  - A valid History entry was seeded in local storage for interaction validation.
  - Selecting the entry opened the content-sized sheet with its handle, metadata,
    badges, and all seven board columns visible.
  - Escape dismissed the sheet, cleared the preview, stayed on `/history`, and
    produced no page errors.
  - Server output contained only pre-existing Tamagui shadow and `pointerEvents`
    deprecation warnings.
- Final theoretical-minimum web smoke passed at 390 x 844.
  - Confirmed the zero-history state.
  - Seeded one valid entry, opened the sheet, and verified all seven columns were
    visible after moving responsive width ownership into History.
  - Escape dismissed the sheet, left one list title, stayed on `/history`, and produced
    no page errors.
- Installed and verified `agent-device@0.17.5`.
- `yarn release` completed successfully, installed the release APK on connected A065,
  and opened the app.
- Final Android validation on A065:
  - Verified the content-sized native Material sheet, default drag handle, metadata,
    badges, and complete board preview layout.
  - An upward drag kept the sheet content-sized and kept the native handle visible;
    the former full-screen state was not available.
  - Verified swipe, scrim, and Android Back dismissal paths.
  - Repeated open/dismiss cycles kept Soli PID `8809`; the app remained in
    `ch.karimattia.soli/.MainActivity`.
  - A targeted ADB query for Soli fatal exceptions, `NativeStatePropsGetter`,
    `ShadowNodeProxy`, `SIGSEGV`, and `SIGABRT` returned no matches.
- Final theoretical-minimum Android validation on A065:
  - `yarn release` completed successfully in 19 seconds and installed the release APK.
  - Verified the native handle, metadata, badges, and all seven board columns.
  - An upward drag used Material's native partial-to-expanded settle for the tested
    board; it did not become full-screen and the handle remained visible.
  - Android Back, scrim, and swipe dismissal all returned to History.
  - Soli PID remained `21109`, `ch.karimattia.soli/.MainActivity` remained foreground,
    and the targeted crash query returned no matches.
- iOS native validation was not run. Residual risk remains around SwiftUI intrinsic
  React Native content sizing and dismissal behavior. Exact next command:
  `yarn ios --no-build-cache`, followed by
  `agent-device open Soli --platform ios`.
- Connected Android crash reproduction on A065:
  - Opened History with `agent-device`, selected a history entry, dragged the sheet
    from partial to full height, then dragged it down to dismiss.
  - The app process exited immediately and the launcher became foreground.
  - ADB and `agent-device` logs captured
    `java.lang.NullPointerException` in
    `expo.modules.kotlin.jni.fabric.NativeStatePropsGetter.updateViewSizeImmediate`,
    reached from `ShadowNodeProxy.scheduleFlush` during pre-draw.
