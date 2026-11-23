# Translator notes: Japanese (`ja`)

2026-11-23, whole-file run.

## Files written

- `src/i18n/locales/ja.json`: 134 keys (English has 143; the 9 `_one` forms are dropped, Japanese has only `_other`). Same nesting and key order as `en.json`.
- `store/ios/ja/`: `name.txt` (10 chars), `subtitle.txt` (17), `keywords.txt` (98), `promotional_text.txt` (73), `description.txt` (405)
- `store/android/ja-JP/`: `title.txt` (10), `short_description.txt` (42), `full_description.txt` (405)
- `store/release-notes/ja.txt` (102)

Checks: `yarn jest test/unit/i18n test/unit/store` → every `ja` / `ja-JP` test passes. The only failure in the run is `ios/de-DE` keywords (101 characters), not a Japanese file. `ja` is not registered in `src/i18n/index.ts` yet, so the locale tests did not cover `ja.json`; a node self-check confirmed key parity and order, identical placeholder sets, no `_one` keys, no value identical to English.

## Uncertain terms

| Key | EN | Choice | Alternative | Why |
|---|---|---|---|---|
| `about.dedication` | my girlfriend T | 彼女のT | 恋人のT | 彼女 is the everyday word for a girlfriend and cannot read as "a female friend" in «彼女のT». 恋人 is unambiguous but a little literary. ガールフレンド avoided (can read as a female friend) |
| `about.promise` | gamification | 仕掛け («もっと遊ばせるための仕掛け») | ゲーミフィケーション | The loanword is business jargon; 仕掛け says what is meant |
| `about.madeBy` | Made by | 作者： | 制作： | Japanese puts the name last only with a label; the context note allows a label |
| `notice.undoTip` | Tip: | no label | コツ： | ヒント is the natural word for both "tip" and "hint"; the glossary says to drop the label then |
| `notice.unwinnable` | No winning moves left | クリアにつながる手はもうありません | このゲームはもうクリアできません | Keeps the "moves" framing and stays clearly stronger than `notice.stuck` (役に立つ手) |
| `game.newGameAlert.message` | Ready for another round? | もう1ゲーム遊びますか？ | 次のゲームに進みますか？ | No fixed idiom; kept short and calm |
| `game.newGameAlert.messageWon` | Nice win! | クリアおめでとうございます。 | ナイスクリア！ | From the research note; 。 instead of ！ although English has one (calmer; reviewer may switch to ！) |
| `settings.cardsDrawn` | Cards drawn | めくる枚数 | めくり方 | Row label next to the «{{number}}枚めくり» picker |
| `settings.warnings.noUsefulMoves` | No more useful moves | 役に立つ手がない | 役に立つ手なし | Picker option, 8 characters |
| `settings.warnings.unwinnable` | Unwinnable game | クリアできないゲーム | クリア不可 | Research note wording; 10 characters, wider than the other option (see tight list) |
| `settings.showTime` | Game timer | タイマーの表示 | ゲームタイマー | Parallel to «手数の表示» |
| `settings.vegasTotal.description` | The header | 画面上部 | ヘッダー | ヘッダー is developer-ish; the context note says it is the badge at the top of the game screen |
| `history.dealName` | Deal {{code}} | 配置{{code}} | 配置 {{code}} | No-space rule between Japanese and Latin/digits. «配置2345-6789» reads slightly cramped; a device look is worth it |
| `history.score`, `history.vegas` | Score {{value}} | スコア{{value}}, ベガス{{value}} | with a space | Same rule. «ベガス−$17» is the awkward case |
| `history.today`, `history.yesterday`, `history.dateTime` | Today, {{time}} | 今日 {{time}}, 昨日 {{time}}, {{date}} {{time}} | 今日{{time}} | Deliberate exception to the no-space rule: `Intl` itself formats Japanese date + time with a space («7月6日 14:05»), and iOS shows «今日 14:05» |
| `history.emptyBody` | Completed games | 終了したゲーム | 完了したゲーム | The list also holds 未クリア games, so "ended" rather than "completed/cleared" |
| `a11y.scrubber` | position {{position}} of {{total}} | {{total}}手中{{position}}手目 | 位置{{position}}／{{total}} | A slash is spoken unreliably; steps of the timeline are moves, so the counter 手 fits |
| `a11y.stockExhausted` | no passes left | めくり直しの残りなし | これ以上めくり直せません | Uses the glossary noun めくり直し («draft») |
| `a11y.hint.*` | move {{card}} to … | {{card}}を…に移動します | {{card}}、…へ | A particle follows the placeholder. Japanese particles never change with the word, so the "placeholder stands bare" rule (written for case endings and Korean particle pairs) is not broken in substance. Flagging it anyway |
| `nav.notFoundLink` | Go to home screen! | ホーム画面に戻る | ホーム画面へ！ | Link label, plain form, no ！ |
| store subtitle | No ads. Every deal winnable. | 広告なし。どの配置もクリアできます | 広告なし・全ゲームクリア可能 | 配置 («draft») is the weakest glossary term and here it is in the most visible spot. If deal becomes something else, the subtitle and short description change too |
| store name / title | Soli: Klondike Solitaire | Soli ソリティア | Soli：クロンダイクソリティア | Glossary gives «Soli ソリティア». The longer form (16 chars) would index クロンダイク in the title; now it is a keyword on iOS and in the Play descriptions |
| store description | streaks | 連続プレイ記録 | ストリーク | No short established word; ストリーク is not widely understood |
| store description | Made in Switzerland | スイス生まれ (description), スイス製 (promo text) | スイスで開発 | スイス製 is compact for the 170 limit; スイス生まれ is warmer in prose |

