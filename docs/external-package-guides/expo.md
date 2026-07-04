# Expo Guide

Last refreshed: 2026-07-04

## Scope

- Package/tool: `expo`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this as the definitive Expo SDK reference for Soli. The repo entered the SDK
57 upgrade from SDK 56 on 2026-07-04; keep SDK 55/56 notes as migration background
and use the SDK 57 section for current upgrade decisions.

## Detailed guidance

The sections below are the definitive combined notes for this package or tool. Keep version-specific context when it affects compatibility, but update this single file instead of adding task- or feature-prefixed guides.

### SDK 57 Upgrade Notes

- Package family: `expo` and Expo SDK packages
- Retrieved: 2026-07-04
- Primary docs:
  - https://expo.dev/changelog/sdk-57
  - https://docs.expo.dev/versions/latest/
  - https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
  - https://docs.expo.dev/versions/latest/config/app/
  - https://docs.expo.dev/versions/latest/sdk/build-properties/

## Target facts

- Expo SDK 57 is the latest stable SDK line on 2026-07-04.
- npm metadata reports `expo@57.0.2` as `latest`.
- Expo's latest SDK reference maps SDK `57.0.0` to:
  - React Native `0.86`
  - React `19.2.3`
  - React Native Web `0.21.0`
  - Minimum Node.js `22.13.x`
- Current local Node `25.9.0` satisfies the SDK 57 minimum.
- Current local Xcode `26.6` satisfies the SDK 56+ `26.4+` baseline carried into this
  upgrade.

## Official upgrade flow

For the Soli Yarn/CNG workflow, use:

```sh
npx expo install expo@^57.0.0 --fix
npx expo install --check
npx expo-doctor@latest
```

Expo's upgrade walkthrough says to upgrade one SDK at a time, align dependencies with
`expo install --fix`, run Expo Doctor, and regenerate native projects for CNG apps.
Soli is moving from SDK 56 to SDK 57, so this is an incremental upgrade.

## SDK 57 notes relevant to Soli

- SDK 57 is a focused SDK 56 -> 57 upgrade that primarily brings React Native 0.86.
- Expo says the upgrade from SDK 56 / RN 0.85 should be straightforward because RN
  0.86 has no user-facing breaking changes, but Soli still needs fresh native builds.
- `expo prebuild` now clears and regenerates native `android` and `ios` directories
  by default. This matches Soli's generated/ignored native folder workflow; do not add
  tracked native project files.
- Expo Go for SDK 57 may not be available in all app stores immediately. Use dev or
  release builds for production-app validation.
- SDK 57 bundles newer animation/gesture packages: Reanimated 4.5, Worklets 0.10, and
  Gesture Handler 2.32.
- Known regression: Android Hermes V1 plus Reanimated can increase memory usage by
  25-30%. Worklets bundle mode is the documented workaround, but do not enable it
  without evidence in Soli.
- For SDK 56 and greater, `expo-build-properties` documents its iOS
  `deploymentTarget` plugin option as deprecated in favor of built-in
  `ios.deploymentTarget` app config. Prefer the built-in property if native checks pass.

## Repo usage notes

- Continue to prefer Expo/CNG tooling for native output.
- Keep `babel.config.js` and `metro.config.js` because Tamagui needs custom Babel and
  Metro integration.
- Do not opt into React Compiler, new Android edge-to-edge behavior, or Worklets bundle
  mode as part of the baseline SDK 57 upgrade unless validation exposes a concrete need.

### SDK 55 Upgrade Notes

- **Package**: `expo` (SDK 55 target)
- **Retrieved**: 2026-03-02
- **Primary docs**:
  - SDK 55 changelog: https://expo.dev/changelog/sdk-55
  - Upgrade walkthrough: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
  - SDK reference matrix: https://docs.expo.dev/versions/v55.0.0/

## Upgrade Workflow (Official)
1. Upgrade Expo SDK package:
   - `npm install expo@^55.0.0` (or the equivalent package manager command).
