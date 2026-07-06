import { memo, useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { FlatList, Pressable, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from 'expo-router'
import { Paragraph, Separator, Spinner, Text, XStack, YStack, useTheme } from 'tamagui'

import { AppSheet } from '../../components/AppSheet'
import {
  HeaderMenuButton,
  HEADER_MENU_LEADING_PADDING,
} from '../../components/navigation/HeaderMenuButton'
import { BoardPreview } from '../../src/features/klondike/components/BoardPreview'
import {
  type HistoryEntry,
  type HistoryEntryStatus,
  useHistory,
} from '../../src/state/history'
import { devLog } from '../../src/utils/devLogger'
import { formatElapsedDuration } from '../../src/utils/time'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'

// PBI-17: Memoize to prevent re-renders during navigation
function HistoryScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  // Pagination totals come from storage so the stats do not change as pages are loaded.
  const {
    entries,
    totalCount,
    solvedCount,
    incompleteCount,
    hydrated,
    hasMore,
    loadingMore,
    loadMore,
  } = useHistory()
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null)

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Game History',
      headerBackVisible: false,
      headerLeft: () => <HeaderMenuButton onPress={openDrawer} />,
      headerLeftContainerStyle: {
        paddingLeft: HEADER_MENU_LEADING_PADDING,
      },
      headerRight: () => null,
    })
  }, [navigation, openDrawer])

  const handleEndReached = useCallback(() => {
    // The provider owns the in-flight state and prevents repeated end events from overlapping.
    if (!hasMore || loadingMore) {
      return
    }

    void loadMore()
  }, [hasMore, loadMore, loadingMore])

  const listHeader = useMemo(() => {
    const stats: HistoryStat[] = [
      { label: 'Games', value: totalCount, tone: 'neutral' },
      { label: 'Solved', value: solvedCount, tone: 'success' },
      { label: 'Incomplete', value: incompleteCount, tone: 'warning' },
    ]

    return (
      <YStack gap="$4" px="$3" pt="$4" pb="$4">
        <HistoryStatsRow stats={stats} />

        <Separator />
      </YStack>
    )
  }, [incompleteCount, solvedCount, totalCount])

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
          <HistoryListItem entry={item} onSelect={setSelectedEntry} />
        )}
        ItemSeparatorComponent={ListSpacer}
        ListFooterComponent={loadingMore ? LoadingFooter : null}
        contentContainerStyle={{ paddingBottom: 64 }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
      />

      {selectedEntry ? (
        <HistoryPreviewSheet
          entry={selectedEntry}
          onDismiss={() => setSelectedEntry(null)}
        />
      ) : null}
    </>
  )
}

type HistoryListItemProps = {
  entry: HistoryEntry
  // Stable callback (not an inline closure from renderItem) so React.memo below
  // actually skips re-renders; the row builds its own onPress from it.
  onSelect: (entry: HistoryEntry) => void
}

// Task 10-6: Map status to display labels and colors.
const STATUS_DISPLAY: Record<
  HistoryEntryStatus,
  { label: string; colorKey: 'green' | 'yellow' | 'blue' }
> = {
  solved: { label: 'Solved', colorKey: 'green' },
  incomplete: { label: 'Incomplete', colorKey: 'yellow' },
  active: { label: 'Active', colorKey: 'blue' },
}

// Feedback round 2: plain colored text instead of Badge pills — the pills were
// "too aggressive and colorful". Shared by list rows and the sheet header.
const StatusText = ({ status }: { status: HistoryEntryStatus }) => {
  const theme = useTheme()
  const display = STATUS_DISPLAY[status] ?? STATUS_DISPLAY.incomplete
  const color = useMemo(() => {
    switch (display.colorKey) {
      case 'green':
        return theme.green10?.val ?? '#15803d'
      case 'blue':
        return theme.blue10?.val ?? '#1d4ed8'
      case 'yellow':
      default:
        return theme.yellow11?.val ?? '#854d0e'
    }
  }, [display.colorKey, theme.blue10?.val, theme.green10?.val, theme.yellow11?.val])

  return (
    <Text fontSize={14} fontWeight="600" style={{ color, flexShrink: 0 }}>
      {display.label}
    </Text>
  )
}

// Product decision (feedback round 2): solved entries show finishedAt, others
// startedAt; no "Started"/"Finished" prefix — the status text already conveys it.
const formatEntryTimeLabel = (entry: HistoryEntry) =>
  formatHistoryTimestamp(
    entry.status === 'solved' && entry.finishedAt ? entry.finishedAt : entry.startedAt
  )

// Feedback round 3: one metadata line whose segments wrap as whole units. Spaces
// inside a segment are non-breaking and each "·" is glued to the previous segment,
// so the only break opportunities are the regular spaces after a "·" — an
// overflowing line moves whole sections down instead of splitting "80 moves" or
// the date mid-way.
const NBSP = '\u00A0'
const joinWrappingSegments = (segments: string[]): string =>
  segments.map((segment) => segment.split(' ').join(NBSP)).join(`${NBSP}· `)

