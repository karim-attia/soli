# PBI-14 Flight Animation Refactor Approaches

_Date: 2025-11-02 • Author: Codex_

## Problem Recap
- Flight animations sometimes skip because the reducer dispatch fires before React layout snapshots update shared values.
- Snapshot state is duplicated between per-card refs and transient shared values, creating race conditions across tableau, waste, stock, and foundation zones.
- Auto-complete and celebration pipelines enqueue moves without confirming origin/target coordinates are ready, so late moves snap instead of animating.
- Foundation feedback (wiggle suppression) is interwoven with flight prep logic, making it hard to guarantee deterministic behaviour.

## Approach A – Strengthen Component-Centric Snapshot Gating
### Flow
- Keep flight prep inline with `dispatchWithFlightPrep`.
- Harden the gating logic (e.g. longer timeouts, per-card retry loops) and expand memory hydration before dispatch.
- Ensure every component pushes its latest snapshot into shared state during layout effects.
### Pros
- Lowest code churn; mostly modifies existing hooks.
- Minimal risk to animation code because no new abstractions.
### Cons
- Retains tight coupling between UI lifecycle and reducer dispatch, so new race conditions can reappear.
- Hard to reason about global ordering when multiple moves occur (auto-queue, undo, celebrations).
- Still duplicates snapshot sources (`cardFlightMemoryRef` vs `cardFlights.value`), so stale data remains possible.
### Risks / Complexities
- Timeout-driven retries can introduce frame jank on slower devices.
- Difficult to extend towards richer tooling (e.g. logging overlays) because information stays local to components.

## Approach B – Rely on Reanimated Shared Transitions
### Flow
- Replace manual flight computations with `react-native-reanimated` shared transitions / layout animations keyed by card IDs.
- Let Reanimated capture start/end layouts automatically as cards move between lists.
- Use per-zone transition configs to preserve durations and easing.
### Pros
- Offloads snapshot management to the animation library.
- Declarative transitions simplify manual measurement code.
### Cons
- Shared transitions cannot easily differentiate between tableau, foundation, and stock render trees when keys change, so cards may appear in both places while transitioning.
- We need fine-grained control over origin/target decks (e.g. stacked offsets, celebration overlay), which shared transitions do not expose.
- Auto-complete sequences that reorder arrays mid-transition can confuse Reanimated diffing, causing flashes or dropped frames.
### Risks / Complexities
- Requires migrating large portions of the render tree to Reanimated layout primitives.
- Debugging failed transitions is harder because the library hides intermediate snapshots.

## Approach C – Dedicated Flight Controller Service _(Chosen)_
### Flow
- Introduce `src/animation/flightController.ts`, exporting a stateful controller with:
  - `registerSnapshot(cardId, zone, layout)` for components to report measurements.
  - `scheduleMove(move, originSelection, afterDispatch)` that waits for required snapshots, then calls the provided dispatch once coordinates are locked.
  - `commitFlight(cardId, targetSnapshot, options)` invoked from reducer effects to animate using a central shared value map.
  - Dev instrumentation hooks (`onFlightEvent`) to log/surface suppressed flights.
- Wrap `TabOneScreen` in a `FlightControllerProvider` to expose the controller to UI sections (top row, tableau, celebrations).
- Refactor dispatcher helpers (manual moves, auto-queue, undo, celebrations) to call `flightController.scheduleMove` instead of inlining wait loops.
- Maintain a single snapshot source of truth inside the controller; components simply subscribe to shared values when rendering.
### Pros
- Separates measurement, scheduling, and animation playback so all move types funnel through one deterministic queue.
- Guarantees dispatch ordering because controller owns the async wait and replays move callbacks sequentially.
- Supports instrumentation and tooling (approach C aligns with PBI 14-4) by emitting structured events.
- Provides clear extension points for celebration overlays and future features (e.g. analytics, metrics).
### Cons
- Requires refactoring multiple touchpoints (`TabOneScreen`, card components, celebration logic) to rely on the controller APIs.
- Introduces another provider/service layer that must be initialised and cleaned up carefully.
### Risks / Complexities
- Must ensure controller de-registers measurements for unmounted cards to avoid memory leaks.
- Needs careful threading between UI and worklets (`runOnJS`/`runOnUI`) so animations still execute on the UI thread.
- Requires migration plan for undo/redo snapshots to maintain historical positions.

