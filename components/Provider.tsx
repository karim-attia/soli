import type { ReactNode } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { SettingsProvider } from '../src/state/settings'
import { HistoryProvider } from '../src/state/history'

// App-wide providers. Deliberately NO theme provider, portal/Teleport setup or toast stack:
// - Theme: Tamagui (and its TamaguiProvider on the OS scheme) was removed on 2026-10-18;
//   colours come from `usePalette()` (src/theme/tokens.ts), which reads `useColorScheme()`
//   directly, so RN surfaces and the independently hosted Expo UI controls still agree.
// - Portals: `@tamagui/native` + `react-native-teleport` only served Tamagui's Sheet/portals;
//   Soli's sheets are Expo UI `BottomSheet` (native), so nothing needs a portal host.
// - Toasts (@tamagui/toast: ToastProvider/ToastViewport/CurrentToast) fully removed
//   (2026-07-06): no code ever showed a toast, and on Android the ToastViewport's
//   full-screen focusable wrapper hid the ENTIRE app subtree from accessibility services
//   (a11y tree ended at its "Notifications (F8)" node on every screen). If toasts are
//   reintroduced, avoid a full-screen focusable viewport and re-verify the Android a11y
//   tree (agent-device snapshot -i must list board cards).
export function Provider({ children }: { children: ReactNode }) {
  return (
    // requirement 20-6: GestureHandlerRootView must wrap the app root on iOS.
    // Without it, iOS gestures can cancel during React Native refresh/commits.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SettingsProvider>
        <HistoryProvider>{children}</HistoryProvider>
      </SettingsProvider>
    </GestureHandlerRootView>
  )
}
