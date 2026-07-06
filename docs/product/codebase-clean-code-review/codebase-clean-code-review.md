# Codebase Clean-Code Review

Date: 2026-07-06

## User prompt

> I like clean code. The right level of abstractions. So that everybody understands it quickly. So that the mental model is simple. Clean also that we don't have unnecessary or unused code. Do a check through the whole codebase and give a table of recommendations. Do everything directly in this thread here without subagents. Write a markdown file with every area that you have checked to build up your mental model of how everything works. Write continuously after every step.

## Purpose

Build a mental model of the whole codebase, area by area, and collect clean-code recommendations (right abstractions, simple mental model, no dead/unnecessary code). This file is written continuously during the review; the final recommendations table is at the bottom.

## Repo overview (mental model)

Native-only Expo/React Native Klondike solitaire app (`soli` v0.8.0, Expo 57, RN 0.86, Tamagui 2.2, Reanimated 4.5).

Layers, top to bottom:

- `app/` — expo-router routes (tabs layout, game screen, history, settings, modal, feature-graphic dev screen).
- `components/` — shared wrapped UI (Provider, AppSheet, toast, nav button, settings preference).
- `src/features/klondike/` — the game feature: components (incl. `cards/` render layer), hooks (game orchestration, persistence, timer, celebration, demo launcher, undo scrubber), constants, types.
- `src/solitaire/` — pure game engine (`klondike.ts` ~1.3k lines), deal identity, demo deal/replay, draw count.
- `src/state/` — React context providers: `settings.tsx`, `history.tsx`.
- `src/storage/` — persistence: `gamePersistence`, `historyRepository` (native/web split), `uiPreferences`.
- `src/animation/`, `src/data/`, `src/theme/`, `src/utils/`, `src/navigation/` — support modules.
- `test/` — jest unit tests + expo mocks. `scripts/` — deal generation and demo autosolve tooling.

~17k lines of hand-written TS/TSX/JS (excluding generated data files). Largest files: `klondike.ts` (1272), `app/feature-graphic.tsx` (1005), `useKlondikeGame.ts` (999), `run-demo-autosolve.js` (850), `AbsoluteCardLayer.tsx` (770), `state/history.tsx` (733), `app/history.tsx` (688).

Notable at first glance (to verify during review):

- `app/(tabs)/hello.tsx` — suspicious leftover route name.
- Duplicate route names: `app/history.tsx` vs `app/(tabs)/history.tsx`, `app/settings.tsx` vs `app/(tabs)/settings.tsx`.
- `app/+html.tsx`, `react-native-web`, `react-dom` in a "native-only" app.
- `app/feature-graphic.tsx` is 1k lines — likely a one-off store-asset generator screen.

## Areas checked

### 1. `app/` routing shell — checked

Mental model: expo-router. Root `_layout.tsx` = fonts + splash + Provider + a Stack with `(tabs)`, `modal`, `settings`, `history`. `(tabs)/_layout.tsx` is actually a **Drawer** (folder name is misleading) with 4 screens: `index` (game), `hello` (about), `history`, `settings`. Each screen sets its own header via `useLayoutEffect` + `navigation.setOptions`, with a shared `HeaderMenuButton` to open the drawer.

Findings:

- **Dead route: `app/modal.tsx`** — Tamagui starter leftover ("Made by @natebirdman, give it a ⭐️"). Nothing navigates to `/modal` (grep confirms). Its `Stack.Screen` registration in `_layout.tsx` (with modal presentation options) is also dead.
- **Confusing dual registration of settings/history**: implementations live in `app/settings.tsx` / `app/history.tsx` (root stack routes), and `app/(tabs)/settings.tsx` / `(tabs)/history.tsx` just re-export them so the drawer resolves. Nothing ever pushes the root `/settings` or `/history` stack routes — only the drawer routes are used. Simplification: move the implementations into `app/(tabs)/` and delete the root routes + their `Stack.Screen` entries. Root stack then only contains `(tabs)`.
- **`hello` route name**: the screen is an About page (credits, GitHub link). `hello.tsx` / "Hello" drawer label is a starter-template artifact; `about` would make the mental model instant.
- **`(tabs)` folder name**: it's a drawer, not tabs. Renaming to `(drawer)` is one commit of churn but makes the navigation model self-describing. Low priority.
- `app/+not-found.tsx`: `styles.container` and `styles.title` are unused.
- `app/+html.tsx` is web-only; app is native-only per AGENTS.md (kept only because `yarn web` script exists — see dependency section later).
- `app/feature-graphic.tsx` (1005 lines) — dev-only store-asset generator with 5 visual variants, auto-registered as `/feature-graphic` route, unreachable from UI (dev navigates by URL). It's the 2nd-largest file in the repo. Acceptable as a tool, but consider pruning unused variants or excluding from the production route tree.
- `app/(tabs)/index.tsx` (game screen) is clean: header wiring + demo-choice sheet, session controls handed up from `KlondikeGameSession` via callback. iOS/Android header split is documented with PBI comments.

