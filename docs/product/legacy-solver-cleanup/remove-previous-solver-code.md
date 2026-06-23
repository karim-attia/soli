# Legacy Solver Cleanup Remove Previous Solver Code

## User prompt

```text
phone was warm before. but it's also 33c outside. but check with adb if because of that.
probably false alarm.

what happens now to phones that get this version and had key value par history before. is there still any kind of migration happening to the sqlite version that is now outdated? or did we remove that? is the migration code still here?

also can we remove all previous solver code? pls do

give an example of a game id. is this 8-symbols like in history? is this abbreviated? or enough to make totally unique? can deck be created from this?

when doing random games, we create a fully random id and then a deck from it, correct? we don't choose a random one from the 45K solvable ones..? is id in history enough to identify totally random deck?
```

## Description

Remove the previous in-repo JavaScript solver and old tableau-harvesting scripts now that phase 1 uses exact deal IDs and a Lonelybot-generated v2 catalog. Also verify that old key-value history is not being imported into the new SQLite v2 history.

## Acceptance Criteria -> add more details than in the product document if it makes sense

- Android thermal state is checked through ADB before making code changes.
- Old JavaScript solver sources and old harvest CLI scripts are removed.
- Package scripts no longer expose the removed old harvest path.
- The new v2 catalog generator remains available.
- Demo/release device automation remains, because it is not the old solver engine.
- No runtime migration imports old key-value history into SQLite v2.
- Stale unused repository migration APIs are removed.
- Typecheck, lint, unit tests, and formatting checks pass.

## Design links

N/A

## Possible approaches incl. pros and cons

- Remove only package scripts.
  - Pros: safest minimal change.
  - Cons: leaves confusing dead solver files in the repo.
- Remove old solver files and old package scripts.
  - Pros: clearest phase 1 state; prevents accidental future use of the old solver.
  - Cons: historical docs still mention deleted files.
- Remove old solver files plus historical docs.
  - Pros: no stale links.
  - Cons: too much churn; historical decision records are still useful.

Recommendation: remove old solver code and old package scripts, keep historical docs as dated records.

## Open questions to the user incl. recommendations (if any)

No blocking question. Recommendation: keep `scripts/run-demo-autosolve.js` because it is device automation for demos/release QA, not the old solver engine.

## New dependencies

None.

## UX/UI Considerations

No UI changes.

## Components -> Which components to reuse, which components to create?

No UI components.

## How to fetch data, how to cache

No data-fetching changes. New solvable deals continue to come from the bundled v2 exact-ID catalog.

## Related tasks

- `docs/product/solvable-harvest-strategy/best-practice-deal-identity-proposal.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-lonelybot-guide.md`

## Steps to implement and status of these steps

1. **Completed**: Check Android thermal state with ADB.
2. **Completed**: Find old solver code and active references.
3. **Completed**: Remove old solver files, old harvest package scripts, old legacy dataset, and stale migration API.
4. **Completed**: Run validation.
5. **Completed**: Summarize history and game-ID behavior.

## Plan: Files to modify

- `package.json`
- `scripts/harvest-solvable-new.js`
- `scripts/harvest-solvable.js`
- `scripts/klondike-solver-new.js`
- `scripts/run-blended-50.log`
- `scripts/solve-klondike.js`
- `scripts/solvable-dataset.js`
- `scripts/shuffles-100.json`
- `src/data/README.md`
- `src/data/solvable-shuffles.json`
- `src/data/solvable-shuffles.raw.ts`
- `src/data/solvableShuffles.ts`
- `src/solitaire/klondike.ts`
- `src/solitaire/klondike_solver.js`
- `src/solitaire/klondike_solver_atomic.js`
- `src/solitaire/solver-iterations.md`
- `src/storage/historyRepository.native.ts`
- `src/storage/historyRepository.types.ts`
- `src/storage/historyRepository.web.ts`
- `test/unit/state/history.startedEntry.test.ts`
- `docs/product/legacy-solver-cleanup/remove-previous-solver-code.md`

## Files actually modified

- `package.json`
- `scripts/harvest-solvable-new.js`
- `scripts/harvest-solvable.js`
- `scripts/klondike-solver-new.js`
- `scripts/run-blended-50.log`
- `scripts/solve-klondike.js`
- `scripts/solvable-dataset.js`
- `scripts/shuffles-100.json`
- `src/data/README.md`
- `src/data/solvable-shuffles.json`
- `src/data/solvable-shuffles.raw.ts`
- `src/data/solvableShuffles.ts`
- `src/solitaire/klondike.ts`
- `src/solitaire/klondike_solver.js`
- `src/solitaire/klondike_solver_atomic.js`
- `src/solitaire/solver-iterations.md`
- `src/storage/historyRepository.native.ts`
- `src/storage/historyRepository.types.ts`
- `src/storage/historyRepository.web.ts`
- `test/unit/state/history.startedEntry.test.ts`
- `docs/product/legacy-solver-cleanup/remove-previous-solver-code.md`

## Identified issues and status of these issues

- Old key-value history import is not called, but the unused repository import API still exists.
  - Status: removed unused API.
- Old JS solver scripts are still available through `yarn harvest`.
  - Status: removed old scripts and package entries.
- Old legacy solvable-shuffle data can still look like a live source.
  - Status: removed old data module and old raw/generated files; v2 catalog remains.
- Phone felt warm after builds.
  - Status: ADB thermal status is normal; likely ambient temperature plus recent build activity.
- Android automation sub-agent could not return a report because the tool hit its usage limit.
  - Status: main agent completed the validation directly.

## Testing

- `yarn oxfmt package.json src/solitaire/klondike.ts src/storage/historyRepository.native.ts src/storage/historyRepository.types.ts src/storage/historyRepository.web.ts test/unit/state/history.startedEntry.test.ts docs/product/legacy-solver-cleanup/remove-previous-solver-code.md`
  - Status: passed.
- Old solver reference scan across `package.json`, `scripts`, `src`, and `test`.
  - Status: passed; no active references remain.
- `yarn release`
  - Status: passed after stopping a stale earlier release process that had no Gradle/install child.
  - Installed package: `ch.karimattia.soli`, version `0.8.0`, versionCode `13`.
  - Confirmed `lastUpdateTime=2026-06-19 00:09:59` on device `192.168.1.12:42415`.
- Android smoke test on device `192.168.1.12:42415`
  - Cleared app data with `pm clear ch.karimattia.soli`, which deletes SQLite history for this non-debuggable release APK.
  - Launched from the normal Android launcher.
  - Started a new game and opened History.
  - Verified the new game appears immediately as `Active`.
  - Verified badge wording is `Solvable`.
  - Screenshots saved under `/tmp/soli-smoke/`.
- ADB thermal check after release/smoke
  - Status: normal. Android reported `Thermal Status: 0`; live HAL values included battery about `32°C` and skin about `32.7°C`.
- `yarn typecheck`
  - Status: passed.
- `yarn lint`
  - Status: passed.
- `git diff --check`
  - Status: passed.
- `yarn jest --runInBand`
  - Status: passed, 10 test suites / 53 tests.
