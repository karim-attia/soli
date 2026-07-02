# Game History Performance Absolute Card Layer Animation Architecture

## User prompt

```text
try option 3
new md file.
implement and test and loop directly
```

```text
works really well!!
pls run 10 test games and check memory usage.
also some minor minor issues:
when celebration runs, the symbols of the Foundation are still there, see screenshot
also, when moving card to foundation, sometimes the foundation stack vanishes and is see through
when running 10 test games, auto-up seems to be deactivated afterwards even though it's on in the settings. toggling it off and on makes it work normally again.
when moving a card from the stock to the board and then clicking undo, the card flight is behind the column on the board. also sometimes when moving from column to column. one interesting observation: when moving from left to right, it's on top and from right to left, it's below these other columns. I am afraid that we're opening pandora's box with this one. pls analyze and only touch this one if you're super super certain, otherwise report back to me.
And maybe the biggest issue: when clicking through the stock fast, it sometimes takes it as a clickon the open card. Even though the open card was not clicked. Maybe this registers because the flight is not completed yet. The open card then wiggles because Invalid move or moves around the board even though it was not click.
```

```text
[absolute-card-layer-animation-architecture.md](docs/product/game-history-performance/absolute-card-layer-animation-architecture.md)
[fabric-view-retention-root-fix.md](docs/product/game-history-performance/fabric-view-retention-root-fix.md)
implemented absolute card layer animation architecture. please have a look. a lot of files changed in staged.

I think the last issue was not fixed, i still sometimes have cards move from the stock even though i am only clicking on the covered cards.
please have a look. what else could cause this?
please check the memory now, it feels a bit sluggish, i played some more games.
did we also move the celebration to this new logic? should we?
```

```text
Hey, I have one more optimization. There's usually three open-faced cards from the stock, right? And when I tap there twice, I kind of expect both cards to move, so the first on top. And of course, if that's invalid, it will wiggle and nothing will happen, even if I tap twice. But if both cards are able to move, and I tap twice in like a fast succession in a game, they should both move. Is there a reasonable way to implement this in a quick way? Thank you.
```

```text
absolute layer is accepted as permanent. fully clean up.
```

```text
Implement top row with plumbing. Implement dispatch game action recommendation. Implement card view naming. The simple reanimated fade. The, like the fade, opacity scale, I think that's good that this happens. Please explain this in a few sentences what this does, but also please implement your recommendation after that. Like I kind of think I understand, but I don't fully, so please give me a few sentences so that I can read up on it afterwards. I agree with keeping, with doing the other stuff later. Also do the celebration cleanup, please. I agree with that one. And for the UI thread animations, please give me more details. I don't fully understand what's going on here. Please explain first in simple terms and kind of in which part of the code we would do what. Yes, please. Thank you.
```

```text
Committed. Implement animation recommendations.
```

```text
What's your recommendation? To go back to the 1b commit, and from there, we kind of have, I mean, the yarn release commit afterwards is tiny. That can be easily added again. And from there, kind of, like, restart again and rebuild whatever's needed and be super clean, or are you confident that you can now, with all this analysis, restore the behavior from before to make it as amazing as before? Yeah, please, please comment on this and let me know, and also comment on the later commits on how, like, on how you would review them, how useful they are, do they really make sense to simplify the code, or based on this learning, would it maybe make sense to do this differently? Thank you.
```

```text
Thank you. Please implement this now.
```

```text
anything else we should do to clean up?
what's stashed?
is there still an agents.md change stashed?
workspace?
what needed so that i can commit?
```

## Description

Try the option 3 animation architecture: render cards from one board-level absolute layer instead of letting each pile own its moving card views. Piles should provide target geometry and non-card UI; the card layer owns card visuals, hit targets, and motion. The first pass should be small enough to test quickly while moving the code toward the final architecture.

## Framing context

The current implementation keeps card visuals in a board-level absolute layer. The cleanup pass makes that permanent: structural piles keep only layout, empty-slot, outline, label, and glow responsibilities, while card visuals, card hit targets, movement, flip, and invalid wiggle live in `AbsoluteCardLayer`.

This started as an architecture experiment. After repeated manual/demo-game runs, the absolute layer is accepted as the production architecture because it keeps the flat memory profile and resolves the large long-run lag class. Keeping the old pile-local card-flight path now makes the mental model harder without protecting a path we plan to ship.

