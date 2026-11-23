# Store text proposals

**Applied 2026-11-23 to en-US/en-GB as the translation base; nothing uploaded — upload needs Karim's go-ahead; iOS name/subtitle change needs a version submission.** Karim did not object to the proposals below; the orchestrator applied sections 1, 2 and 4 to `store/ios/{en-US,en-GB}` and `store/android/{en-US,en-GB}`. The text that is live in the stores (version 1.0) is in the "Live" column below and in git history. en-GB keywords: the proposal without "patience" and "klondike" (both are in its name / subtitle now).

The rest of this file is the proposal as written, kept for the record.

Nothing in this file is live or approved. The files under `store/ios/en-US` and `store/android/en-US` hold the live text; when Karim approves a proposal, copy it into those files, run `yarn jest test/unit/store`, and then run the translation skill for the changed fields.

Why this matters now: the live description is six short bullets. Translating it into 14 languages spreads thin copy. Approving (or editing) the proposal below BEFORE the translation run gives every language the better text in one go.

## 1. Name, subtitle, keywords, short description

From `docs/product/app-store-creative-assets/app-store-creative-assets.md` (naming recommendation, 2026-10-17). iOS name/subtitle need a version submission.

| Field | Live | Proposal | Chars |
|---|---|---|---|
| iOS name | Soli - Solitaire | Soli: Klondike Solitaire | 24 |
| iOS subtitle | Thoughtfully refined Solitaire | No ads. Every deal winnable. | 28 |
| iOS keywords | (not readable) | `card,patience,classic,offline,ad free,relax,calm,undo,draw 3,open source,brain,puzzle,games` | 91 |
| Play title | Soli | Soli: Klondike Solitaire | 24 |
| Play short description | Classic Solitaire, thoughtfully refined | Calm Klondike solitaire. Every deal winnable. Unlimited undo. | 61 |

en-GB would follow with "Patience": subtitle "No ads. Klondike Patience." (26), short description "Calm Klondike patience (solitaire). Every deal winnable. Unlimited undo." (72).

## 2. Description (both stores)

```
Soli is classic Klondike Solitaire, thoughtfully refined. Free, open source and without ads.

No ads, no in-app purchases, no streaks, coins or pop-ups to make you play more. Just cards.

FEATURES

- Classic Klondike with Draw 1 to Draw 5
- Solvable deals: every new game can be won (you can turn this off)
- Unlimited undo: drag the Undo button sideways to travel back through your game
- Optional Hint button that shows the next move
- A quiet notice when there are no more useful moves
- Standard scoring, Vegas scoring, or no score at all
- Auto Up moves cards to the foundations for you
- Game history: replay any deal or share it with a friend
- Dozens of win celebrations

Made in Switzerland, for everyone who just wants to play cards.
```

Open points for Karim: "Free" in the first line is fine in a description (not in name/subtitle); "works offline" is left out until someone confirms the app makes no network calls at all.

## 3. "Made in Switzerland"

- The German listing (`de-DE`, Swiss High German) carries the line in any case (plan decision): it makes ss read as origin instead of a spelling mistake.
- Proposal: use the same closing line in every language (it is the last line of the description above). Translators render it naturally, not word for word.

## 4. Promotional text (iOS, 170 max, changeable without a submission)

```
No ads, no purchases, no tricks. Klondike Solitaire with solvable deals, unlimited undo and hints. Open source, made in Switzerland.
```
