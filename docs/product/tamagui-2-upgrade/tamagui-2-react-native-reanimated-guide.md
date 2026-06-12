# Tamagui 2 React Native Reanimated Guide

Research date: 2026-06-11

## Purpose

Cache the Reanimated 4 and Worklets facts needed to select Tamagui Config v5's native
animation driver without introducing an unrelated Reanimated upgrade.

## Sources

- https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/
- https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
- https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/
- https://docs.swmansion.com/react-native-reanimated/docs/reanimated-babel-plugin/about/
- https://tamagui.dev/docs/core/config-v5

## Current compatibility

Soli currently uses:

- React Native `0.83.2`, planned Expo patch update to `0.83.6`
- Reanimated `4.2.1`
- React Native Worklets `0.7.2`, planned Expo patch update to `0.7.4`

The official Reanimated compatibility table supports:

- Reanimated `4.2.x` with React Native `0.83`
- Reanimated `4.2.x` with Worklets `0.7.x`

No Reanimated minor upgrade is required for Tamagui 2. Keep Expo's compatible version
unless `npx expo install --fix` explicitly chooses another one.

## Babel plugin

Expo configures the Worklets transform through `babel-preset-expo`. Reanimated's
manual `react-native-worklets/plugin` instruction applies to React Native Community
CLI projects.

Soli currently has an explicit compatibility plugin entry:

```js
plugins: ['@tamagui/babel-plugin', 'react-native-reanimated/plugin']
```

Remove the explicit Reanimated entry and retain the Tamagui plugin. Do not replace it
with an explicit `react-native-worklets/plugin` unless a verified Expo build proves
that the preset is not applying the transform.

When `tamagui.build.ts` exists, the Tamagui plugin can read shared options from it.

## Tamagui Config v5 driver

This driver selection is needed only for the separately approved Config v5 follow-up.
Config v4 remains the completion target for the core Tamagui 2 migration.

Config v5 separates animation presets from the base config. For Soli:

```ts
import { defaultConfig } from '@tamagui/config/v5'
import { animations as animationsCSS } from '@tamagui/config/v5-css'
import { animations as animationsReanimated } from '@tamagui/config/v5-reanimated'
import { createTamagui, isWeb } from 'tamagui'

export const config = createTamagui({
  ...defaultConfig,
  animations: isWeb ? animationsCSS : animationsReanimated,
})
```

This keeps CSS transitions on web and Reanimated on native.

Existing Soli Tamagui animation keys used by Toast and Sheet, including `quick`,
`quickest`, and `medium`, are available in Config v5 drivers.

## Deprecated worklet helpers

Soli currently imports `runOnJS` and `runOnUI` from Reanimated. Reanimated 4 still
re-exports these for compatibility, but newer Worklets APIs use scheduling names such
as `scheduleOnRN` and `scheduleOnUI`.

Do not migrate these gameplay animation helpers as part of the Tamagui 2 task. That
would change timing-sensitive card, celebration, and scrubber code. Track it as a
separate focused task.

## Rebuild and cache rules

After changing the Worklets version or Babel plugin:

- clear Metro cache;
- rebuild native applications;
- confirm the installed binary is fresh;
- watch for JavaScript/native/Worklets version mismatch errors.

Reanimated warns that mismatched JavaScript, C++, Java, and Babel plugin pieces can
produce undefined behavior.

## Verification

- Existing Reanimated card and gesture unit tests pass.
- Card flight, flip, waste fan, celebration, and undo scrubber work on fresh iOS and
  Android builds.
- Tamagui Sheet and Toast transitions honor reduced motion.
- No "Failed to create a worklet" or version-mismatch logs appear.
