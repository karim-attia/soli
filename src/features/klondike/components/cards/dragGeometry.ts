import {
  FOUNDATION_SUIT_ORDER,
  type Card,
  type Foundations,
  type MoveTarget,
  type Selection,
  type Suit,
  type Tableau,
} from '../../../../solitaire/klondike'
import {
  DRAG_DROP_EXTEND_Y_RATIO,
  DRAG_DROP_MIN_OVERLAP_RATIO,
  DRAG_DROP_ZONE_PAD_X,
} from '../../constants'
import type { CardMetrics, DropHints } from '../../types'
import {
  computeTableauStackOffsets,
  computeWasteFanGeometry,
  resolveTableauPosition,
  resolveTopRowPosition,
  type AbsoluteCardLayerLayouts,
  type HintRect,
} from './utils'

// Pure geometry + drop resolution for the card drag (card-drag-and-drop plan).
// Lives here — not in a component or the hook — for the same reason as
// cards/utils.ts: no tamagui in the import chain, so jest can load it directly
// and every decision the drag makes is unit-testable without a device.
//
// `buildDragSourceModel` is the INVERSE of buildCardLayerItems and must keep
// reusing the identical helpers (resolveTopRowPosition / resolveTableauPosition /
// computeTableauStackOffsets / computeWasteFanGeometry), so the "what is under the
// finger" model and the "where is this card drawn" model cannot drift.
// test/unit/features/klondike/cardDrag.test.ts pins that inverse property.

// ---------------------------------------------------------------------------
// Drag sources: what is under the finger
// ---------------------------------------------------------------------------

export type DragSourceHit =
  | {
      source: 'tableau'
      columnIndex: number
      cardIndex: number
      cardId: string
      rect: HintRect
    }
  | { source: 'waste'; cardId: string; rect: HintRect }
  | { source: 'foundation'; suit: Suit; cardId: string; rect: HintRect }

export type DragSourceModel = {
  columns: Array<{
    columnIndex: number
    x: number
    width: number
    // Face-up cards only, in column order (bottom → top). A card's exclusive band
    // runs from its own y to the next card's y; the last card owns a full card
    // height. hitTestDragSource gets that for free by scanning top-most first.
    cards: Array<{ cardId: string; cardIndex: number; y: number; height: number }>
  }>
  waste: { cardId: string; rect: HintRect } | null
  foundations: Array<{ suit: Suit; cardId: string; rect: HintRect }>
}

export type BuildDragSourceModelInput = {
  tableau: Tableau
  waste: Card[]
  foundations: Foundations
  layouts: AbsoluteCardLayerLayouts
  cardMetrics: CardMetrics
  // Single gate for "dragging is impossible right now" (board locked, celebrating,
  // auto-completing, scrubbing). A null model makes onTouchesDown state.fail()
  // immediately, which leaves the RN touch — and therefore tap-to-move — untouched.
  enabled: boolean
}

// Grabbable set, deliberately narrow (matches physical solitaire):
//   tableau  → any FACE-UP card (it lifts itself plus everything below it)
//   waste    → the fanned top card only
//   foundation → the top card only
//   stock / face-down / empty slots → never
export const buildDragSourceModel = ({
  tableau,
  waste,
  foundations,
  layouts,
  cardMetrics,
  enabled,
}: BuildDragSourceModelInput): DragSourceModel | null => {
  if (!enabled) {
    return null
  }

  const columns: DragSourceModel['columns'] = []
  tableau.forEach((column, columnIndex) => {
    const columnPosition = resolveTableauPosition(
      layouts.tableauRow,
      layouts.tableauColumns[columnIndex] ?? null
    )
    if (!columnPosition) {
      return
    }

    const offsets = computeTableauStackOffsets(column, cardMetrics.stackOffset)
    const cards: DragSourceModel['columns'][number]['cards'] = []
    column.forEach((card, cardIndex) => {
      if (!card.faceUp) {
        return
      }
      cards.push({
        cardId: card.id,
        cardIndex,
        y: columnPosition.y + offsets[cardIndex],
        height: cardMetrics.height,
      })
    })

    if (cards.length) {
      columns.push({
        columnIndex,
        x: columnPosition.x,
        width: cardMetrics.width,
        cards,
      })
    }
  })

  let wasteEntry: DragSourceModel['waste'] = null
  const visibleWaste = waste.slice(-3)
  const wastePosition = resolveTopRowPosition(layouts.topRow, layouts.waste)
  const wasteTop = visibleWaste[visibleWaste.length - 1]
  if (wasteTop && wastePosition) {
    const fan = computeWasteFanGeometry(visibleWaste.length, cardMetrics.width)
    wasteEntry = {
      cardId: wasteTop.id,
      rect: {
        x: wastePosition.x + fan.baseXOffset + (visibleWaste.length - 1) * fan.overlap,
        y: wastePosition.y,
        width: cardMetrics.width,
        height: cardMetrics.height,
      },
    }
  }

  const foundationEntries: DragSourceModel['foundations'] = []
  FOUNDATION_SUIT_ORDER.forEach((suit) => {
    const pile = foundations[suit]
    const topCard = pile[pile.length - 1]
    const position = resolveTopRowPosition(layouts.topRow, layouts.foundations[suit] ?? null)
    if (!topCard || !position) {
      return
    }
    foundationEntries.push({
      suit,
      cardId: topCard.id,
      rect: {
        x: position.x,
        y: position.y,
        width: cardMetrics.width,
        height: cardMetrics.height,
      },
    })
  })

  return { columns, waste: wasteEntry, foundations: foundationEntries }
}

