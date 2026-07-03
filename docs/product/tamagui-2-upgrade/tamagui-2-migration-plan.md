# Tamagui 2 Upgrade Migration Plan

## User prompt

Make an extensive plan what's needed to update to Tamagui 2.x, search the web for that, what other things need to be upgraded for that as well, what do we need to consider, etc. Thank you.

Fix these formatting checks.
Clean up documentation - remove the screenshots, decide which upgrade documentation files to keep for a clean commit.
Would you then recommend to commit?
What's the next step after?

merge all reports into one report. Just keep like relevant information that we should still be aware of in the future. Make it like one section if it's needed. But yeah, like this is like, we don't, nobody's ever gonna read 20 markdown files that are like randomly generated. Figure out like a good way how to do this. Thank you. And afterwards you can directly commit.

## Description

Plan the migration of Soli from Tamagui 1.140.x to Tamagui 2.x, including required
source changes, supporting Expo patch upgrades, toolchain prerequisites, and full
web/iOS/Android validation. Config v5 and Tamagui's optional native integrations are
documented as separately approved follow-ups, not hidden prerequisites for the core
Tamagui 2 upgrade.

Research was performed on 2026-06-11. The latest stable Tamagui release is `2.2.0`,
released on 2026-06-09. The recommended target is therefore exact version `2.2.0`,
not merely `^2.0.0`. Tamagui packages that participate in the same runtime/config
must be kept on the same exact version to avoid duplicate core instances and broken
provider/config context.

The app already satisfies Tamagui 2's major platform requirements:

- React `19.2.0`
- React Native `0.83.2`, to be patch-aligned to Expo's expected `0.83.6`
- Expo SDK `55`, where the New Architecture is mandatory
- TypeScript `5.9.3`
- Reanimated `4.2.1`
- React Native Worklets `0.7.2`, to be patch-aligned to Expo's expected `0.7.4`

The migration is still a feature-level change rather than a dependency-only bump.
The repository currently uses APIs removed or behaviorally changed by Tamagui 2:

- `Stack` from `tamagui`, which was removed in favor of `View`.
- `animation`, which was renamed to `transition`.
- Config v4. It is supported by Tamagui 2; Config v5 is a separate optional migration
  with broader visual defaults.
- `ToggleGroup` v1 visual-group props including `backgrounded`, `bordered`,
  `radiused`, and `padded`. Tamagui 2's `ToggleGroup` is behavior-only and must be
  composed with `XGroup`/`YGroup`.
- React Native accessibility prop names on Tamagui components, which must use ARIA
  equivalents in v2.
- `Image` from `@tamagui/image` with `source`, which should become `Image` from
  `tamagui` with the web-standard v2 API.
- `@tamagui/lucide-icons`, whose stable package was not promoted with the rest of
  Tamagui 2. Official v2 documentation now uses `@tamagui/lucide-icons-2`.
- `@tamagui/colors` root palettes, which move to Radix v3 in 2.x. Soli's feature
  graphic imports purple values directly, so the core visual-parity migration should
  use `@tamagui/colors/legacy`.
- Portal-based `Sheet` and `Toast`, for which v2 offers optional native portal setup
  through `@tamagui/native` and `react-native-teleport`.
- An explicit `react-native-reanimated/plugin` entry even though Expo's
  `babel-preset-expo` already configures the Worklets transform.

The recommended delivery is to finish and validate Tamagui 2 on Config v4 first.
Config v5 and native Teleport can then be considered in separate follow-up changes,
each with its own clean native builds and regression testing.

## Acceptance Criteria

- Every direct Tamagui package is intentionally accounted for and incompatible v1
  packages are removed.
- Tamagui runtime, config, compiler, CLI, Metro plugin, Toast, colors, fonts, and icon
  helpers resolve to compatible v2 packages without duplicate `@tamagui/core` or
  `@tamagui/web` copies.
- `@tamagui/lucide-icons` is replaced by `@tamagui/lucide-icons-2`.
- Expo SDK 55 dependencies pass `npx expo install --check`.
- `npx expo-doctor@latest` passes, including native tooling checks.
- A CocoaPods version accepted by Expo Doctor and the SDK 55 native toolchain is
  available before the required clean iOS build.
- The app first reaches a working Tamagui 2 runtime while retaining Config v4,
  following Tamagui's recommended risk-reduction sequence.
- All removed Tamagui APIs are absent from app code:
  - no Tamagui `Stack`;
  - no Tamagui `animation` prop;
  - no `backgrounded`;
  - no removed ToggleGroup visual-container props;
  - no React Native accessibility prop names on Tamagui primitives;
  - no v1 `@tamagui/lucide-icons` imports.
- The feature graphic keeps its current purple palette during the core Config v4
  migration by importing from `@tamagui/colors/legacy`.
- The draw-count selector remains a single five-segment control with correct selected,
  disabled, keyboard, screen-reader, web, iOS, and Android behavior.
- History `Sheet` opens, drags, dismisses, respects safe areas, and follows
  reduced-motion settings.
- `ToastProvider`, `ToastViewport`, and `CurrentToast` mount without startup, context,
  or console errors. No live product Toast trigger currently exists, so active Toast
  rendering behavior is not claimed as a core acceptance criterion.
- Existing custom card, header, settings, history, and feature-graphic layouts retain
  their intended geometry on Tamagui 2 with Config v4.
- Light/dark theme switching does not flash or leave navigation and Tamagui themes out
  of sync.
- Generated Tamagui CSS is regenerated and committed from the v2 config.
- Typecheck, lint, formatting checks, unit tests, Tamagui checks, Expo checks, and web
  export pass.
- Web is tested through the real Expo web app at `http://localhost:8081/`.
- A clean iOS build is installed and tested on the connected simulator.
- A fresh Android release build is installed and tested on the connected
  device/emulator.
- iOS and Android builds are run sequentially, never concurrently.

Conditional follow-up acceptance criteria:

- If native Teleport is approved, custom app contexts remain available inside the
  history Sheet portal on fresh native builds.
- If Config v5 is approved, its animation driver, `flexBasis`, `position`,
  breakpoints, themes, Radix colors, and shadows are explicitly configured
  and visually audited.

