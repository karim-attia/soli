# Demo Autosolve Playlist — Demo Sheet Cleanup, Back-and-Forth Undo Probes, Info HUD

> Note (2026-07-07): `scripts/run-demo-autosolve.js`, `yarn demo:auto-solve`, and
> `yarn prod` mentioned below are superseded by `yarn release --auto-solve` /
> `yarn ios --auto-solve` (`DEMO_GAME_LIMIT=N` limits games). The historical
> content is kept as-is. Current recipes: `.agents/skills/soli-testing/SKILL.md`.

Follow-up story to
`docs/product/demo-autosolve-playlist/20-game-solved-demo-playlist.md`.
Read that plan first for the playlist/replay architecture; this story only builds
on top of it.

## User prompt

```text
visually clean up sheet to start demo games. remove cancel option. question (no need to act on it): is there a native x button to close in the expo ui sheet? add a couple of back and forth undo moves in some games, especially in first game. this also allows to test this. question: we introduced accessibility. would it make sense to use this? to have more real life stuff? or just one game with that and keep others? would maybe other things surface? would this help for standardized smoke testing? pls add a small info area on botton left of screen when demo games are running. with what is running, 3/x, current RAM (or just at end of one game), other stats? other recommendations? side note: should demo games, at least the new generated demo games stop when all cards are uncovered? and let auto up jump in? would this increase test surface and also reduce paths needed?
```

## Summary

- Status: DONE incl. round-3 device verification. Steps 1–9 implemented and
  green (typecheck/lint/jest); step 10 (Android device smoke test) passed
  2026-07-06 — playlist completed twice, depth-3/2/1 probes logged, HUD
  verified on device incl. live "Undo ×3" capture, sheet layout + swipe-down
  dismissal verified. Round 3 (post-simplification: "Game x/y" pill, no
  subtitle) passed on-device 2026-07-06 evening — see Testing.
- Simplification round after user review (2026-07-06):
  - Sheet: "Swipe down to close" subtitle removed again (clutter on an
    internal dev-only sheet).
  - HUD: reduced to just "Game x/y" — mode label, step x/y, "Undo ×D", JS heap,
    and elapsed time all removed (steps are visible via the Moves stat; JS heap
    at 30-50 MB is not the interesting memory number). The perceived
    "widening/flicker near game end" was the "· Undo ×D" suffix during the
    late-game depth-1 probe (game 1 probes at step 227/244).
  - HUD repositioned into the bottom dock: left half, mirroring the Undo
    button's dimensions (50% width, paddingVertical 14, borderRadius 12,
    16pt/600 label); `KlondikeGameView` wraps `UndoScrubber` + HUD in a shared
    relative container so both use the same bottom offset.
  - `DemoProgress` slimmed to `{ gameIndex, gameCount }`; the launcher now
    publishes once per game load (throttle + step/probe publishes deleted).
- Deviation from plan (superseded by the simplification round):
  `DemoProgress` carried `undoProbeDepth: number` (0 = inactive) instead of the
  planned `undoProbeActive: boolean`, so the HUD could show "Undo ×3".
- Three scope items:
  1. Clean up `DemoChoiceSheet` in `app/(tabs)/index.tsx`, remove the Cancel
     button (sheet already dismisses via swipe-down/scrim tap).
  2. Multi-step "back-and-forth" undo probes (undo k moves, replay them
     forward), derived at runtime — no fixture regeneration. Game 1 gets at
     least one depth-3 probe; two other games get depth 2.
  3. Small demo info HUD bottom-left, visible only during demo playback:
     mode, game x/y, step x/y, undo-probe flag, JS heap memory, elapsed time.
- User questions answered in "Answered questions" below (native X button,
  a11y-driven playback, stop-early + Auto Up); none of them are implemented in
  this story.

## Description

The 20-game solved demo playlist (previous story) is now our main on-device
stress scenario. This follow-up improves its ergonomics and test surface:

- The developer sheet that starts demo runs has a redundant Cancel button and
  no visual structure. Since `@expo/ui` BottomSheet is natively dismissible
  (swipe down / scrim tap → `onDismiss`), Cancel is dead weight. Tidy the sheet
  per app conventions, keep it developer-grade simple.
- Undo probes today undo exactly ONE move and replay it. Real users undo
  several moves and redo their way forward. Multi-step back-and-forth probes
  exercise deeper history restoration (face-down flips, recycle boundaries,
  foundation pull-backs) and are exactly the "more real life stuff" the user
  asked for — without touching the Lonelybot fixture pipeline.
