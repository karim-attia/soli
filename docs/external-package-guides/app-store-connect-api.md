# App Store Connect API (direct calls) — usage guide

Date-stamped: 2026-11-28. Every call below **ran against Soli** (app id `6755950876`) through `scripts/asc-api.js` on that date, unless marked otherwise. Plan: `docs/product/store-launch/store-launch.md`.

Sources:

- API reference (all resources): https://developer.apple.com/documentation/appstoreconnectapi
- App availability v2 / territory availabilities: https://developer.apple.com/documentation/appstoreconnectapi/app-availabilities and https://developer.apple.com/documentation/appstoreconnectapi/territory-availabilities
- App Store versions and localizations: https://developer.apple.com/documentation/appstoreconnectapi/app-store-versions · https://developer.apple.com/documentation/appstoreconnectapi/app-store-version-localizations
- Phased release: https://developer.apple.com/documentation/appstoreconnectapi/app-store-version-phased-releases
- JWT auth: https://developer.apple.com/documentation/appstoreconnectapi/generating-tokens-for-api-requests

## How to call

```bash
A() { scripts/with-asc-key.sh node scripts/asc-api.js "$@"; }   # prints HTTP status, then the JSON body
A GET '/v1/apps/6755950876/appStoreVersions?filter[versionString]=1.2.1&filter[platform]=IOS'
A PATCH '/v1/…' '<json body>'
```

`scripts/asc-api.js` signs an ES256 JWT (20 min max, it uses 10) with the `.p8` from `scripts/with-asc-key.sh` (`~/.config/soli/AuthKey_3DC38PC55T.p8`, outside the repo); Key ID and Issuer ID come from `eas.json`. No dependency. A missing agreement answers 403 `FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED` on any call.

Text listing fields (name, subtitle, description, keywords, What's New, promotional text, URLs) are pushed with EAS Metadata (`docs/external-package-guides/eas-metadata.md`), not with these calls.

## Calls that ran (2026-11-28)

| Purpose | Call | Notes |
|---|---|---|
| List versions | `GET /v1/apps/6755950876/appStoreVersions?fields[appStoreVersions]=versionString,appStoreState,…` | Live = `"1"` (`READY_FOR_SALE`); 1.2.1 = `ff695e7c-0086-450c-9970-00640c784bed` (`PREPARE_FOR_SUBMISSION`, created by `metadata:push`) |
| Version localizations | `GET /v1/appStoreVersions/<v>/appStoreVersionLocalizations?limit=50` | 18 after the push; fields `description`, `keywords` (one comma string), `whatsNew`, `promotionalText`, `supportUrl` |
| App info (name / subtitle) | `GET /v1/apps/6755950876/appInfos` → `GET /v1/appInfos/<id>/appInfoLocalizations?limit=50` | Two app infos while a version is in preparation: live `e0cbbc8d-…` (`READY_FOR_SALE`) and editable `b3f9956b-3d60-435a-ad8c-7d4dce8a6cf8` (`PREPARE_FOR_SUBMISSION`); the new name / subtitle live in the editable one |
| Screenshots on a version | `GET /v1/appStoreVersionLocalizations/<loc>/appScreenshotSets?include=appScreenshots` | A new version inherits the previous version's sets |
| Phased release | `GET /v1/appStoreVersions/<v>/appStoreVersionPhasedRelease` | `INACTIVE` until the version is released; complete early later with `PATCH /v1/appStoreVersionPhasedReleases/<id>` `phasedReleaseState: COMPLETE` (not run) |
| Territory availability | `GET /v2/appAvailabilities/6755950876/territoryAvailabilities?limit=200&include=territory` | 175 territories. `limit[territoryAvailabilities]` on `/v2/appAvailabilities/<id>` caps at 50 → use this sub-resource instead |
| Remove a territory | `PATCH /v1/territoryAvailabilities/<id> '{"data":{"type":"territoryAvailabilities","id":"<id>","attributes":{"available":false}}}'` | 200, `contentStatuses: ["PROCESSING_TO_NOT_AVAILABLE"]`. Reversible with `available: true`. China mainland's id for Soli: `eyJzIjoiNjc1NTk1MDg3NiIsInQiOiJDSE4ifQ` (base64 of `{"s":"6755950876","t":"CHN"}`) |
| Age rating (read) | `GET /v1/appInfos/<id>/ageRatingDeclaration` | `GET /v1/ageRatingDeclarations/<id>` is 403 (UPDATE only) |
| TestFlight external group, What to Test, beta review | see `.agents/skills/soli-release/SKILL.md` section 9 | Used for 1.2.0 |

## Planned, not run yet (store-launch phase 4)

- Attach build: `PATCH /v1/appStoreVersions/<v>/relationships/build '{"data":{"type":"builds","id":"<build id>"}}'`
- Age rating answers: `PATCH /v1/ageRatingDeclarations/<id>` (the four new null questions)
- Review contact: `POST /v1/appStoreReviewDetails` (relationship `appStoreVersion`), contact copied at run time from `GET /v1/apps/6755950876/betaAppReviewDetail` — never into the repo
- Submit: `POST /v1/reviewSubmissions` → `POST /v1/reviewSubmissionItems` → `PATCH /v1/reviewSubmissions/<id>` `submitted: true`

Correct this file with what actually happened when they run.
