# Review V1: `de` (Swiss High German) and `nl`

2026-11-23, reviewer V1 (plan step 7.1). Read: skill, glossary (All languages, de, nl, Table 1, forbidden words), `en.json`, `en.context.json`, both locale files, all store files of `de-DE` / `nl-NL`, both release notes, the translator notes and the open doubts of research R1.

Verdict: both translations conform to the glossary, keep one register (de: du lower-case, no Sie; nl: je, no u), no `ß`, no forbidden or store-policy word in the wrong field. The changes below are editing, not repairs.

## Checks run

- Node check on `de.json` and `nl.json`: 143 keys in `en.json` order, placeholders identical per key, every `_one` form carries `{{count}}`, no empty value, no leading / trailing space, no `ß` (de), file ends with one newline. Both OK.
- `yarn jest test/unit/store test/unit/i18n`: 68 passed. `ios/de-DE/keywords.txt` is 95 characters (the reported 101 no longer exists; nothing to fix).
- Store lengths after the edits: de promotional text 165 of 170, de description 896; nl short description 78 of 80, nl description 889. iOS and Android descriptions are byte-identical per language.

## Changes made

### `src/i18n/locales/de.json`

| Key | Before | After | Why |
|---|---|---|---|
| `settings.cardsDrawn` | Gezogene Karten | Karten ziehen | The participle reads as "cards already drawn"; same solution as nl «Kaarten trekken». Resolves the translator's uncertain item |
| `settings.vegasTotal.description` | Oben im Spiel steht dann dein laufendes Total und nicht mehr das Ergebnis … | Oben steht dann dein laufendes Total, nicht mehr das Ergebnis … | «Oben im Spiel» is odd German; shorter |
| `settings.vegasTotal.resetMessage` | Das laufende Spiel zählt weiterhin. | Das aktuelle Spiel zählt weiterhin. | «laufend» twice in two sentences with two meanings (running total / current game) |
| `settings.warnings.description` | … oder schon dann, wenn das Spiel … | … oder sobald das Spiel … | Simpler, is what English says ("as soon as") |
| `history.emptyBody` | …, und dein Verlauf beginnt. | …, dann füllt sich dein Verlauf. | A history does not "begin" |
| `a11y.hint.draw` | Tipp: Zieh vom Talon. | Tipp: Vom Talon ziehen. | Same infinitive form as the two other hint sentences (the translator flagged the mix) |

### `src/i18n/locales/nl.json`

