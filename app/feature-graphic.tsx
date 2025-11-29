import React, { useMemo, useState } from 'react'
import { ScrollView, useColorScheme } from 'react-native'
import { Button, Paragraph, Stack, Text, XStack, YStack } from 'tamagui'
import { Image } from '@tamagui/image'
import { LinearGradient } from 'expo-linear-gradient'
import type { ImageSourcePropType } from 'react-native'
import { purple } from '@tamagui/colors'

import type { Card, Rank, Suit } from '../src/solitaire/klondike'
import type { CardMetrics } from '../src/features/klondike/types'
import { CardVisual } from '../src/features/klondike/components/cards/CardView'
import { FeltBackground } from '../src/features/klondike/components/FeltBackground'
import {
  BASE_STACK_OFFSET,
  CARD_ASPECT_RATIO,
  COLOR_FELT_LIGHT,
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
const SAFE_CONTENT_HEIGHT = SAFE_HEIGHT - SAFE_INNER_PADDING * 2
const LAYOUT_GAP = 24

const ICON_SOURCE: ImageSourcePropType = require('../assets/images/icon.png')
const BENEFITS = ['Free & no ads', 'Solvable games', 'Undo time travel']

type FeatureVariant = 'badges' | 'icon' | 'premium-badges' | 'badges-remix'

type VariantCopy = {
  headline: string
  subtitle: string
  body: string
}

type Palette = {
  pageBackground: string
  canvasBackground: string
  panelTint: string
  panelBorder: string
  infoBackground: string
  infoBorder: string
  infoTextPrimary: string
  infoTextSecondary: string
  bodyText: string
  bodySubduedText: string
  bullet: string
  accent: string
  safeFrame: string
  iconHalo: string
}

interface StatisticsRow {
  label: string
  value: string
  notes: string
}

interface VariantDefinition {
  id: FeatureVariant
  label: string
  summary: string
  description: string
  copy: VariantCopy
  cardWidth: number
  stackMultiplier: number
  radius: number
  infoWidthRatio?: number
  minInfoWidth?: number
  statsRows?: StatisticsRow[] | null
  showIconInPanel?: boolean
}

interface VariantContext {
  definition: VariantDefinition
  palette: Palette
  cardMetrics: CardMetrics
  cascadeGap: number
  wasteFanOffset: number
  iconBadge: React.ReactNode
  infoWidth: number
  contentWidth: number
}

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

const ICON_RING_CARDS: Card[] = [
  createCard('hearts', 1, 'ring-1'),
  createCard('diamonds', 1, 'ring-2'),
  createCard('clubs', 1, 'ring-3'),
  createCard('spades', 1, 'ring-4'),
  createCard('hearts', 13, 'ring-5'),
  createCard('spades', 13, 'ring-6'),
]


const IconBadge = ({ palette, size = 140 }: { palette: Palette; size?: number }) => {
  const iconSize = Math.round(size * 0.79)
  const iconRadius = Math.round(iconSize * 0.25)
  return (
        <Stack
      width={size}
      height={size}
          alignItems="center"
          justifyContent="center"
          style={{
        shadowColor: 'rgba(4, 17, 9, 0.35)',
            shadowOpacity: 0.35,
        shadowRadius: 16,
            shadowOffset: { width: 0, height: 6 },
          }}
        >
      <Image source={ICON_SOURCE} style={{ width: iconSize, height: iconSize, borderRadius: iconRadius }} resizeMode="contain" />
    </Stack>
  )
}


const SafeFrameOverlay = ({ color }: { color: string }) => (
  <Stack
    pointerEvents="none"
    position="absolute"
    left={SAFE_MARGIN_X}
    top={SAFE_MARGIN_Y}
    width={SAFE_WIDTH}
    height={SAFE_HEIGHT}
    borderColor={color}
    borderWidth={2}
    borderStyle="dashed"
    borderRadius={28}
  />
)



const BadgeHighlightsRightSide = ({ palette, copy }: { palette: Palette; copy: VariantCopy }) => (
  <YStack gap="$4" maxWidth={360}>
    <YStack gap="$2">
      <Text color={palette.infoTextPrimary} fontSize={52} fontWeight="800" letterSpacing={-0.5}>
        {copy.headline}
      </Text>
      <LinearGradient
        colors={[purple.purple9, purple.purple11]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          alignSelf: 'flex-start',
          height: 3,
          width: 60,
          borderRadius: 999,
        }}>
      </LinearGradient>
    </YStack>
    <Paragraph color={palette.infoTextSecondary} fontSize={22} lineHeight={28}>
      {copy.subtitle}
    </Paragraph>
    <YStack gap="$3" paddingTop="$3">
      {BENEFITS.map((benefit) => (
        <LinearGradient
          key={benefit}
          colors={[purple.purple9, purple.purple11]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            padding: 2,
            borderRadius: 16,
          }}
        >
          <Stack
            backgroundColor="#fdfdfc"
            borderRadius={14}
            paddingHorizontal={18}
            paddingVertical={12}
          >
            <XStack alignItems="center" gap="$2.5">
              <Stack width={6} height={6} borderRadius={999} backgroundColor={purple.purple10} />
              <Text fontSize={18} fontWeight="700" color="#0a2817">
                {benefit}
              </Text>
            </XStack>
          </Stack>
        </LinearGradient>
      ))}
    </YStack>
  </YStack>
)

