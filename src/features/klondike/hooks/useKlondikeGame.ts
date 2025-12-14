import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import {
  Alert,
  LayoutChangeEvent,
  LayoutRectangle,
  Linking,
  Platform,
  useColorScheme,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  createInitialState,
  createSolvableGameState,
  findAutoMoveTarget,
  getDropHints,
  klondikeReducer,
  type GameAction,
  type GameSnapshot,
  type GameState,
  type Selection,
  type Suit,
} from '../../../solitaire/klondike'
import { useFlightController } from '../../../animation/flightController'
import { devLog } from '../../../utils/devLogger'
import { computeElapsedWithReference } from '../../../utils/time'
import { clearGameState } from '../../../storage/gamePersistence'
import {
  createHistoryPreviewFromState,
  formatShuffleDisplayName,
  useHistory,
} from '../../../state/history'
import { useAnimationToggles, useSettings } from '../../../state/settings'
import {
  COLUMN_MARGIN,
  EDGE_GUTTER,
  COLOR_FELT_LIGHT,
  COLOR_FELT_DARK,
} from '../constants'
import { EMPTY_INVALID_WIGGLE, type CardMetrics, type InvalidWiggleConfig } from '../types'
import { computeCardMetrics } from '../utils/cardMetrics'
import { useKlondikeTimer } from './useKlondikeTimer'
import { useKlondikePersistence } from './useKlondikePersistence'
import { useSolvableShuffleSelector } from './useSolvableShuffleSelector'
import { useCelebrationController } from './useCelebrationController'
import { useUndoScrubber } from './useUndoScrubber'
import {
  useDemoGameLauncher,
  DEMO_AUTO_STEP_INTERVAL_MS,
} from './useDemoGameLauncher'
import { useAutoQueueRunner } from './useAutoQueueRunner'
import type { KlondikeGameViewProps } from '../components/KlondikeGameView'
import { buildStatisticsRows, type StatisticsRow } from '../components/StatisticsHud'
import type { UndoScrubberProps } from '../components/UndoScrubber'
import type { TopRowProps } from '../components/cards/TopRow'
import type { TableauSectionProps } from '../components/cards/TableauSection'
import { loadBoardMetrics, saveBoardMetrics } from '../../../storage/uiPreferences'

type RequestNewGameFn = (options?: { reason?: 'manual' | 'celebration' }) => void

// PBI-28: Run auto-up (auto-complete) much faster than manual play cadence.
const AUTO_QUEUE_INTERVAL_MS = 25
const AUTO_QUEUE_MOVE_DELAY_MS = 35

// Maps a selection descriptor to the card IDs required for animation-flight tracking.
// The flight controller waits for these IDs to have layout snapshots before animating moves.
// Auto-move, waste taps, and auto-complete still raise selections even after manual selection removal.
function collectSelectionCardIds(state: GameState, selection?: Selection | null): string[] {
  if (!selection) {
    return []
  }

  if (selection.source === 'waste') {
    const topWaste = state.waste[state.waste.length - 1]
    return topWaste ? [topWaste.id] : []
  }

  if (selection.source === 'foundation') {
    const topFoundation = state.foundations[selection.suit][state.foundations[selection.suit].length - 1]
    return topFoundation ? [topFoundation.id] : []
  }

  if (selection.source === 'tableau') {
    const column = state.tableau[selection.columnIndex] ?? []
    return column.slice(selection.cardIndex).map((card) => card.id)
  }

  return []
}

type CardSignatureSnapshot = Pick<GameSnapshot, 'stock' | 'waste' | 'foundations' | 'tableau'>

const buildCardSignatureMap = (snapshot: CardSignatureSnapshot): Map<string, string> => {
  const map = new Map<string, string>()

  snapshot.stock.forEach((card, index) => {
    map.set(card.id, `stock:${index}:${card.faceUp ? 1 : 0}`)
  })

  snapshot.waste.forEach((card, index) => {
    map.set(card.id, `waste:${index}:${card.faceUp ? 1 : 0}`)
  })

  Object.entries(snapshot.foundations).forEach(([suit, cards]) => {
    cards.forEach((card, index) => {
      map.set(card.id, `foundation:${suit}:${index}:${card.faceUp ? 1 : 0}`)
    })
  })

  snapshot.tableau.forEach((column, columnIndex) => {
    column.forEach((card, cardIndex) => {
      map.set(card.id, `tableau:${columnIndex}:${cardIndex}:${card.faceUp ? 1 : 0}`)
    })
  })

  return map
}

