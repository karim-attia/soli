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

// Warning model (hints plan, F14, 2026-07-24): ONE select instead of the two
// F11 warning toggles. The two warnings are a strictness ladder (the classic
// stuck warning is already solver-confirmed; the unwinnable warning is a
// strict superset that fires earlier), so independent booleans misled — user
// feedback 2026-07-24. 'noUsefulMoves' is the genre-norm default.
export const WARNING_MODES = ['off', 'noUsefulMoves', 'unwinnable'] as const
export type WarningMode = (typeof WARNING_MODES)[number]

type HintPreferences = {
  // - 'off': never warn proactively.
  // - 'noUsefulMoves': classic Microsoft-style warning at the fruitless
  //   recycle-flip (heuristic + solver confirmation).
  // - 'unwinnable': solver-proven "can't be won anymore" the moment it
  //   happens — changes how the game plays (you undo the moment it appears).
  warningMode: WarningMode
  hintButton: boolean
  // Rewind to the last winnable move (rewind-to-winnable plan). Lives in the
  // hints group because it is solver-powered and only ever surfaces once a
  // warning has already said the game is lost — with warnings off it can never
  // fire. Default OFF: it is a strong assist (it hands the player the exact
  // move where the game died), so it stays opt-in like the Hint button.
  rewindToWinnable: boolean
}

export type SettingsState = {
  animations: AnimationPreferences
  drawCount: DrawCount
  solvableGamesOnly: boolean
  autoUpEnabled: boolean
  hints: HintPreferences
  developerMode: boolean
  statistics: StatisticsPreferences
}

type SettingsContextValue = {
  state: SettingsState
  setDrawCount: (drawCount: DrawCount) => void
  setGlobalAnimationsEnabled: (enabled: boolean) => void
  setAnimationPreference: (key: AnimationPreferenceKey, enabled: boolean) => void
  setSolvableGamesOnly: (enabled: boolean) => void
  setAutoUpEnabled: (enabled: boolean) => void
  // Functional updates supported because the ?set= deep-link aliases resolve
  // relative to the current mode (see resolveWarningLinkUpdate in
  // useDemoGameLauncher).
  setWarningMode: (mode: WarningMode | ((current: WarningMode) => WarningMode)) => void
  setHintButtonEnabled: (enabled: boolean) => void
  setRewindToWinnableEnabled: (enabled: boolean) => void
  setDeveloperMode: (enabled: boolean) => void
  setStatisticsPreference: (key: StatisticsPreferenceKey, enabled: boolean) => void
}

// Renamed from '@soli/settings/v1' at the 1.0 reset — the `@` was an AsyncStorage-era
// relic; all kv keys now share the plain `soli/...` prefix. No dual-read fallback:
// only pre-release test devices lose (re-defaultable) settings once.
const STORAGE_KEY = 'soli/settings/v1'

