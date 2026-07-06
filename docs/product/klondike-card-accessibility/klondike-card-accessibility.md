# Klondike Card Accessibility — Board Labels, Roles & testIDs

Status: **DONE — Implemented & device-validated on Android (steps 1–8) and iOS (step 9, 2026-07-06). All steps complete.**
Created: 2026-07-06

## User prompt

> "Add accessibility labels to the board cards (small, separate story) — the Android tester had to fall back to unreliable coordinate taps because the board exposes almost no a11y tree. This would make every future automated device test on Android faster and more reliable, and it's a genuine accessibility win for the app itself, which fits the "best Solitaire app" vision. This is the only follow-up I'd actually schedule. Got this recommendation. Pls do."

## Description

The Klondike board currently exposes almost no accessibility tree: no `accessibilityLabel`, no `accessibilityRole`, and no `testID` anywhere on board elements (only 3 `accessibilityLabel` usages exist app-wide, on header buttons and history). Two consequences:

1. **Automated device testing**: agent-device's `snapshot -i` sees an essentially empty a11y tree on Android, forcing testers to fall back to brittle coordinate taps. Labels + testIDs make every future device test faster and more reliable.
2. **Real accessibility**: VoiceOver/TalkBack users currently cannot identify any card. This is gap **R4** in `docs/product/architecture-performance-review/findings.md` (lines 118–123).

**Scoping vs. R4**: R4's full scope also includes accessible *move announcements* and `accessibilityValue` on the undo scrubber. Those are **explicitly OUT of scope** for this small story. This story only adds static labels, roles, and testIDs to board elements. Full screen-reader playability is a follow-up feature.

### Architecture context (verified 2026-07-06)

- All board card visuals live in `AbsoluteCardLayer.tsx`. `buildCardLayerItems()` produces flat `CardLayerItem` data (card, x, y, zIndex, optional `press` data, `disabled`, `backLabel`) for: stock top card (press `{type:'draw'}`), waste fan last 3 (visuals only), foundation top + underlay cards (press `{type:'foundation',suit}`), and all tableau cards (face-up pressable via `{type:'tableau',columnIndex,cardIndex}`).
- `AbsoluteLayerCard` renders each item in a `NativeAnimated.View` (`pointerEvents` toggled by `pressDisabled` logic, lines ~485–488 / 663) wrapping an inner `Pressable` when `item.press` is set, otherwise a plain view.
- Waste taps are owned by a separate `WasteTapZone` `Pressable` (zIndex 450); the waste card visuals are deliberately non-pressable.
- Structural layer: `TopRow.tsx` (stock/waste `PileButton`s, `FoundationPile` outlines), `TableauSection.tsx` (column frames + `EmptySlot`). The stock `PileButton` is only pressable in the `recycle`/`empty` variant (the absolute stock card owns the draw tap).
- **Perf constraint**: `AbsoluteLayerCard` uses the custom memo comparator `areAbsoluteLayerCardPropsEqual`, which compares item fields by value (see `docs/product/klondike-render-memoization/`). Any new a11y data must be **stable strings stored on the item and added to the comparator** — never per-render closures or fresh objects that the comparator ignores.
- Raw RN `Pressable`/`View` are used on the board (not Tamagui), so standard RN props (`accessibilityLabel`, `accessibilityRole`, `accessible`, `testID`) apply directly.

## Acceptance Criteria

1. Running agent-device `snapshot -i` on Android on the game screen lists every board card with a human-readable label (e.g. "Seven of hearts, column 3"), plus stock, waste, and foundations.
2. Tapping a tableau card, the stock, the waste, and a foundation **by label or testID** via agent-device performs the same game action as a coordinate tap.
3. Pressable board elements report `accessibilityRole="button"`.
4. Face-down tableau cards are identifiable (and countable per column) in the a11y tree.
5. No behavior/visual regression: touch handling, card flight/flip/wiggle animations, and memoization behavior are unchanged (`yarn typecheck && yarn lint && yarn jest` pass; device smoke test passes).
6. A pure label-builder helper is unit-tested in `test/unit/`.

