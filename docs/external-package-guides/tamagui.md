# Tamagui Guide

Last refreshed: 2026-10-17 (Tamagui 3 facts + Expo SDK 58 compatibility note)

## Scope

- Package/tool: `tamagui`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this as the main Tamagui package guide. Keep package bumps coordinated across Tamagui packages and validate with `yarn check:tamagui` plus native smoke checks when UI behavior can change.

## Tamagui 3 facts (2026-10-17, research for docs/product/tamagui-3-upgrade/tamagui-major-upgrade.md)

- Sources: https://tamagui.dev/blog/version-three (2026-10-09), https://tamagui.dev/docs/guides/how-to-upgrade
  (page truncates; the full v2→v3 checklist is `@tamagui/cli@3.0.18/src/migrate.ts`, printed by
  `npx tamagui migrate --from v2`), https://tamagui.dev/docs/core/config-v6, https://tamagui.dev/docs/core/native,
  https://tamagui.dev/docs/intro/compiler-install, https://tamagui.dev/ui/lucide-icons,
  https://github.com/tamagui/tamagui/releases, https://github.com/tamagui/tamagui/issues/4324, and the
  `3.0.18` tarballs of `@tamagui/{config,metro-plugin,cli,native,core,themes,shorthands,button,image}`.
- Versions: `3.0.0` 2026-10-10, `3.0.18` = npm `latest` (2026-10-16). v2 ended at `2.7.7` (2026-08-15).
  `@tamagui/babel-plugin` and `@tamagui/lucide-icons-2` have no 3.x release (removed in v3).
- Requirements: React 19, RN 0.81+, TS 5+. Native runtime (`@tamagui/native-registry` +
  `react-native-nitro-modules`, `experimental.nativeFastPath`) is opt-in beta, RN 0.82+ New Arch.
