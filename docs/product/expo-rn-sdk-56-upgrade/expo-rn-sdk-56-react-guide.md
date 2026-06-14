# Expo/RN SDK 56 React Guide

- Packages: `react`, `react-dom`, `@types/react`
- Retrieved: 2026-06-14
- Primary docs:
  - https://react.dev/blog/2025/10/01/react-19-2
  - https://docs.expo.dev/versions/latest/
  - https://reactnative.dev/blog/2026/04/07/react-native-0.85

## Target facts

- Expo SDK 56 maps to React `19.2.3`.
- Soli currently uses React `19.2.0`.
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
  TypeScript diagnostics.
- If TypeScript moves to 6.x through Expo alignment, test `tsgo` separately from
  React runtime behavior.
