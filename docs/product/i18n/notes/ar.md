# Translator notes: Arabic (`ar`)

Written 2026-11-23 by the `ar` translator (whole file + store text).

## Files written

- `src/i18n/locales/ar.json`: 179 keys (134 base keys, same order as `en.json`; the 9 plural keys carry zero / one / two / few / many / other)
- `store/ios/ar-SA/`: name (23/30), subtitle (27/30), keywords (100/100), promotional_text (126/170), description (717/4000)
- `store/android/ar/`: title (23/30), short_description (54/80), full_description (717/4000)
- `store/release-notes/ar.txt` (168/500)

Checks: `yarn jest test/unit/i18n test/unit/store` passes (68 tests). `ar` is not registered in `src/i18n/index.ts` yet, so the locale tests did not cover it; a node self-check confirmed key parity and order, placeholders, the six plural suffixes on every plural key, no empty value, no value identical to English, no raw direction character (the two marks are written as `‎`), no Eastern Arabic digits. Nothing to add to `UNTRANSLATED_OK`.

## Uncertain terms

| Key | English | Choice | Alternative | Why |
|---|---|---|---|---|
| `notice.undoTip`, store description | drag (the Undo button) | «اسحب» | «حرّك … جانبًا», «مرّر» | «سحب» is the platform word for drag, but it is also the glossary word for Draw. The object («زر التراجع») makes it unambiguous; a glossary row "drag" would settle it |
| `notice.undoTip` | Tip: | «نصيحة:» | no label | Must differ from Hint («تلميح») |
| `notice.unwinnable` | No winning moves left | «لم تبق حركات تؤدي إلى الفوز» | «لا يمكن الفوز بهذه اللعبة» (glossary wording for unwinnable) | Stays close to the English "moves" wording and clearly differs from `notice.stuck`; second clause is «يمكنك التراجع أو بدء لعبة جديدة» (gender-identical, no imperative) |
| `notice.noHint` | No hint found. | «لا يوجد تلميح حاليًا.» | «لم يعثر على تلميح.» | The passive is misread as active without vowel marks; the context says "not available right now" |
| `settings.warnings.noUsefulMoves` | No more useful moves | «لا حركات مفيدة» (14) | «لا مزيد من الحركات المفيدة» (26, glossary phrase, used in `notice.stuck`) | Tight picker option, the widest one; the full phrase is 1.3× English. Not a stronger claim |
| `hud.vegasSpokenNegative_*` | minus | «ناقص» (two: «ناقص دولارين») | «سالب» | «ناقص» is what is said aloud for amounts; the dual is in the genitive after it. Reviewer please confirm |
| `about.sourceLink` | Source code | «الشيفرة المصدرية» | «الكود المصدري», «المصدر البرمجي» | No glossary row. "GitHub" is a second Latin word besides Soli (unavoidable brand) |
| `about.promise` | gamification | «حيل تحفيزية» | «تلعيب» | «تلعيب» is jargon few readers know; the paraphrase says what is meant |
| `about.madeBy` | Made by | «من تطوير» | «من إعداد», «المطوّر:» | Reads naturally before the Latin handle |
| `game.playDeal.sharedTitle` | shared deal | «التوزيعة التي تمت مشاركتها» | «التوزيعة المشتركة» | «المشتركة» reads as "joint / common" |
| `game.newGameAlert.message` | Ready for another round? | «ما رأيك في جولة أخرى؟» | «هل أنت جاهز لجولة أخرى؟» | «جاهز/جاهزة» shows gender |
| `settings.scoring.vegasDescription` | off in Vegas | «متوقفة في وضع فيغاس» | «في فيغاس» | Without «وضع» it reads as the city |
| `settings.vegasTotal.description` | the header / running total | «أعلى الشاشة» / «مجموعك التراكمي» | «الشريط العلوي» / «مجموعك الجاري» | Plain words for the badge at the top |
| `settings.cardsDrawn` | Cards drawn | «الأوراق المسحوبة» | «عدد أوراق السحب» | Literal and short |
| `history.justNow` | just now | «الآن» | «للتو» | Shorter, neutral in a detail line |
| `history.emptyBody`, `share.dealMessage` | Klondike | «سوليتير كلوندايك» | «كلوندايك» alone | Glossary: players know the word only next to «سوليتير». Both sentences are nominal (no imperative, no gender) |
| `a11y.scrubber` | Undo scrubber | «شريط التراجع» | «شريط التمرير الزمني» | No glossary row; context forbids jargon |
| `a11y.stockRecycleLeft_*` | {{count}} left | «بقيت {{count}} دورات» etc. with the noun «دورة» | «بقي {{count}}» in all forms | Spoken label reads better with the noun; the visible caption `game.recyclesLeft` keeps «بقي {{count}}» in all six forms |
| store `name` / `title` | Soli: Klondike Solitaire | «سوليتير كلوندايك – Soli» | «Soli: سوليتير كلوندايك» | Bidi rule 3: a line must not start with "Soli". Costs brand-first order; orchestrator's call |
| store `subtitle` | No ads. Every deal winnable. | «بدون إعلانات. لكل توزيعة حل» (27) | «… كل توزيعة قابلة للحل» (35, too long) | The glossary phrase does not fit 30; "every deal has a solution" keeps the meaning |
| store description | streaks | «سلاسل أيام» | «سلاسل متتالية» | No established Arabic word |
| store description | FEATURES | «المزايا» | «المميزات» | No caps in Arabic; plain heading |
| release notes | Happy playing! | «لعبًا ممتعًا!» | «استمتع باللعب!» | The alternative is a gendered imperative |

## Tight keys longer than English

- `common.reset` «إعادة تعيين» (11 vs 5), `game.playDeal.retryConfirm` / `history.retry` «إعادة المحاولة» (14 vs 5), `game.newGameAlert.confirm` «توزيعة جديدة» (12 vs 10), `history.stats.incomplete` «غير مكتملة» (10): glossary terms, dialog buttons and tiles to check on a small phone. «تصفير» (glossary alt for Reset) would be 5.
- `settings.warnings.unwinnable` «لعبة لا يمكن الفوز بها» (22 vs 15): glossary option, no shorter natural form.
- HUD labels and the stock caption are within their numeric limits (سحب 3, النقاط 6, المجموع 7, الحركات 7, الوقت 5).

## Source oddities

- `time.*` parts are joined with spaces only. Arabic wants «و» between them («ساعة واحدة ودقيقتان و5 ثوانٍ»); the joined label is understandable but telegraphic. A joiner key would fix it for every language.
- `history.score` «النقاط {{value}}»: if a Standard score can be negative (U+2212 from code), it needs `‎` before the placeholder like `history.vegas`. I added none because the context only says "formatted number".
- `hud.badgeA11y` with a Vegas value uses the spoken form, so no mark is needed there.
- `nav.notFoundLink` has an exclamation mark in English; the Arabic is a plain masdar label without it (calm tone).
- iOS keywords: «بدون نت» is in the glossary table, but «بدون» is already in the subtitle, so only «نت» / «انترنت» are listed. "klondike" and "solitaire" in Latin are included for users who type Latin.
- Vegas amounts and `$0` still need the device look R6 asked for (`history.vegas`, `resetMessage`, negative amount).

## Feedback on the brief

- The glossary's Arabic column sits in a five-language table with very long rows; a per-language extract would save time.
- Writing `‎` through a shell heredoc turned it into the raw character in my environment; I converted it back and verified. A jest check "no raw direction characters in ar/he" would catch this for everyone.
- Rule "never start store text with Soli" conflicts with the skill's «"Soli" plus the local name» for name/title; say which wins.
