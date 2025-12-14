# Tasks for PBI 14: Deterministic card flights and foundation feedback

This document lists all tasks associated with PBI 14.

**Parent PBI**: [PBI 14: Deterministic card flights and foundation feedback](./prd.md)

## Task Summary

| Task ID | Name | Status | Description |
| :------ | :--- | :----- | :---------- |
| 14-1 | [Render stacked foundation cards for deterministic flights](./14-1.md) | Review | Ensure each foundation pile renders the full stack so rapid moves retain their animation state. |
| 14-2 | [Refactor flight animation module with logging](./14-2.md) | Review | Extract a shared flight controller file, unify automation/manual paths, and add structured dev logging for all flights and wiggles. |
| 14-3 | [Reuse foundation cards for celebration animation](./14-3.md) | Review | Drive celebration motion directly from mounted foundation cards so completion visuals stay accurate, including the final king. |
| 14-4 | [Harden measurement + flight gating (LayoutMetrics warning, drawer origin)](./14-4.md) | Review | Make card snapshot measurement resilient and ensure draw/undo wait for valid origins to prevent off-screen flights and Reanimated LayoutMetrics warnings. |
| 14-5 | [Evaluate Reanimated 4.2 upgrade + feature flags](./14-5.md) | Review | Assess whether upgrading to Reanimated 4.2+ and enabling targeted feature flags improves animation smoothness without introducing regressions. |


