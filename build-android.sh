#!/bin/bash
# Build Android Release Bundle with upload-keystore signing.

set -euo pipefail

ENV_FILE=".env"
BUILD_GRADLE_FILE="android/app/build.gradle"
REQUIRED_SIGNING_KEYS=(
  "SOLI_UPLOAD_STORE_FILE"
  "SOLI_UPLOAD_STORE_PASSWORD"
  "SOLI_UPLOAD_KEY_ALIAS"
  "SOLI_UPLOAD_KEY_PASSWORD"
)

apply_release_signing_patch() {
  if [ ! -f "${BUILD_GRADLE_FILE}" ]; then
    echo "Error: Gradle file not found at '${BUILD_GRADLE_FILE}'"
    exit 1
  fi

  local default_signing_block
  local desired_signing_block
  local default_release_block
  local desired_release_block

  default_signing_block="$(cat <<'EOF'
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
EOF
)"

  desired_signing_block="$(cat <<'EOF'
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            // Keep release config valid for local debug workflows (e.g. `yarn android`).
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'

            def uploadStoreFile = System.getenv('SOLI_UPLOAD_STORE_FILE') ?: findProperty('SOLI_UPLOAD_STORE_FILE')
            def uploadStorePassword = System.getenv('SOLI_UPLOAD_STORE_PASSWORD') ?: findProperty('SOLI_UPLOAD_STORE_PASSWORD')
            def uploadKeyAlias = System.getenv('SOLI_UPLOAD_KEY_ALIAS') ?: findProperty('SOLI_UPLOAD_KEY_ALIAS')
            def uploadKeyPassword = System.getenv('SOLI_UPLOAD_KEY_PASSWORD') ?: findProperty('SOLI_UPLOAD_KEY_PASSWORD')

            if (uploadStoreFile != null && uploadStorePassword != null && uploadKeyAlias != null && uploadKeyPassword != null) {
                storeFile file(uploadStoreFile)
                storePassword uploadStorePassword
                keyAlias uploadKeyAlias
                keyPassword uploadKeyPassword
            }
        }
    }
EOF
)"

  default_release_block="$(cat <<'EOF'
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
EOF
)"

  desired_release_block="$(cat <<'EOF'
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.release
EOF
)"

  if ! rg -q "signingConfigs\\.release" "${BUILD_GRADLE_FILE}"; then
    SOLI_DEFAULT_SIGNING_BLOCK="${default_signing_block}" SOLI_DESIRED_SIGNING_BLOCK="${desired_signing_block}" perl -0pi -e '
      my $current = $ENV{SOLI_DEFAULT_SIGNING_BLOCK};
      my $desired = $ENV{SOLI_DESIRED_SIGNING_BLOCK};
      s/\Q$current\E/$desired/s or die "Failed to patch Android signingConfigs block\n";
    ' "${BUILD_GRADLE_FILE}"
  fi

  SOLI_DEFAULT_RELEASE_BLOCK="${default_release_block}" SOLI_DESIRED_RELEASE_BLOCK="${desired_release_block}" perl -0pi -e '
    my $current = $ENV{SOLI_DEFAULT_RELEASE_BLOCK};
    my $desired = $ENV{SOLI_DESIRED_RELEASE_BLOCK};
    s/\Q$current\E/$desired/s;
  ' "${BUILD_GRADLE_FILE}"
}

# Load environment variables and export them.
if [ -f "${ENV_FILE}" ]; then
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
  echo "Loaded environment variables from ${ENV_FILE}"
else
  echo "Error: ${ENV_FILE} file not found"
  exit 1
fi

MISSING_KEYS=()
for SIGNING_KEY in "${REQUIRED_SIGNING_KEYS[@]}"; do
  if [ -z "${!SIGNING_KEY:-}" ]; then
    MISSING_KEYS+=("${SIGNING_KEY}")
  fi
done

if [ "${#MISSING_KEYS[@]}" -gt 0 ]; then
  echo "Error: Missing required signing variables: ${MISSING_KEYS[*]}"
  exit 1
fi

if [ ! -f "${SOLI_UPLOAD_STORE_FILE}" ]; then
  echo "Error: Keystore file not found at '${SOLI_UPLOAD_STORE_FILE}'"
  exit 1
fi

apply_release_signing_patch

# Navigate to android directory and build.
cd android
echo "Building Android App Bundle..."
./gradlew bundleRelease

echo "Build completed: android/app/build/outputs/bundle/release/app-release.aab"
