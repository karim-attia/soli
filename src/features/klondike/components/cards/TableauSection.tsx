import React, { useCallback } from 'react'
import { View } from 'react-native'
import type { LayoutChangeEvent, LayoutRectangle } from 'react-native'

import type { Card, Selection, Tableau } from '../../../../solitaire/klondike'
import type { CardMetrics, DropHints } from '../../types'
import {
  BOARD_COLUMN_GAP,
  BOARD_COLUMN_MARGIN,
  COLOR_COLUMN_BORDER,
  COLOR_COLUMN_SELECTED,
  COLOR_DROP_BORDER,
} from '../../constants'
import { getEmptyColumnLabel, getTableauColumnTestID } from './accessibility'
import { EmptySlot } from './CardVisual'
import { styles } from './styles'
import { computeTableauStackOffsets } from './utils'

export type TableauSectionProps = {
  // Perf (A2): narrow state slices instead of the full GameState so React.memo can
  // skip re-renders when the relevant pieces kept identity (e.g. TIMER_TICK).
  tableau: Tableau
  selected: Selection | null
  hasWon: boolean
  cardMetrics: CardMetrics
  dropHints: DropHints
  interactionsLocked: boolean
  celebrationPending?: boolean
  onTableauRowLayout?: (layout: LayoutRectangle) => void
  onTableauColumnLayout?: (columnIndex: number, layout: LayoutRectangle) => void
}

export const TableauSection = React.memo(
  ({
    tableau,
    selected,
    hasWon,
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
    // Task 28-2: Keep the board stable until the final winning card finishes settling.
    const showWinCleanup = hasWon && !celebrationPending

    return (
      <View style={styles.tableauRow} onLayout={handleRowLayout}>
        {tableau.map((column, columnIndex) => (
          <TableauColumn
            key={`col-${columnIndex}`}
            column={column}
            columnIndex={columnIndex}
            isSelected={
              selected?.source === 'tableau' && selected.columnIndex === columnIndex
            }
            isLastColumn={columnIndex === tableau.length - 1}
            showWinCleanup={showWinCleanup}
            cardMetrics={cardMetrics}
            isDroppable={dropHints.tableau[columnIndex]}
            disableInteractions={interactionsLocked}
            onColumnLayout={onTableauColumnLayout}
          />
        ))}
      </View>
    )
  }
)

TableauSection.displayName = 'TableauSection'

export type TableauColumnProps = {
  column: Card[]
  columnIndex: number
  isSelected: boolean
  isLastColumn: boolean
  showWinCleanup: boolean
  cardMetrics: CardMetrics
  isDroppable: boolean
  disableInteractions: boolean
  onColumnLayout?: (columnIndex: number, layout: LayoutRectangle) => void
}

export const TableauColumn = React.memo(
  ({
    column,
    columnIndex,
    isSelected,
    isLastColumn,
    showWinCleanup,
    cardMetrics,
    isDroppable,
    disableInteractions,
    onColumnLayout,
  }: TableauColumnProps) => {
    const cardOffsets = computeTableauStackOffsets(column, cardMetrics.stackOffset)
    const columnHeight = column.length
      ? cardOffsets[cardOffsets.length - 1] + cardMetrics.height
      : cardMetrics.height
    const isFirstColumn = columnIndex === 0
    const isEmpty = column.length === 0

    return (
      <View
        // The column frame only becomes an a11y node when empty (informational, not a
        // tap target — moves to empty columns happen via auto-move on the tapped card).
        // Making it accessible while populated would swallow nothing (cards live in the
        // absolute layer) but adds a meaningless focus stop.
        accessible={isEmpty}
        accessibilityLabel={isEmpty ? getEmptyColumnLabel(columnIndex) : undefined}
        testID={isEmpty ? getTableauColumnTestID(columnIndex) : undefined}
        style={[
          styles.column,
          {
            width: cardMetrics.width,
            height: columnHeight,
            borderColor:
              isEmpty
                ? 'transparent'
                : isDroppable
                  ? COLOR_DROP_BORDER
                  : COLOR_COLUMN_BORDER,
            backgroundColor: isSelected ? COLOR_COLUMN_SELECTED : 'transparent',
            // Task 1-8: reduce board column gaps and keep edge gutters equal to the column gap.
            marginLeft: isFirstColumn ? BOARD_COLUMN_GAP : BOARD_COLUMN_MARGIN,
            marginRight: isLastColumn ? BOARD_COLUMN_GAP : BOARD_COLUMN_MARGIN,
          },
        ]}
        onLayout={(event) => onColumnLayout?.(columnIndex, event.nativeEvent.layout)}
        pointerEvents={disableInteractions ? 'none' : 'auto'}
      >
        {/* Task 28-2: Fade empty tableau outlines after the visual win handoff, instead of unmounting them in one frame. */}
        {isEmpty ? (
          <EmptySlot
            highlight={isDroppable}
            hidden={showWinCleanup}
            metrics={cardMetrics}
          />
        ) : null}
      </View>
    )
  }
)

TableauColumn.displayName = 'TableauColumn'
