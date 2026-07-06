// In-memory Jest mock for the `expo-sqlite/kv-store` default export (an
// AsyncStorage-compatible SQLiteStorage instance). Wired up globally via the
// moduleNameMapper in package.json, mirroring the plain `expo-sqlite` mock.
const store = new Map<string, string>()

const Storage = {
  getItem: jest.fn(async (key: string): Promise<string | null> => {
    return store.get(key) ?? null
  }),
  setItem: jest.fn(async (key: string, value: string): Promise<void> => {
    store.set(key, value)
  }),
  removeItem: jest.fn(async (key: string): Promise<void> => {
    store.delete(key)
  }),
  getItemSync: jest.fn((key: string): string | null => {
    return store.get(key) ?? null
  }),
  setItemSync: jest.fn((key: string, value: string): void => {
    store.set(key, value)
  }),
  removeItemSync: jest.fn((key: string): boolean => {
    return store.delete(key)
  }),
  clear: jest.fn(async (): Promise<void> => {
    store.clear()
  }),
  clearSync: jest.fn((): boolean => {
    store.clear()
    return true
  }),
}

export default Storage
export { Storage, Storage as AsyncStorage }
