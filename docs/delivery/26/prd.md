# PBI-26: Ensure card flights always render above UI

[View in Backlog](../backlog.md#user-content-26)

## Overview
Card flight animations occasionally render beneath other interface layers (e.g., tableau columns, stock stack, overlays), making the motion hard to follow. We need to consolidate layering rules, understand React Native and Tamagui z-index behaviour, and ensure every flight path displays above the rest of the UI.

## Problem Statement
- Flights that traverse across component boundaries sometimes end up below adjacent stacks.
- Increasing z-index locally is insufficient because React Native only respects z-index within the same stacking context.
- Without a reliable layering strategy, the animation fidelity suffers and regressions reappear after future refactors.

## User Stories
- As a player, I want every animated card flight to remain visible so that I can track where cards travel.
- As a developer, I want a documented layering approach so future card-related features can respect the stacking constraints.

## Technical Approach
- Perform a research spike comparing React Native/Tamagui stacking strategies (z-index, absolute positioning, elevation, portals/modals, shared overlay roots).
- Inventory all card flight combinations (stock↔waste↔tableau↔foundation) and capture their orchestration path in the codebase.
- Evaluate creating or reusing a shared overlay layer (e.g., Tamagui `Portal` or React `createPortal`) to host transient flight components above gameplay UI.
- Standardize measurement and rendering of flights so they are always rendered under the same overlay root with deterministic z-ordering constants.
- Instrument logging to confirm which layer each animation uses and to help future debugging.

## UX/UI Considerations
- Flights must remain smooth with existing timings and easing profiles.
- Layering changes must not introduce flicker or delay when cards land.
- Any overlay roots must respect safe areas and screen scaling already handled by Tamagui.

## Acceptance Criteria
- `docs/delivery/26/animation-layering-research.md` summarizes findings, citations, and recommends an approach.
- Each flight combination (stock→waste, waste→tableau, tableau→tableau, tableau→foundation, foundation→tableau, stock→foundation) renders above overlapping UI elements during manual play and automation.
- A repeatable validation strategy (tests or instrumentation) for every combination is documented and feasible to automate.
- Documentation in backlog, tasks index, and task detail files stays synchronized.

## Dependencies
- Existing flight orchestration modules under `src/features/klondike` and any shared animation utilities.
- Tamagui portal/overlay primitives and React Native gesture/animation libraries (Reanimated).

## Open Questions
- Do we leverage Tamagui `Portal` or React Native `Modal`, or can we extend existing overlay layering (`CardFlightLayer` if present)?
- What is the minimal abstraction needed so future features (e.g., celebrations) can reuse the overlay without coupling?

## Related Tasks
- See the task index at `docs/delivery/26/tasks.md` for the current task list and status.

