# Celebration Skia Atlas Renderer

## User prompt

> lets try skia, yes. subagents again @AGENTS.md

(In response to the assistant proposing the Skia Atlas rewrite after the user asked "is there a completely different approach we could take? think wide and creative. also phone gets warm" — full proposal in `docs/product/celebration-smoothness/celebration-smoothness.md`, section "Architecture proposal (2026-07-07…): Skia Atlas celebration renderer", status APPROVED.)

## Summary

Implementation steps 0–7 COMPLETE (2026-07-08): skia 2.6.2 installed, `CelebrationOverlayLayer` internals fully rewritten to a single Skia `<Canvas>` + `<Atlas>` (52 card faces rasterized once into a pd-scaled texture atlas, one `useRSXformBuffer` worklet driving all sprites — cards + trail ghosts — from the existing `computeCelebrationFrame` math moved verbatim, per-sprite alpha via `useColorBuffer`). iOS simulator smoke test (step 6) found ONE blocking defect: `colorBlendMode="dstIn"` rendered all cards as pure white silhouettes (in `drawAtlas` the texture is the blend SOURCE and the per-sprite color the destination — opposite of the package guide's assumption). Fixed by switching to `colorBlendMode="modulate"` with premultiplied `(a,a,a,a)` colors. After the fix: all 33 modes render faithfully (rank/suit/center glyphs, colors, borders, crisp at pd), trails on 31/32 visible, abort instant, start instant with no blank-card flash, dev-hold loop runs past 60 s seamlessly, real autosolve win → celebration → new-game dialog flow verified. No further fidelity calibration needed (step 7 satisfied by the blend fix — text baseline math was correct on first try). Cheap gates green. Step 8 (A065 Android perf, 2026-07-08) DONE: **all measured modes run at the device's full 120 Hz refresh rate (~122 fps)** — vs the old renderer's 45–51 fps ceiling and Meteor Shower's 32 fps; GPU 90th percentile 5 ms everywhere (was 4,950 ms stalls on trail modes in the pre-fix Story-5 runs), start instant, fidelity/trails/abort all pass on Android. ALL STEPS COMPLETE — acceptance criteria met and exceeded.

## Description

Win celebrations animate the 52 foundation cards along one of 33 procedural paths for 60 s. The current renderer mounts one Reanimated `Animated.View` + `CardVisual` tree per card (plus per-card ghost views on trail modes — up to 208 views ≈ 1,500–2,000 native views), each pushing a Fabric props update every frame. Measured on the budget A065 phone (Story 5): ~45–50 fps ceiling even for plain modes, 25 fps and GPU stalls on trail modes, slow celebration start (mount storm), and the phone gets warm.

This story rewrites the RENDERING layer only, using `@shopify/react-native-skia`'s Atlas API: the card faces are rasterized ONCE into a texture; every frame, one worklet writes position/rotation/scale into an `RSXform` buffer and alpha into a color buffer; Skia draws all sprites in ONE GPU draw call. No views to mount, no per-view Fabric updates, JS thread idle. `computeCelebrationFrame` (already a pure worklet with zero React/Skia imports) is reused verbatim.

Why this is important: celebrations are the emotional payoff of winning; they currently jank and heat up exactly the devices we care about (budget Androids). The Atlas architecture removes the per-view cost class entirely instead of shaving it, and unlocks follow-ups (true Windows-cascade imprints, generous trails, particles) that are impossible in the view architecture.

## Acceptance Criteria

- All 33 modes (ids 0–32) render via the Skia Atlas with visual parity: same paths, launch ease from the foundation piles, wobble, per-mode scale/opacity, trail ghosts on modes 31/32 (current trail configs), end fade over the last ~2 s, instant hide on abort.
- Cards look crisp (atlas rasterized at device pixel ratio) and faithful: white rounded rect + border, corner rank, corner suit, center suit in the `CardTextAndroid` fonts with the exact suit colors.
- Celebration start has no mount storm: start latency subjectively instant; no multi-second slow start on modes 31/32.
- Perf on the A065 (gfxinfo recipe from celebration-smoothness.md, Story 5): clearly above the Story-5 baseline — target ≥ old-mode baseline (~45–50 fps) on ALL modes including Meteor Shower 32 (was 32 fps) with GPU 90th percentile in single-digit ms (no 4950 ms stalls).
- Dev badge cycling, `soli://?celebration=<id|random>` preview, dev-hold, abort-on-tap, and the new-game dialog flow all behave exactly as today (controller untouched).
- `yarn typecheck && yarn lint && yarn jest` green; `test/unit/animation/celebrationModes.test.ts` passes UNMODIFIED (math untouched, no skia import in `celebrationModes.ts`).

## Possible approaches

### Rendering architecture (decided: Skia Atlas)

Chosen in the parent story after measurement; alternatives (pre-rasterized RN Images, frame-rate cap, adaptive ghosts, Lottie, expo-gl) were considered and rejected there — see the Architecture proposal section in `celebration-smoothness.md`.

### Design decision 1 — atlas texture creation for the 52 card faces

- **(a) Draw simplified card faces directly in Skia (RECOMMENDED)**: one `useTexture(<Group>…52 cells…</Group>, atlasSize)` with `RoundedRect` (fill + stroked border) and three `Text` elements per cell using the app's own `CardTextAndroid` `.ttf` assets via `useFont` (same glyphs — ♣♦♥♠ are regular glyphs in that font; `SUIT_SYMBOLS`/`SUIT_COLORS` from constants).
  - Pros: deterministic, no view mounting/snapshot sequencing at celebration start (the exact mount storm we're removing), texture built in ~1 frame, testable, ~80 LOC.
  - Cons: must transcribe `CardVisual`'s layout numbers (corner rank/suit offsets, center symbol size — all constants in `CardVisual.tsx`); the RN shadow (`shadowRadius: 6`, opacity 0.2) is dropped — invisible on fast-moving cards, and bakeable later as a Skia shadow if missed. Skia's `Text` y is baseline-based, so vertical placement needs one calibration pass against a screenshot.
- (b) Snapshot existing `CardVisual`s with `makeImageFromView` at celebration start: mount 52 hidden CardVisuals (or one grid view), wait for layout, await async snapshot(s).
  - Pros: pixel-perfect fidelity for free, tracks future CardVisual changes automatically.
  - Cons: reintroduces a mount burst + async latency exactly at celebration start; `collapsable={false}` and layout-timing footguns; snapshot failure fallback needed. Rejected for initial scope.
- Recommendation: **(a)**. Fidelity risk is low (same fonts, same colors, simple geometry) and it keeps start instant.

### Design decision 2 — where the per-frame loop lives

One `useRSXformBuffer(spriteCount, modifier)` worklet (plus a parallel `useColorBuffer`) iterating all sprites; each sprite maps to (slot, ghostIndex) and calls `computeCelebrationFrame` with `progress - lag` — the exact math the current slot worklet runs, including launch blending with baseX/baseY, wobble, and end fade (those live in the overlay today, not in `celebrationModes.ts`, and move into the new worklet verbatim). Trail ghosts are extra sprites referencing the same atlas rect with lagged progress and lower alpha. Draw order: Atlas draws in array order (later = on top, verified in docs), so per slot emit [ghost k=count−1 … ghost k=0, card], slots ascending — this reproduces today's zIndex banding exactly. Buffer hooks re-run automatically on the UI thread whenever `progress.value` changes (startMapper over captured shared values) — no `useFrameCallback` needed. Recommendation: exactly this; no per-sprite React components of any kind.

### Design decision 3 — opacity/end-fade

Per-sprite `useColorBuffer` where only alpha matters: `alpha = clampedOpacity × (0.5 + 0.5·launchEased) × ghostOpacityMultiplier × endFade`, and `colorBlendMode="dstIn"` (r = d·sa: texture RGB untouched, multiplied by the color's alpha — verified in docs/source; the default `dstOver` is wrong for this, and `modulate` would need premultiplied colors). `bindings.active.value <= 0` → write alpha 0 (abort hides instantly, as today). Recommendation: `dstIn`.

### Design decision 4 — rotation anchor conversion

`computeCelebrationFrame` + wobble produce a top-left position `(translateX, translateY)` in dp for a `w×h` dp card, plus rotation (degrees, about the card center) and scale. RSXform anchors at the sprite's top-left. Conversion (sprite is `W×H` PIXELS in the atlas, `W = w·pd`):

```
r    = rotationDeg · π/180 · launchEased   (same launch gating as today)
s    = (1 + (targetScale − 1)·launchEased) / pd
scos = s·cos(r);  ssin = s·sin(r)
cx   = translateX + w/2;  cy = translateY + h/2      (desired center, dp)
tx   = cx − (scos·W/2 − ssin·H/2)
ty   = cy − (ssin·W/2 + scos·H/2)
val.set(scos, ssin, tx, ty)
```

(Equivalent to `Skia.RSXformFromRadians(s, r, cx, cy, W/2, H/2)`, but computed inline in the worklet — no allocation. Formula verified against the v2.6.2 source; see the package guide.)

### Design decision 5 — pixel density

Rasterize the atlas at `PixelRatio.get()` scale: cell size `w·pd × h·pd` px, all drawing coordinates/font sizes multiplied by `pd` (or a `<Group transform={[{scale: pd}]}>` wrapper), sprite rects in pixels, and the `1/pd` folded into the RSXform scale (decision 4). `useTexture` does NOT density-scale automatically (verified in source). Recommendation: do this from the start; a blurry first iteration wastes a device round-trip.

### Design decision 6 — migration/rollback

Replace `CelebrationOverlayLayer`'s internals entirely; keep its file name, export, and props (`celebrationState`, `celebrationBindings`, `cardMetrics`) so `KlondikeGameView` needs zero changes. No feature flag / dual renderer: prefer simplicity, the old renderer stays in git history, and a revert is one file. Recommendation: full replacement. (Drop the now-unneeded `CELEBRATION_OVERLAY_SLOT_COUNT` export if nothing else uses it — currently nothing does.)

### Design decision 7 — trails

Initial scope = current trail configs only (Cascade 31: 3×80 ms, Meteor 32: 2×75 ms). With Atlas, ghost cost is ~free (just more sprites), so re-enabling trails on Comet Halo (10) and Galaxy (27) and restoring richer Meteor settings is a FOLLOW-UP tuning story after perf is confirmed — overdraw on clustered modes is still a GPU cost even in Skia, so it must be measured, not assumed.

### Design decision 8 — celebration end

Same mounting contract as today: when `celebrationState` is null the layer renders null → the `<Canvas>` unmounts, releasing its surface; the texture shared value is owned by the mounted subtree and is dropped with it. End fade (last ~2 s) already brings alpha to 0 before the unmount frame. Verify no flash on unmount and no leak across repeated dev-hold loops (60 s runs restart without unmount — texture must NOT be rebuilt per loop; key it on `celebrationState.cards`, not on progress).

### Design decision 9 — Jest

`celebrationModes.ts` keeps ZERO skia imports (verified: it has none today; the rewrite adds none — all skia code lives in the new renderer). The unit test imports only `celebrationModes` → no skia jest mocks needed, test stays untouched. No other jest suite imports `CelebrationOverlayLayer`/`KlondikeGameView` (verified by grep). If a future test ever renders the overlay, use the documented jestEnv/jestSetup from the package guide.

## Open questions to the user

None blocking — recommendations above are being applied. Flagged for awareness:

1. **Card shadow**: the Skia-drawn faces drop the subtle RN shadow (decision 1a). Options: live without it (recommended — invisible in motion, fewer LOC) or bake a soft dark rounded-rect under each cell later. Flag after device screenshots if it reads as flat.
2. **Meteor Shower richness**: mode 32 was detuned (fixed tilt, 2 ghosts) for the view renderer. Restoring rotation/scale oscillation + more ghosts is listed as a follow-up; say the word if it should ride along in initial scope instead (cost: extra tuning/measure loop).

## Dependencies

- NEW: `@shopify/react-native-skia` **2.6.2** (the Expo SDK 57 pin — do not take 2.6.9). Install: `npx expo install @shopify/react-native-skia`. Native module → full native rebuild (`yarn ios` handles pods; Android needs `yarn release`, run `yarn prebuild:android` first only if `android/` is missing).
- Package guide (read FIRST): `docs/external-package-guides/react-native-skia.md` — Atlas/RSXform semantics, buffer hooks, blend mode, pixel density, fonts, pitfalls.
- Existing: `react-native-reanimated` 4.5.0 + `react-native-worklets` 0.10.1 (satisfies skia's peer deps; buffer hooks integrate with this stack).
- Fonts: `assets/fonts/CardTextAndroid-Bold.ttf` (rank) and `CardTextAndroid-SemiBold.ttf` (suits) loaded into Skia via `useFont` — same files the RN cards use (`docs/product/generated-native-card-fonts/`).

## UX/UI Considerations

- Visual parity is the bar: a player should not notice the renderer changed, except that it is smooth.
- Card faces: white rounded rect (`COLOR_CARD_FACE`), 1 dp border (`COLOR_CARD_BORDER`), corner rank top-left (Bold 16@scale), corner suit top-right (SemiBold 11@scale), center suit (SemiBold 28@scale), colors from `SUIT_COLORS`. Layout constants transcribed from `CardVisual.tsx` (`CARD_CORNER_RANK_TOP/LEFT`, `CARD_CORNER_SUIT_TOP/RIGHT`, `CARD_SYMBOL_FONT/MARGIN_TOP`, `deriveCardScale`).
- Canvas overlays the whole board (`StyleSheet.absoluteFill`), `pointerEvents="none"` (the separate `CelebrationTouchBlocker` keeps handling abort taps), transparent background (do NOT set the `opaque` prop).
- The debug badge and touch blocker render as RN siblings ABOVE the canvas in `KlondikeGameView` — unchanged.

## Components

- Rewrite internals of: `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (same export + props).
- New (inside that file or a sibling `celebrationAtlas.ts(x)` helper module if the file gets long): atlas element builder (52-cell grid drawing), sprite-index mapping (slot ↔ ghost), the RSXform/color worklets.
- Reused untouched: `computeCelebrationFrame` + `CELEBRATION_MODE_METADATA` (`src/animation/celebrationModes.ts`), `useCelebrationController`, `CelebrationTouchBlocker`, `CelebrationDebugBadge`, `KlondikeGameView` wiring, `CardVisual` (still used by the board; only the celebration overlay stops using it).

## How to fetch data, how to cache

N/A (no remote data). Texture caching: build the atlas texture once per celebration mount, keyed on card list + metrics + pd; NOT rebuilt on dev-hold loop restarts or badge mode cycles (sprite/transform buffers do re-key on mode because trail count changes sprite count — that's fine, it's a state change, not per-frame).

## Related tasks

- Parent story + all perf measurements/baselines: `docs/product/celebration-smoothness/celebration-smoothness.md` (Story 5 Android perf table = the comparison baseline; Architecture proposal section = the approved design).
- Card font provenance: `docs/product/generated-native-card-fonts/deterministic-card-fonts-everywhere.md`.
- Testing cookbook: `.agents/skills/soli-testing/SKILL.md` (`?celebration=` deep links, `#retry-N` dedupe gotcha, build commands).

## Simplification ideas

- One Atlas, one Canvas, two buffers (`useRSXformBuffer`, `useColorBuffer`) — no per-sprite React elements, no zIndex, no Fragment mapping.
- Full replacement, no dual-renderer switch (decision 6).
- Skip the card shadow initially (decision 1a note).
- Keep `CelebrationOverlayLayer`'s public interface identical so no other file changes for rendering.
- Drop the `CELEBRATION_OVERLAY_SLOT_COUNT` export (unused elsewhere).

## Steps to implement

- [x] 0. Read `docs/external-package-guides/react-native-skia.md` fully (implementation sub-agent). DONE 2026-07-07.
- [x] 1. Install: `npx expo install @shopify/react-native-skia` → verify `package.json` gets `2.6.2`; `yarn install` clean (no `enableScripts` concerns — no postinstall). DONE — package.json has `"@shopify/react-native-skia": "2.6.2"`, install clean (only pre-existing peer-dep warnings).
- [x] 2. Atlas texture builder: grid layout math (13×4 cells of `cardW·pd × cardH·pd` px), a `buildCardAtlasElement(cards, metrics, pd, fonts)` returning the `<Group>` of 52 cells (RoundedRect fill + stroke border + 3 Texts per cell, constants transcribed from `CardVisual.tsx`; baseline-correct text placement), and `spriteRectForCard(index)` returning the pixel `rect`. Fonts via `useFont(require('…CardTextAndroid-Bold.ttf'), size·pd)` etc. DONE — implemented inline in `CelebrationOverlayLayer.tsx` (`atlasElement` memo + `cellOrigin`, cells get a 1px gutter against sampling bleed; see learnings).
- [x] 3. Rewrite `CelebrationOverlayLayer` internals: derive `trail` from metadata (as today); `spriteCount = cards.length × (trailCount + 1)`; sprite i ↦ (slot = ⌊i/(count+1)⌋, ghostIndex) with per-slot order [oldest ghost … newest ghost, card]; `useTexture` for the atlas; `useRSXformBuffer` worklet = existing slot-worklet math verbatim (lagged progress per ghost, launch blend with baseX/baseY, wobble, anchor conversion + 1/pd from decision 4; `active <= 0` → park alpha at 0); `useColorBuffer` alpha per decision 3; render `<Canvas style={absoluteFill} pointerEvents="none"><Atlas image={texture} sprites={…} transforms={…} colors={…} colorBlendMode="dstIn"/></Canvas>`; return null when `celebrationState` is null. Leave inline comments for: draw-order-replaces-zIndex, dstIn choice, pd scaling, texture keying (decision 8). DONE — outer component does the null check; all skia hooks live in an inner `CelebrationAtlas` so nothing runs while idle (see learnings).
- [x] 4. Remove now-dead code: `CardVisual` import in the layer, `CELEBRATION_OVERLAY_SLOT_COUNT`, ghost-View mapping. Verify `KlondikeGameView` compiles unchanged. DONE — grep confirms no remaining references to `CELEBRATION_OVERLAY_SLOT_COUNT`; `KlondikeGameView.tsx` untouched and compiles.
- [x] 5. Cheap gates: `yarn typecheck && yarn lint && yarn jest` — the celebration continuity suite must pass UNMODIFIED (decision 9). DONE — all green (28 suites / 275 tests; `celebrationModes.test.ts` 33 tests pass, file unmodified).
- [x] 6. iOS simulator smoke test (testing sub-agent; read `.agents/skills/soli-testing/SKILL.md` first): `yarn ios`, `soli:///?celebration=0#retry-N` preview, badge-cycle through all 33 modes, screenshot each; check card fidelity (rank/suit glyph placement + colors vs a board card), trails visible on 31/32, end-fade/abort behavior, no crash, celebration start feels instant. DONE 2026-07-08 — first build showed blank white cards (dstIn blend bug, see learnings); after the modulate fix all 33 modes pass. Screenshots in `.test-artifacts/celebration-skia-atlas-ios/`.
- [x] 7. Fidelity calibration pass from step-6 screenshots (text baselines, border width, corner offsets) — iterate until faces match `CardVisual` closely. DONE 2026-07-08 — no layout calibration was needed: rank/corner-suit/center-suit placement, border, radius, and colors matched the RN `CardVisual` faces on the first correct render (the advance/baseline math from step 2 was right). The only edit was the blend-mode fix.
- [x] 8. Android release perf test on the A065 (testing sub-agent, same recipe as Story 5 in `celebration-smoothness.md`: `yarn release`, `soli://?celebration=<id>#retry-N`, `dumpsys gfxinfo ch.karimattia.soli reset` → 10 s → dump, compare frames-per-10 s): measure at least Wave Loop 7, Vortex 22, Classic Cascade 31, Meteor Shower 32, Galaxy 27, Comet Halo 10 against the Story-5 table (50/45/51/32/44/43 fps); check GPU 50th/90th percentiles (no stalls) and phone warmth subjectively. DONE 2026-07-08 — ALL six modes render at ~122 fps (the A065's full 120 Hz refresh ceiling), GPU 90th percentile 5 ms across the board, modern janky counter 0–0.33%. Full table in Testing below.
- [x] 9. Update this plan (Files actually modified, learnings, testing results); report numbers vs baseline in the final summary. DONE 2026-07-08 (testing-results part; final summary reported by the perf sub-agent).

## Plan: Files to modify

- `package.json` / `yarn.lock` (new dependency)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (full internal rewrite; possibly a sibling helper module for the atlas builder)
- No changes: `celebrationModes.ts`, `useCelebrationController.ts`, `KlondikeGameView.tsx`, `CardVisual.tsx`, unit tests

## Files actually modified

- `package.json` / `yarn.lock` — added `@shopify/react-native-skia: 2.6.2` (Expo SDK 57 pin, via `npx expo install`).
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — full internal rewrite (same export + props; KlondikeGameView untouched). Atlas builder stayed inline in this file (no sibling helper module) — the whole file is ~430 lines, splitting it wasn't worth it.
- Nothing else. Protected files verified untouched via `git diff HEAD`: `celebrationModes.ts`, `useCelebrationController.ts`, `KlondikeGameView.tsx`, `CardVisual.tsx`, `test/unit/animation/celebrationModes.test.ts`.

## Intermediary learnings

- **Null-state hook ordering**: the outer `CelebrationOverlayLayer` returns null before any Skia hook runs; all hooks (`useFont`, `useTexture`, buffers) live in an inner `CelebrationAtlas` component that only mounts while a celebration is active. This both satisfies the rules of hooks (early return) and guarantees zero Skia work while idle — decision 8's unmount contract falls out for free.
- **Atlas cell gutter**: added a 1 px gutter between atlas cells. Linear sampling on rotated/scaled sprites can bleed a neighbor cell's edge pixels into a card's transparent rounded corners; the gutter costs nothing and prevents it.
- **Text placement is advance/baseline math, not measureText**: RN `Text` positions by glyph advance width and box top; Skia's `Text` y is the BASELINE and `measureText()` returns ink bounds. So horizontal centering/right-alignment sums glyph advances (`getGlyphWidths(getGlyphIDs(...))`) and vertical placement uses `top − metrics.ascent` (ascent is negative). Center suit reproduces CardVisual's flexbox result: glyph box (height ≈ descent − ascent) centered in the content box, shifted down by marginTop/2.
- **Border inset**: RN draws borders inside the box; Skia strokes centered on the path — the stroked RoundedRect is inset by half the stroke width to match.
- **Fonts load async**: `useFont` returns null until the ttf is decoded; the atlas element skips the Text nodes while null and the texture deps include the fonts, so it rebuilds once (~1 frame) when they arrive. Not observable in practice — worst case the very first celebration frame shows blank white cards for an instant.
- **Buffer mapper re-keying**: `useRSXformBuffer`'s mapper deps are the worklet's captured closure values (verified in v2.6.2 `buffers.ts`), so a new `assignments` array / trail config re-registers the mapper correctly; only shared values (`progress`) re-trigger per frame.
- **Inactive sprites**: `val.set(0, 0, 0, 0)` is a degenerate (zero-scale) RSXform — draws nothing — used alongside alpha 0 for the `active <= 0` / no-frame cases.
- Planning-time (2026-07-07): Expo SDK 57 pins skia **2.6.2**; `colorBlendMode` prop exists there (verified in the tag source). `useTexture` sizes are raw pixels (no density scaling). RSXform pivot formula verified in source — see the package guide. Atlas `colors`+`modulate` expects premultiplied colors; `dstIn` avoids the issue entirely by reading only alpha. **← WRONG, corrected on device, see next bullet.**
- **`colorBlendMode="dstIn"` is the wrong mode — use `modulate` with premultiplied colors** (found on device 2026-07-08, step 6): with `dstIn` every card rendered as a pure white silhouette (color RGB shown wherever the texture is opaque, texture RGB discarded). Empirically, in `drawAtlas` the TEXTURE is the blend source and the per-sprite color the destination — the guide's source/destination assumption was inverted. `modulate` (`r = s·d`) is commutative, so it is immune to that ambiguity; a pure-alpha fade is the premultiplied color `(a, a, a, a)` and hidden sprites write `(0, 0, 0, 0)`. Package guide updated accordingly (pending — see follow-ups).

## Identified issues

- FIXED (2026-07-08, step 6): `colorBlendMode="dstIn"` → all-white card silhouettes on iOS. Root cause + fix in learnings above; one JS-only edit to `CelebrationOverlayLayer.tsx` + one rebuild.
- Cosmetic, ACCEPTED (not the renderer's doing): dev preview celebrations draw UNDER the top bar / foundations / badge (RN siblings above the canvas) but the abort-covering `CelebrationTouchBlocker` still catches the taps; on Card Rain (21/22) cards briefly overlap the foundation row — same layering as the old view renderer, no action.
- Step 8 (Android A065, 2026-07-08): NO new issues. Perf far above target (120 Hz saturation). One measurement learning: the A065 is a 120 Hz device — Story-5 numbers were architecture-capped, so "fps ceiling ~50" was never the display. Legacy janky% remains a useless metric on this device (see Testing note).
- Resolved anticipations from steps 0–5: (a) no texture-ready blink at celebration start (start is subjectively instant, no blank-card flash on two immediate screenshots); (b) text baseline placement was correct with zero calibration; (c) dev-hold loop past 60 s continues seamlessly (Meteor Shower with trails, two screenshots 2 s apart at t≈70 s show a healthy animation, no texture rebuild stall).

## Testing

- Cheap gates: `yarn typecheck && yarn lint && yarn jest` (continuity suite untouched — math unchanged). Green again after the blend fix (28 suites / 275 tests).
- iOS simulator smoke (step 6, DONE 2026-07-08, iPhone 17 Pro, clean Release build 4:52 + fix rebuild 1:11):
  - **Fidelity**: after the modulate fix, Skia faces match `CardVisual` — white rounded face, periwinkle border, rank top-left, corner suit top-right, big center suit, correct red/black, crisp at pd=3, no neighbor-cell bleed, no missing glyphs. Zoom comparison vs a board screenshot showed no visible layout deviation (center-suit baseline correct on first try).
  - **Mode sweep**: all 33 modes (ids 0–32) badge-cycled, one screenshot each ≈2 s after cycling — every mode renders its distinctive pattern (spiral, ring, infinity, heart, cascade, …), label updates, no crash, no blank/white rectangles. Trails (fading ghost copies) clearly visible on 31 Classic Cascade and 32 Meteor Shower. Galaxy 27's per-card depth opacity also works (translucent far cards).
  - **Behavior**: start subjectively instant, no blank-card flash (screenshot fired immediately after the deep link already shows finished faces); abort tap → cards vanish instantly, untouched board returns; dev-hold loop past 60 s continues seamlessly (no hitch/texture rebuild); end fade not explicitly observed (endless preview loop — covered implicitly by the real-win run below reaching the dialog cleanly).
  - **Real win path**: `?demo=autosolve&games=1` → win → celebration renders (Card Rain) → new-game dialog appears on schedule with the celebration still animating behind it.
  - Artifacts: `.test-artifacts/celebration-skia-atlas-ios/` (board reference, per-mode `mode-NN.png`, zoom crops, loop/abort/start/win checks).
- Android A065 release perf test (step 8, DONE 2026-07-08, build+install+launch 1:27 incremental — skia native module already in the gradle cache from a prior build; install verified versionCode 13, fresh lastUpdateTime, pid confirmed):
  - **Result: every measured mode now renders at the device's FULL 120 Hz refresh rate** (~1,220–1,310 frames per 10 s window ≈ 122 fps). The old renderer never exceeded ~51 fps; the Atlas renderer more than doubles it and saturates the display. The A065 supports 120/90/60 Hz — the view renderer was architecture-capped, not display-capped.
  - gfxinfo table (10 s windows, celebration running steadily ≥5 s before reset; raw dumps in `.test-artifacts/celebration-skia-atlas-android/gfx-mode*.txt`):

| Mode | Story-5 baseline fps | New fps | Janky (modern) | 50th/90th frame | GPU 50th/90th |
| ---- | ------------------- | ------- | -------------- | --------------- | ------------- |
| 7 Wave Loop | 50 | 122 | 0.00% | 11/12 ms | 4/5 ms |
| 22 Vortex | 45 | 124 | 0.00% | 11/12 ms | 4/5 ms |
| 31 Classic Cascade (trails) | 51 | 122 | 0.33% | 12/13 ms | 4/5 ms |
| 32 Meteor Shower (trails) | 32 | 131 / 123 (2nd window) | 0.15% / 0.00% | 13/13 ms | 4/5 ms |
| 27 Galaxy | 44 | 122 | 0.00% | 11/12 ms | 4/5 ms |
| 10 Comet Halo | 43 | 122 | 0.00% | 11/12 ms | 4/5 ms |

  - Meteor Shower is NO longer an outlier (was 32 fps, worst mode; now indistinguishable from the rest — measured twice, both windows ≥123 fps). No GPU stalls anywhere: GPU 99th percentile 5 ms on every mode (Story 5 had literal 4,950 ms 90th-percentile stalls on trail modes).
  - Note on janky%: the legacy janky counter reads 67–96% because at 120 Hz vsync the 11–13 ms frame times technically span >1 vsync period — but the MODERN counter (deadline-based) is 0–0.33% and the sustained ~122 fps delivery is the ground truth. (Story 5 calibration note "janky% is useless on this device" still applies, now in the opposite direction.)
  - **Start latency (31/32)**: instant. Logcat: deep-link handled → `[Celebration] start` in ~320 ms (includes JS deep-link processing); no mount storm, no slow first seconds — the 10 s window fired 5 s after the link already delivers full 120 Hz.
  - **Fidelity (Android, pd=2.625)**: mode-0 screenshot ~2 s in — crisp rank/suit glyphs, correct red/black suit colors, white rounded faces with border, no blur/bleed (`fidelity-mode-0.png`).
  - **Trails**: clearly visible fading ghost copies on Meteor Shower 32 (`trails-mode-32.png`; Cascade 31 trails implicitly exercised in its perf window).
  - **Abort**: tap on the board mid-celebration → cards vanish instantly, untouched fresh board returns, no dialog, app alive (`abort-check.png`).
  - **Warmth proxy**: battery temperature 29.0 °C after the full measurement session (~6 min of continuous celebrations) — no thermal concern signal. (Subjective hand-feel not assessable by an agent.)
  - Acceptance criterion MET and exceeded: all modes ≥ the old ~45–50 fps ceiling (in fact ~122 fps), Meteor no longer an outlier, GPU percentiles single-digit ms.
- No new unit tests planned: the renderer is visual/worklet code (device-smoke territory); the math it consumes is already covered.

## Follow-ups

1. **Trail uplift pass** (decision 7): re-enable trails on Comet Halo (10) and Galaxy (27), restore richer Meteor (32) (more ghosts, rotation/scale oscillation), possibly longer trails on Cascade. Cheap to try (metadata + measured overdraw check on A065). Recommended next after perf is confirmed.
2. **True Windows Classic Cascade imprints**: persistent offscreen surface that is never cleared (draw each frame's cards on top, never erase) — the effect the user asked about ("not really close to windows classic cascade"). Now feasible with Skia (`Skia.Surface.MakeOffscreen` + accumulating draws). Medium effort; separate story.
3. **Confetti/particles/shader effects** during celebrations (motion blur, glow): unlocked by the same Atlas/Canvas; only if the user wants more spectacle.
4. **Card shadow in the atlas** if faces read as flat on device (one soft RRect per cell).
5. **Remove the trail perf-budget comments** in `celebrationModes.ts` metadata once the view-renderer constraints no longer apply (counts were tuned for Fabric view costs) — fold into follow-up 1.
6. **Correct the package guide** (`docs/external-package-guides/react-native-skia.md`): the "Per-sprite opacity" section claims the color is the blend source in `drawAtlas` — device testing proved the opposite (texture = source). Update to recommend `modulate` + premultiplied colors and mark `dstIn` as producing white silhouettes. Not done in this run (testing scope was limited to the renderer + plan doc); cheap, do it next touch.

---

# Story: Skia renderer polish — shadows, canvas extent, dock floor, trail uplift

Status: DONE 2026-07-08 — implemented, cheap gates green, Android device verification (step 6) PASSED on the A065 (all 4 fixes verified, perf still at the 120 Hz ceiling). Results in "Testing" below.

## User prompt

> 1. fix card shadows. 120hz is very nice, but can't release it like this at all. 2. yes pls 3. yes pls try as new mode, don't replace existing one, because that's also cool. but at end of everything else 4. there's a cut off on the top of the board where the cards arent shown. at some point in the last agent run, this was also on bottom, but was fixed, i think. see screenshot where top is cut off. doesn't matter for too many celebration modes, but does for some. 5. it's good that we don't have a lower cut off anymore as mentioned in 4. but if there is a dock on an android phone and the modes orient themselves on what is the bottom, e.g. when they fall to the bottom and bounce, they kind of fall just into the dock. in rest of app we do a lot with safe area. not sure if this is the solution here because if the mode should allow to go below screen, there should not be a but off, because then it's cool if they fly through the dock area. recommendations?

(Item mapping: 1 = card shadows, 2 = trail uplift follow-up, 3 = NEW imprint-cascade mode — separate later story, NOT in this one, 4 = top cut-off, 5 = dock floor.)

## Summary

All four fixes implemented 2026-07-08 (single run), gates green (28 suites / 275 tests), continuity assertions untouched. (1) Shadows: each atlas cell is padded by ⌈10dp·pd⌉ on all four sides and a `<Shadow dx=0 dy=1dp blur(σ)=3dp rgba(0,0,0,0.2)>` image filter is baked under each face; because the margins are symmetric the face center equals the padded-cell center, so the RSXform anchor math only swapped in the padded dimensions. (2) Top cut-off: the canvas now covers the whole window (absolute position at the negated `measureInWindow` offset of an absolute-fill wrapper, `useWindowDimensions` size, same element-tree position so z-order is unchanged); the offset is added to tx/ty in the transform worklet as two captured constants. (3) Dock floor: `floorY = boardHeight − bottom inset` (via `useSafeAreaInsets` in the controller — the undo dock unmounts during celebrations, which is WHY the board reaches the nav-bar area) threaded through `CelebrationState` → board shared value → optional `board.floorY` in `computeCelebrationFrame`; only Classic Cascade 31 (rests on it) and Big Bounce 28 (clamps to it) changed — pass-through modes intentionally keep flying through the dock. (4) Trails: Comet Halo 10 + Galaxy 27 re-enabled at 3 ghosts / 70 ms, Classic Cascade 31 → 4/80, Meteor 32 → 4/60 with reconstructed sine-based rotation wobble (±6° @ 1.8θ) + scale breath (±0.06 @ 2.2θ); all view-renderer perf-budget comments rewritten for Atlas economics. Android device verification pending (step 6, separate subagent).

## Description

The Atlas renderer shipped at 120 Hz but the user's device review found four polish gaps: (1) the Skia faces dropped the old RN card shadow and read flat — a release blocker for the user; (2) the Skia `<Canvas>` clips at its bounds, so cards vanish at the board container's top edge (the old `Animated.View`s overflowed their parent freely); (3) on Androids with a navigation dock, floor-bouncing modes rest their cards INSIDE the dock area; (4) trails were detuned for the view renderer's Fabric costs and can now be re-enabled/enriched since ghosts are nearly free in the single draw call.

## Acceptance Criteria

- Every card face in the atlas has a soft drop shadow comparable in subtlety to the old view renderer (`styles.cardBase`: shadowRadius 6 / opacity 0.2), NOT clipped by its atlas cell, and the face still lands pixel-exactly where the motion math says (margin-compensated anchor).
- No top cut-off: cards remain visible when a path exits the board container upward (canvas covers the full window); bottom stays un-clipped; z-order vs. header/touch blocker/badge unchanged.
- Modes with resting/bouncing floor semantics (Classic Cascade 31, Big Bounce 28) rest on the visible floor (boardHeight − bottom safe-area inset); pass-through modes (Fountain 20, Card Rain 21, Meteor 32, exits) still fly through the dock area.
- Trails re-enabled on Comet Halo 10 + Galaxy 27, richer on Meteor 32 (incl. restored rotation/scale oscillation) and Classic Cascade 31.
- `yarn typecheck && yarn lint && yarn jest` green; continuity suite assertions untouched.

## Steps to implement

- [x] 1. Card shadows: pad each atlas cell by a shadow margin, draw `<Shadow dx dy blur color/>` under each face, include margin in sprite rects, compensate the RSXform anchor (face center = padded-cell center, margins symmetric). DONE — see learnings.
- [x] 2. Full-window canvas: measure the overlay's window offset (`measureInWindow` on an absolute-fill wrapper), absolutely position the canvas at `-offset` with `useWindowDimensions` size, add the offset to tx/ty in the RSXform worklet. DONE.
- [x] 3. Dock-aware floor: `floorY` (boardHeight − bottom inset, via `useSafeAreaInsets` in `useCelebrationController`) threaded through `CelebrationState` → board shared value → `computeCelebrationFrame`'s board param (optional, falls back to boardHeight). Mode 31 rests on it, mode 28 clamps to it; pass-through modes untouched (per-mode floor semantics, user decision 2026-07-08). DONE.
- [x] 4. Trail uplift: Comet Halo 10 + Galaxy 27 → 3 ghosts / 70 ms; Meteor 32 → 4 ghosts / 60 ms + restored rotation/scale oscillation; Classic Cascade 31 → 4 ghosts / 80 ms. View-renderer perf-budget comments rewritten for Atlas economics. DONE.
- [x] 5. Cheap gates: `yarn typecheck && yarn lint && yarn jest`. DONE — all green (28 suites / 275 tests).
- [x] 6. Android device test (SEPARATE testing subagent — not this run): see "Testing handoff" below. DONE 2026-07-08 on the A065 — all checks pass, no defects; results table + screenshots in "Testing".

## Plan: Files to modify

- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (shadow cells + margin geometry, full-window canvas + offset)
- `src/animation/celebrationModes.ts` (floorY semantics in modes 31/28, trail metadata, Meteor oscillation)
- `src/features/klondike/types.ts` (`CelebrationBindings.board` gains `floorY`)
- `src/features/klondike/hooks/useCelebrationController.ts` (bottom inset → `floorY` threading)
- `test/unit/animation/celebrationModes.test.ts` (fixture only, if needed)
- NOT expected: `KlondikeGameView.tsx` (offset is measured inside the overlay, mount point unchanged)

## Files actually modified

- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — baked drop shadow (padded cells + `<Shadow>`), full-window canvas (measured window offset, sprite coords shifted in the worklet).
- `src/animation/celebrationModes.ts` — `floorY` in `CelebrationFrameInput.board` (optional, fallback boardHeight); mode 31 rests on it, mode 28 clamps to it, mode 20 documented as intentionally pass-through; trail metadata uplift (10: 3/70, 27: 3/70, 31: 4/80, 32: 4/60); Meteor 32 rotation/scale oscillation restored; perf-budget comments rewritten for Atlas economics.
- `src/features/klondike/types.ts` — `CelebrationBindings.board` now includes `floorY`.
- `src/features/klondike/hooks/useCelebrationController.ts` — `useSafeAreaInsets().bottom` → `CelebrationState.floorY` → board shared value.
- NOT modified: `KlondikeGameView.tsx`, `CardVisual.tsx`, `test/unit/animation/celebrationModes.test.ts` (fixture unchanged — `floorY` is optional in the frame input, fallback preserves old behavior).

## Intermediary learnings

- **Shadow margin geometry**: cell = margin + face + margin with EQUAL margins on all four sides, so the face center coincides with the padded-cell center — the RSXform anchor conversion only needed the padded dimensions swapped in (`paddedW/2`, `paddedH/2`); no separate face-offset term. The shadow's dy offset is drawn by the image filter inside the cell and does not shift the face.
- **`<Shadow>` blur = sigma**: verified in the 2.6.2 source (`declareDropShadowImageFilter` → `MakeDropShadow(dx, dy, blur, blur, color)`); iOS `shadowRadius` ≈ 2σ, so radius 6 → σ 3. Margin = ⌈(3σ + dy)·pd⌉ covers >99% of the gaussian.
- **Android never had a card shadow**: `styles.cardBase` sets iOS `shadow*` props but no `elevation`, so the old view renderer's shadow was iOS-only. The baked atlas shadow is the first one Android users see — visual review on the A065 is genuinely new territory, not a parity check.
- **Old trail configs were never committed**: the richer pre-detune values (Meteor 5, Comet 4, Galaxy 3) only survive in the metadata comment; mode 32's rotation oscillation never existed in git (born with the fixed tilt) — the restored oscillation is a reconstruction, not a revert.
- **Full-window canvas = same tree position**: absolute positioning with negative top/left keeps the canvas exactly where it was in the element tree, so z-order vs. header/touch-blocker/badge is untouched; only the paint bounds grow. Until the async `measureInWindow` resolves (~1 frame), the canvas covers window-size from the board origin — same top-clip as before for that instant, invisible in practice since cards launch from the foundations.
- **Why cards fell into the dock at all**: the UndoScrubber (bottom dock) returns null during win/celebration, so the board container reflows and GROWS to (nearly) the window bottom before `buildCelebrationState` captures `boardLayout` — celebration `boardHeight` therefore reaches into the Android nav-bar area, and `boardHeight − cardH` rested cards inside it. `floorY = boardHeight − bottom inset` lands the resting line exactly on the visible floor. (The dock is also hidden whenever there is no undo timeline — `shouldShowUndo` — so fresh-board previews already measure the grown board; only MID-GAME previews capture the pre-grow board and get a slightly conservative floor. Pre-existing, harmless.)
- Sprite quads are now padded-cell-sized (~80×104 dp vs 60×84 dp), i.e. more transparent-pixel fill per sprite, and the canvas covers the window instead of the board — both are GPU-fill costs the A065 has huge headroom for (5 ms GPU @ 120 Hz), but they are the thing to watch in the re-measure. The atlas texture also grows by 2·margin per cell (typical phones ~2,800–3,100 px wide, still under the 4,096 GPU floor; only an exotic large-card + pd≥3.5 combo would approach it). → Re-measure result (step 6): zero measurable cost — GPU 90th percentile still 5 ms, ~122 fps on all modes incl. the new-trail clustered ones.
- Device-testing learning (2026-07-08): the A065's screen timeout is 10 min — during a long capture session the screen dozed mid-run and screencaps came back solid black. `scripts/android-unlock-pattern.sh` recovered it in one call this time (the KEYCODE_WAKEUP pre-step from the previous run's quirk wasn't needed). If screenshots suddenly turn black, re-check `mWakefulness` first.

## Identified issues

- None found during implementation (gates green) or during the A065 device verification (step 6, 2026-07-08). Non-defects noted during testing:
  - The dev badge displays `id + 1` (`celebration=0` → "Celebration 01 · Spiral Bloom") — pre-existing controller behavior (`(metadata.id + 1).padStart(2,'0')`), documented here so future testers don't mistake it for a wrong-mode launch.
  - Wave Loop 7's orbit spends little time near the window top; the conclusive top-cut-off evidence is Card Rain 21 and Meteor 32 (cards render flush to the very top edge, under the header).

## Testing

- Cheap gates 2026-07-08: `yarn typecheck` + `yarn lint` + `yarn jest` all green (28 suites / 275 tests; continuity suite untouched and passing with the new mode-32 oscillation and floorY changes).
- **A065 Android device verification (step 6, DONE 2026-07-08)**: build+install+launch 44 s incremental (`yarn release`, versionCode 13, fresh lastUpdateTime verified). Screenshots in `.test-artifacts/celebration-skia-polish-android/`.
  1. **Shadows — PASS** (`01-shadows-mode0.png`, zoom `01b-shadow-zoom.png`): every card shows a soft drop shadow on all sides, slightly stronger below; zoom crop over plain green shows NO hard rectangular clip edge (cell margin sufficient); shadow rotates with the card and is present on trail ghosts (shared texture). Reads subtly richer than the flat board cards — accepted per handoff note (Android board cards never had a shadow).
  2. **Top cut-off gone — PASS** (`02-topcut-mode21.png`, `06-passthrough-trails-mode32.png`): Card Rain and Meteor cards render up into the header/stats area flush to the window top, no horizontal vanish line at the old board top. Wave Loop 7 sampled ~20 frames (`03-topcut-mode7*.png`) — its orbit stays mid/low, never clipped.
  3. **Dock floor — PASS** (`04-dockfloor-mode31.png`, `05-dockfloor-mode28.png`): Classic Cascade 31 rests and Big Bounce 28 bounces clearly ABOVE the system navigation bar; no cards settle inside it.
  4. **Pass-through intact — PASS** (`06-passthrough-trails-mode32.png`): Meteor 32 cards visibly mid-transit THROUGH the nav-bar area and off the bottom edge — no artificial floor.
  5. **Trails — PASS** (`07-trails-mode10.png`, `08-trails-mode27.png`, mode-32 shot): 3-ghost trails clearly visible on Comet Halo 10 and Galaxy 27 (smeared spiral arms); Meteor 32 noticeably richer — 4 long ghost streaks + varied per-card rotation (oscillation evident across frames).
  6. **Behavior sanity — PASS**: badge cycling 27→28→29 (Galaxy → Big Bounce → Heartbeat) label + pattern update per tap; abort tap → instant vanish, untouched fresh board returns (`09-abort-check.png`).
  - **Perf re-measure** (gfxinfo, 10 s windows, preview running ≥5 s before reset; raw dumps `gfx-mode*.txt`): indistinguishable from the pre-polish run — the shadow-padded sprites + full-window canvas cost nothing measurable.

| Mode | Prev run fps | New fps | Janky (modern) | 50th/90th/95th frame | GPU 50th/90th |
| ---- | ------------ | ------- | -------------- | -------------------- | ------------- |
| 0 Spiral Bloom (control) | 122 (fidelity run) | 123 | 0.00% | 11/12/12 ms | 5/5 ms |
| 10 Comet Halo (new trails) | 122 | 122 | 0.00% | 12/13/14 ms | 4/5 ms |
| 27 Galaxy (new trails) | 122 | 122 | 0.33% | 12/13/14 ms | 4/5 ms |
| 31 Classic Cascade (4 ghosts + floor) | 122 | 122 | 0.25% | 12/13/13 ms | 4/5 ms |
| 32 Meteor Shower (4 ghosts + oscillation) | 123–131 | 121 | 0.49% | 12/13/14 ms | 4/5 ms |

  - Legacy janky% still reads ~96% (11–13 ms frames technically span >1 vsync at 120 Hz) — modern deadline-based counter + sustained ~122 fps remain the ground truth, same calibration note as the step-8 run.

## Testing handoff (Android subagent, step 6)

Visual checks (A065, `soli://?celebration=<id>#retry-N` deep links, read `.agents/skills/soli-testing/SKILL.md` first):

1. **Shadows**: any mode paused visually (e.g. 0) — every card shows a soft, subtle drop shadow on all sides (slightly stronger below); no hard rectangular clip edge around any card (would mean margin too small); shadow rotates with the card. Compare subtlety vs. a board card on iOS if available; on Android there is no old reference (see learnings).
2. **Top cut-off gone**: modes whose paths exit the board top (the user's screenshot case — try 2 Pendulum Cascade, 7 Wave Loop, 18 Horizon Arc, 21 Card Rain) — cards stay visible above the old board edge, sliding into the header area; no horizontal vanish line.
3. **Bottom pass-through intact**: Fountain 20 / Card Rain 21 / Meteor 32 — cards still fly through the dock/nav area and off the bottom edge with no clip line.
4. **Dock floor**: Classic Cascade 31 and Big Bounce 28 on a device WITH a visible navigation bar — bouncing cards rest ON the visible floor above the nav bar, not inside it.
5. **Trails**: ghosts visible on 10 Comet Halo and 27 Galaxy (new), longer trail on 31, richer streaks + subtle per-card rotation wobble + scale breath on 32.
6. **Z-order**: header/statistics area behaves as before when cards pass it; abort tap + badge still work.

Perf re-measure (gfxinfo recipe from celebration-smoothness.md Story 5): 10 Comet Halo, 27 Galaxy (new trails on CLUSTERED modes — the overdraw worst case), 32 Meteor Shower (4 ghosts + rotation/scale churn), 31 Classic Cascade, plus 0 as a no-trail control. Expect ≥ old-mode baseline; flag anything that drops materially below 120 Hz saturation (prior run: ~122 fps everywhere, GPU 90th pct 5 ms).

## Follow-ups

- Imprint-cascade mode (user item 3): separate story, after this one. → Now the "Windows imprint cascade (mode 33)" story below.
- If the A065 re-measure shows clustered-overdraw regressions on 10/27, halve their ghost counts first (cheapest lever) before touching gaps.

---

# Story: Windows imprint cascade (mode 33)

Status: DONE 2026-07-08 — implemented, gates green, A065 device verification passed (visual + perf + sanity). One flagged compromise: sustained ~31 fps at 25+ s into the run (GPU rasterization bound, below the 90 fps target — see Testing/Identified issues; orchestrator decision point).

## User prompt

> yes pls try as new mode, don't replace existing one, because that's also cool. but at end of everything else

(Item 3 of the renderer-polish prompt: the TRUE Windows-Solitaire-style cascade where cards leave PERMANENT imprints along their bounce path — the screen is never "cleared" behind them, like Win 3.1/95 solitaire. IN ADDITION to Classic Cascade 31, not replacing it.)

## Summary

Mode 33 "Cascade Imprint" implemented 2026-07-08 with approach A (sampled imprint sprites). Motion (case 33): strictly sequential launches (1/52 of the run per card ≈ 1.15 s), closed-form gravity drop + geometric-restitution bounces on the dock-aware `floorY`, constant horizontal drift sized to exit within the card's own slot (monotonic x — no wraps, continuity suite passes untouched, 276 tests). Renderer: 64 frozen-progress imprint sprites per card (52 × 65 = 3,380 sprites, other modes' buffers unchanged), write-once mitigation (imprints computed+written exactly once, then flag-read early-out; UI-runtime closure arrays persist across mapper runs, reset on loop restart via progress-wrap detection). Alpha: full opacity × endFade (the other modes' launch fade deliberately dropped — it stamped card 0's whole arc translucent). Device verdict: visually excellent — solid overlapping bands tracing decaying bounce arcs, authentic Windows look, cards rest above the dock, badge/deep-link/abort/loop-restart/mode-31 all pass. Perf compromise: ~41 fps (early window) → ~31 fps sustained (25+ s, 32-34 ms frames, GPU 8-11 ms). Iterated twice (naive 26-32 fps → write-once+density → alpha fix); remaining cost is per-tick full-buffer marshalling + 3.4k-quad rasterization, not the worklet math. Below the 90 fps target — documented as the decision point; smooth-looking on device regardless since only 1 card moves at a time.

## Description

Classic Cascade (31) is a *homage*: staggered parallel launches, bouncing cards, but no imprints — the canvas clears every frame. The defining feature of the Windows original is that each card is *stamped* onto the screen every frame of its flight, building up solid overlapping bands that trace each bounce arc, and cards launch strictly ONE AT A TIME. This story adds that as NEW mode 33 ("Cascade Imprint"), now feasible with the Atlas renderer.

## Possible approaches (imprint rendering)

- **A) Sampled imprint sprites (CHOSEN)**: for mode 33 only, allocate a fixed budget of extra Atlas sprites; imprint sprite (card i, sample j) shows card i's frame at a FIXED progress p_ij sampled along that card's flight slot. It becomes visible once `progress >= p_ij` and stays (until the end fade). Because the sampled progress is constant, the imprint "freezes" correctly with zero extra machinery — the position is recomputed each tick but the deterministic math always yields the same frozen spot.
  - Pros: reuses the ENTIRE existing pipeline (one texture, one Atlas, two buffer worklets — only the sprite count and the per-sprite progress mapping change); imprints re-derive from progress, so the dev-hold loop restart (progress wraps to 0) resets them for free and abort/end-fade come for free; Atlas is documented for thousands of sprites.
  - Cons/risk: the RSXform mapper worklet computes ~52×110 ≈ 5.7k frames per progress tick — CPU-bound risk on the UI thread; must measure on the A065. Mitigations if needed: cheap early-out for not-yet-stamped samples (a comparison, no frame compute — implemented from the start) and, as a second step, caching frozen transforms in a mapper-persistent array keyed on progress monotonicity.
- **B) Accumulating offscreen surface**: persistent `Skia.Surface.MakeOffscreen`; each frame a worklet draws the current 52 card sprites onto it (never cleared); display via `makeImageSnapshot` + live cards on top. O(52) per frame — but needs new machinery (imperative worklet drawing next to the declarative Canvas, per-frame snapshot whose cost is un-researched and a known trap candidate), and loop-restart/abort would need explicit clearing logic. Chosen only if A measures poorly.
- Decision: start with A; the perf gate at ~30 s and ~55 s (max imprints) decides whether B is ever needed.

## Motion design (case 33 in computeCelebrationFrame)

- **Sequential launches**: card `assignment.index` launches at raw progress `index · (SPEED/52)` = index · 0.2 raw units — 52 cards fill the 60 s run exactly (~1.15 s per card). Before launch the card sits at its foundation base; the slot width in PROGRESS units is exactly `1/totalCards`, which the renderer's imprint sampler reuses (no shared constant needed).
- **Physics (closed form, continuity-safe)**: drop from baseY to the dock-aware floor (`board.floorY − cardH`, same semantics as mode 31) in fixed time t0 = 0.05 raw units → per-card gravity g = 2·drop/t0². Then geometric bounces: velocity restitution kv = 0.6 + 0.2·seed; bounce n has start speed v0·kv^n and duration 2·v0·kv^n/g; the cumulative bounce time converges to 2·t0·kv/(1−kv), after which the card slides along the floor. The active bounce index is recovered in closed form via logs (geometric series inversion) — position is continuous everywhere (bounces meet at the floor; velocity kinks are fine).
- **Horizontal**: constant vx = boardWidth·(7 + 2.5·seed)·direction (alternating parity, like other modes) — monotonic, so once a card exits the edge it STAYS fully offscreen forever: no wraps, no teleports, continuity test passes without any offscreen exemption. Worst-case exit ≈ 0.17 raw units < 0.2 slot.
- **Upright**: rotation 0, scale 1, opacity 1 (Windows original). The overlay's global wobble (±6 dp positional) stays — it is frozen per imprint sample (phase derives from the sampled rawProgress) so bands stay consistent with the live card's path.

## Imprint rendering (CelebrationOverlayLayer) — as implemented

- Renderer-local constants `IMPRINT_MODE_ID = 33`, `IMPRINT_SAMPLES_PER_CARD = 64` (imprints are a renderer feature — metadata stays motion-only, no trail config). Started at 110; tuned down after the first perf measurement (see Testing).
- For mode 33: `perSlot = 1 + samples`; sprite j < samples is imprint sample j with frozen progress `(slot + (j+1)/samples) / totalCards`; j = samples is the live card. Draw order [imprint 0 … imprint N−1, live card], slots ascending = launch order — later cards stamp OVER earlier cards' bands, exactly like Windows.
- **Write-once mitigation** (added after the naive version measured 26–32 fps): per-mapper tri-state arrays (0 dirty / 1 parked / 2 frozen-written) captured into the worklet closures. The UI-runtime copy of a captured plain array persists across mapper invocations (verified in react-native-worklets source: the closure is unpacked once at mapper registration), so a frozen imprint is computed and written exactly once, then early-outs on a single flag read — no math, no JSI buffer write. Progress-wrap detection at sprite 0 un-stamps everything on the dev-hold loop restart; mapper re-registration (mount, badge cycle, resize) resets state to dirty for free.
- Colors worklet for mode 33 skips `computeCelebrationFrame` entirely (case 33 keeps targetOpacity at 1): alpha = 1 × endFade, same write-once early-out in steady state, per-tick recompute only during the end fade (last ~2 s) so imprints fade out together.
- Sprite-count budget: 52 × 65 = 3,380 sprites. Buffer sizes key on `state.modeId`, so the other 34 metadata modes keep their exact current sprite counts — zero cost change for them.
- Uniform-in-time sampling (dt = slot/samples ≈ 18 ms real time) is AUTHENTIC to Windows (imprints were per rendered frame): bands are dense at bounce peaks and sparser on fast segments; worst-case gap ≈ 62 dp vertical at first impact (cards are ~84 dp tall → still overlapping).
- Alpha: imprints and the live card render at FULL opacity (× endFade). The other modes' launch fade (0.5 + 0.5·launchEased, ramping over the first 2.5% of the run) was deliberately dropped for mode 33 — it covered card 0's entire slot, permanently stamping its whole first arc at 50–90% alpha (observed on device as a ghostly translucent first band).
- Shadows: imprints keep the baked shadow (accepted per mission). On device this reads WELL — overlapping shadows give the bands a subtle emboss/depth, not distracting.

## Steps to implement

- [x] 0. Read plan doc, package guide, testing skill, sources. DONE 2026-07-08.
- [x] 1. Add this story section to the plan doc (before coding). DONE.
- [x] 2. `celebrationModes.ts`: metadata entry `{ id: 33, name: 'Cascade Imprint' }` (no trail) + case 33 motion math. DONE — drift implemented as boardWidth·(7 + 2.5·seed)·direction (slowest card exits in ~0.17 raw units < 0.2 slot).
- [x] 3. `CelebrationOverlayLayer.tsx`: imprint sprite budget, per-sprite frozen-progress mapping, transforms + colors worklet branches. DONE — colors worklet computes mode-33 alpha in closed form (no frame call for any of the ~5.8k sprites; case 33 keeps targetOpacity 1).
- [x] 4. Cheap gates: `yarn typecheck && yarn lint && yarn jest` (continuity suite picks up mode 33 automatically — must pass unmodified). DONE — green, 28 suites / 276 tests (was 275; the +1 is mode 33's continuity test), assertions untouched.
- [x] 5. Android release build on the A065 + visual test (`soli://?celebration=33#retry-N`, screenshots ~5 s / ~20 s / ~45 s; judge density, arcs, floor, sequential launches; ≤2 tuning iterations). DONE — visuals excellent from v1 on; used both tuning iterations on perf/alpha (see Testing).
- [x] 6. Perf: gfxinfo at ~30 s and ~55 s. Target ~120 fps; below ~90 → early-out mitigation once; still poor → document and stop. DONE — mitigation applied (write-once + density 110→64); final ~41/~31 fps, still below 90 → documented and stopped per instructions (decision point).
- [x] 7. Sanity: badge cycle to 33, abort instant, mode 31 unaffected. DONE — all pass.
- [x] 8. Update this story (files modified, learnings, testing, summary). DONE.

## Plan: Files to modify

- `src/animation/celebrationModes.ts` (metadata + case 33)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (imprint sprites)
- This plan doc.

## Files actually modified

- `src/animation/celebrationModes.ts` — metadata `{ id: 33, name: 'Cascade Imprint' }` (no trail) + case 33 (sequential launch, closed-form drop/bounce physics on `visibleFloorY`, monotonic drift).
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — imprint constants + budget, mode-33 branches in both buffer worklets, write-once state arrays, closed-form mode-33 alpha.
- This plan doc. Nothing else.

## Intermediary learnings

- **Per-tick cost scales with SPRITE COUNT, not with math complexity.** The naive 5,772-sprite version (recompute every stamped imprint every tick) ran at 26–32 fps (69–89 ms frames). Adding write-once early-outs roughly halved frame times (40 ms), and cutting density 110→64 samples brought 29–32 ms — i.e. even with ~all sprites early-outing on a flag read, the remaining floor is the 2 mapper `forEach` loops (2 × 3.4k worklet calls), the per-tick marshalling of the FULL RSXform/color buffers into `drawAtlas` (the Atlas command re-reads both arrays every redraw regardless of how few entries changed), and GPU rasterization of 3.4k shadow-padded quads (GPU 8–11 ms alone at 55 s, vs 4–5 ms on ordinary modes).
- **UI-runtime closure arrays are legitimate mapper-persistent state**: a plain array captured by a worklet is serialized once at `startMapper` registration and the UI-side copy is mutable and persists across invocations (verified in `react-native-worklets` `Serializable.cpp` / skia `buffers.ts`). Re-registration (render) resets it — which is exactly the reset semantics wanted here. A 1-element `lastProgress` array detects the dev-hold progress wrap.
- **Drop the launch fade for frozen stamps**: any global fade that ramps over early progress gets permanently baked into the first card's imprints. Mode 33 alpha must be constant (× endFade only).
- **`skipped 2 frames` warning class absent**: JS thread stays idle (all cost is UI-thread/GPU) — the board and app stay fully responsive at 31 fps celebration rendering; abort reacts instantly.
- The A065's gfxinfo "Janky frames" legacy counter is meaningless at 120 Hz (33 ms frames = 100% janky) — frame-time percentiles + total frames per 10 s window are the ground truth (same calibration note as the parent story).

## Identified issues

- **OPEN (decision point for the orchestrator): mode 33 perf below target.** Final: ~41 fps in the 25–35 s window, ~31 fps sustained at 45–60 s (frame 50th/90th: 24/27 ms → 32/34 ms; GPU 8/10 ms). Target was ~120, floor 90. Both permitted tuning iterations used. IMPORTANT CONTEXT: visually the mode does not read as janky — a single upright card moves at a time (no fast full-field motion like Meteor), and 30 fps on a 1.15 s bounce arc looks smooth to the eye; the app/JS thread is unaffected. Options if 31 fps is unacceptable: (a) reduce samples further (48 ≈ proportional cost cut, bands still overlap), (b) approach B (accumulating offscreen surface, O(52)/frame — new machinery, snapshot-per-frame risk un-researched), (c) accept as-is for a dev-preview-only mode. Recommendation: accept OR try 48 samples; approach B only if this mode must hit 90+.
- Resolved during the run: translucent first-arc imprints (launch fade baked into stamps — fixed by dropping the fade); 60 fps cap of v1 (write-once + density fix).

## Testing

- Cheap gates: `yarn typecheck` / `yarn lint` / `yarn jest` green after every iteration (28 suites / 276 tests; continuity suite unmodified, mode 33 included automatically).
- A065 device (Android release, versionCode 13, `yarn release` ~37 s incremental each iteration). Artifacts in `.test-artifacts/celebration-imprint-cascade/`.
- **Visual verdict (final build): PASS, looks strikingly like the Windows original.**
  - `final-05s.png`: first cards done, solid bands tracing full decaying-bounce arcs; sequential launch obvious (only 1 live card moving).
  - `final-20s.png` / `final-45s.png`: bands accumulate into dense overlapping card-mountains; later cards stamp OVER earlier bands; imprint density solid (no dotted gaps — bands read as continuous even at bounce-peak curvature); bounce floor clearly ABOVE the nav dock.
  - `final-58s.png`: dev-hold loop restarted (~60 s wrap) → all imprints cleared, run restarts cleanly from card 0 — loop-reset semantics work and card 0's fresh arc is now FULLY OPAQUE (alpha fix verified; compare `loop-restart-check.png` from v3 where it was translucent).
  - Shadow-baked imprints: accepted — bands get a subtle emboss depth, no ugly artifacts.
- **Perf (gfxinfo, 10 s windows; janky legacy counter ignored per calibration note):**

| Build | Window | Frames/10 s (~fps) | 50th/90th frame | GPU 50th/90th |
| ----- | ------ | ------------------ | ---------------- | ------------- |
| v1 naive, 110 samples | ~30 s | 323 (~32) | 69/73 ms | 10/11 ms |
| v1 naive, 110 samples | ~55 s | 258 (~26) | 89/93 ms | 15/17 ms |
| v2 write-once, 110 samples | ~30 s | 593 (~59) | 40/42 ms | 10/11 ms |
| v2 write-once, 110 samples | ~55 s | 607 (~61) | 38/42 ms | 11/12 ms |
| v3 write-once, 64 samples | ~30 s | 730 (~73) | 29/32 ms | 6/7 ms |
| v3 write-once, 64 samples | ~55 s | 760 (~76) | 32/34 ms | 9/10 ms |
| FINAL (v4 = v3 + alpha fix) | ~30 s | 1008 (~41 fps × 24.6 ms — window caught the lighter early phase) | 24/27 ms | 8/8 ms |
| FINAL | ~55 s | 746 (~31) | 31/34 ms | 8/10 ms |
| Mode 31 control (same session) | 10 s | 1221 (~122) | 12/12 ms | — |

- **Sanity: PASS** — badge cycle 32→33 works (label "Celebration 34 · Cascade Imprint", `badge-cycle-33.png`; NN = id+1 display quirk, pre-existing); abort tap → instant vanish, untouched fresh board (`abort-check2.png`); mode 31 unaffected (visuals `mode-31-check.png`, perf ~122 fps = its pre-story ceiling); `soli://?celebration=33` deep link picked up automatically (metadata iteration, no wiring needed).

---

# Story: opacity fix + celebration polish round 2

Status: DONE 2026-07-08 — implemented, cheap gates green, Android device verification PASSED on the A065 (opacity convention confirmed, mode 33 now at the 120 Hz ceiling, memory flat, no defects). Results in "Testing" below.

## User prompt

> 1. shadows: sorry, was still a bit asleep and misunderstood here. i didn't mean shadows. i meant opacity. right now when we have what was opacity before, the cards look dark/black and quite off. added 2 screenshots. this was not the case before skia. this is the highest prio. 2. since you now did something with shadows, tell me what it is, what the benefits are, etc. i don't even consciously see a change, but it's also hard without exact before/after. give recommendation whether we should keep. does this have performance implications? i see that the new imprint cascade has frame rate drops. does this have a connection? 3. rename classic cascade to something else because it's nice, but really just it's own thing. 4. new cascade imprint 1: it works. but i saw an Intermediary result once with a bit more cards and it was honestly better. recommendations? 5. new cascade imprint 2: the cards that stay on top have their own kind of wiggle. this is really weird. i think for this mode, it would even make sense to not wiggle at all. this is the case for a few other modes as well. for some it's an important part, but for some others, it's disctracting. 6. new cascade imprint 3: Also we take a random deck. which makes sense for most modes. but for this one, sorted would probably make more sense 7. new cascade imprint 4: I think part of the charm of the app are nice and fast animations. it feels a bit slow and i think it could be a bit faster. 8. new cascade imprint 5: any other performance ideas? 9. trail uplift: what were the original values? because i remember i really liked it back then. did you go back to them or a compromise? no need to do anything yet. 10. test agent mentioned that there is a id+1 display quirk, pls fix.

## Summary

All six tasks implemented 2026-07-08. (1) OPACITY: semi-transparent sprites rendered dark because the "premultiplied `(a,a,a,a)`" colors were in fact re-premultiplied by Skia — the 2.6.2 native source (`cpp/api/recorder/Convertor.h`) converts the color buffer via `SkColorSetARGB(a·255, r·255, g·255, b·255)` into `SkColor`, which Skia defines as UNPREMULTIPLIED and premultiplies internally before the atlas blend; `(a,a,a,a)` therefore became RGB a² at alpha a (dark gray ghosts). Fix: write UNpremultiplied white `(1, 1, 1, a)` with `colorBlendMode="modulate"`. Package guide corrected (marked pending device confirmation). (2) Mode 31 renamed "Classic Cascade" → **"Avalanche"** (id stays 31). (3) Metadata gained `wobble?: false`; the overlay derives a `wobbleScale` constant per mode; modes 31 + 33 opt out. (4) Cascade Imprint rework: SORTED launch (Kings first, cycling suits: `launchOrder = (12 − stackIndex)·4 + suitIndex`), faster cadence (launch every 0.11 raw units ≈ 0.63 s/card → deck done ≈ 33 s; drift raised to 8–10.5 boardWidths/raw unit, fall time 0.045 raw ≈ 0.26 s), density restored to 110 samples/card, and the imprint renderer REPLACED with approach B — an accumulating offscreen Skia surface (`CascadeImprintLayer`): new stamps are drawn once onto a persistent surface and displayed as ONE `<Image>` under the live Atlas; the per-tick Atlas path for mode 33 is now just the 52 live cards. Option 1 (split Atlas + epoch-gated mapper) was ruled out by source reading: the Canvas container re-marshals EVERY shared-value prop on EVERY tick (`applyUpdates` in `JsiRecorder.h` has no per-variable dirty tracking), so a 5.7k-sprite buffer costs full JSI marshalling per tick no matter how the mappers are gated. (5) Trails: Comet Halo 10 → 4 ghosts (original count; original gap never committed → 70 ms kept), Meteor 32 → 5 ghosts / 55 ms (user-remembered originals). (6) Badge now shows the real 0-based id (`Celebration 33 · Cascade Imprint`), matching the deep link.

## Description

Device review of the Atlas renderer surfaced a batch of feedback: translucent sprites (trail ghosts, Galaxy depth fade, end fade) render dark/black instead of translucent (highest prio — a color-semantics regression introduced with the modulate fix), the new imprint mode needs polish (sorted launches, faster, denser, no wobble, better perf), mode 31 deserves its own name, trails should return to their original richness, and the dev badge shows id+1.

## Possible approaches (imprint perf — task 4d)

- **Option 1 — split `<Atlas>` + epoch-gated imprint mapper (RULED OUT by source)**: two Atlas elements in one Canvas; the imprint buffer mapper driven by a rarely-bumped `imprintEpoch` shared value. The mapper gating works (mappers only re-run when a captured shared value changes), BUT the Canvas container registers ONE mapper over ALL shared values (`Container.native.ts`) and its `applyUpdates` (native `JsiRecorder.h`) re-runs the JSI→`std::vector` conversion for EVERY registered variable each invocation — no per-variable dirty tracking. A 52×111-sprite RSXform buffer = ~5.7k JSI host-object unwraps per tick regardless of gating. A separate second Canvas would only help between stamps; during flights stamps land ~every frame, so the full marshal would still run ~every frame. Dead end for 120 fps at 110 samples.
- **Option 2 — accumulating offscreen surface (CHOSEN, approach B from the imprint story)**: a persistent `Skia.Surface.MakeOffscreen(window·pd)` owned by a UI-thread reaction; each tick it computes which imprint samples newly froze (closed form per slot) and draws ONLY those (`drawImageRect` from the shared atlas texture — mode 33 is upright/unscaled/unwobbled so stamps are axis-aligned), then `flush()` + `makeImageSnapshot()` into an image shared value rendered as one `<Image fit="fill">` UNDER the live Atlas in the same Canvas. Per-tick cost: 52-sprite live buffers (like any plain mode) + O(1) image-handle conversion + 0–2 stamp draws + one copy-on-write surface blit on stamp frames + one full-screen textured quad on the GPU (vs rasterizing 5.7k shadow-padded quads every frame). Loop restart (progress wrap), texture rebuild (fonts arriving), and abort are handled by clearing the surface / an active-gated opacity. Trade-off: ~10–20 MB GPU memory for the surface (+ its snapshot) while mode 33 runs, imperative worklet drawing next to the declarative canvas, and snapshot images relying on GC (watch memory on device). All machinery lives in a `CascadeImprintLayer` component mounted ONLY for mode 33 — other modes' code path untouched, and the write-once tri-state arrays from the previous iteration were deleted.

## Steps to implement

- [x] 1. Add this story section (before coding). DONE.
- [x] 2. Task 1 opacity: read 2.6.2 native source to pin the color convention; switch both color-buffer paths to unpremultiplied `(1,1,1,a)`; inline comment citing the source; correct the package guide (marked pending device confirmation). DONE.
- [x] 3. Task 2: rename mode 31 → "Avalanche" (metadata name only, id 31 stays); update live comment references. DONE.
- [x] 4. Task 3: `wobble?: false` metadata field; overlay `wobbleScale` captured constant; opt out modes 31 + 33. DONE.
- [x] 5. Task 4: case 33 — sorted launch order (Kings first), launch interval 0.11 raw, drift 8+2.5·seed, t0 0.045; overlay — `CascadeImprintLayer` (approach B), 110 samples, delete write-once machinery. DONE.
- [x] 6. Task 5: trails 10 → 4/70 (gap unrecoverable from git — only 31:3/80 and 32:2/75 were ever committed), 32 → 5/55. DONE.
- [x] 7. Task 6: badge label uses the real 0-based id. DONE (testing skill doc does not document the +1 → no change needed there).
- [x] 8. Cheap gates: `yarn typecheck && yarn lint && yarn jest` (continuity suite must pass unmodified with the new mode-33 motion). DONE — green, 28 suites / 276 tests, assertions untouched.
- [x] 9. Android device verification (SEPARATE testing subagent): see "Testing handoff" below. DONE 2026-07-08 on the A065 — all 7 checks pass, no code iteration needed (the `(1,1,1,a)` convention was correct on first try); package guide markers finalized.

## Plan: Files to modify

- `src/animation/celebrationModes.ts` (rename, wobble field, trail values, case 33 motion, imprint constants export)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (opacity fix, wobbleScale, imprint layer rework)
- `src/features/klondike/hooks/useCelebrationController.ts` (badge label id)
- `docs/external-package-guides/react-native-skia.md` (color-semantics correction)
- This plan doc.

## Files actually modified

- `src/animation/celebrationModes.ts` — mode 31 renamed "Avalanche"; `wobble?: false` metadata field (31, 33 opt out); trails 10 → 4/70, 32 → 5/55; exported `CELEBRATION_SPEED_MULTIPLIER`, `IMPRINT_LAUNCH_INTERVAL_RAW`, `IMPRINT_FLIGHT_SPAN_RAW`, `getImprintLaunchOrder`; case 33 sorted/faster motion.
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — unpremultiplied `(1,1,1,a)` colors; `wobbleScale`; imprint machinery replaced by `CascadeImprintLayer` (offscreen surface accumulation); write-once tri-state arrays deleted.
- `src/features/klondike/hooks/useCelebrationController.ts` — badge label shows the real 0-based mode id.
- `docs/external-package-guides/react-native-skia.md` — corrected atlas color semantics (unpremultiplied SkColor, `(1,1,1,o)` fades) + per-tick `applyUpdates` full-marshal note; marked pending device confirmation.
- This plan doc.

## Intermediary learnings

- **Atlas colors are UNPREMULTIPLIED `SkColor`** (third and hopefully final iteration on this): the recorder converts each color Float32Array via `SkColorSetARGB(a·255, r·255, g·255, b·255)` (`Convertor.h` line ~189) into `SkColor` — "32-bit ARGB color value, unpremultiplied" per `SkColor.h` — and `SkCanvas::drawAtlas` premultiplies internally. Writing premultiplied `(a,a,a,a)` therefore double-premultiplies: RGB ends up a² (dark). A pure alpha fade is `(1, 1, 1, a)` with `modulate`. The shared-value update path (`applyUpdates`) uses the exact same converter, so the convention holds for animated buffers.
- **The Canvas container re-marshals every shared-value prop every tick**: `NativeReanimatedContainer.redraw` registers one mapper over all collected shared values; its worklet calls `recorder.applyUpdates(sharedValues)` which runs the stored conversion function for EVERY variable (no dirty check), then replays the picture. Consequence: buffer size directly prices EVERY tick (JSI iteration + host-object unwrap per element), independent of whether the buffer changed. This is why big sprite buffers can't be made cheap by gating their mappers — and why the imprint field had to leave the Atlas.
- **Offscreen surface accumulation works with the existing texture pattern**: `useTexture` itself creates surfaces on the UI thread in a worklet (`textures.tsx`), so the stamping reaction doing `MakeOffscreen` + `drawImageRect` + `makeImageSnapshot` on the UI thread is the same lifecycle. Snapshot is copy-on-write: each write-after-snapshot costs one surface blit (only on stamp frames).
- **Stamps must reproduce the live math minus wobble**: mode 33 is upright (rotation 0, scale 1) and wobble-free (task 3), so stamps are axis-aligned `drawImageRect`s of the padded cell (keeps the baked shadow). If mode 33 ever gains rotation/scale/wobble, the stamping worklet must switch to a matrix draw.
- **Original trail configs, definitive answer (user item 9)**: git history of `celebrationModes.ts` only ever contained 31: 3/80 and 32: 2/75 — the richer originals (Meteor 5, Comet 4, Galaxy 3) predate the file's extraction and their gaps were never committed. Current 32 → 5/55 comes from the user's memory; 10 → 4 ghosts with the 70 ms gap kept (original gap unrecoverable).
- `stackIndex` semantics verified for the sorted launch: foundation piles and preview `DEAL_RANKS` both build Ace(0) → King(12), so Kings-first = `(12 − stackIndex)·4 + suitIndex`.

## Identified issues

- None new during implementation, and NONE found in device verification (2026-07-08, A065): opacity correct on first try, mode 33 at 120 Hz, memory flat, all behavior checks pass.

## Testing

- Cheap gates 2026-07-08: `yarn typecheck` + `yarn lint` + `yarn jest` green (28 suites / 276 tests; continuity suite unmodified, mode 33 passes with the new motion).
- **A065 Android device verification (DONE 2026-07-08)**: `yarn release` 45 s incremental, install verified (versionCode 13, fresh lastUpdateTime), launch OK. Artifacts in `.test-artifacts/celebration-polish2-android/`.
  1. **Opacity — PASS, `(1,1,1,a)` unpremultiplied is device-correct on the first try** (no fallback iteration needed). Mode 32 Meteor (`01-opacity-mode32-5s.png`, `01b-…-8s.png`): ghosts are translucent WHITE, clearly lighter than the live card, board green shining through — night-and-day vs the broken reference (`celebration-skia-atlas-android/trails-mode-32.png`, dark gray-green ghosts). Not washed out — live cards stay fully readable. Galaxy 27 (`02-opacity-mode27-galaxy.png`): depth fade is a soft white translucency, no darkening. Package guide "(pending device confirmation)" markers removed, convention finalized.
  2. **Badge id — PASS**: `?celebration=33` → badge reads "Celebration 33 · Cascade Imprint" (screenshots 05*); mode 31 shows "Celebration 31 · Avalanche". id+1 quirk gone.
  3. **Avalanche 31 — PASS** (`03-avalanche-4s.png`, pair `03b`/`03c` 1 s apart): renamed label, cards slide/bounce fully upright (rotation 0), no wobble jitter between frames; trails intact.
  4. **Cascade Imprint 33 — PASS on all six sub-checks** (`05-…-05s/10s/30s/50s/63s-loop.png`, rest pair `06`/`06b`, `07-abort-check.png`): (a) Kings launch first cycling the 4 foundations with alternating directions (K bands then Q bands at 5 s); (b) noticeably faster — Aces stamping by ~46 s screenshot, field fully static at ~42 s (deck done ≈ 35 s, was ~60 s); (c) bands visibly denser/more solid than the 64-sample reference (`celebration-imprint-cascade/final-20s.png`) — continuous card-mountains, no dotted gaps at bounce peaks; (d) resting cards do NOT wiggle (two frames 1.5 s apart pixel-identical); (e) dev-hold loop restart ~60 s clears ALL imprints, card 0 relaunches cleanly (`05e`); (f) abort tap → everything vanishes instantly, untouched fresh board.
  5. **Trails — PASS**: Comet Halo 10 (`04-trails-mode10.png`) shows a rich 4-ghost smear along the arc; Meteor 32 shows 5-ghost streaks — both properly translucent now.
  6. **Perf — the approach-B rework erased the mode-33 deficit**: mode 33 now saturates 120 Hz in BOTH windows (was 41/31 fps). Table below.
  7. **Memory — PASS**: mode 33 `dumpsys meminfo` at ~10 s vs ~55 s: Graphics 6,400 → 6,440 KB, total PSS 375.8 → 366.5 MB (flat/slightly down). No snapshot-GC runaway.

| Mode | Previous fps | New fps (frames/10 s) | Janky (modern) | 50th/90th/95th frame | GPU 50th/90th |
| ---- | ------------ | --------------------- | -------------- | -------------------- | ------------- |
| 33 Cascade Imprint @ ~15 s | ~41 | 123 (1227) | 0.00% | 12/13/13 ms | 4/5 ms |
| 33 Cascade Imprint @ ~40 s | ~31 | 122 (1215) | 0.00% | 11/11/12 ms | 4/5 ms |
| 32 Meteor Shower (5 ghosts) | ~121 | 123 (1227) | 0.00% | 12/13/13 ms | 4/4 ms |
| 0 Spiral Bloom (control) | ~122 | 122 (1223) | 0.00% | 11/12/12 ms | 4/5 ms |

  - Raw dumps: `gfx-33-15s.txt`, `gfx-33-40s.txt`, `gfx-32.txt`, `gfx-0.txt`; meminfo `mem-33-10s.txt`, `mem-33-55s.txt`. Legacy janky% still meaningless at 120 Hz (calibration note from the parent story applies).
  - The previous story's OPEN perf decision point (mode 33 at 31 fps) is now CLOSED — approach B delivers the 120 Hz target with margin.

## Testing handoff (Android subagent)

Read `.agents/skills/soli-testing/SKILL.md` first. Build `yarn release` on the A065. Verify:

1. **Opacity (HIGHEST PRIO)**: trail modes 32 (Meteor) and 10 (Comet Halo) — ghosts must be TRANSLUCENT versions of the card (white face shining through), NOT dark/gray-black (compare `.test-artifacts/celebration-skia-atlas-android/trails-mode-32.png` = broken reference). Galaxy 27 — far cards translucent, not dark. End fade (dev-hold loop wrap ~60 s or watch last 2 s) — cards fade OUT brightly, no darkening. Screenshot each. Report back so the package guide's "(pending device confirmation)" can be resolved.
2. **Badge label**: `soli://?celebration=33` → badge must read "Celebration 33 · Cascade Imprint" (id matches the deep link now).
3. **Mode 31 "Avalanche"**: renamed label; motion unchanged; NO wobble (cards slide/bounce clean, previously they jittered).
4. **Cascade Imprint 33**: Kings launch first (K,K,K,K,Q,Q,…), alternating direction; noticeably faster (deck done ≈ 33 s, brisk flights); denser solid bands (110 samples); resting cards do NOT wiggle; imprints keep shadows; loop restart clears imprints; abort instant (imprint field vanishes with the cards).
5. **Imprint perf (gfxinfo, 10 s windows at ~15 s and ~30 s + one after the deck is done ~40 s)**: expect a LARGE improvement over the 31–41 fps baseline — the per-tick cost is now 52 live sprites + one full-screen image; target ≥90, ideally ~120. Also re-check ONE plain mode (e.g. 0) and ONE trail mode (32, now 5 ghosts) stay ~122 fps.
6. **Memory sanity while 33 runs** (`dumpsys meminfo ch.karimattia.soli` graphics/GPU line at ~10 s vs ~50 s): the snapshot-per-stamp pattern relies on GC; flag runaway growth (>150 MB delta) as a defect.

## Follow-ups

- DONE 2026-07-08: device confirmed the opacity fix → "(pending device confirmation)" markers removed from the package guide, `(1,1,1,a)` + `modulate` documented as the confirmed convention.
- Imprint stamping showed NO visible lag and flat memory on device — no fallback needed.

---

# Story: cascade fixes, launch feel, kings-on-top

Status: DONE 2026-07-08 — implemented, cheap gates green (28 suites / 276 tests, continuity suite unmodified). Device verification DONE 2026-07-08 (combined round-3 subagent, all checks PASS — see "Device test results" below).

## User prompt

> See screenshot, 31 and 33 issues: 1. the cards that are still up dont sit exactly on top of eachother, looks weird. is it like there was a wobble but randomly stopped? 2. because all cards have a shadow, the shadow becomes really strong when many cards are on top of each other. doesn't look like this in real game. recommendation? 3. king is not on top like it is with foundation. 4. for 33, is floor deterministic? looks like sometimes it's different. or just higher up than before? 5. to repeat, there could just be another K behind the last A to give it a smooth repeat? 6. 33: there could be a tiny bit more variation in where the cards go to. cards from same column have very similar path 7. 31: also make avalanche a bit faster. Other general: A: some animations dont feel like they start from the foundation anymore, but directly jump to whatever they're doing. i think this is since skia. recommendation? at least for 31 and 33 i think. maybe also for others. i think i also just saw it with 17 B: Animation should always start with kings on top. was this the case before? just so that it's a clean transformation from tableau on real game to celebration. afterwards, they can be shuffled to do different things? recommendation?

(Screenshot evidence: `.test-artifacts/celebration-polish2-android/05-imprint-05s.png` — waiting piles show a vertical card fan with compounded dark shadows and `2♥ 2♦ 7♣ 3♠` as visible pile tops while Kings launch first.)

## Summary

All five tasks implemented 2026-07-08. (1) Foundation-pile rendering for staggered modes 31/33: pre-launch cards are alpha 0 except the pile-top card of each foundation (exactly at its base — pre-launch math verified to return EXACT baseX/baseY in both cases, no clamp needed); one visible card per pile kills the shadow stacking, the fan, and the wrong-top-card at once. (2) Launch feel: the worklet math moved verbatim in the Skia rewrite (git-diff confirmed identical) — the regression is that the old renderer kept 52 views permanently mounted (first frame instant) while the Skia renderer mounts a Canvas + rasterizes the atlas at start, so cards first APPEAR after progress has advanced and the launch blend (~60% saturated within 250 ms) is mostly eaten. Fix: the launch blend is now anchored to the moment the atlas texture is ready on the UI thread (shared-value anchor; mode math untouched, continuity suite unaffected). (3) Kings on top: draw order was never rank-sorted pre-Skia either (shuffled slot order) — now a draw-order permutation (stackIndex asc, ties by suitIndex) decouples sprite z from the shuffled assignments: Aces draw first, Kings last (on top), ghost banding intact. (4) Mode 33: floor made deterministic by deriving it in the overlay from `windowHeight − measured board offset − bottom inset` (identical for previews and real wins, independent of the undo-dock mount state); seamless repeat via launches wrapping modulo 52 with per-pass decorrelated seeds (a King relaunches right behind the last Ace, second-pass arcs differ so new bands stamp); path variation widened (restitution 0.55–0.85, drift 7.5–11.5 boardWidths/raw, per-card fall time 0.04–0.052, all decorrelated from each other). (5) Avalanche ~1.4× faster (cadence 0.06→0.04 raw, drift ×~1.44, bounce freq ×1.2, drop 0.35→0.25).

## Description

Device review of the polish-round-2 build surfaced start-state problems in the staggered modes (31 Avalanche, 33 Cascade Imprint): waiting cards render as a misaligned fan with compounded shadows and a random card on top instead of looking like a real foundation pile, plus a renderer-wide "launch doesn't start from the foundation" feel since the Skia rewrite, a floor inconsistency in previews, and tuning wishes (repeat, variation, speed).

## Root causes (investigated)

1. **Misaligned waiting piles (items 1+2+3)**: NOT drift/wobble leakage — pre-launch path math returns exactly base in both 31 and 33 (verified by inspection: case 33's fall/drift terms are ×tSince or gated by `tSince < t0`; case 31's drop term cancels `(floorY − baseY)` at drop=1 and the frac-wrap is the identity for on-board baseX). The fan is the intentional per-card `baseY − stackIndex·2%·cardH` launch offset; the darkness is 13 stacked per-card shadows; the wrong top card is the shuffled draw order. All three are RENDERING problems → fixed with the foundation-pile visibility rule + rank-sorted draw order.
2. **Launch feel (item A)**: math identical pre/post Skia (verbatim move, git-diff verified). The old renderer kept its 52 `Animated.View` slots ALWAYS mounted, so celebration start rendered frame 1 at progress≈0; the Skia renderer mounts `<Canvas>` + builds the atlas texture at start — Android surface init + font decode + rasterization delay the first visible frame while `withTiming` is already running, so cards first appear with `launchEased` largely saturated (easeOutQuint(progress·40) is ~60% at 250 ms) — they "jump to whatever they're doing". Mode 17 (no stagger) shows it renderer-wide; 31/33 additionally had root cause 1 making starts look broken.
3. **Floor (item 4)**: preview `boardHeight` depends on whether the undo dock was mounted at measure time (mid-game previews measure the pre-grow board; real wins and fresh-board previews measure the grown board) → floor visibly higher in some previews. Run-to-run it WAS deterministic for a given entry path; across paths it wasn't.

## General rule for future modes (item A, design)

Modes with per-card staggered entries (tSince-style: 31, 33) MUST return exactly `assignment.baseX/baseY` pre-entry from the mode math itself — the global launch blend only covers the very first moments of the run and cannot be relied on for staggered entries. The global launch blend is anchored to renderer readiness (texture-ready shared value), not to raw progress 0.

## Steps to implement

- [x] 1. Add this story section (before coding). DONE.
- [x] 2. Task 1 foundation-pile rendering: launch-timing arrays (31/33) + colors-worklet visibility rule (only pile-top waiting card visible, ghosts hidden until their lagged progress passes launch); verify pre-launch exactness (verified — no math change needed); verify no pre-launch imprint stamps (verified — stamper target is 0 until rel ≥ 0). DONE.
- [x] 3. Task 2 launch anchor: `launchAnchor` shared value set when the atlas texture becomes ready; anchored `launchEased` used in both buffer worklets and the imprint stamper (stamper waits for the anchor so frozen stamps match the live card). DONE.
- [x] 4. Task 3 kings-on-top: draw-order permutation (stackIndex asc, suitIndex tiebreak) applied to sprite rects + both buffer mappers; ghost banding preserved. DONE.
- [x] 5. Task 4a floor: overlay-derived `floorY = windowHeight − windowOffset.y − insets.bottom` (state.floorY fallback until measured); worklets/stamper read a captured board constant instead of `bindings.board`. DONE.
- [x] 6. Task 4b seamless repeat: case 33 wraps launches modulo the deck (pass = floor(rel/cycle)), per-pass decorrelated seeds + alternating direction; stamper counts cumulative multi-pass samples. DONE.
- [x] 7. Task 4c variation: k = 0.55+0.3·seedB, drift = 7.5+4·seedC boardWidths/raw (FLIGHT_SPAN 0.15→0.16 to cover the slower exits), t0 = 0.04+0.012·seedD, seeds decorrelated via fract(seed·prime + pass·φ). DONE.
- [x] 8. Task 5 Avalanche faster: cadence 0.06→0.04 (exported const, overlay needs it), drift (0.45+0.35s)→(0.65+0.5s), bounce freq (3.5+1.5s)→(4.2+1.8s), drop 0.35→0.25, envelope freq 0.13→0.16. DONE.
- [x] 9. Cheap gates: `yarn typecheck && yarn lint && yarn jest` (continuity suite UNWEAKENED). DONE — green, 28 suites / 276 tests, test file untouched.
- [x] 10. Update this story (files modified, learnings, testing handoff). DONE.

## Plan: Files to modify

- `src/animation/celebrationModes.ts` (case 31 speed + exported cadence, case 33 repeat/variation, FLIGHT_SPAN, export launch multiplier)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (draw-order permutation, launch anchor, pile visibility, board constant/floor, stamper multi-pass)
- `src/features/klondike/hooks/useCelebrationController.ts` (floorY comment only — value kept as pre-measure fallback)
- This plan doc.

## Files actually modified

- `src/animation/celebrationModes.ts` — exported `CELEBRATION_LAUNCH_SPEED_MULTIPLIER` + `AVALANCHE_LAUNCH_INTERVAL_RAW` (0.04); case 31 retuned ~1.4× faster; case 33 multi-pass repeat + widened decorrelated variation; `IMPRINT_FLIGHT_SPAN_RAW` 0.15→0.16.
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — draw-order permutation, launch anchor (texture-ready), foundation-pile visibility for 31/33, window-derived floor + captured board constant, multi-pass imprint stamper with anchored launch blend.
- `src/features/klondike/hooks/useCelebrationController.ts` — floorY comment updated (overlay overrides with the window-derived floor once measured).
- This plan doc. Nothing else (`types.ts`, `KlondikeGameView.tsx`, unit tests untouched).

## Intermediary learnings

- Pre-launch exactness needed NO code change: both staggered cases already return exact base at tSince = 0 (the drift terms are ×tSince; 31's drop offset exactly cancels to baseY; the frac wrap is the identity for on-board baseX). The visible mess was entirely rendering-side.
- The pre-Skia renderer had NO mount storm for plain modes — its 52 slots were permanently mounted (`CELEBRATION_OVERLAY_SLOT_COUNT` views rendered even while idle, opacity 0). The plan-doc narrative about a "mount storm" only ever applied to trail-ghost views. That's why celebration start could show frame 1 at progress≈0 pre-Skia and can't post-Skia (Canvas + texture init happen at start now) — hence the launch anchor.
- The launch anchor lives entirely in the overlay (worklet-side override of `launchEased`); `computeCelebrationFrame` still returns its own launchEased but the overlay ignores it. Mode math and the continuity suite are untouched.
- Mode-33 pass wraps (offscreen→base teleports) can't trip the continuity suite: wrap times are multiples of 0.01 raw (launchOrder·0.11 + n·5.72) and provably never coincide with the tested integer-raw boundaries (mod-11 argument), and the nearest wrap is ≥ 0.0086 raw from any boundary vs the ±0.0014 raw sample window.
- Anchored waiting-card handoff micro-overlap (accepted): when a card launches, the NEXT pile card appears immediately while the launched card is still visually held at base by the anchor blend (~100 ms) — two overlapping cards/shadows per pile for an instant. Invisible in practice; gating the successor's appearance on the anchored blend was judged overkill.
- `bindings.board` / `bindings.total` are no longer read anywhere (worklets capture a plain board constant from state — also kills the 1-frame "board=0 → frame null" hole at start). Removing them from `CelebrationBindings` + the controller is a cheap follow-up, not done here to keep scope.

## Identified issues

- None new during implementation (gates green). Device verification 2026-07-08: all five fixes confirmed on the A065, no issues found.

## Testing

- Cheap gates 2026-07-08: `yarn typecheck` + `yarn lint` + `yarn jest` green (28 suites / 276 tests; continuity suite unmodified and passing with the retuned 31/33 math).

## Device test results (round-3 subagent, A065, 2026-07-08)

Fresh `yarn release` (versionCode 13, install verified via lastUpdateTime). Artifacts: `.test-artifacts/celebration-round3-android/`.

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | Mode 33 start: one King per pile, single shadow | PASS — at ~2 s each pile shows exactly one card at the pile position with a single normal shadow; no fan, no dark blob (vs broken reference); Kings launch first (Q tops already showing as Ks fly) | `01-mode33-start-2s.png` |
| 2 | Mode 31 start: one card per pile (shuffled rank), no blob | PASS — 5♥ 8♦ K♣ 9♠ pile tops at ~4 s (shuffled = expected), single shadows, ghosts only on flying cards | `14-mode31-4s.png` |
| 3 | Launch feel (17/31/0 cold starts) | PASS — screenrecord frame grids show the very first celebration frames with all cards AT the foundations, semi-transparent (launch blend visible), easing out; no "already mid-pattern" jump on any of the three | `02-cold17-grid.png`, `03-cold31-grid.png`, `04-cold0-grid.png`, full-res `06/06b/06c/07-*.png` |
| 4 | Kings on top (mode 0) | PASS — pile fan shows K on top at start (K♥ top of fan in warm-start shot; K♠/K♥ topping clusters in cold frames) | `08-mode0-instant.png`, `09-mode0-pile.png` |
| 5 | Floor determinism (mode 33, two preview launches) | PASS — arcs bottom out at identical height (just above nav bar) in two separate preview runs | `10-mode33-runA-10s.png` vs `11-mode33-runB-10s.png` |
| 6 | Seamless repeat (~35 s) | PASS — at 36 s pile tops are J/J/Q/Q (second pass well underway, Kings relaunched right after the Aces), imprints keep accumulating; at 55 s deep into pass 2 (3/4/4/4 tops) with dense multi-band imprints | `12-mode33-runB-36s.png`, `13-mode33-runB-55s.png` |
| 7 | Arc variation | PASS — same-pile arcs differ visibly (bounce height/width); run A and run B patterns are decorrelated | same screenshots as 5/6 |
| 8 | Avalanche speed | PASS — all 52 cards launched by ~13 s (foundations empty at 13 s; was ~18 s); resting cards on floor, trails intact, no wobble | `15-mode31-13s.png` |
| 9 | Continuity sanity | PASS — mode 33 dev-hold past 60 s clean, abort instant (31/33/34/35), badge cycle incl. wrap 35→0 works | `22-24-badge-*.png` |
| 10 | Perf mode 33 @ 35–45 s (multi-pass stamping) | PASS — 1228 frames/10 s ≈ 123 fps, GPU 90th 5 ms | `gfx-mode33-40s.txt` |

Learnings: the phone dozed once mid-run (gfxinfo returned 0 frames / 4950 ms percentiles — that signature = screen off, not a perf problem); re-unlock and re-measure fixed it. One `input tap` abort at y≈500 px didn't register (likely swallowed near the HUD counters) — a second tap lower on the board aborted instantly; not a celebration defect.

## Testing handoff (device subagent — visual checks)

Read `.agents/skills/soli-testing/SKILL.md` first. `soli://?celebration=<id>#retry-N` deep links on the A065:

1. **Mode 33 start (items 1/2/3/B)**: at t≈0 each foundation pile shows EXACTLY ONE card — a King — perfectly at the pile position, single normal shadow (compare broken reference `.test-artifacts/celebration-polish2-android/05-imprint-05s.png`: fanned stack, dark shadow blob, "2♥ 2♦ 7♣ 3♠" tops). As each card launches, the next pile card (Q, then J, …) appears in its place; the pile creeps down ~2%·cardH per launch (intentional, mimics depletion).
2. **Mode 31 start**: same one-card-per-pile look at t≈0 — but the visible card is each pile's NEXT-TO-LAUNCH card (launch order is shuffled in 31, so a random rank per pile is EXPECTED here, unlike 33's Kings); when it launches, the pile's next launcher appears in its place; no shadow blob at any time; ghosts never pile up at the base.
3. **Launch feel (item A)**: modes 17, 31, 33 (+ spot-check 0): cards must visibly START from the foundation piles and ease out — no "already mid-pattern" first frame. Compare a cold start (first celebration after app launch — worst texture-init case) vs a badge cycle.
4. **Kings on top everywhere (item B)**: any non-staggered mode (e.g. 0) at t≈0: the pile fan shows K on top; mid-flight overlaps stay rank-ordered (higher rank above).
5. **Floor determinism (item 4)**: mode 33 preview from a FRESH board vs MID-GAME (undo dock visible) vs a real autosolve win — the bounce floor must sit at the same visible height (just above the nav bar) in all three.
6. **Seamless repeat (item 5)**: mode 33 — after the last Ace launches (~35 s), Kings launch AGAIN with no pause in cadence; second-pass arcs differ from the first (new bands stamp over old); loop restart at ~60 s still clears all imprints.
7. **Variation (item 6)**: consecutive cards from one pile fly visibly different arcs (bounciness, speed, fall).
8. **Avalanche speed (item 7)**: mode 31 noticeably brisker (all cards launched by ~12 s vs ~18 s before); still rests on the visible floor; trails intact.
9. **Continuity sanity**: mode 33 dev-hold past 60 s (clean restart), abort instant on 31/33, badge cycling 31→32→33 works.
10. **Perf spot-check**: mode 33 gfxinfo at ~15 s and ~45 s (multi-pass stamping now continues all run — expect still ~120 fps; the stamp rate is unchanged, passes just keep going).

## Follow-ups

- Remove `board`/`total` from `CelebrationBindings` + controller (no longer read by the overlay). Cheap, low-risk cleanup; do on next controller touch.
- Preview vs real-win `boardHeight` (NOT floorY) still differs slightly for mid-game previews (affects e.g. bounce-height scale by a few %); harmless, documented in the controller.

---

# Story: mode uplift pass + meteor variants

Status: DONE 2026-07-08 (implementation + device verification) — cheap gates green (28 suites / 278 tests, continuity suite unmodified). Device sweep 2026-07-08: all modes PASS or better-than-before; no broken modes; perf ~120–124 fps everywhere (see "Device test results" below).

## User prompt

> A: celebration 25 is boring. also 01, 02. 04, 07 11 14 18-> remove or improve? recommendation? 03: cool, but could play with speed, maybe faster when outside of ring? 05, 17 has potential, but hard to see concept as is 15 is interesting with large / small play. but goes too small, could also go large. this is a cool pattern in general. the underlying pattern without large small is not suuuper exciting.. Comments really cool: 6, 20 21 24 25 32 (this is amazing!!) quite cool: 12, 13 15 19 23 quite cool because of imprivements:10 27 30 (it's a square, not a diamond, tilt is wrong. or do the corners move? this wasn't clear at first) OK, but potential for more: 8, 9 22 28 (but 28 is really similar to another one), 29 (maybemake cards go around faster?) should we try more metor shower variants? crazy ones? idea: one with more cards visible at same time on screen, one with more trails? in general, speed variations, maybe playing with size, trails are really cool. i know that we might now run into doing too much of this. use your judgement. but still ok if we do some celebrations that are a bit crazy and we finetune from there. another idea: that even some params are randomized and then we sometimes have more crazy and sometimes less. but maybe not now because this will make it very hard to test and debug. just an idea for the future

## Summary

Creative uplift pass over 18 existing modes + 2 new Meteor variants (ids 34/35), implemented 2026-07-08. All changes are math/metadata in `computeCelebrationFrame` — renderer untouched. Orchestrator decisions applied: nothing removed (user culls later on device); 25 treated as KEEP + gentle de-bunching (it appeared in both the "boring" and "really cool" lists); really-cool modes 6/20/21/24/32 (+31/33) untouched; quite-cool 12/13/19/23/10/27 untouched. Highlights: 30 Diamond Drift is now a stationary upright rhombus (the old slow global spin rotated it through square orientations — that WAS the "square with wrong tilt"); 05 Starburst and 17 Clover were rebuilt so their concepts actually read (coherent radial firework / true 4-petal rose traced by the card train); 28 Big Bounce differentiated from Avalanche into a synchronized bouncing wall with a traveling stadium wave + impact squash; boring set (01/02/04/07/11/14/18) got speed warps, bigger amplitudes, scale play, and trails on the spread-out ones; 03 speeds up outside the ring (phase-locked to its radius breath); 29's cards travel the heart ~3.3× faster; 15 got real large/small play (0.75–1.75 scale) + formation sway — and 16 Pulse Orbit's scale floor was raised from 0.4 to 0.75 because the user's "goes too small" almost certainly described 16 (15's scale only varied ±5%). New: 34 Meteor Storm (4 coherent wave sheets, varied crossing angles, reduced offscreen span → clearly more cards visible, 4×50 ms trails) and 35 Shooting Stars (slow steep streaks with maxed 10×60 ms tails ≈ 2–3 card-heights of solid luminous trail; 572 sprites, well under budget). Continuity suite passes UNWEAKENED (278 tests, +2 for the new modes).

## Description

Per-mode device review by the user graded all 34 modes. This story improves every flagged mode in place (no removals this round) using the levers the user called out — speed variation, size play, trails, drama — and adds two deliberately crazier Meteor Shower siblings. Trail additions respect the overdraw learning: only modes whose cards SPREAD OUT got ghosts; clustered modes (5's core, 22's center) got none or short ones.

## Per-mode changes

| Id | Name | What changed | Expected visual delta |
| -- | ---- | ------------ | --------------------- |
| 1 | Lissajous Weave | Time-warped speed (±30% via sine warp), amplitudes up (~0.36/0.30R), scale play ±0.18, trail 3×70 ms | Figure sweeps rush-and-linger instead of metronomic; bigger, breathing, with tails |
| 2 | Pendulum Cascade | Amplitudes up (Y 0.38→0.44R, X wider fan), slow whole-field sway, scale play ±0.14, trail 2×80 ms | Taller swings that drift side-to-side as a group |
| 3 | Orbit Carousel | Angular speed phase-locked to radius breath: dAngle/dθ = 1.5 + 0.9·sin(radius phase) | Cards whip around while far out, glide when pulled in (user suggestion) |
| 4 | Ellipse Drift | Ellipse slowly precesses (tilt = θ·0.15), radii up, speed warp along the orbit, scale play ±0.15 | Rotating, swelling ellipse instead of a static oval |
| 5 | Starburst Spur | REBUILT: coherent radial firework — fixed spokes (normalizedIndex), shared smoothstepped burst from tight core to 0.48R, cards align to their spokes, scale grows outward | The starburst concept finally reads: fire together, retract together |
| 7 | Wave Loop | Speed warp on the loop, radii up + breathing, scale play ±0.12, trail 3×70 ms | Livelier loop with tails, no longer uniform |
| 8 | Ring Cascade | Cards spread WITHIN each ring (were clumped at one angle per ring), rings counter-rotate at ring-dependent speeds, ring-4 float bug clamped | Four full counter-rotating card circles instead of 4 orbiting clumps |
| 9 | Drift Orbit | Drift amp 0.12→0.18R, slightly faster orbit, scale play ±0.12, trail 2×80 ms | Drunker orbit with tails |
| 11 | Resonance Field | Shared resonance envelope (whole field swells 0.3×–1.1×), scale play ±0.15, trail 3×70 ms | Field collapses and erupts together — the "resonance" is now visible |
| 14 | Wave Sweep | Speed-warped sweep, amplitudes up, scale play ±0.12, trail 2×70 ms | Sweeps accelerate through center, taller ripples, tails |
| 15 | Constellation Waltz | Scale play widened to 0.75–1.75 (min clamped, max up), slow formation sway (center drifts on a Lissajous) | Real large/small drama; the whole constellation waltzes instead of sitting centered |
| 16 | Pulse Orbit | Scale floor raised 0.4→0.75, ceiling 1.0→1.3 (radius pulse kept) | Same pulse concept, cards never shrink to unreadable size (likely the real "goes too small" offender — see Summary) |
| 17 | Clover Spin | REBUILT: card train traces a true 4-petal rose r=\|sin 2φ\| that slowly spins; scale grows toward petal tips | An actual clover drawn by the cards (concept was invisible before) |
| 18 | Horizon Arc | Depth illusion: scale 0.77–1.33 tied to arc height (big at bottom = near), speed warp, radius up, trail 3×80 ms | Cards swing close and recede instead of flat circling |
| 22 | Vortex | Scale contrast deepened (0.57–1.05), swirl 1.2→1.35× speed, trail 3×60 ms | Deeper funnel feel with smeared arms |
| 25 | Flock | GENTLE: scatter cross-section ×2 (was very tight), path amps up ~15%, snake lag 0.05→0.06 | Same flock, visibly looser and longer — fixes the over-tight bunching |
| 28 | Big Bounce | REBUILT for differentiation from Avalanche: synchronized bouncing WALL (tight card spacing spanning the width), traveling stadium wave (phase by column), giant heights (up to ~0.62 boardHeight), impact squash pop, shared slow envelope | Reads as one choreographed wave-wall, not scattered bouncing columns |
| 29 | Heartbeat | Travel speed along the heart outline θ·0.15→θ·0.5 (~3.3×); pulse untouched | Cards visibly race around the heart (user request) |
| 30 | Diamond Drift | Global spin REMOVED (it rotated the rhombus through square orientations — the reported "square, wrong tilt"), taller-than-wide rhombus (0.30R × 0.46R), gentle size breath, faster perimeter drift | Unmistakable upright diamond, corners pinned up/down/left/right |
| 34 | Meteor Storm (NEW) | See design below | Dense wave-sheets of meteors at varied angles |
| 35 | Shooting Stars (NEW) | See design below | Slow steep streaks with very long solid tails |

Untouched: 0, 6, 10, 12, 13, 19, 20, 21, 23, 24, 26, 27, 31, 32, 33 (protected/quite-cool lists + 0 and 26 which the user didn't flag).

## New mode designs

- **34 Meteor Storm** — Meteor Shower's crazy sibling, tuned for "more cards visible at once". Three levers: (a) asymmetric offscreen span (top endpoint 3.5·cardH, bottom 2.5·cardH vs 32's 4/4 — smaller offscreen share ⇒ ~0.68 of the cycle visible vs 32's ~0.60); (b) cards arrive in FOUR coherent wave sheets (quarter-cycle phase groups with a tight speed spread 2.1–2.28 cycles/raw — sheets slowly decohere into continuous storm over the run); (c) per-card crossing angles (slope 0.35–0.9 boardWidths of horizontal drift, alternating direction) so sheets cross each other. Depth parallax via per-card constant scale 0.8–1.25 + breath. Trail 4×50 ms. 260 sprites. Continuity: x and y wrap on the SAME cycle while y is ≥0.5·cardH past the exemption margins (checked against the suite's sampling slack).
- **35 Shooting Stars** — the long-trail variant: 10 ghosts × 60 ms (tail ≈ 600 ms ≈ 2–3 card heights at the chosen speeds — ghosts overlap into a solid luminous streak). Flights are SLOWER (0.9–1.4 cycles/raw) and steeper (x factor 0.6 of the shared cycle) than 32 so the tails read majestically instead of frantically; lanes spread via seeded cross offsets (no clustered overdraw despite 52×11 = 572 sprites — trivial for the Atlas, verified < 1000 budget).

## Steps to implement

- [x] 1. Add this story section (before coding). DONE.
- [x] 2. `celebrationModes.ts`: all per-mode math/metadata changes from the table + new cases/metadata 34/35 (appended, stable-id contract). DONE.
- [x] 3. Cheap gates: `yarn typecheck && yarn lint && yarn jest` — continuity suite UNWEAKENED (new modes join automatically). DONE — green, 28 suites / 278 tests (+2 for modes 34/35), test file untouched.
- [x] 4. Device verification (SEPARATE combined testing subagent): DONE 2026-07-08, see "Device test results" below.

## Plan: Files to modify

- `src/animation/celebrationModes.ts` (only file — math/metadata pass)
- This plan doc.

## Files actually modified

- `src/animation/celebrationModes.ts` — per-mode uplift math + trail/metadata changes + new modes 34/35.
- This plan doc. Nothing else (renderer, controller, types, tests untouched).

## Intermediary learnings

- Mode 30's "square, wrong tilt" was the mode's own `spin = θ·0.2` global rotation: an L1-ball diamond rotated by ~45° IS an axis-aligned square, so the shape cycled diamond→square every ~7 s. Corner-pinned shapes must not have a global spin (inline comment added so it isn't reintroduced).
- Mode 8's cards within a ring all shared one angle (`angle = θ + ring·0.3` — no per-card term), so each "ring" was actually an orbiting clump; the radius-side seed smear hid the bug visually. Spreading within the ring is what makes it read as rings at all.
- Speed variation that must correlate with a geometric quantity (mode 3: faster when far out) is cleanest as a phase term whose derivative matches the target: angle += −c·cos(radiusPhase) gives dAngle ∝ sin(radiusPhase) = normalized radius — continuous by construction, no state.
- The user's "15 goes too small": mode 15's scale only varied 0.95–1.05, while adjacent mode 16's drops to 0.4 with the radius collapsing too — 16 is almost certainly the observed offender. Both fixed (15 got the instructed widened range, 16 got its floor raised); flag to user in the report.
- Offscreen-exemption margin math for reduced spans (mode 34): the suite needs `pathY ≤ −3·cardH` above / `≥ board + 2·cardH` below at BOTH samples around a wrap; endpoints at 3.5/2.5·cardH leave ~0.5·cardH slack vs ~5 dp of half-frame movement at storm speeds — safe, but do NOT shrink below 3.5/2.5.

## Identified issues

- None during implementation (gates green).
- Device round-3 verdict on the removal-candidate watch: 28 Big Bounce now reads clearly DIFFERENT from Avalanche 31 (coherent W-shaped wall with a traveling wave vs staggered fall+bounce piles) — no removal flag from the test side; user culls on device.
- No broken modes found in the round-3 sweep (nothing blank/frozen/obviously wrong).

## Testing

- Cheap gates 2026-07-08: `yarn typecheck` + `yarn lint` + `yarn jest` green — 28 suites / 278 tests (+2: modes 34/35 join the continuity suite automatically); `test/unit/animation/celebrationModes.test.ts` untouched.

## Device test results (round-3 subagent, A065, 2026-07-08)

Fresh `yarn release` (versionCode 13). Sweep screenshots in `.test-artifacts/celebration-round3-android/` (`sweep-<id>.png`, `-b` suffix = second phase shot). Verdicts against the story's expected visuals:

| Id | Mode | Verdict | Note |
|----|------|---------|------|
| 30 | Diamond Drift | PASS | Unmistakable upright rhombus, taller than wide, corners pinned up/down/left/right |
| 5 | Starburst Spur | PASS | Tight core at one phase, full radial spoke-aligned ring at another — the firework cycle reads clearly |
| 17 | Clover Spin | PASS (soft) | 3–4 lobes visible in stills and cold-start frames; reads best in motion, weakest of the rebuilds but clearly better than the old blob |
| 28 | Big Bounce | PASS | Coherent W-shaped wall of touching card columns — clearly distinct from Avalanche 31 |
| 3 | Orbit Carousel | NOTE | Full even ring in still; fast-outside/slow-inside not judgeable from stills — needs eyeball in motion |
| 29 | Heartbeat | PASS | Crisp readable heart outline; travel speed not judgeable from a still, shape intact |
| 15 | Constellation Waltz | PASS | Wreath with visibly mixed card sizes (~0.75–1.75), formation drifted across screen between shots |
| 16 | Pulse Orbit | PASS | No unreadable minis (floor raise works); caught collapsed pulse phase in both stills — radius spread unconfirmed from stills |
| 8 | Ring Cascade | PASS | Full donut of cards spread within rings — no orbiting clumps |
| 25 | Flock | PASS | Elongated diagonal snake at 9 s (looser/longer); still compact mid-turn at 4.5 s — bunching fix visible |
| 9 | Drift Orbit | PASS | Ghost tails visible, drunker orbit cluster |
| 22 | Vortex | PASS | Funnel with smeared trail arms; 1207 frames/10 s ≈ 121 fps |
| 1 | Lissajous Weave | PASS | Trails + snake sweep clearly livelier |
| 2 | Pendulum Cascade | PASS | Wide fan with ghost trails and group sway |
| 4 | Ellipse Drift | PASS | Precessing tilted ellipse train with trails (two shots, orientation changed) |
| 7 | Wave Loop | PASS | Loop train with strong visible tails |
| 11 | Resonance Field | PASS | Field collapse phase caught (tight swarm + tails); 1237 frames/10 s ≈ 124 fps |
| 14 | Wave Sweep | PASS | Sweeping band with tails, taller ripples |
| 18 | Horizon Arc | PASS | Near/far depth read: big cards at bottom, small receding up; trails visible |
| 34 | Meteor Storm (NEW) | PASS | Clearly MORE cards visible than 32 (crossing wave sheets at varied angles); badge label correct; dev-hold >60 s + abort OK |
| 35 | Shooting Stars (NEW) | PASS | Long solid luminous streaks ~2–3 card heights; badge label correct; dev-hold >60 s + abort OK |

Perf (gfxinfo reset → 10 s → dump; ~120 Hz device, flag < ~110 fps → none flagged):

| Mode | Window | Frames/10 s | ≈fps | GPU 50th/90th |
|------|--------|-------------|------|----------------|
| 35 Shooting Stars (572 sprites, new max) | ~5–15 s | 1237 | 124 | 5/5 ms |
| 34 Meteor Storm | ~50–60 s | 1235 | 124 | 5/5 ms |
| 11 Resonance Field (new trail, clustered) | ~5–15 s | 1237 | 124 | 5/5 ms |
| 22 Vortex (new trail, funnel cluster) | ~5–15 s | 1207 | 121 | 5/5 ms |
| 33 Cascade Imprint (multi-pass stamping) | 35–45 s | 1228 | 123 | 5/5 ms |
| 0 Spiral Bloom (control) | ~5–15 s | 1229 | 123 | 5/5 ms |

UI-thread 90th percentile 13–16 ms everywhere (14–16 ms on 35 — the 572-sprite worklet costs a couple ms more but stays comfortably under the 120 Hz deadline envelope for GPU work; no dropped-frame signature).

Sweep learnings: pulse/burst modes (5/15/16) need TWO stills at different phases for a fair verdict — a single ~4 s shot regularly lands on the collapsed phase and looks falsely broken. Speed-based claims (3, 29 travel speed, 31 "faster") are only partially judgeable from stills; 31's speedup WAS verifiable structurally (piles empty by ~13 s vs ~18 s before).

## Testing handoff (device subagent)

Read `.agents/skills/soli-testing/SKILL.md` first. `soli://?celebration=<id>#retry-N` on the A065. Per mode, what to look for:

1. **30 Diamond Drift**: unmistakable upright diamond, taller than wide, corners pointing exactly up/down/left/right and NOT rotating (only gentle size breathing). This was the round's headline fix.
2. **05 Starburst Spur**: cards fire outward together along radial spokes from a small core, grow on the way out, retract — a firework, repeated every ~4 s.
3. **17 Clover Spin**: the card train draws a visible 4-petal clover that slowly spins.
4. **28 Big Bounce**: one synchronized wall of cards spanning the screen width, giant bounces with a wave traveling across it, squash pop at the floor. Judge: does it still feel like Avalanche 31? (If yes → removal candidate.)
5. **03 Orbit Carousel**: cards noticeably faster when swung far out, slower gliding near center.
6. **29 Heartbeat**: cards clearly race around the heart outline (~3× the old crawl); double-thump pulse unchanged.
7. **15 Constellation Waltz**: dramatic large/small card sizes mixed at once (up to ~1.75×), whole formation sways around the screen.
8. **16 Pulse Orbit**: pulse intact but cards never shrink into unreadable minis.
9. **Boring set 01/02/04/07/11/14/18**: each should read clearly livelier — speed rushes/lingering, bigger sweeps, size play; trails visible on 1/7/11/14/18 (2–3 ghosts), on 2/9 (2 ghosts), 22 (3 ghosts). Watch for any perf dip on 11/22 (densest new-trail modes) — gfxinfo spot-check one of them.
10. **25 Flock**: same flock behavior, visibly looser/longer snake — no tight bunching.
11. **08 Ring Cascade**: four full rings of cards counter-rotating (not 4 clumps).
12. **09 Drift Orbit / 22 Vortex**: tails + more size contrast; vortex funnel deeper.
13. **34 Meteor Storm (NEW)**: clearly MORE cards on screen than 32, arriving in coherent sheets that cross at different angles; smooth. gfxinfo 10 s window (260 sprites + trails — expect ~120 fps).
14. **35 Shooting Stars (NEW)**: slow, steep streaks with LONG solid tails (~2–3 card heights). gfxinfo 10 s window (572 sprites — the round's sprite-count max; expect ~120 fps, flag anything below).
15. **Continuity sanity**: badge-cycle 33→34→35→0 wraps correctly; abort instant on 34/35; dev-hold loop past 60 s on 34/35.

## Follow-ups

- **Randomized params per run** (user idea, explicitly deferred): pick some mode params (amplitude, speed, trail length) from a seeded range at celebration start, so runs vary between calmer and crazier. Pros: replay freshness, one mode = many moods. Cons (why deferred, per user): very hard to test/debug — device reports become non-reproducible; needs a seed-pinning dev override first (e.g. `?celebration=30&seed=42`) before it's tolerable. Revisit after the mode roster is culled and stable.
- After the user's on-device culling round: retire rejected modes per the stable-id contract (delete metadata + case, never renumber).

---

# Story: pile position stability + Windows-authentic imprint layering

Status: DONE 2026-07-08 — implemented, cheap gates green (28 suites / 278 tests, continuity suite untouched), A065 device verification PASSED (stable flat piles in 31/33, Windows-authentic tracers-over-piles layering in 33, clean loop restart/abort, ~133 fps). Results in "Testing" below.

## User prompt

> great progress! 31 and 33 definitely still start from different starting position. some cards are a bit higher than others in tableau and some a bit lower. also definitely changes throughout the celebration. pls investigate and fix. this also makes the another K behind last A weird because it arrives at a slightly different position. is it also possible that the k is just loaded when the a already left? making it unsmooth and teleporty? for 33: should card in tableau be in front of the tracers the other cards left behind? how is that in the classic windows solitaire celebration? looks kind of out of place for me. recommendations?

(User evidence screenshots: `Screenshot_20260708-134438` — mode 31, foundation waiting cards at visibly different heights; `Screenshot_20260708-134445` — mode 33.)

## Summary

All three tasks implemented + device-verified 2026-07-08. (1) Root cause of the drifting pile positions: `computeCelebrationCardBase` subtracted `stackIndex · 2%·cardH` from every card's baseY — a visual fan from the ORIGINAL Nov-2025 view-renderer celebration (commit 533114b, uncommented; the draw order was shuffled then, so the fan was the only depth cue for the stacked pile). With rank-sorted draw order + the one-visible-card pile rule it only produced drift: each successor card sat 2%·cardH lower, the pile top crept down through the run, and mode 33's repeat King arrived 24%·cardH above the departed Ace. Removed entirely for ALL modes (flat piles, like the real foundation). (2) Handoff timing was ALREADY frame-exact in both modes (same-formula boundary-inclusive thresholds on both sides; the mode-33 wrap reveal coincides exactly with the pile's Ace launch) — the "teleporty" impression was purely the base offset from (1); no timing change needed. (3) Windows-authentic layering for mode 33: waiting piles are no longer live Atlas sprites — they are STAMPED into the accumulating imprint surface (global chronological reveal counter: reveal m = launchOrder + pass·deck, due at (m − 4)·interval = the predecessor's launch frame; Kings stamp at run start and re-stamp at every pass wrap), so tracers from later flights paint OVER the piles and each reveal re-paints over crossing tracers, exactly like the Win 3.1/95 framebuffer. Live Atlas sprites for 33 = only in-flight cards. Mode 31 keeps live-sprite piles (no imprint surface there; tasks 1+2 fixed it).

## Root causes (investigated)

1. **Per-stackIndex 2%-cardH base offset** (`useCelebrationController.computeCelebrationCardBase`): introduced with the very first celebration implementation (Nov 2025, view renderer) as `cardOffsetY = stackIndex * (cardMetrics.height * 0.02)` — no comment/rationale in the commit. Purpose (reconstructed): a subtle vertical fan so the 13 co-located cards of a pile read as a stack at launch in the all-at-once modes (pre-Skia the draw order was shuffled, so without the fan the pile was just one card's face with 12 invisible behind it). Post cascade-fixes (rank-sorted draw order + one-visible-card rule for 31/33) the fan is pointless for all modes and actively harmful for the staggered ones: waiting tops at different heights per rank, pile top creeping down ~2%·cardH per launch, and the mode-33 repeat King arriving 12·2% = 24%·cardH above the Ace's spot. Removed for ALL modes (not scoped): the all-at-once modes look CORRECT with a flat stack (that's what the real foundation looks like at the moment of the win), and rank-sorted draw order shows a clean King face.
2. **Handoff timing (user's "K loaded when A already left?")**: not a timing bug. Mode 33: successor becomes visible at `-rel <= 4·interval` — equality holds exactly at the predecessor's launch frame; wrap King at `cycle − tSince <= 4·interval` — equality holds exactly at the pile's Ace launch. Mode 31: `rawNow < prevLaunchRaw[slot]` hides the waiting top strictly BEFORE the predecessor's launch and shows it at equality, while the predecessor's own pre-launch branch tests `spriteRaw < launchRaw[slot]` — at equality it switches to the flight path at tSince 0 = exactly base. Both handoffs are same-formula, boundary-inclusive, no off-by-one; with (1) fixed they are pixel-invisible.
3. **Mode 33 piles floating over tracers**: the Atlas draws AFTER the imprint `<Image>` in the canvas, and waiting piles were live Atlas sprites — so piles always rendered above every tracer. Real Win 3.1/95 is a painter's algorithm on a never-cleared framebuffer: the pile cell is painted when a card is revealed and then anything that flies across it paints OVER it (the cell is only "re-revealed" when the next card is dealt off).

## Decision (orchestrator, matching real Windows behavior)

Waiting piles in mode 33 must NOT float in front of tracers → stamp them into the imprint surface: at pass start stamp each pile's top (Kings), on each launch stamp the newly revealed successor (paints over tracers crossing the cell). Exhausted cell keeps whatever was last painted; repeat-pass wrap re-stamps Kings (falls out of the per-pass reveal times); progress-wrap clear, abort gating, end fade all unchanged (surface machinery already handles them). Mode 31 keeps live-sprite piles.

## Steps to implement

- [x] 1. Add this story section (before coding). DONE.
- [x] 2. Task 1: remove the per-stackIndex offset from `computeCelebrationCardBase` (drop the now-unused `stackIndex` param); inline comment with the rationale + git provenance. DONE.
- [x] 3. Task 2: verify handoff thresholds line up exactly (no code change expected — document the analysis). DONE — analysis above, no change needed; device-verify.
- [x] 4. Task 3: mode-33 colors worklet shows ONLY in-flight cards; `CascadeImprintLayer` stamps pile reveals into the surface — implemented as a GLOBAL chronological reveal counter (reveal m = launchOrder + pass·deck, due (m − 4)·interval; a per-slot replay in shuffled slot order would leave a wrong face on a pile after a surface-clear catch-up) + `slotByLaunchOrder` lookup; reveals drawn BEFORE the tick's flight imprints; reset with the existing clear path. DONE.
- [x] 5. Gates: `yarn typecheck && yarn lint && yarn jest` (continuity suite builds its own assignments with constant baseY — unaffected). DONE — green, 28 suites / 278 tests.
- [x] 6. Device verification (A065): mode 33 stable identical pile positions at 2/15/40 s, tracers paint over piles, re-stamp on reveal, wrap King exact; mode 31 four same-height stable cards; sanity (abort, loop restart, gfxinfo). DONE — all PASS, see Testing.

## Plan: Files to modify

- `src/features/klondike/hooks/useCelebrationController.ts` (offset removal)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (mode-33 pile stamping + visibility)
- This plan doc. NOT `celebrationModes.ts` (math untouched), NOT the unit test.

## Files actually modified

- `src/features/klondike/hooks/useCelebrationController.ts` — per-stackIndex base offset removed (flat piles, all 13 cards of a pile share one exact position); `stackIndex` param dropped from `computeCelebrationCardBase`; rationale + git provenance in an inline comment.
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — mode-33 waiting piles stamped into the imprint surface (global chronological reveal counter + `slotByLaunchOrder`, reveals drawn before flight imprints, reset via the existing clear path); colors-worklet mode-33 branch reduced to in-flight-only; comments updated.
- This plan doc. Nothing else (`celebrationModes.ts` and the unit test untouched).

## Intermediary learnings

- The 2% fan predates every renderer story (original Nov-2025 celebration commit, uncommented) — archaeology beats assumption: it was a depth cue for shuffled draw order, obsoleted twice over by rank-sorted draw order and the one-visible-card pile rule.
- The handoff thresholds were already exact; when a position handoff "feels teleporty", check the POSITIONS the two sides render at before suspecting the timing.
- Reveal stamps MUST replay chronologically after a surface clear: all cards of a pile share one cell, so the last-drawn reveal is the visible pile top — replaying per-slot in the shuffled assignment order could leave a wrong face on a pile. Hence the single global reveal counter + `slotByLaunchOrder` lookup instead of per-slot bookkeeping.
- Painter's-algorithm reveal on device: right after a launch, the departing card's own dense early-fall stamps cover the freshly revealed cell for a moment (the card barely moves in the first samples) — authentic (Windows painted the flying card over the just-revealed cell too) and reads correctly.

## Identified issues

- None new. Gates green; device verification found no defects.

## Testing

- Cheap gates 2026-07-08: `yarn typecheck` + `yarn lint` + `yarn jest` green (28 suites / 278 tests; continuity suite untouched — its fixture builds its own assignments with constant baseY, unaffected by the controller change).
- **A065 device verification (DONE 2026-07-08)**: `yarn release` 37 s incremental, install verified (versionCode 13, fresh lastUpdateTime), launch OK. Artifacts in `.test-artifacts/celebration-pile-fix-android/` (`crop-*` = foundation-row zooms).
  1. **Mode 31 pile stability — PASS** (`31-02s.png`/`crop-31-02s.png`, `31-08s.png`/`crop-31-08s.png`): all four waiting cards (9♥ 6♦ K♣ 8♠ at 2 s; 3♥ 3♦ 4♣ J♠ at 8 s) sit at EXACTLY the same height, top edges pixel-aligned with the clean-board foundation slots (`crop-foundations-clean.png` reference from the abort shot) — no fan, no creep between 2 s and 8 s.
  2. **Mode 33 pile position — PASS** (`crop-33-02s.png`): the K♠ reveal stamp sits exactly on the spades slot; the other pile cells are covered by the launching Kings' dense early-fall bands — the authentic painter's-algorithm look.
  3. **Tracers paint OVER piles — PASS** (`33-15s.png`, `33-40s.png`): pile cells are painted into the imprint field and later flights' bands cross OVER them; freshly revealed faces (7♥ at 15 s, Q reveals after the loop restart) read cleanly on top of older bands. No pile floats above the tracer field anymore.
  4. **Wrap / repeat — PASS** (`33-33s-wrap.png`, `33-40s.png`): pass-2 bands (Q/J at 40 s) emanate from the same pile origins as pass 1 with no vertical offset (the 24%·cardH King jump is gone); the wrap crop shows the four Ace bands at identical heights with Kings re-stamped beneath.
  5. **Sanity — PASS**: abort instant on both modes (`abort-after.png`, `31-abort.png` — clean untouched board, no residue); dev-hold loop restart at 60 s clears ALL imprints and relaunches Kings from clean piles (`33-loop-64s.png` shows only fresh pass-1 K/Q bands 4 s after the wrap).
  6. **Perf — PASS** (`gfx-33-40s.txt`, 10 s window at ~40 s, multi-pass stamping + reveals active): 1328 frames ≈ 133 fps, modern janky 0.00%, frame 50th/90th 12/13 ms, GPU 50th/90th 5/5 ms — at/above the pre-change ceiling (reveal stamps are ~1 extra one-off draw per launch, noise).

## Follow-ups

- None specific to this story. Note: `CelebrationCardConfig.stackIndex` is still used (stackFactor, draw order, launch order) — only the base-position use was removed.

---

# Story: foundation alignment root cause + imprint shadow + wild imprint mode

Status: DONE 2026-07-08 — all three tasks implemented, cheap gates green (28 suites / 279 tests, continuity suite unweakened, mode 36 auto-covered), A065 device verification PASSED (alignment matrix all four entries, shadow-free 33 imprints, Spirograph 36 at ~122 fps). Results in "Testing" below.

## User prompt

> now the cards in the foundation are not moving anymore. great! but they don't seem to be in the exact same spot as the game. in. fact, there is no spacing to the left border at all. and the distance between the cards seems to big. see screenshot. in your latest screenshot, it looks good! actually, i found a really weird behaviour!! directly after running yarn release, it looks good. but then when playing a game (i triggered the demo game) or running yarn celebration 31, the cards are off again. super strange. pls investigate the root cause and fix. one minor nitpick: on 33, the shadows get really strong after many cards. after this: one new celebration with mechanism from 33 but not classic, but wild

(User evidence screenshots: `Screenshot_20260708-144927` — mode 33, cascade bands with the leftmost pile flush against the left screen edge and the K♠ pile beside the dashed spades slot instead of on it; `Screenshot_20260708-144633` — mode 31, waiting piles left of and wider-spaced than the real foundation slots.)

## Summary

All three tasks done + device-verified 2026-07-08. (1) Root cause of the state-dependent misalignment: `resetDemoRuntimeState` (every demo launch/playlist game load) and `performDealAgain` (every new deal) CLEARED `foundationLayoutsRef`/`topRowLayoutRef` — but React Native only re-fires `onLayout` when a frame CHANGES, and a new deal keeps the board geometry identical, so the refs stayed empty for the rest of the app process and every later celebration used the `FOUNDATION_FALLBACK_GAP` fallback (piles flush left, cardW+16 spacing instead of cardW+5). Fix: never clear the refs (they're geometry measurements, not game state; onLayout keeps them fresh on real geometry changes). Reproduced before / verified after on the A065 across all four entry paths. (2) Mode 33 shadow compounding: imprint stamps now draw only the FACE of the atlas cell (src rect crop + antialiased rounded-rect dst clip — the clip is needed because baked shadow bleeds into the corner notches inside the face bbox); dense 40 s imprint fields are now clean white with crisp borders, the live flying card keeps its shadow. (3) New mode 36 "Spirograph": all 52 cards fly at once on quasi-periodic hypotrochoid orbits (4 per-suit curve families, incommensurate satellite frequencies, counter-precession) while the generalized imprint layer engraves ROTATED/SCALED stamps on an absolute lattice — the engraving builds into a fine-lined mandala over the full 60 s (one tuning pass: first cut saturated to a white disk by 15 s → halved sweep speed, tightened satellite to 0.34·A, smaller cards 0.52–0.67). ~122 fps with stamping active.

## Root cause (Task 1, investigated)

`computeCelebrationCardBase` reads `topRowLayoutRef` + `foundationLayoutsRef` and falls back to `suitIndex · (cardWidth + FOUNDATION_FALLBACK_GAP=16)` with a `{0,0}` top-row offset when they are empty. Those refs are populated ONLY by `onLayout` (TopRow row + the four foundation slot views) — and React Native re-fires `onLayout` only when a view's frame actually CHANGES, not on re-render. Two code paths CLEAR the refs:

1. `useDemoGameLauncher.resetDemoRuntimeState()` — runs on every demo launch AND on every playlist game load;
2. `useKlondikeGame.performDealAgain()` — runs on every new deal (manual New Game, `?reset=game`, `?deal=`).

After any of these, the board keeps the exact same geometry (TopRow and the slot views stay mounted at unchanged frames — WinCleanupPile hides via opacity on purpose), so `onLayout` NEVER re-fires and the refs stay empty for the rest of the app process. Every later celebration (preview deep link, real demo win, real win) then uses the fallback: baseX = 0/1/2/3 · (cardW+16) with no left gutter (real slots: topRowX + BOARD_COLUMN_GAP + suitIndex · (cardW + 2·BOARD_COLUMN_MARGIN) = cardW+5 spacing). That is exactly "no spacing to the left border" + "distance between the cards too big". Fresh launch after `yarn release` works because the mount-time `onLayout` HAS fired and nothing cleared the refs yet.

Fix: stop clearing the refs (both sites). The measured layouts are the same source of truth the board renders from; `onLayout` keeps them fresh on any REAL geometry change (resize, remount), and clearing them can only ever force the fallback — there is no scenario where the cleared state is more correct than the last measurement. The `FOUNDATION_FALLBACK_GAP` fallback stays as a pre-first-layout safety net only.

## Task 2 — imprint stamp shadows (mode 33 nitpick)

Hundreds of overlapping stamps compound the baked cell shadow into dark halos. Fix: stamp only the FACE of the atlas cell — src cropped to the face rect (cell inset by shadowMargin) AND dst clipped to the face's rounded-rect path (`clipRRect`), because the baked shadow also bleeds into the corner notches INSIDE the face bounding box (outside the rounded arc); an exact-bounds crop alone would accumulate dark corner dots on repeatedly re-stamped pile cells. The clip keeps the inside-drawn border fully and removes all shadow. The LIVE flying card keeps its shadowed sprite.

## Task 3 — new wild imprint mode (id 36 "Spirograph")

All 52 cards fly at once on quasi-periodic hypotrochoid (spirograph) orbits — four curve families (one per suit) at different annuli/frequencies, slowly precessing — while the imprint surface engraves their traces. Over 60 s the opaque rotated stamps build a dense interwoven mandala. As implemented:

- Case 36 math: per-suit family g: mid radius A = R·(0.17 + 0.08·g), satellite B = 0.34·A, non-integer incommensurate frequency q = 2.4 + 0.93·g (quasi-periodic → the trace never retraces itself, fills its annulus band); 13 cards per family spread along the curve via stackIndex; alternating travel direction + slow counter-precession per family; card rotation linear in the curve parameter (continuous, no atan2 wrap); constant per-family targetScale 0.52–0.67 so the engraving reads fine. Continuous by construction (pure sines, no frac wraps) → continuity suite passes unweakened (+1 test).
- Imprint machinery generalized minimally: `CascadeImprintLayer` takes `modeId`; mode 36 skips pile reveals and uses an absolute deterministic sample lattice (sample j at raw = (j+1)·`SPIRO_STAMP_INTERVAL_RAW` = 0.01) instead of 33's per-launch flight windows; stamps are rotated/scaled via canvas save/translate/rotate/scale/clipRRect/drawImageRect/restore (mode 33 passes rotation 0 / scale 1 through the same path). Stamp budget ≈ 9 stamps/frame at 120 Hz.
- Metadata: `{ id: 36, name: 'Spirograph', wobble: false }`, no trail (the surface IS the trail). Loop restart clears, abort instant, end fade covers the surface — same contracts as 33 (all machinery shared).
- Tuning pass (allowed single iteration, taken): first cut (A 0.16+0.075·g, B 0.45·A, sweep 0.32+0.03·g, scale 0.62–0.80) saturated the mandala into one solid white disk by ~15 s — 30 s and 55 s stills were near-identical. Halving the sweep speed (0.17+0.02·g), tightening the satellite (0.34·A) and shrinking the cards keeps the engraving BUILDING across the whole run with readable fine-lined family rings.

## Steps to implement

- [x] 1. Add this story section (before coding). DONE.
- [x] 2. Task 1: remove the ref-clearing lines in `resetDemoRuntimeState` + `performDealAgain` (inline root-cause comments). Repro'd broken behavior on old build first (fresh=aligned, after demo=fallback positions), verified fixed after. DONE.
- [x] 3. Task 2: face-crop + rounded-rect clip for ALL imprint stamps (33 flights, 33 reveals, 36). DONE.
- [x] 4. Task 3: case 36 + metadata in `celebrationModes.ts`; generalize `CascadeImprintLayer`; colors worklet full-alpha branch for 36. DONE (+1 tuning iteration on device).
- [x] 5. Cheap gates: `yarn typecheck && yarn lint && yarn jest` (continuity suite auto-covers 36, unweakened). DONE — green, 28 suites / 279 tests.
- [x] 6. Device verification (A065): alignment matrix (fresh / after demo / after repeated celebration links / real win), 33 shadow-free imprints, 36 visuals + perf + abort/loop. DONE — all PASS, see Testing.
- [x] 7. Update this story (summary, files, learnings, testing results). DONE.

## Plan: Files to modify

- `src/features/klondike/hooks/useDemoGameLauncher.ts` (drop ref clears)
- `src/features/klondike/hooks/useKlondikeGame.ts` (drop ref clears)
- `src/animation/celebrationModes.ts` (case 36 + metadata + stamp-interval const)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (stamp crop/clip, layer generalization, mode-36 branches)
- This plan doc.

## Files actually modified

- `src/features/klondike/hooks/useDemoGameLauncher.ts` — `resetDemoRuntimeState` no longer clears the layout refs (root-cause comment inline); `foundationLayoutsRef`/`topRowLayoutRef` props removed from the hook entirely (no remaining use).
- `src/features/klondike/hooks/useKlondikeGame.ts` — `performDealAgain` no longer clears the layout refs (comment inline); launcher call site updated.
- `src/animation/celebrationModes.ts` — metadata id 36 "Spirograph" (wobble off, no trail), `SPIRO_STAMP_INTERVAL_RAW = 0.01`, case 36 hypotrochoid math (incl. the tuning-pass values + rationale comment).
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — `ClipOp` import, `SPIRO_MODE_ID`, `usesImprintSurface` mount condition, colors-worklet full-alpha branch for 36, `CascadeImprintLayer` generalized (`modeId` + `faceRadiusPx` props, `stampFace` face-crop/rrect-clip helper used by reveals + both flight sample schedules, mode-36 absolute lattice).
- This plan doc. NOT the unit test (continuity suite covers 36 automatically).

## Intermediary learnings

- The ref clearing dated from the original demo-test-games commit (3ca4037, Jun 2026) — it was safe THEN only by accident (celebrations were rare and boards were remeasured more often); the one-visible-frame contract that breaks it (`onLayout` fires only on frame CHANGES) was always true. Geometry measurements should never be treated as resettable game state.
- `yarn celebration` links do NOT trigger the bug by themselves (no ref clear on that path) — the user's "after running yarn celebration 31" repro almost certainly had a demo game or New Game in between. Verified on device: two consecutive warm celebration links on the old build stayed aligned; the demo game (or Deal Again) broke every celebration after it.
- The baked cell shadow bleeds INSIDE the face bounding box at the rounded corners (the notch between the corner arc and the bbox corner), so a rect src crop alone still accumulates dark corner dots over repeated re-stamps — the antialiased `clipRRect` on the dst is required.
- agent-device on this machine: named sessions need `--session <name>` on EVERY command that supports it, and the interaction command is `press` (not `tap`); `--device 192.168.1.12:5555` fails, use the device NAME (`A065`).
- Mode 36 stamps every frame (absolute lattice) → one surface snapshot per frame, unlike 33's bursty cadence. Still ~122 fps, but it lifted the 90th-percentile frame time from ~13 to ~20 ms — watch before adding another every-frame-stamping mode on top.

## Identified issues

- None open. Gates green; device verification found no defects after the mode-36 tuning pass.

## Testing

- Cheap gates 2026-07-08: `yarn typecheck` + `yarn lint` + `yarn jest` green — 28 suites / 279 tests (+1: mode 36 joins the continuity suite automatically); test file untouched.
- **A065 device verification (DONE 2026-07-08)**, artifacts in `.test-artifacts/celebration-alignment-android/`:
  1. **Repro on OLD build (pre-fix)**: fresh cold start + `?celebration=31` → piles aligned with the dashed slots (`repro-fresh-31.png`); second warm celebration link → still aligned (`repro-warm2-31-2s.png`); after ONE demo autosolve game → piles at fallback positions, leftmost flush against screen edge, too-wide gaps (`repro-after-demo-31-2s.png`, `repro-after-dealagain-31-2s.png`) — user report reproduced exactly.
  2. **Alignment matrix on FIXED build — all PASS** (clean-board slot reference `00-clean-board.png`): (a) fresh launch (`01-matrix-fresh-31.png`), (b) after a demo autosolve win + Deal Again (`02-matrix-after-demo-31.png` — the exact previously-broken path), (c) after repeated celebration deep links 33→31 (`03-matrix-repeat-links-31.png`), (d) real win via nearwin fixture — celebration fired correctly on the real win (mode 24, `16-matrix-realwin-2s.png`) and the immediately following staggered-mode preview after Deal Again aligned (`18-matrix-after-newgame-31.png`); real wins share `computeCelebrationCardBase` with all verified paths. Waiting piles sit pixel-on the dashed slots with the correct left gutter and cardW+5 spacing in every case.
  3. **Mode 33 stamp shadows — PASS**: at 40 s (multi-pass, densest field) the imprint bands are clean white card faces with crisp borders — no dark compounding (compare `.test-artifacts/celebration-pile-fix-android/33-40s.png` where dense areas darkened); no shadow slivers, no clipped borders on reveals (`04-mode33-05s.png`, `06-mode33-40s.png`). The live flying card keeps its drop shadow.
  4. **Mode 36 Spirograph — PASS** (after 1 tuning iteration): v2 builds a fine-lined engraved mandala across the whole 60 s (`12-mode36v2-10s.png`, `13-mode36v2-30s.png`, `14-mode36v2-55s.png` — visibly evolving, no white-disk saturation; v1 saturation kept as `07/08-mode36-*.png` for reference). Badge label "Celebration 36 · Spirograph" correct; abort instant with zero residue (`11-mode36-abort.png`); dev-hold loop restart clears the surface and rebuilds (`09-mode36-loop2.png`).
  5. **Perf — PASS**: mode 36 gfxinfo 10 s window at ~30 s with stamping active: 1218 frames ≈ 122 fps (v1: 1199 ≈ 120), GPU 90th 6 ms, frame 90th 20 ms (elevated vs the 13 ms baseline — every-frame surface snapshots; no aggregate frame drops, above the ≥110 fps bar).

## Follow-ups

- Mode 36's every-frame surface snapshot is the new heaviest imprint pattern (90th frame time 20 ms at 122 fps). If a future mode needs more headroom, snapshot every Nth stamp frame instead — trade: the newest ≤N stamps lag one tick behind the live card. Not needed now.
- Real-win alignment in a staggered mode (matrix d) was verified indirectly (shared code path + post-win preview) — if you ever want it airtight, `yarn nearwin`, win manually, then badge-cycle to 31 and compare piles to slots.

---

# Story: remove layout fallback, hide slot outlines, launch-order z

Status: DONE 2026-07-08 (implementation + verification) — cheap gates green (28 suites / 279 tests, continuity suite unweakened). Device verification: Android A065 covered the outline hypothesis + no-dashes + abort-restore + the task-3 z-order money shot + mode-0 spot-check, then the phone dropped off WiFi (~70 min unreachable, polling exhausted); the remaining checks (mode 33, real-win path, post-deal celebration, fallback log sanity) were completed on the iOS simulator (same JS code paths). The new build IS installed and verified on the A065 (versionCode 13, 16:23) — an optional Android re-run of the remaining checks needs no rebuild.

## User prompt

> 1. Why do we have a fallback for this? what are failure modes? remove and let it fail so that we make it rock solid? 2. sometimes the foundation outline stays, most of the time it vanished. not 100% clear how to reproduce. e.g. right now it's the case on the android phone. i just ran yarn celebration 31 before. 3. on 31 and other similar ones with cards that fly from the foundation and have traces: the first card that leaves is in front of the cards that remain on the foundation. but the tracers (what's the right word for this?) are behind the cards that remain on the foundation.

## Summary

All three tasks implemented + verified 2026-07-08. (1) Fallback removed: `computeCelebrationCardBase` now returns null (loud `[SoliDev]` warn) when the layout refs are unmeasured; both the win path (`buildCelebrationState` → existing `start_skipped_no_state` cleanup) and the preview path early-return — no celebration ever renders synthetic positions again; `FOUNDATION_FALLBACK_GAP` and the controller's now-dead `cardMetrics` param deleted. (2) Outlines: confirmed the dashes were the REAL board's empty-slot `FoundationPile` outlines showing through the transparent celebration canvas (fresh board = empty foundations = dashes; real wins/mid-game covered them) — the outline + muted suit glyph now hide while `celebrationActive` (prop was already wired for the glow). (3) Mode 31 z: the true mechanism was the rank-sorted draw order making z between a flying card (+ contiguous ghosts) and each waiting pile top RANK-determined — arbitrary per pairing; mode 31 now uses reverse launch order (earlier-launched draw above later/waiting; all other modes keep the rank sort). Device-verified: flying Aces + their ghosts render over waiting piles (impossible before), start state clean, modes 0/33 and the real-win flow unaffected, zero fallback warnings in the logs.

## Description

Follow-up round on the alignment story. Three orchestrator-decided fixes: (1) the `FOUNDATION_FALLBACK_GAP` synthetic base-position fallback in `computeCelebrationCardBase` masked the alignment bug for days — remove it and refuse to start a celebration without measured layouts (fail loudly, dev warning); (2) the dashed empty-foundation outlines of the REAL board show through the celebration on fresh boards (empty foundations) — hide them while a celebration is active; (3) in mode 31, z-order between flying cards (+ trail ghosts) and the waiting piles is rank-determined, i.e., arbitrary per card — switch mode 31 to reverse-launch-order draw order so flying cards and their trails always render above waiting piles.

## Root causes (investigated)

1. **Fallback failure modes (item 1)**: `computeCelebrationCardBase` falls back to `suitIndex · (cardW + 16)` from a `{0,0}` top-row origin whenever `topRowLayoutRef`/`foundationLayoutsRef` are empty. The only ways they can be empty: (a) a celebration before the FIRST-ever board `onLayout` — impossible on the real win path (you cannot win before the board laid out; even the preview deep link needs `boardLayout` which is measured by the same board) and (b) code that CLEARS the refs — the exact bug class fixed in the previous story. The fallback therefore only ever turns detectable bugs into plausible-but-wrong renderings. Removed; celebration start now bails with a loud `[SoliDev]` warning when a layout is missing.
2. **Sticking dashed outlines (item 2)**: the dashes are NOT celebration residue — they are the real board's `FoundationPile` empty-slot outlines showing through the (transparent-background) celebration canvas. Fresh board = all four foundations empty = four dashed outlines + muted suit glyphs visible under/next to the celebration; real win / mid-game = foundations hold cards → `showEmptyOutline` false → nothing (during celebrations `AbsoluteCardLayer` returns no items, and the with-cards `FoundationPile` renders border-width 0). That is why the symptom "sometimes stays, mostly vanished" tracks the board state, not the celebration. Confirmed on device (see Testing).
3. **Card in front / tracers behind (item 3)**: a card and its trail ghosts can NEVER split in z — the Atlas draw order is per-slot contiguous `[oldest ghost … newest ghost, card]`. The real mechanism: draw order between DIFFERENT cards was rank-sorted (Kings-on-top contract), so a flying card + trail draws above waiting-pile tops of LOWER rank and below tops of HIGHER rank — arbitrary per pairing, since both the flying card's and each pile top's rank are effectively random in mode 31's shuffled launch order. Two amplifiers make the trail the visible victim: (a) the trail lingers over a pile much longer than the fast card does, so behind-the-pile clipping is mostly observed on ghosts; (b) even when a ghost IS drawn above a waiting card, its ~11–45% white translucency is nearly invisible on the white card face (white-on-white) while it reads clearly on green felt — perceptually "the trail goes behind the pile". The card the user watched happened to cross lower-ranked tops (or none) → "card in front, tracers behind".

## Decision (orchestrator)

- Task 1: no fallback; empty refs at celebration start ⇒ early return, loud dev-only warning, both win and preview paths. Rationale: failing loudly beats rendering plausible-but-wrong positions; the only theoretical gap (celebration before first-ever board onLayout) is unreachable in real flows.
- Task 2: hide the empty-slot dashed outline + suit glyph while a celebration is active — the overlay owns that screen area. Cheapest wiring: `FoundationPile` already receives `celebrationActive`.
- Task 3: mode 31 only (the only staggered mode with LIVE waiting piles — 33/36 stamp piles into the imprint surface, 20 has no waiting piles) gets a reverse-launch-order draw permutation: earlier-launched cards (with their contiguous ghost blocks) draw ABOVE later-launching/waiting ones. All other modes keep the rank sort (Kings-on-top contract).

## Steps to implement

- [x] 1. Add this story section (before coding). DONE.
- [x] 2. Task 1: `computeCelebrationCardBase` returns null without measured layouts; win + preview paths bail with `devLog('warn', …)`; remove `FOUNDATION_FALLBACK_GAP`; update stale comment references. DONE — also removed the now-unused `cardMetrics` param from the controller (only the fallback spacing used it).
- [x] 3. Task 2: `FoundationPile` hides the dashed outline + suit glyph when `celebrationActive`. DONE.
- [x] 4. Task 3: per-mode draw order in `CelebrationOverlayLayer` — mode 31 sorts by launch order descending; others keep the rank sort. DONE.
- [x] 5. Cheap gates: `yarn typecheck && yarn lint && yarn jest` (continuity suite unweakened). DONE — green, 28 suites / 279 tests, test file untouched.
- [x] 6. Device verification: A065 covered checks 1–4 (outline hypothesis, no-dashes + abort restore, task-3 z-order, mode 0); phone dropped off WiFi → remaining checks (mode 33, real-win, post-deal, log sanity) completed on the iOS simulator. DONE — all PASS, see Testing.
- [x] 7. Update this story (summary, files, learnings, results). DONE.

## Plan: Files to modify

- `src/features/klondike/hooks/useCelebrationController.ts` (fallback removal + bail-outs)
- `src/features/klondike/constants.ts` (drop `FOUNDATION_FALLBACK_GAP`)
- `src/features/klondike/hooks/useDemoGameLauncher.ts` / `useKlondikeGame.ts` (comment wording only — they reference the removed constant)
- `src/features/klondike/components/cards/FoundationPile.tsx` (outline hiding)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (per-mode draw order)
- This plan doc.

## Files actually modified

- `src/features/klondike/hooks/useCelebrationController.ts` — `computeCelebrationCardBase` returns null (with a loud `[SoliDev]` warn) when `topRowLayoutRef`/`foundationLayoutsRef[suit]` are unmeasured; `buildCelebrationState` returns null → the existing `start_skipped_no_state` path unlocks the board; `startCelebrationPreview` early-returns; `FOUNDATION_FALLBACK_GAP` import and the now-unused `cardMetrics` param removed.
- `src/features/klondike/constants.ts` — `FOUNDATION_FALLBACK_GAP` deleted (no remaining references).
- `src/features/klondike/hooks/useKlondikeGame.ts` — dropped `cardMetrics` from the controller call; ref-clearing comments reworded (no longer reference the removed constant).
- `src/features/klondike/hooks/useDemoGameLauncher.ts` — comment wording only.
- `src/features/klondike/components/cards/FoundationPile.tsx` — `showEmptyOutline` now also requires `!celebrationActive` (prop already wired for the glow); the muted suit glyph follows the same condition.
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — `drawOrder` is per-mode: mode 31 sorts by `assignment.index` DESCENDING (reverse launch order — earlier-launched cards + their contiguous ghost blocks draw above later/waiting ones); all other modes keep the rank sort (Kings-on-top contract). Mechanism + why-per-mode comment inline.
- This plan doc.

## Intermediary learnings

- Task 3's split-looking symptom cannot be a real card/ghost z split (per-slot sprite blocks are contiguous); it is the RANK-determined z between different cards, amplified by (a) the trail lingering over piles far longer than the fast card and (b) white ~11–45% ghosts being nearly invisible on white card faces even when drawn above. Reverse launch order fixes the real half and makes the perceptual half consistent (ghosts now always tint the pile face from above).
- The task-3 verification screenshot practically designed itself: a flying ACE (lowest rank — bottom of everything under the old rank sort) crossing a waiting 5♦ pile with its ghosts clearly rendering OVER the pile card is the strongest possible confirmation of the new order.
- `cardMetrics` in the celebration controller existed ONLY for the fallback spacing — removing the fallback made the whole param dead. Controller API shrank by one prop.
- The A065 can vanish from WiFi mid-session for an hour+ (three 10–15 min ping polls exhausted). The iOS simulator covered the remaining checks without weakening the verdict much: everything tested is platform-independent JS/Skia logic, and the Android-specific halves (outline hiding, z-order) had already passed on the phone before the drop. The freshly built APK stays installed, so an Android re-run needs only deep links, no rebuild.
- `?reset=game` while the real-win "Deal Again" dialog is open deals the new game UNDER the still-open dialog (deep link bypasses the modal on purpose; the dialog stays until tapped). Pre-existing, dev-only quirk — noted so future testers don't read it as a bug.

## Identified issues

- None open. Gates green; all device checks passed on their respective platforms; no code iteration was needed after the initial implementation.

## Testing

- Cheap gates 2026-07-08: `yarn typecheck` + `yarn lint` + `yarn jest` green (28 suites / 279 tests; continuity suite untouched — draw order is renderer-side, no math change).
- **A065 device verification (2026-07-08)**, artifacts in `.test-artifacts/celebration-zorder-android/` (`yarn release` 38 s, install verified versionCode 13, fresh lastUpdateTime 16:23):
  1. **Outline hypothesis — CONFIRMED**: fresh board baseline shows the four dashed empty-slot outlines (`00-fresh-board-baseline.png`); they are the REAL board's `FoundationPile` views, not celebration residue.
  2. **No dashes during celebration — PASS**: `?celebration=31` on the fresh board at 2 s and 3.5 s (`01-mode31-2s.png`, `02-mode31-3.5s.png`): zero dashed outlines anywhere while waiting piles + flying cards render; abort tap → untouched fresh board with all four outlines back (`04-after-abort-outlines-back.png`).
  3. **Task 3 z-order — PASS** (THE check): `01-mode31-2s.png` + crop `01b-mode31-2s-crop-piles.png` catch a flying 7♥ AND a flying A♦ with their trail ghosts crossing the waiting piles — both the cards and the translucent ghosts render clearly IN FRONT of the waiting pile tops (the A♦ ghosts tint over the 5♦ pile face; under the old rank sort an Ace + its ghosts would have rendered under EVERYTHING). Start state still clean single cards per pile (`03-mode31-start.png`, 4♥/J♦/3♣/5♠ with launch-fade ghosting of the first launches).
  4. **Mode 0 spot-check — PASS**: rank order unchanged, Kings visibly on top of overlapping clusters (`05-mode0-start.png`, `05b-mode0-3s.png`); no dashed outlines during the run.
  5. Mode 33 spot-check, real-win path, and the fallback-warning log sanity: the A065 dropped off WiFi mid-session (unreachable by ping for 45+ min; `android-ready.sh` discovery exhausted) — these remaining checks were completed on the **iOS simulator** instead (`yarn ios` Release, install verified build 13; same JS code paths, artifacts in the same folder):
     - **Mode 31 (iOS re-verify)**: no dashed outlines during the run; z-order correct — flying A♣ + its ghosts render clearly OVER the waiting 5♣ pile top (`07-ios-mode31-2s.png`, `08-ios-mode31-3.5s.png` — an Ace above anything is impossible under the old rank sort).
     - **Mode 33 spot-check — PASS**: Kings-first imprint cascade unaffected by the draw-order change (its piles are stamped, not live sprites); bands/reveals normal (`09-ios-mode33-3s.png`, `09b-ios-mode33-7s.png`).
     - **Real-win path — PASS**: `?demo=autosolve&games=1` → win → `[Celebration] start {cards: 52, mode: 33}` fired normally (log-verified), celebration renders with the dialog on schedule (`10-ios-realwin-celebration.png`), board returns correctly after the 60 s run — four Kings on foundations, no visual issues (`11-ios-realwin-dialog.png`); Deal Again → clean fresh board with outlines back (`13-ios-board-after-dealagain.png`).
     - **Post-deal celebration — PASS**: `?reset=game` + `?celebration=31` right after the real win: waiting piles sit exactly on the foundation slots (`12-ios-after-dealagain-31.png`) — the alignment-story path stays fixed with the fallback gone.
     - **Fallback-removal sanity — PASS**: full `[SoliDev]` stream captured across all runs — zero `MISSING FOUNDATION LAYOUT` warnings, zero `preview skipped`/`start_skipped` events; every celebration start logged 52 cards.

## Follow-ups

- OPTIONAL: re-run the iOS-substituted checks (mode 33, real-win, log sanity) on the A065 once it is back on WiFi — the build is already installed, only deep links needed. Low value (platform-independent logic, Android-specific halves already passed) — recommend skipping unless paranoid.
- The trail-ghost white-on-white perceptual note (learnings): if trails should read over white card faces too, a subtle ghost tint or border would help — cosmetic, not requested, recommend leaving as is.

---

# Story: ten crazy modes 37–46

Status: DEVICE-TESTED 2026-07-09 on the A065 — all ten NEW modes (37–46) pass their design-intent checks; ONE regression FAIL: mode 33 Cascade Imprint crashed the app (worklet TypeError). RESOLVED same day — the 33 crash is FIXED and 42 re-tuned to 117–119 fps in the follow-up story "mode-33 crash fix + Warp Drive/Kaleidoscope perf" below.

## User prompt

> implement all

(In response to the assistant's 10-mode suggestion table, reproduced here 1:1:)

| Id | Name | Concept |
|----|------|---------|
| 37 | Pinball | Cards ricochet off all four screen edges at wild angles; imprint stamped ONLY at each wall-impact point — walls accumulate impact marks over 60 s |
| 38 | Pollock | Cards tumble chaotically (rotation + scale variation) stamping imprints at random rotations/scales along their paths — action painting |
| 39 | Fireworks | Volleys launch up from the bottom and burst into 13-card suit-colored shells with long trails; faint imprints linger at burst points |
| 40 | Black Hole | Cards spiral into a slowly wandering center, shrinking + accelerating as they approach, vanish at the core, re-emerge from screen edges |
| 41 | Dominoes | Cards line up in rows standing "upright", then topple in a traveling wave — rotation about the BOTTOM EDGE (express as center rotation + compensating center-position arc around the bottom-edge pivot — pure math, NO renderer anchor change), re-stand, topple the other way |
| 42 | Warp Drive | Hyperspace: cards streak radially outward from a center with maxed trails; every ~8 s a "jump" — new random center (teleport allowed ONLY via fully-offscreen transit or continuous re-aim; continuity test must pass) |
| 43 | You Win | Cards fly along letter strokes stamping imprints that spell a short message (e.g. "YOU WIN!" over two lines, or "WIN!" — pick what fits a portrait board legibly; define stroke polylines in normalized coords, cards traverse strokes stamping densely) — message assembles over the run |
| 44 | Solar System | Four suit "planets" (face cards) on elliptical orbits around a pulsing central cluster, number cards as moons orbiting their suit's planet — hierarchical orbits, trails on planets |
| 45 | Gravity Flip | Cards bounce on the dock-aware floor; every ~8 s gravity inverts and they fall UP to the ceiling and bounce there; stamps an imprint at each floor/ceiling rest |
| 46 | Kaleidoscope | 13 cards fly one 90° wedge; the other three wedges show the SAME motion mirrored/rotated 4-fold (assign 13 cards per wedge running identical wedge-local math with reflected transforms); imprints build a symmetric mandala |

## Summary

All ten modes (ids 37–46) implemented 2026-07-08 as `computeCelebrationFrame` cases + appended metadata (stable-id contract kept). The imprint surface was generalized from the hardcoded 33/36 pair to a metadata-driven per-mode config: `metadata.imprint = { policy: 'cascade' | 'path' | 'events', alpha? }` decides surface mounting and stamp paint alpha, and two exported worklet schedule functions (`getImprintStampCount` / `getImprintStampRaw`, plus `getImprintStreamCount` for pinball's two wall-impact streams) give every imprint mode a closed-form write-once stamp schedule — mode 33's flight-window sampler and 36's lattice moved into the same schedule switch, so the renderer now has ONE generic stamp loop (pile reveals stay cascade-only). Six new modes stamp (37 events, 38 path, 39 events faint, 43 path, 45 events, 46 path); all schedules are deterministic from progress, so loop-restart clear / abort / end-fade machinery is inherited unchanged. Continuity suite passes UNWEAKENED (289 tests, +10). Cheap gates green. Device test = next subagent.

## Per-mode design notes (as implemented)

| Id | Name | Design | Imprint | Trail | Wobble |
|----|------|--------|---------|-------|--------|
| 37 | Pinball | Two independent per-card triangle waves (ping-pong x and y at incommensurate frequencies) = straight diagonals reflecting off all four edges; bottom wall is the dock-aware floor. Impact times are the integer lattice of each tri-wave argument — shared between mode math and stamp schedule via `pinballParams` | events (2 streams: x walls, y walls), stamp exactly at each reflection | — | off |
| 38 | Pollock | Per-card incommensurate 2-tone sine sums cover the whole canvas; fast seeded spin (direction alternating) + deep scale oscillation 0.25–0.85 | path lattice every 0.02 raw (~3.8 stamps/frame) → rotated/scaled splatter | — | off |
| 39 | Fireworks | 4 shells = suits, staggered quarter-cycle (burst every ~3.2 s): eased ascent from below-screen to a per-cycle hashed burst point, then 13-card radial burst with quadratic droop that carries every card fully offscreen bottom before the cycle wraps (offscreen exemption). Smoothstep fades at both cycle ends | events: 1 faint stamp (alpha 0.3) per card per cycle at u=0.34 (small ring around the burst point) | 6×60 ms | off |
| 40 | Black Hole | Slowly wandering hole center; per-card cycle: fly in from a FIXED per-card offscreen edge anchor, spiral in with radius (1−w)^1.4 and cubically accelerating angle, shrink to 0.25 and fade out at the core, then invisible smoothstep transit back to the SAME edge anchor — cycle wrap is position-continuous (no teleport at all), re-emergence reads as "from the edges" | — | — | on |
| 41 | Dominoes | 4 rows × 13 columns of half-scale cards (rank-order layout = draw order, so fallen overlaps layer consistently); global cycle: rightward topple wave → re-stand wave → leftward topple (bottom-LEFT corner pivot) → re-stand, all clamped smoothsteps, φ exactly 0 at the cycle wrap. Bottom-edge pivot done as center rotation + compensating center arc c = c0 + v − R(φ)v around the scaled bottom corner (v = s·(±w/2, h/2)) — pure math, renderer anchor untouched | — | — | off |
| 42 | Warp Drive | Per-card fixed radial direction from a jump center; radius r: accelerating outward power curve to 1.15·boardHeight (offscreen for every direction) for 70 % of the cycle, then an invisible eased return to r=0 — wrap continuous (r=0 both sides). Center: per-epoch (1.4 raw ≈ 8 s) hash target, CONTINUOUS smoothstep re-aim over the last 0.18 raw — the permitted "continuous re-aim" teleport | — | 10×50 ms (maxed, 572 sprites) | on |
| 43 | You Win | "YOU" / "WIN!" over two lines as normalized stroke polylines (module-level table, arc-length parametrized with 2× y-weight for portrait aspect), CLOSED into a loop by a final pen-up connector; a card TRAIN (phases clustered over 18% of the loop) sweeps it at 0.2 laps/raw (lap ≈ 29 s — SPEED-CAPPED, see learnings); pen-up connectors between glyphs carry a smoothstep opacity dip to 0 — live cards fade across gaps and the stamp loop skips samples with targetOpacity < 0.98, so ink lands only on strokes. Upright, scale 0.34 | path lattice every 0.008 raw (~9 stamps/frame, message inked over ≈ one lap ≈ 29 s, then re-inked) | — | off |
| 44 | Solar System | Kings = 4 planets on tilted precession-free ellipses (per-suit radii/speeds/directions); Aces = pulsing 4-card core cluster; ranks 2–J = 11 moons per suit on per-rank radii/speeds/directions around their planet (hierarchical: moon pos = planet pos + orbit). Kings-on-top draw order puts planets above their moons | — | 2×80 ms (mode-wide — see deviations) | off |
| 45 | Gravity Flip | Per-card lane; gravity epochs of 1.4 raw ≈ 8 s: closed-form fall (per-card delay + fall time) from the previous rest plane to the other plane, geometric-restitution bounces (k ≤ 0.65 so rest is guaranteed before the epoch ends), then rest — epoch boundaries are position-continuous by construction. Floor = dock-aware visible floor, ceiling = board top | events: 1 stamp per card per epoch at the rest moment (alternating floor/ceiling marks) | — | off |
| 46 | Kaleidoscope | Wedge = suit; wedge-local motion depends ONLY on stackIndex (identical across wedges): polar Lissajous inside the 90° wedge + local spin. Odd wedges REFLECT across their start axis (angle and spin negated — true kaleidoscope D4 symmetry; the card face itself can't be mirrored, negated spin is the standard approximation), then rotate by wedge·90° + slow global precession | path lattice every 0.012 raw (~6 stamps/frame) → 4-fold symmetric mandala | — | off |

Deviations from the table: 44's trails are mode-wide (planets AND moons get 2 short ghosts) — the trail config is per-mode in the renderer; per-card ghosts would need renderer surgery, and short moon trails read fine. 39's "long trails" are 6×60 ms (not literally maxed — 42 owns the max). Everything else is as specced.

## Imprint config generalization

- `CelebrationMetadata.imprint?: { policy: 'cascade' | 'path' | 'events'; alpha?: number }` — presence mounts the imprint surface (`CascadeImprintLayer`); `alpha` is the stamp paint alpha (39 uses 0.3 for faint burst marks). 33 = cascade (keeps its bespoke pile reveals + live-card visibility windows), 36/38/43/46 = path, 37/39/45 = events.
- Schedules live NEXT TO the mode math in `celebrationModes.ts` (they share per-card constants via `pinballParams`/`gravityFlipParams`): `getImprintStampCount(modeId, assignment, rawProgress, totalCards, stream)` = cumulative stamps due (monotonic), `getImprintStampRaw(modeId, assignment, n, totalCards, stream)` = raw time of stamp n, `getImprintStreamCount(modeId)` = independent event streams per card (2 for pinball's x/y walls, else 1). Mode 33's flight-window sampler and 36's lattice were MOVED into this switch verbatim — the renderer's stamp loop is now one generic per-slot/per-stream write-once loop.
- Stamp skip rules (renderer loop, counted but not drawn): (a) `frame.targetOpacity < 0.98` — how 43's pen-up connectors stay un-inked without any renderer-side path knowledge; (b) non-cascade stamps whose anchored launch blend has not saturated — a blended stamp would ink a base→path lerp position (fatal for 43's message, stray ink elsewhere). Cascade 33 keeps its blended early-fall stamps (part of its authentic pile band, device-verified in the pile-stability story). Side effect: mode 36 no longer inks its first ~0.26 raw (~1.5 s) of blended mandala start — negligible/cleaner, flagged for the device run.
- Budgets: 38 ≈ 3.8, 43 ≈ 9.4, 46 ≈ 6.3 stamps/frame at 120 Hz (same class as 36's ~7.5 — every-frame surface snapshots, watch the 90th-pct frame time); 37 ≈ 0.4, 45 ≈ 0.05, 39 ≈ 0.03 stamps/frame (bursty). All far under the 52/frame ceiling. Loop-restart catch-up redraws everything in one pass (existing 33/36 behavior).

## Steps to implement

- [x] 1. Add this story section (before coding). DONE.
- [x] 2. `celebrationModes.ts`: metadata 37–46 (+ imprint field, imprint entries for 33/36), constants + shared param helpers, WIN stroke table, schedule exports, cases 37–46. DONE.
- [x] 3. `CelebrationOverlayLayer.tsx`: metadata-driven imprint mounting, generic schedule-driven stamp loop (streams + paint alpha + opacity threshold), colors-worklet generalization (non-cascade imprint modes render live cards at full path opacity, no launch fade — same reasoning as 33/36). DONE.
- [x] 4. Cheap gates: `yarn typecheck && yarn lint && yarn jest` (continuity suite UNWEAKENED, auto-extends to 289). DONE — green.
- [x] 5. Update this story (files, learnings, testing handoff). DONE.
- [x] 6. Device verification (SEPARATE testing subagent — not this run): see "Testing handoff". DONE 2026-07-09 on the A065 — all 10 new modes pass; mode 33 regression CRASH found (see Identified issues); perf flag on 42 (and mildly 46).

## Plan: Files to modify

- `src/animation/celebrationModes.ts` (metadata + cases + schedules)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (imprint generalization)
- This plan doc.

## Files actually modified

- `src/animation/celebrationModes.ts` — `imprint` metadata field + entries (33 cascade, 36 path, new modes per table); metadata ids 37–46 appended; constants (`FIREWORK_CYCLE_RAW`, `GRAVITY_FLIP_EPOCH_RAW`, lattice intervals); helpers `fract`/`smooth01`/`pinballParams`/`gravityFlipParams`; WIN stroke-path table (module-level, built once); schedule exports `getImprintStreamCount`/`getImprintStampCount`/`getImprintStampRaw` (33's sampler + 36's lattice moved in verbatim); cases 37–46.
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — imprint mounting/policy/alpha from metadata; `CascadeImprintLayer` stamp loop generalized to schedule functions + per-card streams + paint alpha + `targetOpacity < 0.9` skip; colors worklet: non-cascade imprint modes use path opacity × endFade (launch fade dropped, ghost multipliers kept for 39); `SPIRO_MODE_ID`/`IMPRINT_SAMPLES_PER_CARD`/inline samplers deleted.
- This plan doc. NOT the unit test (auto-covers the new modes), NOT controller/types/KlondikeGameView.

## Intermediary learnings

- Zero-derivative junctions are the cheap way to pass `expectSmooth`: every opacity/scale/position phase transition in the new modes uses smoothstep (derivative 0 at both ends), so the boundary-vs-reference delta ratio stays bounded even when a test sample lands exactly on a junction. Piecewise-LINEAR ramps are risky: a sample straddling a plateau→ramp kink has reference delta ≈ 0 and the slack is only 2 dp / 0.01.
- **The one continuity failure of the round (mode 43, first cut)**: polyline junctions kink each axis's velocity — an axis can move ~0 before a junction (reference delta ≈ 0) and ~1 dp per half-frame after it, and at ping-pong speed 0.4 that overshot the 2 dp slack. Fix: the path is CLOSED into a loop (final pen-up connector back to the first stroke, so plain `fract()` traversal is position-continuous at its wrap) and the sweep speed capped at 0.2 laps/raw ≈ 1.4 dp per half-frame window. The speed cap is documented in the case — do not raise it without re-deriving.
- The "same edge anchor for exit and re-entry" trick (mode 40) makes a vanish/re-emerge cycle fully position-continuous — no offscreen exemption needed at all. Cheaper to reason about than lattice-tuned wrap times.
- Event schedules must derive from the SAME per-card constants as the mode math — putting both in `celebrationModes.ts` and sharing tiny param worklets (`pinballParams`, `gravityFlipParams`) removes the drift risk that renderer-side duplication would have.
- Mode 41's pivot math: with the renderer rotating about the sprite CENTER, rotation about a bottom corner is center' = pivot + R(φ)·(center − pivot) = center + v − R(φ)v with v = center→pivot; at φ=0 the offset vanishes, so pivot switches (right corner vs left corner) are free while standing.
- 46's mirror is conjugation: reflect the wedge-LOCAL vector across the wedge start axis (negate local angle), then rotate by the wedge transform. Card spin must be negated on mirrored wedges too or the stamps break symmetry.
- `getImprintStampCount` counting for phase-offset periodic events (39): first valid cycle index m0 = ceil(offset − u_stamp) and count = floor(raw/T + offset − u_stamp) − m0 + 1 — clamped at 0 — is the closed form that stays exact across suit phase offsets.

## Identified issues

- None during implementation (gates green). Watch-list for the device run: every-frame snapshot cost when 38/43/46 stamp continuously (36 precedent: ~122 fps but 90th-pct frame time ~20 ms); 42's 572 sprites + 10-ghost overdraw; 39's burst clustering (13 cards + 6 ghosts near one point).
- **FIXED (2026-07-09, follow-up story below) — mode 33 Cascade Imprint CRASHED on device (regression, found 2026-07-09 device run)**: `soli://?celebration=33` killed the app within ~1 s of the overlay mounting. Crash-buffer stack (reproduced twice, deterministic): `com.facebook.jni.CppException: undefined is not a function — TypeError at celebrationModesTs7 (:1:461) at CelebrationOverlayLayerTsx6 at useAnimatedReaction`. Almost certainly the imprint-config generalization: `getImprintStampCount` case 33 calls `getImprintLaunchOrder`, which is now defined AFTER the schedule functions in `celebrationModes.ts` (line ~589 vs ~477) — Reanimated worklet closures capture other worklets by reference at build time, and a hoisting/closure-ordering gap leaves the reference `undefined` on the UI runtime (typecheck/jest can't catch this; JS-thread tests call the plain function which hoists fine). Modes 36–46 all share the same schedule switch and do NOT crash — only the 33 path (the only case calling another worklet defined later in the file). NOT fixed in the testing run per rules. Fix candidate: move `getImprintLaunchOrder` above `getImprintStampCount` (or inline it) and re-verify 33 on device.
- Perf: mode 42 Warp Drive misses the 110 fps bar — ~93–101 fps effective, 20–31 % modern janky, 90th pct 24–25 ms (confirmed by re-measure). 46 Kaleidoscope is borderline: ~107–109 fps, 90th pct 17–19 ms. Everything else ≥ 113 fps. See perf table in "Testing".

## Testing

- Cheap gates 2026-07-08: `yarn typecheck` + `yarn lint` + `yarn jest` green — 28 suites / 289 tests (+10: modes 37–46 join the continuity suite automatically); `test/unit/animation/celebrationModes.test.ts` untouched.

### Device run 2026-07-09 (A065, physical, versionCode 13 fresh install; artifacts in `.test-artifacts/celebration-crazy-modes-android/`)

Per-mode verdicts (badge label correct on all; abort instant on 37 + 42; no crash on ANY new mode):

| Id | Mode | Verdict | Notes | Key screenshots |
|----|------|---------|-------|-----------------|
| 37 | Pinball | PASS | Straight diagonals, reflections at all 4 edges (bottom = visible floor); marks accumulate ON the walls only — center stays clean; abort instant | `37-mid-25s.png`, `37-late-50s.png` |
| 38 | Pollock | PASS | Chaotic tumble, rotated/scaled stamps; dense collage by 25 s but NO white-blob saturation at 50 s (card faces keep structure); loop restart at ~65 s cleared the surface | `38-late-50s.png`, `38-loop-65s.png` |
| 39 | Fireworks | PASS | Volleys rise from bottom with trails, 13-card suit-colored radial bursts, faint ring imprints linger at burst points, bursts move per cycle; celebration feel: good | `39-early-8s.png`, `39-late-50s.png` |
| 40 | Black Hole | PASS | Spiral-in with shrink+fade at core, re-entry from edges; no mid-screen pops seen across 4 samples over ~40 s; look is sparse (~15–20 cards visible — rest in invisible transit), by design | `40-early-6s.png`, `40-mid2-30s.png` |
| 41 | Dominoes | PASS | THE bottom-pivot check passes: tilting cards keep their bottom corner on the row baseline, fallen cards rest flat on the line, overlapping like real dominoes; wave travels, re-stands, reverses; rows rock-still between waves | `41-burst-2.png`, `41-burst-4.png`, `41-burst-6.png` |
| 42 | Warp Drive | PASS (visual) / FLAG (perf) | Radial streaks with long trails; jump = continuous re-aim, no teleports seen; perf below bar (see table) | `42-early-5s.png`, `42-jump-13s.png` |
| 43 | You Win | PASS | Money check: "YOU WIN!" fully legible by 30 s (partial but recognizable at 15 s), holds through 45 s; no ink on pen-up gaps; re-ink cycle visible at 55 s/70 s (message clears at lap wrap and rebuilds — see note below) | `43-15s.png`, `43-30s.png`, `43-45s.png` |
| 44 | Solar System | PASS (with note) | Hierarchy reads: King planets with moon swarms tracking them, pulsing Ace core, trails on planets; composition sits low-center and moons hug planets tightly — reads as blobs at times (polish candidate, not a defect) | `44-early-6s.png`, `44-late-35s.png` |
| 45 | Gravity Flip | PASS | Floor rest above the dock, gravity inversion to ceiling rest ~every 8 s, imprint rows build on BOTH planes; loop restart at ~67 s cleared imprints | `45-flip-12s.png`, `45-mid-25s.png`, `45-late-50s.png`, `45-loop-67s.png` |
| 46 | Kaleidoscope | PASS (visual) / borderline perf | Clean 4-fold symmetric motion, mandala builds symmetric, loop restart cleared + rebuilt | `46-mid-25s.png`, `46-late-50s.png`, `46-loop-66s.png` |
| 0 | Spiral Bloom (control) | PASS | Regression fine | `00-regression.png` |
| 31 | Avalanche | PASS | Regression fine | `31-regression.png` |
| 33 | Cascade Imprint | **FAIL — CRASH** | App dies ~1 s after overlay mount, reproduced 2×; worklet TypeError in the schedule switch (see Identified issues) | `33-regression.png` (home screen after crash), crash stack in plan |
| 36 | Spirograph | PASS | Mandala unaffected (intentional diff: first ~1.5 s of blended stamps no longer inked — not noticeable) | `36-regression-20s.png` |

Note on 43: the message does NOT stay permanently — the stamp surface follows the ~29 s lap cycle, so at ~55 s (start of lap 2 re-ink) only partial letters exist until it rebuilds. Message is complete and legible from ~29 s to ~50 s of each minute-long hold. Judged acceptable (dev-hold loops forever; a real win shows ~60 s = one full legible window), flagged for the user's culling/tuning decision.

Perf (gfxinfo reset → 10 s → dump, release build; fps = frames/10 s; bar = 110 fps):

| Mode | Frames/10 s | Modern janky % | 90th pct | 95th pct | GPU 90th/95th | Verdict |
|------|-------------|----------------|----------|----------|----------------|---------|
| 0 (control) | 1225 | 0.00 % | 11 ms | 11 ms | 4/4 ms | OK |
| 37 Pinball | 1258 | 0.00 % | 13 ms | 13 ms | 4/5 ms | OK |
| 38 Pollock | 1132 | 6.98 % | 13 ms | 19 ms | 5/5 ms | OK (densest stamper — fine) |
| 39 Fireworks | 1211 | 0.17 % | 12 ms | 13 ms | 5/5 ms | OK |
| 42 Warp Drive | 1009 / 932 (re-run) | 20.2 % / 31.0 % | 24/25 ms | 25/26 ms | 6/6 ms | **FLAG < 110 fps** |
| 43 You Win | 1140 | 6.93 % | 15 ms | 15 ms | 5/5 ms | OK |
| 46 Kaleidoscope | 1087 / 1067 (re-run) | 11.4 % / 13.5 % | 17/19 ms | 19/20 ms | 4/5 ms | Borderline (~107 fps) |

(Legacy janky % is inflated on this 120 Hz panel for all modes incl. mode 0 — modern janky is the comparable number. 42's cost is the 572 sprites × 10 ghosts overdraw as predicted in the watch-list.)

## Testing handoff (device subagent)

Read `.agents/skills/soli-testing/SKILL.md` first. `soli://?celebration=<id>#retry-N` on the A065; badge label should read `Celebration <id> · <name>` per the table. Per mode:

1. **37 Pinball**: cards fly straight diagonals, reflect off left/right/top edges and the VISIBLE floor (above the nav dock); an imprint mark appears exactly at each wall contact and ONLY there (no mid-flight ink); marks accumulate along all four walls over 60 s. Loop restart clears the marks; abort instant. Perf window at ~45 s.
2. **38 Pollock**: cards tumble/spin at varied sizes; opaque rotated/scaled card stamps splatter across the whole canvas along their paths; by ~40 s the board reads as an action painting. PERF WINDOW REQUIRED (~40 s; every-frame stamping — compare against 36's ~122 fps / 20 ms 90th).
3. **39 Fireworks**: volleys rise from below the bottom edge every ~3 s, burst into a 13-card radial shell with visible 6-ghost trails, embers droop and fall offscreen; a FAINT ring mark lingers at each burst point; bursts land at different positions each cycle.
4. **40 Black Hole**: cards spiral into a slowly drifting center, speeding up and shrinking, fade out at the core, and later fly back in from the screen edges. No mid-screen pops (watch several cycles).
5. **41 Dominoes**: four rows of touching half-size upright cards; a wave topples them rightward (each card hinging about its bottom edge, landing on its neighbor), they re-stand in a wave, then topple leftward. Wave repeats ~every 15 s; formation must be rock-still between waves (wobble off).
6. **42 Warp Drive**: dense hyperspace starfield — long-tailed streaks accelerating radially outward; every ~8 s the radiant sweeps to a new position (continuous swoop, not a hard cut). PERF WINDOW REQUIRED (572 sprites, 10 ghosts — the new sprite max alongside 35).
7. **43 You Win**: a train of small upright cards traces letter strokes; "YOU" / "WIN!" inks in over ~29 s (one lap) and stays; NO ink on the gaps between letters (cards visibly fade crossing gaps, incl. the long "!"→"Y" loop connector); message legible on the portrait board. Perf window (~30 s, every-frame stamping).
8. **44 Solar System**: four large King "planets" on elliptical orbits with short trails, small number cards circling each planet (moons follow their planet), four Aces pulsing at the center. Hierarchy must read (moons track planets).
9. **45 Gravity Flip**: cards drop to the visible floor, bounce with decaying bounces, rest; ~every 8 s they fall UP to the top edge and bounce/rest there; one mark stamped at each rest (rows of marks build along floor AND ceiling).
10. **46 Kaleidoscope**: all four quadrants show the same swirling motion mirrored/rotated (4-fold symmetry, mirror-symmetric across wedge boundaries); the stamped mandala grows over 60 s and is symmetric. Perf window (~40 s, every-frame stamping).
11. **Cross-mode sanity**: badge cycle 36→37→…→46→0 wraps; abort instant on an imprint mode (37/43) and a trail mode (42); dev-hold loop past 60 s on 43 + 46 (imprints clear, message/mandala rebuilds); modes 33/36 unaffected (regression: their samplers moved into the shared schedule functions — verify 33's Kings-first cascade + pile reveals look exactly as before; 36's mandala has ONE known intentional diff: the first ~1.5 s of blended stamps are no longer inked, see the stamp-skip learning).
12. **Perf priorities**: 42 (sprite max), 38/43/46 (every-frame stamping), 39 (burst cluster + ghosts). Expect ≥110 fps; flag 90th-pct frame times well above ~20 ms.

## Follow-ups

- ~~FIX REQUIRED — mode 33 crash~~ DONE 2026-07-09 (follow-up story below): `getImprintLaunchOrder` reordered above the schedules, device-verified.
- ~~Mode 42 perf~~ DONE 2026-07-09 (follow-up story below): 7 ghosts / 55 ms + smaller streak scale → 117–119 fps.
- Mode 44 composition polish (optional): orbits cluster low-center and moons hug their planets; widening planet radii/moon radii spread would make the orrery read instantly. Low effort, medium payoff.
- Mode 43 message persistence (user judgement): message fully legible ~29–50 s each lap, then clears for the ~10 s re-ink. If "stays up" matters more than the re-ink theater, freeze stamping after lap 1 (skip counts past one lap). Wait for culling decision first.
- Learnings for the skill/AGENTS: crash-buffer check (`adb logcat -d -b crash`) after each mode sweep caught a crash that main-buffer FATAL grep missed on the first pass — worth keeping in the testing recipe.

---

# Story: mode-33 crash fix + Warp Drive/Kaleidoscope perf (2026-07-09)

## User prompt

> Task 1 — Fix the mode 33 crash (regression, top priority) […] Task 2 — Warp Drive (42) perf: tune to ≥110 fps while keeping the hyperspace look […] Task 3 — Kaleidoscope (46) borderline (~107 fps): cheap headroom only if obvious.

## Summary

Mode-33 crash root cause CONFIRMED and fixed by reordering: `getImprintLaunchOrder` moved ABOVE `getImprintStampCount`/`getImprintStampRaw` in `celebrationModes.ts` (worklet closures snapshot later-defined `const` worklets as `undefined` — see learnings). 42 detuned (10→7 ghosts / 50→55 ms, scale 0.5–1.4 → 0.42–1.1). 46 (+ all every-frame stampers) got the documented snapshot-every-2nd-tick throttle in `CascadeImprintLayer`. Cheap gates green (289 tests, continuity unweakened). DEVICE-VERIFIED 2026-07-09 on the A065 (fresh versionCode-13 install): 33 runs 100 s dev-hold with NO crash (imprints/badge-cycle/abort all normal); 42 now **117–119 fps** (was 93–101, bar 110) and still reads as hyperspace; 46 unchanged ~107–110 fps (throttle gave no measurable win — accepted, zero GPU stalls, no visible jank); regression 36/38/45 clean.

## Root cause (Task 1, confirmed by code reading; device verification below)

- `getImprintStampCount` case 33 (and `getImprintStampRaw` case 33) call `getImprintLaunchOrder`, which was defined ~110 lines LATER in the file. The worklets babel plugin snapshots a worklet's closure when its `const` initializer executes at module init; a later-defined `const` is still uninitialized then (TDZ → `var` → `undefined`) and the UI-runtime copy keeps `undefined` forever. First UI-thread call = `TypeError: undefined is not a function` inside `useAnimatedReaction` — exactly the crash-buffer stack. JS-thread calls (jest/typecheck) resolve at call time and never see it.
- Only mode 33 hit it: it is the only schedule case calling another file-level worklet defined later. Full call-graph grep of both files after the fix: every worklet callee is now defined above its callers (fract/smooth01/pingPong01/pinballParams/gravityFlipParams → schedules → easeOutQuint → computeCelebrationFrame); the overlay's worklets are all inline and only call imports (always initialized first). Inline WORKLET ORDERING RULE comment left above `getImprintLaunchOrder`.

## Steps to implement

- [x] 1. Fix 33: move `getImprintLaunchOrder` above the schedule functions + ordering-rule comment. DONE.
- [x] 2. Grep both files for other later-defined worklet callees — none found. DONE.
- [x] 3. 42 perf: trail 10×50 ms → 7×55 ms (572→416 sprites, tail ~385 ms) + streak scale 0.5–1.4 → 0.42–1.1 (~35% less fill in the radial convergence). DONE.
- [x] 4. 46 perf: snapshot-every-2nd-tick throttle in the imprint reaction (the documented "snapshot every Nth stamp frame" follow-up from the Spirograph story; ≤1 tick lag on newest stamps, benefits 36/38/43 too). DONE.
- [x] 5. Cheap gates: green 2026-07-09 (28 suites / 289 tests, continuity suite unweakened).
- [x] 6. Device verification on A065 (this run): 33 full 70 s no-crash + badge cycle + abort; 42 gfxinfo ≥110 fps + hyperspace look; 46 gfxinfo + visual; regression 36/38/45. Artifacts → `.test-artifacts/celebration-33-crash-fix/`. DONE — see Testing.

## Files actually modified

- `src/animation/celebrationModes.ts` — `getImprintLaunchOrder` reordered above the schedules (+ WORKLET ORDERING RULE comment); 42 metadata trail 7×55 ms; case 42 scale detune.
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — `CascadeImprintLayer` snapshot throttle (tick/snapshotDirty in stampState, snapshot every 2nd tick).
- This plan doc.

## Intermediary learnings

- **Worklet closure ordering**: a file-level worklet that calls another file-level worklet must be defined AFTER its callee. The babel plugin captures the closure when the `const` initializer runs; later-defined consts serialize as `undefined` into the UI runtime and stay that way. Invisible to typecheck/lint/jest — deterministic on-device crash. Rule documented inline at `getImprintLaunchOrder`.
- **Snapshot-every-2nd-tick gave NO measurable fps win** on the every-frame stampers (46 ≈ 107–110 both before and after; 36 measured ~105 today vs mode-0 control at 122.6 — control matches yesterday, so the comparison holds). The bottleneck is evidently the per-frame stamp drawing + UI-thread reaction work, not the copy-on-write snapshot blit. Kept anyway: visual-neutral (≤1 tick lag on the newest stamps, mandala verified normal on device), halves snapshot memory traffic, and it's the documented follow-up — but don't expect it to buy fps headroom for a future heavier mode.

## Testing

- Cheap gates 2026-07-09 (after all three changes): `yarn typecheck` + `yarn lint` + `yarn jest` green — 28 suites / 289 tests, continuity suite unweakened.

### Device run 2026-07-09 (A065 physical, 192.168.1.12:5555, fresh versionCode-13 install 00:46; artifacts in `.test-artifacts/celebration-33-crash-fix/`)

| Check | Verdict | Evidence |
|-------|---------|----------|
| 33 crash fix | **PASS** — 100 s dev-hold (fired 2×), app alive throughout, crash buffer EMPTY (was: deterministic death ~1 s after mount) | `01-mode33-30s.png` (dense bounce tracers, Kings-first), `02-mode33-75s-loop.png` |
| 33 badge cycle | PASS — badge tap 33→34 (Meteor Storm runs, imprint surface cleared), deep-link back to 33 = fresh mount (the crash path) runs clean | `03-badge-cycle-34.png`, `04-back-to-33.png` |
| 33 abort | PASS — instant dismiss to the untouched board on tap | `05-abort.png` |
| 42 perf | **PASS ≥110** — 1171 / 1193 frames per 10 s (~117–119 fps), modern janky 3.6 %/2.6 %, 90th pct 16/13 ms, GPU 90th 4 ms (was 93–101 fps, 20–31 % janky, 90th 24–26 ms) | `gfxinfo-42-run1/2.txt` |
| 42 visual | PASS — radial streaks with solid ghost tails still read as hyperspace; jump re-aim swoop visible, no teleports | `06-mode42-12s.png`, `07-mode42-jump.png` |
| 46 perf | ~107–110 fps (1074 / 1103 per 10 s), 90th 17–18 ms, GPU 90th 4–5 ms, 0 stalls — throttle no measurable win, ACCEPTED (no visible jank) | `gfxinfo-46-run1/2.txt` |
| 46 visual | PASS — symmetric mandala builds normally with the snapshot throttle | `08-mode46-42s.png` |
| Regression 36 | PASS — mandala + rolling cards normal ~20 s; perf window ~105 fps / 90th 18–19 ms (`gfxinfo-36*.txt`, see learnings) | `09-mode36-20s.png` |
| Regression 38 | PASS — dense Pollock collage normal ~20 s | `10-mode38-20s.png` |
| Regression 45 | PASS — cards resting on ceiling with floor imprint row at ~20 s (post-flip state correct) | `11-mode45-20s.png` |
| Control | mode 0 = 1226 frames/10 s (122.6 fps) — matches yesterday's 1225, so cross-day fps numbers are comparable | `gfxinfo-0-control.txt` |

## Follow-ups

- Every-frame stampers (36/38/43/46) sit ~105–113 fps with the snapshot cost now ruled out. If any of them ever needs the full 120: thin the stamp LATTICE (e.g. 46's 0.012 → 0.02 raw = fewer, slightly sparser mandala dots) or batch the per-stamp save/clipRRect/restore. Not recommended now — zero GPU stalls and no visible jank at 107+.
- A lint rule or unit test that catches "worklet calls a later-defined file-level worklet" would make this crash class impossible; cheapest version is a jest test that `runOnUI`-invokes each exported schedule function once. Medium effort, only worth it if the file keeps growing.

---

# Story: full-review culling + tuning batch (2026-07-09)

Status: IN PROGRESS — story added before coding.

## User prompt (full voice-review transcript, 1:1)

> "Hey, did you also change number 36, which is the Spirograph? Before the imprint started directly, which was kind of messy but also kind of cool, and now I think starts cleanly at the circle I like the messiness from before. The pinball is kind of cool, let's leave it like this. Maybe it could be a tiny bit faster. This is thirty-seven. 38 The Pollock es Wild, it's fun Let's leave it like this, the fireworks. I think is really cool. Maybe one comment, the fireworks could go a little higher up. Right now they're on like sixty percent of the screen height, which doesn't give that much fireworks vibes, but it's it's really cool. Yeah. The black hole is also kind of cool. Maybe the black hole could be done with even more cards at the same time. I think there's just a subset of cards usually visible on the, on the screen could give it even a bit more a vibe. The cards already start quite small, ones they're visible on the screen. not sure maybe we could adjust that, but like tiny, tiny, tiny little bit. The dominos are cool number forty-one. One thing, the card on the very left and the very right fall kind of out of the screen, which is a, a bit of a pity. maybe we could fix that. The warp drive. It's really cool. Also here, maybe the cards could be like 10% larger, really a small amount, but it's really cool. The UWIN Could be a little bit faster, maybe, but it's really cool, it works quite well. The problem is the why, so the first letter of the "You Win," the left part of the top part doesn't draw in the beginning, it only draws in the end, which is kind of a bit weird. And after the end, so the last thing, I assume this should be an exclamation mark, there it's, this exclamation mark doesn't really work, it's kind of a full line Maybe I can actually add a screenshot afterwards. Let me do that so this, this gets more clear, I think. This will get quite clear with a screenshot. Just a second while I'm waiting for the screenshot. Then the solar system is interesting But I think like the Different planet systems are a bit too close to each other, like in a real solar system, like the differences between our, our vast, and now they're even kind of overlapping. I guess that please, please make that work a bit better. I'll also add a screenshot here of the solar system. Then the gravity flip is quite cool. I'm not sure the cards need to stick on the top or on bottom because it's like actually just one card I think here these we can remove which would make it also a bit better. Then the kaleidoscope is quite similar to the Spirograph this one is also kinda clean, so if we restore the Spirograph we can keep this as is, but I mean, it's very similar, but I think it's fine. The zero, the spiral bloom, is still cool, let's leave it as is. The list you choose with Is kind of one of the more simpler ones, we can leave it as is, but later I think we'll remove some of the more boring ones. The pendulum cascade, I'm not so sure, it's very similar to the Lissajous wave, just horizontal instead of vertical. Number three, the Orbit Carousel is really cool, but one thing, there's like in the circle, like in one area, it doesn't close. I also, I will also attach a screenshot that would be cool to close, I think. It's a bit distracting that it doesn't close. The ellipse drift number four is a bit boring, let's remove that. Number five is cool. Number six is cool. The wave loop Kind of similar as like the others that I said are a bit boring, let's remove this. The Ring Cascade is really cool. The drift orbit. It's kinda cool. The comet halo is somewhat similar, but it's a bit more special, so let's keep this. The resonance field is also very similar as the other couples that I mentioned, let's remove this, that was number eleven. Number twelve, the column glide. Let's keep this, this is funny. The Aurora Twist is But also Not completely symmetric when it's a circle, I just tried to take a screenshot. let's have a look at this as well. The wave sweep number fourteen is very similar again, let's remove this. The constellation vault is very similar to two others that are kind of a circle, and not super special, let's remove this, this was number fifteen. Pulse orbit also very similar, number sixteen, let's remove. The clover spoon is cool. Horizon arc number eighteen, let's also remove them, very similar to the ones, it's just like a group of cards moving around. The chitter's worm is kind of a circle. That's kinda fast. Honestly, it's very similar to the other circles. Let's remove this. Let's maybe also note the others that are just a circle but yeah, let's remove this for now. the fountain number twenty is really cool. Card number is cool number twenty-one. The Vortex isn't super cool or special, to be honest, but it's kind of unique, so, I mean, we can keep it for now. Infinite Loop is fine. Suit Orbits is cool. The flock is kind of boring, it's also just like cards following each other. Maybe if you have like an idea how to make this much cooler, maybe otherwise let's remove this. The Shockwave number 26 is cool. Galaxy is a potentially interesting concept, but it's not that cool. Please improve it somehow. The big bounce is cool The heartbeat, please improve something about it. I mean, it's fine, but like, I'm sure it could be a bit, bit pop a bit more. The diamond drift, CMS heartbeat. Avalanche is amazing. Meteor Shower is amazing, Cascade Imprint is pretty good, Meteor Storm is amazing, Shooting Stars is amazing. Spirograph, we already talked about it, now we're once around. please make a table with everything that I just mentioned. A couple of comments, maybe also summarize some things for me, so because I don't have a perfect overview, but I think I gave you like the full rundown of the things. We wanna have, make it like with multiple columns, make it, give one column the number, one column the name, one column what it is, and a little bit behavior, one column what I said and then one column kind of your comment, and maybe also a little bit of a classification with, I don't know, keywords, like it's a circle, it's card following each other, it's like imprints, whatever, like comes to your mind. Amazing, thank you very much."

## Summary

All decision-table rows implemented and device-verified on the A065 (2026-07-09).
8 generic-circle modes retired (roster now 39, badge cycle + graceful deep-link
fail verified), Spirograph's messy launch stamps restored via a new
`imprint.launchStamps` metadata flag, all 9 tunings + the 13 investigation landed
(3's ring provably closes, 13 rebuilt as an even ring, 43's stroke order/"!"
fixed via connector-start train phasing + glyph rework, 44 separated into
quadrant systems), and all 4 improves shipped (25 got the murmuration rework +
one device tuning iteration). Gates green (281 tests); perf 42/40 at the 120 Hz
ceiling (~122/127 fps, bar 110). Artifacts:
`.test-artifacts/celebration-culling-batch/`.

## Partial-state assessment (resumed run, 2026-07-09)

The previous subagent was interrupted BEFORE writing any code for this story: the
~950-line uncommitted diff on `celebrationModes.ts` / `CelebrationOverlayLayer.tsx`
is entirely the two PRIOR stories' work (ten-crazy-modes 37–46 + the imprint-schedule
generalization, and the mode-33 crash fix + Warp Drive 10→7-ghost/scale detune +
snapshot-every-2nd-tick throttle), which sit uncommitted since the last commit
("package upgrades") predates them. Every decision-table row was still unimplemented;
all rows were implemented fresh in this run. The prior work was kept untouched and
the new imprint-config generalization was USED (the 36 restore is a `launchStamps`
metadata flag instead of renderer surgery — cheaper than the pre-generalization
design would have been).

## Decision table (orchestrator-approved)

| Id | Mode | Decision | Detail |
|----|------|----------|--------|
| 4 | Ellipse Drift | REMOVE | Generic circle |
| 7 | Wave Loop | REMOVE | Generic circle |
| 11 | Resonance Field | REMOVE | Generic circle |
| 14 | Wave Sweep | REMOVE | Generic circle |
| 15 | Constellation Waltz | REMOVE | Generic circle |
| 16 | Pulse Orbit | REMOVE | Generic circle |
| 18 | Horizon Arc | REMOVE | Generic circle |
| 19 | Jitter Swarm | REMOVE | Generic circle |
| 36 | Spirograph | RESTORE | Stamp from frame 0 again (messy launch-transit stamps the user liked; the imprint-schedule generalization's launch-blend skip deferred stamping ~1.5 s). 46 Kaleidoscope stays clean. |
| 37 | Pinball | TUNE | ~15% faster overall |
| 39 | Fireworks | TUNE | Bursts in the upper third (were peaking ~60% height) |
| 40 | Black Hole | TUNE | More cards visible simultaneously; slightly larger at re-entry (+10-15% entry scale) |
| 41 | Dominoes | TUNE | Clamp row layout so leftmost/rightmost cards stay on screen when toppled |
| 42 | Warp Drive | TUNE | Cards ~10% larger (0.42–1.1 → ~0.46–1.21); re-measure perf (bar 110 fps, was 117–119) |
| 43 | You Win | TUNE | (a) faster lap; (b) natural stroke order (Y's strokes were drawn out of order — each letter completes before the next); (c) "!" must be bar + GAP + dot (rendered as one full line) |
| 44 | Solar System | TUNE | Spread the four suit systems clearly apart; center the composition |
| 45 | Gravity Flip | TUNE | REMOVE rest imprints entirely — pure bounce mode |
| 3 | Orbit Carousel | FIX | Ring has a persistent gap — distribute cards uniformly in TIME along the warped orbit so the ring closes |
| 13 | Aurora Twist | INVESTIGATE | Circular phase not fully symmetric — find asymmetry, fix if clear, else document |
| 27 | Galaxy | IMPROVE | "Interesting concept, not that cool" — bolder core/arm contrast, keep trails |
| 29 | Heartbeat | IMPROVE | Beat-synchronized pop (lub-dub), keep heart unmistakable |
| 30 | Diamond Drift | IMPROVE | Garbled "CMS heartbeat" read as "same as Heartbeat" → GENTLE pulse treatment, keep clearly a diamond |
| 25 | Flock | IMPROVE-OR-FLAG | ONE bold murmuration rework (sub-flocks split/re-merge, coordinated turns); honest verdict — user removes if not clearly cooler |

Keep as-is (explicitly or implicitly): 0, 1, 2, 5, 6, 8, 9, 10, 12, 17, 20, 21, 22, 23, 24, 26, 28, 31, 32, 33, 34, 35, 38, 46.

## Steps to implement

- [x] 1. Add this story section (before coding). DONE (interrupted run).
- [x] 2. Removals: delete metadata entries + switch cases for 4/7/11/14/15/16/18/19; tombstone comment listing retired ids; verify graceful deep-link failure + badge cycling (metadata-driven). DONE — metadata + cases deleted, tombstone above `CELEBRATION_MODE_METADATA` + retired-case note in the switch. Deep-link fail is the pre-existing metadata-lookup miss (devLog "unknown mode" + ignore) — device-verified below.
- [x] 3. Restore 36: stamp from frame 0 (launch transit included). DONE via `imprint.launchStamps` metadata opt-in (36 only) — the generic stamp loop's launch-blend skip now has a per-mode bypass instead of a blanket rule.
- [x] 4. Tunings: 37 (params ×1.15), 39 (bursts 0.08–0.28 board height), 40 (spiral phase 0.62→0.74 + scale floor +12%), 41 (row inset = topple reach), 42 (scale 0.46–1.21), 43 (faster lap 1.65 dp-budget + connector-start train phasing + "!" bar/gap/dot + N-gap), 44 (quadrant-anchored systems), 45 (imprints removed), 3 (uniform-in-time closed ring) + 13 (even-ring rebuild). DONE.
- [x] 5. Improves: 27 (bright core vs tapering arms), 29 (52 bpm lub-dub pop), 30 (gentle sin⁴ pulse), 25 (murmuration: 4 sub-flocks, cohesion-gated split/re-merge, lagged-trajectory coordinated turns). DONE.
- [x] 6. Cheap gates: `yarn typecheck && yarn lint && yarn jest` — GREEN (28 suites, 281 tests; continuity suite auto-shrank by the 8 removed modes).
- [x] 7. Device verification on A065 (artifacts → `.test-artifacts/celebration-culling-batch/`): removed-id sweep + deep-link graceful fail, 36 messy start, each tuning vs intent, improve before/after verdicts, perf on 42 + 40. DONE — full verdict tables in Testing below; one tuning iteration used (Flock 25).
- [x] 8. Update this story (files, learnings, results, honest verdicts). DONE.

## Plan: Files to modify

- `src/animation/celebrationModes.ts` (removals, tunings, improves, stroke table)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (36 stamp-from-launch restore)
- This plan doc.

## Files actually modified

- `src/animation/celebrationModes.ts` — tombstone + 8 metadata entries and 8 switch
  cases deleted; `imprint.launchStamps` metadata field; 36 opts in; tunings 37/39/
  40/41/42/45; case 3 uniform-in-time ring; case 13 even-ring rebuild; case 43 "!"
  glyph + layout + WIN_PHASE0/WIN_TRAIN_SPAN/WIN_SPEED train phasing; case 44
  quadrant rework; improves 25/27/29/30. Stamp schedules: case 45 removed.
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` —
  `launchStamps` prop threaded to `CascadeImprintLayer`; launch-blend stamp skip
  gains the per-mode bypass.
- This plan doc.

## Intermediary learnings

- The interrupted run had written only the story section, no code (see assessment).
- Mode 3's ring gap root cause: `seed * TAU` in the angle gave RANDOM angular
  card spacing on a shared warped orbit — the warp then compressed the random
  spacing into a persistent hole. Uniform time offsets whose chain span (2/3) is
  an integer multiple of the warp period (1/3) provably close the ring.
- Mode 13's lumpy ring: same class of bug — seed-based angle/radius/shimmer
  phases. Any per-card phase term on a closed curve must be an integer multiple
  of the card's uniform angular phase or the curve won't close cleanly.
- Mode 43's missing Y stroke: the path STARTED at the Y's first stroke, so the
  train traversed it inside the launch blend where the stamp loop (correctly)
  skips blended ink — the stroke only inked a full lap later. Fix = park the
  train on the closing pen-up connector at raw 0 (WIN_PHASE0), not a stamp-loop
  change.
- Mode 43's old speed comment claimed 0.2 laps/raw ≈ 1.4 dp/window; the actual
  path total (7.58 weighted units) makes it 1.75 dp. WIN_SPEED now derives from
  the dp budget directly (1.65/total → 1.91 dp < 2 dp cap), so layout edits can't
  silently break the continuity margin again.

## Identified issues

- Flock 25 v1 (first murmuration cut) never visibly split on device — cohesion
  cycle too slow (~26 s) and divergence amplitude drowned in the flock's own
  scatter. FIXED same run (the one allowed tuning iteration): cycle ~13 s,
  divergence biased to the portrait y axis. v2 verified.
- Not fixed here (pre-existing, other agents' WIP): none of the gate failures
  predicted for other agents' files materialized — gates were fully green.

## Testing

All on the A065 (Android release, fresh install verified, versionCode 13).
Artifacts in `.test-artifacts/celebration-culling-batch/`.

**Removals + roster (PASS)**

- Badge cycle from mode 0: exactly 39 labels, in metadata order, wrapping back
  to `Celebration 00 · Spiral Bloom`; no removed name (4/7/11/14/15/16/18/19
  absent), no crash. Log: `badge-cycle.txt`.
- `soli://?celebration=4#retry-N` → devLog `[Demo] Celebration link: unknown
  mode "4".`, link ignored, running preview untouched, no crash
  (`36-removed-id-4-graceful.png`).

**Screenshot-driven fixes (user framing reproduced)**

| Mode | Verdict | Evidence (before = user screenshot) |
|---|---|---|
| 3 Orbit Carousel | PASS — chain fully closed, even spacing; the closed loop reads as a rotating 2-lobe rosette (radius breath completes exactly 2 periods over the chain), no gap anywhere | `01-mode3-ring-8s.png`, `02-mode3-ring-15s.png` |
| 13 Aurora Twist | PASS — even wreath, no bunching/overlap seam; shimmer + breath preserved | `03-mode13-8s.png`, `04-mode13-14s.png` |
| 43 You Win | PASS — at 15 s "YOU" is complete INCLUDING the Y's top-left diagonal, W in progress (natural left-to-right stroke order); at 35 s full "YOU WIN!" with "!" as bar + clear gap + dot, clearly separated from N | `05-mode43-15s.png`, `06-mode43-35s.png` |
| 44 Solar System | PASS — four suit systems clearly separated in their quadrants, aces pulsing centrally, moons on visibly distinct rings; composition centered | `07-mode44-6s.png`, `08-mode44-14s.png` |

**Restore + tunings**

| Mode | Verdict | Evidence |
|---|---|---|
| 36 Spirograph | PASS — dense messy launch-transit streaks visible at 2.5 s; mandala builds on top | `09-mode36-2.5s.png`, `10-mode36-10s.png` |
| 37 Pinball | PASS — ×1.15 params live; wall impact marks on all four edges | `22-mode37-8s.png` |
| 39 Fireworks | PASS — bursts peak in the upper third (burst points 0.08–0.28 board height) | `11-mode39-6s.png`, `12-mode39-11s.png` |
| 40 Black Hole | PASS — ~17–20 cards visible at once (spiral phase 74% of cycle) and larger entries | `13-mode40-8s.png`, `14-mode40-13s.png` |
| 41 Dominoes | PASS — leftmost/rightmost cards stay fully on screen through both topple directions | `15/16/17-mode41-*.png` |
| 42 Warp Drive | PASS — +10% scale visible, streaks intact | `18-mode42-5s.png` |
| 45 Gravity Flip | PASS — pure bounce; no rest imprints on floor or ceiling | `20-mode45-10s.png`, `21-mode45-18s.png` |

**Improves (honest verdicts)**

| Mode | Verdict | Evidence |
|---|---|---|
| 27 Galaxy | Clearly better — bright dense core of big cards + arms tapering into small dim trail-smeared cards; nucleus+arms read is unmistakable | `23/24-mode27-*.png` |
| 29 Heartbeat | Better — 1-second-apart shots show the whole heart mid-pop (scale kick 0.3, ~52 bpm lub-dub); heart shape unmistakable | `25/26-mode29-*.png` |
| 30 Diamond Drift | Good — still clearly a diamond, now with a soft distinct pulse; deliberately calmer than Heartbeat | `27-mode30-7s.png` |
| 25 Flock | HONEST CALL: improved but not spectacular in stills. v2 shows the flock stretching into strings and sub-groups peeling off/re-merging (vs v1's static blob), and coordinated turns propagate down the strings in motion. Whether it's "clearly cooler" enough to keep needs the user's live look — stills undersell motion. If it doesn't convince live, remove it as pre-agreed. | `32/33/34/35-mode25v2-*.png` (v1: `28–31-mode25-*.png`) |

**Perf (gfxinfo, 10 s, bar 110 fps)**

| Mode | Frames/10 s | Janky | 50th/90th/99th | GPU 90th | Verdict |
|---|---|---|---|---|---|
| 42 Warp Drive (post +10% scale) | 1219 (~122 fps) | 0.74% | 12/13/16 ms | 5 ms | PASS — at the 120 Hz ceiling, headroom intact |
| 40 Black Hole (more cards) | 1269 (~127 fps) | 0.00% | 12/13/14 ms | 5 ms | PASS |

No outliers → no confirm re-measure needed.

**Gates**: `yarn typecheck && yarn lint && yarn jest` GREEN (28 suites, 281
tests; continuity suite = 39 modes).

---

# Story: empty-slot outline audit + celebration-start flicker

Status: DONE 2026-07-09 — implemented + device-verified on the A065 (fresh builds 16:37 and 17:09, install verified both times). Gates green (28 suites / 281 tests). One fix iteration used: the frame-by-frame abort check exposed a PRE-EXISTING abort-side flicker (eager UI-thread sprite hide ran 1–2 frames before the board restore) — fixed and re-verified.

## User prompt

> while this runs, 2 things: remember when i complained that the foundation has outlines? same thing happened to just outline of most right column and to outline of stock. super weird! investigate with subagent what happened here and fix. where else could this happen? (i do think it was just when triggering yarn celebration via terminal, so not thaaat bad) #2: when starting a celeration, the foundation stacks from the game now quickly disappear just before the skia animation starts. i assume that you hide them somehow when the animation starts. but like this, the timing is off and it flickers, because they (rightly so) appear at the exact same place shortly after when the animation starts and fly from there

(Screenshot evidence: during a Gravity Flip preview the STOCK's dashed outline with the recycle icon and the empty rightmost tableau column's dashed outline are visible top-right — `Screenshot_20260709-154146` in the chat assets.)

## Summary

Task 1 (outline audit): the FoundationPile-only fix from the earlier story is now applied to every empty-state placeholder — TopRow's stock slot (dashed recycle/empty CardBack, the user's screenshot), TopRow's waste `EmptySlot`, and every tableau column's `EmptySlot` hide while a celebration is active via same-size spacers / conditional renders (layout stays stable, abort restores everything in the same commit). Device-verified on the exact repro (near-win board: recycle outline + 7 empty columns; fresh board: foundation + waste outlines): zero dashes during celebrations, all placeholders back instantly on abort. Task 2 (start flicker): confirmed mechanism — `AbsoluteCardLayer` unmounted the real cards the moment `celebrationState` was set while the Skia overlay still waited on async atlas rasterization. Fixed by gating the board-side hide on a new overlay texture-ready signal (`onOverlayReady` fired from the existing `launchAnchor` reaction → controller-owned `celebrationOverlayReady` state); frame-by-frame device capture of a real win shows the four Kings continuously until the Skia frame takes over at the same positions — no empty-foundation frame. Bonus find (frame analysis of the abort): abort had its own 2-frame empty-board flicker from an eager `runOnUI(active = 0)` in `handleCelebrationAbort` running ahead of the React commit — removed (the effect-cleanup hide at unmount makes abort a single-commit swap), re-verified: celebration → full board in ONE frame.

## Description

Follow-up on the "remove layout fallback, hide slot outlines, launch-order z" story: that fix hid ONLY `FoundationPile`'s empty-slot outline during celebrations, but the same "render a dashed placeholder when the real pile is empty" pattern exists for the stock, the waste, and every tableau column — all show through the transparent celebration canvas on mid-game/fresh-board previews (real wins are mostly unaffected: full foundations, and the win-cleanup fade hides stock/waste/tableau placeholders). Task 1 audits every empty-state visual and applies the same `celebrationActive` hide everywhere.

Task 2 is a start-transition flicker on the REAL win path: the board unmounts the real foundation cards (`AbsoluteCardLayer` returns no items) the moment `celebrationState` is set, but the Skia overlay's first visible frame waits for the async atlas rasterization (`useTexture` + async font load) — a beat where the foundation area is EMPTY, then the Skia cards appear at the exact same spot and launch. Fix: keep the real cards mounted until the overlay's texture is actually ready (the same signal that anchors the launch blend), so the handoff is pixel-continuous.

## Root causes (investigated)

1. **Outlines (Task 1)**: `TopRow`'s stock slot renders `CardBack` variant `recycle`/`empty` (dashed outline + recycle icon — the user's screenshot) and its waste slot renders `EmptySlot` when the waste is empty; `TableauColumn` renders `EmptySlot` when a column is empty (the screenshot's second outline — the empty rightmost column sits directly below the stock). None of them knew about celebrations. They ARE hidden on real wins via the win-cleanup fade (`showWinCleanup = hasWon && !celebrationPending`), which is why only previews (hasWon false) show the bug — exactly the user's "just when triggering yarn celebration" observation.
2. **Flicker (Task 2)**: `useKlondikeGame` passes `celebrationActive: Boolean(celebrationState)` to `AbsoluteCardLayer`, which returns zero items → all real cards unmount on the render that sets the celebration state. The Skia overlay mounts on the same render, but its Atlas can only draw once `useTexture` has rasterized the 52-cell atlas (plus async font arrival) — typically a few frames later (the exact gap the cascade-fixes story measured when it introduced the `launchAnchor` texture-ready anchor). Between the two: empty foundation area = the flicker.

## Audit table (Task 1)

| Component | Empty-state visual | Had the bug? | Fix |
|---|---|---|---|
| `FoundationPile` | dashed outline + muted suit glyph | Fixed in the earlier story | (already) `showEmptyOutline = !topCard && !celebrationActive` |
| `TopRow` stock slot | `CardBack` variant `recycle` (dashed + recycle icon) / `empty` (dashed) | YES — user screenshot | render the invisible `stockContainer` spacer while `celebrationActive` (keeps slot layout + measurements) |
| `TopRow` waste slot | `EmptySlot` (dashed) when waste empty | YES | render the card-sized spacer while `celebrationActive` |
| `TableauColumn` | `EmptySlot` (dashed) when column empty | YES — user screenshot (rightmost column) | new `celebrationActive` prop; skip `EmptySlot` while active |
| `BoardPreview` (history sheet) | `EmptySlot` | NO — off-board sheet UI, never under the celebration canvas | none |
| `FeatureGraphicScreen` (dev) | dashed frame | NO — dev-only store-graphic screen | none |

All hides are instant conditional renders (FoundationPile pattern), so abort restores every placeholder in the same commit that clears `celebrationState`. Trade-off noted inline: during real-win celebrations this instant hide supersedes the Task 28-2 win-cleanup FADE of the same placeholders (fade starts on the same render); invisible in practice and required for instant abort-restore.

## Mechanism + fix (Task 2)

- Overlay: a `useAnimatedReaction` on `texture.value !== null` fires `runOnJS(onOverlayReady)` once when the atlas texture lands (same moment `launchAnchor` anchors the launch blend → Skia cards render AT the foundations from their first frame).
- Controller: owns `celebrationOverlayReady` React state + `handleCelebrationOverlayReady`; reset to false in `clearCelebrationAnimations` (runs when `celebrationState` → null, i.e. end AND abort).
- `useKlondikeGame`: `absoluteCardLayerProps.celebrationActive` becomes `Boolean(celebrationState) && celebrationOverlayReady` — real cards stay mounted until the overlay is actually rendering. Reverse transition unchanged: state → null flips the gate false in the same commit that unmounts the overlay, so real cards are back at the same frame.
- The outline hides (Task 1) and all other `celebrationActive` consumers stay gated on `Boolean(celebrationState)` directly — no continuity contract there (nothing replaces the outlines), and it matches the FoundationPile precedent.
- Overlap note: for a few frames both real cards AND Skia cards render at the same position (Skia launch fade starts at 0.5 alpha over the real card — reads as a solid card). That replaces the empty-area gap; pixel positions are identical since the alignment story.

## Steps to implement

- [x] 1. Add this story section (before coding). DONE.
- [x] 2. Task 1: TopRow stock spacer + waste spacer, TableauSection/TableauColumn `celebrationActive` prop, wiring in `useKlondikeGame` (`tableauProps`). DONE.
- [x] 3. Task 2: overlay `onOverlayReady` (texture-ready runOnJS), controller `celebrationOverlayReady` state + reset, `useKlondikeGame` gate, `KlondikeGameView` threading. DONE.
- [x] 4. Cheap gates: `yarn typecheck && yarn lint && yarn jest`. DONE — green, 28 suites / 281 tests.
- [x] 5. Device verification (A065) → `.test-artifacts/celebration-outline-flicker/`. DONE — all checks PASS (see Device test results); the abort frame check found + fixed a pre-existing abort flicker (one rebuild + re-verify iteration).
- [x] 6. Update this story (summary, files, learnings, results). DONE.

## Plan: Files to modify

- `src/features/klondike/components/cards/TopRow.tsx` (stock + waste placeholder hides)
- `src/features/klondike/components/cards/TableauSection.tsx` (column EmptySlot hide)
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` (texture-ready → onOverlayReady)
- `src/features/klondike/hooks/useCelebrationController.ts` (overlay-ready state)
- `src/features/klondike/components/KlondikeGameView.tsx` (prop threading)
- `src/features/klondike/hooks/useKlondikeGame.ts` (MINIMAL — other agents have WIP here: tableauProps.celebrationActive, the AbsoluteCardLayer gate, callback threading)
- This plan doc.

## Files actually modified

- `src/features/klondike/components/cards/TopRow.tsx` — stock slot renders the invisible `stockContainer` spacer instead of the recycle/empty `CardBack` while `celebrationActive`; waste slot renders the card-sized spacer instead of `EmptySlot` while `celebrationActive`.
- `src/features/klondike/components/cards/TableauSection.tsx` — new `celebrationActive` prop on section + column; empty-column `EmptySlot` skipped while active.
- `src/features/klondike/components/cards/CelebrationOverlayLayer.tsx` — optional `onOverlayReady` prop, fired via `runOnJS` from the existing `launchAnchor` texture-ready reaction (exactly once per mount — the first-anchor branch; progress-wrap re-anchors do NOT refire).
- `src/features/klondike/hooks/useCelebrationController.ts` — `celebrationOverlayReady` state + `handleCelebrationOverlayReady`; reset in `clearCelebrationAnimations` (covers end and abort); both returned.
- `src/features/klondike/components/KlondikeGameView.tsx` — `onCelebrationOverlayReady` prop threaded to the overlay.
- `src/features/klondike/hooks/useKlondikeGame.ts` — MINIMAL (other agents' WIP file): destructure the two new controller values, `tableauProps.celebrationActive`, `absoluteCardLayerProps.celebrationActive` gated on `Boolean(celebrationState) && celebrationOverlayReady`, `onCelebrationOverlayReady` in viewProps.
- `src/features/klondike/hooks/useCelebrationController.ts` (iteration): eager `runOnUI(active = 0)` removed from `handleCelebrationAbort` — the abort-side flicker fix (see learnings).
- This plan doc.

## Intermediary learnings

- The nearwin fixture is the perfect outline repro: empty stock (recycle outline), all 7 columns empty, waste holding the final K — the exact board class in the user's screenshot. Fresh boards cover the waste + foundation placeholders (a fresh deal auto-draws one card, so the waste EmptySlot needs a full draw-through + recycle to appear).
- `adb shell input tap` is unusable while `screenrecord` runs alongside a 120 fps celebration: injections got delayed 10+ s (two recordings showed the tap landing only after the clip ended). `yarn agent-device click <x> <y>` injects promptly under the same load — use it for any recorded-interaction capture.
- **Abort had its own 2-frame flicker (found by the frame capture, then fixed):** `handleCelebrationAbort` ran an eager `runOnUI(active = 0)` that hid all Skia sprites 1–2 frames BEFORE the React commit unmounting the overlay/restoring the board — device frames showed a fully empty board in between. Fix: drop the eager hide; the `celebrationState` effect cleanup sets `active = 0` at unmount, making abort a single-commit swap. The natural 60 s completion never had this problem (end fade reaches alpha 0 before the unmount).
- The win→celebration handoff is pixel-continuous on device: frame captures show the four real Kings until the Skia frame takes over with kings at the same spots (brief brightness bump from the sprite shadows/underlays overlapping), then the cards animate away. No empty-foundation frame (per-frame luma scan of the foundation row: card-level values until the cards legitimately fly off).

## Identified issues

- Abort-side 2-frame empty-board flicker (pre-existing, exposed by the frame-by-frame check) — FIXED, see learnings; re-verified on device after rebuild.

## Testing

- Cheap gates 2026-07-09: `yarn typecheck` + `yarn lint` + `yarn jest` green (28 suites / 281 tests) — after the initial implementation AND after the abort-fix iteration. None of the predicted other-agent-WIP failures materialized.

## Device test results (A065, 2026-07-09)

Two fresh `yarn release` builds (16:37 initial, 17:09 after the abort fix; install verified via lastUpdateTime both times). Artifacts: `.test-artifacts/celebration-outline-flicker/`.

| # | Check | Verdict | Evidence |
|---|-------|---------|----------|
| 1 | User-screenshot repro baseline (near-win board: stock recycle outline + 7 empty-column outlines idle) | reproduced | `00-nearwin-baseline.png` |
| 2 | Mode 45 preview on that board: NO dashed outlines (stock recycle icon included) | PASS — zero dashes at 2 s and 4 s | `01-mode45-2s.png`, `02-mode45-4s.png` |
| 3 | Abort → all placeholders back instantly | PASS — recycle outline + 7 column outlines restored, board untouched | `03-after-abort.png` |
| 4 | Fresh-board preview (foundation outlines): no dashes during, restored after | PASS | `04-fresh-baseline.png`, `05-fresh-mode45-2s.png`, `06-fresh-after-abort.png` |
| 5 | Empty-waste preview (waste EmptySlot — needed a full draw-through + recycle to produce): no dashes during, restored after | PASS | `07-emptywaste-baseline.png`, `08-emptywaste-mode45.png`, `09-emptywaste-after-abort.png` |
| 6 | Win→celebration start, frame-by-frame (real win: nearwin + winning tap on waste K♠, screenrecord ~49 fps effective) | PASS — foundation-row luma scan + frame stack: four real Kings every frame until the Skia frame takes over with Kings at the same spots (2-frame brightness bump from overlapping sprite shadows), then cards animate away; NO empty-foundation frame | `win-transition.mp4`, `overview-2fps.png`, `transition-crops-8.2-10.6.png`, `handoff-stack-36-42.png` |
| 7 | Abort transition, frame-by-frame — FIRST build | FAIL → fixed: 2 frames of fully EMPTY board between sprite hide and board restore (eager `runOnUI(active=0)` in the abort handler, pre-existing) | `abort4-lastframes-stack.png` (middle frame = empty board) |
| 8 | Abort transition, frame-by-frame — FIXED build | PASS — single-frame swap: full imprint field in frame N, complete restored board (outlines included) in frame N+1; luma scan shows no empty frame | `abort-transition-fixed.mp4`, `abort-fixed-lastframes.png` |
| 9 | Regression: idle boards show placeholders as usual | PASS — outlines present when not celebrating on near-win and fresh boards | `00`, `04`, `17`, `19` |
| 10 | Celebration sanity on fixed build (mode 45 + mode 0 run + abort) | PASS | `16-newbuild-mode45.png`, `18-newbuild-mode0.png`, `17/19-newbuild-*.png` |

Learnings for future testers: `adb shell input tap` gets delayed 10+ s while screenrecord runs alongside a celebration (two wasted clips) — `yarn agent-device click <x> <y>` injects promptly under the same load. A real win via nearwin + one a11y-guided tap is far easier to co-time with a recording than an autosolve run.

## Follow-ups

- The brief real+Skia card overlap at start (~2 frames, both at identical positions) reads as a small brightness bump because the Skia sprite's baked shadow lands on top of the real card. Invisible at speed; if it ever bothers, delay the launch-anchor by one frame after onOverlayReady. Recommend leaving as is.
- The overlay-ready gate leaves real cards mounted if the atlas texture somehow never lands (defensive fail-safe: board stays visible instead of empty). No action needed.