2. Align dependency versions:
   - `npx expo install --fix`
3. Run diagnostics:
   - `npx expo-doctor`
4. Handle native project updates:
   - CNG projects: regenerate native directories.
   - Non-CNG projects: run `npx pod-install` and apply native diffs.
5. Follow SDK 55 changelog migration items.

## SDK 55 Compatibility Baseline
- React Native: `0.83`
- React: `19.2.0`
- React Native Web: `0.21.0`
- Minimum Node.js: `20.19.x`
- Android compile/target SDK: `36`
- iOS minimum deployment target: `15.1+`

## Breaking/Actionable SDK 55 Notes
- New Arch assumptions continue (legacy compatibility keeps shrinking).
- Router-related migration notes can require code updates if native/headless tabs are used.
- Expo recommends incremental SDK upgrades and using release notes as the migration source of truth.

## Example Command Sequence
```bash
npx expo install expo@^55.0.0
npx expo install --fix
npx expo-doctor
```

## Usage Notes
- Prefer `expo install` over manual semver guessing for Expo-managed dependencies.
- After dependency alignment, run TypeScript + tests + Expo export/doctor before considering task review-ready.
- For CNG-style native files, prefer clean regeneration plus config plugins over relying on
  ignored local `android/` or `ios/` drift. Soli's native folders are intended to stay
  untracked; tracked Expo config and assets are the source of truth.

## Refresh check (2026-07-03)

- Status: historical SDK 55 task guide. Do not rewrite these SDK 55 facts into SDK 56/57;
  keep it only as SDK 55 upgrade context.
- Current repo state: Soli is on Expo SDK 56 (`expo@56.0.12` resolved from
  `expo@^56.0.0`), React Native `0.85.3`, and React `19.2.3`.
- Current official docs: Expo's SDK reference now lists SDK 57 as the latest stable line,
  mapping to React Native `0.86` and React `19.2.3`, while SDK 56 remains the repo's
  installed line.
- Current guidance in this file covers SDK 56 repo work; use
  Expo's SDK 57 changelog for the next upgrade.
- SDK 57 changes the default `expo prebuild` behavior: native `android` and `ios`
  directories are cleared and regenerated unless `--no-clean` is passed. Soli already uses
  explicit `prebuild --clean` scripts so generated native folders come from tracked config
  and assets.
- Sources:
  - https://docs.expo.dev/versions/latest/
  - https://docs.expo.dev/versions/v56.0.0/
  - https://docs.expo.dev/workflow/continuous-native-generation/
  - https://expo.dev/changelog/sdk-57

### CNG / ignored native folder note (2026-07-03)

- Source refresh:
  - https://docs.expo.dev/workflow/continuous-native-generation/
  - https://expo.dev/changelog/sdk-57
- Expo's CNG docs say `prebuild --clean` deletes existing native folders before generating
  them from app config and package metadata. Running prebuild without a clean layer can be
  faster, but may not produce the same result in some cases.
- For Soli, card-font determinism now lives in tracked source: `app.json` registers the
  patched `CardTextAndroid` family on Android and embeds the same files on iOS, while CNG
  regenerates the native folders from that state. The old release-time guard that rejected
  Android registration was removed because registration is now the desired contract.

### SDK 56 Current Notes

- Package family: `expo` and Expo SDK packages
- Retrieved: 2026-06-14
- Refreshed: 2026-07-03
- Primary docs:
  - https://expo.dev/changelog/sdk-56
  - https://docs.expo.dev/versions/v56.0.0/
  - https://docs.expo.dev/versions/latest/
  - https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
  - https://docs.expo.dev/guides/new-architecture/
  - https://expo.dev/changelog/sdk-57

## Target facts

- Current Soli SDK line: SDK 56 (`expo@56.0.12` resolved from `expo@^56.0.0`).
- Latest stable Expo SDK line found in official docs on 2026-07-03: SDK 57.
- SDK 56 includes React Native `0.85` and React `19.2.3`.
- Expo's SDK 56 reference maps SDK `56.0.0` to:
  - React Native `0.85`
  - React `19.2.3`
  - React Native Web `0.21.0`
  - Minimum Node.js `22.13.x`
