// Guards the store listing text in store/ (i18n plan, step 4.4): required
// files per locale folder, store character limits, keyword format, policy
// words and the Swiss "no ß" rule. Reads only store/ — deliberately no import
// from src/i18n, so listing text and app strings can change independently.
// Layout, limits and the locale mapping are documented in store/README.md;
// change them there and here together.
import fs from 'fs'
import path from 'path'

const STORE_DIR = path.resolve(__dirname, '../../../store')

// App language → listing folder per store. One folder per language; the
// extra store locales that reuse the same text (es-MX, fr-CA, …) are an
// upload concern and live only in store/README.md.
const LISTING_LOCALES: Record<string, { ios: string; android: string }> = {
  en: { ios: 'en-US', android: 'en-US' },
  'en-GB': { ios: 'en-GB', android: 'en-GB' }, // store-only "Patience" variant, no app locale
  de: { ios: 'de-DE', android: 'de-DE' }, // Swiss High German; neither store has de-CH
  fr: { ios: 'fr-FR', android: 'fr-FR' },
  es: { ios: 'es-ES', android: 'es-ES' },
  'pt-BR': { ios: 'pt-BR', android: 'pt-BR' },
  it: { ios: 'it', android: 'it-IT' },
  nl: { ios: 'nl-NL', android: 'nl-NL' },
  ja: { ios: 'ja', android: 'ja-JP' },
  ru: { ios: 'ru', android: 'ru-RU' },
  pl: { ios: 'pl', android: 'pl-PL' },
  tr: { ios: 'tr', android: 'tr-TR' },
  'zh-Hans': { ios: 'zh-Hans', android: 'zh-CN' },
  ko: { ios: 'ko', android: 'ko-KR' },
  ar: { ios: 'ar-SA', android: 'ar' },
  he: { ios: 'he', android: 'iw-IL' },
}

// Characters allowed per field (Apple: App Store Connect; Google: Play Console).
const IOS_LIMITS: Record<string, number> = {
  name: 30,
  subtitle: 30,
  keywords: 100,
  promotional_text: 170,
  description: 4000,
}
const ANDROID_LIMITS: Record<string, number> = {
  title: 30,
  short_description: 80,
  full_description: 4000,
}
const RELEASE_NOTES_LIMIT = 500 // Play's limit; the same text is used for both stores

// Price words: Apple guideline 2.3.7 treats "free" in name/subtitle as a price
// reference (rejection), and Play bans "Free"/"No Ads" in titles. Matched on
// word boundaries, so "ad-free" in a description or keyword is unaffected
// (those fields are not checked). The words are the price words of the
// glossary's per-language "Forbidden words" tables; extend both together.
const PRICE_WORDS_LATIN =
  /(^|[^\p{L}])(free|gratis|kostenlos|umsonst|gratuit|gratuite|gratuitement|gratuito|gratuita|gratuitamente|omaggio|grátis|de graça|kosteloos|darmowy|darmowa|za darmo|bezpłatny|bezpłatna|ücretsiz|bedava|бесплатно|бесплатный|бесплатная|даром)(?=$|[^\p{L}])/iu
// Scripts without spaces between words (ja, zh, ko) and languages that glue
// prefixes to the word (ar, he) cannot be matched on word boundaries.
const PRICE_WORDS_SUBSTRING = /無料|0円|免费|무료|공짜|مجان|חינם|חינמי|ללא תשלום/u
const PRICE_WORDS = {
  test: (text: string) =>
    PRICE_WORDS_LATIN.test(text) || PRICE_WORDS_SUBSTRING.test(text),
}
const PLAY_TITLE_AD_CLAIM = /no ads|ad[- ]?free/i

// "TODO Karim: …" marks an English field that is live but not publicly
// readable (iOS keywords, promotional text). Only the English folders may
// carry it; a translated folder must hold real text.
const isTodo = (text: string) => text.startsWith('TODO')
const TODO_ALLOWED_LOCALES = new Set(['en-US', 'en-GB'])

const listDirs = (dir: string) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
    : []

const read = (file: string) => fs.readFileSync(file, 'utf8')
// Stores count characters, not UTF-16 units (matters for CJK/emoji).
const charCount = (text: string) => [...text].length

// Every text file: exactly one trailing newline, no trailing spaces, no CRLF.
const expectCleanFile = (file: string) => {
  const raw = read(file)
  const label = path.relative(STORE_DIR, file)
  expect({ label, crlf: raw.includes('\r') }).toEqual({ label, crlf: false })
  expect({ label, endsWithOneNewline: /[^\n]\n$/.test(raw) }).toEqual({
    label,
    endsWithOneNewline: true,
  })
  expect({ label, trailingSpaces: /[ \t]+$/m.test(raw) }).toEqual({
    label,
    trailingSpaces: false,
  })
  return raw.slice(0, -1)
}

const iosLocales = listDirs(path.join(STORE_DIR, 'ios'))
const androidLocales = listDirs(path.join(STORE_DIR, 'android'))

