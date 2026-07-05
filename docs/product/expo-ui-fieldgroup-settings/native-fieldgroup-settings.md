# Expo UI FieldGroup Settings Native Form

## User prompt

```text
about 2: i am fully happy if we just display the content that we have in the history sheet and adjust the height to this. this is not a very thought through area at all at the moment. therefore i don't think it makes sense to touch this. does this make sense or do you see this differently?
implement 3. needs new implementation plan.
```

```text
Continue.
Also focus on design. Doesn't look good at the moment
```

```text
i am not sure about the design change, still. take a step back. please search web. find discussions. what's the best practice for settings? how it this usually done? what are comments on expo fieldset? is this intended for settings?
```

```text
ok just checked out some stuff. it might make sense because it looks closer to default native.
but current version is not good. please think this through. how should it look? how are the fonts? possible to take something completely native? should we rethink some of the settings and settings combinations? to make it fully work as intended? take a step back. take creative freedom. research. find and implement optimal solution. give me alternatives in reply. goal: as native as possible with little code customization.
```

```text
I like the new design and I like the choices. Quick question, should we still have a helper text below for a couple of things? What do you think? And so the draw selector I definitely really like, and that's definitely an improvement, at least on iOS. I haven't checked on Android yet. Please also move the burger menu consistently to the left here in the settings. Also in other places like game history and hello. So it's like in play. Also check what the size of this should be because this seems different in different places. Please also just like research best practices, how others are doing, where it should be, what the size of it should be. Intuitively, it should be bigger, but I might be wrong. Please let me know. Thank you very much.
```

```text
Is the font now fully native? Like, do we specify anything at all, or is this fully driven by Expo? This is number one. Number two is the draw select on Android looks, I don't know, I don't like it. Maybe it's right, please correct me if I'm wrong, but please think about whether it could or should maybe be a bit different. Third, now that I think about it, I don't think we need the helper text. I think it's actually clear enough without the helper text. What do you think? Please challenge me here. And third is the burger icon that we just changed. Tamakuy, like, lucid icon, and does Expo have, like, native, like, fully native icons here as well that we can maybe choose with that? I think that would be better. And then we also don't need to think about, I guess, the DP or whatever, because then we just do it, like, do it right. Yeah. And the question, now we have the burger menu on the left for Android and iOS. My thinking was, and I'm not sure here, is that for Android, the, like, fully native pattern is to have it on the right, and for iOS on the left. Please research your best practices and implement kind of the most native look and feel, because, like, users are used to whatever is the standard on their thingy, and implement it accordingly. And on Android, the safe area doesn't work, so there's in, like, the dock area, like, the bottom navigation of, like, the system has an overlay, so you don't see the, like, there's an overlap with the lowest setting. And please make sure this works as well and restore that functionality. Thank you very much.
```

```text
export const IOS_HEADER_CONTROL_SIZE = 44
const ANDROID_HEADER_CONTROL_SIZE = 48
export const IOS_HEADER_LEADING_PADDING = 4

export const HEADER_MENU_LEADING_PADDING =
  Platform.OS === 'ios' ? IOS_HEADER_LEADING_PADDING : 0

const HEADER_MENU_CONTROL_SIZE =
  Platform.OS === 'android' ? ANDROID_HEADER_CONTROL_SIZE : IOS_HEADER_CONTROL_SIZE
const HEADER_MENU_ICON_SIZE = 24

const MENU_ICON = Icon.select({
  ios: 'line.3.horizontal',
  android: import('@expo/material-symbols/menu.xml'),
})


Are these values fully native? could they be managed natively? i think the icon was larger before this change. at least on android. and it was kinda nice. what's the best practice here?

draw count should remain setting because it's really something you choose because you like it and you stick with it.

should native settings form be it's own file? right now, settings is just more or less completely empty.
```

```text
would expo stack toolbar also fix this? let's try? how big of maintenance work would this be once it becomes stable? should we just leave upgrade note for future expo upgrade that we should check the api?

also different question: is it possible that on ios, the settings are a bit cut off on the bottom (see screenshot)
```

## Description

Replace the visually heavy FieldGroup prototype with a stricter native-first Settings
screen.

The previous prototype moved Settings into Expo UI `FieldGroup`, but it still carried
too much app-owned design: custom section header typography, custom footer colors, a
hosted Tamagui/React Native draw-count selector, and explanatory copy that made the
screen feel more designed than native. The new direction is to let Expo UI and the
platforms carry the design:

- One full-height Expo UI `Host`.
- One native `FieldGroup` that owns scrolling and grouped-list surfaces.
- Default `FieldGroup.Section title` headers.
- Direct native `Switch label` rows.
- Native universal `Picker` for draw count.
- No custom fonts, custom section colors, or manual row chrome.

Settings should read like a small native preference screen, not a custom dashboard.
Copy should be short enough that individual row labels work without descriptions. The
one product trade-off is draw count: moving from a visible segmented control to a native
picker is a behavior change, but it is the cleanest way to meet the user's current goal
of "as native as possible with little code customization."

History remains out of scope. Its content-sized Expo UI sheet already matches the
current product requirement.

Follow-up: keep the accepted native settings direction, add only sparse helper text
where a setting's timing or dependency is ambiguous, and make the drawer/menu button a
consistent leading header control across Play, Settings, History, and Hello. Header menu
size should follow platform tap-target guidance rather than simply enlarging the glyph.

Second follow-up: simplify again after Android review. The Settings content itself should
stay native-font driven by Expo UI. Remove helper footers because the section labels are
clear enough, restore Android bottom safe-area protection, replace the SVG/Lucide
hamburger with Expo UI's native icon bridge, and keep draw count on the universal native
`Picker` until Expo UI exposes a compact settings-row selector that works reliably inside
`FieldGroup`.

Third follow-up: let Expo UI choose the menu glyph's intrinsic 24-unit size while keeping
explicit 44pt iOS and 48dp Android control minima plus the iOS 4pt optical inset. Those
dimensions are deliberate React Navigation integration geometry, not values managed by
the native icon. Keep draw count as a durable player preference in Settings. Fold the
screen-specific native form into `app/settings.tsx`, while retaining
`DrawCountPreference` as the boundary around the nontrivial native Picker trade-off.

