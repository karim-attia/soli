import type { LayoutRectangle } from 'react-native'

import {
  FACE_CARD_LABELS,
  WASTE_FAN_MAX_OFFSET,
  WASTE_FAN_OVERLAP_RATIO,
} from '../../constants'
import {
  TABLEAU_COLUMN_COUNT,
  type Card,
  type Rank,
  type Suit,
} from '../../../../solitaire/klondike'
import {
  parseSolverCardCode,
  SOLVER_SUIT_FROM_LETTER,
  type SolverMoveHint,
} from '../../../../solitaire/solverBridge'
import type { CardMetrics } from '../../types'

export const rankToLabel = (rank: Rank): string => FACE_CARD_LABELS[rank] ?? String(rank)

// Layout registry for absolutely-positioned board overlays (slot rects as
// measured by useKlondikeGame's onLayout handlers). Lives here — not in
// AbsoluteCardLayer.tsx — so pure geometry consumers (HintOverlayLayer's rect
// resolver, unit tests) don't have to import the component module, whose
// CardVisual/tamagui imports jest cannot load.
export type AbsoluteCardLayerLayouts = {
  topRow: LayoutRectangle | null
  stock: LayoutRectangle | null
  waste: LayoutRectangle | null
  foundations: Partial<Record<Suit, LayoutRectangle>>
  tableauRow: LayoutRectangle | null
  tableauColumns: Array<LayoutRectangle | null>
}

export const createEmptyAbsoluteCardLayerLayouts = (): AbsoluteCardLayerLayouts => ({
  topRow: null,
  stock: null,
  waste: null,
  foundations: {},
  tableauRow: null,
  tableauColumns: Array.from({ length: TABLEAU_COLUMN_COUNT }, () => null),
})

// Board-space position of a top-row slot (stock/waste/foundation) or tableau
// column. Shared by AbsoluteCardLayer (card positions) and HintOverlayLayer
// (ring positions) so the two can't drift apart.
export const resolveTopRowPosition = (
  topRow: LayoutRectangle | null,
  slot: LayoutRectangle | null
): { x: number; y: number } | null => {
  if (!topRow || !slot) {
    return null
  }

  return {
    x: topRow.x + slot.x,
    y: topRow.y + slot.y,
  }
}

export const resolveTableauPosition = (
  tableauRow: LayoutRectangle | null,
  column: LayoutRectangle | null
): { x: number; y: number } | null => {
  if (!tableauRow || !column) {
    return null
  }

  return {
    x: tableauRow.x + column.x,
    y: tableauRow.y + column.y,
  }
}

// Task 1-9: face-up cards keep full spacing (tap targets); face-down stacks show
// at half the visible spacing.
const FACE_DOWN_STACK_OFFSET_DIVISOR = 2

// Vertical offset of each card in a tableau column. Shared by the structural
// TableauColumn (column height) and AbsoluteCardLayer (card positions) so the two
// layers' stacking math can't drift apart (clean-code review #12: was duplicated).
// Structural pick so BoardPreview (history sheet) can pass id-less preview cards.
export const computeTableauStackOffsets = (
  column: readonly Pick<Card, 'faceUp'>[],
  faceUpStackOffset: number
): number[] => {
  const faceDownStackOffset = Math.round(
    faceUpStackOffset / FACE_DOWN_STACK_OFFSET_DIVISOR
  )
  let runningOffset = 0
  return column.map((card) => {
    const offset = runningOffset
    runningOffset += card.faceUp ? faceUpStackOffset : faceDownStackOffset
    return offset
  })
}

// Waste fan geometry (right-aligned fan of up to 3 cards). Shared by the fanned
// card visuals and the stable tap zone in AbsoluteCardLayer (clean-code review #12:
// was computed twice there). `baseXOffset` is relative to the waste slot's x.
export const computeWasteFanGeometry = (
  visibleCount: number,
  cardWidth: number
): { overlap: number; baseXOffset: number } => {
  const overlap = Math.min(cardWidth * WASTE_FAN_OVERLAP_RATIO, WASTE_FAN_MAX_OFFSET)
  const fanWidth = cardWidth + overlap * (visibleCount - 1)
  return { overlap, baseXOffset: cardWidth - fanWidth }
}

// ---------------------------------------------------------------------------
// Solver-hint rect resolution (hints plan). Lives here — not in
// HintOverlayLayer.tsx — since the F8 redesign: the overlay now renders a
// ghost CardVisual (tamagui-heavy import chain jest can't load), while this
// resolver must stay importable by unit tests. Same rule as the layout
// helpers above.
// ---------------------------------------------------------------------------

export type HintRect = { x: number; y: number; width: number; height: number }

// Narrow structural types so the pure resolver is unit-testable with minimal
// fixtures (no ids needed).
type HintBoard = {
  wasteCount: number
  tableau: ReadonlyArray<ReadonlyArray<Pick<Card, 'suit' | 'rank' | 'faceUp'>>>
}

