import React from 'react'
import { View } from 'react-native'

import type { Card } from '../../../../solitaire/klondike'
import type { CardFlightSnapshot } from '../../../../animation/flightController'
import type {
  CardFlightRegistry,
  CardMetrics,
  InvalidWiggleConfig,
} from '../../types'
import { WASTE_FAN_MAX_OFFSET, WASTE_FAN_OVERLAP_RATIO } from '../../constants'
import { useWasteFanCardAnimation } from './animations'
import { AnimatedView } from './common'
import { styles } from './styles'
import { CardView } from './CardView'

export type WasteFanProps = {
  cards: Card[]
  metrics: CardMetrics
  isSelected: boolean
  onPress: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  // requirement 20-6: Disable CardView layout tracking during scrubbing to reduce churn
  layoutTrackingEnabled?: boolean
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  disabled?: boolean
}

export const WasteFan = ({
  cards,
  metrics,
  isSelected,
  onPress,
  invalidWiggle,
  cardFlights,
  layoutTrackingEnabled = true,
  onCardMeasured,
  cardFlightMemory,
  disabled = false,
}: WasteFanProps) => {
  const visibleCards = cards.slice(-3)
  const overlap = Math.min(metrics.width * WASTE_FAN_OVERLAP_RATIO, WASTE_FAN_MAX_OFFSET)
  const width = metrics.width + overlap * (visibleCards.length - 1)

  return (
    <View style={{ width, height: metrics.height, position: 'relative' }}>
      {visibleCards.map((card, index) => {
        const isTop = index === visibleCards.length - 1
        const enableInteractions = isTop && !disabled
        return (
          <WasteFanCard
            key={card.id}
            card={card}
            metrics={metrics}
            targetOffset={index * overlap}
            isSelected={enableInteractions && isSelected}
            onPress={enableInteractions ? onPress : undefined}
            invalidWiggle={invalidWiggle}
            zIndex={index}
            cardFlights={cardFlights}
            layoutTrackingEnabled={layoutTrackingEnabled}
            onCardMeasured={onCardMeasured}
            cardFlightMemory={cardFlightMemory}
          />
        )
      })}
    </View>
  )
}

export type WasteFanCardProps = {
  card: Card
  metrics: CardMetrics
  targetOffset: number
  isSelected: boolean
  onPress?: () => void
  invalidWiggle: InvalidWiggleConfig
  zIndex: number
  cardFlights: CardFlightRegistry
  layoutTrackingEnabled: boolean
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
}

export const WasteFanCard = ({
  card,
  metrics,
  targetOffset,
  isSelected,
  onPress,
  invalidWiggle,
  zIndex,
  cardFlights,
  layoutTrackingEnabled,
  onCardMeasured,
  cardFlightMemory,
}: WasteFanCardProps) => {
  const { positionStyle } = useWasteFanCardAnimation(targetOffset)

  return (
    <AnimatedView
      pointerEvents="box-none"
      style={[
        styles.wasteFanCardWrapper,
        {
          width: metrics.width,
          height: metrics.height,
          zIndex,
        },
        positionStyle,
      ]}
    >
      <CardView
        card={card}
        metrics={metrics}
        isSelected={isSelected}
        onPress={onPress}
        invalidWiggle={invalidWiggle}
        cardFlights={cardFlights}
        layoutTrackingEnabled={layoutTrackingEnabled}
        onCardMeasured={onCardMeasured}
        cardFlightMemory={cardFlightMemory}
      />
    </AnimatedView>
  )
}
