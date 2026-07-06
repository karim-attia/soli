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
- [ ] 3. Machine-level `~/.gradle/gradle.properties`: caching, configuration-cache, jvmargs 4g.
  Verify one build passes with configuration cache; fall back to disabling if plugins complain.
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

## Intermediary learnings

- `--active-arch-only` is silently ignored for release variants — must use the Gradle
  project property instead.
- Stale-app incidents in repo history all trace to native-side changes or stale native build
  artifacts, not to incremental JS rebuilds; release builds embed the bundle, so a completed
  build+install cannot serve stale JS.

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
