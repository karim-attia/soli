# 30-1 React Native Reanimated Guide

- **Package**: `react-native-reanimated` (+ `react-native-worklets`)
- **Retrieved**: 2026-03-02
- **Primary docs**:
  - Reanimated in Expo SDK 55: https://docs.expo.dev/versions/v55.0.0/sdk/reanimated/
  - Worklets in Expo SDK 55: https://docs.expo.dev/versions/v55.0.0/sdk/worklets/
  - SDK 55 reference matrix: https://docs.expo.dev/versions/v55.0.0/

## Version Alignment for SDK 55
- Bundled reanimated in SDK 55 docs: `~4.2.1`
- Bundled react-native-worklets in SDK 55 docs: `0.6.1`

## Migration Notes
- Keep `react-native-reanimated` and `react-native-worklets` aligned with Expo’s bundled versions.
- Use `expo install` to avoid native ABI mismatch.
- Re-run animation-heavy user flows after upgrade (stock draw, card flights, celebration).

## Babel / runtime expectations
- Ensure reanimated Babel plugin setup remains valid after dependency updates.
- Restart Metro with cache clear if worklet or plugin changes are made.

## Task 30-1 Usage Notes
- This app is animation-heavy, so reanimated/worklets compatibility is a high-risk area.
- Validation should prioritize gameplay interactions and animation smoothness, not just compile success.

