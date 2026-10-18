# Expo/RN SDK 58 Upgrade: Upgrade to Expo SDK 58 and React Native 0.88

## User prompt

### Prompt 1

```text
pls look into the expo upgrade
```

### Prompt 2

```text
Phone is reconnected with wireless debugging on. Run the Android smoke test, the 20-game playlist and RAM per the plan.
```

### Prompt 3

```text
Hey, this looks and sounds really promising. Yeah, please do these next steps and anything else that you know potentially gets easier with expo 58, like things we can drop that we did that are now out of the box, some things that we you know went around. I don't know, or or like other things that you know our expo fifty eight brings that we can profit from that you would recommend? something like yeah I don't know. Are there any more benefits from the upgrade? please think it through thank you.
```

### Prompt 4

```text
Hey yeah, do your recommendation in the fonts thing like figure out if this makes sense and if yes go ahead and leftover webcode I think it's mostly for like you know we, did like feature graphs and so on that I can use, like see that in the app like on web. does that still work like that and like how would should we work? please go ahead with your recommendation and as a next big thing would it make sense to also look into the Tamagui major upgrade and what are like the benefits and cleanups and whatever the upgrade path thank you
```

## Summary

Status 2026-10-17 20:50 UTC (native re-test on the final `expo 58.0.14` set + A1/A3/A4/C4,
testing sub-agent): GREEN on both platforms. Clean iOS regeneration (`ios/` deleted, UTF-8
locale) built in 10 m 41 s; Android `android/` regenerated with the signing patch, install
verified 1.1.0 / 16. iOS: cold start with the Router-owned splash (board in the 1 s frame, no
font/splash warnings), header insets identical to the morning baseline on Play/Hello/History/
Settings (also after the History sheet), stock/tap/undo, pickers, History + sheet, hint (0.4 ms),
Skia celebration, cold-start deep link, 10-game playlist 10/10 with 0 crash tokens; resident RAM
284-311 MiB settled / 309 MiB after 10 games (58.0.12: 377 / 464 after 20). Android (A065,
R8): cold start 603 ms with the board in the 1 s frame, insets identical on every drawer
screen incl. after sheet dismiss and background/foreground, A1 pickers pass (eight picks, label
immediate each time, persisted after re-entering Settings), hint under R8 (11.7 ms), celebration,
scrubber fixture + native pan, 20-game playlist 20/20 in 3 m 21 s with 0 crash tokens; PSS
150.5 / 313.2 / 244.5 MiB (restart / post-20 / post-GC) versus 155.0 / 330.6 / 273.9 on
58.0.12 — the splash-leak and modules-core memory fixes did not regress anything, retained
growth is 25 MiB smaller. The three `ExpoModulesV2 ... Enumerable` R8 warnings are still
there (expected, upstream). Finding for Karim: a FOREIGN session ran `yarn release` and `yarn
ios` in the middle of this run (Identified issues) — same sources, byte-equivalent builds, but
it reinstalled the simulator app over the running playlist; only one agent should build/drive
at a time. Settings restored (Scoring Vegas, Warnings "No more useful moves"); the test games
stay in History. Skill: two troubleshooting rows added (agent-device pan-helper crash noise in
logcat, zsh word-splitting). Nothing staged or committed.

Status 2026-10-17 20:10 UTC (Prompt 4, fonts C4 + web D5): C4 resolved by deletion, not
embedding — Tamagui config v5 uses `createSystemFont()`, nothing referenced `Inter`/`InterBold`,
so `app/_layout.tsx` lost `useFonts` and the manual splash pair (Expo Router holds/releases the
splash itself); -20 LOC + a decision comment. D5: web (`yarn web`, Karim's feature-graphic
viewer) turned out to be broken since 2026-07-06 (`expo-sqlite/kv-store` entered the web graph:
"Unable to resolve ./wa-sqlite/wa-sqlite.wasm"), not since SDK 58. Fixed with Expo's documented
sqlite web setup in `metro.config.js` (wasm asset ext + COOP/COEP headers), `web.output`
`static` -> `single` (Node SSR cannot run the sync SQLite read) and `app/+html.tsx` deleted
(static-only). Verified in Chrome on `expo 58.0.14`: `/feature-graphic` and `/` render, settings
hydrate through wasm, no console errors; screenshot
`scratchpad/sdk58/web-feature-graphic.png`. Gates after both changes: typecheck 0 errors, lint
0, Jest 45/458, `check:tamagui`, oxfmt green. Open: device check for C4 (Testing section),
`@tamagui/font-inter` dependency removal (Follow-ups).

Status 2026-10-17 20:00 UTC (final patch bump, Prompt 3): Soli is now on `expo@58.0.14` /
`expo-router 58.0.23` / `expo-modules-core 58.0.22` (transitive via expo; the explicit
install briefly added it as a direct dependency, removed again) / `@expo/cli 58.1.11` /
`@expo/schema-utils 58.0.2` / `expo-modules-jsi 58.0.15` — the full SDK 58 set the versions
API expects. `npx expo install --check` is clean for the first time; expo-doctor 19/20 (only
the pre-existing `agent-device` script-name warning). Gates after the bump: typecheck, lint,
Jest 45/458, `check:tamagui`, oxfmt green. Nothing newer exists on the registry for any Soli
package. Open: the combined native test (Android rebuild is due — `expo-modules-core 58.0.22`,
`expo-crypto 58.0.7`, `expo-splash-screen 58.0.10` all changed native Android code; iOS
incremental) with the A1/A3 device checks folded in (Testing section), then the orchestrator's
plausibility check.

Status 2026-10-17 18:45 UTC (SDK 58 adoption A1-A4, Prompt 3): the four ADOPT NOW items are
in. A1: `PickerPreference.tsx` no longer remounts the Android Picker per value (`key={value}`
gone; comment cites `@expo/ui 58`'s `Picker.android.tsx` label `useEffect`). A2: Jest lost
the four `expo/winter*` mappers and the `transformIgnorePatterns` override; the setup file
is now `test/setup/mock-expo-crypto.ts` (expo-crypto mock only), `test/mocks/expo-winter.ts`
and `mock-expo-winter.ts` deleted. A3: `app/(tabs)/_layout.tsx` dropped
`headerStatusBarHeight: insets.top` + `useSafeAreaInsets` (Router 58 default is identical).
A4: `assetBundlePatterns` removed from `app.json`; the three "Expo UI 57" comments now say
"re-checked on @expo/ui 58.0.20". Net about -30 LOC. Gates: typecheck, lint, Jest 45/458,
`check:tamagui`, expo config, oxfmt on touched files all green (one pre-existing oxfmt miss
on `settings.tsx:107` belongs to the uncommitted scoring work). Still open: the device checks
for A1 (Android Scoring/Warnings picker labels) and A3 (header/status-bar height on both
platforms), and the `expo 58.0.14` / `expo-router 58.0.23` / `expo-modules-core 58.0.22`
mini-bump, which is waiting for Yarn's age gate (eligible 19:51-19:54 UTC; registry
re-checked at 18:40 UTC: nothing newer than those three exists for any Soli package).

Status 2026-10-17 18:40 UTC (age-gate patch bump, Prompt 3): Soli is now on `expo@58.0.13`
/ `expo-router 58.0.22` / `@expo/ui 58.0.20` / `expo-crypto 58.0.7` / `expo-splash-screen
58.0.10` / `expo-modules-core 58.0.21` / `babel-preset-expo 58.0.17` — the newest set Yarn's
24 h gate allowed at 18:25 UTC. `expo@58.0.14` (19:51 UTC), `expo-modules-core@58.0.22`
(19:52) and `expo-router@58.0.23` (19:53) are still quarantined until about 19:55 UTC; they
are the only two remaining `expo install --check` / expo-doctor mismatches. RN `0.88.0`,
React `19.3.0` and every other package are unchanged. Gates after the bump: typecheck, lint,
Jest 45/458, `check:tamagui`, oxfmt all green. Patch content that matters for Soli:
`expo-crypto 58.0.7` fixes Android async-function `NoSuchMethodError` on modules-core
>= 58.0.18 (Soli only calls the sync `getRandomValues`), `expo-splash-screen 58.0.10` fixes a
leaked Android main activity (watch restart RAM), `@expo/ui 58.0.20` adds an iOS `Host`
`alignment` prop, `expo-router 58.0.22` fixes an iOS `Link.AppleZoom` back transition (unused).
The three Android R8 `ExpoModulesV2 ... Enumerable` warnings are NOT fixed: the expo-crypto
enum sources are byte-identical in 58.0.7, expo-sqlite stays 58.0.13, and the warning emitter
(Expo Modules v2 gradle/compiler plugin `0.2.5`) is unchanged through modules-core 58.0.22.
Native dirs were not rebuilt for this bump; a later agent does the combined native test
(expo-crypto and expo-splash-screen ship native Android code, so a rebuild is due).

Status 2026-10-17 18:25 UTC: research/docs, dependency alignment, cheap gates and the
native validation on BOTH platforms are done; only the orchestrator's plausibility check
remains. iOS (clean `yarn ios`, 14 m 47 s): every smoke item passed — board, stock,
tap-move, undo, scrubbed fixture incl. Appium pan scrub, Settings (Expo UI Host top-align
invisible), History + preview sheet, drawer, hint (Rust solver), Skia celebration,
cold-start deep link via SceneDelegate, real win — plus the 20-game playlist (3 m 8 s,
0 crash tokens); resident RAM 377 MiB settled / 464 MiB after 20 games (SDK 57: 484 /
677 MiB). Android (physical A065, Android 16, release APK with R8, clean build 12 m 42 s,
59.3 MB; incremental `yarn release` 34 s once the phone was back at 18:07 UTC): fresh
install confirmed (1.1.0 / 16), every smoke item passed — board/safe areas, stock, undo,
tap move, scrubbed fixture + native scrubber pan (GH 3.3), deal again, drawer, Settings
draw-count change/restore, History + Teleport sheet + system back, hint under R8
(`libsoli_solver_ffi.so` loads, solver 165 ms), Skia celebration — bounded logcat clean;
20-game playlist 20/20 in 3 m 20 s with 0 crash tokens; PSS 155 MiB restart / 331 MiB
post-20 / 274 MiB after compacting GC (SDK 57: 292 / 530 / 468 MiB). Findings: three
upstream `ExpoModulesV2` enum/R8 warnings (expo-crypto digest enums, expo-sqlite
`SQLAction`; Soli does not use those paths) and Skia `EGLConsumer` teardown log noise —
nothing to fix. Soli is on `expo@58.0.12` / RN `0.88.0` / React `19.3.0`
(newest Expo patch allowed by Yarn's 24 h age gate; `58.0.14` becomes eligible ~20:00 UTC).
All Expo-managed packages follow `expo@58.0.12`'s `bundledNativeModules.json`: Reanimated
`4.7.1`, Worklets `0.13.0` (override and `expo.install.exclude` entry retired), GH `3.3.0`,
Screens `4.30.0`, Skia `2.14.0`, `expo-router 58.0.21`, `@expo/ui 58.0.19`, Jest `30.5.2`,
`jest-expo 58.0.11`, `@react-native/jest-preset 0.88.0`, Teleport `1.2.2`. Code changes:
`unstable_settings.anchor`, four RN 0.88 strict-type fixes, Jest resolver switched to
`react-native-reanimated/jest/resolver` (`jest-pnp-resolver` and the Worklets mock removed),
`react-test-renderer` made an explicit dev dependency. Gates: typecheck, lint, Jest
(45 suites / 458 tests), `check:tamagui`, format on touched files all green; `expo install
--check` / expo-doctor report only the five age-gated patch mismatches plus the pre-existing
`agent-device` script-name warning. Native dirs not yet deleted/rebuilt.

## Description

Upgrade Soli from Expo SDK 57 to Expo SDK 58, the latest stable Expo SDK as of
2026-10-17 (released 2026-10-15, after a public beta since 2026-09-29; `expo@58.0.14` is
`latest` on npm). SDK 58 moves React Native from 0.86 to 0.88 (skipping 0.87) and React
from 19.2.3 to 19.3.0, and ships new major/minor lines of the native libraries Soli leans
on most: Reanimated 4.7, Worklets 0.13, Gesture Handler 3, Screens 4.30, Skia 2.14,
Expo Router 58 (reworked navigation core), Expo UI 58, Jest 30.

Why this matters for Soli specifically:

- Soli's installed `expo@57.0.4` / `react-native@0.86.0` still contain the Hermes V1
  memory regression that Expo fixed in `expo@57.0.9` (RN 0.86.2) and `57.0.17`
  (RN 0.86.3). The SDK 57 plan's Android RAM baselines (about 292 MiB PSS on restart,
  470-530 MiB PSS after 20 demo games) were measured with that regression in place.
  SDK 58 (RN 0.88) carries the fix, so the upgrade is also a memory fix.
- Expo SDK 58 bundles Worklets `0.13.0`, which makes Soli's deliberate `0.10.1` override
  and the `expo.install.exclude` entry for `react-native-worklets` unnecessary.
- Xcode 27.0 is installed locally. RN 0.88 / SDK 58 add the UIKit scene life cycle
  (`SceneDelegate.swift`) that the iOS 27 SDK requires; SDK 58 is the supported path for
  that toolchain.
- Soli is animation- and gesture-heavy and uses native UI (Expo UI, Skia atlas
  celebrations, Reanimated worklets, a local Rust solver Expo module), so fresh native
  builds and smoke tests on both platforms are part of the upgrade, not optional.

Current local baseline (2026-10-17):

| Area | Current | Target |
| --- | --- | --- |
| Expo SDK | `~57.0.4` (`expo@57.0.4` installed; sdk-57 tag is `57.0.30`) | `~58.0.14` |
| React Native | `0.86.0` | `0.88.0` |
| React / react-dom | `19.2.3` | `19.3.0` |
| Node | `v26.8.2` | OK (SDK 58: 22.13+, 24.3+, or 26+) |
| Xcode | `27.0 (27A266a)` | OK (SDK 58 built for iOS 27 SDK; min 26.4) |
| JDK | `17.0.20.1` | OK (AGP 9 minimum and default is JDK 17) |
| Android SDK | platforms `android-36`, build-tools `35.0.0`, `36.0.0` | RN 0.88 needs `compileSdk 37` + build-tools `37.0.0` (Gradle auto-downloads; licenses are accepted locally) |
| Yarn | `4.17.1`, `nodeLinker: node-modules`, `npmMinimalAgeGate: 1d` | unchanged |
| Native dirs | local `ios/` and `android/` exist, git-ignored (CNG output) | delete and regenerate |

Sources checked on 2026-10-17 (official first):

- https://expo.dev/changelog/sdk-58 (release 2026-10-15)
- https://docs.expo.dev/versions/latest/ (SDK 58: RN 0.88, React 19.3.0, RNW 0.21.0, Node 22.13.x, Xcode 26.4+, compileSdk 37 / targetSdk 36)
- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- https://docs.expo.dev/router/migrate/sdk-57-to-58/
- https://docs.expo.dev/versions/v58.0.0/sdk/build-properties/ (R8 default, `useHermesV1` default `true`, `enableSceneSupport`)
- https://reactnative.dev/blog/2026/08/11/react-native-0.87 (Strict TS API default, removals, toolchain minimums)
- https://reactnative.dev/blog/2026/10/19/react-native-0.88 (EventTarget dispatch, variable fonts, SceneDelegate, "no user-facing breaking changes")
- https://github.com/software-mansion/react-native-reanimated/releases (4.6.0, 4.7.0, 4.7.1)
- Worklets 0.13.0 changelog, Gesture Handler 3 migration guide (docs.swmansion.com), Jest 30 blog + upgrade guide
- https://github.com/Shopify/react-native-skia/releases (2.7.0 to 2.14.0)
- Tamagui v3 release notes + upgrade guide, Tamagui issue #4324 (Metro 0.87 / SDK 58)
- https://github.com/expo/skills (upstream skill now named `expo-upgrade`, commit 927dd7c, 2026-10-16)
- `https://exp.host/--/api/v2/versions`, `expo@58.0.14/bundledNativeModules.json`, and the package tarballs of
  `expo-router@58.0.23`, `@expo/ui@58.0.20`, `expo-sqlite@58.0.13`, `expo-linking@58.0.13`,
  `jest-expo@58.0.11`, `react-native-gesture-handler@3.3.0`, `react-native-reanimated@4.7.1`
  (read in a scratch directory; nothing installed)

## Acceptance Criteria

- `package.json` and `yarn.lock` are aligned to Expo SDK 58 via Expo tooling, not manual
  version guessing: `npx expo install expo@^58.0.0 --fix` succeeds, `npx expo install --check`
  passes, `npx expo-doctor@latest` passes or every remaining warning has a scoped rationale.
- `react-native-worklets` is removed from `expo.install.exclude` and resolves to Expo's
  bundled `0.13.0`; the SDK 57 `0.10.1` override and its comment trail are retired (guide
  updated). `typescript` stays excluded (Soli intentionally runs TypeScript 7 / tsgo).
