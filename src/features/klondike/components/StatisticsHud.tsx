import React from 'react'
import { StyleSheet, View, Text } from 'react-native'

import type { TimerState } from '../../../solitaire/klondike'
import { getIntlLocale, t } from '../../../i18n'
import { formatElapsedDurationSpoken, formatVegasScoreSpoken } from '../../../i18n/format'
import {
  formatStandardScore,
  formatVegasScore,
  type ScoreTally,
} from '../../../solitaire/scoring'
import type { ScoringMode } from '../../../state/settings'
import { computeElapsedWithReference, formatElapsedDuration } from '../../../utils/time'
import { STAT_BADGE_MIN_WIDTH } from '../constants'

type StatisticsRowId = 'score' | 'vegas' | 'total' | 'moves' | 'time'

export type StatisticsRow = {
  // Language-independent identity: React key and testID (`stat-<id>`). The testID used
  // to be derived from the label, which is translated now.
  id: StatisticsRowId
  label: string
  value: string
  // Spoken form of the whole badge ("Vegas, minus 47 dollars").
  accessibilityLabel: string
}

type StatisticsHudProps = {
  rows: StatisticsRow[]
}

export const StatisticsHud: React.FC<StatisticsHudProps> = ({ rows }) => {
  if (!rows.length) {
    return null
  }

  return (
    <View style={styles.row}>
      {rows.map((row, index) => (
        // Each badge is ONE a11y node (user, round 2 / prompt 5: "label all three
        // badges"): the raw badge text reads "−$47" / "3:12" badly, and labelling
        // only the score badge would be inconsistent with its neighbours.
        <View
          key={row.id}
          accessible
          accessibilityLabel={row.accessibilityLabel}
          testID={`stat-${row.id}`}
          style={[styles.badge, index > 0 ? styles.badgeSpacing : undefined]}
        >
          <Text style={styles.badgeLabel}>{row.label}</Text>
          <Text style={styles.badgeValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

export const StatisticsPlaceholder: React.FC = () => <View style={styles.placeholder} />

type BuildStatisticsRowsParams = {
  showMoves: boolean
  showTime: boolean
  scoring: ScoringMode
  // Whether the CURRENT game was dealt as a Vegas-rules game (Phase 2).
  vegasRules: boolean
  score: ScoreTally
  // Cumulative Vegas total (P2-C): settled history + live game − reset offset.
  // null = "Keep Vegas total" is off → the per-game Vegas badge shows instead.
  vegasTotal: number | null
  moveCount: number
  elapsedMs: number
  timerState: TimerState
  timerStartedAt: number | null
}

// One row shape for every badge; `spoken` defaults to the visible value.
const row = (id: StatisticsRowId, value: string, spoken = value): StatisticsRow => {
  const label = t(`hud.${id}`)
  return {
    id,
    label,
    value,
    accessibilityLabel: t('hud.badgeA11y', { label, value: spoken }),
  }
}

const vegasRow = (id: 'vegas' | 'total', value: number, locale: string): StatisticsRow =>
  row(id, formatVegasScore(value, locale), formatVegasScoreSpoken(value))

export const buildStatisticsRows = ({
  showMoves,
  showTime,
  scoring,
  vegasRules,
  score,
  vegasTotal,
  moveCount,
  elapsedMs,
  timerState,
  timerStartedAt,
}: BuildStatisticsRowsParams): StatisticsRow[] => {
  const rows: StatisticsRow[] = []
  // App language + device region, Latin digits (the engine formatters take it as a
  // parameter because src/solitaire must not import src/i18n).
  const locale = getIntlLocale()
  // Score badge goes FIRST so Moves/Time keep their familiar positions against
  // the right edge (docs/product/scoring/scoring.md, UX section).
  // Badge rule since Phase 2 (Vegas = rules mode): Off → none; a Vegas-rules game
  // shows its Vegas tally whatever the setting now says (it was dealt as a casino
  // game) — as TOTAL when the player keeps a running total (P2-C), else per game;
  // any other game shows Standard — an unlimited game has no honest Vegas
  // number, and the Vegas setting applies to the next deal.
  if (scoring !== 'off') {
    if (!vegasRules) {
      rows.push(row('score', formatStandardScore(score.standard, locale)))
    } else if (vegasTotal === null) {
      rows.push(vegasRow('vegas', score.vegas, locale))
    } else {
      rows.push(vegasRow('total', vegasTotal, locale))
    }
  }
  if (showMoves) {
    // Plain String(n): Latin digits in every language, like the cards.
    rows.push(row('moves', String(moveCount)))
  }
  if (showTime) {
    const effectiveElapsedMs = computeElapsedWithReference(
      elapsedMs,
      timerState,
      timerStartedAt,
      Date.now()
    )
    rows.push(
      row(
        'time',
        formatElapsedDuration(effectiveElapsedMs),
        formatElapsedDurationSpoken(effectiveElapsedMs)
      )
    )
  }
  return rows
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: 'rgba(148, 163, 184, 0.35)',
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    minWidth: STAT_BADGE_MIN_WIDTH,
    alignItems: 'center',
  },
  badgeSpacing: {
    marginLeft: 10,
  },
  badgeLabel: {
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: 'rgba(226, 242, 217, 0.82)',
    marginBottom: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
  },
  placeholder: {
    minHeight: 48,
  },
})
