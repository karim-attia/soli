# Tamagui 2 Expo SDK 55 Guide

Research date: 2026-06-11

## Purpose

Cache the Expo SDK 55 facts and current repository diagnostics that affect the
Tamagui 2 migration.

## Sources

- https://expo.dev/changelog/sdk-55
- https://docs.expo.dev/guides/new-architecture/
- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/

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
