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
3. **Fixture**: fresh deal = default launch (`soli:///`) · full stress = auto-solve playlist (`yarn release/ios --auto-solve` after code changes: builds + monitors logs with pass/fail exit; `yarn deeplink 'soli:///?demo=playlist&games=N'` when the installed build is current — no rebuild, watch logs yourself) · undo/redo/scrubber = `yarn scrubtest` · real win + celebration = `yarn nearwin` (play the last move(s) manually) · specific-deal repro = `?deal=<exactId>` · history/stats = `yarn seedhistory`.

## 2. Build & run

Both commands are self-contained: they kill competing builds (sparing idle Gradle daemons and Metro), mutually exclude via `/tmp/soli-build.lock` (pid file; stale locks auto-clear), verify the install, launch the app, and exit — **no manual pgrep/kill or `adb devices` checks needed**. Trust the lock + process list over stale terminal-file metadata. Full build logs: `.test-artifacts/builds/` (path printed on failure with a tail).

- **Android (physical phone, Release APK)**: `yarn release` — wireless adb discovery + signing patch + pin to `<ip>:5555` + wake/unlock all automatic; physical devices only, never an emulator; single-ABI arm64-v8a.
- **iOS (simulator, Release)**: `yarn ios` — simulator pick: booted > `SOLI_IOS_SIMULATOR=<name>` > newest iPhone (boots it if needed). Incremental by default; clean build (delete `ios/`) only after native dependency changes. `--debug`: Debug config with Metro attached, lingers on purpose (manual dev; rerun plain `yarn ios` to restore Release; excludes the flags below).
- Shared flags: `--logs` streams `[SoliDev]`-filtered output until Ctrl+C · `--auto-solve` builds + runs the demo playlist with a pass/fail exit (`DEMO_GAME_LIMIT=N` limits games, max 20).
- **Never start two builds in parallel** — the machine can't handle it; the lock fails the second fast anyway.

## 3. Demo deep-link catalog

Parsed by `processDemoLink()` in `src/features/klondike/hooks/useDemoGameLauncher.ts`. Every demo deep link auto-enables developer mode (which turns `[SoliDev]` logging on).

| URL | Effect / when to use |
|---|---|
| `soli:///?demo=playlist&games=N` | Auto-solve playlist, N games (clamped to 20); `demo=autosolve&games=1` for a single game |
| `soli://?demo=scrubbed` | **Scrubbed mid-game fixture**: deterministic board, 80 moves scrubbed to index 40 → 40 undos + 40 redos, Auto Up off. `&steps=S&scrub=K` for other depths (clamped; defaults keep the pinned card labels valid) |
| `soli://?demo=nearwin&left=N` | **Near-win fixture**: solution replayed to N moves before completion (default 1), Auto Up off — finish manually for a REAL win + celebration |
| `soli://?deal=<exactId>&draw=N` | New game from an exact deal id (`E1_...`) — bug repro, hand-crafted scenarios. `draw` optional; invalid id devLogged + ignored |
| `soli://?set=drawCount:3,autoUp:off,solvableOnly:on` | Apply settings without UI taps (`drawCount` 1–5, `autoUp`/`solvableOnly` on/off). Unknown pairs devLogged + skipped, rest applies |
| `soli://?reset=undoHint` / `?reset=game` | Targeted resets, section 4 |
| `soli://?celebration=<modeId\|random>` | Celebration overlay on the current board WITHOUT winning (note below) |
| `soli://demo-game` | Old handcrafted demo (rarely useful — no undo history) |
| `soli://?seedHistory=default` / `=clear` | Seed / clear history rows, section 4 |

`recordHistory=false` (alias `history`) disables reducer history snapshots on playlist runs. One param family per link (the first matching family wins).

Delivery — always use `yarn deeplink`. **Default target: the connected Android device**; falls back to a booted iOS simulator only when no adb device is connected. **Agents testing on the simulator must pass `--ios`** — the phone is usually connected, so the fallback WILL hit it. `--serial <s>` when several adb devices. On Android the wrapper self-heals: no device → it runs `scripts/android-ready.sh` (wireless reconnect) itself, then wakes + unlocks before delivering.

| Shortcut | Delivers | Cold default |
|---|---|---|
| `yarn celebration [modeId]` | `?celebration=<modeId\|random>` | warm |
| `yarn scrubtest [steps] [scrub]` | `?demo=scrubbed[&steps=S&scrub=K]` | **cold** (a stale warm demo run would overwrite the fixture) |
| `yarn nearwin [left]` | `?demo=nearwin[&left=N]` | **cold** (same reason) |
| `yarn seedhistory [clear]` | `?seedHistory=default\|clear` | warm |
| `yarn deeplink '<soli:// url>'` | any raw catalog link | warm |

`--cold`/`--warm` override; `--no-retry` keeps the URL as-is (dedup applies; an existing `#fragment` also skips the nonce).

Raw one-liners (reference only — the wrapper adds the `#retry-<nonce>` that defeats both dedup layers [Android intent dedup + in-app repeated-URL guard] and the cold force-stop; raw links need those by hand):

```bash
adb -s <serial> shell am start -W -a android.intent.action.VIEW -d 'soli://?demo=scrubbed' ch.karimattia.soli/.MainActivity
xcrun simctl openurl booted 'soli://?demo=scrubbed'
```

Caveats: `?set=` changes settings, but an in-progress game keeps the drawCount it was DEALT with — verify via the Settings screen or a fresh deal, not the current game's stock. The FIRST deep link on a freshly created simulator pops the iOS "Open in “Soli”?" alert — confirm once via agent-device; later links open silently.

