import { Dispatch, SetStateAction, useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { Dimensions, FlatList, LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native'
import { useNavigation } from 'expo-router'
import { Button, Paragraph, Separator, Sheet, Text, XStack, YStack, useTheme } from 'tamagui'
import { Menu } from '@tamagui/lucide-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  type HistoryEntry,
  type HistoryPreviewCard,
  type HistoryPreviewColumn,
  useHistory,
} from '../src/state/history'
import { devLog } from '../src/utils/devLogger'
import { formatElapsedDuration } from '../src/utils/time'
import { useDrawerOpener } from '../src/navigation/useDrawerOpener'

const DEFAULT_SHEET_SNAP_POINTS = [65]

export default function HistoryScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  const { entries, solvedCount, hydrated } = useHistory()
  const totalEntries = entries.length
  const incompleteCount = useMemo(
    () => entries.filter((entry) => !entry.solved).length,
    [entries],
  )
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetSnapPoints, setSheetSnapPoints] = useState<number[]>([...DEFAULT_SHEET_SNAP_POINTS])

  const handleEntryPress = useCallback((entry: HistoryEntry) => {
    setSelectedEntry(entry)
    setSheetSnapPoints([...DEFAULT_SHEET_SNAP_POINTS])
    setSheetOpen(true)
  }, [])

  const handleSheetOpenChange = useCallback((nextOpen: boolean) => {
    setSheetOpen(nextOpen)
    if (!nextOpen) {
      // Allow sheet close animation to finish before clearing state
      setTimeout(() => {
        setSelectedEntry(null)
      }, 240)
    }
  }, [])

  const theme = useTheme()
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Game History',
      headerRight: () => (
        <Pressable
          onPress={openDrawer}
          accessibilityLabel="Open navigation menu"
          style={{ padding: 8 }}
        >
          <Menu size={32} color={theme.color.val as any} />
        </Pressable>
      ),
    })
  }, [navigation, openDrawer, theme])

  const listHeader = useMemo(() => {
    const stats: HistoryStat[] = [
      { label: 'Games', value: totalEntries, tone: 'neutral' },
      { label: 'Solved', value: solvedCount, tone: 'success' },
      { label: 'Incomplete', value: incompleteCount, tone: 'warning' },
    ]

    return (
      <YStack gap="$4" px="$3" pt="$4" pb="$4">
        <HistoryStatsRow stats={stats} />

        <Separator />
      </YStack>
    )
  }, [incompleteCount, solvedCount, totalEntries])

  return (
    <>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <EmptyHistory hydrated={hydrated} paddingHorizontal={24} paddingVertical={48} />
        }
        renderItem={({ item }) => (
          <HistoryListItem entry={item} onPress={() => handleEntryPress(item)} />
        )}
        ItemSeparatorComponent={ListSpacer}
        contentContainerStyle={{ paddingBottom: 64 }}
      />

      <HistoryPreviewSheet
        entry={selectedEntry}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        snapPoints={sheetSnapPoints}
        onSnapPointsChange={setSheetSnapPoints}
      />
    </>
  )
}

type HistoryListItemProps = {
  entry: HistoryEntry
  onPress?: () => void
}

