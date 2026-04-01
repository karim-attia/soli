# Flight Snapshot Registry Optimize Flight Snapshot Registry Hot Path

## Description

Deep-dive the current card-flight snapshot registry and replace the current broad object-spread update pattern with a narrower, safer strategy that:
- preserves Reanimated reactivity,
- reduces hot-path copying,
- avoids stale JS-thread data overwriting fresher UI-thread data,
- and keeps draw / undo / auto-play behavior unchanged.

This task is intentionally scoped to the snapshot-registry hot path. It is **not** the full “fix all flight determinism issues” task. In particular, immutable per-dispatch origin freezing remains a separate concern and should not be mixed into the first perf pass unless needed.

## Acceptance Criteria

- Broad object-spread writes into `cardFlights.value` are removed from hot paths.
- Shared-value updates preserve reactivity for object-backed data.
- `ensureReady` no longer blindly merges the whole JS mirror into the UI-thread registry.
- The registry update path avoids writing unchanged snapshots.
- The optimization does not break:
  - draw / recycle flights,
  - undo flights,
  - auto-queue / auto-complete flights,
  - celebration handoff timing,
  - scrubbing resets.
- The implementation documents which registry is authoritative for:
  - latest UI-thread snapshot,
  - JS-thread readiness checks,
  - future per-dispatch frozen origins.

## Design links

- `docs/product/animation-audit/app-wide-animation-audit-and-improvement-plan.md`
- `docs/delivery/14/14-4.md`
- `docs/delivery/14/flight-controller-approach.md`
- Reanimated `useSharedValue`: `https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/`
- Reanimated performance guide: `https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/`

## Possible approaches incl. pros and cons

### 1. Minimal swap: replace spreads with `SharedValue.modify(...)`

Example shape:

```ts
cardFlights.modify((value) => {
  'worklet'
  value[cardId] = snapshot
  return value
})
```

- Pros:
  - Smallest code change.
  - Matches Reanimated’s official guidance for large arrays / complex objects.
  - Likely reduces copy churn immediately.
- Cons:
  - Does not by itself prevent stale writes from `ensureReady`.
  - Does not reduce JS bridge churn from `runOnJS(onCardMeasured)`.
  - Does not solve origin-freezing races.

### 2. Recommended phase-1 approach: dual registry stays, but writes become narrow and directional

Principles:
- `cardFlights` stays the UI-thread registry consumed by worklets.
- `memoryRef.current` stays the JS-thread mirror used for readiness checks.
- Card measurement worklets update `cardFlights` via `modify`.
- JS mirror updates happen only when the snapshot materially changed.
- `ensureReady(cardIds)` only seeds **missing or invalid** UI entries for the requested ids instead of merging the whole mirror.

- Pros:
  - Safe incremental change.
  - Solves the biggest hot-path inefficiency.
  - Avoids the “JS mirror overwrote fresher UI snapshot” class of bug.
  - Keeps JS-thread shared-value reads out of the critical path.
- Cons:
  - Still leaves duplicated state by design.
  - Still does not fully solve “latest snapshot vs frozen origin” semantics.

### 3. Phase-2 stability approach: split “latest snapshot” from “frozen origin snapshot”

Principles:
- Keep `latestSnapshots` mutable and always updated.
- Add a separate `frozenOrigins` registry captured when a dispatch is about to run.
- `CardView` prefers the frozen origin for flight start, then falls back to latest.

- Pros:
  - Fixes semantic races the hot-path optimization alone cannot fix.
  - Makes auto-play and undo behavior more deterministic.
- Cons:
  - Larger behavioral refactor.
  - More moving pieces to reset and test.

### 4. Not recommended now: remove the JS mirror and read shared values from JS

- Pros:
  - One less duplicated store.
- Cons:
  - Reanimated explicitly warns against reading shared values on the JS thread because it can block while synchronizing with the UI thread.
  - `dispatchWithFlight` currently runs on JS, so this would likely trade one problem for another.

## Open questions to the user incl. recommendations (if any)

- Should this task remain strictly performance-focused, or should we also fold in origin freezing now?
  - Recommendation: keep them as two tasks. Land the hot-path cleanup first, then evaluate whether origin freezing still needs a dedicated pass.
