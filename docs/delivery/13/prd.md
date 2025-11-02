# PBI-13: Persist in-progress Klondike games locally

[View in Backlog](../backlog.md#user-content-13)

## Overview
Players regularly suspend a Klondike game mid-progress. Without persistence, the shuffle resets on app restart, causing frustration and lost effort. This PBI introduces a resilient local save system so the most recent game continues seamlessly across app restarts on every supported platform.

## Problem Statement
The current client keeps the in-memory game state only for the active session. Force-closing the app, navigating away for long periods, or triggering a fast refresh resets the shuffle. Users lose progress and cannot track partially completed games, which undermines engagement.

## User Stories
- As a returning solitaire player, I want my in-progress game to persist so I can resume where I left off after closing the app.
- As a mobile reviewer, I want persistence to be reliable across platforms so the app meets store expectations for casual games.

## Technical Approach
- Store serialized game state snapshots using `@react-native-async-storage/async-storage`, following the official installation and usage guidance (`install`, `usage` pages cached on 2025-11-01).
- Define a versioned schema describing current shuffle ID, stock/waste, tableau columns, foundation stacks, timers, and undo history needed to resume play.
- Write helpers under `src/` to map between runtime `KlondikeGameState` and the persisted payload, centralizing serialization/deserialization.
- Trigger persistence after each mutating action (draw, move, undo, restart) and when leaving the screen (React lifecycle effects).
- On boot, attempt to restore the latest snapshot. If parsing fails, clear the stored item and surface a toast explaining that the game reset due to corrupted data.
- Gate persistence so previews and automated tests can stub storage access without writing to the device.

## UX/UI Considerations
- Show a transient toast when corrupted data is discarded to explain the reset.
- Keep persistence invisible during normal play; no additional UI prompts should block moves.
- Ensure the new-game flow still allows users to discard the saved state intentionally.

## Acceptance Criteria
1. In-progress Klondike games persist to AsyncStorage after any move, undo, or stock recycle using a versioned payload keyed per game mode.
2. Relaunching the app restores the last saved game automatically unless the player chooses “New Game,” which clears storage.
3. Corrupted or incompatible saved data is removed gracefully and surfaces a toast explaining that the previous game could not be loaded.
4. Documentation describes the persistence schema and how to migrate it when future changes occur.

## Dependencies
- Expo-managed workflow with React Native 0.79 (ensures autolinking for AsyncStorage).
- `@react-native-async-storage/async-storage` (new dependency researched 2025-11-01).

## Open Questions
- Should completed games remain stored for history sync tasks (future PBIs) or be cleared immediately?
- Do we need to throttle persistence during auto-complete animations to avoid extra writes? (Pending perf review.)

## Related Tasks
- [Task list](./tasks.md)

