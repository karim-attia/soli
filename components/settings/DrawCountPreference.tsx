import { Picker, Row, Spacer, Text } from '@expo/ui'

import { t } from '../../src/i18n'
import {
  DRAW_COUNT_OPTIONS,
  normalizeDrawCount,
  type DrawCount,
} from '../../src/solitaire/drawCount'

// `disabled` prop removed 2026-07-05: it only existed for the settings-hydration
// loading state, which went away when settings became a synchronous kv-store read.
type DrawCountPreferenceProps = {
  value: DrawCount
  onValueChange: (value: DrawCount) => void
}

export const DrawCountPreference = ({
  value,
  onValueChange,
}: DrawCountPreferenceProps) => (
  <Row alignment="center" spacing={12}>
    <Text>{t('settings.cardsDrawn')}</Text>
    <Spacer flexible />
    {/* Expo UI 57 FieldGroup rows render lower-level menu/segmented/slider
        experiments on Android, but their nested gestures did not fire reliably
        (re-checked on @expo/ui 58.0.20: still true, Picker stays). */}
    <Picker
      selectedValue={value}
      onValueChange={(nextValue) => onValueChange(normalizeDrawCount(nextValue))}
    >
      {DRAW_COUNT_OPTIONS.map((drawCount) => (
        // `number`, not `count`: "Draw 3" names a mode, it is not a quantity to pluralize.
        <Picker.Item
          key={drawCount}
          label={t('common.drawMode', { number: drawCount })}
          value={drawCount}
        />
      ))}
    </Picker>
  </Row>
)