describe('store listings', () => {
  it('has the English source listing for both stores', () => {
    expect(iosLocales).toContain('en-US')
    expect(androidLocales).toContain('en-US')
    expect(fs.existsSync(path.join(STORE_DIR, 'release-notes', 'en-US.txt'))).toBe(true)
  })

  it('uses only known locale folders, and a language is present in both stores or in neither', () => {
    const known = Object.values(LISTING_LOCALES)
    expect(iosLocales.filter((l) => !known.some((k) => k.ios === l))).toEqual([])
    expect(androidLocales.filter((l) => !known.some((k) => k.android === l))).toEqual([])
    for (const { ios, android } of known) {
      expect({ ios, present: iosLocales.includes(ios) }).toEqual({
        ios,
        present: androidLocales.includes(android),
      })
    }
  })

  it.each(iosLocales)('ios/%s: required files within App Store limits', (locale) => {
    const dir = path.join(STORE_DIR, 'ios', locale)
    expect(fs.readdirSync(dir).sort()).toEqual(
      Object.keys(IOS_LIMITS)
        .map((field) => `${field}.txt`)
        .sort()
    )
    const fields: Record<string, string> = {}
    for (const [field, limit] of Object.entries(IOS_LIMITS)) {
      const text = expectCleanFile(path.join(dir, `${field}.txt`))
      fields[field] = text
      expect({ field, empty: text.trim() === '' }).toEqual({ field, empty: false })
      if (isTodo(text)) {
        expect({ field, todoAllowed: TODO_ALLOWED_LOCALES.has(locale) }).toEqual({
          field,
          todoAllowed: true,
        })
        continue
      }
      expect({
        field,
        length: charCount(text) <= limit ? 'ok' : charCount(text),
      }).toEqual({
        field,
        length: 'ok',
      })
    }

    for (const field of ['name', 'subtitle']) {
      expect({ field, priceWord: PRICE_WORDS.test(fields[field]) }).toEqual({
        field,
        priceWord: false,
      })
    }

    if (!isTodo(fields.keywords)) {
      // Apple: comma-separated, a space after a comma only wastes a character,
      // and words already in name/subtitle are indexed anyway.
      expect(fields.keywords).not.toMatch(/,\s|\s,|,,|^,|,$|\n/)
      const taken = new Set(
        `${fields.name} ${fields.subtitle}`
          .toLowerCase()
          .split(/[^\p{L}\p{N}]+/u)
          .filter(Boolean)
      )
      const repeated = fields.keywords
        .toLowerCase()
        .split(/[,\s]+/)
        .filter((word) => taken.has(word))
      expect(repeated).toEqual([])
    }
  })

  it.each(androidLocales)(
    'android/%s: required files within Google Play limits',
    (locale) => {
      const dir = path.join(STORE_DIR, 'android', locale)
      expect(fs.readdirSync(dir).sort()).toEqual(
        Object.keys(ANDROID_LIMITS)
          .map((field) => `${field}.txt`)
          .sort()
      )
      for (const [field, limit] of Object.entries(ANDROID_LIMITS)) {
        const text = expectCleanFile(path.join(dir, `${field}.txt`))
        expect({ field, empty: text.trim() === '' || isTodo(text) }).toEqual({
          field,
          empty: false,
        })
        expect({
          field,
          length: charCount(text) <= limit ? 'ok' : charCount(text),
        }).toEqual({
          field,
          length: 'ok',
        })
        if (field === 'title') {
          expect({ field, priceWord: PRICE_WORDS.test(text) }).toEqual({
            field,
            priceWord: false,
          })
          expect({ field, adClaim: PLAY_TITLE_AD_CLAIM.test(text) }).toEqual({
            field,
            adClaim: false,
          })
        }
      }
    }
  )

  it('release notes: one file per translated language, within the Play limit', () => {
    const dir = path.join(STORE_DIR, 'release-notes')
    const files = fs.readdirSync(dir).sort()
    // en-US.txt is the source; every other language uses its app locale
    // (de.txt, pt-BR.txt, zh-Hans.txt). en-GB has none: it falls back to en-US.
    const expected = Object.entries(LISTING_LOCALES)
      .filter(([app, { ios }]) => app !== 'en-GB' && iosLocales.includes(ios))
      .map(([app]) => (app === 'en' ? 'en-US.txt' : `${app}.txt`))
      .sort()
    expect(files).toEqual(expected)
    for (const file of files) {
      const text = expectCleanFile(path.join(dir, file))
      expect({
        file,
        length: charCount(text) <= RELEASE_NOTES_LIMIT ? 'ok' : charCount(text),
      }).toEqual({ file, length: 'ok' })
    }
  })

  // German is Swiss High German for every German speaker (ss, never ß) — see
  // docs/product/i18n/glossary.md "German". This keeps a well-meant "fix" out.
  it('German listing text contains no ß', () => {
    const files = [
      ...listDirs(path.join(STORE_DIR, 'ios'))
        .filter((l) => l === LISTING_LOCALES.de.ios)
        .flatMap((l) =>
          Object.keys(IOS_LIMITS).map((f) => path.join(STORE_DIR, 'ios', l, `${f}.txt`))
        ),
      ...listDirs(path.join(STORE_DIR, 'android'))
        .filter((l) => l === LISTING_LOCALES.de.android)
        .flatMap((l) =>
          Object.keys(ANDROID_LIMITS).map((f) =>
            path.join(STORE_DIR, 'android', l, `${f}.txt`)
          )
        ),
      path.join(STORE_DIR, 'release-notes', 'de.txt'),
    ].filter((file) => fs.existsSync(file))
    expect(files.filter((file) => /ß/.test(read(file)))).toEqual([])
  })
})
