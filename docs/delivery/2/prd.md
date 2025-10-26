# PBI-2: Animation polish for Solitaire

[View in Backlog](../backlog.md#user-content-2)

## Overview
Introduce subtle but delightful animations that convey motion—card moves, waste pile sliding, and invalid-move feedback—to make the solitaire experience feel premium without compromising performance.

## Problem Statement
The current gameplay is functional but visually static. Cards jump instantly, the waste fan snaps in place, and invalid taps rely on toasts. This makes the game feel unfinished and offers little visual feedback.

## User Stories
- As a player, I want card movements to animate quickly so the board feels alive.
- As a player, I want the waste fan to slide when new cards appear so I can track the draw visually.
- As a player, I prefer a subtle wiggle animation to indicate an invalid tap instead of a modal toast.

## Technical Approach
- Layer Tamagui `AnimatePresence` / React Native reanimated (or Animated API) to animate card translation/opacity when cards move between piles.
- Animate the waste fan using translateX/opacity and ensure only the top card remains interactive.
- Replace the “move blocked” toast with a short shake animation on the offending card or column.

## Acceptance Criteria
1. Tableau/foundation card moves animate (≤250 ms) whenever a stack moves.
2. Waste fan cards slide left when a new card is drawn or recycled.
3. Invalid taps (auto-move failure) trigger a short wiggle animation on the selected card/column instead of a toast.
4. Animations run smoothly on both native and web without regressing existing UX (auto-complete, tap/hold, undo).
5. Tests/docs updated and `yarn tsc --noEmit`, `npx expo export --platform web --output-dir dist-web` still pass.

## Dependencies
- Existing Tamagui + React Native setup.

## Open Questions
- None.

## Related Tasks
- [View task list](./tasks.md)