## Design links

Primary Tamagui sources, researched 2026-06-11:

- Tamagui v2 announcement and complete breaking-change list:
  https://tamagui.dev/blog/version-two
- Official v1 to v2 migration guide:
  https://tamagui.dev/docs/guides/how-to-upgrade
- Tamagui 2 installation requirements:
  https://tamagui.dev/docs/intro/installation
- Config v5 migration and animation drivers:
  https://tamagui.dev/docs/core/config-v5
- Expo setup:
  https://tamagui.dev/docs/guides/expo
- Metro setup:
  https://tamagui.dev/docs/guides/metro
- Native integrations:
  https://tamagui.dev/ui/native
- Native portal behavior:
  https://tamagui.dev/ui/portal
- Sheet behavior and Gesture Handler integration:
  https://tamagui.dev/ui/sheet
- ToggleGroup v2 composition:
  https://tamagui.dev/ui/toggle-group
- Lucide Icons v2 package:
  https://tamagui.dev/ui/lucide-icons
- Existing Toast API:
  https://tamagui.dev/ui/toast
- Optional new Toast v2 API:
  https://tamagui.dev/ui/toast-2
- Tamagui releases, including v2.2.0:
  https://github.com/tamagui/tamagui/releases

Supporting ecosystem sources:

- Expo SDK 55 release:
  https://expo.dev/changelog/sdk-55
- Expo New Architecture guidance:
  https://docs.expo.dev/guides/new-architecture/
- Reanimated 4 setup:
  https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/
- Reanimated 4 compatibility:
  https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
- Reanimated 3 to 4 migration:
  https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/
- React Native Teleport installation:
  https://kirillzyusko.github.io/react-native-teleport/docs/installation

No new product design is proposed. Existing screens and current platform screenshots
are the visual parity baseline.

## Possible approaches incl. pros and cons

### 1. Upgrade everything in one change

- Pros:
  - Fastest path if every change works immediately.
  - Only one temporary dependency state.
- Cons:
  - Mixes Tamagui runtime breakages, Config v5 theme changes, Expo patch changes,
    native portal setup, and Reanimated config changes.
  - Makes layout and animation regressions difficult to attribute.
  - Raises risk in the card board, Sheet, Toast, and settings selector.

### 2. Complete Tamagui 2 on Config v4, then evaluate follow-ups

- Pros:
  - Matches Tamagui's official recommendation to migrate to v2 before deciding
    whether to change from Config v4 to Config v5.
  - Separates compile/runtime failures from visual token/default changes.
  - Allows focused commits and focused rollback during implementation.
  - Makes it possible to establish a green Tamagui 2 baseline before changing themes.
- Cons:
  - Requires separate approval and validation if Config v5 or native Teleport is later
    adopted.

### 3. Upgrade Tamagui packages but retain Config v4 indefinitely

- Pros:
  - Avoids immediate breakpoint, palette, flex, and position changes.
  - Smaller initial visual risk.
- Cons:
  - Leaves the app on the legacy config path.
  - Misses current v5 animation-driver selection and design-system defaults.
  - Creates a second migration task that is easy to postpone indefinitely.

### 4. Replace Tamagui as part of the upgrade

- Pros:
  - Avoids future Tamagui-specific migrations.
- Cons:
  - Grossly exceeds this task's scope.
  - Rewrites the app's UI system, themes, components, and compiler integration.
  - Provides no product benefit for this migration.

### Recommendation

Use approach 2.

1. Align Expo SDK 55 patch versions and native tooling.
2. Upgrade Tamagui runtime/compiler packages to exact `2.2.0` while retaining Config
   v4.
3. Fix removed APIs and establish green web/native builds.
4. Complete the core migration after full web/iOS/Android validation.
5. Decide separately whether native Teleport is justified by a demonstrated context
   or portal requirement.
6. Decide separately whether to migrate to Config v5; if approved, use temporary
   compatibility defaults and a second visual/native validation cycle.

## Open questions to the user incl. recommendations (if any)

- Should the target be `2.0.0` or the current `2.2.0`?
  - Recommendation: target exact `2.2.0`. It is the latest stable release as of
    2026-06-11 and includes Sheet/Toast/Teleport fixes directly relevant to Soli.
- Should Config v5 be part of the migration?
  - Recommendation: no for the core Tamagui 2 story. Tamagui explicitly says Config
    v5 is optional. Create or approve a follow-up after the runtime/API migration is
    green, because v5 changes style defaults and typing across the app.
- Should native portals be enabled?
  - Recommendation: evaluate after the core upgrade. The app uses modal `Sheet` and a
    Toast provider, and Tamagui recommends `react-native-teleport` for custom-context
    preservation. It is still an optional native dependency and should only be added
    in a separately approved change with clean native builds.
- Should Tamagui's Gesture Handler integration be enabled globally?
  - Recommendation: only in the separately approved native-integration follow-up, and
    initially only for Sheet with press events disabled. Global Tamagui press ownership
    can alter nested press behavior; expand it only after dedicated gameplay testing.
- Should the app migrate to Toast v2?
  - Recommendation: no in this task. The current Toast component page still documents
    `ToastProvider`, `ToastViewport`, `useToastController`, and `useToastState`, while
    the v2 migration checklist separately says to move from a `ToastProvider` wrapper
    to a `Toaster` sibling. The published `@tamagui/toast@2.2.0` root types were
    inspected and still export all four legacy symbols. Retain the current structure
    by default and verify it at runtime. Make only the minimum structural change proven
    necessary; do not adopt the separate `@tamagui/toast/v2` API.
- Should `@tamagui/react-native-web-lite` be enabled?
  - Recommendation: defer. It is an optional bundle optimization and intentionally
    not perfectly compatible with `react-native-web`.
- Should Config v5's new colors be used to redesign the app?
  - Recommendation: no. Preserve visual intent first; propose theme redesign as a
    separate product task.
- Should native Burnt toasts be enabled?
  - Recommendation: no. Native Toast mode is currently disabled. Remove the unused
    `burnt` dependency unless another active feature is found to use it.

## New dependencies

Required package changes:

- Upgrade to exact `2.2.0`:
  - `tamagui`
  - `@tamagui/config`
  - `@tamagui/toast`
  - `@tamagui/babel-plugin`
  - `@tamagui/cli`
  - `@tamagui/metro-plugin`
- Add as direct exact `2.2.0` dependencies because the app imports or configures them:
  - `@tamagui/colors`
  - `@tamagui/font-inter`
- Replace:
  - remove `@tamagui/lucide-icons`
  - add `@tamagui/lucide-icons-2@2.2.0`
- Remove unless a live use is found:
  - `burnt`

Conditional native-integration dependencies:

- `@tamagui/native@2.2.0`
- `react-native-teleport@1.1.9`

Config v5 animation entry points such as `@tamagui/config/v5-css` and
`@tamagui/config/v5-reanimated` are exports of `@tamagui/config`; their underlying
animation packages are already exact dependencies of `@tamagui/config@2.2.0`.

Do not add resolutions preemptively in this non-workspace repository. After install,
inspect `yarn why` and `yarn check:tamagui`; add the minimum exact resolution only if
duplicate or incompatible copies are actually present. Candidate resolutions are:

- `tamagui: 2.2.0`
- `@tamagui/core: 2.2.0`
- `@tamagui/web: 2.2.0`
- `@tamagui/helpers-icon: 2.2.0`

Companion package guides:

- `docs/external-package-guides/tamagui.md`
- `docs/external-package-guides/expo.md`
- `docs/external-package-guides/react-native-reanimated.md`
- `docs/external-package-guides/react-native-teleport.md`
- `docs/external-package-guides/tamagui-native.md`
- `docs/external-package-guides/tamagui-lucide-icons-2.md`
- `docs/external-package-guides/tamagui-colors.md`
- `docs/external-package-guides/tamagui-font-inter.md`

`external-packages.mdc` is referenced by the repository instructions but is not
present in the repository or the searched parent/Codex instruction paths. Until its
authoritative location is supplied, the dated package guides and primary-source links
in this folder are the recorded package-research baseline.

## UX/UI Considerations

- Preserve the current app appearance during the runtime migration.
- The following Config v5 risks apply only if its conditional follow-up is approved.
- Config v5 uses Radix Colors v3. The core migration keeps the feature graphic on
  `@tamagui/colors/legacy`; switching it to the v3 purple palette requires visual
  approval in the Config v5 follow-up.
- Config v5 changes `flex` from `flexBasis: auto` to `flexBasis: 0`. Inspect headers,
  settings rows, history cards, game controls, and responsive web content.
- Config v5 changes default position from `relative` to browser `static`. Audit every
  Tamagui container with absolutely positioned descendants, especially:
  - `app/feature-graphic.tsx`
  - card pile/top-row components
  - celebration overlays and badges
  - Sheet and Toast overlays
- Config v5 breakpoints differ from Config v4. The current code does not use the
  renamed `$2xl`/`$2xs` queries, but responsive behavior must still be checked because
  shared breakpoint values changed.
- The draw-count selector requires structural recomposition with `XGroup`; verify it
  remains one visual control and does not regain the removed outer container.
- Tamagui 2 uses standard ARIA prop names on Tamagui components. Keep React Native prop
  names on raw React Native `Pressable` components.
- Verify icon stroke width, color inheritance, baseline alignment, disabled state, and
  button icon sizing after moving to `@tamagui/lucide-icons-2`.
- Verify reduced-motion behavior after `animation` becomes `transition`.
- Shadow colors may render through `color-mix()` on web. Update only snapshots that
  represent intentional v2 output changes.
- Do not adopt new v2 visual features such as background gradients, Motion animations,
  new Menu components, or theme redesigns in this task.

## Components -> Which components to reuse, which components to create?

### Reuse and migrate

- `components/Provider.tsx`
- `components/CurrentToast.tsx`
- `components/settings/DrawCountSelector.tsx`
- History preview `Sheet`
- Existing Tamagui `Button`, `Text`, `Paragraph`, `XStack`, `YStack`, `View`,
  `Separator`, `Switch`, `Sheet`, and Toast components
- Existing `GestureHandlerRootView`
- Existing local header/game/card components

### Create

- `tamagui.build.ts` only if implementation proves a shared compiler/Metro
  configuration is needed.
- A deterministic CSS-generation script if one is absent.
- Conditional Teleport follow-up only: a root native setup module and custom Expo
  Router entry file that run setup before `expo-router/entry`.
- Conditional Config v5 follow-up only: the generated Tamagui config prompt
  recommended by Tamagui's v5 migration guide.

### Replace

- Tamagui `Stack` with Tamagui `View`.
- The v1 ToggleGroup visual props with `XGroup` and `XGroup.Item`.
- `@tamagui/lucide-icons` imports with `@tamagui/lucide-icons-2`.
- `@tamagui/image` usage with `Image` from `tamagui`.

### Do not create

- No new design system wrapper layer solely for this migration.
- No custom Toast system.
- No custom Sheet system.
- No replacement icon system.

## How to fetch data, how to cache

- No application data fetching or caching changes are required.
- Package metadata and migration guidance must be refreshed from official sources at
  implementation time because Tamagui 2.2.0 is newly released.
- Regenerate, rather than hand-edit:
  - `yarn.lock`
  - the existing generated CSS artifact
  - the Tamagui generated prompt only if Config v5 is approved
- Clear Metro and Tamagui caches before the first post-upgrade run.
- Rebuild native binaries after adding `react-native-teleport`; Expo Go is not a valid
  test environment for that optional native package.

## Related tasks

- Draw-count selector:
  `docs/product/draw-count-setting/solitaire-stock-draw-count.md`
- App-wide animation audit:
  `docs/product/animation-audit/app-wide-animation-audit-and-improvement-plan.md`
- Undo scrubber native gesture work:
  `docs/product/undo-scrubber-safe-area/android-undo-scrubber-regression.md`
- Current Tamagui config:
  `tamagui.config.ts`
- Current compiler setup:
  `babel.config.js`, `metro.config.js`
- Current providers:
  `components/Provider.tsx`
- Current Toast:
  `components/CurrentToast.tsx`
