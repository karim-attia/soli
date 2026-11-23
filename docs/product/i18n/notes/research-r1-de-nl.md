# Terminology research R1: German (de, Swiss High German) and Dutch (nl)

Researched 2026-11-23 (plan `docs/product/i18n/i18n.md`, step 5.1). Input for the merge agent: this file does not change `glossary.md`.

How to read this file:

- «…» is only this document's quoting mark, as in the glossary.
- **«draft»** in the flag column = I was unsure; the alternative is in the note column and in "Open doubts".
- **Evidence levels.** "Fetched" = I read the page today (links in Sources). "Platform knowledge" = the word iOS / Android show in their own system UI, written from knowledge and NOT re-fetched today (Apple and Google do not publish a fetchable term list); a reviewer with a device in that language can confirm in a minute.
- **What I could not get:** the in-app UI strings of Microsoft Solitaire Collection in German and Dutch. Microsoft's support pages for the game did not turn up in search, and the store pages only carry marketing text (which keeps "Solitaire", "Klondike Solitaire" in English in both languages). The board terms therefore rest on Wikipedia, the FRVR rules pages (same text structure in de and nl, clearly written by native speakers), KDE's KPatience handbook (nl) and the store pages of top apps. `src/i18n/locales/en.context.json` did not exist yet when I read the repo, so "tight" is taken from the glossary's definition column.

---

# German (`de`)

## 1. Rules section (ready to paste under "German (`de`): Swiss High German, for everyone")

The decided rules already in the glossary (ss never ß, one German for everyone, words every German speaker understands, "Made in Switzerland", numbers from `Intl`, plural forms one/other, noun capitalisation) stay as they are. The following replaces the block "To decide in phase 5".

