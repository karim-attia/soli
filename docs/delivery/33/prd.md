# PBI-33: Freeze exact Android card glyph sources across platforms

[View in Backlog](../backlog.md#user-content-33)

## Overview
Freeze the approved Android card appearance by bundling the exact Android rank and suit fonts, then using them only for the card visuals on both Android and iOS.

## Problem Statement
- The original Android card look was approved by the user and depends on Android system glyphs rather than the app's Inter font.
- iOS renders different rank and suit shapes when the cards rely on platform defaults.
- Earlier attempts treated the issue as a generic cross-platform font mismatch and changed the card appearance on Android as well.
- The user wants the old Android card look preserved exactly, with explicit bundled fonts so other Android devices do not drift.

## User Stories
- As a player, I want the cards on iOS to use the same rank and suit glyph sources as the approved Android look.
- As an Android player, I want the current approved Android card appearance frozen explicitly so it does not vary by device.
- As a maintainer, I want the card font sourcing process documented so the bundled fonts can be regenerated intentionally rather than guessed.

## Technical Approach
- Preserve the card renderer as native text and freeze its source fonts instead of switching cards to images or SVGs.
- Generate a static bold rank font from Android `Roboto-Regular.ttf` and keep the suit glyphs on exact Android emoji-source exports.
- Embed those fonts natively through Expo so Android and iOS both render from the same source files.
- Apply the bundled fonts only to the card ranks and suit symbols.
- Keep card sizing and animation behavior unchanged so this PBI isolates glyph-source parity rather than visual layout recalibration.

## UX/UI Considerations
- Preserve the currently approved Android card proportions, spacing, and sizes.
- Do not change non-card typography such as the header, buttons, stats, or menus.
- Keep the large center suit symbol and small corner symbols visually identical to the previous approved Android look.

## Acceptance Criteria
1. Face-up card ranks use an explicit bundled Android-derived bold Roboto font, and face-up suit symbols use exact Android emoji-source exports so the wide heart stays identical cross-platform.
2. The font change is scoped to the card rank/suit text only; non-card UI typography stays unchanged.
3. A reproducible, source-backed asset-generation workflow is documented for the Android-derived card assets.
4. Visual verification is recorded on the connected Android target and the booted iOS simulator.

## Dependencies
- `expo-font` for native bundled font loading
- Connected Android device or emulator font/glyph sources (`Roboto-Regular.ttf`, `NotoColorEmoji`)

## Open Questions
- None for this scoped parity fix.

## Related Tasks
- See `docs/delivery/33/tasks.md`.
