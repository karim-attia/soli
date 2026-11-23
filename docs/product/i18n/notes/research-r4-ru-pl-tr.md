# Terminology research R4: Russian (ru), Polish (pl), Turkish (tr)

Researcher R4, 2026-11-23. Plan step 5.1 (`docs/product/i18n/i18n.md`). Input for the merge agent: this file does NOT edit `glossary.md`.

How to read it:

- Per language: (1) rules section ready to paste into the glossary's language section, (2) term table with exactly the glossary's EN rows in the glossary's order, (3) ASO keywords, (4) sources, (5) open doubts.
- **«draft»** = I was unsure; the alternative is in the Note column. No flag = decided with evidence.
- Evidence quality: game terms come from pages I fetched today (store listings with `hl=ru|pl|tr`, FRVR's localized rules pages, KDE KPatience handbooks, Wikipedia). **Platform verbs (Undo, Cancel, Share, Settings, Reset, Off) are from my knowledge of the iOS/Android system UI in these languages; I could not fetch an Apple or Google glossary page today** (Apple's style guide is English-only, the Play pages only show app text). They are standard words and I am confident, but the reviewer should confirm them on a device set to the language.
- Microsoft Solitaire Collection: its store text in all three languages leaves the mode names in English ("Klondike Solitaire, Spider Solitaire, …") and its App Store description is not localized at all. I could not read its in-app UI. So "what Microsoft calls the pile" is not a source here; the other apps and references are.

Cross-language findings the orchestrator should know first:

| # | Finding | Affects |
|---|---|---|
| X1 | **Card names inside a sentence need a case** in ru and pl (accusative: «туза пик», «asa pik») and a suffix in tr («maça asını»). A `{{card}}` placeholder can only hold one form. Rule for all three: **`{{card}}` always stands in the nominative**, the sentence is rebuilt around it with a colon or dash (examples in each rules section). | `a11y.hint.toColumn`, `a11y.hint.toFoundation`, `a11y.waste`, `a11y.foundation`, `a11y.tableauCard` |
| X2 | The card pattern is `{{rank}} {{suit}}` in ru and pl with the **suit in a fixed form** (ru genitive plural: «туз пик»; pl indeclinable: «as pik»), and `{{suit}} {{rank}}` in tr with the **rank in the possessive form** («maça ası»). This only works if `a11y.suit.*` and `a11y.rank.*` are used nowhere but inside `a11y.card`. In `en.json` that looks true (foundation piles have their own keys). `en.context.json` did not exist when I read the repo: please confirm. | `a11y.rank.*`, `a11y.suit.*`, `a11y.card` |
| X3 | **Past-tense verbs carry the player's gender** in ru and pl («ты выиграл/выиграла», «wygrałeś/wygrałaś»). Rule: never address the player with a past-tense verb; use nouns or impersonal forms («Победа!», «Wygrana!»). | `game.newGameAlert.messageWon` and any future "you won/lost" string |
| X4 | "stock" and "deck" are the same everyday word in all three languages (колода / talia / deste). The glossary's "one word per thing" cannot be met with natural words. My pick: the stock gets the everyday word (it is what every app calls that pile), and "deck" (store text only) is written as "deck of 52 cards" or simply "52 cards". | rows `deck`, `stock` |
| X5 | "{{count}} left" (passes): use a form that needs no agreement with the number: ru «Осталось: {{count}}», pl «Zostało: {{count}}», tr «{{count}} kaldı». All plural forms then carry the same text (legal: the test checks the set of forms, not that they differ). | `game.recyclesLeft_*`, `a11y.stockRecycleLeft_*` |
| X6 | "Auto Up": I recommend translating it in all three (nobody knows the English name), marked «draft» because the orchestrator decides keep/translate across languages. | row `Auto Up` |
| X7 | Vegas and store policy: gambling advertising is restricted in Poland and Turkey, and both stores rate simulated gambling. Keep casino vocabulary (казино, ставки / kasyno, hazard, zakłady / kumar, bahis, casino) **out of the store text**; describe Vegas as a scoring mode. In the app, "Vegas" and `$` stay. | store files |

---

## Russian (`ru`)

### 1. Rules section (paste into the glossary)

- **Register: вы, lowercase, and as little direct address as possible.** Buttons and menu entries are infinitives or nouns («Отменить», «Поделиться», «Новая игра»), never «Отмените». Sentences that address the player use вы-imperatives («Перетащите кнопку…», «Сыграйте…»). Evidence: Microsoft Solitaire Collection, MobilityWare, Easybrain («Пасьянс Косынка») and Brainium all write вы in their Russian store text («Присоединяйтесь», «Выбирайте», «Используйте подсказки»); only FRVR uses ты. Russian system UI (iOS, Android, Windows) uses вы and infinitive buttons. «Вы» is never capitalised.
- **Never a past-tense verb about the player** (it shows gender: «выиграл/выиграла»). "Nice win!" becomes «Победа!» or «Отличная игра!».
- **Name of the game:** the genre is **«пасьянс»**; the variant Soli plays is **«Косынка»** (the name every Russian speaker knows from Windows). «Клондайк» is understood as the second name of the same game («Косынка, или Клондайк»: Wikipedia; «Косынка (также известная как Клондайк)»: MobilityWare) and belongs in store text and keywords only. «Солитер» is a search word only (it also means tapeworm and, as «солитёр», a peg game or a diamond): never in the app. In running text the name is quoted and declined: «Сыграйте в „Косынку“» inside a quote, «сыграйте в «Косынку»» at top level.
- **Orthography:** **ё is always written** (счёт, ещё, четвёрка, подсчёт): it is correct, and VoiceOver/TalkBack pronounce the word right. Sentence case everywhere: only the first word and proper names are capitalised («Новая игра», not «Новая Игра»). No full stop at the end of a label, button or title; full sentences in descriptions and notices end with one.
- **Quotes, dash, ellipsis:** «ёлочки», inner quotes „лапки“. Em dash with a space on each side ( — ), also where English has " — ". The ellipsis is the single character …. No apostrophes.
- **Soli** stays in Latin letters and is not declined («Оценить Soli», «в Soli»). **Vegas** stays in Latin letters in the scoring picker («Vegas»); the store text may explain it once as «режим „Вегас“».
- **`$`:** stays before the number as in English (`$52`, `-$52`): it is casino notation, not a Russian price. Spoken form (screen reader): «{{count}} доллар / доллара / долларов», negative «минус {{count}} …».
- **Plural forms (CLDR, checked by jest):** one, few, many, other. `one` = 1, 21, 31 … (not 11); `few` = 2–4, 22–24 … (not 12–14); `many` = 0, 5–20, 25–30 …; `other` = fractions (never shown, but the key must exist: give it the genitive singular, same as `few`).

  | | one (1, 21) | few (2–4) | many (5–20, 0) | other |
  |---|---|---|---|---|
  | move | {{count}} ход | {{count}} хода | {{count}} ходов | {{count}} хода |
  | card | {{count}} карта | {{count}} карты | {{count}} карт | {{count}} карты |
  | game | {{count}} игра | {{count}} игры | {{count}} игр | {{count}} игры |
  | hour / minute / second | час / минута / секунда | часа / минуты / секунды | часов / минут / секунд | часа / минуты / секунды |
  | dollar | доллар | доллара | долларов | доллара |

  "{{count}} left": «Осталось: {{count}}» in every form (no agreement needed).
