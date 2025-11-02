import { Drawer } from 'expo-router/drawer'
import { useTheme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Atom, AudioWaveform, Settings, Smile } from '@tamagui/lucide-icons'

export default function DrawerLayout() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const headerRightPadding = 16

  return (
    <Drawer
      screenOptions={{
        drawerActiveTintColor: theme.red10.val,
        drawerInactiveTintColor: theme.color.val,
        drawerStyle: {
          backgroundColor: theme.background.val,
        },
        headerStyle: {
          backgroundColor: theme.background.val,
          borderBottomColor: theme.borderColor.val,
        },
        headerTintColor: theme.color.val,
        headerStatusBarHeight: insets.top,
        headerLeft: () => null,
        headerRightContainerStyle: {
          paddingRight: headerRightPadding,
        },
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Klondike',
          headerTitle: 'Klondike',
          drawerLabel: 'Play Klondike',
          drawerIcon: ({ color, size }) => <Atom color={color as any} size={size} />,
        }}
      />
      <Drawer.Screen
        name="two"
        options={{
          title: 'Solver Lab',
          drawerLabel: 'Solver Lab',
          drawerIcon: ({ color, size }) => <AudioWaveform color={color as any} size={size} />,
        }}
      />
      <Drawer.Screen
        name="hello"
        options={{
          title: 'Hello',
          drawerLabel: 'Hello',
          drawerIcon: ({ color, size }) => <Smile color={color as any} size={size} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerLabel: 'Settings',
          drawerIcon: ({ color, size }) => <Settings color={color as any} size={size} />,
        }}
      />
    </Drawer>
  )
}
