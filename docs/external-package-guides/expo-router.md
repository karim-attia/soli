# Expo Router Guide

Last refreshed: 2026-07-05

## Scope

- Package/tool: `expo-router`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this for Expo Router package alignment and route API migration notes. Prefer Expo
SDK bundled versions and avoid direct React Navigation imports unless Expo Router
documents them.

## Detailed guidance

The sections below are the definitive combined notes for this package or tool. Keep version-specific context when it affects compatibility, but update this single file instead of adding task- or feature-prefixed guides.

### SDK 57 Router Notes

- Package: `expo-router`
- Retrieved: 2026-07-04
- Primary docs:
  - https://docs.expo.dev/versions/latest/sdk/router/
  - https://expo.dev/changelog/sdk-57

#### Target facts

- Expo SDK 57 recommends `expo-router` `~57.0.3`.
- SDK 56 and later still require application code to import React Navigation APIs from
  Expo Router entry points rather than external `@react-navigation/*` packages.
- Soli's current source scan has no direct `@react-navigation/*` imports.
- SDK 57 adds Android support for `Stack.Toolbar.Badge` in header placements and on
  toolbar menu icons. `Stack.Toolbar` itself predates SDK 57, remains an alpha API,
  and does not render on web.
- This is not currently applicable to Soli's main screens. Their headers are owned by
  the nested Expo Router `Drawer`, while `Stack.Toolbar` configures a native Stack
  screen. Soli also has no header badge count or status to display.
- Do not restructure the Drawer navigation or replace the existing `headerLeft` /
  `headerRight` controls only to adopt `Stack.Toolbar`. Revisit it if Expo stabilizes
  the API and Soli later moves these screens under a Stack-owned header or gains a
  concrete badge/menu requirement.

#### Repo usage notes

- Let `npx expo install expo@^57.0.0 --fix` select the Router version.
- After upgrade, re-run `rg "@react-navigation"` across app/source code and
  `npx expo-doctor@latest`.
- Keep the existing options-based header configuration for the Drawer routes. The
  composition APIs (`Stack.Toolbar`, `Stack.Title`, and `Stack.Header`) do not provide
  a useful drop-in simplification for the current navigator structure.

### Header and Drawer Menu Placement Notes

- Package: `expo-router`
- Retrieved: 2026-07-05
- Primary docs and platform guidance:
  - Expo Router Drawer: https://docs.expo.dev/router/advanced/drawer/
  - Expo Router Stack Toolbar: https://docs.expo.dev/router/advanced/stack-toolbar/
  - React Navigation header buttons: https://reactnavigation.org/docs/header-buttons/
  - Android top app bars: https://developer.android.com/develop/ui/compose/components/app-bars
  - Android accessibility API defaults: https://developer.android.com/develop/ui/compose/accessibility/api-defaults
  - Apple Buttons HIG: https://developer.apple.com/design/human-interface-guidelines/buttons
  - Expo UI Icon: https://docs.expo.dev/versions/latest/sdk/ui/universal/icon/

#### Target facts

- Expo Router Drawer docs describe the drawer as a common mobile navigation pattern that
  is typically toggleable through a header button.
- React Navigation header docs support both `headerLeft` and `headerRight`, and
  recommend `navigation.setOptions` inside a screen when the header button needs to
  interact with that screen's state or navigation helpers.
- Android top app bar guidance separates the leading `navigationIcon` from trailing
  `actions`. Treat Soli's drawer button as navigation, not a screen action.
- This means Android should keep the drawer/menu button in `headerLeft` for Soli's
  left-side drawer. Moving it right would make it a trailing action and would only be
  appropriate for a deliberately right-side drawer.
- Android touch-target guidance recommends at least 48x48dp. It explicitly allows a
  smaller visual icon, such as 24x24dp, inside the full 48x48dp target.
- React Navigation's `HeaderButton` provides platform press behavior, horizontal padding,
  and Android hit slop, but no iOS hit slop or guaranteed 44pt minimum. Keep explicit
  44pt iOS and 48dp Android control minima for clear accessible geometry.
- Use Expo UI `Icon` inside the header button for the visual symbol: SF Symbol on iOS,
  Material Symbol XML on Android.
