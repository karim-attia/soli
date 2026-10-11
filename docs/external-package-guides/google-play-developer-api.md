# Google Play Developer API (androidpublisher v3) — usage guide

Date-stamped: 2026-10-11. Used by `scripts/submit-android.js` (`yarn submit:android`) to upload Soli's locally built AAB to the open-testing track with a release name and release notes. No client library — Node stdlib (`crypto.sign`, `fetch`) only. Play app: package `ch.karimattia.soli`, developer account `5772991807588369431`, app id `4974901385199648938`.

Sources:

- Edits workflow: https://developers.google.com/android-publisher/edits
- Track names: https://developers.google.com/android-publisher/tracks
- `edits.tracks` resource (Track / TrackRelease / LocalizedText): https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks
- `edits.tracks.update`: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.tracks/update
- `edits.bundles.upload`: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.bundles/upload · `Bundle` resource: https://developers.google.com/android-publisher/api-ref/rest/v3/edits.bundles
- `edits.commit` (`changesNotSentForReview`): https://developers.google.com/android-publisher/api-ref/rest/v3/edits/commit
- Service-account OAuth2 (JWT bearer flow): https://developers.google.com/identity/protocols/oauth2/service-account
- Play Console help, "Prepare and roll out a release" (release notes limit, release name, Publishing overview): https://support.google.com/googleplay/android-developer/answer/9859348
- Expo forum report of the `changesNotSentForReview` refusal: https://forums.expo.dev/t/bug-android-submit-fails-with-changesnotsentforreview-error/54038
- fastlane supply (comparison only): https://docs.fastlane.tools/actions/supply/ · source https://github.com/fastlane/fastlane/blob/master/supply/lib/supply/uploader.rb

## Why this and not `eas submit` / fastlane (decision 2026-10-11)

| | `eas submit -p android --path <aab>` | fastlane `supply` | **Own script (chosen)** |
|---|---|---|---|
| Release name | no key in eas.json (schema has only `serviceAccountKeyPath`, `track`, `releaseStatus`, `rollout`, `changesNotSentForReview`, `applicationId`) | `version_name` → `TrackRelease.name` | `name` field, "<major.minor> Beta" |
| en-US release notes | no (the eas-cli changelog never added one; only `--what-to-test` for TestFlight) | `metadata/android/en-US/changelogs/<versionCode>.txt` | `releaseNotes[{language,text}]` from `docs/RELEASE-NOTES.md` |
| Dependencies | eas-cli (already used for iOS) | Ruby + fastlane gem | none (Node 26 stdlib) |
| EAS free plan | Submit is included and is not a build, so no build quota — but the upload goes through EAS servers | n/a | n/a (direct to Google) |
| Lines we own | ~6 (eas.json) + a Console visit per release for name/notes | ~20 (Fastfile) + metadata tree | ~170 (`scripts/submit-android.js` + `scripts/lib/release-notes.js`) |

Karim wants the "Google Play:" text in the release without a Console visit, which rules out `eas submit`; fastlane adds a toolchain for one call. The API flow is four requests.

## Auth: service-account JWT → bearer token

JSON key fields used: `client_email`, `private_key`, `token_uri`.

1. Header `{"alg":"RS256","typ":"JWT"}`; claims `{iss: client_email, scope: "https://www.googleapis.com/auth/androidpublisher", aud: token_uri, iat, exp ≤ iat+3600}`; both base64url, joined with `.`.
2. Sign with RSASSA-PKCS1-v1_5 SHA-256 (`crypto.sign('RSA-SHA256', data, private_key)`), base64url, append.
3. `POST https://oauth2.googleapis.com/token`, `application/x-www-form-urlencoded`, `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=<jwt>` → `{access_token, expires_in, token_type:"Bearer"}`.
4. `Authorization: Bearer <access_token>` on every call.

## The four calls

Base: `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}`

