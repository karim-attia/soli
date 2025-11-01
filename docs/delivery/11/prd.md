# PBI-11: Solvable shuffle mode

[View in Backlog](../backlog.md#user-content-11)

## Overview
Introduce an optional mode that serves only solvable shuffles sourced from a curated list while still randomizing the stock.

## Problem Statement
Players who want guaranteed solvable games cannot currently opt in, leading to potential frustration with unwinnable layouts.

## User Stories
- As a player I want to opt into solvable shuffles so that each game can be completed with skill.

## Technical Approach
- Curate and ship a data file of solvable tableau layouts without stock contents.
- Add a settings toggle that, when enabled, selects the least-played unsolved layout from the data set and reconstructs the game while randomizing the stock.
- Update history persistence to mark solvable games and record usage counts.

## UX/UI Considerations
- Make the solvable toggle descriptive about its behavior and limitations.
- Provide feedback when no unused solvable shuffles remain.

## Acceptance Criteria
1. A setting enables "solvable games only" mode.
2. A curated list of solvable shuffles is stored (tableau state only) while the stock remains randomized.
3. When the setting is enabled, the next game reuses the least-played solvable shuffle that has not been solved yet and history marks solvable games with a badge.

## Dependencies
- Settings surface from PBI-9 and history tracking from PBI-10.

## Open Questions
- Define data format for solvable shuffles and tooling to validate additions.

## Related Tasks
- To be defined in `docs/delivery/11/tasks.md`.

