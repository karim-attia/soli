/* eslint-disable no-console */
const { solveKlondike } = require('../src/solitaire/klondike_solver')
const fs = require('fs')
const path = require('path')

function parseArgs() {
    const args = {}
    for (const a of process.argv.slice(2)) {
        if (!a.startsWith('--')) continue
        const [k, v] = a.slice(2).split('=')
        if (v === undefined) { args[k] = true } else {
            const num = Number(v)
            args[k] = Number.isNaN(num) ? v : num
        }
    }
    return args
}

function randomDeckOrder() {
	const arr = Array.from({ length: 52 }, (_, i) => i)
	for (let i = arr.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1))
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}

function summarize(results) {
	const total = results.length
	const solved = results.filter((r) => r.solvable).length
	const byDiff = {}
	for (const r of results) {
		const key = r.difficulty || 'unsolved'
		byDiff[key] = (byDiff[key] || 0) + 1
	}
	const avgNodes = Math.round(results.reduce((a, r) => a + r.stats.nodes, 0) / total)
	const avgTime = Math.round(results.reduce((a, r) => a + r.stats.timeMs, 0) / total)
	const timeCutoffs = results.filter((r) => r.stats.cutoffReason === 'time').length
	const nodeCutoffs = results.filter((r) => r.stats.cutoffReason === 'nodes').length
	return { total, solved, byDiff, avgNodes, avgTime, timeCutoffs, nodeCutoffs }
}