- Expo UI `Icon.size` is optional. The installed SwiftUI Image bridge defaults to 24pt,
  and the Material menu XML declares intrinsic 24dp dimensions, so omit `size` for the
  native/intrinsic glyph size.
- The iOS 4pt leading padding is Soli-owned optical alignment, not a platform-native
  constant.
- `Stack.Toolbar` lets Stack-owned native toolbar items own more geometry, but it remains
  alpha and is not applicable to Soli's Drawer-owned visible headers. Do not restructure
  navigation for this sizing detail.

#### Repo usage notes

- Put the drawer menu in `headerLeft` for Play, Settings, History, and Hello.
- Keep screen actions such as `Demo` and `New Game` in `headerRight`.
- Use `components/navigation/HeaderMenuButton.tsx` instead of raw per-screen
  `Pressable` / `Menu` header buttons so labels, placement, and the native symbol source
  stay consistent.
- Omit the header menu glyph's explicit size so Expo UI uses its intrinsic/default
  24dp/pt size. The shared button supplies a 48dp minimum Android target and a 44pt iOS
  target rather than visually enlarging the hamburger.
- Keep the 4pt iOS leading inset as deliberate optical alignment in the current Drawer
  header integration.
- Continue using options-based header setup for these Drawer screens. `Stack.Toolbar`
  remains a poor fit for Soli's current nested Drawer-owned headers.

#### Stack.Toolbar Drawer Prototype (2026-07-05)

Soli tested the smallest page-level prototype with installed `expo-router@57.0.3`:

```tsx
<Stack.Toolbar placement="left">
  <Stack.Toolbar.Button icon="sidebar.left" onPress={openDrawer} />
</Stack.Toolbar>
```

The prototype temporarily cleared the Settings Drawer screen's existing `headerLeft` so
the result was unambiguous. No toolbar item appeared in the visible Drawer-owned header.
Screenshot evidence:
`tmp/settings-validation/stack-toolbar-drawer-prototype-ios.png`.

Installed source explains the result:

- Header `Stack.Toolbar` calls `useCompositionOption` with the nearest route key.
- Expo Router's native Stack owns the composition registry and merges registered options
  only into descriptors keyed by that Stack's own routes.
- The visible Settings screen is the nested Drawer's `settings` route; its key is not the
  parent Stack's `(tabs)` route key, so the parent Stack cannot apply those options.
- Android's toolbar implementation ultimately supplies `headerLeft`/`headerRight` too;
  it does not bypass navigator ownership.

The rejected prototype was removed. Production keeps `HeaderMenuButton` and the existing
`line.3.horizontal` SF Symbol / Material menu icon. Do not introduce nested Stacks solely
to make this API own one icon.

Future migration estimate: **small-to-medium code work, medium validation work** only if
`Stack.Toolbar` gains Drawer-owned-header support. Expected scope is four visible routes
(Play, Hello, Settings, History), the shared `HeaderMenuButton`, the Play screen's existing
Demo/New Game actions and shared iOS control-size constant, plus iOS/Android navigation
smoke tests. If the API merely becomes stable without Drawer support, the migration is
still not applicable; changing navigator ownership would instead be a disproportionate
medium-to-large navigation project.

Expo upgrade follow-up: on each future Expo Router upgrade, check both whether
`Stack.Toolbar` is stable **and** whether its composition options can target Drawer-owned
headers. Stability alone does not resolve the route-key/header-owner boundary.

### SDK 55 Router Notes

- **Package**: `expo-router`
- **Retrieved**: 2026-03-02
- **Primary docs**:
  - Expo Router SDK 55 docs: https://docs.expo.dev/versions/v55.0.0/sdk/router/
  - Native tabs docs (SDK 55): https://docs.expo.dev/versions/v55.0.0/sdk/router-native-tabs/
  - SDK 55 changelog (router migration callouts): https://expo.dev/changelog/sdk-55

## Version Alignment for SDK 55
- Bundled expo-router version in SDK 55 docs: `~55.0.3`
- Use `npx expo install --fix` to select the exact compatible version.

## Migration Notes
- If using headless tabs, `reset` is renamed to `popToTopOnBlur`.
- If using native tabs, check SDK 55 migration notes and update component usage accordingly.
- Projects not using native/headless tab APIs may require no router code changes beyond package version alignment.

