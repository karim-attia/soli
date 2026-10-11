# react-native-gesture-handler (RNGH)

Cached research for the APIs Soli uses. **Written 2026-09-09** against the version pinned in
`package.json`: **`react-native-gesture-handler@2.32.0`** (with `react-native-reanimated@4.5.0`,
React Native 0.86, New Architecture / Fabric).

Sources:

- Gestures overview & Pan gesture — https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/pan-gesture
- Manual gesture / manual activation — https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/manual-gesture/
- Gesture state manager — https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/state-manager/
- Gesture detectors — https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/gesture-detectors/
- Gesture composition — https://docs.swmansion.com/react-native-gesture-handler/docs/fundamentals/gesture-composition/
- Issue #2885 (manualActivation broke touchables after a cancelled touch), fixed by PR #3007 —
  https://github.com/software-mansion/react-native-gesture-handler/issues/2885

The doc site moved several pages between versions and some of them 404 for the unversioned path, so
everything below that matters for correctness was additionally verified against the **installed
package source** in `node_modules/react-native-gesture-handler` (paths quoted inline). Prefer the
source citations — they are the code this app actually runs.

---

## 1. `manualActivation(true)` + `GestureStateManager`

`manualActivation` is declared on `ContinousBaseGesture`
(`lib/typescript/handlers/gestures/gesture.d.ts`), so it exists on `Pan`, `Pinch`, `Rotation` and
`Hover` — **not** on `Tap`/`LongPress`/`Fling`.

> When `true` the handler will not activate by itself even if its activation criteria are met.
> Instead you can manipulate its state using state manager.

The state manager passed as the 2nd argument to every touch callback is
(`lib/typescript/handlers/gestures/gestureStateManager.d.ts`):

```ts
export interface GestureStateManagerType {
  begin: () => void
  activate: () => void
  fail: () => void
  end: () => void
}
```

- `activate()` — moves the handler to `ACTIVE`; fires `onStart`. Only works once the handler has
  begun (i.e. it has received touches).
- `fail()` — moves the handler to `FAILED`; fires `onFinalize`. This is the "not my touch" exit: the
  handler stops tracking the pointer and RN's own touch/responder system keeps the touch. This is
  what makes *adding* a drag gesture non-invasive for existing `Pressable`s.
- `begin()` / `end()` — rarely needed with Pan; `begin()` is implicit once touches arrive.

The state manager methods are worklet-safe and are expected to be called from the UI thread inside
the gesture's own worklet callbacks.

```ts
const pan = Gesture.Pan()
  .manualActivation(true)
  .onTouchesDown((event, state) => {
    'worklet'
    if (nothingDraggableHere(event.allTouches[0])) {
      state.fail() // RN touch is untouched -> Pressable.onPress still fires
    }
  })
  .onTouchesMove((event, state) => {
    'worklet'
    if (travelledFarEnough(event)) {
      state.activate()
    }
  })
```

