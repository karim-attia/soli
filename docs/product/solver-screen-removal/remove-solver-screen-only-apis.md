# Solver Screen Removal Remove Solver Screen-Only APIs

## User prompt

```text
are there any files or methods on which two.tsx relied on that are not used anymore anywhere else?
```

```text
pls do. no testing needed
```

## Description

Remove the public APIs that existed only for the deleted Solver Lab visualization while preserving the atomic solver entry point used to generate solvable games. Also make the core auto-move helper module-private because only its adjacent-card fallback wrapper remains part of the public game API.

## Acceptance Criteria

- `getAtomicFrame`, `getAtomicFrameFromState`, and `applyPath` are removed from the atomic solver.
- `solveKlondikeAtomic` remains exported and unchanged for solvable-game generation.
- `SUITS` remains exported to avoid expanding this cleanup beyond APIs tied to the deleted screen.
- `findAutoMoveTarget` remains available internally in `klondike.ts` but is no longer exported.
- `findAutoMoveTargetWithTableauAdjacentFallback` remains exported and behaviorally unchanged.
- No unrelated refresh-rate cleanup files are modified.
- No new dependencies are introduced.
- No tests are run, per the user request.

## Design links

- None; this is an internal dead-code cleanup.

## Possible approaches incl. pros and cons

### 1. Remove only the unused exports

Pros:

- Minimizes the public API.

Cons:

- Leaves the visualization helper implementations as unreachable dead code.

### 2. Remove the unused exports and their isolated implementations

Pros:

- Fully removes code that existed only for Solver Lab.
- Keeps the solvable-game solver entry point intact.

Cons:

- None within the requested compatibility policy.

Recommendation:

- Use this approach.

### 3. Broaden the cleanup to other solver exports or scripts

Pros:

- Could find additional legacy code.

Cons:

- Exceeds the direct `two.tsx` cleanup scope.
- Risks touching the solvable-game generation pipeline the user explicitly wants preserved.

Recommendation:

- Defer as a separate task.

## Open questions to the user incl. recommendations (if any)

- None.

## New dependencies

- None.

## UX/UI Considerations

- None. These APIs are not used by the application UI after Solver Lab was deleted.

## Components -> Which components to reuse, which components to create?

- No components are changed or created.

## How to fetch data, how to cache

- No data fetching or caching changes.

## Related tasks

- `docs/product/solver-screen-removal/remove-solver-screen-experiment.md`

## Steps to implement and status of these steps

- [completed] Create this implementation plan before changing code.
- [completed] Confirm the APIs have no consumers outside their defining modules.
- [completed] Remove the atomic visualization helpers and exports.
- [completed] Make `findAutoMoveTarget` module-private.
- [completed] Re-scan references and record modified files.
- [completed] Record that testing was skipped at the user's request.

## Plan: Files to modify

- `docs/product/solver-screen-removal/remove-solver-screen-only-apis.md`
- `src/solitaire/klondike_solver_atomic.js`
- `src/solitaire/klondike.ts`
- `src/solitaire/klondike_solver_atomic.js`
- `src/solitaire/klondike.ts`

## Files actually modified

- `docs/product/solver-screen-removal/remove-solver-screen-only-apis.md`

## Identified issues and status of these issues

- Three atomic frame/path helpers are exported solely for the deleted Solver Lab.
  Status: fixed; their exports and implementations are removed.
- `findAutoMoveTarget` is exported even though all remaining calls are internal to `klondike.ts`.
  Status: fixed; the helper is now module-private.
- The worktree contains unrelated refresh-rate setting removal changes.
  Status: protected; this task will not modify them.
- Additional unrelated worktree changes appeared while this cleanup was in progress.
  Status: protected; none were modified or reverted by this task.

## Testing

- Not run, per the user request.
- A reference and diff inspection confirmed the removed helper names have no remaining
  references, `findAutoMoveTarget` is used only within `klondike.ts`, and
  `solveKlondikeAtomic` remains used by both the harvest script and solver wrapper.
