---
name: soli-translation
description: Translation cookbook for the Soli app — how user-facing text gets into the 14 translated languages: the glossary as the authority for terms, the researcher / translator / reviewer roles and their briefs, how a translator writes src/i18n/locales/<locale>.json and the store listing files under store/, what the jest tests check and what only a reviewer catches, what to do when an English string is added or changed, the add-a-new-language playbook, and the Swiss High German rule (ss, never ß). Use whenever user-facing text is added or changed, a translation is written or reviewed, store listing text or release notes are translated, or a language is added.
---

# Soli translation cookbook

English is written by hand; every other language is produced by translator sub-agents working from the glossary. Nobody types a translation ad hoc into a locale file, not even "just this one string": it skips the glossary and the review.

| What | Where |
|---|---|
| English source strings (nested JSON, i18next v4 plural suffixes) | `src/i18n/locales/en.json` |
| Context per key (where it shows, `tight`, what `{{x}}` is) | `src/i18n/locales/en.context.json` |
| Translations, one file per language | `src/i18n/locales/<locale>.json` (`de`, `fr`, `es`, `pt-BR`, `it`, `nl`, `ja`, `ru`, `pl`, `tr`, `zh-Hans`, `ko`, `ar`, `he`) |
| Snapshot of `en.json` at the last full translation (stale detection) | `src/i18n/locales/en.last-translated.json` |
| The language list | `SUPPORTED_LANGUAGES` in `src/i18n/resolveLanguage.ts` |
| Terms and writing rules per language (the authority) | `docs/product/i18n/glossary.md` |
| Store listing text, limits, store locale codes | `store/` and `store/README.md` |
| Notes from researchers, translators, reviewers | `docs/product/i18n/notes/` |
| Plan, decisions, history | `docs/product/i18n/i18n.md` |

The paths under `src/i18n/` are the ones the plan defines. If one is missing or shaped differently when you start, trust the repo, tell the orchestrator, and fix this table.

## 1. When to use this

- An English string was added, reworded or removed → section 5.
- A translation is wrong or reads badly → fix the glossary row first if a term is involved (orchestrator), then run a translator for the affected keys (section 3), never a hand edit.
- Store text or release notes changed → translators for the changed files (section 3, "Store files").
- A new language → section 6.

