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
            // Keep release config valid for local debug workflows (e.g. `expo run:android`).
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

  local file_before_patch
  local file_after_patch
  file_before_patch="$(cat "${BUILD_GRADLE_FILE}")"

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

  file_after_patch="$(cat "${BUILD_GRADLE_FILE}")"
  if [ "${file_before_patch}" = "${file_after_patch}" ]; then
    echo "Android signing config already correct"
  else
    echo "Repaired Android signing config"
  fi
}

# Sync versionCode/versionName from app.json into the generated build.gradle.
# android/ is gitignored and produced by `expo prebuild`; bumping app.json alone
# does NOT reach android/app/build.gradle without a prebuild, and a clean
# prebuild (`yarn prebuild:android`) is slow and resets the signing block
# (re-applied below anyway). Patching the two lines directly keeps the release
# build incremental and makes app.json the single place to bump
# (release-automation plan, 2026-10-11). app.json is static (no app.config.js),
# so a plain require() reads the exact values Expo would use.
apply_version_from_app_json() {
  local version_code
  local version_name
  version_code="$(node -p "require('./app.json').expo.android.versionCode")"
  version_name="$(node -p "require('./app.json').expo.version")"

  SOLI_VERSION_CODE="${version_code}" SOLI_VERSION_NAME="${version_name}" perl -pi -e '
    s/^(\s*)versionCode \d+$/$1versionCode $ENV{SOLI_VERSION_CODE}/;
    s/^(\s*)versionName "[^"]*"$/$1versionName "$ENV{SOLI_VERSION_NAME}"/;
  ' "${BUILD_GRADLE_FILE}"

  if ! rg -q "^\\s*versionCode ${version_code}\$" "${BUILD_GRADLE_FILE}" ||
    ! rg -q "^\\s*versionName \"${version_name}\"\$" "${BUILD_GRADLE_FILE}"; then
    echo "Error: could not sync versionCode/versionName into ${BUILD_GRADLE_FILE}"
    exit 1
  fi
  echo "Android version: ${version_name} (versionCode ${version_code})"
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
apply_version_from_app_json

# Rust solver artifacts are gitignored (hints plan doc, "Artifacts-in-git
# decision 2026-07-23") — a stale/missing solver must never reach a Play
# Store bundle. Rebuilds when rust/ changed; silent no-op when up to date.
node scripts/ensure-rust-solver.js

# ABIs: the bundle ships all four from android/gradle.properties
# (armeabi-v7a, arm64-v8a, x86, x86_64) and scripts/build-rust-solver.sh builds
# the solver for all four. History: on 2026-10-11 this script briefly forced
# `ORG_GRADLE_PROJECT_reactNativeArchitectures="arm64-v8a,x86_64"` because the
# solver only existed for 64-bit; Play then warned the bundle dropped 5,607
# device models (29% of phones/tablets, all TVs) vs 1.0.0, so the 32-bit solver
# targets were added instead and the override removed. The guard after the
# build keeps the invariant: every ABI in the AAB must carry the solver.

# Agent/non-interactive shells don't source ~/.zshrc (where ANDROID_HOME lives)
# and android/local.properties is not generated here, so Gradle fails with
# "SDK location not found" (seen on the 1.1.0 release build, 2026-10-11).
# Same default as scripts/build-rust-solver.sh.
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"

# Navigate to android directory and build.
cd android
echo "Building Android App Bundle..."
./gradlew bundleRelease

AAB_PATH="app/build/outputs/bundle/release/app-release.aab"
# Guard for the ABI note above: every ABI in the bundle must carry the solver.
for abi in $(unzip -Z1 "${AAB_PATH}" 'base/lib/*' | cut -d/ -f3 | sort -u); do
  if ! unzip -Z1 "${AAB_PATH}" "base/lib/${abi}/libsoli_solver_ffi.so" >/dev/null 2>&1; then
    echo "Error: ${AAB_PATH} contains ABI ${abi} without libsoli_solver_ffi.so"
    exit 1
  fi
  echo "ABI ${abi}: solver present"
done

echo "Build completed: android/${AAB_PATH}"
