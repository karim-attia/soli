# Store launch: Soli 1.2.x in production on the App Store and Google Play, with 15 listings and working share links

## User prompt

"Hey, what do we need to do to make everything happen end-to-end? Please also send a message to the game restart chat and orchestrate this end to end so just relate to Soli so that this is in the app store with sharing working and everything great. Thanks."

## Summary

(Plan written 2026-11-28. Nothing built, uploaded or changed at Apple / Google yet.)

## Description

**What:** take Soli from "1.2.0 in TestFlight / Play open testing" to **public production on both stores**, with

- the 15-language app (already in 1.2.0),
- the 15-language store listings from `store/` (16 folders incl. en-GB) and the existing English screenshots,
- deal sharing: `https://karimattia.ch/soli/deal/<id>?draw=<n>` opens the app (iOS universal link, Android App Link) and falls back to the website (with store badges) when Soli is not installed.

**Why:** public users are still on 1.0 (App Store version string "1", build 14, released 2026-08-03; Play production 1.0.0). They have no hints (1.1), no languages / scoring (1.2), and share links cannot open the app for anyone who installs from a store: no store build carries the iOS entitlement yet, and the site's `assetlinks.json` lacked the Play App Signing fingerprint.

**Leading words:** *production*, *listings*, *links verified*, *one build per platform*, *API first, browser only where no API exists*.

### Facts collected read-only on 2026-11-28

| # | Fact | Source |
|---|---|---|
| F1 | App Store live version: versionString **"1"**, build 14, `READY_FOR_SALE`, `releaseType AFTER_APPROVAL`. No editable version exists. Older records: 1.0, 0.5.0 … 0.8 | `GET /v1/apps/6755950876/appStoreVersions` |
| F2 | App Store listing is **en-US only**: name "Soli - Solitaire", subtitle "Thoughtfully refined Solitaire", keywords "Solitaire, Klondike, Soli, Free, Open Source, Solvable Games", no promotional text, support + privacy URL `https://karimattia.ch/projects/soli`, copyright "2026 Karim Attia", category GAMES | `appInfos`, `appStoreVersions/acebdfd9-…` |
| F3 | Live iOS screenshot sets (en-US): `APP_IPHONE_67` (10), `APP_IPHONE_65` (8), `APP_IPAD_PRO_3GEN_129` (5) | `appScreenshotSets` |
| F4 | Build 1.2.0 (17) `VALID`, internal + **external `IN_BETA_TESTING`** (beta review passed). Build id `d3ac4121-bb62-4f86-b64a-4515942fa842` | `GET /v1/builds` |
| F5 | Availability: **175 of 175 territories, incl. China mainland (CHN)**, `availableInNewTerritories: true`; the app is listed in the cn storefront | `GET /v2/appAvailabilities/6755950876/territoryAvailabilities`, iTunes lookup `country=cn` |
| F6 | Age rating 4+. Declaration: all NONE / false; **null (unanswered): `datingAndRelationships`, `sharedLocation`, `socialMedia`, `socialMediaAgeRestricted`** (`kidsAgeBand` null is correct) — these are the "new Age Rating questions" of the banner | `GET /v1/appInfos/e0cbbc8d-…/ageRatingDeclaration` |
| F7 | App Store review detail of the live version has **no contact** (name / phone / email null); the TestFlight beta review detail has Karim's contact | `appStoreReviewDetail`, `betaAppReviewDetail` |
| F8 | Every ASC API call returned 200 → the **Apple Developer Program License Agreement is not blocking the API** today (a missing one answers 403 `FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED`) | all calls above |
| F9 | Play production: **1.0.0**; title "Soli" | public Play page |
| F10 | AASA on karimattia.ch and on Apple's CDN: `A73YSR4W75.ch.karimattia.soli`, `/soli/deal/*` | `curl` both |
| F11 | `assetlinks.json` (at plan time) holds only the upload-key SHA-256 `C0:85:…:36:46`. Play App Signing SHA-256 = `EE:6C:E3:DA:62:5A:1F:D3:55:98:10:30:9E:03:5A:87:F7:F9:2A:3C:CF:D9:B2:B3:B3:25:46:17:0E:2A:10:07` (orchestrator, `generatedApks`); the share-mechanics session is adding it | `curl`, orchestrator |
| F12 | eas-cli 27.11.0 `metadata:push` authenticates with the **ASC API key from the submit profile** (`ascApiKeyPath` / `ascApiKeyId` in eas.json — what Soli already has), creates the version named in the config, pushes info / version localizations / age rating / review detail / release type / phased release / **screenshots** (newer than the docs page, which still says no screenshots). Sections left out of the config are skipped. It does **not** select a build and does **not** submit for review | local source `eas-cli/build/metadata/**`, `schema/metadata-0.json`, https://docs.expo.dev/eas/metadata/ |
| F13 | The Play service account works for reads (`generatedApks`). Its documented permission is "Release apps to testing tracks" only — **production release and store-listing permissions are unverified** | orchestrator, `docs/external-package-guides/google-play-developer-api.md` |
| F14 | Browser: Play Console is signed in in Chrome (claude-in-chrome). **App Store Connect is signed out** | orchestrator |
| F15 | EAS free plan: 2 of 15 iOS builds used this month | orchestrator |

