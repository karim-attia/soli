# expo run:ios + xcrun simctl — usage cache for `yarn ios`

Date-stamped 2026-07-07. Sources: https://docs.expo.dev/more/expo-cli/ ("run:ios"),
`npx expo run:ios --help` (verified locally against the installed expo CLI, SDK 57),
`xcrun simctl help` (Xcode / iOS 26.5 simulators), RN console-logging research
(facebook/react-native#27863). Consumed by scripts/build-install-ios.js — see
docs/product/ios-build-workflow/ios-build-workflow.md.

## expo run:ios flags (verified via --help 2026-07-07)

- `--configuration <Debug|Release>` — Xcode configuration. Default: Debug.
  Release embeds the JS bundle in the app (no Metro needed at runtime).
- `--no-bundler` — skip starting the Metro bundler. Combined with Release this
  yields a self-contained binary and lets the CLI exit cleanly (no lingering
  dev server). Auto-enabled by the CLI when a dev server is already running on
  the target port.
- `-d, --device [device]` — device name or UDID; passing a value makes the run
  non-interactive (no picker prompt). `--device generic` = build-only.
- `--no-build-cache` — clear native derived data first (the "clean build" knob;
  not used by default — incremental builds are the whole point).
- `-o, --output <path>` — output dir for the built binary (build-only flows).
- `--scheme [scheme]`, `--binary <path>`, `--no-install`, `-p, --port` — not
  used by `yarn ios`; listed for completeness.
- The CLI auto-runs `pod install` when native deps changed and auto-runs
  prebuild when `ios/` is missing. It also installs AND launches the app on
  the target simulator itself — no separate `simctl install`/`launch` needed
  on the happy path.

## xcrun simctl commands used by scripts/build-install-ios.js

- `xcrun simctl list devices --json` — `devices` map keyed by runtime id;
  entries carry `udid`, `name`, `state` ("Booted"/"Shutdown"),
  `isAvailable`, `lastBootedAt` (ISO date, may be absent if never booted).
- `xcrun simctl boot <udid>` — errors with "Unable to boot device in current
  state: Booted" when already booted (tolerated).
- `open -a Simulator` — brings the Simulator app UI up (booting via simctl
  alone leaves the device headless).
- `xcrun simctl bootstatus <udid> -b` — blocks until the device finished
  booting (`-b` also boots it if shut down).
- `xcrun simctl get_app_container <udid> <bundle-id> app` — prints the
  installed .app bundle path; non-zero exit when the app is not installed.
  Used for install verification together with
  `/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' <app>/Info.plist`.
- `xcrun simctl spawn <udid> log stream --level debug --style compact
  --predicate 'process == "Soli"'` — **the channel that actually carries
  `[SoliDev]` lines in a Release build** (verified empirically 2026-07-07 on
  this repo, RN 0.86 + Hermes, iPhone 17 Pro / iOS 26.5 simulator): JS console
  output arrives in unified logging at Info level under category
  `com.facebook.react.log:javascript`, formatted like
  `... I Soli[pid:tid] [com.facebook.react.log:javascript] '[SoliDev]', '...'`.
  The process name in the predicate is the app target name ("Soli" from
  expo.name), not the bundle id.
- `xcrun simctl launch --console-pty --terminate-running-process <udid>
  <bundle-id>` — (re)launches the app and blocks, piping the app's
  stdout/stderr via a pty. **Verified 2026-07-07: in Release this pty carries
  only native stderr/glog lines (ReactInstance etc.), NOT `[SoliDev]`** —
  the opposite of the pre-implementation research prediction. Still useful:
  the pty blocks while the app lives, so EOF = the app process died (crash
  sentinel used by `yarn ios --logs`). The `--stdout=`/`--stderr=` flags are
  known-broken; use `--console-pty`.
- `xcrun simctl openurl <udid> "soli:///?..."` — deep-link launch (used by
  `--auto-solve` for the demo playlist URI, mirroring Android `am start`).
  Verified: delivering the demo URI into the already-running Release app
  starts the playlist (no relaunch needed).

## Known gotchas

- The console-pty process can exit while the app keeps running (e.g. its
  spawning shell dies), so pty EOF alone is not proof of a crash —
  `yarn ios --logs` double-checks via `simctl spawn <udid> launchctl list`
  (the app shows up as `UIKitApplication:<bundle-id>`).
- `simctl list devices --json` lists device types oldest-first within a
  runtime; "newest iPhone" = highest runtime version, last matching entry.
