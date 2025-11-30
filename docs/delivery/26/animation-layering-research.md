# Animation Layering Research (2025-11-23)

## Key Findings
- React Native only applies `zIndex` ordering within a single parent stacking context, so siblings in different subtrees ignore each other’s `zIndex` even if the value is very large. Android < 21 ignores `zIndex` entirely, and Android ≥ 21 requires the parent to be positioned for children to respect the ordering.[^rn-zindex]
- CSS stacking-context rules still govern Tamagui layouts because Tamagui ultimately emits React Native views; properties such as `transform`, `opacity`, and `overflow` can spawn new stacking contexts that isolate our animated card flights.[^mdn-stacking][^vocal-stacking]
- Tamagui exposes a `Portal` component that renders children into a host outside the normal view tree, matching the familiar React DOM `createPortal` behavior and providing an explicit overlay layer for content that must float above the rest of the interface.[^tamagui-portal]
- Our current flights keep each card inside the stock/tableau/foundation containers. When the flight travels across sections, it inherits the source container’s stacking context and can be covered by siblings rendered later in the board (for example, tableau columns rendered after the source column or overlay widgets such as the statistics HUD). The Reanimated worklet temporarily sets `flightZ` to `1000`, but that value is still relative to the original column wrapper.[^cardview-usecardanimations]

## React Native Layering Model
React Native mimics web stacking rules: the framework only compares `zIndex` values among siblings that share the same parent view and have non-`static` positioning. Parents that are not positioned break the chain, and platform quirks differ (Android requires API level ≥ 21, and iOS ignores `zIndex` for non-overlapping siblings).[^rn-zindex] This means a draw animation moving from tableau to foundation jumps between unrelated parents, so the intermediate view never escapes its original stacking context unless we manually hoist it.

React Native also inherits CSS stacking-context triggers: any ancestor with `transform`, `opacity < 1`, or `overflow: hidden` produces a new local stacking context.[^vocal-stacking][^mdn-stacking] In our board layout the tableau column wrappers, stock containers, and top-row stacks all set `overflow` or `position` properties, which can isolate flights.

## Tamagui + React Native Considerations
Tamagui’s styling API sits on top of React Native. Its `Portal` component allows rendering children into a global overlay host so that dialogs, sheets, or custom overlays break out of nested stacks.[^tamagui-portal] Tamagui also honors React Native’s `zIndex`, so mixing Tamagui primitives with raw `View`/`Animated.View` keeps the same restrictions. Because Tamagui builds on Yoga layout, the safest layering approach is to place transient card flights in a dedicated overlay container (either via Tamagui `Portal` or a manually managed absolutely positioned `View`) rather than relying on per-column wrappers.

## Observed Layering Risks in Current Implementation
- Flights stay inside their column/stack wrappers. `CardView` animates `flightZ` to `1000`, but that only raises the card above siblings inside the same wrapper.[^cardview-usecardanimations]
- Tableau and foundation components render stacked cards with `position: 'absolute'` and local `zIndex`, reinforcing the local stacking context boundaries.[^styles-cardwrappers]
- Board-level overlays such as `CelebrationTouchBlocker` and statistics HUD mount after the tableau, so any flight that remains in a tableau child can end up beneath those overlays when paths cross.
- The board shell itself is `position: 'relative'`, but we never provide an absolutely positioned overlay layer that spans all columns; each column is effectively a silo.

```177:200:src/features/klondike/components/cards/CardView.tsx
    const motionStyle = useAnimatedStyle<ViewStyle>(() => {
      let translateX = wiggle.value + flightX.value
      let translateY = flightY.value
      let opacity = flightOpacity.value
      let zIndex = flightZ.value > 0 ? flightZ.value : baseZIndex
      …
          flightZ.value = 1000
          flightX.value = withTiming(0, CARD_FLIGHT_TIMING, (finished) => {
            if (finished) {
              flightZ.value = 0
            }
          })
```

```117:137:src/features/klondike/components/cards/styles.ts
  stockContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockCardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  foundationCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
```

