# Review V3: Spanish (`es`) and Portuguese (Brazil) (`pt-BR`)

2026-11-23, reviewer V3 (plan step 7.1). Read: glossary (top rules, both language sections, Table 2 columns, forbidden words), `en.json` + `en.context.json`, both locale files, all store files of `es-ES` and `pt-BR`, both release notes, translator notes `es.md` / `pt-BR.md`, research note R3.

Overall: both translations are clean. Glossary terms, register (tú / você), plural forms, punctuation and store-policy words were right almost everywhere; the changes below are polish.

## Checks run

- Node check on both locale files: key parity with `en.json`, placeholder sets per key, plural suffixes = `Intl.PluralRules` categories (one, many, other), `_many` = `_other`, `_one` ≠ `_other` and contains `{{count}}`, no empty value, no stray spaces, one final newline: **OK, 152 keys each**.
- Values identical to English: only `hud.vegas`, `settings.scoring.vegas`, `history.vegas` (allow-listed) and `hud.total` «Total» in both languages (correct; **needs adding to `UNTRANSLATED_OK`**, already listed in the glossary's Enforcement section).
- `yarn jest test/unit/store`: 36 passed.
- Store policy: no price word in iOS name / subtitle or Play title, no «sin anuncios» / «sem anúncios» in Play title or short description, no gambling words, no competitor or other-game names. Limits hold after the edits (es promo 145/170, pt-BR promo 140/170, es release notes 202/500).

## Changes made

### `src/i18n/locales/es.json`

| Key | Before | After | Why |
|---|---|---|---|
| `game.newGameAlert.messageWon` | Buena victoria. ¿Jugamos otra ronda? | ¡Buena victoria! ¿Jugamos otra ronda? | With a full stop it read flat, almost ironic. English has the exclamation mark here; a win is the one place for it |
| `settings.hintButton.label` | Botón de pista | Botón Pista | Same name as in its own description line («un botón Pista»), the store description and «el botón Deshacer» |
| `settings.warnings.description` | …cuando te quedas… ya no se puede ganar. | …cuando te quedes… ya no se pueda ganar. | Future reference after «cuando» / «en cuanto» takes the subjunctive |
| `a11y.stockRecycle`, `a11y.stockRecycleLeft_*` | Volver a pasar el descarte al mazo | Devolver el descarte al mazo | «Volver a pasar … al» is ambiguous when heard; shorter and clearer (the translator's own alternative) |

### `src/i18n/locales/pt-BR.json`

| Key | Before | After | Why |
|---|---|---|---|
| `game.newGameAlert.confirm` | Dar as cartas de novo (21) | Dar as cartas (13) | Tight dialog button, was 2.1× English. The title already asks «Começar um novo jogo?». «Jogar de novo» rejected: reads like Retry («Tentar de novo») |
| `settings.vegasTotal.description` | Leve seu saldo… | Levar seu saldo… | The other description lines are infinitives («Mostrar…», «Avisar…»); one form |
| `a11y.hint.toColumn`, `a11y.hint.toFoundation` | Dica: mova {{card}} para … | Dica: {{card}}, para a coluna {{column}}. / Dica: {{card}}, para a fundação. | Bare-placeholder rule: «mova Ás de espadas» lacks its article and the gender varies (o Ás, a Dama). Label style, as in Spanish |
| `a11y.hint.draw` | Dica: vire uma carta do monte. | Dica: vire cartas do monte. | With Virar 2–5 more than one card is turned |

### Store

| File | Change | Why |
|---|---|---|
| `store/ios/es-ES/description.txt`, `store/android/es-ES/full_description.txt` | «viajar atrás en el tiempo» → «viajar en el tiempo» | Glossary term, same as the in-app tip; «viajar atrás» is clumsy |
| `store/ios/es-ES/promotional_text.txt` | «con repartos con solución» → «: repartos con solución» | Doubled «con» |
| `store/release-notes/es.txt` | «¡Feliz partida!» → «¡Que lo disfrutes!» | «Feliz partida» is not something people say |
| `store/ios/pt-BR/description.txt`, `store/android/pt-BR/full_description.txt` | «voltar no tempo» → «viajar no tempo» | Glossary term, same as the in-app tip |
| `store/ios/pt-BR/promotional_text.txt` | «com partidas que sempre têm solução» → «: partidas com solução» | «sempre» was a stronger claim than English (the option can be switched off); now the feature's name |

### Glossary (only cells that were «draft», own columns)

- Deal Again, pt-BR: «Dar as cartas de novo» → **«Dar as cartas»** (reason in the cell); the sentence-case example in the pt-BR rules follows.
- pass (recycle), es «pasada» and pt-BR «passada»: «draft» removed, confirmed.

## Translators' uncertain items: verdicts

Confirmed as written (no change): es `nav.notFoundTitle` «¡Ups!», `about.dedication` «jugaba al solitario», «compras dentro de la app», «gamificación», `notice.unwinnable`, `notice.noHint`, «Consejo:», «En la parte superior verás», «La partida en curso», picker options «Sin jugadas útiles» / «Imposible de ganar», «Cronómetro», «Puntos {{value}}», «ahora mismo», «Línea de tiempo de Deshacer», capitalised ranks, label-style hints. pt-BR «Opa!», «compras no app», undo tip without a label, «O topo da tela», «total do Vegas», «Controle de desfazer», «sem sequências diárias», picker options «Sem jogadas úteis» (not the forbidden bare «Sem jogadas») / «Impossível de vencer», «Pontos: {{value}}».

Remaining «draft» cells I would confirm (markers left for the orchestrator): es «jugada», «Valorar Soli», «No»; pt-BR «partida» (deal), «Virar», «Não». The jogo / partida distinction in pt-BR is thin, as the researcher said, but it is used consistently and reads fine in the retry and shared-deal dialogs.

## Tight keys over about 1.3× English (kept, glossary-decided; check on a small phone)

| Key | EN | Text | Shorter option if it truncates |
|---|---|---|---|
| es `game.newGameAlert.confirm` | Deal Again (10) | Repartir de nuevo (17) | **Proposal:** «Repartir» (8), parallel to the pt-BR change. Row is decided, so not applied |
| es `game.newGame` | New Game (8) | Nueva partida (13) | none natural («Nuevo juego» breaks the partida term) |
| es `common.reset` | Reset (5) | Restablecer (11) | platform word, keep |
| es / pt-BR Retry (`game.playDeal.retryConfirm`, `history.retry`) | Retry (5) | Reintentar (10) / Tentar de novo (14) | **Proposal pt-BR:** «Repetir» (7) on the two buttons, titles unchanged. Row is decided, so not applied |
| es / pt-BR `game.undo` | Undo (4) | Deshacer / Desfazer (8) | platform word, keep |
| pt-BR `nav.settings` | Settings (8) | Configurações (13) | «Ajustes» (7, iOS's word). Kept: Android's word and the more common one in Brazil; a drawer row has the width |
| pt-BR `history.share` | Share (5) | Compartilhar (12) | platform word, keep |
| pt-BR `common.reset` | Reset (5) | Redefinir (9) | platform word, keep |
| es / pt-BR `history.stats.solved` | Solved (6) | Resueltas (9) / Resolvidos (10) | none; three tiles in a row |
| pt-BR `settings.warnings.unwinnable` | Unwinnable game (15) | Impossível de vencer (20) | 1.33×, fine |

## Open items for Karim / the orchestrator

1. **`UNTRANSLATED_OK`:** add `hud.total` (es, pt-BR).
2. **iOS subtitles.** es «Sin anuncios. Con solución.» (27) and pt-BR «Sem anúncios. Dá para vencer.» (29) both drop "every deal" for lack of room. Kept. The es alternative «Sin anuncios. Se puede ganar.» (29) is no clearer; «Con solución» at least echoes the in-app switch.
3. **pt-BR description, first line** adds «também conhecida como Solitário ou Solitaire» (not in English). Kept: Play has no keyword field and the glossary wants both words in the listing. Remove if a literal description is preferred.
4. **«gratis» / «grátis» in the iOS keyword field:** left out by both translators pending Karim's OK (high search volume; allowed there). If accepted: es replace «relax», pt-BR replace «desfazer».
5. **Two glossary proposals** (decided rows): es Deal Again «Repartir»; pt-BR Retry button «Repetir». Only worth taking if the device check shows truncation.
6. **es `settings.cardsDrawn` «Cartas robadas»** can also be read as "stolen cards". It is the research note's wording and clear in context next to «Robar 3»; alternative «Cartas a robar». Not changed.
7. **pt-BR `_one` with 0** («0 jogada», «0 dólar»): correct per CLDR, looks odd to many Brazilians (research doubt P8). Nothing to fix in the text.
8. **Device check:** es header «Nueva partida» on a small phone, the Off value «No» / «Não» in the settings pickers, the three history tiles in both languages.
