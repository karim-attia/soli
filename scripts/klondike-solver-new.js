/*
  New Klondike (Draw-1) Solver - from scratch
  Strategy: Greedy Best-First with Beam Search, move ordering to expose hidden cards, cycle detection, and
  stock/waste recycle handling. No reuse of project solver code.

  Usage:
    const { solveDeal } = require('./klondike-solver-new')
    const result = solveDeal({ seed, config })

  CLI entry is provided by harvest-solvable-new.js
*/

'use strict'

// Suits and ranks
const SUITS = ['clubs', 'diamonds', 'hearts', 'spades']
const RED = new Set(['hearts', 'diamonds'])
const RANKS = Array.from({ length: 13 }, (_, i) => i + 1)

// Random helpers
function rng(seed) {
  let s = BigInt(seed) & 0xffffffffn
  if (s === 0n) s = 123456789n
  return () => {
    // xorshift32
    s ^= s << 13n
    s ^= s >> 17n
    s ^= s << 5n
    const val = Number(s & 0xffffffffn)
    return (val >>> 0) / 2 ** 32
  }
}

function shuffleInPlace(arr, rand) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Create a standard deck
function createDeck(rand) {
  const deck = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, faceUp: false })
    }
  }
  return shuffleInPlace(deck, rand)
}

// Initial deal: 7 tableau columns (i+1 cards), last card faceUp; remaining to stock faceDown
function dealTableau(deck) {
  const tableau = Array.from({ length: 7 }, () => [])
  const deckCopy = deck.map((c) => ({ ...c }))
  for (let col = 0; col < 7; col += 1) {
    const count = col + 1
    for (let k = 0; k < count; k += 1) {
      const card = deckCopy.shift()
      if (!card) throw new Error('Deck exhausted during deal')
      tableau[col].push({ ...card, faceUp: k === count - 1 })
    }
  }
  const stock = deckCopy.map((c) => ({ ...c, faceUp: false }))
  return { tableau, stock }
}

function isRed(suit) {
  return RED.has(suit)
}

function canDropOnTableau(targetTop, movingTop) {
  if (!targetTop) {
    return movingTop.rank === 13 // King on empty
  }
  if (!targetTop.faceUp) return false
  const rankOk = targetTop.rank === movingTop.rank + 1
  const colorOk = isRed(targetTop.suit) !== isRed(movingTop.suit)
  return rankOk && colorOk
}

function canDropOnFoundation(pileTop, card) {
  if (!pileTop) return card.rank === 1 // Ace
  if (pileTop.suit !== card.suit) return false
  return pileTop.rank + 1 === card.rank
}

function cloneState(s) {
  return {
    tableau: s.tableau.map((col) => col.map((c) => ({ ...c }))),
    stock: s.stock.map((c) => ({ ...c })),
    waste: s.waste.map((c) => ({ ...c })),
    foundations: {
      clubs: s.foundations.clubs.map((c) => ({ ...c })),
      diamonds: s.foundations.diamonds.map((c) => ({ ...c })),
      hearts: s.foundations.hearts.map((c) => ({ ...c })),
      spades: s.foundations.spades.map((c) => ({ ...c })),
    },
    moves: s.moves || 0,
    depth: s.depth || 0,
  }
}

function hashState(s) {
  const encCard = (c) => `${c.suit[0]}${c.rank}${c.faceUp ? 'u' : 'd'}`
  const t = s.tableau
    .map((col) => col.map(encCard).join(','))
    .join('|')
  const w = s.waste.map(encCard).join(',')
  const st = s.stock.map(encCard).join(',')
  const f = ['clubs', 'diamonds', 'hearts', 'spades']
    .map((suit) => s.foundations[suit].map(encCard).join(','))
    .join('|')
  return `${t}#${w}#${st}#${f}`
}

function isSolved(s) {
  return (
    s.foundations.clubs.length === 13 &&
    s.foundations.diamonds.length === 13 &&
    s.foundations.hearts.length === 13 &&
    s.foundations.spades.length === 13
  )
}

function drawFromStock(s) {
  if (s.stock.length) {
    const card = s.stock.pop()
    s.waste.push({ ...card, faceUp: true })
    return true
  }
  if (s.waste.length) {
    // recycle waste to stock (faceDown, reversed order)
    const recycled = s.waste
      .slice()
      .reverse()
      .map((c) => ({ ...c, faceUp: false }))
    s.stock = recycled
    s.waste = []
    return true
  }
  return false
}

function flipNewTopIfNeeded(col) {
  if (!col.length) return
  const top = col[col.length - 1]
  if (!top.faceUp) top.faceUp = true
}