## Decision
Adopt **Approach C**. It offers the best path to deterministic, reusable flight orchestration while enabling the observability and automation requirements in PBI 14. The controller abstraction centralises snapshot handling and move queuing, eliminating the current race conditions that stem from ad-hoc layout hooks. Although the refactor touches several components, the resulting architecture creates a sustainable foundation for both manual gameplay and auto-complete flows.

## Implementation Checkpoints
- Create `FlightController` module with queues, snapshot registry, and event emitter.
- Inject controller via context/provider and remove direct `cardFlightMemoryRef` usage.
- Update manual move, auto-queue, undo, celebration pipelines to call `controller.scheduleMove`.
- Adjust `CardView` and related components to fetch per-card animated values from controller-managed shared values.
- Add basic logging hook to surface waits/timeouts for missing snapshots (feeds into Task 14-4 instrumentation).
- Verify all move sources (tableau↔tableau, tableau→foundation, waste→tableau, waste→foundation, auto-complete loops) animate using the controller path.

## Regressions Identified (2025-11-02)
- **Undo sequences snap**: cards returning from foundation to tableau via `UNDO` skip the reverse flight.
- **Auto-complete cascades skip flights**: long `ADVANCE_AUTO_QUEUE` runs intermittently snap tableau→foundation moves after the first few steps.
- **End-game auto-complete shows no motion**: once the board is in the “auto finish” loop, every move completes instantly with no visible flight.

Controller events confirm the queue runs without timing out; the issue happens when the view layer resolves a zero-distance delta and therefore leaves the card in place.

### Known Animation Gaps
- Moves dispatched without an explicit selection (`UNDO`, `DRAW_OR_RECYCLE`) never register card ids with the controller, so no origin position is frozen for the ensuing state change.
- Cards that were hidden (e.g., still in stock) have no prior snapshot when they surface, so `CardView` defaults to a snap.
- During rapid auto-complete, multiple layout passes can overwrite the snapshot in controller memory before the waiting dispatch executes, flattening the computed delta.
- When the foundation overlay hides top cards, we skip registering their measurement; subsequent auto moves from that pile lack the origin needed for flights.
- Foundation top cards occasionally report undefined layout metrics (see repeated Reanimated warnings) which causes `measure(cardRef)` to bail before we publish the new position—leaving the controller with stale coordinates for the very next move.

### Root-Cause Summary
1. The controller currently stores *only the latest layout snapshot*. We do not freeze a dispatch-time origin snapshot, so any measurement that lands between queueing and reducer execution erases the origin.
2. Undo and history rewinds do not report the affected card ids, preventing the controller from waiting for or preserving their origin snapshots.
3. CardView treats a missing snapshot as “no previous position”, silently snapping without telemetry, making these misses hard to audit.
4. When the worklet fails to resolve layout metrics (hidden view, mount timing), we simply skip the animation and leave the shared snapshot untouched—subsequent moves see identical origin/target coordinates and the flight collapses to a snap.

### Mitigation Plan
1. **Per-dispatch origin freezing**: extend the controller to capture immutable origin snapshots for every card id once a queued action starts. CardView should prefer these origins over the mutable map.
2. **Undo card inference**: compute the diff between `stateRef.current` and the pending history frame to supply affected card ids when running `UNDO`, ensuring their origins are frozen pre-mutation.
3. **Flight miss instrumentation**: log a `flight-missed` event whenever CardView cannot find an origin or resolves a zero delta so failures surface immediately.
4. **Foundation visibility audit**: when celebration/overlay toggles hide foundation cards, refresh their snapshots once visible again so downstream auto-complete steps have valid origins.

### Field Notes – 2025-11-03
- **Auto-complete (end game)**: even with origin freezing in place the flights still skip. Warnings show `LayoutMetrics` undefined for the moving cards; the worklet exits early and no animation is scheduled.
- **Undo of foundation move**: the first undo animates, but redoing the move afterwards sometimes snaps. Likely cause: the undo diff only lists the tableau stack, so once the card sits back in tableau its layout re-registers before the dispatch queue starts, wiping the frozen origin.
- **Instrumentation gap**: the controller’s `flight-miss` events are emitted but never logged in `handleFlightEvent`, so identifying these misses relies on user observation rather than structured telemetry.
- **Next diagnostic steps**:
  - Add explicit logging for `flight-miss`, `origin-frozen`, and `origin-cleared` events with card ids and queue labels.
  - Capture `measure()` failures (layout null) and retry them on the next animation frame instead of bailing outright.
  - Extend the undo diff helper to include destination piles (foundation/waste) so the controller freezes both directions of the move.
  - During auto-complete, block the queue until every pending card id has a non-null controller origin *and* the previous animation completed (prevents rapid overwrites).

