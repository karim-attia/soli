# Review V5: ja, zh-Hans, ko

2026-11-23, reviewer for the group [ja, zh-Hans, ko] (plan step 7.1). Read: skill, glossary (All languages, the three sections, Table 3, forbidden words), `en.json` + `en.context.json`, the three locale files, the store folders, release notes, translator notes, research note R5.

Checks after the edits: node check (key parity and order, placeholder sets, only `_other`, no empty value, no Korean particle directly after a placeholder) clean for all three; `yarn jest test/unit/store test/unit/i18n` → 4 suites, 68 tests passed. The glossary was not edited (other reviewers work on the same file in parallel): everything for it is under "Glossary proposals".

## Changes made

### ja

| Where | Before | After | Why |
|---|---|---|---|
| `game.playDeal.sharedConfirm` (tight) | プレイする | プレイ | 2.5× the English width; glossary Play = プレイ, same word as the drawer item |
| `settings.warnings.unwinnable` (tight) | クリアできないゲーム | クリアできない | Was wider than `noUsefulMoves`, which the context calls the widest; now parallel to 役に立つ手がない |
| `game.newGameAlert.messageWon` | …おめでとうございます。 | …おめでとうございます！ | English has "!"; the glossary allows ！ exactly there |
| `notice.undoTip` | ゲームの流れをタイムトラベル | ゲームの中をタイムトラベル | 流れを as the object of タイムトラベル reads oddly |
| `settings.vegasTotal.resetMessage` | $0からやり直しになります … そのままカウントされます | $0から再スタートします … 引き続きカウントされます | Natural phrasing |
| `history.dealName`, `history.score`, `history.vegas` | 配置{{code}}, スコア{{value}}, ベガス{{value}} | 配置 {{code}}, スコア {{value}}, ベガス {{value}} | Spacing rule resolved, see below |
| store description (ios + android) | 「自動で組札へ」がカードを組札に動かします | 「自動で組札へ」：カードを自動で組札に移動します | A feature name as the subject of 動かす is translated-sounding; same form as the other bullets |

### zh-Hans

| Where | Before | After | Why |
|---|---|---|---|
| `a11y.hint.toColumn`, `a11y.hint.toFoundation` | 把 {{card}} 移到… | 把{{card}}移到… | `{{card}}` is a Chinese card name (黑桃A): no space between Chinese characters, and the glossary lists card names as a no-space exception |
| iOS subtitle | 无广告，每局都有解 | 无广告，每局都能赢 | English says "winnable", glossary winnable = 能赢; 有解 reads like a maths puzzle in the most visible line. The setting name 有解牌局 is unchanged |
| Play short description | 安静的纸牌接龙。每局都有解，无限撤销。 | 安安静静玩一局纸牌接龙。每局都能赢，无限撤销。 | 安静的 means "silent" for an app; same 能赢 as the subtitle |
| store description (ios + android) | 会有一条安静的提醒 | 会轻轻提醒你 | Literal "a quiet notice" |

### ko

| Where | Before | After | Why |
|---|---|---|---|
| `a11y.stockExhausted` | 스톡, 더 다시 쓸 수 없음 | 스톡, 남은 횟수 없음 | «더 다시» is awkward; matches the caption «{{count}}회 남음» |
| iOS promotional text | 광고도, 구매도, 꼼수도 없어요 | 광고도, 인앱 구매도, 꼼수도 없어요 | 구매 alone is unclear; same term as the description (82 characters, limit 170) |

## Doubts resolved

| Doubt | Resolution |
|---|---|
| ja: space before a date / time placeholder | **A label followed by a standalone value gets one half-width space; text inside a sentence, counters and particles get none.** So 今日 {{time}}, 昨日 {{time}}, {{date}} {{time}}, 配置 {{code}}, スコア {{value}}, ベガス {{value}} have the space; Soliを評価, 残り{{count}}回, {{count}}手, $0から have none. This is what `Intl` and iOS do, and it removes «ベガス−$17» |
| zh: spacing around `$0` | **One space between Chinese text and the amount, none inside the amount**: «从 $0 重新开始», «维加斯 {{value}}». The translator's reading stands; no change needed |
| ja 配置 for deal | Kept. 初期配置 is how Japanese players describe a solitaire layout; ディール is opaque to casual players and 問題 changes the tone to a puzzle book. Works in every string, including the store subtitle |
| ko 안녕하세요 as a menu item (also ja こんにちは, zh 你好) | Kept in all three. Unusual as a drawer label in each language, but that is the deliberate English choice ("Hello", not "About"), and the three now behave the same |
| ja particle after `{{card}}` in `a11y.hint.*` | Fine: を never changes with the preceding word |
| ko colon in `hud.badgeA11y`, `a11y.foundation` | Fine: read aloud the same, and avoids an allow-list entry |
| zh `a11y.faceDownCard` 未翻开的牌 vs glossary 背面朝上 | Kept: it is the research note's own example phrase for this label |
| Register | ja です・ます, zh 你 / no pronoun, ko 해요체: consistent in every sentence; labels are noun-style. No forbidden word, no store-policy word, no price word in names / subtitles / Play titles, no competitor or other-game names in keywords |

