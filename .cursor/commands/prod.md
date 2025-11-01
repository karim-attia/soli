# Production Build for Connected Device

Build and install a production/release version of the app on a connected Android device.

## Prerequisites
- Android device connected via USB with USB debugging enabled
- ADB installed and configured
- Device authorized for development

## Command
```bash
npx expo run:android --variant release
```

## What it does
- Builds the app in release/production mode (minified, optimized)
- Generates a signed APK
- Installs the APK directly on the connected device
- Launches the app automatically

## Alternative Commands
- For iOS (if iPhone connected): `npx expo run:ios --configuration Release`
- To build without installing: `npx expo build:android`
- For development build: `npx expo run:android` (no --variant flag)

## Verification
Check device connection: `adb devices`

## Notes
- Production builds are optimized and don't include dev tools
- The app will run with production performance characteristics
- Ready for distribution or testing real-world performance