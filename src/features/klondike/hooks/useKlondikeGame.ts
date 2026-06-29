import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import {
  Alert,
  LayoutChangeEvent,
  LayoutRectangle,
  Linking,
  useColorScheme,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  createInitialState,
  createSolvableGameState,
  findAutoMoveTargetWithTableauAdjacentFallback,
  getDropHints,
  klondikeReducer,
  type GameAction,
  type GameState,
  type Selection,
  type Suit,
} from '../../../solitaire/klondike'
import { devLog } from '../../../utils/devLogger'
import { computeElapsedWithReference } from '../../../utils/time'
import { clearGameState } from '../../../storage/gamePersistence'
import {
  createHistoryPreviewFromState,
  createStartedHistoryEntryInputFromState,
  formatDealDisplayName,
  useHistory,
} from '../../../state/history'
import { useAnimationToggles, useSettings } from '../../../state/settings'
import {
  COLUMN_MARGIN,
  EDGE_GUTTER,
  COLOR_FELT_LIGHT,
  COLOR_FELT_DARK,
  WIGGLE_SEGMENT_DURATION_MS,
} from '../constants'
import { EMPTY_INVALID_WIGGLE, type InvalidWiggleConfig } from '../types'
import { computeCardMetrics } from '../utils/cardMetrics'
import { useKlondikeTimer } from './useKlondikeTimer'
import { useKlondikePersistence } from './useKlondikePersistence'
import { useSolvableDealSelector } from './useSolvableDealSelector'
import { useCelebrationController } from './useCelebrationController'
import { useUndoScrubber } from './useUndoScrubber'
import {
  useDemoGameLauncher,
  DEMO_AUTO_STEP_INTERVAL_MS,
  type LaunchDemoGameOptions,
} from './useDemoGameLauncher'
import { useAutoQueueRunner } from './useAutoQueueRunner'
import type { KlondikeGameViewProps } from '../components/KlondikeGameView'
import { buildStatisticsRows, type StatisticsRow } from '../components/StatisticsHud'
import type { UndoScrubberProps } from '../components/UndoScrubber'
import type { TopRowProps } from '../components/cards/TopRow'
import type { TableauSectionProps } from '../components/cards/TableauSection'
import {
  createEmptyAbsoluteCardLayerLayouts,
  type AbsoluteCardLayerLayouts,
} from '../components/cards/AbsoluteCardLayer'
import { loadBoardMetrics, saveBoardMetrics } from '../../../storage/uiPreferences'

export type { LaunchDemoGameOptions } from './useDemoGameLauncher'

export type RequestNewGameFn = (options?: { reason?: 'manual' | 'celebration' }) => void

// PBI-28: Run auto-up (auto-complete) much faster than manual play cadence.
const AUTO_QUEUE_INTERVAL_MS = 25
// Interval controls when the next auto-queue action starts; this delay gives the
// already-started card flight a tiny head start so rapid auto-up remains readable.
const AUTO_QUEUE_MOVE_DELAY_MS = 35
const WIGGLE_SEQUENCE_SEGMENT_COUNT = 3
const WIGGLE_RESET_BUFFER_MS = 40
const INVALID_WIGGLE_RESET_DELAY_MS =
  WIGGLE_SEGMENT_DURATION_MS * WIGGLE_SEQUENCE_SEGMENT_COUNT + WIGGLE_RESET_BUFFER_MS
const MAX_BUFFERED_WASTE_TAPS = 1

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

const createEmptyInvalidWiggle = (): InvalidWiggleConfig => ({
  ...EMPTY_INVALID_WIGGLE,
  lookup: new Set<string>(),
})

