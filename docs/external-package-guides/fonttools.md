# fontTools Guide

Last refreshed: 2026-07-03

## Scope

- Package/tool: `fonttools`
- This is the canonical Soli guide for this package or tool.
- Add future source refreshes here instead of creating task- or feature-prefixed guide files.

## Current guidance

Use this for font merge/subset/inspection workflows. Keep generated font artifacts reproducible and document exact commands used for any committed asset changes.

## Detailed guidance

The sections below are the definitive combined notes for this package or tool. Keep version-specific context when it affects compatibility, but update this single file instead of adding task- or feature-prefixed guides.

### Android Card Font Generation Notes

## Research timestamp
- 2026-03-11 (Europe/Zurich)
- Refresh checked 2026-07-03 (Europe/Zurich)

## Primary sources
- https://fonttools.readthedocs.io/en/latest/
- https://fonttools.readthedocs.io/en/stable/subset/
- https://fonttools.readthedocs.io/en/latest/varLib/instancer.html
- https://fonttools.readthedocs.io/en/latest/ttLib/ttFont.html
- https://fonttools.readthedocs.io/en/stable/ttLib/scaleUpem.html
- https://pypi.org/project/fonttools/

## What this package provides
- `fonttools` can instantiate a static font from a variable font using `fontTools.varLib.instancer`.
- `fonttools` can subset an existing font down to only the glyphs required by the app using `fontTools.subset`.
- `fontTools.ttLib.TTFont` provides direct read/write access for programmatic font processing in Python.

## Practical usage notes for this task
- Use `instantiateVariableFont(..., static=True, updateFontNames=False)` on the Android `Roboto-Regular.ttf` source file to create static rank donor variants.
- Use `fontTools.subset` so the rank donor contains only `A1234567890JQK` and the suit host contains only `♠♣♥♦`.
- Merge the Roboto rank glyphs into the Android suit host font so the live app can render cards from one bundled family with multiple weights.
- Save the generated outputs under `assets/fonts/` as the `CardTextAndroid` family variants so Expo can bundle them natively without runtime font transformation.
- The current shipping approach is font-only again; the earlier `assets/card-suits/` experiment is no longer part of the live path.

## Example task pattern
```py
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

rank_font = TTFont("Roboto-Regular.ttf")
rank_font = instantiateVariableFont(rank_font, {"wght": 700}, updateFontNames=False, static=True)

rank_subsetter = subset.Subsetter()
rank_subsetter.populate(text="A1234567890JQK")
rank_subsetter.subset(rank_font)
rank_font.save("CardTextAndroid-Bold.ttf")
```

## Task fit assessment
- This task needs exact Android-derived outlines and one shared metric system, so static generated variants are preferable to relying on runtime variable-font support or multiple independent families.
- The Python API is sufficient for the merged bundled family; no project runtime dependency is needed.

## Refresh check (2026-07-03)

- Status: still current for Android card font-generation work.
- PyPI check shows `fonttools==4.63.0` as current. Official docs now state
  Python 3.10+ is required.
- The key APIs used here remain the right ones: `TTFont` for read/write access,
  `fontTools.subset` / `pyftsubset` for glyph reduction, and
  `instantiateVariableFont(..., static=True)` for static instances.
- If future work rescales glyphs before merging fonts, prefer the documented
  `fontTools.ttLib.scaleUpem.scale_upem` helper and verify output visually; its
  docs call out unsupported AAT/Graphite tables and CFF/CFF2 de-subroutinizing.

### Card Font Parity Notes

Date: 2026-03-24

## Purpose

Capture the specific `fontTools` details needed for the merged card-font approach, where one bundled font carries both the Android-derived rank glyphs and the Android-derived suit glyphs.

## Sources

- [fontTools docs](https://fonttools.readthedocs.io/en/latest/)
- [fontTools ttLib TTFont docs](https://fonttools.readthedocs.io/en/latest/ttLib/ttFont.html)
- [fontTools subset docs](https://fonttools.readthedocs.io/en/latest/subset/)
- [fontTools scaleUpem docs](https://fonttools.readthedocs.io/en/stable/ttLib/scaleUpem.html)
- [fontTools PyPI](https://pypi.org/project/fonttools/)
- [Expo fonts guide](https://docs.expo.dev/develop/user-interface/fonts/)
- [OpenType `head` table](https://learn.microsoft.com/en-us/typography/opentype/spec/head)
- [OpenType `hhea` table](https://learn.microsoft.com/en-us/typography/opentype/spec/hhea)
- [OpenType `OS/2` table](https://learn.microsoft.com/en-us/typography/opentype/spec/os2)
- [OpenType recommendations](https://learn.microsoft.com/en-us/typography/opentype/spec/recom)

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

## Refresh check (2026-07-03)

- Status: still useful for explaining the merged Android-derived card font.
- PyPI check shows `fonttools==4.63.0` as current; official docs now state
  Python 3.10+ is required.
- The `TTFont`, `subset`, and `scaleUpem` docs still support this guide's API
  assumptions. Keep this as build-time tooling only; no app runtime dependency is
  needed.
- For any future rewrite, avoid casually mixing outline formats inside one font.
  The OpenType recommendations prefer choosing one outline format where possible,
  and this project should keep visual verification after every metrics/glyph merge
  because the live risk is rasterization drift, not just file validity.
