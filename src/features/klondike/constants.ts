import { Easing } from 'react-native-reanimated'

import type { Rank, Suit } from '../../solitaire/klondike'

// Card dimensions and spacing
export const CARD_REFERENCE_WIDTH = 48
export const CARD_REFERENCE_HEIGHT = 68
export const CARD_REFERENCE_STACK_OFFSET = 24

export const BASE_CARD_WIDTH = CARD_REFERENCE_WIDTH
export const BASE_CARD_HEIGHT = CARD_REFERENCE_HEIGHT
export const CARD_ASPECT_RATIO = CARD_REFERENCE_HEIGHT / CARD_REFERENCE_WIDTH
export const BASE_STACK_OFFSET = CARD_REFERENCE_STACK_OFFSET
export const TABLEAU_GAP = 10
export const COLUMN_MARGIN = TABLEAU_GAP / 2
// Task 1-8: Board columns should have ~half the gap vs today, without changing global UI gutters.
// The "today" full gap is TABLEAU_GAP; board full gap becomes TABLEAU_GAP / 2.
export const BOARD_COLUMN_GAP = TABLEAU_GAP / 2
export const BOARD_COLUMN_MARGIN = BOARD_COLUMN_GAP / 2
export const STACK_PADDING = 8 // matches px="$2" in layout spacing
export const EDGE_GUTTER = STACK_PADDING + COLUMN_MARGIN
export const MAX_CARD_WIDTH = 96
export const MIN_CARD_WIDTH = 24

// Waste fan layout
export const WASTE_FAN_OVERLAP_RATIO = 0.35
export const WASTE_FAN_MAX_OFFSET = 28

// Animation timings
export const CARD_ANIMATION_DURATION_MS = 90
export const CARD_FLIP_HALF_DURATION_MS = 40
export const WIGGLE_OFFSET_PX = 5
export const WIGGLE_SEGMENT_DURATION_MS = 70

// Card drag (card-drag-and-drop plan). Drag is an INPUT method, so none of this
// is behind a user-facing setting; only the decorative lift/snap-back timings
// gate on the existing animations.master toggle.
// 8 px activation: the undo scrubber uses 5 px on a 48 pt button, but a card is
// 50–90 px wide and 8 px still sits comfortably inside RN Pressability's press
// rect, so a real tap can never be mistaken for a drag.
export const DRAG_ACTIVATION_DISTANCE_PX = 8
export const DRAG_LIFT_SCALE = 1.04
export const DRAG_LIFT_DURATION_MS = 90
export const DRAG_SNAP_BACK_DURATION_MS = 140
// Fraction of a card's area that must overlap a drop zone for it to count. 0.2
// is deliberately generous: players aim roughly, and the alternative (a
// nearest-target magnet) makes a card teleport across the board from a drop over
// empty felt, which reads as a bug.
export const DRAG_DROP_MIN_OVERLAP_RATIO = 0.2
// Tableau drop zones extend half a card below the column's last card so
// "drop just below the pile" targets that column — which is what players do.
export const DRAG_DROP_EXTEND_Y_RATIO = 0.5
// Horizontal slack on drop zones; matches the board's own inter-column margin so
// the zones tile the board without overlapping each other.
export const DRAG_DROP_ZONE_PAD_X = BOARD_COLUMN_MARGIN
// boxShadow is native on RN 0.76+/New Arch (same as HintOverlayLayer's rings).
export const DRAG_CARD_SHADOW = '0 8px 16px rgba(0, 0, 0, 0.35)'

export const FOUNDATION_GLOW_MAX_OPACITY = 1
export const FOUNDATION_GLOW_IN_DURATION_MS = 90
export const FOUNDATION_GLOW_OUT_DURATION_MS = 220
export const FOUNDATION_GLOW_TOTAL_DURATION_MS =
  FOUNDATION_GLOW_IN_DURATION_MS + FOUNDATION_GLOW_OUT_DURATION_MS
export const FOUNDATION_GLOW_COLOR = 'rgba(255, 238, 92, 0.92)'
export const FOUNDATION_GLOW_FILL_COLOR = 'rgba(255, 238, 92, 0.3)'
export const FOUNDATION_GLOW_OUTSET = 10
export const FOUNDATION_GLOW_IN_TIMING = {
  duration: FOUNDATION_GLOW_IN_DURATION_MS,
  easing: Easing.bezier(0.3, 0, 0.5, 1),
} as const
export const FOUNDATION_GLOW_OUT_TIMING = {
  duration: FOUNDATION_GLOW_OUT_DURATION_MS,
  easing: Easing.bezier(0.2, 0, 0.2, 1),
} as const
// Task 28-2: Celebration should begin only after the final winning move's visual handoff finishes.
export const WIN_CELEBRATION_HANDOFF_DELAY_MS = Math.max(
  CARD_ANIMATION_DURATION_MS,
  FOUNDATION_GLOW_TOTAL_DURATION_MS
)
export const WIN_CLEANUP_OUTLINE_FADE_DURATION_MS = 180

// Colour palette
export const COLOR_CARD_FACE = '#ffffff'
export const COLOR_CARD_BACK = '#3b4d75'
export const COLOR_CARD_BORDER = '#cbd5f5'
export const COLOR_SELECTED_BORDER = '#c084fc'
export const COLOR_DROP_BORDER = '#22a06b'
// Hint highlight (hints plan F8, 2026-07-23): amber on purpose, NOT the
// drop-border green — the green hint rings blended into the felt (user:
// "honestly quite hard to see", even read as blue). Amber holds contrast on
// BOTH the green felt and white card faces; a pure yellow (e.g.
// FOUNDATION_GLOW_COLOR, tamagui $yellow) washes out on white faces. Board
// visuals use this hex palette rather than tamagui tokens, so this lives here.
export const COLOR_HINT = '#FFB020'
export const COLOR_COLUMN_BORDER = '#d0d5dd'
export const COLOR_COLUMN_SELECTED = 'rgba(147, 197, 253, 0.25)'
export const COLOR_FOUNDATION_BORDER = '#94a3b8'
export const COLOR_TEXT_MUTED = '#94a3b8'
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
// Task 20-6: Keep undo scrubber clear of iOS home indicator / Android nav gesture area.
// This is the extra dock gap above the system inset, not a replacement for the inset.
export const UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING = 20
