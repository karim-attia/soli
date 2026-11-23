// App translations: i18next + expo-localization, WITHOUT react-i18next.
// Plan: docs/product/i18n/i18n.md · guides: docs/external-package-guides/{i18next,expo-localization}.md
//
// Decisions (do not undo without reading the plan):
// - No react-i18next / `useTranslation`. `t` is a plain import, usable in components, hooks,
//   `Alert.alert` callbacks and the pure a11y helpers alike. That is only safe because the
//   language is CONSTANT for the lifetime of a mounted tree: iOS restarts the app on a
//   language change, and on Android (no restart) app/_layout.tsx remounts the whole tree
//   after `syncLanguage()` reports a change. With the React Compiler a `t()` call in render
//   is memoized like a constant; the remount drops every memo cache, hooks would not.
// - NEVER call `t()` at module scope (no `const LABEL = t('…')`): a module constant keeps the
//   language of the first import forever. Call it inside a function body.
// - Own resolver (resolveLanguage.ts) instead of `getLocales()[0]` + i18next matching.
// - No language persistence, no in-app picker: the language is re-derived from the OS.
// - `de` is SWISS HIGH GERMAN for every German speaker (ss, never ß) — Karim's decision
//   ("Swiss-only", plan section F with the evidence from other Swiss apps). There is no
//   de-DE variant; do not "correct" de.json to ß (a jest check fails if you do).
// - Dev-only UI (Demo sheet, Developer/Animations settings, debug badges) is NOT translated
//   and not in en.json; those spots carry `// i18n: dev-only, intentionally English`.
// MUST stay the first import: Hermes ships NO `Intl.PluralRules` (device check 2026-11-23,
// iOS simulator: `typeof Intl.PluralRules === 'undefined'`). Without it i18next >= 24 only
// resolves `_one`/`_other`, i.e. ru/pl/ar plurals would be wrong. The polyfill installs
// itself only where the native implementation is missing or incomplete.
import 'intl-pluralrules'
import i18next from 'i18next'
import { getCalendars, getLocales } from 'expo-localization'

import ar from './locales/ar.json'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import he from './locales/he.json'
import it from './locales/it.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'
import nl from './locales/nl.json'
import pl from './locales/pl.json'
import ptBR from './locales/pt-BR.json'
import ru from './locales/ru.json'
import tr from './locales/tr.json'
import zhHans from './locales/zh-Hans.json'
import { resolveAppLanguage, type AppLanguage } from './resolveLanguage'

// Registered locale files. Adding a language = drop `locales/<code>.json`, import it and add
// ONE line here (the code must be in SUPPORTED_LANGUAGES + app.json `supportedLocales`).
// A language without a line here is treated as unsupported (device falls through to its
// next language / English), so partially delivered translations never ship half-English.
// `translation: object`, not `typeof en`: other languages have other plural forms (`_few`,
// `_many`, only `_other`), so their JSON shape differs. Key parity with English is checked
// by test/unit/i18n/locales.test.ts; typed `t()` keys come from en.json (i18next.d.ts).
export const resources: Partial<Record<AppLanguage, { translation: object }>> = {
  en: { translation: en },
  de: { translation: de },
  fr: { translation: fr },
  es: { translation: es },
  'pt-BR': { translation: ptBR },
  it: { translation: it },
  nl: { translation: nl },
  ja: { translation: ja },
  ru: { translation: ru },
  pl: { translation: pl },
  tr: { translation: tr },
  'zh-Hans': { translation: zhHans },
  ko: { translation: ko },
  ar: { translation: ar },
  he: { translation: he },
}

const registeredLanguages = Object.keys(resources) as AppLanguage[]

const resolve = () => resolveAppLanguage(getLocales(), registeredLanguages)

let resolved = resolve()

// Synchronous init: resources are bundled and `initAsync: false`, so `t()` works as soon as
// this module is imported (no loading state, no Suspense).
void i18next.init({
  resources,
  lng: resolved.language,
  // v27 default is `false` (no fallback): a key missing in a locale must show English.
  fallbackLng: 'en',
  supportedLngs: registeredLanguages,
  // The resolver already returns the exact resource key ("pt-BR", "zh-Hans").
  load: 'currentOnly',
  // React Native text is not HTML.
  interpolation: { escapeValue: false },
  initAsync: false,
})

export const t = i18next.t

export const getAppLanguage = (): AppLanguage => resolved.language

// Re-reads the OS language (Android does not restart the app on a language change; call
// this when the app returns to the foreground). Returns true when the language changed —
// the caller must then remount the tree (see the header).
export const syncLanguage = (): boolean => {
  const next = resolve()
  const changed = next.language !== resolved.language
  resolved = next
  if (changed) {
    // Synchronous with bundled resources; the promise only matters for backends.
    void i18next.changeLanguage(next.language)
  }
  return changed
}

// Locale tag for `Intl.*` / `toLocaleString`: APP language + DEVICE region ("de-CH").
// - Not `undefined` (= device default): a device whose first language we don't support
//   would print e.g. Romansh month names inside a German UI.
// - `nu-latn`: always Latin digits. Cards and the move counter are Latin, so an Arabic
//   locale must not switch only the score/dates to Arabic-Indic digits. Hermes IGNORES
//   this extension (device check 2026-11-23: `ar-EG` → "١٬٢٣٤"), so the formatters also
//   run their output through `toLatinDigits` (src/utils/latinDigits.ts, plan issue 15).
//   The extension stays for runtimes that honour it.
// - `hc`: an explicit locale drops the user's 12/24 h override that the device default
//   carried, so it is passed on from the OS setting.
// The tag is built from parts (never by appending to `languageTag`): Android tags can
// already carry a `-u-…` extension, and a second one is a RangeError.
export const getIntlLocale = (): string => {
  const uses24h = getCalendars()[0]?.uses24hourClock
  const hourCycle = uses24h == null ? '' : uses24h ? '-hc-h23' : '-hc-h12'
  return `${resolved.formatTag}-u${hourCycle}-nu-latn`
}
