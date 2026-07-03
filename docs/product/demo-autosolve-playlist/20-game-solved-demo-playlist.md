# Demo Autosolve Playlist 20-Game Solved Demo Playlist

## User prompt

```text
Today, we have a very simple demo game to test whether the game is running. I would love to extend this dramatically by having 20 games that are like demo games, but they are real games. And for that, I propose to have 20 of the new seeds that we introduced recently with solvable paths. And I know that the solver, the lonely solver, can actually generate paths. So I would love that kind of you will solve 20 random games, maybe some also complicated ones that take maybe a lot of moves, but also some simple ones. I mean, let's just start with 20 random games. General like solve them with the solver and then take the path and kind of have a demo mode that solves these 20 games in a row on the real phone and kind of implement that the demo mode then actively solves these games with the path. So kind of I don't know if we do that via kind of click with coordinates or that we can kind of programmatically steer which part gets moved, but it's important that this happens on real phone, the animations are real, kind of everything, so we can kind of have a full-on real test scenario. Please write the markdown for a file for this and then directly, not just write the markdown file for now, please, and think this through where in the code this would go. Kind of already try out the script to generate seeds and to check the format of the solvable paths and think about where in the code we would implement this, that kind of this gets solved programmatically. Thank you very much.
```

```text
implement now and run it.
in some games also add some random moves and undo them to test undo.
make sure you can trigger this from laptop via adb for testing.
```

```text
i tapped on the screen, so the code is fine and i caused the divergence. make the demo button ask the user whether we want to run the old demo game, a single new demo game or 20 demo games.
then run the 20 demo games.
see performance scripts that are uncommitted. check performance stats when running 20x
```

```text
add option to have 5 and 10 demo games
```

## Description

Replace the current single handcrafted demo auto-solve with a reproducible
20-game playlist of real Klondike deals. Each playlist item should be generated
from the recent solvable seed/deal pipeline, solved offline with Lonelybot, and
stored with a replayable solution path. The phone demo should then launch a real
release build, open the app via deep link, hydrate each real deal, and solve the
20 games in sequence by dispatching real game actions through the existing
animation path.

The important product distinction: this is not a solver UI and not a coordinate
tap bot. It is a deterministic end-to-end stress scenario that exercises the real
reducer, card movement, flight animations, win detection, celebration handoff,
and Android device runner.

## Framing context

- Current demo auto-solve is a custom internal board in `src/solitaire/demoDeal.ts`.
- Current demo playback lives in `src/features/klondike/hooks/useDemoGameLauncher.ts`.
- Current Android runner is `scripts/run-demo-autosolve.js`; it builds a release
  APK, installs it on a connected device, opens `soli:///?demo=autosolve`, and
  monitors logcat.
- Current solvable catalog generation is `scripts/generate-solvable-deals-v2.js`,
  which shells out to Lonelybot `harvest-v2`.
- The generated app catalog stores `E1_...:drawMask` rows, not solution paths.
- `lonecli solve` does emit solution paths, including a standard move trace that
  can be converted to Soli reducer actions.

## Acceptance Criteria

- A fixed 20-game playlist is generated from real solvable deals, not the current
  handcrafted 42-tableau-card demo.
- Every playlist entry includes:
  - app `exactId`
  - draw count used for the proof
  - generator seed/provenance
  - solver status
  - solution path in a structured replay format
  - useful difficulty/proof metadata such as move count and solve time when available
- The in-app demo can solve all 20 games in order on a real phone.
- Playback dispatches real game actions through `dispatchWithFlight`, so stock,
  waste, tableau, foundation, card-flight animations, and win transitions are real.
- The runner logs game start, game completion, playlist progress, and final
  success/failure.
- The runner fails if any replay step cannot be applied, any game fails to win,
  the app crashes, or the playlist times out.
- Auto Up is disabled during scripted playlist playback so the solver path, not
  the app's auto-complete queue, controls the solution.
- The feature does not pollute normal user history by default, or explicitly
  documents and gates any intentional history-writing mode.
