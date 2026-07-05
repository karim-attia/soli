# Expo Material Symbols Guide

Last refreshed: 2026-07-05

## Scope

- Package/tool: `@expo/material-symbols`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this package when Expo UI `Icon` needs a native Material Symbol on Android. Pair it
with `@expo/ui` universal `Icon` so iOS can use an SF Symbol and Android can use an XML
Material Symbol from this package.

## Source-backed notes

- Retrieved: 2026-07-05
- Sources:
  - Expo UI universal Icon docs: https://docs.expo.dev/versions/latest/sdk/ui/universal/icon/
  - npm/package README installed at `node_modules/@expo/material-symbols/README.md`
  - Package metadata installed at `node_modules/@expo/material-symbols/package.json`

## Key facts

- `@expo/material-symbols` ships Android XML vector drawables for Material Symbols.
- Each icon is imported from its own subpath, such as
  `@expo/material-symbols/menu.xml`.
- The package `exports` map points `./*.xml` to generated XML assets and `.d.ts` files,
  so TypeScript can validate icon subpaths.
- Only imported icons are bundled.
- The package currently ships the outlined Material Symbols style by default.
- Expo UI universal `Icon` can select an SF Symbol string for iOS and a Material Symbol
  XML asset for Android with `Icon.select`.

## Soli usage

Install through Expo/Yarn:

```sh
npx expo install @expo/material-symbols
```

Use with Expo UI universal `Icon`:

```tsx
import { Host, Icon } from '@expo/ui'

const MENU_ICON = Icon.select({
  ios: 'line.3.horizontal',
  android: import('@expo/material-symbols/menu.xml'),
})

<Host matchContents>
  <Icon name={MENU_ICON} />
</Host>
```

Implementation notes:

- Wrap `Icon` in `Host matchContents` when placing it inside React Native-owned UI such
  as an Expo Router header button.
- `Icon.size` is optional. The installed `menu.xml` declares 24dp intrinsic width and
  height, so omit `size` when the native Material Symbol dimensions are desired.
- If that `Host` is isolated inside a React Navigation header, pass the current theme or
  header tint color explicitly to `Icon`; do not assume native content color will inherit
  across the host boundary.
- Prefer `Icon.select` to a plain `{ ios, android }` object so the Expo UI Babel plugin
  can remove the unused platform side.
- Keep this package for native Android icons. Do not add a second icon library for the
  same header/menu use case.
