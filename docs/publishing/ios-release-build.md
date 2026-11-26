# iOS release build — moved

The release flow lives in **`.agents/skills/soli-release/SKILL.md`** (bump, notes, `yarn build:ios`, `yarn submit:ios` / Transporter, TestFlight groups). EAS Submit details and the API-key activation steps are in `docs/external-package-guides/eas-submit.md`. This file keeps the Apple credential story and the renewal steps that are not in the skill.

## How EAS gets its signing credentials

The Apple Developer account is an **Individual** account owned by Timo Hegnauer (Account Holder, team `A73YSR4W75`); Karim is Admin in App Store Connect. Individual accounts cannot hand signing rights to team members, and Karim cannot open Certificates, Identifiers & Profiles in the developer portal. Since 2026-11-26 EAS therefore creates and stores the credentials itself, authenticated with the App Store Connect API key (no Apple ID login, no password, no 2FA):

| What | Value (2026-11-26) |
|---|---|
| Distribution certificate | "iOS Distribution: Timo Hegnauer", serial `1E9A030FEED2B3CC33FFC14867F84320`, Apple id `3NS8NHQQ68`, **expires 2027-11-26** |
| Provisioning profile | `*[expo] ch.karimattia.soli AppStore 2026-11-26T17:18:31.617Z`, portal id `8569XZ3U4R`, App Store, **expires 2027-11-26**, entitlements incl. `com.apple.developer.associated-domains` |
| Where the private key lives | Only on EAS (generated there). Nothing on this Mac, nothing in the repo. A local copy is possible via `eas credentials` → "credentials.json: Upload/Download" — if ever needed, keep it in `~/.config/soli/` (chmod 600), never in the repo |

`eas build -p ios --profile production --non-interactive` signs with these without any Apple login.

Until 2026-11-26 the credentials were uploaded by hand (Timo exported a `.p12` from Keychain and a profile "Soli App Store" from the portal; `eas credentials` → upload). That route still works as a fallback but is no longer needed. Leftovers at Apple, both unused by Soli: the profile "Soli App Store" (INVALID since the Associated Domains capability was enabled) and the two older distribution certificates expiring 2026-12-06, which **Tichu and Unfog still use — never revoke or delete a distribution certificate from here**. Apple allowed a third distribution certificate next to those two; if it ever refuses one because of the per-account limit, stop and ask Timo which one may go.

## Renewal (yearly, before 2027-11-26) or after a capability change

`eas credentials` is interactive only (needs a TTY; an agent can drive it through a pty). About 2 minutes, no build quota used.

1. Start it with the API key in the environment (these `EXPO_ASC_*` variables are what makes EAS talk to Apple without a login):

   ```bash
   EXPO_ASC_API_KEY_PATH=~/.config/soli/AuthKey_3DC38PC55T.p8 EXPO_ASC_KEY_ID=3DC38PC55T \
   EXPO_ASC_ISSUER_ID=3ffa317d-28f3-4328-a656-73950020199d \
   EXPO_APPLE_TEAM_ID=A73YSR4W75 EXPO_APPLE_TEAM_TYPE=INDIVIDUAL \
   npx eas-cli credentials -p ios
   ```

2. Build profile → **production**. It prints the current certificate/profile with expiry.
3. **Build Credentials: Manage everything needed to build your project**.
4. **Distribution Certificate: Add a new one to your account** → "Generate a new Apple Distribution Certificate?" **Y** → "Do you want soli to use the new Distribution Certificate?" **Y**.
   - Only the profile is broken (capability change, certificate still valid)? Skip the new certificate: pick **Provisioning Profile: Delete one from your project**, then **All: Set up all the required credentials** and let it reuse the certificate (menu entries exist, this variant was not tried yet).
   - Never choose "Distribution Certificate: Delete one from your account" (see above).
5. "Generate a new Apple Provisioning Profile?" **Y**. The new profile takes the App ID's current capabilities.
6. The summary now shows the new serial and expiry for both. Ctrl+C to leave.
7. Verify without a browser (`A` = `scripts/with-asc-key.sh node scripts/asc-api.js`): `A GET '/v1/profiles?include=certificates'` → the `*[expo] ch.karimattia.soli AppStore …` profile is `ACTIVE` and points at the new certificate; `A GET '/v1/certificates'` → new `IOS_DISTRIBUTION` entry with next year's date. The profile's entitlements are in its base64 `profileContent` (`security cms -D` on the decoded bytes).
8. Update the dates in this file and in the release skill (pre-flight).

## App Store Connect facts

- App "Apple ID" (`ascAppId`) `6755950876`, bundle id `ch.karimattia.soli`, EAS project `9de7c7ee-2f1d-418d-ad51-eee7ede5d609` (account `karim.attia`).
- TestFlight groups: internal "Testers" (automatic for every build) and external "Testers" (public link; needs "What to Test" + beta review per version — manual).
- App Store Connect API key (team key `3DC38PC55T`, since 2026-11-25): `.p8` at `~/.config/soli/AuthKey_3DC38PC55T.p8`, never in the repo. `yarn build:ios` auto-submits to TestFlight with it; setup and rationale in `docs/external-package-guides/eas-submit.md`. Transporter (Karim's Apple ID) is only the fallback.
- Karim (Admin) cannot open Certificates, Identifiers & Profiles in the developer portal ("team not found"). Certificates and profiles go through the API key (above); enabling a capability on the App ID stays with Timo. Bundle ID resource id `G5BS2Y54X8`, capabilities 2026-11-26: In-App Purchase, Associated Domains.
