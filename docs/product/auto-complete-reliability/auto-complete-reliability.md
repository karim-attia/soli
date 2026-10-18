# Auto-complete reliability

## User prompt

> Sometimes the board does not auto-complete despite being in a state where cards just need to be moved to the foundation

## Summary

Auto-complete ("Auto Up") did not start on Draw 2–5 boards that were plainly
finishable, and it could stall silently after it had started. Two independent
root causes, both fixed:

1. **The readiness gate was a proxy, not an answer.** `isAutoCompleteReady` asked
   "is the tableau all face up AND (Draw 1 OR the whole top-right draw area
   empty)". `scheduleAutoQueue` now runs the existing greedy simulation
   (`planAutoActions`) and starts a run only if that simulation clears the board.
   The cheap all-face-up check stays in front of the simulation so the midgame
   hot path is untouched.
2. **Three silent stall paths.** The runner froze forever when its dispatch was
   swallowed by the board lock, and two reducer no-op paths (rejected
   `APPLY_MOVE`, no-op `SCRUB_TO_INDEX`) halted a running queue and returned
   without ever rescheduling.

`MOVE_LOG_VERSION` bumped 1 → 2: auto-queue scheduling is a replay input, so
shipped 1.0 move logs must not replay under the new rules.

Gates green: `yarn typecheck && yarn lint && yarn jest` → 35 suites, 384 tests.

## Description

Auto Up is the feature that finishes a solved-but-tedious board for the player.
It is the last thing a player sees before the win celebration, so when it refuses
to start the game feels broken in the most visible possible moment — the player
is left tapping ~20 cards to the foundations by hand while the app clearly knows
the game is over.

A Draw 3 player reported that the board sometimes just sits there even though
every remaining card only needs to go up to a foundation. Reproducing the report
turned up two unrelated defects: one in *when* a run is allowed to start, one in
*how* a started run keeps itself alive.

## Acceptance Criteria

- A board with every tableau card face up, whose remaining cards can be played to
  the foundations by the auto-complete planner, starts a run **in every draw
  mode** — regardless of what is left in stock or waste.
- A board with every tableau card face up whose run would NOT finish the game
  never schedules anything (no queue, no history push, no animation).
- Auto-complete never re-schedules itself in a loop.
- A run that is interrupted by the board lock (dialog, deal-again, demo launcher)
  resumes by itself when the lock clears.
- An action that changes nothing (rejected move, scrub to the current index) does
  not kill a running auto-complete.
- Existing replay/undo guarantees are untouched: no history snapshot is ever
  pushed without a matching move-log entry.

## Possible approaches

| # | Approach | Pros | Cons |
| - | -------- | ---- | ---- |
| 1 | Keep the proxy, extend it per draw count (e.g. "stock+waste ≤ N") | tiny diff | still a guess; still wrong in both directions |
| 2 | Use `collectReachableWasteTops` (usefulMoves.ts) to decide reachability | already written and tested | answers "is a card reachable", not "does the run finish"; a second, drifting definition of auto-completability |
| 3 | **Gate on the outcome of the existing simulation** (chosen) | exact for the planner we actually run; one definition; fixes both directions at once; no new concepts | runs a bounded simulation on all-face-up boards |
| 4 | Call the Rust solver | strongest possible answer | async, native, way out of proportion for this |

Approach 3 is the only one where the gate and the run cannot disagree: the thing
that decides is literally the thing that will run.

Cost control for approach 3: the cheap `isTableauFullyFaceUp` precondition stays
in front (so nothing changes for the whole midgame), and `planAutoActions` stops
after a second stock pass that planned no move — such a pass provably returns the
pile to the exact state it started in, so a hopeless plan now costs ~2 passes
instead of the 500-iteration cap.

## Open questions to the user

- **Should auto-complete also be allowed to move tableau → tableau?** The planner
  is greedy and only knows tableau-top → foundation, waste-top → foundation and
  waste-top → tableau. A board that a human could still finish, but only by
  moving a run between columns first, is refused and must be finished by hand.
  Options: (a) leave as is — simple, predictable, never starts a run it cannot
  finish; (b) extend the planner with revealing tableau→tableau moves — finishes
  more boards, but a greedy planner can also deadlock itself, and the plan then
  has to be validated anyway (which the new gate does). **Recommendation: (a) for
  this fix**, revisit only if players report it. Noted under Follow-ups.
