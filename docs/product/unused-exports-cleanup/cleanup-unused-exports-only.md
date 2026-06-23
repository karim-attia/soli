# Unused Exports Cleanup Cleanup Unused Exports Only

## User prompt

```text
# AGENTS.md instructions for /Users/karim/kDrive/Code/soli

<INSTRUCTIONS>
# General

Use web search to research a tool, library, pattern, etc. to see how others do something.

Compatibility notice (explicit): This repo makes NO backward-compatibility guarantees. Breaking changes to are allowed and expected.

Leave small documentation notes inline throughout the app to better understand reasons why we did something in a certain way. E.g. we do this this way instead of that way because we learned if we do it that way, we will run into issue X.

# Implementation plan

Create a detailed implementation plan for every feature. IF THERE IS NO IMPLEMENTATION PLAN, SEARCH FOR AN EXISTING ONE.

Create a folder @docs/product/<feature-name> if it doesn't exist yet.

Create a markdown file in the folder with the name of the story.

Fill in the following sections:
- # [Feature Name] [Story Name]
- ## User prompt
Add all prompts from the chat 1:1 in here.
- ## Description
- ## Acceptance Criteria -> add more details than in the product document if it makes sense
- ## Design links
- ## Possible approaches incl. pros and cons
- ## Open questions to the user incl. recommendations (if any)
- ## New dependencies
- ## UX/UI Considerations
- ## Components -> Which components to reuse, which components to create?
- ## How to fetch data, how to cache
- ## Related tasks
- ## Steps to implement and status of these steps
- ## Plan: Files to modify
- ## Files actually modified
- ## Identified issues and status of these issues
- ## Testing

Directly start implementing except if the user asks for a different approach. But always create a detailed implementation plan before starting to implement.

Update the status of the steps after the implementation of each step. NEVER SKIP THIS!

# Scope Limitations

> Rationale: Prevents unnecessary work and keeps all efforts focused on agreed tasks, avoiding gold plating and scope creep.

- No gold plating or scope creep is allowed.
- All work must be scoped to the specific task at hand.
- Any identified improvements or optimizations must be proposed as separate tasks.


# Testing

Test everything you do in a real environment (when it makes sense!). In order to save context, always use sub-agents to test. Use GPT 5.5 medium reasoning for the testing sub-agent. Give detailed testing instructions and get a detailed test report, though. Also don't run two of these sub-agents in parallel if they will run a build. Reason: See below.

Native: Use agent-device skill
Web: Use Playwright with skill (but no need to test on web since the app is for native only, but it's an option.)

iOS: Always run a clean build on the connected simulator. Make sure the build is finished before checking on the device.
Android: Run "yarn release" and wait until the build is complete. Use scripts/android-unlock-pattern.sh script to unlock physical Android device if it's locked.

Never run two builds at the same time as otherwise the computer nearly crashes when running builds in parallel, e.g. iOS and Android in parallel. Also check if there are other processes running a build and kill them first. If there is already a build running, this is no excuse to not run the build and test on an outdated build. Kill the other build first, then build, then test.

Check if the build was actually installed on the device or the device/emulator.

# Components

Use expo ui or tamagui components for all UI elements.

-> to write: components in component folder, create component there with defaults instead of directly using tamagui components in the screen.

# External packages

**External Package Research and Documentation**: For any proposed tasks that involve external packages, to avoid hallucinations, use the web to research the documentation first to ensure it's 100% clear how to use the API of the package. Then for each package, a document should be created `<feature-name>-<package>-guide.md` that contains a fresh cache of the information needed to use the API. It should be date-stamped and link to the original docs provided. E.g., if pg-boss is a library to add as part of task 2-1 then a file `tasks/2-1-pg-boss-guide.md` should be created. This documents foundational assumptions about how to use the package, with example snippets, in the language being used in the project.

</INSTRUCTIONS><environment_context>
  <cwd>/Users/karim/kDrive/Code/soli</cwd>
  <shell>zsh</shell>
  <current_date>2026-06-16</current_date>
  <timezone>Europe/Zurich</timezone>
  <filesystem><workspace_roots><root>/Users/karim/kDrive/Code/soli</root></workspace_roots><permission_profile type="disabled"><file_system type="unrestricted" /></permission_profile></filesystem>
</environment_context>
```

```text
You are not alone in the codebase; other changes may happen in parallel, so do not revert edits you did not make. Task: double-check and implement cleanup of unused exports only. Candidate unused exports: recordGameResultFromState, RecordGameResultFromStateParams, getSolvableShuffleById, listSolvableShuffleIds, SOLVABLE_SHUFFLES_VERSION, and isDrawOneSolvabilityResult if it only exists for tests. Own these files only: src/state/history.tsx, src/data/solvableShuffles.ts, src/features/klondike/hooks/useSolvableShuffleSelector.ts, and affected tests under test/unit/state. Use rg to verify usages before deleting. Update tests accordingly. Do not touch historyRepository files or useKlondikeGame. Run focused tests if possible and report changed file paths.
```

