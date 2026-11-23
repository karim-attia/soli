# Expo Localization Guide

Last refreshed: 2026-11-23

## Scope

- Package/tool: `expo-localization` (`~58.0.5`, Expo SDK 58)
- This is the canonical Soli guide for this package.
- Feature plan: `docs/product/i18n/i18n.md`

## Sources

- SDK reference: https://docs.expo.dev/versions/latest/sdk/localization/
- Localization guide: https://docs.expo.dev/guides/localization/
- Installed source (read 2026-11-23): `node_modules/expo-localization/plugin/build/withExpoLocalization.js`, `build/Localization.types.d.ts`, `CHANGELOG.md`

## How Soli uses it

- Only `getLocales()` is used, in `src/i18n/index.ts`. The ordered list goes into our own pure resolver (`src/i18n/resolveLanguage.ts`), which picks the first device language Soli supports.
- No `useLocales()` hook: language is constant for the lifetime of a mounted tree; the root layout re-resolves on `AppState` → `active` and remounts when it changed (plan, Possible approaches C1).
- No in-app picker. Language = OS language / per-app language setting.

## Config plugin (app.json)

```json
[
  "expo-localization",
  {
    "supportedLocales": {
      "ios": ["en", "de", "fr", "es", "pt-BR", "it", "nl", "ja", "ru", "pl", "tr", "zh-Hans", "ko", "ar", "he"],
      "android": ["en", "de", "fr", "es", "pt-BR", "it", "nl", "ja", "ru", "pl", "tr", "zh-Hans", "ko", "ar", "he"]
    },
    "supportsRTL": true
  }
]
```

Plugin options (docs + plugin source):

| Option | Default | Effect |
|---|---|---|
| `supportedLocales` | none | Array, or `{ ios, android }`. iOS: written to `CFBundleLocalizations` in Info.plist (this is what makes the language appear in iOS Settings → Soli → Language, and what lets the app run in Arabic layout). Android: writes `res/xml/locales_config.xml` (`<locale android:name="pt-BR"/>` — the tag exactly as given), sets `android:localeConfig` on `<application>`, and adds `resourceConfigurations` to `app/build.gradle` |
| `supportsRTL` | `true` | Sets `android:supportsRtl` in the manifest. `false` writes `ExpoLocalization_supportsRTL=false` on both platforms |
| `forcesRTL` | `false` | Forces RTL regardless of language (dev tool; not used by Soli) |
| `allowDynamicLocaleChangesAndroid` | `true` | Adds `locale` and `layoutDirection` to MainActivity `android:configChanges` (not on the docs page; from the plugin source) |

Consequences of these facts for Soli:

- **Android does NOT recreate the Activity on a language change** (because `allowDynamicLocaleChangesAndroid` defaults to true). The JS runtime keeps running, so the app must react itself. Docs advice: call `getLocales()` again whenever the app returns to the foreground (`AppState`). On iOS the app is restarted by the system on a language change.
- Android resource qualifiers (plugin 58.0.4+): `he` is emitted as `b+iw`, `zh-Hans` additionally keeps `zh-rCN`. `locales_config.xml` itself contains the BCP-47 tags unchanged (`he`, `zh-Hans`, `pt-BR`).
- RTL is enabled by default from SDK 58. On iOS the RTL language must also be in `supportedLocales`, otherwise the app runs in its development language (LTR).
- SDK 58 breaking change: on iOS RTL is no longer force-enabled from the device locale by expo-localization; it follows React Native's `I18nManager`.
- The plugin changes native config → **prebuild needed** on both platforms after editing the list.
- App name localization (`locales` key in app.json + `CFBundleAllowMixedLocalizations`) is deliberately not used: the name is "Soli" in every language.

## `getLocales()`

Returns a non-empty array in the user's preference order. Fields of each `Locale` (types in 58.0.5):

`languageTag` (`"de-CH"`), `languageCode` (`"de"`), `languageScriptCode` (`"Hans"` or null), `regionCode`, `languageRegionCode`, `textDirection` (`'ltr' | 'rtl'`), `decimalSeparator`, `digitGroupingSeparator`, `currencyCode`, `currencySymbol`, `languageCurrencyCode`, `languageCurrencySymbol`, `measurementSystem`, `temperatureUnit`.

```ts
import { getLocales } from 'expo-localization'

const language = resolveAppLanguage(getLocales()) // first supported, else 'en'
```

Why not `getLocales()[0]`: `[0]` is the user's first language even when Soli doesn't support it. A device with `[rm-CH, de-CH]` would get English while iOS itself runs the app in German.

## Intl on Hermes

The localization guide states that with Hermes the `Intl` API is available on all platforms. Soli relies on `Intl.PluralRules` (required by i18next) and `Intl.DateTimeFormat`; the device spike result is recorded in the plan (step 1.2).

## Jest

`test/setup/mock-expo-localization.ts` mocks the module so every test runs with one `en-US` device locale.
