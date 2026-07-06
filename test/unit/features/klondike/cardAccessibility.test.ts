import {
  getCardAccessibilityLabel,
  getCardTestID,
  getEmptyColumnLabel,
  getFaceDownCardLabel,
  getFoundationLabel,
  getFoundationSlotTestID,
  getFoundationTestID,
  getStockLabel,
  getTableauCardLabel,
  getTableauColumnTestID,
  getWasteLabel,
  STOCK_EMPTY_LABEL,
  STOCK_RECYCLE_LABEL,
} from '../../../../src/features/klondike/components/cards/accessibility'

describe('getCardAccessibilityLabel', () => {
  it('spells out ranks so screen readers pronounce them well', () => {
    expect(getCardAccessibilityLabel({ suit: 'hearts', rank: 1 })).toBe('Ace of hearts')
    expect(getCardAccessibilityLabel({ suit: 'clubs', rank: 2 })).toBe('Two of clubs')
    expect(getCardAccessibilityLabel({ suit: 'spades', rank: 7 })).toBe(
      'Seven of spades'
    )
    expect(getCardAccessibilityLabel({ suit: 'diamonds', rank: 10 })).toBe(
      'Ten of diamonds'
    )
    expect(getCardAccessibilityLabel({ suit: 'hearts', rank: 11 })).toBe(
      'Jack of hearts'
    )
    expect(getCardAccessibilityLabel({ suit: 'clubs', rank: 12 })).toBe('Queen of clubs')
    expect(getCardAccessibilityLabel({ suit: 'spades', rank: 13 })).toBe(
      'King of spades'
    )
  })
})

describe('tableau labels', () => {
  it('uses 1-based column numbers', () => {
    expect(getTableauCardLabel({ suit: 'hearts', rank: 7 }, 2)).toBe(
      'Seven of hearts, column 3'
    )
    expect(getTableauCardLabel({ suit: 'spades', rank: 1 }, 0)).toBe(
      'Ace of spades, column 1'
    )
  })

  it('labels face-down cards without revealing identity', () => {
    expect(getFaceDownCardLabel(2)).toBe('Face-down card, column 3')
  })

  it('labels empty columns', () => {
    expect(getEmptyColumnLabel(6)).toBe('Column 7, empty')
  })
})

describe('stock and waste labels', () => {
  it('includes the stock count with pluralization', () => {
    expect(getStockLabel(24)).toBe('Stock, 24 cards')
    expect(getStockLabel(1)).toBe('Stock, 1 card')
    expect(getStockLabel(0)).toBe('Stock, 0 cards')
  })

  it('has recycle and empty stock labels', () => {
    expect(STOCK_RECYCLE_LABEL).toBe('Recycle waste into stock')
    expect(STOCK_EMPTY_LABEL).toBe('Stock, empty')
  })

  it('names the waste top card', () => {
    expect(getWasteLabel({ suit: 'hearts', rank: 7 })).toBe('Waste, Seven of hearts')
  })
})

describe('foundation labels', () => {
  it('capitalizes the suit and names the top card', () => {
    expect(getFoundationLabel('hearts', { suit: 'hearts', rank: 7 })).toBe(
      'Hearts foundation, Seven of hearts'
    )
  })

  it('labels empty foundations', () => {
    expect(getFoundationLabel('spades', null)).toBe('Spades foundation, empty')
  })
})

describe('testIDs', () => {
  it('builds stable suit-rank card testIDs (no per-deal instance suffix)', () => {
    expect(getCardTestID({ suit: 'hearts', rank: 7 })).toBe('card-hearts-7')
    expect(getCardTestID({ suit: 'spades', rank: 13 })).toBe('card-spades-13')
  })

  it('builds foundation testIDs', () => {
    expect(getFoundationTestID('hearts')).toBe('foundation-hearts')
    expect(getFoundationSlotTestID('clubs')).toBe('foundation-slot-clubs')
  })

  it('uses 1-based column numbers in tableau column testIDs', () => {
    expect(getTableauColumnTestID(2)).toBe('tableau-column-3')
  })
})
