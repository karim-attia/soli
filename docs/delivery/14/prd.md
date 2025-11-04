# PBI-14: Deterministic flight animation pipeline

[View in Backlog](../backlog.md#user-content-14)

## Overview
Flight animations occasionally fail to render or trigger unintended foundation wiggles. We need a deterministic pipeline that measures card positions, schedules moves, and provides observability so regressions are visible instantly.

## Problem Statement
Current flight orchestration splits responsibilities across UI components and reducer dispatches. Moves sometimes fire before snapshots are available, resulting in missing animations, and foundation feedback conflates automated and manual interactions.

## User Stories
- As a developer I want a unified animation orchestrator so that every card flight animates with consistent timing and origin.
- As a QA engineer I want instrumentation that highlights suppressed flights or wiggle overrides so issues are easy to diagnose.

## Technical Approach
- Introduce a dedicated flight controller module that manages snapshot collection, move queueing, and animation scheduling independent of React lifecycle timing.
- Replace ad-hoc layout listeners with a centralized registry fed by lightweight view bindings.
- Add structured logging and dev tooling (e.g., toggleable overlays) to surface suppressed flights or fallback behavior.
- Refine foundation feedback to distinguish automation from manual taps, ensuring wiggles only trigger for true invalid player input.

## UX/UI Considerations
- Animations must remain fluid at 60fps and align with existing visual language (duration/easing).
- Instrumentation overlays should be developer-only and disabled by default in production builds.

## Acceptance Criteria
1. Every manual or automated card move plays a visible flight animation originating from the card’s prior position, verified via automated integration tests and manual QA.
2. Foundation piles never wiggle as a result of automation, while manual invalid taps still provide feedback.
3. Developer instrumentation (logs or overlay) surfaces any suppressed animation or fallback path for diagnosis.

## Dependencies
- Current animation utilities in `app/(tabs)/index.tsx` and snapshot tracking logic.
- Reanimated configuration and card rendering components.

## Open Questions
- Should the controller live in the reducer layer, a standalone service, or context provider?
- Do we need additional metrics (e.g., perf counters) to monitor animation throughput in production builds?

## Related Tasks
- To be defined in `docs/delivery/14/tasks.md`.





