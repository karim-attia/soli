import type { DemoAutoSolvePlaylistEntry } from '../solitaire/demoReplay'

let cachedPlaylist: readonly DemoAutoSolvePlaylistEntry[] | null = null

// The generated playlist is ~617KB of object literals used only by the hidden
// developer demo. It must stay in the release bundle (demo mode is a runtime
// toggle reachable via deep links and `yarn release --logs`), but a lazy require keeps its
// evaluation off the normal startup path instead of relying on Metro's implicit
// inline-requires behavior.
export const getDemoAutoSolvePlaylist = (): readonly DemoAutoSolvePlaylistEntry[] => {
  if (!cachedPlaylist) {
    cachedPlaylist = (
      require('./demoAutoSolvePlaylist.generated') as typeof import('./demoAutoSolvePlaylist.generated')
    ).DEMO_AUTO_SOLVE_PLAYLIST
  }
  return cachedPlaylist
}
