// Resolves to test/mocks/expo-sqlite-kv-store via the Jest moduleNameMapper.
import Storage from 'expo-sqlite/kv-store'

import {
  createDemoGameState,
  createInitialState,
  getDropHints,
  klondikeReducer,
  type GameAction,
  type GameSnapshot,
  type GameState,
  type MoveTarget,
  type Selection,
} from '../../../src/solitaire/klondike'
import {
  KLONDIKE_STORAGE_KEY,
  PERSISTENCE_VERSION,
  PersistedGameError,
  boardSignature,
  clearGameState,
  loadGameState,
  saveGameStateWithHistory,
} from '../../../src/storage/gamePersistence'

// Deterministic LCG so fuzz failures reproduce.
const createRandom = (seed: number) => {
  let value = seed
  return () => {
    value = (value * 1103515245 + 12345) % 2147483648
    return value / 2147483648
  }
}

const listValidMoves = (
  state: GameState
): Array<{ selection: Selection; target: MoveTarget }> => {
  const selections: Selection[] = []
  if (state.waste.length) {
    selections.push({ source: 'waste' })
  }
  state.tableau.forEach((column, columnIndex) => {
    column.forEach((card, cardIndex) => {
      if (card.faceUp) {
        selections.push({ source: 'tableau', columnIndex, cardIndex })
      }
    })
  })
  ;(['hearts', 'diamonds', 'clubs', 'spades'] as const).forEach((suit) => {
    if (state.foundations[suit].length) {
      selections.push({ source: 'foundation', suit })
    }
  })

  const pairs: Array<{ selection: Selection; target: MoveTarget }> = []
  selections.forEach((selection) => {
    const hints = getDropHints({ ...state, selected: selection })
    hints.tableau.forEach((allowed, columnIndex) => {
      if (allowed) {
        pairs.push({ selection, target: { type: 'tableau', columnIndex } })
      }
    })
    ;(['hearts', 'diamonds', 'clubs', 'spades'] as const).forEach((suit) => {
      if (hints.foundations[suit]) {
        pairs.push({ selection, target: { type: 'foundation', suit } })
      }
    })
  })
  return pairs
}

// Plays `steps` random valid actions (moves, draws, undos, scrubs, auto-up toggles,
// auto-queue advances) with a running timer so the persisted top-level elapsedMs is
// nontrivial. `allowScrub: false` keeps logs linear for the size-guard test.
const playRandomGame = (
  seed: number,
  steps: number,
  options: { allowScrub?: boolean } = {}
): GameState => {
  const random = createRandom(seed)
  let state = createInitialState()
  let now = 1_000_000
  state = klondikeReducer(state, { type: 'TIMER_START', startedAt: now })

  const dispatch = (action: GameAction) => {
    state = klondikeReducer(state, action)
    // Drain any auto-queue the action scheduled, like the UI's advance loop does —
    // but only partially sometimes (review fix batch, 2026-07-06): the always-fully-
    // drained driver could never catch unlogged-history-push bugs that only surface
    // when a scrub/undo/save lands mid-auto-run (the R2 class).
    if (state.autoQueue.length || state.isAutoCompleting) {
      let remaining = random() < 0.7 ? 600 : Math.floor(random() * 3)
      while ((state.autoQueue.length || state.isAutoCompleting) && remaining > 0) {
        state = klondikeReducer(state, { type: 'ADVANCE_AUTO_QUEUE' })
        remaining -= 1
      }
    }
  }

  for (let step = 0; step < steps && !state.hasWon; step += 1) {
    now += Math.floor(random() * 2000)
    state = klondikeReducer(state, { type: 'TIMER_TICK', timestamp: now })

    const roll = random()
    const moves = listValidMoves(state)
    if (roll < 0.5 && moves.length) {
      const { selection, target } = moves[Math.floor(random() * moves.length)]
      dispatch({ type: 'APPLY_MOVE', selection, target })
    } else if (roll < 0.75 && (state.stock.length || state.waste.length)) {
      dispatch({ type: 'DRAW_OR_RECYCLE' })
    } else if (roll < 0.85 && state.history.length) {
      dispatch({ type: 'UNDO' })
    } else if (
      roll < 0.93 &&
      options.allowScrub !== false &&
      state.history.length + state.future.length > 0
    ) {
      const max = state.history.length + state.future.length
      dispatch({
        type: 'SCRUB_TO_INDEX',
        index: Math.floor(random() * (max + 1)),
      })
    } else if (roll < 0.96) {
      dispatch({ type: 'SET_AUTO_UP_ENABLED', enabled: !state.autoUpEnabled })
    } else {
      dispatch({ type: 'DRAW_OR_RECYCLE' })
    }
  }

  return state
}