const HistoryListItem = ({ entry, onPress }: HistoryListItemProps) => {
  const theme = useTheme()
  const finishedLabel = useMemo(() => formatFinishedAt(entry.finishedAt), [entry.finishedAt])
  const statusLabel = entry.solved ? 'Solved' : 'Incomplete'
  const statusColor = entry.solved ? theme.green10?.val ?? '#15803d' : theme.yellow11?.val ?? '#854d0e'
  const metadata = useMemo(() => {
    const segments = [`Finished ${finishedLabel}`]
    if (typeof entry.moves === 'number' && entry.moves >= 0) {
      segments.push(`${entry.moves} ${entry.moves === 1 ? 'move' : 'moves'}`)
    }
    if (typeof entry.durationMs === 'number' && entry.durationMs >= 0) {
      segments.push(`Time ${formatElapsedDuration(entry.durationMs)}`)
    }
    return segments.join(' · ')
  }, [entry.moves, finishedLabel])

  const cardStyle = useMemo(
    () => ({
      padding: 14,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.color6?.val ?? '#cbd5f5',
      // Shadow for elevation
      shadowColor: theme.color10?.val ?? '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    }),
    [theme.color6?.val, theme.color10?.val],
  )

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ width: '100%' }}>
      <YStack gap="$2" style={cardStyle} mx="$3" backgroundColor="$color3">
        <XStack
          gap="$2"
          style={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text fontSize={16} fontWeight="700">
            {entry.displayName}
          </Text>
          <Text fontSize={14} fontWeight="600" style={{ color: statusColor }}>
            {statusLabel}
          </Text>
        </XStack>

        <Paragraph color="$color10">{metadata}</Paragraph>

        <XStack gap="$2" flexWrap="wrap">
          {entry.solvable ? <Badge label="Solvable" tone="info" /> : null}
        </XStack>
      </YStack>
    </Pressable>
  )
}

const ListSpacer = () => <YStack height="$2" />

const EmptyHistory = ({ hydrated, paddingHorizontal, paddingVertical }: { hydrated: boolean; paddingHorizontal: number; paddingVertical: number }) => (
  <YStack gap="$3" style={{ paddingHorizontal, paddingVertical }}>
    <Text fontSize={18} fontWeight="600">
      {hydrated ? 'No games recorded yet' : 'Loading history…'}
    </Text>
    <Paragraph color="$color10">
      {hydrated
        ? 'Play a game of Klondike to start building your history. Completed games and their shuffles will appear here.'
        : 'Please wait while we retrieve your recent games.'}
    </Paragraph>
  </YStack>
)

type BadgeProps = {
  label: string
  tone: 'success' | 'warning' | 'info' | 'neutral'
}

const Badge = ({ label, tone }: BadgeProps) => {
  const theme = useTheme()
  const { backgroundColor, textColor } = useMemo(() => {
    switch (tone) {
      case 'success':
        return {
          backgroundColor: theme.green4?.val ?? '#bbf7d0',
          textColor: theme.green11?.val ?? '#166534',
        }
      case 'warning':
        return {
          backgroundColor: theme.yellow4?.val ?? '#fef3c7',
          textColor: theme.yellow11?.val ?? '#854d0e',
        }
      case 'info':
        return {
          backgroundColor: theme.blue4?.val ?? '#bfdbfe',
          textColor: theme.blue11?.val ?? '#1e3a8a',
        }
      default:
        return {
          backgroundColor: theme.color4?.val ?? '#e2e8f0',
          textColor: theme.color11?.val ?? '#111827',
        }
    }
  }, [theme.blue11?.val, theme.blue4?.val, theme.color11?.val, theme.color4?.val, theme.green11?.val, theme.green4?.val, theme.yellow11?.val, theme.yellow4?.val])
  const badgeStyle = useMemo(
    () => ({
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor,
    }),
    [backgroundColor],
  )

  return (
    <YStack style={badgeStyle}>
      <Text fontSize={12} fontWeight="600" style={{ color: textColor }}>
        {label}
      </Text>
    </YStack>
  )
}

const formatFinishedAt = (isoTimestamp: string | undefined) => {
  if (!isoTimestamp) {
    return 'just now'
  }

  try {
    const timestamp = new Date(isoTimestamp)
    if (Number.isNaN(timestamp.getTime())) {
      return isoTimestamp
    }
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)
  } catch (error) {
    devLog('warn', '[history] Failed to format timestamp', error)
    return isoTimestamp
  }
}

type HistoryStat = {
  label: string
  value: number
  tone: 'neutral' | 'success' | 'warning'
}

const HistoryStatsRow = ({ stats }: { stats: HistoryStat[] }) => (
  <XStack gap="$3" flexWrap="wrap">
    {stats.map((stat) => (
      <HistoryStatTile key={stat.label} stat={stat} />
    ))}
  </XStack>
)

