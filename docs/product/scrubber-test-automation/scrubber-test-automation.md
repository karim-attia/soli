# Scrubber Test Automation — iOS Drag via Appium + "Scrubbed Mid-Game" Demo Entry

Created: 2026-07-06
Status: **DONE on both platforms (A1–A5, B1–B6, C1 iOS, C2 Android — all
checks passed).**

> **⚠️ COORDINATION CONSTRAINT (read before touching any file):** Another agent is
> concurrently cleaning up the demo game sheet (`DemoChoiceSheet` in
> `app/(tabs)/index.tsx`, possibly also `useDemoGameLauncher.ts`). Therefore:
>
> 1. Keep our sheet-UI footprint to **ONE new entry/button**, added at
>    implementation time against whatever the sheet looks like *then*.
> 2. Put the substance in the launcher/engine layer (new `LaunchDemoGameOptions`
>    mode + a pure state builder in `src/solitaire/`), not in the sheet.
> 3. Implementation sub-agent: **re-read the current sheet/launcher code right
>    before editing and adapt** — do NOT assume the snapshots quoted in this plan
>    are still accurate.

## User prompt

> "hm, find a solution for this. we did this in the past with appium. scrubber would be nice for regular testing. also if you find a way to inject a game path to the device that's already quite far but scrubbed to middle, that would make testing easier @docs/product/move-log-persistence/move-log-persistence-and-resumable-history.md. maybe as an entry to demo game. attention: other agent is just cleaning up demo game sheet, pls coordinate."

## Summary

