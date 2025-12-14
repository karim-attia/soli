# Task 14-5: react-native-reanimated 4.2 feature flags guide

_Date: 2025-12-14_

## Sources
- Blog (Reanimated 4.2.0): `https://blog.swmansion.com/introducing-reanimated-4-2-0-71eea21ca861`
- Feature flags docs (Reanimated 4.x): `https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags/#force_react_render_for_settled_animations`

## Context (why we care)
Reanimated 4.2 introduces performance-related behavior changes behind feature flags. Our app animates many mounted card views and performs frequent React commits during gameplay (draws, moves, auto-queue/auto-complete). This is a scenario where commit-hook overhead can show up as animation jank.

## Relevant feature flags
### `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` (static)
- **What it does**: periodically synchronizes accumulated animated style updates back to React by triggering a React render for animated components, then evicts them from the C++ registry.
- **Why it can be faster**: reduces the number of `ShadowNode` clone operations in `ReanimatedCommitHook` during React commits.
- **Important behavioral change**: when you *detach* animated styles from animated components, the styles **won’t revert** to the original styles (risk if your UI relies on “removing animated style” to restore defaults).

### `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS` (static)
- **What it does**: applies latest animated styles/props only for **React** commits, skipping non-React commits (e.g. certain native-driven updates).
- **Potential benefit**: can reduce overhead for non-React update paths.

### `ENABLE_SHARED_ELEMENT_TRANSITIONS` (static)
- Enables Shared Element Transitions.
- The 4.2 blog indicates this is still sensitive / not intended for production yet; also enabling it disables some synchronous-prop-update flags.

## Static vs dynamic flags (practical implication)
Per the Reanimated docs, **static** feature flags:
- are configured in `package.json`
- require a native rebuild
- are **not** configurable in Expo Go

## How to enable a static Reanimated feature flag
In `package.json`, add:

```json
{
  "reanimated": {
    "staticFeatureFlags": {
      "FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS": true
    }
  }
}
```

Then rebuild the native apps (for iOS this includes `pod install`; for Expo-managed native, that implies prebuild/run steps rather than Expo Go).

## Fit assessment for this app
- **Likely safe**: our card components keep their animated styles attached (we reset shared values back to “rest” states), so we are not intentionally “detaching animated styles” during normal operation.
- **Likely beneficial**: many simultaneously mounted animated card components + frequent React commits (especially during auto-play) is exactly where commit-hook clone work can become noticeable.

## Recommended evaluation procedure
1. Upgrade `react-native-reanimated` to **>= 4.2.x** (confirm Expo SDK compatibility first).
2. Enable `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` in a dev build.
3. Run stress cases:
   - rapid manual draw/move sequences
   - `yarn demo:auto-solve`
4. Watch for regressions:
   - any “style stuck” behavior when disabling animations or when cards unmount/remount
   - any new warnings/errors from Reanimated
5. If the results are positive, keep the flag enabled and document the constraint: **do not detach animated styles to reset**; reset values instead.