// Exported for unit tests (defaults + legacy-key migration coverage).
export const DEFAULT_SETTINGS: SettingsState = {
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
  solvableGamesOnly: true,
  autoUpEnabled: true,
  hints: {
    warningMode: 'noUsefulMoves',
    hintButton: false,
    rewindToWinnable: false,
  },
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

// Settings-screen copy for the hint/warning features. Unlike the animation/
// statistics descriptors (whose descriptions are currently unrendered), these
// ARE shown as row subtitles — both features change gameplay in ways the
// labels alone can't carry (user feedback 2026-07-23).
export const hintButtonPreference = {
  label: 'Hint button',
  description: 'Show a Hint button that reveals the next move.',
}

export const rewindToWinnablePreference = {
  label: 'Rewind to winnable',
  // Says WHEN it appears, because the row is otherwise mysterious: with
  // warnings off the action can never show up.
  description:
    "When a warning says the game is lost, offer a jump back to the last move you could still win from.",
}

export const warningModePreference: {
  label: string
  description: string
  options: Array<{ value: WarningMode; label: string }>
} = {
  label: 'Warnings',
  // One line explaining the strictness ladder between the two modes.
  description:
    "Warn when you run out of useful moves, or as soon as the game can't be won anymore.",
  options: [
    { value: 'off', label: 'Off' },
    { value: 'noUsefulMoves', label: 'No more useful moves' },
    { value: 'unwinnable', label: 'Unwinnable game' },
  ],
}

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

  const setWarningMode = useCallback(
    (mode: WarningMode | ((current: WarningMode) => WarningMode)) => {
      setState((previous) => {
        const next =
          typeof mode === 'function' ? mode(previous.hints.warningMode) : mode
        return previous.hints.warningMode === next
          ? previous
          : { ...previous, hints: { ...previous.hints, warningMode: next } }
      })
    },
    []
  )

  const setHintButtonEnabled = useCallback((enabled: boolean) => {
    setState((previous) =>
      previous.hints.hintButton === enabled
        ? previous
        : { ...previous, hints: { ...previous.hints, hintButton: enabled } }
    )
  }, [])

  const setRewindToWinnableEnabled = useCallback((enabled: boolean) => {
    setState((previous) =>
      previous.hints.rewindToWinnable === enabled
        ? previous
        : { ...previous, hints: { ...previous.hints, rewindToWinnable: enabled } }
    )
  }, [])

  // Developer logging is synced by the state.developerMode effect below (which also
  // covers the hydrated-from-storage value), so no direct call here.
  const setDeveloperMode = useCallback((enabled: boolean) => {
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
      setSolvableGamesOnly,
      setAutoUpEnabled,
      setWarningMode,
      setHintButtonEnabled,
      setRewindToWinnableEnabled,
      setDeveloperMode,
      setStatisticsPreference,
    }),
    [
      setAnimationPreference,
      setGlobalAnimationsEnabled,
      setStatisticsPreference,
      setAutoUpEnabled,
      setWarningMode,
      setHintButtonEnabled,
      setRewindToWinnableEnabled,
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

// Exported for unit tests (defaults + migration assertions run on the pure
// merge, not through the provider).
export const mergeSettings = (
  current: SettingsState,
  incoming?: Partial<SettingsState>
): SettingsState => {
  if (!incoming) {
    return current
  }

  const animations: Partial<AnimationPreferences> = incoming.animations ?? {}
  const statistics: Partial<StatisticsPreferences> = incoming.statistics ?? {}
  // Round-2 (F11) payloads stored two warning booleans where F14's single
  // warningMode now lives; the cast surfaces them for the migration below.
  const hints: Partial<HintPreferences> & {
    stuckWarning?: unknown
    unwinnableWarning?: unknown
  } = incoming.hints ?? {}
  // Legacy migration (F11, 2026-07-23): the removed single `hintsEnabled`
  // gated the Hint button AND the unwinnable warning, so a stored true maps to
  // both features once. Read straight off the parsed payload during the merge
  // (cheapest possible migration — population is one dev device); the next
  // settings write persists the new shape and the stale key simply stops
  // being read. Explicit newer-shape values always win below.
  const legacyHintsEnabled = getBoolean(
    (incoming as { hintsEnabled?: unknown }).hintsEnabled,
    false
  )

  // Warning-mode migration chain (F14, 2026-07-24) — newest shape wins:
  //   1. explicit `hints.warningMode` (current shape, validated against the
  //      union — junk strings fall through);
  //   2. round-2 booleans {stuckWarning, unwinnableWarning} (F11 shape):
  //      unwinnable=true → 'unwinnable'; else stuck=true → 'noUsefulMoves';
  //      both false → 'off'. Keys absent from a partial payload resolve to
  //      their F11 defaults (stuck ON, unwinnable OFF) so the ladder lands
  //      faithfully;
  //   3. pre-F11 `hintsEnabled:true` (single toggle) mapped to button +
  //      unwinnable warning in F11, so it feeds step 2's unwinnable input and
  //      lands on 'unwinnable' — the even-older chain still resolves right;
  //   4. nothing hint-related stored → keep current (default 'noUsefulMoves').
  const warningMode: WarningMode = (() => {
    const explicit = parseWarningMode(hints.warningMode)
    if (explicit) {
      return explicit
    }
    const hasLegacyWarningKeys =
      typeof hints.stuckWarning === 'boolean' ||
      typeof hints.unwinnableWarning === 'boolean'
    if (!hasLegacyWarningKeys && !legacyHintsEnabled) {
      return current.hints.warningMode
    }
    if (getBoolean(hints.unwinnableWarning, legacyHintsEnabled)) {
      return 'unwinnable'
    }
    return getBoolean(hints.stuckWarning, true) ? 'noUsefulMoves' : 'off'
  })()

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
    solvableGamesOnly: getBoolean(incoming.solvableGamesOnly, current.solvableGamesOnly),
    autoUpEnabled: getBoolean(incoming.autoUpEnabled, current.autoUpEnabled),
    hints: {
      warningMode,
      hintButton: getBoolean(
        hints.hintButton,
        legacyHintsEnabled || current.hints.hintButton
      ),
      // No migration chain: the toggle is new, so any payload written before it
      // existed simply has no key and falls back to the (off) default. It is
      // deliberately NOT wired to legacyHintsEnabled — that key predates the
      // feature and never meant "rewind me".
      rewindToWinnable: getBoolean(
        hints.rewindToWinnable,
        current.hints.rewindToWinnable
      ),
    },
    developerMode: getBoolean(incoming.developerMode, current.developerMode),
    statistics: {
      showMoves: getBoolean(statistics.showMoves, current.statistics.showMoves),
      showTime: getBoolean(statistics.showTime, current.statistics.showTime),
    },
  }
}

const getBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback

const parseWarningMode = (value: unknown): WarningMode | null =>
  typeof value === 'string' && (WARNING_MODES as readonly string[]).includes(value)
    ? (value as WarningMode)
    : null
