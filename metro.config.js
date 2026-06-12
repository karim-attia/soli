// Learn more https://docs.expo.io/guides/customizing-metro
/**
 * @type {import('expo/metro-config').MetroConfig}
 */
const { getDefaultConfig } = require('expo/metro-config')
const { withTamagui } = require('@tamagui/metro-plugin')

// Expo SDK 55 enables CSS and resolves .mjs files in its default Metro config.
const config = getDefaultConfig(__dirname)

module.exports = withTamagui(config, {
  components: ['tamagui'],
  config: './tamagui.config.ts',
})
