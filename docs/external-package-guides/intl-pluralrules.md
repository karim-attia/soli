# intl-pluralrules Guide

Last refreshed: 2026-11-23

## Scope

- Package/tool: `intl-pluralrules` (`^2.0.1`, installed 2.0.1; ISC licence; depends on `make-plural ^7`, which carries the CLDR plural data)
- This is the canonical Soli guide for this package.
- Feature plan: `docs/product/i18n/i18n.md` (issue 1). Related guide: `docs/external-package-guides/i18next.md` (plurals).

## Sources

- npm: https://www.npmjs.com/package/intl-pluralrules
- Repository + README: https://github.com/eemeli/intl-pluralrules
- Installed source (read 2026-11-23): `node_modules/intl-pluralrules/README.md`, `polyfill.js`, `plural-rules.js`
- `Intl.PluralRules` (MDN): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules

## Why Soli needs it

- **Hermes on iOS ships no `Intl.PluralRules`** (verified on device 2026-11-23, iOS simulator, Release build: `typeof Intl.PluralRules === 'undefined'`). The planning assumption "Hermes has it" was wrong.
- i18next (>= 24, JSON v4 plurals) picks the plural form with `Intl.PluralRules`. Without it, it silently resolves only `_one` / `_other`: English looks fine, but Russian, Polish, Arabic and Hebrew would show wrong or English forms.
- After adding the polyfill (same device): `ar` 2 → `two`, `ru` 3 → `few`, `pl` 5 → `many`, Arabic categories `zero,one,two,few,many,other`.
- JS only: no native code, no prebuild. About 7 kB gzipped with all locales (README).

## How Soli uses it

One side-effect import, as the FIRST import of `src/i18n/index.ts` (before `i18next`), with an inline comment saying why:

```ts
// MUST stay the first import: Hermes ships NO `Intl.PluralRules` …
import 'intl-pluralrules'
import i18next from 'i18next'
```

Nothing else imports the package. Do not move the import below `i18next` and do not remove it because "jest passes": Node has a native `Intl.PluralRules`, so jest never exercises the polyfill.

## Behaviour (README + `polyfill.js`)

- The import installs `Intl.PluralRules` only when it is missing, has no `selectRange()`, or does not support several locales (it probes `en, es, ru, zh`). Where a complete native implementation exists (Node / jest, possibly Android's Hermes) nothing is replaced. `Intl.PluralRules.polyfill === true` tells you the polyfill is active.
- If `Intl` itself is missing, the polyfill creates it with `PluralRules` only.
- It needs `Intl.NumberFormat` for the digit options (Hermes has it).
- Ponyfill, without touching `Intl` (handy for checks in Node):

```ts
import PluralRules from 'intl-pluralrules/plural-rules'

new PluralRules('ru').select(3) // 'few'
new PluralRules('ar').resolvedOptions().pluralCategories // zero, one, two, few, many, other
```

- `intl-pluralrules/factory` + `make-plural` builds a class with only the locales you list (about 1.5 kB for two). Not used: 7 kB is not worth a hand-kept locale list.

## Categories for Soli's languages (ponyfill 2.0.1 vs Node 26, checked 2026-11-23)

Identical category sets, so the locale test (which uses Node's `Intl.PluralRules`) checks the forms the device will ask for:

| Languages | Categories |
|---|---|
| en, de, nl, tr | one, other |
| fr, es, it, pt-BR | one, many, other |
| ru, pl | one, few, many, other |
| ar | zero, one, two, few, many, other |
| he | one, two, other |
| ja, zh-Hans, ko | other |

Known difference: the polyfill returns `other` for 1 000 000 in French where Node returns `many`. Harmless while `_many` has the same text as `_other` (the translation skill requires that).

## Open points

- Android was not tested (phone unreachable on 2026-11-23). The polyfill is platform-independent, but if Android's Hermes brings its own `Intl.PluralRules` from the system ICU, the polyfill stays out and the categories come from the device (an old ICU still has `many` for Hebrew; `he.json` has no `_many`, so i18next would fall back to English for those counts). Check `Intl.PluralRules.polyfill` and a Hebrew count of 20 on the phone.
- Removing the package is possible once Hermes ships `Intl.PluralRules` on both platforms: verify on a device, not in jest.
