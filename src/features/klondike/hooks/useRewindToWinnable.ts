import { useCallback, useEffect, useRef, useState } from 'react'
import type { Dispatch, MutableRefObject } from 'react'

import type { GameAction, GameSnapshot, GameState } from '../../../solitaire/klondike'
import { buildSolverRequest, parseSolverResponse } from '../../../solitaire/solverBridge'
import type { WarningMode } from '../../../state/settings'
import { devLog } from '../../../utils/devLogger'
import { planRewindSteps, resolveRewindStepDelayMs } from '../constants'
import {
  findLastWinnableIndex,
  type WinnableProbeResult,
} from '../../../solitaire/winnableBoundary'
import { solvePosition } from '../../../../modules/soli-solver'

// Per-probe budget. Same order as useHint's background check: the median solve
// is ~0.5 ms and a played-out position is proved dead in single-digit ms
// (docs/product/hints/hints-and-unwinnable-warning.md), so this is a ceiling
// for the rare hard position, not a typical cost. A probe that busts it comes
// back 'unknown' and the search widens instead of concluding.
const REWIND_PROBE_BUDGET_MS = 800

type UseRewindToWinnableOptions = {
  state: GameState
  stateRef: MutableRefObject<GameState>
  // The "Rewind to winnable" setting (default off).
  enabled: boolean
  // The warning-mode select. Only used as a LIFETIME key: changing what the
  // player wants to be told retires an outstanding boundary (see below).
  warningMode: WarningMode
  // Stable identity of the outstanding solver-proven warning, from useHint;
  // null when no warning is showing.
  //
  // BOTH warning modes qualify, not just 'unwinnable': a dead era only ever
  // starts on a solver `unsolvable` verdict (see the two fireWarning call
  // sites in useHint), so an outstanding warning in either mode means "this
  // position is PROVEN lost" — precisely the situation this feature answers.
  warningEraKey: string | null
  // Borrowed from useHint so all solver traffic stays on one queue; see the
  // comment on useHint's return value for why the whole search is enqueued as
  // a single task.
  enqueueSolve: (task: () => Promise<void>) => void
  dispatch: Dispatch<GameAction>
}

// A boundary the solver PROVED winnable, tagged with the deal it was proven on
// so it can never be read against a different game.
type ProvenBoundary = {
  exactId: string
  index: number
}

// Maps a solver answer onto the search's three-valued verdict. Only a literal
// proof counts: 'unknown' (budget miss) AND 'invalid'/'error' are all
// non-answers, so the search widens rather than claiming a boundary.
const probeSnapshot = async (snapshot: GameSnapshot): Promise<WinnableProbeResult> => {
  const request = buildSolverRequest(snapshot, REWIND_PROBE_BUDGET_MS)
  let status: string
  try {
    status = parseSolverResponse(await solvePosition(JSON.stringify(request))).status
  } catch (error) {
    console.warn('[rewind] solver probe failed', error)
    return 'unknown'
  }
  if (status === 'solved') {
    return 'winnable'
  }
  return status === 'unsolvable' ? 'unwinnable' : 'unknown'
}