The June 29 animation-library pass is now treated as a failed behavior experiment rather than
architecture cleanup. Device A/B testing isolated stock-draw flicker and a stuck foundation glow
to commit `e647d1c`; the known-good `2722938` and `1b487d6` card-animation sources are identical.
The corrective pass restores that complete card-animation surface instead of patching either
symptom, while retaining the independent Android release and undo-scrubber commits.

## Acceptance Criteria

- Cards render from a board-level absolute layer for normal gameplay.
- Piles still render empty slots, labels, outlines, drop highlights, and glow/cleanup UI.
- Tapping stock, waste, foundation top cards, and tableau cards still routes to the existing gameplay handlers.
- Moving cards animate by changing target coordinates in one absolute layer, not by remounting between pile parents.
- Invalid wiggle and face-up changes still have visible feedback, at least for touched cards.
- New game and undo scrubbing reset or stabilize animation state without stale card positions.
- The old `CardFlightOverlayLayer` and `useFlightController` fallback path are removed.
- Pile components no longer accept card-flight snapshot props they never use in permanent absolute-layer mode.
- The implementation is simpler because there is one normal-gameplay card owner.
- Card movement, flip, invalid wiggle, and cleanup fades use React Native `Animated` with the
  native driver and retain the known-good default timing curves from `1b487d6`.
- Foundation glow retains its proven Reanimated shared-value sequence; moving four finite glow
  instances to React Native `Animated` has no measured performance benefit and regressed behavior.
- Reanimated remains limited to animation paths that need live UI-thread calculations:
  the gesture-driven undo scrubber and procedural celebration overlay.
- Existing durations remain intact. Card movement, flip, and wiggle intentionally omit custom
  easing so React Native's established default easing remains part of the shipped behavior.

## Design links

- Existing analysis: `docs/product/game-history-performance/fabric-view-retention-root-fix.md`
- Reanimated performance guide: https://docs.swmansion.com/react-native-reanimated/docs/guides/performance/
- React list identity: https://react.dev/learn/rendering-lists
- React Native Animated native driver: https://reactnative.dev/docs/animated
- React Native View pointer events: https://reactnative.dev/docs/view#pointerevents

## Possible approaches incl. pros and cons

### Board-level absolute layer with measured pile targets

Pros:

- Closest to the requested option 3.
- Cards keep stable React parents across stock/waste/tableau/foundation moves.
- Works with current pile layout if piles emit target rectangles.

Cons:

- Requires carefully preserving tap behavior and z-order.
- Initial target measurement can briefly be unavailable.
- More code than polishing the current overlay path.

### Board-level absolute layer with purely computed coordinates

Pros:

- Avoids measuring every card.
- Potentially fastest after implementation.

Cons:

- More brittle because it must duplicate all layout math from top row/tableau/tamagui spacing.
- Safe-area and dynamic card metrics make this risky for a first pass.

### Keep current pile rendering and only expand the overlay

Pros:

- Lower risk and smaller change.

Cons:

- Not option 3.
- Cards still remount between parents and visual ownership stays split.

### Delete the legacy overlay/fallback after accepting absolute layer

Pros:

- Removes the unused `CardFlightOverlayLayer` slot pool and the dispatch-delay snapshot controller.
- Makes card ownership direct: piles publish geometry, `AbsoluteCardLayer` renders cards.
- Reduces per-render prop plumbing through `TopRow`, `TableauSection`, `StockStack`, `WasteFan`, and `FoundationPile`.

Cons:

- Removes the old fallback path, so regressions must be fixed in the absolute layer instead of toggling back.

Recommendation: delete the fallback now. The user accepted the absolute layer as permanent, and keeping two systems makes future fixes riskier.

### Use one animation library for every animation

Pros:

- Superficially uniform imports and APIs.

Cons:

- Makes simple finite opacity/transform animations pay the conceptual and runtime cost of
  Reanimated shared values/worklets without needing per-frame application logic.
- React Native `Animated` cannot express the celebration's procedural per-frame paths or the
  scrubber's gesture-driven shared state as directly.

### Choose the smallest UI-thread-capable tool per animation

Pros:

- React Native `Animated` with `useNativeDriver: true` handles ordinary timing sequences on
  the native/UI side after JS starts them.
- Reanimated worklets remain available where each frame depends on gesture input or procedural
  calculations.
- Fewer Reanimated nodes and shared values remain mounted during normal gameplay.

Cons:

- Two animation APIs remain in the feature, with a deliberate responsibility boundary.

Recommendation: use the smallest capable tool. This matches the official React Native guidance
for native-driver opacity/transform animations and Reanimated's worklet model for UI-thread
calculations.

## Open questions to the user

- Resolved: ship as the always-on architecture. Do not keep a hidden old flight-overlay fallback.

