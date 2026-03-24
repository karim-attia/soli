# Card Font Parity Exact Android Card Font Rendering

## Description

Make the playing cards render from bundled Android-derived fonts only, while matching the visual result of Android before commit `ab6c605e03acb648fb2b286ee63302797d71058a` as closely as possible on both Android and iOS.

This work is scoped to card rank and suit rendering only. It must not change the rest of the app typography.

## Acceptance Criteria

- Card ranks and suits are rendered from bundled fonts only.
- No card suit image assets or SVG suit renderers remain in the live card path.
- Android emulator and connected Android phone render the same card font shapes from the bundled font path.
- iOS simulator uses the bundled Android-derived card fonts after a fully clean native build.
- Card spacing, top-row alignment, and center-symbol sizing match the old Android card layout as closely as possible without introducing per-platform spacing hacks unless proven necessary.
- The implementation documents any remaining gap between native Android text rendering before `ab6c605e03acb648fb2b286ee63302797d71058a` and the bundled-font result.

## Design links

- Reference Android screenshots captured during verification
- Commit reference: `ab6c605e03acb648fb2b286ee63302797d71058a`

## Possible approaches incl. pros and cons

### 1. Bundled Android rank font + bundled Android symbol font

Pros:
- Pure font approach
- Small asset footprint
- Keeps spacing controlled by native text layout

Cons:
- Does not reproduce the old wide heart if the old suit came from Android emoji fallback rather than the symbol font
- Different font metrics between rank and suit can still affect vertical alignment

### 2. Bundled Android rank font + bundled Android color emoji font

Pros:
- Pure font approach
- Preserves the wider Android heart shape if the old heart came from Android emoji fallback
- Keeps card layout driven by text rendering, not custom image boxes

Cons:
- iOS font registration uses the internal PostScript/family name instead of the Android alias
- Color emoji fonts can have very different metrics from rank fonts, so layout still needs verification

### 3. Asset-based exported Android glyphs

Pros:
- Maximum visual control
- Easy to match one screenshot exactly

Cons:
- Not a font-only approach
- Loses the native text box behavior that existed on Android before `ab6c605e03acb648fb2b286ee63302797d71058a`

Recommended:
- Continue with approach 2 first, because it matches the user’s stated requirement to stay font-only while preserving the wide Android heart shape.

### 4. Bundled Android-derived fonts with normalized internal family names

Pros:
- Keeps the font-only approach
- Removes platform divergence caused only by family-name resolution
- Lets both Android and iOS address the same explicit family strings

Cons:
- If iOS still fails after this, the remaining issue is likely deeper than registration and tied to how iOS renders the suit font itself

Recommended for the current pass:
- Try this next, because the current Android build is correct while iOS still behaves like the suit font is not resolving cleanly.

### 5. Bundled Android suit font with both `COLRv1` and `SVG` color tables

Pros:
- Still a font-only renderer
- Preserves the actual Android suit glyph source instead of swapping shapes again
- Keeps Android on the original `COLRv1` path while giving iOS an `SVG` color table to use instead of falling back
- Avoids per-platform spacing hacks in card component code

Cons:
- Requires an extra build tool step via `nanoemoji`
- Adds a tooling dependency for font generation, even though the app runtime stays unchanged

Recommended for the current pass:
- Yes. This is now the best fit, because the current suit font from the Android phone is already `COLRv1`, and Google’s color-font guidance says static `COLRv1` fonts should also include an equivalent `SVG` table.

### 6. Single merged Android-derived card font

Pros:
- Still a font-only renderer
- Removes the avoidable rank-vs-suit metric mismatch by giving both corners one font family
- Keeps the Android suit glyph source that already looks good
- Avoids per-platform spacing constants for rank vs suit

Cons:
- Requires font construction work instead of simple bundling
- Does not magically recreate the old Android fallback engine, only the closest single-font approximation

Recommended for the current pass:
- Yes. This is now the best cross-platform font-only approach, because it replaces the old runtime fallback composition with one explicit bundled card font.

## Open questions to the user incl. recommendations

- None currently blocking.

