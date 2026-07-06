import { useCallback, useEffect, useRef } from 'react'
import type { Dispatch, MutableRefObject } from 'react'
import { Linking } from 'react-native'
import type { LayoutRectangle } from 'react-native'

import {
  createDemoGameState,
  type GameAction,
  type GameState,
  type Selection,
  type Suit,
} from '../../../solitaire/klondike'
import type { DrawCount } from '../../../solitaire/drawCount'
import {
  createDemoReplayGameState,
  createScrubbedMidGameState,
  getDemoUndoProbePlan,
  resolveDemoReplayAction,
  type DemoAutoSolvePlaylistEntry,
} from '../../../solitaire/demoReplay'
import { getDemoAutoSolvePlaylist } from '../../../data/demoAutoSolvePlaylist'
import { setDemoProgress } from '../state/demoProgressStore'
import { devLog } from '../../../utils/devLogger'

type DispatchGameActionFn = (action: GameAction) => void
export type DemoLaunchMode = 'old' | 'single' | 'playlist' | 'scrubbed'

type UseDemoGameLauncherOptions = {
  stateRef: MutableRefObject<GameState>
  dispatch: Dispatch<GameAction>
  dispatchGameAction: DispatchGameActionFn
  developerModeEnabled: boolean
  setDeveloperMode: (enabled: boolean) => void
  boardLockedRef: MutableRefObject<boolean>
  clearCelebrationDialogTimer: () => void
  recordCurrentGameResult: (options?: { solved?: boolean }) => void
  // The launcher only ever clears the celebration; narrow signature keeps this
  // file free of the celebration hook's types.
  setCelebrationState: (state: null) => void
  foundationLayoutsRef: MutableRefObject<Partial<Record<Suit, LayoutRectangle>>>
  topRowLayoutRef: MutableRefObject<LayoutRectangle | null>
  winCelebrationsRef: MutableRefObject<number>
  // Detaches the live game from its active history row before the demo replaces it.
  // Narrow callback (owned by useKlondikeHistoryEntry) instead of the raw entry-id
  // ref so history-link mutation stays inside the history-entry hook.
  clearCurrentGameEntryLink: () => void
  demoPlaybackActiveRef: MutableRefObject<boolean>
  updateBoardLocked: (locked: boolean) => void
  clearGameState: () => Promise<void>
  preferredDrawCount: DrawCount
  autoUpEnabled: boolean
}

export type LaunchDemoGameOptions = {
  autoReveal?: boolean
  autoSolve?: boolean
  force?: boolean
  demoMode?: DemoLaunchMode
  gameLimit?: number
  recordHistory?: boolean
}

type DemoPlaylistRunOptions = {
  gameLimit?: number
  recordHistory?: boolean
}

export const DEMO_AUTO_STEP_INTERVAL_MS = 300
const DEMO_PLAYLIST_POLL_INTERVAL_MS = 30
const DEMO_PLAYLIST_ACTION_TIMEOUT_MS = 2500
const DEMO_PLAYLIST_BETWEEN_GAMES_MS = 600
// HUD throttle: step progress is published at most this often; game loads and
// undo-probe start/end publish immediately (force) so the HUD never misses them.
const parseOptionalBooleanParam = (value: string | null): boolean | null => {
  if (value === null) {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on', 'enabled'].includes(normalized)) {
    return true
  }
  if (['0', 'false', 'no', 'off', 'disabled'].includes(normalized)) {
    return false
  }
  return null
}

