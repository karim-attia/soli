# yarn release improvements — preflight kill, lock, quiet progress, exit-by-default, stability

Plan created 2026-07-06. Round 1 (steps 1-13) implemented and real-device tested 2026-07-06. Round 2 (R1-R7: kill attribution, naming, output cleanup, --auto-solve, alias pinning) implemented and real-device tested 2026-07-07 — all tests pass (one bug found and fixed per round: R1's TTY note used a blocking `writeFileSync('/dev/<tty>')` that could hang the run for minutes; now opened with O_NONBLOCK|O_NOCTTY). Round 3 (lock-before-kill bug fix, `Installed APK in mm:ss.` line, total-duration final line incl. the bash phase, device model in the Using-device line, AGENTS.md concision) implemented and real-device tested 2026-07-07 — see the Round 3 section at the bottom.
Round 4 (unlock check before swiping the pattern) implemented and device-verified
2026-07-07 — see the Round 4 section at the bottom; R4.4(d) (full yarn release on an
unlocked phone, no gestures) closed 2026-07-07 in the iOS-plan testing round. The
sibling iOS plan is docs/product/ios-build-workflow/ios-build-workflow.md (implemented
+ fully tested; `yarn release` also gained duration-seeded progress estimates and the
shared cross-platform /tmp/soli-build.lock from that plan — both device-verified).

## User prompt

Prompt 1:

> yarn release
>
> pls comment on ideas and tell me what makes sense
>
>     auto kill other processes instead of letting agents do it → consumes
>
>     close process except if flag to listen to logs. but off by default
>
>     check yarn prod script. there we have some cool stuff. e.g. that it shows elapsed time and not verbose build stuff.
>
>     recommendations for stability?
>
>     other recommendations?
>
>     wild idea: small app on phone that turns on wireless debugging. even wilder: something that works through internet and doesn’t need to be in same wifi? would sometimes be helpful. search web.

Prompt 2:

> implement 1-4
> is yarn prod just yarn release with logs? shouldn't this then be a flag?

## Summary

Implemented and real-device tested 2026-07-06 (all 13 steps done). `yarn release`
now: preflight-kills competing build clients (sparing idle Gradle daemons), takes a
mkdir-based build lock in /tmp (stale locks auto-recovered via dead-pid check), builds
via bare `./gradlew app:assembleRelease` (no expo CLI, no --no-daemon) with the quiet
progress bar, tees the full Gradle output to `.test-artifacts/builds/<timestamp>.log`,
installs with one reconnect retry on connection-type errors, verifies the install
(versionCode from output-metadata.json + lastUpdateTime within 5 min), launches
`soli:///`, and exits 0. `--logs` (alias `yarn prod`) additionally streams filtered
[SoliDev] logs with [CRASH] detection until Ctrl+C. `run-android-release.sh` keeps
env/signing/adb discovery, adds best-effort tcpip-5555 pinning, and execs the Node
entry. `run-demo-autosolve.js` shrank to a thin demo consumer of the shared module
`scripts/lib/android-release.js` (prod mode removed); `prod:no-timeout` deleted.
Cheap tests + local smoke tests (lock, stale lock, preflight kill, arg parsing) pass.
Real-device test run 2026-07-06 (physical Android over wireless adb): all scenarios
pass — see Testing results. One bug found + fixed: on build failure, main()'s catch
re-printed the runCommand error whose message embedded the entire captured Gradle
output (~600 raw lines), defeating the quiet console; buildReleaseApk now rethrows
a one-line error pointing at the log file.

## Description

Karim runs AI agents that build and test autonomously on a physical Android phone via
`yarn release` (20x+/day per docs/product/faster-builds/). Three pain points today:

1. **Verbose output**: `yarn release` ends in `yarn expo run:android --variant release`,
   which dumps the full Gradle/expo CLI output. `yarn prod` (scripts/run-demo-autosolve.js)
   already solved this with a quiet progress bar (elapsed/remaining time, no Gradle noise) —
   but the two paths are entirely separate implementations.
2. **Lingering process + manual chores**: agents must remember to kill competing builds
   before running (AGENTS.md instructs this manually), verify the install actually landed,
   and the process behavior differs between `yarn release` (expo CLI stays attached) and
   `yarn prod` (streams logcat forever). Tokens and wall time are wasted on these chores.
3. **Stability**: Wi-Fi adb port rotation killed benchmark runs before
   (docs/product/faster-builds/ Testing section); install failures from transient adb
   disconnects have no retry; build failures leave no greppable artifact when output is
   quieted.

Decided changes (ideas 1–4 from the prompts; **do not re-litigate**):

1. Preflight kill of competing build processes + a build lock.
2. Exit after install by default; `--logs` flag streams filtered logcat; `yarn prod`
   becomes a thin alias for `yarn release --logs`.
3. Consolidate the two build paths into one shared Node module with the progress-bar UX;
   drop `expo run:android` and `--no-daemon`.
4. Stability: optional adb TCP port pinning, install verification, timestamped build log
   file, one install retry after reconnect.

Idea 5 (phone app that toggles wireless debugging / works over the internet, e.g.
Tailscale) is explicitly **out of scope** — see Follow-ups.

## Acceptance Criteria

- Running `yarn release` while another `expo run:` / `xcodebuild` / in-flight Gradle
  build client is running: those processes are killed first, and a line per killed
  process is printed (`Killed competing build process: <pid> <name>`). Idle Gradle
  daemons are NOT killed.
- Starting a second `yarn release` while one is running: the second fails fast (< 2s)
  with a clear message naming the holder PID. A crashed previous run (stale lock) does
  not block: stale locks are detected via dead PID and removed automatically.
- Default `yarn release`: env + signing patch + adb discovery (unchanged), then quiet
  Gradle build with progress bar (`[====......] 4/10 elapsed 00:41 remaining 00:22`),
  adb install, install verification message, app launch via `soli:///` deep link,
  then the process **exits 0** with no lingering children.
- `yarn release --logs`: same as above, then streams the `[SoliDev]`-filtered logcat with
  `[CRASH]`-prefixed crash detection until Ctrl+C (exit 0 on Ctrl+C).
- `yarn prod` behaves identically to `yarn release --logs`.
- `yarn demo:auto-solve` (and `DEMO_GAME_LIMIT=1 yarn demo:auto-solve`) works exactly as
  before (playlist deep link, demo tokens, screen-timeout save/restore, exit code on
  playlist success/failure), but through the shared module.
- Full Gradle output for every build is written to `.test-artifacts/builds/<timestamp>.log`;
  on build failure the console prints the log path and the last ~40 log lines.
- If `adb install` fails with a connection-type error (not signature mismatch), one
  reconnect + reinstall attempt happens automatically before failing.
- After install, versionCode and lastUpdateTime of the installed package are checked
  against the freshly built APK; a stale install fails loudly with an actionable message.
- AGENTS.md Testing section no longer tells agents to manually kill builds or verify
  installs; it says `yarn release` does this itself.

## Possible approaches incl. pros and cons

**Where do preflight-kill and the lock live?**

- (a) In `run-android-release.sh` (bash). Pro: runs before anything else. Con: bash
  process-matching is fiddly; `yarn demo:auto-solve` (which also builds) would bypass
  both the kill and the lock.
- (b) **CHOSEN**: In the shared Node module (`scripts/lib/android-release.js`), called
  first thing by both Node entries (`build-install-android.js` and
  `run-demo-autosolve.js`). Pro: one implementation, both build paths protected, easy
  unit-ish testing, Node has good `ps` parsing. Con: the shell script's adb discovery
  runs before the lock — acceptable, discovery is read-mostly and idempotent (worst
  interleaving: two discoveries race, then the second entry fails at the lock).

**Lock mechanism** (macOS has no `flock` binary by default):

- (a) `shlock` (exists on macOS in /usr/bin). Con: obscure, per-file semantics.
- (b) **CHOSEN**: mkdir-based lock — `fs.mkdirSync(LOCK_DIR)` is atomic; write a `pid`
  file inside; on `EEXIST` read the pid, `process.kill(pid, 0)` to test liveness; if
  dead, remove and retry once (stale-lock recovery); else fail fast. Release via
  `process.on('exit')` + try/finally. Lock path: `/tmp/soli-android-build.lock`
  (tmp, not repo, so a `git clean` can't confuse it and it's shared across worktrees).

**Consolidation shape**:

- (a) Rewrite everything (incl. adb discovery) in Node. Pro: one language. Con: the
  bash discovery (mDNS, alias derivation, server-owner repair) is battle-tested and
  ~300 lines; porting risks regressions for zero UX gain.
- (b) **CHOSEN**: keep `run-android-release.sh` for env loading + signing patch + adb
  discovery; it ends by exec-ing `node scripts/build-install-android.js "$@"` with
  `ANDROID_SERIAL` exported. Shared logic extracted from `run-demo-autosolve.js` into
  `scripts/lib/android-release.js`; `run-demo-autosolve.js` becomes a thin demo-mode
  consumer of the same module.

**Does dropping `expo run:android` lose an implicit codegen step?** Investigated:
no. Expo autolinking runs from `android/settings.gradle` and RN codegen runs as Gradle
tasks, both at Gradle time; `expo run:android` only regenerates `android/` if it is
missing. Proof by existence: `run-demo-autosolve.js` has been building successfully via
bare `./gradlew app:assembleRelease` for months. Guard to add: if `android/` does not
exist, fail with "run `yarn prebuild:android` first". Document this finding as an inline
comment in the shared module.

**`--no-daemon`**: dropped from the Gradle invocation so warm daemons are reused
(faster warm builds — the whole point of sparing idle daemons in the preflight kill).
Trade-off: a stale daemon (e.g. after AGP/JDK changes) can occasionally cause weird
failures; remedy is `./gradlew --stop`. Document this trade-off as an inline comment
next to the gradle invocation.

## Open questions to the user

1. **adb `tcpip 5555` pinning: default-on best-effort vs opt-in?** Pinning makes
   reconnects deterministic (`adb connect <ip>:5555` always works; mDNS ports rotate)
   but `adb tcpip 5555` restarts adbd and drops the live connection, requiring a
   reconnect step that can itself fail.
   - Default-on best-effort (pin right after connection established, reconnect to
     `<ip>:5555` with ~10s retry, fall back to the just-working rotating-port serial on
     failure): pro — every run self-heals toward determinism; con — adds a few seconds
     and a small failure surface to every run on a non-pinned connection.
   - Opt-in via env (`ADB_PIN_TCPIP=1`): pro — zero risk to the happy path; con — nobody
     remembers to set it, so the flakiness stays.
   - **Recommendation: default-on best-effort with strict fallback** (never fail the
     build because pinning failed; print what happened). Implemented in the bash script
     where the connection logic already lives.
2. **Remove the `prod:no-timeout` script?** It passes `--no-prod-timeout`, which
   `run-demo-autosolve.js` never parses — it is a no-op today (prod mode has no timeout
   at all). **Recommendation: delete the script entry** (simplification, dead code).
3. **Should `yarn demo:auto-solve` also gain the shell script's wireless adb discovery?**
   It currently uses plain `adb devices` and fails if nothing is connected.
   **Recommendation: no** (scope creep; demo runs normally happen right after a
   `yarn release` when the device is already connected). Note in Follow-ups.

## Dependencies

- None new. Node built-ins (`child_process`, `fs`, `path`) only. No package guides needed.

## UX/UI Considerations

Console UX only (no app UI):

- Progress bar identical to the existing one in `run-demo-autosolve.js`
  (`createProgressTracker`): 10-segment bar, elapsed + estimated remaining, completion
  line with measured duration. Non-TTY fallback already handled (prints changed lines).
- Preflight kills, lock holder, install verification, log-file path: one concise line
  each, prefixed consistently (reuse the existing `log()` style; rename the `[demo]`
  prefix to `[soli]` in the shared module so it is not misleading in release mode).

## Components

Not applicable (no app components). Script modules:

- **Create** `scripts/lib/android-release.js` — shared module (details below).
- **Create** `scripts/build-install-android.js` — small entry for `yarn release`.
- **Modify** `scripts/run-demo-autosolve.js` — demo-only consumer of the shared module.
- **Modify** `run-android-release.sh` — swap `expo run:android` for the Node entry;
  add tcpip pinning.
- **Modify** `package.json`, `AGENTS.md`.

## How to fetch data, how to cache

Not applicable.

## Related tasks

- docs/product/faster-builds/faster-builds.md — this plan implements its "Intermediary
  learnings" lever (a): bypass the expo CLI wrapper (`./gradlew` + `adb install` +
  `am start` directly), estimated to shave several seconds of expo CLI startup/config
  off every warm loop. Keep that doc's arm64-only ABI override working (see below).
