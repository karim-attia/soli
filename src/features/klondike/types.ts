import type { SharedValue } from 'react-native-reanimated'

import type { CardFlightSnapshot } from '../../animation/flightController'
import type { CelebrationAssignment } from '../../animation/celebrationModes'
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

export type CardFlightRegistry = SharedValue<Record<string, CardFlightSnapshot>>

export type CelebrationBindings = {
  active: SharedValue<number>
  progress: SharedValue<number>
  assignments: SharedValue<Record<string, CelebrationAssignment>>
  mode: SharedValue<number>
  board: SharedValue<{ width: number; height: number }>
  total: SharedValue<number>
}

export type DropHints = ReturnType<typeof getDropHints>
