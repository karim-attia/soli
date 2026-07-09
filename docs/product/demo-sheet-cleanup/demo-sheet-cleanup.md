# Demo Sheet Cleanup — Sections, Compact Rows, Celebration Preview, Near-Win

Follow-up to the sheet scope of
`docs/product/demo-autosolve-playlist/demo-sheet-undo-probes-info-hud.md`
(read its sheet learnings: Android detent clipped a 6th default-size button;
buttons are `size="$3"` with `gap="$2"` since then; no Cancel/subtitle on
purpose).

## User prompt

```text
pls clean up demo sheet. how to present options best? check what else we could add there e.g. celebration.
```

## Summary

- Status: DONE (2026-07-09). Steps 1–5 done, cheap gates green (typecheck/lint
  clean, jest 28 suites / 289 tests passed). Android smoke: all behaviors PASS
  (chip row scrolls on first present, chip 33 + Random previews + abort,
  near-win real win, playlist "1", swipe-down dismissal). The one open issue
  (Testing section clipped at the default detent) was fixed by compacting
  every section to ONE row and CONFIRMED FIXED by the device re-check — all 4
  headers + 4 rows incl. the full Testing row visible at the default detent on
  first present. See "Detent-clipping fix" + Testing.
- Restructure `DemoChoiceSheet` in `app/(tabs)/index.tsx` from 9 flat buttons
  into 4 titled sections with compact rows (net FEWER rows than today).
- Add two missing capabilities that already exist via deep links:
  celebration preview (random + specific mode) and the near-win fixture.
- Wire `startCelebrationPreview` through `useKlondikeGame` return →
  `KlondikeGameSessionControls` → sheet.

## Description

The developer Demo sheet accreted 9 flat buttons across several stories
(playlist counts, scrubbed fixture, undo-hint reset, history seeding). It has
no visual grouping, wastes a row per playlist count, and misses two
dev-loop-critical launches that today require typing deep links:

- Celebration preview (`?celebration=<id|random>`): starts the dev-hold
  celebration overlay on the current board without winning. Exists as
  `startCelebrationPreview(modeId?)` in `useCelebrationController`, already
  threaded into `useDemoGameLauncher` for the deep link — just not exposed to
  the sheet.
- Near-win fixture (`?demo=nearwin&left=N`): solution replayed to N moves
  before completion → play the last move manually and get a REAL win +
  celebration end-to-end. Already supported by
  `handleLaunchDemoGame({ demoMode: 'nearwin', nearWinMovesLeft: N })`.

Not added (deliberately): exact-deal launch (needs text input; deep link is
the right tool), settings toggles (Settings screen owns them), reset game
(header New Game exists).

## Acceptance Criteria

- Sheet shows 4 titled sections, top to bottom:
  1. **Demo games** — "Old demo game" button; one row "Generated" with four
     compact count buttons `1 / 5 / 10 / 20` (1 = `demoMode: 'single'`,
     others `demoMode: 'playlist'` + `gameLimit`).
  2. **Fixtures** — one row with two buttons: "Mid-game scrub"
     (`demoMode: 'scrubbed'`) and "Near win" (`demoMode: 'nearwin'`,
     `nearWinMovesLeft: 1`).
  3. **Celebration** — "Random" button + one HORIZONTAL scrollable chip row of
     all celebration modes from `CELEBRATION_MODE_METADATA` (label
     `"<id> <name>"`). Tapping a chip/Random dismisses the sheet and starts
     the preview (dev-hold; abort by tapping the animation, as with the deep
     link).
  4. **Testing** — "Reset undo hint" button; one row with "Seed history" and
     "Clear seeded" buttons.
- Every action dismisses the sheet first (existing pattern: set visible false,
  then call the control).
- Sheet still fits the Android detent without clipping (fewer vertical rows
  than the current 9-button layout); swipe-down/scrim dismissal unchanged.
- Celebration preview from the sheet behaves like the deep-link preview
  (random when no mode id passed, specific mode otherwise). Start it after a
  short settle delay (see step 3) so sheet dismissal doesn't race the overlay
  mount.
- No behavior change to any existing launch option.

## Possible approaches

