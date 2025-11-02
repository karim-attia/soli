// scripts/harvest-solvable.js
// Harvest solvable Klondike shuffles using the existing DFS + Atomic solvers
// - Trial mode: small sample, verbose logs
// - Full mode: search until TARGET_SOLVED entries have been appended (default 100)
// - Sources: (a) shuffles-100.json; (b) random generation fallback

/* eslint-disable no-console */

const fs = require('fs')
const path = require('path')

const { solveKlondike, setupStateFromDeckOrder, SUITS } = require('../src/solitaire/klondike_solver')
const { solveKlondikeAtomic } = require('../src/solitaire/klondike_solver_atomic')

// ---------- Constants ----------
const DEFAULT_TARGET_SOLVED = 100
const TRIAL_MAX_EVALUATIONS = 25
const TRIAL_TARGET_SOLVED = 5
// Defaults, can be overridden via CLI flags
let HIGH_MAX_NODES = 2_000_000 // override: --dfsNodes=NUMBER
let HIGH_MAX_TIME_MS = 10_000  // override: --dfsTimeMs=NUMBER
let ATOMIC_LOCAL_NODES = 200_000 // override: --atomicNodes=NUMBER
let ATOMIC_TIME_MS = 10_000 // override: --atomicTimeMs=NUMBER
let DFS_VISITED_CAP = 2_000_000 // override: --dfsVisited=NUMBER
let ATOMIC_CACHE_CAP = 200_000 // override: --atomicCache=NUMBER

const DATASET_PATH = path.join(__dirname, '..', 'src', 'data', 'solvable-shuffles.json')
const SHUFFLES_100_PATH = path.join(__dirname, 'shuffles-100.json')

// ---------- CLI args ----------
const rawArgs = process.argv.slice(2)
const args = new Set(rawArgs)
const isTrial = args.has('--trial') || args.has('-t')
const rngOnly = args.has('--rngOnly')
const targetSolved = (() => {
	const flag = rawArgs.find((a) => a.startsWith('--target='))
	if (!flag) return isTrial ? TRIAL_TARGET_SOLVED : DEFAULT_TARGET_SOLVED
	const val = Number(flag.split('=')[1])
	return Number.isFinite(val) && val > 0 ? Math.floor(val) : (isTrial ? TRIAL_TARGET_SOLVED : DEFAULT_TARGET_SOLVED)
})()

// Optional budget overrides
const intArg = (name) => {
    const flag = rawArgs.find((a) => a.startsWith(name + '='))
    if (!flag) return undefined
    const val = Number(flag.split('=')[1])
    return Number.isFinite(val) && val > 0 ? Math.floor(val) : undefined
}
HIGH_MAX_NODES = intArg('--dfsNodes') ?? HIGH_MAX_NODES
HIGH_MAX_TIME_MS = intArg('--dfsTimeMs') ?? HIGH_MAX_TIME_MS
ATOMIC_LOCAL_NODES = intArg('--atomicNodes') ?? ATOMIC_LOCAL_NODES
ATOMIC_TIME_MS = intArg('--atomicTimeMs') ?? ATOMIC_TIME_MS
DFS_VISITED_CAP = intArg('--dfsVisited') ?? DFS_VISITED_CAP
ATOMIC_CACHE_CAP = intArg('--atomicCache') ?? ATOMIC_CACHE_CAP

// ---------- Helpers ----------
function readJSON(filePath) {
	return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJSON(filePath, data) {
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8')
}

function nextSolvableId(existing) {
	let maxNum = 0
	for (const entry of existing) {
		const m = /^solvable-(\d+)$/.exec(entry.id || '')
		if (m) {
			const n = Number(m[1])
			if (Number.isFinite(n) && n > maxNum) maxNum = n
		}
	}
	const next = (maxNum + 1).toString().padStart(4, '0')
	return `solvable-${next}`
}

function tableauConfigFromDeckOrder(deckOrder) {
	const state = setupStateFromDeckOrder(deckOrder)
	return state.tableau.map((col) => {
		const down = []
		const up = []
		for (let i = 0; i < col.length; i += 1) {
			const c = col[i]
			const card = { suit: c.suit, rank: c.rank }
			if (c.faceUp) up.push(card)
			else down.push(card)
		}
		return { down, up }
	})
}

function tableauKeyFromConfig(tableau) {
    const suitCode = (s) => (s === 'clubs' ? 'c' : s === 'diamonds' ? 'd' : s === 'hearts' ? 'h' : 's')
    const cardCode = (c) => suitCode(c.suit) + c.rank.toString(10)
    // Canonical string: for each column, encode down then up; columns in order
    // Example: d:c5,h9|u:d1;d:...|u:...
    return tableau
        .map((col) => {
            const d = col.down.map(cardCode).join(',')
            const u = col.up.map(cardCode).join(',')
            return `d:${d}|u:${u}`
        })
        .join(';')
}

function solveWithBudgets(deckOrder) {
    // Evaluate both solvers so we can report per-mode results
    const atomic = solveKlondikeAtomic(deckOrder, {
        maxLocalNodes: ATOMIC_LOCAL_NODES,
        maxTimeMs: ATOMIC_TIME_MS,
        strategy: 'blended',
        maxApproachStepsHigh: 40,
        relaxAtDepth: 4,
        maxAtomicCache: ATOMIC_CACHE_CAP,
    })

    const dfs = solveKlondike(deckOrder, {
        maxNodes: HIGH_MAX_NODES,
        maxTimeMs: HIGH_MAX_TIME_MS,
        strategy: 'dfs',
        maxVisited: DFS_VISITED_CAP,
    })

    return {
        atomic: { solver: 'atomic', result: atomic },
        dfs: { solver: 'dfs', result: dfs },
        anySolvable: Boolean((atomic && atomic.solvable) || (dfs && dfs.solvable)),
        preferred: (atomic && atomic.solvable) ? 'atomic' : (dfs && dfs.solvable) ? 'dfs' : 'none',
    }
}

function fmtAttempt(label, attempt) {
    const r = attempt && attempt.result ? attempt.result : null
    if (!r) return `${label}:n/a`
    const tag = r.solvable ? '✅' : '❌'
    const stats = r.stats || {}
    const nodes = stats.nodes != null ? stats.nodes : '-'
    const time = stats.timeMs != null ? stats.timeMs : '-'
    const cutoff = stats.cutoffReason || '-'
    return `${label}:${tag}(nodes=${nodes},timeMs=${time},cutoff=${cutoff})`
}

function randomDeckOrder(rng) {
	const base = []
	for (let i = 0; i < 52; i += 1) base.push(i)
	for (let i = base.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rng() * (i + 1))
		;[base[i], base[j]] = [base[j], base[i]]
	}
	return base
}

