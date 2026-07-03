# React Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `react` / `react-dom`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this for React and React DOM compatibility in Soli. The app is on React 19.2.3; adopt newer React APIs only when they simplify a real effect or state boundary.

## Detailed guidance

The sections below are the definitive combined notes for this package or tool. Keep version-specific context when it affects compatibility, but update this single file instead of adding task- or feature-prefixed guides.

### React 19.2 Upgrade Notes

- **Package**: `react` / `react-dom`
- **Retrieved**: 2026-03-02
- **Primary docs**:
  - React 19.2 release: https://react.dev/blog/2025/10/01/react-19-2
  - React upgrade recommendations (via Expo SDK 55 matrix): https://docs.expo.dev/versions/v55.0.0/

## Version Alignment for SDK 55
- Target `react@19.2.0`
- Target `react-dom@19.2.0` (for web builds)

## React 19.2 Highlights Relevant to This Repo
- `Activity` API is available for state-preserving hide/show flows.
- `useEffectEvent` helps isolate non-reactive logic from reactive effects.
- Server Components are stabilized, but this Expo RN app does not require adopting them for this task.

## Migration Guidance for This App
- Prioritize version alignment and runtime/test stability over feature adoption.
- Keep existing React patterns unless a concrete bug or warning appears during upgrade validation.
- Update `@types/react` to the matching major/minor for accurate TS behavior.

## Example (Optional modern pattern)
```tsx
import { useEffectEvent } from 'react'

const onConnected = useEffectEvent(() => {
  // non-reactive callback logic
})
```

## Usage Notes
- No broad React API rewrite is required just to move from `19.1` to `19.2`.
- Focus on dependency consistency and warnings/errors surfaced by TypeScript, Expo doctor, and runtime tests.

## Refresh check (2026-07-03)

- Status: historical SDK 55 React guide. The original `react@19.2.0` target is correct for
  SDK 55, but it is not the current repo version.
- Current repo state: Soli resolves `react@19.2.3` and `react-dom@19.2.3`, matching Expo
  SDK 56 and the current SDK 57 React line.
- Still-useful guidance: React 19.2 feature adoption should remain deliberate. Do not
  migrate to `<Activity />`, `useEffectEvent`, or React Performance Tracks unless a
  specific Soli workflow benefits from it.
- Sources:
  - https://react.dev/blog/2025/10/01/react-19-2
  - https://docs.expo.dev/versions/v56.0.0/
  - https://docs.expo.dev/versions/latest/

### SDK 56 React Notes

- Packages: `react`, `react-dom`, `@types/react`
- Retrieved: 2026-06-14
- Refreshed: 2026-07-03
- Primary docs:
  - https://react.dev/blog/2025/10/01/react-19-2
  - https://docs.expo.dev/versions/v56.0.0/
  - https://docs.expo.dev/versions/latest/
  - https://reactnative.dev/blog/2026/04/07/react-native-0.85

## Target facts

- Expo SDK 56 maps to React `19.2.3`.
- Soli currently resolves `react@19.2.3` and `react-dom@19.2.3`.
- Expo SDK 57 still maps to React `19.2.3`.
- React 19.2 introduced or highlighted:
  - `<Activity />`
  - `useEffectEvent`
  - `cacheSignal` for React Server Components
  - React Performance Tracks
  - React DOM partial pre-rendering support
  - `useId` prefix changes
- React Native 0.85 keeps React on the React 19.2 family through Expo SDK 56.

## Repo usage notes

- No React API migration is expected because Soli is already on React 19.2.
- Do not adopt `<Activity />`, `useEffectEvent`, or React Compiler as part of the
  core SDK upgrade unless a compile/runtime failure requires it.
- `@types/react` should be aligned by Expo's dependency tooling or by the resulting
  TypeScript diagnostics. `yarn.lock` currently has both `@types/react@19.2.14` for the
  repo range and `@types/react@19.2.17` through transitive demand; let package tooling
  own that unless TypeScript reports a concrete issue.
- If TypeScript moves to 6.x through Expo alignment, test `tsgo` separately from
  React runtime behavior.

## Refresh check (2026-07-03)

- Status: current for Soli's React runtime version.
- No new React API adoption is required by the SDK 56 or SDK 57 matrices.
