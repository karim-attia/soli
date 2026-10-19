import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

const TRANSITION = { duration: 140 } as const
const HIDDEN_SCALE = 0.985
const BACKGROUND = 'rgba(15, 23, 42, 0.92)'
// Emphasis pulse (F15 re-affirm): a quick scale bump that reuses the entry
// feel — loud enough to say "yes, this warning is the answer", small enough
// not to read as a new event.
const EMPHASIS_SCALE = 1.06
const EMPHASIS_UP = { duration: 110 } as const
const EMPHASIS_DOWN = { duration: 180 } as const

// Game notice bubble above the bottom dock (renamed from UnwinnableBubble in
// F11 when it grew beyond one message). All variants share this one visual —
// the text IS the variant: "No winning moves left…" (unwinnable warning),
// "No more useful moves…" (classic stuck warning), "No hint found." (hint
// button). Visual clone of UndoHintBubble minus the caret (it doesn't point at
// a specific button): plain RN + Reanimated on purpose — the gesture-sensitive
// bottom dock avoids Tamagui/expo-ui (see UndoScrubber history).
// pointerEvents="none" so it never competes with the undo pan/tap; the a11y
// announcement fires in useHint when the bubble is shown, so this node only
// carries a label for inspection. testID stays `hint-bubble` (pre-rename name)
// so device-test recipes and screenshots assertions keep working.
//
// emphasisNonce (F14/F15): bump to replay the emphasis pulse — fired on every
// warning start AND on hint presses that re-affirm an outstanding warning
// (the bubble is persistent while a dead era lasts, so the pulse is the only
// per-press feedback).
export const GameNoticeBubble = ({
  text,
  bottom,
  emphasisNonce = 0,
}: {
  text: string | null
  bottom: number
  emphasisNonce?: number
}) => {
  const visible = text !== null
  // Keep the last shown copy during the fade-out so the pill doesn't
  // collapse into an empty shell mid-animation.
  const [lastText, setLastText] = useState('')
  useEffect(() => {
    if (text !== null) {
      setLastText(text)
    }
  }, [text])
  const displayText = text ?? lastText

  const emphasisScale = useSharedValue(1)
  useEffect(() => {
    // Nonce 0 = nothing fired yet (mount) — don't pulse an empty bubble.
    if (emphasisNonce === 0) {
      return
    }
    emphasisScale.value = withSequence(
      withTiming(EMPHASIS_SCALE, EMPHASIS_UP),
      withTiming(1, EMPHASIS_DOWN)
    )
  }, [emphasisNonce, emphasisScale])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(visible ? 1 : 0, TRANSITION),
      // Two scale entries multiply: entry/exit transition × emphasis pulse.
      transform: [
        { scale: withTiming(visible ? 1 : HIDDEN_SCALE, TRANSITION) },
        { scale: emphasisScale.value },
      ],
    }
  }, [visible])

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.layer, { bottom }, animatedStyle]}
      accessible
      accessibilityLabel={displayText}
      accessibilityLiveRegion="polite"
      testID="hint-bubble"
    >
      <View style={styles.bubble}>
        <Text style={styles.text}>{displayText}</Text>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    // Above the scrub overlay (3), same layering rule as UndoHintBubble. The
    // two bubbles can theoretically show at once (undo discovery hint + solver
    // notice) — rare enough that overlapping is accepted for v1.
    zIndex: 4,
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: BACKGROUND,
    shadowColor: 'rgba(0, 0, 0, 0.35)',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  text: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
})