function seededDecks(count, seed) {
    function mulberry32(a) { return function () { let t = (a += 0x6D2B79F5); t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
    const rnd = mulberry32(seed >>> 0)
    const decks = []
    for (let d = 0; d < count; d += 1) {
        const arr = Array.from({ length: 52 }, (_, i) => i)
        for (let i = arr.length - 1; i > 0; i -= 1) {
            const j = Math.floor(rnd() * (i + 1))
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
        }
        decks.push(arr)
    }
    return decks
}

function loadOrGenerateShuffles(filePath, count = 100, seed = 0xC0FFEE) {
    const abs = path.resolve(filePath)
    if (fs.existsSync(abs)) {
        const data = JSON.parse(fs.readFileSync(abs, 'utf8'))
        return Array.isArray(data) ? data : []
    }
    const decks = seededDecks(count, seed)
    fs.writeFileSync(abs, JSON.stringify(decks))
    return decks
}

function runForDecks(decks, opts) {
    const results = []
    for (let t = 0; t < decks.length; t += 1) {
        const deckOrder = decks[t]
        const res = solveKlondike(deckOrder, opts)
        results.push(res)
    }
    return results
}

function writeComparisonMd(filePath, decks, resA, resB, labelA, labelB) {
    const lines = []
    lines.push('# Solver comparison')
    lines.push('')
    lines.push(`- Decks: ${decks.length}`)
    lines.push(`- ${labelA}: solved ${resA.filter(r => r.solvable).length}`)
    lines.push(`- ${labelB}: solved ${resB.filter(r => r.solvable).length}`)
    lines.push('')
    lines.push('| # | solved_A | cutoff_A | nodes_A | solved_B | cutoff_B | nodes_B | same_outcome |')
    lines.push('| :-- | :--: | :-- | --: | :--: | :-- | --: | :--: |')
    for (let i = 0; i < decks.length; i += 1) {
        const a = resA[i], b = resB[i]
        const same = (a.solvable === b.solvable) && ((a.stats.cutoffReason || '-') === (b.stats.cutoffReason || '-'))
        lines.push(`| ${i + 1} | ${a.solvable ? '✅' : '❌'} | ${a.stats.cutoffReason || '-'} | ${a.stats.nodes} | ${b.solvable ? '✅' : '❌'} | ${b.stats.cutoffReason || '-'} | ${b.stats.nodes} | ${same ? '✅' : '❌'} |`)
    }
    fs.writeFileSync(path.resolve(filePath), lines.join('\n'))
}

function writeComparisonMdAppend(filePath, decks, resA, resB, labelA, labelB, title) {
    const lines = []
    lines.push('')
    lines.push(title || `# Comparison: ${labelA} vs ${labelB}`)
    lines.push('')
    lines.push(`- Decks: ${decks.length}`)
    lines.push(`- ${labelA}: solved ${resA.filter(r => r.solvable).length}`)
    lines.push(`- ${labelB}: solved ${resB.filter(r => r.solvable).length}`)
    lines.push('')
    lines.push('| # | solved_A | cutoff_A | nodes_A | solved_B | cutoff_B | nodes_B | same_outcome |')
    lines.push('| :-- | :--: | :-- | --: | :--: | :-- | --: | :--: |')
    for (let i = 0; i < decks.length; i += 1) {
        const a = resA[i], b = resB[i]
        const same = (a.solvable === b.solvable) && ((a.stats.cutoffReason || '-') === (b.stats.cutoffReason || '-'))
        lines.push(`| ${i + 1} | ${a.solvable ? '✅' : '❌'} | ${a.stats.cutoffReason || '-'} | ${a.stats.nodes} | ${b.solvable ? '✅' : '❌'} | ${b.stats.cutoffReason || '-'} | ${b.stats.nodes} | ${same ? '✅' : '❌'} |`)
    }
    const abs = path.resolve(filePath)
    const existing = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : ''
    fs.writeFileSync(abs, existing + (existing ? '\n' : '') + lines.join('\n'))
}

function main() {
    const args = parseArgs()
    const trials = args.trials || 50
    const strategy = args.strategy || process.env.SOLVER_STRATEGY || 'atomic'
    const maxNodes = args.maxNodes || 2000000
    const maxTimeMs = args.maxTimeMs || 5000
    const avoidEmptyUnlessKing = args.avoidEmptyUnlessKing === undefined ? true : !!args.avoidEmptyUnlessKing
    const enableBackjump = args.enableBackjump !== undefined ? !!args.enableBackjump : undefined
    const maxApproachSteps = args.maxApproachSteps !== undefined ? Number(args.maxApproachSteps) : undefined
    const maxApproachStepsHigh = args.maxApproachStepsHigh !== undefined ? Number(args.maxApproachStepsHigh) : undefined
    const shufflesFile = args.shufflesFile || 'scripts/shuffles-100.json'
    const saveMd = args.saveMd || 'scripts/compare-100.md'
    const rankingStrategy = args.rankingStrategy // 'leastSteps' | 'mostCovered'
    const useNeededRanks = args.useNeededRanks !== undefined ? !!args.useNeededRanks : undefined
    const compareAtomicVariants = !!args.compareAtomicVariants

    // Print resolved run configuration (including implicit defaults)
    const resolved = {
        trials,
        strategy,
        maxNodes,
        maxTimeMs,
        avoidEmptyUnlessKing: avoidEmptyUnlessKing === undefined ? '(default)' : avoidEmptyUnlessKing,
        enableBackjump: enableBackjump === undefined ? '(default)' : enableBackjump,
        maxApproachSteps: maxApproachSteps === undefined ? '(default)' : maxApproachSteps,
        maxApproachStepsHigh: maxApproachStepsHigh === undefined ? '(default)' : maxApproachStepsHigh,
        rankingStrategy: rankingStrategy || '(default: leastSteps)',
        shufflesFile,
        saveMd,
        compare: !!args.compare,
        compareAtomicVariants,
        useNeededRanks: useNeededRanks === undefined ? '(default: false)' : useNeededRanks,
    }
    /* eslint-disable no-console */
    console.log('[run-config]\n' + JSON.stringify(resolved, null, 2))
    /* eslint-enable no-console */
    const compare = !!args.compare
    const generateShuffles = !!args.generateShuffles
    if (generateShuffles) {
        const decks = loadOrGenerateShuffles(shufflesFile, 100, 0x12345678)
        console.log(`Generated or loaded ${decks.length} shuffles at ${shufflesFile}`)
        return
    }

    if (compare) {
        const decks = loadOrGenerateShuffles(shufflesFile, 100, 0x12345678)
        const baseOpts = { maxNodes, maxTimeMs, avoidEmptyUnlessKing, enableBackjump, maxApproachSteps, maxApproachStepsHigh, useNeededRanks }
        const dfsResults = runForDecks(decks, { ...baseOpts, strategy: 'dfs' })
        const atomicResults = runForDecks(decks, { ...baseOpts, strategy: 'atomic' })
        writeComparisonMd(saveMd, decks, dfsResults, atomicResults, 'dfs', 'atomic')
        console.log(`Wrote comparison to ${saveMd}`)
        return
    }

    if (compareAtomicVariants) {
        const decks = loadOrGenerateShuffles(shufflesFile, 100, 0x12345678)
        const baseOpts = { maxNodes, maxTimeMs, avoidEmptyUnlessKing, enableBackjump, maxApproachSteps, maxApproachStepsHigh, useNeededRanks }
        const atomicLeast = runForDecks(decks, { ...baseOpts, strategy: 'atomic', rankingStrategy: 'leastSteps' })
        const atomicMost = runForDecks(decks, { ...baseOpts, strategy: 'atomic', rankingStrategy: 'mostCovered' })
        writeComparisonMdAppend(saveMd, decks, atomicLeast, atomicMost, 'atomic_leastSteps', 'atomic_mostCovered', '## Atomic strategy comparison (leastSteps vs mostCovered)')
        console.log(`Appended atomic strategy comparison to ${saveMd}`)
        return
    }

    // Load the 100 shuffles by default for consistent testing
    const decks = loadOrGenerateShuffles(shufflesFile, 100, 0x12345678)
    console.log(`Using ${decks.length} shuffles from ${shufflesFile}`)

    const results = []
    for (let t = 0; t < trials; t += 1) {
        // Cycle through the shuffles (use modulo to wrap around if trials > decks.length)
        const deckOrder = decks[t % decks.length]
        const res = solveKlondike(deckOrder, { maxNodes, maxTimeMs, strategy, avoidEmptyUnlessKing, enableBackjump, maxApproachSteps, maxApproachStepsHigh, rankingStrategy, useNeededRanks })
        const tried = res.stats.atomicTried !== undefined ? ` atomicTried=${res.stats.atomicTried}` : ''
        const dead = res.stats.atomicDead !== undefined ? ` atomicDead=${res.stats.atomicDead}` : ''
        const mark = res.solvable ? '✅' : '❌'
        console.log(`${mark} Trial ${t + 1}: nodes=${res.stats.nodes} depth=${res.stats.depth} time=${res.stats.timeMs}ms cutoff=${res.stats.cutoffReason || '-'}${tried}${dead}`)
        results.push(res)
    }
    const s = summarize(results)
    const successRate = s.total ? Math.round((s.solved / s.total) * 100) : 0
    console.log('\nSummary:')
    console.log(`  ✅ Solved: ${s.solved}/${s.total} (${successRate}%)`)
    const ordered = Object.keys(s.byDiff).sort()
    for (const k of ordered) console.log(`  ${k}: ${s.byDiff[k]}`)
    console.log(`  Avg nodes: ${s.avgNodes}`)
    console.log(`  Avg time: ${s.avgTime}ms`)
    console.log(`  Cutoffs: time=${s.timeCutoffs}, nodes=${s.nodeCutoffs}`)
}

main()
