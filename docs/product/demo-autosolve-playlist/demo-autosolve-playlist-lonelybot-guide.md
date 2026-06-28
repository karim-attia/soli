# Demo Autosolve Playlist Lonelybot Guide

Date researched: 2026-06-24

## Source links

- GitHub: https://github.com/vuonghy2442/lonelybot
- Existing Soli guide: `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-lonelybot-guide.md`
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
