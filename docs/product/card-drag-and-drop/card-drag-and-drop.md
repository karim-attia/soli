# Card drag and drop

## User prompt

> Dragging cards rather than just tap to move

## Summary

Drag-and-drop is **added on top of** the existing tap-to-move interaction; tap behaviour is
unchanged. One board-level `Gesture.Pan` with `manualActivation(true)` hit-tests the finger against
a shared-value model of the board. Below the 8 px activation threshold nothing happens and the
existing per-card `Pressable` handles the touch exactly as before. Past it, the pan activates, RN
cancels the touch (so `onPress` cannot also fire), the grabbed card **and everything stacked on it**
lift into a Reanimated overlay, legal destinations light up in the existing green drop-hint
language, and the release dispatches the **same `APPLY_MOVE`** a tap would have.

No reducer change, no `MOVE_LOG_VERSION` bump, no new user-facing setting.

Status: implemented, `yarn typecheck && yarn lint && yarn jest` green. Device/simulator verification
is the orchestrator's (see [Testing](#testing)), including the one open question, R1.

## Description

Today every board move is a tap: tap a card and the game auto-moves it to the best legal target
(`findAutoMoveTargetWithTableauAdjacentFallback`). That is fast and forgiving, but it is not how
people expect a solitaire app to feel, and it cannot express intent — a card with two legal homes
always goes to the first one the auto-mover finds.

Dragging adds the missing input method:

- **Intent.** Drag the 7♥ onto the 8♠ you meant, not the 8♣ the auto-mover preferred.
- **Familiarity.** Every mainstream solitaire app drags; players try it first, and a board that
  ignores a drag reads as broken.
- **Multi-card runs.** Tap already moves a run, but dragging makes the run visible while it moves.

The important constraint is *additive*: tap-to-move is the app's proven, delicate path (rapid stock
taps, the waste rapid-tap buffer, the mid-flight press lockout). Drag must not perturb it at all.

## Acceptance Criteria

| When | Then |
|---|---|
| Touch a face-up tableau card and move ≥ 8 px | That card and every card below it lift into an overlay and follow the finger |
| Touch the waste top card / a foundation top card and move ≥ 8 px | That single card lifts and follows the finger |
| Touch a face-down card, the stock, or empty felt | The pan fails immediately; today's tap behaviour is bit-for-bit unchanged |
| Touch a draggable card and release without moving 8 px | `Pressable.onPress` fires — today's auto-move tap |
| While dragging | Every legal destination (columns + foundations) shows the existing green drop border |
| Release over a legal target | `APPLY_MOVE` with the same `Selection`/`MoveTarget` a tap would have produced; the card flies from the drop point to its destination with the existing 90 ms flight |
| Release over an illegal target | Snap back, then the existing invalid-move wiggle |
| Release over nothing | Silent snap back, no wiggle |
| Release essentially where the drag started ("sloppy tap") | Routes to the tap handler → auto-move, so a finger roll is never a dead no-op |
| Board locked / celebrating / auto-completing | Drag refuses to start |
| Animations master toggle off | Drag still works (it is an input method); the lift scale and snap-back timing are skipped |
| Replay of a persisted game containing drag moves | Byte-identical to a game played with taps; `MOVE_LOG_VERSION` stays 1 |

## Possible approaches

Decided in the approved design pass (`drag-design.md`); recorded here for posterity.

