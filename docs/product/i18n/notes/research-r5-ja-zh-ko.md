# Terminology research R5: Japanese (ja), Chinese Simplified (zh-Hans), Korean (ko)

Researcher R5, 2026-11-23, plan step 5.1 (`docs/product/i18n/i18n.md`). Input for the merge agent: nothing here has been written into `glossary.md`.

How to read this note

- «draft» = unsure pick; the alternative is in the Note column and again under "Open doubts".
- Evidence levels: **[F]** = read on a fetched page in this run (link under Sources); **[K]** = researcher's knowledge of the platform UI / language, NOT re-fetched in this run (reviewer should spot-check on a device set to the language).
- What could not be read: the in-app localized UI of Microsoft Solitaire Collection (no public string list; the Japanese App Store listing keeps the mode names in Latin: "Klondike、Spider、FreeCell、TriPeaks、Pyramid ソリティア"), the China and Korea App Store pages of Microsoft Solitaire Collection (404 for the fetcher), the Google Play descriptions (truncated; only titles came through), and the ja/ko Wikipedia Klondike articles (404; ja Wikibooks and zh Wikipedia were readable).

Cross-language questions for the orchestrator (apply to all three languages)

1. **Vegas in local script.** The glossary's "Names that stay" says Vegas stays Latin. In all three languages the scoring mode is written in the local script by every source found (ja ベガス, zh 维加斯 / "维加斯计分模式" on Wikipedia, ko 베가스). Recommendation: transliterate in ja/zh/ko (a Latin word in the middle of a settings row looks untranslated). Marked «draft» in all three tables; alternative: keep `Vegas`. If transliterated, the jest "identical to English" allow-list needs no entry for these locales.
2. **Card ranks 2–10 as digits.** For the screen reader, all three languages name number cards with the digit (ハートの2, 红桃2, 하트 2); the screen reader speaks the digit correctly. Writing number words (二, 이) would sound wrong or ambiguous. This is not the forbidden "symbol in running text" case; please confirm.
3. **Chinese face cards are letters.** Chinese players say 黑桃K, 红桃Q, 方块J, 梅花A: the letter is the spoken name. There is no natural word (国王 / 皇后 are not used for cards). The zh table therefore keeps A / J / Q / K as the spoken names. This needs an explicit exception to the forbidden-words row "rank written as a symbol".
4. **The " — " dash** in `notice.unwinnable` / `notice.stuck` has no natural equivalent in a ja/zh/ko UI string. Rule in all three sections: write two short sentences instead.
5. **Simulated gambling wording.** Vegas scoring must be described as a scoring mode, never with casino / betting / real-money words (Apple age-rating question "Simulated Gambling"; Korean GRAC rating; Chinese store review). See each language's forbidden words.

---

# Japanese (`ja`)

## (1) Rules section (ready to paste)

### Japanese (`ja`)

Status: researched 2026-11-23 (R5). Source note: `docs/product/i18n/notes/research-r5-ja-zh-ko.md`.

- **Register:** です・ます (polite) for every full sentence: notices, alert messages, setting descriptions, tips, empty states, store description («…できます。», «…しますか？», tips may use «…しましょう» sparingly). Labels, buttons, titles, picker values and HUD badges are plain and short: a noun or a dictionary-form verb («新しいゲーム», «元に戻す», «めくる», «オフ»), never «…します» on a button. No «あなた»; drop the subject. No honorific over-politeness («…いただけます», «…ください ませ»); «…してください» only where English really instructs. Evidence: FRVR and Tripledot help use です・ます throughout; the top App Store listings use です・ます with noun-ending feature bullets.
- **Name of the game:** **ソリティア**. In Japan this word means Klondike (it was the name of the Windows game; Wikibooks: «クロンダイク（ソリティアとも）»). Store name: «Soli ソリティア». **クロンダイク** is the exact name, known to card-game players and used as a second keyword by local apps («クロンダイクソリティア»); use it where English says "Klondike" (history empty state, share text, store description). «ペイシェンス» is not used: do not write it.
- **Orthography and punctuation:** full-width 。、！？：（）「」; no spaces between words; **no space between Japanese and Latin letters or digits** («Soliを評価», «1枚めくり», «残り{{count}}回»); half-width digits and half-width `$` («$52», «-$52»); counters directly after the number (枚 for cards, 手 for moves, 回 for passes, 列目 for a column: «{{column}}列目»). Katakana for established loanwords (ヒント, スコア, リセット, キャンセル, オフ, タイム); kanji card-game words for the board (山札, 捨て札, 組札, 場札, 列). Long-vowel mark kept («タイマー», «カウンター»). No exclamation marks except where English has one, and then full-width ！. English " — " inside a sentence becomes two sentences («…ありません。元に戻すか、新しいゲームを始めてください。»).
- **Quotes, apostrophes, ellipsis:** 「…」 for quoted UI words, 『…』 only inside 「」; ellipsis is one `…` (U+2026) as in English («履歴を読み込み中…»); no apostrophes.
- **Plural forms (CLDR, checked by jest):** other (one form). Write only `_other`, always with `{{count}}` + counter («{{count}}手», «{{count}}枚», «{{count}}時間», «{{count}}分», «{{count}}秒», «{{count}}ドル», «マイナス{{count}}ドル»).
- **Lists for the screen reader:** «{{label}}、{{value}}» with the full-width comma (it gives the pause).
- **Short labels:** New Game «新しいゲーム», Hint «ヒント», Undo «元に戻す», Draw «めくる», Score «スコア», Moves «手数», Time «タイム», Total «累計», Off «オフ».

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| 有効な手 (for "useful move") | Reads as "legal move": «有効な手はありません» = "no moves possible", the stronger claim English avoids | 役に立つ手 |
| 詰み / 手詰まり / ゲームオーバー | Same: claims the game is lost | the sentence with 役に立つ手 |
| ソルバー, シード, アルゴリズム, カタログ | Developer jargon (all-languages list in katakana) | クリアできる配置, ヒント |
| No.1, 最高, 日本一, 人気No.1 | Store policy and 景品表示法 (superlative claims need proof) | describe the feature |
| 無料, タダ, 0円 | iOS name / subtitle, Play title (price word) | description only |
| カジノ, ギャンブル, 賭け, ベット | Vegas is a scoring mode; these words trigger the simulated-gambling reading | ベガス方式のスコア |
| ペイシェンス, 一人トランプ as the game's name | Not what players call it | ソリティア |
| ウェイスト, ファンデーション, タブロー, ストック | Katakana board terms exist in some apps (Tripledot help) but are opaque to casual players; one word per thing | 捨て札, 組札, 場札, 山札 |