1. `POST {base}/edits` (body `{}`) → `{id, expiryTimeSeconds}`. An edit is a transaction; nothing is visible or consumed until commit, and uncommitted edits expire.
2. `POST https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/{packageName}/edits/{editId}/bundles?uploadType=media`, body = raw AAB bytes, `Content-Type: application/octet-stream` → `Bundle {versionCode: int, sha1, sha256}`. Google recommends a long (≥ 2 min) HTTP timeout. The script asserts `versionCode` equals app.json and `sha256` equals the local hash before going on.
3. `PUT {base}/edits/{editId}/tracks/{track}` with
   ```json
   { "track": "beta", "releases": [ { "name": "1.1 Beta", "versionCodes": ["16"], "status": "completed",
       "releaseNotes": [ { "language": "en-US", "text": "..." } ] } ] }
   ```
   `status` ∈ `draft | inProgress | halted | completed` (`inProgress` needs `userFraction`). `versionCodes` are int64 **strings**. Only the releases listed stay on the track (fastlane does the same).
4. `POST {base}/edits/{editId}:commit?changesNotSentForReview=<bool>` → `AppEdit`.

Track ids (Play docs "tracks"): Console "Open testing" = `beta`, "Production" = `production`; `alpha`/`internal` are the eas-cli/fastlane enum names for closed/internal testing. Custom closed tracks use their own name (`wear:`/`automotive:` prefixes for form factors). Soli's testers are on open testing → `beta`.

## `changesNotSentForReview` with managed publishing OFF

- `false` (default, and the script's default): committing the edit is the API equivalent of today's manual "Save → Publishing overview → Send changes for review": Google reviews the release and, with `status: completed`, rolls it out when approved.
- `true`: the release is saved as "Changes ready to send for review"; someone must press "Send changes for review" in Play Console → Publishing overview. The API reference describes it for the post-rejection case ("won't be reviewed until they are explicitly sent for review from within the Google Play Console UI"). The Expo forum thread shows Google sometimes *refuses* a plain commit with "set the query parameter changesNotSentForReview to true" (apps not yet approved / other pending changes). `scripts/submit-android.js` retries once with `true` in that case and prints the Console instruction; `--hold-review` forces it.
- Managed publishing ON would change this (nothing goes live until "Publish" in the Console); Soli has it OFF.

## Limits and Console facts

- Release notes: "up to 500 Unicode characters per language"; the script counts code points and fails before uploading.
- Release name: Console-only label, "not visible to users"; Play defaults it to the version name of the first bundle. Soli uses "<major.minor> Beta".
- A versionCode is consumed as soon as a release containing it is saved in the Console (seen 2026-10-11 with the withdrawn versionCode 15 draft). Via the API, nothing is consumed before `edits.commit`.
- You cannot create a new release on a track while another one on that track is unpublished/outstanding — discard it on the Publishing overview first (Console help).

## One-time setup (Karim, ~15 min)

1. Google Cloud: create (or pick) a project → APIs & Services → enable **Google Play Android Developer API** → IAM → Service accounts → create one (no Cloud roles needed) → Keys → Add key → JSON. Save it as `~/.config/soli/play-service-account.json` (`chmod 600`), never inside the repo (`.gitignore`/`.easignore` ignore `.env`, but not arbitrary JSON files — keep it out of the tree).
2. Play Console → Users and permissions → Invite new users → the service account's email → app permissions for Soli: **"Release apps to testing tracks"** (uploads to internal/closed/open testing) and **"View app information and download bulk reports (read-only)"**. Not needed: "Release to production…", "Manage testing tracks and edit tester lists", Admin. Permissions can take a few minutes to propagate (403 until then).
3. `.env`: `SOLI_PLAY_SERVICE_ACCOUNT_KEY=/Users/karim/.config/soli/play-service-account.json` (optional — that path is the default).
4. `yarn submit:android --dry-run` (local validation only), then the real run when Karim says go.

## Not confirmed (2026-10-11)

1. Whether Node's `fetch` (undici) default timeouts are generous enough for a 120 MB upload on a slow upstream (undici's `headersTimeout` is 300 s). Untested until the key exists; if it bites, set a custom `dispatcher` with a longer `headersTimeout`/`bodyTimeout`.
2. The exact current Play Console labels of the two permissions above (third-party guides agree on the wording; Google's own help page was not in the search results).
3. Whether a plain commit on Soli's open-testing track is accepted (`changesNotSentForReview=false`) or triggers the refusal from the Expo thread — the retry covers both.
4. The "Internal testing" API track id: the tracks page fetched via summary said `qa`, eas-cli/fastlane use `internal`. Irrelevant for Soli (open testing = `beta`), but re-check before ever targeting internal testing.
