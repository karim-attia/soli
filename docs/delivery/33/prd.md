# PBI-33: Freeze exact Android card glyph sources across platforms

[View in Backlog](../backlog.md#user-content-33)

## Overview
Freeze the approved Android card appearance by bundling an explicit Android-derived rank font and Android-derived suit image assets, then using them only for the card visuals on both Android and iOS.

## Problem Statement
- The original Android card look was approved by the user and depends on Android system glyphs rather than the app's Inter font.
- iOS renders different rank and suit shapes when the cards rely on platform defaults.
- Earlier attempts treated the issue as a generic cross-platform font mismatch and changed the card appearance on Android as well.
- The user wants the old Android card look preserved exactly, with explicit bundled assets so other Android devices do not drift.

## User Stories
- As a player, I want the cards on iOS to use the same rank and suit glyph sources as the approved Android look.
- As an Android player, I want the current approved Android card appearance frozen explicitly so it does not vary by device.
- As a maintainer, I want the card font asset generation process documented so the bundled fonts can be regenerated intentionally rather than guessed.

## Technical Approach
- Treat the card rank and suit visuals separately because rank still works well as text while suit symbols need exact Android artwork rather than cross-platform text rendering.
- Generate a static bold rank font from the connected Android device's `Roboto-Regular.ttf` variable font at `wght=700`.
- Capture the four suit symbols from the connected Android device's `NotoColorEmoji.ttf` and ship them as trimmed transparent assets so iOS and Android both render the same heart, diamond, club, and spade artwork.
- Load the rank font asset at app startup and apply the rank font plus suit image assets only to the card visuals.
- Keep card sizing and animation behavior unchanged so this PBI isolates glyph-source parity rather than visual layout recalibration.

## UX/UI Considerations
- Preserve the currently approved Android card proportions, spacing, and sizes.
- Do not change non-card typography such as the header, buttons, stats, or menus.
- Keep the large center suit symbol and small corner symbols visually identical to the previous approved Android look.

## Acceptance Criteria
1. Face-up card ranks use an explicit bundled Android-derived Roboto 700 font and face-up suit symbols use Android-derived `NotoColorEmoji` assets with the approved large symbol footprint on both Android and iOS.
2. The font change is scoped to the card rank/suit text only; non-card UI typography stays unchanged.
3. A reproducible, source-backed asset-generation workflow is documented for the Android-derived card assets.
4. Visual verification is recorded on the connected Android target and the booted iOS simulator.

## Dependencies
- `expo-font` for runtime rank-font loading
- `fonttools` for generating the static Android-derived rank font
- Connected Android device or emulator font sources (`Roboto-Regular.ttf`, `NotoColorEmoji.ttf`)

## Open Questions
- None for this scoped parity fix.

## Related Tasks
- See `docs/delivery/33/tasks.md`.
