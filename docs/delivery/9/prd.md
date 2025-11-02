# PBI-9: Configurable settings experience

[View in Backlog](../backlog.md#user-content-9)

## Overview
Introduce a settings surface accessible from the burger menu with animation toggles, dark mode configuration, and persistent storage.

## Problem Statement
Players currently have no way to customize animations or theme behavior, and the app lacks a centralized settings interface.

## User Stories
- As a player I want configurable settings accessible from the burger menu so that I can tailor the experience.

## Technical Approach
- Add a settings entry to the burger menu that loads a Tamagui-based settings screen.
- Provide master and per-animation toggles wired into existing feature flags.
- Persist preferences using `@react-native-async-storage/async-storage` and hydrate on app launch.
- Offer dark mode options for on/off/auto, integrating with system theme detection.

## UX/UI Considerations
- Follow Tamagui design guidance for toggles, lists, and grouping.
- Maintain clarity between global animation toggle and per-animation overrides.
- Ensure accessibility for dark mode previews and toggles.

## Acceptance Criteria
1. Settings lives in the burger menu and allows toggling all animations globally and individually.
2. Settings persist via `@react-native-async-storage/async-storage`.
3. Dark mode supports on/off/auto using Tamagui patterns and references the chosen UI approach.

## Dependencies
- Navigation updates from PBI-7 and animation hooks from PBIs 4-6.

## Open Questions
- Determine if any migration is required for legacy installs when moving to AsyncStorage.

## Related Tasks
- To be defined in `docs/delivery/9/tasks.md`.

