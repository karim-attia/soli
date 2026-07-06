// Storage engine: expo-sqlite/kv-store (AsyncStorage-compatible API, backed by SQLite).
import Storage from 'expo-sqlite/kv-store'

import { devLog } from '../utils/devLogger'

const BOARD_METRICS_STORAGE_KEY = 'soli/ui/boardMetrics/v1'

export type PersistedBoardMetrics = {
  width: number
  height: number | null
}

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

const parseBoardMetrics = (serialized: string | null): PersistedBoardMetrics | null => {
  if (!serialized) {
    return null
  }

  const parsed = JSON.parse(serialized) as Partial<PersistedBoardMetrics>
  if (!isPositiveNumber(parsed.width)) {
    return null
  }

  return {
    width: parsed.width,
    height: isPositiveNumber(parsed.height) ? parsed.height : null,
  }
}

// Sync read is intentional: the payload is a tiny {width, height} JSON read once at
// startup. Reading it synchronously lets useKlondikeGame seed boardLayout in its
// useState initializer, which removes the first-render card-metrics flicker that the
// old async hydration caused.
export const loadBoardMetricsSync = (): PersistedBoardMetrics | null => {
  try {
    return parseBoardMetrics(Storage.getItemSync(BOARD_METRICS_STORAGE_KEY))
  } catch (error) {
    devLog('warn', '[uiPreferences] Failed to load board metrics', error)
    return null
  }
}

export const saveBoardMetrics = async (metrics: PersistedBoardMetrics): Promise<void> => {
  if (!isPositiveNumber(metrics.width)) {
    return
  }

  try {
    await Storage.setItem(
      BOARD_METRICS_STORAGE_KEY,
      JSON.stringify({
        width: metrics.width,
        height: metrics.height ?? null,
      })
    )
  } catch (error) {
    devLog('warn', '[uiPreferences] Failed to persist board metrics', error)
  }
}
