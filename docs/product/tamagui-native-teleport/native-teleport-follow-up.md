# Tamagui Native Teleport Follow-Up

## User prompt

Config v5 and optional Tamagui native/Teleport should stay as separate follow-up tasks.

Would you recommend we do that? Benefits?

Do the native / teleport change now. Do it end to end with full builds and checks. Same approach as migration before. Thank you!

## Description

Add Tamagui 2's optional native portal integration so Soli's native Sheet, Toast, and
future portal-based Tamagui content preserve custom React context through
`react-native-teleport`. Keep this as a small Config v4 follow-up after the committed
Tamagui 2 migration.

Official Tamagui docs say `@tamagui/native` setup imports must run before Tamagui
imports, and the Portal docs recommend `react-native-teleport` because the default
native portal path does not preserve custom React context. `react-native-teleport`
contains native code, supports autolinking, is Expo development-client compatible, and
requires fresh iOS and Android rebuilds after installation.

## Acceptance Criteria

- `@tamagui/native` is added at the exact Tamagui version already used by the app.
- `react-native-teleport` is added at the exact researched stable version.
- Native setup executes before `expo-router/entry` and before any Tamagui import.
- Teleport setup is enabled through `@tamagui/native/setup-teleport`.
- Existing `GestureHandlerRootView` remains the app root wrapper.
- If the Tamagui Gesture Handler adapter is enabled, it is limited to Sheet gestures
  with Tamagui press-event ownership disabled.
- No Config v5, Toast v2, Burnt, Zeego, LinearGradient, or web-lite migration is
  included in this follow-up.
- Static checks pass.
- A clean iOS simulator build installs the fresh binary and the app can launch.
- Android `yarn release` installs a fresh release binary on the physical Android device.
- Native smoke tests cover launch, Settings, History Sheet open/dismiss, draw-count
  selector, and at least one Play interaction on each platform.

## Design links

- Tamagui native integrations: https://tamagui.dev/ui/native
- Tamagui portal docs: https://tamagui.dev/ui/portal
- Tamagui Sheet docs: https://tamagui.dev/ui/sheet
- React Native Teleport installation: https://kirillzyusko.github.io/react-native-teleport/docs/installation

## Possible approaches incl. pros and cons

- Teleport only.
  - Pros: smallest native change, directly addresses context preservation for portaled
    Tamagui components, lower interaction risk.
  - Cons: does not adopt Tamagui's optional Sheet gesture adapter.
- Teleport plus Sheet-only Gesture Handler adapter.
  - Pros: preserves portal context and gives Sheet native gesture coordination without
    changing global Tamagui press behavior.
  - Cons: slightly broader native surface and requires careful Sheet gesture testing.
- Full native integrations.
  - Pros: adopts all Tamagui optional native features.
  - Cons: too broad for this task; would pull in Toast/native menu/gradient behavior not
    currently used by Soli.

Recommendation: use Teleport plus Sheet-only Gesture Handler adapter only if the
adapter is available and typechecks cleanly. Keep `pressEvents: false` to avoid changing
gameplay button/card press semantics.

## Open questions to the user incl. recommendations (if any)

No blocking questions. The requested scope is clear enough to implement directly.
Recommendation: do not commit until fresh iOS and Android builds have installed and
smoke tests pass, because `react-native-teleport` contains native code.

## New dependencies

- `@tamagui/native@2.2.0`
  - Setup package for Tamagui native integrations.
  - Must match the rest of the exact Tamagui 2.2.0 graph.
- `react-native-teleport@1.1.9`
  - Native portal implementation.
  - New Architecture/Fabric only; Soli's Expo SDK 55 app already uses the New
    Architecture.
  - Native code requires clean iOS and Android rebuilds.

Package research is cached in the committed Tamagui 2 upgrade docs:

- `docs/external-package-guides/tamagui-native.md`
- `docs/external-package-guides/react-native-teleport.md`

## UX/UI Considerations

- No intended visual design change.
- History Sheet should still stack above app content, respect safe areas, dismiss
  normally, and keep current theme/settings/history state.
- Watch Android z-order because one Tamagui issue reported nested Sheet z-index trouble
  with Teleport on Android. Soli does not intentionally use nested Sheets in the current
  validation path.

## Components

- Reuse existing Tamagui `Sheet`, `ToastProvider`, `ToastViewport`, and app providers.
- Reuse existing `GestureHandlerRootView` in `components/Provider.tsx`.
- Add a tiny root setup module instead of spreading setup imports into screen code.

## How to fetch data, how to cache

No app data fetching changes. Settings/history state should continue to flow through
existing providers and remain visible inside Sheet content.

## Related tasks

- Committed Tamagui 2 migration: `1cd8e08 chore: upgrade tamagui to 2`.
- Deferred Config v5 migration.
- Deferred Toast v2/native Toast work.

## Steps to implement and status of these steps

- [completed] Research current Tamagui native, Portal, Sheet, and Teleport docs.
- [completed] Inspect current entrypoint, provider tree, and package graph.
- [completed] Create this follow-up implementation plan.
- [completed] Add exact dependencies and update lockfile.
- [completed] Add root entry/setup files so setup imports run before Expo Router.
- [completed] Update migration/follow-up docs after implementation.
- [completed] Run static checks.
- [completed] Run clean iOS build and simulator smoke test.
- [completed] Run Android release build and physical-device smoke test.
- [completed] Summarize results and remaining follow-ups.

