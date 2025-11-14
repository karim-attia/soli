// @ts-nocheck
import React, { useMemo } from 'react'
import { Stack, Text, XStack, YStack } from 'tamagui'
import { Image } from '@tamagui/image'

import type { Card, Rank, Suit } from '../src/solitaire/klondike'
import type { CardMetrics } from '../src/features/klondike/types'
import { CardVisual } from '../src/features/klondike/components/cards/CardView'
import { FeltBackground } from '../src/features/klondike/components/FeltBackground'
import {
  BASE_STACK_OFFSET,
  CARD_ASPECT_RATIO,
  COLOR_FELT_LIGHT,
  COLOR_FELT_TEXT_PRIMARY,
  COLOR_FELT_TEXT_SECONDARY,
  WASTE_FAN_OVERLAP_RATIO,
} from '../src/features/klondike/constants'

const FEATURE_WIDTH = 1024
const FEATURE_HEIGHT = 500
const SAFE_MARGIN_X = Math.round(FEATURE_WIDTH * 0.15)
const SAFE_MARGIN_Y = Math.round(FEATURE_HEIGHT * 0.15)
const SAFE_WIDTH = FEATURE_WIDTH - SAFE_MARGIN_X * 2
const BENEFITS = ['Free & no ads', 'Solvable games', 'Quick undo time travel through game']
const ICON_SOURCE = require('../assets/images/icon.png')

const createCard = (suit: Suit, rank: Rank, suffix: string): Card => ({
  id: `feature-${suit}-${rank}-${suffix}`,
  suit,
  rank,
  faceUp: true,
})

const FOUNDATION_CARDS: Card[] = [
  createCard('hearts', 1, 'foundation'),
  createCard('diamonds', 1, 'foundation'),
  createCard('clubs', 1, 'foundation'),
  createCard('spades', 1, 'foundation'),
]

const TABLEAU_COLUMNS: Card[][] = [
  [
    createCard('hearts', 13, 'c1'),
    createCard('clubs', 12, 'c1'),
    createCard('hearts', 11, 'c1'),
    createCard('clubs', 10, 'c1'),
  ],
  [
    createCard('diamonds', 9, 'c2'),
    createCard('clubs', 8, 'c2'),
    createCard('diamonds', 7, 'c2'),
    createCard('clubs', 6, 'c2'),
  ],
  [
    createCard('spades', 5, 'c3'),
    createCard('hearts', 4, 'c3'),
    createCard('spades', 3, 'c3'),
  ],
  [
    createCard('diamonds', 12, 'c4'),
    createCard('spades', 11, 'c4'),
    createCard('diamonds', 10, 'c4'),
  ],
]

const WASTE_FAN_CARDS: Card[] = [
  createCard('spades', 7, 'w1'),
  createCard('hearts', 6, 'w2'),
  createCard('clubs', 5, 'w3'),
]

type TableauPreviewColumnProps = {
  cards: Card[]
  metrics: CardMetrics
  gap: number
}

type WastePreviewProps = {
  cards: Card[]
  metrics: CardMetrics
  horizontalOffset: number
}

const TableauPreviewColumn = ({ cards, metrics, gap }: TableauPreviewColumnProps) => {
  const columnHeight = metrics.height + (cards.length - 1) * gap

  return (
    <Stack width={metrics.width} height={columnHeight} position="relative">
      {cards.map((card, index) => (
        <Stack
          key={card.id}
          position="absolute"
          top={index * gap}
          width={metrics.width}
          height={metrics.height}
        >
          <CardVisual card={card} metrics={metrics} />
        </Stack>
      ))}
    </Stack>
  )
}

const WastePreview = ({ cards, metrics, horizontalOffset }: WastePreviewProps) => {
  const width = metrics.width + horizontalOffset * (cards.length - 1)

  return (
    <Stack width={width} height={metrics.height} position="relative">
      {cards.map((card, index) => (
        <Stack
          key={card.id}
          position="absolute"
          left={index * horizontalOffset}
          width={metrics.width}
          height={metrics.height}
        >
          <CardVisual card={card} metrics={metrics} />
        </Stack>
      ))}
    </Stack>
  )
}

export default function FeatureGraphicScreen() {
  const cardMetrics = useMemo<CardMetrics>(() => {
    const width = 96
    const height = Math.round(width * CARD_ASPECT_RATIO)

    return {
      width,
      height,
      stackOffset: Math.round(BASE_STACK_OFFSET * 1.15),
      radius: 14,
    }
  }, [])

  const cascadeGap = Math.round(cardMetrics.stackOffset * 0.85)
  const wasteFanOffset = Math.round(cardMetrics.width * (1 - WASTE_FAN_OVERLAP_RATIO))

  return (
    <YStack flex={1} alignItems="center" justifyContent="center" backgroundColor="#0b1d0d" padding="$6">
      <Stack
        width={FEATURE_WIDTH}
        height={FEATURE_HEIGHT}
        backgroundColor={COLOR_FELT_LIGHT}
        overflow="hidden"
        paddingLeft={SAFE_MARGIN_X}
        paddingRight={SAFE_MARGIN_X}
        paddingTop={SAFE_MARGIN_Y}
        paddingBottom={SAFE_MARGIN_Y}
      >
        {/* Safe area padding per Task 24-1: keep 15% bleed for Play Store cropping. */}
        <FeltBackground />
        <XStack flex={1} gap="$6" alignItems="stretch">
          <YStack flex={1} justifyContent="center" gap="$6">
            <XStack gap="$4" alignItems="flex-end">
              <WastePreview cards={WASTE_FAN_CARDS} metrics={cardMetrics} horizontalOffset={wasteFanOffset} />
              <XStack gap="$3">
                {FOUNDATION_CARDS.map((card) => (
                  <Stack key={card.id} width={cardMetrics.width} height={cardMetrics.height}>
                    <CardVisual card={card} metrics={cardMetrics} />
                  </Stack>
                ))}
              </XStack>
            </XStack>
            <XStack gap="$5" alignItems="flex-start">
              {TABLEAU_COLUMNS.map((column, columnIndex) => (
                <TableauPreviewColumn key={`tableau-${columnIndex}`} cards={column} metrics={cardMetrics} gap={cascadeGap} />
              ))}
            </XStack>
          </YStack>
          <YStack width={Math.max(240, Math.round(SAFE_WIDTH * 0.3))} gap="$4" justifyContent="center">
            <Stack width={136} height={136} borderRadius={32} backgroundColor="rgba(15, 23, 42, 0.35)" alignItems="center" justifyContent="center">
              <Image
                source={ICON_SOURCE}
                style={{ width: 112, height: 112, borderRadius: 24 }}
                resizeMode="contain"
              />
            </Stack>
            <Text fontSize={44} fontWeight="700" color={COLOR_FELT_TEXT_PRIMARY} letterSpacing={1.2}>
              Soli
            </Text>
            <Text fontSize={20} color={COLOR_FELT_TEXT_SECONDARY}>
              Calm solitaire built to showcase every shuffle with zero clutter.
            </Text>
            {/* Required benefits copy from request. */}
            <YStack gap="$2">
              {BENEFITS.map((benefit) => (
                <XStack key={benefit} alignItems="center" gap="$3">
                  <Stack width={10} height={10} borderRadius={999} backgroundColor={COLOR_FELT_TEXT_PRIMARY} />
                  <Text fontSize={20} color={COLOR_FELT_TEXT_PRIMARY}>
                    {benefit}
                  </Text>
                </XStack>
              ))}
            </YStack>
          </YStack>
        </XStack>
      </Stack>
    </YStack>
  )
}
