import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import type { MutableRefObject } from 'react'

import type { GameState } from '../../../solitaire/klondike'
import {
  buildSolverRequest,
  parseSolverCardCode,
  parseSolverResponse,
  type SolverHint,
  type SolverResponse,
} from '../../../solitaire/solverBridge'
import { findFirstUsefulMove, hasUsefulMove } from '../../../solitaire/usefulMoves'
import type { WarningMode } from '../../../state/settings'
import { solvePosition } from '../../../../modules/soli-solver'
import { getCardAccessibilityLabel } from '../components/cards/accessibility'

// On-demand button hints get the full interactive budget; the automatic
// background check gets less — it reruns after every move, and a slow proof is
// simply retried on the next position (budgets are enforced inside Rust).
const HINT_BUDGET_MS = 1500
const BACKGROUND_BUDGET_MS = 800
// Burst protection for the per-move check in mode 'unwinnable' ONLY. The
// end-of-stock check in mode 'noUsefulMoves' is deliberately NOT debounced
// (F16, see the evaluation effect).
const BACKGROUND_DEBOUNCE_MS = 600
// One shared duration for every hint visual (stock ring AND source/target
// rings) so all three hint kinds behave as one design.
const HINT_HIGHLIGHT_MS = 2500
// Transient notice durations (button-press feedback only — the proactive
// warnings became persistent/era-bound in F14 and use no timer at all).
const STUCK_NOTICE_MS = 6000
const NO_HINT_BUBBLE_MS = 2500

// Solver-proven warning (opt-in "Unwinnable warning" setting) — the strong
// claim, reserved for the exact engine.
export const UNWINNABLE_BUBBLE_TEXT = 'No winning moves left — undo or start a new game.'
// Classic stuck warning (default-on "No more moves warning" setting) — the
// weaker genre framing on purpose (research 2026-07-23: no mainstream app
// claims unwinnability from heuristics).
export const STUCK_BUBBLE_TEXT = 'No more useful moves — undo or start a new game.'
export const NO_HINT_BUBBLE_TEXT = 'No hint found.'

// Notice shown when a Hint press finds nothing (no winning line AND the
// classic enumeration is empty). Mid-stock we only say "no hint" — the classic
// stuck wording is reserved for the played-out deck (stock empty), mirroring
// the warning's own timing so the button never acts as a mid-deck oracle.
// Exported for unit tests.
export const getHintFallbackNoticeText = (board: Pick<GameState, 'stock'>): string =>
  board.stock.length === 0 ? STUCK_BUBBLE_TEXT : NO_HINT_BUBBLE_TEXT

// Hint visuals are deliberately DECOUPLED from game selection state (user
// feedback 2026-07-23): the earlier approach dispatched SELECT_* to reuse the
// selection/drop-target visuals, which turned out invisible for board moves,
// looked broken for foundation plays ("outline change on the ace"), and showed
// nothing for waste plays. Hints now render as a dedicated overlay
// (HintOverlayLayer) and never touch the reducer, so they cannot fight the
// player's own interactions.
type UseHintOptions = {
  state: GameState
  stateRef: MutableRefObject<GameState>
  // Two settings since F14:
  // - warningMode: ONE select for the proactive warning ('off' |
  //   'noUsefulMoves' | 'unwinnable') — the modes are a strictness ladder,
  //   see settings.tsx. Ignored on Vegas-rules games (see the gate below).
  // - hintButtonEnabled: the Hint button + its visuals. The caller passes
  //   `setting && !state.vegasRules` — the button is HIDDEN on Vegas-rules games
  //   (user decision round 2 / prompt 5: casino experience, no hints; tried the
  //   "any useful move" hints first and found them not worth it in a short
  //   casino game). A Standard game in progress keeps its button while Vegas
  //   is selected (the rule is the game's, not the setting's).
  warningMode: WarningMode
  hintButtonEnabled: boolean
  demoPlaybackActiveRef: MutableRefObject<boolean>
}

