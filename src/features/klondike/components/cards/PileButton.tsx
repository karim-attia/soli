import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { PropsWithChildren } from 'react'

import { SPACE, usePalette } from '../../../../theme/tokens'
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
  const palette = usePalette()
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
    <View style={[localStyles.container, containerStyle]}>
      {body}
      {/* Count label under the pile: theme `color8` at 45 % opacity, exactly what the
          Tamagui `Text color="$color8"` rendered (board pixel parity, 2026-10-18). */}
      <Text
        style={[localStyles.label, { color: palette.color8 }]}
        numberOfLines={1}
        ellipsizeMode="clip"
      >
        {label}
      </Text>
    </View>
  )
}

const localStyles = StyleSheet.create({
  container: {
    gap: SPACE[1],
    alignItems: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '400',
    width: '100%',
    textAlign: 'center',
    opacity: 0.45,
  },
})
