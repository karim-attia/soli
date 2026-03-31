# Game History Performance Many Games Slowdown Investigation

## Description
Investigate whether the app slows down as more games are played, with special attention to memory growth, persisted storage growth, render cost, and whether previous game state is retained when starting a new game. The goal is to identify concrete root causes, gather code-level evidence, and recommend the smallest high-impact fixes.

## Acceptance Criteria
- Identify every code path that stores or retains completed or in-progress game data.
- Determine whether starting a new game clears the prior game's live reducer state, undo stack, and persisted saved-game state.
- Determine whether historical game data can affect gameplay performance even when the History screen is not open.
- Determine whether the History screen itself has scaling risks as entry count grows.
- Quantify the most likely performance bottlenecks with code evidence and, where practical, payload-size or runtime measurements.
- Produce a prioritized recommendation list with clear next steps and testing guidance.

## Design links
- None yet.

## Possible approaches incl. pros and cons
- Static code audit first.
  - Pros: Fastest way to find retention bugs, unbounded arrays, expensive persistence, and broad re-render patterns.
  - Cons: Needs follow-up measurement if multiple plausible bottlenecks remain.
- Add targeted instrumentation or run small local scripts to estimate payload size and scaling.
  - Pros: Converts suspicion into evidence without changing app behavior much.
  - Cons: May still miss device-specific UI costs.
- Run the app in a real/native environment and reproduce long-play sessions.
  - Pros: Best way to confirm user-facing lag and capture runtime behavior.
  - Cons: Slowest option; only worth doing if static evidence is ambiguous.

## Open questions to the user incl. recommendations (if any)
- None blocking for the investigation.
- Recommendation 1: investigate and reduce cross-game animation/native-view churn first. The current user report plus runtime measurements point more strongly to repeated deal cycles than to one long game.
- Recommendation 2: stabilize card identity and avoid unnecessary full remounts of animated card components across deals where possible.
- Recommendation 3: keep the undo/persistence fix on the list, but treat it as a separate long-session safeguard unless a later runtime pass shows it is part of the user's current slowdown.

## New dependencies
- None planned.

## UX/UI Considerations
- Any fix should preserve undo, history previews, and saved-game resume behavior.
- If we cap or compress undo history, we should keep the scrubber usable and clearly define the supported undo depth.
- If we reduce History screen render work, it should not change visible content or ordering.

## Components -> Which components to reuse, which components to create?
- Reuse existing Klondike state, history, persistence, and History screen components for the investigation.
- No new UI components planned unless follow-up fixes require them.

## How to fetch data, how to cache
- No remote data involved.
- Relevant local data sources:
  - `AsyncStorage` saved game payload in `src/storage/gamePersistence.ts`
  - `AsyncStorage` history payload in `src/state/history.tsx`
  - In-memory reducer state in `src/solitaire/klondike.ts`

## Related tasks
- Saved game persistence for Klondike.
- Game history and preview support.
- Undo scrubber and reducer snapshot management.

## Steps to implement and status of these steps
- [completed] Inspect existing docs and performance-sensitive architecture.
- [completed] Trace game, undo, persistence, and history retention paths.
- [completed] Quantify likely scaling costs and confirm the highest-risk bottlenecks.
- [completed] Decide whether runtime/device checks are still needed. Static evidence was decisive, so native reproduction was not required for this investigation.
- [completed] Finalize recommendations and document next actions.

## Plan: Files to modify
- `docs/product/game-history-performance/many-games-slowdown-investigation.md`

## Files actually modified
- `docs/product/game-history-performance/many-games-slowdown-investigation.md`

## Identified issues and status of these issues
- Confirmed current risk, but not the user's primary reported symptom: current-game undo history is unbounded.
  - `pushHistory` appends a full deep-cloned `GameSnapshot` on every move/recycle and on auto-complete scheduling.
  - Relevant files: `src/solitaire/klondike.ts` (`pushHistory`, `snapshotFromState`, move handlers).
  - Impact: memory and GC pressure grow with the number of moves in the active game, but the user reports this is not the main slowdown they feel.
