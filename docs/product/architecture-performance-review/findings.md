# Architecture & Performance Review — Findings Register

- **Review date:** 2026-07-05 (codebase at ~v0.8.0, Expo SDK 57 / RN 0.86 / React 19.2)
- **Produced by:** full-codebase review (game core, hooks, components, state/storage, routes). Cheap checks at review time: typecheck ✅, lint ✅, jest 56/56 ✅.
- **Purpose:** single tracking document for all findings. Each open finding is written to be self-contained so a fresh implementation thread (or a thread after context compaction) can pick it up without re-reading the original review chat.

## How to use this document

1. Pick a finding from the status board (suggested order at the bottom).
2. Create/reuse an implementation plan under `docs/product/<feature>/` per AGENTS.md; link it in the finding's **Plan/doc** column here.
3. When a finding is resolved, flip its status here and add a one-line pointer to where the fix lives. Keep the detail section (history is useful), but prefix it with "RESOLVED".

## Status board

| ID | Finding | Area | Severity | Status | Plan/doc |
|----|---------|------|----------|--------|----------|
| P1 | BigInt validation of 45k catalog rows at first access | Perf/startup | High | ✅ Resolved | `docs/product/generated-data-startup-cost/generated-data-startup-cost.md` |
| P2 | `TIMER_TICK` dispatches through the reducer every second | Perf/simplification | ~~Medium-high~~ → Low (after P3+A2) | Open | — |
| P3 | `AbsoluteLayerCard` memoization defeated (all ~52 cards re-render per action) | Perf/render | Medium | ✅ Resolved | `docs/product/klondike-render-memoization/klondike-render-memoization.md` |
| P4 | Persisted game payload grows unboundedly with game length | Perf/robustness | Medium (rare, real failure) | Open | — |
| P5 | 3.1 MB generated TS bundled eagerly (catalog + dev-only demo playlist) | Perf/bundle | Low | ✅ Resolved / accepted | `docs/product/generated-data-startup-cost/generated-data-startup-cost.md` |
| A1 | `useKlondikeGame` is a ~1,200-line god hook | Architecture | Medium | ✅ Implemented (history-entry extraction; 1,266 → 1,028 lines) | `docs/product/history-entry-hook-extraction/use-klondike-history-entry-proposal.md` |
| A2 | Whole-`GameState` prop threading defeats memoization structurally | Architecture/perf | Medium | ✅ Resolved | `docs/product/klondike-render-memoization/klondike-render-memoization.md` |
| A3 | Two animation systems coexist (RN Animated + Reanimated) | Architecture | Accepted for now | Open (policy) | — |
| A4 | `NEW_GAME` makes the reducer impure (crypto randomness inside reducer) | Architecture/correctness | Low | Open | — |
| H1 | Dev/template screens ship as production routes (`feature-graphic`, `modal`) | Hygiene | Medium | Open | — |
| H2 | `jest-expo` / `babel-preset-expo` in `dependencies` | Hygiene | Low | ✅ Resolved | commit `2d60158 devdep` |
| H3 | `saveGameState` export only used by tests | Hygiene | Low | Open | — |
| H4 | About screen lives at route name `hello` | Hygiene/cosmetic | Low | Open | — |
| H5 | `react-native-web` / `react-dom` shipped though app is native-only | Hygiene | Accepted | Open (decision) | — |
| R1 | Persisted-game validation is shallow (nested cards unvalidated) | Robustness | Low | Open | — |
| R2 | "One active history row" invariant enforced in three places | Robustness (watch item) | Info | Open (watch) | — |
| R3 | `recordCurrentGameResult` fallback searches only the loaded history page | Robustness | Theoretical | ✅ Fixed (with A1) | `docs/product/history-entry-hook-extraction/use-klondike-history-entry-proposal.md` |
| R4 | No accessibility labels/roles on cards | Product gap | Medium (vision-level) | Open | — |
| T1 | Test coverage was pure-logic only | Testing | — | ✅ Improved | `docs/product/klondike-move-validation-tests/`, `test/unit/solitaire/klondike.identity.test.ts`, `test/unit/data/solvableDealsV2.generated.test.ts` |

## Open findings (detail)

### P2 — `TIMER_TICK` dispatches through the reducer every second

**Severity: Low** (downgraded — was Medium-high before P3+A2 landed; board components no longer re-render on ticks. The remaining win is mostly code simplification.)