Fourth follow-up: prototype `Stack.Toolbar` against the current Drawer-owned visible
headers before making any navigation changes. Keep it only if it replaces the shared
menu button as a true drop-in and preserves the drawer plus existing actions. Otherwise,
remove the prototype and leave a dated Expo-upgrade follow-up because API stability alone
does not change navigator ownership. Separately validate the absolute bottom of the iOS
native Settings form on a clean build; change layout only if the final row cannot scroll
fully above the home indicator.

## Acceptance Criteria

- A current implementation plan exists before the new application-code changes.
- Settings renders through Expo UI native components rather than Tamagui layout.
- The screen uses a single full-height `Host` and a single `FieldGroup`.
- `FieldGroup` owns the scroll container; no outer React Native `ScrollView` remains.
- Section titles use `FieldGroup.Section title` instead of custom text wrappers.
- Boolean settings use universal `Switch` with its native `label` prop.
- Draw count uses universal `Picker` with `Draw 1` through `Draw 5` items.
- Draw-count updates still pass through `normalizeDrawCount`.
- Hydration disables controls until persisted settings load.
- Developer mode still conditionally reveals advanced animation tuning.
- Individual animation switches are disabled while the master animation switch is off,
  matching the native pattern for dependent settings.
- Current settings state, persistence, defaults, and game behavior do not change.
- Obsolete settings-only custom UI wrappers are removed when no longer used.
- Documentation records the design decision, source research, alternatives, and testing.
- Helper text is removed again unless a future setting is truly unclear without it.
- The drawer/menu button appears in the leading header slot on Play, Settings, History,
  and Hello.
- The drawer/menu button remains in the leading header slot on Android and iOS because
  Android's native top-app-bar `navigationIcon` is leading/left and actions are trailing.
- The drawer/menu visual icon uses Expo UI's native `Icon`: SF Symbol on iOS and Material
  Symbol XML on Android.
- Settings content does not specify custom font family, font size, or font weight.
- Android draw count remains on universal `Picker` even though its exposed-dropdown
  text-field appearance is not ideal, because lower-level row/menu/segmented/slider
  alternatives rendered but did not receive nested gestures reliably inside Android
  `FieldGroup`.
- iOS draw count keeps the native `Picker` menu that visually worked well.
- The rejected Android draw-count alternatives are documented for future Expo UI follow-up.
- Android Settings content clears the system navigation bar/dock area at the bottom.
- New dependency is limited to `@expo/material-symbols` so Expo UI can render native
  Material Symbol XML assets on Android.
- Header menu glyph sizing is omitted so SF Symbols and Material Symbol XML use their
  native/intrinsic 24-unit default.
- Explicit 44pt iOS and 48dp Android header control minima remain for accessible React
  Navigation integration geometry.
- The iOS 4pt leading inset remains as app-owned optical alignment, not a native value.
- Draw count remains a persistent setting because it represents a durable player
  preference rather than a per-game choice.
- The screen-specific native Settings form is folded into `app/settings.tsx`.
- `DrawCountPreference` remains separate because it isolates the native Picker trade-off.
- A minimal `Stack.Toolbar` prototype establishes whether a Stack toolbar item can replace
  the menu control in the current Drawer-owned header without nested stacks.
- A rejected toolbar prototype leaves no production code behind and records concrete
  source/runtime evidence plus a dated Expo-upgrade re-check note.
- Future migration maintenance is estimated from the actual four routes, shared button,
  existing actions, navigator ownership, and native validation surface.
- A clean iOS build verifies whether the final Settings row scrolls fully above the home
  indicator; no safe-area change is made for an intermediate scroll position.
- No staging or commits.

## Possible approaches incl. pros and cons

### A. Revert to the old Tamagui screen

- Pros: known behavior; visible segmented draw-count selector remains unchanged.
- Pros: rich descriptions are easy to present.
- Cons: not very native; keeps manual layout, separators, spacing, and one-Host-per-switch
  islands.
- Cons: misses the user's current goal after seeing that FieldGroup is closer to native.

Decision: reject for now. It is the fallback if native validation exposes a serious Expo
UI limitation.

### B. FieldGroup plus hosted segmented draw-count control

- Pros: preserves the visible Draw 1-5 choice.
- Pros: mostly native grouped rows.
- Cons: still needs `RNHostView`, width math, Tamagui text, and custom typography inside
  the most important row.
- Cons: mixed rendering is exactly where the current prototype feels least settled.

Decision: reject for this pass. The user asked whether we can take something completely
native; use the native picker instead.

### C. Pure Expo UI FieldGroup with native Picker and Switch rows

- Pros: smallest code surface and closest to Expo UI's intended settings composition.
- Pros: uses system fonts and platform-native controls.
- Pros: removes custom section typography, custom color tuning, RNHostView, and the
  settings-only segmented selector component.
- Cons: draw count becomes a picker/menu rather than five always-visible segments.
- Cons: Expo UI `Picker` is still young; Android renders as a Material exposed dropdown,
  which must be checked visually in context.

Decision: implement.

### D. Move draw count out of Settings entirely

- Pros: draw count is a game rule; choosing it in a New Game flow may be more honest
  than burying it as a persistent preference.
- Pros: could reduce Settings to mostly display/advanced preferences.
- Cons: larger product change; requires New Game UI work and more testing.
- Cons: not necessary to fix the current design pass.

Decision: reject. Draw count represents a durable player preference that should persist
across games, so Settings is its appropriate home.

### E. Let Stack.Toolbar own header item geometry

- Pros: native toolbar items can own more of their layout and sizing.
- Cons: the API is alpha and applies to Stack-owned headers, while Soli's visible main
  headers are Drawer-owned.
- Cons: restructuring navigation would greatly exceed this visual follow-up.

Decision for the fourth follow-up: rejected after a one-screen runtime prototype. With
the current Drawer `headerLeft` cleared, a page-level left `Stack.Toolbar` registered but
rendered no item in the visible Settings header. Installed Router source confirms the
composition registry is consumed by native Stack descriptors keyed to Stack routes; the
nearest Settings route is owned by the nested Drawer and its key does not match the parent
Stack's `(tabs)` descriptor. Retain the current React Navigation integration and do not
add nested stacks for this icon.

