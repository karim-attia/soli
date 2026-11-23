// Accessibility labels and testIDs for board elements (klondike-card-accessibility story).
//
// Automation split: on Android, `accessibilityLabel` maps to `content-desc` and is the
// reliable automation handle (testID → resource-id is inconsistently surfaced by RN);
// on iOS, `testID` maps to `accessibilityIdentifier` and is the primary handle.
// We ship both on every target so agent-device works on both platforms.
//
// Kept pure (no React imports) so test/unit/ can test it without rendering. The plain
// `t` import from src/i18n keeps that true (no hooks; see src/i18n/index.ts for why).
// All texts are resolved at CALL time — never hoist a label into a module constant, it
// would keep the language of the first import (Android can change language while running).
// testIDs below are language-independent on purpose (iOS automation handles); the labels
// are translated, so Android label-based automation must pin the app to English.

import { t } from '../../../../i18n'
import type { Card, Suit } from '../../../../solitaire/klondike'

type CardIdentity = Pick<Card, 'suit' | 'rank'>

// Spelled-out ranks (a11y.rank.1..13) instead of reusing `rankToLabel` ("A"/"7"): screen
// readers pronounce "Ace of hearts" correctly but stumble over "A of hearts". The name is
// composed from 13 rank + 4 suit keys and the `a11y.card` pattern (translators reorder
// it, e.g. suit first) instead of 52 keys.
export const getCardAccessibilityLabel = (card: CardIdentity): string =>
  t('a11y.card', {
    rank: t(`a11y.rank.${card.rank}`),
    suit: t(`a11y.suit.${card.suit}`),
  })

// Column numbers are 1-based in labels and testIDs (human-consistent), hence columnIndex + 1.
export const getTableauCardLabel = (card: CardIdentity, columnIndex: number): string =>
  t('a11y.tableauCard', {
    card: getCardAccessibilityLabel(card),
    column: columnIndex + 1,
  })

export const getFaceDownCardLabel = (columnIndex: number): string =>
  t('a11y.faceDownCard', { column: columnIndex + 1 })

export const getStockLabel = (stockCount: number): string =>
  t('a11y.stock', { count: stockCount })

export const getStockEmptyLabel = (): string => t('a11y.stockEmpty')
// Vegas pass limits (scoring plan, Phase 2): the recycle slot says how many
// recycles remain on a limited game; once none is left the slot is disabled and
// reads as exhausted (same testID as the recycle slot so device recipes resolve it).
export const getStockExhaustedLabel = (): string => t('a11y.stockExhausted')

// Infinity = unlimited game → the plain recycle label. The limited label is its own
// plural key (not "recycle label + ', ' + caption") so translators get a whole phrase.
export const getStockRecycleLabel = (recyclesLeft: number): string =>
  Number.isFinite(recyclesLeft)
    ? t('a11y.stockRecycleLeft', { count: recyclesLeft })
    : t('a11y.stockRecycle')

// The caption printed on the recycle card back ("2 left").
export const formatRecyclesLeft = (recyclesLeft: number): string =>
  t('game.recyclesLeft', { count: recyclesLeft })

export const getWasteLabel = (topCard: CardIdentity): string =>
  t('a11y.waste', { card: getCardAccessibilityLabel(topCard) })

// One key per suit pile ("Hearts foundation") instead of capitalizing the suit word in
// code: capitalization/compounding is language-specific.
export const getFoundationLabel = (suit: Suit, topCard: CardIdentity | null): string => {
  const pile = t(`a11y.foundationPile.${suit}`)
  return topCard
    ? t('a11y.foundation', { pile, card: getCardAccessibilityLabel(topCard) })
    : t('a11y.foundationEmpty', { pile })
}

export const getEmptyColumnLabel = (columnIndex: number): string =>
  t('a11y.emptyColumn', { column: columnIndex + 1 })

// testIDs: suit-rank instead of card.id — ids carry a per-deal instance suffix
// (`hearts-7-1a`), while `card-hearts-7` stays stable across deals for automation.
export const getCardTestID = (card: CardIdentity): string =>
  `card-${card.suit}-${card.rank}`

export const STOCK_TEST_ID = 'stock'
export const STOCK_RECYCLE_TEST_ID = 'stock-recycle'
export const WASTE_TEST_ID = 'waste'

export const getFoundationTestID = (suit: Suit): string => `foundation-${suit}`
export const getFoundationSlotTestID = (suit: Suit): string => `foundation-slot-${suit}`

export const getTableauColumnTestID = (columnIndex: number): string =>
  `tableau-column-${columnIndex + 1}`
