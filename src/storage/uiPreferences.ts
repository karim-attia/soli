import AsyncStorage from '@react-native-async-storage/async-storage'

import { devLog } from '../utils/devLogger'

const BOARD_METRICS_STORAGE_KEY = 'soli/ui/boardMetrics/v1'

export type PersistedBoardMetrics = {
  width: number
  height: number | null
}

const isPositiveNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0

export const loadBoardMetrics = async (): Promise<PersistedBoardMetrics | null> => {
  try {
    const serialized = await AsyncStorage.getItem(BOARD_METRICS_STORAGE_KEY)
    if (!serialized) {
      return null
    }

    const parsed = JSON.parse(serialized) as Partial<PersistedBoardMetrics>
    if (!isPositiveNumber(parsed.width)) {
      return null
    }

    const height = isPositiveNumber(parsed.height) ? parsed.height : null
    return {
      width: parsed.width,
      height,
    }
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
    await AsyncStorage.setItem(
      BOARD_METRICS_STORAGE_KEY,
      JSON.stringify({
        width: metrics.width,
        height: metrics.height ?? null,
      }),
    )
  } catch (error) {
    devLog('warn', '[uiPreferences] Failed to persist board metrics', error)
  }
}