| Key | Before | After | Why |
|---|---|---|---|
| `nav.openMenu` | Navigatiemenu openen | Menu openen | Shorter and what people say |
| `nav.notFoundLink` | Naar het startscherm! | Terug naar het spel | Soli has no "start screen"; no exclamation mark (nl rule); same as de |
| `game.playDeal.message`, `history.emptyTitle` | vastgelegd | opgeslagen | «vastleggen» is office Dutch; one everyday word in both places |
| `settings.warnings.noUsefulMoves` | Geen zinvolle zetten meer (25) | Geen zinvolle zetten (20) | Tight, the widest picker value; now the English length, same as de |
| `history.emptyBody` | Speel een spel Klondike-patience | Speel een spelletje Klondike-patience | Idiomatic (the glossary's own example phrase) |

### Store

| File | Change | Why |
|---|---|---|
| `ios/de-DE/description.txt`, `android/de-DE/full_description.txt` | «keine Serien» → «keine Streaks» | «Serien» reads as TV series; «Streaks» is the word German app users know, and it is negated. Now the same word as nl. See open item 3 |
| same | «Tipp-Knopf auf Wunsch, der …» → «Auf Wunsch ein Tipp-Knopf, der …» | The relative clause was cut off from its noun |
| `ios/de-DE/promotional_text.txt` | «… mit lösbaren Blättern, unbegrenztem Rückgängig und Tipps.» → «… mit lösbaren Blättern und Tipps. Jeder Zug lässt sich rückgängig machen.» | «unbegrenztem Rückgängig» is not German (165 of 170) |
| `ios/nl-NL/description.txt`, `android/nl-NL/full_description.txt` | «deel die met een vriend of vriendin» → «deel die met vrienden» | Shorter, gender-free, same as de |
| `android/nl-NL/short_description.txt` | «Elke verdeling te winnen.» → «Elke verdeling oplosbaar.» | Same term as the app setting and the iOS subtitle («oplosbaar») |

Not changed: names / titles, subtitles, keywords, release notes (both read well; the two exclamation marks in the release notes mirror English and are a greeting, not UI).

## Translators' uncertain items: resolved

| Item | Decision |
|---|---|
| de `settings.cardsDrawn` | Changed, see above |
| de `settings.showTime` «Spielzeit», nl «Speltimer» | Keep both |
| de «Vegas-Total weiterführen», «Saldo», nl «Vegas-totaal bijhouden» | Keep |
| de «Tipp-Knopf», nl «hintknop» | Keep; consistent in app, store and release notes |
| de `history.score` «{{value}} Punkte» | Keep; natural |
| de / nl `a11y.*` (recycle sentence, «noch {{count}} Mal» / «nog {{count}} keer», foundation pile names, scrubber) | Keep; read well aloud |
| de store «Ein ruhiger Hinweis» | Keep: «Hinweis» is forbidden only for the Hint button; here it is its real meaning |
| de subtitle «Ohne Werbung. Immer lösbar.», nl «Reclamevrij. Altijd oplosbaar.» | Keep. Slightly stronger than English (the setting can be turned off); the description says so |
| nl `game.newGameAlert.message` «Klaar voor nog een spel?» (not «ronde») | Keep; right call for one word per thing |
| Identical plural forms (de Dollar, «Noch {{count}}», «Mal»; nl dollar, uur, «Nog {{count}}», «keer») | Correct, on purpose. Every other plural pair really differs |

## Glossary

Not edited: Table 1 rows are shared with fr / it and other reviewers work on the file in parallel, and I change no term. As the reviewer I confirm these «draft» cells (the marker can be removed at the merge):

- de: «Kartenspiel», «Talon», «Ablagestapel», «{{number}} ziehen», «Rückgängig», «Tipp», «Im Spiel / Neue Spiele».
- nl: «koning», «voorraadstapel», «ronde», «Ongedaan maken», «Niet afgemaakt», «Tijdens het spel / Nieuwe spellen».

Proposals (rows to add, no change to existing ones): recycle (de «umdrehen», nl «terugleggen»), balance (de «Saldo», nl «saldo»), button (de «Knopf», nl «knop»), streaks (de / nl «Streaks», only negated in store text), "Cards drawn" (de «Karten ziehen», nl «Kaarten trekken»).

## Tight labels over about 1.3× English

No natural shorter word exists for the platform words (de «Einstellungen», «Zurücksetzen», «Abbrechen»; nl «Instellingen», «Annuleren», «Geschiedenis»). Numbered limits are met in both (stock caption ≤ 6, HUD ≤ 8, «Noch / Nog {{count}}» ≤ 8). For the device check on a small phone:

| Key | de | nl | Fallback if it truncates |
|---|---|---|---|
| `game.undo` | Rückgängig (10) | Ongedaan maken (14) | de «Zurück», nl «Terug» (glossary) |
| `history.retry`, `game.playDeal.retryConfirm` | Nochmals spielen (16) | Opnieuw spelen (14) | de «Nochmals», nl «Opnieuw» |
| `history.stats.incomplete` | Nicht gelöst (12) | Niet afgemaakt (14) | nl «Onvoltooid» (stiffer) |
| `settings.warnings.unwinnable` | Nicht mehr gewinnbar (20) | Niet meer te winnen (19) | narrower than the widest picker value; fine |
| `history.dealName` | Blatt … | Verdeling … (9 before the code) | nl «Spel …» |

## Open items for Karim

1. **de «Blatt» for deal** («Lösbare Blätter», «Blatt 2345-6789», «Dieses Blatt nochmals spielen?»). Correct card German and it keeps deal ≠ game, but «Blatt» is first read as "hand". Alternative: «Partie» («Lösbare Partien», «Partie 2345-6789»). My pick: keep «Blatt»; please eyeball it in the History list.
2. **de «Nicht gelöst» vs «Abgebrochen»** for Incomplete. Kept «Nicht gelöst» (pairs with «Gelöst» on the tiles). «Abgebrochen» reads better in the dialog sentence only.
3. **de / nl «Streaks»** in the store description (was «Serien» in de). If you want no anglicism: «keine Tagesziele».
4. **de «Gamification»** on the About screen: kept, no short German word.
5. **nl «patience» vs «Solitaire»** as the in-app and store-name word, and **nl «verdeling»** for deal (a constructed term; alternative «spel»). No native reader has seen either; both are kept as the glossary decides. The store name «Soli: Klondike-patience» carries only «patience» (the keywords carry «solitaire»).
6. **Device check** for the tight labels in the table above.
7. English source: `nav.notFoundLink` "Go to home screen!" (Soli has no home screen; both languages now say "Back to the game"), `history.emptyBody` "Completed games" (abandoned games are listed too).