**Store / ASO keywords** → table (3) below.

**Sources** → list (4) below.

## (2) Term table: ja

| EN (canonical) | ja | «draft» | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | Latin letters, no space to the next Japanese word in running text («Soliを評価»); a space in the store name «Soli ソリティア» |
| Solitaire | ソリティア | | [F] top apps' titles, Wikibooks, FRVR |
| Klondike | クロンダイク | | [F] Wikibooks, FRVR «クロンダイクソリティア». Known to enthusiasts; casual players know only ソリティア. Katakana, not Latin |
| Patience | *not used* (ペイシェンス) | | Not a Japanese name for the game; en-GB only |
| **Cards** | | | |
| card | カード | | Playing cards as a thing are also トランプ (store text, keywords) |
| deck | デッキ | «draft» | Alt: «トランプ1組（52枚）» in store prose. Never 山札 (that is the stock) |
| suit | マーク | «draft» | [F] Wikibooks, FRVR use マーク; Tripledot and Impress use スート. マーク is the everyday word |
| hearts | ハート | | [F] Impress |
| diamonds | ダイヤ | | [F] Impress. Not ダイヤモンド |
| clubs | クラブ | | [F] Impress. Not クローバー (colloquial) |
| spades | スペード | | [F] Impress |
| rank | 数字 | | [F] Wikibooks. Alt ランク (jargon) |
| Ace | エース | | |
| Jack | ジャック | | |
| Queen | クイーン | | |
| King | キング | | |
| Two … Ten | 2 … 10 (digits) | | Screen reader speaks the digit; no counter word |
| Ace of Spades | `{{suit}}の{{rank}}` → スペードのエース, ハートの10 | | |
| face up / face down | 表向き / 裏向き | | [F] Wikibooks. "Face-down card" = 裏向きのカード |
| **Board** | | | |
| stock | 山札 | | [F] Wikibooks, FRVR, Impress |
| waste | 捨て札 | | [F] FRVR |
| foundation | 組札 | | [F] Wikibooks, FRVR, Impress. «ハートの組札» |
| tableau | 場札 | | [F] Wikibooks, FRVR, Impress |
| column | 列 | | [F]. «{{column}}列目» |
| pass (recycle) | めくり直し | «draft» | Verb: «捨て札を山札に戻す»; counter «残り{{count}}回». Alt noun: 周回 |
| deal (noun) | 配置 | «draft» | «この配置をもう一度», «クリアできる配置». Alts: ディール (loanword, rare), 問題 (puzzle framing). FRVR says 配り方 |
| **Actions** | | | |
| Draw (verb) | めくる | | [F] FRVR/Wikibooks «めくる». Tight: 3 characters |
| Draw 1 … Draw 5 | {{number}}枚めくり | | [F] FRVR «1枚めくり / 3枚めくり». One App Store listing says 1枚引き |
| New Game | 新しいゲーム | | Tight alt: 新規ゲーム |
| Deal Again | 新しく配る | «draft» | Alt: 次のゲーム. Must not read as "same deal again" |
| Retry | 再挑戦 | «draft» | Alts: やり直す, リトライ. A11y: «この配置に再挑戦» |
| Share | 共有 | | [K] iOS and Android share word |
| move (noun) | 手 (HUD: 手数; count: {{count}}手) | | In sentences «…を…に移動» for the action |
| Undo | 元に戻す | | [F] App Store listing «元に戻す»; [K] Google/Microsoft word. Apple's own menus say 取り消す: not used, it collides with キャンセル in meaning |
| time travel | タイムトラベル | | |
| Auto Up | 自動で組札へ | «draft» | Translate, do not keep. Alt: 自動移動. オートアップ means nothing in Japanese |
| **Hints and warnings** | | | |
| Hint | ヒント | | [F] |
| Warnings | 警告 | | Setting title. The notice itself stays calm (no ！) |
| useful move | 役に立つ手 | «draft» | «役に立つ手はもうありません。» Never 有効な手 (see forbidden). Alt: 進展のある手 |
| winnable / unwinnable | クリアできる / クリアできない | | "Unwinnable game" = クリアできないゲーム. Alt family: 勝てる / 勝てない (FRVR) |
| Solvable deals | クリアできる配置 | «draft» | History label "Solvable" = クリア可能. Depends on deal = 配置 |
| **Scoring and statistics** | | | |
| Scoring | スコア方式 | «draft» | Alt: 採点方式 |
| Standard | 標準 | | [K] platform word. Alt スタンダード |
| Vegas | ベガス | «draft» | Cross-language question 1. Alt: Vegas |
| Score | スコア | | |
| Total | 累計 | | Carried balance. «ベガスの累計を引き継ぐ». Alt 合計 (reads as a sum of this game) |
| Time | タイム | | HUD. Setting "Game timer" = タイマー |
| Move counter | 手数の表示 | | |
| Statistics | 統計 | | |
| **App** | | | |
| Play | プレイ | | Alert button "Play" (shared deal) = プレイする |
| History | 履歴 | | Title "Game History" = ゲーム履歴 |
| Games | ゲーム数 | | |
| Solved | クリア | | Status and stat; same word as win |
| Incomplete | 未クリア | «draft» | Alt: 未完了. «未クリアとして記録されます» |
| Active | プレイ中 | | |
| Settings | 設定 | | [K] platform word |
| Gameplay / New Games | ゲームプレイ / 新しいゲーム | | |
| Off | オフ | | [K] platform word |
| Cancel | キャンセル | | [K] platform word |
| Reset | リセット | | [K] platform word |
| win / celebration | クリア / クリア演出 | «draft» | Alt: 勝利. "Nice win!" = «クリアおめでとうございます。» |
| Rate Soli | Soliを評価 | | |
| open source | オープンソース | | |
| ads / no ads | 広告 / 広告なし | | [F] common in listings |
| free | 無料 | | Description only |

