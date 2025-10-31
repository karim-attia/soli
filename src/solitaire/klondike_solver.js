/*
  Klondike solver (draw-1, unlimited recycles)
  - Input: deckOrder: number[] of length 52 mapping indices of createDeck() order
  - Output: { solvable: boolean, difficulty: string|undefined, stats: { nodes, depth, timeMs, cutoffReason: 'time'|'nodes'|null } }
  Notes:
  - We ignore stock order per requirement; treat stock as a multiset. We may draw any stock card when helpful.
  - Move legality mirrors standard Klondike rules (alternating colors descending, A->K foundations by suit).
  - Search: Iterative DFS with pruning, move ordering, transposition (Zobrist), in-place apply with undo.
*/

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades']
const RED = new Set(['hearts', 'diamonds'])
const ACE = 1
const KING = 13

// --- Zobrist hashing setup ---
const CARD_IDS = (() => {
	const map = new Map()
	let id = 0
	for (let s = 0; s < SUITS.length; s += 1) {
		for (let r = 1; r <= 13; r += 1) {
			map.set(SUITS[s] + ':' + r, id)
			id += 1
		}
	}
	return map
})()

function mulberry32(seed) {
	return function () {
		let t = (seed += 0x6D2B79F5)
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

const rand64 = (() => {
	const rnd = mulberry32(0xC0FFEE)
	return () => {
		const hi = BigInt((rnd() * 0xffffffff) >>> 0)
		const lo = BigInt((rnd() * 0xffffffff) >>> 0)
		return (hi << 32n) ^ lo
	}
})()

const ZOBRIST = (() => {
	const faceDownMax = 20
	const columns = 7
	const suits = 4
	const ranksPlusEmpty = 14
	const totalCards = 52
	return {
		foundation: Array.from({ length: suits }, () => Array.from({ length: ranksPlusEmpty }, () => rand64())),
		facedown: Array.from({ length: columns }, () => Array.from({ length: faceDownMax + 1 }, () => rand64())),
		columnCard: Array.from({ length: columns }, () => Array.from({ length: totalCards }, () => rand64())),
		stockCard: Array.from({ length: totalCards }, () => rand64()),
	}
})()

function cardIdOf(card) { return CARD_IDS.get(card.suit + ':' + card.rank) }

function zobristKey(state) {
	let key = 0n
	for (let s = 0; s < SUITS.length; s += 1) {
		const pile = state.foundations[SUITS[s]]
		const topRank = pile.length ? pile[pile.length - 1].rank : 0
		key ^= ZOBRIST.foundation[s][topRank]
	}
	for (let c = 0; c < state.tableau.length; c += 1) {
		const col = state.tableau[c]
		let down = 0
		for (let i = 0; i < col.length; i += 1) { if (!col[i].faceUp) down += 1 }
		const boundedDown = down > 20 ? 20 : down
		key ^= ZOBRIST.facedown[c][boundedDown]
		for (let i = 0; i < col.length; i += 1) {
			const card = col[i]
			if (card.faceUp) key ^= ZOBRIST.columnCard[c][cardIdOf(card)]
		}
	}
	for (let i = 0; i < state.stock.length; i += 1) key ^= ZOBRIST.stockCard[cardIdOf(state.stock[i])]
	return key.toString()
}

function createDeck() {
	const deck = []
	for (let s = 0; s < SUITS.length; s += 1) {
		const suit = SUITS[s]
		for (let r = 1; r <= 13; r += 1) deck.push({ suit, rank: r })
	}
	return deck
}

function dealTableauFromDeck(deck) {
	const tableau = Array.from({ length: 7 }, () => [])
	const copy = deck.slice()
	for (let c = 0; c < 7; c += 1) {
		const n = c + 1
		for (let k = 0; k < n; k += 1) {
			const card = copy.shift(); if (!card) break
			tableau[c].push({ suit: card.suit, rank: card.rank, faceUp: k === n - 1 })
		}
	}
	return { tableau, stock: copy.map((c) => ({ suit: c.suit, rank: c.rank })) }
}

function colorOf(suit) { return RED.has(suit) ? 'red' : 'black' }

function canDropOnTableau(targetColumn, movingStack) {
	if (!movingStack.length) return false
	for (let i = 0; i < movingStack.length - 1; i += 1) {
		const a = movingStack[i], b = movingStack[i + 1]
		if (!(a.rank === b.rank + 1 && colorOf(a.suit) !== colorOf(b.suit))) return false
	}
	if (targetColumn.length === 0) return movingStack[0].rank === KING
	const top = targetColumn[targetColumn.length - 1]
	if (!top.faceUp) return false
	return top.rank === movingStack[0].rank + 1 && colorOf(top.suit) !== colorOf(movingStack[0].suit)
}

function canDropOnFoundation(card, foundationPile, suit) {
	if (card.suit !== suit) return false
	if (foundationPile.length === 0) return card.rank === ACE
	const top = foundationPile[foundationPile.length - 1]
	return top.rank + 1 === card.rank
}

function flipNewTop(column) { if (column.length) { const top = column[column.length - 1]; if (!top.faceUp) top.faceUp = true } }
function isAutoCompleteReady(state) { return state.tableau.every((col) => col.every((c) => c.faceUp)) }

function isSafeToFoundation(card, foundations) {
	const isRed = RED.has(card.suit)
	const required = card.rank - 1
	if (required <= 1) return true
	if (isRed) {
		const b1 = foundations['clubs'].length ? foundations['clubs'][foundations['clubs'].length - 1].rank : 0
		const b2 = foundations['spades'].length ? foundations['spades'][foundations['spades'].length - 1].rank : 0
		return b1 >= required && b2 >= required
	}
	const r1 = foundations['hearts'].length ? foundations['hearts'][foundations['hearts'].length - 1].rank : 0
	const r2 = foundations['diamonds'].length ? foundations['diamonds'][foundations['diamonds'].length - 1].rank : 0
	return r1 >= required && r2 >= required
}

function listMoves(state) {
	const moves = []
	for (let ci = 0; ci < state.tableau.length; ci += 1) {
		const col = state.tableau[ci]
		if (!col.length) continue
		const top = col[col.length - 1]
		if (!top.faceUp) continue
		for (const s of SUITS) if (canDropOnFoundation(top, state.foundations[s], s) && isSafeToFoundation(top, state.foundations)) moves.push({ kind: 't2f', ci, suit: s })
	}
	for (let from = 0; from < state.tableau.length; from += 1) {
		const col = state.tableau[from]
		for (let i = 0; i < col.length; i += 1) {
			if (!col[i].faceUp) continue
			const stack = col.slice(i)
			let ok = true
			for (let k = 0; k < stack.length - 1; k += 1) {
				const a = stack[k], b = stack[k + 1]
				if (!(a.rank === b.rank + 1 && colorOf(a.suit) !== colorOf(b.suit))) { ok = false; break }
			}
			if (!ok) continue
			for (let to = 0; to < state.tableau.length; to += 1) {
				if (to === from) continue
				if (canDropOnTableau(state.tableau[to], stack)) moves.push({ kind: 't2t', from, index: i, to })
			}
			break
		}
	}
	for (const s of SUITS) {
		const need = state.foundations[s].length ? state.foundations[s][state.foundations[s].length - 1].rank + 1 : ACE
		const idx = state.stock.findIndex((c) => c.suit === s && c.rank === need)
		if (idx >= 0) {
			const card = state.stock[idx]
			if (isSafeToFoundation(card, state.foundations)) moves.push({ kind: 'stock2f', stockIndex: idx, suit: s })
		}
	}
	for (let si = 0; si < state.stock.length; si += 1) {
		const card = state.stock[si]
		for (let to = 0; to < state.tableau.length; to += 1) if (canDropOnTableau(state.tableau[to], [card])) moves.push({ kind: 'stock2t', stockIndex: si, to })
	}
	// f2t throttled: only include if no other moves
	let hasNonF2T = false
	for (const m of moves) { if (m.kind !== 'f2t') { hasNonF2T = true; break } }
	if (!hasNonF2T) {
		for (const s of SUITS) {
			const pile = state.foundations[s]
			if (!pile.length) continue
			const card = pile[pile.length - 1]
			for (let to = 0; to < state.tableau.length; to += 1) if (canDropOnTableau(state.tableau[to], [card])) moves.push({ kind: 'f2t', suit: s, to })
		}
	}
	return orderMoves(state, moves)
}

function orderMoves(state, moves) { return moves.sort((a, b) => scoreMove(state, b) - scoreMove(state, a)) }
function scoreMove(state, m) {
	switch (m.kind) {
		case 't2f': return 100
		case 'stock2f': return 90
		case 't2t': {
			const fromCol = state.tableau[m.from]
			const flipScore = m.index > 0 && !fromCol[m.index - 1].faceUp ? 30 : 0
			const willEmpty = m.index === 0 && fromCol.length > 0 ? 10 : 0
			return 70 + flipScore + willEmpty
		}
		case 'stock2t': return 60
		case 'f2t': return 5
		default: return 0
	}
}

// In-place apply/undo
function applyMoveInPlace(state, move) {
	if (move.kind === 't2f') {
		const col = state.tableau[move.ci]
		const prevLen = col.length
		const card = col.pop()
		const newTopIndex = col.length - 1
		let flipped = false
		if (newTopIndex >= 0 && !col[newTopIndex].faceUp) { col[newTopIndex].faceUp = true; flipped = true }
		state.foundations[move.suit].push({ suit: card.suit, rank: card.rank })
		return { type: 't2f', ci: move.ci, suit: move.suit, flipped, prevLen }
	}
	if (move.kind === 't2t') {
		const fromCol = state.tableau[move.from]
		const moving = fromCol.slice(move.index)
		const prevLen = fromCol.length
		state.tableau[move.from] = fromCol.slice(0, move.index)
		const toCol = state.tableau[move.to]
		const toPrevLen = toCol.length
		for (const c of moving) toCol.push({ ...c })
		const newTopIndex = state.tableau[move.from].length - 1
		let flipped = false
		if (newTopIndex >= 0 && !state.tableau[move.from][newTopIndex].faceUp) { state.tableau[move.from][newTopIndex].faceUp = true; flipped = true }
		return { type: 't2t', from: move.from, to: move.to, prevLen, toPrevLen, flipped }
	}
	if (move.kind === 'stock2f') {
		const card = state.stock.splice(move.stockIndex, 1)[0]
		state.foundations[move.suit].push({ suit: card.suit, rank: card.rank })
		return { type: 'stock2f', suit: move.suit, card }
	}
	if (move.kind === 'stock2t') {
		const card = state.stock.splice(move.stockIndex, 1)[0]
		state.tableau[move.to].push({ suit: card.suit, rank: card.rank, faceUp: true })
		return { type: 'stock2t', to: move.to, card }
	}
	if (move.kind === 'f2t') {
		const pile = state.foundations[move.suit]
		const card = pile.pop()
		state.tableau[move.to].push({ suit: card.suit, rank: card.rank, faceUp: true })
		return { type: 'f2t', suit: move.suit, to: move.to }
	}
	return null
}

function undoMoveInPlace(state, undo) {
	if (undo.type === 't2f') {
		const pile = state.foundations[undo.suit]
		const card = pile.pop()
		state.tableau[undo.ci].push({ suit: card.suit, rank: card.rank, faceUp: true })
		if (undo.flipped && state.tableau[undo.ci].length >= 2) {
			const idx = state.tableau[undo.ci].length - 2
			if (state.tableau[undo.ci][idx].faceUp) state.tableau[undo.ci][idx].faceUp = false
		}
		return
	}
	if (undo.type === 't2t') {
		const toCol = state.tableau[undo.to]
		const movedCount = toCol.length - undo.toPrevLen
		const moving = toCol.splice(toCol.length - movedCount, movedCount)
		const fromCol = state.tableau[undo.from]
		for (const c of moving) fromCol.push(c)
		if (undo.flipped && fromCol.length >= 2) {
			const idx = fromCol.length - 2
			if (fromCol[idx].faceUp) fromCol[idx].faceUp = false
		}
		return
	}
	if (undo.type === 'stock2f') {
		const pile = state.foundations[undo.suit]
		const card = pile.pop()
		state.stock.push({ suit: card.suit, rank: card.rank })
		return
	}
	if (undo.type === 'stock2t') {
		const col = state.tableau[undo.to]
		const card = col.pop()
		state.stock.push({ suit: card.suit, rank: card.rank })
		return
	}
	if (undo.type === 'f2t') {
		const col = state.tableau[undo.to]
		const card = col.pop()
		state.foundations[undo.suit].push({ suit: card.suit, rank: card.rank })
		return
	}
}

function isWin(state) { let total = 0; for (const s of SUITS) total += state.foundations[s].length; return total === 52 }

function setupStateFromDeckOrder(deckOrder) {
	if (!Array.isArray(deckOrder) || deckOrder.length !== 52) throw new Error('deckOrder must be an array of 52 integers')
	const baseDeck = createDeck(); const deck = deckOrder.map((i) => baseDeck[i])
	const { tableau, stock } = dealTableauFromDeck(deck)
	const foundations = {}; for (const s of SUITS) foundations[s] = []
	return { tableau, stock, foundations }
}

function classifyDifficulty(solved, nodes) {
	if (!solved) return undefined
	if (nodes < 1000) return 'trivial'
	if (nodes < 5000) return 'easy'
	if (nodes < 20000) return 'moderate'
	if (nodes < 50000) return 'challenging'
	if (nodes < 150000) return 'hard'
	return 'brutal'
}

function tryGreedyFinishIfReady(state) {
	if (!isAutoCompleteReady(state)) return false
	// Use a small clone to test finish without mutating main state
	const greedy = { tableau: state.tableau.map((c) => c.map((x) => ({ ...x }))), foundations: (() => { const f = {}; for (const s of SUITS) f[s] = state.foundations[s].map((x) => ({ ...x })); return f })(), stock: state.stock.slice() }
	let changed = true
	while (changed) {
		changed = false
		for (let ci = 0; ci < greedy.tableau.length; ci += 1) {
			const col = greedy.tableau[ci]
			if (!col.length) continue
			const top = col[col.length - 1]
			for (const s of SUITS) { if (canDropOnFoundation(top, greedy.foundations[s], s)) { col.pop(); greedy.foundations[s].push({ suit: top.suit, rank: top.rank }); changed = true; break } }
		}
		for (const s of SUITS) {
			const need = greedy.foundations[s].length ? greedy.foundations[s][greedy.foundations[s].length - 1].rank + 1 : ACE
			const idx = greedy.stock.findIndex((c) => c.suit === s && c.rank === need)
			if (idx >= 0) { const card = greedy.stock.splice(idx, 1)[0]; greedy.foundations[s].push({ suit: card.suit, rank: card.rank }); changed = true }
		}
	}
	return isWin(greedy)
}

function solveKlondike(deckOrder, options = {}) {
    const { maxNodes = 200000, maxTimeMs = 1000, strategy = 'dfs' } = options
    if (strategy === 'atomic') {
        try {
            // Lazy-require to avoid circular/size issues in mobile bundles
            const { solveKlondikeAtomic } = require('./klondike_solver_atomic')
            // Pass through full options so atomic can consume extra knobs
            return solveKlondikeAtomic(deckOrder, { ...options, maxNodes, maxTimeMs })
        } catch (e) {
            // Fallback to DFS if atomic is unavailable
        }
    }
	const state = setupStateFromDeckOrder(deckOrder)
	let nodes = 0
	let bestDepth = 0
	const deadline = Date.now() + maxTimeMs
	let budgetTimeHit = false
	let budgetNodesHit = false
	const bestAtDepth = new Map()

	const initialMoves = listMoves(state)
	if (initialMoves.length === 0) {
		return { solvable: false, difficulty: undefined, stats: { nodes: 0, depth: 0, timeMs: 0, cutoffReason: null } }
	}

	const stack = []
	function pushFrame(depth) {
		const key = zobristKey(state)
		const prev = bestAtDepth.get(key)
		if (prev !== undefined && prev <= depth) return false
		bestAtDepth.set(key, depth)
		const moves = listMoves(state)
		if (!moves.length) return false
		stack.push({ moves, idx: 0, depth, undo: null })
		return true
	}

	if (tryGreedyFinishIfReady(state)) {
		return { solvable: true, difficulty: classifyDifficulty(true, 0), stats: { nodes: 0, depth: 0, timeMs: 0, cutoffReason: null } }
	}
	if (!pushFrame(0)) {
		return { solvable: false, difficulty: undefined, stats: { nodes: 0, depth: 0, timeMs: 0, cutoffReason: null } }
	}

	while (stack.length) {
		if (Date.now() > deadline) { budgetTimeHit = true; break }
		if (nodes >= maxNodes) { budgetNodesHit = true; break }
		const top = stack[stack.length - 1]
		if (top.idx >= top.moves.length) {
			// backtrack
			stack.pop()
			if (top.undo) undoMoveInPlace(state, top.undo)
			continue
		}
		const mv = top.moves[top.idx++]
		const undo = applyMoveInPlace(state, mv)
		nodes += 1
		const nextDepth = top.depth + 1
		if (nextDepth > bestDepth) bestDepth = nextDepth
		if (isWin(state) || tryGreedyFinishIfReady(state)) {
			const timeMs = Math.max(0, Date.now() - (deadline - maxTimeMs))
			const difficulty = classifyDifficulty(true, nodes)
			return { solvable: true, difficulty, stats: { nodes, depth: bestDepth, timeMs, cutoffReason: null } }
		}
		if (!pushFrame(nextDepth)) {
			// dead end; undo and continue
			undoMoveInPlace(state, undo)
		} else {
			// record undo in the child frame to revert when it backtracks
			stack[stack.length - 1].undo = undo
		}
	}

	const timeMs = Math.max(0, Date.now() - (deadline - maxTimeMs))
	const cutoffReason = budgetTimeHit ? 'time' : budgetNodesHit ? 'nodes' : null
	return { solvable: false, difficulty: undefined, stats: { nodes, depth: bestDepth, timeMs, cutoffReason } }
}

module.exports = { solveKlondike, setupStateFromDeckOrder, SUITS }
