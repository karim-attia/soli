# Translator notes: Italian (`it`)

Written 2026-11-23, whole-file run.

## Files written

- `src/i18n/locales/it.json`: 152 keys (132 English keys + 10 `_many` forms), same order as `en.json`, plural forms one / many / other
- `store/ios/it/`: name (24/30), subtitle (30/30), keywords (95/100), promotional_text (163/170), description (878)
- `store/android/it-IT/`: title (24/30), short_description (75/80), full_description (878, same text as iOS)
- `store/release-notes/it.txt` (217/500)

Checks: `yarn jest test/unit/i18n test/unit/store`: the `ios/it` and `android/it-IT` tests and all i18n tests pass. The run as a whole had failures from other languages being written in parallel (`ios/ru` keywords at 102 characters at the time), none from Italian. `it` is not registered in `src/i18n/index.ts` yet, so the locale tests do not cover it; a node self-check confirmed key parity and order, placeholders per key, the three plural forms, no empty value.

## Allow-list (values identical to English on purpose)

| Key | Value | Why |
|---|---|---|
| `settings.scoring.standard` | Standard | Glossary term; already announced in the glossary's Enforcement section |
| `history.stats.incomplete` | Incomplete | **New.** Feminine plural of «incompleta» (tile above a number of games, next to «Vinte»). It happens to be spelled like the English word. Alternative that avoids the allow-list: «Non finite» (leaves the glossary term) |

`hud.vegas`, `settings.scoring.vegas`, `history.vegas` are on the list already.

## Uncertain terms

| Key | English | Choice | Alternative | Why |
|---|---|---|---|---|
| store `subtitle.txt` | No ads. Every deal winnable. | Senza annunci. Mani vincibili. | Niente pubblicità. Solo carte. (30) | The glossary term «senza pubblicità» does not fit: «Senza pubblicità. Mani vincibili» is 32 characters. «annunci» is Google Play's own word («Contiene annunci») and is not forbidden in the iOS subtitle, but it breaks "one word per thing" (pubblicità everywhere else). The alternative keeps the term and drops the winnable claim |
| `history.stats.solved` / `.incomplete` | Solved / Incomplete | Vinte / Incomplete | Vinta / Incompleta | Plural, because the tiles count games («Partite 12 · Vinte 7»). The row status keeps the singular |
| `game.newGameAlert.message` | Ready for another round? | Ti va un’altra partita? | Pronto per un’altra partita? | «Pronto/a» would show the player's gender |
| `notice.unwinnable` | No winning moves left — undo or start a new game. | Questa partita non si può più vincere. Annulla o inizia una nuova partita. | Nessuna mossa vincente rimasta. … | «mossa vincente» reads as "the one winning move"; the glossary's «non si può più vincere» is the plain statement. Two sentences instead of the dash |
| `notice.*` (both) | undo | Annulla | Annulla una mossa | Bare «Annulla» matches the button label; since Cancel is the same word, «Annulla una mossa» would be clearer but longer and suggests one step is enough |
| `settings.showTime` | Game timer | Tempo di gioco | Timer della partita, Cronometro | Keeps the HUD word «Tempo», so setting and badge match |
| `settings.warnings.unwinnable` | Unwinnable game | Non più vincibile | Partita non più vincibile (25) | Tight picker value; the noun is clear from the row |
| `settings.vegasTotal.description` | The header then shows … | In alto compare allora … | L’intestazione mostra allora … | «intestazione» is document jargon for a player; "at the top" says where to look |
| `settings.vegasTotal.*`, running total | running total | totale progressivo | totale complessivo, saldo | No glossary row for "running total"; «Totale» is the term, «progressivo» only qualifies it in sentences |
| `a11y.stockRecycleLeft` | …, {{count}} left | …, {{count}} giro rimasto / giri rimasti | {{count}} rimasto / rimasti (glossary wording) | Spoken aloud, «2 rimasti» has no noun to refer to; adding «giro» keeps the glossary's agreement and makes it understandable |
| `a11y.scrubber` | Undo scrubber | Cursore di annullamento | Cursore Annulla | No glossary row for the slider; «cursore» is the platform word for a slider |
| `a11y.hint.toFoundation` | move {{card}} to the foundation | {{card}} sulla base | alla base | Label form without article before the placeholder, as the glossary prescribes |
| `history.justNow` | just now | adesso | proprio ora, ora | Shortest natural word in a detail line |
| `nav.hello` | Hello | Ciao | Salve | Friendly and tu register |
| `share.dealMessage` | in Soli | su Soli | in Soli | «su» is the usual preposition for apps; nothing is glued to the name |
| store description | streaks | serie giornaliere | streak | No settled Italian word; «serie giornaliere» is understandable without English |
| store description | share it with a friend | condividila con chi vuoi | con un amico | Avoids the masculine «amico» |
| store, promo text | unlimited undo | annullamento illimitato | Annulla illimitato | Noun form as in the Italian listings the glossary cites («Annullamento semplice») |
| store, short description | Calm … Unlimited undo. | … rilassante. … Annulla senza limiti. | Annullamento illimitato (does not fit with the rest) | 80-character limit; «rilassante» is also a keyword-table word |

