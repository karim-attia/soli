---
name: soli-release
description: Release cookbook for the Soli app — what an agent does when Karim says "let's release": pre-flight, version bump rules (app.json is the single source), release-notes texts and approval, cheap gates, the iOS EAS build and the local Android AAB build, smoke test pointer, uploads to TestFlight and Google Play in API mode or manual fallback, tester assignment, what needs Karim's explicit go-ahead, troubleshooting. Use for any TestFlight / Play Store release or store-upload task.
---

# Soli release cookbook

Both stores, run from this Mac, no CI. Package/bundle id `ch.karimattia.soli`. iOS builds on EAS (cloud, free plan: 15 iOS builds/month — never retry blindly), Android builds locally (`yarn build:android`, AAB). The agent never commits, stages or tags — Karim does that afterwards. Device testing recipes: `.agents/skills/soli-testing/SKILL.md`.

## 1. Flow at a glance

1. Pre-flight (2 min) → 2. Bump → 3. Release notes → **show texts, get Karim's OK** → 4. Gates → 5. Builds (iOS first on EAS, Android locally while it runs — one LOCAL build at a time) → 6. Smoke test → 7. Uploads → 8. Testers → 9. Verify + report → 10. Karim commits + tags.

Karim's explicit go-ahead is required for: the release-notes texts, anything that sends a build for review or to testers (Play commit, TestFlight external beta review), and anything public. Builds, dry runs and uploads that stay uncommitted/unassigned do not need it.

## 2. Pre-flight

