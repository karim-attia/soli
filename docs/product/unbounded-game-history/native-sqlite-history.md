# Unbounded Game History Native SQLite History

## User prompt

> Check why the history only shows 200 entries and give me a proposal for a fix. How would we do that best, including pros and cons? Thank you very much. Please just use, like, the normal markdown format.

> What's the recommendation for this if you really think it through? I mean, the use case is quite simple, to have like a scrollable, to like be able to scroll through past games, to have a little bit, really a tiny amount of statistics on top, and apparently also to compare the sortable games. This is really, really a very simple case. What's the proportional answer to this, to have like an easy, quite simple solution for this quite easy case? By the way, I've online also read about MKKV. Would that make sense? And kind of, yeah, think about it. There's like 300 users of the app, so we would need to make a little migration. How complicated is this even? Thank you.

> I am OK if web doesn't even have a history.
> The app is only android and ios. Web is kinda here because it's possible in RN, but no one uses it, not even me. Sometimes AI agent testing I guess, but no history here is totally fine.
> Search once again whether SQLite is then the recommended solution for this case.

> Implement now. Use sub-agents heavily.

## Description

Replace the capped single-value AsyncStorage game history with a small native SQLite
repository. Android and iOS retain all recorded games, load the history screen in pages,
and calculate the small statistics summary from the complete database. Web intentionally
keeps an empty history implementation and does not expose History in navigation.

The existing AsyncStorage payload contains at most 200 entries. On first native startup
after the update, valid entries are inserted into SQLite in one retry-safe transaction.
The old value is removed only after the transaction commits.

## Acceptance Criteria

- Android and iOS no longer discard history after 200 entries.
- The first 50 newest entries load when history initializes.
- Scrolling near the end of the history list loads the next page without duplicates.
- Games, solved, incomplete, and active counts represent all rows, not only loaded rows.
- Solvable-deal selection uses all-time grouped play and solve counts.
- Existing AsyncStorage history is migrated once without losing valid entries.
- A failed or interrupted migration can be retried safely.
- Recording and updating the active game continues to work with the existing synchronous
  gameplay-facing API.
- Clearing history removes all SQLite rows and the legacy AsyncStorage payload.
- Web initializes with empty history and does not show History in the drawer.
- No ORM, cache library, or general database abstraction is added.

## Design links

- No external design file.
- Existing history screen: `app/history.tsx`.
- Existing performance investigation:
  `docs/product/game-history-performance/many-games-slowdown-investigation.md`.

## Possible approaches incl. pros and cons

### Native SQLite repository

Pros:

- Matches ordered pagination, aggregate statistics, and grouped shuffle statistics.
- Removes the single-value size and rewrite behavior of AsyncStorage.
- Persists efficiently as history grows.
- `expo-sqlite` is maintained as part of the installed Expo SDK.

Cons:

- Adds a native dependency and requires new native builds.
- Requires a one-time migration and explicit row serialization.
- Native behavior needs device-level verification.

### Chunked AsyncStorage

Pros:

- No new dependency.
- Works on web without a platform implementation.

Cons:

- Requires custom page indexes, aggregation, updates, and failure recovery.
- Reimplements a small database poorly for the exact query needs.
- More application code and invariants than the SQLite solution.

### MMKV with indexed keys

Pros:

- Fast key-value reads and writes.
- Useful for small synchronous settings and state.

Cons:

- Does not provide ordering, pagination, aggregates, or grouped queries.
- Requires maintaining custom indexes and consistency.
- Adds multiple native packages for a problem SQLite already models directly.

## Open questions to the user incl. recommendations (if any)

- No blocking questions.
- Recommendation: retain all rows locally and use 50-row offset pages. For this app's
  expected per-device history size, offset pagination is simpler and sufficient.
- Recommendation: keep AsyncStorage for settings and current-game persistence; migrate
  only game history.

## New dependencies

- `expo-sqlite` at the version selected by `npx expo install` for Expo SDK 56.
- No ORM or additional persistence package.

## UX/UI Considerations

- Keep the existing history item and preview sheet design.
- The statistics row must not change as more pages load because it represents all history.
- Show the existing loading empty state during initialization.
- Prevent duplicate page requests while a page is loading.
- Web should omit the History drawer item rather than show a dead destination.

## Components -> Which components to reuse, which components to create?

- Reuse `HistoryListItem`, `HistoryPreviewSheet`, `HistoryStatsRow`, and `FlatList`.
- Reuse `HistoryProvider` and `useHistory` as the gameplay-facing boundary.
- Create a native `historyRepository` implementation and a web no-op implementation.
- No new visual component is required.

## How to fetch data, how to cache

- Open one `soli-history.db` connection lazily on native.
- Use a `history_entries` table with one row per `HistoryEntry`.
- Store the preview as JSON; store queryable fields as typed columns.
- Index `started_at` for newest-first page retrieval.
- Fetch pages of 50 ordered by `started_at DESC, id DESC`.
- Hold only loaded pages in React state.
- Fetch all-time counts and grouped solvable-shuffle statistics with aggregate SQL.
- Refresh compact aggregate state after history writes; history writes happen only at game
  boundaries, so no extra cache layer is warranted.

