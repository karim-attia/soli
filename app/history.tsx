import { useCallback, useLayoutEffect, useMemo } from 'react'
import { FlatList, Pressable, StyleSheet } from 'react-native'
import { DrawerActions } from '@react-navigation/native'
import { useNavigation, useRouter } from 'expo-router'
import { Button, Paragraph, Separator, Text, XStack, YStack, useTheme } from 'tamagui'
import { Menu } from '@tamagui/lucide-icons'

import { type HistoryEntry, useHistory } from '../src/state/history'

export default function HistoryScreen() {
  const navigation = useNavigation()
  const router = useRouter()
  const { entries, solvedCount, hydrated } = useHistory()
  const totalEntries = entries.length
  const incompleteCount = useMemo(
    () => entries.filter((entry) => !entry.solved).length,
    [entries],
  )

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer())
  }, [navigation])

  const headerTitle = useMemo(
    () => (
      <YStack gap="$1">
        <Text fontSize={16} fontWeight="700">
          Game History
        </Text>
        <Paragraph fontSize={12} color="$color10">
          {totalEntries} recorded · {solvedCount} solved · {incompleteCount} incomplete
        </Paragraph>
      </YStack>
    ),
    [incompleteCount, solvedCount, totalEntries],
  )

  const theme = useTheme()
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: () => headerTitle,
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
  }, [headerTitle, navigation, openDrawer, theme])

  const listHeader = useMemo(() => {
    const stats: HistoryStat[] = [
      { label: 'Games logged', value: totalEntries },
      { label: 'Solved', value: solvedCount },
      { label: 'Incomplete', value: incompleteCount },
    ]

    return (
      <YStack gap="$4" px="$3" pt="$4">
        <HistoryStatsRow stats={stats} />

        <Paragraph color="$color10">
          Finished games and abandoned shuffles are saved automatically. Solvable decks are marked so you can revisit them later.
        </Paragraph>

        <Separator />
      </YStack>
    )
  }, [incompleteCount, solvedCount, totalEntries])

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <EmptyHistory hydrated={hydrated} paddingHorizontal={24} paddingVertical={48} />
      }
      renderItem={({ item }) => (
        <HistoryListItem
          entry={item}
          onPress={() => router.push({ pathname: '/history/[entryId]', params: { entryId: item.id } })}
        />
      )}
      ItemSeparatorComponent={ListSpacer}
      contentContainerStyle={{ paddingBottom: 64 }}
    />
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
    return segments.join(' · ')
  }, [entry.moves, finishedLabel])

  const cardStyle = useMemo(
    () => ({
      marginHorizontal: 12,
      padding: 16,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: theme.borderColor?.val ?? '#cbd5f5',
      backgroundColor: theme.backgroundStrong?.val ?? '#f8fafc',
    }),
    [theme.backgroundStrong?.val, theme.borderColor?.val],
  )

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={{ width: '100%' }}>
      <YStack gap="$2" style={cardStyle}>
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
          {!entry.solved ? <Badge label="Incomplete" tone="warning" /> : null}
        </XStack>
      </YStack>
    </Pressable>
  )
}

const ListSpacer = () => <YStack height="$3" />

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
    console.warn('[history] Failed to format timestamp', error)
    return isoTimestamp
  }
}

type HistoryStat = {
  label: string
  value: number
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
  const tileStyle = useMemo(
    () => ({
      minWidth: 136,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: theme.backgroundStrong?.val ?? '#f8fafc',
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: theme.borderColor?.val ?? '#cbd5f5',
    }),
    [theme.backgroundStrong?.val, theme.borderColor?.val],
  )

  return (
    <YStack gap="$1" style={tileStyle}>
      <Text fontSize={12} fontWeight="600" color="$color10">
        {stat.label}
      </Text>
      <Text fontSize={20} fontWeight="700">
        {stat.value}
      </Text>
    </YStack>
  )
}

