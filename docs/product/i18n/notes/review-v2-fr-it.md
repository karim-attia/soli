# Review V2: fr, it

2026-11-23, reviewer for the group [fr, it]. Read: glossary (top rules, fr and it sections, Table 1, forbidden words), `en.json`, `en.context.json`, `fr.json`, `it.json`, the store folders `ios/fr-FR`, `android/fr-FR`, `ios/it`, `android/it-IT`, `release-notes/{fr,it}.txt`, and the translator notes `fr.md`, `it.md`.

Overall: both translations are good and follow the glossary. Register is consistent (fr vous, buttons as infinitives or nouns; it tu, buttons as imperatives, alert titles «Vuoi …?»). No forbidden word, no stronger claim than English, the two warnings stay clearly different. Few changes were needed.

## Checks run

- `yarn jest test/unit/store`: 36 passed.
- Node check on `fr.json` and `it.json` (not registered in `src/i18n/index.ts` yet, so `test/unit/i18n` does not cover them): 152 keys each, same bases and order as English, same placeholders per key, plural forms exactly one / many / other, `_many` equals `_other`, every `_one` shows `{{count}}`, no empty value. No error.
- Typography: fr has U+00A0 before every `: ? !` in the JSON and the store files, no U+202F, no normal space before a mark, ’ and … everywhere, «cœur» with œ. it has no space before punctuation, ’ everywhere, no «E'».

## Changes made

### fr.json

| Key | Before | After | Why |
|---|---|---|---|
| `game.newGameAlert.confirm` | Nouvelle donne | Distribuer | Tight dialog button: 14 → 10, the English length. Infinitive like every other French button. Glossary cell was «draft» with this alternative; cell updated |
| `settings.scoring.description` | … S’applique à votre prochaine partie. | … S’applique à la prochaine partie. | Shorter, same meaning |
| `settings.scoring.vegasDescription` | En mode Vegas, les indices, les avertissements et les donnes gagnables sont désactivés. S’applique à votre prochaine partie. | Indices, avertissements et donnes gagnables sont désactivés en mode Vegas. S’applique à la prochaine partie. | Was 1.57× English on a small line under a picker; now 1.35× |
| `settings.warnings.description` | … dès que la partie ne peut plus être gagnée. | … dès que la partie n’est plus gagnable. | Glossary word «gagnable», same wording as `notice.unwinnable` |
| `history.emptyTitle` | Aucune partie enregistrée pour l’instant | Aucune partie enregistrée | Title was 1.9× English; «pour l’instant» is implied (Italian dropped it too) |
| `a11y.stockRecycleLeft_*` | …, {{count}} restant / restants | …, {{count}} passage restant / passages restants | Spoken aloud, «2 restants» has no noun. Now parallel to `a11y.stockExhausted` («aucun passage restant») and to the Italian («giro rimasto») |

### it.json

No change. The plural agreement, the label-style hints without article and the «Consiglio:» / «Suggerimento:» split are all right.

### Store files

| File | Before | After | Why |
|---|---|---|---|
| `ios/fr-FR/description.txt`, `android/fr-FR/full_description.txt` (last line) | pour quiconque veut simplement jouer aux cartes | pour qui veut simplement jouer aux cartes | «quiconque» is stiff, legal-text French; «pour qui veut» is natural and still gender-free |
| `android/it-IT/short_description.txt` | Solitario Klondike rilassante. Ogni mano è vincibile. Annulla senza limiti. (75) | Solitario Klondike rilassante. Mani vincibili. Annullamento illimitato. (71) | «Annulla senza limiti» reads as a command, not a feature. Now the setting's name «Mani vincibili» and the same «annullamento illimitato» as the promotional text and the description |
| `ios/it/description.txt`, `android/it-IT/full_description.txt` | Punteggio Standard, punteggio Vegas | Punteggio standard, punteggio Vegas | Lower case in running text, as the app's «Punti standard o dollari Vegas» |
| `ios/it/keywords.txt` | solitaire,carte,gioco di carte,classico,pubblicità,offline,gratis,rilassante,passatempo,pesca 3 | solitaire,carte,gioco,giochi,classico,pubblicità,offline,gratis,rilassante,passatempo,italiano (95) | «gioco di carte» repeated «carte» (Apple combines single words itself); «pesca 3» also means fishing. Added «giochi» and «italiano» from the glossary's keyword table |

### Glossary (only «draft» cells of fr / it)

- Table 1, Deal Again, fr: «Distribuer» (was «Nouvelle donne» «draft»).
- fr and it "{{count}} left" bullets: the screen-reader label now names the noun («passage restant», «giro rimasto»).

## Translators' uncertain items: resolved

