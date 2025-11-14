# PBI-18: Developer celebration metadata overlay

[View in Backlog](../backlog.md#user-content-18)

## Overview
Expose structured metadata for each victory celebration so that developer mode can display the currently running animation name and identifier during a win sequence.

## Problem Statement
The Klondike screen embeds celebration definitions directly inside the main component, making it difficult to locate, extend, or describe individual animations. Developers currently have no way to confirm which celebration mode is active when debugging randomized wins.

## User Stories
- As a developer running the game in developer mode, I want to see the celebration identifier and name while the animation plays so that I can verify specific behaviors.
- As a developer maintaining the celebrations list, I want the definitions stored in a dedicated, discoverable module with human-readable names so that extending or tweaking modes is straightforward.

## Technical Approach
- Extract celebration mode constants, wobble helpers, and transform logic out of `app/(tabs)/index.tsx` into a reusable `src/animation/celebrationModes.ts` module.
- Define metadata for each celebration mode, including a deterministic numeric identifier and a descriptive display name.
- Surface a derived label (e.g., “Celebration 03 · Spiral Bloom”) on the Klondike screen whenever developer mode is enabled and a celebration is active.
- Ensure the refactor keeps existing celebration timing, seeding, and behavior untouched by re-exporting required constants from the new module.

## UX/UI Considerations
- The celebration label should sit in the lower-right corner of the playfield without obscuring core gameplay elements.
- Styling should be subtle, using small typography and translucency to avoid distracting players; only render the label in developer mode.
- The label must remain legible on both light and dark felt backgrounds and respect safe-area insets.

## Acceptance Criteria
1. Celebration mode logic resides in a dedicated module that exports the constants and helpers consumed by the Klondike screen.
2. Each celebration mode exposes a stable numeric ID and human-readable name accessible to the UI layer.
3. When developer mode is enabled and a celebration runs, the Klondike screen shows the active celebration’s ID and name in the bottom-right corner until the celebration ends.

## Dependencies
- Relies on the developer mode toggle from PBI 16 to determine when to render debug overlays.
- Must preserve existing celebration sequencing and timing hooks implemented under PBIs 6 and 14.

## Open Questions
- Should the overlay also include runtime diagnostics (duration, card count) in future PBIs?

## Related Tasks
- [Tasks for PBI 18](./tasks.md)











