import React, { memo } from 'react'
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
  BOARD_COLUMN_GAP,
  BOARD_COLUMN_MARGIN,
  COLOR_COLUMN_BORDER,
  COLOR_COLUMN_SELECTED,
  COLOR_DROP_BORDER,
} from '../../constants'
import { CardView, EmptySlot } from './CardView'
import { styles } from './styles'

const FACE_DOWN_STACK_OFFSET_DIVISOR = 2

const areCardMetricsEqual = (previous: CardMetrics, next: CardMetrics): boolean => {
  return (
    previous.width === next.width &&
    previous.height === next.height &&
    previous.stackOffset === next.stackOffset &&
    previous.radius === next.radius
  )
}

const getTableauSelectionKey = (selection: GameState['selected']): string => {
  if (!selection || selection.source !== 'tableau') {
    return 'none'
  }
  return `${selection.columnIndex}:${selection.cardIndex}`
}

const areTableauDropHintsEqual = (previous: DropHints, next: DropHints): boolean => {
  return previous.tableau.every((value, index) => value === next.tableau[index])
}

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
  // requirement 20-6: When scrubbing, reduce board churn to avoid iOS gesture cancellation
  scrubbingActive: boolean
  celebrationPending?: boolean
}

const TableauSectionComponent = ({
  state,
  cardMetrics,
  dropHints,
  onAutoMove,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  interactionsLocked,
  scrubbingActive,
  celebrationPending = false,
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
        invalidWiggle={invalidWiggle}
        cardFlights={cardFlights}
        onCardMeasured={onCardMeasured}
        cardFlightMemory={cardFlightMemory}
        disableInteractions={interactionsLocked}
        scrubbingActive={scrubbingActive}
        celebrationPending={celebrationPending}
      />
    ))}
  </View>
)

export const TableauSection = memo(
  TableauSectionComponent,
  (previous, next) =>
    previous.state.tableau === next.state.tableau &&
    previous.state.hasWon === next.state.hasWon &&
    getTableauSelectionKey(previous.state.selected) ===
      getTableauSelectionKey(next.state.selected) &&
    previous.interactionsLocked === next.interactionsLocked &&
    previous.scrubbingActive === next.scrubbingActive &&
    previous.celebrationPending === next.celebrationPending &&
    previous.invalidWiggle.key === next.invalidWiggle.key &&
    previous.cardFlights === next.cardFlights &&
    previous.cardFlightMemory === next.cardFlightMemory &&
    previous.onAutoMove === next.onAutoMove &&
    previous.onCardMeasured === next.onCardMeasured &&
    areCardMetricsEqual(previous.cardMetrics, next.cardMetrics) &&
    areTableauDropHintsEqual(previous.dropHints, next.dropHints)
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
  scrubbingActive: boolean
  celebrationPending?: boolean
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
  scrubbingActive,
  celebrationPending = false,
}: TableauColumnProps) => {
  // Task 1-9: Keep face-up spacing (tap targets), but halve the visible spacing for face-down stacks.
  const faceDownStackOffset = Math.round(
    cardMetrics.stackOffset / FACE_DOWN_STACK_OFFSET_DIVISOR
  )
  let runningOffset = 0
  const cardOffsets = column.map((card) => {
    const offset = runningOffset
    runningOffset += card.faceUp ? cardMetrics.stackOffset : faceDownStackOffset
    return offset
  })
  const columnHeight = column.length
    ? cardOffsets[cardOffsets.length - 1] + cardMetrics.height
    : cardMetrics.height
  const tableauSelection =
    state.selected?.source === 'tableau' && state.selected.columnIndex === columnIndex
      ? state.selected
      : null
  const columnSelected = Boolean(tableauSelection)
  const selectedCardIndex = tableauSelection ? tableauSelection.cardIndex : null
  const isFirstColumn = columnIndex === 0
  const isLastColumn = columnIndex === state.tableau.length - 1
  const showWinCleanup = state.hasWon && !celebrationPending

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
          // Task 1-8: reduce board column gaps and keep edge gutters equal to the column gap.
          marginLeft: isFirstColumn ? BOARD_COLUMN_GAP : BOARD_COLUMN_MARGIN,
          marginRight: isLastColumn ? BOARD_COLUMN_GAP : BOARD_COLUMN_MARGIN,
        },
      ]}
      pointerEvents={disableInteractions ? 'none' : 'auto'}
    >
      {/* Task 28-2: Fade empty tableau outlines after the visual win handoff, instead of unmounting them in one frame. */}
      {column.length === 0 ? (
        <EmptySlot
          highlight={isDroppable}
          hidden={showWinCleanup}
          metrics={cardMetrics}
        />
      ) : null}
      {column.map((card, cardIndex) => (
        <CardView
          key={card.id}
          card={card}
          metrics={cardMetrics}
          offsetTop={cardOffsets[cardIndex]}
          suppressFlightOnFaceUpChange
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
          layoutTrackingEnabled={!scrubbingActive}
          onCardMeasured={onCardMeasured}
          cardFlightMemory={cardFlightMemory}
        />
      ))}
    </View>
  )
}
