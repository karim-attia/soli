# PBI-17: Misc polish backlog

[View in Backlog](../backlog.md#user-content-17)

## Overview
This PBI serves as the miscellaneous polish bucket for Klondike. It groups quality-of-life fixes that improve startup smoothness, control feedback, and other small paper cuts so that ongoing delivery has a single home for lightweight cleanup.

## Problem Statement
Players still hit various rough edges: waste-fan draws overshoot, the layout jumps before settling, undo appears when it has nothing to do, and resuming sessions replays unnecessary animations. Toast notifications distract from the board, and scrubbing the undo timeline artificially inflates the move counter while undo depth eventually runs out. These papercuts erode trust in polish and make the experience feel inconsistent.

## User Stories
- As a player, I want draw animations to feel smooth so that the game appears deliberate rather than jittery.
- As a player, I want the screen to render without layout shifts at startup so that the interface feels stable.
- As a player, I only want to see the undo button when there is something to undo so that controls feel meaningful.
- As a returning player, I want my ongoing game to resume instantly without animations after app restart, and a finished game to start fresh, so that I remain in flow.
- As a player using undo scrub, I want rewinding or fast-forwarding history to avoid adding bogus moves or running out of undo steps so that statistics stay accurate.
- As a player, I do not want toast popups until the UX is refined so that attention stays on the board.

## Technical Approach
- Tweak waste fan animation easing and duration to eliminate overshoot and secondary bounces while keeping motion responsive.
- Identify the root cause of startup layout shifts (likely lazy measurement or conditional rendering) and add suspense guards or initial layout placeholders to keep geometry stable.
- Gate undo button visibility behind history presence, integrating with existing state selectors.
- Extend persistence and hydration logic to suppress animations on resume while still replaying state, and trigger a new shuffle immediately when the previous game ended.
- Introduce a feature flag or centralized no-op for toast issuance to silence notifications globally.
- Update timeline history handling so undo/scrub restores the previous snapshot verbatim, keeps move counts accurate, and no longer enforces a finite undo limit.

## UX/UI Considerations
- Animation timing changes must retain readability across devices.
- Startup layout adjustments should avoid new flicker or blank states.
- Control visibility changes need smooth cross-fades or immediate toggles consistent with current UI patterns.
- Resuming without animations must not feel broken; ensure card positions appear instantly correct.
- Temporarily removing toasts should not break existing feedback flows; consider placeholder logging for developers.

## Acceptance Criteria
1. Waste fan draw animation no longer overshoots and eases smoothly into place.
2. App launch avoids layout shifts before the first interactive frame.
3. Undo button remains hidden until the first move occurs in a game session.
4. Restarting the app resumes ongoing games without replaying animations, while finished games immediately start a fresh shuffle.
5. Toast notifications are disabled pending UX redesign.
6. Undo scrubbing/rewind actions restore the chosen state without incrementing move counts and history depth no longer runs out.

## Dependencies
- Existing animation controller utilities in `src/solitaire`.
- State persistence in `src/state/history.tsx` and `src/state/settings.tsx`.

## Open Questions
- Are there analytics or developer hooks that rely on toasts for surfacing events?
- Should an interim developer-mode toast remain available behind a flag?

## Related Tasks
- [Tasks for PBI 17](./tasks.md)

