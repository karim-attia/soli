# Tamagui 2 Colors Guide

Research date: 2026-06-11

## Purpose

Cache the `@tamagui/colors` behavior needed when Soli makes its existing transitive
color import a direct Tamagui 2 dependency.

## Sources

- https://tamagui.dev/docs/core/config-v5
- https://tamagui.dev/docs/guides/how-to-upgrade
- https://registry.npmjs.org/@tamagui%2Fcolors/2.2.0

## Package direction

Add exact `@tamagui/colors@2.2.0` because `app/feature-graphic.tsx` imports the package
directly. Yarn Plug'n'Play consumers should declare packages they import rather than
relying on `@tamagui/config` to install them transitively.

## Palette compatibility

The `2.2.0` root export uses Radix Colors v3. The published package also exports
`@tamagui/colors/legacy`, which preserves the v1 Radix values.

The feature graphic currently uses `purple9`, `purple10`, and `purple11`. Package
inspection confirmed that their root values change between `1.140.4` and `2.2.0`,
while the `legacy` export retains the old HSL values.

Core migration:

```diff
- import { purple } from '@tamagui/colors'
+ import { purple } from '@tamagui/colors/legacy'
```

This is deliberate visual-compatibility behavior. Switching the feature graphic to
Radix v3 belongs in the separately approved Config v5 follow-up and requires a
contrast/brand comparison.

## Verification

- `@tamagui/colors` resolves directly to exact `2.2.0`.
- The feature graphic uses the `legacy` export during the core migration.
- Baseline/final screenshots show no unexplained purple gradient or badge-color drift.
- Config v5 work, if approved, records whether the legacy import remains or changes.