## Possible approaches incl. pros and cons

### A. Compute label/testID strings in `buildCardLayerItems`, store on `CardLayerItem` (RECOMMENDED)

Extend `CardLayerItem` with `accessibilityLabel?: string` and `testID?: string`, populated by pure helpers inside `buildCardLayerItems()` (which already knows pile type, `columnIndex`, and stock count). Add the two string fields to `areAbsoluteLayerCardPropsEqual`. `AbsoluteLayerCard` just threads them onto its `Pressable`/plain view.

- Pros: labels derive from data already flowing through the items builder (which is already memoized via `useMemo`); the comparator change is two cheap string equality checks; `AbsoluteLayerCard` stays dumb; face-down cards get column context even though they have no `press` data; trivially unit-testable as pure functions.
- Cons: two more fields on the item type and comparator (must not be forgotten — enforced by a code comment next to the comparator).

### B. Compute labels inside `AbsoluteLayerCard` at render time

- Pros: no item/comparator changes for card-name-only labels.
- Cons: the card doesn't know its column (face-down items carry no `columnIndex`), so context like "column 3" is impossible without approach A anyway; splits label logic across two places. Rejected.

### C. Per-column grouped labels ("Column 3: 2 face-down, Seven of hearts…") on structural column views

- Pros: fewer a11y nodes, nice narration.
- Cons: fights the architecture — cards live in one flat absolute layer, not inside the column views; labels on `TableauColumn` frames could not be tapped to act on a specific card; automation still couldn't target individual cards. Rejected.

## Decisions (label format, coverage, conventions)

### Label format

Pure helper `getCardAccessibilityLabel(card)` → `"Seven of hearts"` using a new spelled-out rank map (`Ace, Two, … Ten, Jack, Queen, King`). Do **not** reuse `rankToLabel` (it yields "A of hearts"/"7 of hearts", which screen readers pronounce badly). English-only, consistent with the rest of the app (no i18n yet).

| Element | accessibilityLabel | Role | testID |
|---|---|---|---|
| Tableau face-up card | `Seven of hearts, column 3` | `button` | `card-hearts-7` |
| Tableau face-down card | `Face-down card, column 3` | — (plain view, `accessible`) | `card-hearts-7` (id is stable/known; not a gameplay leak since testers control deals — see open question 2) |
| Stock top card | `Stock, 24 cards` | `button` | `stock` |
| Stock recycle/empty slot (`TopRow` PileButton) | `Recycle waste into stock` / `Stock, empty` | `button` | `stock-recycle` |
| Waste tap zone | `Waste, Seven of hearts` (top card) | `button` | `waste` |
| Waste fan visuals (non-top + top) | unlabeled (tap zone owns the label; avoids duplicate focus targets) | — | — |
| Foundation top card (absolute layer) | `Hearts foundation, Seven of hearts` | `button` | `foundation-hearts` |
| Foundation underlay card | unlabeled (visual-only, avoids duplicate nodes) | — | — |
| Empty foundation (`FoundationPile`) | `Hearts foundation, empty` | `button` | `foundation-slot-hearts` |
| Empty tableau column (`TableauColumn`/`EmptySlot`) | `Column 3, empty` | — (informational; empty columns are not tap targets today — moves to empty columns happen via auto-move on the tapped card) | `tableau-column-3` |

Column numbers are 1-based in labels **and** testIDs (human-consistent; code comment notes `columnIndex + 1`).

### Face-down cards: label vs. noise (trade-off)

**Decision: label them.** Rationale: (a) knowing how many hidden cards remain per column is real game state a screen-reader player needs; (b) device testers can count them and verify flips; (c) TalkBack users swipe past them quickly. The alternative (leaving them out) would keep the Android tree sparse exactly where the tester needed it. If narration feels too noisy in practice, dropping the `accessible` flag on face-down views is a one-line revert — note this in a code comment.

### `accessible` flag placement & pointerEvents interplay

