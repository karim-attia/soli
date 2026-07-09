import React from 'react'
import { LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { YStack } from 'tamagui'

import type { CelebrationState } from '../hooks/useCelebrationController'
import { StatisticsHud, StatisticsPlaceholder, type StatisticsRow } from './StatisticsHud'
import { FeltBackground } from './FeltBackground'
import { TopRow, type TopRowProps } from './cards/TopRow'
import { TableauSection, type TableauSectionProps } from './cards/TableauSection'
import { AbsoluteCardLayer, type AbsoluteCardLayerProps } from './cards/AbsoluteCardLayer'
import { CelebrationOverlayLayer } from './cards/CelebrationOverlayLayer'
import { CelebrationTouchBlocker } from './cards/CelebrationTouchBlocker'
import { CelebrationDebugBadge } from './CelebrationDebugBadge'
import { UndoScrubber, type UndoScrubberProps } from './UndoScrubber'
import { DemoPlaylistHud } from './DemoPlaylistHud'
import type { CelebrationBindings } from '../types'
import { EDGE_GUTTER, STACK_PADDING } from '../constants'

const BOARD_MARGIN_ADJUSTMENT = 6

export type KlondikeGameViewProps = {
  feltBackground: string
  headerPadding: { top: number; left: number; right: number }
  boardSafeArea: { left: number; right: number }
  statisticsRows: StatisticsRow[]
  onBoardLayout: (event: LayoutChangeEvent) => void
  topRowProps: TopRowProps
  tableauProps: TableauSectionProps
  celebrationState: CelebrationState | null
  celebrationLabel: string | null
  celebrationBindings: CelebrationBindings
  onCelebrationAbort: () => void
  onCelebrationBadgePress: () => void
  onCelebrationOverlayReady: () => void
  undoScrubProps: UndoScrubberProps
  absoluteCardLayerProps: AbsoluteCardLayerProps | null
}

export const KlondikeGameView: React.FC<KlondikeGameViewProps> = ({
  feltBackground,
  headerPadding,
  boardSafeArea,
  statisticsRows,
  onBoardLayout,
  topRowProps,
  tableauProps,
  celebrationState,
  celebrationLabel,
  celebrationBindings,
  onCelebrationAbort,
  onCelebrationBadgePress,
  onCelebrationOverlayReady,
  undoScrubProps,
  absoluteCardLayerProps,
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
        style={[
          styles.boardShell,
          {
            marginTop: EDGE_GUTTER + BOARD_MARGIN_ADJUSTMENT,
            // Task 1-8: cancel root px="$2" so the board can reach safe-area edges,
            // without changing header/undo spacing.
            marginHorizontal: -STACK_PADDING,
            paddingLeft: boardSafeArea.left,
            paddingRight: boardSafeArea.right,
          },
        ]}
        py="$3"
        gap="$3"
      >
        <TopRow {...topRowProps} />

        <TableauSection {...tableauProps} />

        {absoluteCardLayerProps ? (
          <AbsoluteCardLayer {...absoluteCardLayerProps} />
        ) : null}

        <CelebrationOverlayLayer
          celebrationState={celebrationState}
          celebrationBindings={celebrationBindings}
          cardMetrics={topRowProps.cardMetrics}
          onOverlayReady={onCelebrationOverlayReady}
        />

        {celebrationState ? (
          <CelebrationTouchBlocker onAbort={onCelebrationAbort} />
        ) : null}

        {celebrationLabel ? (
          <CelebrationDebugBadge
            label={celebrationLabel}
            onPress={onCelebrationBadgePress}
          />
        ) : null}
      </YStack>

      {/* Shared relative wrapper so the demo HUD (absolute, left half) aligns
          exactly with the Undo button's bottom dock without duplicating the
          root padding tokens. The HUD self-subscribes and renders null outside
          demo playback, so mounting it unconditionally costs nothing. */}
      <View style={styles.bottomDock}>
        <UndoScrubber {...undoScrubProps} />
        <DemoPlaylistHud />
      </View>
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
    alignSelf: 'stretch',
    position: 'relative',
  },
  bottomDock: {
    alignSelf: 'stretch',
    position: 'relative',
  },
})