- Confirmed current risk, but likely secondary for the reported issue: the full saved-game payload is rewritten to `AsyncStorage` on every `state` change.
  - `useKlondikePersistence` depends on the entire `state` object.
  - `serializeState` still drops `selected`, so even selection-only changes trigger a full save of effectively the same board payload.
  - The timer ticks every second while running, so a long-running game attempts a full save every second even without a move.
- Confirmed long-session safeguard issue: large undo history is persisted as one large `AsyncStorage` entry.
  - Local measurement of a representative payload:
    - 200 undo snapshots: about 694.7 KB serialized
    - 300 undo snapshots: about 1.04 MB serialized
    - 500 undo snapshots: about 1.73 MB serialized
    - around 592 undo snapshots: about 2.0 MB serialized
  - This lines up dangerously with AsyncStorage's documented Android per-entry limit of roughly 2 MB.
- Confirmed high confidence runtime issue: repeated completed-game cycles grow native memory noticeably even when the saved history database stays small.
  - Android runtime sample on a connected device:
    - Baseline before the repeated-game loop: Native Heap about 247 MB, Total PSS about 435 MB.
    - After 15 short game cycles: Native Heap about 327 MB, Total PSS about 537 MB.
    - After 8 more short game cycles: Native Heap about 335 MB, Total PSS about 559 MB.
  - The `RKStorage` database stayed small during the same run, so this does not look like a completed-history storage-size problem.
  - Conclusion: the current user symptom is more consistent with native/view/animation accumulation across deals than with the capped history list.
- Likely root cause, not yet fully proven line-by-line: repeated deals recreate large animated card subtrees and native animation state.
  - `createDeck` assigns ever-new card IDs via a global counter.
  - Card components are keyed by `card.id` across tableau, waste, stock, and foundation renderers.
  - Each `CardView` allocates multiple Reanimated shared values and an animated ref.
  - Hypothesis: repeated deals create substantial native animation/view churn, and cleanup is incomplete or delayed enough to show up after 10 to 20 games.
- Confirmed lower risk: completed game history is capped and relatively compact.
  - `HistoryProvider` caps stored history entries at 200.
  - Each entry stores preview-only data, not full 52-card reducer snapshots.
  - Local measurement of 200 history entries was about 323.2 KB serialized.
  - Conclusion: completed-game history can affect startup/history-screen cost a bit, but it does not explain the native-memory growth seen during repeated deals.
- Confirmed not the root cause: starting a new game does clear the live reducer state and persisted saved-game slot.
  - `createInitialState` and `createSolvableGameState` both start with empty `history` and `future`.
  - `requestNewGame` clears persisted game storage and resets animation refs before dealing the new board.
  - Old games remain only as capped history entries, not as live gameplay state.
- Confirmed secondary optimization area: the History screen is functional but not especially tuned for scaling.
  - It uses `FlatList`, which is already virtualized, so it is not catastrophic at 200 items.
  - It does not currently use extra tuning such as memoized rows, `getItemLayout`, or adjusted render-window props.
  - This is worth polishing only after fixing live-game undo/persistence.

## Testing
- Static code review first.
- Quantified serialized payload sizes with a local Node script using representative game-state shapes:
  - Saved game payload sizes with full undo history:
    - 0 moves: about 3.6 KB
    - 100 moves: about 349.1 KB
    - 200 moves: about 694.7 KB
    - 300 moves: about 1.04 MB
    - 500 moves: about 1.73 MB
  - History-entry payload sizes with preview-only entries:
    - 50 entries: about 80.7 KB
    - 100 entries: about 161.4 KB
    - 200 entries: about 323.2 KB
- Ran a native Android reproduction pass on a connected device using repeated short game cycles.
  - The app process showed substantial native-memory growth across repeated deal cycles.
  - The on-device `RKStorage` database remained small, which weakens the theory that completed-history persistence size is the main cause of the current slowdown.
- Caveat: the repeated-game loop was automated with ADB taps, so the exact numbers are directional rather than final-performance benchmarks.
- Recommended follow-up testing once fixes are implemented:
  - Start from a fresh app session and play 20 short games on-device.
  - Capture `dumpsys meminfo` before and after to verify native heap stays roughly stable.
  - Compare behavior with card-flight and other animations disabled versus enabled.
  - Verify new-game flow still clears saved-game state and undo history correctly.
  - Open History with 200 entries and verify scrolling and sheet opening remain smooth.
