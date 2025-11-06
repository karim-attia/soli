import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  ReactNode,
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
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  measure,
  runOnJS,
  runOnUI,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import type { AnimatedRef, SharedValue } from 'react-native-reanimated'
import { useNavigation } from 'expo-router'
import { DrawerActions } from '@react-navigation/native'
import { Button, H2, Paragraph, Text, XStack, YStack, useTheme } from 'tamagui'
import { Menu, RefreshCcw, Undo2 } from '@tamagui/lucide-icons'
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
import { SOLVABLE_SHUFFLES, extractSolvableBaseId } from '../../src/data/solvableShuffles'
import {
  createHistoryPreviewFromState,
  formatShuffleDisplayName,
  useHistory,
} from '../../src/state/history'
import { useAnimationToggles, useSettings } from '../../src/state/settings'

const BASE_CARD_WIDTH = 72
const BASE_CARD_HEIGHT = 102
const CARD_ASPECT_RATIO = BASE_CARD_HEIGHT / BASE_CARD_WIDTH
const BASE_STACK_OFFSET = 28
const TABLEAU_GAP = 10
const MAX_CARD_WIDTH = 96
const MIN_CARD_WIDTH = 24
const WASTE_FAN_OVERLAP_RATIO = 0.35
const WASTE_FAN_MAX_OFFSET = 28
const WASTE_ENTRY_BACKTRACK_RATIO = 0.45
const WASTE_ENTRY_BACKTRACK_MAX = 24
const AUTO_QUEUE_INTERVAL_MS = 200
const COLUMN_MARGIN = TABLEAU_GAP / 2
const COLOR_CARD_FACE = '#ffffff'
const COLOR_CARD_BACK = '#3b4d75'
const COLOR_CARD_BORDER = '#cbd5f5'
const COLOR_SELECTED_BORDER = '#c084fc'
const COLOR_DROP_BORDER = '#22a06b'
const COLOR_COLUMN_BORDER = '#d0d5dd'
const COLOR_COLUMN_SELECTED = 'rgba(147, 197, 253, 0.25)'
const COLOR_FOUNDATION_BORDER = '#94a3b8'
const COLOR_TEXT_MUTED = '#94a3b8'
const COLOR_TEXT_STRONG = '#1f2933'
const COLOR_FELT_LIGHT = '#6B8E5A'
const COLOR_FELT_DARK = '#4A5F3F'
const COLOR_FELT_TEXT_PRIMARY = '#f8fafc'
const COLOR_FELT_TEXT_SECONDARY = '#e2f2d9'
const SUIT_SYMBOLS: Record<Suit, string> = {
  clubs: '♣',
  diamonds: '♦',
  hearts: '♥',
  spades: '♠',
}
const SUIT_COLORS: Record<Suit, string> = {
  clubs: '#111827',
  spades: '#111827',
  diamonds: '#c92a2a',
  hearts: '#c92a2a',
}
const FACE_CARD_LABELS: Partial<Record<Rank, string>> = {
  1: 'A',
  11: 'J',
  12: 'Q',
  13: 'K',
}
const CARD_ANIMATION_DURATION_MS = 90
const CARD_MOVE_EASING = Easing.bezier(0.15, 0.9, 0.2, 1)
const CARD_FLIGHT_TIMING = {
  duration: CARD_ANIMATION_DURATION_MS,
  easing: CARD_MOVE_EASING,
}
const AUTO_QUEUE_MOVE_DELAY_MS = CARD_ANIMATION_DURATION_MS + 80
const DEMO_AUTO_STEP_INTERVAL_MS = 300

const CARD_FLIP_HALF_DURATION_MS = 40
const CARD_FLIP_HALF_TIMING = {
  duration: CARD_FLIP_HALF_DURATION_MS,
  easing: Easing.bezier(0.45, 0, 0.55, 1),
}
const WASTE_SLIDE_DURATION_MS = 70
const WASTE_SLIDE_EASING = Easing.bezier(0.15, 0.9, 0.2, 1)
const WASTE_TIMING_CONFIG = {
  duration: WASTE_SLIDE_DURATION_MS,
  easing: WASTE_SLIDE_EASING,
}
const WIGGLE_OFFSET_PX = 5
const WIGGLE_SEGMENT_DURATION_MS = 70
const WIGGLE_EASING = Easing.bezier(0.4, 0, 0.2, 1)
const WIGGLE_TIMING_CONFIG = {
  duration: WIGGLE_SEGMENT_DURATION_MS,
  easing: WIGGLE_EASING,
}
const FOUNDATION_GLOW_MAX_OPACITY = 0.55
const FOUNDATION_GLOW_IN_DURATION_MS = 90
const FOUNDATION_GLOW_OUT_DURATION_MS = 220
const FOUNDATION_GLOW_COLOR = 'rgba(255, 255, 160, 0.65)'
const FOUNDATION_GLOW_OUTSET = 10
const FOUNDATION_GLOW_IN_TIMING = {
  duration: FOUNDATION_GLOW_IN_DURATION_MS,
  easing: Easing.bezier(0.3, 0, 0.5, 1),
}
const FOUNDATION_GLOW_OUT_TIMING = {
  duration: FOUNDATION_GLOW_OUT_DURATION_MS,
  easing: Easing.bezier(0.2, 0, 0.2, 1),
}
const FOUNDATION_WIGGLE_SUPPRESS_MS = 250
const FLIGHT_WAIT_TIMEOUT_MS = 160

const AnimatedView = Animated.createAnimatedComponent(View)
type CardFlightRegistry = SharedValue<Record<string, CardFlightSnapshot>>

type CardMetrics = {
  width: number
  height: number
  stackOffset: number
  radius: number
}

type InvalidWiggleConfig = {
  key: number
  lookup: Set<string>
}

const EMPTY_INVALID_WIGGLE: InvalidWiggleConfig = {
  key: 0,
  lookup: new Set<string>(),
}

