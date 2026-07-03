# Tamagui Colors Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `@tamagui/colors`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

Research date: 2026-06-11
Refresh check: 2026-07-03

## Purpose

Cache the `@tamagui/colors` behavior needed when Soli makes its existing transitive
color import a direct Tamagui 2 dependency.

## Sources

- https://tamagui.dev/docs/core/config-v5
- https://tamagui.dev/docs/guides/how-to-upgrade
- https://registry.npmjs.org/@tamagui%2Fcolors/2.2.0
- https://registry.npmjs.org/@tamagui%2Fcolors/latest
- https://github.com/tamagui/tamagui/releases/tag/v2.4.0

## Refresh check (2026-07-03)

Status: still useful for preserving the visual intent of the original Tamagui 2
migration.

- Soli currently pins `@tamagui/colors` to `2.2.0`; the npm latest dist-tag is
  `2.4.0`.
- The official Config v5 docs still use root `@tamagui/colors` palettes for new v5
  themes, while the v1-to-v2 upgrade guide still documents
  `@tamagui/colors/legacy` for old Radix values.
- Keep the feature graphic on `@tamagui/colors/legacy` until a separate visual pass
  intentionally re-approves the purple palette and contrast with Radix v3 values.

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
