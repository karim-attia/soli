# Expo UI Guide

Last refreshed: 2026-07-05

## Scope

- Package/tool: `@expo/ui`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this for native Expo UI controls. Prefer app-owned wrappers in `components/` for
reused controls or meaningful behavior boundaries; keep screen-specific, one-use Expo UI
composition in its route.

## Detailed guidance

The sections below are the definitive combined notes for this package or tool. Keep version-specific context when it affects compatibility, but update this single file instead of adding task- or feature-prefixed guides.

### SDK 57 Deferred Adoption Opportunities

- Package: `@expo/ui@57.0.3`
- Retrieved: 2026-07-05
- Primary docs:
  - https://docs.expo.dev/versions/v57.0.0/sdk/ui/
  - https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/host/
  - https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/bottomsheet/
  - https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/fieldgroup/
  - https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/icon/
  - https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/listitem/
  - https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/picker/
  - https://docs.expo.dev/versions/v57.0.0/sdk/ui/universal/bottomsheet/

These are product changes, not required SDK 57 migration work. The content-sized
History sheet remains valid. Settings now uses a stricter native-default `FieldGroup`
form.

#### Deferred opportunity: theme native controls with `Host.seedColor`

- SDK 57 adds `seedColor` to the universal `Host`.
- Android derives a Material 3 palette from the seed, iOS applies it as the SwiftUI
  tint, and web exposes a generated primary color scale to the subtree.
- Soli can pass its resolved green accent to a Settings `Host` so switches use a
  deliberate Soli tint instead of the platform-default accent.
- This is a small visual change, not a correctness fix. Verify enabled, disabled,
  light, and dark states on both native platforms before keeping it.
- Do not start with this in Settings. On Android, the seed affects the whole Material 3
  palette rather than only the switches, so the most native-looking baseline is an
  unseeded `Host`.

#### Decision: retain the content-fit History preview sheet

The current requirement is to display the existing History preview and size the sheet
to that content. `AppSheet` already does this by omitting `snapPoints` and using
`RNHostView matchContents` inside the universal `BottomSheet`.

Do not add half/full detents, nested scrolling, or a separate History sheet mode now.
Those controls would introduce an interaction model without a product requirement and
would complicate an area that is intentionally still small. Revisit only if future
History content no longer fits comfortably or receives a deliberate redesign.

#### Adopted follow-up: native-default Settings form with `FieldGroup`

SDK 57's universal `FieldGroup` is a scrollable grouped-settings container backed by
SwiftUI on iOS, Jetpack Compose on Android, and a web implementation. It can replace
most of the current Settings screen's React Native `ScrollView`, Tamagui section
stacks, separators, manual row layout, and one-Host-per-switch pattern.

Adopted target structure:

```tsx
<Host style={{ flex: 1 }}>
  <FieldGroup>
    <FieldGroup.Section title="New Games">
      {/* draw-count Picker and solvable-deal switch */}
    </FieldGroup.Section>
    <FieldGroup.Section title="Gameplay">
      {/* Auto Up switch */}
    </FieldGroup.Section>
    <FieldGroup.Section title="Statistics">
      {/* Statistics switch rows */}
    </FieldGroup.Section>
    <FieldGroup.Section title="Developer">
      {/* Developer mode and conditional animation controls */}
    </FieldGroup.Section>
  </FieldGroup>
</Host>
```

Adopted row mapping:

- Use compact, directly labeled universal `Switch` rows for boolean preferences.
  `FieldGroup` already supplies strong native row surfaces; repeating supporting text
  beneath every switch makes the form unnecessarily tall and visually noisy.
- Prefer `FieldGroup.Section title` over custom `SectionHeader` text. This preserves the
  package's native typography and color treatment.
- Avoid helper footers for the current settings. `New Games`, `Gameplay`, and
  `Developer` are clear enough, and the extra footer height hurts Android bottom spacing.
- Do not nest universal `ListItem` inside `FieldGroup.Section` on SDK 57. Android's
  implementation already wraps every direct row child in a Material `ListItem`, so a
  second `ListItem` creates nested row layout and excess padding.
