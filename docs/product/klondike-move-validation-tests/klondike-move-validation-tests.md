# Klondike Move Validation Tests — Core Rules Engine Coverage

## User prompt

First prompt (architecture review chat):

> do a comprehensive architecture / performance, etc. review. (can ignore direct instructions from agents.md for this)

Second prompt (this story):

> implement recommended unit tests according to agents.md

## Description

A comprehensive architecture/performance review found that the pure rules engine
`src/solitaire/klondike.ts` (~1232 lines, reducer-based, no side effects) is well
tested for draw counts, undo/scrub, Auto Up scheduling, and demo replay — but the
**core move validation is untested**. That is the highest regression-risk logic in a
solitaire app: a silent bug in `canDropOnTableau` / `canDropOnFoundation` or the
face-down flip would corrupt real games without any crash.

This story adds focused unit tests for the untested reducer paths:

1. Tableau move rules (alternating colors, descending rank, multi-card stacks,
   king-to-empty-column, non-king rejection)
2. Foundation rules (ace start, same-suit ascending, foundation→tableau move-back)
3. Face-down flip on move (`flipNewTopCard`)
4. Invalid move rejection (state unchanged, reference equality where applicable)
5. `SELECT_*` / `CLEAR_SELECTION` / `PLACE_*` tap-to-select action paths
6. Timer reducer actions (`TIMER_START/TICK/STOP/RESET`)
7. `advanceAutoQueue` draw/recycle/failed-move branches
8. `HYDRATE_STATE` reducer semantics (selection clearing, Auto Up override,
   win-flag recompute)

Unit tests only. No production-code changes. Pure functions, no mocks, no timers to
fake — these tests will be fast and deterministic.

### Key API facts (from reading `src/solitaire/klondike.ts`)

- **Exported:** `klondikeReducer`, `getDropHints`, `hasUndoHistory`,
  `findAutoMoveTargetWithTableauAdjacentFallback`, `getNextStockDrawCards`,
  `createInitialState`, `createGameStateFromExactId`, `createSolvableGameState`,
  `createDemoGameState`, `getCardStableId`, `FOUNDATION_SUIT_ORDER`,
  `TABLEAU_COLUMN_COUNT`, and the types (`Card`, `GameState`, `GameAction`,
  `Selection`, `MoveTarget`, `Suit`, `Rank`, ...).
- **Private (must be tested through the reducer):** `canDropOnTableau`,
  `canDropOnFoundation`, `applyMove`, `flipNewTopCard`, `isDescendingAlternating`,
  `advanceAutoQueue`, `startTimer`/`tickTimer`/`stopTimer`/`resetTimer`,
  `handleSelect*`. Drive them via `APPLY_MOVE`, `PLACE_ON_TABLEAU`,
  `PLACE_ON_FOUNDATION`, `SELECT_TABLEAU`, `SELECT_WASTE`,
  `SELECT_FOUNDATION_TOP`, `CLEAR_SELECTION`, `ADVANCE_AUTO_QUEUE`,
  `TIMER_*`, `HYDRATE_STATE`. `getDropHints` additionally exposes the two
  `canDrop*` predicates read-only for cheap positive/negative rule assertions.
- **Reference-equality caveats** discovered while reading the reducer:
  - Invalid `APPLY_MOVE`/`PLACE_*` return `haltAutoQueue(state)`, which is
    reference-equal to `state` only when `autoQueue` is empty and
    `isAutoCompleting` is false. Fixtures for rejection tests must satisfy that
    (the default fixture does).
  - A failed `PLACE_*` keeps `selected` intact (only successful moves clear it).
  - `finalizeState` runs after every valid move and can schedule an Auto Up queue
    when the board is all-face-up and `autoUpEnabled` is true. Move-validation
    fixtures should default to `autoUpEnabled: false` so assertions stay focused
    on the move itself (the Auto Up scheduling behaviour is already covered by
    `klondike.autoUpSetting.test.ts`).
  - `stopTimer` on a paused state returns a **new object** with identical values
    (no reference-equality short-circuit) — assert values there, not identity.
