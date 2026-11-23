# Terminology research R6: Arabic (`ar`) and Hebrew (`he`)

Date: 2026-11-23. Researcher R6 (plan `docs/product/i18n/i18n.md`, step 5.1). This note is the input for the merge agent; `glossary.md` was not edited.

In this note «…» is only a quoting mark. Invisible characters are always written as JSON escapes (`‎` = LRM, `‏` = RLM) and translators must write them the same way in the locale JSON, never as a raw invisible character.

## How reliable is this

| Evidence | Status |
|---|---|
| GNOME Aisleriot `ar.po` / `he.po` (open-source solitaire, human translated) | Read in full for the terms listed. Best single source for board terms |
| FRVR Solitaire Arabic rules page | Read. Good MSA rules text with board terms |
| Arabic / Hebrew Wikipedia (سوليتير, ورق اللعب, סוליטר, קלף משחק) | Read |
| App Store listings with `?l=ar` (Aged Studio, another "Card Games Classic") | Read. Partly machine-translated: used for register, digits and keywords, not as a term authority |
| Microsoft Arabic and Hebrew localization style guides (PDF) | Read (gender, imperative, numerals, quotes) |
| Microsoft Solitaire Collection in-app Arabic/Hebrew UI | **Not reachable.** Its App Store pages in the SA and IL storefronts have an English description; the Play pages came back truncated. No MSC term is cited below |
| Apple / Google system words (Undo, Cancel, Share, Settings, Reset, Off) | **From my knowledge of the iOS and Android system UIs, not fetched in this run.** Reviewer or phase 9 device test should confirm against the device |
| Bidi behaviour | Derived from the Unicode Bidirectional Algorithm rules (W2, W4–W7, N1–N2), **not tested on a device**. Phase 9 must look at it |
| Digits and plural categories | Measured locally: Node 26.13, ICU 79.1, CLDR 49 |

---

# Arabic (`ar`)

## 1. Rules section (ready to paste into the glossary)

### Arabic (`ar`)

Status: researched 2026-11-23 (R6). Source note: `docs/product/i18n/notes/research-r6-ar-he.md`.

- **Variety:** Modern Standard Arabic, understood from Morocco to the Gulf. No dialect words in the app (no «كوتشينة», «شدّة», «بلوت», «شايب», «بنت»); regional words are store keywords only.
- **Register and gender:**
  - **Labels, buttons, menu entries, settings titles, hints: the verbal noun (masdar)**, which has no gender: «تراجع», «مشاركة», «إلغاء», «سحب», «إعادة المحاولة», «تلميح: نقل {{card}} إلى العمود {{column}}». This is what Apple, Google and Microsoft do on Arabic buttons, and the Microsoft guide asks for the verbal noun instead of a conjugated verb.
  - **Sentences that address the player:** first choice is a form that is written the same for a man and a woman: «يمكنك …», «لعبتك», «رصيدك» (the suffix ـك has no written gender without vowel marks), or an impersonal sentence. Where only an imperative reads naturally (store description, a tip), use the **masculine singular imperative** («اسحب», «جرّب», «العب»): it is the convention in every Arabic listing and app read. Never the feminine, never slash forms («اسحب/ي»), never the plural, never «قم بـ…» + masdar (Microsoft guide: use the plain form).
  - No vowel marks (tashkeel), with two exceptions: the tanween on an accusative that would otherwise be misread («مجانًا», «دولارًا») and a shadda where a word is ambiguous without it. Never add a vowel mark to ـك.
