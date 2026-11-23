# Translator notes: Portuguese (Brazil) (`pt-BR`)

2026-11-23, full translation (whole file + store listing + release notes).

## Files written

- `src/i18n/locales/pt-BR.json`: 152 keys (134 base keys; the 9 plural keys have `_one`, `_many`, `_other`), same order as `en.json`
- `store/ios/pt-BR/`: `name.txt` (24/30), `subtitle.txt` (29/30), `keywords.txt` (99/100), `promotional_text.txt` (154/170), `description.txt` (899)
- `store/android/pt-BR/`: `title.txt` (24/30), `short_description.txt` (75/80), `full_description.txt` (899, same text as iOS)
- `store/release-notes/pt-BR.txt` (173/500)

## Tests

`yarn jest test/unit/i18n test/unit/store`: 51 passed, 1 failed. The failure is not pt-BR: `ios/de-DE` keywords are 101 characters. All pt-BR store checks pass. pt-BR is not registered in `src/i18n/index.ts` yet, so the locale test did not cover the JSON; a node self-check confirmed key parity and order, identical placeholder sets, the three plural suffixes on every plural key, and no empty value.

Values identical to English: `hud.vegas`, `settings.scoring.vegas`, `history.vegas` (on the allow-list), **`hud.total` «Total» (needs adding to `UNTRANSLATED_OK`)**, and three placeholder-only patterns without words (`hud.badgeA11y`, `history.dateTime`, `a11y.foundation`), which the test's `hasWords` filter should skip.

## Uncertain terms

| Key | EN | Choice | Alternative | Why |
|---|---|---|---|---|
| `game.newGameAlert.confirm` | Deal Again | Dar as cartas de novo | Jogar de novo | Glossary pick («draft»), but 21 characters on a tight dialog button (EN 10). Android may truncate: check on a device, fall back to «Jogar de novo» |
| `game.playDeal.retryConfirm`, `history.retry` | Retry | Tentar de novo | Repetir | Glossary term, 14 characters against 5 on tight buttons. «Repetir» is the research note's short alternative |
| `settings.warnings.noUsefulMoves` | No more useful moves | Sem jogadas úteis | Não há mais jogadas úteis | Tight, widest picker option: 17 instead of 25 characters. Keeps «úteis», so it is not the forbidden «Sem jogadas»; the full sentence stays in `notice.stuck` |
| `settings.warnings.unwinnable` | Unwinnable game | Impossível de vencer | Jogo impossível de vencer | Research note's tight form; 20 characters against 15 |
| `notice.undoTip` | Tip: Drag … | no label: «Arraste o botão Desfazer…» | «Sugestão: …» | "Tip" and "Hint" are both «Dica»; the glossary says to drop the label then |
| `history.score` | Score {{value}} | Pontos: {{value}} | {{value}} pontos | The value can be 1 or 0 and the key has no plural; the label form is always grammatical |
| `a11y.scrubber` | Undo scrubber | Controle de desfazer | Linha do tempo do desfazer | No glossary row for "scrubber"; context forbids jargon. «Controle» is what a screen-reader user expects for a slider |
| `a11y.stockExhausted`, `a11y.stockRecycle*` | no passes left / Recycle waste into stock | sem passadas restantes / Voltar o descarte para o monte | virada do monte | Glossary «draft» (P7), phrases taken from the research note |
| `settings.vegasTotal.description` | The header | O topo da tela | O cabeçalho | «Cabeçalho» reads like a document term; the context says it is the badge at the top of the game screen |
| `settings.vegasTotal.*`, `scoring.description` | Vegas total / Vegas dollars | total do Vegas / dólares do Vegas | total Vegas | Article + «do» as in the research note («Manter o total do Vegas») |
| `nav.notFoundTitle` | Oops! | Opa! | Ops! | Both are common; «Opa!» is the friendlier Brazilian one |
| `about.promise` | in-app purchases | compras no app | compras dentro do aplicativo | Apple's and Google's Brazilian store wording is «compras no app» (from knowledge, not re-fetched) |
| `*_one` forms | 0 / 1 | «0 jogada», «0 dólar», «0 carta» | n/a | CLDR puts 0 in `one` for pt; many Brazilians would write «0 jogadas» (research doubt P8). Nothing a translator can change |
| iOS `subtitle.txt` | No ads. Every deal winnable. | Sem anúncios. Dá para vencer. | Solitário sem anúncios | 30 characters do not hold "every deal has a solution" («Sem anúncios. Sempre há solução» is 31). The pick keeps both claims with the glossary's «dá para vencer» but drops "every deal". The alternative carries the search word «solitário» (then remove it from the keywords) and loses the winnable claim |
| iOS `keywords.txt` | n/a | solitário,solitaire,cartas,jogo,jogos,baralho,clássico,offline,internet,código,aberto,dica,desfazer | add «grátis» | Started from the glossary's line; removed «klondike» (in the name) and «sem», «anúncios» (in the subtitle); added «jogos», «internet» (for "sem internet"), «desfazer». «grátis» is left out because the glossary makes it depend on Karim's OK: if accepted, swap it for «internet» or «desfazer» |
| store description, streaks | no streaks | sem sequências diárias | sem ofensivas | «Ofensiva» is one app's word for a streak; «sequências diárias» is understood without knowing it |
| store description, first line | classic Klondike Solitaire | «…Paciência Klondike, também conhecida como Solitário ou Solitaire…» | leave the two names out | Addition to the English: Play has no keyword field, so the description is the only place where pt-PT players and «solitaire» searchers can match (glossary: both words belong in the listing). Remove if a literal description is preferred |
| store description | share it with a friend | compartilhe com quem quiser | com um amigo | Avoids the masculine generic |

