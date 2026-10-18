// Deterministic `expo-crypto` for unit tests (deal identity uses `getRandomValues`).
//
// This file used to be `mock-expo-winter.ts` and also stubbed the `expo/winter`
// runtime paths "that Jest cannot load under PnP". Dropped on SDK 58 (2026-10-17):
// Yarn PnP is gone (`nodeLinker: node-modules`) and jest-expo 58's preset setup
// loads `expo/src/winter` itself. If winter imports ever break the suite again,
// the old `moduleNameMapper` + `jest.mock(..., { virtual: true })` lines are in
// git history.
jest.mock('expo-crypto', () => {
  let counter = 0

  return {
    getRandomValues: (bytes: Uint8Array) => {
      counter += 1
      bytes.fill(0)
      bytes[bytes.length - 1] = counter % 251
      return bytes
    },
  }
})
