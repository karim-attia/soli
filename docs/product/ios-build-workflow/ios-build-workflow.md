# iOS build workflow — `yarn ios` parity with Android `yarn release`

Plan created 2026-07-07. Not yet implemented. Sibling plan (Android, Rounds 1-3 done +
Round 4 planned): docs/product/yarn-release-improvements/yarn-release-improvements.md —
read it before implementing; this plan reuses its module, lock, preflight kill, progress
bar, and console-UX conventions.

## User prompt

> should we do the same for ios? also little script with build time (would need to get estimate), some hardening which simulator to take, clean logs, build kill, etc... really similar. then could also check for android <-> ios.
>
> also for android: i think we auto run the unlock. phone is now often unlocked. this makes weird gestures over the screen and sometimes does random actions. would it be easy to check before if phone is unlocked?

(The Android unlock-check part is Round 4 in
docs/product/yarn-release-improvements/yarn-release-improvements.md; this plan covers the
iOS part.)

## Summary

Implemented AND fully tested 2026-07-07 (steps 1-13 done; the step-13 simulator test
round passed all 10 scenarios — warm builds ~52-57s, lock contention iOS↔iOS and
iOS↔Android both directions, Metro survival, --logs, --auto-solve, simulator
hardening, --debug routing, flag validation, Android duration-seeding retrofit; no
bugs found). `yarn ios` is a Node entry (scripts/build-install-ios.js)
with Android-parity behavior: shared /tmp/soli-build.lock (renamed — iOS and Android
builds now mutually exclude), preflight kill (pattern extended: the expo CLI process
shows as `expo/bin/cli run:`, not `expo run:` — gap found live), deterministic
simulator selection (booted > SOLI_IOS_SIMULATOR > newest iPhone), quiet Release
build via wrapped `expo run:ios --no-bundler` with a duration-store-seeded progress
bar (durations.json, also retrofitted to Android), install verification
(get_app_container + CFBundleVersion vs app.json + bundle mtime), clean exit 0.
Flags: `--logs` (unified-log-stream [SoliDev] filter + console-pty crash sentinel),
`--auto-solve` (openurl demo playlist; monitor pipeline end-to-end verified),
`--debug` (Metro escape hatch, full output, lingers). Key empirical finding: the
plan's log-channel prediction was inverted — [SoliDev] lives in the unified log
stream in Release, NOT on the console-pty. Smoke build: cold Release build 7:54,
exit 0, no lingering processes. The sibling Round 4 (Android unlock guard) is done
and device-verified — see yarn-release-improvements.md.

## Description

`yarn ios` is currently raw `expo run:ios`: Debug configuration, Metro dev server started
and left attached (a lingering process — exactly what Round 1 removed on Android), full
verbose xcodebuild/CocoaPods output, no build lock, no competing-build kill, no install
verification, no time estimate. Agents run it several times per day (AGENTS.md even tells
them to manually check for and kill competing builds first — the chore `yarn release`
automated away on Android).

We give `yarn ios` the same treatment as Android `yarn release`:

- quiet build with the shared progress bar, seeded with a **real time estimate** from
  persisted past build durations (new — also retrofitted to Android),
- **hardened deterministic simulator selection** (booted / configured default / most
  recently booted),
- **clean, filtered logs** on demand (`--logs` parity),
- **preflight kill** of competing builds (same shared function),
- **Android <-> iOS mutual exclusion** via one shared lock (`/tmp/soli-build.lock`) —
  Karim explicitly wants this; today "never two builds in parallel" is only enforced for
  Android-vs-Android,
- install verification + clean exit (no lingering Metro).

Why this matters: the same token/wall-time savings that `yarn release` delivered for the
Android loop (agents don't babysit builds, don't hang on lingering processes, don't
mistakenly test stale binaries), applied to the second daily loop.

## Acceptance Criteria

- `yarn ios` (no flags): picks a simulator deterministically (prints which, incl. name),
  boots it if needed, kills competing non-lock-managed builds, takes the shared build
  lock, builds a **Release** app via wrapped `expo run:ios` with the quiet progress bar
  (elapsed/remaining seeded from the last measured iOS build duration), tees the full
  xcodebuild/CLI output to `.test-artifacts/builds/<timestamp>-ios.log`, verifies the
  install landed on the simulator, and **exits 0 with no lingering children (no Metro)**.
- Starting `yarn ios` while `yarn release` runs (or vice versa): the second fails fast
  (<2s) with the lock-holder message. Stale locks recover via the existing dead-pid check.
- Competing `expo run:` / `xcodebuild` / stray Gradle clients are killed with the existing
  attribution note; a legitimately running `expo start` (Metro dev server) is NOT killed.
- `yarn ios --logs`: same as above, then streams the app's `[SoliDev]`-filtered console
  output until Ctrl+C (exit 0), with crash/exit detection.
- `yarn ios --debug`: escape hatch — Debug configuration with Metro attached (current
  behavior, minus the noise-reduction; process intentionally lingers). Still lock-guarded.
- Android `yarn release` progress bar is seeded from persisted Android durations (small
  retrofit; no behavior change otherwise).
- AGENTS.md iOS lines updated (concise, Round-3 style); the "always run a clean build"
  requirement dropped (see Open question 2).
- On build failure: one-line error + log path + ~40-line tail (same as Android).

## Possible approaches incl. pros and cons

**1. Build configuration for `yarn ios`** (current: Debug + Metro):

