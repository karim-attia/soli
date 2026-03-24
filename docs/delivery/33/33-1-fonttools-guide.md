# Task 33-1: fonttools package guide

## Research timestamp
- 2026-03-11 (Europe/Zurich)

## Primary sources
- https://fonttools.readthedocs.io/en/stable/subset/
- https://fonttools.readthedocs.io/en/latest/varLib/instancer.html
- https://fonttools.readthedocs.io/en/latest/ttLib/ttFont.html

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