- Use universal `Picker` for draw count on iOS and Android. Android renders a Material 3
  exposed-dropdown TextField, which is visually heavier than ideal, but it is currently
  the reliable native Expo UI selector inside `FieldGroup`.
- As of `@expo/ui@57.0.3`, universal `Picker` does not expose a supported style/modifier
  prop for shrinking or right-aligning the Android exposed TextField anchor. Avoid
  reaching into lower-level Android implementations unless a future Expo UI API makes a
  compact settings-row picker reliable.
- Do not replace Android draw count with a nested row/menu/bottom-sheet/segmented/slider
  workaround yet. Those alternatives rendered inside Android `FieldGroup`, but taps or
  drags did not update reliably in the nested row.
- Apply `disabled` at the section or control level while settings hydrate. Use native
  disabled treatment instead of manually reducing opacity where possible.
- Disable child animation switches while `All animations` is off. This follows the
  native pattern for dependent settings.
- Keep the Developer/Animations section conditional on developer mode. Confirm that
  inserting/removing native rows preserves scroll position and accessibility focus.

Benefits:

- One native Host and one coherent native form instead of many small Compose/SwiftUI
  islands embedded in a Tamagui layout.
- Platform-native grouped rows, scrolling, spacing, switch alignment, press targets,
  disabled states, Dynamic Type behavior, and accessibility semantics.
- Less app-owned layout code: the current `ToggleRow`, repeated section headings,
  separators, manual bottom safe-area padding, and surrounding `ScrollView` become
  candidates for removal.
- No custom section typography, section colors, RNHostView settings bridge, helper
  footer copy, or settings-only segmented selector is needed.
- The Settings state model and callbacks remain unchanged; this is primarily a view
  migration rather than a state rewrite.

Costs and risks:

- This is a visible Settings redesign. Native iOS and Android forms will not exactly
  match each other or the surrounding Tamagui screens, which is partly the point but
  needs a product decision.
- Universal Expo UI styling is intentionally narrower than Tamagui styling. Exact
  spacing, typography, separator, and row-background control may be unavailable or
  require platform modifiers, which should be avoided unless a real UX issue remains.
- Draw count is the awkward row. iOS `Picker` reads well, but Android's exposed-dropdown
  TextField shape does not feel like a compact settings row. Keep the universal `Picker`
  until Expo UI has a first-class compact settings-row selector or `FieldGroup` exposes a
  reliable tappable-row pattern.
- The native accessibility tree and automation selectors will change. Re-test the
  drawer/header controls, every setting, screen-reader labels/descriptions, large
  text, focus order, and screen re-entry after navigating away.
- Web must be reviewed independently. The universal implementation supports web, but
  the resulting form will not be pixel-identical to the current Tamagui screen.
- FieldGroup should own scrolling. Do not nest it in the current React Native
  `ScrollView`; use a full-height `Host` and verify safe-area behavior before removing
  the existing manual bottom inset.

Implementation sequence:

1. Use one `Host` and one `FieldGroup`.
2. Keep the one-use form in `app/settings.tsx`; separating the entire screen into a
   `NativeSettingsForm` adds indirection without reuse.
3. Use `FieldGroup.Section title` for sections.
4. Use direct `Switch label` rows.
5. Keep `DrawCountPreference` as a focused wrapper around the `Row`, `Text`, `Spacer`,
   normalization, and universal `Picker` trade-off.
6. Remove the previous `DrawCountSelector`, `RNHostView`, and `seedColor` settings
   experiment.
7. Do not add helper footers for the current settings; the section titles are sufficient.
8. Run static checks and focused native validation before deciding whether to re-add any
   customization.

#### Adopted Settings implementation notes

- `FieldGroup` and `FieldGroup.Section` inspect their direct React child element types
  to discover explicit sections and `SectionHeader` / `SectionFooter` slots. Keep those
  compound markers inline if custom slots are ever needed. Hiding `FieldGroup.Section`
  behind an app-owned wrapper made Android treat every whole section as one row in an
  implicit synthetic section, producing oversized nested cards and incorrect spacing.
