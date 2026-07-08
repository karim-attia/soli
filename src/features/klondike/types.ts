import type { SharedValue } from 'react-native-reanimated'

import type { getDropHints } from '../../solitaire/klondike'

export type CardMetrics = {
  width: number
  height: number
  stackOffset: number
  radius: number
}

export type InvalidWiggleConfig = {
  key: number
  lookup: Set<string>
}

export const EMPTY_INVALID_WIGGLE: InvalidWiggleConfig = {
  key: 0,
  lookup: new Set<string>(),
}

export type CelebrationBindings = {
  active: SharedValue<number>
  progress: SharedValue<number>
  mode: SharedValue<number>
  // floorY = boardHeight − bottom safe-area inset: the visible floor for modes with
  // resting/bouncing semantics (renderer-polish story). During a celebration the undo
  // dock unmounts and the board grows to (nearly) the window bottom, so boardHeight
  // alone would rest cards inside the Android nav-bar area.
  board: SharedValue<{ width: number; height: number; floorY: number }>
  total: SharedValue<number>
}

export type DropHints = ReturnType<typeof getDropHints>
