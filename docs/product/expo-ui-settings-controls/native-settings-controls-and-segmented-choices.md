# Expo UI Settings Controls Native Settings Controls and Segmented Choices

## User prompt

```text
Implement Expo UI native Settings controls and segmented choices on `main`, using the simplest one-to-one native implementations possible.

Workspace: `/Users/karim/kDrive/Code/soli`.

Branch requirement:
- Confirm branch is `main` before editing.
- Stay on `main`; do not create or switch branches.
- Do not stage or commit.

You are not alone in the codebase. Do not revert or overwrite changes made by others. Adapt to the current clean working tree.

User direction, which should control implementation choices:
- `Check instructions to Plato. Prefer 1:1 native implementations. Prefer simplifications. These are simple toggles and choices, no need to overengineer and question existing too complicated solutions.`
- `Do Settings controls and segmented choices in similar way.`

Interpretation:
- Use Expo UI native components directly and trust their platform defaults.
- Prefer deleting custom styling/platform plumbing over recreating it around Expo UI.
- Do not build a mini design system, platform adapter layer, elaborate wrapper hierarchy, modifiers, or custom native colors.
- A tiny component is acceptable only when it directly represents a repeated product control and materially removes duplication.
- Keep Tamagui for surrounding layout and typography; migrate only the actual toggles and segmented choices.

Repo process requirements:
- Research official Expo UI docs before implementation.
- Create a detailed implementation plan before code changes at:
  `docs/product/expo-ui-settings-controls/native-settings-controls-and-segmented-choices.md`
- Create a dated package/API guide at:
  `docs/product/expo-ui-settings-controls/expo-ui-settings-controls-expo-ui-guide.md`
  Date: 2026-06-15.
- Include the complete user prompt from this task 1:1 in the plan doc.
- Include all required AGENTS sections:
  `# [Feature Name] [Story Name]`, `## User prompt`, `## Description`, `## Acceptance Criteria`, `## Design links`, `## Possible approaches incl. pros and cons`, `## Open questions to the user incl. recommendations (if any)`, `## New dependencies`, `## UX/UI Considerations`, `## Components`, `## How to fetch data, how to cache`, `## Related tasks`, `## Steps to implement and status of these steps`, `## Plan: Files to modify`, `## Files actually modified`, `## Identified issues and status of these issues`, `## Testing`.
- Update checklist status after each step and leave no stale pending items.
- No gold plating or unrelated Settings refactors.

Official docs to verify and use:
- Universal Expo UI overview: https://docs.expo.dev/versions/latest/sdk/ui/universal/
- Universal Switch: https://docs.expo.dev/versions/latest/sdk/ui/universal/switch/
- Universal Host: https://docs.expo.dev/versions/latest/sdk/ui/universal/host/
- Expo UI SegmentedControl drop-in: https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/segmentedcontrol/

Current context:
- `@expo/ui ~56.0.17` is already installed and used by `components/AppSheet.tsx`.
- `app/settings.tsx` currently uses Tamagui `Switch` with Android-only `nativeProps`, theme color calculations, and Tamagui `Button` choices for Auto/Light/Dark.
- `components/settings/DrawCountSelector.tsx` currently uses a heavily styled Tamagui `ToggleGroup`/`XGroup` for Draw 1–5.
- Draw count values come from `DRAW_COUNT_OPTIONS`, and changes must still call `normalizeDrawCount` before `onValueChange`.

Required implementation:
1. Settings toggles
- Replace the Tamagui switch inside the Settings toggle row with Expo UI universal `Switch`.
- Use the documented controlled API: `value`, `onValueChange`, `disabled`.
- Wrap native Expo UI content in universal `Host`; use the simplest sizing that renders correctly.
- Remove Android-specific thumb/track color logic and `useTheme`/`Platform` imports if no longer needed.
- Preserve label, description, disabled behavior, inactive text/opacity semantics, and setting callbacks.
- Do not recreate custom switch colors unless a real tested problem requires it.

