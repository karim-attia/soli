# Expo Font Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `expo-font`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

## Research timestamp
- 2026-03-11 (Europe/Zurich)

## Primary sources
- https://docs.expo.dev/develop/user-interface/fonts/
- https://docs.expo.dev/versions/v56.0.0/sdk/font/
- https://reactnative.dev/docs/text-style-props

## What this package provides
- `expo-font` loads bundled font files so React Native components can reference them by `fontFamily`.
- Expo recommends using static font files when possible because variable fonts do not have full platform support.
- React Native exposes `fontFamily` as a text style prop, so custom font selection happens per `Text` node rather than through a CSS-like fallback stack.

## Practical usage notes for card fonts
- For deterministic native card rendering, prefer the config plugin/prebuild contract over
  runtime font loading.
- Soli currently loads app UI fonts such as Inter in the root layout with `useFonts`; it
  does not load `CardTextAndroid` there.
- The current card-font contract registers/embeds the same three `CardTextAndroid` files on
  both Android and iOS. Android uses one weighted family with `400`, `600`, and `700`
  definitions; iOS embeds the same three files.
- The tracked `CardTextAndroid*.ttf` binaries have OS/2 vertical metrics patched to the
  connected phone's Roboto profile. That is what lets Android registration preserve the
  previously approved fallback appearance without falling back to device-specific fonts.
- If card text rendering drifts, inspect `app.json`, generated native font
  registration/assets, and the tracked font OS/2 metrics before changing card constants,
  font sizes, or layout offsets.

## Example config pattern
```json
[
  "expo-font",
  {
    "ios": {
      "fonts": [
        "./assets/fonts/CardTextAndroid.ttf",
        "./assets/fonts/CardTextAndroid-SemiBold.ttf",
        "./assets/fonts/CardTextAndroid-Bold.ttf"
      ]
    },
    "android": {
      "fonts": [
        {
          "fontFamily": "CardTextAndroid",
          "fontDefinitions": [
            {
              "path": "./assets/fonts/CardTextAndroid.ttf",
              "weight": 400
            },
            {
              "path": "./assets/fonts/CardTextAndroid-SemiBold.ttf",
              "weight": 600
            },
            {
              "path": "./assets/fonts/CardTextAndroid-Bold.ttf",
              "weight": 700
            }
          ]
        }
      ]
    }
  }
]
```

## Task fit assessment
- `expo-font` is already available in this repo and is the supported way to ship custom
  bundled fonts in this app.
- For `CardTextAndroid`, the root-layout loading gate is not the source of truth; the
  source of truth is tracked Expo config plus the tracked patched font binaries.

## Refresh check (2026-07-03)

- Status: current for the original card-font task.
- Current repo state: `expo-font@56.0.7` is resolved, matching the Expo SDK 56 recommended
  version `~56.0.7`.
- Source update: for SDK-specific facts, prefer the SDK 56 page instead of `latest`, which
  now follows SDK 57 docs.
- Best-practice note: Expo now recommends the `expo-font` config plugin for Android/iOS
  when possible because fonts are embedded at build time. Runtime `useFonts` remains valid
  for app UI fonts, but `CardTextAndroid` is governed by the native prebuild contract.
- Sources:
  - https://docs.expo.dev/versions/v56.0.0/sdk/font/
  - https://docs.expo.dev/develop/user-interface/fonts/
  - https://reactnative.dev/docs/text-style-props

## Deterministic native card-font contract (2026-07-03)

- Source refresh:
  - https://docs.expo.dev/develop/user-interface/fonts/
  - https://docs.expo.dev/versions/latest/sdk/font/
- Expo's current fonts guide says the `expo-font` config plugin embeds font files in
  native Android/iOS code and is the recommended path for native platforms.
- Android can define a family with weighted font definitions. Soli uses that supported
  shape for `CardTextAndroid` so all Android devices select the same bundled rank/suit
  family instead of a device-specific fallback.
- Runtime `useFonts` remains useful for non-card app fonts and web-style loading, but the
  deterministic native card-font source of truth is `app.json` plus the tracked
  `assets/fonts/CardTextAndroid*.ttf` files.
- The 2026-07-03 metrics patch changes the tracked font OS/2 typo/win metrics and clears
  `USE_TYPO_METRICS` to mirror the connected phone's Roboto vertical metrics at upem 1024.
  This preserves the approved Android fallback appearance after real registration while
  leaving iOS hhea-driven rendering unchanged.
- The old generated-native guard script was removed. With native folders fully untracked
  and regenerated by CNG, a regression now requires a reviewed change to tracked config or
  tracked font binaries rather than an accidental fallback path.
