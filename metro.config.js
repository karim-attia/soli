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
process.env.TAMAGUI_IGNORE_BUNDLE_ERRORS ??=
  './specs/NativeSafeAreaView,./specs/NativeSafeAreaProvider'

// Since Expo SDK 55, the default Metro config enables CSS and resolves .mjs files.
const config = getDefaultConfig(__dirname)

// 2026-10-17: web is a dev-only tool (feature graphic at /feature-graphic, see AGENTS.md), but
// it had been broken since the 2026-07-06 switch to `expo-sqlite/kv-store`: the root layout's
// SettingsProvider pulls expo-sqlite into the web graph, whose web build imports
// `wa-sqlite.wasm` (Metro must treat .wasm as an asset) and runs `getItemSync` through a
// SharedArrayBuffer busy-wait (browser only allows that under cross-origin isolation). Both
// lines are Expo's documented expo-sqlite web setup:
// https://docs.expo.dev/versions/v58.0.0/sdk/sqlite/#web-setup. Native builds ignore both.
// Companion change: app.json `web.output` is "single" (client-only) because the static
// renderer would execute that sync SQLite read in Node, where there is no Worker/window.
config.resolver.assetExts.push('wasm')
const enhanceMiddleware = config.server.enhanceMiddleware
config.server.enhanceMiddleware = (middleware, server) => {
  const wrapped = enhanceMiddleware ? enhanceMiddleware(middleware, server) : middleware
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless')
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
    return wrapped(req, res, next)
  }
}

module.exports = withTamagui(config, {
  components: ['tamagui'],
  config: './tamagui.config.ts',
})
