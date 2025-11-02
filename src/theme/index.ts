import type { ThemeMode } from '../state/settings'

export type ResolvedThemeName = 'light' | 'dark'

export const resolveThemeName = (
  mode: ThemeMode,
  systemPreference: 'light' | 'dark' | null | undefined,
): ResolvedThemeName => {
  if (mode === 'auto') {
    return systemPreference === 'dark' ? 'dark' : 'light'
  }
  return mode
}

export const isDarkTheme = (theme: ResolvedThemeName): boolean => theme === 'dark'

