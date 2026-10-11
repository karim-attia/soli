# Rewind to last winnable move

## User prompt

> you can press and hold undo to go back to the move where you can still solve the deck, but this is not clear. Can we improve the UX somehow?

> [2026-09-10, round 3] don't show the warning or rewind while there are still possible moves. Only show it when there are no moves left at all. hint should work until there are no possible moves and then rewind should take you back to the point where you could have done something differently to win

> [2026-09-10, after the first five commits] Add a demo fixture `soli://?demo=deadend` that deals a deterministic game and replays it into a position that is *provably unwinnable*, while the earlier part of its history is *provably winnable*, so a rewind boundary genuinely exists and the feature can be exercised in one link. The dead end must be real, not assumed: verify with the Rust solver that the position after the bad move(s) is `unsolvable` and the position before them is `solved`. Plus: `?set=warnings:unwinnable` did not apply on a physical phone while `hintButton:on` and `rewind:on` in the same link did — investigate `resolveWarningLinkUpdate` and the `?set=` parsing, fix it if it is a bug, and say what else could explain the device behaviour if it is not.

## Summary

Three independent changes on branch `feat/rewind-to-last-winnable-move`, in twelve commits.

1. **Rewind to last winnable move** (opt-in setting, default off). While a solver-proven warning is outstanding, the app binary-searches the game's timeline for the deepest position it can still *prove* winnable, marks it on the scrubber track, and offers one pill that jumps straight there via the existing `SCRUB_TO_INDEX`.
2. **The undo-scrubber hint schedule was loosened** from lifetime > 50 / streaks 10-20-30 to lifetime > 8 / streaks 3-6-9, because the old schedule almost never fired — which is *why* the player in the prompt had never learned the real gesture.
3. **Two solver-verified warning fixtures**, named after the warning MODE each one trips:
   - `soli://?demo=unwinnable` / `yarn unwinnable` (originally `deadend`, kept as an alias) — lost but NOT stuck: legal moves remain, only the solver knows the game is over. Trips the `unwinnable` mode.
   - `soli://?demo=stuck` / `yarn stuck` — satisfies the shipped DEFAULT `noUsefulMoves` predicate exactly (`stock.length === 0 && !hasUsefulMove(board)`) AND is solver-proven unsolvable. This is the mode that ships and the one players see.
   Both are also buttons in the Run Demo sheet under FIXTURES. Every other interesting state in this app has a fixture; the states this feature actually needs did not, so reaching one meant dealing random games until one died.

**The user's product rule needs no code change.** "Don't show the warning or rewind while there are still possible moves; only show it when there are no moves left at all" is *already* what the shipped default `noUsefulMoves` mode does — `useHint`'s background check fires on `board.stock.length === 0 && !hasUsefulMove(board)`, then confirms with the solver, and the rewind is gated on that same outstanding warning. The `unwinnable` mode is the stricter opt-in that warns the moment the game is provably lost, which is what was switched on during device testing and what the report was actually about. **Do not "fix" the trigger logic** — see "Intermediary learnings" 10.

Status: code complete, all three gates green (`yarn typecheck && yarn lint && yarn jest` → 41 suites, 445 tests) plus `cargo test -p soli-solver-ffi` (18 tests). The `unwinnable` fixture is **verified on a real phone** (`[rewind] boundary=81 timeline=83`, Rewind pill live). The `stuck` fixture is **not yet device-verified** — see "Testing". A code review round then fixed six findings, four of them in the hook — see "Review round" below; the device checks it changed are marked there.

## Description

The prompt is factually wrong about the current app in both halves, and the reframing *is* the feature. See "Intermediary learnings" — that section is the justification for everything below.

What the player is really doing today: they turn on the unwinnable warning, see "No winning moves left", tap Undo once, wait out the 600 ms background-solver debounce, see whether the warning comes back, and repeat. That is a **linear search performed by hand**, with no feedback about where the boundary is. The app already has everything needed to do that search properly and show the answer — it just never did.

Why it is cheap: `useHint.ts` already documents the invariant that a forward move can never revive a dead game. Winnability is therefore monotonically decreasing along a play line, so the timeline splits into a winnable prefix and an unwinnable suffix and the boundary is a **binary search**: ~7 solver calls for a 100-move game instead of ~100. Measured solver cost (`docs/product/hints/hints-and-unwinnable-warning.md`): median 0.5 ms, played-out positions proved dead in single-digit ms.

Why it is nice: it turns the most frustrating moment in the game ("you already lost, ten moves ago, good luck finding out where") into one tap plus a visible mark on the timeline. And it costs nothing when off.

## Acceptance Criteria

| When | Then |
|---|---|
| Setting off (default) | Nothing changes anywhere. No extra solver calls, no marker, no pill. |
| Setting on, no warning showing | Nothing changes. The search only runs while a warning is outstanding. |
| Setting on, warning outstanding, boundary proven | A **Rewind** pill appears in the dock's left half (`testID rewind-to-winnable`), and an amber tick appears on the scrubber track at that index while dragging. |
| Rewind pressed | The board walks back to that index one move per step via `SCRUB_TO_INDEX`. History, redo and the move log behave exactly as after a manual scrub. The warning clears at the first step (the scrub exits the dead era) but the **marker stays** on the boundary; the pill goes inert during the walk and hands its slot back once the board is standing on the boundary. |
| Player drags the scrubber towards the marker | The marker stays put for the whole drag, including when the thumb lands on it and when it goes past — that is the affordance. It is retired the moment the player commits a MOVE outside a warning (see "the boundary's lifetime"). |
| Setting on, warning outstanding, **nothing** proven winnable (e.g. the deal itself was unwinnable, or the solver ran out of budget) | Nothing is shown. The feature never claims a boundary the solver did not prove. |
| Hint button also on, warning outstanding | The Rewind pill takes the Hint button's slot for as long as there is something to rewind — which outlasts the warning itself, since walking back exits the dead era at the first step. It hands the slot back once the board is standing at or below the boundary. |
| Undo hint | Fires after 8 lifetime undo taps + a 3-undo streak (was 50 + 10). |

