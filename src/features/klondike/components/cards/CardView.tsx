import React from 'react'
import { Pressable, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { Text } from 'tamagui'
import Animated from 'react-native-reanimated'
import { RefreshCcw } from '@tamagui/lucide-icons'

import type { Card } from '../../../../solitaire/klondike'
import type { CardFlightSnapshot } from '../../../../animation/flightController'
import {
  CARD_REFERENCE_HEIGHT,
  CARD_REFERENCE_WIDTH,
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

const CARD_PADDING_HORIZONTAL = 4
const CARD_PADDING_VERTICAL = 6
const CARD_CORNER_RANK_TOP = -2
const CARD_CORNER_RANK_LEFT = 3
const CARD_CORNER_RANK_FONT = 16
const CARD_CORNER_SUIT_FONT = 12
const CARD_SYMBOL_FONT = 28
const CARD_SYMBOL_MARGIN_TOP = 16

const deriveCardScale = (metrics: CardMetrics) => {
  if (metrics.width) {
    return metrics.width / CARD_REFERENCE_WIDTH
  }
  if (metrics.height) {
    return metrics.height / CARD_REFERENCE_HEIGHT
  }
  return 1
}

export type CardVisualProps = {
  card: Card
  metrics: CardMetrics
  onPress?: () => void
  disabled?: boolean
}

export const CardVisual = ({ card, metrics, onPress, disabled }: CardVisualProps) => {
  // PBI-25: keep cards proportional via a single reference scale
  const cardScale = deriveCardScale(metrics)
  const scaleValue = (value: number) => value * cardScale
  const paddingHorizontal = scaleValue(CARD_PADDING_HORIZONTAL)
  const paddingVertical = scaleValue(CARD_PADDING_VERTICAL)
  const cornerRankStyle = {
    top: scaleValue(CARD_CORNER_RANK_TOP),
    left: scaleValue(CARD_CORNER_RANK_LEFT),
    fontSize: scaleValue(CARD_CORNER_RANK_FONT),
  }
  const cornerSuitStyle = {
    fontSize: scaleValue(CARD_CORNER_SUIT_FONT),
  }
  const centerSymbolStyle = {
    fontSize: scaleValue(CARD_SYMBOL_FONT),
    marginTop: scaleValue(CARD_SYMBOL_MARGIN_TOP),
  }

  const baseStyle: StyleProp<ViewStyle> = [
    styles.cardBase,
    styles.faceUp,
    {
      width: '100%',
      height: '100%',
      borderRadius: metrics.radius,
      borderColor: COLOR_CARD_BORDER,
      paddingHorizontal,
      paddingVertical,
    },
  ]

  const body = (
    <>
      {/* Small rank label | top left */}
      <Text
        style={[styles.cardCornerRank, cornerRankStyle, { color: SUIT_COLORS[card.suit] }]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {rankToLabel(card.rank)}
      </Text>
      {/* Small suit symbol | top right */}
      <Text
        style={[styles.cardCornerSuit, cornerSuitStyle, { color: SUIT_COLORS[card.suit] }]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {SUIT_SYMBOLS[card.suit]}
      </Text>
      {/* Large suit symbol | center */}
      <Text
        style={[styles.cardSymbol, centerSymbolStyle, { color: SUIT_COLORS[card.suit] }]}
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
  // requirement 20-6: During undo scrubbing, disable layout tracking to reduce native churn.
  // Card onLayout → measure() → shared value updates can be extremely noisy during rapid SCRUB_TO_INDEX commits.
  layoutTrackingEnabled?: boolean
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
  layoutTrackingEnabled = true,
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
      onLayout={layoutTrackingEnabled ? handleCardLayout : undefined}
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
  const recycleIconSize = Math.max(16, Math.round(metrics.width * 0.22))

  return (
    <View style={containerStyle}>
      {variant === 'recycle' ? (
        <RefreshCcw color="#0f172a" size={recycleIconSize} />
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
