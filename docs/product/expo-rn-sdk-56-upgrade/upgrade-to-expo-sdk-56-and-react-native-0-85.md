# Expo/RN SDK 56 Upgrade Upgrade to Latest Expo and React Native

## User prompt

### Prompt 1

~~~text
<turn_aborted>
The user interrupted the previous turn on purpose. Any running unified exec processes may still be running in the background. If any tools/commands were aborted, they may have partially executed.
</turn_aborted>
~~~

### Prompt 2

~~~text
# AGENTS.md instructions for /Users/karim/kDrive/Code/soli

<INSTRUCTIONS>
# General

Use web search to research a tool, library, pattern, etc. to see how others do something.

Compatibility notice (explicit): This repo makes NO backward-compatibility guarantees. Breaking changes to are allowed and expected.

Leave small documentation notes throughout the app to better understand reasons why we did something in a certain way. E.g. we do this this way instead of that way because we learned if we do it that way, we will run into issue X.

# Implementation plan

Create a detailed implementation plan for every feature. IF THERE IS NO IMPLEMENTATION PLAN, SEARCH FOR AN EXISTING ONE.

Create a folder @docs/product/<feature-name> if it doesn't exist yet.

Create a markdown file in the folder with the name of the story.

Fill in the following sections:
- # [Feature Name] [Story Name]
- ## User prompt
Add all prompts from the chat 1:1 in here.
- ## Description
- ## Acceptance Criteria -> add more details than in the product document if it makes sense
- ## Design links
- ## Possible approaches incl. pros and cons
- ## Open questions to the user incl. recommendations (if any)
- ## New dependencies
Follow @external-packages.mdc for new dependencies.
- ## UX/UI Considerations
- ## Components -> Which components to reuse, which components to create?
- ## How to fetch data, how to cache
- ## Related tasks
- ## Steps to implement and status of these steps
- ## Plan: Files to modify
- ## Files actually modified
- ## Identified issues and status of these issues
- ## Testing
One option: Test on http://localhost:8081/ - usually, expo web is running, if not start it with `yarn web`.

Directly start implementing except if the user asks for a different approach. But always create a detailed implementation plan before starting to implement.

Update the status of the steps after the implementation of each step. NEVER SKIP THIS!

# Scope Limitations

> Rationale: Prevents unnecessary work and keeps all efforts focused on agreed tasks, avoiding gold plating and scope creep.

- No gold plating or scope creep is allowed.
- All work must be scoped to the specific task at hand.
- Any identified improvements or optimizations must be proposed as separate tasks.


# Testing

Test everything you do in a real environment. In order to save context, always use sub-agents to test. Use GPT 5.5 medium reasoning for the testing sub-agent. Give detailed testing instructions and get a detailed test report, though. Also don't run two of these sub-agents in parallel if they will run a build. Reason: See below.

Native: Use agent-device skill
Web: Use Playwright with skill

iOS: Always run a clean build on the connected simulator. Make sure the build is finished before checking on the device.
Android: Run "yarn release" and wait until the build is complete. Use scripts/android-unlock-pattern.sh script to unlock physical Android device if it's locked.

Never run two builds at the same time as otherwise the computer nearly crashes when running builds in parallel, e.g. iOS and Android in parallel. Also check if there are other processes running a build and kill them first. If there is already a build running, this is no excuse to not run the build and test on an outdated build. Kill the other build first, then build, then test.

Check if the build was actually installed on the device or the device/emulator.

# Components

Use tamagui components for all UI elements.

-> to write: components in component folder, create component there with defaults instead of directly using tamagui components in the screen.

# External packages

**External Package Research and Documentation**: For any proposed tasks that involve external packages, to avoid hallucinations, use the web to research the documentation first to ensure it's 100% clear how to use the API of the package. Then for each package, a document should be created `<feature-name>-<package>-guide.md` that contains a fresh cache of the information needed to use the API. It should be date-stamped and link to the original docs provided. E.g., if pg-boss is a library to add as part of task 2-1 then a file `tasks/2-1-pg-boss-guide.md` should be created. This documents foundational assumptions about how to use the package, with example snippets, in the language being used in the project.

