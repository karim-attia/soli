# History Entries Cleanup — Visual overhaul of list cards and preview sheet

## User prompt

```text
make a proposal to clean up the history entries. visually and also others. this was done quick and fast and i am open for a nice overhaul. especially for the individual game cards and the sheet. also, would it make sense to re-use the board layout from the main game? including width, card width, etc. calculation (which is a bit smaller because the sheet has larger paddings than the main game), but this would lead to a more unified look and potentially less code?
```

```text
Do
a1 a2 a4 b1 b2 b3 b4
felt background: not so sure, because green might look weird in a sheet. let's see later
header: i like it for the moment as is.
explain D better after

Question: does expo ui have badges or other components that we could use to replace things?
```

```text
some things are good, some things i don't like so much.
new unified board in sheet is nice. if easy, you could remove the extra padding on left and right, but not necessary. so that the first and last card align with the padding of the sheet. because the sheet already has padding, the board doesn't need extra padding.
Also, there's almost no space at the bottom of the sheet. react native safe area?

On the main screen, I like the new date formatting. I don't think started od finished is needed, what do you think? I also don't like that we effectively now have 3 different fonts: title, middle row and bottom. also in bottom, there's a badge. unify this so it looks less intrusive. draw 1 could even be just regular text like the other 2. date could also just be normal like this.
the badges on top right with status are too aggressive and colorful. i liked it better before. or any other idea? also solvable badge. btw same for in sheet
```

## Summary

Round 1 (steps 1–9) complete and iOS-simulator verified. Round 2 (feedback, steps
10–17) implemented and iOS-simulator verified (step 17: all 5 checks PASS, light +
dark, `r2-*` screenshots): the on-device review led to a
softer, text-only design — Badge pills and the Badge component are gone, status is
plain colored text top-right (green10/blue10/yellow11, as pre-cleanup), both
metadata lines share one secondary style (`$color10`, 14), draw count and
"Solvable" are plain text segments, the "Started"/"Finished" prefix was dropped
(solved shows finishedAt, others startedAt), the preview board renders
edge-to-edge in the sheet (0 outer gutters, `computeCardMetrics` compensated with
`+2*BOARD_COLUMN_GAP`), and the sheet got safe-area-aware bottom padding
(`Math.max(16, insets.bottom)`). Round 1 had replaced the duplicated `PREVIEW_*`
renderer (~310 lines) with the shared `BoardPreview` (reusing `computeCardMetrics`,
`computeTableauStackOffsets`, `CardVisual`, `EmptySlot`, shared card styles),
widened `CardVisualProps.card`/`computeTableauStackOffsets` to structural Picks,
introduced the shared `formatHistoryTimestamp` helper, and memoized
`HistoryListItem` with pressed opacity. `yarn typecheck`, `yarn lint`, `yarn jest`
(23 suites, 184 tests) all pass after round 2.

## Description

The history screen (`app/(tabs)/history.tsx`, 689 lines) was built quickly and contains
a complete second implementation of card rendering for the preview sheet:
`computePreviewMetrics` duplicates `src/features/klondike/utils/cardMetrics.ts`,
`PreviewCard`/`PreviewHiddenCard`/`PreviewEmptySlot` duplicate
`CardVisual`/`EmptySlot`, and `PREVIEW_*` constants duplicate `SUIT_SYMBOLS`,
`SUIT_COLORS`, `FACE_CARD_LABELS` and colors from `src/features/klondike/constants.ts`.

We reuse the main game's board rendering for the sheet preview (unified look, ~250
fewer lines) and polish the list entry cards (status pill, structured metadata,
friendly dates, pressed feedback).

Explicitly OUT of scope (user decisions):

- A3 felt background behind the preview — deferred ("green might look weird in a sheet, let's see later").
- C1 stats header redesign — user likes the current tiles as-is. DO NOT TOUCH the stats header.
- D1 (dropping unused `wasteTop`/`foundations`/`stockCount` preview fields), D2 (Tamagui token refactor of Badge/tiles), D3 (full file split) — to be explained/decided later. Only the code removal that falls out of A1 naturally is in scope.
- Expo UI components for badges: researched — the universal set has no Badge/Chip
  (only Jetpack Compose has Android-only `Badge`/`Chip`; SwiftUI side has none), so we
  keep the existing Tamagui-based `Badge`.

## Acceptance Criteria

