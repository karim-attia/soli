# Generated Data Startup Cost — Lazy Catalog Validation & Demo Playlist Loading

## User prompt

> P0
>
> 3.1 MB of generated TS literals bundled eagerly
>
> src/data/solvableDealsV2.generated.ts (2.5 MB, ~45k rows) loads at startup via HistoryProvider; demoAutoSolvePlaylist.generated.ts (617 KB) is a dev-only feature but ships to every user via useDemoGameLauncher
>
> This is from other check.
>
> Sounds similar to your P1. pls check both.
>
> Please propose and implement fix according to agents.md

(Prior context: an architecture/performance review in the same chat flagged as "P1" that
`parseGeneratedRow` in `src/data/solvableDealsV2.ts` runs `parseExactDealId` BigInt
validation over all ~45k catalog rows at first access. Benchmarked on the dev machine
in Node/V8: 86 ms with validation vs 6 ms with just the string split. Hermes BigInt is
much slower, so the on-device cost is likely 0.5–2 s of blocked JS thread at startup.)

## Description

Two generated data files dominate the JS module graph:

- `src/data/solvableDealsV2.generated.ts` (2.5 MB, 45,258 rows of `exactId:drawMask`
  strings) — the solvable deal catalog. It is a **core product feature**: with
  `solvableGamesOnly` on by default, the very first new deal needs the catalog, and
  history hydration needs it to derive the `solvable` flag. So it must ship and must be
  available near startup. The problem is not bundling but **runtime validation cost**:
  `parseGeneratedRow` calls `parseExactDealId` (char-by-char BigInt loop) on every row
  purely as a sanity check of machine-generated data.
- `src/data/demoAutoSolvePlaylist.generated.ts` (617 KB of nested object literals) —
  used only by the hidden developer demo. It cannot be excluded from the release bundle
  (demo mode is a runtime toggle used in production builds via deep links and
  `yarn prod`), but it should not be **evaluated** during normal startup.
  `src/data/demoAutoSolvePlaylist.ts` currently touches the array at module top level
  (`DEMO_AUTO_SOLVE_PLAYLIST.length`). Expo/Metro inline-requires likely defers module
  evaluation until first use already, but relying on that is implicit and fragile.

Why this matters: both costs land on the JS thread during app startup (history
hydration runs immediately after mount), delaying time-to-interactive on real devices.

## Acceptance Criteria

- First catalog access (`getSolvableDealsV2` / `isExactDealSolvableForDrawCount`) no
  longer performs BigInt decoding per row; it only does cheap structural checks
  (prefix + draw-mask range). Startup parse cost drops from ~86 ms (V8) / ~0.5–2 s
  (device estimate) to ~10 ms (V8).
- The catalog is still deeply validated: a jest test decodes every generated row with
  `parseExactDealId` and checks the draw mask, so a bad regeneration fails CI/dev
  test runs instead of crashing (or silently misbehaving) at app runtime.
- The demo playlist module is only evaluated when a demo actually launches
  (explicit lazy `require` inside the accessor), never on normal startup.
- `yarn typecheck && yarn lint && yarn jest` pass.

## Possible approaches incl. pros and cons

1. **Drop runtime BigInt validation; move deep validation to a jest test.**
   (Chosen for the catalog.)
   - Pros: eliminates ~93% of the parse cost with a tiny diff; validation coverage is
     preserved (test decodes all rows); generated data is trusted at runtime like any
     other build artifact.
   - Cons: a corrupted bundle would be caught later (at deal creation via
     `createGameStateFromExactId` → `decodeExactDealId`, which still throws) instead of
     at catalog load. Acceptable: the data is generated + committed + CI-tested.
2. **Keep validation but run it `__DEV__`-only.**
   - Pros: same prod win.
   - Cons: still burns 1–2 s of JS thread every dev-build session; a test covers the
     same risk without the recurring cost. Rejected.
3. **Move catalog into a SQLite/asset file loaded off the JS thread.**
   - Pros: removes the 2.5 MB from the JS bundle and the in-memory string array/Map.
   - Cons: significant engineering (asset pipeline, async lookups ripple through
     `normalizeHistoryEntry` and deal selection which are synchronous today). Violates
     "prefer simplicity" for a problem that the cheap fix already solves. Rejected for
     now; revisit only if catalog size grows by an order of magnitude.
