# Solvable Harvest Strategy Seed Recovery And Generator Selection

## User prompt

```text
- In [solvable-shuffles.raw.ts](src/data/solvable-shuffles.raw.ts), we have 650 games. Would it not be possible to find the seed for these games? How would we go about that? That would make the history really really good!
- What concrete suggestions do you have for generator? Search web. Something standardized? Would we redo that in JS? What is lonelybot exact? how does it work? are there other libraries?
```

## Description

Decide how to migrate legacy tableau-only solvable entries to a seed/full-deal model, and choose a durable generator/deal identity for future random and curated games.

Current checkout note: `scripts/solvable-dataset.js` currently parses 700 entries from `src/data/solvable-shuffles.raw.ts`. The approach applies to the legacy dataset regardless of whether the target baseline is 650 or 700 entries.

## Acceptance Criteria -> add more details than in the product document if it makes sense

- Explain whether original seeds can be recovered for legacy tableau-only entries.
- Separate original RNG seed recovery from assigning a new canonical exact permutation identity.
- Recommend a generator/deal identity that is portable across JS, Rust, iOS, Android, and future library versions.
- Explain Lonelybot `exact` in implementation terms.
- Define a practical migration path for existing history.

## Design links

- N/A

## Possible approaches incl. pros and cons

### Brute-force Lonelybot/default seeds for legacy tableaus

Pros:

- If a match is found, the deal can be represented by a short integer seed.

Cons:

- A stored tableau fixes 28 exact card positions. A random full-deck seed matching those 28 positions is astronomically unlikely.
- The old entries were not generated from Lonelybot `default`, so there is no reason to expect nearby seed matches.
- Current entries do not store stock order, and many original generation seeds were never persisted.

Recommendation: do not use as the main migration path. It can be run as an opportunistic experiment over a bounded seed range, but expect essentially no matches.

### Assign each legacy tableau a new Lonelybot exact seed

Pros:

- Always possible: choose a compatible stock order, construct a full 52-card permutation, encode it as an exact seed.
- Makes legacy history linkable to a reproducible full deal going forward.
- Does not depend on any RNG.

Cons:

- This does not recover the original played stock order for old games.
- The chosen stock order must be validated if we want to claim draw 2-5 solvability.

Recommendation: best migration path.

### Search stock orders for each legacy tableau

Pros:

- Can upgrade old tableau-only records into full deals with draw-specific solvability masks.
- Preserves old curated tableaus while adding stock.

Cons:

- There are 24! possible stock orders. Exhaustive search is impossible.
- Random/smart sampling plus Lonelybot validation is needed.

Recommendation: for each legacy tableau, sample deterministic stock order candidates from the remaining 24 cards, solve draw 1-5 with Lonelybot, and keep the first stock order that meets the desired solvability target.

### Define an app-owned generator and store exact IDs

Pros:

- Future random games, curated games, history, sharing, and debugging all use the same identity model.
- JS can generate decks without Rust.
- Exact IDs keep the durable deal identity independent from generator changes.

Cons:

- Slightly more implementation work than using `Math.random`.
- Exact IDs are longer than 64-bit seeds.

Recommendation: use this for v2.

## Open questions to the user incl. recommendations (if any)

- Should legacy entries be upgraded only to Draw 1, or should we try to find stock orders that are solvable for all enabled draw counts?
  - Recommendation: first generate a Draw 1-compatible exact seed for every legacy entry, then separately enrich with draw 2-5 masks.
- Should old history be exact-replay compatible?
  - Recommendation: preserve display and statistics, but do not attempt exact replay for historical stock orders we never stored.
- Should the public user-facing ID be short?
  - Recommendation: keep short display IDs separate from the exact permutation ID.

## New dependencies

- None recommended for app runtime.
- No JS RNG package is needed if we implement the selected app generator directly and lock it with fixtures.

## UX/UI Considerations

- Legacy history can show the same visual preview/name and become associated with a canonical v2 deal when a migration map exists.
- Do not claim a legacy deal is solvable for draw 2-5 until the exact stock order has been validated for those draw counts.
- For new games, "Solvable deal" should mean the selected draw count is included in the deal's solvability mask.

## Components -> Which components to reuse, which components to create?

- Reuse:
  - `scripts/solvable-dataset.js`
  - `src/data/solvableShuffles.ts`
  - `src/solitaire/klondike.ts`
  - history display components and repositories