2. Draw count segmented choice
- Replace the custom Tamagui ToggleGroup/XGroup implementation with `@expo/ui/community/segmented-control`.
- Use `values`, `selectedIndex`, and `onChange` directly.
- Preserve Draw 1–5, disabled behavior, current value description, solvability note, and normalization.
- Delete custom separator/border/focus/selected-color logic. Trust native styling.

3. Theme segmented choice
- Replace Auto/Light/Dark Tamagui buttons with the same Expo UI SegmentedControl API.
- Keep the mapping explicit and small: selected index from `themeOptions`, callback to `setThemeMode`.
- Preserve disabled-until-hydrated behavior.
- Do not migrate surrounding headings, paragraphs, separators, or layout.

Scope decisions:
- Do not migrate the history sheet, game board, navigation button, animation internals, or other screens.
- Do not add a new dependency; `@expo/ui` already exists.
- Reuse the existing @expo/ui dependency guide where helpful, but still create the required scoped API guide for this task.
- Avoid changing settings state/storage behavior.

Likely write scope:
- `app/settings.tsx`
- `components/settings/DrawCountSelector.tsx`
- At most one small reusable component under `components/settings/` if it genuinely makes both segmented controls simpler; otherwise use the Expo component directly.
- `docs/product/expo-ui-settings-controls/*`

Testing expectations:
- Run `npx expo install --check`.
- Run `yarn typecheck`, `yarn lint`, `yarn format:check`, and `yarn jest --runInBand`.
- Run `git diff --check`.
- Test Settings web at `http://localhost:8081/settings`: confirm all toggles render/change, Draw 1–5 renders and changes, Auto/Light/Dark changes, and disabled/hydration state has no obvious regression. Use the repo-preferred browser tooling if available.
- Native UI is the purpose, so test at least the connected Android device using the installed `agent-device` CLI if available. If unavailable, use ADB fallback and document it. Verify actual install/build freshness before claiming native results.
- Do not run iOS and Android builds concurrently. If full native builds are outside practical scope, clearly state residual risk; do not fake native validation.

Important existing browser note:
- The coordinator saw a browser overlay claiming `Unable to resolve module components/Provider` while the working tree was clean. Determine whether this is a stale Metro/browser overlay before changing unrelated imports. Do not modify `app/_layout.tsx` or path aliases unless you reproduce the error from a fresh server and it is genuinely caused by this task.