### 2. `src/solitaire/` + `src/data/` game engine — checked

Mental model: pure, framework-free engine. `klondike.ts` exports `GameState` (a `GameSnapshot` + history/future/selected/autoUpEnabled) and a single `klondikeReducer` handling ~19 actions (game creation, draw/recycle, select/place, undo/scrub, auto-queue, timer). Every state factory funnels through `createGameStateFromExactId`. `dealIdentity.ts` encodes the full 52-card permutation as a Lehmer-rank base36 "E1_" ID (deal ID = replay recipe), plus an FNV checksum. `drawCount.ts` is a tiny shared normalizer. `demoDeal.ts`/`demoReplay.ts` support the hidden developer demo (custom board + solver-trace replay). `src/data/` wraps two large generated files with lazy-require caches (documented why).

Assessment: this is the cleanest layer. Pure functions, immutability with documented targeted-clone perf optimization in `applyMove`, and decision comments (why undo keeps moveCount, why demo deals carry exact IDs, why draw-1 auto-completes early). At 1272 lines `klondike.ts` is big but coherent; the only natural split would be the timer reducers (~70 lines) and auto-complete planner (~130 lines), which is optional.

Findings:

- **Duplicated suit/rank domain constants**: `klondike.ts` defines `SUITS`/`RANKS` (types `Suit`/`Rank`) and `dealIdentity.ts` independently defines `DEAL_SUITS`/`DEAL_RANKS` (types `DealSuit`/`DealRank`). They are structurally identical and interchangeable in practice (`DealCard` flows into `Card` factories). One definition (e.g. in `dealIdentity.ts` or a tiny `cards.ts`) would remove a whole aliasing layer (`DemoDealCard = DealCard`, `DemoReplayCard = {suit; rank}` is a third structural clone).
- `klondike.ts` `FOUNDATION_SUIT_ORDER` vs `SUITS`: two orderings of the same 4 suits (display order vs canonical order) — legitimate, but a one-line comment on `SUITS` saying "canonical deck order; FOUNDATION_SUIT_ORDER is display order" would prevent confusion. (Minor.)
- `createSuitRecord` and `createEmptyFoundations` are near-duplicates (`createEmptyFoundations` = `createSuitRecord([])` except fresh arrays). Could collapse via a factory-taking variant. (Micro, optional.)

### 3. `src/features/klondike/hooks/` — checked

Mental model: `useKlondikeGame` (999 lines) is the orchestrator — it owns the reducer, board layout state, and press handlers, and delegates to 7 sub-hooks: timer, persistence (debounced kv-store writes + hydration), history-entry lifecycle, solvable-deal selection, celebration controller, undo scrubber (worklet-side pan gesture), demo launcher, auto-queue runner. Cross-hook coordination happens via shared refs created in the orchestrator (`stateRef`, `currentGameEntryIdRef`, `previousHasWonRef`, `demoPlaybackActiveRef`, layout refs) — ref-heavy but each ref's ownership is documented (e.g. why `currentGameEntryIdRef` lives in the parent).

Overall: complexity here is mostly essential (animations, persistence timing, win-handoff jank avoidance) and unusually well-commented with perf rationale (P3/A2, Task 28-2). Concrete cleanups found:

