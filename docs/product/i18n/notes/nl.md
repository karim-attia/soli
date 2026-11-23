# Translator notes: nl (Dutch)

Written 2026-11-23 by the `nl` translator (whole file + store listing).

## Files written

- `src/i18n/locales/nl.json`: 143 keys, same order as `en.json`, plural forms `one` + `other`
- `store/ios/nl-NL/{name,subtitle,keywords,promotional_text,description}.txt`
- `store/android/nl-NL/{title,short_description,full_description}.txt`
- `store/release-notes/nl.txt`

Checks: `yarn jest test/unit/store` passes for nl-NL (failures in the same run belong to other locales that were being written in parallel). `test/unit/i18n` only covers registered locales, and `nl` is not registered yet, so key parity, key order, placeholders, empty values and plural suffixes were self-checked with a node script: all fine.

## Allow-list entries needed (`UNTRANSLATED_OK`)

Values that are correctly identical to English and will fail once `nl` is registered:

| Key | Value | Why |
|---|---|---|
| `game.hint` | Hint | Glossary term |
| `hud.score` | Score | Glossary term |
| `history.score` | Score {{value}} | Follows from «Score» |
| `hud.vegasSpoken` (the `_one` form) | {{count}} dollar | Dutch keeps «dollar» singular after a number; `_one` therefore equals English `_one` |

## Identical plural forms on purpose

`game.recyclesLeft` («Nog {{count}}»), `hud.vegasSpoken`, `hud.vegasSpokenNegative` («dollar»), `time.hours` («uur»), `a11y.stockRecycleLeft` («nog {{count}} keer»): Dutch does not inflect these after a number (glossary, Plural forms).

## Uncertain terms

| Key | EN | Choice | Alternative | Why |
|---|---|---|---|---|
| `settings.showTime` | Game timer | Speltimer | Speeltijd, Tijd tonen | No glossary term for "timer". «Speltimer» mirrors «Zettenteller»; «Speeltijd» is more Dutch but names the value, not the counter |
| `settings.cardsDrawn` | Cards drawn | Kaarten trekken | Kaarten per keer, Getrokken kaarten | Sits next to the «Trek 3» picker; the literal «Getrokken kaarten» reads as "cards already drawn" |
| `settings.hintButton.label` | Hint button | Hintknop | Hint-knop | One-word compound per glossary rule |
| `about.promise` | gamification | gamification | spelprikkels, trucjes | The English loanword is what Dutch readers know; no natural Dutch word. Store text says «trucjes» for "tricks" |
| `about.pitch` | Free and open source Solitaire app | Gratis en open source patience-app | Gratis patience-app met open broncode | «open source» is the glossary term; as an adjective the dictionary spelling would be «opensource» |
| `game.newGameAlert.message` | Ready for another round? | Klaar voor nog een spel? | Klaar voor nog een ronde? | «ronde» is the glossary term for a pass through the stock; avoided to keep one word per thing |
| `notice.unwinnable` | No winning moves left — undo or … | Dit spel is niet meer te winnen. Maak zetten ongedaan of … | Geen winnende zetten meer – … | Two sentences instead of the dash (glossary); uses the glossary's «niet meer te winnen». Same strength as English |
| `settings.warnings.unwinnable` | Unwinnable game | Niet meer te winnen | Spel niet meer te winnen | Tight picker value; the noun is dropped |
| `settings.vegasTotal.description` | The header | Bovenaan het spelscherm | De kop | "header" has no player word in Dutch; described by position |
| `a11y.stockRecycle` | Recycle waste into stock | Aflegstapel terugleggen als voorraadstapel | Aflegstapel omdraaien | Says what happens with the two glossary pile names |
| `a11y.stockRecycleLeft` | …, {{count}} left | …, nog {{count}} keer | …, nog {{count}} | «keer» added because a bare «nog 2» is unclear when spoken |
| `a11y.stockExhausted` | no passes left | geen rondes meer | geen doorgangen meer | Uses the «draft» term «ronde» |
| `a11y.scrubber` | Undo scrubber | Tijdlijn voor ongedaan maken | Schuifregelaar voor ongedaan maken | No jargon; context calls it the undo timeline slider |
| `a11y.foundationPile.*` | Clubs foundation | Eindstapel klaveren | Klaveren-eindstapel | Reads better aloud |
| `a11y.rank.*` | Ace, Two … | aas, twee … (lower-case) | — | Suit comes first («schoppen aas»), so the rank never starts the label |
| store name / title | Soli: Klondike Solitaire | Soli: Klondike-patience | Soli: Klondike Patience, Soli: Klondike Solitaire | Glossary: «patience» in the name, hyphenated compound. A space would look more like a title and is safer if a store search does not split on hyphens; for Karim / reviewer |
| iOS subtitle | No ads. Every deal winnable. | Reclamevrij. Altijd oplosbaar. | Solitaire zonder advertenties | Exactly 30 characters. «Elke verdeling te winnen» does not fit next to the no-ads claim. «Altijd» is slightly stronger than English (the setting can be turned off; the description says so) |
| store description, last line | just wants to play cards | gewoon patience wil spelen | gewoon wil kaarten | «kaarten» as a verb means playing cards with others |

## Tight keys longer than about 1.3× English

All are glossary terms or have no shorter natural word: `game.undo` «Ongedaan maken» (14 vs 4, the glossary's device-check item, fallback «Terug»), `history.stats.incomplete` «Niet afgemaakt» (14 vs 10, three tiles share a row; alt «Onvoltooid»), `history.dealName` «Verdeling {{code}}» (9 vs 4 before the code), `game.playDeal.retryConfirm` / `history.retry` «Opnieuw spelen» (14 vs 5), `common.cancel` «Annuleren», `common.reset` «Resetten», `nav.play` «Spelen», `nav.history` «Geschiedenis», `nav.settings` «Instellingen», `game.playDeal.sharedConfirm` «Spelen», `history.stats.games` «Spellen», `history.stats.solved` «Opgelost». Numbered limits are met: «Trek» (4 ≤ 6), «Nog {{count}}» (5 ≤ 8), HUD labels ≤ 6.

## Store notes

- Both game words are carried: «patience» in name / title, «solitaire» in the iOS keywords and once in the description's first line («Klondike-patience (Solitaire)», an addition to the English for Play search, which has no keyword field).
- Keywords (94 characters) come from the glossary table. «gratis» is left out on purpose (not needed for a free app's ranking and a price word); «reclamevrij» is already in the subtitle, «zonder reclame» covers the other spelling.
- Play short description has no ad claim. Play title has no price or ad word.
- The description's "share it with a friend" is «deel die met een vriend of vriendin» (gender-neutral reading).

## Source oddities

- `nav.notFoundLink` "Go to home screen!" has an exclamation mark that the calm-tone rule would not expect; kept in Dutch.
- `settings.cardsDrawn` "Cards drawn" reads as a past participle in English as well.
- `hud.vegasSpoken`: the context does not say how zero is spoken; «0 dollar» is fine in Dutch.
- `a11y.hint.toFoundation` says "the foundation" (singular) while the setting text speaks of foundations; translated «de eindstapel».

## Feedback on the brief

- The glossary is 190 KB; a per-language extract (top note + All languages + own section + own column) would save every translator a slicing step.
- The i18n jest test skips unregistered locales, so a translator cannot use it as a self-check; a file-based check for every `locales/*.json` would close that gap.
- The glossary's Languages table and the nl section agree; no missing cell was hit.
