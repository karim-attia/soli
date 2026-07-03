# Tamagui Lucide Icons 2 Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `@tamagui/lucide-icons-2`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

Research date: 2026-06-11
Refresh check: 2026-07-03

## Purpose

Cache the package facts needed to replace Soli's incompatible
`@tamagui/lucide-icons` dependency during the Tamagui 2 migration.

## Sources

- https://tamagui.dev/ui/lucide-icons
- https://registry.npmjs.org/@tamagui%2Flucide-icons-2/2.2.0
- https://registry.npmjs.org/@tamagui%2Flucide-icons/latest
- https://registry.npmjs.org/@tamagui%2Flucide-icons-2/latest
- https://github.com/tamagui/tamagui/releases/tag/v2.4.0

## Refresh check (2026-07-03)

Status: still useful, with one stale repo fact corrected below.

- Soli currently pins `@tamagui/lucide-icons-2` to `2.2.0`; the npm latest dist-tag
  is `2.4.0`.
- Keep icon packages version-aligned with the rest of the Tamagui package set if a
  future patch bump is approved.
- The old `@tamagui/lucide-icons` package is still not the stable v2 package for this
  repo. Do not switch imports back to it.
- Soli now has `react-native-svg` `15.15.4` in `package.json`.

## Version and compatibility

- Official Tamagui 2 documentation installs `@tamagui/lucide-icons-2`.
- Latest stable version on 2026-06-11: `2.2.0`.
- `@tamagui/lucide-icons-2@2.2.0` depends on matching
  `@tamagui/core@2.2.0` and `@tamagui/helpers-icon@2.2.0`.
- The old `@tamagui/lucide-icons` package's latest tag is `2.0.0-rc.26` and depends
  on RC Tamagui core packages. It must not remain in the stable dependency graph.
- The package requires `react-native-svg`; Soli already has the Expo-compatible
  `react-native-svg@15.15.4`.

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
