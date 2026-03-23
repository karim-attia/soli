# Task 33-1: expo-font package guide

## Research timestamp
- 2026-03-11 (Europe/Zurich)

## Primary sources
- https://docs.expo.dev/develop/user-interface/fonts/
- https://docs.expo.dev/versions/latest/sdk/font/
- https://reactnative.dev/docs/text-style-props

## What this package provides
- `expo-font` loads bundled font files so React Native components can reference them by `fontFamily`.
- Expo recommends using static font files when possible because variable fonts do not have full platform support.
- React Native exposes `fontFamily` as a text style prop, so custom font selection happens per `Text` node rather than through a CSS-like fallback stack.

## Practical usage notes for this task
- Load the card font files in the root layout with `useFonts`.
- Give the card fonts explicit runtime family names via the `useFonts` map keys.
- Use weight-specific font files for cards instead of relying on `fontWeight` to resolve a custom-family bold face.
- Keep the font-family style scoped to the card rank text node only.
- If a suit shape must match Android exactly and text rendering drifts, render the suit from checked-in assets instead of trying to force another platform's text engine.

## Example task pattern
```tsx
const [fontsLoaded] = useFonts({
  CardRankRoboto700: require("../assets/fonts/CardRankRoboto700.ttf"),
})
```

## Task fit assessment
- `expo-font` is already available in this repo and is the supported way to ship custom bundled fonts in this app.
- The task should keep using the existing root-layout loading gate so card fonts are ready before the play screen renders.
