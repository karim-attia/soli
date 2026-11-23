# Translator notes: zh-Hans (Simplified Chinese)

Written 2026-11-23, whole-file run.

## Files written

- `src/i18n/locales/zh-Hans.json`: 134 keys (English has 146 with `_one` / `_other`; Chinese has only `_other`, so the 12 `_one` forms are dropped). Same nesting and key order as `en.json`.
- `store/ios/zh-Hans/{name,subtitle,keywords,promotional_text,description}.txt`
- `store/android/zh-CN/{title,short_description,full_description}.txt`
- `store/release-notes/zh-Hans.txt`
- Tests: `yarn jest test/unit/i18n test/unit/store` passed. The locale test only covers registered locales (zh-Hans is not registered yet), so key parity / order, placeholders, plural suffixes, empty and identical-to-English values were also checked with a node one-liner: all clean.

## Uncertain terms

| Key | English | Choice | Alternative | Why |
|---|---|---|---|---|
| `settings.showTime` | Game timer | 显示用时 | 计时器 (research note) | Parallel to 显示步数 directly above it and reuses the HUD word 用时; the glossary table has no row for "Game timer", only the research note does |
| `a11y.faceDownCard` | Face-down card | 未翻开的牌 | 背面朝上的牌 (glossary row face down) | The research note recommends it for speech: shorter and natural. Differs from the glossary cell 背面朝上 |
| `about.madeBy` | Made by | 作者 | 制作： | Label form; the handle is rendered on its own line below, so no colon |
| `nav.hello` | Hello | 你好 | 关于 | Context asks for a friendly greeting; no glossary row |
| `nav.notFoundLink` | Go to home screen! | 返回主页面 | 回到游戏 | "主屏幕" would read as the phone's home screen. Exclamation mark dropped (calm tone) |
| `notice.undoTip` | Tip: | 小技巧： | no label | 提示 is the Hint word, so the label needs another word |
| `notice.unwinnable` | No winning moves left | 这局已无法获胜。 | 已经没有能赢的走法了。 | Uses the glossary term 无法获胜; clearly stronger than the stuck notice, as intended |
| `settings.warnings.unwinnable` | Unwinnable game | 无法获胜的牌局 | 无法获胜 (4 characters) | Research wording; same width as 没有有用的走法 (7), which the context says is the widest. Use the short form if the picker truncates |
| `game.playDeal.sharedTitle` | Play shared deal? | 玩分享的牌局？ | 开始这局分享的牌？ | Confirm button is 开始 (research note: alert button "Play" = 开始), drawer entry is 游戏 |
| `hud.vegasSpoken*` | dollars / minus N dollars | {{count}} 美元 / 负 {{count}} 美元 | 减 …, 元 | 美元 is the spoken word for `$`; 负 is how a negative number is read |
| `time.minutes` | minutes | {{count}} 分钟 | {{count}} 分 | 分 next to a score could be heard as "points" |
| `settings.vegasTotal.resetMessage` | from $0 | 从 $0 重新开始 | 从$0重新开始 | The spacing rule's "no space" exception for dollar amounts is ambiguous: read here as "nothing inside the amount", with normal spaces around it |
| `settings.vegasTotal.resetMessage` | The game on the board | 正在进行的这局游戏 | 牌桌上的这局 | 牌桌 is the tableau term; "game in progress" is clearer |
| `a11y.stockExhausted` | no passes left | 轮数已用完 | 没有剩余轮数 | Follows pass = 轮 |
| `a11y.scrubber` | Undo scrubber | 撤销滑块 | 撤销时间轴 | No glossary row; 滑块 is the platform word for a slider |
| `history.title` vs `nav.history` | Game History / History | 游戏记录 / 历史记录 | 历史记录 for both | Both from the research note; the empty and loading texts say 记录 so they fit either |
| store subtitle, short description | Every deal winnable | 每局都有解 | 每局都能赢 | Ties to the setting name 有解牌局 |
| store description | streaks | 连续打卡 | 连胜奖励 | The usual word for retention streaks in Chinese apps |
| store keywords | n/a | 扑克,扑克牌,单人,克朗代克,经典,单机,离线,休闲,益智,开源,撤销,提示,放松,解压,卡牌,solitaire,klondike,patience | add 单人纸牌 | 纸牌, 接龙 and 无广告 are already in the name / subtitle, so they are left out; 单人 alone combines with 纸牌 from the name. The three Latin words are what bilingual users type; 75 of 100 characters used |

## Tight keys

None longer than English. `game.draw` 翻牌 (2), `game.recyclesLeft` 剩 {{count}} 轮 (5 with the spaces), HUD labels 2 to 3 characters.

## Source oddities

- `settings.section.newGames` and `game.newGame` are both 新游戏 (the glossary prescribes it); fine in Chinese, but they are two meanings with one word.
- `history.stats.solved` and `history.status.solved` are both 获胜; the research note allows 已获胜 for the status if a reviewer wants them to differ.
- Klondike appears in `history.emptyBody` and `share.dealMessage`; per the glossary both say 纸牌接龙 in the app.
- `a11y.rank.2` to `a11y.rank.10` are digits and A / J / Q / K are letters (glossary decision 8), so a screen reader speaks 黑桃A, 红桃10.
- The store name has no colon («Soli 纸牌接龙», as the glossary gives it), unlike English "Soli: Klondike Solitaire".
- China mainland storefront availability is an open question in the research note; nothing in the text depends on it.

## Feedback on the brief

- The glossary is too large to read in one go (about 190 KB); a per-language extract (principles + own section + own column) would save every translator the slicing.
- The dollar-amount spacing exception should say explicitly whether a space separates the amount from surrounding Chinese text.
- "Game timer" has a pick in the research note but no row in the term table.