- Create:
  - `scripts/migrate-solvable-tableaus-to-exact.js`
  - `scripts/solver-adapters/lonelybot.js`
  - `src/solitaire/dealIdentity.ts`
  - v2 deal fixtures and parser tests

## How to fetch data, how to cache

- Parse legacy tableaus.
- Convert each tableau to fixed deal positions 0-27.
- Generate deterministic stock-order candidates from the 24 remaining cards.
- For each candidate, encode the full permutation as a Lonelybot/app exact ID.
- Solve exact IDs for draw 1-5 and cache the bitset.
- Store migration output as generated data with:
  - legacy ID
  - exact ID
  - stock order
  - solvable draw mask
  - solver version/commit
  - solve stats

## Related tasks

- `docs/product/solvable-harvest-strategy/rethink-solvable-harvesting.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-lonelybot-guide.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-rust-mobile-guide.md`

## Generator research summary

- Rust `SmallRng` is explicitly non-portable in current docs: future library versions may replace the algorithm, and results may be platform-dependent. Do not make Lonelybot `default` the only long-term app identity.
- Fisher-Yates is the standard practical shuffle algorithm, but the PRNG and bounded-integer generation must be specified exactly.
- PCG is a good candidate if we want a simple named PRNG with small code and reproducible results.
- xoshiro256**/xoshiro256++ with SplitMix64 seeding is another good candidate and aligns with modern Rust `SmallRng` internals, but we should still own the versioned implementation.
- Lehmer/factoradic permutation coding is the best durable exact-deal identity because it maps integers and permutations bijectively.

## Lonelybot exact

Lonelybot `exact` is not a PRNG. It is a 256-bit integer interpreted as a permutation rank.

In local `lonelybot/src/shuffler.rs`, `exact_shuffle(seed)`:

1. Rejects `seed >= 52!`.
2. Starts from Lonelybot's canonical ordered deck.
3. For `i = 1..51`:
   - `j = seed % (i + 1)`.
   - `seed = seed / (i + 1)`.
   - swap cards `i` and `j`.

`encode_shuffle(cards)` reverses this process:

1. Iterate `i = 51..1`.
2. Find the canonical card for position `i` inside `cards[0..i]`.
3. Accumulate `encode = encode * (i + 1) + pos`.
4. Swap that card into position `i`.

This gives one exact integer per full 52-card permutation. We can implement the same idea in TypeScript with `BigInt`.

## Recommended v2 identity

Use both:

- Durable identity: exact permutation ID, encoded as base64url/base36/base58 from a 226-bit integer.
- Generation provenance: optional `sourceSeed`, such as `soli-v1:123456`, for tooling/debugging.

This means random generation can change in v3 without breaking old deals, because the saved deal identity is the exact permutation.

## Steps to implement and status of these steps

1. **Completed**: Inspected current raw dataset format and parsed entry count.
2. **Completed**: Inspected local Lonelybot `default` and `exact` implementations.
3. **Completed**: Researched portable RNG and shuffle patterns.
4. **Pending**: Build exact encode/decode fixture tests against Lonelybot CLI.
5. **Pending**: Build legacy tableau-to-exact migration script.
6. **Pending**: Run bounded opportunistic seed matching for legacy tableaus, only as a diagnostic.
7. **Pending**: Run stock-order search and Lonelybot draw 1-5 validation for legacy tableaus.
8. **Pending**: Add history migration/display logic for legacy IDs mapped to v2 exact IDs.

## Plan: Files to modify

- `docs/product/solvable-harvest-strategy/seed-recovery-and-generator-selection.md`
- Future implementation:
  - `scripts/migrate-solvable-tableaus-to-exact.js`
  - `scripts/solver-adapters/lonelybot.js`
  - `src/solitaire/dealIdentity.ts`
  - `src/data/solvableShuffles.ts`
  - `src/state/history.tsx`
  - relevant history repositories and tests

## Files actually modified

- `docs/product/solvable-harvest-strategy/seed-recovery-and-generator-selection.md`

## Identified issues and status of these issues

- Original RNG seeds for legacy tableaus are not recoverable in general because stock/order and seed metadata were not saved.
  - Status: documented.
- Lonelybot `default` is convenient but not a durable app identity.
  - Status: documented.
- Exact ID migration can assign a reproducible identity but cannot recreate old users' actual stock order.
  - Status: documented.

## Testing

- Documentation-only change.
- Verified current dataset parser reports 700 entries in this checkout.
- Future testing should compare TypeScript exact encode/decode against `lonecli exact exact <id>` and `lonecli print exact <id>` fixtures.
