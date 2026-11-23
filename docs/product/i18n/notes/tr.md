# Translator notes: Turkish (`tr`)

Written 2026-11-23, whole-file run.

## Files written

- `src/i18n/locales/tr.json`: 143 leaf keys (same as `en.json`, same order), plural forms `_one` + `_other` (CLDR tr), both carry the same text (noun stays singular after a number)
- `store/ios/tr/`: `name.txt` (24), `subtitle.txt` (30 of 30), `keywords.txt` (99 of 100), `promotional_text.txt` (146 of 170), `description.txt`
- `store/android/tr-TR/`: `title.txt` (24), `short_description.txt` (65 of 80), `full_description.txt` (same text as the iOS description)
- `store/release-notes/tr.txt` (199 of 500)

## Checks

- `yarn jest test/unit/i18n test/unit/store`: all Turkish store checks pass. The one failure in the run is `ios/ru` keywords (102 characters), not a Turkish file.
- `tr` is not registered in `src/i18n/index.ts` yet, so the locale test does not cover `tr.json`. Self-check with a node one-liner: 143 = 143 keys, identical key order, identical `{{placeholder}}` sets per key, no empty value, plural suffixes one/other. Identical to English only: `hud.vegas`, `settings.scoring.vegas`, `history.vegas` (already on the allow-list). No new allow-list entry needed (`settings.scoring.standard` is «Standart»).

## Uncertain terms

| Key | EN | Choice | Alternative | Why |
|---|---|---|---|---|
| (register, all strings) | you | sen | siz | Glossary «draft». Used sen everywhere, consistently |
| `notice.undoTip` | Tip: Drag the Undo button… | no label: «Oyununda zamanda yolculuk yapmak için Geri Al düğmesini yana sürükle» | «Püf noktası: …» | Turkish has one word («İpucu») for Tip and Hint; rule 12 says drop the label then |
| `about.madeBy` | Made by | «Geliştiren:» | «Yapan:» / «Hazırlayan:» | Turkish needs the name after a label; «Geliştiren» is the usual store/about word for a developer |
| `about.dedication` | my girlfriend | «kız arkadaşım» | «sevgilim» | «kız arkadaşım» is read as romantic partner in Turkish; «sevgilim» is more intimate ("my darling") |
| `nav.notFoundTitle` | Oops! | «Hay aksi!» | «Tüh!» / «Hata» | Friendly interjection, no error jargon |
| `notice.unwinnable` | No winning moves left | «Kazandıran hamle kalmadı» | «Bu oyun artık kazanılamaz» | Stays parallel to the stuck notice but clearly the stronger claim (kazandıran vs işe yarar) |
| `game.newGameAlert.message` | Ready for another round? | «Yeni bir oyuna hazır mısın?» | «Bir el daha?» | «el» is reserved for deal; «round» rendered as game |
| `game.newGameAlert.messageWon` | Nice win! | «Güzel bir galibiyet!» | «Güzel oynadın!» | Glossary: win = galibiyet; a bit formal for a dialog, reviewer please judge |
| `history.dealName`, `retryTitle`, `sharedTitle`, `retryA11y`, `shareA11y`, `share.dealMessage` | Deal / this deal | «El {{code}}», «Bu el…», «Bu Solitaire elini…» | «Dağıtım» | Glossary «el» «draft». Works, but «El 2345-6789» alone is short and slightly cryptic ("hand"); «Dağıtım {{code}}» is clearer and longer |
| `settings.solvableDeals` | Solvable deals | «Çözülebilir Eller» | «Çözülebilir eller» | Glossary cell is Title Case, while the other switch labels follow the English sentence case («Hamle sayacı», «İpucu düğmesi», «Oyun süresi»). Kept the glossary's form; the reviewer should pick one casing for all settings row labels (Turkish iOS uses Title Case on rows) |
| `settings.cardsDrawn` | Cards drawn | «Çekilen kart sayısı» | «Çekilen Kart» | Label beside the «{{number}} Kart Çek» picker; "number of cards drawn" reads more naturally |
| `settings.showTime` | Game timer | «Oyun süresi» | «Süre sayacı» | Matches HUD «Süre»; no glossary row for "timer" |
| `settings.vegasTotal.description` | The header | «Üstteki gösterge» | «Başlık» | "Header" has no player word in Turkish; "the indicator at the top" describes the badge |
| `settings.vegasTotal.resetMessage` | starts again from $0 | «$0 olarak yeniden başlar» | «$0’dan yeniden başlar» | Avoids a case suffix on a `$` amount |
| `a11y.stockExhausted` | no passes left | «tur hakkı kalmadı» | «tur kalmadı» | Glossary pass = «tur»; "hakkı" (allowance) makes it understandable when spoken |
| `a11y.stockRecycleLeft` | {{count}} left | «{{count}} tur kaldı» | «{{count}} kaldı» | Spoken label, so the noun is added |
| `a11y.scrubber` | position {{position}} of {{total}} | «Geri alma kaydırıcısı, toplam {{total}} adım, konum {{position}}» | «konum {{position}} / {{total}}» | "X of Y" needs a suffix on a number in Turkish, and a slash is read as "bölü"; rebuilt so both placeholders stand bare |
| `a11y.suit.*` / `a11y.rank.*` | clubs / Ace | «Sinek», «Karo», … capitalised; ranks lowercase possessive («ası», «kızı») | suits lowercase | Per the glossary's Turkish section (pattern starts with the suit: «Maça ası»). Mid-sentence («İpucu: Maça ası kartını…») the capital is harmless for speech |
| store promotional text | no tricks | «tuzak yok» | «numara yok» / «oyalama yok» | «hile» means cheating in a card game, wrong sense; «tuzak» (trap) carries "no dark patterns" |
| store description | thoughtfully refined | «özenle geliştirilmiş» | «incelikle işlenmiş» | Plain and natural; literal "refined" sounds odd |
| store description | streaks, coins | «seri, jeton» | «günlük seri, altın» | «seri» alone may be vague to non-gamers |
| store description | win celebrations | «kutlama animasyonu» | «galibiyet kutlaması» | Glossary term |
| store keywords | (not a translation) | soliter, solitare, kart, oyunu, oyunları, iskambil, pasyans, tek taş, klasik, internetsiz, çevrimdışı, bulmaca | sabır, zeka (dropped for the 100 limit) | «kart oyunu / kart oyunları» split into single words (Apple combines them); «reklamsız», «klondike», «solitaire» are in name/subtitle |

