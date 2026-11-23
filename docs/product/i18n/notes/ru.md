# Translator notes: Russian (`ru`)

Written 2026-11-23 by the `ru` translator (whole file + store text).

## Files written

- `src/i18n/locales/ru.json`: 161 keys (134 base keys; 9 plural bases × one / few / many / other), same key order as `en.json`.
- `store/ios/ru/`: `name.txt` (21 / 30), `subtitle.txt` (29 / 30), `keywords.txt` (95 / 100), `promotional_text.txt` (167 / 170), `description.txt`.
- `store/android/ru-RU/`: `title.txt` (21 / 30), `short_description.txt` (76 / 80), `full_description.txt` (same text as the iOS description).
- `store/release-notes/ru.txt` (214 / 500).
- jest: see "Test result" at the end.

## Uncertain terms

| Key | English | Choice | Alternative | Why |
|---|---|---|---|---|
| `settings.cardsDrawn` | Cards drawn | Сколько карт брать | «Сдача карт»; «Карт за раз» | No glossary row for the row label. Follows the verb «Взять» on the stock; the picker values next to it say «Сдача по 3», so «Сдача карт» would repeat the word |
| `about.madeBy` | Made by | Автор: | «Сделано:» | A participle would be fine, but a label reads most naturally before the @handle and shows no gender |
| `about.promise` | …or gamification to get you to play more | …и уловок, которые заставляют играть больше | «геймификации» | «Геймификация» is marketing jargon in Russian; «уловки» says what is meant. Slightly more judgemental than English |
| `game.newGameAlert.message` | Ready for another round? | Ещё одну партию? | «Сыграем ещё раз?» | «Готовы…?» is gender-safe only in the plural-polite form and sounds stiff; «партия» is used only here (elsewhere «игра») |
| `game.playDeal.sharedTitle` | Play shared deal? | Сыграть раздачу по ссылке? | «Сыграть присланную раздачу?» | "Shared" has no short natural participle; the deal always arrives through a link |
| `notice.undoTip` | Tip: … time travel through your game | Совет: … путешествовать во времени по своей игре. | no label; «перемещаться по ходам игры» | «Совет» ≠ «Подсказка» (rule 12). Glossary term «путешествие во времени» used as a verb. I added a full stop (Russian rule: notices end with one; English has none) |
| `settings.vegasTotal.label` | Keep Vegas total | Сохранять итог «Вегас» | «Общий итог «Вегас»»; «Накопительный итог» | «Итог» matches the badge «Итого». The name is quoted and not declined |
| `settings.vegasTotal.description` | The header then shows… | Тогда вверху экрана показывается… | «В шапке…» | «Шапка» is web jargon; "top of the screen" is what the player sees |
| `settings.warnings.noUsefulMoves` | No more useful moves | Нет полезных ходов | «Полезных ходов больше нет» (glossary phrase, 25 characters) | Tight picker value, the widest one: 18 characters against 20 in English. The notice itself keeps the full glossary phrase. Not the forbidden «Ходов нет»: «полезных» stays |
| `settings.showTime` | Game timer | Таймер игры | «Время игры» | The badge says «Время»; the setting names the thing that is shown |
| `history.emptyTitle` | No games recorded yet | Сыгранных игр пока нет | «Пока нет записей» | Natural and short |
| `a11y.scrubber` | Undo scrubber | Шкала отмены | «Ползунок отмены» | No glossary row. TalkBack/VoiceOver already announce the role "ползунок", so the label names the thing |
| `a11y.emptyColumn`, `a11y.stockEmpty`, `a11y.foundationEmpty` | …, empty | …, пусто | «пустой / пустая» | The adverb avoids gender agreement with the placeholder `{{pile}}` and with столбец / колода |
| `a11y.hint.draw` | Hint: draw from the stock. | Подсказка: взять карту из колоды. | «возьмите карту из колоды» | Infinitive matches the label-style of the two other hints («{{card}} — в столбец {{column}}.») |
| `share.dealMessage` | Play this Klondike deal in Soli (Draw {{number}}) | Сыграйте эту раздачу «Косынки» в Soli (сдача по {{number}}) | «Раздача «Косынки» в Soli…» | The mode name is lowercased inside the brackets; the game name is quoted and declined as the glossary prescribes |
| store `name.txt` / `title.txt` | Soli: Klondike Solitaire | Soli: пасьянс Косынка | «Soli: Пасьянс Косынка»; «Soli: Косынка (Клондайк)» | Both search words people type; no inner quotes to save characters and because titles of the top apps write it that way. Sentence case |
| store `subtitle.txt` | No ads. Every deal winnable. | Без рекламы. Решаемые раздачи | «Без рекламы. Отмена ходов» | «Каждую раздачу можно выиграть» does not fit in 30. The glossary term fits (29) and is a slightly weaker claim, never a stronger one |
| store description, first line | classic Klondike Solitaire | классический пасьянс «Косынка» (Клондайк) | without «(Клондайк)» | The glossary allows «Клондайк» in store text; naming it once helps search on Google Play, where the description is indexed |
| store description, last line | for everyone who just wants to play cards | для всех, кто хочет просто разложить пасьянс | «поиграть в карты» | «Играть в карты» means card games with other people (дурак, покер) and brushes against gambling |
| store description | no streaks | без серий | «без ежедневных серий» | «Серии» alone may be unclear to some readers; the longer form is clearer but adds a word English does not have |