- `HYDRATE_STATE` performs **no structural validation** — it trusts its input,
  clears `selected`, applies the optional `autoUpEnabled` override, halts the
  auto queue when Auto Up is disabled, and runs `finalizeState` (which recomputes
  `hasWon`). Structural validation of corrupted snapshots lives in
  `src/storage/gamePersistence.ts` and is already tested in
  `test/unit/storage/gamePersistence.test.ts` (invalid JSON, missing `exactId`,
  missing `drawCount`, missing `autoUpEnabled`). We only test the reducer-level
  semantics here to avoid duplication.

## Acceptance Criteria

- Every rule path listed in the Description has at least one positive and one
  negative test where applicable.
- Invalid moves are asserted to leave the state unchanged — via reference equality
  where the reducer guarantees it (see caveats above), otherwise via deep value
  equality of the affected piles.
- A shared fixture helper eliminates the third copy-paste of `createEmptyState`
  (currently duplicated in `klondike.autoUpSetting.test.ts` and
  `klondike.autoMoveFallback.test.ts`); new test files use the helper. Existing
  test files are NOT migrated (out of scope, keeps the diff reviewable).
- No production code is modified.
- `yarn typecheck && yarn lint && yarn jest` all pass (jest uses the `jest-expo`
  preset; `yarn jest` runs the binary directly and is non-interactive, unlike
  `yarn test` which is `jest --watchAll`).

## Possible approaches incl. pros and cons

| # | Approach | Pros | Cons |
|---|----------|------|------|
| 1 | **Test through the public reducer API with hand-built board fixtures** (chosen) | Tests real user-visible behaviour incl. history/moveCount/flip side effects; zero production changes; matches existing test style (`klondike.autoUpSetting.test.ts` already builds boards this way) | Slightly more setup per test than calling `canDropOnTableau` directly |
| 2 | Export the private predicates (`canDropOnTableau`, `canDropOnFoundation`, timer helpers) for direct unit testing | Most granular assertions | Widens the public API just for tests; drifts from how the app exercises the code; AGENTS.md prefers simplicity/defaults |
| 3 | Play scripted real deals via `createGameStateFromExactId` and assert outcomes | Highest realism | Fixtures are opaque (which card is where depends on the deal encoding); brittle and hard to review |
| 4 | Property-based testing (fast-check) of the rule invariants | Great coverage per line of test code | New dependency, new pattern to maintain — gold plating for this story |

**Chosen: Approach 1.** Hand-built `GameState` fixtures + reducer actions +
`getDropHints` for pure rule checks. No new exports, no new dependencies.

## Open questions to the user

1. **Should the two existing test files be migrated to the new shared helper?**
   - Yes: removes ~70 duplicated lines. Con: touches passing tests, bigger diff.
   - No (recommended): keep this story additive and reviewable; migrate
     opportunistically next time those files change.
   → Proceeding with **No**.
2. **Export private predicates as a test seam?**
   - Not needed — every scenario is reachable through reducer actions and
     `getDropHints`. → Proceeding with **no production-code changes**.
3. **How exhaustive should timer edge cases be?** The review called out "tick when
   not running"; the plan also covers non-finite timestamps and negative deltas
   because those guards exist in the code (`Number.isFinite` checks) and protect
   against clock skew. Recommended: keep them — they are one-liners.
   → Proceeding with **keeping them**.

## Dependencies

- None. No new packages. Uses the existing jest 29 / `jest-expo` ~57 setup.

## UX/UI Considerations

- Not applicable — pure logic tests, no UI changes.

## Components

- Not applicable — no components created or modified.

## How to fetch data, how to cache

- Not applicable.

## Related tasks

- Architecture/performance review chat that produced this recommendation.
- Existing coverage this builds next to (do not duplicate):
  - `test/unit/solitaire/klondike.drawCount.test.ts` — draw/recycle mechanics
  - `test/unit/solitaire/klondike.undo.test.ts` — undo/scrub history
  - `test/unit/solitaire/klondike.autoUpSetting.test.ts` — Auto Up scheduling/trigger rules
  - `test/unit/solitaire/klondike.autoMoveFallback.test.ts` — tap adjacent-card fallback
  - `test/unit/storage/gamePersistence.test.ts` — persisted-snapshot validation

