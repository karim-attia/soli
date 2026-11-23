# Translator notes: Spanish (`es`)

2026-11-23, whole file. One neutral Spanish for Spain and Latin America, register tú.

## Files written

- `src/i18n/locales/es.json`: 152 keys (143 English keys + 9 `_many` forms; plural suffixes one / many / other, `_many` = `_other`)
- `store/ios/es-ES/`: `name.txt` (24/30), `subtitle.txt` (27/30), `keywords.txt` (99/100), `promotional_text.txt` (148/170), `description.txt`
- `store/android/es-ES/`: `title.txt` (24/30), `short_description.txt` (72/80), `full_description.txt`
- `store/release-notes/es.txt` (199/500)
- jest: `yarn jest test/unit/i18n test/unit/store` (result at the end of this file). `es` is not registered in `src/i18n/index.ts` yet, so the locale test does not cover it; a node self-check confirmed key parity and order, placeholders per key, plural suffixes, no empty value.

## Allow-list (`UNTRANSLATED_OK`)

- `hud.total` = «Total» is identical to English and correct: please add it. (`hud.vegas`, `settings.scoring.vegas`, `history.vegas` are on the list already.)

## Uncertain terms

| Key | EN | Choice | Alternative | Why |
|---|---|---|---|---|
| `nav.notFoundTitle` | Oops! | ¡Ups! | ¡Vaya! | «Vaya» is Spain-marked; «Ups» is understood everywhere |
| `nav.notFoundLink` | Go to home screen! | Ir a la pantalla de inicio | with «¡…!» | Dropped the exclamation mark (calm tone, link label) |
| `about.dedication` | when playing Solitaire | cuando jugaba al solitario | cuando jugaba solitario | «jugar al» is standard and understood everywhere; Latin America often drops «al» |
| `about.promise` | in-app purchases | compras dentro de la app | compras integradas | Apple's own Spanish wording in both regions |
| `about.promise` | gamification | gamificación | ludificación | The word people actually use; «ludificación» is the RAE-recommended form, bookish |
| `game.newGameAlert.message` | Ready for another round? | ¿Jugamos otra ronda? | ¿Otra ronda? | «¿Listo/a…?» would show the player's gender, so rephrased |
| `game.newGameAlert.messageWon` | Nice win! | Buena victoria. | ¡Bien jugado! | Glossary: win = victoria; full stop instead of «¡!» for the calm tone |
| `game.playDeal.sharedTitle` | Play shared deal? | ¿Jugar el reparto compartido? | ¿Jugar este reparto compartido? | |
| `notice.unwinnable` | No winning moves left | Esta partida ya no se puede ganar | Ya no quedan jugadas ganadoras | Uses the glossary's «ya no se puede ganar»; same claim as English's context note ("can provably no longer be won") |
| `notice.noHint` | No hint found. | No se encontró ninguna pista. | No hay ninguna pista por ahora. | Simple past is the neutral choice (Spain would also say «No se ha encontrado») |
| `notice.undoTip` | Tip: | Consejo: | no label | Must not be «Pista» (Hint word) |
| `settings.vegasTotal.description` | The header | En la parte superior verás | La cabecera / El encabezado muestra | «cabecera» (Spain) vs «encabezado» (Latin America): avoided both |
| `settings.vegasTotal.resetMessage` | The game on the board | La partida en curso | La partida del tablero | Matches the status word «En curso» |
| `settings.hintButton.label` | Hint button | Botón de pista | Botón Pista | Description line uses «un botón Pista» (the button's name) |
| `settings.warnings.noUsefulMoves` | No more useful moves | Sin jugadas útiles | No quedan jugadas útiles | Tight picker option (18 vs 20 characters in English); the notice keeps the full sentence |
| `settings.warnings.unwinnable` | Unwinnable game | Imposible de ganar | Partida imposible de ganar | Tight; research note's suggestion |
| `settings.showTime` | Game timer | Cronómetro | Temporizador | Research note's suggestion; counts up, so «cronómetro» is right |
| `history.score` | Score {{value}} | Puntos {{value}} | Puntos: {{value}} / {{value}} puntos | Parallel to «Vegas {{value}}»; «{{value}} puntos» breaks for 1 |
| `history.emptyBody`, `share.dealMessage` | Klondike | solitario Klondike | Klondike | Glossary: always next to «solitario» on first mention |
| `history.justNow` | just now | ahora mismo | hace un momento | |
| `a11y.stockExhausted`, `a11y.stockRecycleLeft` | pass | pasada («sin pasadas restantes», «quedan {{count}} pasadas») | vuelta | Glossary «draft» row; I added the noun to the spoken "left" form so it makes sense without the picture |
| `a11y.stockRecycle` | Recycle waste into stock | Volver a pasar el descarte al mazo | Devolver el descarte al mazo | Research note's wording; «Devolver» is shorter and arguably clearer |
| `a11y.scrubber` | Undo scrubber | Línea de tiempo de Deshacer | Control deslizante de Deshacer | No "scrub" jargon; fits «viajar en el tiempo» |
| `a11y.hint.toColumn`, `a11y.hint.toFoundation` | Hint: move {{card}} to … | Pista: {{card}}, a la columna {{column}}. / Pista: {{card}}, a la base. | Pista: mueve {{card}} a … | Bare-placeholder rule: «mueve As de picas» would lack its article, so label style |
| `a11y.rank.*` | Ace … King | As, Dos, … Rey (capitalised) | lowercase | The rank starts most labels («As de picas»); mid-label it is capitalised too («Descarte, As de picas»), inaudible to a screen reader |
| store `subtitle.txt` | No ads. Every deal winnable. | Sin anuncios. Con solución. (27) | Sin anuncios. Se puede ganar. (29) | «Repartos con solución» (21) + «Sin anuncios.» does not fit in 30; the short form is a little vague. Reviewer: please weigh |
| store `description.txt` | thoughtfully refined | cuidado al detalle | pulido con esmero | |
| store `description.txt` | share it with a friend | compártelo con quien quieras | con un amigo / con tus amigos | Gender-free |
| store `description.txt` | pop-ups | ventanas emergentes | avisos emergentes | |
| store `description.txt` | Dozens of win celebrations | Decenas de celebraciones de victoria | Decenas de animaciones de victoria | Glossary: victoria / celebración |
| store `keywords.txt` | n/a | cartas,juego,juegos,clásico,baraja,naipes,solitaire,paciencia,offline,internet,código abierto,relax | add «gratis» (high volume) | The glossary's starter line contains «klondike», «sin», «anuncios»: all three are now in the name / subtitle, so I dropped them. «sin internet» is covered by «sin» (subtitle) + «internet». «gratis» left out pending Karim's OK (glossary says only if he accepts) |
| `store/release-notes/es.txt` | Happy playing! | ¡Feliz partida! | ¡A disfrutar! | The one exclamation mark kept; the first line ends with a full stop |

Glossary «draft» rows used as decided: jugada, Ajustes, Valorar Soli, No (Off), pasada.

## `tight` keys longer than English

| Key | EN | es |
|---|---|---|
| `game.newGame` | New Game (8) | Nueva partida (13): header button, check on a small phone |
| `game.newGameAlert.confirm` | Deal Again (10) | Repartir de nuevo (17): Android dialog button |
| `common.reset` | Reset (5) | Restablecer (11): Android dialog button |
| `game.playDeal.retryConfirm`, `history.retry` | Retry (5) | Reintentar (10) |
| `game.undo` | Undo (4) | Deshacer (8) |
| `history.stats.incomplete` | Incomplete (10) | Incompletas (11): three tiles in one row |
| `history.stats.solved` | Solved (6) | Resueltas (9) |
| `history.dealName` | Deal {{code}} | Reparto {{code}} (+3) |
| `common.drawMode` | Draw {{number}} | Robar {{number}} (+1) |
| `nav.history`, `nav.play`, `history.share` | History, Play, Share | Historial, Jugar, Compartir (+1 to +4) |
| `settings.scoring.standard` | Standard | Estándar (same length) |

Within the numeric limits: `game.draw` «Robar» (5 ≤ 6), `game.recyclesLeft` «Quedan 2» (8 ≤ 8; a two-digit count would be 9, not expected in Vegas), HUD «PUNTOS», «JUGADAS», «TIEMPO», «TOTAL», «VEGAS» (all ≤ 8).

## Source oddities

- `game.recyclesLeft_one` and `_other` are identical in English («{{count}} left»); Spanish differs (Queda / Quedan), fine.
- `nav.notFoundLink` "Go to home screen!" has an exclamation mark that does not match the app's calm tone; the context says it "returns to the game", so "home screen" could be read as the phone's home screen.
- `notice.undoTip` has no final full stop while the other notices have one; mirrored.
- `history.loadingBody` "Please wait while we retrieve…" is the only string where the app says "we".
- `store/ios/en-US/keywords.txt` contains "ad free" and "draw 3" with spaces, and "patience" although en-GB handles that word; no effect on Spanish.
- Glossary, Spanish section: the research note still mentions the store name «Soli - Solitario»; the English name is now "Soli: Klondike Solitaire", so I wrote «Soli: Solitario Klondike».

## Feedback on the brief

- The glossary is 190 KB; a translator needs about 30 KB of it (top note, All languages, own section, own column, forbidden words). A per-language extract, or line ranges in the brief, would save a lot of reading.
- The example phrases live only in the research note (term table, "Note" column), which the brief does not list under "Read first". They were the most useful input; worth a pointer.
- The glossary's proposed keyword line predates the final name / subtitle, so it repeats words that are indexed already.
- `yarn jest` cannot check an unregistered locale; a small script (or a test that reads every `locales/*.json` from disk) would let translators self-check before registration.

## jest result

`yarn jest test/unit/i18n test/unit/store`: all `es-ES` checks pass (iOS, Android, release notes). The run showed 2 failures in other languages' folders being written in parallel (`ios/ru` and `ios/tr`, a field over its limit), none in Spanish.
