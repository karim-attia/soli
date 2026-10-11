// Finds the deepest position in a game's timeline that the solver can still
// PROVE winnable ("rewind to last winnable move"; plan:
// docs/product/rewind-to-winnable/rewind-to-last-winnable-move.md).
//
// WHY a binary search is valid (and not a scan): winnability is monotonically
// DECREASING along a play line. A forward move can only consume options, never
// revive a dead game — this is the very invariant the sticky dead era in
// useHint.ts already rests on (see DeadEraMarker there). So the timeline splits
// into a winnable PREFIX and an unwinnable SUFFIX, and locating that boundary
// costs ~log2(n) solver calls (≈7 for a 100-move game) instead of n.
//
// Deliberately pure and solver-INJECTED (no native module, no React, no
// klondike import): the whole search is then unit-testable with a fake solver,
// which is where all the tricky cases (unknown verdicts, boundary at the
// edges) actually live.

// Deliberately three-valued. 'unknown' is budget exhaustion — the solver could
// not decide THIS position in the time it was given — and must never be read
// as a verdict in either direction. Callers map solver 'invalid'/'error' here
// too: anything that is not a proof is a non-answer.
export type WinnableProbeResult = 'winnable' | 'unwinnable' | 'unknown'

export type WinnableProbe<TSnapshot> = (
  snapshot: TSnapshot,
  index: number
) => Promise<WinnableProbeResult>

// Safety net for pathological runs (e.g. a solver that answers 'unknown' for
// everything): a clean binary search needs ~log2(n) probes and the widening
// below adds a few per step, so 24 leaves generous room for a long game while
// capping the worst case at a few dozen sub-10ms solves.
export const MAX_BOUNDARY_PROBES = 24

// How far to step away from a blocked midpoint before giving up on that
// window. 'unknown' says nothing about the position, so we WIDEN (ask a
// neighbour, which is nearly the same board and usually cheaper to decide)
// instead of guessing a direction and silently corrupting the search.
const UNKNOWN_WIDENING_LIMIT = 3

/**
 * Returns the highest index whose snapshot the probe PROVED winnable, or null
 * when no such proof was obtained (all-unwinnable, empty timeline, or a solver
 * that never returned a verdict). Never claims a boundary that was not proven:
 * the returned index is always one the probe answered 'winnable' for.
 */
export const findLastWinnableIndex = async <TSnapshot>(
  snapshots: readonly TSnapshot[],
  probe: WinnableProbe<TSnapshot>,
  maxProbes: number = MAX_BOUNDARY_PROBES
): Promise<number | null> => {
  // Memoized so the widening below can revisit an index without paying for it
  // twice — and so a cached 'unknown' cannot be retried forever.
  const probed = new Map<number, WinnableProbeResult>()
  let probesLeft = maxProbes

  const probeAt = async (index: number): Promise<WinnableProbeResult> => {
    const cached = probed.get(index)
    if (cached !== undefined) {
      return cached
    }
    if (probesLeft <= 0) {
      return 'unknown'
    }
    probesLeft -= 1
    const result = await probe(snapshots[index], index)
    probed.set(index, result)
    return result
  }

  // Probes `mid`, then steps outward (mid-1, mid+1, mid-2, …) while the solver
  // keeps answering 'unknown'. Returns the first index inside [lo, hi] that
  // produced a verdict, or null when the whole neighbourhood stayed unproven.
  const probeNearest = async (lo: number, hi: number, mid: number) => {
    for (let offset = 0; offset <= UNKNOWN_WIDENING_LIMIT; offset += 1) {
      const candidates = offset === 0 ? [mid] : [mid - offset, mid + offset]
      for (const candidate of candidates) {
        if (candidate < lo || candidate > hi) {
          continue
        }
        const result = await probeAt(candidate)
        if (result !== 'unknown') {
          return { index: candidate, result }
        }
      }
    }
    return null
  }

  let best: number | null = null
  let lo = 0
  let hi = snapshots.length - 1

  // Budget exhaustion needs no loop condition of its own: probeAt answers
  // 'unknown' once the budget is spent, so probeNearest returns null and the
  // break below ends the search on exactly the same path as an undecidable
  // window.
  while (lo <= hi) {
    const mid = lo + Math.floor((hi - lo) / 2)
    const verdict = await probeNearest(lo, hi, mid)
    if (!verdict) {
      // Nothing in this window could be decided. Degrade quietly (return what
      // we did prove, possibly nothing) rather than assert a boundary the
      // solver never established.
      break
    }
    if (verdict.result === 'winnable') {
      // Monotone prefix: everything at or below this index is winnable too, so
      // this is the new best and only higher indices are still interesting.
      best = verdict.index
      lo = verdict.index + 1
    } else {
      hi = verdict.index - 1
    }
  }

  return best
}
