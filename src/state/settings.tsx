// Storage engine: expo-sqlite/kv-store (AsyncStorage-compatible API, backed by SQLite).
import Storage from 'expo-sqlite/kv-store'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'

import {
  DEFAULT_DRAW_COUNT,
  normalizeDrawCount,
  type DrawCount,
} from '../solitaire/drawCount'
import { devLog, setDeveloperLoggingEnabled } from '../utils/devLogger'

type AnimationPreferences = {
  master: boolean
  cardFlights: boolean
  wasteFan: boolean
  invalidMoveWiggle: boolean
  cardFlip: boolean
  foundationGlow: boolean
  celebrations: boolean
}

export type AnimationPreferenceKey = Exclude<keyof AnimationPreferences, 'master'>

type StatisticsPreferences = {
  showMoves: boolean
  showTime: boolean
}

export type StatisticsPreferenceKey = keyof StatisticsPreferences

export type SettingsState = {
  animations: AnimationPreferences
  drawCount: DrawCount
  shareSolvedGames: boolean
  solvableGamesOnly: boolean
  autoUpEnabled: boolean
  developerMode: boolean
  statistics: StatisticsPreferences
}

type SettingsContextValue = {
  state: SettingsState
  setDrawCount: (drawCount: DrawCount) => void
  setGlobalAnimationsEnabled: (enabled: boolean) => void
  setAnimationPreference: (key: AnimationPreferenceKey, enabled: boolean) => void
  setShareSolvedGames: (enabled: boolean) => void
  setSolvableGamesOnly: (enabled: boolean) => void
  setAutoUpEnabled: (enabled: boolean) => void
  setDeveloperMode: (enabled: boolean) => void
  setStatisticsPreference: (key: StatisticsPreferenceKey, enabled: boolean) => void
}

const STORAGE_KEY = '@soli/settings/v1'

const DEFAULT_SETTINGS: SettingsState = {
  animations: {
    master: true,
    cardFlights: true,
    wasteFan: true,
    invalidMoveWiggle: true,
    cardFlip: true,
    foundationGlow: true,
    celebrations: true,
  },
  drawCount: DEFAULT_DRAW_COUNT,
  shareSolvedGames: false,
  solvableGamesOnly: true,
  autoUpEnabled: true,
  developerMode: false,
  statistics: {
    showMoves: true,
    showTime: true,
  },
}

export const animationPreferenceDescriptors: Array<{
  key: AnimationPreferenceKey
  label: string
  description: string
}> = [
  {
    key: 'cardFlights',
    label: 'Card flights',
    description: 'Animate cards flying between tableau, waste, and foundations.',
  },
  {
    key: 'wasteFan',
    label: 'Waste fan slide',
    description: 'Slide the waste stack as new cards are drawn.',
  },
  {
    key: 'invalidMoveWiggle',
    label: 'Invalid move wiggle',
    description: 'Give feedback when a move is blocked.',
  },
  {
    key: 'cardFlip',
    label: 'Card flips',
    description: 'Flip facedown cards face up with an animated reveal.',
  },
  {
    key: 'foundationGlow',
    label: 'Foundation glow',
    description: 'Highlight foundations briefly when cards land.',
  },
  {
    key: 'celebrations',
    label: 'Win celebrations',
    description: 'Play the victory sequence after completing a game.',
  },
]

export const statisticsPreferenceDescriptors: Array<{
  key: StatisticsPreferenceKey
  label: string
  description: string
}> = [
  {
    key: 'showMoves',
    label: 'Move counter',
    description: 'Display how many moves you have taken this game.',
  },
  {
    key: 'showTime',
    label: 'Game timer',
    description: 'Track elapsed time, starting after your first move.',
  },
]

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined)

// Sync read is intentional: settings are ~400 B read once at startup, so getItemSync
// is effectively free. Hydrating in the useState initializer removes the old async
// `hydrated` flag and all downstream gating (useKlondikePersistence/useKlondikeGame).
const readPersistedSettings = (): SettingsState => {
  try {
    const stored = Storage.getItemSync(STORAGE_KEY)
    if (stored) {
      return mergeSettings(DEFAULT_SETTINGS, JSON.parse(stored) as Partial<SettingsState>)
    }
  } catch (error) {
    devLog('warn', '[settings] Failed to load persisted settings', error)
  }
  return DEFAULT_SETTINGS
}