- **Card names:** `{{rank}} {{suit}}`, rank in the nominative, suit in the genitive plural: «туз пик», «дама червей», «десятка бубен», «король треф». So `a11y.suit.*` = «треф», «бубен», «червей», «пик», and `a11y.rank.*` = Туз, Двойка, Тройка, Четвёрка, Пятёрка, Шестёрка, Семёрка, Восьмёрка, Девятка, Десятка, Валет, Дама, Король. **`{{card}}` only ever stands in the nominative:** «Подсказка: {{card}} — в столбец {{column}}.», «Отбой: {{card}}», never «переложите {{card}}» (it would need «туза», «даму»).
- **Short labels (tight):** Новая игра · Подсказка · Отменить · Взять · Счёт · Ходы · Время · Итого · Выкл. «Отменить» (8 letters) is the longest against English; there is no shorter correct word («Отмена» is Cancel, «Назад» reads as navigation).

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| Солитер / Солитёр (in the app and in visible store text) | Tapeworm; also another game. Search keyword only | пасьянс, Косынка |
| Отмена for Undo; Отменить for Cancel | Undo and Cancel must differ on screen | Undo = Отменить, Cancel = Отмена |
| сброс for the waste pile | Collides with «Сбросить» (Reset) | отбой |
| казино, ставки, азарт, выигрыш (money sense) in store text | Gambling wording: store rating and policy risk, and not what Vegas mode is | «подсчёт очков Vegas» |
| бесплатно, бесплатный, даром (iOS name/subtitle, Play title) | Price words (add to `PRICE_WORDS` in the store test) | description only |
| лучший, №1, топ | Store policy; tone | describe the feature |
| Игра окончена, Вы проиграли, Ходов нет (for the useful-moves notice) | Stronger than English | «Полезных ходов больше нет» |
| ты / Вы (capitalised) | Register rule | вы |

### 2. Term table

| EN (canonical) | ru | Flag | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | Latin, not declined |
| Solitaire | пасьянс | | The genre word. Store name idea (≤30): «Soli: пасьянс Косынка» |
| Klondike | Косынка | | Everyday name of Klondike (Wikipedia, Easybrain, MobilityWare, FRVR). «Клондайк» is understood as its second name: store text and keywords only. In the app "Klondike" = «Косынка» |
| Patience | пасьянс | | Same word (from French *patience*); nothing separate to say |
| **Cards** | | | |
| card | карта | | |
| deck | колода (в store text: «колода из 52 карт») | | Same word as stock, see X4 |
| suit | масть | | |
| hearts | черви (gen. pl. «червей») | | «червы» is the equally correct variant (Easybrain uses it); pick one: черви |
| diamonds | бубны (gen. pl. «бубен») | | |
| clubs | трефы (gen. pl. «треф») | | «крести» is colloquial (Easybrain); the dictionary name is трефы |
| spades | пики (gen. pl. «пик») | | |
| rank | достоинство | | Rarely shown |
| Ace | туз | | |
| Jack | валет | | |
| Queen | дама | | |
| King | король | | |
| Two … Ten | двойка, тройка, четвёрка, пятёрка, шестёрка, семёрка, восьмёрка, девятка, десятка | | Card nouns, not numerals |
| Ace of Spades | туз пик: `{{rank}} {{suit}}` | | Suit strings hold the genitive plural (X2); `{{card}}` only in the nominative (X1) |
| face up / face down | открытая карта / закрытая карта | | Wikipedia: «карты в столбцах закрыты», FRVR: «закрытые карты». "Face-down card" = «Закрытая карта» |
| **Board** | | | |
| stock | колода | | Wikipedia, FRVR, Easybrain all call this pile «колода». KDE's «остаток колоды» is too long |
| waste | отбой | «draft» | FRVR: «Отбой: сюда попадают карты, взятые из колоды». Alternative «сброс» (common in apps, but collides with Reset = «Сбросить»); KDE «открытый остаток» is too long |
| foundation | дом (pl. дома); «Дом треф», «Дом бубен», «Дом червей», «Дом пик» | «draft» | Wikipedia: «базовые стопки, или „дома“»; FRVR: «дома». Alternative «база» (Easybrain: «на базы»; KDE: «базовые стопки») |
| tableau | игровое поле | | Easybrain, FRVR |
| column | столбец («столбец {{column}}») | | Wikipedia, FRVR, Easybrain. Not «колонка» |
| pass (recycle) | проход (по колоде); action: «Вернуть отбой в колоду» | «draft» | No fixed term in the sources. Alternative «пересдача» (KDE uses it for redeal) |
| deal (noun) | раздача | | Easybrain: «закрыть раздачу»; Brainium: «выигрышные раздачи». Alternative «расклад» sounds like fortune-telling |
| **Actions** | | | |
| Draw (verb) | Взять | | Brainium: «Возьми 1». Infinitive per register rule; 5 letters, fits the caption |
| Draw 1 … Draw 5 | Сдача по {{number}} | «draft» | One form for every number (no noun to agree). FRVR: «при сдаче по одной». Alternative «По {{number}} за раз» |
| New Game | Новая игра | | |
| Deal Again | Раздать снова | | |
| Retry | Переиграть | | "Retry this deal?" = «Переиграть эту раздачу?» |
| Share | Поделиться | | Platform word |
| move (noun) | ход; HUD «Ходы» | | Plural table in the rules |
| Undo | Отменить | | Platform word; Easybrain: «Нажмите Отменить»; KDE: «кнопкой Отменить» |
| time travel | путешествие во времени | | Tip: «…чтобы перемещаться во времени по своей игре» |
| Auto Up | Автоперенос в дома | «draft» | Translate (X6). Alternative: keep «Auto Up». Not «Автозавершение» (that is the end-of-game autocomplete in other apps) |
| **Hints and warnings** | | | |
| Hint | Подсказка | | Easybrain, MobilityWare, Brainium |
| Warnings | Предупреждения | | |
| useful move | полезный ход («Полезных ходов больше нет») | | |
| winnable / unwinnable | можно выиграть / уже не выиграть; option «Игру уже не выиграть» | «draft» | Alternative adjective pair «выигрышная / безвыигрышная» is stiff; KDE's «неразрешима» is technical |
| Solvable deals | Решаемые раздачи; History label «Решаемая» | «draft» | Alternative «Выигрышные раздачи» (Brainium uses it for "winning deals") |
| **Scoring and statistics** | | | |
| Scoring | Подсчёт очков | | Brainium: «режим подсчёта очков» |
| Standard | Стандартный | | Agrees with «подсчёт» |
| Vegas | Vegas | | Latin; add to the identical-to-English allow-list. Store text may say «Вегас» once |
| Score | Счёт | | Tight |
| Total | Итого | | "Keep Vegas total" = «Сохранять итог Vegas» |
| Time | Время | | "Game timer" = «Таймер игры» |
| Move counter | Счётчик ходов | | |
| Statistics | Статистика | | |
| **App** | | | |
| Play | Играть | | |
| History | История; title «История игр» | | |
| Games | Игры | | Stat label |
| Solved | Выиграно | «draft» | Neuter, works as a stat and as a status. Alternative «Решено» (pairs with «Решаемая») or the idiom «Сошёлся» (пасьянс сошёлся) |
| Incomplete | Не завершено | | |
| Active | Текущая | «draft» | Alternative «Идёт» |
| Settings | Настройки | | Platform word |
| Gameplay / New Games | Игра / Новые игры | «draft» | «Игровой процесс» is the literal "Gameplay" but long and bureaucratic |
| Off | Выкл. | | Platform word, with the full stop |
| Cancel | Отмена | | Android's word; iOS itself says «Отменить», which Soli cannot use because Undo is «Отменить» |
| Reset | Сбросить | | Platform word |
| win / celebration | победа / анимация победы | | |
| Rate Soli | Оценить Soli | | |
| open source | с открытым исходным кодом | | «открытый исходный код» as a noun |
| ads / no ads | реклама / без рекламы | | |
| free | бесплатно, бесплатный | | Description only |

