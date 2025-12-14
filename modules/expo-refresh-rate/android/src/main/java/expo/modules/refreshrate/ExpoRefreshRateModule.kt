package expo.modules.refreshrate

import android.os.Build
import android.view.Surface
import android.view.WindowManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Expo module for controlling Android display refresh rate.
 * 
 * PBI-27: Android High Refresh Rate Control
 * Uses Surface.setFrameRate() API available on Android 11+ (API 30)
 */
class ExpoRefreshRateModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoRefreshRate")

    /**
     * Check if high refresh rate control is supported on this device.
     * Requires Android 11 (API 30) or higher.
     */
    Function("isHighRefreshRateSupported") {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
    }

    /**
     * Get the maximum refresh rate supported by the display.
     * Returns null if not available or on unsupported Android versions.
     */
    Function("getMaxRefreshRate") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        return@Function null
      }
      
      val activity = appContext.currentActivity ?: return@Function null
      val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        activity.display
      } else {
        @Suppress("DEPRECATION")
        activity.windowManager.defaultDisplay
      }
      
      display?.supportedModes?.maxOfOrNull { it.refreshRate }?.toDouble()
    }

    /**
     * Set the preferred refresh rate mode.
     * 
     * @param mode One of: "auto", "high"
     *   - "auto": No app preference, let system decide (clears any previous preference)
     *   - "high": Request maximum available refresh rate for smoothest animations
     */
    AsyncFunction("setRefreshRateMode") { mode: String ->
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        return@AsyncFunction false
      }
      
      val activity = appContext.currentActivity ?: return@AsyncFunction false
      
      activity.runOnUiThread {
        try {
          val window = activity.window
          val params = window.attributes
          
          if (mode == "high") {
            // Request maximum available refresh rate
            val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
              activity.display
            } else {
              @Suppress("DEPRECATION")
              activity.windowManager.defaultDisplay
            }
            val maxRefreshRate = display?.supportedModes?.maxOfOrNull { it.refreshRate } ?: 120f
            params.preferredRefreshRate = maxRefreshRate
          } else {
            // "auto" - clear any preference, let system decide
            params.preferredRefreshRate = 0f
          }
          
          window.attributes = params
        } catch (e: Exception) {
          // Silently handle any errors - refresh rate is a hint, not guaranteed
        }
      }
      
      true
    }

    /**
     * Get current display refresh rate.
     * Returns the actual refresh rate the display is running at.
     */
    Function("getCurrentRefreshRate") {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        return@Function 60.0 // Default assumption for older devices
      }
      
      val activity = appContext.currentActivity ?: return@Function 60.0
      val display = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        activity.display
      } else {
        @Suppress("DEPRECATION")
        activity.windowManager.defaultDisplay
      }
      
      display?.refreshRate?.toDouble() ?: 60.0
    }
  }
}