## Possible approaches

**The search itself**

- **A. Binary search over history snapshots (chosen).** Pros: ~log2(n) solver calls; provably correct given the monotonicity invariant the app already relies on; no new persistence, since `GameState.history` is already `GameSnapshot[]` and `buildSolverRequest` accepts any snapshot. Cons: needs care around `unknown` verdicts (see below).
- B. Linear scan backwards from the current position. Pros: trivially correct, no monotonicity assumption. Cons: ~100 solver calls on a long game, and it is exactly the thing the player is already doing by hand.
- C. Track winnability incrementally as the game is played. Pros: answer is always ready. Cons: a solver call after *every* move even when the feature is never used; the background check already only runs in `unwinnable` mode.

**Where the action lives**

- **A. A pill in the dock's left half, taking the Hint button's slot while a warning is outstanding (chosen).** Pros: the only place a tappable control fits (the pan's `hitSlop` claims 50 px *above* the Undo pill, so nothing tappable may sit there); during a dead era the Hint button is inert anyway — a press only re-affirms the warning (useHint F15 decision table, case 1). Cons: the re-affirm pulse is unreachable while the Rewind pill is up. Accepted: the pill is the better answer to the same question.
- B. A button inside the warning bubble. Cons: `GameNoticeBubble` is `pointerEvents="none"` and sits in the pan's hitSlop band; making it tappable would steal touches from the gesture.
- C. A third pill in the dock. Cons: no room without shrinking the Undo pill or entering the hitSlop band.

**`unknown` verdicts.** Treated as budget exhaustion, never as a verdict. The search widens to a neighbouring index rather than guessing a direction, and the returned index is always one the solver answered `winnable` for. If nothing can be proven the feature renders nothing.

## Open questions to the user

1. **Should the rewind also be offered in `noUsefulMoves` (classic) warning mode, or only in `unwinnable` mode?** Implemented: **both**. Reasoning: a dead era only ever starts on a solver `unsolvable` verdict — both `fireWarning` call sites in `useHint` are inside `status === 'unsolvable'` branches — so an outstanding warning in *either* mode already means the position is proven lost. Restricting to `unwinnable` would withhold a correct answer from the default warning mode for no reason. Trade-off: in `noUsefulMoves` mode the boundary may be far back (the game often died long before the deck played out), which could feel like a bigger jump than the player expects. Alternative if that reads badly on device: gate on `warningMode === 'unwinnable'` only — a one-line change.
2. **Should the pill hide the Hint button, or should the Hint button win?** Implemented: the pill wins while the warning is up. Alternative: keep Hint and drop the pill when both want the slot — rejected, since the Hint button does nothing useful inside a dead era.
3. **Copy: "Rewind".** Alternatives considered: "Last winnable" (accurate, too long for the pill), "Go back" (vague). The a11y label carries the full meaning: "Rewind to last winnable move".

## Dependencies

None new. The only `package.json` changes are the `yarn unwinnable` / `yarn stuck` / `yarn deadend` scripts (all `scripts/deeplink.js` shortcuts, no dependency).

## UX/UI Considerations

- The dock is deliberately plain React Native + Reanimated. Tamagui / expo-ui controls conflict with the pan gesture, which is why the Hint button is a bare `Pressable` placed **outside** `GestureWrapper`. The Rewind pill follows that pattern exactly and reuses `styles.hintButton`.
- Nothing tappable may live in the 50 px band above the Undo pill (the pan's `hitSlop`).
- The marker is a 3 pt amber (`COLOR_HINT`) tick, centred on the thumb centre for that index, so "drag until the thumb covers the tick" lands on exactly the marked move. It is only visible while the scrub overlay is up, i.e. while dragging.
- Both surfaces read the **same** computed index, so they cannot disagree.
- Every new interactive element carries an `accessibilityLabel` and a `testID`. The marker sits inside the already-`accessible` track node, so it cannot carry its own label — the index is appended to the track's label instead, prefix unchanged so existing recipes keep matching.

## Components

Reused: `DescribedSwitchRow` (settings row), `GameNoticeBubble` / `UndoHintBubble` (unchanged — no third bubble style invented), `UndoScrubber` (pill + marker added), the existing `SCRUB_TO_INDEX` action.

New: `src/solitaire/winnableBoundary.ts` (pure search), `src/features/klondike/scrubberMarker.ts` (pure geometry), `src/features/klondike/hooks/useRewindToWinnable.ts` (the async driver), `createUnwinnableGameState` and `createStuckGameState` in the existing `src/solitaire/demoReplay.ts` (deliberately NOT new modules: they reuse `getReplayFixtureEntry` / `foldReplayFixture` / `applyDemoReplayMoveForValidation` alongside the scrubbed and near-win fixtures; `getReplayFixtureEntry` gained an entry-index parameter because the stuck fixture needs a different deal).

## How to fetch data, how to cache

No new persistence. `GameState.history` is already `GameSnapshot[]` and every snapshot carries the full board (stock, waste, foundations, tableau, drawCount), so `buildSolverRequest` can be pointed at any historical position directly.

Solver traffic goes through **useHint's existing replace-latest queue**, borrowed via its return value, so two solves can never overlap. The whole search is enqueued as a **single** task: the queue is replace-latest, so a job split across several queued tasks could have one silently dropped mid-run. In practice there is no contention — while a dead era is outstanding `useHint` issues zero solver calls (the era gates the background check, and a hint press only re-affirms), which is exactly when the search runs.

The result is cached in hook state keyed on the **warning era**, not the position: playing on inside a dead era changes the position key but, by the `DeadEraMarker` invariant, cannot change what the era means. So the search runs once per warning, not once per move.

## Related tasks

- `docs/product/hints/hints-and-unwinnable-warning.md` — the warning model, the dead-era invariant, solver budgets and measured costs.
- `docs/product/undo-scrubber-hint/undo-scrubber-hint.md` — the discovery hint; see its new "v5" section for the schedule change made here.

## Simplification ideas

- The search is a *generic* function over `readonly TSnapshot[]` plus a probe. That is both simpler (no klondike import) and what makes it testable with a fake solver.
- No new reducer action, no `MOVE_LOG_VERSION` bump, no new persisted state, no new bubble component, no second solver queue.
- `useHint`'s `warningText` memo was refactored into an `activeDeadEra` memo that both `warningText` and the new `warningEraKey` derive from — one gate instead of two copies of the same condition.
- Rejected as gold plating: an animated fly-to-marker transition; a confirmation dialog before the jump (undo/redo already covers regret); showing *how many* moves back the boundary is.

## Steps to implement

1. [x] Pure boundary search `src/solitaire/winnableBoundary.ts` + unit tests.
2. [x] Setting `hints.rewindToWinnable` (default off) + `DescribedSwitchRow` in the Gameplay section + `?set=rewind:on` deep-link key + tests.
3. [x] `useHint` exposes `warningEraKey` and `enqueueSolve`.
4. [x] `useRewindToWinnable` hook (search driver + `SCRUB_TO_INDEX` dispatch).
5. [x] Pure marker geometry `scrubberMarker.ts` + unit tests.
6. [x] `UndoScrubber`: Rewind pill (left slot) + amber track marker + a11y label suffix.
7. [x] Wire everything in `useKlondikeGame`.
8. [x] Loosen the undo-hint schedule (own commit) + update its plan doc and the testing skill.
9. [x] Testing skill: `?set=rewind` row, the combined verification link, a11y matrix rows.
10. [x] This plan doc.
11. [x] Unwinnable fixture `createUnwinnableGameState` + solver verification + unit tests + a pinned Rust test.
12. [x] `?demo=unwinnable` deep link, `yarn unwinnable` shortcut, `scripts/deeplink.js` entry.
13. [x] Testing skill: catalog rows, shortcut rows, decision-tree entry, `?set=` troubleshooting row.
14. [x] Investigate the `?set=warnings:unwinnable` device report (see "Identified issues" #5) + regression tests.
15. [x] Rename the first fixture `deadend` → `unwinnable` everywhere (constants, deep link, yarn script, docs), `deadend` kept as an alias.
16. [x] Stuck fixture `createStuckGameState` for the DEFAULT warning mode + solver verification + a pinned Rust test + the stuck predicate asserted in jest.
17. [x] `?demo=stuck` deep link, `yarn stuck` shortcut, deep-link routing tests for both fixtures (incl. the `deadend` alias).
18. [x] Run Demo sheet: "Unwinnable game" and "No useful moves" buttons under FIXTURES.
19. [ ] **Device verification of the STUCK fixture by the orchestrator** — see "Testing".

## Plan: Files to modify

New: `src/solitaire/winnableBoundary.ts`, `src/features/klondike/scrubberMarker.ts`, `src/features/klondike/hooks/useRewindToWinnable.ts`, `test/unit/solitaire/winnableBoundary.test.ts`, `test/unit/features/klondike/scrubberMarker.test.ts`, this doc. The review round added `components/settings/settingsRowColors.ts`, `test/unit/features/klondike/rewindToWinnable.test.tsx` and `test/unit/components/settingsRowColors.test.ts`.

Modified: `src/state/settings.tsx`, `app/(tabs)/settings.tsx`, `src/features/klondike/hooks/useHint.ts`, `src/features/klondike/hooks/useKlondikeGame.ts`, `src/features/klondike/hooks/useDemoGameLauncher.ts`, `src/features/klondike/components/UndoScrubber.tsx`, `src/features/klondike/undoHint.ts`, `src/features/klondike/hooks/useUndoHint.ts`, `test/unit/state/settingsHints.test.ts`, `test/unit/features/klondike/demoLinkParsing.test.ts`, `test/unit/features/klondike/undoHint.test.ts`, `.agents/skills/soli-testing/SKILL.md`, `docs/product/undo-scrubber-hint/undo-scrubber-hint.md`.

## Files actually modified

Exactly as planned above. Twelve commits:

1. `Add pure winnable-boundary binary search`
2. `Add the "Rewind to winnable" setting and its deep-link key`
3. `Offer "rewind to last winnable move" while a warning is showing`
4. `Loosen the undo-scrubber hint schedule so it actually fires`
5. `Document rewind-to-winnable and its verification recipe`
6. `Add a solver-verified "dead end" demo fixture`
7. `Reach the dead-end fixture via soli://?demo=deadend`
8. `Pin the ?set=warnings:unwinnable link path end to end`
9. `Document the dead-end fixture and the ?set=warnings finding`
10. `Rename the dead-end fixture after the warning mode it trips`
11. `Add a solver-verified stuck fixture for the default warning mode`
12. `Document the stuck fixture and the two-fixture naming`

The dead-end round added: `src/solitaire/demoReplay.ts` (`createDeadEndGameState`), `test/unit/solitaire/demoReplay.deadend.test.ts` (new), `rust/soli-solver-ffi/tests/solver_tests.rs` (`dead_end_demo_fixture_boundary_is_real`), `src/features/klondike/hooks/useDemoGameLauncher.ts`, `package.json`, `scripts/deeplink.js`, `test/unit/features/klondike/demoLinkParsing.test.ts`, `.agents/skills/soli-testing/SKILL.md`, this doc.

## Intermediary learnings

**1. The premise of the user prompt is factually wrong about the current app — in both halves. This reframing is the whole justification for the feature.**

- *"You can press and hold undo"* — **there is no press-and-hold.** The undo pill carries `Gesture.Exclusive(undoPanGesture, undoTapGesture)` (`useUndoScrubber.ts:449`). A tap undoes one move; a horizontal **drag** (`.minDistance(5)`) opens the scrubber. A hold with no movement does nothing at all and falls through to the tap on release. The player had invented a gesture.
- *"…to go back to the move where you can still solve the deck"* — **nothing in the app computes that.** What the player is actually doing is reacting to the unwinnable warning, stepping back one move, waiting out the 600 ms background-solver debounce, and repeating until the warning stops re-appearing. A linear search by hand; the app never showed them the boundary.

So the report is not a bug report and not a request for a tooltip. It is a player describing a feature they *assumed* existed, plus evidence that they were never taught the gesture that does exist. Both halves became work: build the feature, and fix the discoverability of the gesture they misunderstood. Answering only the literal question ("make the press-and-hold clearer") would have documented a gesture that does not exist.

**2. Both warning modes are solver-proven, not just `unwinnable`.** Easy to assume the classic "no more useful moves" warning is heuristic-only. It is not: both `fireWarning` call sites in `useHint` sit inside `status === 'unsolvable'` branches, with the heuristic acting only as a cheap gate *before* the solver call. So an outstanding warning in either mode means the position is proven dead, and the rewind is meaningful in both.

**3. The dead era makes solver contention a non-issue.** While a warning era is outstanding, `useHint` issues zero solver calls — the era gates the background check entirely, and a hint press only re-affirms the warning. That is exactly when the boundary search runs, so borrowing the same replace-latest queue costs nothing. But the search must be enqueued as **one** task: split across several, a competing enqueue would silently drop one and the search would await a promise that never runs.

**4. The timeline index space is invariant under scrubbing; the history array is not.** Searching `[...history, current, ...future]` (exactly how `scrubToIndex` builds it) rather than just `history` means an undo inside the dead era moves entries between `history` and `future` without changing any index — so the computed boundary stays valid without recomputation.

**5. Mutation testing caught a test that proved nothing.** The first `unknown`-handling fixture placed the unproven position at a spot the binary search never probes, so the case passed against an implementation that treated `unknown` as a verdict. Fixtures now put the `?` exactly on a search midpoint, and the suite is verified to fail against three mutations (unknown-as-unwinnable, unknown-as-winnable, dropped probe cache). Lesson worth keeping: a test for a *search* has to be written against the search's actual probe order.

**6. A dead end has to be searched for, not designed — and one bad move is enough at the right moment.** The first instinct ("bury a needed card") is unworkable by hand: at 80 steps into playlist entry 0 the board has exactly **two** legal non-draw moves, so the space of "deliberately bad" moves is tiny and none of them kills anything. The method that worked was mechanical: enumerate every legal move (draws included) breadth-first from the fold point, dump each resulting board as a `buildSolverRequest` JSON, and let the Rust solver rank them. That found a 2-step kill on the first pass, and the killing move turned out to be one a *real player would make* — the K♠ into the only empty column. Filling that column blocks the sole route to unload the column hiding the A♠, and the solver flips from `solved` to `unsolvable` on that one move. Both throwaway harnesses (a jest generator, a `cargo run --example` verdict printer) were deleted; what stayed is the pinned pair of verdicts.

**7. Pinning the verdicts needs BOTH sides, because neither half can catch drift alone.** The TS fixture throws on playlist drift (`applyDemoReplayMoveForValidation`), but it cannot prove the resulting board is dead — the solver is not reachable from jest. The Rust test can prove a board is dead, but it only knows the board someone typed into it. So the TS suite pins the exact `buildSolverRequest` JSON the fixture produces and the Rust suite pins that same JSON's verdict: drift on either side fails a gate. Pinning only the Rust half would have left a fixture that could quietly become winnable again.

**8. `?set=warnings:unwinnable` is NOT a parsing bug — the whole link path is correct, end to end.** The device report was investigated by driving the *real* `processDemoLink` (not just the pure parser) with the real URL, and it applies `warningMode: 'unwinnable'` correctly with the `#retry-<nonce>` fragment present, with the key first, middle or last in the list, and via the `unwinnableWarning:on` alias from the default mode. `resolveWarningLinkUpdate` is also correct in both directions: `{set: <mode>}` is unconditional, and every alias row of the truth table was re-derived. The refuse-to-downgrade rule only ever guards `stuckWarning:*`, never an upgrade to `unwinnable`. See "Identified issues" #5 for what can explain the device observation instead — the leading candidate is that `warnings:unwinnable` is the one key in that link with **no immediately visible effect**, which is exactly the gap the dead-end fixture closes.

**9. A heuristically stuck board is usually still winnable — the two-sided pin caught it.** The obvious way to build the stuck fixture is to search for `stock.length === 0 && !hasUsefulMove(board)` and stop. That is wrong, and the Rust half of the pin proved it: the first candidate found this way came back `solved`, and so did all 100 in the next batch, and 338 of the 2269 in the batch after that. The reason is by design — `hasUsefulMove` deliberately ignores non-revealing rearrangements AND foundation digs, while the solver uses both. The app already knows this (it solver-confirms before warning, and `console.warn`s the false positive), so a fixture that only satisfied the predicate would have shown **no warning at all** on device. The goal test had to be "predicate AND solver-`unsolvable`", which is only answerable by generating candidates in TS and ranking them in Rust.

**10. `!hasUsefulMove` is trivially true on a WON board.** An early sweep triumphantly "found" stuck positions in six different playlist entries; every one of them was just the game being finished (paths of nothing but kings going to foundations). The goal test needs `!hasWon` — and the fixture test pins `hasWon === false` for the same reason.

**11. The user's "only warn when there are no moves left" rule is already shipped — do not re-implement it.** `useHint`'s background check fires the default warning on exactly `board.stock.length === 0 && !hasUsefulMove(board)` (plus solver confirmation), and the rewind is gated on an outstanding warning, so hints keep working right up to that point. The report that prompted this round came from a device session running the opt-in `unwinnable` mode, which warns as soon as the game is provably lost — earlier, and by design. The fix was a **fixture and a naming** problem, not a behaviour problem. That is also why the fixtures are now named after the mode they trip.

**12. Finding the stuck board needed a heuristic search, not brute force.** Plain BFS from a fold point exhausts at ~15k states by depth 10 and finds nothing; 400k states of BFS still found nothing. What worked was best-first search on a *witness count* — a variant of `findFirstUsefulMove` that counts all six rules' hits instead of returning the first — descending toward zero. Entry 0 gets to a single remaining witness at many fold points but its shortest genuine stuck-and-unwinnable position is 34 moves off the solution line; entry 19's is four. Hence the fixture uses a different playlist entry, and `getReplayFixtureEntry` now takes an index.

**13. The undo-hint's 3/6/9 schedule is not a new guess.** The v2 Android smoke (2026-07-07) was run at exactly lifetime > 0 / streaks 3/6/9 and all seven checks passed. The shipped 50 / 10-20-30 values were the conservative guess that was never validated as a *discoverable* schedule.

## Review round

Six findings from a code review of the finished branch. Four were behavioural and are covered by a new hook-level suite (`test/unit/features/klondike/rewindToWinnable.test.tsx`, 20 cases, verified to fail against six mutations — one per mechanism).

**1. The boundary now outlives the warning era that produced it.** The bug was structural, not cosmetic: `useHint` nulls the era as soon as `history.length` drops below the warn depth, and the search effect nulled the boundary whenever the era went null. The first committed scrub step does exactly that — so the marker unmounted while the player was dragging towards it, an overshoot could never be corrected (no era, no re-search), and one step into the stepped playback the pill flipped back to Hint.

**The lifetime, spelled out** (the hook carries the same text): a proven index stays valid for as long as the player is still *walking back* through the line it was proven on — same deal, and no committed MOVE since the era ended. Undo, redo and every scrub step preserve `moveCount` and the timeline's index space (`scrubToIndex`), so the whole walk keeps the proof pointing at the same position. A committed move outside a live era ends the walk: either the rewind was taken and the player is playing on, or they diverged onto a line the proof says nothing about (a move below the boundary truncates the future and rewrites every index above it). Inside a live era, playing on cannot invalidate anything (`DeadEraMarker`), so the reference point tracks the board. Hard resets on top: new deal / hydrate (`exactId`), the setting, the warning mode. Two render-time gates (`exactId`, and the timeline still extending past the index) mirror the effects so a stale marker cannot survive even one frame.

Consequence for the surfaces: `rewindIndex` (the marker) and `rewindAvailable` (the pill) are now separate. Same index — they still cannot disagree about *where* — but the marker stays up while the thumb is ON the boundary or below it, where there is nothing left to rewind.

**2. Playback abandons on interference in BOTH directions.** `step()` bailed on `current <= index`, i.e. only on backward movement; a scrub or redo forward during the walk kept dragging the player back down, and walked the new, longer distance at the delay computed for the original one. It now records where each step left the board and abandons on any mismatch — which is what the code comment already claimed. Chosen over correcting the comment because the comment describes the better behaviour: fighting the player for control of the board is never right, and the pill survives the abandon now, so a stopped walk is one tap from resuming.

**3. The generation guard is checked per probe.** It was checked before the search and after it resolved, never in between, so a superseded search kept issuing up to `MAX_BOUNDARY_PROBES` (24) native solves at an 800 ms budget while holding the shared queue that `useHint` needs to re-evaluate the warning. An `isCurrent()` check is now threaded into the probe and returns `'unknown'`, which the search already treats as a non-answer: it widens (three more probes that short-circuit the same way) and returns, and the post-search check drops the result.

**4. `rewinding` is wired up.** It was returned with a comment claiming the dock used it, and nothing did. The pill now renders dimmed (`UNDO_BUTTON_DISABLED_OPACITY`, the dock's existing disabled look) and `disabled` while the walk runs, and the hook refuses a re-entrant press as well — visual state alone cannot close the gap between the press and the next render.

**5. `REWIND_PLAYBACK_MIN_STEP_MS` stays at half a card flight (45 ms); the comment was the thing that was wrong.** It claimed long rewinds never drop below one card flight per step, which the value contradicted (and the test name did not). Kept at 45 ms deliberately: a 90 ms floor makes a 40-move rewind take 3.6 s and a 100-move one nine seconds, with the pill inert throughout — a worse answer to "show me what is being undone" than flights that overlap on a walk that is all in the same direction. Past ~20 steps they do overlap; the comment now says so, and a test pins `MIN === CARD_ANIMATION_DURATION_MS / 2` so the constant, the comment and the suite cannot drift apart again.

**6. The disabled settings row uses ONE gray, not a darker one.** `DISABLED_DESCRIPTION_COLOR = '#5A5A5F'` was *darker* than the enabled `#8E8E93`, which reads as muted on a light row and as ~2.5:1 (invisible) on a dark one. The row has no theme context, and that is the whole problem: "muted" means lower contrast, and lower contrast is lighter on a light ground but darker on a dark one, so **no single hex can be muted on both**. So there is no third value any more — the description keeps the secondary gray in both states and the disabled signal is the LABEL dropping to it plus the inert switch. The two values moved to `components/settings/settingsRowColors.ts` (also de-duplicating the literal in `WarningModePreference`), where `test/unit/components/settingsRowColors.test.ts` pins their WCAG contrast against a light row, a dark row and pure black, and pins that the rejected `#5A5A5F` really does fail on dark.

## Identified issues

| # | Issue | Status |
|---|---|---|
| 1 | The Rewind pill hides the Hint button while a warning is outstanding, so the hint-press re-affirm pulse is unreachable during that time. | Accepted by design (the pill answers the same question better). Revisit if it reads badly on device. |
| 2 | In `noUsefulMoves` mode the boundary can be far back, so the jump may feel bigger than expected. | Open — needs a device opinion. One-line fix available (gate on `unwinnable` only). |
| 3 | The marker is only visible while the scrub overlay is up (i.e. while dragging), so a player who never drags only ever sees the pill. | Accepted: the pill is the discoverable surface; the marker is for players already in the gesture. |
| 4 | If a game is already unwinnable at the deal (possible with "Solvable deals" off), the search proves nothing winnable and the feature shows nothing. | Correct by design — verify it on device (test 6 below). |
| 6 | The Run Demo sheet's FIXTURES section now has two rows instead of one. The sheet's own comment budgets ~4 rows + 4 headers before the Android detent clips it. | Open — needs a device look. If it clips, the cheapest fix is merging all four fixtures into one row with shorter labels, or moving the two warning fixtures behind the existing Testing row. |
| 5 | Device report: `?set=warnings:unwinnable` "did not apply" while `hintButton:on` / `rewind:on` in the same link did. | **No bug found; no fix made** (learning 8). The link path is now covered end to end by `demoLinkParsing.test.ts` (`?set= links through processDemoLink`). Remaining explanations, most likely first: (a) it *did* apply, but `warnings:unwinnable` is the only key in that link with no immediately visible effect — the warning fires only once the solver proves the CURRENT position dead, which on a live deal may never happen; (b) the settings write is async (`Storage.setItem`) and the fixture shortcuts force-stop by default, so a cold link fired right after a `?set=` link can drop the pending write — that would lose all three keys, but a re-check after only the *visible* two had already been confirmed would read as "warnings didn't apply"; (c) the phone ran a build older than the `warnings:` key. Diagnosis recipe added to the testing skill's troubleshooting table (the `[Demo] Settings link applied` / `ignored unknown pair` log lines answer "did it parse?" directly). Reopen with a `[SoliDev]` log capture if it recurs. |

## Testing

**Gates (run after every step, all green):** `yarn typecheck && yarn lint && yarn jest` → 41 suites, 445 tests (38/408 before the fixtures, 39/420 before the review round). Both fixtures also have a Rust gate: `cd rust && cargo test -p soli-solver-ffi` → 18 tests (not part of the JS gates; run it if you touch the fixture constants). Note: plain `cargo test` fails to compile the vendored lonelybot lib tests — pre-existing, unrelated, use `-p soli-solver-ffi`.

Unit coverage added:

- `test/unit/solitaire/winnableBoundary.test.ts` — monotone timeline; boundary at index 0; boundary at the last index; all-winnable; all-unwinnable; empty timeline (zero solver calls); binary-search-not-scan (63 positions in ≤ 8 probes); `unknown` widening left and right; never claiming an unproven index; never re-probing a cached `unknown`; probe budget honoured. Verified to fail against three mutations.
- `test/unit/features/klondike/scrubberMarker.test.ts` — marker centres on the thumb centre for the same index; both ends of the travel; linear in between; clamping; degenerate track width / slider max. Verified to fail against three mutations.
- `test/unit/state/settingsHints.test.ts` — new toggle's default, round-trip, `current`-not-`DEFAULT` fallback, junk values, and that pre-feature payloads (including legacy `hintsEnabled:true`) leave it off.
- `test/unit/features/klondike/demoLinkParsing.test.ts` — `rewind:on` / `rewindToWinnable:off` / combined with `warnings:`, and junk values landing in `ignoredPairs`. Plus (issue #5) an end-to-end `?set= links through processDemoLink` block that renders the real hook and delivers a real `soli://` URL: `warnings:unwinnable` next to the other keys, with the `#retry-<nonce>` fragment, with the key not last, and through the `unwinnableWarning:on` alias.
- `test/unit/features/klondike/undoHint.test.ts` — updated to the 3/6/9 schedule, with the constants pinned directly so a silent drift back to 10/20/30 fails.
- `test/unit/features/klondike/rewindToWinnable.test.tsx` (review round) — hook-level, on the `hintWarnings.test.tsx` harness pattern: the boundary's whole lifetime (survives the era exit, survives landing on the marker and overshooting it, retires on resumed play / divergence / new deal / setting / mode change, never re-searches while scrubbing), the per-probe generation guard, and the stepped playback (walks one move per tick, abandons on forward AND backward interference, ignores a re-entrant press, stops on a new deal). Ends with a test that pins the two REDUCER facts the lifetime rule rests on, so the suite's synthetic boards cannot drift from production. Verified to fail against six mutations.
- `test/unit/components/settingsRowColors.test.ts` (review round) — WCAG contrast for the settings-row text colours against a light row, a dark row and pure black, plus a guard proving the threshold rejects the colour the finding was about.
- `test/unit/solitaire/demoReplay.unwinnable.test.ts` — the fixture's recipe constants, deal identity, Auto Up off, timeline depths (82 snapshots / 82 move-log entries), determinism, the king landing in the only empty column, that the board is **lost but not stuck** (the property that separates it from `?demo=stuck`), the replay validation throwing when the killing move is applied one step early, and the exact `buildSolverRequest` JSON for both boards.
- `test/unit/solitaire/demoReplay.stuck.test.ts` — the same shape for the stuck fixture, plus **the shipped stuck predicate asserted directly** (`stock.length === 0 && !hasUsefulMove(state)`, and `hasWon === false`), that the position before the killing moves still HAS a useful move (so a boundary exists), and that the A♠ ends up buried with an empty spade foundation.
- `test/unit/features/klondike/demoLinkParsing.test.ts` — `?demo=unwinnable`, `?demo=stuck` and the `?demo=deadend` alias each routed through the real `processDemoLink` and compared by board signature against the fixture factories.
- `rust/soli-solver-ffi/tests/solver_tests.rs` — `unwinnable_demo_fixture_boundary_is_real` and `stuck_demo_fixture_boundary_is_real` pin `solved` before the killing move(s) and `unsolvable` after.

### What the orchestrator must verify on the simulator

Not verified by this branch — the agent that wrote it was code-and-unit-tests only. Read `.agents/skills/soli-testing/SKILL.md` first. All links below need `--ios` when targeting the simulator.

**Setup**

```bash
# Default warning mode (what players see) — the STUCK fixture:
yarn deeplink 'soli://?set=warnings:stuck,rewind:on' --ios
yarn stuck --ios

# Opt-in solver-proven mode — the UNWINNABLE fixture:
yarn deeplink 'soli://?set=warnings:unwinnable,rewind:on' --ios
yarn unwinnable --ios
```

These replace the old recipe ("play badly on purpose until the warning appears"), which took minutes and produced a different board every time. Both fixtures land on positions the solver has been *proven* to call `unsolvable`, on histories with a *proven* `solved` position a few moves earlier, so the warning fires ~600 ms after load and the boundary the Rewind pill offers is a hard number:

| Fixture | Warning mode | Expected log line |
|---|---|---|
| `yarn unwinnable` | `unwinnable` | `[rewind] boundary=81 timeline=83` (verified on device) |
| `yarn stuck` | `noUsefulMoves` (default) | `[rewind] boundary=210 timeline=215` (not yet device-verified) |

Anything else is a bug in the search, not in the fixture — the verdicts are pinned in both suites, so these are expectations, not observations. Both fixtures are deliberately parameterless. `?set=` first, fixture second: the fixture shortcuts force-stop the app, and the settings write is async.

**The stuck fixture still has legal moves** (king shuffles into the empty column, and recycling the waste) — "no more useful moves" is the shipped semantics, not "no legal moves". That is the correct behaviour to verify, not a fixture defect.

**a11y handles**

| Thing | Android (content-desc) | iOS (testID) |
|---|---|---|
| Rewind pill | `Rewind to last winnable move` | `rewind-to-winnable` |
| Warning bubble | `No winning moves left — undo or start a new game.` | `hint-bubble` |
| Scrubber track (carries the marker index) | `Undo scrubber, position N of M, last winnable move K` | `undo-scrubber-track` |
| Marker view | — (child of the accessible track) | `undo-scrubber-winnable-marker` |
| Undo pill | — | `undo` |

**Log line** (plain `console.log`, no developer mode needed): `[rewind] boundary=<index> timeline=<length>`. `boundary=-` means nothing was proven.

**Checks**

1. **Off by default.** `?set=warnings:unwinnable,rewind:off`, then `yarn unwinnable` → warning shows, **no** Rewind pill, no marker, no `[rewind]` log line.
2. **Pill appears.** With `rewind:on`, `yarn unwinnable` → warning bubble **and** the Rewind pill in the dock's left half. The log line must read exactly `[rewind] boundary=81 timeline=83` — the fixture's boundary is pinned, so any other number is a real bug in the search. **Then repeat the whole check with `warnings:stuck` + `yarn stuck`**, expecting `[rewind] boundary=210 timeline=215`; that is the mode that actually ships.
3. **The jump.** Tap `rewind-to-winnable` → the board walks back one move per step (140 ms each here — four steps on the stuck fixture), the warning bubble disappears at the first step, the pill stays but dims and ignores further taps until the walk ends, then hands its slot back to Hint. **The marker stays** on the boundary afterwards (changed by the review round — it used to vanish). Then tap Undo/Redo: undo and redo still work normally from the landed position (this is what "behaves exactly like a manual scrub" means). Play one move from there → the marker goes away too.
4. **It really is winnable.** After the jump, turn the Hint button on (`?set=hintButton:on`) and press Hint — it must return a *move* hint, not the "No winning moves left" re-affirm. This is the check that the boundary is real.
5. **The marker.** `yarn unwinnable` again, then start a scrub drag from the Undo pill (iOS: Appium `node scripts/ios-scrub.js`, per skill section 6 — agent-device cannot pan on iOS). While dragging, the amber tick must be visible on the track and the track's a11y label must read `…, last winnable move 81`. Dragging until the thumb covers the tick must land on index 81. **This is the check the review round's finding 1 was about** — the tick has to survive the whole drag (the first committed step exits the warning era), including landing on it and dragging past it and back. Overshooting and dragging right again must bring the pill back.
6. **Honest degradation.** `?set=solvableOnly:off`, then deal until you hit a deal that warns immediately at move 0 (roughly one in five). Expect: warning shows, **no** pill, no marker, `[rewind] boundary=- timeline=1`. The feature must show nothing rather than claim a boundary.
7. **Hint-slot swap.** With both `hintButton:on` and `rewind:on`: on a fresh deal the Hint pill is in the left slot; after `yarn unwinnable` the Rewind pill replaces it; once the walk has landed on the boundary the Hint pill returns (the Rewind pill must NOT flicker back to Hint after the first step — that was review finding 1).
8. **The Run Demo sheet.** Header → Demo → FIXTURES now has two rows: "Mid-game scrub" / "Near win", then "Unwinnable game" / "No useful moves". Confirm the second row is not clipped by the Android sheet detent (identified issue #6) and that both buttons load the same boards as the deep links.
9. **Hints keep working until the warning.** On the stuck fixture, before the warning appears the Hint button must still return move hints; only once the warning is up does the Rewind pill take its slot. This is the user's rule ("hint should work until there are no possible moves") and it needs no code change — verify, do not fix.
10. **Undo hint (independent of the rest).** `yarn deeplink 'soli://?reset=undoHint' --ios`, then tap Undo 3× in a row → the hint bubble appears with the "Drag the Undo button sideways…" copy (`undo-hint`). New deal, 6 in a row → hint 2. New deal, 9 in a row → hint 3.
11. **Interference during the walk** (review round). Start a rewind on `yarn stuck` and, while it is walking, drag the scrubber to the right — the walk must stop where the player put it and never drag them back down. Then start another and double-tap the pill inside the first step: the second tap must do nothing (the pill is dimmed and inert), not restart the walk.
12. **Disabled settings row** (review round). Settings → Gameplay with warnings off: "Rewind to winnable" is greyed out. Read it in **both** Host themes (system light and dark) — the description must be legibly muted in both, not near-invisible in dark.

**Regression watch:** with the setting off, the dock must render exactly as before (Hint pill placement, scrub overlay, warning bubble) — the whole feature is inert when off.

## Follow-ups

1. **Announce the rewind for screen readers.** The pill has a label, but the *result* of the jump is not announced. Pro: consistency with the warning/hint announcements. Con: another `announceForAccessibility` competing with the warning's own. Recommendation: add it if a VoiceOver pass shows the jump is silent.
2. **Show how far back the boundary is** ("Rewind 12 moves"). Pro: sets expectations before the jump, especially in `noUsefulMoves` mode where the jump can be long. Con: more copy in a tight pill, and the number changes as the player plays on inside the dead era. Recommendation: only if issue #2 above turns out to be real on device.
3. **Offer the rewind without a warning**, e.g. from the scrubber itself. Pro: helps players who play with warnings off. Con: it would mean running the solver during normal play (the exact battery cost the warning modes were designed to avoid) and it leaks winnability to players who deliberately turned warnings off. Recommendation: no.
4. **Gate on `unwinnable` mode only** if the long jumps in `noUsefulMoves` mode read badly (issue #2).
5. **Re-check the undo-hint schedule after real usage.** 3/6/9 is a deliberate loosening; if the bubble starts feeling naggy, the first lever is `UNDO_HINT_MAX_SHOWINGS`, not the streaks.
6. ~~A second fixture for `noUsefulMoves` mode.~~ **Done** — that is `?demo=stuck` (round 3). It cost more than the estimate here predicted: the heuristic predicate alone is not proof of unwinnability, so the board had to be found by search and ranked by the solver (learning 9).
7. **Log the resolved warning mode on `?set=` links.** Today `[Demo] Settings link applied` logs the *requested* `warningUpdates`, not the mode they resolved to, so an alias link's outcome cannot be read off the log (issue #5). Pro: makes "did it apply?" answerable from `--logs` alone. Con: the resolved value is only known inside the functional setter, so logging it accurately means passing the current mode into the launcher just for a log line. Recommendation: only if issue #5 recurs — the existing log already proves the key *parsed*, which is the part that was actually in doubt.
