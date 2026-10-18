import { StyleSheet, Text, type TextProps } from 'react-native'

import { usePalette } from '../src/theme/tokens'

// RN `Text` with the theme text color as default. Replaces the Tamagui `Text`/`Paragraph`/
// `Anchor` usages (2026-10-18 Tamagui removal); the variants reproduce exactly what those
// components injected on native so nothing shifts:
// - body:    the default-size Tamagui `Paragraph`. The v5 token dump says `$true` = 15/23,
//            but the Phase 0 device baselines show it RENDERED at 17 px with a 22 px line
//            pitch on both platforms (iOS cap height 36 px @3x = 17 pt, Android 32 px @2.625
//            = 17 sp; two-line paragraphs 66 px / 58 px apart = 22). With 15/23 the Hello
//            copy wrapped differently, so `body` follows the measurement (2026-10-18); the
//            Tamagui code path that produced 17/22 was not identified. Revert to 15/23 only
//            together with a new on-device check.
// - caption: `Paragraph color="$color10" fontSize={14}` — the fontSize prop overrode only the
//            size and the lineHeight stayed 23 (history row heights matched on device).
// - title:   the row/sheet heading `Text fontSize={16} fontWeight="700"`.
// - plain:   Tamagui core `Text` — colour only, no metrics. Needed for the one-off sizes
//            (stat tiles 13/24, 18 px headings, 12 px section labels): forcing `body`'s
//            lineHeight 23 onto 24 px text would clip it.
// An explicit `style` always wins; pass `color` for a non-theme colour (links, status).
type AppTextVariant = 'body' | 'caption' | 'title' | 'plain'

export type AppTextProps = TextProps & {
  variant?: AppTextVariant
  color?: string
}

export const AppText = ({ variant = 'body', color, style, ...rest }: AppTextProps) => {
  const palette = usePalette()
  const themeColor = variant === 'caption' ? palette.color10 : palette.color
  return (
    <Text {...rest} style={[styles[variant], { color: color ?? themeColor }, style]} />
  )
}

const styles = StyleSheet.create({
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  caption: { fontSize: 14, lineHeight: 23, fontWeight: '400' },
  title: { fontSize: 16, fontWeight: '700' },
  plain: {},
})
