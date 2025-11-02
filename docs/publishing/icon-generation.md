# Icon Generation Workflow

_Last updated: 2025-11-01_

This guide documents how the Solitaire icon set (app icon, Android adaptive icon foreground, and web favicon) is generated for PBI 8.

## Overview

- Base artwork is a green felt background with a stylised heart card rendered programmatically.
- Assets are produced with a Python script that leverages Pillow inside the project virtual environment (`.venv`).
- Outputs are written to `assets/images/` and referenced from `app.json`.

## Prerequisites

1. Python 3.11+
2. Virtual environment created at the repo root: `python3 -m venv .venv`
3. Pillow installed inside the venv: `source .venv/bin/activate && pip install Pillow`

## Generation Steps

1. Activate the virtual environment:
   ```sh
   source .venv/bin/activate
   ```
2. Run the asset script:
   ```sh
   python3 - <<'PY'
   # (See docs/publishing/icon-generation.md in repo history for latest script)
   PY
   ```
   The script constructs three PNGs with consistent geometry:
   - `assets/images/icon.png` (1024×1024) – iOS/web icon with solid background
   - `assets/images/adaptive-icon.png` (1080×1080) – Android foreground with transparent backdrop
   - `assets/images/favicon.png` (256×256) – Downscaled favicon for web
3. Deactivate the venv when finished: `deactivate`

## Design Notes

- Card dimensions scale proportionally with the canvas size to keep consistent padding.
- A subtle drop shadow adds depth while keeping the card legible at smaller sizes.
- Corner pips mirror the central heart to maintain recognisable solitaire styling.
- Adaptive icon relies on Expo `android.adaptiveIcon.backgroundColor` (`#0b8b3c`) to supply the felt background.

## Verification

- Run `npx expo-doctor` to ensure the new assets are registered correctly.
- Build/preview the project (`npx expo export --platform web ...`) to confirm the icon appears in manifests.
- Spot-check rendered icons using Expo DevTools or platform-specific previewers.

## Revision History

| Date       | Author    | Notes |
| :--------- | :-------- | :---- |
| 2025-11-01 | AI Agent  | Initial documentation of automated asset workflow. |