- (a) Keep Debug+Metro. Pro: fastest human iteration (JS hot reload); no rebundle per JS
  change. Con: lingering Metro process (agents hang or must remember to background/kill),
  JS dev mode → animation feel not trustworthy (same fidelity bar that made Karim keep the
  release variant on Android — see docs/product/faster-builds/), and the workflow can
  never "exit cleanly" like Android.
- (b) Default `--configuration Release` (+ `--no-bundler`). Pro: self-contained binary
  (bundle embedded), process exits cleanly, no Metro, production-fidelity animations —
  agents (the main users per AGENTS.md) get the exact Android-parity loop. Con: every JS
  change costs a Metro rebundle inside the build (~the same fixed cost the Android release
  loop already accepts); slower than a debug hot-reload loop for a human doing rapid UI
  tweaking.
- (c) **RECOMMENDED**: Release default + `--debug` escape hatch (option (b) plus a flag
  that runs Debug with Metro attached for Karim's manual dev loop). Pro: right default for
  the dominant user (agents), one flag away for humans; the escape hatch is ~5 lines. Con:
  one more flag to document.

**2. Keep expo CLI (`expo run:ios`) vs bare xcodebuild+simctl** (Android went bare
gradlew):

- (a) **RECOMMENDED — wrap `expo run:ios`**, spawned quietly (output captured + teed to
  the log file) with our progress bar on top. Pro: the CLI handles CocoaPods install
  when deps changed, workspace/scheme/destination resolution, app-path lookup, simulator
  install and launch — all much more involved than gradle+adb was; it also auto-runs
  prebuild if `ios/` is missing. Battle-tested, ~zero maintenance for us. Con: a few
  seconds of CLI startup; we launch/verify through simctl afterwards anyway.
- (b) Bare `xcodebuild` + `simctl install/launch`. Pro: no CLI overhead, full control.
  Con: we would reimplement pod-install detection, `-workspace/-scheme/-destination`
  handling, DerivedData app-path resolution, and install/launch — high regression surface
  for a few seconds of gain. This is the same trade-off that kept the battle-tested bash
  adb discovery on Android (Round 1 approach (b)); rejected.

**3. Shared-module shape** (platform-agnostic helpers: log, progress tracker, runCommand,
lock, preflight kill, TTY note, duration store):

- (a) **RECOMMENDED — rename `scripts/lib/android-release.js` → `scripts/lib/build-tools.js`**
  (git mv), keep everything in it (Android-specific parts included), update the single
  `require` in `scripts/build-install-android.js`. iOS-specific helpers (simulator
  selection, simctl verify/launch/log streaming) live directly in the new entry
  `scripts/build-install-ios.js` (single consumer — no premature lib split). Pro: fewest
  moved lines by far (a rename + 1 import path); every shared helper is already exported.
  Con: a neutrally-named file hosts Android-specific code — mitigate with a header comment
  ("shared build tooling + Android-specific helpers; iOS-specific helpers live in
  scripts/build-install-ios.js").
- (b) New shared file extracted from android-release.js, imported by both. Pro: cleaner
  taxonomy. Con: ~400 lines moved + re-export shims — churn for no behavior change;
  rejected per "prefer whichever is fewer moved lines".

**4. Lock**: rename `/tmp/soli-android-build.lock` → **`/tmp/soli-build.lock`** — ONE lock
for both platforms so iOS and Android builds mutually exclude (the machine can't handle
two builds; Karim explicitly wants android <-> ios exclusion). Make the contention message
platform-neutral ("Another build (Android or iOS) is already running (pid N)..."). Add a
migration comment at the constant: renamed 2026-07 from soli-android-build.lock when the
lock became cross-platform; a run started with the old binary during the switchover isn't
seen by the new path (one-time, self-healing — old dir is never consulted again).

**5. Log streaming channel for `--logs`** — THE research risk of this plan. Web research
2026-07-07: RN's `console.log` on iOS goes to stdout/stderr via `RCTDefaultLogFunction`,
NOT to Apple unified logging (facebook/react-native#27863); worse, in Release builds the
native default log threshold is Error, so info-level JS console output may be dropped
entirely before reaching any channel. Therefore the implementation sub-agent MUST verify
empirically first (step 7a) which channel carries `[SoliDev]` lines in a Release simulator
build:

- (a) **Primary candidate**: `xcrun simctl launch --console-pty --terminate-running-process
  <udid> ch.karimattia.soli` — blocks and pipes the app's stdout/stderr to us (a widely
  used agent pattern for RN apps; captures Hermes stack traces and JS errors). No
  predicate guessing; the `[SoliDev]` grep filter works unchanged. Bonus crash signal:
  the pty stream ends when the app process dies (EOF = app exited/crashed).
- (b) Fallback: `xcrun simctl spawn <udid> log stream --level debug --style compact
  --predicate 'eventMessage CONTAINS "[SoliDev]"'` (or `process == "soli"`) — only works
  if the console output reaches unified logging in Release (doubtful per research).
- (c) If NEITHER carries `[SoliDev]` in Release: smallest fix is raising the RN log
  threshold in release (e.g. `RCTSetLogThreshold(RCTLogLevelInfo)` via AppDelegate — needs
  its own verification) or routing devLog through os_log (new native dep — gold plating).
  In that case: ship `yarn ios` WITHOUT `--logs`, document the limitation, and defer the
  logs flag (see Open question 3 / Follow-ups). Don't rabbit-hole here.

**6. Crash detection** (pragmatic per prompt): with (a), pty EOF while streaming = the app
died → print `[CRASH] app process exited` + point at the newest matching `.ips` file in
`~/Library/Logs/DiagnosticReports/` (best-effort, one `ls -t | head` — no `simctl
diagnose`, which is a multi-minute sysdiagnose-style dump). RECOMMENDED. No polling.

**7. Launch step**: `expo run:ios` already installs AND launches the app itself.
- Default mode: accept expo's launch, don't relaunch via deep link (a second
  `simctl openurl soli:///` would be redundant; Android needed `am start` because bare
  gradlew doesn't launch). RECOMMENDED.
- `--logs` mode: after the build, terminate + relaunch via
  `simctl launch --console-pty --terminate-running-process` so startup crashes are
  captured (parity with Android attaching logcat before launch).
- Demo/auto-solve (if included, see Open question 4): plain launch first is unnecessary —
  `xcrun simctl openurl <udid> "soli:///?demo=playlist&games=N"` after (or while)
  console-pty streaming is attached.

## Open questions to the user

1. **Release default with `--debug` escape hatch?** (Approaches 1) — Recommendation:
   yes, option (c). Agents are the dominant users and need clean exits; Karim keeps a
   one-flag Debug+Metro path for manual UI iteration. Proceeding with this per AGENTS.md
   unless objected.
2. **Drop the AGENTS.md "always run a clean build" iOS rule?** Clean iOS builds are the
   single biggest iOS time sink (docs/product/faster-builds/ finding). The rule existed as
   staleness insurance; install verification (step 6) addresses the actual failure mode
   (testing a stale binary), and repo history shows stale problems came from native
   changes, not incremental builds. Recommendation: **drop it** — replace with "incremental
   by default; clean (or `--no-build-cache`) only after native dependency changes".
   FLAG TO KARIM: this reverses a long-standing instruction; faster-builds step 5 already
   planned the same change.
3. **`--logs` if no channel carries `[SoliDev]` in Release?** (Approaches 5c) —
   Recommendation: ship without `--logs`, defer the flag rather than adding a native
   logging dependency now. If the console-pty path works (likely for stdout-based Hermes
   console output — verify), ship it.
4. **Include `--auto-solve` on iOS now or defer?** The demo playlist works via the same
   deep link and the shared `createLogMonitor` can consume any line-stream child (not just
   logcat) — so IF `--logs` streaming verifies OK, auto-solve is cheap (openurl demo URI +
   same monitor; no screen-timeout/unlock needed on a simulator). Recommendation:
   **conditional include** — implement it in the same round if and only if step 7a
   verification passes; otherwise defer with the same reasoning as Open question 3.

## Dependencies

- None new. `xcrun simctl`, `open -a Simulator` are system tools; `expo run:ios` is the
  already-installed expo CLI. Step 1 caches the CLI/simctl specifics in a package guide:
  `docs/external-package-guides/expo-run-ios-and-simctl.md` (date-stamped, per the
  External packages rule).

## UX/UI Considerations

Console UX only, matching Android `yarn release` (~7 happy-path lines):

- `Using simulator <name> (<udid>).` (+ `booted it` / `most recently booted of N` when
  relevant)
- `Building iOS Release app via expo run:ios...` + progress bar (seeded estimate)
- `Full build log: .test-artifacts/builds/<timestamp>-ios.log`
- `Install verified: build <CFBundleVersion>, bundle updated <time>.`
- `Build, install, and launch completed successfully in mm:ss.`
- `--logs`: `Streaming filtered logs (press Ctrl+C to exit).` then `[SoliDev]` lines.

## Components

Not applicable (no app components). Script modules:

- **Rename** `scripts/lib/android-release.js` → `scripts/lib/build-tools.js` (Approach 3a).
- **Create** `scripts/build-install-ios.js` — Node entry for `yarn ios` (contains the
  iOS-specific helpers; no bash wrapper needed — iOS has no signing env or adb discovery
  equivalent, simctl is callable from Node directly).
- **Modify** `scripts/build-install-android.js` (import path; duration-store retrofit),
  `package.json`, `AGENTS.md`.

## How to fetch data, how to cache

Build-duration persistence (Approaches/step 4): JSON at
`.test-artifacts/builds/durations.json`, shape
`{ "android-release": [ms, ...], "ios-release": [ms, ...], "ios-debug": [ms, ...] }`,
keep the last 5 per key. Seed `createProgressTracker(expectedDurationMs)` with the **last**
recorded duration (best predictor of the current warm/cold state; the tracker already
grows its estimate dynamically when exceeded, so a cold build after a warm one just grows).
Fallback when no history: existing 60s default (Android), 300s (iOS — Release simulator
builds are slower). `.test-artifacts/` is gitignored, so history vanishes on `git clean` —
acceptable, defaults take over.

## Related tasks

- docs/product/yarn-release-improvements/yarn-release-improvements.md — Rounds 1-3 built
  everything this plan reuses; Round 4 (unlock check) is the Android half of the same user
  prompt. The iOS parity Follow-up in that doc is implemented by THIS plan.
- docs/product/faster-builds/faster-builds.md — steps 5-6 there (drop mandatory iOS clean
  builds, re-benchmark iOS loop) are subsumed/enabled by this plan.

## Simplification ideas

- No bash wrapper for iOS (unlike Android): no signing env, no adb discovery — the Node
  entry does everything. One file instead of two.
- iOS helpers live in the entry, not a lib file (single consumer; split later only if a
  second consumer appears).
- Reuse `createLogMonitor` unchanged by feeding it the console-pty child where Android
  feeds a logcat child (it only consumes `.stdout` lines) — verify, else a ~5-line shim.
- Default mode does NOT relaunch the app (expo already launched it) — one less moving part.

## Steps to implement

Statuses: [ ] todo, [x] done. Implementation sub-agent: update after EACH step. Read the
full plan + the yarn-release-improvements doc first.

- [x] **1. Package guide** `docs/external-package-guides/expo-run-ios-and-simctl.md`
  (date-stamped): `expo run:ios` flags used (`--configuration Release`, `--no-bundler`,
  `--device <name|udid>`, `--no-build-cache`; `--device generic`/`--output` noted for
  completeness), simctl commands from steps 5-8, unified-logging findings from
  Approaches 5. Source links: docs.expo.dev/more/expo-cli, `xcrun simctl help`.
  Flags re-verified against the installed CLI via `npx expo run:ios --help` 2026-07-07.

- [x] **2. Lock rename** in the shared module: `LOCK_DIR = '/tmp/soli-build.lock'`,
  platform-neutral messages ("Another build (Android or iOS) is already running (pid
  <pid>). Wait for it or kill it, then rerun."), migration comment (Approach 4).
  Kill-attribution TTY note reworded to "soli build preflight" (was "yarn release
  preflight" — now fired by both entries).

- [x] **3. Module rename**: `git mv scripts/lib/android-release.js scripts/lib/build-tools.js`,
  update the require in `scripts/build-install-android.js`, header comment per
  Approach 3a. Also updated the two comment mentions in run-android-release.sh.

- [x] **4. Duration store** in `build-tools.js`: `recordBuildDuration(key, ms)` /
  `getExpectedBuildDuration(key, fallbackMs)` reading/writing
  `.test-artifacts/builds/durations.json` (last 5 per key; corrupt/missing file → fallback,
  never fail a build over stats). Retrofit Android: `buildReleaseApk` passes
  `expectedDurationMs: getExpectedBuildDuration('android-release', 60000)` to
  `runCommandWithProgress` and records the measured duration on success.

- [x] **5. Simulator selection helper** (in the new entry). Deterministic pick, exact
  commands:
  - `xcrun simctl list devices --json` → `devices` map keyed by runtime, entries with
    `udid`, `name`, `state`, `isAvailable`, `lastBootedAt`.
  - Exactly one `state === "Booted"` → use it.
  - Multiple booted → max `lastBootedAt`; print
    `Multiple booted simulators; using <name> (<udid>), most recently booted.`
  - None booted → pick `SOLI_IOS_SIMULATOR` (device name, matched against available
    devices; error with the available-names list if no match) else the **newest iPhone**:
    among `isAvailable` devices whose name starts with "iPhone", take the highest iOS
    runtime version, then the last matching entry within that runtime (simctl lists device
    types oldest-first). Boot: `xcrun simctl boot <udid>` (tolerate "already booted"),
    `open -a Simulator` (so the device is visible — handles "Simulator app not running"),
    `xcrun simctl bootstatus <udid> -b` (blocks until fully booted).
  - Always print `Using simulator <name> (<udid>).` (parity with the Android
    Using-device line).

- [x] **6. Create `scripts/build-install-ios.js`** (entry for `yarn ios`, keep small):
  1. Parse args: `--logs`, `--debug` (+ `--auto-solve` iff Open question 4 resolves to
     include). Unknown args → fail loudly (same as Android).
  2. `acquireBuildLock()` FIRST, then `preflightKillCompetingBuilds()` — same order as
     Android (Round 3 bug fix: never kill a lock-managed build you're about to defer to).
     The existing kill patterns are correct for iOS as-is: `expo run:` / `xcodebuild` /
     Gradle clients; `expo start` (Metro) is deliberately NOT matched on either platform —
     killing a legitimate dev server would be hostile, and a running Metro is harmless to
     a Release/`--no-bundler` build. Add an inline comment documenting this.
  3. Simulator selection (step 5).
  4. Build: spawn `npx expo run:ios --device <udid> --configuration Release --no-bundler`
     (`--debug` mode: `--configuration Debug`, no `--no-bundler`, and skip the clean-exit
     expectation — Metro intentionally lingers; still quiet-built with tee) via
     `runCommandWithProgress` with `silent: true`, `onOutput` teeing to
     `.test-artifacts/builds/<timestamp>-ios.log`, expected duration from
     `getExpectedBuildDuration('ios-release' | 'ios-debug', 300000)`; record duration on
     success. On failure: one-line error + log path + 40-line tail (reuse
     `printBuildLogTail`). Note: no `ios/`-missing guard needed — `expo run:ios` runs
     prebuild itself when the directory is absent (unlike bare gradlew on Android).
  5. Install verification (step 7 below).
  6. Default mode: total-duration line (`RUN_START_MS = Date.now()` at entry — no bash
     phase on iOS) and `process.exit(0)`.
  7. `--logs` mode: step 8 below.

- [x] **7. Install verification** (parity with Android's versionCode+lastUpdateTime):
  `xcrun simctl get_app_container <udid> ch.karimattia.soli app` → app bundle path
  (command fails = not installed → actionable error). Then:
  - CFBundleVersion check: `/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion'
    <app>/Info.plist` === the freshly built bundle's CFBundleVersion (read from the same
    file expo installed from — or simply assert it matches `app.json` ios.buildNumber).
  - Freshness: `Info.plist` mtime (`fs.statSync`) within the last 5 minutes (same window
    as Android). Sub-agent: verify empirically that simctl install refreshes the mtime;
    if it preserves an older build mtime, fall back to the container directory's mtime.
  - Success line: `Install verified: build <CFBundleVersion>, bundle updated <time>.`

- [x] **7a. EMPIRICAL log-channel verification** (done 2026-07-07 against the smoke
  build's fresh Release binary — **result INVERTED the plan's prediction**): (a)
  console-pty carried ONLY native stderr/glog lines (ReactInstance etc.), no
  `[SoliDev]`; (b) the unified log stream (`simctl spawn <udid> log stream --level
  debug --style compact --predicate 'process == "Soli"'`) DOES carry them — RN 0.86
  routes JS console output to os_log at Info level (category
  com.facebook.react.log:javascript), even in Release. Recorded in Intermediary
  learnings + the package guide. → Steps 8-9 shipped, with the channels swapped:
  log stream = the [SoliDev] source, console-pty = crash sentinel only.

- [x] **8. `--logs`**: after install verification, spawn the unified-log-stream child,
  feed it to the existing `createLogMonitor` in LOGS mode (verified: it only consumes
  child.stdout/stderr lines + close — the stream child quacks the same; also verified
  `extractAppLogMessage` parses the real unified-log line format), print
  `Streaming filtered logs (press Ctrl+C to exit).`, SIGINT → `monitor.stop()` → exit 0.
  Crash detection: console-pty relaunch EOF → double-check the app really died via
  `launchctl list` (a pty can die while the app lives — observed during verification)
  → `[CRASH] app process exited` + newest DiagnosticReports `.ips` path, best-effort.

- [x] **9. `--auto-solve`**: attach the stream child + `createLogMonitor` in DEMO mode
  (`totalTimeoutMs` as on Android), launch via
  `xcrun simctl openurl <udid> "soli:///?demo=playlist&games=<N>"`
  (`DEMO_GAME_LIMIT` respected; retrigger launcher = repeat openurl with `#retry-<n>`
  fragment, mirroring the Android launcher). No screen-timeout or unlock handling
  (simulator). Exit codes as on Android. End-to-end verified 2026-07-07 WITHOUT an
  extra build via a harness (real createLogMonitor + real log-stream child + real
  openurl demo link against the smoke-build install): all playlist tokens detected
  through `[DemoPlaylist] Playlist completed (games=1).`, exit 0.

- [x] **10. `package.json`**: `"ios": "node scripts/build-install-ios.js"` (keep the
  script name `yarn ios`).

- [x] **11. AGENTS.md** (concise, Round-3 style — no "as before", no UX descriptions):
  - Testing iOS line → something like: `iOS: Run "yarn ios" — kills competing builds,
    shares the build lock with Android (concurrent invocations fail fast), builds Release
    to the simulator, verifies the install, and exits. Flags: --logs, --debug (Metro dev
    build).` (+ `--auto-solve` if shipped).
  - Parallel-builds paragraph: drop "before iOS builds, check for and kill running builds
    first" — the lock/preflight now covers both platforms.
  - Drop the "Always run a clean build" wording per Open question 2 (flagged).
  - Commands section: update the `yarn ios` bullet to a short pointer (Round-3 pattern).

- [x] **12. Cheap tests** (all pass 2026-07-07): `yarn typecheck` clean, `yarn lint`
  clean, `yarn format` applied to the two touched JS files (then `format:check` clean),
  `bash -n` on run-android-release.sh + android-unlock-pattern.sh OK. Local smoke tests
  without a build: unknown-flag rejection (`--bogus` → exit 1 with supported list),
  `--debug --logs` combo rejection, lock contention with a live holder pid (exit 1,
  platform-neutral message), durations.json corrupt file → fallback 300000, missing
  file → fallback, last-entry-wins estimate, keep-5 trimming verified. (jest skipped —
  scripts/ has no jest coverage and no app code changed, same as Rounds 2-3.)
  Stale-lock recovery not re-smoke-tested (code path unchanged from Android
  round 1, already device-tested).

- [x] **13. Simulator test round** (sub-agent; sequential, never parallel with another
  build; use a timer during builds) — see Testing. Scenario 1 covered by the
  implementation smoke run; scenarios 2-10 executed and PASSED 2026-07-07 by the
  testing sub-agent (evidence in Testing results below). No bugs found; two benign
  observations recorded in Intermediary learnings.

## Plan: Files to modify

- `scripts/lib/android-release.js` → `scripts/lib/build-tools.js` (rename; lock rename;
  duration store)
- `scripts/build-install-ios.js` (new — `yarn ios` entry incl. iOS helpers)
- `scripts/build-install-android.js` (import path; expected-duration seed + record)
- `package.json` (`ios` script)
- `AGENTS.md` (Testing iOS line, parallel-builds paragraph, Commands)
- `docs/external-package-guides/expo-run-ios-and-simctl.md` (new)
- `docs/product/ios-build-workflow/ios-build-workflow.md` (this file)
- NOT `run-android-release.sh` (unchanged), NOT `.gitignore` (`.test-artifacts/` covered)

## Files actually modified

- `scripts/lib/android-release.js` → `scripts/lib/build-tools.js` (git mv; header
  comment; lock renamed to /tmp/soli-build.lock with migration comment;
  platform-neutral lock messages; TTY kill note reworded; duration store
  added: readBuildDurations/getExpectedBuildDuration/recordBuildDuration;
  buildReleaseApk seeds + records 'android-release'; createBuildLogFilePath
  takes an optional suffix for the `-ios` log names; printBuildLogTail,
  createBuildLogFilePath, duration functions exported)
- `scripts/build-install-ios.js` (new — `yarn ios` entry: arg parsing incl.
  --debug escape hatch, simulator selection/boot, quiet Release build via
  wrapped expo run:ios, install verification via get_app_container +
  PlistBuddy + bundle mtime, --logs via simctl launch --console-pty reusing
  createLogMonitor, --auto-solve via openurl demo URI, crash pointer at the
  newest Soli .ips in DiagnosticReports)
- `scripts/build-install-android.js` (require path → ./lib/build-tools)
- `run-android-release.sh` (two comment mentions of the renamed module)
- `package.json` (`ios` script → node scripts/build-install-ios.js)
- `AGENTS.md` (Testing iOS line rewritten; unlock-script line notes it is safe
  when already unlocked; parallel-builds paragraph now points at the shared
  lock; "always run a clean build" dropped per Open question 2 — replaced with
  "incremental by default, clean only after native dependency changes";
  Commands `yarn ios` bullet shortened to the Round-3 pointer style)
- `docs/external-package-guides/expo-run-ios-and-simctl.md` (new)
- `docs/product/ios-build-workflow/ios-build-workflow.md` (this file)
- (Round 4, sibling plan: `scripts/android-unlock-pattern.sh`)

## Intermediary learnings

Pre-implementation research (2026-07-07, planning):

- `expo run:ios` flags verified against docs.expo.dev: `--configuration Release`
  (Debug default), `--no-bundler` (skip Metro; auto-enabled if a dev server already
  serves), `--device <name|udid>` (non-interactive when a value is passed),
  `--no-build-cache` (clears derived data — the "clean build" knob if ever needed).
- RN console logging on iOS (facebook/react-native#27863 + ecosystem research): default
  `RCTLog` writes to stderr, NOT unified logging; release builds default the native
  threshold to Error, so `[SoliDev]` (console.log/info) may not surface anywhere without
  intervention. Hence verification step 7a before building the `--logs` feature.
  `simctl launch --console-pty` is the established agent-workflow way to capture RN
  stdout/stderr on simulators (`--stdout=`/`--stderr=` flags are known-broken; use
  `--console-pty` + shell redirection).
- Android preflight kill patterns confirmed safe for Metro: the pattern is `expo run:`
  (plus xcodebuild/gradle clients) — `expo start` does not match, on either platform.

Implementation learnings (2026-07-07):

- `npx expo run:ios --help` (installed CLI, SDK 57) confirms all planned flags,
  incl. `--device generic` build-only and `-o/--output`.
- **Deviation from step 6.4 wording for `--debug`**: the plan said "still
  quiet-built with tee", but the Acceptance Criteria say "minus the
  noise-reduction" — and they are right: in Debug the expo CLI attaches Metro
  and never exits, so `runCommandWithProgress` would never resolve (progress
  bar forever, no completion line). `--debug` therefore runs the CLI with
  inherited stdio (full output, Metro interactive keys work) and skips the
  progress bar, duration recording, and install verification. Lock-guarded and
  preflight-killed like every mode. Documented inline in the entry.
- `--debug` combined with `--logs`/`--auto-solve` is rejected loudly (Metro
  already streams logs; the demo monitor expects a Release-style clean exit).
- Round 4 (Android unlock check) empirical tokens are in the
  yarn-release-improvements doc; relevant here only insofar as `yarn release`
  no longer produces stray gestures on an unlocked phone between install and
  launch.
- The already-installed simulator app (from a pre-plan manual `yarn ios`) was a
  Debug/Metro build (no embedded main.jsbundle, Info.plist mtime Jul 5) — so
  the step-7a log-channel check had to wait for the smoke build's fresh
  Release binary rather than being verifiable up front.
- **Log channel (7a) — plan prediction inverted**: in this Release build,
  `simctl launch --console-pty` carried only native stderr/glog output, no
  `[SoliDev]`; the unified log stream carried every JS console line at Info
  level (`process == "Soli"` predicate, category
  com.facebook.react.log:javascript). So RN 0.86 DOES write JS console output
  to os_log in Release, and does NOT surface it on the app's stdio. --logs/
  --auto-solve therefore consume the log-stream child; console-pty is kept
  only as the --logs crash sentinel (pty EOF + a launchctl-list liveness
  double-check, because a pty can die while the app lives).
- Install-freshness mtime: the freshly installed .app's Info.plist mtime
  matched the build time (12:17), well within the 5-minute window —
  `fs.statSync` on Info.plist works; the verification also takes the .app dir
  mtime (whichever is newer) as belt-and-braces.
- **Preflight-kill gap found + fixed during the smoke run**: the expo CLI's
  own node process shows in ps as `.../node_modules/expo/bin/cli run:ios`,
  which does NOT contain the literal `expo run:` — a day-old raw `yarn ios`
  (pre-rewire, Metro attached, holding port 8081) survived the preflight kill.
  Added `expo/bin/cli run:` to the kill patterns in build-tools.js (verified:
  matches the CLI process, still spares `expo/bin/cli start`). The old Metro
  on 8081 was harmless to this Release/--no-bundler build (as designed), but
  competing in-flight CLI builds would not have been killed without this.
- `simctl spawn <udid> log stream` prints one harmless stderr line at startup
  (`getpwuid_r did not find a match for uid 501`), surfaced by the monitor's
  stderr passthrough as `logcat stderr: ...`. Cosmetic; left as-is (better to
  over-report stderr than hide it).

Testing-round learnings (2026-07-07, scenarios 2-10):

- In `--logs` output the literal `[SoliDev]` prefix never appears —
  extractAppLogMessage strips it and prints only the message (e.g. `[Game] ...`,
  `[DemoPlaylist] ...`), identical to Android. Graders/agents grepping the stream
  should match app tags, not `[SoliDev]`.
- Foregrounding via plain `simctl openurl soli:///` on an already-running app
  produced no new `[SoliDev]` log lines — use the demo deep link (or real
  interaction) when log activity is needed.
- `--debug` after a Release install replaces the app with a Debug/Metro build
  (no embedded main.jsbundle). After a `--debug` session, run a plain `yarn ios`
  to restore a self-contained Release build before log/demo testing. Note for
  agents: SIGINT-ing only the entry PID (kill -INT) leaves expo's separate
  `expo/bin/cli start` Metro child alive on 8081 — an interactive Ctrl+C signals
  the whole process group and would take Metro down too; when killing
  programmatically, also kill the Metro child (observed + cleaned up in the
  test round).
- Warm `yarn ios` is ~52-57s on this machine; simulator cold boot adds ~20s
  (01:18 total when booting from shutdown).

## Identified issues

- **FIXED (2026-07-07, found during the smoke run)**: preflight kill patterns
  missed real expo CLI processes (`expo/bin/cli run:` vs the literal
  `expo run:`); pattern added + verified against the live stale process.
- **CLOSED (2026-07-07, testing round)**: `--logs`/`--auto-solve`/`--debug`
  exercised through the full `yarn ios` entry; lock contention iOS<->iOS and
  iOS<->Android (both directions), warm rebuild seeding, simulator hardening
  (booted pick / none booted / bogus SOLI_IOS_SIMULATOR) all pass — see
  Testing results (scenarios 2-10). Multi-booted case skipped (would require
  booting a second heavy simulator; only one iPhone device exists in this
  environment anyway).
- **Observation**: multi-arg devLog lines render with the unified-log quoting
  (e.g. `[CelebrationHandoff] queued', { ts: ...`) — slightly noisier than
  Android's logcat rendering but fully greppable. Left as-is.

## Testing

Cheap tests first (step 12). Then simulator, strictly sequential:

1. **First `yarn ios`** (cold-ish): simulator picked + printed, progress bar with a
   seeded estimate (default 300s on first run), quiet console, full log in
   `.test-artifacts/builds/<ts>-ios.log`, install-verified line, app visibly launched on
   the simulator, exit 0, **no lingering processes** (`ps` shows no node/expo/Metro
   child; explicitly check no Metro on port 8081).
   **DONE 2026-07-07 (implementation smoke run, cold build)**: exit 0 in 7:54.
   Console lines verbatim: `Using simulator iPhone 17 Pro
   (FFCFCBD6-DF2D-41B2-ADB9-5BBA2D923E4C).`, `Building iOS Release app via expo
   run:ios...`, progress bar seeded 05:00 (default, first run) growing dynamically
   through the cold pod compile, `[==========] 10/10 - completed in 07:53`,
   `Full build log: .../.test-artifacts/builds/20260707-120915-ios.log`,
   `Install verified: build 13, bundle updated 12:17:02 PM.`,
   `Build, install, and launch completed successfully in 07:54.` durations.json
   now `{"ios-release":[473746]}`; lock dir removed; app running on the simulator
   (launchctl list shows UIKitApplication:ch.karimattia.soli) with an embedded
   main.jsbundle (true Release); no lingering process from THIS run and port 8081
   freed after the preflight-kill fix removed the pre-existing stale Metro.
2. **Warm rebuild** (touch a TS comment): estimate now seeded from run 1's duration
   (remaining time roughly sane), total line plausible; revert the touch.
3. **Lock contention iOS<->iOS**: second `yarn ios` mid-build fails <2s with the holder
   message, zero kill lines, first run unaffected.
4. **Mutual exclusion iOS<->Android**: start `yarn release` during a `yarn ios` build →
   fails fast at the shared lock; and vice versa. (Never let two builds actually run.)
5. **Preflight kill**: stray fake `xcodebuild` process (e.g. a sleep with xcodebuild in
   its command string on a pty) gets killed + attributed; a running `expo start` survives.
6. **Simulator hardening**: (a) exactly one booted → used; (b) none booted + Simulator
   app closed → default picked, booted, `open -a Simulator` brings UI up; (c) two booted
   → most recently booted picked + printed; (d) `SOLI_IOS_SIMULATOR="iPhone <model>"`
   honored; bogus value → error listing available names.
7. **`--logs`** (if shipped): `[SoliDev]` lines stream after interacting with the app;
   Ctrl+C exits 0, no lingering pty/log-stream child. Kill the app from the simulator →
   `[CRASH] app process exited` path fires.
8. **`--auto-solve`** (if shipped): `DEMO_GAME_LIMIT=1 yarn ios --auto-solve` completes a
   playlist game and exits 0.
9. **`--debug`**: builds Debug, Metro attaches (intentionally lingering), still
   lock-guarded.
10. **Android retrofit sanity**: one `yarn release` — progress estimate seeded from
    durations.json (check the file updated), everything else unchanged.

### Testing results (2026-07-07, testing sub-agent; iPhone 17 Pro simulator + physical A065; all PASS)

Scenario numbering below follows the orchestrator's test procedure (1 = warm build;
the cold build was scenario 1 of the implementation smoke run above).

1. **Warm `yarn ios`**: exit 0 in 00:57 (vs 07:54 cold). First progress line
   `[=.........] 1/10 elapsed 00:00 remaining 07:54` — seeded from the cold build's
   473746ms durations.json entry, not the 05:00 default. `Install verified: build 13,
   bundle updated 12:32:47 PM.`, `Build, install, and launch completed successfully
   in 00:57.` durations.json gained a 56787ms entry; lock dir gone; port 8081 free;
   no expo/Metro processes. Subsequent warm builds seeded ~00:54-00:57 (last-entry
   estimate tracks the warm state).
2. **iOS↔iOS lock**: second `yarn ios` started ~15s into a running one aborted in
   ~0.5s, exit 1, with exactly `Another build (Android or iOS) is already running
   (pid 64002). Wait for it or kill it, then rerun.` — zero kill lines; first run
   completed untouched (exit 0 in 00:54).
3. **Mutual exclusion, both directions**: (a) `yarn release` started ~12s into a
   `yarn ios` build → exit 1 in ~1.3s with the same lock message (pid 66249); iOS
   build finished exit 0 in 00:52. (b) `yarn ios` started ~12s into a `yarn release`
   (TS comment touched for a real ~30s build) → exit 1 in ~0.7s (pid 68796); Android
   build finished exit 0 in 00:37 (`Installed APK in 00:03.`). Run (b) doubled as
   Round 4 R4.4(d) — see the yarn-release-improvements doc.
4. **Preflight kill + Metro survival**: real `npx expo start` serving 8081
   (status 200) → warm `yarn ios` exit 0 with NO kill lines; Metro still served 200
   after; killed manually, port freed.
5. **`yarn ios --logs`**: after install verification, `Streaming filtered logs
   (press Ctrl+C to exit).`; app lines streamed from the unified log after a demo
   deep link (`[DemoPlaylist] Game 1/1 loaded ...` → `[DemoPlaylist] Playlist
   completed (games=1).`). NOTE: the `[SoliDev]` prefix is stripped by
   extractAppLogMessage (same rendering as Android). SIGINT → `Received SIGINT,
   stopping log monitor...`, exit 0, lock released, no log-stream/pty children.
6. **`DEMO_GAME_LIMIT=1 yarn ios --auto-solve`**: exit 0 in 78s total (warm build
   included). Retrigger fired once (`Demo load signal not detected yet,
   re-triggering demo URI...`), then all tokens through `Detected demo playlist
   completion.`
7. **Simulator hardening**: booted sim → `Using simulator iPhone 17 Pro
   (FFCFCBD6-...).`; after `simctl shutdown all` → `Using simulator iPhone 17 Pro
   (FFCFCBD6-...), booted it.`, exit 0 in 01:18 (boot included);
   `SOLI_IOS_SIMULATOR="iPhone Bogus 99"` → exit 1,
   `matches no available simulator. Available: iPhone 17 Pro` (lock released — next
   run acquired fine). Multi-booted case skipped (only one iPhone device exists in
   this environment; booting a second heavy simulator not worth it per instructions).
8. **`--debug` sanity**: printed `Debug mode: full expo output, Metro attached —
   Ctrl+C to stop.` + the full `npx expo run:ios ... --configuration Debug` command,
   full xcodebuild output, Metro on 8081; SIGINT ~30s in → lock released, expo
   children gone, shell exit 0. Lingering Metro killed manually; a follow-up
   `yarn ios` restored the Release build (embedded main.jsbundle verified).
9. **Flag validation**: `--bogus` → exit 1, `Unknown argument(s): --bogus.
   Supported: --logs, --auto-solve, --debug`; `--debug --logs` → exit 1, `--debug
   attaches Metro (which already streams logs) and cannot be combined with
   --logs/--auto-solve.`
10. **Android retrofit**: warm `yarn release` seeded `remaining 00:32` from the
    prior 31820ms entry (not the 60s default), `Using device A065
    (192.168.1.12:5555).`, `Installed APK in 00:03.`, `Build, install, and launch
    completed successfully in 00:10.`, exit 0; durations.json android-release now
    [31820, 4578] (keep-5 trimming also observed on ios-release: the 473746 cold
    entry rotated out after 5 warm builds).

## Follow-ups

- **`--logs`/`--auto-solve` if 7a fails** (Open questions 3/4): revisit with
  `RCTSetLogThreshold` in AppDelegate or os_log routing for devLog. Pro: full parity.
  Con: native change / new dep for a debug convenience. Recommendation: only if the
  console-pty path genuinely fails.
- **Physical iPhone support**: out of scope (simulator-only per AGENTS.md testing setup);
  `expo run:ios --device` would support it, but signing + device pairing is its own plan.
- **Reusable testing skill** (from yarn-release Round 3 follow-ups): with both platforms
  unified, moving the workflow out of AGENTS.md into a skill gets more attractive. Still
  deferred by Karim.