| Question | Options | Decision |
|---|---|---|
| Gesture placement | per-card detectors vs. **one board-level pan** | One board-level pan. Per-card means 52 native recognizers churning on every re-render, an unstable `Gesture` prop the card memo comparator would silently swallow, and multi-card runs become a gesture-coordination problem instead of a data slice. |
| Dragged-card rendering | migrate `AbsoluteLayerCard` to Reanimated vs. **separate Reanimated overlay** | Separate overlay. Reanimated shared values cannot drive legacy `Animated.Value`s, so migrating is all-or-nothing for flights + flip + wiggle + the `isSettling` machinery — a component whose history is a catalogue of regressions. The overlay confines the new Reanimated surface to something that only exists while a finger is down. |
| Drop hit-test | nearest-target magnet vs. **max intersection area** | Max intersection area over *legal* candidates only, min 20 % of a card. A magnet that teleports a card across the board from a drop over empty felt reads as a bug. |
| Which point is tested | finger vs. **base card rect** | The base (grabbed) card's rect at release. It is what the player sees, and it makes runs sensible: only the base card has to land. |
| Release handoff | glide the copies vs. **seed the real card's `Animated.Value` and unhide in one commit** | Seed. The existing 90 ms flight runs *from wherever the value is*, so seeding it to the drop point before the card becomes visible makes the existing flight do the handoff — no timer, no second animation, no race with the 25 ms auto-queue cadence. |
| Settings flag | new toggle vs. **none** | None. Drag is an input method, not an effect. The decorative parts reuse `animations.master`. |

## Open questions to the user

1. **R1 — Android attach point (open, see Intermediary learnings).** The gesture is attached to
   `AbsoluteCardLayer`'s `pointerEvents="box-none"` root, as the approved design recommends. Reading
   RNGH's Android orchestrator suggests that on Android a handler on a `box-none` view is only
   collected when a descendant became a touch target, and the waste tap zone may not qualify. The
   fallback is a **one-line** move of the `<GestureDetector>` to the board shell and needs no
   coordinate change. Recommendation: keep the recommended attach point, verify a waste drag on a
   physical Android device, flip the one line if it fails.
2. **Hovered-zone ring (design step 11, optional polish).** Not built — the existing green drop
   borders already answer "where can this go?", and a second highlight language during a drag is
   noise until someone asks for it. Recommendation: leave out.

## Dependencies

No new packages. New API surface on an existing dependency:

- [`react-native-gesture-handler`](../../external-package-guides/react-native-gesture-handler.md) —
  `manualActivation`, `GestureStateManager`, `onTouchesDown`/`onTouchesMove`, view-relative vs.
  window-absolute coordinates, `cancelsTouchesInView`, ancestor attachment vs. `pointerEvents`,
  `GestureDetector`'s implicit `collapsable={false}`. **Written for this feature.**
- [`react-native-reanimated`](../../external-package-guides/react-native-reanimated.md) — shared
  values + `useAnimatedStyle` for the drag overlay only.

## UX/UI Considerations

- **8 px activation.** The undo scrubber uses 5 px on a 48 pt button; a card is 50–90 px wide and
  8 px sits comfortably inside RN Pressability's press rect, so a real tap is never ambiguous.
- **Lift = scale 1.04 + shadow**, applied to the whole run wrapper so the run keeps its internal
  spacing and scales about its own top-left.
- **Legal targets use the existing `COLOR_DROP_BORDER` green**, deliberately not the amber hint
  language — amber means "the solver suggests this".
- **No magnet.** A 20 % overlap window plus a half-card downward extension on tableau columns is
  generous enough for "drop just below the pile", which is what players actually do.
- **Sloppy-tap fallback.** Activating the pan cancels the RN touch, so a finger that rolls 10 px and
  comes back would otherwise be a dead no-op. Releasing inside the origin card's own rect routes to
  the same tap handler instead.

## Components

Reused unchanged: `CardVisual`, `computeTableauStackOffsets`, `computeWasteFanGeometry`,
`resolveTopRowPosition`, `resolveTableauPosition`, `getDropHints`, `previewSelectionStack`,
`canDropOnTableau`/`canDropOnFoundation` (through the reducer), the `COLOR_DROP_BORDER` paths in
`TableauSection`/`FoundationPile`, `notifyInvalidMove`'s wiggle, the 90 ms flight in
`AbsoluteLayerCard`.

