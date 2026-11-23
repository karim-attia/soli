import {
  formatElapsedDurationSpoken,
  formatHistoryTimestamp,
  formatVegasScoreSpoken,
} from '../../../src/i18n/format'
import i18next from 'i18next'

import { getIntlLocale } from '../../../src/i18n'
import { formatStandardScore, formatVegasScore } from '../../../src/solitaire/scoring'
import { toLatinDigits } from '../../../src/utils/latinDigits'

// Word-carrying formatters (moved out of src/utils/time.ts and src/solitaire/scoring.ts so
// the engine stays text-free). Jest runs in English (test/setup/mock-expo-localization.ts).

// Spoken HUD time for the badge a11y label (scoring plan round 2): "3:12" is read
// as a clock time by screen readers, so the label spells the units out.
describe('formatElapsedDurationSpoken', () => {
  it('spells out hours, minutes and seconds, dropping zero parts', () => {
    expect(formatElapsedDurationSpoken(0)).toBe('0 seconds')
    expect(formatElapsedDurationSpoken(1_000)).toBe('1 second')
    expect(formatElapsedDurationSpoken(45_000)).toBe('45 seconds')
    expect(formatElapsedDurationSpoken(60_000)).toBe('1 minute')
    expect(formatElapsedDurationSpoken(192_000)).toBe('3 minutes 12 seconds')
    expect(formatElapsedDurationSpoken(3_725_000)).toBe('1 hour 2 minutes 5 seconds')
    expect(formatElapsedDurationSpoken(7_200_000)).toBe('2 hours')
  })

  // The parts are joined through the `time.join` pattern, so a language can link them with
  // a word (Arabic «و», review V6) without locale-specific code.
  it("joins the parts with the language's own pattern (Arabic «و»)", async () => {
    await i18next.changeLanguage('ar')
    try {
      expect(formatElapsedDurationSpoken(3_725_000)).toBe('ساعة واحدة ودقيقتان و5 ثوانٍ')
      expect(formatElapsedDurationSpoken(60_000)).toBe('دقيقة واحدة')
    } finally {
      await i18next.changeLanguage('en')
    }
  })
})

// Spoken form for the HUD badge a11y label (round 2): the U+2212 and `$` are
// not read reliably by screen readers.
describe('formatVegasScoreSpoken', () => {
  it('speaks the Vegas amount as plain words', () => {
    expect(formatVegasScoreSpoken(-47)).toBe('minus 47 dollars')
    expect(formatVegasScoreSpoken(0)).toBe('0 dollars')
    expect(formatVegasScoreSpoken(208)).toBe('208 dollars')
    expect(formatVegasScoreSpoken(1)).toBe('1 dollar')
  })
})

describe('getIntlLocale', () => {
  it('is the app language + device region with Latin digits and the device hour cycle', () => {
    expect(getIntlLocale()).toBe('en-US-u-hc-h12-nu-latn')
    // Must be a tag Intl accepts (a malformed tag throws a RangeError).
    expect(() => new Intl.DateTimeFormat(getIntlLocale())).not.toThrow()
  })
})

describe('formatHistoryTimestamp', () => {
  it('uses friendly words for missing, today and yesterday timestamps', () => {
    expect(formatHistoryTimestamp(undefined)).toBe('just now')
    const now = new Date()
    expect(formatHistoryTimestamp(now.toISOString())).toMatch(/^Today, \d/)
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    expect(formatHistoryTimestamp(yesterday.toISOString())).toMatch(/^Yesterday, \d/)
  })

  it('returns unparseable input unchanged', () => {
    expect(formatHistoryTimestamp('not-a-date')).toBe('not-a-date')
  })
})

// Issue 15: Hermes ignores `-u-nu-latn` (device check 2026-11-23), so an `ar-EG` / `ar-SA`
// tag prints Arabic-Indic digits. Soli shows Latin digits everywhere (glossary).
describe('Latin digits in every locale', () => {
  it('maps Arabic-Indic and Persian digits and separators to Latin', () => {
    expect(toLatinDigits('١٬٢٣٤٫٥')).toBe('1,234.5')
    expect(toLatinDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789')
    expect(toLatinDigits('۰۱۲۳۴۵۶۷۸۹')).toBe('0123456789')
    expect(toLatinDigits('٢٣ نوفمبر، ١٩:٥٧')).toBe('23 نوفمبر، 19:57')
  })

  it('leaves Latin output untouched', () => {
    expect(toLatinDigits('1’234')).toBe('1’234')
    expect(toLatinDigits('23. Nov., 19:57')).toBe('23. Nov., 19:57')
  })

  it('formats scores with Latin digits for an Arabic-digit region', () => {
    // Guard: this runtime really prints Arabic-Indic digits for ar-EG (like Hermes does
    // even WITH nu-latn); otherwise the two assertions below would prove nothing.
    expect((1234).toLocaleString('ar-EG')).toMatch(/[\u0660-\u0669]/)
    expect(formatStandardScore(1234, 'ar-EG')).toBe('1,234')
    expect(formatVegasScore(-1234, 'ar-EG')).toBe('−$1,234')
  })
})