## Open questions to the user

No blocking question. Recommended default for this implementation:

- Use native `Picker` for draw count now, because the current goal is native defaults and
  minimal customization.
- Mention the visible segmented selector as an alternative in the final reply. If it
  proves clearly better during product review, it can return as a deliberate exception.
- Treat `Stack.Toolbar` as an evidence-gathering prototype, not a committed migration.
- Treat Settings content below the viewport as normal scroll content unless the absolute
  final row cannot clear the iOS home indicator.

## Dependencies

New dependency:

- `@expo/material-symbols`: native Material Symbol XML assets for Expo UI `Icon` on
  Android.

Package guide:

- `docs/external-package-guides/expo-ui.md`
- `docs/external-package-guides/expo-router.md`
- `docs/external-package-guides/expo-material-symbols.md`
- `docs/external-package-guides/react-native-safe-area-context.md`

Primary research sources refreshed 2026-07-05:

- Expo UI overview: https://docs.expo.dev/versions/latest/sdk/ui/
- Expo UI FieldGroup: https://docs.expo.dev/versions/latest/sdk/ui/universal/fieldgroup/
- Expo UI Picker: https://docs.expo.dev/versions/latest/sdk/ui/universal/picker/
- Expo UI Switch: https://docs.expo.dev/versions/latest/sdk/ui/universal/switch/
- Expo UI Text: https://docs.expo.dev/versions/latest/sdk/ui/universal/text/
- Expo FieldGroup PR: https://github.com/expo/expo/pull/44814
- Expo UI changelog: https://github.com/expo/expo/blob/main/packages/expo-ui/CHANGELOG.md
- Apple Settings HIG: https://developer.apple.com/design/human-interface-guidelines/settings
- Android settings guidelines: https://source.android.com/docs/core/settings/settings-guidelines
- Material settings pattern: https://m1.material.io/patterns/settings.html
- Expo Router Drawer: https://docs.expo.dev/router/advanced/drawer/
- Expo Router Stack Toolbar: https://docs.expo.dev/router/advanced/stack-toolbar/
- React Navigation header buttons: https://reactnavigation.org/docs/header-buttons/
- Android top app bars: https://developer.android.com/develop/ui/compose/components/app-bars
- Android accessibility API defaults: https://developer.android.com/develop/ui/compose/accessibility/api-defaults
- Apple Buttons HIG: https://developer.apple.com/design/human-interface-guidelines/buttons
- Expo UI Icon: https://docs.expo.dev/versions/latest/sdk/ui/universal/icon/
- Expo Symbols: https://docs.expo.dev/versions/latest/sdk/symbols/
- React Navigation safe areas: https://reactnavigation.org/docs/handling-safe-area/
- React Native Safe Area Context: https://docs.expo.dev/versions/latest/sdk/safe-area-context/

## UX/UI Considerations

- Use native system fonts by default. Do not set `fontFamily`, custom font sizes, custom
  weights, or custom header colors for normal Settings rows.
- Keep labels short and state-like:
  - `Cards drawn`
  - `Solvable deals`
  - `Auto Up`
  - `Move counter`
  - `Game timer`
  - `Developer mode`
- Group by user intent:
  - `New Games`: persistent rules copied into the next new game.
  - `Gameplay`: live/gameplay assistance.
  - `Statistics`: optional HUD information.
  - `Advanced`: developer-only access.
  - `Animations`: appears only when developer mode is on.
- Avoid secondary text unless a setting is ambiguous. This matches Android/Material
  guidance that secondary text should explain state only when needed.
- Do not use helper copy for the current sections. `New Games`, `Gameplay`, and
  `Developer` are clear enough, and the extra footer height makes Android bottom spacing
  worse.
- Start without Soli's green `Host.seedColor` so the first result is truly platform
  default. Re-add it only if side-by-side screenshots feel too generic.
- Do not add a hero, cards, explanatory intro copy, icons, or app-branded styling to
  Settings.
- Put the drawer/menu button in the leading/navigation header slot. Keep screen actions
  such as New Game and Demo on the trailing side.
- Put the drawer/menu button in the leading/navigation header slot on Android too. Android
  top-app-bar docs define `navigationIcon` as left/leading and `actions` as right/trailing.
- Prefer Expo UI native icons over Tamagui/Lucide for the drawer/menu glyph.
- Let Expo UI `Icon` use its intrinsic/default 24-unit glyph size; do not enlarge the
  glyph merely because the old Android Lucide icon was 32.
- Keep a 44pt iOS / 48dp Android press target around that glyph. React Navigation's
  header button does not supply the full iOS minimum by itself.
- Keep the iOS 4pt leading inset as an app-specific optical alignment value.
- For the toolbar prototype, prefer iOS `sidebar.left` because it communicates a leading
  sidebar/drawer more specifically than the wide `line.3.horizontal` symbol. Keep that
  icon only if the native toolbar path is applicable to the current header owner.
- The prototype proved that path is not currently applicable, so production keeps the
  existing intrinsic `line.3.horizontal` SF Symbol and Material menu icon.
- Keep draw count on the universal `Picker` for now. Android's exposed-dropdown look is
  less compact than ideal, but it is the current native Expo UI selector that works inside
  `FieldGroup` without custom gesture plumbing.
- Wrap the native settings host in a bottom `SafeAreaView` so Android edge-to-edge system
  navigation does not cover the last row.

## Components

- `app/settings.tsx`
  - Owns the navigation/header setup and the screen-specific native Settings form.
  - Uses `Host`, `FieldGroup`, `Switch`, and the shared `DrawCountPreference`.
- `app/(tabs)/index.tsx`, `app/(tabs)/hello.tsx`, `app/history.tsx`
  - Use the shared leading drawer/menu header button.
- `components/navigation/HeaderMenuButton.tsx`
  - Shared header drawer/menu button with Expo UI native icon rendering.
- `components/settings/DrawCountPreference.tsx`
  - Shared native Expo UI draw-count row with universal `Picker` for Draw 1-5.
- Remove obsolete settings-only wrappers when unused:
  - `components/settings/DrawCountSelector.tsx`

## How to fetch data, how to cache

