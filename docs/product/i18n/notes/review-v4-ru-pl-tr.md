# Review V4: Russian, Polish, Turkish

Written 2026-11-23 by reviewer V4 (plan step 7.1). Read: glossary (all-languages rules, ru / pl / tr sections, term table 2), `en.json`, `en.context.json`, the three locale files, the store folders, the release notes and the translators' notes.

## Checks run

- `jest test/unit/store test/unit/i18n`: 4 suites, 68 tests pass. The ru and tr iOS keywords that were reported over 100 characters are already at 95 and 99; nothing to fix.
- Node check on `ru.json`, `pl.json`, `tr.json` (the locale test skips unregistered locales): key parity and order against `en.json`, identical `{{placeholder}}` sets, plural forms equal to `Intl.PluralRules` categories, no empty value, no changed leading / trailing space: 0 violations.
- Plural samples 1, 2, 5, 21, 22, 25 rendered for moves, cards, minutes, dollars: ru «21 ход», «22 хода», «25 ходов»; pl «21 ruchów», «22 ruchy», «25 ruchów» (21 is `many` in Polish); tr singular noun in both forms. All correct.
- Turkish İ/ı read letter by letter in app and store text: no wrong letter found. The five HUD labels shown uppercase contain neither i nor ı.
- Store policy: no price word in iOS name / subtitle or Play title, no gambling word, no other game or brand name, «солитер» only in the keyword field.

## Changes made

### Russian

