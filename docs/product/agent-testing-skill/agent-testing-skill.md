# Agent Testing Skill + History Seeding

## User prompt

Prompt 1 (2026-07-07):

> we have had some testing hiccups with the instructions from agents.md
> search through the documentation and the past few chats so see them.
> we have so many options available.
> jump to middle of game. appium. old test game. generated test games. reset undo hint. etc.
> options and recommendations. what is here and needs to be documented better, e.g. in a dedicated skill? what is here, but not easily driven via terminal from agent? what gaps do we have for scenarios?
> check @AGENTS.md

Prompt 2 (2026-07-07):

> h5 not really needed to solve.
> h6 is wild :D yeah interesting case!
> some things might also already be better with recent yarn release commit
> O6 is super recent, so clear that this isnt documented yet. but could be.
> full state wipe can be done if needed but only if really really needed. still my main phone and i like some soli history.
> also would maybe be interesting: seed some history games with different cases... solved, incomplete, active, different games, different draws, solvable, etc.
> also add self improvement note to skill.
> make skill readable for cursor and codex
> <3

Prompt 3 (2026-07-07):

>    - Full end-to-end stress: auto-solve playlist (`--auto-solve` or `?demo=playlist`).
> -> when should it do which? what is the difference? (just read top part of file, is this answered later?)
>
> Full phone wipe -> Never wipe the phone xD. never ever. but just the soli app wipe is fine.
>
> we have documented a bunch of stuff which is nice. but haven't added many new tools. should we also add settings via terminal, seed a deal, r1-r3, direct celebration (see active celebration changes which allows for this). what else? let's do this? incl skill docs?
>
> what exactly is @scripts/perf-baseline.sh ? open to delete if not used anymore.
>
> One-liner cleanup: the primary simulator still holds 9 seed rows from the smoke run — [...] -> pls give more info. but i trust if you recommend, go ahead
>
> then list or table with done and available tools and what could still be done.

## Summary