No data-fetching changes. Continue using `SettingsProvider` and existing AsyncStorage
settings persistence.

## Related tasks

- SDK 57 upgrade:
  `docs/product/expo-rn-sdk-57-upgrade/upgrade-to-expo-sdk-57-and-react-native-0-86.md`
- Previous controls migration:
  `docs/product/expo-ui-settings-controls/native-settings-controls-and-segmented-choices.md`
- History sheet prototype:
  `docs/product/expo-ui-history-preview-sheet/prototype-expo-ui-bottom-sheet.md`
- Draw-count product context:
  `docs/product/draw-count-setting/solitaire-stock-draw-count.md`

## Simplification ideas

- Remove the unused segmented draw-count component after native Picker adoption.
- Keep Expo compound components direct where needed; avoid wrappers that hide
  `FieldGroup.Section`, `SectionHeader`, or `SectionFooter` from Expo UI's child
  extraction.
- Use custom section footer copy sparingly. If native review shows a row needs
  explanation, add one concise section footer rather than per-row paragraphs.
- Remove the current helper footers because the current section names and row labels are
  sufficient.
- Keep `shareSolvedGames` out of UI because it is present in state but not surfaced in
  current Settings; this pass should not invent a new preference.
- Remove duplicated raw `Pressable`/`Menu` header buttons from individual route screens.
- Avoid direct Android-only Compose imports in shared Settings code. In this pass they
  rendered inside `FieldGroup` but did not produce reliable nested gestures.
- Fold `NativeSettingsForm` into its only caller, `app/settings.tsx`; a wrapper around the
  entire screen adds indirection without reuse.
- Keep `DrawCountPreference` separate because its Picker behavior and documented Android
  compromise are meaningful on their own.
- Do not introduce nested Stack navigators solely to adopt `Stack.Toolbar`; that would
  trade a small header integration for broader navigation ownership and testing work.

## Steps to implement

- [x] Re-read the existing plan after compaction.
- [x] Inspect current Settings code and the old HEAD version.
- [x] Refresh Expo UI FieldGroup, Picker, Switch, Text, changelog, and package source.
- [x] Refresh settings best-practice guidance from Apple, Android, and Material sources.
- [x] Decide target design: pure Expo UI FieldGroup with native Picker and Switch rows.
- [x] Update this implementation plan before app-code edits.
- [x] Incorporate planning sub-agent recommendation: default native colors first, no
  custom section typography, native Picker for draw count.
- [x] Implement the native Settings form component and simplify the route screen.
- [x] Remove obsolete settings-only custom control files.
- [x] Update the Expo UI package guide and SDK 57 follow-up docs with the final decision.
- [x] Run cheap checks: `yarn typecheck`, `yarn lint`, `yarn jest`.
- [x] Run focused native validation if feasible, serialized: iOS clean build, then Android
  release/physical smoke, or document why a native step was skipped.
- [x] Record final files, test results, and residual issues.
- [x] Re-read this implementation plan after compaction for the helper/header follow-up.
- [x] Research drawer/header placement and mobile touch-target guidance.
- [x] Update this implementation plan for helper text and header menu consistency before
  app-code edits.
- [x] Add sparse native section footer helper text to Settings.
- [x] Create one shared platform-aware header menu button component.
- [x] Move Play, Settings, History, and Hello drawer/menu buttons to the shared leading
  header slot.
- [x] Update package guides and related docs with the header placement and sizing
  decision.
- [x] Run cheap checks and focused native validation if feasible.
- [x] Record final files, test results, and residual issues for this follow-up.
- [x] Inspect Settings font props, Android `Picker` implementation, safe-area history,
  and header icon implementation for the second follow-up.
- [x] Research Expo UI native icons, Android app-bar placement, and Android edge-to-edge
  safe-area guidance.
- [x] Update this implementation plan for the second follow-up before app-code edits.
- [x] Install/document `@expo/material-symbols` for Expo UI native Android icons.
- [x] Replace the Tamagui/Lucide header menu glyph with Expo UI native `Icon`.
- [x] Keep the drawer/menu button leading on Android and iOS, and document why.
- [x] Remove Settings helper footers.
- [x] Test Android draw-count alternatives, then keep universal `Picker` as the working
  native Expo UI selector and document the rejected alternatives.
- [x] Restore Android bottom safe-area clearance around the native Settings screen.
- [x] Update package guides and SDK 57 follow-up docs with the final second-follow-up
  decisions.
- [x] Run cheap checks and focused native validation if feasible.
- [x] Record final files, test results, and residual issues for this second follow-up.
- [x] Implementation/testing sub-agent re-inspection: keep the current Picker and
  HeaderMenuButton implementations because no simpler reliable native/Expo path was found.
- [x] Re-read the full implementation plan for the intrinsic-icon/settings-file follow-up.
- [x] Append the latest user prompt verbatim and update the plan before code edits.
- [x] Inspect the current header button, Settings route/form, installed package source,
  official platform guidance, and relevant package guides.
- [x] Remove explicit menu glyph sizing while documenting retained integration geometry.
- [x] Fold `NativeSettingsForm` into `app/settings.tsx` and delete the one-use component.
- [x] Update current docs/package guides with the intrinsic sizing, Stack.Toolbar, and
  persistent draw-count decisions.
- [x] Run `yarn format:check`, `yarn typecheck`, `yarn lint`, `yarn jest`, and
  `git diff --check`.
- [x] Inspect the final diff and staged state, then record results and residual concerns.
- [x] Re-read the full implementation plan for the Stack.Toolbar/iOS-bottom follow-up.
- [x] Append the latest user prompt verbatim and update the plan before code edits.
- [x] Read the agent-device skill and run version-matched help for agent-device 0.17.10
  before device automation.
- [x] Inspect official `Stack.Toolbar` docs, installed Router source, current navigator
  ownership, route headers, and safe-area/FieldGroup implementation.
- [x] Run cheap checks before native prototyping/build validation.
- [x] Prototype the smallest `Stack.Toolbar` use in one current Drawer screen and record
  whether it reaches the visible header and opens the drawer.
- [x] Keep and expand the toolbar implementation only if it is a reliable drop-in;
  otherwise remove the rejected prototype without touching unrelated work.