- **Six near-identical layout callbacks** in `useKlondikeGame` (`handleTopRowLayout`, `handleFoundationLayout`, `handleStockLayout`, `handleWasteLayout`, `handleTableauRowLayout`, `handleTableauColumnLayout`, ~90 lines): all do "compare with `areLayoutsEquivalent`, then merge into `absoluteCardLayerLayouts`". A small factory `makeLayoutSetter(key)` (plus the two special cases) would cut this to ~30 lines and one mental pattern.
- **Demo deep-link parsing lives in the wrong hook**: `processDemoLink` + its `Linking` effect (~100 lines) sit in `useKlondikeGame` although `useDemoGameLauncher` exists for exactly this domain. Moving it there shrinks the orchestrator and groups all demo logic. The parser also accepts ~12 query-param aliases (`demo`/`demoGame`, `auto`/`autoreveal`, `solve`/`autosolve`, `games`/`gameLimit`/`count`, `recordHistory`/`history`, 3 playlist spellings) — dev-only surface that could be standardized to one name each.
- **"[Toast suppressed]" devLogs (4 sites)**: relics of a removed toast system; the logs describe toasts that no longer exist. Either keep as plain logs with honest wording or delete. Related: the misplaced `// Requirement PBI-13: persist state changes after hydration.` comment sits on the auto-complete log effect in `useKlondikeGame` (line ~886), which has nothing to do with persistence.
- **`useKlondikeTimer` returns `{ pauseTimer, resumeTimerIfNeeded }` but the only caller ignores the return** — can return void (or keep; trivial).
- **`useCelebrationController` exports `handleCelebrationComplete`** which no caller uses (only used internally) — drop from the return object.
- **`useDemoGameLauncher` types `setCelebrationState` as `Dispatch<SetStateAction<any>>`** — the only `any` I found in app code; should be `CelebrationState | null`.
- `useUndoScrubber` (440 lines): dense but necessarily so (UI-thread worklet gesture math with JS-side RAF-batched dispatch). Contains an `eslint-disable-next-line react-hooks/exhaustive-deps` on `undoTapGesture` whose dep array is actually complete — the disable looks stale.
- `useKlondikePersistence.didGameShapeChange` manually compares 16 fields — verbose but explicit and fast; fine as is.
- `useSolvableDealSelector` / `useAutoQueueRunner` / `useKlondikeTimer` are small and clean.

### 4. `src/features/klondike/components/` — checked

Mental model: `KlondikeGameSession` (thin: hook → view + controls handoff) → `KlondikeGameView` (pure layout: header/HUD, `TopRow`, `TableauSection`, `AbsoluteCardLayer`, celebration layers, `UndoScrubber`). Key architectural decision (well documented): piles (`TopRow`/`TableauSection`/`FoundationPile`) are *structural only* — outlines, slots, a11y for empty states; all card visuals live in `AbsoluteCardLayer`, which positions every card absolutely and animates flights/flips/wiggles with the native driver. Memoization is rigorous, with an explicit comparator (`areAbsoluteLayerCardPropsEqual`) that even carries a WARNING comment about adding fields.

Findings:

- **Dead prop chain `onFoundationArrival`**: `TopRowProps.onFoundationArrival` → `FoundationPile.onCardArrived` → `useFoundationGlowAnimation.onCardArrived`. `useKlondikeGame` never passes `onFoundationArrival` (win-settle detection moved to `AbsoluteCardLayer.onCardSettled`), so the callback is always `undefined` through the whole chain. Removing the prop from `TopRow`/`FoundationPile` and the `onCardArrived` branches in `animations.ts` deletes real plumbing and simplifies the glow hook.
- **Duplicated pile math**: (a) face-down stack offset (`FACE_DOWN_STACK_OFFSET_DIVISOR` + running-offset loop) exists in both `TableauSection.tsx` and `AbsoluteCardLayer.buildCardLayerItems`; (b) waste-fan geometry (overlap/fanWidth/baseX) is computed twice inside `AbsoluteCardLayer` (`resolveWasteTapTarget` + `buildCardLayerItems`). Two small shared helpers in `cards/utils.ts` would guarantee the structural layer and the card layer can't drift apart.
- **`cards/index.ts` barrel is inconsistently used**: `KlondikeGameView` imports `TopRow`/`TableauSection`/`AbsoluteCardLayer`/`CelebrationOverlayLayer` directly but `CelebrationTouchBlocker` via the barrel; `CardVisual`/`rankToLabel` barrel exports are bypassed elsewhere too. Either import everything via the barrel or (simpler) delete the barrel and import directly.
- `accessibility.ts` (new, 73 lines) is a clean single home for a11y labels/testIDs; good comment about spelled-out ranks for screen readers.
- `FeltBackground` renders 120 absolutely-positioned `View`s for a 1.5%-opacity diagonal pattern. Works, but it's the kind of thing a single SVG/ImageBackground would do with less tree weight. Optional.
- `StatisticsHud`, `PileButton`, `CelebrationDebugBadge`, `CelebrationTouchBlocker`, `UndoScrubber` (component), `CelebrationOverlayLayer` — small, focused, fine.

