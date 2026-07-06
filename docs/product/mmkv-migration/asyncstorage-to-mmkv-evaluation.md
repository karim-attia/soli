# MMKV Migration — AsyncStorage → react-native-mmkv Evaluation

Created: 2026-07-05
Status: Approach E implemented 2026-07-05 (expo-sqlite/kv-store switch, async-storage
removed, all cheap gates green). Device smoke tests **PASS** on iOS simulator + Android
physical device (2026-07-05).

## User prompt

"write md plan on what it would mean to switch from async storage to mmkv
summary on whether recommended or not.
ignore existing plan, want to re-evaluate with fresh eyes"

Follow-up (2026-07-05): "So we're doing a big migration of all this stuff at the moment
anyway. And with the next release, I guess we're losing the current game and stuff like
this anyway, so I'm not even sure we would do a migration, but just like do a clean
slate. And this is why the timing kind of matters. Tell me a bit about pros and cons of
MMKV and the Expo KV Store [...] if we have a clean slate anyway, which we have now and
will not have later anyway, I thought going to the best option right now would make
sense if there's a potential speed up. [...] I wouldn't touch history because the
history is now in a SQLite database, which is great. But kind of the settings and the
game, the current game [...] we can do the other JSON optimization as well, but I think
that's kind of less urgent at the moment right now."

Go-ahead (2026-07-05): "OK, do it now"

## Summary / Recommendation (revised 2026-07-05 — clean-slate context)

**Switch now, but to `expo-sqlite/kv-store` (Expo KV Store), not MMKV.**

