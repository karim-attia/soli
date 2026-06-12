# Tamagui 2 React Native Teleport Guide

Research date: 2026-06-11

## Purpose

Cache the `react-native-teleport` facts needed for Tamagui 2 native portals in Soli.
This is a conditional follow-up guide; Teleport is not required to complete the core
Tamagui 2 migration on Config v4.

## Sources

- https://tamagui.dev/ui/native
- https://tamagui.dev/ui/portal
- https://kirillzyusko.github.io/react-native-teleport/docs/intro
- https://kirillzyusko.github.io/react-native-teleport/docs/installation
- https://github.com/kirillzyusko/react-native-teleport

## Version

- npm latest on 2026-06-11: `1.1.9`
- Peer requirements are broad for React, React DOM, and React Native.
- Package has no runtime dependencies.

Pin exact version during this migration:

```sh
yarn add react-native-teleport@1.1.9
```

## Why Tamagui recommends it

React Native has no built-in web-equivalent portal that preserves the original React
tree and native view behavior. JavaScript portal implementations can lose custom
React contexts or require manual context re-propagation.

`react-native-teleport`:

- preserves React tree continuity and context;
- moves the view in the native hierarchy;
- supports iOS, Android, and web;
- supports the New Architecture;
- avoids private React Native APIs.

Tamagui uses portals for components including Sheet, Dialog, Popover, Select, and
Toast. Soli currently uses modal Sheet and Toast.

## Platform requirements

- New Architecture only.
- Native code is included.
- Expo Go is not supported.
- Expo development clients and release builds are supported.
- Autolinking is supported.
- iOS pods and both native applications must be rebuilt after installation.

Expo SDK 55 always uses the New Architecture, so Soli satisfies the architecture
requirement.

## Tamagui setup

When using Teleport directly, its own docs describe adding `PortalProvider`. For
Tamagui integration, follow Tamagui's adapter setup instead:

```ts
import '@tamagui/native/setup-teleport'
```

Do not add a separate direct `PortalProvider` unless Tamagui's adapter implementation
or a verified runtime failure requires it.

The setup import must execute before any Tamagui import. With Expo Router:

```js
// index.js
import './tamagui.native.setup'
import 'expo-router/entry'
```

```ts
// tamagui.native.setup.ts
import '@tamagui/native/setup-teleport'
```

## Soli-specific behavior to verify

- History modal Sheet can read current settings/history/theme contexts.
- Sheet content remains mounted correctly during open/close transitions.
- Sheet overlay z-order is above the board and navigation content.
- Toast content retains Tamagui theme/config and current app state.
- Toast placement and safe areas remain correct.
- Android and iOS dismissal gestures work.
- Theme changes do not leave already mounted portal content on a stale theme.
- No duplicate portal host or provider warnings appear.

## Build procedure

After installation:

1. Stop Metro and stale native builds.
2. Install/update iOS pods through the clean Expo build workflow.
3. Run a clean iOS build and confirm installation.
4. Test iOS.
5. Only after iOS completes, run the Android release build.
6. Confirm the fresh Android binary is installed.
7. Test Android.

Never accept testing against an old binary because the package contains native code.
