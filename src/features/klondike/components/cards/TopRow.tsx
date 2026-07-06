import React, { useCallback, useEffect, useRef, type PropsWithChildren } from 'react'
import { Animated as NativeAnimated, Easing as NativeEasing } from 'react-native'
import type { LayoutChangeEvent, LayoutRectangle } from 'react-native'
import { View, XStack } from 'tamagui'

import {
  FOUNDATION_SUIT_ORDER,
  TABLEAU_COLUMN_COUNT,
  type Foundations,
  type Selection,
  type Suit,
} from '../../../../solitaire/klondike'
import type { CardMetrics, DropHints } from '../../types'
import {
  STOCK_EMPTY_LABEL,
  STOCK_RECYCLE_LABEL,
  STOCK_RECYCLE_TEST_ID,
} from './accessibility'
import { EmptySlot, CardBack } from './CardVisual'
import { PileButton } from './PileButton'
import { FoundationPile } from './FoundationPile'
import { styles as cardStyles } from './styles'
import {
  BOARD_COLUMN_GAP,
  BOARD_COLUMN_MARGIN,
  WIN_CLEANUP_OUTLINE_FADE_DURATION_MS,
} from '../../constants'

const WinCleanupPile = ({
  hidden,
  children,
}: PropsWithChildren<{
  hidden: boolean
}>) => {
  const opacity = useRef(new NativeAnimated.Value(hidden ? 0 : 1)).current

  useEffect(() => {
    NativeAnimated.timing(opacity, {
      toValue: hidden ? 0 : 1,
      duration: WIN_CLEANUP_OUTLINE_FADE_DURATION_MS,
      easing: NativeEasing.bezier(0.2, 0, 0.2, 1),
      useNativeDriver: true,
    }).start()
  }, [hidden, opacity])

  // Opacity keeps the pile and slot mounted so win cleanup cannot disturb board geometry or measurements.
  return (
    <NativeAnimated.View pointerEvents={hidden ? 'none' : 'auto'} style={{ opacity }}>
      {children}
    </NativeAnimated.View>
  )
}

export type TopRowProps = {
  // Perf (A2): narrow state slices instead of the full GameState so React.memo can
  // skip re-renders when the relevant pieces kept identity (e.g. TIMER_TICK).
  stockCount: number
  wasteCount: number
  foundations: Foundations
  selected: Selection | null
  hasWon: boolean
  drawLabel: string
  onDraw: () => void
  onFoundationPress: (suit: Suit) => void
  cardMetrics: CardMetrics
  dropHints: DropHints
  interactionsLocked: boolean
  onTopRowLayout?: (layout: LayoutRectangle) => void
  onFoundationLayout?: (suit: Suit, layout: LayoutRectangle) => void
  onStockLayout?: (layout: LayoutRectangle) => void
  onWasteLayout?: (layout: LayoutRectangle) => void
  celebrationActive?: boolean
  celebrationPending?: boolean
}

export const TopRow = React.memo(
  ({
    stockCount,
    wasteCount,
    foundations,
    selected,
    hasWon,
    drawLabel,
    onDraw,
    onFoundationPress,
    cardMetrics,
    dropHints,
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

    const stockDisabled = (!stockCount && !wasteCount) || interactionsLocked
    const showRecycle = !stockCount && wasteCount > 0
    const drawVariant: 'stock' | 'recycle' | 'empty' = showRecycle
      ? 'recycle'
      : stockCount
        ? 'stock'
        : 'empty'
    // Task 28-2: Keep the board stable until the final winning card finishes settling.
    const showWinCleanup = hasWon && !celebrationPending

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
                  cards={foundations[suit]}
                  cardMetrics={cardMetrics}
                  isDroppable={dropHints.foundations[suit]}
                  isSelected={selected?.source === 'foundation' && selected.suit === suit}
                  onPress={() => onFoundationPress(suit)}
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
                    label={`${wasteCount}`}
                    disabled={!wasteCount || interactionsLocked}
                    disablePress
                    width={cardMetrics.width}
                  >
                    <View width={cardMetrics.width} items="flex-end" overflow="visible">
                      {wasteCount ? (
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
                    label={`${stockCount}`}
                    onPress={onDraw}
                    disabled={stockDisabled}
                    // Absolute-card mode gives the visible stock card its own press target.
                    // Keep recycle on this structural slot, but never duplicate stock draw
                    // underneath the absolute stock card during rapid taps.
                    disablePress={drawVariant === 'stock'}
                    width={cardMetrics.width}
                    // The 'stock' variant is disablePress (absolute stock card owns the
                    // a11y node); only recycle/empty states are labeled here.
                    accessibilityLabel={
                      drawVariant === 'recycle'
                        ? STOCK_RECYCLE_LABEL
                        : drawVariant === 'empty'
                          ? STOCK_EMPTY_LABEL
                          : undefined
                    }
                    testID={STOCK_RECYCLE_TEST_ID}
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
                        label={stockCount ? drawLabel : undefined}
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
)

TopRow.displayName = 'TopRow'
