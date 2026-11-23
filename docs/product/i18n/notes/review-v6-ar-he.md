# Review V6: Arabic (`ar`) and Hebrew (`he`)

Written 2026-11-23 by reviewer V6 (plan step 7.1). Read: glossary (both sections, table 3), `en.json`, `en.context.json`, both locale files, all store files of both languages, release notes, translator notes `ar.md` / `he.md`.

Checks after the edits: `yarn jest test/unit/store test/unit/i18n` passes (68 tests). Node check on `ar.json` (179 keys) and `he.json` (152 keys): key parity and order, placeholders, plural suffixes (ar six, he one / two / other), no raw direction character (two `‎` escapes per file), no Eastern Arabic digits: no findings. Nothing was verified on a device, and no web lookup was done (see "Store name").

## Changes made

| # | File | Key / field | Before | After | Why |
|---|---|---|---|---|---|
| 1 | `he.json` | `game.recyclesLeft_one` | «נותרו {{count}}» | «נותר {{count}}» | «נותרו 1» is ungrammatical; Hebrew `one` only ever stands for 1. Same length class (6 ≤ 8) |
| 2 | `he.json` | `game.playDeal.sharedConfirm` | «התחלת משחק» (10) | «לשחק» (4) | Tight dialog button, 2.5× English. The infinitive answers the dialog title «לשחק בחלוקה ששיתפו איתך?», is gender-neutral, and is the glossary's listed alternative (cell was «draft») |
| 3 | `he.json` | `settings.scoring.description`, `.vegasDescription` | «ייכנס לתוקף במשחק הבא שלך.» | «ההגדרה תחול מהמשחק הבא שלך.» | The sentence had no subject and read as a fragment |
| 4 | `store/ios/he/description.txt`, `store/android/iw-IL/full_description.txt` | last line | «לכל מי שפשוט רוצים…» | «לכל מי שפשוט רוצה…» | «מי ש…» takes the singular; «רוצה» is written the same for both genders, so it stays neutral |
| 5 | `ar.json` | `about.dedication` | «عند لعب سوليتير» | «عند لعب السوليتير» | The game as a generic noun in running text takes the article (as on ar.wikipedia) |
| 6 | `store/ios/ar-SA/subtitle.txt` | subtitle | «… لكل توزيعة حل» | «… لكل توزيعة حل.» | Closing period like English and Hebrew (28 / 30) |
| 7 | `glossary.md` (he column, «draft» cells only) | Play; pass (recycle) | confirm button «התחלת משחק»; caption «נותרו {{count}}» | confirm button «לשחק» (old one kept as alt); caption adds "for 1: «נותר {{count}}»" | Follows 1 and 2 |

## Translators' uncertain items: resolved

| Item | Decision | Reason |
|---|---|---|
| ar «اسحب» = drag, collides with Draw «سحب» | Keep «اسحب زر التراجع جانبًا» (tip and store description) | It is the platform verb for drag; the object "the Undo button" removes the ambiguity, and the imperative differs visibly from the stock caption «سحب». «حرّك» loses the drag gesture that `en.context.json` demands |
| ar «ناقص دولارين» | Confirmed | «ناقص» is what is said aloud for a negative amount; the dual in the oblique case after it is correct and is also what a listener expects. «سالب» is schoolbook maths |
| ar time parts without «و» | Left as is | Cannot be fixed in the locale file: a leading «و» would be wrong when a part stands alone. Needs code (open item 1) |
| ar `history.score` needs `‎`? | No | `formatStandardScore` clamps at 0 (`Math.max(0, …)` in `src/solitaire/scoring.ts`), so there is never a minus sign |
| ar `common.reset` «إعادة تعيين» vs «تصفير» | Keep «إعادة تعيين» | Platform word; 11 Arabic characters next to «إلغاء» fit a dialog. «تصفير» stays the fallback if a device shows truncation |
| he `recyclesLeft_one` | «נותר {{count}}» | Change 1 |
| he «בת הזוג שלי» | Confirmed | «חברה שלי» can read as "a female friend", which the glossary forbids; «בת הזוג» is unambiguous and still warm |
| he / ar "GitHub" as a second Latin word | Accepted | A name at the end of the string; renders correctly without marks |

## Bidi

- `history.vegas` (both): `‎` directly before `{{value}}`. Walked through UAX #9 for «−$12»: minus, `$` and digits all resolve left-to-right after the mark. Correct.
- `settings.vegasTotal.resetMessage`: ar «من ‎$0 من جديد», he «מ-‎$0.»: mark directly before `$`. Correct.
- No string, store line or paragraph starts with a Latin token. Hebrew prefixes before Soli / GitHub carry the hyphen («ב-Soli», «ל-Soli 1.1»); Arabic prepositions stand apart («في Soli», «إلى Soli 1.1»).
- No raw direction characters in any locale or store file of the two languages.

## Store name: brand last («… – Soli»), kept for both languages

Decision: keep «سوليتير كلوندايك – Soli» and «סוליטר קלונדייק – Soli» (iOS name and Play title), the same order in both languages.

