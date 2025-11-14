import React from 'react'
import { Pressable, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { Text } from 'tamagui'
import Animated from 'react-native-reanimated'

import type { Card } from '../../../../solitaire/klondike'
import type { CardFlightSnapshot } from '../../../../animation/flightController'
import {
  COLOR_CARD_BORDER,
  COLOR_COLUMN_BORDER,
  COLOR_DROP_BORDER,
  SUIT_COLORS,
  SUIT_SYMBOLS,
} from '../../constants'
import type {
  CardFlightRegistry,
  CardMetrics,
  CelebrationBindings,
  InvalidWiggleConfig,
} from '../../types'
import { useCardAnimations } from './animations'
import { AnimatedView } from './common'
import { styles } from './styles'
import { rankToLabel } from './utils'

export type CardVisualProps = {
  card: Card
  metrics: CardMetrics
  onPress?: () => void
  disabled?: boolean
}

export const CardVisual = ({ card, metrics, onPress, disabled }: CardVisualProps) => {
  const baseStyle: StyleProp<ViewStyle> = [
    styles.cardBase,
    styles.faceUp,
    {
      width: '100%',
      height: '100%',
      borderRadius: metrics.radius,
      borderColor: COLOR_CARD_BORDER,
    },
  ]

  const body = (
    <>
      <Text
        style={[styles.cardCornerRank, { color: SUIT_COLORS[card.suit] }]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {rankToLabel(card.rank)}
      </Text>
      <Text
        style={[styles.cardCornerSuit, { color: SUIT_COLORS[card.suit] }]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {SUIT_SYMBOLS[card.suit]}
      </Text>
      <Text
        style={[styles.cardSymbol, { color: SUIT_COLORS[card.suit] }]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {SUIT_SYMBOLS[card.suit]}
      </Text>
    </>
  )

  if (onPress) {
    return (
      <Pressable style={baseStyle} onPress={onPress} disabled={disabled}>
        {body}
      </Pressable>
    )
  }

  return <View style={baseStyle}>{body}</View>
}

export type CardViewProps = {
  card: Card
  metrics: CardMetrics
  offsetTop?: number
  offsetLeft?: number
  isSelected?: boolean
  onPress?: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured?: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory?: Record<string, CardFlightSnapshot>
  celebrationBindings?: CelebrationBindings
}

export const CardView = ({
  card,
  metrics,
  offsetTop,
  offsetLeft,
  isSelected,
  onPress,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  celebrationBindings,
}: CardViewProps) => {
  const {
    cardRef,
    renderFaceUp,
    motionStyle,
    flipStyle,
    positionStyle,
    containerStyle,
    handleCardLayout,
  } = useCardAnimations({
    card,
    metrics,
    offsetTop,
    offsetLeft,
    isSelected,
    invalidWiggle,
    cardFlights,
    cardFlightMemory,
    onCardMeasured,
    celebrationBindings,
  })

  const frontContent = <CardVisual card={card} metrics={metrics} onPress={onPress} disabled={!onPress} />

  const backContent = (
    <View
      style={[
        styles.cardBase,
        styles.faceDown,
        {
          width: '100%',
          height: '100%',
          borderRadius: metrics.radius,
        },
      ]}
    />
  )

  return (
    <AnimatedView
      ref={cardRef}
      onLayout={handleCardLayout}
      style={[positionStyle, motionStyle, containerStyle]}
    >
      <Animated.View style={[styles.cardFlipWrapper, flipStyle]}>
        {renderFaceUp ? frontContent : backContent}
      </Animated.View>
    </AnimatedView>
  )
}

export type CardBackProps = {
  label?: string
  metrics: CardMetrics
  variant: 'stock' | 'recycle' | 'empty'
}

export const CardBack = ({ label, metrics, variant }: CardBackProps) => {
  const containerStyle: StyleProp<ViewStyle> = [
    variant === 'stock'
      ? styles.cardBack
      : [styles.cardBackOutline, variant === 'recycle' ? styles.cardBackRecycle : styles.cardBackEmpty],
    {
      width: metrics.width,
      height: metrics.height,
      borderRadius: metrics.radius,
    },
  ]

  return (
    <View style={containerStyle}>
      {variant === 'recycle' ? (
        <Text style={[styles.cardBackText, { fontSize: 18 }]}>⟲</Text>
      ) : label ? (
        <Text style={styles.cardBackText}>{label}</Text>
      ) : null}
    </View>
  )
}

export const EmptySlot = ({
  label,
  highlight,
  metrics,
}: {
  label?: string
  highlight: boolean
  metrics: CardMetrics
}) => (
  <View
    style={[
      styles.emptySlot,
      {
        width: metrics.width,
        height: metrics.height,
        borderRadius: metrics.radius,
        borderColor: highlight ? COLOR_DROP_BORDER : COLOR_COLUMN_BORDER,
      },
    ]}
  >
    {!!label && <Text style={styles.emptyLabel}>{label}</Text>}
  </View>
)
