# React Native Gesture Handler Guide

Last refreshed: 2026-10-17

## Scope

- Package/tool: `react-native-gesture-handler`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.
- Soli's only consumer is the undo scrubber: `src/features/klondike/hooks/useUndoScrubber.ts`
  (`Gesture.Tap()`, `Gesture.Pan()`, `Gesture.Exclusive`) and
  `src/features/klondike/components/UndoScrubber.tsx` (`GestureDetector`), plus
  `GestureHandlerRootView` in `components/Provider.tsx`.

## Current guidance

Install only the version Expo bundles (`npx expo install --fix`). Expo SDK 58 bundles
`~3.3.0`. Keep using the builder API (`Gesture.*`) until Gesture Handler removes it; the
hook API migration is a tracked follow-up, not part of the SDK 58 upgrade.

## Sources

- Retrieved 2026-10-17:
  - https://docs.swmansion.com/react-native-gesture-handler/docs/ (v3 docs)
  - https://docs.swmansion.com/react-native-gesture-handler/docs/guides/migrating-to-v3
  - https://github.com/software-mansion/react-native-gesture-handler/releases
  - https://expo.dev/changelog/sdk-58
  - `react-native-gesture-handler@3.3.0` tarball (`package.json`, `src/index.ts`,
    `src/v3/index.ts`, `src/handlers/gestures/gestureObjects.ts`), read in a scratch directory

## Version facts

- Expo SDK 57 bundled `~2.32.0`; SDK 58 bundles `~3.3.0` (3.3.0 published 2026-09-11;
  3.4.0 exists upstream but is outside Expo's range). Peers: `react` and `react-native` at `*`.
- v3 drops the legacy (Paper) architecture. Soli is New Architecture only.
- `PureNativeButton` was removed in v3 (not used by Soli).

## Builder API vs hook API (v3)

- The builder API that Soli uses is still present in 3.3.0 but every entry is marked
  `@deprecated` in the typings (`gestureObjects.ts`): `Gesture.Tap()` -> `useTapGesture`,
  `Gesture.Pan()` -> `usePanGesture`, `Gesture.Pinch()` -> `usePinchGesture`,
  `Gesture.Rotation()` -> `useRotationGesture`, `Gesture.Fling()` -> `useFlingGesture`,
  composition `Gesture.Exclusive/Race/Simultaneous` -> `useExclusiveGestures` and friends.
  Deprecation is JSDoc only; there is no runtime warning or removal in 3.x so far.
- The hook API is exported from the `react-native-gesture-handler/v3` entry point
  (`src/v3/index.ts`), not from the package root.
- Known renames when migrating callbacks: `onStart` -> `onActivate`, `onEnd` ->
  `onDeactivate`, `onFinalize(success)` -> inspect `event.canceled`.
- `GestureDetector` and `GestureHandlerRootView` remain root exports.

## Soli-specific notes

- The scrubber composes a tap (`runOnJS(true)`) with a pan that sets `minDistance`,
  `failOffsetY`, `shouldCancelWhenOutside`, `hitSlop`, `cancelsTouchesInView`, `maxPointers`
  and wraps both in `Gesture.Exclusive`. All of these options exist in 3.3.0's builder API.
- Validation after any GH bump: `yarn scrubtest` on both platforms (the scrubber tap/pan
  automation), then manual drag-to-undo on the phone.
- Hook-API migration (follow-up): mechanical but it changes the scrubber's gesture graph,
  so plan it with a dedicated scrubber re-validation, not as part of an SDK upgrade.