const HistoryStatTile = ({ stat }: { stat: HistoryStat }) => {
  const theme = useTheme()
  const { backgroundColor, borderColor, textColor } = useMemo(() => {
    switch (stat.tone) {
      case 'success':
        return {
          backgroundColor: theme.green3?.val ?? '#dcfce7',
          borderColor: theme.green7?.val ?? '#15803d',
          textColor: theme.green11?.val ?? '#14532d',
        }
      case 'warning':
        return {
          backgroundColor: theme.yellow3?.val ?? '#fef9c3',
          borderColor: theme.yellow7?.val ?? '#a16207',
          textColor: theme.yellow11?.val ?? '#713f12',
        }
      default:
        return {
          backgroundColor: theme.color3?.val ?? '#f1f5f9',
          borderColor: theme.color7?.val ?? '#334155',
          textColor: theme.color11?.val ?? '#0f172a',
        }
    }
  }, [stat.tone, theme])

  const tileStyle = useMemo(
    () => ({
      minWidth: 100,
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor,
      borderWidth: 1,
      borderColor,
    }),
    [backgroundColor, borderColor],
  )

  return (
    <YStack gap="$1" style={tileStyle}>
      <Text fontSize={13} fontWeight="600" style={{ color: textColor, opacity: 0.8 }}>
        {stat.label}
      </Text>
      <Text fontSize={24} fontWeight="800" style={{ color: textColor }}>
        {stat.value}
      </Text>
    </YStack>
  )
}

type HistoryPreviewSheetProps = {
  entry: HistoryEntry | null
  open: boolean
  onOpenChange: (open: boolean) => void
  snapPoints: number[]
  onSnapPointsChange: Dispatch<SetStateAction<number[]>>
}

const PREVIEW_TABLEAU_COLUMN_COUNT = 7
const PREVIEW_TABLEAU_GAP = 10
const PREVIEW_COLUMN_MARGIN = PREVIEW_TABLEAU_GAP / 2
const PREVIEW_BASE_CARD_WIDTH = 72
const PREVIEW_BASE_CARD_HEIGHT = 102
const PREVIEW_CARD_ASPECT_RATIO = PREVIEW_BASE_CARD_HEIGHT / PREVIEW_BASE_CARD_WIDTH
const PREVIEW_BASE_STACK_OFFSET = 28
const PREVIEW_MIN_CARD_WIDTH = 24
const PREVIEW_MAX_CARD_WIDTH = 96
const PREVIEW_COLOR_CARD_FACE = '#ffffff'
const PREVIEW_COLOR_CARD_BACK = '#3b4d75'
const PREVIEW_COLOR_CARD_BORDER = '#cbd5f5'
const PREVIEW_COLOR_COLUMN_BORDER = '#d0d5dd'
const PREVIEW_FACE_CARD_LABELS: Partial<Record<HistoryPreviewCard['rank'], string>> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
}
const PREVIEW_SUIT_SYMBOLS: Record<HistoryPreviewCard['suit'], string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}
const PREVIEW_SUIT_COLORS: Record<HistoryPreviewCard['suit'], string> = {
  clubs: '#111827',
  spades: '#111827',
  diamonds: '#c92a2a',
  hearts: '#c92a2a',
}