## New dependencies

- None planned.
- Build-time tool only: `nanoemoji` for adding an `SVG` color table to the Android-derived suit font.
- Build-time library already in use: `fontTools` for subsetting, scaling, and merging the glyph sets into a single card font.

## UX/UI Considerations

- The card renderer should preserve the familiar Android card proportions that users already liked.
- The top-left rank and top-right suit should sit on the same perceived baseline.
- The center suit should look full-sized and not shrunken by font metrics.
- The best chance of preserving spacing without hacks is to encode the spacing assumptions into the font metrics, not into extra platform margins.

## Components

- Reuse [CardView](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/CardView.tsx)
- Reuse [styles.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/styles.ts)
- Reuse [fonts.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/fonts.ts)
- Reuse [app.json](/Users/karim/kDrive/Code/soli/app.json) for native font embedding
- Reuse [build-card-fonts.py](/Users/karim/kDrive/Code/soli/scripts/build-card-fonts.py) for reproducible font preparation
- Reuse [card-font-parity-fonttools-guide.md](/Users/karim/kDrive/Code/soli/docs/product/card-font-parity/card-font-parity-fonttools-guide.md) for the merged-font mechanics

## How to fetch data, how to cache

- No remote data fetching.
- Font assets are bundled with the app and loaded natively through Expo config.

## Related tasks

- PBI 33
- [33-1.md](/Users/karim/kDrive/Code/soli/docs/delivery/33/33-1.md)
- [33-2.md](/Users/karim/kDrive/Code/soli/docs/delivery/33/33-2.md)

## Steps to implement and status of these steps

- [completed] Audit the current card font path against the pre-`ab6c605e03acb648fb2b286ee63302797d71058a` Android behavior.
- [completed] Remove stale asset-based suit rendering code from the live implementation.
- [completed] Align the bundled-font implementation with correct platform font-family registration.
- [completed] Run clean iOS and Android builds sequentially and verify fresh installs on each target.
- [completed] Document the final outcome and remaining differences.
- [completed] Regenerate the bundled card fonts with normalized internal family/PostScript names so both platforms can address the same explicit family names.
- [completed] Re-run clean iOS and Android verification using sub-agents and compare the results against the prior clean-build screenshots.
- [completed] Rebuild the suit font from the physical Android phone’s `NotoColorEmoji.ttf`, subset it to card suits only, and add an `SVG` table alongside `COLRv1`.
- [completed] Re-run clean iOS and Android verification using sub-agents and compare the updated multi-table suit font against the Android-good baseline.
- [completed] Investigate the remaining Android top-corner misalignment and iOS top-spacing drift after the multi-table font pass.
- [completed] Replace the split rank/suit bundled-font setup with one merged Android-derived card font and re-verify on both platforms.
- [completed] Run a follow-up pass to make the merged rank outlines heavier and slightly relax the iOS corner spacing.
- [completed] Research the old Android fallback path, inspect the merged-font metadata, and document how runtime weight steering should work with Expo + React Native.
- [completed] Generate real merged card-font variants for the old card weights instead of using one `Regular` file for every case.
- [completed] Normalize suit glyph metrics in the merged font using the Android symbol-font measurements while keeping the wide emoji suit shapes.
- [completed] Re-run clean Android and iOS builds and verify the weighted merged-font result with sub-agents.
- [completed] Move the final top-right-corner tuning into dedicated corner-suit font variants instead of relying only on component offsets.
- [completed] Replace the suit-only corner font with a shared corner text family so the top-left rank and top-right suit use the same family metrics.
- [in progress] Decide and implement one definitive font architecture for corners/center/rank across iOS and Android, then remove any now-redundant font roles.
- [in progress] Add a repeatable screenshot-measurement workflow and use it to tune the top-left/top-right corner alignment to the final target.

## Plan: Files to modify