function mulberry32(seed) {
	return function () {
		let t = (seed += 0x6D2B79F5)
		t = Math.imul(t ^ (t >>> 15), t | 1)
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296
	}
}

// ---------- Main ----------
;(async () => {
	console.log(`[harvest] Starting ${isTrial ? 'TRIAL' : 'FULL'} run…`)
    console.log('[harvest] Budgets', {
        dfsNodes: HIGH_MAX_NODES,
        dfsTimeMs: HIGH_MAX_TIME_MS,
        dfsVisitedCap: DFS_VISITED_CAP,
        atomicNodes: ATOMIC_LOCAL_NODES,
        atomicTimeMs: ATOMIC_TIME_MS,
        atomicCacheCap: ATOMIC_CACHE_CAP,
        targetSolved,
        trial: isTrial,
    })
    const dataset = readJSON(DATASET_PATH)
    const existing = new Set((dataset.shuffles || []).map((s) => s.id))
    const existingTableauKeys = new Set(
        (dataset.shuffles || []).map((s) => tableauKeyFromConfig(s.tableau)).filter(Boolean),
    )

    let shuffles = []
    if (!rngOnly && fs.existsSync(SHUFFLES_100_PATH)) {
		try {
			shuffles = readJSON(SHUFFLES_100_PATH)
			if (!Array.isArray(shuffles)) shuffles = []
		} catch (e) {
			console.warn('[harvest] Failed to read shuffles-100.json, will fall back to RNG.')
		}
	}

	const rng = mulberry32(0xACE5EED)
	let found = 0
	let evaluated = 0
	const EVAL_CAP = isTrial ? TRIAL_MAX_EVALUATIONS : Number.POSITIVE_INFINITY

    const appendEntry = (deckOrder) => {
        const tableau = tableauConfigFromDeckOrder(deckOrder)
        const key = tableauKeyFromConfig(tableau)
        if (existingTableauKeys.has(key)) {
            if (isTrial) console.log('[harvest] Duplicate tableau detected; skipping append')
            return false
        }
        const id = nextSolvableId(dataset.shuffles)
		dataset.shuffles.push({ id, addedAt: new Date().toISOString().slice(0, 10), source: 'harvested', tableau })
		existing.add(id)
        existingTableauKeys.add(key)
		writeJSON(DATASET_PATH, dataset)
		console.log(`[harvest] Added ${id} (total ${dataset.shuffles.length})`)
        return true
	}

	// Pass 1: evaluate provided shuffles-100 (if present)
	for (let i = 0; i < shuffles.length && found < targetSolved && evaluated < EVAL_CAP; i += 1) {
		const deckOrder = shuffles[i]
		if (!Array.isArray(deckOrder) || deckOrder.length !== 52) continue
		evaluated += 1
        const solved = solveWithBudgets(deckOrder)
        const atomicLine = fmtAttempt('atomic', solved.atomic)
        const dfsLine = fmtAttempt('dfs', solved.dfs)
        let appended = false
        if (solved.anySolvable) {
            const ok = appendEntry(deckOrder)
            if (ok) { found += 1; appended = true }
        }
        console.log(`[harvest] #${i + 1} ${atomicLine} | ${dfsLine} | appended=${appended ? 'yes' : 'no'} | solved=${found}/${targetSolved}`)
	}

	// Pass 2: random search until target reached or cap hit
	while (found < targetSolved && evaluated < EVAL_CAP) {
		const deckOrder = randomDeckOrder(rng)
		evaluated += 1
        const solved = solveWithBudgets(deckOrder)
        const atomicLine = fmtAttempt('atomic', solved.atomic)
        const dfsLine = fmtAttempt('dfs', solved.dfs)
        let appended = false
        if (solved.anySolvable) {
            const ok = appendEntry(deckOrder)
            if (ok) { found += 1; appended = true }
        }
        console.log(`[harvest] RNG ${atomicLine} | ${dfsLine} | appended=${appended ? 'yes' : 'no'} | solved=${found}/${targetSolved}`)
	}

	console.log(`[harvest] Completed. Evaluated=${evaluated}, Added=${found}, Target=${targetSolved}`)
	if (!isTrial && found < targetSolved) {
		console.log('[harvest] Target not reached; consider re-running to continue appending more entries.')
	}
})().catch((err) => {
	console.error('[harvest] Fatal error', err)
	process.exit(1)
})