## (3) ASO keywords: ja

| Keyword | Why / source |
|---|---|
| ソリティア | The name people type; every top listing leads with it (App Store JP "その他のおすすめ" list) |
| クロンダイク | Exact variant; second keyword of local listings («クロンダイクソリティア», FRVR) |
| トランプ / トランプゲーム | The Japanese word for playing cards; listing titles «クラシックトランプゲーム» |
| カードゲーム | Generic category term; listing subtitles «Klondikeカードゲーム», «定番カードゲーム» |
| クラシック / 定番 | In most top titles («クラシックゲーム», «定番カード») |
| そりてぃあ / ソリテア | Hiragana and misspelt searches; one top listing uses «そりてぃあ» as its subtitle |
| 一人用 / ひとり遊び | What the game is; ソリティア originally means 一人遊び (Wikibooks footnote) |
| 暇つぶし | Common search intent for casual games [K] |
| 広告なし | Soli's differentiator; allowed in keywords and description, not in the Play title |
| オフライン | Common filter; listings stress offline play |
| 脳トレ / パズル | Adjacent search terms used by competitors [K] |
| オープンソース | Differentiator, low volume |

Not to use: competitor names, «無料» in name / subtitle / Play title, «No.1».

## (4) Sources: ja

- [ja Wikibooks: トランプ/クロンダイク](https://ja.wikibooks.org/wiki/%E3%83%88%E3%83%A9%E3%83%B3%E3%83%97/%E3%82%AF%E3%83%AD%E3%83%B3%E3%83%80%E3%82%A4%E3%82%AF): «クロンダイク（ソリティアとも）», footnote that ソリティア comes from the Windows game; 山札, 組札, 場札, マーク, 数字, 表向き / 裏向き, 列. Decided the name and the board terms.
- [FRVR Solitaire, Japanese](https://frvr.com/ja/play/solitaire/): 山札, 捨て札, 組札, 場札, 列, 1枚めくり / 3枚めくり, マーク, です・ます with 〜しましょう. Decided waste, the draw-mode name, register.
- [Tripledot Solitaire help, Japanese](https://solitairetds.zendesk.com/hc/ja/articles/4620971187473-%E9%81%8A%E3%81%B3%E6%96%B9): katakana set ストックパイル, ウェイストパイル, ファンデーションパイル, タブロー, スート, ドロー. Recorded as the rejected alternative.
- [Impress 窓の杜: Microsoft Solitaire Collection review](https://forest.watch.impress.co.jp/docs/review/685868.html): 場札, 山札, 組札, スート（クラブ、ダイヤ、ハート、スペード）. Decided the suit names.
- [App Store JP: Microsoft Solitaire Collection](https://apps.apple.com/jp/app/id1103438575): subtitle «クラシック Solitaire ゲームをプレイしよう!», mode names left in Latin; similar-apps list with the local titles. Showed that Microsoft's listing is no terminology source, and gave the ASO titles.
- [App Store JP: ▻ Solitaire：定番カード](https://apps.apple.com/jp/app/solitaire/id500963785): «スマートヒント», «元に戻す», «1枚引きまたは3枚引き», です・ます. Decided Undo; recorded 引き as the alternative to めくり.
- [Google Play JP: MobilityWare](https://play.google.com/store/apps/details?id=com.mobilityware.solitaire&hl=ja): title «ソリティア‐クラシックカードゲーム» (description not readable).
- Platform words (設定, 共有, キャンセル, リセット, オフ, 取り消す vs 元に戻す): [K], not re-fetched.

## (5) Open doubts: ja

1. **deal = 配置** is the weakest pick. No source gives an established player word; apps avoid the concept. Alternatives ディール, 問題. It drives «クリアできる配置» and the Retry / Share labels.
2. **Win family: クリア vs 勝利 / 勝つ.** Chosen クリア (natural for a one-player game, gives short Solved / Incomplete labels). FRVR uses 勝てる. Must be one family everywhere.
3. **suit = マーク vs スート.** マーク is everyday; スート is correct card jargon. Screen-reader users hear it rarely.
4. **Undo = 元に戻す vs Apple's 取り消す.** The glossary says "platform word"; the two platforms differ. 元に戻す is what solitaire apps and Android use and is unambiguous next to キャンセル.
5. **Auto Up**, **Deal Again**, **pass**: invented phrasings, no source; reviewer to judge naturalness.
6. Tight labels: «新しいゲーム» (6 full-width characters) and «元に戻す» are wider than English; check the dock on a small phone.
7. Vegas → ベガス (cross-language question 1).

---

# Chinese, Simplified (`zh-Hans`)

## (1) Rules section (ready to paste)

### Chinese (Simplified) (`zh-Hans`)

Status: researched 2026-11-23 (R5). Source note: `docs/product/i18n/notes/research-r5-ja-zh-ko.md`.

- **Register:** **你**, never 您, and leave the pronoun out wherever the sentence works without it (most buttons and notices). Friendly and plain; no 亲, no 哦 / 啦 particles, no exclamation-mark marketing. Evidence: FRVR's Chinese page and Apple's own Chinese system text use 你; some store descriptions use 您 (older, stiffer).
- **Name of the game:** **纸牌接龙** (store name «Soli 纸牌接龙»; in the app wherever English says "Solitaire" or "Klondike"). Background: Windows called its Klondike «纸牌»; the largest app is titled «接龙»; each word alone is ambiguous (纸牌 = any playing cards, 接龙 = also the game 排七 and word chains), the compound is not. **克朗代克** is the transliteration of Klondike: few players know it, so it appears once in the store description, as «经典纸牌接龙（克朗代克，Klondike）», and nowhere in the app. Not ours: 空当接龙 (FreeCell), 蜘蛛纸牌 (Spider).
- **Orthography and punctuation:** full-width ，。？！：；（）、 and no space next to them; no space between Chinese characters. **One half-width space between Chinese and a Latin word or a number** («在 Soli 中», «翻 {{number}} 张», «{{count}} 步», «第 {{column}} 列»), as Apple's Chinese text and FRVR do. Exceptions without a space: a card name («黑桃A», «红桃10»), the dollar amount («$52», «-$52»), and a placeholder at the very start or end of the string. Measure words are required after numbers: 张 (cards), 步 (moves), 局 (games), 轮 (passes), 列 (columns). The enumeration comma 、 between list items; ， between clauses. English " — " becomes ， or two sentences («没有有用的走法了。可以撤销，或开始新游戏。»); never a hyphen.
- **Quotes, apostrophes, ellipsis:** “…” (curly, full-width context) for quoted UI words, ‘…’ inside; no 「」. Ellipsis in a UI label is one `…` as in English («正在加载…»); in prose ……. No apostrophes.
- **Plural forms (CLDR, checked by jest):** other (one form). Only `_other`, with `{{count}}` + measure word.
- **Lists for the screen reader:** «{{label}}，{{value}}» with the full-width comma.
- **Short labels:** New Game «新游戏», Hint «提示», Undo «撤销», Draw «翻牌», Score «得分», Moves «步数», Time «用时», Total «累计», Off «关闭».

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| 无路可走, 无牌可走, 没有可走的步, 死局, 游戏结束 (for the useful-moves notice) | Stronger claim than English | 没有有用的走法了 |
| 有效移动 / 有效走法 (for "useful move") | Means "legal move" | 有用的走法 |
| 无解 for "unwinnable" | Says the deal never had a solution; the notice is about the current position | 无法获胜 |
| 求解器, 种子, 算法, 目录 | Developer jargon | 有解牌局, 提示 |
| 最, 最佳, 最好, 第一, 顶级, 全网, 国家级 | Absolute claims: store policy and the PRC Advertising Law | describe the feature |
| 免费 | iOS name / subtitle, Play title (price word) | description only |
| 赌场, 赌博, 博彩, 下注, 真钱, 赢钱, 现金 | Vegas is a scoring mode in play dollars; real-money solitaire apps exist in the China store («玩真钱游戏») and Soli must not read like one | 维加斯计分 |
| 您 | Register rule | 你, or no pronoun |
| 接龙 or 纸牌 alone as the game's name in prose | Ambiguous (see name rule); fine as keywords | 纸牌接龙 |
| 国王, 皇后, 王后, 杰克 for K / Q / J | Not how cards are named in Chinese | K, Q, J (see term table) |

**Store / ASO keywords** → table (3) below.

**Sources** → list (4) below.

## (2) Term table: zh-Hans

| EN (canonical) | zh-Hans | «draft» | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | Latin letters, a space on each side inside Chinese text |
| Solitaire | 纸牌接龙 | | [F] FRVR «纸牌接龙»; Wikipedia: Windows 纸牌, «由纸牌游戏接龙改编»; Play title of the largest app «接龙» |
| Klondike | 克朗代克 | «draft» | [F] one CN listing «克朗代克纸牌游戏». Poorly known: store description only, once, with the gloss. In the app "Klondike" = 纸牌接龙. Alt: 经典接龙 |
| Patience | *not used* (单人纸牌) | | 单人纸牌 is the descriptive genre word ([F] listing «单人纸牌游戏»), good as a keyword |
| **Cards** | | | |
| card | 牌 | | Measure word 张. 纸牌 in compounds, 扑克牌 for the physical cards (store text) |
| deck | 一副牌 | | «一副 52 张的牌» |
| suit | 花色 | | [K] standard |
| hearts | 红桃 | | [F] FRVR «红桃、黑桃、梅花和方块» |
| diamonds | 方块 | | [F] FRVR. Not 方片 (regional) |
| clubs | 梅花 | | [F] FRVR |
| spades | 黑桃 | | [F] FRVR |
| rank | 点数 | | [F] search result text «点数递减» |
| Ace | A | «draft» | The letter is the spoken name (cross-language question 3). Alt: 尖 (colloquial, regional): not recommended |
| Jack | J | «draft» | As above |
| Queen | Q | «draft» | As above |
| King | K | «draft» | As above |
| Two … Ten | 2 … 10 (digits) | | |
| Ace of Spades | `{{suit}}{{rank}}` → 黑桃A, 红桃10 | | No space, no 的 |
| face up / face down | 正面朝上 / 背面朝上 | | "Face-down card" = 未翻开的牌 (shorter when spoken; FRVR: «翻开扣着的牌») |
| **Board** | | | |
| stock | 牌库 | «draft» | [F] search text «牌库与废牌堆». Alt: 牌堆 (FRVR), but 牌堆 is also the generic word "pile" inside 弃牌堆 / 基础牌堆, so it breaks "one word per thing" |
| waste | 弃牌堆 | | [F] FRVR (also 废牌堆 on the same page) |
| foundation | 基础牌堆 | «draft» | [F] FRVR, search text. Alts: 收牌区 (fits 自动收牌), 目标区 (FRVR gloss). Wikipedia says 底座 |
| tableau | 牌桌 | «draft» | [F] FRVR «牌桌：由七列牌组成». Alt: 牌阵 |
| column | 列 | | «第 {{column}} 列» |
| pass (recycle) | 轮 | | [F] search text «牌库可过一轮». Verb: «把弃牌堆翻回牌库»; «剩 {{count}} 轮» |
| deal (noun) | 牌局 | | Distinct from 游戏 (game). «重玩这局牌», «有解牌局» |
| **Actions** | | | |
| Draw (verb) | 翻牌 | | [F] Wikipedia «翻一张牌», FRVR «翻一张». Tight: 2 characters |
| Draw 1 … Draw 5 | 翻 {{number}} 张 | | [F] FRVR 翻一张 / 翻三张 (we need the digit). One CN listing says “抽 1” |
| New Game | 新游戏 | | |
| Deal Again | 再来一局 | | Everyday phrase for "another round" |
| Retry | 重玩 | | A11y: 重玩这局牌 |
| Share | 分享 | | [K] iOS and Android share word in Chinese (共享 is for shared access) |
| move (noun) | 步 (HUD: 步数; count: {{count}} 步) | | In sentences the noun is 走法 and the verb 移到 |
| Undo | 撤销 | | [F] third-party listing «撤销永久免费»; [K] Apple's word. Microsoft / Google write 撤消: not used |
| time travel | 时光穿梭 | «draft» | Alt: 时间旅行 (literal) |
| Auto Up | 自动收牌 | | Translate. [K] the usual label in Chinese solitaire apps |
| **Hints and warnings** | | | |
| Hint | 提示 | | [F] |
| Warnings | 提醒 | «draft» | Calm word for a quiet notice. Alt: 警告 (literal, harsher) |
| useful move | 有用的走法 | | «没有有用的走法了». Never 有效 (legal) |
| winnable / unwinnable | 能赢 / 无法获胜 | | "Unwinnable game" = 无法获胜的牌局. [F] FRVR «能赢». Never 无解 here |
| Solvable deals | 有解牌局 | «draft» | History label "Solvable" = 有解. Alt: 可解牌局 |
| **Scoring and statistics** | | | |
| Scoring | 计分 | | [F] Wikipedia «计分模式» |
| Standard | 标准 | | [F] Wikipedia «标准计分模式» |
| Vegas | 维加斯 | «draft» | [F] Wikipedia «维加斯计分模式», listing «维加斯 (Vegas) 评分». Cross-language question 1. Alt: Vegas |
| Score | 得分 | | Alt 分数 |
| Total | 累计 | | Carried balance. «保留维加斯累计» |
| Time | 用时 | | Setting "Game timer" = 计时器 |
| Move counter | 显示步数 | | |
| Statistics | 统计 | | |
| **App** | | | |
| Play | 游戏 | «draft» | Drawer entry (noun). Alert button "Play" = 开始. Alt for the drawer: 开始游戏 |
| History | 历史记录 | | Title "Game History" = 游戏记录 |
| Games | 局数 | | |
| Solved | 获胜 | | Status may read 已获胜 |
| Incomplete | 未完成 | | |
| Active | 进行中 | | |
| Settings | 设置 | | [K] platform word |
| Gameplay / New Games | 玩法 / 新游戏 | | |
| Off | 关闭 | | [K] platform word. If the picker is too tight: 关 |
| Cancel | 取消 | | [K] platform word |
| Reset | 重置 | | [K]. Apple's Settings app says 还原; 重置 is the common app word |
| win / celebration | 获胜 / 庆祝动画 | | |
| Rate Soli | 给 Soli 评分 | | |
| open source | 开源 | | |
| ads / no ads | 广告 / 无广告 | | |
| free | 免费 | | Description only |

## (3) ASO keywords: zh-Hans

| Keyword | Why / source |
|---|---|
| 纸牌 | Windows' name for the game; head term (Wikipedia 纸牌 (电子游戏); CN listing «纸牌 - 经典的纸牌游戏») |
| 接龙 | Title of the largest app on Play (MobilityWare «接龙»); CN listing «接龙经典卡牌游戏» |
| 纸牌接龙 | The unambiguous compound; FRVR, third-party «经典纸牌接龙» |
| 单人纸牌 | Descriptive genre term in CN listing titles («单人纸牌游戏») |
| 扑克 / 扑克牌 | What people call playing cards; CN listing «扑克牌游戏», «扑克接龙» |
| 克朗代克 | Exact variant; low volume, no competition (CN listing title) |
| 经典 | In nearly every title («经典纸牌», «经典单人纸牌游戏») |
| 单机 / 离线 | "Offline / single-player" filter terms common in Chinese stores [K] |
| 无广告 | Differentiator; keywords and description, not the Play title |
| 休闲 / 益智 | Category words people filter by [K] |
| 开源 | Differentiator, low volume |

Not to use: 空当接龙 and 蜘蛛纸牌 (other games: misleading), competitor names, 免费 in name / subtitle / Play title, absolute claims, any real-money word.

## (4) Sources: zh-Hans

- [zh Wikipedia: 纸牌 (电子游戏)](https://zh.wikipedia.org/zh-cn/纸牌_(电子游戏)): Windows' game is «纸牌», «由纸牌游戏接龙改编»; «翻一张牌 / 翻三张牌», «标准计分模式», «维加斯计分模式», 底座. Decided the name discussion, Draw, Scoring, Standard, Vegas.
- [zh Wikipedia: 接龙 (纸牌游戏)](https://zh.wikipedia.org/zh-cn/接龍_(紙牌遊戲)): 接龙 is the family name and also 排七; 空当接龙, 新接龙 are other games. Decided that 接龙 alone is ambiguous.
- [FRVR Solitaire, Simplified Chinese](https://frvr.com/zh-Hans/play/solitaire/): «纸牌接龙», 牌堆, 弃牌堆 / 废牌堆, 基础牌堆 / 目标区, 牌桌, 列, 翻一张 / 翻三张, 红桃、黑桃、梅花和方块, 你, spaces around Latin and digits («红色 8 放在黑色 9 上», «52 张牌»). Decided the board terms, suits, register, spacing.
- [App Store CN: 克朗代克纸牌游戏 · 单人纸牌游戏](https://apps.apple.com/cn/app/%E5%85%8B%E6%9C%97%E4%BB%A3%E5%85%8B%E7%BA%B8%E7%89%8C%E6%B8%B8%E6%88%8F-%E5%8D%95%E4%BA%BA%E7%BA%B8%E7%89%8C%E6%B8%B8%E6%88%8F/id1524525411): «克朗代克», «扑克接龙 (Klondike Solitaire)», “抽 1”或“抽 3”, «维加斯 (Vegas) 评分», uses 您. Evidence for 克朗代克, the 抽 alternative, Vegas in Chinese.
- [App Store CN: 纸牌 - 经典的纸牌游戏](https://apps.apple.com/cn/app/%E7%BA%B8%E7%89%8C-%E7%BB%8F%E5%85%B8%E7%9A%84%E7%BA%B8%E7%89%8C%E6%B8%B8%E6%88%8F/id1472489660): subtitle «玩真钱游戏» (a real-money app); Apple's own page text uses 你 and spaces («iOS 13.0 或更高版本»). Decided the real-money word trap and supported the spacing rule.
- [Google Play zh-CN: MobilityWare](https://play.google.com/store/apps/details?id=com.mobilityware.solitaire&hl=zh-CN): title «接龙» (description not readable).
- [快科技 2013: Microsoft Solitaire Collection](https://news.mydrivers.com/1/284/284235.htm) (search snippet): «Klondike（纸牌）», FreeCell = 空当接龙, Spider = 蜘蛛纸牌.
- China store requirement: [AppInChina on Apple's game licence rule](https://appinchina.co/blog/update-apples-new-requirements-for-games-on-the-apple-app-store-china), [Niko Partners](https://nikopartners.com/?p=6136), [SCMP](https://www.scmp.com/abacus/games/article/3052563/why-apples-new-rules-games-china-could-spell-trouble-indies): the approval number (ISBN) is asked for paid games and games with in-app purchases; all 2020 reporting.
- Platform words (设置, 分享, 取消, 关闭, 撤销 vs 撤消, 重置 vs 还原) and 自动收牌: [K], not re-fetched.

## (5) Open doubts: zh-Hans

1. **China mainland availability.** Per the 2020 reporting, Apple asks for a game licence number only for paid games or games with in-app purchases, so a free game without purchases was not blocked then. Not verified for 2026. Google Play does not operate in mainland China. zh-Hans still serves Singapore, Malaysia and Chinese speakers abroad. Karim's call whether to list in the China storefront at all.
2. **Face cards as letters A / J / Q / K** (cross-language question 3): needs the orchestrator's exception.
3. **stock = 牌库 vs 牌堆**, **foundation = 基础牌堆 vs 收牌区**, **tableau = 牌桌 vs 牌阵**: sources agree on FRVR's set except that 牌堆 is overloaded. A native reviewer should confirm 牌库 reads naturally for a solitaire stock (it is familiar from digital card games).
4. **Name in the app: 纸牌接龙 for both "Solitaire" and "Klondike".** Two English terms map to one Chinese word in the app; the share text then says «在 Soli 中玩这局纸牌接龙（翻 {{number}} 张）».
5. **Spacing rule** (space between Chinese and Latin / digits, none inside card names and `$` amounts): a convention, not a standard; decided once here, reviewer to enforce consistently.
6. **Warnings = 提醒 vs 警告**, **Play = 游戏**, **time travel = 时光穿梭**: tone picks.
7. Vegas → 维加斯 (cross-language question 1).

---

# Korean (`ko`)

## (1) Rules section (ready to paste)

### Korean (`ko`)

Status: researched 2026-11-23 (R5). Source note: `docs/product/i18n/notes/research-r5-ja-zh-ko.md`.

- **Register:** **해요체** for every full sentence: notices, alert messages, descriptions, tips («…할 수 있어요.», «새 게임을 시작할까요?», «…해 보세요.»). Labels, buttons, titles and picker values are noun-style and short («새 게임», «실행 취소», «뽑기», «다시 하기», «끔»): no sentence ending, no final period. No «당신»; drop the subject. No 하십시오체 («…하십시오»), no 반말. Evidence: FRVR's Korean page is 해요체 throughout; store descriptions of older apps use 합니다체 (often machine-translated). 해요체 matches Soli's calm, friendly tone and current Korean consumer apps. «draft»: the alternative is 합니다체 for statements with «…하세요» for requests.
- **Name of the game:** **솔리테어** (store name «Soli 솔리테어»). **클론다이크** is the exact variant: understood by players and used in listings («클론다이크 솔리테어», subtitle «클론다이크 · 1장/3장 뽑기»); use it where English says "Klondike". «카드놀이» is the old Windows name for the same game: a keyword, not Soli's word.
- **Orthography and punctuation:** standard spacing (띄어쓰기): words are separated, particles attach. Counters attach to the digit without a space: «{{count}}장», «{{count}}회», «{{column}}열», «{{count}}분», «{{count}}달러». A space between Soli and a following noun («Soli 평가하기»); particles attach to it («Soli에서»). Half-width Western punctuation . , ? ! : and a normal space after it; no full-width punctuation. English " — " becomes two sentences. `$` as in English («$52», «-$52»).
- **Particles after placeholders:** 을/를, 이/가, 은/는, 와/과, (으)로 depend on the last sound of the value, which the app cannot know. **Never put such a particle directly after a `{{placeholder}}`.** Rephrase so the placeholder is followed by a comma, a colon, a fixed noun or a counter («힌트: {{card}}, {{column}}열로 이동»), never «{{card}}을(를)».
- **Quotes, apostrophes, ellipsis:** “…” for quoted UI words, ‘…’ inside; ellipsis is one `…` («기록 불러오는 중…»).
- **Plural forms (CLDR, checked by jest):** other (one form). Only `_other`; no plural marker 들.
- **Short labels:** New Game «새 게임», Hint «힌트», Undo «실행 취소», Draw «뽑기», Score «점수», Moves «이동», Time «시간», Total «누적», Off «끔».

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| 유효한 이동, 가능한 이동 (for "useful move") | Means "legal / possible move": the stronger claim | 도움이 되는 이동 |
| 게임 오버, 패배, 졌어요 | Claims the game is lost | the sentence with 도움이 되는 이동 |
| 솔버, 시드, 알고리즘, 카탈로그 | Developer jargon | 풀 수 있는 판, 힌트 |
| 최고, 1위, 넘버원, 인기 1위 | Store policy and the Korean fair-labelling rules on superlative claims | describe the feature |
| 무료, 공짜 | iOS name / subtitle, Play title (price word) | description only |
| 카지노, 도박, 베팅, 배팅, 현금, 머니 | Vegas is a scoring mode; simulated-gambling wording affects the Korean age rating (GRAC) and Apple's rating question | 베가스 점수 방식 |
| 당신 | Sounds translated | no subject |
| `{{x}}을(를)`, `{{x}}이(가)`, `{{x}}(으)로` | Particle rule above | rephrase |
| 재단, 재고, 소송 (for foundation, stock, suit) | Machine-translation words seen in a top listing | 파운데이션, 스톡, 무늬 |

**Store / ASO keywords** → table (3) below.

**Sources** → list (4) below.

## (2) Term table: ko

| EN (canonical) | ko | «draft» | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | Latin letters; particles attach directly («Soli에서») |
| Solitaire | 솔리테어 | | [F] Play title of the largest app «솔리테어»; App Store KR titles; FRVR |
| Klondike | 클론다이크 | | [F] FRVR «클론다이크 솔리테어», listing subtitle «클론다이크 · 1장/3장 뽑기». One word, no space |
| Patience | *not used* (페이션스) | | Not a Korean name for the game. The old local name is 카드놀이 ([F] mimmi «한국어판: 카드놀이») |
| **Cards** | | | |
| card | 카드 | | Counter 장 |
| deck | 덱 | | [F] mimmi «카드 덱(24장)». Store prose may say «카드 한 벌(52장)» |
| suit | 무늬 | | [F] mimmi «무늬» (also 문양) |
| hearts | 하트 | | [F] FRVR |
| diamonds | 다이아몬드 | | [F] FRVR |
| clubs | 클로버 | | [F] FRVR. The everyday Korean word; 클럽 is the formal one and sounds like "club" |
| spades | 스페이드 | | [F] FRVR |
| rank | 숫자 | | Alt 랭크 (jargon) |
| Ace | 에이스 | | |
| Jack | 잭 | | |
| Queen | 퀸 | | |
| King | 킹 | | |
| Two … Ten | 2 … 10 (digits) | | |
| Ace of Spades | `{{suit}} {{rank}}` → 스페이드 에이스, 하트 10 | | With a space, no 의 |
| face up / face down | 앞면 / 뒷면 | | [F] mimmi «뒷면 카드», «앞면으로 뒤집힌 카드». "Face-down card" = 뒷면 카드 |
| **Board** | | | |
| stock | 스톡 | «draft» | [F] FRVR «스톡 더미», mimmi «스톡 (카드 더미)». Alt: 뽑기 더미 (self-explaining, fits 뽑기) |
| waste | 버림 더미 | «draft» | [F] FRVR «버림 더미» (its main word is 탈론 더미). Alt: 웨이스트 (mimmi) |
| foundation | 파운데이션 | | [F] FRVR, mimmi, App Store KR listing. «하트 파운데이션» |
| tableau | 테이블 | «draft» | [F] FRVR «테이블: 일곱 개의 열로 이루어진 플레이 영역». Alt: 타블로 (mimmi) |
| column | 열 | | [F] FRVR. «{{column}}열» |
| pass (recycle) | 스톡 다시 쓰기 | «draft» | Counter 회: «{{count}}회 남음». A11y: «버림 더미를 스톡으로 되돌리기». FRVR: «뒤집어서 … 다시 쓸 수 있어요» |
| deal (noun) | 판 | «draft» | Native "round": «이 판 다시 하기», «풀 수 있는 판». Alt: 카드 배치. Not 딜 |
| **Actions** | | | |
| Draw (verb) | 뽑기 | | [F] FRVR. Tight: 2 characters |
| Draw 1 … Draw 5 | {{number}}장 뽑기 | | [F] FRVR «1장 뽑기 / 3장 뽑기», listing subtitle |
| New Game | 새 게임 | | |
| Deal Again | 한 판 더 | «draft» | Everyday "one more round". Alt: 새 게임 시작 |
| Retry | 다시 하기 | | A11y: 이 판 다시 하기 |
| Share | 공유 | | [K] platform word |
| move (noun) | 이동 (HUD: 이동; count: {{count}}회 이동) | | Setting: 이동 횟수 |
| Undo | 실행 취소 | «draft» | [F] KR listing «무제한 실행 취소», mimmi «[실행 취소] 버튼»; [K] platform word. Wide for the dock; alt 되돌리기 (shorter, common in games) |
| time travel | 시간 여행 | | |
| Auto Up | 자동 올리기 | «draft» | Translate. Alt: 자동 이동. (자동 완성 in listings is auto-complete at the end of a game: a different feature) |
| **Hints and warnings** | | | |
| Hint | 힌트 | | [F] mimmi |
| Warnings | 경고 | | Not 알림 (that is "notifications") |
| useful move | 도움이 되는 이동 | «draft» | «도움이 되는 이동이 더 없어요.» Alt: 유용한 이동 (shorter, but one letter away from 유효한 = "valid") |
| winnable / unwinnable | 이길 수 있는 / 이길 수 없는 | | "Unwinnable game" = 이길 수 없는 게임. [F] FRVR «이겨요» |
| Solvable deals | 풀 수 있는 판 | «draft» | History label "Solvable" = 풀 수 있음. Alt: 승리 가능한 판 |
| **Scoring and statistics** | | | |
| Scoring | 점수 방식 | | |
| Standard | 표준 | | [F] search text «표준 점수». Alt 스탠더드 |
| Vegas | 베가스 | «draft» | [F] search text «베가스 방식 점수». Cross-language question 1. Alt: Vegas |
| Score | 점수 | | |
| Total | 누적 | | Carried balance. «베가스 누적 점수 유지». Alt 합계 |
| Time | 시간 | | Setting "Game timer" = 게임 타이머 |
| Move counter | 이동 횟수 | | |
| Statistics | 통계 | | [F] KR listing «통계» |
| **App** | | | |
| Play | 플레이 | «draft» | Alt for the drawer: 게임. Alert button "Play" = 플레이 |
| History | 기록 | | Title "Game History" = 게임 기록 |
| Games | 게임 수 | | |
| Solved | 승리 | | Same word as win |
| Incomplete | 미완료 | | |
| Active | 진행 중 | | |
| Settings | 설정 | | [K] platform word |
| Gameplay / New Games | 게임 플레이 / 새 게임 | | |
| Off | 끔 | | [K] iOS word. Android also shows 사용 안 함 (too long) |
| Cancel | 취소 | | [K] platform word |
| Reset | 초기화 | «draft» | Natural for "back to zero". Alt: 재설정 (Apple's word for resetting settings) |
| win / celebration | 승리 / 승리 축하 애니메이션 | | "Nice win!" = «멋진 승리예요!» |
| Rate Soli | Soli 평가하기 | | |
| open source | 오픈 소스 | | Standard spacing; 오픈소스 is the common unspaced form (keyword) |
| ads / no ads | 광고 / 광고 없음 | | |
| free | 무료 | | Description only |

## (3) ASO keywords: ko

| Keyword | Why / source |
|---|---|
| 솔리테어 | The name people type; Play title of the largest app, most App Store KR titles |
| 클론다이크 | Exact variant, used in titles and subtitles («클론다이크 솔리테어 Elite», «클론다이크 · 1장/3장 뽑기») |
| 카드놀이 / 카드 놀이 | Old Windows name of the game (mimmi; listing «스파이더 카드 놀이») |
| 카드게임 / 카드 게임 | Generic category term in titles («클래식 카드 게임», «카드게임») |
| 클래식 | In most titles («솔리테어 클래식») |
| 솔리테이어 / 솔리테르 | Misspelt searches; the first appears in a listing's own text |
| 트럼프 / 트럼프 카드 | Korean everyday word for playing cards [K] |
| 혼자 / 1인용 | What the game is [K] |
| 오프라인 | Common filter [K] |
| 광고 없는 / 광고 없음 | Differentiator; keywords and description, not the Play title |
| 두뇌 / 퍼즐 | Adjacent terms; listings use «두뇌를 훈련» |
| 오픈소스 | Differentiator, low volume |

Not to use: 프리셀, 스파이더 (other games), competitor names, 무료 in name / subtitle / Play title, superlatives.

## (4) Sources: ko

- [FRVR Solitaire, Korean](https://frvr.com/ko/play/solitaire/): «솔리테어», «클론다이크 솔리테어», 스톡 더미, 탈론 더미 / 버림 더미, 파운데이션 더미, 테이블, 열, 1장 뽑기 / 3장 뽑기, 하트 / 스페이드 / 클로버 / 다이아몬드, 해요체 throughout. Decided the board terms, suits, draw-mode name, register.
- [mimmi.co.kr solitaire guide](https://mimmi.co.kr/solitaire/): «솔리테어 (한국어판: 카드놀이)», 스톡 / 웨이스트 / 파운데이션 / 타블로, «[실행 취소]», «[힌트]», 무늬, 앞면 / 뒷면, 합니다체 with «…세요». Decided Undo, Hint, suit, face up / down; source for 카드놀이.
- [App Store KR: 솔리테어 (클래식 카드 게임)](https://apps.apple.com/kr/app/%EC%86%94%EB%A6%AC%ED%85%8C%EC%96%B4-%ED%81%B4%EB%9E%98%EC%8B%9D-%EC%B9%B4%EB%93%9C-%EA%B2%8C%EC%9E%84/id1454538656): machine-translated description (재단, 재고, 소송, 당신), «무제한 실행 취소», «통계»; list of local titles. Source for the mistranslation trap list and the ASO titles.
- [App Store KR: 클론다이크 솔리테어 Elite](https://apps.apple.com/kr/app/%ED%81%B4%EB%A1%A0%EB%8B%A4%EC%9D%B4%ED%81%AC-%EC%86%94%EB%A6%AC%ED%85%8C%EC%96%B4-elite/id949782856): «클론다이크 솔리테어», 파운데이션, 합니다체; similar app «솔리테어 · 클래식» with subtitle «클론다이크 · 1장/3장 뽑기». Showed that 클론다이크 is used towards players.
- [Google Play KR: MobilityWare](https://play.google.com/store/apps/details?id=com.mobilityware.solitaire&hl=ko): title «솔리테어» (description not readable).
- [wavespeed.ai Korean solitaire page](https://wavespeed.ai/ko/free-tools/solitaire) (search snippet): 실행 취소, 버린 더미, 열, 파운데이션, 표준 점수.
- Platform words (설정, 공유, 취소, 끔, 재설정) and the rating / labelling rules: [K], not re-fetched.

## (5) Open doubts: ko

1. **Register 해요체** is a judgment call (FRVR and modern Korean apps) against 합니다체 (older listings, system dialogs). Both are polite; it must be one.
2. **Undo = 실행 취소** is the platform and competitor word but wide on the dock (five characters and a space). If it truncates: 되돌리기.
3. **stock = 스톡, waste = 버림 더미, tableau = 테이블**: Korean sources mix loanwords and native words with no single standard. The picks follow FRVR; a native reviewer may prefer the all-loanword set (스톡 / 웨이스트 / 파운데이션 / 타블로) or the descriptive 뽑기 더미.
4. **deal = 판** and **Deal Again = 한 판 더**: natural Korean, but 판 also means "a game". History then has 게임 (count) and 판 (the layout) side by side.
5. **useful move = 도움이 되는 이동** vs the shorter 유용한 이동 (typo-prone next to 유효한).
6. **Particles after placeholders**: the hint and a11y strings must be restructured; the translator needs to know which placeholders hold card names. `en.context.json` did not exist yet when this was written.
7. **GRAC / simulated gambling**: stated from knowledge, not verified. Soli has no betting, so the risk is in wording only.
8. Vegas → 베가스 (cross-language question 1).
