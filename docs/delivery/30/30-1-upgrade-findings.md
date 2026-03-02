# Task 30-1: Expo 55 + React upgrade findings log

## Purpose
Track research, implementation decisions, issues, and verification results for upgrading this app from Expo SDK 54 to SDK 55 (including React alignment).

## Current Status
- Date started: 2026-03-02
- Owner: ai_agent
- Task state: Review

## User Input (Read Between Steps)
Use this section to add guidance or constraints before the next step.

### Latest input
<!-- Add your instructions below this line. I will re-read this section between major steps. -->

## Step Log
| Timestamp | Step | Notes | Action Taken |
| :-- | :-- | :-- | :-- |
| 2026-03-02 00:00:00 | 1 | Confirmed no existing task explicitly covers Expo 55 migration. | Proceeding with a new task-scoped findings log and migration execution. |
| 2026-03-02 00:08:00 | 2 | Created a live findings log with explicit user-input checkpoint section. | Will re-read the input section between major steps before continuing. |
| 2026-03-02 00:18:00 | 3 | Researched official Expo SDK 55, React, and React Native upgrade guidance. | Captured migration-critical changes and validation workflow to apply in this repository. |
| 2026-03-02 00:24:00 | 3 | Created package-specific cached guidance docs for migration-critical dependencies. | Added guide files for `expo`, `react`, `react-native`, `expo-router`, and `react-native-reanimated`. |
| 2026-03-02 00:31:00 | 4 | Audited repository for SDK 55 migration impact points. | Identified dependency mismatches and config/code touchpoints requiring upgrade validation. |
| 2026-03-02 00:42:00 | 5 | Upgraded Expo SDK + aligned core dependencies to SDK 55 matrix. | Used `yarn up` with versions reported by `expo install --fix` due CLI offline-mode incompatibility with Yarn 4. |
| 2026-03-02 00:45:00 | 5 | Applied config cleanup for SDK 55 defaults. | Removed redundant `newArchEnabled: true` from `app.json`. |
| 2026-03-02 00:55:00 | 6 | Ran verification (`tsc`, `jest`, `expo export`) and fixed discovered type break. | Updated theme helper to use `ColorSchemeName` from RN 0.83 type defs. |
| 2026-03-02 00:59:00 | 7 | Synchronized PBI/task documentation for this migration. | Added PBI 30 backlog/detail/task docs and moved implementation status to Review. |
| 2026-03-02 21:24:00 | 8 | Re-read user input checkpoint before retrying native validation steps. | No additional constraints were present in the input section. |
| 2026-03-02 21:26:00 | 9 | Researched official Expo/RN/Gradle sources for release build `command 'node'` failures. | Confirmed RN Gradle plugin supports `nodeExecutableAndArgs`; confirmed Gradle `pluginManagement` ordering constraint; confirmed Expo native workflow uses Node-based Gradle discovery commands. |
| 2026-03-02 21:31:00 | 10 | Applied Node executable hardening in Android Gradle config. | Added explicit `NODE_BINARY`/Homebrew fallback and wired all RN/Expo command resolution plus `nodeExecutableAndArgs` to that value in `android/app/build.gradle`. |
| 2026-03-02 21:40:00 | 11 | Re-ran Android native validation with release build and on-device install. | `./gradlew app:assembleRelease --no-daemon --console=plain`, `adb install -r`, and launcher smoke command all succeeded on the connected device. |
| 2026-03-02 21:46:00 | 12 | Investigated remaining `demo:auto-solve` failures during release flow. | Confirmed Expo CLI release flow still failed in this environment due daemon/process startup edge case and device serial parsing for mDNS names with spaces. |
| 2026-03-02 21:52:00 | 13 | Updated smoke automation to use a deterministic release install path. | Switched `scripts/run-demo-autosolve.js` to `./gradlew app:assembleRelease --no-daemon` + explicit `adb -s <serial> install/logcat` handling and device-line parsing via tab delimiter. |
| 2026-03-02 21:58:00 | 14 | Re-ran smoke automation after script hardening. | Build/install and deep-link launch now pass consistently on the connected device; run still times out waiting for auto-sequence token in release logcat. |
| 2026-03-02 22:12:00 | 15 | Re-read user input checkpoint before navigation runtime troubleshooting. | No additional constraints were present in the input section. |
| 2026-03-02 22:14:00 | 16 | Researched official troubleshooting for navigator registration errors and skill installation layout. | Confirmed React Navigation recommends checking for duplicate package copies and keeping dependency graph deduped; confirmed skills CLI supports project-local `.agents/skills` installs and multi-agent activation flags. |
| 2026-03-02 22:18:00 | 17 | Applied dependency range alignment to remove duplicate risk and restore Expo dependency check health. | Changed direct `@react-navigation/native` declaration from pinned `7.1.31` to Expo-aligned `^7.1.28`, reinstalled lockfile, and verified single runtime version (`7.1.31`) via `yarn why`. |
| 2026-03-02 22:27:00 | 18 | Revalidated release build and played on connected Android device with agent-device. | Built and reinstalled release APK, relaunched app with `agent-device`, played several moves, captured screenshot evidence, and confirmed no navigator crash entries in logcat. |