- Prefer the `title` prop to custom `SectionHeader` / `SectionFooter` slots. The custom
  title/note prototype required explicit neutral colors for Android dark mode and still
  looked less native.
- If a future section truly needs helper text, prefer one direct
  `FieldGroup.SectionFooter` at the end of the section. Avoid row subtitles until Expo UI
  has a first-class native row API for that pattern in this app.
- Do not use `RNHostView` inside Settings unless we deliberately bring back the
  segmented draw-count selector. `RNHostView matchContents` measures its React Native
  child independently and reintroduces layout width decisions that a pure Expo UI form
  does not need.
- Do not seed the Settings host by default. `Host.seedColor` intentionally gives
  Android's complete Material 3 palette a subtle green cast, not only the switches. This
  is native SchemeTonalSpot behavior and differs from iOS, where the seed acts as a
  control tint.
- Use universal `Icon` for native header/menu symbols when possible. It renders SF
  Symbols on iOS and Material Symbol XML drawables on Android. Wrap it in `Host
  matchContents` when placing it inside a React Native header button.
- Expo UI `Icon.size` is optional. As inspected on 2026-07-05, omitting it lets the
  Android XML use its 24dp intrinsic dimensions, while the SwiftUI Image bridge defaults
  to 24pt. Soli omits the header menu icon size for that native/intrinsic behavior.
- When `Icon` is mounted inside an isolated `Host` in a React Navigation header, pass the
  current header/theme color explicitly rather than relying on native content-color
  inheritance across the React Native / Expo UI boundary.
- For Android draw count, keep the universal `Picker` in Settings until Expo UI exposes
  a less text-field-like settings picker or a reliable compact row trigger inside
  `FieldGroup`. The current `Picker` look is imperfect, but the tested menu,
  bottom-sheet, segmented, and slider alternatives did not receive nested gestures
  reliably.
- Keep draw count in Settings. It is a durable player preference that is reused across
  games, not a transient choice for one New Game action.

### History Preview Sheet Notes

- Package: `@expo/ui`
- Retrieved: 2026-06-14
- Refreshed: 2026-07-03
- Primary docs:
  - https://docs.expo.dev/versions/v56.0.0/sdk/ui/
  - https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/bottomsheet/
  - https://docs.expo.dev/versions/v56.0.0/sdk/ui/drop-in-replacements/bottomsheet/
  - https://docs.expo.dev/versions/v56.0.0/sdk/ui/jetpack-compose/bottomsheet/
  - https://docs.expo.dev/versions/v56.0.0/sdk/ui/jetpack-compose/host/
  - https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/rnhostview/
  - https://docs.expo.dev/versions/v56.0.0/sdk/ui/swift-ui/rnhostview/

## Package facts

- Expo UI provides native UI components backed by Jetpack Compose and SwiftUI, plus
  universal components for Android, iOS, and web.
- Soli resolves `@expo/ui@56.0.18`.
- Refreshed SDK 56 docs list `@expo/ui` recommended/bundled versions around
  `~56.0.19` to `~56.0.20` depending on the page, so rerun Expo dependency alignment
  before future Expo UI work.
- Install with:

```sh
npx expo install @expo/ui
```

## Universal BottomSheet API notes

- Import:

```ts
import { BottomSheet, Host, RNHostView } from '@expo/ui'
```

- Visibility is controlled with `isPresented`.
- Dismissal is reported with `onDismiss`.
- The drag handle can be hidden with `showDragIndicator={false}`.
- `snapPoints` accepts:
  - `'half'`
  - `'full'`
  - `{ fraction: number }`
  - `{ height: number }`
- `{ fraction }` and `{ height }` are precise on iOS and web.
- On Android, fixed and fractional snap points map to the nearest `half` or `full`
  native state.
- React Native scrollable content should be wrapped in `RNHostView` when used inside
  the universal Expo UI sheet.
- `RNHostView` bridges React Native layout into native Expo UI layout. `matchContents`
  sizes the native parent to the child; omitting it lets flexible children fill the
  available parent.

