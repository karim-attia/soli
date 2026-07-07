import { memo } from 'react'
import { Pressable } from 'react-native'
import { Paragraph, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type CelebrationDebugBadgeProps = {
  label: string
  // Dev tool: tapping cycles to the next celebration mode (restarts the run).
  onPress: () => void
}

const BADGE_BASE_OFFSET = 12

export const CelebrationDebugBadge = memo(
  ({ label, onPress }: CelebrationDebugBadgeProps) => {
    const insets = useSafeAreaInsets()

    return (
      <Pressable
        testID="celebration-debug-badge"
        onPress={onPress}
        // The badge renders after CelebrationTouchBlocker, so it sits above it and
        // receives taps; a tap here cycles the mode instead of aborting the celebration.
        style={{
          position: 'absolute',
          // Task 1-10: Keep badge above iOS home indicator / Android nav gesture area.
          bottom: insets.bottom + BADGE_BASE_OFFSET,
          right: insets.right + BADGE_BASE_OFFSET,
        }}
      >
        <YStack
          style={{
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 8,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            borderWidth: 1,
            borderColor: 'rgba(148, 163, 184, 0.45)',
          }}
        >
          <Paragraph
            color="#f8fafc"
            fontSize={BADGE_BASE_OFFSET}
            fontWeight="600"
            letterSpacing={0.3}
          >
            {label}
          </Paragraph>
        </YStack>
      </Pressable>
    )
  }
)

CelebrationDebugBadge.displayName = 'CelebrationDebugBadge'