- [app.json](/Users/karim/kDrive/Code/soli/app.json)
- [scripts/build-card-fonts.py](/Users/karim/kDrive/Code/soli/scripts/build-card-fonts.py)
- [app/_layout.tsx](/Users/karim/kDrive/Code/soli/app/_layout.tsx)
- [fonts.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/fonts.ts)
- [CardView.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/CardView.tsx)
- [measure-card-corners.py](/Users/karim/kDrive/Code/soli/scripts/measure-card-corners.py)
- [card-font-parity-imagemagick-guide.md](/Users/karim/kDrive/Code/soli/docs/product/card-font-parity/card-font-parity-imagemagick-guide.md)
- [card-font-parity-fonttools-guide.md](/Users/karim/kDrive/Code/soli/docs/product/card-font-parity/card-font-parity-fonttools-guide.md)
- [card-font-parity-nanoemoji-guide.md](/Users/karim/kDrive/Code/soli/docs/product/card-font-parity/card-font-parity-nanoemoji-guide.md)
- [33-1.md](/Users/karim/kDrive/Code/soli/docs/delivery/33/33-1.md)
- [33-2.md](/Users/karim/kDrive/Code/soli/docs/delivery/33/33-2.md)
- [tasks.md](/Users/karim/kDrive/Code/soli/docs/delivery/33/tasks.md)

## Files actually modified

- [exact-android-card-font-rendering.md](/Users/karim/kDrive/Code/soli/docs/product/card-font-parity/exact-android-card-font-rendering.md)
- [app.json](/Users/karim/kDrive/Code/soli/app.json)
- [app/_layout.tsx](/Users/karim/kDrive/Code/soli/app/_layout.tsx)
- [scripts/build-card-fonts.py](/Users/karim/kDrive/Code/soli/scripts/build-card-fonts.py)
- [fonts.ts](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/fonts.ts)
- [CardView.tsx](/Users/karim/kDrive/Code/soli/src/features/klondike/components/cards/CardView.tsx)
- [CardTextAndroid.ttf](/Users/karim/kDrive/Code/soli/assets/fonts/CardTextAndroid.ttf)
- [CardTextAndroid-SemiBold.ttf](/Users/karim/kDrive/Code/soli/assets/fonts/CardTextAndroid-SemiBold.ttf)
- [CardTextAndroid-Bold.ttf](/Users/karim/kDrive/Code/soli/assets/fonts/CardTextAndroid-Bold.ttf)
- [measure-card-corners.py](/Users/karim/kDrive/Code/soli/scripts/measure-card-corners.py)
- [card-font-parity-imagemagick-guide.md](/Users/karim/kDrive/Code/soli/docs/product/card-font-parity/card-font-parity-imagemagick-guide.md)
- [card-font-parity-fonttools-guide.md](/Users/karim/kDrive/Code/soli/docs/product/card-font-parity/card-font-parity-fonttools-guide.md)
- [card-font-parity-nanoemoji-guide.md](/Users/karim/kDrive/Code/soli/docs/product/card-font-parity/card-font-parity-nanoemoji-guide.md)

## Identified issues and status of these issues

- `Noto Color Emoji` uses different native registration names on Android and iOS.
  Status: confirmed. Current hypothesis is that internal name normalization may remove part of the iOS mismatch.
- Old Android card rendering before `ab6c605e03acb648fb2b286ee63302797d71058a` likely relied on Android system fallback.
  Status: confirmed as an important constraint; bundled fonts are being used to reproduce the source explicitly.
- The current repo still contains stale suit-asset files from prior experiments.
  Status: cleaned up.
- Clean verification result:
  Status: Android phone and Android emulator are on the fresh release APK and show the intended font-only card look; iOS simulator is on a fresh clean build but still does not match Android with the bundled suit font.
- Fresh root-cause update:
  Status: confirmed. The physical Android phone’s `NotoColorEmoji.ttf` is a `COLRv1` font. The bundled suit asset currently preserves that `COLRv1` table, but iOS still does not match Android. The next fix is to add an `SVG` table to the same suit font so iOS has a second standards-based color representation instead of falling back.
- Fresh verification after the multi-table suit-font pass:
  Status: confirmed. The rebuilt suit font now contains both `COLRv1` and `SVG` tables. Android phone and emulator kept the same good wide-heart rendering, while iOS clean-build rendering moved materially closer to Android and no longer looks like the tiny fallback-style suit rendering.
