import React, { memo, useCallback } from 'react'
import { LayoutChangeEvent, LayoutRectangle } from 'react-native'
import { Stack, XStack } from 'tamagui'

import {
  FOUNDATION_SUIT_ORDER,
  TABLEAU_COLUMN_COUNT,
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
import { EmptySlot, CardBack } from './CardView'
import { PileButton } from './PileButton'
import { StockStack } from './StockStack'
import { WasteFan } from './WasteFan'
import { FoundationPile } from './FoundationPile'
import { BOARD_COLUMN_GAP, BOARD_COLUMN_MARGIN } from '../../constants'

const areCardMetricsEqual = (previous: CardMetrics, next: CardMetrics): boolean => {
  return (
    previous.width === next.width &&
    previous.height === next.height &&
    previous.stackOffset === next.stackOffset &&
    previous.radius === next.radius
  )
}

const getTopRowSelectionKey = (selection: GameState['selected']): string => {
  if (!selection) {
    return 'none'
  }
  if (selection.source === 'waste') {
    return 'waste'
  }
  if (selection.source === 'foundation') {
    return `foundation:${selection.suit}`
  }
  return 'none'
}

const areFoundationDropHintsEqual = (previous: DropHints, next: DropHints): boolean => {
  return FOUNDATION_SUIT_ORDER.every(
    (suit) => previous.foundations[suit] === next.foundations[suit]
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
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  onFoundationArrival?: (cardId: string | null | undefined) => void
  onFoundationCardFlightSettled?: (cardId: string) => void
  interactionsLocked: boolean
  // requirement 20-6: When scrubbing, reduce board churn to avoid iOS gesture cancellation
  scrubbingActive: boolean
  hideFoundations?: boolean
  onTopRowLayout?: (layout: LayoutRectangle) => void
  onFoundationLayout?: (suit: Suit, layout: LayoutRectangle) => void
  celebrationBindings?: CelebrationBindings
  celebrationActive?: boolean
  celebrationPending?: boolean
}

const TopRowComponent = ({
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
  onFoundationCardFlightSettled,
  interactionsLocked,
  scrubbingActive,
  hideFoundations,
  onTopRowLayout,
  onFoundationLayout,
  celebrationBindings,
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
  const wasteSelected = state.selected?.source === 'waste'
  const showRecycle = !state.stock.length && state.waste.length > 0
  const drawVariant: 'stock' | 'recycle' | 'empty' = showRecycle
    ? 'recycle'
    : state.stock.length
      ? 'stock'
      : 'empty'
  // Task 28-2: Keep the board stable until the final winning card finishes settling.
  const showWinCleanup = state.hasWon && !celebrationPending
  const hideEmptyOutlines = showWinCleanup

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
                isSelected={
                  state.selected?.source === 'foundation' && state.selected.suit === suit
                }
                onPress={() => onFoundationPress(suit)}
                invalidWiggle={invalidWiggle}
                cardFlights={cardFlights}
                layoutTrackingEnabled={!scrubbingActive}
                onCardMeasured={onCardMeasured}
                cardFlightMemory={cardFlightMemory}
                onCardArrived={onFoundationArrival}
                onTopCardFlightSettled={onFoundationCardFlightSettled}
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
                    <EmptySlot
                      highlight={false}
                      hidden={hideEmptyOutlines}
                      metrics={cardMetrics}
                    />
                  )}
                </Stack>
              </PileButton>
            </Stack>
          )
        }

        if (columnIndex === stockColumnIndex) {
          return (
            <Stack key="stock" style={slotStyle}>
              {!showWinCleanup && (
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
                  ) : hideEmptyOutlines ? (
                    <Stack width={cardMetrics.width} height={cardMetrics.height} />
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

export const TopRow = memo(
  TopRowComponent,
  (previous, next) =>
    previous.state.stock === next.state.stock &&
    previous.state.waste === next.state.waste &&
    previous.state.foundations === next.state.foundations &&
    previous.state.hasWon === next.state.hasWon &&
    getTopRowSelectionKey(previous.state.selected) ===
      getTopRowSelectionKey(next.state.selected) &&
    previous.drawLabel === next.drawLabel &&
    previous.interactionsLocked === next.interactionsLocked &&
    previous.scrubbingActive === next.scrubbingActive &&
    previous.hideFoundations === next.hideFoundations &&
    previous.celebrationActive === next.celebrationActive &&
    previous.celebrationPending === next.celebrationPending &&
    previous.invalidWiggle.key === next.invalidWiggle.key &&
    previous.cardFlights === next.cardFlights &&
    previous.cardFlightMemory === next.cardFlightMemory &&
    previous.celebrationBindings === next.celebrationBindings &&
    previous.onDraw === next.onDraw &&
    previous.onWasteTap === next.onWasteTap &&
    previous.onFoundationPress === next.onFoundationPress &&
    previous.notifyInvalidMove === next.notifyInvalidMove &&
    previous.onCardMeasured === next.onCardMeasured &&
    previous.onFoundationArrival === next.onFoundationArrival &&
    previous.onFoundationCardFlightSettled === next.onFoundationCardFlightSettled &&
    previous.onTopRowLayout === next.onTopRowLayout &&
    previous.onFoundationLayout === next.onFoundationLayout &&
    areCardMetricsEqual(previous.cardMetrics, next.cardMetrics) &&
    areFoundationDropHintsEqual(previous.dropHints, next.dropHints)
)
