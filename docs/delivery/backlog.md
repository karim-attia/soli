# Product Backlog

| ID | Actor | User Story | Status | Conditions of Satisfaction (CoS) |
| :-- | :-- | :-- | :-- | :-- |
| 1 | Mobile solitaire fan | As a player I want a Klondike Solitaire screen built with React Native and Tamagui so that I can play draw-1 games with undo on my phone. | InProgress | 1. Backlog, PRD, and policy-required task docs exist and stay synchronized.<br>2. The app renders a full Klondike layout (stock, waste, tableau, foundations) in draw-1 mode with valid move enforcement.<br>3. Players can draw, move cards via tap interactions (auto-move) or tap-and-hold for manual placement, start a new game from the header, undo the most recent move, and recycle the stock.<br>4. The board occupies the full width (no border) with symmetric margins, foundations on the left, draw/waste (fan of three) on the right, and cards show rank/suit in the top corners plus a centered suit icon for readability.<br>5. Auto-complete animates at ~5 cards per second, draws from stock if needed, and celebrates wins with a 🎉 toast once foundations complete.<br>6. Project builds successfully via Expo / React Native tooling.<br>[View Details](./1/prd.md) |
| 2 | UI polish | Animate Solitaire interactions (card movement, waste-fan slide, invalid move wiggle) for extra delight. | Proposed | 1. Tableau/foundation card moves animate quickly.<br>2. Waste fan shifts left smoothly when a new card is drawn.<br>3. Invalid tap triggers a subtle wiggle instead of a toast.<br>4. Implementation documented under dedicated tasks (TBD). |
| 3 | Build engineer | As a developer I want Expo dependencies aligned with SDK 53 guidance so that builds and `expo-doctor` pass without warnings. | Done | 1. Remove disallowed direct dependencies (`@types/react-native`, `@expo/metro-config`).<br>2. Install required peer deps (e.g., `expo-constants`).<br>3. Upgrade Expo/Metro/React Native packages to the versions `expo install --check` expects for SDK 53.<br>4. `npx expo-doctor` completes without dependency errors. |

## History

| Timestamp | PBI_ID | Event_Type | Details | User |
| :-- | :-- | :-- | :-- | :-- |
| 2025-10-26 13:18:00 | 1 | create_pbi | Created PBI 1 for Solitaire/Klondike MVP. | user |
| 2025-10-26 13:20:00 | 1 | propose_for_backlog | User approved scope; PBI moved to Agreed. | user |
| 2025-10-26 13:25:00 | 1 | start_implementation | Began implementation work on PBI 1. | ai_agent |
| 2025-10-26 15:50:00 | 2 | create_pbi | Logged animation polish backlog item for future iterations. | ai_agent |
| 2025-10-26 17:00:00 | 3 | create_pbi | Added Expo dependency cleanup backlog item. | ai_agent |
| 2025-10-26 17:02:00 | 3 | start_implementation | Began upgrading/removing packages per expo-doctor. | ai_agent |
| 2025-10-26 17:30:00 | 3 | approve | PBI completed and approved by user. | user |
