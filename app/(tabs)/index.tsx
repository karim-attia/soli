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
  AppState,
  type AppStateStatus,
  Dimensions,
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
import {
  Easing,
  cancelAnimation,
  runOnJS,
  runOnUI,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { useNavigation } from 'expo-router'
import { DrawerActions, useFocusEffect } from '@react-navigation/native'
import { Button, Paragraph, Text, XStack, YStack, useTheme } from 'tamagui'
import { Menu, RefreshCcw } from '@tamagui/lucide-icons'
import { Gesture } from 'react-native-gesture-handler'
// import { useToastController } from '@tamagui/toast'

import {
  FOUNDATION_SUIT_ORDER,
  TABLEAU_COLUMN_COUNT,
  createInitialState,
  createDemoGameState,
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
import {
  CELEBRATION_DURATION_MS,
  CELEBRATION_MODE_COUNT,
  CELEBRATION_WOBBLE_FREQUENCY,
  TAU,
  computeCelebrationFrame,
  getCelebrationModeMetadata,
  type CelebrationAssignment,
} from '../../src/animation/celebrationModes'
import { devLog } from '../../src/utils/devLogger'
import {
  PersistedGameError,
  clearGameState,
  loadGameState,
  saveGameState,
} from '../../src/storage/gamePersistence'
import {
  SOLVABLE_SHUFFLES,
  extractSolvableBaseId,
  type SolvableShuffleConfig,
} from '../../src/data/solvableShuffles'
import {
  createHistoryPreviewFromState,
  formatShuffleDisplayName,
  useHistory,
} from '../../src/state/history'
import { useAnimationToggles, useSettings } from '../../src/state/settings'
import { computeElapsedWithReference, formatElapsedDuration, TIMER_TICK_INTERVAL_MS } from '../../src/utils/time'
import {
  FeltBackground,
} from '../../src/features/klondike/components/FeltBackground'
import {
  StatisticsHud,
  StatisticsPlaceholder,
} from '../../src/features/klondike/components/StatisticsHud'
import { UndoScrubber } from '../../src/features/klondike/components/UndoScrubber'
import {
  TopRow,
  TableauSection,
  CelebrationTouchBlocker,
  rankToLabel,
} from '../../src/features/klondike/components/cards'
import {
  BASE_CARD_WIDTH,
  BASE_CARD_HEIGHT,
  CARD_ASPECT_RATIO,
  BASE_STACK_OFFSET,
  TABLEAU_GAP,
  MAX_CARD_WIDTH,
  MIN_CARD_WIDTH,
  COLUMN_MARGIN,
  EDGE_GUTTER,
  COLOR_FELT_LIGHT,
  COLOR_FELT_DARK,
  SUIT_SYMBOLS,
  CARD_ANIMATION_DURATION_MS,
  FOUNDATION_FALLBACK_GAP,
} from '../../src/features/klondike/constants'
import {
  EMPTY_INVALID_WIGGLE,
  type CardMetrics,
  type InvalidWiggleConfig,
  type CelebrationBindings,
} from '../../src/features/klondike/types'

const AUTO_QUEUE_INTERVAL_MS = 100
const AUTO_QUEUE_MOVE_BUFFER_MS = 50
const AUTO_QUEUE_MOVE_DELAY_MS = CARD_ANIMATION_DURATION_MS + AUTO_QUEUE_MOVE_BUFFER_MS
const STAT_VERTICAL_MARGIN = EDGE_GUTTER
const DEMO_AUTO_STEP_INTERVAL_MS = 300

const DEFAULT_METRICS: CardMetrics = {
  width: BASE_CARD_WIDTH,
  height: BASE_CARD_HEIGHT,
  stackOffset: BASE_STACK_OFFSET,
  radius: 12,
}

const FLIGHT_WAIT_TIMEOUT_MS = 160

const CELEBRATION_DIALOG_DELAY_MS = 30_000

type CelebrationCardConfig = {
  card: Card
  suit: Suit
  suitIndex: number
  stackIndex: number
  baseX: number
  baseY: number
  randomSeed: number
}

type CelebrationState = {
  modeId: number
  durationMs: number
  boardWidth: number
  boardHeight: number
  cards: CelebrationCardConfig[]
}

function computeCardMetrics(availableWidth: number | null): CardMetrics {
  if (!availableWidth || availableWidth <= 0) {
    return DEFAULT_METRICS
  }

  const totalGap = TABLEAU_GAP * (TABLEAU_COLUMN_COUNT - 1)
  const widthAvailable = Math.max(availableWidth - totalGap, MIN_CARD_WIDTH * TABLEAU_COLUMN_COUNT)
  const rawWidth = widthAvailable / TABLEAU_COLUMN_COUNT
  const unclampedWidth = Math.max(Math.floor(rawWidth), MIN_CARD_WIDTH)
  const constrainedWidth = Math.min(Math.max(unclampedWidth, MIN_CARD_WIDTH), MAX_CARD_WIDTH)
  const height = Math.round(constrainedWidth * CARD_ASPECT_RATIO)
  const stackOffset = Math.max(24, Math.round(constrainedWidth * (BASE_STACK_OFFSET / BASE_CARD_WIDTH + 0.12)))
  const radius = Math.max(6, Math.round(constrainedWidth * 0.12))

  return {
    width: constrainedWidth,
    height,
    stackOffset,
    radius,
  }
}

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

export default function TabOneScreen() {
  const [state, dispatch] = useReducer(klondikeReducer, undefined, createInitialState)
  const [storageHydrationComplete, setStorageHydrationComplete] = useState(false)
  const [boardLayout, setBoardLayout] = useState<{ width: number | null; height: number | null }>({
    width: null,
    height: null,
  })
  const cardMetrics = useMemo(() => computeCardMetrics(boardLayout.width), [boardLayout.width])
  const navigation = useNavigation()
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
  const statisticsRows = useMemo(() => {
    const rows: Array<{ label: string; value: string }> = []
    if (showMoves) {
      rows.push({ label: 'Moves', value: String(state.moveCount) })
    }
    if (showTime) {
      rows.push({ label: 'Time', value: formattedElapsed })
    }
    return rows
  }, [formattedElapsed, showMoves, state.moveCount, showTime])
  const statsVisible = statisticsRows.length > 0
  const headerPaddingTop = EDGE_GUTTER
  const headerPaddingLeft = safeArea.left + COLUMN_MARGIN
  const headerPaddingRight = safeArea.right + COLUMN_MARGIN
  const autoCompleteRunsRef = useRef(state.autoCompleteRuns)
  const winCelebrationsRef = useRef(state.winCelebrations)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const previousMoveCountRef = useRef(state.moveCount)
  const stateRef = useRef(state)
  const lastRecordedShuffleRef = useRef<string | null>(null)
  const previousHasWonRef = useRef(state.hasWon)
  const celebrationDialogTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const celebrationDialogShownRef = useRef(false)
  const currentStartingPreviewRef = useRef(createHistoryPreviewFromState(state))
  const currentDisplayNameRef = useRef(formatShuffleDisplayName(state.shuffleId))
  const topRowLayoutRef = useRef<LayoutRectangle | null>(null)
  const foundationLayoutsRef = useRef<Partial<Record<Suit, LayoutRectangle>>>({})
  const boardLockedRef = useRef(false)
  const lastDemoLinkRef = useRef<string | null>(null)
  const [boardLocked, setBoardLocked] = useState(false)
  const [celebrationState, setCelebrationState] = useState<CelebrationState | null>(null)
  const updateBoardLocked = useCallback((locked: boolean) => {
    boardLockedRef.current = locked
    setBoardLocked(locked)
  }, [])
  const isCelebrationActive = celebrationState !== null
  const celebrationLabel = useMemo(() => {
    if (!developerModeEnabled || !celebrationState) {
      return null
    }
    const metadata = getCelebrationModeMetadata(celebrationState.modeId)
    const modeNumber = metadata ? metadata.id + 1 : celebrationState.modeId + 1
    const padded = modeNumber.toString().padStart(2, '0')
    return `Celebration ${padded} · ${metadata?.name ?? 'Unknown'}`
  }, [celebrationState, developerModeEnabled])
  const handleTopRowLayout = useCallback((layout: LayoutRectangle) => {
    topRowLayoutRef.current = layout
  }, [])
  const handleFoundationLayout = useCallback((suit: Suit, layout: LayoutRectangle) => {
    foundationLayoutsRef.current[suit] = layout
  }, [])
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
  const celebrationAssignments = useSharedValue<Record<string, CelebrationAssignment>>({})
  const celebrationProgress = useSharedValue(0)
  const celebrationActive = useSharedValue(0)
  const celebrationMode = useSharedValue(0)
  const celebrationBoard = useSharedValue<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })
  const celebrationTotal = useSharedValue(0)
  const celebrationAbortRef = useRef(false)
  const celebrationBindings = useMemo(
    () => ({
      active: celebrationActive,
      progress: celebrationProgress,
      assignments: celebrationAssignments,
      mode: celebrationMode,
      board: celebrationBoard,
      total: celebrationTotal,
    }),
    [
      celebrationActive,
      celebrationAssignments,
      celebrationBoard,
      celebrationMode,
      celebrationProgress,
      celebrationTotal,
    ],
  )

  const pauseTimer = useCallback(() => {
    const snapshot = stateRef.current
    if (snapshot.timerState === 'running') {
      dispatch({ type: 'TIMER_STOP', timestamp: Date.now() })
    }
  }, [dispatch])

  const resumeTimerIfNeeded = useCallback(() => {
    const snapshot = stateRef.current
    if (
      snapshot.timerState === 'paused' &&
      snapshot.moveCount > 0 &&
      !snapshot.hasWon &&
      !snapshot.isAutoCompleting
    ) {
      dispatch({ type: 'TIMER_START', startedAt: Date.now() })
    }
  }, [dispatch])
  const registerFoundationArrival = useCallback((cardId: string | null | undefined) => {
    const snapshot = stateRef.current
    const pilesSummary = FOUNDATION_SUIT_ORDER.map(
      (suit) => `${suit[0].toUpperCase()}:${snapshot.foundations[suit].length}`,
    ).join(', ')
    devLog(
      'info',
      `[Game] Foundation arrival card=${cardId ?? 'unknown'} piles=[${pilesSummary}] hasWon=${String(
        snapshot.hasWon,
      )} moves=${snapshot.moveCount}`,
    )
  }, [])
  const selectNextSolvableShuffle = useCallback(() => {
    if (!SOLVABLE_SHUFFLES.length) {
      return null
    }

    const stats = new Map<string, { plays: number; solves: number }>()

    historyEntries.forEach((entry) => {
      if (!entry.solvable) {
        return
      }
      const baseId = extractSolvableBaseId(entry.shuffleId) ?? entry.shuffleId
      if (!baseId) {
        return
      }
      const record = stats.get(baseId) ?? { plays: 0, solves: 0 }
      record.plays += 1
      if (entry.solved) {
        record.solves += 1
      }
      stats.set(baseId, record)
    })

    const unsolved = SOLVABLE_SHUFFLES.filter((shuffle) => {
      const record = stats.get(shuffle.id)
      return !record || record.solves === 0
    })

    const pool = unsolved.length ? unsolved : SOLVABLE_SHUFFLES
    if (!pool.length) {
      return null
    }

    let minimumPlayCount = Number.POSITIVE_INFINITY
    const candidates: SolvableShuffleConfig[] = []

    for (const shuffle of pool) {
      const plays = stats.get(shuffle.id)?.plays ?? 0
      if (plays < minimumPlayCount) {
        minimumPlayCount = plays
        candidates.length = 0
        candidates.push(shuffle)
      } else if (plays === minimumPlayCount) {
        candidates.push(shuffle)
      }
    }

    if (!candidates.length) {
      return pool[0]
    }

    const randomIndex = Math.floor(Math.random() * candidates.length)
    return candidates[randomIndex]
  }, [historyEntries])
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

  const clearCelebrationDialogTimer = useCallback(() => {
    if (celebrationDialogTimeoutRef.current) {
      clearTimeout(celebrationDialogTimeoutRef.current)
      celebrationDialogTimeoutRef.current = null
    }
  }, [])

  const [invalidWiggle, setInvalidWiggle] = useState<InvalidWiggleConfig>(() => ({
    ...EMPTY_INVALID_WIGGLE,
    lookup: new Set<string>(),
  }))
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
  const runDemoSequence = useCallback(
    ({ autoReveal, autoSolve }: { autoReveal?: boolean; autoSolve?: boolean }) => {
      if (!autoReveal && !autoSolve) {
        return
      }

      devLog(
        'info',
        '[Demo] Auto sequence started (autoReveal=' + Boolean(autoReveal) + ', autoSolve=' + Boolean(autoSolve) + ')',
      )

      const steps: Array<() => void> = []

      const pushTableauToFoundation = (columnIndex: number, suit: Suit) => {
        steps.push(() => {
          const column = stateRef.current.tableau[columnIndex]
          if (!column?.length) {
            return
          }
          const topIndex = column.length - 1
          dispatchWithFlight(
            {
              type: 'APPLY_MOVE',
              selection: { source: 'tableau', columnIndex, cardIndex: topIndex },
              target: { type: 'foundation', suit },
              recordHistory: false,
            },
            { source: 'tableau', columnIndex, cardIndex: topIndex },
          )
        })
      }

      const pushTableauSequence = (columnIndex: number, suit: Suit, count: number) => {
        for (let index = 0; index < count; index += 1) {
          pushTableauToFoundation(columnIndex, suit)
        }
      }

      pushTableauSequence(0, 'hearts', 3)
      pushTableauSequence(1, 'diamonds', 3)

      if (autoSolve) {
        pushTableauSequence(4, 'hearts', 5)
        pushTableauSequence(5, 'diamonds', 5)
        pushTableauSequence(2, 'clubs', 13)
        pushTableauSequence(3, 'spades', 13)

        const pushStockToFoundation = (suit: Suit, drawCount: number) => {
          for (let index = 0; index < drawCount; index += 1) {
            steps.push(() => {
              dispatch({ type: 'DRAW_OR_RECYCLE' })
            })
            steps.push(() => {
              dispatchWithFlight(
                {
                  type: 'APPLY_MOVE',
                  selection: { source: 'waste' },
                  target: { type: 'foundation', suit },
                  recordHistory: false,
                },
                { source: 'waste' },
              )
            })
          }
        }

        pushStockToFoundation('hearts', 5)
        pushStockToFoundation('diamonds', 5)
      }

      if (steps.length === 0) {
        return
      }

      devLog('info', `[Demo] Auto sequence queued ${steps.length} steps.`)

      steps.forEach((step, index) => {
        setTimeout(step, DEMO_AUTO_STEP_INTERVAL_MS * (index + 1))
      })

      const finalStepIndex = steps.length - 1
      if (finalStepIndex >= 0) {
        setTimeout(() => {
          devLog('info', '[Demo] Auto sequence completed dispatch queue.')
        }, DEMO_AUTO_STEP_INTERVAL_MS * (finalStepIndex + 2))
      }
    },
    [dispatch, dispatchWithFlight],
  )
  const handleLaunchDemoGame = useCallback(
    (options?: { autoReveal?: boolean; autoSolve?: boolean; force?: boolean }) => {
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

      clearCelebrationDialogTimer()
      recordCurrentGameResult()
      setCelebrationState(null)
      resetCardFlights()
      foundationLayoutsRef.current = {}
      topRowLayoutRef.current = null
      winCelebrationsRef.current = 0
      lastRecordedShuffleRef.current = null
      updateBoardLocked(false)

      const demoState = createDemoGameState()
      dispatch({ type: 'HYDRATE_STATE', state: demoState })

      devLog('info', '[Demo] Game loaded (options=' + JSON.stringify(options ?? {}) + ')')

      void clearGameState().catch((error) => {
        console.warn('Failed to clear persisted game before demo shuffle', error)
      })

      const shouldAutoReveal = options?.autoReveal || options?.autoSolve
      if (shouldAutoReveal) {
        setTimeout(() => {
          runDemoSequence({ autoReveal: shouldAutoReveal, autoSolve: options?.autoSolve })
        }, DEMO_AUTO_STEP_INTERVAL_MS)
      }
    },
    [
      boardLockedRef,
      clearCelebrationDialogTimer,
      clearGameState,
      developerModeEnabled,
      dispatch,
      recordCurrentGameResult,
      resetCardFlights,
      runDemoSequence,
      setCelebrationState,
      updateBoardLocked,
    ],
  )
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

  useFocusEffect(
    useCallback(() => {
      resumeTimerIfNeeded()
      return () => {
        pauseTimer()
      }
    }, [pauseTimer, resumeTimerIfNeeded]),
  )

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        resumeTimerIfNeeded()
      } else if (nextState === 'inactive' || nextState === 'background') {
        pauseTimer()
      }
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      subscription.remove()
    }
  }, [pauseTimer, resumeTimerIfNeeded])

  useEffect(() => {
    const previousMoveCount = previousMoveCountRef.current
    const moveIncreased = state.moveCount > previousMoveCount
    if (moveIncreased && state.timerState !== 'running') {
      dispatch({ type: 'TIMER_START', startedAt: Date.now() })
    }
    previousMoveCountRef.current = state.moveCount
  }, [dispatch, state.moveCount, state.timerState])

  useEffect(() => {
    if (state.timerState === 'running' && state.timerStartedAt === null) {
      dispatch({ type: 'TIMER_START', startedAt: Date.now() })
    }
  }, [dispatch, state.timerStartedAt, state.timerState])

  useEffect(() => {
    if (state.timerState !== 'running') {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
      return
    }

    if (!timerIntervalRef.current) {
      timerIntervalRef.current = setInterval(() => {
        dispatch({ type: 'TIMER_TICK', timestamp: Date.now() })
      }, TIMER_TICK_INTERVAL_MS)
      dispatch({ type: 'TIMER_TICK', timestamp: Date.now() })
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [dispatch, state.timerState])

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [])

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

  useEffect(() => {
    if (state.moveCount === 0) {
      currentStartingPreviewRef.current = createHistoryPreviewFromState(state)
      currentDisplayNameRef.current = formatShuffleDisplayName(state.shuffleId)
    }
  }, [state.moveCount, state.shuffleId, state.stock.length, state.waste.length])

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


  // Requirement PBI-13: hydrate persisted Klondike state on launch.
  useEffect(() => {
    let isCancelled = false

    ;(async () => {
      try {
        const persisted = await loadGameState()
        if (isCancelled) {
          return
        }

        if (!persisted) {
          return
        }

        if (persisted.status === 'won') {
          devLog('info', '[Game] Cleared completed session on startup; starting new shuffle.')
          try {
            await clearGameState()
          } catch (clearError) {
            devLog('warn', 'Failed clearing completed saved game state', clearError)
          }
          resetCardFlights()
          previousHasWonRef.current = false
          return
        }

        devLog('info', '[Game] Hydrating saved in-progress session.', {
          savedAt: persisted.savedAt,
          shuffleId: persisted.state.shuffleId,
        })
        previousHasWonRef.current = persisted.state.hasWon
        resetCardFlights()
        dispatch({ type: 'HYDRATE_STATE', state: persisted.state })
      } catch (error) {
        if (isCancelled) {
          return
        }

        let message = 'Saved game was corrupted and has been cleared.'
        if (error instanceof PersistedGameError && error.reason === 'unsupported-version') {
          message = 'Saved game came from an older version and has been cleared.'
        }

        try {
          await clearGameState()
        } catch (clearError) {
          devLog('warn', 'Failed clearing invalid saved game state', clearError)
        }

        if (!isCancelled) {
          devLog('warn', '[Toast suppressed] Game reset', { message })
        }
      } finally {
        if (!isCancelled) {
          setStorageHydrationComplete(true)
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [dispatch, resetCardFlights])

  // Requirement PBI-13: persist state changes after hydration.
  useEffect(() => {
    if (!storageHydrationComplete) {
      return
    }

    let isCancelled = false

    ;(async () => {
      try {
        await saveGameState(state)
      } catch (error) {
        if (!isCancelled) {
          devLog('warn', 'Failed to persist Klondike game state', error)
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [state, storageHydrationComplete])

  const handleBoardLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setBoardLayout((previous) => {
      if (previous.width === width && previous.height === height) {
        return previous
      }
      return { width, height }
    })
  }, [])

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

  const openCelebrationDialog = useCallback(() => {
    clearCelebrationDialogTimer()
    if (celebrationDialogShownRef.current) {
      return
    }
    celebrationDialogShownRef.current = true
    requestNewGame({ reason: 'celebration' })
  }, [clearCelebrationDialogTimer, requestNewGame])

  const handleCelebrationComplete = useCallback(() => {
    devLog('info', '[Celebration] complete')
    updateBoardLocked(false)
    setCelebrationState(null)
    openCelebrationDialog()
  }, [openCelebrationDialog, updateBoardLocked])

  const handleCelebrationAbort = useCallback(() => {
    celebrationAbortRef.current = true
    devLog('info', '[Celebration] abort requested')
    runOnUI(() => {
      'worklet'
      celebrationActive.value = 0
      cancelAnimation(celebrationProgress)
    })()
    clearCelebrationDialogTimer()
    updateBoardLocked(false)
    setCelebrationState(null)
    openCelebrationDialog()
  }, [
    celebrationActive,
    celebrationProgress,
    clearCelebrationDialogTimer,
    openCelebrationDialog,
    updateBoardLocked,
  ])

  useEffect(() => {
    if (!celebrationState) {
      celebrationAbortRef.current = false
      celebrationDialogShownRef.current = false
      celebrationAssignments.value = {}
      celebrationTotal.value = 0
      celebrationMode.value = 0
      celebrationBoard.value = { width: 0, height: 0 }
      runOnUI(() => {
        'worklet'
        celebrationActive.value = 0
        cancelAnimation(celebrationProgress)
      })()
      clearCelebrationDialogTimer()
    updateBoardLocked(false)
      return
    }

    celebrationAbortRef.current = false
    celebrationDialogShownRef.current = false
    clearCelebrationDialogTimer()

    const assignmentMap: Record<string, CelebrationAssignment> = {}
    celebrationState.cards.forEach((config, index) => {
      assignmentMap[config.card.id] = {
        baseX: config.baseX,
        baseY: config.baseY,
        stackIndex: config.stackIndex,
        suitIndex: config.suitIndex,
        randomSeed: config.randomSeed,
        index,
      }
    })

    celebrationAssignments.value = assignmentMap
    celebrationTotal.value = celebrationState.cards.length
    celebrationMode.value = celebrationState.modeId
    celebrationBoard.value = {
      width: celebrationState.boardWidth,
      height: celebrationState.boardHeight,
    }

    devLog('info', '[Celebration] start', {
      cards: celebrationState.cards.length,
      mode: celebrationState.modeId,
    })

    runOnUI(() => {
      'worklet'
      celebrationActive.value = 1
      celebrationProgress.value = 0
      celebrationProgress.value = withTiming(
        1,
        { duration: celebrationState.durationMs, easing: Easing.linear },
        (finished) => {
          if (finished && !celebrationAbortRef.current) {
            runOnJS(handleCelebrationComplete)()
          }
        },
      )
    })()

    celebrationDialogTimeoutRef.current = setTimeout(
      openCelebrationDialog,
      CELEBRATION_DIALOG_DELAY_MS,
    )

    return () => {
      celebrationAbortRef.current = true
      clearCelebrationDialogTimer()
      runOnUI(() => {
        'worklet'
        celebrationActive.value = 0
        cancelAnimation(celebrationProgress)
      })()
    }
  }, [
    celebrationActive,
    celebrationAssignments,
    celebrationBoard,
    celebrationMode,
    celebrationProgress,
    celebrationState,
    celebrationTotal,
    clearCelebrationDialogTimer,
    handleCelebrationComplete,
    openCelebrationDialog,
    updateBoardLocked,
  ])

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

  const handleManualSelectTableau = useCallback(
    (columnIndex: number, cardIndex: number) => {
      if (boardLockedRef.current) {
        return
      }
      dispatch({ type: 'SELECT_TABLEAU', columnIndex, cardIndex })
    },
    [dispatch],
  )

  const handleManualWasteSelect = useCallback(() => {
    if (boardLockedRef.current) {
      return
    }
    dispatch({ type: 'SELECT_WASTE' })
  }, [dispatch])

  const handleManualFoundationSelect = useCallback(
    (suit: Suit) => {
      if (boardLockedRef.current) {
        return
      }
      dispatch({ type: 'SELECT_FOUNDATION_TOP', suit })
    },
    [dispatch],
  )

  const handleColumnPress = useCallback(
    (columnIndex: number) => {
      if (boardLockedRef.current) {
        return
      }
      if (!state.selected) {
        return
      }
      if (dropHints.tableau[columnIndex]) {
        dispatchWithFlight({ type: 'PLACE_ON_TABLEAU', columnIndex }, state.selected)
      } else {
        notifyInvalidMove({ selection: state.selected })
      }
    },
    [dispatchWithFlight, dropHints.tableau, notifyInvalidMove, state.selected],
  )

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
    [attemptAutoMove, dispatchWithFlight, dropHints.foundations, notifyInvalidMove, state.foundations, state.selected],
)

  const clearSelection = useCallback(() => {
    if (boardLockedRef.current) {
      return
    }
    if (state.selected) {
      dispatch({ type: 'CLEAR_SELECTION' })
    }
  }, [dispatch, state.selected])

  const hasUndo = state.history.length > 0
  const timelineRange = state.history.length + state.future.length
  const shouldShowUndo = !state.hasWon && !celebrationState && timelineRange > 0
  const canUndo = !boardLocked && hasUndo
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubValue, setScrubValue] = useState(0)
  const isScrubbingRef = useRef(false)
  const scrubPointerRef = useRef(0)
  const scrubPendingIndexRef = useRef<number | null>(null)
  const scrubDispatchRafRef = useRef<number | null>(null)
  const lastDispatchedScrubIndexRef = useRef(state.history.length)

  useEffect(() => {
    isScrubbingRef.current = isScrubbing
  }, [isScrubbing])

  useEffect(() => {
    if (!isScrubbing) {
      lastDispatchedScrubIndexRef.current = state.history.length
    }
  }, [isScrubbing, state.history.length])

  useEffect(() => {
    if (!shouldShowUndo && isScrubbing) {
      setIsScrubbing(false)
      scrubPointerRef.current = 0
      setScrubValue(0)
    }
  }, [shouldShowUndo, isScrubbing])

  useEffect(() => {
    if (isScrubbing) {
      return
    }
    const pointer = state.history.length
    if (scrubPointerRef.current !== pointer) {
      scrubPointerRef.current = pointer
    }
    setScrubValue((current) => (current === pointer ? current : pointer))
  }, [isScrubbing, state.history.length])

  const scrubSliderMax = useMemo(() => Math.max(timelineRange, 1), [timelineRange])
  const scrubSliderValue = useMemo(() => [scrubValue], [scrubValue])

  const cancelScheduledScrub = useCallback(() => {
    if (scrubDispatchRafRef.current !== null) {
      cancelAnimationFrame(scrubDispatchRafRef.current)
      scrubDispatchRafRef.current = null
    }
    scrubPendingIndexRef.current = null
  }, [])

  useEffect(() => cancelScheduledScrub, [cancelScheduledScrub])

  const computeScrubIndexFromAbsolute = useCallback(
    (absoluteX: number): number => {
      const totalRange = timelineRange
      if (totalRange <= 0) {
        return 0
      }
      const windowWidth = Dimensions.get('window').width || 1
      const usableWidth = Math.max(windowWidth - safeArea.left - safeArea.right, 1)
      const relativeX = Math.min(
        Math.max(absoluteX - safeArea.left, 0),
        usableWidth,
      )
      const normalized = relativeX / usableWidth
      return Math.max(0, Math.min(Math.round(normalized * totalRange), totalRange))
    },
    [safeArea.left, safeArea.right, timelineRange],
  )

  const scheduleScrubDispatch = useCallback(
    (index: number) => {
      scrubPendingIndexRef.current = index
      if (scrubDispatchRafRef.current !== null) {
        return
      }
      scrubDispatchRafRef.current = requestAnimationFrame(() => {
        scrubDispatchRafRef.current = null
        const pending = scrubPendingIndexRef.current
        scrubPendingIndexRef.current = null
        if (pending === null || pending === lastDispatchedScrubIndexRef.current) {
          return
        }
        lastDispatchedScrubIndexRef.current = pending
        dispatch({ type: 'SCRUB_TO_INDEX', index: pending })
      })
    },
    [dispatch],
  )

  const handleScrubGestureStart = useCallback(
    (absoluteX: number) => {
      if (boardLocked || !shouldShowUndo) {
        return
      }
      const pointer = computeScrubIndexFromAbsolute(absoluteX)
      scrubPointerRef.current = pointer
      lastDispatchedScrubIndexRef.current = pointer
      isScrubbingRef.current = true
      setScrubValue(pointer)
      setIsScrubbing(true)
    },
    [boardLocked, computeScrubIndexFromAbsolute, shouldShowUndo],
  )

  const handleScrubGestureUpdate = useCallback(
    (absoluteX: number) => {
      if (!shouldShowUndo || !isScrubbingRef.current) {
        return
      }
      const totalRange = timelineRange
      if (totalRange <= 0) {
        return
      }
      const nextIndex = computeScrubIndexFromAbsolute(absoluteX)
      if (nextIndex === scrubPointerRef.current) {
        return
      }
      scrubPointerRef.current = nextIndex
      setScrubValue(nextIndex)
      scheduleScrubDispatch(nextIndex)
    },
    [computeScrubIndexFromAbsolute, scheduleScrubDispatch, shouldShowUndo, timelineRange],
  )

  const handleScrubGestureEnd = useCallback(() => {
    if (!isScrubbingRef.current) {
      return
    }
    const finalIndex = scrubPointerRef.current
    scheduleScrubDispatch(finalIndex)
    isScrubbingRef.current = false
    setIsScrubbing(false)
  }, [scheduleScrubDispatch])

  const undoScrubGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(!boardLocked && shouldShowUndo)
      .minDistance(2)
      .activeOffsetY([-20, 20])
      .onStart((event) => {
        runOnJS(handleScrubGestureStart)(event.absoluteX)
      })
      .onUpdate((event) => {
        runOnJS(handleScrubGestureUpdate)(event.absoluteX)
      })
      .onEnd(() => {
        runOnJS(handleScrubGestureEnd)()
      })
      .onFinalize(() => {
        runOnJS(handleScrubGestureEnd)()
      })
      .maxPointers(1)
  }, [boardLocked, handleScrubGestureEnd, handleScrubGestureStart, handleScrubGestureUpdate, shouldShowUndo])

  const handleUndoTap = useCallback(() => {
    if (isScrubbingRef.current || !canUndo) {
      return
    }
    handleUndo()
  }, [canUndo, handleUndo])
  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer())
  }, [navigation])

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

  useEffect(() => {
    if (!animationsEnabled || !celebrationAnimationsEnabled) {
      return
    }

    if (state.winCelebrations <= winCelebrationsRef.current) {
      return
    }

    winCelebrationsRef.current = state.winCelebrations
    devLog('info', '[Game] Foundations complete, player won the game.')
    devLog('log', '[Toast suppressed] Celebration triggered', {
      celebrations: state.winCelebrations,
    })

    if (celebrationState) {
      return
    }

    ensureCardFlightsReady()

    const boardWidthValue = boardLayout.width ?? 0
    const boardHeightValue = boardLayout.height ?? 0

    if (!boardWidthValue || !boardHeightValue) {
      return
    }

    const topLayout = topRowLayoutRef.current
    const topOffsetX = topLayout?.x ?? 0
    const topOffsetY = topLayout?.y ?? 0
    const fallbackSpacing = cardMetrics.width + FOUNDATION_FALLBACK_GAP
    const cards: CelebrationCardConfig[] = []

    FOUNDATION_SUIT_ORDER.forEach((suit, suitIndex) => {
      const pile = state.foundations[suit]
      if (!pile.length) {
        return
      }
      const layout = foundationLayoutsRef.current[suit]
      const baseX = topOffsetX + (layout?.x ?? suitIndex * fallbackSpacing)
      const baseY = topOffsetY + (layout?.y ?? 0)

      pile.forEach((card, stackIndex) => {
        const cardOffsetY = stackIndex * (cardMetrics.height * 0.02)
        cards.push({
          card,
          suit,
          suitIndex,
          stackIndex,
          baseX,
          baseY: baseY - cardOffsetY,
          randomSeed: Math.random(),
        })
      })
    })

    if (!cards.length) {
      return
    }

    const shuffledCards = [...cards].sort(() => Math.random() - 0.5)
    const modeId = Math.floor(Math.random() * CELEBRATION_MODE_COUNT)

    setCelebrationState({
      modeId,
      durationMs: CELEBRATION_DURATION_MS,
      boardWidth: boardWidthValue,
      boardHeight: boardHeightValue,
      cards: shuffledCards,
    })
    updateBoardLocked(true)
  }, [
    animationsEnabled,
    celebrationAnimationsEnabled,
    boardLayout.height,
    boardLayout.width,
    cardMetrics.height,
    cardMetrics.width,
    celebrationState,
    ensureCardFlightsReady,
    state.foundations,
    state.winCelebrations,
    updateBoardLocked,
  ])

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
      {/* Renders the felt board background pattern behind all gameplay elements. */}
      <FeltBackground />
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
        {statsVisible ? (
          <>
            {/* Shows the move/time statistics badges when enabled in settings. */}
          <StatisticsHud rows={statisticsRows} />
          </>
        ) : (
          <StatisticsPlaceholder />
        )}
      </View>

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
          onWasteHold={handleManualWasteSelect}
          onFoundationPress={handleFoundationPress}
          onFoundationHold={handleManualFoundationSelect}
          cardMetrics={cardMetrics}
          dropHints={dropHints}
          notifyInvalidMove={notifyInvalidMove}
          invalidWiggle={invalidWiggle}
          cardFlights={cardFlights}
          onCardMeasured={handleCardMeasured}
          cardFlightMemory={cardFlightMemoryRef.current}
          onFoundationArrival={registerFoundationArrival}
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
          onLongPress={handleManualSelectTableau}
          onColumnPress={handleColumnPress}
          invalidWiggle={invalidWiggle}
          cardFlights={cardFlights}
          onCardMeasured={handleCardMeasured}
          cardFlightMemory={cardFlightMemoryRef.current}
          interactionsLocked={boardLocked}
        />
        <SelectionHint state={state} onClear={clearSelection} />
        {celebrationState ? (
          /* Prevents touches during celebrations and lets developers abort the sequence. */
          <CelebrationTouchBlocker onAbort={handleCelebrationAbort} />
        ) : null}
        {celebrationLabel ? (
          <View pointerEvents="none" style={styles.celebrationDebugBadge}>
            <Text style={styles.celebrationDebugBadgeText}>{celebrationLabel}</Text>
          </View>
        ) : null}
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

const SelectionHint = ({ state, onClear }: { state: GameState; onClear: () => void }) => {
  if (!state.selected) {
    return null
  }

  const selectionLabel = describeSelection(state)

  return (
    <XStack gap="$2" style={{ alignItems: 'center' }}>
      <Paragraph color="$color11">Selected: {selectionLabel}</Paragraph>
      <Button size="$2" variant="outlined" onPress={onClear}>
        Clear
      </Button>
    </XStack>
  )
}

const describeSelection = (state: GameState): string => {
  const selection = state.selected
  if (!selection) {
    return 'None'
  }
  if (selection.source === 'waste') {
    return 'Waste top card'
  }
  if (selection.source === 'foundation') {
    return `${selection.suit.toUpperCase()} foundation top`
  }
  const columnLabel = selection.columnIndex + 1
  const card = state.tableau[selection.columnIndex]?.[selection.cardIndex]
  const cardLabel = card ? `${rankToLabel(card.rank)}${SUIT_SYMBOLS[card.suit]}` : 'card'
  return `Column ${columnLabel} – ${cardLabel}`
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
  celebrationDebugBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
  },
  celebrationDebugBadgeText: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
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
