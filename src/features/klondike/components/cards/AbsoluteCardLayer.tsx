import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated as NativeAnimated, Pressable, StyleSheet, View } from 'react-native'
import type { LayoutRectangle, StyleProp, ViewStyle } from 'react-native'

import {
  FOUNDATION_SUIT_ORDER,
  TABLEAU_COLUMN_COUNT,
  type Card,
  type Foundations,
  type Suit,
  type Tableau,
} from '../../../../solitaire/klondike'
import { useAnimationToggles } from '../../../../state/settings'
import {
  CARD_ANIMATION_DURATION_MS,
  CARD_FLIP_HALF_DURATION_MS,
  WASTE_FAN_MAX_OFFSET,
  WASTE_FAN_OVERLAP_RATIO,
  WIGGLE_OFFSET_PX,
  WIGGLE_SEGMENT_DURATION_MS,
} from '../../constants'
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
  WASTE_TEST_ID,
} from './accessibility'
import { CardBack, CardVisual } from './CardVisual'
import { styles as cardStyles } from './styles'

const FACE_DOWN_STACK_OFFSET_DIVISOR = 2
// Absolute-layer cards no longer sit inside pile-local animated wrappers, so use
// a slightly stronger invalid feedback offset to keep the motion readable on device.
const ABSOLUTE_LAYER_WIGGLE_OFFSET_PX = Math.max(8, WIGGLE_OFFSET_PX * 1.6)

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

export type AbsoluteCardLayerProps = {
  // Perf (A2): pile slices instead of the full GameState so React.memo on this layer
  // can skip re-renders when the piles kept referential identity (e.g. TIMER_TICK).
  stock: Card[]
  waste: Card[]
  foundations: Foundations
  tableau: Tableau
  cardMetrics: CardMetrics
  layouts: AbsoluteCardLayerLayouts
  drawLabel: string
  invalidWiggle: InvalidWiggleConfig
  animationResetKey: number
  interactionsLocked: boolean
  celebrationActive: boolean
  onDraw: () => void
  onWasteTap: () => void
  onFoundationPress: (suit: Suit) => void
  onTableauCardPress: (columnIndex: number, cardIndex: number) => void
  onCardSettled?: (cardId: string) => void
}

// Perf (P3): press targets are plain data instead of per-item closures so the card
// memo comparator can compare them by value; the actual (stable, ref-based) handlers
// are passed to AbsoluteLayerCard separately.
type CardLayerPress =
  | { type: 'draw' }
  | { type: 'foundation'; suit: Suit }
  | { type: 'tableau'; columnIndex: number; cardIndex: number }

type CardLayerItem = {
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
}

type WasteTapTarget = {
  x: number
  y: number
  accessibilityLabel: string
}

