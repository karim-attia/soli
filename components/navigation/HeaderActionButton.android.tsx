import { FilledTonalButton, Host, Text } from '@expo/ui/jetpack-compose'
import { semantics } from '@expo/ui/jetpack-compose/modifiers'

import type { HeaderActionButtonProps } from './HeaderActionButton'

// Android half of HeaderActionButton: a native Material 3 `FilledTonalButton` (Expo UI
// Jetpack Compose) hosted in the react-navigation header. Karim chose native per platform
// 2026-10-18 (plan "prompt 6", option H3) after seeing the router text action (H1) next to
// the pre-removal Tamagui pill: the tonal button keeps "New Game" as prominent as the pill
// was, but it is Material's own control. Platform file on purpose — `@expo/ui/jetpack-compose`
// views do not exist on iOS, which keeps its UIBarButtonItem-style text action.
// Colours: deliberately the Material You DEFAULT (Karim 2026-10-18, prompt 8: the light green
// "was kind of nice"). Expo UI's `Host` themes with `dynamicLight/DarkColorScheme` on Android
// 12+ (wallpaper-derived; `secondaryContainer`/`onSecondaryContainer` for a tonal button) and
// the baseline Material 3 purple scheme below API 31 — the same scheme the Settings
// FieldGroup switches/pickers get, so header and Settings always match. Trade-off: the tint
// differs per device and may clash with the green board for some wallpapers. Pinned neutral
// greys (`palette.button*`, the Tamagui-pill look) were tried first and reverted.
// A11y: `contentDescription` is what agent-device/TalkBack read — the soli-testing matrix
// handle `Start a new game` lives here on Android.
export const HeaderActionButton = ({
  label,
  onPress,
  accessibilityLabel,
}: HeaderActionButtonProps) => (
  <Host matchContents>
    <FilledTonalButton
      onClick={onPress}
      modifiers={[semantics({ contentDescription: accessibilityLabel ?? label })]}
    >
      <Text>{label}</Text>
    </FilledTonalButton>
  </Host>
)
