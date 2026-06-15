import type { ColorSchemeName } from 'react-native'

export type ResolvedThemeName = 'light' | 'dark'

// React Native may report `unspecified`; use the platform's light fallback in that case.
export const resolveThemeName = (systemPreference: ColorSchemeName): ResolvedThemeName =>
  systemPreference === 'dark' ? 'dark' : 'light'

export const isDarkTheme = (theme: ResolvedThemeName): boolean => theme === 'dark'