- Opening a history entry shows the preview board rendered with the SAME card visuals
  as the main game (same fonts, corner rank/suit, center symbol, colors, radius
  scaling) via shared components — no duplicated preview card renderer remains in
  `app/(tabs)/history.tsx`.
- Preview board column widths come from `computeCardMetrics` (same formula as main
  board: edge gutters equal to `BOARD_COLUMN_GAP`), driven by the sheet content width
  (window width minus Expo sheet's 16 pt/side padding, as today).
- Preview stacking uses `computeTableauStackOffsets` (face-down cards at half offset),
  so face-down runs look like the real board and columns get shorter than today.
- Sheet header: deal name + status pill on one line; one quiet metadata line
  (date · moves · time); a single badges row with only `Draw N` and `Solvable`.
  The previous 4-badge soup (draw, solvable, moves, duration) is gone.
- List entry card: status is a pill (same `Badge` component) instead of colored text,
  top-right of the row.
- List entry metadata no longer wraps mid-sentence: date on its own quiet line, moves
  and time as short quiet text (no "Time" prefix), badges row unchanged (Draw N,
  Solvable).
- Dates are friendly: "Today, 5:33 PM", "Yesterday, 5:33 PM", "Jul 6, 5:33 PM" (same
  year, no "at", no year), "Jul 6, 2025" (older). Keep the "Started"/"Finished"
  prefix logic. Sheet and list share one formatting helper.
- `HistoryListItem` is wrapped in `React.memo` and the row gives pressed feedback
  (opacity via Pressable style function).
- `yarn typecheck`, `yarn lint`, `yarn jest` pass.
- Verified on the iOS simulator with a real build: list renders, sheet opens with the
  new preview, cards match the main game look.

## Possible approaches incl. pros and cons

Chosen: extract a presentational `BoardPreview` into the klondike feature and reuse
`computeCardMetrics`, `computeTableauStackOffsets`, `CardVisual`, `EmptySlot`, and
card styles. Pros: one card renderer, pixel-identical look, big line-count reduction.
Cons: `CardVisual`'s prop must be widened (it currently takes a full `Card` but only
reads `suit`/`rank`) and it renders at 100% of a sized wrapper, so the preview needs
absolutely-positioned sized wrappers — both trivial.

Rejected: keeping a separate simplified renderer (status quo) — duplicated code and
visual drift. Rejected: rendering real `AbsoluteCardLayer` machinery — way too heavy
for a static preview.

## Open questions to the user

None blocking. Deferred decisions listed under Description.

## Dependencies

None new. `@expo/ui` sheet usage unchanged (see
`docs/external-package-guides/expo-ui.md`).

## UX/UI Considerations

- Card width in the sheet ends up ~45 pt on a 390 pt screen (vs ~42 today) — slightly
  bigger, still fits 7 columns with the main-board gap formula.
- Shorter columns (half-offset face-down stacks) reduce the Android sheet's native
  "settle upward" behavior for tall content (documented in
  `docs/product/expo-ui-history-preview-sheet/prototype-expo-ui-bottom-sheet.md`).
- No felt background for now: cards keep their existing border
  (`COLOR_CARD_BORDER`) on the plain sheet background.
- The preview is non-interactive (`pointerEvents="none"`), as today.

## Components

Reuse:

- `src/features/klondike/utils/cardMetrics.ts` — `computeCardMetrics`
- `src/features/klondike/components/cards/utils.ts` — `computeTableauStackOffsets`
- `src/features/klondike/components/cards/CardVisual.tsx` — `CardVisual`, `EmptySlot`
- `src/features/klondike/components/cards/styles.ts` — `faceDown`/`cardBase` styles
  for the face-down card in the preview
- `src/features/klondike/constants.ts` — `BOARD_COLUMN_GAP`, `BOARD_COLUMN_MARGIN`
- Existing `Badge` in `app/(tabs)/history.tsx`

Create:

- `src/features/klondike/components/BoardPreview.tsx` — presentational, props:
  `tableau: { cards: { suit; rank; faceUp }[] }[]` (structural type, NOT importing
  from `src/state/history` to avoid a feature→state dependency; `HistoryPreviewColumn`
  is structurally compatible) and `availableWidth: number`.

## How to fetch data, how to cache

Unchanged; data still comes from `useHistory()` / `entry.preview`.

## Related tasks

