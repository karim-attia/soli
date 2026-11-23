# Terminology research R3: Spanish (`es`) and Portuguese (Brazil) (`pt-BR`)

Researched 2026-11-23 by researcher R3 (plan `docs/product/i18n/i18n.md`, step 5.1). This note is the hand-over to the merge agent: `glossary.md` was NOT edited. Per language: (1) rules section ready to paste, (2) term table with the glossary's EN rows in the glossary's order, (3) ASO keywords, (4) sources, (5) open doubts.

In this note «…» is only the quoting mark, as in the glossary. «draft» = unsure pick; the alternative is in the note column and in "Open doubts".

How solid the evidence is (read this before trusting a cell):

- **Read this run:** store listings of top solitaire apps in the Spanish, Mexican and Brazilian App Store, Microsoft Solitaire Collection's App Store listing in Spanish and Portuguese, FRVR's localized rule pages, KDE KPatience's localized handbook, Spanish and Portuguese Wikipedia.
- **Not reachable:** Microsoft Solitaire Collection's in-game UI strings (the Microsoft Store pages render only a title to a fetcher; no localized support page with the UI words was found). Game-term cells therefore rest on the other apps and references, not on Microsoft's UI.
- **Platform verbs** (Undo, Cancel, Share, Settings, Reset) are the well-known iOS / Android system words; they were not re-fetched from Apple's or Google's pages in this run. A reviewer who has a device in the language can confirm them in a minute.
- Hard limits from `en.context.json` drove several picks: stock caption ≤ 6 characters, HUD badges ≤ 8, passes-left caption ≤ 8.

---

## Spanish (`es`)

### 1. Rules section (paste into the glossary's "Spanish (`es`)" section)

Researched 2026-11-23 (R3). One neutral Spanish for Spain and Latin America; the store text is reused for es-ES, es-MX and es-419.

