# Solvable Shuffle Dataset

This directory stores curated Klondike tableau layouts that are known to be solvable. Each entry is defined in `solvable-shuffles.json` and is consumed by gameplay features introduced in PBI 11.

## File structure

- `solvable-shuffles.json` — canonical dataset containing solvable tableau configurations.
- Future helpers (e.g., validation utilities) live alongside this file.

## JSON schema

```json
{
  "version": 1,
  "shuffles": [
    {
      "id": "solvable-0001",
      "addedAt": "2025-11-02",
      "source": "manual-curation",
      "tableau": [
        {
          "down": [{ "suit": "hearts", "rank": 5 }],
          "up": [{ "suit": "clubs", "rank": 9 }]
        }
      ]
    }
  ]
}
```

- `version` — increment when the schema changes.
- `id` — unique identifier for the solvable shuffle. Use a prefix like `solvable-XXXX` to keep ordering predictable.
- `addedAt` — ISO-8601 date the shuffle was recorded (`YYYY-MM-DD`).
- `source` — optional free-form string describing how the shuffle was obtained (solver, manual curation, crowdsourced, etc.).
- `tableau` — array of seven columns (index 0–6). Column `n` must contain `n` facedown cards plus one face-up card.
  - `down` — array of facedown cards ordered bottom-to-top (first entry is closest to the tableau base).
  - `up` — array of face-up cards ordered bottom-to-top. The initial Klondike deal only exposes the top card, so most entries contain a single value.

Card objects include:

- `suit` — one of `"clubs"`, `"diamonds"`, `"hearts"`, or `"spades"`.
- `rank` — integer 1 (Ace) through 13 (King).

> The dataset intentionally excludes stock information. The stock is randomized at runtime while the tableau layout is loaded from this file.

## Authoring guidelines

1. Run the solver tooling or play through candidate shuffles to confirm they are solvable.
2. Capture the tableau layout immediately after the initial deal.
3. Ensure no card is duplicated or omitted across the seven columns (28 cards total per entry).
4. Append the new shuffle to the `shuffles` array, keeping the `id` sequence ascending.
5. Update `addedAt` to the date of inclusion and describe the `source`.
6. Re-run `yarn test --watch=false` to execute dataset validation (see `src/data/solvableShuffles.ts`).

## Validation

`src/data/solvableShuffles.ts` performs runtime validation in development builds to ensure:

- Card suits/ranks are valid.
- Each column has the expected number of facedown/face-up cards.
- Cards are unique across the tableau.

If validation fails, an error is thrown during import, preventing incorrect datasets from reaching production.

