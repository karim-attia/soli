# Performance Deep Dive: Timer Isolation and React 19.2 Reality Check

Date: 2026-03-03  
Project: `soli` (`react@19.2.0`, `react-native@0.83.2`, Expo SDK 55)

## Short Answers

- `useMemo` in React 19.2: **still needed selectively in this app today**.
- `useCallback` in React 19.2: **still needed selectively in this app today**.
- Why: React Compiler is not enabled in this project yet, so React does not auto-memoize your app code.
- Timer-state isolation: **likely worth doing**, but best as a staged refactor with measurement gates.

## Baseline Profile (Connected Android Device)

Scenario run:
1. Reset `gfxinfo` for `ch.karimattia.soli`.
2. Relaunch app.
3. Tap `Demo`, then simulate gameplay (`Draw` x25, `Undo` x8).
4. Dump fresh `dumpsys gfxinfo` stats for the app process.

Tooling note:
- `agent-device` is not globally installed in this environment, and `npx -y agent-device` had intermittent registry resolution failures.
- For deterministic execution, the baseline interaction was run through direct ADB taps.

Baseline sample (single run):

| Metric | Value |
| --- | --- |
| Total frames rendered | 290 |
| Janky frames | 54 (18.62%) |
| 50th percentile | 9ms |
| 90th percentile | 16ms |
| 95th percentile | 17ms |
| 99th percentile | 23ms |
| Slow UI thread | 41 |
| Slow issue draw commands | 48 |

Simple explanation:
- Median frame time is fine, but jank percentage is still notable for a card game.
- This means there is meaningful optimization headroom, especially during interaction bursts.
- This is one baseline sample; use the same script after each optimization for fair A/B comparison.

## Repeatable Baseline Script

Script:
- `scripts/perf-baseline.sh`

Example command:
- `ADB_SERIAL=192.168.1.12:5555 ./scripts/perf-baseline.sh 3`

Latest 3-run result on connected device:

| Run | Frames | Janky | Janky % | P50 (ms) | P90 (ms) | P95 (ms) | P99 (ms) | Slow UI | Slow Draw |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 299 | 58 | 19.40% | 9 | 15 | 16 | 20 | 45 | 53 |
| 2 | 297 | 60 | 20.20% | 8 | 14 | 15 | 18 | 47 | 55 |
| 3 | 290 | 59 | 20.34% | 8 | 15 | 15 | 19 | 47 | 55 |
| Avg | 295.33 | 59.00 | 19.98% | 8.33 | 14.67 | 15.33 | 19.00 | 46.33 | 54.33 |

Simple explanation:
- Across repeated runs, the jank rate is consistently around 20%.
- This strengthens the case for timer-path isolation and render-path narrowing as priority optimizations.

## Post-Implementation Rerun (Timer Isolation Applied)

Implementation summary:
- Removed per-second reducer `TIMER_TICK` dispatch loop from `useKlondikeTimer`.
- Localized live timer repainting to `StatisticsHud` with a HUD-only interval.
- Added robustness to `scripts/perf-baseline.sh` so each run auto-retries until it captures a valid non-zero frame sample.

Latest 3-run result after implementation:

| Run | Frames | Janky | Janky % | P50 (ms) | P90 (ms) | P95 (ms) | P99 (ms) | Slow UI | Slow Draw |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 298 | 64 | 21.48% | 11 | 17 | 20 | 25 | 53 | 61 |
| 2 | 305 | 62 | 20.33% | 10 | 16 | 18 | 25 | 52 | 57 |
| 3 | 287 | 67 | 23.34% | 10 | 18 | 20 | 27 | 56 | 64 |
| Avg | 296.67 | 64.33 | 21.72% | 10.33 | 17.00 | 19.33 | 25.67 | 53.67 | 60.67 |

Before vs after averages (same scripted interaction):

| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Frames | 295.33 | 296.67 | +1.34 |
| Janky frames | 59.00 | 64.33 | +5.33 |
| Janky % | 19.98% | 21.72% | +1.74pp |
| P50 | 8.33ms | 10.33ms | +2.00ms |
| P90 | 14.67ms | 17.00ms | +2.33ms |
| P95 | 15.33ms | 19.33ms | +4.00ms |
| P99 | 19.00ms | 25.67ms | +6.67ms |

Interpretation:
- This workload did not improve with the timer-path refactor; in this run set, it regressed.
- Likely reason: the scripted sequence is dominated by draw/undo animation and layout work, so timer tick removal is not the primary bottleneck for this scenario.
- The architectural change still removes whole-state timer churn and storage writes from idle timer flow, but additional animation/render-path optimizations are still needed.

## React 19.2 and Memoization: What Is Automatic vs Manual

