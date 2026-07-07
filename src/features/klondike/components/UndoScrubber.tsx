import React, { useCallback, useEffect, useRef } from 'react'
import { type LayoutChangeEvent, StyleSheet, View, Text } from 'react-native'
import Animated, {
  createAnimatedComponent,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { GestureDetector, type GestureType } from 'react-native-gesture-handler'
import { Undo2 } from '@tamagui/lucide-icons-2'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  UNDO_BUTTON_DISABLED_OPACITY,
  UNDO_SCRUB_BUTTON_DIM_OPACITY,
  UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING,
  UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING,
} from '../constants'
import { UndoHintBubble } from './UndoHintBubble'

export type UndoScrubberProps = {
  visible: boolean
  scrubActive: SharedValue<number>
  scrubIndex: SharedValue<number>
  sliderMax: number
  // Current resting timeline position (history length). Only used for the track's
  // a11y readout so automated tests can assert where a scrub landed.
  historyIndex: number
  gesture: GestureType
  canUndo: boolean
  onTrackMetrics: (metrics: { left: number; right: number }) => void
  // One-time undo-scrubber discovery hint (undo-scrubber-hint plan).
  hintVisible: boolean
}

const AnimatedView = createAnimatedComponent(View)
const SCRUBBER_THUMB_SIZE = 20
const SCRUBBER_THUMB_RADIUS = SCRUBBER_THUMB_SIZE / 2
const SCRUBBER_HIDDEN_SCALE = 0.985
const SCRUBBER_TRANSITION = { duration: 140 } as const
// Undo button height: 14px vertical padding ×2 + 20px icon (styles.undoButton). Used
// to anchor the hint bubble just above the button without measuring it — the button
// geometry is static per layout.
const UNDO_BUTTON_HEIGHT = 48

// Keep the native gesture target isolated from board-preview commits. Only stable gesture,
// shared-value, and undo-availability changes should update this subtree.
const GestureWrapper = React.memo(
  ({
    gesture,
    scrubActive,
    canUndo,
  }: {
    gesture: GestureType
    scrubActive: SharedValue<number>
    canUndo: boolean
  }) => {
    const buttonStyle = useAnimatedStyle(() => {
      const opacity =
        scrubActive.value > 0
          ? UNDO_SCRUB_BUTTON_DIM_OPACITY
          : canUndo
            ? 1
            : UNDO_BUTTON_DISABLED_OPACITY

      return { opacity: withTiming(opacity, SCRUBBER_TRANSITION) }
    }, [canUndo, scrubActive])

    return (
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.undoButton, buttonStyle]}
          collapsable={false}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Undo"
          // No accessibilityState={{ disabled: !canUndo }} here: on Android it
          // disables the NATIVE view, which drops all touches — the scrub pan
          // (which deliberately ignores canUndo so redo works from index 0)
          // then never fires, making redo unreachable after a full-left scrub.
          // Found 2026-07-06 by the Android scrubber workout; dimmed opacity
          // already conveys the disabled look.
          testID="undo"
        >
          <Undo2 size={20} color="#000" />
          <Text style={styles.undoButtonText}>Undo</Text>
        </Animated.View>
      </GestureDetector>
    )
  }
)

GestureWrapper.displayName = 'GestureWrapper'