## Tight keys longer than English

| Key | English | Russian |
|---|---|---|
| `game.undo` | Undo (4) | Отменить (8), glossary |
| `game.hint` | Hint (4) | Подсказка (9), glossary |
| `game.newGameAlert.confirm` | Deal Again (10) | Раздать снова (13) |
| `game.playDeal.retryConfirm`, `history.retry` | Retry (5) | Переиграть (10) |
| `history.share` | Share (5) | Поделиться (10) |
| `common.reset` | Reset (5) | Сбросить (8) |
| `common.drawMode` | Draw 3 (6) | Сдача по 3 (10) «draft» in the glossary; check the settings picker with five segments on a small phone. The alternative «По 3» (4) would fit any picker if the row label carries the meaning |
| `settings.scoring.standard` | Standard (8) | Стандартный (11) |
| `history.stats.incomplete` | Incomplete (10) | Не завершено (12) |
| `history.dealName` | Deal … (4) | Раздача … (7) |
| `nav.settings`, `nav.history`, `nav.play` | 8 / 7 / 4 | Настройки (9) / История (7) / Играть (6) |

Inside the numeric limits: `game.draw` «Взять» (5 ≤ 6), `game.recyclesLeft` «Ещё 3» (5 ≤ 8), HUD badges «Счёт», «Вегас», «Итого», «Ходы», «Время» (all ≤ 5).

## Glossary findings (used as written, not changed)

- **`Сдача по {{number}}` «draft»**: in card-game Russian «сдача» is the dealing of a hand, so it sits close to «раздача» (deal). It works, but «По {{number}} карте/карты» or the alternative «По {{number}} за раз» is less ambiguous and shorter. Worth a reviewer's opinion.
- **«Автоперенос в дома»**: correct after foundation = «дом», but «в дома» can be misread for a moment as "into houses". The store line «Автоперенос в дома сам перекладывает карты в дома» repeats the word because the English sentence explains the feature by its name; a reviewer may prefer «Автоперенос сам перекладывает карты в дома».
- **Status «Выиграно» / «Не завершено»** are neuter short forms next to the feminine «Текущая» and «Решаемая» (both agree with «игра» / «раздача»). It reads fine, but the three status words are not parallel. Alternative: «Идёт» for Active.
- **Quotes around «Вегас»**: the glossary example «режим „Вегас“» shows inner quotes because it is itself inside «…». At top level I wrote «Вегас» in ёлочки. Bare (unquoted) in the one-word labels `hud.vegas`, `settings.scoring.vegas`, `history.vegas`.
- **Keywords**: «без рекламы» and «без интернета» from the keyword table are left out: «без» and «рекламы» are already in the subtitle (indexed), and «офлайн» covers the second. «пасьянс», «косынка» are in the name. «солитер» appears only in the keyword field, as the glossary demands.

## Source oddities

- `notice.undoTip` has no full stop in English although it is a full sentence; the other notices have one.
- `about.dedication`: the initial "T" is kept as the Latin letter (as instructed). In Russian text it is indistinguishable from the Cyrillic «Т», which is fine.
- `hud.badgeA11y`, `history.dateTime`, `a11y.foundation` are pure patterns and stay identical to English (the test skips them). No key needs an `UNTRANSLATED_OK` entry for Russian; the three Vegas keys are no longer identical («Вегас»).
- `game.recyclesLeft` and `a11y.stockRecycleLeft` have four identical forms in Russian (no agreement needed), as the glossary says.
- `settings.scoring.description` / `vegasDescription`: "Applies to your next game" is translated «Применяется со следующей игры» (from the next game on), which is what the section title "New Games" means.

## Feedback on the brief

- The term tables are wide; finding one language's column needs a script. A per-language extract (or one table per language) would save time.
- The research note's example phrases were not needed: the glossary's Russian section was enough.
- The keyword rule "no word that is already in name or subtitle" conflicts with keyword-table entries that are phrases containing such a word («без рекламы»). I applied the rule to single words.

## Test result

`yarn jest test/unit/i18n test/unit/store`: 4 suites, 64 tests passed. The locale test only covers registered locales and `ru` is not registered yet (orchestrator's step), so key parity and order, placeholders, plural suffixes (one / few / many / other on all 9 plural bases), empty values and values identical to English were also checked with a node script: no findings.
