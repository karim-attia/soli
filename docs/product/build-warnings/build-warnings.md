# Build Warnings Audit & Cleanup

## User prompt

1. "Check build warnings: run an android and an ios build. check all warnings that you see. make a table with recommendations. search the web for them. some we probably have to reasonably accept. others: makes sense to tackle?"
2. "do all the things."

## Summary

Audited all warnings from one Android (`yarn release`) and one iOS (`yarn ios`) build (2026-07-07). Full catalog: `.test-artifacts/build-warnings/report.md`. 12 of 14 warning families are upstream (Expo, RN, Hermes, Xcode 15 linker, Gradle) or informational — accepted. Three actionable items were implemented:

1. `NODE_ENV ??= 'production'` for the bare-gradlew release build (silences expo-constants warning) — done in `scripts/lib/build-tools.js`, verified gone in clean build.
2. Delete `FORCE_COLOR` AND `NO_COLOR` when `NO_COLOR` is set (silences 12× Node warning per build; both vars come from agent/CI shells) — done in `scripts/lib/build-tools.js`. Dropping FORCE_COLOR alone was insufficient: Metro's `WorkerFarm.js` hardcodes `FORCE_COLOR=1` into each transform worker's env, so inherited `NO_COLOR` still warned per worker. Dropping both restores Metro's universal default.
3. Tamagui "skipped loading 2 module" — the modules are react-native-safe-area-context's New Architecture codegen specs (`./specs/NativeSafeAreaView`, `./specs/NativeSafeAreaProvider`), third-party; whitelisted via `TAMAGUI_IGNORE_BUNDLE_ERRORS` in `metro.config.js`, verified gone on cache-cleared export.

Clean Android build (`warning-mode=all`, compile cache disabled): 97 Kotlin + 3 javac warning families, ALL from node_modules (screens, reanimated, expo-modules-core, svg, masked-view…), zero from our code. Gradle 10 deprecations: ~43× Groovy space-assignment (mostly third-party build.gradle files; the only ones in our tree are in the Expo-prebuild-owned `android/build.gradle:19` and `android/app/build.gradle` — accepted, template-owned), plus multi-string dependency notation and legacy Usage attribute from RN/AGP plugin internals — all upstream, accepted.

## Description

Build logs were noisy; we want to know which warnings are real signals vs. accepted upstream noise, silence the silenceable ones, and document the rest so future agents don't re-investigate them.

## Acceptance Criteria

- Table of all distinct build warnings with source, root cause, and accept/tackle recommendation (delivered in chat + `.test-artifacts/build-warnings/report.md`).
- expo-constants NODE_ENV warning gone from `yarn release`.
- Node NO_COLOR/FORCE_COLOR warning gone from both builds (when run from agent shells).
- Tamagui skipped modules identified; whitelisted if third-party, investigated if ours.
- Kotlin/Java compiler warnings cataloged from a clean build.

## Accepted warnings (do NOT re-investigate; researched 2026-07-07)