</INSTRUCTIONS><environment_context>
  <cwd>/Users/karim/kDrive/Code/soli</cwd>
  <shell>zsh</shell>
  <current_date>2026-06-14</current_date>
  <timezone>Europe/Zurich</timezone>
  <filesystem><workspace_roots><root>/Users/karim/kDrive/Code/soli</root></workspace_roots><permission_profile type="disabled"><file_system type="unrestricted" /></permission_profile></filesystem>
</environment_context>
~~~

### Prompt 3

~~~text
Search web and make a plan to upgrade to latest Expo & react native
~~~

### Prompt 4

~~~text
check if there is an updated skill available for this. then run upgrade.
~~~

## Description

Create a researched implementation plan to move Soli from the current Expo SDK 55
stack to the latest stable Expo SDK and React Native stack as of June 14, 2026.

Current repo state:

- `expo`: `~55.0.26`
- `react-native`: `0.83.6`
- `react`: `19.2.0`
- `react-dom`: `19.2.0`
- `react-native-web`: `^0.21.2`
- `expo-router`: `~55.0.16`
- Node in the local shell: `v25.9.0`
- Package manager: `yarn@4.12.0`
- No checked-in `ios/` or `android/` native directories were found, so this appears
  to be a Continuous Native Generation style Expo project.

Researched target:

- Expo SDK 56 is the latest stable SDK line according to Expo's SDK 56 changelog
  and latest SDK reference.
- Expo SDK 56 bundles React Native `0.85`, React `19.2.3`, React Native Web
  `0.21.0`, and requires at least Node `22.13.x`.
- React Native `0.85` is the current stable React Native release according to the
  React Native versions page.
- SDK 56 raises the iOS/tvOS minimum to `16.4`, uses Android compile/target SDK
  `36`, and requires Xcode `26.4+`.

The upgrade should be handled as a real platform migration, not just a version bump.
Soli already uses Expo Router and has application imports from `@react-navigation/*`;
SDK 56 changes Expo Router's relationship with React Navigation and warns about
that pairing. Soli also has one direct `StyleSheet.absoluteFillObject` usage, which
React Native 0.85 removed.

## Acceptance Criteria

- The app is upgraded from Expo SDK 55 to the current stable SDK 56 package set using
  Expo's official upgrade flow.
- `package.json` and `yarn.lock` align with the SDK 56 dependency matrix selected by
  `npx expo install expo@^56.0.0 --fix`.
- The app uses the Expo-supported React Native and React versions for SDK 56:
  `react-native@0.85.x`, `react@19.2.3`, and matching `react-dom`,
  `@types/react`, `jest-expo`, `@expo/metro-runtime`, and Expo module versions.
- The current local Node `v25.9.0` remains acceptable for SDK 56 and RN 0.85. If a
  build environment uses older Node, it must be updated to at least Expo's minimum
  `22.13.x` before native builds.
- Xcode is checked before implementation. If it is below `26.4`, upgrade Xcode before
  iOS validation.
- The iOS minimum OS bump to `16.4` is accepted and documented because it drops older
  devices. If that is unacceptable, the upgrade must stop at SDK 55.
- All application-code imports from `@react-navigation/*` are removed or migrated to
  SDK 56 Expo Router entry points. Known current hits:
  - `app/_layout.tsx`
  - `app/(tabs)/index.tsx`
  - `src/navigation/useDrawerOpener.ts`
  - `src/features/klondike/hooks/useKlondikeTimer.ts`
- Direct `@react-navigation/native`, `@react-navigation/elements`, and related
  dependencies are removed only after verifying no app code or supported SDK 56
  Expo Router API still requires them directly.
- `app/(tabs)/two.tsx` no longer uses `StyleSheet.absoluteFillObject`; use
  `StyleSheet.absoluteFill` or an explicit local absolute-fill style instead.
- `expo-doctor@latest` passes. Any warning for `expo-router` plus React Navigation
  must be resolved or explicitly documented with a short rationale.
- `npx expo install --check` passes after dependency alignment.
- `yarn typecheck`, `yarn lint`, `yarn format:check`, and the Jest suite pass or have
  documented, scoped follow-up issues if an existing unrelated failure is found.
- `yarn web` serves the app on `http://localhost:8081/`, and Expo web is tested in a
  real browser through the main Solitaire flow, settings, history, drawer, and header
  controls.
