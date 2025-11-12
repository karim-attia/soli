import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  LayoutChangeEvent,
  LayoutRectangle,
  Pressable,
  StyleSheet,
  View,
} from 'react-native'
import type { ViewStyle } from 'react-native'
import Animated, {
  cancelAnimation,
  measure,
  runOnJS,
  runOnUI,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { RefreshCcw } from '@tamagui/lucide-icons'
import { Text, XStack, YStack } from 'tamagui'

import {
  CARD_FLIGHT_TIMING,
  CARD_FLIP_HALF_TIMING,
  COLOR_CARD_BACK,
  COLOR_CARD_BORDER,
  COLOR_CARD_FACE,
  COLOR_COLUMN_BORDER,
  COLOR_COLUMN_SELECTED,
  COLOR_DROP_BORDER,
  COLOR_FELT_TEXT_PRIMARY,
  COLOR_FELT_TEXT_SECONDARY,
  COLOR_FOUNDATION_BORDER,
  COLOR_SELECTED_BORDER,
  COLOR_TEXT_MUTED,
  COLOR_TEXT_STRONG,
  FACE_CARD_LABELS,
  FOUNDATION_GLOW_COLOR,
  FOUNDATION_GLOW_IN_TIMING,
  FOUNDATION_GLOW_MAX_OPACITY,
  FOUNDATION_GLOW_OUT_TIMING,
  FOUNDATION_GLOW_OUTSET,
  SUIT_COLORS,
  SUIT_SYMBOLS,
  WASTE_FAN_MAX_OFFSET,
  WASTE_FAN_OVERLAP_RATIO,
  WASTE_TIMING_CONFIG,
  WIGGLE_OFFSET_PX,
  WIGGLE_TIMING_CONFIG,
  COLUMN_MARGIN,
  EDGE_GUTTER,
} from '../../constants'
import type {
  CardFlightRegistry,
  CardMetrics,
  CelebrationBindings,
  DropHints,
  InvalidWiggleConfig,
} from '../../types'
import { EMPTY_INVALID_WIGGLE } from '../../types'
import {
  FOUNDATION_SUIT_ORDER,
  type Card,
  type GameState,
  type Rank,
  type Selection,
  type Suit,
} from '../../../../solitaire/klondike'
import type { CardFlightSnapshot } from '../../../../animation/flightController'
import {
  CELEBRATION_WOBBLE_FREQUENCY,
  TAU,
  computeCelebrationFrame,
} from '../../../../animation/celebrationModes'
import { useAnimationToggles } from '../../../../state/settings'

const AnimatedView = Animated.createAnimatedComponent(View)

export type TopRowProps = {
  state: GameState
  drawLabel: string
  onDraw: () => void
  onWasteTap: () => void
  onWasteHold: () => void
  onFoundationPress: (suit: Suit) => void
  onFoundationHold: (suit: Suit) => void
  cardMetrics: CardMetrics
  dropHints: DropHints
  notifyInvalidMove: (options?: { selection?: Selection | null }) => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  onFoundationArrival?: (cardId: string | null | undefined) => void
  interactionsLocked: boolean
  hideFoundations?: boolean
  onTopRowLayout?: (layout: LayoutRectangle) => void
  onFoundationLayout?: (suit: Suit, layout: LayoutRectangle) => void
  celebrationBindings?: CelebrationBindings
  celebrationActive?: boolean
}

export const TopRow = ({
  state,
  drawLabel,
  onDraw,
  onWasteTap,
  onWasteHold,
  onFoundationPress,
  onFoundationHold,
  cardMetrics,
  dropHints,
  notifyInvalidMove,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  onFoundationArrival,
  interactionsLocked,
  hideFoundations,
  onTopRowLayout,
  onFoundationLayout,
  celebrationBindings,
  celebrationActive = false,
}: TopRowProps) => {
  const handleFoundationArrival = onFoundationArrival ?? (() => {})
  const stockDisabled = (!state.stock.length && !state.waste.length) || interactionsLocked
  const wasteSelected = state.selected?.source === 'waste'
  const showRecycle = !state.stock.length && state.waste.length > 0
  const drawVariant = showRecycle
    ? 'recycle'
    : state.stock.length
      ? 'stock'
      : 'empty'

  const handleWastePress = useCallback(() => {
    if (interactionsLocked) {
      return
    }
    if (!state.waste.length) {
      notifyInvalidMove()
      return
    }
    onWasteTap()
  }, [interactionsLocked, notifyInvalidMove, onWasteTap, state.waste.length])

  const handleRowLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onTopRowLayout?.(event.nativeEvent.layout)
    },
    [onTopRowLayout],
  )

  const createFoundationLayoutHandler = useCallback(
    (suit: Suit) => (layout: LayoutRectangle) => {
      onFoundationLayout?.(suit, layout)
    },
    [onFoundationLayout],
  )

  return (
    <XStack gap="$4" width="100%" items="flex-start" onLayout={handleRowLayout}>
      <XStack gap="$2" flexWrap="nowrap" justify="flex-start" shrink={0}>
        {FOUNDATION_SUIT_ORDER.map((suit) => (
          <FoundationPile
            key={suit}
            suit={suit}
            cards={state.foundations[suit]}
            cardMetrics={cardMetrics}
            isDroppable={dropHints.foundations[suit]}
            isSelected={state.selected?.source === 'foundation' && state.selected.suit === suit}
            onPress={() => onFoundationPress(suit)}
            onLongPress={() => onFoundationHold(suit)}
            invalidWiggle={invalidWiggle}
            cardFlights={cardFlights}
            onCardMeasured={onCardMeasured}
            cardFlightMemory={cardFlightMemory}
            onCardArrived={handleFoundationArrival}
            disableInteractions={interactionsLocked}
            hideTopCard={hideFoundations && !celebrationActive}
            celebrationBindings={celebrationBindings}
            celebrationActive={celebrationActive}
            onLayout={createFoundationLayoutHandler(suit)}
          />
        ))}
      </XStack>

      <XStack flex={1} gap="$3" justify="flex-end" items="flex-end">
        <PileButton
          label={`${state.waste.length}`}
          onPress={handleWastePress}
          disabled={!state.waste.length || interactionsLocked}
          disablePress
        >
          {state.waste.length ? (
            <WasteFan
              cards={state.waste}
              metrics={cardMetrics}
              isSelected={wasteSelected}
              onPress={handleWastePress}
              onLongPress={onWasteHold}
              invalidWiggle={invalidWiggle}
              cardFlights={cardFlights}
              onCardMeasured={onCardMeasured}
              cardFlightMemory={cardFlightMemory}
              disabled={interactionsLocked}
            />
          ) : (
            <EmptySlot highlight={false} metrics={cardMetrics} />
          )}
        </PileButton>

        {!state.hasWon && (
          <PileButton label={`${state.stock.length}`} onPress={onDraw} disabled={stockDisabled}>
            {drawVariant === 'stock' ? (
              <StockStack
                cards={state.stock}
                metrics={cardMetrics}
                invalidWiggle={invalidWiggle}
                cardFlights={cardFlights}
                onCardMeasured={onCardMeasured}
                cardFlightMemory={cardFlightMemory}
                label={state.stock.length ? drawLabel : undefined}
              />
            ) : (
              <CardBack
                label={state.stock.length ? drawLabel : undefined}
                metrics={cardMetrics}
                variant={drawVariant}
                icon={showRecycle ? <RefreshCcw color="#0f172a" size={18} /> : undefined}
              />
            )}
          </PileButton>
        )}
      </XStack>
    </XStack>
  )
}