- Unit tests validate parser/export format and reducer replay for at least the
  fixture path before native testing.
- Native validation runs a fresh installed build on the real Android device.

## Design links

- N/A

## Possible approaches incl. pros and cons

### Programmatic reducer playback through `dispatchWithFlight`

Pros:

- Uses the real app state and the real animation flight controller.
- Deterministic and much less fragile than screen coordinates.
- Can fail fast with exact step numbers and deal IDs.
- Reuses the same path current demo auto-solve already uses.

Cons:

- Requires a path adapter from Lonelybot standard moves to Soli selections.
- Must handle initial stock/waste state differences between Lonelybot and Soli.

Recommendation: use this approach.

### Native coordinate tapping

Pros:

- Closest to a user physically tapping the screen.
- Could catch touch-target regressions.

Cons:

- Brittle across screen sizes, safe areas, draw counts, and animation timing.
- Needs card coordinates and waits, making failures noisy and hard to diagnose.
- More likely to test the automation harness than the game logic.

Recommendation: avoid for the 20-game demo. Keep coordinate/device testing for
separate touch-target smoke tests.

### Extend the existing auto-complete queue

Pros:

- Reducer already has `autoQueue` and `ADVANCE_AUTO_QUEUE`.
- Good fit for a sequence of draw/move/recycle actions.

Cons:

- Existing auto queue is generated only when the game is nearly solved.
- It is intentionally tied to Auto Up behavior and history handling.
- Solver paths include tableau support moves throughout the game, so this would
  overload a user-facing mechanism.

Recommendation: reuse the scheduling idea, but keep a separate demo playlist
runner hook.

### Bundle Lonelybot/Rust solver in the app

Pros:

- Could solve arbitrary current positions later and power hints.
- Avoids precomputed solution paths.

Cons:

- Native Rust integration is much larger than this demo feature.
- Solver runtime would need cancellation, budgeting, and UI safety.
- Not needed for fixed replay tests.

Recommendation: do not include in this feature.

### Keep the handcrafted demo and only make it longer

Pros:

- Smallest short-term change.
- Current path is understood.

Cons:

- Still does not exercise real seed/deal layouts or solver-derived paths.
- Does not represent actual gameplay complexity.

Recommendation: retire it as the main auto-solve scenario after the playlist works.

## Open questions to the user

- Should the first version target Draw 1 only?
  - Alternative A: Draw 1 fixed playlist. Pro: matches current `demo=autosolve`
    assumptions and easiest path normalization. Con: does not stress Draw 2-5.
  - Alternative B: mixed draw counts. Pro: broader coverage. Con: more replay
    normalization and timing risk.
  - Recommendation: start with Draw 1 for the first 20-game real playlist, then add
    mixed draw counts after the replay adapter is proven.
- Should demo playlist games write to History?
  - Alternative A: suppress history by default. Pro: avoids 20 artificial solved
    games in user history. Con: less coverage of history persistence.
  - Alternative B: allow history writes. Pro: exercises result recording. Con:
    pollutes real user state and may skew stats.
  - Recommendation: suppress by default and add an explicit debug query param later
    if we want history stress.
- Should the 20 games be generated once and fixed, or random every run?
  - Alternative A: fixed generated artifact. Pro: reproducible failures and stable
    CI/device evidence. Con: less variety across runs.
  - Alternative B: generate random seeds at runtime. Pro: more variety. Con:
    requires solver availability on device or during every run.
  - Recommendation: fixed artifact now; regenerate intentionally when we want a new
    fixture set.

## Dependencies

- No new runtime app dependency is expected.
- Dev/tool dependency: local Lonelybot checkout at
  `/Users/karim/kDrive/Code/Lonelybot/lonelybot`.
- Feature guide: `docs/external-package-guides/lonelybot.md`.
- Existing guide: `docs/external-package-guides/lonelybot.md`.
- Upstream docs/source: https://github.com/vuonghy2442/lonelybot.