- `docs/product/expo-ui-history-preview-sheet/prototype-expo-ui-bottom-sheet.md`
- `docs/product/unbounded-game-history/native-sqlite-history.md`

## Simplification ideas

- The `PREVIEW_*` constants, `computePreviewMetrics`, `PreviewColumn`, `PreviewCard`,
  `PreviewHiddenCard`, `PreviewEmptySlot`, and `previewStyles` in
  `app/(tabs)/history.tsx` are all deleted by A1 (~250 lines).
- Deferred (do not do now): D1 drop unused preview fields, D2 Tamagui-token Badge
  refactor, D3 further file split.

## Steps to implement

1. [done] Widen `CardVisualProps.card` to `Pick<Card, 'suit' | 'rank'>` and
   `computeTableauStackOffsets`'s column param to `readonly Pick<Card, 'faceUp'>[]`.
   Leave behavior identical; add a one-line comment why (shared with BoardPreview).
2. [done] Create `src/features/klondike/components/BoardPreview.tsx`:
   - `computeCardMetrics(availableWidth)` for metrics.
   - Row of 7 columns with main-board margins (first column `BOARD_COLUMN_GAP`,
     others `BOARD_COLUMN_MARGIN`, last column `BOARD_COLUMN_GAP` right).
   - Per column: `computeTableauStackOffsets(cards, metrics.stackOffset)`; each card
     in an absolutely-positioned wrapper (`width`, `height`, `top`); face-up →
     `CardVisual`, face-down → plain `View` with the shared `faceDown` card style +
     radius; empty column → `EmptySlot` (`highlight={false}`).
   - Root `pointerEvents="none"`, column height = last offset + card height.
3. [done] Replace the preview implementation in `app/(tabs)/history.tsx` with
   `<BoardPreview tableau={entry.preview.tableau} availableWidth={contentWidth} />`;
   delete all `PREVIEW_*` constants, `computePreviewMetrics`, `PreviewColumn`,
   `PreviewCard`, `PreviewHiddenCard`, `PreviewEmptySlot`, `previewStyles`.
4. [done] A4 sheet header: name + status pill (Badge, tone: solved→success,
   incomplete→warning, active→info) in one row; quiet metadata line
   `Finished Today, 5:30 PM · 12 moves · 11:07`; badges row only `Draw N` +
   `Solvable`.
5. [done] B3 shared date helper (`formatHistoryTimestamp` replacing the
   old `formatFinishedAt`): Today/Yesterday/same-year/older rules
   above, `Intl.DateTimeFormat` based, keep the devLog-on-error guard.
6. [done] B1+B2 list item: row 1 = name + status pill; row 2 = quiet
   `Started/Finished <friendly date>`; row 3 = quiet `12 moves · 11:07` text plus the
   existing badges (Draw N, Solvable). Drop the `·`-joined single metadata string.
7. [done] B4: `React.memo` around `HistoryListItem`; pressed opacity on the
   Pressable (style function, 0.7 when pressed).
8. [done] Run `yarn typecheck && yarn lint && yarn jest` — all pass
   (22 suites, 180 tests) with no fallout.
9. [done] iOS simulator build + smoke test (testing sub-agent, Jul 6 2026): clean
   `yarn ios` build on iPhone 17 Pro simulator, all 8 visual checks PASS (light +
   dark mode); screenshots in `.test-artifacts/history-entries-cleanup/`. Details
   in Testing section.

Round 2 (on-device feedback, Jul 6 2026):

10. [done] BoardPreview edge-to-edge in the sheet: first/last column margins 0
    (interior gaps still `BOARD_COLUMN_GAP`); metrics computed via
    `computeCardMetrics(availableWidth + 2 * BOARD_COLUMN_GAP)` to compensate for
    the formula's assumed edge gutters, so cards fill exactly
    `7*card + 6*gap = availableWidth` (comment in code).
11. [done] Sheet bottom spacing: `useSafeAreaInsets()`; content YStack gets
    `pb={Math.max(16, insets.bottom)}` (Expo UI's content-sized sheet adds no
    bottom inset for RN content — the old renderer's `paddingBottom: 16` had been
    deleted with it).
12. [done] Drop "Started "/"Finished " prefix in list + sheet;
    `formatEntryTimeLabel` returns just the formatted timestamp (solved →
    finishedAt, others → startedAt; product decision commented).
