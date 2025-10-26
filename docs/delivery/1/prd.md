# PBI-1: Build Klondike Solitaire MVP

[View in Backlog](../backlog.md#user-content-1)

## Overview
Create a polished draw-one Klondike Solitaire experience inside the existing Expo + Tamagui application so users can immediately play on mobile or web. The deliverable includes gameplay mechanics, Tamagui-based UI, undo support, and policy-compliant documentation/testing artifacts.

## Problem Statement
The project currently ships with a default Tamagui starter screen and provides no gameplay value. We must ship a fully working Solitaire feature so early testers can engage with the product and validate Tamagui/React Native UX decisions.

## User Stories
- As a solitaire player, I want to interact with familiar piles (stock, waste, tableau, foundations) laid out cleanly so that I can play on any device.
- As a careful player, I want an undo control so that I can experiment without committing mistakes.
- As a maintainer, I want deterministic state-management utilities so I can add future features (score, timers) safely.

- Build a reusable Klondike engine module that encapsulates card models, dealing logic, move validation, draw-1 rules, undo history snapshots, and late-game auto-complete detection.
- Use React hooks + reducers to manage game state and history while keeping UI components declarative.
- Compose Tamagui primitives (Stacks, Cards, Buttons) to render piles responsively with card dimensions that adapt to the available width (no horizontal scroll) and keep header controls visible.
- Provide two interaction models: tap-to-auto-move (preferring foundations) and tap-and-hold to enter manual placement mode, with reducer-level helpers that keep the UI thin.
- Add lightweight state serialization for undo (stack of previous states) and ensure all constants (pile counts, suits, ranks) live in a single module per policy.

## UX/UI Considerations
- Layout mirrors classic Klondike: stock + waste on the left, four foundations on the right, seven tableau columns across the main area.
- Cards show suit + rank plus subtle highlights for selection, valid destinations, and face-down states.
- Controls (Draw, Undo, New Game) stay pinned at the bottom for thumb reach, with disabled states when actions are unavailable.
- Animations remain minimal (opacity/scale) to preserve performance parity across native + web builds.

## Acceptance Criteria
1. All policy-required documentation (backlog, PRD, tasks, task histories) exists and is up to date.
2. The default tab renders a Klondike board with accurate piles, face-up / face-down management, and valid move constraints.
3. Tableau columns automatically resize to fit the available width with no horizontal scrolling, the board uses the full width (no outer border) with symmetric margins, the New Game control lives in the header next to "Hello!", foundations render in a single row on the left, and the stock/waste stack sits on the right showing a three-card waste fan with draw pile trailing the fan.
4. Cards render like the reference screenshot: smaller corner radius, rank and suit nearly touching the top corners, matching font sizes, and a centered suit icon (never ellipses) in the remaining space.
5. Tap-to-move automatically sends cards to foundations/tableau when legal; tap-and-hold enables manual destination selection just like the previous workflow, and foundation cards can be tapped/long-pressed to return to play.
6. Draw-1 stock cycling works with recycling after empty (per Klondike rules), every move (including Undo) increments the move counter, the draw pile uses iconography instead of text when recycling, and foundations without aces stay de-emphasized.
7. Once no face-down cards remain in the tableau, auto-complete runs at ~5 cards/second, draws/recycles from the stock if needed, and celebrates completion with a 🎉 toast while hiding the draw button because the game is won.
8. Starting a new game asks for confirmation so players don’t lose progress accidentally.
9. Expo build / TypeScript check completes without errors.
10. Task list includes a dedicated E2E/CoS test plan entry referencing manual verification steps.

## Dependencies
- Expo Router / React Native runtime already in repo.
- Tamagui component system for styling.
- No new external packages required beyond existing dependencies.

## Open Questions
- Automated end-to-end testing approach (Detox vs. manual) deferred to the dedicated testing task.

## Related Tasks
- [View task list](./tasks.md)
- Tasks 1-1 through 1-3 cover implementation; task 1-4 will capture the E2E CoS test planning/execution scope.