- **A (recommended, chosen): restructure in place with tamagui primitives.**
  Section headers = small muted uppercase `Text`; rows = `XStack` of
  `size="$3"` buttons (flex for equal widths); celebration chips = horizontal
  `ScrollView` of small buttons. Pros: zero new deps, matches existing sheet
  conventions, dev-only surface. Cons: none meaningful.
- B: Expo UI controls (FieldGroup/Picker) inside the sheet. Rejected: nested
  native Hosts inside `RNHostView` had unreliable nested gestures on Android
  (see `docs/external-package-guides/expo-ui.md`, FieldGroup notes), and the
  guide's History-sheet decision explicitly avoids nested scrolling containers
  in the universal sheet. A horizontal RN ScrollView inside `RNHostView` is
  plain React Native content and should be fine — but VERIFY chip-row
  scrolling on the Android device during smoke.
- C: replace sheet with a dedicated dev screen/route. Rejected: gold plating;
  the sheet is fast to open mid-game and the point is quick launches.
- Mode picker alternatives considered: only "Random" + badge-cycling (up to 47
  taps to reach a mode — too slow for celebration dev work); a wheel/menu
  Picker (Expo UI nesting risk, above). Chip row wins: one tap to any mode.

## Open questions to the user

None blocking. Defaults chosen (flag in final summary):

- Near-win launches with `nearWinMovesLeft: 1` (the common case; other values
  stay deep-link-only via `&left=N`).
- Chip labels are `"<id> <name>"` so ids stay visible for cross-referencing
  logs/tests. Alternative: name only — less useful during celebration
  debugging.

## Dependencies

- None new. `docs/external-package-guides/expo-ui.md` (sheet constraints),
  `docs/external-package-guides/tamagui.md`.

## UX/UI Considerations

- Keep `size="$3"` buttons and tight gaps (Android detent learning). Section
  headers: `fontSize={12}`, muted color (`$color10`-ish), uppercase, small top
  padding.
- Chip row: `ScrollView horizontal showsHorizontalScrollIndicator={false}`,
  chips `size="$2"`, single line. 47 chips render fine (plain buttons).
- Row buttons use `flex={1}` so counts/fixture/history pairs share the width.
- Watch the sheet's intrinsic measurement (`RNHostView matchContents`): give
  the horizontal ScrollView a stable explicit height if measurement is flaky
  on first present.

## Components

- Edit in place: `DemoChoiceSheet` in `app/(tabs)/index.tsx`. No new
  components in `components/` (single dev-only call site).

## Related tasks

- `docs/product/demo-autosolve-playlist/demo-sheet-undo-probes-info-hud.md`
  (previous sheet round; clipping + dismissal learnings)
- `docs/product/celebration-skia-atlas/celebration-skia-atlas.md` (celebration
  modes being previewed)

## Simplification ideas

- The 4 playlist-count buttons collapse 4 rows → 1; history 2 rows → 1;
  fixtures 2 rows → 1. Net: 9 rows → ~7 rows incl. headers.
- Reuse `LaunchDemoGameOptions` for everything except celebration (one new
  control callback, no new option plumbing).

## Steps to implement

1. [completed] **Expose preview to the session** — `useKlondikeGame` already
   destructures `startCelebrationPreview` from `useCelebrationController`; add
   it to the hook's return object. Add it to `KlondikeGameSessionControls`
   type + the `onControlsChange` payload in
   `src/features/klondike/components/KlondikeGameSession.tsx`.
2. [completed] **Sheet restructure** — rewrite `DemoChoiceSheet` in
   `app/(tabs)/index.tsx` per Acceptance Criteria. New prop:
   `onStartCelebration: (modeId?: number) => void`. Import
   `CELEBRATION_MODE_METADATA` from `src/animation/celebrationModes`.
   Keep the existing inline comments that document product decisions (no
   Cancel, no dismiss hint, `size="$3"` clipping note) — update wording where
   the layout changed.
3. [completed, imports `DEMO_AUTO_STEP_INTERVAL_MS` instead of a literal 300]
   **Screen handlers** — in `TabOneScreen`, add
   `handleStartCelebration(modeId?)`: close sheet, then
   `setTimeout(() => sessionControls?.startCelebrationPreview(modeId), 300)`
   (mirror the deep-link settle delay `DEMO_AUTO_STEP_INTERVAL_MS = 300`;
   comment why). Near-win goes through the existing `handleDemoChoice` with
   `{ demoMode: 'nearwin', nearWinMovesLeft: 1 }`.