// Runs on the UI thread inside the pan's onTouchesDown, so it is a worklet and
// must stay self-contained (no calls into non-worklet helpers) and allocation-light.
export const hitTestDragSource = (
  model: DragSourceModel | null,
  x: number,
  y: number
): DragSourceHit | null => {
  'worklet'

  if (!model) {
    return null
  }

  for (let i = 0; i < model.columns.length; i += 1) {
    const column = model.columns[i]
    if (x < column.x || x > column.x + column.width) {
      continue
    }
    // Top-most first: where the stack offset makes rects overlap, the card the
    // player can actually see must win.
    for (let j = column.cards.length - 1; j >= 0; j -= 1) {
      const entry = column.cards[j]
      if (y >= entry.y && y <= entry.y + entry.height) {
        return {
          source: 'tableau',
          columnIndex: column.columnIndex,
          cardIndex: entry.cardIndex,
          cardId: entry.cardId,
          rect: {
            x: column.x,
            y: entry.y,
            width: column.width,
            height: entry.height,
          },
        }
      }
    }
  }

  const waste = model.waste
  if (
    waste &&
    x >= waste.rect.x &&
    x <= waste.rect.x + waste.rect.width &&
    y >= waste.rect.y &&
    y <= waste.rect.y + waste.rect.height
  ) {
    return { source: 'waste', cardId: waste.cardId, rect: waste.rect }
  }

  for (let i = 0; i < model.foundations.length; i += 1) {
    const foundation = model.foundations[i]
    if (
      x >= foundation.rect.x &&
      x <= foundation.rect.x + foundation.rect.width &&
      y >= foundation.rect.y &&
      y <= foundation.rect.y + foundation.rect.height
    ) {
      return {
        source: 'foundation',
        suit: foundation.suit,
        cardId: foundation.cardId,
        rect: foundation.rect,
      }
    }
  }

  return null
}

// The lifted run always renders card FACES in the drag overlay, so it always uses
// the face-up spacing — computeTableauStackOffsets' half-spacing face-down rule
// would be wrong here (and would silently desync the copies from the run).
export const computeLiftedRunOffsets = (count: number, stackOffset: number): number[] =>
  Array.from({ length: count }, (_, index) => index * stackOffset)

// ---------------------------------------------------------------------------
// Drop targets: where the lifted run can land
// ---------------------------------------------------------------------------

export type DropCandidate = {
  // Carrying the MoveTarget itself (instead of kind + columnIndex/suit fields)
  // means a resolved drop dispatches APPLY_MOVE with no further mapping — one
  // less place where drag legality could drift from the reducer's.
  target: MoveTarget
  rect: HintRect
  legal: boolean
  // The pile the drag started from: dropping back onto it is a silent no-op, not
  // an invalid move, so it must never wiggle.
  isSource: boolean
}

export type DropResolution =
  | { kind: 'legal'; target: MoveTarget }
  | { kind: 'illegal' } // overlapped a real but illegal zone → snap back + wiggle
  | { kind: 'self' } // dropped back on the source pile → silent
  | { kind: 'none' } // dropped over nothing → silent snap back

