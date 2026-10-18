# Tamagui Removal (option d), Web Removal, Componentization

Research 2026-10-17, decided and planned 2026-10-18. Plan only — no packages or source changed yet.
Options (a)/(b)/(c) below are **superseded** by Karim's decision (prompt 3): remove Tamagui
completely, remove the web target and the feature graphic, componentize the RN primitives.

## User prompt

```text
... and as a next big thing would it make sense to also look into the Tamagui major upgrade and what are like the benefits and cleanups and whatever the upgrade path thank you
```

```text
pls figure out how tamagui removal would look. really just buttons? would this make sense?
```

```text
hey, yes pls try this.
pls check where we can try expo UI things and can go closer to native.
Feature graphic: I dont actively use this, but it's just there. havent used in a year, but might need to update at some point. can also make it unusable or plain html or whatever. actually, can fully remove and if we ever need again figure out what we do. might be a few years or never.
dont need the game itself on web.

make sure to componentize everything.

so we still have the font of the cards, just the cards 100% the same on every device?
```

```text
Hey, can you do a before and after screenshot of the glyphs and icons and question why did you need to change them at all? Thank you 

What other potential changes, differences, layout changes, styling changes, etcetera? Should I have an eye on? Like is there something that's potentially weird or different or like what are the things I should focus on while testing and getting a feeling? 

I just saw your before and after off the icons. I'm a bit torn because like I don't like the thicker lines but I kind of do think some icons are more appropriate, but also I'm not sure what are the options here. Can you do like a deep dive with a subagent Like what do others do for play for history I guess the settings thing is pretty clear and I think the rating is also pretty clear But like which icon pack is this or like what did you change by the way? What's like best thing and like does it make sense to like have the width of the lines as before and like I don't know. Can we do like a best thing here? Thank you.
```

```text
Hey, can you please take the screenshots in the context on the phone? I feel like I kind of potentially like the changes on iOS. on Android I'm like medium sure I like the icons but if that's like the native look and feel maybe I should just embrace it and I definitely like the smiley more and just moving to the play makes a lot of sense definitely like moving to the play icon instead of that atom icon. I don't know the star and settings I'm like I find a bit weird and the history as well it's like a bit too markant but maybe that's just the style that's right what you think I mean also Lucy stays an option potentially are there like alternatives what's like your ultimate recommendation like please with like screenshots from the app so I can really fully imagine it and one thing I struggle a little bit in the menu header there's like a burger icon and instead really how the iOS icon looks because it looks like very flat and squished. And I'm used to this being a little bit like taller but, maybe I'm just wrong. I'm not like super an expert of IOS Icons. What do you think? Thank you.
```

```text
Hey, not sure what like your final recommendation is so is that SF menu thing just the way it looks normally on iOS then I think we should keep it let's go with fully native I think on iOS the native so the first one and on Android the native light and I have one question for the play should we maybe use something different because the triangle is very small on Android but could be b on both Android and iOS it could be like a card maybe to play or what other options do we have? And then also for the burger go like fully fully native, yeah what so also for the burger what I'm not fully sure about is the new game thingy, can you also do a comparison left right? Especially for Android. Before we had a button, now it's just text like more similar to iOS, but it's a little bit less prominent, but maybe it's also just because I'm not used to it at all. please also to this left right and like yeah I think do like a complete thing for everything for now I just kind of have to search my information and where I and what like a complete you, know comp,arison so that I can easily see the different options that we still have. Thank you.
```

```text
Hey, new game keep iOS as current and Android as material option. Question there that will leave it the same height like the status bar that doesn't change status bar height, right? for iOS I have one big thing. Hey the text in the menu is that not aligned anymore? That is kind of weird or was it also not aligned before? And should it be? I think it should personally, but w what's the thing here? How can we manage this? I think the play icon on Android is just too small like you see that as well, but I do like the triangle is it possible to just make the triangle larger like manually like i feel like you know the target group is also a little bit old people and I wouldn't do like a PlayStation hand whatever and so preferably the play a bit larger so it nits the other icons maybe you can measure this do you need anything else for me or is it like pretty clear
```

```text
Hey, I'm gonna leave this up to you and make all the icons just like visually look good and proportional to each other. Measure this figure it out by the way I have currently on my Android phone or Or before the demo and new game buttons were kind of light green, which I kind of enjoyed. like I don't know at some point you installed this. I thought that was kind of nice. Should we go with this? What do you think? and I guess also like the icon sizes for iOS just make them look good and proportional. I don't know what like the exact measurements should be, I trust you here, but like with deep look, thank you.
```

```text
Yes, fix the iOS dark-mode face.smiling rendering so it matches the outlined look in light mode, and verify on the simulator.
```

## Summary

Status 2026-10-18, late night (prompt 9): **iOS dark-mode `face.smiling` fixed — outline in
both schemes, verified on the sim, nothing committed.** Root cause: the system symbol catalog
ships a dark-appearance rendition for the 69 "inverse-pair" symbols and `face.smiling`'s dark
rendition is the filled face (Expo UI is not involved; rendering mode/variant knobs do not
change it). Fix: `NativeIcon` pins every glyph to the light scheme with Expo UI's
`environment({ key: 'colorScheme', value: 'light' })` modifier on iOS (colour stays explicit,
`color` now required). Light mode pixel-identical (0 differing px), dark changes only the Hello
glyph (ink 3802 → 1505 px², = light), label x unchanged. Details: "iOS dark-mode
`face.smiling` (prompt 9)" + Testing entry. Earlier status follows.

