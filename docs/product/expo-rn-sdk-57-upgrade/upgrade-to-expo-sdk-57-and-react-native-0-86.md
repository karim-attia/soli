# Expo/RN SDK 57 Upgrade Upgrade to Expo SDK 57 and React Native 0.86

## User prompt

### Prompt 1

```text
upgrade to latest expo.
check blogs for this.
check expo upgrade skill. check if there is an update to it.
```

### Prompt 2

```text
i just ran 20 demo games on android. pls get ram usage data and tell me and document.
also just ran 20 games on ios. but crashed. pls check why.
```

### Prompt 3

```text
I just restarted the Android app. Please check how much it uses just after this restart, but this just for curiosity. Yeah, please do that upgrade or at least tell me if there's any drawbacks of that, and then do a small test as well to check if this is then fine, especially rerun the 20 games and see if that actually then works. Thank you.
```

### Prompt 4

```text
connected
```

### Prompt 5

```text
Are there any disadvantages over having that newer version pinned? Or if that just was, do you think, just this is a small patch that was not available when it was pinned and will be pinned soon? Can you check what the .1 does? Is this just a bug fix or also something else? Also compare the RAM usage versus before, with the change. I think we have some documentation somewhere. And check iOS. Is there RAM usage on iOS? And how, like, is there a way to see this, how this was affected after a couple of games and is that kind of running fine? Thank you.
```

### Prompt 6

```text
just ran 20 games on ios. quickly check ram usage and kill the app and check after app is fresh.
```

## Description

Upgrade Soli from Expo SDK 56 to Expo SDK 57, the latest stable Expo SDK as of
2026-07-04. Expo SDK 57 is a focused release that moves Expo from React Native
0.85 to React Native 0.86 while keeping React on 19.2.3.

This should be a narrower upgrade than the SDK 56 move, but it still changes native
runtime packages, generated native projects, Reanimated, Worklets, Gesture Handler,
and Expo modules. Soli is animation-heavy, so fresh native builds and smoke tests are
part of the upgrade, not a nice-to-have.

Current local baseline:

| Area | Current | Target |
| --- | --- | --- |
| Expo SDK | `^56.0.0` (`expo@56.0.12` installed) | `^57.0.0` (`expo@57.0.2` latest on npm) |
| React Native | `0.85.3` | `0.86.x` |
| React | `19.2.3` | `19.2.3` |
| Node | `v25.9.0` | OK; Expo minimum is `22.13.x` |
| Xcode | `26.6` | OK; SDK 56+ minimum is `26.4+` |
| Native dirs | local `ios/` and `android/` exist | ignored/generated CNG output |

Sources checked on 2026-07-04:

- https://expo.dev/changelog/sdk-57
- https://docs.expo.dev/versions/latest/
- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- https://reactnative.dev/blog/2026/06/11/react-native-0.86
- https://github.com/expo/skills/tree/main/plugins/expo/skills/upgrading-expo

## Acceptance Criteria

- `package.json` and `yarn.lock` are aligned to Expo SDK 57 with Expo tooling rather
  than manual version guessing.
- `npx expo install expo@^57.0.0 --fix` succeeds.
- `npx expo install --check` passes.
- `npx expo-doctor@latest` passes, or every remaining warning is documented with a
  scoped rationale.
- `docs/external-package-guides/expo.md`, `docs/external-package-guides/react-native.md`,
  and `docs/external-package-guides/react-native-reanimated.md` are refreshed with the
  SDK 57 facts needed for this upgrade.
- Local `android/` and `ios/` directories remain treated as generated/ignored output;
  no tracked native project files are added.
- No intentional UI redesign, React Compiler adoption, Android edge-to-edge opt-in, or
  optional SDK 57 feature adoption is bundled into this upgrade.
- If SDK 57 diagnostics allow it, move iOS deployment target config from
  `expo-build-properties` to built-in `ios.deploymentTarget` and remove the now
  unnecessary config plugin/dependency.
- Cheap gates pass: `yarn format:check`, `yarn typecheck`, `yarn lint`,
  `yarn jest --runInBand`, and `yarn check:tamagui`.
- A clean iOS simulator build is created and smoke-tested with `yarn ios`.
- An Android release build is created with `yarn release`, installed on the physical
  device, and smoke-tested after confirming the installed build is fresh.
- Native builds are serialized. Any stale or competing Expo/Xcode/Gradle build process
  is stopped before starting a new native build.
- Main gameplay, card animations, drawer, settings, history, sheets/modals, Android
  back behavior, safe areas, and logs are checked.
- Android native/process RAM usage is sampled and documented immediately after the
  user's 20-game demo run, including the measurement method and interpretation limits.
- The iOS crash after the user's 20-game run is identified from retained simulator/app
  evidence where possible, with the failure mode and likely cause documented.
- Android native/process RAM is sampled from the user's freshly restarted process before
  any patch build replaces it.
- Worklets is patched to `0.10.1` with the Expo alignment exception documented, cheap
  gates pass, and fresh native builds are validated serially.
- The same 20-game iOS demo playlist completes on the patched build without the prior
  Worklets native abort or another crash.
- iOS resident memory is captured from the user's live post-20-game process and compared
  with a freshly launched, visibly loaded game process using the same simulator method.
- No staging or commits.

## Possible approaches incl. pros and cons

| Approach | Pros | Cons |
| --- | --- | --- |
| Official Expo 56 -> 57 flow | Smallest change; matches Expo docs; lets Expo choose managed package versions. | Still requires fresh native builds and runtime smoke tests. |
| Manual package pinning | More apparent control over exact versions. | Higher mismatch risk, especially for Expo modules, Reanimated, and Worklets. |
| Upgrade plus optional SDK 57 features | Could modernize more quickly. | Scope creep; harder rollback; noisier validation. |

Recommendation: use the official Expo upgrade flow, plus the small app-config
simplification if diagnostics support removing `expo-build-properties`.

## Open questions to the user

| Question | Possible answers | Recommendation |
| --- | --- | --- |
| Stable or prerelease? | Stable SDK 57, canary, or beta. | Use stable SDK 57 only. |
| Enable React Compiler now? | Enable now or defer. | Defer; not needed for this upgrade. |
| Explicitly opt into Android edge-to-edge now? | Opt in now or only validate existing behavior. | Do not opt in; only smoke-test safe-area/status/nav behavior. |
| Add Worklets bundle mode for the Android memory regression? | Enable immediately or observe. | Defer unless testing shows a concrete memory regression. |
| Update the local Expo upgrade skill? | Patch local skill now or note upstream delta. | Do not block this upgrade; upstream added an SDK 56 router reference that Soli already handled. |
| Apply Worklets `0.10.1` after the iOS crash? | Patch now or remain on Expo's bundled `0.10.0`. | Track a focused patch plus clean native rebuild and 20-game regression run; this diagnostic task leaves dependencies unchanged. |

Prompt 3 resolves the Worklets question: apply `0.10.1`, document the intentional Expo
package-matrix exception, and validate it on fresh native builds.

Proceeding with the recommended answers unless the user redirects.

## Dependencies

No new app feature dependency is planned.

Expected Expo-managed version changes include:

- `expo` and Expo SDK packages to SDK 57-compatible versions.
- `react-native` from `0.85.3` to `0.86.x`.
- `react` and `react-dom` staying on `19.2.3`.
- `react-native-reanimated` from `4.3.x` to `4.5.x`.
- `react-native-worklets` from `0.8.x` to `0.10.x`.
- `react-native-gesture-handler` from `2.31.x` to `2.32.x`.
- `jest-expo`, `@expo/metro-runtime`, `@react-native/jest-preset`, Expo Router, and
  Expo modules to versions selected by `expo install --fix`.

Package guides used or updated:

- `docs/external-package-guides/expo.md`
- `docs/external-package-guides/react-native.md`
- `docs/external-package-guides/react-native-reanimated.md`
- `docs/external-package-guides/expo-router.md`

