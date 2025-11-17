# PBI-24: Reusable Google Play Feature Graphic Composition

[View in Backlog](../backlog.md#user-content-24)

## Overview
Create a static, reusable screen that assembles Klondike game visuals and marketing copy at the 1024×500 ratio required for Google Play feature graphics. The page should let the team capture high fidelity screenshots that stay in sync with evolving UI components.

## Problem Statement
We currently lack a dedicated composition that matches Google Play’s feature graphic specifications. Capturing marketing assets from gameplay screens risks misaligned safe areas, missing copy, and inconsistent branding.

## User Stories
- As a store marketing designer, I want a purpose-built screen laid out to feature graphic specs so that I can capture updated artwork without manual alignment work.
- As a developer, I want the composition to reuse existing Klondike UI components so that ongoing gameplay updates automatically appear in new graphics.

## Technical Approach
- Implement a React screen using Tamagui primitives to arrange the Klondike layout, icon, and marketing copy within a container sized to the 1024×500 aspect ratio (no rounded corners).
- Reuse existing card components such as `CardVisual` and supporting layouts to mirror the in-game design.
- Include marketing copy blocks for “Free & no ads”, “Solvable games”, and “Quick undo time travel through game”.
- Reference documented safe areas from Task 24-1 within layout comments to guard against future regressions.

## UX/UI Considerations
- Maintain existing color palette and typography for consistency with the live game.
- Ensure primary content stays within Google Play safe area guidelines while filling the 1024×500 canvas.
- Position copy and icon elements to balance the Klondike tableau visually.

## Acceptance Criteria
1. Safe area guidance for Google Play feature graphics is documented with up-to-date references (Task 24-1).
2. The new screen renders a static composition at 1024×500 using existing Klondike components and the app icon.
3. The composition surfaces the three marketing benefits exactly as “Free & no ads”, “Solvable games”, and “Quick undo time travel through game”.

## Dependencies
- Existing Klondike component library (`CardView`, tableau/top row helpers).
- App icon asset.

## Open Questions
- Should future compositions include localized copy variants?
- Do we need automated export tooling beyond manual screenshots?

## Related Tasks
- [View task list](./tasks.md)

