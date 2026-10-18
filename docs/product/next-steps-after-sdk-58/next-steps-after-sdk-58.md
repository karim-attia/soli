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

## Summary

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

## Files actually modified

- `docs/product/next-steps-after-sdk-58/next-steps-after-sdk-58.md` (this file).
- Round 2: `package.json` (oxlint 1.88.0, agent-device 0.21.28, `lint:strict` config-driven,
  script `agent-device` → `ad`), `yarn.lock`, `.oxlintrc.json` (six React Compiler rules off +
  JSONC comment), `.agents/skills/soli-testing/SKILL.md`, `docs/external-package-guides/oxlint.md`,
  `agent-device.md`, `appium.md` (legacy note), `yarn agent-device` → `yarn ad` in
  `docs/product/{store-screenshots,tamagui-3-upgrade,celebration-skia-atlas,expo-rn-sdk-58-upgrade,agent-testing-skill}/*.md`.
  Evidence screenshots: `.test-artifacts/agent-device-upgrade/`.

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

- `expo-router 58` now depends on `expo-glass-effect` directly (`node_modules/expo-router/package.json`),
  used by its native-stack header (`useHeaderConfigProps.js`); Soli's Drawer headers do not go
  through that path.
- `babel-preset-expo 58` lists `expo-widgets ^58.0.20` as a peer (optional) — widgets are compiled
  through the preset.
- RN 0.88 still pins NDK `27.1.12297006` and expo-modules-core defaults `minSdkVersion 24`
  (`ExpoModulesCorePlugin.gradle:68`); the Rust solver script's values are right, its comments cite
  RN 0.86.
- `@expo/material-symbols` ships only weight 400; Karim's drawer decision is weight 300, vendored.

## Identified issues

- None new; see A20 for the pre-existing dev Demo sheet layout bug on Android.
- Round 2: cross-repo agent-device version split (soli 0.21.28 vs invent ^0.19.3) — see learnings;
  resolve by bumping invent. SKILL.md still cites the iOS 26.5 sim in one troubleshooting row
  (devicectl install quirk) — left as history, the row's advice (install by hand) still holds.

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

## Follow-ups

See sections A-E; this document *is* the follow-up list. Added by round 2:

- **Delete the Appium iOS scrub path** (`scripts/ios-scrub.js` ~250 LOC, `appium.md`, SKILL
  mentions): agent-device 0.21.28 scrubs on iOS. Pro: -1 tool, -1 guide, simpler §6. Con: no
  fallback if a future agent-device regresses iOS pans (would be caught by the next
  scrubber-touching task). Recommendation: delete at the next scrubber task.
- **Bump invent to agent-device 0.21.28** so both repos share one daemon version (hazard above).
- **React Compiler pass (A11)**: start from the six disabled oxlint rules — run
  `yarn oxlint -W react/immutability -W react/refs -W react/set-state-in-effect -W react/exhaustive-effect-dependencies -W react/capitalized-calls -W react/globals src` for the bail-out map.
- **oxfmt 0.54 → 0.73** right after Karim's commit (B1), own commit for the reformat.

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
