# PBI-31: Migrate tooling to tsgo + oxlint + oxfmt and remove Biome

[View in Backlog](../backlog.md#user-content-31)

## Overview
Migrate this project from the current Biome-centered setup to the same tooling stack used in `animals`: `tsgo` for native TypeScript checking, `oxlint` for linting, and `oxfmt` for formatting.

## Problem Statement
- Tooling is currently inconsistent with the newer project baseline used in `animals`.
- Biome configuration still exists in the repository and the project does not expose a unified lint/format/typecheck script set aligned with Oxc + tsgo tools.
- The team needs a source-backed migration that is explicit, reproducible, and documented for future contributors.

## User Stories
- As a developer, I want this project to use tsgo + oxlint + oxfmt so development workflows match the new standard used across repos.
- As a maintainer, I want Biome fully removed so only one lint/format toolchain remains.

## Technical Approach
- Analyze `animals` project configuration (`package.json`, `.oxlintrc.json`, `.oxfmtrc.json`, `tsconfig.tsgo.json`) and mirror the same pattern in `soli`.
- Add Oxc and tsgo dev dependencies, add scripts for lint/fix/format/check/typecheck, and add tool config files.
- Remove Biome configuration from the repo.
- Produce package guide documents for `tsgo`, `oxlint`, and `oxfmt` using official documentation links and dated implementation notes.

## UX/UI Considerations
- No intended user-facing UI changes.
- Any code formatting-only diffs should preserve runtime behavior.

## Acceptance Criteria
1. `package.json` includes scripts for `format`, `format:check`, `lint`, `lint:fix`, `lint:strict`, `typecheck:tsc`, and `typecheck:tsgo`.
2. `.oxlintrc.json`, `.oxfmtrc.json`, and `tsconfig.tsgo.json` are present and aligned to project needs.
3. `biome.json` is removed and Biome is no longer part of active project configuration.
4. Source-backed guides exist for `tsgo`, `oxlint`, and `oxfmt` under this PBI.
5. Verification commands for lint/format/typecheck are documented in the task output.

## Dependencies
- `@typescript/native-preview` (`tsgo`)
- `oxlint`
- `oxfmt`
- Existing TypeScript and Expo project configuration

## Open Questions
- Should CI switch to strict lint mode by default (`lint:strict`) or keep that as an opt-in command?
- Should we eventually normalize legacy `eslint-disable` comments to `oxlint`-style directives in a separate follow-up?

## Related Tasks
- See `docs/delivery/31/tasks.md`.
