# Solvable Harvest Strategy Rethink Solvable Harvesting

## User prompt

```text
Script to harvest solvable games in [harvest-solvable-new.js](/Users/karim/kDrive/Code/soli/scripts/harvest-solvable-new.js) . This is a custom written solver (with AI). Idea is to have a set of solvable games that are guaranteed to be solvable. The goal is also to solve as many games as possible if they are solvable because otherwise, we only solve easy games and i want the average difficulty of solvable games. Only solving lower difficulty games because we abort too early would give lower difficulty on average.
rethink that approach completely. research. what is the theoretical limit? I read that it's 82%. So we are close with the 72% from this file with the 4X params. Is there a better approach? Some non-exhaustive ideas: import games from public source. use open source solver. reprogram this solver in better suited language (is js good for this) to make it more efficient and allow for drastically higher params, or other ways to make it more efficient. what would this language be, how to make it more efficient? other ideas?
```

```text
Lonelybot looks extremely promising.
I can easily create 100K games that are solvable like this. I have done some tests in the folder.
This new options leads me to some follow-up questions:
- It would make sense to have solvable games for every draw 1 - draw 5 variant, because they're just very easy to generate.
- Just did a little history rewrite. Would need some more. E.g. we would not show "Solvable for draw 1" anymore, but just solvable.
- For draw 1, it made sense to just store the tableau and not the stock. But if we have solvable for all, we would need the stock. and then to make it the same for all, we could just include the stock for draw 1 as well.
- Right now, we have some custom way to generate decks. I saw in lonelybot that there's more standardized ways of doing this, e.g. their default seeds. We could have such seeds as well. And just mark seed X is solvable for draw 1, draw 2, but not the rest.

"Here's how the default seed type works in lonelybot:
default uses Rust's standard RNG, seeded with the number you provide"

- If we go for such seeds, would we then calculate the game / tableau on the phone on the fly just based on the seed? Or still save the tableau?
- Would we need Rust working on the phone for just generating the tableau? See below.
- Saving 50K tableaus would probably be 30MB
- What would we do with the existing history?
- Would we even say that both random and non-random games just come from these seeds? And fully replace the current logic to create games with this? So that every single played tableau has a seed number? Would this simplify things? Again: existing history. Right now the app has maybe 200 users and probably just a handful of them care about the history, so we could also just keep this clean. But would of course be nice to keep it. But complexity trade-off is real.

- We could even include the solver in the app.
- With MIT license, this should be OK, correct?
- Would this be technically easy? Can a native iOS and Android app run Rust? Is this also super fast?
- We could generate games on the fly. Although pre-creating is still easy and has some benefits.
- We could also give the user a hint button. This would say whether the game is still solvable from the current position. Is it possible to load in a current position and let it solve it from there? And if yes, it would spit out a path and we could give the user the hint what to click next.

- What other options open up?
```

## Description

Rethink the solvable-deal harvesting pipeline so curated games are genuinely guaranteed solvable, representative of natural solvable-game difficulty, and reproducible. The current `scripts/harvest-solvable-new.js` records that 4X parameters found 50 solved deals in 69 attempts, but this metric is not enough to prove the average difficulty of solvable deals because the solver is incomplete and can miss hard solvable instances.

## Acceptance Criteria -> add more details than in the product document if it makes sense

- The theoretical benchmark is stated against the exact rule variant used by the app.
- The plan distinguishes standard thoughtful Klondike, Draw 1 thoughtful Klondike, and non-thoughtful player win rate.
- The dataset strategy preserves enough information to reproduce and validate a solved deal.
- The harvesting strategy avoids bias from aborting hard-but-solvable games too early.
- External solver candidates are researched and documented with dated notes.
- The recommendation covers public imports, open-source solver use, custom solver rewrite, language choice, and performance strategy.
- Future implementation stores solver provenance per generated deal: solver name/version, rule variant, seed/deck order, solution status, budget, nodes/time, and solution trace when available.
- Future implementation supports draw-specific solvability metadata for Draw 1 through Draw 5.
- The plan decides whether app deal identity is seed-only, full deck order, or a hybrid.
- The history migration preserves existing useful records without forcing complicated legacy guarantees.

## Design links

- N/A

## Possible approaches incl. pros and cons

### Keep the current JS beam-search harvester and raise parameters

Pros:

- Lowest short-term change.
- Already integrated with the dataset writer.
- Node is fine as an orchestration language.

Cons:

