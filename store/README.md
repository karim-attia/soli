# Store listings

Everything the App Store and Google Play show about Soli, as plain text in git: one file per field, one folder per language. Plan and decisions: `docs/product/i18n/i18n.md` (approach E1). Translating these files: `.agents/skills/soli-translation/SKILL.md`. Terms: `docs/product/i18n/glossary.md`.

**Uploads are tools, not automatic, and each one needs Karim's go-ahead** (store-launch plan, 2026-11-28). Both read this folder through `scripts/lib/store-listings.js`, which holds the locale table below:

- App Store: `scripts/with-asc-key.sh npx eas-cli metadata:push --non-interactive` (config generator `store.config.js`; guide `docs/external-package-guides/eas-metadata.md`). Name and subtitle go live only with the next approved app version; push twice when a locale is new (the first push creates it empty).
- Google Play: `yarn submit:android --listings-only` (or `--listings` together with a release; guide `docs/external-package-guides/google-play-developer-api.md`). Goes live after Google's review.

Uploaded: both stores, all locales, 2026-11-28 (App Store version 1.2.1 in preparation; Play listings committed, in Google review).

## Layout

```
store/
  ios/<App Store locale>/      name.txt  subtitle.txt  keywords.txt  promotional_text.txt  description.txt
  android/<Play locale>/       title.txt  short_description.txt  full_description.txt
  release-notes/<locale>.txt   "What's new" text, used for both stores (en-US.txt = source; others by app locale: de.txt, pt-BR.txt, zh-Hans.txt)
  screenshots/{ios,ipad,android}/en-US/   the live screenshot sets
  PROPOSALS.md                 the proposed English text (applied to en-US / en-GB on 2026-11-23, not uploaded)
```

The shape matches fastlane `deliver` / `supply` (`--metadata_path store/ios` / `store/android`), so upload tooling can read it later without a move.

File rules (enforced by `test/unit/store/storeListings.test.ts`, run `yarn jest test/unit/store`): UTF-8, LF, exactly one newline at the end, no trailing spaces, no empty file, no extra files in a locale folder.

## Fields and limits

| Store | File | Limit (characters) | Notes |
|---|---|---|---|
| App Store | `name.txt` | 30 | Indexed for search. No price words ("free", "gratis", …): guideline 2.3.7 |
| App Store | `subtitle.txt` | 30 | Indexed. No price words. "No ads" is allowed (verifiable feature) |
| App Store | `keywords.txt` | 100 | Comma-separated, no space after a comma, one line. Do not repeat words from name or subtitle (already indexed). Not visible to users |
| App Store | `promotional_text.txt` | 170 | Can change any time without a submission |
| App Store | `description.txt` | 4000 | Plain text, no markdown. "free" is fine here |
| Google Play | `title.txt` | 30 | No "Free", no "No ads" (Play listing policy) |
| Google Play | `short_description.txt` | 80 | No "free"/"discount"; "no ads" is a grey zone, keep it in the full description |
| Google Play | `full_description.txt` | 4000 | Plain text |
| both | `release-notes/<locale>.txt` | 500 | Play's limit; Apple allows 4000 but we use one text |

Policy sources and the reasoning: `docs/product/app-store-creative-assets/app-store-creative-assets.md` ("Free" and "No ads").

`TODO Karim: …` as a file's content marks an English field that has no text yet. Only the English folders may carry it; none does since 2026-11-23.

## Languages and where each folder is uploaded

One folder per language. Some store locales reuse a folder's text (plan, open question 6): that is an upload step, not a second copy in the repo. The folder names are mirrored in `LISTING_LOCALES` in the test.

| App language | `ios/` folder | Upload to (App Store Connect) | `android/` folder | Upload to (Play Console) | Release notes |
|---|---|---|---|---|---|
| en (source) | `en-US` | en-US (primary; fallback for every locale without its own text) | `en-US` | en-US (default) | `en-US.txt` |
| — (store only) | `en-GB` | en-GB | `en-GB` | en-GB | uses `en-US.txt` |
| de | `de-DE` | de-DE | `de-DE` | de-DE | `de.txt` |
| fr | `fr-FR` | fr-FR, fr-CA | `fr-FR` | fr-FR, fr-CA | `fr.txt` |
| es | `es-ES` | es-ES, es-MX | `es-ES` | es-ES, es-419 | `es.txt` |
| pt-BR | `pt-BR` | pt-BR | `pt-BR` | pt-BR | `pt-BR.txt` |
| it | `it` | it | `it-IT` | it-IT | `it.txt` |
| nl | `nl-NL` | nl-NL | `nl-NL` | nl-NL | `nl.txt` |
| ja | `ja` | ja | `ja-JP` | ja-JP | `ja.txt` |
| ru | `ru` | ru | `ru-RU` | ru-RU | `ru.txt` |
| pl | `pl` | pl | `pl-PL` | pl-PL | `pl.txt` |
| tr | `tr` | tr | `tr-TR` | tr-TR | `tr.txt` |
| zh-Hans | `zh-Hans` | zh-Hans | `zh-CN` | zh-CN | `zh-Hans.txt` |
| ko | `ko` | ko | `ko-KR` | ko-KR | `ko.txt` |
| ar | `ar-SA` | ar-SA | `ar` | ar | `ar.txt` |
| he | `he` | he | `iw-IL` | iw-IL | `he.txt` |

