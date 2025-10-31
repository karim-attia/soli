# Tasks for PBI 1: Build Klondike Solitaire MVP
This document lists all tasks associated with PBI 1.

**Parent PBI**: [PBI 1: Build Klondike Solitaire MVP](./prd.md)

## Task Summary

| Task ID | Name | Status | Description |
| :------ | :----------------------------------------------- | :------- | :------------------------------------------------------------- |
| 1-1 | [Stand up Klondike engine and reducer](./1-1.md) | Done | Model cards/piles, deal logic, move validation, undo snapshots. |
| 1-2 | [Build Tamagui UI and interactions](./1-2.md) | Done | Render piles/cards, selection UX, and hook UI to reducer actions. |
| 1-3 | [Wire controls, draw-1 cycling, undo UX](./1-3.md) | Done | Implement draw/undo/new-game controls and polish gameplay flows. |
| 1-4 | [E2E CoS Test Plan + execution](./1-4.md) | Proposed | Document and run holistic test plan covering acceptance criteria. |
| 1-5 | [Responsive layout + header controls refresh](./1-5.md) | Done | Remove horizontal scroll, auto-resize tableau columns, move New Game into header. |
| 1-6 | [Tap/hold interaction overhaul](./1-6.md) | Done | Add tap-to-auto-move plus long-press manual selection UX with feedback. |
| 1-7 | [Auto-complete endgame workflow](./1-7.md) | Done | Detect no face-down cards and auto-play remaining moves to foundations. |
| 1-8 | [Klondike solver (deckOrder) + difficulty](./1-8.md) | InProgress | Implement a solver that evaluates solvability and difficulty from a given deck order (draw-1, unlimited recycles). |
| 1-9 | [Atomic solver approaches and flows](./1-9.md) | Review | Document approaches (minimal paths to next flip) and ranking/flow logic. |
| 1-10 | [Atomic flip solver + toggle](./1-10.md) | InProgress | Implement atomic flip solver and option to select strategy. |
