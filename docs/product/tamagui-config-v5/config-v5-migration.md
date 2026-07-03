# Tamagui Config v5 Migration

## User prompt

Config v5 and optional Tamagui native/Teleport should stay as separate follow-up tasks.

Would you recommend we do that? Benefits?

Do the Config v5 change now. Do it end to end with full builds and checks. Same approach as migration before. Thank you!
Will be away with Android phone, so you can also do on emulator

continue

continue

continue. btw: android device reconnected

## Description

Migrate Soli from Tamagui 2's legacy-compatible `@tamagui/config/v4` defaults to
Config v5. Keep the already completed Tamagui 2 runtime and native Teleport changes
intact, explicitly choose CSS animations on web and Reanimated animations on native,
and adopt v5 layout behavior after auditing the app for assumptions inherited from
Config v4.

Config v5 changes design-system values as well as runtime defaults. The migration
therefore requires visual checks of the card board, settings, history Sheet, feature
graphic, and light/dark themes rather than only a dependency or typecheck pass.

## Acceptance Criteria

- `tamagui.config.ts` imports `defaultConfig` from `@tamagui/config/v5`.
- Web uses the v5 CSS animation driver and native uses the v5 Reanimated driver.
- No new package is added for the animation drivers; they are exports of the existing
  exact `@tamagui/config@2.2.0` dependency.
- Temporary v4 layout compatibility settings are used only to isolate regressions and
  are removed from the final config unless a documented, tested blocker requires one.
- Layouts that depend on relative positioning declare it explicitly.
- App layouts behave correctly with Config v5's React Native-compatible `flex`
  semantics.
- Existing source does not use removed or renamed v5 media keys.
- Light and dark themes remain readable and consistent across navigation and Tamagui.
- Draw-count selector borders, selected state, and interaction remain correct.
- History Sheet opens, displays content, and dismisses correctly through native
  Teleport.
- `tamagui-web.css` is regenerated from Config v5.
- Formatting, lint, typechecks, tests, Tamagui checks, Expo checks, and web export pass.
- The real Expo web app is smoke-tested.
- A clean iOS build is installed on the connected simulator and smoke-tested.
- An Android release build is installed on the reconnected physical device and
  smoke-tested.
- iOS and Android builds run sequentially and never overlap.

## Design links

Research date: 2026-06-12.

- Config v5 migration: https://tamagui.dev/docs/core/config-v5
- Animation drivers: https://tamagui.dev/docs/core/animation-drivers
- Tamagui configuration: https://tamagui.dev/docs/core/configuration
- Expo setup: https://tamagui.dev/docs/guides/expo
- Tamagui upgrade guide: https://tamagui.dev/docs/guides/how-to-upgrade
- Tamagui 2 announcement: https://tamagui.dev/blog/version-two

There is no new product design. The current Config v4 app is the visual baseline.

## Possible approaches incl. pros and cons

### Keep Config v4

- Pros: no new theme, token, media, flex, or position behavior.
- Cons: retains the legacy config indefinitely and does not complete the approved
  follow-up.

### Switch to Config v5 but retain legacy layout settings

- Pros: isolates token/theme changes and reduces immediate layout risk.
- Cons: leaves the two central v5 layout improvements disabled and creates permanent
  compatibility debt.

### Migrate through compatibility mode, then adopt native v5 defaults

- Pros: separates theme/token regressions from layout regressions, while ending on the
  current supported defaults.
- Cons: requires two validation checkpoints and explicit layout fixes.

Recommendation: use the third approach. First prove Config v5 with legacy layout
settings, then remove them and fix only layouts that actually depended on the old
implicit behavior.

## Open questions to the user incl. recommendations (if any)

No blocking questions. The user initially allowed an Android emulator while the
physical phone was unavailable, then reconnected the phone before Android validation.
Use the physical device because it exercises the existing populated-history path.

Recommendation: do not redesign colors or spacing as part of this migration. Preserve
the current product intent where practical and record any intentional v5 visual
difference.

## New dependencies

No new dependency is expected.

`@tamagui/config/v5`, `@tamagui/config/v5-css`, and
`@tamagui/config/v5-reanimated` are package exports of the already installed exact
`@tamagui/config@2.2.0`. The required animation implementations are already in that
package's dependency graph.

The package/API research required for this feature is cached in
`docs/external-package-guides/tamagui-config.md`.

## UX/UI Considerations

