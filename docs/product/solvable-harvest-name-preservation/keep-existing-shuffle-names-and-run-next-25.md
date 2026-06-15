# Solvable Harvest Name Preservation Remove Lower Params And Run 4x

## User prompt
`Please update @package.json to use this one and to accept a target goal of usable games. replace the existing harvest command. run with target 25.`

`why did it remove the name of all other solvable shuffles in @src/data/solvable-shuffles.raw.ts?
Pls update the script to not do this. It's OK if there is no name for newly added ones, but existing ones should not be modified.
Is there a way to find out with which params the 534 solvable games were created? E.g. higher depth, beam width, nodes,  etc.?
Was there documentation? What was the share of solvable games when committing to the new solver?
At end run for next 25.`

`does the new solver accept params? try running 50 with 2X the params and let's see if the share of solved games is higher.`

`remove the 50 games that were calculated at lower params (logic is that these games are easier on average and i want the average difficulty of solvable games). serch web for theoretical share of solvable games and tell me. then run 50 at 4X the params.`

## Description
Fix the raw solvable dataset serializer so it does not drop existing `name=` metadata, restore dropped names in the current working copy, document historical generation parameters for the 534 `new-solver` entries, compare solved share at higher parameters, remove lower-parameter generated entries, gather theoretical solvability references from web sources, and run another 50 entries at 4x parameters.

## Acceptance Criteria
- Existing entries with `name=` in `src/data/solvable-shuffles.raw.ts` remain unchanged after harvest runs.
- New entries may omit `name=` unless explicitly provided.
- A reproducible command exists to run harvest with a target goal (usable games target).
- Historical parameter evidence for the 534-entry run is documented from repository sources.
- Lower-parameter batch (`harvested-20260615-00535`..`00584`) is removed.
- 4x parameter batch of 50 entries is generated successfully.
- Theoretical solvability references are captured from credible sources.

## Design links
- N/A

## Possible approaches incl. pros and cons
- Parse and persist only known fields (`id`, `name`, `addedAt`, `source`, `tableau`) in `solvable-dataset.js`.
  - Pros: minimal, explicit, low risk.
  - Cons: may still drop unknown future metadata keys.
- Parse/persist generic metadata map for each entry.
  - Pros: future-proof for new metadata.
  - Cons: larger refactor surface and validation complexity.

## Open questions to the user incl. recommendations (if any)
- Should we preserve arbitrary metadata keys beyond `name` in raw dataset headers?
  - Recommendation: yes in a follow-up, but keep this task scoped to `name`.

## New dependencies
- None.

## UX/UI Considerations
- N/A (data/script task only).

## Components -> Which components to reuse, which components to create?
- Reuse existing scripts:
  - `scripts/harvest-solvable-new.js`
  - `scripts/solvable-dataset.js`
- No UI components.

## How to fetch data, how to cache
- Read historical data from git history and existing docs.
- No runtime cache changes.

## Related tasks
- Existing solvable harvesting and solver tasks in `docs/delivery/11/*`.

## Batch percentages (15.06.26)
- Default params, batch #1: `target=25`, `beamWidth=4000`, `maxNodes=1500000`, `maxDepth=600` -> `25/59` solved = `42.37%` (IDs `00535`..`00559`, later removed).
- Default params, batch #2: `target=25`, `beamWidth=4000`, `maxNodes=1500000`, `maxDepth=600` -> `25/59` solved = `42.37%` (IDs `00560`..`00584`, later removed).
- Default combined baseline: `50/118` solved = `42.37%`.
- 2x params batch: `target=50`, `beamWidth=8000`, `maxNodes=3000000`, `maxDepth=1200` -> `50/72` solved = `69.44%` (IDs `00585`..`00634`, kept).
- 4x params batch: `target=50`, `beamWidth=16000`, `maxNodes=6000000`, `maxDepth=2400` -> `50/69` solved = `72.46%` (IDs `00635`..`00684`, kept).
- Improvement: `2x` vs default = `+27.07pp`; `4x` vs default = `+30.09pp`; `4x` vs `2x` = `+3.02pp`.

## Steps to implement and status of these steps
1. **Completed**: Identified root cause and implemented serializer fix to preserve `name`.
2. **Completed**: Restored existing names in current dataset from pre-change committed data.
3. **Completed**: Collected historical parameter/documentation evidence for 534-run; confirmed share data is not persisted in repo logs.
4. **Completed**: Ran next batch with target 25 and verified output and name preservation.
5. **Completed**: Ran target 50 with 2x params and computed solved share.
6. **Completed**: Removed lower-parameter generated 50 entries (`00535`..`00584`).
7. **Completed**: Researched theoretical Klondike solvability shares from web/academic references.
8. **Completed**: Ran target 50 with 4x params and recorded solved share.
9. **Completed**: Documented dated percentage results from all batches in this file and `scripts/harvest-solvable-new.js`.

## Plan: Files to modify
- `scripts/solvable-dataset.js`
- `src/data/solvable-shuffles.raw.ts`
- `docs/product/solvable-harvest-name-preservation/keep-existing-shuffle-names-and-run-next-25.md`

## Files actually modified
- `docs/product/solvable-harvest-name-preservation/keep-existing-shuffle-names-and-run-next-25.md`
- `scripts/solvable-dataset.js`
- `src/data/solvable-shuffles.raw.ts`
- `package.json`
- `scripts/harvest-solvable-new.js`
- `scripts/klondike-solver-new.js`

## Identified issues and status of these issues
- Existing names were dropped by serializer rewrite.
  - Status: resolved.

## Testing
- Run `yarn harvest --target=25` after serializer fix.
- Verify existing named entries from `HEAD` retain exact same `name=` values after save cycle.
- Verify new entries append correctly (`harvested-20260615-00560` .. `harvested-20260615-00584`).
- Verify dataset remains parseable and totals update consistently (`650` total blocks, `50` added today).
- Run `yarn harvest --target=50 --beamWidth=8000 --maxNodes=3000000 --maxDepth=1200` and compute solved share.
- Remove IDs `harvested-20260615-00535`..`harvested-20260615-00584` and verify none remain.
- Run `yarn harvest --target=50 --beamWidth=16000 --maxNodes=6000000 --maxDepth=2400` and compute solved share.