4. [completed, all green — see Testing] **Cheap gates** —
   `yarn typecheck && yarn lint && yarn jest`;
   `yarn exec oxfmt <touched files>`.
5. [completed 2026-07-09 — PASS except one clipping issue, see Identified
   issues] **Android device smoke** (testing sub-agent; must read
   `.agents/skills/soli-testing/SKILL.md` first): build+install `yarn release`,
   open Demo sheet, screenshot: all sections visible, nothing clipped; chip
   row scrolls horizontally; tap a celebration chip (e.g. 33) → sheet closes,
   preview runs, tap animation aborts back to the game; tap "Near win" → board
   one move from winning; complete it → real win + celebration. Verify one
   playlist count button still works (1 game).
6. [completed for steps 1–4] Update this plan (statuses, files modified,
   learnings, testing). NEVER SKIP THIS.

## Plan: Files to modify

- `app/(tabs)/index.tsx` — sheet restructure + handlers
- `src/features/klondike/hooks/useKlondikeGame.ts` — return
  `startCelebrationPreview`
- `src/features/klondike/components/KlondikeGameSession.tsx` — controls type +
  payload
- `docs/product/demo-sheet-cleanup/demo-sheet-cleanup.md` — statuses

## Files actually modified

- `src/features/klondike/hooks/useKlondikeGame.ts` — `startCelebrationPreview`
  added to `UseKlondikeGameResult` type + return object (with a comment noting
  it is the same controller entry point as the `?celebration=` deep link).
  oxfmt also canonicalized the pre-existing `dealNewGame` useCallback
  formatting — no semantic change.
- `src/features/klondike/components/KlondikeGameSession.tsx` —
  `startCelebrationPreview: (modeId?: number) => void` in
  `KlondikeGameSessionControls`, destructured from `useKlondikeGame`, included
  in the `onControlsChange` payload and effect deps.
- `app/(tabs)/index.tsx` — `DemoChoiceSheet` restructured into 4 sections
  (Demo games / Fixtures / Celebration / Testing) with a file-local
  `SheetSectionHeader` (fontSize 12, `$color10`, uppercase); celebration chip
  row = RN horizontal `ScrollView` + `size="$2"` buttons labeled
  `"<id> <name>"`; new `onStartCelebration` prop; `handleStartCelebration` in
  `TabOneScreen` (closes sheet, `setTimeout(..., DEMO_AUTO_STEP_INTERVAL_MS)`);
  product-decision comments kept/adapted (no Cancel, no dismiss hint,
  `size="$3"` clipping learning, phone-data guardrail on history seeding).

## Intermediary learnings

- Tamagui v4 `XStack` here doesn't accept `alignItems` as a prop (typecheck
  error); the file's existing convention `style={{ alignItems: 'center' }}`
  works — used for the "Generated" row.
- `useKlondikeGame` has an explicit `UseKlondikeGameResult` type, so the new
  return key needed a matching type entry (not just the object literal).
- `DEMO_AUTO_STEP_INTERVAL_MS` is exported from `useDemoGameLauncher`, so the
  screen imports the constant instead of hardcoding 300 — keeps the settle
  delay in sync with the deep-link path by construction.
