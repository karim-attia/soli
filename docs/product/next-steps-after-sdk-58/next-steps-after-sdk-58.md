# Next steps after SDK 58 + Tamagui removal: consolidated backlog

Research 2026-10-18 (planning sub-agent, read-only: no source, package or config changed; nothing
staged or committed). Inputs: `docs/product/expo-rn-sdk-58-upgrade/upgrade-to-expo-sdk-58-and-react-native-0-88.md`
(SDK 58 adoption candidates, Follow-ups, Identified issues), `docs/product/tamagui-3-upgrade/tamagui-major-upgrade.md`
(Expo UI audit, Follow-ups, Identified issues), `package.json`, `app.json`, the installed
`node_modules` sources, `npm view` for every dependency, a grep of `app/ components/ src/ test/
scripts/ plugins/ modules/` for imports and workaround comments, and the official Expo / RN / React /
Reanimated / Gesture Handler release notes (section D).

## User prompt

```text
Hey, so this all looks like good and nice and well working. Anything else that we should consider that we should do next? That's this cleanup kind of enables or You know. Also, by the way, I think I asked a bit earlier from the SDK Upgrade I don't think I've replied to that thing please tell me again. if there's any follow-up also from that to like you know I don't I start air like libraries that are updated or like that we can remove and don't need anymore or like workarounds or like other stuff like that. what I don't know. In general like what update possibilities are there? And also what other options did 58 give us that we can now maybe do cool things that would work here. Like for example when we upgraded to I guess fifty seven this introduced expo UI and we started replacing a bunch of stuff with Expo UI that we just did not have before and like, you know, what additional options do we have from this? Thank you.
```

Round 2 (2026-10-18, decisions on the backlog):

```text
Please have a look at React Compiler and also tell me what like the different things are 

Have a look at the expo doctor thing. 

Are items five and six low risk? do you wanna have a look or do you recommend to do that later? Like it could also just be done now, but only like are there also downsides? 

oxlint go. 

I don't know exactly what E2 means and are there like drawdowns 

I think 8 chint device would make sense to upgrade if there's no drawback, right? And what are the changes
```

("8 chint device" = agent-device. React Compiler and items 5/6 are handled in a separate pass; this
round's implementation work is oxlint (E1), expo-doctor / A15, and agent-device (A14) — see
"Steps to implement".)

Round 3 (2026-10-18, after the React Compiler deep dive + C5/D1 risk assessment):

```text
Yes: first do C5 (runOnJS to scheduleOnRN) plus the Reanimated set() and useAnimatedValue fixes, then the measured React Compiler experiment (option C, infer app-wide, keep memos) with baseline vs flipped numbers on Android. Also remove the obsolete Appium scrub script and guide. Leave D1 for later.
```

Round 4 (2026-10-19, after S11 left the compiler ON):

```text
can you tell me a little bit more about what the compiler even does? And yes please go on with the next step. Thank you very much
```

("the next step" = option D, manual memo removal — see "Option D: manual memo removal (prompt 3)".)

## Summary

S16 (2026-10-19, testing agent): **option D measured on the phone and kept — no memo
restored.** Android Release (bundle regenerated, compiler proof identical to config B:
sentinel ×86 / `CompilerRuntime` ×117), 2 × 20-game playlists vs the S11 config B means:
wall 190.4 vs 189.9 s, janky 8.08 vs 8.14 %, p50/p90/p95/p99 10/15/17/21 ms both, PSS fresh
152.2 vs 155.1 MiB, PSS post 314.4 vs 330.8 MiB (−16 MiB, lower), 40/40 games, 0 crashes.
Idle board 60 s = 60 frames (one per timer tick). Smoke identical to config B on Android and
iOS (scrubber 20/0/80/79 exact on both, celebration preview + badge cycle, real win → dialog
→ Deal Again, hint ring, wiggle on the tapped stack only, drawer, History sheet Retry/Share,
Settings pickers + animations master, Demo sheet Seed history, iOS 5/5 playlist). Details in
"S16 results" under Testing. Phone restored (Scoring = Vegas, Warnings = stuck, light, 60 s
timeout, seeds cleared).

Round 4 (2026-10-19, implementation sub-agent, code only — device measurement done in
S16, see above): **option D done.** Of the 170 manual memo sites (`useCallback` 125, `useMemo` 31,
`React.memo`/`memo` 14 — the deep dive's "162" missed 7 generic-typed calls and one nested
one), **86 removed, 84 kept** with a reason each (inventory below). Kept: 58 inside the 8
compiler-skipped functions, 4 `React.memo` on list rows / library-rendered roots, 21
`useCallback`s that are (transitive) `useEffect` dependencies (react.dev's one named case
for keeping `useCallback`; `react-hooks/exhaustive-deps` flags plain functions there), and
2 reverted after the compiled-output check (`useSolvableDealSelector` would no longer be
compiled at all; `AbsoluteCardLayer`'s `items` would merge into the JSX scope). Every
removal was verified by compiling before/after: coverage stays **75 / 8**, every removed
value still sits in a cache slot with the same guard, and `CelebrationAtlas` even lost its
one pruned memo block (a hook call was reordered above the derived data). Net **−124 LOC**
over 20 files; gates green (typecheck, lint 0, lint:strict, Jest 458/458, oxfmt). Behaviour
is identical by construction, but Jest runs uncompiled code — the S16 device pass (same
metrics as S11, against config B) is the real check.

S11 (2026-10-18, testing agent): measured React Compiler A/B on the phone (2 × 20-game playlists
per config, same state): janky 9.12 % → 8.14 %, p50/p90/p95/p99 10/15/17/21 ms both, PSS fresh
+2.3 MiB / post +5.6 MiB (inside run-to-run noise), playlist 193.5 → 189.9 s, 0 crashes;
scrubber / celebration / real win / glow / hint / undo / drawer identical on Android and iOS.
**`experiments.reactCompiler: true` stays ON in `app.json`** (rollback = delete that line +
delete `android/app/build/generated/assets/react/release`, rebuild). Two tooling findings: the
Release `index.android.bundle` is Hermes bytecode (the plan's grep marker cannot prove the flip —
use a plain `expo export:embed` JS and count `react.memo_cache_sentinel`: A 2 / B 86), and
`app.json` changes do NOT invalidate `:app:createBundleReleaseJsAndAssets` (first B build shipped
the old bundle). Both recorded in SKILL.md §8. Gates with the flag on: typecheck/lint/Jest green.

Round 3 (2026-10-18, code only — measurements pending): C5 done (6 `runOnJS` → `scheduleOnRN`,
3 `runOnUI` → `scheduleOnUI`, imports from `react-native-worklets`), compiler-readiness done (39
shared-value writes → `.set()`, 7 `useRef(new Animated.Value()).current` → `useAnimatedValue`,
the two `eslint-disable` comments replaced by honest memo deps), Appium scrub path deleted. The
installed `babel-plugin-react-compiler 1.0.0` now compiles **75 functions and skips 8** (was 70 /
13): `useFoundationGlowAnimation`, `UndoScrubber`, `EmptySlot`, `WinCleanupPile` and
`CelebrationAtlas` are newly compiled. `AbsoluteLayerCard` (the per-card hot path),
`useUndoScrubber` and `useCelebrationController` stay skipped on deliberate render-time ref
patterns — behaviour on the board is therefore unchanged by a flip. The compiler flag is still OFF;
S11 (testing agent) runs the baseline-vs-flipped protocol in "Compiler experiment test plan".
Gates: typecheck, lint, lint:strict, Jest 458/458 all green.

Round 2 (2026-10-18): oxlint 1.88.0 (six React Compiler rules configured off, strict script
simplified), expo-doctor 20/20 (`yarn ad` replaces `yarn agent-device`), agent-device 0.21.28 —
every soli-testing recipe re-verified on the phone and the simulator, and iOS scrubber pans now
work without Appium. Details in Steps S1-S5, Testing, Intermediary learnings.

Honest bottom line: the two big tasks of the last two days (SDK 58, Tamagui + web removal) banked
the structural wins — memory -22 to -47 %, R8, SceneDelegate, -12 packages, -1,400 LOC, a plain
Babel config. What they *enable* is a short list of small cleanups (section A, C) and exactly one
"now possible" item that was blocked before: the React Compiler (the `@tamagui/babel-plugin`
interplay was the recorded blocker; it is gone). There is no new "Expo UI moment" in SDK 58 for
Soli: the SDK 58 features are mostly navigation chrome (toolbars, native tabs, zoom transitions,
Liquid Glass) that Soli's single-screen Drawer layout does not use, and the player-visible modules
worth considering (haptics, sounds, a widget) were available long before 58 and were *deliberately*
not adopted in earlier plans (no haptics, no nagging). The dependency list is clean: every
Expo-managed package is on the SDK 58 set (`expo install --check` is clean), and only five
non-Expo dev tools are behind (oxlint, oxfmt, agent-device, `@types/react-test-renderer`,
lucide-react-native). Top 5 in section E.

## Description

Karim asked three things after SDK 58 + Tamagui removal: (1) what the cleanup enables, (2) the
unanswered follow-ups from the SDK 58 plan (outdated libraries, removable packages, workarounds),
(3) what SDK 58 makes newly possible, the way SDK 57 brought Expo UI. This document is the single
backlog for all three, with a recommendation per item so the next session can pick without
re-researching. It is a planning artefact, not an implementation plan: each DO NEXT item gets
its own small plan (or is small enough to go without one, per AGENTS.md).

## Acceptance Criteria

- Every open follow-up from the SDK 58 and Tamagui plans appears exactly once (section A), with
  status, effort, value and a DO NEXT / LATER / DROP call; items already done today are marked.
- Every `package.json` dependency has an installed-vs-latest row and an unused/used verdict
  backed by a grep or a peer-dependency fact (section B).
- Every workaround/hack comment left in the code is listed with whether SDK 58 sources make it
  removable (section C).
- SDK 58 / RN 0.88 / React 19.3 / Reanimated 4.7 / GH 3 opportunities are mapped to a concrete
  Soli use with value, effort, risk and a candid recommendation (section D).
- A top-5 ordering with rationale (section E).

## Possible approaches

### A. Open follow-ups from both plans (deduped)

Status legend: DONE = landed today (2026-10-17/18) and only listed so the SDK 58 plan's open
questions are answered; the rest are open.

| # | Item | Source | Status | What / why | Effort | Value | Rec |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A1 | Fonts C4: Inter removed, `useFonts` + manual splash gating deleted | SDK 58 plan C4 | DONE 10-17 | Inter was never referenced after config v5; one async step less before the first frame | — | — | — |
| A2 | Web target D5 (sqlite wasm setup, `output: single`) | SDK 58 plan D5 | SUPERSEDED: web removed 10-18 | Feature graphic + web deleted with Tamagui; `metro.config.js` gone | — | — | — |
| A3 | Tamagui 3 migration | SDK 58 Follow-ups | DONE differently: Tamagui removed 10-18 | -12 packages, Babel preset-only | — | — | — |
| A4 | Drop direct `@tamagui/font-inter` | SDK 58 Follow-ups | DONE (all Tamagui gone) | — | — | — | — |
| A5 | Load `CardTextAndroid` on web for the feature graphic | SDK 58 Follow-ups | DROP (web + feature graphic removed) | — | — | — | DROP |
| A6 | Native history repository on web | SDK 58 Follow-ups | DROP (web removed) | — | — | — | DROP |
| A7 | `jest-pnp-resolver` removal, patch bump to 58.0.14 set, Worklets re-pin via Expo | SDK 58 Follow-ups | DONE 10-17 | — | — | — | — |
| A8 | `Stack.Toolbar` / native tabs | SDK 58 Follow-ups + D4 | Re-verified NO | Toolbar header placements need the native-stack composition context; Soli's headers are Drawer-owned; no bottom toolbar use case | — | — | DROP (revisit only if Expo adds Drawer header composition) |
| A9 | Migrate 3 `react-test-renderer` tests to `@testing-library/react-native` | both plans | open | `react-test-renderer` is deprecated by React; `jest-expo 58` dropped it; expo-router lists `@testing-library/react-native >= 14` as optional peer. Files: `test/unit/features/klondike/historyEntryBoardRow.test.tsx`, `hintWarnings.test.tsx`, `test/unit/state/history.lateUpdate.test.tsx` | S | Low (hygiene; removes 2 devDeps, adds 1) | LATER (bundle with the next test-touching task) |
| A10 | Gesture Handler hook API in `useUndoScrubber.ts` (`usePanGesture`, `useTapGesture`, `useExclusiveGestures`) + `runOnJS` -> `scheduleOnRN` (11 sites) | SDK 58 D1 + C5 | open | Builder API and `runOnJS` are `@deprecated` (JSDoc only, no runtime warning, GH 3.3 / Worklets 0.13). Mechanical renames but the scrubber needs full re-validation (`yarn scrubtest` both platforms) | M | Low today (no warnings), insurance against GH 4 | LATER — do when the scrubber is next touched or GH announces removal |
| A11 | React Compiler (`experiments.reactCompiler`) | SDK 58 C3; animation-audit plan "React Compiler rollout after hotspots" | open; **unblocked by the Tamagui removal** (the recorded blocker was the `@tamagui/babel-plugin` interplay) | `babel-preset-expo 58` still gates it behind `experiments.reactCompiler` (`build/index.js:170`). Soli has ~146 manual `useMemo`/`useCallback`/`memo(` in `src/features/klondike`; the compiler could make many redundant, but the board is the perf-critical path and Reanimated worklets/`useAnimatedStyle` interplay must be measured, not assumed | M (flip + measure; L if memo cleanup follows) | Medium (code simplicity; perf neutral-to-positive) | LATER — a measured experiment (frame times + RAM on the 20-game playlist), not a default flip |
| A12 | Expo Modules 2.0 for `modules/soli-solver` | SDK 58 D2 | open | Beta; one `nativeSolve` call per hint, speedup irrelevant | M | None today | DROP until stable and the module is touched anyway |
| A13 | Noxcturnal transformer (`experiments.noxcturnalTransformWorker`) | SDK 58 D3 | open; Tamagui blocker gone | Experimental faster Metro transformer; only build speed | S | Low (dev-only) | LATER — try once with a timed `yarn ios`; revert if any bundling oddity |
| A14 | `agent-device` 0.19.3 -> 0.21.x | SDK 58 Follow-ups | open | Tooling; the soli-testing skill is tuned to 0.19.3 flags | S-M (re-validate recipes) | Low | LATER — only when a sim/phone driving step fails |
| A15 | `agent-device` npm script shadows the binary (expo-doctor 19/20) | SDK 58 Follow-ups | open | Rename the script (e.g. `ad`) + update the skill | S | Cosmetic | DROP unless a green doctor matters |
| A16 | Android R8 `ExpoModulesV2 ... Enumerable` warnings (expo-crypto digest enums, expo-sqlite `SQLAction`) | SDK 58 Identified issues | upstream, unchanged in 58.0.14 | Soli never calls those paths | — | — | WATCH per upgrade; no action |
| A17 | Card-adjacent system-font text -> `CardTextAndroid` (empty-foundation suit glyph, "Draw N", "N left", empty labels) + `STACK_PADDING` 8 vs token 7 | Tamagui Follow-ups + Identified issues | open | Device-independent look like the cards; glyph coverage must be checked first (font may need digits/letters rebuilt via `scripts/build-card-fonts.py`); the 1 px padding mismatch is a conscious parity choice to re-approve | S-M | Medium (visual consistency on Android, where system fonts vary) | DO NEXT (measure first, small) |
| A18 | Expo UI `Button` for History sheet Retry/Share (nested Host inside `RNHostView` inside the sheet Host) | Tamagui Follow-ups; expo-ui guide | open | SDK 58 fixed hosted-view touches in `BottomSheet`; one call site behind `AppButton`; keep `AppButton` if flaky | S (try) | Low-Medium (native button look in the sheet) | DO NEXT as a 30-minute try; drop on first flake |
| A19 | Expo UI `List`/`ListItem` for History | Tamagui Follow-ups | blocked | `ListProps` still only `children, onRefresh, testID` in 58.0.20 — no end-reached/pagination | — | — | LATER, re-check each SDK |
| A20 | Dev Demo sheet on Android: invisible section headers / `AppButton` labels, rows overflow the sheet width | Tamagui Identified issues (pre-existing) | open | Expo UI `BottomSheet`/`RNHostView` measuring RN children with an unconstrained width; dev-only, a11y tree is fine | S-M | Low (dev tool) | LATER — fix opportunistically when the sheet is touched (possibly the same `contentWidth` trick history.tsx uses) |
| A21 | Hamburger icon weight: Android `menu.xml` is the package's wght 400 while the drawer glyphs are vendored wght 300 | new (grep) | open | Consistency with Karim's 300 decision; also lets `@expo/material-symbols` (7,698 XMLs) leave `package.json` (section B) | S | Low | DO NEXT, bundled with B-unused cleanup — or DROP if Karim likes the heavier menu glyph |
| A22 | `scripts/build-rust-solver.sh` comments say "RN 0.86 pins NDK 27.x / minSdk 24" | new (grep) | stale wording, still correct | RN 0.88 still pins `ndkVersion 27.1.12297006` (`react-native/ReactAndroid/gradle.properties:7`) and expo-modules-core defaults `minSdkVersion 24` | S | Cosmetic | DO NEXT as a 2-line comment refresh when touching scripts |

### B. Dependencies

`npm view <pkg> version time` on 2026-10-18 vs installed. Expo-managed = listed in
`expo@58.0.14`'s `bundledNativeModules.json`; those follow `npx expo install --check` (clean today)
and must NOT be bumped by hand, even where npm has a newer version.

#### B1. Outdated, non-Expo-managed

| Package | Installed | Latest (date) | What the update brings | Risk | Rec |
| --- | --- | --- | --- | --- | --- |
| `oxlint` | 1.73.0 | 1.88.0 (10-13) | 15 minors of rule fixes / new rules; `.oxlintrc.json` format unchanged in 1.x | Low; new rules may flag new warnings — run `yarn lint` and `lint:strict` after | DO NEXT (one `yarn up`, 5 min) |
| `oxfmt` | 0.54.0 | 0.73.0 (10-13) | 0.x formatter: formatting output may change in places | Low-Medium: a bump can reformat files repo-wide (noise in the diff while a lot is uncommitted) | LATER — bump right after the current working tree is committed, then `yarn format` in its own commit |
| `agent-device` | 0.19.3 | 0.21.28 (10-15) | Two minors of the device-driving tool | Medium for the testing skill recipes (flags/output parsing) | LATER (see A14) |
| `lucide-react-native` | 1.50.0 | 1.59.0 (10-17) | New icons; occasional path tweaks to existing glyphs | Low; the 5 board glyphs were parity-checked against 1.50 path data | DROP for now (no need; re-check glyph parity if bumped) |
| `@types/react-test-renderer` | 19.1.0 | 19.3.0 (09-09) | Types matching `react-test-renderer 19.3` | None | DO NEXT (trivial) — or disappears with A9 |
| `@babel/core` | 7.29.7 | 8.0.7 (10-07) | Babel 8 major | High: `babel-preset-expo 58` depends on `@babel/core ^7.26.0` | NO — stay on 7 until Expo moves |
| `react` / `react-test-renderer` | 19.3.0 | 19.3.1 (10-14) | Patch | Expo-managed (`bundledNativeModules` says 19.3.0) | NO — follow `expo install --check` |
| `react-native-gesture-handler` | 3.3.0 | 3.4.0 (10-16) | Minor | Expo-managed (`~3.3.0`) | NO — follow Expo |
| `typescript` | 7.0.2 | 7.0.2 | — | — | current (kept in `expo.install.exclude` on purpose: Expo pins 5.x) |
| everything else (`expo*`, `@expo/ui`, RN, Reanimated, Worklets, Skia, svg, screens, safe-area, jest, jest-expo, babel-preset-expo, `@react-native/jest-preset`, `@types/react`, `@types/jest`) | = latest / = Expo set | — | — | — | current |

#### B2. Unused or config-plugin-only packages (each claim verified)

| Package | Imports in app/components/src/test/scripts | Why it is (still) there | Rec |
| --- | --- | --- | --- |
| `@expo/material-symbols` 0.1.1 | 1: `components/navigation/HeaderMenuButton.tsx:14` `import('@expo/material-symbols/menu.xml')` | Drawer glyphs are vendored at wght 300 in `assets/icons/material/`; only the hamburger still reads the package (wght 400) | REMOVE after vendoring `menu_wght300.xml` the same way (A21): -1 dependency with 7,698 XMLs in `node_modules` |
| `expo-system-ui` | 0 | Config-plugin-only: `@expo/prebuild-config` warns "Install expo-system-ui in your project to enable this feature" for Android `userInterfaceStyle: automatic` without it (`withAndroidUserInterfaceStyle.js:23`) | KEEP (needed for dark mode on Android) |
| `expo-font` | 0 | Config plugin embeds `CardTextAndroid` (3 files, `app.json`) | KEEP |
| `expo-splash-screen` | 0 | Config plugin (`app.json`); Router hides the splash itself | KEEP |
| `expo-constants`, `expo-linking`, `react-native-screens` | 0 | Required peers of `expo-router 58` (`peerDependencies`) | KEEP |
| `react-native-svg` | 0 direct | Peer of `lucide-react-native` (board icons) and Reanimated | KEEP |
| `react-native-worklets` | 0 direct | Peer of Reanimated 4 (+ router/@expo/ui) | KEEP |
| `@expo/metro-runtime` (devDep) | 0 | Direct dependency AND peer of `expo-router`; `expo-router/entry-classic` imports it first; in Expo's bundled set | KEEP (harmless, Expo-managed) |
| `expo-crypto` | 1: `src/solitaire/dealIdentity.ts` (`getRandomValues` x2) | Expo's winter runtime (`node_modules/expo/src/winter/`) ships no `crypto` global, so the package is the only source of secure random bytes | KEEP |
| `react-test-renderer` + `@types/react-test-renderer` | 3 tests | Deprecated by React, no longer pulled in by `jest-expo` | REPLACE via A9 (LATER) |
| `expo-status-bar` | 1 | — | KEEP |
| `dependenciesMeta: @shopify/react-native-skia.built: true` | — | `.yarnrc.yml` has `enableScripts: false`; Skia's postinstall copies the prebuilt libs | KEEP (documented in `.yarnrc.yml`) |
| `expo.install.exclude: ["typescript"]` | — | Expo would downgrade TS 7 (tsgo) to 5.x | KEEP |

Checked and *not* present any more (so nothing to remove): `expo-linear-gradient`, `@tamagui/*`,
`react-native-teleport`, `react-native-web`, `react-dom`, `jest-pnp-resolver` — all left with the
Tamagui/web removal; `package.json` has no `resolutions` and no patches.

### C. Workarounds / hacks still in the code

Grep of `workaround|hack|TODO|FIXME|upstream|expo/expo#|re-add|deprecated|SDK 5x|RN 0.8x` over
`app/ components/ src/ test/ scripts/ plugins/ modules/` + build scripts. Soli is remarkably clean:
only the items below reference platform behaviour.

| # | Where | What | Still needed on SDK 58? | Rec |
| --- | --- | --- | --- | --- |
| C1 | `app/(tabs)/settings.tsx:80-87` | Android-only bottom `SafeAreaView` edge around the Expo UI `FieldGroup` Host (B1 in the SDK 58 plan) | YES — `@expo/ui 58.0.20` `FieldGroup.android.tsx:35` still hardcodes `contentPadding 16` and the Compose modifier registry still only has `imePadding` (no `safeDrawing`/window insets) | KEEP; re-check each SDK |
| C2 | `components/NativeIcon.tsx` | iOS pins every SF Symbol to the light `colorScheme` environment because `face.smiling`'s dark rendition is the filled face | YES — system symbol catalog behaviour, not a bug Expo can fix | KEEP (decision comment exists) |
| C3 | `components/settings/PickerPreference.tsx:36-41` | Comment only: the SDK 57 `key={value}` remount was removed on 58 | Removed today (A1 of the SDK 58 plan); the comment is the re-add instruction | KEEP comment |
| C4 | `run-android-release.sh:49-140` + `build-android.sh:15-110` | ~100 duplicated lines per script that rewrite the generated `android/app/build.gradle` `signingConfigs`/`buildTypes.release` blocks by exact-string match after prebuild | YES — the RN 0.88 / SDK 58 template still signs release with `signingConfigs.debug` (verified in the regenerated `android/app/build.gradle:129`) | SIMPLIFY LATER: one config plugin (`withAppBuildGradle`) in `plugins/` would replace both bash patches and run on every prebuild (no "exact string" fragility, -150 LOC of shell). Trade-off: Gradle text munging moves into JS; both still break if the template changes. Not player-visible |
| C5 | `plugins/withBuildSpeedGradleProperties.js` | Injects `org.gradle.caching`, `configuration-cache`, `problems=warn`, 4g heap | YES — the SDK 58 template still does not set these; configuration cache + AGP 9 worked in the SDK 58 builds | KEEP |
| C6 | `scripts/ios-active-arch-only.xcconfig` (new, untracked) | `ONLY_ACTIVE_ARCH = YES` for local Release sim builds | Build-speed tooling, independent of SDK | KEEP (commit with the rest) |
| C7 | `scripts/build-rust-solver.sh:51,68` | "RN 0.86 pins NDK 27.x", "--platform 24 matches RN 0.86 minSdk" | Values still correct for RN 0.88 (NDK `27.1.12297006`, minSdk 24); wording stale | Refresh comment (A22) |
| C8 | `scripts/build-install-ios.js:308,393` | RN 0.86 log-routing note, launcher dedupe "workaround" | Tooling, harmless | KEEP |
| C9 | `test/mocks/expo-sqlite*.ts`, `test/setup/mock-expo-crypto.ts` | Native-module mocks for Jest | YES (native modules) | KEEP |
| C10 | `app/+native-intent.tsx:5-12` | Comment says the raw-URL behaviour was "verified SDK 57" | Behaviour unchanged in Router 58 (cold-start deep link smoke passed on both platforms) | Optional: append "re-verified SDK 58" |
| C11 | `components/navigation/AppDrawerContent.tsx:13-19` | Product decision: store link, no `expo-store-review`, no automatic prompt | Product decision, not a workaround | KEEP — see D |
| C12 | `src/theme/index.ts:5`, `history.tsx:118`, `UndoScrubber.tsx:172`, `CelebrationOverlayLayer.tsx:210` | RN 0.87/0.88 strict-type adaptations | Correct for 0.88 | KEEP |

Already removed today and confirmed gone: the Android Picker `key={value}` remount, the Jest
`expo/winter` mocks + `transformIgnorePatterns`, `headerStatusBarHeight: insets.top`,
`assetBundlePatterns`, the `useFonts`/splash pair, `metro.config.js`, the Tamagui Babel plugin,
`index.js` custom entry, the web `historyRepository` fork + `isHistorySupported` guards.

### D. New possibilities from SDK 58 (the "Expo UI moment" question)

Sources (research sub-agent, official only): SDK 58 changelog (https://expo.dev/changelog/sdk-58),
SDK 58 beta post, SDK 57 changelog (to separate new-in-58 from already-in-57), Expo UI 58 docs
(https://docs.expo.dev/versions/v58.0.0/sdk/ui/) cross-checked against the installed
`@expo/ui@58.0.20` `src/universal|swift-ui|jetpack-compose` exports and CHANGELOG, expo-router 58
CHANGELOG, RN 0.87 / 0.88 blog posts, React 19.3 blog post, Reanimated releases, GH 3 upgrade
guide. Claims the sub-agent could not verify are marked.

**Headline, candidly:** SDK 58 is a platform/tooling release, not a "new UI library" release the way
57 brought Expo UI. The genuinely new things are navigation chrome stabilisation (`Stack.Toolbar`,
`NativeTabs` stable path), Android home-screen widgets, build/bundle speed (prebuilt
`expo-modules-core`, Noxcturnal), Expo Modules 2.0 beta and the iOS 27 scene lifecycle. The
player-visible modules Soli could adopt (haptics, sounds, context menus, widgets, Liquid Glass)
all existed in SDK 54-57 already; what changed for Soli is that (a) the Babel config is plain
now, which unlocks Noxcturnal and the React Compiler, and (b) Expo's Android haptics got fixed
(per the expo-haptics 58.0.0 changelog as read by the sub-agent — verify when adopting).

#### D1. Player-facing

| # | Opportunity | New in 58? | Concrete Soli use | Player value | Effort | Risk | Rec |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1.1 | **Haptics** (`expo-haptics`, not installed) | Old API (`impactAsync` Soft/Rigid, `performAndroidHapticsAsync`); 58.0.0 fixes Android `performAndroidHapticsAsync` being a no-op (sub-agent: changelog) | `selectionAsync` on card pickup, `impactAsync(Light)` on tableau drop, Soft on foundation, `notificationAsync(Success)` on win, Warning on the unwinnable notice. Behind a Settings switch (default ON?). Note the undo-scrubber plan said "no expo-haptics — not a dependency today, don't add" — that was scope control for that feature, not a product ban; this is the first time haptics are proposed app-wide | High (the single most "feel" per LOC; every polished card game does it) | S (1 package, ~6 call sites in the move hooks, 1 setting) | Low. iOS silent in Low Power Mode; Android quality varies by device; must never fire from a worklet — call on JS after the reducer commits | **DO NEXT** — but Karim's call (Open question 1) |
| D1.2 | **Native context menu on History rows** (`@expo/ui/swift-ui` `ContextMenu`, Jetpack `DropdownMenu`; or router `Link.Menu`, iOS-only) | Old (SDK 55-57) | Long-press a row -> Retry / Share (today both live in the preview sheet). iOS `ContextMenu.Preview` could show the deal thumbnail | Medium (a shortcut; the sheet already does the job) | S-M (one Host per row inside a `FlatList` — same Host-in-list pattern as the drawer rows, but 20+ rows; measure scroll perf) | Medium: Hosts inside a paginated `FlatList`; Android long-press vs row press gesture arbitration | LATER — try only if the sheet feels slow to reach |
| D1.3 | **Sounds** (`expo-audio`) | Old package; 58 additions irrelevant (lock-screen, WAV) | Card flip / place / win chime + mute setting | Medium at best (many players mute; brand is quiet) | M (asset design, preload, latency tuning on Android) | Android latency, APK size | LATER — product question first (Open question 2) |
| D1.4 | **Home-screen widget** (`expo-widgets`) | Package since SDK 55 (iOS); **Android widgets new in 58** (own Hermes runtime, Material colours), Live Activities `staleDate` | "Resume game / win rate / streak" widget with `widgetURL` into the deal | Medium only if a daily-deal/streak feature exists first (Soli has none) | L (extension targets, app group, isolated widget runtime with no hooks/imports, EAS config) | High for little benefit | LATER — only behind a daily-deal/streak feature |
| D1.5 | **Liquid Glass** (`expo-glass-effect` `GlassView`, Expo UI `glassEffect` modifier / `buttonStyle('glass')`, iOS 26+) | Package since SDK 54; 58 only flips `isLiquidGlassAvailable` with the iOS 27 SDK. Already in `node_modules` via expo-router | Glass undo/hint dock or header buttons floating over the felt | Low-Medium, iOS only | M | Glass over constantly moving cards = GPU cost + legibility; Android gets a plain fallback -> two designs | **GIMMICK** for now |
| D1.6 | `Stack.Toolbar` / native-stack header buttons & menus | Toolbar iOS since 55, Android 56; stable in 58 | Replace `HeaderMenuButton`/`HeaderTextButton` with `Stack.Toolbar.Button/Menu` | Medium | M | Soli's screens live in a Drawer; header toolbar placements need the native-stack composition context (A8) | DROP (A8) |
| D1.7 | `NativeTabs` (`expo-router/native-tabs`, stable path in 58.0.1) | Since SDK 54 as `unstable-`; stable in 58 | Replace the Drawer with system bottom tabs Play / History / Settings, iOS 26 `minimizeBehavior` | Discoverability up, but a tab bar steals board height on a portrait-only game; all tabs render eagerly | M | Full navigation redesign, re-approval of the board geometry | LATER / product call — recommendation: keep the drawer |
| D1.8 | `expo-store-review` | Old; 58.0.0 scene-lookup fix only | Automatic prompt after the Nth win | Low | S | Contradicts the recorded product decision in `AppDrawerContent.tsx:13-19` ("Soli should never nag"; store link instead of the quota-limited sheet) | **NO** |
| D1.9 | Expo UI `Chart` (SwiftUI only; exported but undocumented on the 58 page) | Old | Win-rate / time-per-game chart in History (iOS only) | Low-Medium | S-M | iOS-only, no Compose twin; "less supported" surface | LATER — only with a stats feature on both platforms |
| D1.10 | `expo-app-intents` (alpha) — Siri/Shortcuts/Spotlight "New game" | **New in 58** | Shortcut to a new deal | Low | M | Alpha | GIMMICK |
| D1.11 | `expo-keep-awake` (screen on during play, setting); `expo-symbols` `animationSpec` (pulsing hint glyph); RN 0.88 `fontVariationSettings` (collapse the 3 `CardTextAndroid` TTFs into one variable font) | Old / 0.88 | Small niceties | Low | S each | Battery (keep-awake); the card font contract is pixel-tested — do not touch for a package count | LATER (keep-awake maybe); NO for the font |

#### D2. Engineering / tooling

| # | Item | New in 58? | Soli relevance | Rec |
| --- | --- | --- | --- | --- |
| D2.1 | **Noxcturnal** Rust transformer (`experiments.noxcturnalTransformWorker`), ~2x cold bundle | New, experimental | Only engages with a plain `babel-preset-expo` config — true since the Tamagui removal. Verify that the preset-internal `@expo/ui/babel-plugin` (`Icon.select` rewrite) still applies, otherwise Android XML icons leak into iOS; dev-only win | **DO NEXT** as a 15-minute try (`yarn ios` timing before/after, check `Icon.select` on both platforms); revert on any oddity (A13) |
| D2.2 | Prebuilt `expo-modules-core` for Android (clean build 80 s -> 39 s upstream) | New | Already active in the regenerated project (SDK 58 plan C2) | Document in `docs/product/faster-builds/` only |
| D2.3 | **React Compiler** | Still `experiments.reactCompiler` (sub-agent could not confirm a default change in 58; `babel-preset-expo 58` gates it) | ~146 manual memo sites on the board; interplay with Reanimated worklets must be measured | LATER, measured (A11) |
| D2.4 | Expo Modules 2.0 beta (2.5-5.6x faster sync calls) | Beta in 58 | One `nativeSolve` per hint | NO for now (A12) |
| D2.5 | iOS 27 scene lifecycle + resizable windows (RN 0.88 default, Expo default in 58) | New | `useWindowDimensions` is used in Celebration/History; `useUndoScrubber.ts:180` seeds a shared value from `Dimensions.get('window')` once. iPad multitasking (`supportsTablet: true`) could already resize, so not new — but worth a one-time check that the board relayouts on a size change | Verify once on the iPad simulator (S) |
| D2.6 | Reanimated 4.7: new layout-animation engine default, CSS animations/transitions, `backgroundImage` in `useAnimatedStyle` | 4.7.0 | Soli uses no `entering`/`exiting`/`layout` props (grep confirms; the sub-agent's "5 files" claim was wrong). CSS keyframes could replace small hand-rolled loops (hint pulse) but buy nothing measurable | Nothing to verify; LATER at most |
| D2.7 | Gesture Handler 3 hooks API | 3.0 | `useUndoScrubber.ts` still on the (deprecated-but-present) builder API | LATER (A10) |
| D2.8 | RN 0.88 EventTarget-based event dispatch | New | Touch responder unchanged; smoke passed on both platforms | Done by the SDK 58 smoke |
| D2.9 | React 19.3 (`ViewTransition`, Fragment refs, `browser()`) | New | DOM-only; `useEffectEvent` (used in Soli) only got a memo/forwardRef fix | Nothing |
| D2.10 | `expo-background-task`, `expo-app-integrity`, DOM components, `expo-sharing` (files only; RN `Share.share` already does deal links in `history.tsx`), `expo-image`/`expo-blur`, `expo-updates`, `AppMetrics` -> `expo-observe` | Old / irrelevant | No backend, no remote assets, no analytics | NO |

Unverified by the sub-agent: the exact React Compiler default in SDK 58; GH 3.0 release notes
(page 404, builder-API facts come from the installed `index.ts` + upgrade guide); `ShareLink`,
`Chart`, `GlassEffectContainer`, `Stepper` exist in `@expo/ui/src/swift-ui` but are missing from the
58 docs page.

### E. Top 5 recommended next

Ordering rationale: three quick, risk-free hygiene wins first (they also shrink the uncommitted
diff's follow-up noise), then the one player-visible improvement with the best feel-per-LOC, then
the one experiment the Tamagui removal actually unblocked. Everything else in A-D is LATER or
DROP.

| # | Item | Why now | Effort | Plan? |
| --- | --- | --- | --- | --- |
| E1 | Dev-tool bumps: `oxlint` 1.73 -> 1.88, `@types/react-test-renderer` 19.1 -> 19.3; refresh the two stale "RN 0.86" comments in `scripts/build-rust-solver.sh` (B1, A22). `oxfmt` 0.54 -> 0.73 only after the current tree is committed (repo-wide reformat risk) | 10 minutes; keeps the toolchain current without touching Expo-managed packages | S | No (too small) |
| E2 | Vendor `menu_wght300.xml` next to the drawer glyphs and drop `@expo/material-symbols` (A21, B2) | Consistent icon weight with Karim's 300 decision; -1 dependency (7,698 XMLs); same `add-material-symbols` command already documented in `drawerIcons.ts` | S | No — but Karim must want the lighter hamburger (Open question 3) |
| E3 | Card-adjacent system-font text -> `CardTextAndroid` + decide `STACK_PADDING` 8 vs 7 (A17) | The last place where Android devices render Soli differently (system font); the font/glyph coverage check is the only unknown | S-M | Yes, small |
| E4 | **Haptics** behind a Settings switch (D1.1) | Highest player-perceived polish per line; SDK 58 made Android haptics usable; fits "best solitaire app" without ads or noise | S | Yes (call sites, intensities, setting default, device test matrix) — after Karim's yes |
| E5 | Noxcturnal + React Compiler as *measured* experiments (D2.1, A11), in that order | Both were blocked by the Tamagui Babel plugin until yesterday; Noxcturnal is a 15-minute dev-speed try; the compiler needs frame-time + RAM numbers on the 20-game playlist before any memo cleanup | S + M | Noxcturnal no; React Compiler yes (measurement protocol) |

Explicitly not in the top 5 and why: Expo UI `Button` in the History sheet (A18) is a fine
30-minute try but cosmetic; History context menu (D1.2) duplicates the sheet; widgets, Liquid
Glass, native tabs, sounds, app intents need a product reason first; `react-test-renderer`
migration (A9) and GH hooks (A10) have no user-visible effect and no warnings today.

## Open questions to the user

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | Haptics (E4): adopt, and default ON or OFF? | (a) Adopt, default ON with a Settings switch — pro: every player gets the feel, con: a few dislike vibration (switch covers it); (b) adopt, default OFF — pro: zero surprise, con: most never discover it; (c) don't adopt — pro: zero new dependency, con: the one cheap "premium feel" lever stays unused | (a); keep intensities light (`Light`/`Soft`), never on every frame of a drag, only on commit events |
| 2 | Sounds (D1.3): is audio part of Soli's brand at all? | (a) No sounds, ever — simplest; (b) later, with a mute default; (c) now | (a) or (b); not before haptics has shown whether "feel" feedback is wanted |
| 3 | Hamburger weight (E2): vendor Material `menu` at wght 300 to match the drawer glyphs, or keep the package's 400 that was chosen in the icon round? | (a) 300 vendored + drop the package; (b) keep 400 and the package | (a) — consistent with the drawer decision; a 2-screenshot before/after is enough to decide |
| 4 | React Compiler (E5): run the experiment now or wait for a render-performance problem? | (a) Measure now (half a day incl. playlist runs); (b) wait | (a) only if Karim wants the simplification (146 memo sites); otherwise (b) — there is no perf problem to solve today |
| 5 | Navigation: stay with the Drawer or move to `NativeTabs`? | (a) Drawer (today); (b) native bottom tabs | (a) — a portrait card game wants the full height; the drawer is already native-feeling (SF/Material icons) |

## Dependencies

No new dependencies for the DO NEXT items. Guides already present: `docs/external-package-guides/expo-ui.md`,
`expo-router.md`, `lucide-react-native.md`, `expo-material-symbols.md`, `oxlint.md`, `oxfmt.md`.

## Related tasks

- `docs/product/expo-rn-sdk-58-upgrade/upgrade-to-expo-sdk-58-and-react-native-0-88.md` — source of A1-A16.
- `docs/product/tamagui-3-upgrade/tamagui-major-upgrade.md` — source of A17-A20, Expo UI audit.
- `docs/product/animation-audit/app-wide-animation-audit-and-improvement-plan.md` — "React Compiler rollout after the architecture hotspots are reduced" (A11).
- `docs/product/undo-scrubber-hint/undo-scrubber-hint.md:145` — "No expo-haptics (deliberately — not a dependency today, don't add)".
- `docs/product/klondike-render-memoization/` — the manual memo boundaries the compiler would subsume.

## Simplification ideas

- C4: one config plugin instead of two duplicated bash Gradle patches.
- A21 + B2: vendor `menu_wght300.xml`, drop `@expo/material-symbols`.
- A9: three tests on `@testing-library/react-native`, two devDeps gone.
- A11: if the React Compiler experiment holds up on the playlist, delete the manual `memo`/`useMemo`
  boundaries that exist only for render skipping (keep the ones that pin identities for Reanimated).

## Steps to implement

Round 1 was a backlog document. Round 2 (2026-10-18, implementation sub-agent) executes the three
tooling items Karim picked; React Compiler / items 5-6 are a separate pass.

- [x] **S1 oxlint 1.73.0 -> 1.88.0** (E1). `package.json` bump + `yarn install` (1.88.0 is from
  10-13, clears `npmMinimalAgeGate: 1d`). Baseline on 1.73: 0 warnings. On 1.88: ~40 new warnings,
  all from the React Compiler diagnostics that oxlint 1.79.0 split out of the single
  `react/react-compiler` rule into per-category rules (`apps/oxlint/CHANGELOG.md` 1.79.0:
  "[BREAKING] Split react/react-compiler into per-category rules (#25500)", "Resolve inactive
  React compiler rules (#25830)"). Six rules fired: `react/immutability` (Reanimated
  `sharedValue.value = x`, `ref.current = fn` "latest-ref" pattern — 25 sites), `react/refs`
  (refs read inside gesture-builder callbacks the compiler cannot classify as handlers — 13),
  `react/set-state-in-effect` (4, all commented-as-deliberate derived-state invalidations),
  `react/exhaustive-effect-dependencies` (3 intentional extra deps such as `sliderMax` to
  re-measure), `react/capitalized-calls` (`Gesture.Tap()/Pan()/Exclusive()` — 3) and
  `react/globals` (test probe `hookResult = useX()` — 1). Every site reviewed: none is a bug, all
  are conscious RN/Reanimated/GH patterns -> configured off in `.oxlintrc.json` (JSONC comment
  explains why; oxlint parses comments fine). They are exactly the React Compiler's bail-out
  list, so the A11 experiment should re-enable them as a report. `lint:strict` simplified to
  `oxlint --deny-warnings ...` (config-driven; the old `-D correctness -D suspicious -A ...`
  form re-enabled every config-`off` rule and would have needed six more `-A` flags). Verified:
  `yarn lint` 0 warnings, `yarn lint:strict` exit 0, and the explicit-flag form with the six
  `-A`s gives the same result (plus it would re-enable `style-prop-object`, which the config
  turns off — the config-driven form is strictly the intended policy). Other 1.74-1.88 changes:
  per-rule fixes/suggestions, `typescript/no-generated-empty-object-type` (1.86),
  `react/only-export-components allowCompoundComponents` (1.86), LSP config errors (1.88); no
  config-format change. Trade-off of the simplification: strict coverage now follows the config
  categories — lowering a category there silently lowers strict too.
- [x] **S2 expo-doctor 20/20** (A15). `npx expo-doctor@latest` reported: "Check package.json for
  common issues — The following scripts in package.json conflict with the contents of
  node_modules/.bin: agent-device." Fix: script renamed `agent-device` -> `ad` (keeps
  `AGENT_DEVICE_IOS_RUNNER_IDLE_STOP_MS=0`, which agent-device 0.21.28 still honours —
  `dist/src/runner-retention.js` reads it, default 300000 ms, 0 disables). Every
  `yarn agent-device` reference became `yarn ad` (soli-testing SKILL.md, agent-device.md,
  appium.md, 5 plan docs under `docs/product/`; `.test-artifacts/` left alone — not tracked
  docs). expo-doctor now 20/20.
- [x] **S3 agent-device 0.19.3 -> 0.21.28** (A14): bump + install done; change summary in
  "Intermediary learnings"; recipe verification in "Testing".
- [x] **S4 device verification** — Android phone (A065) then iOS simulator, both with the already
  installed builds (no rebuild); see Testing. SKILL.md §5/§6/§8 updated.
- [x] **S5 gates** `yarn typecheck` clean, `yarn lint` 0 warnings, `yarn lint:strict` exit 0,
  `yarn jest --runInBand` 45 suites / 458 tests green, `oxfmt --check package.json` clean
  (`.oxlintrc.json` is outside the format glob — and must stay so, oxfmt would strip its JSONC
  comment). oxfmt itself NOT bumped (Karim commits first).

Round 3 (2026-10-18, implementation sub-agent — code only; the compiler flag stays OFF until S11):

- [x] **S6 C5 `runOnJS` → `scheduleOnRN`, `runOnUI` → `scheduleOnUI`** (plan table rows 1-9).
  6 `runOnJS(fn)(args)` → `scheduleOnRN(fn, args)` (`CelebrationOverlayLayer.tsx` 1,
  `useUndoScrubber.ts` 4, `useCelebrationController.ts` 1) and 3 `runOnUI(w)()` →
  `scheduleOnUI(w)` (`useCelebrationController.ts`). Imports from `react-native-worklets`
  (direct dep 0.13.0; Reanimated 4.7.1 does not re-export the new names). Verified in
  `react-native-worklets/src/threads.native.ts`: `runOnJS(f)` is `(...a) => scheduleOnRN(f, ...a)`
  and `runOnUI(w)` is `(...a) => scheduleOnUI(w, ...a)` — zero behaviour change. GH's own
  `Gesture.Tap().runOnJS(true)` is untouched (a Gesture Handler flag, not the worklets helper).
- [x] **S7 compiler-readiness fixes.** 39 shared-value writes `.value = x` → `.set(x)`:
  `useUndoScrubber.ts` 21, `useCelebrationController.ts` 11, `animations.ts` 6,
  `UndoScrubber.tsx` 1. `.set()` is `.value =` underneath on both runtimes
  (`mutables.native.ts`; the only extra branch is an updater-function call, guarded by
  `__isAnimationDefinition`, so `.set(withTiming(...))`/`.set(withSequence(...))` behave as
  before). 0 `.get()` conversions were needed: none of the four files reads a shared value on
  the JS thread; reads inside worklets keep `.value` (the compiler only models stores and
  `.get()` is a plain wrapper — a code comment in each file records this policy). 7
  `useRef(new NativeAnimated.Value(x)).current` → RN `useAnimatedValue(x)` (`AbsoluteCardLayer`
  4, `CardVisual` 2, `TopRow` 1; same lazy ref underneath, typed in RN 0.88 `types_generated`).
  The two `// eslint-disable-next-line react-hooks/exhaustive-deps` comments in
  `CelebrationOverlayLayer.tsx` were NOT dead: oxlint honours `eslint-disable` directives, so
  deleting them surfaced 4 warnings (`react-hooks/exhaustive-deps` ×2, `react/memo-dependencies`
  ×2) and the compiler then reported `PreserveManualMemo` (incomplete deps) instead of
  `Suppression`. Fixed for real and behaviour-neutrally: `cellOrigin` wrapped in
  `useCallback([cellWidth, cellHeight])`, and `faceWidth/faceHeight/shadowMargin/cardScale/
  cellOrigin` added to the texture memo deps — every one is a pure derivation of `metrics` + `pd`
  (already deps), so the texture is still rebuilt only on card list / metrics / fonts.
- [x] **S8 coverage re-run** with the research agent's `scratchpad/rc/compile-report2.js` (installed
  `babel-plugin-react-compiler 1.0.0`, `target 19`, `panicThreshold none`, `infer`):
  **70 compiled / 13 skipped → 75 compiled / 8 skipped.** Remaining skips: see "React Compiler
  deep dive → Status after round 3".
- [x] **S9 Appium removal.** Deleted `scripts/ios-scrub.js` (291 LOC) and
  `docs/external-package-guides/appium.md` (297 LOC). No package.json script or devDependency
  referenced them (Appium was a global tool). Updated: `.agents/skills/soli-testing/SKILL.md`
  (§6 wording, §9 XCTest handoff note, §10 reading list), `agent-device.md` (0.20 pan note),
  `scrubber-test-automation.md` (retirement banner; its Appium sections stay as history).
  Historical mentions in other plan docs (`tamagui-major-upgrade.md`, `scoring.md`,
  `klondike-card-accessibility.md`, `expo-rn-sdk-58-upgrade`, `agent-testing-skill.md`,
  `docs/delivery/20/20-6.md`) are test-log history and were left alone on purpose.
- [x] **S10 gates.** `yarn typecheck` clean, `yarn lint` 0 warnings, `yarn lint:strict` exit 0,
  `yarn jest --runInBand` 45 suites / 458 tests green. oxfmt: the 6 other touched files are
  clean; `CelebrationOverlayLayer.tsx` and `useCelebrationController.ts` have PRE-EXISTING
  oxfmt 0.54 wishes (same hunks at HEAD, none on the edited lines) — not reformatted, to keep
  the diff to the change (B1: `yarn format` in its own commit after the oxfmt bump).
- [x] **S11 measured compiler experiment** (testing agent, 2026-10-18 22:47-23:35): baseline →
  flip → compare, per "Compiler experiment test plan" below. Result: no regression (janky
  9.12 → 8.14 %, p50-p99 identical, PSS within noise, playlist −1.9 %), smoke identical on
  Android + iOS, 0 crashes → **flag left ON**. Numbers + flip proof in "S11 results" under Testing.

Round 4 (2026-10-19, implementation sub-agent — option D; details in "Option D: manual
memo removal (prompt 3)"):

- [x] **S12 research + removal rules** (react.dev: compiler intro FAQ, `useMemo`/`memo`
  reference notes, debugging guide, `preserve-manual-memoization` lint reference) → rules
  table in the option D section.
- [x] **S13 inventory** of all 170 sites with enclosing function, compiled/skipped status
  and decision (`scratchpad/rc/inventory.js`; table in the option D section, pre-change
  line numbers).
- [x] **S14 removal** via a splice codemod (`rc/codemod.js`: `useCallback(fn, deps)` → `fn`,
  `useMemo(() => e, deps)` → `e`, `React.memo(fn)` → `fn`, generic type params → variable
  annotations) + 6 multi-statement `useMemo`s rewritten by hand (`boardAvailableWidth`,
  `listHeader`, `atlasSize`, `drawOrder`, `avalancheLaunch` → `computeAvalancheLaunch`
  helper, `useAnimationToggles`), unused imports and 9 `displayName` lines dropped, comments
  updated, KEEP reasons commented at every kept site inside compiled code.
- [x] **S15 verification**: per-file before/after compile (`rc/memo-map.js` = value → cache
  guard; `rc/compile-file.js --events` = slots / pruned blocks / skips) → 3 reverts
  (`useSolvableDealSelector`, `AbsoluteCardLayer.items`, hook order in `CelebrationAtlas`)
  and 21 lint-driven re-wraps; coverage 75 / 8 unchanged; gates green; LOC −124.
- [x] **S16 device pass** (testing agent, 2026-10-19 07:17-07:55) per "Option D test plan"
  under Testing — Android 20-game playlist ×2 vs the S11 config B numbers (all within
  tolerance, PSS post even −16 MiB), 60 s idle = 60 frames, smoke on both platforms
  identical to config B, 0 crashes → **option D kept, no memo restored.** Numbers + smoke
  log in "S16 results".

## Files actually modified

- `docs/product/next-steps-after-sdk-58/next-steps-after-sdk-58.md` (this file).
- Round 2: `package.json` (oxlint 1.88.0, agent-device 0.21.28, `lint:strict` config-driven,
  script `agent-device` → `ad`), `yarn.lock`, `.oxlintrc.json` (six React Compiler rules off +
  JSONC comment), `.agents/skills/soli-testing/SKILL.md`, `docs/external-package-guides/oxlint.md`,
  `agent-device.md`, `appium.md` (legacy note), `yarn agent-device` → `yarn ad` in
  `docs/product/{store-screenshots,tamagui-3-upgrade,celebration-skia-atlas,expo-rn-sdk-58-upgrade,agent-testing-skill}/*.md`.
  Evidence screenshots: `.test-artifacts/agent-device-upgrade/`.
- Round 3 (code): `src/features/klondike/hooks/useUndoScrubber.ts`,
  `src/features/klondike/hooks/useCelebrationController.ts`,
  `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx`,
  `src/features/klondike/components/cards/animations.ts`,
  `src/features/klondike/components/UndoScrubber.tsx`,
  `src/features/klondike/components/cards/AbsoluteCardLayer.tsx`,
  `src/features/klondike/components/cards/CardVisual.tsx`,
  `src/features/klondike/components/cards/TopRow.tsx`. Deleted: `scripts/ios-scrub.js`,
  `docs/external-package-guides/appium.md`. Docs: `.agents/skills/soli-testing/SKILL.md`,
  `docs/external-package-guides/agent-device.md`,
  `docs/product/scrubber-test-automation/scrubber-test-automation.md`, this file. NOT touched:
  `babel.config.js`, `package.json`, `.oxlintrc.json`.
- S11 (testing agent): `app.json` (`"reactCompiler": true` added — the only source/config change),
  this file, `.agents/skills/soli-testing/SKILL.md` (§2 preflight-kill note, §8 two rows),
  `docs/external-package-guides/react-native-reanimated.md` and `expo.md` (dated compiler note +
  rollback). Raw measurement outputs: session scratchpad `rc/ab/` (not in the repo).
- Round 4 (option D, code): `src/features/klondike/hooks/useKlondikeGame.ts` (23 of 33 memos
  removed), `src/state/settings.tsx` (14), `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx`
  (9 + `useSafeAreaInsets` hoisted + `computeAvalancheLaunch` helper),
  `app/(tabs)/history.tsx` (6), `app/(tabs)/index.tsx` (5), `src/features/klondike/hooks/useUndoHint.ts`
  (7), `src/features/klondike/components/UndoScrubber.tsx` (3), `AbsoluteCardLayer.tsx` (3),
  `TopRow.tsx` (3), `TableauSection.tsx` (2), `HintOverlayLayer.tsx` (2),
  `useKlondikeTimer.ts` (3), `GameNoticeBubble.tsx`, `UndoHintBubble.tsx`,
  `CelebrationDebugBadge.tsx`, `BoardPreview.tsx`, `src/navigation/useDrawerOpener.ts`,
  `app/(tabs)/settings.tsx` (1 each). Comment-only: `useDemoGameLauncher.ts` (all 9 kept,
  file-top note), `useSolvableDealSelector.ts` (kept, note). Plan: this file. NOT touched:
  `app.json`, `babel.config.js`, `.oxlintrc.json`, the 8 skipped functions' files beyond the
  above (`useHint.ts`, `useKlondikeHistoryEntry.ts`, `useKlondikePersistence.ts`,
  `useCelebrationController.ts`, `useUndoScrubber.ts`, `src/state/history.tsx` unchanged).
  Scratch tooling (not in the repo): `scratchpad/rc/{inventory,codemod,repair,rewrap,memo-map,compile-file}.js`.

## Intermediary learnings

Round 2 (tooling bumps):

- oxlint 1.79.0 split `react/react-compiler` into per-category rules that live in the default
  `correctness`/`suspicious` categories; a bump therefore surfaces React Compiler diagnostics as
  lint warnings. Soli's 40 hits are all intentional patterns (details in S1) and are exactly the
  sites the compiler would bail on — a free input for the A11 experiment.
- CLI category flags (`-D correctness`) re-enable rules the config sets `off`; that is why the
  old `lint:strict` carried `-A react-in-jsx-scope -A no-unassigned-import`. Config-driven
  `--deny-warnings` is the simpler equivalent.
- `.oxlintrc.json` accepts JSONC comments (1.88.0 verified); keep it out of the oxfmt glob.
- expo-doctor's "scripts conflict with node_modules/.bin" check: any package script named like a
  dependency binary fails it, so the idle-stop wrapper script had to be renamed (`ad`).
- agent-device 0.21.28 still reads `AGENT_DEVICE_IOS_RUNNER_IDLE_STOP_MS`
  (`dist/src/runner-retention.js`, default 5 min, 0 = never). It reaches the daemon only when our
  CLI spawns it; one daemon per machine (`~/.agent-device`), and a CLI of another version replaces
  it. The invent repo pins `^0.19.3` → cross-repo hazard until invent is bumped too (0.21.x
  clients refuse to replace a newer daemon, 0.19.3 clients do not).
- agent-device changes that matter for the skill (full list in `agent-device.md`): gestures
  redesigned in 0.20.0 (`gesture pan x y dx dy ms` is the timed form; timed `swipe`/`fling`
  removed; viewport-validated trajectories), **iOS pans now activate the RNGH scrubber** (Appium
  route obsolete), refs expire after every mutation, ambiguous selectors refused, extra positionals
  = `INVALID_ARGS`, `--settle` diffs (useless on the ticking board), `open --foreground`,
  explicit "system surface covers the app" diagnosis, `AMBIGUOUS_MATCH` when the phone has two
  adb entries (`--serial` mandatory, `ANDROID_SERIAL` ignored by agent-device), stale runner
  leases reclaimed automatically, daemon idle self-exit. Breaking changes are SDK/batch/perf/replay
  only — none hits the CLI recipes.
- Scrubber landing rule (`createScrubOrigin`): finger-start-to-track-left-edge ↔ all remaining
  undos, start-to-right-edge ↔ all redos. That is why +130 pt from index 20 lands on 80, not 40.
- The Mac's only testing simulator is now `iPhone 17 Pro` on **iOS 27.0** (no 26.5 runtime
  listed any more); the SpringBoard-teardown crash workaround is kept because it is free.
- Phone re-locks after 60 s: use `android-ready.sh --keep-awake` for any session longer than a
  couple of commands (restore command printed; restored at the end of this run).
- zsh gotcha bit this run too: `for spec in "298 788 -130 0 1500"; yarn ad gesture pan $spec`
  passes ONE argument. Spell arguments out (already in SKILL.md §8).

Round 3 (C5 + compiler readiness):

- **oxlint honours `eslint-disable` comments.** The deep dive called the two
  `eslint-disable-next-line react-hooks/exhaustive-deps` comments "dead since the move to oxlint";
  they were live suppressions of 4 warnings. Lesson: removing a suppression needs a lint run, and
  the compiler's `PreserveManualMemo` diagnostic is the precise reading of what such a comment
  hides (a memo whose deps are incomplete).
- **Compiler validation is staged per function**: once the Immutability errors were gone,
  `useUndoScrubber` (9 sites) and `useCelebrationController` (5 sites) surfaced Refs errors that
  the first run never reached. The same effect raised the oxlint React Compiler rule-group count
  from 40 to 49 (`react/immutability` 25 → 11, `react/refs` 13 → 24, `set-state-in-effect` 4 → 6,
  `exhaustive-effect-dependencies` 3 → 4) — more functions are validated further, not more
  problems. The six rules therefore stay `off` in `.oxlintrc.json`.
- **`.set()` ≡ `.value =`** on the RN and UI runtimes (`react-native-reanimated/src/mutables.native.ts`,
  `mutables.ts`): the only difference is an updater branch for plain functions, guarded by
  `__isAnimationDefinition`, so animation definitions pass through. Reanimated's docs call
  `get`/`set` the compiler-compliant API and show `.get()` inside `useAnimatedStyle` too, but the
  compiler only models stores — worklet reads were left on `.value` (hot pan path, no wrapper call).
- `scheduleOnRN`/`scheduleOnUI` live in `react-native-worklets` only; Reanimated 4.7.1 re-exports
  just the deprecated names. `runOnJS`/`runOnUI` are literal one-line wrappers (verified).
- RN's `useAnimatedValue` is typed in `react-native/types_generated` (the RN 0.88 strict types) and
  is the same lazy-ref implementation as the old idiom.
- `yarn oxfmt …` does not work under Yarn Berry (prints the yarn usage); call
  `./node_modules/.bin/oxfmt` directly.
- Process slip: `git rm --cached` was used to delete the two Appium files, which staged the
  deletions; reverted immediately with `git reset -- <files>` so the tree is uniformly unstaged
  (AGENTS.md: never stage/unstage). Plain `rm` is the right tool for deletions.

S11 (compiler A/B, testing agent):

- **Hermes bytecode defeats string-count markers.** `android/app/build/generated/assets/react/release/index.android.bundle`
  is HBC (`c6 1f bc 03`); its string table stores each literal once, so
  `react.memo_cache_sentinel` counts 1 in both configs and `react/compiler-runtime` 0 (Metro
  replaced the module path by a numeric id). Proof that works: `expo export:embed --platform
  android --dev false --minify false --entry-file node_modules/expo-router/entry.js
  --bundle-output <file> --assets-dest <dir>` (same CLI/flag path as the Gradle task) and count
  `react.memo_cache_sentinel` / `CompilerRuntime` in the JS. One minute per config.
- **`app.json` is not an input of `:app:createBundleReleaseJsAndAssets`.** After the flip the
  Gradle task was `UP-TO-DATE` and the APK shipped the old bundle (mtime unchanged). Any
  app.json / babel.config.js-only change needs `rm -rf android/app/build/generated/assets/react/release`
  (plus the `intermediates/assets/release/mergeReleaseAssets` copy) before `yarn release`. iOS
  is unaffected: the Xcode script phase re-bundles on every `yarn ios`.
- `yarn release` / `yarn ios` preflight-kill EVERY `xcodebuild`, `expo run:` and Gradle client on
  the Mac — this run killed a stale `expo run:android --device Pixel_9_API_36` + gradlew from the
  **invent** repo (23:02) and would also kill agent-device's retained iOS XCTest runner. Close iOS
  agent-device sessions before an Android build, and expect that message in the build log.
- The playlist's per-game lines are `[DemoPlaylist] Game N/20 loaded/completed`; `[Demo] Game
  loaded` appears once (first game). Wall time = first `[Demo] Game loaded` → `[DemoPlaylist]
  Playlist completed (games=20)`.
- `I/AndroidRuntime(<pid>): VM exiting with result code 0, cleanup skipped.` appears once per
  deep-link delivery (the `am start` shell VM exiting) — it matches the `AndroidRuntime` crash
  grep but is not Soli's pid; always attribute pids before counting.
- agent-device selector values with spaces need inner quotes: `press 'label="Waste, King of
  spades"'` (unquoted → `INVALID_ARGS`). Tapping a waste card that has a legal foundation move
  auto-plays it (tap-to-move), so the near-win's last move is a single tap.
- Foundation glow oracle: `adb shell input tap` then an immediate `exec-out screencap`; crop the
  slot (`crop=200:260:<x>:<y>`) and read `signalstats` YAVG — the halo lifts it by ~4 (spades
  slot 165.3 → 169.6). Good enough to assert the pulse without video.
- Interesting side observation (not a metric): "Janky frames (legacy)" rose 32 → 36 % while the
  deadline-based janky % fell 9.1 → 8.1 % and the percentiles stayed identical — the compiled
  tree seems to shift a few frames across the 16 ms line without missing deadlines.

- `expo-router 58` now depends on `expo-glass-effect` directly (`node_modules/expo-router/package.json`),
  used by its native-stack header (`useHeaderConfigProps.js`); Soli's Drawer headers do not go
  through that path.
- `babel-preset-expo 58` lists `expo-widgets ^58.0.20` as a peer (optional) — widgets are compiled
  through the preset.
- RN 0.88 still pins NDK `27.1.12297006` and expo-modules-core defaults `minSdkVersion 24`
  (`ExpoModulesCorePlugin.gradle:68`); the Rust solver script's values are right, its comments cite
  RN 0.86.
- `@expo/material-symbols` ships only weight 400; Karim's drawer decision is weight 300, vendored.

Round 4 (option D):

- **The compiler already drops manual `useMemo`s whose result is a primitive used only in
  expressions.** `boardAvailableWidth` and `boardRowSettled` (`historyEntries.find(...)`)
  were recomputed on every render in the compiled output *before* option D — the compiler
  memoizes for identity, not for CPU, and a primitive that never reaches JSX/hooks/returns
  does not escape. Removing those `useMemo`s changed nothing in the bundle.
- **A `use*` function is only compiled in `infer` mode if it calls a hook.** Removing the
  only hook call (`useCallback`) from `useSolvableDealSelector` silently un-compiled it
  (coverage 75 → 74, no "skip" event) — the hook returned a fresh function per render and
  would have cascaded through `createFreshGameState → dealNewGame → requestNewGame`. Caught
  by the coverage count, reverted. Lesson: the per-function coverage number is a required
  gate for every memo removal, not just the skip list.
- **A hook call inside a compiler scope prunes that scope.** In `CelebrationAtlas` the
  `.sort(comparator)` closures capture `assignments`, which the compiler treats as a
  possible mutation, so `assignments…sprites…avalancheLaunch` became one scope — and with
  `useSafeAreaInsets()` sitting inside it the whole block was pruned (`prunedMemoValues`
  1 → 11, everything recomputed per render). Hoisting the hook call above the derived data
  fixed it (0 pruned, better than before). Lesson: keep hook calls at the top of a
  component; `compile-file.js --events` shows `prunedMemoValues` per function.
- **Scope merging is real but was harmless here.** The same `CelebrationAtlas` block is now
  guarded by 15 deps (incl. `windowOffset`, `state.modeId`) instead of per-value deps; every
  extra trigger already re-registered the mapper worklets through their `board`/`modeId`
  captures, so no observable change. In `AbsoluteCardLayer`, `items` merged into the
  `items.map` JSX scope (deps incl. `invalidWiggle`, `animationResetKey`, handlers) — there
  the manual `useMemo` was restored because wiggles/new deals would rebuild 52 items.
  `BoardPreview.metrics` merged into the column map (static sheet, accepted).
- **`react-hooks/exhaustive-deps` cannot see compiler memoization.** oxlint flags a plain
  function declared in the component body as "changes every render" when it is a `useEffect`
  dep — and, unlike upstream ESLint, also when it is a `useCallback` dep — so the
  requirement cascades down the dependency chain (10 of `useKlondikeGame`'s 33, all 9 of
  `useDemoGameLauncher`'s). This matches react.dev's one named reason to keep
  `useCallback` ("a memoized value is used as an effect dependency"), so those stay.
- **Codemod gotcha**: textual splicing of nested edits (a `React.memo(` wrapper around inner
  `useCallback`s) must be applied inner-first in separate passes — one pass with
  pre-computed offsets swallowed text after the outer call (repaired from HEAD +
  `rc/repair.js`; `git diff` + typecheck confirmed the three files). Plain `rm`/`git show
  HEAD:path > path` were the only git interactions (no index changes).
- The inventory regex (`\b(useCallback|useMemo)(<[^(]*>)?\(`) finds 170 sites; the deep
  dive's 162 missed `useCallback<RequestNewGameFn>(`-style generic calls (7) and the
  `useFocusEffect(useCallback(…))` nesting.

- S16 (2026-10-19, testing agent): (a) The S11 result table had the two B runs' PSS fresh
  values swapped between rows (raw kB: run 1 157,990 = 154.3 MiB, run 2 159,604 = 155.9 MiB);
  the mean 155.1 MiB is right, and the S16 table uses the raw-kB order. (b) Option D's PSS
  post-run came out 16 MiB BELOW config B in both runs (312.2 / 316.5 vs 329.9 / 331.7 MiB)
  while fresh PSS is unchanged — plausible (86 fewer deps arrays + closures captured per
  render tree across 20 games) but the phone was on battery this time, so it is recorded as
  "not a regression", not as a win. (c) The idle-board oracle is the frame COUNT (1 per
  tick): a lost `React.memo` would not change that count (one commit per tick either way),
  it would change frame duration / playlist jank — which is why the playlist numbers remain
  the primary gate and the idle count is only the "no storm" sanity check. (d) Testing-recipe
  learnings (Compose switches without a11y labels → knob coordinate taps; iOS picker menu
  cells colliding with the button label → `[cell]` refs; iOS UISwitch toggles only when the
  knob is tapped; History Retry skips its prompt on a 0-move game) went into SKILL.md §5/§8.

## Identified issues

- None new; see A20 for the pre-existing dev Demo sheet layout bug on Android.
- S16: none in the app. The Android dev Demo sheet still hides the "Undo hint" row below
  the detent fold (A20, pre-existing) — `?reset=undoHint` is the working route.
- Round 2: cross-repo agent-device version split (soli 0.21.28 vs invent ^0.19.3) — see learnings;
  resolve by bumping invent. SKILL.md still cites the iOS 26.5 sim in one troubleshooting row
  (devicectl install quirk) — left as history, the row's advice (install by hand) still holds.
- Round 3: none blocking. (a) The oxlint React Compiler rule group is at 49 hits (up from 40, see
  learnings) — not re-enabled. (b) `CelebrationOverlayLayer.tsx` / `useCelebrationController.ts`
  carry pre-existing oxfmt 0.54 formatting wishes (also at HEAD); left for the post-commit
  `yarn format`. (c) `AbsoluteLayerCard`, `useUndoScrubber`, `useCelebrationController` remain
  compiler-skipped on deliberate render-time ref reads/writes (Fabric pressability guard,
  latest-value refs, `celebrationQueuedThisRender`) — converting them is NOT behaviour-neutral
  (effect-time vs render-time) and is left for option D / D1.
- S11: none in the app. Process: (a) the Soli Android build preflight killed a foreign (invent)
  `expo run:android` + gradlew at 23:02 — if that was a live invent build, it needs a rerun;
  (b) the plan's flip-proof grep was unusable (Hermes bytecode) and the first B build shipped the
  old bundle (Gradle UP-TO-DATE) — both fixed in SKILL.md §8 so no future agent measures a
  stale bundle; (c) `useKlondikeHistoryEntry` etc. remain compiler-skipped (unchanged list).
- Round 4 (option D): none open in the code. (a) `CelebrationOverlayLayer.tsx` is now fully
  oxfmt-formatted (it was touched, so the pre-existing 0.54 wishes went with it — the only
  deviation from "format only your lines"; `useCelebrationController.ts` still carries its
  pre-existing wishes). (b) The 21 lint-kept `useCallback`s are redundant with the compiler
  but required by `react-hooks/exhaustive-deps`; removing them means either turning that
  rule off (loses the missing-deps check) or waiting for a compiler-aware lint — LATER.
  (c) Device-verified in S16 (2026-10-19): no regression, option D kept.

## Testing

Round 2 device verification (2026-10-18, agent-device 0.21.28, installed builds 1.1.0, no
rebuild):

| Recipe | Android A065 (`--platform android --serial 192.168.1.12:5555`) | iOS iPhone 17 Pro (iOS 27.0) |
| --- | --- | --- |
| `open ch.karimattia.soli --foreground` | OK (first try showed the keyguard tree + the new "system surface covers the app" hint; `android-ready.sh --keep-awake` fixed it) | OK, 9 s incl. "Building Apple runner" (cached) |
| `snapshot -i` a11y tree | 51 nodes, all catalog labels (`Stock, 23 cards`, `Waste, …`, `Hearts foundation, empty`, `Undo`, `Hint`, `Start a new game`) | 71 nodes, labels + testIDs (`stock`, `undo`, `stat-moves`, `foundation-slot-*`) |
| tap a control | `press @e67` (Stock) → waste changed; `--settle` timed out after 10 s (timer) | `press 'id=stock'` → `Stock, 9 cards`, `Waste, Two of hearts` |
| deep link `yarn scrubtest` (cold) | delivered, fixture exact (`Moves, 80`, `Stock, 10 cards`, `Waste, Six of hearts`) | `yarn scrubtest --ios` delivered, fixture exact |
| `screenshot` | 1080x2412 in ~2 s | 402x874 @1x |
| scrubber pan | `gesture pan 801 2150 -339 0 1500` → index 20 EXACT (`Stock, 7`, `Waste, Two of spades`, raw label `Undo scrubber, position 20 of 80`); no crash tokens in logcat | `gesture pan 298 788 -130 0 1500` → 20 EXACT (twice), `+100` → 80 EXACT, `-290` → 0 EXACT; pan from the button edge (x 395) no-ops; `+130` from x 210 lands 80 (mapping, not a bug) |
| `close` / sessions | closed, `session list` empty | normal close, runner retained (2 runner processes alive), no SpringBoard crash report |

Restored: phone screen timeout 60000 ms, `/tmp/android-device.lock` removed, no settings changed
(phone keeps the scrubbed demo game + developer mode on — accepted side effect).

Gates after all changes: typecheck clean, lint 0 warnings, lint:strict exit 0, jest 458/458. Gates to run after any DO NEXT item: `yarn typecheck && yarn lint && yarn jest`,
plus the device smoke described in the item's own plan.

### Compiler experiment test plan (S11 — for the testing agent)

Read `.agents/skills/soli-testing/SKILL.md` first (Android phone A065 = Karim's main phone:
data guardrail, `/tmp/android-device.lock`, `scripts/android-ready.sh --keep-awake`, `--serial`
mandatory). One build at a time, one agent on the phone. iOS simulator = correctness only.

**Configurations.** A = baseline: the current tree (C5 + `.set()` + `useAnimatedValue` already
in, compiler OFF). B = flipped: the ONE-line change in `app.json` (lines 94-96 today):

```json
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
```

Rollback = delete the `"reactCompiler": true` line and rebuild; no source file is touched by the
flip. Run A completely (build once, ≥2 measurement runs), then B (build once, ≥2 runs). Add a
third run to a configuration when its two runs differ by more than the pass tolerance below.
Jest/typecheck/lint are unaffected by the flag by design (Jest never sets
`supportsReactCompiler`) — run them once after the flip anyway.

**Build + prove the flip took.** `yarn release` (Release APK, Metro bundle inside). For B, verify
the bundle was compiled before measuring: `grep -c "react/compiler-runtime"
android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle` must be
> 0 (A: 0). If the path differs, `find android/app/build -name 'index.android.bundle'`. If the
count is 0 in B, the flag did not reach `babel-preset-expo` — stop and report.

**One measurement run** (same order for A and B; `SERIAL=192.168.1.12:5555` or whatever
`android-ready.sh` prints):

- [ ] 1. Cold start on a fresh deal: `adb -s $SERIAL shell am force-stop ch.karimattia.soli`,
  then `yarn deeplink 'soli:///' --cold` (or tap the icon). Wait ~10 s on the board.
- [ ] 2. **PSS fresh**: `adb -s $SERIAL shell dumpsys meminfo ch.karimattia.soli | grep -E
  "TOTAL PSS|TOTAL RSS"` → record TOTAL PSS (kB). Optional cross-check with the SDK 58 method:
  `yarn ad perf memory sample --json --platform android --serial $SERIAL` (baseline 155.0 MiB).
- [ ] 3. **Reset frame stats**: `adb -s $SERIAL shell dumpsys gfxinfo ch.karimattia.soli reset`.
- [ ] 4. **20-game playlist**: start `adb -s $SERIAL logcat -v time | grep -E "SoliDev|Demo|FATAL|
  AndroidRuntime|Reanimated|Worklets|mismatch"` in the background, then
  `yarn deeplink 'soli:///?demo=playlist&games=20'`. Wall time = logcat timestamp of the first
  `[Demo] Game loaded` to the playlist-complete line (grep `useDemoGameLauncher.ts` for the exact
  completion log string before the first run). Alternative for the first run per configuration:
  `yarn release --auto-solve` builds + runs the playlist with a pass/fail exit (SDK 58 baseline
  3 m 20-21 s). Record: games completed (expect 20/20), wall time, crash tokens (expect 0).
- [ ] 5. **Frame pacing** right after the playlist: `adb -s $SERIAL shell dumpsys gfxinfo
  ch.karimattia.soli` → record Total frames rendered, Janky frames (count + %), 50th / 90th /
  95th / 99th percentile ms. (`gfxinfo` counts the whole process since the reset — do not touch
  the phone during the playlist.)
- [ ] 6. **PSS post-run**: step 2's `dumpsys meminfo` again (SDK 58 baseline post-20 330.6 MiB,
  post-GC 273.9 MiB via agent-device). Optional: `yarn ad perf memory sample --json` for parity.
- [ ] 7. **Scrubber**: `yarn scrubtest` (cold; fixture index 40 of 80: `Moves, 80`,
  `Stock, 10 cards`, `Waste, Six of hearts`). `yarn ad snapshot -i --json` for the Undo center,
  then `yarn ad gesture pan <undoX> <undoY> -339 0 1500 --platform android --serial $SERIAL` →
  expect index 20 (`Stock, 7 cards`, `Waste, Two of spades`; `--raw` label
  `Undo scrubber, position 20 of 80`). Then a right pan (full redo → 80) and one tap on Undo →
  79. Landing within ±1 passes. This exercises every C5 line in `useUndoScrubber.ts`
  (`scheduleOnRN` begin/update/finish) and the `.set()` writes.
- [ ] 8. **Celebration**: `yarn nearwin` (left=1) → make the last move → real win → overlay plays
  → the 30 s dialog or Karim's dismiss; logcat shows `[Celebration] start` and the completion path
  (`handleRunFinished` → win dialog) — this is the `scheduleOnUI`/`scheduleOnRN` path in
  `useCelebrationController.ts` and the `onOverlayReady` signal in `CelebrationOverlayLayer.tsx`.
  Also `yarn celebration` (preview) once: overlay appears without a board flash. Crash tokens 0.
- [ ] 9. **Glow + hint**: on a fresh deal move an Ace to a foundation → the foundation glow pulse
  plays (`useFoundationGlowAnimation` is newly compiled in B); tap Hint → ring/pulse visible.
- [ ] 10. iOS (B only, after A/B on Android): `yarn ios`, `yarn scrubtest --ios`,
  `yarn ad gesture pan 298 788 -130 0 1500` → 20; `yarn nearwin --ios` → win → celebration. No
  numbers, correctness only.

**Record** per run in a table here: config, run #, games, wall time, total frames, janky %, p50 /
p90 / p95 / p99, PSS fresh / post-run, scrubber landing, celebration OK, crash tokens, APK/bundle
compiled marker.

#### S11 results (testing agent, 2026-10-18 22:47-… , phone A065 Android 16, charging, battery 76 %, thermal status 0, auto-brightness, no battery saver, light mode; raw outputs in the session scratchpad `rc/ab/`)

Measurement runs (script `rc/ab/measure.sh`: force-stop → `soli:///` cold → 12 s → `dumpsys meminfo` →
`gfxinfo reset` → `?demo=playlist&games=20` → wait for `[DemoPlaylist] Playlist completed` →
`gfxinfo` → `meminfo`; wall time = logcat `[Demo] Game loaded` → `Playlist completed (games=20)`):

| Config | Run | Games | Wall time | Frames | Janky | p50 / p90 / p95 / p99 | PSS fresh / post (MiB) | Crash tokens | Bundle marker |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A (off) | 1 | 20/20 | 193.3 s | 20059 | 1792 (8.93 %) | 10 / 15 / 17 / 21 ms | 152.2 / 319.4 | 0 (1 benign `VM exiting with result code 0` from the `am start` shell pid, not Soli's) | `react/compiler-runtime` ×0 |
| A (off) | 2 | 20/20 | 193.7 s | 20027 | 1865 (9.31 %) | 10 / 15 / 17 / 22 ms | 153.4 / 331.0 | 0 (same benign line) | ×0 |
| B (on) | 1 | 20/20 | 190.5 s | 20113 | 1644 (8.17 %) | 10 / 15 / 17 / 21 ms | 155.9 / 331.7 | 0 (same benign line) | sentinel ×86 / `CompilerRuntime` ×117 in the JS export |
| B (on) | 2 | 20/20 | 189.3 s | 19951 | 1619 (8.11 %) | 10 / 15 / 17 / 21 ms | 154.3 / 329.9 | 0 (same benign line) | same build |

| Metric (mean of 2) | A off | B on | Δ (B − A) | Pass tolerance | Verdict |
| --- | --- | --- | --- | --- | --- |
| Playlist wall time | 193.5 s | 189.9 s | −3.6 s (−1.9 %) | — | B slightly faster (A spread 0.4 s, B spread 1.2 s — beyond spread, small) |
| Janky frames | 9.12 % | 8.14 % | −0.98 pt | ±1 pt | within tolerance, in the good direction (A spread 0.38 pt, B 0.06 pt) |
| p50 / p90 / p95 / p99 | 10 / 15 / 17 / 21.5 ms | 10 / 15 / 17 / 21 ms | 0 / 0 / 0 / −0.5 ms | p95 ±2 ms | identical |
| PSS fresh restart | 152.8 MiB | 155.1 MiB | +2.3 MiB | ±10 MiB | within noise (the compiled bundle is +28 KB HBC) |
| PSS post-20-games | 325.2 MiB | 330.8 MiB | +5.6 MiB | ±10 MiB | within noise (A's own two runs differ by 11.6 MiB) |
| Games / crash tokens | 20/20 · 0 | 20/20 · 0 | — | — | pass |
| "Janky frames (legacy)" | 32.3 % | 36.0 % | +3.7 pt | not a plan metric | the legacy counter flags every frame > 16 ms regardless of deadline; the deadline-based counter above is the one Android 12+ reports as jank. Mentioned for completeness, not treated as a regression (p-percentiles are identical) |

Noise estimate from the A pair: wall ±0.2 s, janky ±0.2 pt, PSS post ±6 MiB; the B pair is
tighter still. Conditions identical for all four runs: phone charging at 76 %, thermal status 0
throughout (battery 23 → 27 °C over the hour), auto-brightness, battery saver off, light mode,
phone untouched during each playlist, app force-stopped and cold-started before each run, an
iOS build running on the Mac concurrently in both configurations (irrelevant to the phone).

**Decision (2026-10-18): compiler LEFT ON** (`app.json` → `expo.experiments.reactCompiler: true`).
No metric moved beyond the pass tolerance, every smoke path (scrubber C5 lines, celebration
`scheduleOnUI`/`scheduleOnRN`, glow, hint, undo, drawer) behaves identically on both platforms,
0 crashes in 4 × 20 + 2 × 5 games. Rollback = delete the `"reactCompiler": true` line in
`app.json`, then delete `android/app/build/generated/assets/react/release` (see flip proof) and
rebuild; iOS rebuilds the bundle on every `yarn ios`.

Config B iOS smoke (incremental `yarn ios` 2 min, `main.jsbundle` 10,281,913 bytes, rebuilt
23:23): scrubbed fixture exact; pans `-130` → 20, `-290` → 0, `+100` → 80 (all EXACT); Undo tap
from 80 → 79; `yarn celebration --ios` → overlay (mode 26); 5-game playlist 5/5; 0 crash/fatal
lines; session closed normally, no DiagnosticReports for Soli/SpringBoard.

Config A smoke (Android, Release APK built 22:48, bundle 8,739,204 bytes): scrubber fixture exact
(`Moves, 80` / `Stock, 10` / `Waste, Six of hearts`), `gesture pan 801 2150 -339` → 20 EXACT,
`-696` → 0 EXACT, `700 2150 +275` → 80 EXACT, Undo tap → 79; `yarn celebration` → overlay
(mode 39 Fireworks) with `[Celebration] start { cards: 52 }`; `yarn nearwin` → tapping the waste
King auto-played to the foundation → `hasWon set true (moves=244)` → celebration (mode 8 Ring
Cascade) → "Start a new game? Nice win!" dialog after ~45 s → Deal Again OK; Hint → amber ring on
A♠ + ghost on the spades slot; A♠ drop → foundation glow visible (luma oracle: crop
`200:260:440:590` YAVG 169.6 during the pulse vs 165.3 at rest); Undo returns the Ace; drawer
opens (Play/Hello/History/Settings/Rate Soli). 0 crash tokens attributable to Soli.

Config A iOS smoke (iPhone 17 Pro, iOS 27.0, Release, `LANG=en_US.UTF-8 … yarn ios` 16 min
incl. pods): scrubbed fixture exact; `gesture pan 298 788 -130` → 20 EXACT, `-290` → 0 EXACT,
`+100` → 80 EXACT; Undo tap → 79 (`Stock, 11`, `Waste, Six of spades`); `yarn celebration --ios`
→ overlay (mode 41 Dominoes); `?demo=playlist&games=5` → 5/5 completed; 0 crash/fatal lines in
the `log stream --level debug` capture.

**Flip proof (B).** The plan's marker was wrong for this project: `index.android.bundle` under
`android/app/build/generated/assets/react/release/` is **Hermes bytecode** (magic `c6 1f bc 03`),
whose string table dedupes every literal, so `grep -c "react/compiler-runtime"` is 0 in both
configs and proves nothing. Proof used instead: a plain-JS `expo export:embed --platform android
--dev false --minify false` of the same tree with the flag on and (temporarily) off —
`Symbol.for("react.memo_cache_sentinel")` occurrences **A = 2 vs B = 86**, `CompilerRuntime`
identifiers **A = 0 vs B = 117**, JS size 15,584,670 → 15,650,393 bytes (+65.7 KB); the HBC
bundle grew 8,739,204 → 8,767,700 bytes (+28.5 KB). Second finding: the first B `yarn release`
after the flip reported `:app:createBundleReleaseJsAndAssets UP-TO-DATE` and shipped the OLD
bundle (mtime unchanged) — `app.json` is not an input of the RN Gradle bundle task. Fix: delete
`android/app/build/generated/assets/react/release` (+ the `mergeReleaseAssets` copy and
`generated/sourcemaps/react/release`) and rebuild (56 s). Recorded in SKILL.md §8.

Config B Android smoke (APK built 23:16, bundle regenerated): scrubber fixture exact, pans
`-339` → 20 EXACT, `-696` → 0 EXACT, `+275` → 80 EXACT, Undo → 79; `yarn celebration` → overlay
(mode 2 Pendulum Cascade); `yarn nearwin` → waste King auto-play → `hasWon set true (moves=244)`
→ `[Celebration] start` (mode 0 Spiral Bloom) → "Start a new game? Nice win!" dialog → Deal
Again; Hint → ring on 2♣ + ghost on 3♦; A♦ drop (Vegas fixture, column 7) → foundation glow
halo visible in the in-flight capture; Undo returns the Ace; drawer opens/closes. Gates with the
flag on: typecheck clean, lint exit 0, Jest 45 suites / 458 tests (unchanged by design).

**Pass criteria (B vs A, medians of the runs)**: 20/20 games, 0 crash tokens, janky % within 1
point, p95 within 2 ms, PSS within 10 MiB, scrubber lands within ±1, celebration + glow + hint
visually unchanged (Karim 2-minute look if the tester is unsure). Fail → rollback (delete the
flag line, rebuild) and report which metric moved. Note for interpretation: the per-card
`AbsoluteLayerCard` is still skipped in B, so a frame-time change on the playlist would come from
the compiled parents (`TableauSection`, `FoundationPile`, `useKlondikeGame`, `KlondikeGameView`),
not from the card itself.

### Option D test plan (S16 — for the testing agent)

Read `.agents/skills/soli-testing/SKILL.md` first (phone A065 guardrails, `--serial`,
`android-ready.sh --keep-awake`, §8 flip-proof + Gradle `UP-TO-DATE` notes). One build at a
time, one agent per device. **Baseline = the S11 config B rows above** (compiler ON, memos
still in place): janky 8.14 %, p50/p90/p95/p99 10/15/17/21 ms, PSS fresh 155.1 / post 330.8
MiB, playlist 189.9 s. Pass tolerance as in S11: janky ±1 pt, p95 ±2 ms, PSS ±10 MiB, 20/20
games, 0 crash tokens, scrubber ±1, visuals unchanged. **Build note:** only source files
changed, so Gradle re-bundles by itself — but confirm the bundle mtime moved; if in doubt
delete `android/app/build/generated/assets/react/release` before `yarn release`.

- [x] 1. `yarn typecheck && yarn lint && yarn jest --runInBand` once (all green at hand-off:
  458/458). Jest runs UNcompiled code, so this proves nothing about the compiler — it is a
  sanity gate only. → S16 (2026-10-19 07:17): typecheck clean, lint 0, Jest 45 / 458 green.
- [x] 2. Android Release build (`yarn release`), then **two measurement runs** with the S11
  script shape (`rc/ab/measure.sh` if still in the scratchpad, else S11 steps 1-6): force-stop
  → cold `soli:///` → 12 s → `dumpsys meminfo` (PSS fresh) → `gfxinfo reset` →
  `?demo=playlist&games=20` → wait for `[DemoPlaylist] Playlist completed (games=20)` →
  `gfxinfo` (frames, janky %, p50/p90/p95/p99) → `meminfo` (PSS post). Record in a table
  under "S16 results" next to the S11 B numbers. Third run if the two differ by more than
  the tolerance. → Done 2026-10-19 07:19-07:28 (build 51 s after deleting the generated
  release assets; bundle regenerated, mtime 07:19, HBC 8,768,100 B). Two runs agree within
  tolerance (janky spread 0.35 pt, PSS post spread 4.3 MiB) → no third run. Table in "S16
  results".
- [x] 3. **Smoke, Android** — PASS 2026-10-19 07:29-07:45, details in "S16 results → Android
  smoke". (a) `yarn scrubtest` → pans
  `-339` → 20, `-696` → 0, `+275` → 80 (EXACT within ±1), Undo tap → 79 — exercises
  `UndoScrubber`/`GestureWrapper` (memo removed; element now cached by the compiled parent)
  and the kept `measureTrack`; the track label must still update per step. (b) `yarn
  celebration` → overlay without board flash; `yarn nearwin` → last move → real win →
  `[Celebration] start` → dialog → Deal Again — exercises `CelebrationAtlas` (9 memos removed,
  hook reorder) and `AbsoluteCardLayer`/`TopRow`/`TableauSection` (memo removed). Watch
  for a celebration that stutters at start or restarts on badge-cycle (would mean the
  worklets re-register more often than before). (c) Hint → ring + ghost
  (`HintOverlayLayer` memo removed); then Undo → ring clears. (d) Invalid move → wiggle on
  the tapped stack only (the kept `items` memo). (e) Drawer open/close; History tab →
  scroll to pagination, open a row → preview sheet (BoardPreview memo removed) → Retry
  (confirm dialog) and Share (sheet appears) — `history.tsx` lost 6 memos. (f) Settings:
  flip Draw count, Animations master OFF/ON (`useAnimationToggles` memo removed — board
  animations must stop/resume), Warning mode picker, Scoring picker → Vegas, Reset Vegas
  total dialog (`confirmResetVegasTotal`), then back to Standard. (g) Dev Demo sheet (dev
  mode ON): open, pick a demo, Reset undo hint, Seed history — `index.tsx` lost 5 memos.
  (h) TIMER sanity: play two moves, watch MOVES/TIME tick for 10 s with the phone otherwise
  idle; `adb shell dumpsys gfxinfo ch.karimattia.soli` after 60 s idle should show only a
  handful of frames per second (the per-second tick must not re-render the card layer —
  that is the one place a lost `React.memo` would show).
- [x] 4. **iOS** (`yarn ios`, simulator, correctness only): `yarn scrubtest --ios` → pans
  `-130` → 20, `-290` → 0, `+100` → 80; `yarn celebration --ios`; `?demo=playlist&games=5`
  → 5/5; Settings pickers once; History sheet once; 0 crash/fatal lines. → PASS 2026-10-19
  07:46-07:55, details in "S16 results → iOS smoke".
- [x] 5. Crash tokens 0 on both platforms (attribute pids first — the `am start` shell
  `VM exiting` line is benign, see S11). → 0 on both (Android: only `am` shell VMs, uid 2000;
  iOS: 0 crash/fatal/uncaught lines in 627k log lines, no Soli/SpringBoard DiagnosticReports).

**S16 decision (2026-10-19): option D KEPT — no memo restored.** No metric moved beyond the
S11 noise bands (janky −0.06 pt, percentiles identical, wall +0.3 %, PSS fresh −2.9 MiB; PSS
post −16 MiB i.e. lower), the idle board renders exactly one frame per timer tick, and every
smoke path on both platforms behaves as in config B.

#### S16 results (testing agent, 2026-10-19 07:17-…, phone A065 Android 16, battery 94→92 % NOT charging (S11 was charging), thermal status 0 throughout (20→24 °C), light mode, screen timeout raised to 600 s by `android-ready.sh --keep-awake`, phone untouched during each playlist; raw outputs in the session scratchpad `rc/d/`: `D1/`, `D2/`, `build-D.log`, `js-D.js`, `bundle-D.hbc`)

Same script as S11 (`rc/d/measure.sh` = `rc/ab/measure.sh` with the output dir changed).
Compiler proof for the D tree (plain-JS `expo export:embed --dev false --minify false`):
`react.memo_cache_sentinel` ×86, `CompilerRuntime` ×117 — identical to config B (coverage
75 / 8 unchanged, one sentinel per compiled function); JS 15,652,057 B (B 15,650,393), HBC
8,768,100 B (B 8,767,700).

| Config | Run | Games | Wall time | Frames | Janky | p50 / p90 / p95 / p99 | PSS fresh / post (MiB) | Crash tokens |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| B (S11, memos in) | 1 | 20/20 | 190.5 s | 20113 | 1644 (8.17 %) | 10 / 15 / 17 / 21 ms | 154.3 / 329.9 | 0 |
| B (S11, memos in) | 2 | 20/20 | 189.3 s | 19951 | 1619 (8.11 %) | 10 / 15 / 17 / 21 ms | 155.9 / 331.7 | 0 |
| D (option D) | 1 | 20/20 | 190.5 s | 20212 | 1668 (8.25 %) | 10 / 15 / 17 / 21 ms | 149.3 / 312.2 | 0 (1 benign `VM exiting` from the `am start` shell pid 23690; Soli pid 24051) |
| D (option D) | 2 | 20/20 | 190.3 s | 20301 | 1604 (7.90 %) | 10 / 15 / 17 / 21 ms | 155.0 / 316.5 | 0 (same benign line, pid 24480 vs Soli 24471) |

| Metric (mean of 2) | B (S11) | D | Δ (D − B) | Tolerance | Verdict |
| --- | --- | --- | --- | --- | --- |
| Playlist wall time | 189.9 s | 190.4 s | +0.5 s (+0.3 %) | — | identical (D spread 0.2 s) |
| Janky frames | 8.14 % | 8.08 % | −0.06 pt | ±1 pt | identical (D spread 0.35 pt) |
| p50 / p90 / p95 / p99 | 10 / 15 / 17 / 21 ms | 10 / 15 / 17 / 21 ms | 0 | p95 ±2 ms | identical |
| PSS fresh | 155.1 MiB | 152.2 MiB | −2.9 MiB | ±10 MiB | within noise |
| PSS post-20-games | 330.8 MiB | 314.4 MiB | −16.4 MiB | ±10 MiB | outside the band but in the GOOD direction (less memory); both D runs sit below all four S11 runs (319.4-331.7). Plausible (86 fewer closures/deps arrays per render tree) but the phone was not charging this time, so not claimed as a win — in any case not a regression |
| Janky (legacy) | 36.0 % | 36.3 % | +0.3 pt | not a metric | unchanged |
| Games / crash tokens | 20/20 · 0 | 20/20 · 0 | — | — | pass |

**Idle re-render oracle (step 3h):** scrubbed board (timer running), `gfxinfo reset` → 60 s
untouched → **60 frames rendered in 60 s = exactly one frame per TIMER_TICK**, no re-render
storm from any removed `React.memo` (frame p50 25 ms / GPU 11 ms — the single wake-up frame
per second from idle clocks; the frame COUNT is the oracle, a lost memo boundary would not
change the count but would show up in the playlist janky %/p99 above, which did not move).
No config-B idle number exists (no B build at hand) — absolute numbers only.

**Android smoke (D build, agent-device session `d-and`, `--serial 192.168.1.12:5555`):**
(a) scrubbed fixture exact (`Moves, 80` / `Stock, 10 cards` / `Waste, Six of hearts`), Undo
center 801 2150; pans `-339` → **20** (`Stock, 7`, `Waste, Two of spades`), `-696` → **0**
(`Stock, 24`), `700 +275` → **80** (`Stock, 13`, `Waste, Ten of hearts`), Undo tap → **79**
(`Waste, Six of clubs`) — all EXACT, `Undo scrubber, position K of 80` label updated after every
step. (b) `yarn celebration` → overlay (mode 20 Fountain) with `[Celebration] start`; badge tap
→ mode 21 Card Rain, exactly one `[Celebration] start` per cycle (no restart/stutter), tap
elsewhere → board untouched (`Stock, 13` / `Waste, Six of clubs` / `Moves, 80`). `yarn nearwin`
→ tap `Waste, King of spades` → `hasWon set true (moves=244)` → handoff queued / selected /
settled / start → `[Celebration] start` (mode 13 Aurora Twist, screenshot `D-realwin-5s.png`)
→ `[Celebration] complete` at +60.0 s → "Start a new game?" dialog → Deal Again → fresh deal
(`Moves, 0`, `Stock, 23`, Hint button present on the Standard game). (c) Hint → amber ring on
10♠ + 9♥ ghost (`D-hint.png`), solver `status=solved ms=2.0`; Undo tap fine. (d) Tap 4♠
(no legal target) → wiggle: pixel diff of the 4♠ column between two consecutive screencaps
YAVG 27.9 vs **0** in two control columns — only the tapped stack moved; `Moves` unchanged.
(e) Drawer opens (Play/Hello/History/Settings/Rate Soli); History → row → preview sheet with
BoardPreview (`D-history-sheet.png`) → Retry → "Retry this deal?" → Cancel; Share → Android
chooser → dismissed; scrolling 8 pages loads older rows (yesterday's entries visible →
`loadMore` works). (f) Settings: Draw 1 → 3 → 1 (field text follows), Warnings → Unwinnable
game → No more useful moves, Scoring → Vegas (`reset-vegas-total` row appears) → Reset Vegas
total → dialog → Cancel → Standard; "All animations" OFF → the six detail switches report
`enabled=false`, a Draw on the board still works (`Moves 2`, `Stock 22`) → ON → all seven
switches checked/enabled again. (g) Demo sheet: Seed history → `Inserted 8 seed history
entries` (cleared again afterwards); the "Undo hint" row is NOT reachable on Android — it sits
below the default detent fold (pre-existing A20 layout bug, comment in `index.tsx`), so
`?reset=undoHint` was used instead (`[Demo] Reset link: undo hint.`); `handleResetUndoHint`
itself is a 2-line wrapper around the same hook call. (h) see idle oracle above. Crash scan of
the whole 37k-line smoke logcat: 0 `FATAL EXCEPTION` / tombstone / SIG*; every `AndroidRuntime`
line belongs to `am` shell VMs (uid 2000), Soli pids 24471 / 25005 / 26224 clean.

**iOS smoke (iPhone 17 Pro, iOS 27.0, Release, incremental `LANG=en_US.UTF-8 … yarn ios`
58 s, bundle updated 07:25, agent-device session `d-ios`, `log stream --level debug` capture
`rc/d/ios-D-log.txt`):** scrubbed fixture exact, Undo center 298 789; pans `-130` → **20**,
`-290` → **0**, `+100` → **80**, Undo tap → **79** — all EXACT and the same board states as
Android (`Stock, 7` / `Two of spades`, `Stock, 24`, `Stock, 13` / `Ten of hearts`, `Six of
clubs`). `yarn celebration --ios` → mode 10 Comet Halo, badge tap → 12 Column Glide (one
`[Celebration] start` each), dismiss clean. `yarn nearwin --ios` → waste King tap → `hasWon
set true (moves=244)` → `[Celebration] start` (mode 36) → "Start a new game?" after ≈30 s →
Deal Again → fresh deal. History: row → sheet → Retry on a 0-move current game retries
immediately (no prompt — same rule as the shared-deal prompt), on a 1-move game → "Retry this
deal?" → Cancel; Share → iOS share sheet (`ShareSheet.RemoteContainerView`, Copy) → dismissed.
Settings: Draw 1 → 3 → 1, Scoring Off → Vegas (`Keep Vegas total` row appears) → Off, Warnings
→ Unwinnable game → No more useful moves, "All animations" OFF → the six detail switches
report `[disabled]` → ON → all enabled again. `?demo=playlist&games=5` → `Game 5/5 completed`,
`Playlist completed (games=5)` in 51 s. Crash scan 0 (see step 5). Session closed normally,
sim appearance left `light`.

**Cheap re-render check — decision:** React DevTools is not available on the Release
phone build, and a temporary render counter would be dev-only code in the hot path that
the compiler also rewrites (and Karim asked for no overkill). Instead use two free
oracles: (1) the 60 s idle `gfxinfo` frame count in step 3(h) — the TIMER_TICK path is the
only per-second render, and a lost memo boundary would multiply frames there; (2) the
playlist janky % / p99 vs S11 B. If either moves, the testing agent can add
`console.count('<Component> render')` in `AbsoluteCardLayer`/`TopRow` on a dev build for
one playlist and compare counts with a `"use no memo"` directive on the same component —
only then, not by default. Pass → mark S16 done in Steps and leave the memos out; fail →
report which metric/smoke moved and which component (the per-file KEEP/REMOVE list makes a
partial rollback a one-file `git diff` revert of the offending component).

## Follow-ups

See sections A-E; this document *is* the follow-up list. Added by round 2:

- **Delete the Appium iOS scrub path** (`scripts/ios-scrub.js` ~250 LOC, `appium.md`, SKILL
  mentions): agent-device 0.21.28 scrubs on iOS. Pro: -1 tool, -1 guide, simpler §6. Con: no
  fallback if a future agent-device regresses iOS pans (would be caught by the next
  scrubber-touching task). Recommendation: delete at the next scrubber task. → **DONE in round 3
  (2026-10-18, S9).**
- **Bump invent to agent-device 0.21.28** so both repos share one daemon version (hazard above).
- **React Compiler pass (A11)**: start from the six disabled oxlint rules — run
  `yarn oxlint -W react/immutability -W react/refs -W react/set-state-in-effect -W react/exhaustive-effect-dependencies -W react/capitalized-calls -W react/globals src` for the bail-out map.
- **oxfmt 0.54 → 0.73** right after Karim's commit (B1), own commit for the reformat.
- **Option D follow-ups (2026-10-19):** (a) the 21 lint-kept `useCallback`s could go once a
  compiler-aware `exhaustive-deps` exists (or if Karim accepts turning the rule off — not
  recommended, it is the only missing-deps check left; the compiler validates memo deps
  only where memos exist). (b) The 8 skipped functions hold 58 more manual memos; compiling
  them needs the D1 scrubber hook migration (`useUndoScrubber` refs), a `useState`-based
  "previous props" rewrite in `AbsoluteLayerCard` (hot path — measure), and small
  `try/finally` helper extractions in `useHint`/`useKlondikeHistoryEntry`/
  `useKlondikePersistence`/`useHistory`. The last group is cheap and risk-free; LATER with
  the next touch of each file. (c) `CascadeImprintLayer`'s `for` header rewrite would
  compile it (2 memos). (d) `docs/external-package-guides/react-compiler.md` is still not
  written — the deep dive + this section are its seed; write it when the compiler work
  stabilises (recommendation: now that D landed, a 1-page guide with the three verification
  scripts is worth it).

## React Compiler deep dive (prompt 2)

Research 2026-10-18 (read-only sub-agent; sources: react.dev compiler docs + the 1.0 blog post
2025-10-07, docs.expo.dev/guides/react-compiler, Reanimated 4.x `useSharedValue` docs, the
reactwg/react-compiler#14 discussion, and the INSTALLED sources: `babel-preset-expo 58.0.17`,
`babel-plugin-react-compiler 1.0.0`, `@expo/cli`, `@expo/metro-config`). Nothing in the project
was modified; the compiler was run from the scratchpad with a logger only.

### What it is, in plain words

| Topic | Fact |
| --- | --- |
| What it does | A Babel plugin that rewrites every component/hook at build time so that values, JSX and callbacks are cached per "reactive scope" and only recomputed when their inputs change. It is `useMemo`/`useCallback`/`React.memo` applied automatically and more finely than a human does (it can memoize past early returns, per JSX subtree, per object literal). |
| What it replaces | Manual `useMemo`, `useCallback`, `React.memo` written for render-skipping or identity stability. They keep working; the compiler simply makes most of them redundant. |
| What it does NOT do | Make a single render faster; compile class components or `node_modules`; compile functions that break the Rules of React (those are *skipped*, see below); replace Reanimated worklets / the UI thread; fix effects that depend on unstable identities (it can change how often such effects fire, in either direction). |
| Status | 1.0.0 stable (Oct 2025), "battle-tested at Meta". `babel-plugin-react-compiler` latest on npm is still 1.0.0 (checked 10-18). Works with React Native/Expo. |
| Package situation in Soli | Nothing to install: `babel-preset-expo 58.0.17` depends on `babel-plugin-react-compiler ^1.0.0` (installed 1.0.0). `react-compiler-runtime` is only needed for `target: '17'/'18'`; React 19.3 ships `react/compiler-runtime`. |
| How Expo turns it on | `app.json` -> `expo.experiments.reactCompiler: true`. Chain: `@expo/cli MetroBundlerDevServer.js:901` reads the flag -> `customTransformOptions.reactCompiler` -> `@expo/metro-config/babel-transformer.js:110` sets `caller.supportsReactCompiler` -> `babel-preset-expo/build/configs/expo.js:28-32,136-173` inserts the plugin FIRST in the pipeline with `target: '19'`, `panicThreshold: 'NONE'` in production (plugin default `none` in dev), `enableResetCacheOnSourceFileChanges` in dev, opt-out directives `widget`, `use no memo`, `use no forget`. Skipped for `node_modules` and server bundles. |
| Is it default in SDK 58? | **No.** Soli's `app.json` has `experiments: { typedRoutes: true }` only, so the compiler is OFF today. The React blog's "Expo SDK 54+ enables it by default" refers to the `create-expo-app` template shipping the flag, not to the preset. |
| Extra plugin options | `babel.config.js`: `['babel-preset-expo', { jsxRuntime: 'automatic', 'react-compiler': { sources, compilationMode, panicThreshold, environment, customOptOutDirectives } }]` (preset README "Options > react-compiler"; `false` disables per platform). Restart Metro with `expo start -c` after changing it. |
| Jest | `jest-expo` also uses `babel-preset-expo`, but the Jest caller never sets `supportsReactCompiler`, so unit tests always run the UNcompiled code. Acceptable; just know that Jest cannot catch compiler-induced behaviour changes. |

### The "different things" (modes, directives, thresholds)

| Knob | Values | Meaning for Soli |
| --- | --- | --- |
| `compilationMode` | `infer` (default): compile anything that looks like a component (PascalCase + JSX/hooks) or a hook (`use*`). `annotation`: compile only functions/files marked `"use memo"`. `syntax`: only Flow `component`/`hook` syntax (irrelevant, Soli is TS). `all`: every function (not recommended, false positives). | `infer` is what Expo uses when you only flip the flag. `annotation` is the "try it on three components" mode. |
| Directives | `"use memo"` (opt in) / `"use no memo"` (opt out), first statement of a function body or top of file (before imports). Function-level overrides file-level. Misplaced = silently ignored. React asks that opt-outs stay temporary and documented. | Soli has none today. |
| `panicThreshold` | `none` (default; a function with a compile error is left as written and the build continues), `critical_errors`, `all_errors` (fail the build). | Expo forces `none` in production. So "skipped" never means "broken" — it means "same as today". |
| `target` | `'17' | '18' | '19'` | `'19'` set by Expo. |
| `sources(filename)` | File filter; default excludes `node_modules`. | Incremental adoption lever (e.g. compile `app/` + `components/` first, board later). |
| `enableReanimatedCheck` | default `true`: if `react-native-reanimated` is resolvable, the compiler loads its Reanimated type model (`getReanimatedModuleType`): `useSharedValue`/`useDerivedValue` return MUTABLE objects; `useAnimatedStyle`/`useAnimatedProps`/`useAnimatedReaction`/`useFrameCallback`/`useAnimatedScrollHandler`/`useWorkletCallback` FREEZE their arguments. | Explains every Reanimated bail-out below. |
| Lint | Compiler-backed rules (`refs`, `set-state-in-render`, `immutability`, `purity`, ...) ship only in `eslint-plugin-react-hooks` 6+/7 (they embed the compiler). Soli lints with **oxlint 1.88** (`react` plugin only: hooks rules, no compiler-backed rules). | Substitute: run the compiler itself with a logger (the script below). No ESLint needed. |

### Reanimated / Gesture Handler / refs interplay (verified against the plugin source)

- Shared values: Reanimated 4.x docs (`useSharedValue`): with the React Compiler "refrain from accessing and modifying the `value` property directly", use `get()`/`set()`; never read or write a shared value during render. Mechanism: the compiler models `sv.value = x` as a Store. Once `sv` has been captured by a frozen hook (`useAnimatedStyle(() => ... sv.value ...)`) or used as a `useEffect` dependency, every later `.value =` in that function is an *Immutability* error -> the whole component/hook is skipped. `sv.set(x)` is a method call on a frozen object, which the compiler accepts (the shared-value shape `ReanimatedSharedValueId` has no modelled methods, and calls on frozen values are allowed). This is exactly why Reanimated calls `get`/`set` "compiler-compliant".
- Worklets: not affected; the Worklets Babel plugin runs after the compiler and workletizes as before. GH v3 hook callbacks (`usePanGesture({ onUpdate })`) ARE auto-workletized by `react-native-worklets 0.13` (`plugin/index.js:249-258, 453, 504`), so D1 does not change that either way.
- Gesture Handler builder objects built inside `useMemo` compile fine (`UndoScrubber.tsx` is skipped for a different reason, see table).
- Refs: `ref.current` read or written during render = *Refs* error -> skipped. Soli's `useRef(new NativeAnimated.Value(x)).current` idiom (3 files) and the "latest-value ref" writes (`onScrubBeginRef.current = onScrubBegin`, `useUndoScrubber.ts:300-333`, `useKlondikePersistence.ts:75-79`) are both this pattern. Sanctioned replacements: RN's `useAnimatedValue(initial)` (exported from `react-native`) or `useState(() => new Animated.Value(x))[0]`; for latest-value refs, `useEffectEvent` (already used twice in Soli) or writing the ref inside an effect.

### Soli numbers

- Manual memo sites (`app/ components/ src/`): **162** = 122 `useCallback` + 26 `useMemo` + 11 `React.memo(` + 3 `memo(`. In `src/features/klondike` alone: 124 (the earlier "~146" was a rough count). Top files: `useKlondikeGame.ts` 31, `useCelebrationController.ts` 18, `state/settings.tsx` 13, `useHint.ts` 11, `useUndoScrubber.ts` 10, `state/history.tsx` 9, `useDemoGameLauncher.ts` 9, `CelebrationOverlayLayer.tsx` 8, `app/(tabs)/history.tsx` 8, `useUndoHint.ts` 7. Also 43 `useRef`, 23 `useSharedValue`, 9 `useAnimatedStyle`, 2 `useAnimatedReaction`, 1 `useDerivedValue`, 2 `useEffectEvent`.
- `npx react-compiler-healthcheck@1.0.0 --src "{src,app,components}/**/*.{ts,tsx}"` (run from the npx cache, nothing installed): "Successfully compiled 63 out of 63 components. StrictMode usage not found. Found no usage of incompatible libraries." Take this with salt: the healthcheck counts components only and reported zero errors, while the real plugin run below (same 1.0.0 plugin, Expo's `target 19` + `panicThreshold none`) skips 13 functions. Trust the plugin run — it is what Metro will execute.
- Real plugin run (scratch script `scratchpad/rc/compile-report2.js`: `@babel/core` + `@babel/preset-typescript` + the installed `babel-plugin-react-compiler` with a logger, over the 91 non-generated, non-test `.ts/.tsx` files in `src/ app/ components/`): **70 functions compiled, 13 skipped**. `useKlondikeGame` (31 memo sites), `HistoryScreen`, `TableauSection`, `FoundationPile`, `PileButton`, `HintOverlayLayer`, `KlondikeGameView`, the settings hooks and all `components/` compile.

| Skipped function | Category (compiler) | Cause (lines) | Fix (if we want it compiled) | Hot path? |
| --- | --- | --- | --- | --- |
| `useUndoScrubber` (`useUndoScrubber.ts:154`) | Immutability | `sv.value = ...` after the shared values were effect deps / hook args: lines 241, 260-261, 377-379, 406, 415-416, 425-426 | `sv.set(...)` (11 lines) — same file as C5 | Scrubber only |
| `useCelebrationController` (`:126`) | Immutability | `celebrationTotal/Mode/Board.value = ...` at 399-401, 531-533 after capture by `useAnimatedReaction`/`runOnUI` | `.set(...)` (6 lines) | Celebration only |
| `useFoundationGlowAnimation` (`animations.ts:30`) | Immutability | `glowOpacity.value = 0` in an effect after `useAnimatedStyle` captured it (line 54) | `.set(0)` | Foundation glow (every foundation drop) |
| `UndoScrubber` component (`UndoScrubber.tsx:155`) | Immutability | `trackWidth.value = ...` at line 194 after a hook captured it | `.set(...)` | Scrubber |
| `AbsoluteLayerCard` (`AbsoluteCardLayer.tsx:451`) | Refs | `useRef(new NativeAnimated.Value()).current` x4 and `previous*Ref.current` reads in render (463-466, 475-476, 523, 604, 608, 620, 672) | `useAnimatedValue()` for the 4 values; the `targetChangedBeforeEffect` render-time ref comparison is a deliberate Fabric/pressability guard (comment at 477-479) — would need `useState`-based "previous props" or a `"use no memo"` with a comment | **YES — the per-card component, the most perf-critical function in the app** |
| `CardVisual` empty-slot component (`CardVisual.tsx:203`) | Refs | `useRef(new NativeAnimated.Value()).current` x2 (214-215, 232-239) | `useAnimatedValue()` | Per empty slot |
| `WinCleanupPile` (`TopRow.tsx:35`) | Refs | same idiom (41) | `useAnimatedValue()` | Top row |
| `CelebrationAtlas` (`CelebrationOverlayLayer.tsx:193`) | Suppression | `// eslint-disable-next-line react-hooks/exhaustive-deps` at 363 and 496 — DEAD comments since the move to oxlint, but the compiler refuses to compile a component with suppressed hook rules | Delete the two comments; then the compiler validates the component for real (may surface further issues) | Celebration |
| `CascadeImprintLayer` (`:887`) | Todo (compiler limitation) | `for (...)` with non-variable initializer at 1109 | Rewrite the loop header or leave skipped | Celebration |
| `useHint` (`useHint.ts:154`) | Todo | `try` without `catch` at 224 | Move the try into a plain helper function, or leave | Hint |
| `useKlondikeHistoryEntry` (`:91`) | Todo | optional chaining inside `try/catch` at 305 | helper function, or leave | History write |
| `useKlondikePersistence` (`:59`) | Todo | `try/finally` at 98 | helper, or leave | Persistence |
| `useHistory` provider (`state/history.tsx:157`) | Todo | `try/finally` at 178, 383 | helper, or leave | History |

**Status after round 3 (2026-10-18, same script, same plugin): 75 compiled / 8 skipped.** Newly
compiled: `useFoundationGlowAnimation`, `UndoScrubber`, `EmptySlot` (`CardVisual.tsx`),
`WinCleanupPile` (`TopRow.tsx`), `CelebrationAtlas` (deps completed, see S7). Remaining skips:

| Skipped function | Category | Cause now | Why left |
| --- | --- | --- | --- |
| `AbsoluteLayerCard` (`AbsoluteCardLayer.tsx:457`) | Refs | `previousResetKeyRef/previousTargetRef.current` read in render (`targetChangedBeforeEffect`, lines 485-486) | Deliberate Fabric/pressability guard (comment in code); moving it to state/effect changes WHEN touches re-enable — not behaviour-neutral. Hot path stays as today (safe for the flip, zero perf gain) |
| `useUndoScrubber` (`:157`) | Refs | latest-value refs written in render (`onScrubBeginRef`, `onScrubEndRef`, `canUndoRef`, `handleUndoRef`, lines 308-341) and ref reads inside gesture-builder callbacks the compiler cannot classify as handlers (353-427) | Surfaced only after the Immutability fix; `useEffectEvent` or the D1 hooks migration would fix it — D1 territory, deliberately not bundled |
| `useCelebrationController` (`:123`) | Refs | `pendingCelebrationActiveRef.current` / `winCelebrationsRef.current` read in render for `celebrationQueuedThisRender` (721-728, 793) | Deliberate "treat the winning render as pending" guard (comment in code); not neutral to move |
| `CascadeImprintLayer` (`CelebrationOverlayLayer.tsx:904`) | Todo | `for (…)` non-variable initializer (1126) | Compiler limitation; cosmetic rewrite, later |
| `useHint` (`:154`) | Todo | `try` without `catch` (224) | Helper extraction, later |
| `useKlondikeHistoryEntry` (`:91`) | Todo | optional chaining inside `try/catch` (305) | later |
| `useKlondikePersistence` (`:59`) | Todo | `try/finally` (98) | later |
| `useHistory` provider (`state/history.tsx:157`) | Todo | `try/finally` (178, 383) | later |

Honest reading: the board's per-card component is skipped, so flipping the flag today changes
nothing on the hottest path (good for safety, zero for perf). The compiler's value for Soli is
code simplicity (deleting ~100 memo lines), and that only arrives after the `.set()` and
`useAnimatedValue` fixes plus a measured removal pass.

### Options

| Option | What | Pros | Cons / risks | Effort |
| --- | --- | --- | --- | --- |
| A. Not now | Keep manual memos | Zero risk; no perf problem exists today | The 162 memo sites stay; the tree is as uncommitted as it will ever be, so "later" never gets cheaper | 0 |
| B. `annotation` mode on a few screens | flag + `'react-compiler': { compilationMode: 'annotation' }` + `"use memo"` on e.g. `HistoryScreen`, `SettingsScreen`, `AppDrawerContent` | Smallest blast radius; learns the toolchain (Metro cache, Fast Refresh, build time) | Teaches nothing about the board; the gain on three cold screens is unmeasurable | S (1 h) |
| C. `infer` app-wide, keep every manual memo (recommended experiment) | Flip the flag only. 70 functions compiled, 13 skipped (= unchanged). Measure. | One-line change, one-line rollback; React's own advice is to keep manual memos in place at first; everything hot is either compiled with memos still present (double memo = harmless) or skipped | Behaviour can change where code relied on unstable identities (an effect that re-ran on every render may stop re-running — usually a fix, occasionally a hidden dependency); dev-mode compile cache reset on every file change costs a little; build-time +1 Babel pass; interaction with Noxcturnal (D2.1) unverified — test the two experiments separately | M (half a day incl. two Release builds and two 20-game playlists) |
| D. C + remove manual memos | After C holds: delete `useMemo`/`useCallback`/`memo` that exist only for render skipping; keep the ones pinning identities for Reanimated/GH/effects; first do the `.set()` + `useAnimatedValue` + eslint-comment fixes so the hot files are compiled | The real payoff: ~100 fewer lines and simpler hooks (`useKlondikeGame` alone has 31) | React warns removal "can change compilation output" — needs the playlist + scrubber + celebration pass again; `AbsoluteLayerCard` becomes compiler-managed (must be measured, it is the perf core) | L (1-2 days, file by file) |

### Recommendation and experiment plan

Recommendation: **C as a measured experiment, but not this week** — only if Karim wants the
simplification (D) as the follow-up; otherwise A. There is no render-performance problem to
solve, and the board's hot component is skipped anyway, so C alone buys ~nothing visible. If C,
bundle the `.set()` migration with C5 (identical files, identical scrubber/celebration test
pass) *before* flipping, so `useUndoScrubber`/`useCelebrationController`/`UndoScrubber`/
`useFoundationGlowAnimation` are compiled in the same measurement.

Steps (each a small plan, per AGENTS.md):

1. Baseline on the Android phone, Release, current build: (a) `yarn release --auto-solve` 20-game playlist wall time + crash tokens (SDK 58 baseline 3 m 20-21 s, 0 tokens); (b) frame pacing: `adb shell dumpsys gfxinfo ch.karimattia.soli reset` right before the playlist, `adb shell dumpsys gfxinfo ch.karimattia.soli` right after -> Total frames, Janky frames %, 50th/90th/95th/99th percentile; (c) RAM: `yarn agent-device perf memory sample --json` restart / post-20 / post-GC (SDK 58 baseline 155.0 / 330.6 / 273.9 MiB PSS); (d) `yarn scrubtest` + native pan landing index. Record in this doc.
2. Flip: `app.json` `experiments.reactCompiler: true`; `expo start -c`; `yarn typecheck && yarn lint && yarn jest` (Jest is unaffected by design); `yarn release` and repeat 1(a)-(d); `yarn ios --auto-solve` for correctness only (simulator frame times are not meaningful).
3. Pass criteria: 20/20 games, 0 crash tokens, Janky % within 1 point, p95 within 2 ms, PSS within 10 MiB, scrubber index lands within +/-1, celebration preview (`yarn celebration`) and hint ring visually unchanged (Karim 2-minute check). Fail -> rollback = delete the flag line and rebuild; no source touched.
4. Optional D, file by file, re-running step 1(a)-(d) after the board files (`AbsoluteCardLayer`, `TableauSection`, `useKlondikeGame`).

Files: `app.json` (flag), optionally `babel.config.js` (`'react-compiler': { sources }` for a
staged rollout), the four `.set()` files, `AbsoluteCardLayer.tsx` / `CardVisual.tsx` / `TopRow.tsx`
(`useAnimatedValue`), `CelebrationOverlayLayer.tsx` (two dead comments). No new dependency; a
`docs/external-package-guides/react-compiler.md` guide should be written when the experiment
starts (facts above are its seed).

## C5 + D1 risk assessment (prompt 2)

### C5: `runOnJS` -> `scheduleOnRN` (and `runOnUI` -> `scheduleOnUI`)

Sites (grep 10-18; the "11" in A10 counted lines incl. 2 imports, 1 comment and the unrelated GH
option `.runOnJS(true)` at `useUndoScrubber.ts:343`, which is Gesture Handler's own flag and stays):

| # | File:line | Today | After |
| --- | --- | --- | --- |
| 1 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:552` | `runOnJS(onOverlayReady)()` | `scheduleOnRN(onOverlayReady)` |
| 2 | `src/features/klondike/hooks/useUndoScrubber.ts:380` | `runOnJS(beginScrubSession)(pointer)` | `scheduleOnRN(beginScrubSession, pointer)` |
| 3 | `useUndoScrubber.ts:407` | `runOnJS(scheduleScrubDispatch)(nextIndex)` | `scheduleOnRN(scheduleScrubDispatch, nextIndex)` |
| 4 | `useUndoScrubber.ts:417` | `runOnJS(finishScrubSession)(finalIndex)` | `scheduleOnRN(finishScrubSession, finalIndex)` |
| 5 | `useUndoScrubber.ts:427` | same | same |
| 6 | `src/features/klondike/hooks/useCelebrationController.ts:557` | `runOnJS(handleRunFinished)()` | `scheduleOnRN(handleRunFinished)` |
| 7-9 | `useCelebrationController.ts:402, 548, 589` | `runOnUI(() => { 'worklet' ... })()` | `scheduleOnUI(() => { ... })` — same deprecation (`workletFunctions.ts:59`), same mechanical shape |
| imports | `CelebrationOverlayLayer.tsx:28`, `useUndoScrubber.ts:5`, `useCelebrationController.ts:7-8` | from `react-native-reanimated` | `import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets'` (direct dependency 0.13.0; Reanimated does NOT re-export the new names) |

**Done in round 3 (2026-10-18, S6): all 9 rows swapped exactly as listed; imports from
`react-native-worklets`. Device verification is part of the S11 protocol (scrubber + celebration
steps run in configuration A, i.e. before the compiler flip).**

Semantics, verified in `react-native-worklets 0.13.0` (`src/threads.native.ts:229-282`):
`runOnJS(fun)` is literally `(...args) => scheduleOnRN(fun, ...args)` — a one-line wrapper.
`scheduleOnRN(fun, ...args): void` is fire-and-forget: on the RN runtime it `queueMicrotask`s; from
the UI runtime it serializes the args and schedules through the JSScheduler / RN CallInvoker
`invokeAsync` (asynchronous, ordered). No return value, no promise, identical timing to today.
Status: `@deprecated` JSDoc only in Reanimated 4.7.1 / Worklets 0.13 — no runtime warning, no
announced removal date.

| Risk | Level | Note |
| --- | --- | --- |
| Behaviour change | None | Same function underneath; only the call shape changes (`fn, args` instead of `fn)(args`). |
| Type errors | Low | `scheduleOnRN` is generic over `Args`; argument types are checked the same way. |
| Wrong import | Low | Must come from `react-native-worklets`, not Reanimated. |
| Touching timing-sensitive files while the tree is uncommitted | Medium (process, not code) | The reanimated guide's "don't migrate during the Tamagui task" note was about *scope*, not danger. |

Downsides of now: adds 9 lines of churn to files already in a large uncommitted diff. Downsides of
later: none technically; it is insurance against a future Reanimated major. Test: `yarn typecheck
&& yarn jest`, then `yarn scrubtest` (Android native pan, landing index) + `yarn celebration`
(cold) — 20 minutes. **Recommendation: bundle** — do it in the same commit as the React Compiler
`.set()` migration (same lines, same test pass), or as a 20-minute standalone right after the
current tree is committed. Not urgent.

### D1: Gesture Handler 3 hook API for the undo scrubber

Facts (installed `react-native-gesture-handler 3.3.0`, Expo-managed; 3.4.0 of 10-16 is not in
the SDK 58 set):

- Stability: the hook API shipped **stable** in v3.0.0 (2026-05-28, release notes: "Stable
  release of Gesture Handler 3 ... introducing the new hook-based API"), after 5 betas since
  02-05. v3.3.0 (09-11) and v3.4.0 are bug-fix releases on top; nothing in them is marked
  experimental. The upgrade guide calls it "the new hook API" with no beta caveat.
- Exports (root entry, `src/index.ts:153` -> `src/v3/index.ts`): `usePanGesture`, `useTapGesture`,
  `useLongPressGesture`, `usePinchGesture`, `useRotationGesture`, `useFlingGesture`,
  `useHoverGesture`, `useNativeGesture`, `useManualGesture`, `useExclusiveGestures`,
  `useSimultaneousGestures`, `useCompetingGestures` (= old `Race`), `GestureDetector`,
  `InterceptingGestureDetector`, `VirtualGestureDetector`, types `PanGesture`, `TapGesture`,
  `ComposedGesture`.
- Builder API: `Gesture.*` carries `@deprecated ... will be removed in a future version`
  (`gestureObjects.ts:19-90`), JSDoc only, still fully functional; relations cannot mix hook and
  builder gestures (Soli has one consumer, so irrelevant).
- Worklets: hook callbacks are auto-workletized by the Worklets Babel plugin exactly like the
  builder methods (`plugin/index.js:249-258`), so the UI-thread hot path is preserved.

Today (`useUndoScrubber.ts:341-452`, `UndoScrubber.tsx:129`): `Gesture.Tap().runOnJS(true).onEnd`,
`Gesture.Pan().minDistance(5).failOffsetY([-100,100]).shouldCancelWhenOutside(false)
.hitSlop({...}).cancelsTouchesInView(false).onStart/.onUpdate/.onEnd/.onFinalize.maxPointers(1)`,
`Gesture.Exclusive(pan, tap) as unknown as GestureType`, each in a `useMemo`.

Migration shape: `usePanGesture({ failOffsetY: [-100, 100], shouldCancelWhenOutside: false,
hitSlop: {...}, cancelsTouchesInView: false, maxPointers: 1, onActivate, onUpdate, onDeactivate,
onFinalize })`, `useTapGesture({ runOnJS: true, onDeactivate })`, `useExclusiveGestures(pan, tap)`;
delete the three `useMemo` wrappers and the `as unknown as GestureType` cast (`ComposedGesture`
type), keep `GestureDetector`. Renames per the upgrade guide: `onStart -> onActivate`, `onEnd ->
onDeactivate`, `onFinalize` unchanged, `success` -> `event.canceled` (inverted; Soli does not read it).

| Risk | Level | Detail |
| --- | --- | --- |
| **`minDistance` + `failOffsetY` is rejected by the hook** | **High (a real blocker, not a rename)** | `usePanGesture.ts validatePanConfig` throws `It is not supported to use minDistance with failOffsetX or failOffsetY, use activeOffsetX and activeOffsetY instead`. The builder silently accepted the combination. The scrubber must switch to `activeOffsetX: [-5, 5]` (horizontal-only activation) — arguably better for a horizontal scrubber, but it changes the feel for diagonal starts and needs Karim's thumb on both platforms. |
| Tap default change | Low | 3.3.0 made `useTapGesture` default `shouldCancelWhenOutside: true`; the builder Tap had the same native default, but verify the tap-to-undo still fires when the finger drifts over the 50 pt hit slop. |
| Composition semantics | Low | `useExclusiveGestures` maps 1:1 to `Gesture.Exclusive` (`useComposedGesture`, flattening only for same-type nesting). |
| `runOnJS: true` on the tap | Low | Exists as `CommonGestureConfig.runOnJS`; GH passes empty UI callbacks in that case (`useGestureCallbacks.ts:56-62`), same as today. |
| Config keys | None | `hitSlop`, `cancelsTouchesInView`, `shouldCancelWhenOutside`, `maxPointers`, `enabled` all exist in `ConfigTypes.ts` / `PanTypes.ts`. |
| Test coverage | Medium | No unit test exercises `useUndoScrubber` (only `undoHint.test.ts`). Device: `yarn scrubtest` + agent-device native pan on Android (>= 275 px, +/-1 jitter), iOS only via Appium `scripts/ios-scrub.js` (heavy, XCTest serialisation). A full D1 pass is 1-2 h of device time on both platforms. |
| Compiler interaction | None | The hook API is ordinary hooks; the compiler compiles them (the current `useMemo` builders compile too). |

Downsides of now: the activation-offset change is a *behaviour* change hidden inside a "mechanical
rename", the only automation on iOS is Appium, and GH 3.4 arrives via Expo anyway (another
re-validation). Downsides of later: none — deprecation is JSDoc only, the builder has no removal
date, and Expo SDK 59 will almost certainly still ship GH 3.x. **Recommendation: LATER**, as its
own small plan when the scrubber is next touched or when GH announces the removal — and NOT
bundled with the React Compiler flip or C5, so a scrubber regression is attributable to one
change. If done: convert `minDistance(5)` to `activeOffsetX: [-5, 5]` consciously, leave a
code comment explaining why, and run `yarn scrubtest` on both platforms plus a manual
diagonal-start feel check by Karim.

### Summary table for Karim's "are five and six low risk?"

| Item | Code risk | Hidden behaviour change | Test cost | Verdict |
| --- | --- | --- | --- | --- |
| C5 `runOnJS` -> `scheduleOnRN` (+ `runOnUI` -> `scheduleOnUI`) | Very low (one-line wrapper underneath) | None | 20 min (`scrubtest` + `celebration`) | Bundle with the compiler `.set()` edit, or do after the tree is committed |
| D1 GH hooks for the scrubber | Low for the renames, **high for `minDistance` -> `activeOffsetX`** (hook throws otherwise) | Yes: activation geometry | 1-2 h on two platforms (Appium on iOS) | LATER, standalone |
| React Compiler flag (E5) | Low (13 functions skipped = unchanged, 70 compiled with memos kept) | Possible: effects depending on unstable identities | Half a day (two Release builds + two playlists + gfxinfo/PSS) | Measured experiment only if the memo cleanup (D) is wanted; no perf problem today |

## Option D: manual memo removal (prompt 3)

Implementation sub-agent, 2026-10-19. Compiler ON since S11 (`app.json`
`experiments.reactCompiler: true`). Goal: delete the manual `useCallback`/`useMemo`/
`React.memo` the compiler makes redundant, keep behaviour identical, prove it in the
compiled output.

### What the compiler does — the short answer to "what does it even do?"

React re-runs a component function on every state change and, by default, re-runs all its
children too. Manual `useMemo`/`useCallback`/`React.memo` are the hand-written "only redo
this when its inputs changed" notes that stop that. The React Compiler is a Babel step that
writes those notes for you at build time: it splits each component/hook into "reactive
scopes" (a value and the inputs it is computed from), stores every scope's result in a
per-component cache array (`$[n]`), and on the next render re-computes a scope only if one
of its inputs changed (`Object.is`). JSX elements are values too, so a child whose props did
not change receives the very same element object and React skips it — that is what makes
`React.memo` redundant under a compiled parent. It does not make a single render faster,
does not touch Reanimated worklets or native code, and leaves any function that breaks the
Rules of React exactly as written (8 of Soli's 83 functions). The full deep dive is above
("React Compiler deep dive (prompt 2)").

### Removal rules (from react.dev, applied here)

| # | Rule | Source | How it was applied |
| --- | --- | --- | --- |
| R1 | Existing memoization may stay — the compiler preserves `useMemo`/`useCallback`/`React.memo` and only compiles a function if its inference "matches or exceeds" them; removal "can change compilation output", so remove only with testing | react.dev compiler intro FAQ "What should I do about useMemo, useCallback, and React.memo?"; `preserve-manual-memoization` lint reference | Every removal verified by compiling before/after (method below); device pass S16 |
| R2 | Keep `useMemo`/`useCallback` when the value is a `useEffect` dependency ("to ensure that an effect does not fire repeatedly") | same FAQ | 21 `useCallback`s kept — all (transitive) effect deps; `react-hooks/exhaustive-deps` enforces the same |
| R3 | `React.memo` is redundant when the parent is compiled: the parent caches the `<Child …/>` element, React bails out on identical elements | react.dev `memo` reference, "Do I still need React.memo if I use React Compiler?" | Removed on 10 single-instance components whose parents are compiled (`KlondikeGameView` → `TopRow`, `TableauSection`, `AbsoluteCardLayer`, `HintOverlayLayer`, `UndoScrubber`, `CelebrationDebugBadge`; `UndoScrubber` → `GestureWrapper`, `UndoHintBubble`, `GameNoticeBubble`; `AbsoluteCardLayer` → `WasteTapZone`) |
| R4 | Keep `React.memo` where no compiled parent caches the element: items created inside `.map`/`renderItem` (the compiler does not memoize per-iteration JSX), roots rendered by libraries | derived from R3's mechanism; react.dev `memo` "Skipping re-rendering" | Kept: `TableauColumn` (in `tableau.map`), `AbsoluteLayerCard` (skipped AND in `items.map`), `HistoryListItem` (FlatList row), `memo(HistoryScreen)` (expo-router) |
| R5 | Nothing inside a compiler-skipped function changes — there is no compiler memoization there | compiler `panicThreshold: none` semantics (deep dive) | 58 sites kept in `useUndoScrubber`, `useCelebrationController`, `useHint`, `useKlondikeHistoryEntry`, `useHistory` provider, `CascadeImprintLayer`, `AbsoluteLayerCard` |
| R6 | Values whose identity feeds non-React code (Reanimated hook args, worklet captures, GH gesture objects) must keep the same invalidation | debugging guide "code that relies on memoization for correctness" | Verified in compiled output: `CelebrationAtlas` worklet captures (`board`, `drawOrder`, `assignments`, `avalancheLaunch`, `sprites`) are cached; gesture objects live in the skipped `useUndoScrubber` (kept) |
| R7 | Expensive computations: fine to remove where the compiled output shows a cache slot; a primitive used only in expressions is NOT memoized by the compiler (and was not before either) | probe compile (`rc/probe/Probe.tsx`) + `useKlondikeGame` compiled output | `boardAvailableWidth`, `boardRowSettled`, `scrubSliderMax`-style primitives: removal is a no-op in the bundle |
| R8 | Lint stays green without rule changes: `react-hooks/exhaustive-deps` + `react/memo-dependencies` were clean before, so manual deps == inferred deps (no "extra dep to force re-run" tricks hide in memos) | oxlint probe | Confirms equivalence of invalidation after removal; the cascade in R2 is the one place lint pushes back |

### Verification method

1. `rc/compile-report2.js` — app-wide coverage (compiled / skipped) before and after:
   **75 / 8 → 75 / 8** (an intermediate 74 / 8 exposed `useSolvableDealSelector`, reverted).
2. `rc/compile-file.js <file> --events` — per function: `memoSlots`, `memoValues`,
   `prunedMemoBlocks/Values`, skips. After: no new skips, no new pruned blocks;
   `CelebrationAtlas` 1 → 0 pruned (hook reorder), `useUndoHint` keeps its pre-existing 1.
3. `rc/memo-map.js <file>` — every named value that lands in a cache slot with its guard
   (= inferred deps), diffed before/after per file. `useKlondikeGame`: 46 named values, all
   guards identical (only temp numbering shifted); `settings.tsx`, `useKlondikeTimer`
   (`useFocusEffect` arg cached on `pauseTimer || resumeTimerIfNeeded`), `useUndoHint`,
   `TopRow`, `TableauSection`, `HintOverlayLayer`, `UndoScrubber`, the bubbles, the app
   screens, `KlondikeGameView`/`Session`: identical. Deviations, each inspected in the raw
   compiled output: `BoardPreview.metrics` merged into the column-map scope (accepted);
   `CelebrationAtlas` `assignments/board/drawOrder/sprites/avalancheLaunch` cached in one
   15-dep scope (accepted — every extra trigger already re-registered the worklets);
   `AbsoluteCardLayer.items` merged into the JSX scope (REVERTED, memo restored);
   `useSolvableDealSelector` uncompiled (REVERTED).
4. Gates after every pass: `yarn typecheck`, `yarn lint` (0), `yarn lint:strict` (exit 0),
   `yarn jest --runInBand` (45 suites / 458), `oxfmt --check` on the 20 touched files.

### Numbers

- Sites: 170 = 125 `useCallback` + 31 `useMemo` + 14 `React.memo`/`memo`.
- **Removed 86**: 56 `useCallback`, 20 `useMemo`, 10 `React.memo`.
- **Kept 84**: 58 in skipped functions (47 `useCallback`, 10 `useMemo`, 1 `React.memo`);
  3 `React.memo` on list rows / router root (R4); 21 `useCallback` as effect-dep chains
  (R2 / lint: `useKlondikeGame` 10, `useDemoGameLauncher` 9, `UndoScrubber.measureTrack`,
  `index.tsx openDemoChoice`); 2 reverted after verification (`useSolvableDealSelector`,
  `AbsoluteCardLayer.items`).
- LOC: `git diff HEAD --numstat` over the 20 option-D files = +1,189 / −1,313, **net −124**
  (includes ~+35 lines of KEEP/why comments and the round-3 hunks in 4 shared files;
  pure memo-removal is roughly −170).
- Coverage 75 / 8 before and after. Gates green.

### Inventory (pre-change line numbers; decisions as finally applied)

| # | Site | Kind | Value | Enclosing fn | Compiler | Decision | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `src/features/klondike/components/BoardPreview.tsx:30` | useMemo | `metrics` | `BoardPreview` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 2 | `src/features/klondike/components/CelebrationDebugBadge.tsx:15` | memo | `CelebrationDebugBadge` | `CelebrationDebugBadge` | compiled | **REMOVE** | compiled component, single instance under a compiled parent (parent caches the element) |
| 3 | `src/features/klondike/components/GameNoticeBubble.tsx:36` | memo | `GameNoticeBubble` | `GameNoticeBubble` | compiled | **REMOVE** | compiled component, single instance under a compiled parent (parent caches the element) |
| 4 | `src/features/klondike/components/UndoHintBubble.tsx:21` | memo | `UndoHintBubble` | `UndoHintBubble` | compiled | **REMOVE** | compiled component, single instance under a compiled parent (parent caches the element) |
| 5 | `src/features/klondike/components/UndoScrubber.tsx:107` | memo | `GestureWrapper` | `GestureWrapper` | compiled | **REMOVE** | compiled component, single instance under a compiled parent (parent caches the element) |
| 6 | `src/features/klondike/components/UndoScrubber.tsx:154` | memo | `UndoScrubber` | `UndoScrubber` | compiled | **REMOVE** | compiled component, single instance under a compiled parent (parent caches the element) |
| 7 | `src/features/klondike/components/UndoScrubber.tsx:179` | useCallback | `measureTrack` | `UndoScrubber` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 8 | `src/features/klondike/components/UndoScrubber.tsx:192` | useCallback | `handleTrackLayout` | `UndoScrubber` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 9 | `src/features/klondike/components/cards/AbsoluteCardLayer.tsx:281` | memo | `AbsoluteCardLayer` | `AbsoluteCardLayer` | compiled | **REMOVE** | compiled component, single instance under a compiled parent (parent caches the element) |
| 10 | `src/features/klondike/components/cards/AbsoluteCardLayer.tsx:302` | useMemo | `wasteTapTarget` | `AbsoluteCardLayer` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 11 | `src/features/klondike/components/cards/AbsoluteCardLayer.tsx:313` | useMemo | `items` | `AbsoluteCardLayer` | compiled | **KEEP** | KEPT after verification: the compiler merged the items rebuild into the `items.map` JSX scope (deps incl. invalidWiggle/animationResetKey/handlers) — every wiggle or new deal would rebuild 52 items; the manual memo pins the finer scope |
| 12 | `src/features/klondike/components/cards/AbsoluteCardLayer.tsx:456` | memo | `AbsoluteLayerCard` | `AbsoluteLayerCard` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 13 | `src/features/klondike/components/cards/AbsoluteCardLayer.tsx:711` | memo | `WasteTapZone` | `WasteTapZone` | compiled | **REMOVE** | compiled component, single instance under a compiled parent (parent caches the element) |
| 14 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:218` | useCallback | `handleWrapperLayout` | `CelebrationAtlas` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 15 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:254` | useMemo | `atlasSize` | `CelebrationAtlas` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 16 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:266` | useCallback | `cellOrigin` | `CelebrationAtlas` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 17 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:274` | useMemo | `atlasElement` | `CelebrationAtlas` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 18 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:425` | useMemo | `assignments` | `CelebrationAtlas` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 19 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:463` | useMemo | `board` | `CelebrationAtlas` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 20 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:492` | useMemo | `drawOrder` | `CelebrationAtlas` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 21 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:512` | useMemo | `sprites` | `CelebrationAtlas` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 22 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:525` | useMemo | `avalancheLaunch` | `CelebrationAtlas` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 23 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:940` | useMemo | `slotByLaunchOrder` | `CascadeImprintLayer` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 24 | `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx:956` | useMemo | `stampState` | `CascadeImprintLayer` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 25 | `src/features/klondike/components/cards/HintOverlayLayer.tsx:294` | memo | `HintOverlayLayer` | `HintOverlayLayer` | compiled | **REMOVE** | compiled component, single instance under a compiled parent (parent caches the element) |
| 26 | `src/features/klondike/components/cards/HintOverlayLayer.tsx:300` | useMemo | `rects` | `HintOverlayLayer` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 27 | `src/features/klondike/components/cards/TableauSection.tsx:34` | memo | `TableauSection` | `TableauSection` | compiled | **REMOVE** | compiled component, single instance under a compiled parent (parent caches the element) |
| 28 | `src/features/klondike/components/cards/TableauSection.tsx:47` | useCallback | `handleRowLayout` | `TableauSection` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 29 | `src/features/klondike/components/cards/TableauSection.tsx:95` | memo | `TableauColumn` | `TableauColumn` | compiled | **KEEP** | rendered inside tableau.map — the compiler does not memoize per-iteration JSX, so memo still spares 7 column renders per tableau change |
| 30 | `src/features/klondike/components/cards/TopRow.tsx:88` | memo | `TopRow` | `TopRow` | compiled | **REMOVE** | compiled component, single instance under a compiled parent (parent caches the element) |
| 31 | `src/features/klondike/components/cards/TopRow.tsx:109` | useCallback | `handleRowLayout` | `TopRow` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 32 | `src/features/klondike/components/cards/TopRow.tsx:116` | useCallback | `createFoundationLayoutHandler` | `TopRow` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 33 | `src/features/klondike/hooks/useCelebrationController.ts:192` | useMemo | `celebrationBindings` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 34 | `src/features/klondike/hooks/useCelebrationController.ts:209` | useCallback | `clearCelebrationDialogTimer` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 35 | `src/features/klondike/hooks/useCelebrationController.ts:216` | useCallback | `clearCelebrationStartTimer` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 36 | `src/features/klondike/hooks/useCelebrationController.ts:223` | useCallback | `clearCelebrationFallbackTimer` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 37 | `src/features/klondike/hooks/useCelebrationController.ts:230` | useCallback | `logCelebrationHandoff` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 38 | `src/features/klondike/hooks/useCelebrationController.ts:237` | useCallback | `openCelebrationDialog` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 39 | `src/features/klondike/hooks/useCelebrationController.ts:246` | useCallback | `handleCelebrationComplete` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 40 | `src/features/klondike/hooks/useCelebrationController.ts:271` | useCallback | `computeCelebrationCardBase` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 41 | `src/features/klondike/hooks/useCelebrationController.ts:288` | useCallback | `buildCelebrationState` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 42 | `src/features/klondike/hooks/useCelebrationController.ts:346` | useCallback | `startPendingCelebration` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 43 | `src/features/klondike/hooks/useCelebrationController.ts:390` | useCallback | `clearCelebrationAnimations` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 44 | `src/features/klondike/hooks/useCelebrationController.ts:428` | useCallback | `handleCelebrationOverlayReady` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 45 | `src/features/klondike/hooks/useCelebrationController.ts:432` | useCallback | `handleCelebrationAbort` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 46 | `src/features/klondike/hooks/useCelebrationController.ts:456` | useCallback | `scheduleCelebrationStart` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 47 | `src/features/klondike/hooks/useCelebrationController.ts:472` | useCallback | `scheduleCelebrationFallback` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 48 | `src/features/klondike/hooks/useCelebrationController.ts:488` | useCallback | `handleWinningCardFlightSettled` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 49 | `src/features/klondike/hooks/useCelebrationController.ts:614` | useCallback | `cycleCelebrationMode` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 50 | `src/features/klondike/hooks/useCelebrationController.ts:644` | useCallback | `startCelebrationPreview` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 51 | `src/features/klondike/hooks/useCelebrationController.ts:713` | useMemo | `celebrationLabel` | `useCelebrationController` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 52 | `src/features/klondike/hooks/useDemoGameLauncher.ts:377` | useCallback | `clearPlaylistTimers` | `useDemoGameLauncher` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 53 | `src/features/klondike/hooks/useDemoGameLauncher.ts:384` | useCallback | `schedulePlaylistTimer` | `useDemoGameLauncher` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 54 | `src/features/klondike/hooks/useDemoGameLauncher.ts:408` | useCallback | `resetDemoRuntimeState` | `useDemoGameLauncher` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 55 | `src/features/klondike/hooks/useDemoGameLauncher.ts:422` | useCallback | `failPlaylist` | `useDemoGameLauncher` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 56 | `src/features/klondike/hooks/useDemoGameLauncher.ts:436` | useCallback | `waitForPlaylistState` | `useDemoGameLauncher` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 57 | `src/features/klondike/hooks/useDemoGameLauncher.ts:470` | useCallback | `runDemoPlaylist` | `useDemoGameLauncher` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 58 | `src/features/klondike/hooks/useDemoGameLauncher.ts:715` | useCallback | `runDemoSequence` | `useDemoGameLauncher` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 59 | `src/features/klondike/hooks/useDemoGameLauncher.ts:805` | useCallback | `handleLaunchDemoGame` | `useDemoGameLauncher` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 60 | `src/features/klondike/hooks/useDemoGameLauncher.ts:924` | useCallback | `processDemoLink` | `useDemoGameLauncher` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 61 | `src/features/klondike/hooks/useHint.ts:196` | useCallback | `setDeadEra` | `useHint` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 62 | `src/features/klondike/hooks/useHint.ts:219` | useCallback | `drainSolveQueue` | `useHint` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 63 | `src/features/klondike/hooks/useHint.ts:235` | useCallback | `enqueueSolve` | `useHint` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 64 | `src/features/klondike/hooks/useHint.ts:250` | useCallback | `makeSolveTask` | `useHint` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 65 | `src/features/klondike/hooks/useHint.ts:282` | useCallback | `showNotice` | `useHint` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 66 | `src/features/klondike/hooks/useHint.ts:299` | useCallback | `fireWarning` | `useHint` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 67 | `src/features/klondike/hooks/useHint.ts:315` | useCallback | `applyHintHighlight` | `useHint` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 68 | `src/features/klondike/hooks/useHint.ts:331` | useCallback | `showClassicFallback` | `useHint` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 69 | `src/features/klondike/hooks/useHint.ts:411` | useCallback | `requestHint` | `useHint` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 70 | `src/features/klondike/hooks/useHint.ts:499` | useCallback | `handleBackgroundResult` | `useHint` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 71 | `src/features/klondike/hooks/useHint.ts:643` | useMemo | `warningText` | `useHint` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 72 | `src/features/klondike/hooks/useKlondikeGame.ts:171` | useMemo | `boardAvailableWidth` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 73 | `src/features/klondike/hooks/useKlondikeGame.ts:178` | useMemo | `cardMetrics` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 74 | `src/features/klondike/hooks/useKlondikeGame.ts:237` | useMemo | `dropHints` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 75 | `src/features/klondike/hooks/useKlondikeGame.ts:248` | useMemo | `headerPadding` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 76 | `src/features/klondike/hooks/useKlondikeGame.ts:275` | useCallback | `updateBoardLocked` | `useKlondikeGame` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 77 | `src/features/klondike/hooks/useKlondikeGame.ts:283` | useCallback | `mergeCardLayerLayout` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 78 | `src/features/klondike/hooks/useKlondikeGame.ts:297` | useCallback | `handleTopRowLayout` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 79 | `src/features/klondike/hooks/useKlondikeGame.ts:306` | useCallback | `handleFoundationLayout` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 80 | `src/features/klondike/hooks/useKlondikeGame.ts:323` | useCallback | `handleStockLayout` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 81 | `src/features/klondike/hooks/useKlondikeGame.ts:328` | useCallback | `handleWasteLayout` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 82 | `src/features/klondike/hooks/useKlondikeGame.ts:333` | useCallback | `handleTableauRowLayout` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 83 | `src/features/klondike/hooks/useKlondikeGame.ts:338` | useCallback | `handleTableauColumnLayout` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 84 | `src/features/klondike/hooks/useKlondikeGame.ts:381` | useCallback | `createFreshGameState` | `useKlondikeGame` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 85 | `src/features/klondike/hooks/useKlondikeGame.ts:442` | useCallback | `dealNewGame` | `useKlondikeGame` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 86 | `src/features/klondike/hooks/useKlondikeGame.ts:510` | useMemo | `boardRowSettled` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 87 | `src/features/klondike/hooks/useKlondikeGame.ts:524` | useMemo | — | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 88 | `src/features/klondike/hooks/useKlondikeGame.ts:570` | useCallback | `dispatchGameAction` | `useKlondikeGame` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 89 | `src/features/klondike/hooks/useKlondikeGame.ts:591` | useCallback | `performDealAgain` | `useKlondikeGame` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 90 | `src/features/klondike/hooks/useKlondikeGame.ts:616` | useCallback | `dealNewGameForTesting` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 91 | `src/features/klondike/hooks/useKlondikeGame.ts:624` | useCallback | `startGameFromExactDeal` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 92 | `src/features/klondike/hooks/useKlondikeGame.ts:675` | useCallback | `triggerInvalidSelectionWiggle` | `useKlondikeGame` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 93 | `src/features/klondike/hooks/useKlondikeGame.ts:700` | useCallback | `notifyInvalidMove` | `useKlondikeGame` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 94 | `src/features/klondike/hooks/useKlondikeGame.ts:718` | useCallback | `handleBoardLayout` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 95 | `src/features/klondike/hooks/useKlondikeGame.ts:730` | useCallback | `handleDraw` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 96 | `src/features/klondike/hooks/useKlondikeGame.ts:740` | useCallback | `handleUndo` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 97 | `src/features/klondike/hooks/useKlondikeGame.ts:763` | useCallback | `requestNewGame` | `useKlondikeGame` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 98 | `src/features/klondike/hooks/useKlondikeGame.ts:805` | useCallback | `requestPlayDeal` | `useKlondikeGame` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 99 | `src/features/klondike/hooks/useKlondikeGame.ts:862` | useCallback | `attemptAutoMoveFromState` | `useKlondikeGame` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 100 | `src/features/klondike/hooks/useKlondikeGame.ts:886` | useCallback | `attemptAutoMove` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 101 | `src/features/klondike/hooks/useKlondikeGame.ts:893` | useCallback | `handleWasteTap` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 102 | `src/features/klondike/hooks/useKlondikeGame.ts:973` | useCallback | `handleFoundationPress` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 103 | `src/features/klondike/hooks/useKlondikeGame.ts:1053` | useCallback | `handleTableauCardPress` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 104 | `src/features/klondike/hooks/useKlondikeGame.ts:1114` | useCallback | `requestNewGameFromDock` | `useKlondikeGame` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 105 | `src/features/klondike/hooks/useKlondikeHistoryEntry.ts:119` | useCallback | `clearPendingSolvedResultTimer` | `useKlondikeHistoryEntry` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 106 | `src/features/klondike/hooks/useKlondikeHistoryEntry.ts:129` | useCallback | `recordStartedGame` | `useKlondikeHistoryEntry` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 107 | `src/features/klondike/hooks/useKlondikeHistoryEntry.ts:211` | useCallback | `recordCurrentGameResult` | `useKlondikeHistoryEntry` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 108 | `src/features/klondike/hooks/useKlondikeHistoryEntry.ts:351` | useCallback | `flushPendingSolvedResultAfterHandoff` | `useKlondikeHistoryEntry` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 109 | `src/features/klondike/hooks/useKlondikeHistoryEntry.ts:376` | useCallback | `clearCurrentGameEntryLink` | `useKlondikeHistoryEntry` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 110 | `src/features/klondike/hooks/useKlondikeTimer.ts:27` | useCallback | `pauseTimer` | `useKlondikeTimer` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 111 | `src/features/klondike/hooks/useKlondikeTimer.ts:34` | useCallback | `resumeTimerIfNeeded` | `useKlondikeTimer` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 112 | `src/features/klondike/hooks/useKlondikeTimer.ts:55` | useCallback | — | `useKlondikeTimer` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 113 | `src/features/klondike/hooks/useSolvableDealSelector.ts:62` | useCallback | — | `useSolvableDealSelector` | compiled | **KEEP** | KEPT after verification: a `use*` function with no other hook call is not compiled in `infer` mode — without the useCallback the hook was left uncompiled (coverage 75 → 74) and returned a fresh function per render |
| 114 | `src/features/klondike/hooks/useUndoHint.ts:42` | useCallback | `persistTracker` | `useUndoHint` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 115 | `src/features/klondike/hooks/useUndoHint.ts:52` | useCallback | `dismissUndoHint` | `useUndoHint` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 116 | `src/features/klondike/hooks/useUndoHint.ts:68` | useCallback | `noteUndoSuccess` | `useUndoHint` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 117 | `src/features/klondike/hooks/useUndoHint.ts:91` | useCallback | `noteStreakBreak` | `useUndoHint` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 118 | `src/features/klondike/hooks/useUndoHint.ts:101` | useCallback | `noteScrubEnd` | `useUndoHint` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 119 | `src/features/klondike/hooks/useUndoHint.ts:115` | useCallback | `noteNewDeal` | `useUndoHint` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 120 | `src/features/klondike/hooks/useUndoHint.ts:123` | useCallback | `resetUndoHintForTesting` | `useUndoHint` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 121 | `src/features/klondike/hooks/useUndoScrubber.ts:234` | useCallback | `cancelScheduledScrub` | `useUndoScrubber` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 122 | `src/features/klondike/hooks/useUndoScrubber.ts:261` | useMemo | `scrubSliderMax` | `useUndoScrubber` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 123 | `src/features/klondike/hooks/useUndoScrubber.ts:263` | useCallback | `handleTrackMetrics` | `useUndoScrubber` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 124 | `src/features/klondike/hooks/useUndoScrubber.ts:274` | useCallback | `scheduleScrubDispatch` | `useUndoScrubber` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 125 | `src/features/klondike/hooks/useUndoScrubber.ts:315` | useCallback | `beginScrubSession` | `useUndoScrubber` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 126 | `src/features/klondike/hooks/useUndoScrubber.ts:326` | useCallback | `finishScrubSession` | `useUndoScrubber` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 127 | `src/features/klondike/hooks/useUndoScrubber.ts:343` | useCallback | `handleTapEnd` | `useUndoScrubber` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 128 | `src/features/klondike/hooks/useUndoScrubber.ts:349` | useMemo | `undoTapGesture` | `useUndoScrubber` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 129 | `src/features/klondike/hooks/useUndoScrubber.ts:358` | useMemo | `undoPanGesture` | `useUndoScrubber` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 130 | `src/features/klondike/hooks/useUndoScrubber.ts:457` | useMemo | `undoScrubGesture` | `useUndoScrubber` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 131 | `src/navigation/useDrawerOpener.ts:17` | useCallback | — | `useDrawerOpener` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 132 | `src/state/history.tsx:217` | useCallback | `refreshMetadata` | `HistoryProvider` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 133 | `src/state/history.tsx:231` | useCallback | `reconcileLoadedHistory` | `HistoryProvider` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 134 | `src/state/history.tsx:250` | useCallback | `queueRepositoryTask` | `HistoryProvider` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 135 | `src/state/history.tsx:278` | useCallback | `recordResult` | `HistoryProvider` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 136 | `src/state/history.tsx:297` | useCallback | `updateEntry` | `HistoryProvider` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 137 | `src/state/history.tsx:341` | useCallback | `clearHistory` | `HistoryProvider` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 138 | `src/state/history.tsx:354` | useCallback | `seedHistoryForTesting` | `HistoryProvider` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 139 | `src/state/history.tsx:368` | useCallback | `getActiveEntry` | `HistoryProvider` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 140 | `src/state/history.tsx:376` | useCallback | `loadMore` | `HistoryProvider` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 141 | `src/state/history.tsx:408` | useMemo | `value` | `HistoryProvider` | SKIPPED | **KEEP** | inside a compiler-skipped function (no compiler memoization there) |
| 142 | `src/state/settings.tsx:296` | useCallback | `setDrawCount` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 143 | `src/state/settings.tsx:302` | useCallback | `setGlobalAnimationsEnabled` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 144 | `src/state/settings.tsx:316` | useCallback | `setAnimationPreference` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 145 | `src/state/settings.tsx:348` | useCallback | `setSolvableGamesOnly` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 146 | `src/state/settings.tsx:356` | useCallback | `setAutoUpEnabled` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 147 | `src/state/settings.tsx:364` | useCallback | `setWarningMode` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 148 | `src/state/settings.tsx:377` | useCallback | `setHintButtonEnabled` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 149 | `src/state/settings.tsx:387` | useCallback | `setDeveloperMode` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 150 | `src/state/settings.tsx:395` | useCallback | `setStatisticsPreference` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 151 | `src/state/settings.tsx:414` | useCallback | `setScoringMode` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 152 | `src/state/settings.tsx:422` | useCallback | `setVegasTotalEnabled` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 153 | `src/state/settings.tsx:430` | useCallback | `setVegasTotalOffset` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 154 | `src/state/settings.tsx:445` | useMemo | `value` | `SettingsProvider` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 155 | `src/state/settings.tsx:494` | useMemo | — | `useAnimationToggles` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 156 | `app/(tabs)/history.tsx:70` | useCallback | `handleEndReached` | `HistoryScreen` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 157 | `app/(tabs)/history.tsx:79` | useMemo | `listHeader` | `HistoryScreen` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 158 | `app/(tabs)/history.tsx:96` | useMemo | `loadingFooter` | `HistoryScreen` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 159 | `app/(tabs)/history.tsx:231` | memo | `HistoryListItem` | `HistoryListItem` | compiled | **KEEP** | FlatList renderItem row — created by RN VirtualizedList internals (non-compiled), memo is the only bailout |
| 160 | `app/(tabs)/history.tsx:233` | useCallback | `onPress` | `HistoryListItem` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 161 | `app/(tabs)/history.tsx:393` | useCallback | `handleRetry` | `HistoryPreviewSheet` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 162 | `app/(tabs)/history.tsx:413` | useCallback | `handleShare` | `HistoryPreviewSheet` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 163 | `app/(tabs)/history.tsx:515` | memo | `HistoryScreen` | `(anon)` | no fn | **KEEP** | screen root rendered by expo-router (non-compiled parent) |
| 164 | `app/(tabs)/index.tsx:33` | useCallback | `openDemoChoice` | `TabOneScreen` | compiled | **KEEP** | KEPT after verification: (transitive) dependency of a useEffect/useLayoutEffect — react.dev names effect deps as the case to keep useCallback, and react-hooks/exhaustive-deps flags a plain function in a dependency list as "changes every render" |
| 165 | `app/(tabs)/index.tsx:37` | useCallback | `handleDemoChoice` | `TabOneScreen` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 166 | `app/(tabs)/index.tsx:45` | useCallback | `handleStartCelebration` | `TabOneScreen` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 167 | `app/(tabs)/index.tsx:58` | useCallback | `handleResetUndoHint` | `TabOneScreen` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 168 | `app/(tabs)/index.tsx:63` | useCallback | `handleSeedHistory` | `TabOneScreen` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 169 | `app/(tabs)/index.tsx:71` | useCallback | `closeDemoChoice` | `TabOneScreen` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
| 170 | `app/(tabs)/settings.tsx:56` | useCallback | `confirmResetVegasTotal` | `SettingsScreen` | compiled | **REMOVE** | compiled function; compiler memoizes it with the same deps (lint-verified complete, no extra deps) |
