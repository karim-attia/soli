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

## Native Teleport Follow-Up

- Added `@tamagui/native@2.2.0` and `react-native-teleport@1.1.9`.
- `package.json` now uses `index.js`, which imports `tamagui.native.setup.ts` before
  `expo-router/entry`.
- Native setup enables Teleport and Sheet-only Gesture Handler integration with
  `pressEvents: false`.
- Static checks, Expo checks, Jest, Tamagui checks, and web export passed.
- Clean iOS simulator build compiled Teleport native code, installed `0.8.0 (13)`, and
  passed Play/Settings/draw-count/History-empty/Draw/Undo smoke coverage.
- Android `yarn release` compiled and installed a fresh `0.8.0 (13)` release on the
  physical A065/Pong device.
- The populated Android History Sheet opened above app content, displayed current game
  metadata/tableau, preserved expected z-order/context, and dismissed normally.
- Teleport codegen libraries loaded successfully on both platforms. No Soli crash,
  uncaught JS error, or native-module load failure was found.
- Non-blocking Android logs include generated-setter fallback warnings for Teleport view
  managers. Keep an eye on these after React Native/Tamagui upgrades, but no functional
  issue was observed.

## Config v5 Follow-Up

- Config v5 was implemented as a separately approved follow-up using
  `@tamagui/config/v5`, the CSS animation driver on web, and the Reanimated animation
  driver on native.
- Temporary legacy layout compatibility settings were removed after auditing flex and
  positioned layouts. The feature-graphic canvas now declares its required relative
  positioning explicitly.
- Config v5 theme interaction required the draw-count selector to keep a controlled
  native selected fill, an `activeStyle` for web pseudo-state precedence, and a
  high-contrast inset focus-visible outline that follows the current text color.
- Static checks, Expo checks, web export, focused web visual checks, and the final clean
  iOS simulator build passed. The final iOS build installed `0.8.0 (13)` on the
  iPhone 17 Pro simulator with bundle timestamp `2026-06-13 09:05:14 +0200`.
- Android `yarn release` installed `0.8.0 (13)` on the physical A065 with
  `lastUpdateTime = 2026-06-13 09:18:03` and passed launch, Draw/Undo card-state
  restore, Settings, Draw 1/3/5/1 in light and app-dark themes, History, and populated
  History Sheet open/backdrop-dismiss checks. The selector retained one rounded outer
  frame and single separators without a doubled selected edge.
- No Android crash, ANR, fatal React Native/Reanimated/Teleport error, or native-module
  load failure was found. Existing Teleport generated-setter warnings remain
  non-blocking.
- Two product behaviors observed during Android smoke are separate from Config v5:
  Undo restored cards and stock but not the displayed move count, and Android Back
  changed the underlying route while the History Sheet remained open. Track these
  separately rather than expanding this migration.

## Follow-Up

- Keep future screenshots as local QA artifacts unless a reviewer explicitly asks for
  them in the repository.