## Tight keys longer than English

`game.newGameAlert.confirm` (21 vs 10), `game.playDeal.retryConfirm` and `history.retry` (14 vs 5), `settings.warnings.unwinnable` (20 vs 15), `history.share` «Compartilhar» (12 vs 5, platform word), `nav.settings` «Configurações» (13 vs 8), `nav.history` «Histórico» (9 vs 7), `history.stats.solved` / `incomplete` «Resolvidos» / «Incompletos» (10 / 11 vs 6 / 10: three tiles in a row, check on a small phone), `common.reset` «Redefinir» (9 vs 5), `settings.scoring.standard` «Padrão» fits. Numbered limits are met: «Virar» 5 (≤ 6), HUD badges «Pontos» 6, «Total» 5, «Jogadas» 7, «Tempo» 5 (≤ 8), «Restam 2» 8 (≤ 8; a two-digit count would be 9, but Vegas passes are single-digit).

## Source oddities

- `game.recyclesLeft_one` and `_other` are identical in English ("{{count}} left"), same for `a11y.stockRecycleLeft`; Portuguese needs the verb to agree («Resta» / «Restam»), so the forms differ here.
- `history.score` "Score {{value}}" has no plural form although it carries a number; languages that would put a counted noun after the value cannot.
- `notice.unwinnable` / `notice.stuck`: "undo" has no object in English; Portuguese needs one («desfaça jogadas»).
- `history.emptyBody`: "Play a game of Klondike" would be «Jogue um jogo de Klondike»; shortened to «Jogue Klondike».
- The glossary lists «Sem jogadas» as forbidden; I read that as the bare phrase, not «Sem jogadas úteis». If it is meant more widely, `settings.warnings.noUsefulMoves` needs the long form.

## Feedback on the brief

- The glossary is 190 KB: reading it "in full" is not possible in one read. The translator needs only lines 1–62, its own language section, its own column and "Forbidden words"; the skill could give a one-line `sed` / `awk` recipe for that (the pt-BR column is field 4 of Table 2).
- The research note's term table has example phrases the glossary column lacks («Cartas viradas», «Cronômetro», «Com solução», «Impossível de vencer», «Voltar o descarte para o monte»). The skill's "Read first" list should name that table.
- `yarn -s jest` prints yarn's help in this repo (Yarn Berry); plain `yarn jest` works.
- The i18n jest folder does not test an unregistered locale; a small standalone parity script in the repo would save every translator from writing its own one-liner.