const FixedWidthTwoColumnLayout = ({
  leftContent,
  rightContent,
  leftWidth,
  rightWidth,
  gap = LAYOUT_GAP,
  verticalPadding = "$4"
}: {
  leftContent: React.ReactNode
  rightContent: React.ReactNode
  leftWidth: number
  rightWidth: number
  gap?: number
  verticalPadding?: string
}) => (
  <YStack flex={1} justifyContent="center">
    <XStack
      width="100%"
      maxWidth={leftWidth + rightWidth + gap}
      alignSelf="center"
      gap={gap}
      alignItems="center"
      justifyContent="center"
      style={{ paddingVertical: verticalPadding }}
    >
      <Stack width={leftWidth} alignItems="center">
        {leftContent}
      </Stack>
      <Stack width={rightWidth}>
        {rightContent}
      </Stack>
    </XStack>
  </YStack>
)

const renderBadgesVariant = (ctx: VariantContext) => {
  const { cardMetrics, palette, contentWidth, iconBadge } = ctx

  const SIMPLE_FAN_CARDS: Card[] = [
    createCard('hearts', 13, 'fan-1'),
    createCard('clubs', 1, 'fan-2'),
    createCard('spades', 13, 'fan-3'),
  ]

  const leftSide = (
    <YStack gap="$3" alignItems="center">
      {iconBadge}
      <XStack gap="$2" alignItems="center">
        {SIMPLE_FAN_CARDS.map((card, index) => (
          <Stack
            key={card.id}
            width={cardMetrics.width}
            height={cardMetrics.height}
            style={{
              transform: [{ rotate: `${-8 + index * 8}deg` }],
              shadowColor: 'rgba(15, 23, 42, 0.4)',
              shadowOpacity: 0.4,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 8 },
            }}
          >
            <CardVisual card={card} metrics={cardMetrics} />
          </Stack>
        ))}
      </XStack>
    </YStack>
  )

  const rightSide = <BadgeHighlightsRightSide palette={palette} copy={ctx.definition.copy} />

  return (
    <FixedWidthTwoColumnLayout
      leftContent={leftSide}
      rightContent={rightSide}
      leftWidth={320}
      rightWidth={360}
    />
  )
}



const renderIconVariant = (ctx: VariantContext) => {
  const { cardMetrics, palette, iconBadge, contentWidth } = ctx
  const stageWidth = Math.max(0, SAFE_CONTENT_WIDTH - 360 - LAYOUT_GAP)
  const maxRadius = Math.max(120, (stageWidth - cardMetrics.width - 48) / 2)
  const ringRadius = Math.min(cardMetrics.width * 1.8, maxRadius)
  const diameter = ringRadius * 2 + cardMetrics.width
  const center = diameter / 2

  const leftSide = (
    <YStack
      flex={1}
      alignItems="center"
      justifyContent="center"
      gap="$4"
      padding="$5"
    >
      <Stack width={diameter} height={diameter} position="relative" alignItems="center" justifyContent="center">
        {iconBadge}
        {ICON_RING_CARDS.map((card, index) => {
          const angle = (2 * Math.PI * index) / ICON_RING_CARDS.length
          const x = Math.cos(angle) * ringRadius
          const y = Math.sin(angle) * ringRadius
          return (
            <Stack
              key={card.id}
              position="absolute"
              left={center + x - cardMetrics.width / 2}
              top={center + y - cardMetrics.height / 2}
              width={cardMetrics.width}
              height={cardMetrics.height}
              style={{
                transform: [{ rotate: `${(angle * 180) / Math.PI}deg` }],
                shadowColor: 'rgba(0, 0, 0, 0.32)',
                shadowOpacity: 0.32,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 6 },
              }}
            >
              <CardVisual card={card} metrics={cardMetrics} />
            </Stack>
          )
        })}
      </Stack>
    </YStack>
  )

  const rightSide = <BadgeHighlightsRightSide palette={palette} copy={ctx.definition.copy} />

  return (
    <FixedWidthTwoColumnLayout
      leftContent={leftSide}
      rightContent={rightSide}
      leftWidth={320}
      rightWidth={360}
    />
  )
}

