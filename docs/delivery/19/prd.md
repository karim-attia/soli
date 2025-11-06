 # PBI-19: In-game statistics and timer controls
 
 [View in Backlog](../backlog.md#user-content-19)
 
 ## Overview
 Introduce configurable in-game statistics so players can optionally monitor their move count and elapsed time during Klondike sessions. The statistics should respect user preferences, display unobtrusively, and ensure the timer reflects active play rather than idle setup.
 
 ## Problem Statement
 Players currently see the move counter without control over its visibility and cannot view elapsed game time. The timer should start only when meaningful play begins to avoid penalizing contemplation before the first move. Additionally, starting a new game should surface the first stock card automatically to match classic solitaire expectations while keeping the timer paused until the player acts.
 
 ## User Stories
 - As a player who cares about performance, I want to enable a game timer so I can gauge how quickly I solve each shuffle.
 - As a player who prefers a clean layout, I want to control whether move and time statistics appear so the interface matches my preferences.
 - As a player familiar with classic solitaire, I want the first stock card exposed when a new game begins so the board feels ready without affecting the timer.
 
 ## Technical Approach
 - Extend the settings store and UI with a “Game Statistics” section that toggles the visibility of the move counter and game timer individually, persisting choices alongside existing preferences.
 - Introduce a game-clock service that starts on the first user-generated move, pauses on win/end states, resets on new games, and exposes a formatted elapsed time suitable for UI display.
 - Render a statistics HUD in the top-right corner of the Klondike screen that shows the move count and/or elapsed time based on enabled settings, styled to avoid overlapping controls and respecting safe-area insets.
 - Adjust the new-game flow so the first stock card is revealed immediately while ensuring that timer state remains reset until the player performs the first valid move.
 - Emit analytics or logging hooks (if available) when statistics toggles change to support future insights into feature usage.
 
 ## UX/UI Considerations
 - Statistics HUD should align with existing typography and color tokens, maintaining readability against the playfield background.
 - Respect safe-area insets and avoid covering tableau columns or controls; consider stacking stats vertically with subtle separators.
 - Provide brief descriptive copy within settings to clarify what each toggle controls and when the timer begins.
 - Ensure accessibility by maintaining sufficient contrast and supporting VoiceOver labels for the statistics.
 
 ## Acceptance Criteria
 1. Settings includes a “Game Statistics” group with persisted toggles for showing move count and elapsed time; disabling both hides the entire HUD.
 2. The Klondike screen displays move and/or time stats in the top-right corner only when their toggles are enabled, and the timer starts after the first valid move then pauses/resets appropriately on win, loss, or new game.
 3. Starting a new game automatically reveals the first stock card without starting the timer until the player makes the first move.
 
 ## Dependencies
 - Relies on the existing settings infrastructure introduced in PBI 9.
 - Depends on the current move-count tracking logic; enhancements must remain compatible.
 
 ## Open Questions
 - Should the timer pause when the app background is detected or only on explicit win/lose states?
 - Do we need to surface average time/move statistics beyond the immediate HUD in a future PBI?
 
 ## Related Tasks
 - [Tasks for PBI 19](./tasks.md)
 