## Description

Remove only the confirmed unused exports from the scoped state/data/selector files, and update affected unit tests so no production-only API remains exported for test-only usage. Avoid unrelated refactors and leave all history repository and game hook files untouched.

## Acceptance Criteria

- Verify every candidate export with `rg` before deletion.
- Remove `recordGameResultFromState` and `RecordGameResultFromStateParams` only if no live imports/usages remain.
- Remove `getSolvableShuffleById`, `listSolvableShuffleIds`, and `SOLVABLE_SHUFFLES_VERSION` only if no live imports/usages remain.
- Remove `isDrawOneSolvabilityResult` only if its only usage is tests, and update the affected test to assert behavior without importing the production helper.
- Remove any now-dead private implementation left behind solely for deleted exports.
- Do not edit `historyRepository` files or `useKlondikeGame`.
- Run focused tests when possible and report results.

## Design links

N/A. This is an internal cleanup with no UI surface.

## Possible approaches incl. pros and cons

- Direct deletion after `rg` verification.
  - Pros: Smallest diff, matches the explicit cleanup request, preserves behavior.
  - Cons: Relies on text search to catch external consumers in this repo.
- Keep private helpers while removing exports.
  - Pros: Minimizes logic movement.
  - Cons: Leaves dead code if no internal callers exist, so it does not fully clean up unused exports.

Recommendation: Use direct deletion, including dead private support code that exists only for the removed exports.

## Open questions to the user incl. recommendations (if any)

None. The task gives enough scope and explicitly permits breaking changes.

## New dependencies

None.

## UX/UI Considerations

No user-facing UI changes.

## Components -> Which components to reuse, which components to create?

No component changes.

## How to fetch data, how to cache

No data fetching or caching changes. The existing solvable shuffle dataset export remains intact.

## Related tasks

None identified in scope.

## Steps to implement and status of these steps

- [x] Verify candidate usage with `rg` across the repo.
- [x] Remove unused history state export and its dead type/imports.
- [x] Remove unused solvable shuffle exports and any private map used only by them.
- [x] Remove the test-only draw-one solvability export and update affected unit tests.
- [x] Re-run `rg` for deleted names and run focused tests.

## Plan: Files to modify

- `docs/product/unused-exports-cleanup/cleanup-unused-exports-only.md`
- `src/state/history.tsx`
- `src/data/solvableShuffles.ts`
- `src/features/klondike/hooks/useSolvableShuffleSelector.ts`
- `test/unit/state/history.drawCount.test.ts`
- `src/data/solvableShuffles.ts`
- `src/features/klondike/hooks/useSolvableShuffleSelector.ts`
- `test/unit/state/history.drawCount.test.ts`

## Files actually modified

- `docs/product/unused-exports-cleanup/cleanup-unused-exports-only.md`
- `src/state/history.tsx`

## Identified issues and status of these issues

- Existing unrelated dirty file: `src/storage/historyRepository.native.ts`. Status: observed, intentionally untouched.
- `isDrawOneSolvabilityResult` was only imported by `test/unit/state/history.drawCount.test.ts`. Status: confirmed by `rg`.
- `recordGameResultFromState` and `RecordGameResultFromStateParams` have no live repo usages; `RecordGameResultOptions` was only support for the removed export. Status: removed from `src/state/history.tsx`.
- `getSolvableShuffleById`, `listSolvableShuffleIds`, and `SOLVABLE_SHUFFLES_VERSION` have no live repo usages. Status: removed from `src/data/solvableShuffles.ts`; the private map used only by the deleted getter was removed too.
- `isDrawOneSolvabilityResult` existed only for tests. Status: removed from `src/features/klondike/hooks/useSolvableShuffleSelector.ts`; `test/unit/state/history.drawCount.test.ts` now asserts the predicate inline.

## Testing

Scoped deleted-name verification:

```sh
rg "recordGameResultFromState|RecordGameResultFromStateParams|RecordGameResultOptions|getSolvableShuffleById|listSolvableShuffleIds|SOLVABLE_SHUFFLES_VERSION|isDrawOneSolvabilityResult|SOLVABLE_SHUFFLE_MAP" src test -n
```

Result: no matches.

Focused test command:

```sh
yarn jest --runInBand test/unit/state/history.drawCount.test.ts test/unit/state/solvableShuffleSelector.test.ts
```

Result: passed. 2 test suites, 5 tests.
