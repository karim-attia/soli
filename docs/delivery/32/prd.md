# PBI-32: Refine the iOS play header so New Game stays visible without crowding

[View in Backlog](../backlog.md#user-content-32)

## Overview
Refine the iOS play-screen header so the drawer affordance, centered title, and visible `New Game` action fit comfortably on compact-width phones while keeping Android unchanged.

## Problem Statement
- The current Play header groups `New Game` and the burger menu on the trailing side.
- On compact iPhones, that trailing cluster can crowd or overlap the centered title and make the header feel visually heavy.
- The user wants `New Game` to remain directly visible on iOS, but still unobtrusive and clearly separate from the currently running game.

## User Stories
- As an iPhone player, I want `New Game` to remain visible in the header without clipping so the control is easy to find when I need it.
- As a player, I want the drawer button to live in the standard leading navigation position so the title has more room to breathe.
- As an Android player, I want the current header layout to stay unchanged.

## Technical Approach
- Use iOS-specific navigation options on the Play screen to place the drawer button in the leading header slot and keep `New Game` in the trailing slot.
- Restyle the iOS `New Game` control to behave like a compact, borderless navigation-bar action instead of a filled button.
- Keep iOS header controls at 44pt minimum hit targets with compact glyph/text sizing informed by Apple navigation and accessibility guidance.
- Leave the Android Play header configuration unchanged.

## UX/UI Considerations
- Keep the default iOS centered title and standard header height rather than introducing a custom taller bar.
- Make the `New Game` action visually secondary by using plain text styling rather than a filled pill.
- Preserve the existing confirmation alert before dealing a new game.

## Acceptance Criteria
1. On iOS, the Play screen shows the drawer control on the left, the `Soli` title centered, and a directly visible `New Game` action on the right.
2. The iOS header layout avoids title/action overlap on compact-width phones like the screenshot supplied by the user.
3. iOS header controls maintain 44pt minimum tap targets with compact visual sizing.
4. Android Play header layout and behavior remain unchanged.

## Dependencies
- Existing Expo Router drawer header configuration
- Existing `requestNewGame` confirmation flow in `useKlondikeGame`

## Open Questions
- None for this scoped refinement.

## Related Tasks
- See `docs/delivery/32/tasks.md`.