- A clean iOS build is created and installed on the connected simulator before iOS
  testing. Do not reuse an older installed build.
- A fresh Android release build is created with `yarn release`, installed on the
  device/emulator, and tested after the build completes.
- iOS and Android native builds are never run concurrently.
- Visual and interaction parity are maintained for the card board, stock/waste,
  tableau dragging/tapping, auto-up, win state, drawer, settings, history, and reduced
  motion behavior.
- No React Compiler enablement, Expo UI adoption, new navigation model, or design
  refresh is included in the core upgrade unless separately approved.

## Design links

Primary sources researched on 2026-06-14:

- Expo SDK 56 changelog: https://expo.dev/changelog/sdk-56
- Expo SDK reference matrix: https://docs.expo.dev/versions/latest/
- Expo SDK upgrade walkthrough: https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- Expo Router SDK 55 to 56 migration guide: https://docs.expo.dev/router/migrate/sdk-55-to-56/
- Expo New Architecture guide: https://docs.expo.dev/guides/new-architecture/
- React Native versions page: https://reactnative.dev/versions
- React Native 0.85 release post: https://reactnative.dev/blog/2026/04/07/react-native-0.85
- React Native upgrading docs: https://reactnative.dev/docs/upgrading
- React 19.2 release post: https://react.dev/blog/2025/10/01/react-19-2

Local package research notes:

- `expo-rn-sdk-56-expo-guide.md`
- `expo-rn-sdk-56-react-native-guide.md`
- `expo-rn-sdk-56-react-native-jest-preset-guide.md`
- `expo-rn-sdk-56-react-guide.md`
- `expo-rn-sdk-56-expo-router-guide.md`

No product design links are required because this upgrade should not intentionally
change UI design.

## Possible approaches incl. pros and cons

### 1. Upgrade only Expo packages and let compile errors reveal issues

Pros:

- Fastest first attempt.
- Lets Expo's dependency solver choose exact package versions.

Cons:

- Known SDK 56 breaking changes would fail late.
- React Navigation import errors and `StyleSheet.absoluteFillObject` removal are
  already visible, so ignoring them would waste build time.
- Harder to tell whether failures are dependency alignment, router migration, or
  platform toolchain problems.

### 2. Dependency alignment plus targeted known migrations

Pros:

- Uses the official Expo upgrade path.
- Keeps the change narrow: package alignment, Router import migration, removed RN
  style API, and validation.
- Fits Soli's current codebase because there are only a handful of known app-code
  incompatibilities.
- Avoids bundling optional SDK 56 feature adoption into the upgrade.

Cons:

- Still requires full native rebuilds because RN, Hermes, Expo modules, and router
  internals change.
- May reveal third-party New Architecture or Expo Doctor warnings that need follow-up.

### 3. Upgrade and adopt optional SDK 56 features in the same change

Examples: React Compiler, Expo UI, new Expo Router SSR fallbacks, Android toolbar,
or replacing navigation patterns.

Pros:

- Takes advantage of more SDK 56 features immediately.

Cons:

- Scope creep.
- Makes regressions harder to attribute.
- React Compiler and Expo UI can change runtime/performance/UI behavior and deserve
  their own acceptance criteria and testing.

### Recommendation

Use approach 2.

1. Upgrade Expo SDK and its version-aligned package set.
2. Migrate known SDK 56 breakpoints in app code.
3. Run Expo diagnostics and automated checks.
4. Validate web, iOS, and Android from fresh builds.
5. Spin optional SDK 56 feature adoption into separate tasks only after the baseline
   upgrade is green.

## Open questions to the user incl. recommendations (if any)

- SDK 56 raises the iOS minimum to `16.4`.
  Decision: accepted by the user on 2026-06-14.
- Expo Go for SDK 56 is not generally available through the normal app stores per the
  SDK 56 changelog.
  Recommendation: use development builds and release builds for validation, not Expo Go.
- React Compiler is stable and recommended by the local Expo upgrade skill, but it is
  not required for the SDK 56 upgrade.
  Recommendation: defer React Compiler to a separate follow-up after the SDK 56
  baseline is green.
- SDK 56's `npx expo install --fix` may move TypeScript toward Expo's current template
  version. This repo also uses `@typescript/native-preview` / `tsgo`.
  Recommendation: allow Expo's version alignment first, then only use
  `expo.install.exclude` for TypeScript if the local typecheck toolchain breaks and
  the reason is documented.
