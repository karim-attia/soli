# Soli — Release Notes

Soli is a free, ad-free, open-source Solitaire.

---

## 1.0 (upcoming)

- **Unlimited game history**: history now lives in an on-device database — every game you've played stays available, and the history screen stays fast
- **Smoother board**: rebuilt card rendering; no more stutter or memory build-up after many games in a row, plus tightened draw and wiggle animations
- **Cleaner settings** with native controls and a tidier header menu
- New catalog of guaranteed-solvable deals
- Faster loading of settings and saved games
- Framework upgrade (Expo SDK 57, React Native 0.86)

---

## 0.8.0 — 2026-06-11

- **Draw 1–5**: choose how many cards are drawn from the stock. Remembered per game, shown in your history
- Improved undo scrubber handling and layout

Google Play:
Added game mode "Draw 3" (or any other number between 1 and 5). Go to the settings to turn it on. Happy playing!
---

## 0.7.0 — 2026-04-02

- More reliable card-flight animations: rapid moves no longer spawn duplicate flights during fast auto-complete

Google Play:
1. Introduced a setting to disable automatically moving all cards up to the foundation once all cards are uncovered. (Community request)
2. Performance improvements.

---

## 0.6.0 — 2026-03-24

- Cards now look identical on iOS and Android: one custom card font on all platforms, with sharper rendering at all sizes
- Redesigned header controls
- Smoother celebration timing and faster auto-complete

Google Play:
Improved card layout and winning animation.
---

## 0.5.0 — 2026-03-11

- Build-infrastructure release; no gameplay changes

Google Play:
Improved animations, card layout, and a bug fix.
---

## 0.4.0 — 2026-03-03

- Framework upgrade (Expo SDK 55, React Native 0.83, React 19)
- Snappier auto-complete and celebrations

Google Play:
1. Improved animations and a bug fix.

---

## 0.3.0 — 2025-12-14

- **Forgiving taps**: tapping a tableau column now picks the nearest valid card when the top card can't move
- Cleaner victory screen: empty pile outlines hidden during the celebration
- Timer no longer counts time spent in auto-complete
- Layout fixes for notched devices

Google Play:
Animation and board layout improvements
---

## 0.2.0 — 2025-12-14

- Fixed cards overlapping or glitching during fast auto-complete sequences
- Faster auto-complete
- Better board spacing and visual balance

Google Play:
Animation and board layout improvements
---

## 0.1.1 — 2025-11-30

- Security and build housekeeping; no gameplay changes

---

## 0.1.0 — 2025-12-14 (initial version)

- **Full Klondike Solitaire** with tap-to-move and hold interactions, responsive layout
- **Auto-complete**: once every card is face-up, cards fly to the foundations
- **Ten victory celebrations**
- **Solvable games**: curated catalog of winnable deals, on by default
- **Unlimited undo and a timeline scrubber** to rewind and fast-forward through a game
- **Game history and stats**: move counts, times, and a tableau preview per game
- **Animations**: card flights, waste fan, flips, and a wiggle for invalid moves
- **Settings** for draw mode, solvable-games-only, statistics, and more

Google Play:
First version