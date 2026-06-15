# Settings Clean Up Settings clean up

> Historical note (2026-06-14): the refresh-rate experiment referenced in this plan was
> later removed because Android Battery Saver can cap the display at 60 Hz regardless of
> app preferences. See
> `docs/product/refresh-rate-setting-removal/remove-refresh-rate-setting.md`.
> The custom system reduced-motion integration referenced below was also removed by the
> same follow-up decision; animation behavior is now controlled by the in-app toggles.

## User prompt

```text
[settings.tsx](app/(tabs\)/settings.tsx)
Settings clean up:
1. Order:
Gameplay
Appereance
Statistics
Advanced
2. Introduce safe area on bottom. Now the scroll doesn't have a spacing on bottom (android if there is a dock)
3. Only show animations and refresh rate when developer mode is on. Move it under there.
```

## Description

Clean up the Settings screen hierarchy so user-facing settings are grouped in the requested order, developer-only animation and refresh-rate controls are hidden until Developer mode is enabled, and scrollable content keeps bottom spacing above Android navigation docks.

## Acceptance Criteria

- Settings sections render in this order: Gameplay, Appearance, Statistics, Advanced.
- The statistics section title is concise and matches the requested order label.
- Animation controls no longer appear as a top-level Settings section.
- Animation controls appear inside Advanced only when Developer mode is enabled.
- Android refresh-rate controls remain inside Advanced and only appear when Developer mode is enabled and the device supports high refresh rate.
- The Settings `ScrollView` content has bottom padding that includes the bottom safe-area inset, so the final controls are not visually pinned to Android system navigation.
- Existing setting values and persistence behavior are unchanged.
- No new dependencies are introduced.

## Design links

- React Navigation safe-area guidance: https://reactnavigation.org/docs/handling-safe-area/
- Expo `react-native-safe-area-context` reference: https://docs.expo.dev/versions/latest/sdk/safe-area-context/

## Possible approaches incl. pros and cons

### 1. Reorder existing inline sections and gate developer-only rows in place

Pros:

- Smallest scoped change.
- Preserves existing component behavior and settings state.
- Avoids moving UI into new files for a simple cleanup.

Cons:

- Keeps the current Settings screen as a single file.

Recommended:

- Use this approach because the task is a narrow layout and visibility cleanup.

### 2. Extract Settings sections into separate components

Pros:

- Could make the screen easier to scan if the settings list grows.
- Creates reusable section-level pieces.

Cons:

- Broader than this cleanup needs.
- Risks touching more files without changing user behavior.

Recommendation:

- Defer unless Settings gains more sections or repeated logic.

## Open questions to the user incl. recommendations (if any)

- None blocking.
- Recommendation: keep the visible section name as "Appearance" rather than copying the prompt typo "Appereance".

## New dependencies

- None.
- `react-native-safe-area-context` already exists in `package.json`, and the current task only uses its `useSafeAreaInsets()` hook.

## UX/UI Considerations

- Gameplay remains first because it affects core solitaire rules and assistance.
- Appearance follows Gameplay because it is a user-facing preference, not an advanced control.
- Developer mode acts as the disclosure control for animation diagnostics and Android display refresh-rate experimentation.
- Bottom safe-area padding is additive with the existing visual padding so Android docks do not crowd the final section.

## Components -> Which components to reuse, which components to create?

- Reuse the existing `SettingsScreen` in `app/settings.tsx`.
- Reuse the existing local `ToggleRow` helper for switch rows.
- Reuse existing Tamagui primitives already used by the screen.
- Create no new component for this narrow cleanup.

## How to fetch data, how to cache

- Settings data continues to come from `useSettings()`.
- Reduced motion state continues to come from `useReducedMotionPreference()`.
- Android refresh-rate capability continues to be read lazily from `../modules/expo-refresh-rate/src`.
- No remote data or new cache behavior is introduced.

## Related tasks

