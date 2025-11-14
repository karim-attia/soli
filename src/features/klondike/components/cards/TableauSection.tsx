import React from 'react'
import { View } from 'react-native'

import type { Card } from '../../../../solitaire/klondike'
import type { CardFlightSnapshot } from '../../../../animation/flightController'
import type {
  CardFlightRegistry,
  CardMetrics,
  DropHints,
  InvalidWiggleConfig,
} from '../../types'
import type { GameState, Selection } from '../../../../solitaire/klondike'
import {
  COLUMN_MARGIN,
  COLOR_COLUMN_BORDER,
  COLOR_COLUMN_SELECTED,
  COLOR_DROP_BORDER,
} from '../../constants'
import { CardView, EmptySlot } from './CardView'
import { styles } from './styles'

export type TableauSectionProps = {
  state: GameState
  cardMetrics: CardMetrics
  dropHints: DropHints
  onAutoMove: (selection: Selection) => void
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
        onCardPress={(cardIndex) => onAutoMove({ source: 'tableau', columnIndex, cardIndex })}
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
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  disableInteractions,
}: TableauColumnProps) => {
  const columnHeight = column.length
    ? cardMetrics.height + (column.length - 1) * cardMetrics.stackOffset
    : cardMetrics.height
  const tableauSelection =
    state.selected?.source === 'tableau' && state.selected.columnIndex === columnIndex
      ? state.selected
      : null
  const columnSelected = Boolean(tableauSelection)
  const selectedCardIndex = tableauSelection ? tableauSelection.cardIndex : null

  return (
    <View
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
      pointerEvents={disableInteractions ? 'none' : 'auto'}
    >
      {column.length === 0 && <EmptySlot highlight={isDroppable} metrics={cardMetrics} />}
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
            disableInteractions || !card.faceUp ? undefined : () => onCardPress(cardIndex)
          }
          invalidWiggle={invalidWiggle}
          cardFlights={cardFlights}
          onCardMeasured={onCardMeasured}
          cardFlightMemory={cardFlightMemory}
        />
      ))}
    </View>
  )
}