## Drop-in BottomSheet API notes

- Import:

```ts
import { BottomSheet, BottomSheetView } from '@expo/ui/community/bottom-sheet'
```

- The API is compatible with `@gorhom/bottom-sheet` where native platform behavior
  allows.
- `BottomSheet` defaults to opening at `index={0}` on mount; `index={-1}` starts
  closed.
- `snapPoints` accepts `(string | number)[]`, so current percentage snap points should
  be passed as strings such as `65%`.
- `enablePanDownToClose` allows pan-down dismissal. Expo docs note that this also
  enables Android Back and scrim dismissal for the native sheet.
- `onClose` fires when the sheet fully closes.
- `onDismiss` is an alias for `onClose` for modal compatibility.
- `BottomSheetView` is the documented content wrapper for non-scroll dynamic content.
- `BottomSheetFlatList` and `BottomSheetScrollView` are compatibility re-exports of
  React Native list/scroll components.
- Platform behavior:
  - Android: Jetpack Compose modal bottom sheet.
  - iOS: SwiftUI sheet.
  - Web: drawer overlay.
- Snap behavior:
  - Android maps snap points to native partial and expanded states.
  - iOS and web support provided snap points.
- Compatibility note: animation, over-drag, keyboard, custom backdrop, custom
  background, custom footer, and related props can be accepted but may not change
  native behavior.

## Choice for Soli History preview

Use the universal `BottomSheet` from `@expo/ui` on Android, iOS, and web. Omit
`snapPoints` so the sheet sizes itself to its content, and wrap the existing
React Native/Tamagui preview in universal `RNHostView matchContents`.

Reasons:

- This is Expo's documented cross-platform API for new code.
- History preview does not need multiple detents or full-screen expansion.
- Omitting `snapPoints` uses Expo's documented fit-to-content behavior.
- The native drag indicator, pan, Android Back, scrim, and dismissal behavior stay
  owned by Expo UI and the platform.
- Universal `RNHostView matchContents` is the documented bridge for React Native
  content whose intrinsic size should determine the native sheet size.
- The universal web implementation includes the required hidden Vaul/Radix title and
  avoids the community web fallback's accessibility warnings.

Implementation notes:

- Do not pass `snapPoints`; content-sized sheets avoid the unnecessary full-screen
  state and preserve the native drag indicator.
- Keep the shared wrapper at the API minimum:

```tsx
<BottomSheet isPresented={isPresented} onDismiss={onDismiss}>
  <RNHostView matchContents>{children}</RNHostView>
</BottomSheet>
```

- `BottomSheet` renders a Compose/SwiftUI hierarchy. Tamagui and React Native elements
  belong to React Native's Yoga/native-view hierarchy, so they are not native Expo UI
  children that Compose or SwiftUI can render directly.
- `RNHostView` creates the bridge point where that React Native hierarchy is mounted
  inside the native Expo UI hierarchy.
- `matchContents` makes the host report the React Native child's measured size to the
  native layout so the sheet can derive its intrinsic height. Without it, the host
  fills the native parent and reports that parent size back to Yoga.
- Keep feature-specific layout outside the wrapper. History gives its seven-column
  board a responsive width equal to the viewport minus Expo's 16-per-side content
  inset; this replaces the previous board `onLayout` state and height feedback.
- Android Material can still create a partial anchor when intrinsic sheet content is
  taller than half the available height. The universal Expo API does not currently
  expose Compose's `skipPartiallyExpanded` independently of full-height snap-point
  behavior, so accepting that native settle is simpler than adding a platform wrapper.
- The published SDK 56 package predates an upstream
  `ShadowNodeProxy` validity guard for deferred size updates after unmount. Using
  `matchContents` avoids the Compose-size-to-Yoga callback involved in the reproduced
  crash, but repeated connected-device dismissal remains required validation. Recheck this
  risk note if the repo accepts newer SDK 56 `@expo/ui` patch releases.
- Clear the selected History entry directly from Expo UI's native `onDismiss`
  callback; no separate open state or animation timeout is needed.

## Refresh check (2026-07-03)