### Input from the share-mechanics session

Reply received 2026-11-28 (session "Game restart and share mechanics", owns the website and the share mechanics):

- All app-side share code is on `main` since `8f34adc5`, so **1.2.0 already has it**: `app/+native-intent.tsx` (rewrites `/soli/deal/<id>`, https or `soli://soli/deal/…`, to `/` + `pendingDealRequestStore`), `src/solitaire/dealShareLink.ts`, History sheet **Share** (testID `history-share`) + **Retry** (`history-retry`), "Play shared deal?" confirm unless the game is won / has 0 moves. Link: `https://karimattia.ch/soli/deal/<E1_ exact id>?draw=<n>`. The Android intent filter with `autoVerify` is in app.json. Plan: `docs/product/retry-and-share-deal/retry-and-share-deal.md`.
- karimattia.ch: deployed (`03da99b`, Vercel). AASA live and on Apple's CDN. Fallback page: explanation, "Open in Soli" (`soli://`) button, App Store + Play badges, noindex.
- `assetlinks.json` had ONLY the upload-key SHA-256; the Play App Signing SHA-256 was missing → Play-installed builds would not verify App Links. Site-only fix (`public/.well-known/assetlinks.json` in `/Users/karim/kDrive/Code/karimattia.ch`, push → Vercel). **Must be live before the Play production rollout** (Android verifies on install / update). Update 2026-11-28: the fingerprint is known (F11) and the share-mechanics session is adding it.
- The next store build needs nothing more than the restored iOS entitlement (`93c76c5b`). Known cosmetic nit: a link arriving while the History preview sheet is open switches to the game, but the sheet stays on top — recommended to fix before release (small); the share-mechanics session may fix it on `main`.
- Never tested: a real https universal link on iOS; anything on Android. The release smoke test must: iOS — tap the https link from Notes / Messages on a TestFlight build; Android — `adb shell pm get-app-links ch.karimattia.soli` shows `karimattia.ch` verified.
- Not in scope: deferred deep linking (proposed, not approved).

## Acceptance Criteria

| When | Then |
|---|---|
| Someone opens the App Store page of Soli in any country | Version 1.2.1, name "Soli: Klondike Solitaire"; in the 15 languages the listing text is localized (fr-CA and es-MX reuse fr / es; en-GB says "Patience") |
| Someone opens the Play page | Production version 1.2.1, title "Soli: Klondike Solitaire", localized text in the same languages |
| A user with Soli from the App Store taps a `https://karimattia.ch/soli/deal/…` link in Messages / Notes / WhatsApp | Soli opens and offers that deal ("Play shared deal?" unless the board is won or untouched) |
| A user with Soli from Google Play taps the same link | Soli opens directly (no browser, no chooser); `pm get-app-links` shows `verified` |
| Someone without Soli taps the link | The website fallback page opens with App Store and Play badges |
| The History sheet's Share button is used on a production install | It produces the https link above |
| After release | No crash spike on either store; store pages checked in at least en, de, ja, ar |

## Possible approaches

### A. Version: what ships

| Option | Pros | Cons |
|---|---|---|
| **A1. 1.2.1 (18 / 18) on both stores (recommended)** | Same version and numbers on both stores (release-skill rule); iOS needs a new build anyway (entitlement); carries the History-sheet nit fix; a patch number matches the content (no user-facing feature added since 1.2.0 except that links now open the app) | One local Android build (~16–20 min) + one EAS build (3 of 15) |
| A2. iOS 1.2.1 (18), Android: promote the existing 1.2.0 (17) from open testing to production | No Android build; 17 is already reviewed | Versions diverge between stores; no nit fix on Android; the number rule ("both move together") is broken once more |
| A3. 1.3.0 | "Sharing" reads like a feature release | Share has been in the app since 1.2.0; a minor bump for an entitlement is misleading |

### B. iOS listing + submission route

| Option | Pros | Cons |
|---|---|---|
| **B1. EAS Metadata for text + `scripts/asc-api.js` for the rest (recommended)** | No new dependency (eas-cli + key already in use); `store.config.js` (~40 lines) generates the config from `store/ios/*` so the repo stays the single truth; creates the version, 18 localizations, release type, phased release in one `metadata:push`; lint built in | EAS Metadata is beta; cannot attach the build or submit (ASC API does: 4 small calls); its age-rating schema lacks the four new questions (PATCH via ASC API) |
| B2. Own script against the ASC API for everything | Full control, no beta tool | ~150–200 lines to write and test (version, appInfoLocalizations, appStoreVersionLocalizations create-or-update per locale) for something eas-cli already does |
| B3. fastlane `deliver` | Folder shape already matches | Ruby toolchain; same reason it was rejected for Android |
| B4. Browser (claude-in-chrome) | No code | ASC is signed out; 18 locales × 5 fields by hand is the error-prone path the i18n plan wanted to avoid |

