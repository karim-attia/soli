'use strict'

/*
  Harvest solvable layouts using the new from-scratch solver.

  CLI:
    node scripts/harvest-solvable-new.js --trial --maxSolved 3 --beamWidth 500 --maxNodes 200000 --maxDepth 400
    node scripts/harvest-solvable-new.js --maxSolved 100 --beamWidth 4000 --maxNodes 1500000 --maxDepth 600
*/

const { solveDeal, extractInitialTableauConfig } = require('./klondike-solver-new')
const {
  loadDataset,
  saveDataset,
  tableauSignature,
  determineNextHarvestIndex,
  makeShuffleIdFactory,
} = require('./solvable-dataset')

function parseArgs(argv) {
  const args = new Map()
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i]
    if (!a.startsWith('--')) continue
    if (a.includes('=')) {
      const [k, v] = a.slice(2).split('=')
      args.set(k, v)
    } else {
      const k = a.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        args.set(k, next)
        i += 1
      } else {
        args.set(k, 'true')
      }
    }
  }
  return args
}



async function main() {
  const args = parseArgs(process.argv)
  const trial = args.get('trial') === 'true'
  const maxSolved = Number(args.get('maxSolved') || (trial ? 3 : 100))
  const beamWidth = Number(args.get('beamWidth') || (trial ? 500 : 4000))
  const maxNodes = Number(args.get('maxNodes') || (trial ? 200000 : 1500000))
  const maxDepth = Number(args.get('maxDepth') || (trial ? 400 : 600))

  const shuffles = loadDataset()
  const seen = new Set(shuffles.map((s) => tableauSignature(s.tableau)))
  const nextShuffleId = makeShuffleIdFactory(determineNextHarvestIndex(shuffles))

  let found = 0
  let attempts = 0
  const startedAt = Date.now()

  while (found < maxSolved) {
    attempts += 1
    const seed = Date.now() ^ (attempts * 2654435761)
    const { solved, nodes, initial } = solveDeal({
      seed,
      config: { beamWidth, maxNodes, maxDepth },
    })

    if (!solved) {
      if (attempts % 50 === 0) {
        console.log(`[trial=${trial}] attempts=${attempts}, found=${found}, lastNodes=${nodes}`)
      }
      continue
    }

    // Extract and dedupe by initial tableau
    let tableau
    try {
      tableau = extractInitialTableauConfig(initial)
    } catch (e) {
      console.warn('Extraction failed, skipping:', e.message)
      continue
    }
    const sig = tableauSignature(tableau)
    if (seen.has(sig)) {
      continue
    }

    const id = nextShuffleId()
    shuffles.push({ id, addedAt: new Date().toISOString().slice(0, 10), source: 'new-solver', tableau })
    seen.add(sig)
    found += 1
    if (found % 5 === 0 || trial) {
      console.log(`[harvest] found=${found}/${maxSolved} attempts=${attempts} nodes=${nodes} id=${id}`)
    }
    if (trial) {
      // Persist incrementally for trial
      saveDataset(shuffles)
    }
  }

  saveDataset(shuffles)
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1)
  console.log(`[done] found=${found} attempts=${attempts} elapsed=${elapsed}s beam=${beamWidth} nodes=${maxNodes}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})


