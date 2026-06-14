# Expo/RN SDK 56 React Native Jest Preset Guide

- Package: `@react-native/jest-preset`
- Retrieved: 2026-06-14
- Primary docs:
  - https://reactnative.dev/blog/2026/04/07/react-native-0.85

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