- [x] Stop competing builds, run a clean `yarn ios`, and confirm the fresh install.
- [x] Use agent-device to verify Play menu/header actions and Settings absolute-bottom
  visibility; capture screenshots under `tmp/settings-validation/`.
- [x] Apply and retest the smallest native-safe bottom fix only if clipping is real; no
  fix was needed because the final row scrolls fully above the system area.
- [x] Update current Router, Expo UI, safe-area, SDK 57, and implementation-plan docs with
  evidence, maintenance estimate, files, issues, and testing.
- [x] Re-run all cheap checks, inspect final diff/staged state, and clean up sessions.

## Plan: Files to modify

- `app/settings.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/hello.tsx`
- `app/history.tsx`
- `components/navigation/HeaderMenuButton.tsx`
- `components/settings/DrawCountPreference.tsx`
- `components/settings/NativeSettingsForm.tsx`
- `components/settings/DrawCountSelector.tsx`
- `package.json`
- `yarn.lock`
- `docs/external-package-guides/expo-ui.md`
- `docs/external-package-guides/expo-router.md`
- `docs/external-package-guides/expo-material-symbols.md`
- `docs/external-package-guides/react-native-safe-area-context.md`
- `docs/product/expo-rn-sdk-57-upgrade/upgrade-to-expo-sdk-57-and-react-native-0-86.md`
- `docs/product/expo-ui-fieldgroup-settings/native-fieldgroup-settings.md`

Third follow-up changes within this existing change set:

- `app/settings.tsx`
- `components/navigation/HeaderMenuButton.tsx`
- `components/settings/NativeSettingsForm.tsx` (removed)
- `docs/external-package-guides/expo-material-symbols.md`
- `docs/external-package-guides/expo-router.md`
- `docs/external-package-guides/expo-ui.md`
- `docs/product/expo-rn-sdk-57-upgrade/upgrade-to-expo-sdk-57-and-react-native-0-86.md`
- `docs/product/expo-ui-fieldgroup-settings/native-fieldgroup-settings.md`

Fourth follow-up planned files:

- `docs/external-package-guides/expo-router.md`
- `docs/external-package-guides/expo-ui.md`
- `docs/external-package-guides/react-native-safe-area-context.md`
- `docs/product/expo-rn-sdk-57-upgrade/upgrade-to-expo-sdk-57-and-react-native-0-86.md`
- `docs/product/expo-ui-fieldgroup-settings/native-fieldgroup-settings.md`
- `app/settings.tsx` only for the rejected prototype; restore it exactly afterward.

## Files actually modified

- `app/settings.tsx`
- `app/(tabs)/index.tsx`
- `app/(tabs)/hello.tsx`
- `app/history.tsx`
- `components/navigation/HeaderMenuButton.tsx` (new)
- `components/settings/DrawCountPreference.tsx` (new)
- `components/settings/NativeSettingsForm.tsx` (introduced earlier, removed in this
  follow-up after its one-use form was folded into `app/settings.tsx`)
- `components/settings/DrawCountSelector.tsx` (removed)
- `package.json`
- `yarn.lock`
- `docs/external-package-guides/expo-material-symbols.md`
- `docs/external-package-guides/expo-router.md`
- `docs/external-package-guides/expo-ui.md`
- `docs/external-package-guides/react-native-safe-area-context.md`
- `docs/product/expo-rn-sdk-57-upgrade/upgrade-to-expo-sdk-57-and-react-native-0-86.md`
- `docs/product/expo-ui-fieldgroup-settings/native-fieldgroup-settings.md`

Fourth follow-up files actually modified:

- No production application file remains changed by this follow-up. The temporary
  `app/settings.tsx` prototype was removed exactly after evaluation.
- `docs/external-package-guides/expo-router.md`
- `docs/external-package-guides/expo-ui.md`
- `docs/external-package-guides/react-native-safe-area-context.md`
- `docs/product/expo-rn-sdk-57-upgrade/upgrade-to-expo-sdk-57-and-react-native-0-86.md`
- `docs/product/expo-ui-fieldgroup-settings/native-fieldgroup-settings.md`
- `tmp/settings-validation/stack-toolbar-drawer-prototype-ios.png`
- `tmp/settings-validation/settings-bottom-absolute-ios.png`
- `tmp/settings-validation/settings-bottom-production-ios.png`
- `tmp/settings-validation/play-header-production-ios.png`

## Intermediary learnings

- Expo's `FieldGroup` is explicitly intended for grouped settings-style rows and mirrors
  iOS Settings / SwiftUI Form semantics.
- Installed Expo UI source confirms Android `FieldGroup.Section` wraps each direct row in
  a Material 3 `ListItem`, so nesting Expo `ListItem` remains the wrong shape.
- `FieldGroup.Section title` provides default native section headers. The first prototype
  should not have recreated those with custom text.
- Expo UI universal `Switch` has a native `label` prop. Using it avoids hand-built row
  layout for boolean settings.
- Expo UI universal `Picker` is the clean native route for draw count, but it changes the
  visible segmented choice into a menu/dropdown.
- Public Expo UI discussion/issues show the package is useful but still settling around
  FieldGroup/Host/ListItem layout details, so keep the implementation conservative.
- `yarn typecheck` passes with numeric `Picker.Item` values, so no extra cast or wrapper
  type is needed for draw count.
- Current header guidance maps well to Soli's routes: drawer/menu is navigation and
  belongs in the leading header slot; Demo and New Game remain trailing actions.
- Android's accessibility guidance supports a 24dp visible icon inside a 48dp touch
  target, so "bigger" should mean a bigger target, not a chunkier hamburger glyph.
- iOS simulator validation shows the new helper copy reads like native FieldGroup footer
  text and does not make Settings feel like a custom explanatory page.
- The Settings form currently has no custom font family, font size, or font weight inside
  `NativeSettingsForm`; Expo UI owns the row and section typography.
- Android top-app-bar docs explicitly put `navigationIcon` on the left and `actions` on
  the right, so a left-side drawer should keep its header button in `headerLeft` on
  Android too.
- Expo UI universal `Icon` is the better header glyph path than Lucide here: SF Symbol on
  iOS, Material Symbol XML on Android.
