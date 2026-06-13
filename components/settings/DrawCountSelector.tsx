import { Paragraph, Text, ToggleGroup, XGroup, YStack } from 'tamagui'

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
      aria-label="Cards drawn from stock"
    >
      {/*
        ToggleGroup v2 owns selection/focus behavior; XGroup replaces the removed v1
        visual frame, and selected-aware one-sided borders create separators without
        doubling the selected segment edge.
      */}
      <XGroup
        width="100%"
        gap={0}
        bg="$color2"
        borderWidth={1}
        borderColor="$borderColor"
        size="$5"
      >
        {DRAW_COUNT_OPTIONS.map((option, index) => {
          const isSelected = value === option
          const isFirstOption = index === 0
          const previousOption = DRAW_COUNT_OPTIONS[index - 1]
          const isNextToSelected = isSelected || value === previousOption
          const separatorColor = isNextToSelected ? 'transparent' : '$borderColor'

          return (
            <XGroup.Item key={option}>
              <ToggleGroup.Item
                value={String(option)}
                flex={1}
                minHeight={44}
                borderWidth={0}
                borderLeftWidth={isFirstOption ? 0 : 1}
                borderColor={separatorColor}
                borderRadius="$4"
                aria-label={`Draw ${option}`}
                // The controlled fill is required on native, while activeStyle keeps
                // Tamagui v5's web hover/focus pseudos from overriding selection.
                bg={isSelected ? '$color10' : 'transparent'}
                activeStyle={{ bg: '$color10' }}
                pressStyle={{ backgroundColor: isSelected ? '$color10' : '$color5' }}
                // Config v5's translucent outline token is too faint on both themes.
                // Match the current text color so focus contrasts with either fill.
                focusVisibleStyle={{
                  outlineColor: isSelected ? '$color1' : '$color12',
                  outlineWidth: 2,
                  outlineStyle: 'solid',
                  outlineOffset: -3,
                  zIndex: 10,
                }}
              >
                <Text
                  fontSize="$5"
                  fontWeight="800"
                  color={isSelected ? '$color1' : '$color11'}
                >
                  {option}
                </Text>
              </ToggleGroup.Item>
            </XGroup.Item>
          )
        })}
      </XGroup>
    </ToggleGroup>
    <Paragraph color="$color10" fontSize="$3">
      Deals are generated to be solvable with Draw 1. Higher draw counts use the same
      deals and may not always be solvable.
    </Paragraph>
  </YStack>
)
