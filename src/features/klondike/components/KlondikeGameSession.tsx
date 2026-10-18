import { useEffect } from 'react'

import {
  type LaunchDemoGameOptions,
  type RequestNewGameFn,
  type RequestPlayDealFn,
  useKlondikeGame,
} from '../hooks/useKlondikeGame'
import { setSessionControls } from '../state/sessionControlsStore'
import { KlondikeGameView } from './KlondikeGameView'

export type KlondikeGameSessionControls = {
  developerModeEnabled: boolean
  requestNewGame: RequestNewGameFn
  requestPlayDeal: RequestPlayDealFn
  handleLaunchDemoGame: (options?: LaunchDemoGameOptions) => void
  resetUndoHintForTesting: () => void
  seedHistoryForTesting: (action: 'seed' | 'clear') => void
  startCelebrationPreview: (modeId?: number) => void
}

// Publishes its controls into sessionControlsStore (read by the game screen's header
// AND the History tab's Retry button) instead of an onControlsChange prop — see the
// store for the reasoning.
export const KlondikeGameSession = () => {
  const {
    developerModeEnabled,
    requestNewGame,
    requestPlayDeal,
    handleLaunchDemoGame,
    resetUndoHintForTesting,
    seedHistoryForTesting,
    startCelebrationPreview,
    viewProps,
  } = useKlondikeGame()

  useEffect(() => {
    setSessionControls({
      developerModeEnabled,
      requestNewGame,
      requestPlayDeal,
      handleLaunchDemoGame,
      resetUndoHintForTesting,
      seedHistoryForTesting,
      startCelebrationPreview,
    })

    return () => {
      setSessionControls(null)
    }
  }, [
    developerModeEnabled,
    handleLaunchDemoGame,
    requestNewGame,
    requestPlayDeal,
    resetUndoHintForTesting,
    seedHistoryForTesting,
    startCelebrationPreview,
  ])

  return <KlondikeGameView {...viewProps} />
}