const formatEntryMetadata = (entry: HistoryEntry): string => {
  const segments: string[] = [formatEntryTimeLabel(entry)]
  // Product decision (round 3): active games show no moves (durationMs is already
  // null for them) — the stored count only syncs at save points, so it would show a
  // stale "0 moves" next to a live game. Reading the live count would couple this
  // list to the game screen's reducer state, which isn't worth it.
  const showMoves = entry.status !== 'active'
  if (showMoves && typeof entry.moves === 'number' && entry.moves >= 0) {
    segments.push(`${entry.moves} ${entry.moves === 1 ? 'move' : 'moves'}`)
  }
  if (typeof entry.durationMs === 'number' && entry.durationMs >= 0) {
    segments.push(formatElapsedDuration(entry.durationMs))
  }
  segments.push(`Draw ${entry.drawCount}`)
  if (entry.solvable) {
    segments.push('Solvable')
  }
  return joinWrappingSegments(segments)
}

// History-entries-cleanup B4: memoized so FlatList re-renders (pagination, sheet
// open/close) don't re-render unchanged rows.
const HistoryListItem = memo(({ entry, onSelect }: HistoryListItemProps) => {
  const theme = useTheme()
  const onPress = useCallback(() => onSelect(entry), [entry, onSelect])

  const cardStyle = useMemo(
    () => ({
      padding: 14,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: theme.color4?.val ?? '#cbd5f5',
    }),
    [theme.color4?.val]
  )

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.7 : 1 })}
    >
      <YStack gap="$2" style={cardStyle} mx="$3" bg="$color3">
        <XStack
          gap="$2"
          style={{ alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Text fontSize={16} fontWeight="700" flex={1} numberOfLines={1}>
            {entry.displayName}
          </Text>
          <StatusText status={entry.status} />
        </XStack>

        <Paragraph color="$color10" fontSize={14}>
          {formatEntryMetadata(entry)}
        </Paragraph>
      </YStack>
    </Pressable>
  )
})
HistoryListItem.displayName = 'HistoryListItem'

const ListSpacer = () => <YStack height="$2" />

const LoadingFooter = () => (
  <YStack py="$3" style={{ alignItems: 'center' }}>
    <Spinner size="small" color="$color10" />
  </YStack>
)

const EmptyHistory = ({
  hydrated,
  paddingHorizontal,
  paddingVertical,
}: {
  hydrated: boolean
  paddingHorizontal: number
  paddingVertical: number
}) => (
  <YStack gap="$3" style={{ paddingHorizontal, paddingVertical }}>
    <Text fontSize={18} fontWeight="600">
      {hydrated ? 'No games recorded yet' : 'Loading history…'}
    </Text>
    <Paragraph color="$color10">
      {hydrated
        ? 'Play a game of Klondike to start building your history. Completed games and their deals will appear here.'
        : 'Please wait while we retrieve your recent games.'}
    </Paragraph>
  </YStack>
)

const isSameCalendarDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

// History-entries-cleanup B3: friendly dates shared by the list rows and the sheet
// header — "Today, 5:33 PM" / "Yesterday, 5:33 PM" / "Jul 6, 5:33 PM" (same year) /
// "Jul 6, 2025" (older, no time).
const formatHistoryTimestamp = (isoTimestamp: string | undefined) => {
  if (!isoTimestamp) {
    return 'just now'
  }

  try {
    const timestamp = new Date(isoTimestamp)
    if (Number.isNaN(timestamp.getTime())) {
      return isoTimestamp
    }

    const now = new Date()
    const time = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(
      timestamp
    )
    if (isSameCalendarDay(timestamp, now)) {
      return `Today, ${time}`
    }
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (isSameCalendarDay(timestamp, yesterday)) {
      return `Yesterday, ${time}`
    }
    if (timestamp.getFullYear() === now.getFullYear()) {
      const monthDay = new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(timestamp)
      return `${monthDay}, ${time}`
    }
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(timestamp)
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
    [backgroundColor, borderColor]
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
  entry: HistoryEntry
  onDismiss: () => void
}

// History-entries-cleanup A1/A4: the board preview reuses the main game's card
// renderer via BoardPreview (the previous duplicated PREVIEW_* renderer is gone).
const HistoryPreviewSheet = ({ entry, onDismiss }: HistoryPreviewSheetProps) => {
  const { width } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  // Expo's universal sheet supplies 16 dp/pt/px of horizontal content padding per side.
  const contentWidth = Math.max(1, width - 32)

  return (
    <AppSheet isPresented onDismiss={onDismiss}>
      {/* Expo UI's content-sized sheet doesn't apply a bottom safe-area inset to the
          RN content, so pad manually (home-indicator devices need more than 16). */}
      <YStack gap="$3" width={contentWidth} pb={Math.max(16, insets.bottom)}>
        <YStack gap="$1">
          <XStack
            gap="$2"
            style={{ alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Text fontSize={16} fontWeight="700" flex={1} numberOfLines={1}>
              {entry.displayName}
            </Text>
            <StatusText status={entry.status} />
          </XStack>
          <Paragraph color="$color10" fontSize={14}>
            {formatEntryMetadata(entry)}
          </Paragraph>
        </YStack>

        <BoardPreview tableau={entry.preview.tableau} availableWidth={contentWidth} />
      </YStack>
    </AppSheet>
  )
}

// PBI-17: Memoize the entire screen component to prevent re-renders
export default memo(HistoryScreen)
