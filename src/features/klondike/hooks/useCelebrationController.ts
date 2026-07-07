import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LayoutRectangle } from 'react-native'
import {
  Easing,
  cancelAnimation,
  runOnJS,
  runOnUI,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'

import {
  CELEBRATION_DURATION_MS,
  CELEBRATION_MODE_METADATA,
  getCelebrationModeMetadata,
} from '../../../animation/celebrationModes'
import { DEAL_RANKS } from '../../../solitaire/dealIdentity'
import { FOUNDATION_SUIT_ORDER } from '../../../solitaire/klondike'
import { useAnimationToggles } from '../../../state/settings'
import type { Card, GameState, Suit } from '../../../solitaire/klondike'
import { devLog } from '../../../utils/devLogger'
import {
  CARD_ANIMATION_DURATION_MS,
  FOUNDATION_FALLBACK_GAP,
  FOUNDATION_GLOW_TOTAL_DURATION_MS,
  WIN_CELEBRATION_HANDOFF_DELAY_MS,
} from '../constants'
import type { CelebrationBindings, CardMetrics } from '../types'

export type CelebrationCardConfig = {
  card: Card
  stackIndex: number
  // Ring index for Suit Orbits (mode 24); order comes from FOUNDATION_SUIT_ORDER.
  suitIndex: number
  baseX: number
  baseY: number
  randomSeed: number
}

export type CelebrationState = {
  modeId: number
  durationMs: number
  boardWidth: number
  boardHeight: number
  cards: CelebrationCardConfig[]
}

type UseCelebrationControllerParams = {
  state: GameState
  developerModeEnabled: boolean
  animationsEnabled: boolean
  celebrationAnimationsEnabled: boolean
  boardLayout: { width: number | null; height: number | null }
  cardMetrics: CardMetrics
  foundationLayoutsRef: React.MutableRefObject<Partial<Record<Suit, LayoutRectangle>>>
  topRowLayoutRef: React.MutableRefObject<LayoutRectangle | null>
  updateBoardLocked: (locked: boolean) => void
  winCelebrationsRef: React.MutableRefObject<number>
  onWinVisualHandoffStart?: (options: { reason: CelebrationStartReason }) => void
  requestNewGameRef: React.MutableRefObject<
    ((options?: { reason?: 'manual' | 'celebration' }) => void) | null
  >
}

const CELEBRATION_DIALOG_DELAY_MS = 30_000
const CELEBRATION_HANDOFF_LOG_PREFIX = '[CelebrationHandoff]'

type FoundationTopCardIds = Record<Suit, string | null>
type CelebrationStartReason = 'flight_settled' | 'fallback'

// Visual-only randomization for celebration timing/layering. This is not a
// gameplay deck shuffle and cannot affect the exact deal ID. Fisher-Yates instead
// of a random sort comparator (which is biased and engine-dependent).
const shuffleCelebrationCards = (
  cards: CelebrationCardConfig[]
): CelebrationCardConfig[] => {
  const shuffled = [...cards]
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const buildFoundationTopCardIds = (
  foundations: GameState['foundations']
): FoundationTopCardIds => ({
  clubs: foundations.clubs[foundations.clubs.length - 1]?.id ?? null,
  diamonds: foundations.diamonds[foundations.diamonds.length - 1]?.id ?? null,
  hearts: foundations.hearts[foundations.hearts.length - 1]?.id ?? null,
  spades: foundations.spades[foundations.spades.length - 1]?.id ?? null,
})

const findWinningTopCardId = (
  previousTopCardIds: FoundationTopCardIds,
  currentTopCardIds: FoundationTopCardIds
): string | null => {
  for (const suit of FOUNDATION_SUIT_ORDER) {
    const topCardId = currentTopCardIds[suit]
    if (topCardId && topCardId !== previousTopCardIds[suit]) {
      return topCardId
    }
  }

  return null
}

export const useCelebrationController = ({
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
  onWinVisualHandoffStart,
  requestNewGameRef,
}: UseCelebrationControllerParams) => {
  const [celebrationState, setCelebrationState] = useState<CelebrationState | null>(null)
  const [celebrationPending, setCelebrationPending] = useState(false)
  const celebrationProgress = useSharedValue(0)
  const celebrationActive = useSharedValue(0)
  const celebrationMode = useSharedValue(0)
  const celebrationBoard = useSharedValue<{ width: number; height: number }>({
    width: 0,
    height: 0,
  })
  const celebrationTotal = useSharedValue(0)

  const celebrationAbortRef = useRef(false)
  // Dev-hold (Story 5): set by the first badge press (cycleCelebrationMode) and by
  // previews. While set, the 30s new-game dialog is never scheduled and the 60s run
  // loops instead of completing, so the developer stays in the celebration until
  // tapping the animation (abort) or dealing a new game.
  const celebrationHoldRef = useRef(false)
  // Preview (Story 5): celebration started via the ?celebration deep link on an
  // untouched game — abort must clean up + unlock WITHOUT the new-game dialog.
  const celebrationPreviewRef = useRef(false)
  const celebrationDialogTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const celebrationDialogShownRef = useRef(false)
  const celebrationStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const celebrationFallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingCelebrationActiveRef = useRef(false)
  const pendingCelebrationQueuedAtRef = useRef<number | null>(null)
  const pendingWinningCardIdRef = useRef<string | null>(null)
  const pendingWinningCardSettledRef = useRef(false)
  const previousFoundationTopCardIdsRef = useRef<FoundationTopCardIds>(
    buildFoundationTopCardIds(state.foundations)
  )
  const { foundationGlow: foundationGlowEnabled, cardFlights: cardFlightsEnabled } =
    useAnimationToggles()

  const celebrationBindings = useMemo<CelebrationBindings>(
    () => ({
      active: celebrationActive,
      progress: celebrationProgress,
      mode: celebrationMode,
      board: celebrationBoard,
      total: celebrationTotal,
    }),
    [
      celebrationActive,
      celebrationBoard,
      celebrationMode,
      celebrationProgress,
      celebrationTotal,
    ]
  )

  const clearCelebrationDialogTimer = useCallback(() => {
    if (celebrationDialogTimeoutRef.current) {
      clearTimeout(celebrationDialogTimeoutRef.current)
      celebrationDialogTimeoutRef.current = null
    }
  }, [])

  const clearCelebrationStartTimer = useCallback(() => {
    if (celebrationStartTimeoutRef.current) {
      clearTimeout(celebrationStartTimeoutRef.current)
      celebrationStartTimeoutRef.current = null
    }
  }, [])

  const clearCelebrationFallbackTimer = useCallback(() => {
    if (celebrationFallbackTimeoutRef.current) {
      clearTimeout(celebrationFallbackTimeoutRef.current)
      celebrationFallbackTimeoutRef.current = null
    }
  }, [])

  const logCelebrationHandoff = useCallback(
    (event: string, details?: Record<string, unknown>) => {
      devLog('info', `${CELEBRATION_HANDOFF_LOG_PREFIX} ${event}`, details ?? {})
    },
    []
  )

  const openCelebrationDialog = useCallback(() => {
    clearCelebrationDialogTimer()
    if (celebrationDialogShownRef.current) {
      return
    }
    celebrationDialogShownRef.current = true
    requestNewGameRef.current?.({ reason: 'celebration' })
  }, [clearCelebrationDialogTimer, requestNewGameRef])

  const handleCelebrationComplete = useCallback(() => {
    devLog('info', '[Celebration] complete')
    updateBoardLocked(false)
    setCelebrationState(null)
    openCelebrationDialog()
  }, [openCelebrationDialog, updateBoardLocked])

  // Shared per-card launch-position math for real wins AND dev previews — one
  // source of truth so preview cards start exactly where win cards would (Story 5).
  const computeCelebrationCardBase = useCallback(
    (suit: Suit, suitIndex: number, stackIndex: number) => {
      const topLayout = topRowLayoutRef.current
      const topOffsetX = topLayout?.x ?? 0
      const topOffsetY = topLayout?.y ?? 0
      const fallbackSpacing = cardMetrics.width + FOUNDATION_FALLBACK_GAP
      const layout = foundationLayoutsRef.current[suit]
      const baseX = topOffsetX + (layout?.x ?? suitIndex * fallbackSpacing)
      const baseY =
        topOffsetY + (layout?.y ?? 0) - stackIndex * (cardMetrics.height * 0.02)
      return { baseX, baseY }
    },
    [cardMetrics.height, cardMetrics.width, foundationLayoutsRef, topRowLayoutRef]
  )

  const buildCelebrationState = useCallback((): CelebrationState | null => {
    const boardWidthValue = boardLayout.width ?? 0
    const boardHeightValue = boardLayout.height ?? 0

    if (!boardWidthValue || !boardHeightValue) {
      return null
    }

    const cards: CelebrationCardConfig[] = []

    FOUNDATION_SUIT_ORDER.forEach((suit, suitIndex) => {
      const pile = state.foundations[suit]

      pile.forEach((card, stackIndex) => {
        const { baseX, baseY } = computeCelebrationCardBase(suit, suitIndex, stackIndex)
        cards.push({
          card,
          stackIndex,
          suitIndex,
          baseX,
          baseY,
          randomSeed: Math.random(),
        })
      })
    })

    if (!cards.length) {
      return null
    }

    // Pick a random metadata ENTRY (not a random 0..count integer) so mode ids stay
    // stable even if entries are removed later — see the contract in celebrationModes.ts.
    const modeId =
      CELEBRATION_MODE_METADATA[
        Math.floor(Math.random() * CELEBRATION_MODE_METADATA.length)
      ].id

    return {
      modeId,
      durationMs: CELEBRATION_DURATION_MS,
      boardWidth: boardWidthValue,
      boardHeight: boardHeightValue,
      cards: shuffleCelebrationCards(cards),
    }
  }, [
    boardLayout.height,
    boardLayout.width,
    computeCelebrationCardBase,
    state.foundations,
  ])

  const startPendingCelebration = useCallback(
    (reason: CelebrationStartReason) => {
      if (!pendingCelebrationActiveRef.current) {
        return
      }

      const pendingWinningCardId = pendingWinningCardIdRef.current
      pendingCelebrationActiveRef.current = false
      pendingCelebrationQueuedAtRef.current = null
      pendingWinningCardIdRef.current = null
      pendingWinningCardSettledRef.current = false
      setCelebrationPending(false)
      clearCelebrationStartTimer()
      clearCelebrationFallbackTimer()
      onWinVisualHandoffStart?.({ reason })
      // Task 28-2: Build the celebration payload only once the visual handoff is actually
      // starting so the exact win frame stays as light as possible.
      const nextCelebrationState = buildCelebrationState()
      if (!nextCelebrationState) {
        logCelebrationHandoff('start_skipped_no_state', {
          ts: Date.now(),
          reason,
          pendingWinningCardId,
        })
        updateBoardLocked(false)
        return
      }
      logCelebrationHandoff('start', {
        ts: Date.now(),
        reason,
        pendingWinningCardId,
      })
      setCelebrationState((current) => current ?? nextCelebrationState)
    },
    [
      buildCelebrationState,
      clearCelebrationFallbackTimer,
      clearCelebrationStartTimer,
      logCelebrationHandoff,
      onWinVisualHandoffStart,
      updateBoardLocked,
    ]
  )

  const clearCelebrationAnimations = useCallback(() => {
    celebrationAbortRef.current = false
    celebrationHoldRef.current = false
    celebrationPreviewRef.current = false
    celebrationDialogShownRef.current = false
    pendingCelebrationActiveRef.current = false
    pendingCelebrationQueuedAtRef.current = null
    pendingWinningCardIdRef.current = null
    pendingWinningCardSettledRef.current = false
    setCelebrationPending(false)
    celebrationTotal.value = 0
    celebrationMode.value = 0
    celebrationBoard.value = { width: 0, height: 0 }
    runOnUI(() => {
      'worklet'
      celebrationActive.value = 0
      cancelAnimation(celebrationProgress)
    })()
    clearCelebrationStartTimer()
    clearCelebrationFallbackTimer()
    clearCelebrationDialogTimer()
  }, [
    celebrationActive,
    celebrationBoard,
    celebrationMode,
    celebrationProgress,
    celebrationTotal,
    clearCelebrationDialogTimer,
    clearCelebrationFallbackTimer,
    clearCelebrationStartTimer,
  ])

  const handleCelebrationAbort = useCallback(() => {
    const wasPreview = celebrationPreviewRef.current
    celebrationAbortRef.current = true
    celebrationHoldRef.current = false
    celebrationPreviewRef.current = false
    devLog('info', '[Celebration] abort requested', { preview: wasPreview })
    runOnUI(() => {
      'worklet'
      celebrationActive.value = 0
      cancelAnimation(celebrationProgress)
    })()
    clearCelebrationDialogTimer()
    updateBoardLocked(false)
    setCelebrationState(null)
    // Preview (deep link) overlays an untouched, unfinished game — dismiss back to
    // it silently instead of offering the post-win "Deal Again" dialog.
    if (!wasPreview) {
      openCelebrationDialog()
    }
  }, [
    celebrationActive,
    celebrationProgress,
    clearCelebrationDialogTimer,
    openCelebrationDialog,
    updateBoardLocked,
  ])

  const scheduleCelebrationStart = useCallback(
    (delayMs: number, reason: CelebrationStartReason) => {
      clearCelebrationStartTimer()
      if (delayMs <= 0) {
        startPendingCelebration(reason)
        return
      }

      celebrationStartTimeoutRef.current = setTimeout(() => {
        celebrationStartTimeoutRef.current = null
        startPendingCelebration(reason)
      }, delayMs)
    },
    [clearCelebrationStartTimer, startPendingCelebration]
  )

  const scheduleCelebrationFallback = useCallback(
    (delayMs: number) => {
      clearCelebrationFallbackTimer()
      celebrationFallbackTimeoutRef.current = setTimeout(() => {
        celebrationFallbackTimeoutRef.current = null
        logCelebrationHandoff('fallback_timeout_reached', {
          ts: Date.now(),
          pendingWinningCardId: pendingWinningCardIdRef.current,
          delayMs,
        })
        startPendingCelebration('fallback')
      }, delayMs)
    },
    [clearCelebrationFallbackTimer, logCelebrationHandoff, startPendingCelebration]
  )

  const handleWinningCardFlightSettled = useCallback(
    (cardId: string) => {
      const pendingWinningCardId = pendingWinningCardIdRef.current
      if (!pendingCelebrationActiveRef.current || !pendingWinningCardId) {
        return
      }
      if (cardId !== pendingWinningCardId || pendingWinningCardSettledRef.current) {
        return
      }

      pendingWinningCardSettledRef.current = true
      clearCelebrationFallbackTimer()
      const settledAt = Date.now()
      const queuedAt = pendingCelebrationQueuedAtRef.current ?? settledAt
      const elapsedSinceQueuedAt = Math.max(0, settledAt - queuedAt)
      const remainingGlowDelayMs = foundationGlowEnabled
        ? cardFlightsEnabled
          ? Math.max(0, WIN_CELEBRATION_HANDOFF_DELAY_MS - elapsedSinceQueuedAt)
          : Math.max(0, FOUNDATION_GLOW_TOTAL_DURATION_MS - elapsedSinceQueuedAt)
        : 0

      logCelebrationHandoff('winning_card_settled', {
        ts: settledAt,
        cardId,
        elapsedSinceQueuedAt,
        remainingGlowDelayMs,
      })
      scheduleCelebrationStart(remainingGlowDelayMs, 'flight_settled')
    },
    [
      cardFlightsEnabled,
      clearCelebrationFallbackTimer,
      foundationGlowEnabled,
      logCelebrationHandoff,
      scheduleCelebrationStart,
    ]
  )

  useEffect(() => {
    if (!celebrationState) {
      clearCelebrationAnimations()
      return
    }

    celebrationAbortRef.current = false
    celebrationDialogShownRef.current = false
    clearCelebrationDialogTimer()

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

    // Hoisted `function` declarations don't inherit the null-narrowing above, so
    // capture the duration first. Mutual recursion (run ↔ finish) needs hoisting.
    const durationMs = celebrationState.durationMs
    function startProgressRun() {
      runOnUI(() => {
        'worklet'
        celebrationActive.value = 1
        celebrationProgress.value = 0
        celebrationProgress.value = withTiming(
          1,
          { duration: durationMs, easing: Easing.linear },
          (finished) => {
            if (finished && !celebrationAbortRef.current) {
              runOnJS(handleRunFinished)()
            }
          }
        )
      })()
    }

    function handleRunFinished() {
      if (celebrationHoldRef.current) {
        // Dev-hold loop: restart the same 60s run instead of completing. The end
        // fade plays and the cards relaunch from the foundations — intentional,
        // it keeps the hold session alive indefinitely for mode inspection.
        devLog('info', '[Celebration] dev-hold: restarting run')
        startProgressRun()
        return
      }
      handleCelebrationComplete()
    }

    startProgressRun()

    // Dev-hold suppresses the 30s dialog entirely (not just per-cycle restarts).
    if (!celebrationHoldRef.current) {
      celebrationDialogTimeoutRef.current = setTimeout(
        openCelebrationDialog,
        CELEBRATION_DIALOG_DELAY_MS
      )
    }

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
    celebrationBoard,
    celebrationMode,
    celebrationProgress,
    celebrationState,
    celebrationTotal,
    clearCelebrationAnimations,
    clearCelebrationDialogTimer,
    handleCelebrationComplete,
    openCelebrationDialog,
  ])

  // Dev tool (badge tap): jump to the next metadata entry, wrapping. Updating
  // celebrationState re-triggers the effect above, which restarts the 60s progress run
  // from 0 — acceptable for a dev-only mode-preview tool.
  const cycleCelebrationMode = useCallback(() => {
    setCelebrationState((current) => {
      if (!current) {
        return current
      }
      // First press "enters" dev-hold (Story 5): from here on, no 30s dialog and the
      // 60s run loops until tap-on-animation (abort) or a new game. Set inside the
      // updater so a stray press with no active celebration can't leave a stale hold.
      celebrationHoldRef.current = true
      const currentEntryIndex = CELEBRATION_MODE_METADATA.findIndex(
        (entry) => entry.id === current.modeId
      )
      const nextEntry =
        CELEBRATION_MODE_METADATA[
          (currentEntryIndex + 1) % CELEBRATION_MODE_METADATA.length
        ]
      return { ...current, modeId: nextEntry.id }
    })
  }, [])

  // Dev deep link (?celebration=<id|random>, Story 5): show the full celebration
  // overlay on ANY board without winning. Differences vs a real win: 52 synthetic
  // cards (ids `preview-<suit>-<rank>` can never collide with board card ids — the
  // overlay renders purely from this config), dev-hold is active from the start
  // (no 30s dialog, endless loop), and abort returns to the untouched game
  // without the new-game dialog (see handleCelebrationAbort).
  const startCelebrationPreview = useCallback(
    (modeId?: number) => {
      const boardWidthValue = boardLayout.width ?? 0
      const boardHeightValue = boardLayout.height ?? 0
      if (!boardWidthValue || !boardHeightValue) {
        devLog('warn', '[Celebration] preview skipped: board layout not ready')
        return
      }

      const cards: CelebrationCardConfig[] = []
      // Foundation slot layouts are measured on the slot VIEWS (present even when
      // piles are empty), so preview base positions work mid-game too.
      FOUNDATION_SUIT_ORDER.forEach((suit, suitIndex) => {
        DEAL_RANKS.forEach((rank, stackIndex) => {
          const { baseX, baseY } = computeCelebrationCardBase(
            suit,
            suitIndex,
            stackIndex
          )
          cards.push({
            card: { id: `preview-${suit}-${rank}`, suit, rank, faceUp: true },
            stackIndex,
            suitIndex,
            baseX,
            baseY,
            randomSeed: Math.random(),
          })
        })
      })

      // A given id must exist in the metadata (stable-id contract); otherwise fall
      // back to a random entry — same selection rule as a real win.
      const resolvedModeId =
        CELEBRATION_MODE_METADATA.find((entry) => entry.id === modeId)?.id ??
        CELEBRATION_MODE_METADATA[
          Math.floor(Math.random() * CELEBRATION_MODE_METADATA.length)
        ].id

      celebrationHoldRef.current = true
      celebrationPreviewRef.current = true
      updateBoardLocked(true)
      setCelebrationState({
        modeId: resolvedModeId,
        durationMs: CELEBRATION_DURATION_MS,
        boardWidth: boardWidthValue,
        boardHeight: boardHeightValue,
        cards: shuffleCelebrationCards(cards),
      })
    },
    [
      boardLayout.height,
      boardLayout.width,
      computeCelebrationCardBase,
      updateBoardLocked,
    ]
  )

  const celebrationLabel = useMemo(() => {
    if (!developerModeEnabled || !celebrationState) {
      return null
    }
    const metadata = getCelebrationModeMetadata(celebrationState.modeId)
    const padded = (metadata.id + 1).toString().padStart(2, '0')
    return `Celebration ${padded} · ${metadata.name}`
  }, [celebrationState, developerModeEnabled])

  const celebrationQueuedThisRender =
    animationsEnabled &&
    celebrationAnimationsEnabled &&
    !celebrationState &&
    !pendingCelebrationActiveRef.current &&
    state.winCelebrations > winCelebrationsRef.current
  // The queue effect runs after paint. Treat the exact winning render as pending too,
  // otherwise win-cleanup visuals can flash on for one frame before the effect catches up.
  const effectiveCelebrationPending = celebrationPending || celebrationQueuedThisRender

  useEffect(() => {
    const currentTopCardIds = buildFoundationTopCardIds(state.foundations)
    const previousTopCardIds = previousFoundationTopCardIdsRef.current

    if (
      animationsEnabled &&
      celebrationAnimationsEnabled &&
      state.winCelebrations > winCelebrationsRef.current
    ) {
      winCelebrationsRef.current = state.winCelebrations
      devLog('info', '[Game] Foundations complete, player won the game.')
      devLog('log', '[Game] Celebration triggered', {
        celebrations: state.winCelebrations,
      })

      if (!celebrationState && !pendingCelebrationActiveRef.current) {
        const winningCardId = findWinningTopCardId(previousTopCardIds, currentTopCardIds)
        const celebrationHandoffDelayMs = foundationGlowEnabled
          ? WIN_CELEBRATION_HANDOFF_DELAY_MS
          : CARD_ANIMATION_DURATION_MS
        const queuedAt = Date.now()

        // Task 28-2: Keep the winning-card handoff light on the exact win frame; build the full celebration state later.
        pendingCelebrationActiveRef.current = true
        pendingCelebrationQueuedAtRef.current = queuedAt
        pendingWinningCardIdRef.current = winningCardId
        pendingWinningCardSettledRef.current = false
        setCelebrationPending(true)
        updateBoardLocked(true)

        logCelebrationHandoff('queued', {
          ts: queuedAt,
          celebrations: state.winCelebrations,
          winningCardId,
          celebrationHandoffDelayMs,
        })
        logCelebrationHandoff('winning_card_selected', {
          ts: queuedAt,
          previousTopCardIds,
          currentTopCardIds,
          winningCardId,
        })

        scheduleCelebrationFallback(celebrationHandoffDelayMs)
      }
    }

    previousFoundationTopCardIdsRef.current = currentTopCardIds
  }, [
    animationsEnabled,
    celebrationAnimationsEnabled,
    celebrationState,
    foundationGlowEnabled,
    logCelebrationHandoff,
    scheduleCelebrationFallback,
    state.foundations,
    state.winCelebrations,
    updateBoardLocked,
    winCelebrationsRef,
  ])

  return {
    celebrationState,
    celebrationPending: effectiveCelebrationPending,
    setCelebrationState,
    celebrationBindings,
    celebrationLabel,
    cycleCelebrationMode,
    startCelebrationPreview,
    handleCelebrationAbort,
    handleWinningCardFlightSettled,
    clearCelebrationDialogTimer,
  }
}
