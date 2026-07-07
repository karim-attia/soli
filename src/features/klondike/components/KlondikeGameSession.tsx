import { useEffect } from 'react'

import {
  type LaunchDemoGameOptions,
  type RequestNewGameFn,
  useKlondikeGame,
} from '../hooks/useKlondikeGame'
import { KlondikeGameView } from './KlondikeGameView'

export type KlondikeGameSessionControls = {
  developerModeEnabled: boolean
  requestNewGame: RequestNewGameFn
  handleLaunchDemoGame: (options?: LaunchDemoGameOptions) => void
  resetUndoHintForTesting: () => void
}

type KlondikeGameSessionProps = {
  onControlsChange: (controls: KlondikeGameSessionControls | null) => void
}

export const KlondikeGameSession = ({ onControlsChange }: KlondikeGameSessionProps) => {
  const {
    developerModeEnabled,
    requestNewGame,
    handleLaunchDemoGame,
    resetUndoHintForTesting,
    viewProps,
  } = useKlondikeGame()

  useEffect(() => {
    onControlsChange({
      developerModeEnabled,
      requestNewGame,
      handleLaunchDemoGame,
      resetUndoHintForTesting,
    })

    return () => {
      onControlsChange(null)
    }
  }, [
    developerModeEnabled,
    handleLaunchDemoGame,
    onControlsChange,
    requestNewGame,
    resetUndoHintForTesting,
  ])

  return <KlondikeGameView {...viewProps} />
}
