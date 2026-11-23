# Translator notes: `de` (Swiss High German)

2026-11-23, full translation (whole file + store listing + release notes).

## Files written

- `src/i18n/locales/de.json`: 143 keys, same order as `en.json`, plural forms one + other
- `store/ios/de-DE/{name,subtitle,keywords,promotional_text,description}.txt`
- `store/android/de-DE/{title,short_description,full_description}.txt`
- `store/release-notes/de.txt`
- jest: see "Test result" at the end

Lengths: name / title 22 of 30, subtitle 27 of 30, keywords 95 of 100, promotional text 150 of 170, short description 68 of 80, description 891, release notes 239 of 500.

## Allow-list (values correctly identical to English)

`hud.total` («Total»), `settings.scoring.standard` («Standard») need an entry in `UNTRANSLATED_OK` before `de` is registered. `hud.vegas`, `settings.scoring.vegas`, `history.vegas` are on the list already.

## Uncertain terms

| Key | EN | Choice | Alternative | Why |
|---|---|---|---|---|
| `settings.cardsDrawn` | Cards drawn | Gezogene Karten | «Karten ziehen», «Karten aufs Mal» | The row reads «Gezogene Karten: 3 ziehen», which repeats the verb. No glossary row. «Karten pro Zug» is out because «Zug» is a move |
| `settings.showTime` | Game timer | Spielzeit | «Zeit», «Spieluhr», «Stoppuhr» | Glossary only has «Zeit» for the badge. «Spielzeit» sits naturally next to «Zugzähler» |
| `settings.vegasTotal.label` | Keep Vegas total | Vegas-Total weiterführen | «Vegas-Total behalten», «Vegas-Total mitnehmen» | «behalten» sounds like "do not delete"; «weiterführen» says what happens |
| `settings.vegasTotal.description` | balance | Saldo | «Kontostand», «Guthaben» | «Saldo» can be negative and is everyday Swiss; «Guthaben» cannot be negative, «Kontostand» sounds like a bank |
| `settings.vegasTotal.description` | The header | «Oben im Spiel» | «Die Kopfzeile» | Per context it is the badge at the top of the game screen; «Kopfzeile» is document jargon |
| `settings.hintButton.label` | Hint button | Tipp-Knopf | «Tipp-Taste», «Tipp-Button» | Follows the glossary's «Rückgängig-Knopf» |
| `about.madeBy` | Made by | Entwickelt von | «Gemacht von», «Von» | Reads as a label before the handle |
| `about.promise` | gamification | Gamification | «Spielereien», «Tricks» | Kept as the known loanword; German has no short everyday word. Karim: please eyeball |
| `about.pitch` | Free and open source Solitaire app. | Solitär-App, kostenlos und Open Source. | «Kostenlose Open-Source-Solitär-App.» | Avoids the triple compound |
| `history.title` | Game History | Spielverlauf | «Verlauf» | Glossary row History names both; the drawer says «Verlauf» |
| `history.score` | Score {{value}} | {{value}} Punkte | «Punkte {{value}}» | «385 Punkte» is how German says it; placeholder moved |
| `history.status.incomplete` + `game.playDeal.message` | Incomplete | Nicht gelöst / «als nicht gelöst gespeichert» | «Abgebrochen» | Glossary draft. In the dialog sentence «als abgebrochen gespeichert» would read better. Karim: please eyeball |
| `game.playDeal.*`, `history.dealName`, `settings.solvableDeals` | deal | Blatt | «Spiel», «Partie» | Glossary draft, used everywhere. «Blatt 2345-6789» in the history list is the place where it reads least naturally. Karim: please eyeball |
| `notice.unwinnable` | No winning moves left | Nicht mehr gewinnbar | «Dieses Spiel lässt sich nicht mehr gewinnen» | Glossary term, short, clearly stronger than the stuck notice |
| `notice.undoTip` | time travel | «für eine Zeitreise durch dein Spiel» | «um durch dein Spiel zu reisen» (glossary example) | Keeps the glossary term «Zeitreise»; no «Tipp:» label |
| `a11y.stockRecycle` | Recycle waste into stock | Abwurfstapel als neuen Talon umdrehen | «Abwurfstapel umdrehen» | No glossary verb for recycle; the research note says «Abwurfstapel umdrehen» |
| `a11y.stockRecycleLeft` | … {{count}} left | … noch {{count}} Mal | «noch {{count}} Durchgänge» | Spoken «noch 2» alone is unclear; «Mal» is the same after 1 and after 2, so both forms are identical on purpose |
| `a11y.scrubber` | Undo scrubber | Rückgängig-Regler | «Zeitleiste» | «Regler» is the German word for a slider |
| `a11y.foundationPile.*` | Clubs foundation | Ablagestapel Kreuz | «Kreuz-Ablagestapel» | Pile type first, then the suit, is easier to follow when spoken |
| `a11y.hint.toColumn` / `toFoundation` | Hint: move … | «Tipp: {{card}} auf Spalte {{column}} legen.» | du imperative «Leg {{card}} …» | Infinitive keeps the placeholder bare and needs no article; `a11y.hint.draw` is du («Zieh vom Talon.») as in the research note. Slight mix of forms |
| store description | A quiet notice | Ein ruhiger Hinweis | «Eine ruhige Meldung» | «Hinweis» is forbidden only for the Hint button; here it means notice, which is its German meaning |
| store description | streaks | Serien | «Streaks» | German word; «Streaks» is the vocabulary of the apps Soli is not |
| store subtitle | No ads. Every deal winnable. | Ohne Werbung. Immer lösbar. | «Keine Werbung. Immer lösbar.» | «Jedes Blatt lösbar» is over 30 with «Ohne Werbung.» |
| release notes | off by default | zu Beginn ausgeschaltet | «standardmässig aus» | Avoids an ss-word from the avoid list |

