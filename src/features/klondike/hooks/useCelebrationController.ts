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
  CELEBRATION_MODE_COUNT,
  type CelebrationAssignment,
  getCelebrationModeMetadata,
} from '../../../animation/celebrationModes'
import { FOUNDATION_SUIT_ORDER } from '../../../solitaire/klondike'
import { useAnimationToggles } from '../../../state/settings'
import type { Card, GameState, Suit } from '../../../solitaire/klondike'
import { devLog } from '../../../utils/devLogger'
import {
  CARD_ANIMATION_DURATION_MS,
  FOUNDATION_FALLBACK_GAP,
  WIN_CELEBRATION_HANDOFF_DELAY_MS,
} from '../constants'
import type { CelebrationBindings, CardMetrics } from '../types'

export type CelebrationCardConfig = {
  card: Card
  suit: Suit
  suitIndex: number
  stackIndex: number
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
  ensureCardFlightsReady: () => void
  updateBoardLocked: (locked: boolean) => void
  winCelebrationsRef: React.MutableRefObject<number>
  requestNewGameRef: React.MutableRefObject<
    ((options?: { reason?: 'manual' | 'celebration' }) => void) | null
  >
}

const CELEBRATION_DIALOG_DELAY_MS = 30_000

export const useCelebrationController = ({
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
}: UseCelebrationControllerParams) => {
  const [celebrationState, setCelebrationState] = useState<CelebrationState | null>(null)
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
  const celebrationDialogTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const celebrationDialogShownRef = useRef(false)
  const celebrationStartTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingCelebrationStateRef = useRef<CelebrationState | null>(null)
  const { foundationGlow: foundationGlowEnabled } = useAnimationToggles()

  const celebrationBindings = useMemo<CelebrationBindings>(
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

  const buildCelebrationState = useCallback((): CelebrationState | null => {
    const boardWidthValue = boardLayout.width ?? 0
    const boardHeightValue = boardLayout.height ?? 0

    if (!boardWidthValue || !boardHeightValue) {
      return null
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
      return null
    }

    const shuffledCards = [...cards].sort(() => Math.random() - 0.5)
    const modeId = Math.floor(Math.random() * CELEBRATION_MODE_COUNT)

    return {
      modeId,
      durationMs: CELEBRATION_DURATION_MS,
      boardWidth: boardWidthValue,
      boardHeight: boardHeightValue,
      cards: shuffledCards,
    }
  }, [
    boardLayout.height,
    boardLayout.width,
    cardMetrics.height,
    cardMetrics.width,
    foundationLayoutsRef,
    state.foundations,
    topRowLayoutRef,
  ])

  const startPendingCelebration = useCallback(() => {
    const pendingCelebration = pendingCelebrationStateRef.current
    if (!pendingCelebration) {
      return
    }

    pendingCelebrationStateRef.current = null
    clearCelebrationStartTimer()
    ensureCardFlightsReady()
    setCelebrationState((current) => current ?? pendingCelebration)
  }, [clearCelebrationStartTimer, ensureCardFlightsReady])

  const clearCelebrationAnimations = useCallback(() => {
    celebrationAbortRef.current = false
    celebrationDialogShownRef.current = false
    pendingCelebrationStateRef.current = null
    celebrationAssignments.value = {}
    celebrationTotal.value = 0
    celebrationMode.value = 0
    celebrationBoard.value = { width: 0, height: 0 }
    runOnUI(() => {
      'worklet'
      celebrationActive.value = 0
      cancelAnimation(celebrationProgress)
    })()
    clearCelebrationStartTimer()
    clearCelebrationDialogTimer()
  }, [
    celebrationActive,
    celebrationAssignments,
    celebrationBoard,
    celebrationMode,
    celebrationProgress,
    celebrationTotal,
    clearCelebrationStartTimer,
    clearCelebrationDialogTimer,
  ])

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
      clearCelebrationAnimations()
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
        }
      )
    })()

    celebrationDialogTimeoutRef.current = setTimeout(
      openCelebrationDialog,
      CELEBRATION_DIALOG_DELAY_MS
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
    clearCelebrationAnimations,
    clearCelebrationDialogTimer,
    handleCelebrationComplete,
    openCelebrationDialog,
  ])

  const celebrationLabel = useMemo(() => {
    if (!developerModeEnabled || !celebrationState) {
      return null
    }
    const metadata = getCelebrationModeMetadata(celebrationState.modeId)
    const modeNumber = metadata ? metadata.id + 1 : celebrationState.modeId + 1
    const padded = modeNumber.toString().padStart(2, '0')
    return `Celebration ${padded} · ${metadata?.name ?? 'Unknown'}`
  }, [celebrationState, developerModeEnabled])

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

    if (celebrationState || pendingCelebrationStateRef.current) {
      return
    }

    const nextCelebrationState = buildCelebrationState()
    if (!nextCelebrationState) {
      return
    }

    const celebrationHandoffDelayMs = foundationGlowEnabled
      ? WIN_CELEBRATION_HANDOFF_DELAY_MS
      : CARD_ANIMATION_DURATION_MS

    // Task 28-2: Let the last winning move flight/glow finish before celebration motion starts.
    pendingCelebrationStateRef.current = nextCelebrationState
    updateBoardLocked(true)
    clearCelebrationStartTimer()
    celebrationStartTimeoutRef.current = setTimeout(() => {
      celebrationStartTimeoutRef.current = null
      startPendingCelebration()
    }, celebrationHandoffDelayMs)
  }, [
    animationsEnabled,
    buildCelebrationState,
    celebrationState,
    celebrationAnimationsEnabled,
    clearCelebrationStartTimer,
    foundationGlowEnabled,
    state.winCelebrations,
    startPendingCelebration,
    updateBoardLocked,
    winCelebrationsRef,
  ])

  return {
    celebrationState,
    setCelebrationState,
    celebrationBindings,
    celebrationLabel,
    handleCelebrationAbort,
    handleCelebrationComplete,
    clearCelebrationDialogTimer,
  }
}
