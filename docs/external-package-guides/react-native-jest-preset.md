# React Native Jest Preset Guide

Last refreshed: 2026-07-07

> Note (2026-07-07): the repo is now on Expo SDK 57 / `react-native@0.86.0` with
> `@react-native/jest-preset@^0.86.0` (verified in `package.json`). The SDK 56 /
> RN 0.85.3 versions below are historical; the guidance (keep the preset aligned
> with the installed RN version, keep `jest-expo` as the Jest preset) still holds.

## Scope

- Package/tool: `@react-native/jest-preset`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

- Package: `@react-native/jest-preset`
- Retrieved: 2026-06-14
- Refreshed: 2026-07-03
- Primary docs:
  - https://reactnative.dev/blog/2026/04/07/react-native-0.85
  - https://reactnative.dev/blog/2026/06/11/react-native-0.86

## Why this package is needed

React Native 0.85 extracted React Native's Jest preset from `react-native` into
`@react-native/jest-preset`. The official React Native 0.85 release notes list this
as a breaking change.

Soli uses `jest-expo`. After upgrading to Expo SDK 56 / React Native 0.85.3, Jest
failed before running tests because `jest-expo` requires the extracted preset package
to be installed.

## Version choice

Install the package at the same version as React Native:

```sh
yarn add --dev @react-native/jest-preset@0.85.3
```

Keeping the preset version aligned with `react-native@0.85.3` avoids mixing template
and transform assumptions across React Native patch lines.

## Repo usage notes

- Keep the existing Jest preset as `jest-expo`; do not switch the repo to
  `preset: "@react-native/jest-preset"` because Expo's Jest preset still provides
  Expo-specific transforms and mocks.
- The package is a supporting dev dependency required by `jest-expo` under React
  Native 0.85.

## Refresh check (2026-07-03)

- Status: current for Soli's SDK 56 / RN 0.85.3 test setup.
- Repo state: `package.json` and `yarn.lock` resolve `@react-native/jest-preset@0.85.3`,
  matching `react-native@0.85.3`.
- React Native 0.86 is now latest upstream, but this package should stay pinned to the
  React Native version actually installed by the Expo SDK line.