- **Register: du, written lower-case («du», «dein», «dir»).** Never «Sie», never capitalised «Du». Prefer phrasing that needs no address at all (infinitive or noun labels: «Neues Spiel», «Spiel beenden?»); use du where a sentence speaks to the player («Dein laufendes Spiel wird beendet …»). Imperatives in the du form («Zieh den Rückgängig-Knopf zur Seite»). Evidence: the German rules page of FRVR Solitaire is du throughout; the top German solitaire listings mix Sie and du inside one text (Microsoft Solitaire Collection: marketing Sie, subscription text du; «Solitär・»: mostly Sie, some du), which reads as sloppy, so Soli picks one. Swiss utility apps (Twint's store text, SBB, Threema) say Sie, but they are banks and transport, not games; Swisscom's consumer blog is du. A free, personal, one-developer game is du.
- **Name of the game: «Solitär».** That is what Windows called the game in German since Windows 3.0 (de.wikipedia) and what the German store titles say («Solitär・», «Klassisches Solitär», «Solitär - Patience Klondike Karten Spiel»). «Solitaire» (English spelling) is the second most common spelling in German listings and is a store keyword, not an in-app word. «Patience» is the traditional word for the genre («eine Patience legen») and is a keyword too. «Klondike» is the correct variant name; players who use solitaire apps have seen it, everyday players have not: use it only next to «Solitär» («Klondike-Solitär»), never alone as the explanation.
- **Suit names: Herz, Karo, Kreuz, Pik.** Not the Swiss names for French-suited cards (Herz / Ecken / Kreuz / Schaufel). Reasons: (1) glossary rule "words every German speaker understands": «Ecken» and «Schaufel» are unknown in Germany and Austria; (2) Swiss sources themselves give both («Herz, Ecke/Karo, Schaufel/Pik, Kreuz/Treff» in the Jass article; SRF's Jass broadcasts label «Karo (Ecken)»), and the Swiss Jass app SwissJass+ describes its French deck as «Karo, Herz, Pik, Kreuz»; (3) only part of German-speaking Switzerland plays with French cards at all (Bern, Solothurn, Basel, Aargau, Thurgau), the rest uses Rosen / Schilten / Eicheln / Schellen, so the Jass names are not even universal inside Switzerland. The suit names are only spoken by screen readers.
- **Rank names: Ass, Bube, Dame, König.** Not the Jass words («Bauer», «Under», «Ober»). «Ass» has ss in every German spelling: no conflict with rule 1.
- **Card name word order: suit first, no preposition:** «Pik Ass», «Herz Dame», «Karo Sieben» → `{{suit}} {{rank}}`. Never «Ass von Pik».
- **«Farbe» means suit** in German card language. For red/black write «rot» / «schwarz» («abwechselnd rot und schwarz»), never «Farbe wechseln», or the sentence becomes ambiguous.
- **Quotes: Swiss guillemets «…» without inner spaces** (Swiss typography; NZZ, SBB, federal chancellery style). Never „…“ and never "…". Inner quotes ‹…›. Use quotes sparingly; UI labels named in a sentence need none.
- **Apostrophe ’ (U+2019)**, and only where German needs one (almost never: no «Karim’s», no plural apostrophe).
- **Ellipsis: the single character … (U+2026)**, directly after the word («Verlauf wird geladen…»).
- **Dash:** where English has « — » (em dash), German uses the en dash with spaces « – » (U+2013). Applies to the two notices («Keine sinnvollen Züge mehr – mach einen Zug rückgängig oder starte ein neues Spiel.»).
- **No exclamation marks** except a single one in a win message if English has one («Schön gewonnen!»). The not-found screen's "Oops!" is the other exception.
- **Sentence case, German capitalisation.** No English title case («Neues Spiel», «Neu austeilen», «Lösbare Blätter»). Compounds are written as one word («Zugzähler», «Spielverlauf») or with a hyphen when a name is part of it («Vegas-Total», «Klondike-Solitär», «Rückgängig-Knopf»). No "Deppenleerzeichen" («Vegas Total» is wrong).
- **`$` stays in front of the number, no space: «$52», «−$52» as the code formats it.** That is also the Swiss convention (currency sign before the amount); do not move it behind the number as German-German style would.
- **Plural forms: one, other.** Notes for the translator: (1) «Dollar» does not change after a number: `_one` «{{count}} Dollar», `_other` «{{count}} Dollar» (identical on purpose; tell the reviewer). (2) «{{count}} Zug» / «{{count}} Züge», «{{count}} Karte» / «{{count}} Karten», «{{count}} Stunde» / «{{count}} Stunden», «{{count}} Minute» / «{{count}} Minuten», «{{count}} Sekunde» / «{{count}} Sekunden». (3) «{{count}} left» has no noun in English: «Noch {{count}}» in both forms.
- **Words identical to English** that the jest allow-list must accept for `de`: «Vegas», «Standard», «Total», and `{{label}}, {{value}}`-type patterns.
- **Swiss words that are welcome** because every German speaker understands them: «Total» (HUD badge; Germans would write «Gesamt» but read «Total» without effort), «nochmals», «gratis».
- **Swiss words to avoid** (Germans and Austrians stumble): «Ecken», «Schaufel», «Bauer» (for Jack), «innert» (→ «innerhalb»), «allfällig» (→ «möglich», «eventuell»), «Unterbruch» (→ «Unterbrechung», «Pause»), «tönen» (→ «klingen»), «retour» (→ «zurück»), «aufdatieren» (→ «aktualisieren»), «Game» for Spiel (→ «Spiel»), «parkieren», «zügeln».
- **Short labels (tight keys):** «Neues Spiel», «Tipp», «Rückgängig», «Ziehen», «Punkte», «Züge», «Zeit», «Total», «Aus».
- **"Tip:" in the undo tip bubble must not become «Tipp:»**, because «Tipp» is the Hint button (one word per thing). Start the bubble without a label («Zieh den Rückgängig-Knopf zur Seite, um durch dein Spiel zu reisen») or with «Gut zu wissen:».

**ss-words to avoid where a neutral synonym is just as good** (extends the starter list; most of all in store text; never bend a sentence for it)

| Avoid (looks like a typo to a German reader) | Prefer |
|---|---|
| Spass, spassig | Freude, Vergnügen, «macht Freude» |
| gross, grösser, grossartig | viel, umfangreich, deutlich, «gut lesbare Karten» instead of «grosse Karten» |
| schliessen, abschliessen | beenden, fertig spielen |
| anschliessend | danach |
| geniessen | entspannt spielen, in Ruhe spielen |
| heisst | bedeutet, nennt sich, «das ist» |
| ausser | ohne, nur |
| weiss (wissen / colour) | kennt, erkennt; «hell» |
| regelmässig, gleichmässig, mässig | laufend, immer wieder, ruhig |
| gemäss | nach |
| fliessend (animations) | flüssig, weich |
| Strasse (a run of cards) | Folge, Reihe |
| Gruss, Grüsse | «Made in Switzerland», «Aus der Schweiz» |
| draussen | unterwegs |
| stossen auf | finden |
| Fuss, Mass, bloss, süss, Stoss | (no need for them in this app; reword) |

Not a problem, because they have ss in Germany too: Ass, klassisch, Klasse, müssen, lassen, passen, wissen, dass, Wissen, besser, vergessen, Adresse.

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| any word with `ß` | Rule 1 | the same word with ss |
| Sie, Ihr, Ihnen (address); capitalised Du / Dein | Register is du, lower-case | du, dein; or no address |
| Ecken, Schaufel, Bauer, Under, Ober, Rosen, Schilten | Jass vocabulary; not understood outside Switzerland, and not even in all of it | Karo, Pik, Bube |
| Treff (for clubs) | Austrian / Bridge word | Kreuz |
| Solver, Löser, Katalog, Seed, Algorithmus, Heuristik | Developer jargon (all-languages list) | «lösbare Blätter», «Tipp», «sinnvoller Zug», «Blatt» |
| «Keine Züge mehr möglich», «Verloren», «Game over», «Spiel vorbei» for the useful-moves notice | Stronger claim than English | «Keine sinnvollen Züge mehr» |
| Gewinn, Gewinne, Einsatz, Casino, Glücksspiel, Echtgeld, Jackpot in store text | «Gewinn» reads as prize money; next to "Vegas" this drifts into the stores' gambling policy and misleads | «Sieg», «gewinnen», «Vegas-Wertung», «Spieldollar» |
| kostenlos, gratis, umsonst | iOS name/subtitle, screenshots, Play title (price words; add «gratis», «kostenlos», «umsonst» to `PRICE_WORDS`) | say it in the description |
| werbefrei, ohne Werbung | Play title (and stay out of the Play short description) | description |
| beste, Nr. 1, #1, Top, preisgekrönt | Store policy, and not Soli's tone (several German listings are literally named «Das #1 Kartenspiel») | describe what the app does |
| Deck (for the 52 cards) | Anglicism; in gaming German it means a built deck | «Kartenspiel», «52 Karten» |
| Level, Challenge, Booster, Belohnung | Vocabulary of the ad-driven apps; Soli has none of it | (nothing) |
| Hinweis (for the Hint button) | Means "notice" in German UI; collides with the warnings | «Tipp» |

## 2. Term table (German)

| EN (canonical) | de | Flag | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | Unchanged, never declined («in Soli», «Soli bewerten»). Note: in Germany «der Soli» is the everyday word for the solidarity tax surcharge; see doubts |
| Solitaire | Solitär | | Windows' German name; dominant in German store titles. Neuter: «das Solitär» |
| Klondike | Klondike | | Kept. Only together with «Solitär» in store text («Klondike-Solitär»). In the app: «Spiel eine Partie Klondike …» is fine in the empty-history text |
| Patience | Patience | | Feminine: «die Patience», «eine Patience legen». Store keyword and one mention in the description; not an in-app word |
| **Cards** | | | |
| card | Karte | | |
| deck | Kartenspiel | «draft» | In sentences prefer «52 Karten». Alternative «Blatt» is taken by "deal"; «Deck» forbidden |
| suit | Farbe | | Card term. Red/black = «rot / schwarz», never «Farbe» |
| hearts | Herz | | Capitalised (noun) |
| diamonds | Karo | | |
| clubs | Kreuz | | |
| spades | Pik | | |
| rank | Wert | | «Kartenwert» where «Wert» alone is unclear |
| Ace | Ass | | |
| Jack | Bube | | |
| Queen | Dame | | |
| King | König | | |
| Two … Ten | Zwei, Drei, Vier, Fünf, Sechs, Sieben, Acht, Neun, Zehn | | Capitalised as card names. Nothing special |
| Ace of Spades | Pik Ass → `{{suit}} {{rank}}` | | No preposition. Foundation labels: «Pik-Ablagestapel», «Herz-Ablagestapel» … |
| face up / face down | aufgedeckt / verdeckt | | «Verdeckte Karte, Spalte {{column}}» |
| **Board** | | | |
| stock | Talon | «draft» | de.wikipedia's term («Die restlichen Karten bilden den Talon»); short; a normal word in Switzerland and Austria. Alternative: «Vorratsstapel» (FRVR), plainer but long |
| waste | Abwurfstapel | | de.wikipedia and FRVR agree |
| foundation | Ablagestapel | «draft» | de.wikipedia and FRVR agree. Risk: some apps call the waste «Ablagestapel». Alternative without that risk: «Zielstapel» |
| tableau | Tableau | | In store text prefer «die sieben Spalten» / «Spielfeld»; «Tableau» for the screen reader |
| column | Spalte | | «Spalte 3»; «Spalte {{column}}, leer» |
| pass (recycle) | Durchgang | | «Talon, keine Durchgänge mehr»; "{{count}} left" = «Noch {{count}}»; the action = «Abwurfstapel umdrehen» |
| deal (noun) | Blatt | «draft» | The card word for the cards one is dealt; FRVR uses it exactly so («ob sich jedes Blatt gewinnen lässt»). «Dieses Blatt nochmals spielen?», «Geteiltes Blatt spielen?». Alternatives: «Kartenverteilung» (clear, long), «Partie» (but that is "game") |
| **Actions** | | | |
| Draw (verb) | Ziehen | | Caption on the stock. Hint sentence: «Tipp: Zieh vom Talon.» |
| Draw 1 … Draw 5 | {{number}} ziehen | «draft» | One form for every number («1 ziehen», «3 ziehen»). Alternative «Ziehe {{number}}» (store listings write «Ziehen-1», «Ziehe 1 Karte»). Setting "Cards drawn" = «Gezogene Karten» |
| New Game | Neues Spiel | | |
| Deal Again | Neu austeilen | | Alternative «Neu geben» (card players' word, shorter) |
| Retry | Nochmals spielen | | Short form «Nochmals» if the button is tight. Not «Wiederholen» / «Erneut versuchen» (sounds like an error dialog) |
| Share | Teilen | | iOS and Android system word (platform knowledge) |
| move (noun) | Zug / Züge | | HUD «Züge»; «{{count}} Zug», «{{count}} Züge» |
| Undo | Rückgängig | «draft» | Android's word («Rückgängig machen» / «Rückgängig») and what every German solitaire listing says. iOS itself says «Widerrufen» (platform knowledge), which nobody uses for games. Draft only for length (10 letters vs 4): check on a small phone; fallback «Zurück» |
| time travel | Zeitreise | | Verb form: «durch dein Spiel reisen» |
| Auto Up | Automatisch ablegen | «draft» | Translated, matches «Ablagestapel». Alternative: keep «Auto Up» (cross-language decision for the orchestrator) |
| **Hints and warnings** | | | |
| Hint | Tipp | «draft» | Short, the game-help word. Listings mostly write «Hinweise», but «Hinweis» also means "notice" and collides with the warnings. Consequence: the undo tip bubble must not start with «Tipp:» |
| Warnings | Warnungen | | |
| useful move | sinnvoller Zug | | «Keine sinnvollen Züge mehr». Not «nützlich» (stiff), not «möglich» (stronger claim) |
| winnable / unwinnable | gewinnbar / nicht mehr gewinnbar | | Option «Spiel nicht mehr gewinnbar»; notice «Kein Weg zum Sieg mehr – …» or «Dieses Spiel ist nicht mehr gewinnbar – …» |
| Solvable deals | Lösbare Blätter | «draft» | Follows "deal". History label «Lösbar». Alternative «Lösbare Spiele» (simpler, but merges deal and game) |
| **Scoring and statistics** | | | |
| Scoring | Wertung | | Alternative «Punktewertung» if «Wertung» alone is unclear in the settings row |
| Standard | Standard | | Same as English: allow-list |
| Vegas | Vegas | | Same as English: allow-list. «Vegas-Wertung», «Vegas-Total» |
| Score | Punkte | | |
| Total | Total | | Swiss, understood everywhere, short. Same as English: allow-list. Setting: «Vegas-Total behalten» |
| Time | Zeit | | Setting "Game timer" = «Spielzeit» |
| Move counter | Zugzähler | | |
| Statistics | Statistik | | Singular is the natural section title |
| **App** | | | |
| Play | Spielen | | Alert button for a shared deal: «Spielen» too |
| History | Verlauf | | Screen title «Spielverlauf» |
| Games | Spiele | | |
| Solved | Gelöst | | |
| Incomplete | Nicht gelöst | «draft» | Neutral pair with «Gelöst»; makes no claim about why. Alternative «Abgebrochen» (clearer, but a slightly stronger claim). «… und als nicht gelöst erfasst.» |
| Active | Aktiv | | Alternative «Läuft» |
| Settings | Einstellungen | | iOS and Android system word |
| Gameplay / New Games | Im Spiel / Neue Spiele | «draft» | «Im Spiel» because «Spiel» alone is too vague and «Gameplay» is English. Alternative «Spielablauf» |
| Off | Aus | | |
| Cancel | Abbrechen | | iOS and Android system word |
| Reset | Zurücksetzen | | iOS and Android system word. «Vegas-Total zurücksetzen?» |
| win / celebration | Sieg, gewinnen / Siegesanimation | | Never «Gewinn» (prize). «Schön gewonnen!» |
| Rate Soli | Soli bewerten | | |
| open source | Open Source | | Predicate: «Soli ist Open Source». Attribute: «quelloffen» («kostenlose, quelloffene Solitär-App») |
| ads / no ads | Werbung / ohne Werbung | | «werbefrei» as adjective |
| free | kostenlos | | «gratis» is equally fine (very common in Switzerland, understood everywhere). Descriptions only |

## 3. ASO keywords (German store listing `de-DE`)

| Keyword | Why / source |
|---|---|
| Solitär | The German name since Windows; titles of the top German listings («Solitär・», «Klassisches Solitär», «Solitär: Das #1 Kartenspiel») |
| Solitaire | English spelling is equally present in German titles (Microsoft Solitaire Collection keeps it; «Solitaire - Das #1 Kartenspiel»). People type both; carry both (one in the name/subtitle, the other in the keyword field) |
| Patience | Traditional word; appears in listing titles («Solitär - Patience Klondike Karten Spiel») |
| Klondike | In the titles of several listings («Klassisches Solitär Klondike»); the exact variant |
| Kartenspiel, Kartenspiele | Category word in almost every title |
| klassisch | «Klassisches Solitär», «Der klassische Solitaire» |
| ohne Werbung, werbefrei | Soli's main difference. iOS keyword field and descriptions only; not in the Play title or Play short description. That people search «Solitär ohne Werbung» is my assumption (not verified with a keyword tool) |
| kostenlos, gratis | Descriptions and iOS keyword field only (never name/subtitle/Play title) |
| offline | Common in competitor subtitles; true for Soli. Assumption, not verified with a keyword tool |
| Open Source, quelloffen | Low volume, but Soli's niche; description |
| Schweiz, Made in Switzerland | Closing line of the description (decided in the plan); not a search keyword |

Traps: no competitor names («Microsoft», «MobilityWare») in keywords; no «Spider», «FreeCell», «Mahjong» (games Soli does not have: misleading-metadata policy); no «Nr. 1» / «beste»; «Vegas» only as the name of the scoring mode, never next to «Casino», «Gewinn», «Einsatz».

## 4. Sources (German)

- [de.wikipedia: Klondike (Patience)](https://de.wikipedia.org/wiki/Klondike_(Patience)) (fetched): «Talon», «Abwurfstapel», «Ablagestapel», «Tableau», «offen / verdeckt», «Farbe»; Windows shipped the game «im Deutschen Solitär». Decided the board terms and the game name.
- [FRVR Solitär, German rules page](https://frvr.com/de/play/solitaire/) (fetched): du throughout; «Vorratsstapel», «Abwurfstapel», «Ablagestapel», «Tableau … Spielfeld aus sieben Spalten», «verdeckt / aufgedeckt», «ziehen», «Züge», «Herz, Pik, Kreuz, Karo», «Ass, Bube, Dame, König», «ob sich jedes Blatt gewinnen lässt». Confirmed waste/foundation/column, register, and gave «Blatt» for deal.
- [Microsoft Solitaire Collection, App Store Switzerland (German)](https://apps.apple.com/ch/app/microsoft-solitaire-collection/id1103438575?l=de) (fetched): subtitle «Spiele klassisches Solitaire!»; keeps «Solitaire», «Klondike Solitaire» in English; Sie in marketing, du in legal text; ß throughout. Showed that the market leader does not localise the name and mixes registers.
- [«Solitär・», App Store Switzerland](https://apps.apple.com/ch/app/solitaire/id1493491444?l=de) (fetched): title «Solitär», «Ziehe 1 Karte oder 3 Karten», «Unbegrenzte Hinweise», «Unbegrenzte Rückgängig-Option». Evidence for «Rückgängig», «ziehen», and for «Hinweis» as the common store word for hint.
- German App Store search results (titles only, via search): [Klassisches Solitär](https://apps.apple.com/DE/app/id1482887935), [Solitär: Das #1 Kartenspiel](https://apps.apple.com/DE/app/id1073936461), [Solitaire - Das #1 Kartenspiel](https://apps.apple.com/DE/app/id1578681725), [Klassisches Solitär Klondike](https://apps.apple.com/DE/app/id1628542227), [Solitär - Patience Klondike Karten Spiel](https://apps.apple.com/de/app/id1180932776?l=de). ASO keywords; «Solitär» and «Solitaire» both in titles.
- [Jass article (dewiki mirror)](https://dewiki.de/Lexikon/Jass) (search summary): French-suited names «Herz, Ecke/Karo, Schaufel/Pik, Kreuz/Treff»; SRF labels «Karo (Ecken)». Shows the Swiss names always travel with the standard ones.
- [Blick: Rosen und Schilten vs. Herz und Schaufel](https://www.blick.ch/sport/rosen-und-schilten-vs-herz-und-schaufel-so-entstand-der-roestigraben-der-jasskarten-id17873915.html) (search summary): which cantons play with French cards. Shows «Schaufel / Ecken» is regional even inside Switzerland.
- [SwissJass+ on the App Store](https://apps.apple.com/ch/app/swissjass/id982835004?l=en) (search summary): a Swiss Jass app names its French deck «Karo, Herz, Pik, Kreuz».
- [Prepaid TWINT, App Store Switzerland](https://apps.apple.com/ch/app/prepaid-twint-andere-banken/id1001116392) (search summary): Sie in the store text; [Swisscom blog on Swiss apps](https://www.swisscom.ch/de/privatkunden/blog/apps/diese-nuetzlichen-schweizer-apps-erleichtern-dir-den-alltag-2133065/): du. Register evidence: Swiss finance says Sie, Swiss consumer content says du.
- Platform verbs (Teilen, Einstellungen, Abbrechen, Zurücksetzen, Aus, Verlauf; iOS «Widerrufen» vs Android «Rückgängig»): platform knowledge, not fetched.
- Evidence for ss-only German: unchanged, see the glossary.

## 5. Open doubts (German)

1. **Hint = «Tipp» or «Hinweis».** Store listings say «Hinweise»; I chose «Tipp» for length and because «Hinweis» is also "notice". Cost: the undo tip bubble loses its «Tipp:» prefix. If Karim prefers «Hinweis», the bubble can keep «Tipp:».
2. **deal = «Blatt».** Correct card German and used by FRVR, but a player may first read «Blatt» as "hand". If it tests badly: «Lösbare Spiele» in the setting and «dieses Spiel nochmals spielen», accepting that deal and game merge. Good candidate for Karim's "please eyeball" list.
3. **foundation = «Ablagestapel»** has two sources but is used for the waste in some other apps; «Zielstapel» is unambiguous. Microsoft's own German word could not be verified.
4. **stock = «Talon»** vs «Vorratsstapel». Only spoken by screen readers and used in one hint sentence.
5. **Undo = «Rückgängig»** is right but long for the dock: needs the device check on a small phone.
6. **Auto Up:** «Automatisch ablegen» vs keeping the English name: cross-language call.
7. **«Soli» in Germany** is the common nickname of the Solidaritätszuschlag (a tax). No change proposed (the name is fixed), but the German store subtitle should contain «Solitär» so the name is read correctly, and search for «Soli» alone will compete with tax results.
8. **Register:** du is my decision; I found no Swiss solitaire app with its own German to compare (the Swiss store shows the same international apps as the German one).
9. **ASO volumes** («ohne Werbung», «offline») are assumptions from competitor titles, not from a keyword tool.

---

# Dutch (`nl`)

## 1. Rules section (ready to paste under "Dutch (`nl`)")

- **Register: je / jij / jouw. Never u / uw.** Evidence: Microsoft Solitaire Collection's Dutch store text («Je favoriete klassieke Solitaire-spellen», «Meld je aan»), Brainium's «⋆Patience» («op je telefoon», «Houd je statistieken bij»), FRVR's Dutch rules page (je throughout, no u). Only legal boilerplate and KDE's old handbook say u.
- **One Dutch for the Netherlands and Flanders.** Standard Dutch, no Netherlands-only slang («potje», «ff», «tof»), no Flemish-only words. The words below are the same in both.
- **Name of the game: «patience» «draft».** It is the Dutch word for the genre (nl.wikipedia's article is «Patience (kaartspel)»; Klondike is «een van de bekendste patiences»), and Brainium, a top publisher, localises its Dutch title to «⋆Patience» with the subtitle «Ontspan met Solitaire». «Solitaire» is the word Windows taught everyone and what Microsoft and most listings keep. Decision: in the app and in running text «patience»; the store name/subtitle and keywords carry **both** words. Lower-case in a sentence («een spelletje patience»), capital only in a title. Alternative: «Solitaire» everywhere.
- **«Klondike»** is kept; known to app players only. Use it next to «patience» («Klondike-patience»), not alone.
- **Button style: infinitive** («Delen», «Annuleren», «Ongedaan maken», «Resetten», «Spelen»), as Android, Microsoft and the Dutch game listings do. iOS's own system UI uses the imperative stem («Deel», «Annuleer», «Herstel»; platform knowledge); Soli is one text for both platforms, and the infinitive is what Dutch readers see in most apps. Exception: the draw caption and mode name «Trek» / «Trek {{number}}», the established form in solitaire apps («Trek-1 of Trek-3»). Sentences that speak to the player use the je-imperative («Sleep de knop …», «Speel deze verdeling …»).
- **Sentence case.** No capitals on nouns, no English title case («Nieuw spel», «Opnieuw delen», «Oplosbare verdelingen»). Suit and rank names are lower-case («schoppen aas»); a label that starts with one gets a capital only if it starts a sentence the player reads (screen-reader labels may start lower-case).
- **Compounds are written as one word** («zettenteller», «spelgeschiedenis», «eindstapel», «voorraadstapel»). A hyphen where a name or a foreign word is part of it («Vegas-totaal», «Klondike-patience», «Vegas-score»). Never a space where English has one («Vegas totaal» is wrong).
- **Quotes: ‘…’ (U+2018 / U+2019)**, the usual Dutch style; double “…” only for a quote inside a quote. Never "…" or „…”. UI labels named in a sentence need none.
- **Apostrophe ’ (U+2019)**: plural of words ending in a long vowel («foto’s», but «hints», «scores»), «’s avonds». 
- **Ellipsis: the single character … (U+2026)** directly after the word («Geschiedenis laden…»).
- **Dash:** where English has « — », Dutch uses the en dash with spaces « – » (U+2013), or better two sentences / a colon.
- **No space before `: ; ? !`.** No exclamation marks beyond what English has.
- **`$` stays in front of the number without a space («$52»)**, as the code formats it. Dutch print style would put a space («$ 52»); do not, or hand-typed and code-formatted amounts differ. The number formatting itself (decimal comma, grouping) comes from `Intl`.
- **Plural forms: one, other.** Notes for the translator: (1) units of time and money stay singular after a number where Dutch does that: «{{count}} uur» in both forms, «{{count}} dollar» in both forms («min {{count}} dollar»). Identical forms on purpose; tell the reviewer. (2) «{{count}} minuut» / «{{count}} minuten», «{{count}} seconde» / «{{count}} seconden», «{{count}} zet» / «{{count}} zetten», «{{count}} kaart» / «{{count}} kaarten». (3) «{{count}} left» = «Nog {{count}}» in both forms.
- **Words identical to English** that the jest allow-list must accept for `nl`: «Hint», «Score», «Vegas», and `{{label}}, {{value}}`-type patterns.
- **Card names: suit first, no preposition:** «schoppen aas», «harten vrouw», «ruiten zeven» → `{{suit}} {{rank}}`. (Dictionaries write the face cards as one word, «schoppenaas»; the pattern is only spoken by screen readers, where the space is inaudible.) Never «aas van schoppen».
- **«kleur» means suit** in Dutch card language. For red/black write «rood» / «zwart» («om en om rood en zwart»).
- **Short labels (tight keys):** «Nieuw spel», «Hint», «Ongedaan maken» (see doubts: long), «Trek», «Score», «Zetten», «Tijd», «Totaal», «Uit».
- **"Tip:" in the undo tip bubble is «Tip:»** (a different word from the «Hint» button, so no collision).

**Forbidden words** (beyond the list for all languages)

| Word | Why | Use instead |
|---|---|---|
| u, uw | Register is je | je, jij, jouw |
| solver, oplosser, catalogus, seed, algoritme, heuristiek | Developer jargon (Microsoft's Dutch listing really says «Solitaire Oplosser») | «oplosbare verdelingen», «hint», «zinvolle zet», «verdeling» |
| «Geen zetten meer mogelijk», «Je hebt verloren», «Game over», «Spel voorbij» for the useful-moves notice | Stronger claim than English | «Geen zinvolle zetten meer» |
| gratis, kosteloos | iOS name/subtitle, screenshots, Play title (price words; add «gratis», «kosteloos» to `PRICE_WORDS`) | say it in the description |
| reclamevrij, zonder reclame, zonder advertenties, geen advertenties | Play title (and stay out of the Play short description) | description |
| beste, nr. 1, #1, top, bekroond | Store policy, not Soli's tone | describe what the app does |
| gokken, casino, inzet, echt geld, jackpot, prijzen winnen in store text | Next to "Vegas" this drifts into the stores' gambling policy and misleads | «Vegas-score», «speeldollars», «winnen» (a game) |
| deck (for the 52 cards) | Anglicism | «spel kaarten», «52 kaarten» |
| afleggen / automatisch afleggen for moving cards to the foundations | «aflegstapel» is the waste: the verb would point at the wrong pile | «wegspelen», «naar de eindstapels» |
| herstel / herstellen for Undo | iOS's word, but reads as "repair / restore" to most people | «ongedaan maken» |
| level, challenge, booster, beloning | Vocabulary of the ad-driven apps | (nothing) |
| mochelen | Regional word for patience (nl.wikipedia) | «patience» |

## 2. Term table (Dutch)

| EN (canonical) | nl | Flag | Note |
|---|---|---|---|
| **Names** | | | |
| Soli | Soli | | Unchanged |
| Solitaire | patience | «draft» | Dutch name of the genre; Brainium's Dutch title. Alternative «Solitaire» (Microsoft, most listings). Store name/subtitle/keywords carry both |
| Klondike | Klondike | | Kept; with «patience»: «Klondike-patience». In the app: «Speel een spelletje Klondike …» is fine |
| Patience | patience | | Same word as the row above: Dutch took the name from French, as British English did |
| **Cards** | | | |
| card | kaart | | |
| deck | spel kaarten | | In sentences prefer «52 kaarten». «kaartspel» is the card *game* |
| suit | kleur | | Card term. Red/black = «rood / zwart» |
| hearts | harten | | Lower-case |
| diamonds | ruiten | | |
| clubs | klaveren | | |
| spades | schoppen | | |
| rank | waarde | | |
| Ace | aas | | |
| Jack | boer | | |
| Queen | vrouw | | Alternative «dame» (more Flemish); «vrouw» is the standard |
| King | koning | «draft» | Matches the K on the card face and FRVR. Traditional Dutch card word is «heer» (KDE handbook; Dutch-index cards show H). Alternative «heer» |
| Two … Ten | twee, drie, vier, vijf, zes, zeven, acht, negen, tien | | Lower-case. Nothing special |
| Ace of Spades | schoppen aas → `{{suit}} {{rank}}` | | No preposition. Foundation labels: «Eindstapel schoppen», «Eindstapel harten» … |
| face up / face down | open / dicht | | «Dichte kaart, kolom {{column}}» (FRVR: «dichte kaarten», «open kaarten»). Alternative «gesloten» |
| **Board** | | | |
| stock | voorraadstapel | «draft» | FRVR. Alternatives: «stok» (the traditional card word, short, but many players do not know it), «talon» (KDE) |
| waste | aflegstapel | | FRVR. KDE says «reststapel» |
| foundation | eindstapel | | FRVR («de vier lege eindstapels») |
| tableau | speelveld | | FRVR explains «tableau» as «het speelveld»; in store text «de zeven kolommen» |
| column | kolom | | «Kolom 3»; «Kolom {{column}}, leeg» |
| pass (recycle) | ronde | «draft» | «Voorraadstapel, geen rondes meer»; "{{count}} left" = «Nog {{count}}»; the action = «Aflegstapel omdraaien» (FRVR: the stock is «omgedraaid»). Alternative «doorgang» |
| deal (noun) | verdeling | «draft» | Keeps deal apart from «spel» (game). «Deze verdeling opnieuw spelen?», «Gedeelde verdeling spelen?». Alternative «spel» (what FRVR and bridge players say, but then deal = game) |
| **Actions** | | | |
| Draw (verb) | Trek | | Caption on the stock. Hint sentence: «Hint: trek een kaart van de voorraadstapel.» |
| Draw 1 … Draw 5 | Trek {{number}} | | Brainium: «Trek-1 of Trek-3». One form for every number. Setting "Cards drawn" = «Getrokken kaarten» |
| New Game | Nieuw spel | | |
| Deal Again | Opnieuw delen | | |
| Retry | Opnieuw spelen | | Short form «Opnieuw» if tight |
| Share | Delen | | Android / general; iOS says «Deel» (platform knowledge) |
| move (noun) | zet / zetten | | HUD «Zetten»; «{{count}} zet», «{{count}} zetten» |
| Undo | Ongedaan maken | «draft» | Android's word and what the listings say («Onbeperkte hints en ongedaan maken»). Draft only for length (14 characters vs 4): check on a small phone; fallback «Terug» |
| time travel | tijdreizen | | «… om door je spel te tijdreizen»; noun «tijdreis» |
| Auto Up | Automatisch wegspelen | «draft» | Not «afleggen» (see forbidden words). Alternative: keep «Auto Up» (cross-language decision for the orchestrator) |
| **Hints and warnings** | | | |
| Hint | Hint | | Dutch word («Onbeperkte hints»). Same as English: allow-list |
| Warnings | Waarschuwingen | | |
| useful move | zinvolle zet | | «Geen zinvolle zetten meer». Not «mogelijke» (stronger claim) |
| winnable / unwinnable | te winnen / niet meer te winnen | | Option «Spel niet meer te winnen»; FRVR: «of elk spel te winnen is» |
| Solvable deals | Oplosbare verdelingen | «draft» | Follows "deal". History label «Oplosbaar». Alternative «Oplosbare spellen» |
| **Scoring and statistics** | | | |
| Scoring | Puntentelling | | |
| Standard | Standaard | | |
| Vegas | Vegas | | Same as English: allow-list. «Vegas-score», «Vegas-totaal» |
| Score | Score | | Same as English: allow-list (Brainium: «Vegas-scoremodus») |
| Total | Totaal | | Setting: «Vegas-totaal bewaren» |
| Time | Tijd | | Setting "Game timer" = «Speeltijd» |
| Move counter | Zettenteller | | |
| Statistics | Statistieken | | Brainium: «Houd je statistieken bij» |
| **App** | | | |
| Play | Spelen | | |
| History | Geschiedenis | | Screen title «Spelgeschiedenis» |
| Games | Spellen | | |
| Solved | Opgelost | | |
| Incomplete | Niet afgemaakt | «draft» | Plain and makes no claim about why. Alternative «Onvoltooid» (shorter, bookish). «… en als niet afgemaakt opgeslagen.» |
| Active | Bezig | | Alternative «Actief» |
| Settings | Instellingen | | iOS and Android system word |
| Gameplay / New Games | Tijdens het spel / Nieuwe spellen | «draft» | Alternative «Spelverloop» for Gameplay |
| Off | Uit | | |
| Cancel | Annuleren | | Android / general; iOS says «Annuleer» |
| Reset | Resetten | | Android / general; iOS says «Stel opnieuw in». «Vegas-totaal resetten?» |
| win / celebration | winnen, overwinning / overwinningsanimatie | | «Mooi gewonnen!» |
| Rate Soli | Soli beoordelen | | |
| open source | open source | | Predicate: «Soli is open source». Attribute as one word: «opensource-app» |
| ads / no ads | advertenties / geen advertenties | | «reclame», «reclamevrij» equally fine in running text |
| free | gratis | | Descriptions only |

## 3. ASO keywords (Dutch store listing)

| Keyword | Why / source |
|---|---|
| patience | The Dutch name; Brainium's Dutch title «⋆Patience»; subtitle of «Solitaire·» («Patience Klondike …»); Poki's Dutch category is «Patience Spelletjes» |
| solitaire | Microsoft and most titles in the Dutch store; carry both words (one in name/subtitle, the other in keywords) |
| klondike | In subtitles and descriptions («Klassiek Solitaire (Klondike of Patience)») |
| kaartspel, kaartspellen | Category word; Brainium: «’s werelds populairste kaartspel» |
| klassiek | «Klassiek Solitaire», «Speel Classic Solitaire-games!» |
| patiencen | The Dutch verb for playing patience; cheap extra keyword. Assumption, not verified with a keyword tool |
| zonder reclame, zonder advertenties, reclamevrij | Soli's main difference. iOS keyword field and descriptions only; not in the Play title or Play short description. Search volume is an assumption |
| gratis | Descriptions and iOS keyword field only |
| offline | Common in competitor text; true for Soli. Assumption |
| open source | Niche; description |

Traps: no competitor names; no «spider», «freecell», «mahjong» (games Soli does not have); no «nr. 1» / «beste»; «Vegas» only as the scoring mode's name, never next to «casino», «gokken», «inzet».

## 4. Sources (Dutch)

- [nl.wikipedia: Patience (kaartspel)](https://nl.wikipedia.org/wiki/Patience_(kaartspel)) (fetched): «patience» is the genre's Dutch name, from French («geduld»); «Solitaire» is given as the (American) English name; Klondike is «een van de bekendste patiences» and the Windows game; regional «mochelen». Decided the game name. (nl.wikipedia has no Klondike article under the titles I tried.)
- [FRVR Patience, Dutch rules page](https://frvr.com/nl/play/solitaire/) (fetched): je throughout; «voorraadstapel», «aflegstapel», «eindstapels», «tableau … het speelveld … zeven kolommen», «dichte kaarten», «open kaarten», «trekken», «zetten», «harten, schoppen, klaveren en ruiten», «Aas … Boer, Vrouw en Koning», «of elk spel te winnen is». Decided the board terms, suits, ranks, register.
- [Brainium «⋆Patience», App Store Netherlands](https://apps.apple.com/nl/app/patience/id479280326) (fetched): title «⋆Patience», subtitle «Ontspan met Solitaire», «Klassiek Solitaire (Klondike of Patience)», «Trek-1 of Trek-3», «Onbeperkte hints en ongedaan maken», «Vegas-scoremodus», «zetten», «Houd je statistieken bij»; je. Decided Draw, Hint, Undo, Score, Statistics, and the both-names store strategy.
- [Microsoft Solitaire Collection, App Store Netherlands](https://apps.apple.com/nl/app/microsoft-solitaire-collection/id1103438575) (fetched): «Speel Classic Solitaire-games!», keeps «Solitaire» and «Klondike Solitaire»; «dagelijkse uitdagingen», «Solitaire Oplosser», «kaartruggen»; je in marketing, u in legal text. Register; shows Microsoft does not localise the name.
- [«Solitaire·», App Store Netherlands](https://apps.apple.com/nl/app/id1360098321?l=nl) (fetched): subtitle «Patience Klondike Solitare»; description in English. ASO: all three names in one subtitle.
- [KDE KPatience handbook, Dutch (PDF)](https://docs.kde.org/trunk_kf6/nl/kpat/kpat/kpat.pdf) (search summary, not opened): «talon», «reststapel», «Heer», u-register. The older, formal vocabulary; source of the alternatives.
- [Poki: Patience Spelletjes](https://poki.com/nl/patience) (search result title): the Dutch category name on a large games portal is «Patience».
- Platform verbs (Delen / Deel, Annuleren / Annuleer, Instellingen, Resetten / Stel opnieuw in, Uit, Geschiedenis, Ongedaan maken / Herstel): platform knowledge, not fetched.

## 5. Open doubts (Dutch)

1. **Game name «patience» vs «Solitaire».** The traditional Dutch word and one top publisher's localised title, against Microsoft and the majority of store titles. Both go into the store metadata either way; the doubt is only the in-app and running-text word. No native reader in the loop: worth a second opinion.
2. **deal = «verdeling»** is my construction to keep deal ≠ game; I found no Dutch solitaire app that names the concept (FRVR says «spel»). If it reads oddly: «spel» and «Oplosbare spellen».
3. **King = «koning» vs «heer»**, and Queen «vrouw» vs «dame»: spoken by screen readers only.
4. **stock = «voorraadstapel»** vs «stok».
5. **Undo = «Ongedaan maken»** is 14 characters on a tight dock button: device check; fallback «Terug».
6. **Button style:** infinitive on buttons but «Trek» (imperative stem) for draw. Follows the market, but it is an inconsistency a reviewer may want to settle one way («Trekken»).
7. **Auto Up:** «Automatisch wegspelen» vs keeping the English name: cross-language call.
8. **Microsoft Solitaire Collection's Dutch in-app terms** could not be read; if someone can open the app in Dutch, check Hint, Undo, the draw mode and the pile names against this table.
9. **ASO volumes** are assumptions from competitor titles, not from a keyword tool.
