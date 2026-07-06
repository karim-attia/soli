import React from 'react'
import { Pressable, View } from 'react-native'
import type { PropsWithChildren } from 'react'
import { Text, YStack } from 'tamagui'

import { styles } from './styles'

export type PileButtonProps = PropsWithChildren<{
  label: string
  onPress?: () => void
  disabled?: boolean
  disablePress?: boolean
  width?: number
  // A11y/automation handles for the pressable slot (e.g. stock recycle/empty).
  accessibilityLabel?: string
  testID?: string
}>

export const PileButton = ({
  label,
  onPress,
  disabled,
  disablePress,
  width,
  accessibilityLabel,
  testID,
  children,
}: PileButtonProps) => {
  // Task 1-8: Fix pile alignment (labels must not change pile width / column alignment).
  const baseStyle = [
    styles.pilePressable,
    disabled && styles.disabledPressable,
    width ? { width } : null,
  ]
  const containerStyle = width ? { width, minWidth: width, maxWidth: width } : undefined
  const body = disablePress ? (
    <View style={baseStyle}>{children}</View>
  ) : (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={baseStyle}
    >
      {children}
    </Pressable>
  )

  return (
    <YStack gap="$1" items="center" style={containerStyle}>
      {body}
      <Text
        color="$color8"
        fontSize={11}
        fontWeight="400"
        style={{ width: '100%', textAlign: 'center', opacity: 0.45 }}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {label}
      </Text>
    </YStack>
  )
}
