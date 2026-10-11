# Release automation — "let's release" flow (beta 1.1.0 first)

Status: 1.1.0 released by hand (2026-10-11) — iOS build 15 on TestFlight (internal auto, external submitted for beta review), Android versionCode 16 on Play open testing ("1.1 Beta", sent for review). Phase 2 (automation) implemented the same evening: `yarn submit:android` (own Play API script, dry-run verified), iOS submit prepared in `eas.json` (inactive until the ASC API key exists), `.agents/skills/soli-release/SKILL.md` written, publishing docs trimmed. Waiting on: the Play service-account key (Karim) and ASC API access (Timo).

## User prompt

> Hey, it's been a while since I released I would like to release the current version to As it's beta version and like a TestFlight version to both app stores? What do I need to do? And how can we automate this as much as possible in the future? Thank you.

> Keep Android local The reason is I'm in a free plan in EAS and I don't have that many builds per month I don't wanna run releases from GitHub or whatever. I think it's just fine if I tell the agent here, hey, let's release it and make both things happen. for play, there's already a track that I had with a previous beta release let's just use like the same one and in claude chrome I'm logged in into both app stores please take care of everything if you can thank you

## Summary

- 2026-10-11: Last release 1.0.0 / build 14 (both stores, 2026-07-09/10). Since then: hints + "no more useful moves" / unwinnable warning (native Rust solver), celebration polish, Android picker fix.
- Prep done this run: `app.json` → 1.1.0 / iOS buildNumber "15" / Android versionCode 15; `package.json` → 1.1.0 (precedent: "1.0 prep" and "minorversionbump" commits bumped it too); `docs/RELEASE-NOTES.md` 1.1.0 entry drafted; `build-android.sh` extended (version sync from app.json, 64-bit-only ABIs with solver guard); `docs/external-package-guides/eas-submit.md` written; cheap gates green (34 suites / 367 tests); EAS: logged in as `karim.attia`, last iOS build 1.0.0 (14) FINISHED 2026-07-09.
- Decisions fixed by Karim: Android stays a local build (EAS free plan), iOS stays on EAS cloud started from this Mac (EAS workers have no Rust toolchain), no CI releases, reuse the existing Play testing track.
- 2026-10-11 (later): the 64-bit-only AAB (versionCode 15) was uploaded to a Play draft; Play Console warned "5,607 device models no longer supported" (29% of phones/tablets, all TVs) vs 1.0.0. Karim decided to add 32-bit solver support instead: `scripts/build-rust-solver.sh` now builds armeabi-v7a + x86 too, `ensure-rust-solver.js` checks six artifacts, `build-android.sh` ships all four ABIs again (guard kept), `app.json` Android versionCode → 16 (iOS stays 15 — the IPA was already uploaded; the two numbers diverge for this release only). Code review found no pointer-width assumptions in lonelybot / the FFI.
- 2026-10-11 (uploads, by hand): iOS build 15 via Transporter + App Store Connect (internal group automatic; external group "Testers" submitted for beta review with a "What to Test" text); Android versionCode 16 dragged into Play Console by Karim (the browser agent's upload cap is 10 MB, the AAB is 121 MB) → Open testing, release "1.1 Beta", en-US notes, saved, Publishing overview → "Send changes for review" (managed publishing OFF).
- 2026-10-11 (Phase 2, sub-agent): Android upload automated with an own Play Developer API script (`scripts/submit-android.js`, `yarn submit:android`, `--dry-run`/`--hold-review`/`--aab`) because `eas submit` cannot set the Play release name or release notes and fastlane would add a Ruby toolchain; release-notes extraction in `scripts/lib/release-notes.js` with 8 unit tests. iOS: `eas.json` got `ascAppId`, `yarn submit:ios` added, activation steps documented (needs Timo's API-key access). Skill `.agents/skills/soli-release/SKILL.md` + AGENTS.md pointer; `docs/publishing/*.md` reduced to pointers + unique facts. Gates green (35 suites / 375 tests). Dry run against today's state printed the exact `tracks.update` payload (versionCode 16, "1.1 Beta", 148-char notes) and flagged the missing service-account key.

## Description

Soli ships to TestFlight (iOS) and a Google Play testing track (Android) a few times a year. The last release was done by hand from two aging docs (`docs/publishing/*.md`). The goal is that Karim says "let's release" and an agent runs the whole thing locally, end to end: gates → bump → release notes → iOS EAS build → Android local AAB → upload both → testers get the build. The output of this plan is (1) the 1.1.0 beta release itself and (2) a release cookbook skill (`.agents/skills/soli-release/SKILL.md`, same style as `soli-testing`) plus the minimum scripting so the flow is repeatable without re-discovering the mechanics every time.

Why this matters: releases are rare, so every detail gets forgotten (which track, where the keystore lives, that `android/` is generated, that the IPA must be downloaded from EAS before Transporter). A written flow makes releases cheap and keeps testers on fresh builds.

## Acceptance Criteria

- `app.json` is the single place to bump the version; a local `yarn build:android` produces an AAB with versionCode 16 (15 for the first, withdrawn 64-bit-only bundle) / versionName 1.1.0 without a clean prebuild; `yarn build:ios` produces an EAS build with the same version (build 15).
- The Android AAB contains the Rust solver `.so` for every ABI it ships (no 32-bit splits without the solver).
- `docs/RELEASE-NOTES.md` has the 1.1.0 entry in the existing format (long list + short "Google Play:" text).
- Both builds are uploaded: TestFlight build 15 visible and assigned to the existing tester group; Play testing track has a new release with the AAB and the short release notes.
- `.agents/skills/soli-release/SKILL.md` exists and is enough for an agent to run the next release from "let's release" with no other context (after the upload-mode decision).

## Possible approaches

### Upload mode

| | (a) API keys + `eas submit` | (b) No keys: Play Console web UI (Chrome) + Transporter |
|---|---|---|
| iOS upload | `yarn build:ios` with `--auto-submit`, or `eas submit -p ios --latest --non-interactive`; `-g <internal group>` and `--what-to-test` assign testers + notes in the same call | download IPA from the EAS build page, drag into Transporter (needs Karim's Apple login in Transporter — agent can only drive it via computer-use), then assign to the tester group in App Store Connect |
| Android upload | `eas submit -p android --path android/app/build/outputs/bundle/release/app-release.aab --non-interactive` (no EAS build used; Submit is included on the Free plan) | agent uploads the AAB via Play Console in the logged-in Chrome (claude-in-chrome), pastes release notes, rolls out to the existing track |
| One-time setup | App Store Connect API key (`.p8` + Key ID + Issuer ID) — needs the Account Holder (Timo) or an Admin; Google Play service-account JSON (Karim can do it: Google Cloud project + invite in Play Console "Users and permissions"); store both outside the repo, reference via `.env` paths or upload once to EAS credentials | none |
| Agent autonomy | fully unattended, scriptable, deterministic | browser/desktop driving; file-upload dialogs and Transporter sign-in may need Karim; slower, more fragile, but zero setup |
| Risk | key handling (keep `.p8`/JSON outside git, like the keystore); `track` enum only covers `internal/alpha/beta/production` — a custom closed track cannot be targeted by `eas submit` | clicking through store UIs can go wrong silently; needs a human check at the end anyway |

Recommendation: ship 1.1.0 with **(b)** now (nothing to wait for), and set up **(a)** for the next release — it is the only way "let's release" becomes unattended. Request the ASC API key from Timo right after this release so it is ready next time. If the existing Play track is a custom closed track (not `internal`/`alpha`/`beta`), keep Android on (b) or move testers to the `internal` track.

Outcome 2026-10-11: 1.1.0 shipped with (b). The Play track is **Open testing** = API track `beta` (no custom-track problem).

### Android upload tool (Phase 2 decision, 2026-10-11)

| | (a) `eas submit -p android --path <aab>` | (b) **own script, Play Developer API (chosen)** | (c) fastlane `supply` |
|---|---|---|---|
| Release name + en-US notes from `docs/RELEASE-NOTES.md` | **No** — eas.json Android submit keys are only `serviceAccountKeyPath`, `track`, `releaseStatus`, `rollout`, `changesNotSentForReview`, `applicationId` (docs.expo.dev/eas/json, eas-cli changelog). Every release would still end in the Console UI | Yes (`TrackRelease.name`, `releaseNotes[{language,text}]`) | Yes (`version_name`, `metadata/android/en-US/changelogs/<versionCode>.txt`) |
| EAS free plan | Submit included, not a build — but the upload goes through EAS servers | not involved | not involved |
| New dependencies | none (eas-cli already used) | none (Node stdlib: `crypto.sign` RS256 JWT + `fetch`) | Ruby + fastlane gem |
| Lines owned | ~6 | ~170 (`scripts/submit-android.js` + `scripts/lib/release-notes.js`) + tests | ~20 Fastfile + metadata tree |
| Safety | — | versionCode + sha256 asserted after upload, before `edits.commit` (nothing consumed on abort); `--dry-run`; retry with `changesNotSentForReview=true` when Play refuses auto-review | similar via `validate_only` |

(b) is the simplest option that meets the release-notes requirement. Guide: `docs/external-package-guides/google-play-developer-api.md`.

### Android version sync

| | Chosen: patch `build.gradle` from app.json in `build-android.sh` | Clean `yarn prebuild:android` before each release |
|---|---|---|
| Pros | incremental Gradle build, no signing-patch dance, 10 lines of bash next to the existing signing patch | guaranteed fresh native project (plugin changes, new modules) |
| Cons | `android/` can drift from app.json in other ways (plugins, icons, splash) — only version is synced | slow cold build; resets `android/app/build.gradle` (signing is re-applied by the script anyway) and `gradle.properties` (config plugin re-injects build-speed props); `android/.gradle` config cache must be dropped |
| When to use | every release | after native/plugin/icon changes (the skill should say: "if app.json plugins, icons, splash or a module changed since the last prebuild, run `yarn prebuild:android` first, then `yarn build:android`") |

### Android ABIs

| | 64-bit only (`arm64-v8a,x86_64`) — tried first, REVERTED 2026-10-11 | Chosen: build 32-bit solver targets too |
|---|---|---|
| Pros | matched what `scripts/build-rust-solver.sh` built at the time; no crash risk; smaller AAB | all devices 1.0.0 supported keep seeing the app; no store regression |
| Cons | Play Console measured the drop as 5,607 device models (29% of phones/tablets, all Android TVs) vs 1.0.0 — "64-bit required since 2019" only means a 64-bit variant must exist, 32-bit devices are still plentiful | two more cargo-ndk targets (`armv7-linux-androideabi`, `i686-linux-android`), ~1 min build, ~1 MB more artifacts, two more ensure-script paths |

## Open questions to the user

1. **Upload mode for 1.1.0**: (b) now, (a) next time — recommended, see table. Alternative: wait for Timo's API key and do (a) immediately (blocks the release on a third party).
2. **Play track**: reuse the existing testing track as decided. Is it one of `internal/alpha/beta`, or a custom closed track? Determines whether `eas submit` can ever target it (mode (a)). Orchestrator is checking in Play Console.
3. **64-bit-only Android** — RESOLVED 2026-10-11: the "small" drop turned out to be 5,607 device models per Play Console, so Karim chose to build the 32-bit solver targets; `build-android.sh` ships all four ABIs again.
4. **Git tag** after both uploads: `git tag v1.1.0` (recommended, cheap history; Karim commits/tags himself per AGENTS.md).
5. **Play review default** for `yarn submit:android` (Phase 2): (i) commit with `changesNotSentForReview=false` — Play reviews and rolls out by itself, one command, same end state as today's manual "Send changes for review" click; the skill requires Karim's OK before running it. (ii) `--hold-review` by default — the agent only uploads, Karim presses "Send changes for review" in the Console. **Recommendation: (i)**, with the go-ahead rule in the skill doing the gating; (ii) stays available as a flag. Trade-off: with (i) a mistaken run reaches testers after Google's review; with (ii) every release costs a Console visit.
6. **Service-account key location**: (i) `~/.config/soli/play-service-account.json` (script default, nothing to configure) or (ii) next to the keystore under `~/kDrive/Projects/Soli/...` with `SOLI_PLAY_SERVICE_ACCOUNT_KEY=<path>` in `.env`. **Recommendation: (ii)** if Karim wants all release secrets in one backed-up place (kDrive), else (i). Both are outside the repo; the env var wins over the default.
7. **ASC API key placement** once Timo enables access: (i) host on EAS via `npx eas-cli credentials -p ios` (nothing in the repo; **recommended**) or (ii) `ascApiKeyPath/Id/IssuerId` in `eas.json` with the `.p8` under `~/.config/soli/`. See `docs/external-package-guides/eas-submit.md`.
8. **Delete `docs/publishing/prod.md`** (now a 4-line redirect) and the `icon-generation.md` neighbour stays. Recommendation: delete `prod.md`; keep the two trimmed release docs (they hold the keystore/Apple-credential facts).

## Dependencies

- eas-cli (via `npx eas-cli`, currently 24.12.1; eas.json requires >= 16.28.0) — guide: `docs/external-package-guides/eas-submit.md`.
- Transporter.app (mode b, iOS). Rust toolchain for the solver artifacts (`scripts/ensure-rust-solver.js`).
- Mode (a) only: App Store Connect API key (Timo/Admin), Google Play service account JSON (Karim).

## UX/UI Considerations

Not applicable (no app UI change). Release-notes wording: plain, user-facing, no hype — matches existing entries.

## Components

Not applicable.

## Related tasks

- `docs/product/hints/hints-and-unwinnable-warning.md` — the headline feature; "Artifacts-in-git decision" explains why iOS must build from this Mac (`.easignore`).
- `docs/product/faster-builds/faster-builds.md` — the `ORG_GRADLE_PROJECT_reactNativeArchitectures` mechanism reused for the AAB.
- `docs/product/yarn-release-improvements/` + `docs/product/ios-build-workflow/` — device build flows (not store builds).
- `docs/publishing/android-release-build.md`, `docs/publishing/ios-release-build.md` — the old manual docs; to be trimmed to pointers once the skill exists.

## Simplification ideas

- No new bump script: the agent edits `app.json` + `package.json` with its editor; `build-android.sh` propagates to Gradle. (A `yarn bump` script would be gold plating for three numbers.)
- No new EAS build profile: `production` already works for both platforms.
- Release notes stay in one markdown file; the agent copies the "Google Play:" block into the Console / TestFlight "What to test".
- The skill, not more scripts, carries the flow — same pattern as `soli-testing`.
- Later: delete `docs/publishing/prod.md` (duplicate of `yarn release`) and shrink the two publishing docs to a short "see skill" pointer with only the keystore/credential facts kept.

## Steps to implement

Phase 0 — prep (this run, sub-agent, 2026-10-11):

- [x] P1. Read AGENTS.md, publishing docs, eas.json, app.json, build-android.sh, .easignore, scripts; confirm `android/` + `ios/` are gitignored/generated and how the version reaches Gradle.
- [x] P2. `docs/external-package-guides/eas-submit.md` (web-verified, date-stamped, "not confirmed" list).
- [x] P3. Bump `app.json` (1.1.0 / "15" / 15) and `package.json` (1.1.0).
- [x] P4. `build-android.sh`: `apply_version_from_app_json` + 64-bit ABI env + post-build solver-per-ABI guard (dry-run of the patch/guard logic verified on a copy and on the July AAB; no build run).
- [x] P5. Draft 1.1.0 in `docs/RELEASE-NOTES.md`.
- [x] P6. Cheap gates: typecheck, lint, jest — all green.
- [x] P7. Read-only EAS checks (whoami, build:list). Credential expiry: not checkable non-interactively (see learnings).

Phase 1 — release 1.1.0 (orchestrator / build sub-agent; never two builds in parallel):

- [x] R1. iOS: `yarn build:ios` (ensure-rust-solver → `eas build -p ios --profile production --non-interactive`), ~15–20 min on EAS; note the build URL/id. Expect appVersion 1.1.0, build 15. — Done 2026-10-11 via `npx eas-cli build … --no-wait` (the yarn script's `npx eas` doesn't resolve, see learnings): build `1e674917-9b05-44d5-b010-1b80b606436b`, https://expo.dev/accounts/karim.attia/projects/soli/builds/1e674917-9b05-44d5-b010-1b80b606436b, FINISHED after ~7 min (queued 22:05, done 22:13 local), appVersion 1.1.0 / appBuildVersion 15, SDK 57, distribution STORE, git `13c8046`. IPA downloaded to `.test-artifacts/release/Soli-1.1.0-15.ipa` (30 MB); Info.plist confirms CFBundleShortVersionString 1.1.0 / CFBundleVersion 15. Metadata JSON: `.test-artifacts/release/eas-build-ios-1e674917.json`. Artifact URL (for Transporter / `eas submit --url`): https://expo.dev/artifacts/eas/Bvpc63HI-kf9zcSBLTdsNHP4IJKtnYIKHOHwG7icD1k.ipa
- [x] R2. Android: `yarn build:android` → `android/app/build/outputs/bundle/release/app-release.aab`; the script prints "Android version: 1.1.0 (versionCode 15)" and "ABI arm64-v8a/x86_64: solver present". If Gradle's configuration cache complains after dependency changes: `cd android && ./gradlew bundleRelease --no-configuration-cache` once. — Done 2026-10-11: BUILD SUCCESSFUL in 4m20s, both lines printed, copy at `.test-artifacts/release/Soli-1.1.0-15.aab` (70 MB), signed with the upload key (CN=Karim Attia, O=Soli App; SHA-256 C0:85:A1:BC:…:DF:36:46). First attempt failed with "SDK location not found" → `ANDROID_HOME` default added to the script (see learnings).
- [x] R2b. Smoke test on the phone (release APK via `yarn release`, same gradle → 1.1.0/15): fresh deal, Hint tap → `libsoli_solver_ffi.so` loaded, `[solver] source=hint status=solved ms=1.3`, amber ring + move animation visible, no crash in logcat. Details under Testing.
- [x] R2c. 32-bit solver + rebuild as versionCode 16 (2026-10-11, after Play's "5,607 devices no longer supported" warning on the 15 draft): `scripts/build-rust-solver.sh` builds armeabi-v7a + x86 too, `ensure-rust-solver.js` lists six artifacts, `build-android.sh` ABI override removed (guard kept), `app.json` versionCode 16. Rust review for 32-bit pitfalls: clean (learnings). `yarn build:android` → BUILD SUCCESSFUL in 21m03s (one-off: first NDK/CMake compile of all RN native modules for the two new ABIs), `Android version: 1.1.0 (versionCode 16)`, `ABI arm64-v8a/armeabi-v7a/x86/x86_64: solver present`, 121,419,122 bytes → `.test-artifacts/release/Soli-1.1.0-16.aab` (the 15 AAB was deleted; IPA 15 kept). Upload key unchanged (SHA-256 `C0:85:A1:BC…DF:36:46`).
- [x] R2d. 32-bit runtime smoke on the Nothing A065 (its `ro.product.cpu.abilist32` = armeabi-v7a): warm `assembleRelease` with `reactNativeArchitectures=armeabi-v7a,arm64-v8a`, `adb install -r --abi armeabi-v7a` → `primaryCpuAbi=armeabi-v7a`; Hint tap → logcat `nativeloader: Load …/lib/armeabi-v7a/libsoli_solver_ffi.so … ok`, `[solver] source=hint status=solved ms=0.3 visited=191 moves=84 stock=23 depth=0` (identical visited/moves to the 64-bit run), amber ring Q♥→K♣ in `.test-artifacts/release/smoke-hint-armeabi-v7a.png`, no FATAL/UnsatisfiedLinkError. Phone reinstalled without `--abi` afterwards → `primaryCpuAbi=arm64-v8a`, versionCode 16.
- [x] R3. Upload iOS (mode b) — done 2026-10-11 by hand: IPA via Transporter, build 15 processed; internal group "Testers" got it automatically; external group "Testers" submitted for beta review with a "What to Test" text.
- [x] R4. Upload Android (mode b) — done 2026-10-11: Karim dragged `Soli-1.1.0-16.aab` into Play Console (agent upload cap 10 MB) → Open testing, release name "1.1 Beta", en-US notes, saved, Publishing overview → "Send changes for review". Managed publishing is OFF.
- [ ] R5. Verify after the reviews: TestFlight external shows 1.1.0 (15) "Testing"; Play open testing shows 16 (1.1.0) available; optional smoke install from TestFlight/Play.
- [ ] R6. Karim: commit the bump + notes, `git tag v1.1.0`.

Phase 2 — make it repeatable (sub-agent, 2026-10-11):

- [x] A1a. Android upload tool decided (table above) and implemented: `scripts/submit-android.js` (`yarn submit:android`, `--dry-run`, `--hold-review`, `--aab <path>`), `scripts/lib/release-notes.js` (+ `parseEnvFile` exported from `scripts/lib/build-tools.js`), `test/unit/scripts/release-notes.test.ts` (8 tests, incl. one against the real RELEASE-NOTES.md + app.json version). Guide `docs/external-package-guides/google-play-developer-api.md`. Dry run verified against today's AAB (see Testing).
- [ ] A1b. Karim: create the Play service account (Google Cloud project → enable "Google Play Android Developer API" → service account → JSON key), invite it in Play Console with "Release apps to testing tracks" + "View app information (read-only)", save the JSON outside the repo (`~/.config/soli/play-service-account.json` or `SOLI_PLAY_SERVICE_ACCOUNT_KEY` in `.env`), then `yarn submit:android --dry-run`. First live run on the next release.
- [x] A1c. iOS prepared, inactive: `eas.json` `submit.production.ios.ascAppId = "6755950876"`, `yarn submit:ios` script; activation steps (host the key on EAS via `eas credentials`, or the three `ascApiKey*` fields) in `docs/external-package-guides/eas-submit.md`. Blocked on Timo enabling App Store Connect API access.
- [x] A2. `.agents/skills/soli-release/SKILL.md` written (frontmatter like soli-testing; pre-flight, bump rules 17/17 next, notes + approval, gates, builds with expected log lines, smoke pointer, uploads in API + manual mode, testers, go-ahead rules, troubleshooting). AGENTS.md got the pointer + the store-release command line.
- [x] A3. `docs/publishing/android-release-build.md` and `ios-release-build.md` replaced by pointers + the unique facts (keystore, Play ids; Apple Individual-account credential story, ASC ids); `prod.md` is a redirect — deletion proposed to Karim (not deleted by the agent).
- [ ] A4. Optional: mirror `apply_version_from_app_json` into `run-android-release.sh` so device builds also carry the app.json version (today `yarn release` keeps whatever `android/` has — harmless for testing, but installing a lower versionCode over a Play build fails).
- [ ] A5. First live `yarn submit:android` (next release) — confirm the plain commit is accepted on the open-testing track (or that the `changesNotSentForReview` retry kicks in) and that Node's fetch copes with the 120 MB upload; then remove the two "not confirmed" items from the Play guide.

## Plan: Files to modify

- `app.json`, `package.json` — version bump.
- `build-android.sh` — version sync, ABI env, guard.
- `docs/RELEASE-NOTES.md` — 1.1.0 entry.
- `docs/external-package-guides/eas-submit.md` — new.
- `docs/product/release-automation/release-automation.md` — this plan.
- Phase 2: `.agents/skills/soli-release/SKILL.md` (new), `eas.json` (mode a), `docs/publishing/*.md` (trim), `run-android-release.sh` (optional).

## Files actually modified

- `app.json` — `version` 1.0.0 → 1.1.0, `ios.buildNumber` "14" → "15", `android.versionCode` 14 → 15.
- `package.json` — `version` 1.0.0 → 1.1.0.
- `build-android.sh` — new `apply_version_from_app_json()` (called after the signing patch), `export ORG_GRADLE_PROJECT_reactNativeArchitectures="arm64-v8a,x86_64"` before Gradle, post-build loop asserting `libsoli_solver_ffi.so` per ABI in the AAB; inline comments explain all three decisions.
- `docs/RELEASE-NOTES.md` — 1.1.0 — 2026-10-11 entry (long list + Google Play text).
- `docs/external-package-guides/eas-submit.md` — new guide.
- `docs/product/release-automation/release-automation.md` — new plan.
- `build-android.sh` (build run, 2026-10-11) — `export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"` before Gradle (agent shells don't source `~/.zshrc`).
- `run-android-release.sh` (build run) — same `ANDROID_HOME` default before the Node build entry, for the same reason.
- `android/app/build.gradle` (generated, gitignored) — now patched to 15 / "1.1.0" by `build-android.sh`.
- Not touched: `eas.json`, `ios/`, `package.json` `build:ios` (broken `npx eas`, see learnings — fix pending orchestrator decision).
- 32-bit round (2026-10-11, later):
  - `scripts/build-rust-solver.sh` — rustup targets `armv7-linux-androideabi` + `i686-linux-android`, `cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86`, comment with the why.
  - `scripts/ensure-rust-solver.js` — `ARTIFACT_PATHS` gains the `armeabi-v7a` and `x86` `.so`; help text no longer says "four targets".
  - `build-android.sh` — `ORG_GRADLE_PROJECT_reactNativeArchitectures` export removed, replaced by a history comment; per-ABI guard unchanged.
  - `app.json` — `android.versionCode` 15 → 16 (`ios.buildNumber` stays "15").
  - `docs/external-package-guides/rust-mobile.md` — "decide at implementation time" → the four-ABI decision; `docs/product/hints/hints-and-unwinnable-warning.md` — toolchain/cargo-ndk lines list all four ABIs.
  - Generated/gitignored: `modules/soli-solver/android/src/main/jniLibs/{armeabi-v7a,x86}/libsoli_solver_ffi.so` (350 K / 562 K; arm64-v8a 518 K, x86_64 564 K), `.artifacts-fingerprint.json` rewritten, `android/app/build.gradle` → versionCode 16.
- Phase 2 (2026-10-11, later):
  - `scripts/submit-android.js` — new: Play Developer API upload (JWT auth, edits.insert → bundles.upload → tracks.update → edits.commit), `--dry-run`/`--hold-review`/`--aab`, versionCode + sha256 assertions before commit, retry with `changesNotSentForReview=true`.
  - `scripts/lib/release-notes.js` — new: `extractPlayReleaseNotes`, `playReleaseName`, `PLAY_RELEASE_NOTES_MAX_CHARS`.
  - `scripts/lib/build-tools.js` — `parseEnvFile` added to the exports (reused by the submit script, no new parser).
  - `test/unit/scripts/release-notes.test.ts` — new (8 tests).
  - `package.json` — scripts `submit:android`, `submit:ios`.
  - `eas.json` — `submit.production.ios.ascAppId`.
  - `docs/external-package-guides/google-play-developer-api.md` — new guide (sources, decision table, auth, four calls, `changesNotSentForReview`, limits, one-time setup, not-confirmed list).
  - `docs/external-package-guides/eas-submit.md` — Android section ("not used, why"), iOS activation options A/B, what stays manual (external group, What to Test).
  - `.agents/skills/soli-release/SKILL.md` — new.
  - `AGENTS.md` — pointer to the release skill + store-release command line under Testing → Commands.
  - `docs/publishing/android-release-build.md`, `ios-release-build.md`, `prod.md` — bodies replaced by pointers + unique facts (prod.md: redirect only, delete proposed).
  - `docs/product/release-automation/release-automation.md` — this plan.

## Intermediary learnings

- `android/` and `ios/` are fully gitignored (`/android`, `/ios` in .gitignore; `git ls-files android ios` is empty). `android/app/build.gradle` is generated by `expo prebuild` and was last generated 2026-07-04; the only release-relevant lines are `versionCode`/`versionName` in `defaultConfig` (lines 95–96). Nothing in the repo synced them before — the last release relied on a prebuild or hand edit.
- `build-android.sh` and `run-android-release.sh` both carry an identical `apply_release_signing_patch` (perl on the generated gradle file); the keystore lives OUTSIDE the repo (`SOLI_UPLOAD_STORE_FILE` points into `~/kDrive/Projects/Soli/...`, file present, 2025-11-29), so a clean prebuild never deletes it. `.env` has all four `SOLI_UPLOAD_*` keys.
- The RN Gradle plugin reads the `reactNativeArchitectures` property (`PropertyUtils.kt`) and env `ORG_GRADLE_PROJECT_reactNativeArchitectures` overrides `gradle.properties` (already proven by `yarn release`, faster-builds plan). `android/app/build.gradle` itself has no `abiFilters` line.
- 32-bit risk found: `gradle.properties` lists `armeabi-v7a,arm64-v8a,x86,x86_64` but the solver `.so` exists only for `arm64-v8a` and `x86_64`. The 1.0.0 AAB (built 2026-07-09, before the solver landed) ships all four ABIs; a 1.1.0 AAB built the same way would crash on 32-bit-only devices in `System.loadLibrary("soli_solver_ffi")`. Dry run of the new guard against the old AAB correctly reports "solver MISSING" for every ABI.
- `package.json` `version` has always moved with releases ("minorversionbump" 0.8.0, "1.0 prep") — bumped again for consistency; it has no runtime effect (Expo reads `app.json`).
- `eas credentials` has no `--non-interactive` flag ("Nonexistent flag"), and `eas build:list --json` carries no credential data, so certificate/profile expiry could not be checked from the CLI. The EAS project credentials page (expo.dev → account karim.attia → project soli → Credentials → iOS) shows expiry dates in the browser; the 2026-07-09 build used them successfully. Per `docs/publishing/ios-release-build.md` Apple certs last one year — if the current ones were uploaded around the first release (2025-11), they may expire around 2025-11 + 1y = late 2026; worth reading off the page before building.
- `eas-cli` 24.12.1 CLI flags verified locally: `submit --path/--latest/--id/--url/-g/--what-to-test/--non-interactive`, `build -s/--auto-submit/--auto-submit-with-profile`. Free plan: 15 iOS + 15 Android builds/month, Submit included.
- Last five EAS builds are all iOS/production/FINISHED: 1.0.0 (14) 2026-07-09, 0.8.0 (13) 2026-06-11, 0.7.0 (12) 2026-04-28, 0.6.0 (11), 0.5.0 (10). No Android EAS builds — consistent with the local-AAB policy.
- macOS has no `timeout` binary; `perl -e 'alarm N; exec @ARGV' cmd` works as a cap for probing interactive CLIs.
- Build run 2026-10-11:
  - `yarn build:ios` is broken as written: `npx eas` → "npm error could not determine executable to run" (the npm package `eas` is not the CLI). `npx eas-cli build ...` (24.12.1) works. Change the script to `npx eas-cli` (or add `eas-cli` as a devDependency). No quota was consumed by the failed invocation.
  - `eas build --no-wait` prints the credential summary even non-interactively: distribution certificate serial 764D5DFF…E74E and provisioning profile both expire **2026-12-06** — the next release after early December needs new credentials (Timo/Account Holder flow, `docs/publishing/ios-release-build.md`). This answers open question "credential expiry" without the browser.
  - EAS warns `cli.appVersionSource` is unset ("will be required in the future"); add `"appVersionSource": "local"` to `eas.json` `cli` to keep app.json as the source (A2 skill prep).
  - Agent (non-interactive) shells don't source `~/.zshrc`, so `ANDROID_HOME` is unset and Gradle fails in 9 s with "SDK location not found" (`android/local.properties` doesn't exist). Both scripts now default it to `~/Library/Android/sdk`, like `scripts/build-rust-solver.sh` already did.
  - Gradle 9.3.1 stores the configuration cache "with 5 problems" (node processes started in `app/build.gradle`) — harmless, build succeeds; `bundleRelease` took 4m20s warm with a fresh daemon.
  - `yarn release` after `yarn build:android` reuses the patched `build.gradle`, so the device APK carried 1.1.0 (15) without A4 — but only because the AAB was built first in the same `android/`.
  - Yarn Berry has no `-s` flag; `yarn -s agent-device …` prints Yarn's help instead of running the CLI.
  - `scripts/android-ready.sh` creates `/tmp/android-device.lock` as `soli:karim:<ts>` itself — don't create a second one; remove it when done.
- 32-bit round (2026-10-11, later):
  - Play Console compares the new bundle's device coverage with the live release; dropping armeabi-v7a/x86 cost 5,607 device models (29% of phones/tablets, all Android TVs). "64-bit required since 2019" only obliges a 64-bit variant; 32-bit devices are still a large share.
  - Rust 32-bit review (lonelybot + soli-solver-ffi): no `cfg(target_pointer_width)`, no `usize` bitboards — `Encode`, card masks, `full_mask`, the fasthash `mix` and `MixHasher` are all explicit `u64`; `Deck::mask` is `u32` (24 bits), `Stack` is `u16`, `Hidden::encode` is `u16`, the KS/Green RNGs are `u32`/`i32`. `usize` only indexes ≤ 52-element arrays or counts ply/moves (`N_PLY_MAX` 1024). Transposition table is `hashbrown::HashSet<u64>` — unbounded on both widths, time-capped by the 1.5 s budget (hashbrown truncates the u64 hash to 32-bit buckets on 32-bit targets, which is by design). `AtomicU64` visit counter is supported on armv7 (ldrexd) and i686 (cmpxchg8b). The 4 MiB solve-thread stack is fine in a 32-bit address space. Conclusion: no code change needed; the on-device 32-bit result (visited=191, moves=84) matched 64-bit exactly.
  - `cargo test` at the workspace root fails to COMPILE the vendored lonelybot's own `#[cfg(test)]` module (`vendor/lonelybot/src/deck.rs:394` uses `rng.random_range`/`random_bool` on `SmallRng` — rand 0.10 API drift; unused `Rng` import). Pre-existing, untouched by this change, and never part of the gates: the hints plan always ran `cargo test -p soli-solver-ffi` (19 tests, green). Fix or `#[ignore]` it in a vendoring refresh, not here.
  - Adding ABIs to a warm `android/` tree is NOT a warm build: every RN/Expo native module runs its CMake/NDK compile for the new ABIs once (21 min vs 4m20s). Subsequent builds are warm again (`assembleRelease` right after took 24 s).
  - cargo-ndk's 16 KB page-size alignment applies to the 64-bit `.so` only (`0x4000`); the 32-bit ones stay `0x1000`, which is what Play requires.
  - `keytool -printcert -jarfile` prints nothing for the release APK (APK Signature Scheme v2+, no JAR signature) but works on the AAB. For an APK, a successful `adb install -r` over the installed app is the practical same-key proof.
  - `adb install -r --abi armeabi-v7a <apk with both ABIs>` turns a 64-bit-capable phone into a 32-bit test device (`primaryCpuAbi=armeabi-v7a`) without wiping data; reinstalling the same APK without `--abi` switches back. The Nothing A065 still has `abilist32=armeabi-v7a,armeabi`.
  - `scripts/android-ready.sh` reported "LOCKED" although `dumpsys window` showed `isKeyguardShowing=false` and Soli resumed — trust dumpsys/screenshot over the script's summary line in that case.
- Phase 2 (2026-10-11, later):
  - `eas submit` Android really has no release-name/notes option: the eas.json schema lists six Android keys, and the eas-cli CHANGELOG's only notes-related additions are `--what-to-test` (submit + build, iOS) and `groups` (iOS internal). `changesNotSentForReview` was added for Android submissions long ago; that is the only review-related control.
  - Play API track names: Console "Open testing" = `beta` (developers.google.com/android-publisher/tracks), "Production" = `production`; closed tracks carry their custom names. The tracks page as fetched labelled internal testing `qa` while eas-cli/fastlane use `internal` — unresolved, irrelevant for Soli.
  - `changesNotSentForReview` is documented for the "after a rejection" case, but the Expo forum shows Google also refusing plain commits with "set changesNotSentForReview to true" (unapproved apps / other pending changes). The script defaults to `false` (= today's manual "Send changes for review") and retries with `true` on that exact error.
  - fastlane `supply` maps `version_name` straight to `TrackRelease.name` and reads notes from `metadata/android/<locale>/changelogs/<versionCode>.txt` — proof that the API fields are the right ones; no Ruby needed to use them.
  - Play's release-notes limit is "500 Unicode characters per language" (Console help); the script counts code points (`[...text].length`), not UTF-16 units.
  - Node 26's `crypto.sign('RSA-SHA256', data, pemPrivateKey)` + `Buffer.toString('base64url')` cover the service-account JWT with zero dependencies; `fetch` takes a 121 MB `Buffer` body (memory, not streaming — fine at this size). Default undici timeouts are the one unverified risk (A5).
  - A `.ts` jest test can `require()` a CommonJS file from `scripts/` even with `allowJs: false` — `noImplicitAny: false` in tsconfig keeps the untyped import legal, and jest-expo transforms it. First test under `test/unit/scripts/`.
  - zsh has no `PIPESTATUS` (it is `pipestatus`), and a bare `=====` echo argument is an `=cmd` expansion error — cost two reruns of shell checks this session.
  - Browser-agent file uploads cap at 10 MB; the 121 MB AAB (and the 30 MB IPA) must be dragged by Karim or go through an API. This is the whole reason for the Play API script.

- Play service account activated 2026-10-11 (orchestrator): Google Cloud project `soli-play`, API enabled, service account `soli-release@soli-play.iam.gserviceaccount.com`, invited in Play Console by Karim (app Soli, all tracks incl. production — his choice). Key lives on kDrive next to the upload keystore (`~/kDrive/Projects/Soli/Soli keystore more files/play-service-account.json`, synced), path set via `SOLI_PLAY_SERVICE_ACCOUNT_KEY` in `.env` — NOT the `~/.config/soli` default (Karim wants it backed up). Verified read-only against the API (edit insert → tracks list → edit delete): production 14, beta "1.1 Beta" 16. `yarn submit:android --dry-run` finds the key. A real upload is still untested (first real run = next release).

## Identified issues

- [handled, revised] 32-bit ABI splits without the solver — first handled by shipping 64-bit only (versionCode 15); after Play's "5,607 devices no longer supported" warning the solver is now built for all four ABIs and the bundle ships all four again (versionCode 16). The per-ABI guard in `build-android.sh` stays as the invariant.
- [note] iOS buildNumber 15 vs Android versionCode 16 for 1.1.0 — Play consumed 15 with the draft upload of the 64-bit-only bundle; the iOS 15 build was already uploaded, so only Android moved. Next release: bump both to 17 (or 16/17 → keep moving together from there) — the skill should say "both numbers move together unless one store already consumed a number".
- [answered] iOS distribution certificate / provisioning profile expire 2026-12-06 (printed by `eas build` itself, see learnings) — renew before the first release after that date.
- [fixed] `package.json` `build:ios` now uses `npx eas-cli`.
- [fixed] `eas.json` has `cli.appVersionSource: "local"`.
- [moot] `eas submit` `track` enum vs custom closed track — Soli's track is open testing (`beta`) and Android uses the own script anyway.
- [open] `yarn release` (device build) does not sync the version (A4).
- [open] Play service-account key does not exist yet (A1b) — `yarn submit:android` fails with a clear message until then; `--dry-run` works.
- [open] App Store Connect API access not enabled (Timo) — `yarn submit:ios` fails non-interactively ("API keys cannot be set up in --non-interactive mode") until the key is hosted on EAS or put in eas.json.
- [open] `yarn submit:android` live path untested (A5): plain-commit acceptance on open testing, undici timeouts for the 121 MB upload.

## Testing

- Cheap gates 2026-10-11: `yarn typecheck` ✓, `yarn lint` ✓, `yarn jest` ✓ (34 suites, 367 tests, 3.8 s).
- `bash -n build-android.sh` ✓. Version-sync perl + rg verification run on a COPY of `android/app/build.gradle` → 15 / "1.1.0" ✓ (real file untouched). ABI guard loop run against the July AAB → lists `arm64-v8a, armeabi-v7a, x86, x86_64` all "solver MISSING" (expected for a pre-solver bundle) ✓.
- Build run 2026-10-11 (sub-agent):
  - `yarn build:android` (after the `ANDROID_HOME` fix): BUILD SUCCESSFUL in 4m20s; log lines `Android version: 1.1.0 (versionCode 15)`, `ABI arm64-v8a: solver present`, `ABI x86_64: solver present`. AAB 72,990,012 bytes (70 MB) → `.test-artifacts/release/Soli-1.1.0-15.aab`. `unzip -Z1`: only `base/lib/arm64-v8a` and `base/lib/x86_64` (26 libs each, incl. `libsoli_solver_ffi.so`). `keytool -printcert -jarfile`: Owner `CN=Karim Attia, OU=Development, O=Soli App, L=Zurich, ST=Zurich, C=CH`, valid 2025-11-29 → 2053-04-16, SHA-256 `C0:85:A1:BC:51:F4:C7:F5:BF:E8:8C:DA:A0:36:A1:51:1A:4E:DD:A4:21:C4:C0:F0:D6:61:EB:8D:27:DF:36:46` (upload key, not the debug key). Full log: `.test-artifacts/release/build-android-1.1.0-15.log`.
  - Smoke test on the Nothing A065 (192.168.1.12:5555, wireless adb): `yarn release` → installed versionCode 15 / versionName 1.1.0 (dumpsys), launched. Deep links `?set=hintButton:on,warnings:stuck` and `?reset=game` → `[Game] New game dealt { reason: 'deepLink-reset' }`, a11y tree shows 7 columns, `Stock, 23 cards`, empty foundations, `Hint` button. Tap Hint → logcat: `nativeloader: Load …/lib/arm64-v8a/libsoli_solver_ffi.so … ok`, `[solver] source=hint status=solved ms=1.3 visited=191 moves=84 stock=23 depth=0`; screenshot `.test-artifacts/release/smoke-hint.png` shows the amber ring on Q♥ (column 4) animating onto K♣ (column 5). No FATAL/UnsatisfiedLinkError/SIGSEGV in logcat; MainActivity still resumed. ~3 min total.
  - Side effect on Karim's phone: one in-progress game was recorded as incomplete by `?reset=game`, and the settings now have the Hint button ON + warning mode "stuck" (previous values unknown — Karim may want to flip them back).
- 32-bit round 2026-10-11 (sub-agent):
  - `./scripts/build-rust-solver.sh` ✓ (two new rustup targets installed; four `.so` + xcframework). `cargo test -p soli-solver-ffi` ✓ 3 + 16 tests. `llvm-nm -D --defined-only` shows `Java_expo_modules_solisolver_SoliSolverJni_nativeSolve`, `soli_solver_solve`, `soli_solver_free_string` in all four `.so`; `file` confirms ELF 32-bit ARM EABI5 / Intel 80386 for the new pair.
  - `yarn build:android` ✓ (log `.test-artifacts/release/build-android-1.1.0-16.log`): versionCode 16, four "solver present" lines, `unzip -Z1` → `base/lib/{arm64-v8a,armeabi-v7a,x86,x86_64}` with 26 libs each incl. `libsoli_solver_ffi.so`; `keytool -printcert -jarfile` → upload key SHA-256 `C0:85:A1:BC:51:F4:C7:F5:BF:E8:8C:DA:A0:36:A1:51:1A:4E:DD:A4:21:C4:C0:F0:D6:61:EB:8D:27:DF:36:46`. AAB 121 MB (was 70 MB with two ABIs; Play serves per-ABI splits so installs don't grow).
  - 32-bit on-device smoke (R2d above) ✓ — the only runtime check that was feasible without downloading a 32-bit emulator image (only an arm64-v8a API 36 AVD exists). x86 (32-bit Intel) is compile- and symbol-verified only.
  - Cheap gates: `yarn typecheck` ✓, `yarn lint` ✓, `yarn jest --ci` ✓ 34 suites / 367 tests.
  - Side effect on Karim's phone: now runs versionCode 16 (arm64-v8a) instead of 15; the game in progress at the time was a fresh deal and received one hint move.
- Phase 2 2026-10-11 (sub-agent, no builds, no store calls):
  - `yarn jest --ci test/unit/scripts` ✓ 8/8; full gates `yarn typecheck` ✓, `yarn lint` ✓, `yarn jest --ci` ✓ 35 suites / 375 tests; `yarn oxfmt --check` on the new/edited files ✓.
  - `node scripts/submit-android.js --dry-run` against today's state (default AAB path = the versionCode 16 bundle, 121.4 MB, sha256 `87b0a0f2…0b36fd`, identical to `.test-artifacts/release/Soli-1.1.0-16.aab`): printed package `ch.karimattia.soli`, `1.1.0 (versionCode 16)`, track `beta` status `completed`, review "sent automatically on commit", service key `~/.config/soli/play-service-account.json` MISSING, and the `tracks.update` body `{track: "beta", releases: [{name: "1.1 Beta", versionCodes: ["16"], status: "completed", releaseNotes: [{language: "en-US", text: "Soli 1.1 adds hints!\n\n- New Hint button (off by default, turn it on in the settings)\n- New warning when there are no more useful moves\n- Small fixes and polish\n\nHappy playing!"}]}]}`; exit 0 with "A real run would FAIL: service-account key missing".
  - Failure paths: real run without key → exit 1 with the `SOLI_PLAY_SERVICE_ACCOUNT_KEY` instruction; `--aab /nope.aab` → "AAB not found … run `yarn build:android` first"; `--bogus` → "Unknown argument" + usage; `--help` prints usage; `--hold-review` shows "HELD (changesNotSentForReview=true)".

## Follow-ups

- Play service-account key (A1b, Karim, ~15 min) — unlocks `yarn submit:android`; the only remaining manual step on Android becomes nothing. Recommended now.
- ASC API key on EAS (A1c, Timo then Karim) — unlocks `yarn submit:ios`/`--auto-submit`; the external TestFlight group + beta review stay manual regardless. Recommended when Timo answers.
- A4 version sync in `run-android-release.sh` — pros: device builds match store versionCode; cons: 10 duplicated lines (or extract both scripts' shared patch functions into `scripts/lib/`). Still optional.
- Delete `docs/publishing/prod.md` (now a redirect) — recommended; the other two publishing docs keep the keystore/Apple facts and should stay.
- `yarn submit:android` could read the versionCode out of the AAB itself (bundletool / protobuf manifest) to catch a stale bundle before uploading 120 MB — pros: earlier failure; cons: bundletool dependency or a protobuf parser for one check, and the post-upload assertion already prevents a wrong commit. Not recommended.
- iOS "What to Test" for the external group via the App Store Connect API directly (same JWT pattern as the Play script, ES256) — pros: the last manual TestFlight step disappears; cons: ~100 more lines and the beta-review submission is exactly the step Karim wants to approve anyway. Not recommended for now.
- ~~32-bit solver targets — only if Play Console shows a meaningful number of affected devices~~ — done 2026-10-11 (it did: 5,607 models).