### 5. Shared `components/` + toast system — checked (pulled forward because of a discovery)

- **The entire toast stack is dead code**: `Provider.tsx` mounts `ToastProvider` + `CurrentToast`, but no code ever shows a toast (zero `useToastController` callers — the inline comment from 2026-07-06 says exactly this, and `ToastViewport` was already removed for the Android a11y bug). Deleting `ToastProvider`, `CurrentToast.tsx`, and the `@tamagui/toast` dependency removes a provider layer, a component, and a package. If toasts return later, re-add per the existing comment.

### 6. `src/state/` + `src/storage/` — checked

Mental model: two context providers. `SettingsProvider` hydrates synchronously from `expo-sqlite/kv-store` (documented decision: removes async `hydrated` gating everywhere) and exposes one setter per field. `HistoryProvider` keeps an optimistic in-memory page list over a SQLite repository, with a serialized write queue (`queueRepositoryTask`) so active-row normalization stays ordered; native/web repository split via Metro file extensions (`.native.ts` real SQLite, `.web.ts` no-op stubs). `gamePersistence` saves the full `GameState` (async on purpose — payload grows hundreds of KB; documented). `uiPreferences` is a tiny sync-read board-metrics cache.

Findings:

- **`shareSolvedGames` setting is dead**: state field, default, `setShareSolvedGames`, and merge handling exist, but no UI control and no feature reads it. Remove the whole slice (5 touchpoints in `settings.tsx`); reintroduce when sharing ships.
- **`useStatisticsPreferences` export is unused** (consumers read `state.statistics` via `useSettings` directly). Delete.
- **`saveGameState` is production-dead**: only tests call it; the app always uses `saveGameStateWithHistory`. Collapse to one function (`saveGameState(state, historyEntryId = null)`).
- **`HistoryRepository` type in `historyRepository.types.ts` is never referenced** — it was presumably meant to keep `.native.ts`/`.web.ts` in sync but neither implements it. Either `satisfies HistoryRepository` in both files (gets the drift protection it was written for) or delete the type.
- **`HistoryContextValue.getEntryById` and `activeCount` have no consumers** (`app/history.tsx` uses totals + entries; game code uses `getActiveEntry`). Trim the context surface.
- `settings.tsx`: `setDeveloperLoggingEnabled` is invoked both inside `setDeveloperMode` and by an effect watching `state.developerMode` — the effect alone is sufficient (it also covers hydration). The 8 near-identical boolean setters could be one generic `updateSetting(key, value)`, but named setters read well at call sites; leave unless the file grows.
- History/persistence code carries excellent decision comments (why async writes, why serialized queue, why fresh DB file v4). Complexity is justified.

### 7. Support modules (`src/theme`, `src/utils`, `src/navigation`, `src/animation`, shared `components/`) — checked

All small and clean: `theme/index.ts` (2 functions), `utils/time.ts` (elapsed/format helpers), `utils/devLogger.ts` (gated console), `navigation/useDrawerOpener.ts`, `AppSheet` (thin @expo/ui wrapper — good example of the "wrap components with defaults" rule), `HeaderMenuButton` (platform-aware header control with documented geometry). `animation/celebrationModes.ts` is a self-contained worklet math module for 20 named celebration modes. `cards/fonts.ts` carries an outstanding decision comment on the custom-font contract. Only finding: `devLogger.getDeveloperLoggingEnabled` is exported and never called.