## Dependencies

No new runtime dependencies.

## UX/UI Considerations

The user should not see a visual redesign. The goal is the same solitaire board with smoother, more deterministic card motion. Empty slots, stock labels, waste count, foundation outlines, and win cleanup should remain visually equivalent.

## Components

- Reuse `CardVisual`, `CardBack`, `EmptySlot`, `PileButton`, pile layout components, and existing game handlers.
- Keep the board-level `AbsoluteCardLayer` as the only normal-gameplay card renderer.
- Update pile components so they render structural UI without local card visuals.
- Keep `CelebrationOverlayLayer` separate because it is already bounded and conceptually a win effect, not normal gameplay card ownership.

## How to fetch data, how to cache

No data fetching changes. Card target positions are derived from current `GameState`, board/pile layout callbacks, and card metrics.

## Related tasks

- Follow-up memory work in `fabric-view-retention-root-fix.md`.
- Existing performance harness in `scripts/run-demo-autosolve.js`.

## Simplification ideas

- Remove the first-pass `CardFlightOverlayLayer` fallback now that absolute mode is permanent.
- First pass can use measured pile targets and avoid a second custom layout solver.
- First pass can defer fancy stacked drag/selection effects; tap-to-auto-move is the current primary interaction.
- Remove old `CardView` flight-measure props from pile boundaries. If local card rendering is ever needed for screenshots/tests, reintroduce it deliberately as static visuals, not as a second animation owner.

## Steps to implement

- [completed] Create this implementation plan.
- [completed] Read current pile/card boundaries and identify minimal props changes.
- [completed] Add target layout collection for stock, waste, foundations, and tableau columns.
- [completed] Add `AbsoluteCardLayer` that renders visible cards and animates target changes.
- [completed] Convert pile components to optionally hide local card visuals while keeping structure.
- [completed] Wire the layer into `KlondikeGameView` / `useKlondikeGame`.
- [completed] Run lints/typecheck.
- [completed] Run native/device smoke test and iterate.
- [completed] Fix follow-up visual/interaction issues found during manual play.
- [completed] Run 10-game memory harness after follow-up fixes.
- [completed] Re-read the staged absolute-layer implementation after the fast-stock issue reproduced.
- [completed] Sample current Android memory before rebuilding or disturbing the user's sluggish session.
- [completed] Remove the duplicate structural stock draw press target in absolute-layer stock mode.
- [completed] Disable absolute-card presses synchronously on the render where a card target changes.
- [completed] Run focused static checks for the interaction fix.
- [completed] Run native/device verification through a testing sub-agent.
- [completed] Update memory and celebration recommendations from the verification results.
- [completed] Analyze fast double-tap waste behavior after the stock-mis-tap guard.
- [completed] Add a waste-slot tap target that stays available while waste cards shift.
- [completed] Add a one-tap waste buffer for taps that arrive before React renders the next waste top card.
- [completed] Run focused static checks.
- [completed-via-user] Run Android release/device smoke through a testing sub-agent.
- [completed] Remove the old `CardFlightOverlayLayer` / `useFlightController` fallback now that absolute layer is permanent.
- [completed] Remove legacy card-flight props from pile component boundaries.
- [completed] Delete unused flight overlay/controller files.
- [completed] Run focused static checks after cleanup.
- [completed] Remove remaining post-absolute-layer cleanup residue: unused top-row waste press plumbing, unused dispatch selection arg, stale `CardView` naming, Reanimated-only simple fades, and unused celebration assignment shared value.
- [completed] Run focused static checks after cleanup-residue removal.
- [completed] Audit the remaining live animation paths against the native-driver/worklet boundary.
- [completed, later reverted] Convert foundation glow to React Native `Animated`, reuse the
  defined easing configurations in the absolute card layer and cleanup fades, and remove obsolete
  wrapper code. Device A/B testing later disproved this experiment.
- [completed] Run formatting, typecheck, lint, and tests for the animation pass.
- [completed] Build and smoke-test a fresh Android release on a connected device, including card
  movement, flip/wiggle, foundation glow, undo scrubber, and celebration when automation permits.
- [completed] Isolate the stock-draw flicker and stuck foundation glow through commit-by-commit
  physical-device A/B testing.
- [completed] Confirm `2722938` and `1b487d6` have identical card-animation source and that later
  release/scrubber commits do not overlap the corrective file set.
- [completed] Restore the complete `e647d1c` card-animation source surface to the known-good
  behavior while retaining the release and scrubber commits.