New: `cards/dragGeometry.ts` (pure), `cards/cardLayerItems.ts` (pure, extracted),
`cards/DragOverlayLayer.tsx`, `hooks/useCardDrag.ts`.

## Related tasks

- `docs/product/game-history-performance/absolute-card-layer-animation-architecture.md` — why the
  card layer stays on legacy `Animated` with the native driver.
- `docs/product/hints/` — `HintOverlayLayer`'s z-band precedent (Fabric flattening + `orderIndex`).
- `docs/product/move-log-persistence/` — why `MOVE_LOG_VERSION` must not move.

## Simplification ideas

- **One board-level gesture instead of 52.** Zero new per-card props, one native recognizer for the
  life of the board, 2 `runOnJS` crossings per drag.
- **Drop resolution runs once, on JS, against live state.** The approved design resolved the drop in
  the `onEnd` worklet from a cached candidate list *and* re-validated on JS. Doing it once removes a
  shared-value candidate list, a duplicated legality path on the UI thread and a whole race class
  (undo dispatched mid-drag), at the cost of starting the snap-back one JS frame later. See
  Intermediary learnings.
- **No new setting**, no new highlight UI, no new colour: the drop-hint mask is fed into the props
  `TopRow`/`TableauSection` already take.
- **`cardLayerItems.ts` extraction** made the card memo comparator unit-testable for the first time
  and enabled the inverse-property test (`buildCardLayerItems` ↔ `hitTestDragSource`).

## Steps to implement

| # | Step | Status |
|---|---|---|
| 0 | Plan doc + RNGH package guide (real API research first) | ✅ done |
| 1 | Export `previewSelectionStack`; cover it in `klondike.selection.test.ts` | ✅ done |
| 2 | `dragGeometry.ts` + `cardDrag.test.ts` — **tests first**, no UI | ✅ done |
| 3 | R1 spike (attach point). Cannot build here → recommended option implemented, fallback documented, flagged for the orchestrator | ⚠️ implemented + flagged, device verification pending |
| 4 | `useCardDrag`: shared-value model, manual-activation gesture, `beginDrag`/`endDrag` | ✅ done |
| 5 | `DragOverlayLayer` + `KlondikeGameView` plumbing | ✅ done |
| 6 | `hidden` plumbing in the card layer **including the memo comparator** | ✅ done |
| 7 | Legal-drop handoff: transform registry + seed + batched dispatch/unhide | ✅ done |
| 8 | Illegal / self / none: snap-back, wiggle, tap fallback | ✅ done |
| 9 | Drop-target highlighting via the cached mask | ✅ done |
| 10 | Guards & edge cases, scrubber reciprocity, cancel paths | ✅ done |
| 11 | *Optional polish:* hovered-zone ring | ⛔ skipped on purpose (see Open questions) |
| 12 | Extract `cards/cardLayerItems.ts` + inverse-property test | ✅ done |
| 13 | Dev-only `?dragtest=1` self-test harness | ✅ done |
| 14 | Docs: SKILL.md a11y matrix + drag automation; plan-doc status | ✅ done |

## Plan: Files to modify

**Create**

| Path | Purpose |
|---|---|
| `docs/product/card-drag-and-drop/card-drag-and-drop.md` | This plan |
| `docs/external-package-guides/react-native-gesture-handler.md` | Required before using a new external API |
| `src/features/klondike/components/cards/dragGeometry.ts` | Pure geometry + drop resolution (worklet-safe, jest-testable) |
| `src/features/klondike/components/cards/cardLayerItems.ts` | Pure card-layer item model, extracted from the component |
| `src/features/klondike/components/cards/DragOverlayLayer.tsx` | Reanimated lifted-run overlay |
| `src/features/klondike/hooks/useCardDrag.ts` | Gesture + drag state machine + transform registry |
| `src/features/klondike/hooks/useDragSelfTest.ts` | Dev-only `?dragtest=1` harness |
| `test/unit/features/klondike/cardDrag.test.ts` | Unit tests |

