#!/usr/bin/env node

const { spawn } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const DEFAULT_LONELYBOT_DIR = path.resolve(ROOT, '../Lonelybot/lonelybot')
const DEFAULT_OUT = path.join(ROOT, 'src/data/demoAutoSolvePlaylist.generated.ts')
const CARD_COUNT = 52
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const SUITS = ['clubs', 'diamonds', 'hearts', 'spades']
const SUIT_SYMBOLS = {
  '♥': 'hearts',
  '♦': 'diamonds',
  '♣': 'clubs',
  '♠': 'spades',
}
const ASCII_SUITS = {
  H: 'hearts',
  D: 'diamonds',
  C: 'clubs',
  S: 'spades',
}

const parseArgs = (argv) => {
  const args = new Map()
  for (let index = 2; index < argv.length; index += 1) {
    const item = argv[index]
    if (!item.startsWith('--')) {
      continue
    }
    const [key, value] = item.slice(2).split('=')
    args.set(key, value ?? 'true')
  }
  return args
}

const readPositiveInteger = (args, key, fallback) => {
  const value = Number(args.get(key) ?? fallback)
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`--${key} must be a positive integer.`)
  }
  return value
}

const readNonNegativeInteger = (args, key, fallback) => {
  const value = Number(args.get(key) ?? fallback)
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`--${key} must be a non-negative integer.`)
  }
  return value
}

const runCommand = (command, commandArgs, options = {}) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, {
      cwd: options.cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      reject(
        new Error(
          `${command} ${commandArgs.join(' ')} exited with code ${code}\n${stderr}`
        )
      )
    })
  })

const parseRank = (rawRank) => {
  const index = RANKS.indexOf(rawRank.toUpperCase())
  if (index < 0) {
    throw new Error(`Unknown card rank: ${rawRank}`)
  }
  return index + 1
}

const parseSolvitaireCard = (rawCard) => {
  const suitCode = rawCard.slice(-1).toUpperCase()
  const suit = ASCII_SUITS[suitCode]
  if (!suit) {
    throw new Error(`Unknown Solvitaire suit in card: ${rawCard}`)
  }
  return {
    suit,
    rank: parseRank(rawCard.slice(0, -1)),
  }
}

const parseSolverCard = (rawCard) => {
  const suitSymbol = rawCard.slice(-1)
  const suit = SUIT_SYMBOLS[suitSymbol]
  if (!suit) {
    throw new Error(`Unknown solver suit in card: ${rawCard}`)
  }
  return {
    suit,
    rank: parseRank(rawCard.slice(0, -1)),
  }
}

const parsePosition = (rawPosition, role) => {
  if (rawPosition === 'D') {
    if (role !== 'source') {
      throw new Error('Deck can only appear as a move source in replay traces.')
    }
    return { type: 'waste' }
  }
  const columnIndex = Number(rawPosition)
  if (Number.isInteger(columnIndex) && columnIndex >= 1 && columnIndex <= 7) {
    return { type: 'tableau', columnIndex: columnIndex - 1 }
  }
  const suit = SUIT_SYMBOLS[rawPosition]
  if (suit) {
    return { type: 'foundation', suit }
  }
  throw new Error(`Unknown replay position: ${rawPosition}`)
}

const parseStandardMoveToken = (token) => {
  if (token === '=') {
    return { type: 'draw' }
  }

  const match = token.match(/^(.+):([^▸]+)▸(.+)$/u)
  if (!match) {
    throw new Error(`Invalid standard move token: ${token}`)
  }

  return {
    type: 'move',
    card: parseSolverCard(match[1]),
    source: parsePosition(match[2], 'source'),
    target: parsePosition(match[3], 'target'),
  }
}

const parseSolveOutput = (stdout) => {
  if (!stdout.includes('Solvable in')) {
    return null
  }

  const primitiveMatch = stdout.match(/Solvable in (\d+) moves/)
  const standardLine = stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.includes('▸'))

  if (!primitiveMatch || !standardLine) {
    throw new Error(`Could not parse solve output:\n${stdout}`)
  }

  return {
    primitiveMoveCount: Number(primitiveMatch[1]),
    moves: standardLine.split(/\s+/).filter(Boolean).map(parseStandardMoveToken),
  }
}

const appCardKey = (card) => `${card.suit}-${card.rank}`

const createCanonicalDealCards = () =>
  SUITS.flatMap((suit) => RANKS.map((_, index) => ({ suit, rank: index + 1 })))

const encodeExactDealId = (cards) => {
  if (cards.length !== CARD_COUNT) {
    throw new Error(`Exact deal IDs require ${CARD_COUNT} cards, got ${cards.length}.`)
  }

  const seen = new Set()
  cards.forEach((card) => {
    const key = appCardKey(card)
    if (seen.has(key)) {
      throw new Error(`Duplicate card while encoding exact ID: ${key}`)
    }
    seen.add(key)
  })

  const remaining = createCanonicalDealCards()
  let rank = 0n

  cards.forEach((card) => {
    const key = appCardKey(card)
    const position = remaining.findIndex((candidate) => appCardKey(candidate) === key)
    if (position < 0) {
      throw new Error(`Card not found while encoding exact ID: ${key}`)
    }
    rank = rank * BigInt(remaining.length) + BigInt(position)
    remaining.splice(position, 1)
  })

  return `E1_${rank.toString(36)}`
}