- **Name of the game:** «سوليتير». The variant is «سوليتير كلوندايك» (spelling «كلوندايك», not «كلونديك»); players know the word only next to «سوليتير», so the app says «سوليتير» alone wherever English allows and «كلوندايك» only where English says Klondike. «لعبة الصبر» (Patience) exists in descriptions but nobody uses it as the name. «الشدّة» / «الكوتشينة» / «الورق» are regional words for playing cards, not for this game.
- **Orthography:** correct hamza (أ إ آ ؤ ئ), ة not ه at the end of feminine nouns, ي not ى for final yā («في», «التي»), no kashida (ـ) for stretching, no Persian or Urdu letters.
- **Punctuation:** Arabic comma «،», semicolon «؛», question mark «؟». Period, colon, exclamation mark and parentheses as in English. Space after punctuation, none before. The English em dash in notices ("No more useful moves — undo or…") becomes a period and a second sentence, or « – » (en dash with spaces); not an em dash.
- **Quotes, apostrophes, ellipsis:** avoid quotes; if one is needed, straight `"…"` (Microsoft Arabic guide). Ellipsis is the single character `…` at the end of the string, as in English.
- **Digits:** Western digits 0–9 in every string, in the store text too (rule "All languages"; Microsoft Arabic guide: Western digits are the standard; the Arabic store listings read use them). Dates, times and grouped numbers come from code with `-u-nu-latn`: without it `ar-SA` and `ar-EG` print «١٬٢٣٤» while `ar` and `ar-AE` print «1,234».
- **Direction marks (bidi).** The text is right-to-left; "Soli", digits and `$` amounts are left-to-right islands. Rules:
  1. **"Soli" is the only Latin word** in Arabic text. Vegas and Klondike are written in Arabic letters («فيغاس», «كلوندايك») so that they need no marks. *(«draft»: overrides "Names that stay" for Vegas; see open doubts.)*
  2. **Arabic prefixes never attach to "Soli"** and it never takes «الـ»: write «في Soli», «على Soli», «من Soli»; never «بـSoli», «لـSoli», «وSoli».
  3. **Never start a string, a line of store text or a paragraph with "Soli"** or another Latin token: apps that pick the direction from the first strong character (share targets, the stores, some text views) would lay the whole line out left-to-right. Reword so an Arabic word comes first; if that is impossible, start the string with `‏`.
  4. **A dollar amount inside a sentence is preceded by `‎`**: `"فيغاس ‎{{value}}"`, `"من ‎$0"`. Without it Arabic shows «52$» (the `$` jumps to the other side after an Arabic letter) and a negative amount shows its minus on the wrong side. Strings that consist of the amount alone (HUD badge) need nothing.
  5. **Put the Arabic word before a bare number** where the order is free: «بقي {{count}}», not «{{count}} بقي».
  6. No other direction characters, ever (no U+202A–U+202E, no isolates typed by hand). Parentheses and the period at the end mirror by themselves.
- **Plural forms (CLDR, checked by jest):** zero, one, two, few, many, other (all six required).

  | Form | Numbers | Pattern | move | card | game | dollar (spoken) |
  |---|---|---|---|---|---|---|
  | zero | 0 | `{{count}}` + plural | «{{count}} حركات» | «{{count}} أوراق» | «{{count}} ألعاب» | «{{count}} دولار» |
  | one | 1 | singular + «واحدة/واحد», no digit | «حركة واحدة» | «ورقة واحدة» | «لعبة واحدة» | «دولار واحد» |
  | two | 2 | dual, no digit | «حركتان» | «ورقتان» | «لعبتان» | «دولاران» |
  | few | 3–10, 103–110, … | `{{count}}` + plural | «{{count}} حركات» | «{{count}} أوراق» | «{{count}} ألعاب» | «{{count}} دولارات» |
  | many | 11–99, 111–199, … | `{{count}}` + singular (accusative) | «{{count}} حركة» | «{{count}} ورقة» | «{{count}} لعبة» | «{{count}} دولارًا» |
  | other | 100, 101, 102, 200, … | `{{count}}` + singular | «{{count}} حركة» | «{{count}} ورقة» | «{{count}} لعبة» | «{{count}} دولار» |

  Time units: «ثانية واحدة / ثانيتان / {{count}} ثوانٍ / {{count}} ثانية», «دقيقة واحدة / دقيقتان / {{count}} دقائق / {{count}} دقيقة», «ساعة واحدة / ساعتان / {{count}} ساعات / {{count}} ساعة». `one` and `two` carry no digit because in Arabic each of them stands for exactly one number (allowed by the plural rule under "All languages"; it is an **exception to "never write a number in words"**, see open doubts). The dual takes ـان when the phrase stands alone and ـين after a preposition. Keys without a noun («بقي {{count}}») repeat the same text in all six forms.
- **Short labels:** لعبة جديدة · تلميح · تراجع · سحب · النقاط · الحركات · الوقت · المجموع · إيقاف. Drop «الـ» on a badge if space is short («نقاط», «حركات», «وقت»).
- **Screen reader:** card names are a construct: `{{rank}} {{suit}}` with the suit carrying the article («ملكة القلوب»). Separate label and value with «،».

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| كازينو، قمار، مقامرة، رهان، مراهنة | Gambling vocabulary: unwelcome in most Arabic storefronts, and Soli is not a gambling game. Also keeps Soli out of the "casino" charts' vocabulary | «نقاط فيغاس», «نقاط بالدولار» |
| مجاني، مجانية، مجانًا، مجانا، بالمجان | Price words: never in the iOS name/subtitle or the Play title (the jest price-word list needs these spellings) | say it in the description |
| بدون إعلانات، بلا إعلانات | Not in the Play title or short description | full description |
| كوتشينة، شدّة، بلوت، شايب، بنت، كبّة، سبيتي | Regional card words; half the readers do not use them | the glossary terms |
| بطاقة / بطاقات for a playing card | Machine-translation tell in store listings (it means ID or credit card) | «ورقة» / «أوراق» |
| لا توجد حركات ممكنة، خسرت، انتهت اللعبة | Stronger than "No more useful moves" | «لا مزيد من الحركات المفيدة» |
| قم بـ… + masdar | Translationese (Microsoft guide) | masdar or plain imperative |
| Eastern Arabic digits ٠–٩ | Rule "Latin digits everywhere" | 0–9 |

**Store / ASO keywords**

