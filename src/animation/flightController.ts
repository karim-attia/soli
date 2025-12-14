import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { SharedValue } from 'react-native-reanimated'
import { useSharedValue } from 'react-native-reanimated'

import type { GameAction, Selection } from '../solitaire/klondike'
import { devLog, getDeveloperLoggingEnabled } from '../utils/devLogger'

export type CardFlightSnapshot = {
  pageX: number
  pageY: number
  width: number
  height: number
}

type DispatchFn = (action: GameAction) => void

type SelectionResolver = (selection?: Selection | null) => string[]

type FlightControllerOptions = {
  enabled: boolean
  waitTimeoutMs: number
  getSelectionCardIds: SelectionResolver
}

type DispatchArgs = {
  action: GameAction
  selection?: Selection | null
  cardIds?: string[]
  dispatch: DispatchFn
}

export type FlightController = {
  cardFlights: SharedValue<Record<string, CardFlightSnapshot>>
  cardFlightMemoryRef: React.MutableRefObject<Record<string, CardFlightSnapshot>>
  registerSnapshot: (cardId: string, snapshot: CardFlightSnapshot) => void
  ensureReady: () => void
  reset: () => void
  dispatchWithFlight: (args: DispatchArgs) => void
}

const isValidSnapshot = (snapshot: CardFlightSnapshot): boolean => {
  return (
    Number.isFinite(snapshot.pageX) &&
    Number.isFinite(snapshot.pageY) &&
    Number.isFinite(snapshot.width) &&
    Number.isFinite(snapshot.height) &&
    snapshot.width > 0 &&
    snapshot.height > 0
  )
}

const describeSelection = (selection: Selection | null | undefined): string => {
  if (!selection) {
    return 'none'
  }
  const typed: any = selection
  switch (typed.source) {
    case 'tableau':
      return `tableau:${typed.columnIndex ?? '?'}#${typed.cardIndex ?? '?'}`
    case 'waste':
      return 'waste:top'
    case 'foundation':
      return `foundation:${typed.suit ?? '?'}`
    default:
      return typed.source
  }
}

const describeTarget = (action: GameAction): string => {
  switch (action.type) {
    case 'APPLY_MOVE':
      return action.target.type === 'foundation'
        ? `foundation:${action.target.suit}`
        : `tableau:${action.target.columnIndex}`
    case 'PLACE_ON_FOUNDATION':
      return `foundation:${action.suit}`
    case 'PLACE_ON_TABLEAU':
      return `tableau:${action.columnIndex}`
    case 'DRAW_OR_RECYCLE':
      return 'stock→waste'
    case 'UNDO':
      return 'undo'
    case 'SCRUB_TO_INDEX':
      return `scrub:${action.index}`
    case 'ADVANCE_AUTO_QUEUE':
      return 'auto-queue'
    default:
      return action.type
  }
}


export const useFlightController = (options: FlightControllerOptions): FlightController => {
  const cardFlights = useSharedValue<Record<string, CardFlightSnapshot>>({})
  const memoryRef = useRef<Record<string, CardFlightSnapshot>>({})
  const invalidSnapshotLoggedRef = useRef<Set<string>>(new Set())
  const enabledRef = useRef<boolean>(options.enabled)
  const waitTimeoutRef = useRef<number>(options.waitTimeoutMs)
  const selectionResolverRef = useRef<SelectionResolver>(options.getSelectionCardIds)

  useEffect(() => {
    enabledRef.current = options.enabled
  }, [options.enabled])

  useEffect(() => {
    waitTimeoutRef.current = options.waitTimeoutMs
  }, [options.waitTimeoutMs])

  useEffect(() => {
    selectionResolverRef.current = options.getSelectionCardIds
  }, [options.getSelectionCardIds])

  const registerSnapshot = useCallback((cardId: string, snapshot: CardFlightSnapshot) => {
    // PBI-14-4: Defensive guard against invalid LayoutMetrics snapshots entering controller memory.
    if (!isValidSnapshot(snapshot)) {
      if (getDeveloperLoggingEnabled() && !invalidSnapshotLoggedRef.current.has(cardId)) {
        invalidSnapshotLoggedRef.current.add(cardId)
        devLog('warn', '[Flight] Ignoring invalid snapshot', { cardId, snapshot })
      }
      return
    }
    memoryRef.current[cardId] = snapshot
  }, [])

  const ensureReady = useCallback(() => {
    if (!enabledRef.current) {
      return
    }
    const memory = memoryRef.current
    if (!Object.keys(memory).length) {
      return
    }
    cardFlights.value = {
      ...cardFlights.value,
      ...memory,
    }
  }, [cardFlights])

  const reset = useCallback(() => {
    memoryRef.current = {}
    cardFlights.value = {}
  }, [cardFlights])

  const dispatchWithFlight = useCallback(
    ({ action, selection, cardIds, dispatch }: DispatchArgs) => {
      const resolver = selectionResolverRef.current
      const cards = cardIds ?? (resolver ? resolver(selection) : [])
      const selectionLabel = describeSelection(selection)
      const targetLabel = describeTarget(action)

      if (!enabledRef.current) {
        ensureReady()
        dispatch(action)
        return
      }

      const waitStart = Date.now()
      const attemptDispatch = () => {
        const snapshotsReady = cards.length === 0 || cards.every((id) => !!memoryRef.current[id])
        const elapsed = Date.now() - waitStart
        if (snapshotsReady || elapsed >= waitTimeoutRef.current) {
          ensureReady()
          dispatch(action)
          return
        }
        requestAnimationFrame(attemptDispatch)
      }

      attemptDispatch()
    },
    [ensureReady],
  )

  return useMemo(
    () => ({
      cardFlights,
      cardFlightMemoryRef: memoryRef,
      registerSnapshot,
      ensureReady,
      reset,
      dispatchWithFlight,
    }),
    [cardFlights, dispatchWithFlight, ensureReady, registerSnapshot],
  )
}