- [completed] Remove only timing constants made dead by the restored default-easing behavior and
  document why the front-loaded curve must not be reintroduced casually.
- [completed] Run formatting, typecheck, lint, tests, and focused diff validation.
- [completed] Run a fresh Android release build and physical-device smoke test through a testing
  sub-agent, then record the result here.

## Plan: Files to modify

- `src/features/klondike/components/KlondikeGameView.tsx`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/components/cards/AbsoluteCardLayer.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/StockStack.tsx`
- `src/features/klondike/components/cards/WasteFan.tsx`
- `src/features/klondike/components/cards/FoundationPile.tsx`
- `src/features/klondike/hooks/useDemoGameLauncher.ts`
- `src/features/klondike/hooks/useCelebrationController.ts`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/components/cards/AbsoluteCardLayer.tsx`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/components/cards/CardVisual.tsx`
- `src/features/klondike/components/cards/animations.ts`
- `src/features/klondike/components/cards/common.ts` (delete if no longer referenced)
- `src/features/klondike/constants.ts`
- `src/features/klondike/components/cards/CardFlightOverlayLayer.tsx`
- `src/animation/flightController.ts`
- `docs/product/game-history-performance/absolute-card-layer-animation-architecture.md`

## Files actually modified

- `docs/product/game-history-performance/absolute-card-layer-animation-architecture.md`
- `src/features/klondike/components/KlondikeGameView.tsx`
- `src/features/klondike/hooks/useKlondikeGame.ts`
- `src/features/klondike/components/cards/AbsoluteCardLayer.tsx`
- `src/features/klondike/components/cards/TopRow.tsx`
- `src/features/klondike/components/cards/TableauSection.tsx`
- `src/features/klondike/components/cards/StockStack.tsx`
- `src/features/klondike/components/cards/WasteFan.tsx`
- `src/features/klondike/components/cards/FoundationPile.tsx`
- `src/features/klondike/components/cards/CardVisual.tsx`
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx`
- `src/features/klondike/components/cards/animations.ts`
- `src/features/klondike/components/cards/common.ts` deleted
- `src/features/klondike/constants.ts`
- `src/features/klondike/hooks/useAutoQueueRunner.ts`
- `src/features/klondike/hooks/useCelebrationController.ts`
- `src/features/klondike/hooks/useDemoGameLauncher.ts`
- `src/features/klondike/hooks/useKlondikePersistence.ts`
- `src/features/klondike/types.ts`
- `src/features/klondike/components/cards/CardFlightOverlayLayer.tsx` deleted
- `src/animation/flightController.ts` deleted

## Intermediary learnings

