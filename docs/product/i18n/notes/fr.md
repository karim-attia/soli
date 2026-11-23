# Translator notes: fr

2026-11-23, whole-file run.

## Files written

- `src/i18n/locales/fr.json`: same nesting and key order as `en.json`, plural forms `_one` / `_many` / `_other`.
- `store/ios/fr-FR/{name,subtitle,keywords,promotional_text,description}.txt`
- `store/android/fr-FR/{title,short_description,full_description}.txt`
- `store/release-notes/fr.txt`

Key count: 152 leaf keys in `fr.json` (English has 143; the 9 plural bases each gain `_many`).

Tests: `yarn jest test/unit/i18n test/unit/store`: the `fr-FR` store checks pass (the only failures at the time were other locales still in progress: ios/ru and ios/tr keywords). `fr` is not registered in `src/i18n/index.ts` yet, so the locale test did not look at `fr.json`; a node self-check (key parity and order, placeholders, one/many/other, typography) was clean apart from the allow-list items below.

## Needed on the jest allow-list (`UNTRANSLATED_OK`) before `fr` is registered

Correctly identical to English; the test will fail on them otherwise.

| Key | Value | Why |
|---|---|---|
| `hud.score` | Score | glossary |
| `hud.total` | Total | glossary |
| `settings.scoring.standard` | Standard | glossary |
| `history.score` | Score {{value}} | «Score» is the French word; kept parallel to «Vegas {{value}}» |
| `hud.vegasSpoken` (one, many, other) | {{count}} dollar / {{count}} dollars | glossary prescribes exactly this; same word in French |
| `time.minutes` (one, many, other) | {{count}} minute / {{count}} minutes | same word in French |
| `a11y.rank.6` | Six | same word in French |

The last four are not in the glossary's "Enforcement" list of expected allow-list entries.

## Uncertain terms

| Key | EN | Choice | Alternative | Why |
|---|---|---|---|---|
| `notice.unwinnable` | No winning moves left — undo or start a new game. | Cette partie n’est plus gagnable. Annulez ou commencez une nouvelle partie. | Aucun coup gagnant restant. … | Says the strong claim with the glossary word «gagnable» and is clearly different from the «Aucun coup utile restant» notice. «Coup gagnant» reads as "the winning move" |
| `settings.showTime` | Game timer | Chronomètre | Chronomètre de partie; Temps de jeu | Glossary only has «Temps» for the badge. «Chronomètre» is the usual word for the setting and pairs with «Compteur de coups» |
| `history.stats.solved` / `.incomplete` | Solved / Incomplete | Gagnées / Inachevées | Gagnée / Inachevée (glossary, singular) | Tile labels above a count, next to «Parties»: plural agrees. The row status stays singular (`history.status.*`). Glossary row gives one form for both uses |
| `history.solvable` | Solvable | Gagnable | Donne gagnable | Short segment in a detail line; agrees with «donne» |
| `game.newGameAlert.message` | Ready for another round? | Envie d’une autre partie ? | Prêt pour une autre partie ? | «Prêt / Prête» would show a gender |
| `share.dealMessage` | Play this Klondike deal in Soli (Draw {{number}}) | Une donne de Klondike à jouer dans Soli (Tirage {{number}}) | Jouez cette donne de Klondike dans Soli (…) | The text goes to a friend of the player: an imperative forces vous or tu on someone else's message. The noun phrase avoids the choice |
| `about.madeBy` | Made by | Créé par | Développé par; Conçu par | Followed by the handle; same verb as «Créé en Suisse» in the store text |
| `about.promise` | …or gamification to get you to play more | …ni mécanismes pour vous pousser à jouer davantage | ludification | «Ludification» / «gamification» is jargon in French |
| `nav.hello` | Hello | Bonjour | Salut | Vous register |
| `settings.vegasTotal.description` | The header then shows… | L’en-tête affiche alors… | Le haut de l’écran | Literal; a player may not call the badge row «en-tête» |
| `settings.scoring.description` | Standard points or Vegas dollars | Points standard ou dollars Vegas | Points classiques | «standard» invariable, matches the picker option |
| `a11y.scrubber` | Undo scrubber | Curseur d’annulation | Chronologie des coups | «Curseur» is the French platform word for a slider |
| `a11y.stockRecycle` | Recycle waste into stock | Remettre la défausse dans la pioche | Retourner la défausse | Describes what happens; «recycler» sounds odd for cards |
| `a11y.hint.draw` | Hint: draw from the stock. | Indice : tirez dans la pioche. | Indice : tirer une carte. | Vous imperative, as the notices |
| `history.today` / `.yesterday` / `.dateTime` | Today, {{time}} / {{date}}, {{time}} | Aujourd’hui à {{time}} / Hier à {{time}} / {{date}} à {{time}} | comma as in English | «à» is how French joins a date and a time. Assumes {{time}} is always a clock time (context says so) |
| `notice.undoTip` | Drag … sideways to time travel through your game | faites glisser le bouton Annuler latéralement pour voyager dans le temps au fil de votre partie | …vers la gauche ou la droite | Long (about 1.3× English); «latéralement» is a little formal. Check that the bubble wraps well |
| store: name / title | Soli: Klondike Solitaire | Soli : Solitaire Klondike (U+00A0 before the colon) | Soli - Solitaire Klondike | Glossary punctuation rule applied to the store name too. If a no-break space in a store name is unwanted (search tokenising, console validation), the hyphen form is the neutral fallback |
| store: subtitle | No ads. Every deal winnable. | Sans pub. Donnes gagnables. | Sans pub. Toujours gagnable. | 27 characters; uses the app's setting name |
| store: "streaks, coins or pop-ups" | | séries, pièces, pop-ups | fenêtres surgissantes | «pop-ups» is the word people use in France and Romandie; Québec would prefer «fenêtres surgissantes» |
| store: "share it with a friend" | | partagez-la avec vos proches | avec un ami | Avoids «un ami / une amie» |
| store: "for everyone who just wants to play cards" | | pour quiconque veut simplement jouer aux cartes | pour tous ceux qui veulent… | Gender-free |
| store: "no tricks" (promotional text) | | sans pièges | sans astuces | «Astuce» is the positive Tip word in the app |

