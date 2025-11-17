import React from 'react'
import { LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { YStack } from 'tamagui'

import type { CelebrationState } from '../hooks/useCelebrationController'
import {
  StatisticsHud,
  StatisticsPlaceholder,
  type StatisticsRow,
} from './StatisticsHud'
import { FeltBackground } from './FeltBackground'
import { TopRow, type TopRowProps } from './cards/TopRow'
import { TableauSection, type TableauSectionProps } from './cards/TableauSection'
import { CelebrationTouchBlocker } from './cards'
import { CelebrationDebugBadge } from './CelebrationDebugBadge'
import { UndoScrubber, type UndoScrubberProps } from './UndoScrubber'
import type { CelebrationBindings } from '../types'
import { COLUMN_MARGIN, EDGE_GUTTER } from '../constants'

const BOARD_MARGIN_ADJUSTMENT = 6

export type KlondikeGameViewProps = {
  feltBackground: string
  headerPadding: { top: number; left: number; right: number }
  statisticsRows: StatisticsRow[]
  onBoardLayout: (event: LayoutChangeEvent) => void
  topRowProps: TopRowProps
  tableauProps: TableauSectionProps
  celebrationState: CelebrationState | null
  celebrationLabel: string | null
  celebrationBindings: CelebrationBindings
  onCelebrationAbort: () => void
  undoScrubProps: UndoScrubberProps
}

export const KlondikeGameView: React.FC<KlondikeGameViewProps> = ({
  feltBackground,
  headerPadding,
  statisticsRows,
  onBoardLayout,
  topRowProps,
  tableauProps,
  celebrationState,
  celebrationLabel,
  celebrationBindings,
  onCelebrationAbort,
  undoScrubProps,
}) => {
  const hasStats = statisticsRows.length > 0

  return (
    <YStack flex={1} px="$2" pb="$2" gap="$3" style={{ backgroundColor: feltBackground }}>
      <FeltBackground />

      <View
        style={[
          styles.headerRow,
          {
            paddingTop: headerPadding.top,
            paddingLeft: headerPadding.left,
            paddingRight: headerPadding.right,
          },
        ]}
      >
        {hasStats ? <StatisticsHud rows={statisticsRows} /> : <StatisticsPlaceholder />}
      </View>

      <YStack
        flex={1}
        onLayout={onBoardLayout}
        style={[styles.boardShell, { marginTop: EDGE_GUTTER + BOARD_MARGIN_ADJUSTMENT }]}
        px="$2"
        py="$3"
        gap="$3"
      >
        <TopRow {...topRowProps} />

        <TableauSection {...tableauProps} />

        {celebrationState ? (
          <CelebrationTouchBlocker onAbort={onCelebrationAbort} />
        ) : null}

        {celebrationLabel ? <CelebrationDebugBadge label={celebrationLabel} /> : null}
      </YStack>

      <UndoScrubber {...undoScrubProps} />
    </YStack>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    width: '100%',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  boardShell: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: COLUMN_MARGIN,
    position: 'relative',
  },
})