## Flight Combination Inventory
| Source Pile | Target Pile | Trigger(s) | Notes |
|-------------|-------------|------------|-------|
| Stock → Waste | Tap draw, auto-play stock | Card originates in stock stack wrapper |
| Waste → Stock | Recycle tap, undo | Drawn card flies back beneath stock top card |
| Waste → Tableau | Manual drag/tap, auto-move | Travels from top-row waste container into tableau column |
| Waste → Foundation | Auto foundation, user drop | Crosses top row into foundation wrapper |
| Tableau → Tableau | Manual drag, auto-move, undo | Starts mid-column with stacked offsets |
| Tableau → Foundation | Manual drop, auto-play | Leaves column wrapper for foundation pressable |
| Foundation → Tableau | Undo, manual reclaim (if allowed) | Starts in foundation card stack |
| Foundation → Waste/Stock | Undo auto-play | Spans board edges and may cross overlays |
| Tableau → Stock/Waste | Undo of stock draw that originated from tableau | Reconstructed flights traverse top row |

Each combination must look correct during forward moves and their inverse undo flows. All of them can pass under statistics overlays, undo scrubber, or celebration blockers if we keep the card inside its original column wrapper during flight.

## Approaches Evaluated

### 1. Dedicated Overlay Layer (Portal or Absolute Host)
Render transient flight cards inside a single overlay container that sits above board content. Implementation options include:
- Tamagui `Portal` to a shared host view positioned at the root of `KlondikeGameView`.
- A manually managed `View` with `StyleSheet.absoluteFill` declared after board children so flights are siblings of end-of-tree overlays.

**Pros:** breaks out of column stacking contexts; centralizes z-order control; works on both platforms; simplifies debugging (overlay can log active flights).  
**Cons:** flights must translate from global coordinates; need to keep interactions disabled while card exists in overlay; more bookkeeping to move card back into pile when flight ends.

### 2. Refactor Column Wrappers to Share One Positioned Parent
Keep flights inside the board but ensure every pile adopts a shared ancestor that controls `zIndex`. This would require:
- Making `TableauSection`, `TopRow`, and overlays children of a single positioned container.
- Removing/adjusting properties that create intermediate stacking contexts (`overflow`, `transform`).

**Pros:** Less refactoring than portals; no need to clone card visuals into overlay.  
**Cons:** Hard to maintain as UI evolves; still susceptible to new stacking contexts; Column-specific layout (`overflow: visible`) may be incompatible with flattening.

### 3. React Native `Modal`
Wrap flights in a transparent `Modal` to force them above everything.

**Pros:** Guaranteed top-most layer.  
**Cons:** Expensive; disrupts accessibility; captured pointer events; poor animation performance on Android; overkill for many simultaneous flights.

### 4. Per-Pile Elevation Tweaks Only
Incrementally raise `zIndex` on piles believed to conflict (statistics HUD, undo scrubber, etc.).

**Pros:** Minimal code changes.  
**Cons:** Brittle; easy to regress; doesn’t solve sibling isolation between columns; doesn't help when flights traverse under newly added overlays.

**Recommendation:** Adopt approach #1. Use a dedicated overlay host (Tamagui `Portal` or a manually managed absolute overlay). It isolates flight rendering from pile wrappers, avoids fiddly per-component `zIndex` adjustments, and matches how we already handle celebration overlays.

### Approach 1 vs. 2 (trade-offs)
- **Robustness:** The overlay host (1) keeps layering logic in one place and remains stable when new overlays/HUD elements appear. The shared-parent approach (2) regresses whenever a pile gains `transform`, `opacity`, or `overflow` that reintroduces a stacking context.
- **Layout coupling:** Approach 2 ties flight correctness to layout composition (TopRow vs Tableau vs overlays). Any refactor of board structure risks flights dropping under siblings; approach 1 is insensitive to layout rearrangements as long as the overlay fills the viewport.
- **Migration complexity:** Approach 1 needs coordinate transforms (pile → global → overlay) and a flight lifecycle to hide the source card; approach 2 requires auditing every pile wrapper and occasionally relaxing `overflow`/hitSlop constraints that exist for game feel.
- **QA surface:** With approach 1, tests can assert “flight lives in overlay host” as a single invariant. Approach 2 demands per-component regression tests whenever we touch layout.
- **Android parity:** Approach 1 sidesteps Android `zIndex` quirks by removing reliance on per-pile stacking. Approach 2 still inherits those quirks and might need extra `position: 'relative'` shims per wrapper.