- The current solver is object-heavy: it clones complete state objects, sorts frontier arrays, and hashes by building large strings.
- Beam search is incomplete, so higher parameters reduce false negatives but do not remove easy-solve bias.
- The harvest metric stops when the target number of solved deals is found, so the denominator is a small negative-binomial sample, not a full estimate of all solvable-game difficulty.
- It does not save solution traces or enough provenance for later validation.

Recommendation: do not use this as the strategic path.

### Use Solvitaire as an offline oracle

Pros:

- Published academic baseline for high-confidence Klondike winnability.
- Implements exact search, transposition tables, dominances, and streamliners.
- Supports preset and custom solitaire rules.

Cons:

- GPL-2.0, so avoid app distribution/linking unless licensing is intentionally reviewed.
- Docker/build workflow is heavier than a native repo script.
- General solver may be slower than a dedicated modern Klondike engine.

Recommendation: use first as a validation oracle and research baseline.

### Use lonelybot as the high-throughput solver engine

Pros:

- Rust implementation, MIT license.
- Game-specific and likely much faster than a general solver.
- Reports state-of-the-art thoughtful Klondike results and cross-checks against Solvitaire.

Cons:

- Less formal external documentation.
- Its strongest claims should be validated in our exact rules and seed format.

Recommendation: best candidate for long-term offline harvesting if it agrees with Solvitaire on a fixed benchmark corpus.

### Use seed-based deal identity for every game

Pros:

- One compact identity can represent random and curated deals.
- History, replay, sharing, and debugging become simpler because a game can be reconstructed exactly.
- A seed can map to a solvability bitset, e.g. Draw 1/2/3/4/5.

Cons:

- Seed identity is only stable if the generator is stable.
- Lonelybot `default` uses `SmallRng`, which is not the best public long-term deal standard unless we freeze the exact implementation.
- Existing history has legacy `shuffleId` values without a seed.

Recommendation: yes, but use an app-owned seed format or Lonelybot `exact`, and store a migration fallback for old history.

### Store precomputed full deals instead of seed-only deals

Pros:

- No platform-specific RNG risk.
- No Rust needed on the phone for deal generation.
- Easy to validate and debug.

Cons:

- Larger bundle if storing tens of thousands of deals.
- Needs compression/indexing work.

Recommendation: use a hybrid: ship compact seed/permutation IDs plus a generated solvability index; only store full JSON tableaus in tooling artifacts.

### Ship Lonelybot inside the app

Pros:

- Enables current-position checks and hints.
- Can prove whether a game is still solvable after arbitrary user moves.
- Could eventually power assisted undo, "show me next move", and difficulty estimates.

Cons:

- Requires native Rust integration through Expo Modules/Turbo Modules/UniFFI.
- Solver work must be async/cancelable and budgeted.
- Adds app binary/build complexity.

Recommendation: not needed for the dataset migration. Keep as a second phase for hints.

### Rewrite the solver core in Rust

Pros:

- Best fit for compact state encoding, in-place move/undo, packed transposition tables, deterministic parallelism, and optional Wasm later.
- Memory safety makes aggressive optimization less risky than C++.
- Node can remain as the dataset orchestration layer.

Cons:

- More engineering work than adapting an existing solver.
- Solver bugs are subtle; incorrect pruning can silently create false negatives or false positives.

Recommendation: only do this after the external-solver spike proves what shape of engine and data format we need.

### Optimize the custom solver while staying in JS

Pros:

- Avoids introducing a second language.
- V8 can be fast if the state is represented with typed arrays, numeric IDs, and in-place undo.

Cons:

- Current implementation would need a substantial rewrite anyway.
- Memory pressure and hash-table overhead remain harder to control than in Rust/C++.

Recommendation: acceptable for orchestration and tests, not ideal for the exhaustive solver core.

### Import public solvable games

Pros:

- Could shortcut harvesting if a clean, licensed, rule-matching corpus exists.

Cons:

- Research did not reveal an obvious public corpus of licensed, rule-compatible, guaranteed-solvable full deals.
- Microsoft-style "guaranteed solvable" sources are product data, not a reusable dataset.
- Imported deals still need validation against our exact rules and app representation.
- Public corpora may overrepresent easy or challenge-curated deals.

Recommendation: lower priority than generating our own reproducible corpus.

### Generate deals backward from a known winning sequence

Pros:

- Every generated deal can be guaranteed solvable by construction.
- Can generate arbitrarily many deals.

Cons:

- Distribution is artificial and likely biased away from naturally dealt solvable games.
- Not suitable if the goal is average difficulty of natural solvable games.

Recommendation: useful only for demos/tutorials, not the main curated dataset.

## Open questions to the user incl. recommendations (if any)

- Should the dataset become a full-deal dataset instead of tableau-only?
  - Recommendation: yes. Breaking changes are allowed, and full-deal storage gives reproducibility, proof replay, and honest difficulty tracking.
