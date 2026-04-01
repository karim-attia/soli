import React from 'react'
import { Pressable, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { Text } from 'tamagui'
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated'
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
  WIN_CLEANUP_OUTLINE_FADE_TIMING,
} from '../../constants'
import type {
  CardFlightRegistry,
  CardMetrics,
  CelebrationBindings,
  InvalidWiggleConfig,
} from '../../types'
import { useCardAnimations } from './animations'
import { AnimatedView } from './common'
import {
  CARD_CENTER_SUIT_FONT_WEIGHT,
  CARD_RANK_FONT_FAMILY,
  CARD_RANK_FONT_WEIGHT,
  CARD_SUIT_FONT_FAMILY,
  CARD_SUIT_FONT_WEIGHT,
} from './fonts'
import { styles } from './styles'
import { rankToLabel } from './utils'

const CARD_PADDING_HORIZONTAL = 4
const CARD_PADDING_VERTICAL = 6
const CARD_CORNER_RANK_TOP = -2
const CARD_CORNER_RANK_LEFT = 3
const CARD_CORNER_RANK_FONT = 16
const CARD_CORNER_SUIT_TOP = 1
const CARD_CORNER_SUIT_RIGHT = 2
const CARD_CORNER_SUIT_FONT = 11
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

const areCardMetricsEqual = (previous: CardMetrics, next: CardMetrics): boolean => {
  return (
    previous.width === next.width &&
    previous.height === next.height &&
    previous.stackOffset === next.stackOffset &&
    previous.radius === next.radius
  )
}

const areCardsEquivalent = (previous: Card, next: Card): boolean => {
  return (
    previous.id === next.id &&
    previous.suit === next.suit &&
    previous.rank === next.rank &&
    previous.faceUp === next.faceUp
  )
}

export type CardVisualProps = {
  card: Card
  metrics: CardMetrics
  onPress?: () => void
  disabled?: boolean
}