## UX/UI Considerations

No intended UX change.

Validation should focus on areas where native runtime changes can alter behavior:

- board layout and card geometry
- drag, tap, stock draw, undo, auto-up, and win animations
- drawer/header controls
- settings, history, and sheet/modal behavior
- Android hardware back
- safe areas, status bar, and navigation bar behavior on Android 15+ and iOS

## Components

Reuse existing components. No new UI components are planned.

Keep Tamagui wrapper/config files unless a verified SDK 57 diagnostic proves a specific
piece is redundant.

## How to fetch data, how to cache

Not applicable. This upgrade does not change app data fetching or caching.

## Related tasks

- Prior SDK 56 plan:
  `docs/product/expo-rn-sdk-56-upgrade/upgrade-to-expo-sdk-56-and-react-native-0-85.md`
- Existing package guides in `docs/external-package-guides/`
- Generated native font/CNG work, because local native folders exist but are ignored
- Existing animation/performance work, because Reanimated/Worklets change again

## Simplification ideas

- Move `expo-build-properties` iOS deployment target config to built-in
  `ios.deploymentTarget` if Expo Doctor and native builds agree.
- Remove `expo-build-properties` if it has no remaining purpose after that move.
- Keep `babel.config.js` and `metro.config.js`; current contents are still Tamagui
  integration, not plain Expo defaults.
- Do not add Worklets bundle mode preemptively; document the trade-off and validate first.

## Steps to implement

- [x] Research official SDK 57/RN 0.86 sources and Expo blog/changelog guidance.
- [x] Read the local `upgrading-expo` skill.
- [x] Check whether the local Expo upgrade skill has a CLI-tracked update path.
- [x] Compare the local Expo upgrade skill against the upstream Expo skills repo.
- [x] Inspect current repo dependency, Node, Xcode, and native-directory baseline.
- [x] Create this implementation plan before implementation.
- [x] Refresh package guides with SDK 57 facts.
- [x] Run `npx expo install expo@^57.0.0 --fix`.
- [x] Run any required install/lockfile repair command if Expo/Yarn requests it.
- [x] Move deployment target config away from `expo-build-properties` if supported.
- [x] Run `npx expo install --check` and resolve package alignment issues.
- [x] Run `npx expo-doctor@latest` and resolve or document findings.
- [x] Audit known SDK 57/RN 0.86 breakpoints and package workarounds.
- [x] Run cheap gates: format check, typecheck, lint, Jest, Tamagui check.
- [x] Check for competing native build processes before native validation.
- [x] Run clean iOS simulator build and smoke test.
- [x] Run Android release build, confirm fresh install, and smoke test on the physical device.
- [x] Update files modified, learnings, issues, and testing results after each step.
- [x] Capture and interpret Android RAM usage after the user's 20 demo games.
- [x] Locate and inspect the iOS crash evidence from the user's 20-game run.
- [x] Decide whether to reproduce the iOS crash. No reproduction was needed because the
  retained crash report symbolicated against the matching build.
- [x] Research authoritative upstream sources after the crash signature pointed to an
  Expo, React Native, Reanimated, Worklets, or platform issue.
- [x] Document the post-upgrade RAM and crash findings, artifacts, caveats, and status.
- [x] Capture Android RAM from the user's freshly restarted `0.10.0` process without
  relaunching it.
- [x] Apply the narrow Worklets `0.10.1` patch and add the minimum Expo install-check
  exception needed for the intentional bundled-version override.
- [x] Refresh the Reanimated/Worklets package guide with patch drawbacks and removal
  criteria for the Expo exception.
- [x] Run dependency diagnostics and cheap gates after the patch.
- [x] Check for competing native build processes, then create a clean iOS build.
- [x] Rerun the complete 20-game iOS demo playlist with bounded logs and crash-report
  checks; confirm the prior Worklets abort does not recur.
- [x] Clear stale Android external-native-build/CMake artifacts after the Worklets
  patch, then retry the Android release build from regenerated ignored output.
- [x] Create and install an Android release build after iOS completes, then run a small
  gameplay/celebration smoke test on the physical device.
- [x] Document final patch, build, runtime, memory-baseline, and residual-risk results.
- [x] Re-check the upstream Worklets `0.10.1` release scope and the current Expo
  bundled-version pin.
- [x] Compare Android RAM data before and after the Worklets `0.10.1` patch with
  source/method caveats.
- [x] Check whether iOS process RAM is available through current tooling, then capture
  launch and short-playlist samples if feasible.
- [x] Document the Worklets pinning trade-off, Android RAM comparison, and iOS memory
  findings.
- [x] Capture the user's live iOS process after 20 games, terminate it, and capture a
  valid fresh-game resident-memory baseline after a clean relaunch.

## Plan: Files to modify

Expected:

- `docs/product/expo-rn-sdk-57-upgrade/upgrade-to-expo-sdk-57-and-react-native-0-86.md`
- `docs/external-package-guides/expo.md`
- `docs/external-package-guides/react-native.md`
- `docs/external-package-guides/react-native-reanimated.md`
- `docs/external-package-guides/expo-router.md`
- `package.json`
- `yarn.lock`
- `app.json`
- `docs/external-package-guides/expo.md`
- `docs/external-package-guides/react-native.md`
- `docs/external-package-guides/react-native-reanimated.md`
- `package.json`
- `yarn.lock`

Likely:

- `app.json`

Possible only if checks require it:

- `docs/external-package-guides/expo-router.md`
- `babel.config.js`
- `metro.config.js`
- Jest setup/config files
- release/build scripts

Do not add tracked `android/` or `ios/` files.

## Files actually modified

- `app.json`
- `docs/external-package-guides/expo-router.md`
- `docs/external-package-guides/expo.md`
- `docs/external-package-guides/react-native-reanimated.md`
- `docs/external-package-guides/react-native.md`
- `package.json`
- `yarn.lock`
- `docs/product/expo-rn-sdk-57-upgrade/upgrade-to-expo-sdk-57-and-react-native-0-86.md`

## Intermediary learnings

- Expo SDK 57 was released on 2026-06-30 and is the latest stable SDK line on
  2026-07-04.
- `npm view expo` reports `latest: 57.0.2`.
- Expo latest docs map SDK 57 to React Native `0.86`, React `19.2.3`,
  React Native Web `0.21.0`, and minimum Node `22.13.x`.
- React Native 0.86 says there are no user-facing breaking changes from 0.85, but it
  includes Android edge-to-edge fixes, DevTools improvements, rendering/layout/animation
  fixes, and new deprecations.
- `npx skills check` reports no skills tracked in the lock file.
- `npx skills@latest check` reports no project skills to update.
- The upstream Expo `upgrading-expo` skill differs from the local skill by adding
  `references/react-navigation-to-expo-router.md`, an SDK 56 migration reference.
  Soli already has no direct `@react-navigation/*` imports.
- Local `ios/` and `android/` directories exist but are ignored and have no tracked files.
- `npx expo install --check` already reports SDK 56 patch drift before the SDK 57 upgrade.
- SDK 57 docs mark `expo-build-properties`'s `ios.deploymentTarget` plugin option as
  deprecated in favor of built-in `ios.deploymentTarget` app config.
- Refreshed package guides before dependency changes so SDK 57 assumptions are cached
  beside the existing SDK 55/56 notes.
- `npx expo install expo@^57.0.0 --fix` selected `expo@57.0.2`,
  `react-native@0.86.0`, `react-native-reanimated@4.5.0`,
  `react-native-worklets@0.10.0`, `react-native-gesture-handler@~2.32.0`,
  `@expo/ui@~57.0.3`, `expo-router@~57.0.3`, and SDK 57 Expo modules.
- Yarn reported peer dependency warnings after the Expo install; inspect them before
  treating dependency alignment as complete.
- `@react-native/jest-preset` stayed on `0.85.3` after the first Expo install; aligned it
  to `0.86.0` with `npx expo install --dev @react-native/jest-preset`.