**Known bug, already fixed in our version:** in 2.15.0 a *cancelled* touch (iPad palm rejection)
with `manualActivation` left every touchable in the app dead until the next gesture
(issue #2885). Fixed by PR #3007, long before 2.32.0.

## 2. Touch callbacks and `needsPointerData`

`onTouchesDown` / `onTouchesMove` / `onTouchesUp` / `onTouchesCancelled` all have the signature
`(event: GestureTouchEvent, stateManager: GestureStateManagerType) => void`. Calling any of these
setters **automatically sets `config.needsPointerData = true`**
(`lib/module/handlers/gestures/gesture.js`), so you never set that flag yourself.

```ts
type TouchData = {
  id: number
  x: number        // relative to the view the gesture is attached to
  y: number
  absoluteX: number // relative to the window
  absoluteY: number
}

type GestureTouchEvent = {
  handlerTag: number
  numberOfTouches: number
  state: State
  eventType: TouchEventType
  allTouches: TouchData[]
  changedTouches: TouchData[]
  pointerType: PointerType
}
```

`onTouchesDown` fires for **every** finger placed on the screen while the handler is tracking, so
with `.maxPointers(1)` still read `event.allTouches[0]` (or `changedTouches[0]`) rather than
assuming a single entry.

## 3. View-relative (`x`/`y`) vs window-absolute (`absoluteX`/`absoluteY`)

Both the pan payload (`PanGestureHandlerEventPayload`) and every `TouchData` carry both spaces.
From the package's own typings:

- `x` / `y`: "relative to the view attached to the handler".
- `absoluteX` / `absoluteY`: "relative to the window. It is recommended to use it instead of `x` in
  cases when the original view can be transformed as an effect of the gesture."

So: **attach the gesture to the view whose origin is your model's coordinate origin and `x`/`y`
need no conversion at all.** In Soli, the board shell (`KlondikeGameView`'s `boardShell` `YStack`)
and `AbsoluteCardLayer`'s `StyleSheet.absoluteFill` root share one origin, and that origin is the
one the layout registry (`onLayout` rects) is expressed in — so `event.x/y` is already card space
for either attach point. (An absolutely positioned child with `top: 0, left: 0` sits at its
parent's *padding box* origin; with no `borderWidth` that is the same origin `onLayout` reports
children against, so the two spaces coincide.)

Escape hatch when the attach point is *not* the coordinate origin: capture
`origin = { x: e.absoluteX - e.x, y: e.absoluteY - e.y }` once — the difference **is** the attached
view's window origin — and subtract it from later absolute coordinates. Reanimated's
`measure(useAnimatedRef())` (synchronous `pageX/pageY` inside a worklet) is the fallback of last
resort.

`translationX` / `translationY` on the pan payload are deltas accumulated since activation. Deltas
are frame-of-reference independent, so anything driven purely by translation needs no conversion in
any case.

## 4. `cancelsTouchesInView`

iOS only, defaults to **`true`** (`apple/RNGestureHandler.mm`: `_recognizer.cancelsTouchesInView = YES`).
When the handler becomes `ACTIVE`, UIKit cancels the touch for the native views underneath it, so an
RN `Pressable` under the finger will **not** fire `onPress`. That is exactly the behaviour we want
when a drag wins: tap and drag can never both fire for one touch.

Set it to `false` only when the gesture must coexist with the underlying touch (Soli's undo scrubber
does this so the Undo button keeps working). RNGH's internal `RNManualActivationRecognizer` sets
`cancelsTouchesInView = NO` on *itself* (`apple/RNManualActivationRecognizer.m`); this does not
change the behaviour of your own handler's flag.

## 5. Ancestor attachment and `pointerEvents` — the platform difference that matters

A gesture attached to an **ancestor** of the touched view still receives the touch, but the two
platforms decide that differently:

- **iOS**: `UIView.hitTest` picks a leaf view, then UIKit delivers the touch to gesture recognizers
  attached anywhere on that view's **superview chain**. `pointerEvents="box-none"` only affects the
  view's own `hitTest` result, not recognizer delivery, so a recognizer on a `box-none` ancestor
  gets the touch.
- **Android**: RNGH's own orchestrator walks the view tree and *collects* handlers per pointer,
  consulting `pointerEvents` as it goes
  (`android/src/main/java/com/swmansion/gesturehandler/core/GestureHandlerOrchestrator.kt`,
  `traverseWithPointerEvents`):

  | `pointerEvents` | Handlers on that view are collected? |
  |---|---|
  | `auto` | **Always** (`recordViewHandlersForPointer(view, …) \|\| found \|\| …`) |
  | `box-only` | Always; children are not traversed |
  | `box-none` | **Only if a descendant became a touch target** (`extractGestureHandlers(view, …).also { found -> if (found) recordViewHandlersForPointer(view, …) }`) |
  | `none` | Never |

  A descendant "becomes a touch target" if it has its own handler, or if
  `shouldHandlerlessViewBecomeTouchTarget` returns true — which requires the view to be a **leaf or
  to have a background drawable** (`view !is ViewGroup || view.getBackground() != null`). A
  childless, background-less `View`/`Pressable` therefore does **not** qualify on Android.

  Practical consequence: **do not attach a gesture to a `pointerEvents="box-none"` view on Android
  if some of the touches you care about land on transparent, background-less children or on children
  with `pointerEvents="none"`.** Attach to a `pointerEvents="auto"` ancestor instead and hit-test in
  `onTouchesDown` yourself.

## 6. `GestureDetector` and `collapsable`

`GestureDetector` accepts exactly one child and attaches to the first native view in that child's
subtree. Its internal `Wrap` component clones the child adding `collapsable: false`
(`lib/module/handlers/gestures/GestureDetector/Wrap.js`):

```js
// The only thing it does is add 'collapsable: false' to the child component
// to make sure it is in the native view hierarchy so the detector can find
// correct viewTag to attach to.
return React.cloneElement(child, { collapsable: false }, child.props.children)
```

Consequences worth planning for:

- The wrapped view is **no longer flattened by Fabric**. If the surrounding layout relied on that
  view being flattened (for example because flattening hoisted its children into the grandparent's
  `zIndex` sort), the stacking outcome changes. Re-check any `zIndex` reasoning around the attach
  point.
- More than one child throws: *"GestureDetector got more than one view as a child."*
- `collapsable` is only auto-applied to the **direct** child. Intermediate wrapper components in a
  nested tree need `collapsable={false}` set by hand.
- The view tag is resolved with `findNodeHandle(state.viewRef)` where `viewRef` is the `Wrap`
  instance, so the child does not need to forward a `ref` — a component that renders a host view
  (tamagui `YStack`, etc.) works.

## 7. Gesture object identity

`GestureDetector` re-attaches native handlers when the gesture object changes in ways that require
it (`needsToReattach.js`). Rebuilding the `Gesture.Pan()` object on every render therefore churns
native recognizers. Always `useMemo` the gesture on stable dependencies — shared values and
ref-backed callbacks only — exactly as `useUndoScrubber.ts` does.

## 8. Composition (why Soli's card drag does not use `Gesture.Exclusive`)

`Gesture.Race` / `Simultaneous` / `Exclusive` compose gestures that are attached to **the same**
`GestureDetector`. They are the right tool when one view owns both gestures (Soli's undo scrubber:
`Exclusive(pan, tap)` on the Undo pill).

They are the wrong tool when the tap already has an owner elsewhere in the tree — e.g. per-card RN
`Pressable`s. There, `manualActivation` + `state.fail()` is strictly better: touches you do not
claim are never disturbed, so the existing press path keeps its exact behaviour.

Cross-component relations (`simultaneousWithExternalGesture`, `requireExternalGestureToFail`,
`blocksExternalGesture`) exist for gestures on different detectors, but they require passing gesture
refs around; for mutually exclusive gestures on **disjoint** subtrees a plain shared-value guard
(`if (otherGestureActive.value > 0) return`) is simpler and has no attachment cost.

## 9. Config used by Soli's card drag

```ts
Gesture.Pan()
  .manualActivation(true)     // we decide activation -> taps on non-draggables untouched
  .maxPointers(1)             // a second finger cannot start a second drag
  .shouldCancelWhenOutside(false) // dragging past the board edge must not cancel
  // .cancelsTouchesInView stays at its default `true`: when we activate, the card's
  // Pressable must NOT also fire onPress.
  .onTouchesDown(...)  // hit-test; state.fail() when nothing draggable is under the finger
  .onTouchesMove(...)  // travel >= 8 px -> state.activate()
  .onStart(...) .onUpdate(...) .onEnd(...) .onFinalize(...)
```

`onEnd` fires only if the gesture activated; `onFinalize` fires in every terminal case (including
failure and cancellation). Route both to the same cleanup behind a single-fire shared-value guard.
