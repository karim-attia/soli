import * as Crypto from 'expo-crypto'

import type { DrawCount } from './drawCount'

// E1 means "exact deal identity, version 1": the payload encodes the complete
// 52-card permutation, not just a seed or abbreviated history label.
export const EXACT_ID_PREFIX = 'E1_'

export const DEAL_SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const
export const DEAL_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13] as const

export type DealSuit = (typeof DEAL_SUITS)[number]
export type DealRank = (typeof DEAL_RANKS)[number]

export type DealCard = {
  suit: DealSuit
  rank: DealRank
}

export type ExactDealId = `${typeof EXACT_ID_PREFIX}${string}`

const CARD_COUNT = 52
const EXACT_ID_BITS = 226
const EXACT_ID_BYTE_COUNT = Math.ceil(EXACT_ID_BITS / 8)
const EXACT_ID_EXCESS_BITS = EXACT_ID_BYTE_COUNT * 8 - EXACT_ID_BITS
const EXACT_ID_TOP_BYTE_MASK = (1 << (8 - EXACT_ID_EXCESS_BITS)) - 1
const BASE36_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
const FNV_OFFSET_BASIS_64 = 0xcbf29ce484222325n
const FNV_PRIME_64 = 0x100000001b3n
const SUIT_HASH_VALUES: Record<DealSuit, number> = {
  clubs: 1,
  diamonds: 2,
  hearts: 3,
  spades: 4,
}

export const DRAW_COUNT_MASKS: Record<DrawCount, number> = {
  1: 1 << 0,
  2: 1 << 1,
  3: 1 << 2,
  4: 1 << 3,
  5: 1 << 4,
}

const FACTORIALS: readonly bigint[] = (() => {
  const values: bigint[] = [1n]
  for (let value = 1; value <= CARD_COUNT; value += 1) {
    values[value] = values[value - 1] * BigInt(value)
  }
  return values
})()

const MAX_PERMUTATION_VALUE = FACTORIALS[CARD_COUNT]

export const createCanonicalDealCards = (): DealCard[] => {
  const cards: DealCard[] = []
  DEAL_SUITS.forEach((suit) => {
    DEAL_RANKS.forEach((rank) => {
      cards.push({ suit, rank })
    })
  })
  return cards
}

const canonicalCardKey = (card: DealCard): string => `${card.suit}-${card.rank}`

const ensureUniqueDeck = (cards: readonly DealCard[]): void => {
  if (cards.length !== CARD_COUNT) {
    throw new Error(`Exact deal IDs require ${CARD_COUNT} cards, got ${cards.length}.`)
  }

  const seen = new Set<string>()
  cards.forEach((card) => {
    if (!DEAL_SUITS.includes(card.suit) || !DEAL_RANKS.includes(card.rank)) {
      throw new Error(`Invalid card in exact deal: ${canonicalCardKey(card)}.`)
    }
    const key = canonicalCardKey(card)
    if (seen.has(key)) {
      throw new Error(`Duplicate card in exact deal: ${key}.`)
    }
    seen.add(key)
  })
}

export const encodeExactDealId = (cards: readonly DealCard[]): ExactDealId => {
  ensureUniqueDeck(cards)

  const remaining = createCanonicalDealCards()
  let rank = 0n

  // Lehmer/factoradic-style permutation rank. This replaces the old idea of a
  // Fisher-Yates shuffle seed: the ID is the deck order itself, so decoding is exact.
  cards.forEach((card) => {
    const key = canonicalCardKey(card)
    const index = remaining.findIndex((candidate) => canonicalCardKey(candidate) === key)
    if (index < 0) {
      throw new Error(`Card not found while encoding exact deal: ${key}.`)
    }
    rank = rank * BigInt(remaining.length) + BigInt(index)
    remaining.splice(index, 1)
  })

  return `${EXACT_ID_PREFIX}${rank.toString(36)}` as ExactDealId
}