const collectChangedCardIds = (current: GameState, target: GameSnapshot): string[] => {
  const currentMap = buildCardSignatureMap(current)
  const targetMap = buildCardSignatureMap(target)
  const changed: string[] = []

  for (const [cardId, currentSignature] of currentMap.entries()) {
    const targetSignature = targetMap.get(cardId)
    if (targetSignature !== currentSignature) {
      changed.push(cardId)
    }
  }

  for (const cardId of targetMap.keys()) {
    if (!currentMap.has(cardId)) {
      changed.push(cardId)
    }
  }

  return changed
}

type UseKlondikeGameResult = {
  developerModeEnabled: boolean
  requestNewGame: RequestNewGameFn
  handleLaunchDemoGame: (options?: { autoReveal?: boolean; autoSolve?: boolean; force?: boolean }) => void
  viewProps: KlondikeGameViewProps
}

// Provides the stateful container for the Klondike screen, exposing navigation callbacks and view props.
export const useKlondikeGame = (): UseKlondikeGameResult => {
  const [state, dispatch] = useReducer(klondikeReducer, undefined, createInitialState)
  const [boardLayout, setBoardLayout] = useState<{ width: number | null; height: number | null }>({
    width: null,
    height: null,
  })

  useEffect(() => {
    let cancelled = false

    const hydrateBoardMetrics = async () => {
      const stored = await loadBoardMetrics()
      if (cancelled || !stored) {
        return
      }

      setBoardLayout((previous) => ({
        width: previous.width ?? stored.width ?? previous.width,
        height: previous.height ?? stored.height ?? previous.height,
      }))
    }

    void hydrateBoardMetrics()

    return () => {
      cancelled = true
    }
  }, [])

  const cardMetrics = useMemo(() => computeCardMetrics(boardLayout.width), [boardLayout.width])
  const safeArea = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const feltBackground = colorScheme === 'dark' ? COLOR_FELT_DARK : COLOR_FELT_LIGHT

  const { state: settingsState, hydrated: settingsHydrated, setDeveloperMode } = useSettings()
  const { showMoves, showTime } = settingsState.statistics
  const solvableGamesOnly = settingsState.solvableGamesOnly
  const developerModeEnabled = settingsState.developerMode

  const animationToggles = useAnimationToggles()
  const { entries: historyEntries, recordResult, updateEntry } = useHistory()
  const {
    master: animationsEnabled,
    cardFlights: cardFlightsEnabled,
    invalidMoveWiggle: invalidWiggleEnabled,
    celebrations: celebrationAnimationsEnabled,
  } = animationToggles

  // Precomputes drop targets for auto-move and hint rendering.
  const dropHints = useMemo(() => getDropHints(state), [state])

  // Builds the statistics badges based on current settings and elapsed time.
  const { moveCount, elapsedMs, timerState, timerStartedAt } = state

  const statisticsRows: StatisticsRow[] = useMemo(() => {
    if (!showMoves && !showTime) {
      return []
    }
    return buildStatisticsRows({
      showMoves,
      showTime,
      moveCount,
      elapsedMs,
      timerState,
      timerStartedAt,
    })
  }, [elapsedMs, moveCount, showMoves, showTime, timerStartedAt, timerState])

  const headerPadding = useMemo(
    () => ({
      top: EDGE_GUTTER,
      left: safeArea.left + COLUMN_MARGIN,
      right: safeArea.right + COLUMN_MARGIN,
    }),
    [safeArea.left, safeArea.right],
  )

  const autoCompleteRunsRef = useRef(state.autoCompleteRuns)
  const winCelebrationsRef = useRef(state.winCelebrations)
  const stateRef = useRef(state)
  // Task 10-6: Track the current game's history entry ID for updates
  const currentGameEntryIdRef = useRef<string | null>(null)
  const previousHasWonRef = useRef(state.hasWon)
  const requestNewGameRef = useRef<RequestNewGameFn | null>(null)
  const currentStartingPreviewRef = useRef(createHistoryPreviewFromState(state))
  const currentDisplayNameRef = useRef(formatShuffleDisplayName(state.shuffleId))
  const topRowLayoutRef = useRef<LayoutRectangle | null>(null)
  const foundationLayoutsRef = useRef<Partial<Record<Suit, LayoutRectangle>>>({})
  const boardLockedRef = useRef(false)
  const lastDemoLinkRef = useRef<string | null>(null)
  const [boardLocked, setBoardLocked] = useState(false)

  // Synchronizes the board-locked flag between refs and React state.
  const updateBoardLocked = useCallback((locked: boolean) => {
    boardLockedRef.current = locked
    setBoardLocked(locked)
  }, [])

  // Stores the top-row layout for later celebration positioning.
  const handleTopRowLayout = useCallback((layout: LayoutRectangle) => {
    topRowLayoutRef.current = layout
  }, [])

  // Caches foundation layouts so celebration trajectories know their origins.
  const handleFoundationLayout = useCallback((suit: Suit, layout: LayoutRectangle) => {
    foundationLayoutsRef.current[suit] = layout
  }, [])

  // Provides the flight controller with a stable resolver for fetching selection card IDs.
  const resolveSelectionCardIds = useCallback(
    (selection?: Selection | null) => collectSelectionCardIds(stateRef.current, selection),
    [],
  )

  // Manages layout snapshot tracking for card-flight animations.
  const {
    cardFlights,
    cardFlightMemoryRef,
    registerSnapshot: handleCardMeasured,
    ensureReady: ensureCardFlightsReady,
    reset: resetCardFlights,
    dispatchWithFlight: dispatchWithFlightInternal,
  } = useFlightController({
    enabled: cardFlightsEnabled,
    waitTimeoutMs: 160,
    getSelectionCardIds: resolveSelectionCardIds,
  })

  // Hook: drive the Klondike timer lifecycle (start/pause/tick) away from the main component.
  useKlondikeTimer({ state, dispatch, stateRef })

  // Hook: hydrate and persist game state via AsyncStorage once per relevant change.
  useKlondikePersistence({ state, dispatch, resetCardFlights, previousHasWonRef })

  // Hook: pick the next solvable shuffle weighted by prior play history when needed.
  const selectNextSolvableShuffle = useSolvableShuffleSelector(historyEntries)

  // Hook: own the celebration animation lifecycle and bindings.
  const {
    celebrationState,
    setCelebrationState,
    celebrationBindings,
    celebrationLabel,
    handleCelebrationAbort,
    clearCelebrationDialogTimer,
  } = useCelebrationController({
    state,
    developerModeEnabled,
    animationsEnabled,
    celebrationAnimationsEnabled,
    boardLayout,
    cardMetrics,
    foundationLayoutsRef,
    topRowLayoutRef,
    ensureCardFlightsReady,
    updateBoardLocked,
    winCelebrationsRef,
    requestNewGameRef,
  })

  // Deals a new game, respecting solvable-only settings and history bookkeeping.
  const dealNewGame = useCallback(() => {
    if (settingsHydrated && solvableGamesOnly) {
      const solvableShuffle = selectNextSolvableShuffle()
      if (solvableShuffle) {
        const solvableState = createSolvableGameState(solvableShuffle)
        const solvablePreview = createHistoryPreviewFromState(solvableState)
        const solvableDisplayName = formatShuffleDisplayName(solvableState.shuffleId)

        currentStartingPreviewRef.current = solvablePreview
        currentDisplayNameRef.current = solvableDisplayName

        // Task 10-6: Store entry ID for later updates when game ends
        const entryId = recordResult({
          shuffleId: solvableState.shuffleId,
          solved: false,
          solvable: true,
          startedAt: new Date().toISOString(),
          finishedAt: null, // Not finished yet
          moves: 0,
          durationMs: 0,
          preview: solvablePreview,
          displayName: solvableDisplayName,
          status: 'active',
        })
        currentGameEntryIdRef.current = entryId

        dispatch({ type: 'HYDRATE_STATE', state: solvableState })
        return
      }
    }

    dispatch({ type: 'NEW_GAME' })
    currentGameEntryIdRef.current = null
  }, [
    dispatch,
    recordResult,
    selectNextSolvableShuffle,
    settingsHydrated,
    solvableGamesOnly,
  ])

  // Task 10-6: Updates or records game result in history
  const recordCurrentGameResult = useCallback(
    (options?: { solved?: boolean }) => {
      const state = stateRef.current
      if (!state.shuffleId) {
        return
      }

      const solved = options?.solved ?? state.hasWon
      const status = solved ? 'solved' : 'incomplete'
      const elapsedForRecord = computeElapsedWithReference(
        state.elapsedMs,
        state.timerState,
        state.timerStartedAt,
        Date.now(),
      )

      // Task 10-6: finishedAt only set when solved, null for incomplete
      const finishedAt = solved ? new Date().toISOString() : null

      // If we have a tracked entry ID, update it; otherwise create new
      if (currentGameEntryIdRef.current) {
        updateEntry(currentGameEntryIdRef.current, {
          solved,
          status,
          moves: state.moveCount,
          durationMs: elapsedForRecord,
          finishedAt,
          preview: createHistoryPreviewFromState(state),
        })
        currentGameEntryIdRef.current = null
      } else {
        // No tracked entry - only record if there's been meaningful play
        if (!solved && state.moveCount === 0) {
          return
        }
        recordResult({
          shuffleId: state.shuffleId,
          solved,
          solvable: Boolean(state.solvableId),
          startedAt: new Date().toISOString(), // Best approximation when no tracked entry
          finishedAt,
          moves: state.moveCount,
          durationMs: elapsedForRecord,
          preview: createHistoryPreviewFromState(state),
          displayName: currentDisplayNameRef.current,
          status,
        })
      }
    },
    [recordResult, updateEntry],
  )

  const [invalidWiggle, setInvalidWiggle] = useState<InvalidWiggleConfig>(() => ({
    ...EMPTY_INVALID_WIGGLE,
    lookup: new Set<string>(),
  }))

  // Dispatches game actions via the flight controller while respecting board locks.
  const dispatchWithFlight = useCallback(
    (action: GameAction, selection?: Selection | null) => {
      if (boardLockedRef.current) {
        return
      }
      // PBI-14-4: Some actions (draw/undo) have no `Selection`; infer the affected card IDs for snapshot gating.
      const current = stateRef.current
      const inferredCardIds =
        action.type === 'DRAW_OR_RECYCLE' && !selection
          ? current.stock.length
            ? [current.stock[current.stock.length - 1].id]
            : []
          : action.type === 'UNDO' && !selection
            ? current.history.length
              ? collectChangedCardIds(current, current.history[current.history.length - 1])
              : []
            : action.type === 'ADVANCE_AUTO_QUEUE' && !selection
              ? (() => {
                  const queued = current.autoQueue[0]
                  if (!queued) {
                    return []
                  }
                  if (queued.type === 'draw') {
                    return current.stock.length ? [current.stock[current.stock.length - 1].id] : []
                  }
                  if (queued.type === 'recycle') {
                    const topWaste = current.waste[current.waste.length - 1]
                    return topWaste ? [topWaste.id] : []
                  }
                  return []
                })()
            : undefined

      if (action.type === 'APPLY_MOVE' && action.target?.type === 'foundation') {
        const destination = action.target.suit
        const sourceLabel = selection
          ? selection.source === 'tableau'
            ? `tableau:${selection.columnIndex}`
            : selection.source
          : 'unknown'
        // devLog('info', `[Game] Dispatch APPLY_MOVE → foundation:${destination} from ${sourceLabel}`)
      }
      dispatchWithFlightInternal({ action, selection, cardIds: inferredCardIds, dispatch })
    },
    [dispatch, dispatchWithFlightInternal],
  )

  const { handleLaunchDemoGame } = useDemoGameLauncher({
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
    updateBoardLocked,
    clearGameState,
  })

  // Triggers the invalid-move wiggle animation for the provided selection.
  const triggerInvalidSelectionWiggle = useCallback(
    (selection?: Selection | null) => {
      const ids = collectSelectionCardIds(state, selection)
      if (!ids.length) {
        return
      }
      setInvalidWiggle({
        key: Date.now(),
        lookup: new Set(ids),
      })
    },
    [state],
  )

  const autoPlayActive = state.isAutoCompleting || state.autoQueue.length > 0

  // Provides invalid-move feedback when actions are not allowed.
  const notifyInvalidMove = useCallback(
    (options?: { selection?: Selection | null }) => {
      if (autoPlayActive) {
        return
      }
      if (boardLockedRef.current) {
        return
      }
      triggerInvalidSelectionWiggle(options?.selection ?? null)
    },
    [autoPlayActive, triggerInvalidSelectionWiggle],
  )

  // Sets the stock button label, fading when the stock is empty.
  const drawLabel = state.stock.length ? 'Draw' : ''

  // Parses inbound deep links to trigger the demo shuffle workflow.
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
      } catch (error) {
        return
      }

      const host = parsed.host.toLowerCase()
      const pathname = parsed.pathname.toLowerCase()
      const demoParam = parsed.searchParams.get('demo') ?? parsed.searchParams.get('demoGame')

      if (
        host === 'demo-game' ||
        pathname === '/demo-game' ||
        pathname === '/demo' ||
        demoParam === '1' ||
        demoParam?.toLowerCase() === 'true'
      ) {
        lastDemoLinkRef.current = incomingUrl
        const autoParam = parsed.searchParams.get('auto') ?? parsed.searchParams.get('autoreveal')
        const solveParam = parsed.searchParams.get('solve') ?? parsed.searchParams.get('autosolve')
        const autoSolve = solveParam === '1' || solveParam?.toLowerCase() === 'true'
        const autoReveal = autoSolve || autoParam === '1' || autoParam?.toLowerCase() === 'true'

        if (!settingsState.developerMode) {
          setDeveloperMode(true)
        }

        setTimeout(() => {
          handleLaunchDemoGame({ autoReveal, autoSolve, force: true })
        }, DEMO_AUTO_STEP_INTERVAL_MS)
      }
    },
    [handleLaunchDemoGame, setDeveloperMode, settingsState.developerMode],
  )

  // Mirrors the latest reducer state into a ref for synchronous callbacks.
  useEffect(() => {
    stateRef.current = state
  }, [state])

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

  // Refreshes the cached starting preview metadata whenever a new game begins.
  useEffect(() => {
    if (state.moveCount === 0) {
      currentStartingPreviewRef.current = createHistoryPreviewFromState(state)
      currentDisplayNameRef.current = formatShuffleDisplayName(state.shuffleId)
    }
  }, [state.moveCount, state.shuffleId, state.stock.length, state.waste.length])

  // Checks if the game was freshly won to record the result.
  useEffect(() => {
    const wasWon = previousHasWonRef.current
    const isWon = state.hasWon

    if (!wasWon && isWon) {
      if (state.timerState === 'running') {
        dispatch({ type: 'TIMER_STOP', timestamp: Date.now() })
      }
      devLog(
        'info',
        `[Game] hasWon set true (moves=${state.moveCount}, winCelebrations=${state.winCelebrations}).`,
      )
      recordCurrentGameResult({ solved: true })
    }

    previousHasWonRef.current = isWon
  }, [dispatch, recordCurrentGameResult, state.hasWon, state.moveCount, state.timerState, state.winCelebrations])

  // Captures board dimensions for card metrics and celebration sizing.
  const handleBoardLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setBoardLayout((previous) => {
      if (previous.width === width && previous.height === height) {
        return previous
      }
      void saveBoardMetrics({ width, height })
      return { width, height }
    })
  }, [])

  // Handles draw/recycle presses, validating availability before dispatching.
  const handleDraw = useCallback(() => {
    const current = stateRef.current
    if (!current.stock.length && !current.waste.length) {
      notifyInvalidMove()
      return
    }
    dispatchWithFlight({ type: 'DRAW_OR_RECYCLE' })
  }, [dispatchWithFlight, notifyInvalidMove])

  // Initiates an undo action when the board is unlocked and history exists.
  const handleUndo = useCallback(() => {
    const current = stateRef.current
    if (!current.history.length) {
      notifyInvalidMove()
      return
    }
    dispatchWithFlight({ type: 'UNDO' })
  }, [dispatchWithFlight, notifyInvalidMove])

  // Presents a confirmation dialog and seeds state for a new shuffled game.
  const requestNewGame = useCallback<RequestNewGameFn>(
    (options) => {
      clearCelebrationDialogTimer()
      const reason = options?.reason ?? 'manual'
      const forced = reason === 'celebration' || boardLockedRef.current
      const buttons: Array<{
        text: string
        style?: 'default' | 'cancel' | 'destructive'
        onPress?: () => void
      }> = []

      if (forced) {
        updateBoardLocked(true)
      } else {
        buttons.push({ text: 'Cancel', style: 'cancel' })
      }

      buttons.push({
        text: 'Deal Again',
        style: forced ? 'default' : 'destructive',
        onPress: () => {
          // Task 10-6: Only record if game wasn't already won (winning already records)
          if (!stateRef.current.hasWon) {
            recordCurrentGameResult()
          }
          setCelebrationState(null)
          resetCardFlights()
          foundationLayoutsRef.current = {}
          topRowLayoutRef.current = null
          winCelebrationsRef.current = 0
          void clearGameState().catch((error) => {
            devLog('warn', 'Failed to clear persisted game before new shuffle', error)
          })
          dealNewGame()
          updateBoardLocked(false)
          devLog('log', '[Toast suppressed] New game dealt', { reason, forced })
        },
      })

      Alert.alert(
        'Start a new game?',
        forced ? 'Nice win! Ready for another round?' : 'Ready for another round?',
        buttons,
        { cancelable: !forced },
      )
    },
    [
      clearCelebrationDialogTimer,
      dealNewGame,
      recordCurrentGameResult,
      resetCardFlights,
      updateBoardLocked,
    ],
  )

  // Keeps the new-game request ref synchronized with the latest callback.
  useEffect(() => {
    requestNewGameRef.current = requestNewGame
    return () => {
      if (requestNewGameRef.current === requestNewGame) {
        requestNewGameRef.current = null
      }
    }
  }, [requestNewGame])

  // Attempts to auto-move a selection and falls back to invalid feedback on failure.
  const attemptAutoMove = useCallback(
    (selection: Selection) => {
      const target = findAutoMoveTarget(state, selection)
      if (!target) {
        notifyInvalidMove({ selection })
        return
      }
      dispatchWithFlight({ type: 'APPLY_MOVE', selection, target }, selection)
    },
    [dispatchWithFlight, notifyInvalidMove, state],
  )

  const handleWasteTap = useCallback(() => {
    attemptAutoMove({ source: 'waste' })
  }, [attemptAutoMove])

  // Attempts an auto move from a tapped foundation stack or routes a selection to the foundation.
  const handleFoundationPress = useCallback(
    (suit: Suit) => {
      if (boardLockedRef.current) {
        return
      }
      if (!state.selected) {
        if (state.foundations[suit].length) {
          attemptAutoMove({ source: 'foundation', suit })
        }
        return
      }
      if (dropHints.foundations[suit]) {
        dispatchWithFlight({ type: 'PLACE_ON_FOUNDATION', suit }, state.selected)
      } else {
        notifyInvalidMove({ selection: state.selected })
      }
    },
    [
      attemptAutoMove,
      dispatchWithFlight,
      dropHints.foundations,
      notifyInvalidMove,
      state.foundations,
      state.selected,
    ],
  )

  const {
    shouldShowUndo,
    canUndo,
    isScrubbing,
    scrubSliderValue,
    scrubSliderMax,
    undoScrubGesture,
    handleTrackMetrics,
  } = useUndoScrubber({
    state,
    boardLocked,
    celebrationActive: Boolean(celebrationState),
    safeArea: { left: safeArea.left, right: safeArea.right },
    dispatch,
    handleUndo,
  })

  // requirement 20-6: Scrubbing disables CardView layout tracking to prevent iOS cancels.
  // That means card-flight snapshots can become stale; reset them when scrubbing begins to avoid wrong flights.
  useEffect(() => {
    if (Platform.OS === 'ios' && isScrubbing) {
      resetCardFlights()
    }
  }, [isScrubbing, resetCardFlights])

  // Requirement PBI-13: persist state changes after hydration.
  useEffect(() => {
    if (state.autoCompleteRuns > autoCompleteRunsRef.current) {
      devLog('log', '[Toast suppressed] Auto-complete engaged', {
        previousRuns: autoCompleteRunsRef.current,
        runs: state.autoCompleteRuns,
      })
      autoCompleteRunsRef.current = state.autoCompleteRuns
    }
  }, [state.autoCompleteRuns])

  // Runs the auto-queue orchestrator so auto-complete advances at the configured cadence.
  useAutoQueueRunner({
    state,
    dispatchWithFlight,
    moveDelayMs: AUTO_QUEUE_MOVE_DELAY_MS,
    intervalMs: AUTO_QUEUE_INTERVAL_MS,
  })

  const topRowProps: TopRowProps = {
    state,
    drawLabel,
    onDraw: handleDraw,
    onWasteTap: handleWasteTap,
    onFoundationPress: handleFoundationPress,
    cardMetrics,
    dropHints,
    notifyInvalidMove,
    invalidWiggle: invalidWiggleEnabled ? invalidWiggle : EMPTY_INVALID_WIGGLE,
    cardFlights,
    onCardMeasured: handleCardMeasured,
    cardFlightMemory: cardFlightMemoryRef.current,
    interactionsLocked: boardLocked,
    // requirement 20-6: Reduce board churn during undo scrubbing (iOS gesture stability)
    scrubbingActive: Platform.OS === 'ios' && isScrubbing,
    hideFoundations: false,
    onTopRowLayout: handleTopRowLayout,
    onFoundationLayout: handleFoundationLayout,
    celebrationBindings,
    celebrationActive: Boolean(celebrationState),
  }

  const tableauProps: TableauSectionProps = {
    state,
    cardMetrics,
    dropHints,
    onAutoMove: attemptAutoMove,
    invalidWiggle: invalidWiggleEnabled ? invalidWiggle : EMPTY_INVALID_WIGGLE,
    cardFlights,
    onCardMeasured: handleCardMeasured,
    cardFlightMemory: cardFlightMemoryRef.current,
    interactionsLocked: boardLocked,
    // requirement 20-6: Reduce board churn during undo scrubbing (iOS gesture stability)
    scrubbingActive: Platform.OS === 'ios' && isScrubbing,
  }

  // requirement 20-6: onUndoPress removed - tap is handled by composed gesture
  const undoScrubProps: UndoScrubberProps = {
    visible: shouldShowUndo,
    isScrubbing,
    sliderValue: scrubSliderValue,
    sliderMax: scrubSliderMax,
    gesture: undoScrubGesture,
    boardLocked,
    canUndo,
    onTrackMetrics: handleTrackMetrics,
  }

  const viewProps: KlondikeGameViewProps = {
    feltBackground,
    headerPadding,
    statisticsRows,
    onBoardLayout: handleBoardLayout,
    topRowProps,
    tableauProps,
    celebrationState,
    celebrationLabel,
    celebrationBindings,
    onCelebrationAbort: handleCelebrationAbort,
    undoScrubProps,
  }

  return {
    developerModeEnabled,
    requestNewGame,
    handleLaunchDemoGame,
    viewProps,
  }
}


