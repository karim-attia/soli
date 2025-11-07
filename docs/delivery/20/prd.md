# PBI-20: Undo timeline scrubber

[View in Backlog](../backlog.md#user-content-20)

## Overview
Players currently step backward through the game one move at a time. Long-pressing undo should unlock a timeline-style scrubber so that rewinding or fast-forwarding across many actions becomes quick and tactile without cluttering the primary controls.

## Problem Statement
Undoing large sequences is tedious because it requires repeatedly tapping the undo button. Players cannot preview intermediate board states quickly, nor can they step forward again without re-performing moves. This friction makes experimentation and error recovery slow.

## User Stories
- As a player, I want a timeline slider when I long-press undo so that I can jump to a specific moment in the game quickly.
- As a player, I want the slider to preview board state live so that I have confidence before committing to a rewind.
- As a player, I want to scrub back forward when I have not branched my actions so that I can recover from accidental rewinds.

## Technical Approach
- Detect a sustained press on the undo control and transition into a “timeline scrubbing” mode that dims the button and presents a full-width Tamagui slider.
- Represent game history as an ordered array of reversible states with an index pointer and a companion forward stack that preserves redo candidates during scrubbing.
- Bind slider value changes to a fast state-restore method that updates the board immediately while suppressing animation jitter.
- Capture the highest forward index available before scrubbing starts to allow forward travel when no divergent moves occurred.
- Exit scrubbing mode on touch release, committing the selected index and restoring standard controls.

## UX/UI Considerations
- Slider appearance should align with existing Tamagui theming and respect light/dark modes.
- Dimming the undo button must provide visual feedback without making the control unreadable.
- Scrubbing should feel responsive with minimal latency; consider throttling or debouncing updates if needed.
- Ensure accessibility by keeping slider hit targets large enough and providing haptic/visual confirmation when entering scrubbing mode.

## Acceptance Criteria
1. Long-pressing undo fades the button to a low-opacity state and reveals a full-width slider overlay dedicated to timeline scrubbing.
2. Sliding left or right updates the board instantly to the corresponding historical state, including the initial deal and the latest confirmed action.
3. Releasing the slider commits the selected state, restores standard controls, and enables forward scrubbing when no new moves have been taken since entering the slider.
4. Interactions fall back gracefully to the existing single-step undo when the long press is not triggered.

## Dependencies
- Existing move history and undo infrastructure in `src/solitaire` and any related state containers.
- Tamagui slider components and gesture handling utilities currently used in the app.

## Open Questions
- Should the slider display tick marks or move counts to improve precision, or is a smooth slider sufficient?
- Do we need haptic feedback when entering/exiting scrubbing mode?

## Related Tasks
- [Tasks for PBI 20](./tasks.md)


