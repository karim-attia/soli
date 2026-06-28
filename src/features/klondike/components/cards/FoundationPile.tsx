import React from 'react'
import { Pressable, View } from 'react-native'
import { Text } from 'tamagui'

import type { Card, Suit } from '../../../../solitaire/klondike'
import type { CardFlightSnapshot } from '../../../../animation/flightController'
import type { CardFlightRegistry, CardMetrics, InvalidWiggleConfig } from '../../types'
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

const FOUNDATION_OUTLINE_BORDER_WIDTH = 2

export type FoundationPileProps = {
  suit: Suit
  cards: Card[]
  cardMetrics: CardMetrics
  isDroppable: boolean
  isSelected: boolean
  onPress: () => void
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
  onCardArrived?: (cardId: string | null | undefined) => void
  onTopCardFlightSettled?: (cardId: string) => void
  disableInteractions?: boolean
  hideTopCard?: boolean
  celebrationActive?: boolean
  renderTopCard?: boolean
  suppressHiddenTopCardOutline?: boolean
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
  flightOverlayHiddenCardIds,
  animationResetKey,
  layoutTrackingEnabled = true,
  onCardMeasured,
  cardFlightMemory,
  onCardArrived,
  onTopCardFlightSettled,
  disableInteractions = false,
  hideTopCard = false,
  celebrationActive = false,
  renderTopCard = true,
  suppressHiddenTopCardOutline = false,
}: FoundationPileProps) => {
  const { glowStyle, glowDimensions } = useFoundationGlowAnimation({
    cards,
    cardMetrics,
    celebrationActive,
    onCardArrived,
  })

  const hasCards = cards.length > 0
  const topCard = cards[cards.length - 1]
  const shouldHideVisibleTopCard = Boolean(topCard) && (hideTopCard || !renderTopCard)
  const hideOutlineForHiddenTopCard =
    shouldHideVisibleTopCard && (celebrationActive || suppressHiddenTopCardOutline)
  // Task 1-8: The dashed empty outline should NOT show behind cards.
  // When the top card is intentionally hidden, treat the pile as "empty" for outline purposes.
  // During the 2026-06 celebration overlay fix, the top foundation cards are hidden
  // only because the board-level overlay owns their visual copy; keep the outline off
  // so the win animation does not reveal empty slots underneath.
  const showEmptyOutline =
    !topCard || (shouldHideVisibleTopCard && !hideOutlineForHiddenTopCard)
  const borderColor = isDroppable
    ? COLOR_DROP_BORDER
    : isSelected
      ? COLOR_SELECTED_BORDER
      : hasCards
        ? COLOR_FOUNDATION_BORDER
        : COLOR_COLUMN_BORDER
  const highlightOutlineOnTop = !showEmptyOutline && (isSelected || isDroppable)
  return (
    <Pressable
      onPress={disableInteractions ? undefined : onPress}
      disabled={disableInteractions}
      style={[
        styles.foundation,
        {
          width: cardMetrics.width,
          height: cardMetrics.height,
          borderRadius: cardMetrics.radius,
          borderColor,
          borderWidth: showEmptyOutline ? FOUNDATION_OUTLINE_BORDER_WIDTH : 0,
          borderStyle: showEmptyOutline ? 'dashed' : 'solid',
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
      {topCard && renderTopCard ? (
        <AnimatedView
          key={topCard.id}
          pointerEvents="none"
          style={[
            styles.foundationCard,
            hideTopCard ? styles.hiddenCard : undefined,
            { zIndex: cards.length },
          ]}
        >
          <CardView
            card={topCard}
            metrics={cardMetrics}
            invalidWiggle={invalidWiggle}
            cardFlights={cardFlights}
            hiddenForFlightOverlay={flightOverlayHiddenCardIds.has(topCard.id)}
            animationResetKey={animationResetKey}
            // 2026-06 Android memory fix: the full win celebration now lives in a
            // bounded board overlay, so foundations keep only their top static card.
            layoutTrackingEnabled={layoutTrackingEnabled}
            onCardMeasured={onCardMeasured}
            onFlightSettled={onTopCardFlightSettled}
            cardFlightMemory={cardFlightMemory}
          />
        </AnimatedView>
      ) : !topCard ? (
        <Text
          style={[
            styles.foundationSymbol,
            { color: hasCards ? SUIT_COLORS[suit] : COLOR_TEXT_MUTED },
          ]}
        >
          {SUIT_SYMBOLS[suit]}
        </Text>
      ) : null}
      {highlightOutlineOnTop ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: cardMetrics.width,
            height: cardMetrics.height,
            borderRadius: cardMetrics.radius,
            borderWidth: FOUNDATION_OUTLINE_BORDER_WIDTH,
            borderColor,
          }}
        />
      ) : null}
    </Pressable>
  )
}