See section 3 of the research note (table copied there).

**Sources**

See section 4 of the research note.

## 2. Term table (`ar` column of Table 3)

| EN (canonical) | ar | «draft» | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | Latin letters; no «الـ», no attached prefix |
| Solitaire | سوليتير | | Arabic Wikipedia, GNOME, every listing |
| Klondike | كلوندايك | | Known only as «سوليتير كلوندايك». GNOME, ar.wikipedia caption, Aged Studio listing. FRVR writes «كلونديك» (rarer) |
| Patience | لعبة الصبر | | Seen in descriptions as an explanation; not a search name |
| **Cards** | | | |
| card | ورقة *(pl. أوراق; playing cards: ورق اللعب)* | | GNOME, FRVR, Wikipedia. Not «بطاقة» |
| deck | مجموعة الورق | «draft» | FRVR «مجموعة أوراق». Alternative: «رزمة» (GNOME) |
| suit | النوع | «draft» | FRVR «الأنواع». Alternatives: «الشكل» (ar.wikipedia «الأشكال الأربعة»), «النقش» (dictionary) |
| hearts | القلوب | | FRVR. GNOME uses «الكبّة» (regional) |
| diamonds | الديناري | | FRVR, GNOME, Wikipedia |
| clubs | السباتي | | FRVR, Wikipedia. GNOME «السبيتي» |
| spades | البستوني | | FRVR, GNOME, Wikipedia |
| rank | القيمة | «draft» | Alternative: «الرتبة» |
| Ace | آس | | Variants «أس» (GNOME), «آص» (FRVR) |
| Jack | ولد | «draft» | FRVR «الولد». Alternative: «شاب» (GNOME, Wikipedia «الشبّ») |
| Queen | ملكة | | FRVR, GNOME |
| King | ملك | | FRVR, GNOME |
| Two … Ten | اثنان، ثلاثة، أربعة، خمسة، ستة، سبعة، ثمانية، تسعة، عشرة | | Counting forms, as GNOME («اثنان السبيتي», «عشرة الكبّة») |
| Ace of Spades | `{{rank}} {{suit}}` → «آس البستوني» | | Construct, suit with article. GNOME «أس البستوني» |
| face up / face down | مكشوفة / مقلوبة *(«ورقة مقلوبة»)* | | FRVR |
| **Board** | | | |
| stock | المخزون | | GNOME, FRVR «كومة المخزون» |
| waste | المهملات | «draft» | FRVR «كومة المهملات» (also «كومة السحب», ambiguous). GNOME «القمامة» (too literal) |
| foundation | الأساس *(pl. الأساسات; «أساس القلوب»)* | | GNOME «الأساس», FRVR «كومات الأساس» |
| tableau | منطقة اللعب | «draft» | FRVR. Alternative: «الأعمدة السبعة». GNOME «تابلو» (jargon) |
| column | عمود *(«العمود 3»)* | | FRVR |
| pass (recycle) | دورة *(caption: «بقي {{count}}»)* | «draft» | GNOME «دورة» (round). Alternative: «مرور» |
| deal (noun) | توزيعة *(pl. توزيعات)* | | GNOME «توزيعات» |
| **Actions** | | | |
| Draw (verb) | سحب | | Masdar, 3 letters. FRVR, listings |
| Draw 1 … Draw 5 | سحب `{{number}}` | | Aged Studio listing: «سحب 1 أو سحب 3» |
| New Game | لعبة جديدة | | |
| Deal Again | توزيعة جديدة | | |
| Retry | إعادة المحاولة | | iOS / Android system word |
| Share | مشاركة | | iOS / Android |
| move (noun) | حركة *(pl. حركات; HUD «الحركات»)* | «draft» | FRVR «الحركات», usual in mobile games. Alternative: «نقلة / نقلات» (GNOME, the chess word). The verb "move a card" is «نقل» either way |
| Undo | تراجع | | iOS, Android, Microsoft, every listing |
| time travel | السفر عبر الزمن | | |
| Auto Up | رفع تلقائي | «draft» | Translate; the orchestrator decides across languages |
| **Hints and warnings** | | | |
| Hint | تلميح | | GNOME, listings |
| Warnings | تحذيرات | | Not «تنبيهات» (that is notifications) |
| useful move | حركة مفيدة *(«لا مزيد من الحركات المفيدة»)* | | |
| winnable / unwinnable | يمكن الفوز بها / لا يمكن الفوز بها *(option: «لعبة لا يمكن الفوز بها»)* | | |
| Solvable deals | توزيعات قابلة للحل *(History label: «قابلة للحل»)* | | |
| **Scoring and statistics** | | | |
| Scoring | احتساب النقاط | «draft» | Alternative: «النقاط» alone. Not «التسجيل» (means sign-up) |
| Standard | قياسي | «draft» | Apple's word. Alternative: «عادي» |
| Vegas | فيغاس | «draft» | Arabic letters remove every bidi problem. Alternative: keep "Vegas" (then rule 4 also applies to the word) |
| Score | النقاط | | GNOME «النتيجة» is the alternative |
| Total | المجموع | | GNOME. Alternative: «الإجمالي» |
| Time | الوقت *(setting "Game timer": «مؤقت اللعبة»)* | | GNOME |
| Move counter | عدّاد الحركات | | |
| Statistics | الإحصائيات | | GNOME, listings |
| **App** | | | |
| Play | اللعب *(confirm button: «بدء اللعب»)* | «draft» | Masdar. Alternative for the button: «العب» (masculine imperative, common in games) |
| History | السجل *(title: «سجل الألعاب»)* | | |
| Games | الألعاب | | |
| Solved | محلولة | | Feminine: agrees with «لعبة», also for the stat (non-human plural) |
| Incomplete | غير مكتملة | | |
| Active | جارية | «draft» | Alternative: «نشطة» |
| Settings | الإعدادات | | iOS / Android |
| Gameplay / New Games | أسلوب اللعب / الألعاب الجديدة | | |
| Off | إيقاف | | iOS. Android says «غير مفعّل» (too long for a picker) |
| Cancel | إلغاء | | iOS / Android |
| Reset | إعادة تعيين | «draft» | iOS word; long. Alternative: «تصفير» (exactly "set to zero", 5 letters) |
| win / celebration | فوز / احتفال الفوز | | |
| Rate Soli | تقييم Soli | | |
| open source | مفتوح المصدر | | |
| ads / no ads | إعلانات / بدون إعلانات | | «بدون إعلانات» is the searched form |
| free | مجاني *(adverb: مجانًا)* | | Description only |