### Cloning card visuals into an overlay
- **State drift risk:** The overlay card must mirror face-up state, selection border, and metrics from the source snapshot. If the card flips mid-flight, the overlay needs to re-render synchronously to avoid a mismatch between source and overlay visuals.
- **Event handling:** The overlay clone should ignore pointer events (e.g., `pointerEvents="none"`) so taps still register on the board while the flight runs. If we keep the source card visible, it should be hidden/opacity 0 during the flight to prevent double-vision.
- **Performance:** Cloning a single `CardVisual` is cheap, but bulk auto-plays can create multiple overlays. We should reuse a pooled overlay renderer keyed by card id and recycle nodes when flights end to avoid mounting new Reanimated nodes per frame.
- **Measurement:** The overlay clone needs the source card’s measured `pageX/pageY/width/height` snapshot to start from the correct position; otherwise, it may jump. Keeping the measurement in the flight controller avoids re-measuring inside the overlay.
- **Maintainability:** Centralizing the clone inside a single overlay host keeps flight styling and metrics in one file. Reusing the existing `CardVisual` avoids a “second card renderer” drift; if we do need specialized visuals, wrap them in a thin adapter instead of forking the component tree.

## Automated Testing Strategy
1. **Instrumentation Hook (Unit / Integration):**
   - Expose a debug hook on the flight controller that emits `flightStarted` and `flightEnded` events with `{ sourcePile, targetPile, timestamp, overlayHost }`.
   - Unit-test the controller to ensure each game action (draw, drop, undo, auto-play) emits the expected source/target combination.

2. **Screenshot Regression (Detox or Maestro Driver):**
   - Add a hidden dev toggle that pauses animation midway (e.g., time travel to 50% progress) so Detox can capture a frame and verify via pixel match that the flight card rectangle sits above a sentinel view placed in the tableau/foundation.
   - Maintain golden snapshots per combination; run on both platforms because Android/iOS differ in layering quirks.

3. **Layout Assertions:**
   - During end-to-end tests, query the overlay host (via `testID`) and assert that the flying card is a child of the overlay container rather than a tableau column. This ensures future regressions surface even when the visual diff is subtle.

4. **Performance Guardrails:**
   - Log overlay depth and drop frames when more than `N` flights are active, so QA can catch cases where layering fix introduces jank.

## Next Steps & Task Recommendations
1. Design and implement an overlay host for flights (likely via Tamagui `Portal` or a manually managed absolute container) and migrate `CardView` to clone card visuals into the overlay during transit.
2. Audit board components (`TopRow`, `TableauSection`, statistics HUD, celebration blockers) for unintended stacking contexts (`overflow`, `transform`, `opacity`) and remove or isolate them once flights move into the overlay.
3. Instrument the flight controller with source/target metadata and add automated tests (unit and Detox) that cover the combination table above.
4. Document layering and testing practices in the developer guide so future UI work keeps the overlay contract intact.

[^rn-zindex]: React Native documentation, “View Style Props – `zIndex`” (https://reactnative.dev/docs/view-style-props#zindex), accessed 2025-11-23.
[^mdn-stacking]: MDN Web Docs, “Understanding z-index and Stacking Contexts” (https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_positioned_layout/Understanding_z-index), accessed 2025-11-23.
[^vocal-stacking]: Aishwarya Kumar, “The Real Culprit: Why Your z-index isn’t Working (and 5 Fixes)” (https://vocal.media/geeks/the-real-culprit-why-your-z-index-isn-t-working-and-5-fixes) – discusses stacking context triggers such as `opacity` and `transform`.
[^tamagui-portal]: Tamagui Portal package README, “@tamagui/portal” (https://github.com/tamagui/tamagui/tree/master/packages/portal) – documents the Portal component for rendering content outside the normal tree.
[^cardview-usecardanimations]: `useCardAnimations` sets `flightZ` inside the column wrapper, keeping flights in the source stacking context. See snippet above.