## Related tasks

- Preserve current-game `historyEntryId` linkage in `gamePersistence`.
- Adapt solvable-shuffle selection to compact aggregate history rather than loaded rows.
- Hide History navigation on web.

## Steps to implement and status of these steps

1. [x] Reconfirm `expo-sqlite` SDK 56 API and platform constraints from official docs.
2. [x] Document the implementation and package assumptions.
3. [x] Install the Expo-compatible `expo-sqlite` package.
4. [x] Add shared history repository contracts plus native SQLite and web no-op implementations.
5. [x] Refactor `HistoryProvider` for migration, pagination, all-time statistics, and writes.
6. [x] Refactor solvable shuffle selection to use grouped aggregate statistics.
7. [x] Add infinite loading to the history screen and hide History navigation on web.
8. [x] Add focused automated tests for repository-independent history logic.
9. [x] Run formatting, linting, type checking, and automated tests through a testing sub-agent.
10. [x] Run clean iOS and Android native builds serially and verify the installed apps.
11. [x] Update this plan with actual files, issues, and final test results.

## Plan: Files to modify

- `package.json`
- `yarn.lock`
- `src/storage/historyRepository.types.ts`
- `src/storage/historyRepository.ts`
- `src/storage/historyRepository.native.ts`
- `src/storage/historyRepository.web.ts`
- `src/state/history.tsx`
- `src/features/klondike/hooks/useSolvableShuffleSelector.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `app/history.tsx`
- `app/(tabs)/_layout.tsx`
- `app/_layout.tsx`
- Focused test files under `test/`
- This implementation plan and the package guide beside it.

## Files actually modified

- `docs/product/unbounded-game-history/native-sqlite-history.md`
- `docs/external-package-guides/expo-sqlite.md`
- `package.json`
- `yarn.lock`
- `app.json`
- `app/(tabs)/_layout.tsx`
- `app/_layout.tsx`
- `app/history.tsx`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/hooks/useSolvableShuffleSelector.ts`
- `src/state/history.tsx`
- `src/storage/historyRepository.ts`
- `src/storage/historyRepository.types.ts`
- `src/storage/historyRepository.native.ts`
- `src/storage/historyRepository.web.ts`
- `test/mocks/expo-sqlite.ts`
- `test/unit/state/history.pagination.test.ts`
- `test/unit/state/solvableShuffleSelector.test.ts`

## Identified issues and status of these issues

- Existing history is irreversibly capped at 200 rows; entries discarded by older builds
  cannot be recovered. Status: accepted constraint.
- The current solvable selector derives all-time behavior from the loaded entry array.
  Status: fixed by repository-provided grouped statistics.
- Web SQLite support is alpha and requires extra setup. Status: intentionally avoided with
  a no-op web repository.
- Runtime solvable shuffle IDs contain a unique suffix. Status: the SQLite schema and
  grouped query must store/use a stable `solvable_base_id` rather than grouping raw IDs.
- Failed legacy AsyncStorage cleanup could have hidden a successful SQLite import for the
  current session. Status: fixed by making cleanup non-fatal after the transaction commits.
- Retry import with a different existing active row could have used broad
  `INSERT OR IGNORE`. Status: fixed with `ON CONFLICT(id) DO NOTHING` and active-row
  normalization during import.
- Failed optimistic writes could have skewed later page offsets. Status: fixed by
  reconciling loaded rows, summary counts, and solvable stats after persistence failure.
- iOS `agent-device` UI snapshots were blocked by machine-level Apple developer tools
  security. Status: completed iOS UI verification with `simctl` launch, deep links, and
  screenshots after the clean build.

## Testing

- `yarn typecheck`: passed.
- `yarn lint:strict`: passed.
- `yarn jest --runInBand`: passed through the regression sub-agent, 8 suites and 44 tests.
- Focused Jest suites passed locally: `history.drawCount`, `history.pagination`,
  `solvableShuffleSelector`.
- `npx expo install --check`: passed.
- `npx expo-doctor`: passed, 21/21 checks.
- `git diff --check`: passed.
- `yarn oxfmt --check` on all files touched by this feature: passed.
- Repo-wide `yarn format:check`: failed only on three unchanged pre-existing solver scripts
  under `scripts/`.
- iOS: clean/rebuilt install on iPhone 17 Pro simulator
  `53E36318-51D0-44B7-996F-25BBF9C83828` passed. The app launched with JS, History rendered
  all-time stats and persisted rows, and History still rendered after app relaunch.
  Screenshots captured at `/tmp/soli-ios-play.png`, `/tmp/soli-ios-history.png`, and
  `/tmp/soli-ios-history-relaunch.png`.
- Android: `yarn release` passed, built and installed `app-release.apk` on physical A065.
  History rendered all-time stats (`102` games on the test device), scrolling reached older
  rows beyond the first page, and History still rendered after force-stop/relaunch.
  Screenshots captured at `/tmp/soli-android-history.png`,
  `/tmp/soli-android-history-scrolled.png`, and
  `/tmp/soli-android-history-relaunch.png`.