- Current modal Sheet:
  `app/history.tsx`

Follow-up tasks that should remain separate:

- Adopt Toast v2.
- Adopt Config v5.
- Add Tamagui native Teleport and selective Gesture Handler integration.
- Evaluate `@tamagui/react-native-web-lite`.
- Enable Tamagui Gesture Handler press integration globally.
- Redesign themes using Config v5's new palettes.
- Modernize raw React Native/Reanimated shadow styles that remain valid after all
  Tamagui-owned component shadows have been migrated as required.
- Migrate deprecated Reanimated worklet helpers from `runOnJS`/`runOnUI` to Worklets
  scheduling APIs.

## Steps to implement and status of these steps

### Planning and research

- [completed] Inventory Tamagui packages, Expo/React Native versions, config, compiler,
  providers, generated CSS, and Tamagui imports.
- [completed] Search for an existing Tamagui 2 migration plan.
- [completed] Research official Tamagui 2 requirements, breaking changes, Config v5,
  Expo setup, Metro setup, native setup, Sheet, Toast, ToggleGroup, Image, and icons.
- [completed] Research Expo SDK 55 New Architecture and patch-alignment requirements.
- [completed] Research Reanimated 4 plugin and compatibility requirements.
- [completed] Research `react-native-teleport` installation and native-build
  requirements.
- [completed] Inspect the published `@tamagui/toast@2.2.0` root types and confirm the
  current provider, viewport, controller, and state APIs remain exported.
- [completed] Run baseline `yarn check:tamagui`.
- [completed] Run baseline `npx expo install --check`.
- [completed] Run baseline `npx expo-doctor@latest`.
- [completed] Write the implementation plan and package guides.
- [completed] Run an independent GPT 5.5 medium-reasoning review and incorporate its
  factual, scope, dependency, and testing corrections.

### Phase 0: Establish a clean migration baseline

- [pending] Merge or commit the current draw-count/settings/history work, then record
  its commit SHA as the migration baseline. `DrawCountSelector` is currently untracked,
  so the current dirty worktree is not a reproducible baseline.
- [pending] Implement on a dedicated `codex/` branch from that named baseline.
- [pending] Capture baseline screenshots for web, iOS, and Android in light and dark
  themes.
- [pending] Capture baseline behavior for draw-count ToggleGroup, history Sheet,
  Toast-provider startup, navigation headers, game controls, card layout, and feature
  graphic. There is currently no live product Toast trigger.
- [pending] Keep generated screenshots local by default and summarize durable findings
  in `docs/product/tamagui-2-upgrade/tamagui-2-validation-report.md`.
- [pending] Run and record current typecheck, lint, unit tests, web export, and native
  build status.

### Phase 1: Align Expo SDK 55 and native tooling

- [completed] Install a CocoaPods version accepted by Expo Doctor and SDK 55, then
  record `pod --version`.
- [completed] Run `npx expo install --fix` to align all SDK 55 package patches.
- [completed] Confirm React Native `0.83.6` and React Native Worklets `0.7.4`.
- [completed] Confirm Reanimated remains on the Expo-compatible `4.2.x` line unless Expo
  explicitly selects another version.
- [completed] Run `npx expo install --check` and `npx expo-doctor@latest` until clean.
- [completed] Run existing typecheck/lint/unit tests before changing Tamagui.

### Phase 2: Upgrade Tamagui runtime while retaining Config v4

- [completed] Replace all Tamagui package ranges with exact compatible versions.
  Runtime, config, Toast, colors, fonts, compiler, CLI, and Metro plugin packages are
  pinned to exact `2.2.0`.
- [completed] Replace `@tamagui/lucide-icons` with
  `@tamagui/lucide-icons-2@2.2.0`.
- [completed] Add direct dependencies for imported Tamagui subpackages.
- [completed] Update or remove `upgrade:tamagui` and `upgrade:tamagui:canary` so they
  cannot silently discard the supported exact-version set.
- [completed] Remove unused `burnt` if no live use is found.
- [completed] Install and inspect `yarn why` output for Tamagui core/web/helpers.
  Yarn PnP reports virtual package instances, but all resolved Tamagui core, web, and
  helper-icon packages are version `2.2.0`.
- [completed] Add resolutions only if `yarn why` or `yarn check:tamagui` proves
  duplicate or incompatible copies exist. No resolutions were needed.
- [completed] Run `yarn check:tamagui`.
- [completed] Keep `@tamagui/config/v4` temporarily and reach a compiling app.

### Phase 3: Migrate removed and changed APIs

- [completed] Replace Tamagui `Stack` and associated types with `View`. Remaining
  `Stack` references are Expo Router navigation components or plain local variable
  names/strings, not Tamagui primitives.
- [completed] Rename Tamagui `animation` props to `transition` without changing Expo
  Router's unrelated `animation` option.
- [completed] Recompose `DrawCountSelector` with `ToggleGroup`, `XGroup`, and
  `XGroup.Item`; remove `backgrounded`, `bordered`, `radiused`, and `padded`.
- [completed] Restore the draw-count selector's visible border after the v2
  `ToggleGroup` migration by making `XGroup` the visual frame. Tamagui 2 documents
  `ToggleGroup` as behavior-only; the old v1 visual-container props should become
  explicit `XGroup` border, background, padding, and `size` radius styles.
- [completed] Restore per-number draw-count item separation without a doubled outer
  outline. `XGroup` owns the single outer border/radius, and each `ToggleGroup.Item`
  after the first uses a selected-aware one-sided border as the internal separator.
  Separators adjacent to the active segment are transparent because Android renders
  the selected segment edge and separator as two visible strokes otherwise.
- [completed] Replace Tamagui component `accessibilityLabel` props with `aria-label`;
  retain React Native accessibility props on raw React Native and React Navigation
  header controls.
- [completed] Move the feature graphic to `Image` from `tamagui`; the published
  v2.2.0 types accept a bundled Expo `require()` result as `src?: number`, so use
  `src={ICON_SOURCE}`, explicit width/height, and `objectFit="contain"`.
