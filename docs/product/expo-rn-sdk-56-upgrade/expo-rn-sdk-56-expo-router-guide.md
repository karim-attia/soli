# Expo/RN SDK 56 Expo Router Guide

- Package: `expo-router`
- Retrieved: 2026-06-14
- Primary docs:
  - https://expo.dev/changelog/sdk-56
  - https://docs.expo.dev/router/migrate/sdk-55-to-56/
  - https://docs.expo.dev/versions/latest/sdk/router/

## Target facts

- SDK 56 decouples Expo Router from React Navigation internals.
- In SDK 56 and later, application code should not import from external
  `@react-navigation/*` packages when using Expo Router.
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

## Current Soli hits

- `app/_layout.tsx`
  - `DarkTheme`, `DefaultTheme`, `ThemeProvider` from `@react-navigation/native`
- `app/(tabs)/index.tsx`
  - `HeaderButton` from `@react-navigation/elements`
- `src/navigation/useDrawerOpener.ts`
  - `DrawerActions`, `NavigationProp`, `ParamListBase`, `useNavigation` from
    `@react-navigation/native`
- `src/features/klondike/hooks/useKlondikeTimer.ts`
  - `useFocusEffect` from `@react-navigation/native`

## Repo usage notes

- Soli already uses the Expo Router Drawer layout via `expo-router/drawer`.
- Prefer the codemod first, then run `rg "@react-navigation"` across app code.
- After import migration, run Expo Doctor before deciding whether to remove direct
  React Navigation dependencies from `package.json`.
- Avoid using `EXPO_ROUTER_DISABLE_RN_NAVIGATION_CHECK=1` except as a temporary
  diagnostic. Keeping it would hide a real SDK 56 migration requirement.
