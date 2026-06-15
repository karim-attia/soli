# Refresh Rate Setting Removal Remove ineffective refresh-rate control

## User prompt

```text
I at some point introduced a frame rate setting.
The goal was to force 120hz even when battery saver is on. The game animations don't look so good on 60hz. It still works, but just doesnt feel so nice.
But this doesn't work.
Now, we have that setting and kinda the only thing that setting does is to reduce framerates if the user changes it. Which does the opposite of what i want.
speeding up seems never to be possible.
so my idea is to remove this setting. and reduce the complexity throughout the app. the extra module etc.
does this make sense?
if yes, do a comprehensive analysis and remove this.
```

```text
reducedMotionEnabled
What is this? why do we have this? can we also remove?
```

## Description

Remove the Android display refresh-rate setting and its custom Expo native module.

The feature was introduced to force a high display refresh rate when Android Battery
Saver is active. Android does not grant apps that authority: frame-rate APIs express
preferences to the display scheduler, while Battery Saver can cap the display at 60 Hz
or below. The current default already requests the maximum detected rate, so the only
meaningful user action is to clear that preference and potentially allow a lower rate.
That makes the control contrary to its original purpose.

The implementation also carries disproportionate complexity:

- Android-only capability detection and conditional Settings UI.
- A persisted setting, setter, validation helper, and startup side effect.
- A custom Expo module with Kotlin, Gradle, manifest, and TypeScript bridge files.
- Fallback behavior for unsupported platforms.
- Documentation that describes a force-high capability the platform does not guarantee.

The native implementation calls `WindowManager.LayoutParams.preferredRefreshRate`,
despite comments and delivery documents describing `Surface.setFrameRate()`. Both are
preferences rather than overrides. The asynchronous bridge also returns `true` before
the UI-thread update executes and silently catches native exceptions, so its success
result cannot prove that the preference was applied.

Follow-up analysis: `reducedMotionEnabled` mirrored the operating-system accessibility
preference for reduced motion. On web, React Native maps it to the browser's
`prefers-reduced-motion` media query. When enabled, Soli suppressed card flights, waste
slides, invalid-move wiggles, card flips, foundation glow, celebrations, stack navigation
transitions, and toast movement. It used React Native's built-in `AccessibilityInfo` API
and added no native module or external package.

This is materially different from the refresh-rate experiment:

- Refresh-rate requests cannot override the system policy they were meant to defeat.
- Reduced motion follows a system preference specifically intended for apps and games to
  honor.
- The refresh-rate feature adds a custom native module and persisted setting.
- Reduced motion adds one provider subscription and a small shared boolean policy.

The user strongly prefers removing cross-cutting behavior that is not required. The custom
reduced-motion policy is therefore removed: Soli no longer uses its own global boolean to
disable entire animation features based on the OS/browser preference, and gameplay feature
selection is controlled by the existing in-app animation toggles. Reanimated and Tamagui
may still honor reduced motion inside their own animation primitives. This also moves
operating-system state out of the Settings provider, where it was architecturally
misplaced.

The custom policy did not control the navigation drawer/menu animation. The drawer in
`app/(tabs)/_layout.tsx` had no reduced-motion branch. It only changed stack transitions
for the modal, Settings, and History routes, plus toast and gameplay behavior.

## Acceptance Criteria

- Settings no longer displays a refresh-rate section on any platform.
- The Settings screen no longer imports, queries, or stores refresh-rate capability data.
- `SettingsState` and `SettingsContextValue` no longer expose `refreshRateMode` or
  `setRefreshRateMode`.
- Settings hydration safely ignores the obsolete `refreshRateMode` key in existing
  AsyncStorage data.
- The startup effect that invokes the native refresh-rate bridge is removed.
- The complete `modules/expo-refresh-rate` source module is removed.
- Android native builds no longer discover or compile `ExpoRefreshRateModule`.
- Existing animation and developer settings continue to work.
- The custom `reducedMotionEnabled` state, listener, hook, Settings notice, navigation
  overrides, and toast branches are removed.
- Gameplay continues to respect the existing in-app animation toggles.
- Current product/release documentation no longer presents the experiment as an active
  capability; historical implementation documents remain available with a retirement
  notice.

## Design links

- Android frame-rate guidance:
  https://developer.android.com/media/optimize/performance/frame-rate
- AOSP multiple refresh-rate policy:
  https://source.android.com/docs/core/graphics/multiple-refresh-rate
- React Native `AccessibilityInfo`:
  https://reactnative.dev/docs/accessibilityinfo
- Apple motion guidance:
  https://developer.apple.com/design/human-interface-guidelines/motion
- React Native Reanimated `useReducedMotion`:
  https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion/

Research checked on 2026-06-14:

- Android says the scheduler considers multiple factors and does not guarantee the
  requested frame rate.
- Android explicitly lists Battery Saver as a case where the platform may refuse an
  app's frame-rate request.
- AOSP documents that low power mode restricts the refresh rate to 60 Hz or lower.
- Android recommends that games continue to work correctly when the display does not
  switch to the requested rate.