New context: the next release is a clean slate — existing users' in-progress game and
settings are not being carried over. That deletes the two biggest costs of the original
"not now" verdict: the one-time data migration loop and the data-loss rollout risk.
With those gone, taking the switch now (while the slate is clean, which won't repeat)
is the right timing.

Why KV Store over MMKV:

1. **Zero new dependencies** — it ships inside `expo-sqlite`, which the app already
   uses for history. MMKV would add `react-native-mmkv` + `react-native-nitro-modules`
   (first Nitro module in the repo, +~0.5–1 MB binary).
2. **MMKV's only edge is raw speed we cannot feel** — ~30x faster reads matter at
   thousands of ops; Soli reads 3 keys once at startup.
3. **The one heavy write favors SQLite** — the debounced game-blob save (rewriting one
   ~350–700 KB value) is MMKV's weakest workload (append-log churn) and a plain
   single-row UPDATE for SQLite.
4. **Drop-in API** — KV Store mirrors the AsyncStorage API (import swap) and adds
   synchronous variants, so we still get the settings-hydration simplification
   (delete the `hydrated` flag, ~40–60 lines).
5. **One storage story** — all persistence becomes SQLite (history table + KV store).

Implementation note: keep the game-blob save on the **async** API so a large write
never blocks the JS thread; use `getItemSync`/`setItemSync` only for the small startup
reads (settings, board metrics).

The move-log/JSON write-shape optimization (approach D) stays deferred — orthogonal to
the engine and only warranted if profiling ever flags the debounced save.

## Original Summary / Recommendation (2026-07-05, pre-clean-slate context — superseded)

**Not now. Do it opportunistically, not as a standalone project.**

The honest math: Soli reads three small AsyncStorage keys once at startup and writes
them off the critical path (game saves are debounced 180 ms and skipped during timer
ticks; settings writes are tiny and rare). There is no user-perceivable jank today that
traces to AsyncStorage. MMKV's headline win — synchronous, ~30x faster key-value access —
solves a problem this app does not have, while costing two new native dependencies
(`react-native-mmkv` + `react-native-nitro-modules`, Soli's first Nitro dep), a one-time
data migration that must be carried in the codebase for months so existing users don't
lose their in-progress game and settings, test churn in ~4 test files, and a release
whose main failure mode is "user lost their saved game."

The one storage-related cost that *is* real — re-serializing a game-state blob that
grows ~3.5 KB per move (full undo-history snapshots; a 150-move game is a ~500 KB JSON
string) on every debounced save — lives in `JSON.stringify` on the JS thread and in the
write *shape*, not in the storage engine. MMKV would not fix it; it's actually mildly
worse at repeatedly rewriting one large value (append-log write-back churn). If that
write ever shows up in profiles, the fix is persisting the base deal + move log instead
of full snapshots (~100x smaller), which pays off identically under either engine.

What MMKV *would* buy: deleting the `hydrated` flag and hydration sequencing in
`settings.tsx` and simplifying the two-phase startup in `useKlondikePersistence` (sync
reads = no placeholder-reducer dance), plus zero-config Jest mocks. That's a genuine but
small simplification — worth taking **when** a Nitro dependency lands anyway, when
AsyncStorage causes an actual measured problem, or bundled into a release that already
requires heavy device testing. As a standalone effort, the risk/benefit doesn't clear
the bar.

## Description

Soli currently persists all key-value data through `@react-native-async-storage/async-storage@2.2.0`.
This evaluation asks, with fresh eyes: what would it mean to replace it with
`react-native-mmkv` (v4.3.2, June 2026), and is that switch worth it for this app?

Scope note: game **history** lives in `expo-sqlite`
(`src/storage/historyRepository.native.ts`) and is explicitly out of scope. This is only
about the key-value storage.

### Current AsyncStorage inventory (verified 2026-07-05)

| Site | Key | Payload | Read frequency | Write frequency |
| --- | --- | --- | --- | --- |
| `src/storage/gamePersistence.ts` | `soli/klondike/v2` | Full `GameState` JSON incl. undo `history` + redo `future` snapshot arrays | Once at startup (`useKlondikePersistence`) | Debounced 180 ms after every board-shape change; pure timer ticks skipped |
| `src/state/settings.tsx` | `@soli/settings/v1` | Small settings JSON (~400 B) | Once at startup (gates `hydrated` flag) | On every settings change |
| `src/storage/uiPreferences.ts` | `soli/ui/boardMetrics/v1` | Tiny `{width, height}` JSON | Once at startup | On layout changes (rare) |
| `src/features/klondike/hooks/useKlondikeGame.ts` | — | Calls `clearGameState()` on new deal | — | Occasional |
| Tests | — | `jest.mock` of the official async-storage mock in `test/unit/storage/gamePersistence.test.ts`, `test/unit/state/history.startedEntry.test.ts`, `history.drawCount.test.ts`, `history.pagination.test.ts` | — | — |

Blob size estimate: each `GameSnapshot` serializes all 52 cards (~55 B/card as JSON) plus
pile structure and metadata ≈ **3–4 KB per snapshot**. `GameState.history` gains one
snapshot per move (unbounded within a game), so the persisted blob is roughly
`(moves + 1) × 3.5 KB`: ~350 KB at 100 moves, ~700 KB at 200 moves — re-stringified and
rewritten on each debounced save. This is the only "large" storage traffic in the app,
and its cost is dominated by JS-side `JSON.stringify`, which no storage engine change
removes.

### react-native-mmkv facts (researched 2026-07-05)

See `docs/external-package-guides/react-native-mmkv.md` for the full guide. Key points:

- Current version **4.3.2**; V4 is a full rewrite as a **Nitro Module** — requires the
  peer dep `react-native-nitro-modules` and RN 0.76+. Soli (RN 0.86, Expo SDK 57, New
  Architecture, dev builds via `expo run:ios` / prebuild — **not** Expo Go) is fully
  compatible.
- API is fully synchronous: `createMMKV()`, `set`, `getString/getNumber/getBoolean`,
  `getAllKeys`, `remove`. Objects still need JSON round-trips, same as today.
- Official AsyncStorage migration pattern: one-time loop copying all keys, gated by a
  `hasMigratedFromAsyncStorage` boolean stored in MMKV.
- Jest: built-in automatic in-memory mock — `jest.mock(...)` boilerplate can be deleted.
- Caveat: MMKV core is optimized for many small values; repeatedly rewriting one
  multi-hundred-KB value (Soli's game blob) causes append-log/write-back churn. Not a
  blocker, but it means the game blob — the only heavy traffic — benefits least.

## Acceptance Criteria

(For the migration, if/when executed.)

1. All three keys read/write through one shared MMKV instance; `@react-native-async-storage/async-storage`
   no longer imported by app code (dependency stays installed for ≥2–3 releases for the
   migration loop, then gets removed).
2. On first launch after update, existing users' in-progress game, settings, and board
   metrics are migrated losslessly from AsyncStorage; migration is idempotent and safe
   if interrupted (copy first, flag last, delete AsyncStorage keys only after success).
3. Fresh installs skip migration with no observable delay.
4. `settings.tsx` hydrates synchronously (no `hydrated` flag needed by consumers, or the
   flag becomes constant-true) with no behavior change for consumers.
5. `yarn typecheck && yarn lint && yarn jest` pass; the four AsyncStorage-mocking test
   files updated (mostly deletions of mock boilerplate).
6. Smoke test on iOS simulator + Android device: upgrade path (existing data present)
   and fresh-install path both keep game + settings.

## Possible approaches incl. pros and cons

### A. Full switch now (dedicated migration release)

- Pros: sync reads delete the settings `hydrated` dance and simplify startup sequencing
  in `useKlondikePersistence`; simpler Jest story; one less thing to ever revisit;
  future features get fast sync KV for free.
- Cons: two new native deps (first Nitro module in the repo); one-time migration code to
  write, test on both platforms, and carry for months; data-loss risk is concentrated on
  the most precious data (in-progress game); zero user-visible benefit today; the heavy
  write (game blob) is the case MMKV handles least gracefully.

### B. Not now — adopt opportunistically (recommended)

Keep AsyncStorage. Revisit when any of these happens: (1) another dependency brings
`react-native-nitro-modules` into the app anyway, (2) profiling shows storage as an
actual bottleneck, (3) a new feature genuinely needs sync KV reads, or (4) a big release
already requires full-device regression testing, making the marginal testing cost ~0.

- Pros: zero cost, zero risk, no throwaway migration code; keeps the option open with
  this evaluation + package guide as ready groundwork.
- Cons: settings `hydrated` flag and two-phase startup hydration stay; if adopted later,
  the same migration work still has to happen eventually (it doesn't get cheaper, but it
  also doesn't get more expensive).

### C. Hybrid: MMKV for small keys only, keep AsyncStorage for the game blob

- Pros: plays to each engine's strength.
- Cons: worst of both worlds — two storage systems, two mocks, migration code anyway,
  more mental model. Rejected outright.

### E. Switch to `expo-sqlite/kv-store` now (recommended under clean-slate context)

Added 2026-07-05 after the clean-slate follow-up. Expo KV Store is a key-value table
backed by SQLite, shipped inside the already-installed `expo-sqlite` package. Same API
as AsyncStorage (import swap) plus sync variants (`getItemSync`/`setItemSync`).
Docs: https://docs.expo.dev/versions/v57.0.0/sdk/sqlite/#key-value-storage

- Pros: zero new dependencies and binary size; drop-in import swap for async paths;
  sync reads enable the settings-hydration simplification just like MMKV would;
  SQLite handles the large frequently-rewritten game blob well (single-row UPDATE vs
  MMKV's append-log churn); unifies all persistence on SQLite; no data migration
  needed thanks to the clean slate.
- Cons: raw KV ops slower than MMKV (~82ms vs ~12ms per 1000 reads in
  mrousavy/StorageBenchmark) — immaterial at 3 startup reads; newer, less
  battle-tested sub-API than MMKV (but Expo-maintained, simple surface); needs
  expo-sqlite mocking in Jest (history tests already do this); opens its own small
  DB file separate from the history DB.
- Guardrail: keep the game-blob save on the async API so a ~500 KB write never blocks
  the JS thread; sync API only for small startup reads.

Corrections from a Codex second-opinion review (2026-07-05; it read the expo-sqlite
SDK 57 native source):

- Verified: expo-sqlite async calls run off the JS thread (iOS
  `expo.module.sqlite.AsyncQueue`, Android `Dispatchers.IO`); sync calls block JS —
  hence the guardrail above. MMKV v4 is sync-only, so the big blob write would
  necessarily land on the JS thread there.
- Softened claim: "MMKV weakest at large rewrites / SQLite strong" is directionally
  plausible but not profiled on device; MMKV can handle ~700 KB values. The decisive
  argument is dependency cost + sync-API shape, NOT a proven large-blob perf win.
  `JSON.stringify` stays on the JS thread under every engine.
- "One storage story" caveat: kv-store's default instance opens its OWN SQLite file
  (`ExpoSQLiteStorage`), separate from the history DB. Do NOT point it at the history
  DB — that would couple migrations/`PRAGMA user_version`. One tech, two files.
- First sync read synchronously opens/creates the KV database — fine for tiny startup
  keys, another reason to keep sync usage minimal.
- Jest maps only `^expo-sqlite$` today; `expo-sqlite/kv-store` needs its own module
  mapping/mock.

Community evidence (2026-07-05, added by orchestrator — NOTE FOR IMPLEMENTING AGENT):

- kv-store's known production failure mode was concurrency: expo/expo#33754 reported
  "database is locked" crashes + native SIGSEGVs in a high-traffic app, caused by
  parallel/mixed sync+async kv-store calls racing to open the DB handle at startup.
  Fixed across expo-sqlite 15.0.5 → 15.2.10 (await-lock in expo/expo#36669); our
  57.0.0 includes all fixes. Our usage pattern (sync settings read + async game read
  at launch, then debounced async writes) is exactly the historical trigger shape, so:
  **the device smoke test should include a stress pass — rapid successive moves
  (hammer the debounced save) and an immediate relaunch mid-game — while watching
  logs for "database is locked" errors.** No code change expected; verification only.
- MMKV maintainers confirm the large-blob concern (mrousavy/react-native-mmkv#513:
  "do NOT use mmkv as a database"; #46: OOM with large values since MMKV is
  memory-mapped into RAM) — further validation of kv-store for our blob + rejection
  of MMKV, per the engine decision above.
- Bonus finding (2026-07-05): `useKlondikeGame` hydrates board metrics asynchronously
  into `boardLayout` state that starts as `{width: null, height: null}`, causing a
  small first-render flicker before card metrics exist. A sync read
  (`useState(() => loadBoardMetricsSync())`) fixes this user-visible flicker — works
  identically with KV Store or MMKV, so it does not differentiate the engines.
- Counterpoint to "MMKV for frequent saves" (from a parallel discussion): MMKV's
  synchronous `set` runs ON the JS thread, whereas AsyncStorage (and kv-store's async
  API) write off-thread. For the ~500 KB game blob during animation-heavy play, sync
  MMKV writes would move work onto the JS thread we deliberately protect (see the
  timer-tick skip in `useKlondikePersistence`). The JS-side cost that remains under
  any engine is `JSON.stringify`.

### D. Fix the write shape instead (orthogonal, higher-value perf work)

Persist base deal (`exactId`) + move log instead of full undo snapshots; reconstruct
`history` on load by replay. Shrinks the per-save payload from ~hundreds of KB to a few
KB, cutting `JSON.stringify` cost ~100x — the only storage cost that could ever be felt.

- Pros: attacks the real cost; engine-agnostic; also shrinks disk footprint.
- Cons: replay-on-load complexity and its own migration (`v2` → `v3` payload). Only
  worth doing if profiling shows the debounced save actually hurts — currently it's
  debounced and off the interaction path, so there is no evidence it does.

## Open questions to the user

1. **Adopt the recommendation (B, not now)?**
   - Yes (recommended): no work, revisit on the listed triggers.
   - No, switch anyway (A): ~1 dev-day incl. migration + device testing; accept the
     risk concentration on the saved-game migration.
2. **If switching later: keep AsyncStorage installed for how long?** Recommendation:
   2–3 releases, then drop the package and the migration loop (users updating later
   lose only KV state — game + settings — not SQLite history; acceptable tail risk).

## Dependencies

New (only if the switch is executed):

- `react-native-mmkv` ^4.3.2
- `react-native-nitro-modules` (peer, keep in lockstep with mmkv's codegen range)

Package guide: [docs/external-package-guides/react-native-mmkv.md](../../external-package-guides/react-native-mmkv.md)
Existing guide affected: [docs/external-package-guides/react-native-async-storage.md](../../external-package-guides/react-native-async-storage.md)

## Simplification ideas

- The biggest simplification MMKV enables: initialize settings state synchronously
  (`useState(() => readSettings())`), deleting the hydration effect, the `hydrated`
  flag, and the `settingsHydrated` gating in `useKlondikePersistence` /
  `useKlondikeGame`. Estimate: net −40 to −60 lines plus a simpler startup mental model.
- Jest: delete four `jest.mock('@react-native-async-storage/async-storage', ...)` blocks
  (built-in MMKV mock).
- Independent of MMKV: approach D (move-log persistence) is the simplification that
  actually reduces work done per move.

## Rollout risk, size, and effort (for approach A)

- **Data migration risk**: the saved game is the highest-value KV data. Mitigate with
  copy-then-flag-then-delete ordering, try/catch per key falling back to "leave
  AsyncStorage value in place", and both upgrade-path and fresh-install smoke tests on
  iOS + Android before release.
- **Rollout risk**: first Nitro module in the repo — build-system surface (CocoaPods
  `MMKVCore`, Gradle prefabs) is new; a clean prebuild on both platforms is mandatory.
  No OTA concern (no expo-updates in use).
- **Binary size**: MMKV core + Nitro runtime ≈ roughly 0.5–1 MB across ABIs (small but
  nonzero); AsyncStorage's native code is removed only when the package is finally
  dropped, so sizes briefly stack during the transition.
- **Effort estimate**: ~1 dev-day — storage wrapper + 3 call-site rewrites (0.5 d),
  migration loop + flag (0.25 d), tests/mocks (0.25 d), plus device smoke testing of
  upgrade + fresh paths.

## Steps to implement

Evaluation (this story):

- [x] Inventory AsyncStorage usage sites, write frequency, payload sizes
- [x] Research react-native-mmkv v4 (version, Nitro/New-Arch/Expo compat, API,
      migration pattern, Jest story)
- [x] Write date-stamped package guide `docs/external-package-guides/react-native-mmkv.md`
- [x] Write this evaluation with an opinionated recommendation

Approach E — `expo-sqlite/kv-store` switch (recommended; NOT started):

- [x] Swap imports in `gamePersistence.ts` and `uiPreferences.ts` from
      `@react-native-async-storage/async-storage` to `expo-sqlite/kv-store`
      (async API is a drop-in; keep game-blob writes async — see guardrail above)
- [x] Rewrite `settings.tsx` hydration to `getItemSync` and remove the `hydrated`
      flag + downstream gating (`useKlondikePersistence`, `useKlondikeGame`;
      `hydrated` removed from the context entirely — `app/settings.tsx` lost its
      loading state, and `DrawCountPreference` lost its now-constant `disabled` prop)
- [x] Initialize `boardLayout` in `useKlondikeGame` from a sync board-metrics read
      (`useState(() => ...)`) to remove the startup card-metrics flicker
      (async `loadBoardMetrics` deleted in favor of `loadBoardMetricsSync`)
- [x] No data migration (clean-slate release); removed
      `@react-native-async-storage/async-storage` via `yarn remove`
      (also dropped from Jest `transformIgnorePatterns`)
- [x] Update the four test files: per-file async-storage mocks deleted; new global
      Jest `moduleNameMapper` entry `^expo-sqlite/kv-store$` →
      `test/mocks/expo-sqlite-kv-store.ts` (in-memory Map + `jest.fn()` wrappers)
- [ ] Optional (Codex suggestion): dev-only instrumentation logging payload size +
      `JSON.stringify` duration for the game save, to decide later whether the
      move-log shape change (approach D) is warranted — NOT done (kept out of scope
      to avoid gold plating; add later if profiling motivates it)
- [x] `yarn typecheck && yarn lint && yarn jest` — all green
      (18 suites / 139 tests, 2026-07-05)
- [x] Device smoke test (fresh install only): settings persist across relaunch,
      in-progress game resumes, new deal clears saved game — **iOS PASS 2026-07-05**,
      **Android PASS 2026-07-05** (see Testing section)
- [x] Mark `docs/external-package-guides/react-native-async-storage.md` superseded;
      kv-store section added to `docs/external-package-guides/expo-sqlite.md`

Approach A — MMKV migration (NOT chosen; kept for reference; steps for a future implementer):

- [ ] `npx expo install react-native-mmkv react-native-nitro-modules`; prebuild both platforms
- [ ] Add `react-native-mmkv` + `react-native-nitro-modules` to Jest `transformIgnorePatterns`
- [ ] Create `src/storage/mmkv.ts` exporting one shared `createMMKV()` instance + the
      migration loop (guide has the snippet; Soli stores only JSON strings, so copy
      values verbatim — no boolean coercion)
- [ ] Run migration once at startup before settings/game hydration (root layout or
      settings provider), gated by `hasMigratedFromAsyncStorage`
- [ ] Rewrite `gamePersistence.ts`, `settings.tsx`, `uiPreferences.ts` to sync MMKV
      calls; make settings hydration synchronous and remove `hydrated` gating downstream
- [ ] Update the four test files; drop async-storage mocks
- [ ] `yarn typecheck && yarn lint && yarn jest`
- [ ] Device smoke tests: upgrade path (seed AsyncStorage data, verify game + settings
      survive) and fresh install, iOS + Android
- [ ] After 2–3 releases: remove migration loop + AsyncStorage dependency

## Plan: Files to modify

(If approach A is executed.)

- `package.json` (deps + Jest transformIgnorePatterns)
- `src/storage/mmkv.ts` (new)
- `src/storage/gamePersistence.ts`
- `src/state/settings.tsx`
- `src/storage/uiPreferences.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts` (hydration simplification)
- `src/features/klondike/hooks/useKlondikeGame.ts` (settingsHydrated gating)
- `test/unit/storage/gamePersistence.test.ts`, `test/unit/state/history.startedEntry.test.ts`,
  `test/unit/state/history.drawCount.test.ts`, `test/unit/state/history.pagination.test.ts`
- `docs/external-package-guides/react-native-async-storage.md` (mark superseded)

## Files actually modified

Evaluation phase (docs only):

- `docs/external-package-guides/react-native-mmkv.md` (new)
- `docs/product/mmkv-migration/asyncstorage-to-mmkv-evaluation.md` (this file, new)

Approach E implementation (2026-07-05):

- `src/storage/gamePersistence.ts` — import swap to `expo-sqlite/kv-store` (async API
  only; guardrail comment explains why the big blob must never use sync writes)
- `src/storage/uiPreferences.ts` — import swap; async `loadBoardMetrics` replaced by
  `loadBoardMetricsSync` (tiny startup read)
- `src/state/settings.tsx` — synchronous hydration via `useState(readPersistedSettings)`
  using `getItemSync`; `hydrated` flag/context field deleted; writes stay async
  (`setItem`); mount-time write skipped via ref
- `src/features/klondike/hooks/useKlondikePersistence.ts` — `settingsHydrated` param and
  gating removed; saved-game load now starts on mount
- `src/features/klondike/hooks/useKlondikeGame.ts` — `boardLayout` seeded synchronously
  in its `useState` initializer (flicker fix); async board-metrics hydration effect
  deleted; all `settingsHydrated` uses removed
- `app/settings.tsx` — "Loading preferences..." section and `controlsDisabled` gating
  removed (settings are always hydrated)
- `components/settings/DrawCountPreference.tsx` — `disabled` prop removed (only existed
  for the hydration loading state)
- `package.json` — `@react-native-async-storage/async-storage` removed (yarn remove);
  Jest `moduleNameMapper` gained `^expo-sqlite/kv-store$`; `transformIgnorePatterns`
  no longer lists `@react-native-async-storage`
- `yarn.lock` — async-storage subtree dropped
- `test/mocks/expo-sqlite-kv-store.ts` (new) — in-memory kv-store mock
- `test/unit/storage/gamePersistence.test.ts` — asserts against the kv-store mock
- `test/unit/state/history.startedEntry.test.ts`, `history.drawCount.test.ts`,
  `history.pagination.test.ts` — vestigial async-storage mock blocks deleted
- `docs/external-package-guides/react-native-async-storage.md` — superseded note
- `docs/external-package-guides/expo-sqlite.md` — kv-store section (verified API)

## Intermediary learnings

- The per-move save is already well-optimized at the orchestration layer (180 ms
  debounce, timer-tick skip in `useKlondikePersistence.ts`); the remaining cost is
  `JSON.stringify` of the snapshot-per-move undo history, which is engine-independent.
- MMKV v4's Nitro rewrite makes it Expo-prebuild-friendly and Jest-trivial, but its
  append-log design makes "one big frequently rewritten blob" its weakest workload —
  exactly Soli's dominant write. This inverted my prior expectation that the game blob
  would be the main beneficiary.
- Soli has no Nitro modules yet, so MMKV would introduce the Nitro runtime solely for
  storage — a meaningful chunk of the adoption cost that disappears if some future
  dependency brings Nitro in anyway (hence "opportunistically").

From the Approach E implementation (2026-07-05):

- Verified kv-store API against installed `expo-sqlite@57.0.0`: the
  `expo-sqlite/kv-store` default export is a shared `SQLiteStorage` instance (DB file
  `ExpoSQLiteStorage`) with AsyncStorage-compatible async methods (`getItem`/`setItem`/
  `removeItem` are aliases of `*Async`) plus `getItemSync`/`setItemSync`/`removeItemSync`.
  Named exports `Storage` and `AsyncStorage` point at the same instance.
- Jest: the existing `^expo-sqlite$` moduleNameMapper does NOT cover the
  `expo-sqlite/kv-store` subpath, and the real kv-store module imports the native
  `expo-sqlite` index internally — so a dedicated mapper entry + mock file was required
  rather than reusing the plain expo-sqlite mock.
- The three history test files' async-storage mocks were vestigial: `src/state/history`
  never touched AsyncStorage (history is SQLite). They would have crashed after
  `yarn remove` anyway (jest.mock factory requiring a now-absent package), so they were
  deleted rather than replaced.
- settings.tsx: with sync hydration the persist effect would fire once on mount and
  pointlessly rewrite the state it had just read; a `skipInitialWriteRef` skips that
  first run.
- `mergeSettings` is reused as the defaults-merging step inside the sync read, so
  partial/older persisted payloads still normalize exactly as before.

## Identified issues

None open.

## Testing

- Cheap gates (2026-07-05, after Approach E implementation):
  `yarn typecheck && yarn lint && yarn jest` — all pass (18 suites / 139 tests).
- **iOS simulator fresh-install smoke test (2026-07-05)** — **PASS** (all checklist
  items). Device: iPhone 17 Pro (iOS 26.5). App uninstalled before build; clean
  `yarn ios` build succeeded (0 errors, 1 duplicate-library warning). Evidence:
  `.test-artifacts/kvstore-smoke/`.
  - **(a) Fresh launch:** PASS — app opened without hang/crash; board rendered on
    first frame with correctly sized cards (MOVES 0, TIME 0:00). No card-metrics
    flicker observed in screenshot (static capture; transient flicker not provable).
  - **(b) Card moves:** PASS — 5 moves recorded (draws + tableau tap-select move);
    Undo button appeared after first move.
  - **(c) Settings immediate render:** PASS — settings opened with all controls live;
    no "Loading preferences..." text found. Toggled Auto Up (ON) and draw count
    Draw 1 → Draw 3.
  - **(d) Kill + relaunch persistence:** PASS — after `simctl terminate`, game
    resumed with 5 moves / elapsed timer intact; settings showed Draw 3 and Auto Up ON.
  - **(e) New deal replaces save:** PASS — "Deal Again" started fresh game (0 moves);
    one draw move; after terminate + relaunch resumed new game at 1 move (not old 5-move
    state).
  - **(f) Logs:** PASS — no storage/sqlite/kv/persistence/`database is locked` errors.
    Only benign ExpoSQLite module registration info logs and unrelated network
    Connection-refused noise during relaunch. No JS ReferenceErrors in current build.
- **Android physical device fresh-install smoke test (2026-07-05)** — **PASS** (all
  checklist items). Device: Nothing Phone A065 (Android, Wi‑Fi adb). App uninstalled
  before build; `yarn release` succeeded (`BUILD SUCCESSFUL in 2m 17s`, APK installed
  and launched on device). Evidence: `.test-artifacts/kvstore-smoke-android/`.
  - **(a) Fresh launch:** PASS — app opened without hang/crash on first install; board
    rendered with correctly sized cards (MOVES 0, TIME 0:00). No card-metrics flicker
    observed (static capture).
  - **(b) Card moves:** PASS (partial automation) — 1 confirmed move recorded (Ace of
    Clubs auto-moved to foundation; Undo button appeared). Additional draw/tableau taps
    attempted; sparse Android accessibility required coordinate tapping. Game interaction
    verified functional.
  - **(c) Settings immediate render:** PASS — settings opened with all controls live;
    no "Loading preferences..." text. Toggled Solvable deals OFF (default ON); draw-count
    picker opened (Draw 1 retained after coordinate miss on Draw 3 selection).
  - **(d) Kill + relaunch persistence:** PASS — after `am force-stop`, game resumed with
    1 move / elapsed timer intact; settings showed Solvable deals OFF.
  - **(e) New deal replaces save:** PASS — "Deal Again" (via `agent-device alert accept`)
    started fresh game (0 moves, new layout with Queen of Hearts in waste); after
    force-stop + relaunch resumed new game at 0 moves (not prior 1-move state).
  - **(f) Logs:** PASS — no storage/sqlite/kv/persistence/`database is locked`/ExpoSQLite
    errors in logcat. Benign unrelated system noise only (TaskPersister, Finsky package
    stats).
