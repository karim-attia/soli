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
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native'
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
import { useToastController } from '@tamagui/toast'

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
const WASTE_ENTER_EXTRA_RATIO = 0.25
const WASTE_FAN_MAX_OFFSET = 28
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
type CardFlightSnapshot = {
  pageX: number
  pageY: number
  width: number
  height: number
}

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

const CELEBRATION_MODE_COUNT = 20
const CELEBRATION_DURATION_MS = 60_000
const CELEBRATION_DIALOG_DELAY_MS = 30_000
const CELEBRATION_SPEED_MULTIPLIER = 10.4
const CELEBRATION_WOBBLE_FREQUENCY = 5.5
const FOUNDATION_FALLBACK_GAP = 16
const TAU = Math.PI * 2

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
  const toast = useToastController()
  const navigation = useNavigation()
  const colorScheme = useColorScheme()
  const feltBackground = colorScheme === 'dark' ? COLOR_FELT_DARK : COLOR_FELT_LIGHT
  const { state: settingsState, hydrated: settingsHydrated } = useSettings()
  const solvableGamesOnly = settingsState.solvableGamesOnly
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
  const cardFlights = useSharedValue<Record<string, CardFlightSnapshot>>({})
  const cardFlightMemoryRef = useRef<Record<string, CardFlightSnapshot>>({})
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
  const [boardLocked, setBoardLocked] = useState(false)
  const [celebrationState, setCelebrationState] = useState<CelebrationState | null>(null)
  const updateBoardLocked = useCallback((locked: boolean) => {
    boardLockedRef.current = locked
    setBoardLocked(locked)
  }, [])
  const isCelebrationActive = celebrationState !== null
  const handleTopRowLayout = useCallback((layout: LayoutRectangle) => {
    topRowLayoutRef.current = layout
  }, [])
  const handleFoundationLayout = useCallback((suit: Suit, layout: LayoutRectangle) => {
    foundationLayoutsRef.current[suit] = layout
  }, [])
  const handleCardMeasured = useCallback((cardId: string, snapshot: CardFlightSnapshot) => {
    cardFlightMemoryRef.current[cardId] = snapshot
  }, [])
  const registerFoundationArrival = useCallback((cardId: string | null | undefined) => {
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
  const ensureCardFlightsReady = useCallback(() => {
    if (!cardFlightsEnabled) {
      return
    }
    if (!Object.keys(cardFlightMemoryRef.current).length) {
      return
    }
    cardFlights.value = {
      ...cardFlights.value,
      ...cardFlightMemoryRef.current,
    }
  }, [cardFlights, cardFlightsEnabled])
  const resetCardFlights = useCallback(() => {
    cardFlightMemoryRef.current = {}
    cardFlights.value = {}
  }, [cardFlights])
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
  const dispatchWithFlightPrep = useCallback(
    (action: GameAction, selection?: Selection | null) => {
      if (boardLockedRef.current) {
        return
      }

      if (!cardFlightsEnabled) {
        ensureCardFlightsReady()
        dispatch(action)
        return
      }

      const waitStart = Date.now()

      const attemptDispatch = () => {
        const ids = selection ? collectSelectionCardIds(stateRef.current, selection) : []
        const snapshotsReady =
          ids.length === 0 || ids.every((id) => !!cardFlightMemoryRef.current[id])

        if (snapshotsReady || Date.now() - waitStart >= FLIGHT_WAIT_TIMEOUT_MS) {
          ensureCardFlightsReady()
          if (!snapshotsReady && __DEV__) {
            console.warn('[FlightPrep] Timeout waiting for snapshots', {
              action: action.type,
              ids,
            })
          }
          dispatch(action)
          return
        }

        requestAnimationFrame(attemptDispatch)
      }

      attemptDispatch()
    },
    [cardFlightsEnabled, dispatch, ensureCardFlightsReady],
  )
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
        if (__DEV__) {
          console.log('[Wiggle] suppressed for recent foundation arrival', options)
        }
        return
      }
      triggerInvalidSelectionWiggle(options?.selection ?? null)
    },
    [autoPlayActive, shouldSuppressFoundationWiggle, triggerInvalidSelectionWiggle],
  )

  const drawLabel = state.stock.length ? 'Draw' : ''

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (state.moveCount === 0) {
      currentStartingPreviewRef.current = createHistoryPreviewFromState(state)
      currentDisplayNameRef.current = formatShuffleDisplayName(state.shuffleId)
    }
  }, [state.moveCount, state.shuffleId, state.stock.length, state.waste.length])

  useEffect(() => {
    if (state.hasWon && !previousHasWonRef.current) {
      recordCurrentGameResult({ solved: true })
    }

    previousHasWonRef.current = state.hasWon
  }, [recordCurrentGameResult, state.hasWon])


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
          console.warn('Failed clearing invalid saved game state', clearError)
        }

        if (!isCancelled) {
          toast.show('Game reset', { message })
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
  }, [dispatch, toast])

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
          console.warn('Failed to persist Klondike game state', error)
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
            console.warn('Failed to clear persisted game before new shuffle', error)
          })
          dealNewGame()
          updateBoardLocked(false)
          toast.show('New game', { message: 'Shuffled cards and reset the board.' })
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
      toast,
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
    setCelebrationState(null)
    openCelebrationDialog()
  }, [openCelebrationDialog])

  const handleCelebrationAbort = useCallback(() => {
    clearCelebrationDialogTimer()
    setCelebrationState(null)
    openCelebrationDialog()
  }, [clearCelebrationDialogTimer, openCelebrationDialog])

  useEffect(() => {
    if (!celebrationState) {
      celebrationDialogShownRef.current = false
      clearCelebrationDialogTimer()
      return
    }

    celebrationDialogShownRef.current = false
    clearCelebrationDialogTimer()
    celebrationDialogTimeoutRef.current = setTimeout(openCelebrationDialog, CELEBRATION_DIALOG_DELAY_MS)

    return () => {
      clearCelebrationDialogTimer()
    }
  }, [celebrationState, clearCelebrationDialogTimer, openCelebrationDialog])

  const attemptAutoMove = useCallback(
    (selection: Selection) => {
      const target = findAutoMoveTarget(state, selection)
      if (!target) {
        notifyInvalidMove({ selection })
        return
      }
      dispatchWithFlightPrep({ type: 'APPLY_MOVE', selection, target }, selection)
    },
    [dispatchWithFlightPrep, notifyInvalidMove, state],
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
        dispatchWithFlightPrep({ type: 'PLACE_ON_TABLEAU', columnIndex }, state.selected)
      } else {
        notifyInvalidMove({ selection: state.selected })
      }
    },
    [dispatchWithFlightPrep, dropHints.tableau, notifyInvalidMove, state.selected],
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
        dispatchWithFlightPrep({ type: 'PLACE_ON_FOUNDATION', suit }, state.selected)
    } else {
      notifyInvalidMove({ selection: state.selected })
    }
  },
    [attemptAutoMove, dispatchWithFlightPrep, dropHints.foundations, notifyInvalidMove, state.foundations, state.selected],
)

  const clearSelection = useCallback(() => {
    if (boardLockedRef.current) {
      return
    }
    if (state.selected) {
      dispatch({ type: 'CLEAR_SELECTION' })
    }
  }, [dispatch, state.selected])

  const canUndo = !boardLocked && state.history.length > 0
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
        />
      ),
    })
  }, [navigation, openDrawer, requestNewGame])

  // Requirement PBI-13: persist state changes after hydration.
  useEffect(() => {
    if (state.autoCompleteRuns > autoCompleteRunsRef.current) {
      toast.show('Auto-complete engaged', {
        message: 'Finishing the remaining cards for you…',
      })
      autoCompleteRunsRef.current = state.autoCompleteRuns
    }
  }, [state.autoCompleteRuns, toast])

  useEffect(() => {
    if (!animationsEnabled || !celebrationAnimationsEnabled) {
      return
    }

    if (state.winCelebrations <= winCelebrationsRef.current) {
      return
    }

    winCelebrationsRef.current = state.winCelebrations
    toast.show('🎉 Tada!', { message: 'Foundations complete!' })

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
    toast,
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
      dispatchWithFlightPrep({ type: 'ADVANCE_AUTO_QUEUE' }, selection)
    }, delay)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [dispatchWithFlightPrep, state.autoQueue, state.isAutoCompleting])

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
          hideFoundations={isCelebrationActive}
          onTopRowLayout={handleTopRowLayout}
          onFoundationLayout={handleFoundationLayout}
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
        {celebrationState && (
          <CelebrationOverlay
            cards={celebrationState.cards}
            cardMetrics={cardMetrics}
            boardWidth={celebrationState.boardWidth}
            boardHeight={celebrationState.boardHeight}
            modeId={celebrationState.modeId}
            durationMs={celebrationState.durationMs}
            onComplete={handleCelebrationComplete}
            onAbort={handleCelebrationAbort}
          />
        )}
      </YStack>

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
            hideTopCard={hideFoundations}
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
  const motionStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: wiggle.value + flightX.value },
      { translateY: flightY.value },
    ],
    opacity: flightOpacity.value,
    zIndex: flightZ.value > 0 ? flightZ.value : baseZIndex,
  }))
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
  const enterOffset = targetOffset + metrics.width * WASTE_ENTER_EXTRA_RATIO
  const translateX = useSharedValue(!wasteFanEnabled ? targetOffset : isEntering ? enterOffset : targetOffset)
  const positionStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }))

  useEffect(() => {
    cancelAnimation(translateX)
    if (!wasteFanEnabled) {
      translateX.value = targetOffset
      return
    }
    translateX.value = withTiming(targetOffset, WASTE_TIMING_CONFIG)
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
        <AnimatedView
          pointerEvents="none"
          style={hideTopCard ? styles.hiddenCard : undefined}
        >
          <CardView
            card={topCard}
            metrics={cardMetrics}
            invalidWiggle={invalidWiggle}
            cardFlights={cardFlights}
            onCardMeasured={onCardMeasured}
            cardFlightMemory={cardFlightMemory}
            onPress={disableInteractions ? undefined : onPress}
            onLongPress={disableInteractions ? undefined : onLongPress}
          />
        </AnimatedView>
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

type CelebrationOverlayProps = {
  cards: CelebrationCardConfig[]
  cardMetrics: CardMetrics
  boardWidth: number
  boardHeight: number
  modeId: number
  durationMs: number
  onComplete: () => void
  onAbort: () => void
}

const CelebrationOverlay = ({
  cards,
  cardMetrics,
  boardWidth,
  boardHeight,
  modeId,
  durationMs,
  onComplete,
  onAbort,
}: CelebrationOverlayProps) => {
  const progress = useSharedValue(0)
  const overlayFlights = useSharedValue<Record<string, CardFlightSnapshot>>({})
  const abortedRef = useRef(false)

  useEffect(() => {
    abortedRef.current = false
    progress.value = 0
    progress.value = withTiming(1, { duration: durationMs, easing: Easing.linear }, (finished) => {
      if (finished && !abortedRef.current) {
        runOnJS(onComplete)()
      }
    })
  }, [durationMs, onComplete, progress])

  const handleAbort = useCallback(() => {
    if (abortedRef.current) {
      return
    }
    abortedRef.current = true
    runOnUI(() => {
      'worklet'
      cancelAnimation(progress)
    })()
    runOnJS(onAbort)()
  }, [onAbort, progress])

  return (
    <Pressable style={styles.celebrationOverlay} onPress={handleAbort}>
      {cards.map((config, index) => (
        <CelebrationCard
          key={config.card.id}
          config={config}
          metrics={cardMetrics}
          totalCards={cards.length}
          index={index}
          boardWidth={boardWidth}
          boardHeight={boardHeight}
          modeId={modeId}
          progress={progress}
          cardFlights={overlayFlights}
        />
      ))}
    </Pressable>
  )
}

type CelebrationCardProps = {
  config: CelebrationCardConfig
  metrics: CardMetrics
  totalCards: number
  index: number
  boardWidth: number
  boardHeight: number
  modeId: number
  progress: SharedValue<number>
  cardFlights: SharedValue<Record<string, CardFlightSnapshot>>
}

const CelebrationCard = ({
  config,
  metrics,
  totalCards,
  index,
  boardWidth,
  boardHeight,
  modeId,
  progress,
  cardFlights,
}: CelebrationCardProps) => {
  const animatedStyle = useAnimatedStyle(() => {
    'worklet'
    const rawProgress = progress.value
    const totalProgress = rawProgress * CELEBRATION_SPEED_MULTIPLIER
    const loopProgress = totalProgress % 1
    const launchProgress = Math.min(totalProgress, 1)
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)
    const launchEased = easeOutCubic(launchProgress)

    const baseX = config.baseX
    const baseY = config.baseY
    const relativeIndex = index - totalCards / 2
    const normalizedIndex = (index + 1) / totalCards
    const seed = config.randomSeed
    const stackFactor = config.stackIndex / 13
    const centerX = boardWidth / 2 - metrics.width / 2
    const centerY = boardHeight / 2 - metrics.height / 2
    const boardRadius = Math.min(boardWidth, boardHeight)

    const theta = TAU * loopProgress
    const thetaSeed = TAU * (loopProgress + seed)
    const thetaDouble = TAU * (loopProgress * 2 + seed * 0.5)
    const direction = index % 2 === 0 ? 1 : -1

    let pathX = centerX
    let pathY = centerY
    let rotation = 0
    let scale = 1
    let opacity = 1

    switch (modeId % CELEBRATION_MODE_COUNT) {
      case 0: {
        const radius = boardRadius * (0.24 + 0.18 * Math.sin(thetaDouble))
        pathX = (
          centerX + Math.cos(thetaSeed) * radius + relativeIndex * metrics.width * 0.25
        )
        pathY = (
          centerY + Math.sin(thetaSeed) * radius - stackFactor * metrics.height * 0.4
        )
        rotation = (thetaSeed * 180) / Math.PI
        scale = 1 + 0.06 * Math.sin(theta * 2 + stackFactor)
        break
      }
      case 1: {
        const ampX = boardRadius * (0.3 + 0.1 * Math.sin(thetaDouble))
        const ampY = boardRadius * (0.22 + 0.06 * Math.cos(thetaDouble + seed))
        pathX = centerX + Math.sin(theta) * ampX
        pathY = centerY + Math.sin(theta * 2 + seed * TAU) * ampY
        rotation = (Math.sin(theta) * 540) / Math.PI
        scale = 1 + 0.05 * Math.sin(theta * 2 + normalizedIndex)
        break
      }
      case 2: {
        const ampX = boardRadius * (0.18 + stackFactor * 0.12)
        const ampY = boardRadius * 0.38
        pathX = centerX + Math.sin(theta * 1.5 + seed * TAU) * ampX
        pathY = centerY - Math.cos(theta + seed * 0.5) * ampY
        rotation = (theta * 360) / Math.PI
        scale = 1 + 0.05 * Math.cos(theta * 3 + seed)
        break
      }
      case 3: {
        const angle = theta * 1.5 + seed * TAU
        const radius = boardRadius * (0.25 + 0.2 * Math.sin(theta * 2 + normalizedIndex))
        pathX = centerX + Math.cos(angle) * radius
        pathY = centerY + Math.sin(angle) * radius
        rotation = (angle * 180) / Math.PI
        scale = 1 + 0.07 * Math.sin(theta + stackFactor)
        break
      }
      case 4: {
        const angle = theta + stackFactor
        const radiusX = boardRadius * (0.3 + 0.1 * Math.sin(thetaDouble + normalizedIndex))
        const radiusY = boardRadius * (0.2 + 0.08 * Math.cos(thetaDouble + seed))
        pathX = centerX + Math.cos(angle) * radiusX
        pathY = centerY + Math.sin(angle) * radiusY
        rotation = (Math.sin(theta * 2 + seed) * 360) / Math.PI
        scale = 1 + 0.04 * Math.sin(theta * 4 + seed)
        break
      }
      case 5: {
        const spur = Math.sin(theta * 5 + seed * 3)
        const radius = boardRadius * (0.18 + 0.22 * Math.abs(spur))
        const angle = theta + spur * 0.3
        pathX = centerX + Math.cos(angle) * radius
        pathY = centerY + Math.sin(angle) * radius
        rotation = (angle * 180) / Math.PI + spur * 30
        scale = 1 + 0.05 * Math.sin(theta * 5 + normalizedIndex)
        break
      }
      case 6: {
        const angle = theta * 2 + seed * TAU * direction
        const radius = boardRadius * (0.16 + 0.18 * Math.sin(theta + direction * 0.5))
        pathX = (
          centerX +
          direction * Math.cos(angle) * radius +
          relativeIndex * metrics.width * 0.2
        )
        pathY = centerY + Math.sin(angle) * radius
        rotation = (angle * 180) / Math.PI
        scale = 1 + 0.04 * Math.sin(theta * 3 + stackFactor)
        break
      }
      case 7: {
        const angle = theta + normalizedIndex
        const radiusX = boardRadius * 0.22
        const radiusY = boardRadius * (0.3 + 0.1 * Math.sin(thetaDouble + stackFactor))
        pathX = centerX + Math.sin(angle) * radiusX
        pathY = centerY - Math.cos(angle) * radiusY
        rotation = (Math.cos(theta) * 360) / Math.PI
        scale = 1 + 0.05 * Math.sin(theta * 2 + normalizedIndex)
        break
      }
      case 8: {
        const ring = Math.floor(normalizedIndex * 4)
        const radius =
          boardRadius * (0.15 + 0.12 * ring + 0.05 * Math.sin(theta * 3 + seed))
        const angle = theta + ring * 0.3
        pathX = centerX + Math.cos(angle) * radius
        pathY = centerY + Math.sin(angle) * radius
        rotation = (angle * 180) / Math.PI + ring * 20
        scale = 1 + ring * 0.03 + 0.02 * Math.sin(theta * 4 + seed)
        break
      }
      case 9: {
        const angle = theta + seed
        const drift = Math.sin(thetaDouble) * boardRadius * 0.12
        pathX = centerX + Math.cos(angle) * boardRadius * 0.28 + drift
        pathY = centerY - Math.sin(angle) * boardRadius * 0.35 + drift * 0.6
        rotation = (angle * 180) / Math.PI + drift * 10
        scale = 1 + 0.05 * Math.sin(theta * 2 + stackFactor)
        break
      }
      case 10: {
        const angle = theta * 1.5 + stackFactor * 2
        const radius = boardRadius * (0.2 + 0.18 * Math.sin(theta * 2 + seed))
        pathX = centerX + Math.cos(angle) * radius
        pathY = centerY + Math.sin(angle) * radius - stackFactor * metrics.height * 0.3
        rotation = (angle * 180) / Math.PI
        scale = 1 + stackFactor * 0.08 + 0.04 * Math.sin(theta)
        break
      }
      case 11: {
        const ampX = boardRadius * (0.25 + 0.05 * Math.sin(seed * TAU))
        const ampY = boardRadius * (0.32 + 0.06 * Math.cos(seed * TAU))
        pathX = centerX + Math.sin(theta * 1.7 + seed) * ampX
        pathY = centerY + Math.sin(theta * 2.3 + seed * 0.4) * ampY
        rotation = (Math.sin(theta * 2) * 360) / Math.PI
        scale = 1 + 0.05 * Math.sin(theta * 3 + normalizedIndex)
        break
      }
      case 12: {
        const columnOffset = relativeIndex * metrics.width * 0.4
        const angle = theta * 2 + seed
        const radiusY = boardRadius * (0.2 + 0.1 * Math.sin(theta + columnOffset * 0.01))
        pathX = centerX + columnOffset
        pathY = centerY + Math.sin(angle) * radiusY
        rotation = (angle * 180) / Math.PI
        scale = 1 + 0.03 * Math.cos(theta * 4 + columnOffset)
        break
      }
      case 13: {
        const angle = theta + seed * TAU * 2
        const radius = boardRadius * (0.18 + 0.25 * Math.sin(theta * 4 + seed))
        pathX = (
          centerX +
          Math.cos(angle) * radius +
          Math.sin(theta * 3 + seed) * metrics.width * 0.2
        )
        pathY = centerY + Math.sin(angle) * radius
        rotation = (angle * 180) / Math.PI
        scale = 1 + 0.05 * Math.sin(theta * 5 + seed)
        opacity = 0.8 + 0.2 * Math.sin(theta * 2 + seed)
        break
      }
      case 14: {
        const wave = Math.sin(theta + seed)
        const ampX = boardRadius * 0.4
        const ampY = boardRadius * (0.2 + 0.1 * Math.sin(theta * 2 + stackFactor))
        pathX = centerX + wave * ampX
        pathY = centerY + Math.sin(theta * 3 + seed) * ampY
        rotation = wave * 270
        scale = 1 + 0.04 * Math.sin(theta * 3 + normalizedIndex)
        break
      }
      case 15: {
        const angle = theta * 2 + normalizedIndex * TAU
        const radius = boardRadius * (0.22 + 0.15 * Math.sin(theta + normalizedIndex))
        pathX = centerX + Math.cos(angle) * radius
        pathY = centerY + Math.sin(angle) * radius
        rotation = (angle * 180) / Math.PI
        scale = 1 + 0.05 * Math.sin(theta * 2 + stackFactor)
        opacity = 0.9 + 0.1 * Math.cos(theta * 2 + normalizedIndex)
        break
      }
      case 16: {
        const pulse = 0.7 + 0.3 * Math.sin(theta * 3 + seed)
        const angle = theta + stackFactor
        const radius = boardRadius * 0.28 * pulse
        pathX = centerX + Math.cos(angle) * radius
        pathY = centerY + Math.sin(angle) * radius
        rotation = (angle * 180) / Math.PI + pulse * 45
        scale = pulse
        break
      }
      case 17: {
        const clover = Math.sin(theta * 3)
        const radius = boardRadius * (0.22 + 0.18 * Math.abs(clover))
        const angle = theta + clover * 0.3 + seed
        pathX = centerX + Math.cos(angle) * radius
        pathY = centerY + Math.sin(angle) * radius
        rotation = (angle * 180) / Math.PI
        scale = 1 + 0.04 * clover
        break
      }
      case 18: {
        const angle = theta + seed
        const radius = boardRadius * (0.35 + 0.12 * Math.sin(theta * 2 + normalizedIndex))
        pathX = centerX + Math.cos(angle) * radius
        pathY = centerY - Math.sin(angle) * radius * 0.85
        rotation = (angle * 180) / Math.PI
        scale = 1 + 0.05 * Math.sin(theta * 2 + seed)
        break
      }
      case 19: {
        const jitterAngle = theta * 4 + seed * TAU
        const radius = boardRadius * (0.2 + 0.1 * Math.sin(theta * 6 + normalizedIndex))
        pathX = (
          centerX +
          Math.cos(jitterAngle) * radius +
          Math.sin(theta * 2 + seed) * metrics.width * 0.15
        )
        pathY = (
          centerY +
          Math.sin(jitterAngle) * radius +
          Math.cos(theta * 2 + seed) * metrics.height * 0.1
        )
        rotation = (jitterAngle * 90) / Math.PI
        scale = 1 + 0.03 * Math.sin(theta * 6 + seed)
        opacity = 0.85 + 0.15 * Math.sin(theta * 4 + seed)
        break
      }
      default: {
        const radius = boardRadius * 0.25
        pathX = centerX + Math.cos(thetaSeed) * radius
        pathY = centerY + Math.sin(thetaSeed) * radius
        rotation = (thetaSeed * 180) / Math.PI
        break
      }
    }

    const wobblePhase = rawProgress * TAU * CELEBRATION_WOBBLE_FREQUENCY + seed * TAU
    const wobbleEnvelope = 0.15 + 0.85 * Math.pow(Math.sin(wobblePhase), 2)
    const wobbleX = (
      Math.sin(wobblePhase * 1.25 + relativeIndex * 0.4) * metrics.width * 0.1 * wobbleEnvelope
    )
    const wobbleY = (
      Math.cos(wobblePhase * 0.95 + stackFactor * 4) * metrics.height * 0.11 * wobbleEnvelope
    )

    const finalX = baseX * (1 - launchEased) + pathX * launchEased + wobbleX
    const finalY = baseY * (1 - launchEased) + pathY * launchEased + wobbleY
    const finalScale = 1 + (scale - 1) * launchEased
    const finalRotation = rotation * launchEased
    const clampedOpacity = Math.max(0, Math.min(1, opacity))
    const finalOpacity = Math.min(1, clampedOpacity * (0.5 + 0.5 * launchEased))

    return {
      transform: [
        { translateX: finalX },
        { translateY: finalY },
        { rotate: `${finalRotation}deg` },
        { scale: finalScale },
      ],
      opacity: finalOpacity,
    }
  })

  return (
    <AnimatedView
      pointerEvents="none"
      style={[
        styles.celebrationCard,
        animatedStyle,
        { width: metrics.width, height: metrics.height },
      ]}
    >
      <CardView
        card={config.card}
        metrics={metrics}
        invalidWiggle={EMPTY_INVALID_WIGGLE}
        cardFlights={cardFlights}
        cardFlightMemory={{}}
      />
    </AnimatedView>
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
  celebrationCard: {
    position: 'absolute',
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
}

const HeaderControls = ({ onMenuPress, onNewGame }: HeaderControlsProps) => (
  <XStack gap="$4" style={{ alignItems: 'center' }}>
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
