import React, { useCallback, useEffect, useRef } from 'react'
import { type LayoutChangeEvent, Platform, StyleSheet, View, Text } from 'react-native'
import Animated from 'react-native-reanimated'
import { GestureDetector, type GestureType } from 'react-native-gesture-handler'
import { Slider } from 'tamagui'
import { Undo2 } from '@tamagui/lucide-icons'

import {
  UNDO_BUTTON_DISABLED_OPACITY,
  UNDO_SCRUB_BUTTON_DIM_OPACITY,
  UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING,
} from '../constants'

export type UndoScrubberProps = {
  visible: boolean
  isScrubbing: boolean
  sliderValue: number[]
  sliderMax: number
  gesture: GestureType
  boardLocked: boolean
  canUndo: boolean
  onTrackMetrics: (metrics: { left: number; right: number }) => void
}

const AnimatedView = Animated.createAnimatedComponent(View)

// requirement 20-6: Approach A - Isolate gesture component to prevent re-renders during scrubbing
// This wrapper NEVER re-renders, preventing iOS gesture cancellation from React updates
const GestureWrapper = React.memo(
  ({
    gesture,
    opacity,
  }: {
    gesture: GestureType
    opacity: number
  }) => {
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
  sliderValue,
  sliderMax,
  gesture,
  boardLocked,
  canUndo,
  onTrackMetrics,
}) => {
  const trackRef = useRef<View>(null)

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
    (_event: LayoutChangeEvent) => {
      measureTrack()
    },
    [measureTrack],
  )

  useEffect(() => {
    if (!visible) {
      return
    }
    measureTrack()
  }, [measureTrack, sliderMax, visible])

  if (!visible) {
    return null
  }

  const buttonOpacity = isScrubbing
    ? UNDO_SCRUB_BUTTON_DIM_OPACITY
    : canUndo
      ? 1
      : UNDO_BUTTON_DISABLED_OPACITY

  return (
    <View style={styles.container}>
      <AnimatedView pointerEvents="none" style={[styles.overlay, { opacity: isScrubbing ? 1 : 0 }]}
      >
        <Slider value={sliderValue} min={0} max={sliderMax} step={1} size="$4" style={styles.slider}>
          <Slider.Track ref={trackRef} onLayout={handleTrackLayout} style={styles.track}>
            <Slider.TrackActive style={styles.trackActive} />
          </Slider.Track>
          <Slider.Thumb circular size="$3" index={0} style={styles.thumb} />
        </Slider>
      </AnimatedView>
      {/* requirement 20-6: Approach A - Use memoized gesture wrapper to isolate from re-renders */}
      <GestureWrapper gesture={gesture} opacity={buttonOpacity} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    // requirement 20-6: iOS needs extra bottom margin to avoid home indicator gesture area. Since package upgrades also Android.
    marginBottom: 100,
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
    bottom: 0,
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
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
  trackActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  thumb: {
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

