# lucide-react-native Guide

Last refreshed: 2026-10-18

## Scope

- Package/tool: `lucide-react-native`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

The five board/dock icons (`Ban`, `RefreshCcw` on the stock card; `Lightbulb`, `Shuffle`,
`Undo2` in the undo scrubber dock) come from this package since the 2026-10-18 Tamagui
removal (`docs/product/tamagui-3-upgrade/tamagui-major-upgrade.md`). They replaced
`@tamagui/lucide-icons-2` one-to-one: same glyphs, same `size`/`color` props. Keep lucide
on the board — it is a plain `react-native-svg` drawing with no native Host, so it is safe
inside `GestureDetector`/pressable pills. Drawer/header glyphs use Expo UI `Icon`
(`components/NativeIcon.tsx`) instead.

## Source-backed notes

- Retrieved: 2026-10-18
- Sources:
  - Package overview: https://lucide.dev/guide/packages/lucide-react-native
  - Getting started (install, props): https://lucide.dev/guide/react-native/getting-started
  - npm metadata: https://www.npmjs.com/package/lucide-react-native (`npm view lucide-react-native@1.50.0`)
  - Installed sources: `node_modules/lucide-react-native/dist/esm/Icon.mjs`,
    `dist/esm/icons/*.mjs`, `dist/types/icons/*.d.ts`

## Key facts

- Version pinned: `1.50.0` (published 2026-10-02). Lucide releases almost daily; Soli pins an
  exact version and only bumps deliberately. The repo's Yarn `npmMinimalAgeGate: 1d` would
  also refuse a same-day release; the plan asked for a release at least two weeks old.
- License: ISC.
- Peers (all already in Soli): `react`, `react-native`, `react-native-svg` `^12 || ^13 || ^14 || ^15`
  (Soli has `15.16.0`), `@types/react`.
- Each icon is a named export and a standalone component that renders a `react-native-svg`
  `<Svg>` with `viewBox="0 0 24 24"`; only the imported icons end up in the bundle.
- Props (`dist/esm/Icon.mjs`, defaults in the destructuring / `LucideContext` fallbacks):
  - `size` (number, default `24`) — sets both `width` and `height`
  - `color` (string, default `'currentColor'`) — stroke colour; always pass one on native
  - `strokeWidth` (number, default `2`)
  - `absoluteStrokeWidth` (boolean, default `false`) — when `true` the stroke stays 2 px at
    any size instead of scaling with the viewBox
  - `nonScalingStroke` (boolean, default `false`)
  - any other `react-native-svg` `Svg` prop (`testID`, `style`, `accessibilityLabel`, …)
- Optional `LucideProvider`/`useLucideContext` (`dist/esm/context.mjs`) can set defaults for
  a subtree; Soli does not use it (the five call sites pass `size` and `color` explicitly).
- Unpacked size is ~30 MB on disk (one file per icon, three builds); irrelevant for the
  bundle because of per-icon imports.

## Soli usage

```tsx
import { Ban, Lightbulb, RefreshCcw, Shuffle, Undo2 } from 'lucide-react-native'

<Undo2 size={20} color="#000" />
<RefreshCcw color="#0f172a" size={iconSize} />
```

Parity check done on 2026-10-18 against `@tamagui/lucide-icons-2@2.4.2` (generated from
`lucide-static ^0.508`): `RefreshCcw`, `Lightbulb`, `Shuffle`, `Undo2` have byte-identical
path data; `Ban`'s diagonal is `M4.929 4.929 19.07 19.071` instead of the relative
`m4.9 4.9 14.2 14.2` — the same line within 0.03 px. The Tamagui wrapper also used
`strokeWidth "2"` and the same 24-unit viewBox, so the rendered stroke is identical for a
given `size`.

Do not use the lucide `LucideProvider` or theme tokens for colour — the board colours are
literals in `src/features/klondike/constants.ts` and the dock buttons are black-on-light by
design.
