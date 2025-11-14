import React from 'react'
import { Pressable, View } from 'react-native'
import type { PropsWithChildren } from 'react'
import { Text, YStack } from 'tamagui'

import { styles } from './styles'

export type PileButtonProps = PropsWithChildren<{
  label: string
  onPress: () => void
  disabled?: boolean
  disablePress?: boolean
}>

export const PileButton = ({ label, onPress, disabled, disablePress, children }: PileButtonProps) => {
  const baseStyle = [styles.pilePressable, disabled && styles.disabledPressable]
  const body = disablePress ? (
    <View style={baseStyle}>{children}</View>
  ) : (
    <Pressable onPress={onPress} disabled={disabled} style={baseStyle}>
      {children}
    </Pressable>
  )

  return (
    <YStack gap="$1" items="center">
      {body}
      <Text color="$color10" fontSize={12}>
        {label}
      </Text>
    </YStack>
  )
}
