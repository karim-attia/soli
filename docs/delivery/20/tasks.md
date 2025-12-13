# Tasks for PBI 20: Undo timeline scrubber
This document lists all tasks associated with PBI 20.

**Parent PBI**: [PBI 20: Undo timeline scrubber](./prd.md)

## Task Summary

| Task ID | Name | Status | Description |
| :------ | :----------------------------------------------- | :-------- | :----------------------------------------------- |
| 20-1 | [Implement timeline scrubbing UI](./20-1.md) | Review | Difficulty: Medium. Long-pressing undo reveals a dimmed button and full-width slider overlay. |
| 20-2 | [Bind slider to undo/redo history](./20-2.md) | Review | Difficulty: Hard. Map slider values to historical states, supporting backward and forward replay. |
| 20-3 | [E2E CoS test: undo timeline scrubber](./20-3.md) | Proposed | Difficulty: Medium. Validate the scrubbing interaction across key acceptance criteria. |
| 20-4 | [Anchor scrub start to current index](./20-4.md) | Review | Prevent the slider from jumping under the thumb when scrubbing begins. |
| 20-5 | [Proportional scrub delta mapping](./20-5.md) | Review | Map finger travel to the available left/right timeline bounds from the anchor. |
| 20-6 | [Fix iOS scrubber gesture premature cancellation](./20-6.md) | Review | iOS-specific issue where scrubber closes during active swipe. |

