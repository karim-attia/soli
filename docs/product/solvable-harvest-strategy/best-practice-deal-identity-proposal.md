# Solvable Harvest Strategy Best Practice Deal Identity Proposal

## User prompt

```text
Make a concrete best practice proposal what we have in the app, what we store, what the flow is etc.
Make it easy to digest and adapt. Compare to what we have today. Make it explicit and a bit more verbose with some explanations so that i have a good basis to understand and decide.
```

```text
"Deals are generated to be solvable with Draw 1..." -> I don't think this needs to be replaced with something. I think we can just fully remove it.

Pls add to plan that we clearly mark files in comments that are just needed for this migration, so that we can pretty much ignore them afterwards.

Pls mark in the code with comment what is today Fisher-Yates.

Are there any questions that we should discuss before implementation? Please explain everything to me so that I can decide trade-offs if needed.

Please update md file as per [AGENTS.md](AGENTS.md) keep simplicity in mind.

Possible to also directly create the solvable games via command line.

6. Save history with solvable: true and solvableDrawMask.
-> is this redundant? because with the game id and the draw count, we could look this up. or is it easier to also just save it?

Do we really want to add difficulty already at this point? Can always be added later, no? And makes this step more complicated.

Should we just add all games from [solvable-shuffles.raw.ts](src/data/solvable-shuffles.raw.ts) to the new solvable list and do a one time migration where we find the new ids of these old games? Would this save us code for the legacy map?

In general, please advise: How much more complexity do we add by migrating the history? Because honestly, it's a solitaire game. the history is nice and all. but it's about playing the game. and if we just reset this for the few users that we have in order to save complexity in the future, this might be worth it.

What are options for generators? Which one should we choose? Implement in JS or library? Pls make sure to name them in code to better understand.

Should we add expo-crypto?Recommendation: yes, if getRandomValues is not already reliably available in the app runtime.
-> How do we do this today?

Should the v2 catalog target all draw counts or one catalog per draw count?Recommendation: one catalog with a draw mask per exact ID.
-> makes sense!

Should history migration rewrite old rows or enrich display lazily?Recommendation: enrich lazily first. Rewrite only if it becomes necessary.
-> real trade-off! I want to keep the code base maintainable in the future. Simplicity is key!

Should v2 random games use random exact IDs from platform random bytes?Recommendation: yes. It is simple and avoids permanent RNG contracts.
-> I think this is decided and alternatives make little sense, correct?
```

```text
For solvable: true plus solvableDrawMask: yes, partly redundant. Recommendation: keep solvable because history already uses it and it keeps queries simple. Store draw mask only as a cached history snapshot if we want history to remain stable even if the catalog changes. Do not make history do complex catalog lookups.


Recommendation: keep solvable because history already uses it and it keeps queries simple.
-> the current history sqllite was very recently introduced and this is not even in the app store yet, just on test device.
catalog will stay stable / we will only add to it. will never make sense to remove games.
Does this change things? or still just better to avoid to look up solvability of every single game in history list?


Is expo-cryltp really better than math random? why? not like this is sensitive random info. it literally decides which deck to play in a solitaire app, not encryption or otherwise sensitive stuff. any other advantages?


do we even need schema versioning?
because if we know the deck, we have perfect information about the deck. if we ever change the schema in the future, we can just add all info retroactively as well, no? benefit?


We cannot honestly recover the exact stock order that old users originally played, because it was not stored. -> just assuming the stock is fine. it's the tableau that matters for the game.


give an estimate over how much extra code / complexity if we keep history vs remove.


For v2 deal where drawMask includes the played draw count:"Solvable deal" -> this. keep simple.


Whether exact IDs are base64url, base36, or base58.
pls recommend
Whether the solvable catalog is TypeScript, JSON, binary asset, or SQLite.
pls recommend


which generator do you recommend? random in app generated games should have same id format as solvable games. again, explain what a generator does explicitly, vs what it doesn't do.


Would it make sense to have a phase 1 with everything working without legacy history? remember: players in app store still have old key value history (check git history).
then we could in phase 2 instead of migrating from key value to this history directly import history to new new format. new sqlite history is only on 1 device, my personal android test device (and the ios simulator on this macbook).


remove components section text. just say no UI changes. same for other sections if they don't make sense.
```

```text
e1 prefix:
today, we show name for games in history. this was at some point generated with a very cheap AI model but isn't very good. i think we can remove it or add a unique name in the future. what should we show here? A game id? what id? is the prefix here then maybe a bit ugly? should we just strip the prefix? recommendations? or easy way to add user readable unique thing? see [solvable-shuffles.raw.ts](src/data/solvable-shuffles.raw.ts)

- Do not store `solvable` or `solvableDrawMask` in new v2 history unless a later SQL query feature needs it.
-> every entry in the history list shows a label whether solvable or not. easy to still show this?

- Build an in-memory solvable lookup set from the bundled catalog, keyed by `exactId:drawCount`.
-> will we load catalog into memory? memory consumption an issue?
```

