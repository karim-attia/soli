# 30-1 Expo Guide

- **Package**: `expo` (SDK 55 target)
- **Retrieved**: 2026-03-02
- **Primary docs**:
  - SDK 55 changelog: https://expo.dev/changelog/sdk-55
  - Upgrade walkthrough: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
  - SDK reference matrix: https://docs.expo.dev/versions/v55.0.0/

## Upgrade Workflow (Official)
1. Upgrade Expo SDK package:
   - `npm install expo@^55.0.0` (or the equivalent package manager command).
2. Align dependency versions:
   - `npx expo install --fix`
3. Run diagnostics:
   - `npx expo-doctor`
4. Handle native project updates:
   - CNG projects: regenerate native directories.
   - Non-CNG projects: run `npx pod-install` and apply native diffs.
5. Follow SDK 55 changelog migration items.

## SDK 55 Compatibility Baseline
- React Native: `0.83`
- React: `19.2.0`
- React Native Web: `0.21.0`
- Minimum Node.js: `20.19.x`
- Android compile/target SDK: `36`
- iOS minimum deployment target: `15.1+`

## Breaking/Actionable SDK 55 Notes
- New Arch assumptions continue (legacy compatibility keeps shrinking).
- Router-related migration notes can require code updates if native/headless tabs are used.
- Expo recommends incremental SDK upgrades and using release notes as the migration source of truth.

## Example Command Sequence
```bash
npx expo install expo@^55.0.0
npx expo install --fix
npx expo-doctor
```

## Task 30-1 Usage Notes
- Prefer `expo install` over manual semver guessing for Expo-managed dependencies.
- After dependency alignment, run TypeScript + tests + Expo export/doctor before considering task review-ready.