**Modify**

| Path | Change |
|---|---|
| `src/solitaire/klondike.ts` | Export `previewSelectionStack` |
| `src/features/klondike/constants.ts` | Drag constants |
| `src/features/klondike/components/cards/AbsoluteCardLayer.tsx` | `hidden` rendering, transform-registry effect, `GestureDetector` on the root |
| `src/features/klondike/components/KlondikeGameView.tsx` | `<DragOverlayLayer />` |
| `src/features/klondike/hooks/useKlondikeGame.ts` | `useCardDrag`, `dropHints` override, prop threading, scrubber reciprocity |
| `src/features/klondike/hooks/useUndoScrubber.ts` | Optional `dragActiveShared` guard |
| `src/features/klondike/hooks/useDemoGameLauncher.ts` | `?dragtest=1` deep link |
| `src/features/klondike/components/cards/HintOverlayLayer.tsx` | Comment: the card plane is no longer flattened |
| `.agents/skills/soli-testing/SKILL.md` | a11y matrix (§5) + drag automation (§6) |

## Files actually modified

Exactly the list above, plus `test/unit/solitaire/klondike.selection.test.ts` (three
`previewSelectionStack` cases). No other test needed touching: the `cardLayerItems` extraction kept
every existing import site working through `AbsoluteCardLayer`'s re-exports.

Gate delta: 34 suites / 361 tests → **35 suites / 387 tests**.

## Intermediary learnings

### 1. `MOVE_LOG_VERSION` must NOT move — and does not

A drop is exactly the existing `APPLY_MOVE` with a `Selection` and a `MoveTarget`. Drag is a new
*input* to an unchanged action: the reducer, the legality rules and the emitted
`{ k: 'move', sel, tgt }` log entry are byte-identical to the tap path. A persisted game replays the
same either way, so `MOVE_LOG_VERSION` stays **1**. This is recorded inline in `useCardDrag.ts` next
to the dispatch as well, because the header comment at `klondike.ts:64` makes a version bump
mandatory for any change to reducer *behaviour* — and it is worth being explicit that this is not
one.

### 2. R1 — the `box-none` attach point is a real Android risk (design under-stated it)

The design flagged this as "verify first" and expected iOS to be safe and Android to be uncertain.
Reading the installed Android source
(`GestureHandlerOrchestrator.kt` → `traverseWithPointerEvents`) makes it sharper than "uncertain":

```kotlin
PointerEventsConfig.BOX_NONE -> {
  is ViewGroup -> extractGestureHandlers(view, coords, pointerId, event).also { found ->
      // A child view is handling touch, also extract handlers attached to this view
      if (found) recordViewHandlersForPointer(view, coords, pointerId, event)
  }
}
```

Handlers on a `box-none` view are collected **only when a descendant became a touch target**, and a
descendant qualifies only if it has its own handler or passes
`shouldHandlerlessViewBecomeTouchTarget` — which requires `view !is ViewGroup || getBackground() != null`.

Applied to Soli's card plane:

| Touch lands on | Qualifies on Android? |
|---|---|
| Face-up tableau card (`pointerEvents="auto"`, white `CardVisual` background inside) | ✅ yes |
| Foundation top card (same) | ✅ yes |
| **Waste top card** — the visual card is `pointerEvents="none"`; the `WasteTapZone` above it is a childless, background-less `Pressable` | ❓ **likely no** |
| A card that is mid-flight (`pointerEvents="none"` for the settling frames) | ❌ no |

