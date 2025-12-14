import { memo } from 'react'
import { Paragraph, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type CelebrationDebugBadgeProps = {
  label: string
}

const BADGE_BASE_OFFSET = 12

export const CelebrationDebugBadge = memo(({ label }: CelebrationDebugBadgeProps) => {
  const insets = useSafeAreaInsets()

  return (
    <YStack
      pointerEvents="none"
      position="absolute"
      // Task 1-10: Keep badge above iOS home indicator / Android nav gesture area.
      style={{
        bottom: insets.bottom + BADGE_BASE_OFFSET,
        right: insets.right + BADGE_BASE_OFFSET,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.45)',
      }}
    >
      <Paragraph color="#f8fafc" fontSize={BADGE_BASE_OFFSET} fontWeight="600" letterSpacing={0.3}>
        {label}
      </Paragraph>
    </YStack>
  )
})

CelebrationDebugBadge.displayName = 'CelebrationDebugBadge'