- The existing top row and tableau layout can publish enough target geometry for a first measured-layer implementation. The layer combines top-row/row layout plus slot/column layout rather than measuring each card.
- In absolute-layer mode, game actions now dispatch directly. Movement is produced by stable absolute-layer card components receiving new coordinates after reducer updates.
- The first pass renders the currently visible card set: stock top, last three waste cards, foundation top cards, and all tableau cards. Fully hidden stock/waste cards are still not mounted as card visuals.
- `yarn lint` passed.
- `yarn typecheck` initially caught a strict-null foundation layout lookup, then passed after the lookup was normalized.
- Android release smoke test passed overall: app launched, board rendered without duplicate/missing cards, stock draw worked, tableau auto-move worked, undo worked, and New Game reset without stale card positions.
- The first tester pass could not clearly see invalid wiggle in sampled frames, so the absolute layer wiggle offset was made slightly stronger. User then confirmed the J card visibly wiggled and the invalid wiggle works well.
- Follow-up z-order analysis found a deterministic cause: moving cards used their destination column z-index during the whole flight, so right-to-left flights could pass under higher-index source columns. The fix boosts z-index only while a card is settling.
- Follow-up fast-stock-click analysis found moving cards remained pressable during native-driver transforms. The fix disables pointer events only while a card is settling.
- Foundation symbol visibility came from `FoundationPile` falling back to the suit symbol whenever local top-card rendering was suppressed. The fix renders the symbol only when the foundation is actually empty.
- Foundation see-through handoff came from rendering only the new top foundation card while it was still flying. The fix keeps the previous foundation top as a noninteractive underlay.
- Demo playlist hydrates fixture games with runtime auto-up disabled. The fix restores runtime auto-up from settings when the playlist completes or fails.
- Final 10-game run verified the new absolute-layer settle callback: `winning_card_settled` logged for all 10 wins. A redundant fallback timer still fired in 5/10 before cleanup; the fallback is now cleared on winning-card settle.
- Current sluggish-session memory sample before any rebuild on 2026-06-26: `agent-device perf memory sample` reported Total PSS `530.7 MB`, Total RSS `479.0 MB`, Native Heap PSS `144.1 MB`, Unknown PSS `95.1 MB`, and Dalvik Heap PSS `47.2 MB`. A follow-up `perf metrics` sample reported Total PSS `500.8 MB`, CPU `15%`, and no frame data in the short idle window.
- React Native View pointer-event docs confirm `View.pointerEvents="none"` removes a view from touch targeting and `box-none` lets subviews receive touches. That supports keeping the absolute-layer root `box-none` while explicitly removing duplicate/stale card press targets.
- Root cause candidate for the remaining fast-stock symptom: after a draw, the same card id moves from stock to waste, but before the animation effect marks it as settling, the card can render once with its new waste `onPress` while still at the old/native stock position. The fix disables pressability during that first target-change render.
- Secondary root cause candidate: the structural stock `PileButton` still owned `onDraw` under the absolute stock card. In absolute-card mode, that violates the single-owner hit-target model and can draw from an underlay rather than the visible card layer.
- Fast double-tapping waste can be dropped by the same pressability guard that prevents stock mis-taps: after one waste card moves, the next waste card may shift into the top-waste target, so its card component is temporarily non-pressable while the animation target changes.
- A waste-slot tap target is safer than re-enabling moving-card presses because it is anchored only over the waste area and does not reintroduce a stock/waste overlap hit target.
- Implemented a max-one buffered waste tap. A second tap on the same waste top before React renders the next state is replayed once after the first moved card leaves the waste top; invalid first taps do not buffer.
- `yarn lint` passed after the waste double-tap optimization.
- `yarn typecheck` passed after the waste double-tap optimization.
- User manually tested the waste double-tap optimization and reported it looks good. The planned follow-up testing sub-agent did not return a report, and a fallback `yarn release` was interrupted by the user before completion, so this pass uses the user's manual device verification rather than a fresh automated release-build smoke.
- Android release/device tester result after the fix: `yarn release` completed successfully and installed `/Users/karim/kDrive/Code/soli/android/app/build/outputs/apk/release/app-release.apk` on device `A065`.
- Focused stock-only tap smoke after install passed: ten coordinate taps on the stock/draw card changed moves `18 -> 28`, stock `15 -> 5`, and waste `9 -> 19`, with no observed unintended waste-card auto-move or invalid wiggle. Caveat: `agent-device press` taps are serialized and slower than a human ultra-fast burst.
- Post-smoke tester memory sample: Total PSS `360.3 MB`, RSS `476.6 MB`, Native Heap PSS `211.4 MB`, Unknown PSS `50.0 MB`, Dalvik Heap PSS `25.8 MB`. Follow-up perf metrics showed Total PSS `348.3 MB`, Native Heap PSS `210.6 MB`, Unknown PSS `50.0 MB`, CPU `0%` in the sampled idle window.
- Tester frame sample reported 170/324 janky frames (`52.5%`) in a window that included coordinate automation and artifact capture, so this is not a clean gameplay FPS benchmark.
- Celebration is already on the right kind of board-level bounded overlay: `CelebrationOverlayLayer` keeps a fixed `52` slot pool, `KlondikeGameView` renders it above the absolute gameplay layer, and the gameplay layer returns no cards while `celebrationActive`. Moving celebration into `AbsoluteCardLayer` would consolidate ownership but is not an obvious memory or correctness win right now.
- After the user's 40-game manual run on 2026-06-26, memory stayed broadly flat versus the 10-game absolute-layer run: Total PSS `486.1-528.2 MB`, Native Heap PSS `300.7-312.8 MB`, Unknown PSS `81.9-88.4 MB`, Java/Dalvik Heap PSS `17.9-45.1 MB`. This is nowhere near the previous `1.2-2.0 GB` runaway state.
- The same 40-game sample still showed runtime pressure: CPU `180%` on the first foreground sample, then `88%` after a 5s idle wait. Top threads included `mqt_v_js` around `30.7%`, process main thread around `26.9%`, `RenderThread` around `7.6%`, and Hermes `hades` around `11.5%`.
- The 40-game frame windows missed deadlines (`29.7%` then `22.1%`), with the caveat that foregrounding and diagnostic collection were in the sample window. This points more at CPU/render pressure than total process memory.
- Detailed 40-game `dumpsys meminfo` reported `968` Android `Views`, `1` `ViewRootImpl`, `1` `Activity`, and `0` `WebViews`. Screenshot `/Users/karim/kDrive/Code/soli/tmp/android-smoke/after-40-games-memory-check.png` showed normal gameplay rather than an active celebration, so the elevated view count is worth tracking separately.
- Once the absolute layer was accepted as permanent, the old `CardFlightOverlayLayer`, `useFlightController`, `StockStack`, `WasteFan`, pile-local `CardView`, and card-flight snapshot props became dead architecture. Removing them simplified normal gameplay to one card owner: structural piles publish geometry and `AbsoluteCardLayer` renders/taps/animates cards.
- The cleanup removed about 2,270 lines from the production diff while preserving the reducer/state APIs used by demo replay, auto-queue, timer, and persistence.
- Post-acceptance cleanup found two stale concepts from earlier architecture attempts: `dispatchGameAction` still accepted an ignored selection snapshot, and celebration bindings still carried an assignments shared value even though overlay slots now receive assignments as React props.
- Simple empty-slot/win-cleanup fades are still useful because they prevent structural outlines from snapping away during the win handoff, but they do not need Reanimated worklets; React Native `Animated` with the native driver can handle opacity/scale without adding Reanimated residency.
- Renaming `CardView.tsx` to `CardVisual.tsx` aligns the file with the permanent architecture: card visuals are primitives now, while animation ownership lives in the absolute gameplay layer and celebration overlay.
- Superseded experiment: foundation glow was moved to React Native `Animated` because it is a
  finite opacity sequence. Device testing later found that interrupted native-driver sequences
  could leave the glow visible, so the proven Reanimated implementation was restored.
