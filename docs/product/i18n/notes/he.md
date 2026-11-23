# Translator notes: Hebrew (`he`)

Written 2026-11-23, whole-file run.

## Files written

- `src/i18n/locales/he.json`: 152 leaf keys (134 base keys; the 9 plural bases each have `_one`, `_two`, `_other`), same order as `en.json`.
- `store/ios/he/{name,subtitle,keywords,promotional_text,description}.txt`
- `store/android/iw-IL/{title,short_description,full_description}.txt`
- `store/release-notes/he.txt`

Checks: `yarn jest test/unit/i18n test/unit/store` passes (4 suites, 66 tests). The i18n suite only covers registered locales and `he` is not registered yet, so key parity, key order, placeholders, plural suffixes (one / two / other), empty values and identical-to-English values were also checked with a node script: no findings. No raw direction mark in any file; `he.json` has two `‎` escapes (`history.vegas`, `settings.vegasTotal.resetMessage`). The store files have no direction marks.

Store lengths: name / title 22 of 30, subtitle 28 of 30, keywords 100 of 100, promotional text 126 of 170, short description 61 of 80, description 698, release notes 161.

## Uncertain terms

| Key | EN | Choice | Alternative | Why |
|---|---|---|---|---|
| `store name.txt` / `title.txt` | Soli: Klondike Solitaire | «סוליטר קלונדייק – Soli» | «Soli: סוליטר קלונדייק» (brand first, needs a leading `‏`) | Glossary bidi rule 2: no store line starts with "Soli", and a raw invisible mark in a store field is fragile. Cost: the brand is last. Needs a decision by Karim |
| `about.dedication` | my girlfriend T | «לבת הזוג שלי T» | «לחברה שלי T» | «חברה שלי» can read as "a female friend", which the glossary forbids; «בת הזוג» is unambiguous but a little more formal |
| `about.promise` | gamification | «גיימיפיקציה» | «מִשחוּק» (Academy word, little known), «תכסיסים» (tricks, looser) | The loan word is what Hebrew tech writing uses; no glossary row |
| `about.madeBy` | Made by | «נוצר על ידי» | «מאת» | Followed by the handle; «מאת» is shorter but reads like a book byline |
| `game.recyclesLeft_one` | {{count}} left | «נותרו {{count}}» | «נותר {{count}}» | The glossary says keys without a noun repeat the text; «נותר 1» is the grammatical singular. Used the glossary form in the caption, and the correct singular in the spoken `a11y.stockRecycleLeft_one` («נותר סבב אחד») |
| `game.playDeal.sharedTitle` | Play shared deal? | «לשחק בחלוקה ששיתפו איתך?» | «לשחק בחלוקה המשותפת?» | «משותפת» means "joint", not "shared with you" |
| `settings.vegasTotal.*` | Vegas total | «סך הכול בווגאס» | «סה״כ וגאס» | The glossary gives «סה״כ» for the badge and «סך הכול» for running text; a setting label is closer to running text. Description says «סך הכול המצטבר» for "running total" |
| `settings.vegasTotal.description` | The header | «בראש המסך» | «בכותרת» | "At the top of the screen" is clearer than a UI word |
| `settings.cardsDrawn` | Cards drawn | «קלפים במשיכה» | «מספר הקלפים במשיכה» | Shorter; sits next to «משיכת 3» |
| `settings.scoring.description` | Applies to your next game. | «ייכנס לתוקף במשחק הבא שלך.» | «חל מהמשחק הבא.» | Reads more naturally; same sentence in `vegasDescription` |
| `a11y.scrubber` | Undo scrubber, position … | «מחוון ביטול מהלכים, שלב {{position}} מתוך {{total}}» | «ציר הזמן של המשחק, מיקום …» | «מחוון» is the platform word for a slider; «שלב» (step) fits "position 5 of 40" better than «מיקום». No glossary row |
| `a11y.stockEmpty`, `a11y.foundationEmpty` | empty | «ריקה» | n/a | Feminine, agreeing with «קופה» / «ערימה»; `a11y.emptyColumn` has «ריק» (טור is masculine) |
| `a11y.hint.toFoundation` | to the foundation | «לערימת היסוד» | «לערימות היסוד» | Singular, as English |
| `share.dealMessage` | Play this Klondike deal in Soli | «אפשר לשחק בחלוקת הקלונדייק הזאת ב-Soli (משיכת {{number}})» | «בואו לשחק …» (plural imperative) | «אפשר ל…» is the neutral form the glossary prefers; a little less inviting than English |
| `nav.notFoundLink` | Go to home screen! | «מעבר למסך הבית» | with «!» | A verbal noun with an exclamation mark reads oddly; dropped it |
| store keywords | n/a | «בלי אינטרנט», «אופליין» | «ללא אינטרנט» | «ללא» is already in the subtitle, and the test rejects a repeated word. «ללא פרסומות» from the keyword table is left out for the same reason (the subtitle carries it) |
| store description | FEATURES | «תכונות» | «מה יש באפליקציה» | Short heading; Hebrew has no capitals to set it apart |
| store description | for everyone who just wants to play cards | «לכל מי שפשוט רוצים לשחק קלפים» | «לכל מי שרוצה …» | Plural keeps it gender-neutral |
| release notes | Happy playing! | «משחק מהנה!» | «תיהנו!» | Neutral noun phrase |

