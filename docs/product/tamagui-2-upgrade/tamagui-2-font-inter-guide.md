# Tamagui 2 Font Inter Guide

Research date: 2026-06-11

## Purpose

Cache the `@tamagui/font-inter` facts needed when Soli makes its existing transitive
font-file import a direct Tamagui 2 dependency.

## Sources

- https://registry.npmjs.org/@tamagui%2Ffont-inter/2.2.0
- https://tamagui.dev/docs/guides/how-to-upgrade

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
