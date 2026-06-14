# Solver Screen Removal Remove Solver Screen Experiment

## User prompt

```text
[two.tsx](app/(tabs\)/two.tsx)
remove the solver screen experiment completely and do a cleanup to remove things that we only have because of that.
goal: clean up the codebase and remove things we are not using anymore.
Don't remove the solver to generate games for solvable games as we soon need more solvable games.
```

## Description

Remove the developer-only Solver Lab screen and the route, navigation, and copy that exist only to expose that experiment. Preserve the atomic Klondike solver, shuffle inputs, harvest scripts, and solvable-game data pipeline used to generate curated solvable games.

## Acceptance Criteria

- `app/(tabs)/two.tsx` is deleted.
- The drawer no longer registers or displays a `Solver Lab` destination.
- `/two` is no longer an Expo Router route and resolves through the app's normal not-found handling.
- Drawer layout code no longer subscribes to settings solely to hide or show the removed route.
- Imports used only by the Solver Lab drawer entry are removed.
- Settings no longer describes developer mode as exposing solver experiments.
- Developer mode remains available because it still controls demo games, animation tuning, display refresh-rate tuning, and developer logging.
- `src/solitaire/klondike_solver.js`, `src/solitaire/klondike_solver_atomic.js`, `scripts/shuffles-100.json`, solver/harvest scripts, and solvable shuffle data remain intact.
- Static checks pass.
- The running web app shows no Solver Lab drawer item, and normal game navigation remains functional.
- No new dependencies are introduced.

## Design links

- Expo Router file-based routing: https://docs.expo.dev/router/basics/navigation/
- Expo Router drawer layout: https://docs.expo.dev/router/advanced/drawer/

## Possible approaches incl. pros and cons

### 1. Delete only `two.tsx`

Pros:

- Smallest deletion.

Cons:

- Leaves an invalid `Drawer.Screen` registration, stale imports, settings subscriptions, and misleading developer-mode copy.
- Does not meet the requested cleanup goal.

### 2. Remove the route and all direct experiment-only integration

Pros:

- Removes the experiment completely from the app surface.
- Keeps the cleanup narrowly tied to code that exists only for the screen.
- Preserves the game-generation solver pipeline.

Cons:

- Historical product and delivery documents will still mention the former screen, because rewriting historical records would make them inaccurate.

Recommendation:

- Use this approach.

### 3. Remove every file containing solver-related code

Pros:

- Maximum source reduction.

Cons:

- Would delete the explicitly preserved solvable-game generation pipeline.
- Would prevent harvesting more solvable games.

Recommendation:

- Reject this approach.

## Open questions to the user incl. recommendations (if any)

- None blocking.
- Recommendation: retain historical documentation references to `two.tsx`; they describe past work and are not runtime dependencies.
- Recommendation: keep Developer mode and rename its description around the tools that remain.

## New dependencies

- None.

## UX/UI Considerations

- The drawer loses the Solver Lab item in every mode.
- Existing Play, Hello, History, and Settings destinations keep their current order.
- Developer mode remains meaningful without Solver Lab because it still reveals demo games and internal motion/display controls.
- Direct visits to the deleted `/two` path should show the existing not-found experience rather than silently redirecting to gameplay.

## Components -> Which components to reuse, which components to create?

- Reuse the existing Expo Router drawer and existing drawer destinations.
- Reuse the existing Settings `ToggleRow`.
- Create no new UI components.
- Delete the self-contained components embedded in `app/(tabs)/two.tsx` with the screen.

## How to fetch data, how to cache

- No remote data is fetched.
- No cache behavior changes.
- Settings persistence remains unchanged.
- Solvable shuffle generation continues to read its existing local solver and shuffle data.

## Related tasks

- `docs/delivery/16/16-1.md`
- `docs/product/settings-clean-up/settings-clean-up.md`
- `docs/product/draw-count-setting/solitaire-stock-draw-count.md`
- `docs/product/auto-up-setting/automatic-auto-up-setting.md`

## Steps to implement and status of these steps

- [completed] Create this implementation plan before changing application code.
- [completed] Trace Solver Lab references and separate experiment-only code from the solvable-game generation pipeline.
- [completed] Delete the Solver Lab route and remove its drawer registration and experiment-only imports/state.
- [completed] Update Developer mode copy to describe only retained tooling.
- [completed] Search for stale runtime references and document the files actually modified.
- [completed] Run formatting, lint, type checks, and focused solver-generation regression checks.
- [completed] Verify the change in the running web app through the user's smoke test.
- [completed] Record detailed testing results and close identified issues.

## Plan: Files to modify

- `docs/product/solver-screen-removal/remove-solver-screen-experiment.md`
- `app/(tabs)/two.tsx` (delete)
- `app/(tabs)/_layout.tsx`
- `app/settings.tsx`

## Files actually modified

- `docs/product/solver-screen-removal/remove-solver-screen-experiment.md`
- `app/(tabs)/two.tsx` (deleted)
- `app/(tabs)/_layout.tsx`
- `app/settings.tsx`

## Identified issues and status of these issues

- Solver Lab is still a file-based route and a registered drawer destination.
  Status: fixed; the route file and drawer registration are removed.
- The drawer layout subscribes to `developerMode` only to control Solver Lab visibility.
  Status: fixed; the subscription and solver-only icon import are removed.
- The Settings description still advertises solver experiments.
  Status: fixed; it now describes demo games and motion/display tuning.
- The atomic solver is shared with solvable-game generation and must not be removed.
  Status: preserved and verified through active references from `scripts/harvest-solvable.js`
  and `src/solitaire/klondike_solver.js`.
- `yarn typecheck:fallback` currently rejects deprecated TypeScript configuration options.
  Status: pre-existing and unrelated; the repo's primary `yarn typecheck` command passes.
  Treat any TypeScript configuration migration as a separate task.

## Testing

Planned:

- `yarn exec oxfmt --check app/(tabs)/_layout.tsx app/settings.tsx docs/product/solver-screen-removal/remove-solver-screen-experiment.md`
- `yarn exec oxlint --tsconfig tsconfig.json app/(tabs)/_layout.tsx app/settings.tsx`
- `yarn typecheck`
- A focused solver-generation smoke check using the existing atomic solver or harvest trial without modifying generated data.
- Real web verification at `http://localhost:8081/`:
  - Open the drawer and confirm Solver Lab is absent.
  - Confirm Play, Hello, History, and Settings remain available.
  - Enable Developer mode and confirm Solver Lab still does not appear.
  - Visit `/two` and confirm the existing not-found experience appears.
  - Return to Play and confirm the game screen renders.

Results:

- `yarn exec oxfmt --check ...` passed after formatting this plan.
- `yarn exec oxlint --tsconfig tsconfig.json ...` passed with 0 warnings and 0 errors.
- `yarn typecheck` passed through the repo's primary `typecheck:tsgo` path.
- `yarn typecheck:fallback` remains blocked by unrelated deprecated TypeScript configuration
  options in the existing `tsconfig.json`.
- The read-only atomic solver smoke test loaded all 100 existing shuffles, confirmed
  `solveKlondikeAtomic` is exported, and executed it against an existing shuffle with
  conservative limits.
- HTTP checks returned 200 for `/` and 404 for the deleted `/two` route.
- The Playwright IAB backend was unavailable in the testing agent's environment, so the user
  completed the final UI smoke test and reported no issue.
- Test commands created or modified no repository files.
