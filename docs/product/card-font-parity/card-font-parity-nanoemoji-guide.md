# Card Font Parity Nanoemoji Guide

Date: 2026-03-23

## Purpose

Capture the specific `nanoemoji` details needed for the card-font-parity work, so the Android-derived suit font can stay font-only while becoming more portable to iOS.

## Sources

- [Nanoemoji README](https://github.com/googlefonts/nanoemoji)
- [Noto Emoji README](https://github.com/googlefonts/noto-emoji)
- [Google Fonts color font guide](https://googlefonts.github.io/gf-guide/color.html)
- [Expo font guide](https://docs.expo.dev/develop/user-interface/fonts/)

## Key facts

- `nanoemoji` builds color fonts from SVG input and supports several output formats, including `COLRv1`, `SVG`, `sbix`, and `CBDT`.
- `nanoemoji` also ships `maximum_color`, which can add color tables to an existing color font.
- The `maximum_color` workflow can generate the other vector color table when the input font already has one vector color table:
  - COLR input -> SVG output table can be added
  - SVG input -> COLR output table can be added
- Google’s Noto Emoji project says `NotoColorEmoji` uses the `CBDT/CBLC` format in its README example, but the physical Android phone used in this project currently ships a `COLRv1` build of `NotoColorEmoji.ttf`.
- Google Fonts’ color-font guidance says a static `COLRv1` font should also have an equivalent `SVG` table.
- Expo’s preferred custom-font setup is native embedding through the `expo-font` config plugin.

## Why this matters here

- Android already renders the bundled suit font well.
- iOS still renders the suit symbols differently from Android.
- The current best hypothesis is that adding an `SVG` table to the same Android-derived suit font gives iOS a color table it can honor more reliably, while Android can keep using the existing Android-friendly color table.

## Commands used in this project

Create a temporary Python environment for font tooling:

```bash
python3 -m venv /tmp/soli-colorfont-work/venv
/tmp/soli-colorfont-work/venv/bin/pip install --upgrade pip
/tmp/soli-colorfont-work/venv/bin/pip install nanoemoji fonttools ninja
```

Inspect the Android phone font:

```bash
adb -s 192.168.1.12:38259 pull /system/fonts/NotoColorEmoji.ttf /tmp/soli-colorfont-work/device-NotoColorEmoji.ttf
```

Subset the suit glyphs only:

```bash
PATH=/tmp/soli-colorfont-work/venv/bin:$PATH \
pyftsubset /tmp/soli-colorfont-work/device-NotoColorEmoji.ttf \
  --unicodes=U+2660,U+2663,U+2665,U+2666 \
  --name-IDs='*' \
  --name-legacy \
  --name-languages='*' \
  --output-file=/tmp/soli-colorfont-work/build-suits/subset.ttf
```

Add the `SVG` table to the subsetted suit font:

```bash
PATH=/tmp/soli-colorfont-work/venv/bin:$PATH \
maximum_color \
  --build_dir /tmp/soli-colorfont-work/build-suits/build \
  /tmp/soli-colorfont-work/build-suits/subset.ttf
```

The resulting font is emitted as:

```text
/tmp/soli-colorfont-work/build-suits/build/Font.ttf
```

## Notes and caveats

- `maximum_color` writes its output into the build directory instead of overwriting the input font.
- `maximum_color` expects supporting tools such as `ninja` and `picosvg` to be on `PATH`; installing `nanoemoji` and `ninja` into the same virtualenv is enough for this workflow.
- The build output should be renamed to the app’s internal family name after generation so Expo/React Native can address it deterministically.
