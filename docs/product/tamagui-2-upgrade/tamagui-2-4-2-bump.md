# Tamagui 2.4.2 Version Bump

## User prompt

- where are we still using tamagui? what would tamagui upgrade to latest do? how to do it? recommended?
- upgrade now

## Summary

Bump all tamagui packages from pinned 2.2.0 to pinned 2.4.2 (latest, published 2026-07-06). No breaking changes between 2.2 and 2.4; config v5 and Tamagui 2 migrations were already done (see tamagui-2-migration-plan.md in this folder). Main payoff: 2.4.0's native performance work (Hermes-fast media getters, lazy theme/media subscriptions, fewer proxies/hooks per leaf component) plus fixes we care about — stale RNGH taps for native press events (2.4.1, #4024), theme repropagation across native portal boundary (2.4.0), reanimated driver fixes (2.3.0), native esm require fix (2.3.3).

## Description

Routine minor-version upgrade of the styling backbone. Tamagui packages must stay on the same exact version across the app (duplicate core instances break provider/config context), so all 9 pinned entries move in lockstep: `tamagui`, `@tamagui/colors`, `@tamagui/config`, `@tamagui/font-inter`, `@tamagui/lucide-icons-2`, `@tamagui/native` (deps) and `@tamagui/babel-plugin`, `@tamagui/cli`, `@tamagui/metro-plugin` (devDeps).

## Acceptance Criteria

- All tamagui packages pinned to 2.4.2, single core instance in yarn.lock.
- `yarn typecheck`, `yarn lint`, `yarn jest`, `yarn check:tamagui` pass.
- Device smoke test passes: app launches, cards render with correct theme, tap/drag moves work (RNGH press path changed in 2.4.1), history sheet renders.

## Risks / things to watch

- 2.4.1 changed numeric `fontSize` in getFontSized to apply as a literal size instead of snapping to a token — watch for 1-2px text shifts.
- 2.4.1 changed native "unset" style semantics (now clears earlier-set keys) — we don't knowingly use "unset".
- Babel/metro compiler plugins updated — clear Metro cache for the smoke build.

## Steps to implement

- [x] Bump 9 package.json entries to 2.4.2, `yarn install` (no 2.2.0 entries left in yarn.lock)
- [x] Cheap gates: typecheck PASS, lint PASS, check:tamagui PASS, jest: 227/232 pass — the 5 failures are pre-existing and unrelated (undoHint.ts has temporarily lowered thresholds for the in-flight undo-hint v2 Android smoke; tests expect the real 10/20/30 values)
- [x] Update docs/external-package-guides/tamagui.md date stamp + 2026-07-07 refresh check
- [x] Build + device smoke test (sub-agent): launch, theme, card tap/drag, history sheet — PASS (Android release, 2026-07-07, see Testing)

## Files actually modified

- package.json, yarn.lock (9 tamagui entries 2.2.0 → 2.4.2)
- docs/external-package-guides/tamagui.md (refresh check 2026-07-07)

## Intermediary learnings

- Yarn peer warnings about missing `react-dom` on @tamagui/* packages are the usual optional web peers for this native-only app — pre-existing pattern, harmless.
- 5 undoHint jest failures at time of upgrade are NOT tamagui-related: src/features/klondike/undoHint.ts constants are temporarily lowered (lifetime 0, streak step 3) for the pending undo-hint v2 device smoke.
- The app has NO card drag-and-drop: the only RNGH gestures in src/ are the undo scrubber (Gesture.Tap/Gesture.Pan in useUndoScrubber.ts); cards are plain RN Pressables (tap-to-move). The "drag" smoke check therefore only verifies that pan gestures across the board don't crash/misfire — there is no card-drop behavior to test.
- The tamagui compiler (babel/metro plugin 2.4.2) ran during `createBundleReleaseJsAndAssets` and optimized/flattened components across history, index, TopRow, etc. with no bundler errors after a Metro cache clear.
- `FATAL EXCEPTION: MultiTouchInstrumentation` entries in logcat during the smoke are the agent-device touch-helper process crashing on disconnect, not the app — ch.karimattia.soli never crashed.

## Testing

- typecheck/lint/check:tamagui: pass. jest: only pre-existing undoHint threshold failures (see above).
- Device smoke (Android physical device A065, release build, 2026-07-07 — all artifacts in `.test-artifacts/tamagui-242-smoke/`):
  - Build: PASS. Metro cache cleared first; incremental Gradle build + fresh JS bundle in 37s total, install verified (versionCode 13), app launched. Log: `.test-artifacts/tamagui-242-smoke/build.log`, full Gradle log `.test-artifacts/builds/20260707-141110.log`.
  - Launch + theme: PASS. Board renders with correct colors (green felt, navy card backs, red/black suits, dark stat pills). `01-launch-board.png`.
  - Tap-to-move (RNGH press path, 2.4.1 change): PASS. Stock tap drew a card (Stock 21→20, Waste updated); tapping Four of spades (col 3) auto-moved it onto Five of hearts (col 5) and revealed the face-down card beneath.
  - Drag: PASS (no crash). Pan gestures across tableau cards register without crash; card stays put because the app is tap-to-move only — cards are Pressables, no drag-and-drop exists (see Intermediary learnings). Undo-scrubber sideways pan also ran without crash.
  - Undo: PASS. Two undo taps reverted both moves exactly (card back to col 3, then Stock back to 21 / Waste to Four of hearts). Undo-hint bubble did not trigger (only 2 consecutive undos; lowered threshold is 3) — nothing tamagui-relevant either way.
  - History screen: PASS. Reached via nav drawer (no bottom tab bar — drawer is the actual navigation). Stats cards (Games/Solved/Incomplete), deal list row, Active badge all render legibly, no layout breakage. `03-history.png`.
  - Text sizes: PASS. Card rank/suit glyphs and history text look identical in size/weight to pre-upgrade; no visible shift from the 2.4.1 numeric fontSize change. `02-after-scrubber-pan.png`, `04-back-to-game.png`.
  - Logs: PASS. `adb logcat -d` shows zero tamagui warnings/errors and zero app crashes. The only FATAL entries are the agent-device multitouch helper process (test tooling), not the app.
  - Residual state note: test left the active game one stock-draw ahead (an agent-device session conflict blocked the final cleanup undo) — one manual undo tap restores it; game state is otherwise intact.