- **Is "the run finishes the game" the right bar, or should a partial run be
  allowed?** A partial run (send up whatever can go up, then stop) would help
  boards the planner cannot finish, but it would also fire constantly during the
  midgame and take agency away from the player. **Recommendation: keep the
  all-or-nothing bar** — that is what Auto Up means today.

## Dependencies

None. No new packages.

## UX/UI Considerations

No visual change. Behavioural change only, and in the direction players expect:
the run starts in more (correct) situations and stops in fewer (wrong) ones. The
Draw 1 runaway also removed a case where the board animated 500 pointless
draw/recycle steps.

## Components

None added. Changes are in the pure engine (`src/solitaire/klondike.ts`) and one
hook (`src/features/klondike/hooks/useAutoQueueRunner.ts`).

## Related tasks

- `docs/product/move-log-persistence/move-log-persistence-and-resumable-history.md`
  — the R2 review batch there is why the stall fixes are "do not halt" rather
  than "halt and reschedule" (an unlogged history push breaks replay).
- `docs/product/hints/hints-and-unwinnable-warning.md` — `usefulMoves.ts` holds
  the related, but deliberately separate, "is there a useful move" heuristic.

## Simplification ideas

- `isAutoCompleteReady` is gone; what is left (`isTableauFullyFaceUp`) is a
  one-liner with no draw-count special case. The draw count no longer appears in
  the auto-complete logic at all.
- The two reducer stall fixes make the code *smaller* in behaviour terms: an
  action that changes nothing now returns the same state object, which is already
  the contract the rest of the reducer follows (`klondike.moveValidation.test.ts`
  asserts `toBe(state)` on every rejected move).

## Steps to implement

1. **Gate on the simulated outcome.** `planAutoActions` returns
   `{ actions, endState }`; `scheduleAutoQueue` schedules only when `endState` is
   cleared. `isAutoCompleteReady` → `isTableauFullyFaceUp` (cheap precondition,
   also reused by the `SCRUB_TO_INDEX` coalescing check). — **DONE**
2. **Bound hopeless plans.** Stop planning at a second recycle with no move in
   between. — **DONE**
3. **Bump `MOVE_LOG_VERSION` to 2** with a rationale comment. — **DONE**
4. **Runner board-lock fix.** `useAutoQueueRunner` takes `boardLocked`, skips
   arming while locked, and depends on it so unlocking re-arms. Call site in
   `useKlondikeGame` passes the existing `boardLocked` state. — **DONE**
5. **Reducer stall fixes.** Rejected `APPLY_MOVE` and no-op `SCRUB_TO_INDEX`
   return `state` untouched instead of the halted state. — **DONE**
6. **Comment the dead `SELECT_*` paths** (same hole, dead code, not fixed). — **DONE**
7. **Tests** (see Testing). — **DONE**
8. **README + this doc.** — **DONE**

## Plan: Files to modify

