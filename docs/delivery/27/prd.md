# PBI 27: Android High Refresh Rate Control

[View in Backlog](../backlog.md#user-content-27)

## Overview

This PBI adds the ability to control the Android display refresh rate from within the app, allowing users to force high refresh rates (120Hz) for smoother animations or let the system decide automatically.

## Problem Statement

The Solitaire game sometimes renders at 120fps (smooth) and sometimes at 60fps (noticeable stutter), depending on device battery mode, thermal state, and system heuristics. Users who want consistently smooth animations currently have no control over this from within the app.

Android provides the `Surface.setFrameRate()` API (Android 11+) that allows apps to request specific refresh rates. While the system can override these requests in extreme conditions (low battery, overheating), providing this control gives users agency over their experience.

## User Stories

| Actor | User Story |
|:--|:--|
| Animation enthusiast | As a player I want to force high refresh rates so that card animations always feel smooth. |
| Battery-conscious user | As a player I want to keep the system default so that my battery isn't drained unnecessarily. |
| Advanced user | As a power user I want to understand what refresh rate options mean through clear descriptions. |

## Technical Approach

### Android API Overview

Android 11 (API 30) introduced `Surface.setFrameRate()` which allows apps to hint their preferred frame rate:

```kotlin
// Request 120fps with fixed source compatibility
surface.setFrameRate(120f, Surface.FRAME_RATE_COMPATIBILITY_FIXED_SOURCE)

// Request system default (0 = no preference)
surface.setFrameRate(0f, Surface.FRAME_RATE_COMPATIBILITY_DEFAULT)
```

The Window's `preferredDisplayModeId` can also be used to request a specific display mode, but `setFrameRate` is the recommended approach.

### Implementation Strategy

1. **Expo Native Module**: Create an Expo module (`expo-refresh-rate`) that exposes:
   - `setPreferredRefreshRate(fps: number)` - Request a specific refresh rate (0 = system default)
   - `getAvailableRefreshRates(): number[]` - Query device capabilities
   - `getCurrentRefreshRate(): number` - Get current display refresh rate

2. **Settings Integration**: Add a "Display refresh rate" setting in the Advanced section with options:
   - **High** (default): Request maximum available refresh rate for smoothest animations
   - **Auto**: Let Android decide based on content and battery

3. **Persistence**: Store preference via existing AsyncStorage-backed settings system.

4. **Platform Handling**: 
   - Android: Use native module
   - iOS/Web: No-op (iOS handles this automatically, web uses requestAnimationFrame)

### Why Not Dynamic Switching

While Android supports per-View frame rate voting for adaptive refresh rates during animations, this adds complexity and the benefit for a card game is minimal. A simple "always high" vs "system default" approach is more predictable and easier to understand.

## UX/UI Considerations

- Setting appears in the **Advanced** section of Settings, below Developer Mode
- Clear description explains battery trade-off: "Higher refresh rates provide smoother animations but use more battery"
- Setting is Android-only; hidden on iOS/web or shown as disabled with explanation
- Radio buttons for mutually exclusive options (not a switch)

## Acceptance Criteria

1. An "Advanced" section in Settings includes a "Display refresh rate" control with High/Auto options.
2. Selecting "High" requests the maximum available refresh rate from the Android system via native module.
3. Selecting "Auto" clears any app-level preference, letting Android decide.
4. The setting persists across app restarts, defaulting to "High" for new users.
5. The setting gracefully no-ops on iOS/web without errors.
6. The feature is only visible on Android API 30+ devices with displays supporting >60Hz.

## Dependencies

- Android API 30+ for `setFrameRate()` API
- Expo modules system for native code
- Existing settings infrastructure

## Open Questions

- Should we show current detected refresh rate in developer mode? (Nice to have, not in initial scope)
- Should the setting auto-hide on devices that only support 60Hz? (Yes, detect and hide)

## Related Tasks

See [tasks.md](./tasks.md) for the implementation breakdown.


