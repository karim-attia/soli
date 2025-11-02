import { SOLVABLE_SHUFFLES_RAW } from './solvable-shuffles.raw'
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

export const SOLVABLE_SHUFFLE_PREFIX = 'SOLVABLE'

const VALID_SUITS: readonly Suit[] = ['clubs', 'diamonds', 'hearts', 'spades']

const SUIT_FROM_CODE: Record<string, Suit> = {
  C: 'clubs',
  D: 'diamonds',
  H: 'hearts',
  S: 'spades',
}

const SUIT_TO_CODE: Record<Suit, string> = {
  clubs: 'C',
  diamonds: 'D',
  hearts: 'H',
  spades: 'S',
}

const RANK_FROM_CODE: Record<string, Rank> = {
  A: 1,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
}

for (let rank = 2 as Rank; rank <= 9; rank += 1) {
  RANK_FROM_CODE[String(rank)] = rank
}

const RANK_TO_CODE: Record<number, string> = {}
Object.entries(RANK_FROM_CODE).forEach(([code, rank]) => {
  RANK_TO_CODE[rank] = code
})

function validateCard(card: SolvableCard, context: string): void {
  if (!VALID_SUITS.includes(card.suit)) {
    throw new Error(`Invalid suit in solvable shuffle dataset (${context}): ${card.suit}`)
  }

  if (typeof card.rank !== 'number' || card.rank < 1 || card.rank > 13) {
    throw new Error(`Invalid rank in solvable shuffle dataset (${context}): ${card.rank}`)
  }
}

function decodeCard(token: string, context: string): SolvableCard {
  const trimmed = token.trim().toUpperCase()
  if (!trimmed) {
    throw new Error(`Missing card code in ${context}`)
  }
  const suitCode = trimmed[0]
  const rankCode = trimmed.slice(1)
  const suit = SUIT_FROM_CODE[suitCode]
  const rank = RANK_FROM_CODE[rankCode]
  if (!suit || !rank) {
    throw new Error(`Invalid card code "${token}" in ${context}`)
  }
  return { suit, rank }
}

function encodeCard(card: SolvableCard): string {
  const suit = SUIT_TO_CODE[card.suit]
  const rank = RANK_TO_CODE[card.rank]
  if (!suit || !rank) {
    throw new Error('Unable to encode card')
  }
  return `${suit}${rank}`
}

function parseColumn(line: string, shuffleId: string): SolvableTableauColumnConfig {
  const match = line.match(/^(\d):\s*(.*?)\s*\|\s*(.+)$/)
  if (!match) {
    throw new Error(`Malformed tableau line in solvable shuffle ${shuffleId}: "${line}"`)
  }
  const columnIndex = Number(match[1]) - 1
  if (Number.isNaN(columnIndex) || columnIndex < 0 || columnIndex >= 7) {
    throw new Error(`Column index out of range in ${shuffleId}: "${line}"`)
  }

  const downTokens = match[2].trim() ? match[2].trim().split(/\s+/) : []
  const upTokens = match[3].trim().split(/\s+/)
  const down = downTokens.map((token, tokenIndex) => decodeCard(token, `${shuffleId} col ${columnIndex + 1} down[${tokenIndex}]`))
  const up = upTokens.map((token, tokenIndex) => decodeCard(token, `${shuffleId} col ${columnIndex + 1} up[${tokenIndex}]`))

  return { down, up }
}

function parseShuffleBlock(block: string): SolvableShuffleConfig | null {
  const lines = block
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))

  if (!lines.length) {
    return null
  }

  const headerParts = lines[0].split(/\s+/)
  const meta = new Map<string, string>()
  headerParts.forEach((segment) => {
    const [key, value] = segment.split('=')
    if (key && value) {
      meta.set(key, value)
    }
  })

  const id = meta.get('id') ?? ''
  const addedAt = meta.get('addedAt') ?? ''
  const source = meta.get('source') ?? undefined

  const tableauLines = lines.slice(1)
  const columns: Array<SolvableTableauColumnConfig | null> = Array.from({ length: 7 }, () => null)
  tableauLines.forEach((line) => {
    const match = line.match(/^(\d):/)
    if (!match) {
      return
    }
    const index = Number(match[1]) - 1
    columns[index] = parseColumn(line, id)
  })

  if (columns.some((col) => col === null)) {
    throw new Error(`Incomplete tableau definition for solvable shuffle ${id}`)
  }

  return {
    id,
    addedAt,
    source,
    tableau: columns as SolvableTableauColumnConfig[],
  }
}

function parseDataset(raw: string): SolvableShuffleConfig[] {
  const lines = raw.split('\n')
  const blocks: string[] = []
  let current: string[] = []

  lines.forEach((line) => {
    if (line.trim() === '---') {
      if (current.length) {
        blocks.push(current.join('\n'))
        current = []
      }
    } else {
      current.push(line)
    }
  })

  if (current.length) {
    blocks.push(current.join('\n'))
  }

  const shuffles: SolvableShuffleConfig[] = []
  blocks.forEach((block) => {
    const parsed = parseShuffleBlock(block)
    if (parsed) {
      shuffles.push(parsed)
    }
  })
  return shuffles
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
      const key = encodeCard(card)
      if (seenCards.has(key)) {
        throw new Error(`Duplicate card ${key} detected in solvable shuffle ${shuffle.id}`)
      }
      seenCards.add(key)
    })

    column.up.forEach((card, cardIndex) => {
      validateCard(card, `${shuffle.id} column ${columnIndex} up[${cardIndex}]`)
      const key = encodeCard(card)
      if (seenCards.has(key)) {
        throw new Error(`Duplicate card ${key} detected in solvable shuffle ${shuffle.id}`)
      }
      seenCards.add(key)
    })
  })
}

const parsedDataset = parseDataset(SOLVABLE_SHUFFLES_RAW)
parsedDataset.forEach(validateShuffle)

export const SOLVABLE_SHUFFLES: readonly SolvableShuffleConfig[] = parsedDataset

export const SOLVABLE_SHUFFLES_VERSION = 1

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

