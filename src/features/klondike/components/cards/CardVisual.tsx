import React, { useEffect, useRef } from 'react'
import {
  Animated as NativeAnimated,
  Easing as NativeEasing,
  Pressable,
  Text,
  View,
} from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { Ban, RefreshCcw } from 'lucide-react-native'

import type { Card } from '../../../../solitaire/klondike'
import {
  CARD_REFERENCE_HEIGHT,
  CARD_REFERENCE_WIDTH,
  COLOR_CARD_BORDER,
  COLOR_COLUMN_BORDER,
  COLOR_DROP_BORDER,
  SUIT_COLORS,
  SUIT_SYMBOLS,
  WIN_CLEANUP_OUTLINE_FADE_DURATION_MS,
} from '../../constants'
import type { CardMetrics } from '../../types'
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

export type CardVisualProps = {
  // Structural pick so BoardPreview (history sheet) can pass id-less preview cards.
  card: Pick<Card, 'suit' | 'rank'>
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

  // Plain RN `Text` (2026-10-18, Tamagui removal): the Tamagui `Text` only ever added a
  // theme colour default, overridden here by the suit colour, and passed `fontFamily`
  // (CardTextAndroid, embedded on both platforms) through untouched — so the glyphs are
  // byte-for-byte the same. Keep `allowFontScaling={false}`: the card contract is
  // geometry-driven (cardScale), never OS font scale.
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

export type CardBackProps = {
  label?: string
  // Small text under the recycle icon ("2 left" on Vegas-rules games).
  caption?: string
  metrics: CardMetrics
  // 'exhausted' (Vegas pass limits): stock empty, waste non-empty, no recycle
  // left — same dashed outline as 'recycle' with a circle-slash instead of the
  // recycle arrows. A mark on the slot, no modal: the player can still play
  // waste/tableau cards and undo gives the pass back.
  variant: 'stock' | 'recycle' | 'empty' | 'exhausted'
}

export const CardBack = ({ label, caption, metrics, variant }: CardBackProps) => {
  const containerStyle: StyleProp<ViewStyle> = [
    variant === 'stock'
      ? styles.cardBack
      : [
          styles.cardBackOutline,
          variant === 'empty' ? styles.cardBackEmpty : styles.cardBackRecycle,
        ],
    {
      width: metrics.width,
      height: metrics.height,
      borderRadius: metrics.radius,
    },
  ]
  const iconSize = Math.max(16, Math.round(metrics.width * 0.22))

  return (
    <View style={containerStyle}>
      {variant === 'recycle' ? (
        <>
          <RefreshCcw color="#0f172a" size={iconSize} />
          {caption ? <Text style={styles.cardBackCaption}>{caption}</Text> : null}
        </>
      ) : variant === 'exhausted' ? (
        <Ban color="#0f172a" size={iconSize} />
      ) : label ? (
        <Text style={styles.cardBackText}>{label}</Text>
      ) : null}
    </View>
  )
}

export const EmptySlot = ({
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
  const opacity = useRef(new NativeAnimated.Value(hidden ? 0 : 1)).current
  const scale = useRef(new NativeAnimated.Value(hidden ? 0.985 : 1)).current

  useEffect(() => {
    NativeAnimated.parallel([
      NativeAnimated.timing(opacity, {
        toValue: hidden ? 0 : 1,
        duration: WIN_CLEANUP_OUTLINE_FADE_DURATION_MS,
        easing: NativeEasing.bezier(0.2, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      NativeAnimated.timing(scale, {
        toValue: hidden ? 0.985 : 1,
        duration: WIN_CLEANUP_OUTLINE_FADE_DURATION_MS,
        easing: NativeEasing.bezier(0.2, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start()
  }, [hidden, opacity, scale])

  return (
    <NativeAnimated.View
      pointerEvents="none"
      style={[
        styles.emptySlot,
        {
          opacity,
          transform: [{ scale }],
        },
        {
          width: metrics.width,
          height: metrics.height,
          borderRadius: metrics.radius,
          borderColor: highlight ? COLOR_DROP_BORDER : COLOR_COLUMN_BORDER,
        },
      ]}
    >
      {!!label && <Text style={styles.emptyLabel}>{label}</Text>}
    </NativeAnimated.View>
  )
}