## Tight labels wider than about 1.3× English (CJK glyph counted as 2)

Not changed where the term is a decided glossary row or the platform word; for the device check on a small phone.

| Key | English | Text | Ratio | Note |
|---|---|---|---|---|
| `game.undo` | Undo | ja 元に戻す | 2.0 | Dock. If it truncates: 戻す |
| `game.undo` | Undo | ko 실행 취소 | 2.2 | Dock. Already «draft» pending the device check; 되돌리기 is no narrower |
| `game.newGame` | New Game | ja 新しいゲーム | 1.5 | Header on small phones. If it truncates: 新規ゲーム |
| `game.playDeal.retryConfirm`, `history.retry` | Retry | ko 다시 하기 | 1.8 | Dialog / sheet button. Shorter natural word: 재도전 |
| `game.playDeal.sharedConfirm`, `nav.play` | Play | ja プレイ, ko 플레이 | 1.5 | Fine in a drawer and a dialog |
| `common.cancel`, `common.reset` | Cancel, Reset | ja キャンセル, リセット | 1.6 | Platform words |
| `common.drawMode` | Draw 3 | ja 3枚めくり | 1.5 | Picker value and history row |
| `game.hint` | Hint | ja ヒント | 1.5 | No shorter word |
| `game.draw` | Draw | ja めくる | 1.5 | 3 glyphs = 6 Latin widths, at the limit for the stock caption |
| `history.stats.games` | Games | ja ゲーム数, ko 게임 수 | 1.6 / 1.4 | A third of the screen width: should fit |
| `game.recyclesLeft` | 3 left | ko 3회 남음 | 1.3 | 8 widths, at the limit |

zh-Hans: no tight label is wider than English.

## Glossary proposals (for the orchestrator)

Not «draft», so proposed only:

1. **ja orthography rule:** add "a label followed by a standalone value placeholder (date, time, code, score, amount) takes one half-width space" as the exception to the no-space rule. The locale file already follows it.
2. **zh-Hans orthography rule:** say that the `$` exception means "no space inside the amount"; a space still separates the amount from Chinese text.
3. **Store name:** the glossary gives «Soli ソリティア» and «Soli 솔리테어»; English is now "Soli: Klondike Solitaire" and 12 other listings follow that shape. The Korean files already say «Soli: 클론다이크 솔리테어» (left as is; the glossary line needs updating). Japanese is still «Soli ソリティア»: consider «Soli: クロンダイクソリティア» (17 characters) and then drop クロンダイク from the iOS keywords. Chinese stays «Soli 纸牌接龙» (Klondike = 纸牌接龙).
4. **ja New Game / Undo** short forms (新規ゲーム, 戻す) only if the device check shows truncation.
5. **ko Retry** 재도전 if 다시 하기 truncates.
6. **zh-Hans "winnable" in store text:** 每局都能赢 (applied); the setting stays 有解牌局.

«draft» cells I reviewed and would confirm as they are (remove the mark): ja デッキ, マーク, めくり直し, 配置, 新しく配る, 再挑戦, 自動で組札へ, 役に立つ手, クリアできる配置, スコア方式, 未クリア, クリア演出; zh-Hans 牌库, 基础牌堆, 牌桌, 时光穿梭, 提醒, 有解牌局, 游戏; ko 스톡, 버림 더미, 테이블, 스톡 다시 쓰기, 판, 한 판 더, 자동 올리기, 도움이 되는 이동, 풀 수 있는 판, 초기화, 플레이, and the 해요체 register. ko 실행 취소 stays «draft» until the device check.

## Open items

- zh-Hans: 提示 (Hint) and 提醒 (Warnings) look alike and sit close together in Settings and in `settings.scoring.vegasDescription` («提示、提醒和有解牌局»). Kept because 警告 is too harsh for a quiet notice; worth a look on the device.
- zh-Hans: `nav.history` 历史记录 and `history.title` 游戏记录 name the same screen with two words (English: History / Game History). Acceptable, not changed.
- ko iOS keywords contain 무료. Allowed in keywords, but the store already indexes the price, so the 2 characters could go to something else.
- ja and ko `about.madeBy` end in a colon and are followed by the handle in the same row (the byline is a row with a gap): reads fine, zh has no colon.
- `settings.section.newGames` and `game.newGame` are the same string in all three languages (the glossary prescribes it; they never share a screen).
- Nothing was checked on a device: the width table above is arithmetic, not a screenshot.
