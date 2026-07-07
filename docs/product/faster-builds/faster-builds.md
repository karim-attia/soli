# Faster Builds

## User prompt

> Goal: much faster builds. Question: what are the options?
>
> ways of building:
>
> yarn release: mostly for running on phone to test. why release? because yarn android is 60hz and the non release build just doesnt feel fluid. i run this 20X+ per day, has utmost prio and only needs to run on my phone, no other phones.
>
> not sure if i have ever also used it for releasing to play store. but should probably use yarn build:android for that?
>
> yarn android: never use it
>
> yarn prod: don't use it anymore really
>
> yarn build:android → every few days or even weeks when i upload new version to play store. really OK if this is comprehensive and slow.
>
> yarn ios: also multiple times per day to test. would also immensely benefit from speed up. only needed for attached simulator.
>
> yarn build:ios same as build:android. runs on expo cloud. ok if slow.
>
> Pls research how to make this much much faster. recommendations? options? cleanup? especially agent runs with agents.md are slowed down a lot because of the slow builds.

> about 2: is this also +/- 75% less build time or only size?
> let's start with this one. try directly to benchmark.
> note: app has a lot of animations and things i want to be really really snappy. so i playtest this a lot and for this reason, i want the right variant. based on this, #1 will always make me suspicious. with this in mind, should we even try this after? reason why 2 first: if we already drastically reduce, benchmarking rest will be easier after.
> i also had issues in past that the app was not fully updated while testing. then results were outdated and test - implement loop didn't work and just continued fixing stuff that was already fine but testing didnt work because app was not up to date. is always clean build overkill for this? also check if you find anything in docs history.
> keeping metro running always "felt" like a gamble - is it now up to date or not?
> After doing 2, what's the next recommendation? tell me more about cache and gradle settings
>
> pls challenge everything, i am not super experienced with this build stuff

## Summary

Research complete. Benchmark of single-ABI (arm64-v8a) local release builds vs the current
4-ABI default is in progress. Decision: Karim keeps the real `release` variant for daily
phone playtesting (animation feel must match production); `debugOptimized`+Metro is NOT
adopted for playtesting, at most later as an option for agent functional smoke loops.

## Description

`yarn release` (phone, 20x+/day) and `yarn ios` (simulator, several times/day) dominate
iteration time, including agent runs. Play-store builds (`yarn build:android`, `yarn build:ios`)
may stay slow/comprehensive. Goal: cut the daily loops drastically without changing what is
being tested (production-fidelity release variant on Android).

## Findings (2026-07-06)

- `android/gradle.properties` builds 4 ABIs (`armeabi-v7a,arm64-v8a,x86,x86_64`); the phone
  needs only `arm64-v8a`. Single-ABI ≈ up to ~75% less **native C++ compile** (mostly a
  cold-build win) and ~3x smaller APK (faster Wi-Fi adb install on every warm build).
  Sources: https://reactnative.dev/docs/build-speed
- `expo run:android --active-arch-only` only applies to debug/debugOptimized variants
  (verified in @expo/cli source). For release, override via env var
  `ORG_GRADLE_PROJECT_reactNativeArchitectures=arm64-v8a` (env project properties beat
  project gradle.properties; no file edits needed, Play-store `build-android.sh` unaffected).
- Release builds re-run Metro bundling + hermesc into the APK on every JS change — a fixed
  per-iteration cost regardless of caches.
- `--variant debugOptimized` (SDK 54+) compiles C++ like release but stays Metro-connected.
  Rejected for playtesting: JS still runs in dev mode → animation feel not trustworthy for
  Karim's snappiness bar.