- Root cause of the remaining Android top-corner misalignment:
  Status: confirmed. Before `ab6c605e03acb648fb2b286ee63302797d71058a`, the top-right suit symbol was rendered through Android system fallback with no explicit `fontFamily`. Android’s text-metrics docs say that when a `Typeface` is created from custom font files, the custom font’s own ascent/descent are reserved, but when using a system fallback typeface, the default font’s metrics are reserved instead. That means the old layout used the default-font line box while drawing fallback suit glyphs inside it, whereas the current layout uses the explicit `CardSuitAndroidEmoji` line box. The `top` offsets were tuned for the old fallback box, not the new custom-font box.
- Root cause of the remaining iOS narrow top spacing:
  Status: confirmed. The current iOS card corners are laid out from explicit custom font metrics, not the old platform-default text path. Apple’s font-metrics docs note that `ascender`, `descender`, `capHeight`, and `lineHeight` come directly from the font. Our current explicit rank and suit fonts have materially different metrics from each other and from the old platform-default rendering path, so the same `top: -2` and `top: 0` values produce a tighter visual inset on iOS even though the glyph source is now correct.
- Why this still differs even though the glyph source is “the same font”:
  Status: confirmed. Matching the glyph outline source is not enough to reproduce the old layout. The card corners are separate `Text` nodes, and the layout engine positions each node using its own font metrics and native text engine. The shipped fonts currently have different global metrics: `CardRankAndroidBold.ttf` uses `unitsPerEm=2048`, `hhea=1900/-500`, while `CardSuitAndroidEmoji.ttf` uses `unitsPerEm=1024`, `hhea=950/-250`. Even on Android, that is a different text-layout path from the old system-font-plus-fallback rendering, so matching the source font file does not guarantee matching the old line box or baseline behavior.
- Current fix direction:
  Status: completed. The Android-derived rank glyphs and Android-derived suit glyphs now live in one bundled card font so the rank and suit share a single metric system again.
- Result of the merged-font pass:
  Status: partially successful. The merged font materially improved iOS top spacing and rank/suit alignment, but it did not produce a meaningful Android top-corner alignment change. That strongly suggests Android’s remaining drift is not just “two different font metrics” anymore, but also tied to how the explicit custom-font text run is laid out compared with the old system-font-plus-fallback path.
- Result of the heavier-rank / iOS-corner follow-up:
  Status: partially successful. Android rank boldness improved slightly while keeping the good corner alignment and wide heart. iOS corners improved only a little, which suggests the remaining iOS issue is now mostly a visual sizing/position tuning problem rather than a wrong font-source problem.
- Android fallback-path research update:
  Status: confirmed. On the connected Android phone, `adb shell cmd font dump` shows `sans-serif -> /system/fonts/Roboto-Regular.ttf` at weight `400`, plus fallback families `und-Zsye -> NotoColorEmoji.ttf` and `und-Zsym -> NotoSansSymbols-Regular-Subsetted2.ttf`. That means the old pre-commit card path was almost certainly not “one font”; it was a system text run using Roboto 400-family metrics with Android fallback selecting the suit glyph source at render time.
- Prior explicit card weights in the codebase:
  Status: confirmed. Before `ab6c605e03acb648fb2b286ee63302797d71058a`, `cardCornerRank` in the old card styles explicitly requested `fontWeight: '700'`, `cardSymbol` requested `fontWeight: '600'`, and `cardCornerSuit` did not explicitly set a weight.
- Current merged-font metadata:
  Status: confirmed. The live `CardTextAndroid.ttf` file currently advertises itself as `Regular` with `OS/2.usWeightClass = 400` and `name` style `Regular`, even when the rank outlines are rebuilt from a heavier Roboto instance. This explains why the font can still read like a 400-weight custom font to native text layout even though the rank outlines were sourced from a heavier variation instance.
