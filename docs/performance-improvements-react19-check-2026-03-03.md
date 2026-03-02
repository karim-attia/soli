# Performance Improvements Review (React 19.x Reality Check)

Date: 2026-03-03  
Project: `soli` (Expo SDK 55 / React 19.2 / React Native 0.83)

## Quick answer

Yes, most of the optimization ideas are still needed for this app.

React 19 helps with scheduling and (optionally) memoization, but it does **not** automatically fix:
- expensive app-specific state churn,
- frequent persistence writes,
- too many mounted animated nodes,
- or heavy per-frame animation math.

In plain English: React is a good traffic controller, but it does not replace fixing roads that are already overloaded.

## What React already covers vs what we still own

| Area | What React/RN covers under the hood | What we still need to do manually |
| --- | --- | --- |
| Update batching | React batches updates automatically (since React 18) | Avoid creating too many updates in the first place |
| Scheduling priority | `startTransition` keeps urgent interactions responsive | Split state so urgent UI is not tied to large rerenders |
| Memoization | React Compiler can auto-memoize, **if enabled** | In this app, compiler is not enabled, so memo boundaries still matter |
| Animation execution | Reanimated can run worklets on UI thread | Keep animated graph small and avoid unnecessary JS-thread pressure |
| Frame budget | RN explains JS/UI frame constraints, but cannot auto-tune app logic | Reduce heavy renders, logging, and storage churn during gameplay |

## Findings table (need, complexity, simple explanation)

Complexity scale:
- `Low` = small/local change
- `Medium` = moderate refactor or cross-file changes
- `High` = architecture-level change or risky behavior change

| # | Optimization item | Really needed now? | React 19 / platform coverage | Complexity | Simple explanation |
| --- | --- | --- | --- | --- | --- |
| 1 | Debounce/throttle `saveGameStateWithHistory` (currently persists on many state changes, including timer flow) | **Yes (High)** | React does not manage AsyncStorage frequency | `Medium` | We are saving too often; this steals time from smooth animation. |
| 2 | Isolate timer state from whole-board render path | **Yes (High)** | React batching helps, but does not prevent large rerenders from broad state shape | `High` | A small clock tick should not make the whole board recalculate. |
| 3 | Narrow `dropHints` recomputation dependencies (avoid full `state` dependency) | **Yes (High)** | React won’t infer business-level dependency precision | `Medium` | We currently recompute hints when unrelated state changes. |
| 4 | Reduce hidden mounted `CardView` nodes in stock/foundation stacks | **Yes (High)** | Reanimated can animate many nodes, but has practical limits | `High` | Invisible cards still consume animation/render overhead. |
| 5 | Optimize card-flight snapshot map updates (avoid broad object spreads in hot paths) | **Yes (Medium-High)** | React/Reanimated do not auto-optimize custom data structures | `Medium` | We copy large maps repeatedly during fast animation events. |
| 6 | Replace/limit `requestAnimationFrame` polling loops for readiness/measure retries | **Yes (Medium)** | No automatic fix from React for custom polling loops | `Medium` | Busy loops can add per-frame overhead during animation bursts. |
| 7 | Reduce celebration animation workload (duration/card count/math intensity) | **Yes (Medium)** | Reanimated runs on UI thread but still bounded by frame budget | `Medium` | Fancy win animation can overload weaker devices. |
| 8 | Tighten history list rendering (`renderItem`, styles, optional `getItemLayout`) | **Maybe (Low-Medium)** | RN helps, but FlatList tuning is app-specific | `Low` | Mostly a polish item unless history list is large/laggy. |
| 9 | Add screen freezing/detach strategy for inactive routes | **Maybe (Medium)** | Navigation libs can help, but must be configured and validated | `Low-Medium` | Don’t let hidden screens keep doing work during transitions. |
| 10 | Evaluate Reanimated feature flags + React Compiler enablement path for this app | **Yes (Medium)** | Compiler/flags can reduce rerenders/commit overhead, but are opt-in and require validation | `Medium` | There is free-ish performance available, but only after safe rollout checks. |
| 11 | Dev-only solver-lab timer queue cleanup | **Maybe (Low)** | Not a React concern; dev tool behavior | `Low` | Keeps dev mode cleaner; low production impact. |

## Notes specifically about React 19.x

1. React 19 itself is mainly new APIs (Actions, `use`, etc.); it is not a universal performance auto-fix.
2. `startTransition` and related APIs help responsiveness, but you still pay for expensive renders eventually.
3. React Compiler is the major auto-memoization step, but it is a build-time feature and must be enabled/configured.
4. Even with compiler enabled, app-level architecture (state granularity, storage cadence, animation graph size) still dominates animation smoothness in RN apps.

## Practical recommendation

Implement now (highest ROI):
1. Persistence throttling + skip timer-only writes.
2. Timer/state split + `dropHints` dependency narrowing.
3. Hidden-card mount reduction.

Evaluate next:
1. Reanimated static feature flags in a controlled branch.
2. React Compiler rollout plan (healthcheck + incremental scope).

## Sources

- React Native Performance Overview (frame budget, JS vs UI thread, manual tuning caveats): <https://reactnative.dev/docs/performance.html>
- React 18 automatic batching context: <https://react.dev/blog/2022/03/08/react-18-upgrade-guide>
- React `memo` guidance (when it helps, when it does not): <https://react.dev/reference/react/memo>
- React `useMemo` guidance: <https://react.dev/reference/react/useMemo>
- React `useCallback` guidance: <https://react.dev/reference/react/useCallback>
- React `startTransition` behavior: <https://react.dev/reference/react/startTransition>
- React Compiler v1.0 announcement (auto memoization, adoption notes): <https://react.dev/blog/2025/10/07/react-compiler-1>
- Expo React Compiler guide (explicit enablement path, incremental adoption): <https://docs.expo.dev/guides/react-compiler/>
- Expo SDK 55 versions matrix (React 19.2 / RN 0.83): <https://docs.expo.dev/versions/v55.0.0/>
- Reanimated performance guide (new architecture regressions, limits, non-layout animation preference): <https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/>
