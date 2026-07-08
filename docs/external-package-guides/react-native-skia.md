# @shopify/react-native-skia Guide

Last refreshed: 2026-07-08 (atlas color semantics + applyUpdates cost model, from the v2.6.2 native source)

## Scope

- Package: `@shopify/react-native-skia`
- This is the canonical Soli guide for this package.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.
- Primary use case in Soli: the win-celebration Atlas renderer (one GPU draw call for 52 cards + trail ghosts). See `docs/product/celebration-skia-atlas/celebration-skia-atlas.md`.

## Sources

- Retrieved 2026-07-07 from the official docs and the v2.6.2 source tree:
  - https://shopify.github.io/react-native-skia/docs/getting-started/installation
  - https://shopify.github.io/react-native-skia/docs/shapes/atlas/
  - https://shopify.github.io/react-native-skia/docs/animations/textures/
  - https://shopify.github.io/react-native-skia/docs/canvas/overview
  - https://shopify.github.io/react-native-skia/docs/text/text
  - https://shopify.github.io/react-native-skia/docs/snapshotviews
  - https://shopify.github.io/react-native-skia/docs/paint/properties (blend mode list)
  - https://docs.expo.dev/versions/latest/sdk/skia/
  - Source verified at tag `v2.6.2`: `packages/skia/src/dom/types/Drawings.ts` (AtlasProps), `packages/skia/src/external/reanimated/buffers.ts` (useRSXformBuffer etc.), `packages/skia/src/external/reanimated/textures.tsx` (useTexture), `packages/skia/src/renderer/Offscreen.tsx` (drawAsImage), `packages/skia/src/skia/web/JsiSkia.ts` (RSXformFromRadians formula), `packages/skia/src/views/types.ts` (Canvas props)
  - GitHub issues: #3726 (colorBlendMode prop, landed before 2.6.x), #2528 (Atlas per-sprite opacity + premultiplied colors)

## Installation (Soli: Expo SDK 57 / RN 0.86 / new architecture)

- **Exact version: `2.6.2`** — this is what Expo SDK 57 pins (verified in our local `node_modules/expo/bundledNativeModules.json`; expo-doctor warns on any other version). Do NOT install `latest` (2.6.9); stay on the SDK-pinned version.
- Install command (Yarn 4.12 project, use the expo wrapper so the pinned version is picked):

```bash
npx expo install @shopify/react-native-skia
```

- Compatibility check against our stack (all satisfied):
  - peer deps: `react >= 19` (we: 19.2.3), `react-native >= 0.78` (we: 0.86.0), `react-native-reanimated >= 3.19.1` (we: 4.5.0). Works with `react-native-worklets` 0.10 (Reanimated 4 stack); the buffer hooks import `WorkletFunction` from `react-native-worklets` directly.
  - New architecture: supported and required-compatible (RN 0.86 is new-arch-only).
  - iOS 14+ / Android API 21+ (we exceed both).
- Prebuilt Skia binaries come as transitive npm deps (`react-native-skia-android`, `react-native-skia-apple-*`); no postinstall scripts, so nothing to configure for Yarn Berry (`enableScripts` untouched).
- **Native module ⇒ full native rebuild required.** No config plugin, so `expo prebuild` is not strictly needed (Expo autolinking resolves it at build time), but the native project must be rebuilt:
  - Android: `yarn release` (script errors if `android/` is missing → run `yarn prebuild:android` first in that case). Needs the Android NDK + CMake (already working on this machine — the app builds today; Skia adds a CMake step).
  - iOS simulator: `yarn ios` (the wrapped `expo run:ios` runs CocoaPods automatically on dependency changes).
- App size cost: ~4 MB Android, ~6 MB iOS.
- Web: irrelevant for Soli (native-only), but for reference the web target needs CanvasKit/WASM setup (`docs/getting-started/web`). One line, done.

## `<Canvas>` basics

```tsx
import { Canvas } from "@shopify/react-native-skia";

<Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
  {/* drawing */}
</Canvas>
```

