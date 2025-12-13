import React from 'react'
import { Pressable } from 'react-native'
import { Text } from 'tamagui'

import type { Card, Suit } from '../../../../solitaire/klondike'
import type { CardFlightSnapshot } from '../../../../animation/flightController'
import type {
  CardFlightRegistry,
  CardMetrics,
  CelebrationBindings,
  InvalidWiggleConfig,
} from '../../types'
import { EMPTY_INVALID_WIGGLE } from '../../types'
import {
  COLOR_COLUMN_BORDER,
  COLOR_DROP_BORDER,
  COLOR_FOUNDATION_BORDER,
  COLOR_SELECTED_BORDER,
  COLOR_TEXT_MUTED,
  SUIT_COLORS,
  SUIT_SYMBOLS,
} from '../../constants'
import { useFoundationGlowAnimation } from './animations'
import { AnimatedView } from './common'
import { styles } from './styles'
import { CardView } from './CardView'

export type FoundationPileProps = {
  suit: Suit
  cards: Card[]
  cardMetrics: CardMetrics
  isDroppable: boolean
  isSelected: boolean
  onPress: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  // requirement 20-6: Disable CardView layout tracking during scrubbing to reduce churn
  layoutTrackingEnabled?: boolean
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  onCardArrived?: (cardId: string | null | undefined) => void
  disableInteractions?: boolean
  hideTopCard?: boolean
  celebrationBindings?: CelebrationBindings
  celebrationActive?: boolean
  onLayout?: (layout: { x: number; y: number; width: number; height: number }) => void
}

export const FoundationPile = ({
  suit,
  cards,
  cardMetrics,
  isDroppable,
  isSelected,
  onPress,
  invalidWiggle,
  cardFlights,
  layoutTrackingEnabled = true,
  onCardMeasured,
  cardFlightMemory,
  onCardArrived,
  disableInteractions = false,
  hideTopCard = false,
  celebrationBindings,
  celebrationActive = false,
  onLayout,
}: FoundationPileProps) => {
  const { glowStyle, glowDimensions } = useFoundationGlowAnimation({
    cards,
    cardMetrics,
    celebrationActive,
    onCardArrived,
  })

  const hasCards = cards.length > 0
  const borderColor = isDroppable
    ? COLOR_DROP_BORDER
    : isSelected
      ? COLOR_SELECTED_BORDER
      : hasCards
        ? COLOR_FOUNDATION_BORDER
        : COLOR_COLUMN_BORDER
  const topCard = cards[cards.length - 1]

  return (
    <Pressable
      onPress={disableInteractions ? undefined : onPress}
      disabled={disableInteractions}
      onLayout={(event) => onLayout?.(event.nativeEvent.layout)}
      style={[
        styles.foundation,
        {
          width: cardMetrics.width,
          height: cardMetrics.height,
          borderRadius: cardMetrics.radius,
          borderColor,
        },
      ]}
    >
      <AnimatedView
        pointerEvents="none"
        style={[
          styles.foundationGlow,
          {
            width: glowDimensions.width,
            height: glowDimensions.height,
            borderRadius: glowDimensions.borderRadius,
            top: -glowDimensions.offset,
            left: -glowDimensions.offset,
          },
          glowStyle,
        ]}
      />
      {topCard ? (
        cards.map((card, index) => {
          const isTop = index === cards.length - 1
          return (
            <AnimatedView
              key={card.id}
              pointerEvents="none"
              style={[
                styles.foundationCard,
                !isTop && !celebrationActive ? styles.foundationStackedCard : undefined,
                hideTopCard && isTop ? styles.hiddenCard : undefined,
                { zIndex: index + 1 },
              ]}
            >
              <CardView
                card={card}
                metrics={cardMetrics}
                invalidWiggle={isTop ? invalidWiggle : EMPTY_INVALID_WIGGLE}
                cardFlights={cardFlights}
                layoutTrackingEnabled={layoutTrackingEnabled}
                onCardMeasured={onCardMeasured}
                cardFlightMemory={cardFlightMemory}
                celebrationBindings={celebrationBindings}
              />
            </AnimatedView>
          )
        })
      ) : (
        <Text
          style={[
            styles.foundationSymbol,
            { color: hasCards ? SUIT_COLORS[suit] : COLOR_TEXT_MUTED },
          ]}
        >
          {SUIT_SYMBOLS[suit]}
        </Text>
      )}
    </Pressable>
  )
}