- The `agent-device` skill instructions are available, but the `agent-device` CLI is
  not installed on this shell PATH.
  Recommendation: continue native build validation and use available simulator/device
  tooling for smoke tests in this run; separately install/fix `agent-device` if strict
  device automation is required for future tasks.

## New dependencies

No new product dependency is planned as a primary goal.

Expected dependency changes are version alignment of existing platform packages:

- `expo` and Expo SDK packages to SDK 56-compatible versions.
- `react-native` to the SDK 56-supported `0.85.x` line.
- `react` and `react-dom` to the SDK 56-supported `19.2.3` line.
- `expo-router` to SDK 56.
- `react-native-reanimated`, `react-native-screens`,
  `react-native-gesture-handler`, `react-native-worklets`, `jest-expo`, and
  `@expo/metro-runtime` to versions selected by `expo install --fix`.

Potential dependency removals:

- `@react-navigation/native`
- `@react-navigation/drawer`

Remove these only if SDK 56 Expo Router and the app no longer require them directly.
Expo Doctor's SDK 56 warning should guide this cleanup.

Dependency addition:

- `@react-native/jest-preset@0.85.3` is required by `jest-expo` after the RN 0.85
  upgrade. Jest failed without it, and the React Native 0.85 release notes document
  the preset extraction as a breaking change.

No `external-packages.mdc` file was found in the repo. Fresh official docs were
researched and cached in the package guide files listed in "Design links".

## UX/UI Considerations

- This is a platform upgrade with no intended product UI change.
- Treat all visible differences as regressions until proven intentional.
- Highest-risk UI areas:
  - Solitaire board layout and card geometry.
  - Drag, tap, auto-up, and win animations.
  - Header buttons and title alignment on iOS and Android.
  - Drawer open behavior.
  - Settings and history screens.
  - Reduced-motion behavior.
- React Native 0.85 changes animation internals and removes old APIs, so animation
  smoke tests matter even when the app compiles.
- Hermes v1 is default through the SDK 56 path, so startup and gameplay should be
  tested on real native builds, not only web.

## Components

Components to reuse:

- Existing Expo Router layouts in `app/`.
- Existing Tamagui-backed app components in `components/` and `src/features`.
- Existing navigation helper shape in `src/navigation/useDrawerOpener.ts`, with
  imports migrated to SDK 56-compatible entry points.

Components to create:

- None for the core upgrade.

Components to avoid creating:

- Do not create new wrapper components for unchanged UI.
- Do not adopt Expo UI components in this migration.
- Do not replace existing Tamagui components unless an SDK 56 breakage requires a
  local fix.

## How to fetch data, how to cache

Soli does not appear to rely on app-level network fetching for the upgrade path.
No data-fetching architecture change is planned.

SDK 56 changes `globalThis.fetch` to use `expo/fetch` by default. Current source
search found no direct app `fetch(...)` usage, but validation should still watch for
third-party or platform behavior differences. If a regression appears, test
`EXPO_PUBLIC_USE_RN_FETCH=1` only as a diagnostic opt-out and document the reason
before keeping it.

Local persisted game/history state should be smoke-tested after the upgrade because
platform and bundler changes can surface storage initialization issues even when no
storage package is intentionally changed.

## Related tasks

- Optional follow-up: enable React Compiler and profile gameplay/header rerenders.
- Optional follow-up: evaluate Expo UI only if there is a specific UI component need.
- Optional follow-up: remove any remaining React Navigation dependencies if Expo
  Doctor confirms they are unnecessary after migration.
- Optional follow-up: revisit TypeScript 6 once Expo SDK 56 alignment and `tsgo`
  behavior are clear.

## Steps to implement and status of these steps

- [x] Research the latest official Expo, React Native, React, and Expo Router upgrade
  guidance on the web.
- [x] Inspect current repo dependency versions and package manager.
- [x] Scan app code for known SDK 56/RN 0.85 breakpoints.
- [x] Create this implementation plan before implementation.
- [x] Check whether a newer Expo/RN upgrade skill is available.
- [x] Confirm native toolchain versions, especially Xcode `26.4+`.
- [x] Check for running iOS/Android build processes and stop stale builds before
  native validation.
