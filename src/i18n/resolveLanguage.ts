// Pure language resolver (no expo imports → unit-testable with plain objects).
// Plan: docs/product/i18n/i18n.md, Possible approaches B1.
//
// Why our own resolver instead of `getLocales()[0]` + i18next's matching:
// - `[0]` is the user's FIRST language even when Soli doesn't support it. A device with
//   [rm-CH, de-CH] must get German (that is what iOS itself picks for the app), not English.
// - i18next's `nonExplicitSupportedLngs` / `load: 'languageOnly'` cannot express
//   `pt-PT → pt-BR` or `zh-TW ≠ zh-Hans`.

// THE list of languages Soli ships. app.json (`expo-localization` → `supportedLocales`),
// the locale parity test and store/README refer to it — keep them in sync (prebuild after
// an app.json change).
// `de` is Swiss High German for EVERY German speaker (de-CH, de-DE, de-AT): ss, never ß.
// Decided by Karim (Swiss-only, plan "F. German"); do not add a de-DE variant or "fix" ß.
export const SUPPORTED_LANGUAGES = [
  'en',
  'de',
  'fr',
  'es',
  'pt-BR',
  'it',
  'nl',
  'ja',
  'ru',
  'pl',
  'tr',
  'zh-Hans',
  'ko',
  'ar',
  'he',
] as const

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]

// The subset of expo-localization's `Locale` the resolver reads.
export type DeviceLocale = {
  languageCode: string | null
  languageScriptCode?: string | null
  regionCode?: string | null
}

export type ResolvedLanguage = {
  language: AppLanguage
  // Language + region of the matched device locale ("de-CH", "pt-PT", "zh-Hans-CN") for
  // Intl formatting: dates/numbers follow the APP language with the DEVICE region.
  formatTag: string
}

const TRADITIONAL_CHINESE_REGIONS = ['TW', 'HK', 'MO']

const matchLanguage = (locale: DeviceLocale): AppLanguage | null => {
  const code = locale.languageCode?.toLowerCase()
  // Android still reports Hebrew under its legacy ISO 639 code.
  if (code === 'iw') {
    return 'he'
  }
  // pt-PT users get Brazilian Portuguese: understood, and better than English.
  if (code === 'pt') {
    return 'pt-BR'
  }
  if (code === 'zh') {
    // Traditional Chinese (TW/HK/MO) is NOT served Simplified — a known irritant;
    // those users fall through to their next language / English (zh-Hant = follow-up).
    const script = locale.languageScriptCode
    const simplified = script
      ? script === 'Hans'
      : !TRADITIONAL_CHINESE_REGIONS.includes(locale.regionCode ?? '')
    return simplified ? 'zh-Hans' : null
  }
  // Everything else matches by language code only (`de-*` → `de`, `fr-CA` → `fr`).
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code ?? '')
    ? (code as AppLanguage)
    : null
}

const joinTag = (...parts: Array<string | null | undefined>): string =>
  parts.filter(Boolean).join('-')

// Walks the device's ordered language list and returns the first one Soli has.
// `available` = the languages that actually have a bundled resource file (index.ts passes
// its registered list, so a not-yet-translated language falls through like an unknown one).
export const resolveAppLanguage = (
  locales: readonly DeviceLocale[],
  available: readonly AppLanguage[] = SUPPORTED_LANGUAGES
): ResolvedLanguage => {
  for (const locale of locales) {
    const language = matchLanguage(locale)
    if (language && available.includes(language)) {
      return {
        language,
        // "pt-BR" text on a pt-PT device still formats as pt-PT.
        formatTag: joinTag(language === 'pt-BR' ? 'pt' : language, locale.regionCode),
      }
    }
  }
  // English UI, but keep the device's region so dates/number grouping stay familiar
  // (a Swedish phone gets "en-SE": English month names, 24 h clock).
  return { language: 'en', formatTag: joinTag('en', locales[0]?.regionCode) }
}