Glossary «draft» rows used as given: rank «ערך» (not needed in any string), waste «ערימת הפסולת», tableau «שולחן המשחק» (only as «המשחק שעל השולחן»), pass «סבב», Draw N «משיכת {{number}}», Standard «רגיל», Play «משחק» / «התחלת משחק».

## Tight keys longer than English

| Key | EN | he | Note |
|---|---|---|---|
| `game.playDeal.retryConfirm`, `history.retry` | Retry (5) | «ניסיון חוזר» (11) | Glossary term; dialog button, check on a small Android phone |
| `game.playDeal.sharedConfirm` | Play (4) | «התחלת משחק» (10) | Glossary term; dialog button |
| `settings.warnings.noUsefulMoves` | No more useful moves (20) | «אין עוד מהלכים מועילים» (22) | Glossary phrase, widest picker value |
| `settings.warnings.unwinnable` | Unwinnable game (15) | «משחק שאי אפשר לנצח» (18) | Glossary option |
| `game.newGameAlert.confirm` | Deal Again (10) | «חלוקה חדשה» (10) | Same length |

All numbered limits are met: `game.draw` «משיכה» 5 (≤ 6), `game.recyclesLeft` «נותרו 2» 7 (≤ 8), HUD badges ≤ 6.

## Source oddities and findings

- `nav.play` «משחק» and the noun "game" are the same word, so the drawer reads «משחק / שלום / היסטוריה / הגדרות». It is the glossary pick («draft»); «לשחק» would be clearer but is an infinitive among nouns.
- `game.undo` and `common.cancel` are both «ביטול» (decided in the glossary). In `notice.undoTip` the button is called «כפתור הביטול», which matches its label.
- `notice.unwinnable`: "No winning moves left" is rendered as «כבר אי אפשר לנצח במשחק הזה» ("this game can no longer be won"), the glossary's wording for unwinnable; it stays clearly stronger than `notice.stuck`.
- `about.sourceLink` contains "GitHub", a second Latin word besides "Soli" (glossary bidi rule 1 says Soli is the only one). It is a name and sits at the end of the string, so it renders correctly.
- `about.dedication`: the Latin initial "T" sits between Hebrew words; it renders correctly (a single strong LTR letter), but a screen reader may say the English letter name.
- `history.dealName`: `{{code}}` after a Hebrew word. Digits with a hyphen stay in order; a code with Latin letters also renders left to right as one run. No mark added (rule 5), worth one look on a device.
- `hud.badgeA11y`, `history.dateTime`, `a11y.foundation` are identical to English: patterns without letters, skipped by the test.
- `settings.scoring.vegasDescription` uses «בווגאס» (double vav after the prefix, as the glossary row says).
- Release notes and the description's first line were reworded so that neither starts with "Soli" («רמזים מגיעים ל-Soli 1.1!», «האפליקציה Soli היא …»).

## Feedback on the brief

- The Write tool turned `‎` typed in the JSON into the raw character; I had to convert it back with a script. A line in the skill ("check with grep that the file contains the six ASCII characters `‎`") would save the next translator the surprise.
- The rule "never start a store line with Soli" collides with "name = Soli plus the local name of the game". The glossary should say which wins for `name.txt` / `title.txt` in ar and he.
- "Keys without a noun repeat the text" for `_one` gives «נותרו 1», which is not quite grammatical; allowing «נותר {{count}}» for `_one` would fix it at no length cost.
- The term table is one very wide table; extracting one language's column needs a script. A per-language export would be faster to read.
