import React, { useCallback, useEffect, useRef } from 'react'
import { type LayoutChangeEvent, Pressable, StyleSheet, View, Text } from 'react-native'
import Animated, {
  createAnimatedComponent,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { GestureDetector, type GestureType } from 'react-native-gesture-handler'
import { Lightbulb, Rewind, Undo2 } from '@tamagui/lucide-icons-2'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  COLOR_HINT,
  UNDO_BUTTON_DISABLED_OPACITY,
  UNDO_SCRUB_BUTTON_DIM_OPACITY,
  UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING,
  UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING,
} from '../constants'
import { getScrubMarkerLeft } from '../scrubberMarker'
import { UndoHintBubble } from './UndoHintBubble'
import { GameNoticeBubble } from './GameNoticeBubble'

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
  // Hint features (hints-and-unwinnable-warning plan). hintButtonVisible
  // follows the "Hint button" setting; hintBubbleText carries whichever
  // notice/warning is active (see GameNoticeBubble; warnings persist for the
  // whole dead era since F14); warningEmphasisNonce replays the bubble's
  // emphasis pulse (warning fire + hint-press re-affirm). With the button off
  // and warnings off all three are inert → this component renders exactly the
  // pre-feature layout.
  hintButtonVisible: boolean
  onHintPress: () => void
  hintBubbleText: string | null
  warningEmphasisNonce: number
  // Rewind to the last winnable move (rewind-to-winnable plan). All three
  // fields are driven by the SAME computed timeline index, so the pill and the
  // track marker can never point at different moves. rewindIndex null (setting
  // off, nothing proven, or the boundary retired) = the whole feature renders
  // nothing. rewindAvailable is narrower than `rewindIndex !== null`: the
  // marker stays up while the thumb sits ON the boundary or below it after an
  // overshoot, but there is nothing to rewind from there, so only the marker
  // renders. rewinding = stepped playback is running; the pill stays in place
  // (it is the player's landmark for the walk) but goes inert.
  rewindIndex: number | null
  rewindAvailable: boolean
  rewinding: boolean
  onRewindPress: () => void
}

