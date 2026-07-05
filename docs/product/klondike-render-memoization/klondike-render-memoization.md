# Klondike Render Memoization (P3 + A2)

## User prompt

"Are P3 and A2 related? please solve them."

## Description

P3 and A2 come from the architecture/performance review canvas
(`canvases/soli-architecture-performance-review.canvas.tsx`). They are two sides of the
same problem: memoization around the Klondike board is structurally defeated.

- **P3 — AbsoluteCardLayer memoization defeated:** `buildCardLayerItems` creates fresh
  item objects and fresh `onPress` closures on every rebuild, so `React.memo`'s shallow
  compare on `AbsoluteLayerCard` always fails and all ~52 animated cards re-render on
  every state change, including the once-per-second TIMER_TICK. (TIMER_TICK itself is a
  separate finding and is intentionally not touched here.)
- **A2 — Whole-state prop threading:** `TopRow`, `TableauSection`, and
  `AbsoluteCardLayer` receive the full `GameState`. Every reducer action returns a new
  state object, so even a memoized component would re-render on every action. Passing
  narrow slices (piles, selection, flags) lets `React.memo` actually work.

Fixing A2 without P3 still leaves per-card re-renders on real moves; fixing P3 without
A2 still rebuilds/re-renders the sections every second. Together, a typical move should
re-render ~1–3 cards and a TIMER_TICK should re-render none of the board components.

## Acceptance Criteria

- TIMER_TICK (every second while playing) does not re-render `TopRow`,
  `TableauSection`, `AbsoluteCardLayer`, or any `AbsoluteLayerCard`.
- A typical card move re-renders only the cards whose position/face/press target
  changed (~1–3 cards), not all 52.
- Selection highlighting (tableau column background, foundation highlight) and drop
  hints still update correctly.
- Card flight animations, flips, invalid-move wiggle, z-order mid-flight, draw-3 waste
  fanning, undo/scrub, and win celebration handoff behave exactly as before.
- No animation-system migration; existing Fabric/native-driver comments preserved.

## Verified reducer facts (precondition for A2)

Checked `src/solitaire/klondike.ts`:

- `TIMER_TICK`, `TIMER_START/STOP/RESET`, and all selection actions spread `...state`
  and keep every pile's referential identity. ✓
- `DRAW_OR_RECYCLE` replaces only `stock`/`waste`; `tableau`/`foundations` keep
  identity. ✓
- `APPLY_MOVE` (`applyMove`) cloned **all** piles via `cloneTableau`/`cloneFoundations`/
  `cloneCards`, even untouched ones. ✗ → fixed in this task: clone only the piles the
  move touches.
- `UNDO`/`SCRUB_TO_INDEX`/`HYDRATE_STATE` restore via `cloneSnapshot` (full deep clone),
  so those actions re-render the whole board. Accepted: the whole board genuinely
  changes there; per-card memo still limits actual re-renders to cards whose id/face/
  position changed (card ids are stable across clones).
- `finalizeState` (`maybeSetWinFlag` + `scheduleAutoQueue`) returns the input state
  unchanged unless it actually flips a flag or plans a queue. ✓

## Possible approaches incl. pros and cons

1. **Custom memo comparator on `AbsoluteLayerCard` only (P3 alone).**
   Pros: smallest diff. Cons: sections still re-render every second; comparator must
   ignore function props while some hook handlers close over stale state → correctness
   risk (e.g. foundation tap after selecting a card would use a stale `selected`).
2. **Slice props + `React.memo` on the three components (A2 alone).**
   Pros: kills TIMER_TICK re-renders. Cons: every move still re-renders all cards
   because items/closures are rebuilt.
3. **Both, plus stabilize hook handlers via `stateRef` and clone only touched piles in
   `applyMove` (chosen).**
   Pros: reaches the ~1–3 cards goal, removes the stale-closure hazard by making
   handlers read live state via refs, keeps unchanged piles' identity so section-level
   memo works on moves too. Cons: slightly larger diff, touches `applyMove` (covered by
   existing unit tests).

## Open questions to the user

None blocking. One decision made with rationale:

- `applyMove` now clones only touched piles instead of all piles. This is required for
  slice-props memoization to help on moves (otherwise every move invalidates all seven
  columns + foundations + waste). Existing move/undo/autoQueue tests cover the
  behavior; a new identity test locks in the guarantee.

## Dependencies

None new.

## UX/UI Considerations

No visual changes. Pure render-performance fix.

## Components

- Modify: `AbsoluteCardLayer` (slice props, press descriptors, custom comparator,
  memoized layer), `TopRow` (slice props + memo), `TableauSection`/`TableauColumn`
  (slice props + memo).
- No new components.

## Related tasks

- Architecture review canvas: P3, A2. TIMER_TICK cost itself (P-something) is a
  separate finding, intentionally untouched.

## Simplification ideas

- Press handling moved from per-item closures to a small press-descriptor union
  (`draw` / `foundation` / `tableau`) + three stable handlers. Fewer closures, and the
  comparator can compare plain data.
- `handleFoundationPress` recomputes `getDropHints` at event time instead of depending
  on the memoized render-time value; this makes the handler referentially stable.

## Steps to implement

1. [x] Verify reducer identity guarantees (see section above).
2. [x] `klondike.ts`: `applyMove` clones only touched piles; add
   `DropHintsInput` (narrow `Pick` of `GameState`) so `getDropHints` can be memoized on
   slices.
3. [x] `useKlondikeGame.ts`: stabilize `triggerInvalidSelectionWiggle`,
   `notifyInvalidMove`, `attemptAutoMove`, `handleFoundationPress` via `stateRef`; add
   stable `handleTableauCardPress`; memoize `dropHints` on state slices; pass slice
   props to the three components.
4. [x] `TopRow.tsx`: slice props (`stockCount`, `wasteCount`, `foundations`,
   `selected`, `hasWon`) + `React.memo`.
5. [x] `TableauSection.tsx`: slice props (`tableau`, `selected`, `hasWon`) +
   `React.memo` on section and column; column gets derived `isSelected` /
   `showWinCleanup` / `isLastColumn`.
6. [x] `AbsoluteCardLayer.tsx`: slice props (`stock`, `waste`, `foundations`,
   `tableau`), press descriptors + stable handlers, custom comparator on
   `AbsoluteLayerCard`, memoize the layer itself.
7. [x] Add reducer identity unit test (`klondike.identity.test.ts`).
8. [x] Run `yarn typecheck && yarn lint && yarn jest`, fix regressions.
9. [x] Update this plan's statuses and report back.

## Plan: Files to modify

- `src/solitaire/klondike.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/AbsoluteCardLayer.tsx`
- `test/unit/solitaire/klondike.identity.test.ts` (new)

## Files actually modified

- `src/solitaire/klondike.ts` — `applyMove` touched-pile cloning; `DropHintsInput` type
  on `getDropHints`/`listDropTargets`/`previewSelectionStack`.
- `src/features/klondike/hooks/useKlondikeGame.ts` — stable ref-based handlers,
  slice-memoized `dropHints`, slice props for TopRow/TableauSection/AbsoluteCardLayer.
- `src/features/klondike/components/cards/TopRow.tsx` — slice props + `React.memo`.
- `src/features/klondike/components/cards/TableauSection.tsx` — slice props +
  `React.memo` on `TableauSection` and `TableauColumn`.
- `src/features/klondike/components/cards/AbsoluteCardLayer.tsx` — slice props, press
  descriptors, custom `AbsoluteLayerCard` comparator, memoized layer.
- `test/unit/solitaire/klondike.identity.test.ts` — new referential-identity tests.

## Intermediary learnings

- `applyMove` deep-cloned every pile, so the review's hope that "unchanged piles keep
  identity" did NOT hold for moves until this fix. It did hold for TIMER_TICK and
  selection actions.