// Cheap committed-position identity. moveCount covers plays/draws,
// history.length covers undo/scrub (which keep moveCount), exactId covers new
// deals/hydration; stock/waste lengths add cheap extra discrimination. UI
// bits (bubble, hint rings) and solve results are keyed to this so ANY board
// change invalidates them.
const positionKeyOf = (state: GameState): string =>
  `${state.exactId}|${state.moveCount}|${state.history.length}|${state.stock.length}|${state.waste.length}`

// Screen-reader narration for an applied hint (same announce channel as the
// bubbles). Exported for unit tests.
export const getHintAnnouncement = (hint: SolverHint): string => {
  if (hint.kind === 'draw') {
    return 'Hint: draw from the stock.'
  }
  const cardLabel = getCardAccessibilityLabel(parseSolverCardCode(hint.card))
  const target =
    // Column numbers are 1-based in a11y labels (see accessibility.ts).
    hint.to.type === 'tableau' ? `column ${hint.to.index + 1}` : 'the foundation'
  return `Hint: move ${cardLabel} to ${target}.`
}

type PositionKeyed = { positionKey: string }
type NoticeState = PositionKeyed & { text: string }
type HighlightState = PositionKeyed & { hint: SolverHint }

// Dead-era marker (F14 sticky warnings). Set the moment a warning fires (in
// either mode); records WHICH warning fired plus the era boundary: the deal
// and the history depth at the warn moment.
//
// THE INVARIANT (deserves spelling out — the whole warning model rests on it):
// forward moves can never revive a dead game. Playing on only consumes
// options, so every position at/inside the era (same exactId, history depth
// >= the boundary) is provably still dead. Therefore, while inside the era:
//   - the warning stays DISPLAYED (persistent, no timer — user feedback
//     2026-07-24: "keep showing it until it's not true anymore"), and
//   - NO further warning evaluation runs (no heuristic, no solver call) —
//     re-proving a monotone fact is pure waste. This is also what keeps a
//     stuck era stable across draws/recycles: they change the position key
//     but not the era.
// Exiting the era (undo/scrub below the boundary, new deal, hydrate/remount)
// clears the warning and re-arms evaluation.
//
// The same invariant also works BACKWARDS in time (F16): a dead-proof that
// arrives after the player already moved on is still valid for the current
// position as long as the current position is inside the era the proof
// defines (same deal, depth >= the evaluated depth). So proofs are never
// dropped as "stale" — the era boundary is simply placed at the EVALUATED
// board, not at the board of the moment the response lands.
type DeadEraMarker = {
  exactId: string
  historyLength: number
  mode: Exclude<WarningMode, 'off'>
}

const warningTextFor = (mode: DeadEraMarker['mode']): string =>
  mode === 'unwinnable' ? UNWINNABLE_BUBBLE_TEXT : STUCK_BUBBLE_TEXT

// Is `current` at/inside the dead era a proof for `evaluated` would define?
// (Forward moves only: same deal, depth not below the evaluated depth.)
const isInsideEraOf = (current: GameState, evaluated: GameState): boolean =>
  current.exactId === evaluated.exactId &&
  current.history.length >= evaluated.history.length

