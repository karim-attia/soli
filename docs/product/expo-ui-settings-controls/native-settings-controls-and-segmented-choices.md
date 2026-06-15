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

## Description

Replace only the interactive controls on Settings with the closest direct Expo UI
native equivalents. The surrounding Tamagui screen layout and typography remain
unchanged.

The existing settings state, persistence callbacks, hydration gating, inactive
animation semantics, draw-count normalization, and descriptive text remain the source
of truth. Expo UI and the platform own the switches' and segmented controls' visual
appearance.

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
- Theme mode uses the same Expo UI `SegmentedControl` with an explicit
  `themeOptions` index-to-mode mapping.
- Theme mode remains disabled until settings hydration completes.
- Custom Draw count borders, separators, selected colors, press styles, focus styles,
  and nested Tamagui toggle composition are deleted.
- Surrounding headings, paragraphs, separators, section ordering, navigation, safe
  area behavior, state, and storage are not migrated or refactored.
- No new dependency is added.
- Dependency, type, lint, format, Jest, and diff checks pass.
- A fresh Android release is built, installed, and exercised on the connected device
  without running an iOS build concurrently.
- Settings web is tested from a fresh Metro server before treating the reported
  `components/Provider` overlay as a real source issue.
- Both segmented controls receive Soli's resolved Light or Dark appearance through
  Expo UI's documented `appearance` prop.
- Dark mode keeps selected and non-selected segment labels legible without custom
  text, border, or fill colors.

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
- Cons: the two segmented controls each contain a short selected-index mapping.

Recommendation: use this approach. The mappings are small and materially clearer than
introducing another abstraction.

### Pass Soli's resolved theme through Expo UI's appearance prop

- Pros: keeps Material and SwiftUI responsible for the actual colors.
- Pros: supports Soli's Auto, Light, and Dark modes when they differ from the device
  setting.
- Pros: fixes both segmented controls with one existing resolved-theme value.
- Cons: adds one explicit prop because Soli's Tamagui theme context is separate from
  the native Expo UI host.

Recommendation: use this documented integration point rather than custom colors.

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

Follow-up finding: this is a Soli integration issue, not a native color defect in Expo
UI. The library follows the device theme by default, while Soli can force a different
in-app theme. Pass the resolved Soli theme through `appearance`.

## New dependencies

None. `@expo/ui ~56.0.17` is already present in `package.json` and used by
`components/AppSheet.tsx`.

The repository does not contain `external-packages.mdc`; this is non-blocking because
the task adds no package. The required scoped API guide still records the official
Expo UI assumptions used by the implementation.

## UX/UI Considerations

- Native switches should use the platform's standard appearance and interaction.
- Native segmented controls may differ visually across Android, iOS, and web; that is
  intentional.
- Expo UI should receive Soli's resolved appearance because an app-only theme
  override is not the same as the device theme visible to the native host.
- Existing labels and explanatory text remain in Tamagui so Settings hierarchy and
  readability do not change.
- Hydration must continue preventing early changes to switches and segmented controls.
- Inactive animation rows keep muted text and a lower-opacity switch without changing
  the existing ability to edit individual preferences.
- Both segmented controls should occupy the available Settings content width without
  custom borders, colors, or platform-specific styling.

## Components

- Reuse `SettingsScreen` and its local `ToggleRow` in `app/settings.tsx`.
- Replace only `ToggleRow`'s Tamagui switch with universal Expo UI `Host` and `Switch`.
- Reuse `DrawCountSelector` in
  `components/settings/DrawCountSelector.tsx`; replace only its Tamagui
  `ToggleGroup`/`XGroup` control.
- Use `SegmentedControl` directly in both Settings and Draw count.
- Pass `resolveThemeName(state.themeMode, useColorScheme())` to both segmented
  controls through `appearance`.
- Create no additional component unless direct implementation becomes less clear.

## How to fetch data, how to cache

No fetching or caching changes.

- Settings continue to come from `useSettings()`.
- Settings persistence and hydration remain owned by `src/state/settings.tsx`.
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
- [pending] Run dependency, type, lint, format, Jest, and diff checks.
- [pending] Start a fresh web server and test Settings controls.
- [pending] Run a fresh Android release build, verify installation, and test Settings
  with `agent-device`.
- [completed] Research the reported dark-mode contrast issue in official Expo and
  Android sources.
- [completed] Pass Soli's resolved theme to both Expo UI segmented controls.
- [pending] Re-run checks and verify dark-mode contrast on the connected Android
  device.
- [pending] Review the final diff and update all documentation statuses and results.

## Plan: Files to modify

- `app/settings.tsx`
- `components/settings/DrawCountSelector.tsx`
- `docs/product/expo-ui-settings-controls/native-settings-controls-and-segmented-choices.md`
- `docs/product/expo-ui-settings-controls/expo-ui-settings-controls-expo-ui-guide.md`

## Files actually modified

- `app/settings.tsx`
- `components/settings/DrawCountSelector.tsx`
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
  - Status: not yet reproduced. Start from a fresh Metro server before considering any
    unrelated import or alias change.
- Dark-mode non-selected segment labels use a light-theme content color when Soli
  forces Dark over a light device theme.
  - Status: root cause identified. Expo UI documents that `appearance` overrides the
    control appearance while omission follows the system theme. Soli omitted
    `appearance`, so the native control did not know about the app-only override.
- The connected Android device appears twice through wireless ADB discovery.
  - Status: non-blocking. Select one online serial consistently for build installation
    and `agent-device` validation.
- No sub-agent execution tool is exposed in this session.
  - Status: tooling limitation. Run the required checks directly and record exact
    evidence rather than omitting validation.

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

- Pending implementation.