```text
I linked the LonelyBot folder. Please actually do run the 50K games for Draw 1 to 5, so we have solvable games. Put them into the right format. Right now we have ADB connected and I already ran Yarn release, so please also do a thorough testing on the phone. One thing I noticed is that the wording, according to the markdown file, wasn't changed yet, so kind of the data are generated to be solvable with Draw 1. Please also have a look at that. One thing I also noticed, when starting a new game, the history, it's not directly shown in the history. I think we fixed it, something like that recently. That may have come up again. Please have a look that when you start a new game, it kind of directly shows up as a game. And I was wondering, since we don't have, do I understand this right, we don't have any solvable games right now. Where did it actually take the solvable games from then if we didn't generate them yet? And I see that we're kind of using the legacy solvable games. Should that still happen right now? And I also see a... Oh no, no, that doesn't make sense. Kind of, why, please, why does it take that legacy games? I thought we're moving over completely to the new games. Yeah, please have a look at all of that. Do another round. Thank you very much.
```

```text
pls continue. check which subagents are still running, restart if needed.
why do we now have 45K games? we wanted 10k games and a note which ones are solvable by which draw mechanism, not 10k games per draw mode. or did we just check 50K games and checked them for each draw mode? so we have much more? which is actually nice and fine. what's the key, what does :15, :31, etc mean?
Also size at 2.5MB is fine.
when testing on device, make sure to delete the sql history once more to start clean.
Question: What's the mechanism how we show games in the history in the sheet? do we calculate the games from the seed? or do we save them in history?
make sure to not forget the wording changes. also check if everything else we discussed is done.
settings copy: i removed this change, i like the old wording better, it's more human and less technical
give me quick summary of solvability stats and whether they are in range.
Which games gave draw 2 unknown? according to docs, every game should lead to known, so this is interesting. I will separately rerun this.
wording in history tag: just solvable, not "solvable deal"
test.
next steps?
```

## Description

Define a concrete v2 deal identity and solvable-deal architecture for Soli. The proposal compares the current app behavior with a recommended future model that supports exact replay, draw-specific solvability, compact storage, and a clean history migration path.

Simplicity update: this proposal now favors a clean v2 path over heavy legacy compatibility. The SQLite history schema was introduced only on a personal Android test device and iOS simulator, so it should not drive the shipped migration design. App Store users still have the older key-value history, which can be reset or imported into the new format in a separate phase.

## Acceptance Criteria -> add more details than in the product document if it makes sense

- Explain the current random-game and solvable-game flows in the app.
- Propose what the app should store for every new game.
- Propose what the app should ship for curated solvable games.
- Define the runtime flow for random, solvable, history, and old-history follow-up work.
- Explain why exact deck identity should be separate from generation provenance.
- Compare storage size and complexity with the current tableau-only dataset.
- Keep the proposal adaptable: identify which choices are hard commitments and which are implementation details.
- Keep migration-only files explicitly marked so future work can ignore or delete them.
- Defer difficulty labels and in-app solving to later features.
- Explain why a separate per-deal `schemaVersion` field is not needed when the exact ID prefix already versions the decoder.
- Recommend exact ID encoding, catalog storage format, generator naming, and history policy.

## Design links

- N/A

## Source links

- Expo Crypto `getRandomValues`: https://docs.expo.dev/versions/latest/sdk/crypto/
- MDN `Math.random`: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
- MDN `Crypto.getRandomValues`: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues
- Rust `SmallRng` docs: https://docs.rs/rand/latest/rand/rngs/struct.SmallRng.html
- Fisher-Yates reference: https://extremelearning.com.au/fisher-yates-algorithm/
- PCG reference: https://www.pcg-random.org/index.html
- Lehmer code / permutation numbering: https://en.wikipedia.org/wiki/Lehmer_code
- Local Lonelybot exact implementation: `/Users/karim/kDrive/Code/Lonelybot/lonelybot/src/shuffler.rs`
- Expo Crypto guide for this feature: `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-expo-crypto-guide.md`

## Proposed decision in one sentence

Make every new game a full-deck game with a permanent exact deck identity, and treat solvability as metadata attached to that exact deck for Draw 1 through Draw 5.

Implementation update 2026-06-19: phase 1 now uses `exactId` as the only live game/history deal key. The pre-release SQLite history schema was reset to a fresh exact-ID database, and old key-value history should only return in a later best-effort import if it is converted into the new shape.

## Current App Model

### Random games today

Current code path:

