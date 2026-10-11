import {
  FOUNDATION_SUIT_ORDER,
  type Card,
  type Foundations,
  type Suit,
  type Tableau,
} from '../../../../solitaire/klondike'
import type { CardMetrics, InvalidWiggleConfig } from '../../types'
import {
  getCardTestID,
  getFaceDownCardLabel,
  getFoundationLabel,
  getFoundationTestID,
  getStockLabel,
  getTableauCardLabel,
  getWasteLabel,
  STOCK_TEST_ID,
} from './accessibility'
import type { CardTransformRegistry } from './dragGeometry'
import {
  computeTableauStackOffsets,
  computeWasteFanGeometry,
  resolveTableauPosition,
  resolveTopRowPosition,
  type AbsoluteCardLayerLayouts,
} from './utils'

// The card layer's DATA model: which card is drawn where, with which press target
// and which a11y handles, plus the memo comparator that decides when a card
// re-renders. Extracted from AbsoluteCardLayer.tsx (card-drag-and-drop plan) so it
// is jest-importable without that component's tamagui-heavy CardVisual chain —
// same rule as cards/utils.ts. That makes two things testable that never were:
// the memo comparator, and the inverse property between this builder and
// dragGeometry's hitTestDragSource (a drag must grab exactly the card that is
// drawn under the finger).

// Perf (P3): press targets are plain data instead of per-item closures so the card
// memo comparator can compare them by value; the actual (stable, ref-based) handlers
// are passed to AbsoluteLayerCard separately.
export type CardLayerPress =
  | { type: 'draw' }
  | { type: 'foundation'; suit: Suit }
  | { type: 'tableau'; columnIndex: number; cardIndex: number }

export type CardLayerItem = {
  card: Card
  x: number
  y: number
  zIndex: number
  press?: CardLayerPress
  disabled?: boolean
  backLabel?: string
  // A11y/automation handles are precomputed stable strings on the item (not derived in
  // AbsoluteLayerCard) so face-down cards get column context and the memo comparator
  // can compare them cheaply by value.
  accessibilityLabel?: string
  testID?: string
  // Card drag: true while a lifted copy of this card is being rendered by
  // DragOverlayLayer. The real card stays mounted (so its Animated.Values keep the
  // position the drop handoff seeds) but renders at opacity 0 and takes no touches.
  hidden?: boolean
}

export type WasteTapTarget = {
  x: number
  y: number
  accessibilityLabel: string
}

export type CardLayerItemsInput = {
  stock: Card[]
  waste: Card[]
  foundations: Foundations
  tableau: Tableau
  cardMetrics: CardMetrics
  layouts: AbsoluteCardLayerLayouts
  drawLabel: string
  interactionsLocked: boolean
  celebrationActive: boolean
  // Null (not an empty Set) when no drag is in flight: a stable identity keeps the
  // card layer's own React.memo from re-rendering on every board commit.
  hiddenCardIds: ReadonlySet<string> | null
}

export const resolveWasteTapTarget = ({
  waste,
  cardMetrics,
  layouts,
  interactionsLocked,
  celebrationActive,
}: Pick<
  CardLayerItemsInput,
  'waste' | 'cardMetrics' | 'layouts' | 'interactionsLocked' | 'celebrationActive'
>): WasteTapTarget | null => {
  if (interactionsLocked || celebrationActive) {
    return null
  }

  const visibleWaste = waste.slice(-3)
  const wastePosition = resolveTopRowPosition(layouts.topRow, layouts.waste)
  if (!visibleWaste.length || !wastePosition) {
    return null
  }

  const fan = computeWasteFanGeometry(visibleWaste.length, cardMetrics.width)

  return {
    x: wastePosition.x + fan.baseXOffset + (visibleWaste.length - 1) * fan.overlap,
    y: wastePosition.y,
    // The tap zone owns the waste's a11y node (the fan visuals stay unlabeled to
    // avoid duplicate focus targets), so it carries the top card's name.
    accessibilityLabel: getWasteLabel(visibleWaste[visibleWaste.length - 1]),
  }
}