export const buildDropCandidates = ({
  tableau,
  layouts,
  cardMetrics,
  hints,
  selection,
}: {
  tableau: ReadonlyArray<ReadonlyArray<Pick<Card, 'faceUp'>>>
  layouts: AbsoluteCardLayerLayouts
  cardMetrics: CardMetrics
  hints: DropHints
  selection: Selection
}): DropCandidate[] => {
  const candidates: DropCandidate[] = []

  tableau.forEach((column, columnIndex) => {
    const columnPosition = resolveTableauPosition(
      layouts.tableauRow,
      layouts.tableauColumns[columnIndex] ?? null
    )
    if (!columnPosition) {
      return
    }

    const offsets = computeTableauStackOffsets(column, cardMetrics.stackOffset)
    // Empty columns need no special case: computeTableauStackOffsets([]) is [],
    // and legality for them is already encoded in the mask (a King, or nothing).
    const stackHeight = column.length
      ? offsets[offsets.length - 1] + cardMetrics.height
      : cardMetrics.height

    candidates.push({
      target: { type: 'tableau', columnIndex },
      rect: {
        x: columnPosition.x - DRAG_DROP_ZONE_PAD_X,
        y: columnPosition.y,
        width: cardMetrics.width + 2 * DRAG_DROP_ZONE_PAD_X,
        height: stackHeight + cardMetrics.height * DRAG_DROP_EXTEND_Y_RATIO,
      },
      legal: hints.tableau[columnIndex] === true,
      isSource: selection.source === 'tableau' && selection.columnIndex === columnIndex,
    })
  })

  FOUNDATION_SUIT_ORDER.forEach((suit) => {
    const position = resolveTopRowPosition(layouts.topRow, layouts.foundations[suit] ?? null)
    if (!position) {
      return
    }
    candidates.push({
      target: { type: 'foundation', suit },
      rect: {
        x: position.x - DRAG_DROP_ZONE_PAD_X,
        y: position.y,
        width: cardMetrics.width + 2 * DRAG_DROP_ZONE_PAD_X,
        height: cardMetrics.height,
      },
      legal: hints.foundations[suit] === true,
      isSource: selection.source === 'foundation' && selection.suit === suit,
    })
  })

  // The stock and waste slots are deliberately NOT drop zones: nothing can be
  // moved onto them in Klondike.
  return candidates
}

export const intersectionArea = (a: HintRect, b: HintRect): number => {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return width > 0 && height > 0 ? width * height : 0
}

const centerDistanceSquared = (a: HintRect, b: HintRect): number => {
  const dx = a.x + a.width / 2 - (b.x + b.width / 2)
  const dy = a.y + a.height / 2 - (b.y + b.height / 2)
  return dx * dx + dy * dy
}

// `cardRect` is the BASE (grabbed) card's rect at release — not the finger. That is
// what the player sees, and it is what makes multi-card runs behave sensibly: only
// the base card has to land on the target.
//
// Ranking happens over legal, non-source candidates ONLY, on purpose: a card that
// mostly covers a legal column but clips an illegal neighbour still drops correctly.
// There is deliberately no "nearest legal target" magnet — a card teleporting across
// the board after a drop over empty felt reads as a bug.
export const resolveDropCandidate = (
  candidates: readonly DropCandidate[],
  cardRect: HintRect
): DropResolution => {
  const minimumScore = cardRect.width * cardRect.height * DRAG_DROP_MIN_OVERLAP_RATIO

  let best: DropCandidate | null = null
  let bestScore = 0
  let bestDistance = 0
  let touchedSource = false
  let touchedIllegal = false

  for (const candidate of candidates) {
    const score = intersectionArea(cardRect, candidate.rect)
    if (score < minimumScore) {
      continue
    }

    if (candidate.isSource) {
      touchedSource = true
      continue
    }
    if (!candidate.legal) {
      touchedIllegal = true
      continue
    }

    const distance = centerDistanceSquared(cardRect, candidate.rect)
    if (!best || score > bestScore || (score === bestScore && distance < bestDistance)) {
      best = candidate
      bestScore = score
      bestDistance = distance
    }
  }

  if (best) {
    return { kind: 'legal', target: best.target }
  }
  if (touchedSource) {
    return { kind: 'self' }
  }
  if (touchedIllegal) {
    return { kind: 'illegal' }
  }
  return { kind: 'none' }
}

// ---------------------------------------------------------------------------
// Card transform registry (the legal-drop handoff)
// ---------------------------------------------------------------------------

// The 90 ms flight in AbsoluteLayerCard runs from wherever the Animated.Value
// currently is to the card's new item.x/item.y. That is the whole lever for the
// drop handoff: seeding the value to the drop point while the real card is still
// hidden makes the EXISTING flight carry it from the drop point to its
// destination — no second animation, no timer, no race with the auto-queue.
//
// Lives in this pure module (no React) so useCardDrag stays about the gesture and
// AbsoluteLayerCard can import the type without importing the hook.
export type CardTransformHandle = { setPosition: (x: number, y: number) => void }

export type CardTransformRegistry = {
  register: (cardId: string, handle: CardTransformHandle) => void
  unregister: (cardId: string, handle: CardTransformHandle) => void
  seed: (positions: ReadonlyArray<{ cardId: string; x: number; y: number }>) => void
}

export const createCardTransformRegistry = (): CardTransformRegistry => {
  const handles = new Map<string, CardTransformHandle>()
  return {
    register: (cardId, handle) => {
      handles.set(cardId, handle)
    },
    // Handle-checked so a re-mount that registers before the old card unregisters
    // cannot delete the live entry.
    unregister: (cardId, handle) => {
      if (handles.get(cardId) === handle) {
        handles.delete(cardId)
      }
    },
    seed: (positions) => {
      positions.forEach((position) => {
        handles.get(position.cardId)?.setPosition(position.x, position.y)
      })
    },
  }
}
