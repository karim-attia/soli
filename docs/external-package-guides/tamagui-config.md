# Tamagui Config Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `@tamagui/config`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this for Tamagui config v5 and animation-driver decisions. Keep config changes separate from package bumps unless a migration plan explicitly combines them.

## Source-backed notes

Research date: 2026-06-12
Refresh check: 2026-07-03

## Purpose

Cache the official and installed-package facts needed for Soli's Config v5 migration.

## Sources

- https://tamagui.dev/docs/core/config-v5
- https://tamagui.dev/docs/core/animation-drivers
- https://tamagui.dev/docs/core/configuration
- https://tamagui.dev/docs/guides/expo
- https://tamagui.dev/docs/guides/how-to-upgrade
- https://github.com/tamagui/tamagui/releases/tag/v2.4.0
- https://registry.npmjs.org/@tamagui%2Fconfig/latest
- `node_modules/@tamagui/config/package.json`
- `node_modules/@tamagui/config/src/v4.ts`
- `node_modules/@tamagui/config/src/v5-base.ts`
- `node_modules/@tamagui/config/src/v5-css.ts`
- `node_modules/@tamagui/config/src/v5-reanimated.ts`

## Refresh check (2026-07-03)

Status: still useful and API-current for the Config v5 follow-up, but not a package
upgrade recommendation by itself.

- Soli currently pins Tamagui packages, including `@tamagui/config`, to `2.2.0`.
- The current npm latest dist-tag for `@tamagui/config` is `2.4.0`, released with
  Tamagui `v2.4.0` on 2026-06-27.
- The official Config v5 docs still use the same import shape:
  `@tamagui/config/v5`, `@tamagui/config/v5-css`, and
  `@tamagui/config/v5-reanimated`.
- Tamagui `v2.4.0` adds relevant fixes for native Sheet drag/keyboard behavior,
  native portal theme repropagation, and theme/media subscription performance. Treat
  those as reasons to evaluate a coordinated Tamagui patch bump later, not to change
  this Config v5 recipe in isolation.

## Required config shape

The Config v5 base deliberately omits animations. Tamagui's documented universal-app
pattern uses CSS animations on web and Reanimated on native:

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

All three import paths are exports of installed `@tamagui/config@2.2.0`; no new direct
package is required.

## Compatibility checkpoint

The official migration guide recommends temporarily restoring the v4 layout behavior
to isolate theme/config changes:

```ts
settings: {
  ...defaultConfig.settings,
  styleCompat: 'legacy',
  defaultPosition: 'relative',
}
```

Soli should use this only as an intermediate checkpoint. The final migration should
remove both overrides and explicitly fix any code that relied on them.

## Behavior changes to audit

- Config v5 no longer defaults Tamagui views to `position: relative`.
- Config v5's React Native-compatible flex mode gives `flex={1}` a zero flex basis;
  Config v4's legacy mode used an automatic basis.
- Media names changed, notably `2xl` to `xxl` and `2xs` to `xxs`, with an additional
  `xxxs` size.
- Config v5 uses Radix Colors v3 and expands theme/token coverage.
- Space, size, radius, shadow, and animation values differ.
- Config v5's base settings retain `onlyAllowShorthands: true`, so that behavior is
  not new to this migration.

## Soli implementation notes

- Keep the cross-platform animation selection in the central config.
- Preserve the existing legacy purple import used by the feature graphic unless a
  deliberate redesign is separately approved.
- Add explicit `position="relative"` only to Tamagui parents that contain positioned
  descendants or otherwise require a containing block.
- Do not preserve `styleCompat: 'legacy'` merely to avoid auditing `flex={1}`; test the
  native v5 behavior and make focused layout declarations where needed.
- Regenerate `tamagui-web.css` after the final config is established.