## Tight keys longer than English (in display width; full-width characters are about twice as wide)

- `game.newGame` 新しいゲーム (6 full-width), `game.undo` 元に戻す (4): already flagged in the research note, check the header and dock on a small phone.
- `game.newGameAlert.confirm` 新しく配る (5), `game.playDeal.sharedConfirm` プレイする (5): dialog buttons, should fit.
- `settings.warnings.unwinnable` クリアできないゲーム (10): now the widest picker option, wider than `noUsefulMoves` (8). Fallback: クリア不可.
- `common.drawMode` 1枚めくり (5), `hud.*` (2 to 3 characters), `game.draw` めくる (3), `game.recyclesLeft` 残り3回 (4): inside the limits.

## Keywords (iOS)

`クロンダイク,トランプ,カードゲーム,クラシック,定番,そりてぃあ,ソリテア,一人用,ひとり遊び,暇つぶし,オフライン,脳トレ,パズル,オープンソース,ヒント,klondike,solitaire` (98 characters). ソリティア and 広告なし are left out because they are in the name / subtitle. `klondike` and `solitaire` in Latin letters are my addition (not in the keyword table): Japanese users also type the English name, and the Japanese name field has no Latin game word. Drop them if the reviewer disagrees.

## Source oddities

- `nav.notFoundLink` "Go to home screen!" has an exclamation mark on a link; reads odd next to the calm tone rule.
- `history.emptyBody` says "Completed games … will appear here", but abandoned games are listed too (status Incomplete).
- `settings.section.newGames` and `game.newGame` end up as the same Japanese string (新しいゲーム); the glossary prescribes both, and they never share a screen.
- `a11y.scrubber`: "position" has no unit, so every language has to invent one.
- Store description "Optional Hint button": "optional" does not say it is off by default; I wrote «設定でオンにできます», which matches the release notes.

## Feedback on the brief

- The glossary is 190 KB; reading it "in full" is not possible in one go. A per-language extract (top note + All languages + own section + own column + forbidden words) would save every translator the slicing.
- The example phrases in the research note's term table (`research-r5-ja-zh-ko.md`) were more useful than the glossary column; the skill's "Read first" list could name it.
- The no-space rule between Japanese and Latin/digits needs a line on placeholders that hold dates, times, codes and amounts (see the three rows above).
- The locale tests skip unregistered locales, so a translator's jest run proves nothing about its JSON until the orchestrator registers it; the skill could say so and ship the self-check one-liner.
