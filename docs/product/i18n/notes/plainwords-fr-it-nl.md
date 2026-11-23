# Plain-words check: fr, it, nl (2026-11-24)

Lens: the German rule "Plain words before patience jargon" (glossary, German section). Read every in-app string and all store text as a native speaker who plays casual mobile games and knows no patience vocabulary. Text only; no build.

## Changes

| Lang | Where | Before | After | Why |
|---|---|---|---|---|
| nl | deal (noun): `game.playDeal.retryTitle`, `sharedTitle`, `history.dealName`, `retryA11y`, `shareA11y`, `share.dealMessage`, `history.emptyBody` | «verdeling» («Verdeling 2345-6789», «Deze verdeling opnieuw spelen?») | «spel» («Spel 2345-6789», «Dit spel opnieuw spelen?», «Gedeeld spel spelen?», «Speel dit Klondike-spel in Soli»; empty text: «Afgeronde spellen verschijnen hier.») | «verdeling» was the researcher's own construction (research R1, doubt 2); in everyday Dutch it means distribution / division. No Dutch solitaire app uses it: FRVR says «spel», Brainium «Winnende delers» (machine-made), MobilityWare's Dutch page is English. Same merge of deal and game as German «Spiel» |
| nl | `settings.solvableDeals`, `settings.scoring.vegasDescription`, store descriptions, promotional text | «Oplosbare verdelingen» | «Oplosbare spellen» | follows deal |
| nl | Play short description | «Elke verdeling oplosbaar.» | «Elk spel oplosbaar.» (73 characters in all) | follows deal |
| nl | store descriptions | «speel elke verdeling opnieuw of deel die met vrienden» | «speel elk spel opnieuw of deel het met vrienden» | follows deal |
| nl | `game.newGameAlert.confirm` (tight) | «Opnieuw delen» | «Kaarten delen» (same 13 characters) | «delen» is also the Share word in the same app: «Opnieuw delen» reads "share again" |
| fr | `notice.unwinnable`, `notice.stuck` | «… Annulez ou commencez une nouvelle partie.» | «… Annulez des coups ou commencez …» | a bare «Annulez» has no object ("cancel what?"); nl and de already name the move |
| fr | `a11y.hint.draw` | «Indice : tirez dans la pioche.» | «Indice : piochez.» | «tirer dans» without an object is odd (also "shoot into"); «piocher» is the everyday verb |
| fr | store descriptions (iOS, Play) | «pas de séries, de pièces ni de pop-ups» | «pas de séries quotidiennes, …» | «séries» alone is vague (TV series); Italian already says «serie giornaliere» |
| it | `notice.unwinnable`, `notice.stuck` | «… Annulla o inizia una nuova partita.» | «… Annulla qualche mossa o inizia …» | same as French |

Glossary: nl cells for deal, Solvable deals, Deal Again; the nl examples in two rule lines; a dated note in each of the three language sections; one clause in "Decisions of 2026-11-24". This overrides the orchestrator's same-day "kept «verdeling»" on purpose (the plain-words lens came after it).

## Checked and kept

- **fr «donne»**: the real French card word (belote, tarot, «nouvelle donne»); MobilityWare «Donnes gagnables», Brainium «Donnes gagnantes», Clubic on Microsoft Solitaire. Not a Blatt case.
- **fr «pioche», «défausse», «coup», «Tirage 1», «Indice», «gagnable / ingagnable», «Chronomètre»**: everyday words.
- **it «mano»**: everyday card word (scopa, briscola: «un'altra mano»); MobilityWare «Mani vincibili», «Gioca una mano veloce».
- **it «mazzo», «scarti», «base», «Pesca», «Suggerimento», «Cronologia», «Azzera»**: plain.
- **nl «voorraadstapel», «aflegstapel», «eindstapel»**: FRVR's Dutch words, self-explaining compounds (the jargon would be «stok» / «talon»). «trekstapel» (board-game rules, matches «Trek») would be as plain; not a clear win.
- **nl «patience / patiencen», «Trek», «zet», «Automatisch wegspelen», «dichte kaart»**: normal Dutch.

## Unsure (not changed)

1. **fr «fondation(s)»** (screen reader, one store line): patience jargon, but every French source uses it (FRVR, cardgames.io, Vikidia) and no plainer established word exists. Karim reads French: his call.
2. **fr «Montée auto»** (setting, store line «La montée auto envoie les cartes vers les fondations à votre place»): two unfamiliar words in one line for a non-player. «Rangement auto» is plainer. Already on Karim's eyeball list (F4).
3. **fr «voyager dans le temps au fil de votre partie»**: correct but heavy; «remonter le temps dans votre partie» is more idiomatic, yet only means backwards.
4. **it «Mani vincibili» in the iOS subtitle** read cold, without a card context, is slightly cryptic; the app-store screenshots give the context. «Partite vincibili» would be the German-style merge; not taken because the big Italian apps say «mano».
5. **nl «gamification» (About) and «streaks» (store)**: English loans; kept because Karim approved both in German.
6. **nl «Speel dit Klondike-spel in Soli»** (share message): «Klondike-spel» could also be read as "this Klondike game" in general; with the link next to it the meaning is clear.

## Tests

`yarn jest test/unit/i18n test/unit/store`: see the run of 2026-11-24 (green).
