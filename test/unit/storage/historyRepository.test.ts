// Contract tests for the native history repository against a stub SQLite database
// (the expo-sqlite Jest mock is just `openDatabaseAsync`). We assert the SQL/params
// the repository issues, not a real SQL engine — schema drift here is what device
// smoke tests would otherwise catch late.
import {
  getSolvableDealsForDrawCount,
  isExactDealSolvableForDrawCount,
} from '../../../src/data/solvableDealsV2'
import type { HistoryEntry } from '../../../src/state/history'

type FakeDatabase = {
  execAsync: jest.Mock
  getFirstAsync: jest.Mock
  getAllAsync: jest.Mock
  runAsync: jest.Mock
  withExclusiveTransactionAsync: jest.Mock
  closeAsync: jest.Mock
}

const createFakeDatabase = (initialUserVersion = 0) => {
  const execCalls: string[] = []
  const runCalls: Array<{ sql: string; params: unknown[] }> = []
  let userVersion = initialUserVersion
  let allRows: unknown[] = []
  let moveLogRow: {
    moves_json: string | null
    move_log_version: number | null
  } | null = null

  const database: FakeDatabase = {
    execAsync: jest.fn(async (sql: string) => {
      execCalls.push(sql)
      const match = sql.match(/PRAGMA user_version = (\d+)/)
      if (match) {
        userVersion = Number(match[1])
      }
    }),
    getFirstAsync: jest.fn(async (sql: string) => {
      if (sql.includes('PRAGMA user_version')) {
        return { user_version: userVersion }
      }
      if (sql.includes('moves_json')) {
        return moveLogRow
      }
      return null
    }),
    getAllAsync: jest.fn(async () => allRows),
    runAsync: jest.fn(async (sql: string, params: unknown[] = []) => {
      runCalls.push({ sql, params })
    }),
    withExclusiveTransactionAsync: jest.fn(
      async (work: (transaction: FakeDatabase) => Promise<void>) => {
        await work(database)
      }
    ),
    closeAsync: jest.fn(),
  }

  return {
    database,
    execCalls,
    runCalls,
    getUserVersion: () => userVersion,
    setMoveLogRow: (
      row: {
        moves_json: string | null
        move_log_version: number | null
      } | null
    ) => {
      moveLogRow = row
    },
    setAllRows: (rows: unknown[]) => {
      allRows = rows
    },
  }
}

const sampleEntry = (overrides: Partial<HistoryEntry> = {}): HistoryEntry => ({
  id: 'hist_test_1',
  exactId: 'E1_0',
  deckChecksum: 'D1_TEST',
  displayName: 'Game TEST',
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
  standardScore: 65,
  vegasScore: -37,
  ...overrides,
})

type Repository = typeof import('../../../src/storage/historyRepository')

const loadRepository = (fake: ReturnType<typeof createFakeDatabase>): Repository => {
  let repository: Repository
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqlite = require('expo-sqlite') as { openDatabaseAsync: jest.Mock }
    sqlite.openDatabaseAsync.mockResolvedValue(fake.database)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    repository = require('../../../src/storage/historyRepository') as Repository
  })
  return repository!
}

