# Translator notes: Polish (`pl`)

Written 2026-11-23 by the `pl` translator (whole file + store text).

## Files written

| File | Notes |
|---|---|
| `src/i18n/locales/pl.json` | 161 keys (English has 143; the 9 plural bases each have one / few / many / other), same key order as `en.json` |
| `store/ios/pl/{name,subtitle,keywords,promotional_text,description}.txt` | name 22 / 30, subtitle 30 / 30, keywords 95 / 100, promotional text 164 / 170, description 971 |
| `store/android/pl-PL/{title,short_description,full_description}.txt` | title 22 / 30, short description 78 / 80, full description = iOS description |
| `store/release-notes/pl.txt` | 202 / 500 |

Tests: `yarn jest test/unit/i18n test/unit/store` passes. `pl` is not registered in `src/i18n/index.ts` yet, so the locale test did not cover `pl.json`; a node self-check confirmed key parity and order, identical placeholder sets, the plural set one / few / many / other on every plural key, no empty value, and no value identical to English except the three allow-listed Vegas keys.

## The two tight captions (asked for explicitly)

| Key | EN | Glossary | My choice | Length | Why |
|---|---|---|---|---|---|
| `game.draw` | Draw | «Dobierz» (7) | **«Weź»** | 3 (limit ≤ 6) | The glossary rule "the length limit wins" applies. «Weź» ("take") is the plain everyday imperative and the closest synonym of «Dobierz», so the caption still matches the mode name «Dobierz {{number}}». Alternative: «Odkryj» (6, "turn over"), which describes what happens in Klondike precisely and also fits, but is a different verb from the mode name and from the hint text («dobierz kartę z talii rezerwowej»). «Ciągnij» is 7, «Dobór» is a stiff noun. The mode name, the settings label and the spoken hint keep «Dobierz / dobierz» (no limit there). |
| `game.recyclesLeft_*` | {{count}} left | «Zostało: {{count}}» (10) | **«Jeszcze {{count}}»** | 9 with a one-digit number (limit ≤ 8) | Shortest natural wording I can find; one over the "ideal" 8, one shorter than the glossary term, no colon, and it mirrors fr «Encore», it «Ancora», ru «Ещё». Needs no agreement, so all four forms are the same text. Rejected: «Zostało {{count}}» (also 9, but odd without the colon), «{{count}} razy» (6, but drops "left" and reads as an instruction), abbreviations («Zost.»). Still needs the device check. The screen-reader label `a11y.stockRecycleLeft_*` keeps the glossary's «zostało: {{count}}» (no length limit, clearer when spoken). |

Both are proposals for the glossary's pl section ("Short labels", "Caption lengths to check on device") and the term row "Draw (verb)".

## Uncertain terms

