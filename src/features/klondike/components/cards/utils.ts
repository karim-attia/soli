import {
  FACE_CARD_LABELS,
  WASTE_FAN_MAX_OFFSET,
  WASTE_FAN_OVERLAP_RATIO,
} from '../../constants'
import type { Card, Rank } from '../../../../solitaire/klondike'

export const rankToLabel = (rank: Rank): string => FACE_CARD_LABELS[rank] ?? String(rank)

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