- The undo scrubber and celebration are different: their displayed values are recalculated from
  live gesture/progress shared values on the UI thread, so retaining Reanimated there keeps JS
  out of the per-frame path.
- React Native's native driver serializes an ordinary timing animation before it starts, so its
  frame updates can continue without JS. Reanimated worklets are still the better fit when each
  frame must run application calculations, as the celebration does, or react directly to a pan
  gesture, as the undo scrubber does.
- Superseded experiment: the absolute layer had unused custom easing constants, which were assumed
  to represent intended tuning. Applying them changed the proven animation behavior and introduced
  stock-draw flicker; the constants are now removed and the default easing is intentional.
- The old waste-slide timing configuration was only used by the deleted pile-local animation
  architecture and could be removed.
- Follow-up device A/B testing disproved the assumption that the unused custom timing objects
  represented the desired animation behavior. Before `e647d1c`, React Native received only the
  durations and therefore used its default symmetric ease-in-out curve.
- The custom card-flight bezier added by `e647d1c` is extremely front-loaded: after 40 ms of the
  90 ms flight it is roughly 95% complete, while the known-good default is roughly 41% complete.
  The card face still changes after the first 40 ms flip half, making the reveal appear late and
  producing the reproducible stock-draw flicker.
- Migrating foundation glow from Reanimated to an imperative React Native `Animated.sequence`
  did not materially reduce source or runtime complexity and introduced the reproducible stuck
  foundation glow. Four glow instances are not a credible performance reason to retain the swap.
- The Android release improvement is shell-only and independent. The undo-scrubber commit touches
  separate files and keeps live gesture presentation on Reanimated shared values, so both can be
  retained while restoring the card-animation surface.
- Reanimated already exposes `Animated.View`; using it directly in `FoundationPile` removes both
  the old one-line `common.ts` re-export and the replacement custom animated-view alias.

## Identified issues

- [verified] Absolute card hit targets did not block stock draw, tableau auto-move, undo, or New Game in Android smoke testing.
- [verified] Initial measured targets were available after layout settled; the board rendered cleanly without missing or duplicate cards.
- [verified] Fresh Android release logs reached repeated completed foundations, winning-card
  settlement, and 52-card celebration startup; device screenshots also captured the converted
  foundation glow around the arriving `3S`.
