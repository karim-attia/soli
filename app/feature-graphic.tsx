import React, { useMemo, useState } from 'react'
import { Button, Paragraph, Stack, Text, XStack, YStack } from 'tamagui'
import { Image } from '@tamagui/image'
import type { ImageSourcePropType } from 'react-native'

import type { Card, Rank, Suit } from '../src/solitaire/klondike'
import type { CardMetrics } from '../src/features/klondike/types'
import { CardVisual } from '../src/features/klondike/components/cards/CardView'
import { FeltBackground } from '../src/features/klondike/components/FeltBackground'
import { StatisticsHud } from '../src/features/klondike/components/StatisticsHud'
import { CelebrationDebugBadge } from '../src/features/klondike/components/CelebrationDebugBadge'
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
const FEATURE_SAFE_MARGIN_RATIO = 0.15
const SAFE_MARGIN_X = Math.round(FEATURE_WIDTH * FEATURE_SAFE_MARGIN_RATIO)
const SAFE_MARGIN_Y = Math.round(FEATURE_HEIGHT * FEATURE_SAFE_MARGIN_RATIO)
const SAFE_WIDTH = FEATURE_WIDTH - SAFE_MARGIN_X * 2
const SAFE_HEIGHT = FEATURE_HEIGHT - SAFE_MARGIN_Y * 2
const SAFE_INNER_PADDING = 36
const SAFE_CONTENT_WIDTH = SAFE_WIDTH - SAFE_INNER_PADDING * 2

const BENEFITS = ['Free & no ads', 'Solvable games', 'Quick undo time travel through game']
const ICON_SOURCE: ImageSourcePropType = require('../assets/images/icon.png')

type FeatureVariant = 'calm' | 'timeline' | 'triumph'

type VariantCopy = {
  headline: string
  subtitle: string
  body: string
}

type VariantContext = {
  cardMetrics: CardMetrics
  cascadeGap: number
  wasteFanOffset: number
  iconBadge: React.ReactNode
  benefitList: React.ReactNode
  copy: VariantCopy
  contentWidth: number
}

const VARIANT_CHOICES: Array<{ id: FeatureVariant; label: string }> = [
  { id: 'calm', label: 'Calm Tabletop' },
  { id: 'timeline', label: 'Timeline Spotlight' },
  { id: 'triumph', label: 'Foundation Triumph' },
]

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
  [createCard('hearts', 13, 'c1'), createCard('clubs', 12, 'c1'), createCard('hearts', 11, 'c1'), createCard('clubs', 10, 'c1')],
  [createCard('diamonds', 9, 'c2'), createCard('clubs', 8, 'c2'), createCard('diamonds', 7, 'c2'), createCard('clubs', 6, 'c2')],
  [createCard('spades', 5, 'c3'), createCard('hearts', 4, 'c3'), createCard('spades', 3, 'c3')],
  [createCard('diamonds', 12, 'c4'), createCard('spades', 11, 'c4'), createCard('diamonds', 10, 'c4')],
]

const WASTE_FAN_CARDS: Card[] = [
  createCard('spades', 7, 'w1'),
  createCard('hearts', 6, 'w2'),
  createCard('clubs', 5, 'w3'),
]

const TIMELINE_PROGRESS_CARDS: Card[] = [
  createCard('clubs', 4, 'timeline-one'),
  createCard('hearts', 5, 'timeline-two'),
  createCard('spades', 6, 'timeline-three'),
]

const FOUNDATION_DIAMOND: Card[] = [
  createCard('hearts', 13, 'diamond-top'),
  createCard('diamonds', 12, 'diamond-left'),
  createCard('spades', 12, 'diamond-right'),
  createCard('clubs', 11, 'diamond-bottom'),
]

const BENEFIT_ROWS = [
  { label: 'Moves', value: '12' },
  { label: 'Time', value: '01:42' },
]

const BenefitList = ({ textColor, bulletColor }: { textColor: string; bulletColor: string }) => (
  <YStack gap="$2">
    {BENEFITS.map((benefit) => (
      <XStack key={benefit} alignItems="center" gap="$3">
        <Stack width={10} height={10} borderRadius={999} backgroundColor={bulletColor} />
        <Text fontSize={20} color={textColor}>
          {benefit}
        </Text>
      </XStack>
    ))}
  </YStack>
)

