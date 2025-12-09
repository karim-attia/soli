import { useCallback } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { LayoutRectangle } from 'react-native'

import {
  createDemoGameState,
  type GameAction,
  type Selection,
  type Suit,
} from '../../../solitaire/klondike'
import { devLog } from '../../../utils/devLogger'

type DispatchWithFlightFn = (action: GameAction, selection?: Selection | null) => void

type UseDemoGameLauncherOptions = {
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
  // Task 10-6: Renamed from lastRecordedShuffleRef to track entry ID
  currentGameEntryIdRef: MutableRefObject<string | null>
  updateBoardLocked: (locked: boolean) => void
  clearGameState: () => Promise<void>
}

type LaunchOptions = {
  autoReveal?: boolean
  autoSolve?: boolean
  force?: boolean
}

export const DEMO_AUTO_STEP_INTERVAL_MS = 300

export const useDemoGameLauncher = ({
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
}: UseDemoGameLauncherOptions) => {
  const runDemoSequence = useCallback(
    (options?: { autoReveal?: boolean; autoSolve?: boolean }) => {
      const steps: Array<() => void> = []

      const pushTableauSequence = (columnIndex: number, suit: Suit, maxRank: number) => {
        for (let rank = 1; rank <= maxRank; rank += 1) {
          const selection: Selection = {
            source: 'tableau',
            columnIndex,
            cardIndex: Math.max(rank - 1, 0),
          }
          steps.push(() => {
            dispatchWithFlight(
              {
                type: 'APPLY_MOVE',
                selection,
                target: { type: 'foundation', suit },
                recordHistory: false,
              },
              selection,
            )
          })
        }
      }

      if (options?.autoReveal) {
        pushTableauSequence(0, 'clubs', 5)
        pushTableauSequence(1, 'spades', 5)
        pushTableauSequence(4, 'hearts', 5)
        pushTableauSequence(5, 'diamonds', 5)
      }

      if (options?.autoSolve) {
        pushTableauSequence(0, 'clubs', 13)
        pushTableauSequence(1, 'spades', 13)
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

      if (!steps.length) {
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
    (options?: LaunchOptions) => {
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
      currentGameEntryIdRef.current = null
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
      currentGameEntryIdRef,
      developerModeEnabled,
      dispatch,
      foundationLayoutsRef,
      recordCurrentGameResult,
      resetCardFlights,
      runDemoSequence,
      setCelebrationState,
      setDeveloperMode,
      topRowLayoutRef,
      updateBoardLocked,
      winCelebrationsRef,
    ],
  )

  return { handleLaunchDemoGame }
}