Status 2026-10-18, night (prompt 8): **drawer glyphs optically balanced on both platforms and
the Android header buttons back on the Material You default tint, verified on both devices,
nothing committed.** Mechanism: `DRAWER_ICONS` entries carry a per-platform `scale` that
`NativeIcon` applies to the glyph only (slot stays 24 → labels and row height unchanged, label x
identical before/after on both platforms). Factors from measured ink boxes + a documented
rule (perceived size = √(height × √silhouette), the midpoint between Material's keyline
shapes and equal extent): iOS Play 1.2 (53×59 → 64×71 px, the circles' height); Android Play
1.3 (36×45 → 45×57 px), History 1.125 (45 → 51 px), Star 1.167 (45×43 → 54×50 px); everything
else 1. Android header: `colors` removed → `secondaryContainer` of the Host's dynamic scheme
(API 31+, wallpaper-derived sage green on Karim's phone, 7.3:1 contrast light and dark;
baseline M3 purple below API 31; same scheme as the Settings controls). Gates green
(45 suites / 458 tests), smoke green on both platforms. Details: "Optical balance + Android
dynamic colour (prompt 8)" + the two prompt-8 Testing entries. Earlier status text follows.

Status 2026-10-18, late evening (prompt 7): **icon/header decisions implemented and verified on
both devices, TEMP picker removed, nothing committed.** iOS header = router text action
(unchanged), Android header = native Material 3 `FilledTonalButton` in neutral greys
(`HeaderActionButton` + `.android.tsx`), header height unchanged (294 px board top before/after
on the phone, status bar untouched). Drawer glyphs sit in a fixed `size`×`size` slot inside
`NativeIcon`, which fixes the iOS label misalignment (spread 9.7 pt → 0.7 pt; Android was
already aligned). Android Play triangle enlarged by cropping the vendored XML viewport
(ink 9.5×11.8 dp → 13.7×17.1 dp ≈ the other glyphs); iOS `play.fill` left as is (0.80× the
others' height, filled). Gates green (45 suites / 458 tests), smoke green on both platforms.
Details: "Final decisions, implemented (prompt 7)" + the two "Final verification" Testing
entries. Earlier status text follows.

Status 2026-10-18, end of day: **Phases 0–7 DONE, nothing committed.** Phase 6 device
verification (testing sub-agent) on the Android phone (fresh prebuild, Gradle 4:21) and the iOS
sim (clean build 9:28): every board shot is pixel-identical to the pre-removal baseline (Android:
only the header's Demo/New Game text actions differ, as intended; iOS: 0–24 px), Settings and
Hello 0 px, drawer glyphs changed by design, 10-game playlists 10/10 on both with clean logs,
RAM unchanged (Android PSS 166 restart / 329 MiB after 10 games). Two removal-caused deltas were
found and fixed by the tester: `AppButton` colours (Tamagui's `Button` used the `surface2`
component theme: 85 %/14 % grey, not the base 97 %/8 %) and `AppText body` (default `Paragraph`
rendered 17/22 on device, not the token dump's 15/23 — root cause inside Tamagui unexplained,
flagged). Pre-existing, unrelated: the dev Demo sheet's invisible labels/overflow (Expo UI sheet).
Stale `.tamagui/` compiler cache (previously ignored) deleted. Earlier status text follows.

Status 2026-10-18 (implementation, Phases 1–5 + Phase 7 docs DONE by the implementation
sub-agent; Phase 0 baselines by the testing sub-agent; Phase 6 device verification pending):
Tamagui, Teleport, the web target and the feature graphic are gone from the working tree
(nothing committed). `package.json#main` is `expo-router/entry`, Babel is preset-only,
`metro.config.js` is deleted. New: `src/theme/tokens.ts` (PALETTE/usePalette/SPACE),
`components/{AppText,AppButton,NativeIcon}.tsx`, `components/navigation/{HeaderTextButton,
drawerIcons}.ts(x)`, `lucide-react-native@1.50.0` (+ guide). Decisions applied: drawer glyphs
option A, board icons lucide, header New Game a11y unified to `Start a new game` (SKILL.md
updated), the 7 Tamagui/Teleport guides deleted. Gates green after every phase (45 suites /
458 tests). Deviations from the plan worth checking on device: `AppText` has a 4th `plain`
variant; `caption` is 14/23; History `ListSpacer` is 28 px (size token, not 7); Android's header
actions are now text (same as iOS) instead of Tamagui pills — an intended change.
Planning-era text below is kept for context.

- What goes: 9 Tamagui packages + `react-native-teleport` (native module), `tamagui.config.ts`,
  `tamagui-web.css` (350 KB), `tamagui.native.setup.ts` + custom `index.js` entry, the Babel and
  Metro plugins (`metro.config.js` can be deleted outright — its only remaining content is the
  Tamagui plugin and the web-only sqlite/wasm setup), `check:tamagui`/`generate:tamagui-css`,
  `src/dev/FeatureGraphicScreen.tsx` (1,007 LOC) + `app/feature-graphic.tsx` + `expo-linear-gradient`
  + `@tamagui/colors`, the web target (`react-native-web`, `react-dom`, app.json `web`, `yarn web`,
  `favicon.png`, `historyRepository.web.ts` + shim + `isHistorySupported` branches, the
  `Drawer.Protected` web guard). Net about -1,400 LOC of app code and -12 packages.
- What comes: `src/theme/tokens.ts` (the 19 v5 theme colors for light/dark + the 6 space values,
  dumped from the installed config, see UX), `components/AppText.tsx`, `components/AppButton.tsx`,
  `components/NativeIcon.tsx` (Expo UI `Icon` in a `Host`, shared by the header menu button and the
  drawer), `components/navigation/HeaderTextButton.tsx` (the iOS header text action, now on both
  platforms — the Android Tamagui `Button` header branch is deleted), `lucide-react-native` for the
  5 board icons.
- Expo UI audit result ("closer to native"): ADOPT now — Expo UI `Icon` for the drawer icons (same
  pattern as the hamburger), RN `ActivityIndicator` for the history spinner, RN `Alert` stays (already
  native). LATER — Expo UI `Button` inside the History sheet (SDK 58 fixed hosted-view touches in
  `BottomSheet`, but nested Host-in-RNHostView-in-Host is untested), Expo UI `List`/`ListItem` for
  History once it supports pagination. NO — anything on the board/scrubber/hint path, header text
  buttons (router `HeaderButton` already is the native bar-item pattern), Hello/+not-found text.
- Card font answer: cards are unaffected. Tamagui never touched the card font — see "Card font:
  what guarantees identical cards" below.
- Cost: one native rebuild on both platforms (Teleport removal) and one screenshot-comparison smoke.

## Description

Soli is a native-only Expo SDK 58 / RN 0.88 / React 19.3 app. It adopted Tamagui 2 in June 2026,
bumped to 2.4.2 in July; since then Settings, the header icon and both sheets moved to Expo UI, and
the game board was always RN `StyleSheet`. Tamagui's remaining job is "RN `View`/`Text` with tokens
plus a `Button`" on 16 files, and every Expo SDK bump carries a Tamagui/Metro compatibility tax
(v2 unmaintained since 2026-08; v3's Metro plugin version-gates every SDK).

Decision (prompt 3): remove Tamagui entirely, componentize the RN primitives in `components/`,
use Expo UI where a native Host fits, drop the web target (it only existed for Tamagui web and the
feature graphic, which Karim has not used in a year), and delete the feature graphic (recoverable
from git history if ever needed again).

Why this is nice: one fewer major-upgrade tax per SDK, a native module and a compiler out of the
build, two mental models instead of three (RN StyleSheet + Expo UI), honest dependency list,
AGENTS.md's "native-only" statement becomes literally true.

## Card font: what guarantees identical cards (answers prompt 3's question)

Today, independent of Tamagui:

- The three card glyph `Text`s in `CardVisual.tsx` (corner rank, corner suit, center suit) request
  `fontFamily: 'CardTextAndroid'` with weights 700/600/600 and `allowFontScaling={false}`
  (`cards/fonts.ts`). The family is three tracked TTFs in `assets/fonts/` embedded on BOTH platforms
  by the `expo-font` config plugin in `app.json` (Android: weighted XML font family registered via
  `ReactFontManager` in `MainApplication.kt`; iOS: `UIAppFonts` in `Info.plist`). No device font is
  ever consulted, so Samsung/Pixel/iPhone all draw the same glyph outlines.
- Geometry is identical too because the font files themselves were normalized
  (`docs/product/generated-native-card-fonts/deterministic-card-fonts-everywhere.md`,
  `scripts/patch-card-font-metrics.py`): `hhea` ascent/descent = `head` bbox = 1082/-278 so Android
  (which positions the first line from the font bbox) and iOS (CoreText, from `hhea`) agree, and all
  four suit advances = 1275 so the centered suit ink lands in the same spot. Verified on device
  2026-07-04 (both platforms within about 1 px of the reference).
- What still differs per device, by design: the card's size (font sizes scale with
  `cardScale = width / CARD_REFERENCE_WIDTH`, so a wider phone draws proportionally bigger text) and
  the rasterizer (Skia on Android vs CoreText on iOS anti-alias slightly differently). "100% the
  same" = same glyphs, same proportions and placement; not bit-identical pixels across platforms.

What Tamagui contributes today: nothing to the cards. The `tamagui` `Text` only injects
`color: theme.color` (overridden by the explicit suit color) and passes `fontFamily` through
untouched — Tamagui's weight→face remapping only runs for its own font tokens (`$body`/`$heading`;
`getSplitStyles.native.js:623-631` checks `getFont(style.fontFamily)?.face`, which is undefined for
`CardTextAndroid`). The swap to RN `Text` is therefore style-identical; the before/after screenshot
step exists to prove it, not because a change is expected.

Finding (not Tamagui, not in scope, decide separately): the *empty foundation slot* suit glyph
(`FoundationPile` → `styles.foundationSymbol`), the stock "Draw N" label, the "N left" caption and
the empty-slot labels (`styles.cardBackText/cardBackCaption/emptyLabel`) do NOT set
`CardTextAndroid` — they render in the system font and so can vary by device. Listed under
Follow-ups.

## Expo UI audit: where Soli can go closer to native (prompt 3)

Verified against the installed `@expo/ui@58.0.20` sources (`src/universal/*`, `src/swift-ui/*`,
`src/jetpack-compose/*`). Universal set: `Host, Column, Row, Text, Button, ScrollView, Switch,
Slider, Checkbox, BottomSheet, Collapsible, FieldGroup, Icon, List, ListItem, Picker, RNHostView,
Spacer, TextInput`. Platform-only extras worth knowing: SwiftUI `ContextMenu/Menu/Alert/
ConfirmationDialog/Link/Toolbar/NavigationStack`; Compose `DropdownMenu/AlertDialog/Snackbar/
Divider/IconButton/Card`.

| Surface | Today | Native candidate | Recommendation | Rationale / risk |
| --- | --- | --- | --- | --- |
| Play header: Android "New Game"/"Demo" | Tamagui `Button` ×2 (Android-only branch) | Router `HeaderButton` + `AppText` = the existing iOS `IOSHeaderTextAction`, shared as `HeaderTextButton` | **ADOPT** (shared component, deletes the platform fork) | `HeaderButton` already *is* the native bar-item pattern (UIBarButtonItem / app-bar text action look, platform press feedback). Expo UI `Button variant="text"` in a header `Host` was considered: NO — Material 3 app bars use icon actions, a Compose text button in the RN header buys nothing and adds a Host + sizing risk |
| Play header: hamburger | Expo UI `Icon` in `Host matchContents` (`HeaderMenuButton`) | — | keep; reuse via `NativeIcon` | Already native |
| Drawer items + icons | react-navigation drawer, `DrawerItemList`, lucide icons | Icons → Expo UI `Icon` (SF Symbols / `@expo/material-symbols`) via `NativeIcon`; drawer itself has no Expo UI equivalent (`NavigationSplitView` is iOS-only) | **ADOPT** icons; NO for replacing the drawer | Same mechanism as the hamburger, 5 Hosts in a non-hot overlay. Needs a glyph choice per item (Karim decision, see Open questions). Risk: Compose/SwiftUI view inside the JS drawer — low (header Host proves the pattern) |
| Hello screen | Tamagui `View/YStack/XStack/Paragraph/Anchor` | RN `View` + `AppText` + `Linking.openURL`. Expo UI universal `Text` lacks inline links (SwiftUI `Link` is iOS-only) | **NO** (RN) | Static copy with inline anchors; a Host would add nothing |
| History list + rows + stat tiles | RN `FlatList` + Tamagui stacks/text | Expo UI `List`/`ListItem` (native LazyColumn / SwiftUI List, `supportingText`, `trailing`, `onPress`) | **LATER** | `ListProps` has `onRefresh` only — no end-reached/pagination, and History pages 20 rows at a time; stat tiles + status colors are custom. Revisit when Expo UI `List` gets pagination. Now: RN + `AppText` + `usePalette()` |
| History spinner | Tamagui `Spinner` | RN `ActivityIndicator` (what Spinner wraps on native) | **ADOPT** | It is the native indicator |
| History sheet Retry/Share | Tamagui `Button` in `AppSheet` (RNHostView) | `AppButton` now; Expo UI `Button` inside the sheet later | **ADOPT** `AppButton`; LATER Expo UI | history.tsx:470 comment: Expo UI controls in the sheet had unreliable Android gestures. SDK 58 changelog fixed hosted-view touches in `BottomSheet`, but a Host nested inside `RNHostView` inside the sheet Host is untested — try after the removal, behind `AppButton`'s call sites |
| Demo sheet (dev) | 15 Tamagui `Button` + stacks | `AppButton` | **ADOPT** `AppButton`; NO Expo UI | Same sheet constraint; dev-only |
| Settings | Expo UI `FieldGroup` etc. | — | keep | Already native |
| Undo scrubber, Hint/New Game dock pills | RN `Pressable` + Reanimated + lucide | — | **NO** | Gesture-critical (pan inside `GestureDetector`); comment in `UndoScrubber.tsx` already bans Tamagui/Expo UI buttons here. Icons → `lucide-react-native` (no Host in the pan area) |
| Hint rings/ghost, notice bubbles, HUD | RN + Reanimated | — | **NO** | Board perf path |
| Celebration debug badge (dev) | Tamagui `YStack/Paragraph` over Skia | RN `View` + `AppText` | **NO** Expo UI | Dev overlay above the Skia canvas |
| `+not-found` | Tamagui `View/Text` | RN `View` + `AppText` | **NO** Expo UI | Trivial |
| Alerts (New game confirm, shared deal, reset Vegas total) | RN `Alert.alert` | SwiftUI `Alert` / Compose `AlertDialog` | **NO** | `Alert.alert` already shows UIAlertController / Material dialog |
| Toasts | none | Compose `Snackbar` (Android-only) | n/a | Provider.tsx comment: toasts removed on purpose |
| Board stacks (`KlondikeGameView`, `TopRow`, `PileButton`) | Tamagui `YStack/XStack/View` | RN `View` | **NO** Expo UI | Layout only |
| Card text | Tamagui `Text` + `CardTextAndroid` | RN `Text` | **NO** Expo UI | Pixel contract, see card-font section |

## Acceptance Criteria

- No `tamagui`, `@tamagui/*`, `react-native-teleport`, `react-native-web`, `react-dom`,
  `expo-linear-gradient` in `package.json`; `yarn install` clean; `npx expo install --check` and
  `npx expo-doctor` report nothing new. `package.json#main` = `expo-router/entry`; `index.js`,
  `tamagui.native.setup.ts`, `tamagui.config.ts`, `tamagui-web.css`, `metro.config.js`,
  `app/feature-graphic.tsx`, `src/dev/`, `src/storage/historyRepository.web.ts`,
  `assets/images/favicon.png` deleted; `babel.config.js` = `babel-preset-expo` only; app.json has no
  `web` block; no `yarn web`/`check:tamagui`/`generate:tamagui-css` scripts; `rg "tamagui|Tamagui"
  app components src test scripts` only hits explanatory comments.
- `rg "Platform.OS (!|=)== 'web'|\.web\.ts" app components src` → nothing.
- Every reused primitive lives in `components/`: `AppText`, `AppButton`, `NativeIcon`,
  `HeaderTextButton`; screens use them instead of styling raw `Text`/`Pressable` for the same job.
  `usePalette()` is the only source of theme colors outside the board constants.
- `yarn typecheck && yarn lint && yarn jest` green after every phase (Jest suite count unchanged:
  45 suites / 458 tests as of 2026-10-17, minus nothing).
- Visual parity (light + dark, Android phone + iOS sim) against the Phase 0 baseline: board
  **pixel-identical** (cards, pile labels, HUD, dock); history list, sheet, drawer, hello, demo
  sheet, header buttons within 1-2 px / same colors (documented deltas allowed only where a step
  says so, e.g. drawer glyphs).
- a11y/automation handles unchanged (see UX/UI): `history-retry`/`Retry this deal`,
  `history-share`/`Share this deal`, `Open navigation menu`, `undo`, `hint-button`,
  `new-game-button`, `celebration-debug-badge`, all `cards/accessibility.ts` handles. Header New
  Game: see Open question 3.
- Device smoke per `.agents/skills/soli-testing/SKILL.md` on both platforms (fresh prebuild — a
  native module is removed): launch, tap-to-move + stock draw/recycle, undo scrubber pan (Android),
  Hint button + bubble, drawer navigation (Play/Hello/History/Settings/Rate Soli), History list +
  preview sheet Retry + Share, Settings toggles + Reset Vegas total, Demo sheet, celebration preview
  + badge, 10-game playlist, dark mode.

## Possible approaches (research 2026-10-17, kept for context)

| | (a) Stay 2.4.2 | (b) Bump 2.7.7 | (c) Tamagui 3 on config v5 | (d) Remove Tamagui |
| --- | --- | --- | --- | --- |
| Effort | 0 | S | M (codemod ~60 sites, icons, Babel/Metro, 2-platform smoke) | L once (16 files, ~170 JSX sites) |
| Risk | unmaintained since 2026-08, unverified on Metro 0.87 | same EOL | 1-week-old major, Metro gate repeats every SDK | diff size; parity work |
| Benefit | — | last v2 fixes | supported line, -babel plugin, per-icon generation | -12 packages, -native module, -compiler, -custom entry, -350 KB CSS, one less upgrade tax per SDK |
| Verdict | not viable | bug-driven fallback only | **superseded** | **chosen (prompt 3)** |

Tamagui 3 facts that informed the decision (sources: tamagui.dev blog/docs, `@tamagui/*@3.0.18`
tarballs): 3.0.0 shipped 2026-10-10, 18 patches in 7 days; `@tamagui/metro-plugin@3` hard-gates
`metro-resolver` `0.84-0.87` (will need a new release for SDK 59); `$` sigil removed with no
runtime compatibility path; `@tamagui/babel-plugin` and `@tamagui/lucide-icons-2` have no 3.x;
v5 config stays available as a frozen pack. None of v3's headline features (native theme runtime,
conditional compilation, Tailwind) touches Soli's usage. Details of the superseded (c) migration
(codemod flags, icon CLI, file list) are in git history of this file (2026-10-17 version).

## Inventory: Soli's Tamagui usage (working tree 2026-10-18)

16 files import `tamagui`/`@tamagui/*`: `app/(tabs)/{_layout,hello,history,index}.tsx`,
`app/+not-found.tsx`, `components/Provider.tsx`, `components/navigation/{AppDrawerContent,HeaderMenuButton}.tsx`,
`src/dev/FeatureGraphicScreen.tsx`, `src/features/klondike/components/{CelebrationDebugBadge,KlondikeGameView,UndoScrubber}.tsx`,
`src/features/klondike/components/cards/{CardVisual,FoundationPile,PileButton,TopRow}.tsx`.

| Piece | Sites | Replacement |
| --- | --- | --- |
| `YStack`/`XStack`/`View` | board (`KlondikeGameView` ×2, `TopRow` ×4, `PileButton` ×1), screens, sheets | RN `View` + `StyleSheet` (`flexDirection: 'row'`, numeric `gap`/padding from `SPACE`) |
| `Text` (core + `color: $color` default) | cards ×3, `FoundationPile` ×1, `PileButton` ×1, history ×6, index ×2 | RN `Text` on the board (explicit styles); `AppText` elsewhere |
| `Paragraph` (15/23/400, `$color`) | hello ×4, history ×3, badge ×1 | `AppText` (default variant = Paragraph metrics) |
| `Anchor` ×2 | hello | `AppText` with `onPress={() => Linking.openURL(...)}` + link color |
| `Button` ×22 (`size="$3"`) | Android header ×2, history sheet ×2, demo sheet ×18 | `HeaderTextButton` (header) / `AppButton` (sheets) |
| `Spinner` ×1, `Separator` ×1 | history | `ActivityIndicator`, 1 px `View` |
| `useTheme()` (16 keys) | `_layout`, `history` ×3, `AppDrawerContent`, `HeaderMenuButton` | `usePalette()` |
| `$` tokens (~60 non-FG) | space `$1 $2 $2.5 $3 $4 $5`, colors `$color $color3 $color8 $color10 $blue10 $accent10`, size `$3` | `SPACE`, palette, `AppButton` |
| lucide icons ×10 | nav (Atom, Clock, Settings, Smile, Star), board (Lightbulb, Shuffle, Undo2, Ban, RefreshCcw) | nav → `NativeIcon`; board → `lucide-react-native` |
| `TamaguiProvider`, config, CSS, Babel/Metro plugins, teleport setup, scripts | infra | delete |

### Exactly what Tamagui injects on native (so the RN replacements reproduce it)

Read from the installed 2.4.2 sources (`tamagui/dist/esm/views/Text.mjs`, `@tamagui/text` SizableText/
Paragraph, `@tamagui/button/dist/esm/Button.mjs`, `@tamagui/get-button-sized`, `@tamagui/get-font-sized`,
`@tamagui/separator`, `@tamagui/spinner`, `@tamagui/web/dist/esm/helpers/getSplitStyles.native.js`,
`@tamagui/config/v5` dumped with `node -e`):

| Component | Injected on native | RN equivalent |
| --- | --- | --- |
| `View`/`YStack`/`XStack` | nothing but `flexDirection` (`column`/`row`); `collapsable: false` only when press handlers exist | RN `View` |
| `Text` (`tamagui`) | `color: theme.color` (light `hsla(0,0%,2%,1)`, dark `hsla(0,0%,100%,1)`); no fontFamily/size/lineHeight; `userSelect` prop → `selectable` | RN `Text` + `color: palette.color` where no explicit color is set (cards/pile label set their own) |
| `Paragraph` | `fontFamily: 'System'`(= RN default), `fontSize 15`, `lineHeight 23`, `fontWeight '400'`, `color: theme.color`, `userSelect: auto`. With `fontSize={14}` prop the numeric size wins but the `lineHeight 23` from `size="$true"` most likely stays → verify on the history metadata line (accept ≤ 2 px) | `AppText` default variant: 15/23/400 |
| `Button` (`size="$3"`) | frame: `height 36`, `paddingHorizontal 13`, `borderRadius 7`, `gap 13`, `backgroundColor theme.background` (light 97 %, dark 8 % gray), `borderWidth 1`, `borderColor transparent`, press: `backgroundColor theme.backgroundPress` (light 93 %, dark 4 %) + `borderColor theme.borderColorHover`; `role="button"` + `tabIndex 0` → `accessible` + `accessibilityRole="button"`; `disabled` → `pointerEvents none`. Text: `fontSize 14`, `lineHeight 21`, `fontWeight '400'`, `color theme.color`, `flexShrink 1`, `numberOfLines 1`-style ellipsis, `userSelect none` | `AppButton` |
| `Separator` | `borderBottomWidth 1`, `borderColor theme.backgroundFocus` (light 93 %, dark 10 % gray — NOT `borderColor`), `height 0`, `flex 1`, `translateY -0.5` | `View` 1 px high, `backgroundColor: palette.backgroundFocus` |
| `Spinner size="small" color="$color10"` | RN `ActivityIndicator` with resolved color | `ActivityIndicator size="small" color={palette.color10}` |
| `Anchor` | `Text` + `Linking.openURL(href)` on native | `AppText onPress` |
| fontFamily handling | passthrough unless the family is a Tamagui font token | n/a for `CardTextAndroid` |

## Open questions to the user

| # | Question | Options | Recommendation |
| --- | --- | --- | --- |
| 1 | Drawer icon glyphs once they are SF Symbols / Material Symbols (lucide `Atom` has no native twin) | A: Play `play.fill`/`play_arrow.xml`, Hello `face.smiling`/`mood.xml`, History `clock`/`history.xml`, Settings `gearshape`/`settings.xml`, Rate `star`/`star.xml` (all verified present in `@expo/material-symbols/icons`; SF names standard). B: Play `suit.spade.fill`/`playing_cards.xml` (card-themed). C: keep lucide in the drawer too (one icon system, zero glyph change) | **A** — plainest native look; B if you want the card theme. Proceeding with A |
| 2 | Board icons: `lucide-react-native` (new dep, same glyphs) vs inline SVG paths for the 5 icons (no dep, ~40 LOC) vs Expo UI `Icon` Hosts on the board | lucide: drop-in parity, ISC, peer `react-native-svg ^15` already installed. Inline: no dep but hand-copied paths. Expo UI: Hosts inside `GestureDetector`/pressable pills — gesture risk | **lucide-react-native**, pinned to a release ≥ 2 weeks old at implementation time (1.59.0 is from 2026-10-17; releases are daily) |
| 3 | Android header "New Game" a11y handle: today Android automation uses the button text `New Game`, iOS the label `Start a new game` (SKILL.md matrix). With one `HeaderTextButton` on both platforms the label becomes `Start a new game` everywhere | A: unify to `Start a new game` and update the SKILL.md row (+ `Demo` keeps its text). B: `accessibilityLabel={Platform.OS === 'ios' ? … : undefined}` to keep the Android text handle | **A** — one handle, one line in the skill; B is a platform fork kept only for a test recipe |
| 4 | Tamagui/teleport package guides (`tamagui*.md` ×6, `react-native-teleport.md`) | delete (git history keeps them) vs. keep with a "removed" banner | **delete** — guides are a cache for packages in use; this plan records the removal |
| 5 | Empty-foundation suit glyph + stock labels use the system font (finding above) | switch to `CardTextAndroid` for device-independence vs leave | separate tiny task after this lands (Follow-ups); not folded in to keep the pixel-parity goal clean |

## Dependencies

- Add: `lucide-react-native` (peer `react-native-svg ^15` → have 15.16.0; ISC). Research + write
  `docs/external-package-guides/lucide-react-native.md` (date-stamped, API: named icon imports,
  props `size`, `color`, `strokeWidth`, `absoluteStrokeWidth`; tree-shaken per import) BEFORE use.
- Remove: `tamagui`, `@tamagui/colors`, `@tamagui/config`, `@tamagui/lucide-icons-2`,
  `@tamagui/native`, `@tamagui/babel-plugin`, `@tamagui/cli`, `@tamagui/metro-plugin`,
  `react-native-teleport`, `react-native-web`, `react-dom`, `expo-linear-gradient`.
- Keep `@expo/metro-runtime` (devDependency): `expo-router/entry-classic` imports it
  unconditionally as its first line (web Fast Refresh shim, no-op on native) and expo-router lists it
  as a required peer. Keep `@expo/material-symbols` (drawer icons), `react-native-svg` (lucide +
  Skia), `expo-font` (card fonts plugin).
- Web-only peers verified safe to drop: `react-dom` is an *optional* peer of `expo`, `expo-router`,
  `@expo/ui`, `@expo/metro-runtime`; `react-native-web` an optional peer of `expo`/`expo-router`.
  `rg react-dom` over the non-`.web.js` builds of expo-router/@expo/ui/@expo/metro-runtime finds
  only `ServerContainer.js` and `static/registerRootComponent.js` (web static rendering, never
  bundled for native). `jest-expo` pulls its own `jest-environment-jsdom`; the preset used
  (`jest-expo` default) resolves `.native`/`.ios` files, never `.web` (that is why
  `historySeeds.test.ts` already lands on `historyRepository.native`).
- Guides touched: `expo-ui.md` (NativeIcon + audit outcome), `expo-router.md` (HeaderTextButton note),
  `expo-sqlite.md` (drop the web-setup section), `react-native.md` (AppText/AppButton defaults),
  `expo.md`/`expo-font.md` unchanged.

## UX/UI Considerations

- Parity, no redesign. Phase 0 captures baselines (light + dark, both platforms): board fresh deal,
  board with recycle + Vegas "N left", drawer open, Hello, History list, History sheet, Settings,
  Demo sheet, celebration badge. Screenshots go to `.test-artifacts/tamagui-removal/<platform>/before|after/`.
- Palette (`src/theme/tokens.ts`), dumped 2026-10-18 from `@tamagui/config/v5` themes `light`/`dark`
  — commit these literals with a comment pointing here:

  | key | light | dark |
  | --- | --- | --- |
  | color | `hsla(0, 0%, 2%, 1)` | `hsla(0, 0%, 100%, 1)` |
  | background | `hsla(0, 0%, 97%, 1)` | `hsla(0, 0%, 8%, 1)` |
  | backgroundPress | `hsla(0, 0%, 93%, 1)` | `hsla(0, 0%, 4%, 1)` |
  | borderColor | `hsla(0, 0%, 85%, 1)` | `hsla(0, 0%, 14%, 1)` |
  | borderColorHover | `hsla(0, 0%, 93%, 1)` | `hsla(0, 0%, 20%, 1)` |
  | color3 | `hsla(0, 0%, 93%, 1)` | `hsla(0, 0%, 10%, 1)` |
  | color4 | `hsla(0, 0%, 85%, 1)` | `hsla(0, 0%, 14%, 1)` |
  | color7 | `hsla(0, 0%, 59%, 1)` | `hsla(0, 0%, 40%, 1)` |
  | color8 | `hsla(0, 0%, 45%, 1)` | `hsla(0, 0%, 47%, 1)` |
  | color10 | `hsla(0, 0%, 20%, 1)` | `hsla(0, 0%, 67%, 1)` |
  | color11 | `hsla(0, 0%, 14%, 1)` | `hsla(0, 0%, 80%, 1)` |
  | red10 | `#dc3e42` | `#ec5d5e` |
  | blue10 | `#0588f0` | `#3b9eff` |
  | green3 / green7 / green10 / green11 | `#e6f6eb` / `#8eceaa` / `#2b9a66` / `#218358` | `#132d21` / `#28684a` / `#33b074` / `#3dd68c` |
  | yellow3 / yellow7 / yellow11 | `#fffab8` / `#e4c767` / `#9e6c00` | `#2d2305` / `#665417` / `#f5e147` |
  | accent10 | `hsla(0, 0%, 67%, 1)` | `hsla(0, 0%, 20%, 1)` |
  | backgroundFocus (Separator hairline) | `hsla(0, 0%, 93%, 1)` | `hsla(0, 0%, 10%, 1)` |

  Space tokens: `$1`=2, `$2`=7, `$2.5`=10, `$3`=13, `$4`=18, `$5`=24. Size `$3`=36, `$2`=28. Radius
  `$3`=7. Keep the existing hex fallbacks in `history.tsx` as a cross-check while editing, then
  delete them (the palette is the single source).
- Pressed states: `AppButton` reproduces Tamagui's press (background → `backgroundPress`, border →
  `borderColorHover`); `HeaderTextButton` keeps `pressOpacity 0.65`; `HistoryListItem` keeps its
  `opacity 0.7`.