## Simplification ideas

- One shared `test/unit/solitaire/helpers.ts` instead of a fixture class or
  builder DSL: a `card(suit, rank, faceUp?)` factory and a
  `createTestState(overrides)` function (same shape the existing tests already
  use). Nothing more.
- Default `autoUpEnabled: false` in the helper so move tests don't accidentally
  trigger Auto Up scheduling; tests that want it pass an override. (Trade-off
  documented in the helper as a comment.)
- Use `getDropHints` for pure accept/reject rule matrices (one selection, assert
  the whole hint map) instead of applying a full move per combination — fewer,
  denser tests.
- Skip re-testing what other files own: draw/recycle counts, undo snapshots,
  Auto Up trigger conditions, persistence validation.

## Steps to implement

- [x] 1. Create `test/unit/solitaire/helpers.ts` with `card()`,
      `createTestState()` (empty board, `autoUpEnabled: false` default,
      `Partial<GameState>` overrides) and `foundationPileThrough(suit, topRank)`.
      Model it on the fixtures in `klondike.autoUpSetting.test.ts` lines 11–50.
      Done — also added `tableauWith(...columns)` (pads to 7 columns) and
      `resetCardCounter()` for deterministic card ids per test.
- [x] 2. Create `test/unit/solitaire/klondike.moveValidation.test.ts` — tableau
      rules, foundation rules, flip-on-move, invalid-move rejection, drop hints
      (checklist below). Done — 28 tests.
- [x] 3. Create `test/unit/solitaire/klondike.selection.test.ts` — `SELECT_*`,
      `CLEAR_SELECTION`, `PLACE_*` paths. Done — 19 tests.
- [x] 4. Create `test/unit/solitaire/klondike.timer.test.ts` — timer reducer
      actions. Done — 15 tests.
- [x] 5. Create `test/unit/solitaire/klondike.autoQueue.test.ts` —
      `ADVANCE_AUTO_QUEUE` branches. Done — 8 tests.
- [x] 6. Create `test/unit/solitaire/klondike.hydrate.test.ts` — `HYDRATE_STATE`
      reducer semantics. Done — 6 tests.
- [x] 7. Run `yarn typecheck && yarn lint && yarn jest` and fix any failures.
      Done — all green on first run; only `yarn format` (oxfmt) adjustments were
      needed on two of the new files.
- [x] 8. Update this plan: check off steps, fill "Files actually modified",
      "Intermediary learnings", "Testing". Done.

### Test case checklist by file

#### `test/unit/solitaire/klondike.moveValidation.test.ts` (28 tests implemented)

Tableau drop rules (via `APPLY_MOVE` from a tableau/waste selection):

- [x] accepts a single card onto an opposite-color card one rank higher (red 6 on black 7)
- [x] rejects a same-color card one rank higher (red 6 on red 7)
- [x] rejects a correct-color card with the wrong rank (red 5 on black 7)
- [x] rejects a drop when the target column's top card is face-down
- [x] accepts a lone king onto an empty column
- [x] accepts a king-led stack onto an empty column (order preserved)
- [x] rejects a non-king single card onto an empty column
- [x] rejects a non-king-led stack onto an empty column
- [x] moves a multi-card alternating descending run intact (source loses slice, target gains it in order)
- [x] rejects a selection slice that is not itself a valid run (`isDescendingAlternating` guard; fixture with a broken sequence)
- [x] rejects a move onto the selection's own source column
- [x] valid move increments `moveCount`, pushes one history snapshot, clears `future` and `selected`
- [x] invalid `APPLY_MOVE` returns the exact same state reference (fixture has empty `autoQueue`, `isAutoCompleting: false`)
- [x] waste→tableau: valid move removes only the top waste card
- [x] waste→tableau: invalid move leaves waste deep-equal and state reference-equal

Foundation drop rules:

- [x] an ace starts an empty foundation of its suit
- [x] rejects a non-ace on an empty foundation
- [x] accepts the same-suit next rank (2♥ on A♥)
- [x] rejects a rank gap (3♥ on A♥)
- [x] rejects the right rank of the wrong suit (2♠ on A♥ pile / to hearts target)
- [x] rejects a multi-card stack targeted at a foundation (`stack.length !== 1` guard)
- [x] foundation→tableau move-back: top foundation card moves onto a valid tableau card and leaves the foundation pile shortened

Face-down flip on move (`flipNewTopCard`):

- [x] moving away the face-up tail flips the newly exposed face-down card to `faceUp: true`
- [x] a newly exposed card that is already face-up is untouched (same id, still face-up)
- [x] emptying a column entirely does not throw and leaves `[]`

Drop hints (`getDropHints`, exercises `canDropOnTableau`/`canDropOnFoundation` read-only):

- [x] no selection → all tableau hints false, all foundation hints false
- [x] waste selection → exactly the legal tableau columns and the matching-suit foundation are true
- [x] tableau selection → the source column is always excluded from tableau hints

#### `test/unit/solitaire/klondike.selection.test.ts` (19 tests implemented)

- [x] `SELECT_TABLEAU` selects a face-up card
- [x] `SELECT_TABLEAU` on a face-down card is a no-op (reference-equal)
- [x] `SELECT_TABLEAU` on an out-of-range column/card index is a no-op
- [x] `SELECT_TABLEAU` on the already-selected card toggles the selection off
- [x] `SELECT_TABLEAU` on a different card replaces the selection
- [x] `SELECT_WASTE` selects when waste is non-empty; toggles off on repeat; no-op when waste is empty (3 cases)
- [x] `SELECT_FOUNDATION_TOP` selects a non-empty pile; toggles off on repeat; no-op when the pile is empty (3 cases)
- [x] `CLEAR_SELECTION` clears an active selection; is reference-equal no-op with no selection (2 cases)
- [x] `PLACE_ON_TABLEAU` with no selection returns the same state reference
- [x] `PLACE_ON_TABLEAU` with a valid selection applies the move and clears `selected`
- [x] `PLACE_ON_TABLEAU` with an invalid target keeps the board unchanged and **keeps** the selection (documents current behaviour)
- [x] `PLACE_ON_FOUNDATION` valid and invalid counterparts (2 cases)
- [x] any `SELECT_*` while an auto queue is active halts the queue (`autoQueue: []`, `isAutoCompleting: false`)

#### `test/unit/solitaire/klondike.timer.test.ts` (15 tests implemented)

- [x] `TIMER_START` from idle sets `timerState: 'running'` and `timerStartedAt`
- [x] `TIMER_START` with a non-finite `startedAt` (NaN/Infinity) is a reference-equal no-op
- [x] `TIMER_START` while already running is a reference-equal no-op
- [x] `TIMER_START` after a pause resumes with the new `startedAt` and preserves accumulated `elapsedMs`
- [x] `TIMER_TICK` adds the delta to `elapsedMs` and advances `timerStartedAt` to the tick timestamp
- [x] `TIMER_TICK` when idle or paused is a reference-equal no-op (2 cases)
- [x] `TIMER_TICK` with a non-finite timestamp is a no-op
- [x] `TIMER_TICK` with a zero or negative delta (clock skew) is a no-op
- [x] `TIMER_STOP` while running folds the final delta into `elapsedMs`, sets `paused`, clears `timerStartedAt`
- [x] `TIMER_STOP` when idle is a reference-equal no-op; when paused it stays paused with values unchanged (assert values, not identity — see caveat)
- [x] `TIMER_RESET` returns to `idle`/`0`/`null`; is a reference-equal no-op when already pristine

#### `test/unit/solitaire/klondike.autoQueue.test.ts` (8 tests implemented)

- [x] `ADVANCE_AUTO_QUEUE` with an empty queue while `isAutoCompleting` clears the flag
- [x] `ADVANCE_AUTO_QUEUE` with an empty queue and flag already false is a no-op
- [x] a `move` action applies the move without recording history and pops the queue; `isAutoCompleting` stays true while items remain
- [x] a `move` action whose move is no longer valid still pops the queue and leaves the board unchanged (the `?? state` fallback)
- [x] a `draw` action draws from stock without recording history and without recycling
- [x] a `recycle` action moves the waste back to stock face-down
- [x] `autoCompleteRuns` increments exactly when the last queue item is consumed
- [x] consuming a queue that completes all foundations sets `hasWon` via `finalizeState`