- [fixed] Invalid wiggle was hard to see in the first sampled recording; absolute-layer wiggle now uses a stronger offset and user confirmed it is visible.
- [known-limitation] Recycle animation is not fully solved in this first pass because hidden older waste cards are not mounted; the next visible stock top can appear without a continuous card component.
- [fixed] Absolute-layer winning-card settlement now feeds the existing celebration handoff controller.
- [fixed] Foundation suit symbols were visible during celebration.
- [fixed] Foundation stack could look see-through while a new card was flying to the foundation.
- [fixed-in-code] 10-game demo playlist can leave runtime auto-up disabled even when the setting is on. The runtime state is now restored from settings when the playlist completes or fails. Manual post-playlist auto-up was not separately UI-smoke-tested.
- [fixed] Some right-to-left/undo flights could appear behind tableau columns. Moving cards now get a temporary high z-index only while settling.
- [fixed] Fast stock clicks could hit the newly opened/flying waste card before its flight settled. Moving cards now ignore pointer events while settling.
- [fixed-in-code] The first render after a card target change could still be pressable before the settling effect ran. Absolute-layer cards now disable pressability synchronously while their target differs from the previous target.
- [fixed-in-code] The structural stock pile was still pressable when a visible absolute stock card existed. The structural slot now keeps recycle behavior but no longer duplicates the draw handler under stock cards.
- [observed] Current memory after additional play is around `500-531 MB` PSS, not the previous runaway `1.2-2.0 GB` class. The sluggish feel still needs interaction/frame verification because the sampled memory is not alarming by itself.
- [verified] Android release stock-only repeated-tap smoke passed after the duplicate-target and first-render pressability fixes.
- [recommendation] Keep celebration in `CelebrationOverlayLayer` rather than moving it into `AbsoluteCardLayer` unless a concrete celebration-specific bug appears.
- [observed] After 40 manual games, memory still looks flat enough, but CPU/frame pressure and Android view count are now the suspicious signals.
- [verified-by-user] Fast waste double-tap behavior looks good in manual testing.
- `yarn lint` passed after the duplicate-stock-target and first-render pressability fixes.
- `yarn typecheck` passed after the duplicate-stock-target and first-render pressability fixes.
- [fixed] Permanent absolute-layer cleanup removed the old fallback card-flight overlay and dispatch snapshot gate.
- [fixed] Removed cleanup residue left after accepting the absolute card layer.
- [reverted] A pass moved every finite card animation, including foundation glow, to React Native
  `Animated`. Card movement, flip, wiggle, and cleanup fades remain there, but foundation glow is
  back on its proven Reanimated shared-value sequence after the Native Animated regression.
- [superseded-testing-gap] The earlier release automation could not reliably capture the very
  brief face flip or invalid wiggle. Its claim about "intended easing" was later disproved by
  device A/B testing; the final implementation restores the known-good default easing.
- [fixed-in-code] `e647d1c` changed proven movement/flip/wiggle curves and migrated foundation glow;
  restore the whole experiment rather than layering symptom-specific fixes on top.
- [separate] The vertically shifted Android card font reproduces on both sides of the animation
  regression boundary and is not part of this corrective pass.

## Testing

- `yarn lint` passed.
- `yarn typecheck` passed.
- `git diff --check` passed after removing prompt-trailing spaces in this plan doc.
- User manual device test passed for the waste double-tap optimization. No new automated Android release smoke was completed after this optimization because the testing sub-agent did not return a report and the fallback `yarn release` was interrupted by the user.
- `yarn release` passed in the Android smoke-test subagent and installed the release APK on physical Android `A065`.
- Post-fix Android smoke artifacts from the testing sub-agent:
  - `/Users/karim/kDrive/Code/soli/tmp/test-artifacts/absolute-card-layer/01-initial.png`
  - `/Users/karim/kDrive/Code/soli/tmp/test-artifacts/absolute-card-layer/03-after-fast-stock-taps-physical.png`
  - `/Users/karim/kDrive/Code/soli/tmp/test-artifacts/absolute-card-layer/stock-fast-tap-physical-coords.mp4`
