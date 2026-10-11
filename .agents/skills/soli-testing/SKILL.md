---
name: soli-testing
description: On-device testing cookbook for the Soli app — build/run commands (yarn release, yarn ios), demo deep links, mid-game fixtures, state resets and the phone-data guardrail, a11y handles and testIDs for driving the board, Appium scrub for iOS, log streaming, and troubleshooting. Use whenever building, installing, or testing Soli on a device or simulator.
---

# Soli on-device testing cookbook

Single source of truth for testing Soli on devices/simulators. Package/bundle id everywhere: `ch.karimattia.soli`.

## 1. Decision tree

1. **Cheap gates first, always**: `yarn typecheck && yarn lint && yarn jest`.
2. **Platform — Android FIRST when the phone is available** (connected, not owned by another agent session), then iOS. If Android surfaces issues, STOP and report to the orchestrator before the iOS pass — fix first, re-test once.
   - **Android physical phone (`yarn release`)**: drive by a11y labels; native pan works (scrubber needs no Appium). It is Karim's MAIN phone — data guardrail in section 4.
   - **iOS simulator (`yarn ios`)**: drive by testIDs; zero risk, full wipes allowed (`xcrun simctl uninstall`). Use alone when the phone is unavailable or the test needs destructive resets.
   - Web: not a target (native-only app).
3. **Fixture**: fresh deal = default launch (`soli:///`) · full stress = auto-solve playlist (`yarn release/ios --auto-solve` after code changes: builds + monitors logs with pass/fail exit; `yarn deeplink 'soli:///?demo=playlist&games=N'` when the installed build is current — no rebuild, watch logs yourself) · undo/redo/scrubber = `yarn scrubtest` · real win + celebration = `yarn nearwin` (play the last move(s) manually) · **warnings / rewind-to-winnable = `yarn unwinnable` or `yarn stuck`** — pick by the WARNING MODE you need: `yarn stuck` for the DEFAULT `noUsefulMoves` mode (stock empty + no useful move — what players actually see), `yarn unwinnable` for the solver-only `unwinnable` mode (lost but moves remain). Never play deals until one dies — that takes minutes and is not reproducible · specific-deal repro = `?deal=<exactId>` · history/stats = `yarn seedhistory`.

## 2. Build & run

Both commands are self-contained: they kill competing builds (sparing idle Gradle daemons and Metro), mutually exclude via `/tmp/soli-build.lock` (pid file; stale locks auto-clear), verify the install, launch the app, and exit — **no manual pgrep/kill or `adb devices` checks needed**. Trust the lock + process list over stale terminal-file metadata. Full build logs: `.test-artifacts/builds/` (path printed on failure with a tail).

- **Android (physical phone, Release APK)**: `yarn release` — wireless adb discovery + signing patch + pin to `<ip>:5555` + wake/unlock all automatic; physical devices only, never an emulator; single-ABI arm64-v8a. Several adb devices connected (e.g. the Mi MIX): `ADB_WIFI_TARGET=<ip:5555> yarn release`; `android-ready.sh`/raw adb want `ANDROID_SERIAL=<serial>` instead.
- **iOS (simulator, Release)**: `yarn ios` — simulator pick: booted > `SOLI_IOS_SIMULATOR=<name>` > newest iPhone (boots it if needed). Incremental by default; clean build (delete `ios/`) only after native dependency changes — that INCLUDES a new local Expo module in `modules/` (incremental `expo run:ios` does NOT re-run pod install for it, and a stale `ios/` also pins an old buildNumber → install verification fails). `--debug`: Debug config with Metro attached, lingers on purpose (manual dev; rerun plain `yarn ios` to restore Release; excludes the flags below).
- Shared flags: `--logs` streams `[SoliDev]`-filtered output until Ctrl+C · `--auto-solve` builds + runs the demo playlist with a pass/fail exit (`DEMO_GAME_LIMIT=N` limits games, max 20).
- **Never start two builds in parallel** — the machine can't handle it; the lock fails the second fast anyway.

## 3. Demo deep-link catalog