| Warning | Why accepted |
|---|---|
| Config-cache "external process started 'node'" ×5 (Android) | Expo/RN template runs node at Gradle config time; upstream open issue (RN #45154). Build caches fine. |
| "Deprecated Gradle features … incompatible with Gradle 10" | From RN/Expo Gradle plugins; fixed via SDK upgrades. |
| Gradle "[Incubating] Problems report" + `IsTerminalSmartValueSource` invalidation | Informational Gradle 9.3 notices. |
| `ld: ignoring duplicate libraries: '-lc++'` (iOS) | Xcode 15+ rewritten linker; Apple-side; harmless. Suppression flag exists but adds config for zero benefit. |
| Hermes script phase "runs every build (no outputs)" (iOS) | By design — CocoaPods phase must check/swap Hermes dylib each build. |
| clang "cannot find protocol definition for 'RCTHostDelegate'" (iOS) | RN 0.85/0.86 merged RCTHostRuntimeDelegate into RCTHostDelegate; Expo header churn; resolves with SDK patches. |
| clang "'RCTRootView' is deprecated" (iOS) | RN's own prebuilt header, legacy-arch API. |
| ~10 Swift warnings in expo-router pod `ExpoHeadModule.swift` | Upstream expo-router 57.0.3 source; not worth patching the pod. |
| Hermes 56× "variable X was not declared" + 2× eval() | Known Hermes AOT strict-mode noise for runtime-polyfilled globals (hermes #342). `-w` would also hide useful warnings — keep. |
| "Bundler cache is empty, rebuilding" | Normal Metro cold-cache notice. |
| expo-max-sdk-override-plugin note (Android) | Our plugin's intentional informational output. |

## Steps to implement

- [x] Run Android + iOS builds, catalog all warnings (sub-agent; report at `.test-artifacts/build-warnings/report.md`)
- [x] Web-research each warning family
- [x] Recommendation table delivered in chat
- [x] Fix: `NODE_ENV ??= 'production'` in `buildReleaseApk` (`scripts/lib/build-tools.js`) — verified gone
- [x] Fix: delete `FORCE_COLOR` + `NO_COLOR` when `NO_COLOR` set (`scripts/lib/build-tools.js`, module top) — Metro WorkerFarm hardcodes FORCE_COLOR=1 into workers, so both must go
- [x] Tamagui: identified 2 skipped modules (safe-area-context codegen specs); whitelisted in `metro.config.js`; verified gone
- [x] Clean Android build with `warning-mode=all` → Kotlin/Java warnings cataloged (all node_modules), Gradle deprecations attributed (all upstream/template)
- [x] Verify script fixes silence their warnings in a real build — all three confirmed gone (NODE_ENV ✓, NO_COLOR/FORCE_COLOR ✓, Tamagui ✓) in Gradle log 20260707-135916.log with the Metro bundle task re-run; build succeeded, install verified, app launched
- [x] Sub-agent appended findings to `.test-artifacts/build-warnings/report.md`; orchestrator plausibility-checked (Metro WorkerFarm FORCE_COLOR=1 hardcode confirmed at node_modules/metro/src/DeltaBundler/WorkerFarm.js:68; metro.config.js whitelist reviewed)

## Plan: Files to modify

- `scripts/lib/build-tools.js` (both env fixes)
- `metro.config.js` (Tamagui whitelist, only if skipped modules are third-party)

## Files actually modified

- `scripts/lib/build-tools.js` — FORCE_COLOR+NO_COLOR drop (module top) + NODE_ENV pin (buildReleaseApk), each with an explanatory comment.
- `metro.config.js` — TAMAGUI_IGNORE_BUNDLE_ERRORS whitelist for safe-area-context codegen specs, with dated comment.

## Intermediary learnings

- `NO_COLOR=1` and `FORCE_COLOR=0` are both exported by Cursor agent shells (not by the repo). Dropping FORCE_COLOR from the parent env is NOT enough: Metro's `WorkerFarm.js` (node_modules/metro/src/DeltaBundler/WorkerFarm.js:68) hardcodes `FORCE_COLOR: 1` into every transform worker's env, so each of the 12 workers warns as long as NO_COLOR is inherited. Both vars must be dropped; this restores Metro's stock behavior on any dev machine.
- Android `yarn release` uses bare gradlew (deliberate, see run-android-release.sh), so Expo CLI never sets NODE_ENV — that's the whole cause of the expo-constants warning.
- Incremental builds hide Kotlin/Java compiler warnings (UP-TO-DATE tasks don't re-print); worse, even clean builds pull compile tasks from the Gradle build cache — caching must be disabled to actually re-emit compiler warnings.
- `./gradlew clean` can fail on a stale `android/app/.cxx` CMake cache referencing deleted codegen dirs; deleting `.cxx` fixes it (not a project bug).

## Testing

- Sub-agent runs clean `yarn release` (verifies APK install + launch itself) and re-runs the Tamagui export probe after any metro.config.js change.
- Cheap checks: `yarn typecheck && yarn lint` unaffected (script-only changes; build-tools.js has no lints).

## Follow-ups

- iOS clean build to catalog any clang/Swift warnings hidden by incremental reuse (low value: activity log already retained them this run).
- Re-check accepted-warning list after next Expo SDK upgrade — several (RCTHostDelegate, expo-router Swift warnings, Gradle 10 deprecations) should disappear on their own.
