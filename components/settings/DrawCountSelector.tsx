import { Paragraph, Text, ToggleGroup, YStack } from 'tamagui'

import {
  DRAW_COUNT_OPTIONS,
  normalizeDrawCount,
  type DrawCount,
} from '../../src/solitaire/drawCount'

type DrawCountSelectorProps = {
  value: DrawCount
  onValueChange: (value: DrawCount) => void
  disabled?: boolean
}

export const DrawCountSelector = ({
  value,
  onValueChange,
  disabled = false,
}: DrawCountSelectorProps) => (
  <YStack gap="$3" opacity={disabled ? 0.6 : 1}>
    <YStack gap="$1">
      <Text fontWeight="700">Cards drawn from stock</Text>
      <Paragraph color="$color10" fontSize="$3">
        Draw {value} selected. Applies when you start your next game.
      </Paragraph>
    </YStack>
    <ToggleGroup
      type="single"
      value={String(value)}
      onValueChange={(nextValue) => {
        if (nextValue) {
          onValueChange(normalizeDrawCount(Number(nextValue)))
        }
      }}
      disableDeactivation
      disabled={disabled}
      orientation="horizontal"
      width="100%"
      size="$3"
      gap="$1"
      // bordered
      // radiused
      // padded
      // backgrounded
    >
      {DRAW_COUNT_OPTIONS.map((option) => {
        const isSelected = value === option

        return (
          <ToggleGroup.Item
            key={option}
            value={String(option)}
            flex={1}
            minHeight={44}
            borderWidth={0}
            bordered
            radiused
            accessibilityLabel={`Draw ${option}`}
            bg={isSelected ? '$color10' : 'transparent'}
            pressStyle={{ backgroundColor: isSelected ? '$color10' : '$color5' }}
          >
            <Text
              fontSize="$5"
              fontWeight="800"
              color={isSelected ? '$color1' : '$color11'}
            >
              {option}
            </Text>
          </ToggleGroup.Item>
        )
      })}
    </ToggleGroup>
    <Paragraph color="$color10" fontSize="$3">
      Deals are generated to be solvable with Draw 1. Higher draw counts use the same
      deals and may not always be solvable.
    </Paragraph>
  </YStack>
)
