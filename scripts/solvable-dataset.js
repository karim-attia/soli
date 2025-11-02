'use strict'

const fs = require('fs')
const path = require('path')

const RAW_DATASET_PATH = path.resolve(__dirname, '../src/data/solvable-shuffles.raw.ts')

const SUIT_TO_CODE = { clubs: 'C', diamonds: 'D', hearts: 'H', spades: 'S' }
const SUIT_FROM_CODE = { C: 'clubs', D: 'diamonds', H: 'hearts', S: 'spades' }

const RANK_TO_CODE = { 1: 'A', 10: 'T', 11: 'J', 12: 'Q', 13: 'K' }
const RANK_FROM_CODE = { A: 1, T: 10, J: 11, Q: 12, K: 13 }
for (let rank = 2; rank <= 9; rank += 1) {
  RANK_TO_CODE[rank] = String(rank)
  RANK_FROM_CODE[String(rank)] = rank
}

function encodeCard(card) {
  const suit = SUIT_TO_CODE[card.suit]
  const rank = RANK_TO_CODE[card.rank]
  if (!suit || !rank) {
    throw new Error(`Unable to encode card ${JSON.stringify(card)}`)
  }
  return `${suit}${rank}`
}

function decodeCard(token, context) {
  const trimmed = token.trim().toUpperCase()
  if (!trimmed) throw new Error(`Missing card code in ${context}`)
  const suit = SUIT_FROM_CODE[trimmed[0]]
  const rank = RANK_FROM_CODE[trimmed.slice(1)]
  if (!suit || !rank) {
    throw new Error(`Invalid card code "${token}" in ${context}`)
  }
  return { suit, rank }
}

function extractRawBody() {
  const moduleText = fs.readFileSync(RAW_DATASET_PATH, 'utf8')
  const match = moduleText.match(/`([\s\S]*)`\s*$/)
  if (!match) {
    throw new Error('Unable to locate raw dataset body in solvable-shuffles.raw.ts')
  }
  return match[1]
}

function parseDataset(rawBody) {
  const lines = rawBody.split('\n')
  const blocks = []
  let current = []
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

  return blocks
    .map((block) => {
      const filtered = block
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('#'))
      if (!filtered.length) return null

      const headerTokens = filtered[0].split(/\s+/)
      const meta = new Map()
      headerTokens.forEach((segment) => {
        const [key, value] = segment.split('=')
        if (key && value) meta.set(key, value)
      })

      const id = meta.get('id') || ''
      const addedAt = meta.get('addedAt') || ''
      const source = meta.get('source') || undefined

      const tableau = Array.from({ length: 7 }, () => ({ down: [], up: [] }))
      filtered.slice(1).forEach((line) => {
        const match = line.match(/^(\d):\s*(.*?)\s*\|\s*(.+)$/)
        if (!match) return
        const index = Number(match[1]) - 1
        if (index < 0 || index >= 7 || Number.isNaN(index)) return
        const downTokens = match[2].trim() ? match[2].trim().split(/\s+/) : []
        const upTokens = match[3].trim().split(/\s+/)
        tableau[index] = {
          down: downTokens.map((token, tokenIndex) => decodeCard(token, `${id} col ${index + 1} down[${tokenIndex}]`)),
          up: upTokens.map((token, tokenIndex) => decodeCard(token, `${id} col ${index + 1} up[${tokenIndex}]`)),
        }
      })

      if (tableau.some((col) => col.up.length === 0)) {
        throw new Error(`Invalid tableau definition for ${id}`)
      }

      return { id, addedAt, source, tableau }
    })
    .filter((entry) => entry !== null)
}

function encodeColumn(column, index) {
  const down = column.down.map(encodeCard).join(' ')
  const up = column.up.map(encodeCard).join(' ')
  return `${index + 1}: ${down}${down ? ' ' : ''}| ${up}`
}

function stringifyDataset(shuffles) {
  const lines = []
  shuffles.forEach((shuffle) => {
    const sourceSegment = shuffle.source ? ` source=${shuffle.source}` : ''
    lines.push(`id=${shuffle.id} addedAt=${shuffle.addedAt}${sourceSegment}`)
    shuffle.tableau.forEach((column, index) => {
      lines.push(encodeColumn(column, index))
    })
    lines.push('---')
  })
  return lines.join('\n')
}

function loadDataset() {
  const rawBody = extractRawBody()
  return parseDataset(rawBody)
}

function saveDataset(shuffles) {
  const rawBody = stringifyDataset(shuffles)
  const tsContent = `export const SOLVABLE_SHUFFLES_RAW = ` + '`\n' + rawBody.replace(/`/g, '\\`') + '\n`\n'
  fs.writeFileSync(RAW_DATASET_PATH, tsContent, 'utf8')
}

function tableauSignature(tableau) {
  return tableau
    .map((col) => {
      const down = col.down.map(encodeCard).join(',')
      const up = col.up.map(encodeCard).join(',')
      return `${down}|${up}`
    })
    .join(';')
}

function determineNextHarvestIndex(shuffles) {
  let maxIndex = 0
  const pattern = /^harvested-\d{8}-(\d{5})$/
  shuffles.forEach((shuffle) => {
    const match = pattern.exec(shuffle.id)
    if (match) {
      const numeric = Number(match[1])
      if (Number.isFinite(numeric) && numeric > maxIndex) {
        maxIndex = numeric
      }
    }
  })
  return maxIndex + 1
}

function makeShuffleIdFactory(initialIndex) {
  let counter = initialIndex
  return function nextId() {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const id = `harvested-${stamp}-${String(counter).padStart(5, '0')}`
    counter += 1
    return id
  }
}

module.exports = {
  loadDataset,
  saveDataset,
  tableauSignature,
  determineNextHarvestIndex,
  makeShuffleIdFactory,
  encodeCard,
  decodeCard,
}


