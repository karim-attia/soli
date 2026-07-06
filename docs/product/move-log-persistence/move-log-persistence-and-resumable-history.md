# Move-Log Persistence — Approach D + Resumable History Schema

Created: 2026-07-06
Status: **All steps done. Steps 1–7 implemented and green (typecheck + lint + jest
170/170). Step 8 iOS device smoke PASSED (2026-07-06, all checks); Android physical
device smoke PASSED (2026-07-06, all checks, incl. the forward-scrub redo gesture
that iOS automation couldn't synthesize). Follow-ups F1–F3 (Karim's review round)
implemented 2026-07-06 — see "Follow-up steps". Simplification round 2 (S1–S5:
remove `e`, timer off GameSnapshot, top-level clock, clean-v1 reset, 4b-guardrail
audit) implemented 2026-07-06, gates green 21 suites / 171 tests — **iOS simulator
smoke after round 2 PASSED (2026-07-06, all checks incl. clean-v1 data inspection;
see "iOS simulator smoke after simplification round 2" in Testing).** Review fix
batch R1–R6 (two-review convergence on 9b8475f) implemented 2026-07-06, gates
green 22 suites / 179 tests — see "Review fix batch" steps; **iOS simulator smoke
after the review fix batch PASSED (2026-07-06, incl. live R6 crash-window repair;
see "iOS simulator smoke after review fix batch" in Testing).**

Origin: "Approach D" from
[docs/product/expo-sqlite-kv-store-migration/asyncstorage-to-expo-sqlite-kv-store.md](../expo-sqlite-kv-store-migration/asyncstorage-to-expo-sqlite-kv-store.md)
(persist base deal + move log instead of full undo snapshots). This story re-evaluates D
under two new inputs: (1) the clean-slate window is open right now (kv payload version
and the SQLite history schema can both change freely), and (2) D is no longer just a
perf optimization — it is the enabler for *resuming any game from the history screen
with a full undo scrubber*.

## User prompt

"Approach D says to rework active game history. Important to me: full history is still always available, undo is fast and always works super smooth incl. scrubber.

Pls evaluate whether we should do this. We have just done the migration described there, so we have a pretty clean slate and now is the change to be able to do it without performing complex migrations.

Also, would that be a chance to also save the game moves to the history so that a game can in the future be continued from the history? And then even with full undo scrubber?

BTW: migration of history to sql is not even live in app store. still just on my own 2 test devices. so we have a lot of freedom to still change the sql schema to make it perfect."

"implement now.
dont alter table. really fully from scratch. saves thoughts and lines of code. can fully reinstall on both the android device and the ios simulator if needed. data is useless there."

"1. yes, keeping future path is important to scroll back into future. what do we do when we scrub back to middle of the game and then do a move in another path from there? at this point, we can't reach the original future path again. so we could remove that stray branch. do we? would it make sense to? what do we do now?
2. sounds good! how was this before? at some point in the future, we could make it that undo in auto-up stops the auto up until another move is made. and even just stops the most recent up. but not now, it's nice like this. just an idea. also give me a real life snippet of how a game looks like.
3. pls do.
4. 1. pls do the null fix, seems easy.
4. 2. this looks like a real bug. was this here before? pls fix. once the game is started, it runs."

"pls implement what we discussed in 2a
remember: all data can be erased on both test devices. so no migration or even db version update. in fact, pls reset all dbs/schemas to without migration and v1. both history, settings, this.
if we do 2a, can we then have a look at the code again that we changed in 4b? did we add extra guardrails that are now unnecessary because we don't even think with this timestamp in move concept anymore?"

"use your judgement to implement what makes sense <3"

## Summary

**Implemented (2026-07-06): D1 engine + payload v3 + fresh v5 history schema, steps
1–7 — all cheap gates green (21 suites / 170 tests). Device smoke (step 8) pending.**

