# iOS release build — moved

The release flow lives in **`.agents/skills/soli-release/SKILL.md`** (bump, notes, `yarn build:ios`, `yarn submit:ios` / Transporter, TestFlight groups). EAS Submit details and the API-key activation steps are in `docs/external-package-guides/eas-submit.md`. This file only keeps the Apple credential story that is not in the skill.

## Why EAS builds with uploaded credentials

The Apple Developer account is an **Individual** account owned by Timo Hegnauer (Account Holder, team `A73YSR4W75`); Karim is Admin in App Store Connect. Individual accounts cannot hand signing rights to team members, so:

1. Timo exports the **distribution certificate** (Keychain Access → "Apple Distribution: Timo Hegnauer" → Export `.p12` + password) and creates/downloads the **App Store provisioning profile** for `ch.karimattia.soli` (developer.apple.com → Profiles → + → App Store Connect → the certificate).
2. Karim uploads both once: `npx eas-cli credentials -p ios` → production → Distribution Certificate → upload `.p12`; Provisioning Profile → upload `.mobileprovision`.
3. `eas build -p ios --profile production` then signs on EAS without an Apple login (answer "No" if it asks to log in; `--non-interactive` skips the question).

Current credentials **expire 2026-12-06** (printed in the `eas build` credentials summary). Certificates last one year — repeat steps 1–2 before the first release after that date. `eas credentials` is interactive only (no `--non-interactive`).

## App Store Connect facts

- App "Apple ID" (`ascAppId`) `6755950876`, bundle id `ch.karimattia.soli`, EAS project `9de7c7ee-2f1d-418d-ad51-eee7ede5d609` (account `karim.attia`).
- TestFlight groups: internal "Testers" (automatic for every build) and external "Testers" (public link; needs "What to Test" + beta review per version — manual).
- App Store Connect API access is not enabled yet; only the Account Holder can enable it (requested from Timo 2026-10-11). Until then: Transporter (Karim's Apple ID) for the IPA.
