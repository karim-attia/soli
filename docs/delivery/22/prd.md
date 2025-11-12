# PBI-22: Consistent stock draw animations

[View in Backlog](../backlog.md#user-content-22)

## Overview
Refine the stock stack presentation and animations so that each draw and waste update originates from the true top card, improving clarity and minimizing unexpected motion.

## Problem Statement
Players sometimes see newly drawn cards appear from off-screen or overshoot their destinations because the stock renders as a single stacked element. Waste fan updates also apply broad translations that can nudge every card instead of only the ones that should move.

## User Stories
- As a player I want the stock to animate the actual top card so that every draw feels predictable.
- As a player I want the waste fan to shift smoothly without jarring jumps so that I can track the card order.

## Technical Approach
- Refactor the stock stack to render individual `CardSprite` instances so that animation controllers can target specific cards, mirroring the foundation refactor.
- Update draw handling to flip the top stock card in place, uncover the new top card immediately, and reuse measured origins for flight paths.
- Adjust waste fan choreography so that only the visible fan cards slide left while the third (oldest) card fades out instead of flying across the board.

## UX/UI Considerations
- Preserve existing spacing, hit areas, and accessibility labels for stock and waste piles.
- Ensure the draw button interaction timing stays responsive despite new animation sequencing.

## Acceptance Criteria
1. Stock stack renders each card individually, matching foundation rendering granularity.
2. Drawing uncovers the next stock card and animates the drawn card directly from the stack with a short flip-and-flight that never overshoots.
3. Waste fan updates slide the first two cards left while the third card fades out without shifting positions.

## Dependencies
- Existing flight controller utilities for card motion.
- Current stack and waste state machinery.

## Open Questions
- None identified.

## Related Tasks
- [Tasks for PBI 22](./tasks.md)