13. [done] Unified list-row typography: title (16/700) + one secondary style
    (`$color10`, fontSize 14) for line 2 (date) and line 3
    (`12 moves · 11:07 · Draw 1[ · Solvable]`) — no badges, plain text segments
    via `formatEntryDetails`.
14. [done] Status reverted to plain colored text top-right (green10 Solved,
    blue10 Active, yellow11 Incomplete; 14/600) via shared `StatusText`, used in
    both list rows and the sheet header.
15. [done] Sheet metadata unified: single secondary line
    `date · moves · time · Draw N[ · Solvable]`; badges row removed entirely;
    `Badge`/`BadgeProps` deleted; `STATUS_DISPLAY` back to a colorKey mapping.
16. [done] `yarn typecheck && yarn lint && yarn jest` — all pass
    (23 suites, 184 tests), zero lint warnings.
17. [done] Native re-verification of round 2 (testing sub-agent, Jul 6 2026):
    Metro was still running, app relaunched with fresh JS bundle (no rebuild
    needed), new text-only UI confirmed live. All 5 round-2 checks PASS in light
    and dark mode; `r2-*` screenshots in
    `.test-artifacts/history-entries-cleanup/`. Details in Testing section.

## Plan: Files to modify

- `src/features/klondike/components/cards/CardVisual.tsx` (prop widening)
- `src/features/klondike/components/cards/utils.ts` (param widening)
- `src/features/klondike/components/BoardPreview.tsx` (new)
- `app/(tabs)/history.tsx`
- `docs/product/history-entries-cleanup/history-entries-cleanup.md` (this file)

## Files actually modified

- `src/features/klondike/components/cards/CardVisual.tsx` — `CardVisualProps.card`
  widened to `Pick<Card, 'suit' | 'rank'>` (comment notes BoardPreview sharing).
- `src/features/klondike/components/cards/utils.ts` — `computeTableauStackOffsets`
  column param widened to `readonly Pick<Card, 'faceUp'>[]`.
- `src/features/klondike/components/BoardPreview.tsx` — NEW shared preview board
  (structural `BoardPreviewCard`/`BoardPreviewColumn` types, no import from
  `src/state/history`).
- `app/(tabs)/history.tsx` — preview renderer deleted (~310 lines incl. sheet
  restructure; 689 → 438 lines), sheet header A4, list rows B1/B2/B3/B4,
  `formatHistoryTimestamp` replaces `formatFinishedAt`. Stats tiles untouched.
  Round 2: Badge/BadgeProps deleted, `StatusText` (plain colored text) shared by
  list + sheet, unified secondary text style, prefix-less dates,
  `formatEntryDetails` folds Draw/Solvable into text, sheet safe-area bottom
  padding (438 → 401 lines).
- `src/features/klondike/components/BoardPreview.tsx` — Round 2: edge-to-edge
  (0 outer gutters, metrics compensated with `+2*BOARD_COLUMN_GAP`).
- `docs/product/history-entries-cleanup/history-entries-cleanup.md` (this file).

## Intermediary learnings

- Expo UI has no cross-platform Badge/Chip: the universal set is BottomSheet, Button,
  Checkbox, Collapsible, Column, FieldGroup, Host, Icon, List, ListItem, Picker,
  RNHostView, Row, ScrollView, Slider, Spacer, Switch, Text, TextInput. Jetpack
  Compose exposes `Badge`/`BadgedBox`/`Chip`/`Card` but Android-only and each needs
  its own native `Host` (heavy inside a FlatList). Keep the Tamagui `Badge`.
- `CardVisual` renders at `width/height: '100%'` of its wrapper (unlike the old
  `PreviewCard`, which sized itself), so `BoardPreview` positions each card via a
  sized absolutely-positioned wrapper `View`, mirroring `AbsoluteCardLayer`.
- `BoardPreview`'s row is `justifyContent: 'center'` (main board uses
  `flex-start`) so the preview stays balanced if card widths clamp at
  `MAX_CARD_WIDTH` on wide screens; with unclamped widths the two are identical
  because the gap formula consumes the full `availableWidth`.
- Older-than-this-year timestamps intentionally drop the time ("Jul 6, 2025") per
  the acceptance criteria.

## Identified issues

(None — cheap tests green; iOS simulator smoke test (step 9) all PASS. One
pre-existing observation outside this feature's scope: active-game move count in
history lags the live board, see Testing.)

## Testing