Identical plural forms on purpose: `game.recyclesLeft` («Noch {{count}}»), `hud.vegasSpoken`, `hud.vegasSpokenNegative` («Dollar»), `a11y.stockRecycleLeft`.

## Tight keys longer than about 1.3× English

| Key | EN | de | Note |
|---|---|---|---|
| `game.undo` | Undo (4) | Rückgängig (10) | Glossary draft; device check on a small phone |
| `game.playDeal.retryConfirm`, `history.retry` | Retry (5) | Nochmals spielen (16) | Glossary term. If the Android dialog button truncates: «Nochmals» |
| `common.reset` | Reset (5) | Zurücksetzen (12) | Platform word |
| `nav.settings` | Settings (8) | Einstellungen (13) | Platform word |
| `common.cancel` | Cancel (6) | Abbrechen (9) | Platform word |
| `game.newGame` | New Game (8) | Neues Spiel (11) | Header button on small phones |
| `settings.warnings.unwinnable` | Unwinnable game (15) | Nicht mehr gewinnbar (20) | Narrower than «Keine sinnvollen Züge» (21, EN 20), the widest picker value |
| `nav.play`, `game.playDeal.sharedConfirm` | Play (4) | Spielen (7) | Fine |
| `game.draw` | Draw (4) | Ziehen (6) | Inside the ≤ 6 limit |

## Source oddities

- `nav.notFoundLink` "Go to home screen!": the app has no home screen in the user's vocabulary; translated as «Zurück zum Spiel», without the exclamation mark (German rule).
- `history.loadingBody` "while we retrieve": Soli has no "we" anywhere else; German avoids it.
- `history.emptyBody` says "Completed games", but abandoned games are listed too («Beendete Spiele» covers both).
- `settings.cardsDrawn` next to a picker whose values are "Draw 3" repeats the word in English as well.
- Release notes "Soli 1.1 adds hints!" and "Happy playing!": two exclamation marks; the German section allows them only in a win message. Both kept because the release note is a greeting, not UI. Reviewer may drop them.
- Glossary: the «Klondike» rule ("only next to «Solitär»") and the share message "Klondike deal" pull apart; solved as «Solitär-Blatt … (Klondike, {{number}} ziehen)».

## Feedback on the brief

- The glossary is 190 KB; a translator needs about 25 KB of it. A per-language extract would save most of the reading.
- No glossary rows for: recycle (verb), balance, header, button («Knopf»), scrubber, streaks, "by default". All settled above; candidates for rows.
- The iOS keyword test splits on spaces, so «ohne werbung» and «open source» cannot be keywords while «Ohne Werbung» is in the subtitle; used «werbefrei».

## Test result

- `yarn jest test/unit/i18n`: passes, but `de` is not registered in `src/i18n/index.ts` yet, so the locale gates did not run on it. Self-check with a node script instead: 143 keys in the same order as `en.json`, placeholders identical per key, plural keys `_one` + `_other` only, no empty value, no `ß`; identical to English only the five keys named under "Allow-list".
- `yarn jest test/unit/store`: passes (32 tests), including `ios/de-DE`, `android/de-DE` and the no-`ß` check. A first run was red only because of other locales being written in parallel (`ios/ru`, `ios/tr` keywords over 100).

## Plain-words round, 2026-11-24 (Karim: Blatt/Talon unfamiliar)

Evidence and the rule are in the glossary's German section ("Plain words before patience jargon").

| Key(s) | Before | After |
|---|---|---|
| `history.dealName` | Blatt {{code}} | Spiel {{code}} |
| `settings.solvableDeals`, `settings.scoring.vegasDescription` | Lösbare Blätter / lösbare Blätter | Lösbare Spiele / lösbare Spiele |
| `game.playDeal.retryTitle`, `history.retryA11y` | Dieses Blatt nochmals spielen(?) | Dieses Spiel nochmals spielen(?) |
| `game.playDeal.sharedTitle` | Geteiltes Blatt spielen? | Geteiltes Spiel spielen? |
| `history.shareA11y` | Dieses Blatt teilen | Dieses Spiel teilen |
| `history.emptyBody` | … Beendete Spiele und ihre Blätter erscheinen hier. | … Beendete Spiele erscheinen hier. (deal = game now, so "and their deals" would repeat the word) |
| `share.dealMessage` | Spiel dieses Solitär-Blatt in Soli (…) | Probier dieses Solitär-Spiel in Soli (…) («Spiel dieses …-Spiel» would double the word) |
| `a11y.stock*`, `a11y.hint.draw` | Talon | Nachziehstapel |
| `a11y.stockRecycle*` | Abwurfstapel als neuen Talon umdrehen | Abwurfstapel wieder zum Nachziehstapel machen |
| `about.promise` | … keine Gamification, die dich zum Weiterspielen verleitet. | … keine Tricks, die dich zum Weiterspielen verleiten. (same word as the iOS promotional text) |
| store: iOS + Play description | Lösbare Blätter: … / Spiel jedes Blatt nochmals oder teile es … | Lösbare Spiele: … / Wiederhol jedes Spiel oder teile es … |
| store: Play short description | Jedes Blatt lösbar. | Jedes Spiel lösbar. |
| store: iOS promotional text | … mit lösbaren Blättern und Tipps. | … mit lösbaren Spielen und Tipps. |

Kept: Abwurfstapel, Ablagestapel (alt «Zielstapel»), Spalte, Neu austeilen, Rückgängig, Tipp, Automatisch ablegen, Karten ziehen, Nicht gelöst, Streaks.