- Should GPL tooling be allowed as an offline dev-only oracle?
  - Recommendation: yes for local validation artifacts, no for app-bundled code.
- Should the app continue to label higher draw counts as Draw 1-solvable only?
  - Recommendation: yes until we harvest and validate per-draw-count datasets.
- Should we store the stock for Draw 1 too?
  - Recommendation: yes. Make every curated game a full-deal record, even if Draw 1 could be modeled without ordered stock.
- Should all random games use the same seed system?
  - Recommendation: yes going forward, but keep existing history as legacy instead of building a perfect migration.
- Should in-app hints ship together with the dataset rewrite?
  - Recommendation: no. It is a separate product feature with native-module risk.

## New dependencies

- None added in this research task.
- Candidate dev-only tools for a follow-up spike:
  - Solvitaire, C++/Docker, GPL-2.0, offline oracle only.
  - lonelybot, Rust, MIT, high-throughput candidate.
- Candidate app dependencies for a later hint feature:
  - UniFFI or `uniffi-bindgen-react-native`.
  - Android NDK / `cargo-ndk`.
  - Expo native module or React Native Turbo Module wrapper.

## UX/UI Considerations

- If a deal is only proven for Draw 1, keep the current settings copy that higher draw counts use the same layouts and may not always be solvable.
- If future datasets are draw-count-specific, surface the guarantee more clearly in history/settings, e.g. "Draw 3-solvable deal" only when a Draw 3 proof exists.
- If every curated deal is selected for the current draw count, the user-facing label can simply say "Solvable deal" because the guarantee matches their selected mode.
- Difficulty labels should be based on persisted proof metrics, not just whether a solver found the deal quickly.
- Hints should avoid promising "the only correct move." Prefer "One winning move is..." because there may be many solution paths.

## Components -> Which components to reuse, which components to create?

- Reuse:
  - `src/features/klondike/hooks/useSolvableDealSelector.ts`
  - `src/data/solvableShuffles.ts`
  - `src/solitaire/klondike.ts`
  - `scripts/solvable-dataset.js`
- Create or replace:
  - A new full-deal dataset parser/writer, or a v2 extension of the current raw format.
  - Solver adapter scripts under `scripts/`, e.g. `scripts/solver-adapters/solvitaire.js` and `scripts/solver-adapters/lonelybot.js`.
  - A batch harvester that solves a fixed seed corpus before selecting deals.
  - A compact seed/deal module that can reconstruct the exact tableau and stock for a seed.

## How to fetch data, how to cache

- Generate deterministic random full-deck orders from recorded seeds.
- Prefer an app-owned stable seed algorithm or Lonelybot `exact` over Lonelybot `default` for durable app data.
- Store draw solvability as a bitset or array, for example `solvableDraws: [1, 2, 3]`.
- Store all curated records as full deals conceptually: tableau plus stock, even if the serialized artifact is seed/permutation based.
- Solve fixed batches, not "run until target solved."
- Cache every attempt with:
  - seed/deck order
  - rule variant
  - solver/version
  - status: solved, proven-unsolvable, unknown-timeout, invalid
  - nodes, time, memory if available
  - solution trace if solved
  - retry budget and retry history
- Select app dataset entries from the solved cache after the batch is resolved enough to avoid easy-solve bias.
- Keep unresolved deals in the cache and retry with higher budgets; do not remove them from statistics silently.

## Related tasks

- `docs/product/solvable-harvest-name-preservation/keep-existing-shuffle-names-and-run-next-25.md`
- `src/solitaire/solver-iterations.md`
- `scripts/harvest-solvable-new.js`
- `scripts/harvest-solvable.js`

## Research findings

- The "82%" figure is for standard thoughtful Klondike, commonly draw 3, not for this app's Draw 1 guarantee.
- Blake and Gent report thoughtful Klondike winnability as 81.945% +/- 0.084%.
- Their summary table reports thoughtful Klondike Draw 1 as 904,226 winnable out of 1,000,000, with 1,145 unknown.
- Therefore, if our app's rule is Draw 1 with unlimited redeals, the target is around 90.4%, not 82%.
- The current 4X result, 50/69 = 72.46%, is a small run and is below the Draw 1 theoretical reference. It is a solver/parameter hit rate, not the theoretical limit.
- Current app data stores only tableau layouts. For Draw 1 with unlimited redeals, stock order can often be modeled as reserve-like; however, storing full deal order is still recommended because it preserves reproducibility, solution replay, and per-draw-count future validation.
- Local Lonelybot tests in `/Users/karim/Code/Lonelybot` show draw-specific solvability is practical to compute at scale: the 1,000-seed sample produced 920/903/832/693/532 solvable games for Draw 1/2/3/4/5.
- Local Lonelybot source confirms `default_shuffle(seed)` uses Rust `SmallRng::seed_from_u64(seed)` and `cards.shuffle(&mut rng)`.
- Lonelybot includes an `exact` seed type that directly encodes a 52-card permutation. This is better as a durable app deal identity than relying only on `SmallRng` behavior.
- Lonelybot's current-state solving path is plausible: local `rand_solve` creates a partial state and calls the solver on that state.

