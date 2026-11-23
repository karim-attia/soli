# Plain-words check: es, pt-BR (2026-11-24)

Lens: a native speaker who plays casual mobile games and knows no patience / card-game jargon (the German «Talon» / «Blatt» finding). Read: every string of `es.json` and `pt-BR.json`, all store files of both languages, release notes. Gates: `yarn jest test/unit/i18n test/unit/store`.

## Changed

### Spanish

| # | Where | Before | After | Why |
|---|---|---|---|---|
| E1 | deal (noun): `game.playDeal.retryTitle`, `.sharedTitle`, `settings.solvableDeals`, `settings.scoring.vegasDescription`, `history.dealName`, `.retryA11y`, `.shareA11y`, `share.dealMessage`; store description (iOS + Play), promotional text, Play short description; glossary cells "deal", "Solvable deals", forbidden-list replacement | reparto («Reparto 2345-6789», «Repartos con solución», «¿Reintentar este reparto?») | partida («Partida 2345-6789», «Partidas con solución», «¿Reintentar esta partida?») | Everyday «reparto» = delivery, film cast, or the act of dealing; as the name of one specific game it is unusual. Same case as de «Blatt» → «Spiel», and pt-BR already says «partida». Also fixes gender agreement in the History row («Partida … Resuelta»). Trade-off: deal = game, one word |
| E2 | `history.emptyBody` | «Las partidas terminadas y sus repartos aparecerán aquí.» | «Las partidas terminadas aparecerán aquí.» | Follows E1 (as German did) |
| E3 | `game.newGameAlert.messageWon` | «¡Buena victoria! …» | «¡Bien jugado! …» | Literal "Nice win"; «Bien jugado» is what people say, both regions |

Unchanged on purpose: the button «Repartir» (everyday verb: repartir las cartas).

### Portuguese (Brazil)

| # | Where | Before | After | Why |
|---|---|---|---|---|
| P1 | `history.emptyBody` | «Jogue Klondike … Os jogos concluídos e suas partidas vão aparecer aqui.» | «Jogue Paciência Klondike … Os jogos concluídos vão aparecer aqui.» | «jogos e suas partidas» reads as two synonyms; «Klondike» alone means nothing to a casual player |
| P2 | `share.dealMessage` | «…partida de Klondike no Soli…» | «…partida de Paciência Klondike no Soli…» | The receiver may not have the app; glossary: Klondike next to Paciência |
| P3 | store description (iOS + Play) | «leva as cartas às fundações» | «leva as cartas às pilhas de fundação» | «fundações» alone reads as institutions; FRVR's phrase «pilhas de fundação» says it is a pile |

## Evidence (fetched 2026-11-23)

- cardgames.io Spanish UI (https://cardgames.io/es/solitaire/): «Juego: #234235», «Comenzar juego numerado», «El Almacen», «El Descarte», «Las Fundaciones», «Deshacer», «Voltear una carta». A specific deal is «Juego», never «reparto».
- MobilityWare, App Store Spain (https://apps.apple.com/es/app/id500963785): «Repartos que se pueden ganar», «Juega un reparto rápido», «Roba 1 o roba 3 cartas», «Pistas inteligentes», «Deshacer fácil», «partidas resueltas». The one big source for «reparto» (marketing text).
- Brainium (research R3): «Partidas ganadoras».
- cardgames.io Portuguese UI (https://cardgames.io/pt/solitaire/): «Jogo: #234235», «O Monte», «O Descarte», «As Bases», «Virar uma carta», «Desfazer».
- GNOME Aisleriot pt_BR and FRVR pt-BR (search excerpts): «fundações», «pilhas de fundação».
- Microsoft Solitaire Collection's and Google's in-game Spanish / Portuguese strings could not be retrieved.

## Checked and kept

| Lang | Term | Verdict |
|---|---|---|
| es | robar / Robar {{number}} | Everyday card verb in both regions (UNO: «roba dos»); MobilityWare uses it. No «coger» anywhere |
| es | mazo, descarte, base, columna | Plain; screen reader only, except «bases» in the store description (fine) |
| es | pista, deshacer, jugada, avisos, cronómetro | Plain |
| es | Valorar Soli, Ajustes | Spain-leaning but understood in Latin America |
| es | rachas (store) | Known from Duolingo |
| pt-BR | jogo / partida, virar, monte, descarte, dica, jogada | Plain |
| pt-BR | Dar as cartas, Opa!, Bela vitória!, não dá mais para vencer | Idiomatic Brazilian |
| pt-BR | sequências diárias, pop-ups (store) | Understood |

## Unsure (not changed)

| # | Lang | String | Doubt | Option |
|---|---|---|---|---|
| U1 | es | E1 itself | MobilityWare does say «reparto»; I still judge «partida» plainer. Revert = undo E1/E2 | keep «partida» |
| U2 | es, pt-BR | «Jugabilidad» / «Jogabilidade» (settings section) | Gamer-press word; a casual player gets it, an older one may not | «Juego» / «Jogo» |
| U3 | es, pt-BR | «gamificación» / «gamificação» (About) | Business / education word; Karim kept «Gamification» in German | «trucos» / «truques» |
| U4 | es, pt-BR | «pasadas» / «passadas» (screen reader, Vegas) | pt «passada» is unusual (stride); no attested plain term | es «vueltas», pt «voltas pelo monte» |
| U5 | pt-BR | «fundação» (screen reader, hints) | cardgames.io says «Bases»; FRVR, GNOME, KDE say «fundação» | «base», as Spanish |
| U6 | pt-BR | History row «Partida … · Resolvido» | Gender mismatch (status agrees with «jogo») | «Resolvida» / «Incompleta» for the status |
| U7 | es | «deshaz o empieza otra» (notices) | «deshaz» without an object is clipped | «deshaz jugadas o …» (longer) |
| U8 | es | `$0` before the number | Spain writes «0 $»; accepted loss per glossary | none |
| U9 | pt-BR | «No Vegas, …» / «dólares do Vegas» | Mode name with article; «No modo Vegas» would be clearer | add «modo» |