- Pressables (`Pressable` is `accessible` by default): set `accessibilityRole="button"`, `accessibilityLabel`, `testID` directly on the inner `Pressable` in `AbsoluteLayerCard`, on `WasteTapZone`, on `FoundationPile`'s outer `Pressable`, and on `PileButton`'s `Pressable` (new optional `accessibilityLabel`/`testID` props on `PileButton`).
- Non-pressable face-down card views: set `accessible`, `accessibilityLabel`, `testID` on the plain body `View`. Note: `pointerEvents="none"` on the outer `NativeAnimated.View` does **not** remove children from the a11y tree (that's `importantForAccessibility`), which is exactly what we want — but this is the key thing to verify on-device early (see Testing).
- During settle (`pressDisabled` true) the a11y node remains; taps-by-label during a flight may be ignored just like touch taps. Acceptable and consistent.
- Do NOT set `accessible` on container views (`TableauColumn` frame gets it only for the empty-slot case), to avoid swallowing children into one node.

### Android vs. iOS handles (for automation)

On Android, `accessibilityLabel` maps to `content-desc` (reliable in a11y snapshots); `testID` maps to `resource-id` only in more recent RN versions and can be less consistently surfaced. **Labels are the primary automation handle on Android; testIDs are primary on iOS** (`accessibilityIdentifier`). Ship both; document this in the a11y helper module comment.

## Open questions to the user

1. **Stock label: include the count?** Recommended: yes, `"Stock, 24 cards"`. Pro: testers can assert draw counts without coordinates; the item already re-renders on every draw (zIndex depends on stock length), so no extra re-renders. Con: label churns every draw (harmless). Alternative `"Stock"` is simpler but loses free assertions. **Proceeding with count included.**
2. **Face-down testID reveals card identity** (`card-hearts-7` on a face-down card). Pro: stable key for automation across flips. Con: a "cheating" vector if anyone inspects the tree — irrelevant for a free, open-source, single-player game. Alternative: generic `card-facedown-<col>-<idx>` (churns on moves). **Recommended & proceeding: keep `card-<id>`; label still says only "Face-down card".**
3. **Should the top waste visual card also carry a label** (in addition to the tap zone)? Recommended: no — one focusable node per logical target; duplicate nodes confuse TalkBack ordering. **Proceeding with tap-zone-only.**

## Dependencies

None. Uses built-in React Native accessibility props. No package guide needed.

## UX/UI Considerations

- Zero visual changes. Labels/roles/testIDs are invisible props.
- TalkBack/VoiceOver focus order follows the native view hierarchy (absolute-layer cards render in items order: stock → waste → foundations → tableau column by column), which is a sensible reading order. Fine-tuning order is out of scope.

## Components

- Reuse/extend: `AbsoluteCardLayer.tsx` (items + card rendering + `WasteTapZone`), `FoundationPile.tsx`, `PileButton.tsx` (+2 optional props), `TopRow.tsx`, `TableauSection.tsx`/`EmptySlot`.
- New: one pure module `src/features/klondike/components/cards/accessibility.ts` — `getCardAccessibilityLabel(card)`, plus small builders for the pile/context labels and testIDs listed above (kept pure, no React imports, so `test/unit/` can test it without rendering).

## Related tasks

- `docs/product/architecture-performance-review/findings.md` R4 (parent finding; this story is its first slice).
- `docs/product/klondike-render-memoization/` (comparator contract this story must respect).
- Follow-ups NOT in this story: move announcements (`AccessibilityInfo.announceForAccessibility`), undo scrubber `accessibilityValue`, screen-reader playability audit.

## Simplification ideas

- One pure helper module; all other changes are prop threading. No new components, no state, no settings.
- Skip `accessibilityState={{ disabled }}`: `disabled` on `Pressable` already conveys state to a11y services; adding our own object per render buys nothing.
- Skip `accessibilityHint`s: labels are self-explanatory; hints add narration noise and lines of code.

## Steps to implement

- [x] 1. Create `src/features/klondike/components/cards/accessibility.ts`: spelled-out rank map, `getCardAccessibilityLabel(card)`, label builders (tableau face-up/face-down, stock, waste, foundation, empty slots) and testID builders per the table above. Include a module comment on the Android label / iOS testID automation split. ✅
- [x] 2. `AbsoluteCardLayer.tsx`: add `accessibilityLabel?: string` + `testID?: string` to `CardLayerItem`; populate in `buildCardLayerItems()` for stock top, foundation top (not underlay), and all tableau cards; pass waste top-card label into `WasteTapZone` (extended `WasteTapTarget` with `accessibilityLabel`, computed inside `resolveWasteTapTarget`). ✅
- [x] 3. `areAbsoluteLayerCardPropsEqual`: compare `accessibilityLabel` and `testID`; warning comment added above the comparator. ✅
- [x] 4. `AbsoluteLayerCard` render: role/label/testID on the `Pressable`; `accessible` + label + testID on the face-down body `View` (only when non-pressable). `WasteTapZone`: role/label/testID. ✅
- [x] 5. Structural layer: `FoundationPile` (role button, `foundation-slot-<suit>` testID always, label only when empty — non-empty label lives on the absolute-layer top card per the decisions table), `PileButton` (+`accessibilityLabel`/`testID` props → its `Pressable`, role button), `TopRow` stock slot (recycle/empty labels, `stock-recycle` testID), `TableauColumn` empty-slot label + testID (only when empty). ✅
- [x] 6. Unit tests `test/unit/features/klondike/cardAccessibility.test.ts`: rank words incl. Ace/face cards, all label builders, testID builders, 1-based column numbering, stock pluralization. ✅
- [x] 7. `yarn typecheck && yarn lint && yarn jest` — all pass (19 suites, 151 tests). ✅
- [x] 8. Android device validation (single build, no parallel builds): `yarn release`, unlock via `scripts/android-unlock-pattern.sh` if needed, then agent-device `snapshot -i` → verify board tree; tap-by-label smoke test (draw from stock, tap a face-up tableau card, tap waste, tap a foundation) and verify game reacts. ✅ 2026-07-06 — PASSED, but only after removing the Tamagui `ToastViewport` from `components/Provider.tsx` (see Identified issues: it hid the entire app from the Android a11y tree).
- [x] 9. iOS quick check (optional): `yarn ios`, one `snapshot -i` to confirm labels/identifiers surface. ✅ 2026-07-06 — PASSED on iPhone 17 Pro simulator (see Testing: iOS results). Labels, roles AND `accessibilityIdentifier`s (testIDs) all surface; tap-by-identifier works.
- [x] 10. Update this plan's statuses, `## Files actually modified`, learnings/issues. ✅

## Plan: Files to modify

| File | Change |
|---|---|
| `src/features/klondike/components/cards/accessibility.ts` | NEW — pure label/testID builders |
| `src/features/klondike/components/cards/AbsoluteCardLayer.tsx` | item fields, builder population, comparator, prop threading, `WasteTapZone` label |
| `src/features/klondike/components/cards/FoundationPile.tsx` | label/role/testID on outer Pressable |
| `src/features/klondike/components/cards/PileButton.tsx` | optional `accessibilityLabel`/`testID` props |
| `src/features/klondike/components/cards/TopRow.tsx` | stock recycle/empty labels via PileButton props |
| `src/features/klondike/components/cards/TableauSection.tsx` | empty-column label/testID |
| `test/unit/features/klondike/cardAccessibility.test.ts` | NEW — unit tests |

## Files actually modified

| File | Change |
|---|---|
| `src/features/klondike/components/cards/accessibility.ts` | NEW — pure label/testID builders + automation-split module comment |
| `src/features/klondike/components/cards/AbsoluteCardLayer.tsx` | `CardLayerItem` +`accessibilityLabel`/`testID`; populated for stock top, foundation top, all tableau cards; comparator extended + warning comment; props threaded onto `Pressable` / face-down body `View`; `WasteTapTarget` +label, `WasteTapZone` role/label/testID |
| `src/features/klondike/components/cards/FoundationPile.tsx` | role button, `foundation-slot-<suit>` testID, empty-state label on outer `Pressable` |
| `src/features/klondike/components/cards/PileButton.tsx` | optional `accessibilityLabel`/`testID` props → `Pressable` (+role button) |
| `src/features/klondike/components/cards/TopRow.tsx` | stock slot recycle/empty labels + `stock-recycle` testID via new PileButton props |
| `src/features/klondike/components/cards/TableauSection.tsx` | empty-column `accessible`/label/testID on the column frame (+ small `isEmpty` readability refactor) |
| `test/unit/features/klondike/cardAccessibility.test.ts` | NEW — 11 tests over all label/testID builders |
| `components/Provider.tsx` | Removed `<ToastViewport />` (device-test root-cause fix, 2026-07-06): its full-screen focusable wrapper hid the ENTIRE app subtree from the Android a11y tree. No toast is ever shown in the app (no `useToastController` callers), so no functionality lost. Code comment documents the trade-off + re-verification requirement. Follow-up (same day, user request): toast stack removed completely — `ToastProvider` + `CurrentToast.tsx` deleted, `@tamagui/toast` dependency removed. The four "[Toast suppressed]" devLog messages in hooks were left as-is (plain logs, no toast code). |

## Intermediary learnings

- `card.id` is NOT `hearts-7` — it carries a per-deal instance suffix (`hearts-7-<dealCounter>`, see `createDeckFromDealCards`). testIDs therefore build from `suit`+`rank` directly (`card-hearts-7`), which matches the decisions table and stays stable across deals (open question 2's intent).
- Step 5's wording ("label incl. empty vs. top-card state" on `FoundationPile`) conflicts with the decisions table (only the *empty* foundation row lists a FoundationPile label). Followed the table: labeling the structural pile while cards are present would duplicate the absolute-layer top card's node (violates the one-node-per-target principle from open question 3). The testID `foundation-slot-<suit>` is set unconditionally (harmless, stable iOS handle).
- Stock label pluralizes ("Stock, 1 card" vs "Stock, 24 cards") — covered by unit test.
- Watchpoint RESOLVED (2026-07-06 device test): Android DOES expose labels under views whose ancestor toggles `pointerEvents="none"` — all absolute-layer card labels (stock/foundation/tableau, face-up and face-down) surfaced correctly in the a11y tree once the ToastViewport blocker (below) was removed.
- Watchpoint RESOLVED: Fabric view flattening — face-down `accessible` views appear as `[group]` nodes with correct labels; no jank observed during draw/flip/auto-move animations on the physical device.
- **Device-test root cause (2026-07-06): Tamagui `<ToastViewport />` hid the whole app from Android accessibility.** Its `ToastViewportWrapperFrame` renders a full-screen (top/bottom/left/right 0, zIndex 100000) YStack with `aria-label "Notifications (F8)"` and `tabIndex 0` (→ focusable + content-desc on Android). With it mounted, the a11y tree of EVERY screen (game, drawer, settings, modal) contained ONLY the chain root→…→"Notifications (F8)" — zero app content, on both a Pixel 9 emulator (fresh install) and the physical A065. This was the real reason previous Android testers saw an "almost empty" a11y tree; it was never primarily about missing labels on the board. Removing the viewport (no toasts are used anywhere) instantly exposed the full tree incl. all new labels. If toasts are reintroduced, use a non-full-screen viewport (or verify the wrapper is `importantForAccessibility="no"`-safe) and re-run `snapshot -i`.
- `uiautomator dump` fails on this app ("could not get idle state" / "Killed"): the game timer re-renders every second so the window never idles; also agent-device's daemon holds the UiAutomation connection, which kills concurrent uiautomator runs. Use agent-device snapshots (its helper tolerates busy UIs better); occasional transient `snapshot` idle-timeouts still happen mid-animation — retry once.
- agent-device tip: `snapshot -i` deduplicates identical labels (e.g. shows 2 of 6 "Face-down card, column 7"); use `snapshot --raw` to count face-down cards per column.
- The global `agent-device` npm install vanished mid-run (dir mtime 09:57); the project has a local dependency — use `node_modules/.bin/agent-device` (v0.18.3) as fallback.
- iOS (2026-07-06): everything surfaces as designed — testIDs map to `accessibilityIdentifier` and work as tap handles (`press 'id="stock"'`). Note: XCUITest exposes each card twice (an unlabeled-identifier wrapper `Other` node at depth N and the real node with identifier at depth N+1, triggering agent-device's "repeated nav subtree" warning); `get attrs` on an interactive-snapshot ref may hit the wrapper and show no identifier — use `snapshot --raw` to see identifiers on the inner nodes. Face-down card identifiers (`card-<suit>-<rank>`) ARE present on iOS on the inner node.
- Wireless adb to the physical device drops when the phone locks/sleeps; `scripts/android-unlock-pattern.sh` + re-`adb connect` (via `adb mdns services`) recovers it. Setting `settings put system screen_off_timeout 600000` during the test session prevents mid-test drops (restored to 150000 afterwards).

### Scrubber automation handles (follow-up, 2026-07-06, iOS simulator)

Empirical test of the new `UndoScrubber` handles (`testID="undo"` on the button, `testID="undo-scrubber-track"` + label `Undo scrubber, position N of M` on the track). **Verdict: deterministic scrubbing via agent-device is NOT possible on iOS today**, for two independent reasons:

1. **The track node never surfaces in the iOS a11y tree.** While the scrub overlay is idle (reanimated opacity 0 + `pointerEvents="none"` on the parent `AnimatedView`), XCUITest excludes the whole overlay subtree: `snapshot -i`, `snapshot --raw`, `snapshot --json --force-full`, `is visible 'id="undo-scrubber-track"'` and `find "Undo scrubber"` all fail to see it (the Android watchpoint about `pointerEvents="none"` NOT hiding children evidently does not transfer to iOS when combined with opacity 0). So neither the `position N of M` readout nor trackLeft/trackRight geometry can be read before the gesture — and mid-gesture reads are impossible because agent-device session commands are serial. The Undo button itself surfaces fine: `[button] "Undo"`, identifier `undo`, `[disabled]` state when history is empty, rect readable via `--raw` (e.g. x=201 y=765 w=194 h=48 → center 298/789).
2. **XCTest-synthesized drags never drive the RNGH pan.** 6 attempts with `gesture pan` (start at button center, dx −135…−260 pt, y constant or −20 drift, durations 800–6000 ms) and `swipe` (1.5–3 s): the board state never changed. Smoking gun: agent-device's own `*.gesture-telemetry.json` shows every pan/swipe was synthesized as a single ~300 ms swipe regardless of the requested duration — a slow press-hold-drag-release with paced intermediate steps is not expressible with the current CLI on iOS, and touch-overlay recordings (`scrub-pan-touches.mp4`, `scrub-swipe-touches.mp4`) show the synthesized finger moving straight through the button row while the scrub overlay never fades in. No accidental tap-undo fired either — consistent with the Pan recognizer swallowing the touch but never receiving usable move events from XCTest synthesis (a known XCUITest/RNGH weak spot; Appium docs recommend velocity-matched `dragFromToForDuration`-style synthesis for exactly this reason). Plain `press` at the same coordinates works (RNGH Tap fires), so touch delivery per se is fine — it is specifically the pan path that dies. The planned anchor formula could therefore not even be evaluated.

Follow-up options if we want this capability: (a) mirror `position N of M` into an `accessibilityValue` on the always-visible Undo button (removes blocker 1; one-line-ish); (b) re-test on Android, where agent-device uses provider-native/real input injection that is much more likely to activate RNGH pans (blocker 2 may be iOS-only); (c) accept that scrub coverage stays manual/unit-level (`useUndoScrubber` math is already pure and unit-testable).

## Identified issues

- (none from steps 1–7; typecheck/lint/jest all green)
- **FIXED (2026-07-06, step 8): Tamagui ToastViewport occluded the entire Android a11y tree** (see Intermediary learnings for full analysis). Fix: removed `<ToastViewport />` from `components/Provider.tsx` (unused — no toast is ever shown). One-line-ish change, flagged for review since it goes beyond label threading. After the fix, all acceptance criteria pass on-device.
- Minor (pre-existing, out of scope): the waste tap zone exposes no node when the waste is empty (no "Waste, empty" label was specced). Fine for now — testers can infer from the missing node.
- Test-session side effect: the smoke test played ~40 moves on the real in-progress saved game (moves 221 → 261 approx., incl. 2♠/3♠ to foundation and a column-4 flip). Use Undo/New Game if that game mattered.

## Testing

1. **Cheap first**: `yarn typecheck && yarn lint && yarn jest` (includes new pure-helper unit tests; no component render tests, consistent with `test/unit/` conventions).
2. **Android device validation (the point of this story)** — one testing sub-agent run, agent-device skill:
   - Kill any running builds first; `yarn release`; confirm install on device; unlock with `scripts/android-unlock-pattern.sh` if locked.
   - `snapshot -i` on the game screen: assert stock ("Stock, N cards"), waste ("Waste, <card>"), 4 foundations, and tableau cards incl. "Face-down card, column N" appear with `content-desc`.
   - Tap-by-label smoke test: tap "Stock, …" → waste changes; tap a face-up tableau card by label → selection/auto-move; tap "Waste, …" → acts on waste top; tap a foundation label. Verify via follow-up snapshot, not coordinates.
   - Quick sanity that animations (draw flight, flip) still run.
3. **iOS (quick, optional)**: `yarn ios` (never parallel with the Android build), one `snapshot -i` to confirm labels + identifiers.
4. No screen-reader (TalkBack/VoiceOver) manual audit in this story — that belongs to the full R4 follow-up.

### Android device validation results (2026-07-06, physical A065, release build)

Artifacts: `.test-artifacts/klondike-card-accessibility/` (build.log + screenshots 01–10).

**First run FAILED**: with the original code, `snapshot -i` returned 0 app nodes on every screen (game, drawer, settings, modal), on both a fresh Pixel 9 API 36 emulator and the physical device. Investigation showed the whole app subtree was hidden by the Tamagui ToastViewport (see Identified issues). Labels were confirmed present in the APK JS bundle, so the story's code was correct.

**Second run (ToastViewport removed) PASSED** — exact labels observed in the a11y tree:

- Stock: `"Stock, 14 cards"` … `"Stock, 1 card"` (count updates every draw; singular/plural correct) — `[button]`
- Stock empty: `"Recycle waste into stock"` `[button]`; pressing it restocked (`"Stock, 20 cards"`, waste node gone)
- Waste tap zone: `"Waste, Nine of spades"` → `"Waste, Seven of clubs"` etc., updating after every draw — `[button]`
- Foundations: `"Hearts foundation, empty"`, `"Clubs foundation, empty"` `[button]`; with cards: `"Diamonds foundation, Three of diamonds"`, `"Spades foundation, Ace of spades"` → `"…Two of spades"` → `"…Three of spades"`
- Face-up tableau: `"King of hearts, column 1"`, `"Jack of clubs, column 2"`, `"Seven of spades, column 3"`, `"Ten of spades, column 7"`, … — `[button]`, 1-based columns
- Face-down tableau: `"Face-down card, column N"` `[group]`, countable per column in `--raw` (col2:1, col3:2, col4:2, col5:4, col6:4, col7:6 at end state)
- Waste fan visuals + foundation underlays: correctly unlabeled (unlabeled ViewGroups with rank/suit TextViews only)

**Tap-by-label smoke test (all via `press 'label="…"'`, zero coordinate taps on the board):**

1. Stock tap → stock `13→12`, waste `Nine of spades → Seven of clubs` ✅
2. Waste tap (playable 4♣) → auto-moved onto 5♦: new node `"Four of clubs, column 5"`, waste advanced ✅
3. Waste tap (unplayable 7♣) → correct no-op ✅
4. Waste tap (9♥) → auto-moved onto 10♠: `"Nine of hearts, column 7"` ✅
5. Waste tap (2♠) → auto-moved to foundation: `"Spades foundation, Two of spades"` ✅
6. Tableau card tap (`"Three of spades, column 4"`) → auto-moved to foundation (`"Spades foundation, Three of spades"`) AND column 4 flipped: face-down count 3→2, new `"Ten of hearts, column 4"` ✅
7. Recycle tap by label ✅
8. Foundation tap by label → registered, no unintended move ✅
9. Animations sanity: draw fan, card flight and flip all rendered normally in screenshots taken mid-interaction (08, 09); no jank observed ✅

Post-fix cheap tests re-run: typecheck + lint + jest all green (19 suites, 151 tests).

### iOS quick check results (2026-07-06, iPhone 17 Pro simulator, debug build) — PASSED

Artifacts: `.test-artifacts/klondike-card-accessibility/ios-build.log`, `ios-01-board.png`.

- Clean `yarn ios` build: Build Succeeded (0 errors), app installed and launched on the booted iPhone 17 Pro simulator (no other builds were running).
- `snapshot -i` on the game screen (64 nodes) — exact labels observed:
  - Stock: `"Stock, 18 cards"` `[button]`, identifier `stock`
  - Waste: `"Waste, King of clubs"` `[button]`, identifier `waste`
  - Foundations: `"Hearts foundation, empty"`, `"Diamonds foundation, empty"`, `"Clubs foundation, empty"`, `"Spades foundation, empty"` `[button]`, identifier `foundation-slot-hearts` etc.
  - Face-up tableau: `"Five of hearts, column 1"`, `"Queen of spades, column 2"`, `"Five of diamonds, column 3"`, `"Two of hearts, column 4"`, `"Eight of clubs, column 5"`, `"Nine of clubs, column 6"`, `"Queen of hearts, column 7"` — all `[button]` with identifiers like `card-hearts-5`
  - Face-down tableau: `"Face-down card, column N"` (non-button), identifiers present (e.g. `card-hearts-7`) — countable per column
- Tap-by-identifier sanity: `press 'id="stock"'` drew cards — stock `18 → 15` (draw-3 mode was active on this device), waste label updated `"Waste, King of clubs"` → `"Waste, Ten of clubs"`, moves counter incremented. Game reacted correctly to the identifier tap.
- Visual sanity screenshot: board renders normally (foundations, waste fan, stock "Draw", 7 tableau columns, header, Undo) — the `Provider.tsx` ToastViewport removal causes no visual/behavioral regression on iOS.
- Test side effect: one draw was played on the current saved game (moves 1 → 2).

### Scrubber automation test results (2026-07-06, iPhone 17 Pro simulator, debug build + Metro) — FAILED (tool limitation, not app bug)

Artifacts: `.test-artifacts/klondike-card-accessibility/scrub-*.png`, `scrub-pan-probe.mp4`, `scrub-pan-touches.mp4`, `scrub-swipe-touches.mp4`.

- Setup: no builds running; reused installed debug build + already-running Metro; `open ch.karimattia.soli --relaunch`; built extra history by tapping the stock 7× by label (works; note the label churns per draw — `press 'id="stock"'` is the stable handle).
- Undo button node: PASS — `[button] "Undo"` with identifier `undo`, correct `[disabled]` state at history 0, rect available in `snapshot --raw`.
- Track node (`undo-scrubber-track`, `Undo scrubber, position N of M`): FAIL — absent from every snapshot variant while the overlay is idle (opacity 0). No N/M or track geometry is tree-derivable on iOS.
- Deterministic scrub drag: FAIL — `gesture pan`/`swipe` from the button center never activate the RNGH pan (0 board changes in 6 attempts across 800–6000 ms durations; touch recordings confirm the synthetic finger traversed the button). No formula validation was possible; the fallback-geometry-based computation (track ≈ x 47…355 on a 402 pt window) remains untested.
- Plain tap undo: PASS — `press 'id="undo"'` performed exactly one undo (waste `Eight of clubs` → `Ace of hearts`, stock 16 → 17).
- Verdict: **NO — deterministic tree-driven scrubbing is not achievable with agent-device on iOS right now** (details + follow-up options in Intermediary learnings). The a11y handles themselves ship no regression: cheap tests were green in the implementing chat and the button handle works on-device.
