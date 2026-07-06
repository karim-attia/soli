// Accessibility labels and testIDs for board elements (klondike-card-accessibility story).
//
// Automation split: on Android, `accessibilityLabel` maps to `content-desc` and is the
// reliable automation handle (testID → resource-id is inconsistently surfaced by RN);
// on iOS, `testID` maps to `accessibilityIdentifier` and is the primary handle.
// We ship both on every target so agent-device works on both platforms.
//
// Kept pure (no React imports) so test/unit/ can test it without rendering.

import type { Card, Suit } from '../../../../solitaire/klondike'

// Spelled-out ranks instead of reusing `rankToLabel` ("A"/"7"): screen readers
// pronounce "Ace of hearts" correctly but stumble over "A of hearts".
const RANK_WORDS = [
  'Ace',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Jack',
  'Queen',
  'King',
] as const

type CardIdentity = Pick<Card, 'suit' | 'rank'>

const capitalize = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1)

export const getCardAccessibilityLabel = (card: CardIdentity): string =>
  `${RANK_WORDS[card.rank - 1]} of ${card.suit}`

// Column numbers are 1-based in labels and testIDs (human-consistent), hence columnIndex + 1.
export const getTableauCardLabel = (card: CardIdentity, columnIndex: number): string =>
  `${getCardAccessibilityLabel(card)}, column ${columnIndex + 1}`

export const getFaceDownCardLabel = (columnIndex: number): string =>
  `Face-down card, column ${columnIndex + 1}`

export const getStockLabel = (stockCount: number): string =>
  `Stock, ${stockCount} ${stockCount === 1 ? 'card' : 'cards'}`

export const STOCK_RECYCLE_LABEL = 'Recycle waste into stock'
export const STOCK_EMPTY_LABEL = 'Stock, empty'

export const getWasteLabel = (topCard: CardIdentity): string =>
  `Waste, ${getCardAccessibilityLabel(topCard)}`

export const getFoundationLabel = (suit: Suit, topCard: CardIdentity | null): string =>
  `${capitalize(suit)} foundation, ${topCard ? getCardAccessibilityLabel(topCard) : 'empty'}`

export const getEmptyColumnLabel = (columnIndex: number): string =>
  `Column ${columnIndex + 1}, empty`

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
