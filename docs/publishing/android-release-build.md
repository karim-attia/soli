# Building Android Release Variant for Google Play Store

This guide explains how to build a properly signed Android App Bundle (AAB) locally for Google Play Store submission.

## Prerequisites

- Expo/React Native project with Android configuration
- Java Development Kit (JDK) installed
- Android SDK installed
- Gradle wrapper available in `android/` directory

## Initial Failed Attempt (For Reference)

The following approaches will NOT work for local release builds:

### ❌ Expo CLI Build (Deprecated)
```bash
npx expo build:android --type app-bundle
```
**Error**: `expo build:android is not supported in the local CLI, please use eas build -p android instead`

### ❌ EAS Build Without Configuration
```bash
npx eas build --platform android --profile production
```
**Error**: `EAS project not configured`

## ✅ Correct Approach: Local Gradle Build

### Step 1: Configure Release Signing

**Problem**: By default, React Native/Expo projects use debug signing even for release builds, which Google Play Store rejects.

#### 1.1 Update `android/app/build.gradle`

Add a release signing configuration:

```gradle
signingConfigs {
    debug {
        storeFile file('debug.keystore')
        storePassword 'android'
        keyAlias 'androiddebugkey'
        keyPassword 'android'
    }
    release {
        if (project.hasProperty('SOLI_UPLOAD_STORE_FILE')) {
            storeFile file(SOLI_UPLOAD_STORE_FILE)
            storePassword System.getenv('SOLI_UPLOAD_STORE_PASSWORD') ?: SOLI_UPLOAD_STORE_PASSWORD
            keyAlias SOLI_UPLOAD_KEY_ALIAS
            keyPassword System.getenv('SOLI_UPLOAD_KEY_PASSWORD') ?: SOLI_UPLOAD_KEY_PASSWORD
        }
    }
}
```

Update the release build type to use release signing:

```gradle
buildTypes {
    release {
        signingConfig signingConfigs.release  // Changed from signingConfigs.debug
        shrinkResources (findProperty('android.enableShrinkResourcesInReleaseBuilds')?.toBoolean() ?: false)
        minifyEnabled enableProguardInReleaseBuilds
        proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        crunchPngs (findProperty('android.enablePngCrunchInReleaseBuilds')?.toBoolean() ?: true)
    }
}
```

#### 1.2 Generate Release Keystore

Create a release keystore in the `android/app/` directory:

```bash
cd android/app
keytool -genkey -v \
  -keystore upload-keystore.jks \
  -storetype JKS \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -alias upload \
  -keypass YOUR_KEY_PASSWORD \
  -storepass YOUR_STORE_PASSWORD \
  -dname "CN=Your Name, OU=Development, O=Your Company, L=City, ST=State, C=Country" \
  -noprompt
```

**Important**: Replace the passwords and distinguished name with your actual information.

#### 1.3 Configure Signing Properties

Add the signing configuration to `android/gradle.properties`:

```properties
# Release signing configuration
SOLI_UPLOAD_STORE_FILE=upload-keystore.jks
# Passwords should be set via environment variables (see below)
SOLI_UPLOAD_KEY_ALIAS=upload
```

**Security Note**: Never commit actual passwords to your repository. Use a local `.env` file:

Create a `.env` file in your project root (it's already in `.gitignore`):

```bash
# Android Release Signing Configuration
SOLI_UPLOAD_STORE_PASSWORD=your_secure_store_password
SOLI_UPLOAD_KEY_PASSWORD=your_secure_key_password
```

**Recommended: Use the build script** (loads .env automatically):

```bash
./build-android.sh
```

**Alternative methods:**
- Set environment variables directly: `export SOLI_UPLOAD_STORE_PASSWORD="password" && ./gradlew bundleRelease`
- Pass inline: `SOLI_UPLOAD_STORE_PASSWORD="password" SOLI_UPLOAD_KEY_PASSWORD="key_password" ./gradlew bundleRelease`

### Step 1.4: Bump Version Code (Important!)

**Before each release**, you must increment the version code in `android/app/build.gradle`:

```gradle
defaultConfig {
    applicationId 'ch.karimattia.soli'
    minSdkVersion rootProject.ext.minSdkVersion
    targetSdkVersion rootProject.ext.targetSdkVersion
    versionCode 2  // ← Increment this number for each release
    versionName "0.1.0"  // ← Update version name as needed
}
```

**Why this matters:**
- Google Play Store requires each release to have a higher version code than previous releases
- `versionCode` is an integer that must increase with each update
- `versionName` is the user-visible version string (can stay the same or be updated)
- Failing to increment versionCode will result in Google Play rejecting your upload

**Example progression:**
- First release: `versionCode 1`, `versionName "1.0.0"`
- Second release: `versionCode 2`, `versionName "1.0.1"` (or keep "1.0.0")
- Third release: `versionCode 3`, `versionName "1.1.0"`

### Step 2: Build the Release Bundle

**Recommended: Use the automated build script** (loads .env automatically):

```bash
./build-android.sh
```

**Manual build** (if you prefer):

```bash
# Load environment variables and build
source .env && cd android && ./gradlew bundleRelease

# Or set them inline
cd android && SOLI_UPLOAD_STORE_PASSWORD="your_password" SOLI_UPLOAD_KEY_PASSWORD="your_key_password" ./gradlew bundleRelease
```

### Step 3: Verify the Build

Check that the AAB file was created:

```bash
ls -la app/build/outputs/bundle/release/
```

Expected output:
```
app-release.aab
```

### Step 4: Verify Signing

Verify that the AAB is properly signed with a release certificate:

```bash
cd android/app/build/outputs/bundle/release
jarsigner -verify -verbose -certs app-release.aab
```

**Success indicators**:
- Exit code: 0
- Output shows signing information (not debug certificate)

## Output Files

After successful build, you'll find:

- **Android App Bundle (AAB)**: `android/app/build/outputs/bundle/release/app-release.aab`
  - **Recommended for Google Play Store**
  - Supports Dynamic Delivery and smaller downloads

- **APK (Alternative)**: `android/app/build/outputs/apk/release/app-release.apk`
  - Larger download size
  - No Dynamic Delivery support

## Google Play Store Submission

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app or create a new one
3. Navigate to **Release > Production**
4. Upload the `app-release.aab` file
5. Complete the release process

## Security Best Practices

### ⚠️ Important Security Notes

1. **Keep your keystore secure**: Store `upload-keystore.jks` in a safe location
2. **Backup your keystore**: If lost, you cannot update your app
3. **Use strong passwords**: Avoid the example passwords used in this guide
4. **Environment variables**: Consider using environment variables instead of storing passwords in `gradle.properties`

### 📁 Version Control (.gitignore) Configuration

Update your `.gitignore` to properly handle Android files:

```gitignore
# Ignore entire android/ios directories (generated by Expo)
.expo
ios
android

# But track important configuration files
!android/app/build.gradle
!android/app/proguard-rules.pro
!android/gradle.properties

# Never commit keystore files or environment files
*.keystore
*.jks
.env
```

**What to commit:**
- ✅ `android/app/build.gradle` - Contains version codes, signing config, build settings
- ✅ `android/gradle.properties` - Contains build properties (passwords commented out)
- ✅ `android/app/proguard-rules.pro` - ProGuard/R8 optimization rules
- ✅ `build-android.sh` - Automated build script
- ✅ Documentation files

**What NOT to commit:**
- ❌ `*.keystore` / `*.jks` files - Contains private signing keys
- ❌ `android/app/build/` - Build artifacts and generated files
- ❌ `android/app/debug.keystore` - Auto-generated debug keystore
- ❌ `.env` - Contains sensitive passwords (ignored by git)
- ❌ `*.aab` / `*.apk` - Build outputs

**Current secure setup**: Passwords are stored in local `.env` file (ignored by git) and loaded automatically by the build script.

### Current Implementation (Recommended)

This project uses a secure setup with environment variables loaded from a local `.env` file:

**1. Local `.env` file** (ignored by git):
```bash
# Generate secure passwords with: openssl rand -hex 16
SOLI_UPLOAD_STORE_PASSWORD=your_secure_store_password
SOLI_UPLOAD_KEY_PASSWORD=your_secure_key_password
```

**2. Automated build script** (`build-android.sh`):
```bash
#!/bin/bash
# Loads .env and builds automatically
set -a
source .env
set +a
cd android && ./gradlew bundleRelease
```

**3. Build.gradle configuration**:
```gradle
release {
    storePassword System.getenv('SOLI_UPLOAD_STORE_PASSWORD') ?: SOLI_UPLOAD_STORE_PASSWORD
    keyPassword System.getenv('SOLI_UPLOAD_KEY_PASSWORD') ?: SOLI_UPLOAD_KEY_PASSWORD
}
```

### Alternative Security Setup

If you prefer a separate properties file approach instead of environment variables:

```gradle
// In build.gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
keystoreProperties.load(new FileInputStream(keystorePropertiesFile))

android {
    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }
}
```

Create `android/keystore.properties` (add to `.gitignore`):

```properties
storeFile=app/upload-keystore.jks
storePassword=your_secure_password
keyAlias=upload
keyPassword=your_secure_key_password
```

## Troubleshooting

### Common Issues

1. **"debug.keystore" not found**: This is normal - debug keystore is auto-generated
2. **Build fails with signing error**: Check passwords and file paths in `gradle.properties`
3. **Google Play rejects upload**: Verify signing with `jarsigner -verify`
4. **Key validity error**: Ensure key validity extends beyond October 22, 2033

### Verification Commands

```bash
# Check keystore contents
keytool -list -v -keystore upload-keystore.jks

# Verify AAB signature
jarsigner -verify -verbose app-release.aab

# Check certificate details
jarsigner -verify -verbose -certs app-release.aab | grep -A 10 "Signer"
```

## Alternative: EAS Build (Cloud)

For cloud builds (requires EAS configuration):

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS project
eas build:configure

# Build for production
eas build --platform android --profile production
```

## References

- [Android App Signing](https://developer.android.com/tools/publishing/app-signing.html)
- [Google Play App Signing](https://developer.android.com/google/play/requirements/target-sdk)
- [React Native Signed APK](https://reactnative.dev/docs/signed-apk-android)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)