- Cheap: `yarn typecheck && yarn lint && yarn jest` — all pass (22 suites, 180 tests).
- Native: iOS simulator clean build (`yarn ios`), agent-device smoke test of the
  history screen and preview sheet. The board a11y tree conventions are in
  `src/features/klondike/components/cards/accessibility.ts` (main game only; the
  preview is `pointerEvents="none"` and needs screenshot verification, not a11y).

### iOS smoke test results (Jul 6 2026, iPhone 17 Pro simulator, iOS 26.5)

All 8 checks PASS. Screenshots in `.test-artifacts/history-entries-cleanup/`:
`01-main-board.png` (reference), `02-history-list-light.png`,
`03-sheet-solved-light.png`, `04-after-dismiss-light.png`,
`05-sheet-active-light.png`, `06-history-list-dark.png`,
`07-sheet-solved-dark.png`, `08-final-list-light.png`.

1. PASS — list renders: stats tiles unchanged on top, entry cards below.
2. PASS — entry cards: name left + status pill top-right (Active=blue,
   Solved=green Badge pills, not colored text); quiet "Started Today, 5:33 PM"
   date line; quiet "12 moves · 11:07" next to "Draw 1" badge; no wrapping.
3. PASS — tapping an entry opens the bottom sheet.
4. PASS — sheet header: name + pill on one line; one quiet metadata line
   ("Finished Today, 5:30 PM · 12 moves · 11:07"); badges row only "Draw 1".
5. PASS — preview cards pixel-match the main board style (corner rank, small
   suit top-right, big center suit, navy face-down, rounded corners); face-down
   runs stack at half offset.
6. PASS — all 7 columns fit the sheet width, no clipping.
7. PASS — swipe-down dismisses the sheet; list unaffected.
8. PASS — dark mode: list + sheet render correctly; light mode restored after.

Not covered (no matching data in history): Incomplete (warning) pill and
"Solvable" badge — code path identical to the verified pills/badges.
Observation (pre-existing, not this feature): the Active entry showed "0 moves"
while the live board showed 13 moves — history rows seem to sync move count only
at save points, worth a separate look.

### Round 2 re-test results (Jul 6 2026, iPhone 17 Pro simulator, iOS 26.5)

JS-only changes, so no rebuild: Metro was still up, app relaunched with a fresh
bundle (confirmed live by text-only statuses — no pills anywhere). All 5 checks
PASS. Screenshots (`.test-artifacts/history-entries-cleanup/`):
`r2-01-list-light.png`, `r2-02-list-scrolled-solved.png`,
`r2-03-sheet-solved-light.png`, `r2-04-sheet-solved-dark.png`,
`r2-05-list-dark.png`, `r2-06-final-list-light.png`,
`r2-07-sheet-left-edge-crop.png` / `r2-08-sheet-right-edge-crop.png`
(3x alignment crops).

1. PASS — list rows: plain colored status text top-right (blue "Active", green
   "Solved", ochre "Incomplete"), no pill backgrounds; line 2 is date only
   ("Today, 6:50 PM", no Started/Finished prefix); line 3 is plain
   "80 moves · 4:42 · Draw 1" (and "· Solvable" seen on FG9B-9EHC) — no badge
   chips; lines 2+3 share the same secondary size/color.
2. PASS — sheet: title + green "Solved" text on one line; single secondary line
   "Today, 5:30 PM · 12 moves · 11:07 · Draw 1"; no badges row.
3. PASS — first card left edge flush with the title text edge (verified on a 3x
   crop), last card flush right with the "Solved" text edge; no extra gutters.
4. PASS — visible breathing room (~34 pt) below the board before the sheet's
   bottom edge.
5. PASS — nothing clipped, all 7 columns fit, swipe-down dismiss works; dark
   mode list + sheet fine, light restored.

Oddities (non-blocking): the history data now contains several duplicate
`PZ6U-C26R` incomplete entries with odd stats (e.g. "80 moves · 0:02",
"0 moves · 50:53"-style mismatches) — artifacts of earlier scrubber/demo test
runs and the known save-point sync lag, unrelated to this UI change.

## Follow-ups

- A3 felt background behind the sheet preview (deferred by user).
- C1 stats header simplification (user likes current for now).
- D1 drop constant/unused `wasteTop`/`foundations`/`stockCount` from
  `HistoryPreview`; D2 replace `useTheme`+`useMemo`+hex-fallback patterns with direct
  Tamagui tokens; D3 split remaining history UI into `components/history/`.