## Research Notes
### Official docs to collect
- Expo SDK 55 changelog and upgrade guide.
- React version alignment required by Expo SDK 55.
- React Native version alignment required by Expo SDK 55.
- Expo Router changes that can affect this codebase.
- Package-specific migration notes for dependencies currently used by this project.

### Confirmed findings from official docs
- Expo SDK 55 updates the React Native baseline to `0.83`.
- Expo SDK 55 includes React `19.2`.
- Expo SDK 55 requires Xcode 26+ and iOS 15.1+ deployment target for managed workflow.
- Expo Router native tab migration includes a `reset` prop rename to `popToTopOnBlur` for headless tabs.
- Expo CLI now supports React Native DevTools and includes additional diagnostics upgrades.
- React Native 0.83 states there are no intentional user-facing breaking changes, but alignment and dependency updates are still required.
- React 19.2 introduces Activity API and `useEffectEvent`; these are optional enhancements, not required migration blockers.
- React Navigation’s official troubleshooting for the exact runtime error calls out two root causes: missing `NavigationContainer` setup or multiple installed copies of navigation packages.
- The `skills` CLI supports project-local installation under `.agents/skills` and allows enabling the same skill for multiple agents (for example `-a codex -a cursor`) in one command.

### Primary sources
- https://expo.dev/changelog/sdk-55
- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- https://docs.expo.dev/versions/v55.0.0/sdk/router/
- https://reactnative.dev/blog/2026/01/21/version-0.83
- https://react.dev/blog/2025/10/01/react-19-2
- https://reactnative.dev/docs/react-native-gradle-plugin
- https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-bare-minimum/android/settings.gradle
- https://raw.githubusercontent.com/expo/expo/main/templates/expo-template-bare-minimum/android/app/build.gradle
- https://docs.gradle.org/current/userguide/plugins.html#sec:plugin_management
- https://docs.expo.dev/workflow/android-studio-emulator/
- https://reactnavigation.org/docs/troubleshooting/#im-getting-an-error-couldnt-register-the-navigator-have-you-wrapped-your-app-with-navigationcontainer
- https://github.com/vercel-labs/skills?tab=readme-ov-file#skills-add
- https://github.com/callstackincubator/agent-device

## Codebase Audit Notes
- Current baseline:
  - `expo@^54.0.29`
  - `react@19.1.0`
  - `react-native@0.81.5`
  - `react-native-reanimated@~4.1.1`
  - `react-native-worklets@0.5.1`
- App/router audit:
  - No `expo-router/unstable-native-tabs` usage found.
  - No headless tab `reset` prop usage found.
  - Drawer + stack routing is used (`expo-router/drawer`, `Stack`).
- React API audit:
  - Uses `useContext` + `Context.Provider` in settings/history state modules.
  - No forced migration needed for React 19.2; these APIs remain valid.
- Config audit:
  - `app.json` contains `newArchEnabled: true` (redundant for SDK 55 default).
  - Metro/Babel configs include Tamagui + Reanimated customizations and should be preserved.
- Environment audit:
  - Node `v24.7.0` and Yarn `4.5.0` available (Node requirement for SDK 55 met).