- **Register: tú.** Every top solitaire listing read addresses the player with tú («Roba 1 o roba 3 cartas», «Toca o arrastra cartas», «Pon orden en las cartas»). Tips and notices use the tú imperative («Arrastra…», «Deshaz…»); buttons and menu entries use the infinitive («Deshacer», «Compartir», «Jugar»). Never usted, never vosotros or ustedes (address one player), never voseo.
- **Name of the game: «Solitario».** It is the everyday name in Spain and Latin America and what the stores use. «Klondike» is known to enthusiasts and appears in listings as «solitario Klondike»; use it in store text and where English names the variant, always next to «solitario» on first mention. «Paciencia» exists (Wikipedia: «solitario de la paciencia») but nobody searches for it. **«Carta Blanca» is NOT this game**: it is the Spanish name of FreeCell.
- **Neutral vocabulary.** Pick the word both sides of the Atlantic use: «dispositivo» or «teléfono» (not «móvil» / «celular»), «tomar» or «robar» (never «coger», vulgar in much of Latin America), no «ordenador» / «computadora», no «vale», no regional slang. Where Spain and Latin America differ and no neutral word exists, the term table decides.
- **French-suited cards, not the Spanish deck.** Suits are «corazones», «diamantes», «tréboles», «picas»; face cards «jota», «reina», «rey». Never «oros / copas / espadas / bastos» or «sota / caballo»: those belong to the baraja española.
- **Orthography and punctuation.** Opening «¿» and «¡» always («¿Empezar una partida nueva?»). Soli's calm tone means almost no exclamation marks at all. No space before `? ! : ;`. Sentence case: only the first word and proper names are capitalised («Nueva partida», «Repartir de nuevo», not «Nueva Partida»). Accents on capitals («ÚLTIMA»): the HUD shows labels in uppercase. English " — " inside a notice becomes a colon or a full stop, not a dash («No quedan jugadas útiles: deshaz o empieza otra partida.»).
- **Quotes, apostrophes, ellipsis:** curly double quotes “…” (what Apple's and Google's Spanish UI use; «…» is correct in print but looks bookish in an app). Ellipsis is the single character `…`, attached to the word («Cargando historial…»). No apostrophes in Spanish.
- **`$` and numbers:** the `$` stays in front as in English (`$52`, `−$17`): that is the Latin American convention and the mode's casino look; Spain would write «52 $», accepted loss. Spoken form: «{{count}} dólar / dólares», negative «menos {{count}} dólares». Grouping and decimals come from `Intl`.
- **Plural forms (CLDR, checked by jest):** one, many, other. `_one` is exactly 1; 0 takes `_other` («0 jugadas»); `_many` is required and equals `_other`.
- **Gender agreement:** «partida» is feminine, so its states are «Resuelta», «Incompleta». Stat tiles count games: «Resueltas», «Incompletas».
- **Short labels:** «Nueva partida» (New Game), «Pista» (Hint), «Deshacer» (Undo), «Robar» (Draw), «Puntos» (Score), «Jugadas» (Moves), «Tiempo» (Time), «Total», «No» (Off), «Quedan {{count}}» ({{count}} left).

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| Carta Blanca | Spanish name of FreeCell, a different game | Solitario, solitario Klondike |
| oros, copas, espadas, bastos, sota, caballo | Spanish-deck suits and ranks; Soli uses French-suited cards | corazones, diamantes, tréboles, picas, jota, reina |
| solitario español | Means solitaire with the Spanish deck | Solitario |
| coger | Vulgar in Mexico, Argentina and elsewhere | robar (from the stock), tomar, mover |
| fundación, pedestal, cimiento | Calques / rare words for foundation seen in machine-translated listings | base |
| basura, desperdicio, talón | Wikipedia's and old manuals' words for waste / stock; odd in an app | descarte, mazo |
| móvil, celular, ordenador, computadora | Region-marked | dispositivo, teléfono |
| vosotros / ustedes forms, usted, voseo | One register: tú | tú forms |
| gratis, gratuito, gratuita, sin coste, sin costo | Price words: not in the iOS name / subtitle or the Play title | description only |
| sin anuncios, sin publicidad | Not in the Play title; keep out of the Play short description | full description; iOS subtitle is allowed |
| el mejor, n.º 1, #1, top | Store policy and not Soli's tone (several competitors do it) | describe what the app does |
| Fin del juego, Has perdido, No hay movimientos | Stronger claim than "No more useful moves" | «No quedan jugadas útiles» |
| solucionador, semilla, algoritmo | Translations of the forbidden developer jargon (Microsoft's listing says «Solitaire Solver») | «repartos con solución», «pista» |

### 2. Term table (`es` column of Table 2)

| EN (canonical) | es | «draft» | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | Never translated; no article needed («Valorar Soli», «en Soli») |
| Solitaire | Solitario | | Universal name; store name «Soli - Solitario». Lowercase inside a sentence («un solitario sin anuncios») |
| Klondike | Klondike | | Store text and where English says Klondike: «solitario Klondike». Understood by enthusiasts only; never alone on first mention |
| Patience | Solitario | | «Paciencia» is rare in Spanish; the local name does not come from Patience. Keyword only |
| **Cards** | | | |
| card | carta | | «naipe» is formal / bookish; keyword only |
| deck | baraja | | NOT «mazo» (that is the stock). «Baraja» is the 52 cards in Spain and Latin America |
| suit | palo | | |
| hearts | corazones | | Lowercase |
| diamonds | diamantes | | |
| clubs | tréboles | | |
| spades | picas | | Never «espadas» (Spanish deck) |
| rank | valor | | «el valor de la carta» |
| Ace | as | | Capitalised only at the start of a label: «As de picas» |
| Jack | jota | | The J of French-suited cards; «sota» is the Spanish deck |
| Queen | reina | | Alternative «dama» is understood but less common in both regions |
| King | rey | | |
| Two … Ten | dos, tres, cuatro, cinco, seis, siete, ocho, nueve, diez | | Plain number words, no gender change («Dos de corazones») |
| Ace of Spades | `{{rank}} de {{suit}}` → «As de picas» | | Same order as English |
| face up / face down | boca arriba / boca abajo | | «Carta boca abajo, columna {{column}}». Two words (RAE also allows «bocabajo»; keep two) |
| **Board** | | | |
| stock | mazo | | FRVR, KDE, MobilityWare. Screen reader: «Mazo, {{count}} cartas» |
| waste | descarte | | «pila de descarte» where a noun phrase is needed |
| foundation | base | | KDE «la base», online games «las bases». «Base de tréboles», «Mueve … a la base» |
| tableau | tablero | | FRVR «las cartas del tablero». Store text mostly says «las siete columnas» |
| column | columna | | «Columna 3» |
| pass (recycle) | pasada | «draft» | Wikipedia «pasadas por la baraja». «Mazo, sin pasadas restantes»; recycle action: «Volver a pasar el descarte al mazo». Alternative: «vuelta» |
| deal (noun) | reparto | | MobilityWare «Repartos que se pueden ganar», «reparto diario». The game being played is «partida» |
| **Actions** | | | |
| Draw (verb) | Robar | | 5 characters (limit 6). MobilityWare, FRVR. Others say «Sacar» (LatAm app) or «Tomar» (Brainium); «robar» is the card-game word everywhere |
| Draw 1 … Draw 5 | Robar {{number}} | | One form: «Robar 1», «Robar 3». Settings row "Cards drawn": «Cartas robadas» |
| New Game | Nueva partida | | 13 characters vs 8 in English: check the header button on a small phone |
| Deal Again | Repartir de nuevo | | Verb of «reparto» |
| Retry | Reintentar | | «¿Reintentar este reparto?» |
| Share | Compartir | | Platform word |
| move (noun) | jugada | «draft» | Chosen over «movimiento» because the HUD badge allows 8 characters: «JUGADAS» (7) fits, «MOVIMIENTOS» (11) does not. Listings mostly say «movimientos». Verb stays «mover» («mueve el as a la base») |
| Undo | Deshacer | | Platform word; all listings |
| time travel | viajar en el tiempo | | Tip: «Arrastra el botón Deshacer hacia los lados para viajar en el tiempo por tu partida». Noun: «viaje en el tiempo» |
| Auto Up | Subida automática | «draft» | Translated: «Auto Up» means nothing in Spanish. Not «Autocompletar»: listings use that for finishing a won game at the end, Soli's feature acts during play. Orchestrator may still decide to keep English in all languages |
| **Hints and warnings** | | | |
| Hint | Pista | | All listings |
| Warnings | Avisos | | Calmer than «Advertencias» / «Alertas», and shorter |
| useful move | jugada útil | | «No quedan jugadas útiles» (weaker claim kept). Follows the «jugada» row |
| winnable / unwinnable | se puede ganar / ya no se puede ganar | | Option label "Unwinnable game": «Partida imposible de ganar» (tight: «Imposible de ganar»). No single adjective («ganable» is not a normal word) |
| Solvable deals | Repartos con solución | | History label "Solvable": «Con solución». Avoids «resoluble» / «solucionable» |
| **Scoring and statistics** | | | |
| Scoring | Puntuación | | Setting label |
| Standard | Estándar | | Brainium «puntuación estándar o Vegas» |
| Vegas | Vegas | | Unchanged; `$` in front |
| Score | Puntos | | HUD badge (6 characters; «Puntuación» is 10). History: «{{value}} puntos» or «Puntos: {{value}}» |
| Total | Total | | Identical to English: add `hud.total` to the test's allow-list. "Keep Vegas total": «Mantener el total de Vegas» |
| Time | Tiempo | | "Game timer" setting: «Cronómetro» |
| Move counter | Contador de jugadas | | Follows the «jugada» row |
| Statistics | Estadísticas | | |
| **App** | | | |
| Play | Jugar | | |
| History | Historial | | Screen title "Game History": «Historial de partidas» |
| Games | Partidas | | |
| Solved | Resuelta (status) / Resueltas (stat) | | Feminine with «partida». Alternative «Ganada»; «Resuelta» keeps the link to «con solución» |
| Incomplete | Incompleta (status) / Incompletas (stat) | | Stat tile is tight: 11 characters, check on device |
| Active | En curso | | More natural than «Activa» for a game in progress |
| Settings | Ajustes | «draft» | iOS and Android in Spain, and short. iOS / Android in Latin America say «Configuración»; both are understood everywhere |
| Gameplay / New Games | Jugabilidad / Nuevas partidas | | «Jugabilidad» is the usual game-menu word (MobilityWare) |
| Off | No | «draft» | Gender-free and short: the picker value serves «Puntuación» (f.) and «Avisos» (m. pl.). Alternative: «Desactivado» (platform default masculine, 11 characters) |
| Cancel | Cancelar | | Platform word |
| Reset | Restablecer | | Platform word (11 characters on an Android dialog button: check). "Reset Vegas total": «Restablecer el total de Vegas» |
| win / celebration | victoria / celebración | | Verb «ganar»: «¡Has ganado!» is avoided in favour of calm «Buena partida» style where English allows |
| Rate Soli | Valorar Soli | «draft» | Spain: App Store and Play say «valoraciones». Latin America says «calificar». Alternative: «Calificar Soli» |
| open source | código abierto | | «Solitario gratis y de código abierto» |
| ads / no ads | anuncios / sin anuncios | | «publicidad» is equally understood; keep «anuncios» as the one word |
| free | gratis | | Adjective form «gratuito/a» where grammar needs it. Store descriptions only |

Not rows, but the translator will need them: «Hola» (drawer entry "Hello"), «novia» (girlfriend), «Quedan {{count}}» / `_one` «Queda {{count}}» ("{{count}} left"), «Hecho por» ("Made by").

### 3. Store / ASO keywords (`es`)

One text serves es-ES, es-MX and es-419, so the keyword list must work in both regions. The name carries «Solitario» (name: «Soli - Solitario»), so it is not repeated in the keyword field.

| Keyword | Why / source |
|---|---|
| solitario | THE search term in Spain and Mexico; in every top title («Solitario Clásico Klondike», «Solitario: Juego de Cartas»). Goes in the name, not the keyword field |
| cartas | «juego de cartas» is the second word of almost every title and subtitle (Brainium: «Juego de Cartas Solitario») |
| juego, juegos | Completes «juego de cartas», «juegos de cartas» |
| klondike | In titles and subtitles in both regions (MobilityWare: «Juego de cartas Klondike») |
| clásico | «Solitario clásico» is a stock phrase in both stores |
| baraja | Mexico and much of Latin America say «baraja» for playing cards («Solitario: Baraja de Cartas» in the Mexican store). es-MX weight |
| naipes | Everyday word in Argentina, Chile, Peru; formal in Spain. es-419 weight |
| solitaire | Many Spanish-store titles keep the English word (Microsoft, Brainium, MobilityWare) and people type it |
| paciencia | Low volume in Spanish; cheap filler only if characters remain |
| sin anuncios | People search «solitario sin anuncios»; it is Soli's real difference. Allowed in the iOS keyword field and subtitle, not in the Play title |
| gratis | High volume («solitario gratis»). Keyword field only, if Karim accepts it there: never name, subtitle or Play title |
| sin internet, offline | Common modifier in Latin America («juegos sin internet»); true for Soli |
| código abierto | Tiny volume, but exactly Soli's audience |

es-ES vs es-MX: no word is wrong in the other region. Spain leans «cartas» and «solitario clásico»; Mexico adds «baraja» and «sin internet»; «naipes» is South American. Avoid in both: «spider», «freecell», «carta blanca» (games Soli does not have), «solitario español», competitor names.

Proposed iOS keyword line for the translator to start from (99 characters, no word from the name): `cartas,juego,klondike,clásico,baraja,naipes,solitaire,paciencia,sin,anuncios,offline,código,abierto`

Store-policy word traps: «gratis / gratuito» (iOS name, subtitle, screenshots; Play title and short description), «sin anuncios» (Play title; grey zone in the Play short description), «n.º 1», «#1», «el mejor» (seen in competitor titles; do not copy).

### 4. Sources (`es`)

- [MobilityWare Solitaire, App Store Spain](https://apps.apple.com/es/app/id500963785) and [Mexico](https://apps.apple.com/mx/app/id500963785): identical text in both stores; «Roba 1 o roba 3 cartas», «Deshacer fácil», «Pistas inteligentes», «Repartos que se pueden ganar», «Autocompletado», «Jugabilidad»; tú. Decided robar, pista, deshacer, reparto, register, and that one text can serve both regions.
- [Brainium Solitaire, App Store Spain](https://apps.apple.com/es/app/id359917414): subtitle «Juego de Cartas Solitario», «Pistas y Deshacer ilimitados», «puntuación estándar o Vegas», «Partidas ganadoras», «Marcadores y estadísticas», «tomar-1 o tomar-3»; tú. Decided Estándar, Vegas, Estadísticas; shows «tomar» as the minority word for draw.
- [Solitario: Klondike Clásico, App Store Mexico](https://apps.apple.com/mx/app/id1523402128): «Saca 1 o 3 cartas», «movimientos útiles», «fundación», «pedestal», «#1». Evidence for the minority words and for what machine-translated listings look like (forbidden list).
- [Microsoft Solitaire Collection, App Store Spain](https://apps.apple.com/es/app/microsoft-solitaire-collection/id1103438575): «clásicos juegos de Solitario», game names left in English («Klondike Solitaire»), «desafíos diarios». Decided Solitario as the genre name and that Klondike stays untranslated.
- [FRVR Solitario (Spanish rules page)](https://frvr.com/es/play/solitaire/): «solitario Klondike», «mazo», «pila de descarte», «tablero», «siete columnas», «Robando 1», «palo», «bocabajo»; tú. Decided mazo, descarte, tablero, columna, palo.
- [KDE KPatience handbook, Spanish](https://docs.kde.org/trunk_kf6/es/kpat/kpat/rules-specific.html): «el mazo», «montón de descarte», «la base», «repartir de nuevo», «Carta blanca» as the heading for FreeCell. Decided base, repartir de nuevo, and the Carta Blanca warning.
- [Wikipedia: Solitario (juego de naipes)](https://es.wikipedia.org/wiki/Solitario_(juego_de_naipes)): «solitario de la paciencia», «Klondike», «boca arriba / boca abajo», «palo», «bases / cimientos», «basura / desperdicio», «pasadas por la baraja». Decided boca arriba / boca abajo, pasada, baraja; its waste words went to the forbidden list.
- [Neoteo on PySolFC](https://www.neoteo.com/es/pysolfc-1-000-versiones-de-solitario): Windows' three games named «Klondike, Carta Blanca y Solitario Spider». Confirms Carta Blanca = FreeCell.
- Search results for Spanish online Klondike sites ([visu.network](https://visu.network/es/juegos/solitario/), [wavespeed.ai](https://wavespeed.ai/es/free-tools/solitaire)): «robar 1 / robar 3», «las bases», «repartos con solución», «reparto diario», «repartir de nuevo», «pista», «deshacer». Decided «Repartos con solución».
- [App Store search results, Mexico](https://apps.apple.com/MX/app/id1628542227) (titles such as «Solitario: Baraja de Cartas», «Solitario Clásico Klondike», «Solitario: #1 Juego de Cartas»): keyword table and the «#1» trap.
- Platform verbs (Deshacer, Cancelar, Compartir, Ajustes / Configuración, Restablecer): iOS and Android system UI in Spanish, from knowledge, not re-fetched; style guides at [Microsoft style guides](https://learn.microsoft.com/globalization/reference/microsoft-style-guides).

### 5. Open doubts (`es`)

| # | Question | Pick | Alternative | Why unsure |
|---|---|---|---|---|
| E1 | move (noun) | jugada | movimiento | Listings say «movimientos», but the HUD badge allows 8 characters. If the badge can take 11 on device, «movimiento» is the more expected word. Changes three rows (move, useful move, Move counter) |
| E2 | Settings | Ajustes | Configuración | Spain's system word vs Latin America's. No neutral third word |
| E3 | Rate Soli | Valorar Soli | Calificar Soli | Same Spain / Latin America split. Latin America has more speakers; Spain's wording was picked because both stores' Spanish (Spain) pages use it and it reads fine in Latin America |
| E4 | Off | No | Desactivado | «No» is gender-free and short but terse in a picker; needs an eye on the settings screen |
| E5 | Auto Up | Subida automática | keep «Auto Up» / «Autocompletar» | Cross-language decision for the orchestrator |
| E6 | pass | pasada | vuelta | Only Wikipedia uses it; apps avoid the concept. Appears in screen-reader labels only |
| E7 | New Game | Nueva partida (13) | Nuevo juego (11) | Header button is tight on small phones; «partida» is the right word, so check on device before shortening |
| E8 | `$52` | sign in front | «52 $» | Spain's convention is the sign after the number; glossary's all-languages rule keeps it in front |
| E9 | Microsoft's in-game Spanish UI | not read | | Could not be fetched; if someone has Windows in Spanish, compare robar / pista / base |

---

## Portuguese (Brazil) (`pt-BR`)

### 1. Rules section (paste into the glossary's "Portuguese (Brazil) (`pt-BR`)" section)

Researched 2026-11-23 (R3). Brazilian Portuguese; pt-PT devices also get this text.

- **Register: você.** All Brazilian listings read address the player with você («Você pode treinar seu cérebro», «Você vai precisar comprar cartas do monte»). Tips and notices use the você imperative («Arraste…», «Desfaça…»); buttons and menu entries use the infinitive («Desfazer», «Compartilhar», «Jogar»). Never tu, never «o senhor / a senhora», no plural address. Possessive «seu / sua».
- **Name of the game: «Paciência».** It is the Brazilian name since Windows («Paciência»), Microsoft's Brazilian listing says «jogos clássicos de Paciência», and it is the main term on Portuguese Wikipedia («Paciência, também conhecido como Solitário»). «Solitário» is the name in Portugal and is understood in Brazil; «Solitaire» is typed a lot in the Brazilian stores. So: «Paciência» in the app and as the store name's game word, «Solitário» and «Solitaire» in the store subtitle / keywords so pt-PT players and searchers find it. «Klondike» is known to enthusiasts; store text says «Paciência Klondike».
- **Brazilian spelling and vocabulary** (2009 orthographic agreement as used in Brazil): «tela», «compartilhar», «configurações», «anúncios», «cronômetro», gerund («carregando»). pt-PT readers understand all of it; do not mix in European forms («ecrã», «partilhar», «definições», «anular», «a carregar»).
- **French-suited cards:** suits «copas», «ouros», «paus», «espadas»; face cards «valete», «dama», «rei»; «ás» with accent.
- **False friend with Spanish:** Portuguese «naipe» is the SUIT (Spanish «naipe» is a card); Portuguese «espadas» is ♠ (Spanish says «picas»). Never copy between the two languages.
- **Orthography and punctuation.** No inverted marks. No space before `? ! : ;`. Sentence case: only the first word and proper names capitalised («Novo jogo», «Dar as cartas de novo»). Accents on capitals («PONTUAÇÃO»). English " — " may stay as a spaced travessão « — » or, better in a short notice, become a colon or full stop.
- **Quotes, apostrophes, ellipsis:** curly double quotes “…” (Brazilian standard). Ellipsis is the single character `…`, attached to the word («Carregando histórico…»).
- **`$` and numbers:** `$` in front as in English (`$52`, `−$17`); not «R$», not «US$». Spoken form: «{{count}} dólar / dólares», negative «menos {{count}} dólares». Grouping and decimals come from `Intl`.
- **Plural forms (CLDR, checked by jest):** one, many, other. `_one` covers 0 and 1, so it always shows `{{count}}` and must read right with 0 («0 jogada», «1 jogada»); `_many` is required and equals `_other`.
- **Gender agreement:** «jogo» is masculine: «Resolvido», «Incompleto». A «partida» (deal) is feminine: «Partidas com solução».
- **Articles with the app name:** Brazilian Portuguese uses the article: «Avaliar o Soli», «no Soli». "Soli" itself never changes.
- **Short labels:** «Novo jogo» (New Game), «Dica» (Hint), «Desfazer» (Undo), «Virar» (Draw), «Pontos» (Score), «Jogadas» (Moves), «Tempo» (Time), «Total», «Não» (Off), «Restam {{count}}» ({{count}} left).

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| talão, pilha do lixo, lixo | KDE's literal words for stock / waste; nobody says them | monte, descarte |
| estoque | Calque of "stock" (it means warehouse inventory) | monte |
| cancelamento, anular | Wrong / European words for Undo seen in listings | desfazer |
| ecrã, definições, partilhar, ficheiro, a carregar | European Portuguese | tela, configurações, compartilhar, arquivo, carregando |
| tu forms, vós, o senhor / a senhora | One register: você | você forms |
| grátis, gratuito, gratuita, de graça | Price words: not in the iOS name / subtitle or the Play title | description only |
| sem anúncios, sem propaganda | Not in the Play title; keep out of the Play short description | full description; iOS subtitle is allowed |
| o melhor, nº 1, #1, top | Store policy and not Soli's tone (competitors do it: «#1 Jogo Clássico de Solitaire!») | describe what the app does |
| Fim de jogo, Você perdeu, Sem jogadas | Stronger claim than "No more useful moves" | «Não há mais jogadas úteis» |
| solucionador, semente, algoritmo | Translations of the forbidden developer jargon (Microsoft's listing says «Solucionador de Paciência») | «partidas com solução», «dica» |
| picas, tréboles, corazones | Spanish suit names | espadas, paus, copas |

### 2. Term table (`pt-BR` column of Table 2)

| EN (canonical) | pt-BR | «draft» | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | With article in a sentence: «o Soli», «no Soli» |
| Solitaire | Paciência | | Brazilian everyday name. Store name «Soli - Paciência»; subtitle / keywords also carry «Solitário» (Portugal) and «Solitaire». Lowercase inside a sentence («um jogo de paciência») |
| Klondike | Klondike | | «Paciência Klondike» in store text and where English says Klondike. Enthusiasts only |
| Patience | Paciência | | The Brazilian name IS the Patience word (French / British «patience») |
| **Cards** | | | |
| card | carta | | |
| deck | baralho | | The 52 cards. NOT «monte» (stock) |
| suit | naipe | | False friend with Spanish (see rules) |
| hearts | copas | | Lowercase |
| diamonds | ouros | | |
| clubs | paus | | |
| spades | espadas | | |
| rank | valor | | «o valor da carta» |
| Ace | ás | | Accent required; «Ás de espadas» |
| Jack | valete | | |
| Queen | dama | | Standard card name; «rainha» is colloquial |
| King | rei | | |
| Two … Ten | dois, três, quatro, cinco, seis, sete, oito, nove, dez | | Masculine number words («Dois de copas», never «duas») |
| Ace of Spades | `{{rank}} de {{suit}}` → «Ás de espadas» | | Same order as English |
| face up / face down | virada para cima / virada para baixo | | Feminine with «carta»: «Carta virada para baixo, coluna {{column}}» |
| **Board** | | | |
| stock | monte | | FRVR, GNOME Aisleriot, Wikipedia («monte de compra»). Screen reader: «Monte, {{count}} cartas» |
| waste | descarte | | FRVR, GNOME. «pilha de descarte» where a noun phrase is needed |
| foundation | fundação | | FRVR «pilhas de fundação», KDE, store listings. «Fundação de paus»; plural «fundações» |
| tableau | mesa | | FRVR «Mesa: é a área de jogo, formada por sete colunas» |
| column | coluna | | «Coluna 3» |
| pass (recycle) | passada | «draft» | «Monte, sem passadas restantes»; recycle action: «Voltar o descarte para o monte». Alternative: «virada do monte»; GNOME says «redistribuições» (long) |
| deal (noun) | partida | «draft» | Brainium «Partidas vencedoras». Game = «jogo», deal = «partida»: «Tentar esta partida de novo?», «Jogar partida compartilhada?». Alternative: «distribuição» (exact but technical). See doubt P1 |
| **Actions** | | | |
| Draw (verb) | Virar | «draft» | 5 characters (limit 6). Two Brazilian listings («Virar 1 carta / Virar 3 cartas») and visu.network. Alternative «Comprar» (FRVR, Brainium; the classic card-game verb) is 7 characters and does not fit the stock caption |
| Draw 1 … Draw 5 | Virar {{number}} | «draft» | One form: «Virar 1», «Virar 3». Follows the row above. Settings row "Cards drawn": «Cartas viradas» |
| New Game | Novo jogo | | 9 characters |
| Deal Again | Dar as cartas de novo | «draft» | «Dar as cartas» is the classic Windows Paciência wording (from memory, not re-verified). Tight dialog button: if too long, «Jogar de novo». Alternative: «Distribuir de novo» |
| Retry | Tentar de novo | | «Tentar esta partida de novo?». Tight alternative: «Repetir» |
| Share | Compartilhar | | Platform word in Brazil (Portugal: «Partilhar») |
| move (noun) | jogada | | FRVR «fazer jogadas na mesa». HUD «JOGADAS» (7). Verb stays «mover» («mova o ás para a fundação») |
| Undo | Desfazer | | Platform word; listings |
| time travel | viajar no tempo | | Tip: «Arraste o botão Desfazer para os lados para viajar no tempo pelo seu jogo». Noun: «viagem no tempo» |
| Auto Up | Subida automática | «draft» | Translated: «Auto Up» means nothing in Portuguese. Not «Autocompletar» (listings use it for finishing a won game). Orchestrator may still decide to keep English in all languages |
| **Hints and warnings** | | | |
| Hint | Dica | | All listings |
| Warnings | Avisos | | Calmer than «Alertas» / «Advertências» |
| useful move | jogada útil | | «Não há mais jogadas úteis» (weaker claim kept). One listing says «movimentos úteis» |
| winnable / unwinnable | dá para vencer / não dá mais para vencer | | Option label "Unwinnable game": «Jogo impossível de vencer» (tight: «Impossível de vencer»). No single adjective («vencível» is not natural) |
| Solvable deals | Partidas com solução | | History label "Solvable": «Com solução». Avoids «solucionável». Follows the «partida» row |
| **Scoring and statistics** | | | |
| Scoring | Pontuação | | Setting label |
| Standard | Padrão | | Brainium «pontuação padrão ou de Vegas» |
| Vegas | Vegas | | Unchanged; `$` in front |
| Score | Pontos | | HUD badge (6 characters; «Pontuação» is 9). History: «{{value}} pontos» or «Pontos: {{value}}» |
| Total | Total | | Identical to English: add `hud.total` to the test's allow-list. "Keep Vegas total": «Manter o total do Vegas» |
| Time | Tempo | | "Game timer" setting: «Cronômetro» |
| Move counter | Contador de jogadas | | |
| Statistics | Estatísticas | | |
| **App** | | | |
| Play | Jogar | | |
| History | Histórico | | Screen title "Game History": «Histórico de jogos» |
| Games | Jogos | | |
| Solved | Resolvido (status) / Resolvidos (stat) | | Masculine with «jogo». Alternative «Vencido»; «Resolvido» keeps the link to «com solução» |
| Incomplete | Incompleto (status) / Incompletos (stat) | | Stat tile is tight: 11 characters, check on device |
| Active | Em andamento | | More natural than «Ativo» for a game in progress |
| Settings | Configurações | «draft» | Android's word (most Brazilian phones) and the common word in Brazilian apps. iOS in Brazil says «Ajustes» (shorter). 13 characters in the drawer: fine |
| Gameplay / New Games | Jogabilidade / Novos jogos | | «Jogabilidade» is the usual game-menu word |
| Off | Não | «draft» | Gender-free and short: the picker value serves «Pontuação» (f.) and «Avisos» (m. pl.). Alternative: «Desativado» (platform default masculine, 10 characters) |
| Cancel | Cancelar | | Platform word |
| Reset | Redefinir | | Platform word. "Reset Vegas total": «Redefinir o total do Vegas». Alternative «Zerar» is short and very Brazilian, but not the platform word |
| win / celebration | vitória / comemoração | | Verb «vencer» (also «ganhar»); keep «vencer» as the one verb |
| Rate Soli | Avaliar o Soli | | Both stores' Brazilian pages say «avaliações» |
| open source | código aberto | | «Paciência grátis e de código aberto» |
| ads / no ads | anúncios / sem anúncios | | «propaganda» is colloquial; keep «anúncios» |
| free | grátis | | Adjective form «gratuito/a» where grammar needs it. Store descriptions only |

Not rows, but the translator will need them: «Olá» (drawer entry "Hello"), «namorada» (girlfriend), «Restam {{count}}» / `_one` «Resta {{count}}» ("{{count}} left"), «Feito por» ("Made by").

### 3. Store / ASO keywords (`pt-BR`)

The name carries «Paciência» (name: «Soli - Paciência»), so it is not repeated in the keyword field. Brazilians type three names for the same game, which is why the other two belong in the subtitle or keywords.

| Keyword | Why / source |
|---|---|
| paciência | THE Brazilian search term («Paciência: Cartas e Baralho», «Paciência o jogo de cartas», «Jogo de Paciência Clássico»). Goes in the name |
| solitário | Portugal's name, also typed in Brazil; the Portuguese store lists «Solitário Paciência». Serves the pt-PT fallback users |
| solitaire | Top Brazilian titles keep the English word («Solitaire: Jogo de Paciência», Brainium «Solitaire», Microsoft) |
| cartas | «jogo de cartas» is in nearly every title or subtitle (Brainium: «Jogos de cartas clássico») |
| jogo, jogos | Completes «jogo de paciência», «jogos de cartas» |
| baralho | Brazilian word for the deck and for card games in general («jogo de baralho»; title «Paciência: Cartas e Baralho») |
| klondike | In listings («Pontuação tradicional Klondike», «Paciência Klondike grátis») |
| clássico | «Paciência clássica», «jogo clássico» are stock phrases |
| sem anúncios | People search «paciência sem anúncios»; Soli's real difference. Allowed in the iOS keyword field and subtitle, not in the Play title |
| grátis | High volume («paciência grátis»). Keyword field only, if Karim accepts it there: never name, subtitle or Play title |
| offline, sem internet | Very common Brazilian modifier («jogos offline»); true for Soli |
| código aberto | Tiny volume, but exactly Soli's audience |

Avoid: «spider», «freecell» (games Soli does not have), competitor names, «#1».

Proposed iOS keyword line for the translator to start from (97 characters, no word from the name): `solitário,solitaire,cartas,jogo,baralho,klondike,clássico,sem,anúncios,offline,código,aberto,dica`

Store-policy word traps: «grátis / gratuito / de graça» (iOS name, subtitle, screenshots; Play title and short description), «sem anúncios» (Play title; grey zone in the Play short description), «#1», «o melhor».

### 4. Sources (`pt-BR`)

- [Microsoft Solitaire Collection, App Store Brazil](https://apps.apple.com/br/app/microsoft-solitaire-collection/id1103438575): «jogos clássicos de Paciência», game names left in English («Klondike Solitaire»), «Solucionador de Paciência», «Desafios diários». Decided Paciência as the genre name, Klondike untranslated, and «solucionador» on the forbidden list.
- [Brainium Solitaire, App Store Brazil](https://apps.apple.com/br/app/id359917414): subtitle «Jogos de cartas clássico», «Dicas e desfazer ilimitados», «pontuação padrão ou de Vegas», «Partidas vencedoras», «Placares e estatísticas», «ajuste a compra de cartas para 1 ou 3». Decided Dica, Desfazer, Padrão, Estatísticas, partida for deal; evidence for «comprar».
- [Paciência o jogo de cartas, App Store Brazil](https://apps.apple.com/br/app/id1334311990): subtitle «O Jogo de Paciência Clássico», «Virar 3 cartas», «Virar 1 carta», «Desfazer ilimitado», «Dicas inteligentes», «modalidade Vegas», «Estatísticas completas», «Auto-Completar». Decided Virar for the draw mode.
- [Solitaire: Jogo de Paciência, App Store Brazil](https://apps.apple.com/br/app/id1523402128): «vira 1 ou 3 cartas», «fundação», «naipe», «movimentos úteis», «Cronômetro», «cancelamento» for undo, «#1». Evidence for fundação, naipe, Cronômetro; its odd words went to the forbidden list.
- [MobilityWare Solitaire, App Store Brazil](https://apps.apple.com/br/app/id500963785): the listing is English only in Brazil. Shows a top app that did not localize: room for a properly Brazilian listing.
- [FRVR Paciência (Brazilian rules page)](https://frvr.com/pt-BR/play/solitaire/): «Paciência Klondike», «monte», «descarte», «pilhas de fundação», «mesa», «sete colunas», «comprar cartas do monte», «fazer jogadas», «cartas viradas para baixo», «copas, espadas, paus e ouros»; você. Decided monte, descarte, fundação, mesa, coluna, jogada, virada para baixo, suit names, register.
- [GNOME Aisleriot Klondike help, pt_BR](https://help.gnome.org/users/aisleriot/stable/Klondike.html.pt_BR) (read through search-result excerpts; the page itself returned 404 to the fetcher): «monte», «descarte», «redistribuições». Second source for monte / descarte.
- [KDE KPatience handbook, pt_BR](https://docs.kde.org/trunk_kf6/pt_BR/kpat/kpat/rules-specific.html): «talão», «pilha do lixo», «fundação», «pilhas de jogo», «distribui», «redistribuir». Confirmed fundação; its stock / waste words went to the forbidden list.
- [Wikipedia: Paciência (jogo de cartas)](https://pt.wikipedia.org/wiki/Paci%C3%AAncia_(jogo_de_cartas)): «Paciência, também conhecido como Solitário», «Klondike», «monte de compra», «naipe», «virado para baixo» (the article is written in European Portuguese). Decided the Paciência / Solitário relationship.
- Search results for Brazilian online Klondike sites ([visu.network](https://visu.network/br/jogos/paciencia/), [valorfinal.com.br](https://valorfinal.com.br/jogos/paciencia)): «virar 1 carta ou 3 cartas», «desfazer e dicas», «reciclagem do monte». Third source for Virar.
- App Store search results, Brazil and Portugal («Paciência: Cartas e Baralho», [«Solitário Paciência»](https://apps.apple.com/pt/app/solitaire/id896844464)): keyword table.
- Platform verbs (Desfazer, Cancelar, Compartilhar, Configurações / Ajustes, Redefinir): Android and iOS system UI in Brazilian Portuguese, from knowledge, not re-fetched; style guides at [Microsoft style guides](https://learn.microsoft.com/globalization/reference/microsoft-style-guides).

### 5. Open doubts (`pt-BR`)

| # | Question | Pick | Alternative | Why unsure |
|---|---|---|---|---|
| P1 | deal (noun) vs game | deal = partida, game = jogo | deal = distribuição | «Jogo» and «partida» are near-synonyms in everyday Portuguese, so the distinction rests on consistent use, not on the words themselves. «Distribuição» is exact but reads like a manual. A native reviewer should read the retry / shared-deal dialogs |
| P2 | Draw | Virar | Comprar | «Comprar» is the traditional card-game verb and FRVR's and Brainium's word, but it is 7 characters and the stock caption allows 6. «Virar» is also what a face-down card does, a small ambiguity. If the caption can take 7, «Comprar» is the better word (changes two rows plus «Cartas viradas») |
| P3 | Settings | Configurações | Ajustes | Android vs iOS in Brazil. Per-platform strings are not planned, so one word must serve both |
| P4 | Off | Não | Desativado | Same as Spanish E4 |
| P5 | Auto Up | Subida automática | keep «Auto Up» / «Autocompletar» | Cross-language decision for the orchestrator |
| P6 | Deal Again | Dar as cartas de novo | Jogar de novo / Distribuir de novo | Long for an Android dialog button; the Windows wording is from memory |
| P7 | pass | passada | virada do monte | No app names the concept; screen-reader labels only |
| P8 | `_one` with 0 | «0 jogada» | | CLDR puts 0 in `one` for Portuguese; many Brazilians would write «0 jogadas». Only matters where 0 can show (history rows of an abandoned game, Vegas «0 dólar») |
| P9 | pt-PT fallback | Brazilian text as is | | Portuguese players see «Paciência», «Compartilhar», «Configurações», «tela»: all understood, clearly Brazilian. A pt-PT locale would be a follow-up, not part of this plan. Note that CLDR plural rules differ for pt-PT (0 is `other`) if the app resolves plurals by the device locale rather than the `pt-BR` file |
| P10 | Microsoft's in-game Portuguese UI | not read | | Could not be fetched; if someone has Windows in Brazilian Portuguese, compare virar / comprar, dica, fundação |

---

## For the merge agent

- Both languages need `hud.total` («Total») on the jest allow-list for values identical to English; «Vegas», «Soli» and «Klondike» are presumably there already.
- Price and "no ads" words for the store test's word lists: es «gratis», «gratuito», «gratuita», «sin anuncios», «sin publicidad»; pt-BR «grátis», «gratuito», «gratuita», «de graça», «sem anúncios».
- Cross-language consistency to check against R2 (fr, it): Auto Up (translated here), Off (a plain "no" here), Score as "points" on the badge vs Scoring as the setting, deal vs game.
- The proposed keyword lines were counted by script (99 and 97 characters); `yarn jest test/unit/store` is the authority once the translator writes the files.
