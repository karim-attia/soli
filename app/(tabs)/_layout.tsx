import { Drawer } from 'expo-router/drawer'
import { Platform } from 'react-native'
import { useTheme } from 'tamagui'
import { Atom, Clock, Settings, Smile } from '@tamagui/lucide-icons-2'

import { AppDrawerContent } from '../../components/navigation/AppDrawerContent'

export default function DrawerLayout() {
  const theme = useTheme()
  const headerRightPadding = 16

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
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
        // `headerStatusBarHeight: insets.top` removed on SDK 58 (2026-10-17): it was
        // identical to Expo Router's header default (`isParentHeaderShown ? 0 :
        // insets.top`; the root Stack hides its header, so the drawer header gets
        // the full top inset anyway).
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
      <Drawer.Protected guard={Platform.OS !== 'web'}>
        <Drawer.Screen
          name="history"
          options={{
            title: 'History',
            drawerLabel: 'History',
            drawerIcon: ({ color, size }) => <Clock color={color as any} size={size} />,
          }}
        />
      </Drawer.Protected>
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