- docs/product/android-release-adb-selection/ — prior work on the adb discovery this
  plan deliberately keeps in bash.

## Simplification ideas

- Delete `prod:no-timeout` from package.json (dead flag, see Open question 2).
- After refactor, `run-demo-autosolve.js` loses its copies of env parsing, progress
  tracker, runCommand, install, unlock, screen-timeout helpers (~300 lines) — net LOC
  down even after adding the new entry.
- Remove `MODES`/`parseMode` prod handling from `run-demo-autosolve.js` entirely: prod
  mode is now `yarn release --logs`. (`yarn prod` alias preserves the muscle memory.)
- Move the `ORG_GRADLE_PROJECT_reactNativeArchitectures=arm64-v8a` default into the
  shared module's build function (`process.env.ORG_GRADLE_PROJECT_reactNativeArchitectures ??= 'arm64-v8a'`)
  so demo builds get the single-ABI speedup too. Keep the export in
  `run-android-release.sh` OR remove it there in favor of the module — prefer removing
  (single source of truth); carry over the existing explanatory comment (Play Store
  builds via build-android.sh are unaffected).

## Steps to implement

Statuses: [ ] todo, [x] done. Implementation sub-agent: update after EACH step.

- [x] **1. Create `scripts/lib/android-release.js`** by extracting from
  `scripts/run-demo-autosolve.js` (move, don't duplicate). Exports (suggested names):
  - `log(message)` / `logError(message)` — with `[soli]` prefix.
  - `loadReleaseSigningEnv()` — move `parseEnvFile`, `stripMatchingQuotes`,
    `REQUIRED_SIGNING_ENV_KEYS`, `ENV_FILE_PATH` as-is. (Skippable by the release entry
    since `run-android-release.sh` already exported the env — but calling it is harmless
    and keeps the demo path working; it only fills unset vars.)
  - `runCommand(command, args, options)` and `runCommandWithProgress(...)` +
    `createProgressTracker(...)` and all progress constants — as-is.
  - `preflightKillCompetingBuilds()` — see step 2.
  - `acquireBuildLock()` / `releaseBuildLock()` — see step 3.
  - `buildReleaseApk({ logFilePath })` — see step 4.
  - `installReleaseApk(deviceSerial)` — existing signature-mismatch diagnostics, plus
    connection-error retry (step 5).
  - `verifyInstallLanded(deviceSerial)` — step 6.
  - `ensureDevice()`, `unlockDevice(deviceSerial)`, `getScreenOffTimeout` /
    `setScreenOffTimeout`, `quoteAndroidShellArg`, `startLogcatListener` — as-is.
  - `extractAppLogMessage`, crash-detection constants, and a
    `createLogMonitor({ mode, logcat, launchApp })` that keeps both behaviors:
    prod/logs mode (print `[SoliDev]` messages + `[CRASH]` lines, resolve only on
    stop()) and demo mode (all playlist tokens/timeouts as today). Keeping the existing
    single monitor with a mode switch is fine — minimal diff.
  - `launchApp` helper: generalize `createLauncherForMode` to take a `uri` instead of a
    mode (release entry passes `soli:///`, demo entry passes the playlist URI with
    retry-fragment behavior).
  - Constants that stay shared: `PACKAGE_NAME`, `APP_LOG_PREFIX`, `RELEASE_APK_PATH`,
    `ANDROID_PROJECT_PATH`, `SIGNATURE_MISMATCH_MARKERS`, etc. Demo-only constants
    (playlist tokens, `DEMO_GAME_LIMIT`, retrigger timeout) stay in
    `run-demo-autosolve.js`.

- [x] **2. Preflight kill** (`preflightKillCompetingBuilds()`), called before the lock:
  - Enumerate with `ps -axo pid,command` (via `runCommand`, silent) and kill (SIGTERM,
    then SIGKILL after ~3s if still alive) processes whose command matches:
    - `expo run:` (other expo build invocations, iOS or Android)
    - `xcodebuild` (in-flight iOS builds)
    - Gradle build **clients**: command containing `GradleWrapperMain` or
      `org.gradle.launcher.GradleMain`, or a `gradlew` shell process.
  - **Do NOT kill** processes matching `GradleDaemon`
    (`org.gradle.launcher.daemon.bootstrap.GradleDaemon`) — idle daemons make warm
    builds fast. Killing a busy daemon's *client* is sufficient: Gradle daemons cancel
    the in-flight build when their client disconnects, then return to idle. Put this
    exact reasoning in an inline comment.
  - Exclude self: skip `process.pid`, its ancestors (walk `ps -o ppid=` up), and any pid
    in our own process group — prevents `yarn release` killing its own `yarn`/`sh`
    wrapper because the command string contains "release".
  - Print one line per kill: `Killed competing build process: <pid> <first ~80 chars of command>`.
    Print nothing if nothing matched.

- [x] **3. Build lock** (`acquireBuildLock()`):
  - `LOCK_DIR = '/tmp/soli-android-build.lock'`; `fs.mkdirSync(LOCK_DIR)` (atomic),
    then write `${LOCK_DIR}/pid`.
  - On `EEXIST`: read pid; if `process.kill(pid, 0)` throws `ESRCH` → stale → remove
    dir, retry once; otherwise throw:
    `Another Android build is already running (pid <pid>). Wait for it or kill it, then rerun.`
  - Release in `process.on('exit')` and on SIGINT/SIGTERM (recursive rmSync). Note
    inline: mkdir-lock chosen because macOS ships no `flock` binary.

- [x] **4. `buildReleaseApk({ logFilePath })`**:
  - Guard: `android/app/build.gradle` must exist, else throw
    `android/ not found — run "yarn prebuild:android" first.`
  - Default the ABI env var (see Simplification ideas) with the carried-over comment.
  - Spawn `./gradlew app:assembleRelease --console=plain` (cwd `android/`,
    env `process.env`). `--no-daemon` removed — inline comment: removed 2026-07 so warm
    daemons are reused (preflight kill intentionally spares idle daemons); if a stale
    daemon misbehaves after toolchain upgrades, run `./gradlew --stop`.
  - Pipe stdout+stderr line-by-line to `logFilePath`
    (`.test-artifacts/builds/<YYYYMMDD-HHmmss>.log`, `fs.mkdirSync(dir, {recursive:true})`;
    `.test-artifacts/` is already gitignored — verified 2026-07-06, no .gitignore change
    needed). Console shows only the progress tracker.
  - On failure: progress `fail()`, then print
    `Build failed. Full Gradle log: <logFilePath>` + last ~40 lines of the log.
  - On success: print the log path once at normal verbosity too (agents grep it for
    warnings).

- [x] **5. Install retry** in `installReleaseApk`:
  - Classify errors: signature mismatch (existing markers) → existing actionable throw,
    no retry. Connection-type markers (`device offline`, `not found`, `no devices`,
    `connection reset`, `closed`, `cannot connect`) → attempt `adb connect <serial>`
    (only if serial looks like `ip:port`) + 2s wait + `adb -s <serial> get-state`
    check, then retry the install **once**. Anything else → fail immediately.

- [x] **6. `verifyInstallLanded(deviceSerial)`**:
  - Read expected `versionCode` from
    `android/app/build/outputs/apk/release/output-metadata.json` (written by AGP next to
    the APK; avoids an `aapt` dependency).
  - `adb -s <serial> shell dumpsys package ch.karimattia.soli` → parse `versionCode=`
    and `lastUpdateTime=`.
  - Checks: installed versionCode === APK versionCode, AND lastUpdateTime parsed as a
    date within the last 5 minutes (guards the same-versionCode-but-stale case,
    which is the common local-dev case since versionCode rarely bumps).
  - Success: `Install verified: versionCode <n>, updated <time>.`
    Failure: throw with message naming both values and suggesting
    `adb uninstall ch.karimattia.soli` / checking the device connection.

- [x] **7. Create `scripts/build-install-android.js`** (entry for `yarn release`;
  keep it small, ~80 lines):
  1. Parse args: `--logs` (boolean). Unknown args → error out (fail loudly, agents
     mistype flags).
  2. `preflightKillCompetingBuilds()` → `acquireBuildLock()`.
  3. `loadReleaseSigningEnv()` (no-op when shell already exported).
  4. Device: use `process.env.ANDROID_SERIAL` when set (the shell script's discovery
     result), else `ensureDevice()`.
  5. `buildReleaseApk(...)` → `installReleaseApk(...)` → `verifyInstallLanded(...)`.
  6. `unlockDevice()` (best-effort, swallow errors), launch `soli:///` via the launch
     helper.
  7. No `--logs`: print a completion line and `process.exit(0)` — inline comment: exit
     by default so autonomous agent runs never hang on a lingering process; log
     streaming is opt-in via --logs.
  8. `--logs`: `adb logcat -c`, start logcat listener + `createLogMonitor` in
     prod/logs mode, print the "Streaming filtered logs (press Ctrl+C to exit)" line,
     SIGINT handler → `monitor.stop()` → exit 0. Do NOT touch screen-off timeout here
     (only demo automation needs the screen forced on).

- [x] **8. Rewire `run-android-release.sh`**:
  - Replace `EXPO_RELEASE_COMMAND=(yarn expo run:android --variant release)` /
    its invocation with `exec node "${ROOT_DIR}/scripts/build-install-android.js" "$@"`
    (exec: no extra lingering shell parent; `"$@"` forwards `--logs`).
  - Remove the `ORG_GRADLE_PROJECT_reactNativeArchitectures` export if moved to the
    module (keep the comment where it lands).
  - Add tcpip pinning per Open question 1 recommendation: after `ANDROID_SERIAL` is
    established and only when it matches `ip:port` with port != 5555 — run
    `adb -s <serial> tcpip 5555`, then try `adb connect <ip>:5555` for up to ~10s;
    on success `export ANDROID_SERIAL=<ip>:5555`, on failure print a note and keep the
    original serial (never fail the run for this). Inline comment: tcpip restarts adbd
    and drops the connection, hence the reconnect loop + strict fallback.

- [x] **9. Refactor `scripts/run-demo-autosolve.js`**: import everything shared from
  `scripts/lib/android-release.js`; delete moved code; remove prod-mode handling
  (`MODES`, `parseMode`, `PROD_MODE_READY_MESSAGE`, `BASE_APP_URI`) — inline comment
  pointing prod users to `yarn release --logs`. Keep: playlist URI building, demo
  tokens/monitor wiring, screen-off save/restore, retrigger logic, exit-code semantics.
  Add `preflightKillCompetingBuilds()` + `acquireBuildLock()` at the start (it builds
  too, so it must hold the same lock).

- [x] **10. `package.json`**:
  - `"prod": "yarn release --logs"` (thin alias — yarn forwards trailing args to the
    script, and the shell script forwards `"$@"` to Node).
  - Delete `"prod:no-timeout"` (dead flag — see Open question 2; flag if user objects).
  - `"demo:auto-solve"` unchanged.

- [x] **11. AGENTS.md Testing section update**. Replace the two paragraphs
  ("Never run two builds at the same time ... Kill the other build first, then build,
  then test." and "Check if the build was actually installed on the device or the
  device/emulator.") and the Android line with wording like:
  - Android: `Run "yarn release" — it kills competing builds itself, takes a build lock
    (a second concurrent invocation fails fast), shows a quiet progress bar (full Gradle
    log in .test-artifacts/builds/), verifies the install landed, launches the app, and
    exits. Use "yarn release --logs" (alias: yarn prod) to stream filtered [SoliDev]
    logs + crash detection until Ctrl+C.`
  - Keep the spirit: `Still never start two builds in parallel yourself (e.g. yarn ios
    and yarn release simultaneously) — the machine can't handle it. For iOS builds,
    manually check for/kill competing builds as before.`
  - Keep the unlock-script line and iOS instructions as-is.
  - Update the Commands section: `yarn release` description + `yarn release --logs`.

- [x] **12. Cheap tests + lint hygiene**: `yarn typecheck && yarn lint && yarn jest`.
  `scripts/` is covered by oxlint (package.json lint script includes `scripts`); the
  new files are plain JS so typecheck should be unaffected (tsconfig scope) — verify.
  Run `yarn format` on the new/changed JS.
  Result 2026-07-06: all pass (typecheck clean, lint clean, jest 24 suites /
  204 tests pass, oxfmt clean). Local smoke tests also pass: unknown-flag rejection,
  lock contention message + release-on-exit, stale-lock recovery (dead pid removed),
  preflight kill of a fake gradlew client while sparing the idle GradleDaemon.

- [x] **13. Real-device test run** (see Testing results below) — done 2026-07-06,
  all scenarios pass; one bug found and fixed (verbose console on build failure).

## Plan: Files to modify

- `scripts/lib/android-release.js` (new — shared module)
- `scripts/build-install-android.js` (new — `yarn release` Node entry)
- `scripts/run-demo-autosolve.js` (refactor to consume shared module, demo-only)
- `run-android-release.sh` (hand off to Node entry; tcpip pinning; remove expo run)
- `package.json` (prod alias, delete prod:no-timeout)
- `AGENTS.md` (Testing + Commands sections)
- `docs/product/yarn-release-improvements/yarn-release-improvements.md` (this file)
- NOT `.gitignore` (`.test-artifacts/` already ignored — verified)

## Files actually modified

- `scripts/lib/android-release.js` (new — shared module: log helpers, signing env,
  progress tracker, runCommand, preflight kill, mkdir lock, buildReleaseApk with
  log file, installReleaseApk with connection retry, verifyInstallLanded,
  device/screen/unlock/logcat helpers, createLauncher, createLogMonitor;
  step-13 fix: buildReleaseApk rethrows a one-line error on failure instead of
  the runCommand error that embeds the full Gradle output)
- `scripts/build-install-android.js` (new — `yarn release` Node entry; --logs flag)
- `scripts/run-demo-autosolve.js` (refactored to thin demo consumer, ~140 lines,
  down from ~850; prod mode removed)
- `run-android-release.sh` (exec Node entry; tcpip-5555 pinning; ABI export moved
  to shared module)
- `package.json` (`prod` → `yarn release --logs`; `prod:no-timeout` deleted)
- `AGENTS.md` (Testing + Commands sections)
- `docs/product/yarn-release-improvements/yarn-release-improvements.md` (this file)

## Intermediary learnings

- Pre-implementation findings (2026-07-06, planning):
  - `.test-artifacts/` is already gitignored (last line of .gitignore).
  - `--no-prod-timeout` in the `prod:no-timeout` script is a no-op — never parsed.
  - Bare `./gradlew app:assembleRelease` needs no expo codegen step: autolinking +
    RN codegen run inside Gradle; `run-demo-autosolve.js` proves it works.
  - `yarn prod` previously skipped the signing patch and wireless adb discovery
    (plain `adb devices`); as an alias of `yarn release --logs` it now gets both —
    strictly more robust, no known downside.
  - AGP writes `output-metadata.json` (contains versionCode/versionName) next to the
    APK — use it for install verification instead of requiring `aapt` on PATH.

Implementation learnings (2026-07-06):

- **Deviation from step 1/9 wording**: the demo playlist tokens and the retrigger
  logic live in the shared module's `createLogMonitor` (mode switch), not in
  `run-demo-autosolve.js`. Step 1 explicitly allowed "keeping the existing single
  monitor with a mode switch" and splitting the tokens from the monitor's
  success/failure/retrigger state machine would have duplicated state handling.
  Demo-sizing values that depend on `DEMO_GAME_LIMIT` (`totalTimeoutMs`) are
  passed in by the demo entry.
- Lock signal handling: `acquireBuildLock`'s SIGINT/SIGTERM handlers release the
  lock but only force-exit when they are the *only* listener
  (`process.listenerCount(signal) <= 1`). Entries with a graceful shutdown path
  (--logs / demo monitor stop → `process.exit`) exit themselves, and the `exit`
  hook releases the lock idempotently. An unconditional `process.exit` in the
  lock handler would have broken clean Ctrl+C (exit 0) in --logs mode.
- `runCommand` gained an optional `onOutput(chunk)` callback (used to tee the
  Gradle output to the build log file) instead of a bespoke spawn in
  `buildReleaseApk` — 3 lines vs a duplicated spawn/close handler.
- In --logs mode the logcat listener is attached *before* the app launch
  (matching old `yarn prod` behavior) so startup crashes are captured; in
  default mode no listener is ever started, so nothing keeps the process alive.
- Demo mode now also writes the timestamped Gradle log file (shared
  `buildReleaseApk`) — matches the acceptance criterion "every build".

Real-device testing learnings (2026-07-06):

- **Bug found + fixed**: `runCommand` embeds the full captured stdout/stderr in its
  rejection message. On build failure, `buildReleaseApk` printed the intended
  one-liner + 40-line tail, but then the entry's `main().catch` printed
  `error.message` — the entire Gradle output (~600 lines). Fix: `buildReleaseApk`
  now rethrows `new Error('Gradle build failed. Full log: <path>', { cause })`.
  Verified with a forced failure (bogus ABI): console stays at ~50 lines, zero
  `> Task` spam, exit 1.
- Warm no-change builds complete in ~2s; warm builds after touching a TS file take
  ~25-35s (Metro bundling dominates). Total `yarn release` wall time on the warm
  path is ~10-45s including adb discovery + install + launch.
- Preflight kill vs its own build: killing a `yarn release` with `kill -9` orphans
  its gradlew client; the NEXT run's preflight kills that orphan (observed:
  `Killed competing build process: 56178 ...java...`) and stale-lock recovery
  removes the dead-pid lock — both messages printed, recovery works end to end.
- One-off transient after the kill-9 test: the recovery build's Gradle client got
  disconnected mid-build (`Command failed (143)` = SIGTERM, daemon log shows a
  dropped client connection at that moment) — likely collateral of the freshly
  killed daemon client's socket teardown. The immediate rerun succeeded. No code
  change; acceptable for a hard-kill edge case.
- tcpip-5555 pinning did NOT trigger in this environment: the discovered serial is
  the mDNS TLS alias (`adb-4139951e-zmJeED._adb-tls-connect._tcp`), not `ip:port`,
  so the pinning guard correctly stays inactive. The pinning path remains untested
  on a real rotating-port `ip:port` serial.
- `dumpsys package` `lastUpdateTime` parsing worked (device local-time format
  parsed fine; verification line printed plausible values every run, e.g.
  `Install verified: versionCode 13, updated 2026-07-06 23:02:56.`).
- `--logs` crash detection is noisy-but-harmless: system lines like
  `GameSceneDetector ... NoSuchMethodException` or WindowManager
  `DeadObjectException` during relaunch get `[CRASH]`-prefixed because they match
  the `Exception` keyword with app context. Same behavior as the old `yarn prod`;
  left as-is (better to over-report than miss a real crash).

## Identified issues

- **FIXED (2026-07-06, found in step 13)**: build failure dumped the full Gradle
  output to the console via the entry's error handler (runCommand embeds captured
  output in the error message). Fixed in `buildReleaseApk` by rethrowing a
  one-line error; verified with a forced failure.
