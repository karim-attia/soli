import type { Rank, Suit } from '../solitaire/klondike'

type SolvableCard = {
  suit: Suit
  rank: Rank
}

export type SolvableTableauColumnConfig = {
  down: SolvableCard[]
  up: SolvableCard[]
}

export type SolvableShuffleConfig = {
  id: string
  addedAt: string
  source?: string
  tableau: SolvableTableauColumnConfig[]
}

type SolvableShuffleDataset = {
  version: number
  shuffles: SolvableShuffleConfig[]
}

// eslint-disable-next-line @typescript-eslint/no-var-requires, unicorn/prefer-module
const rawDataset = require('./solvable-shuffles.json') as SolvableShuffleDataset

export const SOLVABLE_SHUFFLE_PREFIX = 'SOLVABLE'

const VALID_SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

function validateCard(card: SolvableCard, context: string): void {
  if (!VALID_SUITS.includes(card.suit)) {
    throw new Error(`Invalid suit in solvable shuffle dataset (${context}): ${card.suit}`)
  }

  if (typeof card.rank !== 'number' || card.rank < 1 || card.rank > 13) {
    throw new Error(`Invalid rank in solvable shuffle dataset (${context}): ${card.rank}`)
  }
}

function validateShuffle(shuffle: SolvableShuffleConfig): void {
  if (!shuffle.id?.length) {
    throw new Error('Solvable shuffle is missing an id')
  }

  if (!Array.isArray(shuffle.tableau) || shuffle.tableau.length !== 7) {
    throw new Error(`Solvable shuffle ${shuffle.id} must contain 7 tableau columns`)
  }

  if (!shuffle.addedAt || Number.isNaN(Date.parse(shuffle.addedAt))) {
    throw new Error(`Solvable shuffle ${shuffle.id} has an invalid addedAt date: ${shuffle.addedAt}`)
  }

  const seenCards = new Set<string>()

  shuffle.tableau.forEach((column, columnIndex) => {
    if (!column) {
      throw new Error(`Solvable shuffle ${shuffle.id} column ${columnIndex} is undefined`)
    }

    if (!Array.isArray(column.down) || !Array.isArray(column.up)) {
      throw new Error(`Solvable shuffle ${shuffle.id} column ${columnIndex} must define down/up arrays`)
    }

    const expectedCards = columnIndex + 1
    const actualCards = column.down.length + column.up.length

    if (actualCards !== expectedCards) {
      throw new Error(
        `Solvable shuffle ${shuffle.id} column ${columnIndex} should contain ${expectedCards} cards, found ${actualCards}`,
      )
    }

    if (column.up.length === 0) {
      throw new Error(`Solvable shuffle ${shuffle.id} column ${columnIndex} must expose at least one face-up card`)
    }

    column.down.forEach((card, cardIndex) => {
      validateCard(card, `${shuffle.id} column ${columnIndex} down[${cardIndex}]`)
      const key = `${card.suit}-${card.rank}`
      if (seenCards.has(key)) {
        throw new Error(`Duplicate card ${key} detected in solvable shuffle ${shuffle.id}`)
      }
      seenCards.add(key)
    })

    column.up.forEach((card, cardIndex) => {
      validateCard(card, `${shuffle.id} column ${columnIndex} up[${cardIndex}]`)
      const key = `${card.suit}-${card.rank}`
      if (seenCards.has(key)) {
        throw new Error(`Duplicate card ${key} detected in solvable shuffle ${shuffle.id}`)
      }
      seenCards.add(key)
    })
  })
}

function validateDataset(dataset: SolvableShuffleDataset): void {
  if (!dataset || typeof dataset.version !== 'number') {
    throw new Error('Invalid solvable shuffle dataset: missing version')
  }

  if (!Array.isArray(dataset.shuffles)) {
    throw new Error('Invalid solvable shuffle dataset: shuffles must be an array')
  }

  dataset.shuffles.forEach(validateShuffle)
}

validateDataset(rawDataset)

export const SOLVABLE_SHUFFLES: readonly SolvableShuffleConfig[] = rawDataset.shuffles

export const SOLVABLE_SHUFFLES_VERSION = rawDataset.version

const SOLVABLE_SHUFFLE_MAP = new Map<string, SolvableShuffleConfig>()
SOLVABLE_SHUFFLES.forEach((shuffle) => {
  SOLVABLE_SHUFFLE_MAP.set(shuffle.id, shuffle)
})

export const getSolvableShuffleById = (id: string): SolvableShuffleConfig | undefined =>
  SOLVABLE_SHUFFLE_MAP.get(id)

export function listSolvableShuffleIds(): string[] {
  return SOLVABLE_SHUFFLES.map((shuffle) => shuffle.id)
}

export const createSolvableShuffleId = (baseId: string): string =>
  `${SOLVABLE_SHUFFLE_PREFIX}:${baseId}:${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`

export const extractSolvableBaseId = (shuffleId: string): string | null => {
  if (typeof shuffleId !== 'string') {
    return null
  }

  if (!shuffleId.startsWith(`${SOLVABLE_SHUFFLE_PREFIX}:`)) {
    return null
  }

  const parts = shuffleId.split(':')
  if (parts.length < 2 || !parts[1]) {
    return null
  }

  return parts[1]
}

export const isSolvableShuffleId = (shuffleId: string): boolean =>
  extractSolvableBaseId(shuffleId) !== null