describe('historyRepository (v1 baseline schema + migration scaffold)', () => {
  it('creates the frozen v1 baseline with CHECK constraints and no solved column', async () => {
    const fake = createFakeDatabase()
    const repository = loadRepository(fake)

    await repository.initializeHistoryRepository()

    const schemaSql = fake.execCalls.find((sql) => sql.includes('CREATE TABLE'))
    expect(schemaSql).toBeDefined()
    expect(schemaSql).toContain('moves_json TEXT')
    expect(schemaSql).toContain('move_log_version INTEGER')
    // 1.0 freeze fixes: moves → move_count rename, solved column dropped,
    // invariants enforced in the DDL, unused exact_id index removed.
    expect(schemaSql).toContain('move_count INTEGER')
    expect(schemaSql).not.toMatch(/\bmoves INTEGER\b/)
    expect(schemaSql).not.toContain('solved INTEGER')
    expect(schemaSql).toContain("CHECK (status IN ('active', 'incomplete', 'solved'))")
    expect(schemaSql).toContain('CHECK (draw_count BETWEEN 1 AND 5)')
    expect(schemaSql).not.toContain('history_entries_exact_id')
    // Final hardening round: STRICT typing, JSON validity, paired move-log nulls.
    expect(schemaSql).toContain(') STRICT;')
    expect(schemaSql).toContain('CHECK (json_valid(preview_json))')
    expect(schemaSql).toContain('CHECK (moves_json IS NULL OR json_valid(moves_json))')
    expect(schemaSql).toContain(
      'CHECK ((moves_json IS NULL) = (move_log_version IS NULL))'
    )
    // The v1 baseline must stay frozen: scoring columns arrive via the v2 ALTER step.
    expect(schemaSql).not.toContain('standard_score')
    expect(fake.getUserVersion()).toBe(2)
  })

  it('migrates a v1 database to v2 by adding the two nullable score columns only', async () => {
    const fake = createFakeDatabase(1)
    const repository = loadRepository(fake)

    await repository.initializeHistoryRepository()

    expect(fake.execCalls.find((sql) => sql.includes('CREATE TABLE'))).toBeUndefined()
    const alter = fake.execCalls.find((sql) => sql.includes('ALTER TABLE'))
    expect(alter).toBeDefined()
    expect(alter).toContain('ADD COLUMN standard_score INTEGER')
    expect(alter).toContain('ADD COLUMN vegas_score INTEGER')
    expect(alter).not.toContain('scoring_mode')
    expect(alter).not.toMatch(/DROP|DELETE/)
    expect(fake.getUserVersion()).toBe(2)
  })

  it('leaves an up-to-date database untouched', async () => {
    const fake = createFakeDatabase(2)
    const repository = loadRepository(fake)

    await repository.initializeHistoryRepository()

    expect(fake.execCalls.find((sql) => sql.includes('CREATE TABLE'))).toBeUndefined()
    expect(fake.execCalls.find((sql) => sql.includes('ALTER TABLE'))).toBeUndefined()
    expect(fake.getUserVersion()).toBe(2)
  })

  it('refuses to open a database written by a newer app version', async () => {
    const fake = createFakeDatabase(3)
    const repository = loadRepository(fake)

    await expect(repository.initializeHistoryRepository()).rejects.toThrow(
      'Unsupported history database version: 3'
    )
    expect(fake.database.closeAsync).toHaveBeenCalled()
  })

  it('writes both score tallies on insert and update, and reads NULLs back as null', async () => {
    const fake = createFakeDatabase()
    const repository = loadRepository(fake)

    await repository.insertHistoryEntry(sampleEntry())
    const insert = fake.runCalls.find(({ sql }) => sql.includes('INSERT INTO'))!
    expect(insert.sql).toContain('standard_score')
    expect(insert.sql).toContain('vegas_score')
    // … status, standard_score, vegas_score, moves_json, move_log_version.
    expect(insert.params.slice(-4, -2)).toEqual([65, -37])

    fake.runCalls.length = 0
    await repository.updateHistoryEntry(
      sampleEntry({ standardScore: null, vegasScore: null })
    )
    const update = fake.runCalls.find(({ sql }) => sql.includes('UPDATE'))!
    expect(update.sql).toContain('standard_score = ?')
    expect(update.params.slice(-3)).toEqual([null, null, 'hist_test_1'])

    // Rows written before v2 come back with NULL scores → null on the entry.
    fake.setAllRows([
      {
        id: 'hist_old',
        exact_id: 'E1_0',
        deck_checksum: 'D1_TEST',
        display_name: 'Old',
        started_at: '2026-07-06T10:00:00.000Z',
        finished_at: null,
        draw_count: 1,
        move_count: 12,
        duration_ms: 1000,
        preview_json: '{}',
        status: 'incomplete',
        standard_score: null,
        vegas_score: null,
      },
    ])
    const [entry] = await repository.getHistoryPage(50, 0)
    expect(entry.standardScore).toBeNull()
    expect(entry.vegasScore).toBeNull()
    const select = fake.database.getAllAsync.mock.calls.at(-1)![0] as string
    expect(select).toContain('standard_score')
  })

  it('writes moves_json and move_log_version on insert when a move log is provided', async () => {
    const fake = createFakeDatabase()
    const repository = loadRepository(fake)
    const moveLog = { version: 1, entries: [{ k: 'draw' as const }] }

    await repository.insertHistoryEntry(sampleEntry(), moveLog)

    const insert = fake.runCalls.find(({ sql }) => sql.includes('INSERT INTO'))
    expect(insert).toBeDefined()
    expect(insert!.sql).toContain('moves_json')
    expect(insert!.sql).toContain('move_log_version')
    expect(insert!.params.slice(-2)).toEqual([JSON.stringify(moveLog.entries), 1])
  })

  it('updates with the move log columns only when a moveLog argument is given', async () => {
    const fake = createFakeDatabase()
    const repository = loadRepository(fake)

    // No moveLog argument: the stored log must stay untouched.
    await repository.updateHistoryEntry(sampleEntry())
    const plainUpdate = fake.runCalls.find(({ sql }) => sql.includes('UPDATE'))
    expect(plainUpdate).toBeDefined()
    expect(plainUpdate!.sql).not.toContain('moves_json')

    fake.runCalls.length = 0
    const moveLog = { version: 1, entries: [{ k: 'draw' as const }] }
    await repository.updateHistoryEntry(
      sampleEntry({ solved: true, status: 'solved' }),
      moveLog
    )
    const logUpdate = fake.runCalls.find(({ sql }) => sql.includes('UPDATE'))
    expect(logUpdate).toBeDefined()
    expect(logUpdate!.sql).toContain('moves_json = ?')
    expect(logUpdate!.sql).toContain('move_log_version = ?')
    // Params: 10 entry columns, moves_json, move_log_version, id.
    expect(logUpdate!.params.slice(-3)).toEqual([
      JSON.stringify(moveLog.entries),
      1,
      'hist_test_1',
    ])
  })

  it('round-trips a stored move log through getHistoryEntryMoveLog', async () => {
    const fake = createFakeDatabase()
    const repository = loadRepository(fake)
    const entries = [
      { k: 'draw' },
      {
        k: 'move',
        sel: { source: 'waste' },
        tgt: { type: 'tableau', columnIndex: 2 },
      },
    ]
    fake.setMoveLogRow({
      moves_json: JSON.stringify(entries),
      move_log_version: 1,
    })

    const result = await repository.getHistoryEntryMoveLog('hist_test_1')
    expect(result).toEqual({ moveLogVersion: 1, moveLog: entries })

    fake.setMoveLogRow({ moves_json: null, move_log_version: null })
    expect(await repository.getHistoryEntryMoveLog('hist_test_1')).toBeNull()

    fake.setMoveLogRow({ moves_json: 'not-json', move_log_version: 1 })
    expect(await repository.getHistoryEntryMoveLog('hist_test_1')).toBeNull()
  })

  it('returns null for structurally invalid move-log entries instead of a blind cast (R4)', async () => {
    const fake = createFakeDatabase()
    const repository = loadRepository(fake)

    // Unknown entry kind.
    fake.setMoveLogRow({
      moves_json: JSON.stringify([{ k: 'teleport' }]),
      move_log_version: 1,
    })
    expect(await repository.getHistoryEntryMoveLog('hist_test_1')).toBeNull()

    // Known kind with a missing required field.
    fake.setMoveLogRow({
      moves_json: JSON.stringify([{ k: 'draw' }, { k: 'scrub' }]),
      move_log_version: 1,
    })
    expect(await repository.getHistoryEntryMoveLog('hist_test_1')).toBeNull()

    // Move entry with a malformed selection.
    fake.setMoveLogRow({
      moves_json: JSON.stringify([
        {
          k: 'move',
          sel: { source: 'teleporter' },
          tgt: { type: 'tableau', columnIndex: 1 },
        },
      ]),
      move_log_version: 1,
    })
    expect(await repository.getHistoryEntryMoveLog('hist_test_1')).toBeNull()

    // Valid entries of every kind still round-trip.
    const valid = [
      { k: 'draw' },
      { k: 'draw', rh: false },
      {
        k: 'move',
        sel: { source: 'waste' },
        tgt: { type: 'foundation', suit: 'hearts' },
      },
      { k: 'undo' },
      { k: 'scrub', i: 2 },
      { k: 'adv' },
      { k: 'autoUp', on: false },
    ]
    fake.setMoveLogRow({ moves_json: JSON.stringify(valid), move_log_version: 1 })
    expect(await repository.getHistoryEntryMoveLog('hist_test_1')).toEqual({
      moveLogVersion: 1,
      moveLog: valid,
    })
  })

  it('keeps moves_json out of the page query (pages stay light)', async () => {
    const fake = createFakeDatabase()
    const repository = loadRepository(fake)

    await repository.getHistoryPage(50, 0)

    const pageQuery = (fake.database.getAllAsync.mock.calls[0] as [string])[0]
    expect(pageQuery).toContain('FROM history_entries')
    expect(pageQuery).not.toContain('moves_json')
  })

  // Negative constraint tests run the EXACT baseline DDL the repository executes
  // (captured from the stub) inside a real SQLite engine (Node's built-in
  // node:sqlite), so the STRICT/CHECK clauses are proven to reject bad writes —
  // not just to be present as strings.
  describe('baseline DDL rejects bad writes (real SQLite via node:sqlite)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DatabaseSync } = require('node:sqlite') as {
      DatabaseSync: new (path: string) => {
        exec: (sql: string) => void
        prepare: (sql: string) => { run: (...params: unknown[]) => unknown }
        close: () => void
      }
    }

    const validRow = {
      id: 'row_1',
      exact_id: 'E1_0',
      deck_checksum: 'D1',
      display_name: 'Game TEST',
      started_at: '2026-07-07T10:00:00.000Z',
      finished_at: null,
      draw_count: 1,
      move_count: 5,
      duration_ms: 1_000,
      preview_json: '{}',
      status: 'incomplete',
      moves_json: '[]',
      move_log_version: 1,
    }

    const withBaselineDb = async (
      work: (
        insert: (overrides?: Partial<Record<keyof typeof validRow, unknown>>) => void
      ) => void
    ) => {
      const fake = createFakeDatabase()
      const repository = loadRepository(fake)
      await repository.initializeHistoryRepository()
      const schemaSql = fake.execCalls.find((sql) => sql.includes('CREATE TABLE'))!

      const db = new DatabaseSync(':memory:')
      try {
        db.exec(schemaSql)
        const columns = Object.keys(validRow)
        const statement = db.prepare(
          `INSERT INTO history_entries (${columns.join(', ')})
           VALUES (${columns.map(() => '?').join(', ')})`
        )
        work((overrides = {}) => {
          const row = { ...validRow, id: `row_${Math.random()}`, ...overrides }
          statement.run(...Object.values(row))
        })
      } finally {
        db.close()
      }
    }

    it('accepts a valid row (sanity)', async () => {
      await withBaselineDb((insert) => {
        expect(() => insert()).not.toThrow()
        expect(() => insert({ moves_json: null, move_log_version: null })).not.toThrow()
      })
    })

    it('rejects mismatched moves_json/move_log_version null pairing', async () => {
      await withBaselineDb((insert) => {
        expect(() => insert({ move_log_version: null })).toThrow(/CHECK/)
        expect(() => insert({ moves_json: null })).toThrow(/CHECK/)
      })
    })

    it('rejects invalid JSON in preview_json and moves_json', async () => {
      await withBaselineDb((insert) => {
        expect(() => insert({ preview_json: 'not-json' })).toThrow(/CHECK/)
        expect(() => insert({ moves_json: 'not-json' })).toThrow(/CHECK/)
      })
    })

    it('rejects STRICT type violations and out-of-range values', async () => {
      await withBaselineDb((insert) => {
        expect(() => insert({ draw_count: 'three' })).toThrow(/cannot store TEXT value/)
        expect(() => insert({ draw_count: 7 })).toThrow(/CHECK/)
        expect(() => insert({ status: 'won' })).toThrow(/CHECK/)
        expect(() => insert({ move_count: -1 })).toThrow(/CHECK/)
      })
    })

    // Scoring v2 migration on a REAL v1 database: the existing row survives with NULL
    // scores, new rows accept both tallies, and the ADD COLUMN CHECK holds.
    it('upgrades a populated v1 database to v2 without touching existing rows', async () => {
      const baseline = createFakeDatabase()
      await loadRepository(baseline).initializeHistoryRepository()
      const baselineSql = baseline.execCalls.find((sql) => sql.includes('CREATE TABLE'))!
      const upgrade = createFakeDatabase(1)
      await loadRepository(upgrade).initializeHistoryRepository()
      const alterSql = upgrade.execCalls.find((sql) => sql.includes('ALTER TABLE'))!

      const db = new DatabaseSync(':memory:')
      try {
        db.exec(baselineSql)
        const columns = Object.keys(validRow)
        db.prepare(
          `INSERT INTO history_entries (${columns.join(', ')})
           VALUES (${columns.map(() => '?').join(', ')})`
        ).run(...Object.values(validRow))

        db.exec(alterSql)

        const query = db as unknown as {
          prepare: (sql: string) => { get: (...params: unknown[]) => unknown }
        }
        expect(
          query.prepare('SELECT standard_score, vegas_score FROM history_entries').get()
        ).toEqual({ standard_score: null, vegas_score: null })

        const insertScored = db.prepare(
          `INSERT INTO history_entries (${columns.join(', ')}, standard_score, vegas_score)
           VALUES (${columns.map(() => '?').join(', ')}, ?, ?)`
        )
        expect(() =>
          insertScored.run(...Object.values({ ...validRow, id: 'row_2' }), 685, 208)
        ).not.toThrow()
        expect(() =>
          insertScored.run(...Object.values({ ...validRow, id: 'row_3' }), -5, -52)
        ).toThrow(/CHECK/)
      } finally {
        db.close()
      }
    })

    // Cumulative Vegas total (scoring plan P2-C): the summary's vegas_total sums
    // vegas_score over FINISHED rows only — NULL rows (not a Vegas game) and the
    // active row contribute nothing. Run the exact summary SQL in real SQLite.
    it('sums vegas_score over finished rows in the summary query', async () => {
      const fake = createFakeDatabase()
      const repository = loadRepository(fake)
      await repository.initializeHistoryRepository()
      const baselineSql = fake.execCalls.find((sql) => sql.includes('CREATE TABLE'))!
      const alterSql = fake.execCalls.find((sql) => sql.includes('ALTER TABLE'))!
      expect(await repository.getHistorySummary()).toMatchObject({ vegasTotal: 0 })
      const summarySql = (
        fake.database.getFirstAsync.mock.calls.find(([sql]: [string]) =>
          sql.includes('vegas_total')
        ) as [string]
      )[0]

      const db = new DatabaseSync(':memory:')
      try {
        db.exec(baselineSql)
        db.exec(alterSql)
        const columns = Object.keys(validRow)
        const insert = db.prepare(
          `INSERT INTO history_entries (${columns.join(', ')}, vegas_score)
           VALUES (${columns.map(() => '?').join(', ')}, ?)`
        )
        const row = (id: string, status: string, vegasScore: number | null) =>
          insert.run(...Object.values({ ...validRow, id, status }), vegasScore)
        row('abandoned', 'incomplete', -47)
        row('zero_move', 'incomplete', -52)
        row('won', 'solved', 208)
        row('standard_game', 'incomplete', null)
        // An active row never carries a score in practice; prove the filter anyway.
        row('live', 'active', 999)

        const summary = (
          db as unknown as {
            prepare: (sql: string) => { get: () => Record<string, number> }
          }
        )
          .prepare(summarySql)
          .get()
        expect(summary.vegas_total).toBe(-47 - 52 + 208)
        expect(summary.total_count).toBe(5)
        expect(summary.active_count).toBe(1)
      } finally {
        db.close()
      }
    })
  })

  it('aggregates solvable-deal stats in SQL and merges draw-count groups per deal', async () => {
    const fake = createFakeDatabase()
    const repository = loadRepository(fake)
    // Real catalog IDs so isExactDealSolvableForDrawCount keeps the rows. Pick a
    // deal that is NOT solvable for every draw count so the filter case is real.
    const deal = getSolvableDealsForDrawCount(1).find(
      (candidate) => candidate.drawMask !== 0b11111
    )
    expect(deal).toBeDefined()
    const solvableExactId = deal!.exactId
    const unsolvableDrawCount = ([1, 2, 3, 4, 5] as const).find(
      (drawCount) => !isExactDealSolvableForDrawCount(solvableExactId, drawCount)
    )
    fake.setAllRows([
      { exact_id: solvableExactId, draw_count: 1, plays: 3, solves: 1 },
      // Off-catalog draw count for the same deal must be filtered out.
      { exact_id: solvableExactId, draw_count: unsolvableDrawCount, plays: 2, solves: 2 },
      // Unknown deal must be filtered out entirely.
      { exact_id: 'E_NOT_IN_CATALOG', draw_count: 1, plays: 5, solves: 5 },
    ])

    const stats = await repository.getSolvableDealHistoryStats()

    const statsQuery = (fake.database.getAllAsync.mock.calls[0] as [string])[0]
    expect(statsQuery).toContain('GROUP BY exact_id, draw_count')
    expect(statsQuery).toContain('COUNT(*)')
    // 1.0 freeze fix: exact_id is NOT NULL, the old filter was dead code.
    expect(statsQuery).not.toContain('exact_id IS NOT NULL')
    expect(stats).toEqual([{ exactId: solvableExactId, plays: 3, solves: 1 }])
  })
})
