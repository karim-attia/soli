# Plain-words check: ru, pl, tr (2026-11-24)

Lens: the German rule "Plain words before patience jargon" (glossary, German section). Reader: a native speaker who plays casual mobile games and knows no patience vocabulary. Read: every string in `ru.json`, `pl.json`, `tr.json`, all store files and release notes of the three languages. Gates: `yarn jest test/unit/i18n test/unit/store` (result at the end).

## Changed

| Lang | Where | Before | After | Why |
|---|---|---|---|---|
| ru | `common.drawMode` | Сдача по {{number}} | Брать по {{number}} | «Сдача» is everyday "change from a purchase"; in a history row it stood next to «Раздача …» (deal), two near-identical words for two things; the settings row («Сколько карт брать») and the stock button («Взять») already use the other verb. Same length (10 with the digit) |
| ru | `share.dealMessage` | (сдача по {{number}}) | (брать по {{number}}) | Same wording as the mode name (context file) |
| ru | store description (iOS + Play), feature line | со сдачей по 1–5 карт | из колоды можно брать от 1 до 5 карт за раз | Same term as the app |
| ru | store description | без серий, монет | без серий побед, монет | Bare «серия» reads as "episode / series" |
| pl | store description | bez serii, monet | bez serii wygranych, monet | Bare «seria» is unclear |
| tr | store description | seri, jeton | galibiyet serisi, jeton | Bare «seri» also means "fast / serial" |
| tr | `history.emptyBody` | Tamamlanan oyunlar ve elleri | Tamamlanan oyunlar ve oynadığın eller | «elleri» after «oyunlar» reads as "their hands" (body part) |

Glossary: ru Draw N cell in Table 2, and one dated "Plain-words check" line in each of the three language sections.

## Checked and kept

| Lang | Term | Verdict |
|---|---|---|
| ru | колода (stock), отбой (waste) | Everyday card words; «отбой» is the discard pile in «Дурак», which every Russian speaker has played. Screen-reader labels only |
| ru | дом / «Автоперенос в дома» | Kept. «дома» is the usual word in Russian Klondike texts (Wikipedia, FRVR; a 1C «Косынка» lists «автосбор в дома» as a feature). Metaphor is transparent. Slight doubt, see below |
| ru | раздача, Решаемые раздачи, столбец, проход | Plain |
| pl | talia rezerwowa, stos bazowy, stos odrzuconych | Descriptive compounds of plain words (like German «Ablagestapel»), no loanword such as «talon». FRVR and Polish rule pages use them; Empik's guide says «pola bazowe» |
| pl | rozdanie, Dobierz {{number}}, Weź, grywalizacja | Plain / established |
| tr | el (deal) | Everyday card Turkish («bir el daha oynayalım»). Only the possessive plural was ambiguous (fixed above) |
| tr | deste, atık yığını, temel yığın, sütun | Plain compounds; FRVR and Solitaire Bliss Turkish use the same |
| tr | Solitaire as the game's name | What Turks call it |

## Unsure (not changed)

| Lang | Item | Alternative | Why not changed |
|---|---|---|---|
| ru | «Автоперенос в дома» | «Автосбор в дома» (attested) or «Убирать карты автоматически» | «в дома» can be read as "into houses" for a second; no clearly better short label |
| ru | undo tip «путешествовать по игре во времени» | «чтобы перемотать игру назад или вперёд» | Literal but playful on purpose, as in English |
| pl | «Rozdania rozwiązywalne» / «Rozwiązywalne» | «Rozdania do wygrania» / «Do wygrania» (the store subtitle and short description already say «do wygrania») | Understood by everyone, only bookish; decided "kept" on 2026-11-24. I would lean to the plainer form if Karim wants app and store identical |
| pl | `settings.cardsDrawn` «Dobierane karty» | «Liczba dobieranych kart» | Fine, slightly terse |
| ru | Windows precedent for the old term | Windows' «Косынка» options said «Сдавать по одной / по три карты», so «Сдача по 3» was not wrong, only less plain. Revert = two JSON values, one store line (×2), one glossary cell |
| all three | "streaks" narrowed to "win streaks" | — | Slightly narrower than English "no streaks"; still true for Soli |

## Sources (quick web check, 2026-11-23/24)

- 1C «Пасьянс Косынка» (infostart.ru/public/2777571): «режим „сдавать по три“ … автосбор в дома».
- frvr.com/ru, frvr.com/pl, frvr.com/tr rule pages: «дома», «отбой»; «talia rezerwowa», «stosy bazowe»; «temel yığınlar», «atık yığını».
- empik.com/pasje/jak-grac-w-pasjansa: «pola bazowe».
- solitairebliss.com (Turkish text): «atık yığını».

## Gates

`yarn jest test/unit/i18n test/unit/store`: 4 suites, 143 tests passed (2026-11-24). No build, nothing staged.
