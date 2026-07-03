# Lonelybot Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `lonelybot`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this for Lonelybot-backed deal solving and demo playlist generation. Treat it as tooling/offline oracle context, not runtime app logic.

## Detailed guidance

The sections below are the definitive combined notes for this package or tool. Keep version-specific context when it affects compatibility, but update this single file instead of adding task- or feature-prefixed guides.

### Demo Autosolve Playlist Notes

Date researched: 2026-06-24

## Source links

- GitHub: https://github.com/vuonghy2442/lonelybot
- Tags: https://github.com/vuonghy2442/lonelybot/tags
- Existing Soli guide: `docs/external-package-guides/lonelybot.md`
- Local checkout inspected: `/Users/karim/kDrive/Code/Lonelybot/lonelybot`

## What this feature needs from Lonelybot

The 20-game demo playlist needs fixed, app-compatible deals plus a replayable
solution path for each deal. Lonelybot can solve a `default` seed and print a
solution trace today, but `harvest-v2` only writes app exact IDs and draw masks.
The implementation should therefore add or wrap a dedicated solution-export path
instead of trying to infer paths from the generated catalog.

## Relevant CLI commands

```sh
./target/release/lonecli --help
./target/release/lonecli solve <seed_type> <seed> <draw_step>
./target/release/lonecli print <seed_type> <seed>
./target/release/lonecli harvest-v2 --total 20 --start-seed 0 --out /tmp/out.ts
```

The repo-level Soli wrapper is:

```sh
node scripts/generate-solvable-deals-v2.js \
  --total=5 \
  --start-seed=0 \
  --chunks=1 \
  --skip-build \
  --timeout-ms=5000 \
  --report-every=1 \
  --out=/tmp/soli-solvable-demo-sample.ts
```

Observed sample output from that command:

```text
Draw 1: solved=5 unsolved=0 unknown=0
Draw 2: solved=5 unsolved=0 unknown=0
Draw 3: solved=3 unsolved=2 unknown=0
Draw 4: solved=3 unsolved=2 unknown=0
Draw 5: solved=3 unsolved=2 unknown=0
Generated 5 v2 solvable deals at /tmp/soli-solvable-demo-sample.ts
```

Generated rows keep the current app format:

```ts
export const SOLVABLE_DEALS_V2 = [
  'E1_8nk351v2ahh1oyr6mdo9nv3g6xi7op92kup67pb4jzg1:3',
] as const
```

The `:3` suffix is the draw-count bit mask. For seed `default 0`, Draw 1 and
Draw 2 solved, while Draw 3-5 did not solve in the sample run.

## Solution trace formats

`lonecli solve default 0 1` solved in 94 Lonelybot primitive moves during the
local check. It prints three useful trace shapes:

```text
DS A♣, R 7♦, DP 3♥, ...
```

These are Lonelybot primitive moves:

- `DS`: deck to foundation stack
- `PS`: tableau pile to foundation stack
- `DP`: deck to tableau pile
- `SP`: foundation stack to tableau pile
- `R`: reveal hidden card

It also prints a standard move trace:

```text
=  =  =  =  =  =  A♣:D▸♣  7♦:4▸1  ...
```

This is closer to Soli replay:

- `=` means draw or recycle.
- `D` means Lonelybot deck/waste current card.
- `1` through `7` mean tableau columns.
- Suit symbols mean foundation stacks.

It finally prints a compressed "minimal klondike" notation like:

```text
@@@@@@AD IF ...
```

Do not use the compressed notation for app replay; it is compact but less
self-describing.

## Soli-specific caveats

`harvest-v2` has a Soli-specific exact-ID encoder. It remaps Lonelybot's internal
suit order to Soli's canonical `clubs, diamonds, hearts, spades` order before
encoding. Do not assume `lonecli exact default 0` maps directly to the app's
`E1_...` string.

Soli starts normal games with the first draw already revealed:

- Draw 1 starts with `waste.length === 1`.
- Draw 5 starts with `waste.length === 5`.

Lonelybot standard traces start from untouched stock and include the initial
draw(s) as `=`. The implemented replay path normalizes this by hydrating playlist
games with `revealInitialWaste: false`, while normal app games keep their existing
first-waste-card reveal. This keeps the stored solver trace intact and avoids
special-case trimming of the first draw actions.

