# PBI-28: Make auto-up much faster + stop timer when auto-up starts

[View in Backlog](../backlog.md#user-content-28)

## Overview
Auto-up (the auto-complete queue that moves cards to foundations once the tableau is fully revealed) is currently too slow. We want it to finish *much* faster while keeping card-flight animations reliable, and we want the game timer to stop as soon as auto-up begins so “time” reflects manual play only.

## Problem Statement
- Auto-up advances at a conservative cadence, making end-of-game cleanup feel sluggish.
- The timer may keep running (or restart) during auto-up because move-count driven timer logic doesn’t exclude automation.
- If we increase cadence, draw/recycle steps in the auto queue must remain snapshot-gated so flights don’t originate from bogus positions.

## User Stories
- As a player, I want auto-up to finish much faster so that completing a game feels instant.
- As a player, I want the timer to stop when auto-up begins so that my “time” reflects manual play.

## Technical Approach
- Stop the timer immediately when `state.isAutoCompleting` flips true, and prevent move-count based timer restarts while auto-up is active.
- Increase the auto-queue cadence (reduce move/draw delays) while ensuring snapshot gating covers draw steps (auto-queue uses `ADVANCE_AUTO_QUEUE`).
- Keep changes scoped to auto-up; do not change manual animation timings unless needed.

## UX/UI Considerations
- Auto-up should feel dramatically faster but still visually coherent.
- Timer should not “jump” or restart during auto-up.

## Acceptance Criteria
1. Auto-up completes significantly faster than before (target: noticeably faster, near-instant relative to prior cadence).
2. The timer stops immediately when auto-up begins and does not restart during auto-up.
3. Auto-up draw steps (stock → waste) remain snapshot-gated so flights do not originate off-screen.
4. Documentation and tasks stay synchronized per policy.

## Dependencies
- Auto-queue runner: `src/features/klondike/hooks/useAutoQueueRunner.ts`
- Timer logic: `src/features/klondike/hooks/useKlondikeTimer.ts`
- Flight gating: `src/features/klondike/hooks/useKlondikeGame.ts` + `src/animation/flightController.ts`

## Open Questions
- None (explicitly requested behaviour: faster auto-up + stop timer at auto-up start).

## Related Tasks
- See `docs/delivery/28/tasks.md`.