- Dark mode: everything theme-driven goes through `usePalette()` (reads `useColorScheme()` like
  `Provider.tsx` did), so OS scheme changes keep working without Tamagui's provider; the drawer/header
  colors in `(tabs)/_layout.tsx` read the same palette.
- a11y/testIDs used by automation (SKILL.md §5 and `scripts/ios-scrub.js`) must survive the swap:
  `AppButton` forwards `accessibilityLabel`/`testID` and sets `accessibilityRole="button"`
  (`history-retry`/`Retry this deal`, `history-share`/`Share this deal`); `HeaderMenuButton` keeps
  `Open navigation menu`; dock pills keep `undo`/`hint-button`/`new-game-button` + labels; badge keeps
  `celebration-debug-badge`; board handles live in `cards/accessibility.ts` (untouched). Header New
  Game: Open question 3.
- Tamagui `Button` set `accessible` + role button; `AppButton` must too (Pressable with
  `accessibilityRole="button"`), otherwise the Android a11y tree loses the sheet buttons.
- Drawer icons change glyph (SF Symbols / Material) — the only intended visual change; `color` and
  `size` come from react-navigation's `drawerIcon({ color, size })` and are passed to `Icon`.

## Components

New, all in `components/`:

| Component | API | Notes |
| --- | --- | --- |
| `src/theme/tokens.ts` | `export const PALETTE: Record<'light' \| 'dark', Palette>`; `export const usePalette = (): Palette => PALETTE[resolveThemeName(useColorScheme())]`; `export const SPACE = { 1: 2, 2: 7, 2.5: 10, 3: 13, 4: 18, 5: 24 } as const` | Values + origin comment (table above). Lives next to `src/theme/index.ts` |
| `components/AppText.tsx` | `({ variant = 'body', color, style, ...rnTextProps }: TextProps & { variant?: 'body' \| 'caption' \| 'title'; color?: string })` → RN `Text` with `color ?? palette.color`. `body` = 15/23/400 (Paragraph), `caption` = 14/21 muted `color10`, `title` = 16/700 (history row/sheet title). Explicit `style` always wins | Replaces `Paragraph`, non-board `Text`, `Anchor` (pass `onPress`). Keep variants to these three — add one only when a third call site needs it |
| `components/AppButton.tsx` | `({ label, onPress, disabled, accessibilityLabel, testID, style }: …)` → `Pressable` 36 px, `paddingHorizontal 13`, `borderRadius 7`, bg `palette.background`, pressed bg `palette.backgroundPress` + border `borderColorHover`, `accessibilityRole="button"`, text 14/21/400 `palette.color`, `numberOfLines={1}`; `disabled` → `opacity 0.5` (history's explicit opacity moves inside) | One size only (every current site is `size="$3"`); `style` for `flex: 1` |
| `components/NativeIcon.tsx` | `({ name, color, size }: { name: IconName; color?: ColorValue; size?: number })` → `<Host matchContents><Icon name color size /></Host>` wrapped in `View pointerEvents="none"` | Used by `HeaderMenuButton` (replaces its inline Host) and `AppDrawerContent`/`(tabs)/_layout.tsx` via `Icon.select` constants in `components/navigation/drawerIcons.ts` |
| `components/navigation/HeaderTextButton.tsx` | `({ label, onPress, accessibilityLabel }: …)` → router `HeaderButton` (`pressOpacity 0.65`, `minHeight 44`, `paddingHorizontal 6`) + `AppText` 17/400 `palette.color` | Moves `IOSHeaderTextAction` + its constants out of `index.tsx`; used on both platforms; `HeaderActions` row (`gap 4`) stays in `index.tsx` |

Reused unchanged: `AppSheet`, `components/settings/*`, `HeaderMenuButton` (minus Tamagui).
Deliberately NOT created: a `Stack`/`Row` wrapper (RN `View` + `flexDirection` is the default; a
rename-only wrapper adds a layer), a `Card`/tile component (history row card and stat tiles are
single-use StyleSheet entries), a board icon wrapper (`lucide-react-native` imports already carry
`size`/`color` defaults).

## Related tasks

- `docs/product/expo-rn-sdk-58-upgrade/upgrade-to-expo-sdk-58-and-react-native-0-88.md` — D5 kept
  web as a dev tool on 2026-10-17; **superseded** by this plan (web removed, feature graphic
  deleted). C4 (fonts) stands. Add a one-line pointer there when this lands.
- `docs/product/store-screenshots/store-screenshots.md` — add the note: "Play Store feature graphic
  generator (`src/dev/FeatureGraphicScreen.tsx`, web-only) removed 2026-10-18; recover from git
  history (commit before the removal) if a new feature graphic is ever needed."
- `docs/product/tamagui-2-upgrade/*`, `tamagui-config-v5/`, `tamagui-native-teleport/` — history.
- `docs/product/generated-native-card-fonts/` — card font contract (unchanged by this work).

## Simplification ideas

- Delete `metro.config.js` entirely (Expo default config is used when the file is absent); keep a
  3-line `babel.config.js` (jest-expo's transform reads the project Babel config).
- `isHistorySupported` and its 6 guards in `src/state/history.tsx` disappear with the web stub
  (`historyRepository.native.ts` → `historyRepository.ts`, shim deleted). The two storage tests
  then import `historyRepository` directly.
- `Provider.tsx` shrinks to `GestureHandlerRootView` + `SettingsProvider` + `HistoryProvider`;
  `app/_layout.tsx` loses the CSS import.
- `.gitignore` loses `.tamagui`; `app.json` loses `web` and `assets/images/favicon.png` goes.
- `index.tsx`: the Android/iOS header branch collapses to one `navigation.setOptions` call
  (`headerTitleAlign: 'center'` + title style stay iOS-only via `Platform.select`, as today).

## Steps to implement

Phase 0 — baseline (testing sub-agent, no code change; sequential builds)
- [x] Read `.agents/skills/soli-testing/SKILL.md`. Confirm the installed builds match HEAD (or build
      `yarn release` then `yarn ios`). Capture the baseline screenshot set (UX section) light + dark on
      Android phone and iOS sim into `.test-artifacts/tamagui-removal/<platform>/before/`.
      DONE 2026-10-18 (testing sub-agent, no builds — the installed pre-removal binaries ARE the
      baseline: Android versionCode 16 / iOS build 15, both 1.1.0, both installed 2026-10-17 22:3x).
      52 PNGs + a11y dumps + the two capture scripts + `README.md` (exact deep links, step list,
      masks, quirks) live in the session scratchpad
      `/private/tmp/claude-501/-Users-karim-kDrive-Code-soli/e556fc7d-e961-4edb-a0fa-e66237d73ad4/scratchpad/tamagui/baseline/`
      (NOT `.test-artifacts/` — copy them there before Phase 6 if they should outlive the session).
Phase 1 — foundations (implementation sub-agent) — DONE 2026-10-18
- [x] Research `lucide-react-native` (web), write `docs/external-package-guides/lucide-react-native.md`,
      `yarn add lucide-react-native@1.50.0` (published 2026-10-02, 16 days old; glyph paths diffed
      against `@tamagui/lucide-icons-2@2.4.2` — identical, see the guide).
- [x] `src/theme/tokens.ts` (PALETTE, usePalette, SPACE) with origin comment. Values re-dumped from
      the installed v5 config and match the UX table. `SPACE` has no `2.5` key — `$2.5` was only
      used by the feature graphic.
- [x] `components/AppText.tsx`, `components/AppButton.tsx`, `components/NativeIcon.tsx`,
      `components/navigation/HeaderTextButton.tsx`, `components/navigation/drawerIcons.ts`
      (`Icon.select` constants for Play/Hello/History/Settings/Rate per Open question 1, option A).
      Deviation: `AppText` has a 4th variant `plain` (= Tamagui core `Text`: colour only, no
      metrics) — see Intermediary learnings; `caption` is 14/**23** not 14/21.
- [x] Gates: `yarn typecheck && yarn lint && yarn jest` → 45 suites / 458 tests.

Phase 2 — navigation + screens off Tamagui — DONE 2026-10-18
- [x] `components/navigation/HeaderMenuButton.tsx`: `usePalette().color`, render `NativeIcon`.
- [x] `app/(tabs)/_layout.tsx`: palette for tints/background/border; `drawerIcon` → `NativeIcon`;
      drop `Drawer.Protected` web guard and the `Platform` import.
- [x] `components/navigation/AppDrawerContent.tsx`: palette + `NativeIcon` star.
- [x] `app/(tabs)/index.tsx`: one header setup for both platforms with `HeaderTextButton`
      (`accessibilityLabel="Start a new game"` per Open question 3); `AndroidHeaderControls`,
      `IOSHeaderTextAction` + constants deleted; iOS-only options (`headerTitleAlign`,
      `headerTitleStyle`, `headerRightContainerStyle` 8) spread in only on iOS so Android keeps the
      drawer default trailing padding (an explicit `undefined` would override it); demo sheet → RN
      `View` rows + `AppButton`, comments kept; `SheetSectionHeader` → `AppText variant="plain"`.
- [x] `app/(tabs)/history.tsx`: `StyleSheet` + `usePalette()`; palette colours (hex fallbacks gone);
      `Separator` → 1 px `View` in `backgroundFocus`; `Spinner` → `ActivityIndicator`; sheet buttons →
      `AppButton` with the existing labels/testIDs; `Paragraph fontSize={14}` → `AppText
      variant="caption"`; row heading + metadata shared as `EntryHeading`. **`ListSpacer` is 28 px,
      not 7**: `height="$2"` resolved against the SIZE scale (`$2` = 28), not space.
- [x] `app/(tabs)/hello.tsx`: RN `View` + `AppText`; anchors → `AppText color={palette.blue10 /
      accent10}` + `Linking.openURL` (Anchor was a `SizableText` → Paragraph metrics = `body`).
      `app/+not-found.tsx`: `View` + `AppText variant="plain"`.
- [x] `src/features/klondike/components/CelebrationDebugBadge.tsx`: `View` + `AppText` (`body`
      keeps the Paragraph lineHeight 23; colour `#f8fafc`, 12/600, letterSpacing 0.3).
- [x] Gates → 45 / 458.

Phase 3 — board off Tamagui (pixel parity) — DONE 2026-10-18
- [x] `KlondikeGameView.tsx`: two `YStack` → `View` (`styles.root`: paddingHorizontal/Bottom
      `SPACE[2]`, gap `SPACE[3]`; `styles.boardShell`: paddingVertical + gap `SPACE[3]`); the
      `STACK_PADDING` 8-vs-7 over-cancel is documented inline, not fixed.
- [x] `TopRow.tsx`: `XStack`/`View` → RN `View` (`styles.row`, `styles.wasteSlot`).
- [x] `PileButton.tsx`: RN `View` + `Text` (`color: palette.color8`, opacity 0.45, 11/400, clip).
- [x] `CardVisual.tsx`: RN `Text` (styles unchanged, `allowFontScaling={false}` kept, comment on the
      card-font contract); `Ban`/`RefreshCcw` from `lucide-react-native`. `FoundationPile.tsx`: RN `Text`.
      `cards/fonts.ts`: weights typed as literals (RN `TextStyle.fontWeight` rejects `string`).
- [x] `UndoScrubber.tsx`: `Lightbulb`/`Shuffle`/`Undo2` from `lucide-react-native` (same `size`/`color`).
- [x] Gates. `rg "from 'tamagui'|@tamagui" app components src` → only `Provider.tsx`, `src/dev/`
      (and the origin comment in `src/theme/tokens.ts`).

Phase 4 — delete feature graphic + web — DONE 2026-10-18
- [x] Deleted `app/feature-graphic.tsx`, `src/dev/FeatureGraphicScreen.tsx` (whole `src/dev/`);
      `expo-linear-gradient` + `@tamagui/colors` removed in Phase 5's single `yarn install`.
- [x] `src/storage/historyRepository.native.ts` → `historyRepository.ts` (plain `mv`, nothing
      staged); `.web.ts` and the re-export shim deleted; `isHistorySupported` + its 5 guards removed
      from `src/state/history.tsx`; the two storage tests require `historyRepository`, the
      late-update mock lost the flag; `historyRepository.types.ts` comment updated.
- [x] `app.json`: `web` block gone; `assets/images/favicon.png` deleted. `package.json`: `web`
      script gone. `metro.config.js` deleted (Expo default config applies).
- [x] Gates (see Testing).

Phase 5 — remove Tamagui + Teleport (one native rebuild follows) — DONE 2026-10-18
- [x] `components/Provider.tsx`: `GestureHandlerRootView` + `SettingsProvider` + `HistoryProvider`
      only; comment explains no theme provider / no Teleport-portal setup / no toast viewport.
- [x] `app/_layout.tsx`: CSS import gone; font comment updated (AppText instead of Tamagui fonts).
- [x] Deleted `tamagui.config.ts`, `tamagui-web.css`, `tamagui.native.setup.ts`, `index.js`;
      `package.json#main` = `expo-router/entry`; `check:tamagui`/`generate:tamagui-css` scripts gone;
      `babel.config.js` = preset only; `.gitignore` AND `.easignore` (mirror) drop `.tamagui`.
- [x] `yarn remove` of the 12 packages (one install); `npx expo install --check` → "Dependencies
      are up to date"; `npx expo-doctor@latest` → 19/20 (the known `agent-device` bin-conflict
      check, pre-existing); `npx expo config --type public` works, no `web` key.
- [x] Gates green; `grep -rni "tamagui|teleport" app components src test scripts package.json
      babel.config.js` → comments only (code lines: none). Metro cache dropped by deleting
      `node_modules/.cache/metro*` + `$TMPDIR/metro-*`/`haste-map-*` instead of holding an
      interactive `yarn start -c` (the tester's build also starts Metro fresh).

Phase 6 — device verification (testing sub-agent; Android first, then iOS; never in parallel)
- [x] Pre-flight 2026-10-18 (testing sub-agent): gates green (45 / 458); `ios/`, `android/` (both
      git-ignored, verified with `git check-ignore`) + stale `node_modules/{react-native-worklets,
      react-native-reanimated,expo-modules-core}/android/{.cxx,build}` + Metro caches deleted;
      `yarn prebuild:android` clean (no teleport/tamagui in the generated Gradle files).
- [x] `yarn prebuild:android` → `yarn release` (build 1: Gradle 4:21, total 4:35, versionCode 16
      installed 09:05; cold start 668 ms, PSS 166 MiB on restart, logcat clean). AFTER light set
      captured with the baseline's `capture-android.sh` into the session scratchpad
      `…/scratchpad/tamagui/after/` (same filenames as `baseline/`); pixel diffs via
      `…/scratchpad/tamagui/pixeldiff.py` (PIL; masks = status bar, nav bar, HUD TIME badge) →
      `…/scratchpad/tamagui/diff/`. Board shots: **every changed pixel lies in the header bbox
      y 163–257 (the Demo/New Game text actions)**; cards, piles, HUD, dock identical (see Testing).
      Dark set + smoke + playlist: after the fix build below.
- [x] Fix drift (2026-10-18, testing sub-agent) — three removal-caused deltas found on the Android
      light set, fixed, gates green (45 / 458), rebuilt:
      1. `AppButton` colours: the Tamagui `Button` drew from the v5 `surface2` COMPONENT theme
         (`light_Button`: bg 85 %, press 80 %, press border 80 %, label 14 %; `dark_Button`: 14 /
         10 / 40 / 80 %), not the base theme the plan table listed (97 % / 93 %). Measured in the
         baseline sheet shots (rgb 217 light / 36 dark), decoded from `@tamagui/themes@2.4.2`
         generated-v5. → `src/theme/tokens.ts` gained `buttonBackground/buttonBackgroundPress/
         buttonBorderPress/buttonColor`; `components/AppButton.tsx` uses them.
      2. `AppText body` 15/23 → **17/22**: the default-size `Paragraph` measured 17 px with a 22 px
         line pitch in BOTH Phase 0 baselines (iOS cap height 36 px @3x, Android 32 px @2.625;
         two-line paragraphs 66 / 58 px apart). Hello wrapped differently at 15/23. Caption (14/23),
         title (16) and the stat tiles matched the baseline, so only `body` changed. The Tamagui
         code path producing 17/22 was not identified (token dump says 15/23) — flagged for Karim.
      3. Not fixed (source-intended): the celebration debug badge is now bold (`fontWeight 600` in
         the source; Tamagui rendered it regular) and its pill is ~1 dp taller.
- [x] `yarn prebuild:ios` (clean `ios/` — native dep removed) → `yarn ios`; same list (scrubber via
      tap/undo only unless Appium is warranted); `.test-artifacts/tamagui-removal/ios/after/`.
      DONE 2026-10-18 — clean build 9 m 28 s, build 15; light + dark sets, smoke, playlist 10/10,
      a11y all green (details in Testing). Artifacts mirrored to `.test-artifacts/tamagui-removal/
      {android,ios}/{before,after,diff}/` (git-ignored) plus the build/capture/playlist logs.

Phase 7 — docs — docs parts DONE 2026-10-18 (device results still to be added after Phase 6)
- [x] Plan updated (Files actually modified, learnings, issues, gate results). The 7 Tamagui/
      teleport guides deleted (Open question 4 → delete); `expo-ui.md` (NativeIcon + audit outcome),
      `expo-router.md` (HeaderTextButton + import state), `expo-sqlite.md` (web section → "not a
      target", platform decision), `react-native.md` (AppText/AppButton/tokens defaults) updated.
- [x] `.agents/skills/soli-testing/SKILL.md`: Header New Game row → `Start a new game` on both
      platforms (Open question 3 → A). "Web: not a target (native-only app)" line is already
      unambiguous and stays; the Tamagui ToastViewport troubleshooting row stays (historical cause).
- [x] `docs/product/store-screenshots/store-screenshots.md` note; SDK 58 plan D5 superseded pointer.
- [x] Propose AGENTS.md edits in the final report (Follow-ups). Karim approved both; applied 2026-10-18 (components rule + native-only/no web).
- [x] After Phase 6: record device results + any parity fixes here (done 2026-10-18, see Phase 6,
      Testing, Identified issues, Files actually modified).

## Plan: Files to modify

New: `src/theme/tokens.ts`, `components/AppText.tsx`, `components/AppButton.tsx`,
`components/NativeIcon.tsx`, `components/navigation/HeaderTextButton.tsx`,
`components/navigation/drawerIcons.ts`, `docs/external-package-guides/lucide-react-native.md`.

Modified: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/history.tsx`,
`app/(tabs)/hello.tsx`, `app/+not-found.tsx`, `components/Provider.tsx`,
`components/navigation/AppDrawerContent.tsx`, `components/navigation/HeaderMenuButton.tsx`,
`src/features/klondike/components/{KlondikeGameView,UndoScrubber,CelebrationDebugBadge}.tsx`,
`src/features/klondike/components/cards/{CardVisual,FoundationPile,PileButton,TopRow}.tsx`,
`src/state/history.tsx`, `src/storage/historyRepository.ts` (renamed from `.native.ts`),
`test/unit/storage/historyRepository.test.ts`, `test/unit/storage/historySeeds.test.ts`,
`test/unit/state/history.lateUpdate.test.tsx`, `package.json`, `yarn.lock`, `app.json`,
`babel.config.js`, `.gitignore`, `docs/external-package-guides/{expo-ui,expo-router,expo-sqlite,react-native}.md`,
`docs/product/store-screenshots/store-screenshots.md`, `.agents/skills/soli-testing/SKILL.md`, this plan.

Deleted: `index.js`, `tamagui.native.setup.ts`, `tamagui.config.ts`, `tamagui-web.css`,
`metro.config.js`, `app/feature-graphic.tsx`, `src/dev/FeatureGraphicScreen.tsx`,
`src/storage/historyRepository.web.ts`, `assets/images/favicon.png`,
`docs/external-package-guides/{tamagui,tamagui-colors,tamagui-config,tamagui-font-inter,tamagui-lucide-icons-2,tamagui-native,react-native-teleport}.md` (Open question 4).

## Files actually modified

Implementation 2026-10-18 (Phases 1–5, Phase 7 docs):

- Prompt 9 (2026-10-18 night): `components/NativeIcon.tsx` (iOS light-scheme `environment` modifier, `color` required), `docs/external-package-guides/expo-ui.md` (symbol dark-rendition note), this plan.
- New: `src/theme/tokens.ts`, `components/AppText.tsx`, `components/AppButton.tsx`,
  `components/NativeIcon.tsx`, `components/navigation/HeaderTextButton.tsx`,
  `components/navigation/drawerIcons.ts`, `docs/external-package-guides/lucide-react-native.md`.
- Modified (app): `app/_layout.tsx`, `app/(tabs)/_layout.tsx`, `app/(tabs)/index.tsx`,
  `app/(tabs)/history.tsx`, `app/(tabs)/hello.tsx`, `app/+not-found.tsx`, `components/Provider.tsx`,
  `components/navigation/AppDrawerContent.tsx`, `components/navigation/HeaderMenuButton.tsx`,
  `src/features/klondike/components/{KlondikeGameView,UndoScrubber,CelebrationDebugBadge}.tsx`,
  `src/features/klondike/components/cards/{CardVisual,FoundationPile,PileButton,TopRow}.tsx`,
  `src/features/klondike/components/cards/fonts.ts` (weights `as const`), `src/state/history.tsx`,
  `src/storage/historyRepository.ts` (was `.native.ts`), `src/storage/historyRepository.types.ts`
  (comment).
- Modified (tests/config/docs): `test/unit/storage/{historyRepository,historySeeds}.test.ts`,
  `test/unit/state/history.lateUpdate.test.tsx`, `test/unit/features/klondike/hintOverlay.test.ts`
  (comment), `package.json`, `yarn.lock`, `app.json`, `babel.config.js`, `.gitignore`, `.easignore`,
  `.agents/skills/soli-testing/SKILL.md`, `docs/external-package-guides/{expo-ui,expo-router,
  expo-sqlite,react-native}.md`, `docs/product/store-screenshots/store-screenshots.md`,
  `docs/product/expo-rn-sdk-58-upgrade/upgrade-to-expo-sdk-58-and-react-native-0-88.md` (D5 pointer),
  this plan.
- Deleted: `index.js`, `tamagui.native.setup.ts`, `tamagui.config.ts`, `tamagui-web.css`,
  `metro.config.js`, `app/feature-graphic.tsx`, `src/dev/FeatureGraphicScreen.tsx`,
  `src/storage/historyRepository.web.ts`, `assets/images/favicon.png`,
  `docs/external-package-guides/{tamagui,tamagui-colors,tamagui-config,tamagui-font-inter,
  tamagui-lucide-icons-2,tamagui-native,react-native-teleport}.md` (Open question 4: deleted; git
  history keeps them — the 2026-10-17 Tamagui 3 facts section lived in `tamagui.md`).
- Packages: removed `tamagui`, `@tamagui/{colors,config,lucide-icons-2,native,babel-plugin,cli,
  metro-plugin}`, `react-native-teleport`, `react-native-web`, `react-dom`, `expo-linear-gradient`;
  added `lucide-react-native@1.50.0`.

Phase 6 device verification 2026-10-18 (testing sub-agent): `src/theme/tokens.ts` (+ `button*`
palette keys), `components/AppButton.tsx` (uses them; comment), `components/AppText.tsx` (`body`
17/22; comment), this plan. No other source touched. Scratchpad-only: `pixeldiff.py`,
`capture-android.sh`/`capture-ios.sh` (copied from the baseline), mirrored under
`.test-artifacts/tamagui-removal/` (git-ignored).

Prompt 7 (2026-10-18 evening, implementation + verification sub-agent): modified
`components/NativeIcon.tsx` (fixed slot), `components/navigation/drawerIcons.ts` (comment),
`assets/icons/material/play_arrow_wght300.xml` (viewport crop), `app/(tabs)/_layout.tsx`,
`components/navigation/AppDrawerContent.tsx` (back to `NativeIcon` + `DRAWER_ICONS`),
`app/(tabs)/index.tsx` (`HeaderActions` plain again, uses `HeaderActionButton`),
`src/features/klondike/hooks/useDemoGameLauncher.ts` (picker link family removed),
`.agents/skills/soli-testing/SKILL.md` (a11y row + iOS alert note), this plan. New:
`components/navigation/HeaderActionButton.tsx`, `HeaderActionButton.android.tsx`. Deleted:
`src/dev/iconVariant.ts`, `components/navigation/{DrawerGlyph,HeaderActionVariants,
HeaderMaterialButton,HeaderMaterialButton.android}.tsx`, 5 losing XMLs.

Prompt 8 (2026-10-18 night, implementation + verification sub-agent): modified
`components/navigation/drawerIcons.ts` (entries are now `{ name, scale }`, optical rationale
comment), `components/NativeIcon.tsx` (`scale` prop: glyph at `size * scale` in the unchanged
`size` slot), `app/(tabs)/_layout.tsx` + `components/navigation/AppDrawerContent.tsx` (spread
`{...DRAWER_ICONS.x}`), `components/navigation/HeaderActionButton.android.tsx` (`colors` +
`usePalette` removed → Material You default; comment), this plan. Scratchpad-only:
`tamagui/icons/balanced/` (shots, `scripts/ink.py`, board).

Planning: `docs/product/tamagui-3-upgrade/tamagui-major-upgrade.md` (2026-10-17 research,
2026-10-18 executable plan), `docs/external-package-guides/tamagui.md` (2026-10-17, now deleted).

## Intermediary learnings

- 2026-10-18 (device): Tamagui `Button` resolves its colours through the `Button` COMPONENT theme
  (`light_Button` = `surface2` template = one palette step darker: bg 85 %, press 80 %, label 14 %),
  so "`theme.background`" read from `Button.mjs` is NOT what rendered. Reading the component source
  is not enough for parity — measure a pixel in the baseline shot (217/36 here) and decode the
  generated theme (`@tamagui/themes` `generated-v5.mjs` is a `t([[keyIdx, colorIdx]])` table).
- 2026-10-18 (device): the default-size `Paragraph` rendered 17 px / 22 px line pitch on BOTH
  platforms although `createSystemFont()`'s `$true` is 15/23 and `getFontSized` reads exactly that
  table; explicit `fontSize={14}`/`{12}` Paragraphs did keep lineHeight 23. Mechanism unresolved
  after reading `@tamagui/text`, `get-font-sized`, `config/v5-fonts`, `web/createFont` — parity
  was restored empirically (`AppText body` 17/22 → Hello 0 changed px on Android, AA-only on iOS).
- 2026-10-18 (device): the dev Demo sheet's invisible labels/overflow are identical before and
  after on both platforms → an Expo UI `BottomSheet`/RNHostView layout issue, not Tamagui.
- 2026-10-18 (device): Tamagui dropped `fontWeight="600"` on the celebration badge Paragraph
  (rendered 400); RN honours it, so the badge is now bold (+1 dp pill height).
- 2026-10-18 (testing): `yarn deeplink` playlist on the phone PAUSES (no crash) when the screen
  dozes — run `scripts/android-ready.sh --keep-awake` first (restore `screen_off_timeout 60000`).
  History rows at the bottom edge of the Android screen must be scrolled mid-screen before an
  agent-device press, otherwise the tap hits the gesture nav bar and sends Soli to the launcher.
  iOS agent-device `swipe`/`fling` coordinates are POINTS (402×874), not pixels; `fling up` scrolls
  the list far — a 250 pt `swipe` is the controllable step; relaunching the app resets the
  History scroll offset (it persists across drawer navigation).
- 2026-10-18 (impl): Tamagui `height`/`width` props resolve against the SIZE token scale, not
  space: `ListSpacer`'s `height="$2"` was 28 px (`size.$2`), not 7. Kept 28 for parity; the plan's
  "height 7" was wrong.
- 2026-10-18 (impl): `Paragraph fontSize={14}` keeps `lineHeight 23` (the `size="$true"` default
  variant expands first, the explicit `fontSize` only overrides the size) — `AppText caption` is
  14/23. `Anchor` is a `SizableText` (same 15/23/400 as Paragraph), so links use the `body` variant.
- 2026-10-18 (impl): Tamagui core `Text` injected only `color`; many one-off sizes (stat tiles
  13/24, 18 px headings, 12 px section labels) would clip or shift under `body`'s lineHeight 23 →
  `AppText` got a `plain` variant (colour only). Four variants, not three.
- 2026-10-18 (impl): RN `TextStyle.fontWeight` is a literal union; the card font weight constants
  (`cards/fonts.ts`) widened to `string` inside CardVisual's style objects → `as const`.
- 2026-10-18 (impl): react-navigation merges `screenOptions` and `setOptions` shallowly, so an
  explicit `headerRightContainerStyle: undefined` on Android would have wiped the drawer default
  (16) — the iOS-only header options are spread in conditionally instead.
- 2026-10-18 (impl): lucide glyph parity — `RefreshCcw`, `Lightbulb`, `Shuffle`, `Undo2` path data
  identical between `@tamagui/lucide-icons-2@2.4.2` (lucide-static 0.508) and
  `lucide-react-native@1.50.0`; `Ban` differs only by relative-vs-absolute notation (≤ 0.03 px).
- 2026-10-18: `tamagui`'s `Text` is NOT the unstyled core `Text` — `tamagui/dist/esm/views/Text.mjs`
  adds `color: "$color"`. That is why history row titles follow dark mode without an explicit color,
  and why `AppText` must default to `palette.color`.
- 2026-10-18: `@expo/metro-runtime` must stay even without web: `expo-router/entry-classic` imports
  it first, unconditionally. `react-dom`/`react-native-web` are optional peers everywhere (expo,
  expo-router, @expo/ui, @expo/metro-runtime) and only referenced from web-only builds.
- 2026-10-18: the Expo UI universal `List` has no end-reached callback (`ListProps`: `children`,
  `onRefresh`, `testID`), so it cannot host the paginated History list yet.
- 2026-10-18: `@expo/material-symbols/icons` ships 7,698 XMLs; `atom.xml` does not exist (hence the
  Play icon question), `play_arrow/mood/history/settings/star/playing_cards/schedule/
  sentiment_satisfied.xml` do.
- 2026-10-18: `metro.config.js` only contains the Tamagui plugin and the web sqlite/wasm setup → it
  can be deleted rather than reduced.
- 2026-10-18: `STACK_PADDING = 8` in `src/features/klondike/constants.ts` says "matches px=$2" but
  v5 `$2` = 7 px; the board's negative margin trick therefore over-cancels by 1 px today. Pre-existing;
  keep the literal 7 for the root padding to stay pixel-identical, note the mismatch in a comment.
- 2026-10-18: v5 `Paragraph` carries `lineHeight 23` from `size="$true"`; sites that override
  `fontSize={14}` probably keep that line height — the only likely non-board text drift, verify.
- 2026-10-17: `@tamagui/lucide-icons-2` has no 3.x; `@tamagui/babel-plugin` stops at 2.7.7; v3's
  Metro plugin hard-fails outside `metro-resolver` 0.84-0.87; tamagui.dev upgrade guide truncates at
  ~22.5k chars (full checklist in `@tamagui/cli@3.0.18/src/migrate.ts`).
- 2026-10-17: `@tamagui/native` + `react-native-teleport` only serve Tamagui portals/Sheet; Soli's
  sheets are Expo UI since the demo-sheet cleanup, so both are unused.

- 2026-10-18 (prompt 7): Expo UI's Android `ImageLoader.kt` parses vector XML itself and
  supports `<path>` only ("groups, clips, gradients not yet supported") — a `<group
  android:translateX>` silently drops the glyph. Crop a viewport by rewriting the path
  coordinates instead.
- 2026-10-18 (prompt 7): `Host matchContents` + SF Symbol = the glyph's intrinsic width (18–26 pt
  at `size` 24); anything laid out after the Host (drawer labels) drifts. Wrap in a fixed-size
  RN `View` and centre. Android's Compose `Icon` applies `Modifier.size`, so it never drifted.
- 2026-10-18 (prompt 7): Expo UI Compose `FilledTonalButton` default colours come from the
  Material You dynamic palette (wallpaper tint); `colors={{ containerColor, contentColor }}`
  pins them. `semantics({ contentDescription })` shows up as a labelled View + Button node in
  the Android a11y tree (`press 'label="…"'` works), while agent-device's collapsed snapshot
  prints the inner Compose text instead of the contentDescription.
- 2026-10-18 (prompt 7): agent-device `alert accept` does not dismiss the RN `Alert` on the iOS
  sim ("Start a new game?" stayed up, every later step hit it) — press the alert's button by
  label (`label="Deal Again"`) instead.

- 2026-10-18 (prompt 8): Expo UI `FilledTonalButton` without `colors` → `Color.Unspecified` →
  Material defaults (`secondaryContainer`); the `Host` theme is `dynamic*ColorScheme` on API ≥ 31,
  baseline M3 purple below, `MaterialExpressiveTheme` either way — one scheme for every Host in
  the app, so header buttons and Settings controls cannot drift apart.
- 2026-10-18 (prompt 8): optical sizing needs both extent and silhouette: a bare triangle at the
  circle's height still reads ~15 % smaller (half the area), a filled one reads heavier; the
  geometric-mean rule reproduces Material's circle-20/square-18 keylines within 4 %.

## Identified issues

- Tamagui 2.x unmaintained on RN 0.88/Metro 0.87 — resolved by this removal.
- Empty-foundation suit glyph + stock labels use the system font (device-dependent) — open, Follow-ups.
- `AppText` default `lineHeight 23` vs `fontSize 14` overrides (history metadata line) — resolved
  by reading the Tamagui sources: `caption` is 14/23 (see learnings); Phase 6 confirms visually.
- Android header: "New Game"/"Demo" were Tamagui pills (36 px, bordered on press), now text
  actions like iOS — intended (plan: ADOPT), but the Android before/after shots will differ there.
- History list spacing: plan said 7 px between rows, implementation keeps the actual 28 px — if the
  Android/iOS `before/` shots show 7, the size-token reading is wrong and `styles.listSpacer` is
  the one-line fix. **Resolved 2026-10-18 (device):** Android row cards 175 px → 174 px, gaps
  112 → 113 px, stat tiles identical — 28 px was right.
- `AppButton` colours were the base theme (97 %/8 %) instead of Tamagui's `Button` component theme
  (85 %/14 %) — **fixed 2026-10-18** (Phase 6 step 2), verified rgb 217 on device after the rebuild.
- `AppText body` 15/23 vs the measured 17/22 — **fixed 2026-10-18**; Hello is pixel-identical to
  the baseline after the rebuild (0 changed px). Root cause inside Tamagui not identified.
- **Pre-existing, NOT removal-related, open:** the dev Demo sheet on Android renders section headers
  (`DEMO GAMES`/`FIXTURES`/`CELEBRATION`) and several `AppButton` labels (`Run Demo`, `Mid-game
  scrub`, `Near win`, `Fresh deal`, …) invisible and the rows overflow the sheet width — identical
  before and after the removal (baseline README called it out as a Tamagui-theme suspicion; it is
  not). The a11y tree lists all buttons and they fire. Likely the Expo UI `BottomSheet`
  RNHostView measuring its RN children with an unconstrained width + something hiding text that
  wraps; dev-only, needs its own look.

## Testing

- Results 2026-10-18 (implementation): `yarn typecheck && yarn lint && yarn jest --runInBand` green
  after Phases 1, 2, 3, 4 and 5 — 45 suites / 458 tests every time (baseline before any change:
  45 / 458). `yarn check:tamagui` ✅ after Phase 4 (last run before removal). `yarn format:check`
  clean. Post-removal: `npx expo install --check` up to date, `npx expo-doctor@latest` 19/20 (known
  `agent-device` script/bin conflict, unrelated), `npx expo config --type public` OK.
- Phase 0 BEFORE baseline 2026-10-18 (testing sub-agent, installed binaries, no builds): 13 screens
  × light/dark × Android A065 (1080x2412) + iPhone 17 Pro sim (1206x2622) = 52 PNGs + a11y dumps,
  in the session scratchpad `…/scratchpad/tamagui/baseline/` with `README.md` (device/build table,
  exact deep links, 13-step list, diff masks, a11y handle table) and the two capture scripts
  `capture-android.sh` / `capture-ios.sh <light|dark> <outdir>` that reproduce the run for the
  after-set. Screens: `board-scrubbed` (`yarn scrubtest` — the ONLY pixel-diff fixture; mask the
  status bar and the HUD TIME badge, its timer runs), `hint` (ring), `drawer`, `hello`,
  `history-list`, `history-sheet` (row `Deal VO56-FEZI, Solved`), `settings`, `demo-sheet`,
  `celebration-badge` (`yarn celebration 36`), `board-vegas-lastpass` / `-stock-exhausted` (⊘ +
  dock New Game) / `-fresh` (4 empty foundations) / `-recycle` (`2 left`). Findings for Phase 6:
  (1) Demo sheet on BOTH platforms renders section headers and several button labels invisible
  (empty grey pills; Android rows also overflow the sheet width) although the a11y tree lists them —
  pre-existing, so "labels visible after" is an improvement, not drift. (2) Settings baselines
  differ per device and were left untouched: phone Scoring=Vegas / Warnings="No more useful moves";
  sim Scoring=Off / Warnings="Unwinnable game"; Hint button on both. (3) Seeded history rows were
  left in place on both devices (list rows otherwise shift anyway as fixtures add real rows — eyeball
  only). (4) Header a11y today: Android `New Game` (text) + `Demo`, iOS `Start a new game` + `Demo`;
  sheet: `Retry this deal`/`history-retry`, `Share this deal`/`history-share`; iOS sheet dismiss =
  `dismiss popup` region. Not capturable: scrubber track mid-pan (iOS needs Appium; skipped on
  Android too — the scrubber is RN/Reanimated, Tamagui only supplies its lucide icons, which the dock
  shots cover).
- Phase 6 AFTER — Android A065 (2026-10-18, testing sub-agent; fix build versionCode 16 installed
  09:23; artifacts in the session scratchpad `…/scratchpad/tamagui/{after,diff}/`, mirrored to
  `.test-artifacts/tamagui-removal/android/` at the end of the run):
  - Pixel diffs (PIL, masks: status bar, nav bar, HUD TIME badge), light AND dark: `board-scrubbed`,
    `board-vegas-fresh/-lastpass/-recycle` → 1.80 % changed, **all inside the header bbox
    (555,163)–(1038,257)** = the Demo/New Game text actions (intended); `board-vegas-stock-exhausted`
    → +96 px at the ⊘ glyph (lucide `Ban` path notation, sub-pixel AA); `hello` **0 px** (after the
    17/22 fix), `settings` **0 px**, `drawer` 0.76 % (Material Symbols glyphs only, same positions
    and tints), `hint` header + ring AA only (ring present in both), `history-list` differs only
    because rows moved (cards 175 → 174 px, tiles identical), `history-sheet` sheet region 0.33 %
    (AA; buttons rgb 217 light / 36 dark = baseline), `demo-sheet` same pre-existing invisible-label
    bug as the baseline, `celebration-badge` text 400 → 600 weight (source-intended).
  - Functional: cold start 668 ms (board in first frame), stock draw (10 → 9 cards), Undo (back to
    10), scrubber pan `gesture pan 801 2150 -339 0 1500` scrubs (stock 10 → 7, waste changes),
    Vegas fixture tap-to-move (A♦ → foundation, Moves 1, column 7 flips), Hint ring on the Draw
    card, `yarn celebration 36` badge tap → `Celebration 37 · Pinball`, tap elsewhere dismisses,
    drawer → every item, Rate Soli → Play Store, Hello `@carimatia` → Firefox, History row → sheet
    → Share → system chooser with the https deal link, Retry → "Retry this deal?" alert → RETRY →
    fresh board (Moves 0, Stock 23), Settings picker labels `Draw 1` / `Vegas` / `No more useful
    moves` (A1 workaround still fine), `soli://nope` → not-found ("Go to home screen!"), dark mode
    on all 13 screens. Pressed-state colour of `AppButton` not captured on the phone (the press fires
    the share chooser faster than `screencap`); logic is a plain RN `Pressable` style function.
  - Playlist `soli:///?demo=playlist&games=10`: 10/10 completed in 1 m 40 s, 0 crash tokens in
    logcat (FATAL/AndroidRuntime/RedBox/Unable to resolve/Teleport/lucide/E ReactNativeJS/tombstone
    all absent). RAM (PSS): 166 MiB after a fresh restart, 329 MiB after the 10 games (SDK 58 plan:
    155 / 331 MiB) — unchanged within noise. Gotcha hit once: without `android-ready.sh
    --keep-awake` the phone dozed mid-playlist (`onHostPause` at game 3) and the run just paused.
  - a11y (`snapshot -i`): `Start a new game`, `Demo`, `Open navigation menu`, drawer `Play/Hello/
    History/Settings/Rate Soli` + `Close drawer`, sheet `Close sheet` + `Retry this deal` + `Share
    this deal`, dock `Hint`/`Undo`/`New Game` (Vegas exhausted) + `Stock, no passes left [disabled]`,
    `Celebration 36 · Spirograph` group, card/foundation/stock/waste labels unchanged, demo sheet 10
    buttons listed.
- Phase 6 AFTER — iOS iPhone 17 Pro sim, iOS 26.5 (2026-10-18; clean `prebuild:ios` + `yarn ios`
  with `LANG=en_US.UTF-8`: pods + xcodebuild 9 m 28 s, build 15 installed 09:44, no Teleport pod in
  `Podfile.lock`): light set pixel diffs — **all five board shots 0–24 px** (TIME badge edge /
  ⊘ AA; iOS already had the text header), `settings` 0 px, `hello` 0.83 % = sub-pixel AA only
  (text rows and "Made by" width identical: 191 vs 190 px — confirms 17/22), `drawer` 0.88 % (SF
  Symbols glyphs), `hint` ring + header AA, `history-list` rows moved only, `history-sheet` same
  layout / buttons rgb 217, `demo-sheet` same pre-existing invisible-label bug as the baseline (so
  it is the Expo UI sheet on both platforms, not Tamagui), `celebration-badge` animation + bold.
  Dark set: boards 0–19 px, `settings` 0, `hello` AA only, drawer glyphs, history sheet buttons
  rgb 36 (= baseline), demo sheet unchanged bug.
  Functional: cold start → board + `Demo`/`Start a new game` header within ~3 s; Vegas fixture
  A♦ → foundation (Moves 1), stock 21 → 18, Undo → 21; Hint ring on the Draw card (colorkey YAVG
  211 vs 255 clean, baseline 212); `yarn celebration 36 --ios` badge → `Celebration 37 · Pinball`,
  tap elsewhere dismisses; Retry → "Retry this deal?" → Retry → Moves 0 / Stock 23; Share → iOS
  share sheet with the `karimattia.ch` link; Demo sheet lists 45 nodes incl. `Run Demo`, `Mid-game
  scrub`, `Seed history`; drawer navigation Play/Hello/History/Settings/Rate Soli via the
  hamburger-ref loop; `soli://nope` → "Oops! / This screen doesn't exist. / Go to home screen!"
  (the a11y ref of that link reported a nav-bar coordinate, so the tap did not navigate —
  recovered by relaunch; not a removal change, the screen is `View` + `AppText` + router `Link`).
  a11y (testIDs/labels): `Start a new game`, `Demo`, `Open navigation menu`, `history-retry`/
  `Retry this deal`, `history-share`/`Share this deal` (raw snapshot), `dismiss popup`, drawer
  `Play [selected]/Hello/History/Settings/Rate Soli/Close drawer`, dock `Hint`/`Undo`/`New Game`,
  `Stock, no passes left [disabled]`, `Celebration 36 · Spirograph`, Settings `Draw 1`/`Scoring`
  `Off`/`Hint button` — all present in the dumps. Hello `@carimatia` → Safari (x.com); `Rate Soli`
  shows nothing on the simulator (no App Store there — expected, not re-checked on a device).
  Playlist `soli:///?demo=playlist&games=10` (unified log stream, `--level debug`): 10/10
  completed, no RedBox/Unable to resolve/Teleport/lucide/Fatal/EXC lines; `Soli` RSS 412 MiB
  after the 10 games (SDK 58 plan: 377 MiB settled / 464 MiB after 20).
- Cheap gates after every phase: `yarn typecheck && yarn lint && yarn jest` (expect 45 suites / 458
  tests until Phase 4 changes imports; count must not drop). `yarn format:check` before handing back.
- Phase 0/6 device work per `.agents/skills/soli-testing/SKILL.md` (read it first). Android phone
  first (`yarn release`, data guardrail: no wipes, seeded rows only), then iOS sim (`yarn ios`,
  clean `ios/` because a native module was removed). Sequential builds; one agent-device session per
  device; `/tmp/android-device.lock` check.
- Smoke list (both platforms, light + dark): launch (no splash hang), fresh deal tap-to-move, stock
  draw → recycle → (Vegas fixture `yarn vegas lastpass`) "N left"/⊘ mark, Undo button + scrubber pan
  (Android) / undo-redo taps (iOS), `?set=hintButton:on` + Hint press → ring + bubble, drawer open
  (icons, tints, Rate Soli → store link), Hello (links open), History list (status colors, tiles) →
  row → sheet → Share (share sheet) and Retry (confirm → board), Settings (toggle, picker, Reset
  Vegas total alert), Demo sheet (dev mode on: every row visible on the Android detent, buttons fire),
  `yarn celebration 36` (badge tap cycles; dismiss), `yarn deeplink 'soli:///?demo=playlist&games=10'`
  (no crash, logs clean), `+not-found` via `yarn deeplink 'soli://nope'`.
- Pixel parity: board shots `before/` vs `after/` (same fixture via `yarn scrubtest` for a
  deterministic board; `yarn vegas lastpass` for the recycle card icon) — zero diff expected except
  the clock in the HUD; drawer glyphs differ by design; everything else within 1-2 px.
- a11y: `yarn ad snapshot -i` on Android must still list the sheet buttons
  (`Retry this deal`, `Share this deal`), the dock buttons and the board cards.

- **Final verification (prompt 7), Android A065 (420 dpi, 2.625 px/dp), 2026-10-18 20:40,
  incremental `yarn release` (50 s), scrubbed fixture, light + dark** — shots in the session
  scratchpad `tamagui/icons/final/{before,after}/` (before = the prompt-6 picker build captured
  on the phone right before the rebuild; `before/android-light-header-baseline-pill.png` =
  the Phase 0 Tamagui-pill baseline):
  - Header height: board top (status bar + top app bar) **294 px before (baseline pill AND H1
    text) and 294 px after (H3)** — unchanged; = 147 px status bar (56 dp on this phone) +
    147 px header (56 dp). The tonal button's Compose node is 40 dp high (rect y 158–263 px)
    inside the 48 dp header-right container, so it fits without growing the bar. Status bar
    untouched (Karim's question: yes, same height).
  - Drawer label x (light / dark): before 172/171/171/170/171 px · after 172/171/171/170/171 px
    — Android was already aligned (Compose `Icon` honours `size`), the slot changes nothing here.
  - Play ink box: before **25×31 px (9.5×11.8 dp)**, after **36×45 px (13.7×17.1 dp)**; the
    others: Hello 51×51, History 45×45, Settings 49×51, Rate 45×43 px (mean height 47.5 px) →
    the triangle is now 0.95× the mean height. Mechanism: XML viewport crop (see table above).
  - a11y: raw tree has `label="Start a new game"` (View + Button node) and `label="Demo"`;
    agent-device's collapsed snapshot shows them as `[group] "New Game"`/`"Demo"` (the Compose
    text), but `press 'label="Start a new game"'` hits. Smoke: New Game → "Start a new game?"
    alert → accept → Moves 0 / Stock 23 (new Draw-1 deal) ✅; Demo → sheet with Mid-game scrub /
    Near win / Seed history ✅; drawer → Hello, History, Settings, Play ✅; Rate Soli → Play
    Store (com.android.vending) foreground, app resumed via `am start` ✅. Bounded logcat: no
    FATAL/RedBox/ReactNativeJS errors. Dark mode: tonal buttons render the dark `button*` greys.
  - Phone restored: light mode, `screen_off_timeout` 60000, device lock removed, agent-device
    session closed; Scoring=Vegas / Warnings untouched (the New Game smoke added one Vegas deal
    to history — fine per Karim).

- **Final verification (prompt 7), iOS `iPhone 17 Pro` sim (iOS 27.0, 3×), 2026-10-18 20:45,
  incremental `yarn ios` (1:04), scrubbed fixture, light + dark:**
  - Drawer label x (light): before **187 / 207 / 207 / 210 / 216 px (spread 29 px = 9.7 pt)** →
    after **196 / 195 / 195 / 194 / 195 px (spread 2 px = 0.7 pt)**; dark after 195/195/195/194/195.
    Glyph centres now 119–124 px (centred in the 24 pt slot) instead of 119–130.
  - Play ink box: 53×59 px (17.7×19.7 pt) before AND after (unchanged on purpose); others
    Hello 72×72, History 72×72, Settings 75×75, Rate 79×75 px → the filled triangle is 0.80× the
    mean height. Not bumped: a filled shape reads heavier than an outline, and the slot would need
    `size` 27–28 pt for that one glyph (overflowing the 24 pt slot); one-line change if Karim
    wants it (`size * 1.15` for `play` only in `_layout.tsx`).
  - Header: board top 302 px before and after (H1 text action untouched).
  - Smoke: `Start a new game` → alert "Start a new game?" (Cancel / Deal Again) → Deal Again →
    Moves 0 / Stock 23 ✅; Demo → sheet (Mid-game scrub / Near win …), `dismiss popup` closes it
    ✅; drawer → Hello ("Made by"), History ("Game History"), Settings, Play ✅. `log show` scan:
    no RedBox/fatal/unhandled. Session closed, appearance reset to light.
  - Board: scratchpad `tamagui/icons/final/final-board.png` (row A drawer before/after per
    platform with ink boxes + label guide lines, A' dark after, B header baseline pill / H1 / H3 /
    iOS / H3 dark with the measured board-top lines); capture + measurement scripts in
    `final/scripts/` (`android-capture.sh`, `ios-capture.sh`, `measure.py`, `header.py`,
    `board.py`, all `python3 -I`).

- **Optical balance + dynamic colour (prompt 8), Android A065 (420 dpi, 2.625 px/dp), 2026-10-18
  21:06, incremental `yarn release` (49 s, versionCode 16), scrubbed fixture, light + dark** —
  shots in the session scratchpad `tamagui/icons/balanced/after/`, measurement `balanced/scripts/ink.py`:
  - Drawer ink boxes before → after (px): Play **36×45 → 45×57 (17.1×21.7 dp)**, ink 420 → 690;
    Hello 51×51 (unchanged, ink 811); History **45×45 → 51×51 (19.4 dp)**, ink 656 → 833;
    Settings 49×51 (unchanged, ink 939); Rate **45×43 → 54×50 (20.6×19.0 dp)**, ink 536 → 744.
    Perceived size P after: 45 / 48 / 47 / 46 / 45 (before 36 / 48 / 42 / 46 / 38). Ink weight
    690–939 px² for all five (before 420–939). Dark mode identical boxes.
  - Label x (light / dark): 172/171/171/170/171 px both before and after — unchanged. No
    clipping of the 31 dp Play / 27 dp History / 28 dp Star Compose boxes inside the 24 dp slot.
  - Header: board top **294 px before and after** (height unchanged). Tonal button container
    light **rgb(223, 228, 215)** / text rgb(67, 72, 62), dark container rgb(67, 72, 62) / text
    rgb(223, 228, 215) — the wallpaper-derived sage green, **contrast 7.3:1 in both modes**
    (pinned greys were rgb 217/36, 11.0:1). Hamburger, title and buttons otherwise unchanged.
  - Smoke: drawer → Hello ("open source" link listed), History (row list), Settings (Scoring
    `Vegas`, Warnings `No more useful moves` — untouched), Play; `Start a new game` → "Start a
    new game?" → DEAL AGAIN → Moves 0 / Stock 23; Demo → sheet (Mid-game scrub / Near win /
    Seed history) → back. Logcat (cleared before the smoke): no FATAL/RedBox/ReactNativeJS
    errors; the single `AndroidRuntime: VM exiting` line is an adb shell pid, not Soli's (4122).
  - Phone restored: light mode, `screen_off_timeout` 60000, device lock removed, session closed.
    The duplicate mDNS alias was disconnected first (skill recipe) so `android-ready.sh` ran.

- **Optical balance (prompt 8), iOS `iPhone 17 Pro` sim (iOS 27.0, 3×), 2026-10-18 21:08,
  incremental `yarn ios` (55 s, build 15), scrubbed fixture, light + dark:**
  - Drawer ink boxes before → after (px): Play **53×59 → 64×71 (21.3×23.7 pt)**, ink 1389 → 2029
    (≈ Settings' 1907); Hello 72×72, History 72×72, Settings 75×75, Rate 79×75 unchanged.
    Perceived size P after: 60 / 68 / 68 / 69 / 67 (Play before 50). No clipping of the 29 pt
    Host in the 24 pt slot.
  - Label x (light): 196/195/195/194/195 px (spread 2 px = 0.7 pt) before and after — unchanged;
    dark 195/195/195/194/195.
  - Header: board top 302 px (unchanged; iOS header untouched).
  - Smoke: drawer → Hello ("Made by"), History ("Game History"), Settings, Play (fresh-ref loop
    from the skill — a stale `"Play"` text ref once left the drawer open on Settings, retried
    with the `[button] "Play"` ref); `Start a new game` → alert → Deal Again → Moves 0 / Stock
    23; Demo → sheet (Mid-game scrub / Near win) → `dismiss popup`. `log show` (10 min): no
    RedBox/fatal/unhandled/EXC. Appearance reset to light, session closed.
  - Observation, pre-existing (same ink 3802 px² in the prompt-7 dark shot): SF `face.smiling`
    renders as a filled white disc with dark features in dark mode on this sim, outline in light.
    Not touched here.
  - Board: scratchpad `tamagui/icons/balanced/balanced-board.png` (row A drawer before/after per
    platform with ink boxes, label lines and per-glyph px/dp/ink table; A' dark after; B Android
    header pinned greys vs dynamic, light + dark); scripts in `balanced/scripts/` (`ink.py`,
    `board.py`, `android-capture.sh`, `ios-capture.sh`).

- **face.smiling dark mode (prompt 9), iOS `iPhone 17 Pro` sim (iOS 27.0, 3×), 2026-10-18 21:27,
  incremental `LANG=en_US.UTF-8 yarn ios` (57 s, build 15), scrubbed fixture, light + dark
  (`smiley/ios-capture.sh`; before = the prompt-8 after shots, same code state):**
  - Hello ink box 72×72 px (24 pt) in all four shots; ink px² dark **3802 → 1505** (light 1511,
    i.e. the same outline), silhouette 4082 unchanged. Play/History/Settings/Rate ink boxes and
    ink unchanged (64×71 / 72×72 / 75×75 / 79×75 px). Label x light 196/195/195/194/195, dark
    195/195/195/194/195 — identical before/after (0 pt shift).
  - Pixel diff (`smiley/diff.py`, threshold 8/255): light drawer rows crop 1000×820 px → **0**
    differing px; light hamburger crop → 0; dark hamburger crop → 0; dark drawer rows → 2882
    differing px, all inside the Hello glyph (bbox 90–149 × 437–496 px), nothing else moved.
  - Gates: typecheck, lint, jest 45 suites / 458 tests green; oxfmt on `NativeIcon.tsx`.
  - Android: not built — `modifiers` is `undefined` there (Platform.OS branch), no rendering
    change possible.
  - Sheet: scratchpad `tamagui/icons/smiley/smiley-fix.png` (light/dark × before/after drawer
    crops with a 3× Hello zoom); research artefacts beside it (`mac-sheet.png`, `sui-sheet.png`,
    `assets-info.json` from `assetutil`). Appearance reset to light, session closed.

## Icons: before/after and options (prompt 4)

Research sub-agent, 2026-10-18. No source changed. Sheets (scratchpad
`tamagui/icons/`): `compare-android.png`, `compare-ios.png` (+ `-dark` variants) crop every
icon slot from the Phase 0 baseline and Phase 6 after screenshots; `options.png` renders the
candidate glyphs (lucide from `node_modules`, Material Symbols from the official
google/material-design-icons SVGs) at 24 px and 2x, plus six drawer mock-ups.

### What changed, per icon, and whether the removal forced it

| Slot | Before (HEAD) | After (working tree) | Forced by the Tamagui removal? |
| --- | --- | --- | --- |
| Drawer Play | `@tamagui/lucide-icons-2` `Atom`, stroke 2 on a 24 grid, `size` 24 from react-navigation | iOS: SF Symbol `play.fill` (regular weight, **filled**). Android: Material Symbols Outlined `play_arrow` wght 400 (**outlined** triangle) | **No.** `@tamagui/lucide-icons-2` is just lucide; `lucide-react-native` ships the identical `Atom` path (parity checked for the board icons). The swap to native symbols came from the Expo UI audit ("go closer to native", prompt 3) and plan open question 1, which *we* decided — `Atom` has no SF/Material twin, so Play became a triangle. Side effect nobody flagged: filled on iOS vs outlined on Android |
| Drawer Hello | lucide `Smile`, stroke 2 | SF `face.smiling` / Material `mood` w400 (grin mouth, heavier) | No (same reason) |
| Drawer History | lucide `Clock`, stroke 2 | SF `clock` (plain clock) / Material `history` (clock + counter-clockwise arrow) | No. Also a cross-platform metaphor mismatch: plain clock on iOS, "history" on Android |
| Drawer Settings | lucide `Settings`, stroke 2 | SF `gearshape` / Material `settings` w400 (filled hub, heavier) | No |
| Drawer Rate Soli | lucide `Star`, stroke 2 | SF `star` / Material `star` w400 (sharper, optically larger) | No |
| Header menu | Expo UI `Icon` (SF `line.3.horizontal` / Material `menu`) | same, now via `NativeIcon` | — (pixel-identical) |
| Dock Hint / New Game / Undo | lucide `Lightbulb` / `Shuffle` / `Undo2`, size 20, stroke 2 | `lucide-react-native` same names, same props | **Yes** (package swap only) — path data byte-identical, 0 px diff |
| Stock recycle / exhausted | lucide `RefreshCcw` / `Ban`, size = 22 % of card width | same from `lucide-react-native` | Yes (package swap only); `Ban` ≤ 0.03 px notation diff |

Candid answer to "why did you need to change them at all": we did not need to. The only
*required* change was the import path for the 5 board icons. The 5 drawer glyphs were changed
on purpose because the plan read "closer to native" as "native symbols in the drawer too" —
defensible, but it traded a consistent single icon system (lucide everywhere) for two platform
symbol sets, a heavier Android look, and two small cross-platform inconsistencies (Play
filled/outlined, History clock/history).

### Why the lines look thicker

- lucide: 24-unit grid, `strokeWidth` default 2 (8.3 % of the icon), round caps/joins; the
  `strokeWidth` prop (any number, e.g. 1.75 / 1.5) and `absoluteStrokeWidth` (keep 2 px at any
  size) are plain props on every `lucide-react-native` icon (`node_modules/lucide-react-native/dist/esm/Icon.mjs`;
  https://lucide.dev/guide/react-native/basics/stroke-width).
- Material Symbols (Android now): a variable font with axes FILL 0–1 (default 0), wght 100–700
  (default 400), GRAD -50–200 (default 0), opsz 20–48
  (https://developers.google.com/fonts/docs/material_symbols). `@expo/material-symbols@0.1.1`
  ships **only** Outlined / wght 400 / GRAD 0 / opsz 24 as Android XML (`README.md` in the
  package). Material 400 is built heavier than lucide 2.0 and some glyphs carry filled details
  (gear hub, mouth), which is what reads as "thicker". Rendered side by side (`options.png`):
  Material **wght 300 ≈ lucide 2.0**, **wght 200 ≈ lucide 1.5**. Other weights are possible but
  not from the package: `npx add-material-symbols --weight 300 play_arrow mood history settings star`
  writes XMLs into `./assets`, imported with `require('./assets/play_arrow.xml')`
  (https://docs.expo.dev/versions/v58.0.0/sdk/ui/jetpack-compose/icon/ "Custom styles") — 5
  checked-in XML files + a CLI step on every glyph change.
- SF Symbols (iOS now): nine weights (ultraLight … black) that match the San Francisco text
  weights; regular is the default and visually close to lucide 2.0 (compare-ios.png). Expo UI 58
  can set it: universal `Icon` takes `modifiers`, and `font({ size: 24, weight: 'light' })` from
  `@expo/ui/swift-ui/modifiers` is applied to the SwiftUI `Image` (`ios/ImageView.swift` →
  `applyImageModifiers` → `ViewModifierRegistry` "font"; `src/swift-ui/Image/index.tsx` drops the
  `size` prop when a `font` modifier is present, so size goes into the modifier). `imageScale`
  also exists. Nothing equivalent exists for the Android `Icon` (weight is baked into the XML).

### What others do (platform guidance + comparable apps)

- Apple HIG, tab bars: "Prefer filled symbols or icons for consistency with the platform", and
  switch to the **outlined** variant when the same items live in a sidebar; icon-only tabs only
  for universally recognised symbols such as search or settings
  (https://developer.apple.com/design/human-interface-guidelines/tab-bars). A drawer is the
  sidebar case → outlined `play`, not `play.fill`. SF Symbols weights are meant to match the
  adjacent text weight (https://developer.apple.com/design/human-interface-guidelines/sf-symbols);
  the drawer label is regular/semibold → regular or light symbols, never bold.
- Material 3 navigation drawer: 24 dp icons, outlined for inactive items with the filled
  variant reserved for the active one, all items in one style
  (https://m3.material.io/components/navigation-drawer/guidelines — the page is JS-rendered, the
  outlined/filled pattern was confirmed through M3 component docs mirrors; treat the exact
  wording as unverified). Material's own vocabulary: `play_arrow` (media/"start"), `playing_cards`,
  `cards`, `sports_esports`, `history` (clock + arrow = "recent activity"), `schedule` (plain
  clock = time), `mood`/`waving_hand`, `settings`, `star`.
- SF Symbols vocabulary for the same slots: `play` / `play.fill`, `suit.spade` (+ `.fill`;
  Apple showed the four suits in WWDC21 "What's new in SF Symbols"), `gamecontroller`
  (Apple's Games app), `clock` vs `clock.arrow.circlepath` (Apple's "recents/history" symbol),
  `hand.wave`, `face.smiling`, `info.circle`, `gearshape`, `star`.
- Comparable apps: Microsoft Solitaire Collection uses a single hamburger menu with Hint and
  Undo at the bottom of the screen (https://en.wikipedia.org/wiki/Microsoft_Solitaire_Collection) —
  same structure as Soli; its menu rows are text-first. Mainstream solitaire apps
  (MobilityWare, Brainium) use custom themed icon sets, not platform symbols, which argues for a
  single consistent set over "native per platform" in a card game whose board is fully custom
  anyway.

### Options for the drawer (dock stays lucide — gesture area, see `UndoScrubber.tsx`)

| Option | What | Pros | Cons | Effort |
| --- | --- | --- | --- | --- |
| R1 lucide everywhere (one system) | Drawer back to `lucide-react-native`; `NativeIcon` stays for the header hamburger only; one `ICON_STROKE` constant shared by drawer + dock | Identical glyphs and weight on both platforms and in dock + drawer; the exact "before" look is one line away (stroke 2); lighter look is one number (1.75); no native Hosts in the drawer (5 fewer Compose/SwiftUI views); `drawerIcons.ts` + `Icon.select` go away | Drawer glyphs are not platform symbols (they never matched the JS drawer anyway — react-navigation's drawer is not native) | ~-25 LOC; 20 min + smoke |
| R2 native symbols, tuned | Keep Expo UI `Icon`; iOS: `play` (outlined), `clock.arrow.circlepath`, weight `light` via `font` modifier; Android: wght 300 XMLs via `add-material-symbols` CLI checked into `assets/icons/` | "Native" glyphs per platform; lighter weight achievable | Two glyph sets to keep in sync, 5 vendored XMLs + CLI step, dock (lucide) still a third style, Expo UI `Icon` has no iOS a11y label yet, more LOC than before | ~+40 LOC + assets; 1 h + smoke on both |
| R3 keep as is | Material w400 / SF regular, `play.fill` | zero work | thicker Android look (the thing Karim dislikes), Play filled vs outlined, clock vs history | 0 |

Per-slot picks under R1 (rendered in `options.png`, sets 2/3):

| Slot | Pick | Why | Alternative |
| --- | --- | --- | --- |
| Play | lucide `Play` (outlined triangle) | universal "start", matches HIG sidebar (outlined) and Material `play_arrow`; the old `Atom` meant nothing | `Spade` (card-themed, Set 3) if Soli wants a card identity in the drawer; `Gamepad2` reads "video game" |
| Hello | lucide `Smile` (unchanged) | the row is a friendly about page; `Hand`/`Info` are colder | `Info` if the page becomes a real About |
| History | lucide `History` (clock + ccw arrow; alias of `rotate-ccw-clock`) | the platform-wide "recent activity" glyph on both Material (`history`) and Apple (`clock.arrow.circlepath`); a plain clock says "time" | keep `Clock` for zero change |
| Settings | lucide `Settings` (unchanged) | gear is universal | — |
| Rate Soli | lucide `Star` (unchanged) | store rating metaphor | — |
| Stroke | **2** (= before) or **1.75** for everything incl. dock | 2 restores the exact pre-removal weight; 1.75 is the "slightly lighter" look without going wispy at 20–24 px (1.5 drops below Material 200 and looks faint on the green board) | — |

Recommendation: **R1 with stroke 2** (restores the previous weight 1:1, only Play and History
glyphs change) — or **R1 with stroke 1.75** if Karim wants it a touch lighter; apply the same
constant to the dock so dock and drawer stay one system. R2 only if the native-symbol look in
the drawer is itself the goal; it is not cheaper and not more consistent.

The header hamburger stays `NativeIcon`: it sits in the native-styled header, is 0 px different
from before and from the lucide `Menu` glyph, and is the one place where a platform symbol is
expected.

Not covered here (prompt 4, second paragraph — "what else should I have an eye on"): the
orchestrator's testing-focus list; this section is icons only.

### In-app screenshots of the variants + recommendation (prompt 5)

Captured 2026-10-18 on the real app (Android phone A065 Release, iOS `iPhone 17 Pro` sim
Release), same scrubbed fixture board, via a **temporary dev-only variant switch** (see "Temp
code" below). Sheets in scratchpad `tamagui/icons/inapp/` (full-size originals
`<platform>-<light|dark>-drawer-<set>.png` / `…-menu-<variant>.png` next to them):

| Sheet | Content |
| --- | --- |
| `android-drawer-variants.png`, `ios-drawer-variants.png` | drawer with sets `native` (current) · `native-light` (iOS SF weight light + outlined `play` + `clock.arrow.circlepath`; Android Material Outlined wght 300) · `native-light-200` (Android wght 200; iOS = native-light) · `lucide-175` · `lucide-2` |
| `android-drawer-variants-dark.png`, `ios-drawer-variants-dark.png` | `native`, `native-light`, `lucide-175` in dark mode |
| `ios-menu-variants.png` + `ios-menu-zoom3x.png` | header hamburger: `sf` (current `line.3.horizontal` 24 regular) · `sf-medium` (26 pt, weight medium) · `sf-justify` (`text.justify`) · `sf-sidebar` (`sidebar.leading`) · `lucide-menu` (24 / stroke 2) · `lucide-menu-old` (26 / 2.25 = pre-SDK-57 iOS look) |
| `android-menu-variants.png` + `android-menu-zoom3x.png` | Material `menu` w400 (current) · lucide `Menu` 24/2 · lucide `Menu` 32/2 (pre-SDK-57 Android look) |

Hamburger glyph bounding boxes measured from the screenshots (ink only, no padding):

| Variant | iOS (3× sim) | Android (420 dpi phone) |
| --- | --- | --- |
| SF `line.3.horizontal` 24 regular (current iOS) | 71×36 px = **23.7×12.0 pt, aspect 1.97** | — |
| SF `line.3.horizontal` 26 medium | 78×41 px = 26×13.7 pt, aspect 1.90 | — |
| SF `text.justify` 24 | 71×61 px = 23.7×20.3 pt, aspect 1.16 | — |
| SF `sidebar.leading` 24 | 83×65 px = 27.7×21.7 pt, aspect 1.28 | — |
| Material `menu` w400 24 dp (current Android) | — | 47×33 px = **18×12.6 dp, aspect 1.42** |
| lucide `Menu` 24 / stroke 2 | 54×48 px = 18×16 pt, aspect 1.12 | 47×43 px = 18×16.4 dp, aspect 1.09 |
| lucide `Menu` pre-SDK-57 (iOS 26/2.25, Android 32/2) | 60×52 px = 20×17.3 pt, aspect 1.15 | 64×56 px = 24.4×21.3 dp, aspect 1.14 |

So Karim's "flat and squished" is measurable, not imagined: Apple's hamburger is drawn 2:1
(three lines at text x-height, as wide as a capital), the lucide one he was used to is nearly
square (1.1:1), and Material sits between (1.4:1). Weight (`sf-medium`) makes it bolder but not
taller; `text.justify` is taller but is the "justify text" glyph (4 lines) and `sidebar.leading` is
the iPad/Mac sidebar toggle — both read wrong on a phone drawer.

What the drawer shots show:

- iOS: `native-light` (SF light + outlined `play` + `clock.arrow.circlepath`) is the cleanest
  set — same stroke as the regular-weight labels, outlined Play per the HIG sidebar rule, and the
  history glyph finally says "history". `native` (current) is the same but with the filled Play
  and a plain clock. `lucide-175/2` look heavier than SF light but identical to the dock icons.
- Android: `native-light` (Material Outlined wght 300) reads as the same weight as the old lucide 2
  drawer and fixes exactly what Karim called "too markant" (star, gear hub, history arrow) while
  keeping the smiley and the play triangle he likes. wght 200 is visibly thin next to the labels.
  Material's `play_arrow` is a small triangle (its 24-grid glyph has big margins) — lucide's
  `Play` is bigger; a cosmetic difference, not a bug. Lucide sets look identical to iOS lucide.

**Recommendation (sub-agent, candid):**

| Slot | Pick | Why | Runner-up |
| --- | --- | --- | --- |
| iOS drawer | `native-light`: SF `play`, `face.smiling`, `clock.arrow.circlepath`, `gearshape`, `star`, `font({ size, weight: 'light' })` | Karim already likes the iOS direction; HIG sidebar → outlined; symbol weight matches label weight; zero extra assets | `lucide-175` if "one icon system with the dock" matters more than platform symbols |
| Android drawer | `native-light`: Material Outlined wght 300 (`play_arrow, mood, history, settings, star`), 5 vendored XMLs in `assets/icons/material/` | the native vocabulary Karim is "medium sure" about, at the weight he actually liked (≈ lucide 2) — "embrace native" without the heaviness; same decision principle as iOS | `lucide-175` (identical on both platforms, no XML vendoring) |
| iOS hamburger | keep SF `line.3.horizontal` regular (`sf`) | it is what every SF-Symbol app draws in that slot; the 2:1 shape is the symbol's design, consistent with the rest of the native header. The two SF alternatives mean other things; `sf-medium` only adds weight | lucide `Menu` 24/2 (`lucide-menu`) if the flat shape keeps bothering him — honest, taller, and matches the dock stroke; cost: one non-native glyph in a native header |
| Android hamburger | keep Material `menu` (current) | Material's own top-app-bar nav icon; 1.4:1 is already taller than SF | lucide `Menu` 24/2 only if iOS also switches to lucide (keep the two headers in step) |

Net: R2 (native symbols, tuned) on both platforms — the data from the real app favours it over
R1 now that both light variants are proven to render; R1 (lucide 1.75) stays the one-system
fallback. Decision is Karim's.

Temp code to delete after the pick (all marked `TEMP icon-variant picker (prompt 5)`):

- `src/dev/iconVariant.ts` (whole file), `components/navigation/DrawerGlyph.tsx`,
  `components/navigation/HeaderMenuGlyph.tsx` (whole files; lift the picked variant's rendering
  back into `drawerIcons.ts` / `NativeIcon` / `HeaderMenuButton.tsx`).
- `app/(tabs)/_layout.tsx`: the `DrawerGlyph` import + 4 `drawerIcon` rows → back to `NativeIcon` + `DRAWER_ICONS`.
- `components/navigation/AppDrawerContent.tsx`: `DrawerGlyph` import + the Rate row icon.
- `components/navigation/HeaderMenuButton.tsx`: `HeaderMenuGlyph` import/usage → restore the `MENU_ICON` `Icon.select` + `NativeIcon` (see git diff).
- `src/features/klondike/hooks/useDemoGameLauncher.ts`: the `applyIconVariantLinkParams` import + the 7-line block at the top of `processDemoLink`.
- `assets/icons/material/*_wght200.xml` (and the `_wght300` ones unless Android picks `native-light`).

Deep links used (warm, after `yarn scrubtest`): `yarn deeplink 'soli://?iconset=<set>'` and
`yarn deeplink 'soli://?menuicon=<variant>'` (`--ios` for the sim); no dev-mode change.

### Decision board (prompt 6)

Implementation + capture sub-agent, 2026-10-18. Karim's picks from prompt 5 are now
**hard-coded** (no longer switchable):

| Decided | Where | Note |
| --- | --- | --- |
| iOS drawer = `native` (SF regular: `play.fill`, `face.smiling`, `clock`, `gearshape`, `star`) | `components/navigation/drawerIcons.ts` | "the first one" — regular weight, filled Play, plain clock |
| Android drawer = `native-light` (Material Outlined **wght 300**: `play_arrow, mood, history, settings, star`) | `drawerIcons.ts` + the 5 vendored `assets/icons/material/*_wght300.xml` | package only ships w400; 300 matches the label weight (≈ old lucide 2) |
| Hamburger = native on both (SF `line.3.horizontal` regular / Material `menu`) | `components/navigation/HeaderMenuButton.tsx` (`MENU_ICON` + `NativeIcon` restored) | `HeaderMenuGlyph.tsx` deleted, w200 XMLs + lucide drawer code deleted |

Still open, switchable in the real app via the TEMP picker (`src/dev/iconVariant.ts`,
`soli://?playicon=<id>` / `soli://?headeraction=<id>`, warm links after `yarn scrubtest`):

**P — drawer Play glyph** (`components/navigation/DrawerGlyph.tsx`, Android XMLs w300 via
`npx add-material-symbols -w 300 [--fill] -o assets/icons/material …`; SF names verified against
`sf-symbols-typescript` + rendered on the sim, Material names verified in `@expo/material-symbols`
0.1.1 — Material has NO suit glyphs, only `playing_cards`/`cards`/`style`/`cards_stack`/`poker_chip`/`casino`):

| Id | iOS (SF) | Android (Material Outlined w300) | Metaphor |
| --- | --- | --- | --- |
| P1 (current) | `play.fill` | `play_arrow` | play, outlined small triangle on Android |
| P2 | `play.fill` (same as P1) | `play_arrow` FILL 1 | filled triangle = matches iOS |
| P3 | `play.circle` | `play_circle` | play in a circle (full 24-grid footprint) |
| P4 | `suit.spade.fill` | `playing_cards` | card suit / fanned cards |
| P5 | `rectangle.portrait.on.rectangle.portrait.fill` | `style` | stacked cards |
| P6 | `gamecontroller.fill` | `sports_esports` | game |

**H — Play-screen header New Game / Demo** (`components/navigation/HeaderActionVariants.tsx`,
`HeaderMaterialButton(.android).tsx`, `HeaderActions` in `app/(tabs)/index.tsx`; a11y label
`Start a new game` / `Demo` in every variant):

| Id | Android | iOS |
| --- | --- | --- |
| H1 (current) | router `HeaderButton` text (`HeaderTextButton`) | same |
| H2 | tonal grey pill = pre-removal Tamagui `Button $3` look (`AppButton`) | same component |
| H3 | native Material 3 `FilledTonalButton` (Expo UI Jetpack Compose `Host matchContents` in the header) | falls back to H1 |
| H4 | icon action Material `add` | SF `plus` |
| H5 | icon action Material `shuffle` (= dock New Game metaphor) | SF `shuffle` |

Captured 2026-10-18 on the real app (Android phone A065 Release versionCode 16 via `yarn release`;
iOS `iPhone 17 Pro` sim, iOS 27.0, Release — a clean `yarn ios` of the same tree was already
running when this started, so its install was reused after verifying the picker worked),
scrubbed fixture (`yarn scrubtest`), light mode + iOS dark. Everything is in scratchpad
`tamagui/icons/decision/`:

| File | Content |
| --- | --- |
| `decision-board.png` | ONE overview: (A) decided drawer + hamburger before/after per platform incl. dark · (B) P1–P6 Android row, iOS row, iOS dark P3/P2 · (C) Android BEFORE (Tamagui pill) / H1 / H2 / H3, iOS H1 / H2 / H4 / H5, with a recommendation line per open row |
| `play-options.png`, `header-options.png` | rows B / C alone |
| `shots/<platform>-<light\|dark>-drawer-<pN>.png`, `shots/<platform>-<light\|dark>-header-<hN>.png` | full-size originals (`android-dark-drawer-p1.png` is the prompt-5 `native-light` capture — identical set) |
| `android-capture.sh`, `ios-capture.sh`, `make-specs.py`, `board.py`, `notes.json` | capture + PIL composition scripts (`python3 -I`) |

**Gaps (phone left the network mid-capture — no ping, no mDNS, `android-ready.sh` could not
reconnect):** Android `h4`/`h5` (light) and Android dark `p3`/`p2`/`h1` were not captured; the
iOS tiles show the same glyphs. Re-capture once the phone is back:
`scripts/android-ready.sh && yarn scrubtest && ./android-capture.sh light -- h4 h5 && ./android-capture.sh dark p3 p2 -- h1`
(then `adb shell cmd uimode night no`), rerun `make-specs.py` without the two "not captured"
edits + `board.py`. Also still to restore on the phone: the keep-awake screen timeout
(`adb shell settings put system screen_off_timeout 60000`); light mode was already restored.
Phone Scoring/Warnings settings were not touched by this run (fixture links only).

**Recommendation (candid):**

| Open | Pick | Why | Runner-up |
| --- | --- | --- | --- |
| P | **P3** `play.circle` / `play_circle` | fills the 24-dp grid on both platforms (Material's bare `play_arrow` has a big built-in margin, hence "too small"), keeps the universal "play" meaning, both platforms finally look the same | P4 if a card identity matters — but `playing_cards` is busy at 24 dp and the platforms diverge (spade vs card); P2 is the minimal fix (filled, matches iOS) but stays small; P5 reads "copy" on iOS; P6 reads "video game" |
| H | **H1** text on both | the native bar pattern on both platforms (iOS bar item / M3 top-app-bar text action); in production only "New Game" is visible (Demo is dev-only), so it is less crowded than the dev shots | Android H3 (native M3 `FilledTonalButton`; the green tint is the Material theme colour, settable to grey via `colors`) if Android should be more prominent; H2 = the exact old look but a hand-drawn pill in a native bar; H4 `+` is the iOS "new" convention, H5 shuffle matches the dock metaphor |

Gates after the change: `yarn typecheck && yarn lint && yarn jest --runInBand` green
(45 suites). Nothing committed/staged.

Temp code to delete after the pick (all marked `TEMP decision picker (prompt 6)`):

- `src/dev/iconVariant.ts` (whole file) + its import/7-line block in `useDemoGameLauncher.ts`.
- `components/navigation/DrawerGlyph.tsx`: `PLAY_ICON_CANDIDATES` + the store read → plain
  `NativeIcon name={DRAWER_ICONS[slot]}` (fold the winner into `drawerIcons.ts`); delete the
  losing `assets/icons/material/{play_arrow_fill,play_circle,playing_cards,style,sports_esports}_wght300.xml`.
- `components/navigation/HeaderActionVariants.tsx`, `HeaderMaterialButton.tsx`,
  `HeaderMaterialButton.android.tsx`: keep only the winner (fold into `HeaderTextButton.tsx` or
  its own component); `HeaderActions` in `app/(tabs)/index.tsx` back to the plain two rows.

### Final decisions, implemented (prompt 7)

Implementation + verification sub-agent, 2026-10-18 evening. Karim's picks are hard-coded; the
TEMP decision picker is gone.

| Decision | Implementation | Where |
| --- | --- | --- |
| Header New Game / Demo: iOS = H1 (router text action, unchanged), Android = H3 (native Material 3 `FilledTonalButton`) | `components/navigation/HeaderActionButton.tsx` (= `HeaderTextButton`, iOS/default) + `HeaderActionButton.android.tsx` (Expo UI Jetpack Compose `Host matchContents` → `FilledTonalButton`, `colors` pinned to the neutral `button*` palette greys instead of the Material You wallpaper tint, `semantics({ contentDescription })` = a11y handle `Start a new game` / `Demo`). `HeaderActions` in `app/(tabs)/index.tsx` is back to two plain rows | AGENTS/skill a11y row updated |
| Drawer label alignment | `NativeIcon`: when `size` is given the outer `View` is a fixed `size`×`size` slot with the Host centred. Root cause: `Host matchContents` takes the glyph's intrinsic width and SF Symbols at 24 pt differ by up to 8 pt (`play.fill` 18 pt … `star` 26 pt) → five label x positions on iOS. Android's Compose `Icon` already applies `Modifier.size`, so it was aligned (±1 px) before; the slot is kept on both for one code path. `DrawerGlyph.tsx` deleted, `_layout.tsx`/`AppDrawerContent.tsx` use `NativeIcon name={DRAWER_ICONS.x}` directly again | `components/NativeIcon.tsx` |
| Play glyph size | Android: `assets/icons/material/play_arrow_wght300.xml` hand-cropped — viewport 960 → 680, path coordinates shifted −140 (a `<group translate>` is NOT an option: Expo UI's runtime `ImageLoader.kt` parses `<path>` only, "groups not yet supported"). Target: ink height ≈ 0.92 × the other glyphs' mean (a triangle reads bigger than its box). A larger `size` was rejected because it would overflow the 24 dp slot/Host. iOS `play.fill` left as is (numbers below) | comment in the XML + `drawerIcons.ts` |
| TEMP picker removed | deleted `src/dev/iconVariant.ts`, `components/navigation/{DrawerGlyph,HeaderActionVariants,HeaderMaterialButton,HeaderMaterialButton.android}.tsx`, the launcher's `applyDecisionLinkParams` import/block (`?playicon=`/`?headeraction=` link family gone), `assets/icons/material/{play_arrow_fill,play_circle,playing_cards,style,sports_esports}_wght300.xml`. `grep -rn "iconVariant\|DrawerGlyph\|HeaderActionVariants\|HeaderMaterialButton\|playicon\|headeraction\|PLAY_ICON_CANDIDATES"` over app/components/src/test/scripts/.agents → no hits. Remaining XMLs: the five w300 drawer icons | — |

Gates after the change: `yarn typecheck` ✅, `yarn lint` ✅ (exit 0), `yarn jest --runInBand` 45 suites /
458 tests ✅, oxfmt on the 8 touched files (`yarn format:check` still lists 26 pre-existing,
untouched files). Nothing committed/staged.

Device measurements: see "Final verification (prompt 7)" under Testing.

### Optical balance + Android dynamic colour (prompt 8)

Implementation + verification sub-agent, 2026-10-18 night. Karim: "make all the icons visually
look good and proportional to each other … the demo and new game buttons were kind of light
green, which I kind of enjoyed … icon sizes for iOS just make them look good and proportional".

**1. Android header buttons: Material You default instead of pinned greys.** The light green
Karim liked was the prompt-6 H3 candidate before `colors` pinned the Tamagui-pill greys.
Verified in `@expo/ui` 58.0.20 (`android/src/main/java/expo/modules/ui/HostView.kt`,
`colors/*.kt`, `button/Button.kt`, `Utils.kt`):

| Question | Answer |
| --- | --- |
| Default scheme | `Host` without `colorScheme`/`seedColor` → `ExpoColorScheme.defaultColorScheme`: `dynamicLightColorScheme(context)` / `dynamicDarkColorScheme(context)` when `isDynamicColorSupported` (= `Build.VERSION.SDK_INT >= S`, API 31), wrapped in `MaterialExpressiveTheme`. A tonal button with `colors` omitted passes `Color.Unspecified` (`Color?.compose` on null) to `ButtonDefaults.filledTonalButtonColors`, i.e. Material's `secondaryContainer` / `onSecondaryContainer` — the wallpaper-derived tint (green on Karim's phone, since his wallpaper seeds a green palette) |
| Fallback < API 31 | `lightColorScheme()` / `darkColorScheme()` = the baseline Material 3 purple scheme (secondaryContainer `#E8DEF8`, on it `#1D192B`). Soli's minSdk is Expo SDK 58's default 24, so Android 7–11 devices see purple-tinted buttons. Accepted: the share of such devices is small and it is still the platform default look |
| Settings consistency | `app/(tabs)/settings.tsx` hosts the `FieldGroup` in a plain `<Host style={{ flex: 1 }}>` — no scheme props either, so switches/pickers and the header buttons always come from the same scheme (dynamic or baseline, light or dark) |
| Dark contrast | Material's dynamic dark `secondaryContainer`/`onSecondaryContainer` pair is generated at tones 30/90 (≥ 4.5:1 by construction, same as the light 90/10 pair); measured on the phone in the Testing entry below |

Trade-off (in the code comment too): the tint differs per device/wallpaper and may clash with
the green board for some wallpapers; the fix would be `Host colorScheme`/`seedColor` or the
pinned greys again — both one-liners.

**2. Drawer glyph optical balance.** Mechanism: `DRAWER_ICONS` entries are `{ name, scale }`;
`NativeIcon` draws the glyph at `Math.round(size * scale)` while the slot stays `size` (24), so
row height and label x are untouched; glyphs larger than the slot overflow visibly (no
clipping on either platform — verified). Measurement: `balanced/scripts/ink.py` (ink bbox,
contrast-weighted ink pixels, row-span silhouette area). Rule — perceived size P =
√(ink height × √silhouette area), the midpoint between "equal extent" and "equal area": that
is what Material's keyline shapes encode (circle 20 dp, square 18 dp, rectangle 20×16 on the
24 dp grid — [Material system icons](https://m2.material.io/design/iconography/system-icons.html);
P(circle) = 18.8, P(square) = 18.0) and what Apple's optically weighted symbols do
([HIG: SF Symbols](https://developer.apple.com/design/human-interface-guidelines/sf-symbols)).
Reference = the circle glyphs (Hello/History on iOS, Hello on Android). Filled vs outline:
ink pixels are the weight proxy — a filled glyph gets no pointed-shape bonus.

| Glyph | iOS before (px @3×) → P | iOS scale → size | Android before (px @2.625) → P | Android scale → size |
| --- | --- | --- | --- | --- |
| Play | 53×59, ink 1389, sil 1843 → 50 (0.74×) | **1.2 → 29 pt** (height = circle; no +10 % pointed bonus: already the heaviest ink per pt) | 36×45, ink 420, sil 834 → 36 (0.76×) | **1.3 → 31 dp** (outline stroke scales too → weight and extent fixed together) |
| Hello | 72×72, ink 1511, sil 4082 → 68 (ref) | 1 → 24 | 51×51, ink 811, sil 1981 → 48 (ref) | 1 → 24 |
| History | 72×72, ink 1494 → 68 | 1 → 24 | 45×45, ink 656, sil 1467 → 42 (0.87×) | **1.125 → 27 dp** |
| Settings | 75×75, ink 1907, sil 4028 → 69 | 1 → 24 | 49×51, ink 939, sil 1715 → 46 (0.97×) | 1 → 24 |
| Rate (star) | 79×75, ink 1448, sil ≈ 3550 (hull) → 67 | 1 → 24 (Apple's own balance; widest glyph already) | 45×43, ink 536, sil ≈ 1160 (hull) → 38 (0.80×) | **1.167 → 28 dp** |

(silhouette for the star = 0.6 × bbox, the pentagram hull; the row-span measure underestimates
pointed shapes.) Expected after: iOS Play ≈ 64×71 px; Android Play ≈ 47×58, History ≈ 51×51,
Star ≈ 52×50 px. Verified numbers: Testing entries "Optical balance (prompt 8)".

Header proportions checked, not changed: iOS hamburger `line.3.horizontal` 24 pt regular next
to the 17 pt semibold title and 17 pt regular text actions = the stock UINavigationBar
proportions; Android `menu` 24 dp next to the 20 sp title and the tonal button's 14 sp
`labelLarge` = stock M3 top app bar + button.

### iOS dark-mode `face.smiling` (prompt 9)

Implementation + simulator-verification sub-agent, 2026-10-18 night. Karim: "fix the iOS
dark-mode face.smiling rendering so it matches the outlined look in light mode".

**Root cause (verified against installed sources, not Expo UI's doing).** The system symbol
catalog (`/System/Library/CoreServices/CoreGlyphs.bundle/Contents/Resources/Assets.car`,
macOS 27.0.1 = the same SF Symbols generation as the iOS 27.0 sim; dumped with
`assetutil --info`) ships, for 69 symbol renditions, an explicit `NSAppearanceNameDarkAqua`
variant — exactly the symbols that have an `.inverse` twin: `face.smiling`, `eyes`,
`moonphase.*`, `printer*`, `soccerball*`, `wand.*`, `lamp.ceiling`, `light.recessed*`,
`pianokeys`, `circle.*half.filled*`, `slider.horizontal.below.circle.*`, `swirl.circle.*` (and
their `.inverse` forms). For `face.smiling` the dark rendition IS the filled face (white disc,
cut-out eyes/mouth); `face.smiling.inverse` flips the other way (filled in light, outline in
dark); `face.smiling.fill` has no catalog entry of its own and renders outline in dark.
`clock`, `gearshape`, `star`, `line.3.horizontal`, `play.fill` have no dark rendition → identical
in both schemes, which is why only Hello looked wrong. Expo UI 58.0.20 (`ios/ImageView.swift`
→ `Image(systemName:variableValue:)`, `src/swift-ui/Image/index.tsx` adding only `font` +
`foregroundStyle`; `applyImageModifiers` handles `resizable` only, the rest goes through
`UIBaseView.applyModifiers`) does nothing scheme-specific — it is the OS's asset lookup.

Rendering-mode knobs tried with SwiftUI `ImageRenderer` on macOS (`smiley/sui.swift`,
`smiley/sui-sheet.png`): `symbolRenderingMode(.monochrome)` / `.hierarchical`,
`symbolVariant(.none)` / `.fill` — all still filled in dark. `.environment(\.colorScheme,
.light)` on the image → outline in dark (white, since the colour is explicit). `smiley`
(SF 1, 2019) has no dark rendition and is outlined in both schemes.

**Fix.** `components/NativeIcon.tsx`: on iOS the `Icon` gets `modifiers={[environment({ key:
'colorScheme', value: 'light' })]}` (Expo UI's `environment` modifier, `@expo/ui/swift-ui/
modifiers`, registered as `"environment"` in `ViewModifierRegistry.swift` →
`EnvironmentModifier.swift` `.environment(\.colorScheme, …)`). Applied generally — every
NativeIcon glyph renders its light-scheme shape; the colour was always explicit, and `color` is
now a required prop (`Required<Pick<IconProps, 'color'>>`) because without it the glyph would
take the light-scheme primary (black) on the dark background. Android untouched (`undefined`
modifiers, as before — an iOS modifier would be an unknown `$type` for Compose). Alternative
rejected: swap to `smiley` — keeps Apple's intent but changes the glyph Karim picked; the
environment pin is one line and explicit about what it overrides. Verified numbers: Testing
entry "face.smiling dark mode (prompt 9)".

## Follow-ups

| Item | Pros | Cons | Recommendation |
| --- | --- | --- | --- |
| AGENTS.md "Components" rule → "Use Expo UI (preferred where a native Host fits: forms, sheets, icons, native controls) or React Native primitives wrapped with defaults in `components/` (`AppText`, `AppButton`, `NativeIcon`, `HeaderTextButton`); the game board stays RN `StyleSheet` + Reanimated. No raw `Text`/`Pressable` styling in screens where a wrapper exists." | matches reality after this plan | — | Done 2026-10-18 (approved by Karim) |
| AGENTS.md "About the codebase": "Native-only (iOS + Android). No web target: no `react-native-web`, no `yarn web`, no `.web.tsx` files; dev tooling that needs a browser is out of scope." Also drop "Package guides" mention of Tamagui if any | makes the existing "Native-only" statement checkable | — | Done 2026-10-18 (approved by Karim) |
| Card-adjacent system-font text (empty foundation glyph, "Draw N", "N left", empty labels) → `CardTextAndroid` | device-independent like the cards | the glyph font has only rank/suit glyphs + digits? — check coverage first; may need the font rebuilt | Small separate task after this lands; measure before changing |
| Expo UI `Button` for History sheet Retry/Share | fully native buttons | nested Host inside `RNHostView`; Android gesture history | Try once after this lands (one call site); keep `AppButton` if flaky |
| Expo UI `List`/`ListItem` for History | native list look like Settings | no pagination API yet | Re-check each SDK |
| `STACK_PADDING` 8 vs `$2` 7 | one source of truth for the root padding | 1 px board shift to re-approve | Fold into the card-adjacent text task |
| Remove `react-test-renderer` tests → `@testing-library/react-native` | React deprecation | — | Separate small task (from SDK 58 plan) |
