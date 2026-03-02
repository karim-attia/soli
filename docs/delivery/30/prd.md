# PBI-30: Upgrade project to Expo SDK 55 + React alignment

[View in Backlog](../backlog.md#user-content-30)

## Overview
Upgrade the project from Expo SDK 54 to SDK 55 and align React/React Native plus core Expo-managed dependencies to the SDK 55 compatibility matrix.

## Problem Statement
- The project was pinned to SDK 54-era dependency versions.
- Staying behind the supported SDK baseline increases maintenance risk and makes future upgrades harder.
- We need a source-backed, verifiable migration that preserves current behavior.

## User Stories
- As a developer, I want the project on Expo SDK 55 so builds and tooling remain supported.
- As a maintainer, I want migration documentation linked to official sources so future upgrades are lower-risk.

## Technical Approach
- Use official Expo SDK 55 guidance as the source of truth.
- Upgrade dependencies using `yarn up` with the versions that Expo compatibility checks expect.
- Re-run validation commands (`expo install --check`, `tsc`, `jest`, `expo export`) and fix upgrade regressions.
- Document package-specific migration guidance and implementation findings under this PBI.

## UX/UI Considerations
- No intentional UX redesign is included.
- Existing UI behavior should remain unchanged after dependency/runtime upgrades.

## Acceptance Criteria
1. Core SDK dependencies align with Expo SDK 55 expectations and `npx expo install --check` reports up to date.
2. React and React Native are upgraded to SDK 55-compatible versions and TypeScript/tests pass.
3. Web export completes successfully under SDK 55.
4. Upgrade findings and package guidance docs are captured with links to official sources.

## Dependencies
- Expo SDK 55 changelog and upgrade walkthrough.
- React 19.2 and React Native 0.83 release documentation.
- Existing project configuration (`app.json`, Babel/Metro config, package manifests).

## Open Questions
- Should we run a full native prebuild regeneration in a separate follow-up task, or defer to release-prep workflows?
- Should optional React 19.2 features (for example `useEffectEvent`) be adopted incrementally in a dedicated refactor task?

## Related Tasks
- See `docs/delivery/30/tasks.md`.

