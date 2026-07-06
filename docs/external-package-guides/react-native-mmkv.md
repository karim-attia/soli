# React Native MMKV Guide

Last refreshed: 2026-07-05

## Scope

- Package/tool: `react-native-mmkv` (+ required peer `react-native-nitro-modules`)
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.
Status: researched for the AsyncStorage → MMKV evaluation
(`docs/product/mmkv-migration/asyncstorage-to-mmkv-evaluation.md`). Not yet installed in Soli.

## Source-backed notes

Date researched: 2026-07-05

## Sources

- [react-native-mmkv README (V4)](https://github.com/mrousavy/react-native-mmkv)
- [V4 upgrade guide (Nitro rewrite)](https://github.com/mrousavy/react-native-mmkv/blob/main/docs/V4_UPGRADE_GUIDE.md)
- [Migrate from AsyncStorage](https://github.com/mrousavy/react-native-mmkv/blob/main/docs/MIGRATE_FROM_ASYNC_STORAGE.md)
- [npm: react-native-mmkv](https://www.npmjs.com/package/react-native-mmkv)
- [Tencent/MMKV core](https://github.com/Tencent/MMKV)

## Version and compatibility (as of 2026-07-05)

- Current release: **v4.3.2** (published 2026-06-22). V4 is a full rewrite as a
  [Nitro Module](https://nitro.margelo.com).
- Requires the peer dependency **`react-native-nitro-modules`** (a second native package;
  Soli does not use Nitro yet, so adopting MMKV pulls in both).
- Requires **react-native 0.76+** (Soli is on RN 0.86 / Expo SDK 57 — compatible;
  v4.3.2 explicitly added support for RN 0.87).
- Works with both New and Old Architecture via Nitro. Soli (Expo SDK 57) runs the
  New Architecture, so no concern here.
- **Expo**: works with dev builds / `expo prebuild` (`npx expo install react-native-mmkv
  react-native-nitro-modules`, then prebuild). **Not** supported in Expo Go. Soli builds
  with `expo run:ios` / prebuild scripts, so this is fine.
- Native core is consumed via CocoaPods (`MMKVCore`) on iOS and Gradle Prefabs on Android.
- Web support exists (LocalStorage-backed, in-memory fallback) — irrelevant for Soli
  but means the web bundle would not break.
- JSI-based synchronous calls mean remote JS debugging (Chrome) is impossible; use
  React DevTools (Soli already does).

## Installation

```sh
npx expo install react-native-mmkv react-native-nitro-modules
npx expo prebuild   # or yarn prebuild:android / yarn prebuild:ios
```

## Core API summary

Everything is **synchronous** — no promises, no await.

```ts
import { createMMKV } from 'react-native-mmkv'

// Re-use one exported instance app-wide.
export const storage = createMMKV() // default instance id 'mmkv.default'

// Write (string | number | boolean | ArrayBuffer)
storage.set('user.name', 'Marc')
storage.set('user.age', 21)

// Read (typed getters; return undefined when absent)
const name = storage.getString('user.name')
const age = storage.getNumber('user.age')
const flag = storage.getBoolean('some.flag')

// Objects: JSON round-trip, same as AsyncStorage
storage.set('settings', JSON.stringify(settings))
const parsed = JSON.parse(storage.getString('settings') ?? '{}')

// Keys
storage.contains('user.name')
storage.getAllKeys()
storage.remove('user.name')
storage.clearAll() // avoid: nukes the whole instance

// Maintenance
storage.byteSize // file size in bytes
storage.trim()   // compact file, drop unused space
```

React hooks are available (`useMMKVString`, `useMMKVNumber`, `useMMKVBoolean`) that
re-render on value changes, plus value-change listeners.

Options for `createMMKV({ ... })`: `id`, `path`, `encryptionKey`, `encryptionType`
(AES-128 default / AES-256), `mode: 'multi-process'`, `readOnly`, `compareBeforeSet`.

## AsyncStorage migration snippet (upstream pattern)

One-time copy loop, gated by a flag stored in MMKV itself:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createMMKV } from 'react-native-mmkv'

export const storage = createMMKV()

export const hasMigratedFromAsyncStorage = storage.getBoolean(
  'hasMigratedFromAsyncStorage'
)

export async function migrateFromAsyncStorage(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys()
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key)
    if (value != null) {
      storage.set(key, value) // Soli stores JSON strings only, no boolean coercion needed
      await AsyncStorage.removeItem(key)
    }
  }
  storage.set('hasMigratedFromAsyncStorage', true)
}
```

Upstream gates app render on migration completing (loading spinner). For Soli the same
effect can be achieved inside the existing hydration effects, since all reads already
tolerate `null`/absent values. Keep the AsyncStorage dependency installed for at least a
few releases so late updaters can still migrate.

## Jest / testing

V4 ships a built-in automatic mock: `createMMKV()` works out of the box in Jest and
Vitest with an in-memory implementation — no `jest.mock(...)` call needed (unlike
AsyncStorage's explicit `async-storage-mock`). If Soli adopts MMKV, add
`react-native-nitro-modules` and `react-native-mmkv` to the Jest
`transformIgnorePatterns` allowlist in `package.json`.

## Known issues / caveats relevant to Soli

- **Large values**: MMKV (the Tencent core) is optimized for many small key-values. It
  uses an append-only log with periodic full write-back; repeatedly rewriting one large
  value (Soli's game-state blob with full undo history can reach hundreds of KB late in
  a game) causes file growth and write-back churn. It still works, but the "~30x faster
  than AsyncStorage" headline does not apply to this write shape — JSON.stringify cost
  on the JS thread dominates either way. Use `trim()` if file size becomes a concern.
- **Synchronous = JS-thread blocking**: reads/writes are fast, but a synchronous write
  of a very large value happens on the JS thread instead of being handed off like
  AsyncStorage's promise-based write. For small keys this is a non-issue.
- **Two native deps**: `react-native-nitro-modules` version must satisfy the range
  `react-native-mmkv` was codegen'd against; on upgrades keep them in lockstep.
- iOS static-library builds may need `pod 'MMKVCore', :modular_headers => true` — recent
  v4 releases handle this by default; only relevant if a manual MMKVCore Podfile entry
  exists (Soli has none).
