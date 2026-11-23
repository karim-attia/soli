# Terminology research R2: French (`fr`) and Italian (`it`)

Researcher R2, 2026-11-23 (plan `docs/product/i18n/i18n.md`, step 5.1). Input for the merge agent: nothing here is in `glossary.md` yet.

- «…» around a word is this document's quoting mark (as in the glossary). «draft» after a term = unsure; the alternative is in the note column and in "Open doubts".
- Evidence levels: **[read]** = page fetched today; **[known]** = platform convention from my own knowledge, not re-fetched today (Apple / Google / Microsoft system UI wording). Microsoft Solitaire Collection's **in-game** labels could not be read online in either language (only its store pages); see Open doubts.
- NBSP below means U+00A0. In the term tables a French term never contains punctuation that needs one, so the tables are plain text.

---

# French (`fr`)

## 1. Rules section (ready to paste into the glossary's "French (`fr`)" section)

Status: researched 2026-11-23 (R2). Notes: `docs/product/i18n/notes/research-r2-fr-it.md`.

- **Register: vous.** Sentences address the player with «vous» (imperative: «Annulez ou commencez une nouvelle partie»). Evidence: the three biggest solitaire apps write their French in «vous» (MobilityWare, Brainium, Microsoft Solitaire Collection), and so do the French system UIs of Apple, Google and Microsoft. Only web portals aimed at a young audience use «tu» (FRVR). «Vous» also reads right for every age in France, Romandie, Belgium and Québec.
- **Buttons and menu entries are infinitives or nouns, never imperatives:** «Annuler», «Partager», «Rejouer», «Jouer», «Piocher», «Noter Soli»; settings titles are nouns («Avertissements», «Compteur de coups»). Alert questions use the infinitive: «Commencer une nouvelle partie ?».
- **Name of the game: «Solitaire».** Every top app in the French stores is titled «Solitaire». «Réussite» (France) and «patience» (Belgium, Switzerland, older usage) are understood by card players but nobody searches an app by them: store keywords only, never in the app. In running text the game is lower-case («une partie de solitaire»); «Soli», «Klondike» and «Vegas» keep their capital.
- **«Klondike» stays «Klondike».** Card-game players know it and the top apps use it in subtitles («Jeu de cartes Klondike»); casual players do not, so store text always puts «solitaire» next to it. Where English says "Klondike" in the app (empty History text, share message), French keeps «Klondike».
- **Neutral French.** No word that is only French, Swiss, Belgian or Canadian. Digits are never written as words (so no «septante» / «soixante-dix» question). Numbers, dates and times come from `Intl`.
- **Spaces before punctuation:** a no-break space (U+00A0) before `:` `?` `!` `;` and inside guillemets (`«` NBSP … NBSP `»`). Never a normal space (it wraps the mark onto the next line) and not the narrow U+202F (font coverage is not guaranteed; Apple's, Google's and Microsoft's French UIs use U+00A0). No space before `,` `.` `…`. This also applies before a colon that follows a placeholder or a word in a label («Indice : …», «Astuce : …»).
- **Quotes:** « » (with NBSP inside). **Apostrophe:** typographic ’ (U+2019) everywhere («l’historique», «aujourd’hui», «d’annulation»). **Ellipsis:** the single character … (U+2026), no space before it. **Ligature:** «cœur» with œ, never «coeur».
- **Dash:** English joins two clauses with " — ". French does not copy it: write two sentences or use a colon («Aucun coup utile restant. Annulez ou commencez une nouvelle partie.»).
- **Capitalisation:** sentence case everywhere («Nouvelle partie», not «Nouvelle Partie»). Capitals keep their accent («À», «É»: «Égalité», «À propos»).
- **`$` in Vegas:** stays where English has it (`$0`, `$52`), because the HUD formats the amount in code that way. Not «52 $». Spoken form (screen reader): «{{count}} dollar» / «{{count}} dollars», negative «moins {{count}} dollars».
- **Plural forms (CLDR, checked by jest):** one, many, other. **`_one` covers 0 and 1** («0 coup», «1 coup», «2 coups»), so `_one` always shows `{{count}}` and its noun is singular. `_many` is required and equals `_other`. Agreement to watch: «{{count}} restant» (one) / «{{count}} restants» (many, other), which refers to «passage» (masculine).
- **Gender of the board words** (for agreement in screen-reader labels): la carte, la pioche, la défausse, la fondation, la colonne, la donne, la partie (feminine); le coup, le passage, le tableau, le score, le total (masculine). «vide» is the same for both.
- **Card names:** `{{rank}} de {{suit}}`, suit in the singular: «As de pique», «Dame de cœur», «Huit de carreau». The four suit names start with a consonant, so «de» never elides. Rank names are written with a capital in their own strings (they start the label); suit names are lower-case.
- **No article in front of `{{card}}`.** A card name comes without article, so do not build «déplacez {{card}}» (it would read «déplacez Roi de pique»). Write the hint as a label: «Indice : {{card}} vers la colonne {{column}}.»
- **«plus» is ambiguous in writing** («plus de coups» = no more / more moves). Never start the notice with «Plus de …»: use «Aucun … restant» or «Il ne reste aucun …».
- **Short labels** (tight keys): «Annuler» (Undo), «Indice» (Hint), «Piocher» (Draw), «Score», «Coups» (Moves), «Temps» (Time), «Total», «Désactivé» (Off), «Nouvelle partie» (New Game: no shorter natural word exists; check it on a small phone).
- **Identical to English, on purpose** (need the jest allow-list): «Standard», «Score», «Total», «Vegas», «Soli», «Klondike».

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| talon | Means the stock on Wikipedia/Vikidia and the waste on FRVR: players disagree | pioche (stock), défausse (waste) |
| stock, déchet, mouvements, pont (for deck) | Word-for-word translations seen on cardgames.io («Le Stock», «Le Déchet», «0 Mouvements») | pioche, défausse, coups, jeu de cartes |
| enseigne | Correct technical word for suit, unknown to players | couleur |
| «couleur» for red/black | «couleur» is the suit. Do not use it for red vs black in the same text | «rouge et noir», «en alternant rouge et noir» |
| Plus de coups utiles / Plus de coup… at the start of a sentence | «plus» reads as "more" | Aucun coup utile restant |
| Aucun coup possible, Perdu, Partie terminée, Game over (for the useful-moves notice) | Stronger claim than English | Aucun coup utile restant |
| solveur, graine, algorithme, heuristique, catalogue | Developer jargon | donne gagnable, indice, coup utile, donne |
| gratuit, gratuite, gratuitement, gratis, offert, «0 €» | Price words: not in the iOS name/subtitle, not in the Play title | description only |
| sans pub, sans publicité | Not in the Play title (and keep out of the Play short description) | description |
| meilleur, n° 1, top, incontournable | Store policy and tone | describe what the app does |
| tu / ton / tes | Register is vous | vous / votre / vos |
| coeur, ... (three dots), ' (straight apostrophe), a space that is not U+00A0 before : ? ! ; | Orthography rules above | cœur, …, ’, NBSP |

**Store / ASO keywords**

| Keyword | Why / source |
|---|---|
| solitaire | The name everybody types; every top result in Google Play France is titled «Solitaire - …» (Play search, hl=fr) |
| jeu de cartes / jeux de cartes | Second half of the top titles («Solitaire - Jeux de Cartes», «Spider Solitaire: Jeu de carte») and of the iOS subtitles («Jeu de cartes Klondike», «Jeu de cartes classiques») |
| carte, cartes | Covers «jeu de carte» (frequent singular spelling in searches) |
| classique | «Solitaire - Jeu Classique», «Solitaire: Cartes classiques», «Jeux de Solitaire classiques !» |
| klondike | Used in MobilityWare's subtitle and Microsoft's mode list; low volume, exact match for Soli |
| patience | «Solitaire - Patience» is in the Play top 10; Belgian/Swiss/older name |
| réussite | The traditional French name of the genre (Vikidia «Réussite (jeu)») |
| sans pub, sans publicité | What players add when they are tired of ads; iOS keyword field and descriptions only (not the Play title) |
| hors ligne, hors connexion | Common modifier for casual games; Soli works offline |
| gratuit | High volume; iOS keyword field and descriptions only, never name/subtitle/Play title |
| détente, relaxant | Tone words used by the top listings («pour une partie détendue») |
| français | «Solitaire - Français» is the first Play result |

Do not use as keywords: spider, freecell, pyramide, tripeaks (other games: misleading), and any app or company name.

**Sources**

- [MobilityWare Solitaire, App Store France](https://apps.apple.com/fr/app/solitaire/id500963785) [read]: subtitle «Jeu de cartes Klondike»; «Tirage de 1 ou 3 cartes», «Annulation facile», «Indices intelligents», «Donnes gagnables», «Jouez une donne rapide»; vous. Decided donne, gagnable, indice, vous.
- [Brainium Solitaire, App Store France](https://apps.apple.com/fr/app/solitaire/id359917414) [read]: «Donnes gagnantes», «Classements et statistiques», «meilleur score»; vous.
- [Microsoft Solitaire Collection, App Store France](https://apps.apple.com/fr/app/microsoft-solitaire-collection/id1103438575) [read]: «Jeux de Solitaire classiques !», «Klondike Solitaire» in the mode list, vous. Its Microsoft Store text says «tirage d'une ou trois cartes», «score traditionnel ou Vegas» (via search result).
- [FRVR Solitaire (fr)](https://frvr.com/fr/play/solitaire/) [read]: «pioche», «défausse» (also calls it «talon»), «piles de fondation», «tableau», «sept colonnes», «Pioche 1 / Pioche 3», «coups», «cartes face visible / face cachée», «couleur» for suit; tu.
- [cardgames.io Solitaire (fr)](https://cardgames.io/fr/solitaire/) [read]: «Nouvelle Partie», «Annuler», «Les Fondations», «Le Tableau»; its «Le Stock», «Le Déchet», «Mouvements» are literal translations and became forbidden words.
- [Google Play France, search "solitaire"](https://play.google.com/store/search?q=solitaire&c=apps&hl=fr&gl=FR) [read]: the titles in the keyword table.
- [Vikidia, Réussite (jeu)](https://fr.vikidia.org/wiki/R%C3%A9ussite_(jeu)) (via search result): «talon», «fondations», «tableau», the name «réussite».
- [Clubic on Microsoft Solitaire Collection](https://www.clubic.com/telecharger-fiche445608-microsoft-solitaire-collection.html) (via search result): «donne, système de score, disposition, chronomètre».
- Platform verbs [known]: iOS and Android French system UI: Annuler (both Undo and Cancel), Partager, Réinitialiser, Historique, Réglages (iOS) / Paramètres (Android, Windows). Style guides to check against: [Microsoft French style guide](https://learn.microsoft.com/globalization/reference/microsoft-style-guides), [Apple Style Guide](https://help.apple.com/applestyleguide/).
- French Wikipedia has no Klondike article under the URLs tried (404 on three titles), so it was not used.

## 2. Term table (fr)

| EN (canonical) | fr | «draft» | Note |
|---|---|---|---|
| **Names** |  |  |  |
| Soli | Soli |  | Never translated |
| Solitaire | Solitaire |  | Lower-case in running text: «une partie de solitaire». Title of every top app |
| Klondike | Klondike |  | Known to card players only; always next to «solitaire» in store text |
| Patience | patience |  | Store keyword only (also «réussite»). The English word comes from French; today it is the Belgian/Swiss/older name |
| **Cards** |  |  |  |
| card | carte |  |  |
| deck | jeu de cartes |  | «jeu de 52 cartes». Alternative «paquet» is more colloquial |
| suit | couleur |  | The card-game word for suit. Red/black is then «rouge et noir», never «couleur» |
| hearts | cœur |  | Singular, with œ |
| diamonds | carreau |  | Singular |
| clubs | trèfle |  | Singular |
| spades | pique |  | Singular |
| rank | valeur |  |  |
| Ace | As |  |  |
| Jack | Valet |  |  |
| Queen | Dame |  | Not «Reine» |
| King | Roi |  |  |
| Two … Ten | Deux … Dix |  | Deux, Trois, Quatre, Cinq, Six, Sept, Huit, Neuf, Dix. No gender or counter issue |
| Ace of Spades | `{{rank}} de {{suit}}` → «As de pique» |  | Same order as English; suit singular; no article in front |
| face up / face down | face visible / face cachée |  | «Carte face cachée, colonne {{column}}» |
| **Board** |  |  |  |
| stock | pioche |  | FRVR. Not «talon» (ambiguous) |
| waste | défausse |  | FRVR |
| foundation | fondation |  | «Fondation de trèfle». FRVR, cardgames.io, Vikidia |
| tableau | tableau |  | In store text prefer «les sept colonnes» where it reads better |
| column | colonne |  | «Colonne 3» |
| pass (recycle) | passage | «draft» | «Pioche, plus aucun passage»; «{{count}} restant(s)». The action: «Retourner la défausse pour reformer la pioche». Alternative: «tour» |
| deal (noun) | donne |  | MobilityWare, Brainium, Clubic. «Rejouer cette donne ?», «donne partagée» |
| **Actions** |  |  |  |
| Draw (verb) | Piocher | «draft» | Matches «pioche» (7 letters, tight on the card back). Alternative if it clips: «Tirer» (then the mode becomes «Tirage 1») |
| Draw 1 … Draw 5 | Pioche 1 … Pioche 5 |  | `Pioche {{number}}` (FRVR). Setting title "Cards drawn": «Cartes piochées» |
| New Game | Nouvelle partie |  | 15 characters on a tight button: check on a small phone. No natural shorter form («Nouveau jeu» is ambiguous with deck) |
| Deal Again | Nouvelle donne | «draft» | Alternative: «Distribuer» |
| Retry | Rejouer |  | «Rejouer cette donne» |
| Share | Partager |  | Platform word |
| move (noun) | coup |  | HUD «Coups»; «{{count}} coup» (0, 1) / «{{count}} coups». Not «mouvement» |
| Undo | Annuler |  | Platform word. Same word as Cancel in French on every platform; the two never appear together in Soli |
| time travel | voyager dans le temps |  | «Astuce : faites glisser le bouton Annuler sur le côté pour voyager dans le temps de votre partie» |
| Auto Up | Montée auto | «draft» | Translated. «monter» is what French patience players say for sending a card to the foundations. Alternative: «Rangement auto» |
| **Hints and warnings** |  |  |  |
| Hint | Indice |  | MobilityWare «Indices» |
| Warnings | Avertissements |  |  |
| useful move | coup utile |  | Notice: «Aucun coup utile restant» (never «Plus de coups utiles») |
| winnable / unwinnable | gagnable / ingagnable |  | Option: «Partie ingagnable». In a sentence also «ne peut plus être gagnée» |
| Solvable deals | Donnes gagnables |  | MobilityWare. History label «Gagnable». One word family (gagn-) for winnable, solvable, solved |
| **Scoring and statistics** |  |  |  |
| Scoring | Mode de score | «draft» | Alternative: «Système de score» (Clubic) |
| Standard | Standard |  | Identical to English: allow-list |
| Vegas | Vegas |  |  |
| Score | Score |  | Identical to English: allow-list |
| Total | Total |  | Identical to English: allow-list. «Conserver le total Vegas» |
| Time | Temps |  | Setting "Game timer": «Chronomètre» |
| Move counter | Compteur de coups |  |  |
| Statistics | Statistiques |  |  |
| **App** |  |  |  |
| Play | Jouer |  |  |
| History | Historique |  | Screen title «Historique des parties» |
| Games | Parties |  |  |
| Solved | Gagnée |  | Status «Gagnée», stat «Gagnées» (agrees with «partie») |
| Incomplete | Inachevée |  | Stat «Inachevées». Not «Abandonnée» (stronger than English) |
| Active | En cours |  |  |
| Settings | Réglages | «draft» | Apple's word; short and fine on Android. Alternative: «Paramètres» (Android, Windows) |
| Gameplay / New Games | Jeu / Nouvelles parties | «draft» | Alternative for Gameplay: «Pendant la partie» |
| Off | Désactivé | «draft» | Alternative: «Non» (shorter, Apple's older toggle word) |
| Cancel | Annuler |  | Platform word |
| Reset | Réinitialiser |  | Platform word. «Réinitialiser le total Vegas» |
| win / celebration | victoire / animation de victoire |  |  |
| Rate Soli | Noter Soli |  |  |
| open source | open source |  | Used as is in French tech text; «code source sur GitHub» for the link |
| ads / no ads | publicité / sans publicité |  | «pub» only in keywords |
| free | gratuit |  | Descriptions only |

## 3. ASO keywords (fr)

See the "Store / ASO keywords" table in section 1 (same content; kept in one place so the merge agent pastes it once). Suggested iOS keyword string to start from (99 characters; remove any word that ends up in the name or subtitle):

`solitaire,klondike,cartes,patience,réussite,classique,sans pub,hors ligne,gratuit,détente,jeu,carte`

## 4. Sources (fr)

Listed in section 1 under "Sources".

## 5. Open doubts (fr)

| # | Doubt | Pick | Alternative | How to settle |
|---|---|---|---|---|
| F1 | Draw caption: 7 letters at 11 px on a card back | Piocher / Pioche 3 | Tirer / Tirage 3 (Microsoft and MobilityWare say «tirage») | Device check; if «Piocher» clips, switch both rows together |
| F2 | Settings word differs per platform | Réglages | Paramètres | Karim's eye; one string serves both platforms |
| F3 | Off as a picker value | Désactivé | Non, Aucun | Reviewer + device (tight) |
| F4 | Auto Up has no established French name | Montée auto | Rangement auto, Coups automatiques | Karim's eye (French speaker) |
| F5 | pass | passage | tour | Reviewer |
| F6 | Deal Again | Nouvelle donne | Distribuer | Reviewer |
| F7 | Scoring vs Score share the word «score» | Mode de score / Score | Système de score | Reviewer |
| F8 | Undo and Cancel are both «Annuler» | keep (platform standard) | none natural | Accept; note in the glossary that this is intended |
| F9 | `$0` in a sentence: French typography wants «0 $» | `$0` as in English (matches the HUD) | «0 $», or «repart de zéro» | Orchestrator, same decision for it/es/de |
| F10 | Microsoft Solitaire Collection's French in-game labels were not readable online | — | — | Someone with the app in French checks: stock/waste names, «Indice», «Annuler», draw-mode label |
| F11 | `New Game` is 15 characters | Nouvelle partie | — | Device check in phase 9 |
| F12 | Glossary row "Klondike" says "store text only", but `en.json` uses it in `history.emptyBody` and `share.dealMessage` | keep «Klondike» there | «solitaire» | Orchestrator: fix the row's definition |
| F13 | About screen: "my girlfriend" | «ma copine» | «ma compagne» | Karim (personal text) |

---

# Italian (`it`)

## 1. Rules section (ready to paste into the glossary's "Italian (`it`)" section)

Status: researched 2026-11-23 (R2). Notes: `docs/product/i18n/notes/research-r2-fr-it.md`.

- **Register: tu.** Every top solitaire app addresses the player with «tu» in Italian (MobilityWare «quando hai bisogno di aiuto», Brainium «i tuoi amici», Microsoft Solitaire Collection «Divertiti», FRVR, cardgames.io), and so do Apple's and Google's Italian UIs. Never «Lei» or «voi».
- **Buttons are second-person imperatives, as in the Italian system UIs:** «Annulla», «Condividi», «Gioca», «Rigioca», «Pesca», «Azzera», «Valuta Soli». Settings titles are nouns («Avvisi», «Contatore mosse»). Alert questions: «Vuoi iniziare una nuova partita?» or the infinitive «Iniziare una nuova partita?»; pick one form and keep it (recommended: «Vuoi …?»).
- **Name of the game: «Solitario».** The Italian Play top results are all «Solitario - Classico gioco». The English spelling «Solitaire» is known from app titles and is a store keyword, not a word for the app. Lower-case in running text («una partita a solitario»). No Italian equivalent of "Patience" is in use.
- **«Klondike» stays «Klondike».** Italian Wikipedia's article is titled «Klondike» and says it is «spesso chiamato semplicemente Solitario»; the top apps use it in subtitles («Gioco di carte Klondike»). In store text it always stands next to «solitario».
- **Neutral Italian** for Italy and Ticino: no regional words; numbers, dates and times come from `Intl` (it-CH gets its own separators from the device region).
- **Punctuation:** no space before `: ; ? !`. **Quotes:** “…” (U+201C / U+201D), as in Apple's Italian UI. **Apostrophe:** typographic ’ (U+2019): «l’ultima», «un po’». **Ellipsis:** … (U+2026).
- **Accents:** «È» with the accent (never «E'»); acute in «perché», «finché»; grave in «più», «è», «già».
- **Dash:** do not copy the English " — ". Use a colon or two sentences («Nessuna mossa utile rimasta. Annulla o inizia una nuova partita.»).
- **Capitalisation:** sentence case («Nuova partita», not «Nuova Partita»).
- **`$` in Vegas:** stays where English has it (`$0`, `$52`), matching the HUD. Spoken form: «{{count}} dollaro» / «{{count}} dollari», negative «meno {{count}} dollari».
- **Plural forms (CLDR, checked by jest):** one, many, other. `_one` is the number 1 only; 0 takes `_other` («0 mosse», «1 mossa», «2 mosse»). `_many` is required and equals `_other`. Agreement to watch: «{{count}} rimasto» (one) / «{{count}} rimasti», which refers to «giro» (masculine).
- **Gender of the board words:** la carta, la base, la colonna, la mano, la partita, la mossa (feminine: «vuota», «vinta», «incompleta»); il mazzo, il giro, il punteggio, il totale (masculine: «vuoto»); gli scarti (masculine plural).
- **Card names:** `{{rank}} di {{suit}}`, suit in the plural: «Asso di picche», «Donna di cuori», «Otto di quadri». Rank names take a capital in their own strings; suit names are lower-case.
- **No article in front of `{{card}}`:** write the hint as a label («Suggerimento: {{card}} nella colonna {{column}}.»), not «sposta {{card}}», which would need «il / la / l’».
- **«mazzo» is the stock; the 52 cards are always «mazzo di carte» or «mazzo da 52 carte»**, so the two never read the same.
- **Short labels** (tight keys): «Annulla» (Undo), «Pesca» (Draw), «Punti» (Score), «Mosse» (Moves), «Tempo» (Time), «Totale» (Total), «Nuova partita» (New Game), «Suggerimento» (Hint: 12 letters, check on a small phone), «Disattivato» (Off: check).
- **Identical to English, on purpose** (need the jest allow-list): «Standard», «Vegas», «Soli», «Klondike».

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| tallone | Means the stock on Wikipedia («Solitario») and the waste on FRVR | mazzo (stock), scarti (waste) |
| pozzo | Book word for the waste, unknown to app players | scarti |
| fondazione, fondazioni | Calque of "foundation" | base, basi |
| invincibile | Means "cannot be beaten", the opposite of what is meant | non più vincibile, non si può più vincere |
| Nessuna mossa possibile, Hai perso, Partita finita, Game over (for the useful-moves notice) | Stronger claim than English | Nessuna mossa utile rimasta |
| risolutore, algoritmo, euristica, catalogo, and «seme» in the sense of seed | Developer jargon; «seme» is the suit | mano vincibile, suggerimento, mossa utile, mano |
| gratis, gratuito, gratuita, gratuitamente, omaggio, «0 €» | Price words: not in the iOS name/subtitle, not in the Play title | description only |
| senza pubblicità, senza annunci | Not in the Play title (and keep out of the Play short description) | description |
| migliore, n. 1, top | Store policy and tone | describe what the app does |
| Lei / voi forms | Register is tu | tu |
| E' , perchè, po' with a straight apostrophe | Orthography rules above | È, perché, po’ |

**Store / ASO keywords**

| Keyword | Why / source |
|---|---|
| solitario | The name people type; the first three Play results in Italy are «Solitario - Classico gioco» (Play search, hl=it) |
| solitaire | Many top apps keep the English title in the Italian stores (MobilityWare, Brainium, Microsoft); people type both |
| carte, gioco di carte, giochi di carte | Subtitles «Gioco di carte Klondike», «Solitaire: Carte classiche» |
| classico | «Classico gioco», «Gioco di solitario classico», «Gioca ai classici Solitaire!» |
| klondike | Subtitle of MobilityWare, mode list of Microsoft; low volume, exact match |
| senza pubblicità | What players look for; iOS keyword field and descriptions only (not the Play title) |
| offline, senza internet | Common modifier; Soli works offline |
| gratis | High volume, more typed than «gratuito»; iOS keyword field and descriptions only |
| rilassante, passatempo | Tone words of the top listings («partita più rilassata») |
| italiano | Local-language modifier (the French Play top result is «Solitaire - Français»; assumed to work the same way, not verified for Italy) |

Do not use as keywords: spider, freecell, piramide, tripeaks (other games), and any app or company name.

**Sources**

- [MobilityWare Solitaire, App Store Italy](https://apps.apple.com/it/app/solitaire/id500963785) [read]: subtitle «Gioco di carte Klondike»; «Pesca 1 o pesca 3 carte», «Annullamento semplice», «Suggerimenti intelligenti quando hai bisogno di aiuto», «Mani vincibili», «Gioca una mano veloce»; tu. Decided pesca, suggerimento, mano, vincibile, tu.
- [Brainium Solitaire, App Store Italy](https://apps.apple.com/it/app/solitaire/id359917414) [read]: «Mani vincenti», «punteggio standard o vegas», «estrazione di 1 o 3 carte», «annullare le mosse e ricevere suggerimenti illimitati», «Classifiche e statistiche»; tu.
- [Microsoft Solitaire Collection, App Store Italy](https://apps.apple.com/it/app/microsoft-solitaire-collection/id1103438575) [read]: «Gioca ai classici Solitaire!», «classici giochi di solitario», «Klondike, Spider, FreeCell…», «suggerimenti illimitati», «senza pubblicità»; tu.
- [FRVR Solitaire (it)](https://frvr.com/it/play/solitaire/) [read]: «mazzo», «pila degli scarti» (also «tallone»), «pile di base», «Tableau», «colonne», «Pesca 1 e Pesca 3», «mosse», «carte scoperte / coperte», «semi»; tu.
- [cardgames.io Solitario (it)](https://cardgames.io/it/solitaire/) [read]: «Nuova partita», «Annulla», «Mosse», «Il mazzo», «Gli scarti», «Le basi», «Il tableau», «Tempo e mosse»; tu.
- [Wikipedia (it), Klondike (solitario)](https://it.wikipedia.org/wiki/Klondike_(solitario)) [read]: «spesso chiamato semplicemente Solitario», «mazzo», «colonne», «carte coperte», «pescata».
- [Wikipedia (it), Solitario](https://it.wikipedia.org/wiki/Solitario) [read]: «tallone», «pozzo», «basi», «tableau», «semi» (the book vocabulary; kept only «basi», «semi»).
- [Google Play Italy, search "solitario"](https://play.google.com/store/search?q=solitario&c=apps&hl=it&gl=IT) [read]: the titles in the keyword table.
- Platform verbs [known]: iOS and Android Italian system UI: Annulla (both Undo and Cancel), Condividi, Impostazioni, Cronologia, Ripristina / Reimposta. Style guides to check against: [Microsoft Italian style guide](https://learn.microsoft.com/globalization/reference/microsoft-style-guides), [Apple Style Guide](https://help.apple.com/applestyleguide/).

## 2. Term table (it)

| EN (canonical) | it | «draft» | Note |
|---|---|---|---|
| **Names** |  |  |  |
| Soli | Soli |  | Never translated. («soli» is also an Italian word, "alone" in the plural: harmless) |
| Solitaire | Solitario |  | Lower-case in running text: «una partita a solitario» |
| Klondike | Klondike |  | Known to card players; Wikipedia title; always next to «solitario» in store text |
| Patience | solitario |  | No Italian equivalent in use; nothing to add to keywords |
| **Cards** |  |  |  |
| card | carta |  |  |
| deck | mazzo di carte |  | Always with «di carte» / «da 52 carte», because «mazzo» alone is the stock |
| suit | seme |  | Plural «semi» |
| hearts | cuori |  | Plural |
| diamonds | quadri |  | Plural |
| clubs | fiori |  | Plural |
| spades | picche |  | Plural |
| rank | valore |  |  |
| Ace | Asso |  |  |
| Jack | Fante |  |  |
| Queen | Donna | «draft» | Card players' word (Treccani and Wikipedia: «donna (o regina)»). Alternative: «Regina», more everyday |
| King | Re |  |  |
| Two … Ten | Due … Dieci |  | Due, Tre, Quattro, Cinque, Sei, Sette, Otto, Nove, Dieci |
| Ace of Spades | `{{rank}} di {{suit}}` → «Asso di picche» |  | Same order as English; suit plural; no article in front |
| face up / face down | scoperta / coperta |  | «Carta coperta, colonna {{column}}» |
| **Board** |  |  |  |
| stock | mazzo |  | FRVR, cardgames.io, Wikipedia (Klondike). Not «tallone» |
| waste | scarti |  | «Scarti, {{card}}»; long form «pila degli scarti» |
| foundation | base |  | «Base di fiori»; plural «basi». Not «fondazione» |
| tableau | tableau | «draft» | Used as is by FRVR, cardgames.io and Wikipedia, but jargon: in store text prefer «le sette colonne». Alternative: «area di gioco» |
| column | colonna |  | «Colonna 3» |
| pass (recycle) | giro | «draft» | «Mazzo, nessun giro rimasto»; «{{count}} rimasto / rimasti». The action: «Rimetti gli scarti nel mazzo». Alternative: «passaggio» |
| deal (noun) | mano |  | MobilityWare, Brainium. «Rigiocare questa mano?», «mano condivisa» |
| **Actions** |  |  |  |
| Draw (verb) | Pesca |  | 5 letters; FRVR, MobilityWare |
| Draw 1 … Draw 5 | Pesca 1 … Pesca 5 |  | `Pesca {{number}}`. Setting title "Cards drawn": «Carte pescate» |
| New Game | Nuova partita |  | cardgames.io. 13 characters on a tight button: check |
| Deal Again | Nuova mano | «draft» | Alternative: «Dai le carte» |
| Retry | Rigioca |  | «Rigioca questa mano» |
| Share | Condividi |  | Platform word |
| move (noun) | mossa |  | HUD «Mosse»; «{{count}} mossa» / «{{count}} mosse» |
| Undo | Annulla |  | Platform word. Same word as Cancel in Italian on every platform; the two never appear together in Soli |
| time travel | viaggiare nel tempo |  | «Suggerimento: trascina il pulsante Annulla di lato per viaggiare nel tempo nella tua partita». For "Tip:" prefer «Consiglio:» so it does not collide with Hint |
| Auto Up | Mosse automatiche | «draft» | Translated; no established Italian name. Alternative: «Auto alle basi». Not «Completamento automatico» (that is the end-of-game feature in other apps) |
| **Hints and warnings** |  |  |  |
| Hint | Suggerimento |  | MobilityWare, Brainium, Microsoft. 12 letters on a tight button; fallback «Aiuto» only if it clips |
| Warnings | Avvisi |  |  |
| useful move | mossa utile |  | Notice: «Nessuna mossa utile rimasta» |
| winnable / unwinnable | vincibile / non più vincibile |  | Option: «Partita non più vincibile». Never «invincibile» |
| Solvable deals | Mani vincibili |  | MobilityWare. History label «Vincibile». One word family (vinc-) for winnable, solvable, solved |
| **Scoring and statistics** |  |  |  |
| Scoring | Punteggio |  | Brainium «punteggio standard o vegas» |
| Standard | Standard |  | Identical to English: allow-list |
| Vegas | Vegas |  |  |
| Score | Punti | «draft» | Short for the HUD badge and «Punti {{value}}», and distinct from the setting «Punteggio». Alternative: «Punteggio» for both |
| Total | Totale |  | «Mantieni il totale Vegas» |
| Time | Tempo |  | Setting "Game timer": «Cronometro» |
| Move counter | Contatore mosse |  |  |
| Statistics | Statistiche |  |  |
| **App** |  |  |  |
| Play | Gioca |  |  |
| History | Cronologia | «draft» | Platform word; screen title «Cronologia partite». Alternative: «Storico» («Storico partite»), common in games |
| Games | Partite |  |  |
| Solved | Vinta |  | Status «Vinta», stat «Vinte» |
| Incomplete | Incompleta |  | Stat «Incomplete». Alternative «Interrotta» is stronger than English |
| Active | In corso |  |  |
| Settings | Impostazioni |  | Platform word on iOS, Android and Windows |
| Gameplay / New Games | Gioco / Nuove partite | «draft» | Alternative for Gameplay: «Durante la partita» |
| Off | Disattivato | «draft» | Alternative: «No» (Apple's short picker value) |
| Cancel | Annulla |  | Platform word |
| Reset | Azzera |  | Says exactly what happens to the Vegas total («Azzera il totale Vegas»). Platform word «Ripristina» would suggest restoring something |
| win / celebration | vittoria / animazione di vittoria |  |  |
| Rate Soli | Valuta Soli |  |  |
| open source | open source |  | Used as is in Italian; «codice sorgente su GitHub» for the link |
| ads / no ads | pubblicità / senza pubblicità |  | Invariable noun |
| free | gratuito |  | Descriptions only; «gratis» in keywords |

## 3. ASO keywords (it)

See the "Store / ASO keywords" table in section 1. Suggested iOS keyword string to start from (97 characters; remove any word that ends up in the name or subtitle):

`solitario,solitaire,klondike,carte,classico,senza pubblicità,offline,gratis,rilassante,passatempo`

## 4. Sources (it)

Listed in section 1 under "Sources".

## 5. Open doubts (it)

| # | Doubt | Pick | Alternative | How to settle |
|---|---|---|---|---|
| I1 | Queen | Donna | Regina | Reviewer (native ear); the top apps' in-game speech labels were not readable |
| I2 | Score vs Scoring | Punti (badge) / Punteggio (setting) | Punteggio for both | Reviewer; device check decides if «Punteggio» fits the badge |
| I3 | History | Cronologia | Storico | Reviewer |
| I4 | Hint is 12 letters on a tight dock button | Suggerimento | Aiuto (reads as "Help") | Device check in phase 9 |
| I5 | Off | Disattivato | No | Reviewer + device (tight) |
| I6 | Auto Up has no established Italian name | Mosse automatiche | Auto alle basi | Reviewer; orchestrator's cross-language decision on Auto Up |
| I7 | pass | giro | passaggio | Reviewer |
| I8 | Deal Again | Nuova mano | Dai le carte | Reviewer |
| I9 | tableau is jargon | tableau | area di gioco | Reviewer; only the screen reader and store text use it |
| I10 | stock and deck both contain «mazzo» | mazzo / mazzo di carte | tallone for the stock (ambiguous, rejected) | Accept; rule is in the section |
| I11 | "Tip:" and "Hint" would both be «Suggerimento» | Tip = «Consiglio:» | — | Translator follows the note |
| I12 | `$0` in a sentence | `$0` as in English | «0 $», «riparte da zero» | Orchestrator, same decision as French F9 |
| I13 | Microsoft Solitaire Collection's Italian in-game labels were not readable online | — | — | Someone with the app in Italian checks stock/waste/foundation names |
| I14 | About screen: "my girlfriend" | «la mia ragazza» | «la mia compagna» | Karim (personal text) |

---

# Notes for the merge agent (both languages)

- **Allow-list for "identical to English"** in `test/unit/i18n/locales.test.ts`: fr needs `hud.score`, `hud.total`, `settings.scoring.standard` (plus the names); it needs `settings.scoring.standard` (plus the names).
- **Price words for `PRICE_WORDS`** in `test/unit/store/storeListings.test.ts`: fr gratuit, gratuite, gratuitement, gratis, offert; it gratis, gratuito, gratuita, gratuitamente, omaggio.
- **Undo = Cancel** in both languages («Annuler», «Annulla»). This breaks "different things never share a word" on purpose, because it is the platform wording in both languages.
- **Glossary row "Klondike"** says "store text only", while `en.json` uses the word in the app (`history.emptyBody`, `share.dealMessage`).
- **English source oddities seen while reading `en.json`:** apostrophes are mixed (`doesn't`, `can't` straight; `game’s` typographic); `notice.unwinnable` says "No winning moves left" while the setting option says "Unwinnable game" (two wordings for one thing).
- The two suggested keyword strings were counted by hand; the store jest test is the authority on the 100-character limit.