## Steps to implement and status of these steps

1. **Completed**: Read current harvester, current solver variants, dataset parser, and app solvable-deal creation flow.
2. **Completed**: Research theoretical winnability and open-source solver options.
3. **Completed**: Document Solvitaire and lonelybot integration assumptions.
4. **Pending**: Define dataset v2 schema that stores full deck order or deterministic seed plus solver provenance.
5. **Pending**: Build external solver adapters for Solvitaire and lonelybot.
6. **Pending**: Run a fixed 1,000-deal benchmark through both external solvers and current JS solver.
7. **Pending**: Choose the production harvester engine based on correctness agreement and throughput.
8. **Pending**: Implement a batch-first harvester that records solved, unsolved, and unknown attempts before selecting dataset entries.
9. **Pending**: Migrate existing tableau-only entries or mark them as legacy Draw 1 tableau proofs.
10. **Pending**: Add replay and parser tests for full-deal curated games.
11. **Pending**: Run native validation after code changes, following the repo build instructions.
12. **Pending**: Decide v2 deal identity: app PRNG seed, Lonelybot exact permutation, or seed plus deck checksum.
13. **Pending**: Generate a draw 1-5 solvability index for a large fixed seed range.
14. **Pending**: Update history labels from "Draw 1-solvable" to "Solvable deal" only when the selected draw count is actually guaranteed.
15. **Pending**: Add a legacy history display path for old tableau-only solvable IDs.
16. **Pending**: Separately spike in-app Rust solving for hints/current-position checks.

## Plan: Files to modify

- `docs/product/solvable-harvest-strategy/rethink-solvable-harvesting.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-solvitaire-guide.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-lonelybot-guide.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-rust-mobile-guide.md`
- Future implementation:
  - `src/data/solvableShuffles.ts`
  - `src/data/solvable-shuffles.raw.ts`
  - `src/solitaire/klondike.ts`
  - `scripts/solvable-dataset.js`
  - `scripts/harvest-solvable-new.js` or replacement
  - `scripts/solver-adapters/*`
  - `test/unit/solitaire/*`
  - `test/unit/state/solvableShuffleSelector.test.ts`
  - `package.json`

## Files actually modified

- `docs/product/solvable-harvest-strategy/rethink-solvable-harvesting.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-solvitaire-guide.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-lonelybot-guide.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-rust-mobile-guide.md`

## Identified issues and status of these issues

- The 82% theoretical number is not the right benchmark for Draw 1.
  - Status: documented; use about 90.4% as the Draw 1 reference until exact rule matching is confirmed.
- The 4X harvest rate is not a true winnability estimate.
  - Status: documented; replace with fixed-batch statistics.
- Current JS beam search can false-negative hard solvable deals.
  - Status: documented; external oracle spike recommended.
- Current dataset lacks full deal provenance and solution traces.
  - Status: documented; dataset v2 recommended.
- Public solvable deal imports have unclear licensing, rule compatibility, and difficulty distribution.
  - Status: documented; lower priority.
- A current unrelated Metro build error reports `Unable to resolve module components/Provider` in `app/_layout.tsx`.
  - Status: observed in browser state, not addressed in this task.
- Seed-only deal identity can drift if based on an implementation-defined RNG.
  - Status: documented; prefer app-owned stable PRNG, Lonelybot exact seed, or seed plus permutation checksum.
- In-app solver hints are technically possible but separate from dataset generation.
  - Status: documented; keep as phase 2.

## Testing

Research/documentation verification for this task:

- Confirmed relevant repo files exist and were read.
- Confirmed product docs were created under `docs/product/solvable-harvest-strategy/`.

Future implementation testing:

- Run parser unit tests for dataset v2.
- Run solution replay tests for at least 20 generated full-deal entries.
- Run a fixed benchmark sample through Solvitaire, lonelybot, and current JS solver; investigate all disagreements.
- Run `yarn lint` and `yarn typecheck` after code changes.
- For native app changes, run the required clean iOS simulator build and Android release build separately, never in parallel.