- Current merged-font geometry hint:
  Status: confirmed. The merged font inherits the suit font’s global metrics and horizontal advance widths (`unitsPerEm = 1024`, `hhea = 950 / -250`, suit glyph advances `1275`). That is a strong hint for the remaining iOS issue: the suit glyphs are being laid out inside the emoji font’s wider color-glyph metrics, so they can look visually smaller than the rank at the same `fontSize`.
- Recommended next font-only path:
  Status: completed. The merged card family now ships as real weighted variants: `400` regular, `600` semibold, and `700` bold. Android is registered through the Expo font plugin as one `CardTextAndroid` family with weighted definitions, iOS bundles the three files with matching internal family/style names, and card text now requests `fontWeight` again where the old code did.
- Suit metric normalization:
  Status: completed. The merged suit glyphs still use the wide Android emoji shapes, but their horizontal metrics now come from `NotoSansSymbols-Regular-Subsetted2.ttf` scaled into the merged font’s `unitsPerEm`. The raw emoji suit advances were `1275`; after normalization they are now `758` for hearts and `620` for diamonds, which materially reduces the oversized empty box around the suit glyphs.
- Final implementation result:
  Status: successful. Android phone and emulator kept the good alignment and wide-heart shape, and the top-left rank is now a little stronger thanks to real weighted variants. iOS also improved: the top spacing is less cramped and the suits read larger. After the final screenshot-measured tuning pass, the remaining corner mismatch is down to roughly half a pixel in opposite directions across Android and iOS.
- Final corner alignment measurement:
  Status: confirmed. Using the final screenshots, the visible top-right suit box and top-left rank box differ by only about `0.5 px` in center position on each platform. Android ends at `top_diff=-1`, `center_diff=-0.5`; iOS ends at `top_diff=+1`, `center_diff=+0.5`. The shared `CARD_CORNER_SUIT_TOP = 1` constant is the cleanest midpoint found from direct screenshot measurement.
- Cleanup check:
  Status: clean. No stale suit asset renderer remains in the live path. The remaining repo diff is the intended card-font work plus the updated product doc. No extra runtime cleanup is needed from this pass.
- Dedicated corner-suit font variants:
  Status: replaced. This intermediate approach improved the top-right suit, but it also meant the rank and suit no longer shared one corner text family. That was not ideal for natural top/bottom alignment.
- Shared corner text families:
  Status: superseded. This intermediate approach improved the corner suit, but it made the architecture harder to reason about and reintroduced role/platform-specific font-family divergence.
- Definitive single-family concept:
  Status: in progress. The live implementation is being simplified back to one merged Android-derived family with `400`, `600`, and `700` variants for all card text on both platforms. Corner alignment will now be tuned with measured layout constants and screenshot analysis instead of extra font families.
- Architecture simplification review:
  Status: completed. The definitive concept is now one cross-platform card family with real weight variants: `CardTextAndroid` at `400`, `600`, and `700`. The live card path no longer needs separate corner families or platform-specific font-family names. Rank, corner suit, and center suit all use the same bundled family, while sizing and offsets remain in component styles where they can be measured and tuned explicitly.
- Screenshot measurement workflow:
  Status: implemented. Added [measure-card-corners.py](/Users/karim/kDrive/Code/soli/scripts/measure-card-corners.py), a repeatable ImageMagick-backed script that measures the visible pixel bounds of the top-left rank and top-right suit inside a cropped card region and reports `top_diff`, `bottom_diff`, and `center_diff`. The next tuning pass uses this script against fresh Android phone and iOS simulator screenshots instead of relying on visual guesses alone.
- Unified-family corner follow-up:
  Status: completed. Fresh clean-build screenshots showed that the simplified one-family setup was structurally right, but Android still read the top-right suit a little lighter/smaller than the top-left rank even when the vertical offset was close. The final follow-up kept the single-family concept and strengthened the corner suit via `fontWeight: 600` instead of bringing back separate corner families. This materially improved suit presence on both iOS and Android without reintroducing per-platform font-family divergence.
