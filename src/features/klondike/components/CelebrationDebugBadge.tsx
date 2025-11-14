import { memo } from 'react'
import { Paragraph, YStack } from 'tamagui'

type CelebrationDebugBadgeProps = {
  label: string
}

export const CelebrationDebugBadge = memo(({ label }: CelebrationDebugBadgeProps) => (
  <YStack
    pointerEvents="none"
    position="absolute"
    style={{
      bottom: 12,
      right: 12,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 8,
      backgroundColor: 'rgba(15, 23, 42, 0.7)',
      borderWidth: 1,
      borderColor: 'rgba(148, 163, 184, 0.45)',
    }}
  >
    <Paragraph color="#f8fafc" fontSize={12} fontWeight="600" letterSpacing={0.3}>
      {label}
    </Paragraph>
  </YStack>
))

CelebrationDebugBadge.displayName = 'CelebrationDebugBadge'

