# Translator notes: Korean (`ko`)

Written 2026-11-23 by the `ko` translator (whole file + store text).

## Files written

- `src/i18n/locales/ko.json`: 134 keys (English has 145; the 11 `_one` forms are dropped, Korean has only `_other`). Same nesting and key order as `en.json`.
- `store/ios/ko/{name,subtitle,keywords,promotional_text,description}.txt`
- `store/android/ko-KR/{title,short_description,full_description}.txt`
- `store/release-notes/ko.txt`

Tests: `yarn jest test/unit/i18n test/unit/store` → everything for `ko` passes. Two failures in the run belong to other locales (`ios/de-DE` keywords 101 characters, `ios/ru` keywords 102). `ko` is not registered in `src/i18n/index.ts` yet, so key parity, key order, placeholders, plural suffixes, "identical to English" and "particle directly after a placeholder" were also checked with a node one-liner: all clean.

Lengths: name / title 16, subtitle 21, keywords 76, promotional text 79, short description 41, release notes 118.

## Uncertain terms

| Key | English | Choice | Alternative | Why |
|---|---|---|---|---|
| `about.madeBy` | Made by | 만든 사람: | 제작: | Korean puts the name after a label; the colon assumes the app adds a space before the handle. If it glues without a space it reads «만든 사람:@carimatia»: check on device |
| `nav.hello` | Hello | 안녕하세요 | 소개 | Kept the friendly greeting as the context asks; as a drawer item it is unusual in Korean, 소개 ("About") would be the conventional label |
| `notice.unwinnable` | No winning moves left — … | 이 게임은 이제 이길 수 없어요. … | 이길 수 있는 이동이 더 없어요. … | Says the strong claim directly so it is clearly different from `notice.stuck`; the literal version differs from the stuck notice by one word only |
| `notice.undoTip` | Tip: … | 팁: … 드래그하면 게임 속 시간 여행을 할 수 있어요 | no label | 팁 is not the Hint word (힌트). No final period, as in English |
| `hud.badgeA11y`, `a11y.foundation` | {{label}}, {{value}} / {{pile}}, {{card}} | `{{label}}: {{value}}`, `{{pile}}: {{card}}` | comma as in English | A comma version is identical to English and fails the test; the colon reads the same aloud. If the comma is preferred, both keys need an allow-list entry |
| `history.dateTime` | {{date}}, {{time}} | `{{date}} {{time}}` | with comma | Korean writes date and time without a comma |
| `history.dealName` | Deal {{code}} | 판 {{code}} | {{code}} 판 | 판 as a prefix noun is slightly unusual, but keeps the code at the end like the status word layout expects; glossary term 판 is «draft» |
| `settings.cardsDrawn` | Cards drawn | 뽑는 카드 수 | 뽑기 장수 | No glossary row; descriptive |
| `settings.vegasTotal.label` | Keep Vegas total | 베가스 누적 유지 | 베가스 누적 점수 유지 (research note) | The amounts are dollars, not points, so 점수 was left out |
| `settings.vegasTotal.description` | Carry your balance … | 금액 / 누적 금액 | 잔액 | 잔액 sounds like a bank or wallet balance (close to the money vocabulary the glossary avoids) |
| `a11y.stockExhausted` | Stock, no passes left | 스톡, 더 다시 쓸 수 없음 | 스톡, 남은 횟수 없음 | Built on the glossary term 스톡 다시 쓰기 («draft») |
| `a11y.scrubber` | Undo scrubber, position … of … | 실행 취소 슬라이더, {{total}}단계 중 {{position}}단계 | 실행 취소 타임라인 | 슬라이더 is what screen-reader users know |
| `hud.vegasSpokenNegative` | minus {{count}} dollars | 마이너스 {{count}}달러 | 영하 / − | 마이너스 is the spoken everyday word |
| `settings.warnings.noUsefulMoves` | No more useful moves | 도움이 되는 이동 없음 | 유용한 이동 없음 | Glossary term; 11 characters, the widest picker value: device check |
| store subtitle | No ads. Every deal winnable. | 광고 없음. 모든 판을 풀 수 있어요. | 광고 없음. 모든 판 승리 가능. | Follows «풀 수 있는 판» |
| store promo | no tricks | 꼼수도 없어요 | 속임수 | 꼼수 is colloquial but friendly; 속임수 sounds like fraud |
| store description | streaks, coins | 연속 기록, 코인 | 연속 출석 | Common game-app wording |

## `tight` keys longer than English

- `game.undo` «실행 취소» (5 characters with the space, vs "Undo"): glossary pick, flagged there for the device check (alt 되돌리기).
- `settings.warnings.noUsefulMoves` «도움이 되는 이동 없음»: see above.
- `nav.rate`, `game.newGameAlert.confirm`, the HUD badges and `game.draw` («뽑기», 2) are at or under the English length. `game.recyclesLeft` «{{count}}회 남음» is 5 characters with a one-digit number (limit 8).

## Glossary observations (used as written)

- **판 for deal** next to **게임**: `history.emptyBody` has both in one sentence («끝낸 게임과 그 판이 …»). It reads fine, but a reviewer may want to check that the difference is clear.
- **승리** for both the tile "Solved" and the status "Solved": fine; just note it is also the word for "win".
- **플레이** as the drawer item and the confirm button: used as decided («draft»).
- The research note writes «오픈 소스» (spaced) in prose and «오픈소스» as the keyword: done that way.

## Source oddities

- `notice.undoTip` has no final period while the other notices do.
- `hud.badgeA11y` and `a11y.foundation` are pure placeholder patterns: any language that keeps the comma is "identical to English" for the test.
- `about.madeBy`: the context does not say whether the app inserts a space before the handle.
- Nothing wrong in the English store text. The Korean keywords are built from the glossary table, not translated; «무료» is in the keywords (allowed there; not in name, subtitle or Play title).

## Feedback on the brief

- Clear and complete. The one slow part: the glossary is 190 KB and the Korean column sits in a five-language table; a per-language extract would save a lot of reading.
- The rule "no value identical to English" should mention the placeholder-only patterns.