**Status 2026-07-06 (evening):** A1–A5 and B1–B6 done; C1 iOS device smoke
PASSED end-to-end (deep link + sheet entry, Appium drags to 20/0/max all landed
EXACTLY, persistence restore after kill, tap-undo one-step check). The script's
default gesture parameters worked on the first attempt — no tuning iterations
were needed. C2 Android smoke COMPLETED the same evening in two sessions
(interrupted mid-run by a wireless-adb dropout that needed Karim to re-enable
Wireless debugging): build/install, deep link, ALL pinned index-40 label
assertions, agent-device pan-drag landing EXACTLY on index 20, tap-undo
one-step decrement (20 → 19), and kill+cold-relaunch persistence restore all
PASSED on the physical device (A065). New Android findings: the scrubber track
node does NOT surface at rest on Android either (the "Android surfaces the
track" assumption was wrong — assert landings via card labels + MOVES instead),
and the root deep-link form `soli://?demo=scrubbed` skips the +not-found detour
on Android (goes straight to the board). Pinned assertion cards live in
`demoReplay.scrubbed.test.ts`. One issue to watch: a single non-reproducible
"Maximum update depth exceeded" crash after firing the deep link twice into a
stale app session on iOS (details in Identified issues); relatedly, on Android
a scrubbed deep link fired into a warm app with a stale demo-playlist run got
overwritten by the playlist's next game — force-stop before deep-linking for
reliable automation (details in learnings).

Two separable deliverables (no shared code, can be implemented/tested independently):

1. **iOS scrub-drag automation via Appium** — a single Node script
   (`scripts/ios-scrub.js`) that talks plain HTTP to a locally running Appium 3
   server (XCUITest driver) and performs a W3C-actions press-hold-paced-move-release
   pointer sequence on the Undo button. No app code changes. This exact recipe
   (pause 200 ms + multi-second `pointerMove` segments) already drove the RNGH pan
   successfully in the historical 20-6 scrubber debugging suite (Appium passed
   20/20 there), so the approach is proven on this app, not just theoretical.
   agent-device stays the tool for snapshots/taps; Appium is used *only* for the
   drag, serialized (session created → drag → session deleted → back to
   agent-device).
2. **"Far game, scrubbed to middle" demo entry** — a new demo mode that
   synchronously folds a fixed prefix (80 primitive steps) of the existing
   generated solver playlist entry `default-0-draw-1` through the pure
   `klondikeReducer`, applies `SCRUB_TO_INDEX` to the midpoint (40), and hydrates
   the result in one `HYDRATE_STATE` dispatch. Deterministic: same deal, same
   board, same labels every launch → device tests can assert exact card labels and
   the scrubber readout `position 40 of 80`. Reachable via one Demo-sheet button
   AND a dev deep link (`soli://demo-game?demo=scrubbed`) so automated tests can
   enter the state with zero UI taps (`xcrun simctl openurl booted ...`).

## Description

The move-log-persistence story shipped a full undo/redo timeline that survives
restarts, and the card-accessibility story shipped a11y handles for it — but two
testing gaps remain (both verified 2026-07-06):

- **iOS cannot automate the scrub drag.** agent-device synthesizes every pan/swipe
  as a single ~300 ms swipe regardless of requested duration (its gesture telemetry
  proves it), so the RNGH `Gesture.Pan` (minDistance 5, needs paced move events
  under a held pointer) never activates. 6 attempts failed. Android works (real
  input injection). Every future iOS smoke that needs scrub coverage currently
  falls back to tap-undo loops or "proven on Android instead".
- **Reaching a rich undo/redo state is slow.** To test scrubber/undo/redo behavior
  a tester must first *play* dozens of moves and then undo half of them — minutes
  of tap automation per run, and the resulting state differs between runs (random
  deal), so nothing exact can be asserted.

Karim used Appium for exactly this in the past: task 20-6 ("Fix iOS scrubber
gesture premature cancellation", Dec 2025) ran a 20-case Appium scrub suite via
raw WebDriver pointer actions, and `docs/external-package-guides/appium.md` still
contains the working session + "Long Scrub Action" snippets. This story turns that
ad-hoc knowledge into a repeatable script and pairs it with a one-step injection
path for a rich mid-game state.

Why this is nice and important: scrubber regressions become machine-checkable on
both platforms; every future device test that needs "a game with history AND
future" starts in seconds from an exact, assertable state; and the vision demands
the scrubber stays flawless — it is a signature feature of the app.

## Acceptance Criteria

1. With the app (dev build `ch.karimattia.soli`) on the booted iOS simulator and
   an Appium server running, `node scripts/ios-scrub.js --from 40 --max 80 --to 20`
   performs a drag on the Undo button that lands the timeline exactly on index 20
   (asserted via board card labels / a deterministic state, see Testing).
   `--to 0` (full left) and `--to <max>` (full right) work without knowing the
   current index.
2. The script needs no app rebuild, no new `package.json` dependencies, and prints
   actionable setup instructions when the Appium server/driver is missing.
3. A new Demo-sheet entry launches a deterministic mid-game state: same deal
   (`default-0-draw-1`) every time, `history.length === 40`,
   `future.length === 40`, `moveCount === 80`, board identical across launches.
4. The same state is reachable via deep link `soli://demo-game?demo=scrubbed`
   without touching the UI (dev mode only, matching existing demo-link behavior).
5. On the launched scrubbed state, undo/redo/scrubber behave normally (tap undo
   steps back; Android agent-device pan scrubs; iOS Appium script scrubs), and
   Auto Up is OFF so no auto-queue mutates the state underneath a test.
6. Killing and relaunching the app restores the scrubbed mid-game state with full
   depths (the state is built from a real `exactId` + reducer fold, so the
   move-log persistence path replays it — unlike the old 42-card demo board).
7. `docs/external-package-guides/appium.md` refreshed (date-stamped, linked
   sources, snippets for exactly our scenario). Done during planning, 2026-07-06.
8. `yarn typecheck && yarn lint && yarn jest` green; new pure builder unit-tested.

## Possible approaches incl. pros and cons

### Deliverable 1 — iOS drag automation

#### 1A. Appium (XCUITest driver) driven by a plain-HTTP Node script (RECOMMENDED)

Appium server (global install) + XCUITest driver; our script speaks the W3C
WebDriver protocol directly via `fetch` (Node ≥ 18; machine runs Node 25).
Session with `appium:bundleId: ch.karimattia.soli`, `appium:noReset: true`
(attaches to the installed dev build, no reinstall). Drag = one `POST /actions`
with `pointerDown` → `pause 200ms` → several paced `pointerMove` segments
(≥ 1.5 s total) → `pointerUp`.

- Pros: **proven on this exact app + gesture** (20-6 suite, Dec 2025, 20/20);
  Karim has experience with it; W3C actions give full control over hold time and
  move pacing (the two things agent-device cannot express on iOS); zero new npm
  dependencies (plain HTTP, like the historical curl workflow); XCUITest driver
  finds elements by accessibility id = our testIDs (`undo`).
- Cons: external tool prerequisite (Appium server + driver on the dev machine);
  WDA build on first session start takes ~1 min; a second XCTest automation
  stack alongside agent-device → must be serialized (see Identified issues).

#### 1B. Appium via WebdriverIO / Python client framework

- Pros: nicer APIs, assertions, retries for free.
- Cons: heavyweight dependency tree (wdio adds hundreds of packages) or a second
  language toolchain, for what is a single gesture helper. Everything else
  (snapshots, taps, assertions) already lives in agent-device. Rejected —
  violates "prefer simplicity".

#### 1C. Maestro

- Pros: simple YAML, `swipe` has a `duration` param.
- Cons: long-standing open issues with swipes on RN iOS (maestro#1135, #650 —
  swipes fire but the app never receives them, the same class of failure we
  already have); swipe is start→end only, no explicit hold-then-move phase RNGH
  pans want; new tool with no track record on this app. Rejected.

#### 1D. idb (`idb ui swipe`)

- Pros: lightweight CLI, `--duration` option, simulator HID events.
- Cons: same single-swipe shape (no press-hold + paced segments); Meta has
  largely deprecated idb; unverified against RNGH; would need its own research
  spike with a real chance of hitting the identical ~300 ms-synthesis wall.
  Rejected as primary; noted as fallback if Appium unexpectedly fails.

#### 1E. Native XCUITest runner (own UI-test target)

- Pros: first-party APIs (`press(forDuration:thenDragTo:withVelocity:)`),
  maximum fidelity.
- Cons: adds an Xcode test target to an Expo-managed project (prebuild churn),
  Swift maintenance, slowest to iterate. Overkill for one gesture — and Appium's
  `mobile: dragFromToWithVelocity` proxies the very same WDA
  `pressAndDragWithVelocity` API anyway, so 1A reaches the same primitive without
  the target. Rejected.

**Decision: 1A**, with `mobile: dragFromToWithVelocity` (execute-method) as the
in-script fallback if W3C actions ever regress — Appium docs recommend it for
velocity-sensitive drags.

### Deliverable 2 — "scrubbed mid-game" injection

#### 2A. Pure reducer fold over a playlist-solution prefix + SCRUB_TO_INDEX, one HYDRATE_STATE (RECOMMENDED)

New pure builder in `src/solitaire/` (natural home: `demoReplay.ts`):
`createScrubbedMidGameState()` — take playlist entry `default-0-draw-1`
(`getDemoAutoSolvePlaylist()[0]`, 244 primitive steps of a full lonelybot
solution), start from `createDemoReplayGameState(entry)` (autoUp off,
`revealInitialWaste: false`), fold the first **80** steps through
`applyDemoReplayMoveForValidation` (each move validated against expected cards;
throws on drift, so a future playlist regeneration cannot silently change the
fixture), then apply `klondikeReducer(state, { type: 'SCRUB_TO_INDEX', index: 40 })`.
Result: `history = 40`, `future = 40`, `moveCount = 80`. Launcher hydrates it in
one dispatch.

- Pros: instant (replay of 80 reducer steps ≈ single-digit ms, measured in the
  move-log story); fully deterministic — tests can assert exact labels; reuses
  solver data + replay machinery that already exists (zero new fixtures); the
  state carries a real `exactId` + a real `moveLog` (the fold appends entries),
  so **persistence replays it after kill/relaunch for free** — a genuinely useful
  bonus for restart-under-scrub testing; pure function = trivially unit-testable.
- Cons: the fixture depends on the generated playlist file (mitigated by the
  validating fold + a unit test pinning the resulting board signature).

#### 2B. Reuse the async playlist runner, stop at step 80, then scrub

- Pros: visually watchable, reuses `runDemoPlaylist` verbatim.
- Cons: takes ~25 s (300 ms per step) — defeats "rich state in one step"; the
  timer-driven runner is exactly the machinery we don't need for an instant
  injection. Rejected.

#### 2C. Persist a canned payload (deal + move log JSON) and hydrate through `loadGameState`

- Pros: exercises the production load path.
- Cons: a second copy of the fixture as an opaque JSON blob that goes stale when
  the payload shape evolves (it changed 4× in one day during the move-log story);
  2A gets the same state from data that already self-validates. Rejected.

#### 2D. Deep link only (no sheet entry)

- Pros: zero conflict with the sheet cleanup.
- Cons: humans (Karim) also want to reach this state quickly for manual testing;
  one button is cheap. Rejected in favor of both, with the sheet button kept to
  a single line added at implementation time.

**Decision: 2A + one sheet button + deep-link param.**

## Open questions to the user

All proceeding with recommendations per AGENTS.md; flagging here:

1. **Appium install location: global tool vs devDependency?**
   Recommendation: **global** (`npm i -g appium && appium driver install xcuitest`),
   documented in the package guide; the script preflights the server and prints
   these commands if missing. Pro: keeps the heavy Appium tree out of
   `node_modules` for a helper only used on demand (same model as agent-device's
   global CLI). Con: not version-pinned per-repo — acceptable for a dev-only
   gesture helper. Alternative (devDependency) buys reproducibility at the cost
   of install weight for every `yarn`.
2. **Scrub depth: 80 steps / midpoint 40?** Recommendation: **yes**. Deep enough
   to be "quite far" (40 undos + 40 redos available, satisfies "~40+ moves"),
   shallow enough that the fixture never nears the auto-finish endgame of the
   solution (entry 0 has 244 steps), keeping mid-game texture (face-down cards,
   stock cycling). Constants, trivially tunable later.
3. **Should the scrubbed demo write history rows?** Recommendation: **no** (same
   as other demo launches: `recordCurrentGameResult()` closes the previous real
   game, the demo game itself stays unlinked). Keeps History clean of synthetic
   games.
4. **Auto Up in the scrubbed state?** Recommendation: **OFF** (hydrate with
   `autoUpEnabled: false`, like the playlist replay). A scheduled auto-queue would
   mutate depths underneath assertions. Tests that need Auto Up can toggle it.

## Dependencies

- **Appium 3 + XCUITest driver** (external dev-machine tools, not npm deps of
  this repo). Guide: [docs/external-package-guides/appium.md](../../external-package-guides/appium.md)
  (refreshed 2026-07-06 with our exact scenario). Node ≥ 20.19 required by
  Appium 3; machine has Node 25.
- No new in-repo dependencies. Deliverable 2 uses only existing modules
  (`demoReplay.ts`, `klondike.ts`, `demoAutoSolvePlaylist.generated.ts`).
- Related guide: [docs/external-package-guides/agent-device.md](../../external-package-guides/agent-device.md)
  (stays the primary device-automation tool).

## UX/UI Considerations

- Player-facing: none. Everything is dev-mode-only (Demo sheet gated on
  `developerModeEnabled`; deep links follow the existing demo-link gating).
- Demo sheet: exactly one new button, e.g. label "Mid-game, scrubbed to middle".
  Adapt to the sheet's post-cleanup shape at implementation time.

## Components

- No new components. One `Button` line inside the existing (possibly refactored)
  `DemoChoiceSheet`.
- New pure function in `src/solitaire/demoReplay.ts` (or a sibling if the other
  agent moved things): `createScrubbedMidGameState()`.
- New script `scripts/ios-scrub.js` (plain Node, matching the existing
  `scripts/*.js` style).

## How to fetch data, how to cache

Not applicable — no network/storage changes. (The scrubbed state persists via the
existing move-log path with no code changes; see acceptance criterion 6.)

## Related tasks

- [docs/product/move-log-persistence/move-log-persistence-and-resumable-history.md](../move-log-persistence/move-log-persistence-and-resumable-history.md)
  — replay machinery + the Android/iOS smoke results that motivated this story.
- [docs/product/klondike-card-accessibility/klondike-card-accessibility.md](../klondike-card-accessibility/klondike-card-accessibility.md)
  — a11y handles, iOS scrub-automation failure analysis (agent-device limitation).
- `docs/delivery/20/20-6.md` — the historical Appium scrub suite (proof the W3C
  recipe activates this app's RNGH pan on iOS).
- Concurrent: demo-sheet cleanup by another agent (coordination constraint above).

## Simplification ideas

- **No WebDriver client library.** The script is ~150 lines of `fetch` against
  4 endpoints (create session, find element, rect, actions, delete session) —
  same protocol the historical curl workflow used. A wdio/Python client would add
  a dependency tree for zero capability.
- **No new fixtures.** The mid-game state derives from the already-generated
  solver playlist; the validating fold makes it self-checking.
- **No new demo runner.** The injection is a pure fold + one `HYDRATE_STATE`,
  reusing `resetDemoRuntimeState`/`clearGameState` plumbing that every other demo
  branch already calls.
- **Don't fix iOS blocker 1 (track node invisible at rest) in this story.** The
  geometry fallback (padding 40, formula below) plus deterministic anchor values
  from deliverable 2 make the drag computable without reading the track.
  Mirroring `position N of M` into the Undo button's `accessibilityValue` stays a
  cheap follow-up if we ever want tree-readable positions at rest on iOS.
- Scrub math cheat sheet for the script (from `useUndoScrubber.ts` +
  `UndoScrubber.tsx` comments): track spans
  `[safeAreaLeft + 40, windowWidth − safeAreaRight − 40]`; press anchors the
  current index N at `fingerStartX`; target X for index `t < N`:
  `x = fingerStartX − ((N − t) / N) · (fingerStartX − trackLeft)`; mirror with
  `trackRight` and `(M − N)` for `t > N`. Keep vertical drift < 100 px
  (failOffsetY), ≥ 5 px horizontal to activate.

## Steps to implement

Instructions for the implementation sub-agent: read this whole doc first
(especially the coordination constraint); update step statuses as you go — never
skip that. Parts A and B are independent; do them in any order, but re-read the
live sheet/launcher code immediately before B3/B4.

### Part A — iOS scrub drag via Appium (no app code changes)

- [x] **A1. Preflight tooling.** DONE 2026-07-06: already installed globally —
  `appium 3.1.2`, `xcuitest` driver `10.9.2`, Node `v25.9.0`. No install needed.
  Versions recorded in the appium.md refresh section.
- [x] **A2. `scripts/ios-scrub.js`** DONE 2026-07-06 (implemented as specified
  below; `--to max` accepts the literal string `max`; smoke-tested arg
  validation and the no-server help path — full drag validation is A3).
  Spec: plain Node CJS matching existing
  scripts. CLI: `--to <index>` (required), `--from <index>` and `--max <index>`
  (required unless `--to` is `0` or `max`, see plan Summary), optional
  `--udid` (default: parse `xcrun simctl list devices booted`), `--bundle-id`
  (default `ch.karimattia.soli`), `--port` (default 4723), `--duration-ms`
  (default 1500), `--keep-session`. Flow:
  1. Preflight `GET /status`; on connection refused print install/start help
     (`npm i -g appium`, `appium driver install xcuitest`, `appium`) and exit 1.
  2. Create session: `platformName: iOS`, `appium:automationName: XCUITest`,
     `appium:udid`, `appium:bundleId`, `appium:noReset: true`,
     `appium:newCommandTimeout: 120`. (Add a comment: first session per boot
     compiles WDA, ~1 min.)
  3. Find Undo by accessibility id `undo` → element rect → press point =
     center. `GET /window/rect` for width. Compute trackLeft/trackRight via the
     padding-40 fallback (safe-area insets: read from `mobile: deviceScreenInfo`
     if cheap, else assume 0 horizontal on iPhone portrait — comment the
     assumption).
  4. Compute target X with the anchor formula (Simplification ideas). Clamp to
     track bounds.
  5. `POST /actions`: pointerMove(0, center) → pointerDown → pause 200 →
     3–5 paced pointerMove segments to target X (y constant) over
     `--duration-ms` → pause 120 → pointerUp. (Segments matter: one long move
     is what agent-device effectively sends and it fails.)
  6. Delete session unless `--keep-session`.
  7. Fallback path (flag `--velocity-fallback`): `POST /execute/sync` with
     `mobile: dragFromToWithVelocity` (`pressDuration: 0.3, holdDuration: 0.1,
     velocity: ~200`, from center to target X) — WDA's native
     `pressAndDragWithVelocity`.
- [x] **A3. Live validation on the simulator** DONE 2026-07-06: no rebuild
  needed (JS-only change; existing debug build + running Metro picked it up on
  relaunch). Used the scrubbed demo fixture instead of manual stock taps. The
  drag worked on the FIRST attempt with default parameters (hold 200 ms +
  4 paced segments over 1500 ms); landings at --to 20, --to 0 and --to max were
  all EXACT (no ±1). No simulatorTracePointer or velocity fallback needed.
  Recipe recorded in the appium.md guide ("Live-verified recipe" section).
- [x] **A4. Update `docs/external-package-guides/appium.md`** DONE 2026-07-06:
  added "Live-verified recipe" subsection (exact parameters, timings, landing
  accuracy, working agent-device serialization procedure, observed geometry).
- [x] **A5. AGENTS.md snippet.** DONE 2026-07-06: one line added to the
  Testing → Commands list (start `appium`, run `scripts/ios-scrub.js`,
  serialize with agent-device, pointer to the guide).

### Part B — "Far game, scrubbed to middle" demo entry

- [x] **B1. Pure builder** DONE 2026-07-06 (`createScrubbedMidGameState` +
  `SCRUBBED_DEMO_STEPS = 80` / `SCRUBBED_DEMO_SCRUB_INDEX = 40` in
  `demoReplay.ts`; imports `getDemoAutoSolvePlaylist` from `../data` — no
  runtime cycle since `demoAutoSolvePlaylist.ts` only imports types from
  `demoReplay.ts`). Spec:
  `createScrubbedMidGameState(options?: { steps?: number; scrubIndex?: number })`
  with defaults `steps = 80`, `scrubIndex = 40` as named constants. Uses playlist
  entry `[0]` (`default-0-draw-1`); fold via `applyDemoReplayMoveForValidation`
  (throws on drift — comment why: fixture must fail loudly if the generated
  playlist changes); then one `klondikeReducer(state, { type: 'SCRUB_TO_INDEX',
  index: scrubIndex })`. Comment the determinism guarantee and that the real
  `exactId` + populated `moveLog` make the state persistence-replayable
  (acceptance criterion 6).
- [x] **B2. Launcher mode** DONE 2026-07-06 (file re-read before editing; the
  launcher still matched the plan's shape — all named helpers existed as
  planned). Spec: extend `DemoLaunchMode` with `'scrubbed'`.
  Branch in `handleLaunchDemoGame`: `recordCurrentGameResult()` +
  `resetDemoRuntimeState()` (existing shared preamble), `clearPlaylistTimers()`,
  `demoPlaybackActiveRef.current = false`, build state via B1 (try/catch →
  `devLog('error', …)` on fixture drift), `dispatch({ type: 'HYDRATE_STATE',
  state, autoUpEnabled: false })`, `void clearGameState()` (same pattern as the
  other branches — the debounced save then persists the hydrated state).
- [x] **B3. Deep link** DONE 2026-07-06: in `processDemoLink`, `demo=scrubbed` →
  `handleLaunchDemoGame({ demoMode: 'scrubbed', force: true })` (added
  `demoRequestsScrubbed` to the entry condition so `soli://?demo=scrubbed`
  works too, and an early-return branch inside the handler).
- [x] **B4. Sheet button** DONE 2026-07-06: sheet was stable (not mid-refactor);
  added exactly ONE button "Mid-game, scrubbed to middle" →
  `onSelect({ demoMode: 'scrubbed' })` after the "20 generated games" button.
  Nothing else in the sheet changed.
- [x] **B5. Unit tests** DONE 2026-07-06
  (`test/unit/solitaire/demoReplay.scrubbed.test.ts`, 4 tests, all green).
  Pinned cards for device tests: top of waste = **Six of hearts** (stock 10,
  waste 10); tableau tops left→right = 7♦, 2♦, 2♠, 7♥, 5♣, 9♣, Q♣ (all face
  up); after redo to index 80 the top of waste = **Ten of hearts**. Spec:
  builder returns `history.length === 40`,
  `future.length === 40`, `moveCount === 80`, `autoUpEnabled === false`,
  `exactId === playlist[0].exactId`; determinism (two calls → equal board
  signatures — reuse `boardSignature` from `gamePersistence.ts`); pin the exact
  top-of-waste / a couple of tableau-top cards so device tests can copy the
  expected labels from the test file; redo works (`SCRUB_TO_INDEX` to 80 restores
  the fold's final board).
- [x] **B6. Cheap gates** DONE 2026-07-06: `yarn typecheck && yarn lint &&
  yarn jest` all green (23 suites / 184 tests), `yarn format` run (repo-wide
  script; no reformat fallout).

### Part C — Device verification (one platform at a time, never parallel builds)

- [x] **C1. iOS smoke** DONE 2026-07-06 — ALL PASSED (no rebuild; existing
  debug build + Metro, app relaunch picked up the JS). Evidence in
  `.test-artifacts/scrubber-test-automation/` (7 screenshots). Sequence:
  1. Sheet entry (Demo → "Mid-game, scrubbed to middle"): board = pinned
     index-40 fixture (MOVES 80, Stock 10, Waste Six of hearts, tableau tops
     7♦ 2♦ 2♠ 7♥ 5♣ 9♣ Q♣). ✓
  2. Deep link `soli://demo-game?demo=scrubbed`: launches the same fixture.
     Caveat: expo-router shows the +not-found screen ("Oops!") because
     /demo-game has no route — the launch still fires; one tap "Go to home
     screen!" shows the correct board. ✓
  3. `ios-scrub.js --from 40 --max 80 --to 20` → EXACT: Stock 7, Waste Two of
     spades (= fold index 20). ✓
  4. `--from 20 --max 80 --to 0` → EXACT: Stock 24, initial-deal tableau tops
     (8♠ 2♦ 4♠ 7♦ 6♦ 9♣ Q♣). ✓  `--to max` → EXACT: Waste Ten of hearts,
     Stock 13, ♥ foundation Two of hearts, col 2 empty (= fold index 80). ✓
  5. Kill + relaunch at index 80 → restored exactly (move-log replay). ✓
  6. Tap `undo` (testID) once → index 79: Waste Six of clubs, col 1 top back to
     Seven of diamonds. Exactly one step. ✓
- [x] **C2. Android smoke** DONE 2026-07-06 (physical device A065, release
  build installed 18:57; run split across two sessions by a wireless-adb
  dropout — see learnings). All checks PASSED:
  1. Build+install: `yarn release`, 36 s incremental, exit 0, install/launch
     confirmed via `pm dump` + topResumedActivity. ✓
  2. Deep link `soli://demo-game?demo=scrubbed`: fires the launcher but shows
     the same +not-found router screen as iOS; one tap "Go to home screen!"
     reveals the correct board. The root form `soli://?demo=scrubbed` goes
     STRAIGHT to the board (no detour) — preferred for automation. Fire it
     into a cold app (`am force-stop` first): into a warm app with a stale
     demo-playlist run the scrubbed hydrate got overwritten by the playlist's
     next game. ✓
  3. Pinned index-40 assertions via `snapshot -i` labels: `Stock, 10 cards`,
     `Waste, Six of hearts`, tableau tops `Seven of diamonds, column 1` /
     `Two of diamonds, column 2` / `Two of spades, column 3` / `Seven of
     hearts, column 4` / `Five of clubs, column 5` / `Nine of clubs, column 6`
     / `Queen of clubs, column 7`, MOVES = 80, `Clubs foundation, Ace of
     clubs`. ✓
  4. FAILED-ASSUMPTION — the track readout `Undo scrubber, position 40 of 80`
     does NOT surface at rest on Android (snapshot -i / --raw / --json
     --force-full / find / is visible all miss it; same opacity-0 exclusion as
     iOS — see learnings). Landings asserted via card labels + MOVES instead.
  5. Pan-drag regression guard: `gesture pan 801 2150 -339 0 1500` (Undo
     button center, anchor formula with trackLeft = 40 dp × 2.625 px/dp ≈
     105 px) landed EXACTLY on index 20: `Stock, 7 cards`, `Waste, Two of
     spades`, MOVES 80 (= fold reference). ✓
  6. Tap-undo once (`press 'id="undo"'`) → exactly index 19: `Stock, 8 cards`,
     `Waste, Nine of diamonds` (= fold reference). ✓
  7. Kill (`am force-stop`) + plain relaunch (no deep link) → restored the
     exact index-19 board with MOVES 80 (move-log replay incl. the pan-scrub
     and tap-undo). ✓
- [x] **C3. Update this doc** — DONE 2026-07-06 for the iOS pass (statuses,
  evidence, learnings below). Re-update after C2 (Android).

## Plan: Files to modify

| File | Change | Part |
|---|---|---|
| `scripts/ios-scrub.js` | NEW — Appium W3C-actions scrub helper | A |
| `docs/external-package-guides/appium.md` | refreshed 2026-07-06 (planning); confirm after live run | A |
| `AGENTS.md` | one Testing-section line for the iOS scrub workflow | A |
| `src/solitaire/demoReplay.ts` | NEW pure `createScrubbedMidGameState` + constants | B |
| `src/features/klondike/hooks/useDemoGameLauncher.ts` | `'scrubbed'` mode branch + deep-link param (**re-read before editing**) | B |
| `app/(tabs)/index.tsx` | ONE sheet button (**re-read before editing; adapt to cleanup**) | B |
| `test/unit/solitaire/demoReplay.scrubbed.test.ts` | NEW unit tests | B |

## Files actually modified

Implementation pass 2026-07-06 (A1, A2, B1–B6):

| File | Change |
|---|---|
| `scripts/ios-scrub.js` | NEW — Appium W3C-actions scrub helper (plain Node CJS, zero deps) |
| `docs/external-package-guides/appium.md` | added verified tool versions (appium 3.1.2, xcuitest 10.9.2, Node v25.9.0) + script pointer |
| `src/solitaire/demoReplay.ts` | NEW `createScrubbedMidGameState` + `SCRUBBED_DEMO_STEPS`/`SCRUBBED_DEMO_SCRUB_INDEX` |
| `src/features/klondike/hooks/useDemoGameLauncher.ts` | `'scrubbed'` in `DemoLaunchMode`, scrubbed branch in `handleLaunchDemoGame`, `demo=scrubbed` deep link |
| `app/(tabs)/index.tsx` | ONE sheet button "Mid-game, scrubbed to middle" |
| `test/unit/solitaire/demoReplay.scrubbed.test.ts` | NEW — 4 tests (depths, determinism, pinned cards, redo-to-80) |

C1 device pass 2026-07-06 (A3–A5, C1, C3):

| File | Change |
|---|---|
| `docs/external-package-guides/appium.md` | "Live-verified recipe" subsection (A4) |
| `AGENTS.md` | one Commands line: iOS scrub drag via appium + `scripts/ios-scrub.js` (A5) |
| this file | statuses/evidence/learnings (C3) |

## Intermediary learnings

Planning-time facts (2026-07-06, verified in code/docs):

- **Appium already worked for this exact gesture on this app**: task 20-6
  (Dec 2025) ran a 20-case scrub suite via raw WebDriver W3C pointer actions
  (`pause 200ms` + 2000 ms `pointerMove` segments — see the "Long Scrub Action"
  snippet in the appium.md guide). The old sessions targeted Expo Go
  (`host.exp.Exponent`); today's dev build is `ch.karimattia.soli`.
- **Why agent-device fails on iOS**: its telemetry shows every pan/swipe
  synthesized as a single ~300 ms swipe regardless of requested duration — no
  hold phase, no paced move events, so RNGH Pan (minDistance 5) never activates.
  This is a tool limitation, not an app bug (taps work; Android pans work).
- **XCUITest input nuances** (Appium docs): a pointer must be depressed > 500 ms
  to register a *long* press — for a pan we deliberately hold only ~200 ms then
  move slowly; `appium:simulatorTracePointer` visualizes the synthesized finger
  for debugging; deprecated JSONWP TouchActions are removed since driver v7 —
  W3C actions only.
- **`mobile: dragFromToWithVelocity`** (WDA `pressAndDragWithVelocity`,
  `pressDuration`/`holdDuration` in seconds, `velocity` px/s) is the
  velocity-controlled native fallback if raw W3C pacing ever fails.
- **Playlist entry sizes**: `default-0-draw-1` = 244 primitive steps (145 draws /
  99 moves) for a 94-primitive-move lonelybot solution; entries 1/2 similar. An
  80-step prefix is safely mid-solution.
- **`scrubToIndex` mechanics** (`klondike.ts` ~704): timeline =
  `[...history, snapshotFromState(state), ...future]`; landing at index j gives
  `history = timeline[0..j)`, `future = timeline(j..]`; `moveCount` preserved;
  live-only state (timer, moveLog, autoUp) untouched by construction.
- **The fold populates `moveLog` for free** (reducer appends on every
  DRAW/APPLY_MOVE/SCRUB), and the state carries a real `exactId` with
  `revealInitialWaste: false` recorded on the state — so the persisted payload
  replays after restart with full depths. The old handcrafted demo board's
  snapshot-fallback caveat does NOT apply here.
- **iOS track node invisibility at rest** (opacity-0 overlay excluded by
  XCUITest) applies to Appium too (same XCUITest source of truth) — hence the
  script takes `--from`/`--max` as arguments instead of reading the tree; the
  deterministic demo state supplies them (40/80).

Implementation-time learnings (2026-07-06):

- **No deviations from planned names**: `applyDemoReplayMoveForValidation`,
  `createDemoReplayGameState`, `HYDRATE_STATE`, `SCRUB_TO_INDEX`,
  `resetDemoRuntimeState`, `clearPlaylistTimers`, `clearGameState` all exist
  exactly as the plan assumed; the launcher had not been reshaped by the
  concurrent cleanup in a way that affected B2–B4 (sheet still the simple
  5-button `DemoChoiceSheet`).
- **Appium tooling was already installed** (appium 3.1.2 global, xcuitest
  10.9.2) — A1 was a pure verification, no install.
- **Fixture facts** (from the fold, pinned in the unit test): at index 40 —
  stock 10, waste 10 with **Six of hearts** on top, tableau tops 7♦ 2♦ 2♠ 7♥
  5♣ 9♣ Q♣ (all face up); `moveLog` length 81 (80 actions + 1 coalesced scrub
  entry `{k:'scrub', i:40}`); after `SCRUB_TO_INDEX` 80 the waste top is
  **Ten of hearts**. Board signature identical across calls.
- **Import direction**: `demoReplay.ts` now imports `getDemoAutoSolvePlaylist`
  from `../data/demoAutoSolvePlaylist`. Safe (no runtime cycle) because that
  module imports only *types* from `demoReplay.ts`.
- The scrubbed HYDRATE dispatch intentionally skips the playlist's
  `waitForPlaylistState` hydration polling — nothing runs after the dispatch,
  so there is no race to guard.

Device-validation learnings (2026-07-06, C1 iOS run):

- **The default W3C recipe just works** — 200 ms hold + 4 equal pointerMove
  segments over 1500 ms activated the RNGH pan on the first try, and all three
  landings (40→20, →0, →max) were EXACT despite ~4 pt/index density. The ±1
  mitigation (Follow-up: mirror position into accessibilityValue) is not needed
  for now.
- **Fold boards for more assert targets** (from the fixture, indices beyond the
  unit-test pins): index 0 = stock 24, tops 8♠ 2♦ 4♠ 7♦ 6♦ 9♣ Q♣; index 19 =
  stock 8, waste 9♦; index 20 = stock 7, waste 2♠; index 79 = stock 13, waste
  6♣; index 80 = stock 13, waste 10♥, ♥-foundation 2♥, column 2 empty.
- **agent-device/Appium serialization procedure that worked**: `yarn
  agent-device close --session <name>` + kill idle `xcodebuild
  test-without-building … AgentDeviceRunner` before the Appium session;
  re-open agent-device after. Zero contention in 3 cycles. (agent-device now
  requires a named session when the default session is bound to Android:
  `--session ios-scrub`.)
- **Deep link routes to +not-found**: `soli://demo-game?demo=scrubbed` fires
  the launcher (state is correct) but expo-router shows the "Oops!" screen
  since no /demo-game route exists. For automation: openurl → tap "Go to home
  screen!" (or navigate home) → assert. Cosmetic; VERIFIED (2026-07-06,
  orchestrator, iOS simulator): the root form `soli://?demo=scrubbed` lands
  directly on the scrubbed game screen with NO +not-found detour — **prefer the
  root form in all automation** (screenshot:
  .test-artifacts/scrubber-test-automation/root-deeplink-check.png).
- **No rebuild needed for JS-only changes**: existing debug build + running
  Metro; `xcrun simctl terminate` + `launch` picked up the new bundle.
- WDA first session per boot ≈ 40 s, later sessions ≈ 4–5 s; a full
  close-agent-device → drag → reopen cycle ≈ 15 s after warmup.

Device-validation learnings (2026-07-06, C2 Android partial run):

- **The scrubber track node does NOT surface at rest on Android** (agent-device
  0.18.3, release build, physical A065). `snapshot -i`, `snapshot --raw`,
  `snapshot --json --force-full`, `find "Undo scrubber"`, and `is visible
  'id="undo-scrubber-track"'` all miss it while the overlay is idle — the same
  opacity-0 overlay exclusion as iOS. The earlier "Android surfaces the track"
  belief (pointerEvents="none" watchpoint from the a11y story) does not hold
  for the *idle* overlay; it likely only surfaces mid-drag, which agent-device
  cannot snapshot (session commands are serial). Consequence for tests: on
  Android too, assert scrub landings via board card labels + the MOVES counter,
  not the track readout. If tree-readable positions at rest are wanted, do the
  existing follow-up (mirror `position N of M` into the Undo button's
  `accessibilityValue`) — that would fix both platforms at once.
- **Deep link behaves exactly like iOS on Android**: `adb shell am start -a
  android.intent.action.VIEW -d "soli://demo-game?demo=scrubbed"` fires the
  launcher (board state correct afterwards) but expo-router first shows the
  +not-found "Oops!" screen; one tap on "Go to home screen!" lands on the
  correct scrubbed board. Same cosmetic caveat, same workaround.
- **Wireless adb dropout can be terminal for an unattended run**: mid-session
  the device went `offline`, then disappeared from `adb mdns services`
  entirely (15+ min, polled with both the builtin and
  `ADB_MDNS_OPENSCREEN=1` backends, plus a direct `dns-sd -B
  _adb-tls-connect._tcp` browse). Unlike the earlier "screen locked" dropouts
  (recoverable via unlock script + re-connect), a non-advertising device is
  unrecoverable from the Mac — the unlock script itself needs adb. Only fix:
  Karim re-enables Wireless debugging on the phone. Consider USB or a
  `screen_off_timeout` bump *at session start* (600000 ms, restore after) for
  long Android runs — the release script already warns when the timeout
  is ≤ 30 s. After re-enabling, adb auto-reconnects via the mdns alias with
  no manual `adb connect` needed.

Device-validation learnings (2026-07-06, C2 Android completion run):

- **agent-device `gesture pan` on the Undo button still scrubs on Android**
  (regression guard passed) and is *accurate*: with the anchor formula from
  Simplification ideas (device 1080×2412 @ 420 dpi → 2.625 px/dp, trackLeft ≈
  40 dp × 2.625 ≈ 105 px, Undo center 801,2150), `gesture pan 801 2150 -339 0
  1500` targeting index 20 from anchor 40 landed EXACTLY on 20. No Appium
  needed on Android.
- **Fire the scrubbed deep link into a COLD app on Android.** Fired into a
  warm app that still had a stale demo-playlist run active (from an earlier
  session), the scrubbed board appeared briefly and was then overwritten by
  the playlist advancing to its next game (board showed the playlist HUD
  "Game 4/5"). `adb shell am force-stop ch.karimattia.soli` first, then the
  deep link → clean and reliable. Android sibling of the iOS "deep link into
  stale app session" watch item.
- **Root deep-link form verified on Android**: `soli://?demo=scrubbed` goes
  straight to the board, no +not-found detour (the C1 hypothesis, now
  confirmed; the `soli://demo-game?…` form detours on both platforms).
- **Persistence replays *post-scrub actions* too**: after pan-scrub to 20 and
  one tap-undo to 19, force-stop + plain relaunch restored the exact index-19
  board with MOVES 80 — the moveLog's coalesced scrub entries survive the
  round-trip, not just the fixture's initial 40/40 split.

## Identified issues

- **Two XCTest automation stacks (agent-device + Appium/WDA) on one simulator
  may contend** for testmanagerd/accessibility. Mitigation: serialize — run the
  Appium script only while no agent-device command is in flight; the script
  creates and deletes its session per invocation. If flakiness appears, quit the
  agent-device session first. Status: **verified 2026-07-06** — with the
  close-session + kill-idle-runner ordering (see learnings) there was zero
  contention across 3 drag cycles.
- **One-off "Maximum update depth exceeded" crash (2026-07-06, C1 run)**: after
  firing the scrubbed deep link twice into a stale app session (app had been
  running through several earlier test rounds; first link fired while the
  +not-found screen covered the game, an unexplained "[Game] New game dealt
  (manual)" appeared, then the second link crashed TabOneScreen with an
  infinite setState loop at the `navigation.setOptions` useLayoutEffect —
  sessionControls identity churn). Did NOT reproduce after an app relaunch:
  sheet entry, deep link, and deep-link-refire-while-game-focused all clean.
  Status: open/watch — likely a pre-existing controls-identity feedback loop
  (KlondikeGameSession's onControlsChange effect) that the double-hydrate
  exposed, not specific to the scrubbed fixture. Worth a look if it recurs.
- **Safe-area insets on notched iPhones in landscape** would shift the geometry
  fallback (script assumes horizontal insets 0 in portrait). Tests run portrait;
  comment the assumption. Status: accepted.
- **Rounding at high timeline density**: with M = 80 on a ~320 pt track, one
  index ≈ 4 pt of finger travel — landing ±1 off target is plausible. Mitigation:
  assert on the scripted landing index via labels and allow the test to correct
  with a tap-undo/redo step, or scrub to generously separated indices (0, 20, 40,
  60, 80). Status: open, calibrate in A3.
- **Fixture drift if the playlist is regenerated**: the validating fold throws,
  unit test fails loudly. Status: mitigated by design.

## Testing

1. **Cheap gates first**: `yarn typecheck && yarn lint && yarn jest` (new
   builder tests included).
2. **iOS (Part C1)**: deep-link into the scrubbed state → assert pinned labels →
   `scripts/ios-scrub.js --from 40 --max 80 --to 20` → assert step-20 board via
   agent-device labels → `--to 0` (full left) → assert initial-deal labels →
   `--to 80` via full-right → assert the fold's final board. Evidence
   screenshots to `.test-artifacts/scrubber-test-automation/`.
   **RESULT 2026-07-06: ALL PASSED, all landings exact** (screenshots 01–07:
   sheet entry, deep link, →20, →0, →max, relaunch-restore, undo-once; see C1
   step for per-assert detail).
3. **Android (Part C2)**: launch scrubbed entry; `snapshot` shows
   `Undo scrubber, position 40 of 80`; agent-device `gesture pan` on Undo still
   scrubs (regression guard). No Appium needed on Android.
   **RESULT 2026-07-06: ALL PASSED** (completed in a second session after the
   wireless-adb dropout) — deep link + ALL pinned index-40 label assertions,
   pan-drag landing EXACTLY on index 20 (Stock 7, Waste Two of spades), one
   tap-undo → exactly index 19 (Stock 8, Waste Nine of diamonds), force-stop +
   relaunch → index-19 board restored with MOVES 80. Track readout at rest NOT
   visible on Android after all (assumption corrected, see learnings) —
   landings asserted via card labels + MOVES. Screenshots
   `android-01`…`android-08` in `.test-artifacts/scrubber-test-automation/`.
4. **Persistence bonus check** (iOS, cheap): kill + relaunch on the scrubbed
   state → depths restored (guard `{40, 40}` in the payload).
   **RESULT 2026-07-06: PASSED** at index 80 (kill + relaunch restored the
   exact board; the subsequent single tap-undo stepping to the exact index-79
   board proves history depth survived the restart).

## Follow-ups

- **Mirror `position N of M` into the Undo button's `accessibilityValue`**
  (one-liner-ish): would make the resting position tree-readable on iOS and let
  the script verify its landing without deterministic-state knowledge. Pro:
  self-verifying scrubs anywhere; Con: label churn per move on the a11y node.
  Recommendation: do it only if A3 shows ±1 landing errors are common.
- **CI-ify the Appium scrub** as a scheduled smoke. Pro: standing regression
  net; Con: simulator + WDA in CI is heavy for a solo project. Recommendation:
  not now.
- **Parametrize the demo entry** (choose deal/depth from the sheet). Pro:
  flexible; Con: gold plating — one deterministic state serves the testing goal.
  Recommendation: skip until a concrete test needs it.
