---
name: soli-testing
description: On-device testing cookbook for the Soli app — build/run commands (yarn release, yarn ios), demo deep links, mid-game fixtures, state resets and the phone-data guardrail, a11y handles and testIDs for driving the board, Appium scrub for iOS, log streaming, and troubleshooting. Use whenever building, installing, or testing Soli on a device or simulator.
---

# Soli on-device testing cookbook

Single source of truth for testing Soli on devices/simulators. Package/bundle id everywhere: `ch.karimattia.soli`.

## 1. Decision tree

1. **Cheap gates first, always**: `yarn typecheck && yarn lint && yarn jest`.
2. **Platform**:
   - **iOS simulator (`yarn ios`) = safe default.** Drive by testIDs. Zero risk to Karim's phone/history. Full wipes allowed (`xcrun simctl uninstall`).
   - **Android physical phone (`yarn release`) = only when Android-specific behavior matters.** Drive by a11y labels. Phone pans natively (scrubber works without Appium). It is Karim's MAIN phone — see the data guardrail in section 4.
   - Web: not a target (native-only app). Playwright would work but is almost never worth it.
3. **Fixture**:
   - Fresh deal: default app launch (`soli:///`).
   - Full end-to-end stress: auto-solve playlist. Two ways to start it — `yarn release/ios --auto-solve` builds+installs+launches AND monitors logs with a pass/fail exit (use after code changes); the `?demo=playlist` deep link just starts the run on the already-installed app, no rebuild, seconds instead of minutes (use when the installed build is already current and you watch logs yourself).
   - Undo/redo/scrubber testing: scrubbed mid-game fixture (`?demo=scrubbed`, tunable via `&steps=S&scrub=K`).
   - Real win + celebration end-to-end: near-win fixture (`?demo=nearwin&left=N`) — play the last move(s) manually.
   - Bug repro / hand-crafted scenario on a specific deal: `?deal=<exactId>`.
   - History screen / stats testing: seeded history (`?seedHistory=default`).

## 2. Build & run

Both commands handle competing builds, locking, install verification, and app launch themselves, then exit — **no manual pgrep/kill needed**. They kill competing builds (other `expo run:`, xcodebuild, Gradle clients; idle Gradle daemons and Metro dev servers are spared) and mutually exclude via a shared lock `/tmp/soli-build.lock` (mkdir + pid file; a stale lock from a dead pid is auto-cleared). Trust the lock file + process list over stale terminal-file metadata. Full build logs land in `.test-artifacts/builds/` (timestamped `.log`, path printed on failure with a 40-line tail).

- **Android (physical phone, Release APK)**: `yarn release`
  - Wireless adb discovery + signing patch + pin to `<ip>:5555` happen in `run-android-release.sh`; physical devices only, never falls back to an emulator. Single-ABI arm64-v8a build.
  - `--logs`: stream `[SoliDev]`-filtered logcat until Ctrl+C.
  - `--auto-solve`: build + run the demo playlist, exits on completion/failure. `DEMO_GAME_LIMIT=N` limits games (max 20), e.g. `DEMO_GAME_LIMIT=1 yarn release --auto-solve`.
  - Unlock a locked phone: `scripts/android-unlock-pattern.sh` (safe no-op when already unlocked).
- **iOS (simulator, Release)**: `yarn ios`
  - Simulator pick: booted > `SOLI_IOS_SIMULATOR=<name>` > newest iPhone; boots it if needed.
  - `--logs`, `--auto-solve` (same semantics as Android, incl. `DEMO_GAME_LIMIT`).
  - `--debug` (iOS only): Debug config with Metro attached, process intentionally lingers — for manual dev; run a normal `yarn ios` afterwards to restore the Release build. Cannot combine with `--logs`/`--auto-solve`.
  - Incremental by default; clean build (delete `ios/`) only after native dependency changes.
- **Never start two builds in parallel** — the machine can't handle it; the lock makes the second invocation fail fast anyway.

## 3. Demo deep-link catalog

Parsed by `processDemoLink()` in `src/features/klondike/hooks/useDemoGameLauncher.ts`. All demo deep links auto-enable developer mode (which also turns `[SoliDev]` logging on).

