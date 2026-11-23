import { resources } from '../../../src/i18n'
import { SUPPORTED_LANGUAGES, type AppLanguage } from '../../../src/i18n/resolveLanguage'
import en from '../../../src/i18n/locales/en.json'
import context from '../../../src/i18n/locales/en.context.json'
import lastTranslated from '../../../src/i18n/locales/en.last-translated.json'

// Mechanical gates for the locale files (docs/product/i18n/i18n.md, approach D2). They
// iterate the locales REGISTERED in src/i18n/index.ts, so they pass with `en` alone and
// tighten automatically with every language that gets registered.

type Tree = { [key: string]: string | Tree }

const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>((flat, [key, value]) => {
    const path = `${prefix}${key}`
    return typeof value === 'string'
      ? { ...flat, [path]: value }
      : { ...flat, ...flatten(value, `${path}.`) }
  }, {})

const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/
const baseKey = (key: string): string => key.replace(PLURAL_SUFFIX, '')
const pluralForm = (key: string): string | null => PLURAL_SUFFIX.exec(key)?.[1] ?? null
const placeholders = (value: string): string[] =>
  [...new Set(value.match(/{{\s*\w+\s*}}/g) ?? [])].sort()

const english = flatten(en)
const englishKeys = Object.keys(english)
// A plural key is a base name that has an `_other` form in English.
const pluralBases = new Set(
  englishKeys.filter((key) => pluralForm(key) === 'other').map(baseKey)
)
const englishBases = [...new Set(englishKeys.map(baseKey))].sort()

// Keys whose value may legitimately equal English in another language, PER LANGUAGE
// ('all' = the name "Vegas"). Per language on purpose (review V2): a global set would also
// excuse e.g. an untranslated "Hint" in German. Extend deliberately, from the translators'
// and reviewers' notes, after checking the word really is the same in that language.
// Pure patterns ("{{label}}, {{value}}") need no entry: values without any letter outside
// the placeholders are skipped.
const UNTRANSLATED_OK: Record<string, readonly AppLanguage[] | 'all'> = {
  'hud.vegas': 'all',
  'settings.scoring.vegas': 'all',
  'history.vegas': 'all',
  'hud.total': ['de', 'fr', 'es', 'pt-BR'], // «Total»
  'hud.score': ['fr', 'nl'], // «Score»
  'history.score': ['fr', 'nl'], // «Score {{value}}»
  'settings.scoring.standard': ['de', 'fr', 'it'], // «Standard»
  'hud.vegasSpoken': ['fr', 'nl'], // «{{count}} dollar(s)»
  'time.minutes': ['fr'], // «{{count}} minute(s)»
  'a11y.rank.6': ['fr'], // «Six»
  'game.hint': ['nl'], // «Hint»
  'history.stats.incomplete': ['it'], // «Incomplete» = Italian feminine plural
}
const untranslatedOk = (key: string, language: AppLanguage): boolean => {
  const allowed = UNTRANSLATED_OK[baseKey(key)]
  return allowed === 'all' || (allowed?.includes(language) ?? false)
}
const hasWords = (value: string): boolean => /\p{L}/u.test(value.replace(/{{.*?}}/g, ''))

const registered = Object.keys(resources) as AppLanguage[]
const translated = registered.filter((language) => language !== 'en')

describe('en.json (source of truth)', () => {
  it('has no empty values', () => {
    expect(englishKeys.filter((key) => english[key].trim() === '')).toEqual([])
  })

  it('gives every plural key exactly the English forms one + other', () => {
    for (const base of pluralBases) {
      expect(englishKeys.filter((key) => baseKey(key) === base).sort()).toEqual([
        `${base}_one`,
        `${base}_other`,
      ])
    }
  })

  it('has a translator note in en.context.json for every key, and no stale notes', () => {
    const noted = Object.keys(context)
      .filter((key) => key !== '_readme')
      .sort()
    expect(noted).toEqual(englishBases)
  })
})

describe('registered locales', () => {
  it('are all declared in SUPPORTED_LANGUAGES (and so in app.json)', () => {
    expect(
      registered.filter((language) => !SUPPORTED_LANGUAGES.includes(language))
    ).toEqual([])
    expect(registered).toContain('en')
  })

  // Stale detection (D2): all locales are always re-translated together, so ONE snapshot
  // of en.json "as last translated" is enough. Fix = run the translation skill for the
  // listed keys in every locale, then copy en.json over en.last-translated.json.
  // Skipped while English is the only language (nothing can be stale).
  it('were translated from the current English text', () => {
    if (translated.length === 0) {
      return
    }
    const snapshot = flatten(lastTranslated)
    const changed = [...new Set([...englishKeys, ...Object.keys(snapshot)])].filter(
      (key) => english[key] !== snapshot[key]
    )
    expect(changed).toEqual([])
  })

  // forEach (not describe.each): jest rejects an empty table while `en` is the only locale.
  translated.forEach((language) =>
    describe(language, () => {
      const locale = flatten(resources[language]!.translation as Tree)
      const keys = Object.keys(locale)
      // CLDR plural forms this language needs, e.g. ru: one/few/many/other, ja: other,
      // fr/es/it/pt: one/many/other (so `_many` is required there, usually = `_other`).
      const categories = new Intl.PluralRules(language).resolvedOptions().pluralCategories

      it('has exactly the English keys (plural keys compared by base name)', () => {
        expect([...new Set(keys.map(baseKey))].sort()).toEqual(englishBases)
        // No plural suffix on a key that is not plural in English, and vice versa.
        expect(
          keys.filter(
            (key) => (pluralForm(key) !== null) !== pluralBases.has(baseKey(key))
          )
        ).toEqual([])
      })

      it('has exactly the CLDR plural forms of the language for every plural key', () => {
        for (const base of pluralBases) {
          expect(keys.filter((key) => baseKey(key) === base).sort()).toEqual(
            categories.map((category) => `${base}_${category}`).sort()
          )
        }
      })

      it('keeps the {{placeholders}} of every key', () => {
        const wrong = keys.filter((key) => {
          const expected = placeholders(
            english[key] ?? english[`${baseKey(key)}_other`] ?? ''
          )
          const actual = placeholders(locale[key])
          // A plural form other than `_other` may drop {{count}} ("no cards"), but never
          // invent a placeholder; everything else must match exactly.
          return pluralForm(key) !== null && pluralForm(key) !== 'other'
            ? actual.some((name) => !expected.includes(name))
            : actual.join() !== expected.join()
        })
        expect(wrong).toEqual([])
      })

      it('has no empty values', () => {
        expect(keys.filter((key) => locale[key].trim() === '')).toEqual([])
      })

      it('is translated (no value identical to English outside the allow-list)', () => {
        expect(
          keys.filter(
            (key) =>
              hasWords(locale[key]) &&
              locale[key] === (english[key] ?? english[`${baseKey(key)}_other`]) &&
              !untranslatedOk(key, language)
          )
        ).toEqual([])
      })

      if (language === 'de') {
        // German is Swiss High German for every German speaker: ss, never ß (plan, section F).
        it('contains no ß', () => {
          expect(keys.filter((key) => locale[key].includes('ß'))).toEqual([])
        })
      }
    })
  )
})
