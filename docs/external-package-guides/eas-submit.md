# EAS Submit (eas-cli) — usage guide

Date-stamped: 2026-10-11. eas-cli checked locally: 24.12.1 (`npx eas-cli submit --help`, `npx eas-cli build --help`). Project: `ch.karimattia.soli`, EAS project `9de7c7ee-2f1d-418d-ad51-eee7ede5d609`, account `karim.attia`.

Sources:

- EAS Submit intro: https://docs.expo.dev/submit/introduction/
- iOS: https://docs.expo.dev/submit/ios/
- Android: https://docs.expo.dev/submit/android/
- Submit profiles in eas.json: https://docs.expo.dev/submit/eas-json/
- eas.json schema (submit section): https://docs.expo.dev/eas/json/#eas-submit
- Billing FAQ: https://docs.expo.dev/billing/faq/ · Pricing: https://expo.dev/pricing
- Forum threads used for non-interactive behaviour: https://forums.expo.dev/t/app-store-connect-api-keys-cannot-be-set-up-in-non-interactive-mode/62672 · https://forums.expo.dev/t/eas-submit-p-ios-does-not-use-uploaded-app-store-connect-api-key/70791 · https://forums.expo.dev/t/does-local-eas-build-also-count-as-a-part-of-paid-services/73900

## What it is

`eas submit` uploads an `.ipa` to App Store Connect (TestFlight) or an `.aab` to Google Play. The upload itself runs on EAS servers (they call fastlane/Google APIs with credentials you hand to them), so the local machine only pushes the binary (or an EAS build id/URL).

## CLI flags (verified against eas-cli 24.12.1 `--help`)

```
eas submit [-p android|ios|all] [-e <profile>]
           [--latest | --id <buildId> | --path <file> | --url <url>]
           [--what-to-test <text>] [-g <group>...] [--[no-]wait]
           [--non-interactive] [--verbose] [--verbose-fastlane]
           [--[no-]auto-testflight-setup]
```

- `--path <file>`: submit a LOCAL `.apk/.aab/.ipa` — this is how a locally built AAB goes to Play without an EAS build.
- `--latest`: submit the latest EAS build for the platform (what we use for iOS, which is built on EAS).
- `-e/--profile`: submit profile name from `eas.json`; defaults to `production` when it exists.
- `-g/--groups`: TestFlight INTERNAL group names to add the build to (iOS). `--what-to-test`: TestFlight "What to test" text.
- `eas build ... --auto-submit` (`-s`): submit on build completion using the submit profile with the same name as the build profile; `--auto-submit-with-profile NAME` picks another one.
- Aliases: `eas build:submit`. Also `submit:list`, `submit:status` (live version + TestFlight builds), `submit:view`, `submit:retry`, `submit:cancel`.

## eas.json submit profile (schema from docs.expo.dev/eas/json)

Android:

| key | type | meaning |
|---|---|---|
| `serviceAccountKeyPath` | string | path to the Google Service Account JSON. If omitted, EAS uses the key uploaded to EAS credentials for this app |
| `track` | `production` \| `beta` \| `alpha` \| `internal` | Play track. (Custom closed tracks cannot be named here — only these four) |
| `releaseStatus` | `completed` \| `draft` \| `halted` \| `inProgress` | `draft` = upload only, finish in Play Console |
| `rollout` | number 0–1 | staged rollout fraction, only with `inProgress` |
| `changesNotSentForReview` | boolean, default false | do not auto-send for review |
| `applicationId` | string | only needed with product flavors |

iOS:

| key | type | meaning |
|---|---|---|
| `ascAppId` | string | App Store Connect "Apple ID" number of the app (App Information → General). When set, the app-creation step is skipped — required for `--non-interactive` |
| `appleTeamId` | string | Developer team id (ours: `A73YSR4W75`, already in eas.json) |
| `ascApiKeyPath` | string | path to the `.p8` App Store Connect API key |
| `ascApiKeyIssuerId` | string | Issuer ID of that key |
| `ascApiKeyId` | string | Key ID of that key |
| `appleId` | string | Apple ID login for the app-specific-password route (password via env `EXPO_APPLE_APP_SPECIFIC_PASSWORD`) — alternative to the API key |
| `groups` | string[] | TestFlight internal groups to add the build to |
| `sku`, `language`, `companyName`, `appName`, `bundleIdentifier`, `metadataPath` | | first-submission / store-config extras, not needed for TestFlight |

Example (what Soli would use for mode (a) — keys stored OUTSIDE the repo, paths via env):

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleTeamId": "A73YSR4W75",
        "ascAppId": "<App Store Connect Apple ID number of Soli>",
        "ascApiKeyPath": "$SOLI_ASC_API_KEY_PATH",
        "ascApiKeyId": "$SOLI_ASC_API_KEY_ID",
        "ascApiKeyIssuerId": "$SOLI_ASC_API_KEY_ISSUER_ID"
      },
      "android": {
        "serviceAccountKeyPath": "$SOLI_PLAY_SERVICE_ACCOUNT_JSON",
        "track": "internal",
        "releaseStatus": "completed"
      }
    }
  }
}
```

The schema says `serviceAccountKeyPath` allows environment variables; for the iOS key fields the docs do not say so explicitly (see "Not confirmed"). The safer alternative is to upload both keys to EAS once (`eas credentials -p ios` → "App Store Connect: Manage your API Key"; `eas credentials -p android` → service account for submissions) and leave the `*KeyPath`/`*KeyId` fields out — then `--non-interactive` uses the hosted keys.

## Commands we would run

```bash
# iOS (build on EAS, then submit the latest EAS build to TestFlight)
npx eas-cli submit -p ios --latest --non-interactive --what-to-test "1.1.0: hints + no-more-moves warning" -g "Internal"
# ...or in one go:
npx eas-cli build -p ios --profile production --non-interactive --auto-submit