### 8. Tests, scripts, config — checked

- `test/` mirrors `src/` (solitaire engine has 10 focused spec files; state/storage covered; helpers file with fixture builders). Mocks for expo-sqlite/kv-store and expo winter runtime are minimal. Good shape, nothing to flag.
- `scripts/`: deal/playlist generators (Lonelybot-based), demo autosolve device runner, font tooling, perf baseline. One piece of junk: **`scripts/compare-100 copy.md` is a committed byte-identical duplicate of `scripts/compare-100.md`** — delete.
- `.test-artifacts/` is not in `.gitignore` (screenshots/build logs from agent test runs show up as untracked). Add it.
- Jest config, tsconfig, tamagui config, `index.js` setup (documented why `@tamagui/native` setup must run before expo-router) — all fine.

### 9. Dead-code / unused-export sweep (mechanical) — checked

Ran a repo-wide scan for exports never referenced outside their defining file, then hand-verified in-file usage.

Fully dead (no usage anywhere):

- `hasUndoHistory` (`src/solitaire/klondike.ts`)
- `CARD_REFERENCE_METRICS`, `STAT_VERTICAL_MARGIN`, `WIN_CELEBRATION_GLOW_TAIL_DELAY_MS`, `COLOR_TEXT_STRONG` (`src/features/klondike/constants.ts`)
- `getDeveloperLoggingEnabled` (`src/utils/devLogger.ts`)
- `useStatisticsPreferences` (`src/state/settings.tsx`)
- `HistoryRepository` type (`src/storage/historyRepository.types.ts`)
- 7 unused style keys in `cards/styles.ts` (`cardFlipWrapper`, `stockCardWrapper`, `stockLabel`, `foundationCard`, `foundationStackedCard`, `wasteFanCardWrapper`, `hiddenCard`) — relics of the pre-absolute-layer pile-local rendering
- `saveGameState` (`src/storage/gamePersistence.ts`) — production-dead, only its own test uses it
- `+not-found.tsx` styles `container`/`title`

Needlessly exported (used only in-file; drop the `export` keyword to shrink API surface — optional): `getNextStockDrawCards`, `DRAW_COUNT_MASKS`, `isDrawCount`, `openNavigationDrawer`, `CARD_FONT_FAMILY`, `CELEBRATION_OVERLAY_SLOT_COUNT`, `IOS_HEADER_LEADING_PADDING`, plus various prop/param types.

### 10. Dependency check — checked

- `@tamagui/toast` — only used by the dead toast stack (see §5). Removable with it.
- `react-native-web` + `react-dom` + `app/+html.tsx` + `@expo/metro-runtime` — exist only for `yarn web`, which AGENTS.md itself calls optional for a native-only app. The web history repo stub (`historyRepository.web.ts`) and the `Platform.OS !== 'web'` route guards are more of the same. **Decision:** keep web as an occasional smoke-test vehicle, or delete the whole web surface (~4 files, 3 deps, 1 script, simpler mental model: "this app is native, period"). Recommendation: delete; Playwright/web testing is explicitly not needed per AGENTS.md.
- `expo-web-browser` — in `package.json` + `app.json` plugins but zero imports in code (Tamagui `Anchor` uses `Linking` on native). Starter leftover; verify a release build opens external links, then remove.
- Verified as genuinely needed despite no direct import: `expo-constants`/`expo-linking` (expo-router peers), `expo-splash-screen` (used via expo-router export + plugin), `expo-system-ui` (backs `userInterfaceStyle: automatic` on Android), `react-native-teleport` + `@tamagui/native` (loaded in `index.js` setup, documented), `expo-crypto` (dealIdentity).

## Recommendations table

Legend: Impact = effect on mental-model simplicity / dead-weight removal. Effort: S < 30 min, M ≈ 1–2 h, L > 2 h.