| Key | EN | Choice | Alternative | Why |
|---|---|---|---|---|
| `nav.hello` | Hello | Cześć | Witaj | No glossary row. «Cześć» is the friendly ty-register greeting; «Witaj» is a little more formal and reads as "welcome". |
| `about.madeBy` | Made by | Autor: | Stworzone przez | Label form as the context note suggests; «przez @carimatia» would be fine too, but the label avoids a participle and declension. |
| `about.pitch` | Free and open source Solitaire app. | Bezpłatna aplikacja do pasjansa o otwartym kodzie źródłowym (open source). | Darmowy pasjans open source. | Glossary: «open source» explained once as «otwarty kod źródłowy». The About screen is where I explain it; the store description does the same. |
| `about.sourceLink` | Source code on GitHub | Kod źródłowy na GitHubie | Kod źródłowy w serwisie GitHub | The declined form is what Poles write; only Soli must stay undeclined. |
| `notice.undoTip` | Tip: … | Porada: … | no label; «Wskazówka:» | «Wskazówka» is the glossary's alternative for Hint, so I avoided it ("Tip is not the Hint word"). |
| `notice.unwinnable` | No winning moves left — … | Gra jest już nie do wygrania – cofnij ruch lub zacznij nową grę. | Tej gry nie da się już wygrać – … | Uses the glossary pair «do wygrania / nie do wygrania»; clearly stronger than `notice.stuck` («Brak przydatnych ruchów – …»). |
| `game.newGameAlert.message` | Ready for another round? | Masz ochotę na kolejną rundę? | Kolejna runda? | «Gotowy / gotowa» shows gender, so "ready" became "do you feel like". |
| `game.newGameAlert.messageWon` | Nice win! … | Brawo, wygrana! … | Ładna wygrana! | The glossary's own example. |
| `game.playDeal.sharedTitle` | Play shared deal? | Rozegrać udostępnione rozdanie? | Zagrać w udostępnione rozdanie? | «rozegrać rozdanie» is the idiomatic collocation; the button stays «Graj». |
| `settings.cardsDrawn` | Cards drawn | Dobierane karty | Liczba dobieranych kart | Shorter row label next to the «Dobierz 1–5» picker. |
| `settings.vegasTotal.*` | running total / balance | łączna suma / saldo | suma bieżąca | "Total" = «Suma» (glossary); "running" rendered as «łączna». «saldo» only where English says "balance". |
| `settings.showTime` | Game timer | Czas gry | Stoper | Matches the HUD label «Czas». |
| `history.loadingBody` | Please wait while we retrieve … | Poczekaj, wczytujemy twoje ostatnie gry. | Proszę czekać… | ty register, no «proszę». |
| `history.justNow` | just now | przed chwilą | teraz | Lowercase like English. |
| `a11y.stockExhausted` | Stock, no passes left | Talia rezerwowa, brak kolejnych przejść | … nie można już przełożyć | Glossary «przejście» (draft). |
| `a11y.scrubber` | Undo scrubber | Suwak cofania | Oś czasu cofania | No glossary row; «suwak» is the platform word for a slider. |
| `a11y.foundationEmpty` | {{pile}}, empty | {{pile}}, pusty | | Agrees with «stos» (masculine); `a11y.emptyColumn` and `a11y.stockEmpty` use «pusta» (kolumna, talia). Safe because every pile name starts with «Stos bazowy». |
| `a11y.hint.toFoundation` | Hint: move {{card}} to the foundation. | Podpowiedź: {{card}} – na stos bazowy. | | Label pattern, `{{card}}` stays nominative (glossary rule). |
| store subtitle | No ads. Every deal winnable. | Bez reklam, zawsze do wygrania | Bez reklam. Gry do wygrania. | The literal «Bez reklam. Każde rozdanie do wygrania.» is 38 characters. Mine is exactly 30 and keeps both claims ("always winnable"). Note: with solvable deals switched off the claim is not literally true, same as in English. |
| store keywords | n/a | pasjanse,solitaire,karty,gra karciana,gry karciane,klasyczny,offline,łamigłówka,logiczna,relaks | add «bez internetu» | «bez internetu» is not possible: the test rejects «bez» because it is in the subtitle. «gra logiczna» shortened to «logiczna» («gra» is already there). |
| store description | streaks, coins, pop-ups | serii, monet i wyskakujących okienek | «passy» | «serie» is the usual Polish app wording for streaks. |
| store description | Made in Switzerland | Stworzone w Szwajcarii | Wyprodukowano w Szwajcarii | Neuter, impersonal, no gender. |
| release notes | Small fixes and polish | Drobne poprawki i szlify | Drobne poprawki i ulepszenia | Friendly and plain. |

## Tight keys longer than English

| Key | EN | pl | Comment |
|---|---|---|---|
| `game.recyclesLeft` | 6 ("2 left") | 9 («Jeszcze 2») | see above |
| `game.hint` | Hint (4) | Podpowiedź (10) | Glossary term (draft); the dock button needs the small-phone check. «Wskazówka» is 9, no real gain. |
| `game.newGameAlert.confirm` | Deal Again (10) | Rozdaj ponownie (15) | Glossary term; dialog button, Android may truncate: check. |
| `settings.scoring.standard` | Standard (8) | Standardowa (11) | Glossary term. |
| `settings.warnings.noUsefulMoves` | No more useful moves (20) | Brak przydatnych ruchów (23) | Widest picker value: check. |
| `history.stats.incomplete` | Incomplete (10) | Nieukończone (12) | Three tiles in one row: check. |
| `history.share` | Share (5) | Udostępnij (10) | Platform word. |
| `common.reset`, `history.retry`, `game.playDeal.retryConfirm` | 5 | 7 | Wyzeruj / Powtórz, glossary terms. |

## Source oddities

- `nav.notFoundLink` ends with "!" in English; Polish drops it (calm tone, no full stop on labels).
- `notice.undoTip` has no final full stop in English while the other notices have one; I kept it without.
- `game.recyclesLeft_one` and `_other` are identical in English, and `a11y.stockRecycleLeft` likewise: fine, the Polish forms are identical too.
- The store description says "every new game can be won" while the subtitle says "Every deal winnable": true only with the default setting. Kept the same strength, not stronger.
- "Auto Up" in the store description is a feature name in English; Polish uses the glossary's descriptive «Automatyczne odkładanie», so the sentence reads as a description.

## Feedback on the brief

- The glossary's pl section and the "length limit wins" principle contradict each other for «Dobierz» and «Zostało: {{count}}»; the task message settled it. A shorter researched word in the glossary would have saved the decision.
- No glossary rows for "Hello", "Tip", "scrubber", "running total", "streaks": minor, handled above.
- The locale jest test skips unregistered locales, so a translator cannot get a machine check on its own file; a tiny script (or a test mode that reads every `locales/*.json`) would help.