- Moved the iOS deployment target from the `expo-build-properties` plugin to built-in
  `ios.deploymentTarget`, then removed `expo-build-properties`.
- `npx expo install --check` passes after the SDK 57 upgrade and config simplification.
- `npx expo-doctor@latest` passes all 20 checks.
- `yarn install --immutable` completes without lockfile changes, but still reports peer
  dependency warnings.
- Remaining source/config audit has no hits for direct `@react-navigation/*`,
  `StyleSheet.absoluteFillObject`, `ViewUtil.getUIManagerType`,
  `AppRegistry.setComponentProviderInstrumentationHook`, `EXPO_USE_FAST_RESOLVER`,
  `expo.install.exclude`, `useHermesV1`, or `expo-build-properties`.
- Cheap gates passed: `yarn format:check`, `yarn typecheck`, `yarn lint`,
  `yarn jest --runInBand` (11 suites / 56 tests), and `yarn check:tamagui`.
- Found and stopped an already-running Android release command plus an old
  AgentDeviceRunner `xcodebuild` session before native validation.
- First iOS validation attempt failed during CocoaPods install because ignored
  `ios/Podfile.lock` still referenced SDK 56 / RN 0.85 pods while tracked package
  state is SDK 57 / RN 0.86. This matches the CNG stale-native-output failure mode;
  run a clean iOS prebuild before retrying.
- Clean iOS CNG regeneration with `npx expo prebuild --platform ios --clean` fixed the
  stale pod mismatch, then `yarn ios` built, installed, and launched successfully on the
  `iPhone 17 Pro` simulator.
- iOS smoke passed for main board render, stock draw, new game, Settings, History,
  History preview sheet, return to Play, and no visible redbox/crash. The worker used
  deep links to leave Settings because the drawer/back controls were not available from
  the iOS accessibility tree there.
- Android release attempt generated a fresh release APK, but runtime validation is blocked
  because the physical device disappeared from ADB before install. The worker did not
  validate an old installed build.
- Android build attempt 1 hit repeated Gradle daemon Metaspace OOM after APK generation;
  the worker stopped the stale process tree. Attempt 2 completed `assembleRelease` in
  2m 48s but `yarn release` exited 1 at the install step with
  `adb: device 'adb-4139951e-zmJeED._adb-tls-connect._tcp' not found`.
- Fresh Android APK artifact exists at
  `android/app/build/outputs/apk/release/app-release.apk`, timestamp
  2026-07-04 08:09:22 CEST. `aapt` reports package `ch.karimattia.soli`,
  `versionName=0.8.0`, `versionCode=13`, `minSdk=24`, `targetSdk=36`,
  `compileSdk=36`.
- Final Android validation found A065 connected as
  `adb-4139951e-zmJeED._adb-tls-connect._tcp`, found no competing native build, and
  unlocked it with `scripts/android-unlock-pattern.sh` before starting the release.
- Final `yarn release` completed `assembleRelease` (`BUILD SUCCESSFUL`, 644 tasks),
  installed `app-release.apk`, and opened Soli on A065. The command then stopped Metro
  cleanly and exited 0. Device package state confirmed `ch.karimattia.soli` version
  `0.8.0` / code `13`, `lastUpdateTime=2026-07-04 17:30:31 CEST`, its installed package
  path, and a running `MainActivity` from that install.
- Android release smoke passed in one serialized `agent-device` session for relaunch,
  board/cards, deal again, stock draw, undo, a valid card tap move (`J clubs` onto
  `Q hearts`), drawer/header, Settings, History, history preview sheet, app-owned sheet
  back, and Android system back from History to Play.
- The draw-count setting was changed from 1 to 2 and restored to 1. Screenshots show
  correct status/navigation bar insets and no visible RedBox, LogBox, or crash.
- The bounded Android log window contains no fatal error, JS exception, React Native
  overlay, ANR, or native crash. A `FastPrintWriter` `EPIPE` warning came from an
  accessibility hierarchy dump after the stock UIAutomator fallback timed out; it was
  not an app runtime failure.
- The user's Android process survived the complete 20-game run and remained PID `2684`
  before the diagnostic attach, after attach, and after closing the diagnostic session.
  Three compact native memory samples measured PSS at `527.1`, `473.8`, and `468.3 MiB`
  and RSS at `513.5`, `461.1`, and `455.5 MiB`. Explicit compacting GCs between samples
  account for most of the decline; the post-GC footprint settled near `468 MiB` PSS.
- Android's largest post-run consumers were Native Heap (`134.6-160.2 MiB` PSS),
  Unknown/native-classified memory (`88.9 MiB`), Dalvik Heap (`12.8-45.6 MiB`),
  `.dex mmap` (`27.6 MiB`), and `.apk mmap` (`23.2 MiB`). No OOM, ANR, fatal exception,
  or native crash appeared in the bounded log window.
- A single post-workload Android point cannot prove or disprove a leak because no cold
  baseline, per-game checkpoints, or cleanup sample exists. It does establish the actual
  retained process footprint after this run. Expo also documents a separate SDK 57
  Android regression where Hermes V1 plus Reanimated adds roughly 25-30% memory.
- The iOS run produced a fully symbolicated native `EXC_CRASH` / `SIGABRT` at
  2026-07-04 17:57:06 +0200, not a jetsam/OOM, watchdog, simulator termination, or
  uncaught JavaScript exception. The failure was on
  `com.facebook.react.runtime.JavaScript` in Worklets `scheduleOnRN`, where
  `facebook::jsi::Value::getObject()` asserted because a reconstructed remote callback
  was no longer an object (`JSIWorkletsModuleProxy.cpp:455`).
- Proven cause: Worklets `0.10.0` invoked a no-longer-valid remote callback. Strong
  Soli-specific inference: repeated demo wins rapidly start and tear down celebration
  animations while `runOnJS(handleCelebrationComplete)` callbacks are pending. The native
  report cannot identify which JavaScript callback occupied the invalid registry entry.
- Worklets `0.10.1` was released on 2026-07-01 with fixes that tie React Native Runtime
  remote-function lifetime to TurboModule invalidation and close a time-of-check /
  time-of-use destructor race. Its peer metadata supports React Native `0.83-0.86`, and
  Reanimated `4.5.0` accepts Worklets `0.10.x`. Expo SDK 57 still bundles exact `0.10.0`,
  so adopting `0.10.1` is a deliberate patch override requiring clean native validation.
- The freshly restarted Android `0.10.0` process remained PID `12020` throughout the
  diagnostic attach and was about 3 minutes 25 seconds old at capture start. Three
  samples measured PSS at `296.8`, `290.8`, and `288.7 MiB` (mean `292.1 MiB`) and RSS
  at `450.3`, `444.5`, and `442.4 MiB` (mean `445.7 MiB`). No OOM, fatal signal, or ANR
  appeared in the bounded log evidence.
- Compared with the prior post-20-game settled sample, restart PSS was `176.2 MiB` lower
  (`37.6%` lower relative to the post-run value), while RSS was `9.8 MiB` lower. This is
  useful evidence of workload-associated growth, but it is not a controlled leak proof
  because the samples came from different process lifetimes without per-game checkpoints.
- `yarn add react-native-worklets@0.10.1 --exact` replaced the direct and locked
  Worklets `0.10.0` resolution with exact `0.10.1`. Expo's documented
  `expo.install.exclude` now exempts only `react-native-worklets` from Expo version
  checks; it does not disable native autolinking.
- The package guide now records the applied `0.10.1` patch, its supported
  Reanimated/RN range, mandatory clean native rebuild, manual compatibility burden while
  Expo validation is excluded, and the requirement to remove the exclusion once Expo
  recommends Worklets `0.10.1` or newer.
- Clean iOS validation for the Worklets `0.10.1` patch reused the freshly regenerated
  native project and completed `yarn ios` successfully on the `iPhone 17 Pro` simulator.