#### `test/unit/solitaire/klondike.hydrate.test.ts` (6 tests implemented)

- [x] hydration clears any `selected` carried in the payload
- [x] hydration preserves the reducer's current `autoUpEnabled` when the action has no override
- [x] hydration applies the `autoUpEnabled` override when provided
- [x] hydrating with Auto Up disabled halts a carried-over `autoQueue`/`isAutoCompleting`
- [x] hydrating a ready board (all face-up, Draw 1) with Auto Up enabled schedules an auto queue
- [x] hydrating a snapshot with stale `hasWon: false` but complete foundations recomputes `hasWon: true` (win-flag repair for corrupted snapshots)

Scope note: structural corruption (bad JSON, missing fields) is validated in
`gamePersistence` before `HYDRATE_STATE` is ever dispatched and is already tested
in `test/unit/storage/gamePersistence.test.ts` — intentionally not duplicated here.

## Plan: Files to modify

New files only:

- `test/unit/solitaire/helpers.ts`
- `test/unit/solitaire/klondike.moveValidation.test.ts`
- `test/unit/solitaire/klondike.selection.test.ts`
- `test/unit/solitaire/klondike.timer.test.ts`
- `test/unit/solitaire/klondike.autoQueue.test.ts`
- `test/unit/solitaire/klondike.hydrate.test.ts`
- `docs/product/klondike-move-validation-tests/klondike-move-validation-tests.md` (this plan)

No production files. No existing test files.

## Files actually modified

All new files, no production code and no existing tests touched:

- `test/unit/solitaire/helpers.ts` (new)
- `test/unit/solitaire/klondike.moveValidation.test.ts` (new, 28 tests)
- `test/unit/solitaire/klondike.selection.test.ts` (new, 19 tests)
- `test/unit/solitaire/klondike.timer.test.ts` (new, 15 tests)
- `test/unit/solitaire/klondike.autoQueue.test.ts` (new, 8 tests)
- `test/unit/solitaire/klondike.hydrate.test.ts` (new, 6 tests)
- `docs/product/klondike-move-validation-tests/klondike-move-validation-tests.md`
  (this plan)

## Intermediary learnings

- No engine surprises: every behaviour matched what the plan predicted from the
  code reading (reference-equal rejections, selection kept on failed `PLACE_*`,
  `stopTimer` on paused returning a new-but-identical object, hydrate ignoring
  the payload's own `autoUpEnabled`). All 76 tests passed on the first run.
- Test counts came out slightly above the plan's estimates (76 vs ~66) because
  some checklist bullets naturally split into multiple `it` blocks (e.g. the
  waste/foundation select+toggle+empty triples, non-finite `TIMER_START` via
  `it.each`).
- `helpers.ts` inside `test/unit/solitaire/` is safe: jest's testMatch only
  picks up `*.test.ts`, so the helper file is not collected as a suite.
- Run `yarn format` (oxfmt) after writing test files — two files needed
  reformatting; `yarn lint` alone does not catch formatting.

## Identified issues

- None. No suspected engine bugs surfaced; all guards behaved as designed.

## Testing

- Cheap gate: `yarn typecheck && yarn lint && yarn jest`
  (`yarn jest` invokes the jest binary directly and exits after one run;
  `yarn test` is `jest --watchAll` and must NOT be used non-interactively).
- Jest config: `jest-expo` preset with `jest-pnp-resolver` (see `package.json`).
  Pure logic tests — no AsyncStorage mock or native module setup needed.
- No device/simulator testing: this story changes no production code, so a build
  smoke test adds nothing.
- **Result (2026-07-05):** `yarn typecheck` clean, `yarn lint` clean
  (0 warnings/errors on the new files), `yarn jest` — 16 suites passed,
  132 tests passed (76 of them new), ~2s runtime. `yarn format:check` clean
  after running `yarn format`.