| Where | Before | After | Why |
|---|---|---|---|
| `notice.undoTip` | перетащите кнопку … чтобы путешествовать во времени по своей игре | потяните кнопку «Отменить» в сторону, чтобы путешествовать по игре во времени. | «Перетащить» means drag and drop onto a target; a sideways slide is «потянуть». Word order smoothed |
| `settings.scoring.description`, `.vegasDescription` | Применяется со следующей игры. | Действует со следующей игры. | Natural verb for a setting taking effect |
| `settings.hintButton.description` | Показывать кнопку …, которая показывает… | …, которая подскажет следующий ход. | Repeated verb |
| `settings.warnings.description` | …когда полезные ходы закончились или как только игру уже не выиграть. | …когда полезных ходов больше нет, или сразу, как только игру уже не выиграть. | Uses the glossary phrase; the second clause was hard to parse |
| store description (both stores) | перетащите … чтобы вернуться назад по своей игре | потяните … чтобы отмотать игру назад | Same verb as the app; «вернуться назад по игре» is not Russian |
| store description | Спокойное уведомление | Ненавязчивое уведомление | Idiomatic word for a quiet notice |
| store description | Автоперенос в дома сам перекладывает карты в дома | Автоперенос в дома: подходящие карты перекладываются сами | «в дома» twice in one line (translator's finding) |

### Polish

| Where | Before | After | Why |
|---|---|---|---|
| `about.pitch` | Bezpłatna aplikacja do pasjansa o otwartym kodzie… | Bezpłatny pasjans o otwartym kodzie źródłowym (open source). | «Aplikacja do pasjansa» is unnatural |
| `notice.undoTip` | no final full stop | full stop added | The other notices are sentences with one |
| `settings.vegasTotal.description` | W nagłówku zobaczysz… | U góry ekranu zobaczysz… | «Nagłówek» is developer vocabulary; same solution as ru and tr |
| store description | od Dobierz 1 do Dobierz 5 | od „Dobierz 1” do „Dobierz 5” | Mode names quoted, like the button names in the same list |
| store description | aby podróżować w czasie po całej grze | aby cofnąć się do dowolnego momentu gry | English says "travel back through your game" here, not "time travel" |
| store description | udostępnij je komuś znajomemu | udostępnij je znajomym | Simpler |

### Turkish

| Where | Before | After | Why |
|---|---|---|---|
| Settings row labels: `settings.cardsDrawn`, `settings.vegasTotal.label`, `settings.hintButton.label`, `settings.showMoves`, `settings.showTime` | sentence case | Çekilen Kart Sayısı · Vegas Toplamını Tut · İpucu Düğmesi · Hamle Sayacı · Oyun Süresi | One casing for all row labels. The glossary's «Çözülebilir Eller» and «Otomatik Yerleştir» were already Title Case, as Turkish iOS writes settings rows. Picker values and descriptions stay sentence case |
| `game.newGameAlert.messageWon` | Güzel bir galibiyet! … | Tebrikler, kazandın! … | «Galibiyet» is sports-report vocabulary (translator's doubt). Turkish past tense shows no gender |
| `about.sourceLink` | GitHub’da kaynak kodu | Kaynak kodu GitHub’da | Natural order for a link label |
| `settings.hintButton.description` | …gösteren İpucu düğmesini göster. | Sonraki hamleyi öneren İpucu düğmesini göster. | Repeated verb |
| `settings.vegasTotal.resetMessage` | $0 olarak yeniden başlar | yeniden $0’dan başlar | "Starts from $0"; a suffix with apostrophe on a literal amount is correct (only placeholders must stay bare) |
| `notice.undoTip` | no final full stop | full stop added | Consistency with the other notices |
| store description (both stores) | İsviçre’de yapıldı, sadece kart oynamak isteyen herkes için. | İsviçre’de, sadece kart oynamak isteyen herkes için yapıldı. | Turkish word order (verb last) |

Not touched: every store name, subtitle, keywords, short description, promotional text and all release notes; they read well and are inside the limits.

## Translators' uncertain items: resolved

| Item | Verdict |
|---|---|
| ru `common.drawMode` «Сдача по {{number}}» | Keep. «Сдача по одной / по три» is the usual Klondike wording; «По 3 за раз» is unclear alone in a history row. Width in the five-option picker needs the device check |
| ru waste «отбой», foundation «дом», pass «проход» | Keep; all read naturally and are used consistently in app and store |
| ru `about.promise` «уловок» for gamification | Keep; matches the store's «без уловок» |
| ru quotes around «Вегас» (ёлочки at top level, bare on one-word labels) | Correct |
| ru «без серий» (streaks) | Keep; understandable next to «монет» |
| pl `game.draw` «Weź» | Keep (3 characters, inside the limit) |
| pl `game.recyclesLeft` «Jeszcze {{count}}» (9, one over the ideal 8) | Keep. No natural shorter wording says "left": «Zostało {{count}}» is also 9, abbreviations are not allowed, «Masz {{count}}» and «Limit: {{count}}» fit but are unclear. Fallback if it clips on device: «{{count}} raz / razy / razy / raza» (5 to 6 characters) |
| pl «Porada» for Tip, «Brawo, wygrana!», «Cześć» | Keep |
| pl subtitle «Bez reklam, zawsze do wygrania» | Keep; same strength as English |
| tr register sen | Keep; consistent in every string, matches the imperative buttons |
| tr deal = «el» | Keep; it is what card players say («bir el daha»), and «El {{code}}» is short |
| tr no label on the undo tip | Correct (rule 12) |
| tr «tuzak yok» for "no tricks", «seri, jeton» | Keep |
| tr `a11y.scrubber` rebuilt order | Keep; both placeholders stand bare |

## Tight labels over about 1.3× English (no natural shorter word; device check)

| Key | English | ru | pl | tr |
|---|---|---|---|---|
| `game.undo` | Undo (4) | Отменить (8) | Cofnij (6) | Geri Al (7) |
| `game.hint` | Hint (4) | Подсказка (9) | Podpowiedź (10) | ok |
| `game.playDeal.retryConfirm`, `history.retry` | Retry (5) | Переиграть (10) | Powtórz (7) | Yeniden Dene (12) |
| `game.newGameAlert.confirm` | Deal Again (10) | ok (13) | Rozdaj ponownie (15) | ok (13) |
| `history.share` | Share (5) | Поделиться (10) | Udostępnij (10) | ok |
| `common.reset` | Reset (5) | Сбросить (8) | Wyzeruj (7) | Sıfırla (7) |
| `common.off` | Off (3) | Выкл. (5) | Wył. (4) | Kapalı (6) |
| `common.drawMode` | Draw 3 (6) | Сдача по 3 (10) | Dobierz 3 (9) | 3 Kart Çek (10) |
| `settings.scoring.standard` | Standard (8) | Стандартный (11) | Standardowa (11) | ok |
| `settings.warnings.unwinnable` | Unwinnable game (15) | Игру уже не выиграть (20) | ok | ok |
| `game.recyclesLeft` | 2 left (6) | ok | Jeszcze 2 (9) | ok |

All of these are glossary terms or platform words. Most at risk: the Android dialog buttons «Переиграть», «Rozdaj ponownie», «Yeniden Dene», and the draw-mode picker with five options.

## Glossary proposals (not applied: the cells are not «draft», or the change is a new rule)

| # | Language | Proposal | Reason |
|---|---|---|---|
| 1 | pl | Row "Draw (verb)": «Weź» for the stock caption, «Dobierz {{number}}» stays for the mode. Section bullets "Short labels" and "Caption lengths": «Weź», «Jeszcze {{count}}» | Matches what is in `pl.json`; the glossary still says «Dobierz» / «Zostało: {{count}}» |
| 2 | tr | Capitalisation rule: add "settings row labels are Title Case; picker values and descriptions sentence case" | The rule was missing and the file was mixed |
| 3 | ru | History status words in the feminine, agreeing with the row title «Раздача {{code}}»: «Выиграна», «Не завершена», «Текущая» (the stat tiles stay «Выиграно», «Не завершено») | Today the row shows neuter «Выиграно» / «Не завершено» next to feminine «Текущая» and «Решаемая». Polish already splits stat and status forms. Not applied because «Не завершено» is a decided cell |
| 4 | pl | Fallback for Deal Again if the dialog button truncates: «Nowe rozdanie» (13) | Shorter and natural, but a noun instead of the imperative |
| 5 | ru | Fallback for Retry if the dialog button truncates: «Заново» (6) | Short everyday word; «Переиграть» is more exact |
| 6 | all three | The «draft» marks on the rows listed under "resolved" can be removed | Reviewed and kept |

## Open items for Karim

1. Proposal 3 (Russian status words in the feminine): yes or no.
2. Turkish register sen (informal) is confirmed by this review; siz would be the distant, polite alternative.
3. Turkish "Nice win!" is now «Tebrikler, kazandın!» ("Congratulations, you won!"), slightly warmer than English.
4. Device check on a small phone for the table of long tight labels above, first of all pl «Jeszcze 2» on the empty stock slot and the three dialog buttons.
5. The undo tip now ends with a full stop in ru, pl and tr although English has none (`notice.undoTip` is the only English notice without one).
