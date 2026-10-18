import { Platform } from 'react-native'
import { Column, Row, Spacer, Switch, Text } from '@expo/ui'
import { weight } from '@expo/ui/jetpack-compose/modifiers'

import {
  SETTINGS_ROW_DISABLED_TEXT_COLOR,
  SETTINGS_ROW_SECONDARY_TEXT_COLOR,
} from './settingsRowColors'

type DescribedSwitchRowProps = {
  label: string
  description: string
  value: boolean
  onValueChange: (value: boolean) => void
  // Greys the label + description and makes the switch inert. For rows whose
  // effect depends on another setting, so an unusable row reads as unusable
  // instead of silently doing nothing when flipped.
  disabled?: boolean
}

// Settings row: label + secondary description + trailing switch. Composed from
// @expo/ui primitives (the DrawCountPreference pattern) instead of the
// universal ListItem: FieldGroup.Section on Android already wraps every row in
// a Compose ListItem, so nesting another ListItem would double-wrap paddings.
// Layout note: on Android the label column takes the leftover width via a
// Compose weight modifier (weighted children measure LAST, so the switch keeps
// its intrinsic size and long descriptions wrap instead of squeezing it out);
// on iOS the SwiftUI HStack handles that naturally with a flexible spacer.
// Disabled look: the label drops to the same secondary gray the description
// already uses and the switch goes inert — see settingsRowColors.ts for why a
// dimmer third value cannot work on both Host themes at once.

export const DescribedSwitchRow = ({
  label,
  description,
  value,
  onValueChange,
  disabled = false,
}: DescribedSwitchRowProps) => (
  <Row alignment="center" spacing={12}>
    <Column spacing={2} modifiers={Platform.OS === 'android' ? [weight(1)] : undefined}>
      <Text
        textStyle={disabled ? { color: SETTINGS_ROW_DISABLED_TEXT_COLOR } : undefined}
      >
        {label}
      </Text>
      <Text
        textStyle={{
          fontSize: 13,
          color: SETTINGS_ROW_SECONDARY_TEXT_COLOR,
        }}
      >
        {description}
      </Text>
    </Column>
    {Platform.OS === 'ios' ? <Spacer flexible /> : null}
    <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
  </Row>
)