- Do we want to add per-snapshot revision numbers immediately?
  - Recommendation: not in phase 1. First make `ensureReady` seed only missing / invalid ids. Add revisions only if testing reveals stale overwrite edge cases remain.

## New dependencies

- None.

## UX/UI Considerations

- This task should not change visible timings or card choreography.
- If successful, the visible effect should be less jank during rapid draw / undo / auto-play bursts.
- There must be no new “snap instead of fly” regressions, even if the code becomes more conservative about writing snapshots.

## Components

### Reuse
- `useCardAnimations`
- `useFlightController`
- existing `CardFlightSnapshot` type

### Create
- Small shared helper(s), likely in `src/animation`:
  - `areSnapshotsEquivalent`
  - `upsertSnapshotIntoSharedRegistry`
  - optionally `seedSnapshotsIntoSharedRegistry`

## How to fetch data, how to cache

- No remote fetches.
- Data model recommendation:
  - `memoryRef.current`: JS-thread readiness cache.
  - `cardFlights`: UI-thread latest snapshot cache.
  - Future: `frozenOriginsRef` / `frozenOrigins` only if we explicitly tackle semantic origin freezing.

## Related tasks

- `docs/delivery/14/14-4.md`
- `docs/delivery/14/flight-controller-approach.md`
- `docs/delivery/26/26-2.md`
- `docs/product/animation-audit/app-wide-animation-audit-and-improvement-plan.md`

## Steps to implement and status of these steps

- [completed] Audit current snapshot write/read paths and document all known call sites.
- [completed] Review Reanimated guidance for complex-object shared values and JS-thread read costs.
- [completed] Extract a snapshot equality helper using the current movement tolerance policy.
- [completed] Replace `cardFlights.value = { ...cardFlights.value, [id]: snapshot }` with `cardFlights.modify(...)` in `useCardAnimations`.
- [completed] Skip `runOnJS(onCardMeasured)` when the snapshot is materially unchanged.
- [completed] Change `ensureReady()` to accept `cardIds` and seed only the requested missing/invalid ids.
- [completed] Add concise developer notes explaining why we keep dual registries for now instead of reading shared values from JS.
- [pending] Validate draw / undo / auto-play stress flows.
- [pending] Decide whether a follow-up task is needed for frozen origin snapshots.

## Plan: Files to modify

- `src/features/klondike/components/cards/animations.ts`
- `src/animation/flightController.ts`
- `src/animation/*` new helper file if extracted
- `docs/product/flight-snapshot-registry/optimize-flight-snapshot-registry-hot-path.md`

## Files actually modified

- `docs/product/flight-snapshot-registry/optimize-flight-snapshot-registry-hot-path.md`
- `src/animation/flightController.ts`
- `src/features/klondike/components/cards/animations.ts`

## Identified issues and status of these issues

### 1. Broad object copying in hot paths
- Current status: addressed in phase 1.
- Evidence:
  - `useCardAnimations` writes `cardFlights.value = { ...cardFlights.value, [cardId]: snapshot }`.
  - `useFlightController.ensureReady()` writes `cardFlights.value = { ...cardFlights.value, ...memory }`.
- Status: mitigated by `modify(...)`-based narrow updates.

### 2. Stale overwrite risk from JS mirror seeding
- Current status: mitigated for phase 1.
- Why:
  - `cardFlights` is updated first on the UI thread.
  - `memoryRef.current` is updated later through `runOnJS`.
  - A later `ensureReady()` merge can theoretically push an older JS snapshot back into the UI registry.
- Status: reduced by seeding only missing / invalid requested ids instead of broad merges.

### 3. Duplicate source of truth
- Current status: accepted temporarily.
- Why:
  - Removing the JS mirror would push `dispatchWithFlight` toward JS-thread reads of shared values, which Reanimated advises against.
- Status: accepted for phase 1, revisit later only if architecture changes.

### 4. Perf-only fix does not solve semantic origin freezing
- Current status: confirmed.
- Why:
  - The current controller still tracks only the latest snapshot, not an immutable dispatch-time origin.
- Status: separate follow-up, not solved here.

