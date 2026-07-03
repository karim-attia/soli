# React Native Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `react-native`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this for React Native version compatibility and upgrade notes. The app is on RN 0.85.3 through Expo SDK 56; native validation remains required for upgrade work.

## Detailed guidance

The sections below are the definitive combined notes for this package or tool. Keep version-specific context when it affects compatibility, but update this single file instead of adding task- or feature-prefixed guides.

### SDK 55 React Native Notes

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

## Usage Notes
- Treat RN version updates as potentially behavioral even without explicit breaking API notes.
- Run both automated and smoke checks on gameplay flows after dependency alignment.

## Refresh check (2026-07-03)

- Status: historical SDK 55 / React Native 0.83 guide. Keep it as old-task context.
- Current repo state: Soli resolves `react-native@0.85.3`, which is the Expo SDK 56 React
  Native line.
- Current upstream: React Native 0.86 is now the latest stable release and Expo SDK 57 maps
  to React Native 0.86. RN 0.86 is reported by the RN team as having no user-facing
  breaking changes, with Android edge-to-edge and DevTools improvements.
- Superseding guide: use `react-native.md` for current SDK 56 facts.
- Sources:
  - https://reactnative.dev/blog/2026/04/07/react-native-0.85
  - https://reactnative.dev/blog/2026/06/11/react-native-0.86
  - https://docs.expo.dev/versions/latest/

### SDK 56 React Native Notes

- Package: `react-native`
- Retrieved: 2026-06-14
- Refreshed: 2026-07-03
- Primary docs:
  - https://reactnative.dev/versions
  - https://reactnative.dev/blog/2026/04/07/react-native-0.85
  - https://reactnative.dev/blog/2026/06/11/react-native-0.86
  - https://reactnative.dev/docs/upgrading
  - https://docs.expo.dev/versions/v56.0.0/
  - https://docs.expo.dev/versions/latest/
  - https://expo.dev/changelog/sdk-57

## Target facts

- Soli currently resolves `react-native@0.85.3`.
- Expo SDK 56 maps to React Native `0.85`.
- React Native `0.86` is now latest upstream and Expo SDK 57 maps to React Native `0.86`.
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

- Soli no longer has a direct `StyleSheet.absoluteFillObject` usage in `app`, `src`, or
  `components`; current hits use the supported `StyleSheet.absoluteFill`.
- Soli uses `jest-expo`, and `@react-native/jest-preset@0.85.3` is installed because
  `jest-expo` needs the extracted RN 0.85 preset package.
- Test animation-heavy flows after upgrade because the new animation backend can
  affect gameplay feel even when APIs compile.
- RN 0.86 release notes say the upgrade from RN 0.85 should not require app-code changes,
  but Soli should still validate safe areas, BackHandler, modals, and Android 15+
  edge-to-edge behavior when planning SDK 57.

## Example code change

```tsx
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(9, 14, 22, 0.12)',
  },
})
```

## Refresh check (2026-07-03)

- Status: current for Soli's SDK 56 / RN 0.85.3 baseline.
- Forward-looking note: React Native 0.86 / SDK 57 is the next upgrade line, not a patch
  to apply inside this guide.
