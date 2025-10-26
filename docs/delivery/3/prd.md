# PBI-3: Expo Dependency Cleanup

[View in Backlog](../backlog.md#user-content-3)

## Overview
Align all Expo- and Metro-related dependencies with the versions required for SDK 53 so that builds, `expo install --check`, and `npx expo-doctor` no longer report mismatches. This ensures deterministic builds locally and in CI.

## Problem Statement
`npx expo-doctor` currently flags missing peer dependencies (`expo-constants`), disallowed packages (`@types/react-native`, `@expo/metro-config`), and outdated Expo/Metro/React Native versions. Leaving these unresolved risks broken native builds and undermines developer confidence.

## User Stories
- As a developer, I want `expo-doctor` to pass so I can trust the toolchain before shipping.
- As a build engineer, I want package versions managed via `expo install` so future upgrades stay manageable.

## Technical Approach
- Remove the disallowed dev dependencies (`@types/react-native`, `@expo/metro-config`).
- Use `npx expo install --check` (or official release notes) to upgrade Expo/Metro/React Native packages to the SDK 53 recommended ranges.
- Add missing peer dependencies (`expo-constants`) via `expo install` so native modules are satisfied.
- Re-run `expo-doctor` and document the clean report.

## UX/UI Considerations
Not applicable—this work affects tooling only.

## Acceptance Criteria
1. Package.json no longer lists `@types/react-native` or `@expo/metro-config`.
2. `expo install`-managed packages (expo, expo-router, expo-build-properties, metro, react-native, etc.) match the SDK 53 expected versions.
3. `expo-constants` is installed as a direct dependency.
4. `npx expo-doctor` finishes without dependency errors or warnings.
5. Documentation (backlog/task files) reflects the updates.

## Dependencies
- Existing Expo SDK 53 project configuration.

## Open Questions
- None.

## Related Tasks
- [View task list](./tasks.md)