const resolveTopRowPosition = (
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

const resolveTableauPosition = (
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

const resolveWasteTapTarget = ({
  waste,
  cardMetrics,
  layouts,
  interactionsLocked,
  celebrationActive,
}: Pick<
  AbsoluteCardLayerProps,
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

  const overlap = Math.min(
    cardMetrics.width * WASTE_FAN_OVERLAP_RATIO,
    WASTE_FAN_MAX_OFFSET
  )
  const fanWidth = cardMetrics.width + overlap * (visibleWaste.length - 1)
  const baseX = wastePosition.x + cardMetrics.width - fanWidth

  return {
    x: baseX + (visibleWaste.length - 1) * overlap,
    y: wastePosition.y,
    // The tap zone owns the waste's a11y node (the fan visuals stay unlabeled to
    // avoid duplicate focus targets), so it carries the top card's name.
    accessibilityLabel: getWasteLabel(visibleWaste[visibleWaste.length - 1]),
  }
}

const buildCardLayerItems = ({
  stock,
  waste,
  foundations,
  tableau,
  cardMetrics,
  layouts,
  drawLabel,
  interactionsLocked,
  celebrationActive,
}: Pick<
  AbsoluteCardLayerProps,
  | 'stock'
  | 'waste'
  | 'foundations'
  | 'tableau'
  | 'cardMetrics'
  | 'layouts'
  | 'drawLabel'
  | 'interactionsLocked'
  | 'celebrationActive'
>): CardLayerItem[] => {
  if (celebrationActive) {
    return []
  }

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
    })
  }

  const visibleWaste = waste.slice(-3)
  const wastePosition = resolveTopRowPosition(layouts.topRow, layouts.waste)
  if (visibleWaste.length && wastePosition) {
    const overlap = Math.min(
      cardMetrics.width * WASTE_FAN_OVERLAP_RATIO,
      WASTE_FAN_MAX_OFFSET
    )
    const fanWidth = cardMetrics.width + overlap * (visibleWaste.length - 1)
    const baseX = wastePosition.x + cardMetrics.width - fanWidth
    visibleWaste.forEach((card, index) => {
      const isTop = index === visibleWaste.length - 1
      items.push({
        card,
        x: baseX + index * overlap,
        y: wastePosition.y,
        zIndex: 300 + index,
        // Waste taps are owned by one stable slot target below. Keeping the
        // visual card non-pressable lets fast second taps land while this card
        // is shifting to its new fan position. The visuals also stay unlabeled:
        // the WasteTapZone carries the a11y node (avoids duplicate focus targets).
        press: undefined,
        disabled: interactionsLocked || !isTop,
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
    })
  })

  const faceDownStackOffset = Math.round(
    cardMetrics.stackOffset / FACE_DOWN_STACK_OFFSET_DIVISOR
  )
  tableau.forEach((column, columnIndex) => {
    const columnPosition = resolveTableauPosition(
      layouts.tableauRow,
      layouts.tableauColumns[columnIndex] ?? null
    )
    if (!columnPosition) {
      return
    }

    let runningOffset = 0
    column.forEach((card, cardIndex) => {
      const offset = runningOffset
      runningOffset += card.faceUp ? cardMetrics.stackOffset : faceDownStackOffset
      items.push({
        card,
        x: columnPosition.x,
        y: columnPosition.y + offset,
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
      })
    })
  })

  return items
}

// Perf (A2): memoized so per-second TIMER_TICK renders (piles keep referential
// identity through the reducer) skip the whole layer, including the items rebuild.
export const AbsoluteCardLayer = React.memo(
  ({
    stock,
    waste,
    foundations,
    tableau,
    cardMetrics,
    layouts,
    drawLabel,
    invalidWiggle,
    animationResetKey,
    interactionsLocked,
    celebrationActive,
    onDraw,
    onWasteTap,
    onFoundationPress,
    onTableauCardPress,
    onCardSettled,
  }: AbsoluteCardLayerProps) => {
    const { cardFlights: cardFlightsEnabled, cardFlip: cardFlipEnabled } =
      useAnimationToggles()
    const wasteTapTarget = useMemo(
      () =>
        resolveWasteTapTarget({
          waste,
          cardMetrics,
          layouts,
          interactionsLocked,
          celebrationActive,
        }),
      [cardMetrics, celebrationActive, interactionsLocked, layouts, waste]
    )
    const items = useMemo(
      () =>
        buildCardLayerItems({
          stock,
          waste,
          foundations,
          tableau,
          cardMetrics,
          layouts,
          drawLabel,
          interactionsLocked,
          celebrationActive,
        }),
      [
        cardMetrics,
        celebrationActive,
        drawLabel,
        foundations,
        interactionsLocked,
        layouts,
        stock,
        tableau,
        waste,
      ]
    )

    return (
      <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
        {items.map((item) => (
          <AbsoluteLayerCard
            key={item.card.id}
            item={item}
            metrics={cardMetrics}
            invalidWiggle={invalidWiggle}
            animationResetKey={animationResetKey}
            movementEnabled={cardFlightsEnabled}
            flipEnabled={cardFlipEnabled}
            onDraw={onDraw}
            onFoundationPress={onFoundationPress}
            onTableauCardPress={onTableauCardPress}
            onCardSettled={onCardSettled}
          />
        ))}
        {wasteTapTarget ? (
          <WasteTapZone
            target={wasteTapTarget}
            metrics={cardMetrics}
            onPress={onWasteTap}
          />
        ) : null}
      </View>
    )
  }
)

AbsoluteCardLayer.displayName = 'AbsoluteCardLayer'

