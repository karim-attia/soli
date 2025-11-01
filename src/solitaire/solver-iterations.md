# Intro

Let's experiment with solver improvements.
For every improvement, add a new iteration with description and run solver and add results.
Run with `node scripts/solve-klondike.js` command.
Add interpration of the results.

# Solver process steps

- **Input & setup**
  - Script parses args; for `--strategy=atomic` it runs one trial per deck with the atomic solver, passing options like `maxNodes`, `maxTimeMs`, `avoidEmptyUnlessKing`, `enableBackjump`, `maxApproachSteps`, `maxApproachStepsHigh`, `rankingStrategy`.
  - Build initial game `state` from `deckOrder`; set `flipsDepth=0`, `nodes=0`, `deadline`.

- **Immediate win check**
  - If all tableau cards are face-up, greedily move to foundations; if win, return solved.

- **Normalize to an atomic position**
  - Run safe auto-moves to foundations without causing flips:
    - Stock → foundation when “safe.”
    - Tableau top → foundation only if it does not flip a face-down beneath.
  - This normalized snapshot is the current “atomic position.”

- **Duplicate atomic detection**
  - Hash atomic state (Zobrist). If the same atomic state was already seen at an equal-or-smaller `flipsDepth`, skip expanding it (treated as a dead-end for this path).

- **Find “approaches” to the next flip (BFS)**
  - From the atomic snapshot, run a breadth-first search limited by `maxApproachSteps`, `maxLocalNodes`, and `deadline` to find all shortest paths that produce the next face-down flip.
  - Move gating and preferences:
    - Phase 1: only foundation-up moves (`t2f`, `stock2f`).
    - Phase 2: allow foundation-down/stock-to-tableau (`f2t`, `stock2t`) but no tableau shuffles.
    - Phase 3: full move set; defer emptying a column unless it’s king-to-empty when `avoidEmptyUnlessKing` is true.
  - Deduplicate first-hit flip results; record each candidate as `{steps, path, state, stockUses, f2tUses}`.
  - If `flipsDepth` ≥ `relaxAtDepth`, the step cap is relaxed up to `maxApproachStepsHigh` (with increments).

- **Rank approaches and select next**
  - Rank per `rankingStrategy`:
    - `blended` (default): prefer flipping a card that had the most covered cards above it pre-flip, then fewer steps, fewer stock moves, fewer foundation-down moves, fewer tableau columns touched.
    - `mostCovered`: most covered then fewer steps.
    - `leastSteps`: fewest steps; ties by fewer facedowns after, more foundations, more empty columns.
  - Push an atomic “frame” onto a stack: `{snapshot, candidates(sorted), idx=0, changedCols}`.

- **Apply approach and advance**
  - While time/nodes remain:
    - If the top frame has untried candidates:
      - Rebuild `state` from frame `snapshot`.
      - Apply the next candidate `path`; increment `nodes` by path length; increment `flipsDepth`.
      - If now auto-complete is possible and succeeds, or all 52 are on foundations, return solved.
      - Normalize to the new atomic position (as above) and check duplicate atomic; if duplicate, restore and try the next candidate.
      - Otherwise compute the next atomic frame (BFS, rank) and push it, recording `changedCols` from the path for backjumping.
    - If the top frame is exhausted (all candidates tried), it’s a dead-end:
      - With `enableBackjump`: compute currently blocked columns (any column still with facedowns) and jump to the most recent ancestor whose `changedCols` intersects that set; restore that ancestor’s `snapshot`.
      - Otherwise: pop one frame (simple backtrack).

- **Dead-end definitions implemented**
  - No candidates found by BFS for a frame (increment `atomicDead`) → dead-end.
  - All candidates at a frame tried → dead-end.
  - Encountered an atomic state already seen at an equal-or-smaller depth → skip expansion (dead-end for this path).
  - Global cutoffs: exceeded `maxTimeMs` or `maxNodes` → stop with unsolved and cutoff reason.
  - Note: The solver does not compute “needed ranks” (e.g., “need a black 8 for a red 7 blocker”); instead it backjumps to the nearest ancestor likely to affect currently blocked columns using the `changedCols` heuristic.

- **Caching and reuse**
  - Per-frame: keeps a sorted `candidates` list and an index so already-tried approaches aren’t retried at that frame.
  - Across frames: stores only a “seen atomic” set keyed by Zobrist with best depth; it does not globally cache or reuse saved approach lists for atomic states.

- **Stop conditions and outcomes**
  - Solved: greedy finish or all cards in foundations.
  - Unsolved with reason: time cutoff, node cutoff, or full search exhaustion (not a formal proof of unsolvability).

- **Option knobs (most relevant)**
  - `maxNodes`, `maxTimeMs`
  - `avoidEmptyUnlessKing` (prefer not to empty unless king-to-empty)
  - `enableBackjump` (enable dead-end backjumping)
  - `maxApproachSteps`, `maxApproachStepsHigh`, `relaxAtDepth` (relax BFS depth at deeper flip layers)
  - `rankingStrategy`: `blended` | `mostCovered` | `leastSteps`

Note on differences from the example: the implementation does not save and reuse approaches per atomic state; duplicates are skipped rather than reusing precomputed approach lists.

- Net: normalize → BFS to next flip → rank → apply → dedupe → repeat; backjump on dead-ends; stop on win or cutoffs/exhaustion.

# Iterations

## Iteration 1 (Baseline)

Description: Run the solver with the default options.

Results:

  ✅ Solved: 21/50 (42%)

## Iteration 2 (Reuse approaches per atomic state)

Description: Save and reuse approach lists per atomic state keyed by Zobrist. On re-encountering the same atomic snapshot, reuse its ranked candidates and skip those already tried globally; if none remain, treat as a dead end. Avoids recomputing BFS and allows continuing exploration from repeated atomic positions instead of skipping them.

Results (50 trials, strategy=atomic):

  ✅ Solved: 12/50 (24%)
  Avg nodes: 1009059
  Avg time: 3794ms
  Cutoffs: time=35, nodes=0
  Notes: Reuse reduced recomputation but also explored more branches from repeated atomic states, increasing average nodes and lowering solve rate under the same time budget.

## Iteration 3 (Needed ranks heuristic)

Description: Add optional tie-breaker `useNeededRanks` that, for each blocked column, computes the frontier card (first face-up above the topmost facedown) and prefers candidates whose resulting tops satisfy the needed target (opposite color, +1 rank; or any empty column if frontier is a king). Weighted by count of facedowns in that column.

Results (50 trials, strategy=atomic, useNeededRanks=true):

  ✅ Solved: 11/50 (22%)
  Avg nodes: 1097437
  Avg time: 3953ms
  Cutoffs: time=36, nodes=0
  Interpretation: The heuristic biases exploration toward unblocking large columns but increases branching, slightly lowering solve rate under the same 5s budget. It may combine better with stricter `maxApproachSteps` or a higher `relaxAtDepth` threshold to focus on impactful flips without inflating local search.