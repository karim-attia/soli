import {
  BASE_CARD_HEIGHT,
  BASE_CARD_WIDTH,
  BASE_STACK_OFFSET,
  CARD_ASPECT_RATIO,
  CARD_REFERENCE_STACK_OFFSET,
  CARD_REFERENCE_WIDTH,
  MAX_CARD_WIDTH,
  MIN_CARD_WIDTH,
  TABLEAU_GAP,
} from '../constants'
import type { CardMetrics } from '../types'
import { TABLEAU_COLUMN_COUNT } from '../../../solitaire/klondike'

export const computeCardMetrics = (availableWidth: number | null): CardMetrics => {
  if (!availableWidth || availableWidth <= 0) {
    return {
      width: BASE_CARD_WIDTH,
      height: BASE_CARD_HEIGHT,
      stackOffset: BASE_STACK_OFFSET,
      radius: 12,
    }
  }

  const totalGap = TABLEAU_GAP * (TABLEAU_COLUMN_COUNT - 1)
  const widthAvailable = Math.max(
    availableWidth - totalGap,
    MIN_CARD_WIDTH * TABLEAU_COLUMN_COUNT,
  )
  const rawWidth = widthAvailable / TABLEAU_COLUMN_COUNT
  const unclampedWidth = Math.max(Math.floor(rawWidth), MIN_CARD_WIDTH)
  const constrainedWidth = Math.min(Math.max(unclampedWidth, MIN_CARD_WIDTH), MAX_CARD_WIDTH)
  const height = Math.round(constrainedWidth * CARD_ASPECT_RATIO)
  const stackOffsetRatio = CARD_REFERENCE_STACK_OFFSET / CARD_REFERENCE_WIDTH
  const stackOffset = Math.max(
    CARD_REFERENCE_STACK_OFFSET,
    Math.round(constrainedWidth * stackOffsetRatio),
  )
  const radius = Math.max(6, Math.round(constrainedWidth * 0.12))

  return {
    width: constrainedWidth,
    height,
    stackOffset,
    radius,
  }
}