| # | Recommendation | Area | Type | Impact | Effort |
|---|---|---|---|---|---|
| 1 | Delete dead starter route `app/modal.tsx` + its `Stack.Screen` entry | app/ | Dead code | Medium | S |
| 2 | Move settings/history implementations into `app/(tabs)/`, delete root `app/settings.tsx`/`app/history.tsx` re-export indirection + dead root `Stack.Screen` entries | app/ | Simplification | High | S |
| 3 | Rename `hello` route → `about` (and optionally `(tabs)` → `(drawer)`) | app/ | Naming | Medium | S |
| 4 | Remove dead toast stack: `ToastProvider`, `CurrentToast.tsx`, `@tamagui/toast` dep; reword/remove the 4 "[Toast suppressed]" devLogs | components/, hooks | Dead code | High | S |
| 5 | Delete dead exports: `hasUndoHistory`, 4 dead constants, `getDeveloperLoggingEnabled`, `useStatisticsPreferences`, `HistoryRepository` type, 7 unused style keys, `+not-found` styles | repo-wide | Dead code | Medium | S |
| 6 | Remove dead `shareSolvedGames` settings slice (field, default, setter, merge) | state/settings | Dead code | Medium | S |
| 7 | Collapse `saveGameState`/`saveGameStateWithHistory` into one function | storage | Simplification | Low | S |
| 8 | Remove dead `onFoundationArrival` → `onCardArrived` prop chain (TopRow → FoundationPile → glow hook) | klondike components | Dead code | Medium | S |
| 9 | Trim `HistoryContextValue`: drop unused `getEntryById`, `activeCount` | state/history | Dead code | Low | S |
| 10 | Factor the 6 near-identical layout callbacks in `useKlondikeGame` into a `makeLayoutSetter` helper | hooks | Duplication | Medium | S |
| 11 | Move demo deep-link parsing (`processDemoLink` + Linking effect) from `useKlondikeGame` into `useDemoGameLauncher`; optionally standardize the ~12 query-param aliases | hooks | Right abstraction | Medium | M |
| 12 | Extract shared pile-math helpers (face-down stack offsets, waste-fan geometry) used by both `TableauSection`/`AbsoluteCardLayer` and twice within `AbsoluteCardLayer` | klondike components | Duplication | Medium | S |
| 13 | Unify suit/rank domain constants (`SUITS`/`RANKS` vs `DEAL_SUITS`/`DEAL_RANKS`, 3 structural card-type clones) | engine | Duplication | Medium | M |
| 14 | Decide web surface: delete `+html.tsx`, `historyRepository.web.ts`, web route guards, `react-native-web`, `react-dom`, `@expo/metro-runtime`, `yarn web` (recommended) — or keep and document why | repo-wide | Scope decision | High | M |
| 15 | Remove `expo-web-browser` (plugin + dep; zero imports) after verifying external links in a release build | deps | Dead dep | Low | S |
| 16 | Delete `scripts/compare-100 copy.md`; add `.test-artifacts/` to `.gitignore` | scripts | Housekeeping | Low | S |
| 17 | Delete or use consistently the `cards/index.ts` barrel | klondike components | Consistency | Low | S |
| 18 | Type `setCelebrationState` in `useDemoGameLauncher` (only `any` in app code); drop unused `handleCelebrationComplete` from celebration hook return; make `useKlondikeTimer` return void | hooks | Polish | Low | S |
| 19 | Prune unused variants in `app/feature-graphic.tsx` (1005 lines, dev-only) or move out of the route tree | app/ | Dead weight | Low | M |
| 20 | Fix misplaced "PBI-13" comment on the auto-complete log effect; remove stale eslint-disable in `useUndoScrubber` | hooks | Polish | Low | S |

Not recommended (looked at, deliberately leaving alone): splitting `klondike.ts` (coherent domain, pure, well-tested); the ref-heavy hook coordination in `useKlondikeGame` (documented perf rationale); `didGameShapeChange`'s 16 explicit comparisons; the 8 named settings setters; `FeltBackground`'s 120-view pattern (works, replace only if profiling says so).

## Overall assessment

The codebase is in good shape: the layering (routes → session hook → pure engine → storage) is right, perf-sensitive code is unusually well-commented with decision rationale, and tests target the pure engine. The dirt is concentrated at the edges: starter-template leftovers (`modal`, `hello`, toast stack, `expo-web-browser`), a half-committed web story, and dead exports left behind by the absolute-card-layer and history refactors. Roughly items 1–9 + 15–16 are pure deletions (~zero risk); 10–13 are small refactors; 14 is the one real decision.