- `@react-native/jest-preset` is `^0.88.0`; Jest runs on `~30.5.2` with `@types/jest 30.0.0`
  (Expo's SDK 58 related packages), all suites green.
- Package guides in `docs/external-package-guides/` are refreshed with dated SDK 58 facts:
  `expo.md`, `react-native.md`, `react-native-reanimated.md` (incl. Worklets 0.13 and the
  removed override), `expo-router.md`, `expo-ui.md`, `react-native-skia.md`,
  `react-native-jest-preset.md` (Jest 30), `tamagui.md` (SDK 58 compatibility note), plus a new
  `react-native-gesture-handler.md` (builder API deprecated in v3, hook API is the future).
- Local `android/` and `ios/` are deleted and regenerated by clean prebuild; no tracked native
  files are added.
- No optional SDK 58 feature adoption (React Compiler, Expo Modules 2.0, Noxcturnal transformer,
  Tamagui 3, Gesture Handler hook API, `Stack.Toolbar`, Hermes toggles) is bundled into this
  upgrade. Candidates are recorded under Follow-ups.
- Cheap gates pass: `yarn format:check`, `yarn typecheck`, `yarn lint`, `yarn jest --runInBand`,
  `yarn check:tamagui`.
- A clean iOS simulator build (`yarn ios` after deleting `ios/`) is created and smoke-tested,
  including a cold-start deep link (new SceneDelegate path).
- An Android release build (`yarn release` after deleting `android/`) is created with R8 now on
  by default, installed on the physical phone, confirmed fresh, and smoke-tested, including the
  Rust solver (hint button) and celebration overlay (Skia).
- Native builds are serialized (one build at a time, one agent per device).
- The 20-game demo playlist completes on both platforms without crash, and RAM is sampled with
  the SDK 57 method so the Hermes-regression fix can be compared against the SDK 57 baselines.
- No staging or commits.

## Recommendation: go now or wait?

Recommendation: **go now, as a dedicated upgrade session**, with two timing notes.

| | Go now (SDK 58, `expo@58.0.14`) | Wait (stay on 57, optionally patch to `57.0.30`) |
| --- | --- | --- |
| Pros | Fixes the Hermes V1 memory regression Soli is still shipping (`0.86.0`); retires the Worklets override; aligns with Xcode 27 / iOS 27 scene life cycle; SDK 58 had a 2.5-week public beta and 14 patch releases before stable; RN 0.88 is the third consecutive "no user-facing breaking changes" release; Reanimated 4.7.1 / Worklets 0.13 / GH 3.3 / Skia 2.14 are all 3-5 weeks old, not day-one; Tamagui ecosystem already targets SDK 58 (issue #4324 fixed 2026-10-15 in 3.0.14) | Zero risk today; `expo install --fix` within SDK 57 alone would also fix the memory regression (RN 0.86.3) with a much smaller surface |
| Cons | Stable is 2 days old, so point releases will keep landing for weeks; Jest 30, GH 3, Reanimated 4.7 (new layout-animation engine default), Expo Router core rework and Android R8-by-default all land at once; Tamagui `2.4.2` on RN 0.88 / Metro 0.87 is unverified by upstream (v2 line ended 2026-08-15) | Soli falls further behind (two RN majors by SDK 59); the Worklets override and SDK 57 Android/iOS toolchain drift stay; every future store build needs scene support once EAS images move to Xcode 27 |
| Verdict | Recommended | Fallback only if the Tamagui 2.4.2 + Metro 0.87 combination turns out broken and cannot be fixed by a 2.x bump (see Open question 2) |

Timing notes:

1. Yarn's `npmMinimalAgeGate: 1d` blocks versions younger than 24 h. `expo@58.0.14` was
   published 2026-10-16 19:51 UTC and `expo-router@58.0.23` at 19:53 UTC, so
   `npx expo install expo@^58.0.0 --fix` will fail to resolve them before about
   **2026-10-17 20:00 UTC (22:00 CEST)**. Run the install step after that (or on 2026-10-18).
   Do not weaken the gate; it is a deliberate supply-chain protection (see `.yarnrc.yml`).
   Research, guide refresh and audit steps can run before then.
2. Serialize native builds; expect the first Android build to download Gradle 9.4.1,
   compileSdk 37 and build-tools 37.0.0.

## Possible approaches incl. pros and cons

| Approach | Pros | Cons |
| --- | --- | --- |
| Official Expo 57 -> 58 flow (`expo install --fix`, `--check`, `expo-doctor`, delete native dirs, rebuild) | Smallest change; Expo picks the validated package matrix; proven in the SDK 56 and 57 upgrades | Still needs fresh native builds and runtime smoke on both platforms |
| Manual pinning | Apparent control | Mismatch risk for Reanimated/Worklets/GH/Screens; rejected in SDK 56/57 too |
| Upgrade plus Tamagui 3 / GH hook API / React Compiler in one go | Fewer sessions | Scope creep; harder to attribute regressions; Tamagui 3 is a syntax migration of its own (flat style props, config v6, babel plugin removal) |
| Patch within SDK 57 only (`expo@57.0.30`, RN 0.86.3) | Fixes memory regression cheaply | Postpones everything else; two majors later |

Recommendation: official Expo flow, no feature adoption, follow-ups tracked separately.

## Open questions to the user

Proceeding with the recommended answers unless redirected.

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | Stable or prerelease? | Stable `58.0.x` / canary | Stable `~58.0.14` (or newer patch at install time). |
| 2 | Tamagui: stay on `2.4.2`, bump to last v2 (`2.7.7`), or migrate to v3 (`3.0.18`)? | (a) stay 2.4.2 (b) 2.7.7 (c) v3 | (a) Stay on `2.4.2` for this upgrade. Its metro plugin has no Metro version gate (verified in `@tamagui/metro-plugin/dist/cjs/index.js`; the 0.84-only gate that broke SDK 58 was added in v3). Its only RN deep import (`@tamagui/portal` -> `Libraries/Renderer/shims/ReactFabric`) still exists in RN 0.88 and is wrapped in try/catch. If Metro/Babel extraction fails with Metro 0.87, try (b) `2.7.7` (same major, 2026-08-15) before anything else. (c) v3 is a separate task: it removes `@tamagui/babel-plugin`, moves the metro plugin to `@tamagui/cli/metro`, drops v2 condition objects (`hoverStyle`, `$sm`) with no runtime compatibility path, and renames config v6 theme keys. |
| 3 | `react-native-teleport`: keep `1.1.9` or bump to `1.2.2`? | keep / bump | Bump to `1.2.2` in the same install step. It is a codegen native component (not Expo-managed), `1.2.2` (2026-09-10) is the version current when RN 0.88 RC existed, peers are `*`. Fall back to `1.1.9` if it misbehaves; both need the same clean native rebuild anyway. |
| 4 | Jest: move to Jest 30 (Expo's `~30.5.2`) or pin 29? | 30 / 29 | Jest 30. `jest-expo@58` declares `jest ^29 || ^30` but depends on `babel-jest`, `jest-environment-node`, `jest-mock`, `jest-snapshot` `^30`, so staying on 29 would mix two Jest trees. Soli uses no removed alias matchers (grep clean), has 0 snapshots, 45 test files, `jest --watchAll` only. |
| 5 | Android R8 (now on by default in release builds)? | keep default / opt out via `expo-build-properties` | Keep R8 on. It matches what the store build will do and shrinks the APK (currently about 118 MB). Smoke the Rust solver JNI (`SoliSolverModule.kt:17-20`), expo-sqlite and Skia explicitly. If anything breaks, re-add `expo-build-properties` with `android.enableMinifyInReleaseBuilds: false` and document the reason. Note: `yarn release` is a release build, so local test builds get slower by the R8 step; measure and record. |
| 6 | TypeScript 7 (`^7.0.2`, excluded from Expo checks) vs Expo's `~6.0.3`? | keep 7 / align 6 | Keep 7. RN 0.88's Strict TypeScript API is already the default via `expo/tsconfig.base` (`customConditions: ["react-native"]`, unchanged between 57 and 58) and Soli has zero `react-native/Libraries/*` deep imports. Only fall back to `~6.0.3` if `yarn typecheck` fails inside RN's generated types. |
| 7 | Sync the local `upgrading-expo` skill with upstream? | sync now / note only | Sync now (docs-only, small). Upstream renamed it to `expo-upgrade` and added: Hermes V1 memory-regression guidance, "review implicit packages individually, keep `expo-constants` with expo-router" (Soli has it), SDK 56 react-navigation reference, feedback command. Keep the local directory name `.agents/skills/upgrading-expo` to avoid breaking references; copy upstream contents. |
| 8 | Expo Router `unstable_settings.initialRouteName` -> `anchor`? | rename now / leave | Rename now (`app/_layout.tsx:17-20`). SDK 58's migration guide replaces `initialRouteName` with `unstable_settings.anchor`; one-line change, verified by typecheck and launch smoke. |
| 9 | Run the 20-game RAM comparison? | yes / skip | Yes on both platforms (not optional this time): it is the only way to see whether the Hermes V1 fix changes Soli's footprint versus the SDK 57 baselines. Same method as the SDK 57 plan (`agent-device perf memory sample`, Android PSS/RSS, iOS resident). |

## Dependencies

No new app feature dependency. Expected Expo-managed version changes
(`bundledNativeModules.json` 57.0.30 vs 58.0.14 plus `relatedPackages` from the versions API):

| Package | Current (`package.json` / installed) | SDK 58 target | Notes |
| --- | --- | --- | --- |
| `expo` | `~57.0.4` / 57.0.4 | `~58.0.14` (installed `58.0.14`, 2026-10-17 19:55 UTC) | sdk-57 tag is 57.0.30; Soli is 26 patches behind within 57 |
| `react-native` | `0.86.0` | `0.88.0` | Hermes `260318099.0.4` (V1), Metro 0.87 |
| `react`, `react-dom` | `19.2.3` | `19.3.0` | ViewTransition/Fragment refs stable; no breaking changes |
| `react-native-reanimated` | `4.5.0` | `4.7.1` | 4.7: new layout-animation engine default, `measure` on unmounted ref returns `null` + warning, `AnimatedRefOnUI` is a Shareable; supports RN 0.86-0.88, pairs with Worklets 0.13.x |
| `react-native-worklets` | `0.10.1` (override, excluded) | `0.13.0` | Remove from `expo.install.exclude`; peers RN `0.86 - 0.88`; 0.13 removed `FETCH_PREVIEW_ENABLED`, Serializable handle, and made `makeShareable` eager |
| `react-native-gesture-handler` | `~2.32.0` | `~3.3.0` | Major. Builder API (`Gesture.Pan()`, `.Tap()`, `.Exclusive()`) is `@deprecated` in 3.3.0 typings but still present; hook API (`usePanGesture`) is new; `PureNativeButton` removed; legacy arch dropped |
| `react-native-screens` | `4.25.2` | `~4.30.0` | expo-router 58 peer `^4.30.0 \|\| ^5.0.0-alpha.3`; Reanimated 4.7.1 fixes a crash with screens < 4.27 |
| `react-native-safe-area-context` | `~5.7.0` | `~5.10.1` | Expo changelog asks to update it explicitly |
| `react-native-svg` | `15.15.4` | `15.16.0` | still uses `react-native/Libraries/Utilities/codegenNativeComponent` deep import, which exists in RN 0.88 |
| `@shopify/react-native-skia` | `2.6.2` | `2.14.0` | 2.10 host objects -> native states; 2.13 legacy arch removed; 2.14 mutable `SkPath` API removed (Soli uses no `Skia.Path`). Repo moved to `wcandillon/react-native-skia`; v3 is published as unscoped `react-native-skia@3.6.2`, `@shopify/*` 2.x continues on `release-2.x` (2.15.1). Stay on Expo's 2.14.0 |
| `expo-router` | `~57.0.4` | `~58.0.23` (installed `58.0.23`, 2026-10-17 19:55 UTC) | reworked navigation core; see audit below |
| `@expo/ui` | `~57.0.4` | `~58.0.20` (installed) | iOS `<Host>` top-aligns; `HStack`/`VStack` unset spacing = system default; Android `RNHostView` `style` removed |
| `expo-sqlite` | `~57.0.0` | `~58.0.13` | libSQL removed (unused); `SQLiteStorage` first-run migration race fixed |
| `expo-constants`, `-crypto`, `-font`, `-linear-gradient`, `-linking`, `-splash-screen`, `-status-bar`, `-system-ui` | 57.x | 58.x | expo-font: `getLoadedFonts()` iOS name change (unused), variable fonts; expo-linking: `Linking.parse()` no longer double-decodes (Soli uses `new URL`) |
| `react-native-web` | `^0.21.2` | `~0.21.4` | web is not a target |
| `jest` / `@types/jest` | `~29.7.0` / `29.5.14` | `~30.5.2` / `30.0.0` | Jest 30: alias matchers removed, `--testPathPatterns`, case-sensitive `jest.mock` paths, non-enumerable props excluded from equality |
| `jest-expo` | `~57.0.1` | `~58.0.11` | peer `@react-native/jest-preset ^0.88.0` |
| `@react-native/jest-preset` | `^0.86.0` | `^0.88.0` | not in bundled list; align manually (`npx expo install --dev @react-native/jest-preset` as in SDK 57, or `yarn add -D @react-native/jest-preset@0.88.0`) |
| `babel-preset-expo`, `@expo/metro-runtime` | 57.x | `~58.0.17`, `~58.0.14` | |
| `@types/react` | `^19.2.17` | `~19.3.0` | |
| `@babel/core` | `^7.29.7` | `^7.29.7` | unchanged |
| `typescript` | `^7.0.2` (excluded) | keep | Expo's related package says `~6.0.3`; see Open question 6 |
| `tamagui` + `@tamagui/*` (7 packages) | `2.4.2` | keep `2.4.2` | see Open question 2; all `@tamagui/*` must stay on one version (`yarn check:tamagui`) |
| `react-native-teleport` | `1.1.9` | `1.2.2` | see Open question 3 |
| `@expo/material-symbols` | `^0.1.1` | unchanged | expo-router 58 optional peer `expo-symbols` is not needed |
| `agent-device` | `0.19.3` | unchanged | latest is 0.21.28; bump only if Xcode 27 / iOS 27 simulators fail to drive (separate decision) |

Resolved after the age-gate patch bump (2026-10-17 18:30 UTC): `expo 58.0.13`,
`expo-router 58.0.22`, `@expo/ui 58.0.20`, `expo-crypto 58.0.7`, `expo-splash-screen 58.0.10`,
`expo-modules-core 58.0.21`, `babel-preset-expo 58.0.17` (single copy after `yarn dedupe`),
`@expo/cli 58.1.10`; unchanged: `react-native 0.88.0`, `react 19.3.0`, `expo-sqlite 58.0.13`,
`expo-constants 58.0.12`, `expo-linking 58.0.13`, `expo-font 58.0.8`, `jest-expo 58.0.11`,
`@expo/metro-runtime 58.0.14` and all non-Expo packages. Still gated (eligible ~19:55 UTC):
`expo 58.0.14` (only bumps `expo-modules-core ~58.0.22` + `@expo/cli ^58.1.11`),
`expo-router 58.0.23` (deep-link-into-existing-navigator fix + `@expo/schema-utils 58.0.2`).

Toolchain pulled in by the regenerated Android project (Expo SDK 58 bare template):
Gradle `9.4.1`, AGP 9 (with `android.builtInKotlin=false`, `android.newDsl=false` opt-outs in
`gradle.properties`), Kotlin 2.2.x, `compileSdk 37`, `buildTools 37.0.0`, `targetSdk 36`,
`minSdk 24`, `android.enableMinifyInReleaseBuilds=true`, `hermesEnabled=true`,
`newArchEnabled=true`, `edgeToEdgeEnabled=true`, `org.gradle.jvmargs=-Xmx2048m -XX:MaxMetaspaceSize=512m`
(Soli's `plugins/withBuildSpeedGradleProperties.js` overrides jvmargs to `-Xmx4g`, enables build
and configuration cache).

Package guides used or updated: `docs/external-package-guides/expo.md`, `react-native.md`,
`react-native-reanimated.md`, `expo-router.md`, `expo-ui.md`, `react-native-skia.md`,
`react-native-jest-preset.md`, `tamagui.md`, `react-native-teleport.md`, new
`react-native-gesture-handler.md`.

## UX/UI Considerations

No intended UX change. Validation focuses on where native runtime changes can alter behavior:

- board layout and card geometry; drag, tap, stock draw, undo, auto-up, win animations
- Undo scrubber (the only Gesture Handler consumer; GH 3 builder API, Reanimated 4.7)
- celebration overlay (Skia 2.14 atlas + `Skia.Surface.MakeOffscreen`)
- Settings screen: Expo UI `<Host style={{ flex: 1 }}>` now top-aligns on iOS (should be
  invisible because `FieldGroup` fills the host; confirm with a screenshot), native `Switch`,
  `Picker`, header `Icon` in `Host matchContents`
- History screen and preview sheet (`BottomSheet` + `RNHostView matchContents`; Expo UI 58
  fixed hosted-view touches and measurement inside sheets)
- drawer/header controls (`DrawerActions.openDrawer()` dispatch is now queued until after
  commit), Android hardware back, safe areas, status/navigation bars on Android 15+ and iOS 27
- deep links: `yarn deeplink` cold start on iOS now goes through `SceneDelegate` ->
  `RCTLinkingManager`; `Linking.getInitialURL()` in `useDemoGameLauncher.ts:1304` and
  `app/+native-intent.tsx` must still fire
- hint button / unwinnable warning (Rust solver JNI under R8)

## Components

Reuse existing components. No new UI components. Keep Tamagui wrapper/config files as they are.

## How to fetch data, how to cache

Not applicable.

## Related tasks

- Prior plans: `docs/product/expo-rn-sdk-57-upgrade/upgrade-to-expo-sdk-57-and-react-native-0-86.md`
  (procedure, Worklets override, CMake cleanup, RAM method),
  `docs/product/expo-rn-sdk-56-upgrade/upgrade-to-expo-sdk-56-and-react-native-0-85.md`
  (jest-preset learning, react-navigation import move).
- `docs/product/faster-builds/faster-builds.md` (Gradle properties plugin; R8 now adds release build time).
- Testing cookbook: `.agents/skills/soli-testing/SKILL.md` (build/run, deep links, RAM sampling via agent-device).
- Uncommitted working-tree changes (hints feature, deal deep links in `app.json`) are unrelated and
  must not be touched, staged, unstaged or reverted.

## Codebase audit: SDK 58 / RN 0.87-0.88 changes that touch Soli

| Change | Soli hits (file:line) | Action |
| --- | --- | --- |
| Expo Router: `unstable_settings.initialRouteName` replaced by `anchor` | `app/_layout.tsx:17-20` | Rename to `anchor: '(tabs)'` (Open question 8) |
| Expo Router: many `expo-router/react-navigation` compatibility exports removed | `app/_layout.tsx:6` (`DarkTheme`, `DefaultTheme`, `ThemeProvider`), `app/(tabs)/index.tsx:3` + `components/navigation/HeaderMenuButton.tsx:3` (`HeaderButton`), `src/navigation/useDrawerOpener.ts:3-7` (`DrawerActions`, `useNavigation`), `src/features/klondike/hooks/useKlondikeTimer.ts:3` (`useFocusEffect`) | All still exported in `expo-router@58.0.23` (`native`, `elements`, `core`, `routers` entry points); typecheck confirms. No change expected |
| Expo Router: `navigation.dispatch` queued until after commit; `useNavigation` throws outside a navigator | `src/navigation/useDrawerOpener.ts:11-18`; `useNavigation().setOptions` in `app/(tabs)/{index,settings,history,hello}.tsx` | Behavior check in smoke (drawer opens, headers render). All calls are inside routes |
| Expo Router: Drawer shows only declared screens | `app/(tabs)/_layout.tsx:36-70` declares all four routes (`index`, `hello`, `history` in `Drawer.Protected`, `settings`) | None |
| Expo Router: `freezeOnBlur` no-op, `web.output` default `server`, async web routes | not used; `app.json` sets `web.output: "static"`; web not a target | None |
| Expo Router: `expo-router/drawer` exports | `components/navigation/AppDrawerContent.tsx:2-7` (`DrawerContentScrollView`, `DrawerItem`, `DrawerItemList`, `DrawerContentComponentProps`) | Still exported in 58; none |
| Expo UI: iOS `<Host>` top-aligns | `app/(tabs)/settings.tsx:87` (`Host style={{ flex: 1 }}` around `FieldGroup`), `components/navigation/HeaderMenuButton.tsx:39` (`Host matchContents`) | Visual check only |
| Expo UI: Android `RNHostView` `style` prop removed | `components/AppSheet.tsx:13` uses `matchContents` only | None |
| Expo UI: `HStack`/`VStack` default spacing | not used (Soli uses `Row`/`Column`/`Spacer` in `components/settings/*`) | None |
| RN 0.87 removals: `InteractionManager`, `Touchable`, `Modal animated`, `StatusBar` props, `NativeMethods`, deep imports | none in `app/`, `components/`, `src/` (`StatusBar` comes from `expo-status-bar`); `node_modules/expo-router@57` `Card.js` used `InteractionManager` but 58 does not | None |
| RN 0.87: `useColorScheme()` returns `ColorSchemeName \| null`, never `'unspecified'` | `app/_layout.tsx:54`, `components/Provider.tsx:26`, `src/features/klondike/components/FeltBackground.tsx:9`, `src/features/klondike/hooks/useKlondikeGame.ts:182`, `src/dev/FeatureGraphicScreen.tsx` | Already typed for `null`; none |
| RN 0.88: ScrollView programmatic scrolls no longer cancel touches in enclosing scroll views; EventTarget dispatch | no `scrollTo` usage; touch responder unchanged | Smoke only |
| Reanimated 4.7: `measure()` on unmounted ref returns `null` + warning | 6 `measure(` call sites in `src/` (undo scrubber, board metrics) | Check they handle `null` (they should already); watch logs for new warnings |
| Reanimated 4.7: new layout-animation engine default | no `entering`/`exiting`/`layout` props found | None |
| Gesture Handler 3: builder API deprecated | `src/features/klondike/hooks/useUndoScrubber.ts:342-450` (`Gesture.Tap().runOnJS(true)`, `Gesture.Pan()` with `.minDistance/.failOffsetY/.shouldCancelWhenOutside/.hitSlop/.cancelsTouchesInView/.maxPointers`, `Gesture.Exclusive`), `src/features/klondike/components/UndoScrubber.tsx:10,127` (`GestureDetector`), `components/Provider.tsx:15` (`GestureHandlerRootView`) | No change now (deprecation is JSDoc-only); hook-API migration is a follow-up |
| Worklets 0.13 | `test/setup/mock-worklets.ts:10` mocks `react-native-worklets/src/mock` | Verify the mock path still exists in 0.13.0 |
| Skia 2.14 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (`Atlas`, `Canvas`, `Group`, `Image`, `useFont`, `Shadow`, `RoundedRect`, `Skia.Surface.MakeOffscreen` :975, `Skia.Paint` :982, `Skia.XYWHRect`, `Skia.RRectXY`) | No `Skia.Path` (removed mutable API); run `yarn celebration` smoke |
| expo-sqlite libSQL removal | not used (`src/storage/*`, `expo-sqlite/kv-store`) | None |
| expo-linking `Linking.parse()` decoding | not used; `useDemoGameLauncher.ts:935` uses `new URL()` | None |
| Android R8 default on | `modules/soli-solver/android/.../SoliSolverModule.kt:17,20` (`System.loadLibrary`, `external fun nativeSolve`) | Default `proguard-android-optimize.txt` keeps native methods; smoke the hint button on the release APK |
| iOS scene life cycle | CNG, no custom `AppDelegate`; `app/+native-intent.tsx` deep-link handling | Cold-start deep-link smoke on simulator |
| Jest 30 | `package.json` jest config (`moduleNameMapper` for `expo-sqlite`, `expo/src/winter`; `resolver: jest-pnp-resolver`; `setupFiles`; `transformIgnorePatterns`) | Run suite; see Simplification ideas |
| Build scripts patch the generated `android/app/build.gradle` by exact string match | `run-android-release.sh:20-120`, `build-android.sh:7-110` (default `signingConfigs`/`release` blocks) | After prebuild, confirm the RN 0.88 template still contains those exact blocks (the SDK 58 template still uses `signingConfigs.debug` with the "Caution!" comment) |

### Future Expo Upgrade Check: Stack.Toolbar (from the SDK 57 plan)

SDK 58 marks toolbars stable in Expo Router (`Stack.Toolbar` needs the optional peer
`@expo/ui`, which Soli has). Open points to re-check during this upgrade (research only,
15 minutes cap, no code): does `Stack.Toolbar` now compose into Drawer-owned headers, or is it
still Stack-only? Soli's Play/Settings/History headers belong to the Drawer in
`app/(tabs)/_layout.tsx`. Default outcome: not adopted in this upgrade; record the finding under
Follow-ups.

## Risk list

| # | Risk | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Yarn `npmMinimalAgeGate` rejects `expo@58.0.14` / `expo-router@58.0.23` until ~2026-10-17 20:00 UTC | High if run earlier | Install fails ("no candidates") | Run the install step after the gate window; never lower the gate |
| R2 | Tamagui `2.4.2` with Metro 0.87 / RN 0.88 (v2 line ended 2026-08-15; v3 needed a fix for Metro 0.87) | Medium | Bundling or extraction failure, or runtime style bugs | No Metro gate in 2.4.2 (verified). Fallback: `2.7.7`; last resort: temporarily disable `@tamagui/babel-plugin` extraction (`disableExtraction`) to isolate; Tamagui 3 is a separate task |
| R3 | Android R8 strips something (Rust JNI module, sqlite, Skia, Expo modules) | Low-Medium | Release APK crashes or hint button silent failure | Default optimize rules keep native methods and libraries ship consumer rules; smoke hint/celebration/history; opt out via `expo-build-properties` if needed |
| R4 | Gradle config-cache + AGP 9 + Gradle 9.4.1 with Soli's `withBuildSpeedGradleProperties` | Medium | Configuration-cache errors on first build | Retry once with `--no-configuration-cache` / delete `android/.gradle/configuration-cache`; if persistent, drop the property in the plugin with a comment |
| R5 | Stale native output (Podfile.lock, CMake hashes) as in SDK 57 | High if not cleaned | pod install / Ninja failures | Delete `ios/` and `android/` entirely before building (Expo's own SDK 58 instruction); also clear `node_modules/{react-native-worklets,react-native-reanimated,expo-modules-core}/android/{.cxx,build}` |
| R6 | Jest 30 breaks setup (`jest-pnp-resolver`, `expo/src/winter` mapper, worklets mock path) | Medium | Red suite | Fix mapper/mocks; consider dropping `jest-pnp-resolver` (Simplification ideas) |
| R7 | TypeScript 7 (tsgo) vs RN 0.88 generated strict types | Low-Medium | typecheck errors inside RN types | `skipLibCheck` is on; fallback to `typescript ~6.0.3` |
| R8 | Gesture Handler 3 behavior change in the undo scrubber (same builder API, new internals) | Low-Medium | Scrubber tap/pan misfires | `yarn scrubtest` on both platforms |
| R9 | Skia 2.14 atlas/surface semantics (2.10 native states, 2.14 API cleanup) | Low-Medium | Celebration overlay glitches/crash | `yarn celebration` + 20-game playlist |
| R10 | Gradle Metaspace OOM / machine load during Android build (seen in SDK 57) | Medium | Build fails | Serialize builds, `./gradlew --stop` before retry; plugin already sets `MaxMetaspaceSize=1g` |
| R11 | iOS scene life cycle changes deep-link delivery (`getInitialURL`) | Low | Demo links do not launch on cold start | Explicit cold-start `yarn deeplink --ios` smoke |
| R12 | `agent-device 0.19.3` with Xcode 27 / iOS 27 simulators | Low-Medium | Testing automation fails, not the app | Bump agent-device only if driving fails; note in testing report |
| R13 | Expo UI `Host` top-align shifts Settings layout on iOS | Low | Visual regression | Screenshot compare |
| R14 | Phone wireless ADB flakiness (duplicate mDNS alias) | Medium | Install/smoke blocked | Use plain IP serial as in SDK 57; `scripts/android-ready.sh` |

## Simplification ideas

- Remove the `react-native-worklets` entry from `expo.install.exclude` (the whole reason for it
  is gone). Keep `typescript` excluded, with the existing rationale.
- `jest-pnp-resolver` predates `nodeLinker: node-modules`; with Jest 30 this is a good moment to
  drop it (one fewer dev dependency; frees the `resolver` slot). Trade-off: only do it if the
  suite is green without it; keep `test/setup/mock-worklets.ts` as is.
- `react-native-web` is only needed as a Tamagui/Expo peer (web is not a target); leave as is.
- Do not add `expo-build-properties` back unless R8 or the scene life cycle forces it.
- Keep `babel.config.js` / `metro.config.js` (still Tamagui integration, not plain defaults).
- Delete the stale `expo-router` InteractionManager note from the SDK 57 guide if present.

## Steps to implement

Research and docs (can run before the age-gate window):

- [x] Research official SDK 58 / RN 0.87 / RN 0.88 sources, library release notes, upstream
  skill delta, and inspect the dependency/toolchain baseline (this plan, 2026-10-17).
- [x] Sync `.agents/skills/upgrading-expo/` with upstream `plugins/expo/skills/expo-upgrade`
  (SKILL.md body, `agents/openai.yaml` display name, add
  `references/react-navigation-to-expo-router.md`; keep the local directory name).
  Done 2026-10-17: body is byte-identical to upstream main (2026-10-16); frontmatter `name`
  stays `upgrading-expo` with a sync note; the six existing references were already identical.
- [x] Refresh package guides with dated SDK 58 facts before touching dependencies (done
  2026-10-17; each guide got a dated SDK 58 section on top, `react-native-gesture-handler.md`
  is new, the Worklets `0.10.1` section in the Reanimated guide is marked historical):
  `expo.md`, `react-native.md`, `react-native-reanimated.md` (Worklets 0.13, override removed,
  4.7 layout engine / `measure` null), `expo-router.md` (58 core rework, removed exports,
  `anchor`, toolbar status), `expo-ui.md` (Host top-align, RNHostView style, BottomSheet props),
  `react-native-skia.md` (2.14, repo move, v3 naming), `react-native-jest-preset.md` (Jest 30),
  `tamagui.md` (2.4.2 on SDK 58 status, v3 pointers), `react-native-teleport.md` (1.2.2), new
  `react-native-gesture-handler.md`.

Dependency alignment (after ~2026-10-17 20:00 UTC):

- [x] Preflight (2026-10-17 10:53 UTC): no Metro/Gradle/Xcode/agent-device processes; working
  tree scope unchanged (unrelated hints-feature changes left alone). The age-gate window was
  NOT waited for: orchestrator decision was to target the newest eligible patch instead.
- [x] Edit `package.json`: `expo.install.exclude` now lists only `"typescript"`. The override
  trail lives in `docs/external-package-guides/react-native-reanimated.md` (section marked
  historical), since `package.json` cannot hold comments.
- [x] Install. `npx expo install expo@~58.0.12 --fix` installed `expo@58.0.12` but the `--fix`
  pass reads Expo's versions API (which names the gated `58.0.14` set) and aborted on
  `yarn add expo@~58.0.14` ("All versions satisfying ~58.0.14 are quarantined"). So the
  aligned set was written by hand from `expo@58.0.12/bundledNativeModules.json` plus the API's
  related packages, stepping down only where the API minimum was younger than 24 h, then
  `yarn install` (29 s). Exact resolved versions:
  `expo 58.0.12`, `react-native 0.88.0`, `react 19.3.0`, `react-dom 19.3.0`,
  `react-native-reanimated 4.7.1`, `react-native-worklets 0.13.0`,
  `react-native-gesture-handler 3.3.0`, `react-native-screens 4.30.0`,
  `react-native-safe-area-context 5.10.1`, `react-native-svg 15.16.0`,
  `@shopify/react-native-skia 2.14.0`, `expo-router 58.0.21`, `@expo/ui 58.0.19`,
  `expo-sqlite 58.0.13`, `expo-constants 58.0.12`, `expo-crypto 58.0.6`, `expo-font 58.0.8`,
  `expo-linear-gradient 58.0.3`, `expo-linking 58.0.13`, `expo-splash-screen 58.0.9`,
  `expo-status-bar 58.0.3`, `expo-system-ui 58.0.6`, `expo-modules-core 58.0.20`,
  `react-native-web 0.21.4`, `jest 30.5.2`, `jest-expo 58.0.11`, `@types/jest 30.0.0`,
  `@types/react 19.3.0`, `babel-preset-expo 58.0.16`, `@expo/metro-runtime 58.0.14`,
  `metro 0.87.1`, `hermes-compiler 260318099.0.4`, `@expo/cli 58.1.10`.
  Stepped down because of the age gate (API expects): `expo ~58.0.12` (`~58.0.14`),
  `expo-router ~58.0.21` (`~58.0.23`), `@expo/ui ~58.0.19` (`~58.0.20`),
  `expo-crypto ~58.0.6` (`~58.0.7`), `expo-splash-screen ~58.0.9` (`~58.0.10`),
  `babel-preset-expo` resolved `58.0.16` (`58.0.17` gated; range `~58.0.0` is fine).
- [x] Non-bundled packages: `@react-native/jest-preset ^0.88.0` -> `0.88.0`,
  `react-native-teleport 1.2.2`. Tamagui `2.4.2`, `typescript ^7.0.2`, `agent-device 0.19.3`,
  oxlint/oxfmt untouched. Added explicit dev deps `react-test-renderer 19.3.0` and
  `@types/react-test-renderer ^19.1.0` (see learnings). `yarn dedupe react-native-web`
  collapsed the `0.21.2` copies under `@tamagui/static` / `@tamagui/vite-plugin` into `0.21.4`.
- [x] `npx expo install --check` and `npx expo-doctor@latest` (1.21.5): only the five age-gated
  patch mismatches above and the pre-existing "script `agent-device` conflicts with
  `node_modules/.bin`" warning remain (18/20 checks pass). 82 peer warnings from
  `yarn explain peer-requirements`, all Tamagui-internal / `@expo/cli` optional peers as before,
  plus `@react-native/jest-preset@0.88.0` still depending on `babel-jest ^29.7.0` (upstream).
- [x] Code adjustments: `app/_layout.tsx` `anchor`; RN 0.88 strict-type fixes in
  `src/theme/index.ts` (`ColorSchemeName | null | undefined`), `app/(tabs)/history.tsx`
  (`ListFooterComponent` `null` -> `undefined`), `UndoScrubber.tsx` and
  `CelebrationOverlayLayer.tsx` (`useRef<React.ComponentRef<typeof View>>`),
  `src/dev/FeatureGraphicScreen.tsx` (Image `borderRadius` -> `style`). Jest: resolver switched
  to `react-native-reanimated/jest/resolver`, `test/setup/mock-worklets.ts` deleted. Inline
  comments added at each site.
- [x] Leftover audit: no hits for `react-native/Libraries`, `InteractionManager`,
  `withLayoutContext`, `freezeOnBlur`, `useLibSQL`, `Linking.parse`, `jest-pnp-resolver`;
  `initialRouteName` only in the explanatory comment; `expo.install.exclude` = `["typescript"]`.

Cheap gates:

- [x] `yarn typecheck` green (about 3 s, TypeScript 7 / tsgo, after the fixes above);
  `yarn lint` green (0.5 s); `npx jest --runInBand` 45 suites / 458 tests green (about 11 s;
  before the Jest fixes 5 suites failed: 2x missing `react-test-renderer`, 3x Reanimated 4.7
  `setCSSEventHandler` under `JSReanimated`); `yarn check:tamagui` green; `oxfmt --check` green
  on `package.json` and the six touched source files. Whole-repo `yarn format:check` fails on
  30 pre-existing files (unrelated, not fixed; `CelebrationOverlayLayer.tsx` is one of them, so
  its only diff is the two-line ref change).
- [x] `jest-pnp-resolver` removed (`yarn remove`); its resolver slot now holds
  `react-native-reanimated/jest/resolver`.

Native validation (serialized, one device per agent; the testing sub-agent reads
`.agents/skills/soli-testing/SKILL.md` first):

- [x] Delete generated native output: `rm -rf ios android` plus
  `node_modules/{react-native-worklets,react-native-reanimated,expo-modules-core}/android/{.cxx,build}`
  (all git-ignored; verify with `git check-ignore`). Done 2026-10-17 11:12 UTC by the
  testing agent: `git check-ignore -v` confirmed `/ios`, `/android` and `node_modules`
  rules; `ios/` (600 MB) and `android/` (2.5 GB) removed; the three `node_modules/.../android/
  {.cxx,build}` dirs did not exist (fresh `yarn install` already dropped them).
- [x] iOS: `yarn ios` (clean prebuild runs because `ios/` is gone; expect `SceneDelegate.swift`
  and `UIApplicationSceneManifest` in the generated project, Pods for `RNWorklets 0.13.0`,
  `RNReanimated 4.7.1`, `RNGestureHandler 3.3.0`, `react-native-skia 2.14.0`).
  Done 2026-10-17: first attempt failed on the CocoaPods locale crash (Identified issues);
  retry `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 yarn ios` 11:14:02 -> 11:28:49 UTC
  (about 14 min 47 s wall clock incl. pod install; another repo's esbuild was loading the
  machine). `Build Succeeded`, 0 errors, 2 warnings (Metro "Bundler cache is empty",
  expo-modules-core `CoreModule` internal-class note). Expo CLI's final launch step timed
  out ("Simulator app did not open fast enough" — the sim was booted headless); the app
  was installed anyway: installed `Soli` md5 == DerivedData binary, `1.1.0 (15)`,
  `UISceneDelegateClassName = Soli.SceneDelegate`, 11.1 MB embedded `main.jsbundle`;
  launched with `xcrun simctl launch`. `Podfile.lock`: ExpoRouter 58.0.21, ExpoUI 58.0.19,
  hermes-engine 260318099.0.4, React-Core 0.88.0, react-native-skia 2.14.0,
  RNGestureHandler 3.3.0, RNReanimated 4.7.1, RNScreens 4.30.0, RNWorklets 0.13.0,
  SoliSolver 0.1.0.
- [x] iOS smoke on the simulator: launch, board, stock draw, tap/drag moves, undo,
  `yarn scrubtest --ios`, Settings (screenshot the FieldGroup form for the Host top-align check),
  History + preview sheet, drawer/header, `yarn celebration --ios`, hint button, cold-start
  `yarn deeplink --ios --cold 'soli:///?demo=nearwin'`, bounded log scan for RedBox/fatal/
  Reanimated `measure` warnings. Done 2026-10-17 11:29-11:35 UTC, agent-device session
  `sdk58-ios`, all pass (details in Testing). Only gap: the scrubber PAN could not be
  activated on iOS with `agent-device gesture pan` (known limitation from the skill; the
  RNGH pan never activates) — Undo/Redo taps inside the fixture work; pan coverage comes
  from Android's native pan. Appium was not used (XCTest hand-off churn, see skill).
- [x] iOS 20-game playlist (`soli:///?demo=playlist&games=20`) with crash-token scan and RAM
  samples (launch-settled, after 20 games immediate, after 10 s idle) using the SDK 57 method;
  compare with SDK 57 baselines (fresh settled 483.9 MiB, post-20 677.4 MiB resident).
  Done 2026-10-17 11:35:29 -> 11:38:37 UTC (3 min 8 s): 20 loaded / 20 completed /
  `Playlist completed (games=20)`, 0 crash tokens in 27,790 log lines, no new Soli crash
  report, same pid (49865) before and after. Resident (`agent-device perf memory sample`,
  ps-process-snapshot): launch-settled 377.2 MiB, post-20 immediate 464.1 MiB, post-20
  after 10 s idle 449.0 MiB — all well below the SDK 57 points (483.9 / 677.4 MiB).
- [x] Android: `scripts/android-unlock-pattern.sh` / `android-ready.sh`, then `yarn release`
  (first run downloads Gradle 9.4.1, compileSdk 37, build-tools 37.0.0; R8 on). Confirm the
  signing patch in `run-android-release.sh` still matched the regenerated `build.gradle`.
  DONE 18:07 UTC (58.0.12) and again 20:33 UTC on the regenerated `android/` (58.0.14 set;
  signing patch matched, install verified 1.1.0 / 16) — Testing section.
  Record build time and APK size versus SDK 57 (118.5 MB, about 5 m 51 s clean).
  Status 2026-10-17 11:45 UTC: the phone was reachable at 11:12-11:25 UTC (`192.168.1.12:5555`
  after disconnecting the duplicate `(2)` mDNS alias), then vanished from Wi-Fi at about
  11:36 UTC (no ping reply, no mDNS service, `adb connect` times out) — `android-ready.sh`
  and `yarn release` both stop at discovery. Done without the phone: `yarn prebuild:android`
  (clean, 11:43 UTC) regenerated `android/` with Gradle 9.4.1, `android.enableMinifyInReleaseBuilds=true`,
  config cache + `-Xmx4g`/Metaspace 1g from `withBuildSpeedGradleProperties`; `yarn release`'s
  `apply_release_signing_patch` matched the RN 0.88 template ("Repaired Android signing
  config", `signingConfigs.release` present). The release APK is being built with the
  script's own Gradle invocation (`ORG_GRADLE_PROJECT_reactNativeArchitectures=arm64-v8a
  NODE_ENV=production ./gradlew app:assembleRelease`) so install + smoke can run as soon as
  the phone is back. BUILD RESULT 11:44:08 -> 11:56:51 UTC: `BUILD SUCCESSFUL in 12m 42s`
  (688 tasks, 594 executed, 94 from cache; includes the one-time Gradle 9.4.1, platform 37
  and build-tools 37.0.0 downloads plus the new R8 pass; SDK 57 clean was about 5 m 51 s
  without R8). `app-release.apk` = 59,347,747 bytes (56.6 MiB; SDK 57 single-ABI local APK
  was about 50 MB per `scripts/lib/build-tools.js`, the plan's 118.5 MB figure is the
  4-ABI store-style APK) — R8 did not shrink it below SDK 57 because the native libs grew
  (`librnskia.so` 14.3 MB, `libhermesvm.so` 2.7 MB, `libreanimated.so` 1.7 MB,
  `libworklets.so` 1.3 MB, `libsoli_solver_ffi.so` 0.5 MB). Upload-key signed (V2,
  CN=Karim Attia), `versionCode 16` / `1.1.0`, compileSdk 37, targetSdk 36, one dex,
  arm64-v8a only. R8: no "Missing class" warnings; config cache stored with 6 external-
  process problems (`node` calls in RN/Skia/Expo Gradle scripts, `problems=warn`, harmless).
  Log: scratchpad `android-gradle.log`. INSTALLED 2026-10-17 18:07 UTC (second testing
  agent): phone back on Wi-Fi as `192.168.1.12`, duplicate `(2)` mDNS alias disconnected
  again and the plain `192.168.1.12:5555` serial used; `scripts/android-ready.sh && yarn
  release` took 34 s total (Gradle up-to-date, APK unchanged from 11:56 UTC, install 3 s,
  "Install verified: versionCode 16, updated 2026-10-17 20:07:16" local time). Build log:
  `.test-artifacts/builds/20261017-200653.log`.
- [x] Android fresh-install confirmation (`dumpsys package` `lastUpdateTime`, version
  `1.1.0` / code `16`) and smoke: board, deal again, stock draw, undo, tap move, scrubber
  (`yarn scrubtest`), drawer/header, Settings draw count change and restore, History + sheet +
  system back, hint button (Rust solver under R8), `yarn celebration`, safe areas/status/nav
  bars, bounded logcat scan (fatal, ANR, JS exception, native crash, ProGuard/R8
  `ClassNotFound`/`UnsatisfiedLinkError`). Done 2026-10-17 18:07-18:15 UTC, all pass
  (details in Testing); only findings are the three upstream `ExpoModulesV2` enum/R8
  warnings (Identified issues) and Skia `EGLConsumer` teardown noise.
- [x] Android 20-game playlist with crash-token scan and RAM samples (fresh restart, post-20
  immediate, post-20 after compacting GC) using the SDK 57 method; compare against SDK 57
  (restart mean 292.1 MiB PSS; post-20 468-530 MiB PSS). Done 18:15-18:20 UTC: 20/20 in
  3 min 20 s, 0 crash tokens, pid stable; PSS 155.0 MiB restart / 330.6 MiB post-20 /
  273.9 MiB post-GC (SDK 57: 292.1 / 530.5 / 468.3) — table in Testing.
- [x] Stack.Toolbar research check (15 min cap), outcome recorded under Follow-ups. Done
  2026-10-17 (about 10 min, installed `expo-router@58.0.21` source): still Stack-only, not
  adopted.

Age-gate patch bump (follow-up from the first pass; Prompt 3, 2026-10-17 18:25-18:40 UTC):

- [x] Check the gate: `date -u` 18:25 UTC; `expo@58.0.14` (published 2026-10-16 19:51 UTC),
  `expo-modules-core@58.0.22` (19:52) and `expo-router@58.0.23` (19:53) are still inside the
  24 h window; `expo@58.0.13` (15:43), `expo-router@58.0.22` (16:06), `@expo/ui@58.0.20`,
  `expo-crypto@58.0.7`, `expo-splash-screen@58.0.10`, `babel-preset-expo@58.0.17`,
  `expo-modules-core@58.0.21` (all 15:41-15:43) are eligible. Gate not lowered.
- [x] Install the newest eligible set: `npx expo install expo@~58.0.13` (explicit version is
  honored), then `npx expo install expo-router@~58.0.22 @expo/ui@~58.0.20 expo-crypto@~58.0.7
  expo-splash-screen@~58.0.10` (explicit versions again — a bare `npx expo install expo-router`
  asks the versions API and fails on the quarantined `~58.0.23`), then `yarn dedupe
  babel-preset-expo expo-modules-core` (collapsed the second `babel-preset-expo` copy).
  `--fix` was not usable for the same reason as before.
- [x] `npx expo install --check` / `npx expo-doctor@latest`: only `expo ~58.0.14` and
  `expo-router ~58.0.23` (gated) plus the pre-existing `agent-device` script warning remain.
- [x] Patch changelog review (npm tarball `CHANGELOG.md` for the bundled packages, `main`-branch
  changelog for `expo`/`expo-router` because the `sdk-58` branch file lags the published
  patches) and R8 `Enumerable` check against the 58.0.7 / 58.0.13 Kotlin sources — findings in
  Intermediary learnings and Identified issues.
- [x] Cheap gates after the bump: `yarn typecheck`, `yarn lint`, `yarn jest --runInBand`
  (45 suites / 458 tests), `yarn check:tamagui`, `oxfmt --check package.json` all green.
- [x] Second mini-bump to `expo@~58.0.14` + `expo-router@~58.0.22`->`~58.0.23` once eligible
  (after ~19:55 UTC). Done 2026-10-17 19:55 UTC: `npx expo install expo@~58.0.14
  expo-router@~58.0.23 expo-modules-core@~58.0.22` resolved on the first try (gate not
  lowered; every transitive publish from 19:48-19:53 UTC had aged past 24 h). Naming
  `expo-modules-core` explicitly ADDED it as a direct dependency, which expo-doctor flags
  ("should not be installed directly"); fixed with `yarn remove expo-modules-core` — the
  resolved version stays `58.0.22` via `expo@58.0.14`'s `~58.0.22` range (lesson in
  Intermediary learnings). Resolved: `expo 58.0.14`, `expo-router 58.0.23`,
  `expo-modules-core 58.0.22`, `expo-modules-jsi 58.0.15`, `@expo/cli 58.1.11`,
  `@expo/schema-utils 58.0.2`; one copy each in `yarn.lock`. `npx expo install --check`:
  "Dependencies are up to date"; `npx expo-doctor@latest` 19/20 (only the pre-existing
  `agent-device` script warning). Gates: typecheck, lint, Jest 45/458, `check:tamagui`,
  `oxfmt --check package.json` all green. Native-relevant content: `expo-modules-core
  58.0.22` (Android Hermes V1 per-class memory fix, worklets 0.13 build-warning fixes) — the
  combined native test must rebuild Android; `expo-router 58.0.23` is JS-only.
- [x] Combined native test (later agent): clean/incremental rebuild on both platforms is due
  because `expo-crypto 58.0.7` (prebuilt Android lib rebuilt against v2 runtime 0.2.5) and
  `expo-splash-screen 58.0.10` (Android activity leak fix) change native Android code.
  DONE 2026-10-17 20:09-20:50 UTC: clean iOS (10 m 41 s) + regenerated Android, all smoke
  items, A1/A3/A4/C4 device checks, 10-game iOS / 20-game Android playlists with RAM — see
  Testing "Re-test on `expo 58.0.14`". Only open point: the orchestrator's plausibility check.

SDK 58 adoption (prompt 3) — details per item in "SDK 58 adoption candidates" below; all four
are JS/config-only (no native rebuild needed on their own; fold the device checks into the
combined native test above):

- [x] A1. Drop the Android Picker `key={value}` remount workaround in
  `components/settings/PickerPreference.tsx` (upstream fixed; rewrite the comment to record
  why it was there and why it is gone). Done 2026-10-17 18:35 UTC: `key={value}` removed, the
  comment now cites `@expo/ui 58`'s `Picker.android.tsx` `useEffect([selectedLabel,
  isVisible])` and says to re-add the key if a stale label returns. DEVICE CHECK PENDING:
  Android Settings, change Scoring and Warnings twice each, labels follow; iOS unaffected.
- [x] A2. Jest: remove the six `expo/winter` `moduleNameMapper` entries and Soli's
  `transformIgnorePatterns` override from `package.json`, drop the five winter `jest.mock`
  lines from `test/setup/mock-expo-winter.ts` (rename to `mock-expo-crypto.ts`, update
  `setupFiles`), delete `test/mocks/expo-winter.ts`. Done 2026-10-17 18:37 UTC: four mapper
  lines + the `transformIgnorePatterns` array gone from `package.json`; new
  `test/setup/mock-expo-crypto.ts` holds only the `expo-crypto` mock plus a why-comment;
  `mock-expo-winter.ts` and `test/mocks/expo-winter.ts` deleted (no other references — the
  two `docs/product/*` mentions are historical plan text). `yarn jest --runInBand`:
  45 suites / 458 tests green (10.6 s).
- [x] A3. Remove `headerStatusBarHeight: insets.top` and the now-unused `useSafeAreaInsets`
  import from `app/(tabs)/_layout.tsx` (identical to Expo Router 58's header default). Done
  18:36 UTC (import, `const insets` and the option removed; a 4-line comment records why).
  DEVICE CHECK PENDING: header height under the status bar unchanged on both platforms
  (compare with the sdk58 scratch screenshots `android-board.png` / `ios-board.png`).
- [x] A4. Remove the deprecated `assetBundlePatterns` key from `app.json`; refresh the three
  "Expo UI 57" comments that are still true on 58 (`settings.tsx` bottom inset,
  `DrawCountPreference.tsx` nested gestures, `PickerPreference.tsx` no Picker modifiers) to say
  "re-checked on @expo/ui 58.0.20". Done 18:36 UTC; `npx expo config --type public` no longer
  prints the key.
- [x] Gates after A1-A4 (18:39 UTC): `yarn typecheck`, `yarn lint`, `yarn jest --runInBand`
  (45 / 458), `yarn check:tamagui`, `npx expo config --type public` (A4 sanity) all green;
  `oxfmt --check` green on the touched files except `app/(tabs)/settings.tsx`, whose only
  format issue is line 107 (`vegasSelected ? ... : ...`) inside Karim's uncommitted scoring
  work — HEAD formats clean, so not caused here and left alone (Identified issues).
- [x] Device checks for A1 / A3 (fold into the combined native test; see Testing "What the
  native tester must verify for A1-A4"). DONE 2026-10-17 20:35-20:40 UTC: A1 eight picks
  across the three Android dropdowns, label immediate every time + persisted; A3 header
  inset identical on all screens on both platforms; A4 assets (card font, splash, icons,
  celebration badge font) all load.

Wrap-up:

- [x] Update this plan after each step (Summary, Files actually modified, Intermediary
  learnings, Identified issues, Testing, Follow-ups). Done through the cheap gates
  (2026-10-17); the native-validation agent continues.
- [ ] Orchestrator plausibility check on test reports; no staging or commits.

## Plan: Files to modify

Expected:

- `docs/product/expo-rn-sdk-58-upgrade/upgrade-to-expo-sdk-58-and-react-native-0-88.md`
- `docs/external-package-guides/expo.md`, `react-native.md`, `react-native-reanimated.md`,
  `expo-router.md`, `expo-ui.md`, `react-native-skia.md`, `react-native-jest-preset.md`,
  `tamagui.md`, `react-native-teleport.md`, new `react-native-gesture-handler.md`
- `.agents/skills/upgrading-expo/SKILL.md`, `agents/openai.yaml`, new
  `references/react-navigation-to-expo-router.md`
- `package.json`, `yarn.lock`
- `app/_layout.tsx` (`unstable_settings.anchor`)

Possible only if checks require it:

- `test/setup/mock-worklets.ts`, `test/mocks/*`, Jest config block in `package.json`
- `plugins/withBuildSpeedGradleProperties.js` (configuration cache vs AGP 9)
- `app.json` (only if `expo-build-properties` must return for R8 opt-out)
- `tsconfig.json` (only if TS 7 vs RN 0.88 types fails)
- `run-android-release.sh` / `build-android.sh` (only if the template `signingConfigs` text changed)

Do not add tracked `android/` or `ios/` files. Do not touch the unrelated uncommitted changes.

## Files actually modified

- `docs/product/expo-rn-sdk-58-upgrade/upgrade-to-expo-sdk-58-and-react-native-0-88.md` (this plan)
- `.agents/skills/upgrading-expo/SKILL.md`, `agents/openai.yaml`, new
  `references/react-navigation-to-expo-router.md` (upstream sync, 2026-10-17)
- `docs/external-package-guides/expo.md`, `react-native.md`, `react-native-reanimated.md`,
  `expo-router.md`, `expo-ui.md`, `react-native-skia.md`, `react-native-jest-preset.md`,
  `tamagui.md`, `react-native-teleport.md` (dated SDK 58 sections), new
  `react-native-gesture-handler.md`
- `package.json` (SDK 58 versions, `expo.install.exclude`, Jest resolver/setupFiles,
  `jest-pnp-resolver` removed, `react-test-renderer` + types added; patch bump 18:30 UTC:
  `expo ~58.0.13`, `expo-router ~58.0.22`, `@expo/ui ~58.0.20`, `expo-crypto ~58.0.7`,
  `expo-splash-screen ~58.0.10`; final bump 19:55 UTC: `expo ~58.0.14`, `expo-router
  ~58.0.23`; `expo-modules-core` is NOT a direct dependency), `yarn.lock`
- `app/_layout.tsx` (`unstable_settings.anchor`)
- `src/theme/index.ts`, `app/(tabs)/history.tsx` (one line; this file also carries unrelated
  uncommitted hints-feature changes), `src/features/klondike/components/UndoScrubber.tsx`,
  `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx`,
  `src/dev/FeatureGraphicScreen.tsx` (RN 0.88 strict-type fixes)
- `test/setup/mock-worklets.ts` deleted (superseded by the official Reanimated Jest resolver)
- SDK 58 adoption A1-A4 (2026-10-17 18:35-18:39 UTC):
  `components/settings/PickerPreference.tsx` (A1 `key={value}` removed + comment; A4 comment
  refresh; the file is untracked, part of Karim's hints/scoring work — only those lines
  changed), `package.json` Jest block (A2: four `expo/winter*` mappers and
  `transformIgnorePatterns` removed, `setupFiles` -> `mock-expo-crypto.ts`), new
  `test/setup/mock-expo-crypto.ts`, deleted `test/setup/mock-expo-winter.ts` and
  `test/mocks/expo-winter.ts`, `app/(tabs)/_layout.tsx` (A3: `useSafeAreaInsets` import,
  `insets` const and `headerStatusBarHeight` removed; 4-line comment added; unrelated
  uncommitted changes in the file untouched), `app.json` (A4: `assetBundlePatterns` line
  removed; deep-link changes untouched), `app/(tabs)/settings.tsx` and
  `components/settings/DrawCountPreference.tsx` (A4 comment refresh only)
- `.agents/skills/soli-testing/SKILL.md` (troubleshooting rows: CocoaPods UTF-8 locale crash
  on clean `yarn ios`; duplicate `(2)` mDNS alias after re-enabling wireless debugging;
  `agent-device open` needs `--platform android` for the phone; testing sub-agents 2026-10-17)
- Generated, git-ignored, not tracked: `ios/` and `android/` regenerated by clean prebuild;
  `android/app/build/outputs/apk/release/app-release.apk` built
- Prompt 4 / C4 (2026-10-17 19:30 UTC): `app/_layout.tsx` (Inter `useFonts`, splash
  prevent/hide pair, `return null` gate and the `expo-font`/`useEffect` imports removed;
  decision comment added), `docs/external-package-guides/expo-font.md` (SDK 58 refresh section),
  `docs/external-package-guides/tamagui-font-inter.md` (status: unused)
- Prompt 4 / D5 (2026-10-17 20:05 UTC): `metro.config.js` (wasm asset ext + COOP/COEP
  middleware with comment; oxfmt also re-wrapped the pre-existing `TAMAGUI_IGNORE_BUNDLE_ERRORS`
  line — the root file is outside the `format:check` glob, so it had never been formatted),
  `app.json` (`web.output` `static` -> `single`; Karim's uncommitted deep-link lines in the same
  file untouched), `app/+html.tsx` deleted, `docs/external-package-guides/expo-sqlite.md`
  (web-setup section)

## Intermediary learnings

Planning-phase findings (2026-10-17):

- Expo SDK 58 stable shipped 2026-10-15 (`58.0.0` on npm 2026-09-29 as beta; `58.0.14` latest,
  published 2026-10-16 19:51 UTC). The `.14` is a count of beta/RC/stable patches, not a sign of
  long maturity: stable is two days old.
- Versions API: SDK 58 = `expo ~58.0.14`, RN `0.88.0`, React `19.3.0`, related packages
  `jest ~30.5.2`, `@types/jest 30.0.0`, `typescript ~6.0.3`, `@types/react ~19.3.0`,
  `react-native-web ^0.21.4`, `babel-preset-expo ~58.0.0`.
- RN 0.87 (2026-08-11) made the Strict TypeScript API default, removed `InteractionManager`,
  the `Touchable` root export, `Modal animated`, `StatusBar` `backgroundColor`/`translucent`/
  `networkActivityIndicatorVisible`, `NativeMethods` types, boolean `keyboardShouldPersistTaps`,
  `useColorScheme` `'unspecified'`; minimums Node 22.13, Kotlin 2.0+, compileSdk/buildTools 37,
  first AGP 9 support; Metro 0.87. RN 0.88 (stable 2026-10-15) has no user-facing breaking
  changes: W3C EventTarget dispatch by default, variable fonts, SceneDelegate, ArrayBuffer for
  Java TurboModules, Hermes `260318099.0.4`.
- Soli's installed `expo@57.0.4` / RN `0.86.0` predate the Hermes V1 memory-regression fix
  (`expo@57.0.9` / RN 0.86.2). This likely inflated the SDK 57 RAM baselines.
- Worklets `0.13.0` is bundled by SDK 58 and its peers are RN `0.86 - 0.88`; Reanimated `4.7.1`
  requires Worklets `0.13.x`. Keeping the `0.10.1` exclusion would break the pairing, so the
  exclusion must be removed before `expo install --fix`.
- Gesture Handler 3.3.0 typings mark `Gesture.*` builders and `Gesture.Exclusive/Race/Simultaneous`
  as `@deprecated` but keep them; no runtime removal. Soli's only GH consumer is the undo scrubber.
- `expo-router@58.0.23` still exports everything Soli imports from `expo-router/react-navigation`
  (`ThemeProvider`, `DarkTheme`, `DefaultTheme`, `HeaderButton`, `DrawerActions`, `useNavigation`,
  `useFocusEffect`) and from `expo-router/drawer`. The SDK 57->58 router guide removes
  `NavigationContainer`, React Navigation `Link`, `navigateDeprecated`, `resetRoot`,
  `beforeRemove`, `freezeOnBlur`, `Screen redirect/initialParams`, `withLayoutContext`'s third
  argument, and replaces `initialRouteName` with `unstable_settings.anchor`.
- `@expo/ui@58.0.20` breaking changes: iOS `<Host>` top-aligns (was centered), `HStack`/`VStack`
  unset `spacing` is now the system default, Android `RNHostView` lost `style`. Soli is affected
  only visually (Settings host).
- `expo-sqlite@58` removed libSQL and fixed a `SQLiteStorage` first-run migration race.
  `expo-linking@58` fixed development deep-link authority; `Linking.parse()` no longer
  double-decodes (Soli parses with `new URL`).
- Android: SDK 58 template enables R8 (`android.enableMinifyInReleaseBuilds=true`), uses Gradle
  9.4.1, AGP 9 with `builtInKotlin=false`/`newDsl=false` opt-outs, compileSdk 37. Local machine has
  JDK 17 (AGP 9 minimum), platform 36 and build-tools 35/36 only, licenses accepted,
  `cmdline-tools/latest` present.
- Tamagui: v3.0.0 released 2026-10-10 (3.0.18 on 2026-10-16); issue #4324 showed the v3 metro
  plugin gated Metro to 0.84 and failed on SDK 58 until 3.0.14. `@tamagui/metro-plugin@2.4.2`
  has no such gate. The last v2 release is 2.7.7 (2026-08-15). v3 is a real migration (flat
  style props, config v6, babel plugin removed, metro plugin at `@tamagui/cli/metro`).
- Skia: Expo bundles `@shopify/react-native-skia@2.14.0`; the repo moved to
  `wcandillon/react-native-skia`, v3 ships as unscoped `react-native-skia` (3.6.2), `@shopify/*`
  2.x continues on the `release-2.x` tag (2.15.1).
- Jest 30: `jest-expo@58` peers `jest ^29 || ^30` but its internals are Jest 30. Soli uses no
  alias matchers and has 0 snapshots.
- Upstream Expo skill renamed `upgrading-expo` -> `expo-upgrade`; adds Hermes V1 guidance ("do not
  toggle Hermes V1", "do not recommend Worklets bundle mode"), implicit-package caution
  (keep `expo-constants` with expo-router), AGENTS.md docs-link bump reminder, SDK 56
  react-navigation reference, feedback command.
- RN 0.88 still ships `Libraries/Renderer/shims/ReactFabric.js` and
  `Libraries/Utilities/codegenNativeComponent.js` (runtime deep imports used by `@tamagui/portal`
  and `react-native-svg`); `Libraries/Interaction/InteractionManager.js` is gone.

Native-validation findings (2026-10-17, testing sub-agent):

- CocoaPods 1.17 / Ruby 4 needs a UTF-8 locale; the agent shell has none, so a clean
  `yarn ios` (pods must install) fails until `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8` is set.
  Incremental builds with `ios/Pods` present do not hit this. Skill updated.
- Expo CLI's post-build launch can time out ("Simulator app did not open fast enough")
  when the simulator is booted headless (no Simulator.app window); the install is complete
  and `xcrun simctl launch` works. Simulator.app is not at
  `/Applications/Xcode.app/Contents/Developer/Applications/Simulator.app` on this Mac (Xcode
  27 layout) — not needed for agent-device/simctl.
- The scene life cycle is live: `Info.plist` carries `UIApplicationSceneManifest` with
  `Soli.SceneDelegate`; `xcrun simctl openurl` after a terminate (cold) still reaches
  `useDemoGameLauncher` (fixtures load) and `[GESTURE HANDLER] Initialize gesture handler
  for view <RCTSurfaceView>` logs on each launch.
- The auto-solve playlist on SDK 58 runs about 9 s per game on the simulator (20 games in
  3 min 8 s); the per-game log token is `[DemoPlaylist] Game N/20 loaded` (only game 1 logs
  `[Demo] Game loaded`), `[DemoPlaylist] Playlist completed (games=20)` ends it.
- `agent-device gesture pan` still cannot activate the RNGH pan on iOS (GH 3.3 did not
  change that); Appium 3.6.0 + xcuitest 12.3.4 with `scripts/ios-scrub.js` works unchanged
  after releasing the agent-device XCTest runner. No SpringBoard crash was observed during
  the hand-off this time.
- iOS resident memory on RN 0.88 / Worklets 0.13 is far below the SDK 57 points
  (377 MiB settled, 464 MiB after 20 games vs 484 / 677 MiB), consistent with the Hermes V1
  regression fix; no Reanimated `measure`/CSS warnings and no worklet errors in 44k log lines.
- The RN 0.88 Android template still has the exact `signingConfigs` / `release` blocks that
  `run-android-release.sh` patches by string match ("Repaired Android signing config").

Android on-device findings (2026-10-17 18:05-18:20 UTC, second testing agent):

- When wireless debugging is re-enabled the phone registers TWO mDNS aliases
  (`adb-4139951e-zmJeED (2)._adb-tls-connect._tcp` and the plain one), so `adb devices`
  lists it twice and `android-ready.sh` aborts with "multiple adb devices connected".
  Fix (used twice today): `adb disconnect` both aliases, `adb connect 192.168.1.12:5555`
  (the phone keeps `service.adb.tcp.port=5555`; `adb -s <alias> shell ip -4 addr show
  wlan0` gives the IP). Added to the soli-testing skill's troubleshooting table.
- `yarn ad open ch.karimattia.soli` without `--platform android` opens the iOS
  simulator even when the phone is connected (agent-device picks iOS first); always pass
  `--platform android` for phone sessions. Added to the skill.
- After `yarn release` the phone dozed within a minute (60 s screen timeout); the first
  a11y snapshot was empty (`isKeyguardShowing=true`). `android-ready.sh --keep-awake`
  fixed it — run it right after the build, before driving.
- R8 on the release APK: `libsoli_solver_ffi.so` loads and `nativeSolve` runs (hint
  solved a 1.3 M-node search in 165 ms); expo-sqlite, Skia, Reanimated, Worklets, GH
  all fine. R8's only visible trace is the `ExpoModulesV2` enum warning for three
  upstream Expo enums Soli never sends across the bridge.
- Android PSS on SDK 58 is far below SDK 57 (155 vs 292 MiB restart; 274 vs 468 MiB
  post-20 after GC). Part of the restart delta is R8 (`.dex mmap` 9.5 vs 27.6 MiB); the
  rest is consistent with the Hermes V1 fix, as on iOS.
- The playlist on the phone runs about 10 s/game (3 min 20 s for 20), similar to the
  simulator's 9 s/game; `[DemoPlaylist] Game N/20 completed (moves=M)` is logged per game.
- Skia's offscreen celebration surface logs `E karimattia.soli: [SurfaceTexture-…]
  updateAndRelease: EGLConsumer is not attached to an OpenGL ES context` 3-4 times per
  overlay (framework SurfaceTexture message during teardown). No functional effect in
  21 overlays; whether SDK 57 logged it too was not recorded — treat as noise unless a
  celebration visual regression shows up.

Age-gate patch bump findings (2026-10-17 18:25-18:40 UTC, implementation sub-agent):

- Yarn's `npmMinimalAgeGate: 1d` is a strict 24 h: at 18:25 UTC the 19:51-19:53 UTC
  publishes of `expo@58.0.14` / `expo-modules-core@58.0.22` / `expo-router@58.0.23` were
  still "quarantined" (`YN0016`). `expo install` honors an explicitly given version
  ("Using ~58.0.13 instead of ~58.0.14 ... because this version was explicitly provided"),
  but a bare package name resolves against the versions API, not the installed `expo`'s
  `bundledNativeModules.json`, so each gated package must be named with its version.
- `expo 58.0.13` and `58.0.14` are dependency-only bumps (`.13`: modules-core 58.0.21 +
  babel-preset-expo 58.0.17; `.14`: modules-core 58.0.22 + `@expo/cli 58.1.11`).
  `bundledNativeModules.json` 58.0.13 -> 58.0.14 only moves `expo-router`, `expo-modules-core`,
  `expo-brownfield`, `expo-build-properties`, `expo-dev-client` (last three unused).
- The `sdk-58` branch `packages/*/CHANGELOG.md` on GitHub lags the published patches (expo
  stops at 58.0.11, expo-router at 58.0.20); the `main` branch file and the `CHANGELOG.md`
  inside the npm tarballs (`@expo/ui`, `expo-crypto`, `expo-splash-screen`, `expo-sqlite`,
  `expo-modules-core`; `expo` and `expo-router` do not ship one) are current.
- Patch content 58.0.12-set -> installed set: `expo-router 58.0.22` fixes the iOS
  `Link.AppleZoom` + `router.back()` transition (unused); `58.0.23` (gated) fixes a deep link
  into a screen of an existing navigator stacking a second navigator copy over a presented
  modal/sheet, and nested-stack deep links returning to the existing screen "as before SDK 58"
  — Soli's demo deep links target the Drawer `index` route with no modal open, and the SDK 58
  cold/warm deep-link smokes passed on both platforms, so it is a nice-to-have, not a blocker.
  `@expo/ui 58.0.20` adds an iOS `Host` `alignment` prop (keeps a `matchContents` host's
  trailing edge still while content animates; candidate for `HeaderMenuButton`'s host, not
  needed). `expo-crypto 58.0.7` rebuilds the prebuilt Android library against Expo Modules v2
  runtime 0.2.5 to fix async functions rejecting with `NoSuchMethodError` on modules-core
  >= 58.0.18 (Soli only uses the sync `Crypto.getRandomValues` in `dealIdentity.ts`, which
  is why deal ids worked on the 58.0.6 build). `expo-splash-screen 58.0.10` fixes the Android
  main activity being kept in memory after destroy (may lower restart/relaunch PSS slightly).
  `expo-modules-core 58.0.21` is web-only (`sideEffects`); `58.0.22` (gated) fixes Android
  native memory growing per module class under Hermes V1 (about 93 KiB per class on RN 0.88,
  0.57 MiB on 0.86/0.87) and two worklets-0.13 build warnings.
- R8 `ExpoModulesV2 ... does not implement io.github.expo.modules.v2.Enumerable`: not fixed
  by this bump. `expo-crypto@58.0.7`'s `DigestAlgorithm.kt` / `DigestOptions.kt` are
  byte-identical to 58.0.6 (plain `enum class`), `expo-sqlite` stays 58.0.13, and the Expo
  Modules v2 runtime/gradle/compiler plugin that emits the warning is `0.2.5` in
  expo-modules-core 58.0.20, 58.0.21 and 58.0.22 alike. Expect the same three warnings in the
  next Android release build; still harmless for Soli (no digest, no sqlite change listener).

SDK 58 adoption findings (2026-10-17 18:35-18:45 UTC, implementation sub-agent):

- A2 evidence re-verified against the installed tree: `jest-expo@58.0.11/jest-preset.js:144`
  sets `transformIgnorePatterns` to
  `/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community|expo|@expo|...))`
  — `react-native` as a prefix already covers `react-native-reanimated` / `-worklets`, and
  `expo` covers `expo-modules-core`, so Soli's override was a strict subset of the default.
  `src/preset/setup.js:360-366` `require`s `expo/src/winter` itself, which is why mapping it
  to an empty object was never needed once PnP was gone. Suite identical: 45 / 458.
- A1 evidence: installed `@expo/ui@58.0.20` `src/universal/Picker/Picker.android.tsx:29-34`
  recomputes `selectedLabel` per render and pushes it with
  `useEffect(() => { if (!isVisible) return; textFieldRef.current?.setText(selectedLabel) },
  [selectedLabel, isVisible])`. The remount had been the only thing re-seeding the label on
  SDK 57; now it would only cost a Compose re-layout per selection.
- Final bump lesson (19:55 UTC): with the gate open, the explicit-version `expo install` works
  first try, but naming a TRANSITIVE package (`expo-modules-core@~58.0.22`) makes `expo
  install` write it into `dependencies`, and expo-doctor then fails "should not be installed
  directly". Next time install only `expo@~58.0.x` plus the packages Soli already lists
  (`expo-router`, ...) and let `expo`'s own range pull `expo-modules-core`; `yarn remove
  expo-modules-core` undid it here without changing the resolved version. `--fix` was not
  needed at all once the gate was open — the explicit list is shorter and deterministic.
- Registry check at 18:40 UTC (`npm view <pkg> time`): the ONLY Soli packages with a newer
  58.x than installed are `expo 58.0.14` (2026-10-16 19:51:22 UTC), `expo-modules-core
  58.0.22` (19:52:29) and `expo-router 58.0.23` (19:53:36); `@expo/ui`, `expo-crypto`,
  `expo-splash-screen`, `expo-sqlite`, `expo-constants`, `expo-linking`, `expo-font`,
  `babel-preset-expo`, `jest-expo`, `@expo/metro-runtime`, `expo-status-bar`,
  `expo-system-ui`, `expo-linear-gradient` are all on their latest publish. `latest` tag
  still `expo@58.0.14`. So the mini-bump is exactly those three, eligible from 19:53:36 UTC.
- C4 (2026-10-17): "which fonts does the app use" must be answered from the Tamagui config
  actually in effect, not from the root layout. `@tamagui/config/v5` ships `createSystemFont()`
  fonts; the Inter-based `createInterFont` config is the v4 default. The `useFonts` block in
  `_layout.tsx` was a config-v4 leftover that nobody re-checked during the v5 migration
  (`docs/product/tamagui-config-v5/config-v5-migration.md` lists font tokens as "differ" but
  never asked whether Inter was still referenced). Cheap way to check a font file's real
  names without fontTools: parse the OpenType `name` table (IDs 1/2/4/6/16/17) with a few lines
  of Node — `Inter-Medium.otf` = family "Inter Medium", PostScript `Inter-Medium`,
  typographic family "Inter", `usWeightClass` 500.
- Splash ownership on Expo Router 58: `renderRootComponent` calls
  `_internal_preventAutoHideAsync` in a `setTimeout` so a user-level `preventAutoHideAsync`
  in global scope still wins; `ExpoRoot` calls `maybeHideSplashScreen` (one rAF after the route
  tree renders), which the native `internalMaybeHideAsync` honors only when the app never
  called the public `preventAutoHideAsync`. An app that calls neither gets "splash until first
  route frame" for free; an app that calls `preventAutoHideAsync` must call `hideAsync` itself.
- D5 (2026-10-17): with `web.output: "static"`, `expo start --web` bundles TWO graphs per
  request — the client `index.js` and `@expo/router-server/node/render.js` for SSR — and a
  resolution error in either one replaces the page with Expo's `_expo-static-error` overlay, so
  "Web Bundled ... index.js" in the log is not proof the page works. Any module that touches
  `window`/`Worker` during render (expo-sqlite web does) rules static rendering out; `single`
  is the right output for a client-only dev tool.
- `expo-sqlite` web is a Worker + `wa-sqlite.wasm` + `SharedArrayBuffer` design: three
  prerequisites (wasm as Metro asset, COOP/COEP headers, no SSR) and the first two are exactly
  Expo's documented `metro.config.js` diff. `kv-store`'s sync API works on the main thread
  because `invokeWorkerSync` spins on `Atomics.load`/`Atomics.pause` instead of `Atomics.wait`.
- Tooling: `yarn -s` is not a Yarn Berry flag (it prints the command list and exits 1) — a
  false "typecheck/lint failed" during the gates; use `yarn <script>` and read `$?`.
  `chrome-devtools-axi` did not bind a page in this session (see Testing); headless Chrome with
  `--virtual-time-budget` is a dependable fallback for a file screenshot of a Metro web page.
- Re-test run (2026-10-17 20:09-20:50 UTC): a clean iOS regeneration on the final 58.0.14 set
  took 10 m 41 s (vs 14 m 47 s in the morning — Pods and DerivedData caches were warm). The
  Expo Router-owned splash (C4) behaves exactly like the manual pair did: the board is already
  up in the 1 s frame on both platforms. The `(2)` mDNS alias was back (`adb disconnect` of the
  alias fixed it again; the `192.168.1.12:5555` pin survived). agent-device's Android pan helper
  crashes on its own teardown (`FATAL EXCEPTION ... MultiTouchInstrumentation`) — harmless,
  but it pollutes a naive crash-token grep; attribute tokens to PIDs (skill row added). zsh
  does not word-split `$VAR` command fragments (skill row added). `wc -l < file` pads with
  spaces on macOS — `tail -n +$START` silently returns nothing; `tr -d ' '` it. Another
  session built on both platforms in the middle of this run (Identified issues): a device
  test that depends on a long-lived process (playlist RAM) must re-check the app's bundle
  container / pid before trusting its samples.

## Identified issues

- Issue (A1-A4 gates, 2026-10-17 18:39 UTC): `oxfmt --check app/(tabs)/settings.tsx` fails on
  line 107 (`vegasSelected ? scoringPreference.vegasDescription : scoringPreference.description`
  should wrap over three lines). The HEAD version of the file formats clean, so the miss comes
  from Karim's uncommitted scoring/hints work, not from the A4 comment edit two dozen lines
  above. Status: left as is (unrelated uncommitted change); one `oxfmt` run fixes it whenever
  that work is formatted.
- Issue: Yarn age gate blocks the newest SDK 58 packages until ~2026-10-17 20:00 UTC.
  Status: Worked around by installing `expo@58.0.12`'s bundled set (five packages one patch
  behind the API's expectation). 18:30 UTC: bumped to the newest eligible set
  (`expo 58.0.13`, `expo-router 58.0.22`, `@expo/ui 58.0.20`, `expo-crypto 58.0.7`,
  `expo-splash-screen 58.0.10`). RESOLVED 19:55 UTC: `expo 58.0.14` / `expo-router 58.0.23`
  / `expo-modules-core 58.0.22` installed once the gate opened; `expo install --check` clean.
- Issue: `npx expo install --fix` cannot be used while the API's `expo` version is gated: it
  always tries to install the API version first and aborts. Status: Documented; the
  workaround is `npx expo install <pkg>@~<eligible-version> ...` with every version spelled
  out (18:30 UTC). Use `--fix` only once the API's set is fully eligible.
- Issue: `jest-expo@58` no longer depends on `react-test-renderer`; three Soli tests import it.
  Status: Fixed by making `react-test-renderer 19.3.0` (peer `react ^19.3.0`) and
  `@types/react-test-renderer` explicit dev dependencies. React marks `react-test-renderer`
  deprecated; migrating those tests to `@testing-library/react-native` is a follow-up.
- Issue: Reanimated 4.7.1 throws `setCSSEventHandler is not available in JSReanimated` at
  import time under Jest (`IS_JEST` selects `JSReanimated`, and `initializers.native.ts` now
  calls `setCSSEventHandler`). Status: Fixed with the documented
  `resolver: 'react-native-reanimated/jest/resolver'`, which resolves the web/JS
  implementations of Reanimated and Worklets (the web `initializers.ts` skips the call). This
  made `test/setup/mock-worklets.ts` redundant (suite green with and without it); removed.
- Issue: expo-doctor "script `agent-device` conflicts with `node_modules/.bin`".
  Status: Pre-existing (the `agent-device` script wraps the binary with an env var on purpose);
  not changed. Rename the script only if Karim wants doctor fully green.
- Issue: `@react-native/jest-preset@0.88.0` still depends on `babel-jest ^29.7.0` /
  `jest-environment-node ^29.7.0` while Jest 30 is installed (two babel-jest copies).
  Status: Upstream choice, suite green; nothing to do.
- Issue: Tamagui 2.x has no upstream validation on RN 0.88 / Metro 0.87.
  Status: Open; verified no Metro version gate in 2.4.2; fallback 2.7.7; v3 deferred.
- Issue: Android R8 now on by default for release builds (store and `yarn release`).
  Status: Open; keep on, smoke JNI/sqlite/Skia, opt-out path documented.
- Issue: Local Android SDK lacks platform 37 / build-tools 37.
  Status: Open; expect auto-download on first Gradle run (licenses present), or
  `sdkmanager "platforms;android-37" "build-tools;37.0.0"` manually.
- Issue (native validation, 2026-10-17 11:36 UTC): Karim's phone (`192.168.1.12`, A065)
  dropped off Wi-Fi/wireless debugging mid-session and stayed unreachable through 11:58 UTC
  (ping 100% loss, `adb mdns services` empty, `adb connect` timeout) — not the `(2)` alias
  problem, which was already resolved by `adb disconnect <alias>` + `adb connect
  192.168.1.12:5555`. Status: RESOLVED 18:05 UTC — Karim re-enabled wireless debugging;
  the phone came back with both mDNS aliases again (`adb-4139951e-zmJeED (2)` and the
  plain one, ports 37845/38129), fixed the same way (disconnect both aliases, `adb connect
  192.168.1.12:5555`, which the phone still advertised via `service.adb.tcp.port`).
  `android-ready.sh` then found it asleep + keyguarded (dozed after the install) and woke/
  unlocked it with `--keep-awake` (screen-off timeout raised to 600 s for the session;
  restored at the end).
- Issue (Android smoke, 2026-10-17 18:10 UTC): with R8 on, three `ExpoModulesV2` warnings
  at startup: `b71`/`c71`/`r75` "does not implement io.github.expo.modules.v2.Enumerable.
  It crosses to JavaScript here, but R8 keeps an enum's entries and its property only when
  it does, so a release build may fail on it or send its entry names instead". `mapping.txt`
  resolves them to `expo.modules.crypto.DigestAlgorithm`, `expo.modules.crypto.
  DigestOptions$Encoding` and `expo.modules.sqlite.SQLAction`. All three are upstream Expo
  module enums (not Soli code). Soli never exercises them: `src/solitaire/dealIdentity.ts`
  only calls `Crypto.getRandomValues` (no `digestStringAsync`), and `SQLAction` is only
  used by expo-sqlite's database-change listener, which Soli does not register. History
  (expo-sqlite reads/writes) and deal ids worked in the smoke. Status: documented, no
  action. Re-checked 18:35 UTC after the patch bump: NOT fixed upstream — `expo-crypto
  58.0.7` keeps the same enum sources, `expo-sqlite` is still 58.0.13, and the v2
  gradle/compiler plugin `0.2.5` is unchanged through modules-core 58.0.22, so the next
  Android release build will print the same three warnings. Only if Soli ever adds
  digest/change-listener usage would an R8 keep rule or `enableMinifyInReleaseBuilds:
  false` be needed.
- Issue (native validation, 2026-10-17 11:12 UTC): the first clean `yarn ios` failed after
  about 30 s. Prebuild itself succeeded (`ios/Soli/SceneDelegate.swift`, `AppDelegate.swift`
  and `UIApplicationSceneManifest` in `Info.plist` were generated), but `pod install
  --repo-update` crashed inside CocoaPods 1.17.0 / Ruby 4.0.7 with
  `UnicodeNormalize.normalize: Unicode Normalization not appropriate for ASCII-8BIT
  (Encoding::CompatibilityError)` in `Pod::Config#installation_root`, right after the
  CocoaPods warning "requires your terminal to be using UTF-8 encoding". The agent shell had
  `LANG=""`, `LC_CTYPE="C"`. Expo CLI treats the pod failure as a warning and went on to
  xcodebuild, which then failed with "The sandbox is not in sync with the Podfile.lock".
  Not an SDK 58 issue (tooling/locale). Status: fixed by rerunning with
  `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 yarn ios`; troubleshooting row added to
  `.agents/skills/soli-testing/SKILL.md`. Log: `.test-artifacts/builds/20261017-131247-ios.log`.

- Issue (re-test, 2026-10-17 20:21-20:31 UTC): while this testing agent was the only agent
  supposed to build/drive devices, a FOREIGN session ran `yarn release` (Android, Gradle log
  `.test-artifacts/builds/20261017-222156.log`, "BUILD SUCCESSFUL in 7m", APK 57.4 MB installed
  on the phone at 20:29:02 UTC) and then `yarn ios` (`20261017-222932-ios.log`, incremental
  68 s) — the iOS install at 20:30:31 UTC uninstalled/reinstalled the simulator app (new bundle
  container `CF6352BB…`, "new app" dot on the home screen) and killed the running 10-game
  playlist process (which had already logged `Playlist completed`), so its post-run RAM samples
  were lost and re-taken in a second run. Sources were unchanged in between (`find -newer`
  on `app/ components/ src/ modules/ package.json app.json metro.config.js yarn.lock` only
  lists `modules/soli-solver/android/build` outputs) and the installed iOS binary's md5
  matches DerivedData, so the foreign builds are byte-equivalent to this agent's. Status:
  documented; nothing to fix in the repo, but the orchestrator should make sure only ONE
  agent builds/drives at a time (AGENTS.md rule). The `/tmp/soli-build.lock` only serializes
  overlapping builds; it cannot stop a build that starts while another agent is merely
  driving the device.
- Issue (Prompt 4 / D5, 2026-10-17 20:00 UTC): `yarn web` had been broken since 2026-07-06
  (commit `94c939b`, `expo-sqlite/kv-store` in `src/state/settings.tsx`): every web bundle
  failed with "Unable to resolve ./wa-sqlite/wa-sqlite.wasm" and the page showed Expo's static
  error overlay. Pre-dates SDK 58 by three months; nobody ran web in between. Status: fixed
  (`metro.config.js` wasm + COOP/COEP, `web.output: single`, `+html.tsx` removed) and verified
  in Chrome on `expo 58.0.14`; see "Web (D5) verification" under Testing.
- Issue (Prompt 4 / D5, pre-existing, open): the web feature graphic draws the cards' rank/suit
  glyphs with the browser's fallback font — `CardTextAndroid` is embedded only through the
  native expo-font plugin, and the plugin does nothing on web. The store graphic's card look on
  web therefore differs slightly from the device look. Fix is a web-only `useFonts` for the
  three `CardTextAndroid` files (Follow-ups); not done to keep the task scoped.

## Testing

Cheap gates:

```sh
npx expo install --check
npx expo-doctor@latest
yarn format:check
yarn typecheck
yarn lint
yarn jest --runInBand
yarn check:tamagui
```

Native validation, serialized (details and flags in `.agents/skills/soli-testing/SKILL.md`):

```sh
rm -rf ios android
yarn ios                              # clean prebuild + simulator build
scripts/android-unlock-pattern.sh
yarn release                          # Android release APK on the physical phone
```

Smoke checklist (both platforms): launch with no fatal logs; new game; stock draw; drag and tap
moves; undo + `yarn scrubtest`; hint button; `yarn celebration`; Settings (draw count, toggles,
screenshot of the Expo UI form); History + preview sheet + back; drawer/header; Android system
back; safe areas/status/nav bars; cold-start deep link; 20-game playlist with crash-token scan
and RAM samples (SDK 57 method and baselines).

Results (2026-10-17, implementation sub-agent, cheap gates only):

| Gate | Result |
| --- | --- |
| `npx expo install --check` | 5 age-gated patch mismatches (`expo`, `expo-router`, `@expo/ui`, `expo-crypto`, `expo-splash-screen`), otherwise aligned |
| `npx expo-doctor@latest` (1.21.5) | 18/20; failing: the same 5 mismatches, pre-existing `agent-device` script-name conflict |
| `yarn typecheck` | green (0 errors) |
| `yarn lint` | green |
| `npx jest --runInBand` | 45 suites, 458 tests, 0 snapshots, green |
| `yarn check:tamagui` | green |
| `oxfmt --check` touched files | green; whole-repo `format:check` has 30 pre-existing unrelated failures |

Results after the age-gate patch bump (2026-10-17 18:30-18:40 UTC, `expo 58.0.13` set; no
native build — the combined native test follows):

| Gate | Result |
| --- | --- |
| `npx expo install --check` | 2 gated patch mismatches left (`expo ~58.0.14`, `expo-router ~58.0.23`), otherwise aligned |
| `npx expo-doctor@latest` | 18/20; failing: the same 2 mismatches, pre-existing `agent-device` script-name conflict |
| `yarn typecheck` | green |
| `yarn lint` | green |
| `yarn jest --runInBand` | 45 suites, 458 tests, green (4.5 s) |
| `yarn check:tamagui` | green |
| `oxfmt --check package.json` | green (only file touched by this bump besides `yarn.lock`) |

Results after SDK 58 adoption A1-A4 (2026-10-17 18:39 UTC; JS/config only, no native build):

| Gate | Result |
| --- | --- |
| `yarn typecheck` | green (unused-import check passes after the A3 removal) |
| `yarn lint` | green |
| `yarn jest --runInBand` | 45 suites, 458 tests, green (10.6 s) without the winter mappers / ignore override |
| `yarn check:tamagui` | green |
| `npx expo config --type public` | prints no `assetBundlePatterns` |
| `oxfmt --check` on the 7 touched files | green except the pre-existing `settings.tsx:107` miss (Identified issues) |

Results after the final patch bump (2026-10-17 19:55-20:00 UTC, `expo 58.0.14` set; no
native build):

| Gate | Result |
| --- | --- |
| `npx expo install --check` | "Dependencies are up to date" (first fully clean run) |
| `npx expo-doctor@latest` | 19/20; only the pre-existing `agent-device` script-name conflict (the transient `expo-modules-core` direct-dependency failure was fixed before this run) |
| `yarn typecheck` | green |
| `yarn lint` | green |
| `yarn jest --runInBand` | 45 suites, 458 tests, green |
| `yarn check:tamagui` | green |
| `oxfmt --check package.json` | green |

What the native tester must verify for A1-A4 (fold into the combined native test):

| Item | Platform | Check |
| --- | --- | --- |
| A1 Picker label follows selection without the remount | Android (release APK) | Settings: Cards drawn Draw 1 -> Draw 3 -> Draw 1; Scoring Standard -> Vegas -> Standard; Warnings Off -> No more useful moves -> Unwinnable (and back). Each dropdown label must update immediately after every pick (no stale label), description text follows, and the picked value survives leaving/re-entering Settings. iOS uses `Picker.ios.tsx` — one glance that pickers still work |
| A3 Header height / status bar | Android + iOS | Play, Hello, History, Settings headers: header content sits below the status bar with the same inset as before (compare with the sdk58 scratch screenshots `android-board.png` / `ios-board.png`; no overlap with the clock, no extra gap). Also after returning from the History preview sheet and after a rotation-free background/foreground |
| A2 | none | Jest-only change |
| A4 `assetBundlePatterns` | both | App assets still load: card fonts (`CardTextAndroid`), Inter fonts, splash icon, adaptive icon, Skia celebration badge font — all bundled by Metro regardless of the removed key |

What the native tester must watch after this bump: expo-crypto 58.0.7's rebuilt Android
library (deal ids via `getRandomValues` on a fresh deal), splash screen / activity lifecycle on
Android (cold start, background-foreground, restart PSS), the three R8 `ExpoModulesV2` warnings
(expected, unchanged), and whether `expo 58.0.14` / `expo-router 58.0.23` were folded in
before the build (check `node_modules/expo/package.json`).

Native validation (2026-10-17, testing sub-agent; screenshots in the session scratchpad
`.../scratchpad/sdk58/`, iOS unified log capture `ios-log-stream.txt` there too):

iOS simulator `iPhone 17 Pro` (iOS 26.5), Release build, agent-device session `sdk58-ios`:

| Item | Result | Evidence |
| --- | --- | --- |
| Clean build | pass (second attempt; first hit the CocoaPods locale crash) | `.test-artifacts/builds/20261017-131402-ios.log`, about 14 m 47 s wall clock |
| Launch + board | pass; saved game hydrated, `[SoliDev]` logging on | `ios-board-first-launch.png` |
| Stock draw | pass (Moves 26 -> 27, waste 8♥, stock 22 -> 21) | settle diff |
| Tap move | pass (A♥ -> hearts foundation, 10♥ flipped; app is tap-to-move only, no drag) | settle diff |
| Undo | pass (A♥ back in column 3) | `ios-board.png` |
| `yarn scrubtest --ios` (cold) | fixture loaded (`scrubbedSteps 80`, `scrubIndex 40`, Moves 80, stock 10); Undo tap works; PAN via `agent-device gesture pan` did not activate (known tool limitation) | log `[Demo] Game loaded (... "scrubbed")` |
| Scrubber pan (GH 3.3 + Reanimated 4.7) via Appium 3.6.0 / xcuitest 12.3.4 | pass: `node scripts/ios-scrub.js --from 40 --max 80 --to 20` changed the board (stock 10 -> 7, waste 2♠); `--to 0` landed exactly on the initial deal (stock 24, waste empty, four empty foundations, read via Appium page source) | `ios-scrub-after.png`, `ios-scrub-to0.png`, `ios-scrub-run*.txt` |
| Drawer / header | pass (hamburger opens drawer, Play/Hello/History/Settings/Rate Soli, close) | snapshots |
| Settings (Expo UI 58 Host top-align) | pass visually: FieldGroup starts flush under the header, no gap; Cards drawn picker, Solvable deals, Scoring, Auto Up, Hint button, Warnings picker, Move counter, Game timer, Developer all render | `ios-settings.png` — Karim to eyeball once |
| History + preview sheet (Teleport 1.2.2 + Expo UI BottomSheet) | pass: 82/10/71 totals, rows, content-sized sheet with grabber, board preview, Retry/Share, scrim dismiss back to History | `ios-history-sheet.png` |
| Hint button (Rust solver, iOS) | pass: `[solver] source=hint status=solved ms=0.5 visited=1393 moves=89`, amber rings 6♠ -> 7♦ | `ios-hint.png` |
| `yarn celebration --ios` (Skia 2.14) | pass: mode 12 "Column Glide" animates, badge shown, tap dismisses | `ios-celebration.png`, `ios-celebration-2.png` |
| Cold-start deep link (SceneDelegate) | pass: `yarn deeplink --ios --cold 'soli:///?demo=nearwin'` -> new pid, fixture at 243 moves | snapshot |
| Real win | pass: K♠ -> celebration handoff (`queued`, `winning_card_selected`, `winning_card_settled`, `start`), celebration mode 35 | `ios-real-win.png` |
| Log scan (launch -> smoke) | no RedBox, fatal, SIGABRT/SIGSEGV, Reanimated `measure`/CSS or worklet warnings; only XCTest query noise and expected `[SoliDev]` lines | `ios-log-stream.txt` |
| RAM launch-settled (fresh relaunch, 12 s) | 386,240 kB = 377.2 MiB resident (SDK 57: 483.9 MiB) | `ios-mem-launch-settled.json` |
| 20-game playlist | pass: 20/20 in 3 m 8 s, 0 crash tokens, no crash report, pid stable | `ios-mem-post20-immediate.json`, `ios-mem-post20-idle10.json` |

iOS RAM versus SDK 57 (resident, same simulator and method):

| Sample | SDK 57 (`0.86.0`, Worklets 0.10.1) | SDK 58 (`0.88.0`, Worklets 0.13.0) | Delta |
| --- | --- | --- | --- |
| Fresh launch, settled | 483.9 MiB | 377.2 MiB (386,240 kB) | -106.7 MiB (-22%) |
| After 20 games, immediate | 677.4 MiB | 464.1 MiB (475,248 kB) | -213.3 MiB (-31%) |
| After 20 games, 10 s idle | n/a (fresh-process idle only) | 449.0 MiB (459,728 kB) | |

Caveat: single samples per point, the SDK 57 post-20 point came from Karim's manual run
and the SDK 58 one from the auto-solve playlist (same 20 default deals); the direction and
size of the change are consistent with the Hermes V1 regression fix shipping in RN 0.88.

Android (physical phone A065, Android 16), release build with R8:

| Item | Result | Evidence |
| --- | --- | --- |
| Duplicate `(2)` mDNS alias | resolved: `adb disconnect '<alias>'` + `adb connect 192.168.1.12:5555` (phone already had `service.adb.tcp.port 5555`) | adb devices 11:19 UTC |
| Clean prebuild + signing patch | pass (`Repaired Android signing config`, RN 0.88 template unchanged for the patch) | `android-prebuild.log`, `android-release-attempt1.log` |
| Clean release build (Gradle 9.4.1, AGP 9, R8) | pass: 12 m 42 s incl. toolchain downloads; APK 59.3 MB single-ABI, upload-key signed, 1.1.0 / 16 | `android-gradle.log` |
| R8 vs Rust solver JNI (static) | pass: `libsoli_solver_ffi.so` exports `Java_expo_modules_solisolver_SoliSolverJni_nativeSolve`; R8 mapping keeps `SoliSolverJni` unrenamed (only `SoliSolverModule -> rr5`, which is fine for Expo's generated module provider); no "Missing class" R8 warnings | `mapping.txt` |
| Fresh-install confirmation (18:07 UTC, second testing agent) | pass: `dumpsys package` `lastUpdateTime=2026-10-17 20:07:16` (local; was 2026-10-13 22:53:10), `versionName=1.1.0`, `versionCode=16`; `yarn release` incremental 34 s (Gradle up-to-date, install 3 s) | `.test-artifacts/builds/20261017-200653.log`, scratchpad `android-release-run2.log` |
| Launch + board, safe areas / status / nav bars | pass: saved Vegas game hydrated; header, HUD badges, foundations, stock/waste, 7 columns, 3-button nav bar all inside the insets, no overlap | `android-board.png` |
| Stock draw | pass (stock 23 -> 22, waste 4♠ -> 9♣, Moves 0 -> 1, Undo button appears) | settle diff |
| Undo | pass (stock back to 23, waste 4♠) | settle diff |
| Tap move | pass (waste 7♣ -> 8♦ column 3, Moves 5; tap-to-move only) | snapshot |
| `yarn scrubtest` (cold) + Undo tap in fixture | pass: new pid 22375, `[Demo] Game loaded (... "scrubbed", scrubbedSteps 80, scrubIndex 40)`, Moves 80, stock 10, waste 6♥; Undo tap -> stock 11, waste 6♠ | logcat |
| Scrubber native pan (GH 3.3 + Reanimated 4.7, agent-device `gesture pan 801 2150 -339 0 1500`) | pass: landed on stock 7 / waste 2♠ — the same state the iOS Appium scrub reached at index 20; pan `-700` -> initial deal (stock 24, no waste, 4 empty foundations); pan `+900` -> end of history (stock 13, waste 10♥, hearts 2♥, clubs A♣) | `android-scrub-after.png` |
| Deal again (header New Game -> "Start a new game?" -> DEAL AGAIN) | pass: fresh deal, Moves 0 | snapshot |
| Drawer / header | pass: hamburger opens drawer (Close drawer, Play, Hello, History, Settings, Rate Soli); navigation to Settings/History/Play works | snapshots |
| Settings (Expo UI 58 on Android) | pass: Cards drawn picker, Solvable deals, Scoring picker + caption, Keep Vegas total, Auto Up, Hint button, Warnings picker render; Draw 1 -> Draw 3 -> Draw 1 via the Material dropdown, label updates each time (no stale label) | `android-settings.png` |
| History + preview sheet (Teleport 1.2.2 + Expo UI BottomSheet) + system back | pass: 483/270/212 totals, rows incl. the games played in this smoke; row tap opens the content-sized sheet with grabber, deal header, board preview, Retry/Share; agent-device `back` (system back) dismisses the sheet back to the list | `android-history-sheet.png` |
| Hint button (Rust solver JNI under R8) | pass: `?set=scoring:off,hintButton:on` + `?reset=game` gave a Standard deal with the Hint pill; tap -> `nativeloader: Load ... libsoli_solver_ffi.so ... ok`, `[solver] source=hint status=solved ms=165.2 visited=1298446 moves=82 stock=23 depth=0`, amber rings on A♦ waste -> diamonds foundation | `android-hint.png`, logcat |
| `yarn celebration` (Skia 2.14) | pass: `[Celebration] start { cards: 52, mode: 24 }` "Suit Orbits", two frames 2 s apart differ (animating), badge shown, tap on felt dismisses back to the untouched board, pid unchanged | `android-celebration.png`, `android-celebration-2.png` |
| Bounded logcat scan (17,877 lines, launch -> celebration) | pass: no FATAL EXCEPTION, ANR, `Fatal signal`, tombstone, JS exception, RedBox, `UnsatisfiedLinkError`, `ClassNotFoundException`, `NoSuchMethodError`, Reanimated `measure`/worklet warnings in the app pids. Noise only: `FastPrintWriter EPIPE` (a11y dumps, as in SDK 57), `ViewManagerPropertyUpdater: Could not find generated setter` (RN, pre-existing), `WindowOnBackDispatcher: OnBackInvokedCallback is not enabled`, `ExpoModulesCore: Introspectable data is missing for expo.modules.ui.*` (Expo UI, reflection fallback), `SurfaceMountingManager removeViewAt ... already removed` (once, during sheet teardown), `HWUI AM IS NOT NULL`. R8-related: three `ExpoModulesV2` warnings, see Identified issues | `android-logcat-smoke.txt` |
| 20-game playlist (`yarn deeplink 'soli:///?demo=playlist&games=20'`, warm, after a cold restart) | pass: 18:16:01 -> 18:19:21 UTC (3 min 20 s, about 10 s/game), 20 loaded / 20 completed / `Playlist completed (games=20)`, 20 `[Celebration] start`, ends on a real win (mode 29 "Heartbeat") + "Start a new game?" dialog; pid 24150 before, during and after; 0 crash tokens in 5,940 lines (no FATAL EXCEPTION, Fatal signal, ANR, am_crash, tombstone, JNI/R8 class errors, RedBox, OOM, lmk); no Reanimated measure/worklet warnings (only the pre-existing `ViewManagerPropertyUpdater` setter note for `REASharedTransitionBoundaryManager`). Noise: 73x `E karimattia.soli: [SurfaceTexture-…] updateAndRelease: EGLConsumer is not attached to an OpenGL ES context` (about 3-4 per celebration overlay, 3 in the smoke run's single overlay — Skia offscreen-surface teardown, no functional effect) and 1x `ashmem: Pinning is deprecated` | `android-logcat-playlist.txt`, `android-playlist-end.png` |
| RAM fresh restart (force-stop, `am start`, 15 s, board rendered) | 154,656 / 161,086 / 160,481 kB PSS (mean 158,741 kB = **155.0 MiB**; RSS 276.6-283.3 MiB); top: Native Heap 45.1 MiB, .apk mmap 36.3, Unknown 35.9, .dex mmap 9.5, Dalvik 6.0 | `android-mem-restart.json` |
| RAM post-20 immediate (seconds after `Playlist completed`, celebration + dialog on screen) | 338,509 kB = **330.6 MiB** PSS (RSS 452.0 MiB); a `dumpsys meminfo` a few seconds later: 307,309 kB = 300.1 MiB (Native Heap 121.0, Unknown 93.1, .apk mmap 38.9) | `android-mem-post20-immediate.json` |
| RAM post-20 after compacting GC (`am send-trim-memory ch.karimattia.soli RUNNING_CRITICAL`, 10 s) | 280,449 kB = **273.9 MiB** PSS (RSS 395.0 MiB); second sample 10 s later 280,713 kB = 274.1 MiB (Native Heap 99.8, Unknown 89.1, Dalvik 5.3). The second `send-trim-memory` was refused by the OS ("Unable to set a higher trim level than current level") — harmless, the level was already applied | `android-mem-post20-gc1.json`, `android-mem-post20-gc2.txt` |

Android RAM versus SDK 57 (PSS from `dumpsys meminfo`, same phone, same 20 default deals):

| Sample | SDK 57 (`0.86.0`, Worklets 0.10.0/0.10.1) | SDK 58 (`0.88.0`, Worklets 0.13.0, R8 on) | Delta |
| --- | --- | --- | --- |
| Fresh restart, settled | 292.1 MiB mean (3 samples); 320.3 MiB (0.10.1 relaunch) | 155.0 MiB mean (3 samples) | -137 MiB (-47%) |
| After 20 games, immediate | 530.5 MiB (0.10.1, celebration active) | 330.6 MiB (celebration + dialog active) | -200 MiB (-38%) |
| After 20 games, compacting GC | 468.3 MiB (0.10.0, after 2 GCs; mean 489.7) | 273.9 MiB (after 1 trim; 274.1 after 2) | -194 MiB (-41%) |
| Growth restart -> post-GC | +176 MiB | +119 MiB | |

Caveats: single run, same method and phone; the SDK 57 restart process was about 3.5 min old versus 15-40 s here; R8 shrinks the dex (.dex mmap 9.5 MiB vs 27.6 MiB in SDK 57), which explains part of the restart delta; the rest matches the Hermes V1 regression fix seen on iOS. The post-20 process still retains about 119 MiB over its restart footprint (Native Heap + Unknown), so the workload-associated growth noted in the SDK 57 plan persists in smaller absolute terms — not a regression, not a leak proof either.

Cleanup done: Scoring restored to Vegas via `soli://?set=scoring:vegas` (draw count was already restored to 1 in-UI; Hint button was already on), screen-off timeout back to 60 s, agent-device session `sdk58-android` closed, `/tmp/android-device.lock` removed, logcat captures stopped. The phone keeps the games played here in History (Karim said that is fine).

Android RAM method used (reproducible): `adb shell am force-stop ch.karimattia.soli`, `am start
-W -a android.intent.action.VIEW -d 'soli:///' ch.karimattia.soli/.MainActivity`, 15 s, then
`yarn ad perf memory sample --json --session <s>` (wraps `dumpsys meminfo`) plus two
more `dumpsys meminfo | grep "TOTAL PSS"` 8 s apart; `yarn deeplink 'soli:///?demo=playlist&games=20'`
(warm); `until grep -q "Playlist completed" <logcat>` then sample immediately; `adb shell am
send-trim-memory ch.karimattia.soli RUNNING_CRITICAL`, 10 s, sample again.

### Re-test on `expo 58.0.14` + A1/A3/A4/C4 (2026-10-17 20:09 UTC onward, native testing sub-agent)

Scope: clean native regeneration (`ios/`, `android/` deleted — both git-ignored per
`git check-ignore`; stale `node_modules/react-native-{worklets,reanimated}/android/{.cxx,build}`
deleted, `expo-modules-core` had none), installed set verified before building:
`expo 58.0.14`, `expo-router 58.0.23`, `expo-modules-core 58.0.22`, `expo-crypto 58.0.7`,
`expo-splash-screen 58.0.10`, `@expo/ui 58.0.20`. Screenshots and logs: session scratchpad
`.../scratchpad/sdk58/retest-*`.

iOS simulator `iPhone 17 Pro` (iOS 26.5), Release, clean `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
yarn ios` (prebuild + pod install + build + install): **10 m 41 s** (20:09:43 -> 20:20:24 UTC;
previous clean build 14 m 47 s). agent-device session `sdk58r-ios`.

| Item | Result | Evidence |
| --- | --- | --- |
| C4 cold start (terminate + `simctl launch`) | pass: board on screen in the 1 s frame, no stuck splash, no white flash; unified log has no `expo-font` / "is not a system font" / `preventAutoHide` / `hideAsync` lines — only SpringBoard's storyboard fetch and `ExpoSplashScreen` module registration | `retest-ios-splash-1s.png`, `retest-ios-splash-3s.png`, `retest-ios-log-smoke.txt` |
| A3 header inset (Play) | pass: hamburger/title/buttons at the same height as `ios-board.png` (18:25 UTC baseline), status-bar clock untouched, no extra gap | `retest-ios-board.png` vs `ios-board.png` |
| A3 header inset (Hello / History / Settings / History after sheet dismiss) | pass: same inset on all four | `retest-ios-hello.png`, `retest-ios-history.png`, `retest-ios-settings.png`, `retest-ios-history-after-sheet.png` |
| C4 text + card glyphs | pass: header/HUD/Settings/History text is SF as before; card ranks/suits in `CardTextAndroid` with the same geometry as the baseline | same screenshots |
| Stock draw | pass (Moves 80 -> 81, waste 9♥, stock 24 -> 23) | snapshot |
| Tap move | pass (7♦ column 4 -> onto 8♠ column 1, Moves 82, 7♥ flipped) | snapshot |
| Undo | pass (7♦ back in column 4) | snapshot |
| Drawer | pass (Play/Hello/History/Settings/Rate Soli) | snapshots |
| Settings pickers (iOS `Picker.ios.tsx`, one glance) | pass: Cards drawn menu lists Draw 1-5; Draw 1 -> Draw 3 -> Draw 1, label follows each pick; Scoring `Off`, Warnings `Unwinnable game` render | `retest-ios-settings.png` |
| History + preview sheet | pass: 86/11/74 totals; row tap opens the content-sized sheet (grabber, deal header, board preview, Retry/Share); scrim tap dismisses back to the list | `retest-ios-history-sheet.png` |
| Hint (Rust solver) | pass: `[solver] source=hint status=solved ms=0.4 visited=1403 moves=94`, amber rings on 8♠ (column 1) + 7♦ (column 4) | `retest-ios-hint.png` |
| `yarn celebration --ios` (Skia) | pass: `[Celebration] start { cards: 52, mode: 5 }` "Starburst Spur", two frames 2 s apart differ, badge shown, felt tap dismisses, pid unchanged | `retest-ios-celebration.png` |
| Cold-start deep link | pass: `yarn deeplink --ios --cold 'soli:///?demo=nearwin'` -> new pid 90613, `[Demo] Game loaded (... "nearwin")`, Moves 243 | log |
| Log scan launch -> celebration (16,368 lines) | pass: 0 RedBox / fatal / SIGABRT / SIGSEGV / Unhandled / `Warning:` / worklet; the `Exception` hits are ATS `NSExceptionDomains` plist dumps, `measure` hits are `app_launch_measurement` assertions | `retest-ios-log-smoke.txt` |
| 10-game playlist, run 1 (20:26:01 UTC) | 10/10 completed in 1 m 44 s, 10 celebrations, 0 crash tokens — but the process was killed at 20:30:31 UTC by a FOREIGN `yarn ios` install (see Identified issues), so the post-10 RAM samples were lost | `retest-ios-log-playlist.txt` |
| 10-game playlist, run 2 (20:33:17 -> 20:34:48 UTC) | pass: 10/10 in 1 m 32 s, 10 celebrations, pid 96746 stable, 0 crash tokens in 5,910 lines, no `.ips` crash report for Soli today | `retest-ios-log-playlist-2.txt`, `retest-ios-playlist-end.png` |
| RAM launch-settled (terminate, launch, 12 s) | run 1: 291,152 kB = **284.3 MiB**; run 2 (reinstalled, same source): 318,528 kB = **311.1 MiB** | `retest-ios-mem-launch-settled*.json` |
| RAM post-10 immediate / after 10 s idle | 316,336 kB = **308.9 MiB** / 304,448 kB = **297.3 MiB** | `retest-ios-mem-post10-*.json` |

iOS RAM (resident, `ps` via agent-device) versus the 18:25 UTC SDK 58.0.12 run: launch-settled
284-311 MiB vs 377.2 MiB; after the playlist 309 MiB (10 games) vs 464.1 MiB (20 games) — not the
same workload, but the 10-game process ends BELOW the earlier launch-settled figure. Single samples;
the two launch-settled values differ by 27 MiB between runs, so treat ±30 MiB as noise.

Android (physical A065, Android 16), release APK with R8. The phone already carried the foreign
session's clean build (`20261017-222156.log`, 7 m, installed 20:29:02 UTC, see Identified
issues); this agent's own `scripts/android-ready.sh --keep-awake && yarn release` ran on top:
**18 s** wall clock (20:33:25 -> 20:33:43 UTC; Gradle up to date, APK install 3 s, "Install
verified: versionCode 16, updated 2026-10-17 22:33:41" local). agent-device session
`sdk58r-android`, logcat capture `retest-android-logcat.txt` from before the cold start.

| Item | Result | Evidence |
| --- | --- | --- |
| Fresh install | pass: `lastUpdateTime=2026-10-17 22:33:41` (local; was 22:29:02 from the foreign build, 20:07:16 before that), `versionName=1.1.0`, `versionCode=16`; signing patch re-applied during the foreign prebuild (`android/` regenerated, RN 0.88 template still matches) | `retest-android-release.log` |
| C4 cold start (force-stop, `am start -W`: TotalTime 603 ms) | pass: board on screen in the 1 s frame; 1 s and 3 s frames pixel-identical (no stuck splash, no late flash); no font/splash warnings in logcat (only system `FontLog`/Skia font-parser noise) | `retest-android-splash-1s.png`, `retest-android-board.png` |
| A3 header inset (Play, Hello, History, Settings, History after sheet dismiss, Play after background/foreground) | pass: hamburger/title at the same height as `android-board.png` on every screen, status bar clear, 3-button nav bar clear | `retest-android-board.png`, `-hello.png`, `-history.png`, `-history-after-sheet.png`, `-settings.png`, `-board-after-bg.png` |
| Stock draw / Undo / tap move | pass: stock 23 -> 22, waste 10♣ -> 3♣, Moves 1, Undo appears; Undo -> stock 23, waste 10♣; A♥ column 2 -> hearts foundation, Moves 2, Q♣ flipped | snapshots |
| Drawer | pass (Hello, History, Settings, Play) | snapshots |
| History + Teleport sheet + system back | pass: 485/270/214 totals; row tap opens the content-sized sheet (grabber, deal header, board preview, `Retry this deal`/`Share this deal`); agent-device `back` dismisses to the list | `retest-android-history-sheet.png` |
| **A1 pickers (no `key={value}` remount)** | **pass**: Cards drawn Draw 1 -> Draw 3 -> Draw 1; Scoring Vegas -> Standard -> Vegas -> Standard; Warnings No more useful moves -> Off -> No more useful moves -> Unwinnable game. After EVERY pick the Compose text-field label in the a11y tree showed the new value immediately (`@e6=Draw 3 …`, `@e8=Standard …`, `@e11=Off …`), captions followed (Scoring caption swapped, "Keep Vegas total" row hidden on Standard). Leave to Play and re-enter Settings: `Draw 1 | Standard | Unwinnable game` persisted | `retest-android-settings-before.png`, `retest-android-settings.png` |
| Background/foreground (HOME, `am start`) | pass: same pid 28348 resumed, header inset unchanged | `retest-android-board-after-bg.png` |
| Hint (Rust solver JNI under R8; Scoring was Standard after the A1 sequence, `?reset=game`) | pass: Standard deal with the Hint pill, `nativeloader: Load ... libsoli_solver_ffi.so ... ok`, `[solver] source=hint status=solved ms=11.7 visited=9028 moves=86 stock=23`, amber rings on A♠ column 7 + spades foundation | `retest-android-hint.png`, logcat |
| `yarn celebration` (Skia) | pass: `[Celebration] start { cards: 52, mode: 22 }` "Vortex", two frames 2 s apart differ, badge `Celebration 22 · Vortex` in the tree, felt tap dismisses, pid unchanged | `retest-android-celebration.png` |
| `yarn scrubtest` (cold) + Undo + native scrubber pan | pass: new pid 30159, `[Demo] Game loaded (... "scrubbed", scrubbedSteps 80, scrubIndex 40)`, Moves 80, stock 10, waste 6♥; Undo -> stock 11, waste 6♠; `gesture pan 801 2150 -339 0 1500` -> stock 7 / waste 2♠ (same landing as the 18:25 run and the iOS Appium scrub); pan `-700` -> initial deal (stock 24, no waste, empty foundations) | `retest-android-scrub-after.png` |
| 20-game playlist (`yarn deeplink 'soli:///?demo=playlist&games=20'`, warm, after a force-stop restart) | pass: 20:42:24 -> 20:45:45 UTC (3 min 21 s), 20 loaded / 20 completed / `Playlist completed (games=20)`, 20 `[Celebration] start`, ends on a real win (mode 43 "You Win") + "Start a new game?" dialog; pid 30614 before/during/after; 0 crash tokens in 4,612 lines (no FATAL EXCEPTION, Fatal signal, ANR, am_crash, tombstone, JNI/R8 class errors, RedBox, OOM; no lmk line names Soli). Noise: 458x `EGLConsumer is not attached to an OpenGL ES context` (vs 73x in the 18:25 run — same Skia offscreen-surface teardown message, ~23 per celebration this time; no functional effect, not investigated further) and 1x `ashmem: Pinning is deprecated` | `retest-android-logcat-playlist.txt`, `retest-android-playlist-end.png` |
| RAM fresh restart (force-stop, `am start` 719 ms, 15 s) | agent-device 150,208 kB + `dumpsys` 154,421 / 157,621 kB (8 s apart) = mean 154,083 kB = **150.5 MiB** PSS (RSS 270.8-279.7 MiB); a 4th sample 155,900 kB | `retest-android-mem-restart.json`, `retest-android-playlist.txt` |
| RAM post-20 immediate (celebration + dialog on screen) | 320,671 kB = **313.2 MiB** PSS (RSS 444.2 MiB); `dumpsys` a few seconds later 273,887 kB = 267.5 MiB | `retest-android-mem-post20-immediate.json` |
| RAM post-20 after compacting GC (`am send-trim-memory ... RUNNING_CRITICAL`, 10 s) | 250,415 kB = **244.5 MiB** PSS (RSS 374.0 MiB); `dumpsys` 249,879 kB = 244.0 MiB; 10 s later 248,751 kB = 242.9 MiB | `retest-android-mem-post20-gc1.json` |
| Cleanup | Scoring restored to Vegas + Warnings to "No more useful moves" via `?set=scoring:vegas,warnings:stuck` (verified in Settings: `Draw 1 | Vegas | No more useful moves`), win dialog answered with DEAL AGAIN (fresh Vegas deal on screen), screen-off timeout back to 60 s, both agent-device sessions closed, `/tmp/android-device.lock` removed, logcat + iOS log stream stopped. The playlist games stay in History | — |
| Bounded logcat scan, launch -> scrubtest (10,512 lines) | pass for Soli: 0 `Fatal signal` / ANR / `am_crash` / `ClassNotFoundException` / `UnsatisfiedLinkError` / `NoSuchMethodError` / RedBox / JS exception / OOM in the Soli pids. The 2 `FATAL EXCEPTION` are `com.callstack.agentdevice.multitouchhelper` (agent-device's pan helper, `Cannot call disconnect() while connecting UiAutomation`) and the 6 `tombstone` lines are the `system_server` trace dumps it triggered; the 75 `lowmemorykiller` lines are system pressure events naming no Soli process. The three `ExpoModulesV2 ... Enumerable` R8 warnings are STILL present (now `b71`, `c71`, `s75` — expo-sqlite's enum got a new R8 name, otherwise identical); noise as before: `WindowOnBackDispatcher`, `ViewManagerPropertyUpdater` setters, 7x `EGLConsumer` (celebration teardown), `BridgelessReact` host lifecycle | `retest-android-logcat-smoke.txt` |

Android RAM, `expo 58.0.14` re-test versus the 58.0.12 run (PSS, same phone, same method, same 20 default deals):

| Sample | SDK 57 | SDK 58.0.12 (18:25 UTC) | SDK 58.0.14 re-test (20:42 UTC) | Delta vs 58.0.12 |
| --- | --- | --- | --- | --- |
| Fresh restart, settled | 292.1 MiB | 155.0 MiB | 150.5 MiB | -4.5 MiB |
| After 20 games, immediate | 530.5 MiB | 330.6 MiB | 313.2 MiB | -17 MiB |
| After 20 games, compacting GC | 468.3 MiB | 273.9 MiB | 244.5 MiB | -29 MiB |
| Growth restart -> post-GC | +176 MiB | +119 MiB | +94 MiB | -25 MiB |

Reading: the `expo-splash-screen 58.0.10` activity-leak fix and the `expo-modules-core 58.0.22`
per-module-class memory fix did not regress anything; restart PSS is flat (within noise) and the
post-workload retained growth is 25 MiB smaller. Single run each, ±10-15 MiB is noise on this
phone; the direction is consistent across all three points.

iOS RAM (resident) versus the 58.0.12 run: launch-settled 284-311 MiB vs 377 MiB; after a
10-game playlist 309 MiB immediate / 297 MiB idle vs 464 MiB after 20 games (not the same
workload — 10 games is the agreed scope here; the process ends below the earlier launch figure).

### Device checklist for C4 (Inter fonts removed) — DONE on both platforms (tables above)

Context: the change removes font loading that was never referenced, so the expected result is
"nothing looks different". The point of this check is to prove that, on both platforms, after
a rebuild (`yarn ios` / `yarn release`; no prebuild change was made, a JS-only rebuild is
enough).

1. Cold start (force-stop, then launch): the splash shows and hides on its own once the board is
   up; no stuck splash, no white flash before the board, no "Unable to find font" / expo-font
   warning in Metro, logcat or the Xcode console.
2. Text rendering is unchanged versus the SDK 58 baseline screenshots taken earlier today
   (`.test-artifacts/` of the 18:25 UTC iOS/Android runs, or the sdk58 scratch screenshots):
   header title ("Play", drawer titles), Statistics HUD numbers/labels, Settings labels and
   values, History list titles, hint/notice bubbles, the win celebration text. All of these use
   the platform system font (SF on iOS, Roboto/device default on Android) — same as before,
   because Tamagui config v5's `createSystemFont()` was already in effect.
3. Card faces: rank and suit glyphs still render in the embedded `CardTextAndroid` family on
   both platforms (same geometry as the approved reference; compare a 7 of hearts and a K of
   spades against the baseline screenshots). This is the only custom font and it is untouched,
   so any change here would indicate a prebuild/asset problem, not C4.
4. Optional proof: in a dev build run `require('expo-font').getLoadedFonts()` from the Metro
   console (or a one-off `devLog`) — it must list only `CardTextAndroid`, never `Inter`/`InterBold`.
5. Web (dev tool only): `yarn web` -> `http://localhost:8081/feature-graphic` still renders the
   feature graphic with the system CSS font stack (Prompt 4 Part 2 verifies this on the Mac).

Pass = all five show no difference. If text weight or metrics DO differ anywhere, the
assumption "Inter was unreferenced" is wrong for that spot; find the `fontFamily`/Tamagui font
token in play before re-adding any `useFonts`.

### Web (D5) verification — DONE 2026-10-17 20:00-20:05 UTC on `expo 58.0.14`

- `npx expo start --web --port 8081` (same as `yarn web`, `CI=1`): "Web Bundled 10074ms
  index.js (4401 modules)"; `/feature-graphic` -> HTTP 200 with
  `Cross-Origin-Embedder-Policy: credentialless` / `Cross-Origin-Opener-Policy: same-origin`;
  client bundle 19.3 MB (dev, unminified).
- Chrome (headless screenshot `scratchpad/sdk58/web-feature-graphic.png`, 1400x900, plus the
  Claude Browser pane for console/text): the feature graphic renders — felt, app icon, three
  cards (K♥ A♣ K♠), "Soli / Classic solitaire, thoughtfully refined.", the three benefit badges,
  the five variant buttons, Light/safe-frame toggles and the variant descriptions. Console: only
  expo-sqlite's one-time dev warning about sync operations (expected; it proves `getItemSync`
  ran through the wasm worker) and RN's generic `useNativeDriver` web warning. No errors.
- `/` (game screen): board, stock/waste, foundations, Moves/Time HUD and "New Game" render;
  zero console errors (settings hydrated from expo-sqlite kv-store on web).
- Before the fix (same server, `output: static`): "λ Bundling failed ... Unable to resolve
  `./wa-sqlite/wa-sqlite.wasm` from `node_modules/expo-sqlite/web/worker.ts`", import stack
  `app/_layout.tsx -> components/Provider.tsx -> src/state/settings.tsx -> expo-sqlite/kv-store`.
- Known limitation (pre-existing, not fixed): on web the cards' rank/suit glyphs use the
  browser fallback font, because `CardTextAndroid` is only embedded by the native expo-font
  plugin and nothing loads it on web (see Follow-ups).
- `chrome-devtools-axi` (`/opt/homebrew/bin`) could open the page but never bound a `pageId`
  (`selectpage` had no effect; screenshot/console/eval all failed with "pageId: expected
  number, received undefined"), so the file screenshot came from headless Chrome
  (`--headless=new --virtual-time-budget=20000 --screenshot`) and the runtime checks from the
  Claude Browser pane.

## SDK 58 adoption candidates

Prompt 3 research (2026-10-17, planning sub-agent). Sources: the SDK 58 changelog
(https://expo.dev/changelog/sdk-58), the installed package sources in `node_modules`
(`@expo/ui 58.0.19/20`, `expo-router 58.0.21+`, `jest-expo 58.0.11`, `react-native-worklets
0.13.0`, `babel-preset-expo 58.0.16`, `@expo/config-types 58`), the expo-font docs
(https://docs.expo.dev/develop/user-interface/fonts/), expo/expo#50800 + #50801, the
`@expo/ui` CHANGELOG, and a sweep of `app/`, `components/`, `src/`, `plugins/`, `scripts/`,
`test/`, `package.json`, `app.json`, `babel.config.js`, `metro.config.js` for workaround /
upstream / TODO comments. Soli has no patch-package or Yarn patches, no `resolutions`, one
config plugin (`plugins/withBuildSpeedGradleProperties.js`), and only three code-level
workarounds that reference upstream behavior (A1, A2, B1 below). Honest bottom line: the
upgrade's big wins (memory -22 to -47%, R8, prebuilt `expo-modules-core`, SceneDelegate) are
already banked; what remains is a small cleanup bundle, not a feature wave.

| # | Candidate | Recommendation | Effort | LOC | Rationale |
| --- | --- | --- | --- | --- | --- |
| A1 | Drop the Android Picker `key={value}` remount workaround | **ADOPT NOW** | S | -6 | Installed `@expo/ui` pushes the label via `useEffect([selectedLabel, isVisible])`, so later selections render; the SDK 58 Android smoke already showed the unkeyed Draw-count picker updating |
| A2 | Drop the Jest `expo/winter` mocks and the `transformIgnorePatterns` override | **ADOPT NOW** | S | -17 | Reason was Yarn PnP (gone since `nodeLinker: node-modules`); `jest-expo 58` loads `expo/src/winter` itself and its default ignore pattern already covers `react-native-*`; scratch run 45/458 green |
| A3 | Drop `headerStatusBarHeight: insets.top` in the Drawer layout | **ADOPT NOW** | S | -4 | Byte-identical to the Router 58 header default (`isParentHeaderShown ? 0 : insets.top`); root Stack header is hidden. Not SDK-58-specific, found in the sweep |
| A4 | Drop deprecated `assetBundlePatterns` from `app.json` (+ refresh three "Expo UI 57" comments) | **ADOPT NOW** | S | -1 | Deprecated in `@expo/config-types` 58; only EAS Update asset selection reads it; CNG builds bundle every `require`d asset anyway |
| B1 | Settings Android bottom `SafeAreaView` edge split | NO (keep) | - | 0 | `FieldGroup.android.tsx` still hardcodes `LazyColumn contentPadding 16` and the modifier registry only has `imePadding`; the workaround is still needed |
| C1 | APK 50 -> 59 MB: shrink via Skia/ABI/resource config | NO | - | 0 | Growth is native libs stored uncompressed (`lib/` 40.5 MB of 64.9 MB uncompressed); Graphite is already off, resources are 3.2 MB, R8 already on; nothing SDK-58-specific to flip (details below) |
| C2 | Build speed: prebuilt `expo-modules-core`, R8 | nothing to do | - | 0 | Both already active in the regenerated project (`android.enableMinifyInReleaseBuilds=true`; prebuilt libs picked when the RN version matches) |
| C3 | React Compiler (`experiments.reactCompiler`) | LATER | M | ~+2 | Still opt-in in `babel-preset-expo 58` (`platformOptions['react-compiler']`); interplay with `@tamagui/babel-plugin` unverified; no render-performance problem to solve today |
| C4 | Embed Inter via the `expo-font` config plugin, drop `useFonts` + manual splash gating | **DONE differently (Prompt 4, 2026-10-17)**: Inter was unused, so `useFonts` + the splash pair were deleted outright, nothing embedded | S | -20 / +13 (comment) | Tamagui config v5 uses `createSystemFont()` ("System" on native); no Soli code references `Inter`/`InterBold`; Expo Router owns the splash hold/release. Details in "C4" below |
| C5 | `runOnJS` -> `scheduleOnRN` (11 call sites) | LATER | S | ~0 | `react-native-worklets 0.13` marks `runOnJS` `@deprecated` (`threads.native.d.ts:102`), but Reanimated's re-export is not, so no warnings; bundle with the GH hook migration when the scrubber is next touched |
| D1 | Gesture Handler hook API | LATER | M | ~0 | Already tracked under Follow-ups; builder API is deprecated-but-present |
| D2 | Expo Modules 2.0 for `modules/soli-solver` | LATER | M | ~0 | Beta; 2.5-5.6x faster sync calls on iOS are irrelevant for one `nativeSolve` call per hint |
| D3 | Noxcturnal transformer | LATER | S | +1 | "Early work ... numbers may change"; Tamagui babel plugin interplay |
| D4 | `Stack.Toolbar`, native tabs, Expo UI `NavigationStack`/`Toolbar` | NO | - | 0 | Soli's headers are Drawer-owned (re-verified in this plan); no bottom toolbar or tabs use case |
| D5 | Web remnants (`app/+html.tsx`, `web` config block, `tamagui-web.css`, `react-native-web`, `yarn web`) | **KEEP as dev tool, repaired (Prompt 4, 2026-10-17)**: web was broken since July; fixed via sqlite web setup + `output: single`; `+html.tsx` deleted | S | -50 / +21 | Karim uses `yarn web` -> `/feature-graphic` for store assets; `react-native-web`/`react-dom`/`@expo/metro-runtime` stay (Expo SDK 58 bundled versions, dev-only cost). Details in "D5" below |
| D6 | JS bundle 9.5 MB, about 3 MB of it generated deal/playlist data | watch | - | 0 | Not SDK-58-related; the playlist is test tooling shipped in release (`yarn release` relies on it), the solvable-deal catalog is product data |

### A1. Android Picker `key={value}` workaround

- What: `components/settings/PickerPreference.tsx:36-47` remounts the Expo UI `Picker` on every
  value change (`key={value}`) because the SDK 57 Android picker seeded its uncontrolled Compose
  `TextField` once and never updated it (commit `d3c21ec`, originally in the deleted
  `WarningModePreference.tsx`; generalized into `PickerPreference` on 2026-10-11).
- Evidence: installed `node_modules/@expo/ui/src/universal/Picker/Picker.android.tsx:29-34`
  derives `selectedLabel` on each render and runs `useEffect(() => { if (!isVisible) return;
  textFieldRef.current?.setText(selectedLabel) }, [selectedLabel, isVisible])`, so later
  selections are written back. The same code is on the `sdk-57` branch head (fix landed after
  57.0.19, the version expo/expo#50800 was filed against). `DrawCountPreference.tsx` has no
  `key` and the SDK 58 Android smoke (Testing table, "Settings (Expo UI 58 on Android)") saw
  "Draw 1 -> Draw 3 -> Draw 1 ... label updates each time (no stale label)".
- Steps: remove `key={value}`; replace the five-line comment with two lines: the workaround
  existed for the SDK 57 picker (expo/expo#50800), removed on SDK 58 because the installed
  picker pushes label changes itself; if a stale label ever returns, re-add `key={value}`.
  Keep the platform-split layout comment above it unchanged.
- Test: `yarn typecheck && yarn lint`; Android release build: Settings -> Scoring Standard ->
  Vegas -> Standard and Warnings Off -> No more useful moves -> Unwinnable; each label must
  follow the selection immediately. iOS uses `Picker.ios.tsx` (unaffected) — one glance only.
- Risk: low; revert is one attribute.

### A2. Jest `expo/winter` mocks and `transformIgnorePatterns`

- What: `package.json` jest block has six `moduleNameMapper` entries for `expo/winter*` and
  `expo/src/winter*` pointing at `test/mocks/expo-winter.ts` (an empty object), a
  `transformIgnorePatterns` override, and `test/setup/mock-expo-winter.ts` whose first five
  lines `jest.mock(...)` the same winter paths "that Jest cannot load under PnP". The file
  also holds the `expo-crypto` mock, which must stay.
- Evidence: PnP is gone (`.yarnrc.yml` `nodeLinker: node-modules`). `jest-expo 58`'s own
  preset setup requires the real winter runtime (`node_modules/jest-expo/src/preset/setup.js:360-366`)
  and its default ignore pattern `/node_modules/(?!(.pnpm|react-native|@react-native|...|expo|@expo|...))`
  (`jest-preset.js:144-147`) already matches `react-native-reanimated` / `react-native-worklets`
  by prefix. Scratch config without all of it (kept: `preset`, `resolver`, the two `expo-sqlite`
  mappers, the `expo-crypto` mock): 45 suites / 458 tests green in 13.5 s on 2026-10-17.
- Steps: in `package.json` delete the four `expo/winter*` and two `expo/src/winter*` mapper
  lines and the whole `transformIgnorePatterns` array; `git mv test/setup/mock-expo-winter.ts
  test/setup/mock-expo-crypto.ts` is NOT allowed (no staging) — create the new file, delete the
  old one, keep only the `expo-crypto` mock plus a two-line comment ("winter mocks dropped on
  SDK 58: the PnP reason is gone and jest-expo's preset loads `expo/src/winter` itself");
  update `setupFiles`; delete `test/mocks/expo-winter.ts`.
- Test: `yarn jest --runInBand` (expect 45 / 458), `yarn lint`.
- Risk: low; if a suite ever fails on winter again the mappers are in git history.

### A3. `headerStatusBarHeight: insets.top`

- What: `app/(tabs)/_layout.tsx:29` passes `headerStatusBarHeight: insets.top` to the Drawer
  `screenOptions`; `useSafeAreaInsets` (lines 4, 11) exists only for this.
- Evidence: Expo Router 58's vendored header defaults to exactly that:
  `node_modules/expo-router/build/react-navigation/elements/Header/Header.js:132`
  `headerStatusBarHeight = isParentHeaderShown ? 0 : insets.top` (same in `elements/Screen.js:91`);
  `DrawerView.js:239-254` forwards the option unchanged. The root `Stack` hides its header
  (`app/_layout.tsx` `headerShown: false`), so `isParentHeaderShown` is false. Added in commit
  `6b30a56` (2025-11-02) without a recorded reason.
- Steps: remove the option line and the `useSafeAreaInsets` import + `const insets` line.
- Test: typecheck; Android + iOS screenshot of the Play header versus the sdk58 scratch
  screenshots (status bar inset identical).
- Risk: low; pure default reliance.

### A4. `assetBundlePatterns` and comment refresh

- What: `app.json:11` `"assetBundlePatterns": ["**/*"]`.
- Evidence: `node_modules/@expo/config-types/build/ExpoConfig.d.ts:192-195` marks it
  `@deprecated` ("Follow the guide to select and exclude assets for EAS Update instead"). Soli
  uses no EAS Update; Metro bundles every `require`d asset into the binary regardless.
- Steps: delete the key; while in the area, append "(re-checked on @expo/ui 58.0.20: still
  true)" to the three SDK 57 comments that remain valid: `app/(tabs)/settings.tsx:80-85`
  (Compose `LazyColumn` has no inset support — confirmed in `FieldGroup.android.tsx:35`
  `contentPadding={{ start: 16, end: 16, top: 16, bottom: 16 }}` and the modifier registry's
  only inset helper `imePadding`), `components/settings/DrawCountPreference.tsx:21-22`,
  `components/settings/PickerPreference.tsx:23-26`.
- Test: `npx expo config --type public` prints without the key; `yarn typecheck`.

### C1. APK size, what the 59 MB actually is

`app-release.apk` (single ABI, R8 on) listed with `unzip -lv`, uncompressed / stored sizes:

| Part | Size | Note |
| --- | --- | --- |
| `lib/arm64-v8a/*.so` | 40.5 MB | stored uncompressed (`expo.useLegacyPackaging=false`, required for direct mmap; Play compresses on delivery). Largest: `librnskia.so` 14.3 MB, `libreactnative.so` 7.0, `libhermesvm.so` 2.7, `libexpo-sqlite.so` 1.9, `libappmodules.so` 1.7, `libreanimated.so` 1.7, `libexpo-modules-core.so` 1.6, `libc++_shared.so` 1.3, `libworklets.so` 1.3, screens/svg/GH codegen 2.4, Fresco image libs 1.7, `libzstd-kmp.so` 0.7 (new: `expo` package's `zstd-kmp-okio` dependency, `node_modules/expo/android/build.gradle:48`), `libexpo-modules-v2.so` 0.3 (new runtime), `libsoli_solver_ffi.so` 0.5 |
| `classes.dex` | 9.6 MB (4.5 compressed) | R8-minified |
| `assets/index.android.bundle` | 9.5 MB | Hermes bytecode, stored uncompressed (RN default for startup); about 3 MB of the TS source is `src/data/*.generated.ts` |
| `res/` + `resources.arsc` | 4.8 MB | 958 files; biggest two PNGs 0.7 + 0.5 MB (splash/icon assets) |

Why it grew from about 50 MB (SDK 57 single-ABI, `scripts/lib/build-tools.js:636`): Skia 2.6 -> 2.14
and the new `expo-modules-v2` / zstd runtimes added native code, and the hints feature +
Rust solver added JS and `libsoli_solver_ffi.so`; R8 took the dex down (9.5 vs 27.6 MiB mmap in
the RAM table) but dex is small to begin with. Checked and rejected: Skia Graphite is already OFF
(`libs/.graphite` marker absent, `android/build.gradle:67`); `shrinkResources` via
`expo-build-properties` would re-add a package for well under 1 MB of unused resources;
`enableBundleCompression` shrinks the on-disk APK but costs startup and does not change Play
download size (the AAB is compressed per ABI anyway); dropping Fresco/svg/sqlite libs is not
possible without dropping features. The store artifact is a 4-ABI AAB that Play splits per
device, so users download roughly the compressed single-ABI payload, not 59 MB.

### C4. Inter fonts: removed, not embedded (Prompt 4, 2026-10-17 19:30 UTC)

Original framing (superseded): `app/_layout.tsx:25-42` ran `useFonts` for `Inter-Medium.otf` /
`Inter-Bold.otf` and gated the splash screen on it; the plan was to embed them with the
expo-font plugin and map Tamagui's `Inter`/`InterBold` faces per platform.

What the research found instead:

- The premise was wrong: Tamagui config v5 (`tamagui.config.ts` spreads
  `@tamagui/config/v5`'s `defaultConfig`, adopted 2026-06-13 in commit `4b39f8a`) defines
  `fonts.body`/`fonts.heading` with `createSystemFont()` —
  `node_modules/@tamagui/config/dist/esm/v5-fonts.native.js` sets `family: "System"` on native
  and a `-apple-system, system-ui, ...` CSS stack on web. The `createInterFont` + `face: { 700:
  { normal: 'InterBold' } }` mapping only exists in the legacy `fonts.mjs` (config v4), which
  Soli does not import.
- No Soli source sets `fontFamily: 'Inter'`/`'InterBold'` (grep over `app/`, `components/`,
  `src/`); the only custom `fontFamily` is the cards' `CardTextAndroid` (embedded via the
  app.json expo-font plugin). `tamagui-web.css` has zero `Inter` occurrences.
- So the two OTFs were loaded on every cold start since June and never drawn. The `useFonts`
  block dates from the first commit (`18857de`, config v4 era) and survived the v5 migration.
- Embedding them with the plugin would have embedded unused files, plus the iOS naming trap
  (`Inter-Medium.otf` declares family "Inter Medium" / PostScript `Inter-Medium`, name IDs
  read from the file; iOS ignores file names).
- Splash: Expo Router already holds the native splash at launch
  (`renderRootComponent.js:118` -> `_internal_preventAutoHideAsync`) and releases it once the
  first route has rendered (`ExpoRoot.js:198` -> `maybeHideSplashScreen` ->
  `internalMaybeHideAsync`, which hides unless a user-level `preventAutoHideAsync` hold exists:
  `SplashScreenModule.swift:21-37`, `SplashScreenModule.kt:25-55`). Soli's own
  `preventAutoHideAsync`/`hideAsync` pair therefore only ever added the font wait.

Change: `app/_layout.tsx` lost the `useFonts` call, the `useEffect`/`hideAsync`, the
`return null` gate, `SplashScreen.preventAutoHideAsync()` and the `expo-font`/`useEffect`
imports (-20 lines) and gained a 13-line decision comment. `expo-font` stays a dependency
(config plugin for `CardTextAndroid`). Guides updated: `docs/external-package-guides/expo-font.md`
(SDK 58 refresh, plugin facts verified against `expo-font@58.0.8` source) and
`tamagui-font-inter.md` (marked unused). Follow-up: drop the direct `@tamagui/font-inter`
dependency from `package.json` (not done here because package.json/yarn.lock were owned by the
concurrent 58.0.14 bump). Gain: one fewer async step before the first frame and two fewer asset
reads on cold start; -20 LOC; no font-name mapping risk. Visual risk: none expected, because the
removed fonts were never referenced — the device check below exists to prove that.

### D5. Web: keep as a dev tool, repaired (Prompt 4, 2026-10-17 20:05 UTC)

**Superseded 2026-10-18** by `docs/product/tamagui-3-upgrade/tamagui-major-upgrade.md`: the web
target, `metro.config.js`, `react-native-web`/`react-dom`, `yarn web` and the feature graphic were
removed one day later together with Tamagui. The notes below describe the state in between.

How the web flow is wired: `yarn web` = `expo start --web --port 8081` (Metro, `web.bundler:
metro`); `app/feature-graphic.tsx` is a `__DEV__`-only stub that requires
`src/dev/FeatureGraphicScreen.tsx` (store feature graphic, five variants, sole user of
`expo-linear-gradient`); `tamagui-web.css` is generated by `yarn generate:tamagui-css` and imported
in `app/_layout.tsx` (a no-op on native); `src/storage/historyRepository.ts` re-exports the `.web`
stub for TypeScript while Metro picks `.native`/`.web`; History is hidden on web by
`Drawer.Protected guard={Platform.OS !== 'web'}`; `react-native-web 0.21.4`, `react-dom 19.3.0`,
`@expo/metro-runtime 58.0.14` match `expo@58.0.14`'s `bundledNativeModules.json`.

Finding: web did not work — but not because of SDK 58. The last recorded web verification is
2026-07-03 (config v5 / Expo UI settings plans); on 2026-07-06 commit `94c939b` "expo kv store"
made `src/state/settings.tsx` import `expo-sqlite/kv-store`, which on web resolves to
`expo-sqlite/build/ExpoSQLite.web.js -> web/SQLiteModule.ts -> web/worker.ts -> wa-sqlite.wasm`.
Metro's default `assetExts` has no `wasm`, so every web bundle since then failed with "Unable to
resolve ./wa-sqlite/wa-sqlite.wasm". Two further blockers behind it: sync reads (`getItemSync`
in `SettingsProvider`) busy-wait on a `SharedArrayBuffer` (`web/WorkerChannel.ts`), which browsers
only allow under cross-origin isolation (COOP/COEP headers); and `web.output: "static"` renders
the route tree in Node via `@expo/router-server`, where `new Worker(new URL('./worker',
window.location.href))` cannot run at all.

Fix applied (smallest working set, all web-only, native untouched):

- `metro.config.js`: `config.resolver.assetExts.push('wasm')` + `server.enhanceMiddleware`
  wrapper adding `Cross-Origin-Embedder-Policy: credentialless` and
  `Cross-Origin-Opener-Policy: same-origin` — verbatim Expo's documented expo-sqlite web setup
  (https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/#web-setup). +21 lines incl. comment.
- `app.json` `web.output`: `"static"` -> `"single"` (client-only rendering; the dev server
  serves `@expo/cli`'s `static/template/index.html`).
- `app/+html.tsx` deleted (-50): it only feeds static rendering (`expo-router`'s
  `getRoutesCore` ignores it as a route; `@expo/router-server` is the sole consumer), so with
  `single` it was dead. The `#root`/body reset it provided comes from the CLI template instead.
- `docs/external-package-guides/expo-sqlite.md`: dated web-setup section.

Rejected: (a) deleting the web surface (`react-native-web`, `react-dom`, `@expo/metro-runtime`,
`yarn web`, `tamagui-web.css`, `historyRepository.web.ts`, the drawer guard) — Karim's prompt
confirms he uses web for the feature graphic, and the earlier clean-code review (#14) already
decided to keep it for that reason; (b) keeping `static` and guarding the sync read with
`Platform.OS` — more code in production paths for a dev tool; (c) running the native history
repository on web now that wasm works — possible (`openDatabaseAsync` is supported on web) but
untested and unneeded for the feature graphic; listed under Follow-ups.

How to work with it going forward: `yarn web`, open `http://localhost:8081/feature-graphic`,
pick a variant, screenshot at the 1024x500 canvas (the screen draws its own safe frame). Treat
web as a dev-only rendering surface, never a release target: no web smoke test in the release
flow, no web-specific product work. Proposed AGENTS.md wording is in the Prompt 4 report
(orchestrator decides).

## Follow-ups

| Candidate | Recommendation | Reasoning |
| --- | --- | --- |
| Tamagui 3 migration | Separate plan after SDK 58 is stable on both platforms | Flat style props, config v6 theme-key renames, `@tamagui/babel-plugin` removal, `@tamagui/cli/metro`; codemod-assisted but manual review heavy. Pro: native fast path, compiler coverage, SDK 58 first-class. Con: large diff, visual review |
| Gesture Handler hook API (`usePanGesture`, `useTapGesture`, `useExclusiveGestures`) in `useUndoScrubber.ts` | Do when GH announces builder removal or when touching the scrubber anyway | Builder API is deprecated-but-present; renames (`onStart`->`onActivate`, `onEnd`->`onDeactivate`, `onFinalize(success)`->`event.canceled`) are mechanical but need scrubber re-validation |
| Re-pin Worklets/Reanimated only via Expo from now on | Adopt | The 0.10.1 override served its purpose; Expo's matrix is now ahead |
| `Stack.Toolbar` | Not adopted (re-checked 2026-10-17 against `expo-router@58.0.21`) | Header placements (`left`/`right`) call `useCompositionOption`, which registers `headerLeft`/`headerRight` under `useRoute().key` in a `CompositionContext` that only `fork/native-stack/createNativeStackNavigator.js` (plus the experimental stack and `HrefPreview`) provides; `layouts/Drawer*.js` neither provides the context nor reads the registry. Soli's visible headers belong to the nested Drawer in `app/(tabs)/_layout.tsx`, so a header toolbar there would throw "must be used within a RouterCompositionOptionsProvider" or land on the wrong route key, exactly as the SDK 57 prototype showed. The default `placement="bottom"` is a separate native `RouterToolbarHostView` (`ExpoRouterToolbarModule`) that does not depend on the navigator, but Soli has no bottom toolbar use case. Revisit only if Expo adds Drawer header composition |
| Expo Modules 2.0 (beta) for `modules/soli-solver` | Defer | Beta; current DSL module works; revisit when stable |
| Noxcturnal transformer (`experiments.noxcturnalTransformWorker`) | Defer | Experimental; interacts with the Tamagui babel plugin |
| `agent-device` 0.19.3 -> 0.21.x | Bump only if Xcode 27 simulators fail to drive | Tooling only |
| `jest-pnp-resolver` removal | Done 2026-10-17 | Replaced by `react-native-reanimated/jest/resolver` (needed for Reanimated 4.7 under Jest) |
| Bump to the latest SDK 58 patches once the age gate allows | Done 2026-10-17 19:55 UTC (`expo 58.0.14` / `expo-router 58.0.23` / `expo-modules-core 58.0.22`; `--check` clean, doctor 19/20) | `expo-modules-core 58.0.22` carries an Android Hermes V1 per-module-class memory fix; together with the 18:30 UTC native changes (expo-crypto, expo-splash-screen) an Android rebuild is due in the combined native test |
| Migrate the three `react-test-renderer` tests to `@testing-library/react-native` | Separate small task | `react-test-renderer` is deprecated by React and no longer pulled in by `jest-expo`; keeping it explicit works today |
| `agent-device` npm script name shadows the binary (expo-doctor warning) | Rename only if a fully green doctor matters | Script exists to inject `AGENT_DEVICE_IOS_RUNNER_IDLE_STOP_MS=0`; renaming touches the testing skill docs |
| Drop the direct `@tamagui/font-inter` dependency (`package.json` 2.4.2) | Adopt, next time `package.json` is touched (one `yarn remove`) | Nothing imports it since C4 removed the two OTF `require`s (2026-10-17); `@tamagui/config` keeps it transitively, so `node_modules` size does not change. Pro: honest dependency list, no stale guide. Con: none; if a UI font returns, embed it via the expo-font plugin instead |
| Load `CardTextAndroid` on web for the feature graphic (`useFonts` in a `.web.tsx` wrapper of `FeatureGraphicScreen`, or in `app/feature-graphic.tsx` behind `Platform.OS === 'web'`) | Do it the next time a store graphic is produced (about +8 lines, dev-only) | Today the web cards use the browser fallback font, so the exported graphic's card glyphs differ from the device look. Pro: store asset matches the app. Con: a second font-loading path (web only) — acceptable because the native plugin cannot run on web |
| Run the native history repository on web (delete `historyRepository.web.ts`, the `historyRepository.ts` re-export shim and the `Drawer.Protected` web guard) | Defer; only if History is ever wanted in the browser | expo-sqlite's `openDatabaseAsync` works on web now that the wasm setup exists (D5), so the stub's original reason ("keep WASM setup out of scope") is gone. Pro: about -45 LOC and one fewer platform fork. Con: untested migrations/`SQLITE` features on wa-sqlite, Teleport history sheet is native-only; nothing needs it for the feature graphic |