| Item | Decision |
|---|---|
| fr `notice.unwinnable`, it `notice.unwinnable` | Keep. «n’est plus gagnable» / «non si può più vincere» is the plain strong claim; «coup gagnant» / «mossa vincente» would read as one winning move |
| fr `settings.showTime` «Chronomètre», it «Tempo di gioco» | Keep both. Each is the natural setting name in its language |
| fr / it `history.stats.*` in the plural, row status in the singular | Keep. Correct agreement; the glossary row should show both forms (proposal below) |
| fr `share.dealMessage` as a noun phrase | Keep: avoids choosing vous or tu for someone else's message |
| fr `about.promise` «mécanismes pour vous pousser à jouer davantage», it «meccanismi per farti giocare di più» | Keep; «ludification» / «gamification» is jargon |
| fr `a11y.scrubber` «Curseur d’annulation», it «Cursore di annullamento» | Keep (platform word for a slider) |
| fr `history.today` etc. with «à» | Keep; `{{time}}` is always a clock time |
| fr «L’en-tête», it «In alto» (`settings.vegasTotal.description`) | Keep both. «en-tête» is the usual French UI word; Italian «intestazione» is not |
| it `a11y.stockRecycleLeft` with «giro» | Keep; French now does the same |
| it «totale progressivo» | Keep |
| fr store «pop-ups», «vos proches», «sans pièges»; it «serie giornaliere», «con chi vuoi», «niente trucchi» | Keep |
| it subtitle «Senza annunci. Mani vincibili.» | Keep. «Senza pubblicità. Mani vincibili.» is 32 characters. «annunci» is the store's own word, and with «pubblicità» in the keyword field both search words are indexed. See proposal below |
| fr / it `hud.badgeA11y`, `a11y.foundation`, it `history.dateTime` | Punctuation-only patterns, identical to English on purpose |

## Tight keys over about 1.3× English (kept)

No natural shorter word exists for these; they need the device check on a small phone.

| Key | English | fr | it |
|---|---|---|---|
| `game.hint` (dock) | Hint (4) | Indice (6) | **Suggerimento (12)**: the one real risk; glossary fallback «Aiuto» |
| `game.newGame` (header, dock) | New Game (8) | Nouvelle partie (15) | Nuova partita (13) |
| `common.reset` (dialog button) | Reset (5) | **Réinitialiser (13)**: platform word; shorter «Effacer» changes the meaning | Azzera (6) |
| `game.undo` | Undo (4) | Annuler (7) | Annulla (7) |
| `nav.history`, `nav.settings` (drawer, has room) | History / Settings | Historique (10) / Réglages (8) | Cronologia (10) / Impostazioni (12) |
| `history.retry`, `history.share`, `retryConfirm` | Retry / Share (5) | Rejouer (7) / Partager (8) | Rigioca (7) / Condividi (9) |
| `history.stats.games` | Games (5) | Parties (7) | Partite (7) |

`game.draw` (Tirer 5, Pesca 5), `game.recyclesLeft` (8 with a one-digit count), the HUD badges (≤ 8) and the picker values are inside their limits.

## Open items for Karim

| # | Item | Options | Recommendation |
|---|---|---|---|
| 1 | fr «Distribuer» on the new-game alert | «Distribuer» (now) / «Nouvelle donne» (before) | Keep «Distribuer»; one-line revert if you prefer the noun |
| 2 | fr `notice.undoTip` is 1.5× English: «Astuce : faites glisser le bouton Annuler latéralement pour voyager dans le temps au fil de votre partie». Same sentence in the store description | Keep / «… sur le côté pour voyager dans le temps» (drops "through your game") | Left as is: correct French, the bubble wraps. Look at it on the phone; shorten only if it takes more than three lines |
| 3 | fr «Réglages» (Apple) vs «Paramètres» (Android), glossary «draft» | one word for both platforms | Keep «Réglages»: shorter, understood everywhere |
| 4 | fr store name «Soli : Solitaire Klondike» has a no-break space before the colon | keep / «Soli - Solitaire Klondike» | Keep (correct French). If App Store Connect or Play Console rejects the character, use the hyphen form |
| 5 | it Hint button «Suggerimento» (12 letters) in the dock | keep / «Aiuto» | Decide at the device check; if it truncates, «Aiuto» in `game.hint`, `settings.hintButton.*`, the a11y hints and the store text together |
| 6 | it subtitle uses «annunci», everything else «pubblicità» | keep / «Niente pubblicità. Solo carte.» (30, loses "winnable") | Keep |
| 7 | fr `about.dedication` «ma copine» | «ma copine» / «ma compagne» | Your text, your call |

## For the orchestrator

- **Allow-list** (`UNTRANSLATED_OK`) before fr and it are registered. fr: `hud.score`, `hud.total`, `settings.scoring.standard`, `history.score`, `hud.vegasSpoken`, `time.minutes`, `a11y.rank.6`. it: `settings.scoring.standard`, `history.stats.incomplete` («Incomplete» is the Italian feminine plural). Both, if the test does not already skip values without words: `hud.badgeA11y`, `a11y.foundation`; it `history.dateTime`. A per-locale allow-list would be more precise than the global set.
- **Glossary proposals** (decided rows, not applied):
  - Solved / Incomplete, fr and it: show both numbers, «Gagnée / Gagnées», «Inachevée / Inachevées», «Vinta / Vinte», «Incompleta / Incomplete» (row status singular, stat tile plural).
  - Time, fr and it: add the setting names «Chronomètre» and «Tempo di gioco».
  - it section: note that the iOS subtitle says «Senza annunci» because «senza pubblicità» does not fit in 30 characters; everywhere else «pubblicità».
  - fr section: say that the NBSP rule also applies to the store name (or decide the hyphen form).
- **«draft» cells that can lose the mark** (used as given, read well): fr passage, Tirer, Tirage {{number}}, Montée auto, Mode de score, Jeu / Nouvelles parties, Non, Encore {{count}}; it Donna, giro, Nuova mano, Mosse automatiche, Punti, Cronologia, Gioco / Nuove partite, No, Ancora {{count}}. it «tableau» is unused in app and store. fr «Réglages» stays open (item 3).
- No code, `en.json`, context file or other locale was touched. Nothing staged or committed.