type AbsoluteLayerCardProps = {
  item: CardLayerItem
  metrics: CardMetrics
  invalidWiggle: InvalidWiggleConfig
  animationResetKey: number
  movementEnabled: boolean
  flipEnabled: boolean
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
// (position targets, face, z-order, press target, wiggle membership). Function props
// are deliberately ignored: all handlers read live state through refs in
// useKlondikeGame, so a newer function identity never changes behavior — comparing
// them would silently defeat this memo (e.g. onCardSettled changes identity whenever
// foundations change). History note: an earlier comparator on the old pile-local card
// surfaces regressed correctness via stale press closures (see animation-audit plan);
// that hazard is avoided here by comparing press *data* and keeping handlers ref-based.
// WARNING: any new CardLayerItem field that affects rendering MUST be compared here,
// or updates to it will be silently swallowed by the memo (pattern: backLabel,
// accessibilityLabel, testID).
const areAbsoluteLayerCardPropsEqual = (
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

const AbsoluteLayerCard = React.memo(
  ({
    item,
    metrics,
    invalidWiggle,
    animationResetKey,
    movementEnabled,
    flipEnabled,
    onDraw,
    onFoundationPress,
    onTableauCardPress,
    onCardSettled,
  }: AbsoluteLayerCardProps) => {
    const translateX = useRef(new NativeAnimated.Value(item.x)).current
    const translateY = useRef(new NativeAnimated.Value(item.y)).current
    const wiggle = useRef(new NativeAnimated.Value(0)).current
    const flipScale = useRef(new NativeAnimated.Value(1)).current
    const [renderFaceUp, setRenderFaceUp] = useState(item.card.faceUp)
    const [isSettling, setIsSettling] = useState(false)
    const previousTargetRef = useRef({ x: item.x, y: item.y })
    const previousResetKeyRef = useRef(animationResetKey)
    const previousFaceUpRef = useRef(item.card.faceUp)
    const lastWiggleKeyRef = useRef(invalidWiggle.key)
    const targetChangedBeforeEffect =
      movementEnabled &&
      previousResetKeyRef.current === animationResetKey &&
      (previousTargetRef.current.x !== item.x || previousTargetRef.current.y !== item.y)
    // In Fabric/native-driver moves, the visual transform and React pressability can briefly
    // disagree. Disable touches in the render that first observes a new target so rapid stock
    // taps cannot hit the just-opened waste card before the settling effect runs.
    const pressDisabled = item.disabled || isSettling || targetChangedBeforeEffect

    useEffect(() => {
      const resetChanged = previousResetKeyRef.current !== animationResetKey
      previousResetKeyRef.current = animationResetKey
      const previousTarget = previousTargetRef.current
      const targetChanged = previousTarget.x !== item.x || previousTarget.y !== item.y
      previousTargetRef.current = { x: item.x, y: item.y }

      if (!movementEnabled || resetChanged) {
        translateX.stopAnimation()
        translateY.stopAnimation()
        translateX.setValue(item.x)
        translateY.setValue(item.y)
        setIsSettling(false)
        return
      }

      if (!targetChanged) {
        setIsSettling(false)
        return
      }

      setIsSettling(true)
      // Keep React Native's default symmetric easing here. A front-loaded curve moved stock
      // cards almost completely before the 40 ms face swap, which caused visible draw flicker.
      NativeAnimated.parallel([
        NativeAnimated.timing(translateX, {
          toValue: item.x,
          duration: CARD_ANIMATION_DURATION_MS,
          useNativeDriver: true,
        }),
        NativeAnimated.timing(translateY, {
          toValue: item.y,
          duration: CARD_ANIMATION_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setIsSettling(false)
          onCardSettled?.(item.card.id)
        }
      })
    }, [
      animationResetKey,
      item.card.id,
      item.x,
      item.y,
      movementEnabled,
      onCardSettled,
      translateX,
      translateY,
    ])

    useEffect(() => {
      if (!flipEnabled) {
        flipScale.stopAnimation()
        flipScale.setValue(1)
        setRenderFaceUp(item.card.faceUp)
        previousFaceUpRef.current = item.card.faceUp
        return
      }

      if (previousFaceUpRef.current === item.card.faceUp) {
        return
      }

      previousFaceUpRef.current = item.card.faceUp
      flipScale.stopAnimation()
      NativeAnimated.timing(flipScale, {
        toValue: 0,
        duration: CARD_FLIP_HALF_DURATION_MS,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          return
        }

        setRenderFaceUp(item.card.faceUp)
        NativeAnimated.timing(flipScale, {
          toValue: 1,
          duration: CARD_FLIP_HALF_DURATION_MS,
          useNativeDriver: true,
        }).start()
      })
    }, [flipEnabled, flipScale, item.card.faceUp])

    useEffect(() => {
      if (!invalidWiggle.lookup.has(item.card.id)) {
        return
      }
      if (lastWiggleKeyRef.current === invalidWiggle.key) {
        return
      }

      lastWiggleKeyRef.current = invalidWiggle.key
      wiggle.stopAnimation()
      wiggle.setValue(0)
      NativeAnimated.sequence([
        NativeAnimated.timing(wiggle, {
          toValue: -ABSOLUTE_LAYER_WIGGLE_OFFSET_PX,
          duration: WIGGLE_SEGMENT_DURATION_MS,
          useNativeDriver: true,
        }),
        NativeAnimated.timing(wiggle, {
          toValue: ABSOLUTE_LAYER_WIGGLE_OFFSET_PX,
          duration: WIGGLE_SEGMENT_DURATION_MS,
          useNativeDriver: true,
        }),
        NativeAnimated.timing(wiggle, {
          toValue: 0,
          duration: WIGGLE_SEGMENT_DURATION_MS,
          useNativeDriver: true,
        }),
      ]).start()
    }, [invalidWiggle.key, invalidWiggle.lookup, item.card.id, wiggle])

    useEffect(() => {
      return () => {
        translateX.stopAnimation()
        translateY.stopAnimation()
        wiggle.stopAnimation()
        flipScale.stopAnimation()
      }
    }, [flipScale, translateX, translateY, wiggle])

    const cardStyle: StyleProp<ViewStyle> = [
      layerStyles.card,
      {
        width: metrics.width,
        height: metrics.height,
        zIndex: isSettling ? 10000 + item.zIndex : item.zIndex,
        transform: [
          { translateX },
          { translateY },
          { translateX: wiggle },
          { scaleX: flipScale },
        ],
      },
    ]

    const body = renderFaceUp ? (
      <CardVisual card={{ ...item.card, faceUp: true }} metrics={metrics} />
    ) : item.backLabel ? (
      <CardBack label={item.backLabel} metrics={metrics} variant="stock" />
    ) : (
      <View
        // Face-down tableau cards are non-pressable, so the a11y node lives on the
        // body view. `pointerEvents="none"` on the animated wrapper does not remove
        // children from the a11y tree, which is exactly what we rely on here.
        accessible={!item.press && !!item.accessibilityLabel}
        accessibilityLabel={item.press ? undefined : item.accessibilityLabel}
        testID={item.press ? undefined : item.testID}
        style={[
          cardStyles.cardBase,
          cardStyles.faceDown,
          {
            width: '100%',
            height: '100%',
            borderRadius: metrics.radius,
          },
        ]}
      />
    )

    const press = item.press
    const handlePress = () => {
      if (!press) {
        return
      }
      if (press.type === 'draw') {
        onDraw()
      } else if (press.type === 'foundation') {
        onFoundationPress(press.suit)
      } else {
        onTableauCardPress(press.columnIndex, press.cardIndex)
      }
    }

    return (
      <NativeAnimated.View
        pointerEvents={press && !pressDisabled ? 'auto' : 'none'}
        style={cardStyle}
      >
        {press ? (
          <Pressable
            onPress={handlePress}
            disabled={pressDisabled}
            accessibilityRole="button"
            accessibilityLabel={item.accessibilityLabel}
            testID={item.testID}
          >
            {body}
          </Pressable>
        ) : (
          body
        )}
      </NativeAnimated.View>
    )
  },
  areAbsoluteLayerCardPropsEqual
)

AbsoluteLayerCard.displayName = 'AbsoluteLayerCard'

type WasteTapZoneProps = {
  target: WasteTapTarget
  metrics: CardMetrics
  onPress: () => void
}

const WasteTapZone = React.memo(({ target, metrics, onPress }: WasteTapZoneProps) => (
  <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={target.accessibilityLabel}
    testID={WASTE_TEST_ID}
    style={[
      layerStyles.wasteTapZone,
      {
        left: target.x,
        top: target.y,
        width: metrics.width,
        height: metrics.height,
      },
    ]}
  />
))

WasteTapZone.displayName = 'WasteTapZone'

const layerStyles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  wasteTapZone: {
    position: 'absolute',
    zIndex: 450,
  },
})