- `createInitialState()` creates a fresh ordered deck.
- `shuffle()` uses `Math.random()` with Fisher-Yates.
- `computeShuffleId()` hashes the shuffled deck into a short display-ish ID.
- The app deals tableau and stock from that shuffled deck.

Important properties:

- The full board exists at runtime.
- The `shuffleId` is a hash, not a seed.
- We cannot reconstruct the deck from `shuffleId`.
- Two different decks could theoretically hash to the same ID.
- The generated random deck is not reproducible after the fact unless history/persistence saved enough board state.

### Solvable games today

Current code path:

- `src/data/solvable-shuffles.raw.ts` stores only tableau columns.
- `createSolvableGameState()` lays out those 28 tableau cards.
- The remaining 24 cards are shuffled at runtime into stock.
- The game is marked with `dealSolvabilityBasis: 'draw1'`.
- History records `solvableForDrawCount: 1`.

Important properties:

- The curated dataset is compact and human-readable.
- The full stock is not part of the guarantee.
- Draw 2-5 cannot be guaranteed.
- History has to say things like "Draw 1-solvable deal" even when the player used another draw count.
- Existing legacy entries cannot be exactly replayed as the original full deck.

## Recommended App Model

### Core principle

Use two separate concepts:

- **Exact deck identity**: the permanent way to reconstruct the exact 52-card deck.
- **Generation provenance**: optional information about how that deck was originally created.

The exact deck identity is the source of truth. Generation provenance is useful for debugging, but not required to replay the game.

### Recommended deal record

Conceptual shape:

```ts
type DealIdentityV2 = {
  exactId: string
  deckChecksum: string
  generator?: {
    name: 'crypto-random-exact-v1' | 'soli-pcg32-fy-v1' | 'legacy-tableau-upgrade'
    seed?: string
  }
  solvability?: {
    drawMask: number
    solver: 'lonelybot'
    solverVersion: string
    solvedAt: string
  }
  legacy?: {
    solvableBaseId?: string
    wasTableauOnly?: boolean
  }
}
```

`exactId` is the durable identity. It encodes the whole deck.

`deckChecksum` is a cheap guardrail. If a decoding bug or card-ordering mismatch appears, tests and runtime assertions can catch it.

`drawMask` encodes which draw counts are guaranteed. For example:

- bit 1 set: Draw 1 solvable.
- bit 2 set: Draw 2 solvable.
- bit 3 set: Draw 3 solvable.
- bit 4 set: Draw 4 solvable.
- bit 5 set: Draw 5 solvable.

### Do we need schema versioning?

Recommendation: no separate per-deal `schemaVersion` field.

The exact ID prefix should version the only thing that must be decoded: the card ordering and permutation encoding. Use `E1_...` for the first exact-ID format. If the decoder ever changes, introduce `E2_...`. Since the full deck is perfect information, future metadata can be added retroactively from the deck, the catalog, or solver output.

Storage and database migrations may still have their own internal versions. That is separate from deal identity.

### What exactId means

`exactId` should be a compact encoding of a number in `[0, 52! - 1]`.

That number maps one-to-one to a full 52-card permutation. This is permutation rank/unrank, also called Lehmer/factoradic encoding.

This should not be used as `0, 1, 2, ...` for generation. Sequential exact IDs are structured and non-random. Instead:

- For random games: sample an exact ID randomly.
- For curated games: store exact IDs that have already been solved by Lonelybot.
- For legacy upgrades: construct a compatible deck, then encode it as an exact ID.

## Recommended Runtime Flows

### Random game flow

1. Ask the platform for random bytes.
2. Convert bytes into a BigInt.
3. Reject and retry if the value is `>= 52!`, so the distribution stays uniform.
4. Encode that value as `exactId`.
5. Decode `exactId` into a 52-card deck.
6. Deal tableau and stock from the deck.
7. Save the game and history with `exactId`, `deckChecksum`, and the played `drawCount`.

Why this is good:

- No app RNG algorithm becomes a permanent contract.
- Every random game is exactly replayable.
- The exact ID is both the game code and the reconstruction source.
- We avoid `Math.random()` for deck generation.

Recommended dependency:

- Add `expo-crypto` and use `Crypto.getRandomValues` for random bytes because Expo supports Android, iOS, tvOS, and web.
- Today the app does not use `expo-crypto`; current deck shuffling uses `Math.random()`.
- This is not about hiding sensitive data. It gives us platform-provided entropy, avoids floating-point integer-range pitfalls, and pairs cleanly with rejection sampling for a uniform exact ID.

### Solvable game flow

Offline build-time flow:

1. Generate candidate exact IDs.
2. Decode each exact ID into a full deck.
3. Run Lonelybot for Draw 1-5.
4. Store exact ID plus draw mask and minimal solver provenance.
5. Publish a compact generated catalog in the app bundle.

