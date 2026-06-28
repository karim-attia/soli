import React, { useCallback } from 'react'
import { View } from 'react-native'
import type { LayoutChangeEvent, LayoutRectangle } from 'react-native'

import type { Card } from '../../../../solitaire/klondike'
import type { CardMetrics, DropHints } from '../../types'
import type { GameState } from '../../../../solitaire/klondike'
import {
  BOARD_COLUMN_GAP,
  BOARD_COLUMN_MARGIN,
  COLOR_COLUMN_BORDER,
  COLOR_COLUMN_SELECTED,
  COLOR_DROP_BORDER,
} from '../../constants'
import { EmptySlot } from './CardView'
import { styles } from './styles'

const FACE_DOWN_STACK_OFFSET_DIVISOR = 2

export type TableauSectionProps = {
  state: GameState
  cardMetrics: CardMetrics
  dropHints: DropHints
  interactionsLocked: boolean
  celebrationPending?: boolean
  onTableauRowLayout?: (layout: LayoutRectangle) => void
  onTableauColumnLayout?: (columnIndex: number, layout: LayoutRectangle) => void
}

export const TableauSection = ({
  state,
  cardMetrics,
  dropHints,
  interactionsLocked,
  celebrationPending = false,
  onTableauRowLayout,
  onTableauColumnLayout,
}: TableauSectionProps) => {
  const handleRowLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onTableauRowLayout?.(event.nativeEvent.layout)
    },
    [onTableauRowLayout]
  )

  return (
    <View style={styles.tableauRow} onLayout={handleRowLayout}>
      {state.tableau.map((column, columnIndex) => (
        <TableauColumn
          key={`col-${columnIndex}`}
          column={column}
          columnIndex={columnIndex}
          state={state}
          cardMetrics={cardMetrics}
          isDroppable={dropHints.tableau[columnIndex]}
          disableInteractions={interactionsLocked}
          celebrationPending={celebrationPending}
          onColumnLayout={onTableauColumnLayout}
        />
      ))}
    </View>
  )
}

export type TableauColumnProps = {
  column: Card[]
  columnIndex: number
  state: GameState
  cardMetrics: CardMetrics
  isDroppable: boolean
  disableInteractions: boolean
  celebrationPending?: boolean
  onColumnLayout?: (columnIndex: number, layout: LayoutRectangle) => void
}

export const TableauColumn = ({
  column,
  columnIndex,
  state,
  cardMetrics,
  isDroppable,
  disableInteractions,
  celebrationPending = false,
  onColumnLayout,
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
      onLayout={(event) => onColumnLayout?.(columnIndex, event.nativeEvent.layout)}
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
    </View>
  )
}