- **German is Swiss High German** (ss, never ß) for every German speaker. `de-DE` is the only German listing locale in both stores (no de-CH: [App Store localizations](https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations), [Google Play languages](https://support.google.com/googleplay/android-developer/table/4419860)), so the Swiss text goes there, and its description says "Made in Switzerland" so ss reads as origin, not as a typo. Never "correct" it to ß; a jest check fails on ß.
- **en-GB** exists for the word "Patience" (what Solitaire is called in the UK). It differs from en-US in subtitle, short description and keywords only (the name / title is "Soli: Klondike Solitaire" in both). The app itself has no en-GB locale.
- Store locale codes were taken from the two lists linked above on 2026-11-23; both stores accepted all of them on 2026-11-28.
- **China mainland:** Soli is not available in China mainland on the App Store since 2026-11-28 (Apple requires a game licence number there, which a hobby app cannot get; Karim accepted it). The `zh-Hans` / `zh-CN` listings still serve Simplified-Chinese readers elsewhere (Singapore, Malaysia, overseas).

## English text: where it comes from

**Since 2026-11-23 the English folders hold the proposed text from `PROPOSALS.md` (sections 1, 2 and 4), not the live text.** It is the base for the translations. Nothing was uploaded: an upload needs Karim's go-ahead, and the iOS name and subtitle only change with a version submission.

| File | Source |
|---|---|
| `ios/en-US/*`, `android/en-US/*` | `PROPOSALS.md`: name / title "Soli: Klondike Solitaire", subtitle, keywords, short description, description, promotional text |
| `ios/en-GB/*`, `android/en-GB/*` | en-US with "Patience" in the subtitle and the short description; keywords without "patience" and "klondike" (both are in its name / subtitle) |
| `release-notes/en-US.txt` | the "Google Play:" block of the newest entry in `docs/RELEASE-NOTES.md` (1.2.1) |

The live text (version 1.0, fetched 2026-11-23 from the [App Store](https://apps.apple.com/app/id6755950876) via the iTunes lookup API and from [Google Play](https://play.google.com/store/apps/details?id=ch.karimattia.soli&hl=en)) is in the "Live" column of `PROPOSALS.md` and in git history: iOS name "Soli - Solitaire", subtitle "Thoughtfully refined Solitaire"; Play title "Soli", short description "Classic Solitaire, thoughtfully refined". The live iOS keywords and promotional text were never readable from outside.

`docs/RELEASE-NOTES.md` stays the place where release notes are written (the Android upload script reads it); `release-notes/en-US.txt` is the copy translators work from.

## Screenshots

The live English sets, saved 2026-11-23. No captions or marketing text on them; both stores show the primary language's screenshots for every language, so there are no localized sets yet (plan, Follow-ups). `store/` is in `.easignore`, so they never travel to EAS.

| Folder | Files | Size | How matched |
|---|---|---|---|
| `screenshots/ios/en-US/` | 10 | 1320x2868 (6.9") | File names in the live image URLs are identical to `.test-artifacts/store-screenshots/actually using 6.9 ios/` |
| `screenshots/ipad/en-US/` | 5 | 2048x2732 | File names in the live image URLs, copied from `.test-artifacts/store-screenshots/ipad/` |
| `screenshots/android/en-US/` | 8 phone + 2 tablet | 1080x2412, 1080x1728 | Phone: each live image compared pixel-wise with the capture pool (clear matches). Tablet: no original in the repo; `tablet-*-from-play.png` are downloads of the live images (Play re-encodes, so not the original files) |

Live order on Google Play: 01-fresh-deal, 02b-midgame-late, 03b-nearwin-covered, 08-celebration-meteorshower-a, 08-celebration-youwin-b, 04-win-dialog, 09-settings, 10-history, tablet-1, tablet-2. The App Store order is set in App Store Connect and is not reliably readable from outside.

How the sets were captured: `docs/product/store-screenshots/store-screenshots.md`.
