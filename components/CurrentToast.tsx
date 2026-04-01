import { Toast, useToastState } from '@tamagui/toast'
import { YStack, isWeb } from 'tamagui'
import { useReducedMotionPreference } from '../src/state/settings'

export function CurrentToast() {
  const currentToast = useToastState()
  const reducedMotionEnabled = useReducedMotionPreference()

  if (!currentToast || currentToast.isHandledNatively) return null

  const enterStyle = reducedMotionEnabled
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.5, y: -25 }
  const exitStyle = reducedMotionEnabled
    ? { opacity: 0 }
    : { opacity: 0, scale: 1, y: -20 }

  return (
    <Toast
      key={currentToast.id}
      duration={currentToast.duration}
      viewportName={currentToast.viewportName}
      enterStyle={enterStyle}
      exitStyle={exitStyle}
      y={isWeb ? '$12' : 0}
      theme="accent"
      rounded="$6"
      animation={reducedMotionEnabled ? undefined : 'quick'}
    >
      <YStack items="center" p="$2" gap="$2">
        <Toast.Title fontWeight="bold">{currentToast.title}</Toast.Title>
        {!!currentToast.message && (
          <Toast.Description>{currentToast.message}</Toast.Description>
        )}
      </YStack>
    </Toast>
  )
}