Soli draws stock by popping from the end of the `stock` array. For replay fixtures,
the generator stores stock in the order Soli needs to expose the same sequence
that Lonelybot's standard trace expects. These generated exact IDs are therefore
real Soli exact IDs derived from Lonelybot default seeds, but they are replay
fixtures rather than a byte-for-byte reuse of the existing `harvest-v2` catalog row
for a given seed.

## Recommended export format

Prefer a new structured JSON/export command over parsing display text when we
change Lonelybot itself:

```json
{
  "seedType": "default",
  "seed": "0",
  "drawCount": 1,
  "exactId": "E1_8nk351v2ahh1oyr6mdo9nv3g6xi7op92kup67pb4jzg1",
  "primitiveMoveCount": 94,
  "standardMoves": [
    { "type": "draw" },
    { "type": "move", "card": "A♣", "from": "D", "to": "♣" }
  ]
}
```

The first app-side implementation uses `scripts/generate-demo-autosolve-playlist.js`
as a wrapper around the existing CLI and parses the standard display trace. The
generated TypeScript normalizes cards to Soli identifiers, for example
`{ suit: 'clubs', rank: 1 }`, so runtime playback does not need Unicode card
parsing.

## Runtime mapping into Soli

Map structured standard moves into existing reducer actions:

- `draw`: `dispatchWithFlight({ type: 'DRAW_OR_RECYCLE' })`
- `D -> tableau`: select `{ source: 'waste' }`, target `{ type: 'tableau', columnIndex }`
- `D -> foundation`: select `{ source: 'waste' }`, target `{ type: 'foundation', suit }`
- `tableau -> tableau`: find the card in the source column and dispatch `APPLY_MOVE`
- `tableau -> foundation`: find the top tableau card and dispatch `APPLY_MOVE`
- `foundation -> tableau`: select `{ source: 'foundation', suit }`, target tableau

Do not model `R` as an app action. Soli flips newly exposed tableau cards as a
side effect of `APPLY_MOVE`.

Undo probes are not part of Lonelybot's solution trace. The generator adds a small
deterministic set of replay move indices to selected games. During playback the app
applies the move, dispatches `UNDO`, waits for history to step back, resolves the
same move again from the restored board, and continues. This gives the Android
runner undo coverage without corrupting the solver path.

When moving from one solved playlist game to the next, do not start step 1 on a
fixed timer after dispatching `HYDRATE_STATE`. The Android device run showed that
win/celebration work can keep stale won-board state visible in `stateRef` long
enough for the next replay to resolve against the wrong board. Wait until
`stateRef.current` matches the newly hydrated fixture's exact ID, draw count,
zero move count, non-won state, and untouched stock/waste shape before logging the
game as loaded or dispatching the first move.

## Refresh check (2026-07-03)

- Status: still useful for the demo autosolve playlist and not superseded by a
  new public Lonelybot export API.
- Public upstream HEAD remains `ae30d391575e4dfdbf6d6bc434d99aeb9b752456`; tags
  still stop at `v0.2.2`. The local checkout has modified `lonecli/src/main.rs`
  and `lonecli/src/solver.rs`, so keep treating Soli replay export behavior as
  local project evidence.
- The repo wrapper `scripts/generate-demo-autosolve-playlist.js` still calls
  `lonecli solve` and `lonecli print`, parses the standard display trace, and
  writes Soli-normalized TypeScript replay entries. If Lonelybot is changed later,
  prefer adding a structured JSON export over making the display-text parser more
  clever.
- The hydration caveat above remains current: playlist fixtures intentionally
  start from untouched stock to preserve Lonelybot traces, unlike normal Soli
  games that reveal initial waste.

### Solvable Harvest Notes

Date researched: 2026-06-16

Updated: 2026-06-18

## Source links

- GitHub: https://github.com/vuonghy2442/lonelybot
- Tags: https://github.com/vuonghy2442/lonelybot/tags
- Local checkout inspected: `/Users/karim/kDrive/Code/Lonelybot/lonelybot`

## What it is

Lonelybot is a Rust Klondike solver for thoughtful and random Klondike. The repo is MIT licensed.

It appears promising for a long-term high-throughput harvester because it is game-specific, Rust-based, and reports significant speedups versus Solvitaire-style approaches. Its README also warns that many optimizations are game-specific and not fully written up, so use it with cross-validation before treating it as the only source of truth.

## Relevant CLI shape

The current README documents these modes:

```sh
lonecli exact [seed_type] [seed]
lonecli random [seed_type] [seed] [draw_step]
lonecli print [seed_type] [seed]
lonecli bench [seed_type] [seed] [draw_step]
lonecli solve [seed_type] [seed] [draw_step]
lonecli rate [seed_type] [seed] [draw_step]
```

Examples from the README:

```sh
lonecli exact solvitaire 22
lonecli random default 0 3
lonecli print default 0
lonecli solve default 41 3
lonecli rate default 0 3
```

The local CLI source still contains additional experimental commands such as
`hop`, `hop-loop`, `graph`, `rand-solve`, and Soli's `harvest-v2`; treat those as
local/source-level behavior and verify `lonecli --help` before scripting against
them.

The CLI supports move types such as:

- `R`: reveal hidden card
- `SP`: foundation stack to tableau
- `DP`: stock/deck to tableau
- `DS`: stock/deck to foundation
- `PS`: tableau/pile to foundation stack

## Soli harvest command

For phase 1, the local `lonecli` has a Soli-specific `harvest-v2` command:

```sh
./target/release/lonecli harvest-v2 \
  --total 50000 \
  --start-seed 0 \
  --out /path/to/soli/src/data/solvableDealsV2.generated.ts \
  --report-every 1000
```

This command evaluates Lonelybot `default` candidate decks for Draw 1-5, then writes app-owned exact deal IDs in the generated TypeScript catalog format:

```ts
'E1_...:31'
```

The number after the colon is a draw-count bit mask. The permanent app identity is the `E1_` exact deck ID, not the Lonelybot `default` seed; the seed is only a generator input.

## Reported results to treat as assumptions

The README says:

- Thoughtful Klondike estimate: 81.95 +/- 0.03 at 95% confidence.
- Random Klondike estimate: 47.58 +/- 0.80.
- The implementation started from Solvitaire ideas, then adds suit symmetry, more dominances, move pruning, and optimized Rust search.
- The author reports roughly an order-of-magnitude state reduction and about two orders of magnitude faster search rate, for roughly three orders of magnitude total speedup.

## Integration recommendation

Use lonelybot as the likely best long-term external engine if it can pass our validation checks.

Recommended spike:

1. Build the Rust binary locally.
2. Confirm it supports our exact Draw 1 rule and seed/deck format.
3. Run the same fixed seed corpus as Solvitaire.
4. Require agreement on all Solvitaire-decided deals in a representative sample.
5. Save solution traces where available so generated app deals can be replay-tested.

If lonelybot agrees with Solvitaire and is much faster, keep Node as the orchestration layer and call the Rust binary for offline harvest jobs.

## Local checkout findings

The local README documents these seed types:

- `default`: Rust RNG.
- `legacy`.
- `solvitaire`.
- `klondike-solver`.
- `greenfelt`.
- `exact`: converts a 256-bit integer to a corresponding 52-card permutation.
- `microsoft`.

In the local source, `default_shuffle(seed: u64)` uses `SmallRng::seed_from_u64(seed)` and `cards.shuffle(&mut rng)`. This is convenient for generation but should not become the permanent app identity. The generated catalog stores app exact IDs instead.

Local test artifacts show:

- Draw 1, 1,000 seeds: 920/1,000 solvable.
- Draw 2, 1,000 seeds: 903/1,000 solvable.
- Draw 3, 1,000 seeds: 832/1,000 solvable.
- Draw 4, 1,000 seeds: 693/1,000 solvable.
- Draw 5, 1,000 seeds: 532/1,000 solvable.
- Draw 1, 10,000 seeds: 90.44% solvable.

The CLI `print` command outputs Solvitaire-style JSON with full tableau and stock. The stock is dealt from the end. This is a good interchange format for a dataset generator.

## Refresh check (2026-07-03)

- Status: updated and still useful as the Soli offline-harvest guide.
- Public upstream HEAD is still `ae30d391575e4dfdbf6d6bc434d99aeb9b752456`,
  matching the local checkout base; public tags still stop at `v0.2.2`.
- The local checkout currently has modified `lonecli/src/main.rs` and
  `lonecli/src/solver.rs`. Preserve those as user/project-local solver changes;
  do not overwrite them while refreshing docs.
- The README command list has changed since the original guide text. Use `solve`
  and `print` for replay/export work, and keep `harvest-v2` documented as the
  Soli-specific local command that writes `exactId:drawMask` TypeScript catalog
  rows.
- No new public release removes the need for Solvitaire cross-validation before
  treating Lonelybot as the sole oracle for curated app deals.