const cardSizedRect = (
  position: { x: number; y: number },
  metrics: CardMetrics
): HintRect => ({
  x: position.x,
  y: position.y,
  width: metrics.width,
  height: metrics.height,
})

const foundationRect = (
  suit: Suit,
  layouts: AbsoluteCardLayerLayouts,
  metrics: CardMetrics
): HintRect | null => {
  const position = resolveTopRowPosition(
    layouts.topRow,
    layouts.foundations[suit] ?? null
  )
  return position ? cardSizedRect(position, metrics) : null
}

// Stock-slot rect for the solver 'draw' hint ring (F13, 2026-07-24). Same
// layout registry as the card layer; card-sized in every stock state (card
// back, recycle arrow, empty) since all three render slot-sized. Geometry
// only — the ring renders in HintOverlayLayer's above-cards plane, NOT in
// TopRow where it originally lived: the structural row paints under the
// absolute card plane, so the absolute stock card clipped the ring band.
export const resolveStockRect = (
  layouts: AbsoluteCardLayerLayouts,
  metrics: CardMetrics
): HintRect | null => {
  const position = resolveTopRowPosition(layouts.topRow, layouts.stock)
  return position ? cardSizedRect(position, metrics) : null
}

// Maps a solver 'move' hint to board rects using the SAME layout registry and
// stacking math AbsoluteCardLayer positions cards with. Returns null when a
// layout is not measured yet or the hinted card is not found face up (both
// should not happen for a fresh solved response — render nothing rather than
// a misplaced ring). The source rect's top-left is always the hinted card's
// own position (the ghost glide starts there card-sized), even when the rect
// spans a whole run. `landing` is where the moved card will actually sit — the
// ghost glides there (see the tableau branch). Exported for unit tests.
export const resolveHintRects = (
  hint: SolverMoveHint,
  board: HintBoard,
  layouts: AbsoluteCardLayerLayouts,
  metrics: CardMetrics
): { source: HintRect; target: HintRect; landing: HintRect } | null => {
  let source: HintRect | null = null
  if (hint.from.type === 'tableau') {
    const columnPosition = resolveTableauPosition(
      layouts.tableauRow,
      layouts.tableauColumns[hint.from.index] ?? null
    )
    const column = board.tableau[hint.from.index]
    if (columnPosition && column) {
      const { suit, rank } = parseSolverCardCode(hint.card)
      const cardIndex = column.findIndex(
        (card) => card.faceUp && card.suit === suit && card.rank === rank
      )
      if (cardIndex >= 0) {
        const offsets = computeTableauStackOffsets(column, metrics.stackOffset)
        const top = columnPosition.y + offsets[cardIndex]
        // The hinted card is the base of the moved run — everything stacked on
        // it moves along, so the ring encloses the WHOLE run (a base-card-only
        // ring would have the run's lower cards crossing its bottom edge).
        const bottom = columnPosition.y + offsets[column.length - 1] + metrics.height
        source = {
          x: columnPosition.x,
          y: top,
          width: metrics.width,
          height: bottom - top,
        }
      }
    }
  } else if (hint.from.type === 'waste') {
    const wastePosition = resolveTopRowPosition(layouts.topRow, layouts.waste)
    if (wastePosition && board.wasteCount > 0) {
      const visibleCount = Math.min(board.wasteCount, 3)
      const fan = computeWasteFanGeometry(visibleCount, metrics.width)
      source = cardSizedRect(
        {
          x: wastePosition.x + fan.baseXOffset + (visibleCount - 1) * fan.overlap,
          y: wastePosition.y,
        },
        metrics
      )
    }
  } else {
    source = foundationRect(SOLVER_SUIT_FROM_LETTER[hint.from.suit], layouts, metrics)
  }

  let target: HintRect | null = null
  let landing: HintRect | null = null
  if (hint.to.type === 'tableau') {
    const columnPosition = resolveTableauPosition(
      layouts.tableauRow,
      layouts.tableauColumns[hint.to.index] ?? null
    )
    const column = board.tableau[hint.to.index]
    if (columnPosition && column) {
      const offsets = computeTableauStackOffsets(column, metrics.stackOffset)
      // Top card of the destination column, or the empty-column slot itself.
      const topOffset = column.length ? offsets[column.length - 1] : 0
      target = cardSizedRect(
        { x: columnPosition.x, y: columnPosition.y + topOffset },
        metrics
      )
      // The ring stays on the card being dropped ONTO, but the ghost must land
      // one face-up stack offset below it, where the card will actually rest.
      // Gliding onto the ring itself made the ghost cover the existing top card
      // (user feedback, 2026-10-18). A legal tableau target's top card is
      // always face up, so the full face-up offset applies.
      landing = column.length
        ? { ...target, y: target.y + metrics.stackOffset }
        : target
    }
  } else {
    // Target foundation is implied by the hinted card's suit (FFI contract).
    target = foundationRect(parseSolverCardCode(hint.card).suit, layouts, metrics)
    landing = target
  }

  return source && target && landing ? { source, target, landing } : null
}
