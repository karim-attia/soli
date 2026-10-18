import { Platform, StyleSheet, View } from 'react-native'
import { Host, Icon, type IconProps } from '@expo/ui'
import { environment } from '@expo/ui/swift-ui/modifiers'

// A platform-native glyph (SF Symbol on iOS, Material Symbol XML on Android) hosted inside
// React Native UI — header buttons and drawer rows. The `Host matchContents` sizes itself to
// the icon; `pointerEvents="none"` keeps the native view from stealing the parent's press.
// `color` is required: content colour does not inherit across the RN / Expo UI boundary
// (docs/external-package-guides/expo-ui.md), and on iOS the glyph is pinned to the light
// scheme (below), so without a colour it would be the light-scheme primary (black) in dark
// mode. Omit `size` for the intrinsic 24 dp/pt. Build the `name` with `Icon.select` (see
// components/navigation/drawerIcons.ts) so Metro can drop the other platform's asset.
//
// `size` is also the fixed square SLOT the glyph is centred in (2026-10-18, Karim: "the text
// in the menu is not aligned anymore"): with `matchContents` the Host takes the glyph's
// intrinsic width, and SF Symbols at the same point size differ by up to ~8 pt (play.fill
// ≈ 18 pt, star ≈ 26 pt), so react-navigation's drawer labels (`marginStart: 12` after the
// icon) started at five different x positions. Android's Compose `Icon` already applies
// `Modifier.size(size)`, so the slot only matters on iOS — kept on both for one code path.
// `scale` draws the glyph at `size * scale` while the slot stays `size` — the per-glyph
// optical correction from drawerIcons.ts. A glyph wider than the slot overflows visibly
// (RN defaults to `overflow: visible`; verified on both platforms), which is fine.
export type NativeIconProps = Pick<IconProps, 'name' | 'size'> &
  Required<Pick<IconProps, 'color'>> & {
    scale?: number
  }

// iOS: the SF Symbol always renders its LIGHT-scheme shape (2026-10-18, Karim: "fix the iOS
// dark-mode face.smiling rendering so it matches the outlined look in light mode"). Symbols
// that have an `.inverse` twin (`face.smiling`, `eyes`, `moonphase.*`, `printer`, `soccerball`,
// `wand.*`, … — 69 renditions in the system CoreGlyphs `Assets.car`) ship a separate
// dark-appearance rendition, and for `face.smiling` that rendition is the FILLED face, so in
// dark mode the Hello row drew a white disc with cut-out features next to four outlined
// glyphs. It is an asset lookup by colour scheme, not a rendering mode: `symbolRenderingMode`
// and `symbolVariant` leave it alone (verified with SwiftUI on macOS 27, same symbol set),
// `.environment(\.colorScheme, .light)` on the image is what selects the light rendition, and
// Expo UI exposes exactly that as its `environment` modifier. The colour is explicit anyway,
// so nothing else about the glyph depends on the scheme; symbols without a dark rendition are
// pixel-identical with and without this (plan "smiley" Testing entry). Swapping the symbol
// (`smiley` has no dark rendition) was the alternative — rejected to keep Karim's chosen glyph.
// Not applied on Android: Compose icons are tinted vector drawables with no scheme variants,
// and an iOS-only modifier would be an unknown `$type` there.
const IOS_LIGHT_SCHEME_GLYPH =
  Platform.OS === 'ios'
    ? [environment({ key: 'colorScheme', value: 'light' })]
    : undefined

export const NativeIcon = ({ name, color, size, scale = 1 }: NativeIconProps) => (
  <View
    pointerEvents="none"
    style={size != null ? [styles.slot, { width: size, height: size }] : undefined}
  >
    <Host matchContents>
      <Icon
        name={name}
        color={color}
        size={size != null ? Math.round(size * scale) : size}
        modifiers={IOS_LIGHT_SCHEME_GLYPH}
      />
    </Host>
  </View>
)

const styles = StyleSheet.create({
  slot: { alignItems: 'center', justifyContent: 'center' },
})
