import { Platform } from 'react-native'
import { Icon } from '@expo/ui'

// Drawer row glyphs as native symbols (Expo UI `Icon` via `NativeIcon`), the same mechanism
// as the header hamburger. Chosen 2026-10-18 (Tamagui removal, plan open question 1,
// option A "plain icons"): the lucide `Atom` the Play row used has no SF Symbol / Material
// twin, so Play is a play triangle now.
//
// Weights, decided by Karim 2026-10-18 after in-app comparisons (plan "prompt 5"/"prompt 6"):
// - iOS: SF Symbols at the default regular weight (set "native" as-is: `play.fill`, plain
//   `clock`), which matches the regular-weight drawer labels.
// - Android: Material Symbols Outlined at **wght 300**, NOT the package's wght 400
//   (`@expo/material-symbols` ships only 400): 400 read heavier than the label weight and
//   the pre-removal lucide stroke-2 look ("too markant"); 300 ≈ lucide 2. The XMLs are
//   vendored in assets/icons/material/ via `npx add-material-symbols -w 300 -o
//   assets/icons/material <names>` (plain `<vector>` drawables) — re-run that on every glyph
//   change. EXCEPTION: `play_arrow_wght300.xml` is hand-cropped (viewport 960 → 680) so the
//   triangle is as tall as the other glyphs — Karim 2026-10-18: "the play icon on Android is
//   just too small"; see the comment in that file and re-apply the crop after regenerating.
//   `require()` instead of `import()`: TypeScript only validates `import()` paths through the
//   package `exports` map, local XMLs have no declaration. The babel plugin still turns
//   `Icon.select` into a per-platform branch, so iOS does not ship the XMLs.
//
// Optical balance (`scale`, Karim 2026-10-18 prompt 8: "make all the icons visually look good
// and proportional to each other"): each glyph is drawn at `size * scale` inside the unchanged
// `size` slot (NativeIcon), so labels stay aligned. Measured on device (ink boxes, plan
// "Optical balance"): the circle glyphs (Hello, History) are the reference; a glyph's
// perceived size is taken as the geometric mean of its ink height and the square root of
// its silhouette area — the midpoint between "equal extent" and "equal area", which is what
// Material's keyline shapes encode (circle 20 dp vs square 18 dp on the 24 dp grid,
// https://m2.material.io/design/iconography/system-icons.html) and what Apple's optically
// weighted SF Symbols do (https://developer.apple.com/design/human-interface-guidelines/sf-symbols).
// - iOS `play.fill`: 0.74× the circles' perceived size at 24 pt (a triangle has half the
//   area of its box). 1.2 brings its height to the circles' height; the usual +10 % bonus
//   for pointed shapes is deliberately NOT added because the glyph is filled and already the
//   heaviest in ink per point. Star (26×25 pt) and gear (25 pt) stay: Apple's own balance.
// - Android: Material draws `history` (17 dp) and `star` (17.6×16.7 dp) visibly smaller than
//   `mood`/`settings` (19 dp): 1.125 / 1.167 bring them to the circle's perceived size; the
//   outline `play_arrow` (after the crop: 13.7×17.1 dp) gets 1.3 — the outline stroke
//   scales with it, so weight and extent are fixed in one go (22 dp tall ≈ circle + the
//   pointed-shape bonus). A glyph larger than the 24 dp slot overflows visibly (no clipping
//   on either platform, verified on device) — the slot itself is not enlarged, so the row
//   height and the label x do not move.
export const DRAWER_ICONS = {
  play: {
    name: Icon.select({
      ios: 'play.fill',
      android: require('../../assets/icons/material/play_arrow_wght300.xml'),
    }),
    scale: Platform.select({ ios: 1.2, android: 1.3, default: 1 }),
  },
  hello: {
    name: Icon.select({
      ios: 'face.smiling',
      android: require('../../assets/icons/material/mood_wght300.xml'),
    }),
    scale: 1,
  },
  history: {
    name: Icon.select({
      ios: 'clock',
      android: require('../../assets/icons/material/history_wght300.xml'),
    }),
    scale: Platform.select({ ios: 1, android: 1.125, default: 1 }),
  },
  settings: {
    name: Icon.select({
      ios: 'gearshape',
      android: require('../../assets/icons/material/settings_wght300.xml'),
    }),
    scale: 1,
  },
  rate: {
    name: Icon.select({
      ios: 'star',
      android: require('../../assets/icons/material/star_wght300.xml'),
    }),
    scale: Platform.select({ ios: 1, android: 1.167, default: 1 }),
  },
}