- No Gradle build cache / configuration cache enabled; daemon heap 2 GB; no ccache installed.
  RN 0.86 supports Gradle configuration cache (added in RN 0.79/0.80,
  https://github.com/facebook/react-native/pull/49484).
- iOS already uses precompiled RN core + precompiled Expo modules (Podfile:
  `RCT_USE_PREBUILT_RNCORE=1`, `EXPO_USE_PRECOMPILED_MODULES=1`). ccache can be enabled via
  `expo-build-properties` → `ios.ccacheEnabled` + `brew install ccache`.
- AGENTS.md mandates "iOS: Always run a clean build" — the biggest iOS time sink; incremental
  is safe for JS-only changes (see stale-binary analysis below).
- Docs history on stale-binary incidents: `docs/external-package-guides/react-native-teleport.md`
  ("Never accept testing against an old binary because the package contains native code") and
  `docs/external-package-guides/react-native-reanimated.md` (stale `.cxx`/CMake artifacts after
  changing Worklets → build *failure*, fixed by scoped cleanup, not full clean). Pattern: stale
  problems came from **native** changes, not JS-only iterations.

## Acceptance Criteria

- Warm `yarn release` loop measurably faster; APK contains only arm64-v8a for local runs.
- Play-store AAB (`yarn build:android`) still contains all ABIs.
- A cheap deterministic freshness check replaces "clean build as staleness insurance"
  (verify `lastUpdateTime` via `adb shell dumpsys package ch.karimattia.soli` after install;
  iOS equivalent guidance).
- AGENTS.md updated accordingly.

## Possible approaches incl. pros and cons

1. debugOptimized + Metro for daily loop — fastest iteration (seconds), but JS dev mode makes
   animation-feel testing untrustworthy → rejected for playtesting; optional later for agent
   functional smoke tests only.
2. Keep release variant, single ABI locally (env var in run-android-release.sh) — no fidelity
   change, pure win. CHOSEN as step 1.
3. Gradle build cache + configuration cache + bigger heap in `~/.gradle/gradle.properties`
   (machine-level → survives `expo prebuild --clean`) — helps config phase and cold builds.
4. ccache (Android NDK via CMAKE_*_COMPILER_LAUNCHER, iOS via expo-build-properties) — makes
   cold native builds mostly cache hits.
5. Drop mandatory iOS clean builds; replace with freshness verification + "clean only after
   native changes" rule.

## Open questions to the user

- None blocking. debugOptimized trial deferred/likely skipped per Karim's fidelity concern.

## Dependencies

- ccache (brew) — later step.

## Related tasks

- AGENTS.md self-improvement edits (iOS clean-build rule, freshness verification guidance).

## Simplification ideas

- All local-loop changes are env/config only; no app code changes.

## Steps to implement

- [done] 1. Benchmark warm `yarn release`: 4 ABIs baseline vs arm64-v8a-only
  (sub-agent, sequential builds, JS touch before each run, APK sizes, install verification).
  Result 2026-07-06: warm loop 47.6s -> ~39s (~17%); Gradle build itself 17s vs 16s —
  saving is almost entirely the smaller Wi-Fi adb install (APK 113MB -> 50MB). One run lost
  to Wi-Fi adb port rotation; one 75s outlier from the degrading link (excluded).
- [done] 2. Exported `ORG_GRADLE_PROJECT_reactNativeArchitectures=arm64-v8a` in
  `run-android-release.sh` (overridable via pre-set env; Play builds keep all ABIs).
- [done] 3. Gradle settings: caching, configuration-cache (problems=warn), jvmargs -Xmx4g.
  Verified: run 1 stored the config cache (5 non-fatal warnings), run 2 reused it — warm
  loop 37.2s wall / Gradle 13s (vs ~39s / ~16s baseline) with a real JS rebundle and
  verified phone installs. Initially machine-level (~/.gradle/gradle.properties); moved
  in-repo per Karim's preference: config plugin `plugins/withBuildSpeedGradleProperties.js`
  registered in app.json (verified via `expo config --type introspect`), current
  android/gradle.properties synced manually, machine-level file deleted.
- [ ] 4. ccache for Android + iOS (brew install, env launchers, expo-build-properties plugin).
- [ ] 5. AGENTS.md: remove blanket iOS clean-build rule; add freshness-verification steps and
  "clean scoped native dirs only after native dep changes" guidance.
- [ ] 6. Re-benchmark iOS loop (incremental vs clean) to quantify.

## Plan: Files to modify

- run-android-release.sh (env var + comment)
- ~/.gradle/gradle.properties (machine-level, not in repo)
- AGENTS.md (testing rules)
- app.json (expo-build-properties for iOS ccache — later step)
- docs/product/faster-builds/faster-builds.md (this file)

## Files actually modified

- docs/product/faster-builds/faster-builds.md (created)
- run-android-release.sh (single-ABI env override + benchmark comment)
- plugins/withBuildSpeedGradleProperties.js (created — in-repo source of truth for Gradle
  build-speed settings; note: these also apply to Play Store builds via build-android.sh,
  which is fine — caching/config-cache only make them faster)
- app.json (registered the plugin)
- android/gradle.properties (manual sync until next prebuild; gitignored/generated)
- ~/.gradle/gradle.properties (deleted — replaced by the in-repo plugin)

## Intermediary learnings

- `--active-arch-only` is silently ignored for release variants — must use the Gradle
  project property instead.
- Stale-app incidents in repo history all trace to native-side changes or stale native build
  artifacts, not to incremental JS rebuilds; release builds embed the bundle, so a completed
  build+install cannot serve stale JS.
- Configuration-cache caveat: the Expo/RN template runs 5 `node` resolution commands at
  configuration time (android/app/build.gradle lines 12-20) that Gradle cannot track as
  inputs. Consequence: after `yarn install` moves/upgrades packages, the cached configuration
  may be stale. If Android builds behave oddly after dependency changes, run once with
  `--no-configuration-cache` or delete `android/.gradle/configuration-cache/`.
- Warm-loop floor with release variant is ~37s: ~13s Gradle (incl. Metro/hermesc bundling,
  which runs as the Gradle task `createBundleReleaseJsAndAssets`), remaining ~24s is expo CLI
  startup/config + adb discovery in run-android-release.sh + Wi-Fi install + launch — not
  reachable by Gradle-side tuning.
- Web research 2026-07-06 on further Metro/Gradle speedups: generic advice (parallel,
  caching, jvmargs, ccache, single ABI, KSP) is either already applied or not applicable
  (no kapt; app bundle is small so Metro worker tuning and NODE_OPTIONS heap are irrelevant).
  Remaining levers for the ~24s non-Gradle part: (a) bypass the expo CLI wrapper — call
  `./gradlew :app:assembleRelease` + `adb install -r` + `am start` directly from
  run-android-release.sh, saving expo CLI startup/config/device-resolution overhead;
  (b) USB instead of Wi-Fi adb (removes install-transfer time and the observed port-rotation
  flakiness). Optional micro-win: android.enablePngCrunchInReleaseBuilds=false.
- Kotlin version (evaluated 2026-07-07): 2.1.20, inherited from RN 0.86's version catalog —
  the ecosystem norm. Already a K2-compiler release (the big compile-speed jump); Kotlin
  compile tasks are skipped in the warm loop anyway. Do NOT override `kotlinVersion`:
  Expo modules hard-errors on Kotlin >= 2.3.0 and prebuilt deps can hit metadata
  incompatibilities. It upgrades automatically with Expo SDK/RN bumps (RN 0.87 → 2.2.0).
- Bun vs Node (evaluated 2026-07-06): not a build-speed lever. Gradle hardcodes `node`
  invocations in android/app/build.gradle (bundling, entry resolution), hermesc is a native
  binary, install is adb — Bun would only shave ~1-2s of expo CLI boot. RN tooling still
  requires Node (expo/expo#36100); Metro has issues with Bun's isolated linking
  (expo/expo#41995); switching lockfiles would churn Yarn 4 + jest + EAS. Skipped.
- Cold-build triggers (machine restart is NOT one — all caches are on disk; a restart only
  costs a one-time Gradle daemon start of a few seconds): `expo prebuild --clean` (deletes
  android/ incl. .cxx ninja state), native dependency version changes (reanimated/worklets/
  expo-modules-core → C++ recompile), NDK/AGP/SDK upgrades, and the scoped native-dir cleanup
  from the reanimated guide. Note: Gradle's build cache does not cover CMake/ninja C++ state
  in .cxx — only ccache would. Decision: cold builds are rare here → ccache deprioritized.

## Identified issues

- (none yet)

## Testing

Benchmark 2026-07-06 (warm loop, JS touch + `yarn release`, physical phone over Wi-Fi adb):

| Scenario | Wall time | Gradle build | APK size | ABIs |
|---|---|---|---|---|
| 4 ABIs (baseline) | 47.6s | ~17s | 113MB | 4 |
| arm64-v8a only | ~39s | ~16s | 50MB | 1 |

Key insight: the warm Gradle build is already fast (~17s); the warm loop is dominated by
Metro/hermesc bundling + Wi-Fi install. So the *perceived* slow builds are cold builds
(prebuild --clean, native dep changes) and iOS clean builds — which is where steps 3-6 aim.
Wi-Fi adb is flaky under load (port rotation mid-benchmark cost one run).

Gradle-settings verification 2026-07-06 (single ABI + new ~/.gradle/gradle.properties):

| Run | Wall time | Gradle | Config cache | Install verified |
|---|---|---|---|---|
| 1 (stores cache) | 48.4s | 26s | stored, 5 non-fatal warnings | yes |
| 2 (reuses cache) | 37.2s | 13s | reused | yes |
