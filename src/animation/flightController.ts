import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { SharedValue } from 'react-native-reanimated'
import { useSharedValue } from 'react-native-reanimated'

import type { GameAction, Selection } from '../solitaire/klondike'
import { devLog } from '../utils/devLogger'

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
    case 'ADVANCE_AUTO_QUEUE':
      return 'auto-queue'
    default:
      return action.type
  }
}

const snapshotToLog = (
  cardId: string,
  snapshot: CardFlightSnapshot | undefined,
): Record<string, unknown> => {
  if (!snapshot) {
    return { cardId, missing: true }
  }
  return {
    cardId,
    x: snapshot.pageX,
    y: snapshot.pageY,
    width: snapshot.width,
    height: snapshot.height,
  }
}

export const useFlightController = (options: FlightControllerOptions): FlightController => {
  const cardFlights = useSharedValue<Record<string, CardFlightSnapshot>>({})
  const memoryRef = useRef<Record<string, CardFlightSnapshot>>({})
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
    memoryRef.current[cardId] = snapshot
    devLog('debug', '[Flight] snapshot', snapshotToLog(cardId, snapshot))
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
    devLog('debug', '[Flight] cache sync', { count: Object.keys(memory).length })
  }, [cardFlights])

  const reset = useCallback(() => {
    memoryRef.current = {}
    cardFlights.value = {}
    devLog('info', '[Flight] reset')
  }, [cardFlights])

  const dispatchWithFlight = useCallback(
    ({ action, selection, dispatch }: DispatchArgs) => {
      const resolver = selectionResolverRef.current
      const cards = resolver ? resolver(selection) : []
      const selectionLabel = describeSelection(selection)
      const targetLabel = describeTarget(action)

      if (!enabledRef.current) {
        if (cards.length) {
          devLog('info', '[Flight] dispatch (disabled)', {
            action: action.type,
            cards,
            selection: selectionLabel,
            target: targetLabel,
          })
        }
        ensureReady()
        dispatch(action)
        return
      }

      devLog('info', '[Flight] queue', {
        action: action.type,
        cards,
        selection: selectionLabel,
        target: targetLabel,
      })

      const waitStart = Date.now()
      const attemptDispatch = () => {
        const snapshotsReady = cards.length === 0 || cards.every((id) => !!memoryRef.current[id])
        const elapsed = Date.now() - waitStart
        if (snapshotsReady || elapsed >= waitTimeoutRef.current) {
          ensureReady()
          if (!snapshotsReady) {
            devLog('warn', '[Flight] timeout waiting for snapshots', {
              action: action.type,
              cards,
              selection: selectionLabel,
              target: targetLabel,
              waitMs: elapsed,
            })
          } else {
            const origins = cards.map((id) => snapshotToLog(id, memoryRef.current[id]))
            devLog('info', '[Flight] dispatch', {
              action: action.type,
              cards,
              selection: selectionLabel,
              target: targetLabel,
              waitMs: elapsed,
              origins,
            })
          }
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

