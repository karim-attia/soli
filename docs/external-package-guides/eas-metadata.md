# EAS Metadata (eas-cli) — usage guide

Date-stamped: 2026-11-28. Read from the installed eas-cli **27.11.0** (`build/metadata/**`, `schema/metadata-0.json`, `--help`) and the docs, then **run against Soli on 2026-11-28** (`metadata:pull`, `metadata:lint`, two `metadata:push` that created App Store version 1.2.1 with 18 localizations; plan: `docs/product/store-launch/store-launch.md`). Section "Observed on Soli" below is what actually happened.

Sources:

- https://docs.expo.dev/eas/metadata/ (intro; says beta, "subject to breaking changes"; Google Play not supported)
- https://docs.expo.dev/eas/metadata/getting-started/ · https://docs.expo.dev/eas/metadata/config/ · https://docs.expo.dev/eas/metadata/schema/
- eas.json `metadataPath`: https://docs.expo.dev/eas/json/#eas-submit

The docs intro still lists screenshots as unsupported and does not mention API-key auth; the installed CLI does both (below). When docs and source disagree, the source of the version we run wins.

## What it is

`eas metadata:push` writes App Store listing data from a local config file to App Store Connect; `metadata:pull` generates that file from Apple; `metadata:lint` validates it locally. Apple only.

```
npx eas-cli metadata:lint [--profile <submit profile>] [--json]
npx eas-cli metadata:pull [-e <submit profile>] [--non-interactive]
npx eas-cli metadata:push [-e <submit profile>] [--non-interactive]
```

The submit profile defaults to `production`.

## Auth

`build/metadata/auth.js`: it first takes `ascApiKeyPath` + `ascApiKeyId` (+ `ascApiKeyIssuerId`, `appleTeamId`) from the **submit profile in eas.json**, then a key stored on EAS, then falls back to an Apple ID login. Soli's profile already has the key fields, so run it like the other commands:

```bash
scripts/with-asc-key.sh npx eas-cli metadata:push --non-interactive
```

(`ascApiKeyPath` is `$SOLI_ASC_API_KEY_PATH` in eas.json; the wrapper sets it. Confirmed 2026-11-28: the `$VAR` is expanded for the metadata commands too.)

## Config file

Default `store.config.json` in the project root; another name via `"metadataPath"` in the submit profile (`submit.production.ios`). `.js` works too: the file is `require`d and may export an object or an (async) function returning it — this is how Soli generates the config from `store/ios/<locale>/*.txt` instead of keeping a second copy of the text.

```js
// store.config.js (shape; schema: eas-cli/schema/metadata-0.json)
module.exports = {
  configVersion: 0,
  apple: {
    version: '1.2.1',            // version to edit, created if it does not exist
    copyright: '2026 Karim Attia',
    release: { automaticRelease: true, phasedRelease: true },   // automaticRelease: false | true | ISO date
    info: {
      'en-US': {
        title: '…',              // ≤ 30, required
        subtitle: '…',           // ≤ 30
        description: '…',        // ≤ 4000
        keywords: ['card', 'patience'],   // ARRAY (store/ios keywords.txt is one comma-separated line → split)
        releaseNotes: '…',       // "What's New", ≤ 4000
        promoText: '…',          // ≤ 170
        supportUrl: 'https://…',
        privacyPolicyUrl: 'https://…',    // required per locale
        // screenshots: { APP_IPHONE_67: ['path.png', …] }, previews: { … }
      },
      // 'de-DE', 'fr-FR', 'fr-CA', 'es-ES', 'es-MX', 'pt-BR', 'it', 'nl-NL', 'ja', 'ru', 'pl', 'tr', 'zh-Hans', 'ko', 'ar-SA', 'he', 'en-GB', …
    },
    // advisory: { … }   age rating answers
    // categories: ['GAMES', …]
    // review: { firstName, lastName, email, phone, demoRequired, notes }
  },
}
```

Locale keys are App Store locale codes (same as the folder names under `store/ios/`).

