# React 19 useEffectEvent Timer Cleanup

## User prompt

```text
useEffectEvent timer cleanup -> fully in a subagent(s), so that we keep main thread here free for all steps.
```

```text
Implement the React 19.2 `useEffectEvent` timer cleanup for Soli.

Workspace: `/Users/karim/kDrive/Code/soli`, current branch should be `codex/expo-rn-sdk-56-upgrade`.

You are not alone in the codebase: do not revert or overwrite changes made by others, and adapt to the current working tree. Do not stage or commit.

Repo instructions to follow:
- Use web search or official docs if needed to research `useEffectEvent`; rely on official React docs.
- Create a detailed implementation plan before implementation.
- Create folder `docs/product/react-19-use-effect-event-timer-cleanup` if it does not exist.
- Create markdown file `docs/product/react-19-use-effect-event-timer-cleanup/use-effect-event-timer-cleanup.md`.
- Fill in these sections exactly: `# [Feature Name] [Story Name]`, `## User prompt`, `## Description`, `## Acceptance Criteria`, `## Design links`, `## Possible approaches incl. pros and cons`, `## Open questions to the user incl. recommendations (if any)`, `## New dependencies`, `## UX/UI Considerations`, `## Components`, `## How to fetch data, how to cache`, `## Related tasks`, `## Steps to implement and status of these steps`, `## Plan: Files to modify`, `## Files actually modified`, `## Identified issues and status of these issues`, `## Testing`.
- Include this user prompt 1:1 in the plan doc: `useEffectEvent timer cleanup -> fully in a subagent(s), so that we keep main thread here free for all steps.`
- Update step status after each step. Do not leave stale pending implementation/test items.
- Leave small documentation notes in app code where the reason matters.
- No gold plating or broad refactors.

Ownership / write scope:
- Primary code file: `src/features/klondike/hooks/useKlondikeTimer.ts`
- Required plan doc: `docs/product/react-19-use-effect-event-timer-cleanup/use-effect-event-timer-cleanup.md`
- Add/adjust focused tests only if clearly useful and local test patterns exist. Avoid touching unrelated files.

Implementation intent:
- Apply React 19.2 `useEffectEvent` only where it is truly appropriate for effect-fired callbacks in `useKlondikeTimer.ts`.
- Best candidates are the interval tick callback and `AppState` listener callback, because React docs specifically call out timers/listeners with latest values without resubscribing.
- Be careful: `useEffectEvent` functions should be called from effects/effect callbacks, not passed as general component props or used to hide real dependencies.
- Preserve public behavior: timer starts after first move, pauses on background/unfocus, resumes when active/focused if needed, stops during auto-complete/win, cleans intervals on unmount.
- Avoid changing gameplay reducer behavior.

Useful current context:
- `useKlondikeTimer.ts` currently imports `useCallback`, `useEffect`, `useRef`; it has `pauseTimer`, `resumeTimerIfNeeded`, a `setInterval` effect dispatching `TIMER_TICK`, and an `AppState.addEventListener('change', handleAppStateChange)` effect.
- `useKlondikeGame.ts` calls `useKlondikeTimer({ state, dispatch, stateRef })` and does not use the returned value, so check whether returning helpers is still needed before changing the API.

Verification expectations:
- Run focused automated checks at minimum: `yarn typecheck`, `yarn lint`, and `yarn format:check`.
- Run focused Jest if there is a relevant target; otherwise run the full Jest suite if practical.
- Report exact commands and results.