## UX/UI Considerations

- No new visible user-facing UI is required.
- Keep the existing hidden developer/deep-link behavior for automation.
- The manual developer `Demo` button should ask which demo mode to run:
  - old handcrafted demo game,
  - one generated solver-path demo game,
  - 5 generated solver-path demo games,
  - 10 generated solver-path demo games,
  - 20 generated solver-path demo games.
- The release-test runner should keep using a deep link for the 20-game playlist.
- Add concise dev logs rather than visible in-app labels:
  - `[DemoPlaylist] Game 1/20 loaded ...`
  - `[DemoPlaylist] Step 42/180 applied ...`
  - `[DemoPlaylist] Game 1/20 completed ...`
  - `[DemoPlaylist] Playlist completed ...`

## Components

- Reuse:
  - `KlondikeGameSession`
  - `KlondikeGameView`
  - `TopRow`
  - `TableauSection`
  - existing card components and flight controller
  - `useDemoGameLauncher` as the current integration point
  - `dispatchWithFlight`
- Create:
  - `src/data/demoAutoSolvePlaylist.generated.ts` for generated fixture data
  - `src/data/demoAutoSolvePlaylist.ts` for parsing/validation helpers
  - `src/solitaire/demoReplay.ts` or similar for replay action types and conversion
  - first version keeps scheduling inside `useDemoGameLauncher` to stay close to
    the existing hidden demo integration point
  - `scripts/generate-demo-autosolve-playlist.js` for Lonelybot solution export

## How to fetch data, how to cache

- Offline generation:
  - choose 20 default seeds from a reproducible seed range
  - solve each seed with Lonelybot for the selected draw count
  - export app `exactId` strings using Soli's exact-ID format and replay-specific
    stock order that matches Lonelybot's standard trace
  - export structured standard moves while keeping Lonelybot's untouched-stock
    starting point intact
  - validate each path against Soli's reducer before writing the generated file
- Runtime:
  - import the generated playlist from `src/data`
  - hydrate one deal at a time using app exact IDs
  - replay structured moves through `dispatchWithFlight`
  - keep all fixture data bundled; no network fetch is needed
- Cache/provenance:
  - keep generator command, Lonelybot git revision if easy, seed, draw count, move
    count, and solve timing in generated metadata comments or data fields

## Related tasks

- `docs/product/solvable-harvest-strategy/rethink-solvable-harvesting.md`
- `docs/external-package-guides/lonelybot.md`
- `docs/product/draw-count-setting/solitaire-stock-draw-count.md`
- `docs/product/auto-up-win-handoff/28-2-end-of-auto-up-jitter.md`

## Simplification ideas

- Start with Draw 1 only.
- Use a fixed playlist artifact instead of generating paths during device runs.
- Store structured moves, not raw solver display strings.
- Add one dedicated demo runner hook instead of folding this into normal Auto Up.
- Keep the old handcrafted demo only as a fallback until the playlist is stable,
  then remove or demote it.

## Steps to implement

1. [completed] Inspect current demo launcher, Android runner, solvable catalog, and
   reducer action paths.
2. [completed] Run a tiny `generate-solvable-deals-v2` sample into `/tmp` to verify
   generated seed/deal format.
3. [completed] Run direct `lonecli solve` samples to inspect solution path formats.
4. [completed] Document the code placement and replay strategy in this plan.
5. [completed] Add a Lonelybot export command or wrapper that emits app exact IDs plus
   structured standard moves.
6. [completed] Add an offline generator for a fixed 20-game playlist.
7. [completed] Add a reducer-level replay validator that proves every generated path
   wins from Soli's actual initial state.
8. [completed] Add generated playlist data under `src/data`.
9. [completed] Add `demoReplay` helpers to resolve structured moves into Soli actions.
10. [completed] Add playlist hydration and scheduling inside `useDemoGameLauncher`.
11. [completed] Extend `useDemoGameLauncher` or replace its auto-solve branch with the
    playlist runner.
