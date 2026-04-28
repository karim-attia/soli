import React, { useCallback, useEffect, useRef } from 'react'
import { type LayoutChangeEvent, StyleSheet, View, Text } from 'react-native'
import Animated, {
  createAnimatedComponent,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated'
import { GestureDetector, type GestureType } from 'react-native-gesture-handler'
import { Undo2 } from '@tamagui/lucide-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  UNDO_BUTTON_DISABLED_OPACITY,
  UNDO_SCRUB_BUTTON_DIM_OPACITY,
  UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING,
  UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING,
} from '../constants'

export type UndoScrubberProps = {
  visible: boolean
  isScrubbing: boolean
  scrubIndex: SharedValue<number>
  sliderMax: number
  gesture: GestureType
  boardLocked: boolean
  canUndo: boolean
  onTrackMetrics: (metrics: { left: number; right: number }) => void
}

const AnimatedView = createAnimatedComponent(View)
const SCRUBBER_THUMB_SIZE = 20
const SCRUBBER_THUMB_RADIUS = SCRUBBER_THUMB_SIZE / 2

// requirement 20-6: Approach A - Isolate gesture component to prevent re-renders during scrubbing
// This wrapper NEVER re-renders, preventing iOS gesture cancellation from React updates
const GestureWrapper = React.memo(
  ({ gesture, opacity }: { gesture: GestureType; opacity: number }) => {
    return (
      <GestureDetector gesture={gesture}>
        <Animated.View style={[styles.undoButton, { opacity }]} collapsable={false}>
          <Undo2 size={20} color="#000" />
          <Text style={styles.undoButtonText}>Undo</Text>
        </Animated.View>
      </GestureDetector>
    )
  },
  // Custom comparison: avoid churn, but still update opacity when scrubbing starts/ends.
  (prev, next) => prev.gesture === next.gesture && prev.opacity === next.opacity
)

export const UndoScrubber: React.FC<UndoScrubberProps> = ({
  visible,
  isScrubbing,
  scrubIndex,
  sliderMax,
  gesture,
  boardLocked: _boardLocked,
  canUndo,
  onTrackMetrics,
}) => {
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

  if (!visible) {
    return null
  }

  const buttonOpacity = isScrubbing
    ? UNDO_SCRUB_BUTTON_DIM_OPACITY
    : canUndo
      ? 1
      : UNDO_BUTTON_DISABLED_OPACITY

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
          {
            opacity: isScrubbing ? 1 : 0,
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
          <View ref={trackRef} onLayout={handleTrackLayout} style={styles.track}>
            <AnimatedView style={[styles.trackActive, activeTrackStyle]} />
            <AnimatedView style={[styles.thumb, thumbStyle]} />
          </View>
        </View>
      </AnimatedView>
      <GestureWrapper gesture={gesture} opacity={buttonOpacity} />
    </View>
  )
}

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
    zIndex: 1,
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
