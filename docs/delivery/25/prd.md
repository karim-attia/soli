# PBI-25: Calibrated card visual proportions

[View in Backlog](../backlog.md#user-content-25)

## Overview
The current `CardVisual` component uses fixed paddings and font sizes that were tuned against one developer device. When rendered on different densities or `CardMetrics`, the ranks and suits drift away from the intended look, leaving cards cramped on narrow screens and too sparse on larger ones. This PBI captures the instrumentation, measurement, and proportional layout work needed to match the reference device precisely while remaining responsive elsewhere.

## Problem Statement
Without a proportional layout system, the Klondike cards can no longer guarantee that the small corner ranks, suit symbols, and center pip match the tuned appearance verified on the connected phone. Static pixel values fail to adapt to alternate card sizes, which undermines polish and readability.

## User Stories
- As a visual QA lead, I need the in-app cards to match the calibrated physical device proportions so that the production build looks identical to what was approved.
- As a developer, I need one-click telemetry that records the exact card metrics and applied styles so future adjustments can start from a trustworthy baseline.

## Technical Approach
- Temporarily instrument `CardView` / `CardVisual` with a `devLog` helper to capture the rendered `CardMetrics` and resolved content styles once per session, then remove the logging once the reference snapshot is recorded.
- Run the demo auto-solve flow on the connected phone (with the user's assistance) to collect the logged measurements and record them in the task history.
- Convert the existing static style definitions into computed ratios driven by the captured reference width/height so that padding, offsets, and font sizes scale with `metrics`.
- Persist the most recent board layout metrics using the same AsyncStorage dependency leveraged by settings so the next launch can render with calibrated dimensions immediately.
- Keep the API identical (`CardVisual` still receives `Card` + `CardMetrics`) so downstream animation hooks remain unaffected.

## UX/UI Considerations
- Ranks and suits must remain legible at the smallest supported card size; ratios should bias toward the phone-calibrated look without clipping.
- Ensure the centered suit symbol remains vertically centered after padding adjustments so that flight animations do not reveal jumps mid-flip.
- Continue using Tamagui `Text` for typography to respect font scaling disablement matching the reference device.

## Acceptance Criteria
1. A reference measurement (48×68 card, radius 6 on the connected phone) is recorded in task documentation, and runtime logging is disabled afterward to avoid noisy output.
2. The last known board layout dimensions persist across launches, preventing the placeholder metrics from rendering on cold start.
3. The demo auto-solve flow is verified via user-provided device logs instead of automated local runs, and those logs confirm the expected measurement snapshot.
4. `CardVisual` replaces hard-coded paddings/font sizes with a single ratio relative to the logged reference measurements so cards remain proportional for arbitrary `CardMetrics`.
5. An end-to-end confirmation (Task 25-2) documents the user-provided evidence that the production build renders the updated proportions without regressions.

## Dependencies
- Existing `CardMetrics` definitions under `src/features/klondike/components/cards/types`.
- Temporary developer logging toggle in `src/state/settings.tsx` which must be enabled only when capturing new measurements.
- `scripts/run-demo-autosolve.js` for coordinating demo-mode verification (initiated by the user when required).

## Open Questions
- None at this time; the request explicitly calls for matching the connected phone’s proportions.

## Related Tasks
- [25-1 Calibrate CardVisual proportions](./25-1.md)
- [25-2 E2E CoS Test: card visual proportionality](./25-2.md)

