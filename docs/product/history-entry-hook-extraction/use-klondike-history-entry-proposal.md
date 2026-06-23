# History Entry Hook Extraction Use Klondike History Entry Proposal

## User prompt

```text
You are not alone in the codebase; other changes may happen in parallel, so do not revert edits you did not make. Task: create a markdown proposal file for extracting history-entry lifecycle logic from useKlondikeGame.ts into a useKlondikeHistoryEntry hook. Do not implement the refactor. Own docs/product/history-entry-hook-extraction/use-klondike-history-entry-proposal.md only. Proposal should include current problem, target hook API sketch, implementation steps, risks, tests, and recommendation. Keep it practical and tailored to this app.
```

## Description

Proposal only. This document scopes a future refactor that would extract the active history-entry lifecycle from `src/features/klondike/hooks/useKlondikeGame.ts` into a dedicated `useKlondikeHistoryEntry` hook, without changing runtime behavior in this task.

Official React docs reviewed on 2026-06-16:

- https://react.dev/learn/reusing-logic-with-custom-hooks
- https://react.dev/reference/react/useEffect

The relevant React guidance is that custom hooks are the React-native way to share and organize stateful logic, and effect setup/cleanup should remain mirrored and explicit. This fits the current app because the lifecycle is mostly effect-driven bookkeeping around history rows, persistence linkage, and win recording.

## Current problem

`useKlondikeGame.ts` currently owns several unrelated responsibilities: board metrics, settings, persistence, card-flight dispatch, celebration handoff, invalid-move feedback, demo-game launch, and history-entry lifecycle. The history-entry lifecycle alone spans:

- `currentGameEntryIdRef`, `currentStartingPreviewRef`, and `currentDisplayNameRef`.
- Active history-row recovery after both history and storage hydration complete.
- New-game active-row creation for solvable and normal deals.
- Current-game completion/incomplete recording.
- Delayed solved-result recording during celebration handoff.
- Starting-preview refresh when a new game begins.
- Direct ref sharing with `useKlondikePersistence` and `useDemoGameLauncher`.

That makes the main hook harder to reason about because a change in new-game, celebration, persistence, or demo-game behavior can accidentally affect whether a history row is duplicated, left active, marked incomplete, or given the wrong preview.

## Acceptance Criteria

- Create this proposal document at `docs/product/history-entry-hook-extraction/use-klondike-history-entry-proposal.md`.
- Do not implement the refactor.
- Do not modify app, test, config, package, lockfile, or unrelated documentation files.
- Include the current problem, target hook API sketch, implementation steps, risks, tests, and recommendation.
- Tailor the proposal to the current Soli code paths, especially `useKlondikeGame.ts`, `useKlondikePersistence.ts`, `useDemoGameLauncher.ts`, and `src/state/history.tsx`.
- Keep the proposal practical and scoped to a future extraction, not a broader history rewrite.

## Design links

- React custom hook guidance: https://react.dev/learn/reusing-logic-with-custom-hooks
- React effect caveats and cleanup guidance: https://react.dev/reference/react/useEffect
- Local source: `src/features/klondike/hooks/useKlondikeGame.ts`
- Local source: `src/features/klondike/hooks/useKlondikePersistence.ts`
- Local source: `src/features/klondike/hooks/useDemoGameLauncher.ts`
- Local source: `src/state/history.tsx`

## Possible approaches incl. pros and cons

1. Extract a focused `useKlondikeHistoryEntry` hook.
   - Pros: Keeps lifecycle effects, pending solved timer cleanup, active-row recovery, and result recording in one place; reduces `useKlondikeGame.ts` surface area; preserves current history provider and persistence APIs.
   - Cons: Needs careful hook ordering because `useKlondikePersistence` still needs `currentGameEntryIdRef`; may require a small `useDemoGameLauncher` API adjustment if direct ref mutation is replaced.

2. Extract only pure history-entry helper functions.
   - Pros: Lowest behavior risk; easier unit tests around matching active entries and creating update payloads.
   - Cons: Leaves effects, refs, delayed solved timer, and new-game integration inside `useKlondikeGame.ts`, so the main lifecycle complexity remains.

3. Move more responsibility into `HistoryProvider`.
   - Pros: Centralizes repository-facing operations near `recordResult` and `updateEntry`.
   - Cons: Couples provider state to Klondike reducer details, timer state, celebration timing, and saved-game linkage. That makes `HistoryProvider` less reusable and increases provider churn.

Recommended approach: approach 1, with a deliberately small hook boundary and no provider rewrite.

## Open questions to the user incl. recommendations (if any)

- Should `useKlondikeHistoryEntry` own `currentGameEntryIdRef` or accept it?
  Recommendation: keep creating the ref in `useKlondikeGame.ts` for the first extraction and pass it into the new hook, because `useKlondikePersistence` already restores the persisted `historyEntryId` into that same ref.
- Should the future refactor also update `useDemoGameLauncher` so it receives `clearCurrentGameEntryLink()` instead of mutating `currentGameEntryIdRef.current` directly?
  Recommendation: yes, but only as part of the extraction. This keeps ownership of history-link mutation inside the history-entry hook while preserving the demo launcher behavior.
