# Card Font Parity FontTools Guide

Date: 2026-03-24

## Purpose

Capture the specific `fontTools` details needed for the merged card-font approach, where one bundled font carries both the Android-derived rank glyphs and the Android-derived suit glyphs.

## Sources

- [fontTools ttLib TTFont docs](https://fonttools.readthedocs.io/en/latest/ttLib/ttFont.html)
- [Expo fonts guide](https://docs.expo.dev/develop/user-interface/fonts/)
- [OpenType `head` table](https://learn.microsoft.com/en-us/typography/opentype/spec/head)
- [OpenType `hhea` table](https://learn.microsoft.com/en-us/typography/opentype/spec/hhea)
- [OpenType `OS/2` table](https://learn.microsoft.com/en-us/typography/opentype/spec/os2)

## Key concepts

- `unitsPerEm` lives in the `head` table and sets the internal coordinate grid for glyph geometry.
- Global vertical metrics such as ascender, descender, and line gap live in the `hhea` and `OS/2` tables.
- Glyph outlines and glyph-level geometry live in glyph tables such as `glyf`, while Unicode codepoint mapping lives in `cmap`.
- `TTFont` is the main read/write interface for font files in `fontTools`.
- `scaleUpem` can rescale a whole font to a different `unitsPerEm`, which is useful before moving glyphs between fonts.

## Why this matters here

- The old Android card look relied on fallback and native text layout.
- The app later moved to two explicit bundled fonts, one for ranks and one for suits.
- Even if the glyph source was correct, those two fonts still carried different metrics and therefore produced different line boxes.
- Merging both glyph sets into one font makes the card corners share one metric system again.

## Implementation notes used in this project

- Base container font:
  - Android-derived `NotoColorEmoji.ttf`, subset to `♠♣♥♦`
  - kept as the host font because it already carries the desired Android suit glyph source
- Rank donor font:
  - Android-derived `Roboto-Regular.ttf`, instantiated at `wght=700`
  - subset to `A1234567890JQK`
- Merge strategy:
  - rescale the Roboto subset with `scaleUpem` to match the suit font’s `unitsPerEm`
  - copy the rank glyphs into the suit font’s `glyf` and `hmtx`
  - update `cmap` so rank codepoints resolve to the injected rank glyphs
  - rename the final font family to `CardTextAndroid`

## Practical consequence

- The app now asks both the top-left rank and the top-right / center suit to render from the same custom family.
- That does not guarantee perfect cross-platform rasterization, but it does remove the avoidable rank-vs-suit metric mismatch that existed when two different bundled families were used.
