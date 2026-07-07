#!/usr/bin/env bash

set -euo pipefail

# Start-of-run timestamp so the Node entry's total-duration line includes this
# script's discovery/pinning phase (macOS date has no %N — second resolution
# is plenty for a total measured in minutes).
export SOLI_RELEASE_START_EPOCH_MS="$(($(date +%s) * 1000))"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ROOT_DIR}/.env"

# Note: the arm64-v8a ABI default moved into scripts/lib/build-tools.js
# (buildReleaseApk) so demo builds get the single-ABI speedup too.
BUILD_GRADLE_FILE="${ROOT_DIR}/android/app/build.gradle"
CONNECT_CANDIDATES=()
DISCOVERED_STABLE_SERIAL=""
REQUIRED_SIGNING_KEYS=(
  "SOLI_UPLOAD_STORE_FILE"
  "SOLI_UPLOAD_STORE_PASSWORD"
  "SOLI_UPLOAD_KEY_ALIAS"
  "SOLI_UPLOAD_KEY_PASSWORD"
)

pick_adb() {
  if [[ -n "${ADB_BIN:-}" && -x "${ADB_BIN}" ]]; then
    echo "${ADB_BIN}"
    return 0
  fi

  local path_adb=""
  path_adb="$(command -v adb || true)"
  if [[ -n "${path_adb}" && -x "${path_adb}" ]]; then
    echo "${path_adb}"
    return 0
  fi

  if [[ -n "${ANDROID_HOME:-}" && -x "${ANDROID_HOME}/platform-tools/adb" ]]; then
    echo "${ANDROID_HOME}/platform-tools/adb"
    return 0
  fi

  if [[ -n "${ANDROID_SDK_ROOT:-}" && -x "${ANDROID_SDK_ROOT}/platform-tools/adb" ]]; then
    echo "${ANDROID_SDK_ROOT}/platform-tools/adb"
    return 0
  fi

  local macos_sdk_adb="${HOME}/Library/Android/sdk/platform-tools/adb"
  if [[ -x "${macos_sdk_adb}" ]]; then
    echo "${macos_sdk_adb}"
    return 0
  fi

  command -v adb || true
}

resolve_path() {
  local path="$1"
  if command -v realpath >/dev/null 2>&1; then
    realpath "${path}" 2>/dev/null && return 0
  fi

  local dir=""
  dir="$(cd "$(dirname "${path}")" 2>/dev/null && pwd -P)" || {
    echo "${path}"
    return 0
  }

  echo "${dir}/$(basename "${path}")"
}

get_adb_server_executable() {
  local adb_bin="$1"

  "${adb_bin}" server-status 2>/dev/null | awk -F'"' '/executable_absolute_path:/ { print $2; exit }'
}

ensure_adb_server_owner() {
  local adb_bin="$1"
  local expected_adb=""
  local current_server=""
  local current_server_resolved=""

  # All adb clients share one server on port 5037. Keep release installs on the same
  # binary we selected above, otherwise another tool can leave a stale/mismatched server
  # handling Wi-Fi pairing and reconnects.
  "${adb_bin}" start-server >/dev/null 2>&1 || true

  expected_adb="$(resolve_path "${adb_bin}")"
  current_server="$(get_adb_server_executable "${adb_bin}" || true)"

  if [[ -z "${current_server}" ]]; then
    return 0
  fi

  current_server_resolved="$(resolve_path "${current_server}")"
  if [[ "${current_server_resolved}" == "${expected_adb}" ]]; then
    return 0
  fi

  echo "ADB server is owned by '${current_server}', restarting it with '${adb_bin}'." >&2
  "${adb_bin}" kill-server >/dev/null 2>&1 || true
  sleep 1
  "${adb_bin}" start-server >/dev/null 2>&1

  current_server="$(get_adb_server_executable "${adb_bin}" || true)"
  if [[ -z "${current_server}" ]]; then
    return 0
  fi

  current_server_resolved="$(resolve_path "${current_server}")"
  if [[ "${current_server_resolved}" != "${expected_adb}" ]]; then
    echo "Warning: ADB server is still owned by '${current_server}' after restart." >&2
  fi
}