Runtime flow:

1. User setting says "Only deal solvable games."
2. Read selected draw count, e.g. Draw 4.
3. Pick a catalog entry whose draw mask includes Draw 4.
4. Decode its exact ID into a full deck.
5. Deal tableau and stock from the deck.
6. Save history with `exactId`, `deckChecksum`, and the played `drawCount`.

Why this is good:

- The app no longer needs to say "Draw 1-solvable" for new curated deals.
- Stock is part of the deal for every draw count.
- The same exact ID can be solvable for Draw 1, 2, and 3 but not 4/5.

Do not add difficulty in this phase. The catalog generator can keep raw solver output in a local artifact, but the app should not ship or display difficulty until we intentionally design that feature.

### Existing history flow

Prefer a simple compatibility path over a perfect migration.

Phase 1 can work without legacy history because the current SQLite history has not shipped. Clear the personal test-device SQLite history during development if needed. Treat old app-store key-value history as a separate phase: either reset it or import it into the new format.

For existing random history:

- Phase 1 does not display old key-value history.
- If old key-value history is imported later, convert rows into the new exact-ID
  format at import time.
- Do not keep legacy display-only rows in the live history model.

For existing solvable history:

- Best simple option for phase 1: do not import old history yet. Store all new rows with v2 exact IDs.
- Phase 2 option: import old key-value history into the new format as display-only rows.
- Optional better-but-more-code option: map old `SOLVABLE:<baseId>:...` rows to a generated exact ID when a migration map exists.

The important distinction:

- We can give old tableau-only curated entries a good future identity.
- We do not need to recover the exact stock order that old users originally played. For old curated tableaus, assigning a compatible stock is fine because the tableau is the meaningful curated part.
- Resetting history is acceptable if we decide maintainability matters more than preserving a small amount of legacy user data.

Rough implementation cost:

- Phase 1 with no legacy history: about 0.5-1 day for cleanup and reset behavior.
- Phase 2 display-only import from old key-value history: about 1.5-3 days including migration tests and edge cases.
- Full legacy migration/enrichment with exact-ID mapping for old solvable rows: about 4-7 days and more long-lived compatibility code. Not recommended as the starting point.

### Legacy curated dataset migration flow

1. Parse each legacy tableau.
2. Keep the 28 tableau cards fixed.
3. Generate candidate stock orders from the remaining 24 cards.
4. Build full 52-card decks.
5. Encode each full deck as exact ID.
6. Solve with Lonelybot for Draw 1-5.
7. Pick the best candidate per legacy tableau.
8. Store a migration record:

```ts
type LegacySolvableDealMapEntry = {
  legacyId: string
  exactId: string
  drawMask: number
  chosenStockPolicy: 'first-all-draws' | 'best-mask' | 'draw1-only'
  solverVersion: string
}
```

This gives old named curated games a future-compatible identity without pretending we recovered the original seed.

Migration-only files must be marked with a top-level comment:

```ts
// Migration-only: this file exists to bridge the old tableau-only solvable dataset to v2 exact deals.
// New gameplay should not depend on this after the migration is complete.
```

This applies to generated legacy maps, one-time scripts, and any temporary compatibility helpers.

## What The App Should Store

### In GameState

For phase 1 games, keep the runtime shape exact-only:

```ts
exactId: string
deckChecksum: string
drawCount: DrawCount
```

`exactId` is both the history key and the replay recipe. Developer demo games
also use an exact ID generated from their hand-authored full deck. Do not keep
`dealId`, `solvableId`, or `dealSolvabilityBasis` in live state.

### In history

For new v2 history rows, store only the durable replay fields plus existing play stats:

```ts
exactId: string
deckChecksum: string
drawCount: DrawCount
```

Keep existing fields:

- `displayName`
- `preview`
- `solved`
- `moves`
- `durationMs`

The native SQLite schema uses `exact_id` as the deal key. Previous SQLite
history schemas were test-only, so phase 1 can start a fresh database file
instead of carrying identity-column migrations.

History preview remains valuable because it makes history fast and resilient even if later deal decoding changes.

Do not store `solvableDrawMask` in new v2 history. Also do not keep `solvable` only because the unshipped SQLite history briefly used it.

Why this changes from the earlier recommendation:

- The SQLite history schema has not shipped.
- The solvable catalog is append-only, so historical solvable rows will not become unsolvable by catalog removal.
- A history list does not need a complex catalog lookup. Build a lazy in-memory `Map` once, keyed by `exactId` with `drawMask` as the value, and do one cheap bit check per displayed row.
- If a future feature needs to query/filter history by solvability at the SQL layer, add a denormalized flag then. Do not add it preemptively.

### In the bundled solvable catalog

