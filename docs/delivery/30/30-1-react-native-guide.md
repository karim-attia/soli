# 30-1 React Native Guide

- **Package**: `react-native`
- **Retrieved**: 2026-03-02
- **Primary docs**:
  - React Native 0.83 release: https://reactnative.dev/blog/2026/01/21/version-0.83
  - Expo SDK 55 compatibility matrix: https://docs.expo.dev/versions/v55.0.0/

## Version Alignment for SDK 55
- Target `react-native@0.83.x` (Expo-managed exact alignment via `expo install --fix`)

## 0.83 Upgrade Notes Relevant to This Repo
- React Native team indicates no intentional user-facing breaking changes in 0.83.
- Internal platform and dependency updates still require full verification of animations, gestures, and navigation.
- For Expo projects, prefer Expo’s upgrade tooling over manual React Native template merges.

## Practical Verification Areas
- Gesture + animation interactions (`react-native-gesture-handler`, `react-native-reanimated`, `react-native-worklets`)
- Navigation transitions and drawer behavior
- Web export compatibility (`react-native-web`)
- iOS/Android native build sanity checks

## Task 30-1 Usage Notes
- Treat RN version updates as potentially behavioral even without explicit breaking API notes.
- Run both automated and smoke checks on gameplay flows after dependency alignment.

