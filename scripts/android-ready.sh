#!/usr/bin/env bash

# scripts/android-ready.sh [--keep-awake] — one preflight/recovery command for
# the physical Android phone, for the POST-build iterative-driving loop
# (deep links + agent-device over wireless adb).
#
# Built on the SAME discovery/pinning as `yarn release`: it sources
# scripts/lib/adb-discovery.sh (server-ownership repair, mDNS/env-target
# candidate collection, bounded restart-and-retry, tcpip :5555 pinning) and
# adds what the driving loop needs on top: wake, unlock (via the local-only
# unlock script when present), optional keep-awake. Pinning is included on
# purpose — port rotation after a doze is the root cause of the dropped
# connections this command exists to recover from, and pin_tcpip_port
# short-circuits when the serial is already <ip>:5555. No daemons and no
# `svc power stayon` — the screen-timeout restore stays a printed command.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNLOCK_SCRIPT="${ROOT_DIR}/scripts/android-unlock-pattern.sh"
# Matches TEMP_SCREEN_OFF_TIMEOUT_MS used by --auto-solve in build-install-android.js.
KEEP_AWAKE_TIMEOUT_MS=600000

# shellcheck source=lib/adb-discovery.sh
source "${ROOT_DIR}/scripts/lib/adb-discovery.sh"

KEEP_AWAKE=0
for arg in "$@"; do
  case "${arg}" in
    --keep-awake) KEEP_AWAKE=1 ;;
    --help|-h) echo "Usage: scripts/android-ready.sh [--keep-awake]"; exit 0 ;;
    *) echo "Unknown argument: ${arg} (usage: scripts/android-ready.sh [--keep-awake])" >&2; exit 1 ;;
  esac
done

# .env may hold ADB_WIFI_TARGET / ADB_WIFI_IP — same source yarn release uses.
load_env_file "${ROOT_DIR}/.env"

ADB="$(pick_adb)"
if [[ -z "${ADB}" ]]; then
  echo "Error: adb not found." >&2
  exit 1
fi
ensure_adb_server_owner "${ADB}"

# Multi-device guard stays LOCAL to this script: the shared
# collect_existing_physical_serial deliberately returns the first device on
# multiples (release flow), but the driving loop must never guess between
# devices — one might be Karim's main phone with a different app state.
list_physical_serials() {
  "${ADB}" devices | awk 'NR>1 && $2=="device" && $1 !~ /^emulator-/ {print $1}'
}

SERIAL=""
if [[ -n "${ANDROID_SERIAL:-}" ]]; then
  # Explicit serial that is already live wins outright (existing behavior);
  # a dead ANDROID_SERIAL falls through to the shared discovery below.
  if [[ "$("${ADB}" -s "${ANDROID_SERIAL}" get-state 2>/dev/null || true)" == "device" ]]; then
    SERIAL="${ANDROID_SERIAL}"
  fi
else
  SERIALS=()
  while IFS= read -r line; do [[ -n "${line}" ]] && SERIALS+=("${line}"); done < <(list_physical_serials)
  if [[ "${#SERIALS[@]}" -gt 1 ]]; then
    echo "Error: multiple adb devices connected; set ANDROID_SERIAL. Found: ${SERIALS[*]}" >&2
    exit 1
  fi
fi

if [[ -z "${SERIAL}" ]]; then
  # Full shared flow: discovery → restart-retry → connect (bounded — replaces
  # the old bespoke 120s poll loop with the exact sequencing yarn release uses).
  SERIAL="$(discover_and_connect_device "${ADB}" "${ADB_WIFI_TARGET:-}" || true)"
fi
if [[ -z "${SERIAL}" ]]; then
  echo "Error: no Android device reachable after discovery retries." >&2
  echo "Check Wireless debugging on the phone (or ask Karim), then rerun." >&2
  exit 1
fi

# Pin to <ip>:5555 like yarn release does — no-op when already pinned, and a
# graceful keep-the-working-serial fallback otherwise.
SERIAL="$(pin_tcpip_port "${ADB}" "${SERIAL}")"

# Wake — a key event, harmless no-op when already awake (unlike gestures).
"${ADB}" -s "${SERIAL}" shell input keyevent KEYCODE_WAKEUP >/dev/null
sleep 1

# Unlock — the pattern script is gitignored/local-only (contains the device's
# unlock pattern), and is a safe no-op when already unlocked.
if [[ -x "${UNLOCK_SCRIPT}" ]]; then
  "${UNLOCK_SCRIPT}" --serial "${SERIAL}" || echo "Warning: unlock attempt did not confirm an unlocked keyguard." >&2
else
  echo "Note: ${UNLOCK_SCRIPT} not present (local-only) — skipped unlock; unlock manually if at the lockscreen." >&2
fi

if [[ "${KEEP_AWAKE}" -eq 1 ]]; then
  OLD_TIMEOUT="$("${ADB}" -s "${SERIAL}" shell settings get system screen_off_timeout | tr -d '\r\n' || true)"
  "${ADB}" -s "${SERIAL}" shell settings put system screen_off_timeout "${KEEP_AWAKE_TIMEOUT_MS}"
  echo "Raised screen-off timeout to ${KEEP_AWAKE_TIMEOUT_MS}ms (was ${OLD_TIMEOUT:-unknown})."
  echo "Restore after the session with:"
  echo "  adb -s ${SERIAL} shell settings put system screen_off_timeout ${OLD_TIMEOUT:-<old-value>}"
fi

WAKEFULNESS="$("${ADB}" -s "${SERIAL}" shell dumpsys power 2>/dev/null | grep -m1 -o 'mWakefulness=[A-Za-z]*' || true)"
if "${ADB}" -s "${SERIAL}" shell dumpsys window 2>/dev/null | grep -Eq 'mKeyguardUnlocked=\s*true|isKeyguardShowing=false'; then
  KEYGUARD="unlocked"
else
  KEYGUARD="LOCKED"
fi
echo "Ready: ${SERIAL} · ${WAKEFULNESS:-mWakefulness=unknown} · ${KEYGUARD}"
