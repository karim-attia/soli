import React from 'react'
import { Text, View } from 'tamagui'

import type { Card } from '../../../../solitaire/klondike'
import type { CardFlightSnapshot } from '../../../../animation/flightController'
import type { CardFlightRegistry, CardMetrics, InvalidWiggleConfig } from '../../types'
import { CardView } from './CardView'
import { styles } from './styles'

export type StockStackProps = {
  cards: Card[]
  metrics: CardMetrics
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  flightOverlayHiddenCardIds: ReadonlySet<string>
  animationResetKey: number
  // requirement 20-6: Disable CardView layout tracking during scrubbing to reduce churn
  layoutTrackingEnabled?: boolean
  onCardMeasured: (
    cardId: string,
    snapshot: CardFlightSnapshot,
    card?: Card,
    onFlightSettled?: (cardId: string) => void
  ) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  label?: string
  renderCardsInPlace?: boolean
}

export const StockStack = ({
  cards,
  metrics,
  invalidWiggle,
  cardFlights,
  flightOverlayHiddenCardIds,
  animationResetKey,
  layoutTrackingEnabled = true,
  onCardMeasured,
  cardFlightMemory,
  label,
  renderCardsInPlace = true,
}: StockStackProps) => {
  if (!cards.length || !renderCardsInPlace) {
    return (
      <View
        pointerEvents="none"
        style={[
          styles.stockContainer,
          {
            width: metrics.width,
            height: metrics.height,
            borderRadius: metrics.radius,
          },
        ]}
      />
    )
  }

  const topCard = cards[cards.length - 1]

  return (
    <View
      pointerEvents="none"
      style={[
        styles.stockContainer,
        {
          width: metrics.width,
          height: metrics.height,
          borderRadius: metrics.radius,
        },
      ]}
    >
      {/* Keep the wrapper keyed by card id so each newly exposed stock card remounts
          and records its own layout snapshot before the next draw. */}
      <View
        key={topCard.id}
        pointerEvents="none"
        style={[styles.stockCardWrapper, { zIndex: cards.length }]}
      >
        <CardView
          card={topCard}
          metrics={metrics}
          invalidWiggle={invalidWiggle}
          cardFlights={cardFlights}
          hiddenForFlightOverlay={flightOverlayHiddenCardIds.has(topCard.id)}
          animationResetKey={animationResetKey}
          layoutTrackingEnabled={layoutTrackingEnabled}
          onCardMeasured={onCardMeasured}
          cardFlightMemory={cardFlightMemory}
        />
      </View>
      {label ? (
        <Text pointerEvents="none" style={[styles.cardBackText, styles.stockLabel]}>
          {label}
        </Text>
      ) : null}
    </View>
  )
}
