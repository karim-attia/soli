// Tiny external store for demo playback progress (demo-sheet-undo-probes-info-hud
// scope 3). Module-level singleton on purpose: the demo launcher is effectively a
// singleton per session and only the dev-only DemoPlaylistHud subscribes. Keeping
// progress ticks out of React state means the board and useKlondikeGame never
// re-render on demo progress updates.
//
// Simplified 2026-07-06 (user feedback): the HUD only shows "Game x/y", so the
// store carries just that. Step/undo-probe/JS-heap/elapsed fields were removed —
// steps are visible via the Moves stat, and the JS heap (30-50 MB) is not the
// interesting memory number (native RSS is, see plan follow-up 3).

export type DemoProgress = {
  readonly gameIndex: number
  readonly gameCount: number
}

let currentProgress: DemoProgress | null = null
const listeners = new Set<() => void>()

export const getDemoProgress = (): DemoProgress | null => currentProgress

export const setDemoProgress = (next: DemoProgress | null): void => {
  if (next === currentProgress) {
    return
  }
  currentProgress = next
  listeners.forEach((listener) => {
    listener()
  })
}

export const subscribeDemoProgress = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