- **Workstream A DONE (2026-07-07)**: `soli-testing` skill created at `.agents/skills/soli-testing/SKILL.md` (+ working `.cursor/skills` symlink), all content verified against post-`fcdea28` scripts. AGENTS.md Testing slimmed to policy + skill pointer; `prod.md`, `testing.mdc`, `agent-device.md`, `react-native-jest-preset.md`, and both demo-autosolve plans fixed/annotated. No code touched; nothing staged/committed.
- **Workstream B DONE (2026-07-07)**: dev-only history seeding shipped. New `src/storage/historySeeds.ts` (9-entry deterministic catalog, ids `seed-*`), `deleteHistoryEntriesByIdPrefix` added to both repository variants, `seedHistoryForTesting(action)` exposed from HistoryProvider (queued + reloads in-memory state), deep link `soli://?seedHistory=default|clear` wired in `processDemoLink()`, demo sheet gained "Seed history" / "Clear seeded history". 9 new unit tests run the real SQL against node:sqlite. `yarn typecheck && yarn lint && yarn jest` green (252 tests).
- **V2 device smoke DONE (2026-07-07, iOS simulator)**: ALL PASS — seed deep link, idempotent re-seed (`#retry-1`, no doubling), both demo-sheet buttons, clear (deep link + sheet button; real rows byte-for-byte intact incl. counts), date grouping Today→May, draw 1/3/5 + Solvable badges, in-place history refresh, active-seed skip with a real active row, board tap-to-move sanity. **No demo sheet clipping** with 9 buttons on iPhone 17 Pro. Evidence: `.test-artifacts/agent-testing-skill/*.png`. One cleanup TODO: leftover seed rows on the primary iPhone 17 Pro sim (see Identified issues).
- **Workstream C DONE (2026-07-07)**: all new terminal-drivable hooks shipped through `processDemoLink()` (dev-gated, `lastDemoLinkRef` dedup, `#retry-N` compatible): `?set=drawCount:3,autoUp:off,solvableOnly:on` (C1), `?deal=<exactId>&draw=N` (C2), `?reset=undoHint` (C3), `?reset=game` (C4, deliberately no `?reset=all`), `?demo=scrubbed&steps=S&scrub=K` + `?demo=nearwin&left=N` (C5, defaults 80/40 and 1 preserved), `?celebration=<modeId|random>` (C6 — first implemented from `useKlondikeGame` without touching the in-flight celebration files; superseded same evening by the celebration-smoothness session's controller-owned `startCelebrationPreview`, Story 5: dev-hold loop, no dialogs, silent abort — launcher now calls that). Unit tests + skill catalog updated (C7/C8). `yarn typecheck && yarn lint && yarn jest` green (28 suites, 275 tests). Post-V3 fix: cold-start deep-link replay bug fixed via consume-once `initialUrlConsumedRef` (see Identified issues). Post-V3 additions (C9/C10): `yarn deeplink` delivery wrapper (auto retry nonce, force-stop, safe serial resolution) plus named shortcuts `yarn celebration [modeId]` / `yarn scrubtest [steps] [scrub]` / `yarn nearwin [left]` / `yarn seedhistory [clear]` with device auto-targeting (booted sim > Android phone) and sensible cold defaults (fixtures cold, others warm) — all verified live on the primary sim. The link CATALOG deliberately stays only in the skill (no per-link scripts).
- **V3 device smoke DONE (2026-07-07, iOS simulator, primary iPhone 17 Pro)**: ALL 10 HOOK CHECKS PASS — settings link (verified via Settings screen + devLog), invalid-pair skip, exact-deal determinism (identical board twice), undoHint reset, game reset (fresh deal, no dialog, previous game → Incomplete), scrubbed steps=20&scrub=10 (10 undos back to initial state), nearwin default (played final King of spades → REAL win + celebration overlay + badge) and left=3, celebration=random + numeric mode 29, seedHistory seed/clear regression. Evidence: `.test-artifacts/agent-testing-skill/v3/*.png`. **One minor app bug found (not fixed, reported)**: cold-start deep links can REPLAY over later links because `Linking.getInitialURL()` is re-read when the handler identity changes — see Identified issues; workaround (terminate + plain launch, then deliver links warm) documented in the skill.

## Description

Audit of device-testing affordances found a rich toolbox (build scripts, demo deep links, scrubbed mid-game fixture, undo-hint reset, a11y handles, Appium scrub) that is fragmented across 7+ product plans and partially-stale Cursor artifacts. Past-chat mining surfaced ~9 recurring hiccup classes, almost all "the answer existed but was buried in a plan's Intermediary learnings".

Two deliverables:

1. **A repo skill `soli-testing`** — single agent-facing testing cookbook (decision tree, deep-link catalog, reset recipes, a11y matrix, Appium checklist, troubleshooting), readable by both Cursor and Codex. AGENTS.md Testing section slims down to policy + pointer. Stale docs get fixed.
2. **History seeding dev hook** — seed the history DB with varied entries (solved/incomplete/active, different draws, solvable/random, replayed deals, spread dates) so history screen / stats / deal-selector scenarios are testable without playing games or wiping Karim's real phone history.

## Acceptance Criteria

- `.agents/skills/soli-testing/SKILL.md` exists with valid frontmatter (`name: soli-testing` matching folder, `description` <= 500 chars, no newlines in those fields) → discoverable by Codex (repo `.agents/skills` scan) and Cursor (via `.cursor/skills/soli-testing` symlink, same pattern as agent-device).
- Skill contains: platform/fixture decision tree, full demo deep-link catalog (playlist / scrubbed mid-game / old demo / autosolve), state-reset recipes with a **prominent "never wipe the physical phone" guardrail** (Karim's main phone; simulator uninstall is fine), a11y handle matrix + known-unautomatable list, Appium/ios-scrub checklist, troubleshooting section (empty Android a11y tree, no `[SoliDev]` on iOS, stale terminals vs `/tmp/soli-build.lock`, multi-adb `-s`, stale agent-device sessions, wrong bundle id), interaction model note (tap-to-move, no card dragging), and a **self-improvement note** (agents should update the skill when instructions were wrong/caused friction, mirroring AGENTS.md).
- AGENTS.md Testing section: policy + commands stay, per-tool detail moves to skill, pointer added.
- Stale docs fixed (see Steps).
- Deep link `soli://?seedHistory=default` inserts seed catalog; `soli://?seedHistory=clear` removes exactly the seeded rows and nothing else; demo sheet gets "Seed history" / "Clear seeded history" entries (dev mode). Real history rows are never modified or deleted.
- `yarn typecheck && yarn lint && yarn jest` green; device smoke shows seeded entries in the History tab.

## Possible approaches incl. pros and cons

- **Skill location**: canonical `.agents/skills/` + `.cursor/skills` symlink (chosen — matches agent-device precedent, Codex scans `.agents/skills` natively, symlinked folders supported). Alternative `docs/testing/` guide: not auto-surfaced to agents.
- **Seeding invocation**: deep link + demo sheet (chosen — deep link is terminal-drivable, demo sheet parser + dev gate already exist in `useDemoGameLauncher.ts`). Alternative standalone adb/sqlite script: brittle against schema migrations, `run-as` blocked on release Android builds.
- **Seed reversibility**: identifiable id prefix `seed-` + targeted delete (chosen). Alternative full wipe: explicitly ruled out by user (main phone, real history is precious).

## Open questions to the user

- None blocking. Proceeding with: no new deep-link reset hooks beyond seeding (user only confirmed documenting the existing undo-hint reset button, not new hooks); H5 threshold-hack tooling skipped per user.

## Dependencies

- None new. Guides used: `docs/external-package-guides/appium.md`, `agent-device.md`, `expo-run-ios-and-simctl.md` (referenced from skill, content not duplicated wholesale).
- Codex skill format reference: https://developers.openai.com/codex/skills (frontmatter `name` + `description`, progressive disclosure, symlinks followed).

## UX/UI Considerations

- Demo sheet gains two entries; dev-mode-only, so no end-user impact.
- Seeded entries should look plausible in the History tab (valid preview, varied dates for date grouping, varied durations/move counts).

## Components

- Reuse: demo sheet in `app/(tabs)/index.tsx`, deep-link parser `processDemoLink()` in `src/features/klondike/hooks/useDemoGameLauncher.ts`, history repository API.
- New: `src/storage/historySeeds.ts` (or similar) — seed catalog + insert/clear functions. No new UI components.

## Related tasks

- Deferred follow-up from yarn-release Round 3: "move AGENTS.md testing → repo skill" — this is that task.
- ~~NOT in scope (user feedback 2026-07-07): H5 threshold-hack pattern, new `?reset=` deep links, `?deal=<exactId>` runtime seeding, full-wipe tooling.~~ SCOPE CHANGE (prompt 3): user greenlit Workstream C — `?reset=` hooks, `?deal=`, settings via deep link, parameterized scrubbed fixture, direct celebration trigger. H5 threshold tooling and full-wipe tooling remain out of scope.

## Simplification ideas

- One skill file, no scripts/ subfolder — recipes are commands, not code.
- Seed catalog is a static array, not a generator.
- Propose deleting `scripts/perf-baseline.sh` (stale coordinate taps) — flag to user, don't delete unilaterally.

## Steps to implement

### Workstream A — skill + doc fixes (docs only)

- [x] A1. Create `.agents/skills/soli-testing/SKILL.md` (see Acceptance Criteria for required sections). Verify claims against CURRENT scripts (`scripts/build-install-ios.js`, `scripts/build-install-android.js`, `scripts/lib/build-tools.js`, `run-android-release.sh`, `scripts/ios-scrub.js`) — commit `fcdea28` unified yarn release/ios recently; do not copy stale plan text. DONE 2026-07-07 — every claim verified against the current scripts + `processDemoLink()`/`accessibility.ts`/`useUndoHint.ts` source.
- [x] A2. Symlink `.cursor/skills/soli-testing -> ../../.agents/skills/soli-testing` (relative, like agent-device). DONE — verified it resolves (`ls -la .cursor/skills/soli-testing/` shows SKILL.md).
- [x] A3. Slim AGENTS.md Testing section; keep policy (sub-agent testing, budget judgement, one build / one device driver, cheap gates, yarn release/ios summary), point to skill for recipes. DONE — a11y/uiautomator bullets replaced by a bold skill pointer; Commands scrub one-liner slimmed to a skill pointer; AGENTS.md net −3 lines.
- [x] A4. Fix `.cursor/commands/prod.md` (`npx expo run:android --variant release` → `yarn release`). DONE — rewritten around yarn release/yarn ios + skill pointer.
- [x] A5. Update or fold `.cursor/rules/testing.mdc` into skill pointer (it's Android-only and stale). DONE — now a thin pointer + 4-line quick reference (both platforms), frontmatter intact.
- [x] A6. `docs/external-package-guides/agent-device.md`: `npx -y agent-device` examples → `yarn agent-device`. DONE — with dated note.
- [x] A7. `docs/external-package-guides/react-native-jest-preset.md`: note SDK 57 / RN 0.86 / preset ^0.86.0 (repo state). DONE — dated note at top; versions verified in package.json (`react-native@0.86.0`, `@react-native/jest-preset@^0.86.0`, `expo@^57.0.0`).
- [x] A8. `docs/product/demo-autosolve-playlist/20-game-solved-demo-playlist.md` (+ demo-sheet doc): mark `scripts/run-demo-autosolve.js` / `yarn demo:auto-solve` as superseded by `yarn release --auto-solve` (short note near top; don't rewrite history). DONE — both docs.
- [x] A9. Document in skill: undo-hint reset (demo sheet button — recent, previously undocumented), scrubbed mid-game deep link incl. force-stop caveat, history seeding (interface below), `[SoliDev]`-on-iOS trigger recipe, `ch.karimattia.soli` as the one true package/bundle id. DONE — all in SKILL.md sections 3, 4, and 7.

### Workstream B — history seeding (code)

- [x] B1. Seed catalog module: ~8–10 entries covering — solved draw-1 solvable, solved draw-3, incomplete draw-1, incomplete draw-5, solved non-solvable (random deal), one exact_id repeated twice (replayed deal → exercises `getSolvableDealHistoryStats` balancing), dates spread over hours/days/weeks (date grouping), varied move_count/duration_ms, valid preview_json. Ids prefixed `seed-` (stable, deterministic → idempotent re-seed via INSERT OR REPLACE or delete-then-insert of `seed-%` only). DONE 2026-07-07 — `src/storage/historySeeds.ts`, 9 entries (8 finished + 1 conditional active), delete-then-insert; catalog draw-1/draw-3 ids from `getSolvableDealsForDrawCount`, checksums via `computeDeckChecksum(decodeExactDealId(...))`; previews are real initial-deal boards (decoded deck) or full-foundation solved boards.
- [x] B2. `active` case: seed an active entry ONLY if no real active row exists (unique partial index `history_entries_one_active`); otherwise skip it and devLog. Never demote/modify a real active row. DONE — check runs AFTER the seed-prefix delete so a stale seed-active row can't mask a real one; inline comments explain why `insertHistoryEntry`'s active normalization would otherwise demote the real row.
- [x] B3. Clear function: delete WHERE id LIKE 'seed-%' only. DONE — `deleteHistoryEntriesByIdPrefix` in both repository variants (`id LIKE ? || '%'`).
- [x] B4. Wire deep link `soli://?seedHistory=default|clear` in `processDemoLink()` (dev-gated/force like other demo links) + demo sheet entries "Seed history" / "Clear seeded history". Refresh in-memory history state after seeding (history context reload). DONE — `seedHistoryForTesting(action)` lives on HistoryProvider (queued through `queueRepositoryTask`, then `reconcileLoadedHistory`), forwarded via `useKlondikeGame` → session controls → demo sheet + demo launcher.
- [x] B5. Unit tests: catalog shape/invariants, seed+clear roundtrip leaves non-seed rows untouched, active-skip logic. Use existing expo-sqlite mocks. DONE — `test/unit/storage/historySeeds.test.ts` (9 tests); roundtrip/active-skip run the repository's real SQL against node:sqlite (adapter over the expo-sqlite mock, same precedent as the DDL tests in historyRepository.test.ts).
- [x] B6. Inline comment notes: why additive+reversible (Karim's real phone history), why active-skip. DONE — module header in historySeeds.ts, active-skip block comment, sheet-button comment, repository delete comment.

### Workstream C — new terminal-drivable test hooks (code; greenlit in prompt 3)

All dev-gated like existing demo links (deep links force developer mode); all wired through `processDemoLink()` in `useDemoGameLauncher.ts`; all documented in the skill's deep-link catalog (section 3/4) by the implementing sub-agent.

- [x] C1. `soli://?set=<key>:<value>[,<key>:<value>...]` — settings via deep link. Keys: `drawCount` (1–5), `autoUp` (on/off), `solvableOnly` (on/off). Applies via the settings context, devLogs each change. Unknown keys/values: devLog + ignore. DONE 2026-07-07 — pure exported parser `parseSettingsLinkParam` in `useDemoGameLauncher.ts` (unit-tested), setters forwarded from `useSettings()` through `useKlondikeGame`. Boolean values accept the existing alias set (on/off/1/0/true/false/yes/no/enabled/disabled).
- [x] C2. `soli://?deal=<exactId>&draw=N` — start a new game from an exact deal id (validate id; invalid → devLog + ignore). DONE — validated via `parseExactDealId` (prefix + base36 + permutation range, try/catch → devLog + ignore); invalid `draw` devLogs and falls back to the current setting. Runs through the shared `performDealAgain` body (records current game as incomplete, clears persisted game, `dealNewGame(stateOverride)` keeps ALL bookkeeping: history row, reset key, hint counters).
- [x] C3. `soli://?reset=undoHint` — deep-link twin of the demo-sheet "Reset undo hint" button (same code path). DONE — forwards the exact same `resetUndoHintForTesting` callback from `useUndoHint`.
- [x] C4. `soli://?reset=game` — clear the persisted in-progress game and deal fresh (equivalent to New Game without UI confirmation). DONE — `requestNewGame`'s "Deal Again" onPress body was extracted into `performDealAgain` (shared, zero behavior change) and `dealNewGameForTesting` calls it directly. Deliberately NO `?reset=all` — inline comment in `processDemoLink` + skill section 4 record the rationale (protects real phone history). Unknown `?reset=` targets devLog + ignore.
- [x] C5. Parameterized replay fixture — DONE. `?demo=scrubbed&steps=S&scrub=K` (defaults stay 80/40 → pinned fixtures in `demoReplay.scrubbed.test.ts` untouched and still green) and `?demo=nearwin&left=N` (default 1, Auto Up off). `createScrubbedMidGameState` was generalized via a shared `foldReplayFixture` helper; new `createNearWinGameState` + pure clamp resolvers `resolveScrubbedDemoOptions` / `resolveNearWinMovesLeft` (steps→[1,len], scrub→[0,steps], left→[1,len]; launcher devLogs when clamped).
- [x] C6. `soli://?celebration=<modeId>` (or `random`) — DONE with a spec deviation in WHERE the trigger lives: implemented entirely in `useKlondikeGame` via the controller's already-exported `setCelebrationState`, synthesizing a full 52-card won-board payload (13 per foundation slot, real foundation layouts, same visual shuffle) so it works on ANY board incl. fresh deals with empty foundations. `useCelebrationController.ts` / `celebrationModes.ts` / `CelebrationOverlayLayer.tsx` were NOT touched (in-flight work from the concurrent celebration session; read-only imports only). Badge/cycle/abort/dialog semantics are inherited unchanged.
- [x] C7. Unit tests — DONE. `demoReplay.scrubbed.test.ts` extended (custom steps/scrub state + `resolveScrubbedDemoOptions` clamping), new `demoReplay.nearwin.test.ts` (default/left=3 states, real win by playing the remaining moves, determinism, clamp boundaries), new `demoLinkParsing.test.ts` (`parseSettingsLinkParam`: all keys, case-insensitivity, unknown/invalid pairs, whitespace). 275 tests green.
- [x] C9 (2026-07-07, post-V3 follow-up). `yarn deeplink` generic delivery wrapper — `scripts/deeplink.js` + package.json script. Decision: NO per-link scripts (catalog stays only in the skill — avoids the stale-duplicate problem cleaned up in Workstream A); ONE wrapper encodes the delivery mechanics: auto `#retry-<epochms>` nonce (skipped when URL already has a fragment or `--no-retry`), `--cold` force-stop-then-deliver, `--android` with serial resolution `--serial` > `ANDROID_SERIAL` > sole device (multiple devices without a serial = hard fail listing them — never guess, one might be the main phone), `soli://` prefix validation, prints the final delivered URL. Verified live on the booted primary sim: `?reset=undoHint` and `?celebration=0 --cold` both delivered with matching `[SoliDev]` log lines. Skill section 3 delivery recipe now leads with `yarn deeplink`; raw simctl/adb one-liners kept as fallback/reference.
- [x] C10 (2026-07-07, direction change from Karim: convenient named commands). Shortcut mode + device auto-targeting in `scripts/deeplink.js`, thin package.json aliases: `yarn celebration [modeId]` (random default, warm), `yarn scrubtest [steps] [scrub]` (**cold default** — a stale warm demo run overwrites the fixture, the known warm-app trap), `yarn nearwin [left]` (**cold default**, same reason), `yarn seedhistory [clear]` (warm); `--cold`/`--warm` override, raw-URL mode unchanged (warm default). Auto-target: booted iOS sim if one exists, ELSE the connected Android device (zero flags for Karim's phone-only case); `--ios`/`--android` force; multiple adb devices without serial = hard fail listing them. Target + final URL always printed. Verified live on the booted primary sim (uncontested): `yarn celebration` (random mode devLog), `yarn scrubtest` (cold, `scrubbedSteps:80/scrubbedScrubIndex:40`), `yarn nearwin 3` (cold, `nearWinMovesLeft:3`), `yarn seedhistory` + `yarn seedhistory clear` (seed/clear devLogs) — all with matching `[SoliDev]` lines; error paths (unknown shortcut, extra arg after raw URL) exit 1 with usage. Android path verified by code review + error paths only (no unprompted phone delivery). Skill delivery subsection now shows the shortcuts table.
- [x] C8. Skill update — DONE. Section 3 catalog gained all five link families with when-to-use notes + a "Celebration testing" subsection (abort/dialog gotchas: tap = abort → forced Deal Again; dialog auto-opens at 30 s); section 4 gained reset=undoHint/reset=game + settings link + no-reset-all rationale; decision-tree fixture list gained nearwin and exact-deal entries.

### Verification

- [x] V1. `yarn typecheck && yarn lint && yarn jest` — green 2026-07-07 (26 suites, 252 tests) after Workstream B.
- [x] V2. Device/simulator smoke (single testing sub-agent, iOS simulator preferred — no risk to phone history): seed via deep link → History tab shows entries incl. groups/stats → clear → seeded rows gone, prior rows intact. DONE 2026-07-07 — all checks passed on a dedicated "Soli Test iPhone" simulator (primary sim was held by a concurrent agent session); full report in Testing section.
- [x] V3. Simulator smoke of Workstream C hooks (settings link, deal link, resets, parameterized scrubbed/nearwin, celebration trigger). DONE 2026-07-07 — all pass on the primary iPhone 17 Pro simulator (stale agent-device session from a finished run was closed, no live contention); full table in Testing. One minor bug filed (initial-URL replay, see Identified issues).

## Plan: Files to modify

- `.agents/skills/soli-testing/SKILL.md` (new), `.cursor/skills/soli-testing` (symlink)
- `AGENTS.md`, `.cursor/commands/prod.md`, `.cursor/rules/testing.mdc`
- `docs/external-package-guides/agent-device.md`, `docs/external-package-guides/react-native-jest-preset.md`
- `docs/product/demo-autosolve-playlist/*.md` (stale-command notes)
- `src/storage/historySeeds.ts` (new), `src/features/klondike/hooks/useDemoGameLauncher.ts`, `app/(tabs)/index.tsx`, possibly `src/state/history.tsx`
- `test/unit/storage/historySeeds.test.ts` (new)

## Files actually modified

Workstream A (2026-07-07):

- `.agents/skills/soli-testing/SKILL.md` (new) + `.cursor/skills/soli-testing` (new relative symlink)
- `AGENTS.md` (Testing section slimmed, Commands scrub line → skill pointer)
- `.cursor/commands/prod.md` (rewritten: yarn release/yarn ios), `.cursor/rules/testing.mdc` (thin pointer + quick reference)
- `docs/external-package-guides/agent-device.md` (npx → yarn agent-device, dated note)
- `docs/external-package-guides/react-native-jest-preset.md` (SDK 57 / RN 0.86 note)
- `docs/product/demo-autosolve-playlist/20-game-solved-demo-playlist.md` + `demo-sheet-undo-probes-info-hud.md` (superseded-command notes at top)

Workstream B (2026-07-07):

- `src/storage/historySeeds.ts` (new — seed catalog + seed/clear functions)
- `src/storage/historyRepository.native.ts` + `historyRepository.web.ts` (`deleteHistoryEntriesByIdPrefix`)
- `src/state/history.tsx` (`seedHistoryForTesting` on the context, queued + reload)
- `src/features/klondike/hooks/useDemoGameLauncher.ts` (`?seedHistory=` deep link), `useKlondikeGame.ts` (forwarding + result type)
- `src/features/klondike/components/KlondikeGameSession.tsx` (controls type), `app/(tabs)/index.tsx` (two demo-sheet buttons)
- `test/unit/storage/historySeeds.test.ts` (new — 9 tests)

Workstream C (2026-07-07):

- `src/solitaire/demoReplay.ts` (shared `foldReplayFixture`, `resolveScrubbedDemoOptions`, `createNearWinGameState`, `resolveNearWinMovesLeft`)
- `src/features/klondike/hooks/useDemoGameLauncher.ts` (`parseSettingsLinkParam`, `nearwin` demo mode, C1–C6 deep-link branches, new option props)
- `src/features/klondike/hooks/useKlondikeGame.ts` (settings setters forwarded; `performDealAgain` extracted from `requestNewGame`; `dealNewGameForTesting`, `startGameFromExactDeal`, `triggerCelebrationForTesting`; `dealNewGame` gained optional `stateOverride`)
- `.agents/skills/soli-testing/SKILL.md` (deep-link catalog, reset recipes, celebration-testing note, decision-tree fixtures)
- `test/unit/solitaire/demoReplay.scrubbed.test.ts` (extended), `test/unit/solitaire/demoReplay.nearwin.test.ts` (new), `test/unit/features/klondike/demoLinkParsing.test.ts` (new)
- NOT touched on purpose (in-flight concurrent celebration session): `useCelebrationController.ts`, `celebrationModes.ts`, `CelebrationOverlayLayer.tsx`, `celebrationModes.test.ts`
- Post-V3 follow-ups (2026-07-07 evening): `useDemoGameLauncher.ts` (cold-start replay fix, `initialUrlConsumedRef`), `scripts/deeplink.js` (new — C9 delivery wrapper, C10 shortcuts + auto-targeting), `package.json` (`deeplink`, `celebration`, `scrubtest`, `nearwin`, `seedhistory` scripts), skill delivery/caveat updates

## Intermediary learnings

- Codex discovers repo skills by scanning `.agents/skills` from CWD up to repo root; symlinked folders are followed. Cursor needs the `.cursor/skills/<name>` symlink (agent-device precedent). Frontmatter `name` must equal folder name.
- History schema (1.0 freeze): `status IN ('active','incomplete','solved')`, `solved` column removed (derived from status), unique partial index allows exactly one active row — seeding must respect it.
- Workstream A verification findings (2026-07-07): current scripts matched the task brief throughout — no discrepancies. Exact launch form is `adb -s <serial> shell am start -W -a android.intent.action.VIEW -d '<url>' ch.karimattia.soli/.MainActivity` (with `-W` and `/.MainActivity`, per `createLauncher` in build-tools.js). Deep-link dedup exists on BOTH sides: Android intent dedup AND `lastDemoLinkRef` in `processDemoLink()` ignores a repeated identical URL even after relaunch within the same app process — `#retry-N` handles both. `[SoliDev]` gating confirmed in `src/utils/devLogger.ts` (module-level flag, off by default). `?demo=autosolve&games=1` runs the playlist limited to 1 game (autoSolve implies playlist mode in `handleLaunchDemoGame`). `yarn lint` (oxlint) does not cover .md files, so doc changes need no verification commands.
- `.cursor/rules/testing.mdc` kept its `alwaysApply: false` frontmatter; content reduced to a skill pointer + quick reference rather than deleting the rule (it's what Cursor surfaces on manual @-mention).
- Workstream B (2026-07-07): jest-expo's haste config resolves `.native.ts` before `.ts`, so `import './historyRepository'` in `historySeeds.ts` gets the NATIVE module under Jest — real-SQL tests work without extra mocking. node:sqlite's `DatabaseSync` adapts cleanly to the expo-sqlite async surface (incl. `PRAGMA user_version` via `prepare().get()`), enabling true seed/clear roundtrip tests against the frozen v1 DDL.
- Layering decision (2026-07-07, Karim): AGENTS.md keeps testing POLICY only (context paragraph, cheap gates, sub-agent/parallelism rules, orchestrator plausibility check); ALL device recipes and command details live in the soli-testing skill. The orchestrator deliberately does NOT read the skill — it delegates and points testing sub-agents at it (saves tokens; skill metadata is enough for routing). The implementation-plan workflow intentionally stays in AGENTS.md (not a skill): every agent role reads/updates plans, and the workflow must be known before any skill would be triggered.
- Guardrail softened (2026-07-07, Karim): wiping Soli data from the physical phone is ALLOWED when genuinely needed, just not routinely — real history is valued. Skill section 4 rewritten as an escalation ladder (seeded rows → simulator wipe → targeted resets → phone wipe last). Don't re-harden it to an absolute ban.
- `yarn deeplink` targeting flipped to ANDROID-FIRST (2026-07-07, Karim): phone is the default when an adb device is connected, booted simulator is the fallback, `--ios` forces the sim. Consequence for agents: always pass `--ios` for simulator testing — the phone is usually connected, so the zero-flag default hits the phone (documented in skill §3).
- Catalog gotcha: many solvable deals cover several draw counts, so `getSolvableDealsForDrawCount(1)[0]` and `...(3)[0]` returned the SAME deal — the draw-3 seed now explicitly picks a deal distinct from the draw-1 picks (otherwise two seed groups silently merge in `getSolvableDealHistoryStats`).
- `devLogger` binds `console.*` at module evaluation — a Jest `console.info` spy must be installed BEFORE loading the module under `jest.isolateModules`.
- `historySeeds.ts` ↔ `state/history.tsx` would be a require cycle if seeds imported value exports from history; seeds therefore uses `import type` for HistoryEntry and `formatExactDealDisplayName` from `dealIdentity` directly (all seed ids are valid `E1_` ids).
- Workstream C (2026-07-07): callbacks passed as `useDemoGameLauncher` props must be defined BEFORE the launcher hook call in `useKlondikeGame` (TDZ) — `performDealAgain`/`startGameFromExactDeal`/`triggerCelebrationForTesting` therefore live between the celebration-controller call and the launcher call, while `requestNewGame` (defined later) reuses `performDealAgain`.
- C6 without touching the controller: `CelebrationOverlayLayer` renders exclusively from `celebrationState.cards` (`CardVisual` per config), NOT from board cards — so a synthetic 52-card payload with made-up card ids works on any board and gives a real-win-scale preview. `Number('') === 0` gotcha: absent URL int params must be checked for empty string before `Number()` (`parseOptionalIntParam`), else `&steps=` would silently clamp to 1.
- Celebration trigger semantics inherited from the real flow: dialog timer auto-opens "Start a new game?" 30 s in; tapping outside the badge aborts AND force-opens the Deal Again dialog. Documented in the skill so agents screenshot before tapping.

## Identified issues

- Demo sheet now has 9 buttons; the sheet detent previously clipped at 6 default-size buttons on Android (mitigated then via size="$3" + tight gaps). Two more entries may clip on small screens — check during V2 device smoke; if clipped, the seeding entries are still reachable via deep link. **V2 result (2026-07-07, iPhone 17 Pro sim): NO clipping — all 9 buttons fully visible and tappable (`06-demo-sheet.png`). Android small-screen check still outstanding if it ever matters.**
- **Cleanup TODO from V2 (2026-07-07)**: the smoke run initially fired `soli://?seedHistory=default` at the PRIMARY iPhone 17 Pro simulator before discovering a concurrent agent session ("celeb", celebration testing) owned that device — so that sim still has the 9 seed rows. Harmless (simulator, `seed-*` ids), fix by firing `soli://?seedHistory=clear#retry-N` at it once the celeb session is done. The actual smoke ran on a dedicated temp simulator ("Soli Test iPhone", deleted afterwards).
- **Not a bug (expected behavior, noticed during V2)**: re-seeding regenerates dates relative to the new "now" (delete-then-insert), so timestamps shift by the elapsed time between seeds. Deterministic ids/statuses/counts are what idempotency guarantees, not frozen wall-clock dates.
- **BUG (found in V3 2026-07-07) — FIXED 2026-07-07: cold-start deep-link replay.** If the app is cold-started BY a deep link L1 (e.g. `?demo=nearwin`), a later different link L2 could trigger a re-application of L1: the mount effect in `useDemoGameLauncher` re-runs whenever `processDemoLink`'s identity changes (its deps include settings/game callbacks that change with state), re-reads `Linking.getInitialURL()` — still L1 for the whole app process — and the single-slot `lastDemoLinkRef` (now holding L2) no longer dedupes it. Observed twice: a `?set=drawCount:1` restore was immediately re-stomped by the original `drawCount:3` link, and a nearwin cold-start link re-launched right over `?reset=game` + `?celebration=random` (log lines 18:27:38–41). **Fix**: `initialUrlConsumedRef` in `useDemoGameLauncher` — `getInitialURL()` is read exactly once per mount (flag set before the async resolution so a re-run during the pending promise can't double-read); warm-link listener and `#retry-N` behavior unchanged. No unit test: exercising it needs the full hook rendered with ~25 props + Linking mocks and no hook-testing library is in the dev deps — disproportionate; the inline comment + this note carry the knowledge. Skill caveat softened to historical context for older installed builds.app. **Re-verified on device 2026-07-07 (V3 follow-up)**: cold-start via `?set=drawCount:3,autoUp:off` → later `?set=drawCount:1,autoUp:on` STICKS (no re-application of the cold-start link) and a third link (`?reset=undoHint`) triggers no replay either — devLog sequence clean.
- **Not a bug (V3)**: the MOVES HUD does not decrement on undo (deliberate, commented in `klondike.ts` — undo is still player activity), so the scrubbed fixture shows MOVES = steps, not scrub index.

## Testing

- Workstream B unit tests: `test/unit/storage/historySeeds.test.ts` — catalog invariants (ids/statuses/one-active/date spread/draw coverage/replayed deal/preview shape/solvable flags) + real-SQLite roundtrips (idempotent re-seed, clear leaves the pre-existing row byte-identical, active-skip keeps a real active row unmodified and logs, solvable stats report plays=2/solves=1 for the replayed deal).
- `yarn typecheck && yarn lint && yarn jest`: green (26 suites, 252 tests, 2026-07-07).
- Workstream C unit tests (2026-07-07): scrubbed fixture with custom steps/scrub + resolver clamping (`demoReplay.scrubbed.test.ts`), nearwin fixture incl. actually winning by playing the remaining move(s) and clamp boundaries (`demoReplay.nearwin.test.ts`, 8 tests), settings-link parser (`demoLinkParsing.test.ts`, 7 tests). Full gates green after Workstream C: 28 suites, 275 tests (includes the concurrent session's celebration tests, still passing).

### V2 device smoke — iOS simulator (2026-07-07) — ALL PASS

Environment: Release build via `yarn ios` (78 s incremental, log `.test-artifacts/builds/20260707-163850-ios.log`). The primary iPhone 17 Pro simulator was owned by a concurrent agent-device session ("celeb"), so the smoke ran on a dedicated temp simulator **"Soli Test iPhone"** (created via `simctl create`, app installed from DerivedData `Release-iphonesimulator/Soli.app`, deleted after the run). Evidence screenshots: `.test-artifacts/agent-testing-skill/00–09*.png`.

| # | Check | Result |
|---|---|---|
| 1 | Seed via `xcrun simctl openurl <udid> 'soli://?seedHistory=default'` | PASS — 9 entries inserted; stats 9 games / 5 solved / 3 incomplete (baseline was 1 active real row → active seed correctly SKIPPED, 8 finished seeds + real active = 9) |
| 2 | Date grouping | PASS — Today, Yesterday, Jul 4, Jul 1, Jun 28, Jun 21, Jun 12, May 28 (`02/03-history-seeded-*.png`) |
| 3 | Statuses & badges | PASS — Active (blue) / Solved (green) / Incomplete (yellow); Draw 1/3/5 shown; "Solvable" only on catalog deals; replayed deal VO56-FEZI appears twice (Solved + Incomplete) |
| 4 | Entry detail preview | PASS — seeded solved entry opens detail sheet with full-foundation preview (`05b`) |
| 5 | Idempotency (`#retry-1`) | PASS — still 9/5/3, no doubling (`04-history-after-retry.png`); dates shift with new "now" (expected, delete-then-insert) |
| 6 | In-place refresh | PASS — History tab reflected seed/clear without app restart every time |
| 7 | Demo sheet buttons | PASS — "Seed history" + "Clear seeded history" visible, tappable, **no clipping** with 9 buttons (`06-demo-sheet.png`); sheet auto-dismisses on tap; sheet seed → 11/5/5 (2 real incompletes had accrued by then + 8 seeds + 1 real active) |
| 8 | Clear via `soli://?seedHistory=clear#retry-2` | PASS — back to exactly the 3 real rows (1 active + 2 incomplete), byte-for-byte same labels (`08-history-after-clear.png`) |
| 9 | Clear via sheet button | PASS — re-seeded then cleared through the sheet; real rows intact |
| 10 | Board sanity (tap-to-move) | PASS — fresh deal, Eight of spades → Nine of diamonds via testIDs `card-spades-8`/`card-diamonds-9`, MOVES 0→1 (`09-board-move-sanity.png`) |

Run notes (no code bugs): a stray tap on a stale ref mid-run set off the auto-solver on the temp sim's game (248 moves, win dialog) — agent error, not app behavior; recovered via "Deal Again". agent-device daemon timed out once on the contested primary sim; fine on the dedicated sim. First deep link on a fresh sim shows the iOS "Open in Soli?" confirmation — one-time, tap Open.

### V3 device smoke — Workstream C hooks, iOS simulator (2026-07-07) — ALL PASS

Environment: Release build via `yarn ios` (57 s incremental, log `.test-artifacts/builds/20260707-180900-ios.log`), primary iPhone 17 Pro simulator (`FFCFCBD6`, the previously contesting session had ended — its stale agent-device session was closed and recreated). Links delivered via `xcrun simctl openurl <udid> '<url>'` with `#retry-N`/`#<tag>` fragments; `[SoliDev]` watched via `log stream --level debug --predicate 'process == "Soli"'` (note: `--level debug` is REQUIRED — the default level misses the Info-level JS console lines). Evidence: `.test-artifacts/agent-testing-skill/v3/01–20*.png`.

| # | Hook | Result |
|---|---|---|
| 1 | `?set=drawCount:3,autoUp:off,solvableOnly:on` | PASS — devLog `Settings link applied { drawCount: 3, autoUp: false, solvableOnly: true }`; Settings screen shows Draw 3, Solvable on, Auto Up off (`02*.png`, switch values read via a11y). Caveat: the IN-PROGRESS game keeps the draw count it was dealt with, so a stock tap still moved 1 card — verify via Settings screen or a fresh deal. Restore `?set=drawCount:1` applied (devLog) but was stomped once by the initial-URL replay bug below; clean after terminate+plain relaunch (`03*.png`) |
| 2 | `?set=drawCount:9,bogusKey:1` | PASS — devLogs `ignored unknown pair "drawCount:9"` + `"bogusKey:1"`, applied `{}` , no crash, app responsive |
| 3 | `?deal=E1_8nk…c26r&draw=1` fired twice | PASS — devLog both times; IDENTICAL board: Waste Nine of hearts, Stock 23, col1 Eight of spades, col2 Two of diamonds, col3 Four of spades (`04/05*.png`); History active row `PZ6U-C26R` matches the exactId tail |
| 4 | `?reset=undoHint` | PASS — devLog `[Demo] Reset link: undo hint.`, no crash (full hint flow not re-verified per brief) |
| 5 | `?reset=game` | PASS — fresh deal (MOVES 0, new waste card) with NO confirmation dialog; History: new Active row `NDLR-4C13`, previous game recorded Incomplete with its 1 move (`06–08*.png`) |
| 6 | `?demo=scrubbed&steps=20&scrub=10` | PASS — fixture loads at index 10 (Clubs foundation Ace, Stock 18); 10 undo taps land exactly on the initial state (all foundations empty, Stock 24, undo-hint tip shown) (`09/10*.png`). Note: the MOVES HUD shows 20 and does NOT decrement on undo — deliberate product decision (comment in `klondike.ts`), not a bug. Redo side inferred from index math, not separately exercised |
| 7 | `?demo=nearwin` (left=1) | PASS — foundations K/K/K/Q, King of spades in waste; played waste → spades foundation via testIDs → REAL win: MOVES 244, celebration overlay + badge `Celebration 21 · Fountain` (`11/12*.png`); win recorded in History (`PZ6U-C26R, Solved, 244 moves`) |
| 8 | `?demo=nearwin&left=3` | PASS — foundations K/K/Q/Q, MOVES 241 = 244−3, Stock 1 card (`13*.png`) |
| 9 | `?celebration=random` + `=29` | PASS — random picked mode 8: devLog `Celebration link: mode 8 (Ring Cascade)`, overlay plays on a normal un-won board, badge `Celebration 09 · Ring Cascade` (`15*.png`); numeric `?celebration=29` → `mode 29 (Heartbeat)`, badge `Celebration 30 · Heartbeat` (`16*.png` also captures the documented 30 s auto-dialog). Badge number is the mode's 1-based POSITION (id+1). First random attempt was stomped by the initial-URL replay bug (`14*.png`) — clean after plain relaunch |
| 10 | `?seedHistory=default` → `=clear` regression | PASS — seed: devLog `Skipped active seed: real active row exists` + `Inserted 8 seed history entries`, rows visible across date groups incl. replayed `VO56-FEZI` pair, Draw-3 `C4TM-L6QG`, `0000-0001`/`0000-0002` (`17–19*.png`); clear: devLog `Cleared seed history entries`, seeded rows gone, real rows intact (`20*.png`) |

Cleanup: settings restored to Draw 1 / Auto Up on (devLog-confirmed), agent-device session closed, log stream stopped. Sim history keeps the test-run rows (real rows, incl. two `PZ6U-C26R` solves) — harmless on the simulator.

### V3 follow-up — replay fix + celebration preview re-verify, iOS simulator (2026-07-07) — ALL PASS

Rebuilt `yarn ios` (58 s, log `.test-artifacts/builds/20260707-185946-ios.log`) on the primary iPhone 17 Pro sim (no build lock, no live contention; a leftover agent-device session was 2 h stale with a dead runner → closed). Evidence: `.test-artifacts/agent-testing-skill/v3/21–24*.png`.

| Check | Result |
|---|---|
| Cold-start replay FIX | PASS — cold-start via `?set=drawCount:3,autoUp:off#retry-20` applied; `?set=drawCount:1,autoUp:on#retry-21` STICKS (no drawCount:3 re-application, unlike the pre-fix run); third link `?reset=undoHint#retry-22` also clean. devLog sequence: `{3,false}` → `{1,true}` → `Reset link: undo hint.` — nothing else in between |
| Celebration preview (new semantics) | PASS — `?celebration=random#retry-23` → mode 32 Meteor Shower overlay on the untouched board (`22*.png`); still looping at ~45 s with NO auto-dialog (`23*.png`); devLog `[Celebration] dev-hold: restarting run` at 60 s proves the indefinite loop; badge tap cycles (32 → wraps to 0 Spiral Bloom); tap outside → devLog `abort requested { preview: true }`, silent dismiss, board byte-identical to before (MOVES 0, Waste Six of clubs, Stock 23; `21*.png` vs `24*.png`), no Deal-Again dialog |

Cleanup: settings back at Draw 1 / Auto Up on (done within the replay check itself), agent-device session closed, log stream stopped.

## Follow-ups

- ~~`?deal=<exactId>&draw=N` runtime deal seeding~~ → promoted to Workstream C2 (prompt 3).
- ~~Parameterized scrubbed fixture~~ → promoted to Workstream C5 (prompt 3).
- ~~Delete `scripts/perf-baseline.sh`~~ → DONE 2026-07-07 (user confirmed; stale hardcoded coordinates, superseded by a11y driving + --auto-solve monitoring; historical references in docs/performance-baseline-timer-deep-dive and docs/delivery/19 left as archive).
- Primary-sim seed-row cleanup → DONE 2026-07-07 (orchestrator fired `?seedHistory=clear#retry-9` after celeb session ended; verified via read-only sqlite query: 0 seed rows, 9 real rows intact).
