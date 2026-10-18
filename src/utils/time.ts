import type { TimerState } from '../solitaire/klondike'

const MILLISECONDS_PER_SECOND = 1_000
const SECONDS_PER_MINUTE = 60
const SECONDS_PER_HOUR = 3_600

export const TIMER_TICK_INTERVAL_MS = MILLISECONDS_PER_SECOND

export const computeElapsedWithReference = (
  elapsedMs: number,
  timerState: TimerState,
  timerStartedAt: number | null,
  referenceTimestamp: number
): number => {
  if (timerState !== 'running' || typeof timerStartedAt !== 'number') {
    return elapsedMs
  }

  if (!Number.isFinite(referenceTimestamp)) {
    return elapsedMs
  }

  const delta = referenceTimestamp - timerStartedAt
  if (!Number.isFinite(delta) || delta <= 0) {
    return elapsedMs
  }

  return elapsedMs + delta
}

export const formatElapsedDuration = (elapsedMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / MILLISECONDS_PER_SECOND))
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR)
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Screen-reader form of the HUD time ("3 minutes 12 seconds"); the "3:12" badge
// text is read as a clock time or a ratio by VoiceOver/TalkBack. Zero parts are
// dropped except for a plain "0 seconds".
export const formatElapsedDurationSpoken = (elapsedMs: number): string => {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / MILLISECONDS_PER_SECOND))
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR)
  const minutes = Math.floor((totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE)
  const seconds = totalSeconds % SECONDS_PER_MINUTE
  const unit = (value: number, name: string) => `${value} ${name}${value === 1 ? '' : 's'}`
  const parts = [
    hours > 0 ? unit(hours, 'hour') : null,
    minutes > 0 ? unit(minutes, 'minute') : null,
    seconds > 0 || totalSeconds === 0 ? unit(seconds, 'second') : null,
  ].filter((part): part is string => part !== null)
  return parts.join(' ')
}
