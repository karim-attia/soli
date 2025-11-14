import {
  useCallback,
  useEffect,
  useLayoutEffect,
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
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native'
import type { ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from 'expo-router'
import { Button, Paragraph, Text, XStack, YStack, useTheme } from 'tamagui'
import { Menu, RefreshCcw } from '@tamagui/lucide-icons'
// import { useToastController } from '@tamagui/toast'

import {
  FOUNDATION_SUIT_ORDER,
  TABLEAU_COLUMN_COUNT,
  createInitialState,
  createSolvableGameState,
  findAutoMoveTarget,
  getDropHints,
  klondikeReducer,
} from '../../src/solitaire/klondike'
import type {
  Card,
  GameAction,
  GameState,
  Rank,
  Selection,
  Suit,
} from '../../src/solitaire/klondike'
import { useFlightController, type CardFlightSnapshot } from '../../src/animation/flightController'
import { devLog } from '../../src/utils/devLogger'
import { clearGameState } from '../../src/storage/gamePersistence'
import {
  createHistoryPreviewFromState,
  formatShuffleDisplayName,
  useHistory,
} from '../../src/state/history'
import { useAnimationToggles, useSettings } from '../../src/state/settings'
import { computeElapsedWithReference, formatElapsedDuration } from '../../src/utils/time'
import {
  FeltBackground,
} from '../../src/features/klondike/components/FeltBackground'
import {
  StatisticsHud,
  StatisticsPlaceholder,
  buildStatisticsRows,
} from '../../src/features/klondike/components/StatisticsHud'
import { UndoScrubber } from '../../src/features/klondike/components/UndoScrubber'
import { TopRow, TableauSection, CelebrationTouchBlocker } from '../../src/features/klondike/components/cards'
import { useKlondikeTimer } from '../../src/features/klondike/hooks/useKlondikeTimer'
import { useKlondikePersistence } from '../../src/features/klondike/hooks/useKlondikePersistence'
import { useSolvableShuffleSelector } from '../../src/features/klondike/hooks/useSolvableShuffleSelector'
import { useCelebrationController } from '../../src/features/klondike/hooks/useCelebrationController'
import { useUndoScrubber } from '../../src/features/klondike/hooks/useUndoScrubber'
import {
  useDemoGameLauncher,
  DEMO_AUTO_STEP_INTERVAL_MS,
} from '../../src/features/klondike/hooks/useDemoGameLauncher'
import { useDrawerOpener } from '../../src/navigation/useDrawerOpener'
import { CelebrationDebugBadge } from '../../src/features/klondike/components/CelebrationDebugBadge'
import {
  COLUMN_MARGIN,
  EDGE_GUTTER,
  COLOR_FELT_LIGHT,
  COLOR_FELT_DARK,
  CARD_ANIMATION_DURATION_MS,
} from '../../src/features/klondike/constants'
import { EMPTY_INVALID_WIGGLE, type CardMetrics, type InvalidWiggleConfig } from '../../src/features/klondike/types'
import { computeCardMetrics } from '../../src/features/klondike/utils/cardMetrics'

type RequestNewGameFn = (options?: { reason?: 'manual' | 'celebration' }) => void

const AUTO_QUEUE_INTERVAL_MS = 100
const AUTO_QUEUE_MOVE_BUFFER_MS = 50
const AUTO_QUEUE_MOVE_DELAY_MS = CARD_ANIMATION_DURATION_MS + AUTO_QUEUE_MOVE_BUFFER_MS
const STAT_VERTICAL_MARGIN = EDGE_GUTTER

const FLIGHT_WAIT_TIMEOUT_MS = 160

// Maps a selection descriptor to the card IDs involved for animation flights.
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

// Renders the main Klondike gameplay screen.
export default function TabOneScreen() {
  const [state, dispatch] = useReducer(klondikeReducer, undefined, createInitialState)
  const [boardLayout, setBoardLayout] = useState<{ width: number | null; height: number | null }>({
    width: null,
    height: null,
  })
  const cardMetrics = useMemo(() => computeCardMetrics(boardLayout.width), [boardLayout.width])
  const navigation = useNavigation()
  const openDrawer = useDrawerOpener()
  const colorScheme = useColorScheme()
  const feltBackground = colorScheme === 'dark' ? COLOR_FELT_DARK : COLOR_FELT_LIGHT
  const { state: settingsState, hydrated: settingsHydrated, setDeveloperMode } = useSettings()
  const { showMoves, showTime } = settingsState.statistics
  const safeArea = useSafeAreaInsets()
  const solvableGamesOnly = settingsState.solvableGamesOnly
  const developerModeEnabled = settingsState.developerMode
  const animationToggles = useAnimationToggles()
  const { entries: historyEntries, recordResult } = useHistory()
  const {
    master: animationsEnabled,
    cardFlights: cardFlightsEnabled,
    invalidMoveWiggle: invalidMoveEnabled,
    wasteFan: wasteFanEnabled,
    cardFlip: cardFlipEnabled,
    foundationGlow: foundationGlowEnabled,
    celebrations: celebrationAnimationsEnabled,
  } = animationToggles
  const dropHints = useMemo(() => getDropHints(state), [state])
  const effectiveElapsedMs = useMemo(
    () => computeElapsedWithReference(state.elapsedMs, state.timerState, state.timerStartedAt, Date.now()),
    [state.elapsedMs, state.timerStartedAt, state.timerState],
  )
  const formattedElapsed = useMemo(() => formatElapsedDuration(effectiveElapsedMs), [effectiveElapsedMs])
  const statisticsRows = useMemo(
    () =>
      buildStatisticsRows({
        showMoves,
        showTime,
        moveCount: state.moveCount,
        formattedElapsed,
      }),
    [formattedElapsed, showMoves, showTime, state.moveCount],
  )
  const headerPaddingTop = EDGE_GUTTER
  const headerPaddingLeft = safeArea.left + COLUMN_MARGIN
  const headerPaddingRight = safeArea.right + COLUMN_MARGIN
  const autoCompleteRunsRef = useRef(state.autoCompleteRuns)
  const winCelebrationsRef = useRef(state.winCelebrations)
  const stateRef = useRef(state)
  const lastRecordedShuffleRef = useRef<string | null>(null)
  const previousHasWonRef = useRef(state.hasWon)
  const requestNewGameRef = useRef<RequestNewGameFn | null>(null)
  const currentStartingPreviewRef = useRef(createHistoryPreviewFromState(state))
  const currentDisplayNameRef = useRef(formatShuffleDisplayName(state.shuffleId))
  const topRowLayoutRef = useRef<LayoutRectangle | null>(null)
  const foundationLayoutsRef = useRef<Partial<Record<Suit, LayoutRectangle>>>({})
  const boardLockedRef = useRef(false)
  const lastDemoLinkRef = useRef<string | null>(null)
  const [boardLocked, setBoardLocked] = useState(false)
  // Synchronizes the board-locked state between refs and React state.
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
  // Resolves a selection into its corresponding card IDs for flight animations.
  const resolveSelectionCardIds = useCallback(
    (selection?: Selection | null) => collectSelectionCardIds(stateRef.current, selection),
    [],
  )
  const {
    cardFlights,
    cardFlightMemoryRef,
    registerSnapshot: handleCardMeasured,
    ensureReady: ensureCardFlightsReady,
    reset: resetCardFlights,
    dispatchWithFlight: dispatchWithFlightInternal,
  } = useFlightController({
    enabled: cardFlightsEnabled,
    waitTimeoutMs: FLIGHT_WAIT_TIMEOUT_MS,
    getSelectionCardIds: resolveSelectionCardIds,
  })
  // Hook: drive the Klondike timer lifecycle (start/pause/tick) away from the main component.
  const { pauseTimer, resumeTimerIfNeeded } = useKlondikeTimer({ state, dispatch, stateRef })
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
    handleCelebrationComplete,
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

        recordResult({
          shuffleId: solvableState.shuffleId,
          solved: false,
          solvable: true,
          finishedAt: new Date().toISOString(),
          moves: 0,
          durationMs: 0,
          preview: solvablePreview,
          displayName: solvableDisplayName,
        })

        dispatch({ type: 'HYDRATE_STATE', state: solvableState })
        lastRecordedShuffleRef.current = null
        return
      }
    }

    dispatch({ type: 'NEW_GAME' })
    lastRecordedShuffleRef.current = null
  }, [
    dispatch,
    recordResult,
    selectNextSolvableShuffle,
    settingsHydrated,
    solvableGamesOnly,
  ])

  // Records the current game result once per shuffle for history analytics.
  const recordCurrentGameResult = useCallback(
    (options?: { solved?: boolean }) => {
      const current = stateRef.current
      if (!current.shuffleId) {
        return
      }
      if (lastRecordedShuffleRef.current === current.shuffleId) {
        return
      }

      const solved = options?.solved ?? current.hasWon
      if (!solved && current.moveCount === 0) {
        return
      }

      const elapsedForRecord = computeElapsedWithReference(
        current.elapsedMs,
        current.timerState,
        current.timerStartedAt,
        Date.now(),
      )

      recordResult({
        shuffleId: current.shuffleId,
        solved,
        solvable: Boolean(current.solvableId),
        finishedAt: new Date().toISOString(),
        moves: current.moveCount,
        durationMs: elapsedForRecord,
        preview: currentStartingPreviewRef.current,
        displayName: currentDisplayNameRef.current,
      })
      lastRecordedShuffleRef.current = current.shuffleId
    },
    [recordResult],
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
      if (action.type === 'APPLY_MOVE' && action.target?.type === 'foundation') {
        const destination = action.target.suit
        const sourceLabel = selection
          ? selection.source === 'tableau'
            ? `tableau:${selection.columnIndex}`
            : selection.source
          : 'unknown'
        // devLog('info', `[Game] Dispatch APPLY_MOVE → foundation:${destination} from ${sourceLabel}`)
      }
      dispatchWithFlightInternal({ action, selection, dispatch })
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
    lastRecordedShuffleRef,
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
      const selectionLabel = selection
        ? selection.source === 'tableau'
          ? `tableau:${selection.columnIndex}#${selection.cardIndex}`
          : selection.source === 'foundation'
            ? `foundation:${selection.suit}`
            : selection.source
        : 'none'
      // devLog('info', '[Wiggle] trigger', { cards: ids, selection: selectionLabel })
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

  // Mirrors the latest state into a ref for synchronous callbacks.
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
      return { width, height }
    })
  }, [])

  // Handles draw/recycle presses, validating availability before dispatching.
  const handleDraw = useCallback(() => {
    if (boardLockedRef.current) {
      return
    }
    if (!state.stock.length && !state.waste.length) {
      notifyInvalidMove()
      return
    }
    ensureCardFlightsReady()
    dispatch({ type: 'DRAW_OR_RECYCLE' })
  }, [dispatch, ensureCardFlightsReady, notifyInvalidMove, state.stock.length, state.waste.length])

  // Initiates an undo action when the board is unlocked and history exists.
  const handleUndo = useCallback(() => {
    if (boardLockedRef.current) {
      return
    }
    if (!state.history.length) {
      notifyInvalidMove()
      return
    }
    ensureCardFlightsReady()
    dispatch({ type: 'UNDO' })
  }, [dispatch, ensureCardFlightsReady, notifyInvalidMove, state.history.length])
  // Placeholder column press handler retained for legacy component API compatibility.
  const noopColumnPress = useCallback((_: number) => {}, [])

  const requestNewGame = useCallback(
    (options?: { reason?: 'manual' | 'celebration' }) => {
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
          recordCurrentGameResult()
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
      clearGameState,
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

  // Attempts an auto move from a tapped foundation stack.
const handleFoundationPress = useCallback(
  (suit: Suit) => {
    if (boardLockedRef.current) {
      return
    }
      if (!state.foundations[suit].length) {
      return
    }
      attemptAutoMove({ source: 'foundation', suit })
  },
    [attemptAutoMove, state.foundations],
)

  const celebrationActive = Boolean(celebrationState)
  const {
    shouldShowUndo,
    canUndo,
    isScrubbing,
    scrubSliderValue,
    scrubSliderMax,
    undoScrubGesture,
    handleUndoTap,
  } = useUndoScrubber({
    state,
    boardLocked,
    celebrationActive,
    safeArea: { left: safeArea.left, right: safeArea.right },
    dispatch,
    handleUndo,
  })
  // Configures the navigation header with menu, new-game, and demo controls.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Klondike',
      headerRight: () => (
        <HeaderControls
          onMenuPress={openDrawer}
          onNewGame={() => requestNewGame({ reason: 'manual' })}
          onDemoGame={developerModeEnabled ? () => handleLaunchDemoGame() : undefined}
        />
      ),
    })
  }, [developerModeEnabled, handleLaunchDemoGame, navigation, openDrawer, requestNewGame])

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

  // Advances queued auto moves once the configured delay has elapsed.
  useEffect(() => {
    if (!state.isAutoCompleting || state.autoQueue.length === 0) {
      return
    }

    const [nextAction] = state.autoQueue
    if (!nextAction) {
      return
    }

    const delay =
      nextAction.type === 'move' ? AUTO_QUEUE_MOVE_DELAY_MS : AUTO_QUEUE_INTERVAL_MS
    const selection = nextAction.type === 'move' ? nextAction.selection : null

    const timeoutId = setTimeout(() => {
      dispatchWithFlight({ type: 'ADVANCE_AUTO_QUEUE' }, selection)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [dispatchWithFlight, state.autoQueue, state.isAutoCompleting])

  return (
    <YStack
      flex={1}
      px="$2"
      pb="$2"
      gap="$3"
      style={{ backgroundColor: feltBackground }}
    >
      {/* Layout: Felt background provides the table texture. */}
      <FeltBackground />
      {/* Layout: Core tableau area containing top row and columns. */}
      <View
        style={[
          styles.headerRow,
          {
            paddingTop: headerPaddingTop,
            paddingLeft: headerPaddingLeft,
            paddingRight: headerPaddingRight,
          },
        ]}
      >
        {statisticsRows.length ? (
          /* Shows the move/time statistics badges when enabled in settings. */
          <StatisticsHud rows={statisticsRows} />
        ) : (
          <StatisticsPlaceholder />
        )}
      </View>

      {/* Layout: Board area containing top row and columns. */}
      <YStack
        flex={1}
        onLayout={handleBoardLayout}
        style={[styles.boardShell, { marginTop: STAT_VERTICAL_MARGIN + 6 }]}
        px="$2"
        py="$3"
        gap="$3"
      >
        {/* Coordinates foundation, waste, and stock piles with card flights and layout tracking. */}
        <TopRow
          state={state}
          drawLabel={drawLabel}
          onDraw={handleDraw}
          onWasteTap={() => attemptAutoMove({ source: 'waste' })}
          onFoundationPress={handleFoundationPress}
          cardMetrics={cardMetrics}
          dropHints={dropHints}
          notifyInvalidMove={notifyInvalidMove}
          invalidWiggle={invalidWiggle}
          cardFlights={cardFlights}
          onCardMeasured={handleCardMeasured}
          cardFlightMemory={cardFlightMemoryRef.current}
          interactionsLocked={boardLocked}
          hideFoundations={false}
          onTopRowLayout={handleTopRowLayout}
          onFoundationLayout={handleFoundationLayout}
          celebrationBindings={celebrationBindings}
          celebrationActive={Boolean(celebrationState)}
        />

        {/* Renders tableau columns with per-card animations and gesture handlers. */}
        <TableauSection
          state={state}
          cardMetrics={cardMetrics}
          dropHints={dropHints}
          onAutoMove={attemptAutoMove}
          onColumnPress={noopColumnPress}
          invalidWiggle={invalidWiggle}
          cardFlights={cardFlights}
          onCardMeasured={handleCardMeasured}
          cardFlightMemory={cardFlightMemoryRef.current}
          interactionsLocked={boardLocked}
        />
        {celebrationState ? (
          /* Prevents touches during celebrations and lets developers abort the sequence. */
          <CelebrationTouchBlocker onAbort={handleCelebrationAbort} />
        ) : null}
        {celebrationLabel ? <CelebrationDebugBadge label={celebrationLabel} /> : null}
      </YStack>

      {/* Provides the undo button and long-press scrub overlay for timeline navigation. */}
      <UndoScrubber
        visible={shouldShowUndo}
        isScrubbing={isScrubbing}
        sliderValue={scrubSliderValue}
        sliderMax={scrubSliderMax}
        gesture={undoScrubGesture}
        onUndoPress={handleUndoTap}
        boardLocked={boardLocked}
        canUndo={canUndo}
      />
    </YStack>
  )
}
const styles = StyleSheet.create({
  headerRow: {
    width: '100%',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  boardShell: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: COLUMN_MARGIN,
    position: 'relative',
  },
})

type HeaderControlsProps = {
  onMenuPress: () => void
  onNewGame: () => void
  onDemoGame?: () => void
}

const HeaderControls = ({ onMenuPress, onNewGame, onDemoGame }: HeaderControlsProps) => (
  <XStack gap="$4" style={{ alignItems: 'center' }}>
    {onDemoGame ? (
      <Button size="$4" onPress={onDemoGame}>
        Demo Game
      </Button>
    ) : null}
    <Button size="$4" onPress={onNewGame}>
      New Game
    </Button>
    <HeaderMenuButton onPress={onMenuPress} />
  </XStack>
)

const HeaderMenuButton = ({ onPress }: { onPress: () => void }) => {
  const theme = useTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel="Open navigation menu"
      style={{ padding: 8 }}
    >
      <Menu size={32} color={theme.color.val as any} />
    </Pressable>
  )
}