# Android (LOCAL AAB, no EAS build)
npx eas-cli submit -p android --path android/app/build/outputs/bundle/release/app-release.aab --non-interactive
```

## Non-interactive behaviour (important for an agent-run flow)

- iOS: `--non-interactive` fails with "App Store Connect API keys cannot be set up in --non-interactive mode" if no key is known. Either run `eas credentials -p ios` once interactively to store the key on EAS, or put `ascApiKeyPath/Id/IssuerId` in the profile. `ascAppId` must be set in the profile (otherwise non-interactive cannot create/find the app).
- Android: with `--non-interactive`, EAS uses the service-account key assigned to the app on EAS unless `serviceAccountKeyPath` is set; with neither, it fails with "Google Service Account Keys cannot be set up in --non-interactive mode".
- Google: the service account must be invited in Play Console (Users and permissions) with release permissions for the app. The Play docs page describes the first submission as possible via `eas submit` (track `internal`, stays draft until the listing is complete); Soli already has releases, so no first-upload concern.
- Login: `EXPO_TOKEN` (personal access token) makes eas-cli non-interactive in CI. On this Mac `npx eas-cli whoami` already reports `karim.attia`, so no token is needed.

## Quota / billing

- Pricing page: Free plan "Up to 15 Android and 15 iOS builds" (monthly) and "Submit to app stores" is included on Free; no cap on submissions is stated.
- Local builds do not count against the build allocation (Expo forum answer; the billing FAQ recommends local builds once the quota is used, which implies the same).

## Android: NOT used for Soli (decision 2026-10-11)

Re-verified 2026-10-11 against https://docs.expo.dev/eas/json/ and the eas-cli CHANGELOG: the Android submit profile has **no key for the Play release name or release notes** (only `serviceAccountKeyPath`, `track`, `releaseStatus`, `rollout`, `changesNotSentForReview`, `applicationId`; the only notes-like option ever added is `--what-to-test`, iOS only). Karim wants the "Google Play:" text of `docs/RELEASE-NOTES.md` in every Play release, so the Android upload is done by `yarn submit:android` (`scripts/submit-android.js`, direct Play Developer API) — see `docs/external-package-guides/google-play-developer-api.md`. The `android` submit profile is therefore deliberately absent from `eas.json`. Soli's Play testers are on the Console's **Open testing** track, which the API (and this enum) call `beta`.

## iOS: prepared, inactive until an App Store Connect API key exists

`eas.json` `submit.production.ios` already has `appleTeamId` and `ascAppId` (`6755950876`, the App Store Connect "Apple ID" of Soli), so `--non-interactive` can find the app. What is still missing is the API key — App Store Connect API access is not enabled for the team yet; only the Account Holder (Timo) can enable it. Once it exists, the three values (`.p8` file, Key ID, Issuer ID) go to ONE of these places:

| Option | Where the three values go | Pros / cons |
|---|---|---|
| **A (recommended): host on EAS** | `npx eas-cli credentials -p ios` → production → "App Store Connect: Manage your API Key" → "Set up your project to use an API Key for EAS Submit" → upload the `.p8`, type Key ID + Issuer ID | nothing in the repo, no env expansion question, `eas submit --non-interactive` and `eas build --auto-submit` just work; one interactive run by Karim |
| B: local file | `eas.json` → `ascApiKeyPath` (absolute path outside the repo, e.g. `~/.config/soli/AuthKey_<KEYID>.p8`), `ascApiKeyId`, `ascApiKeyIssuerId` | key ids land in a committed file (not secret, but noisy); `$ENV` expansion for these three is not documented |

Then iOS is: `yarn submit:ios` (= `eas submit -p ios --latest --non-interactive`) after `yarn build:ios`, or `npx eas-cli build -p ios --profile production --non-interactive --auto-submit` in one go. Add `--what-to-test "<text>"` and `-g Testers` to `eas submit` to fill TestFlight's "What to test" and the INTERNAL group (the internal group already gets every build automatically).

Stays manual even with the key: adding the build to the EXTERNAL TestFlight group and submitting it for beta review (App Store Connect → TestFlight → the external group → add build → "What to Test" → submit). `eas.json` has no external-group key, `--groups` is internal-only (CLI help, 2026-10-11), and the only Expo feature that covers external groups is the `testflight` EAS Workflows job, which Soli does not use (no CI).

## Not confirmed (could not verify from the docs on 2026-10-11)

1. Whether `eas submit --path` (local AAB) is counted anywhere (it is not a build, and submissions have no stated cap — but no doc states "unlimited"). Moot for Soli since Android no longer goes through EAS Submit.
2. Whether `ascApiKeyPath/ascApiKeyId/ascApiKeyIssuerId` accept `$ENV` expansion like `serviceAccountKeyPath` does (schema note only exists for the Android key). Workaround: hosted key on EAS (option A above).
3. Which App Store Connect role can CREATE a team API key on an Individual developer account. Apple's model (from memory, not re-verified): the Account Holder (Timo) must enable "Team Keys" once under Users and Access → Integrations; after that an Admin can generate keys. Treat as needing Timo.
4. `--groups` only covers INTERNAL TestFlight groups per the CLI help; external groups still need App Store Connect UI (or the `testflight` workflow job).
5. `track` accepts only the four enum values — a custom closed track created in Play Console cannot be targeted by name through `eas submit`. Not relevant anymore (own script, open testing = `beta`).