- [x] Create an upgrade branch.
- [x] Run `npx expo install expo@^56.0.0 --fix`.
- [x] Run `npx expo install --check` and record any package alignment issues.
- [x] Run the Expo Router migration codemod against app source directories, then
  manually verify remaining `@react-navigation/*` imports.
- [x] Replace remaining application-code React Navigation imports with SDK 56 Expo
  Router entry points.
- [x] Remove direct React Navigation dependencies if no longer required.
- [x] Replace `StyleSheet.absoluteFillObject` usage.
- [x] Review `babel.config.js` and `metro.config.js` comments/config for SDK 56
  relevance while preserving required Tamagui integration.
- [x] Resolve Expo Doctor SDK 56 config findings.
- [x] Add React Native 0.85 Jest preset package required by `jest-expo`.
- [x] Run `npx expo-doctor@latest` and resolve or document findings.
- [x] Run automated checks: format, lint, typecheck, Jest, and web export if practical.
- [x] Test Expo web at `http://localhost:8081/` with a Playwright/browser testing
  sub-agent.
- [x] Run clean iOS build on the connected simulator.
- [x] Test the iOS simulator build with testing sub-agents using `xcrun simctl`
  fallback tooling because the `agent-device` CLI was not available.
- [x] Run clean iOS build and test on the connected simulator with fallback device
  tooling.
- [x] Run fresh Android release build and test on the connected physical device with
  ADB fallback tooling.
- [x] Update "Files actually modified", "Identified issues", and "Testing" sections
  with implementation results.

## Plan: Files to modify

Likely files:

- `package.json`
- `yarn.lock`
- `app/_layout.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/two.tsx`
- `src/navigation/useDrawerOpener.ts`
- `src/features/klondike/hooks/useKlondikeTimer.ts`
- `metro.config.js`
- `babel.config.js`

Possible files:

- `app.json`, only if SDK 56 diagnostics require config changes.
- `expo-env.d.ts`, only if Expo tooling updates it.
- Jest config location if `jest-expo` or RN 0.85 requires test configuration changes.
- Native generated directories if the implementation chooses to prebuild locally.
  Since they are not currently checked in, prefer not committing generated native
  directories unless project policy changes.

Plan/research files created before implementation:

- `docs/product/expo-rn-sdk-56-upgrade/upgrade-to-expo-sdk-56-and-react-native-0-85.md`
- `docs/product/expo-rn-sdk-56-upgrade/expo-rn-sdk-56-expo-guide.md`
- `docs/product/expo-rn-sdk-56-upgrade/expo-rn-sdk-56-react-native-guide.md`
- `docs/product/expo-rn-sdk-56-upgrade/expo-rn-sdk-56-react-native-jest-preset-guide.md`
- `docs/product/expo-rn-sdk-56-upgrade/expo-rn-sdk-56-react-guide.md`
- `docs/product/expo-rn-sdk-56-upgrade/expo-rn-sdk-56-expo-router-guide.md`

## Files actually modified

Modified in this planning pass and implementation:

- `app.json`
- `app/_layout.tsx`
- `app/settings.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/two.tsx`
- `package.json`
- `src/features/klondike/hooks/useKlondikeTimer.ts`
- `src/navigation/useDrawerOpener.ts`
- `src/state/settings.tsx`
- `yarn.lock`
- `docs/product/expo-rn-sdk-56-upgrade/upgrade-to-expo-sdk-56-and-react-native-0-85.md`
- `docs/product/expo-rn-sdk-56-upgrade/expo-rn-sdk-56-expo-guide.md`
- `docs/product/expo-rn-sdk-56-upgrade/expo-rn-sdk-56-react-native-guide.md`
- `docs/product/expo-rn-sdk-56-upgrade/expo-rn-sdk-56-react-native-jest-preset-guide.md`
- `docs/product/expo-rn-sdk-56-upgrade/expo-rn-sdk-56-react-guide.md`
- `docs/product/expo-rn-sdk-56-upgrade/expo-rn-sdk-56-expo-router-guide.md`

Implementation notes:

- Created branch `codex/expo-rn-sdk-56-upgrade`.
- Confirmed Xcode `26.5`, which satisfies the SDK 56 `26.4+` requirement.
- Checked for existing native build processes; no stale build process was found.
- Ran `npx expo install expo@^56.0.0 --fix`; Expo selected SDK 56-aligned
  packages including `expo@56.0.11`, `react-native@0.85.3`, `react@19.2.3`,
  `react-dom@19.2.3`, and `typescript@6.0.3`.
- Ran `npx expo install --check`; dependency alignment passed.
- Ran `npx expo-codemod sdk-56-expo-router-react-navigation-replace app src`; it
  completed with 4 transformed files and 0 errors.
- Replaced app-code React Navigation imports with `expo-router/react-navigation`.
- Removed direct `@react-navigation/native` and `@react-navigation/drawer`
  dependencies after verifying `expo-router/react-navigation` and `expo-router/drawer`
  resolve without them.
- Removed the stale `@react-navigation` Jest transform allowlist entry.
- Replaced `StyleSheet.absoluteFillObject` with `StyleSheet.absoluteFill`.
- Re-ran `npx expo install --check`; dependency alignment still passed.
- Removed the legacy top-level `splash` app config after Expo Doctor rejected it under
  SDK 56; the existing `expo-splash-screen` config plugin remains the active splash
  configuration.
- Added `@react-native/jest-preset@0.85.3` after Jest failed with the RN 0.85 preset
  extraction error.
- Reviewed `babel.config.js` and `metro.config.js`; no SDK 56 cleanup was needed
  because both files still carry required Tamagui configuration.
- Added `expo-build-properties` iOS `deploymentTarget: "16.4"` because SDK 56 Expo
  modules require iOS 16.4 and the generated native project was still targeting 15.1.
- Changed the Android-only refresh-rate integration to use guarded static imports
  instead of dynamic imports. On the SDK 56 iOS dev-client reload path, Metro redboxed
  on the optional local module id even though the feature is Android-only; the local
  module still owns the native fallback behavior.
- The first `npx expo run:ios --no-build-cache` failed during `pod install` because
  stale RN 0.83 Pods metadata conflicted with RN 0.85.3 and the iOS target was 15.1.
- Ran `npx expo prebuild --platform ios --clean`; this regenerated the ignored native
  iOS project and installed CocoaPods successfully.
- Re-ran `npx expo run:ios --no-build-cache`; the build succeeded with one duplicate
  `-lc++` warning, installed on the `iPhone 17 Pro` simulator, and launched
  `ch.karimattia.soli`.
- Initial iOS testing found a redbox, `Requiring unknown module "3922"`, from the
  dynamic refresh-rate import path. After the guarded static import fix, a dev-client
  reload built the native iOS bundle successfully and the iOS retest passed.
- Ran `yarn release`; the Android release build succeeded, installed
  `android/app/build/outputs/apk/release/app-release.apk` on the connected physical
  Android device, and launched the app.
- Web testing sub-agent report: app loaded and rendered the board, New Game worked,
  Settings and History loaded, stock/draw interaction updated moves and waste cards,
  and no console errors were captured. Follow-up live inspection confirmed drawer
  menu navigation works after the open transition settles; the remaining closed
  overlay node is transparent and `pointer-events: none`.
- Re-ran automated checks:
  - `npx expo install --check`: pass
  - `npx expo-doctor@latest`: 21/21 checks passed
  - `yarn format:check`: pass
  - `yarn lint`: pass
  - `yarn typecheck`: pass
  - `yarn jest --watchAll=false --runInBand`: 6 suites / 40 tests passed
  - `yarn check:tamagui`: pass
  - `npx expo export --platform web --output-dir /tmp/soli-sdk56-web-export`: pass

## Identified issues and status of these issues

- Issue: No newer Expo/RN upgrade skill was found in the curated skill catalog; the
  experimental skill catalog path returned not found, and the local
  `upgrading-expo` skill has no upstream update metadata.
  Status: Resolved, continue with local skill plus official SDK 56 docs.
- Issue: The repo is on Expo SDK 55 while latest stable is SDK 56.
  Status: Resolved and validated.
- Issue: Application code imports from `@react-navigation/*`, which SDK 56 Expo
  Router no longer supports in app code.
  Status: Resolved by Expo Router codemod and manual review.