- Expo UI's Android `Picker` implementation uses a read-only Material `TextField` as the
  exposed-dropdown anchor. This is native but visually heavier than a settings preference
  row.
- Android alternatives tested inside `FieldGroup`: `MenuView`, Compose `DropdownMenu`
  with a row/list item trigger, Compose `SegmentedButton`, and the universal `Slider`.
  They rendered, but taps/drags did not update reliably in the nested `FieldGroup` row.
- The current Android draw-count trade-off is deliberate: keep the working universal
  `Picker` over custom gesture workarounds until Expo UI has a first-class compact
  settings-row selector.
- The native `FieldGroup` should keep owning scroll; Android bottom system-bar overlap is
  handled by wrapping the full-height Host in a bottom-edged SafeAreaView.
- Re-inspection after the final Android release smoke found no safe supported way to make
  the universal Android `Picker` compact or right-aligned. The universal `Picker` API does
  not expose style/modifier props, and Android owns the internal Material `TextField`
  anchor.
- The shared `HeaderMenuButton` is already the closest native/Expo route found: React
  Navigation's `HeaderButton` supplies the header press surface, and Expo UI `Icon`
  supplies SF Symbols on iOS plus Material Symbol XML on Android. Keep the explicit
  Tamagui theme color because the icon's `Host` is isolated inside a React Navigation
  header and should not depend on inheriting native content color.
- Expo UI `Icon.size` is optional. Installed SDK 57 source confirms the SwiftUI Image
  bridge defaults to 24pt, while the Material menu XML declares 24dp intrinsic width and
  height. Omitting the prop removes duplicate app configuration without changing size.
- React Navigation's installed `HeaderButton` supplies horizontal padding and Android
  hit slop, but no iOS hit slop or platform minimum dimension. Soli therefore retains
  explicit 44pt iOS and 48dp Android control minima.
- The iOS 4pt leading inset is app-owned optical alignment. It is not a native platform
  constant and should remain named/documented as integration geometry.
- The previous Lucide glyphs were larger (32 Android, 26 iOS), but current platform
  guidance favors a 24-unit glyph inside the accessible 48dp/44pt control region.
- Expo Router `Stack.Toolbar` can give native Stack toolbar items more ownership of their
  geometry, but it is alpha and does not apply to Soli's Drawer-owned visible headers.
- `NativeSettingsForm` had one caller and represented the entire route body. Folding it
  into `app/settings.tsx` removes indirection, while `DrawCountPreference` remains useful
  because it isolates normalization and the documented native Picker compromise.
- Official Expo docs and installed `expo-router@57.0.3` both scope header
  `Stack.Toolbar` to native Stack screens. Installed source registers toolbar composition
  options with the nearest route key, then merges only keys present in the owning native
  Stack's descriptors.
- Soli's visible Settings route is owned by the nested Drawer. Its route key does not
  match the parent Stack's `(tabs)` descriptor, so the toolbar registration is ignored.
  The one-screen iOS prototype confirmed this: clearing Drawer `headerLeft` and rendering
  a left `Stack.Toolbar` produced no visible toolbar item.
- Android's implementation converts toolbar children to `headerLeft`/`headerRight`, but
  still travels through the same Stack composition registry. It does not provide a
  Drawer-specific escape hatch.
- `sidebar.left` is a good native iOS symbol for a left drawer if this API later becomes
  applicable, but the rejected prototype means production keeps `line.3.horizontal`.
- A future migration is small-to-medium code work and medium validation work if Drawer
  support arrives: four routes, `HeaderMenuButton`, Play's right-side actions and shared
  size constant, plus both native platforms. Stability without Drawer support leaves the
  migration inapplicable; changing navigator ownership would be medium-to-large work.
- On iOS, `FieldGroup` is a SwiftUI Form and owns scrolling. The initial viewport showing
  only part of Animations was an intermediate position. At the true end, the full
  `Win celebrations` row and rounded section bottom are visible above the system area.
- Agent-device's semantic `scroll bottom` selected the off-screen Drawer scroll view
  because both Drawer and Form scroll containers remained in the accessibility tree. A
  version-documented coordinate swipe inside the visible Form established the real end.

## Identified issues

- Issue: Current prototype customizes section typography and footer copy too much.
  Status: addressed in the new plan by using native section titles and removing most
  explanatory text.
- Issue: Hosted segmented draw count requires `RNHostView` and width math.
  Status: replace with native universal `Picker`.
- Issue: Draw count as a persistent setting is a little awkward because it only affects
  new games.
  Status: group under `New Games` and keep a future New Game-flow redesign as an
  alternative.
- Issue: Expo UI's universal Picker may not look compact enough inside FieldGroup on
  Android.
  Status: validated and accepted for now. It is bulky, but the working native universal
  `Picker` is safer than unsupported private styling or lower-level alternatives whose
  nested gestures failed in `FieldGroup`.
- Issue: The previous prototype used `Host.seedColor`, tinting Android's whole Material
  palette rather than only switch thumbs.
  Status: remove it for the default-native pass; consider reintroducing only after
  visual comparison.
- Issue: Drawer/menu placement drifted between Play and the other screens.
  Status: addressed with a shared leading `HeaderMenuButton`.
- Issue: Android visual validation for the new header/settings helper text is still
  unverified.
  Status: superseded. Helper text was removed, and the final Android release smoke
  validated the shared leading header button and native Settings form.
- Issue: Helper footers increased height and are not needed for the current labels.
  Status: removed.
- Issue: Android draw count `Picker` looked too much like a text field inside Settings.
  Status: accepted for now because the more compact native alternatives failed nested
  gestures inside Android `FieldGroup`; documented as a future Expo UI follow-up.
- Issue: Header menu glyph was still app-owned Tamagui/Lucide SVG.
  Status: replaced with Expo UI native Icon backed by SF Symbols / Material Symbols.
- Issue: Android Settings safe area regressed after removing the React Native ScrollView
  bottom padding.
  Status: restored with a bottom SafeAreaView wrapper around the native Host.
- Issue: A further HeaderMenuButton simplification could remove the Tamagui theme color.
  Status: rejected for now. The icon is rendered in an isolated Expo UI `Host` inside a
  React Navigation header, so passing the current theme color is the safer contrast path.
