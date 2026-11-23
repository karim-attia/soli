// UI formatters that need WORDS (translated) — kept out of src/solitaire and src/utils so
// the engine/util layer stays free of user-facing text and never imports src/i18n.
import { devLog } from '../utils/devLogger'
import { toLatinDigits } from '../utils/latinDigits'
import { getIntlLocale, t } from './index'

// Screen-reader form of the HUD time ("3 minutes 12 seconds"); the "3:12" badge
// text is read as a clock time or a ratio by VoiceOver/TalkBack. Zero parts are
// dropped except for a plain "0 seconds".
export const formatElapsedDurationSpoken = (elapsedMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = [
    hours > 0 ? t('time.hours', { count: hours }) : null,
    minutes > 0 ? t('time.minutes', { count: minutes }) : null,
    seconds > 0 || totalSeconds === 0 ? t('time.seconds', { count: seconds }) : null,
  ].filter((part): part is string => part !== null)
  // Joined pairwise through a translation PATTERN (`time.join`), not a hardcoded space:
  // Arabic links the parts with «و» ("ساعة واحدة ودقيقتان", review V6). No locale-specific
  // code, and no `Intl.ListFormat` (Hermes does not ship it).
  return parts.reduce((first, second) => t('time.join', { first, second }))
}

// Screen-reader form of the Vegas amount ("minus 47 dollars"): the badge's U+2212 and
// literal `$` are not read reliably. Two keys (not a "minus" prefix key) so translators
// can phrase the negative amount as a whole.
export const formatVegasScoreSpoken = (value: number): string => {
  const count = Math.abs(Math.trunc(value))
  return value < 0
    ? t('hud.vegasSpokenNegative', { count })
    : t('hud.vegasSpoken', { count })
}

const isSameCalendarDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

// History-entries-cleanup B3: friendly dates shared by the list rows and the sheet
// header — "Today, 5:33 PM" / "Yesterday, 5:33 PM" / "Jul 6, 5:33 PM" (same year) /
// "Jul 6, 2025" (older, no time).
// Dates use getIntlLocale() (app language + device region), NOT `undefined`: the device
// default would print month names in a language the rest of the UI is not in.
// Every Intl output goes through `toLatinDigits` (issue 15: Hermes ignores `nu-latn`, an
// `ar-EG` / `ar-SA` device would otherwise show "٢٣ نوفمبر، ١٩:٥٧" next to Latin scores).
const formatDate = (
  locale: string,
  options: Intl.DateTimeFormatOptions,
  timestamp: Date
): string => toLatinDigits(new Intl.DateTimeFormat(locale, options).format(timestamp))

export const formatHistoryTimestamp = (isoTimestamp: string | undefined): string => {
  if (!isoTimestamp) {
    return t('history.justNow')
  }

  try {
    const timestamp = new Date(isoTimestamp)
    if (Number.isNaN(timestamp.getTime())) {
      return isoTimestamp
    }

    const locale = getIntlLocale()
    const now = new Date()
    const time = formatDate(locale, { timeStyle: 'short' }, timestamp)
    if (isSameCalendarDay(timestamp, now)) {
      return t('history.today', { time })
    }
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    if (isSameCalendarDay(timestamp, yesterday)) {
      return t('history.yesterday', { time })
    }
    if (timestamp.getFullYear() === now.getFullYear()) {
      const date = formatDate(locale, { month: 'short', day: 'numeric' }, timestamp)
      return t('history.dateTime', { date, time })
    }
    return formatDate(
      locale,
      { month: 'short', day: 'numeric', year: 'numeric' },
      timestamp
    )
  } catch (error) {
    devLog('warn', '[history] Failed to format timestamp', error)
    return isoTimestamp
  }
}