export const UndoScrubber = React.memo(
  ({
    visible,
    scrubActive,
    scrubIndex,
    sliderMax,
    historyIndex,
    gesture,
    canUndo,
    onTrackMetrics,
    hintVisible,
  }: UndoScrubberProps) => {
    const trackRef = useRef<View>(null)
    const trackWidth = useSharedValue(0)
    const safeArea = useSafeAreaInsets()
    const bottomDockOffset = safeArea.bottom + UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING

    const measureTrack = useCallback(() => {
      const track = trackRef.current
      if (!track) {
        return
      }
      track.measureInWindow((x, _y, width) => {
        if (width <= 0) {
          return
        }
        onTrackMetrics({ left: x, right: x + width })
      })
    }, [onTrackMetrics])

    const handleTrackLayout = useCallback(
      (event: LayoutChangeEvent) => {
        trackWidth.value = event.nativeEvent.layout.width
        measureTrack()
      },
      [measureTrack, trackWidth]
    )

    useEffect(() => {
      if (!visible) {
        return
      }
      measureTrack()
    }, [measureTrack, sliderMax, visible])

    const activeTrackStyle = useAnimatedStyle(() => {
      const clampedIndex = Math.max(0, Math.min(scrubIndex.value, sliderMax))
      const normalized = sliderMax <= 0 ? 0 : clampedIndex / sliderMax
      const travelWidth = Math.max(trackWidth.value - SCRUBBER_THUMB_SIZE, 0)
      const thumbCenter = normalized * travelWidth + SCRUBBER_THUMB_RADIUS
      return {
        width: Math.min(trackWidth.value, Math.max(SCRUBBER_THUMB_RADIUS, thumbCenter)),
      }
    }, [scrubIndex, sliderMax, trackWidth])

    const thumbStyle = useAnimatedStyle(() => {
      const clampedIndex = Math.max(0, Math.min(scrubIndex.value, sliderMax))
      const normalized = sliderMax <= 0 ? 0 : clampedIndex / sliderMax
      const travelWidth = Math.max(trackWidth.value - SCRUBBER_THUMB_SIZE, 0)
      return {
        transform: [{ translateX: normalized * travelWidth }],
      }
    }, [scrubIndex, sliderMax, trackWidth])

    const overlayStyle = useAnimatedStyle(() => {
      const active = scrubActive.value > 0
      return {
        opacity: withTiming(active ? 1 : 0, SCRUBBER_TRANSITION),
        transform: [
          {
            scale: withTiming(active ? 1 : SCRUBBER_HIDDEN_SCALE, SCRUBBER_TRANSITION),
          },
        ],
      }
    }, [scrubActive])

    if (!visible) {
      return null
    }

    return (
      <View
        style={[
          styles.container,
          // Task 20-6: Keep the pre-wrapper geometry here: the scrubber's bottom dock
          // height should be the Android/iOS inset plus our explicit extra breathing room.
          // That matches the older layout more faithfully than the SafeAreaView wrapper
          // experiments, including the perceived right-side placement.
          { paddingBottom: safeArea.bottom + UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING },
        ]}
      >
        <AnimatedView
          pointerEvents="none"
          style={[
            styles.overlay,
            overlayStyle,
            {
              // Task 20-6: The button can safely use container padding, but the scrubber
              // overlay is absolutely positioned and will otherwise keep stretching into
              // the Android system-bar area. Mirror the same dock offset here so the
              // active scrubber panel stays above the nav/home indicator zone too.
              bottom: bottomDockOffset,
            },
          ]}
        >
          {/* Keep the visual scrub overlay on shared values instead of Slider props:
            we learned that React-driven per-step updates add avoidable churn during long scrubs. */}
          <View style={styles.slider}>
            {/* Automation handle (klondike-card-accessibility follow-up): this node's
              bounds ARE the gesture's scrub bounds (same trackRef the pan math uses),
              and the label carries the resting position readout. Deterministic scrub
              drag for device tests: press on the Undo button (anchor = current
              position), then drag horizontally to
                x = fingerStartX - ((anchor - target) / anchor) * (fingerStartX - trackLeft)
              for target < anchor (mirror with the right edge for redo). Keep vertical
              movement < 100px or the pan fails; needs >= 5px horizontal to start.
              Trade-off: historyIndex in the label makes this subtree re-render per scrub
              step (the memoized GestureWrapper hot path stays isolated). If long scrubs
              ever jank, drop historyIndex from the label — geometry alone still helps. */}
            <View
              ref={trackRef}
              onLayout={handleTrackLayout}
              style={styles.track}
              accessible
              accessibilityLabel={`Undo scrubber, position ${historyIndex} of ${sliderMax}`}
              testID="undo-scrubber-track"
            >
              <AnimatedView style={[styles.trackActive, activeTrackStyle]} />
              <AnimatedView style={[styles.thumb, thumbStyle]} />
            </View>
          </View>
        </AnimatedView>
        {/* Hint disappears together with the whole dock on win/celebration (this
          component returns null above), so no extra hiding logic is needed here. */}
        <UndoHintBubble
          visible={hintVisible}
          bottom={bottomDockOffset + UNDO_BUTTON_HEIGHT + 8}
        />
        <GestureWrapper gesture={gesture} scrubActive={scrubActive} canUndo={canUndo} />
      </View>
    )
  }
)

UndoScrubber.displayName = 'UndoScrubber'

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    width: '100%',
    minHeight: 72,
    position: 'relative',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    paddingHorizontal: UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING,
    paddingVertical: 18,
    borderRadius: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    // The old pile-local card measurements made an updating overlay above the gesture target
    // unstable on iOS. The absolute card layer removed that churn, and pointerEvents="none"
    // keeps this shared visual treatment from competing for the gesture on either platform.
    zIndex: 3,
    shadowColor: 'rgba(0, 0, 0, 0.35)',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  slider: {
    alignSelf: 'stretch',
    width: '100%',
  },
  track: {
    position: 'relative',
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    overflow: 'visible',
  },
  trackActive: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  thumb: {
    position: 'absolute',
    top: -4,
    left: 0,
    width: SCRUBBER_THUMB_SIZE,
    height: SCRUBBER_THUMB_SIZE,
    borderRadius: SCRUBBER_THUMB_RADIUS,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    shadowColor: 'rgba(0, 0, 0, 0.28)',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  undoButton: {
    position: 'relative',
    width: '50%',
    alignSelf: 'flex-end',
    zIndex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  undoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
})
