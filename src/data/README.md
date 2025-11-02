# Solvable Shuffle Dataset

This directory stores curated Klondike tableau layouts that are known to be solvable. Each entry is defined in `solvable-shuffles.raw.ts` and is consumed by gameplay features introduced in PBI 11.

## File structure

- `solvable-shuffles.raw.ts` — canonical dataset containing solvable tableau configurations as a human-readable string.
- Future helpers (e.g., validation utilities) live alongside this file.

## File format

Entries are stored as plain-text blocks separated by `---`. Each block begins with metadata, followed by seven column definitions:

```
id=harvested-20251102-00062 addedAt=2025-11-02 source=new-solver
1: | H2
2: C1 | D4
3: S7 C11 | C9
4: H8 S8 HJ | C6
5: D4 H3 DT SJ | CK
6: ...
7: ...
---
```

- `id` — unique identifier for the solvable shuffle (e.g. `harvested-YYYYMMDD-#####`).
- `addedAt` — ISO-8601 date (`YYYY-MM-DD`).
- `source` — optional free-form tag describing how the shuffle was obtained.
- Column lines encode facedown cards on the left of `|` and face-up cards on the right. Cards are expressed using a single-letter suit (`C`, `D`, `H`, `S`) and rank (`A`, `2`–`9`, `T`, `J`, `Q`, `K`).
  - Example: `S7 C11 | C9` translates to facedown cards `S7`, `C11` and top card `C9`.

> The dataset intentionally excludes stock information. The stock is randomized at runtime while the tableau layout is loaded from this file.

## Authoring guidelines

1. Run the solver tooling or play through candidate shuffles to confirm they are solvable.
2. Capture the tableau layout immediately after the initial deal.
3. Ensure no card is duplicated or omitted across the seven columns (28 cards total per entry).
4. Append a new block to `solvable-shuffles.raw.ts`, preserving the column ordering and card encoding.
5. Update `addedAt` to the date of inclusion and describe the `source`.
6. Re-run `yarn test --watch=false` to execute dataset validation (see `src/data/solvableShuffles.ts`).

## Validation

`src/data/solvableShuffles.ts` performs runtime validation in development builds to ensure:

- Card suits/ranks are valid.
- Each column has the expected number of facedown/face-up cards.
- Cards are unique across the tableau.

If validation fails, an error is thrown during import, preventing incorrect datasets from reaching production.