- The patched iOS build completed the same `soli:///?demo=playlist&games=20`
  regression path that previously crashed. The bounded app log recorded `20` game loads,
  `20` game completions, exactly one playlist-complete marker, and zero matches for the
  previous Worklets abort tokens (`SIGABRT`, `JSIWorkletsModuleProxy`, `getObject()`,
  `EXC_CRASH`, or uncaught JS/native fatal markers).
- The app remained alive after the iOS playlist run, showing the completed board and
  active celebration state in the post-run snapshot/screenshot. No new Soli crash report
  appeared in either `~/Library/Logs/DiagnosticReports` or the CoreSimulator
  `CrashReporter` tree after the manual regression start marker.
- Android Worklets `0.10.1` release validation on 2026-07-04 started with no competing
  native build processes. A065 was visible through ADB and `agent-device`, and
  `scripts/android-unlock-pattern.sh` unlocked the physical device before the build.
- The Android Worklets `0.10.1` release did not reach install or runtime smoke.
  `yarn release` failed during `assembleRelease` because `expo-modules-core` and
  Reanimated CMake/Ninja referenced
  `node_modules/react-native-worklets/android/build/intermediates/cxx/RelWithDebInfo/1aq5n95a/obj/arm64-v8a/libworklets.so`,
  but the current Worklets output existed under a different generated CMake hash
  (`633f3l41`) and the expected `1aq5n95a` path was absent.
- The Android worker stopped the Gradle daemon and tried the standard
  `cd android && ./gradlew clean` recovery. The clean partly removed native outputs but
  failed in `:app:externalNativeBuildCleanRelease` because stale app CMake/autolinking
  metadata referenced generated codegen JNI directories that no longer existed. A second
  `yarn release` retried from the partially cleaned state and failed with the same
  missing `libworklets.so` path. No source/package files were edited.
- Expo has an open/closed issue with the same Android release-build shape:
  `expo-modules-core` fails when Ninja expects `libworklets.so` at a generated Worklets
  path that is absent. Reanimated's Android build troubleshooting advises removing stale
  Android and package-level CMake/build artifacts for persistent native build errors, and
  explicitly advises against downgrading Reanimated/Worklets, changing Android Gradle
  Plugin, or disabling the New Architecture as a workaround.
- Removed only ignored/generated Android native build output after checking Git tracks
  nothing under the targets: `android/.gradle`, `android/build`, `android/app/.cxx`,
  `android/app/build`, plus `.cxx`/`build` under `react-native-worklets`,
  `react-native-reanimated`, and `expo-modules-core`. Artifact:
  `tmp/sdk57-worklets-0101/android/cmake-cache-cleanup.log`.
- Refreshed the Reanimated/Worklets package guide with the Android `libworklets.so`
  stale-CMake-cache failure mode and scoped Soli cleanup targets.
- After the generated-cache cleanup, the Android release retry passed the prior failure
  point. `expo-modules-core`, Reanimated, Worklets, Gesture Handler, and the app native
  CMake tasks rebuilt successfully, and `:app:assembleRelease` finished with
  `BUILD SUCCESSFUL in 5m 51s`.
- The fresh Android APK was regenerated at `2026-07-04T19:02:05+0200` with SHA-256
  `43a8c3f12f3096ef53bff9091ad34dc0fc01b924b6a3c70c2afb6b9f65ef20a4`, package
  `ch.karimattia.soli`, version `0.8.0` / code `13`, `minSdk=24`, `targetSdk=36`, and
  `compileSdk=36`.
- The release log printed install and open lines for A065 after the successful build, but
  ADB lost the device immediately afterward. Repeated `adb devices -l`, `adb mdns
  services`, `agent-device devices --platform android`, and an ADB server restart all
  found no Android device or wireless debugging mDNS service. Because the device vanished
  before package metadata could be read, the fresh install and small Android runtime smoke
  are not confirmed yet.
- After the user reconnected A065, package metadata confirmed the fresh Worklets `0.10.1`
  Android install: version `0.8.0` / code `13`, `lastUpdateTime=2026-07-04 19:02:40`,
  foreground `ch.karimattia.soli/.MainActivity`, and PID `30910`.
- ADB initially exposed two wireless-debugging services for the same phone, including a
  duplicate serial with a space/`(2)` suffix that made `agent-device devices` report no
  Android device. Disconnecting that duplicate alias and connecting to
  `192.168.1.12:40813` normalized the serial; `agent-device` then detected `A065`.
- The intended one-game Android smoke deep link first had its `&games=1` parameter
  stripped by Android's remote shell, which started the default 20-game playlist instead.
  This was kept because it is a stronger celebration/runtime regression than the planned
  one-game smoke.
- The patched Android release completed the full post-reconnect 20-game demo playlist:
  `20` game loads, `20` game completions, one playlist-complete marker, and zero matches
  for fatal/native/Worklets/JS overlay crash tokens. The app remained foreground after
  completion, with the screenshot showing the final celebration.
- Immediate post-20-game Android memory sample on Worklets `0.10.1` measured
  `543244 kB` PSS (`530.5 MiB`) and `691120 kB` RSS (`674.9 MiB`). Top PSS consumers were
  Native Heap `354270 kB`, Unknown `86092 kB`, `.apk mmap` `28090 kB`, `.dex mmap`
  `26040 kB`, and Gfx dev `21176 kB`. This was captured while the final celebration was
  still active, without forced compacting GCs, so compare it cautiously against the earlier
  compacted post-run and restarted-process baselines.
- Prompt 5 upstream re-check: Worklets `0.10.1` is a narrow patch release, not a feature
  adoption. The release has three cherry-picked fixes plus the release commit: Windows
  bundle-mode module-id path normalization, React Native Runtime remote-function lifetime
  tied to TurboModule invalidation, and time-of-check/time-of-use destructor safety. The
  latter two are the fixes that match Soli's prior iOS `JSIWorkletsModuleProxy.cpp:455`
  crash path.
- Expo SDK 57 still locally bundles exact Worklets `0.10.0` in
  `node_modules/expo/bundledNativeModules.json`, so Soli's exact `0.10.1` pin remains an
  intentional temporary override. The drawbacks are maintenance-only: Expo version checks
  skip this package while `expo.install.exclude` is present, and every Worklets change
  needs a clean native rebuild because JavaScript and native Worklets code must match.
  Runtime validation has passed on both platforms, and the override should be removed once
  Expo recommends `0.10.1` or newer.
- Android RAM comparison after the patch is mixed but not alarming. Fresh process
  comparison is the closest like-for-like point: Worklets `0.10.0` restart mean was
  `292.1 MiB` PSS / `445.7 MiB` RSS; Worklets `0.10.1` fresh relaunch measured
  `320.3 MiB` PSS / `461.0 MiB` RSS. That is about `+28.2 MiB` PSS and `+15.3 MiB` RSS,
  within the noise expected from restored game state and one-vs-three-sample methods.
  Post-20 comparison is less controlled: old `0.10.0` settled near `489.7 MiB` mean PSS
  after compacting GCs, while the new immediate `0.10.1` celebration sample was
  `530.5 MiB` PSS. A later process-only Android sample, before a fresh relaunch, measured
  `373.9 MiB` PSS but had a black/AX-empty visual state, so it is not counted as a
  gameplay-equivalent comparison.
- iOS RAM is available through `agent-device perf memory sample --json` on the simulator.
  It reports resident memory from a `ps` process snapshot for the running app executable;
  deeper follow-up is available through `agent-device perf memory snapshot --kind memgraph`,
  Xcode's Debug Navigator memory report, Instruments Leaks/Allocations, or jetsam reports
  if a real device/app is killed for memory pressure. The small iOS memory check completed
  a clean 3-game playlist with `loaded=3`, `completed=3`, `playlist_complete=1`, and
  `crash_tokens=0`. The launch sample was noisy at `794160 kB` (`775.5 MiB`) resident
  because it was captured around dev-bundle load; after 3 games it measured `511328 kB`
  (`499.3 MiB`) immediately and `555744 kB` (`542.7 MiB`) after a 10 second settle. No new
  Soli crash report appeared after the iOS memory check.