### 3. Store / ASO keywords

| Keyword | Why / source |
|---|---|
| пасьянс | The genre word; in every top listing (Easybrain title «Пасьянс Косынка», Brainium «Пасьянс: Классическая карточная игра») |
| косынка | The name people know and type; Easybrain's app title; Wikipedia article title |
| клондайк | Second name, used as a keyword by MobilityWare («Пасьянс Клондайк») and Brainium |
| солитер | Phonetic "solitaire"; Easybrain and MobilityWare stuff it into their descriptions. Keyword field only |
| solitaire | Latin spelling is searched too (Microsoft and MobilityWare keep the Latin title) |
| карты, карточная игра | "card game" queries (MobilityWare, Brainium) |
| пасьянсы | Plural form; Russian is not stemmed reliably by store search |
| классический | «классический пасьянс» (Easybrain, Brainium) |
| без рекламы | Soli's main difference. Fine in the iOS subtitle and keywords; not in the Play title |
| без интернета, офлайн | Frequent qualifier («Пасьянс Косынка без интернета» is an App Store title in the search results) |
| головоломка, логика | Category words (MobilityWare, Brainium) |

Traps: no «бесплатно» in the iOS name/subtitle or Play title; no «Microsoft», «Windows» or other brand names; no «паук», «свободная ячейка» (other games, Soli does not have them: misleading keywords); no casino words (X7).

### 4. Sources