- Config v5 uses updated Radix colors and a broader theme set.
- Font, space, radius, size, z-index, and shadow tokens differ from Config v4.
- `flex={1}` changes from legacy web-like `flex-basis: auto` to React Native-compatible
  `flex-basis: 0`.
- Tamagui views no longer default to `position: relative`; parents of absolute
  descendants must declare it.
- Responsive media names changed, including `2xl`/`2xs` naming.
- Animation values are similar but not identical across CSS and Reanimated drivers.
- Validate compact phone layouts as well as ordinary web width.

## Components

Reuse all existing app components. No new UI component is planned.

Audit these high-risk areas:

- `components/KlondikeGameView.tsx`
- `components/settings/DrawCountSelector.tsx`
- `components/history/HistorySheet.tsx`
- `app/feature-graphic.tsx`
- root providers and tab/settings layouts

## How to fetch data, how to cache

No data fetching or cache behavior changes. Existing settings, game, and history state
must remain available after the theme/config replacement and inside Teleport content.

## Related tasks

- Tamagui 2 runtime migration: committed as `1cd8e08`.
- Tamagui native/Teleport integration: committed as `c46bedc`.
- A visual redesign using Config v5's expanded themes is out of scope.

## Steps to implement and status of these steps

- [completed] Research official Config v5 guidance and inspect installed package
  exports.
- [completed] Create this detailed implementation plan and dated package guide.
- [completed] Switch to Config v5 with explicit web/native animation drivers and
  temporary legacy layout compatibility.
- [completed] Run focused static checks and regenerate generated CSS.
- [completed] Remove compatibility settings and fix explicit layout assumptions.
- [completed] Run full static checks and web smoke tests.
- [completed] Run a clean iOS simulator build and native smoke tests.
- [completed] Run an Android physical-device release build and native smoke tests.
- [completed] Consolidate findings and final file/status documentation.

## Plan: Files to modify

- `tamagui.config.ts`
- `tamagui-web.css`
- Config v5-sensitive app/component files only if validation proves a regression
- `docs/product/tamagui-config-v5/config-v5-migration.md`
- `docs/external-package-guides/tamagui-config.md`
- `docs/product/tamagui-2-upgrade/tamagui-2-migration-plan.md`
- `docs/product/tamagui-2-upgrade/tamagui-2-validation-report.md`

## Files actually modified

- `docs/product/tamagui-config-v5/config-v5-migration.md`
- `docs/external-package-guides/tamagui-config.md`
- `docs/product/tamagui-2-upgrade/tamagui-2-migration-plan.md`
- `docs/product/tamagui-2-upgrade/tamagui-2-validation-report.md`
- `app/feature-graphic.tsx`
- `components/settings/DrawCountSelector.tsx`
- `tamagui.config.ts`
- `tamagui-web.css`

## Identified issues and status of these issues

- Config v5 has no bundled animation driver.
  - Status: fixed; CSS is selected on web and Reanimated on native.
- Config v4 supplied implicit relative positioning.
  - Status: fixed; the one affected Tamagui canvas now declares relative positioning.
- Config v5 changes `flex={1}` semantics.
  - Status: source audit found all current uses express fill/equal-width intent; web,
    iOS, and Android runtime validation found no related regression.
- Config v5 changes tokens, themes, and colors.
  - Status: web validation found the v5 Toggle active-focus theme could override the
    selected draw-count background; fixed by using Toggle's supported `activeStyle`.
    The v5 default outline token was also below robust focus-indicator contrast, so
    this control now uses an explicit inset `focusVisibleStyle` matching the current
    text color for selected and unselected states. Native validation then showed
    `activeStyle` alone did not supply the controlled selected fill, so the item also
    keeps an explicit selected `bg`.
- Expo's successful static web export did not exit by itself.
  - Status: non-blocking tooling issue; the export completed all 14 routes and printed
    `Exported: dist`, then the stale process was stopped before runtime/native tests.
- The Android physical device was unavailable at the start of this work.
  - Status: resolved; the A065 reconnected before Android validation, so the release
    build was installed and tested there instead of using the emulator fallback.
- Android Draw/Undo restored the card and stock state but left the displayed move count
  at the post-draw value.
  - Status: separate product-behavior follow-up; this is unrelated to Config v5 and was
    not changed in this migration.
- Pressing Android Back while the History Sheet was open changed the underlying route
  before the sheet was dismissed.
  - Status: separate navigation/Sheet follow-up; backdrop dismissal worked and
    Teleport content, context, and z-order were correct.

