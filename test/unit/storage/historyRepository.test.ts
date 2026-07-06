// Contract tests for the native history repository against a stub SQLite database
// (the expo-sqlite Jest mock is just `openDatabaseAsync`). We assert the SQL/params
// the repository issues, not a real SQL engine — schema drift here is what device
// smoke tests would otherwise catch late.
import type { HistoryEntry } from '../../../src/state/history'

type FakeDatabase = {
  execAsync: jest.Mock
  getFirstAsync: jest.Mock
  getAllAsync: jest.Mock
  runAsync: jest.Mock
  withExclusiveTransactionAsync: jest.Mock
  closeAsync: jest.Mock
}

const createFakeDatabase = () => {
  const execCalls: string[] = []
  const runCalls: Array<{ sql: string; params: unknown[] }> = []
  let userVersion = 0
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
    getAllAsync: jest.fn(async () => []),
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
  ...overrides,
})

type Repository = typeof import('../../../src/storage/historyRepository.native')

const loadRepository = (fake: ReturnType<typeof createFakeDatabase>): Repository => {
  let repository: Repository
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sqlite = require('expo-sqlite') as { openDatabaseAsync: jest.Mock }
    sqlite.openDatabaseAsync.mockResolvedValue(fake.database)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    repository = require('../../../src/storage/historyRepository.native') as Repository
  })
  return repository!
}

describe('historyRepository.native (fresh v1 schema with move log columns)', () => {
  it('creates the base table with moves_json and move_log_version (no migration path)', async () => {
    const fake = createFakeDatabase()
    const repository = loadRepository(fake)

    await repository.initializeHistoryRepository()

    const schemaSql = fake.execCalls.find((sql) => sql.includes('CREATE TABLE'))
    expect(schemaSql).toBeDefined()
    expect(schemaSql).toContain('moves_json TEXT')
    expect(schemaSql).toContain('move_log_version INTEGER')
    expect(fake.getUserVersion()).toBe(1)
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
    // Params: 11 entry columns, moves_json, move_log_version, id.
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

  it('keeps moves_json out of the page query (pages stay light)', async () => {
    const fake = createFakeDatabase()
    const repository = loadRepository(fake)

    await repository.getHistoryPage(50, 0)

    const pageQuery = (fake.database.getAllAsync.mock.calls[0] as [string])[0]
    expect(pageQuery).toContain('FROM history_entries')
    expect(pageQuery).not.toContain('moves_json')
  })
})