Reduced-motion follow-up checked on 2026-06-15:

- React Native documents `isReduceMotionEnabled()` and the `reduceMotionChanged` event for
  observing the system preference.
- Apple says apps and games should make motion optional and respond to Reduce Motion.
- React Native Reanimated also treats the system reduced-motion preference as a supported
  cross-platform animation policy.

## Possible approaches incl. pros and cons

### 1. Remove the setting, state, side effect, and native module

Pros:

- Fully removes a control that cannot achieve its stated goal.
- Restores Android's normal refresh-rate policy without app-level display hints.
- Removes the complete native and JavaScript maintenance surface.
- Prevents users from selecting an option that can only weaken the existing preference.

Cons:

- On devices where the current preference successfully keeps a high refresh rate outside
  Battery Saver, Android regains discretion and may choose a lower rate.

Recommendation:

- Use this approach. It matches the requested simplification and avoids promising control
  the operating system retains.

### 2. Remove only the UI and always request the maximum rate

Pros:

- Preserves any benefit the current preference provides outside Battery Saver.
- Removes the user-facing option that can clear the preference.

Cons:

- Keeps the custom native module, startup side effect, and platform-specific complexity.
- Still cannot override Battery Saver, thermal policy, OEM policy, or competing surfaces.
- Hides an ineffective policy decision instead of removing it.

Recommendation:

- Do not use because it misses the complexity-reduction goal.

### 3. Replace the module with `Surface.setFrameRate()` or a frame-pacing library

Pros:

- Better matches current Android guidance for communicating intended frame cadence.
- Could help pacing or mode selection in supported conditions.

Cons:

- Still cannot override Battery Saver's refresh-rate cap.
- Adds or preserves native integration complexity.
- Solves a broader animation-pacing problem that the user did not request.

Recommendation:

- Treat any future animation pacing investigation as a separate task with measured frame
  timing data.

### 4. Also remove `reducedMotionEnabled`

Pros:

- Removes one provider state value, one effect/subscription, one hook, and a few
  conditional animation branches.

Cons:

- Ignores an explicit OS accessibility preference.
- Re-enables substantial motion for users who requested less motion.
- Removes useful behavior from gameplay, navigation, and toast surfaces.
- Does not remove a dependency or native module because it uses React Native core.
- Conflates an effective accessibility policy with the ineffective refresh-rate
  experiment.

Recommendation:

- Remove it per the user's explicit product preference. Record that this is an
  accessibility tradeoff, not a technical no-op like the refresh-rate setting.

## Open questions to the user incl. recommendations (if any)

- None blocking.
- Recommendation: remove the experiment completely. If 60 Hz animation quality remains
  unacceptable, investigate animation duration/easing and dropped frames as a separate
  performance task rather than trying to override display power policy.
- Decision: remove `reducedMotionEnabled`. If OS-level reduced-motion support is restored
  later, keep it outside the persisted Settings provider and scope it deliberately.

## New dependencies

- None.
- No external package guide is required because this change removes a local module and
  does not add a package.

## UX/UI Considerations

- Remove the entire "Display refresh rate" developer section instead of replacing it with
  explanatory disabled UI.
- Keep the rest of the Advanced section and animation controls unchanged.
- Update the Developer mode description so it no longer mentions display tuning.
- Do not expose stale persisted values or migration messaging to users.

## Components -> Which components to reuse, which components to create?

- Reuse the existing `SettingsScreen`, `ToggleRow`, and Tamagui components.
- Create no new UI components.
- Remove the refresh-rate option button group and its local capability state.

## How to fetch data, how to cache

- No remote data is involved.
- Remove native capability reads for maximum/current refresh rate.
- Existing settings continue to hydrate from `@soli/settings/v1`.
- No storage-version migration is needed: `mergeSettings` constructs the supported state
  shape and ignores unknown persisted keys. The next successful settings write naturally
  removes the obsolete `refreshRateMode` key.

## Related tasks

- `docs/delivery/27/` contains the historical implementation PBI.
- `docs/product/settings-clean-up/settings-clean-up.md` previously moved the control into
  Developer mode and is superseded for this one setting.
- A future 60 Hz animation-quality audit is intentionally out of scope.

## Steps to implement and status of these steps

- [completed] Research current Android refresh-rate and Battery Saver behavior.
- [completed] Audit UI, state, persistence, native module, build discovery, and docs.
- [completed] Create this implementation plan before changing application code.
- [completed] Remove refresh-rate UI and Settings state integration.
- [completed] Delete the local Expo refresh-rate module.
- [completed] Mark current and historical product documentation appropriately.
- [completed] Run static checks and inspect the final source diff.
- [completed] Check web behavior and confirm React Native maps the signal to
  `prefers-reduced-motion`.
- [completed] Remove the custom reduced-motion policy per the user's explicit preference.
- [completed] Cancel further testing because the user explicitly requested no testing.
- [completed] Record the final file list and decision rationale.