12. [completed] Extend `useKlondikeGame` deep-link parsing for playlist mode while
    preserving current `demo=autosolve`.
13. [completed] Extend `scripts/run-demo-autosolve.js` to wait for 20-game playlist
    completion and use a longer timeout.
14. [completed] Add unit tests for generated fixture validation and replay conversion.
15. [completed] Run typecheck/lint/unit tests.
16. [completed] Run native Android release build/install and playlist demo on the
    connected device. The app built, installed, launched from the laptop via ADB,
    and later completed the full 20-game playlist after the device was reconnected.
17. [not run] Decide whether a separate iOS simulator build is needed after the
    requested Android ADB run.
18. [completed] Change the visible developer Demo button into a three-choice prompt:
    old demo, one generated demo, or 20 generated demos.
19. [completed] Rerun the 20-game Android playlist without touching the screen.
20. [completed] Capture and summarize performance samples from the uncommitted Android
    diagnostics scripts during the 20-game run.
21. [completed] Add 5-game and 10-game choices to the developer Demo prompt,
    reusing the existing generated playlist runner.

## Plan: Files to modify

- `docs/product/demo-autosolve-playlist/20-game-solved-demo-playlist.md`
- `docs/external-package-guides/lonelybot.md`
- `scripts/generate-demo-autosolve-playlist.js`
- `src/data/demoAutoSolvePlaylist.generated.ts`
- `src/data/demoAutoSolvePlaylist.ts`
- `src/solitaire/demoReplay.ts`
- `src/features/klondike/hooks/useDemoGameLauncher.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/components/KlondikeGameSession.tsx`
- `app/(tabs)/index.tsx`
- `scripts/run-demo-autosolve.js`
- `test/unit/solitaire/demoReplay.test.ts`
- `test/unit/solitaire/klondike.drawCount.test.ts`

## Files actually modified

- `docs/product/demo-autosolve-playlist/20-game-solved-demo-playlist.md`
- `docs/external-package-guides/lonelybot.md`
- `scripts/generate-demo-autosolve-playlist.js`
- `scripts/run-demo-autosolve.js`
- `src/data/demoAutoSolvePlaylist.generated.ts`
- `src/data/demoAutoSolvePlaylist.ts`
- `src/features/klondike/hooks/useDemoGameLauncher.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/components/KlondikeGameSession.tsx`
- `app/(tabs)/index.tsx`
- `src/solitaire/demoReplay.ts`
- `src/solitaire/klondike.ts`
- `test/unit/solitaire/demoReplay.test.ts`
- `test/unit/solitaire/klondike.drawCount.test.ts`

## Intermediary learnings

- `scripts/generate-solvable-deals-v2.js` wraps Lonelybot `harvest-v2`; it writes
  app rows like `'E1_...:31'` but does not store paths.
- The tiny sample command generated five rows in `/tmp` and showed draw-specific
  masks: seed 0 solved for Draw 1 and Draw 2 but not Draw 3-5.
- `lonecli solve default 0 1` solved in 94 primitive moves and printed a standard
  move trace with `=`, `D`, tableau numbers, and suit targets.
- `lonecli solve default 0 2` also solved; `lonecli solve default 0 5` reported
  `Impossible` for that seed.
- `lonecli print default 0` emits Solvitaire-style JSON with full tableau and
  stock, which is useful for generator validation.
- `lonecli exact default 0` returns Lonelybot's decimal permutation rank, not
  Soli's `E1_...` ID. The Soli app ID comes from the `harvest-v2` encoder that
  remaps suits into `clubs, diamonds, hearts, spades`.
- Soli game factories reveal the first draw immediately. Lonelybot standard traces
  start before any draw, so solution paths must be normalized before replay.
- Current `useDemoGameLauncher` already dispatches through `dispatchWithFlight`,
  which is the right path for real on-phone animations without coordinate taps.
- The implemented generator produced 20 Draw 1 playlist games from default seeds
  `0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20`.
  Seed 8 was skipped because it did not produce a parsed/winning replay within the
  requested generation scan.
