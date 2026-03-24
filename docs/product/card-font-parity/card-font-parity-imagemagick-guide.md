# Card Font Parity ImageMagick Guide

Date: 2026-03-24

## Description

Capture the specific ImageMagick commands and patterns used to measure the visible rank/suit bounds inside a card screenshot. This is a build-time/debugging tool only. It does not affect the app runtime.

## Sources

- [ImageMagick `magick` command reference](https://imagemagick.org/script/magick.php)

## Relevant findings

- `magick ... -crop WxH+X+Y +repage` crops an image to a deterministic region.
- `magick ... -fuzz N% -trim` trims away edges that match the corner/background color within the given tolerance.
- `magick ... -format '%wx%h%O' info:` returns the trimmed box width, height, and offset geometry in a form that is easy to parse from a script.

## Why this tool fits this task

- It is already installed on the machine, so no new app dependency is needed.
- It works well for cards because the face-up card background is white and the visible rank/suit glyphs are strongly colored against it.
- It lets us compare the visible top and bottom pixel bounds of the top-left rank and top-right suit directly from screenshots instead of guessing.

## Local workflow used here

1. Capture a fresh screenshot from the target device.
2. Identify one visible face-up top card.
3. Run [measure-card-corners.py](/Users/karim/kDrive/Code/soli/scripts/measure-card-corners.py) with that card rectangle.
4. Compare:
   - `top_diff`
   - `bottom_diff`
   - `center_diff`
   - `right_gap`
5. Adjust font metrics or corner constants, rebuild, and measure again.

## Example

```bash
python3 scripts/measure-card-corners.py \
  --image /tmp/soli-android-phone-latest.png \
  --card-geometry 126x170+0+762 \
  --debug-dir /tmp/soli-card-measure-debug
```