const renderPremiumBadgesVariant = (ctx: VariantContext) => {
  const { cardMetrics, palette, iconBadge } = ctx

  const PREMIUM_FAN_CARDS: Card[] = [
    createCard('spades', 1, 'prem-1'),
    createCard('hearts', 13, 'prem-2'),
    createCard('clubs', 12, 'prem-3'),
    createCard('diamonds', 11, 'prem-4'),
  ]

  const leftSide = (
    <YStack gap="$4" alignItems="center" justifyContent="center">
      {iconBadge}
      <Stack height={20} />
      <XStack alignItems="center" justifyContent="center">
        {PREMIUM_FAN_CARDS.map((card, index) => {
          // Tighter fan with slight vertical arc
          const rotation = -15 + index * 10
          const yOffset = Math.abs(index - 1.5) * 8

          return (
            <Stack
              key={card.id}
              width={cardMetrics.width}
              height={cardMetrics.height}
              marginLeft={index === 0 ? 0 : -40} // Overlap cards
              style={{
                transform: [
                  { rotate: `${rotation}deg` },
                  { translateY: yOffset }
                ],
                shadowColor: 'rgba(15, 23, 42, 0.5)',
                shadowOpacity: 0.5,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                zIndex: index,
              }}
            >
              <CardVisual card={card} metrics={cardMetrics} />
            </Stack>
          )
        })}
      </XStack>
    </YStack>
  )

  const rightSide = <BadgeHighlightsRightSide palette={palette} copy={ctx.definition.copy} />

  return (
    <FixedWidthTwoColumnLayout
      leftContent={leftSide}
      rightContent={rightSide}
      leftWidth={340}
      rightWidth={360}
    />
  )
}

const renderBadgesRemixVariant = (ctx: VariantContext) => {
  const { cardMetrics, palette, iconBadge } = ctx

  // Same premium cards as 'premium-badges'
  const REMIX_CARDS: Card[] = [
    createCard('spades', 1, 'prem-1'),
    createCard('hearts', 13, 'prem-2'),
    createCard('clubs', 12, 'prem-3'),
    createCard('diamonds', 11, 'prem-4'),
  ]

  const leftSide = (
    <YStack gap="$3" alignItems="center">
      {iconBadge}
      <XStack alignItems="center" justifyContent="center">
        {REMIX_CARDS.map((card, index) => {
          // Tighter fan with slight vertical arc (Same as Premium Badges)
          const rotation = -15 + index * 10
          const yOffset = Math.abs(index - 1.5) * 8

          return (
            <Stack
              key={card.id}
              width={cardMetrics.width}
              height={cardMetrics.height}
              marginLeft={index === 0 ? 0 : -40} // Overlap cards
              style={{
                transform: [
                  { rotate: `${rotation}deg` },
                  { translateY: yOffset }
                ],
                shadowColor: 'rgba(15, 23, 42, 0.5)',
                shadowOpacity: 0.5,
                shadowRadius: 20,
                shadowOffset: { width: 0, height: 10 },
                zIndex: index,
              }}
            >
              <CardVisual card={card} metrics={cardMetrics} />
            </Stack>
          )
        })}
      </XStack>
    </YStack>
  )

  const rightSide = <BadgeHighlightsRightSide palette={palette} copy={ctx.definition.copy} />

  return (
    <FixedWidthTwoColumnLayout
      leftContent={leftSide}
      rightContent={rightSide}
      leftWidth={320}
      rightWidth={360}
    />
  )
}

const VARIANT_RENDERERS: Record<FeatureVariant, (ctx: VariantContext) => JSX.Element> = {
  badges: renderBadgesVariant,
  icon: renderIconVariant,
  'premium-badges': renderPremiumBadgesVariant,
  'badges-remix': renderBadgesRemixVariant,
}

