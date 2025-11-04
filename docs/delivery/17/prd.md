# PBI-17: Startup polish and control stability

[View in Backlog](../backlog.md#user-content-17)

## Overview
This PBI bundles a set of quality-of-life fixes that tackle startup jitter, card control feedback, and session continuity to ensure the Klondike experience feels calm and predictable.

## Problem Statement
Players encounter rough edges during the first seconds of launch and during core interactions. Waste fan draws overshoot, the layout jumps around before settling, freshly started games show undo controls before they are relevant, and post-restart session handling replays animations unnecessarily. Toast notifications currently distract from gameplay. These issues erode trust in the game’s polish.

## User Stories
- As a player, I want draw animations to feel smooth so that the game appears deliberate rather than jittery.
- As a player, I want the screen to render without layout shifts at startup so that the interface feels stable.
- As a player, I only want to see the undo button when there is something to undo so that controls feel meaningful.
- As a returning player, I want my ongoing game to resume instantly without animations after app restart, and a finished game to start fresh, so that I remain in flow.
- As a player, I do not want toast popups until the UX is refined so that attention stays on the board.

## Technical Approach
- Tweak waste fan animation easing and duration to eliminate overshoot and secondary bounces while keeping motion responsive.
- Identify the root cause of startup layout shifts (likely lazy measurement or conditional rendering) and add suspense guards or initial layout placeholders to keep geometry stable.
- Gate undo button visibility behind history presence, integrating with existing state selectors.
- Extend persistence and hydration logic to suppress animations on resume while still replaying state, and trigger a new shuffle immediately when the previous game ended.
- Introduce a feature flag or centralized no-op for toast issuance to silence notifications globally.

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

## Dependencies
- Existing animation controller utilities in `src/solitaire`.
- State persistence in `src/state/history.tsx` and `src/state/settings.tsx`.

## Open Questions
- Are there analytics or developer hooks that rely on toasts for surfacing events?
- Should an interim developer-mode toast remain available behind a flag?

## Related Tasks
- [Tasks for PBI 17](./tasks.md)