const CardVisualComponent = ({ card, metrics, onPress, disabled }: CardVisualProps) => {
  // PBI-25: keep cards proportional via a single reference scale
  const cardScale = deriveCardScale(metrics)
  const scaleValue = (value: number) => value * cardScale
  const paddingHorizontal = scaleValue(CARD_PADDING_HORIZONTAL)
  const paddingVertical = scaleValue(CARD_PADDING_VERTICAL)
  const cornerRankStyle = {
    top: scaleValue(CARD_CORNER_RANK_TOP),
    left: scaleValue(CARD_CORNER_RANK_LEFT),
    fontSize: scaleValue(CARD_CORNER_RANK_FONT),
    fontFamily: CARD_RANK_FONT_FAMILY,
    fontWeight: CARD_RANK_FONT_WEIGHT,
  }
  const cornerSuitStyle = {
    top: scaleValue(CARD_CORNER_SUIT_TOP),
    right: scaleValue(CARD_CORNER_SUIT_RIGHT),
    fontSize: scaleValue(CARD_CORNER_SUIT_FONT),
    fontFamily: CARD_SUIT_FONT_FAMILY,
    fontWeight: CARD_SUIT_FONT_WEIGHT,
  }
  const centerSymbolStyle = {
    fontSize: scaleValue(CARD_SYMBOL_FONT),
    marginTop: scaleValue(CARD_SYMBOL_MARGIN_TOP),
    fontFamily: CARD_SUIT_FONT_FAMILY,
    fontWeight: CARD_CENTER_SUIT_FONT_WEIGHT,
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
        style={[
          styles.cardCornerRank,
          cornerRankStyle,
          { color: SUIT_COLORS[card.suit] },
        ]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {rankToLabel(card.rank)}
      </Text>
      {/* Small suit symbol | top right */}
      <Text
        style={[
          styles.cardCornerSuit,
          cornerSuitStyle,
          { color: SUIT_COLORS[card.suit] },
        ]}
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

export const CardVisual = React.memo(
  CardVisualComponent,
  (previous, next) =>
    areCardsEquivalent(previous.card, next.card) &&
    areCardMetricsEqual(previous.metrics, next.metrics) &&
    Boolean(previous.onPress) === Boolean(next.onPress) &&
    previous.disabled === next.disabled
)

export type CardViewProps = {
  card: Card
  metrics: CardMetrics
  offsetTop?: number
  offsetLeft?: number
  isSelected?: boolean
  suppressFlightOnFaceUpChange?: boolean
  onPress?: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  // requirement 20-6: During undo scrubbing, disable layout tracking to reduce native churn.
  // Card onLayout → measure() → shared value updates can be extremely noisy during rapid SCRUB_TO_INDEX commits.
  layoutTrackingEnabled?: boolean
  onCardMeasured?: (cardId: string, snapshot: CardFlightSnapshot) => void
  onFlightSettled?: (cardId: string) => void
  cardFlightMemory?: Record<string, CardFlightSnapshot>
  celebrationBindings?: CelebrationBindings
}

const CardViewComponent = ({
  card,
  metrics,
  offsetTop,
  offsetLeft,
  isSelected,
  suppressFlightOnFaceUpChange,
  onPress,
  invalidWiggle,
  cardFlights,
  layoutTrackingEnabled = true,
  onCardMeasured,
  onFlightSettled,
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
    suppressFlightOnFaceUpChange,
    invalidWiggle,
    cardFlights,
    cardFlightMemory,
    onCardMeasured,
    onFlightSettled,
    celebrationBindings,
  })

  const frontContent = (
    <CardVisual card={card} metrics={metrics} onPress={onPress} disabled={!onPress} />
  )

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

export const CardView = React.memo(CardViewComponent, (previous, next) => {
  const previousWiggleActive = previous.invalidWiggle.lookup.has(previous.card.id)
  const nextWiggleActive = next.invalidWiggle.lookup.has(next.card.id)

  return (
    areCardsEquivalent(previous.card, next.card) &&
    areCardMetricsEqual(previous.metrics, next.metrics) &&
    previous.offsetTop === next.offsetTop &&
    previous.offsetLeft === next.offsetLeft &&
    previous.isSelected === next.isSelected &&
    previous.suppressFlightOnFaceUpChange === next.suppressFlightOnFaceUpChange &&
    Boolean(previous.onPress) === Boolean(next.onPress) &&
    previous.layoutTrackingEnabled === next.layoutTrackingEnabled &&
    previous.cardFlights === next.cardFlights &&
    previous.cardFlightMemory === next.cardFlightMemory &&
    previous.onCardMeasured === next.onCardMeasured &&
    previous.onFlightSettled === next.onFlightSettled &&
    previous.celebrationBindings === next.celebrationBindings &&
    previousWiggleActive === nextWiggleActive &&
    (!previousWiggleActive || previous.invalidWiggle.key === next.invalidWiggle.key)
  )
})

export type CardBackProps = {
  label?: string
  metrics: CardMetrics
  variant: 'stock' | 'recycle' | 'empty'
}

const CardBackComponent = ({ label, metrics, variant }: CardBackProps) => {
  const containerStyle: StyleProp<ViewStyle> = [
    variant === 'stock'
      ? styles.cardBack
      : [
          styles.cardBackOutline,
          variant === 'recycle' ? styles.cardBackRecycle : styles.cardBackEmpty,
        ],
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

export const CardBack = React.memo(
  CardBackComponent,
  (previous, next) =>
    previous.label === next.label &&
    previous.variant === next.variant &&
    areCardMetricsEqual(previous.metrics, next.metrics)
)

const EmptySlotComponent = ({
  label,
  highlight,
  hidden = false,
  metrics,
}: {
  label?: string
  highlight: boolean
  hidden?: boolean
  metrics: CardMetrics
}) => {
  const animatedStyle = useAnimatedStyle(
    () => ({
      opacity: withTiming(hidden ? 0 : 1, WIN_CLEANUP_OUTLINE_FADE_TIMING),
      transform: [
        {
          scale: withTiming(hidden ? 0.985 : 1, WIN_CLEANUP_OUTLINE_FADE_TIMING),
        },
      ],
    }),
    [hidden]
  )

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.emptySlot,
        animatedStyle,
        {
          width: metrics.width,
          height: metrics.height,
          borderRadius: metrics.radius,
          borderColor: highlight ? COLOR_DROP_BORDER : COLOR_COLUMN_BORDER,
        },
      ]}
    >
      {!!label && <Text style={styles.emptyLabel}>{label}</Text>}
    </Animated.View>
  )
}

export const EmptySlot = React.memo(
  EmptySlotComponent,
  (previous, next) =>
    previous.label === next.label &&
    previous.highlight === next.highlight &&
    previous.hidden === next.hidden &&
    areCardMetricsEqual(previous.metrics, next.metrics)
)
