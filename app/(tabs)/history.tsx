import { memo, useEffect, useLayoutEffect, useState } from 'react'
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
import { onPendingDealRequest } from '../../src/features/klondike/state/pendingDealRequestStore'
import { useSessionControls } from '../../src/features/klondike/state/sessionControlsStore'
import { formatExactDealCode, isExactDealId } from '../../src/solitaire/dealIdentity'
import { buildDealShareUrl } from '../../src/solitaire/dealShareLink'
import { getIntlLocale, t } from '../../src/i18n'
import { formatHistoryTimestamp } from '../../src/i18n/format'
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

  // An incoming share link switches to the game tab; close the preview sheet so it
  // doesn't stay presented over the game (retry-and-share-deal plan, round 2 finding).
  useEffect(() => onPendingDealRequest(() => setSelectedEntry(null)), [])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: t('history.title'),
      headerBackVisible: false,
      headerLeft: () => <HeaderMenuButton onPress={openDrawer} />,
      headerLeftContainerStyle: {
        paddingLeft: HEADER_MENU_LEADING_PADDING,
      },
      headerRight: () => null,
    })
  }, [navigation, openDrawer])

  const handleEndReached = () => {
    // The provider owns the in-flight state and prevents repeated end events from overlapping.
    if (!hasMore || loadingMore) {
      return
    }

    void loadMore()
  }

  const stats: HistoryStat[] = [
    { label: t('history.stats.games'), value: totalCount, tone: 'neutral' },
    { label: t('history.stats.solved'), value: solvedCount, tone: 'success' },
    { label: t('history.stats.incomplete'), value: incompleteCount, tone: 'warning' },
  ]
  const listHeader = (
    <View style={styles.listHeader}>
      <HistoryStatsRow stats={stats} />

      {/* Tamagui's Separator drew its hairline in `backgroundFocus` (not `borderColor`). */}
      <View style={[styles.separator, { backgroundColor: palette.backgroundFocus }]} />
    </View>
  )

  const loadingFooter = (
    <View style={styles.loadingFooter}>
      <ActivityIndicator size="small" color={palette.color10} />
    </View>
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

// Task 10-6: Map status to colors (palette keys). The label is `history.status.<status>`,
// resolved at render (no t() at module scope).
const STATUS_COLOR_KEYS: Record<HistoryEntryStatus, 'green10' | 'yellow11' | 'blue10'> = {
  solved: 'green10',
  incomplete: 'yellow11',
  active: 'blue10',
}

// Feedback round 2: plain colored text instead of Badge pills — the pills were
// "too aggressive and colorful". Shared by list rows and the sheet header.
const StatusText = ({ status }: { status: HistoryEntryStatus }) => {
  const palette = usePalette()
  // Unknown stored statuses read as incomplete (same fallback as before).
  const known = status in STATUS_COLOR_KEYS ? status : 'incomplete'

  return (
    <AppText
      variant="plain"
      color={palette[STATUS_COLOR_KEYS[known]]}
      style={styles.statusText}
    >
      {t(`history.status.${known}`)}
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
    segments.push(t('history.moves', { count: entry.moves }))
  }
  if (typeof entry.durationMs === 'number' && entry.durationMs >= 0) {
    segments.push(formatElapsedDuration(entry.durationMs))
  }
  // Scoring: only the tally matching the current setting; nothing when Off or when
  // the row predates scoring (null). Active rows carry null by construction.
  if (scoring === 'standard' && typeof entry.standardScore === 'number') {
    segments.push(
      t('history.score', {
        value: formatStandardScore(entry.standardScore, getIntlLocale()),
      })
    )
  } else if (scoring === 'vegas' && typeof entry.vegasScore === 'number') {
    segments.push(
      t('history.vegas', { value: formatVegasScore(entry.vegasScore, getIntlLocale()) })
    )
  }
  // `number`, not `count`: "Draw 3" names a mode, it is not a quantity to pluralize.
  segments.push(t('common.drawMode', { number: entry.drawCount }))
  if (entry.solvable) {
    segments.push(t('history.solvable'))
  }
  return joinWrappingSegments(segments)
}

// i18n: the title is derived from the exact id at render time so it follows the current
// language. The persisted `displayName` is English ("Deal XXXX-XXXX", frozen at write
// time) and is only the fallback for legacy rows without an exact id ("Game XXXXX").
const getEntryTitle = (entry: HistoryEntry): string => {
  const code = formatExactDealCode(entry.exactId)
  return code ? t('history.dealName', { code }) : entry.displayName
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
        {getEntryTitle(entry)}
      </AppText>
      <StatusText status={entry.status} />
    </View>

    <AppText variant="caption">{formatEntryMetadata(entry, scoring)}</AppText>
  </>
)

// History-entries-cleanup B4: memoized so FlatList re-renders (pagination, sheet
// open/close) don't re-render unchanged rows. KEPT with the React Compiler on (option D):
// rows are created by RN's VirtualizedList internals from renderItem, which the compiler
// cannot cache per item — memo is the only bailout here.
const HistoryListItem = memo(({ entry, scoring, onSelect }: HistoryListItemProps) => {
  const palette = usePalette()
  const onPress = () => onSelect(entry)

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
        {hydrated ? t('history.emptyTitle') : t('history.loadingTitle')}
      </AppText>
      <AppText color={palette.color10}>
        {hydrated ? t('history.emptyBody') : t('history.loadingBody')}
      </AppText>
    </View>
  )
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
      {/* One line, shrink to fit (i18n phase 9): in a third of the width pl
          «Nieukończone» broke mid-word («Nieukończon / e») and ru «Не завершено»
          wrapped, making that tile taller than its neighbours. */}
      <AppText
        variant="plain"
        color={textColor}
        style={styles.tileLabel}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
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
  const handleRetry = () => {
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
  }

  // Share = the public https link (dealShareLink.ts). iOS gets `url` separately so
  // the share sheet shows a proper link preview and apps that take only URLs still
  // work; Android's share intent only reads `message`, so the URL goes inline there.
  // Fire-and-forget: a dismissed sheet resolves normally, a failure is only devLogged.
  const handleShare = () => {
    if (!isExactDealId(exactId)) {
      return
    }
    const url = buildDealShareUrl(exactId, drawCount)
    const message = t('share.dealMessage', { number: drawCount })
    void Share.share(
      Platform.OS === 'ios' ? { message, url } : { message: `${message}: ${url}` }
    ).catch((error) => {
      devLog('warn', '[history] Share failed', error)
    })
  }

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
            label={t('history.retry')}
            style={styles.flex1}
            disabled={!canRetry}
            onPress={handleRetry}
            accessibilityLabel={t('history.retryA11y')}
            testID="history-retry"
          />
          <AppButton
            label={t('history.share')}
            style={styles.flex1}
            onPress={handleShare}
            accessibilityLabel={t('history.shareA11y')}
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

// PBI-17: Memoize the entire screen component to prevent re-renders. KEPT with the React
// Compiler on (option D): the screen is rendered by expo-router (non-compiled code), so
// nothing upstream caches this element.
export default memo(HistoryScreen)
