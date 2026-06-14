import { Drawer } from 'expo-router/drawer'
import { useTheme } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Atom, Clock, Settings, Smile } from '@tamagui/lucide-icons-2'

export default function DrawerLayout() {
  const theme = useTheme()
  const insets = useSafeAreaInsets()
  const headerRightPadding = 16

  return (
    <Drawer
      screenOptions={{
        drawerActiveTintColor: theme.red10?.val,
        drawerInactiveTintColor: theme.color?.val,
        swipeEnabled: false,
        drawerStyle: {
          backgroundColor: theme.background?.val,
        },
        headerStyle: {
          backgroundColor: theme.background?.val,
          borderBottomColor: theme.borderColor?.val,
        },
        headerTintColor: theme.color?.val,
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
          title: 'Soli',
          headerTitle: 'Soli',
          drawerLabel: 'Play',
          drawerIcon: ({ color, size }) => <Atom color={color as any} size={size} />,
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
        name="history"
        options={{
          title: 'History',
          drawerLabel: 'History',
          drawerIcon: ({ color, size }) => <Clock color={color as any} size={size} />,
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