Parsed by `processDemoLink()` in `src/features/klondike/hooks/useDemoGameLauncher.ts`. Every demo deep link auto-enables developer mode (which turns `[SoliDev]` logging on) — and puts a "Demo" button in the game header. For clean store-style screenshots, add **`&screenshot=1`** to any catalog link (or pass `--screenshot` to the wrapper): the link behaves as usual but forces developer mode OFF instead of ON — no Demo button, no celebration debug badge, no Settings toggling needed. Trade-off: dev mode also gates `[SoliDev]` logging, so screenshot-mode links log nothing.

| URL | Effect / when to use |
|---|---|
| `soli:///?demo=playlist&games=N` | Auto-solve playlist, N games (clamped to 20); `demo=autosolve&games=1` for a single game |
| `soli://?demo=scrubbed` | **Scrubbed mid-game fixture**: deterministic board, 80 moves scrubbed to index 40 → 40 undos + 40 redos, Auto Up off. `&steps=S&scrub=K` for other depths (clamped; defaults keep the pinned card labels valid) |
| `soli://?demo=nearwin&left=N` | **Near-win fixture**: solution replayed to N moves before completion (default 1), Auto Up off — finish manually for a REAL win + celebration |
| `soli://?demo=stuck` | **Stuck fixture** — trips the DEFAULT `noUsefulMoves` WARNING MODE, i.e. what players actually see: playlist entry 19 (`default-20-draw-1`) replayed 210 solution steps, then four killing moves, Auto Up off. Satisfies the shipped predicate exactly (`stock.length === 0 && !hasUsefulMove`) AND is solver-proven `unsolvable`, with the position four moves earlier `solved` — boundary at timeline index 210 of a 215-index timeline (214 moves played). Legal moves DO remain (king shuffles, recycle); "no useful moves" is the shipped semantics, not "no legal moves". Use with `?set=warnings:stuck,rewind:on` (or just the defaults) |
| `soli://?demo=unwinnable` (alias `deadend`) | **Unwinnable fixture** — trips the `unwinnable` WARNING MODE: same deal replayed 81 solution steps, then one killing move (K♠ into the only empty column), Auto Up off. Solver-PROVEN `unsolvable`, and `solved` one move earlier, so a real rewind boundary sits at timeline index 81 (82 moves played). **Lost but NOT stuck** — moves remain legal, so the DEFAULT warning mode stays silent here. Parameterless — the pinned verdicts are the whole point. Pair with `?set=warnings:unwinnable,rewind:on`; the warning fires ~600 ms after load |
| `soli://?deal=<exactId>&draw=N` | New game from an exact deal id (`E1_...`) — bug repro, hand-crafted scenarios. `draw` optional; invalid id devLogged + ignored |
| `soli://?set=drawCount:3,autoUp:off,solvableOnly:on,warnings:stuck,hintButton:on,rewind:on` | Apply settings without UI taps (`drawCount` 1–5; booleans on/off: `autoUp`, `solvableOnly`, `hintButton`, `rewind`; `warnings:off\|stuck\|unwinnable` = warning-mode select [stuck = "no more useful moves", the default]. Aliases: `hints` → `hintButton`, `rewindToWinnable` → `rewind`; round-2 `stuckWarning`/`unwinnableWarning:on\|off` map into the select without downgrading a stronger mode). Unknown pairs devLogged + skipped, rest applies |
| `soli://?set=warnings:unwinnable,rewind:on` | **Rewind to last winnable move** in one link: `rewind` alone does nothing visible — the action only appears while a warning is outstanding, so the warning mode must be on too. Default OFF. Then `yarn unwinnable` for a board that is already provably lost (or `yarn stuck` with the default `warnings:stuck` mode) |
| `soli://?reset=undoHint` / `?reset=game` | Targeted resets, section 4 |
| `soli://?celebration=<modeId\|random>` | Celebration overlay on the current board WITHOUT winning (note below). With `&screenshot=1` the header shows synthetic MOVES/TIME; `&moves=N&time=SECONDS` overrides them |
| `soli://demo-game` | Old handcrafted demo (rarely useful — no undo history) |
| `soli://?seedHistory=default` / `=clear` | Seed / clear history rows, section 4 |

`recordHistory=false` (alias `history`) disables reducer history snapshots on playlist runs. `screenshot=1` (accepts `1`/`true`/`on`) combines with ANY family: dev mode forced OFF, all dev UI suppressed (see above), and on `?celebration=` links the header gets plausible synthetic MOVES/TIME (celebration section below). One param family per link (the first matching family wins). During a screenshot session, EVERY link needs the flag — including cleanup links like `yarn seedhistory clear`, which otherwise re-enable dev mode and put the Demo button back.

