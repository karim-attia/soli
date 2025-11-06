# PBI-14: Deterministic card flights and foundation feedback

[View in Backlog](../backlog.md#user-content-14)

## Overview
Refactor the solitaire animation pipeline so every card flight originates from the correct pile, renders smoothly during auto-complete and celebrations, and never triggers stray foundation wiggles.

## Problem Statement
The current animation system only renders the top foundation card, drops in-flight animations when subsequent moves occur quickly, and mixes measurement logic with reducer dispatch. This causes skipped flights, inconsistent celebrations, and spurious invalid-move wiggles triggered by automation.

## User Stories
- As a developer I want flight animations and foundation feedback to be deterministic so that players always see cards travel from their true origin without stray wiggles.

## Technical Approach
- Render full foundation piles so every card remains mounted and measurable during rapid sequences and celebrations.
- Introduce a dedicated flight animation module that queues moves, freezes origin snapshots, and emits structured dev logs for every flight and wiggle.
- Ensure automation (auto-complete, celebration) and manual flows use the same controller APIs with consistent timings and instrumentation.
- Reuse the existing developer logger so demo mode and diagnostics show detailed per-move traces.

## UX/UI Considerations
- Auto-complete and celebration sequences must remain smooth without abrupt snaps or missing animations.
- Invalid-move wiggles should continue to provide feedback on manual taps but stay suppressed for automated foundation moves.
- Additional logging must not surface to end users or degrade performance; confine it to dev builds and demo mode overlays.

## Acceptance Criteria
1. Foundation piles render all stacked cards, preserving in-progress animations even when multiple moves occur back-to-back.
2. Manual, auto-complete, and celebration flights share one abstraction that logs origin, destination, and card identifiers for each animation.
3. Foundation piles never wiggle as a side-effect of automation while manual invalid taps still trigger the wiggle feedback.

## Dependencies
- Existing card rendering components and Reanimated-based animation utilities.
- `devLogger` instrumentation for structured debug output.

## Open Questions
- Should verbose flight logging be gated behind a developer-mode toggle or remain always-on in non-production builds?
- Are additional metrics (e.g., duration, retries) needed to support future analytics beyond the current scope?

## Related Tasks
- Tracked in `docs/delivery/14/tasks.md`.


