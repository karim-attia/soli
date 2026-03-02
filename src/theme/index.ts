import type { ColorSchemeName } from 'react-native'
import type { ThemeMode } from '../state/settings'

export type ResolvedThemeName = 'light' | 'dark'

// SDK 55 / RN 0.83: include full ColorSchemeName type (e.g. 'unspecified') from useColorScheme().
export const resolveThemeName = (
  mode: ThemeMode,
  systemPreference: ColorSchemeName
): ResolvedThemeName => {
  if (mode === 'auto') {
    return systemPreference === 'dark' ? 'dark' : 'light'
  }
  return mode
}

export const isDarkTheme = (theme: ResolvedThemeName): boolean => theme === 'dark'