### C. Play listing + production route

| Option | Pros | Cons |
|---|---|---|
| **C1. Extend `scripts/submit-android.js` (recommended)**: `--listings` (PUT `edits.listings` per locale from `store/android/*`), `--track production`, release notes in all languages from `store/release-notes/*`, `--rollout <fraction>` | Same script, same auth, one edit = one atomic commit; ~60 more lines | Needs two more service-account permissions (F13) |
| C2. Play Console in Chrome | Works today (signed in), no permission change | 18 locales × 3 fields + 18 release notes by hand |
| C3. fastlane `supply` | Reads `store/android` as is | Ruby toolchain |

### D. Screenshots

| Option | Pros | Cons |
|---|---|---|
| **D1. Keep the live English sets, upload nothing (recommended)** | Zero work, zero risk: a new App Store version inherits the previous version's screenshots, and both stores show the primary language's screenshots for locales without their own; the shots have no text overlays, only in-app English UI | Non-English visitors see English UI in the shots |
| D2. Re-upload `store/screenshots/*/en-US` | Repo = store | No visible change; risk of reordering / replacing reviewed assets |
| D3. Localized sets | Better conversion | 15 × capture work; follow-up (i18n plan: top 4 markets first) |

### E. Rollout

| Option | Pros | Cons |
|---|---|---|
| **E1. iOS: automatic release after approval + 7-day phased release; Play: production at 20 % staged, then 100 % after 2–3 days (recommended)** | First production build with a new native surface (15 languages, RTL, solver since 1.1) for users coming from 1.0; phased / staged limits a bad surprise; new installs always get the new version on iOS, so listings and links work for new users at once | Full reach takes up to a week (iOS phased can be completed early with one API call; Play fraction raised with one API call) |
| E2. Everything at 100 % at once | Fastest | No brake |
| E3. Manual release on iOS | Karim picks the moment | One more step that waits on a person |

## Open questions to the user

All have a recommendation; the orchestrator proceeds with it and flags it in the final summary (AGENTS.md).

| # | Question | Options | Recommendation |
|---|---|---|---|
| Q1 | Version | A1 / A2 / A3 above | **A1: 1.2.1 (18 / 18)** |
| Q2 | "What's New" text. Public users jump from 1.0 to 1.2.1, so the 1.2.0 text alone undersells it. The release skill wants Karim's OK on the text before translation | (a) Reuse the approved 1.2.0 text (already translated, zero wait) · (b) New text from already approved lines: hints (1.1) + 15 languages + scoring (1.2) + "shared deal links open in Soli", then 14 translations · (c) wait for Karim | **(b)**, drafted by the orchestrator, shown to Karim in chat; if he does not answer within the build time, go on with it (his message covers the end-to-end release) and flag it. Draft below in "UX/UI Considerations" |
| Q3 | China mainland (F5). Banner: AIGC declaration + security assessment by 2027-01-31; games in mainland China formally need a licence number (版号), which a hobby app cannot get | (a) Remove CHN from availability now (one PATCH; reversible; zh-Hans listing still serves SG / MY / overseas readers) · (b) Keep and answer the questionnaire · (c) Decide later, before 2027-01-31 | **(c) → (a)**: not on the critical path of this release, and it takes Soli away from existing Chinese users, so it is Karim's explicit call. Recommended answer: remove CHN (matches the i18n plan follow-up). Do not bundle it silently into the submission |
| Q4 | Rollout | E1 / E2 / E3 | **E1** |
| Q5 | Screenshots | D1 / D2 / D3 | **D1**, D3 as follow-up |
| Q6 | Review contact (F7): the phone number and e-mail must not land in this public repo | (a) Copy them at run time from `betaAppReviewDetail` to the version's `appStoreReviewDetail` with `asc-api.js` · (b) put them in `store.config.js` | **(a)** |
| Q7 | Play service-account permissions (F13) | (a) Karim (or the browser agent with his OK — it changes account permissions) adds "Release to production, exclude devices, and use Play App Signing" + "Manage store presence" for the Soli app · (b) do listings + promotion in Play Console via Chrome | **(a)** if the dry check in step 3.1 shows 403; (b) is the fallback and needs no permission change |
| Q8 | History-sheet nit (link arrives while the preview sheet is open) | Fix before the build / ship without | **Fix** if the share-mechanics session lands it before step 2.1; do not wait more than a few hours for it |
| Q9 | Remove 1.2.0 from external TestFlight / keep open testing on Play | — | Leave both as they are; 1.2.1 goes to the same tracks first (it must pass through TestFlight for the link test anyway) |

## Dependencies

No new npm dependency.

