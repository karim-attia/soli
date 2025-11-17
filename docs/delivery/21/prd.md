# PBI-21: Solvable shuffle fairness

[View in Backlog](../backlog.md#user-content-21)

## Overview
Solvable-only mode should feel curated and varied. Currently, players can receive the same solvable layout repeatedly when they immediately reshuffle, because the selection logic deterministically favors the first ID among the least-played shuffles, and fresh deals are not recorded in history until a move occurs. This PBI ensures solvable deals rotate fairly and appear in history even when skipped instantly.

## Problem Statement
Players opting into solvable shuffles expect a diverse rotation of challenges. When a player starts a solvable game and triggers a new shuffle without making a move, the deal is not saved to history, keeping its play count at zero. The selection logic then always chooses the same shuffle, leading to back-to-back repeats and undermining the experience.

## User Stories
- As a solvable-mode player, I want new solvable deals to count as “played” immediately so that the catalog advances even when I skip without moving.
- As a solvable-mode player, I want tied solvable shuffles to be chosen randomly so that low-play layouts rotate evenly.

## Technical Approach
- Update solvable shuffle selection to calculate the minimum play count and randomly sample among shuffles that share that count, using a stable pseudo-random helper consistent with existing utilities.
- When hydrating a solvable shuffle, record a history entry upfront with a flag indicating zero moves so that play counts increment even if the player abandons immediately.
- Ensure history persistence continues to cap entries at the configured maximum and that previews remain valid for zero-move records.
- Add documentation to the relevant task files describing the implementation and verification steps.

## UX/UI Considerations
- No new UI elements; behaviour changes occur behind the scenes.
- Ensure history screens reflect immediately logged solvable entries without visual regressions (e.g., zero moves displayed as “0” or “—” consistently with existing formatting).

## Acceptance Criteria
1. Selecting the next solvable shuffle randomizes among shuffles sharing the lowest play count while retaining the preference for unsolved shuffles.
2. Newly dealt solvable games appear in history even if the player performs no moves before starting a different shuffle.
3. Task documentation and verification notes are updated to reflect the change.

## Dependencies
- Existing solvable shuffle dataset (`src/data/solvableShuffles.ts` and related types).
- History state management (`src/state/history.tsx`) and Klondike screen orchestration (`app/(tabs)/index.tsx`).

## Open Questions
- Should zero-move history entries display a distinct label (e.g., “Skipped”)? (Out of scope for this task; surface to the user if requested later.)

## Related Tasks
- [Tasks for PBI 21](./tasks.md)







