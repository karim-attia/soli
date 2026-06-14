# Expo/RN SDK 56 React Native Guide

- Package: `react-native`
- Retrieved: 2026-06-14
- Primary docs:
  - https://reactnative.dev/versions
  - https://reactnative.dev/blog/2026/04/07/react-native-0.85
  - https://reactnative.dev/docs/upgrading
  - https://docs.expo.dev/versions/latest/

## Target facts

- React Native's official versions page lists `0.85` as the latest stable version.
- Expo SDK 56 maps to React Native `0.85`.
- React Native `0.85` highlights:
  - New Shared Animation Backend.
  - React Native DevTools improvements.
  - Metro TLS support.
- React Native `0.85` breaking changes called out by the official release post:
  - React Native's direct Jest preset moved to `@react-native/jest-preset`.
  - Node.js versions before `20.19.4` are no longer supported by React Native.
  - `StyleSheet.absoluteFillObject` was removed.
  - Several legacy native internals were removed or deprecated.

## Expo-specific upgrade rule

For Expo projects, React Native's own upgrading docs point back to the Expo SDK
upgrade walkthrough. Do not independently pin a React Native version outside the SDK
matrix unless there is a documented Expo-supported reason.

## Repo usage notes

- Soli currently uses `react-native@0.83.6`.
- Soli has one known direct removed API usage:
  - `app/(tabs)/two.tsx`: `StyleSheet.absoluteFillObject`
- Soli uses `jest-expo`, not `preset: "react-native"`, so the new
  `@react-native/jest-preset` package should not be added unless tests prove it is
  required.
- Test animation-heavy flows after upgrade because the new animation backend can
  affect gameplay feel even when APIs compile.

## Example code change

```tsx
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 14, 22, 0.12)',
  },
})
```