// Maps a selection descriptor to the card IDs that should receive invalid-move feedback.
// Auto-move, waste taps, and auto-complete still raise selections even after manual selection removal.
function collectSelectionCardIds(
  state: GameState,
  selection?: Selection | null
): string[] {
  if (!selection) {
    return []
  }

  if (selection.source === 'waste') {
    const topWaste = state.waste[state.waste.length - 1]
    return topWaste ? [topWaste.id] : []
  }

  if (selection.source === 'foundation') {
    const topFoundation =
      state.foundations[selection.suit][state.foundations[selection.suit].length - 1]
    return topFoundation ? [topFoundation.id] : []
  }

  if (selection.source === 'tableau') {
    const column = state.tableau[selection.columnIndex] ?? []
    return column.slice(selection.cardIndex).map((card) => card.id)
  }

  return []
}

export type UseKlondikeGameResult = {
  developerModeEnabled: boolean
  requestNewGame: RequestNewGameFn
  handleLaunchDemoGame: (options?: LaunchDemoGameOptions) => void
  viewProps: KlondikeGameViewProps
}

type WasteAutoMoveMarker = {
  cardId: string
  moveCount: number
}

const areLayoutsEquivalent = (
  previous: LayoutRectangle | null | undefined,
  next: LayoutRectangle | null | undefined
): boolean =>
  !!previous &&
  !!next &&
  previous.x === next.x &&
  previous.y === next.y &&
  previous.width === next.width &&
  previous.height === next.height

