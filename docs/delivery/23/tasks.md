# Tasks for PBI 23: Modularize Klondike Screen

This document lists all tasks associated with PBI 23.

**Parent PBI**: [PBI 23: Modularize Klondike Screen](./prd.md)

## Task Summary

| Task ID | Name | Status | Description |
| :------ | :--- | :----- | :---------- |
| 23-1 | [Define refactor strategy for Klondike screen](./23-1.md) | Review | Capture analysis, architecture plan, and follow-up tasks for the modular refactor. |
| 23-2 | [Extract layout scaffolding components](./23-2.md) | Review | Move felt background, statistics HUD, and undo scrubber into focused components with documented props. |
| 23-3 | [Modularise card and pile components](./23-3.md) | Review | Relocate card, waste, foundation, and tableau components into reusable modules under the new feature namespace. |
| 23-4 | [Isolate orchestration hooks](./23-4.md) | Review | Create hooks for timers, persistence, solvable shuffle selection, and celebration lifecycle. |
| 23-5 | [Integrate refactored structure](./23-5.md) | Review | Recompose the Klondike screen using extracted modules and add call-site documentation comments. |
| 23-6 | [Regression verification for refactor](./23-6.md) | Proposed | Execute regression checks and document verification after the refactor. |
| 23-7 | [Remove manual handlers & streamline scrub logic](./23-7.md) | Review | Drop legacy manual selection flows and consolidate undo scrub orchestration. |
| 23-8 | [Centralize navigation triggers](./23-8.md) | Review | Reuse drawer-opening logic across tabs and disable left-edge swipe. |
| 23-9 | [Polish residual utilities](./23-9.md) | Review | Trim unused helpers, reposition celebration badge, and clean demo helpers. |
| 23-10 | [Prune residual manual-selection helpers](./23-10.md) | Review | Remove unused selection utilities, imports, and simplify related handlers. |
| 23-11 | [Extract layout and stats helpers](./23-11.md) | Review | Move card metrics/statistics wiring out of the screen component. |
| 23-12 | [Document Klondike orchestration functions](./23-12.md) | Review | Add concise descriptions above each local function. |
| 23-13 | [Assess further screen decoupling](./23-13.md) | Review | Analyze remaining logic for potential extraction of auto-complete/UI-state split. |
| 23-14 | [Normalize card visuals](./23-14.md) | Review | Remove card border overrides, restore static styling, and expose reusable visuals. |
| 23-15 | [Extract auto-queue runner hook](./23-15.md) | Review | Move auto-complete queue orchestration into a dedicated hook. |
| 23-16 | [Move game result recording helper](./23-16.md) | Review | Relocate result-recording logic into the history module. |
| 23-17 | [Consolidate statistics view-model](./23-17.md) | Review | Let statistics helpers compute elapsed time and row visibility. |
| 23-18 | [Refresh inline function documentation](./23-18.md) | Review | Ensure each local function/effect has a concise descriptive comment. |
