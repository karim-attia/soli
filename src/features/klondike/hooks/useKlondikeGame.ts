// React Compiler (option D, 2026-10-19): this hook carried 33 manual useCallback/useMemo
// wrappers. 23 were removed — the compiler memoizes each with the same dependencies
// (verified slot-by-slot in the compiled output, docs/product/next-steps-after-sdk-58).
// The 10 remaining useCallbacks are KEPT on purpose: each is a (transitive) dependency of
// a useEffect (requestPlayDeal/requestNewGame/attemptAutoMoveFromState and the chain
// under them), the case react.dev names for keeping useCallback, and
// react-hooks/exhaustive-deps flags a plain function in an effect dependency list as
// "changes every render" (the rule cannot see compiler memoization). The "stays stable"
// comments below still hold: they describe what the compiler guarantees and WHY handlers
// read `stateRef` instead of `state` (a `state` read would re-create them per action).
import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { Alert, LayoutChangeEvent, LayoutRectangle, useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import {
  createGameStateFromExactId,
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
import type { ExactDealId } from '../../../solitaire/dealIdentity'
import type { DrawCount } from '../../../solitaire/drawCount'
import { recyclesLeft } from '../../../solitaire/scoring'
import { devLog } from '../../../utils/devLogger'
import { clearGameState } from '../../../storage/gamePersistence'
import { useHistory } from '../../../state/history'
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
import type { CelebrationPreviewStatsRequest } from '../celebrationPreviewStats'
import { useKlondikeTimer } from './useKlondikeTimer'
import { useKlondikePersistence } from './useKlondikePersistence'
import { useUndoHint } from './useUndoHint'
import {
  clearPendingDealRequest,
  usePendingDealRequest,
} from '../state/pendingDealRequestStore'
import { useHint } from './useHint'
import { useKlondikeHistoryEntry } from './useKlondikeHistoryEntry'
import { useSolvableDealSelector } from './useSolvableDealSelector'
import { useCelebrationController } from './useCelebrationController'
import { useUndoScrubber } from './useUndoScrubber'
import { useDemoGameLauncher, type LaunchDemoGameOptions } from './useDemoGameLauncher'
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
import { loadBoardMetricsSync, saveBoardMetrics } from '../../../storage/uiPreferences'

export type { LaunchDemoGameOptions } from './useDemoGameLauncher'

export type RequestNewGameFn = (options?: { reason?: 'manual' | 'celebration' }) => void
// Play a specific deal from scratch (retry-and-share-deal plan): History → Retry
// ('retry') and incoming share links ('shared'). onConfirmed fires right before the
// new deal, only once the user confirmed (or no confirmation was needed), so the
// caller can dismiss its sheet / switch tabs without doing so on Cancel.
export type PlayDealPrompt = 'retry' | 'shared'
export type RequestPlayDealFn = (
  exactId: ExactDealId,
  drawCount: DrawCount,
  options?: { prompt?: PlayDealPrompt; onConfirmed?: () => void }
) => void

const PLAY_DEAL_PROMPTS: Record<PlayDealPrompt, { title: string; confirm: string }> = {
  retry: { title: 'Retry this deal?', confirm: 'Retry' },
  shared: { title: 'Play shared deal?', confirm: 'Play' },
}

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
  requestPlayDeal: RequestPlayDealFn
  handleLaunchDemoGame: (options?: LaunchDemoGameOptions) => void
  resetUndoHintForTesting: () => void
  seedHistoryForTesting: (action: 'seed' | 'clear') => void
  // Second arg = display-only synthetic header stats for screenshot-mode previews.
  startCelebrationPreview: (
    modeId?: number,
    previewStats?: CelebrationPreviewStatsRequest
  ) => void
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
  // Seed board metrics synchronously from the last session (tiny kv-store read) so
  // card metrics exist on the very first render — the old async hydration caused a
  // visible flicker while the board waited for onLayout.
  const [boardLayout, setBoardLayout] = useState<{
    width: number | null
    height: number | null
  }>(() => {
    const stored = loadBoardMetricsSync()
    return { width: stored?.width ?? null, height: stored?.height ?? null }
  })
  const [absoluteCardLayerLayouts, setAbsoluteCardLayerLayouts] =
    useState<AbsoluteCardLayerLayouts>(() => createEmptyAbsoluteCardLayerLayouts())

  const safeArea = useSafeAreaInsets()
  // Task 1-8: size board columns using the safe-area width (not under notches).
  const boardAvailableWidth =
    boardLayout.width && boardLayout.width > 0
      ? boardLayout.width - safeArea.left - safeArea.right
      : null
  const cardMetrics = computeCardMetrics(boardAvailableWidth)
  const colorScheme = useColorScheme()
  const feltBackground = colorScheme === 'dark' ? COLOR_FELT_DARK : COLOR_FELT_LIGHT

  // The extra setters are only forwarded to the demo launcher for the ?set= deep
  // link (agent-testing-skill C1).
  const {
    state: settingsState,
    setDeveloperMode,
    setDrawCount,
    setAutoUpEnabled,
    setSolvableGamesOnly,
    setWarningMode,
    setHintButtonEnabled,
    setScoringMode,
    setVegasTotalEnabled,
  } = useSettings()
  const {
    showMoves,
    showTime,
    scoring,
    vegasTotal: vegasTotalEnabled,
    vegasTotalOffset,
  } = settingsState.statistics
  const solvableGamesOnly = settingsState.solvableGamesOnly
  const preferredDrawCount = settingsState.drawCount
  const autoUpEnabled = settingsState.autoUpEnabled
  // Warning-mode select + hint button toggle (F14) — see settings.tsx.
  const { warningMode, hintButton: hintButtonSetting } = settingsState.hints
  // No Hint button on Vegas-rules games (user decision round 2 / prompt 5: casino
  // experience, no hints — decided after trying "any useful move" hints there).
  // Keyed on the GAME's rules, not the setting, so a Standard game in progress
  // keeps its button while Vegas is selected for the next deal.
  const hintButtonEnabled = hintButtonSetting && !state.vegasRules
  const developerModeEnabled = settingsState.developerMode

  const animationToggles = useAnimationToggles()
  // Only solvable stats are read here; the history-entry lifecycle (rows, recording,
  // recovery) lives in useKlondikeHistoryEntry, which calls useHistory() itself.
  // seedHistoryForTesting is only forwarded to the demo launcher / demo sheet.
  // entries + vegasTotal feed the cumulative TOTAL badge (P2-C) below.
  const {
    solvableStats,
    seedHistoryForTesting,
    entries: historyEntries,
    vegasTotal: settledVegasTotal,
  } = useHistory()
  const {
    master: animationsEnabled,
    invalidMoveWiggle: invalidWiggleEnabled,
    celebrations: celebrationAnimationsEnabled,
  } = animationToggles

  // Precomputes drop targets for auto-move and hint rendering. The compiler caches it on
  // the state slices getDropHints reads (not the whole state), so hints keep identity
  // across TIMER_TICK and the board components' cached JSX stays valid (perf, A2).
  const dropHints = getDropHints({
    selected: state.selected,
    tableau: state.tableau,
    foundations: state.foundations,
    waste: state.waste,
  })

  const headerPadding = {
    top: EDGE_GUTTER,
    left: safeArea.left + COLUMN_MARGIN,
    right: safeArea.right + COLUMN_MARGIN,
  }

  const autoCompleteRunsRef = useRef(state.autoCompleteRuns)
  const winCelebrationsRef = useRef(state.winCelebrations)
  const stateRef = useRef(state)
  // Task 10-6: Track the current game's history entry ID for updates
  const currentGameEntryIdRef = useRef<string | null>(null)
  const previousHasWonRef = useRef(state.hasWon)
  const requestNewGameRef = useRef<RequestNewGameFn | null>(null)
  const topRowLayoutRef = useRef<LayoutRectangle | null>(null)
  const foundationLayoutsRef = useRef<Partial<Record<Suit, LayoutRectangle>>>({})
  const boardLockedRef = useRef(false)
  const demoPlaybackActiveRef = useRef(false)
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

  // Shared "merge one measured slot into absoluteCardLayerLayouts" step for all
  // layout handlers below (clean-code review #10: was six copies of the same
  // compare-then-merge pattern).
  const mergeCardLayerLayout = (
    key: 'topRow' | 'stock' | 'waste' | 'tableauRow',
    layout: LayoutRectangle
  ) => {
    setAbsoluteCardLayerLayouts((previous) => {
      if (areLayoutsEquivalent(previous[key], layout)) {
        return previous
      }

      return { ...previous, [key]: layout }
    })
  }

  // Stores the top-row layout for later celebration positioning.
  const handleTopRowLayout = (layout: LayoutRectangle) => {
    topRowLayoutRef.current = layout
    mergeCardLayerLayout('topRow', layout)
  }

  // Caches foundation layouts so celebration trajectories know their origins.
  const handleFoundationLayout = (suit: Suit, layout: LayoutRectangle) => {
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
  }

  const handleStockLayout = (layout: LayoutRectangle) =>
    mergeCardLayerLayout('stock', layout)

  const handleWasteLayout = (layout: LayoutRectangle) =>
    mergeCardLayerLayout('waste', layout)

  const handleTableauRowLayout = (layout: LayoutRectangle) =>
    mergeCardLayerLayout('tableauRow', layout)

  const handleTableauColumnLayout = (columnIndex: number, layout: LayoutRectangle) => {
    setAbsoluteCardLayerLayouts((previous) => {
      if (areLayoutsEquivalent(previous.tableauColumns[columnIndex], layout)) {
        return previous
      }

      const tableauColumns = [...previous.tableauColumns]
      tableauColumns[columnIndex] = layout
      return { ...previous, tableauColumns }
    })
  }

  // Hook: drive the Klondike timer lifecycle (start/pause/tick) away from the main component.
  useKlondikeTimer({ state, dispatch, stateRef })

  useEffect(() => {
    // Auto Up lives in settings, but queue scheduling is pure reducer logic.
    // Mirror it into runtime state so turning it off can stop an active queue immediately.
    dispatch({ type: 'SET_AUTO_UP_ENABLED', enabled: autoUpEnabled })
  }, [autoUpEnabled, dispatch])

  // Hook: pick the next solvable deal weighted by prior play history when needed.
  // Defined before the persistence hook so startup fresh deals can use it too.
  const selectNextSolvableDeal = useSolvableDealSelector(
    solvableStats,
    preferredDrawCount
  )

  // Single source for fresh deals (in-app New Game AND the persistence startup
  // paths: first install, won-session cleanup, corrupted-save reset), so the
  // "Solvable deals" setting is honored everywhere. Settings hydrate synchronously
  // and the solvable catalog is a bundled import, so this is safe at any point
  // during startup; history stats hydrate async and may still be empty on the
  // startup paths — the selector then just picks an unplayed solvable deal
  // (repeat-weighting is best-effort, the solvability guarantee is not).
  // Vegas (Phase 2) is a rules mode copied onto the deal like the draw count. The
  // "Solvable deals" catalog is proven for unlimited passes only, so a Vegas deal
  // is always random — an honest casino deal (the history row's `solvable` flag is
  // derived from the catalog, so it comes out false by itself).
  const vegasRules = scoring === 'vegas'
  const createFreshGameState = useCallback((): GameState => {
    if (solvableGamesOnly && !vegasRules) {
      const solvableDeal = selectNextSolvableDeal()
      if (solvableDeal) {
        return createSolvableGameState(solvableDeal, preferredDrawCount)
      }
    }
    return createInitialState(preferredDrawCount, vegasRules)
  }, [preferredDrawCount, selectNextSolvableDeal, solvableGamesOnly, vegasRules])

  // Hook: hydrate and persist game state via expo-sqlite/kv-store once per relevant change.
  // Task 10-7: Persist the current history entry linkage across restarts.
  const storageHydrated = useKlondikePersistence({
    state,
    dispatch,
    previousHasWonRef,
    currentGameEntryIdRef,
    autoUpEnabled,
    createFreshState: createFreshGameState,
  })

  // Mirrors the latest reducer state into a ref for synchronous callbacks.
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Hook: own the active history-entry lifecycle (row recovery, started rows,
  // solved/incomplete recording, celebration-delayed solved write).
  const {
    recordStartedGame,
    recordCurrentGameResult,
    clearCurrentGameEntryLink,
    flushPendingSolvedResultAfterHandoff,
    boardEntryId,
  } = useKlondikeHistoryEntry({
    state,
    stateRef,
    currentGameEntryIdRef,
    previousHasWonRef,
    demoPlaybackActiveRef,
    storageHydrated,
    animationsEnabled,
    celebrationAnimationsEnabled,
    dispatch,
  })

  // Undo-scrubber discovery hint (undo-scrubber-hint plan). All callbacks are
  // stable, so wiring them into dealNewGame/dispatchGameAction/handleUndo below
  // doesn't destabilize those callbacks' identities.
  const {
    undoHintVisible,
    noteUndoSuccess,
    noteStreakBreak,
    noteScrubEnd,
    noteNewDeal,
    resetUndoHintForTesting,
  } = useUndoHint()

  // Deals a new game, respecting solvable-only settings and history bookkeeping.
  // stateOverride (agent-testing-skill C2): the ?deal= deep link supplies an exact
  // deal instead of the solvable-selector state; all bookkeeping stays identical.
  const dealNewGame = useCallback(
    (stateOverride?: GameState) => {
      const startedAt = new Date().toISOString()
      const nextState = stateOverride ?? createFreshGameState()
      recordStartedGame(nextState, { startedAt })
      dispatch({ type: 'HYDRATE_STATE', state: nextState })
      // Absolute-layer cards stay mounted across deals, so this narrow token resets
      // native animated positions without changing card identity for the whole deck.
      setDealResetKey((current) => current + 1)
      // A fresh deal is a hard context switch; a consecutive-undo streak can't span it,
      // and the hint's per-deal flags (shown / scrub-consumed) reset here.
      noteStreakBreak()
      noteNewDeal()
    },
    [createFreshGameState, dispatch, noteNewDeal, noteStreakBreak, recordStartedGame]
  )

  // Hook: own the celebration animation lifecycle and bindings.
  const {
    celebrationState,
    celebrationPending,
    celebrationOverlayReady,
    setCelebrationState,
    celebrationBindings,
    celebrationLabel,
    cycleCelebrationMode,
    startCelebrationPreview,
    handleCelebrationAbort,
    handleCelebrationOverlayReady,
    handleWinningCardFlightSettled,
    clearCelebrationDialogTimer,
  } = useCelebrationController({
    state,
    developerModeEnabled,
    animationsEnabled,
    celebrationAnimationsEnabled,
    boardLayout,
    foundationLayoutsRef,
    topRowLayoutRef,
    updateBoardLocked,
    winCelebrationsRef,
    onWinVisualHandoffStart: flushPendingSolvedResultAfterHandoff,
    requestNewGameRef,
  })

  // Builds the statistics badges based on current settings and elapsed time.
  // Placed after the celebration controller because screenshot-mode celebration
  // PREVIEWS override the pair (see below).
  const { moveCount, elapsedMs, timerState, timerStartedAt, score } = state
  // Store-screenshots round 3: a `?celebration=<id>&screenshot=1` preview runs on
  // a board that was never played, so the real header reads MOVES 0 / TIME 0:00 —
  // obviously fake in store shots. The preview carries display-only synthetic
  // stats; this is the ONLY place that reads them, so state/history/persistence
  // never see the fake numbers (celebrationPreviewStats.ts). The score badge is
  // NOT synthesised (scoring is off by default; previews show the board's real
  // tally if it is on) — extend CelebrationPreviewStats if screenshots need it.
  const celebrationPreviewStats = celebrationState?.previewStats

  // Cumulative Vegas total (P2-C, plan § P-H): settled history sum − the offset
  // taken at the last reset + the live game — unless this game's own row already
  // carries its result (won board, result recorded) in which case the row is in
  // the settled sum and the live tally must not be added again. The row is looked
  // up in the in-memory entries: it is always the newest one (first page).
  // Invariant (G8): "settled" is read off the row the result was WRITTEN to —
  // boardEntryId is published by the write itself (useKlondikeHistoryEntry), and
  // the provider keeps the in-memory copy of a row current even when the write
  // raced history hydration. Only the SQL sum lags the write by one queue task
  // (accepted ~1-frame gap, plan § P-H gap note).
  const boardRowSettled =
    boardEntryId !== null &&
    typeof historyEntries.find((entry) => entry.id === boardEntryId)?.vegasScore ===
      'number'
  const vegasTotal =
    vegasTotalEnabled && state.vegasRules
      ? settledVegasTotal - vegasTotalOffset + (boardRowSettled ? 0 : score.vegas)
      : null

  // Scoring (2026-10-11): the former `!showMoves && !showTime → []` early return
  // was dropped — buildStatisticsRows returns [] itself when nothing is enabled.
  const statisticsRows: StatisticsRow[] = buildStatisticsRows({
    showMoves,
    showTime,
    scoring,
    vegasRules: state.vegasRules,
    score,
    vegasTotal,
    moveCount: celebrationPreviewStats?.moveCount ?? moveCount,
    elapsedMs: celebrationPreviewStats?.elapsedMs ?? elapsedMs,
    // Frozen while previewing: 'paused' + no start timestamp make
    // computeElapsedWithReference return elapsedMs verbatim, so re-firing the
    // same link reproduces the exact same screenshot.
    timerState: celebrationPreviewStats ? 'paused' : timerState,
    timerStartedAt: celebrationPreviewStats ? null : timerStartedAt,
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
      if (action.type !== 'UNDO') {
        // Any other game action (draw, move, selection, auto-queue advance) ends a
        // consecutive-undo streak. TIMER_* actions bypass dispatchGameAction (raw
        // dispatch in useKlondikeTimer/useKlondikeHistoryEntry), so timer ticks
        // correctly do NOT reset the streak.
        noteStreakBreak()
      }
      dispatch(action)
    },
    [dispatch, noteStreakBreak]
  )

  // Shared "Deal Again" body: used by the requestNewGame confirmation dialog AND
  // by the dev-only ?reset=game / ?deal= deep links, which skip the dialog on
  // purpose (agent-testing-skill C2/C4). Defined before the demo launcher so the
  // deep-link callbacks below can be passed in as props.
  const performDealAgain = useCallback(
    (options?: { stateOverride?: GameState; logContext?: Record<string, unknown> }) => {
      // Task 10-6: Only record if game wasn't already won (winning already records)
      if (!stateRef.current.hasWon) {
        recordCurrentGameResult()
      }
      setCelebrationState(null)
      // Foundation/top-row layout refs deliberately NOT cleared (alignment
      // root-cause story, 2026-07-08): a new deal keeps the board geometry, so
      // onLayout never re-fires and cleared refs would stay empty for the rest of
      // the app process — every later celebration then rendered at synthetic
      // fallback positions (no left gutter, too-wide spacing; the fallback has
      // since been removed — empty refs now refuse to start the celebration).
      winCelebrationsRef.current = 0
      void clearGameState().catch((error) => {
        devLog('warn', 'Failed to clear persisted game before new deal', error)
      })
      dealNewGame(options?.stateOverride)
      updateBoardLocked(false)
      devLog('log', '[Game] New game dealt', options?.logContext ?? {})
    },
    [dealNewGame, recordCurrentGameResult, setCelebrationState, updateBoardLocked]
  )

  // ?reset=game (agent-testing-skill C4): New Game without the UI confirmation.
  const dealNewGameForTesting = () => {
    performDealAgain({ logContext: { reason: 'deepLink-reset' } })
  }

  // ?deal=<exactId>&draw=N (agent-testing-skill C2): bug-report repro and
  // hand-crafted scenario deals. The launcher validates the id before calling.
  // Exact-deal paths (?deal= and Retry) take the CURRENT Scoring setting's rules,
  // same as the draw count fallback: the deal id fixes the cards, not the rule set.
  const startGameFromExactDeal = (exactId: ExactDealId, drawCount?: DrawCount) => {
    performDealAgain({
      stateOverride: createGameStateFromExactId(
        exactId,
        drawCount ?? preferredDrawCount,
        { vegasRules }
      ),
      logContext: { reason: 'deepLink-deal', exactId, drawCount },
    })
  }

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
    winCelebrationsRef,
    clearCurrentGameEntryLink,
    demoPlaybackActiveRef,
    updateBoardLocked,
    clearGameState,
    preferredDrawCount,
    autoUpEnabled,
    seedHistoryForTesting,
    setDrawCount,
    setAutoUpEnabled,
    setSolvableGamesOnly,
    setWarningMode,
    setHintButtonEnabled,
    setScoringMode,
    setVegasTotalEnabled,
    resetUndoHintForTesting,
    dealNewGameForTesting,
    startGameFromExactDeal,
    // ?celebration= preview now lives in useCelebrationController (Story 5) —
    // the old useKlondikeGame-local triggerCelebrationForTesting was removed.
    startCelebrationPreview,
  })

  // Triggers the invalid-move wiggle animation for the provided selection.
  // Reads state via stateRef (synced before any user event can fire) so this callback
  // stays referentially stable; a `state` dep here previously cascaded new identities
  // into every press handler on each action, defeating board memoization (perf, P3/A2).
  const triggerInvalidSelectionWiggle = useCallback((selection?: Selection | null) => {
    const ids = collectSelectionCardIds(stateRef.current, selection)
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
  }, [])

  // Provides invalid-move feedback when actions are not allowed.
  // Auto-play state is read from stateRef to keep this callback stable (perf, P3/A2).
  const notifyInvalidMove = useCallback(
    (options?: { selection?: Selection | null }) => {
      const current = stateRef.current
      if (current.isAutoCompleting || current.autoQueue.length > 0) {
        return
      }
      if (boardLockedRef.current) {
        return
      }
      triggerInvalidSelectionWiggle(options?.selection ?? null)
    },
    [triggerInvalidSelectionWiggle]
  )

  // Sets the stock button label, fading when the stock is empty.
  const drawLabel = state.stock.length ? 'Draw' : ''

  // Captures board dimensions for card metrics and celebration sizing.
  const handleBoardLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    setBoardLayout((previous) => {
      if (previous.width === width && previous.height === height) {
        return previous
      }
      void saveBoardMetrics({ width, height })
      return { width, height }
    })
  }

  // Handles draw/recycle presses, validating availability before dispatching.
  const handleDraw = () => {
    const current = stateRef.current
    if (!current.stock.length && !current.waste.length) {
      notifyInvalidMove()
      return
    }
    dispatchGameAction({ type: 'DRAW_OR_RECYCLE' })
  }

  // Initiates an undo action when the board is unlocked and history exists.
  const handleUndo = () => {
    const current = stateRef.current
    if (!current.history.length || boardLockedRef.current) {
      // Failed undo taps break the streak too — the user isn't walking back through
      // history right now. (dispatchGameAction would silently drop the action while
      // locked, so mirror its guard here for correct counting.)
      noteStreakBreak()
      if (!current.history.length) {
        notifyInvalidMove()
      }
      return
    }
    // Hint counters: only tap-undos count. Scrub steps dispatch SCRUB_TO_INDEX via raw
    // dispatch and never reach handleUndo. Demo playback also bypasses handleUndo
    // (useDemoGameLauncher dispatches UNDO directly), so the demoPlaybackActiveRef
    // check is purely defensive against future call sites.
    if (!demoPlaybackActiveRef.current) {
      noteUndoSuccess()
    }
    dispatchGameAction({ type: 'UNDO' })
  }

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
          performDealAgain({ logContext: { reason, forced } })
        },
      })

      Alert.alert(
        'Start a new game?',
        forced ? 'Nice win! Ready for another round?' : 'Ready for another round?',
        buttons,
        { cancelable: !forced }
      )
    },
    [clearCelebrationDialogTimer, performDealAgain, updateBoardLocked]
  )

  // Play a specific deal from scratch (retry-and-share-deal plan): History → Retry and
  // incoming share links. Product decisions: same exactId + drawCount, NEW history row
  // via the normal new-game path (an existing row for that deal stays untouched),
  // current game recorded incomplete exactly like "New Game". Confirmation mirrors
  // requestNewGame; it is skipped when nothing is at stake — a won board (celebration
  // showing) or a non-Vegas board without moves. Lives here (not in the history screen /
  // +native-intent) because stateRef makes that skip two lines.
  const requestPlayDeal = useCallback<RequestPlayDealFn>(
    (exactId, drawCount, options) => {
      clearCelebrationDialogTimer()
      const prompt = PLAY_DEAL_PROMPTS[options?.prompt ?? 'retry']
      const play = () => {
        options?.onConfirmed?.()
        performDealAgain({
          // Retried/shared deals take the current Scoring setting's rules (see
          // startGameFromExactDeal), not the rules of the row being retried.
          stateOverride: createGameStateFromExactId(exactId, drawCount, { vegasRules }),
          logContext: { reason: options?.prompt ?? 'retry', exactId, drawCount },
        })
      }
      const current = stateRef.current
      // A zero-move VEGAS board still has money at stake (every deal costs $52,
      // round 2), so it gets the confirmation too.
      if (current.hasWon || (current.moveCount === 0 && !current.vegasRules)) {
        play()
        return
      }
      Alert.alert(
        prompt.title,
        'Your current game will end and be recorded as incomplete.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: prompt.confirm, style: 'destructive', onPress: play },
        ]
      )
    },
    [clearCelebrationDialogTimer, performDealAgain, vegasRules]
  )

  // Incoming share link (https://karimattia.ch/soli/deal/… or soli://soli/deal/…),
  // stashed by app/+native-intent.tsx. Consumed only after persistence hydrated: on a
  // cold start the link arrives before the saved game is restored, and prompting (or
  // skip-confirming on the not-yet-hydrated empty board) earlier would let the restore
  // stomp the new deal — the dev links solve the same race with a fixed settle delay.
  const pendingDealRequest = usePendingDealRequest()
  useEffect(() => {
    if (!storageHydrated || !pendingDealRequest) {
      return
    }
    clearPendingDealRequest()
    requestPlayDeal(
      pendingDealRequest.exactId,
      pendingDealRequest.drawCount ?? preferredDrawCount,
      { prompt: 'shared' }
    )
  }, [pendingDealRequest, preferredDrawCount, requestPlayDeal, storageHydrated])

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
  // Uses stateRef (only ever called from user events, which fire after the ref sync
  // effect) so the callback stays stable for memoized card layers (perf, P3/A2).
  const attemptAutoMove = (selection: Selection) => {
    attemptAutoMoveFromState(selection, stateRef.current)
  }

  const handleWasteTap = () => {
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
  }

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
  // Reads live state via stateRef and recomputes drop hints at event time (cheap) so
  // the callback stays stable for memoized board components. Depending on the
  // render-time `dropHints`/`state.selected` here previously gave every selection
  // change a new handler identity, defeating card-layer memoization (perf, P3/A2).
  const handleFoundationPress = (suit: Suit) => {
    if (boardLockedRef.current) {
      return
    }
    const current = stateRef.current
    if (!current.selected) {
      if (current.foundations[suit].length) {
        attemptAutoMove({ source: 'foundation', suit })
      }
      return
    }
    if (getDropHints(current).foundations[suit]) {
      dispatchGameAction({
        type: 'APPLY_MOVE',
        selection: current.selected,
        target: { type: 'foundation', suit },
      })
    } else {
      notifyInvalidMove({ selection: current.selected })
    }
  }

  // Hint button + background warnings (hints plan; warning-mode select since
  // F14). Dispatchless since feedback round 1 (2026-07-23): hint visuals are a
  // dedicated overlay, never selection state, so useHint needs no dispatcher.
  const { requestHint, activeHint, hintBubbleText, warningEmphasisNonce } = useHint({
    state,
    stateRef,
    warningMode,
    hintButtonEnabled,
    demoPlaybackActiveRef,
  })

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
    // Scrubbing proves the user knows the feature: break the streak the moment a
    // scrub session begins (a visible hint deliberately stays — see noteStreakBreak);
    // a successful scrub (ended at a different timeline index) consumes one
    // remaining hint.
    onScrubBegin: noteStreakBreak,
    onScrubEnd: noteScrubEnd,
  })

  // Developer-mode log marker when the auto-complete queue engages.
  useEffect(() => {
    if (state.autoCompleteRuns > autoCompleteRunsRef.current) {
      devLog('log', '[Game] Auto-complete engaged', {
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

  // Stable per-position tableau press handler so the absolute card layer's memoized
  // cards never see a new function identity (perf, P3).
  const handleTableauCardPress = (columnIndex: number, cardIndex: number) => {
    attemptAutoMove({ source: 'tableau', columnIndex, cardIndex })
  }

  // Perf (A2): the board components receive narrow state slices instead of the whole
  // GameState so the compiler can cache these prop objects (and KlondikeGameView the
  // child elements) when piles kept identity (TIMER_TICK, selection-only changes,
  // moves that don't touch a given pile). Formerly React.memo on each component.
  const topRowProps: TopRowProps = {
    stockCount: state.stock.length,
    wasteCount: state.waste.length,
    recyclesLeft: recyclesLeft(state),
    foundations: state.foundations,
    selected: state.selected,
    hasWon: state.hasWon,
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
    tableau: state.tableau,
    selected: state.selected,
    hasWon: state.hasWon,
    cardMetrics,
    dropHints,
    interactionsLocked: boardLocked,
    celebrationPending,
    // Empty-column outlines hide during celebrations (outline-audit story) — gated on
    // celebrationState directly (not the overlay-ready gate below): nothing replaces
    // the outlines, so there is no continuity contract, matching FoundationPile.
    celebrationActive: Boolean(celebrationState),
    onTableauRowLayout: handleTableauRowLayout,
    onTableauColumnLayout: handleTableauColumnLayout,
  }

  // New Game in the (empty) Hint slot of the dock — scoring plan round 3. Vegas
  // has NO game-end detection (user decision, prompt 6: the heuristic end could
  // be premature and "the user should decide themselves"), so once a Vegas game
  // has nothing left to draw — stock empty and no pass left, i.e. the ⊘ state of
  // the stock slot (or stock + waste both empty) — the dock offers the natural
  // next step. Undo past the last draw/recycle hides it again (pure derivation
  // from the snapshot). Standard games never show it (unlimited recycles). The
  // header's "New Game" stays as well — same requestNewGame confirmation.
  const vegasNewGameButtonVisible =
    state.vegasRules &&
    !state.hasWon &&
    !celebrationState &&
    state.stock.length === 0 &&
    recyclesLeft(state) === 0
  const requestNewGameFromDock = () => requestNewGame({ reason: 'manual' })

  // requirement 20-6: onUndoPress removed - tap is handled by composed gesture
  const undoScrubProps: UndoScrubberProps = {
    // With the Hint button ON the dock also shows on a fresh deal (empty
    // timeline) so the button is reachable from move zero; the Undo pill is
    // then visible but inert (canUndo false dims it, the pan/tap guards
    // no-op). With the button OFF this is exactly the pre-feature
    // `shouldShowUndo` — the warning-only settings never affect the dock.
    // (vegasNewGameButtonVisible implies a non-empty timeline, so it never
    // opens the dock on its own — listed for clarity.)
    visible:
      shouldShowUndo ||
      (hintButtonEnabled && !state.hasWon && !celebrationState) ||
      vegasNewGameButtonVisible,
    scrubActive,
    scrubIndex: scrubAnimatedIndex,
    sliderMax: scrubSliderMax,
    historyIndex: state.history.length,
    gesture: undoScrubGesture,
    canUndo,
    onTrackMetrics: handleTrackMetrics,
    hintVisible: undoHintVisible,
    hintButtonVisible: hintButtonEnabled,
    // Deliberately NO hintDisabled/busy prop (user feedback 2026-07-23: the
    // solver-busy style blink on every move was a no-go). requestHint's own
    // guards cover won/auto-complete/demo; board-locked situations hide the
    // whole dock anyway.
    onHintPress: requestHint,
    hintBubbleText,
    warningEmphasisNonce,
    newGameButtonVisible: vegasNewGameButtonVisible,
    onNewGamePress: requestNewGameFromDock,
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
    onCelebrationBadgePress: cycleCelebrationMode,
    onCelebrationOverlayReady: handleCelebrationOverlayReady,
    undoScrubProps,
    // Hint visuals (feedback round 1; all kinds incl. the stock ring since
    // F13): null during normal play — the overlay is only mounted while a
    // hint is showing, so it costs nothing per move and cannot disturb the
    // card layer's memo boundaries.
    hintOverlayProps: activeHint
      ? {
          hint: activeHint,
          wasteCount: state.waste.length,
          tableau: state.tableau,
          layouts: absoluteCardLayerLayouts,
          cardMetrics,
        }
      : null,
    absoluteCardLayerProps: {
      stock: state.stock,
      waste: state.waste,
      foundations: state.foundations,
      tableau: state.tableau,
      cardMetrics,
      layouts: absoluteCardLayerLayouts,
      drawLabel,
      invalidWiggle: invalidWiggleEnabled ? invalidWiggle : EMPTY_INVALID_WIGGLE,
      animationResetKey: dealResetKey,
      interactionsLocked: boardLocked,
      // Overlay-ready gate (celebration-start flicker story, user 2026-07-09): the
      // REAL cards must stay mounted until the Skia overlay's atlas texture is ready
      // (its first drawable frame). Hiding on celebrationState alone left the
      // foundation area empty for the async-rasterization frames — visible flicker.
      celebrationActive: Boolean(celebrationState) && celebrationOverlayReady,
      onDraw: handleDraw,
      onWasteTap: handleWasteTap,
      onFoundationPress: handleFoundationPress,
      onTableauCardPress: handleTableauCardPress,
      onCardSettled: handleWinningCardFlightSettled,
    },
  }

  return {
    developerModeEnabled,
    requestNewGame,
    requestPlayDeal,
    handleLaunchDemoGame,
    resetUndoHintForTesting,
    seedHistoryForTesting,
    // Demo-sheet celebration preview (demo-sheet-cleanup): same controller entry
    // point the ?celebration= deep link uses; undefined modeId = random mode.
    startCelebrationPreview,
    viewProps,
  }
}
