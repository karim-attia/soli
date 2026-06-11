import AsyncStorage from '@react-native-async-storage/async-storage'

import { createInitialState, klondikeReducer } from '../../../src/solitaire/klondike'
import {
  KLONDIKE_STORAGE_KEY,
  PERSISTENCE_VERSION,
  PersistedGameError,
  clearGameState,
  loadGameState,
  saveGameState,
} from '../../../src/storage/gamePersistence'

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
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
      status: 'in-progress' as const,
      state: {
        ...initial,
        selected: { source: 'waste' } as const,
      },
    }

    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(payload))

    const restored = await loadGameState()

    expect(restored).not.toBeNull()
    expect(restored?.state.selected).toBeNull()
  })

  it('defaults Auto Up to enabled for legacy saved states', async () => {
    const initial = createInitialState()
    const legacyState = { ...initial } as Partial<typeof initial>
    delete legacyState.autoUpEnabled
    const payload = {
      version: PERSISTENCE_VERSION,
      savedAt: new Date().toISOString(),
      status: 'in-progress' as const,
      state: legacyState,
    }

    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(payload))

    const restored = await loadGameState()

    expect(restored?.state.autoUpEnabled).toBe(true)
  })

  it('defaults legacy games and every undo snapshot to Draw 1', async () => {
    let current = createInitialState(4)
    current = klondikeReducer(current, { type: 'DRAW_OR_RECYCLE' })
    current = klondikeReducer(current, { type: 'DRAW_OR_RECYCLE' })
    current = klondikeReducer(current, { type: 'UNDO' })

    const legacyState = JSON.parse(JSON.stringify(current)) as Record<string, any>
    delete legacyState.drawCount
    delete legacyState.dealSolvabilityBasis
    legacyState.history.forEach((snapshot: Record<string, any>) => {
      delete snapshot.drawCount
      delete snapshot.dealSolvabilityBasis
    })
    legacyState.future.forEach((snapshot: Record<string, any>) => {
      delete snapshot.drawCount
      delete snapshot.dealSolvabilityBasis
    })

    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        version: PERSISTENCE_VERSION,
        savedAt: new Date().toISOString(),
        status: 'in-progress',
        state: legacyState,
      })
    )

    const restored = await loadGameState()

    expect(restored?.state.drawCount).toBe(1)
    expect(restored?.state.history.every((snapshot) => snapshot.drawCount === 1)).toBe(
      true
    )
    expect(restored?.state.future.every((snapshot) => snapshot.drawCount === 1)).toBe(
      true
    )
  })

  it('preserves valid draw counts in saved games and snapshots', async () => {
    let state = createInitialState(5)
    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })

    await saveGameState(state)
    const [, serialized] = (AsyncStorage.setItem as jest.Mock).mock.calls[0]
    ;(AsyncStorage.getItem as jest.Mock).mockResolvedValue(serialized)

    const restored = await loadGameState()

    expect(restored?.state.drawCount).toBe(5)
    expect(restored?.state.history[0].drawCount).toBe(5)
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