const HistoryPreviewSheet = ({ entry, open, onOpenChange, snapPoints, onSnapPointsChange }: HistoryPreviewSheetProps) => {
  const insets = useSafeAreaInsets()
  const [boardWidth, setBoardWidth] = useState<number | null>(null)

  const metrics = useMemo(() => computePreviewMetrics(boardWidth), [boardWidth])

  const handleBoardLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout
      setBoardWidth((previous) => (previous === width ? previous : width))

      const windowHeight = Dimensions.get('window').height
      if (windowHeight <= 0) {
        return
      }

      const HEADER_BUFFER = 160
      const verticalPadding = insets.bottom + HEADER_BUFFER
      const desiredHeight = height + verticalPadding
      const top = Math.min(99.5, Math.max(40, (desiredHeight / windowHeight) * 100))
      const sortedPoints = [top]

      onSnapPointsChange((previous) => {
        if (
          Array.isArray(previous) &&
          previous.length === sortedPoints.length &&
          previous.every((value, index) => Math.abs(value - sortedPoints[index]) < 0.5)
        ) {
          return previous
        }
        return sortedPoints
      })
    },
    [insets.bottom, onSnapPointsChange],
  )

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPointsMode="percent"
      snapPoints={snapPoints}
      dismissOnSnapToBottom
      animation="medium"
    >
      <Sheet.Overlay bg="rgba(0,0,0,0.35)" />
      <Sheet.Frame
        px="$4"
        pt="$3"
        pb={Math.max(insets.bottom, 16)}
        background="$background"
        gap="$4"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
        style={{
          shadowColor: 'rgba(0,0,0,0.2)',
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <Sheet.Handle bg="$color5" />
        {entry ? (
          <YStack gap="$3">
            <YStack gap="$1">
              <Text fontSize={16} fontWeight="700">
                {entry.displayName}
              </Text>
              <Paragraph color="$color10">
                {formatFinishedAt(entry.finishedAt)} · {entry.solved ? 'Solved' : 'Incomplete'}
              </Paragraph>
            </YStack>
            <XStack gap="$2" flexWrap="wrap">
              {typeof entry.moves === 'number' && entry.moves >= 0 ? (
                <Badge
                  label={`${entry.moves} ${entry.moves === 1 ? 'move' : 'moves'}`}
                  tone="neutral"
                />
              ) : null}
              {typeof entry.durationMs === 'number' && entry.durationMs >= 0 ? (
                <Badge label={formatElapsedDuration(entry.durationMs)} tone="info" />
              ) : null}
            </XStack>

            <View
              style={previewStyles.boardShell}
              onLayout={handleBoardLayout}
              pointerEvents="none"
            >
              <View style={previewStyles.tableauRow}>
                {entry.preview.tableau.map((column, index) => (
                  <PreviewColumn key={`col-${index}`} column={column} metrics={metrics} />
                ))}
              </View>
            </View>
          </YStack>
        ) : (
          <Paragraph color="$color10">Select a game to preview its tableau.</Paragraph>
        )}
      </Sheet.Frame>
    </Sheet>
  )
}

type PreviewMetrics = {
  width: number
  height: number
  stackOffset: number
  radius: number
}

const computePreviewMetrics = (availableWidth: number | null): PreviewMetrics => {
  if (!availableWidth || availableWidth <= 0) {
    return computePreviewMetrics(
      PREVIEW_BASE_CARD_WIDTH * PREVIEW_TABLEAU_COLUMN_COUNT +
        PREVIEW_TABLEAU_GAP * (PREVIEW_TABLEAU_COLUMN_COUNT - 1),
    )
  }

  const totalGap = PREVIEW_TABLEAU_GAP * (PREVIEW_TABLEAU_COLUMN_COUNT - 1)
  const widthAvailable = Math.max(
    availableWidth - totalGap,
    PREVIEW_MIN_CARD_WIDTH * PREVIEW_TABLEAU_COLUMN_COUNT,
  )
  const rawWidth = widthAvailable / PREVIEW_TABLEAU_COLUMN_COUNT
  const unclampedWidth = Math.max(Math.floor(rawWidth), PREVIEW_MIN_CARD_WIDTH)
  const constrainedWidth = Math.min(
    Math.max(unclampedWidth, PREVIEW_MIN_CARD_WIDTH),
    PREVIEW_MAX_CARD_WIDTH,
  )
  const height = Math.round(constrainedWidth * PREVIEW_CARD_ASPECT_RATIO)
  const stackOffset = Math.max(
    24,
    Math.round(constrainedWidth * (PREVIEW_BASE_STACK_OFFSET / PREVIEW_BASE_CARD_WIDTH + 0.12)),
  )
  const radius = Math.max(6, Math.round(constrainedWidth * 0.12))

  return {
    width: constrainedWidth,
    height,
    stackOffset,
    radius,
  }
}