const DEFAULT_METRICS: CardMetrics = {
  width: BASE_CARD_WIDTH,
  height: BASE_CARD_HEIGHT,
  stackOffset: BASE_STACK_OFFSET,
  radius: 12,
}

const CELEBRATION_DIALOG_DELAY_MS = 30_000
const FOUNDATION_FALLBACK_GAP = 16

type CelebrationCardConfig = {
  card: Card
  suit: Suit
  suitIndex: number
  stackIndex: number
  baseX: number
  baseY: number
  randomSeed: number
}

type CelebrationBindings = {
  active: SharedValue<number>
  progress: SharedValue<number>
  assignments: SharedValue<Record<string, CelebrationAssignment>>
  mode: SharedValue<number>
  board: SharedValue<{ width: number; height: number }>
  total: SharedValue<number>
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
  const autoCompleteRunsRef = useRef(state.autoCompleteRuns)
  const winCelebrationsRef = useRef(state.winCelebrations)
  const recentFoundationArrivalsRef = useRef<Map<string, number>>(new Map())
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

    if (!cardId) {
      return
    }
    const expiry = Date.now() + FOUNDATION_WIGGLE_SUPPRESS_MS
    recentFoundationArrivalsRef.current.set(cardId, expiry)
    setTimeout(() => {
      const storedExpiry = recentFoundationArrivalsRef.current.get(cardId)
      if (storedExpiry !== undefined && storedExpiry <= Date.now()) {
        recentFoundationArrivalsRef.current.delete(cardId)
      }
    }, FOUNDATION_WIGGLE_SUPPRESS_MS)
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

    let candidate = pool[0]
    let candidatePlays = stats.get(candidate.id)?.plays ?? 0

    for (const shuffle of pool) {
      const plays = stats.get(shuffle.id)?.plays ?? 0
      if (plays < candidatePlays || (plays === candidatePlays && shuffle.id < candidate.id)) {
        candidate = shuffle
        candidatePlays = plays
      }
    }

    return candidate
  }, [historyEntries])
  const dealNewGame = useCallback(() => {
    if (settingsHydrated && solvableGamesOnly) {
      const solvableShuffle = selectNextSolvableShuffle()
      if (solvableShuffle) {
        const solvableState = createSolvableGameState(solvableShuffle)
        dispatch({ type: 'HYDRATE_STATE', state: solvableState })
        lastRecordedShuffleRef.current = null
        return
      }
    }

    dispatch({ type: 'NEW_GAME' })
    lastRecordedShuffleRef.current = null
  }, [dispatch, selectNextSolvableShuffle, settingsHydrated, solvableGamesOnly])

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

      recordResult({
        shuffleId: current.shuffleId,
        solved,
        solvable: Boolean(current.solvableId),
        finishedAt: new Date().toISOString(),
        moves: current.moveCount,
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
        devLog('info', `[Game] Dispatch APPLY_MOVE → foundation:${destination} from ${sourceLabel}`)
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
      devLog('info', '[Wiggle] trigger', { cards: ids, selection: selectionLabel })
      setInvalidWiggle({
        key: Date.now(),
        lookup: new Set(ids),
      })
    },
    [state],
  )
  const autoPlayActive = state.isAutoCompleting || state.autoQueue.length > 0
  const shouldSuppressFoundationWiggle = useCallback((selection: Selection | null | undefined) => {
    const now = Date.now()

    const ids = selection ? collectSelectionCardIds(stateRef.current, selection) : []
    if (ids.length) {
      const allRecent = ids.every((id) => {
        const expiry = recentFoundationArrivalsRef.current.get(id)
        return expiry !== undefined && expiry >= now
      })
      if (allRecent) {
        return true
      }
    }

    for (const expiry of recentFoundationArrivalsRef.current.values()) {
      if (expiry >= now) {
        return true
      }
    }

    return false
  }, [])
  const notifyInvalidMove = useCallback(
    (options?: { selection?: Selection | null }) => {
      if (autoPlayActive) {
        return
      }
      if (boardLockedRef.current) {
        return
      }
      if (shouldSuppressFoundationWiggle(options?.selection ?? null)) {
        devLog('log', '[Wiggle] suppressed for recent foundation arrival', options)
        return
      }
      triggerInvalidSelectionWiggle(options?.selection ?? null)
    },
    [autoPlayActive, shouldSuppressFoundationWiggle, triggerInvalidSelectionWiggle],
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

  useEffect(() => {
    stateRef.current = state
  }, [state])

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
      devLog(
        'info',
        `[Game] hasWon set true (moves=${state.moveCount}, winCelebrations=${state.winCelebrations}).`,
      )
      recordCurrentGameResult({ solved: true })
    }

    previousHasWonRef.current = isWon
  }, [recordCurrentGameResult, state.hasWon, state.moveCount, state.winCelebrations])


  // Requirement PBI-13: hydrate persisted Klondike state on launch.
  useEffect(() => {
    let isCancelled = false

    ;(async () => {
      try {
        const persistedState = await loadGameState()
        if (isCancelled) {
          return
        }
        if (persistedState) {
          dispatch({ type: 'HYDRATE_STATE', state: persistedState })
        }
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
  }, [dispatch])

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

  const shouldShowUndo = !state.hasWon && !celebrationState && state.history.length > 0
  const canUndo = !boardLocked && shouldShowUndo
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
      pt="$6"
      pb="$2"
      gap="$4"
      style={{ backgroundColor: feltBackground }}
    >
      <FeltPattern />
      <H2 style={styles.centeredHeading}>Klondike Solitaire</H2>
      <Paragraph style={styles.centeredParagraph}>
        Tap to auto-move cards; long-press to pick one up and choose a destination.
      </Paragraph>

      <YStack
        flex={1}
        onLayout={handleBoardLayout}
        style={styles.boardShell}
        px="$2"
        py="$2"
        gap="$3"
      >
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
        <XStack
          gap="$2"
          style={{ justifyContent: 'flex-start', alignItems: 'center' }}
        >
          <Text style={styles.movesLabel}>Moves</Text>
          <Text style={styles.movesValue}>{state.moveCount}</Text>
        </XStack>
        {celebrationState ? (
          <CelebrationTouchBlocker onAbort={handleCelebrationAbort} />
        ) : null}
        {celebrationLabel ? (
          <View pointerEvents="none" style={styles.celebrationDebugBadge}>
            <Text style={styles.celebrationDebugBadgeText}>{celebrationLabel}</Text>
          </View>
        ) : null}
      </YStack>

      {shouldShowUndo ? (
        <XStack mt="$3" style={{ justifyContent: 'flex-end' }}>
          <Button
            width="50%"
            icon={Undo2}
            onPress={handleUndo}
            disabled={!canUndo}
            themeInverse
          >
            Undo
          </Button>
        </XStack>
      ) : null}
    </YStack>
  )
}

type TopRowProps = {
  state: GameState
  drawLabel: string
  onDraw: () => void
  onWasteTap: () => void
  onWasteHold: () => void
  onFoundationPress: (suit: Suit) => void
  onFoundationHold: (suit: Suit) => void
  cardMetrics: CardMetrics
  dropHints: ReturnType<typeof getDropHints>
  notifyInvalidMove: (options?: { selection?: Selection | null }) => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  onFoundationArrival?: (cardId: string | null | undefined) => void
  interactionsLocked: boolean
  hideFoundations?: boolean
  onTopRowLayout?: (layout: LayoutRectangle) => void
  onFoundationLayout?: (suit: Suit, layout: LayoutRectangle) => void
  celebrationBindings?: CelebrationBindings
  celebrationActive?: boolean
}

const TopRow = ({
  state,
  drawLabel,
  onDraw,
  onWasteTap,
  onWasteHold,
  onFoundationPress,
  onFoundationHold,
  cardMetrics,
  dropHints,
  notifyInvalidMove,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  onFoundationArrival,
  interactionsLocked,
  hideFoundations,
  onTopRowLayout,
  onFoundationLayout,
  celebrationBindings,
  celebrationActive = false,
}: TopRowProps) => {
  const handleFoundationArrival = onFoundationArrival ?? (() => {})
  const stockDisabled = (!state.stock.length && !state.waste.length) || interactionsLocked
  const wasteSelected = state.selected?.source === 'waste'
  const showRecycle = !state.stock.length && state.waste.length > 0
  const drawVariant = showRecycle
    ? 'recycle'
    : state.stock.length
      ? 'stock'
      : 'empty'

  const handleWastePress = useCallback(() => {
    if (interactionsLocked) {
      return
    }
    if (!state.waste.length) {
      notifyInvalidMove()
      return
    }
    onWasteTap()
  }, [interactionsLocked, notifyInvalidMove, onWasteTap, state.waste.length])

  const handleRowLayout = useCallback(
    (event: LayoutChangeEvent) => {
      onTopRowLayout?.(event.nativeEvent.layout)
    },
    [onTopRowLayout],
  )

  const createFoundationLayoutHandler = useCallback(
    (suit: Suit) => (layout: LayoutRectangle) => {
      onFoundationLayout?.(suit, layout)
    },
    [onFoundationLayout],
  )

  return (
    <XStack gap="$4" width="100%" items="flex-start" onLayout={handleRowLayout}>
      <XStack gap="$2" flexWrap="nowrap" justify="flex-start" shrink={0}>
        {FOUNDATION_SUIT_ORDER.map((suit) => (
          <FoundationPile
            key={suit}
            suit={suit}
            cards={state.foundations[suit]}
            cardMetrics={cardMetrics}
            isDroppable={dropHints.foundations[suit]}
            isSelected={state.selected?.source === 'foundation' && state.selected.suit === suit}
            onPress={() => onFoundationPress(suit)}
            onLongPress={() => onFoundationHold(suit)}
            invalidWiggle={invalidWiggle}
            cardFlights={cardFlights}
            onCardMeasured={onCardMeasured}
            cardFlightMemory={cardFlightMemory}
            onCardArrived={handleFoundationArrival}
            disableInteractions={interactionsLocked}
            hideTopCard={hideFoundations && !celebrationActive}
            celebrationBindings={celebrationBindings}
            celebrationActive={celebrationActive}
            onLayout={createFoundationLayoutHandler(suit)}
          />
        ))}
      </XStack>

      <XStack flex={1} gap="$3" justify="flex-end" items="flex-end">
        <PileButton
          label={`${state.waste.length}`}
          onPress={handleWastePress}
          disabled={!state.waste.length || interactionsLocked}
          disablePress
        >
          {state.waste.length ? (
            <WasteFan
              cards={state.waste}
              metrics={cardMetrics}
              isSelected={wasteSelected}
              onPress={handleWastePress}
              onLongPress={onWasteHold}
              invalidWiggle={invalidWiggle}
              cardFlights={cardFlights}
              onCardMeasured={onCardMeasured}
              cardFlightMemory={cardFlightMemory}
              disabled={interactionsLocked}
            />
          ) : (
            <EmptySlot highlight={false} metrics={cardMetrics} />
          )}
        </PileButton>

        {!state.hasWon && (
          <PileButton label={`${state.stock.length}`} onPress={onDraw} disabled={stockDisabled}>
            <CardBack
              label={state.stock.length ? drawLabel : undefined}
              metrics={cardMetrics}
              variant={drawVariant}
              icon={showRecycle ? <RefreshCcw color="#0f172a" size={18} /> : undefined}
            />
          </PileButton>
        )}
      </XStack>
    </XStack>
  )
}

type TableauSectionProps = {
  state: GameState
  cardMetrics: CardMetrics
  dropHints: ReturnType<typeof getDropHints>
  onAutoMove: (selection: Selection) => void
  onLongPress: (columnIndex: number, cardIndex: number) => void
  onColumnPress: (columnIndex: number) => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  interactionsLocked: boolean
}

const TableauSection = ({
  state,
  cardMetrics,
  dropHints,
  onAutoMove,
  onLongPress,
  onColumnPress,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  interactionsLocked,
}: TableauSectionProps) => (
  <View style={styles.tableauRow}>
    {state.tableau.map((column, columnIndex) => (
      <TableauColumn
        key={`col-${columnIndex}`}
        column={column}
        columnIndex={columnIndex}
        state={state}
        cardMetrics={cardMetrics}
        isDroppable={dropHints.tableau[columnIndex]}
        onCardPress={(cardIndex) =>
          onAutoMove({ source: 'tableau', columnIndex, cardIndex })
        }
        onCardLongPress={(cardIndex) => onLongPress(columnIndex, cardIndex)}
        onColumnPress={() => onColumnPress(columnIndex)}
        invalidWiggle={invalidWiggle}
        cardFlights={cardFlights}
        onCardMeasured={onCardMeasured}
        cardFlightMemory={cardFlightMemory}
        disableInteractions={interactionsLocked}
      />
    ))}
  </View>
)

type TableauColumnProps = {
  column: Card[]
  columnIndex: number
  state: GameState
  cardMetrics: CardMetrics
  isDroppable: boolean
  onCardPress: (cardIndex: number) => void
  onCardLongPress: (cardIndex: number) => void
  onColumnPress: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  disableInteractions: boolean
}

const TableauColumn = ({
  column,
  columnIndex,
  state,
  cardMetrics,
  isDroppable,
  onCardPress,
  onCardLongPress,
  onColumnPress,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  disableInteractions,
}: TableauColumnProps) => {
  const columnHeight = column.length
    ? cardMetrics.height + (column.length - 1) * cardMetrics.stackOffset
    : cardMetrics.height
  const columnSelected =
    state.selected?.source === 'tableau' && state.selected.columnIndex === columnIndex
  const selectedCardIndex =
    columnSelected && state.selected?.source === 'tableau' ? state.selected.cardIndex : null

  return (
    <Pressable
      style={[
        styles.column,
        {
          width: cardMetrics.width,
          height: columnHeight,
          borderColor:
            column.length === 0
              ? 'transparent'
              : isDroppable
                ? COLOR_DROP_BORDER
                : COLOR_COLUMN_BORDER,
          backgroundColor: columnSelected ? COLOR_COLUMN_SELECTED : 'transparent',
          marginHorizontal: COLUMN_MARGIN,
        },
      ]}
      onPress={disableInteractions ? undefined : onColumnPress}
      disabled={disableInteractions}
    >
      {column.length === 0 && (
        <EmptySlot highlight={isDroppable} metrics={cardMetrics} />
      )}
      {column.map((card, cardIndex) => (
        <CardView
          key={card.id}
          card={card}
          metrics={cardMetrics}
          offsetTop={cardIndex * cardMetrics.stackOffset}
          isSelected={
            columnSelected &&
            selectedCardIndex !== null &&
            selectedCardIndex <= cardIndex &&
            card.faceUp
          }
          onPress={
            disableInteractions || !card.faceUp
              ? undefined
              : () => onCardPress(cardIndex)
          }
          onLongPress={
            disableInteractions || !card.faceUp
              ? undefined
              : () => onCardLongPress(cardIndex)
          }
          invalidWiggle={invalidWiggle}
          cardFlights={cardFlights}
          onCardMeasured={onCardMeasured}
          cardFlightMemory={cardFlightMemory}
        />
      ))}
    </Pressable>
  )
}

type CardViewProps = {
  card: Card
  metrics: CardMetrics
  offsetTop?: number
  offsetLeft?: number
  isSelected?: boolean
  onPress?: () => void
  onLongPress?: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured?: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory?: Record<string, CardFlightSnapshot>
  celebrationBindings?: CelebrationBindings
}

const CardView = ({
  card,
  metrics,
  offsetTop,
  offsetLeft,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  celebrationBindings,
}: CardViewProps) => {
  const {
    cardFlights: cardFlightsEnabled,
    invalidMoveWiggle: invalidMoveEnabled,
    cardFlip: cardFlipEnabled,
  } = useAnimationToggles()
  const [renderFaceUp, setRenderFaceUp] = useState(card.faceUp)
  const shouldFloat = typeof offsetTop === 'number' || typeof offsetLeft === 'number'
  const positionStyle = shouldFloat
    ? {
        position: 'absolute' as const,
        top: typeof offsetTop === 'number' ? offsetTop : 0,
        left: typeof offsetLeft === 'number' ? offsetLeft : 0,
      }
    : undefined
  const cardRef = useAnimatedRef<View>()
  const wiggle = useSharedValue(0)
  const flightX = useSharedValue(0)
  const flightY = useSharedValue(0)
  const flightZ = useSharedValue(0)
  const previousSnapshot = cardFlightMemory?.[card.id]
  const hasPreviousSnapshot = cardFlightsEnabled && !!previousSnapshot
  const flightOpacity = useSharedValue(hasPreviousSnapshot ? 0 : 1)
  const flipScale = useSharedValue(1)
  const lastTriggerRef = useRef(invalidWiggle.key)
  const shouldAnimateInvalid = invalidWiggle.lookup.has(card.id)
  const baseZIndex = shouldFloat ? 2 : 0
  const motionStyle = useAnimatedStyle<ViewStyle>(() => {
    let translateX = wiggle.value + flightX.value
    let translateY = flightY.value
    let rotationDeg = 0
    let scale = 1
    let opacity = flightOpacity.value
    let zIndex = flightZ.value > 0 ? flightZ.value : baseZIndex

    const celebrationActiveValue = celebrationBindings?.active.value ?? 0
    if (celebrationActiveValue > 0 && celebrationBindings) {
      const assignment = celebrationBindings.assignments.value?.[card.id]
      if (assignment) {
        const frame = computeCelebrationFrame({
          modeId: celebrationBindings.mode.value,
          assignment,
          metrics,
          board: celebrationBindings.board.value,
          totalCards: celebrationBindings.total.value,
          progress: celebrationBindings.progress.value,
        })

        if (frame) {
          const {
            pathX,
            pathY,
            rotation,
            targetScale,
            targetOpacity,
            launchEased,
            rawProgress,
            relativeIndex,
            stackFactor,
          } = frame
          const seed = assignment.randomSeed
          const wobblePhase =
            rawProgress * TAU * CELEBRATION_WOBBLE_FREQUENCY + seed * TAU
          const wobbleEnvelope = 0.15 + 0.85 * Math.pow(Math.sin(wobblePhase), 2)
          const wobbleX =
            Math.sin(wobblePhase * 1.25 + relativeIndex * 0.4) *
            metrics.width *
            0.1 *
            wobbleEnvelope
          const wobbleY =
            Math.cos(wobblePhase * 0.95 + stackFactor * 4) *
            metrics.height *
            0.11 *
            wobbleEnvelope

          const finalX =
            assignment.baseX * (1 - launchEased) + pathX * launchEased + wobbleX
          const finalY =
            assignment.baseY * (1 - launchEased) + pathY * launchEased + wobbleY
          const finalScale = 1 + (targetScale - 1) * launchEased
          const finalRotation = rotation * launchEased
          const clampedOpacity = targetOpacity < 0 ? 0 : targetOpacity
          const finalOpacity = Math.min(
            1,
            clampedOpacity * (0.5 + 0.5 * launchEased),
          )

          translateX = wiggle.value + flightX.value + (finalX - assignment.baseX)
          translateY = flightY.value + (finalY - assignment.baseY)
          scale = finalScale
          rotationDeg = finalRotation
          opacity = Math.min(opacity, finalOpacity)
          zIndex = Math.max(zIndex, 4000 + assignment.index)
        }
      }
    }

    const transforms: Array<
      | { translateX: number }
      | { translateY: number }
      | { rotate: string }
      | { scale: number }
    > = [
      { translateX },
      { translateY },
    ]

    if (scale !== 1) {
      transforms.push({ scale })
    }
    if (rotationDeg !== 0) {
      transforms.push({ rotate: `${rotationDeg}deg` })
    }

    return {
      transform: transforms,
      opacity,
      zIndex,
    }
  })
  const flipStyle = useAnimatedStyle(() => {
    if (!cardFlipEnabled) {
      return {}
    }
    return {
      transform: [{ scaleX: flipScale.value }],
    }
  })
  const handleCardLayout = useCallback(() => {
    const cardId = card.id
    const snapshotBeforeLayout = cardFlightMemory?.[cardId]
    if (cardFlightsEnabled && previousSnapshot) {
      flightOpacity.value = 0
    }
    runOnUI((prevSnapshot: CardFlightSnapshot | null) => {
      'worklet'
      const layout = measure(cardRef)
      if (!layout) {
        return
      }
      if (!cardFlightsEnabled) {
        const snapshot: CardFlightSnapshot = {
          pageX: layout.pageX,
          pageY: layout.pageY,
          width: layout.width,
          height: layout.height,
        }
        cardFlights.value = {
          ...cardFlights.value,
          [cardId]: snapshot,
        }
        flightX.value = 0
        flightY.value = 0
        flightZ.value = 0
        flightOpacity.value = 1
        if (onCardMeasured) {
          runOnJS(onCardMeasured)(cardId, snapshot)
        }
        return
      }
      const existingSnapshot = cardFlights.value[cardId] as CardFlightSnapshot | undefined
      const previous = prevSnapshot ?? existingSnapshot
      if (previous) {
        const deltaX = previous.pageX - layout.pageX
        const deltaY = previous.pageY - layout.pageY
        if (Math.abs(deltaX) > 0.5 || Math.abs(deltaY) > 0.5) {
          flightX.value = deltaX
          flightY.value = deltaY
          flightZ.value = 1000
          flightX.value = withTiming(0, CARD_FLIGHT_TIMING, (finished) => {
            if (finished) {
              flightZ.value = 0
            }
          })
          flightY.value = withTiming(0, CARD_FLIGHT_TIMING)
        }
      }
      const nextSnapshot: CardFlightSnapshot = {
        pageX: layout.pageX,
        pageY: layout.pageY,
        width: layout.width,
        height: layout.height,
      }
      cardFlights.value = {
        ...cardFlights.value,
        [cardId]: nextSnapshot,
      }
      flightOpacity.value = 1
      if (onCardMeasured) {
        runOnJS(onCardMeasured)(cardId, nextSnapshot)
      }
    })(previousSnapshot ?? snapshotBeforeLayout ?? null)
  }, [cardFlightMemory, cardFlights, card.id, cardRef, flightOpacity, flightX, flightY, flightZ, onCardMeasured, previousSnapshot])

  useEffect(() => {
    if (!invalidMoveEnabled) {
      cancelAnimation(wiggle)
      wiggle.value = 0
      return
    }
    if (!shouldAnimateInvalid) {
      return
    }
    if (lastTriggerRef.current === invalidWiggle.key) {
      return
    }
    lastTriggerRef.current = invalidWiggle.key
    cancelAnimation(wiggle)
    wiggle.value = 0
    wiggle.value = withSequence(
      withTiming(-WIGGLE_OFFSET_PX, WIGGLE_TIMING_CONFIG),
      withTiming(WIGGLE_OFFSET_PX, WIGGLE_TIMING_CONFIG),
      withTiming(0, WIGGLE_TIMING_CONFIG),
    )
  }, [invalidMoveEnabled, invalidWiggle.key, shouldAnimateInvalid, wiggle])

  useEffect(() => {
    if (!cardFlipEnabled) {
      setRenderFaceUp(card.faceUp)
      flipScale.value = 1
      return
    }
    if (card.faceUp === renderFaceUp) {
      return
    }
    flipScale.value = withTiming(0, CARD_FLIP_HALF_TIMING, (finished) => {
      if (!finished) {
        return
      }
      runOnJS(setRenderFaceUp)(card.faceUp)
      flipScale.value = withTiming(1, CARD_FLIP_HALF_TIMING)
    })
  }, [card.faceUp, cardFlipEnabled, flipScale, renderFaceUp])

  const containerStaticStyle = {
    width: metrics.width,
    height: metrics.height,
  }

  const borderColor =
    renderFaceUp && isSelected ? COLOR_SELECTED_BORDER : COLOR_CARD_BORDER

  const frontContent = (
    <Pressable
      style={[
        styles.cardBase,
        styles.faceUp,
        {
          width: '100%',
          height: '100%',
          borderRadius: metrics.radius,
          borderColor,
        },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={!onPress && !onLongPress}
    >
      <Text
        style={[styles.cardCornerRank, { color: SUIT_COLORS[card.suit] }]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {rankToLabel(card.rank)}
      </Text>
      <Text
        style={[styles.cardCornerSuit, { color: SUIT_COLORS[card.suit] }]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {SUIT_SYMBOLS[card.suit]}
      </Text>
      <Text
        style={[styles.cardSymbol, { color: SUIT_COLORS[card.suit] }]}
        ellipsizeMode="clip"
        numberOfLines={1}
        allowFontScaling={false}
      >
        {SUIT_SYMBOLS[card.suit]}
      </Text>
    </Pressable>
  )

  const backContent = (
    <View
      style={[
        styles.cardBase,
        styles.faceDown,
        {
          width: '100%',
          height: '100%',
          borderRadius: metrics.radius,
        },
      ]}
    />
  )

  return (
    <AnimatedView
      ref={cardRef}
      onLayout={handleCardLayout}
      style={[positionStyle, motionStyle, containerStaticStyle]}
    >
      <Animated.View style={[styles.cardFlipWrapper, flipStyle]}>
        {renderFaceUp ? frontContent : backContent}
      </Animated.View>
    </AnimatedView>
  )
}

const CelebrationTouchBlocker = ({ onAbort }: { onAbort: () => void }) => (
  <Pressable style={styles.celebrationOverlay} onPress={onAbort} />
)

const EmptySlot = ({
  label,
  highlight,
  metrics,
}: {
  label?: string
  highlight: boolean
  metrics: CardMetrics
}) => (
  <View
    style={[
      styles.emptySlot,
      {
        width: metrics.width,
        height: metrics.height,
        borderRadius: metrics.radius,
        borderColor: highlight ? COLOR_DROP_BORDER : COLOR_COLUMN_BORDER,
      },
    ]}
  >
    {!!label && <Text style={styles.emptyLabel}>{label}</Text>}
  </View>
)

type CardBackProps = {
  label?: string
  metrics: CardMetrics
  variant: 'stock' | 'recycle' | 'empty'
  icon?: React.ReactNode
}

const CardBack = ({ label, metrics, variant, icon }: CardBackProps) => {
  const baseStyle =
    variant === 'stock'
      ? styles.cardBack
      : [
          styles.cardBackOutline,
          variant === 'recycle' ? styles.cardBackRecycle : styles.cardBackEmpty,
        ]

  return (
    <View
      style={[
        baseStyle,
        {
          width: metrics.width,
          height: metrics.height,
          borderRadius: metrics.radius,
        },
      ]}
    >
      {icon ? icon : label ? <Text style={styles.cardBackText}>{label}</Text> : null}
    </View>
  )
}

type WasteFanProps = {
  cards: Card[]
  metrics: CardMetrics
  isSelected: boolean
  onPress: () => void
  onLongPress: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  disabled?: boolean
}

const WasteFan = ({
  cards,
  metrics,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  disabled = false,
}: WasteFanProps) => {
  const visible = cards.slice(-3)
  const overlap = Math.min(metrics.width * WASTE_FAN_OVERLAP_RATIO, WASTE_FAN_MAX_OFFSET)
  const width = metrics.width + overlap * (visible.length - 1)
  const previousVisibleIdsRef = useRef<Set<string>>(new Set())
  const animationSignature = `${cards[cards.length - 1]?.id ?? 'none'}-${cards.length}`
  const enteringLookup = useMemo(() => {
    const prev = previousVisibleIdsRef.current
    const entering = new Set<string>()
    visible.forEach((card) => {
      if (!prev.has(card.id)) {
        entering.add(card.id)
      }
    })
    return entering
  }, [visible])

  useEffect(() => {
    previousVisibleIdsRef.current = new Set(visible.map((card) => card.id))
  }, [animationSignature, visible])

  return (
    <View style={{ width, height: metrics.height, position: 'relative' }}>
      {visible.map((card, index) => {
        const isTop = index === visible.length - 1
        const enableInteractions = isTop && !disabled
        return (
          <WasteFanCard
            key={card.id}
            card={card}
            metrics={metrics}
            targetOffset={index * overlap}
            isSelected={enableInteractions && isSelected}
            onPress={enableInteractions ? onPress : undefined}
            onLongPress={enableInteractions ? onLongPress : undefined}
            invalidWiggle={invalidWiggle}
            isEntering={enteringLookup.has(card.id)}
            zIndex={index}
            cardFlights={cardFlights}
            onCardMeasured={onCardMeasured}
            cardFlightMemory={cardFlightMemory}
          />
        )
      })}
    </View>
  )
}

type WasteFanCardProps = {
  card: Card
  metrics: CardMetrics
  targetOffset: number
  isSelected: boolean
  onPress?: () => void
  onLongPress?: () => void
  invalidWiggle: InvalidWiggleConfig
  isEntering: boolean
  zIndex: number
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
}

const WasteFanCard = ({
  card,
  metrics,
  targetOffset,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  isEntering,
  zIndex,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
}: WasteFanCardProps) => {
  const { wasteFan: wasteFanEnabled } = useAnimationToggles()
  const entryBacktrack = Math.min(
    Math.min(metrics.width * WASTE_ENTRY_BACKTRACK_RATIO, WASTE_ENTRY_BACKTRACK_MAX),
    targetOffset,
  )
  const initialOffset = !wasteFanEnabled
    ? targetOffset
    : isEntering
      ? targetOffset - entryBacktrack
      : targetOffset
  const translateX = useSharedValue(initialOffset)
  const positionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  useEffect(() => {
    cancelAnimation(translateX)
    if (!wasteFanEnabled) {
      translateX.value = targetOffset
      return
    }
    translateX.value = withTiming(targetOffset, WASTE_TIMING_CONFIG, () => {
      translateX.value = targetOffset
    })
  }, [targetOffset, translateX, wasteFanEnabled])

  return (
    <AnimatedView
      pointerEvents="box-none"
      style={[
        styles.wasteFanCardWrapper,
        {
          width: metrics.width,
          height: metrics.height,
          zIndex,
        },
        positionStyle,
      ]}
    >
      <CardView
        card={card}
        metrics={metrics}
        isSelected={isSelected}
        onPress={onPress}
        onLongPress={onLongPress}
        invalidWiggle={invalidWiggle}
        cardFlights={cardFlights}
        onCardMeasured={onCardMeasured}
        cardFlightMemory={cardFlightMemory}
      />
    </AnimatedView>
  )
}

type PileButtonProps = {
  label: string
  children: React.ReactNode
  onPress: () => void
  disabled?: boolean
  disablePress?: boolean
}

const PileButton = ({ label, children, onPress, disabled, disablePress }: PileButtonProps) => {
  const commonStyle = [styles.pilePressable, disabled && styles.disabledPressable]

  return (
    <YStack gap="$1" items="center">
      {disablePress ? (
        <View style={commonStyle}>{children}</View>
      ) : (
        <Pressable onPress={onPress} disabled={disabled} style={commonStyle}>
          {children}
        </Pressable>
      )}
      <Text color="$color10" fontSize={12}>
        {label}
      </Text>
    </YStack>
  )
}

type FoundationPileProps = {
  suit: Suit
  cards: Card[]
  cardMetrics: CardMetrics
  isDroppable: boolean
  isSelected: boolean
  onPress: () => void
  onLongPress: () => void
  invalidWiggle: InvalidWiggleConfig
  cardFlights: CardFlightRegistry
  onCardMeasured: (cardId: string, snapshot: CardFlightSnapshot) => void
  cardFlightMemory: Record<string, CardFlightSnapshot>
  onCardArrived?: (cardId: string | null | undefined) => void
  disableInteractions?: boolean
  hideTopCard?: boolean
  onLayout?: (layout: LayoutRectangle) => void
  celebrationBindings?: CelebrationBindings
  celebrationActive?: boolean
}

const FoundationPile = ({
  suit,
  cards,
  cardMetrics,
  isDroppable,
  isSelected,
  onPress,
  onLongPress,
  invalidWiggle,
  cardFlights,
  onCardMeasured,
  cardFlightMemory,
  onCardArrived,
  disableInteractions = false,
  hideTopCard = false,
  onLayout,
  celebrationBindings,
  celebrationActive = false,
}: FoundationPileProps) => {
  const { foundationGlow: foundationGlowEnabled } = useAnimationToggles()
  const handleCardArrived = onCardArrived ?? (() => {})
  const topCard = cards[cards.length - 1]
  const hasCards = cards.length > 0
  const borderColor = isDroppable
    ? COLOR_DROP_BORDER
    : isSelected
      ? COLOR_SELECTED_BORDER
      : hasCards
        ? COLOR_FOUNDATION_BORDER
        : COLOR_COLUMN_BORDER
  const glowOpacity = useSharedValue(0)
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }))
  const lastGlowCardRef = useRef<string | null>(null)
  const previousCountRef = useRef(cards.length)
  const glowWidth = cardMetrics.width + FOUNDATION_GLOW_OUTSET * 2
  const glowHeight = cardMetrics.height + FOUNDATION_GLOW_OUTSET * 2
  useEffect(() => {
    const previousCount = previousCountRef.current
    previousCountRef.current = cards.length
    const removedCard = cards.length < previousCount
    const previousId = lastGlowCardRef.current
    const currentId = topCard?.id ?? null

    if (!foundationGlowEnabled) {
      glowOpacity.value = 0
      if (!removedCard && currentId && currentId !== previousId) {
        handleCardArrived(currentId)
      }
      lastGlowCardRef.current = currentId
      return
    }
    if (!currentId) {
      lastGlowCardRef.current = null
      glowOpacity.value = 0
      return
    }
    if (removedCard) {
      lastGlowCardRef.current = currentId
      glowOpacity.value = 0
      return
    }
    if (lastGlowCardRef.current === currentId) {
      return
    }
    lastGlowCardRef.current = currentId
    handleCardArrived(currentId)
    cancelAnimation(glowOpacity)
    glowOpacity.value = 0
    glowOpacity.value = withSequence(
      withTiming(FOUNDATION_GLOW_MAX_OPACITY, FOUNDATION_GLOW_IN_TIMING),
      withTiming(0, FOUNDATION_GLOW_OUT_TIMING),
    )
  }, [cards.length, foundationGlowEnabled, glowOpacity, handleCardArrived, topCard?.id])

  return (
    <Pressable
      onPress={disableInteractions ? undefined : onPress}
      onLongPress={disableInteractions ? undefined : onLongPress}
      disabled={disableInteractions}
      onLayout={(event) => onLayout?.(event.nativeEvent.layout)}
      style={[
        styles.foundation,
        {
          width: cardMetrics.width,
          height: cardMetrics.height,
          borderRadius: cardMetrics.radius,
          borderColor,
        },
      ]}
    >
      <AnimatedView
        pointerEvents="none"
        style={[
          styles.foundationGlow,
          {
            width: glowWidth,
            height: glowHeight,
            borderRadius: cardMetrics.radius + FOUNDATION_GLOW_OUTSET,
            top: -FOUNDATION_GLOW_OUTSET,
            left: -FOUNDATION_GLOW_OUTSET,
            backgroundColor: FOUNDATION_GLOW_COLOR,
          },
          glowStyle,
        ]}
      />
      {topCard ? (
        cards.map((card, index) => {
          const isTopCard = index === cards.length - 1
          return (
            <AnimatedView
              // PBI 14-1: keep every foundation card mounted so flights persist through rapid sequences.
              key={card.id}
              pointerEvents="none"
              style={[
                styles.foundationCard,
                !isTopCard && !celebrationActive ? styles.foundationStackedCard : undefined,
                hideTopCard && isTopCard ? styles.hiddenCard : undefined,
                { zIndex: index + 1 },
              ]}
            >
              <CardView
                card={card}
                metrics={cardMetrics}
                invalidWiggle={isTopCard ? invalidWiggle : EMPTY_INVALID_WIGGLE}
                cardFlights={cardFlights}
                onCardMeasured={onCardMeasured}
                cardFlightMemory={cardFlightMemory}
                onPress={disableInteractions ? undefined : onPress}
                onLongPress={disableInteractions ? undefined : onLongPress}
                celebrationBindings={celebrationBindings}
              />
            </AnimatedView>
          )
        })
      ) : (
        <Text
          style={[
            styles.foundationSymbol,
            { color: hasCards ? SUIT_COLORS[suit] : COLOR_TEXT_MUTED },
          ]}
        >
          {SUIT_SYMBOLS[suit]}
        </Text>
      )}
    </Pressable>
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

const rankToLabel = (rank: Rank): string => FACE_CARD_LABELS[rank] ?? String(rank)

const styles = StyleSheet.create({
  centeredHeading: {
    textAlign: 'center',
    color: COLOR_FELT_TEXT_PRIMARY,
  },
  centeredParagraph: {
    textAlign: 'center',
    color: COLOR_FELT_TEXT_SECONDARY,
  },
  boardShell: {
    width: '100%',
    alignSelf: 'stretch',
    paddingHorizontal: COLUMN_MARGIN,
    position: 'relative',
  },
  tableauRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexWrap: 'nowrap',
    paddingHorizontal: COLUMN_MARGIN,
  },
  column: {
    // borderWidth: 0,
    // borderStyle: 'dashed',
    // borderRadius: 12,
    // position: 'relative',
    overflow: 'visible',
    paddingBottom: 8,
  },
  cardBase: {
    shadowColor: 'rgba(0,0,0,0.25)',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 6,
    justifyContent: 'center',
    backgroundColor: COLOR_CARD_FACE,
    overflow: 'hidden',
  },
  cardFlipWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceDown: {
    backgroundColor: COLOR_CARD_BACK,
    borderWidth: 1,
    borderColor: COLOR_CARD_BORDER,
  },
  faceUp: {
    borderWidth: 1,
  },
  cardCornerRank: {
    position: 'absolute',
    top: -2,
    left: 3,
    fontWeight: '700',
    fontSize: 16,
  },
  cardCornerSuit: {
    position: 'absolute',
    top: 0,
    right: 0,
    fontSize: 12,
  },
  cardSymbol: {
    textAlignVertical: 'center',
    textAlign: 'center',
    fontSize: 28,
    fontWeight: '600',
    marginTop: 16,
  },
  movesLabel: {
    fontSize: 12,
    color: COLOR_FELT_TEXT_SECONDARY,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  movesValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLOR_FELT_TEXT_PRIMARY,
  },
  emptySlot: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLabel: {
    color: COLOR_FELT_TEXT_SECONDARY,
  },
  cardBack: {
    backgroundColor: COLOR_CARD_BACK,
    borderWidth: 1,
    borderColor: COLOR_CARD_BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackOutline: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cardBackRecycle: {
    borderColor: COLOR_FELT_TEXT_SECONDARY,
  },
  cardBackEmpty: {
    borderColor: COLOR_COLUMN_BORDER,
  },
  cardBackText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  pilePressable: {
    opacity: 1,
  },
  disabledPressable: {
    opacity: 0.4,
  },
  foundation: {
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  foundationGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    opacity: 0,
    shadowColor: FOUNDATION_GLOW_COLOR,
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  foundationCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  foundationStackedCard: {
    opacity: 0,
  },
  foundationSymbol: {
    fontSize: 28,
    color: COLOR_FELT_TEXT_PRIMARY,
  },
  wasteFanCardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'auto',
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
  hiddenCard: {
    opacity: 0,
  },
  feltPatternOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  feltPatternLine: {
    position: 'absolute',
    left: -500,
    width: 2000,
    height: 0.5,
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

const FeltPattern = () => {
  const colorScheme = useColorScheme()
  const patternColor = colorScheme === 'dark' 
    ? 'rgba(255, 255, 255, 0.015)' 
    : 'rgba(0, 0, 0, 0.015)'
  
  return (
    <View style={styles.feltPatternOverlay} pointerEvents="none">
      {Array.from({ length: 60 }).map((_, i) => (
        <View
          key={`diag-${i}`}
          style={[
            styles.feltPatternLine,
            {
              top: i * 30 - 400,
              backgroundColor: patternColor,
              transform: [{ rotate: '45deg' }],
            },
          ]}
        />
      ))}
      {Array.from({ length: 60 }).map((_, i) => (
        <View
          key={`diag-rev-${i}`}
          style={[
            styles.feltPatternLine,
            {
              top: i * 30 - 400,
              backgroundColor: patternColor,
              transform: [{ rotate: '-45deg' }],
            },
          ]}
        />
      ))}
    </View>
  )
}

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