So a **waste drag may not start on Android**, while working perfectly on iOS (UIKit delivers touches
to recognizers on the whole superview chain and `box-none` only affects the view's own `hitTest`).
That failure mode is invisible on the simulator, which is where verification happens.

The design's own documented fallback is used verbatim if this reproduces: move the
`<GestureDetector>` from `AbsoluteCardLayer`'s root up to the board shell `YStack` in
`KlondikeGameView`. Two extra findings make that cheap:

- **No coordinate change is needed** (the design assumed the board-shell attach point would need an
  origin offset). An absolutely positioned child with `top: 0, left: 0` sits at its parent's padding
  box origin, and with no `borderWidth` that is the same origin `onLayout` reports children against.
  The card plane's origin and the board shell's origin are therefore identical, and both equal the
  layout-registry origin. If they were not, cards would already render offset from the structural
  slots by the board shell's `py="$3"` padding.
- `GestureDetector` resolves its view tag with `findNodeHandle` on its internal `Wrap` instance, so
  attaching to a tamagui `YStack` works without the component forwarding a `ref`, and the board
  shell already has `onLayout`, which prevents flattening regardless of `collapsable`.

Everything drag-related lives in `useCardDrag`, so the switch really is one line: move the
`<GestureDetector gesture={...}>` wrapper. See the `R1` comment in `AbsoluteCardLayer.tsx`.

### 3. Un-flattening the card plane (R2) — reasoned safe, still worth one screenshot

`GestureDetector` clones its child with `collapsable={false}`, so the card plane is no longer
flattened into the board shell. The `zIndex` reasoning recorded at `HintOverlayLayer.tsx:46-66`
therefore changes shape but not outcome:

- Cards now sort **inside** the plane instead of inside the board shell. Relative card order (waste
  fan, foundation underlay, columns, the `10000 + zIndex` flight boost) is untouched.
- The plane itself has no explicit `zIndex`, so it sorts as 0 among the board shell's children,
  where it is a **later sibling** than `TopRow` and `TableauSection` — RN's `zIndex` sort is stable,
  so equal values keep document order and cards still paint over the structural slots.
- `HINT_OVERLAY_Z_INDEX = 20000` still beats the whole plane, and `DRAG_OVERLAY_Z_INDEX = 15000`
  sits between the flight band's ceiling and the hints, as designed.

That is a reasoned conclusion, not a measured one — see the screenshot list in Testing.

### 4. Drop resolution moved from the UI thread to JS (deliberate simplification)

The design put `resolveDropCandidate` in the `onEnd` worklet against a cached candidate list, then
re-validated the same decision on JS before dispatching. Two evaluations of the same question, one
of them against a snapshot, is exactly how "the undo scrubber fired mid-drag" bugs are born. The
implementation resolves **once**, on JS, against `stateRef.current`:

- the candidate list never needs to live in a shared value,
- legality has one source of truth (live state + `getDropHints`),
- `dragGeometry` only needs `hitTestDragSource` to be a worklet.

Cost: the snap-back animation starts one JS frame (~16 ms) after release instead of on the release
frame. Accepted; the alternative was duplicating the legality rules onto the UI thread.

### 5. `areAbsoluteLayerCardPropsEqual` really does swallow new fields

The `WARNING` at the top of that comparator is not theoretical. The first run of the `hidden`
plumbing rendered nothing at all: the item's `hidden` flag flipped, the comparator did not list it,
`React.memo` returned "equal", and the real card stayed visible under the overlay copy. Adding
`prevItem.hidden !== nextItem.hidden` fixed it. The extraction in step 12 exists partly so this
comparator now has direct unit tests.

### 6. The transform registry is invisible to the comparator *by design*

`AbsoluteLayerCard` takes the registry as a prop the comparator does not list. That is correct
**only** because the registry object's identity is stable for the lifetime of the hook (it is a
`useRef` box with stable methods). It is called out inline; a registry that were re-created per
render would be silently stale — the exact hazard the comparator's warning describes.

### 7. `Animated.Value.setValue` under the native driver