- EAS Metadata (part of eas-cli, already used): `docs/external-package-guides/eas-metadata.md` (new, 2026-11-28)
- EAS Submit / build: `docs/external-package-guides/eas-submit.md`
- Play Developer API: `docs/external-package-guides/google-play-developer-api.md` (section "Listings, production track, staged rollout" added 2026-11-28 — from the docs, not yet run)
- App Store Connect API (direct, `scripts/asc-api.js`): endpoints listed in step 4; no guide file yet → the implementer adds `docs/external-package-guides/app-store-connect-api.md` with the calls that actually ran
- Skills: `.agents/skills/soli-release/SKILL.md`, `.agents/skills/soli-testing/SKILL.md`, `.agents/skills/soli-translation/SKILL.md`

## UX/UI Considerations

- Name / title becomes "Soli: Klondike Solitaire" on both stores (decided in `store/PROPOSALS.md`); the home-screen name stays "Soli".
- Draft "What's New" for Q2 (b), ≤ 500 characters, non-technical, only lines Karim approved before plus one share line:

  ```
  Soli 1.2 speaks your language!

  - Now in 15 languages, including German, French, Spanish and Japanese
  - New Hint button (turn it on in the settings)
  - New scoring options: Standard or Vegas
  - Shared deal links now open right in Soli

  Happy playing!
  ```

- App Store review notes (English, for the reviewer): "No account or sign-in. Universal links: https://karimattia.ch/soli/deal/… opens a shared deal in the app."

## Components

Not applicable (no UI work in this plan; the History-sheet nit is owned by the share-mechanics session).

## How to fetch data, how to cache

Not applicable.

## Related tasks

- `docs/product/i18n/i18n.md` — Follow-ups "Store upload from `store/`", "China mainland", "Localized screenshots"
- `docs/product/retry-and-share-deal/retry-and-share-deal.md` — share links, "Required inputs from Karim"
- `docs/product/release-automation/release-automation.md` — release log and learnings
- `docs/product/store-screenshots/store-screenshots.md`, `docs/product/app-store-creative-assets/app-store-creative-assets.md`

## Simplification ideas

- No screenshot upload at all (D1): the stores already do the fallback.
- `store.config.js` is a generator, not a second copy of the text: it reads `store/ios/<locale>/*.txt` and `store/release-notes/*.txt`.
- Leave `advisory`, `categories`, `review` and `screenshots` out of `store.config.js`: omitted sections are skipped by `metadata:push`, so nothing that is already right at Apple gets rewritten.
- One Play edit for bundle + listings + production release → one commit, one review.
- After this release `docs/publishing/prod.md` (a pure redirect) can be deleted, and the release skill's "pasted by hand" paragraphs replaced by the two commands.

## Steps to implement

Owner legend: **O** orchestrator · **I** implementation sub-agent · **T** testing sub-agent (reads the soli-testing skill first) · **R** release sub-agent (reads the soli-release skill first) · **TR** translator / reviewer sub-agents (soli-translation skill) · **S** share-mechanics session · **K** Karim · **Timo** Account Holder.

**Go-ahead:** Karim's prompt is the go-ahead for the end-to-end release including public submission. Steps marked **PUBLIC** are visible to users or reviewers, or hard to undo; they are listed here on purpose, and each one is reported when done. Steps marked **K-CALL** are not covered by the prompt and wait for Karim.

Status: ☐ open · ◐ in progress · ☑ done · ✗ dropped.

### Phase 0 — Preconditions (parallel, no build)

| # | Step | Owner | Status |
|---|---|---|---|
| 0.1 | `assetlinks.json` on karimattia.ch contains BOTH fingerprints (upload key `C0:85:…:36:46` and Play App Signing `EE:6C:…:10:07`); verify `curl -s https://karimattia.ch/.well-known/assetlinks.json` and Google's checker `https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://karimattia.ch&relation=delegate_permission/common.handle_all_urls` | S, verify O | ☑ 2026-11-28: both fingerprints served by karimattia.ch and returned by Google's statements:list |
| 0.2 | History-sheet nit fixed on `main` (or decided to ship without, Q8) | S | ☑ d359fbef |
| 0.3 | Draft the "What's New" text (Q2), paste it to Karim in chat; add the `## 1.2.1 — <date>` entry with the `Google Play:` block to `docs/RELEASE-NOTES.md`; copy to `store/release-notes/en-US.txt` | O / I | ☑ 2026-11-28 (draft text of UX/UI Considerations) |
| 0.4 | Translate `store/release-notes/<locale>.txt` (14 languages, ≤ 500 chars), reviewer pass, `yarn jest test/unit/store` | TR | ☑ 2026-11-28; `yarn jest test/unit/store test/unit/scripts` passes |
| 0.5 | Bump `app.json` to 1.2.1, `ios.buildNumber` "18", `android.versionCode` 18; `package.json` version 1.2.1 | I | ☑ 2026-11-28 |
| 0.6 | Agreements check: any ASC API call answers 200 (403 `REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED` = Timo must accept the Program License Agreement). The **Paid Applications Schedule** banner concerns paid apps / in-app purchases; Soli is free without purchases (covered by the Free Apps agreement), so it is expected NOT to block. The real test is step 4.9: if the submission is refused with an agreement error, ask Timo then. Tell Timo about the banner now anyway (one message from Karim) so it is not found at the last step | O, K → Timo | ☐ |
| 0.7 | Play permission dry check (Q7): open an edit, `PUT …/tracks/production` and `PUT …/listings/en-US` with the current values, call `edits.validate`, then **delete the edit** (nothing is committed). 403 → Q7 (a) or (b) | I | ☐ |