- [Wikipedia: Косынка (пасьянс)](https://ru.wikipedia.org/wiki/Косынка_(пасьянс)): «Косынка, или Клондайк»; «базовые стопки (дома)»; «семь столбцов»; «колода»; cards «закрыты / открытыми». Decided the game name, column, face-down, foundation candidates.
- [FRVR Solitaire, Russian rules page](https://frvr.com/ru/play/solitaire/): «Косынка (Клондайк)», «колода», «отбой», «дома», «семь столбцов», «закрытые карты», «ходы», «при сдаче по одной»; the only source using ты.
- [Easybrain «Пасьянс Косынка», Google Play ru](https://play.google.com/store/apps/details?id=com.easybrain.solitaire.klondike.free&hl=ru&gl=RU): title, «базы», «колода», «игровое поле», «Подсказки и отмены», «Нажмите Отменить», «раздача», suits «червы, пики, бубны и крести», вы register, «Солитер» as keyword.
- [MobilityWare Solitaire, Google Play ru](https://play.google.com/store/apps/details?id=com.mobilityware.solitaire&hl=ru&gl=RU): «Косынка (также известная как Клондайк)», «Пасьянс Клондайк с выдачей 1 карты / 3 карт», «подсказки», «статистика», вы.
- [Brainium Solitaire, Google Play ru](https://play.google.com/store/apps/details?id=com.brainium.solitairefree&hl=ru&gl=RU): «Возьми 1 / Возьми 3», «режим подсчёта очков в Вегасе», «подсказки и отмены ходов», «выигрышные раздачи», «статистика», вы.
- [Microsoft Solitaire Collection, Google Play ru](https://play.google.com/store/apps/details?id=com.microsoft.microsoftsolitairecollection&hl=ru&gl=RU): вы register; mode names left in English, so no term evidence.
- [KDE KPatience handbook, Russian](https://docs.kde.org/trunk_kf6/ru/kpat/kpat/rules-specific.html): «Косынка», «остаток колоды», «открытый остаток», «базовые стопки / на базу», «игровые стопки», «Отменить», «неразрешима». Reference terms; mostly too long for an app.
- Platform verbs (Отменить, Отмена, Поделиться, Настройки, Сбросить, Выкл.): my knowledge of the Russian iOS/Android UI, not fetched today. Microsoft's style guides per language: [learn.microsoft.com/globalization/reference/microsoft-style-guides](https://learn.microsoft.com/globalization/reference/microsoft-style-guides).
- Plural categories: [CLDR language plural rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html) (ru: one, few, many, other).

### 5. Open doubts

| # | Doubt | My pick | Alternative |
|---|---|---|---|
| ru-1 | Foundation word | дом | база (as common in apps) |
| ru-2 | Waste word | отбой (no clash with Reset) | сброс (more common in apps) |
| ru-3 | ё | always write it (screen readers) | Microsoft's Russian style avoids ё; a reviewer may prefer е |
| ru-4 | "Draw N" mode name | Сдача по {{number}} | По {{number}} за раз |
| ru-5 | Solved / Solvable pairing | Выиграно / Решаемая | Решено / Решаемая |
| ru-6 | The hint sentence with a dash («{{card}} — в столбец {{column}}») reads slightly telegraphic when spoken | accept (X1) | add per-case card keys in code (bigger change) |
| ru-7 | Could not see Microsoft Solitaire Collection's Russian in-app words for the piles | — | check on a device if someone has it |

---

## Polish (`pl`)

### 1. Rules section (paste into the glossary)

- **Register: ty** (second person singular), written lowercase («twój», «ci»), also in store text. Buttons are singular imperatives («Cofnij», «Udostępnij», «Graj»), which is also what Polish iOS and Android do. Evidence: every Polish listing I read uses ty: Microsoft Solitaire Collection («Dołącz», «Wybierz poziom trudności», «Zaloguj się»), MobilityWare («Graj», «Wybierz»), Easybrain («Musisz umieścić…», «Cofnij ruch»), Brainium («Zagraj», «Graj po swojemu»), FRVR («Znasz zasady»). No game uses Pan/Pani.
- **Never a past-tense verb about the player** (gender: «wygrałeś/wygrałaś»). "Nice win!" becomes «Brawo, wygrana!» or «Ładna wygrana!».
- **Name of the game:** **«pasjans»** is the genre and, alone, also what Poles call this game (Windows shipped Klondike as «Pasjans»; Wikipedia: «Pasjans (ang. Solitaire) – komputerowa wersja pasjansa Klondike»). **«Klondike»** is understood by players as the variant's name («pasjans Klondike»: FRVR, MobilityWare, KDE) and stays in Latin spelling, undeclined. «Solitaire» is a search word only. Lowercase in running text («zagraj w pasjansa»), capital only at the start of a label or in the store name.
- **Orthography:** Polish diacritics always (ą ć ę ł ń ó ś ź ż), sentence case («Nowa gra»), no full stop at the end of labels, buttons and titles.
- **Quotes, dash, ellipsis:** „…” (inner «…»). En dash with spaces ( – ) where English has " — ". The ellipsis is the single character …. No apostrophes («Soli», never «Soli'ego»).
- **Soli** is not declined: build the sentence so it stays in the nominative or after a noun («w aplikacji Soli», «Oceń Soli»). **Vegas** stays «Vegas».
- **`$`:** stays as in English (`$52`). Spoken: «{{count}} dolar / dolary / dolarów», negative «minus {{count}} …».
- **Plural forms (CLDR, checked by jest):** one, few, many, other. `one` = exactly 1 (21 is `many` in Polish, unlike Russian); `few` = 2–4, 22–24 … (not 12–14); `many` = 0, 5–21, 25–31 …; `other` = fractions (key must exist: genitive singular).

  | | one (1) | few (2–4) | many (5–21, 0) | other |
  |---|---|---|---|---|
  | move | {{count}} ruch | {{count}} ruchy | {{count}} ruchów | {{count}} ruchu |
  | card | {{count}} karta | {{count}} karty | {{count}} kart | {{count}} karty |
  | game | {{count}} gra | {{count}} gry | {{count}} gier | {{count}} gry |
  | hour / minute / second | godzina / minuta / sekunda | godziny / minuty / sekundy | godzin / minut / sekund | godziny / minuty / sekundy |
  | dollar | dolar | dolary | dolarów | dolara |

  "{{count}} left": «Zostało: {{count}}» in every form.
- **Card names:** `{{rank}} {{suit}}`, suit undeclined: «as pik», «dama kier», «dziesiątka trefl», «król karo». `a11y.suit.*` = trefl, karo, kier, pik; `a11y.rank.*` = As, Dwójka, Trójka, Czwórka, Piątka, Szóstka, Siódemka, Ósemka, Dziewiątka, Dziesiątka, Walet, Dama, Król. **`{{card}}` only in the nominative:** «Podpowiedź: {{card}} – na kolumnę {{column}}.», never «przenieś {{card}}» (it would need «asa», «damę»).
- **Short labels (tight):** Nowa gra · Podpowiedź · Cofnij · Dobierz · Wynik · Ruchy · Czas · Suma · Wył.

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| Solitaire (in the app) | Not the Polish name; keyword only | pasjans |
| Pan / Pani / Państwo | Register rule | ty forms |
| Ty, Twój, Ci (capitalised) | Letter style; Soli's UI is calm lowercase | ty, twój, ci |
| figura for "rank" | «figury» are only J, Q, K | wartość |
| kasyno, hazard, zakłady, wygrana pieniężna in store text | Gambling wording (Polish gambling-advertising rules, store rating) | «punktacja Vegas» |
| darmowy, darmowa, za darmo, bezpłatny, gratis (iOS name/subtitle, Play title) | Price words (add to `PRICE_WORDS`) | description only |
| najlepszy, nr 1, top | Store policy; tone | describe the feature |
| Koniec gry, Przegrałeś, Brak ruchów (for the useful-moves notice) | Stronger than English | «Brak przydatnych ruchów» |

### 2. Term table

| EN (canonical) | pl | Flag | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | Not declined |
| Solitaire | pasjans | | Store name idea (≤30): «Soli: Pasjans Klondike» |
| Klondike | Klondike («pasjans Klondike») | | Understood by players (FRVR, MobilityWare, KDE, Wikipedia). In app sentences "a game of Klondike" = «pasjans» or «pasjans Klondike». Add to the identical-to-English allow-list |
| Patience | pasjans | | Same word (from French *patience*) |
| **Cards** | | | |
| card | karta | | |
| deck | talia («talia 52 kart») | | Stock is «talia rezerwowa», see X4 |
| suit | kolor | | The card term (Easybrain: «karty z 4 kolorów – kier, pik, karo i trefl»). Red/black is then «czerwone / czarne», not «kolor» |
| hearts | kier | | As a category «kiery» |
| diamonds | karo | | |
| clubs | trefl | | As a category «trefle» |
| spades | pik | | As a category «piki» |
| rank | wartość | | Not «figura» |
| Ace | as | | |
| Jack | walet | | |
| Queen | dama | | |
| King | król | | |
| Two … Ten | dwójka, trójka, czwórka, piątka, szóstka, siódemka, ósemka, dziewiątka, dziesiątka | | Card nouns |
| Ace of Spades | as pik: `{{rank}} {{suit}}` | | Suit undeclined; `{{card}}` only in the nominative (X1) |
| face up / face down | odkryta karta / zakryta karta | | FRVR: «zakryte karty»; KDE: «leżą odkryte» |
| **Board** | | | |
| stock | talia rezerwowa | | FRVR: «pozostałe tworzą talię rezerwową», «Kliknięcie talii rezerwowej odkrywa jedną kartę». Easybrain's «zapasy» and KDE's «pula» are rarer |
| waste | stos odrzuconych | «draft» | FRVR: «Stos odrzuconych: nazywany też talonem». Alternative «stos zrzutu» (KDE) |
| foundation | stos bazowy (pl. stosy bazowe); «Stos bazowy trefl / karo / kier / pik» | | FRVR, KDE agree |
| tableau | pole gry | | FRVR: «pole gry złożone z siedmiu kolumn» |
| column | kolumna («kolumna {{column}}») | | FRVR. Easybrain's «rząd» (row) is wrong for a vertical pile |
| pass (recycle) | przejście (przez talię); action: «Przełóż odrzucone karty do talii» | «draft» | No fixed term. KDE: «przeglądać karty w puli dowolną liczbę razy» |
| deal (noun) | rozdanie | | Easybrain: «rozdanie pasjansa»; KDE: «nierozwiązywalne jest jedno rozdanie»; Brainium: «wygrywać rozdania» |
| **Actions** | | | |
| Draw (verb) | Dobierz | | MobilityWare: «Dobierz 1 kartę»; Brainium: «Dobierz-1» |
| Draw 1 … Draw 5 | Dobierz {{number}} | | No noun, so one form for every number |
| New Game | Nowa gra | | |
| Deal Again | Rozdaj ponownie | | |
| Retry | Powtórz | «draft» | "Retry this deal?" = «Powtórzyć to rozdanie?». Alternative «Zagraj ponownie» (longer) |
| Share | Udostępnij | | Platform word |
| move (noun) | ruch; HUD «Ruchy» | | Plural table in the rules |
| Undo | Cofnij | | Platform word; Easybrain: «Cofnij ruch»; KDE: «funkcji Cofnij» |
| time travel | podróż w czasie | | |
| Auto Up | Automatyczne odkładanie | «draft» | Translate (X6); long, it is a settings row, not a tight label. Alternative: keep «Auto Up» |
| **Hints and warnings** | | | |
| Hint | Podpowiedź | «draft» | KDE and Brainium: «podpowiedź»; MobilityWare and Easybrain: «wskazówka» (one letter shorter). Both are fine; pick one |
| Warnings | Ostrzeżenia | | |
| useful move | przydatny ruch («Brak przydatnych ruchów») | | |
| winnable / unwinnable | do wygrania / nie do wygrania; option «Gra nie do wygrania» | | |
| Solvable deals | Rozdania rozwiązywalne; History label «Rozwiązywalne» | «draft» | KDE: «nierozwiązywalne rozdanie». Alternative «Rozdania do wygrania» / «Do wygrania» (plainer, but then the same words as "winnable") |
| **Scoring and statistics** | | | |
| Scoring | Punktacja | | MobilityWare: «standardową punktację»; Brainium: «tryb punktacji Vegas» |
| Standard | Standardowa | | Agrees with «punktacja» |
| Vegas | Vegas | | Allow-list |
| Score | Wynik | | Tight |
| Total | Suma | | "Keep Vegas total" = «Sumuj wynik Vegas». Alternative «Łącznie» |
| Time | Czas | | "Game timer" = «Czas gry» |
| Move counter | Licznik ruchów | | |
| Statistics | Statystyki | | |
| **App** | | | |
| Play | Graj | | |
| History | Historia; title «Historia gier» | | |
| Games | Gry | | |
| Solved | Wygrane (stat) / Wygrana (status) | «draft» | The two forms agree with «gry» / «gra». Alternative «Ułożone / Ułożony» (ułożyć pasjansa = solve it), pairs less well with «gra» |
| Incomplete | Nieukończone (stat) / Nieukończona (status) | | |
| Active | W toku | | No gender, works for both uses |
| Settings | Ustawienia | | Platform word |
| Gameplay / New Games | Rozgrywka / Nowe gry | | |
| Off | Wył. | | Platform word, with the full stop |
| Cancel | Anuluj | | Platform word |
| Reset | Wyzeruj | «draft» | Literally "set to zero", which is exactly what the button does, and iOS uses «Wyzeruj» for Reset. Alternative «Resetuj» (Android) |
| win / celebration | wygrana / animacja wygranej | | |
| Rate Soli | Oceń Soli | | |
| open source | open source (explained once as «otwarty kod źródłowy») | «draft» | Polish tech text uses the English term; a non-technical player understands «otwarty kod źródłowy». Alternative: only the Polish phrase |
| ads / no ads | reklamy / bez reklam | | |
| free | za darmo, bezpłatna | | Description only |

### 3. Store / ASO keywords

| Keyword | Why / source |
|---|---|
| pasjans | The Polish name of the game and the genre; Easybrain's Polish title is just «Pasjans» |
| pasjanse | Plural, searched for collections |
| klondike | Variant name used by FRVR, MobilityWare, Brainium («pasjans Klondike») |
| solitaire | Latin name: Microsoft, MobilityWare and Brainium keep it in the Polish title |
| karty, gra karciana, gry karciane | "card game" queries (MobilityWare: «gra karciana Solitaire») |
| klasyczny | «klasyczny pasjans» (MobilityWare, Easybrain) |
| bez reklam | Soli's main difference; fine in the iOS subtitle/keywords, not in the Play title |
| offline, bez internetu | Frequent qualifier (MobilityWare, Brainium: «online lub offline», «bez Wi-Fi») |
| łamigłówka, gra logiczna | Category words (MobilityWare, Brainium) |
| pasjans za darmo | Common query, but a price phrase: description only, never name/subtitle/title |

Traps: no price words in name/subtitle/title; no brand names; no «pająk», «FreeCell» (games Soli does not have); no gambling words (X7).

### 4. Sources

- [FRVR Solitaire, Polish rules page](https://frvr.com/pl/play/solitaire/): «pasjans Klondike», «talia rezerwowa», «stos odrzuconych (talon)», «stosy bazowe», «pole gry złożone z siedmiu kolumn», «dobieranie 1 karty czy 3 kart», «zakryte karty», ty register.
- [MobilityWare Solitaire, Google Play pl](https://play.google.com/store/apps/details?id=com.mobilityware.solitaire&hl=pl&gl=PL): «Dobierz 1 kartę / Dobierz 3 karty», «wskazówki», «nieograniczone cofanie», «standardową punktację … Vegas», «statystyki», ty.
- [Easybrain «Pasjans», Google Play pl](https://play.google.com/store/apps/details?id=com.easybrain.solitaire.klondike.free&hl=pl&gl=PL): title «Pasjans»; suits «kier, pik, karo i trefl»; «Wskazówki i cofnięcia», «Cofnij ruch», «rozdanie», ty.
- [Brainium Solitaire, Google Play pl](https://play.google.com/store/apps/details?id=com.brainium.solitairefree&hl=pl&gl=PL): «Dobierz-1 / Dobierz-3», «tryb punktacji Vegas», «podpowiedzi i cofanie ruchów», «wygrywać rozdania», «rewersy kart», ty.
- [Microsoft Solitaire Collection, Google Play pl](https://play.google.com/store/apps/details?id=com.microsoft.microsoftsolitairecollection&hl=pl&gl=PL): «tryby gry w pasjansa», ty imperatives; mode names in English.
- [KDE KPatience handbook, Polish](https://docs.kde.org/trunk_kf6/pl/kpat/kpat/rules-specific.html): «Klondike jest najbardziej znanym pasjansem», «pula», «stos zrzutu», «stosy gry», «Podpowiedź», «Cofnij», «nierozwiązywalne rozdanie».
- [Wikipedia: Pasjans (gra komputerowa)](https://pl.wikipedia.org/wiki/Pasjans_(gra_komputerowa)): «Pasjans (ang. Solitaire) – komputerowa wersja pasjansa Klondike»: Windows' game was called just «Pasjans».
- Platform verbs (Cofnij, Anuluj, Udostępnij, Ustawienia, Wyzeruj/Resetuj, Wył.): my knowledge of the Polish iOS/Android UI, not fetched today.
- Plural categories: [CLDR language plural rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html) (pl: one, few, many, other).

### 5. Open doubts

| # | Doubt | My pick | Alternative |
|---|---|---|---|
| pl-1 | Hint word | Podpowiedź | Wskazówka (two of four apps) |
| pl-2 | Capitalised «Twój/Ci» in store text (MobilityWare and Easybrain capitalise) | lowercase everywhere | capitalise in store text only |
| pl-3 | Reset | Wyzeruj | Resetuj |
| pl-4 | Solvable | Rozwiązywalne | Do wygrania |
| pl-5 | "open source" | English term + one Polish explanation | Polish phrase only |
| pl-6 | Waste | stos odrzuconych | stos zrzutu |

---

## Turkish (`tr`)

### 1. Rules section (paste into the glossary)

- **Register: sen** «draft». Buttons are bare imperatives, which is the sen form and also what Turkish iOS and Android use («Paylaş», «Geri Al», «Sıfırla»); sentences continue in sen («…sürükle», «yeni bir oyun başlat»). Evidence is split: MobilityWare, Easybrain and FRVR write sen («Günlük Görevleri çöz», «zihnini çalıştır», «taşıyabilirsin»); Microsoft Solitaire Collection and Brainium write siz («katılın», «oynayın»). Sen matches the buttons and the two most-installed local listings; siz is the safe polite form if Karim prefers distance. Whichever is chosen, **one register in every string**, never mixed.
- **Name of the game: «Solitaire»**, in Latin spelling as in English. Turks know the game under this name from Windows (Turkish Wikipedia: «Solitaire adlı iskambil oyunu»), and every top listing keeps it. **«Klondike»** is known to few players: store text and keywords only («Klondike Solitaire»); in app sentences "a game of Klondike" becomes «Solitaire». «Pasyans» (FRVR), «tek taş» (Easybrain's title: «Solitaire - Tek Taş Kart Oyunu»), «sabır» and «iskambil» are search words, not names to use in the app.
- **Dotted and dotless I (binding):** Turkish has four letters: **İ/i** and **I/ı**. The translator writes every capital in the string itself («İpucu», «İptal», «İstatistikler», «Sıfırla», «Kapalı»). **Code never changes the case of a Turkish string** (`toUpperCase()`, `textTransform: 'uppercase'`, `capitalize`): JavaScript's default turns «i» into «I» and «ı» into «I» («ipucu» becomes «IPUCU» instead of «İPUCU»). If case conversion is ever needed, it must be `toLocaleUpperCase('tr')` / `toLocaleLowerCase('tr')`. Reviewer check: no «I» where «İ» is meant, no «i» where «ı» is meant (kapalı, sıfırla, yığın, açık).
- **Capitalisation:** Title Case on buttons, menu entries and screen/section titles («Yeni Oyun», «Geri Al», «Oyun Geçmişi»), as Turkish iOS does; sentence case in descriptions, notices and screen-reader labels. No full stop at the end of labels.
- **Suffixes:** a suffix on a proper name takes an apostrophe («Soli’yi Değerlendir», «Soli’de»). **Never attach a suffix to a `{{placeholder}}`** (vowel harmony and consonant changes depend on the value): rebuild the sentence so the placeholder stands bare, e.g. with a colon or with a following noun («{{card}} kartını», «{{column}}. sütun»).
- **Ordinals:** number + full stop: «{{column}}. sütun» (= "3rd column"). «Sütun {{column}}» is also understood; pick the first, it is how Turkish reads.
- **Quotes, apostrophe, ellipsis:** “…” double quotes; apostrophe ’ (U+2019); ellipsis … as one character. Where English has " — ", use a comma or a full stop; the spaced dash is not Turkish style.
- **`$`:** stays before the number as in English (`$52`); Turkish would normally write «52 $», but this is casino notation and the glossary keeps it. Spoken: «{{count}} dolar», negative «eksi {{count}} dolar».
- **Plural forms (CLDR, checked by jest):** one, other. **The noun stays singular after a number**, so both forms normally carry the same text:

  | | one | other |
  |---|---|---|
  | move | {{count}} hamle | {{count}} hamle |
  | card | {{count}} kart | {{count}} kart |
  | game | {{count}} oyun | {{count}} oyun |
  | hour / minute / second | {{count}} saat / dakika / saniye | same |
  | dollar | {{count}} dolar | {{count}} dolar |

  Labels without a number are plural where they name a list («Uyarılar», «İstatistikler», «Ayarlar»), singular where they head a counter («Hamle», «Oyun»). "{{count}} left": «{{count}} kaldı».
- **Card names:** `{{suit}} {{rank}}` with the rank in the possessive form: «maça ası», «kupa kızı», «karo papazı», «sinek onlusu». So `a11y.rank.*` = Ası, İkilisi, Üçlüsü, Dörtlüsü, Beşlisi, Altılısı, Yedilisi, Sekizlisi, Dokuzlusu, Onlusu, Valesi, Kızı, Papazı (lowercase inside the pattern if the pattern starts with the suit: «Maça ası»), and `a11y.suit.*` = Sinek, Karo, Kupa, Maça. This needs X2 confirmed (rank strings used only inside the card pattern). **`{{card}}` never gets a suffix:** «İpucu: {{card}} kartını {{column}}. sütuna taşı.»
- **Short labels (tight):** Yeni Oyun · İpucu · Geri Al · Çek · Puan · Hamle · Süre · Toplam · Kapalı

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| a capital «I» for «İ», a small «i» for «ı» (and the reverse) | Different letters; changes or destroys the word | write the right letter; never case-convert in code |
| Tek taş, Pasyans, Sabır as the game's name in the app | Search words; «tek taş» is really peg solitaire or a diamond ring | Solitaire |
| Fırsat for "deal" | A known mistranslation in other apps ("deal" as bargain: MobilityWare «Ödüllü Fırsatlar») | el |
| kumar, bahis, casino, kumarhane in store text | Gambling is tightly restricted in Turkey; store rating | «Vegas puanlaması» |
| ücretsiz, bedava (iOS name/subtitle, Play title) | Price words (add to `PRICE_WORDS`) | description only |
| en iyi, 1 numara, #1 | Store policy; tone | describe the feature |
| Oyun bitti, Kaybettin, Hamle yok (for the useful-moves notice) | Stronger than English | «İşe yarar hamle kalmadı» |
| mixing sen and siz | One register | the chosen one |

### 2. Term table

| EN (canonical) | tr | Flag | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | Suffix with apostrophe: «Soli’yi», «Soli’de» |
| Solitaire | Solitaire | | Latin spelling; add to the identical-to-English allow-list. Store name idea (≤30): «Soli: Solitaire Kart Oyunu» |
| Klondike | Klondike | | Little known; store text/keywords as «Klondike Solitaire». In app sentences use «Solitaire». Allow-list |
| Patience | (not used; if explained: «Sabır» ) | | MobilityWare: «Patience (Sabır) olarak da bilinir». No Turkish name comes from it |
| **Cards** | | | |
| card | kart | | |
| deck | deste («52 kartlık deste») | | Stock is also «deste», see X4 |
| suit | takım | «draft» | FRVR: «dört takımdan birine … kupa, maça, sinek ve karo»; Easybrain: «4 takımın (kupa, maça, karo ve sinek)». Alternative «tür» / «seri»; «takım» also means "team" |
| hearts | kupa | | |
| diamonds | karo | | |
| clubs | sinek | | «ispati» is the old word; sinek is what apps use |
| spades | maça | | |
| rank | değer | «draft» | Alternative «sıra». Rarely shown |
| Ace | as | | Easybrain: «As’tan başlayıp Papaz’a» |
| Jack | vale | | Also «bacak», «oğlan» colloquially |
| Queen | kız | | Also «dam» |
| King | papaz | | Easybrain, search results. «Kral» is also understood; papaz is the card word |
| Two … Ten | ikili, üçlü, dörtlü, beşli, altılı, yedili, sekizli, dokuzlu, onlu | | Card nouns; in the pattern they take the possessive: ikilisi … onlusu |
| Ace of Spades | maça ası: `{{suit}} {{rank}}` | | Rank strings hold the possessive form (X2); no suffix on `{{card}}` (X1) |
| face up / face down | açık kart / kapalı kart | | FRVR: «kapalı kartları açmana»; Easybrain: «kapalı olan … kartlar», «Açık olan kartlar» |
| **Board** | | | |
| stock | deste | | FRVR: «kalan kartlar desteyi oluşturur», «Desteye tıkladığında bir kart açılır» |
| waste | atık yığını | «draft» | FRVR: «Atık yığını: desteden çekilen kartlar buraya gelir». Literal but the only attested term. Alternative «açılan kartlar» |
| foundation | temel yığın (pl. temel yığınlar); «Sinek / Karo / Kupa / Maça temel yığını» | | FRVR: «Temel yığınlar». Easybrain's «Grup» is vague |
| tableau | tablo | «draft» | FRVR: «Tablo: yedi sütundan oluşan oyun alanı»; Easybrain: «Tablo». Alternative «oyun alanı» (plainer) |
| column | sütun («{{column}}. sütun») | | FRVR |
| pass (recycle) | tur (deste turu); action: «Atık yığınını desteye geri çevir» | «draft» | No attested term |
| deal (noun) | el | «draft» | Card-table word for one dealt round (Brainium: «kazanan elleri»). Alternative «dağıtım» (literal, clear, a bit technical). Never «fırsat» |
| **Actions** | | | |
| Draw (verb) | Çek | | MobilityWare: «1 kart çek»; Brainium: «1 Çek» |
| Draw 1 … Draw 5 | {{number}} Kart Çek | | Noun stays singular, one form for every number |
| New Game | Yeni Oyun | | |
| Deal Again | Yeniden Dağıt | | |
| Retry | Yeniden Dene | | "Retry this deal?" = «Bu el yeniden denensin mi?» / «Bu eli yeniden dene?» |
| Share | Paylaş | | Platform word |
| move (noun) | hamle; HUD «Hamle» | | FRVR, Easybrain |
| Undo | Geri Al | | Platform word; Easybrain: «İpuçları ve geri almalar» |
| time travel | zamanda yolculuk | | |
| Auto Up | Otomatik Yerleştir | «draft» | Translate (X6). Alternative: keep «Auto Up». Not «Otomatik tamamlama» (the end-of-game autocomplete in other apps) |
| **Hints and warnings** | | | |
| Hint | İpucu | | Easybrain, Brainium. Capital İ |
| Warnings | Uyarılar | | |
| useful move | işe yarar hamle («İşe yarar hamle kalmadı») | | |
| winnable / unwinnable | kazanılabilir / kazanılamaz; option «Kazanılamaz oyun» | | |
| Solvable deals | Çözülebilir Eller; History label «Çözülebilir» | «draft» | Follows the «el» pick; with the alternative: «Çözülebilir Dağıtımlar» |
| **Scoring and statistics** | | | |
| Scoring | Puanlama | | Brainium: «Vegas Puanlama Modu» |
| Standard | Standart | | |
| Vegas | Vegas | | Allow-list |
| Score | Puan | | Tight |
| Total | Toplam | | "Keep Vegas total" = «Vegas toplamını koru» |
| Time | Süre | | Elapsed time. "Game timer" = «Oyun süresi» |
| Move counter | Hamle sayacı | | |
| Statistics | İstatistikler | | Capital İ |
| **App** | | | |
| Play | Oyna | | |
| History | Geçmiş; title «Oyun Geçmişi» | | Platform word |
| Games | Oyun | | Counter heading: singular |
| Solved | Çözüldü | «draft» | Alternative «Kazanıldı» |
| Incomplete | Tamamlanmadı | | |
| Active | Devam ediyor | | |
| Settings | Ayarlar | | Platform word |
| Gameplay / New Games | Oynanış / Yeni Oyunlar | | Brainium: «Klasik Oynanış» |
| Off | Kapalı | | Platform word; dotless ı |
| Cancel | İptal | «draft» | Android and most apps say «İptal»; iOS system alerts say «Vazgeç». One string serves both platforms: «İptal» is understood everywhere |
| Reset | Sıfırla | | Platform word; literally "set to zero" |
| win / celebration | galibiyet (verb: kazanmak) / kutlama animasyonu | «draft» | Microsoft: «zafer» (too grand for Soli's tone). "Nice win!" = «Güzel oyun!» or «Kazandın!» (no gender in Turkish, so the verb is safe here) |
| Rate Soli | Soli’yi Değerlendir | | Not «puan ver» (collides with Score = Puan) |
| open source | açık kaynak («açık kaynak kodlu») | | |
| ads / no ads | reklam / reklamsız | | MobilityWare: «reklamlarla desteklenir» |
| free | ücretsiz | | Description only. «bedava» is colloquial |

### 3. Store / ASO keywords

| Keyword | Why / source |
|---|---|
| solitaire | The name Turks use; every top listing's title (MobilityWare, Brainium, Easybrain, Microsoft) |
| soliter, solitare | Phonetic and misspelled forms people type |
| klondike | Variant name kept in English by MobilityWare and Brainium |
| kart oyunu, kart oyunları | "card game" (Easybrain title; MobilityWare; App Store TR "Kart" chart) |
| iskambil | Turkish for playing cards (Wikipedia: «Solitaire adlı iskambil oyunu») |
| tek taş | In Easybrain's Turkish title («Solitaire - Tek Taş Kart Oyunu») and body: a real query, even though it is a mistranslation |
| pasyans | FRVR's word («Klondike Pasyans»); minority query |
| sabır | From "Patience (Sabır)" in MobilityWare's text; weak |
| klasik | «klasik Solitaire» (all listings) |
| reklamsız | Soli's main difference; fine in the iOS subtitle/keywords, not in the Play title |
| internetsiz, çevrimdışı | Frequent qualifier (App Store TR chart titles such as «Okey - İnternetsiz»; MobilityWare: «wifi gerekli değil») |
| zeka oyunu, bulmaca | Category words (MobilityWare: «mantık bulmacası», «beyin jimnastiği») |

Traps: no «ücretsiz»/«bedava» in name/subtitle/title; no brand names; no «örümcek», «FreeCell» (games Soli does not have); no gambling words (X7); keywords are written with the right dotted/dotless letters (the stores do not fold ı/i reliably).

### 4. Sources

- [FRVR Solitaire, Turkish rules page](https://frvr.com/tr/play/solitaire/): «Klondike Pasyans», «deste», «atık yığını», «temel yığınlar», «Tablo: yedi sütundan oluşan oyun alanı», «kapalı kartlar», «hamle», suits «kupa, maça, sinek ve karo», «takım», sen register.
- [Easybrain «Solitaire - Tek Taş Kart Oyunu», Google Play tr](https://play.google.com/store/apps/details?id=com.easybrain.solitaire.klondike.free&hl=tr&gl=TR): title; «İpuçları ve geri almalar», «hamle», «As’tan … Papaz’a», «takım», «Tablo», «kapalı / açık kartlar», «Otomatik tamamlama», sen.
- [MobilityWare Solitaire, Google Play tr](https://play.google.com/store/apps/details?id=com.mobilityware.solitaire&hl=tr&gl=TR): «Klondike Solitaire 1 kart çek / 3 kart çek», «Klondike veya Patience (Sabır) olarak da bilinir», «istatistik», «reklamlarla desteklenir», sen; «Fırsatlar» for deals (mistranslation to avoid).
- [Brainium Solitaire, Google Play tr](https://play.google.com/store/apps/details?id=com.brainium.solitairefree&hl=tr&gl=TR): «1 Çek / 3 Çek», «Vegas Puanlama Modu», «ipucu ve geri alma», «kazanan elleri», «Oynanış», siz.
- [Microsoft Solitaire Collection, Google Play tr](https://play.google.com/store/apps/details?id=com.microsoft.microsoftsolitairecollection&hl=tr&gl=TR): siz register («katılın», «seçin»); mode names in English.
- Turkish Wikipedia, article "Windows 3.0" (found through the search API): «Solitaire adlı iskambil oyunu eklendi»: the game is called Solitaire in Turkish; there is no Turkish Klondike article.
- [App Store Turkey, card games chart](https://apps.apple.com/tr/iphone/charts/7005) and the Turkish pages of Solitaire apps in the search results: titles stay «Solitaire».
- [Microsoft Turkish style guide (PDF)](https://download.microsoft.com/download/c/7/e/c7e1f405-1a5a-418d-a56d-3a8c183cabd9/tur-tur-StyleGuide.pdf): found, not read in full; reference for the reviewer on register and capitalisation.
- Platform verbs (Geri Al, İptal/Vazgeç, Paylaş, Ayarlar, Sıfırla, Kapalı, Geçmiş) and the Title Case convention: my knowledge of the Turkish iOS/Android UI, not fetched today.
- Plural categories: [CLDR language plural rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html) (tr: one, other).

### 5. Open doubts

| # | Doubt | My pick | Alternative |
|---|---|---|---|
| tr-1 | Register | sen (matches buttons, MobilityWare, Easybrain, FRVR) | siz (Microsoft, Brainium, system UI sentences; safer with older players) |
| tr-2 | Deal | el | dağıtım |
| tr-3 | Cancel | İptal | Vazgeç (iOS system word) |
| tr-4 | Suit as a category | takım | tür / seri |
| tr-5 | Card-name pattern with possessive rank strings («maça ası») depends on X2 | possessive forms | fallback «Maça As», «Kupa 2»-style bare forms: understood, but not how a Turk says it |
| tr-6 | Title Case on buttons | yes (iOS convention) | sentence case (Android's Turkish is mixed) |
| tr-7 | Waste and tableau words are literal translations attested in one or two apps | atık yığını, tablo | açılan kartlar, oyun alanı |
| tr-8 | A native reviewer should read the whole Turkish file: fewer solid references exist than for ru and pl | — | — |
