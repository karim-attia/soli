# React Native Jest Preset Guide

Last refreshed: 2026-10-17 (RN 0.88 preset, Jest 30)

> Note (2026-10-17): the repo is on Expo SDK 58 / `react-native@0.88.0` with
> `@react-native/jest-preset@^0.88.0` and Jest 30 (`jest ~30.5.2`, `@types/jest 30.0.0`,
> `jest-expo ~58.0.11`). Older version numbers below are historical; the rule (keep the
> preset aligned with the installed RN version, keep `jest-expo` as the Jest preset) holds.

## SDK 58 / Jest 30 notes (2026-10-17)

- Sources:
  - https://jestjs.io/blog/2025/06/04/jest-30
  - https://jestjs.io/docs/upgrading-to-jest30
  - https://exp.host/--/api/v2/versions (SDK 58 `relatedPackages`: `jest ~30.5.2`,
    `@types/jest 30.0.0`)
  - `jest-expo@58.0.11/package.json` (peer `jest ^29 || ^30`, peer
    `@react-native/jest-preset ^0.88.0`; internals depend on `babel-jest`,
    `jest-environment-node`, `jest-mock`, `jest-snapshot` `^30`)
- Decision: move to Jest 30 together with SDK 58. Staying on Jest 29 would mix two Jest
  trees because `jest-expo@58`'s internals are already Jest 30.
- Jest 30 changes checked against Soli (45 test files, 0 snapshots):
  - alias matchers removed (`toBeCalled`, `toReturn`, ...): grep clean;
  - `--testPathPattern` renamed to `--testPathPatterns`: not used in scripts;
  - `jest.mock` paths are case-sensitive: paths in `test/setup/*` and `package.json`
    `moduleNameMapper` already match on-disk casing;
  - non-enumerable properties are excluded from equality: no test relied on them.
- `@react-native/jest-preset` is not in Expo's bundled list; align it by hand to the RN
  version Expo installed: `yarn add -D @react-native/jest-preset@^0.88.0`.
- `jest-pnp-resolver` was removed on 2026-10-17 (Soli uses `nodeLinker: node-modules`; the
  PnP resolver predated the linker switch). The `resolver` slot now holds
  `react-native-reanimated/jest/resolver`, which Reanimated 4.7 needs under Jest (see
  `react-native-reanimated.md`).
- `jest-expo@58` no longer depends on `react-test-renderer` (it did in 57). Soli's three
  tests that import it keep working because `react-test-renderer 19.3.0` (peer
  `react ^19.3.0`) and `@types/react-test-renderer` are now explicit dev dependencies.
  React deprecates `react-test-renderer`; moving those tests to
  `@testing-library/react-native` is a tracked follow-up.
- `@react-native/jest-preset@0.88.0` itself still depends on `babel-jest ^29.7.0` and
  `jest-environment-node ^29.7.0`, so two `babel-jest` majors coexist in `node_modules`.
  Upstream choice; the suite is green.


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