Avoid shipping 50K JSON tableaus.

Recommended compact catalog:

```ts
type SolvableDealCatalogEntry = {
  exactId: string
  drawMask: number
}
```

Recommended storage format: generated TypeScript module, for example `src/data/solvableDealsV2.generated.ts`.

```ts
export const SOLVABLE_DEALS_V2 = ['E1_abc123:31', 'E1_def456:7'] as const
```

Why TypeScript:

- It imports synchronously like the current dataset.
- It avoids adding SQLite or asset-loading logic for static bundled data.
- It keeps the first implementation easy to inspect and test.
- We can later switch the generated representation to binary if bundle size becomes a real problem.

Use a lazy lookup helper instead of expanding all draw counts into separate strings:

```ts
let solvableDealMaskByExactId: ReadonlyMap<string, number> | null = null

export function getSolvableDealMaskByExactId(): ReadonlyMap<string, number> {
  if (!solvableDealMaskByExactId) {
    solvableDealMaskByExactId = new Map(
      SOLVABLE_DEALS_V2.map((row) => {
        const [exactId, mask] = row.split(':')
        return [exactId, Number(mask)]
      })
    )
  }
  return solvableDealMaskByExactId
}
```

A 52-card exact ID needs about 226 bits, so about 29 bytes in binary, around 38 base64url characters, or around 44 base36 characters. With a 1-byte draw mask, 50K entries are roughly:

- about 1.5 MB as compact binary,
- around 2-5 MB as minified string/JSON/module data, depending on encoding and overhead,
- much smaller than storing full tableaus plus stock as verbose objects.

This is comfortably better than a 30 MB tableau/stock bundle.

Memory recommendation: loading 50K exact IDs into a TypeScript array plus one lazy `Map<string, number>` should be acceptable on native devices, but measure it during implementation. Do not build an expanded `Set` of `exactId:drawCount` keys because that can multiply entries up to five times. If the catalog grows far beyond the first target size, revisit binary or sorted-array storage with benchmarks.

### Exact ID string encoding

Recommendation: use base36 with an `E1_` prefix.

Example:

```text
E1_2s5n0p4x...
```

Why base36:

- It uses built-in `BigInt.toString(36)` for encoding.
- It is URL-safe, filename-safe, lower-case, and easy enough to read or type.
- It avoids base64url's mixed punctuation/encoding details.
- It avoids base58's custom alphabet and library/code overhead.
- The length cost is acceptable: roughly 44 base36 characters for the permutation payload instead of roughly 38 base64url characters.

Implementation note: JavaScript does not have `BigInt(value, 36)` parsing. Add a tiny explicit base36-to-`BigInt` parser and fixture-test it.

## UI / Copy Proposal

### Settings

Current:

- "Only deal solvable games"
- "Deals are generated to be solvable with Draw 1..."

Future:

- Keep "Only deal solvable games."
- Keep the existing human helper copy: "Use curated solvable layouts when starting a new game."

### History badges

Current:

- "Solvable for Draw X"
- "Draw 1-solvable deal"

Future:

- For v2 deal where the catalog `drawMask` includes the played draw count: "Solvable"
- For v2 random deals not present in the catalog: no solvable badge. Do not show "Unsolvable" because absence from the catalog does not prove the game is unwinnable.

Recommendation:

- Use exactly "Solvable" for normal v2 entries.
- Keep the draw count in a separate badge: "Draw 4."
- Do not add legacy/draw-specific caveats unless we choose a phase 2 legacy import that needs them.

### History titles

Current solvable history titles use generated names from `solvable-shuffles.raw.ts`, for example `ace-ready` and duplicated names like `aces-exposed`. These are not worth preserving for v2.

Recommendation:

- Store the full `exactId` as the canonical identity.
- Show a short derived display code as the history title, for example `Deal 9X4M-T2QK`.
- Strip the `E1_` prefix in the main UI. The prefix is for parsers, debug views, share links, and copy/paste, not for the primary history title.
- Generate the display code from the base36 payload, e.g. take the last 8 characters after `E1_`, uppercase them, and group as `4-4`.
- If a local history collision ever occurs, extend that one title to 12 characters or show the full exact ID in the detail sheet.
- Do not store generated prose names. If we later add friendly names, make them optional presentation metadata, not identity.

## What Stays Flexible

Hard commitments:

- Store an exact full-deck identity for every new game.
- Store stock as part of the deal, not as runtime randomness.
- Store draw-specific solvability for curated deals.
- Keep the catalog append-only.
- Do not optimize the new design around unshipped SQLite history.

Recommended defaults:

- Exact ID strings use base36 with an `E1_` prefix.
- The solvable catalog ships as a generated TypeScript module.
- Phase 1 does not import legacy history.

Flexible implementation choices:

