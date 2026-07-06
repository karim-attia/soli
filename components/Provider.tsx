import { useColorScheme } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { TamaguiProvider, type TamaguiProviderProps } from 'tamagui'
import { SettingsProvider } from '../src/state/settings'
import { HistoryProvider } from '../src/state/history'
import { resolveThemeName } from '../src/theme'
import { config } from '../tamagui.config'

type ProviderProps = Omit<TamaguiProviderProps, 'config' | 'defaultTheme'>

export function Provider({ children, ...rest }: ProviderProps) {
  return (
    // requirement 20-6: GestureHandlerRootView must wrap the app root on iOS.
    // Without it, iOS gestures can cancel during React Native refresh/commits.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <HistoryProvider>
          <TamaguiWithSettings {...rest}>{children}</TamaguiWithSettings>
        </HistoryProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  )
}

const TamaguiWithSettings = ({ children, ...rest }: ProviderProps) => {
  const colorScheme = useColorScheme()
  // Keep Tamagui on the OS scheme so independently hosted Expo UI controls agree.
  const themeName = resolveThemeName(colorScheme)

  return (
    // Toast stack (@tamagui/toast: ToastProvider/ToastViewport/CurrentToast) fully removed
    // (2026-07-06): no code ever showed a toast, and on Android the ToastViewport's
    // full-screen focusable wrapper hid the ENTIRE app subtree from accessibility services
    // (a11y tree ended at its "Notifications (F8)" node on every screen). If toasts are
    // reintroduced, avoid a full-screen focusable viewport and re-verify the Android a11y
    // tree (agent-device snapshot -i must list board cards).
    <TamaguiProvider config={config} defaultTheme={themeName} {...rest}>
      {children}
    </TamaguiProvider>
  )
}
