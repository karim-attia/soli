import React, { useSyncExternalStore } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { getDemoProgress, subscribeDemoProgress } from '../state/demoProgressStore'
import { UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING } from '../constants'

// Small badge shown only while a demo playlist/single replay runs, sitting in the
// left half of the bottom dock — same dimensions and bottom offset as the Undo
// button (right half, see UndoScrubber styles) per user feedback 2026-07-06.
// Content is intentionally just "Game x/y": steps show in the Moves stat and the
// JS heap was uninformative (30-50 MB while native RSS is the interesting number).
// Self-subscribing on purpose: only this component re-renders on progress
// updates, the board and useKlondikeGame stay untouched.
export const DemoPlaylistHud: React.FC = () => {
  const progress = useSyncExternalStore(subscribeDemoProgress, getDemoProgress)
  const insets = useSafeAreaInsets()

  if (!progress) {
    return null
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.container,
        // Mirrors the Undo button's bottom dock: UndoScrubber's container pads
        // its content by inset + UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING.
        { bottom: insets.bottom + UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING },
      ]}
    >
      <Text style={styles.label}>
        Game {progress.gameIndex + 1}/{progress.gameCount}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  // Mirrors UndoScrubber's undoButton metrics (50% width, paddingVertical 14,
  // borderRadius 12, 16pt/600 label) so both bottom-dock pills match; dark
  // translucent fill so it doesn't read as tappable.
  container: {
    position: 'absolute',
    left: 0,
    right: '50%',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    zIndex: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f8fafc',
  },
})