### Phase 1 — Tooling (one implementation sub-agent, no build; can run while phase 0 waits)

| # | Step | Owner | Status |
|---|---|---|---|
| 1.1 | `store.config.js` in the repo root + `"metadataPath": "store.config.js"` in `eas.json` → `submit.production.ios`. It builds `{ configVersion: 0, apple: { version: <app.json expo.version>, copyright, release: { automaticRelease: true, phasedRelease: true }, info: { <locale>: { title, subtitle, description, keywords: keywords.txt split on ",", promoText, releaseNotes, supportUrl, privacyPolicyUrl } } } }` from `store/ios/*` and `store/release-notes/*`. Locale map from `store/README.md`: 16 folders + `fr-CA` ← `fr-FR`, `es-MX` ← `es-ES`; release notes by app language (en-GB uses en-US). No `advisory`, `categories`, `review`, `screenshots` keys (comment why). Inline comment: generator, never edit text here | I | ☐ |
| 1.2 | Add yarn scripts `metadata:lint` / `metadata:push` (`scripts/with-asc-key.sh npx eas-cli metadata:push --non-interactive`). Run `npx eas-cli metadata:lint` (local). First contact with Apple: `metadata:pull` into a scratch profile / file name to confirm the key works for Metadata and to see the exact shape Apple returns (read-only at Apple; it writes a local JSON and downloads screenshots — keep that output out of the repo) | I | ☐ |
| 1.3 | `scripts/submit-android.js`: `--track <beta\|production>` (release name "<version>" for production instead of "<major.minor> Beta"), `--rollout <0–1>` (`status: inProgress` + `userFraction`), release notes for every Play locale from `store/release-notes/*` (map in `store/README.md`; fall back to the en-US block), `--listings` (PUT `edits.listings/<lang>` for 18 Play locales from `store/android/*`), `--promote` (no upload: reuse the versionCode that is already on Play). `--dry-run` prints all of it. Unit tests next to the existing release-notes tests | I | ☐ |
| 1.4 | Extend `test/unit/store/storeListings.test.ts` only if needed (e.g. the two reuse locales resolve); `yarn typecheck && yarn lint && yarn jest --ci` | I | ☐ |
| 1.5 | Package guides: correct `eas-metadata.md` and the new Play section with what actually happened; create `app-store-connect-api.md` | I | ☐ |

### Phase 2 — Builds and smoke tests (sequential where they share the Mac or a device)