Final report:
- List changed files.
- State exactly what custom complexity was removed.
- Report exact commands and results.
- Identify any remaining native validation risk.
- Do not stage or commit.
```

```text
Looks great! Just tested myself.
One issue: In dark mode, the non-selected entries are hard to read. pls search web and check best practice.
Is this due to something in our code or the library?
```

```text
Search web and expo documentation: Is there a way to do this globally? Like in tamagui? Consider: Also needed for switch and sheet.
Otherwise... Just remove setting for dark mode and let this run fully through OS?
```

```text
implement this now and remove the lower level plumbing. no testing, i will test myself.
```

```text
this doesn't seem to fully work. the provider only changes when restarting the app. after changing the mode but before restarting, the app changes everywhere except in the expo ui components. research web. check for easy fix. best practice. if available, do. otherwise, remove in app light / dark mode switcher.
```

```text
now, when going to settings, changing dark more, going to play, changing back, going back to settings, the toggles and all other expo ui components just disappear. connected android. currently blank where components should be
```

## Description

Replace only the interactive controls on Settings with the closest direct Expo UI
native equivalents. The surrounding Tamagui screen layout and typography remain
unchanged.

The existing non-theme settings state, persistence callbacks, hydration gating,
inactive animation semantics, draw-count normalization, and descriptive text remain
the source of truth. Expo UI and the platform own the switches' and segmented
controls' visual appearance. Light and dark appearance follow the OS because Expo's
Android runtime override does not reliably refresh Expo UI Hosts without restarting.

## Acceptance Criteria

- Work remains on `main`; no branch is created or switched.
- The initially clean working tree is respected and no unrelated files are changed.
- Nothing is staged or committed.
- Official Expo UI documentation is researched before implementation.
- A dated scoped Expo UI guide is created.
- Settings toggle rows use universal `Host` and `Switch` from `@expo/ui`.
- Switches use only the controlled `value`, `onValueChange`, and `disabled` behavior
  required by the product.
- Toggle labels, descriptions, callbacks, hydration disabling, and inactive text and
  control opacity remain intact.
- Android `Platform`, Tamagui `useTheme`, `nativeProps`, thumb colors, track colors,
  Tamagui `Switch.Thumb`, and switch-specific custom sizing are removed.
- Draw count uses `@expo/ui/community/segmented-control` with
  `DRAW_COUNT_OPTIONS`, a controlled selected index, and `onChange`.
- Draw-count changes still pass through `normalizeDrawCount` before
  `onValueChange`.
- Draw count remains disabled while requested, and its current-value and solvability
  descriptions remain unchanged.
- The in-app Auto/Light/Dark setting is removed after the app-level override failed to
  update Expo UI controls reliably at runtime.
- Tamagui, navigation, status bar, switches, segmented controls, and sheets all follow
  the OS color scheme.
- Persisted `themeMode` state and its setter are removed.
- Custom Draw count borders, separators, selected colors, press styles, focus styles,
  and nested Tamagui toggle composition are deleted.
- Surrounding headings, paragraphs, separators, section ordering, navigation, safe
  area behavior, state, and storage are not migrated or refactored.
- No new dependency is added.
- Dependency, type, lint, Jest, and diff checks pass. Any format failure is identified
  as task-related or pre-existing.
- A fresh Android release is built, installed, and exercised on the connected device
  without running an iOS build concurrently.
- Settings web is tested from a fresh Metro server before treating the reported
  `components/Provider` overlay as a real source issue.
- The root provider does not call `Appearance.setColorScheme`.
- No screen-level theme value or segmented-control appearance prop is threaded through
  Settings.
- The remaining Draw count segmented control reads the OS scheme locally and passes
  Expo UI's documented `appearance` prop; no theme value is threaded through Settings.
- Dark mode keeps selected and non-selected segment labels legible without custom
  text, border, or fill colors.
- Expo Modules Core is updated to `56.0.17`, whose Android patch preserves Expo UI
  Compose content when `react-native-screens` detaches and reattaches screens.

## Design links

- Universal Expo UI overview:
  https://docs.expo.dev/versions/latest/sdk/ui/universal/
- Universal Switch:
  https://docs.expo.dev/versions/latest/sdk/ui/universal/switch/
- Universal Host:
  https://docs.expo.dev/versions/latest/sdk/ui/universal/host/
- Expo UI SegmentedControl drop-in:
  https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/segmentedcontrol/
- Existing Expo UI guide:
  `docs/product/expo-ui-history-preview-sheet/expo-ui-history-preview-sheet-expo-ui-guide.md`
- Scoped API guide:
  `docs/product/expo-ui-settings-controls/expo-ui-settings-controls-expo-ui-guide.md`

## Possible approaches incl. pros and cons

### Direct Expo UI controls in the existing components

- Pros: closest one-to-one mapping to the official APIs.
- Pros: removes the custom platform colors and segmented-control recreation.
- Pros: keeps product-specific state mapping beside the setting it controls.
- Pros: leaves surrounding Tamagui layout untouched.
- Cons: the retained segmented control contains a short selected-index mapping.

Recommendation: use this approach. The mappings are small and materially clearer than
introducing another abstraction.

### Follow the OS color scheme everywhere

- Pros: one reliable source for Tamagui, navigation, Expo UI controls, and sheets.
- Pros: uses Expo's documented and recommended automatic appearance configuration.
- Pros: removes manual theme state, persistence, setters, and native override code.
- Cons: users can no longer override the OS theme inside Soli.

Recommendation: use this approach. React Native documents an app-level override, but
Expo has an accepted Android issue where `Appearance.setColorScheme` does not update
at runtime. Per-control Host props would restore plumbing and still do not provide a
clean universal BottomSheet override.

### Update Expo Modules Core to the released lifecycle fix

- Pros: directly fixes Expo UI compositions disappearing after navigation.
- Pros: the upstream patch targets `react-native-screens`, matching the reproduced
  Settings to Play to Settings flow.
- Pros: remains within Expo SDK 56 and needs no component remount keys or wrappers.
- Cons: requires a fresh native build because `expo-modules-core` contains Android
  native code.

Recommendation: update Expo to the SDK 56 patch that resolves
`expo-modules-core ~56.0.17`.

### Create a shared segmented-choice wrapper

- Pros: could centralize `values`, `selectedIndex`, and `onChange` mapping.
- Cons: would need a generic value model for only two callsites.
- Cons: hides Expo UI's already-small API and adds a wrapper hierarchy the user asked
  to avoid.

Recommendation: do not create this wrapper unless implementation reveals meaningful
duplication beyond the three documented props.

### Keep or adapt Tamagui controls

- Pros: would preserve the current exact visual treatment.
- Cons: retains custom Android switch color plumbing and a large custom segmented
  control.
- Cons: conflicts with the request to trust native defaults and simplify.

Recommendation: reject this approach.

## Open questions to the user incl. recommendations (if any)

No blocking questions. The requested controls, APIs, scope, and simplification
direction are explicit.

No Plato-specific instruction file exists in the repository. Recommendation: treat the
two quoted user-direction lines in this prompt as the controlling Plato guidance.

Follow-up finding: Expo UI correctly follows its native Host environment, but Expo's
Android integration does not reliably apply React Native's runtime app-level override
to those Hosts until restart. There is no Expo UI provider that configures all
independently created Hosts, and universal BottomSheet creates its own Host internally.
Use the OS scheme everywhere instead of rebuilding per-control theme plumbing.

## New dependencies

No new package. `@expo/ui` is already installed. Update the existing Expo SDK 56 patch
resolution so `expo-modules-core` moves from `56.0.16` to `56.0.17`.

The repository does not contain `external-packages.mdc`; this is non-blocking because
the task adds no package. The required scoped API guide still records the official
Expo UI assumptions used by the implementation.

## UX/UI Considerations

- Native switches should use the platform's standard appearance and interaction.
- Native segmented controls may differ visually across Android, iOS, and web; that is
  intentional.
- OS appearance is the single source for Tamagui and independently hosted Expo UI
  controls and sheets.
- Existing labels and explanatory text remain in Tamagui so Settings hierarchy and
  readability do not change.
- Hydration must continue preventing early changes to switches and segmented controls.
- Inactive animation rows keep muted text and a lower-opacity switch without changing
  the existing ability to edit individual preferences.
- The retained Draw count segmented control should occupy the available Settings
  content width without custom borders, colors, or platform-specific styling.

## Components

- Reuse `SettingsScreen` and its local `ToggleRow` in `app/settings.tsx`.
- Replace only `ToggleRow`'s Tamagui switch with universal Expo UI `Host` and `Switch`.
- Reuse `DrawCountSelector` in
  `components/settings/DrawCountSelector.tsx`; replace only its Tamagui
  `ToggleGroup`/`XGroup` control.
- Use `SegmentedControl` directly for Draw count.
- Remove the Appearance section and its theme SegmentedControl.
- Resolve Tamagui and navigation themes directly from `useColorScheme()`.
- Create no additional component unless direct implementation becomes less clear.

## How to fetch data, how to cache

No fetching or caching changes for retained settings.

- Settings continue to come from `useSettings()`.
- Settings persistence and hydration remain owned by `src/state/settings.tsx`.
- Legacy persisted `themeMode` values are ignored and disappear on the next settings
  write.
- Draw count options and normalization remain owned by
  `src/solitaire/drawCount.ts`.

## Related tasks

- `docs/product/expo-ui-history-preview-sheet/prototype-expo-ui-bottom-sheet.md`
- `docs/product/settings-clean-up/settings-clean-up.md`
- `docs/product/draw-count-setting/solitaire-stock-draw-count.md`
- `docs/product/tamagui-config-v5/config-v5-migration.md`

## Steps to implement and status of these steps

- [completed] Confirm the branch is `main` and the working tree is clean.
- [completed] Read repository instructions and search for Plato-specific guidance.
- [completed] Research the official Expo UI universal, Host, Switch, and
  SegmentedControl docs.
- [completed] Inspect current Settings, Draw count, installed `@expo/ui` types, and
  native implementations.
- [completed] Create this detailed implementation plan before code changes.
- [completed] Create the dated scoped Expo UI API guide.
- [completed] Replace Settings toggle controls with universal Expo UI Switch.
- [completed] Replace the Draw count custom ToggleGroup with Expo UI SegmentedControl.
- [completed] Replace theme buttons with Expo UI SegmentedControl.
- [completed] Run dependency, type, lint, format, Jest, and diff checks for the
  original native-control migration.
- [completed] Start a fresh web server and test Settings controls.
- [completed] Run a fresh Android release build, verify installation, and test Settings
  with `agent-device`.
- [completed] Research the reported dark-mode contrast issue in official Expo and
  Android sources.
- [completed] Research React Native's app-wide Appearance override and Expo UI Host
  behavior for controls and sheets.
- [completed] Synchronize the setting globally through
  `Appearance.setColorScheme`.
- [completed] Remove lower-level segmented-control appearance props and prop threading.
- [completed] Review the scoped diff without running tests, per the user's explicit
  direction.
- [completed] Research the reported runtime refresh failure in React Native and Expo
  documentation and issue tracking.
- [completed] Determine that no simple reliable Expo-wide runtime override covers
  controls and universal sheets on Android.
- [completed] Remove the in-app Auto/Light/Dark control and global Appearance override.
- [completed] Remove obsolete theme state, persistence mapping, and setter.
- [completed] Review the OS-only scoped diff without running tests.
- [completed] Reproduce blank Expo UI controls on the connected Android device.
- [completed] Identify Expo Modules Core 56.0.17 as the released upstream fix for
  Expo UI recomposition when switching `react-native-screens`.
- [completed] Update the Expo SDK patch resolution to install
  `expo-modules-core 56.0.17`.
- [completed] Build and install a fresh Android release.
- [completed] Verify Settings controls survive OS theme changes and screen navigation.
- [completed] Keep Draw count labels legible in OS dark mode with a local documented
  `appearance` override and no screen-level prop plumbing.
- [completed] Run focused dependency and diff checks.

## Plan: Files to modify

- `app/_layout.tsx`
- `app/settings.tsx`
- `components/Provider.tsx`
- `components/settings/DrawCountSelector.tsx`
- `package.json`
- `yarn.lock`
- `src/state/settings.tsx`
- `src/theme/index.ts`
- `docs/product/expo-ui-settings-controls/native-settings-controls-and-segmented-choices.md`
- `docs/product/expo-ui-settings-controls/expo-ui-settings-controls-expo-ui-guide.md`

## Files actually modified

- `app/_layout.tsx`
- `app/settings.tsx`
- `components/Provider.tsx`
- `components/settings/DrawCountSelector.tsx`
- `package.json`
- `yarn.lock`
- `src/state/settings.tsx`
- `src/theme/index.ts`
- `docs/product/expo-ui-settings-controls/native-settings-controls-and-segmented-choices.md`
- `docs/product/expo-ui-settings-controls/expo-ui-settings-controls-expo-ui-guide.md`

## Identified issues and status of these issues

- No Plato-specific repository instruction was found.
  - Status: non-blocking; the task's quoted Plato direction is explicit and controls
    implementation choices.
- `external-packages.mdc` is referenced by repository instructions but is absent.
  - Status: non-blocking; no dependency is being added, and the scoped official-docs
    guide is still being created.
- A coordinator previously saw a web overlay reporting an unresolved
  `components/Provider`.
  - Status: resolved as stale. A fresh web server loaded Settings without the overlay;
    no unrelated import or alias change was needed.
- Dark-mode non-selected segment labels use a light-theme content color when Soli
  forces Dark over a light device theme.
  - Status: resolved structurally by removing the in-app override. The app and all
    native controls now follow the same OS scheme.
- `Appearance.setColorScheme` updates Tamagui and navigation state but Expo UI Hosts
  remain on their previous scheme until app restart on the tested Android setup.
  - Status: the global override was removed. Expo has an accepted Android issue for
    runtime `Appearance.setColorScheme`; per-Host overrides were rejected because they
    restore lower-level plumbing and do not cleanly cover universal BottomSheet.
- Expo UI controls disappear after navigating away from and back to Settings.
  - Status: resolved and validated on connected Android. The failure was reproduced
    with `expo-modules-core 56.0.16`; Expo Modules Core 56.0.17 was released on
    2026-06-15 specifically to fix Expo UI recomposition when switching screens in
    `react-native-screens`. A fresh release containing 56.0.17 kept every Expo UI
    control visible through Settings to Play to Settings navigation in both dark and
    light OS modes.
- Draw count's unselected segment labels were difficult to read in Android dark mode.
  - Status: resolved and validated on connected Android. The control reads the OS
    scheme locally and passes Expo UI's documented `appearance` value. It does not
    add custom colors or restore screen-level theme plumbing.
- The connected Android device appears twice through wireless ADB discovery.
  - Status: resolved during the original migration validation by selecting one online
    serial consistently.
- No sub-agent execution tool is exposed in this session.
  - Status: resolved for the original migration by running the required checks
    directly and recording exact evidence.
- Repository-wide format checking reports three solver scripts outside this task.
  - Status: pre-existing and left untouched:
    `scripts/harvest-solvable-new.js`, `scripts/klondike-solver-new.js`, and
    `scripts/solvable-dataset.js`. All modified source and documentation files are
    formatted.

## Testing

Planned:

- `npx expo install --check`
- `yarn typecheck`
- `yarn lint`
- `yarn format:check`
- `yarn jest --runInBand`
- `git diff --check`
- Fresh Expo web server at `http://localhost:8081/settings`
- Web interaction checks for toggles, Draw 1-5, Auto/Light/Dark, and hydration
- `yarn release` with no concurrent native build
- APK install freshness verification on the connected Android device
- `agent-device` Settings interaction and state checks

