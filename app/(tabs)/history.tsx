import { memo, useCallback, useLayoutEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation, useRouter } from 'expo-router'

import { AppButton } from '../../components/AppButton'
import { AppSheet } from '../../components/AppSheet'
import { AppText } from '../../components/AppText'
import {
  HeaderMenuButton,
  HEADER_MENU_LEADING_PADDING,
} from '../../components/navigation/HeaderMenuButton'
import { BoardPreview } from '../../src/features/klondike/components/BoardPreview'
import { useSessionControls } from '../../src/features/klondike/state/sessionControlsStore'
import { isExactDealId } from '../../src/solitaire/dealIdentity'
import { buildDealShareUrl } from '../../src/solitaire/dealShareLink'
import { formatStandardScore, formatVegasScore } from '../../src/solitaire/scoring'
import {
  type HistoryEntry,
  type HistoryEntryStatus,
  useHistory,
} from '../../src/state/history'
import { useSettings, type ScoringMode } from '../../src/state/settings'
import { SPACE, usePalette, type Palette } from '../../src/theme/tokens'
import { devLog } from '../../src/utils/devLogger'
import { formatElapsedDuration } from '../../src/utils/time'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'

// PBI-17: Memoize to prevent re-renders during navigation
function HistoryScreen() {
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  const palette = usePalette()
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
  // Rows show the tally matching the CURRENT Scoring setting (both are stored).
  const scoring = useSettings().state.statistics.scoring
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
      <View style={styles.listHeader}>
        <HistoryStatsRow stats={stats} />

        {/* Tamagui's Separator drew its hairline in `backgroundFocus` (not `borderColor`). */}
        <View style={[styles.separator, { backgroundColor: palette.backgroundFocus }]} />
      </View>
    )
  }, [incompleteCount, palette.backgroundFocus, solvedCount, totalCount])

  const loadingFooter = useMemo(
    () => (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={palette.color10} />
      </View>
    ),
    [palette.color10]
  )

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
          <HistoryListItem entry={item} scoring={scoring} onSelect={setSelectedEntry} />
        )}
        ItemSeparatorComponent={ListSpacer}
        // RN 0.88 FlatList types no longer accept null here (undefined only).
        ListFooterComponent={loadingMore ? loadingFooter : undefined}
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
  scoring: ScoringMode
  // Stable callback (not an inline closure from renderItem) so React.memo below
  // actually skips re-renders; the row builds its own onPress from it.
  onSelect: (entry: HistoryEntry) => void
}

// Task 10-6: Map status to display labels and colors (palette keys).
const STATUS_DISPLAY: Record<
  HistoryEntryStatus,
  { label: string; colorKey: 'green10' | 'yellow11' | 'blue10' }
> = {
  solved: { label: 'Solved', colorKey: 'green10' },
  incomplete: { label: 'Incomplete', colorKey: 'yellow11' },
  active: { label: 'Active', colorKey: 'blue10' },
}