- Whether old app-store key-value history is reset or imported as display-only rows in phase 2.
- Whether in-app hint solving ships later.

## Generator Recommendation

A generator chooses candidate decks. It does not define the permanent identity, prove solvability, or replace the catalog. After a deck is chosen, the app encodes it as an exact ID; after a deck is solved offline, the catalog records which draw counts are solvable.

Best immediate approach:

- Random games: sample random exact IDs with Expo Crypto. This is effectively decided; alternatives add more moving parts without clear upside.
- Curated catalog generation: use a command-line script to generate candidate exact IDs and solve them offline.
- Do not use `Math.random()` for new decks.
- Do not use Rust `SmallRng` as durable identity because its docs call it non-portable.

If we need a named deterministic generator for reproducible batches:

- Define `soli-pcg32-fy-v1`.
- Use PCG32 as the PRNG.
- Use Fisher-Yates with rejection sampling for unbiased bounded integers.
- Immediately encode the generated deck as exact ID and store exact ID as canonical.

The deterministic generator is then just provenance. The exact ID remains the truth.

Generator options:

- `crypto-random-exact-v1`:
  - Input: platform random bytes.
  - Output: random exact ID in the same `E1_` format used by solvable deals.
  - Recommended for app gameplay and random catalog candidates.
- `soli-pcg32-fy-v1`:
  - Input: integer seed.
  - Output: deck via PCG32 plus Fisher-Yates.
  - Useful for reproducible command-line batches, not needed for runtime identity.
- `lonelybot-default`:
  - Input: Lonelybot/Rust seed.
  - Output: deck via Rust `SmallRng`.
  - Do not use as app identity because `SmallRng` is not a stable public format.
- `lonelybot-exact`:
  - Input: exact permutation number.
  - Output: deck.
  - Use as fixture/oracle format and align our `exactId` with it.

## Suggested Phased Plan

### Phase 1: Identity core

- Build the new v2 path without legacy history import.
- Add exact encode/decode in TypeScript with fixture tests against Lonelybot.
- Use base36 `E1_` exact IDs.
- Add deck checksum.
- Add `expo-crypto` and generate random games from random exact IDs.
- Add the v2 solvable catalog generator command and generated TypeScript catalog.
- Change solvable-game selection to use the v2 catalog.
- Reset or ignore unshipped SQLite history on test devices and simulators.

### Phase 2: App-store history policy

- Decide whether old key-value history should be reset or imported as display-only rows.
- If importing, write a one-time migration from the old key-value shape into the new history shape.
- Keep imported old random rows display-only unless they have enough stored state to reconstruct exact IDs honestly.

### Phase 3: Legacy curated tableaus

- One-time import all valid existing `solvable-shuffles.raw.ts` tableaus into the new catalog by finding a compatible stock order and exact ID.
- Mark all migration-only scripts/maps with top-level comments.

### Phase 4: Optional future features

- In-app Rust solver for hints.
- Shareable exact deal links.
- Daily challenge seed ranges.
- Difficulty labels and filters, only after we intentionally design that product surface.

## Possible approaches incl. pros and cons

### Recommended: exact identity plus offline solvable catalog

Pros:

- Exact replay for every new game.
- Compact storage.
- No dependency on library RNG behavior.
- Clean draw 1-5 solvability.
- Sets up hints/share/challenges later.

Cons:

- Requires a storage migration for any shipped history we choose to preserve.
- Requires exact encode/decode implementation and fixtures.
- Requires generated catalog tooling.

### Simpler: keep current random games, only replace solvable catalog

Pros:

- Less app-wide change.
- Solvable mode gets draw-specific guarantees.

Cons:

- Random-game history remains non-reconstructable.
- App keeps two identity systems.
- Shareable/random seed features remain awkward.

### Heavier: ship Lonelybot in the app immediately

Pros:

- Enables hints and current-position solving.
- Can validate arbitrary generated deals on-device.

Cons:

- Native build complexity.
- Not needed for the dataset and history improvement.

Recommendation: keep this for later.

### Simplest history policy: reset old history

Pros:

- Least code.
- No long-lived legacy display paths.
- Avoids mixing old `shuffleId` semantics with v2 exact IDs.

Cons:

- Existing users lose history.
- We lose some continuity for the small set of people who care.

Recommendation: acceptable if we want maximum maintainability. If we do this, show no special migration UI; just start fresh after the schema change.

### Middle history policy: import old key-value rows as display-only history

Pros:

- Keeps visible history.
- Avoids pretending old rows have exact IDs when they do not.
- Smaller than full migration.

Cons:

- Adds one migration-only importer and tests.
- Old entries still are not exact-replayable.

Recommendation: acceptable as phase 2 if we care about preserving user trust without carrying a heavy migration.

### Full history migration/enrichment