Results:

- Original migration: `npx expo install --check`, `yarn typecheck`, `yarn lint`,
  `yarn format:check`, `yarn jest --runInBand`, and `git diff --check` passed.
- Original migration: Jest passed 6 suites and 40 tests.
- Original migration: a fresh web server loaded Settings without the stale Provider
  overlay; controls changed and restored without browser console errors.
- Original migration: `yarn release` completed successfully, the fresh APK was
  installed on the connected Android device, and Settings controls were exercised
  with `agent-device`.
- OS-only follow-up: no tests were run because the user previously requested no
  testing and will verify the result manually.
- Global Appearance follow-up: no tests were run because the user explicitly requested
  no testing and will verify it manually.
- Lifecycle fix: `yarn up expo@^56.0.0` resolved Expo `56.0.12` and
  `expo-modules-core 56.0.17`.
- Lifecycle fix: `npx expo install --fix` aligned `@expo/ui` to `56.0.18`,
  `expo-build-properties` to `56.0.19`, `expo-font` to `56.0.7`, and `expo-router` to
  `56.2.11`.
- Final dependency check: `npx expo install --check` passed with dependencies up to
  date.
- Final static checks: `yarn typecheck` and `yarn lint` passed.
- Final tests: `yarn jest --runInBand` passed 6 suites and 40 tests.
- Final diff validation: `git diff --check` passed.
- Final format check: `yarn format:check` reported only the three unrelated existing
  solver scripts listed above; none were modified.
- Final Android build: `yarn release` passed with 642 actionable tasks. Gradle linked
  `expo-modules-core 56.0.17` and `expo-ui 56.0.18`.
- Final install freshness: APK modification time was `2026-06-15 16:10:03 +0200`;
  Android reported `lastUpdateTime=2026-06-15 16:10:12`, version `0.8.0` code `13`.
- Final connected Android validation with `agent-device`: all Expo UI switches and the
  Draw count segmented control rendered in dark mode; unselected Draw labels were
  legible; after navigating back to Play, changing the OS to light, and returning to
  Settings, every Expo UI control remained visible and correctly themed.