// Feedback round 2: plain colored text instead of Badge pills — the pills were
// "too aggressive and colorful". Shared by list rows and the sheet header.
const StatusText = ({ status }: { status: HistoryEntryStatus }) => {
  const palette = usePalette()
  const display = STATUS_DISPLAY[status] ?? STATUS_DISPLAY.incomplete

  return (
    <AppText variant="plain" color={palette[display.colorKey]} style={styles.statusText}>
      {display.label}
    </AppText>
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
const NBSP = ' '
const joinWrappingSegments = (segments: string[]): string =>
  segments.map((segment) => segment.split(' ').join(NBSP)).join(`${NBSP}· `)

const formatEntryMetadata = (entry: HistoryEntry, scoring: ScoringMode): string => {
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
  // Scoring: only the tally matching the current setting; nothing when Off or when
  // the row predates scoring (null). Active rows carry null by construction.
  if (scoring === 'standard' && typeof entry.standardScore === 'number') {
    segments.push(`Score ${formatStandardScore(entry.standardScore)}`)
  } else if (scoring === 'vegas' && typeof entry.vegasScore === 'number') {
    segments.push(`Vegas ${formatVegasScore(entry.vegasScore)}`)
  }
  segments.push(`Draw ${entry.drawCount}`)
  if (entry.solvable) {
    segments.push('Solvable')
  }
  return joinWrappingSegments(segments)
}

// Row title + status line, shared by the list card and the sheet header.
const EntryHeading = ({
  entry,
  scoring,
}: {
  entry: HistoryEntry
  scoring: ScoringMode
}) => (
  <>
    <View style={styles.headingRow}>
      <AppText variant="title" numberOfLines={1} style={styles.flex1}>
        {entry.displayName}
      </AppText>
      <StatusText status={entry.status} />
    </View>

    <AppText variant="caption">{formatEntryMetadata(entry, scoring)}</AppText>
  </>
)

// History-entries-cleanup B4: memoized so FlatList re-renders (pagination, sheet
// open/close) don't re-render unchanged rows.
const HistoryListItem = memo(({ entry, scoring, onSelect }: HistoryListItemProps) => {
  const palette = usePalette()
  const onPress = useCallback(() => onSelect(entry), [entry, onSelect])

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({ width: '100%', opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={[
          styles.card,
          { borderColor: palette.color4, backgroundColor: palette.color3 },
        ]}
      >
        <EntryHeading entry={entry} scoring={scoring} />
      </View>
    </Pressable>
  )
})
HistoryListItem.displayName = 'HistoryListItem'

const ListSpacer = () => <View style={styles.listSpacer} />

const EmptyHistory = ({
  hydrated,
  paddingHorizontal,
  paddingVertical,
}: {
  hydrated: boolean
  paddingHorizontal: number
  paddingVertical: number
}) => {
  const palette = usePalette()
  return (
    <View style={[styles.empty, { paddingHorizontal, paddingVertical }]}>
      <AppText variant="plain" style={styles.emptyTitle}>
        {hydrated ? 'No games recorded yet' : 'Loading history…'}
      </AppText>
      <AppText color={palette.color10}>
        {hydrated
          ? 'Play a game of Klondike to start building your history. Completed games and their deals will appear here.'
          : 'Please wait while we retrieve your recent games.'}
      </AppText>
    </View>
  )
}

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
  <View style={styles.statsRow}>
    {stats.map((stat) => (
      <HistoryStatTile key={stat.label} stat={stat} />
    ))}
  </View>
)

// Tile colours per tone: [background, border, text] palette keys.
const STAT_TONE_COLORS: Record<
  HistoryStat['tone'],
  [keyof Palette, keyof Palette, keyof Palette]
> = {
  success: ['green3', 'green7', 'green11'],
  warning: ['yellow3', 'yellow7', 'yellow11'],
  neutral: ['color3', 'color7', 'color11'],
}

const HistoryStatTile = ({ stat }: { stat: HistoryStat }) => {
  const palette = usePalette()
  const [backgroundColor, borderColor, textColor] = STAT_TONE_COLORS[stat.tone].map(
    (key) => palette[key]
  )

  return (
    <View style={[styles.tile, { backgroundColor, borderColor }]}>
      <AppText variant="plain" color={textColor} style={styles.tileLabel}>
        {stat.label}
      </AppText>
      <AppText variant="plain" color={textColor} style={styles.tileValue}>
        {stat.value}
      </AppText>
    </View>
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
  const router = useRouter()
  // Live game session controls (retry-and-share-deal plan); null until the game
  // screen has mounted its session, in which case Retry is disabled.
  const sessionControls = useSessionControls()
  const scoring = useSettings().state.statistics.scoring
  // Expo's universal sheet supplies 16 dp/pt/px of horizontal content padding per side.
  const contentWidth = Math.max(1, width - 32)

  // Defensive: history rows always carry a real exact id (real games, seeds), but a
  // malformed one would throw inside createGameStateFromExactId — disable instead.
  const { exactId, drawCount } = entry
  const canRetry = Boolean(sessionControls) && isExactDealId(exactId)
  const handleRetry = useCallback(() => {
    if (!sessionControls || !isExactDealId(exactId)) {
      return
    }
    // Confirmation (if any) is owned by the session; the sheet closes and the drawer
    // switches to the game tab only once the retry actually happens, so Cancel leaves
    // the user exactly where they were. Shown for every status on purpose — for the
    // active row this simply restarts the current game.
    sessionControls.requestPlayDeal(exactId, drawCount, {
      onConfirmed: () => {
        onDismiss()
        router.navigate('/')
      },
    })
  }, [drawCount, exactId, onDismiss, router, sessionControls])

  // Share = the public https link (dealShareLink.ts). iOS gets `url` separately so
  // the share sheet shows a proper link preview and apps that take only URLs still
  // work; Android's share intent only reads `message`, so the URL goes inline there.
  // Fire-and-forget: a dismissed sheet resolves normally, a failure is only devLogged.
  const handleShare = useCallback(() => {
    if (!isExactDealId(exactId)) {
      return
    }
    const url = buildDealShareUrl(exactId, drawCount)
    const message = `Play this Klondike deal in Soli (Draw ${drawCount})`
    void Share.share(
      Platform.OS === 'ios' ? { message, url } : { message: `${message}: ${url}` }
    ).catch((error) => {
      devLog('warn', '[history] Share failed', error)
    })
  }, [drawCount, exactId])

  return (
    <AppSheet isPresented onDismiss={onDismiss}>
      {/* Expo UI's content-sized sheet doesn't apply a bottom safe-area inset to the
          RN content, so pad manually (home-indicator devices need more than 16). */}
      <View
        style={[
          styles.sheet,
          { width: contentWidth, paddingBottom: Math.max(16, insets.bottom) },
        ]}
      >
        <View style={styles.sheetHeading}>
          <EntryHeading entry={entry} scoring={scoring} />
        </View>

        <BoardPreview tableau={entry.preview.tableau} availableWidth={contentWidth} />

        {/* "Retry" = this deal from scratch (not resume — see plan Follow-ups); "Share"
            = public link to the same deal. AppButton (RN Pressable) like the demo sheet:
            Expo UI controls inside a sheet had unreliable gestures on Android. a11y
            handles: label (Android) + testID (iOS). Both shown for every status. */}
        <View style={styles.buttonRow}>
          <AppButton
            label="Retry"
            style={styles.flex1}
            disabled={!canRetry}
            onPress={handleRetry}
            accessibilityLabel="Retry this deal"
            testID="history-retry"
          />
          <AppButton
            label="Share"
            style={styles.flex1}
            onPress={handleShare}
            accessibilityLabel="Share this deal"
            testID="history-share"
          />
        </View>
      </View>
    </AppSheet>
  )
}

// Gaps/paddings are the Tamagui space tokens this screen used ($1..$4); heights that
// used the `$2` token resolved against the SIZE scale (28), not space (7).
const styles = StyleSheet.create({
  flex1: { flex: 1 },
  listHeader: {
    gap: SPACE[4],
    paddingHorizontal: SPACE[3],
    paddingTop: SPACE[4],
    paddingBottom: SPACE[4],
  },
  separator: { height: 1 },
  loadingFooter: { paddingVertical: SPACE[3], alignItems: 'center' },
  statusText: { fontSize: 14, fontWeight: '600', flexShrink: 0 },
  headingRow: {
    flexDirection: 'row',
    gap: SPACE[2],
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    gap: SPACE[2],
    marginHorizontal: SPACE[3],
    padding: 14,
    borderRadius: 16,
    borderWidth: 0.5,
  },
  listSpacer: { height: 28 },
  empty: { gap: SPACE[3] },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: SPACE[3], flexWrap: 'wrap' },
  tile: {
    gap: SPACE[1],
    minWidth: 100,
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  tileLabel: { fontSize: 13, fontWeight: '600', opacity: 0.8 },
  tileValue: { fontSize: 24, fontWeight: '800' },
  sheet: { gap: SPACE[3] },
  sheetHeading: { gap: SPACE[1] },
  buttonRow: { flexDirection: 'row', gap: SPACE[2] },
})

// PBI-17: Memoize the entire screen component to prevent re-renders
export default memo(HistoryScreen)