add_candidate() {
  local candidate="$1"
  if [[ -z "${candidate}" ]]; then
    return 0
  fi

  local existing=""
  for existing in "${CONNECT_CANDIDATES[@]:-}"; do
    if [[ "${existing}" == "${candidate}" ]]; then
      return 0
    fi
  done

  CONNECT_CANDIDATES+=("${candidate}")
}

load_env_file() {
  if [[ -f "${ENV_FILE}" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "${ENV_FILE}"
    set +a
  fi
}

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

collect_existing_physical_serial() {
  local adb_bin="$1"
  local line=""
  local serial=""
  local first_device_serial=""
  while IFS= read -r line; do
    [[ -z "${line}" || "${line}" == List* ]] && continue

    if [[ ! "${line}" =~ ^([^[:space:]]+)[[:space:]]+device([[:space:]]|$) ]]; then
      continue
    fi

    serial="${BASH_REMATCH[1]}"
    # Release QA is physical-device-only. Ignoring emulator transports here prevents
    # Expo from making an emulator install look like successful phone validation.
    if [[ "${serial}" == emulator-* ]]; then
      continue
    fi

    if [[ "${serial}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+$ ]]; then
      echo "${serial}"
      return 0
    fi

    if [[ -z "${first_device_serial}" ]]; then
      first_device_serial="${serial}"
    fi
  done < <("${adb_bin}" devices -l 2>/dev/null || true)

  if [[ -n "${first_device_serial}" ]]; then
    echo "${first_device_serial}"
    return 0
  fi

  return 1
}

collect_mdns_candidates() {
  local adb_bin="$1"
  local preferred_ip="${ADB_WIFI_IP:-}"
  local target="${ADB_WIFI_TARGET:-}"
  local target_ip=""
  local line=""
  local name=""
  local type=""
  local address=""

  if [[ -n "${target}" && "${target}" == *:* ]]; then
    add_candidate "${target}"
    target_ip="${target%%:*}"
  fi

  while IFS= read -r line; do
    [[ -z "${line}" || "${line}" == List* ]] && continue

    address="$(echo "${line}" | awk '{print $NF}')"
    type="$(echo "${line}" | awk '{print $(NF-1)}')"
    name="$(echo "${line}" | awk '{$NF=""; $(NF-1)=""; sub(/[[:space:]]+$/, ""); print}')"

    [[ "${type}" != "_adb-tls-connect._tcp" ]] && continue
    [[ -z "${address}" ]] && continue

    if [[ -n "${target}" ]]; then
      if [[ "${target}" == *:* ]]; then
        add_candidate "${target}"
        if [[ -n "${target_ip}" && "${address}" == "${target_ip}:"* ]]; then
          add_candidate "${address}"
        fi
      elif [[ "${target}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        if [[ "${address}" == "${target}:"* ]]; then
          add_candidate "${address}"
        fi
      elif [[ "${name}" == "${target}"* ]]; then
        add_candidate "${address}"
      fi
      continue
    fi

    if [[ -n "${preferred_ip}" && "${address}" == "${preferred_ip}:"* ]]; then
      add_candidate "${address}"
      continue
    fi

    add_candidate "${address}"
  done < <("${adb_bin}" mdns services 2>/dev/null || true)

  if [[ -n "${target}" && "${target}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    add_candidate "${target}:5555"
  fi
}

# Ask the device itself for its Wi-Fi IP (works for any transport, incl. mDNS
# TLS aliases). Used by both alias-derived candidate discovery and tcpip pinning.
resolve_device_wlan_ip() {
  local adb_bin="$1"
  local serial="$2"
  local device_ip=""

  device_ip="$("${adb_bin}" -s "${serial}" shell ip route 2>/dev/null | awk '/wlan0/ && /src/ {for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}')"
  if [[ -z "${device_ip}" ]]; then
    device_ip="$("${adb_bin}" -s "${serial}" shell ip addr show wlan0 2>/dev/null | awk '/inet / {split($2, parts, "/"); print parts[1]; exit}')"
  fi

  if [[ -z "${device_ip}" ]]; then
    return 1
  fi
  echo "${device_ip}"
}

derive_candidate_from_alias_connection() {
  local adb_bin="$1"
  local server_pid=""
  local line=""
  local alias_serial=""
  local device_ip=""
  local candidate=""

  server_pid="$(lsof -nP -iTCP:5037 -sTCP:LISTEN -t | head -n1)"
  if [[ -z "${server_pid}" ]]; then
    return 1
  fi

  while IFS= read -r line; do
    [[ -z "${line}" || "${line}" == List* ]] && continue
    [[ "${line}" != *"_adb-tls-connect._tcp device "* ]] && continue

    alias_serial="${line%% device *}"
    device_ip="$(resolve_device_wlan_ip "${adb_bin}" "${alias_serial}" || true)"

    [[ -z "${device_ip}" ]] && continue

    candidate="$(lsof -nP -a -p "${server_pid}" -iTCP | awk -v ip="${device_ip}" '$9 ~ ip":" {split($9, parts, "->"); print parts[2]}' | head -n1)"
    if [[ -n "${candidate}" ]]; then
      echo "${candidate}"
      return 0
    fi
  done < <("${adb_bin}" devices -l 2>/dev/null || true)

  return 1
}

connect_candidate() {
  local adb_bin="$1"
  local candidate="$2"
  local attempt=0

  "${adb_bin}" connect "${candidate}" >/dev/null 2>&1 || true

  for attempt in 1 2 3; do
    if [[ "$("${adb_bin}" -s "${candidate}" get-state 2>/dev/null || true)" == "device" ]]; then
      echo "${candidate}"
      return 0
    fi
    sleep 1
  done

  return 1
}

discover_adb_targets() {
  local adb_bin="$1"
  local requested_target="$2"
  local stable_serial=""

  CONNECT_CANDIDATES=()
  DISCOVERED_STABLE_SERIAL=""

  if [[ -z "${requested_target}" ]]; then
    stable_serial="$(collect_existing_physical_serial "${adb_bin}" || true)"
    if [[ -n "${stable_serial}" ]]; then
      DISCOVERED_STABLE_SERIAL="${stable_serial}"
      return 0
    fi
  fi

  collect_mdns_candidates "${adb_bin}"

  if [[ "${#CONNECT_CANDIDATES[@]}" -eq 0 ]]; then
    stable_serial="$(derive_candidate_from_alias_connection "${adb_bin}" || true)"
    if [[ -n "${stable_serial}" ]]; then
      add_candidate "${stable_serial}"
    fi
  fi
}

restart_adb_for_discovery_retry() {
  local adb_bin="$1"
  local reason="$2"

  echo "${reason}; restarting ADB server once before release." >&2
  "${adb_bin}" kill-server >/dev/null 2>&1 || true
  sleep 1
  "${adb_bin}" start-server >/dev/null 2>&1 || true
  ensure_adb_server_owner "${adb_bin}"
  sleep 2
}

connect_candidates() {
  local adb_bin="$1"
  local candidate=""
  local stable_serial=""

  if [[ "${#CONNECT_CANDIDATES[@]}" -eq 0 ]]; then
    return 1
  fi

  echo "Reconnecting Android device over Wi-Fi..." >&2
  "${adb_bin}" disconnect >/dev/null 2>&1 || true

  for candidate in "${CONNECT_CANDIDATES[@]}"; do
    stable_serial="$(connect_candidate "${adb_bin}" "${candidate}" || true)"
    if [[ -n "${stable_serial}" ]]; then
      echo "${stable_serial}"
      return 0
    fi
  done

  return 1
}

# Best-effort pin of the wireless adb connection to port 5555. mDNS-assigned
# ports rotate across reconnects/reboots (killed benchmark runs before — see
# docs/product/faster-builds/), while `adb connect <ip>:5555` stays deterministic.
# Handles both rotating-port `ip:port` serials and mDNS TLS alias serials
# (`adb-...._adb-tls-connect._tcp` — Karim's phone connects this way, so the
# alias path is the one that actually fires day-to-day; added round 2 2026-07).
# `adb tcpip 5555` restarts adbd and drops the live connection, hence the
# reconnect loop below and the strict fallback: never fail the build because
# pinning failed — keep the just-working original serial instead.
pin_tcpip_port() {
  local adb_bin="$1"
  local serial="$2"
  local ip=""
  local pinned=""
  local attempt=0

  if [[ "${serial}" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+$ ]]; then
    if [[ "${serial}" == *":5555" ]]; then
      echo "${serial}"
      return 0
    fi
    ip="${serial%%:*}"
  elif [[ "${serial}" == *"_adb-tls-connect._tcp"* ]]; then
    ip="$(resolve_device_wlan_ip "${adb_bin}" "${serial}" || true)"
    if [[ -z "${ip}" ]]; then
      echo "Note: could not resolve device Wi-Fi IP; keeping serial ${serial}." >&2
      echo "${serial}"
      return 0
    fi
  else
    # USB or emulator serial — nothing to pin.
    echo "${serial}"
    return 0
  fi

  pinned="${ip}:5555"

  if ! "${adb_bin}" -s "${serial}" tcpip 5555 >/dev/null 2>&1; then
    echo "Note: could not pin adb to port 5555; keeping serial ${serial}." >&2
    echo "${serial}"
    return 0
  fi

  for attempt in $(seq 1 10); do
    "${adb_bin}" connect "${pinned}" >/dev/null 2>&1 || true
    if [[ "$("${adb_bin}" -s "${pinned}" get-state 2>/dev/null || true)" == "device" ]]; then
      echo "Pinned adb connection to ${pinned}." >&2
      echo "${pinned}"
      return 0
    fi
    sleep 1
  done

  # Pinning restarted adbd, so the original serial may be gone too — try to
  # reconnect it once before giving up on this run's serial. (For alias serials
  # newer adb versions accept the service name in `adb connect`; best-effort.)
  "${adb_bin}" connect "${serial}" >/dev/null 2>&1 || true
  echo "Note: pinning to ${pinned} failed after 10s; keeping serial ${serial}." >&2
  echo "${serial}"
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
  load_env_file
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
  local restarted_discovery=0
  CONNECT_CANDIDATES=()

  discover_adb_targets "${adb_bin}" "${requested_target}"
  stable_serial="${DISCOVERED_STABLE_SERIAL}"

  if [[ -z "${stable_serial}" && "${#CONNECT_CANDIDATES[@]}" -eq 0 ]]; then
    restart_adb_for_discovery_retry "${adb_bin}" "ADB discovery found no connected devices or wireless services"
    restarted_discovery=1
    discover_adb_targets "${adb_bin}" "${requested_target}"
    stable_serial="${DISCOVERED_STABLE_SERIAL}"
  fi

  if [[ -z "${stable_serial}" ]]; then
    stable_serial="$(connect_candidates "${adb_bin}" || true)"
  fi

  if [[ -z "${stable_serial}" && "${restarted_discovery}" -eq 0 ]]; then
    restart_adb_for_discovery_retry "${adb_bin}" "ADB candidates did not connect"
    discover_adb_targets "${adb_bin}" "${requested_target}"
    stable_serial="${DISCOVERED_STABLE_SERIAL}"
    if [[ -z "${stable_serial}" ]]; then
      stable_serial="$(connect_candidates "${adb_bin}" || true)"
    fi
  fi

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