export type TableauSectionProps = {
  state: GameState
  cardMetrics: CardMetrics
  dropHints: DropHints
  onAutoMove: (selection: Selection) => void
  onLongPress: (columnIndex: number, cardIndex: number) => void
  onColumnPress: (columnIndex: number) => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  interactionsLocked: boolean
}

export const TableauSection = ({
  state,
  cardMetrics,
  dropHints,
  onAutoMove,
  onLongPress,
  onColumnPress,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  interactionsLocked,
}: TableauSectionProps) => (
  <View style={styles.tableauRow}>
    {state.tableau.map((column, columnIndex) => (
      <TableauColumn
        key={`col-${columnIndex}`}
        column={column}
        columnIndex={columnIndex}
        state={state}
        cardMetrics={cardMetrics}
        isDroppable={dropHints.tableau[columnIndex]}
        onCardPress={(cardIndex) =>
          onAutoMove({ source: 'tableau', columnIndex, cardIndex })
        }
        onCardLongPress={(cardIndex) => onLongPress(columnIndex, cardIndex)}
        onColumnPress={() => onColumnPress(columnIndex)}
        invalidWiggle={invalidWiggle}
        cardFlights={cardFlights}
        onCardMeasured={onCardMeasured}
        cardFlightMemory={cardFlightMemory}
        disableInteractions={interactionsLocked}
      />
    ))}
  </View>
)