const AnimatedView = createAnimatedComponent(View)
const SCRUBBER_THUMB_SIZE = 20
const SCRUBBER_THUMB_RADIUS = SCRUBBER_THUMB_SIZE / 2
// Narrow enough to read as a tick mark rather than a second thumb.
const SCRUBBER_MARKER_WIDTH = 3
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
    hintButtonVisible,
    onHintPress,
    hintBubbleText,
    warningEmphasisNonce,
    rewindIndex,
    rewindAvailable,
    rewinding,
    onRewindPress,
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

    // Marker for the last winnable move. Animated because the track width only
    // exists as a shared value (measured in onLayout); the index itself is a
    // plain prop that changes at most once per warning.
    const markerStyle = useAnimatedStyle(() => {
      return {
        left: getScrubMarkerLeft({
          index: rewindIndex ?? 0,
          sliderMax,
          trackWidth: trackWidth.value,
          thumbSize: SCRUBBER_THUMB_SIZE,
          markerWidth: SCRUBBER_MARKER_WIDTH,
        }),
      }
    }, [rewindIndex, sliderMax, trackWidth])

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
              // The marker lives INSIDE this accessible node, so it cannot
              // carry its own label — the position is appended here instead
              // (prefix unchanged so existing recipes keep matching).
              accessibilityLabel={
                rewindIndex === null
                  ? `Undo scrubber, position ${historyIndex} of ${sliderMax}`
                  : `Undo scrubber, position ${historyIndex} of ${sliderMax}, last winnable move ${rewindIndex}`
              }
              testID="undo-scrubber-track"
            >
              <AnimatedView style={[styles.trackActive, activeTrackStyle]} />
              {rewindIndex === null ? null : (
                <AnimatedView
                  style={[styles.winnableMarker, markerStyle]}
                  testID="undo-scrubber-winnable-marker"
                />
              )}
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
        {/* Hint/warning notices anchor above the dock like the undo discovery
          hint (one bubble for all texts — see GameNoticeBubble). */}
        <GameNoticeBubble
          text={hintBubbleText}
          bottom={bottomDockOffset + UNDO_BUTTON_HEIGHT + 8}
          emphasisNonce={warningEmphasisNonce}
        />
        {rewindAvailable ? (
          // Takes the Hint button's slot rather than adding a third pill: the
          // dock's left half is the only place a tappable control fits (the
          // pan's hitSlop claims 50px ABOVE the Undo pill, so nothing tappable
          // may sit there), and during a dead era the Hint button is inert
          // anyway — a press inside an outstanding warning only re-affirms the
          // warning (useHint's F15 decision table, case 1). Swapping it for
          // the one action that actually helps is strictly better use of the
          // slot. Same plain-Pressable-outside-GestureWrapper pattern as the
          // Hint button (Tamagui/expo-ui controls fight the pan gesture).
          <Pressable
            style={[
              styles.hintButton,
              { bottom: bottomDockOffset },
              // Inert for the duration of the stepped playback (the hook
              // ignores a second press too): re-pressing mid-walk used to
              // restart the whole rewind. Dimmed with the same value the Undo
              // pill uses when it cannot act, so the dock has one disabled look.
              rewinding ? styles.rewindButtonBusy : null,
            ]}
            onPress={onRewindPress}
            disabled={rewinding}
            accessibilityRole="button"
            accessibilityLabel="Rewind to last winnable move"
            testID="rewind-to-winnable"
          >
            <Rewind size={20} color="#000" />
            <Text style={styles.undoButtonText}>Rewind</Text>
          </Pressable>
        ) : hintButtonVisible ? (
          // Plain RN Pressable, deliberately OUTSIDE the GestureWrapper/pan
          // area (Tamagui/expo-ui buttons conflict with the pan gesture — see
          // GestureWrapper). Mirrors the Undo pill in the left half of the dock
          // (same metrics as DemoPlaylistHud, which may overlap during
          // dev-only demo playback — accepted). Note the pan gesture's
          // hitSlop extends 20px left of the Undo button, slightly over this
          // button's right edge: a plain tap there still hits this Pressable
          // (the pan needs 5px of horizontal movement to activate).
          //
          // No busy/disabled state on purpose (user feedback 2026-07-23:
          // flicker = no-go): a hintDisabled prop driven by solver-busy state
          // used to dim this button for 1-2 frames around every background
          // solve after each move. The button is now visually static; presses
          // during an in-flight solve are absorbed by useHint's replace-latest
          // queue. This subtree re-renders per move anyway (historyIndex in the
          // dock), but renders an identical element tree — no native update.
          <Pressable
            style={[styles.hintButton, { bottom: bottomDockOffset }]}
            onPress={onHintPress}
            accessibilityRole="button"
            accessibilityLabel="Hint"
            testID="hint-button"
          >
            <Lightbulb size={20} color="#000" />
            <Text style={styles.undoButtonText}>Hint</Text>
          </Pressable>
        ) : null}
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
  // Same amber as the hint rings (COLOR_HINT): both mean "the solver is
  // telling you something", and it reads clearly against the track's
  // translucent white.
  winnableMarker: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    width: SCRUBBER_MARKER_WIDTH,
    borderRadius: 999,
    backgroundColor: COLOR_HINT,
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
  // Left-half twin of undoButton (absolute so the in-flow undo layout — and
  // therefore the setting-off render — is untouched); 8px gap like
  // DemoPlaylistHud's marginRight.
  hintButton: {
    position: 'absolute',
    left: 0,
    right: '50%',
    marginRight: 8,
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
  rewindButtonBusy: {
    opacity: UNDO_BUTTON_DISABLED_OPACITY,
  },
  undoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
})
