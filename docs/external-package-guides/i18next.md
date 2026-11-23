# i18next Guide

Last refreshed: 2026-11-23

## Scope

- Package/tool: `i18next` (`^27.2.3`, installed 27.2.4)
- This is the canonical Soli guide for this package.
- Feature plan: `docs/product/i18n/i18n.md`
- Version note: the plan named 27.2.6, published the same day. Yarn's `npmMinimalAgeGate: 1d` (supply-chain protection, `.yarnrc.yml`) quarantines it, so the newest version older than a day was installed. No override was added on purpose.

## Sources

- Configuration options: https://www.i18next.com/overview/configuration-options
- Plurals: https://www.i18next.com/translation-function/plurals
- TypeScript: https://www.i18next.com/overview/typescript
- Installed source (read 2026-11-23): `node_modules/i18next/typescript/options.d.ts`, `dist/esm/i18next.js`

## How Soli uses it

- **Without `react-i18next`.** `t` is a plain import from `src/i18n` and is called inside component/hook/callback/helper bodies. Language is constant while a tree is mounted; the root layout remounts the tree when the OS language changed (Android) — see the header of `src/i18n/index.ts`.
- **Never call `t()` at module scope.** A module constant would keep the language of the moment the file was first imported.
- One namespace (`translation`), nested keys, all resources bundled as static JSON imports (`src/i18n/locales/*.json`).

## Init (v27 facts)

```ts
import i18next from 'i18next'
import en from './locales/en.json'

void i18next.init({
  resources: { en: { translation: en } },
  lng: resolveAppLanguage(getLocales()),
  fallbackLng: 'en',
  supportedLngs: ['en'],
  load: 'currentOnly',
  interpolation: { escapeValue: false },
  initAsync: false,
})
```

| Option | Default | Why Soli sets it |
|---|---|---|
| `fallbackLng` | `false` (no fallback) | `'en'` — a key missing in a locale must show English, not the key |
| `supportedLngs` | `false` | the registered locales |
| `load` | `'all'` (`en-US` → `en-US`, `en`) | `'currentOnly'`: our resolver already returns the exact resource key (`pt-BR`, `zh-Hans`) |
| `initAsync` | `true` (init continues after a `setTimeout`) | `false` + bundled `resources` → `t()` works synchronously right after `init()` |
| `interpolation.escapeValue` | `true` (HTML-escapes values) | `false` — React Native text is not HTML |
| `returnNull` | `false` | default kept |

Removed/renamed in recent majors: `compatibilityJSON` is gone (JSON v4 plural suffixes are the only format), `initImmediate` is now `initAsync`.

`i18next.changeLanguage(lng)` returns a promise; with bundled resources the language is switched synchronously.

## Plurals

Suffix format (CLDR categories): `key_zero`, `key_one`, `key_two`, `key_few`, `key_many`, `key_other`. `t('key', { count })` is required to reach them; without `count` the plural forms are never looked up.

```json
{ "moves_one": "{{count}} move", "moves_other": "{{count}} moves" }
```

- Forms are chosen with `Intl.PluralRules` of the current language. **`Intl.PluralRules` must exist** (docs: where it is missing only `_one`/`_other` resolve). **Hermes does NOT ship it** (iOS simulator, 2026-11-23: `typeof Intl.PluralRules === 'undefined'`), so `src/i18n/index.ts` imports the polyfill `intl-pluralrules` (2.0.1, https://github.com/eemeli/make-plural/tree/main/packages/intl-pluralrules — side-effect import, installs itself only when the native one is missing/incomplete) as its FIRST import. Verified with it on iOS: `ar` 2 → `two`, `ru` 3 → `few`, `pl` 5 → `many`, ar categories `zero,one,two,few,many,other`. Its CLDR data has no `many` for French (`fr` 1000000 → `other`; Node says `many`) — harmless while `_many` equals `_other`.
- Since v27.1.0 a missing form falls back to the same language's `_other`, then to the fallback language.
- Which forms a locale needs: `new Intl.PluralRules(locale).resolvedOptions().pluralCategories`. Node reports `one, many, other` for fr/es/it/pt → `_many` is required there (and usually equals `_other`). `test/unit/i18n/locales.test.ts` enforces this.
- `_one` is a category, not the number 1 (fr: 0 and 1; ru: 1, 21, 31 …) → always write `{{count}}`, never a literal "1".
- A `{{count}}` placeholder triggers plural lookup. For a number that is NOT a quantity (the mode name "Draw 3") Soli uses another placeholder name (`{{number}}`).

## TypeScript

`src/i18n/i18next.d.ts`:

```ts
import type en from './locales/en.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: { translation: typeof en }
  }
}
```

- Keys are checked (`t('nav.play')`), plural keys are addressed by their base name (`t('history.moves', { count })`).
- `strictInterpolationChecks` defaults to `true`: the options object must carry the placeholders of the key.
- Dynamic keys need a literal-union type, e.g. ``t(`a11y.suit.${suit}`)`` with `suit: Suit`.
- Docs require TypeScript ≥ 5; the repo's TypeScript 7 (`tsc`) accepts it (gate: `yarn typecheck`).