- `src/solitaire/klondike.ts`
- `src/features/klondike/hooks/useAutoQueueRunner.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `test/unit/solitaire/klondike.autoUpSetting.test.ts`
- `test/unit/solitaire/klondike.autoQueue.test.ts`
- `test/unit/features/klondike/autoQueueRunner.test.tsx` (new)
- `README.md`

## Files actually modified

- `src/solitaire/klondike.ts` — `MOVE_LOG_VERSION` 1 → 2; `scheduleAutoQueue`
  gates on the plan's end board; `planAutoActions` returns
  `{ actions, endState }` and stops after a no-progress stock pass;
  `isAutoCompleteReady` replaced by `isTableauFullyFaceUp` + `isBoardCleared`;
  rejected `APPLY_MOVE` and no-op `SCRUB_TO_INDEX` return `state`; hazard comment
  on the dead `SELECT_*` cases.
- `src/features/klondike/hooks/useAutoQueueRunner.ts` — `boardLocked` param,
  guard, and dependency.
- `src/features/klondike/hooks/useKlondikeGame.ts` — passes `boardLocked`.
- `test/unit/solitaire/klondike.autoUpSetting.test.ts` — two inverted
  expectations (with a comment explaining why the old ones were wrong) plus two
  new tests (Draw 3 drains to won; all-face-up unplayable board does not
  schedule).
- `test/unit/solitaire/klondike.autoQueue.test.ts` — two new tests for the
  reducer stall paths.
- `test/unit/features/klondike/autoQueueRunner.test.tsx` — new suite (5 tests).
- `README.md` — the Features line was only true for Draw 1.

## Intermediary learnings

- **The old gate was wrong in both directions, and the same change fixes both.**
  Draw 2–5 refused finishable boards; Draw 1 accepted unfinishable ones and then
  looped — `planAutoActions` emitted up to 500 draws/recycles, the runner
  animated all of them, the board was still "ready" at the end, so it scheduled
  another 500, forever, with `scheduleAutoQueue` pushing a history snapshot each
  time. Gating on the simulated end board removes both cases at once.
- **"All four foundations complete" and "nothing left outside the foundations"
  are the same thing for a real deal**, but only the second one also holds for
  the partial-deck fixtures the unit tests build (a 2-card board can never fill
  four foundations). `isBoardCleared` is therefore phrased over stock/waste/
  tableau, which kept four legitimate existing fixture tests meaningful instead
  of forcing them to become 52-card boards.
- **Rescheduling is NOT a safe way to fix a stall.** The obvious fix for the two
  reducer stall paths — call `finalizeState` — would push a history snapshot with
  no matching move-log entry, which is exactly the replay drift the R2 review
  batch (2026-07-06) fixed everywhere else. Not halting in the first place is
  both simpler and drift-free: an action that changes nothing returns the same
  state object, the runner's effect deps never change, and the run continues
  undisturbed.
- **A stock pass with no moves in it is a perfect no-op.** Drawing the whole
  stock leaves the waste as the exact reverse of the stock (independent of draw
  count), and recycling reverses it back — so the board is bit-for-bit where it
  started. That is what makes "stop at the second recycle without a move" safe:
  it can never truncate a winning plan, only a hopeless one. Same reasoning as
  the "≤ 2 passes" bound documented in `usefulMoves.ts`.
- **`useAutoQueueRunner` had zero tests**, which is precisely why the board-lock
  freeze shipped. The regression test only fails without the fix because the
  mock dispatch identity is kept stable across rerenders — an unstable identity
  re-runs the effect by itself and hides the missing dependency.
- **The dead `SELECT_*` cases were verified dead**, not assumed: nothing under
  `src/`, `app/`, `components/`, `modules/` or `scripts/` dispatches them. They
  carry the same hole and a warning comment, but fixing dead code would be
  scope creep.

## Identified issues

- Draw 2–5 boards refused to auto-complete while stock/waste held cards.
  Status: **FIXED** (outcome gate), covered by two rewritten tests.
- Draw 1 auto-complete could reschedule itself forever on an unfinishable
  all-face-up board, growing history each time. Status: **FIXED**, covered by the
  runaway-guard test.
- Auto-queue frozen forever when a dispatch was dropped by the board lock.
  Status: **FIXED**, covered by the runner re-arm regression test.
- Rejected `APPLY_MOVE` / no-op `SCRUB_TO_INDEX` halted the queue and never
  rescheduled. Status: **FIXED** (they are reference-equal no-ops now), two tests.
- `SELECT_TABLEAU` / `SELECT_WASTE` / `SELECT_FOUNDATION_TOP` / `CLEAR_SELECTION`
  have the same hole. Status: **NOT FIXED ON PURPOSE** — dead code, commented.
- Shipped 1.0 move logs would replay with different scheduling under the new
  gate. Status: **HANDLED** via `MOVE_LOG_VERSION` 2 (mismatched logs take the
  stored-snapshot fallback; the board is preserved, only in-game undo history
  from before the update is lost).
- The planner remains greedy (tableau-top → foundation, waste-top → foundation,
  waste-top → tableau). Boards needing a tableau → tableau move first are still
  refused. Status: **ACCEPTED AND DOCUMENTED** (comment in `scheduleAutoQueue`).

## Testing

`yarn typecheck && yarn lint && yarn jest` — 35 suites, 384 tests, green.

New/changed tests, each verified to fail without its fix (by reverting that one
fix in place and re-running the whole suite):

| Test | Fails without fix |
| ---- | ----------------- |
| `autoUpSetting`: starts Auto Up for Draw 2-5 while the stock still holds cards the run will play | yes |
| `autoUpSetting`: starts Auto Up for Draw 2-5 after the final draw even though the waste still holds a card | yes |
| `autoUpSetting`: drains a trivially winnable Draw 3 board all the way to a won state | yes |
| `autoUpSetting`: does not schedule a run it cannot finish on an all-face-up Draw 1 board | yes |
| `autoUpSetting`: starts and finishes a run on a finishable board in Draw 1-5 (5 tests) | yes for 2/3/4/5 |
| `autoUpSetting`: plans a recycle when the run only becomes possible after one | only if the planner bound is tightened (see below) |
| `autoUpSetting`: refuses an all-face-up board that only a tableau to tableau move can finish | yes |
| `autoQueue`: keeps a running auto queue alive when a move is rejected | yes |
| `autoQueue`: keeps a running auto queue alive when a scrub lands on the current index | yes |
| `autoQueue`: drops a queued move that no longer applies and keeps advancing | yes (against a bail-out rewrite of `advanceAutoQueue`) |
| `autoQueueRunner`: does not arm the timeout while the board is locked | yes |
| `autoQueueRunner`: re-arms the run when the board lock clears without any state change | yes |
| `autoQueueRunner`: arms/cadence/idle (3 tests) | no — they pin existing behaviour that had no coverage |
| `autoQueueRunner`: reducer + runner, empties the board once a run starts | yes |
| `autoQueueRunner`: reducer + runner, resumes and finishes a run interrupted by the board lock | yes |
| `autoQueueRunner`: reducer + runner, finishes a run a rejected tap lands in the middle of | yes |
| `autoQueueRunner`: reducer + runner, finishes a run a no-op scrub lands in the middle of | yes |
| `moveLog`: replays a full auto-complete run to the same board and undo depth | yes |
| `gamePersistence`: never restores a stranded auto-complete run from a save taken mid-run | no — pins the invariant that keeps the stale-flag state unreachable |

The four hook-level `autoQueueRunner` cases that drive the real reducer through a
lock-aware dispatcher are the ones that assert what the player sees ("the board
empties itself"); the isolated dispatch-counting cases above them cannot tell a
resumed run from a run that resumes and then stalls one step later.

**The second-recycle planner bound has no behavioural test, and cannot have one.**
Truncating a hopeless plan at ~2 stock passes instead of 500 changes how long the
simulation runs, not what it decides: either way the end board is not cleared and
`scheduleAutoQueue` refuses. Removing the bound entirely leaves all 384 tests
green. What *is* pinned is its safety envelope — tightening it by one step (never
recycling) fails "plans a recycle when the run only becomes possible after one".
The soundness claim behind the bound was re-verified separately: for every draw
count 1-5, stock size 1-24 and waste size 0-5, a full pass plus a recycle returns
the stock bit-for-bit, so a third pass can only repeat the second. (`getNextStockDrawCards`
reverses each drawn chunk, which is what makes the round trip exact.)

Not done here (no device access in this workspace): on-device verification of a
real Draw 3 endgame and of the board-lock resume. Worth one smoke pass on the
device — deal a Draw 3 game, play it until the tableau is all face up with cards
still in stock/waste, and confirm the run starts and finishes.

Known hole, not reachable today and deliberately not "fixed": `HYDRATE_STATE`
with Auto Up on keeps an incoming `isAutoCompleting: true` that carries an empty
queue, and nothing would ever clear it (the runner only arms on a non-empty
queue). Every producer of a hydration payload forces both fields off —
`snapshotFromState`/`cloneSnapshot` hardcode them, and the replay path rebuilds
them coherently — so the state cannot be reached; the persistence test above pins
the producer side rather than adding a defensive reducer branch.

## Follow-ups

- **Extend the planner with revealing tableau → tableau moves.** Pro: finishes
  the handful of boards that currently need manual play. Con: a greedy planner
  can shuffle runs pointlessly, and the search space grows; the outcome gate
  makes it safe to try (a bad plan is simply never scheduled), so this is a
  cheap experiment if players ask for it. Recommendation: wait for a report.
- **Consider dropping `MAX_AUTO_COMPLETE_ITERATIONS`.** With the no-progress stop
  the loop now terminates on its own for every board; the 500 cap is a safety net
  only. Recommendation: keep it — it is one line and it is the kind of guard that
  earns its keep.
- **The board lock and the auto queue are two independent "who may act now"
  systems.** They were reconciled here by passing the flag into the runner. If a
  third such system appears, a single `interactionsLocked` source of truth would
  be worth it. Recommendation: not now.
