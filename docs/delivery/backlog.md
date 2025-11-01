# Product Backlog

| ID | Actor | User Story | Status | Conditions of Satisfaction (CoS) |
| :-- | :-- | :-- | :-- | :-- |
| 1 | Mobile solitaire fan | As a player I want a Klondike Solitaire screen built with React Native and Tamagui so that I can play draw-1 games with undo on my phone. | InProgress | 1. Backlog, PRD, and policy-required task docs exist and stay synchronized.<br>2. The app renders a full Klondike layout (stock, waste, tableau, foundations) in draw-1 mode with valid move enforcement.<br>3. Players can draw, move cards via tap interactions (auto-move) or tap-and-hold for manual placement, start a new game from the header, undo the most recent move, and recycle the stock.<br>4. The board occupies the full width (no border) with symmetric margins, foundations on the left, draw/waste (fan of three) on the right, and cards show rank/suit in the top corners plus a centered suit icon for readability.<br>5. Auto-complete animates at ~5 cards per second, draws from stock if needed, and celebrates wins with a 🎉 toast once foundations complete.<br>6. Project builds successfully via Expo / React Native tooling.<br>[View Details](./1/prd.md) |
| 2 | UI polish | Animate Solitaire interactions (card movement, waste-fan slide, invalid move wiggle) for extra delight. | InReview | 1. Tableau/foundation card moves animate quickly.<br>2. Waste fan shifts left smoothly when a new card is drawn.<br>3. Invalid tap triggers a subtle wiggle instead of a toast.<br>4. Implementation documented under dedicated tasks (TBD). |
| 3 | Build engineer | As a developer I want Expo dependencies aligned with SDK 53 guidance so that builds and `expo-doctor` pass without warnings. | Done | 1. Remove disallowed direct dependencies (`@types/react-native`, `@expo/metro-config`).<br>2. Install required peer deps (e.g., `expo-constants`).<br>3. Upgrade Expo/Metro/React Native packages to the versions `expo install --check` expects for SDK 53.<br>4. `npx expo-doctor` completes without dependency errors. |
| 4 | Solitaire enthusiast | As a player I want card flights and foundation transitions to animate correctly after undo so that the board always reflects card origins visually. | Agreed | 1. Undoing a move replays the card flight from the original pile position instead of from screen center.<br>2. Tableau-to-foundation moves always animate, including auto-foundation sequences at the end of the game.<br>3. Cards landing on a foundation emit a brief glow without delaying subsequent input.<br>[View Details](./4/prd.md) |
| 5 | Auto-complete fan | As a player I want the auto-to-foundation flow to be fast and stable so that finishing a game feels smooth. | Agreed | 1. Auto-complete animates cards using the same paths as manual moves.<br>2. When auto-moving through the stock, eligible tableau moves backfill automatically to accelerate completion.<br>3. Cards already on foundations no longer wiggle when tapped during auto-complete.<br>[View Details](./5/prd.md) |
| 6 | Celebrating player | As a player I want a classic victory celebration after winning so that finishing a game feels rewarding. | Agreed | 1. After the final card reaches a foundation, interactions with the board are disabled until the celebration ends.<br>2. A win triggers one of ten randomized celebration animations that move cards around the screen.<br>3. Once the celebration ends, the existing new-game dialog appears without a cancel option.<br>[View Details](./6/prd.md) |
| 7 | Mobile app reviewer | As a player I want the layout cleaned up for release so that the game matches modern app expectations. | Agreed | 1. Bottom tabs are removed and their content moved into the burger menu.<br>2. The header shows the Klondike title where "Tab One" currently appears.<br>3. The draw button is removed from the bottom controls and the playfield uses a green background for contrast.<br>[View Details](./7/prd.md) |
| 8 | App store reviewer | As a maintainer I want publish-ready assets and metadata so that the game can ship to stores. | Agreed | 1. App icons are generated and applied across required sizes.<br>2. Store description, versioning, and related metadata are filled in.<br>3. Documentation captures how assets were generated for future updates.<br>[View Details](./8/prd.md) |
| 9 | Power user | As a player I want configurable settings accessible from the burger menu so that I can tailor the experience. | Agreed | 1. Settings lives in the burger menu and allows toggling all animations globally and individually.<br>2. Settings persist via an Expo-compatible local storage package.<br>3. Dark mode supports on/off/auto using Tamagui patterns and references the chosen UI approach.<br>[View Details](./9/prd.md) |
| 10 | Completion tracker | As a player I want to review past games so that I can see which shuffles I solved. | Agreed | 1. The burger menu links to a history page showing saved games with shuffle ID and solved state.<br>2. History persists shuffle identifiers and solved/not-solved status.<br>3. The history view displays the total number of solved games.<br>[View Details](./10/prd.md) |
| 11 | Challenge seeker | As a player I want to opt into solvable shuffles so that each game can be completed with skill. | Agreed | 1. A setting enables "solvable games only" mode.<br>2. A curated list of solvable shuffles is stored (tableau state only) while the stock remains randomized.<br>3. When the setting is enabled, the next game reuses the least-played solvable shuffle that has not been solved yet and history marks solvable games with a badge.<br>[View Details](./11/prd.md) |
| 12 | Community contributor | As a player I want to share solvable shuffles so that the catalog can grow. | Agreed | 1. A setting allows opting into sharing solved games.<br>2. When enabled, completed solvable games upload their shuffle and solution steps to a backend endpoint (to be defined).<br>3. Shared shuffles are queued for manual review and tagged accordingly in history.<br>[View Details](./12/prd.md) |