export type TableauColumnProps = {
  column: Card[]
  columnIndex: number
  state: GameState
  cardMetrics: CardMetrics
  isDroppable: boolean
  onCardPress: (cardIndex: number) => void
  onCardLongPress: (cardIndex: number) => void
  onColumnPress: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  disableInteractions: boolean
}

export const TableauColumn = ({
  column,
  columnIndex,
  state,
  cardMetrics,
  isDroppable,
  onCardPress,
  onCardLongPress,
  onColumnPress,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  disableInteractions,
}: TableauColumnProps) => {
  const columnHeight = column.length
    ? cardMetrics.height + (column.length - 1) * cardMetrics.stackOffset
    : cardMetrics.height
  const columnSelected =
    state.selected?.source === 'tableau' && state.selected.columnIndex === columnIndex
  const selectedCardIndex =
    columnSelected && state.selected?.source === 'tableau' ? state.selected.cardIndex : null

  return (
    <Pressable
      style={[
        styles.column,
        {
          width: cardMetrics.width,
          height: columnHeight,
          borderColor:
            column.length === 0
              ? 'transparent'
              : isDroppable
                ? COLOR_DROP_BORDER
                : COLOR_COLUMN_BORDER,
          backgroundColor: columnSelected ? COLOR_COLUMN_SELECTED : 'transparent',
          marginHorizontal: COLUMN_MARGIN,
        },
      ]}
      onPress={disableInteractions ? undefined : onColumnPress}
      disabled={disableInteractions}
    >
      {column.length === 0 && (
        <EmptySlot highlight={isDroppable} metrics={cardMetrics} />
      )}
      {column.map((card, cardIndex) => (
        <CardView
          key={card.id}
          card={card}
          metrics={cardMetrics}
          offsetTop={cardIndex * cardMetrics.stackOffset}
          isSelected={
            columnSelected &&
            selectedCardIndex !== null &&
            selectedCardIndex <= cardIndex &&
            card.faceUp
          }
          onPress={
            disableInteractions || !card.faceUp
              ? undefined
              : () => onCardPress(cardIndex)
          }
          onLongPress={
            disableInteractions || !card.faceUp
              ? undefined
              : () => onCardLongPress(cardIndex)
          }
          invalidWiggle={invalidWiggle}
          cardFlights={cardFlights}
          onCardMeasured={onCardMeasured}
          cardFlightMemory={cardFlightMemory}
        />
      ))}
    </Pressable>
  )
}

export type CardViewProps = {
  card: Card
  metrics: CardMetrics
  offsetTop?: number
  offsetLeft?: number
  isSelected?: boolean
  onPress?: () => void
  onLongPress?: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured?: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory?: Record<string, CardFlightSnapshot>
  celebrationBindings?: CelebrationBindings
}

