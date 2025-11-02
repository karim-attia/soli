# PBI-15: Hello screen polish

[View in Backlog](../backlog.md#user-content-15)

## Overview
A small, tasteful refresh of the `Hello` screen to read more clearly and feel native, using Tamagui list components for the feature list and clearer source attribution.

## Problem Statement
The existing `Hello` screen presents dense center-aligned text with plain bullet characters and a vague source link. It feels unfinished and includes a typo ("whan").

## User Stories
- As a first‑time visitor, I want a friendly, readable Hello screen so I instantly understand the app and where to find its source.

## Technical Approach
- Replace bullet points with Tamagui `YGroup` + `ListItem` for a native-feeling list.
- Improve the source hint copy to “View source on GitHub”.
- Keep the layout understated and accessible (no flashiness), center the content with sensible spacing.

## UX/UI Considerations
- Maintain subdued tones and spacing; respect current theme tokens.
- Keep copy brief and legible; avoid long paragraphs.

## Acceptance Criteria
1. The Hello screen uses Tamagui `YGroup` + `ListItem` for features.
2. The source link reads “View source on GitHub” and opens the repository.
3. Typo in the features list is corrected ("when", not "whan").
4. Layout remains simple, centered, and unobtrusive.

## Dependencies
None.

## Open Questions
None.

## Related Tasks
- See tasks list: [tasks](./tasks.md)