4. **Demo playlist: explicit lazy `require` in an accessor function.** (Chosen.)
   - Pros: deterministic deferral independent of Metro inline-requires behavior; one
     small wrapper change; call sites already run only at demo launch.
   - Cons: none meaningful. (Bundle exclusion is impossible anyway — see Description.)

## Open questions to the user

None — the trade-offs are small and the recommended options are implemented.

## Dependencies

None new.

## Components

No UI components involved.

## Related tasks

- Prior review in this chat (P1/P5), `docs/product/game-history-performance/`,
  `docs/product/demo-autosolve-playlist/`.

## Simplification ideas

- `demoAutoSolvePlaylist.ts` previously re-exported the array and a `_TOTAL` constant;
  collapsed into a single lazy accessor `getDemoAutoSolvePlaylist()` (callers derive
  `.length` themselves).

## Steps to implement

1. [x] `src/data/solvableDealsV2.ts`: remove `parseExactDealId` call from
   `parseGeneratedRow`; keep cheap checks (`E1_` prefix, integer mask in 1..31); add a
   comment explaining why deep validation lives in a test.
2. [x] New `test/unit/data/solvableDealsV2.generated.test.ts`: decode every row with
   `parseExactDealId`, validate masks, collect violations, expect none.
3. [x] `src/data/demoAutoSolvePlaylist.ts`: replace top-level import + eager `.length`
   with cached lazy `require` accessor `getDemoAutoSolvePlaylist()`.
4. [x] `src/features/klondike/hooks/useDemoGameLauncher.ts`: use the accessor inside
   `runDemoPlaylist`/`handleLaunchDemoGame` instead of module-level imports.
5. [x] Update `test/unit/solitaire/demoReplay.test.ts` to use the accessor.
6. [x] Run `yarn typecheck && yarn lint && yarn jest`; re-run the Node parse benchmark
   to confirm the runtime-path cost.

## Plan: Files to modify

- `src/data/solvableDealsV2.ts`
- `src/data/demoAutoSolvePlaylist.ts`
- `src/features/klondike/hooks/useDemoGameLauncher.ts`
- `test/unit/solitaire/demoReplay.test.ts`
- `test/unit/data/solvableDealsV2.generated.test.ts` (new)

## Files actually modified

- `src/data/solvableDealsV2.ts`
- `src/data/demoAutoSolvePlaylist.ts`
- `src/features/klondike/hooks/useDemoGameLauncher.ts`
- `test/unit/solitaire/demoReplay.test.ts`
- `test/unit/data/solvableDealsV2.generated.test.ts` (new)

## Intermediary learnings

- Benchmark (Node/V8, dev machine): full parse+BigInt validation of 45,258 rows = 86 ms;
  split-only = 6 ms; Map build = 3 ms. Hermes BigInt is significantly slower, so the
  device-side win is much larger than the V8 numbers suggest.
- The catalog cannot be deferred past startup: `solvableGamesOnly` defaults to true, so
  the first deal and history hydration both need it. Making the parse cheap is the
  right fix, not making it lazier.
- The demo playlist cannot be excluded from release bundles because demo mode is a
  runtime toggle in production (deep links, `yarn prod`). Lazy evaluation is the
  correct scope.
- The generated playlist file uses `as const satisfies readonly DemoAutoSolvePlaylistEntry[]`,
  so the lazy accessor can return `readonly DemoAutoSolvePlaylistEntry[]` without casts.

## Identified issues

None open.

## Testing

- `yarn typecheck` — pass.
- `yarn lint` — pass.
- `yarn jest` — 17 suites / 133 tests pass, including the new generated-catalog
  validation test and the updated demo replay tests.
- Node micro-benchmark of the new runtime parse path (split + structural checks):
  8 ms for all 45,258 rows in V8 (was 86 ms with BigInt validation; the gap is far
  larger on Hermes devices where BigInt is much slower).
- No device build for this change: pure data-loading refactor with identical outputs,
  fully covered by unit tests; a release build was already running in another terminal
  and killing it for a smoke test was judged not worth it. Next feature build will
  exercise startup + demo launch paths.
