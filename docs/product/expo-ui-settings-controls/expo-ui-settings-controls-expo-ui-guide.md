# Expo UI Guide For Settings Controls

- Package: `@expo/ui`
- Retrieved: 2026-06-15
- Installed version range: `~56.0.17`
- Primary docs:
  - https://docs.expo.dev/versions/latest/sdk/ui/universal/
  - https://docs.expo.dev/versions/latest/sdk/ui/universal/switch/
  - https://docs.expo.dev/versions/latest/sdk/ui/universal/host/
  - https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/segmentedcontrol/

## Package facts

- Universal Expo UI components provide one API over Jetpack Compose on Android,
  SwiftUI on iOS, and JavaScript implementations on web.
- Universal components must be rendered under `Host`, imported from `@expo/ui`.
- `@expo/ui/community/segmented-control` is a drop-in control that uses a Jetpack
  Compose single-choice segmented row on Android and a segmented SwiftUI picker on
  iOS.
- Expo SDK 56 documentation lists bundled `@expo/ui` version `~56.0.17`, matching this
  repository.
- No installation or dependency change is needed for this task.

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
- `appearance?: 'dark' | 'light'`: overrides the device theme for the control.
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
  appearance={appearance}
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
- Expo documents that omitted `appearance` follows the device theme.
- Soli must pass `appearance` because its Auto/Light/Dark setting can intentionally
  differ from the device theme. Without it, a light native control can render over
  Soli's forced dark background.
- Passing `appearance` is the native fix. Do not replace it with custom segment text
  or container colors.
- `onValueChange` also exists, but the task explicitly requests `onChange` and a small
  selected-index mapping.

## Soli mappings

Draw count:

- `values`: `DRAW_COUNT_OPTIONS.map(String)`.
- `selectedIndex`: index of the controlled `DrawCount`.
- `onChange`: read the option at the native selected index, convert to number, call
  `normalizeDrawCount`, then call the existing `onValueChange`.
- `enabled`: inverse of the existing `disabled` prop.
- `appearance`: the resolved Soli theme passed from Settings.

Theme:

- `values`: `themeOptions.map(({ label }) => label)`.
- `selectedIndex`: index whose `mode` equals `state.themeMode`.
- `onChange`: read `themeOptions[selectedIndex]` and call `setThemeMode(option.mode)`.
- `enabled`: current `hydrated` value.
- `appearance`: the result of `resolveThemeName(themeMode, systemColorScheme)`.

## Source links

- Universal component architecture and required Host:
  https://docs.expo.dev/versions/latest/sdk/ui/universal/
- Switch controlled usage and props:
  https://docs.expo.dev/versions/latest/sdk/ui/universal/switch/
- Host sizing:
  https://docs.expo.dev/versions/latest/sdk/ui/universal/host/
- SegmentedControl native implementation and API:
  https://docs.expo.dev/versions/latest/sdk/ui/drop-in-replacements/segmentedcontrol/
- Expo SDK 56 Jetpack Compose Host source:
  https://github.com/expo/expo/blob/sdk-56/packages/expo-ui/src/jetpack-compose/Host/index.tsx
- Android Material 3 theming guidance:
  https://developer.android.com/develop/ui/compose/designsystems/material3
