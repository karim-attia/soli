import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native'

import { usePalette } from '../src/theme/tokens'

// The in-sheet text button (History Retry/Share, dev Demo sheet). RN `Pressable`, not an
// Expo UI `Button`: these buttons sit inside `AppSheet`'s RNHostView and Expo UI controls
// nested in the sheet had unreliable gestures on Android (history.tsx / demo-sheet-cleanup
// notes). Metrics reproduce the Tamagui `Button size="$3"` every call site used
// (2026-10-18 Tamagui removal): 36 px high, 13 px side padding, radius 7, 1 px border that
// only shows while pressed, label 14/21/400. Colours are the `button*` palette keys — the
// Tamagui Button drew from its `surface2` component theme (85 % grey idle in light mode),
// NOT the base `background` (97 %); the first RN version used the latter and the sheet
// buttons nearly vanished against the sheet (device check 2026-10-18). One size on purpose.
export type AppButtonProps = {
  label: string
  onPress: () => void
  disabled?: boolean
  accessibilityLabel?: string
  testID?: string
  // Layout only (e.g. `flex: 1` in a row); colours/metrics are not meant to be overridden.
  style?: StyleProp<ViewStyle>
}

export const AppButton = ({
  label,
  onPress,
  disabled = false,
  accessibilityLabel,
  testID,
  style,
}: AppButtonProps) => {
  const palette = usePalette()
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      // Tamagui's Button was `accessible` with role button; without this the Android a11y
      // tree (agent-device snapshot) loses the sheet buttons.
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      testID={testID}
      style={({ pressed }) => [
        styles.frame,
        {
          backgroundColor: pressed
            ? palette.buttonBackgroundPress
            : palette.buttonBackground,
          borderColor: pressed ? palette.buttonBorderPress : 'transparent',
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text numberOfLines={1} style={[styles.label, { color: palette.buttonColor }]}>
        {label}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  frame: {
    height: 36,
    paddingHorizontal: 13,
    borderRadius: 7,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // History's Retry button carried `opacity={canRetry ? 1 : 0.5}` explicitly; now built in.
  disabled: { opacity: 0.5 },
  label: { fontSize: 14, lineHeight: 21, fontWeight: '400', flexShrink: 1 },
})
