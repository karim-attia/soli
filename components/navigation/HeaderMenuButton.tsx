import { Platform, StyleSheet, View } from 'react-native'
import { Host, Icon } from '@expo/ui'
import { HeaderButton } from 'expo-router/react-navigation'
import { useTheme } from 'tamagui'

// HeaderButton owns press behavior, while these app-owned minima preserve platform-sized control geometry.
export const IOS_HEADER_CONTROL_SIZE = 44
const ANDROID_HEADER_CONTROL_SIZE = 48
// This optical inset aligns the iOS symbol with Soli's surrounding headers.
export const IOS_HEADER_LEADING_PADDING = 4

export const HEADER_MENU_LEADING_PADDING =
  Platform.OS === 'ios' ? IOS_HEADER_LEADING_PADDING : 0

const HEADER_MENU_CONTROL_SIZE =
  Platform.OS === 'android' ? ANDROID_HEADER_CONTROL_SIZE : IOS_HEADER_CONTROL_SIZE

const MENU_ICON = Icon.select({
  ios: 'line.3.horizontal',
  android: import('@expo/material-symbols/menu.xml'),
})

type HeaderMenuButtonProps = {
  onPress: () => void
}

export const HeaderMenuButton = ({ onPress }: HeaderMenuButtonProps) => {
  const theme = useTheme()
  const iconColor = theme.color?.val

  return (
    <HeaderButton
      onPress={onPress}
      accessibilityLabel="Open navigation menu"
      pressOpacity={0.65}
      style={styles.button}
    >
      <View pointerEvents="none">
        <Host matchContents>
          <Icon name={MENU_ICON} color={iconColor} />
        </Host>
      </View>
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