## Plan: Files to modify

- `app/settings.tsx`
- `app/_layout.tsx`
- `components/CurrentToast.tsx`
- `src/state/settings.tsx`
- `modules/expo-refresh-rate/expo-module.config.json` (delete)
- `modules/expo-refresh-rate/android/build.gradle` (delete)
- `modules/expo-refresh-rate/android/src/main/AndroidManifest.xml` (delete)
- `modules/expo-refresh-rate/android/src/main/java/expo/modules/refreshrate/ExpoRefreshRateModule.kt`
  (delete)
- `modules/expo-refresh-rate/src/ExpoRefreshRateModule.ts` (delete)
- `modules/expo-refresh-rate/src/index.ts` (delete)
- `docs/product/refresh-rate-setting-removal/remove-refresh-rate-setting.md`
- `docs/product/settings-clean-up/settings-clean-up.md`
- `docs/delivery/27/prd.md`
- `docs/delivery/27/tasks.md`
- `docs/delivery/27/27-1.md`
- `docs/delivery/27/27-2.md`
- `docs/delivery/27/27-3.md`
- `docs/delivery/27/27-4.md`
- `docs/delivery/backlog.md`
- `docs/RELEASE-NOTES.md`

## Files actually modified

- `app/settings.tsx`
- `app/_layout.tsx`
- `components/CurrentToast.tsx`
- `src/state/settings.tsx`
- `modules/expo-refresh-rate/expo-module.config.json` (deleted)
- `modules/expo-refresh-rate/android/build.gradle` (deleted)
- `modules/expo-refresh-rate/android/src/main/AndroidManifest.xml` (deleted)
- `modules/expo-refresh-rate/android/src/main/java/expo/modules/refreshrate/ExpoRefreshRateModule.kt`
  (deleted)
- `modules/expo-refresh-rate/src/ExpoRefreshRateModule.ts` (deleted)
- `modules/expo-refresh-rate/src/index.ts` (deleted)
- `docs/product/refresh-rate-setting-removal/remove-refresh-rate-setting.md`
- `docs/product/settings-clean-up/settings-clean-up.md`
- `docs/delivery/27/prd.md`
- `docs/delivery/27/tasks.md`
- `docs/delivery/27/27-1.md`
- `docs/delivery/27/27-2.md`
- `docs/delivery/27/27-3.md`
- `docs/delivery/27/27-4.md`
- `docs/delivery/backlog.md`
- `docs/RELEASE-NOTES.md`

## Identified issues and status of these issues

- Battery Saver caps Android refresh rate at 60 Hz or below.
  Status: confirmed platform constraint; cannot be overridden by this app feature.
- `reducedMotionEnabled` looked related because it also affects animations.
  Status: removed per product preference after confirming its web and native purpose.
  This intentionally stops honoring the OS/browser reduced-motion preference globally.
- The app describes a preference as a force-high control.
  Status: fixed; the control and application-side preference were removed.
- The only non-default selection clears the high-rate preference and can reduce refresh
  rate.
  Status: fixed; the user-facing selection no longer exists.
- Native comments/documentation say `Surface.setFrameRate()` while implementation uses
  `WindowManager.LayoutParams.preferredRefreshRate`.
  Status: fixed; the native module was deleted.
- The native promise resolves before the UI-thread update and swallows update failures.
  Status: fixed; the native module was deleted.
- Existing installs may have `refreshRateMode` in persisted JSON.
  Status: safe by design; unknown keys are dropped by the existing merge-and-save flow.

## Testing

Planned:

- No further tests after the reduced-motion removal, per the user's explicit request.

Results:

- `yarn typecheck` passed using the repo's primary `tsgo` configuration.
- `yarn typecheck:fallback` is blocked by existing TypeScript 6 deprecation errors in
  `tsconfig.json` for `baseUrl`, `downlevelIteration`, `module=System`, and
  `moduleResolution=node10`. This is unrelated to the refresh-rate removal.
- `yarn exec oxlint --tsconfig tsconfig.json app/settings.tsx src/state/settings.tsx`
  passed with 0 warnings and 0 errors.
- `yarn exec oxfmt --check` passed for the changed TypeScript files, this implementation
  plan, and the settings-cleanup supersession note.
- Historical delivery/release Markdown files already require broad formatter changes;
  they were reviewed with `git diff --check` instead to avoid unrelated reformatting.
- Source and native configuration searches found no remaining runtime references to
  `ExpoRefreshRate`, `refreshRateMode`, `setRefreshRateMode`, or `expo-refresh-rate`.
- `git diff --check` passed.
- Before removal, web inspection confirmed React Native's accessibility signal maps to
  `prefers-reduced-motion`.
- Source search after removal found no remaining custom `reducedMotionEnabled`,
  `useReducedMotionPreference`, `isReduceMotionEnabled`, or `reduceMotionChanged`
  references.
- No typecheck, lint, build, or post-edit UI test was run for the reduced-motion removal,
  as requested.
- Real-environment web and Android results are pending.
