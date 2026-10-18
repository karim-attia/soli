# Expo Linking Guide — deep links, iOS Universal Links, Android App Links

Last refreshed: 2026-10-12

## Scope

- Package/tool: `expo-linking` (installed, ~57) + the `expo` config fields that drive OS-level
  link handling (`scheme`, `ios.associatedDomains`, `android.intentFilters`).
- This is the canonical Soli guide for universal/app links. Incoming-link *routing* inside
  the app (`+native-intent.tsx`) is in `expo-router.md`; the OS share sheet is in
  `react-native.md` (Share).
- Sources (read 2026-10-12):
  - https://docs.expo.dev/linking/into-your-app/ (custom scheme deep links)
  - https://docs.expo.dev/linking/ios-universal-links/
  - https://docs.expo.dev/linking/android-app-links/
  - https://developer.apple.com/documentation/xcode/supporting-associated-domains
    (JS-rendered; facts below from Apple's published requirements, cross-checked with the
    Expo page)
  - https://developer.android.com/training/app-links/verify-android-applinks

## Current guidance (what Soli does)

| Piece | Value |
|---|---|
| Custom scheme | `soli` (`expo.scheme`) — dev links `soli://?demo=…` AND the public twin `soli://soli/deal/<id>` |
| Public https link | `https://karimattia.ch/soli/deal/<exactId>?draw=<n>` |
| iOS | `ios.associatedDomains: ["applinks:karimattia.ch"]` (no protocol, no path) |
| Android | `android.intentFilters[0]`: `action VIEW`, `autoVerify true`, `data [{scheme https, host karimattia.ch, pathPrefix /soli/deal}]`, `category [BROWSABLE, DEFAULT]` |
| Website files | `https://karimattia.ch/.well-known/apple-app-site-association` and `/.well-known/assetlinks.json` (repo `karimattia.ch`, `public/.well-known/`) |

Both config changes are **native** (entitlement + AndroidManifest). `android/` and `ios/` are
gitignored prebuild outputs here, so `yarn release` / `yarn ios` (which prebuild) pick them up
locally; store users need a new store build. Changing the *web* files later does not need an
app update per se, but iOS fetches the AASA at install/update time only (Apple CDN), so a
path change effectively needs an App Store update.

## Detailed guidance

### iOS Universal Links

- AASA file: `https://<domain>/.well-known/apple-app-site-association`, **https, no redirect,
  no file extension, `Content-Type: application/json`**, uncompressed ≤ 128 KB. Apple's CDN
  fetches it (not the device) when the app is installed/updated — typically within hours;
  `applinks:<domain>?mode=developer` in the entitlement bypasses the CDN for *development*
  builds only.
- `appID` / `appIDs` = `<TEAM_ID>.<bundleId>` → Soli: `A73YSR4W75.ch.karimattia.soli`
  (team id from `eas.json` → `submit.production.ios.appleTeamId`).
- Expo docs: include both the modern `components` form and the legacy `paths` form in
  `applinks.details`, modern first (done). `*` does not cross path separators.
- Capability: `ios.associatedDomains` makes prebuild write the
  `com.apple.developer.associated-domains` entitlement. The **App ID must have the Associated
  Domains capability enabled** in the Apple Developer portal and the **provisioning profile
  regenerated** afterwards. EAS does this automatically only when it manages credentials
  with an Apple login — Soli uses *uploaded* credentials from Timo's Individual account
  (`docs/publishing/ios-release-build.md`), so this is a manual step for Timo/Karim
  (portal → Identifiers → `ch.karimattia.soli` → Associated Domains → regenerate the App
  Store profile → `npx eas-cli credentials -p ios` → upload the new `.mobileprovision`).
  A build with the entitlement but a profile without the capability fails code signing.
- Testing: universal links never trigger from the same app or from a typed Safari URL bar
  (Apple behaviour); use Notes/Messages or `xcrun simctl openurl booted '<https url>'` once
  the association is live. Before that, the scheme twin `soli://soli/deal/<id>` exercises the
  identical in-app path.

### Android App Links

- `assetlinks.json` at `https://<domain>/.well-known/assetlinks.json`, https,
  `Content-Type: application/json`, one object per (package, fingerprint set):
  `relation ["delegate_permission/common.handle_all_urls"]`, `target { namespace
  "android_app", package_name, sha256_cert_fingerprints [...] }`. Several fingerprints may be
  listed — needed here because Play-distributed installs are signed by Google's **Play App
  Signing key** while `yarn release` installs are signed by the **upload key**.
- Fingerprints: upload key from any signed artifact (`keytool -printcert -jarfile app.aab`
  or `apksigner verify --print-certs app.apk`) → Soli upload key
  `C0:85:A1:BC:51:F4:C7:F5:BF:E8:8C:DA:A0:36:A1:51:1A:4E:DD:A4:21:C4:C0:F0:D6:61:EB:8D:27:DF:36:46`.
  Play App Signing key: Play Console → Release → Setup → **App signing** (Expo docs name;
  newer console: Test and release → App integrity) → "Digital Asset Links JSON" snippet /
  App signing key certificate SHA-256. Not derivable locally.
- `autoVerify: true` is required; Android verifies on install (20 s+). Status:
  `adb shell pm get-app-links ch.karimattia.soli`; force re-check:
  `adb shell pm verify-app-links --re-verify ch.karimattia.soli`. Explicit-component intents
  (`adb shell am start -a android.intent.action.VIEW -d '<https url>' ch.karimattia.soli`)
  deliver the URL regardless of verification — the testing shortcut.

### Custom scheme deep links (unchanged)

`Linking.getInitialURL()` / `Linking.addEventListener('url')` deliver the raw URL string on
cold/warm start; expo-router consumes the same URL for routing (see `expo-router.md`). The
dev launcher keeps its own listener (`useDemoGameLauncher.processDemoLink`); a URL that
matches no dev family falls through silently, which is what keeps the public link format
from interfering with it.
