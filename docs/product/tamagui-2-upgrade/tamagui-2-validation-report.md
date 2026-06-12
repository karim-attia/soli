# Tamagui 2 Validation Report

Date: 2026-06-12

This report consolidates the generated web, iOS, and Android validation notes for
the Tamagui 2 upgrade. The detailed per-run markdown files and screenshot PNGs were
removed so the upgrade docs stay reviewable.

## Result

PASS with tracked warnings.

The Config v4 Tamagui 2 migration passed static checks, web validation, clean iOS
simulator build/install checks, iOS simulator smoke validation, Android release
build/install checks, and physical Android smoke validation.

## Static Validation

- `yarn format:check`: passed after formatting
  `scripts/run-demo-autosolve.js`, `src/animation/celebrationModes.ts`, and
  `src/features/klondike/hooks/useCelebrationController.ts`.
- `yarn typecheck`: passed.
- Earlier full migration validation also passed:
  - `yarn lint:strict`
  - `yarn typecheck:fallback`
  - `yarn jest --runInBand`
  - `yarn check:tamagui`
  - `npx expo install --check`
  - `npx expo-doctor@latest`
  - `npx expo export --platform web`
  - `yarn generate:tamagui-css`

## Platform Validation

- Web:
  - Expo web was validated on `http://localhost:8081`.
  - Play, Settings, History, and Feature Graphic rendered.
  - Settings > Cards drawn from stock rendered with the restored segmented-control
    border and working `1 -> 3 -> 1` interaction.
- Android:
  - Fresh release build/install command: `ADB_WIFI_TARGET=192.168.1.12 yarn release`.
  - Device: A065/Pong, Android 16/API 36.
  - Installed package: `ch.karimattia.soli`, version `0.8.0`, build `13`.
  - Smoke coverage included launch, main game board, Settings, reversible animation
    toggle, draw-count selector, History, History detail sheet, Draw, Undo, and Soli
    crash/fatal log scan.
  - Final draw-count border follow-up passed on the physical device: one rounded outer
    group border, visible separators between non-selected neighbors, and no doubled
    stroke beside the selected item.
- iOS:
  - Clean simulator build/install command:
    `yarn ios --no-build-cache --device 53E36318-51D0-44B7-996F-25BBF9C83828`.
  - Simulator: iPhone 17 Pro, iOS 26.5.
  - Installed bundle: `ch.karimattia.soli`.
  - Version metadata was fixed and rechecked: `CFBundleShortVersionString = 0.8.0`,
    `CFBundleVersion = 13`.
  - Smoke coverage included launch with Metro, main game board, Settings, draw-count
    selector, History empty state, Draw, Undo restore, and Soli process log scan.

## Future-Relevant Notes

- Tamagui 2 `ToggleGroup` is behavior-focused; `XGroup` owns the grouped visual frame.
  The draw-count control keeps selected-aware one-sided separators because Android
  rendered a doubled vertical stroke when the selected segment edge and manual
  separator shared the same boundary.
- Xcode 26.5 required the iOS 26.5 simulator runtime. Installing the runtime and
  clearing `~/Library/Developer/Xcode/DerivedData/Soli-*` resolved the clean-build
  blocker.
- The native iOS project now derives version/build through Xcode build settings:
  `ios/Soli/Info.plist` uses `$(MARKETING_VERSION)` and
  `$(CURRENT_PROJECT_VERSION)`, with Debug/Release set to `0.8.0` and `13`.
- Android `agent-device snapshot -i` exposed sparse accessibility trees for some
  release screens, so Android visual validation used screenshots and physical
  coordinate taps. This affected the test method, not the app result.
- iOS development builds require Metro for smoke testing. Launching without Metro
  produced the expected React Native `No script URL provided` overlay.
- Known warnings that did not block validation:
  - Tamagui warning 001 about skipped module loading during native bundling.
  - Reanimated `LayoutMetrics` warnings during iOS Metro startup.
  - Xcode duplicate `-lc++` warning and Hermes script phase warning.
  - Gradle deprecation warnings for a future Gradle version.
  - Existing web runtime warnings about raw React Native `shadow*` props,
    deprecated `props.pointerEvents`, and Tamagui global config fallback/duplicate
    instance detection.

## Follow-Up

- Treat Config v5 migration as a separate task.
- Treat optional `@tamagui/native` / `react-native-teleport` adoption as a separate
  task only if a concrete native portal or gesture issue appears.
- Keep future screenshots as local QA artifacts unless a reviewer explicitly asks for
  them in the repository.