Pros:

- Nicest story for legacy solvable rows.
- Could map old named tableaus into v2 deals.

Cons:

- Most code.
- Still cannot recover original random-game stock/deck identity.
- Migration-only code can hang around and confuse future work unless aggressively marked and removed.

Recommendation: do not start here.

## Open questions to the user incl. recommendations (if any)

Settled recommendations:

- V2 random games use platform random bytes to sample exact IDs.
- Add `expo-crypto`; pre-phase-1 gameplay used `Math.random()`.
- Use base36 exact IDs with an `E1_` prefix.
- Ship one append-only generated TypeScript catalog with a draw mask per exact ID.
- Do not store `solvable` or `solvableDrawMask` in new v2 history unless a later SQL query feature needs it.
- History titles use short exact-ID-derived codes, not generated prose names.
- Do not add difficulty labels in this phase.
- Do not use the old curated tableaus at runtime in phase 1; generate exact v2 catalog rows with Lonelybot instead.

Only product decision still worth making:

- Old app-store key-value history: reset it for maximum simplicity, or import it as display-only rows in phase 2. Recommendation: phase 1 without legacy history first; then choose reset vs display-only import after the v2 path is working.

## New dependencies

- Proposed app dependency: `expo-crypto`.
- Dev/tool dependency: Lonelybot checkout or vendored tooling path for catalog generation.
- Fresh package guide: `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-expo-crypto-guide.md`

## UX/UI Considerations

- No UI layout or component changes.
- Keep the settings helper copy human-readable and avoid draw-count caveats there.
- Keep history language plain: "Deal 9X4M-T2QK", "Draw 4", "Solvable", "92 moves."

## Components -> Which components to reuse, which components to create?

No new UI components. No component or layout changes.

## How to fetch data, how to cache

- Bundle the solvable catalog as generated app data.
- Keep history preview as cached display data.
- Build a lazy in-memory solvable lookup map from the bundled catalog, keyed by `exactId` with `drawMask` as the value.
- Cache per-deal play stats by exact ID, not by old solvable base ID.
- If old history is imported in phase 2, keep any compatibility code migration-only and clearly commented.

## Related tasks

- `docs/product/solvable-harvest-strategy/rethink-solvable-harvesting.md`
- `docs/product/solvable-harvest-strategy/seed-recovery-and-generator-selection.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-expo-crypto-guide.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-lonelybot-guide.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-rust-mobile-guide.md`

## Steps to implement and status of these steps

1. **Completed**: Compare current app random/solvable/history model.
2. **Completed**: Refresh source references for randomness, exact identity, and generator choices.
3. **Completed**: Write this concrete best-practice proposal.
4. **Completed**: Updated proposal to remove the stale Draw 1 settings caveat, keep the human settings helper copy, defer difficulty, and prefer simple history policy.
5. **Completed**: Documented current `Math.random()` Fisher-Yates code path and `expo-crypto` gap.
6. **Completed**: Recommended base36 `E1_` exact ID strings.
7. **Completed**: Recommended phase 1 without legacy history import, with reset vs display-only import deferred to phase 2.
8. **Completed**: Add `expo-crypto`.
9. **Completed**: Implement exact encode/decode with fixture tests.
10. **Completed**: Add v2 deal identity fields to game state and history.
11. **Completed**: Build offline v2 solvable catalog generator command with exact-stock validation.
12. **Completed**: Wire solvable mode to the verified v2 catalog only; no runtime legacy solvable fallback.
13. **Completed**: Produce a 50,000-seed Draw 1-5 v2 catalog with Lonelybot.
14. **Completed**: Run verification after catalog and code changes.
15. **Completed**: Phase 1 polish review for small simplifications and tighter validation.

## Plan: Files to modify

- `docs/product/solvable-harvest-strategy/best-practice-deal-identity-proposal.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-expo-crypto-guide.md`
- Future implementation:
  - `src/solitaire/dealIdentity.ts`
  - `src/solitaire/klondike.ts`
  - `src/data/solvableDealsV2.ts`
  - `src/features/klondike/hooks/useSolvableDealSelector.ts`
  - `src/state/history.tsx`
  - `src/storage/historyRepository.native.ts`
  - `src/storage/historyRepository.web.ts`
  - `app/history.tsx`
  - `app/settings.tsx`
  - `scripts/solver-adapters/lonelybot.js`
  - `scripts/generate-solvable-deals-v2.js`
  - tests for exact identity, state creation, selector, and history migration
  - `/Users/karim/kDrive/Code/Lonelybot/lonelybot/lonecli/src/main.rs`
  - `/Users/karim/kDrive/Code/Lonelybot/lonelybot/lonecli/src/solver.rs`

## Files actually modified

