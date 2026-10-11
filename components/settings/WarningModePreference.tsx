import { Platform } from 'react-native'
import { Column, Picker, Row, Spacer, Text } from '@expo/ui'

import { warningModePreference, type WarningMode } from '../../src/state/settings'

type WarningModePreferenceProps = {
  value: WarningMode
  onValueChange: (value: WarningMode) => void
}

// Warning-mode select (hints plan F14): the DrawCountPreference Picker pattern
// with DescribedSwitchRow's description line underneath — the two warning
// modes form a strictness ladder the labels alone can't carry. One Column as
// the single FieldGroup.Section child (Android wraps each child in a Compose
// ListItem, so the description must live INSIDE this row, not as a sibling).
//
// Layout is platform-split on purpose (device evidence hints-f14/a-01): the
// Compose row cannot fit the label next to the picker — the menu button sizes
// to the widest selection ("No more useful moves") and a weighted label
// column got squeezed into a mid-word wrap ("Warning\ns"). Expo UI 57 offers
// no modifiers prop on Picker to weight it instead, so Android stacks the
// label ABOVE the picker; iOS keeps the native label-left/value-right Form
// idiom (SwiftUI compresses gracefully).
export const WarningModePreference = ({
  value,
  onValueChange,
}: WarningModePreferenceProps) => {
  const picker = (
    // `key={value}`: Expo UI 57's Android Picker pushes its label into an
    // uncontrolled Compose TextField once on becoming visible and then fails to
    // reflect later selections (upstream expo/expo#50800 — fixed in 57.0.22 for
    // the community picker only, not this universal one). Remounting on value
    // change re-seeds the label; the menu is closing at that moment anyway.
    <Picker
      key={value}
      selectedValue={value}
      onValueChange={(nextValue) => onValueChange(nextValue as WarningMode)}
    >
      {warningModePreference.options.map((option) => (
        <Picker.Item key={option.value} label={option.label} value={option.value} />
      ))}
    </Picker>
  )

  return (
    <Column spacing={4}>
      {Platform.OS === 'ios' ? (
        <Row alignment="center" spacing={12}>
          <Text>{warningModePreference.label}</Text>
          <Spacer flexible />
          {picker}
        </Row>
      ) : (
        <>
          <Text>{warningModePreference.label}</Text>
          {picker}
        </>
      )}
      {/* Mid-gray stays readable on both light and dark Host themes. */}
      <Text textStyle={{ fontSize: 13, color: '#8E8E93' }}>
        {warningModePreference.description}
      </Text>
    </Column>
  )
}