- Git: a dirty tree is fine (Karim stages between turns). Never commit/stage/unstage anything.
- Versions: `app.json` is the truth (`expo.version`, `ios.buildNumber`, `android.versionCode`). Current on the stores (2026-11-26): 1.2.0 = iOS build **17**, Android versionCode **17**. To re-check: Play Console → Soli → Open testing (latest release); App Store Connect → TestFlight → builds. `npx eas-cli build:list -p ios --limit 3` shows the last EAS builds (appVersion/appBuildVersion).
- Credentials: iOS distribution certificate (serial `1E9A030F…4320`, Apple id `3NS8NHQQ68`) + provisioning profile `*[expo] ch.karimattia.soli AppStore …` (portal id `8569XZ3U4R`, includes Associated Domains) on EAS **expire 2027-11-26**. EAS created and manages both since 2026-11-26 (App Store Connect API key, no Apple ID login, no export by Timo). Releasing after that date → renew first, step by step in `docs/publishing/ios-release-build.md` ("Renewal"). `eas build` prints the expiry in its credentials summary — read it every time. The distribution certificate is account-wide: **never revoke/delete a distribution certificate** (EAS menu "Delete one from your account" or the portal) — Timo's other apps (Tichu, Unfog) sign with the same account's certificates.
- New iOS capability since the last release (`git diff <last-release-commit> -- app.json`: `ios.associatedDomains`, `ios.entitlements`, plugins that add entitlements)? The provisioning profile must include it, otherwise the EAS build dies in fastlane after ~3 min and the quota is spent. Timo enables the capability on the App ID (developer.apple.com → Identifiers; check with `scripts/with-asc-key.sh node scripts/asc-api.js GET '/v1/bundleIds/G5BS2Y54X8/bundleIdCapabilities'`); that turns the existing profile INVALID, so regenerate it BEFORE building: the "Renewal" steps in `docs/publishing/ios-release-build.md`, answering "Use an existing one" for the certificate.
- `ios.associatedDomains: ["applinks:karimattia.ch"]` is back in app.json since 2026-11-26 (it was removed for 1.2.0 only because the old manual profile "Soli App Store" lacked the capability and the first 1.2.0 EAS build failed on it). The capability is enabled on the App ID and the EAS-managed profile carries `com.apple.developer.associated-domains`. First build with it is the one after 1.2.0 (17): check there that an https share link (`https://karimattia.ch/soli/deal…`) opens the app on iOS. The stale profile "Soli App Store" (INVALID, tied to the old certificate) is still listed at Apple, unused — Timo may delete it.
- Local prerequisites: `.env` with `SOLI_UPLOAD_*` (keystore outside the repo), Rust toolchain (`cargo`, `rustup`; `scripts/ensure-rust-solver.js` rebuilds the solver artifacts for all four ABIs + the xcframework), `npx eas-cli whoami` → `karim.attia`.
- `docs/RELEASE-NOTES.md` has every version so far; find what changed since the last entry with `git log --oneline <last-release-commit>..` (the last entry's date helps).

## 3. Version bump rules

- Bump `app.json`: `expo.version` (semver; a beta is still `x.y.0`), `ios.buildNumber` and `android.versionCode` **both to the same next integer** = max(current iOS, current Android) + 1 → next release is **18 / 18** (they diverged at 15/16 once because Play consumed 16's predecessor; from now on they move together). `package.json` `version` follows `expo.version` (no runtime effect, kept in sync by precedent).
- A number consumed by a store cannot be reused: Play consumes a versionCode as soon as a release containing it is SAVED in the Console (even a draft later discarded); TestFlight consumes a build number once uploaded. If one store consumed a number, skip to the next for BOTH.
- `build-android.sh` patches the generated `android/app/build.gradle` from app.json (versionCode/versionName); `eas build` reads app.json (`cli.appVersionSource: local`). No other place to edit. If app.json plugins/icons/splash or a native module changed since the last prebuild, run `yarn prebuild:android` once before `yarn build:android` (slow; resets the signing block, which the script re-applies).

## 4. Release notes (`docs/RELEASE-NOTES.md`)

Add a `## <version> — <YYYY-MM-DD>` entry at the top, format of the existing ones:

1. Long list for humans/GitHub: bullets, bold feature names, "Fix:" prefix for fixes.
2. `Google Play:` block (what Play users read; `yarn submit:android` extracts it, fails if missing or > 500 characters): **short and non-technical, minimal bullets**, e.g. "Soli 1.1 adds hints!" + 2–3 bullets + "Happy playing!". Karim rejected "shows the next move on a winning line" as too technical — say what the user gets, not how it works.
3. TestFlight "What to Test": reuse the Google Play text.

**Always paste both texts in chat and wait for Karim's approval before any upload.**

**Translated "What's new" (after Karim approved the English text):** copy the approved Google Play text to `store/release-notes/en-US.txt`, then run the translation skill (`.agents/skills/soli-translation/SKILL.md`, section 3 "Store files") for `store/release-notes/<locale>.txt` in all 14 languages (≤ 500 characters each; `yarn jest test/unit/store` checks it). Never translate before the approval: a reworded English text means 14 re-translations. `yarn submit:android` uploads the notes in all 18 Play languages (en-US.txt must equal the "Google Play:" block, the script checks). Listing text under `store/` (store/README.md, top), each upload with Karim's go-ahead:

- App Store: `scripts/with-asc-key.sh npx eas-cli metadata:push --non-interactive` — creates/updates the App Store version `app.json` names, with name, subtitle, description, keywords, promotional text, What's New and URLs for 18 locales (`store.config.js`). Run it twice when a locale is new (the first push creates new localizations empty), then verify (`docs/external-package-guides/eas-metadata.md`). Never `metadata:pull` in the repo: it overwrites `store.config.js`.
- Google Play: `yarn submit:android --listings-only`, or `--listings` in the same edit as a release. Production: `yarn submit:android --promote --track production --rollout 0.2 [--listings]` (versionCode already on Play from open testing); raise later with `--promote --track production --rollout <f>` or without `--rollout` (= 100 %).
- **China mainland is OFF on the App Store since 2026-11-28** (Apple needs a game licence number for CHN; Karim accepted that the zh listing does not reach China; reversible: `PATCH /v1/territoryAvailabilities/eyJzIjoiNjc1NTk1MDg3NiIsInQiOiJDSE4ifQ` `available: true`, `docs/external-package-guides/app-store-connect-api.md`). Keep it off; `availableInNewTerritories` stays true.

## 5. Gates

`yarn typecheck && yarn lint && yarn jest --ci` (the jest suite includes a test that the current app.json version has a valid "Google Play:" block). Then `yarn submit:android --dry-run` — prints package, versions, AAB path/sha256, track, release name, notes and the service-key status without talking to Google (needs the AAB; run it again after the build).

## 6. Builds

**Never run two LOCAL builds in parallel** (machine + `/tmp/soli-build.lock`). The EAS build runs in the cloud, so start it first and build Android meanwhile.

### iOS (EAS cloud)

```bash
yarn build:ios            # = ensure-rust-solver + scripts/with-asc-key.sh npx eas-cli build --platform ios --profile production --non-interactive --auto-submit
```

- **`--auto-submit` uploads the finished build to TestFlight by itself** (API key, section 8) and the internal group gets it automatically, so run the smoke test (section 7) BEFORE `yarn build:ios`. Append `--what-to-test "<Google Play text>"` to fill the internal "What to Test".
- Use `npx eas-cli`, never `npx eas` (that npm package is not the CLI and fails with "could not determine executable to run"). Add `--no-wait` to get the build id/URL immediately and poll with `npx eas-cli build:view <id>` / `build:list` every few minutes (a 5–10 min timer, not a tight loop). Typical duration 7–20 min.
- Expected output: credentials summary (distribution certificate serial, profile, **expiry dates**), `appVersion 1.x.0`, `appBuildVersion <buildNumber>`, status FINISHED, artifact URL `https://expo.dev/artifacts/eas/<id>.ipa`.
- A failed cloud build costs quota: read the log (`npx eas-cli build:view <id>`, Xcode log link in the JSON) and fix the cause before any retry. Builds started from a machine without the solver artifacts fail at pod install — `.easignore` uploads `modules/soli-solver/` artifacts on purpose.
- Keep a copy for the manual path: `curl -L -o .test-artifacts/release/Soli-<version>-<build>.ipa "<artifact url>"` (`.test-artifacts/` is gitignored).

### Android (local AAB)

```bash
yarn build:android        # = ./build-android.sh → android/app/build/outputs/bundle/release/app-release.aab
```

- Loads `.env`, checks the keystore, patches signing + version into `android/app/build.gradle`, runs `scripts/ensure-rust-solver.js`, defaults `ANDROID_HOME` to `~/Library/Android/sdk` (agent shells don't source `~/.zshrc`), `./gradlew bundleRelease`, then asserts the solver `.so` per ABI.
- Native compile runs **one clang at a time** by default: `--init-script scripts/limit-native-jobs.init.gradle` (CMake job pools) + `--max-workers`, because ninja's default ncpu+2 jobs next to the Gradle daemon filled the 16 GB RAM + swap. `SOLI_NATIVE_JOBS=<n> yarn build:android` raises it (Gradle may then run n CMake tasks with n jobs each); changing the value recompiles every native module once. A cold 4-ABI build takes far longer than 10 min this way: start it detached (`nohup … &`) or as a background command and wait for it, never with a foreground timeout.
- Expected log lines: `Android signing config already correct` (or `Repaired…`), `Android version: <version> (versionCode <n>)`, `BUILD SUCCESSFUL in …` (≈4–5 min warm; ≈20 min after adding ABIs or a clean prebuild), then **all four** `ABI arm64-v8a: solver present`, `ABI armeabi-v7a: solver present`, `ABI x86: solver present`, `ABI x86_64: solver present`, `Build completed: android/app/build/outputs/bundle/release/app-release.aab`. Fewer than four ABI lines = an ABI went missing → Play will warn "devices no longer supported"; fix before uploading.
- Copy: `cp android/app/build/outputs/bundle/release/app-release.aab .test-artifacts/release/Soli-<version>-<versionCode>.aab` (≈120 MB with four ABIs). Signing check: `keytool -printcert -jarfile <aab>` → `CN=Karim Attia, O=Soli App` (upload key).

## 7. Smoke test (before uploading)

Follow `.agents/skills/soli-testing/SKILL.md`. Minimum: `yarn release` on the phone (same patched `android/` → same version), fresh deal, tap Hint → `[solver] … status=solved` in logcat, no crash. Cheap 32-bit check on the 64-bit phone: `adb install -r --abi armeabi-v7a <release apk>` → Hint works → reinstall without `--abi`. iOS: install the IPA is not possible on the simulator; rely on the EAS build + TestFlight internal testers (or `yarn ios` for a simulator sanity run of the same commit). Phone data guardrail applies (Karim's main phone).

## 8. Uploads

### Google Play (open testing track `beta`, release name "<major.minor> Beta")

API mode (needs the service-account key, see `docs/external-package-guides/google-play-developer-api.md`):

```bash
yarn submit:android --dry-run        # local validation + the exact release payload
yarn submit:android                  # ← only after Karim's OK: uploads, names, adds notes, commits → Play reviews + rolls out
yarn submit:android --hold-review    # same, but Karim presses "Send changes for review" himself (Publishing overview)
```

Fails clearly when `SOLI_PLAY_SERVICE_ACCOUNT_KEY` (default `~/.config/soli/play-service-account.json`) is missing, the AAB is missing, the notes are missing/too long, or the uploaded versionCode/sha256 differ from app.json/local (edit left uncommitted — nothing consumed). The script is the API equivalent of the manual flow below in one step.

Manual fallback (no key, or API failure): the browser agent cannot upload files > 10 MB, so **Karim drags the AAB** (`.test-artifacts/release/Soli-<v>-<code>.aab`) into Play Console → Soli → Testing → Open testing → Create new release. The agent (claude-in-chrome, Karim is logged in) then sets Release name `<major.minor> Beta`, pastes the "Google Play:" text as en-US release notes, Save → (with Karim's OK) Publishing overview → "Send changes for review". Managed publishing is OFF: after review it goes live on the track by itself. Discard any older unpublished draft first (a track allows one outstanding release).

### TestFlight

API mode (App Store Connect API key since 2026-11-25; setup in `docs/external-package-guides/eas-submit.md`): `yarn build:ios` already submits. Only when that submission failed or the build ran without `--auto-submit`:

```bash
yarn submit:ios                      # = scripts/with-asc-key.sh npx eas-cli submit -p ios --latest --non-interactive
```

The key file is `~/.config/soli/AuthKey_3DC38PC55T.p8` (never in the repo; `scripts/with-asc-key.sh` fails clearly when it is missing). Processing takes 10–60 min: the upload sits under TestFlight → Build Uploads as "Processing" and the build is listed only afterwards. Check without a browser: `scripts/with-asc-key.sh node scripts/asc-api.js GET '/v1/builds?filter[app]=6755950876&filter[version]=<buildNumber>&include=buildBetaDetail'` → `processingState: VALID`.

Manual fallback: download the IPA (above), Transporter → drag the IPA → Deliver. Transporter and the App Store Connect website both lose their session regularly and then need Karim's password — the agent never enters it. A pending "Apple Developer Program License Agreement" banner (Account Holder = Timo must accept) can make deliveries fail.

## 9. Testers

- TestFlight **internal** group "Testers": gets every processed build automatically — nothing to do.
- TestFlight **external** group "Testers" (public link, id `60e284e3-e38d-4a9a-bd8a-27b09d6b28c8`): per build, **Karim's OK first** — set "What to Test" = Google Play text, add the build, submit for beta review (the first build of a new version is reviewed, usually < 1 day). `eas submit` cannot do this. Via the API (used for 1.2.0; `A` = `scripts/with-asc-key.sh node scripts/asc-api.js`, `<b>` = build id from the builds query above, whose `included` also has the `betaBuildLocalizations` id `<l>`):
  1. `A PATCH /v1/betaBuildLocalizations/<l> '{"data":{"type":"betaBuildLocalizations","id":"<l>","attributes":{"whatsNew":"<text>"}}}'` → 200
  2. `A POST /v1/betaGroups/60e284e3-e38d-4a9a-bd8a-27b09d6b28c8/relationships/builds '{"data":[{"type":"builds","id":"<b>"}]}'` → 204
  3. `A POST /v1/betaAppReviewSubmissions '{"data":{"type":"betaAppReviewSubmissions","relationships":{"build":{"data":{"type":"builds","id":"<b>"}}}}}'` → 201, `WAITING_FOR_REVIEW`
  Export compliance needs no answer (`ITSAppUsesNonExemptEncryption: false` in app.json). Same steps by hand: App Store Connect → TestFlight → Testers (external) → Builds → add build.
- Google Play open testing: testers are on the track; the committed release reaches them after Google's review. Nothing per release.

## 10. Verify + report

- Play Console → Open testing shows `<major.minor> Beta` with versionCode `<n>` "In review" → later "Available"; no "devices no longer supported" warning.
- App Store Connect → TestFlight shows `<version> (<build>)` processed; internal group has it; external shows "Waiting for review"/"Testing".
- Report to Karim: versions, build ids/URLs, where each store stands, and the git commands he runs: `git add -A && git commit -m "Release <version>" && git tag v<version>`.
- Also update `docs/product/release-automation/release-automation.md` (status, learnings) and this skill when something was wrong or stale.

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| `npx eas …` → "could not determine executable to run" | Use `npx eas-cli …` (the `eas` npm package is unrelated) |
| EAS warns `cli.appVersionSource` unset | Already set to `local` in `eas.json`; app.json stays the source |
| EAS build fails | Read the log before retrying — every cloud build counts against the free quota (15 iOS/month) |
| EAS build `XCODE_BUILD_ERROR`: `Provisioning profile "…" doesn't include the Associated Domains capability` / `…associated-domains entitlement` (1.2.0, 2026-11-23, build 71cfb700) | app.json asks for an entitlement the stored profile lacks. Timo enables the capability on the App ID (developer.apple.com → Identifiers → `ch.karimattia.soli`), then regenerate the profile with the API key (`docs/publishing/ios-release-build.md`, "Renewal") and rebuild. Or drop the entitlement from app.json for this release (Karim's call) |
| "Build number already exists" (TestFlight) / Play "version code already used" | The number is consumed; bump BOTH numbers in app.json to the next free one and rebuild |
| Play Console warns "N device models no longer supported" | An ABI went missing from the AAB (expect four `solver present` lines); `scripts/build-rust-solver.sh` must produce all four `.so`; never ship 64-bit only |
| Play refuses the commit asking for `changesNotSentForReview=true` | The script retries that way automatically; then Karim sends the changes for review in Publishing overview |
| `yarn submit:android` → key missing | Put the service-account JSON at `~/.config/soli/play-service-account.json` or set `SOLI_PLAY_SERVICE_ACCOUNT_KEY` in `.env`; HTTP 403 right after granting Play Console permissions → wait 5–10 min |
| Mac swaps / freezes during the local Android build (many `clang` processes) | The build was started without the job limit (bare `./gradlew`): use `yarn build:android` / `yarn release`, or add `--init-script ../scripts/limit-native-jobs.init.gradle --max-workers=1` |
| Gradle "SDK location not found" | `ANDROID_HOME` unset in the agent shell — the scripts default it; export it if calling Gradle by hand |
| Gradle configuration-cache problems after dependency changes | `cd android && ./gradlew bundleRelease --no-configuration-cache` once |
| First build after new ABIs/clean prebuild takes 20+ min | Expected (NDK compile of every native module per new ABI); later builds are warm again |
| Browser agent cannot attach the AAB/IPA | 10 MB upload cap — Karim drags the file; the agent fills the forms |
| `eas submit --non-interactive` → "App Store Connect API Keys cannot be set up in --non-interactive mode" | The key did not reach eas-cli: it ignores `EXPO_ASC_*` here and needs `ascApiKeyPath` from eas.json → run through `scripts/with-asc-key.sh` (`yarn submit:ios`) |
| `eas credentials` has no `--non-interactive` | It needs a TTY: Karim runs it in a terminal, or an agent drives it through a pty (arrow keys + Return; done that way 2026-11-26). Read-only check without it: the `eas build` credentials summary, or the App Store Connect API (`/v1/certificates`, `/v1/profiles?include=certificates`) |

## 12. Self-improvement

Same rule as `soli-testing`: if anything here was wrong, stale or caused friction, update this skill in place (no changelog prose). History and rationale live in `docs/product/release-automation/release-automation.md`.

## 13. Further reading

- `docs/external-package-guides/google-play-developer-api.md` (Android upload script, service-account setup), `docs/external-package-guides/eas-submit.md` (iOS submit, API-key activation, what stays manual)
- `docs/publishing/ios-release-build.md` (Apple credential story: Individual account, EAS-managed cert/profile via the API key, yearly renewal steps), `docs/publishing/android-release-build.md` (keystore facts)
- `docs/product/release-automation/release-automation.md` (the 1.1.0 release log, decisions, learnings)