const VARIANT_DEFINITIONS: VariantDefinition[] = [
  {
    id: 'badges',
    label: 'Badge Highlights',
    summary: 'Similar to Clean & Balanced but with stylized badge-style benefits.',
    description:
      'Same clean layout as the minimal variant, but benefits are presented as elegant bordered badges with subtle shadows and accent colors, making them stand out more prominently.',
    copy: {
      headline: 'Soli',
      subtitle: 'Classic solitaire, thoughtfully refined.',
      body: '',
    },
    cardWidth: 82,
    stackMultiplier: 1,
    radius: 13,
    infoWidthRatio: 0.4,
    statsRows: null,
    showIconInPanel: false,
  },
  {
    id: 'icon',
    label: 'Icon Pulse',
    summary: 'Brand-first variant with cards orbiting the icon in a circular pattern.',
    description:
      'Bold brand lockup with six cards arranged in a circular orbit around the icon. Clean info panel on the right with bullet-point benefits.',
    copy: {
      headline: 'Soli',
      subtitle: 'Classic solitaire, thoughtfully refined.',
      body: '',
    },
    cardWidth: 64,
    stackMultiplier: 1,
    radius: 10,
    infoWidthRatio: 0.33,
    minInfoWidth: 260,
    statsRows: [],
    showIconInPanel: false,
  },
  {
    id: 'premium-badges',
    label: 'Premium Badges',
    summary: 'Refined version of Badge Highlights with richer composition.',
    description:
      'An evolution of the badge layout featuring a tighter, more dynamic 4-card fan and polished spacing for a premium feel.',
    copy: {
      headline: 'Soli',
      subtitle: 'Classic solitaire, thoughtfully refined.',
      body: '',
    },
    cardWidth: 88,
    stackMultiplier: 1,
    radius: 14,
    infoWidthRatio: 0.4,
    statsRows: null,
    showIconInPanel: false,
  },
  {
    id: 'badges-remix',
    label: 'Badges Remix',
    summary: 'Best of both: Premium cards with the classic Badge Highlights layout.',
    description:
      'Combines the rich 4-card selection of the Premium variant with the clean, icon-topped layout of the original Badge Highlights.',
    copy: {
      headline: 'Soli',
      subtitle: 'Classic solitaire, thoughtfully refined.',
      body: '',
    },
    cardWidth: 88,
    stackMultiplier: 1,
    radius: 14,
    infoWidthRatio: 0.4,
    statsRows: null,
    showIconInPanel: false,
  },
]

const CONCEPT_PARAGRAPHS = [
  'This screen generates Google Play feature graphics at the required 1024×500 dimensions with a 15% safe frame margin. All variants are carefully composed to keep critical elements within the safe zone.',
  'Each variant reuses live game components (CardVisual, app icon), ensuring marketing assets automatically reflect UI updates. The felt background and color palette adapt to light and dark themes.',
]

const computePalette = (scheme: 'light' | 'dark'): Palette =>
  scheme === 'dark'
    ? {
        pageBackground: '#020b06',
        canvasBackground: '#224629',
        panelTint: 'rgba(6, 30, 18, 0.5)',
        panelBorder: 'rgba(160, 214, 176, 0.28)',
        infoBackground: 'rgba(6, 25, 15, 0.82)',
        infoBorder: 'rgba(165, 219, 185, 0.3)',
        infoTextPrimary: '#e8f7ec',
        infoTextSecondary: 'rgba(219, 240, 223, 0.85)',
        bodyText: '#e6f4e6',
        bodySubduedText: 'rgba(204, 231, 210, 0.74)',
        bullet: '#d3efd6',
        accent: '#49c68f',
        safeFrame: 'rgba(209, 244, 218, 0.55)',
        iconHalo: 'rgba(4, 17, 9, 0.58)',
      }
    : {
        pageBackground: '#f3f7f4',
        canvasBackground: COLOR_FELT_LIGHT,
        panelTint: 'rgba(14, 54, 32, 0.22)',
        panelBorder: 'rgba(19, 38, 28, 0.16)',
        infoBackground: 'rgba(12, 50, 32, 0.84)',
        infoBorder: 'rgba(231, 246, 235, 0.35)',
        infoTextPrimary: '#f8fafc',
        infoTextSecondary: 'rgba(231, 246, 235, 0.9)',
        bodyText: '#102617',
        bodySubduedText: 'rgba(16, 38, 23, 0.76)',
        bullet: 'rgba(231, 246, 235, 0.95)',
        accent: '#1d8f5f',
        safeFrame: 'rgba(28, 63, 34, 0.55)',
        iconHalo: 'rgba(15, 53, 30, 0.5)',
      }

