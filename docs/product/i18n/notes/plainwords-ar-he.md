# Plain-words check: Arabic (`ar`) and Hebrew (`he`)

2026-11-24 plain-words check. Lens: the German rule "Plain words before patience jargon" — a native speaker who plays casual mobile games but knows no patience / card-game vocabulary reads every in-app string and the store text. Scope: `src/i18n/locales/{ar,he}.json`, `store/ios/{ar-SA,he}`, `store/android/{ar,iw-IL}`, `store/release-notes/{ar,he}.txt`, the ar / he glossary cells.

Checks: `yarn jest test/unit/i18n test/unit/store` : 4 suites, 143 tests pass. No raw direction marks (`grep -c $'‎'` = 0 in both locale files).

## Arabic: changed

| Where | Before | After | Why |
|---|---|---|---|
| `a11y.stock*`, `a11y.stockEmpty`, `a11y.stockExhausted`, `a11y.stockRecycle*`, `a11y.hint.draw` | المخزون | كومة السحب («كومة السحب، فارغة»; hint: «سحب ورقة من كومة السحب») | «المخزون» is the warehouse / inventory word (the Hebrew section already forbids its twin «מלאי» for that reason). "Draw pile" explains itself and matches the action word «سحب». FRVR's Arabic rules also use «كومة السحب» |
| `a11y.waste`, `a11y.stockRecycle*` | المهملات | الكومة المكشوفة | «المهملات» is rubbish / the trash folder. «إعادة المهملات إلى المخزون» read as "return the rubbish to the inventory" |
| `settings.autoUp`, store description | رفع تلقائي / الرفع التلقائي | نقل تلقائي للأوراق | «رفع» on a phone is "upload": a settings switch «رفع تلقائي» reads as "auto upload". «نقل» is also the word the hints use for moving a card |
| `settings.scoring.standard`, `settings.scoring.description`, store description, release notes | قياسي / نقاط قياسية | عادي / نقاط عادية | «قياسي» next to points is "record" («رقم قياسي»): «نقاط قياسية» = record-breaking points |
| `settings.cardsDrawn` | الأوراق المسحوبة | عدد الأوراق المسحوبة | Alone it reads "the cards (already) drawn"; the row is a number picker |
| `game.playDeal.sharedTitle` | لعب التوزيعة التي تمت مشاركتها؟ | لعب التوزيعة التي وصلتك؟ | «تمت مشاركتها» is translationese (تمّ + masdar) |
| store description (iOS + Play) | إلى الأساسات | إلى كومات الأساس | Bare «الأساسات» means building foundations; with «كومات» it is visibly a pile. The screen-reader names («أساس القلوب») stay |
| `store/release-notes/ar.txt` first line | Soli 1.2 يتحدث لغتك! | تطبيق Soli 1.2 يتحدث لغتك! | Not a plain-words issue: glossary bidi rule 3 (no line starts with "Soli") |

## Arabic: checked and kept

- «توزيعة» (deal): the normal word from everyday card games (طرنيب, بلوت); means the dealt hand, not the deck, so it does not have the «Blatt» problem.
- «سحب», «تراجع», «تلميح», «مشاركة», «إلغاء», «إعادة تعيين», «إيقاف»: platform words. Verbal nouns on buttons are what Arabic iOS / Android and the Arabic solitaire listings show; imperatives appear in marketing text only.
- «ولد», «السباتي / الديناري / القلوب / البستوني»: the names people say at the table.
- «دورة» (pass), «محلولة», «قابلة للحل», «حيل تحفيزية» (gamification), «سلاسل أيام» (streaks): understandable without game vocabulary.
- «اسحب زر التراجع»: drag and Draw share «سحب»; the object makes it clear.

## Hebrew: changed

| Where | Before | After | Why |
|---|---|---|---|
| `settings.autoUp`, store description | העלאה אוטומטית | העברת קלפים אוטומטית (store: «העברת קלפים אוטומטית לערימות היסוד, בשבילך») | «העלאה» on a phone is "upload". «העברה» is the word the hints use for moving a card |
| `about.promise` | ללא גיימיפיקציה שנועדה… | ללא תכסיסים שנועדו… | Tech-crowd loanword; the store text already says «תכסיסים». (German kept «Gamification» on Karim's word; he cannot judge the Hebrew, see "Unsure") |
| `history.emptyBody`, `share.dealMessage` | משחק קלונדייק / חלוקת הקלונדייק הזאת | משחק סוליטר קלונדייק / חלוקת סוליטר קלונדייק הזאת | «קלונדייק» alone is not a game name most people know; same rule the Arabic section has |
| `store/release-notes/he.txt` first line | Soli 1.2 מדבר בשפה שלך! | האפליקציה Soli 1.2 מדברת בשפה שלך! | Bidi rule 2 (no line starts with "Soli") |

## Hebrew: checked and kept

- «קופה» (stock): what Israelis call the draw pile in every family card game (טאקי, רמי, יניב: «לקחת מהקופה»).
- «חלוקה» (deal), «משיכה» / «משיכת 3», «טור», «סבב», «ערימת יסוד», «נסיך», «עלה / תלתן / יהלום / לב», «רצפים» (streaks, as in Duolingo's Hebrew UI).
- Verbal nouns on buttons («ביטול», «שיתוף», «איפוס»): the iOS / Android Hebrew convention and gender-neutral; imperatives would address men only.

## Unsure

1. he waste «ערימת הפסולת»: «פסולת» is refuse, but he.wikipedia uses exactly this and «ערימת» makes it a pile. Screen reader only. Alternative «הערימה הגלויה» (the Arabic now uses the same idea). Kept.
2. he «חלוקה» / ar «توزيعة» as the name of one game in History («חלוקה 2345-6789») and in the subtitle («כל חלוקה פתירה», «لكل توزيعة حل»): correct and understood, but a touch technical; German went to «Spiel». «משחק» / «لعبة» would collide with "game" in the same sentences, so kept.
3. he «גיימיפיקציה» → «תכסיסים»: Karim found the loanword fine in German; revert if he wants the same in Hebrew.
4. ar «الكومة المكشوفة» and «كومة السحب» are descriptive picks, not taken from a market-leading Arabic app: Microsoft Solitaire and the other big apps have no Arabic UI to compare with (research R6). A native-speaker glance would be good.
5. ar `settings.scoring.standard` «عادي»: Apple's system word for Standard is «قياسي»; changed only because of the collision with "record points".

## Web check

- Search "سوليتير كلوندايك … كومة السحب" (2026-11-23): Arabic rule pages (FRVR, Yandex Games) describe the piles as «كومة السحب / المخزون», «كومة المهملات», «كومات الأساس», «منطقة اللعب». Supports «كومة السحب» and «كومات الأساس»; «كومة المهملات» exists but is the literal translation.
- Search "סוליטר … קופה ערימת …": Hebrew results are mostly translated pages («ערימת המלאי», «ערימת הפסולת», «ערימות היסוד», «טבלאו»); no native Hebrew app UI found. «ערימות היסוד» confirmed as the common wording.
