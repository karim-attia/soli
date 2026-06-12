# Tamagui 2 Lucide Icons 2 Guide

Research date: 2026-06-11

## Purpose

Cache the package facts needed to replace Soli's incompatible
`@tamagui/lucide-icons` dependency during the Tamagui 2 migration.

## Sources

- https://tamagui.dev/ui/lucide-icons
- https://registry.npmjs.org/@tamagui%2Flucide-icons-2/2.2.0
- https://registry.npmjs.org/@tamagui%2Flucide-icons/latest

## Version and compatibility

- Official Tamagui 2 documentation installs `@tamagui/lucide-icons-2`.
- Latest stable version on 2026-06-11: `2.2.0`.
- `@tamagui/lucide-icons-2@2.2.0` depends on matching
  `@tamagui/core@2.2.0` and `@tamagui/helpers-icon@2.2.0`.
- The old `@tamagui/lucide-icons` package's latest tag is `2.0.0-rc.26` and depends
  on RC Tamagui core packages. It must not remain in the stable dependency graph.
- The package requires `react-native-svg`; Soli already has the Expo-compatible
  `react-native-svg@15.15.3`.

## Package change

```sh
yarn remove @tamagui/lucide-icons
yarn add --exact @tamagui/lucide-icons-2@2.2.0
```

Update imports without changing icon names:

```diff
- import { Menu, RefreshCcw, Undo2 } from '@tamagui/lucide-icons'
+ import { Menu, RefreshCcw, Undo2 } from '@tamagui/lucide-icons-2'
```

## Soli import sites

- `app/(tabs)/_layout.tsx`
- `app/(tabs)/hello.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/two.tsx`
- `app/history.tsx`
- `app/settings.tsx`
- `src/features/klondike/components/UndoScrubber.tsx`
- `src/features/klondike/components/cards/CardView.tsx`

## Verification

- `yarn why @tamagui/lucide-icons-2` shows stable `2.2.0`.
- `yarn why @tamagui/lucide-icons` returns no installed package.
- `yarn why @tamagui/helpers-icon` shows a compatible single version.
- Verify stroke width, inherited theme color, disabled color, baseline alignment, and
  Button-provided icon sizing on web, iOS, and Android.