export const buildCardLayerItems = ({
  stock,
  waste,
  foundations,
  tableau,
  cardMetrics,
  layouts,
  drawLabel,
  interactionsLocked,
  celebrationActive,
  hiddenCardIds,
}: CardLayerItemsInput): CardLayerItem[] => {
  if (celebrationActive) {
    return []
  }

  const isHidden = (card: Card): boolean =>
    hiddenCardIds ? hiddenCardIds.has(card.id) : false

  const items: CardLayerItem[] = []
  const stockPosition = resolveTopRowPosition(layouts.topRow, layouts.stock)
  const stockTop = stock[stock.length - 1]
  if (stockTop && stockPosition) {
    items.push({
      card: stockTop,
      x: stockPosition.x,
      y: stockPosition.y,
      zIndex: 100 + stock.length,
      press: interactionsLocked ? undefined : { type: 'draw' },
      disabled: interactionsLocked,
      backLabel: drawLabel,
      // Count in the label lets device tests assert draws without coordinates; the
      // item already re-renders on every draw (zIndex depends on stock length).
      accessibilityLabel: getStockLabel(stock.length),
      testID: STOCK_TEST_ID,
      hidden: false,
    })
  }

  const visibleWaste = waste.slice(-3)
  const wastePosition = resolveTopRowPosition(layouts.topRow, layouts.waste)
  if (visibleWaste.length && wastePosition) {
    const fan = computeWasteFanGeometry(visibleWaste.length, cardMetrics.width)
    const baseX = wastePosition.x + fan.baseXOffset
    visibleWaste.forEach((card, index) => {
      const isTop = index === visibleWaste.length - 1
      items.push({
        card,
        x: baseX + index * fan.overlap,
        y: wastePosition.y,
        zIndex: 300 + index,
        // Waste taps are owned by one stable slot target below. Keeping the
        // visual card non-pressable lets fast second taps land while this card
        // is shifting to its new fan position. The visuals also stay unlabeled:
        // the WasteTapZone carries the a11y node (avoids duplicate focus targets).
        press: undefined,
        disabled: interactionsLocked || !isTop,
        hidden: isHidden(card),
      })
    })
  }

  FOUNDATION_SUIT_ORDER.forEach((suit, suitIndex) => {
    const foundation = foundations[suit]
    const topCard = foundation[foundation.length - 1]
    const foundationPosition = resolveTopRowPosition(
      layouts.topRow,
      layouts.foundations[suit] ?? null
    )
    if (!topCard || !foundationPosition) {
      return
    }

    const foundationDepth = foundation.length
    const underlayCard = foundationDepth > 1 ? foundation[foundationDepth - 2] : null
    if (underlayCard) {
      items.push({
        card: underlayCard,
        x: foundationPosition.x,
        y: foundationPosition.y,
        zIndex: 480 + suitIndex * 20 + foundationDepth,
        disabled: true,
        hidden: false,
      })
    }

    // Only the top card gets an a11y label; the underlay is visual-only (a second
    // labeled node per foundation would duplicate focus targets).
    items.push({
      card: topCard,
      x: foundationPosition.x,
      y: foundationPosition.y,
      zIndex: 500 + suitIndex * 20 + foundationDepth,
      press: interactionsLocked ? undefined : { type: 'foundation', suit },
      disabled: interactionsLocked,
      accessibilityLabel: getFoundationLabel(suit, topCard),
      testID: getFoundationTestID(suit),
      hidden: isHidden(topCard),
    })
  })

  tableau.forEach((column, columnIndex) => {
    const columnPosition = resolveTableauPosition(
      layouts.tableauRow,
      layouts.tableauColumns[columnIndex] ?? null
    )
    if (!columnPosition) {
      return
    }

    const cardOffsets = computeTableauStackOffsets(column, cardMetrics.stackOffset)
    column.forEach((card, cardIndex) => {
      items.push({
        card,
        x: columnPosition.x,
        y: columnPosition.y + cardOffsets[cardIndex],
        zIndex: 1000 + columnIndex * 100 + cardIndex,
        press:
          card.faceUp && !interactionsLocked
            ? { type: 'tableau', columnIndex, cardIndex }
            : undefined,
        disabled: interactionsLocked || !card.faceUp,
        // Face-down cards are labeled too: hidden-card counts per column are real game
        // state for screen-reader players and device tests. If narration proves too
        // noisy, dropping the label here is a one-line revert.
        accessibilityLabel: card.faceUp
          ? getTableauCardLabel(card, columnIndex)
          : getFaceDownCardLabel(columnIndex),
        testID: getCardTestID(card),
        hidden: isHidden(card),
      })
    })
  })

  return items
}