// Structural snapshot signature ignoring card ids (deck-instance suffixes differ
// between the saving and replaying process by design). Snapshots carry no timer
// fields anymore, so no timer carve-outs are needed.
const snapshotSignature = (snapshot: GameSnapshot): string =>
  JSON.stringify({
    board: boardSignature(snapshot),
    hasWon: snapshot.hasWon,
    winCelebrations: snapshot.winCelebrations,
  })

const cardIdSuffixes = (state: GameState): Set<string> => {
  const suffixes = new Set<string>()
  const collect = (snapshot: GameSnapshot) => {
    const piles = [
      snapshot.stock,
      snapshot.waste,
      ...snapshot.tableau,
      ...Object.values(snapshot.foundations),
    ]
    piles.forEach((pile) =>
      pile.forEach((card) => suffixes.add(card.id.split('-').slice(2).join('-')))
    )
  }
  collect(state)
  state.history.forEach(collect)
  state.future.forEach(collect)
  return suffixes
}

const saveAndReload = async (state: GameState, historyEntryId: string | null = null) => {
  await saveGameStateWithHistory(state, historyEntryId)
  const calls = (Storage.setItem as jest.Mock).mock.calls
  const [, serialized] = calls[calls.length - 1]
  ;(Storage.getItem as jest.Mock).mockResolvedValue(serialized)
  return { serialized: serialized as string, loaded: await loadGameState() }
}

