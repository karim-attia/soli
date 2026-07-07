// Learn more https://docs.expo.io/guides/customizing-metro
/**
 * @type {import('expo/metro-config').MetroConfig}
 */
const { getDefaultConfig } = require('expo/metro-config')
const { withTamagui } = require('@tamagui/metro-plugin')

// 2026-07-07: Silence "[tamagui] skipped loading 2 module" warning. The skipped modules are
// react-native-safe-area-context's New Architecture codegen specs, which Tamagui's compile-time
// style extractor can't evaluate in Node (they register native components). Skipping only means
// extraction de-opts to runtime for those files — benign, no behavior change.
process.env.TAMAGUI_IGNORE_BUNDLE_ERRORS ??= './specs/NativeSafeAreaView,./specs/NativeSafeAreaProvider'

// Since Expo SDK 55, the default Metro config enables CSS and resolves .mjs files.
const config = getDefaultConfig(__dirname)

module.exports = withTamagui(config, {
  components: ['tamagui'],
  config: './tamagui.config.ts',
})
