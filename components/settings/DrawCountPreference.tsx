import { Picker, Row, Spacer, Text } from '@expo/ui'

import {
  DRAW_COUNT_OPTIONS,
  normalizeDrawCount,
  type DrawCount,
} from '../../src/solitaire/drawCount'

type DrawCountPreferenceProps = {
  value: DrawCount
  onValueChange: (value: DrawCount) => void
  disabled: boolean
}

export const DrawCountPreference = ({
  value,
  onValueChange,
  disabled,
}: DrawCountPreferenceProps) => (
  <Row alignment="center" spacing={12}>
    <Text>Cards drawn</Text>
    <Spacer flexible />
    {/* Expo UI 57 FieldGroup rows render lower-level menu/segmented/slider
        experiments on Android, but their nested gestures did not fire reliably. */}
    <Picker
      selectedValue={value}
      onValueChange={(nextValue) => onValueChange(normalizeDrawCount(nextValue))}
      enabled={!disabled}
    >
      {DRAW_COUNT_OPTIONS.map((drawCount) => (
        <Picker.Item key={drawCount} label={`Draw ${drawCount}`} value={drawCount} />
      ))}
    </Picker>
  </Row>
)