describe('gamePersistence (payload v1: deal + move log + final snapshot + clock)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('persists a payload with deal identity, move log, one final snapshot and a top-level clock', async () => {
    let state = createInitialState()
    state = klondikeReducer(state, { type: 'DRAW_OR_RECYCLE' })
    state = {
      ...state,
      selected: { source: 'waste' } as const,
      elapsedMs: 4_321,
    }

    await saveGameStateWithHistory(state, 'entry-1')

    const [key, serialized] = (Storage.setItem as jest.Mock).mock.calls[0]
    expect(key).toBe(KLONDIKE_STORAGE_KEY)
    const payload = JSON.parse(serialized as string)
    expect(payload.version).toBe(PERSISTENCE_VERSION)
    expect(payload.historyEntryId).toBe('entry-1')
    expect(payload.deal).toEqual({
      exactId: state.exactId,
      drawCount: state.drawCount,
      revealInitialWaste: true,
    })
    expect(payload.moveLog).toEqual([{ k: 'draw' }])
    expect(payload.finalSnapshot.moveCount).toBe(1)
    // R1: depth-aware replay guard captured at save time.
    expect(payload.guard).toEqual({
      historyLength: 1,
      futureLength: 0,
      hasWon: false,
      autoCompleteRuns: 0,
    })
    // The clock lives once at top level; snapshots are boards, not clocks.
    expect(payload.elapsedMs).toBe(4_321)
    expect(payload.finalSnapshot.elapsedMs).toBeUndefined()
    expect(payload.finalSnapshot.timerState).toBeUndefined()
    // The whole point of move-log persistence: no undo snapshot arrays in the payload.
    expect(payload.state).toBeUndefined()
    expect(serialized).not.toContain('"history"')
  })

  it('round-trips a fuzzed 150-action game with full undo depth intact', async () => {
    const live = playRandomGame(20260706, 150)
    expect(live.moveLog.length).toBeGreaterThan(50)

    const { loaded } = await saveAndReload(live, 'entry-fuzz')

    expect(loaded).not.toBeNull()
    const restored = loaded!.state
    expect(boardSignature(restored)).toBe(boardSignature(live))
    expect(restored.moveCount).toBe(live.moveCount)
    expect(restored.hasWon).toBe(live.hasWon)
    expect(restored.autoCompleteRuns).toBe(live.autoCompleteRuns)
    expect(restored.drawCount).toBe(live.drawCount)
    expect(restored.exactId).toBe(live.exactId)
    expect(restored.deckChecksum).toBe(live.deckChecksum)
    expect(restored.elapsedMs).toBe(live.elapsedMs)
    // timerState is derived on load: a game with progress resumes paused.
    expect(restored.timerState).toBe('paused')
    expect(restored.timerStartedAt).toBeNull()
    expect(loaded!.historyEntryId).toBe('entry-fuzz')

    expect(restored.history).toHaveLength(live.history.length)
    expect(restored.future).toHaveLength(live.future.length)
    restored.history.forEach((snapshot, index) => {
      expect(snapshotSignature(snapshot)).toBe(snapshotSignature(live.history[index]))
    })
    restored.future.forEach((snapshot, index) => {
      expect(snapshotSignature(snapshot)).toBe(snapshotSignature(live.future[index]))
    })

    // Undo animation identity: every card in the hydrated state must come from the
    // single replay deck instance (mixed ids would remount animated cards on undo).
    expect(cardIdSuffixes(restored).size).toBe(1)

    // The restored move log must keep replaying on the next save/load cycle.
    const again = await saveAndReload(restored)
    expect(boardSignature(again.loaded!.state)).toBe(boardSignature(live))
    expect(again.loaded!.state.history).toHaveLength(live.history.length)
  })

  it('keeps redo (future) usable across restart: undo 3, reload, scrub forward', async () => {
    let live = playRandomGame(42, 60, { allowScrub: false })
    while (live.history.length < 3) {
      live = playRandomGame(live.moveCount + 7, 80, { allowScrub: false })
    }
    // Auto Up off so finalizeState cannot schedule an auto-queue after an undo
    // (scheduling pushes a history snapshot and clears future, breaking the redo count).
    live = klondikeReducer(live, {
      type: 'SET_AUTO_UP_ENABLED',
      enabled: false,
    })
    if (live.future.length) {
      // The fuzz may end with pending redo; scrub to the tip for an exact count below.
      live = klondikeReducer(live, {
        type: 'SCRUB_TO_INDEX',
        index: live.history.length + live.future.length,
      })
    }
    live = klondikeReducer(live, { type: 'UNDO' })
    live = klondikeReducer(live, { type: 'UNDO' })
    live = klondikeReducer(live, { type: 'UNDO' })
    expect(live.future).toHaveLength(3)

    const { loaded } = await saveAndReload(live)
    const restored = loaded!.state
    expect(restored.future).toHaveLength(3)
    expect(boardSignature(restored)).toBe(boardSignature(live))

    const forward = klondikeReducer(restored, {
      type: 'SCRUB_TO_INDEX',
      index: restored.history.length + 3,
    })
    expect(forward.future).toHaveLength(0)
    expect(boardSignature(forward)).toBe(boardSignature(live.future[2]))
  })

  it('falls back to the final snapshot with empty history when a log entry is corrupted', async () => {
    const live = playRandomGame(7, 40, { allowScrub: false })
    expect(live.history.length).toBeGreaterThan(0)

    await saveGameStateWithHistory(live, null)
    const [, serialized] = (Storage.setItem as jest.Mock).mock.calls[0]
    const payload = JSON.parse(serialized as string)
    // An impossible move: the reducer rejects it, which replay reports as drift.
    payload.moveLog[1] = {
      k: 'move',
      sel: { source: 'foundation', suit: 'hearts' },
      tgt: { type: 'foundation', suit: 'hearts' },
    }
    ;(Storage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(payload))

    const loaded = await loadGameState()
    expect(loaded).not.toBeNull()
    expect(boardSignature(loaded!.state)).toBe(boardSignature(live))
    expect(loaded!.state.history).toHaveLength(0)
    expect(loaded!.state.future).toHaveLength(0)
    expect(loaded!.state.moveLog).toHaveLength(0)
  })

  it('falls back to the final snapshot on a move-log version bump', async () => {
    const live = playRandomGame(11, 30, { allowScrub: false })
    await saveGameStateWithHistory(live, null)
    const [, serialized] = (Storage.setItem as jest.Mock).mock.calls[0]
    const payload = JSON.parse(serialized as string)
    payload.moveLogVersion = 999
    ;(Storage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(payload))

    const loaded = await loadGameState()
    expect(boardSignature(loaded!.state)).toBe(boardSignature(live))
    expect(loaded!.state.history).toHaveLength(0)
  })

  it('falls back to the final snapshot when the replayed depth mismatches the guard (R1)', async () => {
    const live = playRandomGame(13, 40, { allowScrub: false })
    expect(live.history.length).toBeGreaterThan(0)

    await saveGameStateWithHistory(live, null)
    const [, serialized] = (Storage.setItem as jest.Mock).mock.calls[0]
    const payload = JSON.parse(serialized as string)
    // Simulate an unlogged history push: the board still replays identically, so
    // only the depth-aware guard can catch it.
    payload.guard.historyLength += 1
    ;(Storage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(payload))

    const loaded = await loadGameState()
    expect(boardSignature(loaded!.state)).toBe(boardSignature(live))
    expect(loaded!.state.history).toHaveLength(0)
    expect(loaded!.state.future).toHaveLength(0)
  })

  it('rejects payloads without guard fields as invalid (pre-guard payload shape)', async () => {
    const live = playRandomGame(17, 20, { allowScrub: false })
    await saveGameStateWithHistory(live, null)
    const [, serialized] = (Storage.setItem as jest.Mock).mock.calls[0]
    const payload = JSON.parse(serialized as string)
    delete payload.guard
    ;(Storage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(payload))

    await expect(loadGameState()).rejects.toMatchObject({ reason: 'invalid' })
  })

  it('keeps a successful replay when the stored snapshot is malformed (R3)', async () => {
    const live = playRandomGame(23, 40, { allowScrub: false })
    expect(live.history.length).toBeGreaterThan(0)

    await saveGameStateWithHistory(live, null)
    const [, serialized] = (Storage.setItem as jest.Mock).mock.calls[0]
    const payload = JSON.parse(serialized as string)
    // Structural corruption: a malformed snapshot must not veto a good replay.
    payload.finalSnapshot.foundations = { hearts: 'garbage' }
    ;(Storage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(payload))

    const loaded = await loadGameState()
    expect(loaded).not.toBeNull()
    expect(boardSignature(loaded!.state)).toBe(boardSignature(live))
    expect(loaded!.state.history).toHaveLength(live.history.length)
    expect(loaded!.state.future).toHaveLength(live.future.length)
  })

  it('throws PersistedGameError when the snapshot is malformed AND the log is unreplayable (R3)', async () => {
    const live = playRandomGame(29, 40, { allowScrub: false })
    await saveGameStateWithHistory(live, null)
    const [, serialized] = (Storage.setItem as jest.Mock).mock.calls[0]
    const payload = JSON.parse(serialized as string)
    payload.finalSnapshot.tableau = [[{ bogus: true }]]
    payload.moveLog[0] = {
      k: 'move',
      sel: { source: 'foundation', suit: 'hearts' },
      tgt: { type: 'foundation', suit: 'hearts' },
    }
    ;(Storage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(payload))

    // No unhandled rejection/crash: the hook treats 'invalid' by clearing storage.
    await expect(loadGameState()).rejects.toMatchObject({ reason: 'invalid' })
  })

  it('persists the demo board with an empty log and restores it via the snapshot fallback', async () => {
    let demo = createDemoGameState()
    demo = klondikeReducer(demo, { type: 'DRAW_OR_RECYCLE' })
    expect(demo.moveLog.length).toBeGreaterThan(0)

    const { serialized, loaded } = await saveAndReload(demo)
    expect(JSON.parse(serialized).moveLog).toEqual([])
    // Fallback by design: the demo's custom 42-card layout is not reconstructible
    // from its exactId, so the board survives but the undo history does not.
    expect(boardSignature(loaded!.state)).toBe(boardSignature(demo))
    expect(loaded!.state.history).toHaveLength(0)
  })

  it('keeps a 150-action payload under 40 KB (acceptance criterion 4)', async () => {
    const live = playRandomGame(99, 150, { allowScrub: false })
    await saveGameStateWithHistory(live, 'entry-size')
    const [, serialized] = (Storage.setItem as jest.Mock).mock.calls[0]
    expect((serialized as string).length).toBeLessThan(40_000)
  })

  it('normalizes an out-of-range draw count from the stored deal', async () => {
    const live = playRandomGame(3, 20, { allowScrub: false })
    await saveGameStateWithHistory(live, null)
    const [, serialized] = (Storage.setItem as jest.Mock).mock.calls[0]
    const payload = JSON.parse(serialized as string)
    payload.deal.drawCount = 17
    ;(Storage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(payload))

    const loaded = await loadGameState()
    // The board came from a Draw 1 game; the tampered count normalizes to 1 and the
    // replay still verifies against the snapshot.
    expect(loaded!.state.drawCount).toBe(1)
  })

  it('throws PersistedGameError for invalid JSON', async () => {
    ;(Storage.getItem as jest.Mock).mockResolvedValue('not-json')
    await expect(loadGameState()).rejects.toBeInstanceOf(PersistedGameError)
  })

  it('rejects unknown payload versions with unsupported-version', async () => {
    ;(Storage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({
        version: 999,
        savedAt: new Date().toISOString(),
        state: {},
      })
    )
    await expect(loadGameState()).rejects.toMatchObject({
      reason: 'unsupported-version',
    })
  })

  it('rejects payloads missing required fields as invalid', async () => {
    ;(Storage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ version: 1, savedAt: new Date().toISOString() })
    )
    await expect(loadGameState()).rejects.toMatchObject({ reason: 'invalid' })
  })

  it('removes saved state via clearGameState', async () => {
    await clearGameState()
    expect(Storage.removeItem).toHaveBeenCalledWith(KLONDIKE_STORAGE_KEY)
  })
})