- [completed] Update all icon imports to `@tamagui/lucide-icons-2`.
- [completed] Change the feature graphic's direct purple import to
  `@tamagui/colors/legacy` so the core upgrade preserves its v1 palette.
- [completed] Retain the current
  `ToastProvider`/`ToastViewport`/`useToastState` composition and verify it at runtime.
  Web startup and export both mount the provider without Toast API errors; active
  Toast rendering remains out of scope because no live product trigger exists.
- [completed] Audit Button text styling, Group use, Theme inversion, media queries,
  hover events, `space`, responder events, and other removed APIs after TypeScript
  reveals package-level changes.
- [completed] Audit Tamagui-owned shadow props and use `boxShadow` where required for
  equivalent cross-platform behavior; leave React Native animation styles alone unless
  v2 breaks them.
- [completed] Reach green typecheck, lint, unit tests, web start, and web export while
  still using Config v4.

### Phase 4: Reconcile compiler config and generated CSS

- [completed] Compare the existing Metro and Babel setup with Tamagui 2's supported
  Expo configuration and change only options required for v2 compatibility.
- [completed] Change Metro's transitive `@expo/metro-config` import to the documented
  `expo/metro-config` export.
- [completed] Verify whether `isCSSEnabled: true` and the manual `mjs` extension are
  still needed before retaining them. Expo SDK 55 defaults cover both, so the custom
  options were removed.
- [completed] Create `tamagui.build.ts` only if sharing build options removes a real
  mismatch between Metro, Babel, and CLI configuration. No shared build file was
  needed for the current compiler, Metro, and CSS setup.
- [completed] Keep the Tamagui Babel plugin enabled for extraction.
- [completed] Remove the explicit `react-native-reanimated/plugin`; Expo's
  `babel-preset-expo` configures the Worklets transform. Do not add an explicit
  `react-native-worklets/plugin` unless a verified Expo build shows the transform is
  missing.
- [completed] Regenerate and commit CSS with the v2 CLI.
- [completed] Keep the existing CSS filename unless a rename is necessary for tooling;
  Tamagui's `tamagui.generated.css` name is a convention, not a migration requirement.
- [completed] Add a deterministic CSS-generation script if the current scripts do not
  provide one.
- [pending] Verify compiler extraction in at least one representative component with
  Tamagui's debug pragma. This is not required before the first physical-phone smoke
  validation because web export, CSS generation, and Tamagui package checks are
  already green.

### Phase 5: Automated and real-environment validation

- [completed] Run `yarn format:check`.
- [completed] Run `yarn lint:strict`.
- [completed] Run `yarn typecheck` and `yarn typecheck:fallback`.
- [completed] Run focused tests for changed code, then the non-watch full suite with
  `yarn jest --runInBand`.
- [completed] Run `yarn check:tamagui`.
- [completed] Run `npx expo install --check`.
- [completed] Run `npx expo-doctor@latest`.
- [completed] Run a production web export.
- [completed] Test web with Playwright against `http://localhost:8081/`.
- [completed] Use one GPT 5.5 medium-reasoning testing sub-agent for the web test
  report.
- [completed] Kill any stale native build process before native validation. Completed
  before Android and iOS validation; a stale Android release command was stopped before
  the iOS build.
- [completed] Run a clean iOS build, confirm installation, then test with the
  `agent-device` skill.
- [completed] Run `yarn release`, confirm Android installation, then test with the
  `agent-device` skill for the first physical-phone validation point. This was done on
  a physical A065/Pong Android 16/API 36 phone with package `ch.karimattia.soli`
  version `0.8.0 (13)`.
- [completed] Use GPT 5.5 medium-reasoning testing sub-agents sequentially for native
  reports so builds never overlap. Android release build, Android phone smoke, iOS
  clean build, and iOS simulator smoke agents ran sequentially.
- [pending] Compare final visual evidence with baseline and document intentional
  changes. Generated screenshot PNGs should stay local unless a specific review
  needs them; keep the consolidated validation report in the commit instead.
- [pending] Complete Phase 5 for the required Config v4 migration. If either
  conditional follow-up is approved, rerun the entire relevant web/native matrix after
  that follow-up rather than treating the core run as sufficient.

Status note: the user asked to continue only until a first validation on a phone made
sense. Android satisfied that milestone, and iOS simulator validation has now also
passed. Generated screenshot PNGs and per-run markdown reports from these runs were
consolidated into `tamagui-2-validation-report.md` for a reviewable validation trail.
Full Phase 5 still requires final baseline/final visual comparison before calling the
entire Config v4 migration complete.

### Conditional follow-up A: Add explicit native integrations

- [completed] Begin after separate user approval for native portal/context hardening.
- [completed] Add `@tamagui/native@2.2.0` and
  `react-native-teleport@1.1.9`.
- [completed] Create a custom Expo Router entry file that executes native setup before
  `expo-router/entry`.
- [completed] Add `@tamagui/native/setup-teleport`.
- [completed] Configure Tamagui Gesture Handler for Sheet only, with Tamagui press-event
  integration disabled initially.
- [completed] Keep the existing `GestureHandlerRootView`.
- [completed] Do not add Burnt or Tamagui LinearGradient setup because those integrations
  are not active in current product code.
- [completed] Run clean iOS and Android builds after native dependency installation.
- [completed] Verify Sheet context, z-order, and dismissal gestures on physical Android;
  verify provider/viewport startup on both platforms. iOS had no history entries, so its
  History Sheet content path was unavailable.
- [completed] Rerun the applicable static, web export, iOS simulator, and physical
  Android validation matrix.

### Conditional follow-up B: Move Config v4 to Config v5

- [completed] Begin only after Phase 5 and separate approval; Config v5 was explicitly
  approved as a separate follow-up.
- [completed] Change the config import to `@tamagui/config/v5`.
- [completed] Select CSS animations on web and Reanimated animations on native.
- [completed] Initially set `styleCompat: 'legacy'` and
  `defaultPosition: 'relative'` to isolate token/theme changes.
- [completed] Audit Radix v3 colors, component themes, typography, spacing, radius,
  shadows, and light/dark theme output.
- [completed] Audit every Tamagui absolute-positioning parent and add explicit
  `position="relative"` where required.