- The chip-row `ScrollView` got no explicit height (plan's "if measurement is
  flaky" contingency not needed preemptively) — device smoke must verify
  first-present measurement inside `RNHostView matchContents`.
- Device smoke 2026-07-09: the feared `RNHostView matchContents` ScrollView
  measurement problem did NOT occur — the horizontal chip row measured 74 px
  and scrolled natively on the sheet's very first present. No explicit height
  needed.
- The Android detent DID clip again (the same failure mode as the 6-button
  round documented in the previous sheet plan): 4 headers + 7 rows exceed the
  default detent, pushing the whole Testing section below the fold. The sheet
  is swipe-up-expandable, so everything stays reachable — but "fits without
  clipping" was not achieved. When adding rows to this sheet, budget ~6 rows
  + 3 headers max for the default detent, or raise the snap point.
- Fresh-deal a11y shows `Stock, 23 cards` + one waste card at moves 0 — this
  is the documented product decision in `src/solitaire/klondike.ts` (every
  new deal reveals the first stock draw into the waste), not a dirty state.

## Identified issues

- **CLOSED (fixed 2026-07-09) — Testing section clipped at the default Android
  detent.** First cut: on first present the sheet showed Demo games / Fixtures
  / Celebration fully, but the TESTING header was cut off at the bottom edge
  and "Reset undo hint" / "Seed history" / "Clear seeded" sat below the fold
  (ghosted behind the nav bar; also absent from the a11y tree until revealed).
  Screenshots: `01-sheet-first-present.png` (clipped) vs
  `05-sheet-after-swipe-up.png` (expanded). FIXED by the one-row-per-section
  compaction (see "Detent-clipping fix"); device re-check confirms all 4 rows
  incl. the full Testing row visible at the default detent on first present,
  no swipe needed (`recheck-01-sheet-first-present.png`).
- Horizontal chip-row ScrollView inside `RNHostView matchContents`: NO issue —
  rendered at full height (74 px) and scrolled natively on first present.

## Testing

Cheap gates 2026-07-09 (implementation sub-agent):

- `yarn exec oxfmt` on the 3 touched code files — clean (117 ms).
- `yarn typecheck` — exit 0, no errors.
- `yarn lint` — exit 0, no warnings.
- `yarn jest` — 28 suites passed, 289 tests passed, 0 failed (2.4 s).

Android device smoke (step 5) 2026-07-09, physical phone A065 via
`yarn release` (versionCode 13, build+install+launch 74 s). Artifacts in
`.test-artifacts/demo-sheet-cleanup-android/`. Results:

- **Sections/layout — PASS with one clipping issue.** All 4 titled sections in
  order (DEMO GAMES, FIXTURES, CELEBRATION, TESTING) with the expected rows:
  "Old demo game"; "Generated" label + 1/5/10/20; "Mid-game scrub"+"Near win";
  "Random" + chip row; "Reset undo hint" + "Seed history"/"Clear seeded".
  BUT at the default detent the Testing section is below the fold (see
  Identified issues). `01-sheet-first-present.png`,
  `05-sheet-after-swipe-up.png`.
- **Chip row first-present measurement — PASS.** HorizontalScrollView measured
  74 px tall on first present, chips visible ("0 Spiral Bloom" …), scrolled
  natively via swipe across the whole 0–46 range (spot checks at 10–13, 33–39).
  `04-chiprow-midscroll.png` (mid-scroll at "Carousel / 4 Ellipse Drift / 5
  Starburst Spur / 6 Dual Spiral").
- **Chip 33 Cascade Imprint — PASS.** Sheet closed, preview started within
  ~1 s, badge "Celebration 33 · Cascade Imprint", tap on the animation aborted
  silently back to the untouched in-progress board (same stock/waste/
  foundations). `07-mode33-preview.png`.
- **Random — PASS.** Started "Celebration 25 · Flock" (badge visible); abort
  by tap worked. `08-random-preview.png`.
- **Near win — PASS.** Board hydrated one move from winning (all foundations
  at Q♠/K♥/K♦/K♣, K♠ on waste). One tap on the waste K♠ auto-moved it to the
  foundation → REAL win, moves 244, celebration "Celebration 30 · Diamond
  Drift" + afterwards the "Nice win! Ready for another round?" dialog.
  `09-nearwin-real-win.png`.
- **Generated "1" — PASS.** Single auto-solve launched, HUD "Game 1/1",
  auto-play visibly progressing (140 moves at 0:05). Ran to its win.
  `10-playlist-1-running.png`.
- **Swipe-down dismissal — PASS.** Swipe down on the sheet body dismissed it
  (game screen back, no sheet nodes in the a11y tree).
- **End state — fresh normal game** via `soli://?reset=game` (moves 0, 0:00,
  empty foundations; stock 23 + 1 waste card = the app's normal auto-draw on
  a fresh deal, 28+23+1=52). `12-final-fresh-game.png`. No real history rows
  touched (no wipes; seeding buttons not pressed).

Detent-fix re-check 2026-07-09 (testing sub-agent), physical phone A065, warm
`yarn release` (versionCode 13, 57 s). Screenshots prefixed `recheck-` in
`.test-artifacts/demo-sheet-cleanup-android/`:

- **Detent fit — PASS.** At the default detent on first present (no swipe-up):
  title "Run Demo", all 4 headers (DEMO GAMES / FIXTURES / CELEBRATION /
  TESTING) and all 4 rows fully visible. Testing row `Undo hint / Seed history
  / Clear seeded` fully rendered above the bottom edge (not ghosted/cut) and
  present in the a11y tree without revealing. Rows match the compacted spec:
  `Old / 1 / 5 / 10 / 20`, `Mid-game scrub / Near win`, chips starting
  `Random, 0 Spiral Bloom, 1 Lissajous Weave`, Testing row.
  `recheck-01-sheet-first-present.png`.
- **Chip row scroll — PASS.** First chip is "Random"; horizontal pan scrolled
  to chips 2–4 (`recheck-02-chiprow-scrolled.png`) and back.
- **Random chip — PASS.** Sheet closed, preview started ("Celebration 35 ·
  Shooting Stars" badge), `recheck-03-random-preview.png`; tap on the
  animation aborted cleanly (devLog "[Celebration] abort requested
  { preview: true }"), board back untouched. Testing side effect, NOT an app
  bug: the abort tap (agent-device press at screen center) ALSO passed through
  to the board underneath — it moved 9♦ (col 7) onto 10♣ (col 1) and left the
  nav drawer open, because after the overlay unmounted the same synthetic tap
  sequence landed on the live board/edge. A finger tap doesn't do this
  (previous smoke's abort was clean); future agents should abort by tapping
  an empty screen area (e.g. below the tableau) instead of center.
  Separately, the drawer visit tripped over the Settings screen's Developer
  switch being OFF in the UI on cold read — dev mode had to be re-enabled via
  the Settings toggle before reopening the sheet (Demo header button was gone;
  `recheck-05-settings.png` shows the switch off, `recheck-06` re-enabled).
  No crash in logcat; app process stayed alive the whole run. Worth watching:
  whether the persisted `developerMode` survives across launches or was never
  persisted after deep-link enablement.
- **Old — PASS.** Sheet reopened (still fully un-clipped at default detent,
  `recheck-07-sheet-reopened.png`); tap "Old" loaded the handcrafted demo
  board (stock 9 cards, King of diamonds on waste, column 7 empty, long
  built-out columns — clearly a different board), no crash.
  `recheck-08-old-demo-loaded.png`.
- **End state — fresh normal game** via `soli://?reset=game` (moves 0, time
  0:00, empty foundations, stock + auto-drawn waste card).
  `recheck-09-final-fresh-game.png`. No history wipes; seeding not pressed.

## Detent-clipping fix (orchestrator, 2026-07-09, after device smoke)

Applied option (a)+ in `app/(tabs)/index.tsx` — every section is now exactly
ONE row (4 headers + 4 rows + title):

- Demo games: `Old / 1 / 5 / 10 / 20` in one row ("Old demo game" merged in as
  "Old"; the "Generated" inline label dropped).
- Celebration: the "Random" button moved INTO the chip ScrollView as the first
  chip (size `$3` for all chips so the row height matches the other rows).
- Testing: `Undo hint / Seed history / Clear seeded` in one row.
- Comment added at the top of the sheet body documenting the row budget
  (first cut with 7 rows pushed Testing below the default detent fold).
- `.agents/skills/soli-testing/SKILL.md` updated ("Reset undo hint" → Testing
  → "Undo hint").
- Gates after fix: oxfmt/typecheck/lint exit 0. Device re-check 2026-07-09
  (testing sub-agent, warm `yarn release`, 57 s): **PASS** — at the default
  detent on FIRST present (no swipe-up) all 4 headers and all 4 rows are fully
  visible, including the entire Testing row (`Undo hint / Seed history /
  Clear seeded` fully rendered above the bottom edge and present in the a11y
  tree). `recheck-01-sheet-first-present.png`. Random chip and Old demo also
  re-verified working (see Testing).

## Follow-ups

- **Remember last-used celebration chip / scroll position.** Pro: faster
  iteration on one mode. Con: state for a dev sheet. Recommendation: skip
  unless it annoys.
- **`&left=N` control for near-win in the sheet** (stepper). Deep link already
  covers it; sheet stays one-tap. Recommendation: skip.