### 5. Memoization interaction risk
- Current status: noted.
- Why:
  - If later work adds `React.memo` around board subtrees, any logic that depends on mutable ref contents at render time must be audited carefully.
- Status: watch item.

## Testing

- Static validation completed:
  - `yarn typecheck:fallback`
  - `yarn lint src/animation/flightController.ts src/features/klondike/components/cards/animations.ts`
- Real Android verification completed on physical `A065`:
  - installed latest app build via `yarn release`
  - confirmed the package updated on-device (`lastUpdateTime=2026-04-01 12:02:10`)
  - reproduced a startup crash in the first implementation:
    - `ReferenceError: Property 'CARD_FLIGHT_SNAPSHOT_TOLERANCE' doesn't exist`
  - fixed the worklet crash by removing the exported-constant dependency from the worklet path
  - reinstalled and confirmed the app launches in the foreground with no fresh crash-buffer entries
- Interaction verification status:
  - startup and basic foregrounding are verified on-device
  - automated physical-device taps around Draw / Undo were not yet conclusive because raw ADB input on `A065` frequently collides with the drawer / edge gesture region, so full draw → undo smoke coverage remains pending
- Still recommended:
  - rapid repeated Draw taps
  - draw → undo → draw loops
  - auto-complete (`yarn demo:auto-solve`)
  - undo scrubber start/end on iOS
  - new game / reset flows to confirm registry cleanup

## What we would do

### Recommended phase 1

1. Add `areSnapshotsEquivalent(prev, next)` with the same numeric tolerance already used for “no movement” checks.
2. In `useCardAnimations`, compare before writing:
   - if unchanged, skip shared-value write and skip JS callback.
   - if changed, update `cardFlights` via `modify`.
3. Change `ensureReady(cardIds)` so it seeds only the requested ids that are missing or invalid in the UI registry.
4. Keep `memoryRef.current` as the JS readiness cache.

### Example direction

```ts
const upsertSnapshot = (
  registry: SharedValue<Record<string, CardFlightSnapshot>>,
  cardId: string,
  snapshot: CardFlightSnapshot
) => {
  'worklet'
  const previous = registry.value[cardId]
  if (previous && areSnapshotsEquivalent(previous, snapshot)) {
    return false
  }

  registry.modify((value) => {
    'worklet'
    value[cardId] = snapshot
    return value
  })

  return true
}
```

`ensureReady` should then seed only missing ids, not spread the whole mirror:

```ts
const ensureReady = (cardIds?: string[]) => {
  const ids = cardIds ?? Object.keys(memoryRef.current)
  if (!ids.length) return

  cardFlights.modify((value) => {
    'worklet'
    for (const id of ids) {
      if (!value[id]) {
        const snapshot = memoryRef.current[id]
        if (snapshot) {
          value[id] = snapshot
        }
      }
    }
    return value
  })
}
```

## Potential issues that can arise when we do this

- If we mutate `cardFlights.value[cardId]` directly without `modify`, Reanimated can lose reactivity for object-backed shared values.
- If `ensureReady` continues to merge the whole JS mirror, we can still reintroduce stale data even after replacing spreads with `modify`.
- If we remove the JS mirror and read shared values from JS instead, we risk JS-thread blocking and worse input responsiveness.
- If we combine the perf optimization with origin-freezing changes in one patch, debugging regressions becomes much harder because performance changes and semantic behavior changes get mixed together.
- If we later add memo boundaries, any code that assumes mutable-ref contents will trigger render updates needs to be audited.
- If we seed only missing ids but there is a genuine case where the UI registry contains an invalid stale entry, we need an explicit validity check rather than a simple existence check.

## Recommendation

- Land a **narrow phase-1 optimization**:
  - `modify` for complex-object shared-value writes,
  - equality guard,
  - `ensureReady(cardIds)` that seeds only missing/invalid ids.
- Keep origin freezing as a **follow-up task** unless phase-1 testing still shows semantic misses.

## External references used for this deep-dive

- Reanimated `useSharedValue`: `https://docs.swmansion.com/react-native-reanimated/docs/core/useSharedValue/`
- Reanimated performance guide: `https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/`
- Reanimated `measure`: `https://docs.swmansion.com/react-native-reanimated/docs/advanced/measure/`