### 2025-11-03 Auto-Complete Observations
- Device run on Android showed **every** auto-complete move logging `flight-miss` with `missing-origin`, followed by the same cards logging `zero-delta`. This confirms that no origin snapshot existed at the moment the dispatch executed; once layouts updated we froze the next origin, which is why the miss repeats for the same id.
- Controller event stream proves the queue keeps advancing even while origins are missing—`origin-frozen` events appear only after the miss, so we’re always one move behind.
- Additional Reanimated warning (`Tried to modify key \`current\``) suggests we still hold references to view refs inside worklets, so we need to avoid mutating any object already shared with the UI thread when retrying measurements.

### Work Plan (Current Status)
1. **Log Instrumentation – DONE**  
   - Added dev-time logging for controller events (`dispatch-timeout`, `flight-miss`, `origin-frozen`, `origin-cleared`) so we can correlate misses with specific card ids and move batches.
   - `CardView` now emits `unmeasured` flight misses when `measure()` returns null.
2. **Queue Stall Until Origins Ready – TODO**  
   - Change `createFlightController` so each dispatch waits until *all* `cardIds` have non-null snapshots (or until a hard timeout fires). Should still coalesce retries on `registerSnapshot` callbacks to keep auto-complete fast.
3. **Measurement Retry Loop – TODO**  
   - When the layout is undefined, reschedule the measurement on the next animation frame rather than immediately logging a miss. Bail out only after a small number of retries to avoid infinite loops.
4. **Undo Diff Expansion – TODO**  
   - Include foundation/waste card ids in `collectChangedCardIds` so undo and redo freeze the correct origins.
5. **Foundation Visibility Refresh – TODO**  
   - When foundations become visible after celebrations/overlays, force a snapshot refresh so subsequent auto moves have valid origins.
6. **Validation – PENDING**  
   - After the above, re-run manual scenarios: mid-game manual moves, undo/redo loops, and full auto-complete. Ensure flights remain smooth and auto-complete throughput is still fast (queue stall logic should only delay moves until the first origin snapshot arrives, typically a single frame).
7. **Telemetry Cleanup – PENDING**  
   - Once misses drop to zero in happy-path runs, down-level logging (or gate behind a verbose flag) to avoid noisy consoles.

### 2025-11-04 Comprehensive Findings
- After seeding controller memory with cached snapshots, most manual moves animate; however, **auto-complete still produces bursts of `missing-origin` → `zero-delta` pairs**. The pattern: the controller seeds, immediately freezes, but the card’s first layout still returns `undefined` (`Reanimated` logs). We then retry measurement, but the queue already executed, so subsequent moves re-freeze the card and the cycle repeats.
- Cards affected span entire suits (e.g., `diamonds-1-66`, `clubs-6-58`, `hearts-13-91`). These are **tableau cards moving to foundation** during the sweep. Their snapshots exist in the cache, yet `memory[cardId]` remains undefined at dispatch time, implying the seed injection happened after the readiness check.
- Reanimated warnings persist: “The view has some undefined, not-yet-computed or meaningless value of `LayoutMetrics` type.” They occur exactly alongside the misses, confirming the view hierarchy isn’t ready when the move fires.
- Manual undo test: the first undo now animates, but the redo still produces `missing-origin` if we redo immediately. This indicates the undo diff still needs to include the foundation card id.

### Updated Diagnosis
1. The queue still checks readiness (`memory[cardId] !== undefined`) before we hydrate memory with seeds. Even though we seed right after queuing, `attemptStart` runs synchronously and does the check before seeds are written.
2. Measurement retries help but only after the fact. We need to **delay execution until either a real layout or a seed** is present and confirm the seed writes before the readiness check.
3. Undo diff still ignores foundation/waste destinations; redo therefore misses the origin snapshot.

### Next Steps (Rev 2)
- Move the seed write ahead of the readiness check so the first `attemptStart` sees seeded snapshots and doesn’t fire a miss.
- When we seed without an actual layout, mark those entries so CardView treats the origin as frozen even if the layout says zero delta—the target will match the seed and we can still animate using the delta.
- Extend the measurement retry to detect when the current layout equals the seed position and skip zero-delta reporting in that case.
- Revisit `collectChangedCardIds` to add foundation/waste diffs so undo/redo origins survive.
- Re-run auto-complete and undo tests; expect no `missing-origin` logs and only occasional `zero-delta` during genuine snap scenarios (e.g., card returning to the same slot).
