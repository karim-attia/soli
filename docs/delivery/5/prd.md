# PBI-5: Auto-foundation flow polish

[View in Backlog](../backlog.md#user-content-5)

## Overview
Accelerate and stabilize the auto-to-foundation experience by ensuring smooth animations, smarter tableau backfilling, and removing invalid-move wiggles.

## Problem Statement
Endgame auto-complete currently feels sluggish and occasionally triggers wiggle feedback on already placed foundation cards, leading to confusion and delays.

## User Stories
- As a player I want the auto-to-foundation flow to be fast and stable so that finishing a game feels smooth.

## Technical Approach
- Hook auto-complete moves into the shared animation system used for manual card flights.
- When iterating through the stock, schedule legal tableau drops to minimize wasted cycles.
- Suppress invalid-move wiggles on foundation piles during automated sequences.

## UX/UI Considerations
- Preserve the existing cadence of auto-play while making motion readable.
- Avoid sudden jumps that break continuity between automated and manual moves.

## Acceptance Criteria
1. Auto-complete animates cards using the same paths as manual moves.
2. When auto-moving through the stock, eligible tableau moves backfill automatically to accelerate completion.
3. Cards already on foundations no longer wiggle when tapped during auto-complete.

## Dependencies
- Auto-complete orchestration logic and animation utilities.

## Open Questions
- Determine whether additional UI affordances (progress indicator) are required.

## Related Tasks
- To be defined in `docs/delivery/5/tasks.md`.

