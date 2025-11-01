# PBI-4: Animation corrections for undo and foundation moves

[View in Backlog](../backlog.md#user-content-4)

## Overview
Ensure card animations remain coherent after undo operations and when moving cards to the foundations, including a celebratory glow effect.

## Problem Statement
Undoing moves and auto-founding cards currently trigger animations from incorrect locations or omit transitions entirely, breaking spatial consistency and player feedback.

## User Stories
- As a player I want card flights and foundation transitions to animate correctly after undo so that the board always reflects card origins visually.

## Technical Approach
- Reuse the existing measurement-based animation system to replay card flights from the true previous coordinates.
- Guarantee tableau-to-foundation transitions trigger the shared animation pipeline, including auto-complete scenarios.
- Add a short-duration glow effect once a card lands on a foundation without blocking subsequent animations.

## UX/UI Considerations
- Maintain animation timings consistent with the current motion language.
- Glow should read at a glance, avoid long pulses that could distract from ongoing play.
- Ensure accessibility by keeping contrast strong during the glow state.

## Acceptance Criteria
1. Undoing a move replays the card flight from the original pile position instead of from screen center.
2. Tableau-to-foundation moves always animate, including auto-foundation sequences at the end of the game.
3. Cards landing on a foundation emit a brief glow without delaying subsequent input.

## Dependencies
- Existing Reanimated-based card flight utilities.

## Open Questions
- Confirm desired glow duration and easing curve with design.

## Related Tasks
- To be defined in `docs/delivery/4/tasks.md`.

