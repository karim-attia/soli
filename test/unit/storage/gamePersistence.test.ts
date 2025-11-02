import AsyncStorage from '@react-native-async-storage/async-storage'

import { createInitialState } from '../../../src/solitaire/klondike'
import {
  KLONDIKE_STORAGE_KEY,
  PERSISTENCE_VERSION,
  PersistedGameError,
  clearGameState,
  loadGameState,
  saveGameState,
} from '../../../src/storage/gamePersistence'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

describe('gamePersistence', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('persists sanitized game state with selection cleared', async () => {
    const initial = createInitialState()
    const state = {
      ...initial,
      selected: { source: 'waste' } as const,
    }

    await saveGameState(state)

    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1)
    const [, serialized] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
    expect(typeof serialized).toBe('string')
    expect(serialized).toContain(`"selected":null`)
  })

  it('loads previously saved state and clears saved selection', async () => {
    const initial = createInitialState()
    const payload = {
      version: PERSISTENCE_VERSION,
      savedAt: new Date().toISOString(),
      state: {
        ...initial,
        selected: { source: 'waste' } as const,
      },
    }

    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(payload))

    const restored = await loadGameState()

    expect(restored).not.toBeNull()
    expect(restored?.selected).toBeNull()
  })

  it('throws PersistedGameError for invalid JSON', async () => {
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json')

    await expect(loadGameState()).rejects.toBeInstanceOf(PersistedGameError)
  })

  it('removes saved state via clearGameState', async () => {
    await clearGameState()
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(KLONDIKE_STORAGE_KEY)
  })
})