## History

| Timestamp | PBI_ID | Event_Type | Details | User |
| :-- | :-- | :-- | :-- | :-- |
| 2025-10-26 13:18:00 | 1 | create_pbi | Created PBI 1 for Solitaire/Klondike MVP. | user |
| 2025-10-26 13:20:00 | 1 | propose_for_backlog | User approved scope; PBI moved to Agreed. | user |
| 2025-10-26 13:25:00 | 1 | start_implementation | Began implementation work on PBI 1. | ai_agent |
| 2025-10-26 15:50:00 | 2 | create_pbi | Logged animation polish backlog item for future iterations. | ai_agent |
| 2025-10-26 19:48:48 | 2 | propose_for_backlog | User prioritized the animation polish backlog item for delivery. | user |
| 2025-10-26 19:48:50 | 2 | start_implementation | Reopened Task 2-1 to implement the required animations. | ai_agent |
| 2025-10-26 19:54:26 | 2 | submit_for_review | Animation polish ready for review per Task 2-1. | ai_agent |
| 2025-10-26 20:05:00 | 2 | reject | Reviewer requested targeted wiggle & toned-down draw animations; PBI back to InProgress. | user |
| 2025-10-26 20:20:11 | 2 | submit_for_review | Updated animations resubmitted for review. | ai_agent |
| 2025-10-26 20:30:00 | 2 | reject | Waste draw animation still too intense; further refinement required. | user |
| 2025-10-26 20:32:52 | 2 | submit_for_review | Per-card waste fan animation implemented to satisfy feedback. | ai_agent |
| 2025-10-26 20:33:00 | 2 | reject | Reviewer approved earlier fixes but re-opened for explicit card-flight animation. | user |
| 2025-10-26 20:37:18 | 2 | submit_for_review | Card shared transitions added so moves fly into place. | ai_agent |
| 2025-10-26 20:50:00 | 2 | reject | Reviewer requested the flight animation be slowed for visibility. | user |
| 2025-10-26 20:51:32 | 2 | submit_for_review | Increased card-flight duration to highlight the effect. | ai_agent |
| 2025-10-26 21:10:00 | 2 | reject | Reviewer still cannot see the stack-to-stack flight animation. | user |
| 2025-10-26 21:23:39 | 2 | submit_for_review | Attempted native LayoutAnimation choreography for card moves. | ai_agent |
| 2025-10-31 12:00:00 | 2 | reject | LayoutAnimation approach unsupported under current architecture; needs alternative. | user |
| 2025-10-31 12:05:22 | 2 | submit_for_review | Reanimated measure-based card flight implemented for stack moves. | ai_agent |
| 2025-10-31 12:32:00 | 2 | significant_update | Flight/flip acceleration, foundation coverage, and z-order tweaks underway. | ai_agent |
| 2025-10-31 12:40:00 | 2 | submit_for_review | Faster glide, flip, and draw animations ready for review. | ai_agent |
| 2025-11-01 09:00:00 | 4 | create_pbi | Added backlog item for post-undo and foundation animation polish. | ai_agent |
| 2025-11-01 09:10:00 | 4 | propose_for_backlog | User approved scope for animation polish improvements. | user |
| 2025-11-01 09:01:00 | 5 | create_pbi | Logged improvements for faster, stable auto-to-foundation flow. | ai_agent |
| 2025-11-01 09:11:00 | 5 | propose_for_backlog | User approved scope for auto-foundation refinements. | user |
| 2025-11-01 09:02:00 | 6 | create_pbi | Captured requirement for randomized victory celebrations. | ai_agent |
| 2025-11-01 09:12:00 | 6 | propose_for_backlog | User approved classic victory celebration plan. | user |
| 2025-11-01 09:03:00 | 7 | create_pbi | Added layout cleanup work for publish-ready presentation. | ai_agent |
| 2025-11-01 09:13:00 | 7 | propose_for_backlog | User approved layout cleanup for release readiness. | user |
| 2025-11-01 09:04:00 | 8 | create_pbi | Recorded publish-readiness assets and metadata backlog item. | ai_agent |
| 2025-11-01 09:14:00 | 8 | propose_for_backlog | User approved publish readiness scope. | user |
| 2025-11-01 09:05:00 | 9 | create_pbi | Logged configurable settings experience for burger menu. | ai_agent |
| 2025-11-01 09:15:00 | 9 | propose_for_backlog | User approved configurable settings plan. | user |
| 2025-11-01 09:06:00 | 10 | create_pbi | Added backlog item for completed-game history view. | ai_agent |
| 2025-11-01 09:16:00 | 10 | propose_for_backlog | User approved history tracking scope. | user |
| 2025-11-01 09:07:00 | 11 | create_pbi | Logged solvable-shuffle gameplay option backlog item. | ai_agent |
| 2025-11-01 09:17:00 | 11 | propose_for_backlog | User approved solvable shuffle option. | user |
| 2025-11-01 09:08:00 | 12 | create_pbi | Captured sharing pipeline for community-provided solvable games. | ai_agent |
| 2025-11-01 09:18:00 | 12 | propose_for_backlog | User approved solvable game sharing initiative. | user |
| 2025-10-26 17:00:00 | 3 | create_pbi | Added Expo dependency cleanup backlog item. | ai_agent |
| 2025-10-26 17:02:00 | 3 | start_implementation | Began upgrading/removing packages per expo-doctor. | ai_agent |
| 2025-10-26 17:30:00 | 3 | approve | PBI completed and approved by user. | user |