export default function FeatureGraphicScreen() {
  const systemScheme = useColorScheme()
  const [schemeOverride, setSchemeOverride] = useState<'light' | 'dark' | null>(null)
  const scheme = schemeOverride ?? (systemScheme === 'dark' ? 'dark' : 'light')
  const palette = useMemo(() => computePalette(scheme), [scheme])
  const [activeVariantId, setActiveVariantId] = useState<FeatureVariant>('badges')
  const [showSafeFrame, setShowSafeFrame] = useState(false)

  const activeVariant = VARIANT_DEFINITIONS.find((variant) => variant.id === activeVariantId) ?? VARIANT_DEFINITIONS[0]

  const cardMetrics = useMemo<CardMetrics>(() => {
    const width = activeVariant.cardWidth
    const height = Math.round(width * CARD_ASPECT_RATIO)
    return {
      width,
      height,
      stackOffset: Math.round(BASE_STACK_OFFSET * activeVariant.stackMultiplier),
      radius: activeVariant.radius,
    }
  }, [activeVariant])

  const infoWidth = useMemo(
    () =>
      Math.max(
        activeVariant.minInfoWidth ?? 260,
        Math.round(SAFE_CONTENT_WIDTH * (activeVariant.infoWidthRatio ?? 0.35)),
      ),
    [activeVariant],
  )

  const iconBadge = useMemo(() => <IconBadge palette={palette} />, [palette])

  const variantContext: VariantContext = {
    definition: activeVariant,
    palette,
    cardMetrics,
    cascadeGap: 0,
    wasteFanOffset: 0,
    iconBadge,
    infoWidth,
    contentWidth: SAFE_CONTENT_WIDTH,
  }

  const cardStageWidth = Math.max(0, SAFE_CONTENT_WIDTH - infoWidth - LAYOUT_GAP)
  const dimensionRows = [
    {
      label: 'Full canvas',
      value: `${FEATURE_WIDTH}px × ${FEATURE_HEIGHT}px`,
      notes: 'Google Play feature graphic requirement',
    },
    {
      label: 'Safe margins',
      value: `${Math.round(SAFE_MARGIN_X)}px horizontal`,
      notes: `${Math.round(SAFE_MARGIN_Y)}px vertical (15% each side)`,
    },
    {
      label: 'Safe frame area',
      value: `${Math.round(SAFE_WIDTH)}px × ${Math.round(SAFE_HEIGHT)}px`,
      notes: 'Zone guaranteed to stay visible in store placements',
    },
    {
      label: 'Inner composition',
      value: `${Math.round(SAFE_CONTENT_WIDTH)}px × ${Math.round(SAFE_CONTENT_HEIGHT)}px`,
      notes: `Inner padding ${SAFE_INNER_PADDING}px on all sides`,
    },
    {
      label: 'Info column',
      value: `${Math.round(infoWidth)}px`,
      notes: `Variant ratio ${(Math.round((activeVariant.infoWidthRatio ?? infoWidth / SAFE_CONTENT_WIDTH) * 1000) / 10).toFixed(1)}%`,
    },
    {
      label: 'Card stage width',
      value: `${Math.round(cardStageWidth)}px`,
      notes: `Layout gap ${LAYOUT_GAP}px between card zone and info column`,
    },
    {
      label: 'Card metrics',
      value: `${cardMetrics.width}px × ${cardMetrics.height}px`,
      notes: `Radius ${cardMetrics.radius}px · stack offset ${cardMetrics.stackOffset}px`,
    },
  ]

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: palette.pageBackground }}
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
    >
      <YStack gap="$4">
      <XStack
        alignItems="center"
        justifyContent="space-between"
        gap="$3"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: palette.pageBackground,
          paddingVertical: 12,
          marginHorizontal: -20,
          paddingHorizontal: 20,
        }}
      >
        <XStack gap="$2" flexWrap="wrap">
          {VARIANT_DEFINITIONS.map((variant) => (
            <Button
              key={variant.id}
              size="$3"
              variant={variant.id === activeVariant.id ? 'solid' : 'outlined'}
              onPress={() => setActiveVariantId(variant.id)}
            >
              {variant.label}
            </Button>
          ))}
        </XStack>
        <XStack gap="$2">
          <Button
            size="$2"
            variant="outlined"
            onPress={() => setSchemeOverride((prev) => ((prev ?? scheme) === 'dark' ? 'light' : 'dark'))}
          >
            {scheme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </Button>
          <Button size="$2" variant="outlined" onPress={() => setShowSafeFrame((prev) => !prev)}>
            {showSafeFrame ? 'Hide safe frame' : 'Show safe frame'}
          </Button>
        </XStack>
      </XStack>

      <Stack
        width={FEATURE_WIDTH}
        height={FEATURE_HEIGHT}
        alignSelf="center"
        backgroundColor={palette.canvasBackground}
        overflow="hidden"
      >
        {/* Safe-area padding derived from Task 24-1 (15% bleed documented). */}
        <FeltBackground />
        <Stack flex={1} padding={SAFE_INNER_PADDING} justifyContent="center">
          {VARIANT_RENDERERS[activeVariant.id](variantContext)}
        </Stack>
        {showSafeFrame ? <SafeFrameOverlay color={palette.safeFrame} /> : null}
      </Stack>

      <YStack maxWidth={FEATURE_WIDTH} alignSelf="center" gap="$3">
        <Text color={palette.bodyText} fontSize={22} fontWeight="700">
          {activeVariant.label}
        </Text>
        <Paragraph color={palette.bodySubduedText} fontSize={18}>
          {activeVariant.summary}
        </Paragraph>
        <Paragraph color={palette.bodySubduedText} fontSize={16}>
          {activeVariant.description}
        </Paragraph>
      </YStack>

      <YStack maxWidth={FEATURE_WIDTH} alignSelf="center" gap="$2">
        <Text color={palette.bodyText} fontSize={18} fontWeight="700">
          Variant lineup overview
        </Text>
        <YStack gap="$1">
          {VARIANT_DEFINITIONS.map((variant) => (
            <XStack key={`${variant.id}-overview`} alignItems="flex-start" gap="$2">
              <Text color={variant.id === activeVariant.id ? palette.bodyText : palette.bodySubduedText} fontSize={18}>
                •
              </Text>
              <Paragraph
                flex={1}
                color={variant.id === activeVariant.id ? palette.bodyText : palette.bodySubduedText}
                fontSize={15}
              >
                {variant.label}: {variant.summary}
              </Paragraph>
            </XStack>
          ))}
        </YStack>
      </YStack>

      <YStack maxWidth={FEATURE_WIDTH} alignSelf="center" gap="$2">
        <Text color={palette.bodyText} fontSize={18} fontWeight="700">
          Safe zone calculations
        </Text>
        <YStack
          borderRadius={24}
          borderWidth={1}
          borderColor={palette.panelBorder}
          backgroundColor={`${palette.panelTint}40`}
          padding="$4"
          gap="$2"
        >
          {dimensionRows.map((row) => (
            <XStack key={row.label} justifyContent="space-between" alignItems="flex-start" gap="$3">
              <Text color={palette.bodyText} fontWeight="600">
                {row.label}
              </Text>
              <YStack flex={1} alignItems="flex-end" gap="$1">
                <Text color={palette.bodyText}>{row.value}</Text>
                <Paragraph color={palette.bodySubduedText} textAlign="right" fontSize={14}>
                  {row.notes}
                </Paragraph>
              </YStack>
            </XStack>
          ))}
        </YStack>
      </YStack>

      <YStack alignSelf="center" maxWidth={FEATURE_WIDTH} gap="$3" paddingTop="$5">
        <Text color={palette.bodyText} fontSize={24} fontWeight="800">
          Feature graphic concept
        </Text>
        {CONCEPT_PARAGRAPHS.map((paragraph, index) => (
          <Paragraph key={`concept-${index}`} color={palette.bodySubduedText} fontSize={16}>
            {paragraph}
          </Paragraph>
        ))}
        <YStack gap="$3" paddingTop="$2">
          {VARIANT_DEFINITIONS.map((variant) => (
            <Stack key={`${variant.id}-detail`} gap="$1">
              <Text color={palette.bodyText} fontSize={18} fontWeight="700">
                {variant.label}
              </Text>
              <Paragraph color={palette.bodySubduedText} fontSize={15}>
                {variant.description}
              </Paragraph>
            </Stack>
          ))}
        </YStack>
      </YStack>
      </YStack>
    </ScrollView>
  )
}
