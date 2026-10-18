import { Platform, StyleSheet } from 'react-native'
import { Icon } from '@expo/ui'
import { HeaderButton } from 'expo-router/react-navigation'

import { NativeIcon } from '../NativeIcon'
import { usePalette } from '../../src/theme/tokens'

// The platform hamburger, decided 2026-10-18 after in-app comparisons (plan "prompt 5"):
// SF `line.3.horizontal` regular on iOS and Material `menu` on Android, no lucide. The SF
// glyph is drawn ~2:1 (flatter than the lucide `Menu` Soli had before SDK 57) — that is the
// symbol's design and what every SF-Symbol app shows in this slot; Karim chose to keep it.
const MENU_ICON = Icon.select({
  ios: 'line.3.horizontal',
  android: import('@expo/material-symbols/menu.xml'),
})

// HeaderButton owns press behavior, while these app-owned minima preserve platform-sized control geometry.
export const IOS_HEADER_CONTROL_SIZE = 44
const ANDROID_HEADER_CONTROL_SIZE = 48
// This optical inset aligns the iOS symbol with Soli's surrounding headers.
export const IOS_HEADER_LEADING_PADDING = 4

export const HEADER_MENU_LEADING_PADDING =
  Platform.OS === 'ios' ? IOS_HEADER_LEADING_PADDING : 0

const HEADER_MENU_CONTROL_SIZE =
  Platform.OS === 'android' ? ANDROID_HEADER_CONTROL_SIZE : IOS_HEADER_CONTROL_SIZE

type HeaderMenuButtonProps = {
  onPress: () => void
}

export const HeaderMenuButton = ({ onPress }: HeaderMenuButtonProps) => {
  const palette = usePalette()

  return (
    <HeaderButton
      onPress={onPress}
      accessibilityLabel="Open navigation menu"
      pressOpacity={0.65}
      style={styles.button}
    >
      {/* No `size`: the intrinsic 24 dp/pt is the native header glyph size (expo-ui guide). */}
      <NativeIcon name={MENU_ICON} color={palette.color} />
    </HeaderButton>
  )
}

const styles = StyleSheet.create({
  button: {
    minWidth: HEADER_MENU_CONTROL_SIZE,
    minHeight: HEADER_MENU_CONTROL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
