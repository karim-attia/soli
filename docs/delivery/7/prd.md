# PBI-7: Layout cleanup for release

[View in Backlog](../backlog.md#user-content-7)

## Overview
Modernize the primary game screen by consolidating navigation into the burger menu, updating header structure, and applying a classic green felt backdrop.

## Problem Statement
The current layout still showcases prototype tabs, redundant buttons, and inconsistent branding, creating friction for publish readiness.

## User Stories
- As a player I want the layout cleaned up for release so that the game matches modern app expectations.

## Technical Approach
- Move non-essential views (Tab Two, Hello) into burger menu entries and remove bottom tab navigation.
- Update the header to display the Klondike title in place of "Tab One".
- Remove the bottom draw button and adjust spacing to accommodate a green background playfield.

## UX/UI Considerations
- Ensure burger menu structure remains discoverable with newly added items.
- The green background should enhance contrast without clashing with card colors.
- Maintain responsive layout across common device sizes and orientations.

## Acceptance Criteria
1. Bottom tabs are removed and their content moved into the burger menu.
2. The header shows the Klondike title where "Tab One" currently appears.
3. The draw button is removed from the bottom controls and the playfield uses a green background for contrast.

## Dependencies
- Navigation configuration and Tamagui theming.

## Open Questions
- Confirm whether the green background should adapt between light and dark themes.

## Related Tasks
- To be defined in `docs/delivery/7/tasks.md`.

