# Expo SQLite Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `expo-sqlite`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

Date researched: 2026-06-15
Date refreshed: 2026-07-03

## Sources

- [Expo SQLite SDK 56 documentation](https://docs.expo.dev/versions/v56.0.0/sdk/sqlite/)
- [Expo Router platform-specific modules](https://docs.expo.dev/router/advanced/platform-specific-modules/)

## Version and installation

Expo SDK 56 documents `expo-sqlite` with a bundled version of `~56.0.5`.
Soli resolves `expo-sqlite@56.0.5`.
Install the SDK-compatible version through Expo:

```sh
npx expo install expo-sqlite
```

The default SQLite build is sufficient. `expo install` registers the package's config
plugin in `app.json`; no SQLCipher, FTS, libSQL, or custom build options are needed.

## Platform decision

`expo-sqlite` supports Android and iOS and persists its database across app restarts.
Its web support is marked alpha and requires WASM bundling plus cross-origin isolation
headers. This app does not need web history, so the repository is split outside the
route directory:

```text
src/storage/historyRepository.native.ts
src/storage/historyRepository.web.ts
```

Metro resolves the correct implementation for each platform.

## Opening and initializing the database

Use one lazily cached connection:

```ts
import * as SQLite from 'expo-sqlite'

const database = SQLite.openDatabaseAsync('soli-history.db')
```

Initialize with WAL mode, create the table and index with `execAsync`, and track schema
changes with `PRAGMA user_version`.

```ts
await db.execAsync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS history_entries (...);
  CREATE INDEX IF NOT EXISTS history_entries_started_at
    ON history_entries(started_at DESC, id DESC);
  PRAGMA user_version = 1;
`)
```

`execAsync` does not escape parameters. Use it only for fixed schema SQL. Use bound
parameters with `runAsync`, `getFirstAsync`, and `getAllAsync` for values.

## Bound CRUD operations

`runAsync` accepts positional arrays or named parameter objects:

```ts
await db.runAsync('DELETE FROM history_entries WHERE id = ?', entryId)
```

Query typed rows:

```ts
const rows = await db.getAllAsync<HistoryRow>(
  `SELECT * FROM history_entries
   ORDER BY started_at DESC, id DESC
   LIMIT ? OFFSET ?`,
  pageSize,
  offset
)
```

## Migration transaction

Use `withExclusiveTransactionAsync` on native for the legacy import. Queries inside the
callback must use the provided transaction object:

```ts
await db.withExclusiveTransactionAsync(async (transaction) => {
  for (const entry of entries) {
    await transaction.runAsync(
      'INSERT OR IGNORE INTO history_entries (...) VALUES (...)',
      values
    )
  }
})
```

`INSERT OR IGNORE` plus stable history IDs makes the import retry-safe. Remove the legacy
AsyncStorage key only after the transaction resolves successfully.

Expo's docs now also document prepared statements and a `db.sql` tagged-template API that
escapes parameters automatically. They are useful if query complexity grows, but the
current repository API remains simpler with `runAsync`, `getFirstAsync`, `getAllAsync`,
and the transaction object.

## Queries needed by this feature

- Newest-first page: `ORDER BY started_at DESC, id DESC LIMIT ? OFFSET ?`.
- Summary: one query with `COUNT(*)` and conditional `SUM(CASE WHEN ...)`.
- Solvable shuffle stats: store and `GROUP BY solvable_base_id` for Draw 1 rows. Runtime
  shuffle IDs contain a unique suffix and must not be grouped directly.
- Active lookup: query by ID or active status when needed.
- Clear: `DELETE FROM history_entries`.

## Serialization

Keep searchable and aggregate fields in columns. Store only the nested preview in
`preview_json`. Parse and sanitize it at the repository boundary before exposing an
entry to React state.

SQLite booleans are stored as integer `0` or `1`. Nullable values are bound as `null`.

## Scope guardrails

- No ORM.
- No reactive database listener.
- No full-history React cache.
- No web SQLite configuration.
- No replacement of unrelated AsyncStorage settings or current-game persistence.

## Refresh check (2026-07-03)

- Status: current for SDK 56 and the unbounded history repository.
- Source check: Expo SDK 56 still recommends `expo-sqlite@~56.0.5`; no version update is
  needed inside this documentation-only batch.
- Best-practice note: continue to keep schema SQL fixed when using `execAsync`, bind every
  runtime value, and consider prepared statements only when repeated query execution or
  user-input-heavy SQL makes it worthwhile.
