# PBI-10: Game history surface

[View in Backlog](../backlog.md#user-content-10)

## Overview
Provide a history view reachable from the burger menu that tracks shuffles, solved status, and overall completion counts.

## Problem Statement
Players cannot currently review past games or track progress, limiting replay value and insights into solvable shuffles.

## User Stories
- As a player I want to review past games so that I can see which shuffles I solved.

## Technical Approach
- Add a history entry in the burger menu that navigates to a Tamagui list of saved games.
- Persist shuffle identifiers, timestamps, and solved state in local storage shared with settings.
- Present aggregate statistics such as total solved games.

## UX/UI Considerations
- History list should be scannable with clear solved badges and shuffle identifiers.
- Handle empty states with encouraging messaging.

## Acceptance Criteria
1. The burger menu links to a history page showing saved games with shuffle ID and solved state.
2. History persists shuffle identifiers and solved/not-solved status.
3. The history view displays the total number of solved games.

## Dependencies
- Storage layer introduced in PBI-9 and solvable game records from PBI-11.

## Open Questions
- Determine additional metadata to capture (e.g., completion time).

## Related Tasks
- To be defined in `docs/delivery/10/tasks.md`.