### Celebration testing

`yarn celebration [modeId]` shows the full-deck celebration overlay immediately — no win needed, any board (synthesizes a 52-card won-board payload). Mode ids: stable ids in `src/animation/celebrationModes.ts` (`CELEBRATION_MODE_METADATA`); unknown id → devLogged + ignored. The preview runs in dev-hold: loops indefinitely, no new-game dialog; the bottom-right badge shows `Celebration NN · Name` — tap the badge to cycle modes, tap anywhere else to dismiss silently back to the untouched game. Different mode directly: re-fire the shortcut.

## 4. State resets & seeding

- **Undo hint**: `soli://?reset=undoHint` (or Demo sheet → "Reset undo hint"). Sets a *testable* state — lifetime just past the >50 gate + 3 hints remaining, so a 10-tap undo streak shows hint 1 immediately.
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

agent-device usage:

- Invoke as `yarn agent-device ...` (repo-pinned; not `npx`). `snapshot -i` dedupes identical labels; `snapshot --raw` counts face-down cards.
- **Phone asleep / wireless adb dropped / taps failing → `scripts/android-ready.sh`**: the same bounded discovery/reconnect as `yarn release` + pin to `<ip>:5555` + wake + unlock + state summary. `--keep-awake` for long sessions (raises screen-off timeout to 600 s, prints the restore command — run it when done). **NEVER hand-roll adb wake/reconnect loops.**
- Only ONE agent-device session may drive the phone at a time — the build lock does NOT cover device sessions. List/close stale sessions before starting.
- Simulators are contested too: `open` fails with DEVICE_IN_USE naming the owner, and `session list` can report `[]` while a concurrent agent still owns the device — do NOT keep closing someone else's live session. Instead create a throwaway simulator and install the already-built app (no rebuild): `xcrun simctl create "Soli Test iPhone" "iPhone 17 Pro" <ios-runtime>`, boot, `xcrun simctl install <udid> ~/Library/Developer/Xcode/DerivedData/Soli-*/Build/Products/Release-iphonesimulator/Soli.app` (path printed near the end of the yarn ios log; install can fail transiently right after boot — retry once). Target links at the udid, pass `--device "Soli Test iPhone"` to agent-device, delete the sim when done.

Gotchas: `uiautomator dump` fails on this app (the game timer never idles). Drawer tabs can report negative coordinates on iOS — navigate via hamburger button → tab label instead.

## 6. Scrubber automation

Enter the deterministic fixture first: `yarn scrubtest` (index 40 of 80).

- **Android**: native pan via agent-device. Needs ≥ ~275 px horizontal travel; verify the landed index and retry (±1 jitter is normal).
- **iOS**: agent-device cannot pan (single ~300 ms swipe; the RNGH pan never activates). Use Appium: close any agent-device session (and idle `xcodebuild ... AgentDeviceRunner` processes — both are XCTest-based, serialize them), start `appium` in a separate terminal, then `node scripts/ios-scrub.js --from 40 --max 80 --to 20` (also `--to 0`/`--to max`). First session per boot ≈ 40 s (WDA build), later ≈ 5 s. Recreate the agent-device session afterwards.

## 7. Logs

- `[SoliDev]` logging (`devLog`) is gated on developer mode — OFF by default. Any demo deep link enables it; otherwise expect silence.
- Android: `yarn release --logs`, or raw `adb -s <serial> logcat`. iOS: `yarn ios --logs` (JS console goes to the unified os_log stream, not the console-pty); if it shows nothing, trigger activity first (e.g. a demo deep link).
- Manual iOS stream: `xcrun simctl spawn <udid> log stream --level debug --predicate 'process == "Soli"' --style compact | rg --line-buffered 'SoliDev'` — **`--level debug` is required**, the default level drops the Info-level JS lines.

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| Empty Android a11y tree | Historically an overlay (Tamagui ToastViewport) swallowing the tree; check for full-screen overlays before blaming the board |
| adb "more than one device" | ALWAYS pass `-s <serial>`; kill stray emulators — release testing is physical-only |
| Device busy / taps do nothing | A stale agent-device session holds the device — list and close it |
| Wireless adb dropped / phone dozed | `scripts/android-ready.sh` (reconnect + pin + wake + unlock in one shot); never hand-roll loops |
| Terminal file says a build is running but nothing happens | Terminal metadata can be stale; trust `/tmp/soli-build.lock` and `ps` |
| Deep link seems ignored | You bypassed the wrapper — `yarn deeplink` adds the retry nonce + cold force-stop; raw links need `#retry-N` / manual force-stop |
| Signature mismatch on Android install | Check `SOLI_UPLOAD_*` in `.env` first — uninstalling wipes real history, last resort (section 4) |

## 9. Self-improvement

Mirror of the AGENTS.md rule: if any instruction here was wrong, stale, or caused friction, **UPDATE THIS SKILL immediately**. Keep it the current best practice: REPLACE outdated content in place — no dated changelog notes, no workarounds for states that no longer exist. History and rationale belong in the relevant plan doc under `docs/product/`. Stale or bloated content here costs every future agent a session.

## 10. Further reading

- `docs/external-package-guides/`: `appium.md` (iOS scrub recipe), `agent-device.md`, `expo-run-ios-and-simctl.md`
- `docs/product/`: `agent-testing-skill/` (history + rationale behind these recipes), `scrubber-test-automation/` (fixture + ios-scrub background), `klondike-card-accessibility/` (a11y handle design)
