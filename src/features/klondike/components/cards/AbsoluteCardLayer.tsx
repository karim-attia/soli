import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Animated as NativeAnimated, Pressable, StyleSheet, View } from 'react-native'
import type { LayoutRectangle, StyleProp, ViewStyle } from 'react-native'

import {
  FOUNDATION_SUIT_ORDER,
  TABLEAU_COLUMN_COUNT,
  type Card,
  type GameState,
  type Suit,
} from '../../../../solitaire/klondike'
import { useAnimationToggles } from '../../../../state/settings'
import {
  CARD_FLIGHT_TIMING,
  CARD_FLIP_HALF_TIMING,
  WASTE_FAN_MAX_OFFSET,
  WASTE_FAN_OVERLAP_RATIO,
  WIGGLE_OFFSET_PX,
  WIGGLE_TIMING_CONFIG,
} from '../../constants'
import type { CardMetrics, InvalidWiggleConfig } from '../../types'
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
  state: GameState
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

type CardLayerItem = {
  card: Card
  x: number
  y: number
  zIndex: number
  onPress?: () => void
  disabled?: boolean
  backLabel?: string
}

type WasteTapTarget = {
  x: number
  y: number
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
  state,
  cardMetrics,
  layouts,
  interactionsLocked,
  celebrationActive,
}: Pick<
  AbsoluteCardLayerProps,
  'state' | 'cardMetrics' | 'layouts' | 'interactionsLocked' | 'celebrationActive'
>): WasteTapTarget | null => {
  if (interactionsLocked || celebrationActive) {
    return null
  }

  const visibleWaste = state.waste.slice(-3)
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
  }
}

const buildCardLayerItems = ({
  state,
  cardMetrics,
  layouts,
  drawLabel,
  interactionsLocked,
  celebrationActive,
  onDraw,
  onFoundationPress,
  onTableauCardPress,
}: Omit<
  AbsoluteCardLayerProps,
  'invalidWiggle' | 'animationResetKey' | 'onWasteTap'
>): CardLayerItem[] => {
  if (celebrationActive) {
    return []
  }

  const items: CardLayerItem[] = []
  const stockPosition = resolveTopRowPosition(layouts.topRow, layouts.stock)
  const stockTop = state.stock[state.stock.length - 1]
  if (stockTop && stockPosition) {
    items.push({
      card: stockTop,
      x: stockPosition.x,
      y: stockPosition.y,
      zIndex: 100 + state.stock.length,
      onPress: interactionsLocked ? undefined : onDraw,
      disabled: interactionsLocked,
      backLabel: drawLabel,
    })
  }

  const visibleWaste = state.waste.slice(-3)
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
        // is shifting to its new fan position.
        onPress: undefined,
        disabled: interactionsLocked || !isTop,
      })
    })
  }

  FOUNDATION_SUIT_ORDER.forEach((suit, suitIndex) => {
    const topCard = state.foundations[suit][state.foundations[suit].length - 1]
    const foundationPosition = resolveTopRowPosition(
      layouts.topRow,
      layouts.foundations[suit] ?? null
    )
    if (!topCard || !foundationPosition) {
      return
    }

    const foundation = state.foundations[suit]
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

    items.push({
      card: topCard,
      x: foundationPosition.x,
      y: foundationPosition.y,
      zIndex: 500 + suitIndex * 20 + state.foundations[suit].length,
      onPress: interactionsLocked ? undefined : () => onFoundationPress(suit),
      disabled: interactionsLocked,
    })
  })

  const faceDownStackOffset = Math.round(
    cardMetrics.stackOffset / FACE_DOWN_STACK_OFFSET_DIVISOR
  )
  state.tableau.forEach((column, columnIndex) => {
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
        onPress:
          card.faceUp && !interactionsLocked
            ? () => onTableauCardPress(columnIndex, cardIndex)
            : undefined,
        disabled: interactionsLocked || !card.faceUp,
      })
    })
  })

  return items
}

export const AbsoluteCardLayer = ({
  state,
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
        state,
        cardMetrics,
        layouts,
        interactionsLocked,
        celebrationActive,
      }),
    [cardMetrics, celebrationActive, interactionsLocked, layouts, state]
  )
  const items = useMemo(
    () =>
      buildCardLayerItems({
        state,
        cardMetrics,
        layouts,
        drawLabel,
        interactionsLocked,
        celebrationActive,
        onDraw,
        onFoundationPress,
        onTableauCardPress,
      }),
    [
      cardMetrics,
      celebrationActive,
      drawLabel,
      interactionsLocked,
      layouts,
      onDraw,
      onFoundationPress,
      onTableauCardPress,
      state,
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

type AbsoluteLayerCardProps = {
  item: CardLayerItem
  metrics: CardMetrics
  invalidWiggle: InvalidWiggleConfig
  animationResetKey: number
  movementEnabled: boolean
  flipEnabled: boolean
  onCardSettled?: (cardId: string) => void
}

const AbsoluteLayerCard = React.memo(
  ({
    item,
    metrics,
    invalidWiggle,
    animationResetKey,
    movementEnabled,
    flipEnabled,
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
      NativeAnimated.parallel([
        NativeAnimated.timing(translateX, {
          toValue: item.x,
          ...CARD_FLIGHT_TIMING,
          useNativeDriver: true,
        }),
        NativeAnimated.timing(translateY, {
          toValue: item.y,
          ...CARD_FLIGHT_TIMING,
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
        ...CARD_FLIP_HALF_TIMING,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) {
          return
        }

        setRenderFaceUp(item.card.faceUp)
        NativeAnimated.timing(flipScale, {
          toValue: 1,
          ...CARD_FLIP_HALF_TIMING,
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
          ...WIGGLE_TIMING_CONFIG,
          useNativeDriver: true,
        }),
        NativeAnimated.timing(wiggle, {
          toValue: ABSOLUTE_LAYER_WIGGLE_OFFSET_PX,
          ...WIGGLE_TIMING_CONFIG,
          useNativeDriver: true,
        }),
        NativeAnimated.timing(wiggle, {
          toValue: 0,
          ...WIGGLE_TIMING_CONFIG,
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

    return (
      <NativeAnimated.View
        pointerEvents={item.onPress && !pressDisabled ? 'auto' : 'none'}
        style={cardStyle}
      >
        {item.onPress ? (
          <Pressable onPress={item.onPress} disabled={pressDisabled}>
            {body}
          </Pressable>
        ) : (
          body
        )}
      </NativeAnimated.View>
    )
  }
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