## Tight keys longer than English

| Key | EN (chars) | TR (chars) |
|---|---|---|
| `common.drawMode` | Draw 3 (6) | 3 Kart Çek (10): glossary term |
| `game.newGameAlert.confirm` | Deal Again (10) | Yeniden Dağıt (13) |
| `game.playDeal.retryConfirm`, `history.retry` | Retry (5) | Yeniden Dene (12): check Android dialog button and the detail sheet |
| `game.undo` | Undo (4) | Geri Al (7): platform word |
| `game.recyclesLeft` | 2 left (6) | 2 kaldı (7): within the ≤ 8 limit |
| `settings.warnings.noUsefulMoves` | No more useful moves (20) | İşe yarar hamle kalmadı (23): widest picker option |
| `history.stats.incomplete` | Incomplete (10) | Tamamlanmadı (12): three tiles in one row |
| `common.off` | Off (3) | Kapalı (6) |

## Source oddities

- `hud.*` context says the badges are "Shown UPPERCASE". If code uppercases with default JS rules, Turkish breaks on i/ı. The current five labels (Puan, Vegas, Toplam, Hamle, Süre) happen to contain neither letter, so they are safe today, but any future label needs `toLocaleUpperCase('tr')`.
- `settings.solvableDeals` in the glossary is Title Case while English and the neighbouring rows are sentence case (see table).
- `nav.notFoundLink` "Go to home screen!" has an exclamation mark that does not fit the calm tone; dropped in Turkish.
- `history.emptyBody`: "Completed games and their deals" is slightly redundant; translated as is.
- Store subtitle is exactly 30 characters: any reviewer change must be recounted.

## Feedback on the brief

- Clear overall. The glossary's Turkish column is hard to pull out of a six-column table; a per-language extract would save time.
- The glossary gives no rule for the casing of settings row labels in Turkish (only buttons, menus, titles).
- No row for "timer", "header", "round", "streak", "coins", "tricks".