- `Canvas` is a regular RN view: `style`, `pointerEvents`, etc. all work. Behind the scenes it uses its own React renderer — Skia children only (no RN views inside).
- **Transparent by default.** There is an `opaque?: boolean` prop (v2.6.2 `views/types.ts`) that drops the alpha channel for perf — do NOT set it for an overlay that must show the board through it.
- `androidWarmup` prop: draws the first frame on the Android compositor — for static, fully opaque drawings only; explicitly discouraged for animated/translucent canvases. Don't use it for the celebration overlay.
- Canvas units are **dp** (density-independent pixels), same as RN. Offscreen surfaces are raw pixels — see pixel density section.
- Sizing: fixed style sizes are simplest. `onSize` (shared value) exists if the canvas size must be known on the UI thread; we know board size already.
- Unmounting a `Canvas` releases its surface; textures held in shared values should be dropped (set to null / let the component unmount) so the GPU memory frees.

## The Atlas API

One draw call renders N sprites from one texture. Props (v2.6.2 `AtlasProps`):

| Prop | Type | Notes |
| ---- | ---- | ----- |
| `image` | `SkImage \| null` | The atlas texture. `null` renders nothing (safe while the texture loads). |
| `sprites` | `SkRect[]` | Source rect per sprite, in texture pixel coordinates. |
| `transforms` | `SkRSXform[]` | One per sprite. **Must be the same length as `sprites`.** |
| `colors?` | `SkColor[]` | Optional per-sprite color. If provided, must match length too. |
| `colorBlendMode?` | `BlendMode` | How each sprite's color combines with the texture. **Default `dstOver`.** |
| `blendMode?` | `BlendMode` | Layer compositing of the whole Atlas onto the canvas (normal paint blendMode). Independent of `colorBlendMode` since #3726. |
| `sampling?` | `Sampling` | Image sampling options. |

- **Draw order = array order.** Sprite i+1 draws on top of sprite i. That replaces zIndex: order the arrays as [ghost … ghost, card] per card, cards in slot order.
- Sprites can all reference the same texture rect or different rects — an atlas of 52 card faces uses 52 distinct `rect(...)`s and each sprite points at its card's rect.

```tsx
import { Atlas, Canvas, rect, Skia } from "@shopify/react-native-skia";

<Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
  {/* modulate + UNpremultiplied (1,1,1,a) colors — see "Per-sprite opacity" below */}
  <Atlas image={texture} sprites={sprites} transforms={transforms}
         colors={colors} colorBlendMode="modulate" />
</Canvas>
```

### RSXform semantics

`Skia.RSXform(scos, ssin, tx, ty)` is the compressed matrix `[scos -ssin tx; ssin scos ty; 0 0 1]`. It maps sprite-local point `(x, y)` to:

```
x' = scos·x − ssin·y + tx
y' = ssin·x + scos·y + ty
```

- `scos = scale·cos(r)`, `ssin = scale·sin(r)` — rotation+scale are one pair; **the anchor is the sprite's top-left `(0,0)`**, which lands exactly at `(tx, ty)`.
- Identity: `Skia.RSXform(1, 0, 0, 0)`. Scale 2 + translate: `Skia.RSXform(2, 0, 50, 100)`.
- **Rotating around the sprite CENTER** (what card animations need — our math returns rotation about card center): compute where the center should land and back out `(tx, ty)`. For sprite pixel size `(w, h)`, desired on-canvas center `(cx, cy)`, rotation `r`, scale `s`:

```ts
"worklet";
const scos = s * Math.cos(r);
const ssin = s * Math.sin(r);
const tx = cx - (scos * (w / 2) - ssin * (h / 2));
const ty = cy - (ssin * (w / 2) + scos * (h / 2));
xform.set(scos, ssin, tx, ty);
```

- Equivalent helper (JS thread, allocates a new object — not for per-frame worklets): `Skia.RSXformFromRadians(scale, r, tx, ty, px, py)`. Verified in the v2.6.2 source: it produces `(c, s, tx − c·px + s·py, ty − s·px − c·py)`, i.e. the pivot `(px, py)` in sprite-local coords lands exactly at `(tx, ty)`. So center rotation = `RSXformFromRadians(s, r, cx, cy, w/2, h/2)`. In `useRSXformBuffer` worklets use the inline `set(...)` formula above instead.