The seeding step relies on `translateX.setValue(x)` reaching a native-driven node. That is
supported (it forwards to `NativeAnimatedAPI.setAnimatedNodeValue`); what is *not* supported is
starting a JS-driven animation on a native node. `previousTargetRef` is deliberately not touched by
the seed: it tracks committed *targets*, not values, so the next commit still sees `targetChanged`
and starts the flight.

### 8. Reanimated 4 + `useAnimatedStyle` on a conditionally mounted overlay

The overlay is mounted only while a drag session exists. Shared values live in `useCardDrag` (they
outlive the overlay), and `onStart` zeroes `dragX`/`dragY`/`lift` at the start of each drag. That is
why the legal-drop path does **not** reset them at release: resetting them synchronously while the
overlay is still mounted for one more commit would flash the copies back to the origin.

### 9. Four release-path races found in self-review, all closed

RNGH's `cancelsTouchesInView` only cancels the touches that were live when the pan activated, so a
**second finger can still reach a `Pressable` while a drag is running** — and the auto-queue can
dispatch, and the Undo button is right there. The release path was hardened accordingly:

- The selection is re-checked at the drop: if it no longer lifts the card the player picked up, the
  board moved under the drag and dropping would move a card they never grabbed → silent snap back.
  The sloppy-tap fallback is suppressed too (it would route a tap to a stale `cardIndex`).
- The legal-drop handoff also requires the drag to still be enabled. `dispatchGameAction` silently
  drops actions while the board is locked, and by then the cards have already been seeded to the
  drop point — they would have stayed there with no flight to correct them. This is the one real
  sharp edge of the seed-then-dispatch handoff and it is worth remembering.
- The snap-back's completion callback ignores an unfinished animation: `onStart` is the only other
  writer of `dragX`/`dragY`/`lift`, so "unfinished" means a *new* drag interrupted it, and clearing
  then would have wiped the fresh session.
- The session ref is written synchronously by begin/clear, not only on the next render, so a flick
  fast enough to release before React commits `beginDrag`'s `setState` still resolves properly.

### 10. Only one function needed to be a worklet

`hitTestDragSource` runs in `onTouchesDown` on the UI thread and is the only `'worklet'` in
`dragGeometry.ts`. Everything else resolves on JS (see learning 4), which also means the module
loads in jest unchanged — the `'worklet'` directive is transparent to the babel pipeline there, and
the whole file is directly unit-testable.

## Identified issues

| # | Issue | Status |
|---|---|---|
| 1 | R1: waste drag may not start on Android with the `box-none` attach point | **Open** — needs a physical Android device; one-line fallback documented above and inline |
| 2 | R2: un-flattening the card plane changes Fabric stacking | Reasoned safe; on the screenshot checklist |
| 3 | A card caught inside its 90 ms flight cannot be grabbed (its wrapper is `pointerEvents="none"` for those frames) | Accepted. ≤ 90 ms window, self-correcting, and grabbing a card that is mid-move is not a real gesture |
| 4 | Hidden cards use `opacity: 0`, which removes them from the **iOS** a11y tree for the ~1 s of a drag | Accepted (VoiceOver users cannot drag anyway); commented inline. `agent-device snapshot -i` at rest is on the checklist |
| 5 | The drag lifts a run that is not a valid descending-alternating sequence | Intentional — matches physical solitaire. `getDropHints` returns all-false for it, so nothing highlights and it snaps back |

## Testing

### Automated (green on this branch)

`yarn typecheck && yarn lint && yarn jest`.

`test/unit/features/klondike/cardDrag.test.ts` covers `buildDragSourceModel`, `hitTestDragSource`,
`buildDropCandidates`, `resolveDropCandidate`, `computeLiftedRunOffsets`, the
`areAbsoluteLayerCardPropsEqual` comparator (including the `hidden` regression), and the
**inverse-property test**: every item `buildCardLayerItems` produces for a board is recovered by
`hitTestDragSource` at its own rect centre.

### Dev-only self-test harness

