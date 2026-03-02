# 30-1 Expo Router Guide

- **Package**: `expo-router`
- **Retrieved**: 2026-03-02
- **Primary docs**:
  - Expo Router SDK 55 docs: https://docs.expo.dev/versions/v55.0.0/sdk/router/
  - Native tabs docs (SDK 55): https://docs.expo.dev/versions/v55.0.0/sdk/router-native-tabs/
  - SDK 55 changelog (router migration callouts): https://expo.dev/changelog/sdk-55

## Version Alignment for SDK 55
- Bundled expo-router version in SDK 55 docs: `~55.0.3`
- Use `npx expo install --fix` to select the exact compatible version.

## Migration Notes
- If using headless tabs, `reset` is renamed to `popToTopOnBlur`.
- If using native tabs, check SDK 55 migration notes and update component usage accordingly.
- Projects not using native/headless tab APIs may require no router code changes beyond package version alignment.

## Example (headless tab prop rename)
```tsx
<TabTrigger popToTopOnBlur name="home" href="/" />
```

## Task 30-1 Usage Notes
- Audit this repository for native/headless tab usage before making router code edits.
- If those APIs are absent, keep router changes limited to dependency version alignment and validation.

