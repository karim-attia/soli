import { Drawer } from 'expo-router/drawer'

import { AppDrawerContent } from '../../components/navigation/AppDrawerContent'
import { NativeIcon } from '../../components/NativeIcon'
import { DRAWER_ICONS } from '../../components/navigation/drawerIcons'
import { t } from '../../src/i18n'
import { usePalette } from '../../src/theme/tokens'

export default function DrawerLayout() {
  const palette = usePalette()
  const headerRightPadding = 16

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        drawerActiveTintColor: palette.red10,
        drawerInactiveTintColor: palette.color,
        swipeEnabled: false,
        drawerStyle: {
          backgroundColor: palette.background,
        },
        headerStyle: {
          backgroundColor: palette.background,
          borderBottomColor: palette.borderColor,
        },
        headerTintColor: palette.color,
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
      {/* Drawer glyphs are native symbols (NativeIcon, see drawerIcons.ts); react-navigation
          hands us the tint and size per row, and `size` is also the fixed glyph slot that keeps
          the labels aligned (NativeIcon); the spread entry adds the glyph's optical `scale`.
          The History route used to sit behind a `Drawer.Protected guard={Platform.OS !==
          'web'}` — gone with the web target (2026-10-18). */}
      <Drawer.Screen
        name="index"
        options={{
          // "Soli" is the product name: literal in every language (not in en.json).
          title: 'Soli',
          headerTitle: 'Soli',
          drawerLabel: t('nav.play'),
          drawerIcon: ({ color, size }) => (
            <NativeIcon {...DRAWER_ICONS.play} color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="hello"
        options={{
          title: t('nav.hello'),
          drawerLabel: t('nav.hello'),
          drawerIcon: ({ color, size }) => (
            <NativeIcon {...DRAWER_ICONS.hello} color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="history"
        options={{
          title: t('nav.history'),
          drawerLabel: t('nav.history'),
          drawerIcon: ({ color, size }) => (
            <NativeIcon {...DRAWER_ICONS.history} color={color} size={size} />
          ),
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: t('nav.settings'),
          drawerLabel: t('nav.settings'),
          drawerIcon: ({ color, size }) => (
            <NativeIcon {...DRAWER_ICONS.settings} color={color} size={size} />
          ),
        }}
      />
    </Drawer>
  )
}
