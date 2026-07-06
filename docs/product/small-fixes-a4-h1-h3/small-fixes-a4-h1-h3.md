# Small Fixes Batch — A4 (reducer purity), H1 (dev/template routes), H3 (dead export)

Source: `docs/product/architecture-performance-review/findings.md` (IDs A4, H1, H3).

## User prompt

> P4: I really really really don't want to limit to 150. even after device restart, full history should be available. works now. is flawless and fast. this would be a regression. will maybe do this later: [kv-store doc option D], but this is not a quick fix.
>
> timer carries some risk for me because we have done timer updates in the past which i had to revert because e.g. when hard killing the app, the timer would go on if we don't write every second and when you restart, you have crazy long game times. pls write that down so that we know this and may tackle it separately at some point.
>
> i like hello. it says hello to people.
>
> Do A4, H1, H3

(P4/P2/H4 decisions are recorded in the findings register; this plan covers only A4, H1, H3.)

## Description

Three small, independent hygiene/correctness fixes done in one pass so a single test
cycle covers them:

- **A4:** `klondikeReducer`'s `NEW_GAME` case calls `createInitialState()` →
  `createRandomExactDealId()` → `expo-crypto`, making the reducer impure. React may
  invoke reducers twice in dev (StrictMode), producing different decks with only one
  committed. Fix by creating state outside the reducer and deleting the action.
- **H1:** `app/modal.tsx` (leftover Tamagui template screen) and `app/feature-graphic.tsx`
  (~1,000-line dev-only marketing-asset generator, sole user of `expo-linear-gradient`)
  ship as production routes because expo-router registers every file under `app/`.
- **H3:** `src/storage/gamePersistence.ts` exports `saveGameState(state)` which only its
  own test uses; production always uses `saveGameStateWithHistory(state, historyEntryId)`.

## Acceptance Criteria

- No `NEW_GAME` action exists in `src/solitaire/klondike.ts`; the reducer is pure
  (no `expo-crypto` reachable from any reducer case).
- The three fallback paths in `useKlondikePersistence` (no save / corrupt save / won
  save) still start a fresh game with the preferred draw count, via state created
  outside the reducer + `HYDRATE_STATE`.
- `app/modal.tsx` is deleted; its `Stack.Screen` entry and the `/modal` comment in
  `app/_layout.tsx` are removed. Route `/modal` no longer exists.
- `/feature-graphic` still works in dev builds (Karim uses it to generate store
  assets) but its ~1,000 lines + `expo-linear-gradient` JS are NOT in production
  bundles and the route renders nothing in production.
- `saveGameState` is gone; tests use `saveGameStateWithHistory(state, null)`
  (equivalent: `saveGameState` was just `serializeState(state, null)`).
- `yarn typecheck && yarn lint && yarn jest` pass. iOS smoke test passes.

## Constraints / context

- **Do NOT touch** `src/features/klondike/components/cards/*` — there are uncommitted
  accessibility changes (R4 work) in those files from another thread.
- Never commit/stage anything.
- Preserve inline decision comments; add new ones where a decision is non-obvious
  (per AGENTS.md).

## Steps to implement

### A4 — remove `NEW_GAME` impurity

- [x] Read the current `NEW_GAME` reducer case in `src/solitaire/klondike.ts` (~line 296)
      to see exactly what it does beyond `createInitialState` (e.g. drawCount handling),
      and read `dealNewGame` in `useKlondikeGame.ts` — the existing
      "create outside → dispatch `HYDRATE_STATE`" pattern to copy. Consider extracting a
      shared `buildFreshGameState(drawCount)` helper in `klondike.ts` (exported, impure,
      NOT part of the reducer) so the game hook and persistence fallbacks share one
      blessed entry point. → No new helper needed: `createInitialState(drawCount)`
      already IS that shared entry point (it's what both `dealNewGame` and the old
      `NEW_GAME` case called).
- [x] In `src/features/klondike/hooks/useKlondikePersistence.ts`, replace the three
      `dispatch({ type: 'NEW_GAME', ... })` calls (no save / corrupt save / won save)
      with a local `dispatchFreshGame()` helper: `createInitialState` outside the
      reducer + `HYDRATE_STATE` with `autoUpEnabled: autoUpEnabledRef.current`.
- [x] Delete the `NEW_GAME` action type and reducer case from `src/solitaire/klondike.ts`.
- [x] Update `test/unit/solitaire/klondike.drawCount.test.ts` which dispatched
      `NEW_GAME` — now builds `createInitialState(5)` + `HYDRATE_STATE`, preserving
      the draw-count assertion.
- [x] Add a short inline comment at the creation site: reducer must stay pure
      (StrictMode double-invoke), so fresh games are always built outside the reducer.
      (Comments added both above `klondikeReducer` and at `dispatchFreshGame`.)

### H1 — dev/template routes

- [x] Delete `app/modal.tsx`. Remove its `Stack.Screen` block and the
      `/modal` reference in the `unstable_settings` comment in `app/_layout.tsx`.
- [x] Move the feature-graphic screen implementation from `app/feature-graphic.tsx`
      to `src/dev/FeatureGraphicScreen.tsx` (new folder for dev-only screens). Fixed
      relative imports (`../src/...` → `../...`) and the icon `require` path
      (`../../assets/images/icon.png`).
- [x] Replace `app/feature-graphic.tsx` with a tiny stub that only loads the real
      screen in dev (top-level `if (__DEV__)` + `require`, renders `null` in
      production), with an inline comment explaining the DCE mechanism.
