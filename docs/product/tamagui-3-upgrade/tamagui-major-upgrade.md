# Tamagui Major Upgrade (2.4.2 → 3.x) or Shrink-to-Expo-UI

Research date: 2026-10-17. Plan only — no packages or source changed yet.

## User prompt

```text
... and as a next big thing would it make sense to also look into the Tamagui major upgrade and what are like the benefits and cleanups and whatever the upgrade path thank you
```

```text
pls figure out how tamagui removal would look. really just buttons? would this make sense?
```

## Removal shape: refined 2026-10-17 (answers prompt 2)

The working-tree inventory, grouped by what each piece turns into:

| Tamagui piece | Where | Replacement | Notes |
| --- | --- | --- | --- |
| `YStack`/`XStack`/`View` (~97 sites) | board (`KlondikeGameView`, `TopRow`, `PileButton`), screens, sheets | RN `View` (+ `flexDirection: 'row'`) | Mechanical; `$` gaps/paddings become numbers (~107 token sites, 39 of them in the feature graphic) |
| `Text`/`Paragraph`/`Anchor` (~49 sites) | cards, foundation, hello, sheets | RN `Text` with a palette color, `Linking.openURL` for `Anchor` | Fonts are already the system font (C4), so no font work |
| `Button`: **4 user-facing** | Android header New Game/Demo (`index.tsx:305,309`), History sheet Retry/Share (`history.tsx:474,485`) | Android header → router `HeaderButton` like iOS already uses (`IOSHeaderTextAction`), which deletes the Android-only branch. Sheet buttons → `components/AppButton.tsx` (RN `Pressable`) | Expo UI controls are not an option inside sheets: Android gestures were unreliable (comment at `history.tsx:470`) |
| `Button`: 15 dev-only | Demo sheet (`index.tsx:180-288`) | Same `AppButton` | Dev tooling |
| `useTheme` (16 keys in 5 files) | drawer, header icon, tabs layout, hints | `src/theme/palette.ts` (light/dark values resolved from config v5) + `useColorScheme` | One small hook |
| lucide icons (10) | drawer, scrubber, stock pile | Drawer/header: Expo UI `Icon` (as `HeaderMenuButton` already does). Board/scrubber: `lucide-react-native` (on our existing `react-native-svg`) | Avoids one Host per board icon |
| `TamaguiProvider` | `components/Provider.tsx` | Delete | |
| Feature graphic (1,007 LOC, dev-only, web) | `src/dev/FeatureGraphicScreen.tsx` | Mechanical port to RN View/Text in its own last step. **Keep the screen**: Karim uses it on web | Largest single chunk |

