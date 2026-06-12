# Tamagui 2 Native Integration Guide

Research date: 2026-06-11

## Purpose

Cache the `@tamagui/native` facts needed if Soli separately approves Tamagui's
optional native Teleport or Gesture Handler integrations.

## Sources

- https://tamagui.dev/ui/native
- https://tamagui.dev/ui/portal
- https://tamagui.dev/ui/sheet
- https://tamagui.dev/docs/guides/how-to-upgrade

## Scope

`@tamagui/native` is not required for the core Tamagui 2 runtime/API migration. It is
a light setup package for optional native adapters. Add it only in a separately
approved follow-up after the Config v4 migration is complete and validated.

Latest stable version on 2026-06-11 and rechecked on 2026-06-12: `2.2.0`.

## Available integrations relevant to Soli

Portal adapter:

```ts
import '@tamagui/native/setup-teleport'
```

This requires `react-native-teleport` and preserves custom React contexts in native
Sheet, Dialog, Popover, Select, and Toast portals.

This follow-up enables the Teleport setup module through a root entry file before
`expo-router/entry`.

Selective Gesture Handler adapter:

```ts
import { setupGestureHandler } from '@tamagui/native/setup-gesture-handler'

setupGestureHandler({ pressEvents: false, sheet: true })
```

Soli already has `react-native-gesture-handler` and a `GestureHandlerRootView`. Keep
global Tamagui press integration disabled initially because gameplay contains nested
and timing-sensitive press interactions.

This follow-up uses `setupGestureHandler({ pressEvents: false, sheet: true })`, so the
Sheet can use Tamagui's native gesture adapter without changing global press ownership.

## Expo Router ordering

Setup imports must execute before any Tamagui import and before `expo-router/entry`:

```js
// index.js
import './tamagui.native.setup'
import 'expo-router/entry'
```

Then set `package.json` `main` to `index.js`.

## Do not enable in this follow-up

- `setup-burnt`: Soli's native Toast mode is disabled.
- `setup-expo-linear-gradient`: no Tamagui LinearGradient use was found.
- `setup-zeego`: no Tamagui native Menu integration is active.
- Global Gesture Handler press events without a separate interaction test plan.

## Verification

- Build and install fresh iOS and Android binaries sequentially.
- Verify Sheet drag/dismiss behavior with scrollable content.
- Verify custom settings/history/theme context inside the Sheet.
- Verify Toast provider/viewport startup and any temporary test Toast.
- Confirm no duplicate portal host, missing native module, or gesture ownership logs.