- Issue: `@react-navigation/native` and `@react-navigation/drawer` are direct
  dependencies while SDK 56 Expo Doctor warns about Expo Router plus React Navigation.
  Status: Resolved; direct dependencies removed after compatibility modules resolved.
- Issue: `app/(tabs)/two.tsx` uses removed RN 0.85 API
  `StyleSheet.absoluteFillObject`.
  Status: Resolved.
- Issue: SDK 56 raises iOS minimum to `16.4`.
  Status: Accepted by the user and implemented via `expo-build-properties`.
- Issue: Expo Go for SDK 56 is not a reliable production-app validation target.
  Status: Planned validation through development/release builds instead.
- Issue: TypeScript version alignment may interact with `@typescript/native-preview`.
  Status: Resolved for initial checks; `yarn typecheck` passes on TypeScript `6.0.3`.
- Issue: Expo Doctor rejected the legacy top-level `splash` field in `app.json`.
  Status: Resolved by removing the legacy field and keeping the config plugin.
- Issue: Jest failed after RN 0.85 because the React Native Jest preset moved to
  `@react-native/jest-preset`.
  Status: Resolved by adding `@react-native/jest-preset@0.85.3`.
- Issue: iOS Pod install failed after SDK 56 because the generated project still
  targeted iOS 15.1 and had stale RN 0.83 pod metadata.
  Status: Resolved by configuring deployment target 16.4 and running clean iOS
  prebuild before the clean iOS build.
- Issue: `agent-device` CLI is unavailable in this shell despite the skill existing.
  Status: Native testing uses available simulator/device fallback tooling in this run.
- Issue: iOS dev-client testing initially redboxed with `Requiring unknown module
  "3922"` from an Android-only dynamic import in settings state.
  Status: Resolved by guarding the feature to Android and using static imports from
  the local refresh-rate module.
- Issue: Android release build emitted non-blocking warnings for JVM Metaspace,
  Gradle deprecations, and native module deprecations.
  Status: Documented; build, install, launch, and smoke tests passed.
- Issue: Android runtime logs included non-fatal React Native/Reanimated
  `LayoutMetrics` warnings.
  Status: Documented as a follow-up observation; no crash, redbox, or interaction
  failure was found in smoke testing.

## Testing

Testing performed:

- Skill update check: no newer Expo/RN upgrade skill was available from the curated
  or experimental skill catalogs, so the local `upgrading-expo` skill and fresh
  official docs were used.
- Dependency diagnostics:
  - `npx expo install --check`: pass
  - `npx expo-doctor@latest`: pass, 21/21 checks
- Static and automated checks:
  - `yarn format:check`: pass
  - `yarn lint`: pass
  - `yarn typecheck`: pass
  - `yarn jest --watchAll=false --runInBand`: pass, 6 suites / 40 tests
  - `yarn check:tamagui`: pass
  - `npx expo export --platform web --output-dir /tmp/soli-sdk56-web-export`: pass
  - `git diff --check`: pass
- Web smoke testing at `http://localhost:8081/`:
  - Playwright/browser sub-agent verified initial render, New Game, Settings,
    History, stock/draw interaction, and absence of console errors.
  - Main-agent follow-up verified drawer navigation after the open transition
    settled.
- iOS native validation:
  - Confirmed Xcode `26.5`.
  - Ran `npx expo prebuild --platform ios --clean` after the first pod-install
    failure exposed stale RN 0.83 pod metadata and the old iOS 15.1 target.
  - Ran `npx expo run:ios --no-build-cache`; clean build succeeded, installed, and
    launched on the `iPhone 17 Pro` simulator.
  - Initial simulator sub-agent found the refresh-rate dynamic import redbox.
  - After the fix, the iOS retest sub-agent verified main board, Settings deeplink,
    History deeplink, and no redbox recurrence.
- Android native validation:
  - Ran `yarn release`; release build completed successfully in Gradle, installed
    the APK on the connected physical Android device, and launched the app.
  - Android testing sub-agent verified installed package `ch.karimattia.soli`,
    `versionName=0.8.0`, `versionCode=13`, `targetSdk=36`, main board, History,
    Settings, and no app-specific crash/redbox logs.

Testing constraint note:

- The `agent-device` skill instructions were read, but the `agent-device` CLI was
  unavailable in this shell. Native testing used `xcrun simctl` and ADB fallback
  tooling through testing sub-agents.