const IconBadge = () => (
  <Stack
    width={140}
    height={140}
    borderRadius={36}
    backgroundColor="rgba(15, 23, 42, 0.35)"
    alignItems="center"
    justifyContent="center"
    style={{
      shadowColor: 'rgba(0, 0, 0, 0.35)',
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    }}
  >
    <Image source={ICON_SOURCE} style={{ width: 110, height: 110, borderRadius: 24 }} resizeMode="contain" />
  </Stack>
)

const TableauPreviewColumn = ({ cards, metrics, gap }: { cards: Card[]; metrics: CardMetrics; gap: number }) => (
  <Stack width={metrics.width} height={metrics.height + (cards.length - 1) * gap} position="relative">
    {cards.map((card, index) => (
      <Stack
        key={card.id}
        position="absolute"
        top={index * gap}
        width={metrics.width}
        height={metrics.height}
        style={{
          shadowColor: 'rgba(15, 23, 42, 0.4)',
          shadowOpacity: 0.4,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <CardVisual card={card} metrics={metrics} />
      </Stack>
    ))}
  </Stack>
)

const WastePreview = ({ cards, metrics, horizontalOffset }: { cards: Card[]; metrics: CardMetrics; horizontalOffset: number }) => (
  <Stack width={metrics.width + horizontalOffset * (cards.length - 1)} height={metrics.height} position="relative">
    {cards.map((card, index) => (
      <Stack
        key={card.id}
        position="absolute"
        left={index * horizontalOffset}
        width={metrics.width}
        height={metrics.height}
        style={{
          shadowColor: 'rgba(15, 23, 42, 0.4)',
          shadowOpacity: 0.4,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
        }}
      >
        <CardVisual card={card} metrics={metrics} />
      </Stack>
    ))}
  </Stack>
)

const TimelineStack = ({ cards, metrics }: { cards: Card[]; metrics: CardMetrics }) => (
  <YStack position="relative" alignItems="center" justifyContent="center" width={metrics.width * 1.6}>
    <Stack
      width={4}
      height="100%"
      backgroundColor="rgba(148, 163, 184, 0.35)"
      borderRadius={999}
    />
    {cards.map((card, index) => (
      <Stack
        key={card.id}
        position="absolute"
        top={index * (metrics.height + 18)}
        width={metrics.width}
        height={metrics.height}
        style={{
          transform: [{ rotate: `${-6 + index * 6}deg` }],
          shadowColor: 'rgba(15, 23, 42, 0.5)',
          shadowOpacity: 0.5,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        }}
      >
        <CardVisual card={card} metrics={metrics} />
      </Stack>
    ))}
  </YStack>
)

const FoundationDiamond = ({ cards, metrics }: { cards: Card[]; metrics: CardMetrics }) => {
  const offsets = [
    { top: -(metrics.height / 2), left: 0, rotate: '0deg' },
    { top: 0, left: -(metrics.width / 2), rotate: '-8deg' },
    { top: 0, left: metrics.width / 2, rotate: '8deg' },
    { top: metrics.height / 2, left: 0, rotate: '0deg' },
  ]

  return (
    <Stack width={metrics.width * 2} height={metrics.height * 2} position="relative">
      {cards.map((card, index) => (
        <Stack
          key={card.id}
          position="absolute"
          left={offsets[index]?.left ?? 0}
          top={offsets[index]?.top ?? 0}
          width={metrics.width}
          height={metrics.height}
          alignItems="center"
          justifyContent="center"
          style={{
            transform: [{ rotate: offsets[index]?.rotate ?? '0deg' }],
            shadowColor: 'rgba(0, 0, 0, 0.35)',
            shadowOpacity: 0.35,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
          <CardVisual card={card} metrics={metrics} />
        </Stack>
      ))}
    </Stack>
  )
}

const SafeFrameOverlay = () => (
  <Stack
    pointerEvents="none"
    position="absolute"
    left={SAFE_MARGIN_X}
    top={SAFE_MARGIN_Y}
    width={SAFE_WIDTH}
    height={SAFE_HEIGHT}
    borderColor="rgba(255, 255, 255, 0.35)"
    borderWidth={2}
    borderStyle="dashed"
  />
)

const variantCopyMap: Record<FeatureVariant, VariantCopy> = {
  calm: {
    headline: 'Soli',
    subtitle: 'Calm solitaire built for satisfying wins.',
    body: 'Capture every shuffle with the felt you know, without ads or clutter.',
  },
  timeline: {
    headline: 'Time-travel through every deal',
    subtitle: 'Scrub mistakes away in seconds.',
    body: 'Timeline undo keeps streaks alive while solvable shuffles guarantee a win path.',
  },
  triumph: {
    headline: 'Celebrate every foundation finish',
    subtitle: 'Elevated visuals meet deterministic wins.',
    body: 'Iconic card cascades showcase solvable layouts, topped with ad-free clarity.',
  },
}

export default function FeatureGraphicScreen() {
  const [variant, setVariant] = useState<FeatureVariant>('calm')
  const [showSafeFrame, setShowSafeFrame] = useState(false)

  const cardMetrics = useMemo<CardMetrics>(() => {
    if (variant === 'timeline') {
      const width = 82
      const height = Math.round(width * CARD_ASPECT_RATIO)
      return {
        width,
        height,
        stackOffset: Math.round(BASE_STACK_OFFSET * 1.02),
        radius: 12,
      }
    }
    if (variant === 'triumph') {
      const width = 86
      const height = Math.round(width * CARD_ASPECT_RATIO)
      return {
        width,
        height,
        stackOffset: Math.round(BASE_STACK_OFFSET * 1.08),
        radius: 13,
      }
    }
    const width = 96
    const height = Math.round(width * CARD_ASPECT_RATIO)
    return {
      width,
      height,
      stackOffset: Math.round(BASE_STACK_OFFSET * 1.15),
      radius: 14,
    }
  }, [variant])

  const cascadeGap = Math.round(cardMetrics.stackOffset * 0.85)
  const wasteFanOffset = Math.round(cardMetrics.width * (1 - WASTE_FAN_OVERLAP_RATIO))

  const iconBadge = useMemo(() => <IconBadge />, [])
  const benefitList = useMemo(
    () => <BenefitList textColor={COLOR_FELT_TEXT_PRIMARY} bulletColor={COLOR_FELT_TEXT_PRIMARY} />,
    [],
  )

  const variantContext: VariantContext = {
    cardMetrics,
    cascadeGap,
    wasteFanOffset,
    iconBadge,
    benefitList,
    copy: variantCopyMap[variant],
    contentWidth: SAFE_CONTENT_WIDTH,
  }

  return (
    <YStack flex={1} backgroundColor="#041109" padding="$5" gap="$4">
      <XStack alignItems="center" justifyContent="space-between">
        <XStack gap="$2">
          {VARIANT_CHOICES.map((choice) => (
            <Button
              key={choice.id}
              size="$3"
              variant={choice.id === variant ? 'solid' : 'outlined'}
              onPress={() => setVariant(choice.id)}
            >
              {choice.label}
            </Button>
          ))}
        </XStack>
        <Button size="$2" variant="outlined" onPress={() => setShowSafeFrame((prev) => !prev)}>
          {showSafeFrame ? 'Hide safe frame' : 'Show safe frame'}
        </Button>
      </XStack>

      <Stack
        width={FEATURE_WIDTH}
        height={FEATURE_HEIGHT}
        alignSelf="center"
        backgroundColor={COLOR_FELT_LIGHT}
        overflow="hidden"
        paddingLeft={SAFE_MARGIN_X}
        paddingRight={SAFE_MARGIN_X}
        paddingTop={SAFE_MARGIN_Y}
        paddingBottom={SAFE_MARGIN_Y}
      >
        {/* Safe-area padding derived from Task 24-1 (15% bleed documented). */}
        <FeltBackground />
        <Stack flex={1} padding={SAFE_INNER_PADDING} gap="$4">
          {renderVariant(variant, variantContext)}
        </Stack>
        {showSafeFrame ? <SafeFrameOverlay /> : null}
      </Stack>
    </YStack>
  )
}

const renderVariant = (variant: FeatureVariant, context: VariantContext) => {
  switch (variant) {
    case 'timeline':
      return renderTimelineVariant(context)
    case 'triumph':
      return renderTriumphVariant(context)
    case 'calm':
    default:
      return renderCalmVariant(context)
  }
}

const renderCalmVariant = (context: VariantContext) => {
  const { cardMetrics, cascadeGap, wasteFanOffset, iconBadge, benefitList, copy, contentWidth } = context
  const infoWidth = Math.max(260, Math.round(contentWidth * 0.34))

  return (
    <XStack width="100%" maxWidth={contentWidth} alignSelf="center" gap="$6" alignItems="center">
      <YStack
        flex={1}
        gap="$4"
        padding="$4"
        borderRadius={32}
        backgroundColor="rgba(12, 60, 40, 0.28)"
        borderWidth={1}
        borderColor="rgba(255, 255, 255, 0.06)"
        shadowColor="rgba(4, 17, 9, 0.45)"
        shadowOpacity={0.45}
        shadowRadius={22}
        shadowOffset={{ width: 0, height: 8 }}
      >
        <XStack gap="$4" alignItems="flex-end" justifyContent="space-between">
          <WastePreview cards={WASTE_FAN_CARDS} metrics={cardMetrics} horizontalOffset={wasteFanOffset} />
          <XStack gap="$3">
            {FOUNDATION_CARDS.map((card, index) => (
              <Stack
                key={card.id}
                width={cardMetrics.width}
                height={cardMetrics.height}
                style={{
                  transform: [{ rotate: `${index === 1 ? '-4' : index === 2 ? '4' : '0'}deg` }],
                  shadowColor: 'rgba(15, 23, 42, 0.45)',
                  shadowOpacity: 0.45,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                }}
              >
                <CardVisual card={card} metrics={cardMetrics} />
              </Stack>
            ))}
          </XStack>
        </XStack>
        <Stack height={2} borderRadius={999} backgroundColor="rgba(226, 242, 217, 0.12)" />
        <XStack gap="$4" alignItems="flex-start" justifyContent="space-between">
          {TABLEAU_COLUMNS.map((column, columnIndex) => (
            <TableauPreviewColumn
              key={`tableau-${columnIndex}`}
              cards={column}
              metrics={cardMetrics}
              gap={cascadeGap}
            />
          ))}
        </XStack>
      </YStack>
      <YStack width={infoWidth} gap="$4" justifyContent="center">
        {iconBadge}
        <Text fontSize={50} fontWeight="800" color={COLOR_FELT_TEXT_PRIMARY} letterSpacing={1.4}>
          {copy.headline}
        </Text>
        <Paragraph fontSize={20} color={COLOR_FELT_TEXT_SECONDARY}>
          {copy.subtitle}
        </Paragraph>
        <Paragraph fontSize={18} color="rgba(226, 242, 217, 0.88)">
          {copy.body}
        </Paragraph>
        {benefitList}
        <Stack marginTop="$3">
          <StatisticsHud rows={BENEFIT_ROWS} />
        </Stack>
      </YStack>
    </XStack>
  )
}

const renderTimelineVariant = (context: VariantContext) => {
  const { cardMetrics, iconBadge, benefitList, copy, contentWidth } = context
  const infoWidth = Math.max(280, Math.round(contentWidth * 0.38))

  return (
    <XStack width="100%" maxWidth={contentWidth} alignSelf="center" gap="$6" alignItems="center">
      <YStack
        flex={1}
        gap="$4"
        padding="$5"
        borderRadius={36}
        backgroundColor="rgba(6, 38, 26, 0.35)"
        borderWidth={1}
        borderColor="rgba(12, 82, 52, 0.3)"
        shadowColor="rgba(4, 17, 9, 0.55)"
        shadowOpacity={0.55}
        shadowRadius={26}
        shadowOffset={{ width: 0, height: 10 }}
      >
        <XStack gap="$5" alignItems="center" justifyContent="space-between">
          <TimelineStack cards={TIMELINE_PROGRESS_CARDS} metrics={cardMetrics} />
          <Stack flex={1} height={cardMetrics.height * 2.8} position="relative">
            {TIMELINE_PROGRESS_CARDS.map((card, index) => (
              <Stack
                key={`timeline-focus-${card.id}`}
                position="absolute"
                top={index * 40}
                left={index * 36}
                width={cardMetrics.width}
                height={cardMetrics.height}
                style={{
                  transform: [{ rotate: `${-10 + index * 8}deg` }],
                  shadowColor: 'rgba(0, 0, 0, 0.45)',
                  shadowOpacity: 0.45,
                  shadowRadius: 18,
                  shadowOffset: { width: 0, height: 10 },
                }}
              >
                <CardVisual card={card} metrics={cardMetrics} />
              </Stack>
            ))}
            <Stack
              position="absolute"
              bottom={-24}
              left={0}
              right={0}
              height={68}
              borderRadius={18}
              backgroundColor="rgba(15, 23, 42, 0.8)"
              alignItems="center"
              justifyContent="center"
              style={{ borderWidth: 1, borderColor: 'rgba(226, 242, 217, 0.4)' }}
            >
              <Text color="#f8fafc" fontSize={18} fontWeight="600">
                Timeline undo preview
              </Text>
              <Paragraph color="rgba(226, 242, 217, 0.75)" fontSize={14}>
                Scrub to any move instantly
              </Paragraph>
            </Stack>
          </Stack>
        </XStack>
      </YStack>
      <YStack width={infoWidth} gap="$3">
        {iconBadge}
        <Text fontSize={44} fontWeight="800" color={COLOR_FELT_TEXT_PRIMARY} letterSpacing={0.8}>
          {copy.headline}
        </Text>
        <Paragraph fontSize={20} color={COLOR_FELT_TEXT_SECONDARY}>
          {copy.subtitle}
        </Paragraph>
        <Paragraph fontSize={18} color="rgba(226, 242, 217, 0.88)">
          {copy.body}
        </Paragraph>
        <Stack
          alignSelf="flex-start"
          paddingHorizontal={18}
          paddingVertical={8}
          borderRadius={999}
          backgroundColor="rgba(15, 23, 42, 0.88)"
          style={{ borderWidth: 1, borderColor: 'rgba(226, 242, 217, 0.5)' }}
        >
          <Text color={COLOR_FELT_TEXT_PRIMARY} fontSize={16} fontWeight="700">
            Free • No ads
          </Text>
        </Stack>
        {benefitList}
        <Stack marginTop="$3">
          <StatisticsHud rows={BENEFIT_ROWS} />
        </Stack>
      </YStack>
    </XStack>
  )
}

const renderTriumphVariant = (context: VariantContext) => {
  const { cardMetrics, iconBadge, benefitList, copy, contentWidth } = context
  const infoWidth = Math.max(260, Math.round(contentWidth * 0.32))

  return (
    <XStack width="100%" maxWidth={contentWidth} alignSelf="center" gap="$6" alignItems="center">
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap="$4"
        padding="$5"
        borderRadius={44}
        backgroundColor="rgba(255, 255, 255, 0.06)"
        borderWidth={1}
        borderColor="rgba(226, 242, 217, 0.2)"
        shadowColor="rgba(4, 17, 9, 0.5)"
        shadowOpacity={0.5}
        shadowRadius={24}
        shadowOffset={{ width: 0, height: 10 }}
      >
        <FoundationDiamond cards={FOUNDATION_DIAMOND} metrics={cardMetrics} />
        <Stack
          paddingHorizontal={24}
          paddingVertical={12}
          borderRadius={28}
          backgroundColor="rgba(15, 23, 42, 0.78)"
          style={{ borderWidth: 1, borderColor: 'rgba(226, 242, 217, 0.4)' }}
        >
          <Text color="#f8fafc" fontSize={18} fontWeight="700">
            Solvable decks. Celebratory finishes.
          </Text>
        </Stack>
        <CelebrationDebugBadge label="Celebration mode: Ribbon Cascade" />
      </YStack>
      <YStack width={infoWidth} gap="$3">
        {iconBadge}
        <Text fontSize={42} fontWeight="800" color={COLOR_FELT_TEXT_PRIMARY} letterSpacing={0.9}>
          {copy.headline}
        </Text>
        <Paragraph fontSize={20} color={COLOR_FELT_TEXT_SECONDARY}>
          {copy.subtitle}
        </Paragraph>
        <Paragraph fontSize={18} color="rgba(226, 242, 217, 0.88)">
          {copy.body}
        </Paragraph>
        {benefitList}
        <Stack marginTop="$3">
          <StatisticsHud rows={BENEFIT_ROWS} />
        </Stack>
      </YStack>
    </XStack>
  )
}
