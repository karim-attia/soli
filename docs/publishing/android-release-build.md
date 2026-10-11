# Android release build — moved

The release flow lives in **`.agents/skills/soli-release/SKILL.md`** (bump, notes, `yarn build:android`, `yarn submit:android`, Play Console fallback). The Play API details are in `docs/external-package-guides/google-play-developer-api.md`. This file only keeps the facts that are not in the skill.

## Keystore facts

- Upload keystore: `SOLI_UPLOAD_STORE_FILE` in `.env` points OUTSIDE the repo (`~/kDrive/Projects/Soli/...`); `.gitignore` also blocks `*.jks`/`*.keystore`/`.env`. Passwords and alias: `SOLI_UPLOAD_STORE_PASSWORD`, `SOLI_UPLOAD_KEY_ALIAS`, `SOLI_UPLOAD_KEY_PASSWORD` (same `.env`).
- `build-android.sh` and `run-android-release.sh` patch the generated `android/app/build.gradle` (gitignored, from `expo prebuild`) so `signingConfigs.release` reads those env vars and `buildTypes.release` uses it; the debug keystore stays as a fallback for `expo run:android`.
- Certificate: `CN=Karim Attia, OU=Development, O=Soli App, L=Zurich, ST=Zurich, C=CH`, valid 2025-11-29 → 2053-04-16, SHA-256 `C0:85:A1:BC:…:DF:36:46`. Verify an AAB with `keytool -printcert -jarfile app-release.aab` (`jarsigner`/`keytool` print nothing for a v2+-signed APK).
- Losing the keystore means no more updates under this Play listing — keep the backup outside the repo.

## Play Console facts

- Developer account `5772991807588369431`, app id `4974901385199648938`, package `ch.karimattia.soli`, testers on **Open testing** (API track `beta`), managed publishing OFF.
- Play consumes a versionCode as soon as a release containing it is saved in the Console (even a later-discarded draft); the API consumes nothing before `edits.commit`.
