# Soli — Release Notes

## 0.6.0 (in progress)

### Card Font Parity

Cross-platform card rendering now uses a single custom font family derived from Android's native card glyphs. Cards look identical on iOS, Android, and web.

- Implemented exact Android-derived card glyphs for consistent visuals across all platforms
- Merged multiple font weights (regular, semi-bold, bold) into a single `CardTextAndroid` family
- Improved rendering metrics for sharper, more accurate card text at all sizes
- Removed legacy/unused font assets

### Header & Navigation

- Redesigned iOS and Android header controls for improved navigation consistency

### Celebration & Auto-Up Polish

- Refined celebration animation timing for smoother victory sequences
- Enhanced auto-up performance for faster card movement to foundations

### Build & Release Infrastructure

- Added release signing configuration for Android builds
- Improved Android signing configuration validation in build scripts
- New deployment script for streamlined Android releases

---

## 0.5.0 — 2026-03-11

### Build & Release

- Enhanced Android build script with updated signing configuration
- Prepared build pipeline for production releases

*This was primarily a build-infrastructure release, locking down the Android signing and deployment story.*

---

## 0.4.0 — 2026-03-03

### Expo SDK 55 Upgrade

- Upgraded from Expo SDK 53 to Expo SDK 55 with all dependencies aligned
- React Native 0.83, React 19.2

### Tooling Migration

- Migrated from Biome to **tsgo**, **oxlint**, and **oxfmt** for type-checking, linting, and formatting
- Standardized code formatting across the entire codebase

### Gameplay

- Enhanced auto-up performance and celebration animation responsiveness
- Improved Klondike game logic

---

## 0.3.0 — 2025-12-14

### Gameplay

- **Tableau tap fallback**: tapping a tableau column now selects the adjacent valid card when the top card can't move, making single-tap play more forgiving
- **History entry linkage**: game history entries are linked and tracked with active/inactive status for better session management

### UI Polish

- Hidden empty foundation/tableau outlines during the celebration state for a cleaner victory screen
- Safe-area adjustments for `CelebrationDebugBadge` so debug info stays visible on notched devices
- Safe-area adjustments for `UndoScrubber` to keep the gesture area usable on all screen sizes

### Build

- Added `yarn android` build command
- Enhanced timer logic during auto-up to avoid counting auto-play time

---

## 0.2.0 — 2025-12-14

### Gameplay

- Hardened animation flight gating — cards no longer overlap or glitch during fast auto-up sequences
- Sped up auto-up queue processing with simplified timing logic

### UI

- Enhanced board layout and spacing for improved visual balance

---

## 0.1.1 — 2025-11-30

### Security & Build

- Moved Android signing passwords out of `gradle.properties` into environment variables
- Enhanced `.gitignore` for Android build artifacts

---

## 0.1.0 — 2025-12-14 (initial public version)

### Core Klondike MVP

- Full Klondike Solitaire with draw-1 stock cycling
- Tap and hold interactions for card selection and movement
- Responsive layout with header controls
- Auto-complete endgame workflow (cards fly to foundations when all are face-up)
- New game confirmation dialog

### Animations

- Card flight animations for tableau and foundation moves
- Waste fan sliding animation
- Wiggle effect for invalid moves
- Card flip animation (enabled by default)

### Victory Celebrations

- Ten distinct celebration animation modes on game completion
- Gameplay locked during celebration with auto-launch of new game dialog

### Solvable Games

- Curated catalog of solvable shuffles with settings toggle
- Solvable-games-only mode enabled by default

### Game History & Statistics

- Game result recording with solvable status and metadata
- AsyncStorage-backed persistence for game history
- History screen with preview sheet for tableau snapshots
- Move count and elapsed time tracking with HUD display
- Timer starts after first valid move

### Undo & Time Travel

- Full undo with unlimited history depth
- Timeline scrubber (slider) for rewinding and fast-forwarding through game history
- Accurate move counts maintained during scrubbing

### Settings

- Configurable settings experience (draw mode, solvable games, statistics visibility, etc.)
- Developer mode with demo game functionality, devLog, and celebration debug labels
- Android high refresh rate control

### App Identity

- App renamed to "Soli" with updated slug and bundle identifiers
- Custom app icon with adaptive icon padding for circular displays
- Splash screen with themed background (#416F57)
- Feature graphic variants for store listing (glass-modern style)

### Platform & Infrastructure

- Expo SDK 53 alignment
- EAS build configuration
- iOS and Android build scripts
- Automated demo/auto-solve script with progress tracking