- **Open, low priority**: tcpip-5555 pinning path untested — current device
  connects via mDNS TLS alias serial, which correctly bypasses the ip:port-only
  pinning guard. Test opportunistically when a rotating-port `ip:port` serial
  shows up.
- **Observation, not actionable**: during the `--logs` soak the app process was
  killed and relaunched once by Android (no FATAL in logcat, hydration recovered
  the session). Unrelated to the build tooling.
- `dumpsys package` `lastUpdateTime` parsing: works on this device (step-13
  watch item resolved).

## Testing

Cheap tests first: `yarn typecheck && yarn lint && yarn jest` (scripts/ is linted by
oxlint; plain-JS scripts shouldn't affect typecheck). Then real-device, strictly
sequential, never in parallel with any other build:

1. **`yarn release`** (physical Android device, Wi-Fi adb):
   - Before starting, launch a throwaway competing build client (e.g.
     `cd android && ./gradlew help --console=plain` mid-run, or a second
     `expo run:` process) and verify the preflight prints
     `Killed competing build process: ...` and idle daemons survive
     (`./gradlew --status` still lists IDLE daemons afterwards).
   - While the build runs, start a second `yarn release` in another shell: must fail
     fast with the lock-holder message. After the first finishes, a fresh invocation
     must acquire the lock (no stale-lock false positive).
   - Verify: progress bar renders with elapsed/remaining, console stays quiet (no raw
     Gradle output), `.test-artifacts/builds/<timestamp>.log` exists and contains the
     full Gradle output, install-verification line prints versionCode + update time,
     the app launches on the phone, and the process exits on its own
     (`echo $?` → 0; `ps` shows no lingering node/gradle client).
2. **`yarn release --logs`**: build+install as above, then filtered `[SoliDev]` log
   lines stream (interact with the app briefly to generate logs); Ctrl+C exits cleanly
   with code 0.
3. **`yarn prod`**: behaves identically to step 2 (alias forwards the flag).
4. **`DEMO_GAME_LIMIT=1 yarn demo:auto-solve`**: playlist runs one game and exits with
   the usual completion signal; screen-off timeout is restored afterwards
   (`adb shell settings get system screen_off_timeout`).
5. **Stale-lock recovery**: `kill -9` a running `yarn release` mid-build, rerun —
   must detect the dead pid, remove the lock, and proceed.
6. Unlock the device with `scripts/android-unlock-pattern.sh` if needed; use a timer
   while the build runs (per AGENTS.md) instead of polling.

### Testing results (2026-07-06, physical Android A065 over wireless adb, all PASS)

1. **Main `yarn release`**: exit 0 in ~1m10s (build 33s). Console showed exactly:
   signing-env line, `Using device adb-4139951e-zmJeED._adb-tls-connect._tcp.`,
   `Building release APK via Gradle...`, progress bar lines
   (`[====......] 4/10 elapsed 00:24 remaining 00:36`), completion bar,
   `Full Gradle log: .../.test-artifacts/builds/20260706-230218.log`,
   `Install verified: versionCode 13, updated 2026-07-06 23:02:56.`,
   `Launching app via URI soli:///...`,
   `Build, install, and launch completed successfully.` Zero `> Task` lines in the
   console; the 53 KB log file contains the full Gradle output (683 task lines,
   `BUILD SUCCESSFUL`). No lingering node/gradle client in `ps` afterwards; lock
   dir gone; phone `topResumedActivity=ch.karimattia.soli/.MainActivity`.
2. **Lock contention**: second `yarn release` started 4s into a running one failed
   in <1s with exit 1 and `Another Android build is already running (pid 46604).
   Wait for it or kill it, then rerun.` First run finished normally (exit 0); a
   fresh run right after acquired the lock (no stale-lock false positive).
3. **Preflight kill**: with a long-lived `gradlew` client running, `yarn release`
   printed `Killed competing build process: 50217 /bin/bash /tmp/fake-gradle/gradlew`
   (and later `... 56178 ...java ... gradle-wrapper.jar ...` for a real orphaned
   client), then proceeded. Idle Gradle daemons survived every run
   (`./gradlew --status`: same daemons IDLE before/after).
4. **`yarn release --logs`**: build+install+verify, then
   `Streaming filtered logs (press Ctrl+C to exit).`; `[SoliDev]` app lines
   streamed (e.g. `[Game] Hydrating saved in-progress session.`); on SIGINT:
   `Received SIGINT, stopping log monitor...`, exit 0, lock dir removed, no
   lingering process.
5. **`yarn prod`**: forwards to `yarn release --logs` — built, verified install,
   reached the streaming line, SIGINT → exit 0.
6. **`DEMO_GAME_LIMIT=1 yarn demo:auto-solve`**: exit 0 in ~53s; playlist tokens
   detected through `[DemoPlaylist] Playlist completed (games=1).`; screen-off
   timeout 150000 before → 150000 after (restored); lock released.
7. **Stale-lock recovery**: after `kill -9` of a mid-build run, the next run
   printed `Removing stale build lock (dead pid 56133).` (plus preflight-killed
   the orphaned gradle client) and proceeded. That particular rebuild hit a
   one-off client disconnect (exit 143, see Intermediary learnings), exposing the
   verbose-failure-output bug (now fixed); the immediate rerun passed.
8. **Forced build failure** (bogus ABI env): console stayed quiet (~50 lines,
   zero `> Task` spam), printed
   `Gradle build failed. Full log: .../20260706-232638.log`, exit 1.
9. **Pinning / verification notes**: tcpip-5555 pinning correctly inactive for the
   mDNS alias serial (not `ip:port`); install verification printed plausible
   versionCode/lastUpdateTime on every run. Post-fix success run: exit 0 in 12s.

Cheap tests after the fix: `yarn typecheck` clean, `yarn lint` clean, `yarn format
--check` clean on the edited module (jest not rerun — scripts/ has no jest
coverage; unchanged app code).

(Round 2 testing results are in the Round 2 section at the bottom.)

## Follow-ups

- **Idea 5 — phone-side wireless-debugging toggle / over-the-internet adb (e.g. via
  Tailscale)**: explicitly out of scope here. Pro: removes the "Karim must enable
  Wireless debugging" dead-end at the bottom of `run-android-release.sh`, and Tailscale
  would allow builds when phone and laptop are on different networks. Con: needs a
  device-side component/root or Tailscale setup, its own research (web search per
  AGENTS.md), and a separate plan. Recommendation: separate plan once the ideas 1–4
  workflow has proven itself; tcpip-5555 pinning (4a) already removes most same-Wi-Fi
  reconnect pain.
- **Wireless discovery for `yarn demo:auto-solve`**: could reuse the shell script's
  discovery (e.g. by routing demo through `run-android-release.sh` with a `--demo`
  flag). Pro: demo runs become robust without a prior `yarn release`. Con: more
  coupling for a rarely-hit failure mode. Recommendation: skip unless it actually
  bites.
- **iOS parity**: quiet progress bar + preflight/lock for `yarn ios`. Pro: same token
  savings for the other daily loop. Con: different toolchain (xcodebuild), separate
  effort. Recommendation: separate plan; the shared lock (which already blocks any
  concurrent Android build) could be reused so iOS/Android builds exclude each other.

# Round 2 — kill attribution, output cleanup, --auto-solve, alias pinning

Round 2 started 2026-07-07 after Karim reviewed the round-1 output (terminal 64).

## User prompt (Round 2)

> question: possible to see in a terminal why process has been killed, e.g. "killed by agent xyz", so that if another agent runs this terminal, they know what's going on?
>
> instead of yarn prod -> yarn release:logs or yarn release --logs?
> or better wording than yarn release?
>
> @/Users/karim/.cursor/projects/Users-karim-kDrive-Code-soli/terminals/64.txt:1003-1029 Should we still clean up some stuff?
>
> fyi: i removed yarn android. this can always be reached via yarn start.
>
> about yarn demo:auto-solve -> should also be yarn release --auto-solve? With flag so that you can combine auto-solve with logs? or does auto-solve always have logs?
>
> do the adb connect follow up

## Decisions (Round 2, agreed with Karim)

1. Kill attribution: before SIGTERM, best-effort write one explanatory line to the
   victim's controlling TTY (`/dev/<tty>`; skip `??`), never fail the run over it.
2. Naming: delete the `prod` script; canonical is `yarn release --logs`. Keep the
   `release` name. Fix stale `yarn prod` / `yarn android` mentions in living files.
3. Output cleanup: happy path ~7 console lines. Silence raw adb install/am start
   echoes (one `Installing APK...` line instead; captured output surfaces on
   failure), drop the duplicate `Measured ... duration` line, silence
   "signing config already correct" and "signing env from current shell" lines.
4. `yarn release --auto-solve` replaces `yarn demo:auto-solve`: full release
   pipeline + demo playlist flow; delete `scripts/run-demo-autosolve.js` and the
   package.json script. `--auto-solve` inherently streams the filtered logs
   (completion is detected from them), so `--logs` alongside it is accepted as a
   redundant no-op with a one-line note. Side effect: auto-solve now goes through
   run-android-release.sh, gaining wireless discovery + signing patch (previously
   plain `adb devices`) — strictly more robust.
5. Alias tcpip pinning: extend pinning to mDNS TLS alias serials
   (`..._adb-tls-connect._tcp`) — resolve the device wlan0 IP (shared helper with
   derive_candidate_from_alias_connection), `adb tcpip 5555`, reconnect loop to
   `<ip>:5555`, strict fallback to the alias serial.

## Steps to implement (Round 2)

- [x] **R1. Kill attribution** in `preflightKillCompetingBuilds` (tty column in the
  ps listing; write to `/dev/<tty>` in try/catch before SIGTERM). Device-tested
  2026-07-07; one bug found + fixed during testing (blocking TTY open, see
  Intermediary learnings Round 2).
- [x] **R2. Naming cleanup**: remove `prod` from package.json; update stale
  `yarn prod` / `yarn android` mentions in living files (AGENTS.md, script header
  comments, src/data/demoAutoSolvePlaylist.ts, gradle-patch comment in
  run-android-release.sh + build-android.sh). Historic plan docs keep their text.
- [x] **R3. Output cleanup**: silent install with `Installing APK...` line, silent
  captured `am start`, remove `Measured ... duration` log, shell script silent on
  already-correct signing config, signing-env line only when loaded from .env.
  Device-verified 2026-07-07: happy-path console is exactly the ~7 expected lines.
- [x] **R4. `--auto-solve`**: fold demo playlist flow into
  scripts/build-install-android.js (DEMO_GAME_LIMIT, playlist URI, retrigger via
  shared monitor, screen-off save/restore, exit codes); add verify step (new);
  delete scripts/run-demo-autosolve.js + `demo:auto-solve` script; update arg
  parsing (`--logs` + `--auto-solve`, unknown rejected, combined = note).
  Device-tested 2026-07-07 (1-game playlist, exit 0, timeout restored).
- [x] **R5. Alias pinning** in run-android-release.sh: `resolve_device_wlan_ip`
  helper (reused by derive_candidate_from_alias_connection), pin_tcpip_port
  handles both ip:port and alias serials. Device-tested 2026-07-07: alias serial
  pinned to 192.168.1.12:5555 on the first run; subsequent runs find the pinned
  serial directly (no churn). Round-1 "pinning path untested" issue is now closed.
- [x] **R6. Living docs**: AGENTS.md Testing + Commands (`yarn release --logs`
  canonical, `--auto-solve` replaces demo:auto-solve, kill attribution note),
  .cursor/rules/testing.mdc, .cursor/commands/demo-mode.md.
- [x] **R7. Cheap tests**: bash -n, yarn typecheck && yarn lint && yarn jest,
  yarn format on touched files; local smoke tests where possible without a build.
  Run by the orchestrator before device testing — all pass (jest 204 tests).
  After the R1 TTY fix, lint + format --check + typecheck rerun clean 2026-07-07.

## Files actually modified (Round 2)

- `scripts/lib/android-release.js` (R1 kill attribution incl. blocking-open fix;
  R3 quiet install/launch, `Measured duration` line removed)
- `scripts/build-install-android.js` (new arg parsing `--logs`/`--auto-solve`,
  R4 demo playlist flow folded in, redundancy note for the flag combo)
- `scripts/run-demo-autosolve.js` (deleted — replaced by `yarn release --auto-solve`)
- `run-android-release.sh` (R5 alias tcpip pinning via `resolve_device_wlan_ip`;
  R3 silent on already-correct signing config / shell-provided signing env)
- `build-android.sh` (stale gradle-patch comment wording)
- `package.json` (`prod` and `demo:auto-solve` scripts deleted)
- `AGENTS.md`, `.cursor/rules/testing.mdc`, `.cursor/commands/demo-mode.md`
  (R6 living docs: canonical commands, kill-attribution note)
- `src/data/demoAutoSolvePlaylist.ts` (stale command mention updated)
- `docs/product/yarn-release-improvements/yarn-release-improvements.md` (this file)

## Intermediary learnings (Round 2)

- **Bug found + fixed during device testing (R1)**: the kill-attribution note was
  written with `fs.writeFileSync('/dev/<tty>')`. `open(2)` on a terminal device
  can block indefinitely — observed live: after preflight had just SIGTERMed the
  pty *master* of the victim's pty, opening the orphaned slave hung the whole
  `yarn release` for 5+ minutes inside `open()` (confirmed via `sample`: main
  thread stuck in `node::fs::WriteFileUtf8` → `uv_fs_open` → `__open`). Fix in
  `preflightKillCompetingBuilds`: open with
  `O_WRONLY | O_NONBLOCK | O_NOCTTY` + `writeSync`/`closeSync` in try/finally —
  the note is best-effort and must never stall the run. `O_NOCTTY` also prevents
  accidentally adopting the victim's tty as our controlling terminal. Retested:
  note delivered instantly to a live pty.
- Kill order caveat this exposed: `ps` order is arbitrary, so a victim's pty
  master can be killed before the note is written to its slave — exactly the
  blocking case above. The non-blocking open turns that case into a silently
  skipped note (acceptable; the kill line on our own console still names the pid).
- `adb devices` now permanently lists the device twice (pinned `192.168.1.12:5555`
  + the mDNS TLS alias). All script adb calls use `-s $ANDROID_SERIAL`, so no
  `more than one device` errors occurred in any run (round-1 watch item: clear).
- The install phase over Wi-Fi tcpip dominates warm runs: ~60-75s of a 79s warm
  no-change run (build itself 2-5s). Not a regression from round 1 (Wi-Fi APK
  push was always the bottleneck); noted here so nobody hunts for a tooling bug.
- SIGINT during the install phase of an `--auto-solve` run exits 130 via the
  lock handler (no demo monitor registered yet) and releases the lock — clean.

## Testing results (Round 2, 2026-07-07, physical A065 over wireless adb, all PASS)

1. **Kill attribution (R1)**: victim `bash /tmp/fake/gradlew` started on a real
   pty (`/dev/ttys007`, via `python3 pty.spawn`). `yarn release` printed
   `Killed competing build process: 73608 bash /tmp/fake/gradlew` and the victim's
   terminal received `[soli] This process was killed by the yarn release preflight
   (pid 73812) — only one Android/iOS build may run at a time.` (pty master saw
   SIGTERM, status 15). First attempt (pre-fix) hung 5+ min in the TTY open —
   fixed (see learnings), retest passed.
2. **Main `yarn release` (R3/R5)**: exit 0 in 123s (build 35s). stderr:
   `Pinned adb connection to 192.168.1.12:5555.`; stdout after the kill lines was
   exactly: `Using device 192.168.1.12:5555.`, `Building release APK via Gradle...`,
   progress bar, `Full Gradle log: .../20260707-104839.log`, `Installing APK...`,
   `Install verified: versionCode 13, updated 2026-07-07 10:50:33.`,
   `Launching app via URI soli:///...`, `Build, install, and launch completed
   successfully.` No am-start intent block, no `Measured ... duration`, no signing
   noise. App foregrounded (topResumedActivity=ch.karimattia.soli/.MainActivity),
   lock dir gone, no lingering processes. Gradle log complete (683 `> Task` lines,
   BUILD SUCCESSFUL).
3. **Warm rerun (R5 determinism)**: exit 0 in 79s (build 5s; Wi-Fi install
   dominates). No pinning churn: serial already `192.168.1.12:5555`, straight to
   `Using device 192.168.1.12:5555.`, no `Pinned`/`Note:` lines.
4. **`DEMO_GAME_LIMIT=1 yarn release --auto-solve` (R4)**: exit 0 in 93s. Full
   pipeline incl. `Install verified: ...` (new), then
   `Temporarily set screen-off timeout to 600000ms...`, playlist game 1/1 with
   undo probes through `[DemoPlaylist] Playlist completed (games=1).`;
   screen_off_timeout 150000 before → 150000 after (restored); lock released.
5. **Flag combo `--auto-solve --logs`**: printed `--auto-solve already streams
   the filtered logs; --logs is redundant.` then behaved like --auto-solve;
   aborted via SIGINT during install → exit 130, lock released, screen timeout
   untouched (abort predated the demo phase).
6. **`yarn release --bogus`**: exit 1 in <1s with
   `Unknown argument(s): --bogus. Supported: --logs, --auto-solve`.
7. **`yarn release --logs`**: reached `Streaming filtered logs (press Ctrl+C to
   exit).` and streamed `[SoliDev]` lines; SIGINT →
   `Received SIGINT, stopping log monitor...`, exit 0, lock released, no
   lingering node/logcat processes.

# Round 3 — lock-before-kill fix, timing lines, device model, AGENTS.md concision

Round 3 started 2026-07-07 after Karim reviewed the round-2 output.

## User prompt (Round 3)

> are you sure it takes 70s to install. usually only took a few seconds. also just now. i really like the updated timestamp!! should installing apk be replaced with installed in 0:05? i liked that device name A65xx was mentioned. ip doesnt help me much
>
> about agents.md does it make sense to be so verbose? or more concise? or should we soon turn this into a reusable skill?
>
> i just ran yarn release and then quickly in another terminal.
>
> @/Users/karim/.cursor/projects/Users-karim-kDrive-Code-soli/terminals/126.txt:8-10
> when do we get that we aborted here and when do we kill the other process? (just curious)
>
> "as before" doesn't work as wording in agents.md because the agent doesnt know how it was before.
>
> no need to describe that it's a quiet progress bar -> it will see this.
>
> commands and android instructions are now a bit redundant.

## Decisions (Round 3, agreed with Karim — do not re-litigate)

1. **BUG FIX — lock before kill**: `build-install-android.js` ran
   `preflightKillCompetingBuilds()` BEFORE `acquireBuildLock()`. Latent bug: a
   second `yarn release` started mid-build would preflight-kill the first run's
   Gradle client (matches the gradlew/GradleWrapperMain patterns, not an
   ancestor) and THEN abort at the lock — killing the legitimate build it was
   about to defer to. Karim hit the benign timing variant (second run aborted
   at the lock without killing anything only because the first run was still in
   adb discovery, so no gradle client existed yet). Fix: swap the order — lock
   first so a live soli-managed build is never killed; the preflight only
   clears NON-lock-managed builds (stray gradle clients, expo run:, xcodebuild)
   once we own the lock.
2. **Install timing**: replace the `Installing APK...` line with one measured
   completion line after the install succeeds: `Installed APK in mm:ss.`
   (reuses formatClockDuration; measured around runAdbInstall incl. the retry
   path). One line, not two — installs are normally a few seconds.
3. **Total duration**: final line becomes `Build, install, and launch completed
   successfully in mm:ss.` — measured from `run-android-release.sh` start via
   exported `SOLI_RELEASE_START_EPOCH_MS` (so bash discovery/pinning is
   included; Date.now() fallback when the Node entry runs directly).
4. **Device name**: `Using device <model> (<serial>).` — model fetched
   best-effort via `adb shell getprop ro.product.model`, serial-only fallback.
5. **AGENTS.md concision**: Testing Android line + parallel-builds paragraph
   rewritten without "as before" (meaningless to an agent that never saw
   before) and without describing visible UX (quiet progress bar); Commands
   bullet becomes a short pointer to Testing (redundancy removed).
6. **Skill follow-up deferred**: turning the testing workflow into a repo skill
   (AGENTS.md is always-loaded; a skill loads on demand — token savings) is a
   follow-up, not part of this round. See Follow-ups (Round 3).

## Steps to implement (Round 3)

- [x] **R3.1 Lock-before-kill swap** in scripts/build-install-android.js with
  inline reasoning comment.
- [x] **R3.2 `Installed APK in mm:ss.`** in scripts/lib/android-release.js
  installReleaseApk (formatClockDuration now exported).
- [x] **R3.3 Total duration**: SOLI_RELEASE_START_EPOCH_MS export at the top of
  run-android-release.sh; RUN_START_MS + final line in
  scripts/build-install-android.js.
- [x] **R3.4 Device model** in the `Using device` line (getDeviceModel helper,
  best-effort).
- [x] **R3.5 AGENTS.md rewrite** (Testing Android line, parallel-builds
  paragraph, Commands bullet).
- [x] **R3.6 Cheap tests**: bash -n, yarn typecheck && yarn lint, yarn format
  on touched files. All pass 2026-07-07 (jest skipped — scripts/ has no jest
  coverage, no app code touched).
- [x] **R3.7 Device tests** (A: warm run + timing breakdown, B: lock-ordering
  regression, C: --auto-solve/--logs sanity). All pass 2026-07-07 — see
  Testing results (Round 3).

## Files actually modified (Round 3)

- `scripts/build-install-android.js` (lock-before-kill swap + comment;
  RUN_START_MS total duration; getDeviceModel + Using-device line)
- `scripts/lib/android-release.js` (installReleaseApk measured completion
  line; formatClockDuration exported)
- `run-android-release.sh` (SOLI_RELEASE_START_EPOCH_MS export)
- `AGENTS.md` (Testing Android line, parallel-builds paragraph, Commands
  bullet)
- `docs/product/yarn-release-improvements/yarn-release-improvements.md` (this file)

## Intermediary learnings (Round 3)

- **Install really takes only a few seconds — Karim was right.** Five measured
  installs today: 00:05, 00:08, 00:06, 00:03, 00:03. Round 2's claim that "the
  install phase dominates warm runs (~60-75s of a 79s run)" was a
  mis-attribution: it was inferred as wall-clock-minus-build, which lumped in
  everything that was unmeasured at the time. Where that time actually lives
  (all instrumented now):
  - **Bash discovery/pinning phase**: varies ~1s (pinned serial found
    immediately) to ~20s (observed once today before the build started; adb
    server state dependent; round 2's first run also did the tcpip-pinning
    adbd restart + reconnect loop here). Now included in the reported total
    via SOLI_RELEASE_START_EPOCH_MS.
  - **First build of a session**: 33s with ZERO source changes (Gradle
    daemon/config-cache warm-up + Metro re-bundle after hours idle);
    subsequent no-change builds take 1-2s. The progress-bar line always showed
    this — it just reads as "build", not "install".
  - **Device unlock before launch**: the best-effort unlockDevice call takes
    ~4-5s on every default run (gap between `Install verified` and
    `Launching app` lines).
  - Wi-Fi variance may additionally have made some round-2 installs genuinely
    slower, but with the new `Installed APK in mm:ss.` line any future slow
    install is directly attributable instead of guessed.
- A backgrounded `yarn release` whose parent shell dies takes its build down
  with it and leaves a stale lock; the next run recovered exactly as designed
  (`Removing stale build lock (dead pid 9093).`) — with the new lock-first
  order this line now prints before `Using device`.
- The lock-first order makes the round-3 regression scenario structurally
  impossible: a second run can only reach the preflight kill after it owns the
  lock, i.e. after the first run has fully exited.

## Testing results (Round 3, 2026-07-07, physical A065 over wireless adb, all PASS)

1. **A — warm `yarn release`** (no source change): exit 0, 45s wall. New lines
   verified verbatim: `Using device A065 (192.168.1.12:5555).` (real model),
   `Installed APK in 00:05.`, `Build, install, and launch completed
   successfully in 00:45.` (matches wall clock incl. the bash phase).
   Timestamped breakdown of the 45s: bash discovery ~1s, Gradle build 33s
   (first build of the session — see learnings), install 5s, verify <1s,
   unlock ~4s, launch ~1s. Fully accounted.
2. **A follow-on — warm no-change rerun**: exit 0, total line `... in 00:12`
   (build 00:01, `Installed APK in 00:05.`) — the true warm loop is ~12s, not
   ~79s as round 2 suggested.
3. **B — lock-ordering regression test**: first `yarn release` started (TS
   comment touched to force a real ~25s build); second `yarn release` launched
   ~12s in (mid-Gradle): second aborted in <1s, exit 1, with exactly
   `Another Android build is already running (pid 12711). Wait for it or kill
   it, then rerun.` and **zero** `Killed competing build process` lines; first
   run completed untouched — exit 0, `Build, install, and launch completed
   successfully in 00:39.` (`Installed APK in 00:06.`). Touch reverted after
   the test (git checkout).
4. **C — `--logs`**: parsed and ran the full pipeline (`Installed APK in
   00:03.`), reached `Streaming filtered logs (press Ctrl+C to exit).`,
   streamed `[SoliDev]` lines; SIGINT → `Received SIGINT, stopping log
   monitor...`, no lingering node/logcat processes, lock released.
5. **C — `DEMO_GAME_LIMIT=1 yarn release --auto-solve`**: full pass, exit 0 in
   24s (build 00:02, `Installed APK in 00:03.`), playlist game 1/1 through
   `[DemoPlaylist] Playlist completed (games=1).`.
6. **Cheap tests**: `bash -n run-android-release.sh` OK, `yarn typecheck` +
   `yarn lint` clean, `yarn format` no changes on touched files, no linter
   errors (jest skipped — scripts/ has no jest coverage, no app code changed).

## Follow-ups (Round 3)

- **Reusable testing skill**: move the yarn-release/testing workflow from
  AGENTS.md into a repo skill. Pro: AGENTS.md is always in context for every
  agent turn, while a skill loads on demand — token savings on non-testing
  tasks. Con: an agent that doesn't invoke the skill misses the build rules
  (mitigable with a one-line pointer in AGENTS.md). Recommendation: do it once
  the round-3 wording has proven stable; deferred by Karim.

# Round 4 — unlock check

Round 4 planned 2026-07-07, implemented + device-verified 2026-07-07. Same prompt
also kicked off the iOS parity plan: docs/product/ios-build-workflow/ios-build-workflow.md.

## User prompt (Round 4)

> should we do the same for ios? also little script with build time (would need to get estimate), some hardening which simulator to take, clean logs, build kill, etc... really similar. then could also check for android <-> ios.
>
> also for android: i think we auto run the unlock. phone is now often unlocked. this makes weird gestures over the screen and sometimes does random actions. would it be easy to check before if phone is unlocked?

(The iOS part lives in the ios-build-workflow plan; this round is the Android
unlock check only.)

## Problem (Round 4)

`scripts/android-unlock-pattern.sh` swipes the unlock pattern unconditionally.
The phone is now often already unlocked (agents run the script constantly, and
`yarn release` calls `unlockDevice` best-effort on every default run), so the
bouncer swipe + pattern trace land on the live app UI and perform random
gestures/actions — e.g. dragging cards mid-test.

## Fix (Round 4)

At the TOP of `android-unlock-pattern.sh` (after serial resolution, before any
input events), detect device state via adb and branch:

- **Screen off** → wake (existing `KEYCODE_WAKEUP`) then swipe the pattern
  (current behavior).
- **Screen on + keyguard showing** → swipe the pattern (skip the wake keyevent
  is optional; keeping it is harmless — it's a no-op on an awake device).
- **Screen on + keyguard NOT showing** → already unlocked: `exit 0` silently
  (no output — `yarn release` calls this on every run and the happy-path
  console budget is ~7 lines).

Keep it a few lines of bash: one `is_awake()` and one `keyguard_is_showing()`
helper next to the existing `keyguard_is_hidden()` (or reuse/invert it — it
already parses `dumpsys window`; note its current use is post-unlock
verification, which stays).

Detection candidates (implementation sub-agent: **verify empirically on the
physical device before trusting one** — capture `dumpsys` output in all three
states — screen off, locked+screen on, unlocked — and diff; vendors differ and
this device's Android version decides which lines exist):

- Wakefulness: `adb shell dumpsys power | rg -o 'mWakefulness=\w+'` →
  `Awake` vs `Asleep`/`Dozing`. (Alternative token on newer builds:
  `getWakefulnessLocked()`.)
- Keyguard: `adb shell dumpsys window policy | rg 'KeyguardStateMonitor'` →
  `showing=true|false` line under KeyguardStateMonitor. (Alternatives seen
  across versions: `mDreamingLockscreen=true|false` in `dumpsys window`,
  `isKeyguardShowing=...`, `mKeyguardUnlocked=...` — the script's existing
  `keyguard_is_hidden()` already matches the latter two; prefer whichever the
  empirical diff proves reliable on THIS device, and leave an inline comment
  naming the verified tokens + device.)

## Steps to implement (Round 4)

- [x] **R4.1 Empirical detection check**: on the physical device, capture
  `dumpsys power` (wakefulness line) and `dumpsys window policy` /
  `dumpsys window` (keyguard lines) in the three states (screen off; screen on
  + locked; screen on + unlocked). Pick the reliable tokens; note them here
  under Intermediary learnings. Done 2026-07-07 — see Intermediary learnings
  (Round 4).
- [x] **R4.2 Guard in `scripts/android-unlock-pattern.sh`**: add the
  state check at the top per Fix above (already-unlocked → silent exit 0;
  screen off → wake + pattern; locked → pattern). Few lines of bash; inline
  comment with the verified tokens and why the check exists (random gestures
  on the live app UI when already unlocked — this round's bug).
- [x] **R4.3 Cheap tests**: `bash -n scripts/android-unlock-pattern.sh` OK
  2026-07-07.
- [x] **R4.4 Device tests** (2026-07-07, physical A065): (a) unlocked phone with
  the app foregrounded → exit 0, ZERO output, `mCurrentFocus` identical before/
  after (same soli window handle — no input events landed); (b) screen off
  (mWakefulness=Dozing) → woke + unlocked, exit 0, mKeyguardUnlocked=true after;
  (c) screen on + locked (isKeyguardShowing=true) → unlocked, exit 0.
  (d) full `yarn release` on an unlocked phone — DONE 2026-07-07 in the iOS-plan
  testing round (scenario 3b there): phone confirmed Awake + isKeyguardShowing=false
  before the run; exit 0 in 00:37, console had zero unlock output (happy-path lines
  only: Using device A065, build, `Installed APK in 00:03.`, verify, launch, total);
  app foregrounded after (mCurrentFocus=ch.karimattia.soli/.MainActivity). No stray
  gestures — Round 4 fully closed.

## Intermediary learnings (Round 4)

- Verified tokens on the A065 (Android device, 2026-07-07):
  - `dumpsys power` → `mWakefulness=Dozing` (screen off) vs `mWakefulness=Awake`
    (screen on, locked or unlocked). Reliable wakefulness signal.
  - `dumpsys window` → `mKeyguardUnlocked=  false|true` (note: two spaces after
    `=`) and `isKeyguardShowing=true|false`. Both flip correctly between locked
    and unlocked; the script's existing `keyguard_is_hidden()` already matches
    both, so it is reused as-is for the guard.
  - `mDreamingLockscreen` is NOT trustworthy on this device: it stays `true`
    while awake+locked (and `dumpsys window policy`'s `dreaming=` flips to
    false on wake while the keyguard still shows) — rejected as a signal.
- Guard ordering: wake first (key event — harmless no-op when awake), THEN
  check the keyguard. Checking the keyguard before waking would mis-handle
  lock-delay configs where the keyguard engages only after wake.

## Plan: Files to modify (Round 4)

- `scripts/android-unlock-pattern.sh` (state guard)
- `docs/product/yarn-release-improvements/yarn-release-improvements.md` (this file)
- Nothing else — callers (`unlockDevice` in scripts/lib, direct agent
  invocations per AGENTS.md) need no changes; exit 0 stays the success
  contract in all three branches.

## Files actually modified (Round 4)

- `scripts/android-unlock-pattern.sh` (is_awake helper + already-unlocked guard;
  wake keyevent now conditional on the dozing state)
- `docs/product/yarn-release-improvements/yarn-release-improvements.md` (this file)

# Round 5 — estimate seeding fix + emulator policy in ensureDevice

Done 2026-07-07 (small, done directly by the orchestrator).

## User prompt (Round 5)

> android had an expectations in seconds now after running it for a while. can you check why?
> question: does it every try to start on emulator or only on physical device?

## Changes

- [x] **Estimate seeding uses MAX of stored durations, not the last one.**
  Cause of the seconds-long estimate: builds alternate between fast no-change
  runs (~2-7s) and real builds (~30s+); seeding with the LAST duration made a
  real build start at "remaining 00:03" and keep growing. Max of the last 5 is
  the benign direction (bar completes early on fast builds); cold outliers age
  out of the 5-entry window. (`getExpectedBuildDuration` in
  scripts/lib/build-tools.js.)
- [x] **`ensureDevice()` now ignores `emulator-*` serials** — same
  physical-only policy as run-android-release.sh's discovery. Through
  `yarn release` the emulator was already impossible (shell discovery skips
  emulators and errors out rather than falling back); the Node-side
  `ensureDevice` fallback (direct `node scripts/build-install-android.js`
  invocation) previously picked `connectedDevices[0]`, which could have been
  an emulator. Now the whole Android path is physical-device-only.