// Provides the stateful container for the Klondike screen, exposing navigation callbacks and view props.
export const useKlondikeGame = (): UseKlondikeGameResult => {
  const [state, dispatch] = useReducer(klondikeReducer, undefined, createInitialState)
  const [boardLayout, setBoardLayout] = useState<{
    width: number | null
    height: number | null
  }>({
    width: null,
    height: null,
  })
  const [absoluteCardLayerLayouts, setAbsoluteCardLayerLayouts] =
    useState<AbsoluteCardLayerLayouts>(() => createEmptyAbsoluteCardLayerLayouts())

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

  const safeArea = useSafeAreaInsets()
  const boardAvailableWidth = useMemo(() => {
    if (!boardLayout.width || boardLayout.width <= 0) {
      return null
    }
    // Task 1-8: size board columns using the safe-area width (not under notches).
    return boardLayout.width - safeArea.left - safeArea.right
  }, [boardLayout.width, safeArea.left, safeArea.right])
  const cardMetrics = useMemo(
    () => computeCardMetrics(boardAvailableWidth),
    [boardAvailableWidth]
  )
  const colorScheme = useColorScheme()
  const feltBackground = colorScheme === 'dark' ? COLOR_FELT_DARK : COLOR_FELT_LIGHT

  const {
    state: settingsState,
    hydrated: settingsHydrated,
    setDeveloperMode,
  } = useSettings()
  const { showMoves, showTime } = settingsState.statistics
  const solvableGamesOnly = settingsState.solvableGamesOnly
  const preferredDrawCount = settingsState.drawCount
  const autoUpEnabled = settingsState.autoUpEnabled
  const developerModeEnabled = settingsState.developerMode

  const animationToggles = useAnimationToggles()
  const {
    entries: historyEntries,
    solvableStats,
    recordResult,
    updateEntry,
    hydrated: historyHydrated,
  } = useHistory()
  const {
    master: animationsEnabled,
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
    [safeArea.left, safeArea.right]
  )

  const autoCompleteRunsRef = useRef(state.autoCompleteRuns)
  const winCelebrationsRef = useRef(state.winCelebrations)
  const stateRef = useRef(state)
  // Task 10-6: Track the current game's history entry ID for updates
  const currentGameEntryIdRef = useRef<string | null>(null)
  const previousHasWonRef = useRef(state.hasWon)
  const requestNewGameRef = useRef<RequestNewGameFn | null>(null)
  const currentStartingPreviewRef = useRef(createHistoryPreviewFromState(state))
  const currentDisplayNameRef = useRef(formatDealDisplayName(state.exactId))
  const topRowLayoutRef = useRef<LayoutRectangle | null>(null)
  const foundationLayoutsRef = useRef<Partial<Record<Suit, LayoutRectangle>>>({})
  const boardLockedRef = useRef(false)
  const lastDemoLinkRef = useRef<string | null>(null)
  const demoPlaybackActiveRef = useRef(false)
  const pendingSolvedResultRef = useRef(false)
  const pendingSolvedResultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bufferedWasteTapCountRef = useRef(0)
  const lastWasteAutoMoveRef = useRef<WasteAutoMoveMarker | null>(null)
  const [boardLocked, setBoardLocked] = useState(false)
  const [dealResetKey, setDealResetKey] = useState(0)
  const [wasteTapQueueVersion, setWasteTapQueueVersion] = useState(0)

  // Synchronizes the board-locked flag between refs and React state.
  const updateBoardLocked = useCallback((locked: boolean) => {
    boardLockedRef.current = locked
    setBoardLocked(locked)
  }, [])

  const clearPendingSolvedResultTimer = useCallback(() => {
    if (pendingSolvedResultTimeoutRef.current) {
      clearTimeout(pendingSolvedResultTimeoutRef.current)
      pendingSolvedResultTimeoutRef.current = null
    }
  }, [])

  // Stores the top-row layout for later celebration positioning.
  const handleTopRowLayout = useCallback((layout: LayoutRectangle) => {
    topRowLayoutRef.current = layout
    setAbsoluteCardLayerLayouts((previous) => {
      if (areLayoutsEquivalent(previous.topRow, layout)) {
        return previous
      }

      return { ...previous, topRow: layout }
    })
  }, [])

  // Caches foundation layouts so celebration trajectories know their origins.
  const handleFoundationLayout = useCallback((suit: Suit, layout: LayoutRectangle) => {
    foundationLayoutsRef.current[suit] = layout
    setAbsoluteCardLayerLayouts((previous) => {
      if (areLayoutsEquivalent(previous.foundations[suit], layout)) {
        return previous
      }

      return {
        ...previous,
        foundations: {
          ...previous.foundations,
          [suit]: layout,
        },
      }
    })
  }, [])

  const handleStockLayout = useCallback((layout: LayoutRectangle) => {
    setAbsoluteCardLayerLayouts((previous) => {
      if (areLayoutsEquivalent(previous.stock, layout)) {
        return previous
      }

      return { ...previous, stock: layout }
    })
  }, [])

  const handleWasteLayout = useCallback((layout: LayoutRectangle) => {
    setAbsoluteCardLayerLayouts((previous) => {
      if (areLayoutsEquivalent(previous.waste, layout)) {
        return previous
      }

      return { ...previous, waste: layout }
    })
  }, [])

  const handleTableauRowLayout = useCallback((layout: LayoutRectangle) => {
    setAbsoluteCardLayerLayouts((previous) => {
      if (areLayoutsEquivalent(previous.tableauRow, layout)) {
        return previous
      }

      return { ...previous, tableauRow: layout }
    })
  }, [])

  const handleTableauColumnLayout = useCallback(
    (columnIndex: number, layout: LayoutRectangle) => {
      setAbsoluteCardLayerLayouts((previous) => {
        if (areLayoutsEquivalent(previous.tableauColumns[columnIndex], layout)) {
          return previous
        }

        const tableauColumns = [...previous.tableauColumns]
        tableauColumns[columnIndex] = layout
        return { ...previous, tableauColumns }
      })
    },
    []
  )

  // Hook: drive the Klondike timer lifecycle (start/pause/tick) away from the main component.
  useKlondikeTimer({ state, dispatch, stateRef })

  useEffect(() => {
    if (!settingsHydrated) {
      return
    }

    // Auto Up lives in settings, but queue scheduling is pure reducer logic.
    // Mirror it into runtime state so turning it off can stop an active queue immediately.
    dispatch({ type: 'SET_AUTO_UP_ENABLED', enabled: autoUpEnabled })
  }, [autoUpEnabled, dispatch, settingsHydrated])

  // Hook: hydrate and persist game state via AsyncStorage once per relevant change.
  // Task 10-7: Persist the current history entry linkage across restarts.
  const storageHydrated = useKlondikePersistence({
    state,
    dispatch,
    previousHasWonRef,
    currentGameEntryIdRef,
    settingsHydrated,
    autoUpEnabled,
    preferredDrawCount,
  })

  // Mirrors the latest reducer state into a ref for synchronous callbacks.
  useEffect(() => {
    stateRef.current = state
  }, [state])

  const currentExactId = state.exactId
  const currentDrawCount = state.drawCount
  const currentHasWon = state.hasWon

  // Task 10-7: After hydration, ensure the current game has one active history row.
  useEffect(() => {
    if (!historyHydrated || !storageHydrated) {
      return
    }
    if (demoPlaybackActiveRef.current) {
      return
    }
    if (currentHasWon) {
      return
    }

    const entryId = currentGameEntryIdRef.current
    if (entryId) {
      const linked = historyEntries.find((entry) => entry.id === entryId)
      if (!linked) {
        return
      }
      if (linked.exactId !== currentExactId || linked.drawCount !== currentDrawCount) {
        currentGameEntryIdRef.current = null
      } else {
        if (linked.status !== 'active') {
          updateEntry(entryId, { status: 'active', solved: false, finishedAt: null })
        }
        return
      }
    }

    const matchingActive = historyEntries.find(
      (entry) =>
        entry.status === 'active' &&
        entry.exactId === currentExactId &&
        entry.drawCount === currentDrawCount
    )
    if (matchingActive) {
      currentGameEntryIdRef.current = matchingActive.id
      return
    }

    const currentState = stateRef.current
    const preview = createHistoryPreviewFromState(currentState.history[0] ?? currentState)
    const displayName = formatDealDisplayName(currentExactId)
    const entryInput = createStartedHistoryEntryInputFromState(currentState, {
      preview,
      displayName,
    })

    currentStartingPreviewRef.current = preview
    currentDisplayNameRef.current = displayName
    currentGameEntryIdRef.current = recordResult(entryInput)
  }, [
    currentDrawCount,
    currentHasWon,
    currentExactId,
    historyEntries,
    historyHydrated,
    recordResult,
    storageHydrated,
    updateEntry,
  ])

  // Hook: pick the next solvable deal weighted by prior play history when needed.
  const selectNextSolvableDeal = useSolvableDealSelector(
    solvableStats,
    preferredDrawCount
  )

  // Deals a new game, respecting solvable-only settings and history bookkeeping.
  const dealNewGame = useCallback(() => {
    const finishDeal = (nextState: GameState) => {
      dispatch({ type: 'HYDRATE_STATE', state: nextState })
      setDealResetKey((current) => current + 1)
    }

    if (settingsHydrated && solvableGamesOnly) {
      const solvableDeal = selectNextSolvableDeal()
      if (solvableDeal) {
        const startedAt = new Date().toISOString()
        const solvableState = createSolvableGameState(solvableDeal, preferredDrawCount)
        const solvablePreview = createHistoryPreviewFromState(solvableState)
        const solvableDisplayName = formatDealDisplayName(solvableState.exactId)

        currentStartingPreviewRef.current = solvablePreview
        currentDisplayNameRef.current = solvableDisplayName

        const entryInput = createStartedHistoryEntryInputFromState(solvableState, {
          startedAt,
          preview: solvablePreview,
          displayName: solvableDisplayName,
        })
        currentGameEntryIdRef.current = recordResult(entryInput)

        finishDeal(solvableState)
        return
      }
    }

    const startedAt = new Date().toISOString()
    const nextState = createInitialState(preferredDrawCount)
    const preview = createHistoryPreviewFromState(nextState)
    const displayName = formatDealDisplayName(nextState.exactId)
    const entryInput = createStartedHistoryEntryInputFromState(nextState, {
      startedAt,
      preview,
      displayName,
    })

    currentStartingPreviewRef.current = preview
    currentDisplayNameRef.current = displayName
    currentGameEntryIdRef.current = recordResult(entryInput)
    // Absolute-layer cards stay mounted across deals, so this narrow token resets
    // native animated positions without changing card identity for the whole deck.
    finishDeal(nextState)
  }, [
    dispatch,
    preferredDrawCount,
    recordResult,
    selectNextSolvableDeal,
    settingsHydrated,
    solvableGamesOnly,
  ])

  // Task 10-6: Updates or records game result in history
  const recordCurrentGameResult = useCallback(
    (options?: { solved?: boolean }) => {
      if (demoPlaybackActiveRef.current) {
        return
      }

      const currentState = stateRef.current
      const solved = options?.solved ?? currentState.hasWon
      const status = solved ? 'solved' : 'incomplete'
      const elapsedForRecord = computeElapsedWithReference(
        currentState.elapsedMs,
        currentState.timerState,
        currentState.timerStartedAt,
        Date.now()
      )

      // Task 10-6: finishedAt only set when solved, null for incomplete
      const finishedAt = solved ? new Date().toISOString() : null

      // If we have a tracked entry ID, update it; otherwise create new
      if (currentGameEntryIdRef.current) {
        updateEntry(currentGameEntryIdRef.current, {
          solved,
          status,
          moves: currentState.moveCount,
          durationMs: elapsedForRecord,
          finishedAt,
          // Task 10-7: Never overwrite preview on completion; it must remain the start snapshot.
        })
        currentGameEntryIdRef.current = null
      } else {
        // No tracked entry - only record if there's been meaningful play
        if (!solved && currentState.moveCount === 0) {
          return
        }

        // Task 10-7: If we lost the entry-id linkage (e.g. restart), update the matching active entry instead
        // of creating a duplicate solved/incomplete row.
        const matchingActive = historyEntries.find(
          (entry) =>
            entry.status === 'active' &&
            entry.exactId === currentState.exactId &&
            entry.drawCount === currentState.drawCount
        )
        if (matchingActive) {
          updateEntry(matchingActive.id, {
            solved,
            status,
            moves: currentState.moveCount,
            durationMs: elapsedForRecord,
            finishedAt,
          })
          return
        }

        recordResult({
          exactId: currentState.exactId,
          deckChecksum: currentState.deckChecksum,
          solved,
          drawCount: currentState.drawCount,
          startedAt: new Date().toISOString(), // Best approximation when no tracked entry
          finishedAt,
          moves: currentState.moveCount,
          durationMs: elapsedForRecord,
          // Task 10-7: Prefer the game start snapshot for history preview (sheet shows start state).
          preview: createHistoryPreviewFromState(currentState.history[0] ?? currentState),
          displayName: currentDisplayNameRef.current,
          status,
        })
      }
    },
    [historyEntries, recordResult, updateEntry]
  )

  const flushPendingSolvedResultAfterHandoff = useCallback(() => {
    if (!pendingSolvedResultRef.current) {
      return
    }
    pendingSolvedResultRef.current = false
    clearPendingSolvedResultTimer()
    // Task 28-2: Let the last winning-card settle/handoff breathe before history persistence
    // runs, otherwise the exact `hasWon` frame does extra JS work that earlier moves avoid.
    pendingSolvedResultTimeoutRef.current = setTimeout(() => {
      pendingSolvedResultTimeoutRef.current = null
      if (!stateRef.current.hasWon) {
        return
      }
      recordCurrentGameResult({ solved: true })
    }, 0)
  }, [clearPendingSolvedResultTimer, recordCurrentGameResult])

  useEffect(() => {
    return () => {
      clearPendingSolvedResultTimer()
    }
  }, [clearPendingSolvedResultTimer])

  // Hook: own the celebration animation lifecycle and bindings.
  const {
    celebrationState,
    celebrationPending,
    setCelebrationState,
    celebrationBindings,
    celebrationLabel,
    handleCelebrationAbort,
    handleWinningCardFlightSettled,
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
    updateBoardLocked,
    winCelebrationsRef,
    onWinVisualHandoffStart: flushPendingSolvedResultAfterHandoff,
    requestNewGameRef,
  })

  const [invalidWiggle, setInvalidWiggle] = useState<InvalidWiggleConfig>(
    createEmptyInvalidWiggle
  )
  const invalidWiggleResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (invalidWiggleResetTimeoutRef.current) {
        clearTimeout(invalidWiggleResetTimeoutRef.current)
        invalidWiggleResetTimeoutRef.current = null
      }
    }
  }, [])

  // Absolute-card mode owns movement after reducer commits; dispatch no longer waits
  // for pile-local card measurements or a fallback flight overlay.
  const dispatchGameAction = useCallback(
    (action: GameAction) => {
      if (boardLockedRef.current) {
        return
      }
      dispatch(action)
    },
    [dispatch]
  )

  const { handleLaunchDemoGame } = useDemoGameLauncher({
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
    currentGameEntryIdRef,
    demoPlaybackActiveRef,
    updateBoardLocked,
    clearGameState,
    preferredDrawCount,
    autoUpEnabled,
  })

  // Triggers the invalid-move wiggle animation for the provided selection.
  const triggerInvalidSelectionWiggle = useCallback(
    (selection?: Selection | null) => {
      const ids = collectSelectionCardIds(state, selection)
      if (!ids.length) {
        return
      }
      if (invalidWiggleResetTimeoutRef.current) {
        clearTimeout(invalidWiggleResetTimeoutRef.current)
      }
      const key = Date.now()
      setInvalidWiggle({
        key,
        lookup: new Set(ids),
      })
      invalidWiggleResetTimeoutRef.current = setTimeout(() => {
        setInvalidWiggle((current) =>
          current.key === key ? createEmptyInvalidWiggle() : current
        )
        if (invalidWiggleResetTimeoutRef.current) {
          invalidWiggleResetTimeoutRef.current = null
        }
      }, INVALID_WIGGLE_RESET_DELAY_MS)
    },
    [state]
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
    [autoPlayActive, triggerInvalidSelectionWiggle]
  )

  // Sets the stock button label, fading when the stock is empty.
  const drawLabel = state.stock.length ? 'Draw' : ''

  // Parses inbound deep links to trigger the developer demo deal workflow.
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
      const recordHistoryParam =
        parsed.searchParams.get('recordHistory') ?? parsed.searchParams.get('history')
      const nextRecordHistoryEnabled = parseOptionalBooleanParam(recordHistoryParam)

      if (
        host === 'demo-game' ||
        pathname === '/demo-game' ||
        pathname === '/demo' ||
        demoParam === '1' ||
        normalizedDemoParam === 'true' ||
        demoRequestsAutoReveal
      ) {
        lastDemoLinkRef.current = incomingUrl
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

        if (!settingsState.developerMode) {
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
    [handleLaunchDemoGame, setDeveloperMode, settingsState.developerMode]
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

  // Refreshes the cached starting preview metadata whenever a new game begins.
  useEffect(() => {
    if (state.moveCount === 0) {
      currentStartingPreviewRef.current = createHistoryPreviewFromState(state)
      currentDisplayNameRef.current = formatDealDisplayName(state.exactId)
    }
  }, [state])

  // Checks if the game was freshly won to record the result.
  useEffect(() => {
    const wasWon = previousHasWonRef.current
    const isWon = state.hasWon
    const delaySolvedResultRecording = animationsEnabled && celebrationAnimationsEnabled

    if (!wasWon && isWon) {
      if (state.timerState === 'running') {
        dispatch({ type: 'TIMER_STOP', timestamp: Date.now() })
      }
      devLog(
        'info',
        `[Game] hasWon set true (moves=${state.moveCount}, winCelebrations=${state.winCelebrations}).`
      )
      if (demoPlaybackActiveRef.current) {
        pendingSolvedResultRef.current = false
        clearPendingSolvedResultTimer()
      } else if (delaySolvedResultRecording) {
        pendingSolvedResultRef.current = true
      } else {
        pendingSolvedResultRef.current = false
        clearPendingSolvedResultTimer()
        recordCurrentGameResult({ solved: true })
      }
    }

    if (wasWon && !isWon) {
      pendingSolvedResultRef.current = false
      clearPendingSolvedResultTimer()
    }

    previousHasWonRef.current = isWon
  }, [
    animationsEnabled,
    celebrationAnimationsEnabled,
    clearPendingSolvedResultTimer,
    dispatch,
    recordCurrentGameResult,
    state.hasWon,
    state.moveCount,
    state.timerState,
    state.winCelebrations,
  ])

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
    dispatchGameAction({ type: 'DRAW_OR_RECYCLE' })
  }, [dispatchGameAction, notifyInvalidMove])

  // Initiates an undo action when the board is unlocked and history exists.
  const handleUndo = useCallback(() => {
    const current = stateRef.current
    if (!current.history.length) {
      notifyInvalidMove()
      return
    }
    dispatchGameAction({ type: 'UNDO' })
  }, [dispatchGameAction, notifyInvalidMove])

  // Presents a confirmation dialog and seeds state for a newly dealt game.
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
          foundationLayoutsRef.current = {}
          topRowLayoutRef.current = null
          winCelebrationsRef.current = 0
          void clearGameState().catch((error) => {
            devLog('warn', 'Failed to clear persisted game before new deal', error)
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
        { cancelable: !forced }
      )
    },
    [
      clearCelebrationDialogTimer,
      dealNewGame,
      recordCurrentGameResult,
      setCelebrationState,
      updateBoardLocked,
    ]
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

  // Attempts to auto-move a selection against a specific state snapshot.
  const attemptAutoMoveFromState = useCallback(
    (selection: Selection, currentState: GameState): boolean => {
      const resolved = findAutoMoveTargetWithTableauAdjacentFallback(
        currentState,
        selection
      )
      if (!resolved) {
        notifyInvalidMove({ selection })
        return false
      }

      dispatchGameAction({
        type: 'APPLY_MOVE',
        selection: resolved.selection,
        target: resolved.target,
      })
      return true
    },
    [dispatchGameAction, notifyInvalidMove]
  )

  // Attempts to auto-move a selection and falls back to invalid feedback on failure.
  const attemptAutoMove = useCallback(
    (selection: Selection) => {
      attemptAutoMoveFromState(selection, state)
    },
    [attemptAutoMoveFromState, state]
  )

  const handleWasteTap = useCallback(() => {
    const current = stateRef.current
    const topWaste = current.waste[current.waste.length - 1]
    const activeWasteMove = lastWasteAutoMoveRef.current

    if (
      topWaste &&
      activeWasteMove?.cardId === topWaste.id &&
      activeWasteMove.moveCount === current.moveCount
    ) {
      bufferedWasteTapCountRef.current = Math.min(
        MAX_BUFFERED_WASTE_TAPS,
        bufferedWasteTapCountRef.current + 1
      )
      setWasteTapQueueVersion((version) => version + 1)
      return
    }

    const moved = attemptAutoMoveFromState({ source: 'waste' }, current)
    if (moved && topWaste) {
      lastWasteAutoMoveRef.current = {
        cardId: topWaste.id,
        moveCount: current.moveCount,
      }
      return
    }

    bufferedWasteTapCountRef.current = 0
  }, [attemptAutoMoveFromState])

  useEffect(() => {
    const topWaste = state.waste[state.waste.length - 1]
    const activeWasteMove = lastWasteAutoMoveRef.current

    if (
      activeWasteMove &&
      (state.moveCount !== activeWasteMove.moveCount ||
        topWaste?.id !== activeWasteMove.cardId)
    ) {
      lastWasteAutoMoveRef.current = null
    }

    if (bufferedWasteTapCountRef.current <= 0) {
      return
    }

    if (!topWaste) {
      bufferedWasteTapCountRef.current = 0
      return
    }

    // A fast second tap can arrive before React has rendered the next waste top.
    // Wait until the first moved card is no longer the waste top, then replay one tap.
    if (
      activeWasteMove &&
      state.moveCount === activeWasteMove.moveCount &&
      topWaste.id === activeWasteMove.cardId
    ) {
      return
    }

    bufferedWasteTapCountRef.current -= 1

    const moved = attemptAutoMoveFromState({ source: 'waste' }, state)

    if (moved) {
      lastWasteAutoMoveRef.current = {
        cardId: topWaste.id,
        moveCount: state.moveCount,
      }
    } else {
      bufferedWasteTapCountRef.current = 0
    }
  }, [attemptAutoMoveFromState, state, wasteTapQueueVersion])

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
        dispatchGameAction({
          type: 'APPLY_MOVE',
          selection: state.selected,
          target: { type: 'foundation', suit },
        })
      } else {
        notifyInvalidMove({ selection: state.selected })
      }
    },
    [
      attemptAutoMove,
      dispatchGameAction,
      dropHints.foundations,
      notifyInvalidMove,
      state.foundations,
      state.selected,
    ]
  )

  const {
    shouldShowUndo,
    canUndo,
    scrubActive,
    scrubAnimatedIndex,
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
    dispatchGameAction,
    moveDelayMs: AUTO_QUEUE_MOVE_DELAY_MS,
    intervalMs: AUTO_QUEUE_INTERVAL_MS,
  })

  const topRowProps: TopRowProps = {
    state,
    drawLabel,
    onDraw: handleDraw,
    onFoundationPress: handleFoundationPress,
    cardMetrics,
    dropHints,
    interactionsLocked: boardLocked,
    onTopRowLayout: handleTopRowLayout,
    onFoundationLayout: handleFoundationLayout,
    onStockLayout: handleStockLayout,
    onWasteLayout: handleWasteLayout,
    celebrationActive: Boolean(celebrationState),
    celebrationPending,
  }

  const tableauProps: TableauSectionProps = {
    state,
    cardMetrics,
    dropHints,
    interactionsLocked: boardLocked,
    celebrationPending,
    onTableauRowLayout: handleTableauRowLayout,
    onTableauColumnLayout: handleTableauColumnLayout,
  }

  // requirement 20-6: onUndoPress removed - tap is handled by composed gesture
  const undoScrubProps: UndoScrubberProps = {
    visible: shouldShowUndo,
    scrubActive,
    scrubIndex: scrubAnimatedIndex,
    sliderMax: scrubSliderMax,
    gesture: undoScrubGesture,
    canUndo,
    onTrackMetrics: handleTrackMetrics,
  }

  const viewProps: KlondikeGameViewProps = {
    feltBackground,
    headerPadding,
    boardSafeArea: { left: safeArea.left, right: safeArea.right },
    statisticsRows,
    onBoardLayout: handleBoardLayout,
    topRowProps,
    tableauProps,
    celebrationState,
    celebrationLabel,
    celebrationBindings,
    onCelebrationAbort: handleCelebrationAbort,
    undoScrubProps,
    absoluteCardLayerProps: {
      state,
      cardMetrics,
      layouts: absoluteCardLayerLayouts,
      drawLabel,
      invalidWiggle: invalidWiggleEnabled ? invalidWiggle : EMPTY_INVALID_WIGGLE,
      animationResetKey: dealResetKey,
      interactionsLocked: boardLocked,
      celebrationActive: Boolean(celebrationState),
      onDraw: handleDraw,
      onWasteTap: handleWasteTap,
      onFoundationPress: handleFoundationPress,
      onTableauCardPress: (columnIndex, cardIndex) =>
        attemptAutoMove({ source: 'tableau', columnIndex, cardIndex }),
      onCardSettled: handleWinningCardFlightSettled,
    },
  }

  return {
    developerModeEnabled,
    requestNewGame,
    handleLaunchDemoGame,
    viewProps,
  }
}
