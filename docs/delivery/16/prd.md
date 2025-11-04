# PBI-16: Developer mode tools

[View in Backlog](../backlog.md#user-content-16)

## Overview
Add a gated developer-mode experience that unlocks internal tooling such as the solver controls and an instant demo game launcher while keeping production players focused on standard gameplay.

## Problem Statement
Internal testing utilities currently surface alongside player-facing controls, creating the risk that production users discover unfinished features and making it harder for developers to validate flows that rely on specific shuffles.

## User Stories
- As a developer I want to enable a developer mode toggle so that advanced tooling becomes available without exposing it to regular players.

## Technical Approach
- Extend the persisted settings state with a `developerMode` boolean that defaults to `false` and hydrates with the rest of the preferences.
- Hide solver-related menu entries and navigation items whenever developer mode is disabled.
- Add a header control on the Klondike screen that, when developer mode is enabled, starts a predefined all-but-solved demo shuffle for quick validation.

## UX/UI Considerations
- Keep the developer-mode toggle visually distinct (e.g., grouped under an “Advanced” heading) to discourage accidental activation.
- Ensure the solver menu items disappear cleanly without leaving gaps or separators.
- Label the demo game control clearly (e.g., “Demo Game”) and surface it only while developer mode remains active.

## Acceptance Criteria
1. Settings include a persisted developer-mode toggle exposed only to internal builds.
2. Solver menu entries stay hidden whenever developer mode is off.
3. The Klondike header provides a “Demo Game” control that starts a hardcoded easy shuffle when developer mode is enabled.

## Dependencies
- Settings infrastructure from PBI-9.
- Solvable shuffle dataset currently owned by PBI-11.

## Open Questions
- Should developer mode be hidden behind a long-press gesture or password in production builds?
- What copy should explain developer mode to team members without confusing players if they see it?

## Related Tasks
- To be defined in `docs/delivery/16/tasks.md`.


