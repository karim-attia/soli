import { Pressable, StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { AppText } from '../../../../components/AppText'

type CelebrationDebugBadgeProps = {
  label: string
  // Dev tool: tapping cycles to the next celebration mode (restarts the run).
  onPress: () => void
}

const BADGE_BASE_OFFSET = 12

export const CelebrationDebugBadge = ({ label, onPress }: CelebrationDebugBadgeProps) => {
  const insets = useSafeAreaInsets()

  return (
    <Pressable
      testID="celebration-debug-badge"
      onPress={onPress}
      // The badge renders after CelebrationTouchBlocker, so it sits above it and
      // receives taps; a tap here cycles the mode instead of aborting the celebration.
      style={{
        position: 'absolute',
        // Task 1-10: Keep badge above iOS home indicator / Android nav gesture area.
        bottom: insets.bottom + BADGE_BASE_OFFSET,
        right: insets.right + BADGE_BASE_OFFSET,
      }}
    >
      <View style={styles.badge}>
        {/* `body` keeps the Paragraph line height (23) this label always had. */}
        <AppText color="#f8fafc" style={styles.label}>
          {label}
        </AppText>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
  },
  label: {
    fontSize: BADGE_BASE_OFFSET,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})