- Prompt 6 iOS comparison used the same `ps-process-snapshot` resident-memory method on
  the same iPhone 17 Pro simulator. The live process immediately after the user's 20-game
  run measured `693616 kB` (`677.4 MiB`). A clean rebuilt/relaunched process measured
  `613776 kB` (`599.4 MiB`) once the board became visible and `495520 kB` (`483.9 MiB`)
  after 10 seconds idle. The post-run point is therefore `78.0 MiB` above loaded-fresh
  and `193.5 MiB` above settled-fresh, but it was not given a matching idle window, so
  this remains a growth signal rather than proof of a leak.
- The first relaunch attempt had no Metro script URL and displayed the React Native error
  shell. Its `264.5 MiB` immediate and `213.0 MiB` settled readings are deliberately
  excluded from gameplay comparison. A clean `yarn ios --no-build-cache` build then
  succeeded with 0 errors / 1 existing duplicate `-lc++` warning, installed, launched,
  bundled, and showed the restored gameplay board before the valid fresh samples were
  taken. This is a fresh process baseline, not cleared app data.

## Deferred SDK 57 code-adoption candidates

These are optional follow-ups discovered after the baseline upgrade. None is required
for SDK 57 compatibility, and the current implementation remains the tested default.

| Candidate | Recommendation | Reason |
| --- | --- | --- |
| `Stack.Toolbar` / Android toolbar badges | Do not adopt now; re-check on Expo upgrades. | SDK 57's highlighted change is Android badge support. Soli's main headers belong to a Drawer, not a Stack; the API is alpha, native-only, and Soli has no badge requirement. A 2026-07-05 Settings prototype rendered no left toolbar item in the Drawer-owned header, matching installed Router source: composition options are merged only into matching native Stack route descriptors. |
| Expo UI `Host.seedColor` | Defer. | A resolved Soli green can theme native switches through Material 3 on Android and SwiftUI tint on iOS, but Android also derives the whole Material palette from the seed. The native-default Settings pass starts unseeded; re-add tint only after screenshot comparison. |
| History preview sheet | Leave unchanged. | Its requirement is to show the existing preview and adjust the sheet to that content, which the current content-fit `RNHostView matchContents` implementation already does. Detents would add unjustified interaction and complexity. |
| Expo UI `FieldGroup` Settings form | Adopted as a separate implementation task. | The implementation plan keeps settings state unchanged while replacing the manual ScrollView/Tamagui sections, one-Host-per-switch layout, custom settings typography, helper footer copy, and segmented draw-count island with one native-default FieldGroup form. The one-use form lives directly in `app/settings.tsx`, while `DrawCountPreference` remains a focused control boundary. Draw count stays a durable persistent setting and uses the universal native Picker on iOS and Android; Android's exposed-dropdown TextField look is imperfect, but the tested compact row/menu/bottom-sheet/segmented/slider alternatives did not receive nested gestures reliably inside FieldGroup. |
| Expo UI native header icon | Adopted as a separate implementation task. | Replace the Tamagui/Lucide drawer glyph with Expo UI `Icon`, using SF Symbols on iOS and Material Symbol XML on Android through `@expo/material-symbols`. Omit explicit glyph sizing so Expo UI uses the 24-unit native/intrinsic default, while retaining app-owned 44pt iOS / 48dp Android control minima and a 4pt iOS optical inset. Keep the drawer button in the leading header slot on both platforms because Android top-app-bar guidance defines navigation icons as leading and actions as trailing. `Stack.Toolbar` remains alpha and does not fit these Drawer-owned headers. |

React Native 0.86's changes relevant to current Soli code are automatic runtime fixes,
not APIs that require migration: edge-to-edge `measureInWindow` correctness benefits the
Undo scrubber; status-bar/modal, Dimensions, layout, hit-testing, and animated mounting
fixes apply under existing code. Soli does not use `expo-image`, `expo-navigation-bar`,
React Native `BackHandler`, `KeyboardAvoidingView`, or the newly highlighted image/cache
APIs, so there is no useful adoption change for those areas now.

### Future Expo Upgrade Check: Stack.Toolbar

Last evaluated: 2026-07-05 with `expo-router@57.0.3`.

- Check whether `Stack.Toolbar` has left alpha and whether its API changed.
- Separately check whether it supports Drawer-owned headers or a navigator-agnostic
  composition registry. Stability alone does not fix Soli's current header ownership.
- Re-run a one-screen Drawer prototype before changing navigation.
- Do not add nested Stacks solely for the menu icon.
- If Drawer support exists, expect small-to-medium code work across Play, Hello,
  Settings, History, `HeaderMenuButton`, and Play's right-side actions, followed by
  medium iOS/Android validation. Without Drawer support, changing header ownership would
  be medium-to-large work and is not justified by this icon alone.

Detailed Expo UI scope, row mappings, risks, and a staged FieldGroup migration are in
`docs/external-package-guides/expo-ui.md`. Toolbar applicability is clarified in
`docs/external-package-guides/expo-router.md`.

## Identified issues

- Issue: Local Expo upgrade skill has no CLI-tracked update metadata.
  Status: Continue with local skill plus direct upstream comparison and official docs.
- Issue: Upstream skill has an SDK 56 router reference missing locally.
  Status: Not blocking SDK 57; document only unless future skill maintenance is requested.
- Issue: Android Hermes V1 plus Reanimated can increase memory usage by 25-30%.
  Status: Known upstream regression; monitor, do not preemptively add Worklets bundle mode.
- Issue: SDK 57 `expo prebuild` now clears/regenerates native folders by default.
  Status: Compatible with Soli's ignored generated native folder workflow; verify no tracked native files are added.
- Issue: Current `expo-build-properties` deployment target config is now a simplification candidate.
- Status: Resolved by using built-in `ios.deploymentTarget` and removing the package;
  Expo dependency check and Doctor pass.
- Issue: Yarn reports remaining peer warnings, including Worklets wanting
  `@react-native/metro-config` and existing Tamagui/Jest/Babel package-internal peers.
  Status: Documented for now; Expo alignment and Doctor pass, so do not add packages
  unless tests or native builds expose a real failure.
- Issue: First `yarn ios` failed during CocoaPods install because ignored
  `ios/Podfile.lock` still contained SDK 56 pod versions.
  Status: Resolved by clean iOS prebuild; retry build and smoke passed.
- Issue: iOS `yarn ios` emitted a duplicate `-lc++` warning and launch console warnings
  about background-fetch/remote-notification delegate methods without matching
  `UIBackgroundModes`.
  Status: Documented as non-blocking; no crash/redbox in smoke test.
- Issue: Settings screen drawer/back controls were not usable from the iOS accessibility
  tree during smoke testing.
  Status: Documented; app deep links allowed the worker to continue validation.
- Issue: Android runtime smoke is blocked because the physical device disappeared from
  ADB before install.
  Status: Resolved. A065 reconnected, the final release run installed and launched the
  fresh APK, and the physical-device smoke test passed. Historical failed attempts are
  preserved above.
- Issue: First Android release attempt hit Gradle daemon Metaspace OOM.
  Status: Resolved for this upgrade validation. The final serialized release completed
  without Metaspace OOM; no retry was needed.
- Issue: Android accessibility snapshots were sparse/slow on animated React Native
  screens and fell back to stock UIAutomator.
  Status: Non-blocking tool limitation. Visual checks used screenshots and interactions
  used screenshot-guided coordinates; the History sheet exposed a stable close control.
- Issue: Android retained roughly `468 MiB` PSS after compacting GC following 20 demo
  games, with a three-sample range of `468-527 MiB`.
  Status: Measured and documented. No memory failure was observed, but the lack of a
  baseline means growth/leak rate is unknown. A future comparison should sample the same
  process before game 1, after fixed checkpoints, and after cleanup.