- **Problem:** While the timer runs, `useKlondikeTimer` dispatches `TIMER_TICK` every 1000 ms (`TIMER_TICK_INTERVAL_MS` in `src/utils/time.ts`). Each tick creates a new `GameState`, re-runs `useKlondikeGame`, and rebuilds `statisticsRows`/`viewProps` — for a clock that only the HUD displays. Board components are now memoized (P3/A2), so the per-tick cost is small, but the reducer round-trip is still unnecessary machinery.
- **Key insight:** the display value is already derivable without ticks. `buildStatisticsRows` (in `StatisticsHud.tsx`) computes elapsed time via `computeElapsedWithReference(elapsedMs, timerState, timerStartedAt, Date.now())`, and `useKlondikePersistence` already skips persisting tick-only updates. `elapsedMs` is folded in at boundaries anyway (`TIMER_STOP` on background/blur/win).
- **Recommended fix:** move a local 1-second interval into `StatisticsHud` (or a tiny `useDisplayClock` hook) that recomputes display time from `elapsedMs + timerStartedAt`. Then delete the `TIMER_TICK` action, the interval management in `useKlondikeTimer` (lines ~95–125), and the tick-skip branch in `useKlondikePersistence`. Net code deletion.
- **Files:** `src/features/klondike/components/StatisticsHud.tsx`, `src/features/klondike/hooks/useKlondikeTimer.ts`, `src/features/klondike/hooks/useKlondikeGame.ts` (statisticsRows memo), `src/solitaire/klondike.ts` (remove action), `src/features/klondike/hooks/useKlondikePersistence.ts`.
- **Watch out:** `recordCurrentGameResult` and history duration recording use `computeElapsedWithReference` with live `Date.now()` — they don't depend on ticks, but verify durations after removal. Timer unit tests reference `TIMER_TICK`.

### P4 — Persisted game payload grows unboundedly with game length

**Severity: Medium.** Rare in practice but a real, silent failure mode.

- **Problem:** Every move pushes a full 52-card `GameSnapshot` into `state.history` (`pushHistory` in `src/solitaire/klondike.ts`), and `useKlondikePersistence` serializes the entire state — `history` and `future` included — to AsyncStorage on each debounced write (180 ms). Data grows O(n²) over a game:
  - Each snapshot ≈ 4 KB JSON → a 500–1000-move session (draw-heavy marathon) produces multi-MB `JSON.stringify` calls on the JS thread on every move.
  - Android AsyncStorage reads rows through a CursorWindow (~2 MB); an oversized row makes hydration throw on next launch, and the catch-path in `useKlondikePersistence` then clears the save as "corrupted" — the player silently loses their marathon game.
- **Recommended fix (phase 1, cheap):** cap the *persisted* history (e.g. last 150 snapshots; keep `future` capped similarly). In-memory undo/scrubbing stays unlimited within a session. Serialize the tail in `serializeState` (`src/storage/gamePersistence.ts`) or trim in the save path of `useKlondikePersistence`.
- **Alternative (phase 2, cleaner, bigger):** persist `exactId` + a move log and rebuild snapshots by replaying through the reducer on hydration — O(n) storage instead of O(n²). The replay pattern already exists (`src/solitaire/demoReplay.ts`). Touches hydration and the undo scrubber; only do this if phase 1 proves insufficient.
- **Files (phase 1):** `src/storage/gamePersistence.ts`, `src/features/klondike/hooks/useKlondikePersistence.ts`, tests in `test/unit/storage/gamePersistence.test.ts`.
- **Watch out:** after trimming, a hydrated game has fewer undo steps than the live session had — acceptable, but the scrubber's `sliderMax` derives from `history.length + future.length`, so nothing else should assume completeness. Note: `docs/product/unbounded-game-history/` is about the *history list* (SQLite), a different topic — don't confuse the two.

### A1 — `useKlondikeGame` is a ~1,200-line god hook

**Severity: Medium.** Maintainability, not correctness.

- **Problem:** `src/features/klondike/hooks/useKlondikeGame.ts` mixes game dispatch, layout capture, history-entry lifecycle, celebration handoff, demo deep links, waste-tap buffering, and persistence wiring; 20+ refs, with `foundationLayoutsRef`/`winCelebrationsRef`/`requestNewGameRef` threaded through three sub-hooks.
- **Status:** a scoped extraction proposal for the most self-contained cluster (history-entry lifecycle → `useKlondikeHistoryEntry`) already exists: `docs/product/history-entry-hook-extraction/use-klondike-history-entry-proposal.md`. Implement that first; re-evaluate afterwards whether further splitting pays off.
- **Recommendation:** do NOT attempt to break up the celebration handoff — its refs are inherently coupled. Extract opportunistically, ideally when a feature already forces edits in this file.