So it really is "mostly buttons": only 4 user-facing buttons need a design decision. Everything else is a
mechanical swap of primitives and tokens. After the removal: about 9 packages (tamagui, @tamagui/*,
teleport), `tamagui.config.ts`, the 350 KB `tamagui-web.css`, the babel/metro plugins, the custom
entry, and the `check:tamagui`/`generate:tamagui-css` scripts are gone. AGENTS.md's component rule
would then read "Expo UI where a native Host fits, otherwise RN primitives wrapped in `components/`".

## Summary

- Tamagui 3.0.0 shipped 2026-10-10 (announcement dated 2026-10-09); `3.0.18` is npm `latest`
  (2026-10-16). 18 patch releases in 7 days. Core is on the `latest` dist-tag; the headline
  "native runtime" is an opt-in beta, zero-runtime mode is experimental. The v2 line ended at
  `2.7.7` (2026-08-15) and gets no more fixes.
- Soli uses a thin slice of Tamagui: 16 source files, 10 components (`YStack`, `XStack`, `View`,
  `Text`, `Paragraph`, `Button`, `Anchor`, `Spinner`, `Separator`, `Image`), `useTheme` in 5
  files, `TamaguiProvider`, 10 lucide icons, config v5. Zero `styled()`, zero
  `hoverStyle`/`pressStyle`/`$sm`/`$theme-` conditions, zero `transition`/animation props, zero
  portal components (Sheet/Dialog/Popover/Toast). Settings, header icon and the two bottom sheets
  are already Expo UI. The game board is RN `StyleSheet`.
- v3's headline features (C++ native theme runtime, compiler for conditional props, flat
  `p="4 sm:6"` clauses, Tailwind, React Strict DOM) solve problems Soli does not have. For Soli
  the v3 migration is mostly churn: drop the `$` sigil on ~60 prop sites, regenerate 10 icons,
  delete the Babel plugin, re-point the Metro plugin. Cleanups it enables: `-@tamagui/babel-plugin`,
  `-@tamagui/lucide-icons-2` (36 MB, all 1,700 icons imported through one index).
- `@tamagui/native` + `react-native-teleport` (a native module) are dead weight TODAY: they only
  serve Tamagui portals/Sheet, and Soli has none since the History/Demo sheets moved to
  `@expo/ui` `BottomSheet`. Removing them is a stage-0 cleanup independent of any Tamagui decision.
- Recommendation (see Options): do stage 0 now (after SDK 58 lands), then shrink Tamagui out of
  the app in two phases (option d) instead of migrating to v3. Fallback if Karim wants to keep
  Tamagui's token system: v3 on config v5 (option c), not before ~3.1 / Metro gate for SDK 59 is
  known. Do not bump to `2.7.7` unless SDK 58 smoke shows a Tamagui-attributable bug.

## Description

Soli is a native-only Expo SDK 58 / RN 0.88 / React 19.3 app. It adopted Tamagui 2 in June 2026
(config v5, native Teleport follow-up), bumped to 2.4.2 in July. Since then the product moved
settings, header icons and sheets to Expo UI (AGENTS.md: "Use expo ui (preferred if available)
or tamagui"). The SDK 58 upgrade (in flight, other agent) keeps Tamagui at 2.4.2 and flags
"Tamagui 2.4.2 on Metro 0.87 is unverified upstream; 2.7.7 fallback; v3 separate migration".

This plan answers: what is Tamagui 3, what would it change for Soli, what cleanups does it
enable, and is it worth it compared with staying, bumping within v2, or reducing Tamagui in favor
of Expo UI + RN `StyleSheet`.

Why it matters: Tamagui ships a major every ~4 months (v2 2026-06, v3 2026-10) and its Metro
plugin version-gates the Metro resolver (`>=0.84.4 <0.88.0` in 3.0.18; the 0.84-only gate broke
SDK 58 until 3.0.14). Every Expo SDK bump therefore carries a Tamagui compatibility tax. A styling
library Soli uses at ~5% of its surface should either be kept current cheaply or removed.

## Research: Tamagui 3 facts (sources: tamagui.dev/blog/version-three, /docs/guides/how-to-upgrade, /docs/core/config-v6, /docs/core/native, /docs/intro/compiler-install, /ui/lucide-icons, GitHub releases + issue #4324, `@tamagui/cli@3.0.18` `src/migrate.ts`, tarballs of `@tamagui/{config,metro-plugin,cli,native,core,themes,shorthands,button}@3.0.18` read in the scratchpad)

| Topic | Tamagui 3 (3.0.18) | Soli impact |
| --- | --- | --- |
| Status | 3.0.0 2026-10-10, 3.0.18 2026-10-16 (`latest`). Native runtime = opt-in beta, zero-runtime = experimental, LSP = new | Fresh; expect more patches |
| Requirements | React 19, RN 0.81+, TS 5+. Native runtime needs RN 0.82+ New Arch | Met (19.3 / 0.88 / TS 7.0.2) |
| Metro | `@tamagui/metro-plugin@3` peer `metro >=0.84.4 <0.88.0`, runtime gate `/^0\.8[4-7]\./` (3.0.14+) | SDK 58 (Metro 0.87) OK; SDK 59 will need another Tamagui release |
| Compiler | `@tamagui/babel-plugin` removed (no 3.x published). Compiler runs inside `withTamagui` from `@tamagui/cli/metro` (re-export of `@tamagui/metro-plugin`). Optional `tamagui.build.ts` | Delete Babel plugin block; move `disableExtraction`/`logTimings` to Metro options |
| Tokens | `$` sigil removed, "no runtime compatibility path". `p="$4"` → `p="4"`, `color="$color10"` → `color="color10"` (v5) | ~60 prop sites in 9 files (codemod) |
| Conditions | `hoverStyle`/`$sm`/`$theme-*` objects removed → `bg="background hover:background-hover"` or object form | None used |
| Config | v6 default (Tailwind 4px scale, kebab theme keys `color-1..11`, `border-color`, control sizes `xs..xl`). v5 still exported from `@tamagui/config/v5` as a frozen pack; keys stay `color10`, `red10`, `accent10`, `yellow11`, `borderColor` (+ `border-color` alias) — verified in `@tamagui/themes@3.0.18/dist/cjs/generated-v5.cjs` | Keep v5 → `useTheme()` keys unchanged. v6 would remap 12→11 ramp (`color10`→`color-9`) and resize space (`$4` 18px → `4` 16px) |
| Shorthands | v5 config still uses `@tamagui/shorthands/v4` (`items`, `justify`, `self`, `rounded`, `maxW`); v6 uses short forms (`ai`, `jc`, `als`, `br`, `maw`) | Keep v5 → 54 shorthand sites untouched |
| Animations | Import from `@tamagui/config/animations-{css,rn,reanimated,motion}` (`v5-reanimated`/`v5-css` entries still exist). `animations-react-native` throws on web | 2-line change in `tamagui.config.ts` |
| Icons | `@tamagui/lucide-icons-2` removed. `npx @tamagui/cli icons add Atom Clock ...` generates per-icon files into `components/icons` + runtime dep `@tamagui/helpers-icon` | 5 files, 10 icons; -36 MB node_modules, no all-icons import |
| Line height | Numeric Tamagui `lineHeight` = ratio; codemod `--source-semantics v2-pixels` rewrites to `"28px"`. Numeric `fontSize` stays raw px | 2 sites in `FeatureGraphicScreen.tsx` |
| Button | `size` keeps numeric token keys on v5 (`size="3"`); v6 uses `xs..xl` | 22 `size="$3"`/`"$2"` sites |
| Sheet | `Sheet.Frame` → `Sheet.Container` + `Sheet.Background` | None used |
| `@tamagui/native` | Same `setup-teleport` / `setup-gesture-handler({pressEvents, sheet})` API; new `setup-safe-area`, `setup-keyboard-controller`, `setup-expo-ui-menu` | Unused → remove (stage 0) |
| Colors | `@tamagui/colors/legacy` → `@tamagui/colors` ("same names from current Radix scales") | `FeatureGraphicScreen.tsx:5` (`purple`), dev-only |
| CLI | `tamagui check [--strict]`, `generate` (replaces `generate-css`), `icons`, `migrate --from v2` (prints an agent prompt), `upgrade`, `setup` | `check:tamagui` ok; `generate:tamagui-css` script must change or go |
| Removed APIs | `focusable`, `fullscreen`, `themeInverse`, `styleable()`, `$true`, `useProps`/`useStyle`, `getTokenRelative`, `spacedChildren`, `Unspaced`, `onDidAnimate`, `createTamagui({defaultProps})` | `rg` found none in Soli |
| Perf claims | iOS benchmark: 2,003 views in 39.5 ms, theme switch 3.5 ms (native runtime). Typecheck 1.3-1.8x faster (v3 types) | Soli has no runtime theme switching beyond OS scheme; board is RN StyleSheet |
| Bundle size | No official numbers. Measured locally: `node_modules/@tamagui` 148 MB (127 packages), `lucide-icons-2` 36 MB | Only the icon change is bundle-relevant |

v2 line after 2.4.2 (2.4.3 … 2.7.7, 2026-07-09 … 2026-08-15), relevant bits: 2.4.4 native hover
pseudo fix, 2.4.5 strict-mode theme registry fix, 2.5.x accordion/animation driver work and
`Image` native prop resolution, 2.6.0 compiler fixes "preserve media conditions on native" / "keep
deoptimized style props on native" + reanimated worklet-thread fixes (#4148), 2.6.4 drops the
`react@19.1.0` pin, 2.7.x native menu adapters (Expo UI), sheet reopen fix, lucide per-icon
subpath types. No breaking changes. Nothing targets Metro 0.87 / RN 0.88 (v2 ended before SDK 58).

## Inventory: Soli's Tamagui usage (2026-10-17, working tree)

Packages (`package.json`, all pinned 2.4.2): `tamagui`, `@tamagui/colors`, `@tamagui/config`,
`@tamagui/font-inter`, `@tamagui/lucide-icons-2`, `@tamagui/native` (deps); `@tamagui/babel-plugin`,
`@tamagui/cli`, `@tamagui/metro-plugin` (devDeps). Plus `react-native-teleport@1.2.2` (native
module, only for Tamagui portals) and `react-native-web@^0.21.4` (peer, web is not a target).

Config/tooling: `tamagui.config.ts` (v5 + CSS/Reanimated driver switch), `babel.config.js`
(`@tamagui/babel-plugin`, extraction off in dev), `metro.config.js` (`withTamagui` +
`TAMAGUI_IGNORE_BUNDLE_ERRORS` for safe-area codegen specs), `tamagui.native.setup.ts` +
`index.js` custom entry (teleport + sheet gesture adapter), `tamagui-web.css` (350 KB, imported in
`app/_layout.tsx:1`, web only), scripts `check:tamagui`, `generate:tamagui-css`. Jest: no Tamagui
mocks; `jest-expo` preset handles the import chain (comment in `hintOverlay.test.ts:4`).

| Surface | Files | What |
| --- | --- | --- |
| Imports from `tamagui` | 16 | `YStack` ×36 JSX, `View` ×35, `Text` ×31, `XStack` ×25, `Button` ×22, `Paragraph` ×16, `Anchor` ×2, `Spinner`/`Separator`/`Image` ×1 each |
| `useTheme()` | `app/(tabs)/_layout.tsx`, `app/(tabs)/history.tsx` (3 call sites), `components/navigation/AppDrawerContent.tsx`, `components/navigation/HeaderMenuButton.tsx` | 16 distinct keys: `color`, `background`, `borderColor`, `color3/4/7/11`, `red10`, `blue10`, `green3/7/10/11`, `yellow3/7/11` — all read as `theme.x?.val` with hex fallbacks |
| `$` token literals in props | 9 files, ~60 sites | space `$1 $2 $2.5 $3 $4 $5`, size `$2 $3`, colors `$color $color3 $color8 $color10 $blue10 $accent10` |
| v5 shorthands | `items` ×22, `justify` ×13, `maxW` ×7, `self` ×6, `rounded` ×6, `px/py/pt/pb/p/mx/m/bg` | mostly `FeatureGraphicScreen.tsx` |
| Icons `@tamagui/lucide-icons-2` | `_layout.tsx` (Atom, Clock, Settings, Smile), `AppDrawerContent.tsx` (Star), `UndoScrubber.tsx` (Lightbulb, Shuffle, Undo2), `CardVisual.tsx` (Ban, RefreshCcw) | 10 icons |
| Fonts | **Corrected 2026-10-17 (SDK 58 plan, C4):** Tamagui config v5 uses `createSystemFont()` (system font on native, system CSS stack on web). The old `useFonts` Inter load was a dead config-v4 leftover and was deleted, along with `@tamagui/font-inter`. Soli UI text is the system font; only card glyphs use `CardTextAndroid`. | None. (d) needs no font work, and the Inter steps below are obsolete. |
| Not used | `styled()`, variants, media (`$sm`…), `hoverStyle`/`pressStyle`/…, `transition`, `Theme`, `Sheet`/`Dialog`/`Popover`/`Toast`/`Portal`, `@tamagui/colors` runtime (only `purple` from `/legacy` in dev screen) | — |
| Already Expo UI | `app/(tabs)/settings.tsx` (`FieldGroup`, `Switch`, `Button`, `Host`), `components/settings/*` (`Row`, `Column`, `Spacer`, `Text`, `Picker`, `Switch`), `components/AppSheet.tsx` (`BottomSheet` + `RNHostView`), `components/navigation/HeaderMenuButton.tsx` (`Icon`) | 6 files |
| RN `StyleSheet.create` | 12 files (board, cards, HUD, bubbles, scrubber, felt) | The game itself |

Largest consumers: `src/dev/FeatureGraphicScreen.tsx` (1,007 lines, dev-only Play Store feature
graphic; ~100 Tamagui JSX + 39 tokens), `app/(tabs)/history.tsx` (501 lines), `app/(tabs)/index.tsx`
(361 lines; the Tamagui part is the dev `DemoChoiceSheet` + header buttons). Game-path usage is
small: `KlondikeGameView.tsx:62,78-93` (two `YStack`), `PileButton.tsx:52-55`, `TopRow.tsx`
(`View`/`XStack` wrappers), `CardVisual.tsx`/`FoundationPile.tsx` (`Text` for glyphs/labels).

## Acceptance Criteria

Stage 0 (dead-weight removal), any option:

- `@tamagui/native`, `react-native-teleport`, `tamagui.native.setup.ts`, `index.js` gone;
  `package.json#main` back to `expo-router/entry`. `yarn typecheck && yarn lint && yarn jest`,
  `yarn check:tamagui` green. Fresh iOS sim + Android release builds launch; History sheet and
  Demo sheet (Expo UI) open/dismiss; tap-to-move, undo scrubber work.

Option (c) — Tamagui 3 on config v5:

- All `tamagui`/`@tamagui/*` on one 3.0.x version; `@tamagui/babel-plugin` and
  `@tamagui/lucide-icons-2` removed; `@tamagui/helpers-icon` added; icons generated into
  `components/icons/`.
- No `$` sigil left in Tamagui props; `npx tamagui check --strict` green; cheap gates green.
- Visual parity: light/dark history screen (status colors, tiles), drawer tints, header icons,
  pile labels, demo sheet, feature graphic within 1-2 px. Fonts still Inter.
- iOS sim + Android release smoke per `.agents/skills/soli-testing/SKILL.md`.

Option (d) — shrink Tamagui out:

- Phase D1: no `tamagui` import outside `src/dev/FeatureGraphicScreen.tsx`; `components/`
  gets `AppText`, `AppButton` (or Expo UI `Button` where a Host is acceptable), `src/theme/palette.ts`
  with the 16 resolved v5 colors for light/dark; icons via `lucide-react-native`; Inter OTFs copied
  to `assets/fonts/`. Visual parity as above.
- Phase D2: feature graphic frozen as PNG (or rewritten) and all Tamagui packages, config,
  Babel/Metro plugins, `tamagui-web.css`, `check:tamagui`/`generate:tamagui-css` removed.
  `babel.config.js`/`metro.config.js` back to Expo defaults.

## Possible approaches

| | (a) Stay 2.4.2 | (b) Bump to 2.7.7 | (c) Tamagui 3 on config v5 | (d) Shrink to Expo UI + RN StyleSheet |
| --- | --- | --- | --- | --- |
| Effort | 0 | S (9 pins, cheap gates, 1 smoke) | M (codemod + manual review of ~60 sites, icons, Babel/Metro, smoke on 2 platforms) | L total: D1 M (15 files, ~170 JSX sites), D2 S-M (dev screen + package removal) |
| Risk | Unmaintained since 2026-08; unverified on Metro 0.87/RN 0.88; next SDK may break the metro plugin with no fix coming | Same end-of-life; 2.6.x compiler/reanimated changes could shift behavior; little upside | v3 is 1 week old (18 patches); Metro gate repeats every SDK; codemod leaves manual review; `Image src=require()` and `colors/legacy` need typecheck verification | Visual drift if palette/font not carried over exactly; `Button` look changes; biggest diff; FeatureGraphicScreen is 1,007 lines |
| Benefits | None | Picks up 2.6.0 native compiler fixes + reanimated worklet fixes; last v2 | Supported line; `-@tamagui/babel-plugin` (faster Babel); per-icon generation (-36 MB deps, smaller JS bundle); v3 types faster to check | Removes a native module (teleport), compiler from Babel+Metro, custom entry, 350 KB CSS, 2 scripts, 12 packages / 148 MB; one less major-upgrade tax per SDK; aligns with AGENTS.md "prefer Expo UI"; fewer mental models (RN style + Expo UI only) |
| LOC delta (app code) | 0 | 0 | ≈ -15 (Babel block, imports) + ~150 generated icon LOC; ~60 one-token edits | D1 ≈ +180 (palette, 2 wrappers) / -120; D2 ≈ -1,050 (dev screen, config, setup, scripts) if the feature graphic is frozen as an asset |
| Verdict | Not viable long-term | Only as a bug-driven fallback during SDK 58 | Fallback if Tamagui's token/theme system should stay | **Recommended**, phased, after SDK 58 is stable |

Reasoning for (d): Soli uses Tamagui as "RN View/Text with tokens + Inter + a Button". None of
v3's value (native runtime, conditional compilation, flat clauses, Tailwind) touches that usage;
the migration would be pure maintenance. Meanwhile the product direction is Expo UI for native
controls and RN StyleSheet for the board. Carrying the 16 resolved colors and the two Inter faces
over keeps the look identical, so the risk is in the diff size, not in design. Doing it in two
phases keeps each PR reviewable and lets Karim stop after D1 (the app) if D2 (dev screen) is not
worth it.

Reasoning against (c)-first: it costs a full smoke cycle on both platforms and buys mostly a
supported version number, then (d) would redo the same files later.

## Open questions to the user

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | Direction: migrate to Tamagui 3 or shrink Tamagui out? | (c) v3 on config v5 — keeps token system, M effort now and again per major; (d) shrink — L effort once, then only RN + Expo UI | **(d)**. Soli uses <5% of Tamagui and already prefers Expo UI. Choose (c) only if you want to keep theme tokens / `useTheme` as a design system for future screens |
| 2 | Stage 0 now (remove `@tamagui/native` + `react-native-teleport` + custom entry)? | yes after SDK 58 is merged and smoke-tested; or bundle into the first (c)/(d) PR | **Yes, separately** — small native-module removal, own build+smoke, independent of Q1 |
| 3 | Button replacement in (d) | Expo UI `Button` inside `Host` (native look, needs a Host per button/row; Android nested-Host gestures were flaky inside sheets — see `index.tsx:142-145` comment) vs. tiny `components/AppButton.tsx` on RN `Pressable` with palette colors | **`AppButton` (Pressable)** for the dev sheet / history / header; Expo UI only where a Host already exists |
| 4 | Fonts in (d) | ~~keep Inter vs. system font~~ | **Resolved:** the app already renders the system font (config v5). Keep the system font and skip every Inter step in D1. |
| 5 | `src/dev/FeatureGraphicScreen.tsx` fate in D2 | freeze current output as PNG under `assets/store/` and delete the screen (-1,007 LOC) vs. rewrite with RN/Skia | **Freeze + delete**, it is a one-time Play Store asset; re-create on demand |
| 6 | Icons in (d) | `lucide-react-native@1.59.0` (same glyphs, `react-native-svg` already installed) vs. `@expo/ui` `Icon` (SF Symbols / Material, platform look, needs Host) vs. `expo-symbols` | **`lucide-react-native`** for drop-in parity (drawer, header, scrubber, cards) |
| 7 | Web remnants (`tamagui-web.css`, `app/+html.tsx`, `react-native-web`, `yarn web`) | remove now vs. leave to SDK 58 plan item D5 | Fold into D2 (they only exist for Tamagui web); until then untouched |
| 8 | Timing | start right after SDK 58 merge vs. wait for v3.1 | Stage 0 + D1 right after SDK 58 is stable on both platforms; no Tamagui release to wait for in (d) |

## Dependencies

Option (c) adds/changes: `tamagui`, `@tamagui/config`, `@tamagui/colors`, `@tamagui/font-inter`,
`@tamagui/cli`, `@tamagui/metro-plugin` → `3.0.x` (one exact version); add `@tamagui/helpers-icon@3.0.x`;
remove `@tamagui/babel-plugin`, `@tamagui/lucide-icons-2`. Guide: `docs/external-package-guides/tamagui.md`
(refreshed 2026-10-17 with v3 facts).

Option (d) adds: `lucide-react-native` (research + guide `docs/external-package-guides/lucide-react-native.md`
before implementing). Removes: all `@tamagui/*`, `tamagui`, `react-native-teleport`, later
`react-native-web`. Existing guides: `expo-ui.md`, `expo-font.md`, `react-native.md`.

## UX/UI Considerations

- Parity is the goal in every option; no redesign. Capture baseline screenshots (light + dark:
  board, drawer, history list + detail sheet, settings, demo sheet) before any change.
- (d) palette: read the 16 keys from the live v5 config once (`node -e` against
  `@tamagui/config/v5` for `light`/`dark`) and commit the hex values with a comment pointing to
  the origin; keep the existing hex fallbacks in `history.tsx` as cross-check.
- (d) `Button`: Tamagui v5 `size="$3"` = 36 px height, `$2` = 28 px; `AppButton` should match.
- (d) spacing: v5 space tokens `$1`=2, `$2`=7, `$2.5`=10, `$3`=13, `$4`=18, `$5`=24 px — use
  these literal numbers in `StyleSheet`, with a `SPACE` constant map if repeated.

## Components

- (c): none new; `components/icons/*` generated by CLI.
- (d): `components/AppText.tsx` (RN `Text` + Inter + palette color prop), `components/AppButton.tsx`
  (Pressable, two sizes), `src/theme/palette.ts` (`usePalette()` from `useColorScheme`). Reuse
  `AppSheet`, `HeaderMenuButton`, settings wrappers unchanged.

## Related tasks

- `docs/product/expo-rn-sdk-58-upgrade/upgrade-to-expo-sdk-58-and-react-native-0-88.md` — in
  flight; keeps Tamagui 2.4.2; open question 2 and follow-up "Tamagui 3 migration" point here.
  Item D5 (web remnants) overlaps with D2.
- `docs/product/tamagui-2-upgrade/*`, `tamagui-config-v5/`, `tamagui-native-teleport/` — history
  of how the current setup came to be (Teleport was added for Sheet/Toast, both since removed).

## Simplification ideas

- Stage 0 is a pure deletion: `tamagui.native.setup.ts`, `index.js`, 2 deps, `main` field.
- `TAMAGUI_IGNORE_BUNDLE_ERRORS` hack in `metro.config.js` disappears with the compiler (d).
- `Provider.tsx` loses `TamaguiWithSettings` (d); `GestureHandlerRootView` + Settings/History
  providers stay.
- `check:tamagui` / `generate:tamagui-css` scripts go (d) or `generate:tamagui-css` becomes
  `tamagui generate` (c) — or is deleted since web is not a target.

## Steps to implement

Stage 0 — remove dead native integration (S, independent of Q1; run after SDK 58 merge)

- [ ] Confirm no Tamagui portal component is used (`rg "Sheet|Dialog|Popover|Toast|Tooltip|Portal" app components src` → only Expo UI `BottomSheet`/`AppSheet`).
- [ ] Delete `tamagui.native.setup.ts` and `index.js`; set `package.json#main` to `expo-router/entry`.
- [ ] Remove `@tamagui/native` and `react-native-teleport` from `package.json`; `yarn install` (coordinate: SDK 58 agent owns `package.json`/`yarn.lock` until merged).
- [ ] Leave a note in `components/Provider.tsx` why no Teleport/gesture adapter is set up (portals unused; Expo UI sheets).
- [ ] `yarn typecheck && yarn lint && yarn jest && yarn check:tamagui`.
- [ ] Native module removed → `yarn prebuild:android` / `yarn prebuild:ios` as the soli-testing skill prescribes, then iOS sim (`yarn ios`) and Android release (`yarn release`) smoke: launch, board tap-to-move, undo scrubber, drawer, History list + detail sheet, Demo sheet, Settings. Sequential, never two builds at once.
- [ ] Update `docs/external-package-guides/tamagui-native.md` and `react-native-teleport.md` with a "removed 2026-xx-xx" note; update this plan's status.

Option (d) — Phase D1: app code off Tamagui (M)

- [ ] Baseline screenshots (light/dark) per UX section.
- [ ] Research `lucide-react-native` (web), write `docs/external-package-guides/lucide-react-native.md`, add the dep.
- [ ] `src/theme/palette.ts`: dump the 16 v5 theme keys for `light`/`dark` from `@tamagui/config/v5`, export `usePalette()`; comment the origin and the 2026-10-17 values.
- [ ] `assets/fonts/Inter-Medium.otf`, `Inter-Bold.otf` copied from `@tamagui/font-inter` (OFL); `app/_layout.tsx:30-31` `useFonts` paths updated; drop `@tamagui/font-inter` later in D2.
- [ ] `components/AppText.tsx` (`fontFamily: 'Inter' | 'InterBold'` from `fontWeight`, color from palette) and `components/AppButton.tsx` (Pressable; sizes 28/36 px; palette bg/border/text).
- [ ] Game path: `KlondikeGameView.tsx:62,78-93` (`YStack` → `View` + style with `gap`), `PileButton.tsx:52-55`, `TopRow.tsx:4,135,157,178,190,200,215,251,286`, `CardVisual.tsx:9,106-132,187-192,246`, `FoundationPile.tsx:4,106`, `UndoScrubber.tsx:11` (icons). Watch name clashes: these files already import RN `View`/`Text`.
- [ ] Navigation: `app/(tabs)/_layout.tsx:3-4,16-26` (palette + lucide), `AppDrawerContent.tsx:8-9,35,42`, `HeaderMenuButton.tsx:4,28-29`.
- [ ] Screens: `app/(tabs)/history.tsx` (imports L5-14; tokens L84,229-240,249-270,334,381-385,451-462,473-486; theme L148-155,218,347-361), `app/(tabs)/index.tsx` (L5,147,167-288,303-309,319,351-352), `app/(tabs)/hello.tsx` (L4,27-61), `app/+not-found.tsx` (L3,9-12), `CelebrationDebugBadge.tsx:3,31-41`.
- [ ] `components/Provider.tsx`: keep `TamaguiProvider` only while `FeatureGraphicScreen` still needs it (D1) — note it.
- [ ] Cheap gates; `yarn check:tamagui` still green (Tamagui still installed for the dev screen).
- [ ] iOS sim + Android release smoke per soli-testing skill, compare against baseline screenshots; fix drift.
- [ ] Update this plan (files actually modified, learnings).

Option (d) — Phase D2: remove Tamagui entirely (S-M)

- [ ] Decide Q5; if freeze: render the feature graphic once (dev route), save PNG to `assets/store/`, delete `src/dev/FeatureGraphicScreen.tsx` and its route/launcher references.
- [ ] Remove `TamaguiProvider` from `components/Provider.tsx`; delete `tamagui.config.ts`, `tamagui-web.css`, the import in `app/_layout.tsx:1`.
- [ ] `babel.config.js` → `presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]]` only; `metro.config.js` → `getDefaultConfig(__dirname)` only (drop `TAMAGUI_IGNORE_BUNDLE_ERRORS`).
- [ ] `package.json`: remove `tamagui`, `@tamagui/*` (6 left after stage 0 + font-inter), scripts `check:tamagui`, `generate:tamagui-css`; decide `react-native-web`/`yarn web`/`app/+html.tsx` (Q7).
- [ ] Cheap gates; Metro cache clear (`expo start -c`) on first run; iOS sim + Android release smoke.
- [ ] Docs: mark `tamagui*.md` guides as removed (keep for history), update AGENTS.md "Components" line to Expo UI + RN only (propose, do not silently change), update this plan.

Option (c) — Tamagui 3 on config v5 (M), only if Q1 = (c)

- [ ] Baseline screenshots. Confirm SDK 58 merged; confirm Metro version (`node -p "require('metro-resolver/package.json').version"`) is within `0.84-0.87`.
- [ ] `package.json`: `tamagui`, `@tamagui/config`, `@tamagui/colors`, `@tamagui/font-inter`, `@tamagui/cli`, `@tamagui/metro-plugin` → one `3.0.x`; add `@tamagui/helpers-icon`; remove `@tamagui/babel-plugin`, `@tamagui/lucide-icons-2`; `yarn install`; `npx tamagui check`.
- [ ] `babel.config.js`: delete the `@tamagui/babel-plugin` entry. `metro.config.js`: `withTamagui(config, { components: ['tamagui'], config: './tamagui.config.ts', logTimings: true, disableExtraction: process.env.NODE_ENV === 'development' })` (import from `@tamagui/cli/metro` or keep `@tamagui/metro-plugin`); keep `TAMAGUI_IGNORE_BUNDLE_ERRORS` until proven unnecessary.
- [ ] `tamagui.config.ts`: keep `@tamagui/config/v5`; animations from `@tamagui/config/animations-reanimated` (and `animations-css` under `isWeb` only if web stays).
- [ ] Icons: `npx @tamagui/cli icons add Atom Clock Settings Smile Star Lightbulb Shuffle Undo2 Ban RefreshCcw --out components/icons`; re-point imports in `app/(tabs)/_layout.tsx:4`, `AppDrawerContent.tsx:9`, `UndoScrubber.tsx:11`, `CardVisual.tsx:10`.
- [ ] Codemod: `npx @tamagui/codemod-flat-values --source-semantics v2-pixels --report flat-values-report.md ./app ./components ./src` (dry run, read report), then `--write`. Expected rewrites: `gap/px/py/pt/pb/p/mx/height` `"$n"` → `"n"` (`$2.5` → `"2.5"` on v5), `size="$3"` → `size="3"`, `color="$color10"` → `"color10"`, `bg="$color3"` → `"color3"`, `lineHeight={28}` → `"28px"` (`FeatureGraphicScreen.tsx:180` and the second site). Delete the report files afterwards.
- [ ] Manual: `FeatureGraphicScreen.tsx:5` `@tamagui/colors/legacy` → `@tamagui/colors` (or hardcode the 3 purple values); `FeatureGraphicScreen.tsx:291` `verticalPadding = '$4'` default string → `'4'`; verify `Image src={require(...)}` still types (`FeatureGraphicScreen.tsx:125`); `history.tsx:253` `Spinner size="small"` unchanged; `theme.*?.val` unchanged on v5 (verified keys).
- [ ] Scripts: `generate:tamagui-css` → `tamagui generate` or delete with `tamagui-web.css` (Q7).
- [ ] `yarn typecheck && yarn lint && yarn jest`, `npx tamagui check --strict`, `expo start -c` once.
- [ ] iOS sim + Android release smoke per soli-testing skill; compare screenshots (text sizes, pile labels, history tiles, demo sheet buttons, drawer tints).
- [ ] Refresh `docs/external-package-guides/tamagui.md` with the exact 3.0.x used; update this plan.

## Plan: Files to modify

Stage 0: `package.json`, `yarn.lock`, `index.js` (delete), `tamagui.native.setup.ts` (delete),
`components/Provider.tsx` (comment), `docs/external-package-guides/tamagui-native.md`,
`docs/external-package-guides/react-native-teleport.md`.

Option (d) D1: `src/theme/palette.ts` (new), `components/AppText.tsx` (new), `components/AppButton.tsx`
(new), `assets/fonts/*` (new), `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/history.tsx`,
`app/(tabs)/index.tsx`, `app/(tabs)/hello.tsx`, `app/+not-found.tsx`, `components/navigation/AppDrawerContent.tsx`,
`components/navigation/HeaderMenuButton.tsx`, `src/features/klondike/components/{KlondikeGameView,UndoScrubber,CelebrationDebugBadge}.tsx`,
`src/features/klondike/components/cards/{CardVisual,FoundationPile,PileButton,TopRow}.tsx`,
`package.json`, `docs/external-package-guides/lucide-react-native.md` (new).

Option (d) D2: `components/Provider.tsx`, `tamagui.config.ts` (delete), `tamagui-web.css` (delete),
`babel.config.js`, `metro.config.js`, `package.json`, `src/dev/FeatureGraphicScreen.tsx` (delete or
rewrite) + its route, `assets/store/feature-graphic.png` (new), `app/+html.tsx`/web bits (Q7).

Option (c): `package.json`, `yarn.lock`, `babel.config.js`, `metro.config.js`, `tamagui.config.ts`,
`components/icons/*` (generated), the 9 token-bearing files listed in the inventory,
`src/dev/FeatureGraphicScreen.tsx`, `docs/external-package-guides/tamagui.md`.

## Files actually modified

- `docs/product/tamagui-3-upgrade/tamagui-major-upgrade.md` (this plan, new)
- `docs/external-package-guides/tamagui.md` (2026-10-17 Tamagui 3 facts section)

## Intermediary learnings

- `@tamagui/lucide-icons-2` has no 3.x release (only `3.0.0-beta.*`); v3 dropped the package in
  favor of CLI-generated icons. `@tamagui/babel-plugin` likewise stops at 2.7.7.
- Tamagui 3's frozen v5 pack keeps un-hyphenated theme keys (`color10`, `red10`, `accent10`,
  `yellow11`, `green3`) and exposes `borderColor` under both spellings — so `useTheme()` call
  sites survive (c) untouched. Only v6 renames/compresses the ramp.
- `@tamagui/config@3` v5 entry still wires `@tamagui/shorthands/v4` (`items`, `justify`, `self`,
  `rounded`, `maxW`), so (c) on v5 does not need a shorthand rename; v6 would.
- The v3 Metro plugin hard-fails outside `metro-resolver` `0.84-0.87` (regex in
  `dist/cjs/metroResolver.cjs:111`). Expect the same dance at SDK 59.
- tamagui.dev's upgrade guide page is truncated at ~22.5k chars when fetched; the complete v2→v3
  checklist lives in `@tamagui/cli@3.0.18/src/migrate.ts` (printed by `tamagui migrate --from v2`).
- `@tamagui/native` and `react-native-teleport` serve only Tamagui portals/Sheet; Soli's sheets
  are Expo UI since the demo-sheet cleanup, so both are unused today.

## Identified issues

- Tamagui 2.x unmaintained on RN 0.88/Metro 0.87 (upstream v2 ended 2026-08-15) — open; mitigated
  by SDK 58 smoke; resolved by (c) or (d).
- `@tamagui/colors/legacy` existence in 3.x unverified (`npm view exports` empty) — verify at
  typecheck in (c); dev-only impact.
- `Image src={require()}` typing in `@tamagui/image@3` unverified — verify at typecheck in (c).

## Testing

- Cheap gates for every stage: `yarn typecheck && yarn lint && yarn jest`; `yarn check:tamagui`
  while Tamagui is installed (`npx tamagui check --strict` on v3).
- Device: iOS simulator (`yarn ios`) and Android release (`yarn release`) per
  `.agents/skills/soli-testing/SKILL.md`, sequential. Smoke script: launch (fonts/splash),
  board tap-to-move + stock draw, undo scrubber pan, drawer (tints, Star icon), History list
  (status colors, tiles) + detail sheet, Demo sheet (dev build), Settings, light + dark. Compare
  with baseline screenshots; expect pixel parity except where a step documents a change.
- Stage 0 and D2 remove native code → fresh prebuild/clean build before smoke.

## Follow-ups

| Item | Pros | Cons | Recommendation |
| --- | --- | --- | --- |
| Embed Inter via `expo-font` config plugin (SDK 58 plan C4) | fonts ready at launch, drop splash gating | iOS PostScript naming mapping | After D1, same files touched |
| Remove web remnants (SDK 58 plan D5) | -40 LOC, -`react-native-web` | none if web is truly not a target | Fold into D2 |
| AGENTS.md "Components" rule → "Expo UI for native controls, RN StyleSheet otherwise" | matches reality after D2 | — | Propose when D2 lands |
| If (c) chosen: evaluate config v6 later | Tailwind scale, 11-step ramp | visual remap, shorthand rename | Only if a redesign is wanted |
