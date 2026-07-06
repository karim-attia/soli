import type { ComponentType } from 'react'

// H1: the feature-graphic screen is a dev-only marketing-asset generator
// (~1,000 lines, sole user of expo-linear-gradient). The top-level `if (__DEV__)`
// + require() is load-bearing: babel-preset-expo inlines __DEV__ to false in
// production builds, so dead-code elimination strips the whole screen module
// (and its expo-linear-gradient JS) from release bundles. Do NOT "simplify" this
// into a static import — that would ship the screen in production again.
let FeatureGraphicScreen: ComponentType | null = null
if (__DEV__) {
  FeatureGraphicScreen = require('../src/dev/FeatureGraphicScreen').default
}

export default function FeatureGraphicRoute() {
  return FeatureGraphicScreen ? <FeatureGraphicScreen /> : null
}