- Metro: `@tamagui/metro-plugin@3` peer `metro >=0.84.4 <0.88.0`; runtime gate `/^0\.8[4-7]\./`
  (SDK 58's Metro 0.87 accepted since 3.0.14). `withTamagui` from `@tamagui/cli/metro` is a
  re-export of `@tamagui/metro-plugin`; options `components`, `config`, `logTimings`,
  `disableExtraction` (or a root `tamagui.build.ts`). No Babel plugin.
- Tokens: `$` sigil removed with no runtime compatibility path: `p="$4"` → `p="4"`,
  `color="$color10"` → `color="color10"` (on config v5). Numeric `fontSize` stays raw px; numeric
  Tamagui `lineHeight` becomes a ratio, so run the codemod with `--source-semantics v2-pixels`
  (`npx @tamagui/codemod-flat-values --source-semantics v2-pixels --report flat-values-report.md ./src`,
  then `--write`). Conditions are flat clauses: `bg="background hover:background-hover"`, `p="4 sm:6"`,
  or object form `{ default: '4', sm: '6' }`.
- Config: v6 is default (Tailwind 4px space scale `1`=4 … `4`=16, kebab theme keys `color-1..11`,
  `border-color`, control sizes `xs|sm|md|lg|xl`). `@tamagui/config/v5` remains as a frozen pack and
  is the recommended intermediate checkpoint: keys stay `color10`, `red10`, `accent10`, `yellow11`,
  `green3` (`borderColor` + `border-color` both present) and shorthands stay `@tamagui/shorthands/v4`
  (`items`, `justify`, `self`, `rounded`, `maxW`). Animations: `@tamagui/config/animations-{css,rn,reanimated,motion}`
  (`v5-reanimated`/`v5-css` entries still exported).
- Icons: `yarn add react-native-svg @tamagui/helpers-icon`, then
  `npx @tamagui/cli icons add Atom Clock Settings Smile Star Lightbulb Shuffle Undo2 Ban RefreshCcw --out components/icons`
  (generated per-icon files; `@tamagui/lucide-icons-2` is 36 MB and imports all icons via one index).
- Other breaking changes (none used by Soli): `Sheet.Frame` → `Sheet.Container` + `Sheet.Background`;
  removed `focusable`, `fullscreen`, `themeInverse`, `styleable()`, `$true`, `useProps`/`useStyle`/
  `usePropsAndStyle`, `getTokenRelative`, `stepTokenUpOrDown`, `spacedChildren`, `Unspaced`,
  `onDidAnimate` (→ `onTransition`), `createTamagui({ defaultProps })`; `@tamagui/colors/legacy` →
  `@tamagui/colors`; Toast provider API → `toast()` from `tamagui/toast`.
- CLI (`@tamagui/cli@3`): `check [--strict]`, `generate` (replaces `generate-css`), `icons`, `add`,
  `build`, `upgrade`, `setup`, `migrate --from v2|v1`.
- `@tamagui/native@3` keeps `setup-teleport` and `setup-gesture-handler({ pressEvents, sheet })`;
  adds `setup-safe-area` (needs `SafeAreaProvider` outside `TamaguiProvider`), `setup-keyboard-controller`,
  `setup-expo-ui-menu`, `setup-zeego`, `setup-burnt`. Soli uses no Tamagui portal component, so the
  teleport/gesture setup is unused today (see the plan's stage 0).
- Decision: see `docs/product/tamagui-3-upgrade/tamagui-major-upgrade.md` — recommended path is to
  shrink Tamagui out (Expo UI + RN StyleSheet) rather than migrate; v3-on-v5 is the fallback.

## Expo SDK 58 compatibility (2026-10-17)

- Sources:
  - https://tamagui.dev/blog/version-three (v3 release, 2026-10-10) and
    https://tamagui.dev/docs/intro/upgrade-guide
  - https://github.com/tamagui/tamagui/issues/4324 (v3 metro plugin gated Metro to 0.84 and
    failed on Expo SDK 58 until 3.0.14, 2026-10-15)
  - `@tamagui/metro-plugin@2.4.2/dist/cjs/index.js` and `@tamagui/portal@2.4.2` (read locally)
- Decision for the SDK 58 upgrade: stay on `2.4.2` for all `@tamagui/*` packages
  (`yarn check:tamagui` enforces one version). Reasons: `@tamagui/metro-plugin@2.4.2` has no
  Metro version gate (the 0.84-only gate that broke SDK 58 was introduced in v3); the only
  RN deep import (`@tamagui/portal` -> `react-native/Libraries/Renderer/shims/ReactFabric`)
  still exists in RN 0.88 and is wrapped in try/catch.
- Caveat: the v2 line ended with `2.7.7` (2026-08-15), so Tamagui 2 is not validated
  upstream on RN 0.88 / Metro 0.87. Fallback order if Metro/Babel extraction or runtime
  styling breaks: (1) bump all packages to `2.7.7`, (2) temporarily set
  `disableExtraction` in `@tamagui/babel-plugin` to isolate the compiler, (3) plan the v3
  migration separately.
- Tamagui 3 is a real migration, not a bump: flat style props replace condition objects
  (`hoverStyle`, `$sm`), config v6 renames theme keys, `@tamagui/babel-plugin` is removed,
  the metro plugin moves to `@tamagui/cli/metro`. Tracked as a follow-up in the SDK 58 plan.

## Source-backed notes

Research date: 2026-06-11
Refresh check: 2026-07-03

## Purpose

Cache the Tamagui 2 package and API facts required by the Soli migration.

## Sources

- https://tamagui.dev/docs/guides/how-to-upgrade
- https://tamagui.dev/blog/version-two
- https://tamagui.dev/docs/intro/installation
- https://tamagui.dev/docs/core/config-v5
- https://tamagui.dev/docs/guides/expo
- https://tamagui.dev/docs/guides/metro
- https://tamagui.dev/ui/native
- https://tamagui.dev/ui/portal
- https://tamagui.dev/ui/sheet
- https://tamagui.dev/ui/toggle-group
- https://tamagui.dev/ui/lucide-icons
- https://tamagui.dev/ui/toast
- https://github.com/tamagui/tamagui/releases
- https://github.com/tamagui/tamagui/releases/tag/v2.4.0
- https://registry.npmjs.org/tamagui/latest
- https://registry.npmjs.org/@tamagui%2Fconfig/latest
- https://registry.npmjs.org/@tamagui%2Flucide-icons-2/latest

## Refresh check (2026-07-07)

Status: Soli bumped the whole Tamagui package set from `2.2.0` to `2.4.2` (see
docs/product/tamagui-2-upgrade/tamagui-2-4-2-bump.md).

- npm latest dist-tag is `2.4.2` (published 2026-07-06); `2.4.1` was 2026-07-04.
- `2.4.1` items relevant to Soli: fix for stale RNGH taps on native press events
  (#4024), numeric `fontSize` now applies as a literal size in getFontSized
  (was token-snapped), native "unset" style values no longer crash and clear
  earlier-set keys. The compiler `$group-*`/`$theme-*` CSS extraction feature is
  web-only.
- No breaking changes 2.2 → 2.4.x; config v5 unchanged.

## Refresh check (2026-07-03)

Status: updated as the main current-reference guide for Tamagui package work.

- Soli currently pins the Tamagui package set to `2.2.0`.
- The current npm latest dist-tag for `tamagui`, `@tamagui/config`, and
  `@tamagui/lucide-icons-2` is `2.4.0`; Tamagui `v2.4.0` was released on
  2026-06-27.
- Tamagui `v2.4.0` includes fixes relevant to Soli's native UI surfaces: Sheet drag
  release and keyboard handoff work, native portal theme repropagation, a typed
  `safe` value for safe-area-aware style props, and theme/media subscription
  performance improvements.
- Do not bump a single Tamagui package alone. If moving beyond `2.2.0`, bump the
  whole Tamagui package set together, regenerate CSS, run `npx tamagui check`, and
  smoke native Sheet/Toast behavior on fresh builds.

## Version facts

- Latest stable Tamagui on 2026-06-11: `2.2.0`.
- Latest stable Tamagui on 2026-07-03: `2.4.0`.
- Tamagui `2.2.0` was released on 2026-06-09.
- Required baselines:
  - React 19+
  - React Native 0.81+
  - TypeScript 5+
  - New Architecture support for native
- All runtime/config/compiler Tamagui packages should resolve compatibly. Duplicate
  `@tamagui/core` or `@tamagui/web` instances can break provider/config context.
- `@tamagui/lucide-icons` is not the stable v2 icon package. The v2 docs install
  `@tamagui/lucide-icons-2`, which has stable `2.2.0`.

## Required package direction for Soli's original Tamagui 2 migration

Pin these to exact `2.2.0`:

```json
{
  "tamagui": "2.2.0",
  "@tamagui/babel-plugin": "2.2.0",
  "@tamagui/cli": "2.2.0",
  "@tamagui/colors": "2.2.0",
  "@tamagui/config": "2.2.0",
  "@tamagui/font-inter": "2.2.0",
  "@tamagui/lucide-icons-2": "2.2.0",
  "@tamagui/metro-plugin": "2.2.0",
  "@tamagui/toast": "2.2.0"
}
```

Remove `@tamagui/lucide-icons`.

If the separately approved native-integration follow-up is implemented, also add
`@tamagui/native@2.2.0`.

Candidate resolutions, only if diagnostics prove they are needed:

```json
{
  "resolutions": {
    "tamagui": "2.2.0",
    "@tamagui/core": "2.2.0",
    "@tamagui/helpers-icon": "2.2.0",
    "@tamagui/web": "2.2.0"
  }
}
```

This is not a workspace/monorepo. Do not add these resolutions preemptively. First
install exact direct versions and inspect `yarn why` plus `npx tamagui check`; add only
the minimum resolution required by a demonstrated duplicate.

## Migration sequence

Tamagui's official guide recommends separating the runtime migration from Config v5.

1. Upgrade packages to Tamagui 2.
2. Keep `@tamagui/config/v4`.
3. Fix removed APIs and establish green builds.
4. Only if separately approved after the core migration, migrate to Config v5.

## Config v5

Config v5 does not bundle animations in its base entry point. Select an animation
driver explicitly.

For Soli's universal Expo app, the documented cross-platform pattern is:

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

Important v4 to v5 changes:

- `flex` uses React Native-compatible `flexBasis: 0` instead of legacy `auto`.
- Default position becomes browser `static` rather than `relative`.
- Breakpoints and media names changed.
- Colors use Radix Colors v3.
- Animation values are imported separately.
- Component-theme behavior and theme values differ.

Temporary compatibility settings are available:

```ts
settings: {
  ...defaultConfig.settings,
  styleCompat: 'legacy',
  defaultPosition: 'relative',
}
```

Use them only while isolating migration regressions, then remove them after the app
explicitly declares any required layout behavior.

Published `@tamagui/config@2.2.0` sets `onlyAllowShorthands: true` in both v4 and v5,
so this is not a v5-specific migration change. Do not override it unless actual
post-upgrade type diagnostics demonstrate a repository need.

## API changes relevant to Soli

- `Stack` -> `View`
- `animation` -> `transition`
- `backgrounded` removed
- React Native accessibility props on Tamagui primitives -> ARIA props
- `Image source` -> web-standard Image API, normally `src`
- `space`/`spaceDirection` -> `gap`
- React Native shadow prop groups -> `boxShadow` for Tamagui cross-platform styles
- `useTheme(props)` removed; no issue for current no-argument calls
- `Button` direct text style props removed; current usages must be typechecked
- Root `@tamagui/colors` palettes use Radix v3; use
  `@tamagui/colors/legacy` for the feature graphic during visual-parity migration

## ToggleGroup v2

`ToggleGroup` now manages state and keyboard navigation but does not render a visible
container. Compose it with `XGroup` or `YGroup`.

```tsx
<ToggleGroup type="single" value={value} onValueChange={setValue}>
  <XGroup>
    <XGroup.Item>
      <ToggleGroup.Item value="1" activeStyle={{ bg: '$color10' }}>
        <Text>1</Text>
      </ToggleGroup.Item>
    </XGroup.Item>
  </XGroup>
</ToggleGroup>
```

For Soli:

- Keep `ToggleGroup` responsible for selection.
- Use `XGroup` as the five-segment visual container.
- Wrap each item in `XGroup.Item`.
- Preserve explicit text colors and selected-state contrast.
- Replace `accessibilityLabel` with `aria-label` on the Tamagui item.

## Bundled Expo image

The published `@tamagui/image@2.2.0` types define `src?: string | number`, explicitly
covering a React Native `require()` result. The feature graphic can therefore use:

```tsx
const iconSource = require('../assets/images/icon.png')

<Image
  src={iconSource}
  width={iconSize}
  height={iconSize}
  objectFit="contain"
  borderRadius={iconRadius}
/>
```

Keep explicit dimensions so web and native do not depend on differing intrinsic-size
behavior.

## Icons

Install:

```sh
yarn add @tamagui/lucide-icons-2 react-native-svg
```

Use:

```ts
import { Menu, RefreshCcw, Undo2 } from '@tamagui/lucide-icons-2'
```

Soli already has an Expo-compatible `react-native-svg`; keep the Expo-selected version.

## Native setup

This section is an optional follow-up, not part of the required Config v4 migration.

Native integration setup must run before any Tamagui imports. Expo Router therefore
needs a custom entry:

```js
import './tamagui.native.setup'
import 'expo-router/entry'
```

Portal setup:

```ts
import '@tamagui/native/setup-teleport'
```

Gesture Handler can be limited to Sheet:

```ts
import { setupGestureHandler } from '@tamagui/native/setup-gesture-handler'

setupGestureHandler({ pressEvents: false, sheet: true })
```

Put this call inside the imported setup module so it executes before
`expo-router/entry`.

## Compiler and CSS

- Standard Expo Metro works without Tamagui-specific setup.
- `@tamagui/metro-plugin` remains recommended for config watching and development.
- The current Expo guide recommends a root `tamagui.build.ts` when using compiler
  tooling so Babel/Metro can share options. Soli can keep its current explicit Babel
  plugin options unless future compiler work needs a single shared config file.
- Generate CSS with:

```sh
npx tamagui generate-css --output ./tamagui.generated.css
```

- Generate a config prompt with:

```sh
npx tamagui generate-prompt
```

- Run dependency consistency checks with:

```sh
npx tamagui check
```

## Scope decisions

- REMOVED 2026-07-06: `@tamagui/toast` was dropped entirely (no code ever showed a
  toast, and its `ToastViewport` full-screen focusable wrapper hid the whole app from
  the Android accessibility tree). If toasts return, avoid a full-screen focusable
  viewport and re-verify the Android a11y tree. Historical note kept below:
- The published `@tamagui/toast@2.2.0` root types still export `ToastProvider`,
  `ToastViewport`, `useToastController`, and `useToastState`. Retain that legacy API
  initially and verify it at runtime. The migration checklist's `Toaster` instruction
  conflicts with the current component page and package surface, so use the smallest
  change proven necessary.
- Do not adopt Toast v2 simultaneously.
- Do not enable `@tamagui/react-native-web-lite` simultaneously.
- Do not enable Motion animations.
- Do not redesign themes while fixing compatibility.
- Regenerate committed CSS, but do not require a CSS filename rename, shared
  `tamagui.build.ts`, or generated CLI prompt unless implementation proves one is
  needed.
