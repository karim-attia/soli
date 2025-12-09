import { Platform } from 'react-native'
import ExpoRefreshRateModule from './ExpoRefreshRateModule'

/**
 * Refresh rate mode options for Android.
 * 
 * PBI-27: Android High Refresh Rate Control
 */
export type RefreshRateMode = 'auto' | 'high'

/**
 * Check if high refresh rate control is supported on this device.
 * Only supported on Android 11 (API 30) and higher.
 */
export function isHighRefreshRateSupported(): boolean {
  if (Platform.OS !== 'android') {
    return false
  }
  return ExpoRefreshRateModule.isHighRefreshRateSupported() ?? false
}

/**
 * Get the maximum refresh rate supported by the display.
 * Returns null if not available or on unsupported platforms.
 */
export function getMaxRefreshRate(): number | null {
  if (Platform.OS !== 'android') {
    return null
  }
  return ExpoRefreshRateModule.getMaxRefreshRate() ?? null
}

/**
 * Get the current display refresh rate.
 * Returns 60 as a fallback on unsupported platforms.
 */
export function getCurrentRefreshRate(): number {
  if (Platform.OS !== 'android') {
    return 60
  }
  return ExpoRefreshRateModule.getCurrentRefreshRate() ?? 60
}

/**
 * Set the preferred refresh rate mode.
 * 
 * @param mode The desired refresh rate mode:
 *   - 'auto': Let Android decide based on content and battery
 *   - 'high': Request 120Hz for smoothest animations  
 *   - 'standard': Request 60Hz for battery savings
 * 
 * @returns Promise that resolves to true if successful, false if not supported
 */
export async function setRefreshRateMode(mode: RefreshRateMode): Promise<boolean> {
  if (Platform.OS !== 'android') {
    // Silently no-op on non-Android platforms
    return false
  }
  
  try {
    return await ExpoRefreshRateModule.setRefreshRateMode(mode)
  } catch {
    // Handle any errors gracefully
    return false
  }
}


