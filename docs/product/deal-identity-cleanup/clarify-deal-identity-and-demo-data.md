# Deal Identity Cleanup Clarify Deal Identity And Demo Data

## User prompt

```text
In [klondike.ts](src/solitaire/klondike.ts),
    dealId: deal.exactId,
    exactId: deal.exactId,

we have this. is this duplicate? makes sense to clean up? also check in [useKlondikePersistence.ts](src/features/klondike/hooks/useKlondikePersistence.ts)

pls move DEMO_DEAL_CONFIG to different file.

We use different named things like fisher yates, generators, etc. where are they in the code? pls name them in the code with comments.

please add more inline comment annotations about what a code section is doing and why. so that it's more easily understandable at a glance.

currentState.dealSolvabilityBasis === 'draw1' [useKlondikeGame.ts](src/features/klondike/hooks/useKlondikeGame.ts) -> why do we need that? is that legacy? if not, for what?

export type DealSolvabilityBasis = 'draw1' | 'catalog' | null [klondike.ts](src/solitaire/klondike.ts) same here, do we still need DealSolvabilityBasis draw1 ?

Check for some more similar things, thorough review.
```

```text
Do we need that legacyDrawOneSolvable? Do we ned that legacy shuffle id? Why? What would it mean to remove?
[best-practice-deal-identity-proposal.md](docs/product/solvable-harvest-strategy/best-practice-deal-identity-proposal.md)
can we already clean up history api?
```

```text
Search for shuffleId and check.

Go through all staged changes and look for similar simplifications. The goal is really to have cleaned up and simple code without historical growth mess.

Old hydrated Draw-1 legacy games can still get a solvable active history row during startup; we only removed the rare fallback that created a new completion row after history linkage was already lost.
-> what should we do about that?

Why not fully clean HistoryEntry.shuffleId yet:
We can, but it should be a separate storage/API rename because it touches HistoryEntry, record inputs, SQLite column naming, repository mapping, game-state comparisons, and tests.
The proposal doc still says to keep existing shuffleId during migration while treating exactId as canonical. So I cleaned the v2-only stats API now and left the broader entry/schema rename for a deliberate pass.
-> should we change that and fully clean? can we? what would it mean?
```

```text
Since we don't currently load old persisted key-value games, we can safely remove this, right?
Find a solution for demo game, this is internal only. can we just give it a random id so that the field may not even need to be nullable?
i tend to go towards the direction that do not show any legacy data in phase 2, because this looks complicated in code. we can still do a best effort migration, but then everything is in new format so that we keep code clean. treat this as current assumption and clean up all legacy stuff.

also go through rest of staged code and make list with proposals to cleanup things that are similar in the way of thinking.

question, independent of above: in key value pair, do we save complete deal?
```

## Description

Clarify the live deal identity model after phase 1. New random and catalog games use exact deal IDs as the canonical replayable identifier. The internal developer demo uses a stable exact-format ID so the live state shape stays non-null, but it is not treated as a public catalog replay contract. The cleanup removes stale legacy-solvable markers, removes old persisted-state identity compatibility, and moves developer demo data out of the core reducer module.

## Acceptance Criteria -> add more details than in the product document if it makes sense

- `DEMO_DEAL_CONFIG` is moved out of `klondike.ts`.
- New random and catalog games keep `exactId` as the canonical replayable ID.
- `dealId`/`exactId` duplication is removed from live game and history state.
- New catalog games do not also store redundant legacy `solvableId`.
- `draw1` / `dealSolvabilityBasis` is removed from the live game state.
- Developer demo state uses a stable exact-format ID derived from its full hand-authored deck.
- Comments identify deal generators, catalog selection, and visual-only randomization.
- Active-game persistence uses the new exact-only shape and ignores old key-value game payloads.
- Typecheck, lint, tests, and formatting checks pass.
- Remove random legacy deal IDs if they only mask malformed saved state.
- Clean up internal solvable-history stats API naming from old `dealId` terminology to `exactId`.
- Collapse the broader game/history identifier onto exact IDs for phase 1.
- Remove Draw-1 legacy solvability from new history rows.
- Rename remaining "solvable shuffle" selectors to "solvable deal" selectors.
- Old key-value history is not displayed in phase 2 unless a best-effort import converts it into the new exact-ID history shape.

## Design links

N/A

## Possible approaches incl. pros and cons

- Remove `shuffleId`, `dealId`, `solvableId`, and `draw1` fully from the live model.
  - Pros: cleanest new model.
  - Cons: requires touching history types, repository mapping, game-state comparisons, and tests in one pass.
- Keep fields but add comments only.
  - Pros: lowest risk.
  - Cons: leaves new states writing redundant legacy fields.
- Remove live fields and do not load old key-value saved-game identity shapes.
  - Pros: simplest runtime and persistence model.
  - Cons: in-progress old saved games reset instead of resume.

