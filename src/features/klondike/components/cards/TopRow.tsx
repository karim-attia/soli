import React, { useCallback } from 'react'
import { LayoutChangeEvent, LayoutRectangle } from 'react-native'
import { Stack, XStack } from 'tamagui'

import {
  FOUNDATION_SUIT_ORDER,
  TABLEAU_COLUMN_COUNT,
  type Card,
  type GameState,
  type Selection,
  type Suit,
} from '../../../../solitaire/klondike'
import type { CardFlightSnapshot } from '../../../../animation/flightController'
import type {
  CardFlightRegistry,
  CardMetrics,
  CelebrationBindings,
  DropHints,
  InvalidWiggleConfig,
} from '../../types'
import { styles } from './styles'
import { EmptySlot, CardBack } from './CardView'
import { PileButton } from './PileButton'
import { StockStack } from './StockStack'
import { WasteFan } from './WasteFan'
import { FoundationPile } from './FoundationPile'
import { BOARD_COLUMN_GAP, BOARD_COLUMN_MARGIN } from '../../constants'

export type TopRowProps = {
  state: GameState
  drawLabel: string
  onDraw: () => void
  onWasteTap: () => void
  onFoundationPress: (suit: Suit) => void
  cardMetrics: CardMetrics
  dropHints: DropHints
  notifyInvalidMove: (options?: { selection?: Selection | null }) => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  onFoundationArrival?: (cardId: string | null | undefined) => void
  interactionsLocked: boolean
  // requirement 20-6: When scrubbing, reduce board churn to avoid iOS gesture cancellation
  scrubbingActive: boolean
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
  onFoundationPress,
  cardMetrics,
  dropHints,
  notifyInvalidMove,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  onFoundationArrival,
  interactionsLocked,
  scrubbingActive,
  hideFoundations,
  onTopRowLayout,
  onFoundationLayout,
  celebrationBindings,
  celebrationActive = false,
}: TopRowProps) => {
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

  const stockDisabled = (!state.stock.length && !state.waste.length) || interactionsLocked
  const wasteSelected = state.selected?.source === 'waste'
  const showRecycle = !state.stock.length && state.waste.length > 0
  const drawVariant: 'stock' | 'recycle' | 'empty' = showRecycle
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
          return (
            <Stack key={`foundation-${suit}`} style={slotStyle}>
              <FoundationPile
                suit={suit}
                cards={state.foundations[suit]}
                cardMetrics={cardMetrics}
                isDroppable={dropHints.foundations[suit]}
                isSelected={state.selected?.source === 'foundation' && state.selected.suit === suit}
                onPress={() => onFoundationPress(suit)}
                invalidWiggle={invalidWiggle}
                cardFlights={cardFlights}
                layoutTrackingEnabled={!scrubbingActive}
                onCardMeasured={onCardMeasured}
                cardFlightMemory={cardFlightMemory}
                onCardArrived={onFoundationArrival}
                disableInteractions={interactionsLocked}
                hideTopCard={hideFoundations && !celebrationActive}
                celebrationBindings={celebrationBindings}
                celebrationActive={celebrationActive}
                onLayout={createFoundationLayoutHandler(suit)}
              />
            </Stack>
          )
        }

        if (columnIndex === wasteColumnIndex) {
          return (
            <Stack key="waste" style={slotStyle}>
              <PileButton
                label={`${state.waste.length}`}
                onPress={handleWastePress}
                disabled={!state.waste.length || interactionsLocked}
                disablePress
                width={cardMetrics.width}
              >
                <Stack width={cardMetrics.width} items="flex-end" overflow="visible">
                  {state.waste.length ? (
                    <WasteFan
                      cards={state.waste}
                      metrics={cardMetrics}
                      isSelected={wasteSelected}
                      onPress={handleWastePress}
                      invalidWiggle={invalidWiggle}
                      cardFlights={cardFlights}
                      layoutTrackingEnabled={!scrubbingActive}
                      onCardMeasured={onCardMeasured}
                      cardFlightMemory={cardFlightMemory}
                      disabled={interactionsLocked}
                    />
                  ) : (
                    <EmptySlot highlight={false} metrics={cardMetrics} />
                  )}
                </Stack>
              </PileButton>
            </Stack>
          )
        }

        if (columnIndex === stockColumnIndex) {
          return (
            <Stack key="stock" style={slotStyle}>
              {!state.hasWon && (
                <PileButton
                  label={`${state.stock.length}`}
                  onPress={onDraw}
                  disabled={stockDisabled}
                  width={cardMetrics.width}
                >
                  {drawVariant === 'stock' ? (
                    <StockStack
                      cards={state.stock}
                      metrics={cardMetrics}
                      invalidWiggle={invalidWiggle}
                      cardFlights={cardFlights}
                      layoutTrackingEnabled={!scrubbingActive}
                      onCardMeasured={onCardMeasured}
                      cardFlightMemory={cardFlightMemory}
                      label={state.stock.length ? drawLabel : undefined}
                    />
                  ) : (
                    <CardBack
                      label={state.stock.length ? drawLabel : undefined}
                      metrics={cardMetrics}
                      variant={drawVariant}
                    />
                  )}
                </PileButton>
              )}
            </Stack>
          )
        }

        return <Stack key={`empty-${columnIndex}`} style={slotStyle} />
      })}
    </XStack>
  )
}
