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
- Versions: `app.json` is the truth (`expo.version`, `ios.buildNumber`, `android.versionCode`). Current on the stores (2026-10-11): 1.1.0 = iOS build **15**, Android versionCode **16**. To re-check: Play Console → Soli → Open testing (latest release); App Store Connect → TestFlight → builds. `npx eas-cli build:list -p ios --limit 3` shows the last EAS builds (appVersion/appBuildVersion).
- Credentials: iOS distribution certificate + provisioning profile on EAS **expire 2026-12-06**. Releasing after that date → renewal first (Timo exports a new `.p12` + profile, `npx eas-cli credentials -p ios`; see `docs/publishing/ios-release-build.md`). `eas build` prints the expiry in its credentials summary — read it every time.
- Local prerequisites: `.env` with `SOLI_UPLOAD_*` (keystore outside the repo), Rust toolchain (`cargo`, `rustup`; `scripts/ensure-rust-solver.js` rebuilds the solver artifacts for all four ABIs + the xcframework), `npx eas-cli whoami` → `karim.attia`.
- `docs/RELEASE-NOTES.md` has every version so far; find what changed since the last entry with `git log --oneline <last-release-commit>..` (the last entry's date helps).

## 3. Version bump rules

- Bump `app.json`: `expo.version` (semver; a beta is still `x.y.0`), `ios.buildNumber` and `android.versionCode` **both to the same next integer** = max(current iOS, current Android) + 1 → next release is **17 / 17** (they diverged at 15/16 once because Play consumed 16's predecessor; from now on they move together). `package.json` `version` follows `expo.version` (no runtime effect, kept in sync by precedent).
- A number consumed by a store cannot be reused: Play consumes a versionCode as soon as a release containing it is SAVED in the Console (even a draft later discarded); TestFlight consumes a build number once uploaded. If one store consumed a number, skip to the next for BOTH.
- `build-android.sh` patches the generated `android/app/build.gradle` from app.json (versionCode/versionName); `eas build` reads app.json (`cli.appVersionSource: local`). No other place to edit. If app.json plugins/icons/splash or a native module changed since the last prebuild, run `yarn prebuild:android` once before `yarn build:android` (slow; resets the signing block, which the script re-applies).

## 4. Release notes (`docs/RELEASE-NOTES.md`)

Add a `## <version> — <YYYY-MM-DD>` entry at the top, format of the existing ones:

1. Long list for humans/GitHub: bullets, bold feature names, "Fix:" prefix for fixes.
2. `Google Play:` block (what Play users read; `yarn submit:android` extracts it, fails if missing or > 500 characters): **short and non-technical, minimal bullets**, e.g. "Soli 1.1 adds hints!" + 2–3 bullets + "Happy playing!". Karim rejected "shows the next move on a winning line" as too technical — say what the user gets, not how it works.
3. TestFlight "What to Test": reuse the Google Play text.

**Always paste both texts in chat and wait for Karim's approval before any upload.**

## 5. Gates

`yarn typecheck && yarn lint && yarn jest --ci` (the jest suite includes a test that the current app.json version has a valid "Google Play:" block). Then `yarn submit:android --dry-run` — prints package, versions, AAB path/sha256, track, release name, notes and the service-key status without talking to Google (needs the AAB; run it again after the build).

## 6. Builds

**Never run two LOCAL builds in parallel** (machine + `/tmp/soli-build.lock`). The EAS build runs in the cloud, so start it first and build Android meanwhile.

### iOS (EAS cloud)

```bash
yarn build:ios            # = node scripts/ensure-rust-solver.js && npx eas-cli build --platform ios --profile production --non-interactive
```

- Use `npx eas-cli`, never `npx eas` (that npm package is not the CLI and fails with "could not determine executable to run"). Add `--no-wait` to get the build id/URL immediately and poll with `npx eas-cli build:view <id>` / `build:list` every few minutes (a 5–10 min timer, not a tight loop). Typical duration 7–20 min.
- Expected output: credentials summary (distribution certificate serial, profile, **expiry dates**), `appVersion 1.x.0`, `appBuildVersion <buildNumber>`, status FINISHED, artifact URL `https://expo.dev/artifacts/eas/<id>.ipa`.
- A failed cloud build costs quota: read the log (`npx eas-cli build:view <id>`, Xcode log link in the JSON) and fix the cause before any retry. Builds started from a machine without the solver artifacts fail at pod install — `.easignore` uploads `modules/soli-solver/` artifacts on purpose.
- Keep a copy for the manual path: `curl -L -o .test-artifacts/release/Soli-<version>-<build>.ipa "<artifact url>"` (`.test-artifacts/` is gitignored).

### Android (local AAB)

```bash
yarn build:android        # = ./build-android.sh → android/app/build/outputs/bundle/release/app-release.aab
```

- Loads `.env`, checks the keystore, patches signing + version into `android/app/build.gradle`, runs `scripts/ensure-rust-solver.js`, defaults `ANDROID_HOME` to `~/Library/Android/sdk` (agent shells don't source `~/.zshrc`), `./gradlew bundleRelease`, then asserts the solver `.so` per ABI.
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

API mode (needs the App Store Connect API key — not available yet, see `docs/external-package-guides/eas-submit.md`):

```bash
yarn submit:ios                      # = npx eas-cli submit -p ios --latest --non-interactive
npx eas-cli submit -p ios --latest --non-interactive --what-to-test "<Google Play text>" -g Testers   # also fills internal "What to test"
```

(or `--auto-submit` on the build). Manual fallback (today's mode): download the IPA (above), open Transporter (Karim's Apple ID is signed in; the agent can drive it via computer-use), drag the IPA, Deliver; processing takes 10–30 min; the build then appears in App Store Connect → TestFlight.

## 9. Testers

- TestFlight **internal** group "Testers": gets every processed build automatically — nothing to do.
- TestFlight **external** group "Testers" (public link): always manual — App Store Connect → TestFlight → Testers (external) → Builds → add build `<version> (<buildNumber>)` → "What to Test" = Google Play text → submit for beta review (**Karim's OK first**; the first build of a new version goes through beta review, usually < 1 day). Neither `eas submit` nor `eas.json` can do this.
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
| "Build number already exists" (TestFlight) / Play "version code already used" | The number is consumed; bump BOTH numbers in app.json to the next free one and rebuild |
| Play Console warns "N device models no longer supported" | An ABI went missing from the AAB (expect four `solver present` lines); `scripts/build-rust-solver.sh` must produce all four `.so`; never ship 64-bit only |
| Play refuses the commit asking for `changesNotSentForReview=true` | The script retries that way automatically; then Karim sends the changes for review in Publishing overview |
| `yarn submit:android` → key missing | Put the service-account JSON at `~/.config/soli/play-service-account.json` or set `SOLI_PLAY_SERVICE_ACCOUNT_KEY` in `.env`; HTTP 403 right after granting Play Console permissions → wait 5–10 min |
| Gradle "SDK location not found" | `ANDROID_HOME` unset in the agent shell — the scripts default it; export it if calling Gradle by hand |
| Gradle configuration-cache problems after dependency changes | `cd android && ./gradlew bundleRelease --no-configuration-cache` once |
| First build after new ABIs/clean prebuild takes 20+ min | Expected (NDK compile of every native module per new ABI); later builds are warm again |
| Browser agent cannot attach the AAB/IPA | 10 MB upload cap — Karim drags the file; the agent fills the forms |
| `eas credentials` has no `--non-interactive` | Credential checks are interactive or read off the `eas build` credentials summary |

## 12. Self-improvement

Same rule as `soli-testing`: if anything here was wrong, stale or caused friction, update this skill in place (no changelog prose). History and rationale live in `docs/product/release-automation/release-automation.md`.

## 13. Further reading

- `docs/external-package-guides/google-play-developer-api.md` (Android upload script, service-account setup), `docs/external-package-guides/eas-submit.md` (iOS submit, API-key activation, what stays manual)
- `docs/publishing/ios-release-build.md` (Apple credential story: Individual account, Timo exports cert/profile), `docs/publishing/android-release-build.md` (keystore facts)
- `docs/product/release-automation/release-automation.md` (the 1.1.0 release log, decisions, learnings)