- Issue: iOS crashed after 20 demo games in Worklets `0.10.0` while resolving a stale
  `scheduleOnRN` remote callback.
  Status: Fixed in the tested iOS regression path by the Worklets `0.10.1` patch. The
  clean rebuilt app completed 20/20 demo games with no recurrence of the native abort
  signature and no fresh Soli crash report.
- Issue: Excluding `react-native-worklets` from Expo dependency validation means Expo
  will not flag future Worklets version drift while the exclusion remains.
  Status: Accepted temporarily for the focused `0.10.1` crash fix. Remove the exclusion
  once Expo recommends Worklets `0.10.1` or newer.
- Issue: Restarted Android PSS averaged `292.1 MiB`, versus `468.3 MiB` after compacting
  GC in the earlier 20-game process.
  Status: Baseline documented for comparison. Treat the `176.2 MiB` difference as a
  growth signal, not a per-game leak rate, until one instrumented run samples the same
  process at restart, fixed game counts, and cleanup.
- Issue: Android Worklets `0.10.1` release build fails before install because dependent
  native modules still reference a stale Worklets CMake output hash
  (`1aq5n95a/libworklets.so`) while the rebuilt Worklets native output exists under a
  different hash.
  Status: Resolved for build. A targeted cleanup of ignored Android/CMake output removed
  the stale native-build metadata, and the next `yarn release` completed
  `assembleRelease`.
- Issue: Android Worklets `0.10.1` runtime smoke is blocked because A065 disappeared
  from ADB after the successful release build/install/open log lines.
  Status: Resolved. A065 reconnected, the fresh `lastUpdateTime=2026-07-04 19:02:40`
  install was confirmed, and the Android release completed a full 20-game demo playlist
  with no fatal/native/JS/Worklets crash markers.
- Issue: Duplicate Android wireless-debugging service names can expose a serial with a
  space/`(2)` suffix and make `agent-device` report `DEVICE_NOT_FOUND`.
  Status: Resolved for this validation by disconnecting the duplicate mDNS alias and
  connecting to the plain IP serial `192.168.1.12:40813`.
- Issue: The iOS post-20-game resident-memory point was captured immediately, while the
  fresh process also has a 10-second idle sample.
  Status: Document both deltas and do not infer a per-game leak rate. A controlled run
  should sample at launch and fixed game checkpoints with identical idle windows.

## Testing

Cheap gates:

```sh
npx expo install --check
npx expo-doctor@latest
yarn format:check
yarn typecheck
yarn lint
yarn jest --runInBand
yarn check:tamagui
```

Current results:

- `npx expo install --check`: pass
- `npx expo-doctor@latest`: pass, 20/20 checks
- `yarn install --immutable`: pass with peer warnings
- `yarn format:check`: pass
- `yarn typecheck`: pass
- `yarn lint`: pass
- `yarn jest --runInBand`: pass, 11 suites / 56 tests
- `yarn check:tamagui`: pass
- First `yarn ios`: failed during CocoaPods install before install/launch because
  ignored native iOS output was stale.
- `npx expo prebuild --platform ios --clean`: pass; regenerated ignored native iOS
  output and installed CocoaPods.
- Retry `yarn ios`: pass; Xcode build succeeded with 0 errors / 1 warning, installed and
  launched `ch.karimattia.soli` on the `iPhone 17 Pro` simulator.
- iOS smoke via `agent-device` session `soli-ios-sdk57`: pass for launch, main board,
  stock draw, new game, Settings render, History render, History preview sheet, return
  to Play, and no visible RedBox/LogBox/crash.
- iOS launch console artifact:
  `tmp/sdk57-ios.console.log`
- Android attempt 1: failed/stuck with Gradle daemon Metaspace OOM after APK generation.
- Android attempt 2: `assembleRelease` succeeded, but `yarn release` exited 1 before
  install because ADB lost the physical device.
- Android APK artifact:
  `android/app/build/outputs/apk/release/app-release.apk`
- Android metadata from APK: `ch.karimattia.soli`, `versionName=0.8.0`,
  `versionCode=13`, `minSdk=24`, `targetSdk=36`, `compileSdk=36`.
- Prior Android checkpoint: smoke was not run because no fresh install/launch was confirmed.
- Prior Android checkpoint: main-thread plausibility check confirmed `adb devices -l` and `adb mdns services` were
  empty after the Android worker report. `git diff --check` and
  `npx expo install --check` pass, and no active build processes remain. Gradle daemons
  were stopped with `cd android && ./gradlew --stop`.
- Final Android rerun: pass. `scripts/android-unlock-pattern.sh` unlocked A065, and
  `yarn release` completed the release build, installed the APK, launched
  `ch.karimattia.soli`, stopped Metro cleanly, and exited 0.
- Fresh-install evidence: device package `lastUpdateTime=2026-07-04 17:30:31 CEST`,
  version `0.8.0` / code `13`, installed base APK under `/data/app/`, and running
  `ch.karimattia.soli/.MainActivity`. Local APK SHA-256 is
  `c6319ddb74d9323f3d9ccfa7ad2c48f0f728ce9abe84722e0675323109507ace`.
- Android smoke via `agent-device` session `soli-android-sdk57`: pass for relaunch,
  board/card render, deal again, stock draw, undo, valid tap move, drawer/header,
  Settings interaction and restoration, History, preview sheet, sheet back, system back,
  safe areas, and absence of visible RedBox/LogBox/crash.
- Android bounded log check: pass; no fatal error, JS exception, React Native overlay,
  ANR, or native crash. The UIAutomator hierarchy-dump `EPIPE` warning is tool-related.
- Android artifacts:
  `tmp/sdk57-android/app.log`, `tmp/sdk57-android/main-board.png`,
  `tmp/sdk57-android/deal-again.png`, `tmp/sdk57-android/stock-draw.png`,
  `tmp/sdk57-android/undo.png`, `tmp/sdk57-android/card-tap-final.png`,
  `tmp/sdk57-android/drawer.png`, `tmp/sdk57-android/settings-draw-2.png`,
  `tmp/sdk57-android/settings-restored.png`, `tmp/sdk57-android/history.png`,
  `tmp/sdk57-android/history-preview-sheet.png`,
  `tmp/sdk57-android/history-after-sheet-back.png`, and
  `tmp/sdk57-android/history-system-back.png`.

Worklets `0.10.1` iOS regression:

- Clean iOS build: pass. `npx expo prebuild --platform ios --clean` and `yarn ios`
  completed successfully; `yarn-ios.log` shows `Build Succeeded`, install on
  `iPhone 17 Pro`, and launch of `ch.karimattia.soli`.
- iOS 20-game demo playlist: pass. Session `soli-ios-worklets-0101-regression` opened
  `soli:///?demo=playlist&games=20` on the patched build and completed all 20 games.
- Bounded counts from
  `tmp/sdk57-worklets-0101/ios/playlist-summary-counts.txt`: `loaded=20`,
  `completed=20`, `playlist_complete=1`, `crash_tokens=0`.
- Crash-report check after `tmp/sdk57-worklets-0101/ios/manual-regression-start-utc.txt`:
  pass; no new Soli crash report found under `~/Library/Logs/DiagnosticReports` or the
  CoreSimulator `CrashReporter` tree.
- iOS artifacts: `tmp/sdk57-worklets-0101/ios/playlist-before.png`,
  `tmp/sdk57-worklets-0101/ios/playlist-after.png`,
  `tmp/sdk57-worklets-0101/ios/playlist-monitor-clean.log`,
  `tmp/sdk57-worklets-0101/ios/playlist-app-log-excerpt.txt`,
  `tmp/sdk57-worklets-0101/ios/playlist-summary-counts.txt`, and
  `tmp/sdk57-worklets-0101/ios/crash-reports-after-regression.txt`.
