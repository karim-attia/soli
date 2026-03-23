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
- Use `instantiateVariableFont(..., static=True, updateFontNames=True)` on the Android `Roboto-Regular.ttf` source file to create a static 700-weight rank font.
- Use `fontTools.subset` after instancing so the generated rank font contains only `A234567890JQK`.
- Save the generated output under `assets/fonts/` so Expo can bundle it without any runtime font transformation.
- This task now uses `fonttools` only for the generated Roboto Bold rank font. The wide-heart suit glyphs come from exact Android `NotoColorEmoji` exports checked into `assets/card-suits/`.

## Example task pattern
```py
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

rank_font = TTFont("Roboto-Regular.ttf")
rank_font = instantiateVariableFont(rank_font, {"wght": 700}, updateFontNames=True, static=True)

rank_subsetter = subset.Subsetter()
rank_subsetter.populate(text="A234567890JQK")
rank_subsetter.subset(rank_font)
rank_font.save("CardRankAndroidBold.ttf")
```

## Task fit assessment
- This task needs exact Android-derived outlines, so a static generated font is preferable to relying on runtime variable-font support.
- The Python API is sufficient for the bundled rank font; no project runtime dependency is needed.