Recommendation: use `exactId` as the only game/history deal key. If legacy history is ever imported, convert it into the new format at import time instead of keeping legacy display branches.

## Open questions to the user incl. recommendations (if any)

No blocking question. Recommendation: do the exact-only cleanup now because the SQLite history schema has not shipped. Use a fresh SQLite database file and a fresh active-game storage key instead of adding migration code for local test-device data.

## New dependencies

None.

## UX/UI Considerations

No UI changes.

## Components -> Which components to reuse, which components to create?

No UI components.

## How to fetch data, how to cache

No data-fetching changes. Solvable catalog data remains bundled TypeScript.

## Related tasks

- `docs/product/legacy-solver-cleanup/remove-previous-solver-code.md`
- `docs/product/solvable-harvest-strategy/best-practice-deal-identity-proposal.md`

## Steps to implement and status of these steps

1. **Completed**: Review identity, persistence, demo, randomization, and history references.
2. **Completed**: Move demo deal data and clarify live-vs-legacy identity fields.
3. **Completed**: Add focused inline comments for generators and compatibility behavior.
4. **Completed**: Remove unnecessary legacy fallback logic and clean solvable-history stats API naming.
5. **Completed**: Fully clean legacy `shuffleId` history/gameplay API naming to `exactId`.
6. **Completed**: Run validation.
7. **Completed**: Summarize the remaining cleanup recommendation.
8. **Completed**: Collapse `dealId` into non-null `exactId` and remove old saved-game identity compatibility.
9. **Completed**: Review remaining staged code for similar cleanup proposals.
10. **Completed**: Re-run validation.

## Plan: Files to modify

- `src/solitaire/klondike.ts`
- `src/solitaire/demoDeal.ts`
- `src/solitaire/dealIdentity.ts`
- `src/solitaire/drawCount.ts`
- `src/storage/gamePersistence.ts`
- `src/storage/historyRepository.types.ts`
- `src/storage/historyRepository.native.ts`
- `src/storage/historyRepository.web.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/features/klondike/hooks/useSolvableDealSelector.ts`
- `src/features/klondike/hooks/useCelebrationController.ts`
- `test/unit/solitaire/klondike.drawCount.test.ts`
- `docs/product/deal-identity-cleanup/clarify-deal-identity-and-demo-data.md`

## Files actually modified

