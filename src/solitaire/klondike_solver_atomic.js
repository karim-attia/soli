/*
  Atomic flip solver for Klondike (draw-1, unlimited recycles)
  - Atomic position: state immediately after a tableau face-down card is flipped face-up
  - From each atomic position, run a BFS to the shortest next flip; collect all first-hit flips (approaches)
  - Choose least-steps approach (with tie-breakers), advance to next atomic position; backtrack when stuck
  - Stock treated as multiset (unordered availability) like the DFS solver
*/

const { devLog } = require('../utils/devLogger')

const SUITS = ['clubs', 'diamonds', 'hearts', 'spades']
const RED = new Set(['hearts', 'diamonds'])
const ACE = 1
const KING = 13

// --- Zobrist hashing (mirrors dfs solver) ---
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

// --- State helpers ---
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

function setupStateFromDeckOrder(deckOrder) {
	if (!Array.isArray(deckOrder) || deckOrder.length !== 52) throw new Error('deckOrder must be an array of 52 integers')
	const baseDeck = createDeck(); const deck = deckOrder.map((i) => baseDeck[i])
	const { tableau, stock } = dealTableauFromDeck(deck)
	const foundations = {}; for (const s of SUITS) foundations[s] = []
	return { tableau, stock, foundations }
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

// Normalize state by auto-moving "safe" cards to foundations.
// - Always allow safe moves from stock.
// - From tableau, also allow safe moves even if they cause a flip. When a flip occurs
//   due to removing the top card, we flip the new top immediately.
// The function returns whether any tableau flip happened during normalization.
function normalizeSafeToFoundationNoFlip(state, allowTableauFlip = true) {
    let changed = true
    let flippedAny = false
    while (changed) {
        changed = false
        // stock -> foundation (never flips tableau)
        for (const s of SUITS) {
            const need = state.foundations[s].length ? state.foundations[s][state.foundations[s].length - 1].rank + 1 : ACE
            const idx = state.stock.findIndex((c) => c.suit === s && c.rank === need)
            if (idx >= 0) {
                const card = state.stock[idx]
                if (isSafeToFoundation(card, state.foundations)) {
                    state.stock.splice(idx, 1)
                    state.foundations[s].push({ suit: card.suit, rank: card.rank })
                    changed = true
                }
            }
        }
        // tableau top -> foundation (allow flips by default)
        for (let ci = 0; ci < state.tableau.length; ci += 1) {
            const col = state.tableau[ci]
            if (col.length === 0) continue
            const top = col[col.length - 1]
            if (!top.faceUp) continue
            // If flips are not allowed, only move when removing the top won't flip
            const noFlip = col.length >= 2 && !!col[col.length - 2].faceUp
            if (!allowTableauFlip && !noFlip) continue
            for (const s of SUITS) {
                if (canDropOnFoundation(top, state.foundations[s], s) && isSafeToFoundation(top, state.foundations)) {
                    col.pop()
                    state.foundations[s].push({ suit: top.suit, rank: top.rank })
                    // flip new top if any and flipping is allowed
                    const newTopIndex = col.length - 1
                    if (allowTableauFlip && newTopIndex >= 0 && !col[newTopIndex].faceUp) {
                        col[newTopIndex].faceUp = true
                        flippedAny = true
                    }
                    changed = true
                    break
                }
            }
        }
    }
    return flippedAny
}

function listMoves(state) {
	const moves = []
	// tableau -> foundation
	for (let ci = 0; ci < state.tableau.length; ci += 1) {
		const col = state.tableau[ci]
		if (!col.length) continue
		const top = col[col.length - 1]
		if (!top.faceUp) continue
		for (const s of SUITS) if (canDropOnFoundation(top, state.foundations[s], s) && isSafeToFoundation(top, state.foundations)) moves.push({ kind: 't2f', ci, suit: s })
	}
	// tableau -> tableau (any face-up stack)
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
	// stock -> foundation
	for (const s of SUITS) {
		const need = state.foundations[s].length ? state.foundations[s][state.foundations[s].length - 1].rank + 1 : ACE
		const idx = state.stock.findIndex((c) => c.suit === s && c.rank === need)
		if (idx >= 0) {
			const card = state.stock[idx]
			if (isSafeToFoundation(card, state.foundations)) moves.push({ kind: 'stock2f', stockIndex: idx, suit: s })
		}
	}
	// stock -> tableau
	for (let si = 0; si < state.stock.length; si += 1) {
		const card = state.stock[si]
		for (let to = 0; to < state.tableau.length; to += 1) if (canDropOnTableau(state.tableau[to], [card])) moves.push({ kind: 'stock2t', stockIndex: si, to })
	}
	// throttled f2t only if no other moves
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
	return moves
}

function cloneState(state) {
	return {
		tableau: state.tableau.map((col) => col.map((c) => ({ suit: c.suit, rank: c.rank, faceUp: !!c.faceUp }))),
		stock: state.stock.map((c) => ({ suit: c.suit, rank: c.rank })),
		foundations: (() => { const f = {}; for (const s of SUITS) f[s] = state.foundations[s].map((c) => ({ suit: c.suit, rank: c.rank })); return f })(),
	}
}

function applyMoveClone(state, move) {
	const s = cloneState(state)
	let flipped = false
	if (move.kind === 't2f') {
		const col = s.tableau[move.ci]
		col.pop()
		const newTopIndex = col.length - 1
		if (newTopIndex >= 0 && !col[newTopIndex].faceUp) { col[newTopIndex].faceUp = true; flipped = true }
		s.foundations[move.suit].push({ suit: state.tableau[move.ci][state.tableau[move.ci].length - 1].suit, rank: state.tableau[move.ci][state.tableau[move.ci].length - 1].rank })
		return { state: s, flipped }
	}
	if (move.kind === 't2t') {
		const fromCol = s.tableau[move.from]
		const moving = fromCol.slice(move.index)
		s.tableau[move.from] = fromCol.slice(0, move.index)
		const toCol = s.tableau[move.to]
		for (const c of moving) toCol.push({ suit: c.suit, rank: c.rank, faceUp: true })
		const newTopIndex = s.tableau[move.from].length - 1
		if (newTopIndex >= 0 && !s.tableau[move.from][newTopIndex].faceUp) { s.tableau[move.from][newTopIndex].faceUp = true; flipped = true }
		return { state: s, flipped }
	}
	if (move.kind === 'stock2f') {
		const card = s.stock.splice(move.stockIndex, 1)[0]
		s.foundations[move.suit].push({ suit: card.suit, rank: card.rank })
		return { state: s, flipped }
	}
	if (move.kind === 'stock2t') {
		const card = s.stock.splice(move.stockIndex, 1)[0]
		s.tableau[move.to].push({ suit: card.suit, rank: card.rank, faceUp: true })
		return { state: s, flipped }
	}
	if (move.kind === 'f2t') {
		const pile = s.foundations[move.suit]
		const card = pile.pop()
		s.tableau[move.to].push({ suit: card.suit, rank: card.rank, faceUp: true })
		return { state: s, flipped }
	}
	return { state: s, flipped }
}

function isAutoCompleteReady(state) { return state.tableau.every((col) => col.every((c) => c.faceUp)) }
function isWin(state) { let total = 0; for (const s of SUITS) total += state.foundations[s].length; return total === 52 }

function tryGreedyFinishIfReady(state) {
	if (!isAutoCompleteReady(state)) return false
	const greedy = cloneState(state)
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

// BFS from an atomic state to gather all next flips at minimal step count
function findNextFlipCandidates(rootState, budget) {
    const { maxLocalNodes, deadline, maxApproachSteps, avoidEmptyUnlessKing, trivialFirst = true, relevantOnly = false, relevantFirst = false, relevanceStepsCap } = budget
	let nodes = 0
	const root = cloneState(rootState)
	normalizeSafeToFoundationNoFlip(root)
	const rootKey = zobristKey(root)
	const seen = new Set([rootKey])
	const q = [{ state: root, steps: 0, path: [] }]
	const candidates = []

    function runBfsWithFilter(moveFilter, capOverride, relevantOverride) {
		const q2 = [{ state: cloneState(root), steps: 0, path: [] }]
		const seen2 = new Set([rootKey])
        const foundMap = new Map() // key -> best candidate by (stockUses, f2tUses, steps)
        function countPathStats(path) {
            let stockUses = 0, f2tUses = 0
            for (const m of path) {
                if (m.kind === 'stock2f' || m.kind === 'stock2t') stockUses += 1
                else if (m.kind === 'f2t') f2tUses += 1
            }
            return { stockUses, f2tUses }
        }
		while (q2.length) {
			if (deadline && Date.now() > deadline) break
			const cur = q2.shift()
			const cap = capOverride !== undefined ? capOverride : maxApproachSteps
			if (cap !== undefined && cur.steps > cap) break
			const allMoves = listMoves(cur.state)
			const frOnly = (relevantOverride !== undefined ? relevantOverride : relevantOnly)
			const frontiers = frOnly ? computeFrontiers(cur.state) : null
			const preferred = []
			const deferred = []
			for (const mv of allMoves) {
				if (!moveFilter(mv, cur.state)) continue
				if (frOnly && !isRelevantMove(mv, cur.state, frontiers)) continue
				if (avoidEmptyUnlessKing && mv.kind === 't2t' && mv.index === 0) {
					const fromCol = cur.state.tableau[mv.from]
					const moving = fromCol.slice(mv.index)
					const toCol = cur.state.tableau[mv.to]
					const kingToEmpty = moving.length > 0 && moving[0].rank === KING && toCol.length === 0
					if (!kingToEmpty) { deferred.push(mv); continue }
				}
				preferred.push(mv)
			}
			const movesOrdered = preferred.concat(deferred)
			for (const mv of movesOrdered) {
				if (deadline && Date.now() > deadline) break
				if (maxLocalNodes && nodes >= maxLocalNodes) break
                const { state: nxt, flipped } = applyMoveClone(cur.state, mv)
                const normFlipped = normalizeSafeToFoundationNoFlip(nxt, true)
				nodes += 1
                if (flipped || normFlipped) {
                    const fullPath = cur.path.concat([mv])
                    const key = zobristKey(nxt)
                    const { stockUses, f2tUses } = countPathStats(fullPath)
                    const prev = foundMap.get(key)
                    const cand = { steps: cur.steps + 1, path: fullPath, state: nxt, stockUses, f2tUses }
                    if (!prev || stockUses < prev.stockUses || (stockUses === prev.stockUses && (f2tUses < prev.f2tUses || (f2tUses === prev.f2tUses && cand.steps < prev.steps)))) {
                        foundMap.set(key, cand)
                    }
					continue
				}
				const key = zobristKey(nxt)
				if (!seen2.has(key)) { seen2.add(key); q2.push({ state: nxt, steps: cur.steps + 1, path: cur.path.concat([mv]) }) }
			}
		}
        return Array.from(foundMap.values())
	}

    // Stage A: frontier-relevant quick pass with small cap, then fallback if nothing found
    if (relevantFirst) {
        const capA = relevanceStepsCap !== undefined ? relevanceStepsCap : (maxApproachSteps !== undefined ? Math.min(maxApproachSteps, 8) : 8)
        const rel = runBfsWithFilter(() => true, capA, true)
        if (rel.length) return { candidates: rel, nodesUsed: nodes }
    }

    if (trivialFirst) {
		// Phase 1: foundation-only (t2f, stock2f)
		const trivial1 = runBfsWithFilter((mv) => mv.kind === 't2f' || mv.kind === 'stock2f')
		if (trivial1.length) return { candidates: trivial1, nodesUsed: nodes }
		// Phase 2: allow stock/foundation downs but no tableau shuffles (stock2t, f2t, t2f, stock2f)
		const trivial2 = runBfsWithFilter((mv) => mv.kind === 't2f' || mv.kind === 'stock2f' || mv.kind === 'stock2t' || mv.kind === 'f2t')
		if (trivial2.length) return { candidates: trivial2, nodesUsed: nodes }
	}
    const foundFinalMap = new Map()
    function countPathStats(path) {
        let stockUses = 0, f2tUses = 0
        for (const m of path) {
            if (m.kind === 'stock2f' || m.kind === 'stock2t') stockUses += 1
            else if (m.kind === 'f2t') f2tUses += 1
        }
        return { stockUses, f2tUses }
    }
    while (q.length) {
		if (deadline && Date.now() > deadline) break
		const cur = q.shift()
        if (maxApproachSteps !== undefined && cur.steps > maxApproachSteps) break
        const allMoves = listMoves(cur.state)
        const frontiers = relevantOnly ? computeFrontiers(cur.state) : null
        // Prefer moves that don't empty a column; defer emptying unless king-to-empty (if enabled)
        const preferred = []
        const deferred = []
        for (const mv of allMoves) {
            if (relevantOnly && !isRelevantMove(mv, cur.state, frontiers)) continue
            if (avoidEmptyUnlessKing && mv.kind === 't2t' && mv.index === 0) {
                const fromCol = cur.state.tableau[mv.from]
                const moving = fromCol.slice(mv.index)
                const toCol = cur.state.tableau[mv.to]
                const kingToEmpty = moving.length > 0 && moving[0].rank === KING && toCol.length === 0
                if (!kingToEmpty) { deferred.push(mv); continue }
            }
            preferred.push(mv)
        }
        const movesOrdered = preferred.concat(deferred)
        for (const mv of movesOrdered) {
			if (deadline && Date.now() > deadline) break
			if (maxLocalNodes && nodes >= maxLocalNodes) break
            const { state: nxt, flipped } = applyMoveClone(cur.state, mv)
            const normFlipped = normalizeSafeToFoundationNoFlip(nxt, true)
			nodes += 1
            if (flipped || normFlipped) {
                const fullPath = cur.path.concat([mv])
                const key = zobristKey(nxt)
                const { stockUses, f2tUses } = countPathStats(fullPath)
                const prev = foundFinalMap.get(key)
                const cand = { steps: cur.steps + 1, path: fullPath, state: nxt, stockUses, f2tUses }
                if (!prev || stockUses < prev.stockUses || (stockUses === prev.stockUses && (f2tUses < prev.f2tUses || (f2tUses === prev.f2tUses && cand.steps < prev.steps)))) {
                    foundFinalMap.set(key, cand)
                }
				continue
			}
			const key = zobristKey(nxt)
			if (!seen.has(key)) { seen.add(key); q.push({ state: nxt, steps: cur.steps + 1, path: cur.path.concat([mv]) }) }
		}
	}
    const deduped = candidates.concat(Array.from(foundFinalMap.values()))
    return { candidates: deduped, nodesUsed: nodes }
}

function classifyDifficultyByNodes(nodes) {
	if (nodes < 1000) return 'trivial'
	if (nodes < 5000) return 'easy'
	if (nodes < 20000) return 'moderate'
	if (nodes < 50000) return 'challenging'
	if (nodes < 150000) return 'hard'
	return 'brutal'
}

function countFaceDowns(state) {
	let n = 0
	for (const col of state.tableau) for (const c of col) if (!c.faceUp) n += 1
	return n
}

function rankCandidates(rootState, candidates) {
    // primary: fewer steps; optional tie-breaker: needed ranks; then fewer remaining face-downs, more foundations, more empty columns
    const needs = USE_NEEDED_RANKS ? computeNeededRequirements(rootState) : null
    const cache = new Map()
    const getScore = (c) => { if (!needs) return 0; if (cache.has(c)) return cache.get(c); const s = neededScoreFromNeeds(needs, c.state); cache.set(c, s); return s }
    return candidates.sort((a, b) => {
        if (a.steps !== b.steps) return a.steps - b.steps
        if (needs) {
            const sa = getScore(a), sb = getScore(b)
            if (sa !== sb) return sb - sa // prefer higher needed score
        }
        const ad = countFaceDowns(a.state)
        const bd = countFaceDowns(b.state)
        if (ad !== bd) return ad - bd
        const af = totalFoundationCount(a.state)
        const bf = totalFoundationCount(b.state)
        if (af !== bf) return bf - af
        const ae = emptyColumns(a.state)
        const be = emptyColumns(b.state)
        if (ae !== be) return be - ae
        return 0
    })
}

function faceDownsByColumn(state) {
    const arr = []
    for (let c = 0; c < state.tableau.length; c += 1) {
        let down = 0
        const col = state.tableau[c]
        for (let i = 0; i < col.length; i += 1) if (!col[i].faceUp) down += 1
        arr.push(down)
    }
    return arr
}

function findFlipColumn(rootState, nextState) {
    const before = faceDownsByColumn(rootState)
    const after = faceDownsByColumn(nextState)
    for (let i = 0; i < Math.max(before.length, after.length); i += 1) {
        const b = before[i] || 0
        const a = after[i] || 0
        if (a === b - 1) return i
    }
    return -1
}

function rankCandidatesByMostCovered(rootState, candidates) {
    const before = faceDownsByColumn(rootState)
    const needs = USE_NEEDED_RANKS ? computeNeededRequirements(rootState) : null
    const cache = new Map()
    const getScore = (c) => { if (!needs) return 0; if (cache.has(c)) return cache.get(c); const s = neededScoreFromNeeds(needs, c.state); cache.set(c, s); return s }
    return candidates.slice().sort((a, b) => {
        const ca = findFlipColumn(rootState, a.state)
        const cb = findFlipColumn(rootState, b.state)
        const va = ca >= 0 ? before[ca] : -1
        const vb = cb >= 0 ? before[cb] : -1
        if (va !== vb) return vb - va // prefer larger count of covered cards before flip
        if (needs) {
            const sa = getScore(a), sb = getScore(b)
            if (sa !== sb) return sb - sa
        }
        // tie-break with fewer steps
        if (a.steps !== b.steps) return a.steps - b.steps
        return 0
    })
}

// Count how many tableau columns are touched by a path
function changedColumnsFromPathStandalone(path) {
    const set = new Set()
    for (const mv of path) {
        if (mv.kind === 't2t') { set.add(mv.from); set.add(mv.to) }
        else if (mv.kind === 't2f') { set.add(mv.ci) }
        else if (mv.kind === 'stock2t') { set.add(mv.to) }
        else if (mv.kind === 'f2t') { set.add(mv.to) }
    }
    return set.size
}

// Blended ranking: prioritize most covered, then fewer steps, then fewer stock/f2t uses, then fewer columns touched
function rankCandidatesBlended(rootState, candidates) {
    const before = faceDownsByColumn(rootState)
    const needs = USE_NEEDED_RANKS ? computeNeededRequirements(rootState) : null
    const cache = new Map()
    const getScore = (c) => { if (!needs) return 0; if (cache.has(c)) return cache.get(c); const s = neededScoreFromNeeds(needs, c.state); cache.set(c, s); return s }
    return candidates.slice().sort((a, b) => {
        const ca = findFlipColumn(rootState, a.state)
        const cb = findFlipColumn(rootState, b.state)
        const va = ca >= 0 ? before[ca] : -1
        const vb = cb >= 0 ? before[cb] : -1
        if (va !== vb) return vb - va
        if (needs) {
            const sa = getScore(a), sb = getScore(b)
            if (sa !== sb) return sb - sa
        }
        if (a.steps !== b.steps) return a.steps - b.steps
        const sa = a.stockUses ?? 0, sb = b.stockUses ?? 0
        if (sa !== sb) return sa - sb
        const fa = a.f2tUses ?? 0, fb = b.f2tUses ?? 0
        if (fa !== fb) return fa - fb
        const caTouched = changedColumnsFromPathStandalone(a.path || [])
        const cbTouched = changedColumnsFromPathStandalone(b.path || [])
        if (caTouched !== cbTouched) return caTouched - cbTouched
        return 0
    })
}

function totalFoundationCount(state) { let t = 0; for (const s of SUITS) t += state.foundations[s].length; return t }
function emptyColumns(state) { let t = 0; for (const col of state.tableau) if (col.length === 0) t += 1; return t }

// Optional heuristic toggle (set from options)
let USE_NEEDED_RANKS = false
let USE_COVER_CANONICAL = false
let PRINTED_ATOMIC_CONFIG = false

// --- Needed ranks heuristic ---
// For each blocked column in the root state, identify the frontier base card (first face-up above the topmost face-down).
// If base is a KING, the need is an empty column; otherwise, need a top-of-column card of opposite color with rank base.rank + 1.
// Weight each need by the number of face-down cards in that column (more blocked -> higher priority).
function computeNeededRequirements(rootState) {
    const needs = []
    const weights = faceDownsByColumn(rootState)
    for (let c = 0; c < rootState.tableau.length; c += 1) {
        const downCount = weights[c]
        if (!downCount) continue
        const col = rootState.tableau[c]
        let lastDown = -1
        for (let i = 0; i < col.length; i += 1) { if (!col[i].faceUp) lastDown = i }
        const baseIdx = lastDown + 1
        if (baseIdx < 0 || baseIdx >= col.length) continue
        const base = col[baseIdx]
        if (base.rank === KING) {
            needs.push({ type: 'empty', weight: downCount })
        } else {
            const baseColor = colorOf(base.suit)
            const needColor = baseColor === 'red' ? 'black' : 'red'
            needs.push({ type: 'rank', weight: downCount, rank: base.rank + 1, color: needColor })
        }
    }
    return needs
}

function neededScoreFromNeeds(needs, candState) {
    if (!needs || !needs.length) return 0
    const tops = []
    let emptyCount = 0
    for (let c = 0; c < candState.tableau.length; c += 1) {
        const col = candState.tableau[c]
        if (!col.length) { emptyCount += 1; continue }
        const top = col[col.length - 1]
        if (top && top.faceUp) tops.push(top)
    }
    let score = 0
    for (const need of needs) {
        if (need.type === 'empty') {
            if (emptyCount > 0) score += need.weight
            continue
        }
        let satisfied = false
        for (const t of tops) {
            const tColor = colorOf(t.suit)
            if (t.rank === need.rank && tColor === need.color) { satisfied = true; break }
        }
        if (satisfied) score += need.weight
    }
    return score
}

// Compute canonical representative for an atomic state by applying only no-flip safe moves
// (stock->foundation and tableau-top->foundation that does not expose a facedown), until fixpoint.
// This preserves the covered-card configuration while maximizing safe progress to foundations.
function computeCanonicalKeyAndSnapshot(curState) {
    const snap = cloneState(curState)
    normalizeSafeToFoundationNoFlip(snap, false)
    const key = zobristKey(snap)
    return { key, snapshot: snap }
}

// --- Frontier relevance pruning ---
function computeFrontiers(state) {
    const frontiers = []
    for (let c = 0; c < state.tableau.length; c += 1) {
        const col = state.tableau[c]
        let lastDown = -1
        for (let i = 0; i < col.length; i += 1) { if (!col[i].faceUp) lastDown = i }
        if (lastDown >= 0 && lastDown + 1 < col.length) {
            const baseIdx = lastDown + 1
            const base = col[baseIdx]
            if (!base || !base.faceUp) continue
            if (base.rank === KING) {
                frontiers.push({ col: c, baseIdx, need: { type: 'empty' } })
            } else {
                const needColor = colorOf(base.suit) === 'red' ? 'black' : 'red'
                frontiers.push({ col: c, baseIdx, need: { type: 'rank', rank: base.rank + 1, color: needColor } })
            }
        }
    }
    return frontiers
}

function isRelevantMove(mv, state, frontiers) {
    if (!frontiers || !frontiers.length) return true
    if (mv.kind === 'stock2f') return true
    if (mv.kind === 't2f') {
        const col = state.tableau[mv.ci]
        const newTopIndex = col.length - 2
        const flips = newTopIndex >= 0 && !col[newTopIndex].faceUp
        if (flips) return true
        for (const f of frontiers) if (f.col === mv.ci) return true
        return false
    }
    if (mv.kind === 't2t') {
        let srcFrontier = null
        for (const f of frontiers) { if (f.col === mv.from) { srcFrontier = f; break } }
        if (!srcFrontier) return false
        if (mv.index !== srcFrontier.baseIdx) return false
        const moving = state.tableau[mv.from].slice(mv.index)
        if (!moving.length) return false
        const top = moving[0]
        const toCol = state.tableau[mv.to]
        if (toCol.length === 0) return srcFrontier.need.type === 'empty' && top.rank === KING
        const toTop = toCol[toCol.length - 1]
        if (!toTop.faceUp) return false
        if (srcFrontier.need.type === 'rank') {
            const needColor = srcFrontier.need.color
            const needRank = srcFrontier.need.rank
            const topColor = colorOf(toTop.suit)
            return topColor === needColor && toTop.rank === needRank
        }
        return false
    }
    if (mv.kind === 'stock2t') {
        let tgtFrontier = null
        for (const f of frontiers) { if (f.col === mv.to) { tgtFrontier = f; break } }
        if (!tgtFrontier) return false
        const card = state.stock[mv.stockIndex]
        if (!card) return false
        if (tgtFrontier.need.type === 'empty') return false
        const cardColor = colorOf(card.suit)
        return cardColor === tgtFrontier.need.color && card.rank === tgtFrontier.need.rank
    }
    if (mv.kind === 'f2t') {
        let tgtFrontier = null
        for (const f of frontiers) { if (f.col === mv.to) { tgtFrontier = f; break } }
        if (!tgtFrontier) return false
        if (tgtFrontier.need.type === 'empty') return false
        const pile = state.foundations[mv.suit]
        if (!pile.length) return false
        const card = pile[pile.length - 1]
        const cardColor = colorOf(card.suit)
        return cardColor === tgtFrontier.need.color && card.rank === tgtFrontier.need.rank
    }
    return true
}

 function solveKlondikeAtomic(deckOrder, options = {}) {
    const { maxNodes = 2000000, maxTimeMs = 5000, maxLocalNodes = 200000, maxApproachSteps = 20, maxApproachStepsHigh = 80, relaxAtDepth = 17, approachStepsIncrement = 3, avoidEmptyUnlessKing = true, enableBackjump = true, rankingStrategy = 'blended', useNeededRanks = false, useCoverCanonical = false, frontierOnlyMoves = false, frontierStageFirst = false, relevanceStepsCap, maxAtomicCache = 200000 } = options
    USE_NEEDED_RANKS = !!useNeededRanks
    USE_COVER_CANONICAL = !!useCoverCanonical
	if (!PRINTED_ATOMIC_CONFIG) {
		PRINTED_ATOMIC_CONFIG = true
		const cfg = {
            maxNodes,
            maxTimeMs,
            maxLocalNodes,
            maxApproachSteps,
            maxApproachStepsHigh,
            relaxAtDepth,
            approachStepsIncrement,
            avoidEmptyUnlessKing,
            enableBackjump,
            rankingStrategy,
            useNeededRanks: USE_NEEDED_RANKS,
            useCoverCanonical: USE_COVER_CANONICAL,
            frontierOnlyMoves,
            frontierStageFirst,
            relevanceStepsCap,
        }
		devLog('log', '[atomic-config]\n' + JSON.stringify(cfg, null, 2))
    }
	const state = setupStateFromDeckOrder(deckOrder)
	let nodes = 0
	let flipsDepth = 0
	let atomicTried = 0
	let atomicDead = 0
    const deadline = Date.now() + maxTimeMs
    // Cache of approaches per atomic/canonical state (by Zobrist key)
    // key -> { candidates: Array, tried: Set<index> }
    const atomicCache = new Map()

function blockedColumnsOf(s) {
    const blocked = []
    for (let i = 0; i < s.tableau.length; i += 1) {
        const col = s.tableau[i]
        let hasDown = false
        for (let k = 0; k < col.length; k += 1) { if (!col[k].faceUp) { hasDown = true; break } }
        if (hasDown) blocked.push(i)
    }
    return blocked
}

function changedColumnsFromPath(path) {
    const set = new Set()
    for (const mv of path) {
        if (mv.kind === 't2t') { set.add(mv.from); set.add(mv.to) }
        else if (mv.kind === 't2f') { set.add(mv.ci) }
        else if (mv.kind === 'stock2t') { set.add(mv.to) }
        else if (mv.kind === 'f2t') { set.add(mv.to) }
    }
    return set
}

function sigOfChangedCols(set) { return Array.from(set).sort().join(',') }

    // Compute the normalized atomic snapshot and its Zobrist key for the current state
    function computeAtomicKeyAndSnapshot(curState) {
        if (USE_COVER_CANONICAL) return computeCanonicalKeyAndSnapshot(curState)
        const snap = cloneState(curState)
        normalizeSafeToFoundationNoFlip(snap)
        const key = zobristKey(snap)
        return { key, snapshot: snap }
    }

    function pushAtomicFrame() {
		atomicTried += 1
		if (tryGreedyFinishIfReady(state)) return { solved: true }
		let localCap = maxApproachSteps
		if (flipsDepth >= relaxAtDepth) {
			const high = maxApproachStepsHigh || maxApproachSteps
			const inc = approachStepsIncrement || 0
			const extra = inc > 0 ? inc * (flipsDepth - relaxAtDepth + 1) : 0
			localCap = Math.min(high, maxApproachSteps + extra)
		}
		const { key, snapshot } = computeAtomicKeyAndSnapshot(state)
        let entry = atomicCache.get(key)
		if (!entry) {
        const budget = { maxLocalNodes, deadline, maxApproachSteps: localCap, avoidEmptyUnlessKing, relevantOnly: !!frontierOnlyMoves, relevantFirst: !!frontierStageFirst, relevanceStepsCap }
			const { candidates, nodesUsed } = findNextFlipCandidates(state, budget)
			nodes += nodesUsed
			let sorted
			if (rankingStrategy === 'blended') sorted = rankCandidatesBlended(state, candidates)
			else if (rankingStrategy === 'mostCovered') sorted = rankCandidatesByMostCovered(state, candidates)
			else sorted = rankCandidates(state, candidates)
			entry = { candidates: sorted, tried: new Set() }
            // Cap cache growth to avoid memory blow-up
            if (atomicCache.size >= maxAtomicCache) {
                // Evict approx 25% oldest entries by clearing (simple but effective)
                atomicCache.clear()
            }
            atomicCache.set(key, entry)
		}
		const allTried = entry.candidates.length === 0 || entry.tried.size >= entry.candidates.length
		if (allTried) { atomicDead += 1; return { solved: false, candidates: [], key, snapshot } }
		return { solved: false, candidates: entry.candidates, key, snapshot }
	}

    const frames = []
	if (tryGreedyFinishIfReady(state)) {
		return { solvable: true, difficulty: classifyDifficultyByNodes(0), stats: { nodes: 0, depth: 0, timeMs: 0, cutoffReason: null } }
	}
	let init = pushAtomicFrame()
	if (init.solved) return { solvable: true, difficulty: classifyDifficultyByNodes(nodes), stats: { nodes, depth: flipsDepth, timeMs: Math.max(0, Date.now() - (deadline - maxTimeMs)), cutoffReason: null } }
	frames.push({ idx: 0, key: init.key, candidates: init.candidates, snapshot: init.snapshot || cloneState(state), changedCols: new Set() })

	while (frames.length) {
		if (Date.now() > deadline) return { solvable: false, difficulty: undefined, stats: { nodes, depth: flipsDepth, timeMs: Math.max(0, Date.now() - (deadline - maxTimeMs)), cutoffReason: 'time', atomicTried, atomicDead } }
		if (nodes >= maxNodes) return { solvable: false, difficulty: undefined, stats: { nodes, depth: flipsDepth, timeMs: Math.max(0, Date.now() - (deadline - maxTimeMs)), cutoffReason: 'nodes', atomicTried, atomicDead } }
		const top = frames[frames.length - 1]
		// Skip candidates already tried globally for this atomic state
		const cacheEntry = top.key ? atomicCache.get(top.key) : undefined
		while (cacheEntry && top.idx < top.candidates.length && cacheEntry.tried.has(top.idx)) top.idx += 1
		if (top.idx >= top.candidates.length) {
            // Backjump: jump to most recent ancestor that changed any currently blocked column
            if (!enableBackjump) {
                frames.pop()
                flipsDepth = Math.max(0, flipsDepth - 1)
                if (frames.length) {
                    const snap = frames[frames.length - 1].snapshot
                    state.tableau = snap.tableau.map((col) => col.map((c) => ({ suit: c.suit, rank: c.rank, faceUp: c.faceUp })))
                    state.stock = snap.stock.map((c) => ({ suit: c.suit, rank: c.rank }))
                    state.foundations = (() => { const f = {}; for (const s of SUITS) f[s] = snap.foundations[s].map((c) => ({ suit: c.suit, rank: c.rank })); return f })()
                }
                continue
            }
            const currentBlocked = new Set(blockedColumnsOf(state))
            let jumpTo = frames.length - 2
            while (jumpTo >= 0) {
                const anc = frames[jumpTo]
                let intersects = false
                if (anc.changedCols) {
                    for (const c of currentBlocked) { if (anc.changedCols.has(c)) { intersects = true; break } }
                }
                if (intersects) break
                jumpTo -= 1
            }
            const targetIdx = jumpTo >= 0 ? jumpTo : frames.length - 2
            while (frames.length - 1 > targetIdx) { frames.pop(); flipsDepth = Math.max(0, flipsDepth - 1) }
            if (frames.length) {
                const snap = frames[frames.length - 1].snapshot
                state.tableau = snap.tableau.map((col) => col.map((c) => ({ suit: c.suit, rank: c.rank, faceUp: c.faceUp })))
                state.stock = snap.stock.map((c) => ({ suit: c.suit, rank: c.rank }))
                state.foundations = (() => { const f = {}; for (const s of SUITS) f[s] = snap.foundations[s].map((c) => ({ suit: c.suit, rank: c.rank })); return f })()
            }
            continue
        }
		const cand = top.candidates[top.idx]
		if (cacheEntry) cacheEntry.tried.add(top.idx)
		top.idx += 1
		// Rebuild from the atomic snapshot before applying this candidate path
		const base = top.snapshot
		state.tableau = base.tableau.map((col) => col.map((c) => ({ suit: c.suit, rank: c.rank, faceUp: c.faceUp })))
		state.stock = base.stock.map((c) => ({ suit: c.suit, rank: c.rank }))
		state.foundations = (() => { const f = {}; for (const s of SUITS) f[s] = base.foundations[s].map((c) => ({ suit: c.suit, rank: c.rank })); return f })()
		for (const mv of cand.path) {
			const { state: s2 } = applyMoveClone(state, mv)
			state.tableau = s2.tableau; state.stock = s2.stock; state.foundations = s2.foundations
			nodes += 1
		}
		flipsDepth += 1
		if (tryGreedyFinishIfReady(state) || isWin(state)) {
			return { solvable: true, difficulty: classifyDifficultyByNodes(nodes), stats: { nodes, depth: flipsDepth, timeMs: Math.max(0, Date.now() - (deadline - maxTimeMs)), cutoffReason: null, atomicTried, atomicDead } }
		}
		const next = pushAtomicFrame()
		if (next.solved) {
			return { solvable: true, difficulty: classifyDifficultyByNodes(nodes), stats: { nodes, depth: flipsDepth, timeMs: Math.max(0, Date.now() - (deadline - maxTimeMs)), cutoffReason: null, atomicTried, atomicDead } }
		}
		frames.push({ idx: 0, key: next.key, candidates: next.candidates, snapshot: next.snapshot || cloneState(state), changedCols: changedColumnsFromPath(cand.path) })
	}

    return { solvable: false, difficulty: undefined, stats: { nodes, depth: flipsDepth, timeMs: Math.max(0, Date.now() - (deadline - maxTimeMs)), cutoffReason: 'exhausted', atomicTried, atomicDead } }
}

// Public API
module.exports = { solveKlondikeAtomic, SUITS, getAtomicFrame, getAtomicFrameFromState, applyPath }

// Helper to compute the first atomic frame (normalized snapshot + ranked candidates) from a deck order
function getAtomicFrame(deckOrder, options = {}) {
    const state = setupStateFromDeckOrder(deckOrder)
    return getAtomicFrameFromState(state, options)
}

// Helper to compute atomic frame from an existing state snapshot
function getAtomicFrameFromState(state, options = {}) {
    const { maxLocalNodes = 20000, maxTimeMs = 1000, maxApproachSteps = 20, avoidEmptyUnlessKing = true, maxApproachStepsHigh, relaxAtDepth, strategy = 'blended' } = options
    USE_NEEDED_RANKS = !!options.useNeededRanks
    const deadline = Date.now() + (options.maxTimeMs || maxTimeMs)
    const budget = { maxLocalNodes, deadline, maxApproachSteps, avoidEmptyUnlessKing, maxApproachStepsHigh, relaxAtDepth, relevantOnly: !!options.frontierOnlyMoves, relevantFirst: !!options.frontierStageFirst, relevanceStepsCap: options.relevanceStepsCap }
    const snapshot = cloneState(state)
    normalizeSafeToFoundationNoFlip(snapshot)
    const { candidates, nodesUsed } = findNextFlipCandidates(snapshot, budget)
    let ranked
    if (strategy === 'blended') ranked = rankCandidatesBlended(snapshot, candidates)
    else if (strategy === 'mostCovered') ranked = rankCandidatesByMostCovered(snapshot, candidates)
    else ranked = rankCandidates(snapshot, candidates)
    return { snapshot, candidates: ranked, nodesUsed }
}

// Apply a sequence of moves (candidate.path) to a cloned state and return the resulting snapshot
function applyPath(state, path) {
    let cur = cloneState(state)
    for (const mv of path || []) {
        const { state: s2 } = applyMoveClone(cur, mv)
        normalizeSafeToFoundationNoFlip(s2)
        cur = s2
    }
    return cur
}