| URL | Effect / when to use |
|---|---|
| `soli:///?demo=playlist&games=N` | Auto-solve playlist, N games (clamped to 20) |
| `soli:///?demo=autosolve&games=1` | Single auto-solved generated game |
| `soli://?demo=scrubbed` | **Scrubbed mid-game fixture**: deterministic board, 80 moves scrubbed to index 40 → 40 undos + 40 redos available, Auto Up off. Optional `&steps=S&scrub=K` for other depths (clamped; defaults keep the pinned card labels below valid) |
| `soli://?demo=nearwin&left=N` | **Near-win fixture** (2026-07): playlist solution replayed to N moves before completion (default 1), Auto Up off — play the final move(s) manually for a REAL win + celebration end-to-end |
| `soli://?deal=<exactId>&draw=N` | Start a new game from an exact deal id (`E1_...`) — bug-report repro, hand-crafted scenarios (near-win, empty stock, …). `draw` optional (falls back to current setting); invalid id is devLogged + ignored |
| `soli://?set=drawCount:3,autoUp:off,solvableOnly:on` | Apply settings without UI taps (keys: `drawCount` 1–5, `autoUp`, `solvableOnly` on/off). Unknown pairs are devLogged + skipped, the rest apply |
| `soli://?reset=undoHint` / `?reset=game` | Targeted resets, see section 4 |
| `soli://?celebration=<modeId\|random>` | Show the win-celebration overlay with that mode on the current board WITHOUT winning (see celebration note below) |
| `soli://demo-game` | Old handcrafted demo (rarely useful — cannot reconstruct undo history) |
| `soli://?seedHistory=default` / `=clear` | Seed / clear history rows (see section 4) |

