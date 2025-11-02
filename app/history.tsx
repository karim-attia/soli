import { useCallback, useLayoutEffect, useMemo } from 'react'
import { FlatList } from 'react-native'
import { DrawerActions } from '@react-navigation/native'
import { useNavigation } from 'expo-router'
import { Button, H2, Paragraph, Separator, Text, XStack, YStack } from 'tamagui'
import { Menu } from '@tamagui/lucide-icons'

import { type HistoryEntry, useHistory } from '../src/state/history'

export default function HistoryScreen() {
  const navigation = useNavigation()
  const { entries, solvedCount, hydrated } = useHistory()

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer())
  }, [navigation])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          size="$2.5"
          circular
          icon={Menu}
          accessibilityLabel="Open navigation menu"
          onPress={openDrawer}
        />
      ),
      title: 'History',
    })
  }, [navigation, openDrawer])

  const listHeader = useMemo(
    () => (
      <YStack gap="$4" paddingHorizontal="$3" paddingTop="$4">
        <YStack gap="$2">
          <H2>Game History</H2>
          <Paragraph color="$color10">
            Review past shuffles and see how many Klondike games you have solved on this device.
          </Paragraph>
        </YStack>

        <YStack gap="$1">
          <Text fontSize={16} fontWeight="700">
            Completed games
          </Text>
          <Text color="$color10">{solvedCount}</Text>
        </YStack>

        <Separator />
      </YStack>
    ),
    [solvedCount],
  )

  return (
    <FlatList
      data={entries}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={
        <EmptyHistory hydrated={hydrated} paddingHorizontal={24} paddingVertical={48} />
      }
      renderItem={({ item }) => <HistoryListItem entry={item} />}
      ItemSeparatorComponent={ListSpacer}
      contentContainerStyle={{ paddingBottom: 64 }}
    />
  )
}

type HistoryListItemProps = {
  entry: HistoryEntry
}

const HistoryListItem = ({ entry }: HistoryListItemProps) => {
  const finishedLabel = useMemo(() => formatFinishedAt(entry.finishedAt), [entry.finishedAt])
  const statusLabel = entry.solved ? 'Solved' : 'Unsolved'
  const statusColor = entry.solved ? '$green10' : '$color10'

  return (
    <YStack
      marginHorizontal="$3"
      padding="$3"
      borderRadius="$4"
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$backgroundStrong"
      gap="$2"
    >
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={16} fontWeight="700">
          Shuffle {entry.shuffleId}
        </Text>
        <Text fontSize={14} fontWeight="600" color={statusColor}>
          {statusLabel}
        </Text>
      </XStack>

      <Paragraph color="$color10">Finished {finishedLabel}</Paragraph>

      <XStack gap="$2" flexWrap="wrap">
        {entry.solvable ? <Badge label="Solvable" tone="primary" /> : null}
      </XStack>
    </YStack>
  )
}

const ListSpacer = () => <YStack height="$3" />

const EmptyHistory = ({ hydrated, paddingHorizontal, paddingVertical }: { hydrated: boolean; paddingHorizontal: number; paddingVertical: number }) => (
  <YStack paddingHorizontal={paddingHorizontal} paddingVertical={paddingVertical} gap="$3">
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
  tone: 'primary' | 'neutral'
}

const Badge = ({ label, tone }: BadgeProps) => {
  const background = tone === 'primary' ? '$green4' : '$color4'
  const foreground = tone === 'primary' ? '$green11' : '$color11'

  return (
    <YStack
      paddingHorizontal="$2"
      paddingVertical="$1"
      borderRadius="$3"
      backgroundColor={background}
    >
      <Text fontSize={12} fontWeight="600" color={foreground}>
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
    return timestamp.toLocaleString()
  } catch (error) {
    console.warn('[history] Failed to format timestamp', error)
    return isoTimestamp
  }
}