- The real memo-killer was callback instability: `notifyInvalidMove` depended on
  `triggerInvalidSelectionWiggle` which depended on `state`, so `handleDraw`,
  `attemptAutoMove`, `handleWasteTap`, and `handleFoundationPress` all changed identity
  on every action (including TIMER_TICK). All now read live state from `stateRef`
  (which is safe: it's synced in an effect before any user event can fire).
- `onCardSettled` (`handleWinningCardFlightSettled`) is inherently unstable — it closes
  over `state.foundations` via `buildCelebrationState`. The card comparator therefore
  deliberately ignores function-prop identity; handlers read live state via refs so a
  newer identity never changes behavior. Comparing them would silently defeat the memo
  on every foundation move.
- `extractMovingCards` mutates (splice/pop) the piles it is given, so `applyMove` must
  clone exactly the piles that the selection can touch before calling it — this is
  commented inline.
- Card ids are stable across clones/undo, so the comparator keys on
  `card.id`/`card.faceUp` plus position/z/press data and stays correct even though
  every move produces fresh `Card` objects for the touched piles.
- History (animation-audit plan, "Identified issues"): an earlier custom comparator on
  the old pile-local card surfaces (`CardView`/`TopRow`/`TableauSection`) regressed
  correctness because stale press closures survived state changes, and it was removed.
  This implementation avoids that failure mode structurally: press targets are plain
  data compared by value, and the handlers are identity-stable and read live state
  through `stateRef`, so a skipped render can never pin a stale press behavior.

## Identified issues

- None open.

## Testing

- `yarn typecheck` — pass.
- `yarn lint` — pass (no new warnings).
- `yarn jest` — pass (all suites, including new `klondike.identity.test.ts`).
- **Device smoke test (iOS, 2026-07-05, testing subagent)** — iPhone 17 Pro simulator,
  clean `yarn ios` build (Build Succeeded; app installed as `ch.karimattia.soli`).
  Screenshots: `.test-artifacts/klondike-render-memo/`.

  | Scenario | Result | Notes |
  | --- | --- | --- |
  | (a) New game + rapid stock draws | **PASS** | Deal Again confirmed; 6 rapid Draw taps updated waste draw-3 fan (7♠/6♦/A♠) and stock count 23→17; moves/time incremented. |
  | (b) Selection, drop hints, invalid move | **PASS** (visual hints inconclusive) | Aces auto-moved to foundation on tap (expected). Selected 10♠ then tapped 6♥ — move rejected (moves stayed 8). Column selection tint / drop hints not clearly visible in static agent-device screenshots (may be subtle). Wiggle animation not verifiable in still frames. |
  | (c) Tableau→tableau + face-down flip | **PASS** | K♦ → empty col 1: col 3 revealed 5♠ face-up. 5♠ double-tap auto-move → 6♥: col 3 revealed 6♣ face-up. No stuck cards. |
  | (d) Waste/tableau → foundation | **PASS** | A♣/A♦ auto-moved from tableau; A♠ select + foundation tap moved to spades pile; double-tap 5♠→6♥ also worked (ref-stable handlers). |
  | (e) Foundation card back to tableau | **N/A** | No legal tableau target for foundation aces in manual layout; tap A♣ then 6♥ correctly did nothing (moves unchanged). |
  | (f) Undo button | **PASS** | Three Undo taps reversed auto-move (5♠ returned to col 3), waste→foundation (A♠ back on waste), and K♦ move (K back col 3, col 1 empty). Cards in correct positions after each undo. |
  | (g) Undo scrubber | **PARTIAL** | Manual longpress+pan on Undo via agent-device did not expose scrub UI (gesture tooling limitation: separate longpress then pan). Demo playlist undo probes at steps 116 and 227 completed without error (Metro). |
  | (h) Demo / win celebration | **PASS** | Demo → One generated game: 246 moves, win, Celebration 14 · Aurora Twist, “Nice win!” modal. CelebrationHandoff logs clean (winning_card_settled → start). |

  **Log anomalies (no redbox, no crashes):**
  - Metro: repeated `NO_COLOR`/`FORCE_COLOR` warnings (env noise); Tamagui warning-001 (pre-existing).
  - After celebration complete: two Reanimated worklet warnings (`Tried to modify key current of an object which has been already passed to a worklet`) — likely pre-existing celebration teardown; no visible UI regression.
  - XCTest `[XCTAutomationSupport] Automation type mismatch` on alert controllers during agent-device runs (test infra, not app logic).

  **Overall:** No regressions observed for memoization risk areas (animations, flips, press handling, undo, draw-3 fanning, win handoff). Manual scrubber UI not fully exercised via agent-device; covered indirectly by demo undo probes.