| # | Step | Owner | Status |
|---|---|---|---|
| 2.1 | Gates: `yarn typecheck && yarn lint && yarn jest --ci` | R | ☑ 2026-11-28 (R2): typecheck + lint + 50 suites / 601 tests green |
| 2.2 | Android smoke BEFORE any upload: `yarn release` on the phone (device lock!), fresh deal, Hint → `status=solved`; fire `adb shell am start -a android.intent.action.VIEW -d 'https://karimattia.ch/soli/deal/<id>?draw=3' ch.karimattia.soli` → "Play shared deal?" → correct deal; link while the History sheet is open (nit); Share button produces the https link. Note: this APK is signed with the upload key, so `pm get-app-links` can already show `verified` (upload-key fingerprint is in assetlinks) | T | ☐ |
| 2.3 | iOS simulator sanity of the same commit (`yarn ios`): launch, `soli://soli/deal/<id>?draw=3` opens the deal. (https universal links do NOT work in a simulator / debug build without the signed entitlement — do not try) | T | ☐ |
| 2.4 | `yarn build:ios --no-wait --what-to-test "<text>"` (EAS cloud, build 3 of 15; read the credentials summary: profile includes Associated Domains, expiry 2027-11-26). Auto-submits to TestFlight; internal group gets it. A failed build costs quota: read the log before any retry | R | ☐ |
| 2.5 | While EAS builds: `yarn build:android` (local AAB, detached, ~16–20 min, the only local build running), four `solver present` lines, copy to `.test-artifacts/release/Soli-1.2.1-18.aab`, `yarn submit:android --dry-run` | R | ☐ |
| 2.6 | TestFlight: wait for `processingState VALID` (10–60 min). External group: add build 18 + "What to Test" (API recipe in the release skill, section 9). 1.2.1 is a new version string → beta review again (usually < 1 day); internal testers do not wait for it | R | ☐ |
| 2.7 | **Play open testing first** (PUBLIC to testers): `yarn submit:android` (track `beta`, "1.2 Beta" naming as before) → Google review (hours – 1 day) → available. This is what makes the real App Links test possible: only a Play-delivered install is signed with the Play App Signing key | R | ☐ |
| 2.8 | **Real link test iOS** (Karim's iPhone, TestFlight build 18; an agent cannot drive a physical iPhone): Karim opens Notes or Messages, pastes a `https://karimattia.ch/soli/deal/…?draw=3` link (the orchestrator sends him one), **taps** it → Soli opens → "Play shared deal?" → correct deal. NOT by typing the URL into Safari's address bar (that never triggers a universal link); long-press must offer "Open in Soli". Then delete Soli, tap again → website fallback with badges. If the app does not open: Settings → Developer → Universal Links diagnostics, or reinstall (iOS fetches the AASA at install time) | K (O prepares the link + checklist) | ☐ |
| 2.9 | **Real link test Android** (phone, Play open-testing install of 18 — update via Play, not adb): `adb shell pm get-app-links ch.karimattia.soli` → `karimattia.ch: verified`; tap the link in a chat / notes app → Soli opens without a chooser → correct deal. `adb shell pm verify-app-links --re-verify ch.karimattia.soli` if it still says `none` shortly after install. Uninstall → the link opens the website fallback (reinstall afterwards; phone-test side effects are fine) | T (K if the Play update needs his hands) | ☐ |

### Phase 3 — Store listings (can start after phase 1; independent of the builds)

| # | Step | Owner | Status |
|---|---|---|---|
| 3.1 | iOS: `yarn metadata:push` → creates App Store version **1.2.1** (`PREPARE_FOR_SUBMISSION`), 18 localizations (name, subtitle, keywords, description, promotional text, What's New, URLs), automatic release + phased release. Nothing is public until the version passes review (name / subtitle / description go live with the version; promotional text only exists on the new version too). Verify with `GET /v1/appStoreVersions/<id>/appStoreVersionLocalizations` and `GET /v1/appInfos/<editable id>/appInfoLocalizations` (18 each) and that the en-US screenshot sets are still attached to the new version (F3) | R | ☐ |
| 3.2 | Play: `yarn submit:android --listings --dry-run`, then the listings go into the SAME edit as the production release (step 4.11) so there is one commit and one review. **PUBLIC** once Google approves. Graphics stay untouched (default-language images serve all locales) | R | ☐ |

### Phase 4 — Submission (only after 2.8 and 2.9 are green)

iOS, all through `A` = `scripts/with-asc-key.sh node scripts/asc-api.js` unless noted:

| # | Step | Owner | Status |
|---|---|---|---|
| 4.1 | Attach build 18: `A PATCH /v1/appStoreVersions/<v>/relationships/build '{"data":{"type":"builds","id":"<build id>"}}'` | R | ☐ |
| 4.2 | Export compliance: nothing to do (`ITSAppUsesNonExemptEncryption: false`; builds report `usesNonExemptEncryption: false`) | — | ☐ |
| 4.3 | Age rating: answer the new questions — `A PATCH /v1/ageRatingDeclarations/e0cbbc8d-4b2e-4fcf-811f-21279542e8e8` with the four null attributes set to their "no / none" value (look up the allowed values in Apple's `AgeRatingDeclaration` reference first; all other answers stay). Result must stay 4+. Soli has no chat, no social features, no location, no ads, no web access (the share sheet is the OS's) | R | ☐ |
| 4.4 | Review detail (Q6): create / update `appStoreReviewDetails` for the new version with contact copied from `GET /v1/apps/6755950876/betaAppReviewDetail`, `demoAccountRequired: false`, notes from "UX/UI Considerations". Never write the contact into the repo | R | ☐ |
| 4.5 | App Privacy ("nutrition labels"): **no public API**. Already published for the live app and unchanged by this release (no new data collection: no analytics / ads SDK in `package.json`; share links are plain URLs). Nothing to do unless ASC refuses the submission — then Karim signs in to App Store Connect in Chrome once | — (K if refused) | ☐ |
| 4.6 | Copyright year / category / content rights: unchanged ("2026 Karim Attia", GAMES, no third-party content) | — | ☐ |
| 4.7 | Phased release: set by 3.1; verify `GET /v1/appStoreVersions/<v>/appStoreVersionPhasedRelease` (create with `POST /v1/appStoreVersionPhasedReleases` if missing) | R | ☐ |
| 4.8 | Availability: unchanged in this submission (China = Q3, **K-CALL**) | K | ☐ |
| 4.9 | **PUBLIC — submit for App Review:** `A POST /v1/reviewSubmissions` (platform IOS, app) → `A POST /v1/reviewSubmissionItems` (reviewSubmission + appStoreVersion) → `A PATCH /v1/reviewSubmissions/<id> '{"data":{"type":"reviewSubmissions","id":"<id>","attributes":{"submitted":true}}}'` → `WAITING_FOR_REVIEW`. Any 409 lists exactly what is missing (age rating, contact, agreement, privacy) — fix that item, do not retry blindly. Can be withdrawn (`canceled: true`) while waiting | R | ☐ |
| 4.10 | After approval the version releases itself (automatic) with a 7-day phased rollout to existing users; new installs get 1.2.1 at once | — | ☐ |

Play:

| # | Step | Owner | Status |
|---|---|---|---|
| 4.11 | **PUBLIC — production:** `yarn submit:android --promote --track production --rollout 0.2 --listings` (versionCode 18 already on Play from 2.7; release notes in all languages; listings in the same edit; commit → Google review → 20 % of production users) | R | ☐ |
| 4.12 | Play Console checks in Chrome (signed in; no API for these): Policy → App content shows no open declaration (data safety, content rating, target audience, ads = no, government / financial / health = no); Publishing overview shows the changes "In review". Change nothing unless something is flagged; a flagged form → report to Karim with a proposed answer | R (claude-in-chrome) | ☐ |
| 4.13 | After 2–3 days without a crash signal: raise to 100 % (`--rollout 1` / `status: completed`) | R, after O's check | ☐ |

### Phase 5 — Post-launch verification

| # | Step | Owner | Status |
|---|---|---|---|
| 5.1 | Store pages: iTunes lookup (`https://itunes.apple.com/lookup?id=6755950876&country=us` / `de` / `jp` / `sa`) shows 1.2.1 and the new name; Play page with `hl=en`, `de`, `ja`, `ar`, `iw` shows the localized title / description and 1.2.1 | O | ☐ |
| 5.2 | Links on production installs: App Store install on Karim's iPhone (replace TestFlight build) → tap link; Play production install → `pm get-app-links` verified + tap link; a device without Soli → fallback page → badge leads to the right store page | K + T | ☐ |
| 5.3 | Crash check after 48 h and after 7 days: Play Console → Android vitals (crash rate, ANR) in Chrome; iOS: App Store Connect → TestFlight / App Analytics crashes or Xcode Organizer (needs Karim's ASC session) — or the ASC Analytics / `diagnosticSignatures` API for build 18 | O | ☐ |
| 5.4 | iOS phased release runs out by itself (complete early: `PATCH appStoreVersionPhasedReleases/<id>` `phasedReleaseState: COMPLETE`) | O | ☐ |
| 5.5 | Karim: `git add -A && git commit -m "Release 1.2.1" && git tag v1.2.1` (agents never commit) | K | ☐ |
| 5.6 | Update the release skill (production flow, metadata commands, no more "pasted by hand"), `store/README.md` (uploaded on <date>), i18n plan follow-up (done), `release-automation.md` log, this plan's Summary | I | ☐ |
| 5.7 | Q3: China decision executed if Karim says so (`PATCH /v2/territoryAvailabilities/<CHN id>` `available: false`), before 2027-01-31 | K-CALL → R | ☐ |

### Sequencing and parallelism

```
Phase 0 (S: assetlinks + nit · O/TR: notes · I: bump, checks)   ─┐
Phase 1 (I: tooling)                                             ─┼─ in parallel, no builds
                                                                  │
2.1 gates → 2.2 Android smoke (phone, local build)  → 2.3 iOS sim (local build)      one LOCAL build at a time
          → 2.4 EAS iOS build (cloud)  ‖  2.5 local AAB build                          cloud ‖ one local
          → 2.6 TestFlight  ‖  2.7 Play open testing                                   wait: Apple beta review / Google review
          → 2.8 iPhone link test (Karim)  ‖  2.9 Android link test (T, phone)          one agent per device
3.1 iOS metadata push — any time after phase 1 and the bump (needs no build)
4.x submission — after 2.8 + 2.9 green and 3.1 done
```

Rules: never two local builds at once (`/tmp/soli-build.lock`); `yarn release`, `yarn ios` and `yarn build:android` are all local builds; one agent per device; Android phone lock `/tmp/android-device.lock`; EAS builds cost quota (3 of 15 after this one).

### Timeline (realistic)

| Day | What |
|---|---|
| D0 (today) | Phases 0–1, smoke tests, both builds, TestFlight upload, Play open testing commit, iOS metadata push |
| D0 evening – D1 | Google reviews the open-testing release (hours – 1 day); TestFlight internal is available ~1 h after the build; link tests 2.8 / 2.9 |
| D1 | Submit iOS for review (4.9) and Play production (4.11) |
| D2 – D3 | Apple review typically ~1 day (first submission with a new name / 18 locales can take 2); Google production review hours – a few days (listing changes are reviewed too) |
| D2 – D4 | Live: iOS phased over 7 days; Play 20 % → 100 % after 2–3 clean days |
| D9 – D10 | Everyone on 1.2.1; phase 5 closed |

Shortcut if speed matters more than the extra safety net: skip waiting for 2.7's review and submit Play production directly — not recommended, because the Play-signed App Links test (2.9) is the one thing never tested anywhere.

## Plan: Files to modify

| File | Change |
|---|---|
| `app.json`, `package.json` | 1.2.1, 18 / 18 |
| `docs/RELEASE-NOTES.md`, `store/release-notes/*.txt` (15) | 1.2.1 entry + translations |
| `store.config.js` (new), `eas.json` | EAS Metadata generator + `metadataPath` |
| `package.json` scripts | `metadata:lint`, `metadata:push` |
| `scripts/submit-android.js`, `scripts/lib/release-notes.js`, tests under `test/unit/` | production track, rollout, localized notes, listings, promote |
| `docs/external-package-guides/eas-metadata.md` (new, this plan), `google-play-developer-api.md` (section added), `app-store-connect-api.md` (new, implementer) | guides |
| `.agents/skills/soli-release/SKILL.md`, `store/README.md`, `docs/product/i18n/i18n.md`, `docs/product/release-automation/release-automation.md` | after the release |
| karimattia.ch repo: `public/.well-known/assetlinks.json` | second fingerprint (share-mechanics session) |

## Files actually modified

- `docs/product/store-launch/store-launch.md` (this plan, 2026-11-28)
- `docs/external-package-guides/eas-metadata.md` (new, 2026-11-28)
- `docs/external-package-guides/google-play-developer-api.md` (section "Listings, production track, staged rollout", 2026-11-28)

## Intermediary learnings

- 2026-11-28: eas-cli 27.11.0's `metadata:push` takes the ASC API key from the submit profile and handles screenshots; the public docs page still lists screenshots as unsupported and does not mention the key. Trust the installed source, verify with `metadata:pull` first.
- 2026-11-28: `GET /v1/ageRatingDeclarations/<id>` is not allowed (403, UPDATE only); read it through `GET /v1/appInfos/<id>/ageRatingDeclaration`.
- 2026-11-28: the App Store version string that is live is "1", not "1.0" / "1.0.0"; "1.2.1" sorts above it. The app has a second, older "1.0" record.
- 2026-11-28: the Play Developer API has no pure read mode — every read of tracks / listings needs an edit (`edits.insert`); an edit that is deleted or left uncommitted changes nothing. The repo's script has only an offline `--dry-run`, so Play production state was read from the public page for this plan.
- 2026-11-28: Android App Links are verified against the certificate the INSTALLED build is signed with: `yarn release` / adb installs = upload key, Play installs = Play App Signing key. Both must be in `assetlinks.json`, and only a Play-delivered install proves the second.

## Identified issues

| # | Issue | Status |
|---|---|---|
| 1 | `assetlinks.json` lacks the Play App Signing fingerprint → App Links unverified for every Play install | Fix in progress (share-mechanics session); gate = step 0.1 |
| 2 | Age rating: four new questions unanswered (F6) — may block the submission | Step 4.3 |
| 3 | No App Review contact on the version (F7) | Step 4.4 |
| 4 | Play service account may lack production / listing permissions (F13) | Step 0.7, Q7 |
| 5 | Paid Applications Schedule banner (Account Holder Timo) | Expected not to block a free app; detect at 4.9; inform Timo (0.6) |
| 6 | China mainland AIGC / security assessment by 2027-01-31; Soli is available in CHN | Q3, K-CALL, off the critical path |
| 7 | Real https universal link (iOS) and App Links (Android) never tested | Steps 2.8, 2.9 — gate for submission |
| 8 | History preview sheet stays on top when a link arrives | Share-mechanics session, Q8 |
| 9 | App Store Connect signed out in Chrome → anything without API (App Privacy labels, agreements page, crash UI) needs Karim's sign-in | Only if 4.9 demands it |

## Testing

- Cheap gates: `yarn typecheck && yarn lint && yarn jest --ci` (incl. `test/unit/store`, the release-notes block test, new submit-script tests).
- `npx eas-cli metadata:lint`; `yarn submit:android --dry-run` in every new mode.
- Device: steps 2.2, 2.3 (testing sub-agent, soli-testing skill, device lock), 2.8 (Karim, iPhone), 2.9 (testing sub-agent, Play-installed build).
- Post-launch: phase 5.
- Do not test: screenshots per locale, animation details, anything unrelated to link handling / launch / hint (avoid testing loops; this release changes one entitlement and maybe one sheet fix).

## Follow-ups

| Follow-up | Pros | Cons / trade-off | Recommendation |
|---|---|---|---|
| Localized screenshots (de, fr, es, ja first) | Conversion in big markets | Capture work, repo size | Later (i18n plan) |
| Remove China mainland availability (Q3) | No AIGC / licence obligations | Loses CN users | Yes, before 2027-01-31, Karim's call |
| Deferred deep linking (link survives the install) | Shared deal opens after installing | Needs clipboard / install-referrer tricks; proposed, not approved | Not now |
| zh-Hant, pt-PT listings | Reach | More files | On demand |
| Custom product page / promo text experiments | ASO | Time | Later |
| Make production the default track of `yarn submit:android` and drop the "Beta" naming | One flow | Open testing loses its role as a gate | After this release went well: keep open testing as the first stop, promote with `--promote` |
| Delete `docs/publishing/prod.md` (redirect only) | Less clutter | — | Yes, with 5.6 |
