# React Native AsyncStorage Guide

> **SUPERSEDED (2026-07-05):** `@react-native-async-storage/async-storage` was removed
> from Soli. All key-value persistence now goes through `expo-sqlite/kv-store` (same
> AsyncStorage-shaped API plus sync variants) — see the "Key-value store" section in
> [expo-sqlite.md](./expo-sqlite.md) and the decision record in
> `docs/product/mmkv-migration/asyncstorage-to-mmkv-evaluation.md`. This guide is kept
> for historical reference only.

Last refreshed: 2026-07-03

## Scope

- Package/tool: `@react-native-async-storage/async-storage`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this guide as the current source-backed reference for Soli work involving this package or tool.

## Source-backed notes

- **Package**: `@react-native-async-storage/async-storage`
- **Retrieved**: 2025-11-01
- **Primary docs**:
  - Expo SDK 56 package page: https://docs.expo.dev/versions/v56.0.0/sdk/async-storage/
  - Usage for the Expo-pinned 2.x API: https://react-native-async-storage.github.io/2.0/Usage/
  - API for the Expo-pinned 2.x API: https://react-native-async-storage.github.io/2.0/API/
  - Jest integration: https://react-native-async-storage.github.io/2.0/advanced/Jest-integration/

## Installation Notes
- For Expo-managed apps, run `npx expo install @react-native-async-storage/async-storage` so the correct native binaries are selected.
- React Native 0.60+ autolinks the native module; on iOS run `npx pod-install` after installing.
- No extra Expo configuration is required beyond ensuring the project rebuilds after dependency changes.

## Core API Summary
- Import the default export: `import AsyncStorage from '@react-native-async-storage/async-storage';`
- Storage is string-only. Use `JSON.stringify` to persist objects and `JSON.parse` on readback.
- `AsyncStorage.setItem(key, value)` returns a promise that resolves when the write completes. Overwrites by key.
- `AsyncStorage.getItem(key)` resolves with the stored string or `null` when absent.
- `AsyncStorage.removeItem(key)` removes data for a key; `multiSet`, `multiGet`, and `multiRemove` batch operations.
- On errors (e.g., quota exceeded), the promise rejects—wrap calls in try/catch and surface appropriate UI feedback.

## Recommended Patterns for PBI 13
- Declare a constant storage key (e.g., `const KLONDIKE_SAVE_KEY = 'soli/klondike/v1';`) so future schema changes can bump the version segment.
- Consolidate serialization/deserialization in helper functions that:
  - Accept strongly typed game state and return a JSON string payload.
  - Parse JSON defensively, verifying required fields before returning data.
  - Clear storage and throw a typed error when validation fails.
- Trigger saves with debounced writes if performance becomes an issue; initial implementation will write after every reducer mutation per requirements.
- During testing, mock AsyncStorage via `@react-native-async-storage/async-storage/jest/async-storage-mock` to avoid hitting the real native module.

## Example Snippets

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const KLONDIKE_SAVE_KEY = 'soli/klondike/v1';

export async function saveGame(payload: PersistedGamePayload) {
  const serialized = JSON.stringify(payload);
  await AsyncStorage.setItem(KLONDIKE_SAVE_KEY, serialized);
}

export async function loadGame(): Promise<PersistedGamePayload | null> {
  const serialized = await AsyncStorage.getItem(KLONDIKE_SAVE_KEY);
  if (!serialized) return null;
  try {
    return JSON.parse(serialized) as PersistedGamePayload;
  } catch (error) {
    await AsyncStorage.removeItem(KLONDIKE_SAVE_KEY);
    throw new Error('Invalid saved game payload');
  }
}
```

## Migration Considerations
- Include a `version` field in the saved payload. When bumping the schema, read the version first and either migrate or discard the snapshot.
- Before releasing schema-breaking changes, add upgrade logic that transforms prior versions to the new shape where feasible.
- Document storage schema migrations in the implementation plan so future work knows how to evolve the format.

## Refresh check (2026-07-03)

- Status: still useful for existing AsyncStorage-backed key-value state, but historical for
  the original PBI 13 save-game task.
- Repo state: `package.json` and `yarn.lock` are on
  `@react-native-async-storage/async-storage@2.2.0`, which matches the Expo SDK 56
  recommended version.
- Source check: the old `react-native-async-storage.github.io/async-storage/...` links
  have moved; use the Expo SDK 56 page plus the versioned 2.0 docs above for this repo's
  API shape.
- Upstream note: newer AsyncStorage 3.x exists upstream, but it is not the Expo SDK 56
  recommended version. Do not adopt the 3.x `createAsyncStorage` examples in Soli without a
  separate Expo alignment check.
- Best-practice note: keep this package behind repository helpers, store only strings,
  validate JSON on read, and avoid `clear()` because it removes keys for every caller, not
  just Soli's namespace.
