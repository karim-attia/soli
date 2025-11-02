import { useColorScheme } from 'react-native'
import { TamaguiProvider, type TamaguiProviderProps } from 'tamagui'
import { ToastProvider, ToastViewport } from '@tamagui/toast'
import { CurrentToast } from './CurrentToast'
import { SettingsProvider, useSettings } from '../src/state/settings'
import { HistoryProvider } from '../src/state/history'
import { resolveThemeName } from '../src/theme'
import { config } from '../tamagui.config'

export function Provider({ children, ...rest }: Omit<TamaguiProviderProps, 'config'>) {
  return (
    <SettingsProvider>
      <HistoryProvider>
      <TamaguiWithSettings {...rest}>{children}</TamaguiWithSettings>
      </HistoryProvider>
    </SettingsProvider>
  )
}

const TamaguiWithSettings = ({ children, ...rest }: Omit<TamaguiProviderProps, 'config'>) => {
  const colorScheme = useColorScheme()
  const {
    state: { themeMode },
  } = useSettings()
  const themeName = resolveThemeName(themeMode, colorScheme)

  return (
    <TamaguiProvider config={config} defaultTheme={themeName} {...rest}>
      <ToastProvider
        swipeDirection="horizontal"
        duration={6000}
        native={
          [
            // uncomment the next line to do native toasts on mobile. NOTE: it'll require you making a dev build and won't work with Expo Go
            // 'mobile'
          ]
        }
      >
        {children}
        <CurrentToast />
        <ToastViewport top="$8" left={0} right={0} />
      </ToastProvider>
    </TamaguiProvider>
  )
}
