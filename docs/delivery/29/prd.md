# PBI-29: Forgiving tableau tap auto-move (retry adjacent card)

[View in Backlog](../backlog.md#user-content-29)

## Overview
Tapping a face-up card in a tableau column currently attempts an auto-move for that exact card. Because tableau cards overlap, it’s easy to tap the wrong card by one position. We want tableau taps to be more forgiving: if the tapped card has no valid auto-move, try the adjacent card in the same column before showing invalid feedback.

## Problem Statement
- Tableau cards have small effective tap targets because of overlap.
- A near-miss tap often selects the wrong card and produces an invalid move wiggle, even when the intended adjacent card would auto-move successfully.
- This should only affect tableau columns; stock/waste/foundations tap behavior should remain unchanged.

## User Stories
- As a player, I want taps on tightly stacked tableau cards to still move the intended card so that gameplay feels less finicky.

## Technical Approach
- In the auto-move handler, when `findAutoMoveTarget(state, selection)` returns null for a tableau selection, attempt `cardIndex - 1` (above) then `cardIndex + 1` (below) within the same column.
- Only consider adjacent candidates that are **face-up**.
- If an adjacent candidate has a valid auto-move target, dispatch the move for that candidate. Otherwise, trigger the existing invalid-move wiggle for the originally tapped card.
- Leave waste/foundation/stock behavior unchanged.

## UX/UI Considerations
- No new UI. This is strictly a behavior tweak.
- Invalid-move wiggle should still occur when neither the tapped card nor the adjacent card can auto-move.

## Acceptance Criteria
1. When tapping a face-up tableau card that has no auto-move, the game attempts an auto-move for the adjacent tableau card (above first, then below) and performs it if available.
2. The fallback behavior only applies to tableau columns; stock/waste/foundations behavior is unchanged.
3. The fallback never auto-moves a face-down tableau card.
4. Documentation and tasks stay synchronized per policy.

## Dependencies
- Auto-move selection: `src/features/klondike/hooks/useKlondikeGame.ts`
- Target selection: `src/solitaire/klondike.ts` (`findAutoMoveTarget`)
- Tap source: `src/features/klondike/components/cards/TableauSection.tsx`

## Open Questions
- None.

## Related Tasks
- See `docs/delivery/29/tasks.md`.