export const decodeExactDealId = (exactId: string): DealCard[] => {
  const value = parseExactDealId(exactId)
  const remaining = createCanonicalDealCards()
  const cards: DealCard[] = []
  let rest = value

  for (let index = CARD_COUNT - 1; index >= 0; index -= 1) {
    const factorial = FACTORIALS[index]
    const selectedIndex = Number(rest / factorial)
    rest %= factorial
    const [card] = remaining.splice(selectedIndex, 1)
    if (!card) {
      throw new Error(`Exact deal ID is out of range: ${exactId}.`)
    }
    cards.push(card)
  }

  return cards
}

export const parseExactDealId = (exactId: string): bigint => {
  if (!isExactDealId(exactId)) {
    throw new Error(`Invalid exact deal ID prefix: ${exactId}.`)
  }

  const payload = exactId.slice(EXACT_ID_PREFIX.length).toLowerCase()
  if (!payload.length) {
    throw new Error('Exact deal ID payload is empty.')
  }

  let value = 0n
  for (const char of payload) {
    const digit = BASE36_ALPHABET.indexOf(char)
    if (digit < 0) {
      throw new Error(`Invalid base36 digit in exact deal ID: ${char}.`)
    }
    value = value * 36n + BigInt(digit)
  }

  if (value >= MAX_PERMUTATION_VALUE) {
    throw new Error(`Exact deal ID is out of range: ${exactId}.`)
  }

  return value
}

export const isExactDealId = (value: string | null | undefined): value is ExactDealId =>
  typeof value === 'string' && /^E1_[0-9a-z]+$/i.test(value)

export const computeDeckChecksum = (cards: readonly DealCard[]): string => {
  ensureUniqueDeck(cards)

  let hash = FNV_OFFSET_BASIS_64
  cards.forEach((card, index) => {
    const suitValue = BigInt(SUIT_HASH_VALUES[card.suit])
    const rankValue = BigInt(card.rank)
    const position = BigInt(index + 1)
    const combined = (suitValue << 16n) ^ (rankValue << 4n) ^ position
    hash ^= combined
    hash = (hash * FNV_PRIME_64) & 0xffffffffffffffffn
  })

  const base36 = hash.toString(36).toUpperCase()
  return `D1_${base36.padStart(13, '0')}`
}

export const createRandomExactDealId = (): ExactDealId => {
  // Gameplay deal generator: pick a random valid permutation rank, then let
  // `decodeExactDealId` build the deck. It does not consult or prefer the
  // solvable catalog.
  for (;;) {
    const bytes = new Uint8Array(EXACT_ID_BYTE_COUNT)
    Crypto.getRandomValues(bytes)
    bytes[0] &= EXACT_ID_TOP_BYTE_MASK
    const value = bytesToBigInt(bytes)
    if (value < MAX_PERMUTATION_VALUE) {
      return `${EXACT_ID_PREFIX}${value.toString(36)}` as ExactDealId
    }
  }
}

export const randomUnitInterval = (): number => {
  // Selector RNG, not a deck generator. Used for choosing among already-known
  // candidates such as solvable catalog entries.
  const bytes = new Uint8Array(4)
  Crypto.getRandomValues(bytes)
  const value = bytes[0] * 0x1000000 + bytes[1] * 0x10000 + bytes[2] * 0x100 + bytes[3]
  return value / 0x100000000
}

export const hasDrawCountInMask = (drawMask: number, drawCount: DrawCount): boolean =>
  (drawMask & DRAW_COUNT_MASKS[drawCount]) !== 0

export const formatExactDealDisplayName = (exactId: string): string => {
  if (!isExactDealId(exactId)) {
    return ''
  }

  const payload = exactId.slice(EXACT_ID_PREFIX.length).toUpperCase()
  const compact = payload.slice(-8).padStart(8, '0')
  return `Deal ${compact.slice(0, 4)}-${compact.slice(4)}`
}

const bytesToBigInt = (bytes: Uint8Array): bigint => {
  let value = 0n
  bytes.forEach((byte) => {
    value = (value << 8n) + BigInt(byte)
  })
  return value
}
