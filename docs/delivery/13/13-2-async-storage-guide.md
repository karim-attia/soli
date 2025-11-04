# 13-2 AsyncStorage Guide

- **Package**: `@react-native-async-storage/async-storage`
- **Retrieved**: 2025-11-01
- **Primary docs**:
  - Installation: https://react-native-async-storage.github.io/async-storage/docs/install/
  - Usage: https://react-native-async-storage.github.io/async-storage/docs/usage/

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
- Document migrations in Task 13-3 so future work knows how to evolve the format.





