import React from 'react'
import { StyleSheet, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { GestureDetector, type GestureType } from 'react-native-gesture-handler'
import { Button, Slider } from 'tamagui'
import { Undo2 } from '@tamagui/lucide-icons'

import { UNDO_BUTTON_DISABLED_OPACITY, UNDO_SCRUB_BUTTON_DIM_OPACITY } from '../constants'

export type UndoScrubberProps = {
  visible: boolean
  isScrubbing: boolean
  sliderValue: number[]
  sliderMax: number
  gesture: GestureType
  onUndoPress: () => void
  boardLocked: boolean
  canUndo: boolean
}

const AnimatedView = Animated.createAnimatedComponent(View)

export const UndoScrubber: React.FC<UndoScrubberProps> = ({
  visible,
  isScrubbing,
  sliderValue,
  sliderMax,
  gesture,
  onUndoPress,
  boardLocked,
  canUndo,
}) => {
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
          <Slider.Track style={styles.track}>
            <Slider.TrackActive style={styles.trackActive} />
          </Slider.Track>
          <Slider.Thumb circular size="$3" index={0} style={styles.thumb} />
        </Slider>
      </AnimatedView>
      <GestureDetector gesture={gesture}>
        <Button
          width="50%"
          icon={Undo2}
          onPress={onUndoPress}
          disabled={boardLocked}
          themeInverse
          style={styles.button}
          opacity={buttonOpacity}
        >
          Undo
        </Button>
      </GestureDetector>
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
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 40,
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
  button: {
    alignSelf: 'flex-end',
    zIndex: 2,
  },
})

