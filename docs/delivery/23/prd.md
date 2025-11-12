# PBI-23: Modularize Klondike Screen

[View in Backlog](../backlog.md#user-content-23)

## Overview
The Klondike screen currently concentrates game state management, animation orchestration, and all UI rendering inside `app/(tabs)/index.tsx`. The file has grown past 3,200 lines, making it hard to navigate and reason about responsibilities. This PBI refactors the screen into clearly scoped modules so that future changes land in predictable locations without breaking tightly coupled animations.

## Problem Statement
`app/(tabs)/index.tsx` mixes reducer wiring, storage hydration, animation plumbing, layout composition, and UI subcomponents. The sheer size slows down reviews, discourages reuse, and increases the odds of regressions when tweaking isolated behaviour. We need to separate concerns while preserving existing behaviour, especially for card flights, celebrations, and undo scrubbing.

## User Stories
- As a developer, I want a modular Klondike screen so that I can reason about game orchestration without scrolling through thousands of lines.
- As an animation maintainer, I want card flights, celebrations, and invalid-move feedback encapsulated in reusable helpers so that shared logic is testable and easier to evolve.

## Technical Approach
- Carve the current screen into a state orchestration entry point plus focused render components placed under `src/components/klondike/` and `src/solitaire/ui/` as appropriate.
- Extract shared hooks and utilities (e.g., timer, foundation tracking, solvable shuffle selection) into neighbouring modules under `src/solitaire/hooks/` or existing domains while keeping persistence logic in `src/storage`.
- Maintain animation pipelines by exporting typed props for flight-enabled components, keeping `useFlightController` ownership in the entry screen, and memoizing data passed to extracted components.
- Introduce barrel exports or index files where it improves discoverability, avoiding circular dependencies.
- Update inline documentation and comment call sites after moving functions to clarify responsibilities per user instruction.

## UX/UI Considerations
- Preserve the felt background, statistics HUD, undo scrubber, and celebration overlays exactly as they function today.
- Ensure extracted components continue to use Tamagui primitives and respect safe-area insets and theme-based colour choices.
- Keep gesture handlers and slider overlays responsive by forwarding refs and animation bindings correctly.

## Acceptance Criteria
1. `app/(tabs)/index.tsx` focuses on state orchestration, routing, and high-level layout, delegating UI sections to extracted components.
2. UI components such as card rendering, felt background, top row, tableau, undo scrubber, and celebration overlay live in dedicated modules with documented responsibilities and exported prop types.
3. All animation hooks (card flights, celebrations, invalid move wiggle, scrubbing) continue functioning after the refactor, with updated inline comments indicating the purpose of moved functions.

## Dependencies
- Existing animation utilities under `src/animation` and `src/utils`.
- Settings, history, and persistence hooks already defined under `src/state` and `src/storage`.

## Open Questions
- Should card metrics helpers live under `src/solitaire/metrics` or remain colocated with UI components?
- Do we need storybook or showcase entries for the extracted components to aid future iteration?

## Related Tasks
- [23-1 Define refactor strategy for Klondike screen](./23-1.md)