// Owns the hint/warning features: the on-demand Hint button solve and the
// background warning evaluation (mode-dependent since F14; immediate at the
// end of the stock, debounced per move in mode 'unwinnable' — F16). All
// solver traffic is funneled through one replace-latest queue so two solves
// never overlap.
//
// NOTE (user feedback 2026-07-23: "button flickers on every move" = no-go):
// there is deliberately NO solver-busy React state here anymore. The old
// setSolverBusy(true/false) around every solve fed a disabled/dimmed style on
// the Hint button, which blinked for the 1-2 frames each sub-ms background
// solve took — after every single move. Busy bookkeeping lives in refs only;
// overlapping button presses are absorbed by the replace-latest queue (a
// repeat solve of the same position is sub-ms and just restarts the ring
// timer, which is the wanted behavior anyway).
export const useHint = ({
  state,
  stateRef,
  warningMode: warningModeSetting,
  hintButtonEnabled,
  demoPlaybackActiveRef,
}: UseHintOptions) => {
  const positionKey = positionKeyOf(state)

  // THE Vegas gate: on a Vegas-rules game (pass limit = draw count, Phase 2) the
  // whole hint/warning machinery is OFF — no solver call, no stuck heuristic, no
  // bubble of any kind; the caller hides the Hint button (hintButtonEnabled
  // false), so requestHint never runs either. Why (user decisions, prompts 4–6):
  //   - the bundled Lonelybot assumes unlimited recycles, so its verdicts are
  //     meaningless under a pass limit, and a pass-aware solver is a separate
  //     Rust project the user decided against (Vegas is about the bankroll);
  //   - rounds 1–2 instead fired the pass-aware stuck heuristic WITHOUT solver
  //     confirmation as a "Game over — result −$47" bubble; that end could be
  //     premature (foundation digs / two-step rearrangements the heuristic
  //     excludes), and the user prefers to decide themselves when a casino game
  //     is over ("they check if they can do anything still and then start a new
  //     game") — the dock shows a New Game button once the stock is exhausted
  //     (useKlondikeGame) instead. Simpler code, no false claims.
  // A Standard-rules game keeps every solver-backed path exactly as before.
  const warningMode: WarningMode = state.vegasRules ? 'off' : warningModeSetting

  // Transient button-press notice ("No hint found." / stuck notice) — the old
  // position-keyed + timer behavior. The proactive warnings do NOT live here:
  // they are era-bound and persistent (deadEra below).
  const [notice, setNotice] = useState<NoticeState | null>(null)
  const [highlight, setHighlight] = useState<HighlightState | null>(null)
  // Dead era = the active warning (see DeadEraMarker). State drives the
  // bubble; the ref mirror gives effects/callbacks a synchronous read that is
  // updated in the same breath (setDeadEra), so the evaluation gate and the
  // hint-press decision can never act on a stale era.
  const [deadEra, setDeadEraState] = useState<DeadEraMarker | null>(null)
  const deadEraRef = useRef<DeadEraMarker | null>(null)
  // Bumped on every warning fire AND re-affirm; GameNoticeBubble replays its
  // entry emphasis on change (F15: a hint press during an outstanding warning
  // re-announces instead of hinting).
  const [warningEmphasisNonce, setWarningEmphasisNonce] = useState(0)

  const setDeadEra = useCallback((era: DeadEraMarker | null) => {
    deadEraRef.current = era
    setDeadEraState(era)
  }, [])

  const solveInFlightRef = useRef(false)
  // Replace-latest queue: solves cannot be cancelled in v1 (the Rust side has
  // no cancel hook wired yet), so a superseded request is simply dropped
  // before it starts, and results for outdated positions are ignored below.
  const pendingSolveRef = useRef<(() => Promise<void>) | null>(null)
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      for (const timer of [noticeTimerRef, highlightTimerRef]) {
        if (timer.current !== null) {
          clearTimeout(timer.current)
        }
      }
    }
  }, [])

  const drainSolveQueue = useCallback(async () => {
    if (solveInFlightRef.current) {
      return
    }
    solveInFlightRef.current = true
    try {
      while (pendingSolveRef.current) {
        const task = pendingSolveRef.current
        pendingSolveRef.current = null
        await task()
      }
    } finally {
      solveInFlightRef.current = false
    }
  }, [])

  const enqueueSolve = useCallback(
    (task: () => Promise<void>) => {
      pendingSolveRef.current = task
      void drainSolveQueue()
    },
    [drainSolveQueue]
  )

  // Solves a SNAPSHOT: the board handed in at enqueue time, not
  // stateRef.current at run time (changed in F16 — the old run-time read made
  // the evaluated position unknowable once the player moved on, so every late
  // result had to be dropped as stale). The handler receives the evaluated
  // board + its key and decides itself what a late result still means (a
  // dead-proof stays valid inside its era; a hint for an old position does
  // not).
  const makeSolveTask = useCallback(
    (
      source: 'hint' | 'auto',
      budgetMs: number,
      board: GameState,
      handle: (response: SolverResponse, evaluated: GameState, keyAtRun: string) => void
    ) =>
      async () => {
        const keyAtRun = positionKeyOf(board)
        const request = buildSolverRequest(board, budgetMs)
        let response: SolverResponse
        try {
          response = parseSolverResponse(await solvePosition(JSON.stringify(request)))
        } catch (error) {
          response = { status: 'error', message: String(error) }
        }
        // Plain console.log on purpose (not devLog): device tests grep these
        // lines without requiring developer mode. `stock`/`depth` identify the
        // evaluated snapshot (F16 device evidence: the end-of-stock solve must
        // show stock=0 even when the player already recycled).
        console.log(
          `[solver] source=${source} status=${response.status} ms=${
            response.solveMs?.toFixed(1) ?? '-'
          } visited=${response.visited ?? '-'} moves=${response.winMovesRemaining ?? '-'} stock=${
            board.stock.length
          } depth=${board.history.length}`
        )
        handle(response, board, keyAtRun)
      },
    []
  )

  const showNotice = useCallback((text: string, key: string, durationMs: number) => {
    setNotice({ text, positionKey: key })
    AccessibilityInfo.announceForAccessibility(text)
    if (noticeTimerRef.current !== null) {
      clearTimeout(noticeTimerRef.current)
    }
    noticeTimerRef.current = setTimeout(() => {
      noticeTimerRef.current = null
      setNotice(null)
    }, durationMs)
  }, [])

  // Starts a dead era: persistent warning bubble + announcement + evaluation
  // block. The boundary is the EVALUATED board (the one the proof is about) —
  // callers pass the solved snapshot, never stateRef.current, and guarantee
  // the current position is inside that era (isInsideEraOf). No timer — the
  // warning outlives position changes inside the era by design (F14).
  const fireWarning = useCallback(
    (mode: DeadEraMarker['mode'], evaluated: GameState) => {
      setDeadEra({
        exactId: evaluated.exactId,
        historyLength: evaluated.history.length,
        mode,
      })
      setWarningEmphasisNonce((nonce) => nonce + 1)
      AccessibilityInfo.announceForAccessibility(warningTextFor(mode))
    },
    [setDeadEra]
  )

  // One path for all hint kinds: 'draw' surfaces as the stock ring, 'move' as
  // the source/target overlay rings. Auto-clears after HINT_HIGHLIGHT_MS; a
  // repeated hint press lands here again and restarts the timer.
  const applyHintHighlight = useCallback((hint: SolverHint, key: string) => {
    setHighlight({ hint, positionKey: key })
    AccessibilityInfo.announceForAccessibility(getHintAnnouncement(hint))
    if (highlightTimerRef.current !== null) {
      clearTimeout(highlightTimerRef.current)
    }
    highlightTimerRef.current = setTimeout(() => {
      highlightTimerRef.current = null
      setHighlight(null)
    }, HINT_HIGHLIGHT_MS)
  }, [])

  // Classic fallback (F11): no winning line usable → hint the first useful
  // move from the same enumeration the stuck warning uses, with the normal
  // visuals; empty enumeration → transient notice (stuck wording only at the
  // played-out deck, mirroring the warning's own timing).
  const showClassicFallback = useCallback(
    (board: GameState, keyAtRun: string) => {
      const fallback = findFirstUsefulMove(board)
      if (fallback) {
        applyHintHighlight(fallback, keyAtRun)
        return
      }
      showNotice(
        getHintFallbackNoticeText(board),
        keyAtRun,
        board.stock.length === 0 ? STUCK_NOTICE_MS : NO_HINT_BUBBLE_MS
      )
    },
    [applyHintHighlight, showNotice]
  )

  // Any committed board change (move/draw/undo/scrub/new deal) invalidates the
  // highlight. Rendering is ALSO gated on the position key below (instant hide
  // on the very frame of the change); this effect clears the stored state so a
  // scrub-away-and-back within the timer window cannot resurrect a stale ring.
  useEffect(() => {
    setHighlight((current) =>
      current && current.positionKey !== positionKey ? null : current
    )
  }, [positionKey])

  // Era exit: the player materially changes course — undo/scrub below the
  // warn-time depth, or a new deal (hydrate/remount clears trivially: the era
  // is in-memory only). Clears the warning and re-arms evaluation. Moves
  // DEEPER into the dead line keep the era (see the DeadEraMarker invariant).
  // Declared BEFORE the background-evaluation effect on purpose: effects run
  // in declaration order, so by the time that effect re-checks deadEraRef for
  // the new position, an exited era is already gone.
  useEffect(() => {
    const era = deadEraRef.current
    if (
      era &&
      (state.exactId !== era.exactId || state.history.length < era.historyLength)
    ) {
      setDeadEra(null)
    }
  }, [setDeadEra, state.exactId, state.history.length])

  // Changing the warning mode drops any active era: the user just changed
  // what they want to be told, so the old warning's claim (and its evaluation
  // block) must not linger. Evaluation re-arms under the new mode and re-warns
  // if that mode's condition holds. (No-op at mount — the era starts null.)
  useEffect(() => {
    setDeadEra(null)
  }, [setDeadEra, warningMode])

  // On-demand hint (the button). F15 decision table — ONE decision point for
  // the hint × warning interplay (user feedback 2026-07-24: a hint and a
  // "you can't win anymore" warning showing together is a contradiction):
  //
  //   1. Warning outstanding for the current era (either mode)
  //        → NO move hint, no solver call; re-affirm the warning instead
  //          (re-announce + bubble emphasis pulse). Inside a stuck era this
  //          re-affirms "No more useful moves…", never "No hint found.".
  //   2. No outstanding warning → solve:
  //        solved              → winning hint (F9 board-first).
  //        unsolvable          → fire-on-discovery: the press just PROVED the
  //                              position dead, so if the active mode would
  //                              warn here ('unwinnable' always;
  //                              'noUsefulMoves' when the stuck condition
  //                              holds), warn NOW instead of hinting —
  //                              otherwise the background check (debounced
  //                              in mode 'unwinnable', or still in flight)
  //                              would raise the warning moments after we
  //                              showed a hint (the exact contradiction this
  //                              table kills). Mode wouldn't warn (mode off,
  //                              or noUsefulMoves with useful moves left /
  //                              mid-stock) → classic useful-move fallback,
  //                              which therefore leaks no winnability beyond
  //                              the user's chosen knowledge level.
  //        unknown             → classic fallback only. NEVER warn on an
  //                              unproven claim (budget miss).
  //   Note mode 'unwinnable' can only reach the fallback via 'unknown' or in
  //   the sub-second pre-background gap — never with a live warning, because
  //   the era would already be outstanding (case 1).
  const requestHint = useCallback(() => {
    const current = stateRef.current
    if (
      !hintButtonEnabled ||
      current.hasWon ||
      current.isAutoCompleting ||
      current.autoQueue.length > 0 ||
      // Demo playback drives the board itself; hint visuals would fight it.
      demoPlaybackActiveRef.current
    ) {
      return
    }
    // Case 1: outstanding warning. The era-exit effect keeps the ref honest
    // (a press always runs after commit+effects, so a non-null era here is
    // guaranteed to cover the current position).
    const era = deadEraRef.current
    if (era) {
      setWarningEmphasisNonce((nonce) => nonce + 1)
      AccessibilityInfo.announceForAccessibility(warningTextFor(era.mode))
      return
    }
    enqueueSolve(
      makeSolveTask('hint', HINT_BUDGET_MS, current, (response, board, keyAtRun) => {
        // A hint is only meaningful for the position it was asked about —
        // ANY board change since the press drops the result (unlike the
        // background dead-proofs, see handleBackgroundResult).
        if (positionKeyOf(stateRef.current) !== keyAtRun) {
          return
        }
        switch (response.status) {
          case 'solved':
            if (response.hint) {
              applyHintHighlight(response.hint, keyAtRun)
            }
            // solved without hint = position already won → nothing to show.
            break
          case 'unsolvable':
            // The background check may have proven the same position dead
            // while this press was queued behind it (since F16 the end-of-
            // stock solve starts immediately, so the press's solve is the one
            // that lands second) — the warning is already up, don't fire/
            // announce it twice.
            if (deadEraRef.current) {
              break
            }
            // Case 2, fire-on-discovery (see the decision table above).
            if (
              warningMode === 'unwinnable' ||
              (warningMode === 'noUsefulMoves' &&
                board.stock.length === 0 &&
                !hasUsefulMove(board))
            ) {
              fireWarning(
                warningMode === 'unwinnable' ? 'unwinnable' : 'noUsefulMoves',
                board
              )
              break
            }
            showClassicFallback(board, keyAtRun)
            break
          case 'unknown':
            // Budget miss: identical fallback handling so the button leaks
            // nothing about winnability — but never a warning (unproven).
            showClassicFallback(board, keyAtRun)
            break
          default:
            // invalid/error should not happen in production; keep the payload
            // in device logs for diagnosis, show nothing.
            console.warn('[solver] hint request failed', response)
        }
      })
    )
  }, [
    applyHintHighlight,
    demoPlaybackActiveRef,
    enqueueSolve,
    fireWarning,
    hintButtonEnabled,
    makeSolveTask,
    showClassicFallback,
    stateRef,
    warningMode,
  ])

  // Result handler shared by both background triggers below. The evaluated
  // board is the SNAPSHOT the solver actually saw (makeSolveTask), so a result
  // landing after further moves is judged against the era it would define
  // rather than dropped (F16; the DeadEraMarker "backwards in time" note).
  const handleBackgroundResult = useCallback(
    (response: SolverResponse, evaluated: GameState, keyAtRun: string) => {
      if (response.status === 'unsolvable') {
        // Don't fire twice: a hint press can prove the position dead
        // (fire-on-discovery) while this solve was queued behind it.
        if (deadEraRef.current) {
          return
        }
        // Dead-proofs are never dropped as stale (F16): fire with the
        // boundary at the EVALUATED depth whenever the player is still inside
        // that era — forward moves since the evaluation cannot have revived
        // the game. Drop only if they undid below it or changed deal (the
        // proof is then about a line they left). NOTE: this is deliberately
        // NOT a position-key comparison — the key changes on every forward
        // move, and dropping on it is exactly what lost the warning before.
        if (!isInsideEraOf(stateRef.current, evaluated)) {
          return
        }
        // No per-position dedupe needed: the era itself blocks any
        // re-evaluation until the player exits it, and re-warning AFTER an
        // exit-and-return is exactly the wanted re-arm behavior.
        fireWarning(warningMode === 'unwinnable' ? 'unwinnable' : 'noUsefulMoves', evaluated)
      } else if (response.status === 'solved') {
        // In mode 'noUsefulMoves' a background solve only ever runs when the
        // heuristic said "stuck", so 'solved' here IS a heuristic false
        // positive the solver gate just rescued — the live counter of
        // Microsoft-style wrong warnings we prevented (foundation digs /
        // rearrangements the enumeration excludes on purpose). console.warn
        // so device tests can grep it. Keyed on the evaluated board.
        if (warningMode === 'noUsefulMoves') {
          console.warn(
            '[stuck-heuristic] false positive: no useful move found but position is solvable',
            {
              positionKey: keyAtRun,
              drawCount: evaluated.drawCount,
              wasteLength: evaluated.waste.length,
              winMovesRemaining: response.winMovesRemaining,
            }
          )
        }
      } else if (response.status === 'invalid' || response.status === 'error') {
        console.warn('[solver] background check failed', response)
      }
      // 'unknown' (budget miss): suppress silently — a warning must never
      // rest on an unproven claim; the next position retries anyway.
    },
    [fireWarning, stateRef, warningMode]
  )

  // Background warning evaluation after every committed position change;
  // skipped while winning/auto-completing/demo playback. Which check runs is
  // the warning mode's business alone — the F11 two-toggle precedence dance
  // (and its once-per-position dedupe refs) collapsed into this single mode
  // switch plus the sticky era. Two triggers with DIFFERENT timing:
  //
  //   'noUsefulMoves' → end-of-stock trigger, IMMEDIATE (F16). Classic stuck
  //        check with F11 semantics: only evaluated at the recycle-flip
  //        moment (stock empty) — mid-stock the warning must stay silent (the
  //        genre contract is "you played the deck out", never a mid-deck
  //        oracle about unseen cards), so mid-stock we skip even the µs-cheap
  //        heuristic. The solver confirmation runs only when the heuristic
  //        already says dead, which keeps the default mode at (near) zero
  //        background solver work. NOT debounced: the trigger fires once per
  //        stock cycle, and a debounce actively lost the warning — user
  //        report 2026-10-11: cycling the stock fast, the recycle tap landed
  //        within 600 ms of the stock emptying, the next committed position
  //        cleared the timer, and post-recycle (stock non-empty) nothing
  //        evaluates anymore — the only evaluation that could fire had been
  //        cancelled. The solve runs against a snapshot of the stock-empty
  //        board, so the recycle can no longer change what gets evaluated.
  //   'unwinnable'    → per-move trigger, DEBOUNCED (burst protection: it
  //        would otherwise solve 10×/s under rapid tapping). A proof that
  //        lands after further forward moves still fires (handleBackgroundResult).
  useEffect(() => {
    if (
      warningMode === 'off' ||
      state.hasWon ||
      state.isAutoCompleting ||
      state.autoQueue.length > 0
    ) {
      return
    }
    // Sticky-era gate (THE F14 invariant, spelled out on DeadEraMarker):
    // inside a dead era no evaluation runs at all — zero heuristic work, zero
    // solver calls — because forward moves cannot revive a dead game. Draws/
    // recycles inside a stuck era land here too (new position key, same era).
    // The era-exit effect above already cleared the ref if this position left
    // the era, so a non-null era always covers the current position.
    if (deadEraRef.current) {
      return
    }
    const key = positionKey
    if (warningMode === 'noUsefulMoves') {
      // Read the committed board via the ref (synced before this effect runs)
      // rather than depending on `state`: the state object also changes on
      // selection taps, which must not re-run the heuristic/solve.
      const board = stateRef.current
      if (
        board.stock.length !== 0 ||
        demoPlaybackActiveRef.current ||
        hasUsefulMove(board)
      ) {
        return
      }
      enqueueSolve(makeSolveTask('auto', BACKGROUND_BUDGET_MS, board, handleBackgroundResult))
      return
    }
    const timer = setTimeout(() => {
      // Ref reads at fire time: demo playback drives the reducer rapidly and
      // must never trigger solver work; the board ref is guarded by the key
      // check (any board change re-runs this effect and clears the timer).
      if (demoPlaybackActiveRef.current) {
        return
      }
      const board = stateRef.current
      if (positionKeyOf(board) !== key) {
        return
      }
      // Re-check: a hint press may have fired the warning (fire-on-discovery)
      // while this timer was pending.
      if (deadEraRef.current) {
        return
      }
      enqueueSolve(makeSolveTask('auto', BACKGROUND_BUDGET_MS, board, handleBackgroundResult))
    }, BACKGROUND_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [
    demoPlaybackActiveRef,
    enqueueSolve,
    handleBackgroundResult,
    makeSolveTask,
    positionKey,
    state.autoQueue.length,
    state.hasWon,
    state.isAutoCompleting,
    stateRef,
    warningMode,
  ])

  // Persistent warning text (F14): shown for every position inside the dead
  // era. The render gate mirrors the era-exit effect so the bubble hides on
  // the very frame an undo below the boundary commits (the effect then clears
  // the state); the mode gate covers the one render before a mode change's
  // clear effect runs.
  const warningText = useMemo(() => {
    if (
      !deadEra ||
      warningMode === 'off' ||
      state.exactId !== deadEra.exactId ||
      state.history.length < deadEra.historyLength
    ) {
      return null
    }
    return warningTextFor(deadEra.mode)
  }, [deadEra, state.exactId, state.history.length, warningMode])

  // Transient notice stays position-keyed: any board change hides it without
  // cleanup effects. It only ever originates from the Hint button. A live
  // warning outranks it (stronger, persistent claim — one bubble, one truth).
  const noticeText =
    hintButtonEnabled && notice && notice.positionKey === positionKey
      ? notice.text
      : null
  const hintBubbleText = warningText ?? noticeText
  // One output for both hint kinds since F13: HintOverlayLayer renders the
  // stock ring for 'draw' and the source/target rings + ghost for 'move', so
  // the caller no longer needs a separate stockPulse channel into TopRow.
  const activeHint: SolverHint | null =
    hintButtonEnabled && highlight && highlight.positionKey === positionKey
      ? highlight.hint
      : null

  return {
    requestHint,
    activeHint,
    hintBubbleText,
    // For GameNoticeBubble's emphasis replay (warning fire + re-affirm).
    warningEmphasisNonce,
  }
}
