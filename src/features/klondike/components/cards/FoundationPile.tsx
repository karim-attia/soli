import React from 'react'
import { Pressable, View } from 'react-native'
import Animated from 'react-native-reanimated'
import { Text } from 'tamagui'

import type { Card, Suit } from '../../../../solitaire/klondike'
import type { CardMetrics } from '../../types'
import {
  COLOR_COLUMN_BORDER,
  COLOR_DROP_BORDER,
  COLOR_FOUNDATION_BORDER,
  COLOR_SELECTED_BORDER,
  COLOR_TEXT_MUTED,
  SUIT_COLORS,
  SUIT_SYMBOLS,
} from '../../constants'
import { getFoundationLabel, getFoundationSlotTestID } from './accessibility'
import { useFoundationGlowAnimation } from './animations'
import { styles } from './styles'

const FOUNDATION_OUTLINE_BORDER_WIDTH = 2

export type FoundationPileProps = {
  suit: Suit
  cards: Card[]
  cardMetrics: CardMetrics
  isDroppable: boolean
  isSelected: boolean
  onPress: () => void
  onCardArrived?: (cardId: string | null | undefined) => void
  disableInteractions?: boolean
  celebrationActive?: boolean
}

export const FoundationPile = ({
  suit,
  cards,
  cardMetrics,
  isDroppable,
  isSelected,
  onPress,
  onCardArrived,
  disableInteractions = false,
  celebrationActive = false,
}: FoundationPileProps) => {
  const { glowStyle, glowDimensions } = useFoundationGlowAnimation({
    cards,
    cardMetrics,
    celebrationActive,
    onCardArrived,
  })

  const hasCards = cards.length > 0
  const topCard = cards[cards.length - 1]
  // Absolute-card mode makes this pile structural: card visuals live in
  // `AbsoluteCardLayer`, while this outline only marks truly empty foundations.
  const showEmptyOutline = !topCard
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
      accessibilityRole="button"
      // Only the empty state is labeled here: with cards present, the absolute-layer
      // top card owns the foundation's a11y node (avoids duplicate focus targets).
      accessibilityLabel={showEmptyOutline ? getFoundationLabel(suit, null) : undefined}
      testID={getFoundationSlotTestID(suit)}
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
      <Animated.View
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
      {!topCard ? (
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