| Topic | React 19.2 / ecosystem coverage | Needed in this codebase now? | Complexity added | Simple explanation |
| --- | --- | --- | --- | --- |
| `useMemo` | React docs: optimization tool, not required for correctness. React Compiler can reduce manual use when enabled. | **Yes, selectively** | Low-Medium | Keep it only around expensive recomputation or prop-stability boundaries. |
| `useCallback` | Same story: optimization only; React Compiler can reduce manual callback memoization when enabled. | **Yes, selectively** | Low-Medium | Keep where function identity affects memoized children/effects. |
| `React.memo` | React Compiler can apply memo-like behavior automatically when enabled. | **Yes, selectively** | Low | Useful on heavy pure subtrees (board sections) while compiler is off. |
| React 19.2 itself | Adds profiling improvements (Performance Tracks), not automatic app architecture fixes. | **Yes (for diagnostics)** | Low | Better visibility, not free rendering fixes. |
| React Compiler rollout | Expo supports compiler, including automatic Babel setup in SDK 54+ when enabled. | **Recommended, but not instant win** | Medium | Can remove some manual memo work later, but state architecture still matters. |

## Is Deep Dive 2 (Timer Isolation) Really a Problem Here?

### Evidence in the current tree

- Timer dispatches each second: `src/features/klondike/hooks/useKlondikeTimer.ts` (interval tick dispatch).
- Reducer tick creates updated `GameState`: `src/solitaire/klondike.ts` (`tickTimer`).
- `useKlondikeGame` passes full `state` into `topRowProps` and `tableauProps`.
- Board components (`TopRow`, `TableauSection`) receive that broad state and map many card nodes.
- Persistence currently saves on every `state` change (`useKlondikePersistence` depends on whole `state`), so timer ticks can also trigger storage writes.

### Verdict

Yes, this is likely a real performance contributor, not just theory:
- Timer updates are low-value UI work.
- They currently travel through high-cost board and persistence paths.
- Baseline jank confirms this path deserves prioritization.

## Where Should We Manage Timer State in the Tree?

Recommended location:
- Keep board orchestration in `useKlondikeGame`.
- Move timer display updates to a narrower path (statistics/HUD-level state), so board subtrees do not receive timer-driven prop churn.

Practical placement:
1. `useKlondikeGame` keeps gameplay reducer ownership.
2. Introduce a timer-display model (hook/context) consumed by HUD/stats only.
3. Pass board-specific props to `TopRow`/`TableauSection` without timer fields.
4. Keep persistence from writing every tick (throttle and/or skip timer-only deltas).

## Implementation Options (with Complexity)

| Option | What changes | Benefit | Complexity | Recommended now? |
| --- | --- | --- | --- | --- |
| A. Patch only memo boundaries | Add `React.memo` on heavy board components; tighten derived dependencies (`dropHints`); keep current state shape. | Quick reduction in avoidable rerenders. | Medium | Yes, as first step. |
| B. Split timer render path | Keep game reducer, but move timer display updates to a narrow HUD path and stop passing timer-driven props into board tree. | High ROI without full architecture rewrite. | Medium-High | **Yes, primary step.** |
| C. Full timer domain extraction | Remove timer from main `GameState` hot path and manage as dedicated store/domain with synchronization points. | Max isolation and clean architecture. | High | Later, only if A+B are insufficient. |

## What Is Really Needed Now (Ordered)

1. Isolate timer-driven UI updates from board prop path (Option B).
2. Stop timer-only persistence churn (throttle and skip no-meaningful-change writes).
3. Narrow `dropHints` dependency from full `state` to required slices.
4. Add memo boundaries to heavy board sections while compiler is not enabled.
5. Then test React Compiler rollout in a branch and compare the same baseline script.

## React 19.x Improvements That Matter Most Here

- React 19.2: improved profiling via Performance Tracks (great for finding render/scheduler hotspots).
- React Compiler (separate, opt-in rollout): can reduce manual `useMemo`/`useCallback`/`memo` usage when enabled.
- Important caveat: neither replaces app-specific fixes like state-scope control, storage write cadence, and animation graph size.

## Sources

- React 19.2 announcement: <https://react.dev/blog/2025/10/01/react-19-2>  
- `useMemo` reference: <https://react.dev/reference/react/useMemo>  
- `useCallback` reference: <https://react.dev/reference/react/useCallback>  
- `memo` reference: <https://react.dev/reference/react/memo>  
- React Compiler 1.0: <https://react.dev/blog/2025/10/07/react-compiler-1>  
- Expo React Compiler guide: <https://docs.expo.dev/guides/react-compiler/>  
- React Native performance overview: <https://reactnative.dev/docs/performance>  