- Expo's latest SDK reference maps SDK `57.0.0` to React Native `0.86` and
  React `19.2.3`.
- SDK 56 platform targets:
  - Android `compileSdkVersion` `36`
  - Android `targetSdkVersion` `36`
  - iOS `16.4+`
  - Xcode `26.4+`
- SDK 55 and later always use the React Native New Architecture. It cannot be
  disabled.

## Official upgrade flow

Expo's walkthrough recommends:

```sh
npm install expo@^56.0.0
npx expo install --fix
npx expo-doctor
```

For this Yarn repo, prefer the equivalent Expo CLI commands already used by project
scripts:

```sh
npx expo install expo@^56.0.0 --fix
npx expo install --check
npx expo-doctor@latest
```

## SDK 56 notes relevant to Soli

- Expo Router no longer depends on React Navigation. Application code importing
  directly from `@react-navigation/*` must move to Expo Router entry points.
- Expo Doctor has a new warning when `expo-router` and React Navigation are both
  installed.
- `expo/fetch` is now installed as `globalThis.fetch` by default. Soli does not appear
  to use direct app-level fetch calls, but smoke tests should watch for runtime
  behavior differences.
- Hermes bytecode diffing is on by default where `expo-updates`/EAS Update is used.
  Soli does not currently list `expo-updates` directly.
- Expo Go for SDK 56 is not a reliable app-store-installed validation target. Use
  development or release builds for production-app validation.
- TypeScript `6.0.3` is included in new templates and may be pulled in by
  `expo install --fix`. Verify against Soli's `tsgo` setup.
- SDK 57 is now available. Its changelog says the upgrade from SDK 56 / RN 0.85
  should be straightforward because RN 0.86 has no user-facing breaking changes, but
  it also documents a Hermes V1 + Reanimated Android memory regression that impacts
  SDK 56 too. Keep this in mind for Soli's animation/performance validation.

## Repo usage notes

- Current `package.json` and `yarn.lock` are on SDK 56 patch-aligned versions.
- The workspace may have generated `android/` and `ios/` directories locally, but Soli's
  desired workflow is fully untracked native folders regenerated from tracked Expo config
  and assets.
- Continue to prefer Expo/CNG upgrade tooling for native output and avoid hand-editing
  generated native folders.
- Keep `babel.config.js` and `metro.config.js` because Tamagui needs custom Babel and
  Metro integration.

## Refresh check (2026-07-03)

- Status: current for Soli's installed SDK 56 line, but no longer the latest upstream
  Expo SDK guide.
- Keep SDK-specific links pinned to `/versions/v56.0.0/` in this file. Use `/latest/`
  only to check whether a future SDK, currently SDK 57, has superseded these facts.
- Follow-up for a future upgrade plan: create a separate SDK 57 guide instead of mutating
  this SDK 56 guide into a different task.

### Expo Compatibility Notes

Research date: 2026-06-11
Refresh check: 2026-07-03

## Purpose

Cache the Expo SDK 55 facts and current repository diagnostics that affect the
Tamagui 2 migration.

## Sources

- https://expo.dev/changelog/sdk-55
- https://expo.dev/changelog/sdk-56
- https://docs.expo.dev/guides/new-architecture/
- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- https://docs.expo.dev/versions/v56.0.0/sdk/reanimated/

## Refresh check (2026-07-03)

Status: superseded for current repository work, still useful as the historical SDK 55
snapshot for the original Tamagui 2 migration.

- Soli now has `expo` `^56.0.0`, React Native `0.85.3`, React `19.2.3`,
  Reanimated `4.3.1`, and Worklets `0.8.3` in `package.json`.
- Do not run the SDK 55 `npx expo install --fix` instructions from this file against
  the current branch. Use SDK 56-compatible checks instead:
  `npx expo install --check` and `npx expo-doctor@latest`.