const PreviewColumn = ({
  column,
  metrics,
}: {
  column: HistoryPreviewColumn
  metrics: PreviewMetrics
}) => {
  const totalCards = column.cards.length
  const height = totalCards
    ? metrics.height + (totalCards - 1) * metrics.stackOffset
    : metrics.height

  return (
    <View
      style={[
        previewStyles.column,
        {
          width: metrics.width,
          height,
          marginHorizontal: PREVIEW_COLUMN_MARGIN,
        },
      ]}
    >
      {totalCards === 0 && <PreviewEmptySlot metrics={metrics} />}
      {column.cards.map((card, index) =>
        card.faceUp ? (
          <PreviewCard
            key={`${card.suit}-${card.rank}-${index}`}
            card={card}
            metrics={metrics}
            top={index * metrics.stackOffset}
          />
        ) : (
          <PreviewHiddenCard
            key={`hidden-${index}`}
            metrics={metrics}
            top={index * metrics.stackOffset}
          />
        ),
      )}
    </View>
  )
}

const PreviewCard = ({
  card,
  metrics,
  top,
}: {
  card: HistoryPreviewCard
  metrics: PreviewMetrics
  top: number
}) => (
  <View
    style={[
      previewStyles.cardBase,
      previewStyles.faceUp,
      {
        width: metrics.width,
        height: metrics.height,
        borderRadius: metrics.radius,
        top,
      },
    ]}
  >
    <Text
      style={[previewStyles.cardCornerRank, { color: PREVIEW_SUIT_COLORS[card.suit] }]}
      numberOfLines={1}
      allowFontScaling={false}
    >
      {PREVIEW_FACE_CARD_LABELS[card.rank] ?? card.rank}
    </Text>
    <Text
      style={[previewStyles.cardCornerSuit, { color: PREVIEW_SUIT_COLORS[card.suit] }]}
      numberOfLines={1}
      allowFontScaling={false}
    >
      {PREVIEW_SUIT_SYMBOLS[card.suit]}
    </Text>
    <Text
      style={[previewStyles.cardSymbol, { color: PREVIEW_SUIT_COLORS[card.suit] }]}
      numberOfLines={1}
      allowFontScaling={false}
    >
      {PREVIEW_SUIT_SYMBOLS[card.suit]}
    </Text>
  </View>
)

const PreviewHiddenCard = ({
  metrics,
  top,
}: {
  metrics: PreviewMetrics
  top: number
}) => (
  <View
    style={[
      previewStyles.cardBase,
      previewStyles.faceDown,
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
      previewStyles.emptySlot,
      {
        width: metrics.width,
        height: metrics.height,
        borderRadius: metrics.radius,
      },
    ]}
  />
)

const previewStyles = StyleSheet.create({
  boardShell: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: PREVIEW_COLUMN_MARGIN,
    paddingBottom: 16,
    position: 'relative',
  },
  tableauRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexWrap: 'nowrap',
  },
  column: {
    position: 'relative',
    paddingBottom: 8,
  },
  cardBase: {
    position: 'absolute',
    shadowColor: 'rgba(0,0,0,0.15)',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 6,
    justifyContent: 'center',
    backgroundColor: PREVIEW_COLOR_CARD_FACE,
    overflow: 'hidden',
  },
  faceUp: {
    borderWidth: 1,
    borderColor: PREVIEW_COLOR_CARD_BORDER,
  },
  faceDown: {
    borderWidth: 1,
    borderColor: PREVIEW_COLOR_CARD_BORDER,
    backgroundColor: PREVIEW_COLOR_CARD_BACK,
  },
  emptySlot: {
    position: 'absolute',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: PREVIEW_COLOR_COLUMN_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cardCornerRank: {
    position: 'absolute',
    top: -2,
    left: 3,
    fontWeight: '700',
    fontSize: 16,
  },
  cardCornerSuit: {
    position: 'absolute',
    top: 0,
    right: 3,
    fontSize: 12,
  },
  cardSymbol: {
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '600',
    marginTop: 16,
  },
})

