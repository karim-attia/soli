import { StyleSheet } from 'react-native'
import { HeaderButton } from 'expo-router/react-navigation'

import { AppText } from '../AppText'
import { usePalette } from '../../src/theme/tokens'
import { IOS_HEADER_CONTROL_SIZE } from './HeaderMenuButton'

// Text action in the navigation header ("New Game", dev "Demo"). Router `HeaderButton` is
// already the native bar-item pattern (UIBarButtonItem / app-bar text action look with the
// platform press feedback), so no Expo UI Host here. Until the 2026-10-18 Tamagui removal
// this was the iOS-only `IOSHeaderTextAction` in app/(tabs)/index.tsx while Android drew
// Tamagui `Button` pills in the header; now both platforms share this component
// (plan: Expo UI audit row "Play header"). Default a11y label = the visible label.
type HeaderTextButtonProps = {
  label: string
  onPress: () => void
  accessibilityLabel?: string
}

const HEADER_TEXT_SIZE = 17
const HEADER_TEXT_HORIZONTAL_PADDING = 6

export const HeaderTextButton = ({
  label,
  onPress,
  accessibilityLabel,
}: HeaderTextButtonProps) => {
  const palette = usePalette()
  return (
    <HeaderButton
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? label}
      pressOpacity={0.65}
      style={styles.button}
    >
      <AppText
        variant="plain"
        color={palette.color}
        numberOfLines={1}
        style={styles.label}
      >
        {label}
      </AppText>
    </HeaderButton>
  )
}

const styles = StyleSheet.create({
  button: {
    minHeight: IOS_HEADER_CONTROL_SIZE,
    justifyContent: 'center',
    paddingHorizontal: HEADER_TEXT_HORIZONTAL_PADDING,
  },
  label: { fontSize: HEADER_TEXT_SIZE, fontWeight: '400' },
})