- Status: still useful for the History preview sheet implementation.
- Source update: keep this file pinned to SDK 56 docs. Expo `/latest/` now points at SDK
  57 and may describe package patches Soli has not installed.
- Follow-up candidate, outside this documentation-only refresh: run `npx expo install
  --check` before touching Expo UI again, because official SDK 56 docs now show newer
  `@expo/ui` patches than the repo currently resolves.

### Settings Controls Notes

- Package: `@expo/ui`
- Retrieved: 2026-06-15
- Refreshed: 2026-07-03
- Installed version range: `~56.0.18`
- Required Expo Modules Core patch: `56.0.17`
- Primary docs:
  - https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/
  - https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/switch/
  - https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/host/
  - https://docs.expo.dev/versions/v56.0.0/sdk/ui/drop-in-replacements/segmentedcontrol/

## Package facts

- Universal Expo UI components provide one API over Jetpack Compose on Android,
  SwiftUI on iOS, and JavaScript implementations on web.
- Universal components must be rendered under `Host`, imported from `@expo/ui`.
- Expo UI has no Tamagui-style provider that configures every independently created
  Host.
- `@expo/ui/community/segmented-control` is a drop-in control that uses a Jetpack
  Compose single-choice segmented row on Android and a segmented SwiftUI picker on
  iOS.
- Expo SDK 56 documentation originally listed bundled `@expo/ui` version `~56.0.17`.
  Expo's dependency alignment installed `@expo/ui 56.0.18` in this repository. Refreshed
  SDK 56 docs now show newer `@expo/ui` recommendations (`~56.0.19` or `~56.0.20`
  depending on page), so rerun dependency alignment before new Expo UI work.
- No new package is needed. Existing Expo SDK packages are updated within SDK 56 so
  the app receives the native screen lifecycle fix.

## Android screen lifecycle fix

- Expo UI's Android controls are Jetpack Compose views hosted inside React Native.
- `react-native-screens` detaches inactive screens during navigation.
- In `expo-modules-core 56.0.16`, the Compose view could observe the screen fragment
  lifecycle, dispose its composition, and return blank when the screen reattached.
- `expo-modules-core 56.0.17`, released 2026-06-15, pins the composition to the
  Activity lifecycle and disposes it explicitly only when the native view is destroyed.
- This is the preferred fix over React keys, forced remounts, wrapper components, or
  custom navigation behavior.
- A fresh Android build is required after updating because the fix is native Kotlin
  code.

## Universal Host

Import:

```ts
import { Host } from '@expo/ui'
```

Relevant API:

- `Host` is the required root of a universal Expo UI subtree.
- `matchContents` lets a host size itself to its native content.
- For a single inline switch, the documented minimal pattern is
  `<Host matchContents>`.
- A regular React Native `style` can be applied to the host when the containing layout
  needs opacity or dimensions.

Settings usage:

```tsx
<Host matchContents>
  <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
</Host>
```

## Universal Switch

Import:

```ts
import { Switch } from '@expo/ui'
```

Controlled props used by Settings:

- `value: boolean`: current on/off state.
- `onValueChange: (value: boolean) => void`: reports the next state.
- `disabled?: boolean`: prevents interaction and uses the native disabled treatment.

The package also exposes `label`, `testID`, and platform modifier escape hatches, but
this task does not need them. Tamagui continues to render the existing product label
and description, and the native switch should keep platform-default colors.

Do not add:

- Android thumb or track colors.
- Platform branches.
- SwiftUI or Jetpack Compose modifiers.
- A second switch wrapper beyond the existing product-level `ToggleRow`.

## SegmentedControl

Import:

```ts
import { SegmentedControl } from '@expo/ui/community/segmented-control'
```

Expo's documentation demonstrates the default export. The package also exposes the
same component as a named export, which Soli uses to satisfy its
`import/no-named-as-default` lint rule without changing behavior.

Controlled props used by Settings:

- `values?: string[]`: segment labels in display order.
- `selectedIndex?: number`: selected segment index.
- `onChange?: (event) => void`: callback whose
  `event.nativeEvent.selectedSegmentIndex` identifies the selected segment.