export const SettingsProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<SettingsState>(readPersistedSettings)
  const skipInitialWriteRef = useRef(true)

  useEffect(() => {
    // Skip the mount run: state was just read from storage, no need to write it back.
    if (skipInitialWriteRef.current) {
      skipInitialWriteRef.current = false
      return
    }

    // Writes stay async to keep the JS thread free; the payload is tiny either way.
    Storage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((error) => {
      devLog('warn', '[settings] Failed to persist settings', error)
    })
  }, [state])

  const setDrawCount = useCallback((drawCount: DrawCount) => {
    setState((previous) =>
      previous.drawCount === drawCount ? previous : { ...previous, drawCount }
    )
  }, [])

  const setGlobalAnimationsEnabled = useCallback((enabled: boolean) => {
    setState((previous) =>
      previous.animations.master === enabled
        ? previous
        : {
            ...previous,
            animations: {
              ...previous.animations,
              master: enabled,
            },
          }
    )
  }, [])

  const setAnimationPreference = useCallback(
    (key: AnimationPreferenceKey, enabled: boolean) => {
      setState((previous) => {
        // If enabling an animation while master is off, turn on master first
        if (enabled && !previous.animations.master) {
          return {
            ...previous,
            animations: {
              ...previous.animations,
              master: true,
              [key]: enabled,
            },
          }
        }

        // If disabling an animation, just update that preference
        if (previous.animations[key] === enabled) {
          return previous
        }

        return {
          ...previous,
          animations: {
            ...previous.animations,
            [key]: enabled,
          },
        }
      })
    },
    []
  )

  const setShareSolvedGames = useCallback((enabled: boolean) => {
    setState((previous) =>
      previous.shareSolvedGames === enabled
        ? previous
        : { ...previous, shareSolvedGames: enabled }
    )
  }, [])

  const setSolvableGamesOnly = useCallback((enabled: boolean) => {
    setState((previous) =>
      previous.solvableGamesOnly === enabled
        ? previous
        : { ...previous, solvableGamesOnly: enabled }
    )
  }, [])

  const setAutoUpEnabled = useCallback((enabled: boolean) => {
    setState((previous) =>
      previous.autoUpEnabled === enabled
        ? previous
        : { ...previous, autoUpEnabled: enabled }
    )
  }, [])

  const setDeveloperMode = useCallback((enabled: boolean) => {
    setDeveloperLoggingEnabled(enabled)
    setState((previous) =>
      previous.developerMode === enabled
        ? previous
        : { ...previous, developerMode: enabled }
    )
  }, [])

  const setStatisticsPreference = useCallback(
    (key: StatisticsPreferenceKey, enabled: boolean) => {
      setState((previous) => {
        if (previous.statistics[key] === enabled) {
          return previous
        }

        return {
          ...previous,
          statistics: {
            ...previous.statistics,
            [key]: enabled,
          },
        }
      })
    },
    []
  )

  useEffect(() => {
    setDeveloperLoggingEnabled(state.developerMode)
  }, [state.developerMode])

  const value = useMemo<SettingsContextValue>(
    () => ({
      state,
      setDrawCount,
      setGlobalAnimationsEnabled,
      setAnimationPreference,
      setShareSolvedGames,
      setSolvableGamesOnly,
      setAutoUpEnabled,
      setDeveloperMode,
      setStatisticsPreference,
    }),
    [
      setAnimationPreference,
      setGlobalAnimationsEnabled,
      setStatisticsPreference,
      setAutoUpEnabled,
      setShareSolvedGames,
      setSolvableGamesOnly,
      setDrawCount,
      setDeveloperMode,
      state,
    ]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}

export function useAnimationToggles(): AnimationPreferences {
  const {
    state: { animations },
  } = useSettings()

  return useMemo(() => {
    if (!animations.master) {
      return {
        ...animations,
        cardFlights: false,
        wasteFan: false,
        invalidMoveWiggle: false,
        cardFlip: false,
        foundationGlow: false,
        celebrations: false,
      }
    }

    return animations
  }, [animations])
}

export function useStatisticsPreferences(): StatisticsPreferences {
  const {
    state: { statistics },
  } = useSettings()

  return statistics
}

const mergeSettings = (
  current: SettingsState,
  incoming?: Partial<SettingsState>
): SettingsState => {
  if (!incoming) {
    return current
  }

  const animations: Partial<AnimationPreferences> = incoming.animations ?? {}
  const statistics: Partial<StatisticsPreferences> = incoming.statistics ?? {}

  return {
    animations: {
      master: getBoolean(animations.master, current.animations.master),
      cardFlights: getBoolean(animations.cardFlights, current.animations.cardFlights),
      wasteFan: getBoolean(animations.wasteFan, current.animations.wasteFan),
      invalidMoveWiggle: getBoolean(
        animations.invalidMoveWiggle,
        current.animations.invalidMoveWiggle
      ),
      cardFlip: getBoolean(animations.cardFlip, current.animations.cardFlip),
      foundationGlow: getBoolean(
        animations.foundationGlow,
        current.animations.foundationGlow
      ),
      celebrations: getBoolean(animations.celebrations, current.animations.celebrations),
    },
    drawCount: normalizeDrawCount(incoming.drawCount),
    shareSolvedGames: getBoolean(incoming.shareSolvedGames, current.shareSolvedGames),
    solvableGamesOnly: getBoolean(incoming.solvableGamesOnly, current.solvableGamesOnly),
    autoUpEnabled: getBoolean(incoming.autoUpEnabled, current.autoUpEnabled),
    developerMode: getBoolean(incoming.developerMode, current.developerMode),
    statistics: {
      showMoves: getBoolean(statistics.showMoves, current.statistics.showMoves),
      showTime: getBoolean(statistics.showTime, current.statistics.showTime),
    },
  }
}

const getBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback
