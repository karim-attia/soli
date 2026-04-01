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
- Recommendation 2: do not reuse `card.id` values across deals unless card-local animation state and flight memory are also scoped per game. The current architecture treats `card.id` as the identity for React keys and multiple animation caches.
- Recommendation 3: keep the undo/persistence fix on the list, but treat it as a separate long-session safeguard unless a later runtime pass shows it is part of the user's current slowdown.
- Recommendation 4: keep the native Android new-game dialog for now per product preference, and continue debugging the repeated-game slowdown outside the custom-dialog experiment.

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
- [completed] Run native Android reproduction checks on a connected device across repeated new-game cycles.
- [completed] Replace the Android native new-game confirmation alert with an in-tree Tamagui dialog so repeated deals do not rely on transient platform alert windows.
- [completed] Revert the in-tree Tamagui dialog and restore the native confirmation flow per product direction.
- [completed] Revert the unstable cross-deal card-identity experiment by restoring unique per-deal card ids.
- [completed] Re-measure repeated new-game cycles after the dialog change using the corrected card identity model.
- [completed] Speed up the in-tree dialog animation and reduce tableau reveal jitter by suppressing face-up reveal flight on tableau cards.
- [completed] Document the regression cause, fix, and next actions.

## Plan: Files to modify
- `docs/product/game-history-performance/many-games-slowdown-investigation.md`
- `src/features/klondike/components/KlondikeGameView.tsx`
- `src/features/klondike/components/cards/CardView.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/animations.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/solitaire/klondike.ts`

## Files actually modified
- `docs/product/game-history-performance/many-games-slowdown-investigation.md`
- `src/features/klondike/components/KlondikeGameView.tsx`
- `src/features/klondike/components/cards/CardView.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/animations.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/solitaire/klondike.ts`

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
  - Card components are keyed by `card.id` across tableau, waste, stock, and foundation renderers.
  - Each `CardView` allocates multiple Reanimated shared values and an animated ref.
  - Repeated deals still create substantial animated-view churn, and runtime measurements point to native/view accumulation across deals rather than persisted completed-game history.
- Confirmed regression during investigation: reusing stable `card.id` values across deals is not safe in the current architecture.
  - `useCardAnimations` keeps local `renderFaceUp` state per mounted card view.
  - Flight snapshots and other animation bookkeeping are also keyed by `card.id`.
  - When ids were reused for the same suit/rank in a later game, React and the animation layer could treat that new card as the previous game's card.
  - Observable result: on a new deal, a face-down card could momentarily render face-up, a face-up card could render face-down, and cards could appear to flip or reuse stale motion unexpectedly.
  - Fix applied: restore unique per-deal card ids in `createDeck`. Conclusion: stable ids across deals are not a viable optimization unless card-local animation state is redesigned.
- Refined likely root cause for the user's reported slowdown: the Android native confirmation alert path appears to contribute materially to repeated-game overhead.
  - Repeated manual new-game cycles on device grew native heap sharply when the flow went through the platform alert each time.
  - A control pass that avoided the confirmation dialog path stayed much flatter.
  - Follow-up experiment: replace `Alert.alert` with an in-tree Tamagui `AlertDialog` so the new-game flow stays inside the React tree.
  - Post-fix Android spot check with the in-tree dialog:
    - Before 10 dialog-confirmed new-game cycles: Native Heap about 262.7 MB, `ViewRootImpl: 1`, `Views: 898`.
    - After 10 dialog-confirmed new-game cycles: Native Heap about 286.8 MB, `ViewRootImpl: 1`, `Views: 890`.
  - Conclusion: the in-tree dialog appeared to prevent extra window-root accumulation, but it did not fully eliminate native-memory growth by itself.
  - Current status: reverted by product direction; the app now uses the native confirmation dialog again while the broader slowdown investigation continues.
- Likely cause of the remaining “first turned card” visual bug after dealing a new game: tableau reveal cards were animating both a face flip and a small card-flight position change at the same time.
  - Follow-up fix applied: when a tableau card changes from face-down to face-up, suppress the flight animation for that card so the reveal uses the flip only.
  - This is intentionally scoped to tableau cards; stock-to-waste and other pile-to-pile movements keep their normal flight behavior.
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
- Built and installed a fresh Android release after the dialog change and card-id fix with `ADB_WIFI_TARGET=192.168.1.12:40131 yarn release`.
- Ran a real-device smoke test of the new-game flow after restoring unique per-deal card ids.
  - Verified the in-app confirmation dialog appears.
  - Confirmed a fresh new deal after tapping `Deal Again`.
  - Captured post-confirmation screenshots on-device; the obvious face-up/face-down bleed observed with cross-deal stable ids did not reproduce in this smoke pass.
- Re-ran an Android device loop with the in-tree dialog path after the card-id fix.
  - The app still showed some native-heap growth across 10 confirmed new-game cycles.
  - `ViewRootImpl` remained at `1`, which is materially better than the earlier native-alert-window behavior.
- Reverted the in-tree dialog and restored the native confirmation flow per product direction.
- Caveat: the repeated-game loop was automated with ADB taps, so the exact numbers are directional rather than final-performance benchmarks.
- Caveat: the repeated-cycle memory comparison is now directionally useful, but still needs one more clean pass on a fully settled app session for a final before/after baseline.
- Recommended follow-up testing once fixes are implemented:
  - Start from a fresh app session and play 20 short games on-device.
  - Capture `dumpsys meminfo` before and after to verify native heap stays roughly stable.
  - Compare the native dialog path against a no-dialog control path to see how much of the growth is dialog-specific versus deal/reset-specific.
  - Compare behavior with card-flight and other animations disabled versus enabled.
  - Verify new-game flow still clears saved-game state and undo history correctly.
  - Open History with 200 entries and verify scrolling and sheet opening remain smooth.