## Tight keys longer than English

| Key | EN | fr |
|---|---|---|
| `game.newGame` | New Game (8) | Nouvelle partie (15), glossary; check on a small phone |
| `game.newGameAlert.confirm` | Deal Again (10) | Nouvelle donne (14), glossary «draft» |
| `common.reset` | Reset (5) | Réinitialiser (13), platform word; Android may truncate the dialog button |
| `common.cancel`, `game.undo` | Cancel / Undo | Annuler (7) |
| `game.hint` | Hint (4) | Indice (6) |
| `game.recyclesLeft` | 2 left (6) | Encore 2 (8), at the limit |
| `common.drawMode` | Draw 3 (6) | Tirage 3 (8) |
| `nav.settings` | Settings (8) | Réglages (8); `nav.history` Historique (10) |
| `settings.warnings.noUsefulMoves` | No more useful moves (20) | Aucun coup utile (16), shorter; drops «restant» on purpose |
| `settings.warnings.unwinnable` | Unwinnable game (15) | Partie ingagnable (17) |
| `history.stats.incomplete` | Incomplete (10) | Inachevées (10); `history.retry` Rejouer (7 vs 5); `history.share` Partager (8 vs 5) |

## Source oddities

- `game.recyclesLeft_one` and `_other` are the same text in English ("{{count}} left"); fine, just noting it is not a typo on the French side either («Encore {{count}}» ×3).
- `settings.vegasTotal.description`: "this game’s result" was rendered as «la partie en cours» to stay consistent with `resetMessage` ("the game on the board").
- `nav.notFoundLink` ends with "!" in English; French drops it (calm tone, link label).
- Store keywords: «publicité» and «gratuit» are in the iOS keyword field (allowed there per glossary); «sans» and «pub» are not repeated because they are in the subtitle.
- Glossary: «Réglages» is Apple's word, Android says «Paramètres»; used «Réglages» as decided, also in the release notes.

## Feedback on the brief

- The locale test's "identical to English" check will hit French cognates the glossary did not foresee (minute, dollar, Six, «Score {{value}}»). A per-locale allow-list would be more precise than one global set.
- The glossary does not say whether its punctuation rules (NBSP before a colon) apply to the store name. Decided yes; flagged above.
- The glossary gives one cell for "Solved / Incomplete" although the stat tiles and the row status need different numbers in French.