- The generated playlist contains 4,804 replay actions, with per-game replay paths
  ranging from 202 to 275 actions. Twelve deterministic undo probes are spread
  across selected games, so the on-device runner exercises undo and then replays
  the undone move before continuing.
- Soli's exact-ID stock order had to be adapted for replay. Lonelybot traces begin
  from untouched stock, and Soli draws by popping from the end of `stock`, so the
  generated replay exact IDs intentionally store stock in the order needed for the
  app runtime to expose the same draw sequence. They are real app exact IDs derived
  from Lonelybot default seeds, but they should not be assumed to equal the current
  `harvest-v2` catalog rows for the same seed.
- Instead of trimming solver moves, `createGameStateFromExactId` now supports
  `{ revealInitialWaste: false, autoUpEnabled: false }` for scripted replay. Normal
  game creation still preserves the existing first-waste-card reveal behavior.
- Demo playlist playback suppresses normal history writes while active, so the 20
  scripted wins do not pollute user stats.
- The first implementation keeps playlist scheduling inside `useDemoGameLauncher`
  instead of creating a new hook. That keeps the hidden demo behavior close to the
  previous integration point and leaves an easy extraction if the runner grows.
- The first physical Android run completed 18 games, then failed at game 19 step 1
  with `Cannot draw or recycle with empty stock and waste.` The device logs showed
  previous win/celebration work could still be interleaving as the next fixture was
  loaded. The fix is to wait until `stateRef.current` actually matches the hydrated
  playlist fixture before logging the game as loaded or dispatching step 1.
- The second physical Android run built and installed successfully again, then
  reached game 18 before ADB/logcat exited with `adb: device offline`. After
  `adb kill-server` / `adb start-server`, `adb devices` and `adb mdns services`
  showed no reachable devices, so that run was blocked on device connectivity
  rather than a replay assertion.
- The visible developer `Demo` button now opens an `AppSheet` choice prompt. The old
  handcrafted demo remains available, while single generated replay and 20 generated
  replays use the same solver-path machinery as the ADB runner.
- The ADB playlist deep link now includes `perfDiagnostics=1` and
  `perfMarker=demo-playlist-20x`, so a release runner can turn on the existing
  dev-mode performance log store before replay starts.
- The first perf deep-link attempt exposed an Android shell quoting issue: `&` in
  `soli:///?demo=playlist&perfDiagnostics=1&perfMarker=demo-playlist-20x` caused
  the URI to be split by `adb shell`. `scripts/run-demo-autosolve.js` now quotes
  the URI before passing it to `am start`.
- After reconnecting the phone on 2026-06-25, `yarn demo:auto-solve` completed all
  20 playlist games on the physical Android device. The run observed all 12 undo
  probes and logged `[DemoPlaylist] Playlist completed (games=20).`
- Post-run sample folder:
  `tmp/perf-samples/demo-playlist-20x-20260625-073128/after-20-games`.
- The 20-game perf run produced 5,329 structured performance log events. Replay
  dispatch looked healthy: 20 game loads, 20 completions, 12 undo probes, 0 flight
  timeouts, 0 stale flight dispatches, and max pending flight count of 1.
- The post-run Android memory snapshot is high: total PSS about 2.05 GB, total RSS
  about 2.17 GB, native heap PSS about 1.14 GB, unknown PSS about 783 MB, Java heap
  PSS about 42 MB, and 616 views.
- The post-run graphics snapshot reported 54,915 rendered frames, 6,093 janky
  frames (11.10%), p50 10 ms, p90 15 ms, p95 18 ms, p99 53 ms, slow UI thread
  5,679, slow issue draw commands 5,617, and GPU p99 8 ms.
- Persistence is the clearest app-side hot signal from the perf logs: 554 persisted
  writes during the 20-game replay, average 162.6 ms, p90 265.8 ms, p99 447.2 ms,
  max 996.6 ms.
