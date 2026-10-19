# React Native Reanimated Guide

Last refreshed: 2026-10-17 (Reanimated 4.7.1 / Worklets 0.13.0, Expo SDK 58)

## Scope

- Package/tool: `react-native-reanimated` / `react-native-worklets`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this for Reanimated and Worklets compatibility, feature flags, and animation-risk
notes. Keep Reanimated and Worklets aligned with Expo bundled versions (since SDK 58 there
is no override: `expo.install.exclude` lists only `typescript`). Re-add a narrowly tested
patch override only for a captured upstream defect, and retire it at the next SDK.

## Detailed guidance

The sections below are the definitive combined notes for this package or tool. Keep version-specific context when it affects compatibility, but update this single file instead of adding task- or feature-prefixed guides.

### React Compiler interplay (ON since 2026-10-18)

- `app.json` `expo.experiments.reactCompiler: true` is live (measured A/B in
  `docs/product/next-steps-after-sdk-58/next-steps-after-sdk-58.md`, "S11 results": janky
  9.12 % → 8.14 %, frame percentiles identical, PSS within noise, scrubber + celebration
  identical on both platforms). Rollback is the one line in `app.json` (then delete
  `android/app/build/generated/assets/react/release` before `yarn release`).
- What the compiler does with Reanimated (verified against `babel-plugin-react-compiler
  1.0.0`'s Reanimated type model): `useSharedValue`/`useDerivedValue` results are mutable
  objects; `useAnimatedStyle`/`useAnimatedReaction`/`useFrameCallback`/… freeze their
  arguments. A `sv.value = x` write after such a capture is an Immutability error and the
  whole hook/component is silently left uncompiled (`panicThreshold none`). Therefore:
  **write shared values with `.set(x)` on the JS thread** (`.set()` is `.value =` underneath,
  plus an updater-function branch guarded by `__isAnimationDefinition`, so
  `.set(withTiming(...))` is fine); reads inside worklets stay `.value` (hot path, no
  wrapper). Latest-value refs written during render (`ref.current = fn`) are a Refs error —
  `useUndoScrubber`, `useCelebrationController` and `AbsoluteLayerCard` are skipped on purpose
  for that reason (behaviour unchanged, documented in the plan). Worklets are untouched: the
  Worklets Babel plugin runs after the compiler. `scheduleOnRN`/`scheduleOnUI` come from
  `react-native-worklets` (Reanimated 4.7 re-exports only the deprecated `runOnJS`/`runOnUI`).

### Expo SDK 58 Reanimated 4.7 / Worklets 0.13 Notes

- Package: `react-native-reanimated` and `react-native-worklets`
- Retrieved: 2026-10-17
- Primary docs:
  - https://expo.dev/changelog/sdk-58
  - https://docs.expo.dev/versions/latest/sdk/reanimated/
  - https://github.com/software-mansion/react-native-reanimated/releases (4.6.0, 4.7.0, 4.7.1)
  - https://github.com/software-mansion/react-native-reanimated/releases/tag/worklets-0.13.0
  - https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
  - https://docs.swmansion.com/react-native-worklets/docs/guides/testing/

#### Target facts

- Expo SDK 58 bundles exact Reanimated `4.7.1` (2026-10-02) and exact Worklets `0.13.0`.
  Reanimated 4.7.x requires Worklets 0.13.x; Worklets 0.13.0 peers RN `0.86 - 0.88`.
- `babel-preset-expo` still wires the Worklets Babel plugin automatically.
- Soli is back on the Expo-managed pair. The `react-native-worklets` entry in
  `expo.install.exclude` and the exact `0.10.1` pin were removed on 2026-10-17 (see the
  retired-override note below).

#### Changes that matter for Soli

- Reanimated 4.7: a new layout-animation engine is the default (Soli uses no
  `entering`/`exiting`/`layout` props). `measure()` on an unmounted animated ref now
  returns `null` and logs a warning instead of throwing; Soli measures the undo-scrubber
  track with `measureInWindow` (RN API), not Reanimated `measure`, so only watch logs.
  `AnimatedRefOnUI` became a Shareable. 4.7.1 fixes a crash with `react-native-screens`
  older than 4.27 (SDK 58 bundles 4.30).
- Worklets 0.13: removed `FETCH_PREVIEW_ENABLED` and the Serializable handle;
  `makeShareable` is eager.
- Jest setup changed with 4.7 (2026-10-17): importing Reanimated under Jest threw
  `setCSSEventHandler is not available in JSReanimated` because `IS_JEST` selects the JS
  module and `initializers.native.ts` now registers the CSS event handler. The documented
  fix is the official resolver, `"resolver": "react-native-reanimated/jest/resolver"` in the
  Jest config, which resolves the web/JS implementations of Reanimated and Worklets (it
  chains to `react-native-worklets/jest/resolver`). That slot used to hold
  `jest-pnp-resolver`, which was removed (Soli uses `nodeLinker: node-modules`). With the
  resolver in place the former `test/setup/mock-worklets.ts`
  (`jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'))`) was
  redundant (45 suites green with and without it) and was deleted. Trade-off: tests now run
  the Worklets web implementation instead of the mock; if a test ever needs the mock's
  behavior, re-add that one-line setup file.
- Hermes V1 memory regression: fixed since `expo@57.0.9`; SDK 58 carries the fix. Do not
  enable Worklets bundle mode and do not toggle Hermes V1 (upstream Expo skill guidance).

#### Retired override: Worklets `0.10.1` over Expo SDK 57's `0.10.0` (2026-07 to 2026-10)

The "Worklets 0.10.0 iOS remote-callback crash" section below is historical. Soli pinned
`0.10.1` and excluded the package from Expo's checks because `0.10.1` fixed an
`EXC_CRASH`/`SIGABRT` in `JSIWorkletsModuleProxy.cpp` seen after a 20-game iOS playlist.
Expo SDK 58 bundles `0.13.0`, which is ahead of that fix, so the exclusion is gone and
Expo tooling validates Worklets again. Rule going forward: pin Reanimated/Worklets only via
`npx expo install --fix`; if a new upstream defect appears, prefer waiting for the Expo
patch over re-adding an exclusion.

A clean native rebuild (delete `ios/` and `android/`, plus the package-level
`android/{.cxx,build}` caches listed below) is still mandatory after any Worklets change.

### Expo SDK 57 Reanimated / Worklets Notes

- Package: `react-native-reanimated` and `react-native-worklets`
- Retrieved: 2026-07-04
- Primary docs:
  - https://expo.dev/changelog/sdk-57
  - https://docs.expo.dev/versions/latest/sdk/reanimated/
  - https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/

## Target facts

- Soli enters the SDK 57 upgrade on Reanimated `4.3.1` and Worklets `0.8.3`.
- Expo SDK 57 bundles Reanimated `4.5` and Worklets `0.10`.
- Expo's latest Reanimated reference recommends `react-native-reanimated` `4.5.0` and
  installing it together with `react-native-worklets` through Expo tooling.
- `babel-preset-expo` automatically configures the Reanimated/Worklets Babel plugin when
  the libraries are installed.

## SDK 57 risk notes for Soli

- Soli should continue to let Expo align Reanimated and Worklets. Do not manually chase
  npm latest if it diverges from Expo's bundled versions.
- Android Hermes V1 plus Reanimated has a known memory regression that can increase
  memory usage even when Reanimated is only imported. Expo says this also affects SDK 56.
- Worklets bundle mode is the documented workaround, but enabling it is a native runtime
  behavior change. For this upgrade, monitor logs and smoke-test repeated gameplay first;
  enable bundle mode only if evidence justifies a follow-up.
- Because Soli is animation-heavy, native validation should include stock draw, drag/tap
  moves, undo, auto-up, settings/history sheets, and a quick repeated-game sanity pass.

### Worklets 0.10.0 iOS remote-callback crash (historical: SDK 57 override, retired 2026-10-17)

- Retrieved: 2026-07-04
- Current Soli pair: Reanimated `4.5.0` and Worklets `0.10.1`; Worklets is an
  intentional patch override from Expo SDK 57's bundled exact `0.10.0`.
- Sources:
  - https://docs.expo.dev/versions/latest/config/package-json/#installexclude
  - https://github.com/software-mansion/react-native-reanimated/issues/9797
  - https://github.com/software-mansion/react-native-reanimated/releases/tag/worklets-0.10.1
  - https://www.npmjs.com/package/react-native-worklets?activeTab=versions
  - https://developer.apple.com/documentation/xcode/analyzing-a-crash-report

Soli captured a symbolicated iOS simulator crash after a 20-game demo playlist. It was
an `EXC_CRASH` / `SIGABRT` on the React JavaScript thread, not a memory-pressure
termination. Worklets `0.10.0` asserted in `JSIWorkletsModuleProxy.cpp:455` while
reconstructing a remote callback scheduled onto the React Native runtime.

Worklets `0.10.1` is a narrow patch release, not a feature adoption. It includes three
cherry-picked fixes from the `0.10` stable line:

- normalize Windows paths in bundle-mode module IDs;
- tie React Native Runtime remote-function lifetime to TurboModule invalidation;
- make destructor access safe across a time-of-check / time-of-use race.

The latter two fixes are directly relevant to Soli's captured remote-callback crash.

Compatibility metadata supports the narrow patch: Worklets `0.10.1` supports React Native
`0.83-0.86`, and Reanimated `4.5.0` accepts Worklets `0.10.x`.

Soli now applies exact Worklets `0.10.1` and excludes `react-native-worklets` through
`expo.install.exclude`. This is only an Expo install/version-check exclusion; native
autolinking remains enabled. The drawbacks and maintenance requirements are explicit:

- `0.10.1` intentionally diverges from Expo SDK 57's bundled exact `0.10.0`.
- Expo install checks, Expo Doctor, and other Expo version validation will not check this
  package while it is excluded, so compatibility must be maintained manually.
- A clean native rebuild is mandatory after changing Worklets because its JavaScript and
  native parts must stay aligned; a JavaScript-only reload is not sufficient.
- Remove the exclusion once Expo recommends Worklets `0.10.1` or newer, then return to
  Expo-managed version validation.

The regression test should rerun the same 20-game iOS playlist with crash logs captured;
normal gameplay/celebration smoke should also run on both platforms. Do not add Worklets
bundle mode or weaken Soli's celebration behavior unless `0.10.1` fails the focused
regression test.

Android native-cache failure mode after changing Worklets:

- Retrieved: 2026-07-04
- Sources:
  - https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/#remove-or-invalidate-caches
  - https://github.com/expo/expo/issues/42893

If Android release builds fail with Ninja/CMake looking for a missing
`libworklets.so` under an old generated hash, first treat it as stale ignored native
build output. Reanimated's Android build troubleshooting calls out stale Android and
package-level CMake/build artifacts as valid cleanup targets. For Soli's generated
native-output workflow, the scoped cleanup targets are:

- `android/.gradle`
- `android/build`
- `android/app/.cxx`
- `android/app/build`
- `node_modules/react-native-worklets/android/.cxx`
- `node_modules/react-native-worklets/android/build`
- `node_modules/react-native-reanimated/android/.cxx`
- `node_modules/react-native-reanimated/android/build`
- `node_modules/expo-modules-core/android/.cxx`
- `node_modules/expo-modules-core/android/build`

Do not respond to this failure by downgrading Reanimated/Worklets, changing Android
Gradle Plugin, or disabling the New Architecture; the Reanimated guide explicitly warns
against those detours. Clean generated artifacts, then rebuild the Android release and
confirm the fresh install on the device.

### Reanimated 4.2 Feature Flags

_Date: 2025-12-14_
_Refresh check: 2026-07-03_

## Sources
- Blog (Reanimated 4.2.0): `https://blog.swmansion.com/introducing-reanimated-4-2-0-71eea21ca861`
- Feature flags docs (Reanimated 4.x): `https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags/#force_react_render_for_settled_animations`
- Compatibility table: `https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/`
- Expo SDK 56 Reanimated reference: `https://docs.expo.dev/versions/v56.0.0/sdk/reanimated/`
- Reanimated latest npm metadata: `https://registry.npmjs.org/react-native-reanimated/latest`
- Worklets latest npm metadata: `https://registry.npmjs.org/react-native-worklets/latest`

## Refresh check (2026-07-03)

Status: updated for the current Reanimated 4.3.1 repository state.

- Soli currently uses Reanimated `4.3.1` and Worklets `0.8.3`, matching Expo SDK
  56's recommended Reanimated version.
- The Reanimated feature-flag docs now list
  `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` and
  `USE_COMMIT_HOOK_ONLY_FOR_REACT_COMMITS` as default `true` for Reanimated `4.3.0+`.
  The old 4.2-era opt-in experiment has effectively become the default behavior in
  this repo.
- If a regression appears that points to detached animated styles not reverting, the
  updated action is to explicitly set `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` to
  `false` in `package.json` static flags and rebuild native apps.
- Upstream npm latest is Reanimated `4.5.1` and Worklets `0.10.1`; do not use those
  with this guide unless a separate Expo/native dependency upgrade approves the pair.

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

## How to configure a static Reanimated feature flag
In `package.json`, add an override only when intentionally changing a default:

```json
{
  "reanimated": {
    "staticFeatureFlags": {
      "FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS": false
    }
  }
}
```

Then rebuild the native apps (for iOS this includes `pod install`; for Expo-managed native, that implies prebuild/run steps rather than Expo Go).

## Fit assessment for this app
- **Likely safe**: our card components keep their animated styles attached (we reset shared values back to “rest” states), so we are not intentionally “detaching animated styles” during normal operation.
- **Likely beneficial**: many simultaneously mounted animated card components + frequent React commits (especially during auto-play) is exactly where commit-hook clone work can become noticeable.

## Recommended evaluation procedure
1. Stay on Expo SDK 56's compatible Reanimated/Worklets pair unless a separate native dependency upgrade is approved.
2. Confirm the default-on 4.3 behavior on fresh native builds.
3. Run stress cases:
   - rapid manual draw/move sequences
   - `yarn demo:auto-solve`
4. Watch for regressions:
   - any “style stuck” behavior when disabling animations or when cards unmount/remount
   - any new warnings/errors from Reanimated
5. If regressions point to detached animated styles, try an explicit `false` override for `FORCE_REACT_RENDER_FOR_SETTLED_ANIMATIONS` and document the constraint: **do not detach animated styles to reset**; reset values instead.

### Expo SDK Reanimated Alignment

- **Package**: `react-native-reanimated` (+ `react-native-worklets`)
- **Retrieved**: 2026-03-02
- **Primary docs**:
  - Reanimated in Expo SDK 55: https://docs.expo.dev/versions/v55.0.0/sdk/reanimated/
  - Worklets in Expo SDK 55: https://docs.expo.dev/versions/v55.0.0/sdk/worklets/
  - SDK 55 reference matrix: https://docs.expo.dev/versions/v55.0.0/

## Version Alignment for SDK 55
- Bundled reanimated in SDK 55 docs: `~4.2.1`
- Bundled react-native-worklets in SDK 55 docs: `0.6.1`

## Migration Notes
- Keep `react-native-reanimated` and `react-native-worklets` aligned with Expo’s bundled versions.
- Use `expo install` to avoid native ABI mismatch.
- Re-run animation-heavy user flows after upgrade (stock draw, card flights, celebration).

## Babel / runtime expectations
- Ensure reanimated Babel plugin setup remains valid after dependency updates.
- Restart Metro with cache clear if worklet or plugin changes are made.

## Usage Notes
- This app is animation-heavy, so reanimated/worklets compatibility is a high-risk area.
- Validation should prioritize gameplay interactions and animation smoothness, not just compile success.

## Refresh check (2026-07-03)

- Status: historical SDK 55 Reanimated/Worklets guide. Keep it for the old SDK 55 target
  only.
- Current repo state: Soli resolves `react-native-reanimated@4.3.1` with
  `react-native-worklets@0.8.3`, matching Expo SDK 56 and Software Mansion's compatibility
  table for Reanimated 4.3.x.
- Current upstream: Expo SDK 57 bundles newer animation packages (`react-native-reanimated`
  4.5 and `react-native-worklets` 0.10). The SDK 57 changelog also calls out an Android
  Hermes V1/Reanimated memory regression that impacts SDK 56 and suggests Worklets bundle
  mode as the workaround.
- Superseding guide: add or use an SDK 56-specific Reanimated guide before changing these
  packages; do not manually bump Reanimated or Worklets outside Expo alignment.
- Sources:
  - https://docs.expo.dev/versions/v56.0.0/sdk/reanimated/
  - https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
  - https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting/
  - https://expo.dev/changelog/sdk-57

### Tamagui Reanimated Notes

Research date: 2026-06-11
Refresh check: 2026-07-03

## Purpose

Cache the Reanimated 4 and Worklets facts needed to select Tamagui Config v5's native
animation driver without introducing an unrelated Reanimated upgrade.

## Sources

- https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started/
- https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/
- https://docs.swmansion.com/react-native-reanimated/docs/guides/migration-from-3.x/
- https://docs.swmansion.com/react-native-reanimated/docs/reanimated-babel-plugin/about/
- https://tamagui.dev/docs/core/config-v5
- https://docs.expo.dev/versions/v56.0.0/sdk/reanimated/
- https://github.com/software-mansion/react-native-reanimated/releases/tag/4.5.1
- https://registry.npmjs.org/react-native-reanimated/latest
- https://registry.npmjs.org/react-native-worklets/latest

## Refresh check (2026-07-03)

Status: updated for the current SDK 56 repository state.

- Soli now uses Expo SDK 56 with React Native `0.85.3`,
  `react-native-reanimated` `4.3.1`, and `react-native-worklets` `0.8.3`.
- Expo's SDK 56 Reanimated reference recommends Reanimated `4.3.1` and says
  `babel-preset-expo` automatically configures the Reanimated Babel plugin.
- Upstream npm latest is Reanimated `4.5.1` and Worklets `0.10.1`, but that is not
  Expo SDK 56's recommended pair. Treat any move beyond `4.3.1` / `0.8.3` as a
  separate Expo/native dependency upgrade with clean native rebuilds.
- The official Reanimated compatibility table supports Reanimated `4.3.x` with React
  Native `0.85` and Worklets `0.8.x`.

## Current compatibility

Soli currently uses:

- Expo SDK `^56.0.0`
- React Native `0.85.3`
- Reanimated `4.3.1`
- React Native Worklets `0.8.3`

The official Reanimated compatibility table supports:

- Reanimated `4.3.x` with React Native `0.85`
- Reanimated `4.3.x` with Worklets `0.8.x`

No Reanimated minor upgrade is required for Tamagui 2. Keep Expo's compatible version
unless a dedicated Expo/native dependency upgrade explicitly chooses another
Reanimated/Worklets pair.

## Babel plugin

Expo configures the Worklets transform through `babel-preset-expo`. Reanimated's
manual `react-native-worklets/plugin` instruction applies to React Native Community
CLI projects or to Expo projects where a verified build proves the preset is not
applying the transform.

Soli currently has an explicit compatibility plugin entry:

```js
plugins: ['@tamagui/babel-plugin', 'react-native-reanimated/plugin']
```

The current repository has already removed the explicit Reanimated plugin entry and
retains only the Tamagui plugin. Do not add an explicit
`react-native-worklets/plugin` unless a verified Expo build proves that the preset is
not applying the transform.

When `tamagui.build.ts` exists, the Tamagui plugin can read shared options from it.

## Tamagui Config v5 driver

This driver selection is needed only for the separately approved Config v5 follow-up.
Config v4 remains the completion target for the core Tamagui 2 migration.

Config v5 separates animation presets from the base config. For Soli:

```ts
import { defaultConfig } from '@tamagui/config/v5'
import { animations as animationsCSS } from '@tamagui/config/v5-css'
import { animations as animationsReanimated } from '@tamagui/config/v5-reanimated'
import { createTamagui, isWeb } from 'tamagui'

export const config = createTamagui({
  ...defaultConfig,
  animations: isWeb ? animationsCSS : animationsReanimated,
})
```

This keeps CSS transitions on web and Reanimated on native.

Existing Soli Tamagui animation keys used by Toast and Sheet, including `quick`,
`quickest`, and `medium`, are available in Config v5 drivers.

## Deprecated worklet helpers

Soli currently imports `runOnJS` and `runOnUI` from Reanimated. Reanimated 4 still
re-exports these for compatibility, but newer Worklets APIs use scheduling names such
as `scheduleOnRN` and `scheduleOnUI`.

Do not migrate these gameplay animation helpers as part of the Tamagui 2 task. That
would change timing-sensitive card, celebration, and scrubber code. Track it as a
separate focused task.

## Rebuild and cache rules

After changing the Worklets version or Babel plugin:

- clear Metro cache;
- rebuild native applications;
- confirm the installed binary is fresh;
- watch for JavaScript/native/Worklets version mismatch errors.

Reanimated warns that mismatched JavaScript, C++, Java, and Babel plugin pieces can
produce undefined behavior.

## Verification

- Existing Reanimated card and gesture unit tests pass.
- Card flight, flip, waste fan, celebration, and undo scrubber work on fresh iOS and
  Android builds.
- Tamagui Sheet and Toast transitions honor reduced motion.
- No "Failed to create a worklet" or version-mismatch logs appear.