Delivery — always use `yarn deeplink`. **Default target: the connected Android device**; falls back to a booted iOS simulator only when no adb device is connected. **Agents testing on the simulator must pass `--ios`** — the phone is usually connected, so the fallback WILL hit it. `--serial <s>` when several adb devices. On Android the wrapper self-heals: no device → it runs `scripts/android-ready.sh` (wireless reconnect) itself, then wakes + unlocks before delivering.

| Shortcut | Delivers | Cold default |
|---|---|---|
| `yarn celebration [modeId]` | `?celebration=<modeId\|random>` | warm |
| `yarn scrubtest [steps] [scrub]` | `?demo=scrubbed[&steps=S&scrub=K]` | **cold** (a stale warm demo run would overwrite the fixture) |
| `yarn nearwin [left]` | `?demo=nearwin[&left=N]` | **cold** (same reason) |
| `yarn stuck` | `?demo=stuck` | **cold** (same reason) |
| `yarn unwinnable` (alias `yarn deadend`) | `?demo=unwinnable` | **cold** (same reason) |
| `yarn seedhistory [clear]` | `?seedHistory=default\|clear` | warm |
| `yarn deeplink '<soli:// url>'` | any raw catalog link | warm |

All four fixtures also have buttons in the in-app **Run Demo sheet** (header → Demo → FIXTURES): "Mid-game scrub", "Near win", "Unwinnable game", "No useful moves". The last two are labelled verbatim after the Settings warning-mode options, because which mode a fixture trips is the only thing that distinguishes them.

`--cold`/`--warm` override; `--no-retry` keeps the URL as-is (dedup applies; an existing `#fragment` also skips the nonce); `--screenshot` appends `screenshot=1` to any shortcut or raw URL (store-screenshot capture, e.g. `yarn celebration 39 --screenshot`).

Raw one-liners (reference only — the wrapper adds the `#retry-<nonce>` that defeats both dedup layers [Android intent dedup + in-app repeated-URL guard] and the cold force-stop; raw links need those by hand):

```bash
adb -s <serial> shell am start -W -a android.intent.action.VIEW -d 'soli://?demo=scrubbed' ch.karimattia.soli/.MainActivity
xcrun simctl openurl booted 'soli://?demo=scrubbed'
```

Caveats: `?set=` changes settings, but an in-progress game keeps the drawCount it was DEALT with — verify via the Settings screen or a fresh deal, not the current game's stock. The FIRST deep link on a freshly created simulator pops the iOS "Open in “Soli”?" alert — confirm once via agent-device; later links open silently.

### Celebration testing

`yarn celebration [modeId]` shows the full-deck celebration overlay immediately — no win needed, any board (synthesizes a 52-card won-board payload). Mode ids: stable ids in `src/animation/celebrationModes.ts` (`CELEBRATION_MODE_METADATA`); unknown id → devLogged + ignored. The preview runs in dev-hold: loops indefinitely, no new-game dialog; the bottom-right badge shows `Celebration NN · Name` — tap the badge to cycle modes, tap anywhere else to dismiss silently back to the untouched game. Different mode directly: re-fire the shortcut. For store shots use `yarn celebration <modeId> --screenshot`: no badge (dev mode stays off), the loop + tap-to-dismiss still work — cycling via badge tap obviously isn't available, re-fire per mode instead.