## Example (headless tab prop rename)
```tsx
<TabTrigger popToTopOnBlur name="home" href="/" />
```

## Usage Notes
- Audit this repository for native/headless tab usage before making router code edits.
- If those APIs are absent, keep router changes limited to dependency version alignment and validation.

## Refresh check (2026-07-03)

- Status: historical SDK 55 router guide. It remains useful only for the SDK 55
  native/headless tabs migration notes.
- Current repo state: `package.json` and `yarn.lock` resolve `expo-router@56.2.11` for
  Expo SDK 56.
- Current official docs: the SDK 56 router page now recommends `~56.2.12`, and the SDK 56
  migration guide says application code must import React Navigation APIs from Expo Router
  entry points rather than external `@react-navigation/*` packages.
- Superseding guide: use `expo-router.md` for current repo work.
- Sources:
  - https://docs.expo.dev/versions/v56.0.0/sdk/router/
  - https://docs.expo.dev/router/migrate/sdk-55-to-56/
  - https://expo.dev/changelog/sdk-57

### SDK 56 Router Notes

- Package: `expo-router`
- Retrieved: 2026-06-14
- Refreshed: 2026-07-03
- Primary docs:
  - https://expo.dev/changelog/sdk-56
  - https://docs.expo.dev/router/migrate/sdk-55-to-56/
  - https://docs.expo.dev/versions/v56.0.0/sdk/router/
  - https://expo.dev/changelog/sdk-57

## Target facts

- SDK 56 decouples Expo Router from React Navigation internals.
- In SDK 56 and later, application code should not import from external
  `@react-navigation/*` packages when using Expo Router.
- Soli currently resolves `expo-router@56.2.11`; the refreshed SDK 56 docs recommend
  `~56.2.12`.
- Expo provides a codemod:

```sh
npx expo-codemod sdk-56-expo-router-react-navigation-replace src
```

Use all relevant source roots for Soli, likely `app` and `src`.

## Import mapping

Official SDK 55 to 56 migration guide mappings:

| React Navigation source | Expo Router target |
| --- | --- |
| `@react-navigation/native` | `expo-router/react-navigation` |
| `@react-navigation/core` | `expo-router/react-navigation` |
| `@react-navigation/elements` | `expo-router/react-navigation` |
| `@react-navigation/routers` | `expo-router/react-navigation` |
| `@react-navigation/stack` | `expo-router/js-stack` |
| `@react-navigation/bottom-tabs` | `expo-router/js-tabs` |
| `@react-navigation/material-top-tabs` | `expo-router/js-top-tabs` |
| `@react-navigation/native-stack` | No direct equivalent, use `Stack` layout |
| `@react-navigation/drawer` | No direct equivalent, use `Drawer` layout |

## Current Soli import state

- `rg "@react-navigation" app src components` has no external React Navigation imports.
- Current migrated imports:
  - `app/_layout.tsx`: `DarkTheme`, `DefaultTheme`, `ThemeProvider` from
    `expo-router/react-navigation`.
  - `app/(tabs)/index.tsx`: `HeaderButton` from `expo-router/react-navigation`.
  - `src/navigation/useDrawerOpener.ts`: drawer/navigation helpers from
    `expo-router/react-navigation`.
  - `src/features/klondike/hooks/useKlondikeTimer.ts`: `useFocusEffect` from
    `expo-router/react-navigation`.

## Repo usage notes

- Soli already uses the Expo Router Drawer layout via `expo-router/drawer`.
- Prefer the codemod first, then run `rg "@react-navigation"` across app code.
- After import migration, run Expo Doctor before deciding whether to remove direct
  React Navigation dependencies from `package.json`.
- Avoid using `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` except as a temporary
  diagnostic. Keeping it would hide a real SDK 56 migration requirement.

## Refresh check (2026-07-03)

- Status: current for SDK 56 migration guidance.
- The migration work described by this guide appears complete in app/source imports.
- Follow-up candidate, outside this documentation-only refresh: decide whether to accept
  the SDK 56 patch drift from `expo-router@56.2.11` to the docs-recommended `~56.2.12`
  through `npx expo install --check` / `--fix`.