- Should this extraction add hook-render tests?
  Recommendation: avoid introducing a new hook-test dependency. Add focused tests around pure helper functions if helper boundaries appear naturally, then rely on existing type/lint/Jest/native smoke coverage for the hook wiring.

## New dependencies

None.

No external packages are proposed, so no package guide document is needed.

## UX/UI Considerations

No UI changes are proposed. The future refactor must preserve:

- New-game confirmation behavior.
- Demo-game launch behavior.
- History preview content, especially the starting board preview.
- Solved versus incomplete history status.
- Celebration timing so recording a solved game does not add work to the exact win frame.
- Saved-game resume behavior with the same active history row.

## Components -> Which components to reuse, which components to create?

- Reuse `HistoryProvider` and `useHistory` from `src/state/history.tsx`.
- Reuse `useKlondikePersistence` with the existing `currentGameEntryIdRef` parameter.
- Reuse `useDemoGameLauncher`, preferably with a narrow callback replacement for direct ref clearing.
- Create `src/features/klondike/hooks/useKlondikeHistoryEntry.ts` in the future refactor.
- Do not create UI components.

## How to fetch data, how to cache

No remote data is involved.

The future hook should read history state through `useHistory()` or receive the minimal history context values from `useKlondikeGame.ts`. Prefer using `useHistory()` inside the new hook for `entries`, `hydrated`, `recordResult`, and `updateEntry`, while `useKlondikeGame.ts` can keep reading `solvableStats` for `useSolvableShuffleSelector`.

The hook should not add new caching. It should preserve the existing refs used for synchronous lifecycle decisions:

- `currentGameEntryIdRef` remains the saved-game linkage shared with persistence.
- A hook-owned display-name ref keeps fallback result recording from depending on current render timing.
- A hook-owned pending-solved timer ref owns cleanup for delayed solved-result recording.

## Related tasks

- Native SQLite history and active-entry support in `docs/product/unbounded-game-history/native-sqlite-history.md`.
- Started history-entry behavior covered by `test/unit/state/history.startedEntry.test.ts`.
- Saved-game `historyEntryId` persistence in `src/storage/gamePersistence.ts`.
- Celebration handoff work in `docs/product/auto-up-win-handoff/28-2-end-of-auto-up-jitter.md`.
- Demo-game launcher integration in `src/features/klondike/hooks/useDemoGameLauncher.ts`.

## Target hook API sketch

```ts
type UseKlondikeHistoryEntryParams = {
  state: GameState
  stateRef: React.MutableRefObject<GameState>
  currentGameEntryIdRef: React.MutableRefObject<string | null>
  previousHasWonRef: React.MutableRefObject<boolean>
  storageHydrated: boolean
  animationsEnabled: boolean
  celebrationAnimationsEnabled: boolean
  dispatch: React.Dispatch<GameAction>
}

type RecordStartedGameOptions = {
  startedAt?: string
  preview?: HistoryPreview
  displayName?: string
}

type UseKlondikeHistoryEntryResult = {
  recordStartedGame: (
    nextState: GameState,
    options?: RecordStartedGameOptions
  ) => string | null
  recordCurrentGameResult: (options?: { solved?: boolean }) => void
  clearCurrentGameEntryLink: () => void
  flushPendingSolvedResultAfterHandoff: () => void
}
```

Expected call shape in `useKlondikeGame.ts` after the future extraction:

```ts
const currentGameEntryIdRef = useRef<string | null>(null)

const storageHydrated = useKlondikePersistence({
  state,
  dispatch,
  resetCardFlights,
  previousHasWonRef,
  currentGameEntryIdRef,
  settingsHydrated,
  autoUpEnabled,
  preferredDrawCount,
})

const {
  recordStartedGame,
  recordCurrentGameResult,
  clearCurrentGameEntryLink,
  flushPendingSolvedResultAfterHandoff,
} = useKlondikeHistoryEntry({
  state,
  stateRef,
  currentGameEntryIdRef,
  previousHasWonRef,
  storageHydrated,
  animationsEnabled,
  celebrationAnimationsEnabled,
  dispatch,
})
```

Notes:

- `currentGameEntryIdRef` stays outside the hook initially because persistence writes to it during saved-game hydration and saves from it during debounced persistence.
- `useKlondikeHistoryEntry` should call `useHistory()` internally for `entries`, `hydrated`, `recordResult`, and `updateEntry`.
- `recordStartedGame(nextState, options)` replaces the repeated preview/display-name/entry-input creation in both solvable and normal `dealNewGame` branches.
- `clearCurrentGameEntryLink()` gives `useDemoGameLauncher` a narrow API so it no longer needs to know how the history entry link is stored.
- The hook owns cleanup for the pending solved-result timeout because that timer exists only for history recording.

## Implementation steps

Future refactor steps, intentionally not performed in this proposal task:

1. Create `src/features/klondike/hooks/useKlondikeHistoryEntry.ts`.
2. Move `currentStartingPreviewRef`, `currentDisplayNameRef`, `pendingSolvedResultRef`, and `pendingSolvedResultTimeoutRef` into the new hook.
3. Move active-row recovery after `historyHydrated && storageHydrated` into the hook.
4. Move `recordCurrentGameResult` into the hook and preserve the current fallback behavior for lost entry-id linkage.
5. Move delayed solved-result timer cleanup and `flushPendingSolvedResultAfterHandoff` into the hook.
6. Move the `hasWon` transition effect into the hook, including timer stop dispatch and pending-solved reset behavior.
7. Move the "new game begins" preview/display-name refresh effect into the hook.
8. Replace duplicated started-entry creation in `dealNewGame` with `recordStartedGame(nextState, { startedAt })`.
9. Update `useDemoGameLauncher` to receive `clearCurrentGameEntryLink` instead of `currentGameEntryIdRef`, unless that creates unnecessary churn.
10. Keep `useKlondikePersistence` unchanged except for receiving the same ref from `useKlondikeGame.ts`.
11. Run focused automated checks and native smoke checks.

## Risks

- Duplicate active entries: the active-row recovery effect must continue matching by `shuffleId` and `drawCount`, and must not create a new row before both history and saved-game hydration complete.
- Lost saved-game linkage: persistence must still restore `historyEntryId` before completion logic tries to update the row.
- Wrong preview: completion must continue preserving the start snapshot and not overwrite the preview with the solved board.
- Win-frame regression: solved recording is currently delayed when celebration animations are enabled. Moving this code must keep that handoff intact.
- Stale closures: `recordCurrentGameResult` depends on current history entries for matching active rows. The hook should use current context values and `stateRef.current` the same way the existing code does.
- Demo-game behavior: the demo launcher currently records the current game, clears the link, then hydrates demo state. The future extraction must preserve that sequence.
- Over-extraction: the hook should not absorb card-flight, board-locking, dialog, or solvable-shuffle selection logic.

## Tests

For this proposal-only task:

- Verify the proposal file exists at the requested path.
- Verify this task created only the requested proposal file. The wider worktree may still contain unrelated parallel changes.

For the future refactor:

- `yarn typecheck`
- `yarn lint`
- `yarn format:check`
- `yarn jest --runInBand test/unit/state/history.startedEntry.test.ts test/unit/storage/gamePersistence.test.ts test/unit/state/history.drawCount.test.ts test/unit/solitaire/klondike.undo.test.ts`
- Native iOS clean build on the connected simulator, then smoke test resume, new game, win recording, and History preview.
- Android `yarn release` after iOS finishes, then smoke test the same flows on the installed build.

Builds should be run sequentially, with any existing native build process stopped first.

## Recommendation

Extract `useKlondikeHistoryEntry` as a focused lifecycle hook, but keep the first pass conservative:

- Keep `currentGameEntryIdRef` created in `useKlondikeGame.ts` so persistence integration stays stable.
- Move only history-entry lifecycle logic into the new hook.
- Leave history storage/repository behavior in `HistoryProvider`.
- Replace direct demo-launcher ref clearing with a narrow callback only if it stays within the same extraction.
- Avoid adding dependencies or a broad hook-testing setup.

This should make `useKlondikeGame.ts` easier to maintain while preserving the app's current active-entry, resume, new-game, demo, and win-recording behavior.

## Steps to implement and status of these steps

- [completed] Inspect the current Klondike history-entry lifecycle in `useKlondikeGame.ts`.
- [completed] Inspect related persistence, demo launcher, history provider, and existing tests.
- [completed] Review current React custom hook and effect guidance.
- [completed] Create the requested product-doc folder.
- [completed] Draft this proposal document.
- [completed] Verify the file contents and changed files.

## Plan: Files to modify

- `docs/product/history-entry-hook-extraction/use-klondike-history-entry-proposal.md`

## Files actually modified

- `docs/product/history-entry-hook-extraction/use-klondike-history-entry-proposal.md` - created this proposal document.

## Identified issues and status of these issues

- History-entry lifecycle logic is currently spread through `useKlondikeGame.ts`. Status: documented, not changed.
- `useDemoGameLauncher` directly clears `currentGameEntryIdRef.current`. Status: documented as a future extraction consideration, not changed.
- The future hook needs to coordinate with `useKlondikePersistence` hydration ordering. Status: documented as the main API-shape constraint.

## Testing

Completed proposal-only verification:

- `test -f docs/product/history-entry-hook-extraction/use-klondike-history-entry-proposal.md` - passed.
- `find docs/product/history-entry-hook-extraction -maxdepth 2 -type f -print` - returned only this proposal file.
- `git ls-files --others --exclude-standard docs/product/history-entry-hook-extraction` - returned only this proposal file.
- `git status --short` - confirmed this folder is untracked and also showed unrelated existing changes outside this task; no app files were modified for this proposal.

No typecheck, Jest, native build, or app smoke test was run because this task changed documentation only and explicitly did not implement the refactor.