## 3. ASO keywords (`ar`)

| Keyword | Why / source |
|---|---|
| سوليتير | The name. Every Arabic listing title |
| سوليتير كلاسيك / كلاسيكية | Listing titles («سوليتير الكلاسيكية», «لعبة ورق كلاسيكيّة») |
| كلوندايك | Listing titles and subtitles («جرّب ألعاب كلوندايك») |
| لعبة ورق / ألعاب ورق | App Store category name «ألعاب ورق»; listing titles |
| العاب ورق | The same without hamza: how it is typed in search |
| كوتشينة | Egypt's word for cards (ar.wikipedia). Keyword only |
| شدة | Levant's word for cards (ar.wikipedia). Keyword only |
| لعبة الصبر | "Patience", used in descriptions |
| بدون نت / بدون انترنت | "offline", the usual Arabic search phrase *(inferred, not measured)* |
| بدون إعلانات | Differentiator; iOS keywords and descriptions only |
| ألعاب ذكاء | "brain games" category term *(inferred)* |
| solitaire | Arabic users also type Latin; big competitors (Microsoft) have no Arabic listing in the SA storefront |

No search-volume tool was available: the list is from titles and descriptions, not from measured volume.

## 4. Sources (`ar`)

- [GNOME Aisleriot `ar.po`](https://raw.githubusercontent.com/GNOME/aisleriot/master/po/ar.po): سوليتير, كلوندايك, تلميح, المخزون, الأساس, النتيجة, الوقت, المجموع, card names («أس البستوني», «ملكة الديناري»), توزيعات, دورة.
- [FRVR Solitaire, Arabic rules](https://frvr.com/ar/play/solitaire/): الأوراق, كومة المخزون, كومة المهملات, كومات الأساس, منطقة اللعب, أعمدة, الأنواع, القلوب / البستوني / السباتي / الديناري, الآص / الولد / الملكة / الملك, سحب, مكشوفة / مقلوبة, الحركات; masculine singular address.
- [ar.wikipedia سوليتير](https://ar.wikipedia.org/wiki/سوليتير): «السوليتير», «كلوندايك», «الأوراق».
- [ar.wikipedia ورق اللعب](https://ar.wikipedia.org/wiki/ورق_اللعب): regional names (كوتشينة, شدّة, بلوت), the four historical suit names, regional rank names.
- [App Store: «سوليتير - لعبة ورق كلاسيكيّة»](https://apps.apple.com/us/app/id1190849728?l=ar): «سحب 1 أو سحب 3», «تلميحات», «التراجع», masculine singular imperatives, Western digits.
- [App Store: Solitaire - Card Games Classic (`l=ar`)](https://apps.apple.com/us/app/id1564391515?l=ar): «الأساسات», «الأعمدة», «الإحصاء», «المعروفة باسم الصبر»; shows the machine-translation traps («بطاقة», «الماس», «الصلبان», «وضع الرسم»).
- [App Store SA: Microsoft Solitaire Collection](https://apps.apple.com/sa/app/id1103438575?l=ar): description is English; category «ألعاب ورق», chart «كازينو».
- [Microsoft Arabic localization style guide (PDF)](https://download.microsoft.com/download/5/6/d/56d1774f-ac3f-4ad9-80af-a6dfd5df419d/ara-sau-StyleGuide.pdf): plain imperative instead of «قم بـ», verbal noun in tooltips, 1 spelled out and 2 as dual, Western digits "as a general rule", straight quotes.
- [Unicode Bidirectional Algorithm (UAX #9)](https://www.unicode.org/reports/tr9/): rules W2, W4–W7, N1–N2 behind the direction-mark rules.
- Local measurement (Node 26.13, CLDR 49): `ar` → `1,234.5`; `ar-SA`, `ar-EG` → `١٬٢٣٤٫٥`; with `-u-nu-latn` → `1,234.5`. Plural categories `zero, one, two, few, many, other`; 100, 101, 102 → `other`; 103 → `few`; 111 → `many`.

## 5. Open doubts (`ar`)

1. **Vegas in Arabic letters** («فيغاس») against the all-languages rule "Names that stay: … Vegas". I recommend it (place names are always written in Arabic; no marks needed). If the orchestrator keeps "Vegas", `hud.vegas` / `settings.scoring.vegas` stay on the identical-to-English allow-list and every sentence with the word needs a look on the device.
2. **`one` / `two` without a digit** («حركة واحدة», «حركتان») against "never write a number in words". It is correct Arabic and what Microsoft prescribes; «1 حركة» / «2 حركة» reads like a machine. If rejected, the fallback is `{{count}}` + singular for one and `{{count}}` + plural for two.
3. **`‎` before dollar amounts** is a translator workaround. Cleaner: the code that formats a Vegas amount prepends `‎` for RTL languages (one place, no invisible characters in JSON). Either way it needs one look on a device in phase 9 (`history.vegas`, `settings.vegasTotal.resetMessage`, negative amount).
4. **Text inside the LTR-pinned game surface** (hint bubble, warning bubble, stock caption): check on the device that Arabic there is still laid out and aligned right-to-left.
5. **move = «حركة» or «نقلة»**: both correct. «حركة» is what mobile games show, «نقلة» is the more exact card/chess word.
6. **Jack = «ولد» or «شاب»**, **suit = «النوع» / «الشكل»**: no single pan-Arab word; only spoken by the screen reader.
7. **`about.dedication` ("my girlfriend")**: «صديقتي» is literal but can read as "my (female) friend"; «حبيبتي» is clear and warm, a little intimate for conservative markets; «شريكة حياتي» is the neutral option. Karim's call; I would take «شريكة حياتي».
8. **Suit names are Egyptian/Levantine in origin.** Gulf players say هاص / ديمن / سبيت / شيريا. The chosen set is the one Arabic references list as the standard names.
9. Microsoft Solitaire Collection's Arabic UI could not be read; if someone has it on a device, compare Scoring / Standard / Draw / Hint.

---

# Hebrew (`he`)

## 1. Rules section (ready to paste into the glossary)

### Hebrew (`he`)

Status: researched 2026-11-23 (R6). Source note: `docs/product/i18n/notes/research-r6-ar-he.md`.

- **Register and gender: gender-neutral, no slash forms.** Hebrew verbs and adjectives show the reader's gender, so:
  - **Buttons, labels, menu entries, settings titles, hints: the verbal noun (שם פעולה)**: «ביטול», «שיתוף», «איפוס», «משיכה», «רמז: העברת {{card}} לטור {{column}}». Microsoft's Hebrew guide prescribes exactly this for UI elements («שמירה», not «שמור» / «לשמור»); Google's Hebrew UI avoids the imperative for the same reason.
  - **Sentences:** «אפשר ל…» / «ניתן ל…» + infinitive («אפשר לבטל מהלך או להתחיל משחק חדש»), or words that are written the same for both genders: «שלך», «לך», «ברצונך», past tense («ניצחת»). A question to the player may use the plural («מוכנים לסיבוב נוסף?»).
  - Last resort where nothing neutral reads well: second person **plural** («גררו», «שחקו»), which Microsoft's guide uses for instructions. Never the masculine singular imperative («בטל», «משוך», «לחץ»), never slash forms («לחץ/י»).
  - Adjectives that describe a game agree with «משחק» (masculine): «נפתר», «פעיל».
- **Name of the game:** «סוליטר» (Hebrew Wikipedia's article name; «סוליטייר» is a common second spelling, keyword only). «קלונדייק» is known as the Windows game (Hebrew Wikipedia says so) and is used where English says Klondike. «פסיאנס» is the old name (Patience), keyword only.
- **Orthography:** no niqqud; full spelling (כתיב מלא) as the Academy prescribes: «הכול», «ניקוד», «שנייה». Hebrew prefixes (ב, ל, מ, ה, ו, ש, כ) before a Latin word or a digit take a hyphen: «ב-Soli», «ל-3». Plain hyphen-minus, no maqaf (־).
- **Punctuation:** as in English (`, . : ? !`). The English em dash in notices becomes a period and a second sentence, or « – » (en dash with spaces).
- **Quotes, apostrophes, ellipsis:** avoid quotes; if one is needed, straight `"…"`. Abbreviations use the Hebrew marks gershayim `״` (U+05F4) and geresh `׳` (U+05F3), never an ASCII quote («סה״כ»). Ellipsis is the single character `…`.
- **Digits:** 0–9 (Hebrew never uses anything else). `Intl` prints «23 בנוב׳ 2026, 14:05».
- **Direction marks (bidi).** Same model as Arabic, but simpler because Hebrew does not move the `$`:
  1. **"Soli" is the only Latin word.** Vegas and Klondike are written in Hebrew letters («וגאס», «קלונדייק»). *(«draft» for Vegas; see open doubts.)*
  2. **Never start a string, a store-text line or a paragraph with "Soli"**; reword, or start with `‏` if there is no other way.
  3. **A dollar amount that can be negative is preceded by `‎` inside a sentence**: `"וגאס ‎{{value}}"`. A positive `$52` or `$0` renders correctly without it; add the mark anyway so both languages follow one rule.
  4. Put the Hebrew word before a bare number where the order is free («נותרו {{count}}»).
  5. No other direction characters.
- **Plural forms (CLDR, checked by jest):** one, two, other. (`many` was removed from Hebrew in CLDR 42. A phone with older system data may still answer `many` for 20, 30, …; i18next then falls back to `_other`, so no `_many` key is written.)

  | Form | Numbers | Pattern | move | card | game | dollar (spoken) |
  |---|---|---|---|---|---|---|
  | one | 1 | noun + «אחד/אחת», no digit | «מהלך אחד» | «קלף אחד» | «משחק אחד» | «דולר אחד» |
  | two | 2 | «שני/שתי» + plural, no digit | «שני מהלכים» | «שני קלפים» | «שני משחקים» | «שני דולרים» |
  | other | 0, 3, 4, … | `{{count}}` + plural | «{{count}} מהלכים» | «{{count}} קלפים» | «{{count}} משחקים» | «{{count}} דולרים» |

  Feminine time units: «שנייה אחת / שתי שניות / {{count}} שניות», «דקה אחת / שתי דקות / {{count}} דקות», «שעה אחת / שעתיים / {{count}} שעות». `one` and `two` carry no digit (each stands for exactly one number; it is an **exception to "never write a number in words"**, see open doubts). Keys without a noun («נותרו {{count}}») repeat the text.
- **Short labels:** משחק חדש · רמז · ביטול · משיכה · ניקוד · מהלכים · זמן · סה״כ · כבוי.
- **Screen reader:** card names are rank then suit with nothing between: «מלכה לב», «אס עלה».

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| masculine singular imperatives: בטל, משוך, לחץ, שתף, הקש | Addresses only men | verbal noun (ביטול, משיכה, שיתוף) or «אפשר ל…» |
| slash forms: לחץ/י, מוכן/ה | Clumsy; Microsoft allows them only as a very last resort | plural or neutral rewording |
| חינם, בחינם, חינמי, ללא תשלום | Price words: never in the iOS name/subtitle or the Play title (the jest price-word list needs these) | say it in the description |
| ללא פרסומות, בלי פרסומות | Not in the Play title or short description | full description |
| קזינו, הימורים | Gambling vocabulary; Soli is not a gambling game | «ניקוד וגאס» |
| אין מהלכים אפשריים, הפסדת, המשחק נגמר | Stronger than "No more useful moves" | «אין עוד מהלכים מועילים» |
| מלאי (for the stock), טבלאו | Literal / jargon (GNOME's «מלאי» is a warehouse word) | «קופה», «שולחן המשחק» |
| כרטיס for a playing card | Means ticket or bank card | «קלף» |

**Store / ASO keywords**

See section 3 below.

**Sources**

See section 4 below.

## 2. Term table (`he` column of Table 3)

| EN (canonical) | he | «draft» | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | Latin letters; prefix with hyphen: «ב-Soli» |
| Solitaire | סוליטר | | he.wikipedia article name. «סוליטייר» (GNOME) is the second spelling |
| Klondike | קלונדייק | | he.wikipedia: the version that shipped with Windows; GNOME |
| Patience | פסיאנס | | he.wikipedia: «נקרא גם פסיאנס» |
| **Cards** | | | |
| card | קלף *(pl. קלפים)* | | |
| deck | חפיסה *(חפיסת קלפים)* | | he.wikipedia, GNOME |
| suit | סדרה | | he.wikipedia (קלף משחק, סוליטר). Colloquial: «צורה» |
| hearts | לב | | he.wikipedia, GNOME |
| diamonds | יהלום | | he.wikipedia, GNOME |
| clubs | תלתן | | he.wikipedia, GNOME |
| spades | עלה | | he.wikipedia, GNOME |
| rank | ערך | «draft» | Alternative: «דרגה» |
| Ace | אס | | |
| Jack | נסיך | | he.wikipedia, GNOME |
| Queen | מלכה | | |
| King | מלך | | |
| Two … Ten | שתיים, שלוש, ארבע, חמש, שש, שבע, שמונה, תשע, עשר | | Feminine counting forms, as GNOME («שתיים תלתן», «עשר לב») |
| Ace of Spades | `{{rank}} {{suit}}` → «אס עלה» | | GNOME: «אס עלה», «מלכה יהלום» |
| face up / face down | גלוי / הפוך *(«קלף הפוך»)* | | GNOME says «קלף שפניו מטה» (long) |
| **Board** | | | |
| stock | קופה | | The Israeli card-table word for the draw pile. GNOME «מלאי» rejected |
| waste | ערימת הפסולת | «draft» | he.wikipedia (in the TriPeaks paragraph). Alternative: «הערימה הגלויה» |
| foundation | ערימת יסוד *(«ערימת יסוד לב»)* | | GNOME «ערימת היסוד» |
| tableau | שולחן המשחק | «draft» | GNOME «השולחן». Alternative: «הטורים» |
| column | טור *(«טור 3»)* | | |
| pass (recycle) | סבב *(caption: «נותרו {{count}}»)* | «draft» | Alternative: «סיבוב» (kept for "round" in "Ready for another round?") |
| deal (noun) | חלוקה | | GNOME |
| **Actions** | | | |
| Draw (verb) | משיכה | | Verbal noun of «למשוך קלף» |
| Draw 1 … Draw 5 | משיכת `{{number}}` | «draft» | Alternative: «משיכה של {{number}}» |
| New Game | משחק חדש | | |
| Deal Again | חלוקה חדשה | | |
| Retry | ניסיון חוזר | | Android system word (iOS: «נסה שוב», masculine) |
| Share | שיתוף | | iOS / Android |
| move (noun) | מהלך *(pl. מהלכים)* | | GNOME |
| Undo | ביטול *(spoken / long form: «ביטול מהלך»)* | «draft» | Android's word; GNOME «ביטול מהלך». Same word as Cancel, as on Android: the two never share a screen. Alternative: «בטל» (iOS, masculine imperative) |
| time travel | מסע בזמן | | |
| Auto Up | העלאה אוטומטית | «draft» | Translate; the orchestrator decides across languages |
| **Hints and warnings** | | | |
| Hint | רמז | | GNOME |
| Warnings | אזהרות | | |
| useful move | מהלך מועיל *(«אין עוד מהלכים מועילים»)* | | |
| winnable / unwinnable | אפשר לנצח / אי אפשר לנצח *(option: «משחק שאי אפשר לנצח»)* | | Not «משחק אבוד» (reads "lost") |
| Solvable deals | חלוקות פתירות *(History label: «פתירה»)* | | |
| **Scoring and statistics** | | | |
| Scoring | שיטת ניקוד | | |
| Standard | רגיל | «draft» | Alternative: «סטנדרטי» |
| Vegas | וגאס | «draft» | With a prefix: «בווגאס». Alternative: keep "Vegas" |
| Score | ניקוד | | GNOME «תוצאה» is the alternative |
| Total | סה״כ *(in running text: «סך הכול»)* | | GNOME «סך הכל» |
| Time | זמן *(setting "Game timer": «שעון משחק»)* | | GNOME |
| Move counter | מונה מהלכים | | |
| Statistics | סטטיסטיקה | | GNOME «סטטיסטיקות» |
| **App** | | | |
| Play | משחק *(confirm button: «התחלת משחק»)* | «draft» | Noun for the drawer. Alternative for the button: «לשחק» |
| History | היסטוריה *(title: «היסטוריית משחקים»)* | | |
| Games | משחקים | | |
| Solved | נפתר *(stat: «נפתרו»)* | | Masculine singular / plural, agreeing with «משחק» |
| Incomplete | לא הושלם *(stat: «לא הושלמו»)* | | |
| Active | פעיל | | |
| Settings | הגדרות | | iOS / Android |
| Gameplay / New Games | אופן המשחק / משחקים חדשים | | |
| Off | כבוי | | iOS / Android |
| Cancel | ביטול | | iOS / Android |
| Reset | איפוס | | iOS / Android |
| win / celebration | ניצחון / חגיגת ניצחון | | |
| Rate Soli | דירוג Soli | | |
| open source | קוד פתוח | | |
| ads / no ads | פרסומות / ללא פרסומות | | |
| free | חינם *(adverb: בחינם)* | | Description only |

## 3. ASO keywords (`he`)

| Keyword | Why / source |
|---|---|
| סוליטר | The name (he.wikipedia) |
| סוליטייר | Second common spelling (GNOME; redirect on Hamichlol) |
| קלונדייק | Known as the Windows game (he.wikipedia) |
| משחק קלפים / משחקי קלפים | Genre; App Store category «קלפים» |
| קלפים | Category word |
| פסיאנס | Old name (he.wikipedia) |
| קלאסי | "classic", paired with סוליטר in titles *(inferred)* |
| ללא פרסומות | Differentiator; iOS keywords and descriptions only |
| ללא אינטרנט / אופליין | "offline" *(inferred, not measured)* |
| משחקי חשיבה | "thinking games" category term *(inferred)* |
| solitaire | Israelis search in English too; the big apps (Microsoft, Staple Games) have no Hebrew listing in the IL storefront |

No search-volume tool was available: the list is from references and listings, not from measured volume. Play's Hebrew listing folder is `iw-IL`.

## 4. Sources (`he`)

- [GNOME Aisleriot `he.po`](https://raw.githubusercontent.com/GNOME/aisleriot/master/po/he.po): סוליטייר, קלונדייק, ביטול מהלך, רמז, סטטיסטיקות, תוצאה, זמן, card names («אס עלה», «נסיך לב», «שתיים תלתן»), קלף שפניו מטה, ערימת היסוד, השולחן, חלוקה, מלאי; verbal nouns on every command.
- [he.wikipedia סוליטר](https://he.wikipedia.org/wiki/סוליטר): «סוליטר», «נקרא גם פסיאנס», «קלונדייק» as the Windows version, «חפיסת קלפים», «סדרה», «ערימת הפסולת».
- [he.wikipedia קלף משחק](https://he.wikipedia.org/wiki/קלף_משחק): «חפיסה», «סדרה», לב / יהלום / תלתן / עלה with variants, אס / נסיך / מלכה / מלך.
- [Microsoft Hebrew localization style guide (PDF)](https://download.microsoft.com/download/a/2/f/a2ff07cc-afca-4db8-9ed7-fd1b706abf1c/heb-isr-StyleGuide.pdf), section 3.1: verbal noun on buttons («שמירה», not «שמור/לשמור»), «אפשר ל… / יש ל…» + infinitive, plural for instructions («לחצו על…»), gender-identical spellings («שלך», «לך»), slash only as a last resort.
- [Google Israel localization update (Medium interview)](https://medium.com/@Kinneret/a-glimpse-into-google-israels-great-language-and-localization-update-project-9fa83f4489c9): gender-neutral UI, imperative avoided, masculine singular only as a fallback. Read through the search summary only (the page itself returned 403).
- [App Store IL: Microsoft Solitaire Collection](https://apps.apple.com/il/app/id1103438575?l=he) and [Solitaire by Staple Games](https://apps.apple.com/il/app/id1454538656?l=he): descriptions are English; category «קלפים».
- [CLDR 42 release notes](https://cldr.unicode.org/downloads/cldr-42) and [Transifex notice](https://community.transifex.com/t/important-update-changes-to-hebrew-plural-rules-in-transifex/3800): Hebrew lost `many`; forms are one, two, other.
- Local measurement (Node 26.13, CLDR 49): `he` categories `one, two, other`; 0, 3, 10, 11, 20, 100 → `other`. i18next 27.2.4 falls back from a missing plural key to `_other` (`node_modules/i18next/dist/esm/i18next.js`, around line 873).
- [Unicode Bidirectional Algorithm (UAX #9)](https://www.unicode.org/reports/tr9/).

## 5. Open doubts (`he`)

1. **Undo = «ביטול», the same word as Cancel.** It follows Android and the verbal-noun rule, and the two never appear together (dock vs. alert). If the orchestrator wants two words: «ביטול מהלך» on the button (long for a tight label) or «בטל» (iOS wording, masculine imperative, breaks the neutral rule).
2. **Vegas in Hebrew letters** («וגאס»): same question as Arabic.
3. **`one` / `two` without a digit** («מהלך אחד», «שני מהלכים»): natural Hebrew and what Android does, but an exception to "never write a number in words". Fallback if rejected: «מהלך 1», «2 מהלכים».
4. **Old devices and `many`:** the fallback to `_other` is read from i18next's source, not tested on a phone with pre-2022 ICU data.
5. **`‎` before amounts** and **text inside the LTR-pinned game surface**: same device checks as Arabic.
6. **waste / tableau** have no settled Hebrew word; both are «draft» and only the screen reader and store text use them.
7. **Apple's Hebrew system UI still uses masculine imperatives in places** («בטל», «נסה שוב»). I chose the neutral forms that Microsoft's guide and Google's practice point to; a reviewer who prefers "exactly like iOS" should say so before translation.
8. Microsoft Solitaire Collection's Hebrew UI could not be read.

---

# Notes for the merge agent (both languages)

- The jest price-word list for store files needs the Arabic and Hebrew spellings in the two "Forbidden words" tables.
- If Vegas and Klondike are written in Arabic/Hebrew letters, `hud.vegas`, `settings.scoring.vegas` and similar keys no longer need the identical-to-English allow-list for `ar` and `he`.
- The all-languages rule "Never write a number in words where English has `{{count}}`" needs one sentence for `ar` and `he` if the `one` / `two` forms above are accepted.
- Both languages chose the same register model (verbal noun on controls, gender-identical wording in sentences), so one reviewer brief covers both.
