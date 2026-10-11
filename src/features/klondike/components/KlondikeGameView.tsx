import React from 'react'
import { LayoutChangeEvent, StyleSheet, View } from 'react-native'
import { GestureDetector } from 'react-native-gesture-handler'
import type { GestureType } from 'react-native-gesture-handler'
import { YStack } from 'tamagui'

import type { CelebrationState } from '../hooks/useCelebrationController'
import { StatisticsHud, StatisticsPlaceholder, type StatisticsRow } from './StatisticsHud'
import { FeltBackground } from './FeltBackground'
import { TopRow, type TopRowProps } from './cards/TopRow'
import { TableauSection, type TableauSectionProps } from './cards/TableauSection'
import { AbsoluteCardLayer, type AbsoluteCardLayerProps } from './cards/AbsoluteCardLayer'
import { HintOverlayLayer, type HintOverlayLayerProps } from './cards/HintOverlayLayer'
import { DragOverlayLayer, type DragOverlayLayerProps } from './cards/DragOverlayLayer'
import { CelebrationOverlayLayer } from './cards/CelebrationOverlayLayer'
import { CelebrationTouchBlocker } from './cards/CelebrationTouchBlocker'
import { CelebrationDebugBadge } from './CelebrationDebugBadge'
import { UndoScrubber, type UndoScrubberProps } from './UndoScrubber'
import { DemoPlaylistHud } from './DemoPlaylistHud'
import type { CelebrationBindings } from '../types'
import { EDGE_GUTTER, STACK_PADDING } from '../constants'

const BOARD_MARGIN_ADJUSTMENT = 6

// GestureDetector requires a gesture, but the board renders before useCardDrag has
// one (and drag can be absent entirely). Rendering the shell unwrapped in that case
// keeps the tree shape identical to pre-drag builds.
const GestureDetectorMaybe: React.FC<{
  gesture: GestureType | null
  children: React.ReactElement
}> = ({ gesture, children }) =>
  gesture ? <GestureDetector gesture={gesture}>{children}</GestureDetector> : children

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
  dragOverlayProps: DragOverlayLayerProps | null
  absoluteCardLayerProps: AbsoluteCardLayerProps | null
  // The card-drag pan. Attached to the board shell rather than the card plane:
  // the plane is pointerEvents="box-none" and Android's RNGH orchestrator will not
  // collect a handler there unless a descendant became a touch target, which the
  // waste tap zone never does (verified on an emulator — see the comment in
  // AbsoluteCardLayer). The shell is pointerEvents="auto", so handlers always
  // attach, and it shares an origin with the card plane so coordinates are unchanged.
  dragGesture: GestureType | null
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
  dragOverlayProps,
  absoluteCardLayerProps,
  dragGesture,
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

      <GestureDetectorMaybe gesture={dragGesture}>
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

          {/* Solver hint visuals (rings + ghost, all hint kinds). NOTE: sibling
            order alone does NOT paint this above the cards — Fabric hoists the
            card views into this shell and sorts them by zIndex, so the overlay
            carries its own above-the-flight-band zIndex (F13; see
            HINT_OVERLAY_Z_INDEX in HintOverlayLayer). pointerEvents-none
            inside; null during normal play. */}
          {hintOverlayProps ? <HintOverlayLayer {...hintOverlayProps} /> : null}

          {/* Lifted cards during a drag. Same story as the hint overlay: sibling
            order alone does NOT paint it above the cards, so it carries its own
            DRAG_OVERLAY_Z_INDEX (above the flight band, below the hint band).
            pointerEvents-none inside; null during normal play. */}
          {dragOverlayProps ? <DragOverlayLayer {...dragOverlayProps} /> : null}

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
      </GestureDetectorMaybe>

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