- While a playlist runs for many minutes there is zero on-screen feedback about
  progress. A tiny bottom-left HUD ("Playlist · Game 3/20 · Step 87/241 ·
  JS 38 MB · 1:12") makes unattended runs observable at a glance — on the
  device, on screenshots taken by testing sub-agents, and in screen recordings.

## Acceptance Criteria

- Demo sheet:
  - Opening the developer Demo prompt shows a tidy sheet: title, the five demo
    options, no Cancel button.
  - Swiping down or tapping the scrim still closes the sheet (existing
    `onDismiss` path, unchanged).
  - Choosing an option closes the sheet and launches that demo mode (unchanged
    behavior).
- Back-and-forth undo probes:
  - Playlist game 1 (index 0) performs at least one probe that undoes 3 moves
    and replays all 3 forward before continuing.
  - At least two other games perform depth-2 back-and-forth probes.
  - Remaining fixture probes keep working as depth-1 (current behavior is
    subsumed by the generalized loop, not duplicated).
  - The fixture file `src/data/demoAutoSolvePlaylist.generated.ts` is NOT
    regenerated or modified.
  - `test/unit/solitaire/demoReplay.test.ts` replays the exact same
    choreography (including multi-step undo/redo at the derived depths) through
    the reducer and still proves `hasWon === true` for all 20 games.
  - On-device playlist run completes all games with the new probes; logcat
    shows probe logs including depth.
- Demo info HUD:
  - While a playlist/single demo replay runs, a small badge cluster is visible
    bottom-left showing: mode label, "Game x/y", "Step x/y", elapsed time in
    the current game, and JS heap MB when available.
  - It briefly indicates when an undo probe is active.
  - It is `pointerEvents="none"` and never intercepts touches.
  - It disappears when the playlist completes, fails, or is superseded by a new
    demo launch / new game.
  - HUD updates do not re-render the board: only the HUD component re-renders
    (isolated subscription), throttled to at most ~4 updates/second.
  - Normal (non-demo) gameplay renders nothing and pays no cost.

## Answered questions (from the user prompt, no implementation)

1. **Is there a native X close button on the `@expo/ui` BottomSheet?**
   No. The universal `BottomSheet` API only exposes `isPresented` and
   `onDismiss` (dismissal via swipe-down or scrim tap). There is no built-in
   close-button prop; a visible close affordance would have to be our own child
   button. Source: https://docs.expo.dev/versions/latest/sdk/ui/universal/bottomsheet/
   (SwiftUI variant additionally has `onIsPresentedChange`, still no X button).
2. **Should demo games be driven through the accessibility tree instead of
   reducer dispatch?** Documented as a follow-up, see "Follow-ups". Short
   answer: keep reducer playback for the playlist; optionally add ONE
   a11y-driven smoke game as a separate scripted device test.
3. **Should generated demo games stop when all cards are face-up and let Auto
   Up finish?** Documented as a follow-up, see "Follow-ups". Short answer: good
   idea for a subset of games later; keep full solver paths for the rest.

## Possible approaches incl. pros and cons

### Scope 1: Demo sheet cleanup

- **A (recommended): keep `AppSheet` + tamagui `YStack`/`Button`/`Text`,
  remove Cancel, add light structure.** Pros: zero new components, follows
  existing wrapped-defaults convention, minimal diff. Cons: none meaningful for
  a developer-only sheet.
- B: build a dedicated styled component in `components/`. Pros: reusable.
  Cons: gold plating — there is exactly one call site and it is dev-only.

### Scope 2: Back-and-forth undo probes

- **A (recommended): derive multi-step probes at runtime, deterministically.**
  Keep the fixture's `undoProbeMoveIndices` as probe _locations_ and assign a
  _depth_ per playlist index in a small pure helper. The launcher generalizes
  its existing single-step probe branch into: undo `depth` times (each awaited
  via history-length decrease), then re-resolve and replay
  `moves[i-depth+1..i]` forward via `resolveDemoReplayAction` — the same
  re-resolution mechanism normal replay already uses, so undone state is
  guaranteed to re-resolve (undo restores the exact pre-move snapshot).
  - Pros: no Lonelybot dependency, no ~617 KB generated-file churn, fully
    deterministic, testable as a pure function, subsumes the current
    depth-1 behavior instead of duplicating it.
  - Cons: probe plan lives in code instead of the fixture (two sources to look
    at); mitigated by locating the helper next to the replay types in
    `demoReplay.ts` with a documenting comment.
- B: regenerate fixtures with a `depth` field per probe via
  `scripts/generate-demo-autosolve-playlist.js`.
  - Pros: single source of truth in the fixture.
  - Cons: requires the local Lonelybot checkout (generator shells out to
    `lonecli`), regenerates a huge file for a tiny semantic change, risks
    producing a different playlist if solver output shifts, and buys nothing at
    runtime. Rejected for this story.
- Guardrail for either approach: depth must satisfy `depth <= moveIndex + 1`
  and `depth <= state.history.length` at probe time. Fixture probes always sit
  at `moveIndex >= 3` (see `createUndoProbeMoveIndices`, `minIndex = 3`), so
  depth 3 is always safe; still clamp defensively in the helper.

### Scope 3: Demo info HUD + progress publishing

- **A (recommended): tiny module-level progress store + self-subscribing HUD
  component.** New `demoProgressStore` with `setDemoProgress(progress | null)`,
  `getDemoProgress()`, `subscribe(listener)`; the launcher writes to it
  (throttled), and a new `DemoPlaylistHud` component reads it via
  `useSyncExternalStore` and returns `null` when idle. `KlondikeGameView`
  mounts the HUD unconditionally.
  - Pros: board and `useKlondikeGame` never re-render on progress updates
    (complete isolation); no prop drilling through view props; trivially
    removable.
  - Cons: a module singleton — acceptable for a dev-only feature, and the
    launcher is itself effectively a singleton per session. Leave a comment
    noting this trade-off.
- B: `onProgress` state setter in `useKlondikeGame` passed into
  `useDemoGameLauncher` options, progress in React state, HUD fed via view
  props. Pros: idiomatic React data flow. Cons: every progress tick re-renders
  the whole game hook consumer (board included); would need extra memo walls.
  Rejected because the isolation requirement is explicit.
- Memory readout (research result, 2026-07-06, zero-dependency):
  - React Native ships a `performance.memory` API (added in RN core, backed by
    `jsi::instrumentation().getHeapInfo()`, i.e. Hermes instrumentation):
    `usedJSHeapSize` / `totalJSHeapSize` in bytes. Source:
    https://github.com/facebook/react-native/commit/70fb2dce4557da1195289a24638b1e4d2c2edbf7
  - Fallback: `global.HermesInternal.getInstrumentedStats()` is available by
    default on Hermes and returns `js_allocatedBytes` / `js_heapSize`. Sources:
    https://github.com/facebook/hermes/issues/982,
    https://github.com/facebook/hermes/issues/1518
  - Both report the JS heap only (native RSS is invisible to Hermes — the
    playlist perf sample showed ~2 GB PSS while the JS heap stays tens of MB).
    Label the HUD value "JS" accordingly.
  - v1: try `performance.memory?.usedJSHeapSize`, fall back to
    `HermesInternal.getInstrumentedStats().js_allocatedBytes`, omit the badge
    if neither exists. Native RSS via `react-native-device-info`
    `getUsedMemory()` is a follow-up, not included (avoids a native dep).

## Open questions to the user

None blocking. Defaults chosen (flagged for the final summary):

- Probe depths: game index 0 → depth 3 on its first fixture probe; game
  indices 2 and 4 → depth 2 on their first probe; all other fixture probes stay
  depth 1. Alternative: more/deeper probes — easy to tune later in one helper.
- HUD shows JS heap only (honest zero-dependency value) plus per-game elapsed
  time. Alternative: add native RSS via `react-native-device-info` — follow-up.

## Dependencies

- No new dependencies. Memory readout uses Hermes/RN built-ins (sources cited
  above; no package guide needed per plan instructions).
- Follow-up option only (NOT in this story): `react-native-device-info`
  `getUsedMemory()` for native RSS — would need a package guide in
  `docs/external-package-guides/` if ever adopted.

## UX/UI Considerations

- Sheet: title ("Run Demo"), five option buttons, generous but compact spacing,
  no Cancel. Dev-only surface — no theming work beyond existing tamagui
  defaults. Keep bottom padding so the last button clears the home indicator.
- HUD: bottom-left, absolutely positioned inside the game view above the board
  layers, small footprint (~one or two lines), dark translucent badge matching
  `StatisticsHud` styling (`rgba(15, 23, 42, 0.72)` background, small uppercase
  labels), `pointerEvents="none"`. It must not overlap the `UndoScrubber`
  (bottom center/full width) — keep the HUD compact and left-anchored with a
  bottom offset that clears the scrubber area; verify on device.
- Undo-probe indication: append e.g. "· Undo ×3" to the HUD line while the
  probe runs; no extra styling.

## Components

- Reuse: `AppSheet`, tamagui `YStack`/`Text`/`Button`, `StatisticsHud` styling
  patterns (copy the badge style values, don't force-share the component — its
  row/label/value shape doesn't fit a single compact line).
- Create:
  - `src/features/klondike/state/demoProgressStore.ts` — ~30-line external
    store: `DemoProgress` type, `setDemoProgress`, `getDemoProgress`,
    `subscribeDemoProgress`.
  - `src/features/klondike/components/DemoPlaylistHud.tsx` — self-subscribing
    HUD, returns `null` when no progress.

## How to fetch data, how to cache

- N/A (no network). Progress flows launcher → store → HUD; memory read at most
  once per second inside the HUD (or per throttled store write).

## Related tasks

- `docs/product/demo-autosolve-playlist/20-game-solved-demo-playlist.md`
  (parent story; replay architecture, fixture format, device runner)
- `docs/product/klondike-card-accessibility/klondike-card-accessibility.md`
  (a11y tree used by the follow-up idea below)

## Simplification ideas

- No new sheet component; edit `DemoChoiceSheet` in place.
- Probe plan is one pure function + one constant table, not a config system.
- HUD is one component + one tiny store; no context, no reducer changes.
- Depth-1 fixture probes are handled by the same generalized loop — the old
  single-step branch is deleted, not kept alongside.

## Steps to implement

1. [completed] **Sheet cleanup** (`app/(tabs)/index.tsx`): in `DemoChoiceSheet`, remove
   the Cancel `Button`; keep title + five options; adjust spacing (e.g.
   `gap="$2.5"`, `p="$4"`, `pb="$5"`); optional small subtitle
   ("Swipe down to close"). No `AppSheet` changes.
2. [completed] **Probe plan helper** (`src/solitaire/demoReplay.ts`): add
   `export type DemoUndoProbe = { moveIndex: number; depth: number }` and
   `export const getDemoUndoProbePlan = (entry: DemoAutoSolvePlaylistEntry, playlistIndex: number): DemoUndoProbe[]`.
   Behavior: map each fixture `undoProbeMoveIndices` value to a probe; depth =
   3 for the FIRST probe of playlist index 0, 2 for the first probe of playlist
   indices 2 and 4, else 1. Clamp `depth = Math.min(depth, moveIndex + 1)`.
   Add a comment explaining why depths live in code (no Lonelybot regen; see
   approach A). Keep it pure — it is unit-tested directly.
3. [completed] **Generalize launcher probe branch**
   (`src/features/klondike/hooks/useDemoGameLauncher.ts`): in `playStep`,
   replace the single undo/replay branch with a loop driven by the probe plan
   (computed once per game in `loadGame`, e.g. a `Map<moveIndex, depth>`):
   undo `depth` times, each awaited via `waitForPlaylistState` on
   `history.length` decreasing by one; then replay `moves[moveIndex - depth + 1 .. moveIndex]`
   forward, each re-resolved via `resolveDemoReplayAction` against
   `stateRef.current` and awaited via `moveCount` increase; then continue with
   `playStep(entry, gameIndex, moveIndex + 1)`. Fail the playlist with a
   descriptive message (game, step, probe depth, sub-step) on any resolution
   failure or timeout. Keep the `shouldRecordHistory` guard: probes only run
   when history recording is on (unchanged condition). Log
   `[DemoPlaylist] Undo probe at game G, step S (depth D).`
4. [completed, deviation: `undoProbeDepth: number` instead of
   `undoProbeActive: boolean`] **Progress store**
   (`src/features/klondike/state/demoProgressStore.ts`, new): `DemoProgress =
{ mode: 'playlist' | 'single'; gameIndex: number; gameCount: number;
stepIndex: number; stepCount: number; undoProbeActive: boolean;
gameStartedAtMs: number }`; module-level value + listener set;
   `setDemoProgress(next)` notifies listeners only when the value reference
   changes. Comment the singleton trade-off (dev-only feature, avoids board
   re-renders).
5. [completed, chose the ≥250 ms time-based throttle] **Publish progress from the launcher**: in `runDemoPlaylist` write to
   the store on game load (step 0, `gameStartedAtMs: Date.now()`), on step
   advance (throttle: only publish when `stepIndex % 3 === 0` or ≥250 ms since
   the last publish — pick one, keep it simple), on undo-probe start/end
   (`undoProbeActive` true/false, publish immediately), and `null` on playlist
   completion, `failPlaylist`, and at the top of `handleLaunchDemoGame`
   (covers relaunch and old-demo mode). Mode is `'single'` when `gameLimit`
   resolves to 1 via the `demoMode === 'single'` path, else `'playlist'`.
6. [completed] **HUD component**
   (`src/features/klondike/components/DemoPlaylistHud.tsx`, new): subscribe
   with `useSyncExternalStore(subscribeDemoProgress, getDemoProgress)`; return
   `null` when idle. Render one compact dark badge, bottom-left, absolute
   position, `pointerEvents="none"`, styles adapted from `StatisticsHud`
   (smaller font). Content: `Playlist · Game 3/20 · Step 87/241 [· Undo ×3]`
   line plus `JS 38 MB · 1:12` line (elapsed via existing
   `formatElapsedDuration` from `src/utils/time`). Memory: local helper
   `readJsHeapBytes()` trying `performance.memory?.usedJSHeapSize` then
   `HermesInternal.getInstrumentedStats().js_allocatedBytes`, typed via a
   narrow `globalThis` cast; refresh together with a 1-second interval that
   also re-renders the elapsed time while progress is non-null. Omit the memory
   segment when unavailable.
7. [completed] **Mount HUD** (`src/features/klondike/components/KlondikeGameView.tsx`):
   render `<DemoPlaylistHud />` near `UndoScrubber` (inside the root `YStack`,
   after the board shell so it stacks above it). No prop changes to
   `KlondikeGameViewProps` — the HUD is self-contained.
8. [completed] **Tests** (`test/unit/solitaire/demoReplay.test.ts`): update the main
   replay test to use `getDemoUndoProbePlan(entry, playlistIndex)`: at each
   probe index apply `depth` reducer `UNDO`s, then re-apply
   `moves[i-depth+1..i]` via `applyDemoReplayMoveForValidation`; assert final
   `hasWon` for all 20 games. Add assertions that the plan yields a depth-3
   probe for index 0 and depth-2 probes for indices 2 and 4, and that every
   probe satisfies `depth <= moveIndex + 1`.
9. [completed, see Testing] Run `yarn typecheck && yarn lint && yarn jest`; format touched files
   with `yarn exec oxfmt <files>` if the repo flow expects it (see parent plan
   Testing section).
10. [completed 2026-07-06, all checks passed — see Testing] **Android device smoke test** (sub-agent, per AGENTS.md): kill any
    running builds first; `DEMO_GAME_LIMIT=3 yarn demo:auto-solve` (small limit
    keeps the run short but still crosses a game boundary and hits the game-1
    depth-3 probe). Verify via screenshot(s): HUD visible bottom-left with
    correct "Game x/3" and step progress, JS-heap badge present (or elapsed
    only), HUD gone after completion; logcat shows depth-3 probe log in game 1
    and playlist completion. Also open the Demo sheet manually once to verify
    the cleaned-up layout and that swipe-down still dismisses.
11. [completed for steps 1–9] Update this plan's step statuses, Files actually modified,
    Intermediary learnings, and Testing results. NEVER SKIP THIS.

## Plan: Files to modify

- `app/(tabs)/index.tsx` — sheet cleanup (scope 1)
- `src/solitaire/demoReplay.ts` — `getDemoUndoProbePlan` (scope 2)
- `src/features/klondike/hooks/useDemoGameLauncher.ts` — multi-step probe loop,
  progress publishing (scopes 2+3)
- `src/features/klondike/state/demoProgressStore.ts` — NEW (scope 3)
- `src/features/klondike/components/DemoPlaylistHud.tsx` — NEW (scope 3)
- `src/features/klondike/components/KlondikeGameView.tsx` — mount HUD (scope 3)
- `test/unit/solitaire/demoReplay.test.ts` — back-and-forth choreography +
  probe-plan assertions (scope 2)
- `docs/product/demo-autosolve-playlist/demo-sheet-undo-probes-info-hud.md` —
  status updates

NOT modified: `src/data/demoAutoSolvePlaylist.generated.ts`,
`src/data/demoAutoSolvePlaylist.ts`,
`scripts/generate-demo-autosolve-playlist.js`, `components/AppSheet.tsx`.

## Files actually modified

- `app/(tabs)/index.tsx` — DemoChoiceSheet: Cancel removed, subtitle
  ("Swipe down to close"), spacing `gap="$2.5" p="$4" pb="$5"`.
- `src/solitaire/demoReplay.ts` — `DemoUndoProbe` type, `getDemoUndoProbePlan`,
  `FIRST_PROBE_DEPTH_BY_PLAYLIST_INDEX` table (0→3, 2→2, 4→2).
- `src/features/klondike/hooks/useDemoGameLauncher.ts` — generalized
  `runUndoProbe` loop (old single-step branch deleted), probe map computed once
  per game in `loadGame`, `publishProgress` helper (250 ms throttle, forced
  publishes for game load / probe start+end), `setDemoProgress(null)` on
  completion, `failPlaylist`, and top of `handleLaunchDemoGame`.
- `src/features/klondike/state/demoProgressStore.ts` — NEW external store.
- `src/features/klondike/components/DemoPlaylistHud.tsx` — NEW HUD component.
- `src/features/klondike/components/KlondikeGameView.tsx` — mounts
  `<DemoPlaylistHud />` after `UndoScrubber`.
- `test/unit/solitaire/demoReplay.test.ts` — multi-step back-and-forth
  choreography + probe-plan assertions.
- `src/features/klondike/components/cards/AbsoluteCardLayer.tsx` — NOT in plan:
  one-line fix for a pre-existing typecheck break caused by another in-progress
  workstream's uncommitted `CardVisual` prop narrowing (see Identified issues).

## Intermediary learnings

- `DemoProgress.undoProbeDepth: number` (0 = inactive) replaced the planned
  `undoProbeActive: boolean` so the HUD can render "Undo ×N" without a second
  field. Only deliberate deviation from the plan.
- Fixture probe layout (checked via grep, file not read fully): even playlist
  indices 0–18 carry probes, odd ones none. Entry 0 has two probes
  ([115, 226]), entries 2 and 4 have one each ([186], [103]) — so the 0→3,
  2→2, 4→2 depth table lands exactly as intended.
- HUD clearance above the UndoScrubber is computed from the scrubber's own
  geometry: `insets.bottom + UNDO_SCRUBBER_SAFE_AREA_BOTTOM_PADDING` (its
  bottom dock) + 72 (container minHeight) + 12 (marginTop) + 8 gap. Verify on
  device in step 10.
- `progressMode` is derived as `gameLimit === 1 ? 'single' : 'playlist'`
  instead of threading `demoMode` into `runDemoPlaylist` — the single-game
  launch path always resolves to `gameLimit: 1`, so this is equivalent and
  keeps the options type unchanged.
- The mutual recursion `playStep` ↔ `runUndoProbe` follows the existing
  `loadGame` ↔ `playStep` closure pattern (declaration order is irrelevant
  because all calls happen async after `runDemoPlaylist` returns).
- Device-testing learnings (step 10): the 3-game playlist runs so fast
  (~35s total playback) that catching game 1 via attach-after-launch misses
  it — relaunching the same deep link (with a `#retry` style fragment suffix)
  and taking a rapid `adb exec-out screencap` burst is the reliable way to
  capture early-game HUD states, incl. the step-116 "Undo ×3" frame. Also,
  `agent-device swipe down` is not a valid command shape (needs coordinates:
  `swipe x1 y1 x2 y2`), and a system back from the game screen exits the app.
- JS heap in the HUD grew 38 → 54 MB within game 1 and read 41 MB early in
  game 3 — consistent with the known pattern that the JS heap stays small
  while native PSS is the interesting number (follow-up 3).
- Round-3 harness learnings (2026-07-06 evening):
  - `adb logcat | grep -m1 <token> && touch trigger` does NOT work as a
    logcat trigger on macOS — adb block-buffers stdout when piped, so the
    match fires minutes late or never. Poll `adb logcat -d -s ReactNativeJS`
    in a loop instead (dump mode flushes; ~0.3s per poll over adb-wifi).
  - agent-device snapshots degraded to ~8s each mid-session (stale-daemon
    warning); closing the session and reopening (fresh daemon) brought them
    back to ~1s. Restart the daemon before any timing-sensitive snapshot
    work.
  - One deep-link relaunch produced no app logs at all: the device had dozed
    (`mWakefulness=Dozing`) even with screen_off_timeout at 600000 — RN never
    mounted with the screen off. Run the unlock script immediately before
    firing timing-critical deep links, not just at session start.
  - Catching the ~1s probe window with ~1s a11y snapshots works by starting a
    back-to-back snapshot loop ~2.9s after the "Game 1/2 loaded" logcat line
    (probe fires ~4.8s after load at ~38ms/step release-build pace) and
    correlating each snapshot's start/end wallclock with the probe log line.
    Note snapshots are not atomic: the tree walk spans ~25 playback steps, so
    MOVES and card labels within one snapshot can come from slightly
    different instants — correlate per-label against the fold reference, not
    whole snapshots.

## Identified issues

- [pre-existing, worked around] `yarn typecheck` was already failing before
  this story: another uncommitted workstream (history-entries-cleanup /
  `BoardPreview.tsx`) narrowed `CardVisual`'s `card` prop to
  `Pick<Card, 'suit' | 'rank'>`, which broke the excess-property spread
  `{ ...item.card, faceUp: true }` in `AbsoluteCardLayer.tsx`. Fixed by passing
  `item.card` directly (CardVisual never read `faceUp`). Behavior unchanged.
- [RESOLVED 2026-07-06] The Demo sheet's sixth option ("Mid-game, scrubbed to
  middle", from scrubber-test-automation) was partially clipped at the sheet's
  bottom edge on the physical A065. Fixed by switching all six sheet buttons
  to `size="$3"` with `gap="$2"` in `app/(tabs)/index.tsx`; verified on-device
  after a fresh release install — all six options fully visible and unclipped
  (`.test-artifacts/demo-sheet-undo-hud/demo-sheet-fit-fix.png`).
- [pre-existing, NOT fixed] `app/(tabs)/history.tsx` has ~16 typecheck errors
  and lint warnings from the same unfinished BoardPreview extraction (missing
  `View`/`StyleSheet`/`HistoryPreviewCard` imports, unused `BoardPreview`
  import). Left alone — it belongs to that other in-progress workstream, not
  this story. `yarn typecheck` fails overall until that work is finished.

## Testing

Results 2026-07-06 (implementation sub-agent):

- `yarn exec oxfmt <7 touched files>` — clean.
- `yarn typecheck` — no errors in files touched by this story. Overall exit is
  still non-zero because of pre-existing `app/(tabs)/history.tsx` errors from
  another uncommitted workstream (see Identified issues).
- `yarn lint` — exit 0; only pre-existing warnings in `history.tsx`.
- `yarn jest --runInBand` — 22 suites passed, 180 tests passed, 0 failed.
- `yarn jest test/unit/solitaire/demoReplay.test.ts` — 3 tests passed:
  all 20 games reach `hasWon === true` through the reducer with the
  multi-step back-and-forth choreography (max probe depth 3 exercised), the
  probe plan yields depth 3 for index 0 and depth 2 for indices 2 and 4, and
  every probe satisfies `depth <= moveIndex + 1`.

Android device smoke results 2026-07-06 (testing sub-agent, physical A065 over
adb-wifi, screenshots in `.test-artifacts/demo-sheet-undo-hud/`):

- `DEMO_GAME_LIMIT=3 yarn demo:auto-solve` — PASS, exit 0. Release APK build
  1m 36s (warm Gradle daemon); whole runner incl. install + 3-game playlist
  ~2m 27s. A second playlist run (deep-link relaunch, for HUD burst capture)
  also completed.
- Probe logs (exact lines, both runs identical):
  - `[DemoPlaylist] Undo probe at game 1, step 116 (depth 3).`
  - `[DemoPlaylist] Undo probe at game 1, step 227 (depth 1).`
  - `[DemoPlaylist] Undo probe at game 3, step 187 (depth 2).`
  - `[DemoPlaylist] Playlist completed (games=3).`
  - Note: with `games=3` only playlist index 2 (game 3) exercises a depth-2
    probe; index 4 needs a ≥5-game run (not required for this smoke).
- HUD — PASS on all criteria:
  - `burst-2.png`: bottom-left badge `Playlist · Game 1/3 · Step 1/244` +
    `JS 38 MB · 0:00` right at game 1 start.
  - `burst-12.png`: `Playlist · Game 1/3 · Step 116/244 · Undo ×3` +
    `JS 54 MB · 0:04` — the depth-3 probe captured live on screen.
  - `hud-game1-a.png` (run 1): `Playlist · Game 3/3 · Step 43/238` +
    `JS 41 MB · 0:01`.
  - No overlap with the collapsed Undo pill (bottom-right) or the board;
    clearance computed in the HUD held up on device.
  - `hud-after-completion.png` / `hud-after-completion-2.png`: HUD gone after
    completion.
- Demo sheet — PASS: `demo-sheet-open-2.png` shows title "Run Demo", subtitle
  "Swipe down to close", option buttons, NO Cancel button. Swipe-down on the
  drag handle dismissed it (`demo-sheet-dismissed-2.png`, game screen intact).
  No demo option was tapped.
  - Observation: the sheet now has SIX options — a "Mid-game, scrubbed to
    middle" button from the parallel scrubber-test-automation workstream. It
    initially sat partially clipped/faded at the sheet's bottom edge on this
    device. Follow-up fix same day: all six buttons switched to `size="$3"`
    with `gap="$2"`; re-verified after a fresh `yarn release` install
    (warm build ~41s, install+launch ok, developer mode persisted) — all six
    options fully visible and unclipped, swipe-down dismissal still works
    (`demo-sheet-fit-fix.png`).

Verification round 3 (2026-07-06 ~21:10, device back on adb-wifi after Karim
re-enabled Wireless debugging) — ALL PASSED (testing sub-agent, physical A065,
fresh release build via `DEMO_GAME_LIMIT=2 yarn demo:auto-solve`, exit 0,
build 19s warm):
- HUD pill — PASS: reads exactly `Game 1/2` (burst frames 01/03) then
  `Game 2/2` (frame 30), single dark pill in the LEFT half of the bottom
  dock at the same level/height as the Undo button (right half), no other
  text — no mode label, steps, JS heap, or elapsed time anywhere. Also
  tree-visible: a11y snapshots show `[text] "Game 1/2"` directly adjacent to
  `[button] "Undo"`. Gone after completion (`hud-v2-after-completion*.png`
  and fresh post-deal board). Artifacts: `hud-v2-burst-01..45.png`,
  `hud-v2-after-completion{,-2}.png` in `.test-artifacts/demo-sheet-undo-hud/`.
- Probe logs — PASS, exact lines:
  `[DemoPlaylist] Undo probe at game 1, step 116 (depth 3).`,
  `[DemoPlaylist] Undo probe at game 1, step 227 (depth 1).`,
  `[DemoPlaylist] Playlist completed (games=2).` (game 2 = playlist index 1,
  odd → `undoProbes=0`, as designed).
- Probe observability via a11y tree — best-effort PASS: a snapshot loop timed
  from the game-load logcat line straddled the step-116 depth-3 probe (probe
  line hit mid-snapshot-2 wallclock). Snap 1 (pre-probe) `Waste, King of
  diamonds` = fold step 113; snap 2 (contains the probe) `Waste, Jack of
  spades` + MOVES 115 = exactly the probe's undo anchor states (fold steps
  114-116 all have J♠ on waste; depth-3 undo walks moveCount 116→113); snap 3
  (post-probe) waste node gone = fold step 118 (recycle empties waste) with
  foundations unchanged — playback resumed forward. Full snapshots with
  wallclocks: `.test-artifacts/demo-sheet-undo-hud/probe-a11y-snaps.txt`.
- Sheet — PASS: title "Run Demo", exactly SIX options (Old demo game / One
  generated game / 5 / 10 / 20 generated games / Mid-game, scrubbed to
  middle), NO subtitle, NO Cancel, nothing clipped; swipe-down on the drag
  handle dismissed it back to the intact board (`demo-sheet-v3.png`,
  `demo-sheet-v3-dismissed.png`).

## Follow-ups

1. **A11y-tree-driven demo game (one game, separate device test).** Drive one
   generated game via agent-device taps on the accessibility handles
   (labels/content-desc on Android, testIDs on iOS — see
   `src/features/klondike/components/cards/accessibility.ts`) instead of
   reducer dispatch. Pros: validates real touch targets, hit slop, and the a11y
   tree itself; catches regressions reducer playback can't see; doubles as
   standardized smoke-test choreography. Cons: much slower (~seconds per move),
   brittle to layout/timing, needs snapshot polling, and mostly tests the
   automation harness beyond the first game. Recommendation: keep reducer
   playback for the playlist; add ONE a11y-driven smoke game as a separate
   scripted device test (e.g. a `scripts/` runner using agent-device), not part
   of the in-app playlist.
2. **Stop generated demos when all cards are face-up and let Auto Up finish.**
   Pros: exercises the real Auto Up feature end-to-end (queue generation,
   celebration handoff) under demo automation; shortens replay paths. Cons:
   loses the solver-controlled deterministic ending — replay currently hydrates
   with `autoUpEnabled: false` and validation asserts `hasWon` after the exact
   solver path; the runner and jest test would need an "all face-up → enable
   Auto Up → await win" branch, and failures become less attributable.
   Recommendation: later, for a SUBSET of games (e.g. every 5th), keep full
   solver paths for the rest so both endings stay covered.
3. **Native RSS in the HUD via `react-native-device-info` `getUsedMemory()`.**
   Pros: shows the number that actually matters for the known high-PSS issue
   (JS heap stays small while native memory grows). Cons: new native
   dependency for a dev-only HUD; needs a package guide per AGENTS.md.
   Recommendation: only if the Android slowdown investigation wants live
   on-screen RSS; otherwise keep using
   `scripts/collect-android-slowdown-sample.sh` snapshots.
4. **Custom close (X) affordance on `AppSheet`.** The `@expo/ui` universal
   BottomSheet has no native close-button prop (`isPresented`/`onDismiss`
   only). If a visible close control is ever wanted, add an optional small X
   `Button` row inside `AppSheet` itself so all sheets inherit it.
   Recommendation: not needed now — swipe/scrim dismissal is the platform
   convention.