const parsePrintedDeck = (stdout) => {
  const parsed = JSON.parse(stdout)
  const tableauCards = parsed['tableau piles'].flat().map(parseSolvitaireCard)
  // Lonelybot prints stock in the order Soli must store it for pop-from-end draws
  // to expose the same current card sequence as the solver's `=` trace.
  const stockCards = parsed.stock.map(parseSolvitaireCard)
  return [...tableauCards, ...stockCards]
}

const createUndoProbeMoveIndices = (moves, seed, playlistIndex) => {
  if (moves.length < 12 || playlistIndex % 2 !== 0) {
    return []
  }

  let value = (seed + 1) * 1103515245 + 12345
  const probes = new Set()
  const desiredCount = playlistIndex % 5 === 0 ? 2 : 1
  const minIndex = 3
  const maxIndex = moves.length - 4

  while (probes.size < desiredCount && probes.size < maxIndex - minIndex) {
    value = (value * 1664525 + 1013904223) >>> 0
    probes.add(minIndex + (value % (maxIndex - minIndex + 1)))
  }

  return [...probes].sort((a, b) => a - b)
}

const renderValue = (value, indent = 0) => {
  const padding = ' '.repeat(indent)
  const nextPadding = ' '.repeat(indent + 2)

  if (Array.isArray(value)) {
    if (!value.length) {
      return '[]'
    }
    return `[\n${value.map((item) => `${nextPadding}${renderValue(item, indent + 2)},`).join('\n')}\n${padding}]`
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
    if (!entries.length) {
      return '{}'
    }
    return `{\n${entries
      .map(([key, item]) => `${nextPadding}${key}: ${renderValue(item, indent + 2)},`)
      .join('\n')}\n${padding}}`
  }

  return JSON.stringify(value)
}

const renderOutput = (
  entries,
  options
) => `// Generated by scripts/generate-demo-autosolve-playlist.js.
// Source: Lonelybot solve over default seeds, Draw ${options.drawCount}.
// Replay exact IDs use Soli stock order matched to Lonelybot's standard move trace.
// The replay starts from untouched stock because Lonelybot solution traces do.

import type { DemoAutoSolvePlaylistEntry } from '../solitaire/demoReplay'

export const DEMO_AUTO_SOLVE_PLAYLIST = ${renderValue(entries)} as const satisfies readonly DemoAutoSolvePlaylistEntry[]
`

const main = async () => {
  const args = parseArgs(process.argv)
  const count = readPositiveInteger(args, 'count', 20)
  const startSeed = readNonNegativeInteger(args, 'start-seed', 0)
  const drawCount = readPositiveInteger(args, 'draw-count', 1)
  const maxAttempts = readPositiveInteger(args, 'max-attempts', count * 4)
  const lonelybotDir = path.resolve(args.get('lonelybot-dir') ?? DEFAULT_LONELYBOT_DIR)
  const outputPath = path.resolve(args.get('out') ?? DEFAULT_OUT)
  const lonecliPath = path.join(lonelybotDir, 'target/release/lonecli')

  if (!fs.existsSync(lonecliPath)) {
    throw new Error(`Lonelybot binary not found at ${lonecliPath}`)
  }

  const entries = []
  let attempts = 0
  let seed = startSeed

  while (entries.length < count && attempts < maxAttempts) {
    attempts += 1
    const solve = await runCommand(lonecliPath, [
      'solve',
      'default',
      String(seed),
      String(drawCount),
    ])
    const parsedSolve = parseSolveOutput(solve.stdout)

    if (parsedSolve) {
      const printed = await runCommand(lonecliPath, ['print', 'default', String(seed)])
      const exactId = encodeExactDealId(parsePrintedDeck(printed.stdout))
      const playlistIndex = entries.length
      const entry = {
        id: `default-${seed}-draw-${drawCount}`,
        seedType: 'default',
        seed,
        drawCount,
        exactId,
        primitiveMoveCount: parsedSolve.primitiveMoveCount,
        undoProbeMoveIndices: createUndoProbeMoveIndices(
          parsedSolve.moves,
          seed,
          playlistIndex
        ),
        moves: parsedSolve.moves,
      }
      entries.push(entry)
      process.stdout.write(
        `Selected ${entry.id}: ${entry.moves.length} replay moves, ${entry.undoProbeMoveIndices.length} undo probes\n`
      )
    } else {
      process.stdout.write(`Skipped default-${seed}-draw-${drawCount}: not solved\n`)
    }

    seed += 1
  }

  if (entries.length < count) {
    throw new Error(
      `Only generated ${entries.length}/${count} entries after ${attempts} attempts.`
    )
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, renderOutput(entries, { drawCount }))
  process.stdout.write(
    `Wrote ${entries.length} demo auto-solve entries to ${outputPath}\n`
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
