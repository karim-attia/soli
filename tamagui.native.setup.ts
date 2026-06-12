import '@tamagui/native/setup-teleport'

import { setupGestureHandler } from '@tamagui/native/setup-gesture-handler'

// Native setup has to run before expo-router imports the app tree, because Tamagui
// captures these adapters while initializing portal and Sheet internals.
setupGestureHandler({
  // Keep Tamagui out of global press ownership for now; card/gameplay presses are
  // timing-sensitive and already validated through React Native gesture handling.
  pressEvents: false,
  sheet: true,
})