**Follow-up round (2026-07-06, after Karim's review): F1 legacy-v2 cleanup removed;
F2 active history rows show no "Time 0:00" (`durationMs: null`); F3 undo now
preserves the live timer (pre-existing bug — the clock could rewind/stick at 0:00
and get recorded as the game's duration). No MOVE_LOG_VERSION bump needed (analysis
in Intermediary learnings). Gates green: 21 suites / 172 tests.**

**Simplification round 2 (2026-07-06, "2a"): the timer is now fully out of the game
tree. `e` (elapsedMs at dispatch) removed from every `MoveLogEntry`; the timer
fields moved off `GameSnapshot` onto `GameState` (snapshots are boards, the clock is
one live monotonic value), so undo/scrub cannot touch the clock by construction and
F3's explicit timer-preservation lines dissolved; persisted payload carries a single
top-level `elapsedMs` (timerState derived on load, timerStartedAt never persisted);
all persistence identifiers reset to clean v1 (`soli/klondike/v1`,
`PERSISTENCE_VERSION = 1`, `soli-history.db`; settings/board-metrics keys were
already clean v1). 4b-guardrail audit answered in Intermediary learnings. Gates
green: 21 suites / 171 tests, net −40 lines.**
Decisions applied: no ALTER TABLE migration — fully fresh `soli-history-v5.db` per
Karim; `moves_json` written at game boundaries only; no move-log cap. One design gap
found and closed during implementation: deal-time Auto Up is a replay input (see
Intermediary learnings).

Original evaluation summary:

**Recommendation: do it now — Approach D plus the history-DB move-log column, in one
story.** The original verdict ("only if profiling shows the save hurts") was correct
for a pure perf play, but the frame has changed:

1. **The clean-slate window closes with the next release.** Today the active-game
   payload (`soli/klondike/v2` → `v3`) and the history DB schema (v1, only on Karim's
   two test devices) can both change with zero production migration code. After
   release, the same change costs a carried migration + rollout risk on the most
   precious data.
2. **D is the replay machinery that resumable history needs anyway.** Deal
   (`exactId` + `drawCount`) + ordered move log → replay through the pure reducer →
   identical state *including the full in-memory undo `history` array*. Persisting that
   same move log per history row makes "continue any past game with full scrubber" a
   pure UI feature later — no second engine effort.
3. **Determinism is verified (see Intermediary learnings):** the reducer is pure; deals
   reconstruct exactly from `exactId` (Lehmer-code permutation, not a seed); the only
   nondeterministic inputs (timer timestamps, deck-instance card-ID suffixes) are
   either excluded from the log or cosmetic. A stored final snapshot guards against
   future reducer drift, so *load never depends on replay for the current board* —
   replay only rebuilds undo depth.
4. **Hard requirements are preserved by construction:** undo/scrubber keep consuming
   the in-memory `history`/`future` snapshot arrays exactly as today — only the
   *persistence shape* changes. Full history remains unbounded. Replay of ~300 moves
   is estimated well under 100 ms, once, inside the already-async startup load.

Honest counterweight: this is ~1.5–2 sub-agent days of work for zero user-visible
change *today*, and it adds a replay/fallback code path that must be tested. If
resumable history were not on the roadmap, deferring would still be defensible. Since
Karim explicitly wants the schema "perfect now" and resume later, doing both halves now
(engine + schema, no resume UI) is the right cut.

## Description

Today the debounced save serializes the entire `GameState` including the undo
`history` and redo `future` arrays — one full ~3.5 KB board snapshot per move, ~350 KB
at 100 moves, ~700 KB at 200 — re-`JSON.stringify`ed on every debounced save. The
history DB stores only results (metadata + start preview), so a finished game's play
line is lost forever.

This story changes the *persistence shape* to: base deal identity + ordered move log +
final-state snapshot (guard). On load, the app replays the move log through the
existing pure reducer to rebuild the identical in-memory state — including the full
undo/redo snapshot arrays the scrubber consumes. The same move log is written into the
history row when a game ends, so any past game can later be resumed/reviewed with the
full scrubber.

Why this is nice and important:

- ~30–60x smaller persisted payload (~15–30 KB vs ~350–700 KB mid-game); the per-save
  `JSON.stringify` cost — the only storage cost that could ever be felt on the JS
  thread — shrinks proportionally.
- Unlocks the resumable-history product idea with the schema settled *before* the
  SQLite history ships to the App Store.
- Deletes the snapshot-normalization code in `gamePersistence.ts` (~100 lines) in
  exchange for a smaller, testable replay function.

## Acceptance Criteria

1. Playing moves, killing the app, and relaunching restores the exact same board,
   move counter, elapsed time (paused), and **full undo depth back to move 0** — the
   scrubber scrubs across the entire game as before the restart.
2. Redo (`future`) also survives restart: undo 5 moves, kill, relaunch → the scrubber
   can still scrub forward 5 steps (parity with today, where `future` is persisted).
3. Undo and the scrubber are untouched at runtime: they read the in-memory
   `history`/`future` arrays; no disk access, no replay during interaction.
4. The persisted active-game payload for a ~150-move game is ≤ ~40 KB (vs ~500 KB
   today).
5. When a game ends (solved or abandoned via new deal), its complete move log is
   stored on its history row (`moves_json`). Started/active rows may have `NULL`.
6. If replay of a stored move log fails or the replayed board mismatches the stored
   final snapshot (e.g. reducer changed between app versions), the app hydrates the
   final snapshot with empty undo history instead of corrupting or losing the game,
   and logs a dev warning. The game is never lost.
7. History list/pagination performance is unchanged (move-log column is not read by
   page queries).
8. The developer demo board (custom 42-card deal, not reconstructible from its
   `exactId`) still persists and restores via the snapshot fallback path.
9. `yarn typecheck && yarn lint && yarn jest` green; device smoke on iOS + Android.

## Possible approaches incl. pros and cons

### D1. Event log in GameState + kv-store payload v3 + history `moves_json` at game end (recommended)

The reducer appends a tiny serializable record to a new `state.moveLog` array in every
case that already mutates the board (`DRAW_OR_RECYCLE`, `APPLY_MOVE`, `UNDO`,
`SCRUB_TO_INDEX`, `ADVANCE_AUTO_QUEUE`, `SET_AUTO_UP_ENABLED`). Persistence saves
`{deal, moveLog, finalSnapshot}`. Load replays; on mismatch falls back to
`finalSnapshot`. Game-end recording copies `state.moveLog` into the history row.

- Pros: single source of truth (the reducer — same code path as live play, so replay
  is "free" correctness); undo/scrub events in the log mean `future` (redo) survives
  restart exactly like today; history rows get the *full story* of the game; the
  fallback snapshot means load never gambles on replay; write path count unchanged
  (still one debounced kv write per change, one history write per game boundary).
- Cons: reducer grows a field (moveLog must be excluded from snapshots); scrubbing
  back/forth appends entries (mitigated by coalescing consecutive scrub entries);
  slightly more total code than doing nothing.

### D2. Compacted move log (drop undone moves instead of logging undo events)

- Pros: smallest possible log; replay is a straight line.
- Cons: loses redo across restart (a behavior regression vs today); loses the
  full play story for history review (a future "watch my game" scrubber would only
  show the surviving line); undo semantics leak into persistence code instead of
  staying in the reducer. Rejected — D1's extra entries are ~20–60 bytes each.

### D3. Move the active game entirely into the history DB (active row gets the debounced writes; delete the kv game blob)

- Pros: literally one storage location; resume-from-history and resume-on-launch
  become the same code path.
- Cons: the active row is not guaranteed to exist at every moment the debounced save
  fires (linkage `historyEntryId` is nullable; recovery logic creates rows *after*
  hydration; demo games intentionally have no row) — the kv blob currently papers over
  all those gaps. Coupling the hot save path to the history DB's exclusive
  transactions and the serialized operation queue in `state/history.tsx` adds real
  failure modes for zero user benefit. Rejected: one tech (SQLite), two files stays
  the right shape (see the kv-store migration doc's "one storage story" caveat).

### D4. Separate `history_moves` table, append one row per move during play

- Pros: no write amplification (tiny INSERT per move instead of rewriting a JSON
  array); moves queryable individually.
- Cons: per-move SQLite transactions during animation-heavy play (the exact thing the
  180 ms debounce + timer-tick skip were built to avoid); undo/scrub events need
  ordering + cleanup semantics in SQL; more code, more invariants, two write paths to
  keep consistent. The whole-array rewrite D4 avoids is only ~15–30 KB once per
  debounce — not a problem worth a table. Rejected (revisit only if profiling ever
  flags the debounced write, which it has not at 20x this size).

### D5. Do nothing / defer (the original Approach D verdict)

- Pros: zero work, zero risk; today's save is debounced and off the interaction path
  with no measured pain.
- Cons: the clean-slate window closes — later this becomes payload `v3` migration +
  history schema migration carried in production; resumable history would then
  require this exact work *plus* migrations; the ~500 KB-per-save stringify keeps
  growing with future features. Rejected given the user's explicit resumable-history
  goal and "make the schema perfect now" framing. If that goal is dropped, defer is
  the honest answer.

## Open questions to the user

All decided by Karim (2026-07-06):

1. **Adopt D1 now (engine + payload v3 + history schema), resume-UI later?**
   → **YES.** Implement D1 now; no resume UI.
2. **History DB change: `ALTER TABLE` migration (v1→v2) or fresh DB file?**
   → **CHANGED from the recommendation: fully from scratch, no migration.** Karim:
   "dont alter table. really fully from scratch. saves thoughts and lines of code.
   can fully reinstall on both the android device and the ios simulator if needed.
   data is useless there." Concretely: `moves_json TEXT` + `move_log_version INTEGER`
   go directly into the base `CREATE TABLE`, `DATABASE_VERSION` stays 1, and the DB
   filename bumps `soli-history-v4.db` → `soli-history-v5.db` (the established
   pre-release pattern; the old v4 file is simply abandoned).
3. **Write `moves_json` per debounced save for the active row too?**
   → **NO** — game boundaries only (as recommended).
4. **Cap the move log?** → **No cap** (as recommended).

## Dependencies

None new. Uses installed `expo-sqlite` (history DB + kv-store) and the existing pure
reducer. Package guide: [docs/external-package-guides/expo-sqlite.md](../../external-package-guides/expo-sqlite.md).

## UX/UI Considerations

None in this story — no user-visible change. The future resume-from-history UI
(button on the history sheet, what happens to the currently active game, reviewing
solved games read-only vs forking them) is explicitly out of scope; this story only
guarantees the schema doesn't block it.

## Components

No component changes. `UndoScrubber.tsx` / `useUndoScrubber.ts` are intentionally
untouched: they consume `state.history.length` / `state.future.length` and dispatch
`SCRUB_TO_INDEX`; the in-memory arrays they rely on are reconstructed at load time and
identical thereafter.

## How to fetch data, how to cache

- Active game: unchanged flow — debounced async kv-store write
  (`useKlondikePersistence`, 180 ms debounce, timer-tick skip), async read once at
  startup, now followed by an in-memory replay.
- History move logs: written via the existing serialized `updateEntry` queue at game
  boundaries. **Not** selected by `getHistoryPage`/`getActiveHistoryEntry` (keeps list
  pages light); fetched on demand by a new `getHistoryEntryMoveLog(id)` when the
  resume UI lands.

## Related tasks

- Future story: "Resume game from history" UI (replay machinery from this story +
  active-row handoff + product decisions).
- Optional dev instrumentation from the kv-store migration doc (payload size +
  stringify duration) becomes obsolete — the payload will be trivially small.
- Karim's future idea (explicitly NOT now, 2026-07-06): undo during an auto-up run
  could halt auto-up until the next manual move — or, lighter, just cancel the most
  recent auto move. Today undo halts the queue for that instant but finalizeState
  immediately reschedules it while Auto Up stays enabled; Karim likes the current
  behavior for now.

## Simplification ideas

- Delete `normalizeSnapshots`/`normalizeSnapshot` and the snapshot-array validation in
  `gamePersistence.ts` (~100 lines) — replay makes them unnecessary. The v3 validator
  only checks the deal identity, the move-log entries, and one final snapshot.
- Move-log entries reuse the reducer's own action vocabulary (`Selection`,
  `MoveTarget`) — no parallel move DSL. (`src/solitaire/demoReplay.ts` has a
  card-anchored move format for solver traces; do NOT unify with it — its purpose is
  validating *foreign* solver output against expected cards, while ours is replaying
  *our own* deterministic reducer, where positional actions are exact and smaller.)
- Terse JSON keys for log entries (`k`, `sel`, `tgt`, `e`) keep a 300-move log around
  15–25 KB. Don't gzip/binary-encode — gold plating.

## Steps to implement

Instructions for the implementation sub-agent (read this whole doc first; update step
statuses as you go — never skip that):

- [x] **1. Move-log types + reducer recording** (`src/solitaire/klondike.ts`) — DONE.
  Deviations from the spec below (all recorded in Intermediary learnings): the
  `autoUp` entry also carries `e`; HYDRATE_STATE logs an `autoUp` entry when the
  hydration flips the setting; new exported `initialAutoUpFromMoveLog` derives the
  deal-time Auto Up value for the replay base; replay tolerates a no-op `scrub`
  entry (coalesced back-and-forth drag) instead of treating it as drift.
  - Add `MoveLogEntry` union (exported, versioned by `MOVE_LOG_VERSION = 1` const):
    - `{ k: 'draw'; e: number; rh?: false }` — DRAW_OR_RECYCLE (covers recycle;
      `rh: false` only when `recordHistory === false`, e.g. demo flows)
    - `{ k: 'move'; sel: Selection; tgt: MoveTarget; e: number; rh?: false }` — APPLY_MOVE
    - `{ k: 'undo'; e: number }`
    - `{ k: 'scrub'; i: number; e: number }` — SCRUB_TO_INDEX
    - `{ k: 'adv'; e: number }` — ADVANCE_AUTO_QUEUE
    - `{ k: 'autoUp'; on: boolean }` — SET_AUTO_UP_ENABLED (affects auto-queue
      scheduling determinism, so it must be in the log)
    - `e` = `state.elapsedMs` at dispatch time (patched onto state before replaying
      the entry so reconstructed snapshots carry the same elapsed values as the
      originals — `handleUndo` restores snapshot timer fields, so this matters).
  - Add `moveLog: MoveLogEntry[]` to `GameState` (NOT to `GameSnapshot` — snapshots
    must stay log-free or the payload explodes quadratically). Initialize `[]` in all
    factories; `HYDRATE_STATE` takes `action.state.moveLog ?? []`.
  - Append entries in exactly the reducer cases above, only when the case actually
    changed the board (e.g. no entry when `DRAW_OR_RECYCLE` hits empty stock+waste, or
    `SCRUB_TO_INDEX` clamps to the current index). Coalesce consecutive `scrub`
    entries (replace the last entry if it is also `scrub`) so a drag doesn't append
    dozens of intermediate indices.
  - Add pure `replayMoveLog(base: GameState, log: MoveLogEntry[]): GameState` that
    maps each entry back to its `GameAction`, patches `elapsedMs` from `e` before
    dispatching, and folds through `klondikeReducer`. Throw (or return a tagged
    failure) on any entry whose action leaves state unchanged — that signals drift.
- [x] **2. Persisted payload v3** (`src/storage/gamePersistence.ts`) — DONE. Old v2
  key removed once on load; normalizers deleted; `boardSignature` exported for tests.
  - `KLONDIKE_STORAGE_KEY = 'soli/klondike/v3'`, `PERSISTENCE_VERSION = 3`. No v2
    migration (clean slate — old key is simply never read again; optionally
    `removeItem` the v2 key once on load).
  - Payload: `{ version, savedAt, status, historyEntryId, moveLogVersion, deal:
    { exactId, drawCount, revealInitialWaste }, moveLog, finalSnapshot, autoUpEnabled }`
    where `finalSnapshot = snapshotFromState(state)` (~3.5 KB, includes timer fields).
  - `revealInitialWaste`: normal deals reveal the first draw at deal time; demo
    playlist replays are created with `revealInitialWaste: false`. Record the flag on
    `GameState` at factory time (new field `initialWasteRevealed: boolean`) so the
    replay base is built identically. Demo boards (`exactId === DEMO_EXACT_DEAL_ID`,
    custom 42-card tableau) are not reconstructible from their exactId — persist them
    with `moveLog: []` so load takes the snapshot-fallback path by design (comment
    this).
  - Load path: build base via `createGameStateFromExactId(deal.exactId,
    deal.drawCount, { revealInitialWaste })` → `replayMoveLog` → compare the replayed
    board with `finalSnapshot` using a cheap board signature (piles as
    `suit-rank-faceUp` strings; ignore card `id` — deck-instance suffixes differ by
    design). On match: hydrate the replayed state (its card IDs are internally
    consistent across current board + history + future, which keeps undo animations
    glitch-free — do NOT mix stored-snapshot cards with replayed history). On
    mismatch/`moveLogVersion` bump/replay throw: hydrate `finalSnapshot` via
    `cloneSnapshot` with empty `history`/`future`, devLog warn. Keep today's timer
    normalization (running → paused) on the hydrated result.
  - Delete `normalizeSnapshots`/`normalizeSnapshot` and the v2 snapshot validation.
- [x] **3. Save-path plumbing** (`src/features/klondike/hooks/useKlondikePersistence.ts`) — DONE.
  - No structural change: `didGameShapeChange` already fires for every case that
    appends a log entry except `SET_AUTO_UP_ENABLED`; add `previous.moveLog !==
    next.moveLog` to the comparison to cover it.
- [x] **4. History schema: fresh v5 DB file, no migration** (DONE) (`src/storage/historyRepository.native.ts`,
  `.types.ts`, `src/state/history.tsx`) — per Karim's decision (open question 2)
  - Bump `DATABASE_NAME` to `soli-history-v5.db`; keep `DATABASE_VERSION = 1`. Add
    `moves_json TEXT` and `move_log_version INTEGER` directly to the base
    `CREATE TABLE`. No v1→v2 migration code; the old v4 file is abandoned (test
    devices get reinstalled).
  - Do NOT add `moves_json` to the page/active/summary SELECTs or to `HistoryEntry`
    (keeps pages light). Add repository fn `getHistoryEntryMoveLog(id): Promise<{
    moveLogVersion: number; moveLog: MoveLogEntry[] } | null>` + a no-op web variant —
    proves the schema end-to-end and is what the future resume UI will call.
  - Extend `UpdateEntryInput` with optional `moveLog: { version: number; entries:
    MoveLogEntry[] } | null` and write it in `updateHistoryEntry`/`insertHistoryEntry`
    params (serialize to `moves_json`).
- [x] **5. Record move log at game boundaries** — DONE.
  (`src/features/klondike/hooks/useKlondikeHistoryEntry.ts`)
  - In `recordCurrentGameResult`, include `moveLog: { version: MOVE_LOG_VERSION,
    entries: currentState.moveLog }` in `resultFields` (both the tracked-entry update
    and the fallback paths). Skip for demo boards (already excluded via
    `demoPlaybackActiveRef`).
- [x] **6. Tests** — DONE (see Testing section for what landed where).
  - Reducer/replay: fuzz test — deal from a fixed `exactId`, apply ~150 random valid
    actions (moves, draws, undos, scrubs, auto-up toggles, auto-queue advances),
    serialize v3, load, assert board signature + `history`/`future` signatures +
    `moveCount` + counters deep-equal the live state (ignoring card-ID suffixes).
  - Redo survival: undo 3, round-trip, assert `future.length === 3` and scrub-forward
    works.
  - Fallback: corrupt one log entry → load returns final snapshot with empty history,
    no throw. Also `moveLogVersion` bump → fallback.
  - Payload size guard: assert a 150-move payload stringifies < 60 KB (regression
    tripwire, generous bound).
  - History repo: fresh-schema test asserting the base `CREATE TABLE` contains the
    new `moves_json`/`move_log_version` columns (replaces the migration test — no
    migration exists anymore), `moves_json` written on solved/incomplete update,
    `getHistoryEntryMoveLog` round-trip, page query unchanged.
  - Rough replay timing: `console.log` a 300-move replay duration in one test as
    evidence (expect single-digit ms in Node; no assertion).
- [x] **7. Cheap gates**: `yarn typecheck && yarn lint && yarn jest` — ALL GREEN
  (21 suites, 170 tests). `yarn format` run on modified files only.
- [x] **8. Device smoke (sub-agent, one platform at a time, never parallel builds)**
  - **iOS: DONE (2026-07-06), all checks PASS** — fresh install on iPhone 17 Pro
    simulator, clean `yarn ios`. Details + evidence in the Testing section below.
    One automation limitation: the scrubber's forward-scrub *drag* could not be
    synthesized (XCTest pans don't activate the RNGH Pan gesture in this app;
    taps work) — redo-stack survival was proven instead via the persisted log's
    undo entries + the scrubber UI rendering at index 0 after relaunch (only
    possible when `future.length > 0`). A 10-second manual forward-scrub after
    relaunch remains a nice-to-have manual confirmation.
  - **Android: DONE (2026-07-06), all checks PASS** — fresh install (uninstall +
    `yarn release`) on the Nothing Phone A065 over Wi-Fi adb. Details + evidence in
    the Testing section. Notably the forward-scrub (redo) *drag* that could not be
    automated on iOS **worked on Android** (`gesture pan` on the Undo button), so
    redo-stack survival across restart is now proven directly, not just indirectly.
- [x] **9. Update this doc** (statuses, files actually modified, learnings, test
  results) and add the inline "why" comments called out above (fallback-by-design for
  demo boards, why moveLog is excluded from snapshots, why card IDs must come from one
  replay) — DONE; all called-out comments are in the code.

### Follow-up steps (Karim's review round, 2026-07-06)

- [x] **F1. Remove the legacy v2 cleanup** (`gamePersistence.ts`) — DONE. Deleted
  `LEGACY_V2_STORAGE_KEY` + the one-time `removeItem` in `loadGameState` and its
  test. Rationale: the v2 key in kv-store only ever existed on Karim's 2 test
  devices, both freshly reinstalled during the smoke tests; App Store builds wrote
  v2 to AsyncStorage, which this build cannot read anyway — so there is no device
  where the cleanup could ever delete anything.
- [x] **F2. Active history rows show no "Time 0:00"** (`state/history.tsx`) — DONE.
  `createStartedHistoryEntryInputFromState` now creates active rows with
  `durationMs: null` (type widened to `number | null` so it's explicit);
  `app/history.tsx` already skips null; SQLite `duration_ms` column is nullable.
  Real duration is written at game end, unchanged.
- [x] **F3. Undo must not rewind/stop the clock** (`klondike.ts` `handleUndo`) —
  DONE. Pre-existing bug (predates the move-log story): undo restored the
  snapshot's `elapsedMs`/`timerState`/`timerStartedAt`. Now undo preserves the live
  timer fields exactly like `scrubToIndex`. No MOVE_LOG_VERSION bump needed (see
  Intermediary learnings for the full determinism analysis). Stale comments at
  `MoveLogEntry.e` / `MOVE_LOG_VERSION` updated; three focused unit tests added.

### Simplification round 2 ("2a" — timer out of the game tree, clean v1, 2026-07-06)

Mental model adopted (Karim's): the timer is ONE live monotonic value updated by
ticks, never influenced by moves/undo/scrub, persisted once — snapshots are boards,
not clocks.

- [x] **S1. Remove `e` from the move log** (`klondike.ts`) — DONE. Dropped from all
  six `MoveLogEntry` variants and every `appendMoveLogEntry` call site;
  `replayMoveLog` is a plain fold (per-entry elapsed patching deleted; drift throw
  and coalesced-scrub no-op tolerance kept). Stale `e`-rationale comments rewritten.
  `MOVE_LOG_VERSION` stays 1: nothing shipped, the format changes in place. Old
  test-device payloads are simply orphaned — the storage key changed too (S4), so
  the new build reads nothing and deals fresh; both fine per Karim.
- [x] **S2. Timer fields off `GameSnapshot`** (`klondike.ts`) — DONE.
  `elapsedMs`/`timerState`/`timerStartedAt` live on `GameState` only. `handleUndo`
  and `scrubToIndex` now spread the cloned snapshot board over the live state, so
  they CANNOT touch the clock (or moveLog/deal flag/autoUpEnabled) by construction —
  F3's explicit preservation lines dissolved. `cloneSnapshot` returns a plain
  `GameSnapshot` (board clone) instead of a `GameState`. `boardSignature` needed no
  change (it always was a Pick of board fields; it never carved out timer fields
  explicitly).
- [x] **S3. Persisted payload: top-level clock** (`gamePersistence.ts`) — DONE.
  `finalSnapshot` no longer carries timer fields; payload gains top-level
  `elapsedMs`. On load `timerState` is derived ('paused' when moveCount > 0 or
  elapsedMs > 0, else 'idle'), `timerStartedAt` always null; the old
  running→paused normalization + `isTimerState` deleted. Verified:
  `resumeTimerIfNeeded` (paused && moveCount>0 && !hasWon) resumes correctly; a
  loaded won game is cleared at startup by `useKlondikePersistence` and `!hasWon`
  blocks resume regardless. `computeElapsedWithReference` +
  `useKlondikePersistence` timer-boundary checks read live GameState — untouched,
  confirmed.
- [x] **S4. Clean v1 everywhere** — DONE. Game payload: `soli/klondike/v1`,
  `PERSISTENCE_VERSION = 1` (no legacy-key references existed since F1). History
  DB: `soli-history.db` (was `soli-history-v5.db`), `DATABASE_VERSION = 1` + the
  cheap unsupported-version guard kept; comment rewritten to the new convention
  (pre-release schema changes rename/wipe the DB file, no migrations before the
  first App Store release). Settings (`@soli/settings/v1`) and board metrics
  (`soli/ui/boardMetrics/v1`) were already clean v1 — left as is. Grep confirmed no
  other persistence-related v2–v5/legacy/migration remnants in `src/` (remaining
  matches are unrelated: solvable-deals catalog v2 naming, a tamagui-config
  comment, base36 deal IDs).
- [x] **S5. 4b-guardrail audit** — DONE, see the dedicated Intermediary-learnings
  entry ("Answer to Karim's 4b question") for what was removed vs. kept.
- [x] **S6. iOS simulator smoke after round 2** — DONE (2026-07-06), all checks
  PASS (fresh install, restore + running clock through undos/relaunches, clean-v1
  kv payload without timer fields in the snapshot, `soli-history.db` with
  `e`-free `moves_json`, clean logs). Details in Testing → "iOS simulator smoke
  after simplification round 2".

### Review fix batch (internal + Codex review convergence, 2026-07-06)

Two independent code reviews of commit 9b8475f converged on these findings. R2
fixes were written failing-test-FIRST (all four new R2 tests verified failing
against the pre-fix reducer before the fixes landed; R2a failed with exactly the
predicted depth drift, replayed future 5 vs live 3).

- [x] **R1. Depth-aware replay guard** (`gamePersistence.ts`) — DONE.
  `boardSignature` covers piles + moveCount only; replay drift in undo/redo
  *depth* passed silently (wrong scrubber depths). The persisted payload now
  carries `guard: { historyLength, futureLength, hasWon, autoCompleteRuns }`
  (captured at save); after a successful replay + signature match the guard is
  compared against the replayed state → any mismatch takes the snapshot fallback
  (devLog warn). Guard fields are validated on load. Payload shape changed in
  place, `PERSISTENCE_VERSION` stays 1 (pre-release; old payloads on the 2 test
  devices fail validation and are cleared — acceptable, Karim confirmed data is
  disposable). Tested: tampered guard → fallback; guard-less payload → invalid.
- [x] **R2a. Scrub coalescing vs auto-up** (Codex's top finding, `klondike.ts`) —
  DONE, failing test first. Scrub #1 landing on an auto-ready board makes
  finalizeState schedule a queue → pushes a history snapshot + clears future;
  scrub #2's coalescing replaced scrub #1's log entry, losing that push → replay
  drift. Fix: coalesce only when safe — `appendMoveLogEntry` gained a
  `coalesce: false` escape used when the pre-scrub board (= the previous scrub's
  landing board; board changes are always logged so nothing changed it in
  between) is auto-schedulable (`state.autoUpEnabled &&
  isAutoCompleteReady(workingState)`); then the entry is appended instead of
  replacing. Conservative: a ready board whose auto-plan is empty also appends
  (harmless; extra scrubs replay exactly). No live-scheduling semantics change
  (scrubbing onto an auto-ready board still starts the run); no log-size
  regression for the common non-auto-ready drag.
- [x] **R2b. Unlogged finalize on same-value SET_AUTO_UP_ENABLED and dangling
  ADVANCE_AUTO_QUEUE** (`klondike.ts`) — DONE, tests first. Both could newly
  schedule a queue (unlogged history push). Same-value toggles now return `state`
  unchanged (both directions); the dangling empty-queue advance returns the
  flag-cleared state without finalize. Safety reasoning: every board-changing
  action is logged and its own finalize schedules; a queue halted by SELECT_*
  (which doesn't finalize) is legitimately rescheduled by the next logged
  action's finalize — no scheduling is lost, it just stops piggy-backing on
  unlogged dispatches. Two pre-existing autoUpSetting tests that piggy-backed on
  the same-value-enable side effect were switched to value-flipping toggles
  (their intent — scheduling trigger conditions — is unchanged).
- [x] **R2c. Tighten scrub no-op tolerance in `replayMoveLog`** — DONE, tests in
  both directions. Previously ANY non-applying scrub entry was skipped; now only
  a true no-op (entry targets the current position, `entry.i ===
  state.history.length` — the coalesced back-to-origin drag) is tolerated;
  anything else (e.g. a clamped index) throws as drift.
- [x] **R3. Fallback robustness** (`gamePersistence.ts` `loadGameState`) — DONE.
  (1) `isStructurallySoundSnapshot` deep-walks the stored snapshot (four suit
  arrays, tableau of card arrays, `{suit, rank, faceUp}`-shaped cards) —
  deliberately NOT part of the upfront payload validator, so a corrupted snapshot
  with a valid log stays recoverable; (2) replay now happens in its own try/catch
  and the snapshot comparison runs only when the snapshot is sound — a malformed
  snapshot can no longer veto a successful replay (replayed state is kept with a
  warn, unverifiable beats unrecoverable); (3) failed replay + unusable snapshot
  throws `PersistedGameError('invalid')` (hook clears storage) instead of an
  unhandled rejection from `cloneSnapshot`. Tested: malformed snapshot + valid
  log → replayed state survives with full depths; malformed snapshot +
  unreplayable log → PersistedGameError, no crash.
- [x] **R4. Honest history move logs** — DONE. New exported
  `moveLogForGameRecord` in `useKlondikeHistoryEntry.ts`: at game end, a session
  with `moveLog: []` but `moveCount > 0` (= truncated by a snapshot-fallback
  load, not replayable) records `moveLog: null` (SQL NULL) instead of an
  apparently-valid empty log a future resume feature would misread as "initial
  deal". `getHistoryEntryMoveLog` now validates parsed entries structurally via
  new `isMoveLogEntry` (exported from `klondike.ts`, single source of truth for
  the entry shape: known `k`, required fields per kind) instead of a blind cast;
  returns null on invalid. Both tested.
- [x] **R5. Delete dead `PLACE_ON_TABLEAU`/`PLACE_ON_FOUNDATION` reducer
  actions** — DONE. They applied board changes without logging; production only
  ever dispatched APPLY_MOVE. Action types + reducer cases + their 5 tests
  deleted (grep-verified nothing in src/ or app/ dispatches them; a short
  deletion note remains at the reducer). The earlier "trade-off comment" about
  them not logging is moot now that they're gone.
- [x] **R6. Won-game history durability** — DONE (implemented, ~25 lines).
  Decision rationale below in Intermediary learnings. **Device-verified on the
  iOS simulator (2026-07-06): the exact crash window was staged at the data
  level (won payload + linked row still 'active') and the startup repair
  finalized the row correctly — see Testing.**
- [x] **Extras** — DONE. Payload-size test bound tightened 60 KB → 40 KB (matches
  acceptance criterion 4; passes with the new guard fields — a 150-action payload
  is well under it). Fuzz round-trip driver now drains scheduled auto-queues only
  partially ~30% of the time (0–2 advances, deterministic-seeded), so saves,
  scrubs and undos land mid-auto-run — the class of hole the old drain-fully
  driver could never catch (SET_AUTO_UP_ENABLED toggles were already fuzzed).
- [x] **Gates**: `yarn typecheck` ✓ `yarn lint` ✓ `yarn jest` ✓ — **22 suites,
  179 tests** (was 21/171: +1 suite `historyMoveLogRecord`, +13 new tests, −5
  deleted PLACE_ON_* tests).

Consciously skipped (review findings assessed, not fixed): mid-auto-run debounce
loss — a kill during an auto-run can lose the last few queue advances from the
debounced save; pre-existing and self-healing (the restored board replays and the
remaining auto-run reschedules on hydration finalize), not worth new save-path
complexity.

## Plan: Files to modify

- `src/solitaire/klondike.ts` — `MoveLogEntry`, `moveLog` on `GameState`,
  `initialWasteRevealed` flag, reducer appends, `replayMoveLog`
- `src/storage/gamePersistence.ts` — payload v3, replay-on-load, fallback; delete
  snapshot normalizers
- `src/features/klondike/hooks/useKlondikePersistence.ts` — `moveLog` in
  `didGameShapeChange`
- `src/storage/historyRepository.native.ts` — schema v2 migration, new columns,
  `getHistoryEntryMoveLog`
- `src/storage/historyRepository.types.ts`, `src/storage/historyRepository.web.ts` —
  contract + web no-op
- `src/state/history.tsx` — `UpdateEntryInput.moveLog`, write-through
- `src/features/klondike/hooks/useKlondikeHistoryEntry.ts` — include move log in
  result recording
- `test/unit/storage/gamePersistence.test.ts`, `test/unit/solitaire/*` (new replay
  tests), `test/unit/state/history.*.test.ts`, `test/mocks/expo-sqlite.ts` (if the
  mock needs ALTER TABLE support)

## Files actually modified

Implementation (2026-07-06):

- `src/solitaire/klondike.ts` — `MOVE_LOG_VERSION`, `MoveLogEntry` union, `moveLog` +
  `initialWasteRevealed` on `GameState`, log appends in the six reducer cases (plus
  HYDRATE_STATE autoUp-flip logging), scrub coalescing, `replayMoveLog`,
  `initialAutoUpFromMoveLog`; `snapshotFromState`/`cloneSnapshot` exported.
- `src/storage/gamePersistence.ts` — rewritten for payload v3 (`soli/klondike/v3`):
  deal + moveLog + finalSnapshot; replay-on-load with `boardSignature` verification;
  snapshot fallback; one-time v2-key removal; `normalizeSnapshots`/`normalizeSnapshot`
  and v2 validation deleted (~100 lines gone).
- `src/features/klondike/hooks/useKlondikePersistence.ts` — `moveLog` reference check
  in `didGameShapeChange`.
- `src/storage/historyRepository.native.ts` — fresh `soli-history-v5.db`, base CREATE
  TABLE gains `moves_json TEXT` + `move_log_version INTEGER`, split UPDATE statements
  (with/without move-log columns), `getHistoryEntryMoveLog`.
- `src/storage/historyRepository.types.ts` — `HistoryEntryMoveLog` type; repository
  contract extended (insert/update moveLog param, `getHistoryEntryMoveLog`).
- `src/storage/historyRepository.web.ts` — matching no-op signatures.
- `src/state/history.tsx` — `moveLog` on `UpdateEntryInput` + `RecordGameResultInput`,
  passed through to the repository (never stored on `HistoryEntry`).
- `src/features/klondike/hooks/useKlondikeHistoryEntry.ts` — `moveLog` in
  `resultFields` (covers tracked-entry update, matching-active update, repository
  active-row update, and the record-new-row fallback — all spread the same object).
- `test/unit/storage/gamePersistence.test.ts` — rewritten for v3 (fuzz round-trip,
  redo survival, fallbacks, size guard, key hygiene).
- `test/unit/solitaire/klondike.moveLog.test.ts` — NEW (reducer recording, coalescing,
  replay, drift guard, timing evidence).
- `test/unit/storage/historyRepository.test.ts` — NEW (fresh-schema assertions,
  moves_json write-through, `getHistoryEntryMoveLog` round-trip, light page query).
- `test/unit/solitaire/helpers.ts`, `klondike.autoMoveFallback.test.ts`,
  `klondike.autoUpSetting.test.ts`, `klondike.drawCount.test.ts` — fixtures gained the
  two new `GameState` fields.
- `test/mocks/expo-sqlite.ts` — unchanged (repo tests stub the database object
  directly; no ALTER TABLE support needed since there is no migration).

Follow-up round (2026-07-06):

- `src/storage/gamePersistence.ts` — F1: `LEGACY_V2_STORAGE_KEY` + one-time
  `removeItem` deleted.
- `src/state/history.tsx` — F2: active rows created with `durationMs: null`
  (+ why-comment); `RecordGameResultInput.durationMs` widened to `number | null`.
- `src/solitaire/klondike.ts` — F3: `handleUndo` preserves live
  `elapsedMs`/`timerState`/`timerStartedAt` (+ product-decision comment); stale
  `e`-rationale comment rewritten; `MOVE_LOG_VERSION` comment gains the
  board-vs-timer bump nuance.
- `test/unit/storage/gamePersistence.test.ts` — v2-key-removal test deleted (F1).
- `test/unit/state/history.startedEntry.test.ts` — expects `durationMs: null` (F2).
- `test/unit/solitaire/klondike.undo.test.ts` — three new timer-preservation tests
  (running timer survives undo-to-0; paused stays paused at live elapsed; undo from
  won keeps the stopped clock) (F3).

Simplification round 2 (2026-07-06):

- `src/solitaire/klondike.ts` — `e` removed from `MoveLogEntry` + all append sites;
  timer fields moved `GameSnapshot` → `GameState`; `handleUndo`/`scrubToIndex`
  restructured to `{ ...state, ...cloneSnapshot(board) }` (F3 preservation lines
  dissolved); `cloneSnapshot` returns `GameSnapshot`; `replayMoveLog` plain fold;
  comments at `MOVE_LOG_VERSION`/`MoveLogEntry`/`appendMoveLogEntry` rewritten.
- `src/storage/gamePersistence.ts` — key `soli/klondike/v1`, `PERSISTENCE_VERSION
  = 1`; top-level `elapsedMs` in the payload (+ validator check); derived
  `timerState` on load; `isTimerState` + running→paused normalization deleted.
- `src/storage/historyRepository.native.ts` — `soli-history.db`; DB-name comment
  rewritten to the no-migrations-pre-release convention.
- `test/unit/solitaire/klondike.undo.test.ts` — F3's three timer tests consolidated
  into two pins under "undo/scrub never change the clock".
- `test/unit/solitaire/klondike.moveLog.test.ts` — `e` removed from expectations.
- `test/unit/storage/gamePersistence.test.ts` — v1 payload expectations (top-level
  clock, snapshot without timer fields); `snapshotSignature` timer carve-out
  removed; fuzz generator's no-two-scrubs-in-a-row constraint removed (only existed
  because coalescing dropped intermediate `e` values).
- `test/unit/storage/historyRepository.test.ts` — `e` removed from fixtures;
  describe wording updated.

Review fix batch (2026-07-06):

- `src/solitaire/klondike.ts` — R2a: safe scrub coalescing (`coalesce` option on
  `appendMoveLogEntry`, schedulability check in SCRUB_TO_INDEX); R2b: same-value
  SET_AUTO_UP_ENABLED returns `state`, dangling empty-queue ADVANCE_AUTO_QUEUE no
  longer finalizes; R2c: replay tolerates only position-matching no-op scrubs;
  R4: exported `isMoveLogEntry` structural validator; R5: PLACE_ON_TABLEAU /
  PLACE_ON_FOUNDATION action types + cases deleted.
- `src/storage/gamePersistence.ts` — R1: `guard` block in the payload
  (serialize + validate + post-replay comparison); R3: `isStructurallySoundSnapshot`
  deep walk, replay/verification restructure, invalid error for
  corrupt-snapshot-plus-unreplayable-log.
- `src/features/klondike/hooks/useKlondikeHistoryEntry.ts` — R4: exported
  `moveLogForGameRecord` (null for fallback-truncated sessions), used in
  `resultFields`.
- `src/storage/historyRepository.native.ts` — R4: `getHistoryEntryMoveLog`
  validates entries via `isMoveLogEntry`.
- `src/features/klondike/hooks/useKlondikePersistence.ts` — R6: won-game startup
  path finalizes a still-active linked history row from the payload before
  clearing (uses `useHistory`'s `getActiveEntry`/`updateEntry`).
- `test/unit/solitaire/klondike.moveLog.test.ts` — R2a depth-drift round-trip
  (failing-first), R2c drift-throw test.
- `test/unit/solitaire/klondike.autoUpSetting.test.ts` — R2b same-value no-op
  tests; two existing tests switched to value-flipping toggles.
- `test/unit/solitaire/klondike.autoQueue.test.ts` — R2b dangling-advance test.
- `test/unit/solitaire/klondike.selection.test.ts` — R5: PLACE_ON_* describe
  block deleted.
- `test/unit/storage/gamePersistence.test.ts` — R1 guard tests (tamper →
  fallback, missing → invalid), R3 tests (malformed snapshot × valid/unreplayable
  log), 40 KB bound, partial-drain fuzz driver.
- `test/unit/storage/historyRepository.test.ts` — R4 invalid-entry tests.
- `test/unit/features/klondike/historyMoveLogRecord.test.ts` — NEW
  (`moveLogForGameRecord`).

## Intermediary learnings

Verified code facts from this evaluation (2026-07-06):

- **Deal reconstruction is exact.** `exactId` is a Lehmer-code (factoradic) encoding of
  the full 52-card permutation (`src/solitaire/dealIdentity.ts`), not a PRNG seed —
  `decodeExactDealId` rebuilds the deck exactly; `deckChecksum` (FNV-64) verifies it.
  `drawCount` is fixed per game at deal time (part of `GameState`, never mutated
  mid-game; the settings preference only applies to *new* deals).
- **The reducer is pure and deterministic** given (base state, ordered actions). Fresh
  deals are deliberately built *outside* the reducer (comment "A4" in `klondike.ts` —
  StrictMode double-invocation). Auto-complete is deterministic: `scheduleAutoQueue`
  runs inside `finalizeState`, plans the whole queue from state, pushes ONE history
  snapshot for the run; `ADVANCE_AUTO_QUEUE` then applies `queue[0]` with
  `recordHistory: false`. So replaying the logged action sequence (including `adv`
  and `autoUp` entries) reproduces auto-runs exactly.
- **Nondeterminism inventory:** (1) timer actions carry `Date.now()` — excluded from
  the log; per-entry `elapsedMs` snapshots restore timer fidelity (note: at the time
  of writing `handleUndo` restored the snapshot's `elapsedMs`/`timerStartedAt` while
  `scrubToIndex` preserved the live timer — that quirk was REMOVED in follow-up F3,
  undo now preserves the live timer too; `e` stays, see the F3 learning below);
  (2) card `id`s carry a per-process `deckInstanceCounter`
  suffix (animation identity) — cosmetic, but all cards in a hydrated state must come
  from ONE replay so IDs stay consistent across `history`/`future`, otherwise undo
  would remount every animated card; (3) `expo-crypto` randomness only in deal/ID
  creation, never in the reducer; (4) no hint feature mutates state.
- **Scrubber data source confirmed:** `useUndoScrubber` reads only
  `state.history.length` + `state.future.length` (mirrored into Reanimated shared
  values; gesture math on the UI thread) and dispatches rAF-throttled
  `SCRUB_TO_INDEX`; the reducer's `scrubToIndex` splices the in-memory snapshot
  timeline. Nothing touches storage during interaction → keeping in-memory snapshots
  and changing only the persistence shape fully preserves scrub smoothness.
- **Current persistence:** kv-store key `soli/klondike/v2`, full `GameState` incl.
  `history` + `future` snapshot arrays, 180 ms debounced async write, timer-tick
  writes skipped; ~100 lines of per-snapshot normalization on load. `historyEntryId`
  linkage rides in the payload.
- **Current history schema (v1, `soli-history-v4.db`, not in App Store):** single
  `history_entries` table — id, exact_id, deck_checksum, display_name, started_at,
  finished_at, solved, draw_count, moves, duration_ms, preview_json, status — indexes
  on `started_at DESC`, `exact_id`, and a partial unique index enforcing one
  `status='active'` row. Rows are written at game boundaries only (start / solved /
  abandoned), via a serialized operation queue in `state/history.tsx`.
- **Payload sizes (estimate, consistent with the verified numbers in the kv-store
  doc):** snapshot ≈ 3.5 KB (52 cards × ~55 B + pile structure); persisted blob ≈
  (moves+1) × 3.5 KB → ~500 KB at 150 moves. Move-log entry ≈ 20 B (`draw`) to
  ~90 B (`move` with selection+target) → 300-entry log ≈ 15–25 KB + 3.5 KB final
  snapshot. **~30–60x smaller.**
- **Replay cost estimate:** one reducer step ≈ cloning the touched piles + one full
  board snapshot push (52 card objects) — the same work as a live move, tens of μs in
  release Hermes. 300 moves ≪ 100 ms, once, inside the already-async load (board
  shows the placeholder deal until `HYDRATE_STATE` either way). Memory is unchanged —
  the in-memory arrays exist today too.
- **`src/solitaire/demoReplay.ts` already proves the replay pattern** (playlist
  fixtures replayed through `klondikeReducer` with exact-card validation) — but its
  card-anchored move format serves foreign solver traces; the persistence log stays
  positional/action-shaped (smaller, exact by construction).

Discovered during implementation (2026-07-06):

- **Auto Up at deal time is a hidden replay input the plan missed.** The replay base
  must be created with the Auto Up value that was in effect when the deal happened —
  Auto Up gates `scheduleAutoQueue`, which pushes a history snapshot, so replaying
  with the wrong value silently drifts the undo depth (the final board can still
  match!). Solution without a new payload field: every post-deal change is logged
  (`SET_AUTO_UP_ENABLED` case + a HYDRATE_STATE flip entry when the settings value
  differs from the incoming state), and `initialAutoUpFromMoveLog` walks back from
  the first logged toggle (first toggle means the value was its opposite before; no
  toggles means the saved value never changed).
- **`autoUp` log entries need `e` too** (the plan's spec omitted it): enabling Auto
  Up can immediately schedule an auto-queue, which pushes a history snapshot carrying
  the elapsed time at toggle.
- **Coalesced scrubs can replay as no-ops.** A drag that scrubs away and releases
  back at the origin coalesces into a single `scrub` entry targeting the current
  index — the reducer returns the state unchanged for it. `replayMoveLog` therefore
  tolerates a no-op result for `scrub` entries only; any other no-op still throws as
  drift. Accepted trade-off (commented in `appendMoveLogEntry`): intermediate
  timeline snapshots re-inserted during one drag keep the last scrub's elapsedMs.
- **Replay regenerates the move log itself.** Replaying the logged actions through
  the reducer appends the same entries again (elapsed patched from `e` makes them
  byte-identical), so a restored session round-trips through save/load indefinitely —
  covered by an explicit second-cycle assertion in the fuzz test.
- **Timer fields on the hydrated result must come from the final snapshot**, not the
  replayed state: the replayed top-level `elapsedMs` stops at the last log entry's
  `e`, while timer ticks after the last move only live in the snapshot.
- **Fallback drops the log on purpose.** After a snapshot-fallback load the session's
  `moveLog` restarts empty, so every later save of that session keeps taking the
  fallback path (board always preserved; undo depth lost once). Graceful, no special
  casing needed.
- **`PLACE_ON_TABLEAU`/`PLACE_ON_FOUNDATION` reducer cases are UI-dead** (only tests
  dispatch them; the app uses `APPLY_MOVE`). They intentionally do NOT log; if a
  future caller dispatches them the final-snapshot guard catches the missing entries
  and falls back. Candidate for deletion in a cleanup story. → **DELETED in the
  review fix batch (R5, 2026-07-06).**
- **Node replay timing evidence: 300 draw entries ≈ 5 ms** (Jest/Node, debug) —
  consistent with the ≪100 ms release-Hermes estimate.

Follow-up round (Karim's review, 2026-07-06):

- **Stray redo branches stay in the move log by design (Q1).** When you scrub back
  mid-game and play a different move, the reducer clears `future` — the original
  forward path becomes unreachable in the UI, but its entries remain in the log.
  Replay reproduces the exact same truncation (the same move clears the replayed
  `future`), so nothing drifts. Removing the stray branch would mean rewriting the
  log outside the reducer (new complexity, new invariants) to save a few hundred
  bytes — and the full play story including abandoned branches may serve a future
  "watch my game" feature. Decision: keep them.
- **F3 determinism analysis — why undo's timer change needs NO MOVE_LOG_VERSION
  bump.** The rule "any reducer behavior change must bump" has a nuance: only
  changes affecting the *board* or the *history/future snapshot contents* must.
  Checked for old logs replayed under the new reducer: (1) piles and history/future
  depths are untouched — `handleUndo`'s structural logic didn't change; (2)
  `boardSignature` (the replay-verification guard) ignores timer fields; (3) the
  elapsedMs embedded in every replayed history/future snapshot is governed by the
  per-entry `e` patch, not by what `handleUndo` leaves on the live state — snapshots
  are only pushed by moves/draws/auto-runs (and undo pushing the pre-undo state to
  `future`), and in all those cases the pushed elapsed equals the entry's `e` in
  both old and new behavior; (4) the state's transient elapsed between an undo and
  the next entry differs (old: snapshot's stale value; new: live value) but is
  re-patched at the next entry and never captured anywhere — and hydration takes
  the live timer fields from the `finalSnapshot` regardless. Verified by the fuzz
  round-trip (which compares per-index snapshot elapsedMs) staying green across the
  change. A comment at `MOVE_LOG_VERSION` documents the nuance.
- **What `e` is still needed for after F3.** With undo AND scrub now both
  preserving the live timer, no reducer path restores snapshot timer fields to the
  clock anymore — `e` no longer affects any user-visible value today. It stays
  because (1) it keeps replayed history/future snapshots byte-faithful to the
  originals (fuzz-tested invariant; these are the per-move times a future
  resume-from-history / "watch my game" scrubber would display), (2) replay
  regenerates the log itself, and patching `e` makes regenerated entries identical
  so repeated save/load cycles stay stable, and (3) dropping it would itself be a
  log-format change requiring a version bump, for a saving of a few bytes per entry.
- **F3 won-state edge case (undo from a won board).** The win handler
  (`useKlondikeHistoryEntry`) stops the timer when `hasWon` flips true, so the live
  timer at undo time is `paused` at the final duration. New behavior preserves
  exactly that: after the undo the board rewinds (win flag recomputed to false by
  `finalizeState`) and the clock stays paused — no "won-paused timer running"
  hazard.   `useKlondikeTimer` restarts the clock on the next `moveCount` increase
  (undo doesn't increase it) or on focus/app-state resume (`resumeTimerIfNeeded`
  requires `!hasWon`, which undo just cleared). Old behavior resurrected the pre-win
  snapshot's `running` timer instead; the new "paused until you actually move" is
  the more sensible product behavior and is unit-tested.

Simplification round 2 (2026-07-06):

- **Answer to Karim's 4b question ("did 4b add guardrails that are now
  unnecessary?"): yes — and round 2 removed them.** Audit of what F3 added vs.
  what survives:
  - *Removed:* the explicit `timerState`/`timerStartedAt`/`elapsedMs` preservation
    lines in `handleUndo` (and the equivalent pre-existing ones in `scrubToIndex`),
    plus the `moveLog`/`initialWasteRevealed` re-attachment lines — undo/scrub now
    spread the restored board over the live state, and since `GameSnapshot` carries
    none of those fields, the restore cannot touch them. Compile-time guarantee
    instead of runtime discipline.
  - *Removed:* F3's long mechanics comment in `handleUndo` (how the snapshot timer
    used to leak, wall-clock self-correction, 0:00 sticking) and the
    `MOVE_LOG_VERSION` nuance paragraph about the per-entry `e` patch — both
    reasoned about a concept (`e` / snapshot timers) that no longer exists.
  - *Removed:* the `e` field itself with its three-point keep-rationale (snapshot
    byte-fidelity, log regeneration stability, version-bump avoidance) — all three
    reasons collapsed once snapshots stopped carrying timers: replayed snapshots
    are trivially identical, regenerated entries are trivially identical, and the
    format change happened anyway inside the unshipped clean-slate window.
  - *Kept (intentionally):* the one-line product comment "undo rewinds the board,
    not the clock" at `handleUndo` (product decision, not mechanics); two slim
    behavioral pin tests in `klondike.undo.test.ts` (live running clock survives
    undo-to-0 + scrub; undo from a won board keeps the paused final duration and
    recomputes the win flag) — they pin the *product* behavior against future
    restructuring, e.g. someone reintroducing timer fields to snapshots; the F3
    learning entries in this doc as history.
- **The fuzz test got stronger, not weaker.** The "never two scrubs in a row"
  constraint in `playRandomGame` existed only because scrub coalescing dropped
  intermediate `e` values, which failed the exact per-snapshot elapsed comparison.
  With clocks out of snapshots the constraint is gone and consecutive scrubs are
  fuzzed again. `snapshotSignature` keeps only the card-id carve-out (deck-instance
  suffixes still differ between saving and replaying process by design — byte
  equality of snapshots is NOT expected because of ids, timer fields no longer the
  reason).
- **Why MOVE_LOG_VERSION stays 1 despite a log-format change:** versioning exists
  to protect *shipped* payloads from replaying under drifted rules. Nothing has
  shipped; the only existing payloads live on Karim's two test devices and are
  explicitly disposable. The storage key reset (`soli/klondike/v3` → `…/v1`) makes
  the point moot anyway: the new build never reads the old key, so old payloads are
  orphaned and the app deals fresh (no validation error path is even hit). The old
  `soli-history-v5.db` file is likewise abandoned by the rename to
  `soli-history.db`.
- **Derived timerState replaces persisted timerState.** 'paused' when the loaded
  game has progress (moveCount > 0 or elapsedMs > 0), else 'idle';
  `timerStartedAt` is a transient wall-clock anchor and is always null after load.
  This is equivalent to the old running→paused normalization for every state the
  app can actually save (the timer starts on the first move and never returns to
  idle mid-game), with less persisted surface.
- **F3 fixes the Android smoke observation.** The Android check-e note ("Incomplete
  row shows Time 0:00 because the game was abandoned while scrubbed... existing
  timer quirk") was this exact bug: abandoning after undo-to-0 recorded the deal
  snapshot's 0:00 as the game's duration. With F3 the recorded duration reflects
  the real live elapsed time.

Review fix batch (2026-07-06):

- **Why the R2a bug hid from the fuzz and the smokes: a self-healing degeneracy.**
  When scrub #1 lands on a ready position and schedules, the destroyed `future`
  tail often consists only of a copy of the landing board — in that case the
  scheduling push recreates exactly what was destroyed and replay coincidentally
  matches. Divergence needs ≥ 2 timeline entries after the landing position (built
  in the failing test via a manual move on an already-ready board, which pushes
  twice: applyMove's pre-move snapshot + scheduleAutoQueue's post-move snapshot).
  The old fuzz driver drained every queue immediately, so a scheduled queue never
  survived into the next scrub — hence the new partial-drain driver.
- **`MOVE_LOG_VERSION` stays 1 despite R2's reducer-behavior changes.** The bump
  rule protects *shipped* logs from replaying under drifted rules. Nothing has
  shipped, and R1's payload change (required `guard` block) makes every
  pre-batch payload fail validation and get cleared anyway, so no old log can
  ever reach the changed reducer. (Also: same-value toggles and dangling advances
  were never logged, and coalescing changes only what gets *written*, not how
  entries replay.)
- **R2b removed behavior a couple of tests silently depended on.** The
  autoUpSetting suite dispatched same-value `SET_AUTO_UP_ENABLED(true)` as a
  convenient way to trigger scheduling. That convenience WAS the bug (an unlogged
  scheduling path reachable from the settings-mirror effect in useKlondikeGame,
  which dispatches on every mount/focus with an unchanged value after e.g. a
  SELECT_* halted the queue). The tests now flip the value; the mount-time mirror
  dispatch is a pure no-op.
- **R1 guard vs signature: complementary, not redundant.** The board signature
  catches wrong *piles*; the guard catches wrong *depths* (`history`/`future`
  lengths, `hasWon`, `autoCompleteRuns`) — R2a-class bugs can reproduce the exact
  final board while silently shifting depths, and per-index snapshot comparison
  would be much more code + payload than four counters. Note the guard still
  can't see different *content* at equal depth (a mid-timeline snapshot swap);
  accepted as beyond the cheap-guard budget — the fuzz's per-index signature
  assertions cover that class in CI.
- **R6 decision: implemented (not skipped), ~25 lines, one new (acceptable)
  coupling.** `useKlondikePersistence` now consumes `useHistory` (both hooks
  already live under the same provider in useKlondikeGame). On loading a `won`
  payload with a `historyEntryId`, it asks the repository for THE active row
  (`getActiveEntry` awaits the serialized write queue, so a normally-committed
  win shows the row as 'solved' and the repair is a no-op) and only if that
  active row IS the linked entry finalizes it from the payload: solved + moves +
  `elapsedMs` as duration (the win handler stopped the clock, so it is the final
  duration) + `savedAt` as finishedAt + `moveLogForGameRecord(state)`. Then the
  session is cleared as before. Alternative rejected: threading a callback from
  useKlondikeHistoryEntry through useKlondikeGame — more plumbing across three
  files for the same effect. Not unit-tested (hook harness heavy; the branch is
  guarded and logs its action) — flagged for the iOS smoke instead.
- **Review finding consciously NOT fixed: mid-auto-run debounce loss.** A kill
  during an auto-run can lose the last few queue advances (the 180 ms debounced
  save hasn't fired). Pre-existing, self-healing by design: the restored board
  replays to the last-saved position and, being auto-ready with Auto Up on,
  hydration's finalize reschedules the remaining run. Fixing it would mean
  save-path special-casing for zero user-visible benefit.

## Identified issues

- Demo board (`DEMO_EXACT_DEAL_ID`) is a custom 42-card layout not derivable from its
  exactId → handled by design via the snapshot-fallback path (empty undo history after
  restoring a demo session — acceptable, dev-only). Status: DONE — serializer writes
  `moveLog: []` for it, loader short-circuits to fallback, both commented + tested.
- Reducer-behavior drift across app versions would make old logs replay differently →
  handled by `moveLogVersion` + final-snapshot verification + fallback. Status: DONE —
  bump-reminder comment sits at `MOVE_LOG_VERSION` in `klondike.ts`; version-mismatch
  and corrupted-entry fallbacks are tested.
- Scrub-drag would spam log entries → coalesce consecutive `scrub` entries in the
  reducer. Status: DONE (`appendMoveLogEntry`), incl. the no-op-replay edge (see
  Intermediary learnings) — both tested.
- Deal-time Auto Up value is a replay input → discovered during implementation,
  handled via logged toggles + `initialAutoUpFromMoveLog`. Status: DONE, tested.
- Unlogged history pushes from `scheduleAutoQueue` on paths without a move-log
  entry (scrub coalescing, same-value autoUp toggles, dangling advances) →
  review fix batch R2a–c. Status: DONE, failing-tests-first, all green.
- Replay depth drift invisible to `boardSignature` → R1 guard block in the
  payload. Status: DONE, tested. Residual (accepted): equal-depth content drift
  is only covered by the fuzz, not the runtime guard.
- Malformed `finalSnapshot` could veto a successful replay or crash the fallback
  → R3 restructure. Status: DONE, tested.
- Fallback-truncated sessions wrote an empty-but-valid `moves_json` → R4
  (`moveLog: null` + read-side structural validation). Status: DONE, tested.
- Won session cleared at startup before its history result committed → row stuck
  'active' without result → R6 startup repair in useKlondikePersistence. Status:
  DONE — device-verified on iOS (2026-07-06, staged crash window; see Testing).
- Mid-auto-run debounce loss (kill during auto-run loses the last few advances)
  → consciously skipped: pre-existing, self-healing (hydration finalize
  reschedules the remaining run). Status: WON'T FIX.

## Testing

Cheap gates (2026-07-06): `yarn typecheck` ✓, `yarn lint` ✓, `yarn jest` ✓ —
**21 suites, 170 tests, all passing** (was 19 suites / 151 tests before this story;
2 new suites, old v2 persistence tests rewritten).

Follow-up round (2026-07-06): gates re-run green after F1–F3 — `yarn typecheck` ✓,
`yarn lint` ✓, `yarn jest` ✓ **21 suites, 172 tests** (was 170: +3 undo-timer tests,
−1 v2-key test; the fuzz round-trip and moveLog replay suites — which exercise undos heavily — passed
unchanged, confirming the F3 no-bump analysis). New/changed tests: 3 added in
`klondike.undo.test.ts`, 1 removed from `gamePersistence.test.ts` (v2 key), 1
adjusted in `history.startedEntry.test.ts`. A "recorded duration after undos" test
at the hook level was skipped on purpose: `recordCurrentGameResult` reads the live
`elapsedMs`/`timerState` via `computeElapsedWithReference`, so the reducer-level
elapsed-preservation tests cover the observable behavior without a heavy hook
harness.

Simplification round 2 (2026-07-06): gates green — `yarn typecheck` ✓, `yarn lint`
✓, `yarn jest` ✓ **21 suites, 171 tests** (was 172: F3's three undo-timer tests
consolidated into two; the fuzz round-trip now also covers consecutive scrubs, see
Intermediary learnings). Net code delta this round: −40 lines. Device smoke: see
"iOS simulator smoke after simplification round 2" below — PASSED 2026-07-06.

Review fix batch (2026-07-06): gates green — `yarn typecheck` ✓, `yarn lint` ✓,
`yarn jest` ✓ **22 suites, 179 tests** (was 171: +13 new — R2a depth-drift
round-trip, R2c drift throw, 2 same-value no-ops + 1 flip-schedules pin, 1
dangling-advance, 2 R1 guard, 2 R3 fallback, 1 R4 repo validation, 3
`moveLogForGameRecord`; −5 deleted PLACE_ON_* tests). All four R2 tests were
verified FAILING against the pre-fix reducer first (R2a with exactly the
predicted future-depth drift 5 vs 3). The fuzz round-trip now partially drains
auto-queues (deterministic-seeded) and stays green post-fix; the payload-size
bound is 40 KB per acceptance criterion 4.

What landed where:

- `test/unit/storage/gamePersistence.test.ts` — v3 payload shape (no snapshot arrays
  serialized); seeded 150-action fuzz round-trip (moves/draws/undos/scrubs/auto-up
  toggles/auto-queue drains with a running timer) asserting board signature, per-index
  history+future snapshot signatures incl. elapsedMs, counters, single card-id deck
  instance across board+history+future, and a second save/load cycle; redo survival
  (undo 3 → reload → future 3 → scrub forward matches); corrupted-entry fallback;
  moveLogVersion-bump fallback; demo-board fallback with empty serialized log;
  payload < 60 KB at 150 actions; v2-key removal; draw-count normalization; invalid
  JSON / unknown version / missing fields errors; clearGameState.
- `test/unit/solitaire/klondike.moveLog.test.ts` — entry recording per action with
  `e`; no entries for no-op actions; dispatch-order recording; scrub coalescing;
  coalesced-back-to-origin no-op replay; log-only rebuild of board+history+future and
  log regeneration; drift throw; `initialAutoUpFromMoveLog`; 300-entry replay timing
  (≈5 ms in Node, logged as evidence).
- `test/unit/storage/historyRepository.test.ts` — fresh v5 schema contains
  `moves_json`/`move_log_version` in the base CREATE TABLE with `user_version = 1`
  (replaces the planned migration test per Karim's decision); insert writes the
  serialized log; update touches the log columns only when a moveLog argument is
  passed; `getHistoryEntryMoveLog` round-trip incl. null/damaged rows; page query
  never selects `moves_json`. (Stub database object — asserts issued SQL/params, not
  a real SQL engine.)

### iOS device smoke (2026-07-06) — PASS

Setup: app uninstalled from booted iPhone 17 Pro simulator (fresh-install path),
clean `yarn ios` build, installed + launched verified. Automation via agent-device
0.18.3 using the a11y labels/testIDs from AGENTS.md. Evidence screenshots in
`.test-artifacts/move-log-smoke-ios/`; OS log captured to `sim-log.txt` there.

| # | Check | Result | Evidence / notes |
|---|-------|--------|------------------|
| a | Fresh launch: board renders, MOVES 0 | PASS | `a-fresh-launch.png`; MOVES 0, TIME 0:00, full board a11y tree |
| b | 13 moves (9 draws, 2 foundation, 1 tableau + reveals), then 2 undos | PASS | `b-13-moves-undo-2.png`; waste back to 10♥, stock 15 |
| c | Kill (simctl terminate) + relaunch: board/moves/time restored | PASS | `c-restored-after-kill.png`; identical board, MOVES 13, timer resumed from paused value (no dead-time jump) |
| d | HEADLINE: undo depth + redo stack survive relaunch | PASS | Right after relaunch one undo stepped to the exact move-10 snapshot (incl. its elapsedMs 0:52 — snapshot timer restore quirk works; NOTE: that quirk was removed post-smoke in follow-up F3, undo now keeps the live clock); 10 more undos reached the exact initial deal (`d2-undone-to-move-0.png`); relaunch at index 0 still shows the scrubber UI (`d3-...png`, only rendered when `history+future > 0`, here history=0 ⇒ future=13) and persisted `moves_json` shows all 13 undo entries appended to the surviving log. Forward-scrub drag itself couldn't be machine-synthesized (see limitation below) |
| e | Deal Again → old game recorded; fresh v5 history | PASS | `e-history-after-deal-again.png`; History shows exactly 2 rows from this session (Incomplete 13-moves row + new Active row), nothing else — fresh `soli-history-v5.db` confirmed on disk |
| f | `moves_json` non-null on finished row (sqlite3 in app container) | PASS | Incomplete row: `move_log_version=1`, `moves_json` len 900 with the full entry sequence (2 moves, draws, undos incl. post-relaunch ones — log continuity across restarts proven); active row NULL as designed |
| g | Auto Up OFF → 3 moves → kill → relaunch → undo depth | PASS | Persisted log starts with `{"k":"autoUp","on":false}` (deal-time derivation input); after relaunch 3 undos restored the exact initial board (`g1`/`g2-*.png`); second relaunch at index 0 with future=3 still shows scrubber (`g3-*.png`) |
| h | Logs: sqlite errors, "database is locked", replay warnings, JS exceptions | PASS | None. OS log (113k lines) has only benign network/runningboard lines; Metro log only pre-existing warnings (Worklets `current`, tamagui module skip) |

Payload size evidence: active-game kv value `soli/klondike/v3` = **4,108 bytes** at 3
moves (~3.5 KB of that is the final snapshot). No `soli/klondike/v2` key present.

Not covered on iOS (noted for Android agent / manual):

- Forward-scrub (redo) drag as a physical gesture — agent-device XCTest pans/swipes
  do not activate the RNGH Pan gesture on the Undo button (5 variants tried; taps
  work fine). Redo-stack survival proven indirectly (see d/g). **Now covered: the
  gesture worked on Android (see Android smoke, check d) — manual iOS check no
  longer needed.**
- Auto-complete near a win + kill mid-run (needs a nearly-won board; not reachable
  in a smoke-length session).
- Old-v2-payload upgrade path (fresh install has no v2 data; unit-tested).

### Android physical device smoke (2026-07-06) — PASS

Setup: app uninstalled from the Nothing Phone A065 (Wi-Fi adb), then fresh
`yarn release` (BUILD SUCCESSFUL, APK installed 12:29, app version 0.8.0, MainActivity
resumed — verified via dumpsys). Automation via agent-device 0.18.3 using the Android
a11y labels from AGENTS.md. Evidence in `.test-artifacts/move-log-smoke-android/`;
logcat captured to `logcat.txt` (launch→mid-test) + `logcat-tail.txt` (buffer dump
covering force-stop→history).

| # | Check | Result | Evidence / notes |
|---|-------|--------|------------------|
| a | Fresh launch: board renders, MOVES 0 | PASS | `a-fresh-launch.png`; MOVES 0, TIME 0:00, full a11y tree (labels like "Queen of spades, column 5", "Stock, 23 cards") |
| b | 11 moves (7 draws, Q♠→K♦, A♥+2♥ to foundation, 2♦→3♠ + reveals), then 2 undos | PASS | `b0-11-moves.png` (MOVES 11), `b-11-moves-undo-2.png`; undos verified via a11y: stock 16→18, waste top 7♦→Q♣ |
| c | Force-stop (`am force-stop`) + relaunch: board/moves/time restored | PASS | `c-restored-after-kill.png`; logcat confirms full proc kill + cold start (new pid); identical board, MOVES 11, timer resumed from paused 1:50→1:55 (no dead-time jump) |
| d | HEADLINE: undo depth + redo stack survive relaunch | PASS | After relaunch, 9 more undos reached the exact initial deal (`d1-undone-to-move-0.png` matches `a-fresh-launch.png`: stock 23, waste 8♥, empty foundations, TIME 0:00, Undo disabled). **Forward-scrub worked on Android** (unlike iOS automation): `gesture pan +350px` on the Undo button scrubbed from index 0 forward to move 11 — a11y confirms stock 16, waste 7♦, hearts foundation 2♥ (`d2-after-forward-scrub.png`), i.e. the full rebuilt `future` array incl. the 2 pre-kill undone moves was redone. Direct proof of redo-stack survival |
| e | Deal Again → old game recorded; fresh v5 history | PASS | `e-history-after-deal-again.png`; History shows exactly 2 rows (Incomplete, 11 moves + new Active row) — fresh `soli-history-v5.db`, no leftovers from the uninstalled build. Note: the Incomplete row shows Time 0:00 because the game was abandoned while scrubbed (undo restores snapshot elapsedMs; scrub preserves it) — existing timer quirk, not a persistence bug. FIXED post-smoke in follow-up F3: undo now preserves the live clock, so abandoned-after-undo games record their real duration |
| f | Pull DB / inspect `moves_json` | SKIPPED (as anticipated) | Release build: `run-as` refuses ("package not debuggable"), `/data/data` permission denied. `moves_json` content already verified on iOS |
| g | Logs: "database is locked", sqlite errors, replay/persistence warnings, JS crashes | PASS | None in ~23k logcat lines. Only unrelated system noise (DemoModeController NPEs from SystemUI, vendor perf warnings). Single `ReactNativeJS: Running "main"` per launch, `libexpo-sqlite.so` loads cleanly |

Environment notes (no impact on results): Wi-Fi adb dropped twice mid-run
(agent-device session recreated; the streaming logcat capture died once — hence the
two log files) and the screen locked once between commands (recovered with
`scripts/android-unlock-pattern.sh`; screen timeout temporarily raised to 10 min and
restored to 150 s afterwards). Device left on the Play screen with the fresh active
deal.

### iOS simulator smoke after simplification round 2 (2026-07-06) — PASS

Verifies the round-2 state: no `e` in move-log entries, timer off `GameSnapshot`,
top-level `elapsedMs`, key `soli/klondike/v1` (PERSISTENCE_VERSION 1), DB
`soli-history.db`. Setup: app uninstalled from booted iPhone 17 Pro simulator, no
stale xcodebuild/gradle processes, clean `yarn ios`, install + launch verified
(CFBundleVersion 13, process running). Automation via agent-device 0.18.3.
Evidence in `.test-artifacts/move-log-v1-smoke-ios/`; OS log in `sim-log.txt`
there (36k lines).

| # | Check | Result | Evidence / notes |
|---|-------|--------|------------------|
| a | Fresh launch: board renders, MOVES 0, clean logs | PASS | `a-fresh-launch.png`; MOVES 0, TIME 0:00, full a11y tree (waste A♥, stock 23) |
| b | 11 moves (9 draws, A♥→foundation, 7♣→8♦), timer past 0:30, then 3 undos — clock keeps running | PASS | `b0-11-moves.png` (MOVES 11, 1:20), `b-11-moves-undo-3.png`; timer across the 3 undos read 1:51 → 1:53 → 1:55 → 2:13, monotonically increasing, never rewound |
| c | Kill (simctl terminate, 20 s dead time) + relaunch: restore + timer resumes | PASS | `c-restored-after-kill.png`; identical board, MOVES 11, A♥ still on foundation; timer restored near the saved ~2:15 (first post-launch read 2:40 after snapshot-runner spin-up, i.e. less than the 40 s wall gap → no dead-time jump, no 0:00 reset) and proven ticking (3:43 → 3:50 across 6 s, later 6:35 → 6:39 → 6:44) |
| c2 | Undo/scrub to move 0 after relaunch: board = initial deal, clock still running | PASS | 8 more undos (11 total) reached the exact initial deal — foundations empty, waste A♥, stock 23, matches `a-fresh-launch.png` (`c2-undone-to-move-0.png`); clock at 9:20 and still ticking |
| c3 | Redo/scrub forward + second relaunch at index 0 | PASS (redo indirect) | Same iOS automation limitation as the first smoke: `gesture pan` on the Undo button (2 variants) does not activate the RNGH Pan, so the forward drag couldn't be synthesized (proven directly on Android in the earlier smoke). Indirect proof after a second kill+relaunch at index 0: scrubber/Undo UI rendered (only when history+future > 0; here history = 0 ⇒ future = 11) and the persisted log carried all 11 `undo` entries; timer restored ~11:04 and ticking (11:23 → 11:28). NOTE: `c3-relaunch-at-move0-undo-visible.png` caught the launch splash (blank) — the a11y snapshot recorded here is the evidence |
| d | Deal Again → History: Incomplete row real duration, Active row no Time badge | PASS | `d0-new-deal.png`, `e-history-after-deal-again.png`; Incomplete row "11 moves · Time 11:58" (real duration — F3 behavior; matches `duration_ms` 718,093), Active row "0 moves, Draw 1, Solvable" with NO Time badge (F2) |
| e1 | kv DB: `soli/klondike/v1` payload shape | PASS | Only keys `soli/klondike/v1` (3,806 bytes) + `soli/ui/boardMetrics/v1` — no v2/v3 keys. Payload top-level keys: autoUpEnabled, deal, **elapsedMs**, finalSnapshot, historyEntryId, moveLog, moveLogVersion, savedAt, status, version (=1). `finalSnapshot` contains NO elapsedMs/timerState/timerStartedAt; no `"e":` anywhere in the raw JSON |
| e2 | `Documents/SQLite/soli-history.db` + `moves_json` without `e` | PASS | `soli-history.db` exists (no `soli-history-v5.db`), `user_version` 1, single `history_entries` table. Incomplete row: `move_log_version` 1, `moves_json` = 22 entries (2 move / 9 draw / 11 undo — log continuity across both restarts proven), zero `e` keys; Active row NULL as designed |
| f | Logs: sqlite errors, "database is locked", replay/persistence warnings, JS exceptions | PASS | None in 36k OS-log lines — only benign XCTest/runningboard/lifecycle noise |

Environment note: `yarn ios` (expo run:ios) keeps Metro alive in the background
after the smoke; left running so the installed debug build stays launchable.

### iOS simulator smoke after review fix batch R1–R6 (2026-07-06) — PASS

Verifies the review-fix-batch state on device: R1 `guard` block in the payload,
R2 depth-exact restores with no guard warns, R6 won-game startup repair (the one
change with NO unit test — device verification was the point). Setup: no live
builds running (only idle gradle/kotlin daemons from earlier Android work — left
alone, they are not builds), app uninstalled from the iPhone 17 Pro simulator,
clean `yarn ios` (Build Succeeded, installed + launched, pid verified).
Automation via agent-device 0.18.3. Developer mode was enabled mid-run so devLog
warns are observable in Metro from the R2/R6 checks onward. Evidence in
`.test-artifacts/review-fix-smoke-ios/`; OS log `sim-log.txt` (218k lines),
Metro/JS output in the build terminal.

| # | Check | Result | Evidence / notes |
|---|-------|--------|------------------|
| 1 | Clean build + install + launch | PASS | `build.log` ("Build Succeeded", installed, opened); `a-fresh-launch.png` (MOVES 0, TIME 0:00) |
| 2 | Standard restore: 8 moves (6 draws + 2 tableau) → kill → relaunch | PASS | `b-8-moves.png`, label diff `b-prekill-labels.txt` vs `c-postkill-labels.txt`: board identical (only timer text + occlusion-dependent rank glyphs differ), MOVES 8, timer resumed ahead of saved value — never rewound (0:26 → 1:29 → 2:25 → 3:02 monotonic across undos and relaunch) |
| 2b | Undo to move 0 after relaunch | PASS | 8 undos reached the exact initial deal (stock 23, waste 3♥, 4♣ back on column 5). MOVES stays 8 — by design ("undo rewinds board state, but not the move counter", comment in `handleUndo`) |
| 3a | R1: payload `guard` object present + plausible | PASS | `r1-payload.json`: guard `{historyLength: 0, futureLength: 8, hasWon: false, autoCompleteRuns: 0}` exactly matching the 8-undos-deep session; later sessions showed `{3,3,…}` and `{0,6,…}` all consistent. No guard-mismatch warns in any restore |
| 3b | R2: scrub/undo-heavy restore, depth exact, no warns | PASS (scrub drag limited, see notes) | Second session: 6 draws + 3 undos → kill → relaunch → board + MOVES + guard `{3,3}` restored, then 3 more undos reached the initial deal (payload guard `{0,6}` with 6 undo entries — full redo depth preserved). devLog shows ONLY "Hydrating saved in-progress session", zero replay/guard/fallback warns across 4 relaunches |
| 3b-2 | R2c live bonus: no-op scrub entry replays cleanly | PASS | One pan attempt appended a coalesced back-to-origin `{k:'scrub',i:0}` entry (visible in `r2-prekill-payload.json`); the next relaunch replayed it without drift warn, and the regenerated log correctly drops the no-op (`r2-postrelaunch-payload.json`) — the exact R2c tolerance case, observed live |
| 3b-3 | R2b live: mount-time same-value SET_AUTO_UP_ENABLED is a pure no-op | PASS | 4+ relaunches (each dispatches the settings mirror with an unchanged value): zero spurious `autoUp` entries in the persisted log, depths always guard-exact |
| 3c | R6: win crash window → startup repair | PASS (staged) | No dev shortcut to a near-won board exists (demo playlist detaches history rows via `demoPlaybackActiveRef` by design; natural win impractical), so the exact production condition was staged at the data level: kill app → set payload `status:'won'` in the kv DB (backup `kv-backup-before-r6.db`) while linked row `hist_mr9cx2bd_mbe4vt` was still 'active'/0 moves/NULL log → relaunch. Repair fired: devLog "Repairing history row for a won session whose result never committed."; row → solved, moves 12, duration_ms 667494, finished_at = payload savedAt, `moves_json` 21 valid entries; History UI shows "Solved … 12 moves · Time 11:07" (`r6-history-after-repair.png`); session cleared, fresh deal + new active row; subsequent relaunches show no repeated repair |
| 3c-2 | R6: normal win (no kill) → single Solved row | SKIP | Requires actually winning a game; no shortcut exists (see 3c). The no-kill path is the long-standing win handler flow (unchanged by this batch) and `getActiveEntry` resolving after queued writes makes the repair a no-op there (unit-reasoned in Intermediary learnings) |
| 3d | Logs: sqlite errors, "database is locked", replay/persistence/guard warns, JS exceptions | PASS | None in 218k OS-log lines nor in Metro output. All 4 SoliDev log lines are expected INFOs (2 hydrations, R6 repair pair) |

iOS automation limitations hit (both known/pre-documented): (1) RNGH pan on the
Undo button still cannot be synthesized (4 fresh variants incl. 6 s slow pans;
scrub-drag coverage exists from the earlier Android smoke) — hence the
undo-tap-heavy R2 fallback; (2) Settings switch rows mostly don't toggle via
XCTest taps (Developer mode toggled once; Auto Up never flipped despite
row-center/thumb-coordinate taps, visually confirmed unchanged), so no live
`autoUp` toggle entries could be produced mid-game — value-flip logging remains
unit-covered (`klondike.autoUpSetting.test.ts`). Auto Up stayed ON the whole
run; a natural auto-run was not reachable in a smoke-length random deal
(requires an all-face-up tableau), so R2a's coalescing-near-auto-ready path
rests on its failing-first unit test plus the depth-exact guard evidence above.