- `src/solitaire/klondike.ts`
- `src/solitaire/demoDeal.ts`
- `src/solitaire/dealIdentity.ts`
- `src/solitaire/drawCount.ts`
- `src/storage/gamePersistence.ts`
- `src/storage/historyRepository.types.ts`
- `src/storage/historyRepository.native.ts`
- `src/storage/historyRepository.web.ts`
- `src/state/history.tsx`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/features/klondike/hooks/useSolvableDealSelector.ts`
- `src/features/klondike/hooks/useCelebrationController.ts`
- `src/features/klondike/hooks/useDemoGameLauncher.ts`
- `scripts/generate-solvable-deals-v2.js`
- `test/unit/solitaire/klondike.drawCount.test.ts`
- `test/unit/storage/gamePersistence.test.ts`
- `test/unit/state/history.drawCount.test.ts`
- `test/unit/state/history.startedEntry.test.ts`
- `test/unit/state/history.pagination.test.ts`
- `test/unit/state/solvableDealSelector.test.ts`
- `docs/product/deal-identity-cleanup/clarify-deal-identity-and-demo-data.md`

## Identified issues and status of these issues

- `dealId` and `exactId` look duplicated for exact-ID games.
  - Status: removed; phase 1 uses `exactId` as the only deal key.
- New catalog games still set `solvableId` to the same exact ID.
  - Status: removed from live state; catalog solvability is derived from `exactId` + draw count.
- Developer demo sets `dealSolvabilityBasis: 'draw1'`.
  - Status: removed; demo is a plain deterministic non-catalog state.
- Randomization names are easy to confuse.
  - Status: added comments at the generator/selector/visual-randomness boundaries.
- `legacyDrawOneSolvable` only affects a rare fallback row when active history linkage is already lost.
  - Status: removed; old loaded games can still get an active history row during hydration, but solvability now comes only from the v2 exact-ID catalog.
- Random `LEGACY-*` persisted shuffle IDs hide malformed saved state and cannot recreate a deck.
  - Status: replaced with exact-ID fallback or invalid-state clearing.
- Solvable-history stats API still used old `dealId` naming for exact-ID keys.
  - Status: renamed to `exactId` / `getSolvableDealHistoryStats`.
- Old hydrated Draw-1 legacy games could still create a solvable active history row.
  - Status: removed; active history rows now derive solvability only from the v2 exact-ID catalog.
- SQLite history still used the pre-release `shuffle_id` column naming.
  - Status: removed the intermediate local identifier column and moved to `exact_id` in a fresh `soli-history-v4.db` file because the previous SQLite schemas have not shipped.
- Old active-game key-value payloads could still be normalized into current state.
  - Status: removed; the new exact-only payload uses `soli/klondike/v2` and old payloads are ignored.
- Old key-value history clearing was still present even though the old history is no longer read.
  - Status: removed from `clearHistory`; phase 2 can add a one-time import only if it converts rows into the new exact-ID format.
- Developer demo needed a non-exact local ID.
  - Status: changed to a stable exact-format ID and checksum generated from its full hand-authored deck; it remains internal-only and outside the solvable catalog.
- `createStartedHistoryEntryInputFromState` callers still treated the return value as nullable.
  - Status: simplified now that every live game has a non-null exact ID.
- History preview normalization still carried old `hiddenCount` placeholder support.
  - Status: removed; phase 2 does not display legacy history rows unless they are imported into the current preview shape.

## Similar cleanup proposals from the staged diff

- Update or replace `docs/product/history-entry-hook-extraction/use-klondike-history-entry-proposal.md` before using it. It still talks about older `shuffleId`-style matching and should be rewritten around `exactId + drawCount`.
- Add a superseded/current-implementation note to older solvable-harvest brainstorming docs before treating them as task specs. Some sections are useful historical context, but the implementation now assumes exact-only runtime state and no legacy display branches.
- Consider a separate future task to shrink active-game persistence. The key-value active game currently saves the whole `GameState`, including stock, waste, tableau, foundations, undo history, future snapshots, timer/settings fields, and history-entry linkage.
- Keep `src/data/solvableDealsV2.generated.ts` as generated data. If it changes again, regenerate it instead of hand-editing; adding a generated header with counts/checksum would make review easier.
- The Android ADB release-script hardening is useful but orthogonal to deal identity; if this becomes a commit/PR, consider keeping it separated from the model cleanup.

## Testing

- `yarn oxfmt src/solitaire/klondike.ts src/solitaire/demoDeal.ts src/solitaire/dealIdentity.ts src/storage/gamePersistence.ts src/state/history.tsx src/storage/historyRepository.types.ts src/features/klondike/hooks/useKlondikeGame.ts src/features/klondike/hooks/useKlondikePersistence.ts src/features/klondike/hooks/useSolvableDealSelector.ts src/features/klondike/hooks/useCelebrationController.ts scripts/generate-solvable-deals-v2.js test/unit/solitaire/klondike.drawCount.test.ts docs/product/deal-identity-cleanup/clarify-deal-identity-and-demo-data.md`
  - Status: passed.
- `yarn typecheck`
  - Status: passed.
- `yarn lint`
  - Status: passed.
- `git diff --check`
  - Status: passed.
- `yarn jest --runInBand`
  - Status: passed, 10 test suites / 55 tests.
- Read-only testing sub-agent review
  - Status: passed; no issues found. The sub-agent also ran `yarn typecheck` and targeted Jest suites.
- `yarn typecheck`, `yarn lint`, `git diff --check`, and `yarn jest --runInBand` after removing legacy fallback logic and renaming solvable-history stats API
  - Status: passed; Jest passed 10 suites / 55 tests.
- Second read-only sub-agent review after legacy fallback removal
  - Status: passed; no findings. The sub-agent verified exact-ID-only persisted states load, missing deal identifiers reject, and no runtime leftovers remain for `legacyDrawOneSolvable`, `LEGACY-*`, `getSolvableHistoryStats`, or `SolvableHistoryStats`.
- `yarn typecheck`, `yarn lint`, `yarn format:check`, `git diff --check`, and `yarn jest --runInBand` after the full `shuffleId` -> `dealId` cleanup
  - Status: passed; Jest passed 10 suites / 56 tests.
- Read-only sub-agent review after full cleanup
  - Status: passed after addressing its findings: refreshed stale staging and updated this plan status. It found no on-disk runtime regressions.
- `yarn oxfmt src/solitaire/drawCount.ts src/solitaire/demoDeal.ts src/solitaire/klondike.ts src/state/history.tsx src/features/klondike/hooks/useKlondikeGame.ts docs/product/deal-identity-cleanup/clarify-deal-identity-and-demo-data.md docs/product/solvable-harvest-strategy/best-practice-deal-identity-proposal.md`
  - Status: passed.
- `yarn typecheck`, `yarn lint`, `yarn format:check`, `git diff --check`, and `yarn jest --runInBand` after the final exact-only cleanup
  - Status: passed; Jest passed 10 suites / 54 tests.
- Final source/test grep for removed identity terms
  - Status: passed; no live source/test hits for removed `dealId`, `shuffleId`, `solvableId`, `dealSolvabilityBasis`, old history keys, or old SQLite column names.
