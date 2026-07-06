import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'

import { BOARD_COLUMN_GAP, BOARD_COLUMN_MARGIN } from '../constants'
import { computeCardMetrics } from '../utils/cardMetrics'
import type { Card } from '../../../solitaire/klondike'
import { CardVisual, EmptySlot } from './cards/CardVisual'
import { styles as cardStyles } from './cards/styles'
import { computeTableauStackOffsets } from './cards/utils'

// Structural card/column types (instead of importing HistoryPreviewColumn from
// src/state/history) so the klondike feature has no dependency on app state.
// HistoryPreviewColumn is structurally compatible.
export type BoardPreviewCard = Pick<Card, 'suit' | 'rank' | 'faceUp'>
export type BoardPreviewColumn = { cards: BoardPreviewCard[] }

type BoardPreviewProps = {
  tableau: readonly BoardPreviewColumn[]
  availableWidth: number
}

// Static, non-interactive tableau snapshot (history preview sheet). Reuses the main
// board's metrics, stacking math, and card visuals so the preview cannot drift from
// the real board's look.
export const BoardPreview = ({ tableau, availableWidth }: BoardPreviewProps) => {
  // The preview renders edge-to-edge (no outer gutters — the host container, e.g.
  // the sheet's content padding, provides them). computeCardMetrics assumes
  // availableWidth = 7*card + 8*gap (incl. 2 edge gutters), so compensate by
  // pretending those 2 gutters exist: cards then fill exactly 7*card + 6*gap.
  const metrics = useMemo(
    () => computeCardMetrics(availableWidth + 2 * BOARD_COLUMN_GAP),
    [availableWidth]
  )

  return (
    <View style={previewStyles.row} pointerEvents="none">
      {tableau.map((column, columnIndex) => {
        const offsets = computeTableauStackOffsets(column.cards, metrics.stackOffset)
        const lastOffset = offsets.length > 0 ? offsets[offsets.length - 1] : 0

        return (
          <View
            key={`col-${columnIndex}`}
            style={{
              width: metrics.width,
              height: lastOffset + metrics.height,
              marginLeft: columnIndex === 0 ? 0 : BOARD_COLUMN_MARGIN,
              marginRight: columnIndex === tableau.length - 1 ? 0 : BOARD_COLUMN_MARGIN,
            }}
          >
            {column.cards.length === 0 ? (
              <EmptySlot highlight={false} metrics={metrics} />
            ) : (
              column.cards.map((card, cardIndex) => (
                // CardVisual fills 100% of its wrapper, so each card gets a sized,
                // absolutely-positioned wrapper (mirrors AbsoluteCardLayer).
                <View
                  key={`${card.suit}-${card.rank}-${cardIndex}`}
                  style={{
                    position: 'absolute',
                    top: offsets[cardIndex],
                    width: metrics.width,
                    height: metrics.height,
                  }}
                >
                  {card.faceUp ? (
                    <CardVisual card={card} metrics={metrics} />
                  ) : (
                    <View
                      style={[
                        cardStyles.cardBase,
                        cardStyles.faceDown,
                        {
                          width: '100%',
                          height: '100%',
                          borderRadius: metrics.radius,
                        },
                      ]}
                    />
                  )}
                </View>
              ))
            )}
          </View>
        )
      })}
    </View>
  )
}

const previewStyles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    // Centered (unlike the main board's flex-start) so the preview stays balanced
    // if card widths clamp at MAX_CARD_WIDTH on wide screens.
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexWrap: 'nowrap',
  },
})