- Asset audit and final Android corner alignment:
  Status: completed. The live app now uses only the three merged runtime assets in `assets/fonts`: `CardTextAndroid.ttf`, `CardTextAndroid-SemiBold.ttf`, and `CardTextAndroid-Bold.ttf`. The old source/reference files `CardRankAndroidBold.ttf` and `CardSuitAndroidEmoji.ttf` were not referenced by the runtime or the current build script anymore, so they were removed to avoid confusion. The old Expo template leftover `SpaceMono-Regular.ttf` was also unused and removed. Fresh Android screenshot measurement showed the corner suit was not mainly “too high”; it was still too tall while sharing the same top alignment. The final fix therefore reverts the Android top offset back to `1` and reduces the Android corner suit font size from `12` to `11` so the top stays aligned while the visible suit height comes down.
- Missing font-side metric insight:
  Status: confirmed. The suit glyphs in `CardTextAndroid*.ttf` are color glyphs stored in the `SVG ` table. Their `glyf` bounding boxes are effectively empty, so the remaining visual mismatch is not explained well by `hhea`, `OS/2`, or `hmtx` alone. The missing font-side concept is the actual SVG artwork bounds and padding inside the color glyph documents. That is also why iOS and Android can still differ even on the same font file: their native text engines render the same color-glyph documents differently while still sharing the same horizontal metrics.
- Native iOS font registration mismatch:
  Status: confirmed and fixed. The Expo config in [app.json](/Users/karim/kDrive/Code/soli/app.json) already pointed at the merged `CardTextAndroid*.ttf` family, but the generated iOS native files had drifted and were still registering deleted legacy assets (`CardRankAndroidBold.ttf`, `CardSuitAndroidEmoji.ttf`) in [Info.plist](/Users/karim/kDrive/Code/soli/ios/Soli/Info.plist) and [project.pbxproj](/Users/karim/kDrive/Code/soli/ios/Soli.xcodeproj/project.pbxproj). Clean simulator verification was therefore not trustworthy until those native references were corrected back to the three live merged card fonts.
- Suit clipping root cause:
  Status: confirmed and fixed. The merged suit glyphs used `hmtx` widths copied from `NotoSansSymbols-Regular-Subsetted2.ttf`, but the visible suit artwork comes from the font’s `SVG ` color glyphs and is much wider than those widths. Measured on the live `CardTextAndroid.ttf`, the old metrics were `heart advance=758, xMax=1204`, `diamond advance=620, xMax=1057`, `spade advance=746, xMax=1145`, and `club advance=897, xMax=1177`. That means the visible color glyphs overflowed their metric boxes on the right. The generator now computes suit SVG x-bounds directly and expands `advanceWidth` to at least `xMax + 72`, producing widths such as `heart=1276` and `diamond=1129`, which preserves the Android heart shape while avoiding right-edge crowding/clipping.
- Post-fix verification note:
  Status: confirmed. Fresh Android verification after the suit-width fix reported `top_diff=0`, `center_diff=0.0`, and no visible right-edge clipping on the checked card crop. Fresh clean iOS verification became trustworthy again once the native font registration was fixed; the remaining gap after the metric fix was no longer clipping inside the font, but a small card-level right inset, so `CARD_CORNER_SUIT_RIGHT` on iOS was increased from `1` to `2`.

## Testing

- iOS: clean native rebuild, wait for install to finish, then capture a simulator screenshot.
- Android emulator: clean native release build, install the fresh APK, and capture a screenshot.
- Android phone: unlock with [android-unlock-pattern.sh](/Users/karim/kDrive/Code/soli/scripts/android-unlock-pattern.sh), install the fresh release build, and capture a screenshot.
- Run `yarn typecheck`
- Run `yarn lint`
- Latest clean-build artifacts:
  - iOS simulator: [/tmp/soli-ios-verify-fresh.png](/tmp/soli-ios-verify-fresh.png)
  - Android phone: [/tmp/soli-android-phone-latest.png](/tmp/soli-android-phone-latest.png)
  - Android emulator: [/tmp/soli-android-emulator-latest.png](/tmp/soli-android-emulator-latest.png)