## What push does and does not do

Tasks, in order (`build/metadata/apple/tasks/index.js`): app version → app info → age rating → app review detail → screenshots → previews → app clip.

- **Version:** finds the editable version with `apple.version`, or creates it. Sets copyright, release type, phased release, and the per-locale version texts (description, keywords, What's New, promotional text, URLs). Creates missing localizations.
- **App info:** name, subtitle, privacy URLs per locale; categories.
- **Sections that are absent from the config are skipped** (checked for `advisory`, `review`, `screenshots`): nothing at Apple is reset. Soli leaves these three out on purpose.
- **Screenshots** (when listed): per locale and display type; uploads new files, deletes ones no longer listed, reorders; "same" = same file name and size.
- **Does not:** select the build for the version, answer export compliance, submit for review, manage availability / pricing, App Privacy labels, Google Play. Those go through the App Store Connect API (`scripts/asc-api.js`) or the website.
- `advisory` in schema 0 has no keys for the newer questions (`datingAndRelationships`, `sharedLocation`, `socialMedia`, `socialMediaAgeRestricted`) → PATCH `ageRatingDeclarations` directly.
- A dashboard edit made after the last pull is overwritten by the next push for the fields in the config.
- With validation errors, `--non-interactive` aborts instead of asking "push anyway?".

## Pull

`metadata:pull` is read-only at Apple, but **writes JSON to the `metadataPath` file** (with `--non-interactive` it overwrites without asking) and downloads every screenshot to `store/apple/screenshot/<locale>/<type>/` inside the repo. With Soli's `"metadataPath": "store.config.js"` a pull would replace the generator with plain JSON. So: pull only in a scratch copy of the repo (or `git checkout store.config.js && rm -rf store/apple` right after). Soli's truth is `store/`.

## Soli's setup

- `store.config.js` (repo root) generates the config from `store/ios/<folder>/*.txt` + `store/release-notes/*.txt` via `scripts/lib/store-listings.js` (locale table shared with the Play script): 18 App Store locales = 16 folders + `fr-CA` (← `fr-FR`) + `es-MX` (← `es-ES`); version = `app.json` `expo.version`; `release: { automaticRelease: true, phasedRelease: true }`. No `advisory` / `categories` / `review` / `screenshots` (reasons in the file's comment).
- Commands (no yarn script yet): `scripts/with-asc-key.sh npx eas-cli metadata:lint` · `scripts/with-asc-key.sh npx eas-cli metadata:push --non-interactive`.

## Observed on Soli (2026-11-28)

1. **First push created the 17 new version localizations EMPTY** (only `locale`; description, keywords, What's New, promotional text, support URL all null) although it logged "Created localized version for …"; en-US (existing, updated) was correct, and the app-info localizations (name, subtitle, privacy URL) were correct for all 18. **A second push** ("Updated localized version for …") filled them. → After any push that adds a locale, push again and verify with `GET /v1/appStoreVersions/<id>/appStoreVersionLocalizations` (compare against `store/`).
2. The new version got `releaseType: AFTER_APPROVAL` (from `automaticRelease: true`), copyright, and an `appStoreVersionPhasedRelease` in state `INACTIVE` (normal before release; it starts on release).
3. Screenshots: the new version inherited the live en-US sets (`APP_IPHONE_67` 10, `APP_IPHONE_65` 10, `APP_IPAD_PRO_3GEN_129` 5); locales without their own sets fall back to them. Nothing was uploaded.
4. A second editable app info (`appInfos` in `PREPARE_FOR_SUBMISSION`, next to the live `READY_FOR_SALE` one) holds the new name / subtitle; they go live with the version.

## Not confirmed (2026-11-28)

1. Whether `metadata:push` can run while a version is `WAITING_FOR_REVIEW` (Apple locks most fields then; promotional text stays editable).
2. Why the first push created empty localizations (apple-utils `createLocalizationAsync` vs Apple dropping attributes on create) — not investigated; the second push is the workaround.