- Post-20-game Android RAM capture: valid retained process, PID `2684` throughout.
  PSS samples were `527.1`, `473.8`, and `468.3 MiB` (mean `489.7 MiB`); RSS samples
  were `513.5`, `461.1`, and `455.5 MiB` (mean `476.7 MiB`). CPU was `5.5%` at the
  metrics capture. No OOM, ANR, fatal exception, or native crash was logged.
- Post-20-game Android artifacts:
  `tmp/sdk57-post20/android/memory-sample-1.json`,
  `tmp/sdk57-post20/android/memory-sample-2.json`,
  `tmp/sdk57-post20/android/memory-sample-3.json`,
  `tmp/sdk57-post20/android/memory-summary.json`,
  `tmp/sdk57-post20/android/retained-state.png`, and bounded process/log evidence in
  the same directory.
- Post-20-game iOS crash capture: symbolication succeeded for 32 frames. Failure was
  `EXC_CRASH` / `SIGABRT` on the React JavaScript thread in
  `JSIWorkletsModuleProxy.cpp:455`; no memory-pressure or jetsam fields were present.
  Reproduction was not run because the retained report, matching binary UUID/dSYM, and
  upstream Worklets `0.10.1` fix were sufficient.
- Post-20-game iOS artifacts:
  `tmp/sdk57-post20/ios/Soli-2026-07-04-175716.ips`,
  `tmp/sdk57-post20/ios/Soli-2026-07-04-175716.symbolicated.ips`,
  `tmp/sdk57-post20/ios/crash-key-evidence.json`, and bounded unified logs in the same
  directory.
- Restarted Android `0.10.0` baseline: valid retained PID `12020`; mean PSS `292.1 MiB`
  (range `288.7-296.8 MiB`), mean RSS `445.7 MiB` (range `442.4-450.3 MiB`), CPU `9.4%`
  at metrics capture, and no OOM/fatal/ANR evidence.
- Restart-baseline artifacts:
  `tmp/sdk57-restart-baseline/android/memory-summary.json`,
  `tmp/sdk57-restart-baseline/android/perf-metrics.json`,
  `tmp/sdk57-restart-baseline/android/retained-state.png`, and process/log evidence in
  the same directory.

Worklets `0.10.1` patch checks:

- Full requested post-patch rerun (2026-07-04): all eight commands passed serially.
- `yarn format:check`: pass; 86 files checked in 176 ms (`real 0.97s`).
- `yarn typecheck`: pass with no diagnostics (`real 2.47s`).
- `yarn lint`: pass with no diagnostics (`real 0.99s`).
- `yarn jest --runInBand`: pass; 11/11 suites and 56/56 tests, 0 snapshots;
  Jest time 1.839 s (`real 4.93s`).
- `yarn check:tamagui`: pass; `Tamagui dependencies look good` (`real 0.76s`).
- `npx expo install --check`: pass; dependencies up to date, with only
  `react-native-worklets` intentionally skipped through `expo.install.exclude`
  (`real 0.65s`).
- `npx expo-doctor@latest`: pass; 20/20 checks, no issues (`real 4.72s`).
- `git diff --check`: pass with no output (`real 0.02s`).
- `yarn install --immutable`: pass; existing peer-warning class remains, with no
  lockfile change.
- `npx expo install --check`: pass; explicitly skipped only `react-native-worklets`
  from version validation and reported all checked dependencies up to date.
- `npx expo-doctor@latest`: pass, 20/20 checks.
- `yarn format:check`: pass after formatting only `package.json`.
- `git diff --check`: pass.
- Native builds intentionally not run in this narrow patch task; corresponding build
  and runtime checklist items remain open.
- Worklets `0.10.1` clean iOS checkpoint (2026-07-04): no competing Gradle, Xcode,
  Expo, CocoaPods, Metro, or native build process was active. `npx expo prebuild
  --platform ios --clean` regenerated ignored native output and installed CocoaPods.
  `yarn ios` then built with 0 errors / 1 duplicate `-lc++` warning, installed the
  freshly built app (build product mtime `2026-07-04T18:23:39+0200`), and launched
  `ch.karimattia.soli` on the `iPhone 17 Pro` simulator. Generated `ios/Podfile.lock`
  resolves `RNWorklets`, `RNWorklets/apple`, and `RNWorklets/common` to `0.10.1`.
  Evidence: `tmp/sdk57-worklets-0101/ios/prebuild-clean.log`,
  `tmp/sdk57-worklets-0101/ios/yarn-ios.log`, and
  `tmp/sdk57-worklets-0101/ios/fresh-install-worklets-evidence.txt`.
- Worklets `0.10.1` Android release checkpoint (2026-07-04): fail before install.
  Preflight found no competing native builds; A065 was visible and unlocked. Required
  `agent-device` routing commands were run first:
  `agent-device --version` (`0.17.10`), `agent-device help workflow`,
  `agent-device help debugging`, and `agent-device help react-native`.
- Android attempt 1: `yarn release` failed during `assembleRelease` after Worklets CMake
  tasks completed. `:expo-modules-core:buildCMakeRelWithDebInfo[arm64-v8a]` and
  `:react-native-reanimated:buildCMakeRelWithDebInfo[arm64-v8a][reanimated]` both failed
  because Ninja could not find the stale expected
  `.../react-native-worklets/android/build/intermediates/cxx/RelWithDebInfo/1aq5n95a/obj/arm64-v8a/libworklets.so`.
- Android recovery attempt: stopped the Gradle daemon and ran `cd android &&
  ./gradlew clean`. The clean failed in `:app:externalNativeBuildCleanRelease` because
  stale app CMake/autolinking metadata referenced missing generated codegen JNI
  directories for AsyncStorage, Gesture Handler, and Worklets. This was recorded as a
  cleanup failure, not a source edit.
- Android attempt 2: reran `yarn release` after the partial clean. The build regenerated
  codegen and rebuilt Worklets, but failed with the same stale `1aq5n95a/libworklets.so`
  dependency path. No fresh APK install was confirmed, so no runtime smoke, deep-link
  demo, screenshots, or bounded app-log crash scan were run for Android Worklets
  `0.10.1`.
- Android package/device evidence after the failed build: A065 remained connected and
  Soli was still running `ch.karimattia.soli/.MainActivity`, but the installed package
  metadata still showed the prior `lastUpdateTime=2026-07-04 17:30:31`, version `0.8.0`
  / code `13`. The existing `android/app/build/outputs/apk/release/app-release.apk`
  artifact was the older `2026-07-04 08:09:22 CEST` APK with SHA-256
  `c6319ddb74d9323f3d9ccfa7ad2c48f0f728ce9abe84722e0675323109507ace`; it is not
  evidence of a fresh Worklets `0.10.1` install from this run.
- Android Worklets `0.10.1` artifacts:
  `tmp/sdk57-worklets-0101/android/yarn-release-attempt1.log`,
  `tmp/sdk57-worklets-0101/android/gradle-clean-after-attempt1.log`,
  `tmp/sdk57-worklets-0101/android/yarn-release.log`,
  `tmp/sdk57-worklets-0101/android/release-failure-excerpts.txt`, and
  `tmp/sdk57-worklets-0101/android/fresh-install-evidence.txt`.
- Android Worklets `0.10.1` CMake-cache recovery: pass for build. Removed only untracked
  generated output under `android/.gradle`, `android/build`, `android/app/.cxx`,
  `android/app/build`, and `.cxx`/`build` directories for `react-native-worklets`,
  `react-native-reanimated`, and `expo-modules-core`.
- Android release retry after CMake-cache cleanup: build pass. `yarn release` completed
  `assembleRelease` with `BUILD SUCCESSFUL in 5m 51s` and printed install/open lines for
  A065. The wrapper was interrupted only after it stayed in the Expo log-streaming phase.
- Fresh APK metadata after retry: SHA-256
  `43a8c3f12f3096ef53bff9091ad34dc0fc01b924b6a3c70c2afb6b9f65ef20a4`, mtime
  `2026-07-04T19:02:05+0200`, size `118534701` bytes, package `ch.karimattia.soli`,
  version `0.8.0` / code `13`, `minSdk=24`, `targetSdk=36`, `compileSdk=36`.
