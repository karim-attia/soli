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
  ensureReady: (cardIds?: string[]) => void
  reset: () => void
  dispatchWithFlight: (args: DispatchArgs) => void
}

export const isValidCardFlightSnapshot = (
  snapshot: CardFlightSnapshot | null | undefined
): snapshot is CardFlightSnapshot => {
  'worklet'
  return (
    !!snapshot &&
    Number.isFinite(snapshot.pageX) &&
    Number.isFinite(snapshot.pageY) &&
    Number.isFinite(snapshot.width) &&
    Number.isFinite(snapshot.height) &&
    snapshot.width > 0 &&
    snapshot.height > 0
  )
}

export const areCardFlightSnapshotsEquivalent = (
  previous: CardFlightSnapshot | null | undefined,
  next: CardFlightSnapshot | null | undefined,
  tolerance?: number
): boolean => {
  'worklet'
  const resolvedTolerance = tolerance ?? 0.5
  return (
    !!previous &&
    !!next &&
    Math.abs(previous.pageX - next.pageX) <= resolvedTolerance &&
    Math.abs(previous.pageY - next.pageY) <= resolvedTolerance &&
    Math.abs(previous.width - next.width) <= resolvedTolerance &&
    Math.abs(previous.height - next.height) <= resolvedTolerance
  )
}

export const useFlightController = (
  options: FlightControllerOptions
): FlightController => {
  const cardFlights = useSharedValue<Record<string, CardFlightSnapshot>>({})
  // Keep a JS-thread mirror for readiness checks so we don't block by reading
  // shared values from JS during draw/undo/auto-play dispatch prep.
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
    if (!isValidCardFlightSnapshot(snapshot)) {
      if (getDeveloperLoggingEnabled() && !invalidSnapshotLoggedRef.current.has(cardId)) {
        invalidSnapshotLoggedRef.current.add(cardId)
        devLog('warn', '[Flight] Ignoring invalid snapshot', { cardId, snapshot })
      }
      return
    }
    const previous = memoryRef.current[cardId]
    if (areCardFlightSnapshotsEquivalent(previous, snapshot)) {
      return
    }
    memoryRef.current[cardId] = snapshot
  }, [])

  const ensureReady = useCallback((cardIds?: string[]) => {
    if (!enabledRef.current) {
      return
    }
    const memory = memoryRef.current
    const ids = cardIds ?? Object.keys(memory)
    if (!ids.length) {
      return
    }
    const seeds = ids.reduce<Array<[string, CardFlightSnapshot]>>((accumulator, cardId) => {
      const snapshot = memory[cardId]
      if (isValidCardFlightSnapshot(snapshot)) {
        accumulator.push([cardId, snapshot])
      }
      return accumulator
    }, [])
    if (!seeds.length) {
      return
    }

    // Seed only holes so an older JS-thread mirror snapshot does not overwrite
    // a fresher measurement that already exists in the UI-thread registry.
    cardFlights.modify((currentFlights) => {
      'worklet'
      const currentRegistry = currentFlights as Record<string, CardFlightSnapshot>
      let nextFlights = currentRegistry
      for (const [cardId, snapshot] of seeds) {
        if (isValidCardFlightSnapshot(currentRegistry[cardId])) {
          continue
        }
        if (nextFlights === currentRegistry) {
          nextFlights = { ...currentRegistry }
        }
        nextFlights[cardId] = snapshot
      }
      return nextFlights as typeof currentFlights
    }, false)
  }, [cardFlights])

  const reset = useCallback(() => {
    memoryRef.current = {}
    invalidSnapshotLoggedRef.current.clear()
    cardFlights.value = {}
  }, [cardFlights])

  const dispatchWithFlight = useCallback(
    ({ action, selection, cardIds, dispatch }: DispatchArgs) => {
      const resolver = selectionResolverRef.current
      const cards = cardIds ?? (resolver ? resolver(selection) : [])

      if (!enabledRef.current) {
        ensureReady(cards)
        dispatch(action)
        return
      }

      const waitStart = Date.now()
      const attemptDispatch = () => {
        const snapshotsReady =
          cards.length === 0 || cards.every((id) => !!memoryRef.current[id])
        const elapsed = Date.now() - waitStart
        if (snapshotsReady || elapsed >= waitTimeoutRef.current) {
          ensureReady(cards)
          dispatch(action)
          return
        }
        requestAnimationFrame(attemptDispatch)
      }

      attemptDispatch()
    },
    [ensureReady]
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
    [cardFlights, dispatchWithFlight, ensureReady, registerSnapshot, reset]
  )
}
