import { useLayoutEffect, useMemo } from 'react'
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Paragraph, Text, XStack, YStack, useTheme } from 'tamagui'
import { ArrowLeft } from '@tamagui/lucide-icons'

import type { Rank, Suit } from '../../src/solitaire/klondike'
import type { HistoryEntry, HistoryPreview, HistoryPreviewCard, HistoryPreviewColumn } from '../../src/state/history'
import { useHistory } from '../../src/state/history'

export default function HistoryDetailScreen() {
  const { entryId } = useLocalSearchParams<{ entryId?: string }>()
  const navigation = useNavigation()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { getEntryById } = useHistory()
  const entry = entryId ? getEntryById(entryId) : undefined

  useLayoutEffect(() => {
    navigation.setOptions({ title: entry ? entry.displayName : 'History' })
  }, [entry, navigation])

  if (!entry) {
    return (
      <YStack
        flex={1}
        p="$4"
        gap="$3"
        style={{ justifyContent: 'center', alignItems: 'center', paddingTop: insets.top }}
      >
        <Text fontSize={18} fontWeight="700">
          Game not found
        </Text>
        <Paragraph color="$color10" style={{ textAlign: 'center' }}>
          The history entry you selected is no longer available. It may have been cleared from the device.
        </Paragraph>
        <Button icon={ArrowLeft} onPress={() => router.back()}>
          Back to history
        </Button>
      </YStack>
    )
  }

  const { preview } = entry
  const finishedLabel = formatFinishedAt(entry.finishedAt)
  const statusLabel = entry.solved ? 'Solved' : 'Incomplete'
  const statusTone: BadgeTone = entry.solved ? 'success' : 'warning'

  return (
    <View style={{ flex: 1, paddingTop: insets.top }}>
      <ScrollView contentContainerStyle={styles.container}>
        <YStack gap="$4">
          <YStack gap="$2" style={styles.sectionAlignLeft}>
            <Text fontSize={24} fontWeight="700">
              {entry.displayName}
            </Text>
            <XStack gap="$2" style={styles.rowWrapCenter}>
              <Badge label={statusLabel} tone={statusTone} />
              {entry.solvable ? <Badge label="Solvable" tone="info" /> : null}
              <Paragraph color="$color10">{finishedLabel}</Paragraph>
            </XStack>
            <Paragraph color="$color10">
              {entry.moves === null ? 'Move count unavailable.' : `${entry.moves} move${entry.moves === 1 ? '' : 's'}.`}
            </Paragraph>
          </YStack>

          <PreviewBoard preview={preview} />
        </YStack>
      </ScrollView>
    </View>
  )
}

const PreviewBoard = ({ preview }: { preview: HistoryPreview }) => {
  const windowWidth = Dimensions.get('window').width
  const horizontalPadding = 24
  const metrics = useMemo(
    () => computePreviewMetrics(Math.max(windowWidth - horizontalPadding * 2, 320)),
    [windowWidth],
  )

  return (
    <View style={[styles.previewBoard, { paddingHorizontal: horizontalPadding }]}
      pointerEvents="none"
    >
      <View style={styles.previewTableauRow}>
        {preview.tableau.map((column, index) => (
          <PreviewColumn key={index} column={column} metrics={metrics} />
        ))}
      </View>
    </View>
  )
}

type PreviewMetrics = {
  width: number
  height: number
  stackOffset: number
  radius: number
}

const computePreviewMetrics = (availableWidth: number): PreviewMetrics => {
  const totalGap = PREVIEW_COLUMN_GAP * (TABLEAU_COLUMN_COUNT - 1)
  const minWidth = MIN_PREVIEW_CARD_WIDTH * TABLEAU_COLUMN_COUNT
  const widthAvailable = Math.max(availableWidth - totalGap, minWidth)
  const rawWidth = widthAvailable / TABLEAU_COLUMN_COUNT
  const width = Math.max(Math.min(Math.floor(rawWidth), MAX_PREVIEW_CARD_WIDTH), MIN_PREVIEW_CARD_WIDTH)
  const height = Math.round(width * CARD_ASPECT_RATIO)
  const stackOffset = Math.max(20, Math.round(width * 0.38))
  const radius = Math.max(8, Math.round(width * 0.18))
  return { width, height, stackOffset, radius }
}

const PreviewColumn = ({ column, metrics }: { column: HistoryPreviewColumn; metrics: PreviewMetrics }) => {
  const totalCards = column.cards.length
  const height = totalCards ? metrics.height + (totalCards - 1) * metrics.stackOffset : metrics.height

  return (
    <View style={[styles.previewColumn, { width: metrics.width, height }]} accessible={false}>
      {totalCards === 0 ? <PreviewEmptySlot metrics={metrics} /> : null}
      {column.cards.map((card, idx) => {
        const top = idx * metrics.stackOffset
        return card.faceUp ? (
          <PreviewCard key={`${card.suit}-${card.rank}-${idx}`} card={card} metrics={metrics} top={top} />
        ) : (
          <PreviewHiddenCard key={`hidden-${idx}`} metrics={metrics} top={top} />
        )
      })}
    </View>
  )
}

