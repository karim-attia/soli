import { useCallback, useEffect, useRef } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
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
  resolveDemoReplayAction,
  type DemoAutoSolvePlaylistEntry,
} from '../../../solitaire/demoReplay'
import {
  demoAutoSolvePlaylist,
  DEMO_AUTO_SOLVE_PLAYLIST_TOTAL,
} from '../../../data/demoAutoSolvePlaylist'
import { devLog } from '../../../utils/devLogger'

type DispatchWithFlightFn = (action: GameAction, selection?: Selection | null) => void
export type DemoLaunchMode = 'old' | 'single' | 'playlist'

type UseDemoGameLauncherOptions = {
  stateRef: MutableRefObject<GameState>
  dispatch: Dispatch<GameAction>
  dispatchWithFlight: DispatchWithFlightFn
  developerModeEnabled: boolean
  setDeveloperMode: (enabled: boolean) => void
  boardLockedRef: MutableRefObject<boolean>
  clearCelebrationDialogTimer: () => void
  recordCurrentGameResult: (options?: { solved?: boolean }) => void
  setCelebrationState: Dispatch<SetStateAction<any>>
  resetCardFlights: () => void
  foundationLayoutsRef: MutableRefObject<Partial<Record<Suit, LayoutRectangle>>>
  topRowLayoutRef: MutableRefObject<LayoutRectangle | null>
  winCelebrationsRef: MutableRefObject<number>
  // Tracks the current active history row while the demo replaces the live game.
  currentGameEntryIdRef: MutableRefObject<string | null>
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

export const useDemoGameLauncher = ({
  stateRef,
  dispatch,
  dispatchWithFlight,
  developerModeEnabled,
  setDeveloperMode,
  boardLockedRef,
  clearCelebrationDialogTimer,
  recordCurrentGameResult,
  setCelebrationState,
  resetCardFlights,
  foundationLayoutsRef,
  topRowLayoutRef,
  winCelebrationsRef,
  currentGameEntryIdRef,
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
    resetCardFlights()
    foundationLayoutsRef.current = {}
    topRowLayoutRef.current = null
    winCelebrationsRef.current = 0
    currentGameEntryIdRef.current = null
    updateBoardLocked(false)
  }, [
    clearCelebrationDialogTimer,
    currentGameEntryIdRef,
    foundationLayoutsRef,
    resetCardFlights,
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
      const gameLimit = Math.max(
        1,
        Math.min(
          options.gameLimit ?? DEMO_AUTO_SOLVE_PLAYLIST_TOTAL,
          DEMO_AUTO_SOLVE_PLAYLIST_TOTAL
        )
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
          dispatch({ type: 'SET_AUTO_UP_ENABLED', enabled: autoUpEnabled })
          devLog('info', `[DemoPlaylist] Playlist completed (games=${gameLimit}).`)
          return
        }

        const entry = demoAutoSolvePlaylist[gameIndex]
        if (!entry) {
          demoPlaybackActiveRef.current = false
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
            devLog(
              'info',
              `[DemoPlaylist] Game ${gameIndex + 1}/${gameLimit} loaded (${entry.id}, moves=${entry.moves.length}, undoProbes=${entry.undoProbeMoveIndices.length}).`
            )
            schedulePlaylistTimer(() => {
              playStep(entry, gameIndex, 0)
            }, DEMO_AUTO_STEP_INTERVAL_MS)
          },
        })
      }

      const playStep = (
        entry: DemoAutoSolvePlaylistEntry,
        gameIndex: number,
        moveIndex: number
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

        dispatchWithFlight(applyHistoryPreference(resolved.action), resolved.selection)
        waitForPlaylistState({
          runId,
          description: `Game ${gameIndex + 1} step ${moveIndex + 1}`,
          predicate: () => stateRef.current.moveCount > beforeMoveCount,
          onReady: () => {
            if (!shouldRecordHistory || !entry.undoProbeMoveIndices.includes(moveIndex)) {
              playStep(entry, gameIndex, moveIndex + 1)
              return
            }

            const beforeUndoHistoryLength = stateRef.current.history.length
            devLog(
              'info',
              `[DemoPlaylist] Undo probe at game ${gameIndex + 1}, step ${moveIndex + 1}.`
            )
            dispatchWithFlight({ type: 'UNDO' })
            waitForPlaylistState({
              runId,
              description: `Game ${gameIndex + 1} undo probe ${moveIndex + 1}`,
              predicate: () => stateRef.current.history.length < beforeUndoHistoryLength,
              onReady: () => {
                const beforeReplayMoveCount = stateRef.current.moveCount
                const replayResolved = resolveDemoReplayAction(stateRef.current, move)
                if (!replayResolved.ok) {
                  failPlaylist(
                    runId,
                    `Game ${gameIndex + 1} replay after undo at step ${moveIndex + 1}: ${replayResolved.reason}`
                  )
                  return
                }
                dispatchWithFlight(
                  applyHistoryPreference(replayResolved.action),
                  replayResolved.selection
                )
                waitForPlaylistState({
                  runId,
                  description: `Game ${gameIndex + 1} replay after undo ${moveIndex + 1}`,
                  predicate: () => stateRef.current.moveCount > beforeReplayMoveCount,
                  onReady: () => {
                    playStep(entry, gameIndex, moveIndex + 1)
                  },
                })
              },
            })
          },
        })
      }

      loadGame(0)
    },
    [
      clearPlaylistTimers,
      autoUpEnabled,
      demoPlaybackActiveRef,
      dispatch,
      dispatchWithFlight,
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
            dispatchWithFlight(
              {
                type: 'APPLY_MOVE',
                selection,
                target: { type: 'foundation', suit },
                recordHistory: false,
              },
              selection
            )
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
              dispatchWithFlight({ type: 'DRAW_OR_RECYCLE' })
            })
            steps.push(() => {
              dispatchWithFlight(
                {
                  type: 'APPLY_MOVE',
                  selection: { source: 'waste' },
                  target: { type: 'foundation', suit },
                  recordHistory: false,
                },
                { source: 'waste' }
              )
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
    [dispatchWithFlight, stateRef]
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

      recordCurrentGameResult()
      resetDemoRuntimeState()

      const demoMode: DemoLaunchMode =
        options?.demoMode ?? (options?.autoSolve ? 'playlist' : 'old')

      if (demoMode === 'playlist' || demoMode === 'single') {
        runDemoPlaylist({
          gameLimit:
            demoMode === 'single'
              ? 1
              : (options?.gameLimit ?? DEMO_AUTO_SOLVE_PLAYLIST_TOTAL),
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

  return { handleLaunchDemoGame }
}
