import React, { useCallback } from 'react'
import { LayoutChangeEvent, LayoutRectangle, View } from 'react-native'
import { XStack } from 'tamagui'

import {
  FOUNDATION_SUIT_ORDER,
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
        </PileButton>

        {!state.hasWon && (
          <PileButton label={`${state.stock.length}`} onPress={onDraw} disabled={stockDisabled}>
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
      </XStack>
    </XStack>
  )
}
