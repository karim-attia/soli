// History seeding tests (agent-testing-skill plan, Workstream B).
//
// Two layers:
// 1. Pure catalog invariants on createHistorySeedEntries.
// 2. Seed/clear roundtrips through the REAL repository SQL against a real SQLite
//    engine (node:sqlite, same precedent as historyRepository.test.ts's DDL
//    tests) — the additive/reversible guarantees ("never touch real rows") are
//    exactly what a stubbed database could not prove.
import { isExactDealSolvableForDrawCount } from '../../../src/data/solvableDealsV2'
import type { HistoryEntry } from '../../../src/state/history'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { DatabaseSync } = require('node:sqlite') as {
  DatabaseSync: new (path: string) => {
    exec: (sql: string) => void
    prepare: (sql: string) => {
      get: (...params: unknown[]) => unknown
      all: (...params: unknown[]) => unknown[]
      run: (...params: unknown[]) => unknown
    }
    close: () => void
  }
}

type Repository = typeof import('../../../src/storage/historyRepository.native')
type Seeds = typeof import('../../../src/storage/historySeeds')
type DevLogger = typeof import('../../../src/utils/devLogger')

// Adapts node:sqlite's synchronous API to the expo-sqlite surface the repository
// uses, so repository + seeds run their real SQL unmodified.
const loadModulesWithRealDatabase = () => {
  const db = new DatabaseSync(':memory:')
  const adapter = {
    execAsync: async (sql: string) => {
      db.exec(sql)
    },
    getFirstAsync: async (sql: string, params: unknown[] = []) =>
      db.prepare(sql).get(...params) ?? null,
    getAllAsync: async (sql: string, params: unknown[] = []) =>
      db.prepare(sql).all(...params),
    runAsync: async (sql: string, params: unknown[] = []) => {
      db.prepare(sql).run(...params)
    },
    withExclusiveTransactionAsync: async (
      work: (transaction: unknown) => Promise<void>
    ) => {
      await work(adapter)
    },
    closeAsync: async () => {
      db.close()
    },
  }

  let repository!: Repository
  let seeds!: Seeds
  let devLogger!: DevLogger
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqlite = require('expo-sqlite') as { openDatabaseAsync: jest.Mock }
    sqlite.openDatabaseAsync.mockResolvedValue(adapter)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    repository = require('../../../src/storage/historyRepository.native') as Repository
    // Resolves to historyRepository.native via the jest-expo haste platform, so
    // the seeds module writes through the same repository instance.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    seeds = require('../../../src/storage/historySeeds') as Seeds
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    devLogger = require('../../../src/utils/devLogger') as DevLogger
  })

  const selectRows = () =>
    db.prepare('SELECT * FROM history_entries ORDER BY id').all() as Array<
      Record<string, unknown>
    >

  return { db, repository, seeds, devLogger, selectRows }
}

const realEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: 'hist_real_1',
  exactId: 'E1_7',
  deckChecksum: 'D1_REAL',
  displayName: 'Game REAL',
  startedAt: '2026-07-06T10:00:00.000Z',
  finishedAt: null,
  solved: false,
  solvable: false,
  drawCount: 1,
  solvableForDrawCount: null,
  moves: 12,
  durationMs: 34_000,
  preview: {
    tableau: [],
    wasteTop: null,
    foundations: { hearts: null, diamonds: null, clubs: null, spades: null },
    stockCount: 0,
  },
  status: 'incomplete',
  ...overrides,
})

