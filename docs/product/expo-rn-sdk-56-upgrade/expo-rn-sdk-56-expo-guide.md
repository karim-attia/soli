# Expo/RN SDK 56 Expo Guide

- Package family: `expo` and Expo SDK packages
- Retrieved: 2026-06-14
- Primary docs:
  - https://expo.dev/changelog/sdk-56
  - https://docs.expo.dev/versions/latest/
  - https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
  - https://docs.expo.dev/guides/new-architecture/

## Target facts

- Latest stable Expo SDK line found in official docs: SDK 56.
- SDK 56 includes React Native `0.85` and React `19.2`.
- Expo's latest SDK reference maps SDK `56.0.0` to:
  - React Native `0.85`
  - React `19.2.3`
  - React Native Web `0.21.0`
  - Minimum Node.js `22.13.x`
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

## Repo usage notes

- Current `package.json` is already on SDK 55 patch-aligned versions.
- There are no checked-in native directories, so follow Continuous Native Generation
  assumptions and avoid committing generated `ios/` or `android/` directories unless
  the project policy changes.
- Keep `babel.config.js` and `metro.config.js` because Tamagui needs custom Babel and
  Metro integration.