- [completed] Audit flex layouts and add explicit basis/sizing where required.
- [completed] Remove temporary legacy compatibility settings after affected layout
  assumptions are explicit.
- [completed] Regenerate CSS from the final v5 config. No prompt artifact is generated
  by the current v2 CLI workflow.
- [completed] Rerun the full relevant validation matrix. Static, web, clean iOS
  simulator build/smoke, and physical Android release build/smoke passed.

## Plan: Files to modify

Dependency and configuration:

- `package.json`
- `yarn.lock`
- `babel.config.js`
- `metro.config.js`
- `tamagui.config.ts`
- `tamagui.build.ts` (new, only if shared build options are proven necessary)
- `tamagui-web.css` (regenerated; rename only if tooling requires it)
- `docs/product/tamagui-2-upgrade/tamagui-2-validation-report.md`
- Conditional Teleport follow-up: `index.js` and `tamagui.native.setup.ts` (new)
- Conditional Config v5 follow-up: generated Tamagui prompt file (new; final name
  selected by the v2 CLI)

Provider and overlay behavior:

- `components/Provider.tsx`
- `components/CurrentToast.tsx`
- `app/_layout.tsx`
- `app/history.tsx`

Removed Tamagui APIs and component behavior:

- `components/settings/DrawCountSelector.tsx`
- `app/feature-graphic.tsx`
- `src/features/klondike/components/cards/StockStack.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`

Icon package imports:

- `app/(tabs)/_layout.tsx`
- `app/(tabs)/hello.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/two.tsx`
- `app/history.tsx`
- `app/settings.tsx`
- `src/features/klondike/components/UndoScrubber.tsx`
- `src/features/klondike/components/cards/CardView.tsx`

Additional files may be identified by v2 TypeScript errors, but changes must remain
limited to Tamagui 2 compatibility and directly required visual regressions.

## Files actually modified

- `app/(tabs)/_layout.tsx`
- `app/(tabs)/hello.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/two.tsx`
- `app/_layout.tsx`
- `app/feature-graphic.tsx`
- `app/history.tsx`
- `app/settings.tsx`
- `babel.config.js`
- `components/CurrentToast.tsx`
- `components/Provider.tsx`
- `components/settings/DrawCountSelector.tsx`
- `docs/product/tamagui-2-upgrade/tamagui-2-migration-plan.md`
- `docs/external-package-guides/tamagui.md`
- `docs/external-package-guides/expo.md`
- `docs/external-package-guides/react-native-reanimated.md`
- `docs/external-package-guides/react-native-teleport.md`
- `docs/external-package-guides/tamagui-native.md`
- `docs/external-package-guides/tamagui-lucide-icons-2.md`
- `docs/external-package-guides/tamagui-colors.md`
- `docs/external-package-guides/tamagui-font-inter.md`
- `docs/product/tamagui-2-upgrade/tamagui-2-validation-report.md`
- `metro.config.js`
- `package.json`
- `src/features/klondike/components/UndoScrubber.tsx`
- `src/features/klondike/components/cards/CardView.tsx`
- `src/features/klondike/components/cards/StockStack.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`
- `tamagui-web.css`
- `yarn.lock`

`app.json` already contained a dirty `expo-build-properties` plugin addition before
these Tamagui 2 implementation passes; it was inspected but not edited by this
migration work.

## Identified issues and status of these issues

### High priority

- `@tamagui/lucide-icons` does not have a stable `2.2.0` release and its current
  `latest` tag points to `2.0.0-rc.26`, which depends on RC Tamagui core packages.
  - Status: fixed; replaced with official v2 package
    `@tamagui/lucide-icons-2@2.2.0` across app imports.
- Expo SDK 55 dependencies are patch-level out of alignment.
  - Status: fixed; `npx expo install --check` reports dependencies are up to date.
- CocoaPods is not currently available on PATH.
  - Status: fixed; Homebrew CocoaPods `1.16.2_2` installed and `pod --version`
    reports `1.16.2`.
- Expo Router `55.0.16` and the app's direct React Navigation packages resolved to
  duplicate `@react-navigation/native` and `@react-navigation/core` versions.
  - Status: fixed; direct `@react-navigation/native` and `@react-navigation/drawer`
    ranges were aligned with Expo Router, and Expo Doctor no longer reports duplicate
    native modules.
- Tamagui `Stack` is used in `app/feature-graphic.tsx`, `StockStack.tsx`, and
  `TopRow.tsx`.
  - Status: fixed; Tamagui `Stack` usage was replaced with `View`. Remaining `Stack`
    references are Expo Router navigation, local variable names, or plain strings.
- The draw-count selector relies on ToggleGroup v1 visual-container behavior removed
  in v2.
  - Status: fixed; `ToggleGroup` now owns selection/focus behavior and `XGroup` owns
    the segmented-control layout plus the explicit border/background/padding/size
    frame that replaces the old v1 visual-container props. Each item after the first
    uses a selected-aware one-sided border separator so the numbers remain visibly
    segmented without creating a double outer outline or a double stroke next to the
    selected item.
- The current migration surface is not reproducible: `DrawCountSelector` is untracked
  and settings/history source is modified.
  - Status: not fixed in this thread. Implementation continued in the existing dirty
    worktree because the user requested continuing the upgrade; this should be cleaned
    up before creating a final merge/PR.

### Medium priority

- Config v5 changes flex, position, breakpoints, colors, themes, and animations.
  - Status: implemented as a separately approved follow-up. The feature canvas now
    declares its required relative positioning, CSS/Reanimated drivers are selected
    explicitly, and the draw-count selected/focus styles were hardened for v5.
- `animation` is used by Toast and Sheet.
  - Status: fixed; Tamagui component animation props were renamed to `transition`.
    Expo Router animation options were left unchanged.
- One Tamagui ToggleGroup item uses `accessibilityLabel`.
  - Status: fixed; Tamagui-owned labels use ARIA props. React Native and React
    Navigation controls keep their native accessibility props.
- The feature graphic uses `@tamagui/image` with the old `source` API.
  - Status: fixed; it now uses `Image` from `tamagui` with `src`, explicit dimensions,
    and `objectFit`.