- Merged-font verification artifacts:
  - iOS simulator: [/tmp/soli-ios-verify-merged.png](/tmp/soli-ios-verify-merged.png)
  - Android phone: [/tmp/soli-android-phone-merged.png](/tmp/soli-android-phone-merged.png)
  - Android emulator: [/tmp/soli-android-emulator-merged.png](/tmp/soli-android-emulator-merged.png)
- Follow-up verification artifacts:
  - iOS simulator: [/tmp/soli-ios-verify-merged-pass2-loaded.png](/tmp/soli-ios-verify-merged-pass2-loaded.png)
  - Android phone: [/tmp/soli-android-phone-merged-3.png](/tmp/soli-android-phone-merged-3.png)
  - Android emulator: [/tmp/soli-android-emulator-merged-2.png](/tmp/soli-android-emulator-merged-2.png)
- Research-only verification artifacts:
  - Android fallback dump from connected phone confirms `sans-serif -> Roboto-Regular.ttf` and fallback families `und-Zsye -> NotoColorEmoji.ttf`, `und-Zsym -> NotoSansSymbols-Regular-Subsetted2.ttf`.
  - Rebuilt merged font after reverting the temporary 800-setting back to `RANK_WEIGHT = 700`.
  - Current merged-font metadata after rebuild: `OS/2.usWeightClass = 400`, style name `Regular`, family name `CardTextAndroid`.
- Weighted merged-font verification artifacts:
  - iOS simulator after real font variants and metric normalization: [/tmp/soli-ios-merged-pass3.png](/tmp/soli-ios-merged-pass3.png)
  - iOS simulator after final iOS sizing pass: [/tmp/soli-ios-merged-pass4.png](/tmp/soli-ios-merged-pass4.png)
  - Android phone after weighted merged-font pass: [/tmp/soli-android-phone-merged-improvement.png](/tmp/soli-android-phone-merged-improvement.png)
  - Android phone final sanity check: [/tmp/soli-android-phone-final-sanity.png](/tmp/soli-android-phone-final-sanity.png)
  - iOS simulator after screenshot-measured corner alignment pass: [/tmp/soli-ios-merged-pass6-board.png](/tmp/soli-ios-merged-pass6-board.png)
  - Android phone after screenshot-measured corner alignment pass: [/tmp/soli-android-phone-final-linecheck-2.png](/tmp/soli-android-phone-final-linecheck-2.png)
  - iOS simulator after dedicated corner-suit font pass: [/tmp/soli-ios-merged-pass7-board.png](/tmp/soli-ios-merged-pass7-board.png)
  - Android phone after dedicated corner-suit font pass: [/tmp/soli-android-phone-corner-suit-1.png](/tmp/soli-android-phone-corner-suit-1.png)
  - iOS simulator after shared corner-family font pass: [/tmp/soli-ios-merged-pass8-board.png](/tmp/soli-ios-merged-pass8-board.png)
  - Android phone after shared corner-family font pass: [/tmp/soli-android-phone-corner-family-1.png](/tmp/soli-android-phone-corner-family-1.png)
  - iOS simulator after unified single-family clean rebuild: [/tmp/soli-ios-clean-unified-font-board-ready.png](/tmp/soli-ios-clean-unified-font-board-ready.png)
  - Android phone after unified single-family release install: [/tmp/soli-android-phone-unified-card-font.png](/tmp/soli-android-phone-unified-card-font.png)
  - iOS simulator after corner-suit weight follow-up: [/tmp/soli-ios-clean-unified-font-weight.png](/tmp/soli-ios-clean-unified-font-weight.png)
  - Android phone after corner-suit weight follow-up: [/tmp/soli-android-phone-corner-suit-weight-pass.png](/tmp/soli-android-phone-corner-suit-weight-pass.png)
  - Screenshot measurement workflow examples:
    - iOS club corner crop example: `python3 scripts/measure-card-corners.py --image /tmp/soli-ios-clean-unified-font-board-ready.png --card-geometry 190x120+12+965 --threshold 80`
    - Android top-card crop example: `python3 scripts/measure-card-corners.py --image /tmp/soli-android-phone-corner-suit-weight-pass.png --card-geometry 210x130+778+638 --threshold 80`
