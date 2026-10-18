import { useColorScheme } from 'react-native'

import { resolveThemeName, type ResolvedThemeName } from './index'

// Theme colors outside the board constants. The literals were dumped on 2026-10-18 from the
// `light`/`dark` themes of `@tamagui/config/v5` (the last Tamagui config Soli used) so the
// Tamagui removal (docs/product/tamagui-3-upgrade/tamagui-major-upgrade.md) stays visually
// identical. Add a key only when a screen needs it; the board keeps its own palette in
// src/features/klondike/constants.ts.
export type Palette = {
  color: string
  background: string
  backgroundPress: string
  // Tamagui's `Separator` hairline used `backgroundFocus`, not `borderColor`.
  backgroundFocus: string
  borderColor: string
  borderColorHover: string
  color3: string
  color4: string
  color7: string
  color8: string
  color10: string
  color11: string
  red10: string
  blue10: string
  green3: string
  green7: string
  green10: string
  green11: string
  yellow3: string
  yellow7: string
  yellow11: string
  accent10: string
  // Tamagui `Button` never used the base theme: config v5 maps it to the `surface2`
  // component theme (`light_Button`/`dark_Button`, one palette step darker than the base
  // surface). Found on device 2026-10-18 (sheet buttons rendered 97 % instead of 85 % grey);
  // values decoded from `@tamagui/themes@2.4.2` generated-v5 (`t([...])` tables).
  buttonBackground: string
  buttonBackgroundPress: string
  // Tamagui's press border used `borderColorHover` of that component theme.
  buttonBorderPress: string
  buttonColor: string
}

export const PALETTE: Record<ResolvedThemeName, Palette> = {
  light: {
    color: 'hsla(0, 0%, 2%, 1)',
    background: 'hsla(0, 0%, 97%, 1)',
    backgroundPress: 'hsla(0, 0%, 93%, 1)',
    backgroundFocus: 'hsla(0, 0%, 93%, 1)',
    borderColor: 'hsla(0, 0%, 85%, 1)',
    borderColorHover: 'hsla(0, 0%, 93%, 1)',
    color3: 'hsla(0, 0%, 93%, 1)',
    color4: 'hsla(0, 0%, 85%, 1)',
    color7: 'hsla(0, 0%, 59%, 1)',
    color8: 'hsla(0, 0%, 45%, 1)',
    color10: 'hsla(0, 0%, 20%, 1)',
    color11: 'hsla(0, 0%, 14%, 1)',
    red10: '#dc3e42',
    blue10: '#0588f0',
    green3: '#e6f6eb',
    green7: '#8eceaa',
    green10: '#2b9a66',
    green11: '#218358',
    yellow3: '#fffab8',
    yellow7: '#e4c767',
    yellow11: '#9e6c00',
    accent10: 'hsla(0, 0%, 67%, 1)',
    buttonBackground: 'hsla(0, 0%, 85%, 1)',
    buttonBackgroundPress: 'hsla(0, 0%, 80%, 1)',
    buttonBorderPress: 'hsla(0, 0%, 80%, 1)',
    buttonColor: 'hsla(0, 0%, 14%, 1)',
  },
  dark: {
    color: 'hsla(0, 0%, 100%, 1)',
    background: 'hsla(0, 0%, 8%, 1)',
    backgroundPress: 'hsla(0, 0%, 4%, 1)',
    backgroundFocus: 'hsla(0, 0%, 10%, 1)',
    borderColor: 'hsla(0, 0%, 14%, 1)',
    borderColorHover: 'hsla(0, 0%, 20%, 1)',
    color3: 'hsla(0, 0%, 10%, 1)',
    color4: 'hsla(0, 0%, 14%, 1)',
    color7: 'hsla(0, 0%, 40%, 1)',
    color8: 'hsla(0, 0%, 47%, 1)',
    color10: 'hsla(0, 0%, 67%, 1)',
    color11: 'hsla(0, 0%, 80%, 1)',
    red10: '#ec5d5e',
    blue10: '#3b9eff',
    green3: '#132d21',
    green7: '#28684a',
    green10: '#33b074',
    green11: '#3dd68c',
    yellow3: '#2d2305',
    yellow7: '#665417',
    yellow11: '#f5e147',
    accent10: 'hsla(0, 0%, 20%, 1)',
    buttonBackground: 'hsla(0, 0%, 14%, 1)',
    buttonBackgroundPress: 'hsla(0, 0%, 10%, 1)',
    buttonBorderPress: 'hsla(0, 0%, 40%, 1)',
    buttonColor: 'hsla(0, 0%, 80%, 1)',
  },
}

// Follows the OS scheme (like the old TamaguiProvider did) so the RN-drawn surfaces agree
// with the independently hosted Expo UI controls.
export const usePalette = (): Palette => PALETTE[resolveThemeName(useColorScheme())]

// Tamagui v5 space tokens `$1`..`$5` as plain numbers, so the layouts that used them keep
// their exact gaps/paddings. Not a scale to extend — pick a literal when a value isn't here.
export const SPACE = { 1: 2, 2: 7, 3: 13, 4: 18, 5: 24 } as const