const PreviewCard = ({ card, metrics, top }: { card: HistoryPreviewCard; metrics: PreviewMetrics; top: number }) => (
  <View
    style={[
      styles.previewCardFaceUp,
      {
        width: metrics.width,
        height: metrics.height,
        borderRadius: metrics.radius,
        top,
      },
    ]}
  >
    <Text
      style={[styles.previewCardCornerRank, { color: SUIT_COLORS[card.suit] }]}
      numberOfLines={1}
      allowFontScaling={false}
    >
      {FACE_CARD_LABELS[card.rank] ?? card.rank}
    </Text>
    <Text
      style={[styles.previewCardCornerSuit, { color: SUIT_COLORS[card.suit] }]}
      numberOfLines={1}
      allowFontScaling={false}
    >
      {SUIT_SYMBOLS[card.suit]}
    </Text>
    <Text
      style={[styles.previewCardSymbol, { color: SUIT_COLORS[card.suit] }]}
      numberOfLines={1}
      allowFontScaling={false}
    >
      {SUIT_SYMBOLS[card.suit]}
    </Text>
  </View>
)

const PreviewHiddenCard = ({ metrics, top }: { metrics: PreviewMetrics; top: number }) => (
  <View
    style={[
      styles.previewCardHidden,
      {
        width: metrics.width,
        height: metrics.height,
        borderRadius: metrics.radius,
        top,
      },
    ]}
  />
)

const PreviewEmptySlot = ({ metrics }: { metrics: PreviewMetrics }) => (
  <View
    style={[
      styles.previewEmptySlot,
      {
        width: metrics.width,
        height: metrics.height,
        borderRadius: metrics.radius,
      },
    ]}
  />
)

type BadgeTone = 'success' | 'warning' | 'info' | 'neutral'

const Badge = ({ label, tone }: { label: string; tone: BadgeTone }) => {
  const theme = useTheme()
  const colors = useMemo(() => {
    switch (tone) {
      case 'success':
        return {
          background: theme.green4?.val ?? '#bbf7d0',
          foreground: theme.green11?.val ?? '#166534',
        }
      case 'warning':
        return {
          background: theme.yellow4?.val ?? '#fef3c7',
          foreground: theme.yellow11?.val ?? '#854d0e',
        }
      case 'info':
        return {
          background: theme.blue4?.val ?? '#bfdbfe',
          foreground: theme.blue11?.val ?? '#1e3a8a',
        }
      default:
        return {
          background: theme.color4?.val ?? '#e2e8f0',
          foreground: theme.color11?.val ?? '#111827',
        }
    }
  }, [theme.blue11?.val, theme.blue4?.val, theme.color11?.val, theme.color4?.val, theme.green11?.val, theme.green4?.val, theme.yellow11?.val, theme.yellow4?.val])

  return (
    <YStack px="$2" py="$1" style={[styles.badge, { backgroundColor: colors.background }]}> 
      <Text fontSize={12} fontWeight="600" style={{ color: colors.foreground }}>
        {label}
      </Text>
    </YStack>
  )
}

const formatFinishedAt = (iso: string) => {
  try {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) {
      return iso
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
  } catch (error) {
    console.warn('[history-detail] Failed to format timestamp', error)
    return iso
  }
}

const TABLEAU_COLUMN_COUNT = 7
const PREVIEW_COLUMN_GAP = 12
const MIN_PREVIEW_CARD_WIDTH = 36
const MAX_PREVIEW_CARD_WIDTH = 96
const CARD_ASPECT_RATIO = 102 / 72

const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}

const SUIT_COLORS: Record<Suit, string> = {
  clubs: '#111827',
  spades: '#111827',
  diamonds: '#be123c',
  hearts: '#be123c',
}

const FACE_CARD_LABELS: Partial<Record<Rank, string>> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 48,
    gap: 16,
  },
  sectionAlignLeft: {
    alignItems: 'flex-start',
  },
  rowWrapCenter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  previewBoard: {
    width: '100%',
  },
  previewTableauRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  previewColumn: {
    marginHorizontal: PREVIEW_COLUMN_GAP / 2,
    position: 'relative',
  },
  previewCardFaceUp: {
    position: 'absolute',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5f5',
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  previewCardCornerRank: {
    position: 'absolute',
    top: -2,
    left: 3,
    fontWeight: '700',
    fontSize: 14,
  },
  previewCardCornerSuit: {
    position: 'absolute',
    top: 0,
    right: 3,
    fontSize: 12,
  },
  previewCardSymbol: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '600',
    marginTop: 14,
  },
  previewCardHidden: {
    position: 'absolute',
    backgroundColor: '#3b4d75',
    borderWidth: 1,
    borderColor: '#2f3b58',
  },
  previewEmptySlot: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#cbd5f5',
    backgroundColor: 'transparent',
  },
  badge: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
})