export const CardView = ({
  card,
  metrics,
  offsetTop,
  offsetLeft,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  celebrationBindings,
}: CardViewProps) => {
  const {
    cardFlights: cardFlightsEnabled,
    invalidMoveWiggle: invalidMoveEnabled,
    cardFlip: cardFlipEnabled,
  } = useAnimationToggles()
  const [renderFaceUp, setRenderFaceUp] = useState(card.faceUp)
  const shouldFloat = typeof offsetTop === 'number' || typeof offsetLeft === 'number'
  const positionStyle = shouldFloat
    ? {
        position: 'absolute' as const,
        top: typeof offsetTop === 'number' ? offsetTop : 0,
        left: typeof offsetLeft === 'number' ? offsetLeft : 0,
      }
    : undefined
  const cardRef = useAnimatedRef<View>()
  const wiggle = useSharedValue(0)
  const flightX = useSharedValue(0)
  const flightY = useSharedValue(0)
  const flightZ = useSharedValue(0)
  const previousSnapshot = cardFlightMemory?.[card.id]
  const hasPreviousSnapshot = cardFlightsEnabled && !!previousSnapshot
  const flightOpacity = useSharedValue(hasPreviousSnapshot ? 0 : 1)
  const flipScale = useSharedValue(1)
  const lastTriggerRef = useRef(invalidWiggle.key)
  const shouldAnimateInvalid = invalidWiggle.lookup.has(card.id)
  const baseZIndex = shouldFloat ? 2 : 0
  const motionStyle = useAnimatedStyle<ViewStyle>(() => {
    let translateX = wiggle.value + flightX.value
    let translateY = flightY.value
    let rotationDeg = 0
    let scale = 1
    let opacity = flightOpacity.value
    let zIndex = flightZ.value > 0 ? flightZ.value : baseZIndex

    const celebrationActiveValue = celebrationBindings?.active.value ?? 0
    if (celebrationActiveValue > 0 && celebrationBindings) {
      const assignment = celebrationBindings.assignments.value?.[card.id]
      if (assignment) {
        const frame = computeCelebrationFrame({
          modeId: celebrationBindings.mode.value,
          assignment,
          metrics,
          board: celebrationBindings.board.value,
          totalCards: celebrationBindings.total.value,
          progress: celebrationBindings.progress.value,
        })

        if (frame) {
          const {
            pathX,
            pathY,
            rotation,
            targetScale,
            targetOpacity,
            launchEased,
            rawProgress,
            relativeIndex,
            stackFactor,
          } = frame
          const seed = assignment.randomSeed
          const wobblePhase =
            rawProgress * TAU * CELEBRATION_WOBBLE_FREQUENCY + seed * TAU
          const wobbleEnvelope = 0.15 + 0.85 * Math.pow(Math.sin(wobblePhase), 2)
          const wobbleX =
            Math.sin(wobblePhase * 1.25 + relativeIndex * 0.4) *
            metrics.width *
            0.1 *
            wobbleEnvelope
          const wobbleY =
            Math.cos(wobblePhase * 0.95 + stackFactor * 4) *
            metrics.height *
            0.11 *
            wobbleEnvelope

          const finalX =
            assignment.baseX * (1 - launchEased) + pathX * launchEased + wobbleX
          const finalY =
            assignment.baseY * (1 - launchEased) + pathY * launchEased + wobbleY
          const finalScale = 1 + (targetScale - 1) * launchEased
          const finalRotation = rotation * launchEased
          const clampedOpacity = targetOpacity < 0 ? 0 : targetOpacity
          const finalOpacity = Math.min(
            1,
            clampedOpacity * (0.5 + 0.5 * launchEased),
          )

          translateX = wiggle.value + flightX.value + (finalX - assignment.baseX)
          translateY = flightY.value + (finalY - assignment.baseY)
          scale = finalScale
          rotationDeg = finalRotation
          opacity = Math.min(opacity, finalOpacity)
          zIndex = Math.max(zIndex, 4000 + assignment.index)
        }
      }
    }

    const transforms: Array<
      | { translateX: number }
      | { translateY: number }
      | { rotate: string }
      | { scale: number }
    > = [
      { translateX },
      { translateY },
    ]

    if (scale !== 1) {
      transforms.push({ scale })
    }
    if (rotationDeg !== 0) {
      transforms.push({ rotate: `${rotationDeg}deg` })
    }

    return {
      transform: transforms,
      opacity,
      zIndex,
    }
  })
  const flipStyle = useAnimatedStyle(() => {
    if (!cardFlipEnabled) {
      return {}
    }
    return {
      transform: [{ scaleX: flipScale.value }],
    }
  })
  const handleCardLayout = useCallback(() => {
    const cardId = card.id
    const snapshotBeforeLayout = cardFlightMemory?.[cardId]
    if (cardFlightsEnabled && previousSnapshot) {
      flightOpacity.value = 0
    }
    runOnUI((prevSnapshot: CardFlightSnapshot | null) => {
      'worklet'
      const layout = measure(cardRef)
      if (!layout) {
        return
      }
      if (!cardFlightsEnabled) {
        const snapshot: CardFlightSnapshot = {
          pageX: layout.pageX,
          pageY: layout.pageY,
          width: layout.width,
          height: layout.height,
        }
        cardFlights.value = {
          ...cardFlights.value,
          [cardId]: snapshot,
        }
        flightX.value = 0
        flightY.value = 0
        flightZ.value = 0
        flightOpacity.value = 1
        if (onCardMeasured) {
          runOnJS(onCardMeasured)(cardId, snapshot)
        }
        return
      }
      const existingSnapshot = cardFlights.value[cardId] as CardFlightSnapshot | undefined
      const previous = prevSnapshot ?? existingSnapshot
      if (previous) {
        const deltaX = previous.pageX - layout.pageX
        const deltaY = previous.pageY - layout.pageY
        if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
          flightX.value = deltaX
          flightY.value = deltaY
          flightZ.value = 1000
          flightX.value = withTiming(0, CARD_FLIGHT_TIMING, (finished) => {
            if (finished) {
              flightZ.value = 0
            }
          })
          flightY.value = withTiming(0, CARD_FLIGHT_TIMING)
        }
      }
      const nextSnapshot: CardFlightSnapshot = {
        pageX: layout.pageX,
        pageY: layout.pageY,
        width: layout.width,
        height: layout.height,
      }
      cardFlights.value = {
        ...cardFlights.value,
        [cardId]: nextSnapshot,
      }
      flightOpacity.value = 1
      if (onCardMeasured) {
        runOnJS(onCardMeasured)(cardId, nextSnapshot)
      }
    })(previousSnapshot ?? snapshotBeforeLayout ?? null)
  }, [cardFlightMemory, cardFlights, card.id, cardRef, flightOpacity, flightX, flightY, flightZ, onCardMeasured, previousSnapshot])

  useEffect(() => {
    if (!invalidMoveEnabled) {
      cancelAnimation(wiggle)
      wiggle.value = 0
      return
    }
    if (!shouldAnimateInvalid) {
      return
    }
    if (lastTriggerRef.current === invalidWiggle.key) {
      return
    }
    lastTriggerRef.current = invalidWiggle.key
    cancelAnimation(wiggle)
    wiggle.value = 0
    wiggle.value = withSequence(
      withTiming(-WIGGLE_OFFSET_PX, WIGGLE_TIMING_CONFIG),
      withTiming(WIGGLE_OFFSET_PX, WIGGLE_TIMING_CONFIG),
      withTiming(0, WIGGLE_TIMING_CONFIG),
    )
  }, [invalidMoveEnabled, invalidWiggle.key, shouldAnimateInvalid, wiggle])

  useEffect(() => {
    if (!cardFlipEnabled) {
      setRenderFaceUp(card.faceUp)
      flipScale.value = 1
      return
    }
    if (card.faceUp === renderFaceUp) {
      return
    }
    flipScale.value = withTiming(0, CARD_FLIP_HALF_TIMING, (finished) => {
      if (!finished) {
        return
      }
      runOnJS(setRenderFaceUp)(card.faceUp)
      flipScale.value = withTiming(1, CARD_FLIP_HALF_TIMING)
    })
  }, [card.faceUp, cardFlipEnabled, flipScale, renderFaceUp])

  const containerStaticStyle = {
    width: metrics.width,
    height: metrics.height,
  }

  const borderColor =
    renderFaceUp && isSelected ? COLOR_SELECTED_BORDER : COLOR_CARD_BORDER

  const frontContent = (
    <Pressable
      style={[
        styles.cardBase,
        styles.faceUp,
        {
          width: '100%',
          height: '100%',
          borderRadius: metrics.radius,
          borderColor,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
    >
      <Text
        style={[styles.cardCornerRank, { color: SUIT_COLORS[card.suit] }]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {rankToLabel(card.rank)}
      </Text>
      <Text
        style={[styles.cardCornerSuit, { color: SUIT_COLORS[card.suit] }]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {SUIT_SYMBOLS[card.suit]}
      </Text>
      <Text
        style={[styles.cardSymbol, { color: SUIT_COLORS[card.suit] }]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {SUIT_SYMBOLS[card.suit]}
      </Text>
    </Pressable>
  )

  const backContent = (
    <View
      style={[
        styles.cardBase,
        styles.faceDown,
        {
          width: '100%',
          height: '100%',
          borderRadius: metrics.radius,
        },
      ]}
    />
  )

  return (
    <AnimatedView
      ref={cardRef}
      onLayout={handleCardLayout}
      style={[positionStyle, motionStyle, containerStaticStyle]}
    >
      <Animated.View style={[styles.cardFlipWrapper, flipStyle]}>
        {renderFaceUp ? frontContent : backContent}
      </Animated.View>
    </AnimatedView>
  )
}

export const CelebrationTouchBlocker = ({ onAbort }: { onAbort: () => void }) => (
  <Pressable style={styles.celebrationOverlay} onPress={onAbort} />
)

export const EmptySlot = ({
  label,
  highlight,
  metrics,
}: {
  label?: string
  highlight: boolean
  metrics: CardMetrics
}) => (
  <View
    style={[
      styles.emptySlot,
      {
        width: metrics.width,
        height: metrics.height,
        borderRadius: metrics.radius,
        borderColor: highlight ? COLOR_DROP_BORDER : COLOR_COLUMN_BORDER,
      },
    ]}
  >
    {!!label && <Text style={styles.emptyLabel}>{label}</Text>}
  </View>
)

export const rankToLabel = (rank: Rank): string => FACE_CARD_LABELS[rank] ?? String(rank)

export type CardBackProps = {
  label?: string
  metrics: CardMetrics
  variant: 'stock' | 'recycle' | 'empty'
  icon?: React.ReactNode
}

export const CardBack = ({ label, metrics, variant, icon }: CardBackProps) => {
  const baseStyle =
    variant === 'stock'
      ? styles.cardBack
      : [
          styles.cardBackOutline,
          variant === 'recycle' ? styles.cardBackRecycle : styles.cardBackEmpty,
        ]

  return (
    <View
      style={[
        baseStyle,
        {
          width: metrics.width,
          height: metrics.height,
          borderRadius: metrics.radius,
        },
      ]}
    >
      {icon ? icon : label ? <Text style={styles.cardBackText}>{label}</Text> : null}
    </View>
  )
}

export type StockStackProps = {
  cards: Card[]
  metrics: CardMetrics
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  label?: string
}

export const StockStack = ({
  cards,
  metrics,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  label,
}: StockStackProps) => {
  if (!cards.length) {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.stockContainer,
          {
            width: metrics.width,
            height: metrics.height,
            borderRadius: metrics.radius,
          },
        ]}
      />
    )
  }

  return (
    <View
      pointerEvents="none"
      style={[
        styles.stockContainer,
        {
          width: metrics.width,
          height: metrics.height,
          borderRadius: metrics.radius,
        },
      ]}
    >
      {cards.map((card, index) => {
        const isTopCard = index === cards.length - 1
        return (
          <View
            key={card.id}
            pointerEvents="none"
            style={[
              styles.stockCardWrapper,
              { zIndex: index + 1 },
              !isTopCard ? styles.hiddenCard : undefined,
            ]}
          >
            <CardView
              card={card}
              metrics={metrics}
              invalidWiggle={isTopCard ? invalidWiggle : EMPTY_INVALID_WIGGLE}
              cardFlights={cardFlights}
              onCardMeasured={onCardMeasured}
              cardFlightMemory={cardFlightMemory}
            />
          </View>
        )
      })}
      {label ? (
        <Text pointerEvents="none" style={[styles.cardBackText, styles.stockLabel]}>
          {label}
        </Text>
      ) : null}
    </View>
  )
}

export type WasteFanProps = {
  cards: Card[]
  metrics: CardMetrics
  isSelected: boolean
  onPress: () => void
  onLongPress: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  disabled?: boolean
}

export const WasteFan = ({
  cards,
  metrics,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  disabled = false,
}: WasteFanProps) => {
  const visible = cards.slice(-3)
  const overlap = Math.min(metrics.width * WASTE_FAN_OVERLAP_RATIO, WASTE_FAN_MAX_OFFSET)
  const width = metrics.width + overlap * (visible.length - 1)
  return (
    <View style={{ width, height: metrics.height, position: 'relative' }}>
      {visible.map((card, index) => {
        const isTop = index === visible.length - 1
        const enableInteractions = isTop && !disabled
        return (
          <WasteFanCard
            key={card.id}
            card={card}
            metrics={metrics}
            targetOffset={index * overlap}
            isSelected={enableInteractions && isSelected}
            onPress={enableInteractions ? onPress : undefined}
            onLongPress={enableInteractions ? onLongPress : undefined}
            invalidWiggle={invalidWiggle}
            zIndex={index}
            cardFlights={cardFlights}
            onCardMeasured={onCardMeasured}
            cardFlightMemory={cardFlightMemory}
          />
        )
      })}
    </View>
  )
}

export type WasteFanCardProps = {
  card: Card
  metrics: CardMetrics
  targetOffset: number
  isSelected: boolean
  onPress?: () => void
  onLongPress?: () => void
  invalidWiggle: InvalidWiggleConfig
  zIndex: number
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
}

export const WasteFanCard = ({
  card,
  metrics,
  targetOffset,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  zIndex,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
}: WasteFanCardProps) => {
  const { wasteFan: wasteFanEnabled } = useAnimationToggles()
  const translateX = useSharedValue(targetOffset)
  const positionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  useEffect(() => {
    cancelAnimation(translateX)
    if (!wasteFanEnabled) {
      translateX.value = targetOffset
      return
    }
    translateX.value = withTiming(targetOffset, WASTE_TIMING_CONFIG, () => {
      translateX.value = targetOffset
    })
  }, [targetOffset, translateX, wasteFanEnabled])

  return (
    <AnimatedView
      pointerEvents="box-none"
      style={[
        styles.wasteFanCardWrapper,
        {
          width: metrics.width,
          height: metrics.height,
          zIndex,
        },
        positionStyle,
      ]}
    >
      <CardView
        card={card}
        metrics={metrics}
        isSelected={isSelected}
        onPress={onPress}
        onLongPress={onLongPress}
        invalidWiggle={invalidWiggle}
        cardFlights={cardFlights}
        onCardMeasured={onCardMeasured}
        cardFlightMemory={cardFlightMemory}
      />
    </AnimatedView>
  )
}

export type PileButtonProps = {
  label: string
  children: React.ReactNode
  onPress: () => void
  disabled?: boolean
  disablePress?: boolean
}

export const PileButton = ({ label, children, onPress, disabled, disablePress }: PileButtonProps) => {
  const commonStyle = [styles.pilePressable, disabled && styles.disabledPressable]

  return (
    <YStack gap="$1" items="center">
      {disablePress ? (
        <View style={commonStyle}>{children}</View>
      ) : (
        <Pressable onPress={onPress} disabled={disabled} style={commonStyle}>
          {children}
        </Pressable>
      )}
      <Text color="$color10" fontSize={12}>
        {label}
      </Text>
    </YStack>
  )
}

export type FoundationPileProps = {
  suit: Suit
  cards: Card[]
  cardMetrics: CardMetrics
  isDroppable: boolean
  isSelected: boolean
  onPress: () => void
  onLongPress: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  onCardArrived?: (cardId: string | null | undefined) => void
  disableInteractions?: boolean
  hideTopCard?: boolean
  onLayout?: (layout: LayoutRectangle) => void
  celebrationBindings?: CelebrationBindings
  celebrationActive?: boolean
}

export const FoundationPile = ({
  suit,
  cards,
  cardMetrics,
  isDroppable,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  onCardArrived,
  disableInteractions = false,
  hideTopCard = false,
  onLayout,
  celebrationBindings,
  celebrationActive = false,
}: FoundationPileProps) => {
  const { foundationGlow: foundationGlowEnabled } = useAnimationToggles()
  const handleCardArrived = onCardArrived ?? (() => {})
  const topCard = cards[cards.length - 1]
  const hasCards = cards.length > 0
  const borderColor = isDroppable
    ? COLOR_DROP_BORDER
    : isSelected
      ? COLOR_SELECTED_BORDER
      : hasCards
        ? COLOR_FOUNDATION_BORDER
        : COLOR_COLUMN_BORDER
  const glowOpacity = useSharedValue(0)
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))
  const lastGlowCardRef = useRef<string | null>(null)
  const previousCountRef = useRef(cards.length)
  const glowWidth = cardMetrics.width + FOUNDATION_GLOW_OUTSET * 2
  const glowHeight = cardMetrics.height + FOUNDATION_GLOW_OUTSET * 2
  useEffect(() => {
    const previousCount = previousCountRef.current
    previousCountRef.current = cards.length
    const removedCard = cards.length < previousCount
    const previousId = lastGlowCardRef.current
    const currentId = topCard?.id ?? null

    if (!foundationGlowEnabled) {
      glowOpacity.value = 0
      if (!removedCard && currentId && currentId !== previousId) {
        handleCardArrived(currentId)
      }
      lastGlowCardRef.current = currentId
      return
    }
    if (!currentId) {
      lastGlowCardRef.current = null
      glowOpacity.value = 0
      return
    }
    if (removedCard) {
      lastGlowCardRef.current = currentId
      glowOpacity.value = 0
      return
    }
    if (lastGlowCardRef.current === currentId) {
      return
    }
    lastGlowCardRef.current = currentId
    handleCardArrived(currentId)
    cancelAnimation(glowOpacity)
    glowOpacity.value = 0
    glowOpacity.value = withSequence(
      withTiming(FOUNDATION_GLOW_MAX_OPACITY, FOUNDATION_GLOW_IN_TIMING),
      withTiming(0, FOUNDATION_GLOW_OUT_TIMING),
    )
  }, [cards.length, foundationGlowEnabled, glowOpacity, handleCardArrived, topCard?.id])

  return (
    <Pressable
      onPress={disableInteractions ? undefined : onPress}
      onLongPress={disableInteractions ? undefined : onLongPress}
      disabled={disableInteractions}
      onLayout={(event) => onLayout?.(event.nativeEvent.layout)}
      style={[
        styles.foundation,
        {
          width: cardMetrics.width,
          height: cardMetrics.height,
          borderRadius: cardMetrics.radius,
          borderColor,
        },
      ]}
    >
      <AnimatedView
        pointerEvents="none"
        style={[
          styles.foundationGlow,
          {
            width: glowWidth,
            height: glowHeight,
            borderRadius: cardMetrics.radius + FOUNDATION_GLOW_OUTSET,
            top: -FOUNDATION_GLOW_OUTSET,
            left: -FOUNDATION_GLOW_OUTSET,
            backgroundColor: FOUNDATION_GLOW_COLOR,
          },
          glowStyle,
        ]}
      />
      {topCard ? (
        cards.map((card, index) => {
          const isTopCard = index === cards.length - 1
          return (
            <AnimatedView
              // PBI 14-1: keep every foundation card mounted so flights persist through rapid sequences.
              key={card.id}
              pointerEvents="none"
              style={[
                styles.foundationCard,
                !isTopCard && !celebrationActive ? styles.foundationStackedCard : undefined,
                hideTopCard && isTopCard ? styles.hiddenCard : undefined,
                { zIndex: index + 1 },
              ]}
            >
              <CardView
                card={card}
                metrics={cardMetrics}
                invalidWiggle={isTopCard ? invalidWiggle : EMPTY_INVALID_WIGGLE}
                cardFlights={cardFlights}
                onCardMeasured={onCardMeasured}
                cardFlightMemory={cardFlightMemory}
                onPress={disableInteractions ? undefined : onPress}
                onLongPress={disableInteractions ? undefined : onLongPress}
                celebrationBindings={celebrationBindings}
              />
            </AnimatedView>
          )
        })
      ) : (
        <Text
          style={[
            styles.foundationSymbol,
            { color: hasCards ? SUIT_COLORS[suit] : COLOR_TEXT_MUTED },
          ]}
        >
          {SUIT_SYMBOLS[suit]}
        </Text>
      )}
    </Pressable>
  )
}


