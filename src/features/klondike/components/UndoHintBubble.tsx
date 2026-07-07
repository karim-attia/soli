import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'

import { UNDO_HINT_COPY } from '../undoHint'

const HINT_TRANSITION = { duration: 140 } as const
const HINT_HIDDEN_SCALE = 0.985
const HINT_BACKGROUND = 'rgba(15, 23, 42, 0.92)'
const CARET_SIZE = 6

// Undo-scrubber discovery hint. Deliberately plain RN + Reanimated instead of
// Tamagui/expo-ui: this gesture-sensitive bottom-dock subtree removed Tamagui Button
// due to iOS gesture conflicts (see UndoScrubber history) — staying consistent here
// matters more than the general components rule.
//
// Deliberately NO X close button (v2 decision): the pan gesture's hitSlop extends
// 50px above the undo button — exactly where an X would sit — so a tappable X would
// steal touches from the very gesture the hint teaches. The 10s auto-dismiss covers
// the "more time to read" motivation instead.
export const UndoHintBubble = React.memo(
  ({ visible, bottom }: { visible: boolean; bottom: number }) => {
    // Always mounted while the dock is visible; fade like the scrub overlay does. No
    // useAnimationToggles() gating: a 140ms functional fade is not a decorative
    // animation (same precedent as the scrub overlay's fade).
    const animatedStyle = useAnimatedStyle(() => {
      return {
        opacity: withTiming(visible ? 1 : 0, HINT_TRANSITION),
        transform: [
          { scale: withTiming(visible ? 1 : HINT_HIDDEN_SCALE, HINT_TRANSITION) },
        ],
      }
    }, [visible])

    return (
      // The layer spans the dock's full width so the caret's percent offset references
      // the dock: the Undo button fills the right 50%, so its center is 25% from the
      // right edge. pointerEvents="none" on the whole subtree (caret included) — it
      // must never compete with the undo tap/pan gesture underneath (same reasoning
      // as the scrub overlay's pointerEvents="none").
      <Animated.View
        pointerEvents="none"
        style={[styles.layer, { bottom }, animatedStyle]}
        accessible
        accessibilityLabel={UNDO_HINT_COPY}
        accessibilityLiveRegion="polite"
        testID="undo-hint"
      >
        <View style={styles.bubble}>
          <Text style={styles.text}>{UNDO_HINT_COPY}</Text>
        </View>
        {/* v2: downward caret pointing at the Undo button (border-trick triangle). */}
        <View style={styles.caret} />
      </Animated.View>
    )
  }
)

UndoHintBubble.displayName = 'UndoHintBubble'

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'flex-end',
    // zIndex 4: above the scrub overlay (3). The bubble sits visually above the
    // overlay's area (not on top of it), so both can be shown at once — the hint
    // deliberately stays visible during scrubbing (device review 2026-07-07).
    zIndex: 4,
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    // More opaque than the scrub overlay's 0.55 for text legibility over the felt.
    backgroundColor: HINT_BACKGROUND,
    shadowColor: 'rgba(0, 0, 0, 0.35)',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  caret: {
    position: 'absolute',
    // Overlap the bubble by 1px: at exactly -CARET_SIZE the triangle only touches the
    // bubble edge and a hairline seam shows on device (subpixel rounding).
    bottom: -CARET_SIZE + 1,
    // Undo button center (25% of dock width from the right), minus half the caret.
    right: '25%',
    marginRight: -CARET_SIZE,
    width: 0,
    height: 0,
    borderLeftWidth: CARET_SIZE,
    borderRightWidth: CARET_SIZE,
    borderTopWidth: CARET_SIZE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: HINT_BACKGROUND,
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
})
