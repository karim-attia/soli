# Solvable Harvest Strategy Lonelybot Guide

Date researched: 2026-06-16

Updated: 2026-06-18

## Source links

- GitHub: https://github.com/vuonghy2442/lonelybot
- Local checkout inspected: `/Users/karim/kDrive/Code/Lonelybot/lonelybot`

## What it is

Lonelybot is a Rust Klondike solver for thoughtful and random Klondike. The repo is MIT licensed.

It appears promising for a long-term high-throughput harvester because it is game-specific, Rust-based, and reports significant speedups versus Solvitaire-style approaches. Its README also warns that many optimizations are game-specific and not fully written up, so use it with cross-validation before treating it as the only source of truth.

## Relevant CLI shape

The README documents these modes:

```sh
lonecli hop [seed_type] [seed] [draw_step]
lonecli hop-loop [seed_type] [seed] [draw_step]
lonecli graph [seed_type] [seed] [draw_step] [file.csv]
```

Examples from the README:

```sh
lonecli hop default 0 3
lonecli hop-loop default 0 3
lonecli graph klondike-solver 338 3 test.csv
```

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
