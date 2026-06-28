import React, { useCallback, type PropsWithChildren } from 'react'
import type { LayoutChangeEvent, LayoutRectangle } from 'react-native'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { View, XStack } from 'tamagui'

import {
  FOUNDATION_SUIT_ORDER,
  TABLEAU_COLUMN_COUNT,
  type GameState,
  type Selection,
  type Suit,
} from '../../../../solitaire/klondike'
import type { CardMetrics, DropHints } from '../../types'
import { EmptySlot, CardBack } from './CardView'
import { PileButton } from './PileButton'
import { FoundationPile } from './FoundationPile'
import { styles as cardStyles } from './styles'
import {
  BOARD_COLUMN_GAP,
  BOARD_COLUMN_MARGIN,
  WIN_CLEANUP_OUTLINE_FADE_TIMING,
} from '../../constants'

const WinCleanupPile = ({
  hidden,
  children,
}: PropsWithChildren<{
  hidden: boolean
}>) => {
  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(hidden ? 0 : 1, WIN_CLEANUP_OUTLINE_FADE_TIMING),
    }),
    [hidden]
  )

  // Opacity keeps the pile and slot mounted so win cleanup cannot disturb board geometry or measurements.
  return (
    <Animated.View style={[animatedStyle, { pointerEvents: hidden ? 'none' : 'auto' }]}>
      {children}
    </Animated.View>
  )
}

export type TopRowProps = {
  state: GameState
  drawLabel: string
  onDraw: () => void
  onWasteTap: () => void
  onFoundationPress: (suit: Suit) => void
  cardMetrics: CardMetrics
  dropHints: DropHints
  notifyInvalidMove: (options?: { selection?: Selection | null }) => void
  onFoundationArrival?: (cardId: string | null | undefined) => void
  interactionsLocked: boolean
  onTopRowLayout?: (layout: LayoutRectangle) => void
  onFoundationLayout?: (suit: Suit, layout: LayoutRectangle) => void
  onStockLayout?: (layout: LayoutRectangle) => void
  onWasteLayout?: (layout: LayoutRectangle) => void
  celebrationActive?: boolean
  celebrationPending?: boolean
}

export const TopRow = ({
  state,
  drawLabel,
  onDraw,
  onWasteTap,
  onFoundationPress,
  cardMetrics,
  dropHints,
  notifyInvalidMove,
  onFoundationArrival,
  interactionsLocked,
  onTopRowLayout,
  onFoundationLayout,
  onStockLayout,
  onWasteLayout,
  celebrationActive = false,
  celebrationPending = false,
}: TopRowProps) => {
  const handleRowLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onTopRowLayout?.(event.nativeEvent.layout)
    },
    [onTopRowLayout]
  )

  const createFoundationLayoutHandler = useCallback(
    (suit: Suit) => (layout: LayoutRectangle) => {
      onFoundationLayout?.(suit, layout)
    },
    [onFoundationLayout]
  )

  const stockDisabled = (!state.stock.length && !state.waste.length) || interactionsLocked
  const showRecycle = !state.stock.length && state.waste.length > 0
  const drawVariant: 'stock' | 'recycle' | 'empty' = showRecycle
    ? 'recycle'
    : state.stock.length
      ? 'stock'
      : 'empty'
  // Task 28-2: Keep the board stable until the final winning card finishes settling.
  const showWinCleanup = state.hasWon && !celebrationPending

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

  const wasteColumnIndex = TABLEAU_COLUMN_COUNT - 2
  const stockColumnIndex = TABLEAU_COLUMN_COUNT - 1

  return (
    <XStack
      width="100%"
      items="flex-start"
      justify="flex-start"
      flexWrap="nowrap"
      onLayout={handleRowLayout}
    >
      {Array.from({ length: TABLEAU_COLUMN_COUNT }, (_, columnIndex) => {
        const isFirstColumn = columnIndex === 0
        const isLastColumn = columnIndex === TABLEAU_COLUMN_COUNT - 1
        const slotStyle = {
          width: cardMetrics.width,
          // Task 1-8: Match tableau column spacing; edge gutters should equal a full column gap.
          marginLeft: isFirstColumn ? BOARD_COLUMN_GAP : BOARD_COLUMN_MARGIN,
          marginRight: isLastColumn ? BOARD_COLUMN_GAP : BOARD_COLUMN_MARGIN,
          overflow: 'visible' as const,
        }

        if (columnIndex < FOUNDATION_SUIT_ORDER.length) {
          const suit = FOUNDATION_SUIT_ORDER[columnIndex] as Suit
          const handleFoundationSlotLayout = createFoundationLayoutHandler(suit)
          return (
            <View
              key={`foundation-${suit}`}
              style={slotStyle}
              onLayout={(event) => handleFoundationSlotLayout(event.nativeEvent.layout)}
            >
              <FoundationPile
                suit={suit}
                cards={state.foundations[suit]}
                cardMetrics={cardMetrics}
                isDroppable={dropHints.foundations[suit]}
                isSelected={
                  state.selected?.source === 'foundation' && state.selected.suit === suit
                }
                onPress={() => onFoundationPress(suit)}
                onCardArrived={onFoundationArrival}
                disableInteractions={interactionsLocked}
                celebrationActive={celebrationActive}
              />
            </View>
          )
        }

        if (columnIndex === wasteColumnIndex) {
          return (
            <View
              key="waste"
              style={slotStyle}
              onLayout={(event) => onWasteLayout?.(event.nativeEvent.layout)}
            >
              <WinCleanupPile hidden={showWinCleanup}>
                <PileButton
                  label={`${state.waste.length}`}
                  onPress={handleWastePress}
                  disabled={!state.waste.length || interactionsLocked}
                  disablePress
                  width={cardMetrics.width}
                >
                  <View width={cardMetrics.width} items="flex-end" overflow="visible">
                    {state.waste.length ? (
                      <View
                        style={{ width: cardMetrics.width, height: cardMetrics.height }}
                      />
                    ) : (
                      <EmptySlot highlight={false} metrics={cardMetrics} />
                    )}
                  </View>
                </PileButton>
              </WinCleanupPile>
            </View>
          )
        }

        if (columnIndex === stockColumnIndex) {
          return (
            <View
              key="stock"
              style={slotStyle}
              onLayout={(event) => onStockLayout?.(event.nativeEvent.layout)}
            >
              <WinCleanupPile hidden={showWinCleanup}>
                <PileButton
                  label={`${state.stock.length}`}
                  onPress={onDraw}
                  disabled={stockDisabled}
                  // Absolute-card mode gives the visible stock card its own press target.
                  // Keep recycle on this structural slot, but never duplicate stock draw
                  // underneath the absolute stock card during rapid taps.
                  disablePress={drawVariant === 'stock'}
                  width={cardMetrics.width}
                >
                  {drawVariant === 'stock' ? (
                    <View
                      pointerEvents="none"
                      style={[
                        cardStyles.stockContainer,
                        {
                          width: cardMetrics.width,
                          height: cardMetrics.height,
                          borderRadius: cardMetrics.radius,
                        },
                      ]}
                    />
                  ) : (
                    <CardBack
                      label={state.stock.length ? drawLabel : undefined}
                      metrics={cardMetrics}
                      variant={drawVariant}
                    />
                  )}
                </PileButton>
              </WinCleanupPile>
            </View>
          )
        }

        return <View key={`empty-${columnIndex}`} style={slotStyle} />
      })}
    </XStack>
  )
}