```
yarn deeplink 'soli://?dragtest=1' --ios
```

Dev-mode gated, same pattern as `?reset=` / `?celebration=`. It drives the drag **state machine**
directly (no synthetic touches): builds the source model from the live layout registry, hit-tests a
card centre, begins a drag, steps the translation over a few frames, and resolves a drop — then
`devLog`s one `[DragTest] PASS …` / `[DragTest] FAIL …` line per case plus a summary. Cases:
single-card tableau→tableau, 3-card run, waste→foundation, foundation→tableau, King→empty column,
illegal drop, drop over nothing, sloppy-tap fallback.

Read the result with the log recipes in the testing skill (§7). It deliberately exercises the
geometry + resolution + dispatch path, **not** RNGH plumbing — that part needs real touches.

### What the orchestrator must verify on a device/simulator

Everything below needs real touches, which unit tests and the harness cannot produce.

**Must pass (iOS simulator is enough):**

1. Single-card tableau → tableau drag lands and flies to the destination without a jump or flash.
2. Multi-card run drag: the whole run lifts with its spacing, only the base card has to land.
3. Waste → tableau and waste → foundation drags. **On Android this is the R1 case.**
4. Foundation → tableau drag.
5. King → empty column; a non-King onto an empty column snaps back **and wiggles**.
6. Drop over empty felt: silent snap back, **no** wiggle.
7. Sloppy tap (press a card, roll ~10 px, release on the card): auto-moves, exactly like a tap.
8. Plain taps unchanged everywhere — especially **rapid stock taps** and **rapid waste taps** (the
   `useKlondikeGame` waste buffer). No missed or doubled moves.
9. Drag refused while auto-up is running and while the board is locked / celebrating.
10. Start a drag, background the app, return: no stuck lifted copy, board consistent.
11. Settings → animations master **off**: drag still works, no lift scale, snap-back is instant.
12. Undo button and the undo scrubber behave exactly as before; a second finger on the scrubber
    while a card is being dragged does nothing (and vice versa).
13. `yarn agent-device snapshot -i` at rest still lists every card, the stock, the waste and the
    foundations (a11y tree unchanged).

**Screenshot checks for R2 (un-flattened card plane):** waste-fan overlap, a foundation pile with 2+
cards, a card mid-flight, and a hint ring while a card is flying. All four must look exactly as they
do on `main`.

**R1 (open question) — Android only:** on a physical Android phone, drag the **waste** top card. If
it does not lift, apply the documented one-line fallback in `AbsoluteCardLayer.tsx` (move the
`<GestureDetector>` to the board shell `YStack` in `KlondikeGameView.tsx`; no coordinate change) and
re-verify cases 1–8.

**iOS drag automation note:** `agent-device` cannot pan on iOS (its single ~300 ms swipe never
activates an RNGH pan — the same limitation the undo scrubber hit). Use the `?dragtest=1` harness
for logic coverage and Appium (`scripts/ios-scrub.js` is the W3C pointer-action precedent) only if a
real iOS drag has to be automated.

## Follow-ups

| Idea | Pros / cons | Recommendation |
|---|---|---|
| **Hovered-zone ring** (design step 11) | Pro: sharper feedback about *which* legal target is armed. Con: a second highlight language on top of the green drop borders; more Reanimated surface. | Leave out until someone asks for it. |
| **Long-press to peek a buried card** | Pro: natural companion gesture. Con: competes with the drag's activation window and the tap path. | Not now. |
| **`scripts/ios-drag.js`** (Appium W3C pointer drag, generalising `scripts/ios-scrub.js`) | Pro: real end-to-end iOS drag coverage in CI-ish form. Con: Appium is serialized against agent-device and is slow. | Worth doing if drag regressions appear; the `?dragtest=1` harness covers the logic today. |
| **Drop-target preference memory** | Pro: could make tap-to-move learn from drags. Con: implicit state players cannot see. | No. |
