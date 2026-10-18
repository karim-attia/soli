import React from 'react'
import { LayoutChangeEvent, StyleSheet, View } from 'react-native'

import type { CelebrationState } from '../hooks/useCelebrationController'
import { StatisticsHud, StatisticsPlaceholder, type StatisticsRow } from './StatisticsHud'
import { FeltBackground } from './FeltBackground'
import { TopRow, type TopRowProps } from './cards/TopRow'
import { TableauSection, type TableauSectionProps } from './cards/TableauSection'
import { AbsoluteCardLayer, type AbsoluteCardLayerProps } from './cards/AbsoluteCardLayer'
import { HintOverlayLayer, type HintOverlayLayerProps } from './cards/HintOverlayLayer'
import { CelebrationOverlayLayer } from './cards/CelebrationOverlayLayer'
import { CelebrationTouchBlocker } from './cards/CelebrationTouchBlocker'
import { CelebrationDebugBadge } from './CelebrationDebugBadge'
import { UndoScrubber, type UndoScrubberProps } from './UndoScrubber'
import { DemoPlaylistHud } from './DemoPlaylistHud'
import type { CelebrationBindings } from '../types'
import { EDGE_GUTTER, STACK_PADDING } from '../constants'
import { SPACE } from '../../../theme/tokens'

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
  hintOverlayProps: HintOverlayLayerProps | null
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
  hintOverlayProps,
  absoluteCardLayerProps,
}) => {
  const hasStats = statisticsRows.length > 0

  return (
    <View style={[styles.root, { backgroundColor: feltBackground }]}>
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

      <View
        onLayout={onBoardLayout}
        style={[
          styles.boardShell,
          {
            marginTop: EDGE_GUTTER + BOARD_MARGIN_ADJUSTMENT,
            // Task 1-8: cancel the root's horizontal padding so the board can reach
            // safe-area edges, without changing header/undo spacing. NOTE (2026-10-18,
            // Tamagui removal): STACK_PADDING is 8 but the root padding was Tamagui's
            // `px="$2"` = 7, so this over-cancels by 1 px. Pre-existing and part of the
            // approved board geometry — kept as-is for pixel parity (plan Follow-ups).
            marginHorizontal: -STACK_PADDING,
            paddingLeft: boardSafeArea.left,
            paddingRight: boardSafeArea.right,
          },
        ]}
      >
        <TopRow {...topRowProps} />

        <TableauSection {...tableauProps} />

        {absoluteCardLayerProps ? (
          <AbsoluteCardLayer {...absoluteCardLayerProps} />
        ) : null}

        {/* Solver hint visuals (rings + ghost, all hint kinds). NOTE: sibling
            order alone does NOT paint this above the cards — Fabric hoists the
            card views into this shell and sorts them by zIndex, so the overlay
            carries its own above-the-flight-band zIndex (F13; see
            HINT_OVERLAY_Z_INDEX in HintOverlayLayer). pointerEvents-none
            inside; null during normal play. */}
        {hintOverlayProps ? <HintOverlayLayer {...hintOverlayProps} /> : null}

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
      </View>

      {/* Shared relative wrapper so the demo HUD (absolute, left half) aligns
          exactly with the Undo button's bottom dock without duplicating the
          root padding tokens. The HUD self-subscribes and renders null outside
          demo playback, so mounting it unconditionally costs nothing. */}
      <View style={styles.bottomDock}>
        <UndoScrubber {...undoScrubProps} />
        <DemoPlaylistHud />
      </View>
    </View>
  )
}

// Paddings/gaps are the former Tamagui space tokens ($2 = 7, $3 = 13) — the board is
// pixel-matched against the pre-removal screenshots, so keep these literals.
const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: SPACE[2],
    paddingBottom: SPACE[2],
    gap: SPACE[3],
  },
  headerRow: {
    width: '100%',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  boardShell: {
    flex: 1,
    alignSelf: 'stretch',
    position: 'relative',
    paddingVertical: SPACE[3],
    gap: SPACE[3],
  },
  bottomDock: {
    alignSelf: 'stretch',
    position: 'relative',
  },
})
