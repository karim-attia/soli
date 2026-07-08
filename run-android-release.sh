#!/usr/bin/env bash

set -euo pipefail

# Start-of-run timestamp so the Node entry's total-duration line includes this
# script's discovery/pinning phase (macOS date has no %N — second resolution
# is plenty for a total measured in minutes).
export SOLI_RELEASE_START_EPOCH_MS="$(($(date +%s) * 1000))"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

# Wireless-adb discovery/connect/pinning lives in the shared lib (also used by
# scripts/android-ready.sh — one implementation, see plan doc C13).
# shellcheck source=scripts/lib/adb-discovery.sh
source "${ROOT_DIR}/scripts/lib/adb-discovery.sh"

# Note: the arm64-v8a ABI default moved into scripts/lib/build-tools.js
# (buildReleaseApk) so demo builds get the single-ABI speedup too.
BUILD_GRADLE_FILE="${ROOT_DIR}/android/app/build.gradle"
REQUIRED_SIGNING_KEYS=(
  "SOLI_UPLOAD_STORE_FILE"
  "SOLI_UPLOAD_STORE_PASSWORD"
  "SOLI_UPLOAD_KEY_ALIAS"
  "SOLI_UPLOAD_KEY_PASSWORD"
)

require_signing_env() {
  local signing_key=""
  local missing_keys=()

  for signing_key in "${REQUIRED_SIGNING_KEYS[@]}"; do
    if [[ -z "${!signing_key:-}" ]]; then
      missing_keys+=("${signing_key}")
    fi
  done

  if [[ "${#missing_keys[@]}" -gt 0 ]]; then
    echo "Error: Missing required signing variables: ${missing_keys[*]}" >&2
    exit 1
  fi

  if [[ ! -f "${SOLI_UPLOAD_STORE_FILE}" ]]; then
    echo "Error: Keystore file not found at '${SOLI_UPLOAD_STORE_FILE}'" >&2
    exit 1
  fi
}

apply_release_signing_patch() {
  if [[ ! -f "${BUILD_GRADLE_FILE}" ]]; then
    echo "Error: Gradle file not found at '${BUILD_GRADLE_FILE}'" >&2
    exit 1
  fi

  local default_signing_block=""
  local desired_signing_block=""
  local default_release_block=""
  local desired_release_block=""

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

  local file_before_patch=""
  local file_after_patch=""
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
  # Only report when something changed — the "already correct" case is the
  # happy-path norm and printing it added noise (output-cleanup round 2026-07).
  if [[ "${file_before_patch}" != "${file_after_patch}" ]]; then
    echo "Repaired Android signing config" >&2
  fi
}

warn_if_short_screen_timeout() {
  local adb_bin="$1"
  local serial="$2"
  local timeout_ms=""

  timeout_ms="$("${adb_bin}" -s "${serial}" shell settings get system screen_off_timeout 2>/dev/null | tr -d '\r\n' || true)"
  if [[ ! "${timeout_ms}" =~ ^[0-9]+$ || "${timeout_ms}" -gt 30000 ]]; then
    return 0
  fi

  # Keep this guidance contextual: agents only need it when a short timeout can interrupt
  # physical-device testing, rather than in the repository-wide AGENTS.md instructions.
  echo "Testing agent warning: the physical device screen timeout is ${timeout_ms} ms (30 seconds or less)." >&2
  printf "Testing agent: before testing, run: %q -s %q shell settings put system screen_off_timeout 150000\n" "${adb_bin}" "${serial}" >&2
}

main() {
  cd "${ROOT_DIR}"
  load_env_file "${ENV_FILE}"
  require_signing_env
  apply_release_signing_patch

  local adb_bin=""
  local requested_target="${ADB_WIFI_TARGET:-}"
  adb_bin="$(pick_adb)"
  if [[ -z "${adb_bin}" ]]; then
    echo "Error: adb not found" >&2
    exit 1
  fi
  ensure_adb_server_owner "${adb_bin}"

  local stable_serial=""
  stable_serial="$(discover_and_connect_device "${adb_bin}" "${requested_target}" || true)"

  if [[ -n "${stable_serial}" ]]; then
    stable_serial="$(pin_tcpip_port "${adb_bin}" "${stable_serial}")"
    export ANDROID_SERIAL="${stable_serial}"
  else
    echo "Error: no physical Android device is connected." >&2
    echo "The release script will not fall back to an emulator." >&2
    echo "Testing agent: ask Karim to enable Wireless debugging, wait for his response, then rerun yarn release and continue the original task." >&2
    exit 1
  fi

  warn_if_short_screen_timeout "${adb_bin}" "${stable_serial}"
  # exec (not a plain call) so no shell parent lingers after the Node entry
  # exits; "$@" forwards --logs/--auto-solve. Bare gradlew replaced `expo run:android` here —
  # autolinking + RN codegen run inside Gradle, so no expo codegen step is lost
  # (see scripts/lib/build-tools.js).
  exec node "${ROOT_DIR}/scripts/build-install-android.js" "$@"
}

main "$@"