Optional param `recordHistory=false` (alias `history`) disables reducer history snapshots on playlist runs. One param family per link (e.g. don't combine `set=` and `deal=` — the first matching family wins).

Delivery — primary recipe (2026-07): `yarn deeplink` wraps the foot-guns (auto `#retry-<nonce>` against both dedup layers, sensible force-stop defaults, adb serial selection). Target auto-picks: booted iOS simulator if one exists, else the connected Android device; force with `--ios`/`--android` (`--serial <s>` when several adb devices).

| Shortcut | Delivers | Cold default |
|---|---|---|
| `yarn celebration [modeId]` | `?celebration=<modeId\|random>` | warm |
| `yarn scrubtest [steps] [scrub]` | `?demo=scrubbed[&steps=S&scrub=K]` | **cold** (stale warm demo runs overwrite fixtures) |
| `yarn nearwin [left]` | `?demo=nearwin[&left=N]` | **cold** (same reason) |
| `yarn seedhistory [clear]` | `?seedHistory=default\|clear` | warm |
| `yarn deeplink '<soli:// url>'` | any raw link from the catalog above | warm |

`--cold`/`--warm` override the default; `--no-retry` keeps the URL as-is (dedup applies; an existing `#fragment` also skips the nonce).

Raw fallback/reference one-liners (what the wrapper runs):

```bash
# Android (always pass -s):
adb -s <serial> shell am start -W -a android.intent.action.VIEW -d 'soli://?demo=scrubbed' ch.karimattia.soli/.MainActivity
# iOS simulator:
xcrun simctl openurl booted 'soli://?demo=scrubbed'
```

Caveats:

- **Force-stop before deep-linking into a warm app** (`adb -s <serial> shell am force-stop ch.karimattia.soli` / `xcrun simctl terminate booted ch.karimattia.soli`) — a stale playlist still running in the warm app can overwrite the state you just deep-linked into.
- Retries: identical URLs get deduped (Android intent dedup, and the app ignores a repeated identical URL). Append `#retry-1`, `#retry-2`, … to force re-delivery.
- **Initial-URL replay — FIXED 2026-07-07** (builds from that evening on consume the cold-start URL exactly once via a dedicated ref in `useDemoGameLauncher`). Historical context for OLDER installed builds: if the app was COLD-STARTED by a deep link L1, firing a different link L2 later could re-apply L1 (`Linking.getInitialURL()` was re-read whenever the handler identity changed, and the single-slot dedup ref then held L2, not L1). Workaround on such builds: `xcrun simctl terminate <udid> ch.karimattia.soli && xcrun simctl launch <udid> ch.karimattia.soli`, THEN deliver links into the warm app — a plain launch has no initial URL to replay.
- `?set=` applies to settings, but an in-progress game keeps the drawCount it was DEALT with — verify a draw-count change on the Settings screen or by dealing a new game, not by tapping the stock of the current game.
- The FIRST deep link on a freshly created simulator pops the iOS system alert "Open in “Soli”?" — confirm it once via agent-device (`press` the "Open" button); later links open silently. (2026-07-07)

### Celebration testing (2026-07)

`soli://?celebration=<modeId|random>` shows the full-deck celebration overlay immediately — no win needed, works on any board (it synthesizes a 52-card won-board payload). Mode ids are the stable ids in `src/animation/celebrationModes.ts` (`CELEBRATION_MODE_METADATA`); an unknown id is devLogged + ignored. The preview runs in dev-hold (updated 2026-07-07, celebration-smoothness Story 5): it loops indefinitely, NO new-game dialog ever appears, and while active (dev mode) the bottom-right badge shows `Celebration NN · Name` — tap the badge to cycle modes, tap anywhere ELSE to dismiss silently back to the untouched game. Different mode directly: re-fire the link with `#retry-N`.

## 4. State resets & seeding

- **Undo-hint reset**: `soli://?reset=undoHint`, or dev mode → Demo sheet (header "Demo" button) → "Reset undo hint" (same code path). Resets `useUndoHint` to a *testable* state: lifetime just past the >50 gate + 3 hints remaining, so a 10-tap undo streak immediately shows hint 1.
- **Game reset** (2026-07): `soli://?reset=game` clears the persisted in-progress game and deals fresh — New Game without the confirmation dialog (current game is recorded as incomplete, like a real "Deal Again"). There is deliberately NO `?reset=all`: settings go via `?set=`, seeded history has `?seedHistory=clear`, and bulk destruction stays manual to protect real phone history.
- **Settings** (2026-07): `soli://?set=drawCount:3,autoUp:off,solvableOnly:on` — no UI taps needed before dealing test games.
- **History seeding** (added 2026-07, Workstream B of agent-testing-skill): `soli://?seedHistory=default` inserts a catalog of `seed-`-prefixed history rows (solved/incomplete, varied draws/dates/durations); `soli://?seedHistory=clear` deletes ONLY those seeded rows. Demo sheet has matching "Seed history" / "Clear seeded history" entries. Real history rows are never touched.

### Wiping Soli APP DATA on the physical phone: fine when needed, not routine

Scope first: only ever touch the Soli app's own data (`adb shell pm clear ch.karimattia.soli`, `adb uninstall ch.karimattia.soli`) — NEVER anything device-wide (it's Karim's MAIN phone). Clearing Soli's data is allowed when a test genuinely needs it, but it destroys his real game history (games played, stats), which he values — so not as a routine reset (2026-07-07: Karim: app-data wipe "is fine", "nice if not too often"). Prefer, in order:

1. Seeded rows (`?seedHistory=default` / `=clear`) — only `seed-` prefixed rows are ever touched.
2. The iOS simulator for anything needing a full wipe (`xcrun simctl uninstall booted ch.karimattia.soli`) — zero risk.
3. Targeted resets (e.g. demo sheet "Reset undo hint") over broad ones.
4. Soli app-data wipe on the phone — only if none of the above can produce the state you need.

## 5. Driving the app (a11y matrix)

The board exposes a full a11y tree — always prefer it over coordinate taps. Source of truth: `src/features/klondike/components/cards/accessibility.ts`.

**Interaction model: tap-to-move only. Cards CANNOT be dragged** — tap a card to select, tap the destination to move (agents have wasted whole sessions trying to drag cards).

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
| Scrubber track | invisible in a11y tree at rest (both platforms) | `undo-scrubber-track` (only while scrubbing) |

agent-device usage:

- Invoke as `yarn agent-device ...` (repo-pinned version; not `npx`).
- `snapshot -i` dedupes identical labels; `snapshot --raw` to count face-down cards.
- Only ONE agent-device session may drive the physical phone at a time — the build lock does NOT cover device sessions. List/close stale sessions before starting.
- Simulators are contested too: `open` fails with DEVICE_IN_USE naming the owning session. `session list` can report `[]` while a concurrent agent still owns the device (its daemon re-acquires it) — do NOT keep closing someone else's live session. Instead create a throwaway simulator and install the already-built app, no rebuild needed (2026-07-07): `xcrun simctl create "Soli Test iPhone" "iPhone 17 Pro" <ios-runtime>`, boot, then `xcrun simctl install <udid> ~/Library/Developer/Xcode/DerivedData/Soli-*/Build/Products/Release-iphonesimulator/Soli.app` (exact path printed near the end of the yarn ios build log; install can fail transiently right after first boot — retry once). Target deep links with the udid instead of `booted`, pass `--device "Soli Test iPhone"` to agent-device, and delete the sim when done.

Known-unautomatable / gotchas:

- `uiautomator dump` fails on this app (the game timer never idles).
- Drawer tabs can report negative coordinates on iOS — navigate via hamburger button → tab label instead.

## 6. Scrubber automation

Enter the deterministic fixture first: `soli://?demo=scrubbed` (index 40 of 80).

- **Android**: native pan works via agent-device. Needs ≥ ~275 px horizontal travel to register reliably; verify the landed index and retry (±1 index jitter is normal).
- **iOS**: agent-device cannot pan (synthesizes a single ~300 ms swipe; the RNGH pan never activates). Use Appium instead:
  1. Close any agent-device session (and kill idle `xcodebuild ... AgentDeviceRunner` processes) — Appium and agent-device are both XCTest-based and must be serialized.
  2. Start `appium` (xcuitest driver installed globally) in a separate terminal.
  3. `node scripts/ios-scrub.js --from 40 --max 80 --to 20` (also `--to 0` / `--to max` without from/max). First session per simulator boot ≈ 40 s (WDA build); later ≈ 5 s.
  4. Recreate the agent-device session afterwards.
  - Details + verified recipe: `docs/external-package-guides/appium.md`.

## 7. Logs

- `[SoliDev]` logging (`devLog`) is gated on developer mode — OFF by default. Any demo deep link enables it; otherwise expect silence.
- Android: `yarn release --logs` streams filtered logcat; or raw `adb -s <serial> logcat`.
- iOS Release: JS console output goes to the **unified log stream** (os_log), not the console-pty — `yarn ios --logs` handles this. If `--logs` shows nothing, trigger activity first (e.g. send a demo deep link, which also enables dev mode).
- Manual iOS stream (V3, 2026-07-07): `xcrun simctl spawn <udid> log stream --level debug --predicate 'process == "Soli"' --style compact | rg --line-buffered 'SoliDev'` — **`--level debug` is required**; the default level silently drops the Info-level JS console lines and you'll see nothing.

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| Empty Android a11y tree | Historically caused by an overlay (Tamagui ToastViewport) swallowing the tree; re-check for full-screen overlays before blaming the board |
| adb "more than one device" | ALWAYS pass `-s <serial>`; kill stray emulators (`adb -s emulator-... emu kill`) — release testing is physical-only |
| Device busy / taps do nothing | A stale agent-device session is holding the device — list and close it |
| Wireless adb drops mid-run | Phone screen went to sleep — raise screen timeout, unlock with `scripts/android-unlock-pattern.sh`; install retries reconnect once automatically |
| Terminal file says a build is running but nothing happens | Terminal metadata can be stale; trust `/tmp/soli-build.lock` (pid file) and `ps` over old terminal output |
| Deep link seems ignored | App was warm with the same URL — force-stop first and/or append `#retry-N` |
| Build fails with signature mismatch (Android) | The installed app was signed differently; check `SOLI_UPLOAD_*` in `.env` first — uninstalling on the phone wipes real history, last resort (section 4) |

## 9. Self-improvement

Mirror of the AGENTS.md rule: if any instruction in this skill was wrong, stale, or caused friction during a run, **UPDATE THIS SKILL immediately** (and note the fix inline with a date). This file is the single source of truth for on-device testing recipes — stale content here costs every future agent a session.

## 10. Further reading

- `docs/external-package-guides/appium.md` — iOS scrub gesture details, verified recipe
- `docs/external-package-guides/agent-device.md` — agent-device CLI notes
- `docs/external-package-guides/expo-run-ios-and-simctl.md` — simulator/simctl reference
- `docs/product/scrubber-test-automation/scrubber-test-automation.md` — scrubbed fixture + ios-scrub background
- `docs/product/klondike-card-accessibility/klondike-card-accessibility.md` — a11y handle design
