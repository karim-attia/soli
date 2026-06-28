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
  board: SharedValue<{ width: number; height: number }>
  total: SharedValue<number>
}

export type DropHints = ReturnType<typeof getDropHints>