## Testing

Planned static validation:

- `yarn format:check`
- `yarn lint:strict`
- `yarn typecheck`
- `yarn typecheck:fallback`
- `yarn jest --runInBand`
- `yarn check:tamagui`
- `npx expo install --check`
- `npx expo-doctor@latest`
- `npx expo export --platform web`

Planned runtime validation:

- Expo web at `http://localhost:8081/` through Playwright/browser automation.
- Clean iOS build on the connected simulator, followed by agent-device smoke tests.
- Android `yarn release` targeting the physical A065, followed by agent-device smoke
  tests.
- Native smoke coverage: launch, Play, Draw/Undo, Settings, draw-count selector,
  theme readability, and History Sheet open/dismiss.

Completed static/web validation:

- `yarn format:check`: passed, 82 files.
- `yarn lint:strict`: passed with 0 warnings and 0 errors.
- `yarn typecheck`: passed.
- `yarn typecheck:fallback`: passed.
- `yarn jest --runInBand`: passed, 6 suites and 40 tests.
- `yarn check:tamagui`: passed.
- `npx expo install --check`: passed.
- `npx expo-doctor@latest`: passed, 19/19 checks.
- `npx expo export --platform web`: built and exported 14 routes.
- Desktop and 390x844 web smoke: Play, Draw, Undo, Settings, History empty state,
  light/dark themes, and no horizontal overflow passed.
- Draw 1/3/5 selected and focus-visible states passed in both themes:
  - light contrast: 12.63:1;
  - dark contrast: 8.62:1;
  - separators, outer frame, corners, and endpoint clipping remained correct.
- Browser console had no errors. Existing React Native Web deprecation warnings for
  shadow props and `pointerEvents` remain outside this migration's scope.

Completed final iOS validation:

- The final clean build command was
  `yarn ios --no-build-cache --device 53E36318-51D0-44B7-996F-25BBF9C83828`.
- Build succeeded with 0 errors and 2 warnings.
- The final build installed `ch.karimattia.soli` version `0.8.0` build `13` on the
  iPhone 17 Pro simulator running iOS 26.5. The new bundle timestamp was
  `2026-06-13 09:05:14 +0200`.
- Launch, Play, Draw, Undo restore, Settings, Draw 1/3/5/1, light/dark themes, and
  History empty state passed.
- The draw-count selector showed one outer frame, single separators, readable selected
  text, and the intended selected fill in both themes.
- The final simulator log scan found no Soli crash, uncaught JavaScript error,
  Teleport/native-module load failure, or fatal Reanimated error.
- Local QA screenshots remain under `/tmp/soli-tamagui-v5-smoke/`; they are
  intentionally not committed.

Completed final Android validation:

- `yarn release` completed successfully, installed, and opened
  `ch.karimattia.soli` version `0.8.0` build `13` on the physical A065 running Android
  16/API 36. The final install had `timeStamp = 2026-06-13 09:18:02` and
  `lastUpdateTime = 2026-06-13 09:18:03`.
- Launch, Draw, Undo card-state restore, Settings, Draw 1/3/5/1, light/dark themes,
  History, and populated History Sheet open/backdrop-dismiss passed.
- The draw-count selector showed one rounded outer frame, four single separators, no
  doubled selected edge, and the intended selected fill in both themes.
- The final log scan found no crash, ANR, fatal React Native/Reanimated/Teleport error,
  native-module load failure, abort, segmentation fault, or linkage failure.
- Non-blocking logs retained the known Teleport generated-setter warnings plus
  edge-to-edge, `RNScreens userInterfaceStyle`, and duplicate Gesture Handler setup
  warnings.
- Local QA screenshots remain under
  `/tmp/soli-final-android-*.png` and `/tmp/soli-final-android-logs/`; they are
  intentionally not committed.

Completed final verification:

- `yarn format:check`: passed, 82 files.
- `yarn lint:strict`: passed with 0 warnings and 0 errors.
- `yarn typecheck`: passed.
- `yarn typecheck:fallback`: passed.
- `yarn jest --runInBand`: passed, 6 suites and 40 tests.
- `yarn check:tamagui`: passed.
- `npx expo install --check`: passed.
- `npx expo-doctor@latest`: passed, 19/19 checks.
- `yarn generate:tamagui-css`: passed and left `tamagui-web.css` byte-identical.
- `git diff --check`: passed.