## Plan: Files to modify

- `package.json`
- `yarn.lock`
- `index.js`
- `tamagui.native.setup.ts`
- `docs/product/tamagui-native-teleport/native-teleport-follow-up.md`
- `docs/product/tamagui-2-upgrade/tamagui-2-migration-plan.md`
- `docs/product/tamagui-2-upgrade/tamagui-2-validation-report.md`
- `docs/external-package-guides/react-native-teleport.md`
- `docs/external-package-guides/tamagui-native.md`

## Files actually modified

- `docs/product/tamagui-native-teleport/native-teleport-follow-up.md`
- `docs/product/tamagui-2-upgrade/tamagui-2-migration-plan.md`
- `docs/external-package-guides/react-native-teleport.md`
- `docs/external-package-guides/tamagui-native.md`
- `docs/product/tamagui-2-upgrade/tamagui-2-validation-report.md`
- `index.js`
- `package.json`
- `tamagui.native.setup.ts`
- `yarn.lock`

## Identified issues and status of these issues

- Native code requires fresh builds.
  - Status: fixed; fresh iOS and Android builds installed version `0.8.0 (13)` before
    smoke testing.
- Setup import ordering matters.
  - Status: fixed; `package.json` now points to `index.js`, which imports
    `tamagui.native.setup.ts` before `expo-router/entry`.
- Global Tamagui press-event integration could affect card/gameplay presses.
  - Status: avoided; the Gesture Handler adapter is Sheet-only with
    `pressEvents: false`.
- The physical Android device disappeared from ADB before the first release attempt.
  - Status: resolved; a signed build-only pass validated native compilation while
    waiting, then the device returned through its ADB mDNS alias and the required
    `yarn release` build/install completed.
- Android logs emit generated-setter fallback warnings for Teleport view managers.
  - Status: non-blocking; Teleport loaded on arm64, the History Sheet worked, and no
    Soli crash or native-module error occurred.

## Testing

- Static:
  - `yarn format:check`: passed.
  - `yarn exec oxfmt --check index.js tamagui.native.setup.ts`: passed.
  - `yarn lint:strict`: passed with 0 warnings and 0 errors.
  - `yarn typecheck`: passed.
  - `yarn typecheck:fallback`: passed.
  - `yarn jest --runInBand`: passed, 6 suites and 40 tests.
  - `yarn check:tamagui`: passed.
  - `npx expo install --check`: passed; dependencies are up to date.
  - `npx expo-doctor@latest`: passed, 19/19 checks.
  - `npx expo export --platform web`: passed; exported 14 static routes.
  - GPT 5.5 medium-reasoning read-only validation sub-agent repeated the static checks
    and confirmed `index.js` imports native setup before `expo-router/entry`.
- iOS:
  - Confirmed no active native build was running.
  - Removed `~/Library/Developer/Xcode/DerivedData/Soli-*`.
  - `yarn ios --no-build-cache --device 53E36318-51D0-44B7-996F-25BBF9C83828`
    passed on iPhone 17 Pro, iOS 26.5.
  - Build output compiled Teleport native code including `TeleportViewSpec-generated.mm`
    and `libTeleport.a`.
  - Confirmed installed bundle `ch.karimattia.soli`, version `0.8.0`, build `13`.
  - Agent-device smoke passed for Play, Settings, draw count `1 -> 3 -> 1`, History
    empty state, Draw, and Undo.
  - No Soli fatal/crash/uncaught/exception log lines were found.
  - History Sheet was not available because the simulator had no history entries.
  - Non-blocking warnings: duplicate `-lc++`, Hermes script phase without outputs,
    React Native warning badge, and normal simulator/debug log noise.
- Android:
  - Ran only after iOS build/test completed and no native build remained active.
  - A signed build-only `:app:assembleRelease` pass succeeded while the phone was
    temporarily offline. The APK contained
    `libreact_codegen_TeleportViewSpec.so` for arm64-v8a, armeabi-v7a, x86, and x86_64.
  - After the A065/Pong device returned through ADB, the unlock script and required
    `yarn release` command passed.
  - Confirmed fresh install of `ch.karimattia.soli`, version `0.8.0`, build `13`,
    with `lastUpdateTime=2026-06-12 11:42:56`.
  - Agent-device smoke passed for Play, Settings, draw count `1 -> 3 -> 1`, populated
    History, History Sheet open/dismiss, Draw, and Undo.
  - History Sheet displayed the expected game metadata/tableau, dimmed the background,
    preserved correct z-order/context, and dismissed with a downward gesture.
  - Teleport's arm64 codegen library loaded successfully.
  - No Soli fatal exception, crash, uncaught JS error, or native-module load failure was
    found in logcat or the Android crash buffer.
  - Non-blocking warnings: Teleport generated-setter fallback warnings, Tamagui warning
    001, Gradle deprecations, and one isolated agent-device snapshot-helper crash.