Glossary «draft» terms used as given: Donna, giro, Nuova mano, Mosse automatiche, Punti, Cronologia, Gioco / Nuove partite, No, Ancora {{count}}. «tableau» was not needed.

## Tight keys longer than English

| Key | English | Italian |
|---|---|---|
| `game.hint` | Hint (4) | Suggerimento (12): glossary term, device check; fallback «Aiuto» |
| `game.newGame` | New Game (8) | Nuova partita (13) |
| `game.undo` / `common.cancel` | Undo (4) / Cancel (6) | Annulla (7) |
| `common.reset` | Reset (5) | Azzera (6) |
| `nav.history` | History (7) | Cronologia (10) |
| `nav.settings` | Settings (8) | Impostazioni (12) |
| `game.playDeal.retryConfirm`, `history.retry` | Retry (5) | Rigioca (7) |
| `history.share` | Share (5) | Condividi (9) |
| `history.stats.incomplete` | Incomplete (10) | Incomplete (10): same length, widest of the three tiles |
| `settings.warnings.unwinnable` | Unwinnable game (15) | Non più vincibile (17) |
| `hud.total` | Total (5) | Totale (6), inside the ≤ 8 limit |
| `game.recyclesLeft` | 2 left (6) | Ancora 2 (8): exactly at the limit, 9 with a two-digit count |

## Source oddities

- `game.recyclesLeft_one` and `a11y.stockRecycleLeft_one` are identical to their `_other` form in English; fine, but the plural split only matters in translation.
- `notice.unwinnable` says "No winning moves left", while the context note calls it "the game can provably no longer be won". Translated from the context note's meaning.
- `history.loadingBody`: "retrieve your recent games" sounds like a network fetch for a local list. Translated as is.
- `history.emptyBody`: "Completed games" could mean won games only or every ended game; translated as «partite concluse» (ended), which covers both.
- iOS keywords: the English list has "ad free"; the Italian subtitle already carries the no-ads claim, so the keyword field holds «pubblicità» alone («senza» is in the subtitle and the test rejects repeats). «solitario» and «klondike» are in the name, so they are left out; «solitaire» is kept as the second spelling people type.

## Feedback on the brief

- The glossary is 190 KB; reading "your section + your column" needs line ranges and a column filter. A per-language extract (or one term table per language) would save every translator the same work.
- The subtitle limit (30) cannot hold the glossary's own no-ads term plus the winnable claim in Italian. A glossary line with the decided subtitle per language would settle this before translation.
- The skill says `_many` gets the `_other` text; it could add that the key order is `_one`, `_many`, `_other` in place of the English pair.
- The identical-to-English test catches legitimate plurals like «Incomplete»; translators cannot know this before the locale is registered.