- Android device/install confirmation after retry: blocked. Immediately after the
  install/open log lines, `adb devices -l` and `adb mdns services` returned no device;
  `agent-device devices --platform android` also failed with `DEVICE_NOT_FOUND`.
  Restarting ADB and polling six times still found no device. No fresh package
  `lastUpdateTime`, running activity, screenshot, bounded app log, or one-game demo smoke
  could be captured.
- Android recovery artifacts:
  `tmp/sdk57-worklets-0101/android/cmake-cache-cleanup.log`,
  `tmp/sdk57-worklets-0101/android/yarn-release-after-cmake-clean.log`,
  `tmp/sdk57-worklets-0101/android/yarn-release-after-cmake-clean.status`,
  `tmp/sdk57-worklets-0101/android/release-after-cmake-clean-excerpts.txt`,
  `tmp/sdk57-worklets-0101/android/apk-metadata-after-cmake-clean.txt`,
  `tmp/sdk57-worklets-0101/android/fresh-install-evidence-after-cmake-clean.txt`, and
  `tmp/sdk57-worklets-0101/android/device-reconnect-polls.txt`.
- Final lightweight checks after the Android recovery documentation passed:
  `git diff --check`, `npx expo install --check`, and `yarn format:check`. ADB remained
  empty afterward, so the remaining Android smoke should start by reconnecting A065 and
  confirming the installed package `lastUpdateTime`.
- Android post-reconnect install confirmation: pass. A065 showed package
  `ch.karimattia.soli`, version `0.8.0` / code `13`,
  `lastUpdateTime=2026-07-04 19:02:40`, foreground `MainActivity`, and PID `30910`.
- Android post-reconnect Worklets `0.10.1` runtime smoke: pass, upgraded from the planned
  one-game smoke to a full 20-game demo playlist after shell escaping stripped the
  `games=1` parameter. Counts:
  `loaded=20`, `completed=20`, `playlist_complete=1`, `crash_tokens=0`.
- Android post-reconnect visual state: pass. Screenshot
  `tmp/sdk57-worklets-0101/android/android-20game-after-reconnect-after.png` shows the
  completed game and active celebration (`Celebration 07 · Dual Spiral`).
- Android post-reconnect memory sample: captured. PSS `543244 kB` (`530.5 MiB`), RSS
  `691120 kB` (`674.9 MiB`), top PSS Native Heap `354270 kB`, Unknown `86092 kB`,
  `.apk mmap` `28090 kB`, `.dex mmap` `26040 kB`, Gfx dev `21176 kB`.
- Prompt 5 Worklets `0.10.1` release-scope re-check: pass. GitHub release/compare and the
  maintainer cherry-pick thread show three fixes plus the release commit; no new user-facing
  feature/API adoption was found between `worklets-0.10.0` and `worklets-0.10.1`.
- Prompt 5 Android RAM comparison:
  - Fresh `0.10.0` restart baseline: mean PSS `292.1 MiB`, mean RSS `445.7 MiB`.
  - Fresh `0.10.1` relaunch sample: PSS `320.3 MiB`, RSS `461.0 MiB`, visible gameplay
    screenshot captured.
  - Post-20 old `0.10.0`: mean PSS `489.7 MiB`, mean RSS `476.7 MiB`, three samples with
    compacting GCs between samples.
  - Post-20 new `0.10.1`: PSS `530.5 MiB`, RSS `674.9 MiB`, single immediate active
    celebration sample without compacting GCs.
  - A pre-relaunch current-process sample on PID `30910` measured PSS `373.9 MiB` / RSS
    `255.0 MiB`, but the screenshot was black and the AX tree was empty, so it is
    documented as process-only evidence rather than gameplay-equivalent evidence.
- Prompt 5 iOS memory check: pass for availability and small runtime sanity. `agent-device`
  memory sampling is available on the iOS simulator through `ps-process-snapshot`
  resident-memory data. Clean 3-game playlist evidence: `loaded=3`, `completed=3`,
  `playlist_complete=1`, `crash_tokens=0`; resident memory was `775.5 MiB` at first
  launch sample, `499.3 MiB` immediately after the 3-game run, and `542.7 MiB` after a
  10 second settle. No new Soli crash report was found after the memory-check start marker.
- Prompt 6 user-run iOS memory comparison: post-20 resident memory was `693616 kB`
  (`677.4 MiB`). After process termination, the first relaunch showed a no-script-URL
  error shell, so its samples were rejected. `yarn ios --no-build-cache --device
  "iPhone 17 Pro"` then passed (`Build Succeeded`, 0 errors / 1 existing warning),
  installed and launched the app, and a snapshot verified the visible board at 0 moves.
  The valid fresh process measured `613776 kB` (`599.4 MiB`) after the board loaded and
  `495520 kB` (`483.9 MiB`) after another 10 seconds idle. Metro confirmed that the
  fresh process hydrated the saved in-progress session; app data was not cleared.
- Android post-reconnect artifacts:
  `tmp/sdk57-worklets-0101/android/reconnected-device-package-evidence.txt`,
  `tmp/sdk57-worklets-0101/android/adb-normalize-serial.txt`,
  `tmp/sdk57-worklets-0101/android/smoke-main-after-reconnect.png`,
  `tmp/sdk57-worklets-0101/android/android-20game-after-reconnect-monitor.log`,
  `tmp/sdk57-worklets-0101/android/android-20game-after-reconnect-log-excerpt.txt`,
  `tmp/sdk57-worklets-0101/android/android-20game-after-reconnect-summary.txt`,
  `tmp/sdk57-worklets-0101/android/android-20game-after-reconnect-after.png`,
  `tmp/sdk57-worklets-0101/android/android-20game-after-reconnect-memory.json`, and
  `tmp/sdk57-worklets-0101/android/android-20game-after-reconnect-final-evidence.txt`.
- Prompt 5 follow-up artifacts:
  `tmp/sdk57-worklets-0101/android/android-fresh-restart-0101-memory.json`,
  `tmp/sdk57-worklets-0101/android/android-fresh-restart-0101.png`,
  `tmp/sdk57-worklets-0101/android/android-current-settled-memory.json`,
  `tmp/sdk57-worklets-0101/ios-memory/memory-launch.json`,
  `tmp/sdk57-worklets-0101/ios-memory/memory-after-3games-immediate.json`,
  `tmp/sdk57-worklets-0101/ios-memory/memory-after-3games-settled.json`,
  `tmp/sdk57-worklets-0101/ios-memory/playlist3-summary-counts.txt`,
  `tmp/sdk57-worklets-0101/ios-memory/playlist3-log-excerpt.txt`,
  `tmp/sdk57-worklets-0101/ios-memory/playlist3-monitor.log`,
  `tmp/sdk57-worklets-0101/ios-memory/launch.png`, and
  `tmp/sdk57-worklets-0101/ios-memory/after-3games.png`.
- Final post-reconnect checks passed: `git diff --check`, `yarn format:check`, and
  `npx expo install --check`. No native build process or agent-device runner remained
  active. A065 remains reachable through the plain IP serial `192.168.1.12:40813`; the
  duplicate mDNS alias can reappear on ADB refresh, so future agent-device runs should
  use the plain IP serial or disconnect the duplicate alias if device discovery reports
  `DEVICE_NOT_FOUND`.

Native validation, serialized:

```sh
yarn ios
scripts/android-unlock-pattern.sh
yarn release
```

Smoke checklist:

- Launch app and confirm no fatal logs.
- Start a new game.
- Draw from stock.
- Drag and tap card moves.
- Undo.
- Auto-up and win/near-win flow if practical.
- Settings, including draw count and reduced motion.
- History screen and preview sheet.
- Drawer/header controls.
- Android back behavior for sheets/modals.
- Safe-area/status/nav bar behavior on Android and iOS.
- Quick runtime log sanity around repeated games; no long perf investigation unless evidence appears.
