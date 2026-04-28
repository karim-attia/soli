# Auto Up Setting Automatic Auto Up Setting

## User prompt
Hey, please introduce a setting whether the Auto Up starts automatically or not. By default, it's turned on, but if it's turned off, when you uncover the last covered card, just let the user regularly move up all the cards manually and then also finish once the last one is up. Please, yeah, please build this. Thank you very much.

## Description
Add a gameplay setting that controls whether Auto Up starts automatically after the tableau has no covered cards left. The default remains enabled so the current endgame behavior is unchanged for existing and new players. When disabled, uncovering the last covered card leaves the board interactive and lets the player move every remaining eligible card to foundations manually; the game still completes normally when all foundations reach kings.

## Acceptance Criteria
- Settings includes an Auto Up gameplay toggle that defaults to on.
- Persisted settings keep the player's Auto Up choice across restarts.
- With Auto Up enabled, fully revealing the tableau still schedules the existing auto-complete queue.
- With Auto Up disabled, fully revealing the tableau does not schedule or run the auto-complete queue.
- With Auto Up disabled, manual moves to foundations continue to work after the tableau is fully face up.
- With Auto Up disabled, the game marks as won after the player manually moves the last card to foundations.
- Toggling Auto Up off while an auto-complete queue is active stops the queue.
- Toggling Auto Up on while a fully revealed unfinished board is idle may start the existing Auto Up queue.

## Design links
- No external design links.
- Existing Settings > Gameplay section and Klondike reducer behavior are the reference surfaces.

## Possible approaches incl. pros and cons
- Add a settings flag and mirror it into the Klondike runtime state.
  - Pros: reducer remains pure, the existing auto-queue planner stays centralized, disabling can stop an active queue reliably.
  - Cons: runtime state must avoid treating the setting as undoable gameplay history.
- Pass settings into every move action that can trigger finalization.
  - Pros: avoids an extra field on game state.
  - Cons: easy to miss direct reducer call sites and harder to keep persistence/hydration behavior consistent.
- Move Auto Up scheduling out of the reducer and into React hooks.
  - Pros: direct access to settings.
  - Cons: larger behavioral refactor around undo history, queue planning, and test coverage.

Recommendation: mirror the setting into non-history runtime state and gate the existing scheduler.

## Open questions to the user incl. recommendations (if any)
- None blocking. Recommendation: keep the setting in Gameplay, not Animations, because it changes who performs the endgame moves rather than how they animate.

## New dependencies
None.

## UX/UI Considerations
- The toggle should use the same Tamagui switch row style as the current Gameplay setting.
- Copy should be concise: players should understand that turning it off keeps endgame moves manual.
- Default on preserves the expected fast finish for players who never change settings.

## Components -> Which components to reuse, which components to create?
- Reuse the existing Settings screen `ToggleRow`.
- Reuse existing Klondike game view and card components.
- No new visual component is needed for this scoped change.

## How to fetch data, how to cache
- Persist the new preference through the existing `SettingsProvider` AsyncStorage payload.
- Mirror the hydrated setting into the in-memory game reducer state so auto-queue scheduling can read it synchronously.
- Do not store this preference in undo history snapshots; undo should rewind the board, not the player's current settings choice.

## Related tasks
- Existing Auto Up implementation and performance work: `docs/delivery/28/prd.md`.
- Existing Auto Up handoff investigation: `docs/product/auto-up-win-handoff/28-2-end-of-auto-up-jitter.md`.

## Steps to implement and status of these steps
- [completed] Add and persist the Auto Up enabled setting.
- [completed] Gate reducer Auto Up scheduling with a runtime preference and add tests.
- [completed] Wire the setting into Settings UI and Klondike runtime.
- [completed] Run focused automated checks.
- [completed] Run real-environment web and iOS simulator verification.

## Plan: Files to modify
- `src/state/settings.tsx`
- `app/settings.tsx`
- `app/(tabs)/two.tsx`
- `src/solitaire/klondike.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/storage/gamePersistence.ts`
- `test/unit/solitaire/klondike.autoMoveFallback.test.ts`
- `test/unit/solitaire/klondike.autoUpSetting.test.ts`
- `test/unit/storage/gamePersistence.test.ts`
- `docs/product/auto-up-setting/automatic-auto-up-setting.md`

## Files actually modified
- `docs/product/auto-up-setting/automatic-auto-up-setting.md`
- `app/settings.tsx`
- `app/(tabs)/two.tsx`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/solitaire/klondike.ts`
- `src/storage/gamePersistence.ts`
- `src/state/settings.tsx`
- `test/unit/solitaire/klondike.autoMoveFallback.test.ts`
- `test/unit/solitaire/klondike.autoUpSetting.test.ts`
- `test/unit/storage/gamePersistence.test.ts`

## Identified issues and status of these issues
- Existing uncommitted scrubber-related changes touch `src/features/klondike/hooks/useKlondikeGame.ts`.
  - Status: acknowledged; edits must stay localized and preserve those changes.

## Testing
- Unit: focused Klondike reducer tests for enabled/disabled Auto Up behavior.
- Unit: persistence defaulting for the runtime setting on legacy saved games.
- Type/lint: run focused project checks if practical.
- Real environment: verify Settings toggle is present and gameplay still loads on web at `http://localhost:8081/` or an available dev-server URL.
- Real environment: install a clean iOS simulator build, toggle Auto Up off/on in Settings, return to Play, and tap Draw.

Results:
- Passed: `yarn jest test/unit/solitaire/klondike.autoUpSetting.test.ts test/unit/solitaire/klondike.autoMoveFallback.test.ts test/unit/storage/gamePersistence.test.ts --runInBand` (14 tests).
- Passed: `yarn typecheck`.
- Passed: targeted `yarn oxlint --tsconfig tsconfig.json ...` on changed TS/TSX files.
- Passed: web Settings verification at `http://127.0.0.1:8081/settings`; `Auto Up` appears in Gameplay with the expected copy.
- Passed: clean iOS simulator build with `npx expo run:ios -d 'iPhone 17 Pro' --no-build-cache`; installed on iPhone 17 Pro simulator (`889AE108-3251-4674-B295-FA0DB3399DAA`).
- Passed: simulator click-through with `agent-device@0.6.0`; opened Settings, toggled `Auto Up` off (`switch "0"`) and on (`switch "1"`), returned to Play, tapped Draw, and confirmed the move counter advanced.
