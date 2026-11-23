// Issue 15 (i18n plan): Soli shows Western (Latin) digits in every language — cards, the
// move counter and the timer are Latin, so a score or date in Arabic-Indic digits next to
// them looks like a bug (glossary: "Latin digits").
// Why a text replace instead of asking Intl for Latin digits: Hermes IGNORES both the
// `-u-nu-latn` tag extension and the `numberingSystem` option (verified on device
// 2026-11-23, iOS: `ar-EG` / `ar-SA` tags print "١٬٢٣٤", "٢٣ نوفمبر", "١٩:٥٧"; plain `ar`,
// `ar-AE`, `he` print Latin). Dropping the region from the tag would also work on iOS but
// loses the region's date/number conventions and is unverified on Android.
// Maps Arabic-Indic (U+0660–0669) and Persian (U+06F0–06F9) digits to 0–9 and the Arabic
// thousands / decimal separators (U+066C / U+066B) to "," / ".". Everything else (month
// names, Latin output of other locales) passes through untouched.
const NON_LATIN_NUMERALS = /[٠-٩۰-۹٫٬]/g

export const toLatinDigits = (text: string): string =>
  text.replace(NON_LATIN_NUMERALS, (char) => {
    if (char === '٬') {
      return ','
    }
    if (char === '٫') {
      return '.'
    }
    // Both digit blocks start at a code point ending in 0, so the low nibble is the digit.
    return String(char.charCodeAt(0) & 0xf)
  })