- Event-loop diagnostics recorded many spike summaries during the stress run, with
  max observed drift of about 2,520 ms. Because this sample was captured only after
  the run, it is a useful stress snapshot but not yet a memory-growth slope.
- The visible developer `Demo` prompt now offers old demo, one generated game, 5
  generated games, 10 generated games, and 20 generated games. The 5/10/20 choices
  all reuse the same generated playlist and only change the replay limit.
- Deep links can now pass `games`, `gameLimit`, or `count` to cap playlist replay
  length, e.g. `soli:///?demo=playlist&games=5`.
- `scripts/run-demo-autosolve.js` now accepts `DEMO_GAME_LIMIT=5` or
  `DEMO_GAME_LIMIT=10`, clamps the value to the 20 bundled fixtures, includes the
  count in the perf marker, and scales the playlist timeout to the selected count.

## Identified issues

- [resolved] `harvest-v2` does not emit solution paths. Added
  `scripts/generate-demo-autosolve-playlist.js`, which shells out to `lonecli solve`
  and `lonecli print`.
- [accepted] Current `lonecli solve` path output is display text, not structured JSON.
  The first version parses the standard trace into typed replay moves; a future
  Lonelybot JSON export would still be cleaner.
- [resolved] Soli's initial reveal differs from Lonelybot's starting stock state.
  Scripted replay hydrates with `revealInitialWaste: false`.
- [resolved] Auto Up could compete with scripted playback if not disabled.
  Scripted replay hydrates with `autoUpEnabled: false`.
- [resolved] Twenty solved demo games may pollute history unless demo playback suppresses
  normal history writes or uses an explicit test mode.
- [resolved] The Android runner's current 60-second timeout is too short for 20 real
  games with animations.
- [resolved] Fixed the replay handoff race found on Android at game 19 by waiting
  for hydrated fixture state before starting each game's first replay move.
- [resolved] Native Android full-playlist completion was blocked temporarily when
  the physical ADB device went offline during the second run. After reconnecting,
  the third run completed all 20 games on the physical device.
- [resolved] The manual Demo button previously only launched the old handcrafted
  demo. It now asks which demo mode to run.
- [resolved] Android shell split the perf-enabled demo URI at `&`. The ADB runner
  now quotes the deep-link URI argument before invoking `am start`.
- [resolved] Shorter generated demo runs were not exposed in the developer prompt.
  The prompt now includes 5-game and 10-game options alongside the existing 20-game
  playlist option.
- [investigate] The 20-game perf sample shows very high native/unknown memory after
  replay and expensive persistence writes. The replay runner is stable, but these
  stats should feed the ongoing Android slowdown investigation.

## Testing

Exploratory checks completed on 2026-06-24:

- `node scripts/generate-solvable-deals-v2.js --total=5 --start-seed=0 --chunks=1 --skip-build --timeout-ms=5000 --report-every=1 --out=/tmp/soli-solvable-demo-sample.ts`
- `./target/release/lonecli solve default 0 1`
- `./target/release/lonecli solve default 0 2`
- `./target/release/lonecli solve default 0 5`
- `./target/release/lonecli print default 0`

Implementation checks completed on 2026-06-24:

- `node scripts/generate-demo-autosolve-playlist.js --count=20 --start-seed=0 --draw-count=1 --max-attempts=40`
- `yarn jest test/unit/solitaire/demoReplay.test.ts --runInBand`
- `yarn typecheck`
- `yarn lint`
- `yarn jest --runInBand`
- `yarn demo:auto-solve` (first Android run)
- `yarn typecheck` (after Android race fix)
- `yarn lint` (after Android race fix)
- `yarn jest test/unit/solitaire/demoReplay.test.ts --runInBand` (after Android race fix)
- `yarn jest --runInBand` (after Android race fix)
- `yarn demo:auto-solve` (second Android run)

Follow-up checks completed on 2026-06-25:

- `yarn exec oxfmt src/features/klondike/hooks/useDemoGameLauncher.ts src/features/klondike/hooks/useKlondikeGame.ts src/features/klondike/components/KlondikeGameSession.tsx app/(tabs)/index.tsx scripts/run-demo-autosolve.js docs/product/demo-autosolve-playlist/20-game-solved-demo-playlist.md`
- `yarn typecheck`
- `yarn lint`
- `yarn jest test/unit/solitaire/demoReplay.test.ts --runInBand`
- `yarn demo:auto-solve`
- `RUN_ID=demo-playlist-20x-$(date '+%Y%m%d-%H%M%S') KEEP_FULL_LOGCAT=1 scripts/collect-android-slowdown-sample.sh after-20-games`
- `yarn jest --runInBand`

Follow-up checks completed for the 5/10-game prompt on 2026-06-25:

- `yarn exec oxfmt app/(tabs)/index.tsx src/features/klondike/hooks/useDemoGameLauncher.ts src/features/klondike/hooks/useKlondikeGame.ts scripts/run-demo-autosolve.js docs/product/demo-autosolve-playlist/20-game-solved-demo-playlist.md`
- `node --check scripts/run-demo-autosolve.js`
- `yarn typecheck`
- `yarn lint`
- `yarn jest test/unit/solitaire/demoReplay.test.ts --runInBand`
- `yarn jest --runInBand`

Current results:

- TypeScript passed.
- Lint passed.
- All 12 Jest suites passed, with 59 tests passing.
- The generated replay test proves all 20 paths reach `hasWon === true` through
  the Soli reducer with Auto Up disabled, and verifies undo probes by undoing and
  replaying selected moves.
- The 5/10-game prompt change was validated with TypeScript, lint, script syntax,
  the replay-focused Jest test, and the full Jest suite. A fresh native rerun was
  not necessary for this UI/count-only extension because the same playlist runner
  already completed 20 games on the phone.
- Android run 1:
  - `yarn demo:auto-solve`
  - release build completed in 10m 37s
  - APK installed successfully on `192.168.1.12:39835`
  - app launched through `soli:///?demo=playlist`
  - games 1-18 completed on the physical device
  - undo probes were observed in logcat
  - game 19 failed at step 1 because replay started against stale won-board state
- Android run 2 after the hydration-wait fix:
  - `yarn demo:auto-solve`
  - release build completed in 39s
  - APK installed successfully on `192.168.1.12:39835`
  - app launched through `soli:///?demo=playlist`
  - games 1-17 completed, including undo probes
  - game 18 loaded and was playing when logcat exited with code 255
  - the runner failed to restore screen timeout because `adb` reported the device
    as offline
  - after `adb kill-server` and `adb start-server`, `adb devices -l` listed no
    devices and `adb mdns services` listed no discovered services
- Android run 3 after reconnect and URI quoting fix:
  - `yarn demo:auto-solve`
  - release build completed in 38s
  - APK installed successfully on
    `adb-4139951e-zmJeED._adb-tls-connect._tcp`
  - app launched through
    `soli:///?demo=playlist&perfDiagnostics=1&perfMarker=demo-playlist-20x`
  - games 1-20 completed on the physical device
  - all 12 undo probes were observed in logcat
  - runner completed on `[DemoPlaylist] Playlist completed (games=20).`
- Android perf sample after run 3:
  - sample folder:
    `tmp/perf-samples/demo-playlist-20x-20260625-073128/after-20-games`
  - total PSS: 2,052,938 KB
  - native heap PSS: 1,139,424 KB
  - unknown PSS: 783,425 KB
  - total rendered frames: 54,915
  - janky frames: 6,093 (11.10%)
  - persistence writes: 554, avg 162.6 ms, p90 265.8 ms, p99 447.2 ms, max 996.6 ms
  - flight diagnostics: 0 stale, 0 timeout, max pending 1
  - event loop: max observed drift about 2,520 ms

Pending verification:

- iOS native: decide after the requested Android ADB run whether a separate clean
  simulator build adds enough value for this Android-focused automation feature.