### A3 — Two animation systems coexist (policy decision, no work item)

- **State:** the absolute card layer + fades use RN `Animated` (native driver); celebrations and the undo scrubber use Reanimated. Both work; inline comments capture hard-won Fabric behavior (e.g. symmetric easing to avoid draw flicker).
- **Recommendation:** keep as-is. Policy: treat RN Animated as the legacy island; write *new* animation work in Reanimated. Only migrate the card layer if a concrete need appears (e.g. gesture-driven drag), never as a standalone refactor. Record this policy here so it isn't re-litigated.

### A4 — `NEW_GAME` makes the reducer impure

**Severity: Low.**

- **Problem:** `klondikeReducer`'s `NEW_GAME` case calls `createInitialState()` → `createRandomExactDealId()` → `expo-crypto`. Reducers should be pure; React may invoke reducers twice in dev (StrictMode), producing different decks with only one committed. Benign today, but nondeterministic.
- **Fix:** the pattern already exists — `dealNewGame` in `useKlondikeGame` builds state outside the reducer and dispatches `HYDRATE_STATE`. The only remaining `NEW_GAME` dispatchers are the fallback paths in `useKlondikePersistence` (no save / corrupt save / won save). Route those through "create outside → `HYDRATE_STATE`", then delete the `NEW_GAME` action.
- **Files:** `src/solitaire/klondike.ts`, `src/features/klondike/hooks/useKlondikePersistence.ts`. Check reducer unit tests for `NEW_GAME` usage.

### H1 — Dev/template screens ship as production routes

**Severity: Medium** (bundle + store-review surface; expo-router registers every file under `app/`).

- `app/feature-graphic.tsx` (~1,000 lines): marketing-asset generator, reachable as a route in production; sole user of `expo-linear-gradient`. Fix: move out of `app/` (e.g. render behind developer mode), or gate the route.
- `app/modal.tsx`: leftover Tamagui template screen (links to natebirdman/tamagui) still registered in `app/_layout.tsx`. Fix: delete the file and its `Stack.Screen` entry.
- **Files:** `app/feature-graphic.tsx`, `app/modal.tsx`, `app/_layout.tsx`.

### H3 — `saveGameState` export only used by tests

- `src/storage/gamePersistence.ts` exports both `saveGameState(state)` and `saveGameStateWithHistory(state, historyEntryId)`; production code only uses the latter. Fix: delete `saveGameState`, update `test/unit/storage/gamePersistence.test.ts` to call `saveGameStateWithHistory(state, null)`. Trivial; bundle with H1 or A4.

### H4 — About screen lives at route name `hello`

- `app/(tabs)/hello.tsx` is the About/credits screen. Rename route + drawer label to `about` for readability and nicer deep links. Cosmetic; bundle with H1.

### H5 — `react-native-web` / `react-dom` shipped though app is native-only (decision)

- Metro excludes them from native bundles, so this is install/CI weight only. Web-guard code exists (`Stack.Protected`, `historyRepository.web.ts`). **Decision to make:** keep web debuggability (do nothing) or go strictly native (remove deps + web guards + `app/+html.tsx`). Recommendation: keep for now; revisit if web guards start costing real code.

### R1 — Persisted-game validation is shallow

**Severity: Low.**

