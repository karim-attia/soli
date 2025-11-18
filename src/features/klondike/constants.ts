import { Easing } from 'react-native-reanimated'

import type { Rank, Suit } from '../../solitaire/klondike'

// Card dimensions and spacing
export const CARD_REFERENCE_WIDTH = 48
export const CARD_REFERENCE_HEIGHT = 68
export const CARD_REFERENCE_RADIUS = 6
export const CARD_REFERENCE_STACK_OFFSET = 24
export const CARD_REFERENCE_METRICS = Object.freeze({
  width: CARD_REFERENCE_WIDTH,
  height: CARD_REFERENCE_HEIGHT,
  stackOffset: CARD_REFERENCE_STACK_OFFSET,
  radius: CARD_REFERENCE_RADIUS,
})

export const BASE_CARD_WIDTH = CARD_REFERENCE_WIDTH
export const BASE_CARD_HEIGHT = CARD_REFERENCE_HEIGHT
export const CARD_ASPECT_RATIO = CARD_REFERENCE_HEIGHT / CARD_REFERENCE_WIDTH
export const BASE_STACK_OFFSET = CARD_REFERENCE_STACK_OFFSET
export const TABLEAU_GAP = 10
export const COLUMN_MARGIN = TABLEAU_GAP / 2
export const STACK_PADDING = 8 // matches px="$2" in layout spacing
export const EDGE_GUTTER = STACK_PADDING + COLUMN_MARGIN
export const STAT_VERTICAL_MARGIN = EDGE_GUTTER
export const MAX_CARD_WIDTH = 96
export const MIN_CARD_WIDTH = 24

// Waste fan layout
export const WASTE_FAN_OVERLAP_RATIO = 0.35
export const WASTE_FAN_MAX_OFFSET = 28

// Animation timings
export const CARD_ANIMATION_DURATION_MS = 90
export const CARD_MOVE_EASING = Easing.bezier(0.15, 0.9, 0.2, 1)
export const CARD_FLIGHT_TIMING = {
  duration: CARD_ANIMATION_DURATION_MS,
  easing: CARD_MOVE_EASING,
} as const

export const CARD_FLIP_HALF_DURATION_MS = 40
export const CARD_FLIP_HALF_TIMING = {
  duration: CARD_FLIP_HALF_DURATION_MS,
  easing: Easing.bezier(0.45, 0, 0.55, 1),
} as const

export const WASTE_SLIDE_DURATION_MS = 70
export const WASTE_SLIDE_EASING = Easing.bezier(0.15, 0.9, 0.2, 1)
export const WASTE_TIMING_CONFIG = {
  duration: WASTE_SLIDE_DURATION_MS,
  easing: WASTE_SLIDE_EASING,
} as const

export const WIGGLE_OFFSET_PX = 5
export const WIGGLE_SEGMENT_DURATION_MS = 70
export const WIGGLE_EASING = Easing.bezier(0.4, 0, 0.2, 1)
export const WIGGLE_TIMING_CONFIG = {
  duration: WIGGLE_SEGMENT_DURATION_MS,
  easing: WIGGLE_EASING,
} as const

export const FOUNDATION_GLOW_MAX_OPACITY = 0.55
export const FOUNDATION_GLOW_IN_DURATION_MS = 90
export const FOUNDATION_GLOW_OUT_DURATION_MS = 220
export const FOUNDATION_GLOW_COLOR = 'rgba(255, 255, 160, 0.65)'
export const FOUNDATION_GLOW_OUTSET = 10
export const FOUNDATION_GLOW_IN_TIMING = {
  duration: FOUNDATION_GLOW_IN_DURATION_MS,
  easing: Easing.bezier(0.3, 0, 0.5, 1),
} as const
export const FOUNDATION_GLOW_OUT_TIMING = {
  duration: FOUNDATION_GLOW_OUT_DURATION_MS,
  easing: Easing.bezier(0.2, 0, 0.2, 1),
} as const
export const FOUNDATION_FALLBACK_GAP = 16

// Colour palette
export const COLOR_CARD_FACE = '#ffffff'
export const COLOR_CARD_BACK = '#3b4d75'
export const COLOR_CARD_BORDER = '#cbd5f5'
export const COLOR_SELECTED_BORDER = '#c084fc'
export const COLOR_DROP_BORDER = '#22a06b'
export const COLOR_COLUMN_BORDER = '#d0d5dd'
export const COLOR_COLUMN_SELECTED = 'rgba(147, 197, 253, 0.25)'
export const COLOR_FOUNDATION_BORDER = '#94a3b8'
export const COLOR_TEXT_MUTED = '#94a3b8'
export const COLOR_TEXT_STRONG = '#1f2933'
export const COLOR_FELT_LIGHT = '#6B8E5A'
export const COLOR_FELT_DARK = '#4A5F3F'
export const COLOR_FELT_TEXT_PRIMARY = '#f8fafc'
export const COLOR_FELT_TEXT_SECONDARY = '#e2f2d9'

// Card metadata
export const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

export const SUIT_COLORS: Record<Suit, string> = {
  clubs: '#111827',
  spades: '#111827',
  diamonds: '#c92a2a',
  hearts: '#c92a2a',
}

export const FACE_CARD_LABELS: Partial<Record<Rank, string>> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
}

// UI constants reused outside the card modules
export const STAT_BADGE_MIN_WIDTH = 96
export const UNDO_SCRUB_BUTTON_DIM_OPACITY = 0.25
export const UNDO_BUTTON_DISABLED_OPACITY = 0.55
export const UNDO_SCRUBBER_OVERLAY_HORIZONTAL_PADDING = 40
