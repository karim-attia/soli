import React from 'react'
import { StyleSheet, View, Text } from 'react-native'

import type { GameState } from '../../../solitaire/klondike'
import { computeElapsedWithReference, formatElapsedDuration } from '../../../utils/time'
import { STAT_BADGE_MIN_WIDTH } from '../constants'

export type StatisticsRow = {
  label: string
  value: string
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
        <View
          key={row.label}
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
  state: GameState
  showMoves: boolean
  showTime: boolean
}

export const buildStatisticsRowsForState = ({
  state,
  showMoves,
  showTime,
}: BuildStatisticsRowsParams): StatisticsRow[] => {
  const rows: StatisticsRow[] = []
  if (showMoves) {
    rows.push({ label: 'Moves', value: String(state.moveCount) })
  }
  if (showTime) {
    const effectiveElapsedMs = computeElapsedWithReference(
      state.elapsedMs,
      state.timerState,
      state.timerStartedAt,
      Date.now(),
    )
    rows.push({ label: 'Time', value: formatElapsedDuration(effectiveElapsedMs) })
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

