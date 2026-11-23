# Plain-words check: ja, zh-Hans, ko (2026-11-24)

Lens: the German rule "Plain words before patience jargon" (glossary, German section). Reader: a native speaker who plays casual mobile games and knows no solitaire vocabulary. Read: every string of `ja.json`, `zh-Hans.json`, `ko.json` and all store files of the three languages. Gates: `yarn jest test/unit/i18n test/unit/store` (result at the end).

## Changed

| Lang | Where | Before | After | Why |
|---|---|---|---|---|
| ko | `a11y.stock*`, `a11y.stockRecycle*`, `a11y.hint.draw` | 스톡 | 뽑기 더미 | 스톡 is a transliteration that means shares / inventory / soup stock to a normal reader. 뽑기 더미 explains itself and pairs with the button «뽑기» and with «버림 더미» |
| ko | `a11y.foundationPile.*`, `a11y.hint.toFoundation`, store description (ios + android) | 파운데이션 | 완성 더미 | 파운데이션 is the make-up word in everyday Korean; the store bullet «카드를 파운데이션으로 옮겨 줘요» read oddly to anyone outside the genre |
| zh-Hans | `a11y.foundationPile.*`, `a11y.hint.toFoundation`, store description (ios + android) | 基础牌堆 | 收牌区 | 基础牌堆 is a calque ("basic pile"); 收牌区 explains itself and matches the setting «自动收牌» |
| ja | `settings.autoUp` | 自動で組札へ | 自動移動 | 組札 is solitaire vocabulary; a visible settings label should not need it (the same case as German «Talon») |
| ja | store description bullet (ios + android) | 「自動で組札へ」：カードを自動で組札に移動します | 自動移動：カードを自動で組札（上の4か所）に移動します | Follows the label; 組札 is glossed once |

Glossary: Table 3 cells for stock (ko), foundation (zh-Hans, ko, note on ja), pass (ko), Auto Up (ja); a new ko forbidden-words row for the transliterations; one dated bullet in each language section.

## Checked and kept

| Lang | Term | Verdict |
|---|---|---|
| ja | 山札, 捨て札, 列 | Everyday card words (known from any card game) |
| ja | 組札 | Jargon, but the only established Japanese word (Wikibooks, FRVR, gamepedia.jp guides); now only in screen-reader labels and one glossed store bullet. 場札 is in no string |
| ja | 配置 (deal) | Plain word («カードの配置»); meaning matches. See doubts |
| ja | 手数, 役に立つ手, めくる, 再挑戦, クリア, クリア演出, 累計 | Natural for a mobile-game player |
| zh-Hans | 牌库 (stock) | Known from digital card games; screen reader only. See doubts |
| zh-Hans | 弃牌堆, 牌局, 有解牌局, 翻牌, 步数, 走法, 轮, 游戏化设计, 没有套路, 连续打卡 | Natural, no jargon |
| ko | 판 (deal), 풀 수 있는 판, 버림 더미, 열, 이동, 자동 올리기, 한 판 더, 실행 취소 | Native, plain |
| ko | 게임화 요소 (gamification) | Same word as English; understood, German kept «Gamification» too |

No machine-translation smell and no app / store term mismatch found in the three languages beyond the rows above.

## Doubts

1. **ko 완성 더미** is a descriptive word of ours. Korean solitaire sites and listings (FRVR, mimmi, App Store KR) all say 파운데이션, some with 더미. No native word is established. Fallback: «파운데이션 더미».
2. **ja 配置** for deal: understandable, but «配置 2345-6789» as a History row title is a little stiff. Alternative, as German did with «Spiel»: «ゲーム» («クリアできるゲーム», «このゲームに再挑戦»). Not changed: no clear win, and review V5 argued for 配置.
3. **ja 自動移動** says less than «自動で組札へ» (not where the cards go). Alternative: «自動で上に移動».
4. **zh-Hans 牌库**: fine for anyone who has played a digital card game; «牌堆» is plainer but collides with 弃牌堆.

## Web check (2026-11-23/24)

- Korean: [FRVR ko](https://frvr.com/ko/play/solitaire/) (스톡 더미, 탈론 / 버림 더미, 파운데이션 더미), [mimmi](https://mimmi.co.kr/solitaire/), App Store KR listings: loanwords throughout, no native foundation word found.
- Japanese: [gamepedia.jp guide](https://gamepedia.jp/archives/76241) and [FRVR ja](https://frvr.com/ja/play/solitaire/): 組札 / 場札 / 山札 are the words guides use; no Japanese app wording for "winnable deal" found (one listing: «100%勝ち取り»).
- Chinese: [FRVR zh-Hans](https://frvr.com/zh-Hans/play/solitaire/) glosses 基础牌堆 as «目标区»; a Chinese solitaire page writes «从 A 到 K 依次叠放到收牌区».
- Microsoft's and Google's own localized in-game text was not readable from the web.
