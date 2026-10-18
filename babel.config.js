// Preset only. The `@tamagui/babel-plugin` entry went with the 2026-10-18 Tamagui removal;
// `babel-preset-expo` also loads `@expo/ui/babel-plugin` (the `Icon.select` rewrite).
module.exports = (api) => {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
  }
}