// Computes WHERE the game stopped being winnable, and offers the jump back to
// it (rewind-to-winnable plan). Async by necessity — the solver cannot be
// called from the reducer — so this follows useHint's shape: the reducer is
// only ever touched by an existing action, never by a new one.
export const useRewindToWinnable = ({
  state,
  stateRef,
  enabled,
  warningMode,
  warningEraKey,
  enqueueSolve,
  dispatch,
}: UseRewindToWinnableOptions) => {
  // The proven boundary as a TIMELINE index (the same index space
  // SCRUB_TO_INDEX and the scrubber thumb use). null = nothing proven, which
  // is also the honest state while the first search is still running. The ref
  // mirror gives the effects below a synchronous read, updated in the same
  // breath (setProven) — same pattern as useHint's deadEraRef.
  const [proven, setProvenState] = useState<ProvenBoundary | null>(null)
  const provenRef = useRef<ProvenBoundary | null>(null)
  const setProven = useCallback((next: ProvenBoundary | null) => {
    provenRef.current = next
    setProvenState(next)
  }, [])

  // Generation guard: a superseded search's result is dropped, and — since it
  // is checked per probe (below) — a superseded search stops issuing solves
  // instead of holding the shared queue for another two dozen of them. Solves
  // themselves cannot be cancelled (no cancel hook on the Rust side yet, same
  // as useHint), so the in-flight one finishes into the void.
  const searchIdRef = useRef(0)

  // Retires the boundary AND abandons any search still running for it.
  const retireBoundary = useCallback(() => {
    searchIdRef.current += 1
    if (provenRef.current !== null) {
      setProven(null)
    }
  }, [setProven])

  // ---------------------------------------------------------------------------
  // THE BOUNDARY'S LIFETIME (deserves spelling out — the affordance rests on it)
  //
  // A proven index OUTLIVES the warning era that produced it, on purpose. The
  // marker says "drag until the thumb sits on the tick", and the very first
  // committed scrub step drops the timeline below the era's boundary, which
  // exits the era (useHint's era-exit effect) — so a boundary that died with
  // its era would unmount the marker the instant the player started using it,
  // leave no way back after an overshoot, and flip the pill back to Hint one
  // step into the stepped playback.
  //
  // It stays valid for exactly as long as the player is still WALKING BACK
  // through the line it was proven on:
  //   - the same deal (exactId), and
  //   - no committed MOVE since the era ended. Undo, redo and every scrub step
  //     preserve moveCount and the timeline's index space (see scrubToIndex in
  //     klondike.ts), so the whole walk — including overshooting the marker and
  //     coming back for it — keeps the proof pointing at the same position.
  //
  // A committed move outside a live era ends that walk: either the player took
  // the rewind and is playing on, or they diverged onto a line the proof says
  // nothing about (a move below the boundary truncates the future and rewrites
  // every index above it). Either way the boundary retires and the surfaces go
  // away — this feature never offers a rewind to a position it cannot still
  // prove winnable. Inside a LIVE era, playing on cannot invalidate anything
  // (the DeadEraMarker invariant in useHint), so the reference point simply
  // tracks the board.
  //
  // Both effects are declared BEFORE the search effect so that a retire and a
  // fresh search landing in the same commit cannot cancel each other.
  // ---------------------------------------------------------------------------

  // Hard resets: a different deal (new game / hydrate), the feature being
  // switched off, or a warning-mode change. Each one makes the old claim moot.
  useEffect(() => {
    retireBoundary()
  }, [enabled, retireBoundary, state.exactId, warningMode])

  // Resuming play (see the invariant above).
  const freshAtMoveCountRef = useRef(state.moveCount)
  useEffect(() => {
    if (warningEraKey !== null) {
      freshAtMoveCountRef.current = state.moveCount
      return
    }
    if (state.moveCount === freshAtMoveCountRef.current) {
      return
    }
    freshAtMoveCountRef.current = state.moveCount
    retireBoundary()
  }, [retireBoundary, state.moveCount, warningEraKey])

  const searching = enabled && warningEraKey !== null

  useEffect(() => {
    if (!searching) {
      // Deliberately NOT a retire: an era ends the moment the player scrubs
      // below its boundary, which is the exact gesture this feature exists to
      // support. Any search still in flight keeps running too — the timeline's
      // index space is invariant under scrubbing (learning 4 in the plan), so
      // it is still answering the right question.
      return
    }
    searchIdRef.current += 1
    const searchId = searchIdRef.current
    const isCurrent = () => searchIdRef.current === searchId
    enqueueSolve(async () => {
      if (!isCurrent()) {
        return
      }
      // Board read at RUN time (useHint's makeSolveTask does the same).
      const board = stateRef.current
      // The full timeline, exactly as scrubToIndex builds it: history, the
      // live board, then the redo future. GameState IS a GameSnapshot, so the
      // live board slots in without a conversion. Searching the WHOLE timeline
      // (rather than just history) keeps the index space invariant under
      // scrubbing — an undo inside the dead era moves entries from history to
      // future without changing any index.
      const timeline: GameSnapshot[] = [...board.history, board, ...board.future]
      const index = await findLastWinnableIndex(timeline, async (snapshot) => {
        // Per-probe generation check. A superseded search must not keep the
        // shared solve queue busy for up to MAX_BOUNDARY_PROBES × 800 ms while
        // useHint waits behind it to re-evaluate the warning. 'unknown' is the
        // clean way out: the search already treats it as a non-answer, widens
        // (three more probes that short-circuit here too) and returns whatever
        // it had proven — which the isCurrent() check below then drops anyway.
        if (!isCurrent()) {
          return 'unknown'
        }
        return probeSnapshot(snapshot)
      })
      if (!isCurrent()) {
        return
      }
      // Plain console.log like useHint's solver line: device tests grep these
      // without needing developer mode.
      console.log(`[rewind] boundary=${index ?? '-'} timeline=${timeline.length}`)
      if (index !== null) {
        setProven({ exactId: board.exactId, index })
      }
      // A null result is budget exhaustion, never a refutation, so an earlier
      // proof for this same deal (from an earlier era) survives it.
    })
  }, [enqueueSolve, searching, setProven, stateRef, warningEraKey])

  // The boundary as the RENDER sees it. The gate mirrors the lifetime effects
  // above (useHint's activeDeadEra does the same) so a new deal or a switched
  // off setting hides both surfaces on the very frame it commits, one render
  // before the effect clears the state.
  const timelineRange = state.history.length + state.future.length
  const rewindIndex =
    enabled &&
    proven !== null &&
    proven.exactId === state.exactId &&
    // The timeline must still extend PAST the proven position; it shrinks to
    // exactly the diverging depth when a move is committed below the boundary,
    // which the retire effect catches in the following frame.
    proven.index < timelineRange
      ? proven.index
      : null
  // A rewind must go BACKWARDS: the pill is only offered while the board is
  // actually above the boundary. The MARKER stays up either way (that is what
  // makes "drag until the thumb sits on the tick" completable, and what lets a
  // player who overshot see where to come back to).
  const rewindAvailable = rewindIndex !== null && rewindIndex < state.history.length

  // Playback timer for the stepped rewind. One pending timeout at a time; the
  // ref is the cancel handle for unmount and for a superseded rewind.
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [rewinding, setRewindingState] = useState(false)
  const rewindingRef = useRef(false)
  const setRewinding = useCallback((value: boolean) => {
    rewindingRef.current = value
    setRewindingState(value)
  }, [])

  const stopPlayback = useCallback(() => {
    if (playbackTimerRef.current !== null) {
      clearTimeout(playbackTimerRef.current)
      playbackTimerRef.current = null
    }
    setRewinding(false)
  }, [setRewinding])

  // Cancel on unmount, and when the DEAL changes underneath us — a timer that
  // outlives its board would scrub a game the player has already left.
  //
  // Deliberately keyed on exactId and NOT on warningEraKey: the very first step
  // scrubs below the era's boundary, which by design exits the era and nulls
  // warningEraKey. Keying this on the era therefore cancelled playback after one
  // step — the whole rewind collapsed back into the single jump it replaced.
  useEffect(() => stopPlayback, [stopPlayback, state.exactId])

  const rewindToWinnable = useCallback(() => {
    // Inert while a rewind is already playing back. The dock renders the pill
    // disabled for the same reason (see `rewinding` below); this guard closes
    // the gap that visual state alone cannot — a double tap inside the first
    // step delay used to restart the whole walk.
    if (rewindingRef.current) {
      return
    }
    const index = rewindIndex
    const from = stateRef.current.history.length
    if (index === null || index >= from) {
      return
    }

    // Stepped playback rather than one jump: each SCRUB_TO_INDEX moves the
    // board back a single move, so the EXISTING card flights animate it and the
    // player sees what is being undone instead of the board teleporting.
    //
    // Still SCRUB_TO_INDEX and nothing else, NOT a new reducer action: every
    // step has to be indistinguishable from a manual scrub so history, redo and
    // the move log (and therefore replay and MOVE_LOG_VERSION) behave exactly as
    // they already do. The whole feature is a shortcut to a gesture the player
    // could perform by hand — now including how it looks.
    // planRewindSteps is the tested shape of the walk; the loop below still
    // re-derives each next index from the LIVE board so an interfering undo or
    // scrub abandons playback rather than replaying a stale plan.
    const plannedSteps = planRewindSteps(from, index)
    if (!plannedSteps.length) {
      return
    }
    const stepDelayMs = resolveRewindStepDelayMs(plannedSteps.length)
    setRewinding(true)

    // Where the previous step left the board. Anything else that moves the
    // timeline — an undo, a redo, a scrub, a demo — shows up as a mismatch on
    // the next tick and ABANDONS the rewind rather than fighting the player for
    // control of the board. Checking BOTH directions matters: the old
    // `current <= index` bail only noticed backward movement, so a scrub or
    // redo FORWARD during playback kept dragging the player back down, and
    // walked the new, longer distance at the delay computed for the original.
    let expectedHistoryLength = from

    const step = () => {
      // The timeout that scheduled this has fired; drop the stale handle.
      playbackTimerRef.current = null
      const current = stateRef.current.history.length
      if (current !== expectedHistoryLength || current <= index) {
        stopPlayback()
        return
      }
      const next = current - 1
      devLog('log', '[Rewind] step', { from: current, to: next, target: index })
      dispatch({ type: 'SCRUB_TO_INDEX', index: next })
      expectedHistoryLength = next
      if (next <= index) {
        stopPlayback()
        return
      }
      playbackTimerRef.current = setTimeout(step, stepDelayMs)
    }

    step()
  }, [dispatch, rewindIndex, setRewinding, stateRef, stopPlayback])

  return {
    // One computed index drives both surfaces, so the pill and the track marker
    // can never point at different moves.
    rewindIndex,
    // Whether the ACTION is offered (the marker can be up without it: standing
    // on the boundary, or below it after an overshoot).
    rewindAvailable,
    rewindToWinnable,
    // True while the stepped playback is running, so the dock keeps the pill
    // visible but inert instead of letting a second press restart the walk.
    rewinding,
  }
}