const styles = StyleSheet.create({
  tableauRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexWrap: 'nowrap',
    paddingHorizontal: COLUMN_MARGIN,
  },
  column: {
    overflow: 'visible',
    paddingBottom: 8,
  },
  cardBase: {
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 6,
    justifyContent: 'center',
    backgroundColor: COLOR_CARD_FACE,
    overflow: 'hidden',
  },
  cardFlipWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceDown: {
    backgroundColor: COLOR_CARD_BACK,
    borderWidth: 1,
    borderColor: COLOR_CARD_BORDER,
  },
  faceUp: {
    borderWidth: 1,
  },
  cardCornerRank: {
    position: 'absolute',
    top: -2,
    left: 3,
    fontWeight: '700',
    fontSize: 16,
  },
  cardCornerSuit: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 12,
  },
  cardSymbol: {
    textAlignVertical: 'center',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '600',
    marginTop: 16,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'auto',
  },
  emptySlot: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: {
    color: COLOR_FELT_TEXT_SECONDARY,
  },
  cardBack: {
    backgroundColor: COLOR_CARD_BACK,
    borderWidth: 1,
    borderColor: COLOR_CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackOutline: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cardBackRecycle: {
    borderColor: COLOR_FELT_TEXT_SECONDARY,
  },
  cardBackEmpty: {
    borderColor: COLOR_COLUMN_BORDER,
  },
  cardBackText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  stockContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockCardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stockLabel: {
    position: 'relative',
    zIndex: 5000,
    textAlign: 'center',
  },
  pilePressable: {
    opacity: 1,
  },
  disabledPressable: {
    opacity: 0.4,
  },
  foundation: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  foundationGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0,
    shadowColor: FOUNDATION_GLOW_COLOR,
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  foundationCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  foundationStackedCard: {
    opacity: 0,
  },
  foundationSymbol: {
    fontSize: 28,
    color: COLOR_FELT_TEXT_PRIMARY,
  },
  wasteFanCardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  hiddenCard: {
    opacity: 0,
  },
})