- `docs/product/solvable-harvest-strategy/best-practice-deal-identity-proposal.md`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-expo-crypto-guide.md`
- `src/solitaire/klondike.ts`
- `src/solitaire/dealIdentity.ts`
- `src/data/solvableDealsV2.ts`
- `src/data/solvableDealsV2.generated.ts`
- `src/features/klondike/hooks/useSolvableDealSelector.ts`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/state/history.tsx`
- `src/storage/gamePersistence.ts`
- `src/storage/historyRepository.native.ts`
- `app/history.tsx`
- `components/settings/DrawCountSelector.tsx`
- `scripts/generate-solvable-deals-v2.js`
- `run-android-release.sh`
- `docs/product/solvable-harvest-strategy/solvable-harvest-strategy-lonelybot-guide.md`
- `/Users/karim/kDrive/Code/Lonelybot/lonelybot/lonecli/src/main.rs`
- `/Users/karim/kDrive/Code/Lonelybot/lonelybot/lonecli/src/solver.rs`
- `scripts/klondike-solver-new.js`
- `test/setup/mock-expo-winter.ts`
- `test/unit/solitaire/dealIdentity.test.ts`
- `test/unit/solitaire/klondike.drawCount.test.ts`
- `test/unit/state/history.drawCount.test.ts`
- `test/unit/state/history.pagination.test.ts`
- `test/unit/state/history.startedEntry.test.ts`
- `test/unit/state/solvableShuffleSelector.test.ts`
- `package.json`
- `yarn.lock`

## Identified issues and status of these issues

- Current random `shuffleId` is a non-reversible hash.
  - Status: documented; v2 exact ID fixes this.
- Current solvable dataset lacks stock order.
  - Status: documented; v2 stores full-deck identity.
- Current solvable copy is tied to Draw 1.
  - Status: documented; v2 draw masks fix this.
- Current history cannot exactly replay old random games.
  - Status: documented; phase 1 can ship without legacy history import, with reset vs display-only import deferred.
- Settings still had a stale Draw 1 solvability caveat after v2 deals became draw-count aware.
  - Status: stale caveat removed; existing human helper copy retained.
- Difficulty adds product and data-model complexity.
  - Status: deferred.
- Storing `solvable`/`solvableDrawMask` in new history would duplicate an append-only catalog.
  - Status: documented; derive the v2 history badge from an in-memory catalog lookup map.
- Current generated solvable names are weak and duplicated.
  - Status: documented; v2 history titles should use short exact-ID-derived deal codes.
- Legacy tableaus plus deterministic stock are not automatically exact-stock-solvable.
  - Status: legacy fallback removed from new gameplay; Lonelybot now generates exact v2 rows directly.

## Testing

- Code comment added to mark the current Fisher-Yates shuffle.
- Current implementation checks:
  - Lonelybot one-seed fixture: generated `E1_...` decoded back to the exact seed-0 tableau plus stock order.
  - 50,000-seed Draw 1-5 Lonelybot harvest completed and merged.
  - Generated catalog rows: 45,258 exact deals.
  - Draw-count availability: Draw 1 = 45,258, Draw 2 = 44,367, Draw 3 = 41,050, Draw 4 = 34,849, Draw 5 = 26,785.
- Phase 1 implementation checks:
  - `yarn oxfmt --check ...`: passed.
  - `git diff --check`: passed.
  - `yarn typecheck`: passed.
  - `yarn lint`: passed.
  - `yarn jest --runInBand`: passed, 10 suites and 53 tests.
  - `yarn release`: passed and installed `app-release.apk` on Android device `192.168.1.12:38811`, package `lastUpdateTime=2026-06-18 20:43:54`.
  - Android clean-state QA: ran `adb shell pm clear ch.karimattia.soli` before launch, opened the installed app directly, verified settings wording, Draw 5 selection, solvable-only new deal, immediate active history row, and history preview sheet badges.
  - Phase 1 polish checks after selector/validation cleanup: `yarn typecheck`, `yarn lint`, and `yarn jest --runInBand` passed, now 10 suites and 54 tests.
  - Final Android polish build: `yarn release` passed and installed `app-release.apk`, package `lastUpdateTime=2026-06-18 21:24:59`; direct package launch rendered the game board.
- Follow-up testing:
  - Fixture-test exact encode/decode against Lonelybot `exact`.
  - Generate 1,000 random exact IDs and assert all decode to valid 52-card decks.
  - Create v2 random and solvable game states for Draw 1-5.
  - Verify history stores exact ID and derives "Solvable" from the catalog lookup map.
  - Verify history display codes strip `E1_`, remain stable, and extend when a local collision is detected.
  - Verify old key-value history reset or display-only import after that phase is chosen.
  - Run iOS simulator build/QA when an iOS simulator is available for this feature pass.