- `enabled?: boolean`: when false, prevents interaction. It defaults to true.
- `appearance?: 'dark' | 'light'`: optional per-control override. Draw count resolves
  it locally from the OS scheme because the Android default leaves unselected labels
  too dark.
- `style?: StyleProp<ViewStyle>`: use only simple layout sizing when required.

Basic pattern:

```tsx
<SegmentedControl
  values={options.map((option) => option.label)}
  selectedIndex={selectedIndex}
  onChange={(event) => {
    const option = options[event.nativeEvent.selectedSegmentIndex]
    if (option) {
      onSelect(option)
    }
  }}
  enabled={!disabled}
  style={{ width: '100%' }}
/>
```

Implementation notes:

- The drop-in component already creates its native Expo UI `Host`; do not add another
  wrapper around it.
- Android uses Compose `SingleChoiceSegmentedButtonRow` and `SegmentedButton`.
- iOS uses SwiftUI `Picker` with segmented style.
- Web uses the package's React Native web fallback.
- String values are supported; image values are not.
- `tintColor` is Android/web-only and is intentionally omitted so native defaults
  remain in control.
- Expo documents that omitted `appearance` follows the native environment.
- Soli still follows the OS. Draw count passes the resolved OS scheme directly to
  `appearance`; it does not accept or thread an app theme prop.
- `onValueChange` also exists, but the task explicitly requests `onChange` and a small
  selected-index mapping.

## Appearance decision

- React Native documents `Appearance.setColorScheme` as an app-level override for
  native elements.
- Expo has an accepted Android issue reporting that this override does not update at
  runtime in an Expo app.
- In Soli's device test, Tamagui and navigation changed immediately while Expo UI
  controls retained the previous scheme until restart.
- Universal `BottomSheet` creates its own Expo UI Host internally and exposes no
  shared color-scheme provider.
- Passing `colorScheme` or `appearance` to each Host/control is possible for some
  components, but recreates the lower-level plumbing this migration removed and does
  not cleanly cover the sheet.
- Soli therefore removes its manual theme setting and follows the OS through
  `useColorScheme()`.

## Soli mappings

Draw count:

- `values`: `DRAW_COUNT_OPTIONS.map(String)`.
- `selectedIndex`: index of the controlled `DrawCount`.
- `onChange`: read the option at the native selected index, convert to number, call
  `normalizeDrawCount`, then call the existing `onValueChange`.
- `enabled`: inverse of the existing `disabled` prop.

## Source links

- Universal component architecture and required Host:
  https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/
- Switch controlled usage and props:
  https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/switch/
- Host sizing:
  https://docs.expo.dev/versions/v56.0.0/sdk/ui/universal/host/
- SegmentedControl native implementation and API:
  https://docs.expo.dev/versions/v56.0.0/sdk/ui/drop-in-replacements/segmentedcontrol/
- Expo SDK 56 Jetpack Compose Host source:
  https://github.com/expo/expo/blob/sdk-56/packages/expo-ui/src/jetpack-compose/Host/index.tsx
- Android Material 3 theming guidance:
  https://developer.android.com/develop/ui/compose/designsystems/material3
- React Native Appearance:
  https://reactnative.dev/docs/appearance
- Expo color themes:
  https://docs.expo.dev/develop/user-interface/color-themes/
- Expo Android runtime Appearance issue:
  https://github.com/expo/expo/issues/26556
- Expo Modules Core 56.0.17 changelog:
  https://github.com/expo/expo/blob/main/packages/expo-modules-core/CHANGELOG.md
- Expo UI screen recomposition fix:
  https://github.com/expo/expo/pull/46650

## Refresh check (2026-07-03)

- Status: still useful for the Settings controls implementation.
- The source links are now pinned to SDK 56 because Expo `/latest/` tracks SDK 57.
- Follow-up candidate, outside this documentation-only refresh: verify whether moving
  from `@expo/ui@56.0.18` to the newer SDK 56 docs-recommended patch changes Android
  lifecycle behavior or the per-control `appearance` workaround.
