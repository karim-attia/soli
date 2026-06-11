export const DRAW_COUNT_OPTIONS = [1, 2, 3, 4, 5] as const

export type DrawCount = (typeof DRAW_COUNT_OPTIONS)[number]

export const DEFAULT_DRAW_COUNT: DrawCount = 1

export const isDrawCount = (value: unknown): value is DrawCount =>
  typeof value === 'number' &&
  Number.isInteger(value) &&
  DRAW_COUNT_OPTIONS.includes(value as DrawCount)

// Persisted settings, games, and history all use the same fallback so legacy
// payloads cannot disagree about which rules an older game used.
export const normalizeDrawCount = (value: unknown): DrawCount =>
  isDrawCount(value) ? value : DEFAULT_DRAW_COUNT
