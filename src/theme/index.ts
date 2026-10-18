import type { ColorSchemeName } from 'react-native'

export type ResolvedThemeName = 'light' | 'dark'

// Since RN 0.87 `ColorSchemeName` is just 'light' | 'dark' and `useColorScheme()` returns
// `ColorSchemeName | null` (never 'unspecified'); null/undefined fall back to light.
export const resolveThemeName = (
  systemPreference: ColorSchemeName | null | undefined
): ResolvedThemeName => (systemPreference === 'dark' ? 'dark' : 'light')

export const isDarkTheme = (theme: ResolvedThemeName): boolean => theme === 'dark'