- `docs/product/undo-scrubber-safe-area/android-undo-scrubber-regression.md`
- `docs/product/auto-up-setting/automatic-auto-up-setting.md`
- `docs/product/draw-count-setting/solitaire-stock-draw-count.md`

## Steps to implement and status of these steps

- [completed] Create this implementation plan before changing code.
- [completed] Add bottom safe-area inset handling to the Settings scroll content.
- [completed] Reorder Settings sections to Gameplay, Appearance, Statistics, Advanced.
- [completed] Move animation controls under Advanced and show them only when Developer mode is enabled.
- [completed] Gate refresh-rate controls behind Developer mode while keeping existing Android support checks.
- [completed] Run static checks.
- [completed] Verify the Settings screen in a real web environment and record results.
- [completed] Verify the Settings screen on Android and record results.

## Plan: Files to modify

- `docs/product/settings-clean-up/settings-clean-up.md`
- `app/settings.tsx`

## Files actually modified

- `docs/product/settings-clean-up/settings-clean-up.md`
- `app/settings.tsx`

## Identified issues and status of these issues

- Settings currently starts with a top-level Animations section.
  Status: fixed; animation controls now render inside Advanced only when Developer mode is enabled.
- Appearance currently renders after Advanced.
  Status: fixed; Appearance now renders after Gameplay and before Statistics.
- Settings scroll content uses fixed bottom padding only.
  Status: fixed; scroll content keeps its existing bottom padding and adds the safe-area bottom inset.

## Testing

Planned:

- `yarn typecheck:fallback`
- `yarn lint -- app/settings.tsx` if the repo script accepts file arguments, otherwise use the repo's targeted lint binary directly.
- Real web verification at `http://localhost:8081/settings` using the running Expo web app, or start it with `yarn web` if needed.
- Native Android verification with `yarn release` and `agent-device` because the bottom-spacing concern is Android dock-specific.

Results:

- `yarn typecheck:fallback` passed.
- `yarn exec oxlint --tsconfig tsconfig.json app/settings.tsx` passed with 0 warnings and 0 errors.
- `yarn exec oxfmt --check app/settings.tsx docs/product/settings-clean-up/settings-clean-up.md` passed after formatting this plan file.
- Web tester report: started Expo web with `yarn web`, opened `http://localhost:8081/settings`, and verified the section order is exactly Gameplay, Appearance, Statistics, Advanced.
- Web tester report: with Developer mode off, Animations and Display refresh rate were hidden.
- Web tester report: after enabling Developer mode, Animations appeared under Advanced.
- Web tester report: Display refresh rate did not appear on web, which is expected because the control is Android-only.
- Web tester report: the scroll content kept `paddingBottom: 48px` on web, where the safe-area bottom inset resolves to 0.
- Android tester report: no active native build was found before starting; `yarn release` completed `:app:assembleRelease` successfully in 17s, then could not install to an offline wireless device.
- Android tester report: installed the generated release APK on emulator `emulator-5554` (`Pixel_9_API_36`) and confirmed package `ch.karimattia.soli`, `versionName=0.8.0`, `versionCode=13`, `targetSdk=36`.
- Android tester report: section order passed, Developer mode off hid Animations and Display refresh rate, and Developer mode on showed Animations under Advanced.
- Android tester report: Display refresh rate appeared only after Developer mode was enabled, under the Advanced developer area.
- Android tester report: bottom content ended visibly above the Android navigation area with clear extra whitespace.
- Android screenshots were captured at `/tmp/soli-android-test/settings-dev-off-top.png`, `/tmp/soli-android-test/settings-dev-off-scroll-1.png`, `/tmp/soli-android-test/settings-dev-on.png`, and `/tmp/soli-android-test/settings-dev-on-bottom-3.png`.
- Caveat: the `agent-device` binary was unavailable to the tester, so Android UI interaction used ADB/UIAutomator fallback after reading the `agent-device` skill.
