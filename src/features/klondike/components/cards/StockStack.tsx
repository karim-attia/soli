import React from 'react'
import { View } from 'react-native'
import { Text, Stack } from 'tamagui'

import type { Card } from '../../../../solitaire/klondike'
import type { CardFlightSnapshot } from '../../../../animation/flightController'
import type {
  CardFlightRegistry,
  CardMetrics,
  InvalidWiggleConfig,
} from '../../types'
import { EMPTY_INVALID_WIGGLE } from '../../types'
import { CardView } from './CardView'
import { styles } from './styles'

export type StockStackProps = {
  cards: Card[]
  metrics: CardMetrics
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  label?: string
}

export const StockStack = ({
  cards,
  metrics,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  label,
}: StockStackProps) => {
  if (!cards.length) {
    return (
      <Stack
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

  return (
    <Stack
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
      {cards.map((card, index) => {
        const isTopCard = index === cards.length - 1
        return (
          <View
            key={card.id}
            pointerEvents="none"
            style={[styles.stockCardWrapper, { zIndex: index + 1 }, !isTopCard && styles.hiddenCard]}
          >
            <CardView
              card={card}
              metrics={metrics}
              invalidWiggle={isTopCard ? invalidWiggle : EMPTY_INVALID_WIGGLE}
              cardFlights={cardFlights}
              onCardMeasured={onCardMeasured}
              cardFlightMemory={cardFlightMemory}
            />
          </View>
        )
      })}
      {label ? (
        <Text pointerEvents="none" style={[styles.cardBackText, styles.stockLabel]}>
          {label}
        </Text>
      ) : null}
    </Stack>
  )
}