### Animating with Reanimated (buffer hooks)

`useRSXformBuffer` / `useRectBuffer` / `useColorBuffer` / `usePointBuffer` (from the package root) create a shared-value array of size N and re-run a mutating worklet **on the UI thread whenever any captured shared value changes** (implemented with `startMapper` over the modifier's closure — verified in v2.6.2 `buffers.ts`). No `useFrameCallback` needed: a `withTiming`-driven progress shared value re-triggers the mapper every frame by itself.

```tsx
import { useRSXformBuffer, useColorBuffer } from "@shopify/react-native-skia";

const transforms = useRSXformBuffer(spriteCount, (val, i) => {
  "worklet";
  // progress.value is captured → this re-runs every animation frame, UI thread.
  const frame = computeFrame(i, progress.value);
  val.set(scos, ssin, tx, ty); // mutate in place, no allocation
});

const colors = useColorBuffer(spriteCount, (val, i) => {
  "worklet";
  // SkColor is a Float32Array [r, g, b, a] in 0..1. Mutate components in place.
  val[0] = 1; val[1] = 1; val[2] = 1;
  val[3] = alphaForSprite(i, progress.value);
});
```

- The buffer is keyed on `size` — changing N remounts the buffer (fine when it happens on state changes, not per frame).
- Buffers initialize to identity RSXform / black color; make the modifier always write every field.
- Pitfall: the mapper deps are the worklet's captured closure values. Values read via plain JS variables are captured once (constants are fine); only shared values re-trigger.
- **Cost model pitfall (verified in source 2026-07-08): buffer SIZE prices EVERY canvas tick, not just your mapper.** The `Canvas` container registers ONE mapper over ALL shared-value props (`src/sksg/Container.native.ts`); its worklet calls `recorder.applyUpdates(sharedValues)` (`cpp/api/recorder/JsiRecorder.h`), which re-runs the stored JSI→`std::vector` conversion for EVERY registered variable — no per-variable dirty tracking. A 5k-element RSXform buffer therefore costs ~5k JSI host-object unwraps on every tick in which ANY shared value changed, even if that buffer didn't. Gating your own buffer mapper (e.g. via an epoch shared value) does NOT avoid this. For large, rarely-changing sprite sets, accumulate them onto an offscreen `Skia.Surface` instead and pass a snapshot `SkImage` (an O(1) prop) — see the Cascade Imprint layer in `CelebrationOverlayLayer.tsx`.

### Per-sprite opacity / fades (colors + colorBlendMode)

CORRECTED AGAIN 2026-07-08 from the 2.6.2 NATIVE source, after `(o,o,o,o)` rendered dark gray ghosts on device. **DEVICE-CONFIRMED 2026-07-08 (A065, Android release): `(1,1,1,o)` + `modulate` is the correct convention** — trail ghosts/depth fades render as translucent white with the background showing through. Full chain, verified in code AND on device:

1. JS color buffers are `Float32Array [r, g, b, a]` in 0..1 (`useColorBuffer`).
2. The native recorder converts EVERY color — both at record time and on every shared-value update via `applyUpdates` — with `SkColorSetARGB(a·255, r·255, g·255, b·255)` (`cpp/api/recorder/Convertor.h`), producing an `SkColor`.
3. `SkColor` is **UNPREMULTIPLIED** by definition (`SkColor.h`: "32-bit ARGB color value, unpremultiplied"), and `SkCanvas::drawAtlas` takes `SkSpan<const SkColor>` — Skia premultiplies internally before the per-sprite blend.

Consequences:

- **A pure opacity fade is `(1, 1, 1, o)`** with `colorBlendMode="modulate"`. Skia premultiplies it to (o,o,o,o) and modulate scales every texture channel by exactly o.
- Hand-premultiplying `(o, o, o, o)` double-premultiplies: Skia reads it as unpremul GRAY (RGB = o) at alpha o → premul (o², o², o², o) → sprites composite DARK (observed 2026-07-08: dark gray-green trail ghosts). This guide's previous advice (from issue #2528's discussion) was wrong for this pipeline.
- `colorBlendMode="dstIn"` is also wrong (2026-07-07 finding stands): in `drawAtlas` the TEXTURE is the blend SOURCE and the per-sprite color the DESTINATION, so dstIn renders the color's RGB gated by texture alpha → solid silhouettes.
- The default `colorBlendMode` is `dstOver` — not usable for fades either; always set `modulate` explicitly when passing a colors buffer.
- `colorBlendMode` exists as a separate prop in 2.6.2 (verified in the tag's `AtlasProps`); the older docs' single `blendMode` ambiguity (issue #3726) is resolved.

## Creating the atlas texture

Four options, all returning/holding an `SkImage`:

### 1. `useTexture(element, size)` — offscreen surface from declarative drawing (recommended)

```tsx
import { useTexture, Group, RoundedRect, Text } from "@shopify/react-native-skia";

const texture = useTexture(
  <Group>
    <RoundedRect x={0} y={0} width={w} height={h} r={radius} color="white" />
    <Text x={4} y={18} text="A" font={rankFont} color="#c92a2a" />
    {/* ... 52 card faces laid out in a grid ... */}
  </Group>,
  { width: atlasW, height: atlasH }
);
// texture is a SharedValue<SkImage | null> — pass texture directly as <Atlas image={texture} ...>
```

- Renders the element to a picture on the JS thread (async), then rasterizes to a GPU texture **on the UI thread** via `Skia.Surface.MakeOffscreen` — no CPU→GPU copy.
- Returns a `SharedValue<SkImage | null>`; Atlas accepts it directly and draws nothing until ready.
- **The surface size is in raw pixels and the drawing is NOT density-scaled** (verified in v2.6.2 `textures.tsx`) — see pixel density below.
- Optional third arg `deps?: DependencyList` re-creates the texture when deps change.

### 2. `drawAsImage(element, size)` — same idea, promise-based

```tsx
import { drawAsImage } from "@shopify/react-native-skia";
const image = await drawAsImage(<Group>…</Group>, { width, height });
```

Returns `Promise<SkImage | null>`; the result is a **non-texture** (CPU-backed) image — fine for Atlas, but `useTexture` is preferred with Reanimated (GPU-resident).

### 3. `Skia.Surface.MakeOffscreen` + canvas drawing in a worklet — imperative

```tsx
import { runOnUI } from "react-native-reanimated";

runOnUI(() => {
  "worklet";
  const surface = Skia.Surface.MakeOffscreen(w, h)!;
  const canvas = surface.getCanvas();
  canvas.drawRRect(rrect, paint);
  canvas.drawText("A", x, y, paint, font); // font: Skia.Font(typeface, size)
  surface.flush();
  imageSharedValue.value = surface.makeImageSnapshot();
})();
```

Full imperative control (this is what `useTexture` does under the hood). Useful if the atlas must be built inside a worklet or with per-cell canvas transforms (e.g. `canvas.scale(pd, pd)` for density).

### 4. `makeImageFromView(ref)` — snapshot an RN view

```tsx
import { makeImageFromView } from "@shopify/react-native-skia";
const snapshot = await makeImageFromView(viewRef); // Promise<SkImage | null>
```

- Snapshot is taken at **native pixel resolution** (the docs example draws it back at `image.width() / PixelRatio.get()`).
- The snapshotted root view must have `collapsable={false}` or RN may optimize it away → crash/wrong result.
- Async, JS thread, needs the views mounted and laid out — adds latency and sequencing at celebration start.

## Text in Skia (card rank/suit glyphs)

Our `CardVisual` renders rank + suit as text in the custom embedded `CardTextAndroid` font family (`assets/fonts/CardTextAndroid{,-SemiBold,-Bold}.ttf`, registered natively — see `docs/product/generated-native-card-fonts/`). Skia does NOT see natively registered RN fonts automatically; load the same `.ttf` assets into Skia explicitly:

```tsx
import { useFont } from "@shopify/react-native-skia";
// Simplest: one font object per size actually drawn.
const rankFont = useFont(require("../../assets/fonts/CardTextAndroid-Bold.ttf"), rankFontSize);
const suitFont = useFont(require("../../assets/fonts/CardTextAndroid-SemiBold.ttf"), suitFontSize);
// returns SkFont | null while loading
```

- Declarative: `<Text x={..} y={..} text="A" font={rankFont} color="#111827" />`. **`y` is the text BASELINE (bottom), not the top.** Use `font.measureText(...)`/`font.getMetrics()` for centering.
- `useFonts` + `matchFont({ fontFamily, fontWeight, fontSize })` is the multi-weight alternative; `Skia.FontMgr.System()` matches system fonts (avoid — device-dependent, the exact problem the embedded fonts solve).
- Imperative: `Skia.Typeface.MakeFreeTypeFaceFromData(data)` + `Skia.Font(typeface, size)`.
- The suit symbols (♣♦♥♠) are regular glyphs in that font (`SUIT_SYMBOLS` in `src/features/klondike/constants.ts`), so `<Text text="♥" font={suitFont} />` reproduces card faces faithfully. Alternative: draw suits as `Path`s — unnecessary here since the glyph font ships with the app.
- Rounded rects: `<RoundedRect x y width height r color />` (+ a second stroked one for the border, like the Atlas hello-world does with two `Rect`s).

## Pixel density (atlas sharpness)

- On-screen `Canvas` units are dp; offscreen surfaces (`useTexture`, `drawAsImage`, `MakeOffscreen`) are raw pixels with NO automatic density scaling.
- For a crisp atlas: rasterize each card cell at `dp × PixelRatio.get()` pixels (scale all coordinates/font sizes in the drawing by `pd`, or wrap in `<Group transform={[{ scale: pd }]}>`), and compensate in the RSXform: `scale = desiredScale / pd` (the sprite rect is `pd`× larger than the dp size it is drawn at).
- `makeImageFromView` already snapshots at native resolution — same `1/pd` compensation applies.
- Texture size sanity: 52 cards at ~60×84 dp × 3 (pd) ≈ 180×252 px per cell → a 13×4 grid ≈ 2340×1008 px. Well under common GPU texture limits (4096+), but keep the grid roughly square-ish and don't rasterize at more than the device's actual pd.

## Performance notes (from docs)

- Atlas is explicitly designed for "a very large number of similar objects" — sprite count is nearly free; the win is one draw call + no RN view/Fabric involvement per sprite.
- "Atlas transforms can be animated with near-zero cost using worklets… its design is particularly useful when combined with Reanimated."
- `useTexture` keeps the texture GPU-resident (no copies).
- The whole per-frame path (buffer mapper worklets → canvas redraw) runs on the UI thread; the JS thread is idle during the animation.

## Known pitfalls

- `sprites`, `transforms` (and `colors` if given) must have equal lengths — mismatch is undefined/render bugs.
- RSXform anchors at sprite top-left; center rotation needs the conversion formula above.
- Atlas sprite-color blend: texture = SOURCE, color = DESTINATION (device-verified). `dstIn` produces solid color silhouettes; colors are UNPREMULTIPLIED `SkColor`s — use `modulate` with `(1,1,1,o)` for opacity fades, NOT premultiplied `(o,o,o,o)` (renders dark gray-black; device-confirmed 2026-07-08, see "Per-sprite opacity").
- Default `colorBlendMode` is `dstOver` — always set it explicitly when using `colors`.
- `useTexture`'s size is raw pixels; forgetting `PixelRatio` gives a blurry atlas.
- `Text` `y` is the baseline, not the top.
- `makeImageFromView` needs `collapsable={false}` on the snapshot root.
- Jest: only needed if a TESTED module imports skia. Then: add `@shopify/react-native-skia` to `transformIgnorePatterns`, set `testEnvironment: "@shopify/react-native-skia/jestEnv.js"` and `setupFilesAfterEnv: ["@shopify/react-native-skia/jestSetup.js"]` (loads CanvasKit-backed mocks). Keep skia imports out of pure-logic modules (e.g. `celebrationModes.ts`) so existing unit tests need no mock.
- Graphite backend is experimental (`@next` channel) — do not use; the default Ganesh backend is what 2.6.2 ships.
