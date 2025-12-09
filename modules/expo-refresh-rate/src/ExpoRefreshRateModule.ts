import { requireNativeModule } from 'expo-modules-core'

/**
 * Native module interface for expo-refresh-rate.
 * 
 * PBI-27: Android High Refresh Rate Control
 */
interface ExpoRefreshRateModuleType {
  isHighRefreshRateSupported(): boolean
  getMaxRefreshRate(): number | null
  getCurrentRefreshRate(): number
  setRefreshRateMode(mode: string): Promise<boolean>
}

// This will try to find the native module, but gracefully handle if not available
let module: ExpoRefreshRateModuleType | null = null

try {
  module = requireNativeModule('ExpoRefreshRate')
} catch {
  // Module not available (e.g., on web or iOS)
  module = null
}

// Provide fallback implementations when native module is not available
const ExpoRefreshRateModule: ExpoRefreshRateModuleType = module ?? {
  isHighRefreshRateSupported: () => false,
  getMaxRefreshRate: () => null,
  getCurrentRefreshRate: () => 60,
  setRefreshRateMode: async () => false,
}

export default ExpoRefreshRateModule