Rules for app code (the implementer's side, repeated here because translators depend on them): no hardcoded user-facing string, text comes from `t('…')` inside a function body (never at module scope), one key per meaning (a key is not reused for a different meaning just because the English is identical), dev-only UI stays English outside `en.json` with a `// i18n: dev-only, intentionally English` comment.

## 2. Roles

All are sub-agents started by the orchestrator. Text only: none of them builds or drives a device. Languages are grouped for research and review: [de, nl] · [fr, it] · [es, pt-BR] · [ru, pl, tr] · [ja, zh-Hans, ko] · [ar, he].

| Role | Does | Writes | Never |
|---|---|---|---|
| **Researcher** (one per group, before any translation) | Finds out how the game and its parts are called in the language: Microsoft Solitaire Collection's localized UI and store page, the top local solitaire apps' store pages, Wikipedia and card-game references, Apple/Google terminology for platform verbs. Decides every term cell, the register, punctuation rules, ASO keywords | Its own languages' columns and sections in the glossary; `docs/product/i18n/notes/research-<group>.md` (sources, reasoning, doubts). Unsure picks are marked «draft» | Touch another language's column, translate the app |
| **Translator** (one per language) | Section 3 | `src/i18n/locales/<locale>.json`, the store files of its language, `docs/product/i18n/notes/<locale>.md` | Edit the glossary, `en.json`, `en.context.json`, another locale |
| **Reviewer** (one per group, a fresh agent, after translation) | Reads glossary + locale JSON + store text + the translators' notes as a native-speaker editor: glossary conformance, one register, tight labels (flag anything longer than about 1.3× English on `tight` keys), plural forms that really differ where they should, same term in app and store, store-policy words, natural tone | Fixes obvious issues in the locale and store files; applies glossary changes only to rows marked «draft»; `docs/product/i18n/notes/review-<group>.md` | Change a decided glossary row silently (propose it) |

The orchestrator merges glossary proposals, settles cross-language questions (does "Auto Up" stay English everywhere?), and gives Karim a short "please eyeball" list for the languages he reads (German, French).

## 3. Translator brief

You get: one locale, and either "the whole file" or a list of keys / store files.

### Read first

1. `docs/product/i18n/glossary.md`: the note at the top, "All languages" under UX-writing principles, your language's section (rules, forbidden words, ASO keywords), your column in the term table, "Forbidden words (all languages)".
2. `src/i18n/locales/en.json` and `src/i18n/locales/en.context.json`.
3. For store files: `store/README.md` (fields, limits, policy, your folder names) and the English files.

### App strings

Write `src/i18n/locales/<locale>.json`: the whole file, same nesting and same key order as `en.json`, 2-space indent, one newline at the end. For a partial run, change only the keys you were given and leave every other line byte-identical.

Checked by `yarn jest test/unit/i18n` (you may run it; it needs no build):

- **Same keys as English.** No extra key, none missing. Plural keys are compared by their base name.
- **`{{placeholders}}` exactly as English spells them**, the same set per key. They may move in the sentence. A space at the very start or end of a value stays (the app glues the string to something).
- **Plural forms: exactly the forms of your language** (glossary, "Plural forms"; the test uses `Intl.PluralRules`). English has `_one` and `_other`; you write your language's set (`_one`, `_few`, `_many`, `_other`, … or only `_other`) and drop forms your language does not have. French, Spanish, Italian and Brazilian Portuguese need `_many` too: give it the `_other` text.
- **`_one` shows the number through `{{count}}`, never a literal 1**, wherever your language's "one" form covers more than the number 1 (French and Brazilian Portuguese: 0 and 1; Russian: 21, 31, …). Where English's `_one` has no number at all, keep none and check that it still reads right.
- **No empty value, and no value identical to English** unless the key is on the test's allow-list for your language (`UNTRANSLATED_OK` in `test/unit/i18n/locales.test.ts`: "Vegas" for everyone, "Standard" for de / fr / it, …). If a word really is the same in your language, report the key so the orchestrator adds it for your language only.
- **German: no `ß`** (section 7).

Checked by nobody but you and the reviewer:

- The glossary term for every concept, the same one each time.
- The register your language's section prescribes, in every string.
- Short words on keys marked `tight`. If nothing short is natural, pick the shortest correct option and list the key in your notes.
- Natural phrasing over literal translation; punctuation, quotes and capitalisation of your language (English title case on buttons is not copied).
- Screen-reader labels read well when spoken aloud. The card-name pattern (`{{rank}} of {{suit}}`) may be reordered.
- Never a stronger claim than English ("No more useful moves" is not "No moves possible").
- Latin digits, `$` as is, "Soli" in Latin letters.
- Direction marks in Arabic and Hebrew are typed as the JSON escapes `\u200E` / `\u200F`, never as the raw invisible character (the Write tool can turn an escape into the raw character: check with `grep -c $'\u200e' <file>`, expect 0). Store `.txt` files carry no direction marks at all.
- Pattern keys without words (`time.join`, `hud.badgeA11y`, `history.dateTime`) stay as in English unless your language needs a linking word or other punctuation (Arabic joins duration parts with «و»).

### Store files

For your language's folders (names in `store/README.md`): `store/ios/<App Store locale>/{name,subtitle,keywords,promotional_text,description}.txt`, `store/android/<Play locale>/{title,short_description,full_description}.txt`, `store/release-notes/<app locale>.txt`. One newline at the end of each file, no trailing spaces. Self-check: `yarn jest test/unit/store`.

- **Stay inside the limits by rewording**, never by cutting a sentence or abbreviating. The limits are in characters and tight: subtitle 30, short description 80.
- **name / title:** "Soli" plus the local name of the game where English has "Solitaire". No price word ("free", "gratis", "kostenlos", …) in iOS name or subtitle; neither that nor "no ads" in the Play title.
- **keywords are not a translation.** Build them from your language's "Store / ASO keywords" table: what people there type. Comma-separated, no space after a comma, at most 100 characters, no word that is already in your name or subtitle.
- **description:** translate the meaning; keep the structure (short paragraphs, the feature list) and the calm tone. Plain text, no markdown.
- **An English file that says `TODO Karim: …`** has no text to translate yet: for keywords, write yours anyway (they do not depend on English); for anything else, skip the file and list it in your notes. Never copy the TODO line.
- **Release notes:** at most 500 characters; the same friendly, plain tone.
- **en-GB** is English: only an agent that was asked for it edits it.

### Stop and report instead of guessing

- A concept appears in your keys and the glossary has no entry in your column.
- The English is ambiguous and `en.context.json` does not settle it.
- A string only makes sense with a screen you cannot see.
- A glossary term looks wrong to you: use it anyway, and say so in your notes. It is a finding, not something to fix silently.
- A limit cannot be met without losing the meaning.

### Never

- Edit the glossary, `en.json`, `en.context.json`, `en.last-translated.json`, another locale's files, or app code.
- Run builds or device tests. The two jest folders above are all you run.
- Commit, stage or unstage anything.

### Output

Save `docs/product/i18n/notes/<locale>.md` (as a file: the reviewer reads every translator's notes, and a chat reply never reaches it), then reply with the file paths and a two-line summary.

- Files written, key count, result of the two jest runs.
- Uncertain terms as a table: key, English, your choice, the alternative, why. These become glossary rows.
- `tight` keys that came out longer than English.
- Anything in the English that looks wrong (typo, odd sentence, missing context).
- Feedback on the brief: what was unclear, what slowed you down.

## 4. Running a translation round (orchestrator)

1. The glossary has no empty cell and no undecided rule for the languages involved (plausibility check: related languages use consistent terms, a register is decided for each).
2. Start one translator per language in parallel (they write disjoint files). Give each: its locale, this skill, the plan path, and the scope (whole file or key list).
3. Start one reviewer per group, fresh agents.
4. Merge glossary proposals; run `yarn typecheck && yarn lint && yarn jest`.
5. Register new locale files in `src/i18n/index.ts` if they are new, and copy `en.json` over `en.last-translated.json`.
6. Device check in a few languages per the testing skill (`.agents/skills/soli-testing/SKILL.md`, language recipes): a long language (de, ru, fr) on a small screen for truncation, Arabic for right-to-left, Japanese for line breaks.

## 5. Adding or changing an English string

1. Add or change the key in `en.json`, and its line in `en.context.json` (where it shows, `tight` or not, what each `{{placeholder}}` is). A new concept gets a glossary row first.
2. `yarn jest test/unit/i18n` now fails and names the keys: missing in the other locales, or changed since `en.last-translated.json`. That is the worklist.
3. Run translators for exactly those keys in ALL languages (section 4). All locales are always translated together; there is no per-language backlog.
4. Copy `en.json` over `en.last-translated.json`, run jest again.
5. A removed key is removed from every locale file in the same change (mechanical, no translator needed).

Small wording fixes in English that do not change the meaning still go through steps 2–4: the translators decide whether their text is affected.

## 6. Adding a new language

Order matters: terms are decided before anything is translated.

1. **Research** (researcher role): the name of the game, every term, register, punctuation, plural forms, ASO keywords. Add the language's section and its column to the glossary (the term table of its group), with sources.
2. **Wire it in** (implementer): add the code to `SUPPORTED_LANGUAGES` and, if needed, a resolver rule in `src/i18n/resolveLanguage.ts` (script or region variants, legacy codes) plus a row in its test table; add it to `supportedLocales` for iOS and Android in the `expo-localization` plugin block of `app.json`. That is a native config change: **prebuild both platforms**. Right-to-left languages need nothing extra: the app chrome mirrors and the game screen is pinned left-to-right.
3. **Translate** (section 3): `src/i18n/locales/<locale>.json`, registered in `src/i18n/index.ts`.
4. **Review** (reviewer role, fresh agent).
5. **Store**: add the folder names to the table in `store/README.md` and to `LISTING_LOCALES` in `test/unit/store/storeListings.test.ts` (check the exact store locale codes in both stores' lists), then translate the store files and the release notes. If a new price word matters, add it to `PRICE_WORDS` in that test.
6. **Gates and device**: `yarn typecheck && yarn lint && yarn jest`, then a device check in the new language (testing skill): every screen, plurals with 1 / 2 / 5, truncation on a small phone.
7. Uploading the listing needs Karim's go-ahead (release skill).

## 7. German is Swiss High German, for everyone

There is one German (`de`), written in Swiss High German: **always `ss`, never `ß`**, for Swiss, German and Austrian players alike, in the app and in the one German store listing (`de-DE`). This is a decision by Karim, not an oversight: Soli is made in Switzerland, Swiss-origin apps (Threema, Infomaniak kDrive, SBB, Migros, Swiss Post) ship one German in Swiss spelling, and neither store has a Swiss German listing locale. Evidence links are in the glossary's German section.

- Translators and reviewers never "correct" ss to ß. jest fails on a `ß` in `de.json` and in the German store files.
- Use words every German speaker understands; where a neutral synonym avoids an ss/ß word without sounding stiff, prefer it (glossary list).
- The German store description says "Made in Switzerland" in a natural line, so the spelling reads as origin.

## 8. Self-improvement

Same rule as the testing and release skills: if anything here was wrong, stale or caused friction, update this skill in place (no changelog prose). History and rationale live in `docs/product/i18n/i18n.md`.