describe('historySeeds catalog invariants', () => {
  const now = new Date('2026-07-07T12:00:00.000Z')

  // Catalog access is pure, so the plain (web-typed) import path is irrelevant —
  // load through the shared loader anyway to keep one require pattern.
  const { seeds } = loadModulesWithRealDatabase()
  const entries = seeds.createHistorySeedEntries(now)

  it('has ~8-10 entries, all seed-prefixed with unique ids and valid statuses', () => {
    expect(entries.length).toBeGreaterThanOrEqual(8)
    expect(entries.length).toBeLessThanOrEqual(10)
    entries.forEach((entry) => {
      expect(entry.id.startsWith(seeds.HISTORY_SEED_ID_PREFIX)).toBe(true)
      expect(['active', 'incomplete', 'solved']).toContain(entry.status)
    })
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length)
  })

  it('contains exactly one active entry shaped like a real active row', () => {
    const active = entries.filter((entry) => entry.status === 'active')
    expect(active).toHaveLength(1)
    expect(active[0].finishedAt).toBeNull()
    expect(active[0].durationMs).toBeNull()
  })

  it('orders dates sensibly and spreads them over hours, days and weeks', () => {
    entries.forEach((entry) => {
      const startedAt = new Date(entry.startedAt).getTime()
      expect(startedAt).toBeLessThan(now.getTime())
      if (entry.status === 'solved') {
        expect(entry.finishedAt).not.toBeNull()
        expect(new Date(entry.finishedAt!).getTime()).toBeGreaterThan(startedAt)
      } else {
        // Real writers keep finished_at null for incomplete/active rows.
        expect(entry.finishedAt).toBeNull()
      }
    })

    const agesMs = entries.map(
      (entry) => now.getTime() - new Date(entry.startedAt).getTime()
    )
    expect(Math.min(...agesMs)).toBeLessThan(24 * 3_600_000)
    expect(Math.max(...agesMs)).toBeGreaterThan(21 * 24 * 3_600_000)
  })

  it('covers draw counts 1/3/5, solvable and random deals, and a replayed exact id', () => {
    const drawCounts = new Set(entries.map((entry) => entry.drawCount))
    expect(drawCounts.has(1)).toBe(true)
    expect(drawCounts.has(3)).toBe(true)
    expect(drawCounts.has(5)).toBe(true)

    const solvedEntries = entries.filter((entry) => entry.status === 'solved')
    expect(solvedEntries.some((entry) => entry.solvable)).toBe(true)
    // The "random deal" fixture ids must stay out of the solvable catalog.
    expect(solvedEntries.some((entry) => !entry.solvable)).toBe(true)

    const idCounts = new Map<string, number>()
    entries.forEach((entry) => {
      idCounts.set(entry.exactId, (idCounts.get(entry.exactId) ?? 0) + 1)
    })
    expect(Math.max(...idCounts.values())).toBeGreaterThanOrEqual(2)
  })

  it('builds plausible previews (7 columns, sane counts, full foundations when solved)', () => {
    entries.forEach((entry) => {
      expect(entry.preview.tableau).toHaveLength(7)
      if (entry.status === 'solved') {
        Object.values(entry.preview.foundations).forEach((card) => {
          expect(card).toMatchObject({ rank: 13, faceUp: true })
        })
        expect(entry.preview.stockCount).toBe(0)
        return
      }
      // Initial-deal shape: 1..7 cards per column, only the last face up, 24 in stock.
      entry.preview.tableau.forEach((column, columnIndex) => {
        expect(column.cards).toHaveLength(columnIndex + 1)
        column.cards.forEach((card, cardIndex) => {
          expect(card.faceUp).toBe(cardIndex === columnIndex)
        })
      })
      expect(entry.preview.stockCount).toBe(24)
    })
  })

  it('derives solvable flags from the real catalog', () => {
    entries.forEach((entry) => {
      expect(entry.solvable).toBe(
        isExactDealSolvableForDrawCount(entry.exactId, entry.drawCount)
      )
      expect(entry.solved).toBe(entry.status === 'solved')
    })
  })
})

describe('historySeeds seed/clear against a real SQLite database', () => {
  it('seed + clear roundtrip is idempotent and leaves pre-existing rows untouched', async () => {
    const { repository, seeds, selectRows } = loadModulesWithRealDatabase()
    await repository.initializeHistoryRepository()
    await repository.insertHistoryEntry(realEntry())
    const realRowBefore = selectRows().find((row) => row.id === 'hist_real_1')

    await seeds.seedHistoryEntries()
    const seededRows = selectRows()
    // No real active row exists, so the active seed is included.
    expect(seededRows).toHaveLength(1 + seeds.createHistorySeedEntries().length)
    expect(
      seededRows.filter(
        (row) => row.status === 'active' && String(row.id).startsWith('seed-')
      )
    ).toHaveLength(1)

    // Re-seeding replaces seed rows in place (delete seed-% + fresh insert).
    await seeds.seedHistoryEntries()
    expect(selectRows()).toHaveLength(seededRows.length)

    await seeds.clearSeededHistoryEntries()
    const remaining = selectRows()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]).toEqual(realRowBefore)
  })

  it('skips the active seed (with a devLog) when a real active row exists, never modifying it', async () => {
    // Spy BEFORE loading: devLogger binds console.info at module evaluation, so a
    // spy installed afterwards would never see the calls.
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {})
    const { repository, seeds, devLogger, selectRows } = loadModulesWithRealDatabase()
    await repository.initializeHistoryRepository()
    await repository.insertHistoryEntry(
      realEntry({ id: 'hist_real_active', status: 'active', finishedAt: null })
    )
    const activeRowBefore = selectRows().find((row) => row.id === 'hist_real_active')

    devLogger.setDeveloperLoggingEnabled(true)
    try {
      await seeds.seedHistoryEntries()
    } finally {
      devLogger.setDeveloperLoggingEnabled(false)
    }

    const rows = selectRows()
    const activeRows = rows.filter((row) => row.status === 'active')
    expect(activeRows).toHaveLength(1)
    expect(activeRows[0]).toEqual(activeRowBefore)
    // All other seeds landed; only the active one was skipped.
    expect(rows.filter((row) => String(row.id).startsWith('seed-'))).toHaveLength(
      seeds.createHistorySeedEntries().length - 1
    )
    expect(
      infoSpy.mock.calls.some((call) =>
        call.some((arg) => typeof arg === 'string' && arg.includes('Skipped active seed'))
      )
    ).toBe(true)
    infoSpy.mockRestore()
  })

  it('feeds getSolvableDealHistoryStats with a replayed deal (plays 2, solves 1)', async () => {
    const { repository, seeds } = loadModulesWithRealDatabase()
    await repository.initializeHistoryRepository()
    await seeds.seedHistoryEntries()

    const entries = seeds.createHistorySeedEntries()
    const replayedId = entries
      .map((entry) => entry.exactId)
      .find((id, _, ids) => ids.filter((candidate) => candidate === id).length > 1)
    expect(replayedId).toBeDefined()

    const stats = await repository.getSolvableDealHistoryStats()
    const replayedStats = stats.find((stat) => stat.exactId === replayedId)
    // seed-solved-draw1-a + seed-incomplete-draw1-a-replay share this deal.
    expect(replayedStats).toMatchObject({ plays: 2, solves: 1 })
  })
})
