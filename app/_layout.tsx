import { useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation'
import { Stack } from 'expo-router'
import { Provider } from 'components/Provider'
import { isDarkTheme, resolveThemeName } from '../src/theme'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

export const unstable_settings = {
  // Ensure that reloading on a nested route keeps a back button present.
  // `anchor` replaced `initialRouteName` in Expo Router 58 (SDK 57 -> 58 migration guide);
  // same semantics, only the key changed.
  anchor: '(tabs)',
}

// 2026-10-17: no font loading and no manual splash gating here on purpose. This layout
// used to `useFonts` Inter-Medium/Inter-Bold (as `Inter`/`InterBold`) and hold the splash
// screen until they loaded — a leftover from the Tamagui config v4 era. Since config v5
// (June 2026) Tamagui's `body`/`heading` fonts are `createSystemFont()` (native family
// "System", web CSS stack without Inter), and nothing in Soli sets `fontFamily: 'Inter'`
// (cards use the embedded `CardTextAndroid` family via app.json's expo-font plugin), so
// the two OTFs were loaded and never drawn. Embedding them with the expo-font plugin
// (SDK 58 candidate C4) would only have embedded unused files. Expo Router holds the splash
// itself (`_internal_preventAutoHideAsync` in renderRootComponent) and releases it once the
// first route is mounted, so no `SplashScreen.preventAutoHideAsync`/`hideAsync` pair is
// needed. If a custom UI font is ever wanted again: embed it via the expo-font config plugin
// (not useFonts) and set its `fontFamily` in components/AppText.tsx (iOS = PostScript name).
// (Tamagui itself was removed on 2026-10-18; UI text is plain RN `Text` via AppText.)

export default function RootLayout() {
  return (
    <Providers>
      <RootLayoutNav />
    </Providers>
  )
}

const Providers = ({ children }: { children: React.ReactNode }) => {
  return <Provider>{children}</Provider>
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const resolvedThemeName = resolveThemeName(colorScheme)
  const navigationTheme = resolvedThemeName === 'dark' ? DarkTheme : DefaultTheme
  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={isDarkTheme(resolvedThemeName) ? 'light' : 'dark'} />
      {/* Settings/History live inside the (tabs) drawer only. They used to also be
          root stack routes with re-export shims in (tabs)/; nothing ever navigated
          to the root routes, so the duplication was removed (clean-code review #2). */}
      <Stack>
        <Stack.Screen
          name="(tabs)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </ThemeProvider>
  )
}
