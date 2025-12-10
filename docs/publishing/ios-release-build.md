# Building iOS Release for TestFlight and App Store

This guide explains how to build and upload Soli to TestFlight using EAS Build and Transporter.

## Overview

Since the Apple Developer account is a **Personal/Individual** account (owned by Timo Hegnauer), team members cannot sign apps directly. Instead, we use:

1. **EAS Build** (Expo cloud service) - builds the app using uploaded credentials
2. **Transporter** (Apple's app) - uploads the IPA to App Store Connect

## Prerequisites

- Expo account (free)
- Access to App Store Connect as Admin/App Manager
- Distribution Certificate (.p12) and Provisioning Profile (.mobileprovision) from account holder
- Transporter app (free from Mac App Store)

## One-Time Setup

### Step 1: EAS Project Setup

Already configured in `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "9de7c7ee-2f1d-418d-ad51-eee7ede5d609"
      }
    }
  }
}
```

### Step 2: Upload Signing Credentials to EAS

The account holder (Timo) must provide:
- **Distribution Certificate** (.p12 file + password)
- **Provisioning Profile** (.mobileprovision file)

#### How Timo Creates These:

**Distribution Certificate:**
1. Open **Keychain Access** on Mac
2. Find "Apple Distribution: Timo Hegnauer" in **login → My Certificates**
3. Right-click → **Export** as `.p12`
4. Set a password

**Provisioning Profile:**
1. Go to: https://developer.apple.com/account/resources/profiles/list
2. Click **"+"** → Select **"App Store Connect"**
3. Select App ID: `ch.karimattia.soli`
4. Select the Distribution Certificate
5. Download the `.mobileprovision` file

#### Upload to EAS:

```bash
# Login to your Expo account
npx eas login

# Upload credentials
npx eas credentials
# Select: iOS → production
# Select: Distribution Certificate → Upload your own → provide .p12 + password
# Select: Provisioning Profile → Upload your own → provide .mobileprovision
```

### Step 3: Install Transporter

Download from Mac App Store:
```bash
open "https://apps.apple.com/app/transporter/id1450874784"
```

## Building and Uploading

### Step 1: Update Version (Before Each Release)

In `app.json`, increment the build number:

```json
{
  "expo": {
    "version": "0.1.2",
    "ios": {
      "buildNumber": "2"
    }
  }
}
```

**Version Rules:**
- `version`: User-visible version string (e.g., "1.0.0")
- `buildNumber`: Must increment for each TestFlight upload (integer as string)

### Step 2: Build with EAS

```bash
npx eas build --platform ios --profile production
```

When prompted:
- **"Do you want to log in to your Apple account?"** → Select **No**
  - (We already have credentials uploaded, no Apple login needed)

Build takes ~15-20 minutes. You'll get a URL to the `.ipa` file when complete.

### Step 3: Download the IPA

```bash
# Create build directory
mkdir -p ios/build

# Download the IPA (replace URL with your build URL)
curl -L -o ios/build/Soli.ipa "YOUR_IPA_URL_FROM_EAS"
```

Or copy the URL from the terminal and download via browser.

### Step 4: Upload with Transporter

1. Open **Transporter**
2. Sign in with your Apple ID (must have App Store Connect access)
3. Drag `ios/build/Soli.ipa` into Transporter
4. Click **Deliver**

### Step 5: TestFlight Processing

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your app → **TestFlight** tab
3. Wait for processing (~10-30 minutes)
4. Once processed, the build appears and you can add testers

## Quick Reference

### Build Commands

```bash
# Build for iOS (production)
npx eas build --platform ios --profile production

# Check build status
npx eas build:list --platform ios

# View credentials
npx eas credentials
```

### Version Checklist Before Release

- [ ] Update `version` in `app.json` (if user-visible change)
- [ ] Increment `ios.buildNumber` in `app.json`
- [ ] Build with EAS
- [ ] Download IPA
- [ ] Upload via Transporter

## Configuration Files

### eas.json

```json
{
  "cli": {
    "version": ">= 10.1.1"
  },
  "build": {
    "production": {}
  },
  "submit": {
    "production": {
      "ios": {
        "appleTeamId": "A73YSR4W75"
      }
    }
  }
}
```

### app.json (iOS section)

```json
{
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": "ch.karimattia.soli",
    "buildNumber": "1",
    "infoPlist": {
      "ITSAppUsesNonExemptEncryption": false
    }
  }
}
```

## Troubleshooting

### "You have no team associated with your Apple account"

This is expected when using EAS Build without Apple login. Select **No** when asked to log in to Apple - the uploaded credentials will be used instead.

### "Build number already exists"

Increment `ios.buildNumber` in `app.json` before building.

### Transporter upload fails

- Ensure you're signed in with an Apple ID that has App Store Connect access
- Check that the bundle ID matches App Store Connect (`ch.karimattia.soli`)

### Credentials expired

Distribution certificates and provisioning profiles expire after 1 year. Request new ones from the account holder and re-upload via `npx eas credentials`.

## Team Permissions

| Person | Role | Can Do |
|--------|------|--------|
| Timo (Account Holder) | Owner | Everything - creates certificates, profiles |
| Team Members | Admin in App Store Connect | Build via EAS, upload via Transporter, manage TestFlight |

## Why This Approach?

Apple Personal/Individual Developer accounts **cannot** grant certificate access to team members. Only the account holder can sign apps. 

This workflow solves that by:
1. Account holder exports signing credentials once
2. Credentials are stored securely in EAS
3. Team members can build and upload independently

## References

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [App Store Connect Help: Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
- [Transporter App](https://apps.apple.com/app/transporter/id1450874784)
- [TestFlight Overview](https://developer.apple.com/testflight/)
