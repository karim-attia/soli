import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'

import { devLog, setDeveloperLoggingEnabled } from '../utils/devLogger'

export type ThemeMode = 'auto' | 'light' | 'dark'

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
  themeMode: ThemeMode
  shareSolvedGames: boolean
  solvableGamesOnly: boolean
  developerMode: boolean
  statistics: StatisticsPreferences
}

type SettingsContextValue = {
  state: SettingsState
  hydrated: boolean
  setThemeMode: (mode: ThemeMode) => void
  setGlobalAnimationsEnabled: (enabled: boolean) => void
  setAnimationPreference: (key: AnimationPreferenceKey, enabled: boolean) => void
  setShareSolvedGames: (enabled: boolean) => void
  setSolvableGamesOnly: (enabled: boolean) => void
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
  themeMode: 'auto',
  shareSolvedGames: false,
  solvableGamesOnly: true,
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

export const SettingsProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState<SettingsState>(DEFAULT_SETTINGS)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    let cancelled = false

    ;(async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY)
        if (stored && !cancelled) {
          const parsed = JSON.parse(stored) as Partial<SettingsState>
          setState((previous) => mergeSettings(previous, parsed))
        }
      } catch (error) {
        devLog('warn', '[settings] Failed to load persisted settings', error)
      } finally {
        if (!cancelled) {
          setHydrated(true)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((error) => {
      devLog('warn', '[settings] Failed to persist settings', error)
    })
  }, [hydrated, state])

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setState((previous) => (previous.themeMode === mode ? previous : { ...previous, themeMode: mode }))
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
          },
    )
  }, [])

  const setAnimationPreference = useCallback((key: AnimationPreferenceKey, enabled: boolean) => {
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
  }, [])

  const setShareSolvedGames = useCallback((enabled: boolean) => {
    setState((previous) =>
      previous.shareSolvedGames === enabled ? previous : { ...previous, shareSolvedGames: enabled },
    )
  }, [])

  const setSolvableGamesOnly = useCallback((enabled: boolean) => {
    setState((previous) =>
      previous.solvableGamesOnly === enabled ? previous : { ...previous, solvableGamesOnly: enabled },
    )
  }, [])

  const setDeveloperMode = useCallback((enabled: boolean) => {
    setDeveloperLoggingEnabled(enabled)
    setState((previous) =>
      previous.developerMode === enabled ? previous : { ...previous, developerMode: enabled },
    )
  }, [])

  const setStatisticsPreference = useCallback((key: StatisticsPreferenceKey, enabled: boolean) => {
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
  }, [])

  useEffect(() => {
    setDeveloperLoggingEnabled(hydrated ? state.developerMode : false)
  }, [hydrated, state.developerMode])

  const value = useMemo<SettingsContextValue>(
    () => ({
      state,
      hydrated,
      setThemeMode,
      setGlobalAnimationsEnabled,
      setAnimationPreference,
      setShareSolvedGames,
      setSolvableGamesOnly,
      setDeveloperMode,
      setStatisticsPreference,
    }),
    [
      hydrated,
      setAnimationPreference,
      setGlobalAnimationsEnabled,
      setStatisticsPreference,
      setShareSolvedGames,
      setSolvableGamesOnly,
      setThemeMode,
      setDeveloperMode,
      state,
    ],
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

const mergeSettings = (current: SettingsState, incoming?: Partial<SettingsState>): SettingsState => {
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
        current.animations.invalidMoveWiggle,
      ),
      cardFlip: getBoolean(animations.cardFlip, current.animations.cardFlip),
      foundationGlow: getBoolean(animations.foundationGlow, current.animations.foundationGlow),
      celebrations: getBoolean(animations.celebrations, current.animations.celebrations),
    },
    themeMode: isThemeMode(incoming.themeMode) ? incoming.themeMode : current.themeMode,
    shareSolvedGames: getBoolean(incoming.shareSolvedGames, current.shareSolvedGames),
    solvableGamesOnly: getBoolean(incoming.solvableGamesOnly, current.solvableGamesOnly),
    developerMode: getBoolean(incoming.developerMode, current.developerMode),
    statistics: {
      showMoves: getBoolean(statistics.showMoves, current.statistics.showMoves),
      showTime: getBoolean(statistics.showTime, current.statistics.showTime),
    },
  }
}

const getBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'auto' || value === 'light' || value === 'dark'
