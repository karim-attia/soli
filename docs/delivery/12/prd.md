# PBI-12: Solvable game sharing pipeline

[View in Backlog](../backlog.md#user-content-12)

## Overview
Allow players to opt into sharing solved solvable shuffles with backend infrastructure for manual curation.

## Problem Statement
The solvable shuffle catalog is static, and there is no way to crowdsource newly solved layouts for future inclusion.

## User Stories
- As a player I want to share solvable shuffles so that the catalog can grow.

## Technical Approach
- Add a settings toggle that opts players into upload behavior once they finish a solvable game.
- Capture shuffle identifiers and move sequences required to reproduce the solution.
- POST the payload to a configurable backend endpoint (stubbed initially), queueing entries for manual review.

## UX/UI Considerations
- Communicate clearly what data is being shared and provide confirmation of success or failure.
- Respect privacy expectations by limiting shared data to gameplay context.

## Acceptance Criteria
1. A setting allows opting into sharing solved games.
2. When enabled, completed solvable games upload their shuffle and solution steps to a backend endpoint (to be defined).
3. Shared shuffles are queued for manual review and tagged accordingly in history.

## Dependencies
- Solvable shuffle mode (PBI-11), settings surface (PBI-9), and backend endpoint definition.

## Open Questions
- Identify the backend service and authentication mechanics required for uploads.

## Related Tasks
- To be defined in `docs/delivery/12/tasks.md`.

