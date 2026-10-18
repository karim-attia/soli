import { useSyncExternalStore } from 'react'

// Minimal external value store: one value, change listeners, a React hook.
// Extracted (retry-and-share-deal plan) when the third copy of the same 15 lines
// appeared (demoProgressStore, sessionControlsStore, pendingDealRequestStore).
// Module-level singletons are the point: these values live outside the React tree
// so writes from non-React code (+native-intent, demo launcher) and reads from
// sibling drawer screens need no provider plumbing and no re-renders elsewhere.
export const createValueStore = <T>(initial: T) => {
  let current = initial
  const listeners = new Set<() => void>()
  const get = () => current
  const set = (next: T) => {
    if (next === current) {
      return
    }
    current = next
    listeners.forEach((listener) => {
      listener()
    })
  }
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  const use = () => useSyncExternalStore(subscribe, get)
  return { get, set, subscribe, use }
}
