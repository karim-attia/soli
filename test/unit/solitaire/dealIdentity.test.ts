import {
  createCanonicalDealCards,
  createRandomExactDealId,
  decodeExactDealId,
  encodeExactDealId,
  formatExactDealDisplayName,
  hasDrawCountInMask,
  isExactDealId,
} from '../../../src/solitaire/dealIdentity'

describe('dealIdentity', () => {
  const card = (
    suit: 'clubs' | 'diamonds' | 'hearts' | 'spades',
    rank: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13
  ) => ({ suit, rank })

  it('round-trips the canonical deck as E1_0', () => {
    const canonical = createCanonicalDealCards()
    const exactId = encodeExactDealId(canonical)

    expect(exactId).toBe('E1_0')
    expect(decodeExactDealId(exactId)).toEqual(canonical)
  })

  it('round-trips a non-canonical deck', () => {
    const canonical = createCanonicalDealCards()
    const deck = [canonical[51], canonical[0], ...canonical.slice(1, 51).reverse()]

    const exactId = encodeExactDealId(deck)

    expect(isExactDealId(exactId)).toBe(true)
    expect(decodeExactDealId(exactId)).toEqual(deck)
  })

  it('decodes the Lonelybot seed 0 harvest fixture in app deal order', () => {
    const deck = decodeExactDealId('E1_8nk351v2ahh1oyr6mdo9nv3g6xi7op92kup67pb4jzg1')

    expect(deck).toHaveLength(52)
    expect(deck.slice(0, 28)).toEqual([
      card('spades', 8),
      card('hearts', 1),
      card('diamonds', 2),
      card('spades', 5),
      card('diamonds', 5),
      card('spades', 4),
      card('clubs', 4),
      card('hearts', 11),
      card('hearts', 7),
      card('diamonds', 7),
      card('diamonds', 8),
      card('clubs', 8),
      card('spades', 9),
      card('diamonds', 1),
      card('diamonds', 6),
      card('spades', 7),
      card('hearts', 4),
      card('clubs', 2),
      card('diamonds', 10),
      card('spades', 3),
      card('clubs', 9),
      card('diamonds', 12),
      card('spades', 1),
      card('hearts', 12),
      card('clubs', 10),
      card('hearts', 13),
      card('hearts', 8),
      card('clubs', 12),
    ])
    expect(deck.slice(28, 33)).toEqual([
      card('hearts', 9),
      card('spades', 10),
      card('hearts', 10),
      card('clubs', 6),
      card('spades', 13),
    ])
    expect(deck[51]).toEqual(card('diamonds', 3))
  })

  it('creates mocked random exact IDs that decode to full decks', () => {
    const exactId = createRandomExactDealId()
    const deck = decodeExactDealId(exactId)

    expect(isExactDealId(exactId)).toBe(true)
    expect(deck).toHaveLength(52)
  })

  it('formats display names without exposing the parser prefix', () => {
    expect(formatExactDealDisplayName('E1_123456789')).toBe('Deal 2345-6789')
    expect(formatExactDealDisplayName('not-exact')).toBe('')
  })

  it('checks draw masks by selected draw count', () => {
    expect(hasDrawCountInMask(1, 1)).toBe(true)
    expect(hasDrawCountInMask(1, 2)).toBe(false)
    expect(hasDrawCountInMask(31, 5)).toBe(true)
  })
})