// Generate legal moves in priority order; returns array of mutators that produce child states
function generateMoves(state) {
  const moves = []

  // 1) Expose hidden cards: move stacks between tableau if it reveals a faceDown card
  for (let from = 0; from < 7; from += 1) {
    const col = state.tableau[from]
    if (!col.length) continue
    const firstFaceUp = col.findIndex((c) => c.faceUp)
    if (firstFaceUp === -1) continue
    for (let idx = firstFaceUp; idx < col.length; idx += 1) {
      const stackTop = col[idx]
      // candidate stack must be descending & alternating
      let ok = true
      for (let k = idx; k < col.length - 1; k += 1) {
        const a = col[k]
        const b = col[k + 1]
        if (!(a.rank === b.rank + 1 && isRed(a.suit) !== isRed(b.suit))) {
          ok = false
          break
        }
      }
      if (!ok) break
      for (let to = 0; to < 7; to += 1) {
        if (to === from) continue
        const dest = state.tableau[to]
        const destTop = dest[dest.length - 1]
        if (canDropOnTableau(destTop, stackTop)) {
          moves.push((s) => {
            const ns = cloneState(s)
            const moving = ns.tableau[from].splice(idx)
            ns.tableau[to].push(...moving)
            if (ns.tableau[from].length) flipNewTopIfNeeded(ns.tableau[from])
            ns.depth += 1
            ns.moves += 1
            return ns
          })
        }
      }
    }
  }

  // 2) Waste to tableau/foundation
  if (state.waste.length) {
    const wTop = state.waste[state.waste.length - 1]
    // tableau
    for (let to = 0; to < 7; to += 1) {
      const dest = state.tableau[to]
      const destTop = dest[dest.length - 1]
      if (canDropOnTableau(destTop, wTop)) {
        moves.push((s) => {
          const ns = cloneState(s)
          const card = ns.waste.pop()
          ns.tableau[to].push(card)
          ns.depth += 1
          ns.moves += 1
          return ns
        })
      }
    }
    // foundation
    const fTop = {
      clubs: state.foundations.clubs[state.foundations.clubs.length - 1],
      diamonds: state.foundations.diamonds[state.foundations.diamonds.length - 1],
      hearts: state.foundations.hearts[state.foundations.hearts.length - 1],
      spades: state.foundations.spades[state.foundations.spades.length - 1],
    }
    if (canDropOnFoundation(fTop[wTop.suit], wTop)) {
      moves.push((s) => {
        const ns = cloneState(s)
        const card = ns.waste.pop()
        ns.foundations[card.suit].push(card)
        ns.depth += 1
        ns.moves += 1
        return ns
      })
    }
  }

  // 3) Tableau single to foundation (safe-ish; delayed in ordering behind exposure)
  for (let from = 0; from < 7; from += 1) {
    const col = state.tableau[from]
    if (!col.length) continue
    const top = col[col.length - 1]
    if (!top.faceUp) continue
    const pileTop = state.foundations[top.suit][state.foundations[top.suit].length - 1]
    if (canDropOnFoundation(pileTop, top)) {
      moves.push((s) => {
        const ns = cloneState(s)
        const card = ns.tableau[from].pop()
        ns.foundations[card.suit].push(card)
        if (ns.tableau[from].length) flipNewTopIfNeeded(ns.tableau[from])
        ns.depth += 1
        ns.moves += 1
        return ns
      })
    }
  }

  // 4) Draw from stock (last resort in ordering)
  moves.push((s) => {
    const ns = cloneState(s)
    if (drawFromStock(ns)) {
      ns.depth += 1
      return ns
    }
    return null
  })

  return moves
}

function heuristicScore(s) {
  // Lower is better
  let faceDown = 0
  for (const col of s.tableau) {
    for (const c of col) if (!c.faceUp) faceDown += 1
  }
  const foundationCount =
    s.foundations.clubs.length +
    s.foundations.diamonds.length +
    s.foundations.hearts.length +
    s.foundations.spades.length
  // Encourage exposure and progress
  return faceDown * 5 - foundationCount * 2 + s.depth * 0.2
}

function bestFirstSearch(initial, opts) {
  const beamWidth = opts.beamWidth ?? 2000
  const maxNodes = opts.maxNodes ?? 300000
  const maxDepth = opts.maxDepth ?? 400
  const visited = new Set()
  let frontier = [initial]
  let nodes = 0

  while (frontier.length && nodes < maxNodes) {
    // Beam prune
    frontier.sort((a, b) => heuristicScore(a) - heuristicScore(b))
    if (frontier.length > beamWidth) frontier = frontier.slice(0, beamWidth)

    const next = []
    for (const state of frontier) {
      if (isSolved(state)) return { solved: true, state, nodes }
      if (state.depth >= maxDepth) continue
      const key = hashState(state)
      if (visited.has(key)) continue
      visited.add(key)

      const mvs = generateMoves(state)
      for (const apply of mvs) {
        const child = apply(state)
        nodes += 1
        if (!child) continue
        const childKey = hashState(child)
        if (!visited.has(childKey)) next.push(child)
        if (nodes >= maxNodes) break
      }
      if (nodes >= maxNodes) break
    }
    frontier = next
  }
  return { solved: false, nodes }
}

function createInitialStateFromDeck(deck) {
  const { tableau, stock } = dealTableau(deck)
  return {
    tableau,
    stock,
    waste: [],
    foundations: { clubs: [], diamonds: [], hearts: [], spades: [] },
    moves: 0,
    depth: 0,
  }
}

function solveDeal({ seed, config }) {
  const rand = rng(seed ?? Date.now())
  const deck = createDeck(rand)
  const initial = createInitialStateFromDeck(deck)
  const result = bestFirstSearch(initial, config || {})
  return { ...result, initial }
}

function extractInitialTableauConfig(initial) {
  // Convert to dataset schema: per column: down[], up[]
  return initial.tableau.map((col, colIndex) => {
    const down = []
    const up = []
    for (const c of col) {
      const entry = { suit: c.suit, rank: c.rank }
      if (c.faceUp) up.push(entry)
      else down.push(entry)
    }
    // Sanity: ensure exactly colIndex + 1 cards
    if (down.length + up.length !== colIndex + 1) {
      throw new Error('Invalid tableau column sizing in extraction')
    }
    if (up.length === 0) {
      throw new Error('Top card must be face up in extraction')
    }
    return { down, up }
  })
}

module.exports = {
  solveDeal,
  extractInitialTableauConfig,
}