- [x] Keep `expo-linear-gradient` in dependencies (native module; the dev screen uses it).

### H3 — dead export

- [x] Delete `saveGameState` from `src/storage/gamePersistence.ts` (left a one-line
      comment noting the variant existed and why it's gone).
- [x] Update `test/unit/storage/gamePersistence.test.ts` (import + 2 call sites) to
      `saveGameStateWithHistory(state, null)`.

### Wrap-up

- [x] `yarn typecheck && yarn lint && yarn jest` — all pass (19 suites, 151 tests).
- [x] Update this doc's step statuses + findings register statuses for A4/H1/H3.
- [x] iOS smoke test (testing sub-agent, 2026-07-06) — all 6 cases pass; see Testing section.

## Plan: Files to modify

- `src/solitaire/klondike.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `test/unit/solitaire/klondike.drawCount.test.ts`
- `app/_layout.tsx`
- `app/modal.tsx` (delete)
- `app/feature-graphic.tsx` (reduce to dev-only stub)
- `src/dev/FeatureGraphicScreen.tsx` (new, moved content)
- `src/storage/gamePersistence.ts`
- `test/unit/storage/gamePersistence.test.ts`

## Files actually modified

- `src/solitaire/klondike.ts` — deleted `NEW_GAME` action type + reducer case; added
  reducer-purity comment above `klondikeReducer`.
- `src/features/klondike/hooks/useKlondikePersistence.ts` — local `dispatchFreshGame()`
  helper (createInitialState + HYDRATE_STATE) replaces the three `NEW_GAME` dispatches.
- `test/unit/solitaire/klondike.drawCount.test.ts` — last test rewritten to
  `HYDRATE_STATE` with `createInitialState(5)`.
- `app/modal.tsx` — deleted.
- `app/_layout.tsx` — removed the modal `Stack.Screen` block and `/modal` comment.
- `app/feature-graphic.tsx` — reduced to the dev-only `__DEV__` stub.
- `src/dev/FeatureGraphicScreen.tsx` — new; moved screen content, fixed imports and
  asset path.
- `src/storage/gamePersistence.ts` — deleted `saveGameState`, left a note comment.
- `test/unit/storage/gamePersistence.test.ts` — uses `saveGameStateWithHistory(state, null)`.

## Intermediary learnings

- No shared `buildFreshGameState` helper was needed: `createInitialState(drawCount)`
  already is the single blessed impure entry point — both `dealNewGame` and the old
  `NEW_GAME` case delegated to it. The persistence hook now calls it directly.
- `NEW_GAME` semantics were fully covered by `createInitialState` + preserving
  `autoUpEnabled`; `HYDRATE_STATE` already takes `autoUpEnabled` as a param, so the
  fallback paths pass `autoUpEnabledRef.current` (the reducer default would have used
  the placeholder state's value, which is equivalent at startup but less explicit).
- Repo grep for `NEW_GAME` found only the three persistence dispatches, the reducer,
  and one test (`klondike.drawCount.test.ts`); `docs/delivery/1/1-5.md` mentions it
  but is a historical delivery doc — left untouched.

## Testing

- Cheap: `yarn typecheck && yarn lint && yarn jest` — all green after the changes
  (typecheck ✓, lint ✓, jest: 19 suites / 151 tests passed, 2026-07-06).
- iOS simulator smoke test (iPhone 17 Pro, clean build via `yarn ios`, app
  uninstalled first, agent-device 0.18.3) — 2026-07-06, all pass:
  1. **Fresh install / A4 no-save fallback** ✓ — 7 tableau columns (1–7 cards,
     top face-up: Jack♦, Queen♦, 2♣, 7♦, A♠, 2♦, 7♣), stock present
     (`Stock, 23 cards`), moves 0 / time 0:00. Evidence:
     `.test-artifacts/small-fixes-a4-h1-h3/01-fresh-install.png`
  2. **Gameplay + undo** ✓ — 4 valid moves (3 stock draws + A♠ to foundation);
     move counter 0→4, timer started (0:10 after first move). Undo returned A♠
     to column 5; move count stayed at 4 (undo does not decrement counter).
     Evidence: `02-after-moves.png`, `03-after-undo.png`
  3. **Hard-kill persistence** ✓ — `simctl terminate` + relaunch restored moves
     (4), board (A♠ col 5, waste 3♥, stock 20), timer 0:41 (was 0:39 pre-kill;
     plausible continuation, not inflated). Evidence: `04-after-relaunch.png`
  4. **`/feature-graphic` dev route** ✓ — `soli://feature-graphic` renders
     marketing-asset generator (Badge Highlights, theme toggles, preview cards).
     Evidence: `05-feature-graphic.png`
  5. **`/modal` removed** ✓ — `soli://modal` shows expo-router not-found
     ("Oops! This screen doesn't exist."); no @natebirdman / Tamagui template.
     Evidence: `06-modal-route.png`
  6. **Drawer navigation** ✓ — Hello, History, Settings opened without crash;
     returned to Play game screen. Evidence: `07-hello-tab.png` …
     `10-play-tab.png`
- Minor anomaly (pre-existing, unrelated to A4/H1/H3): on first launch the a11y
  tree labels the face-up stock-top preview as `Waste, Nine of hearts` while
  moves are still 0; visual layout is correct (Draw pile + tableau).
