# Solvable Harvest Strategy Solvitaire Guide

Date researched: 2026-06-16

## Source links

- GitHub: https://github.com/thecharlieblake/Solvitaire
- Paper: https://arxiv.org/html/1906.12314v6
- JAIR article page: https://www.jair.org/index.php/jair/article/view/17167

## What it is

Solvitaire is a C++ solver for perfect-information solitaire games. It is the solver behind the published high-confidence Klondike winnability estimates from Blake and Gent.

The repo is GPL-2.0. Treat it as an offline research/oracle tool unless we intentionally review licensing for any distributed binary or linked integration.

## Installation model

The README recommends the supplied Docker image.

```sh
./docker-install.sh
./enter-container.sh
```

Build inside the container:

```sh
./build.sh --release --solvitaire
```

Run from outside the container:

```sh
./enter-container.sh "./solvitaire"
```

Run tests inside `src/test`:

```sh
./enter-container.sh "cd src/test; ../../unit-tests"
```

## Relevant CLI shape

The README shows the help pattern:

```sh
./enter-container.sh "./solvitaire --help"
./enter-container.sh "./solvitaire --type klondike --random 1"
```

Useful flags from the README:

- `--type <game>` chooses a preset game type, such as `klondike`.
- `--available-game-types` lists supported presets.
- `--describe-game-rules <game>` prints the JSON rules for a preset.
- `--custom-rules <path>` allows solving with custom JSON rules.
- `--random <seed>` creates and solves a random deal.

The sample output includes:

- solution type
- states searched
- unique states searched
- backtracks
- dominance moves
- final cache size
- maximum search depth
- time taken

## Solver techniques to reuse conceptually

The paper is more useful than the README for algorithm design. It documents:

- Depth-first search over exact game states.
- Transposition tables.
- Symmetry breaking.
- Dominances.
- Streamliners.
- Safe moves to foundations.
- A partial-pile move dominance.

Important Draw 1 note: the paper says stock moves can be treated like a reserve only when stock draw size is 1 and infinite redeals are allowed. That matches this app's Draw 1 solvable guarantee, but not higher draw counts.

## Published reference numbers

Use the v6/JAIR-era numbers as the current reference:

- Standard thoughtful Klondike: 819,371 winnable, 180,472 unwinnable, 157 unknown out of 1,000,000, reported as about 81.945%.
- Thoughtful Klondike Draw 1: 904,226 winnable, 94,629 unwinnable, 1,145 unknown out of 1,000,000.

The app currently says curated deals are proven against Draw 1, so the correct theoretical target is closer to 90.4% than 82%, assuming our rules match.

## Integration recommendation

Use Solvitaire first as a validation oracle and research baseline, not as app code.

Recommended spike:

1. Clone/build Solvitaire outside the app bundle.
2. Confirm exact rule preset for our rules: draw 1, unlimited redeals, worrying back allowed or disallowed to match the app.
3. Build a deck-order adapter from our 52-card order to Solvitaire input format, or use its seed format if compatible.
4. Run a fixed 1,000-seed benchmark and record `solved`, `unsolvable`, `unknown`, nodes, and time.
5. Cross-check a small sample against our JS solver and manually replay generated solutions in app state tests.

Do not silently discard unknown/timeouts. Hard unresolved deals are exactly where easy-harvest bias enters.