- 40-game manual memory check artifact: `/Users/karim/kDrive/Code/soli/tmp/android-smoke/after-40-games-memory-check.png`
- Native smoke test passed: launch, initial board render, two stock draws, tableau auto-move, undo, and New Game reset.
- Invalid wiggle is confirmed visible by user observation after the stronger absolute-layer wiggle change.
- Final 10-game harness variant `absolute-layer-final` completed 10/10 games on Android A065.
- Final memory result, Game 1 -> Game 10: Total PSS `450.3 MB -> 501.9 MB` (`+51.6 MB`), Native Heap PSS `273.0 MB -> 288.9 MB` (`+15.9 MB`), Unknown PSS `80.0 MB -> 97.3 MB` (`+17.3 MB`), Java Heap PSS `30.8 MB -> 41.9 MB` (`+11.1 MB`), Views `397 -> 530`.
- Memory assessment: flat/not-runaway and dramatically better than the old `+650-760 MB` class; slightly worse than the earlier clean overlay baseline (`-26 MB`) and just over the `+50 MB` total-PSS target band.
- Final artifacts: `/Users/karim/kDrive/Code/soli/tmp/perf-samples/absolute-layer-final-per-game/`.
- Celebration handoff in final run: `winning_card_settled` logged for 10/10 games. A redundant fallback logged in 5/10 before the timer cleanup; code now clears fallback on settle.
- Still not manually verified after the final code changes: post-playlist auto-up UI behavior without toggling settings.
- Cleanup validation on 2026-06-28: `yarn format:check`, `yarn typecheck`, `yarn lint`, and `yarn jest --runInBand` passed.
- Cleanup-path whitespace validation passed: `git diff --check -- docs/product/game-history-performance/absolute-card-layer-animation-architecture.md src/animation src/features/klondike`.
- Full `git diff --check` is blocked by unrelated trailing whitespace in modified `AGENTS.md`.
- Android release validation attempted with `yarn release`, but Expo timed out waiting for `Pixel_9_API_36`; `adb devices -l` showed `emulator-5554 offline`, and `agent-device devices --platform android` found no usable Android target. The stuck emulator process was stopped.
- Cleanup-residue validation on 2026-06-29: `yarn format:check`, `yarn typecheck`, `yarn lint`, `yarn jest --runInBand`, and focused `git diff --check -- app/feature-graphic.tsx docs/product/game-history-performance/absolute-card-layer-animation-architecture.md src/features/klondike src/animation` passed.
- Android release/device smoke was not run on 2026-06-29 because `adb devices -l` and `agent-device devices --platform android` listed no connected Android target.
- Animation-driver validation on 2026-06-29: `yarn format:check`, `yarn typecheck`, `yarn lint`,
  `yarn jest --runInBand` (11 suites / 56 tests), and focused `git diff --check` passed.
- A fresh Android release build passed on physical device `A065`: `BUILD SUCCESSFUL in 17s`, 642
  tasks, and the changed APK hash/timestamp plus package update time confirmed the new APK was
  installed as `ch.karimattia.soli` version `0.8.0` (code 13).
- Fresh-release device smoke passed for initial board rendering, stock draw/card movement, normal
  undo, and bidirectional undo scrubbing. Final logs contained no fatal/error/exception signal.
- A one-game Demo UI run captured the converted native-driver foundation glow and a 52-card
  Reanimated `Comet Halo` celebration in substantially different positions across two frames.
  Evidence:
  - `tmp/test-artifacts/animation-recommendation/22-single-demo-06.png`
  - `tmp/test-artifacts/animation-recommendation/22-single-demo-12.png`
  - `tmp/test-artifacts/animation-recommendation/22-single-demo-15.png`
- Some screenshots requested immediately after animation changes contained transient black regions;
  settled screenshots and later active-celebration frames were complete. This was not visible as a
  stable app state and is recorded as an automation capture-timing anomaly, not a reproduced UI bug.
- The physical device's original `15000` ms screen timeout was restored and verified, the
  `agent-device` session was closed, and no build/test process was left running.
- Corrective-pass testing plan: compare the resulting source against `1b487d6`, run all static
  checks, build with `yarn release`, confirm installation on physical Android, smoke stock draw,
  invalid wiggle, foundation arrival/glow, normal Undo, and the undo scrubber without attempting
  frame-by-frame visual grading that is better handled by the user's final feel test.
- Corrective-pass static validation passed: `yarn format`, `yarn format:check`, `yarn typecheck`,
  `yarn lint`, and `yarn jest --runInBand` (11 suites / 56 tests).
- Corrective-pass Android release validation passed on physical device `A065`: 642 Gradle tasks,
  `BUILD SUCCESSFUL in 5m 10s`, APK SHA-256
  `f6a9bf4ebf4006aea8c6ae71a6faa572f9a1839b71586a89a1ca28c1a35d6b83`, and package update time
  `2026-07-02 18:12:50` confirmed that version `0.8.0` (code 13) was installed and launched.
- Physical-device smoke passed for complete initial rendering, four stock draws (`23 -> 19`),
  normal Undo (`19 -> 20`), and an undo-scrubber rewind (`20 -> 22`). App-log scans found no
  fatal/error/exception/crash signal.
- An invalid waste press produced no crash, but sparse screenshots cannot verify the brief wiggle.
  No reliable foundation move was available without extending the test, so final glow appearance
  and subjective flicker/smoothness remain for the user's manual feel test.
- Testing artifacts: `tmp/test-artifacts/corrective-animation-final/` and
  `/Users/karim/.agent-device/sessions/corrective-animation-final/app.log`. The tester closed its
  agent-device session and left no Expo, Metro, or build process running.
