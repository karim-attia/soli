# Tamagui Font Inter Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `@tamagui/font-inter`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

Research date: 2026-06-11
Refresh check: 2026-07-03

## Purpose

Cache the `@tamagui/font-inter` facts needed when Soli makes its existing transitive
font-file import a direct Tamagui 2 dependency.

## Sources

- https://registry.npmjs.org/@tamagui%2Ffont-inter/2.2.0
- https://registry.npmjs.org/@tamagui%2Ffont-inter/latest
- https://tamagui.dev/docs/guides/how-to-upgrade
- https://github.com/tamagui/tamagui/releases/tag/v2.4.0

## Refresh check (2026-07-03)

Status: still useful.

- Soli currently pins `@tamagui/font-inter` to `2.2.0`; the npm latest dist-tag is
  `2.4.0`.
- No new setup API was found for the existing Expo Font loading approach. Keep the
  direct dependency because Soli imports the OTF asset paths directly.
- If Tamagui packages are bumped later, keep `@tamagui/font-inter` version-aligned
  with the rest of the Tamagui package set and re-verify the OTF paths before native
  smoke testing.

## Package direction

Add exact `@tamagui/font-inter@2.2.0`. Soli directly loads these files in
`app/_layout.tsx`:

```ts
require('@tamagui/font-inter/otf/Inter-Medium.otf')
require('@tamagui/font-inter/otf/Inter-Bold.otf')
```

The published `2.2.0` package exports both OTF paths, so the existing `expo-font`
loading approach can remain. Declaring the package directly prevents Yarn
Plug'n'Play resolution from depending on `@tamagui/config`'s transitive graph.

## Verification

- `yarn why @tamagui/font-inter` resolves exact `2.2.0`.
- Both OTF assets load before the splash screen hides.
- No missing-module, font-family, or asset-bundling warning appears on web/iOS/Android.
- Medium and bold text retain the expected weight in headers, settings, history, and
  the feature graphic.