**Header MOVES/TIME in screenshot mode** (round 3): a preview never played a game, so the plain preview header reads `MOVES 0 / TIME 0:00` — fake-looking in store shots. `screenshot=1` celebration links therefore show **deterministic synthetic stats**, derived from the resolved mode id (120–180 moves, 4:00–7:00), frozen while the preview runs: mode 22 → 152/5:30 · 27 → 126/5:34 · 32 → 161/5:38 · 36 → 128/5:05 · 39 → 149/6:56 · 43 → 177/6:23 · 46 → 137/5:13. Same link ⇒ same pair on every re-fire and every device, so celebration shots are reproducible and no timer nudge / multi-minute wait is needed (that trick is still required for the scrubbed/nearwin FIXTURES — those are real games). Override per link: `yarn deeplink 'soli://?celebration=36&screenshot=1&moves=143&time=312' --ios` (`time` in seconds; the wrapper's `--screenshot` only appends the flag, so overrides need a raw URL). `&moves=/&time=` also switch the synthetic header on WITHOUT `screenshot=1` (dev inspection). Display-only: the numbers live on the celebration state (`src/features/klondike/celebrationPreviewStats.ts`), never in game state, persistence or history — a preview still records nothing.

## 4. State resets & seeding

- **Undo hint**: `soli://?reset=undoHint` (or Demo sheet → Testing → "Undo hint"). Sets a *testable* state — lifetime just past the lifetime gate + 3 hints remaining, so the first required undo streak shows hint 1 immediately. Schedule since v5 (2026-09-09): lifetime > 8, streaks **3/6/9** (was 50 and 10/20/30, which almost never fired) — so after the reset link, **3 undo taps in a row** show hint 1.
- **Game**: `soli://?reset=game` — New Game without the confirmation dialog (current game recorded as incomplete). Deliberately NO `?reset=all`: bulk destruction stays manual to protect real phone history.
- **Settings**: `soli://?set=...` (catalog above) — no UI taps before dealing test games.
- **History seeding**: `yarn seedhistory` inserts `seed-`-prefixed rows (solved/incomplete, varied draws/dates/durations); `yarn seedhistory clear` deletes ONLY those. Demo sheet has matching entries. Real history rows are never touched.

### Wiping Soli APP DATA on the physical phone: fine when needed, not routine

Scope first: only ever touch the Soli app's own data (`adb shell pm clear ch.karimattia.soli`, `adb uninstall ch.karimattia.soli`) — NEVER anything device-wide (it's Karim's MAIN phone). An app-data wipe destroys his real game history, which he values — allowed when a test genuinely needs it, not as a routine reset. Prefer, in order:

1. Seeded rows (`yarn seedhistory` / `clear`) — only `seed-` prefixed rows are ever touched.
2. The iOS simulator for anything needing a full wipe (`xcrun simctl uninstall booted ch.karimattia.soli`) — zero risk.
3. Targeted resets (`?reset=undoHint`, `?reset=game`) over broad ones.
4. Phone app-data wipe — only if none of the above produces the state you need.

## 5. Driving the app (a11y matrix)

The board exposes a full a11y tree — always prefer it over coordinate taps. Source of truth: `src/features/klondike/components/cards/accessibility.ts`.

**Interaction model: tap-to-move only. Cards CANNOT be dragged** — tap a card to select, tap the destination to move (agents have wasted whole sessions trying to drag).

| Target | Android handle (label/content-desc) | iOS handle (testID) |
|---|---|---|
| Tableau card | `Seven of hearts, column 3` (ranks spelled out, columns 1-based) | `card-hearts-7` (stable across deals) |
| Face-down card | `Face-down card, column N` | — |
| Stock | `Stock, 24 cards` / `Stock, empty` / `Recycle waste into stock` | `stock` / `stock-recycle` |
| Waste | `Waste, Ace of spades` | `waste` |
| Foundation | `Hearts foundation, empty` | `foundation-<suit>` (slot: `foundation-slot-<suit>`) |
| Empty column | `Column N, empty` | `tableau-column-N` |
| Undo button | — | `undo` |
| Undo-hint bubble | not queryable on Android | `undo-hint` |
| Scrubber track | invisible at rest (both platforms) | `undo-scrubber-track` (only while scrubbing) |
| Rewind pill | `Rewind to last winnable move` | `rewind-to-winnable` |
| Winnable marker on the track | read it off the track's label: `Undo scrubber, position N of M, last winnable move K` | `undo-scrubber-winnable-marker` (child of the accessible track, so assert via the track label) |

agent-device usage:

- Invoke as `yarn agent-device ...` (repo-pinned; not `npx`). `snapshot -i` dedupes identical labels; `snapshot --raw` counts face-down cards.
- **Phone asleep / wireless adb dropped / taps failing → `scripts/android-ready.sh`**: the same bounded discovery/reconnect as `yarn release` + pin to `<ip>:5555` + wake + unlock + state summary. `--keep-awake` for long sessions (raises screen-off timeout to 600 s, prints the restore command — run it when done). **NEVER hand-roll adb wake/reconnect loops.**
- Only ONE agent-device session may drive the phone at a time — the build lock does NOT cover device sessions. List/close stale sessions before starting (`yarn agent-device session list`; end the active session with `yarn agent-device close` — `session` itself only supports `list`/`state-dir`, there is no `session close`).
- **Cross-repo device lock** (the invent repo's agents share this phone): before driving the Android device, check `/tmp/android-device.lock` — if it exists and is < 60 min old and not yours, the device is TAKEN: wait or use the sole iOS simulator when it is free. While driving, create it with `soli:<agent>:<timestamp>`; remove it when done. `scripts/android-ready.sh` enforces this automatically (aborts when a fresh foreign lock exists; `ANDROID_LOCK_BYPASS=1` only when Karim says so).
- This Mac intentionally keeps exactly one iOS simulator for TESTING: `iPhone 17 Pro`. If `open` reports DEVICE_IN_USE, do not close another agent's session and do not create a throwaway simulator; wait for the owner or use the Android phone. This avoids ambiguous targets and duplicate simulator disk usage. Two extra sims exist ONLY for App Store screenshot capture and must not be deleted or used for testing: `ASC-65-1284` (iPhone 14 Plus → 1284x2778) and `ASC-65-1242` (iPhone 11 Pro Max → 1242x2688). Store-screenshot sizing, slots and capture flags live in `docs/product/store-screenshots/store-screenshots.md`.
- `yarn agent-device` disables the iOS runner's idle stop. Keep using normal `close`: it ends the logical session while retaining the healthy XCTest runner, avoiding an iOS 26.5 SpringBoard crash during XCTest teardown. Do not pass `close --shutdown` or manually kill its `xcodebuild` runner unless another XCTest tool (such as Appium) must take ownership; that forced handoff can still produce one Apple crash notification.
- Reuse one named agent-device session for the whole iOS testing assignment instead of opening and closing around each action. Pass the same `--session <name>` to every command, then close it once after the final verification.

Gotchas: agent-device `screenshot` costs ~2 s — for short-lived UI (hint rings auto-clear after 2.5 s), chain `adb -s <serial> exec-out screencap -p > file.png` right after the triggering press instead. To ASSERT a colored overlay (e.g. the amber hint ring, `COLOR_HINT` #FFB020) in a screenshot without eyeballing: `ffmpeg -i shot.png -vf "crop=<slot rect>,colorkey=0xFFB020:0.14:0.0,format=rgba,alphaextract,signalstats,metadata=print:key=lavfi.signalstats.YAVG" -f null -` → YAVG ≈255 clean, noticeably lower (~226 for a ring) when present — good for unattended loops like "follow draw hints until a move hint appears". Screenrecord frame numbers are VFR (encode-on-change): locate moments by content signals (luma spikes), never by frame arithmetic; a LOW unique-frame count itself proves a static screen (useful for animations-off checks). `uiautomator dump` fails on this app (the game timer never idles). Drawer tabs report off-screen coordinates on iOS until the drawer is OPEN — label selectors (`label=History`) fail with "not safe to click"; the reliable loop is tap the hamburger @ref → fresh `snapshot -i` → tap the tab's fresh @ref (refs go stale after every navigation). Don't use foundation/card taps as timer nudges — tap-to-move can auto-play cards (tap Undo+Redo or empty green instead).

## 6. Scrubber automation

Enter the deterministic fixture first: `yarn scrubtest` (index 40 of 80).

- **Android**: native pan via agent-device. Needs ≥ ~275 px horizontal travel; verify the landed index and retry (±1 jitter is normal).
- **iOS**: agent-device cannot pan (single ~300 ms swipe; the RNGH pan never activates). Use Appium only when scrubber coverage is necessary: close the agent-device session, explicitly release its retained `xcodebuild ... AgentDeviceRunner` process, start `appium` in a separate terminal, then `node scripts/ios-scrub.js --from 40 --max 80 --to 20` (also `--to 0`/`--to max`). Both tools are XCTest-based and must be serialized. Recreate the agent-device session afterwards; releasing XCTest may trigger the known iOS 26.5 SpringBoard teardown crash once.

## 7. Logs

- `[SoliDev]` logging (`devLog`) is gated on developer mode — OFF by default. Any demo deep link enables it (EXCEPT `screenshot=1` links, which force it off); otherwise expect silence.
- Android: `yarn release --logs`, or raw `adb -s <serial> logcat`. iOS: `yarn ios --logs` (JS console goes to the unified os_log stream, not the console-pty); if it shows nothing, trigger activity first (e.g. a demo deep link).
- Manual iOS stream: `xcrun simctl spawn <udid> log stream --level debug --predicate 'process == "Soli"' --style compact | rg --line-buffered 'SoliDev'` — **`--level debug` is required**, the default level drops the Info-level JS lines.

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| Empty Android a11y tree | Historically an overlay (Tamagui ToastViewport) swallowing the tree; check for full-screen overlays before blaming the board |
| adb "more than one device" | ALWAYS pass `-s <serial>`; kill stray emulators — release testing is physical-only |
| Device busy / taps do nothing | A stale agent-device session holds the device — list and close it |
| Screenshot suddenly shows a DIFFERENT app (or a pixel oracle goes out of family) | Another app stole the foreground mid-session (shared phone; the device lock only serializes agents, not notifications). STOP tapping, confirm via `dumpsys activity activities \| grep ResumedActivity`, recover with `adb shell am start -n ch.karimattia.soli/.MainActivity` (process usually survives, in-memory state intact), retake the interrupted steps |
| Wireless adb dropped / phone dozed | `scripts/android-ready.sh` (reconnect + pin + wake + unlock in one shot); never hand-roll loops |
| Terminal file says a build is running but nothing happens | Terminal metadata can be stale; trust `/tmp/soli-build.lock` and `ps` |
| Deep link seems ignored | You bypassed the wrapper — `yarn deeplink` adds the retry nonce + cold force-stop; raw links need `#retry-N` / manual force-stop |
| A `?set=` key "did not apply" | Check the log first: `[Demo] Settings link applied {...}` lists everything that parsed, `[Demo] Settings link: ignored unknown pair "<pair>"` everything that did not — that answers "did it parse?" without opening Settings. Then check you are not judging a key by an effect it does not have: `warnings:unwinnable` changes nothing visible until the solver proves the CURRENT position dead (use `yarn unwinnable`), and an in-progress game keeps the drawCount it was DEALT with. Third: a `?set=` link's write is async, so a cold fixture link fired immediately after (`yarn scrubtest`/`nearwin`/`unwinnable`/`stuck` force-stop by default) can drop it — settle a second, or send `?set=` first and verify before the fixture link |
| iOS sim deep links suddenly ALL dead (openurl silent, no alert, XCTest main-thread timeouts) | App process wedged — seen after `simctl uninstall`+`install`+`launch` over a running app. `xcrun simctl terminate <udid> ch.karimattia.soli && xcrun simctl launch ...` fixes it immediately; restart the app BEFORE debugging the links themselves |
| Signature mismatch on Android install | Check `SOLI_UPLOAD_*` in `.env` first — uninstalling wipes real history, last resort (section 4) |
| Gradle fails in ~1 s with "Could not start 'node'" | Stale Gradle daemon caching a dead env: `cd android && ./gradlew --stop`, rerun |
| iOS script phase fails: `<old Cellar path>/node: No such file or directory` | Gitignored `ios/.xcode.env.local` pins a brew-versioned node path that died on upgrade — set `NODE_BINARY=/opt/homebrew/bin/node` (stable symlink) |

## 9. Self-improvement

Mirror of the AGENTS.md rule: if any instruction here was wrong, stale, or caused friction, **UPDATE THIS SKILL immediately**. Keep it the current best practice: REPLACE outdated content in place — no dated changelog notes, no workarounds for states that no longer exist. History and rationale belong in the relevant plan doc under `docs/product/`. Stale or bloated content here costs every future agent a session.

## 10. Further reading

- `docs/external-package-guides/`: `appium.md` (iOS scrub recipe), `agent-device.md`, `expo-run-ios-and-simctl.md`
- `docs/product/`: `agent-testing-skill/` (history + rationale behind these recipes), `scrubber-test-automation/` (fixture + ios-scrub background), `klondike-card-accessibility/` (a11y handle design)