- Issue: A continuation `yarn release` after no further app-code changes rebuilt the
  release target successfully but the wrapper process exited with status 143 before a
  newer install timestamp was observed.
  Status: documented as a testing caveat. The physical-device smoke still ran against the
  already installed 2026-07-05 13:40:49 release from this same code state.
- Issue: Final continuation coordinate taps did not re-open the Android draw-count
  Picker through agent-device, although the row rendered correctly and earlier same-build
  evidence showed the Draw 1-5 menu open.
  Status: residual automation limitation; do not treat this alone as product evidence
  against the universal Picker without manual verification.
- Issue: Explicit `HEADER_MENU_ICON_SIZE = 24` looked like an app-owned native sizing
  requirement even though it duplicated both platform defaults.
  Status: addressed by omitting `Icon.size` and documenting the retained outer geometry.
- Issue: `NativeSettingsForm` made `app/settings.tsx` an almost empty forwarding screen
  without offering reuse.
  Status: addressed by folding the form into the route and deleting the wrapper file.
- Issue: The plan previously left moving draw count to New Game as a future option.
  Status: rejected; draw count is a durable player preference and remains persisted in
  Settings.
- Issue: It was unclear whether `Stack.Toolbar` could replace app-managed menu geometry
  in the current Drawer headers.
  Status: rejected as a drop-in. Source and runtime evidence show Stack composition does
  not target the nested Drawer's route/header. The prototype was fully removed.
- Issue: The candidate `sidebar.left` symbol might be more semantically specific on iOS.
  Status: not adopted because the API path that would own it is inapplicable. Production
  icon and geometry remain unchanged.
- Issue: The Settings screenshot appeared to cut off the bottom of Animations.
  Status: not a clipping bug. The screenshot represented an intermediate scroll position;
  the final row and section bottom are fully visible at the Form's true end.
- Issue: Future Expo upgrades could stabilize `Stack.Toolbar` without making it useful
  for Soli's Drawer-owned headers.
  Status: documented as a dated upgrade check that requires both stability and compatible
  navigator ownership before another migration attempt.

## Testing

Planned:

```sh
yarn typecheck
yarn lint
yarn jest
```

Native validation target:

- iOS: clean `yarn ios`, open Settings, verify native Form sections, Picker, switches,
  developer-mode insertion, and navigation.
- Android: `yarn release`, install on the physical device, verify grouped Material
  sections, Picker, switches, developer-mode insertion, and no obvious log errors.

Results:

- `yarn format:check`: passed.
- `yarn typecheck`: passed.
- `yarn lint`: passed.
- `yarn jest`: passed; 11 suites and 56 tests passed.
- `git diff --check`: passed.
- iOS: `yarn ios` completed a clean simulator build and install on iPhone 17 Pro with
  0 errors and the existing duplicate `-lc++` warning. Agent-device verified Settings
  renders as native FieldGroup sections, the native Picker opens Draw 1-5 and updates
  the visible value, and disabling `All animations` disables child animation switches
  with native disabled styling. Restored simulator changes to Draw 5 and animations on.
- Android: `yarn release` did not build because the release script found no connected
  physical device and no wireless ADB services, then refused to fall back to an emulator.
  Follow-up required after enabling Wireless debugging or connecting the phone.

Follow-up results for helper text and header menu consistency:

- `yarn format:check`: passed.
- `yarn typecheck`: passed.
- `yarn lint`: passed.
- `yarn jest`: passed; 11 suites and 56 tests passed.
- `git diff --check`: passed.
- iOS: `yarn ios` completed a simulator build and install on iPhone 17 Pro with 0
  errors and the existing duplicate `-lc++` warning. Agent-device verified Play,
  Settings, History, and Hello expose the drawer/menu button in the leading header slot.
  Settings helper footers rendered under New Games, Gameplay, and Developer with native
  FieldGroup footer styling. Screenshots:
  `tmp/settings-validation/header-play-ios.png` and
  `tmp/settings-validation/settings-helper-header-ios.png`.
- Android: not validated in this follow-up because `adb devices -l` returned no
  connected devices. No Android release build was started.
- Cleanup: stopped the `yarn ios`/Metro session and closed the agent-device session.
  A stale agent-device XCTest runner child process was stopped after the session list
  was empty; no active `xcodebuild`, `yarn ios`, or `yarn release` process remained.

Second follow-up / implementation-testing sub-agent results:

- No further application-code changes were made after re-inspecting the current
  `NativeSettingsForm`, `DrawCountPreference`, and `HeaderMenuButton` implementations.
- `yarn format:check`: passed.
- `yarn typecheck`: passed.
- `yarn lint`: passed.
- `yarn jest`: passed; 11 suites and 56 tests passed.
- `git diff --check`: passed.
- `npx expo install --check`: passed; dependencies are up to date, with the expected
  `react-native-worklets` validation skip from `expo.install.exclude`.
- Android A065: `yarn release` built successfully, installed
  `/Users/karim/kDrive/Code/soli/android/app/build/outputs/apk/release/app-release.apk`,
  and opened the app. The automatic ADB reverse step printed the known harmless mDNS
  alias warning for `adb-4139951e-zmJeED`, while install/open used A065.
- Android install confirmation: `ch.karimattia.soli` `versionName=0.8.0`,
  `versionCode=13`, `lastUpdateTime=2026-07-05 13:40:49`.
- Android visual smoke: physical device unlocked with `scripts/android-unlock-pattern.sh`.
  Verified the leading native menu icon on Play/History/Settings, opened Settings through
  the drawer, confirmed the native `FieldGroup` form, opened the Draw picker and saw
  `Draw 1` through `Draw 5`, and scrolled to the bottom to confirm the last animation row
  clears the Android navigation bar.
- Android screenshots:
  - `tmp/settings-validation/android-play-after-release.png`
  - `tmp/settings-validation/android-drawer-after-release.png`
  - `tmp/settings-validation/android-settings-top-after-release.png`
  - `tmp/settings-validation/android-draw-picker-after-release.png`
  - `tmp/settings-validation/android-settings-bottom-after-release.png`
