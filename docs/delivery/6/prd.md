# PBI-6: Classic victory celebrations

[View in Backlog](../backlog.md#user-content-6)

## Overview
Deliver a nostalgic win experience featuring randomized celebration animations, temporary board lock, and a streamlined prompt to start a new game.

## Problem Statement
Winning a game currently ends abruptly, lacking the satisfying feedback players expect from Solitaire and allowing post-win interactions that can cause confusion.

## User Stories
- As a player I want a classic victory celebration after winning so that finishing a game feels rewarding.

## Technical Approach
- Create a library of ten celebration animation patterns that reposition cards around the screen using existing rendering primitives.
- Freeze game interactions once the final card is placed until celebrations conclude.
- Reuse the current new game dialog, showing it automatically once the sequence ends without a cancel button.

## UX/UI Considerations
- Animations should evoke classic Solitaire while respecting modern performance limits.
- Ensure celebrations do not induce motion sickness by providing predictable durations and easing.
- Keep the new game prompt consistent with current styling minus the cancel action.

## Acceptance Criteria
1. After the final card reaches a foundation, interactions with the board are disabled until the celebration ends.
2. A win triggers one of ten randomized celebration animations that move cards around the screen.
3. Once the celebration ends, the existing new-game dialog appears without a cancel option.

## Dependencies
- Card rendering layer and animation utilities.

## Open Questions
- Determine whether celebrations should respect the global animation setting (see PBI-9).

## Related Tasks
- To be defined in `docs/delivery/6/tasks.md`.