- `isPersistedGamePayload` (`src/storage/gamePersistence.ts`) validates top-level shape but not nested cards; a structurally-valid-but-corrupt payload passes and could crash at render. The load path catch-and-clears on throw, so exposure is small.
- Fix if desired: validate cards in `normalizeSnapshot`s path (suit/rank/faceUp check like `history.tsx`'s `isValidCard`) and treat failures as `PersistedGameError('invalid')`. Don't gold-plate: one card-validity check reused for stock/waste/foundations/tableau is enough.

### R2 — "One active history row" invariant in three places (watch item, no action)

- Enforced by: React-side `normalizeActiveEntries` (`src/state/history.tsx`), transactional `markOtherActiveRowsIncomplete` (`src/storage/historyRepository.native.ts`), and the SQLite partial unique index `history_entries_one_active`. The DB index is the real guarantee; the redundancy is defensible. **Rule:** any new history feature must keep working against that index — check this box when touching history code.

### R3 — `recordCurrentGameResult` fallback searches only the loaded page (✅ fixed with A1)

- Was: when the entry-ID linkage is lost, the fallback looked for a matching active entry in `historyEntries` (first page only); a paged-out active entry would produce a duplicate row.
- Fixed 2026-07-05 as part of the A1 extraction (`useKlondikeHistoryEntry`): the in-memory match stays the synchronous fast path; when it misses, an async fallback queries the repository via `getActiveEntry()` (`getActiveHistoryEntry()` in `historyRepository.native.ts`, `WHERE status = 'active'`) before creating a new row. Details in `docs/product/history-entry-hook-extraction/use-klondike-history-entry-proposal.md`.

### R4 — No accessibility labels/roles on cards

**Severity: Medium at vision level** ("best solitaire app in the world" — most competitors are bad at accessibility; genuine differentiator).

- Cards (`CardVisual`, `AbsoluteLayerCard`), piles, and the undo scrubber have no `accessibilityLabel`/`accessibilityRole`/state. VoiceOver/TalkBack users cannot play.
- Scope when picked up: labels like "Seven of hearts, face up, column 3", roles/buttons on pressables, accessible announcement of moves, scrubber `accessibilityValue`. This is a full feature (own implementation plan + device testing with screen reader), not a quick fix.

## Resolved findings (summary + pointers)

| ID | What was done | Where |
|----|---------------|-------|
| P1 | Removed per-row `parseExactDealId` BigInt validation from `parseGeneratedRow` (kept cheap prefix/mask checks); deep validation moved to `test/unit/data/solvableDealsV2.generated.test.ts`. Benchmark: 86 ms → 6 ms in V8 for the runtime path (Hermes savings much larger). | `docs/product/generated-data-startup-cost/generated-data-startup-cost.md` |
| P5 | Demo playlist (617 KB, dev-only) now lazy-`require`d via `getDemoAutoSolvePlaylist()`; catalog (2.5 MB) accepted as core-feature cost (Hermes keeps static strings in mapped bytecode). | same doc as P1 |
| P3 + A2 | Slice props + `React.memo` on `TopRow`/`TableauSection`/`AbsoluteCardLayer`; press descriptors + stable ref-based handlers; custom card comparator; `applyMove` clones only touched piles; reducer identity locked by `test/unit/solitaire/klondike.identity.test.ts`. Result: TIMER_TICK re-renders no board components; a move re-renders ~1–3 cards. Device-smoke-tested (iOS sim, screenshots in `.test-artifacts/klondike-render-memo/`). | `docs/product/klondike-render-memoization/klondike-render-memoization.md` |
| H2 | `jest-expo`, `babel-preset-expo` moved to `devDependencies`. | commit `2d60158` |
| T1 | Added move-validation suite (`docs/product/klondike-move-validation-tests/`), reducer identity tests, and generated-catalog validation tests. | `test/unit/` |

## Strengths (context for future threads — don't "fix" these)

- Pure reducer core in `src/solitaire/klondike.ts`; UI never leaks in (A4 is the one exception).
- Exact deal ID = Lehmer-code permutation rank (`dealIdentity.ts`): the ID *is* the deck; replay is exact; checksum guards corruption.
- Storage done right: versioned game persistence with sanitize-on-load; SQLite history with WAL, partial unique active-row index, serialized write queue coordinating optimistic UI and DB.
- Inline decision comments (easing choices, waste-tap-zone stability, write serialization) are load-bearing institutional memory — preserve them through refactors.

## Suggested implementation order (remaining work)

1. **P4** — cap persisted snapshots (small, protects real users from silent save loss).
2. **H1 + H3 + H4** — route/dead-code cleanup in one small pass.
3. **P2** — HUD-local clock, delete `TIMER_TICK` (net code deletion; low urgency after P3/A2).
4. **A4** — remove `NEW_GAME` impurity (small, pairs naturally with P2 since both touch reducer + persistence hook).
5. **A1** — implement the existing `useKlondikeHistoryEntry` proposal (medium; fold R3's repository-query fix in).
6. **R4** — accessibility as its own planned feature when prioritized.
7. **R1** — optional hardening, lowest priority.