- The Tamagui baseline point still holds: SDK 56 satisfies the Tamagui 2 requirements
  for React 19+, React Native 0.81+, and New Architecture support.
- Expo's SDK 56 Reanimated reference recommends `react-native-reanimated` `4.3.1`
  and says `babel-preset-expo` configures the Reanimated Babel plugin automatically
  when Reanimated and Worklets are installed.

## Compatibility facts

- Expo SDK 55 uses React Native 0.83 and React 19.2.
- SDK 55 runs entirely on the React Native New Architecture.
- The New Architecture cannot be disabled in SDK 55.
- This satisfies Tamagui 2's React Native 0.81+, React 19+, and New Architecture
  requirements.
- Expo SDK 55 supports Node:
  - `^20.19.4`
  - `^22.13.0`
  - `^24.3.0`
  - `^25.0.0`
- The current Node `25.9.0` is within Expo's supported SDK 55 range.
- Xcode 26 is required by SDK 55. The current Xcode `26.5` satisfies that
  requirement.

## Current repository diagnostic

On 2026-06-11, `npx expo install --check` reported these expected patch updates:

| Package | Found | Expected |
| --- | --- | --- |
| `expo` | `55.0.4` | `~55.0.26` |
| `expo-build-properties` | `55.0.9` | `~55.0.14` |
| `expo-constants` | `55.0.7` | `~55.0.16` |
| `expo-font` | `55.0.4` | `~55.0.8` |
| `expo-linear-gradient` | `55.0.8` | `~55.0.14` |
| `expo-linking` | `55.0.7` | `~55.0.15` |
| `expo-router` | `55.0.3` | `~55.0.16` |
| `expo-splash-screen` | `55.0.10` | `~55.0.21` |
| `expo-status-bar` | `55.0.4` | `~55.0.6` |
| `expo-system-ui` | `55.0.9` | `~55.0.18` |
| `expo-web-browser` | `55.0.9` | `~55.0.16` |
| `jest-expo` | `55.0.9` | `~55.0.18` |
| `react-native` | `0.83.2` | `0.83.6` |
| `react-native-worklets` | `0.7.2` | `0.7.4` |
| `@expo/metro-runtime` | `55.0.6` | `~55.0.11` |

Run:

```sh
npx expo install --fix
npx expo install --check
npx expo-doctor@latest
```

Do this before the Tamagui package bump so Expo patch regressions and Tamagui
regressions are not mixed.

## Native tooling

`npx expo-doctor@latest` passed 17 of 19 checks on 2026-06-11. It failed:

1. Expo package patch alignment.
2. CocoaPods availability/version.

The current shell has no `pod` command. Install a CocoaPods version accepted by Expo
Doctor and the SDK 55 native toolchain before the clean iOS build; then record the
resolved version with `pod --version`.

## Native dependency implications

The following applies only if the native Teleport follow-up is separately approved.

`react-native-teleport` contains native code:

- It requires the New Architecture, which SDK 55 already provides.
- It does not work in Expo Go.
- It works in a development client and release builds.
- It requires fresh iOS and Android builds after installation.
- Autolinking should handle native registration.

Soli's required validation already uses native builds, so this limitation is
acceptable.

## Conditional Expo Router entry

This entry-point change is only for the separately approved Tamagui native-integration
follow-up. The core Tamagui 2 migration keeps `main: "expo-router/entry"`.

Tamagui native setup imports must execute before `expo-router/entry`.

Change `package.json`:

```json
{
  "main": "index.js"
}
```

Create:

```js
import './tamagui.native.setup'
import 'expo-router/entry'
```

The local setup module should contain Tamagui native side effects and any selective
Gesture Handler setup.

## Verification

After Expo and Tamagui dependency changes:

```sh
npx expo install --check
npx expo-doctor@latest
npx expo export --platform web
```

Then perform clean native builds. Do not rely on a previously installed binary after
adding a native package.
