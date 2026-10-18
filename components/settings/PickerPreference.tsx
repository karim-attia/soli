import { Platform } from 'react-native'
import { Column, Picker, Row, Spacer, Text } from '@expo/ui'

type PickerPreferenceProps<Value extends string> = {
  label: string
  description: string
  options: ReadonlyArray<{ value: Value; label: string }>
  value: Value
  onValueChange: (value: Value) => void
}

// Generic "label + picker + description" settings row (scoring plan, 2026-10-11:
// generalised from the former WarningModePreference so the Warnings and Scoring
// selects share ONE copy of the layout and the Android workaround below).
//
// The DrawCountPreference Picker pattern with DescribedSwitchRow's description
// line underneath. One Column as the single FieldGroup.Section child (Android
// wraps each child in a Compose ListItem, so the description must live INSIDE
// this row, not as a sibling).
//
// Layout is platform-split on purpose (device evidence hints-f14/a-01): the
// Compose row cannot fit the label next to the picker — the menu button sizes
// to the widest selection ("No more useful moves") and a weighted label
// column got squeezed into a mid-word wrap ("Warning\ns"). Expo UI offers no
// modifiers prop on Picker to weight it instead (re-checked on @expo/ui
// 58.0.20: still true), so Android stacks the label ABOVE the picker; iOS keeps
// the native label-left/value-right Form idiom (SwiftUI compresses gracefully).
export const PickerPreference = <Value extends string>({
  label,
  description,
  options,
  value,
  onValueChange,
}: PickerPreferenceProps<Value>) => {
  const picker = (
    // No `key={value}` remount any more (SDK 58, 2026-10-17): Expo UI 57's
    // Android Picker seeded its uncontrolled Compose TextField once and never
    // reflected later selections (expo/expo#50800), so we remounted it per value.
    // @expo/ui 58's `Picker.android.tsx` now pushes `selectedLabel` itself via
    // `useEffect([selectedLabel, isVisible])`. If a stale label ever returns,
    // re-add `key={value}` here.
    <Picker
      selectedValue={value}
      onValueChange={(nextValue) => onValueChange(nextValue as Value)}
    >
      {options.map((option) => (
        <Picker.Item key={option.value} label={option.label} value={option.value} />
      ))}
    </Picker>
  )

  return (
    <Column spacing={4}>
      {Platform.OS === 'ios' ? (
        <Row alignment="center" spacing={12}>
          <Text>{label}</Text>
          <Spacer flexible />
          {picker}
        </Row>
      ) : (
        <>
          <Text>{label}</Text>
          {picker}
        </>
      )}
      {/* Mid-gray stays readable on both light and dark Host themes. */}
      <Text textStyle={{ fontSize: 13, color: '#8E8E93' }}>{description}</Text>
    </Column>
  )
}
