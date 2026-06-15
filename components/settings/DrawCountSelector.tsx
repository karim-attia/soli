import { SegmentedControl } from '@expo/ui/community/segmented-control'
import { Paragraph, Text, YStack } from 'tamagui'

import {
  DRAW_COUNT_OPTIONS,
  normalizeDrawCount,
  type DrawCount,
} from '../../src/solitaire/drawCount'
import type { ResolvedThemeName } from '../../src/theme'

type DrawCountSelectorProps = {
  value: DrawCount
  onValueChange: (value: DrawCount) => void
  disabled?: boolean
  appearance: ResolvedThemeName
}

export const DrawCountSelector = ({
  value,
  onValueChange,
  disabled = false,
  appearance,
}: DrawCountSelectorProps) => (
  <YStack gap="$3" opacity={disabled ? 0.6 : 1}>
    <YStack gap="$1">
      <Text fontWeight="700">Cards drawn from stock</Text>
      <Paragraph color="$color10" fontSize="$3">
        Draw {value} selected. Applies when you start your next game.
      </Paragraph>
    </YStack>
    <SegmentedControl
      values={DRAW_COUNT_OPTIONS.map(String)}
      selectedIndex={DRAW_COUNT_OPTIONS.indexOf(value)}
      onChange={({ nativeEvent: { selectedSegmentIndex } }) => {
        const nextValue = DRAW_COUNT_OPTIONS[selectedSegmentIndex]
        if (nextValue !== undefined) {
          onValueChange(normalizeDrawCount(nextValue))
        }
      }}
      enabled={!disabled}
      appearance={appearance}
      style={{ width: '100%' }}
    />
    <Paragraph color="$color10" fontSize="$3">
      Deals are generated to be solvable with Draw 1. Higher draw counts use the same
      deals and may not always be solvable.
    </Paragraph>
  </YStack>
)