- **Rendering is the same everywhere.** With the Arabic / Hebrew word first, the line is right-to-left whether the store forces RTL or picks the direction from the first strong character. Brand first («Soli: …») renders in two different ways depending on that, and the fix would be an invisible `‏` in a store field, which is fragile (stores may strip or count it).
- **The local game name is what people there search and recognise;** "Soli" is not a known brand yet. Both words are indexed in either order.
- **Practice:** both orders exist in RTL storefronts. Latin brand first with a local descriptor after a colon is frequent for well-known brands; local word first with the Latin brand after it is how Google names its apps in Arabic and Hebrew («خرائط Google», «מפות Google»). This is from memory, not checked live today.
- **Cost:** the two listings differ from the other 13 («Soli: …»), and the brand is not the first thing read. Karim's call; if brand-first is wanted, use «Soli: سوليتير كلوندايك» / «Soli: סוליטר קלונדייק» without any mark and look at it in both stores' RTL UI before submitting.
- Proposed glossary wording (bidi rule 3 ar / rule 2 he, not «draft», so not applied): "This rule wins over 'Soli plus the local name' for `name.txt` / `title.txt`: the brand goes last, after « – »."

## Tight keys longer than about 1.3× English (after the edits)

| Key | EN | ar | he | Verdict |
|---|---|---|---|---|
| `game.playDeal.retryConfirm`, `history.retry` | Retry (5) | «إعادة المحاولة» (14) | «ניסיון חוזר» (11) | Decided glossary terms and the platform words for Retry; no shorter natural verbal noun. Look at the dialog on a small Android phone. Fallbacks if truncated: he «לנסות שוב» (9), ar «إعادة» (5, less clear) |
| `game.playDeal.sharedConfirm` | Play (4) | «بدء اللعب» (9) | «לשחק» (4) | ar kept: bare «لعب» reads as a noun or a past verb, «العب» is a gendered imperative |
| `common.reset` | Reset (5) | «إعادة تعيين» (11) | ok | see above |
| `settings.warnings.unwinnable` | Unwinnable game (15) | «لعبة لا يمكن الفوز بها» (22) | «משחק שאי אפשר לנצח» (18, 1.2×) | Glossary option; no shorter natural form |
| `common.off`, `hud.total`, `hud.moves`, `history.stats.games` | 3–5 | 5–7 | «כבוי» (4) | Over the ratio only because the English is tiny; all inside their absolute limits (≤ 8) |

## Reviewed and found fine

- Glossary terms: every concept uses its column term, the same one in app and store (deal, stock, waste, foundation, column, pass, hint, warnings, useful moves, solvable, Vegas, Auto Up, time travel). No forbidden word; no gambling word; no «بطاقة» / «כרטיס».
- Register: verbal nouns on all controls and hints in both languages. Arabic sentences use «يمكنك / لعبتك / مجموعك» or impersonal forms; masculine imperatives only in the tip and the store description, as the glossary allows. Hebrew uses «אפשר ל…», «שלך / לך», one plural question («מוכנים לסיבוב נוסף?»); no singular imperative, no slash form.
- Plurals: ar zero / one / two / few / many / other read correctly for 0, 1, 2, 3, 11, 100 in moves, cards, dollars, hours, minutes, seconds, passes (few = plural, many = singular with tanween on «دولارًا», other = singular; one and two without a digit). he one / two / other correct, including «שעתיים» and the feminine «שתי דקות / שתי שניות».
- Store policy: no price word in iOS name / subtitle or the Play title; no "no ads" in the Play title or short description; keywords do not repeat name or subtitle words; all limits met.
- Hebrew gershayim in «סה״כ» is U+05F4.

## Open items

| # | Item | Proposal |
|---|---|---|
| 1 | Spoken durations are joined with spaces in code. Arabic wants «و» between parts («ساعة واحدة ودقيقتان»); Hebrew likewise «ו». Understandable today, but telegraphic | Join with `Intl.ListFormat(locale, { type: 'conjunction' })` or a `time.join` key. Code change, all languages benefit |
| 2 | Store name order (above) | Karim decides; default is brand last |
| 3 | Glossary, he "Plural forms": «Keys without a noun («נותרו {{count}}») repeat the text» | Reword to: "…repeat the text, except `_one`: «נותר {{count}}»" (decided text, proposed only) |
| 4 | ar card names with number ranks: «اثنان القلوب» is a label-style juxtaposition, not a strict construct (that would be «اثنا القلوب») | Leave; it is what GNOME does and a screen reader reads it clearly. Alternative pattern «{{rank}} من {{suit}}» is correct for numbers but heavier for «آس / ملك» |
| 5 | «draft» cells reviewed and kept without change: ar deck, suit, rank, Jack «ولد», waste, tableau, pass, move, Scoring, Standard, Play, Active, Reset; he rank, waste, tableau, pass, Draw N, Standard | Orchestrator may drop the «draft» mark |
| 6 | Device look (phase 9): Vegas amounts in history rows and the reset dialog (`$` side, minus side), the Retry dialog buttons on a small phone, he drawer «משחק / שלום / היסטוריה / הגדרות» | Testing sub-agent |
| 7 | Skill: translators hit "the Write tool turns `‎` into the raw character" | Add a line to section 3 of the translation skill and a jest check "no raw direction characters in locale and store files" |