- The Babel config names the compatibility export
  `react-native-reanimated/plugin`.
  - Status: fixed; the explicit plugin was removed and the Android release build
    verified Expo's preset path did not block native compilation.
- Metro imports `@expo/metro-config` transitively instead of Expo's documented
  `expo/metro-config` export.
  - Status: fixed; Metro now imports `expo/metro-config`, and redundant CSS/`.mjs`
    overrides were removed because Expo SDK 55 provides them by default.
- Existing Tamagui upgrade scripts target `latest`/`canary` and can override the
  supported exact version set.
  - Status: fixed; those scripts were removed and a deterministic CSS-generation
    script was added instead.
- Direct imports of `@tamagui/colors` and `@tamagui/font-inter` currently rely on
  transitive dependencies.
  - Status: fixed; both are direct exact dependencies.
- `@tamagui/colors@2.2.0` root purple values differ from 1.140.4, while
  `@tamagui/colors/legacy` preserves the old HSL values.
  - Status: fixed for the core migration; the feature graphic imports
    `@tamagui/colors/legacy`. Consider v3 colors only in the separately approved
    Config v5 follow-up.
- Tamagui-generated CSS is named `tamagui-web.css` and was last generated before this
  migration.
  - Status: fixed; regenerated with `@tamagui/cli@2.2.0` and retained the existing
    filename.

### Low priority / separate tasks

- Current Reanimated code uses deprecated `runOnJS` and `runOnUI` re-exports.
  - Status: not required for Tamagui 2; track separately.
- `burnt` is installed but native Toast mode is disabled and no live import exists.
  - Status: fixed; removed from `package.json` and `yarn.lock`.
- Toast v2 offers a new architecture and stacking API.
  - Status: explicitly deferred.
- Tamagui's migration checklist says to replace the Toast provider wrapper with a
  `Toaster` sibling, but the current v2 Toast component documentation and
  `@tamagui/toast@2.2.0` root export still document the legacy provider/hooks API.
  - Status: package types confirmed compatible with the current imports; runtime
    verification remains in Phase 3. Do not infer that adopting
    `@tamagui/toast/v2` is required.
- `@tamagui/react-native-web-lite` may reduce web bundle size.
  - Status: explicitly deferred pending isolated compatibility and bundle testing.
- Native Teleport may improve custom-context behavior in Sheet/Toast portals.
  - Status: completed as a separately approved follow-up. Fresh iOS and Android builds
    passed, and the populated physical-Android History Sheet preserved content,
    z-order, and dismissal behavior.
- `external-packages.mdc` is referenced by repository instructions but was not found.
  - Status: dated package guides were created from primary sources; locate the
    authoritative rule file before implementation if it exists elsewhere.
- The clean iOS simulator build installs `ch.karimattia.soli` as version `0.5.0`
  build `10`, while `app.json` and the Android release validation use `0.8.0` build
  `13`.
  - Status: fixed and confirmed on the installed iOS simulator app.
    `ios/Soli/Info.plist` now reads `$(MARKETING_VERSION)` and
    `$(CURRENT_PROJECT_VERSION)`, and Debug/Release Xcode build settings now use
    `0.8.0` and `13`. A clean iOS simulator reinstall reports
    `CFBundleShortVersionString = 0.8.0` and `CFBundleVersion = 13`.
- Generated validation screenshots and per-run reports made the migration commit noisy
  and expensive to review.
  - Status: fixed for commit prep; all screenshot PNGs and generated per-run markdown
    reports were removed. The migration plan, dated package guides, and
    `docs/product/tamagui-2-upgrade/tamagui-2-validation-report.md` are the retained
    documentation set.

## Testing

### Baseline checks performed for this plan

- `yarn check:tamagui`
  - Result: passed on the currently resolved Tamagui `1.140.4` packages.
- `npx expo install --check`
  - Result: failed because 15 Expo/React Native packages are behind SDK 55's expected
    patch versions.
  - Notable expected updates:
    - Expo `55.0.4` to `~55.0.26`
    - React Native `0.83.2` to `0.83.6`
    - React Native Worklets `0.7.2` to `0.7.4`
    - Expo Router `55.0.3` to `~55.0.16`
    - Jest Expo `55.0.9` to `~55.0.18`
- `npx expo-doctor@latest`
  - Result: 17/19 checks passed.
  - Failures: missing CocoaPods and Expo SDK patch mismatches.
- Phase 1 verification after implementation
  - `pod --version`: `1.16.2`.
  - `brew list --versions cocoapods`: `cocoapods 1.16.2_2`.
  - `diff -q ios/Podfile.lock ios/Pods/Manifest.lock`: no differences reported.
  - `npx expo install --check`: passed; dependencies are up to date.
  - `npx expo-doctor@latest`: passed; 19/19 checks passed.
  - React Navigation graph: direct app dependencies and Expo Router now share
    `@react-navigation/native@7.3.1` and `@react-navigation/core@7.20.0`.
- GPT 5.5 medium-reasoning testing sub-agent after Phase 1
  - `npx expo install --check`: passed.
  - `npx expo-doctor@latest`: passed, 19/19.
  - `yarn typecheck`: passed.
  - `yarn lint:strict`: passed, 0 warnings and 0 errors across 78 files.
  - `yarn jest --runInBand`: passed, 6 suites and 40 tests.
- Published `@tamagui/toast@2.2.0` type inspection
  - Result: root exports include `ToastProvider`, `ToastViewport`,
    `useToastController`, and `useToastState`; the existing legacy API remains
    available despite the migration checklist's `Toaster` note.
- Published package inspection
  - Result: bundled-image `src?: string | number`, icon dependency alignment, font OTF
    exports, Config v4/v5 shorthand settings, and legacy/v3 color exports were
    verified from the `2.2.0` packages.
- Documentation validation
  - Result: all required plan headings are present, every implementation step has an
    explicit status, no trailing whitespace was found, and every cited URL returned
    HTTP 200 on 2026-06-11.