## Issues Encountered
- `npx expo install expo@^55.0.0` and `npx expo install --fix` attempted to call `yarn add ... --offline`.
- Yarn 4 in this workspace does not support Expo CLI’s injected `--offline` argument in that path.
- Resolution used: run `yarn up` directly with the dependency set suggested by Expo (`expo install --fix` output).
- `npx expo-doctor` could not run because it requires downloading `expo-doctor` from npm (`ENOTFOUND registry.npmjs.org` in this environment).
- After RN 0.83 upgrade, TypeScript failed because `useColorScheme()` now surfaced `ColorSchemeName` that includes `'unspecified'`.
- Resolution used: changed `resolveThemeName` system preference parameter type from a manual union to `ColorSchemeName`.
- Android release run (`expo run:android --variant release`) failed in Gradle with `A problem occurred starting process 'command 'node''`.
- Resolution used: configure RN Gradle `nodeExecutableAndArgs` and all Node-based resolution commands in `android/app/build.gradle` to use a single explicit executable resolved from `NODE_BINARY` or `/opt/homebrew/bin/node`.
- Expo CLI run flow can fail to target this connected device because the discovered mDNS device identifier contains spaces/parentheses and gets truncated during downstream `adb -s` calls.
- Resolution used: bypass Expo CLI install for the smoke script and use Gradle release assembly + explicit `adb -s <full-serial> install` / `logcat` control.
- Post-fix run still times out waiting for demo auto-sequence token in release logcat even though release install and deep-link launch succeed.
- On-device runtime showed React Navigation registration error screen (`Couldn't register the navigator...multiple copies of '@react-navigation' packages installed.`) after dependency alignment changes.
- Resolution used: align direct `@react-navigation/native` to Expo’s expected semver range (`^7.1.28`), run install to dedupe graph, and verify only one resolved runtime version (`7.1.31`) remains.
- Primary source for the `ColorSchemeName` typing change:
  - https://github.com/facebook/react-native/blob/main/packages/react-native/Libraries/Utilities/Appearance.d.ts

## Validation Log
- `npx expo install --check` → passes (offline-mode warning only), dependencies reported up to date.
- `yarn tsc --noEmit` → initially failed on `ColorSchemeName`; passes after `src/theme/index.ts` typing fix.
- `yarn jest --ci` → passes (`3/3` suites).
- `npx expo export --platform web --output-dir dist-web` → passes and exports static routes.
- `npx expo-doctor` → blocked in this environment due npm registry resolution failure.
- `/Users/karim/Library/Android/sdk/platform-tools/adb devices` → connected device detected.
- `./gradlew app:assembleRelease --no-daemon --console=plain` → pass.
- `adb -s <serial> install -r android/app/build/outputs/apk/release/app-release.apk` → pass.
- `adb -s <serial> shell monkey -p ch.karimattia.soli -c android.intent.category.LAUNCHER 1` → pass.
- `node .yarn/releases/yarn-4.5.0.cjs demo:auto-solve` → release build/install + deep-link launch pass; timeout remains waiting for auto-sequence log token.
- `npx expo install --check` (after `@react-navigation/native` range alignment) → pass (`Dependencies are up to date`, offline warning only).
- `node .yarn/releases/yarn-4.5.0.cjs why @react-navigation/native` → single resolved runtime version (`7.1.31`) shared by app and `expo-router`.
- `./gradlew app:assembleRelease --no-daemon --console=plain` (rerun) → pass.
- `adb -s 192.168.1.12:37635 install -r android/app/build/outputs/apk/release/app-release.apk` (rerun) → pass.
- `npx -y agent-device open ch.karimattia.soli --platform android --serial 192.168.1.12:37635 --relaunch --json` → pass.
- `npx -y agent-device screenshot .agents/skills/agent-device-after-fix.png --platform android --serial 192.168.1.12:37635 --json` → pass; screenshot confirms playable game board.
- Manual gameplay smoke: draw and tableau taps progressed the game state (`moves` advanced from 14 to 29) without runtime navigation errors.
- `adb -s 192.168.1.12:37635 logcat -d | rg "Couldn't register the navigator|FATAL EXCEPTION|E AndroidRuntime|ReactNativeJS"` → no navigator crash after fix.