export const useDemoGameLauncher = ({
  stateRef,
  dispatch,
  dispatchGameAction,
  developerModeEnabled,
  setDeveloperMode,
  boardLockedRef,
  clearCelebrationDialogTimer,
  recordCurrentGameResult,
  setCelebrationState,
  foundationLayoutsRef,
  topRowLayoutRef,
  winCelebrationsRef,
  clearCurrentGameEntryLink,
  demoPlaybackActiveRef,
  updateBoardLocked,
  clearGameState,
  preferredDrawCount,
  autoUpEnabled,
}: UseDemoGameLauncherOptions) => {
  const playlistRunIdRef = useRef(0)
  const playlistTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  const clearPlaylistTimers = useCallback(() => {
    playlistTimersRef.current.forEach((timer) => {
      clearTimeout(timer)
    })
    playlistTimersRef.current = []
  }, [])

  const schedulePlaylistTimer = useCallback((callback: () => void, delayMs: number) => {
    const timer = setTimeout(() => {
      playlistTimersRef.current = playlistTimersRef.current.filter(
        (candidate) => candidate !== timer
      )
      callback()
    }, delayMs)
    playlistTimersRef.current.push(timer)
  }, [])

  useEffect(() => {
    return () => {
      clearPlaylistTimers()
    }
  }, [clearPlaylistTimers])

  const resetDemoRuntimeState = useCallback(() => {
    clearCelebrationDialogTimer()
    setCelebrationState(null)
    foundationLayoutsRef.current = {}
    topRowLayoutRef.current = null
    winCelebrationsRef.current = 0
    clearCurrentGameEntryLink()
    updateBoardLocked(false)
  }, [
    clearCelebrationDialogTimer,
    clearCurrentGameEntryLink,
    foundationLayoutsRef,
    setCelebrationState,
    topRowLayoutRef,
    updateBoardLocked,
    winCelebrationsRef,
  ])

  const failPlaylist = useCallback(
    (runId: number, message: string) => {
      if (playlistRunIdRef.current !== runId) {
        return
      }
      clearPlaylistTimers()
      demoPlaybackActiveRef.current = false
      setDemoProgress(null)
      dispatch({ type: 'SET_AUTO_UP_ENABLED', enabled: autoUpEnabled })
      devLog('error', `[DemoPlaylist] Playlist failed: ${message}`)
    },
    [autoUpEnabled, clearPlaylistTimers, demoPlaybackActiveRef, dispatch]
  )

  const waitForPlaylistState = useCallback(
    ({
      runId,
      description,
      predicate,
      onReady,
    }: {
      runId: number
      description: string
      predicate: () => boolean
      onReady: () => void
    }) => {
      const startedAt = Date.now()

      const poll = () => {
        if (playlistRunIdRef.current !== runId) {
          return
        }
        if (predicate()) {
          onReady()
          return
        }
        if (Date.now() - startedAt >= DEMO_PLAYLIST_ACTION_TIMEOUT_MS) {
          failPlaylist(runId, `${description} timed out.`)
          return
        }
        schedulePlaylistTimer(poll, DEMO_PLAYLIST_POLL_INTERVAL_MS)
      }

      schedulePlaylistTimer(poll, DEMO_PLAYLIST_POLL_INTERVAL_MS)
    },
    [failPlaylist, schedulePlaylistTimer]
  )

  const runDemoPlaylist = useCallback(
    (options: DemoPlaylistRunOptions = {}) => {
      clearPlaylistTimers()
      playlistRunIdRef.current += 1
      const runId = playlistRunIdRef.current
      demoPlaybackActiveRef.current = true
      // First access evaluates the generated playlist module (lazy require).
      const playlist = getDemoAutoSolvePlaylist()
      const gameLimit = Math.max(
        1,
        Math.min(options.gameLimit ?? playlist.length, playlist.length)
      )
      const shouldRecordHistory = options.recordHistory !== false

      const applyHistoryPreference = (action: GameAction): GameAction => {
        if (shouldRecordHistory) {
          return action
        }
        if (action.type === 'APPLY_MOVE' || action.type === 'DRAW_OR_RECYCLE') {
          // Explicit recordHistory=false is a stress option; default replay keeps
          // reducer undo snapshots so generated runs can exercise undo probes.
          return { ...action, recordHistory: false }
        }
        return action
      }

      const loadGame = (gameIndex: number) => {
        if (playlistRunIdRef.current !== runId) {
          return
        }

        if (gameIndex >= gameLimit) {
          demoPlaybackActiveRef.current = false
          setDemoProgress(null)
          dispatch({ type: 'SET_AUTO_UP_ENABLED', enabled: autoUpEnabled })
          devLog('info', `[DemoPlaylist] Playlist completed (games=${gameLimit}).`)
          return
        }

        const entry = playlist[gameIndex]
        if (!entry) {
          demoPlaybackActiveRef.current = false
          setDemoProgress(null)
          dispatch({ type: 'SET_AUTO_UP_ENABLED', enabled: autoUpEnabled })
          devLog('info', `[DemoPlaylist] Playlist completed (games=${gameIndex}).`)
          return
        }

        resetDemoRuntimeState()
        const replayState = createDemoReplayGameState(entry)
        dispatch({ type: 'HYDRATE_STATE', state: replayState, autoUpEnabled: false })
        // Device runs showed React can commit the next hydrated deal later than a
        // fixed timer after a win handoff, so start replay only once the state ref
        // actually points at this fixture.
        waitForPlaylistState({
          runId,
          description: `Game ${gameIndex + 1} hydration`,
          predicate: () => {
            const current = stateRef.current
            return (
              current.exactId === replayState.exactId &&
              current.drawCount === replayState.drawCount &&
              current.moveCount === 0 &&
              !current.hasWon &&
              current.stock.length === replayState.stock.length &&
              current.waste.length === 0
            )
          },
          onReady: () => {
            // Probe depths are derived once per game; the map keys are the
            // fixture's probe move indices.
            const probeDepths = new Map(
              getDemoUndoProbePlan(entry, gameIndex).map((probe) => [
                probe.moveIndex,
                probe.depth,
              ])
            )
            // HUD shows only game-level progress (user feedback 2026-07-06:
            // step/heap/elapsed detail was noise), so one publish per game.
            setDemoProgress({ gameIndex, gameCount: gameLimit })
            devLog(
              'info',
              `[DemoPlaylist] Game ${gameIndex + 1}/${gameLimit} loaded (${entry.id}, moves=${entry.moves.length}, undoProbes=${entry.undoProbeMoveIndices.length}).`
            )
            schedulePlaylistTimer(() => {
              playStep(entry, gameIndex, 0, probeDepths)
            }, DEMO_AUTO_STEP_INTERVAL_MS)
          },
        })
      }

      const playStep = (
        entry: DemoAutoSolvePlaylistEntry,
        gameIndex: number,
        moveIndex: number,
        probeDepths: ReadonlyMap<number, number>
      ) => {
        if (playlistRunIdRef.current !== runId) {
          return
        }

        const move = entry.moves[moveIndex]
        if (!move) {
          schedulePlaylistTimer(() => {
            if (!stateRef.current.hasWon) {
              failPlaylist(
                runId,
                `Game ${gameIndex + 1}/${gameLimit} finished replay without a win.`
              )
              return
            }
            devLog(
              'info',
              `[DemoPlaylist] Game ${gameIndex + 1}/${gameLimit} completed (moves=${stateRef.current.moveCount}).`
            )
            loadGame(gameIndex + 1)
          }, DEMO_PLAYLIST_BETWEEN_GAMES_MS)
          return
        }

        const beforeMoveCount = stateRef.current.moveCount
        const resolved = resolveDemoReplayAction(stateRef.current, move)
        if (!resolved.ok) {
          failPlaylist(
            runId,
            `Game ${gameIndex + 1} step ${moveIndex + 1}/${entry.moves.length}: ${resolved.reason}`
          )
          return
        }

        dispatchGameAction(applyHistoryPreference(resolved.action))
        waitForPlaylistState({
          runId,
          description: `Game ${gameIndex + 1} step ${moveIndex + 1}`,
          predicate: () => stateRef.current.moveCount > beforeMoveCount,
          onReady: () => {
            // Probes need reducer history snapshots, so they only run when
            // history recording is on (unchanged from the single-step version).
            const plannedDepth = shouldRecordHistory
              ? (probeDepths.get(moveIndex) ?? 0)
              : 0
            if (plannedDepth <= 0) {
              playStep(entry, gameIndex, moveIndex + 1, probeDepths)
              return
            }
            runUndoProbe(entry, gameIndex, moveIndex, plannedDepth, probeDepths)
          },
        })
      }

      // Back-and-forth undo probe: undo `depth` moves one by one, then replay
      // the same fixture moves forward. Undo restores the exact pre-move
      // snapshot, so each replayed move re-resolves against live state exactly
      // like first-pass replay (demo-sheet-undo-probes-info-hud scope 2).
      const runUndoProbe = (
        entry: DemoAutoSolvePlaylistEntry,
        gameIndex: number,
        moveIndex: number,
        plannedDepth: number,
        probeDepths: ReadonlyMap<number, number>
      ) => {
        // getDemoUndoProbePlan already clamps against moveIndex; clamping against
        // live history length too keeps a bad plan from underflowing undo.
        const depth = Math.min(plannedDepth, stateRef.current.history.length)
        if (depth <= 0) {
          playStep(entry, gameIndex, moveIndex + 1, probeDepths)
          return
        }

        devLog(
          'info',
          `[DemoPlaylist] Undo probe at game ${gameIndex + 1}, step ${moveIndex + 1} (depth ${depth}).`
        )

        const replayForward = (replayIndex: number) => {
          if (replayIndex > moveIndex) {
            playStep(entry, gameIndex, moveIndex + 1, probeDepths)
            return
          }

          const replayMove = entry.moves[replayIndex]
          if (!replayMove) {
            failPlaylist(
              runId,
              `Game ${gameIndex + 1} undo probe at step ${moveIndex + 1} (depth ${depth}): missing replay move ${replayIndex + 1}.`
            )
            return
          }

          const beforeReplayMoveCount = stateRef.current.moveCount
          const replayResolved = resolveDemoReplayAction(stateRef.current, replayMove)
          if (!replayResolved.ok) {
            failPlaylist(
              runId,
              `Game ${gameIndex + 1} undo probe at step ${moveIndex + 1} (depth ${depth}), replay of step ${replayIndex + 1}: ${replayResolved.reason}`
            )
            return
          }
          dispatchGameAction(applyHistoryPreference(replayResolved.action))
          waitForPlaylistState({
            runId,
            description: `Game ${gameIndex + 1} undo probe replay ${replayIndex + 1} (depth ${depth})`,
            predicate: () => stateRef.current.moveCount > beforeReplayMoveCount,
            onReady: () => {
              replayForward(replayIndex + 1)
            },
          })
        }

        const undoOnce = (remaining: number) => {
          if (remaining <= 0) {
            replayForward(moveIndex - depth + 1)
            return
          }
          const beforeHistoryLength = stateRef.current.history.length
          dispatchGameAction({ type: 'UNDO' })
          waitForPlaylistState({
            runId,
            description: `Game ${gameIndex + 1} undo probe at step ${moveIndex + 1}, undo ${depth - remaining + 1}/${depth}`,
            predicate: () => stateRef.current.history.length < beforeHistoryLength,
            onReady: () => {
              undoOnce(remaining - 1)
            },
          })
        }

        undoOnce(depth)
      }

      loadGame(0)
    },
    [
      clearPlaylistTimers,
      autoUpEnabled,
      demoPlaybackActiveRef,
      dispatch,
      dispatchGameAction,
      failPlaylist,
      resetDemoRuntimeState,
      schedulePlaylistTimer,
      stateRef,
      waitForPlaylistState,
    ]
  )

  const runDemoSequence = useCallback(
    (options?: { autoReveal?: boolean; autoSolve?: boolean }) => {
      const steps: Array<() => void> = []

      const pushTableauSequence = (
        columnIndex: number,
        suit: Suit,
        moveCount: number
      ) => {
        for (let moveIndex = 0; moveIndex < moveCount; moveIndex += 1) {
          steps.push(() => {
            const column = stateRef.current.tableau[columnIndex] ?? []
            const topCardIndex = column.length - 1
            if (topCardIndex < 0) {
              return
            }
            const selection: Selection = {
              source: 'tableau',
              columnIndex,
              cardIndex: topCardIndex,
            }
            dispatchGameAction({
              type: 'APPLY_MOVE',
              selection,
              target: { type: 'foundation', suit },
              recordHistory: false,
            })
          })
        }
      }

      if (options?.autoReveal) {
        pushTableauSequence(0, 'hearts', 3)
        pushTableauSequence(1, 'diamonds', 3)
        pushTableauSequence(4, 'hearts', 5)
        pushTableauSequence(5, 'diamonds', 5)
      }

      if (options?.autoSolve) {
        pushTableauSequence(0, 'hearts', 3)
        pushTableauSequence(1, 'diamonds', 3)
        pushTableauSequence(4, 'hearts', 5)
        pushTableauSequence(5, 'diamonds', 5)
        pushTableauSequence(2, 'clubs', 13)
        pushTableauSequence(3, 'spades', 13)

        const pushStockToFoundation = (suit: Suit, drawCount: number) => {
          for (let index = 0; index < drawCount; index += 1) {
            steps.push(() => {
              // PBI-14-4: Route draws through the flight controller so stock→waste origins are snapshot-gated.
              dispatchGameAction({ type: 'DRAW_OR_RECYCLE' })
            })
            steps.push(() => {
              dispatchGameAction({
                type: 'APPLY_MOVE',
                selection: { source: 'waste' },
                target: { type: 'foundation', suit },
                recordHistory: false,
              })
            })
          }
        }

        pushStockToFoundation('hearts', 5)
        pushStockToFoundation('diamonds', 5)
      }

      if (!steps.length) {
        return
      }

      devLog('info', `[Demo] Auto sequence queued ${steps.length} steps.`)

      steps.forEach((step, index) => {
        setTimeout(step, DEMO_AUTO_STEP_INTERVAL_MS * (index + 1))
      })

      const finalStepIndex = steps.length - 1
      if (finalStepIndex >= 0) {
        setTimeout(
          () => {
            devLog('info', '[Demo] Auto sequence completed dispatch queue.')
          },
          DEMO_AUTO_STEP_INTERVAL_MS * (finalStepIndex + 2)
        )
      }
    },
    [dispatchGameAction, stateRef]
  )

  const handleLaunchDemoGame = useCallback(
    (options?: LaunchDemoGameOptions) => {
      const forceLaunch = options?.force === true
      if (!developerModeEnabled && !forceLaunch) {
        return
      }
      if (forceLaunch && !developerModeEnabled) {
        setDeveloperMode(true)
      }
      if (boardLockedRef.current && !forceLaunch) {
        return
      }

      // Clear stale HUD progress on every demo (re)launch; playlist runs
      // re-publish once their first game is hydrated, the old demo stays clear.
      setDemoProgress(null)

      recordCurrentGameResult()
      resetDemoRuntimeState()

      const demoMode: DemoLaunchMode =
        options?.demoMode ?? (options?.autoSolve ? 'playlist' : 'old')

      if (demoMode === 'playlist' || demoMode === 'single') {
        runDemoPlaylist({
          // Undefined gameLimit means "full playlist"; runDemoPlaylist clamps it.
          gameLimit: demoMode === 'single' ? 1 : options?.gameLimit,
          recordHistory: options?.recordHistory,
        })
        devLog(
          'info',
          '[Demo] Game loaded (options=' + JSON.stringify(options ?? {}) + ')'
        )

        void clearGameState().catch((error) => {
          console.warn('Failed to clear persisted game before demo playlist', error)
        })
        return
      }

      clearPlaylistTimers()
      demoPlaybackActiveRef.current = false

      if (demoMode === 'scrubbed') {
        // Deterministic "far game, scrubbed to middle" fixture for scrubber/
        // undo/redo tests (scrubber-test-automation): 40 undos + 40 redos
        // available, exact same board every launch. Auto Up stays OFF so no
        // auto-queue mutates depths underneath a test's assertions.
        let scrubbedState: GameState
        try {
          scrubbedState = createScrubbedMidGameState()
        } catch (error) {
          // Only reachable on fixture drift (regenerated playlist); fail loudly
          // instead of hydrating a corrupt board.
          devLog('error', `[Demo] Scrubbed mid-game fixture failed: ${String(error)}`)
          return
        }
        dispatch({ type: 'HYDRATE_STATE', state: scrubbedState, autoUpEnabled: false })

        devLog(
          'info',
          '[Demo] Game loaded (options=' + JSON.stringify(options ?? {}) + ')'
        )

        // Same pattern as the other branches: drop the previous persisted game;
        // the debounced save then persists the hydrated scrubbed state.
        void clearGameState().catch((error) => {
          console.warn('Failed to clear persisted game before scrubbed demo', error)
        })
        return
      }

      // Plain handcrafted demo games mirror the player's chosen draw setting; the
      // solver playlist above owns its own Draw 1 fixture state.
      const demoDrawCount = preferredDrawCount
      const demoState = createDemoGameState(demoDrawCount)
      dispatch({ type: 'HYDRATE_STATE', state: demoState })

      devLog('info', '[Demo] Game loaded (options=' + JSON.stringify(options ?? {}) + ')')

      void clearGameState().catch((error) => {
        console.warn('Failed to clear persisted game before demo deal', error)
      })

      const shouldAutoReveal = options?.autoReveal
      if (shouldAutoReveal) {
        setTimeout(() => {
          runDemoSequence({ autoReveal: shouldAutoReveal, autoSolve: options?.autoSolve })
        }, DEMO_AUTO_STEP_INTERVAL_MS)
      }
    },
    [
      boardLockedRef,
      clearGameState,
      clearPlaylistTimers,
      demoPlaybackActiveRef,
      developerModeEnabled,
      dispatch,
      preferredDrawCount,
      recordCurrentGameResult,
      resetDemoRuntimeState,
      runDemoSequence,
      runDemoPlaylist,
      setDeveloperMode,
    ]
  )

  // --- Demo deep links (moved here from useKlondikeGame, clean-code review #11:
  // all demo entry points live in this hook). Parses soli://demo-game style URLs
  // and launches the matching demo mode.
  const lastDemoLinkRef = useRef<string | null>(null)

  const processDemoLink = useCallback(
    (incomingUrl: string | null | undefined) => {
      if (!incomingUrl) {
        return
      }
      if (lastDemoLinkRef.current === incomingUrl) {
        return
      }

      let parsed: URL
      try {
        parsed = new URL(incomingUrl)
      } catch {
        return
      }

      const host = parsed.host.toLowerCase()
      const pathname = parsed.pathname.toLowerCase()
      const demoParam =
        parsed.searchParams.get('demo') ?? parsed.searchParams.get('demoGame')
      const normalizedDemoParam = demoParam?.toLowerCase()
      const demoRequestsPlaylist =
        normalizedDemoParam === 'playlist' ||
        normalizedDemoParam === 'autosolve-playlist' ||
        normalizedDemoParam === 'autosolveplaylist'
      const demoRequestsAutoSolve =
        demoRequestsPlaylist ||
        normalizedDemoParam === 'autosolve' ||
        normalizedDemoParam === 'solve'
      const demoRequestsAutoReveal =
        demoRequestsAutoSolve ||
        normalizedDemoParam === 'autoreveal' ||
        normalizedDemoParam === 'auto'
      // soli://demo-game?demo=scrubbed → deterministic mid-game state; lets
      // automated tests enter the scrubbed fixture with zero UI taps.
      const demoRequestsScrubbed = normalizedDemoParam === 'scrubbed'
      const recordHistoryParam =
        parsed.searchParams.get('recordHistory') ?? parsed.searchParams.get('history')
      const nextRecordHistoryEnabled = parseOptionalBooleanParam(recordHistoryParam)

      if (
        host === 'demo-game' ||
        pathname === '/demo-game' ||
        pathname === '/demo' ||
        demoParam === '1' ||
        normalizedDemoParam === 'true' ||
        demoRequestsAutoReveal ||
        demoRequestsScrubbed
      ) {
        lastDemoLinkRef.current = incomingUrl

        if (demoRequestsScrubbed) {
          if (!developerModeEnabled) {
            setDeveloperMode(true)
          }
          setTimeout(() => {
            handleLaunchDemoGame({ demoMode: 'scrubbed', force: true })
          }, DEMO_AUTO_STEP_INTERVAL_MS)
          return
        }

        const autoParam =
          parsed.searchParams.get('auto') ?? parsed.searchParams.get('autoreveal')
        const solveParam =
          parsed.searchParams.get('solve') ?? parsed.searchParams.get('autosolve')
        const gameLimitParam =
          parsed.searchParams.get('games') ??
          parsed.searchParams.get('gameLimit') ??
          parsed.searchParams.get('count')
        const parsedGameLimit = Number(gameLimitParam ?? '')
        const gameLimit =
          Number.isInteger(parsedGameLimit) && parsedGameLimit > 0
            ? parsedGameLimit
            : undefined
        const autoSolve =
          demoRequestsAutoSolve ||
          solveParam === '1' ||
          solveParam?.toLowerCase() === 'true'
        const autoReveal =
          demoRequestsAutoReveal ||
          autoSolve ||
          autoParam === '1' ||
          autoParam?.toLowerCase() === 'true'

        if (!developerModeEnabled) {
          setDeveloperMode(true)
        }

        setTimeout(() => {
          handleLaunchDemoGame({
            autoReveal,
            autoSolve,
            force: true,
            gameLimit,
            recordHistory: nextRecordHistoryEnabled ?? undefined,
          })
        }, DEMO_AUTO_STEP_INTERVAL_MS)
      }
    },
    [developerModeEnabled, handleLaunchDemoGame, setDeveloperMode]
  )

  // Subscribes to demo deep links on mount and while the app is active.
  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      processDemoLink(url)
    })

    const subscription = Linking.addEventListener('url', ({ url }) => {
      processDemoLink(url)
    })

    return () => {
      subscription.remove()
    }
  }, [processDemoLink])

  return { handleLaunchDemoGame }
}