- Independent GPT 5.5 medium-reasoning review
  - Result: two read-only review passes were completed. Corrections were incorporated
    for Expo Babel behavior, optional Config v5/Teleport scope, reproducible baseline,
    conditional resolutions, upgrade scripts, Metro import, test commands, bundled
    images, package guides, and Tamagui-owned shadows.

### Phase 2-4 implementation validation

- Dependency graph
  - Result: Tamagui runtime, compiler, CLI, Metro plugin, config, Toast, colors,
    fonts, and icon packages are exact `2.2.0`.
  - `yarn why @tamagui/core`, `yarn why @tamagui/web`, and
    `yarn why @tamagui/helpers-icon` showed only version `2.2.0` entries. Yarn PnP
    virtualizes some package instances, but no incompatible Tamagui version was found,
    so no `resolutions` entry was added.
- Source API audit
  - Result: no remaining `@tamagui/lucide-icons`, `@tamagui/image`, root
    `@tamagui/colors` purple imports, Tamagui `Stack`, Tamagui `animation` props, or
    removed ToggleGroup visual props were found in app code. Remaining `Stack`
    matches are Expo Router components, variable names, or documentation strings.
- GPT 5.5 medium-reasoning static validation sub-agent
  - `yarn format:check`: passed after formatting the provider file.
  - `yarn lint:strict`: passed, 0 warnings.
  - `yarn typecheck`: passed.
  - `yarn typecheck:fallback`: passed.
  - `yarn jest --runInBand`: passed, 6 suites and 40 tests.
  - `yarn check:tamagui`: passed.
  - `npx expo install --check`: passed.
  - `npx expo-doctor@latest`: passed, 19/19 checks.
  - `yarn generate:tamagui-css`: passed and was idempotent.
  - `npx expo export --platform web`: passed, producing 14 routes and 3 assets.
- GPT 5.5 medium-reasoning web smoke sub-agent
  - `http://localhost:8081/`, `/settings`, `/history`, and `/feature-graphic` rendered
    successfully.
  - Draw-count selector interaction changed Draw 1 to Draw 3 and back to Draw 1.
  - A React DOM warning for passing `accessibilityLabel` to a Tamagui web `Button` was
    found, traced to `app/(tabs)/index.tsx`, fixed with `aria-label`, and the repeated
    smoke check no longer emitted that warning.
  - Remaining non-blocking warnings: raw React Native web `shadow*` style warnings,
    raw React Native web `pointerEvents` deprecation warnings, Tamagui warning 001
    about skipped module loading, and a `NO_COLOR` warning.
- Android release build sub-agent
  - Command: `ADB_WIFI_TARGET=192.168.1.12 yarn release`.
  - Target: physical A065/Pong at `192.168.1.12:38793`, Android 16/API 36.
  - Result: Gradle `BUILD SUCCESSFUL in 7m 5s`.
  - Install completed at `2026-06-11 17:50:40 +0200`.
  - Installed package `ch.karimattia.soli` upgraded from `0.7.0 (12)` to
    `0.8.0 (13)`.
  - APK:
    `android/app/build/outputs/apk/release/app-release.apk`, 99,330,628 bytes,
    SHA-256 `593d2548d474f39fcaae989ae068204f011e6e4dc76ad796252734172b3f5d43`.
  - Signature: valid APK Signature Scheme v2, RSA 2048, Soli upload certificate.
  - Repository audit: no tracked or untracked repo changes were caused by the build.
  - Warnings: Tamagui warning 001, Expo/worklets dependency warnings, Gradle
    deprecation warnings, and a stale mDNS alias that prevented automatic port reverse
    and foreground launch. APK installation was unaffected.
- Consolidated validation report
  - Durable future-relevant findings from the generated web, iOS, and Android reports
    were merged into
    `docs/product/tamagui-2-upgrade/tamagui-2-validation-report.md`.
  - The retained report covers static checks, web validation, Android release/physical
    phone validation, iOS clean-build/simulator validation, draw-count border behavior,
    iOS version metadata, platform-specific testing caveats, and deferred follow-ups.
  - Generated screenshot PNGs and per-run markdown reports were removed from the commit.

### Required static validation after implementation

- `yarn format:check`
- `yarn lint:strict`
- `yarn typecheck`
- `yarn typecheck:fallback`
- Focused Jest tests for changed code where the existing harness can exercise it
- `yarn jest --runInBand`
- `yarn check:tamagui`
- `npx expo install --check`
- `npx expo-doctor@latest`
- `npx expo export --platform web`
- `yarn why` checks showing one compatible Tamagui core/web graph

### Required web validation

- Start or restart Expo web with `yarn web` on port 8081.
- Use Playwright through the browser skill.
- Capture `/`, `/settings`, `/history`, and `/feature-graphic` at 390x844 and
  1280x800 in light and dark themes. Keep screenshots local unless a reviewer asks
  for them in the repository.
- Test DrawCountSelector mouse, touch emulation, keyboard arrows, focus, disabled state,
  and accessible name.
- Open/close the history Sheet and test overlay dismissal and reduced motion.
- Verify Toast provider/viewport startup and console health. Active Toast rendering is
  not part of the core matrix because no live product trigger exists.
- Run representative gameplay interactions and verify card geometry.
- Visit the feature graphic route and compare layout, image, colors, and shadows.
- Check console for Tamagui config, hydration, extraction, and duplicate-package errors.

### Required native validation

- Before each native build, confirm no other build process is running and terminate any
  stale build.
- iOS:
  - Run a clean build on the connected simulator.
  - Confirm the newly built binary was installed.
  - Test startup, theme, navigation, DrawCountSelector, history Sheet drag/dismiss,
    new game, draw/recycle, undo scrubber, and celebration.
- Android:
  - Run `yarn release` only after the iOS build/test is complete.
  - Unlock the physical device with `scripts/android-unlock-pattern.sh` if needed.
  - Confirm the fresh release build was installed.
  - Repeat the same interaction matrix, paying special attention to Sheet gestures,
    icon rendering, card touches, and ToggleGroup selection.
- In the optional Teleport follow-up only, test native portal context by opening the
  history Sheet after changing settings/history state and confirming it sees current
  providers.
- Use GPT 5.5 medium-reasoning testing sub-agents for detailed reports, one build at a
  time.