Final report:
- Summarize files changed and why.
- Call out any behavior risks or follow-up testing needed.
- List exact test commands and results.
```

## Description

Modernize the Klondike timer hook for React 19.2 by using `useEffectEvent` for effect-fired callbacks that must observe latest values without forcing effect resubscription. The scoped cleanup targets the timer interval tick callback and the React Native `AppState` listener callback. It must keep the current timer lifecycle behavior intact and avoid reducer/gameplay changes.

Official React docs reviewed on 2026-06-14:

- https://react.dev/reference/react/useEffectEvent

## Acceptance Criteria

- The branch is confirmed as `codex/expo-rn-sdk-56-upgrade`.
- The existing working tree is respected; no unrelated changes are reverted, overwritten, staged, or committed.
- `useKlondikeTimer.ts` imports and uses React 19.2 `useEffectEvent` only for effect callback code that is fired by effects or effect-managed subscriptions.
- Interval tick dispatches remain tied to `TIMER_TICK_INTERVAL_MS`, start only while `state.timerState === 'running'`, dispatch an immediate tick when interval starts, and clear intervals when stopped or unmounted.
- `AppState` handling still resumes on `active` and pauses on `inactive` or `background`.
- Focus handling still resumes on focus and pauses on unfocus.
- First-move start, auto-complete stop, win stop behavior, and timer-start repair behavior are preserved.
- Public hook behavior remains compatible with current callers. Since `useKlondikeGame.ts` ignores the return value, remove the unused returned helpers only if it simplifies the hook without creating API risk inside this repo.
- Small code comments explain why `useEffectEvent` is used where the reason matters.
- Required checks are run and exact results are recorded here and in the final report.

## Design links

No visual design links. This is a hook behavior cleanup with no UI changes.

## Possible approaches incl. pros and cons

1. Use `useEffectEvent` for interval tick and `AppState` callback only.
   - Pros: Matches official React guidance for timers/listeners needing latest values; keeps lifecycle effects narrow; avoids hiding ordinary dependencies.
   - Cons: Requires React 19.2 types/runtime support and care with lint expectations around Effect Events.

2. Convert pause/resume helpers themselves to `useEffectEvent`.
   - Pros: Could reduce `useCallback` dependency churn for focus and app-state effects.
   - Cons: Riskier because `useFocusEffect` expects a callback argument and Effect Events should not be passed around as general callbacks; less aligned with the user request.

3. Keep existing `useCallback` implementation.
   - Pros: Lowest change risk.
   - Cons: Does not complete the React 19.2 cleanup and keeps listener callbacks coupled to helper identity.

Recommended approach: approach 1, with small internal helpers retained for focus handling.

## Open questions to the user incl. recommendations (if any)

No blocking questions. Recommendation: keep this scoped to `useKlondikeTimer.ts` and the required plan document; create a separate task if broader timer tests or hook-test infrastructure are desired.

## New dependencies

None. React 19.2.3 and `@types/react` 19.2 are already present in `package.json`.

No `external-packages.mdc` file was present in the workspace when checked, and no package changes are needed.

## UX/UI Considerations

No UI changes. The user-visible requirement is preserving timer behavior during gameplay, focus changes, app backgrounding, auto-complete, wins, and unmount cleanup.

## Components

No components to create or modify. Existing hook only: `useKlondikeTimer`.

## How to fetch data, how to cache

No data fetching or caching changes. The hook reads the latest game state from `stateRef.current` where necessary and dispatches reducer actions.

## Related tasks

- Expo/RN SDK 56 upgrade work on the same branch.
- Existing staged import change in `useKlondikeTimer.ts` from `@react-navigation/native` to `expo-router/react-navigation`.

## Steps to implement and status of these steps

- [x] Confirm branch and inspect working tree before editing.
- [x] Review official React `useEffectEvent` documentation.
- [x] Inspect `useKlondikeTimer.ts`, caller usage, and local test patterns.
- [x] Create required plan document.
- [x] Update `useKlondikeTimer.ts` with scoped `useEffectEvent` usage.
- [x] Update this plan with actual modified files and implementation status.
- [x] Run automated verification commands.
- [x] Update this plan with final test results and any identified issues.

## Plan: Files to modify

- `src/features/klondike/hooks/useKlondikeTimer.ts`
- `docs/product/react-19-use-effect-event-timer-cleanup/use-effect-event-timer-cleanup.md`

## Files actually modified

- `docs/product/react-19-use-effect-event-timer-cleanup/use-effect-event-timer-cleanup.md` - created this implementation plan.
- `src/features/klondike/hooks/useKlondikeTimer.ts` - added Effect Events for the interval tick and `AppState` listener while preserving existing focus and timer lifecycle behavior.

## Identified issues and status of these issues

- Existing staged changes are present in the repository, including the `useKlondikeTimer.ts` import source change. Status: noted and preserved; this task will add unstaged changes without staging or committing.
- No focused hook test target exists yet. Status: full Jest suite run once in non-watch mode.
- No sub-agent runner was exposed in this session. Status: verification commands were run directly and sequentially.

## Testing

Completed commands:

- `yarn typecheck` - passed.
- `yarn lint` - passed with 0 warnings and 0 errors.
- `yarn format:check` - passed; all matched files use the correct format.
- `yarn jest --runInBand` - passed; 6 test suites, 40 tests.