- Cleanup: stopped the `yarn release`/Metro log session after install and closed the
  reused `settings-android` agent-device session. No `expo start`, `yarn release`,
  `expo run:android`, `expo run:ios`, or `xcodebuild` process remained from this pass.

Continuation verification after context compaction:

- Re-read the implementation plan, package guides, and current app files.
- Re-checked official docs for Expo UI `FieldGroup`, `Picker`, and `Icon`; Expo Router
  Drawer; Android top app bars; Android touch targets; and `react-native-safe-area-context`.
- Inspected installed `@expo/ui` source: Android universal `Picker` renders a Material 3
  `ExposedDropdownMenuBox` with a read-only `TextField` anchor, and its public props do
  not expose compact/right-aligned styling.
- Re-ran `yarn format:check`, `yarn typecheck`, `yarn lint`, `yarn jest`,
  `git diff --check`, and `npx expo install --check`; all passed.
- Re-ran `yarn release`; Gradle reported `BUILD SUCCESSFUL`, but the wrapper exited with
  status 143 before a newer install timestamp was observed. The installed app remained
  `versionName=0.8.0`, `versionCode=13`, `lastUpdateTime=2026-07-05 13:40:49`.
- Re-smoked the installed release on physical Android `A065`: Play menu icon was
  leading-left, the drawer opened, History and Settings used the shared leading icon,
  Settings rendered without helper text, and the bottom Settings rows cleared the system
  navigation bar.
- Continuation screenshots:
  `tmp/settings-validation/android-play-smoke-current.png`,
  `tmp/settings-validation/android-drawer-smoke-current.png`,
  `tmp/settings-validation/android-settings-top-smoke-current-3.png`, and
  `tmp/settings-validation/android-settings-bottom-smoke-current.png`.
- Continuation log scan:
  `adb logcat -d -t 1000 | rg -i "(FATAL EXCEPTION|AndroidRuntime|ReactNativeJS|ExpoUI|Soli)"`
  returned no matches.
- Cleanup: closed the `settings-android` agent-device session. No `yarn release`, Gradle
  wrapper, Metro, or Expo run process remained active after validation.

Third follow-up planned verification:

- Run `yarn format:check`, `yarn typecheck`, `yarn lint`, `yarn jest`, and
  `git diff --check`.
- Skip a native rebuild unless checks or source inspection reveal runtime risk. The
  intrinsic icon remains 24 units on both platforms, and folding a component into its
  only caller preserves the same native element tree and settings behavior.

Third follow-up results:

- `yarn format:check`: passed; 87 files matched formatting.
- `yarn typecheck`: passed.
- `yarn lint`: passed.
- `yarn jest`: passed; 11 suites and 56 tests passed, with 0 snapshots.
- `git diff --check`: passed.
- Native rebuild: skipped intentionally. Omitting `Icon.size` resolves to the same 24pt
  SwiftUI default and 24dp Material XML intrinsic size, while the Settings refactor moves
  unchanged JSX into its only caller. Static checks and source inspection revealed no
  runtime-specific risk that justified repeating the recent clean native validation.
- Final audit: no source references to `NativeSettingsForm` or
  `HEADER_MENU_ICON_SIZE` remain. The staged file list is unchanged from the start of
  this follow-up; no staging, unstaging, commit, reset, or unrelated-file edit occurred.
- Residual concern: the intrinsic 24dp Android glyph remains visually smaller than the
  old 32dp Lucide glyph by design. Increasing it later would be a deliberate visual
  exception to the platform-default icon/target proportion, not a native sizing fix.

Fourth follow-up results:

- Agent-device: version 0.17.10; full skill and version-matched workflow/scroll help read
  before automation.
- Initial cheap checks: `yarn format:check`, `yarn typecheck`, `yarn lint`, `yarn jest`,
  and `git diff --check` passed; Jest reported 11 suites and 56 tests.
- Competing builds: no active Expo/Metro/Xcode build was present before the clean build.
  A Gradle daemon was idle and did not represent an active build.
- Clean iOS build: `yarn ios --no-build-cache` reported `Clean Succeeded` and
  `Build Succeeded`, installed/opened `ch.karimattia.soli` on iPhone 17 Pro, with 0 errors
  and the existing duplicate `-lc++` warning.
- Toolbar prototype: with Drawer `headerLeft` removed, the left `Stack.Toolbar` using
  `sidebar.left` rendered no item in Settings. Evidence:
  `tmp/settings-validation/stack-toolbar-drawer-prototype-ios.png`.
- Prototype cleanup: `app/settings.tsx` was restored exactly; `git diff` for that file was
  empty before final validation.
- Final installed source: a serialized incremental `yarn ios` build succeeded with 0
  errors and the same warning, then reinstalled/reopened the app after prototype removal.
- Production header smoke: Play and Settings exposed `Open navigation menu`; pressing it
  opened the Drawer. Play exposed Demo and New Game; Demo opened the Run Demo sheet and
  New Game opened its confirmation. Both were dismissed without starting a game.
- iOS bottom: Developer mode was already enabled. A direct swipe inside the native Form
  reached the absolute end; the full `Win celebrations` row and rounded Animations section
  bottom were visible with clear space above the system area. Production evidence:
  `tmp/settings-validation/settings-bottom-production-ios.png`.
- Additional evidence:
  `tmp/settings-validation/settings-bottom-absolute-ios.png` and
  `tmp/settings-validation/play-header-production-ios.png`.
- Layout/icon result: no safe-area/layout fix and no production icon change.
- Final cheap checks: `yarn format:check`, `yarn typecheck`, `yarn lint`, `yarn jest`,
  and `git diff --check` passed again; Jest reported 11 suites and 56 tests.
- Final git audit: only the five intended documentation files are modified, production
  app/component/source diff is empty, and the staging area is empty. No stage, unstage,
  commit, reset, or unrelated revert occurred.
- Cleanup: both agent-device sessions were closed, their lingering XCTest children were
  stopped, and no `xcodebuild`, Expo, Metro, or `yarn ios` process remained.
- Residual risk: Android did not need a runtime build because the prototype already
  failed before platform-specific header rendering and no production code survived. The
  installed Android source shares the same Stack composition ownership path, but a future
  Router implementation change should be re-prototyped on both platforms.