export type AbsoluteLayerCardProps = {
  item: CardLayerItem
  metrics: CardMetrics
  invalidWiggle: InvalidWiggleConfig
  animationResetKey: number
  movementEnabled: boolean
  flipEnabled: boolean
  // Identity-stable for the lifetime of useCardDrag, which is why the comparator
  // below can (correctly) ignore it. A registry re-created per render would be
  // silently stale — exactly the hazard the WARNING below describes.
  cardTransforms?: CardTransformRegistry | null
  onDraw: () => void
  onFoundationPress: (suit: Suit) => void
  onTableauCardPress: (columnIndex: number, cardIndex: number) => void
  onCardSettled?: (cardId: string) => void
}

const arePressTargetsEqual = (
  prev: CardLayerPress | undefined,
  next: CardLayerPress | undefined
): boolean => {
  if (!prev || !next) {
    return prev === next
  }
  if (prev.type === 'draw') {
    return next.type === 'draw'
  }
  if (prev.type === 'foundation') {
    return next.type === 'foundation' && next.suit === prev.suit
  }
  return (
    next.type === 'tableau' &&
    next.columnIndex === prev.columnIndex &&
    next.cardIndex === prev.cardIndex
  )
}

// Perf (P3): items are rebuilt as fresh objects on every board change, so compare by
// value exactly the fields that affect a card's render or its animation effects
// (position targets, face, z-order, press target, wiggle membership, drag visibility).
// Function props are deliberately ignored: all handlers read live state through refs in
// useKlondikeGame, so a newer function identity never changes behavior — comparing
// them would silently defeat this memo (e.g. onCardSettled changes identity whenever
// foundations change). History note: an earlier comparator on the old pile-local card
// surfaces regressed correctness via stale press closures (see animation-audit plan);
// that hazard is avoided here by comparing press *data* and keeping handlers ref-based.
// WARNING: any new CardLayerItem field that affects rendering MUST be compared here,
// or updates to it will be silently swallowed by the memo (pattern: backLabel,
// accessibilityLabel, testID, hidden). `hidden` really did regress this way during
// the card-drag work: the flag flipped, the comparator said "equal", and the real
// card stayed visible underneath its own dragged copy.
export const areAbsoluteLayerCardPropsEqual = (
  prev: AbsoluteLayerCardProps,
  next: AbsoluteLayerCardProps
): boolean => {
  const prevItem = prev.item
  const nextItem = next.item
  if (
    prevItem.card.id !== nextItem.card.id ||
    prevItem.card.faceUp !== nextItem.card.faceUp ||
    prevItem.x !== nextItem.x ||
    prevItem.y !== nextItem.y ||
    prevItem.zIndex !== nextItem.zIndex ||
    prevItem.disabled !== nextItem.disabled ||
    prevItem.hidden !== nextItem.hidden ||
    prevItem.backLabel !== nextItem.backLabel ||
    prevItem.accessibilityLabel !== nextItem.accessibilityLabel ||
    prevItem.testID !== nextItem.testID ||
    !arePressTargetsEqual(prevItem.press, nextItem.press)
  ) {
    return false
  }

  if (
    prev.metrics !== next.metrics ||
    prev.animationResetKey !== next.animationResetKey ||
    prev.movementEnabled !== next.movementEnabled ||
    prev.flipEnabled !== next.flipEnabled
  ) {
    return false
  }

  // Wiggle changes only need to re-render cards that are (or were) wiggling.
  if (prev.invalidWiggle.key !== next.invalidWiggle.key) {
    const cardId = nextItem.card.id
    if (prev.invalidWiggle.lookup.has(cardId) || next.invalidWiggle.lookup.has(cardId)) {
      return false
    }
  }

  return true
}
