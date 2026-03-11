#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
EXPO_RELEASE_COMMAND=(yarn expo run:android --variant release)
CONNECT_CANDIDATES=()

pick_adb() {
  if [[ -n "${ADB_BIN:-}" && -x "${ADB_BIN}" ]]; then
    echo "${ADB_BIN}"
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

collect_existing_serial() {
  local adb_bin="$1"
  local line=""
  while IFS= read -r line; do
    [[ -z "${line}" || "${line}" == List* ]] && continue

    if [[ "${line}" =~ ^([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:[0-9]+)[[:space:]]+device\b ]]; then
      echo "${BASH_REMATCH[1]}"
      return 0
    fi
  done < <("${adb_bin}" devices -l 2>/dev/null || true)

  return 1
}

collect_mdns_candidates() {
  local adb_bin="$1"
  local preferred_ip="${ADB_WIFI_IP:-}"
  local target="${ADB_WIFI_TARGET:-}"
  local line=""
  local name=""
  local type=""
  local address=""

  if [[ -n "${target}" && "${target}" == *:* ]]; then
    add_candidate "${target}"
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
    device_ip="$("${adb_bin}" -s "${alias_serial}" shell ip route 2>/dev/null | awk '/wlan0/ && /src/ {for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}')"
    if [[ -z "${device_ip}" ]]; then
      device_ip="$("${adb_bin}" -s "${alias_serial}" shell ip addr show wlan0 2>/dev/null | awk '/inet / {split($2, parts, "/"); print parts[1]; exit}')"
    fi

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

main() {
  cd "${ROOT_DIR}"
  load_env_file

  local adb_bin=""
  local requested_target="${ADB_WIFI_TARGET:-}"
  adb_bin="$(pick_adb)"
  if [[ -z "${adb_bin}" ]]; then
    echo "Error: adb not found" >&2
    exit 1
  fi

  local stable_serial=""
  CONNECT_CANDIDATES=()

  if [[ -z "${requested_target}" ]]; then
    stable_serial="$(collect_existing_serial "${adb_bin}" || true)"
    if [[ -n "${stable_serial}" ]]; then
      add_candidate "${stable_serial}"
    fi
  fi

  collect_mdns_candidates "${adb_bin}"
  if [[ "${#CONNECT_CANDIDATES[@]}" -eq 0 ]]; then
    stable_serial="$(derive_candidate_from_alias_connection "${adb_bin}" || true)"
    if [[ -n "${stable_serial}" ]]; then
      add_candidate "${stable_serial}"
    fi
  fi

  if [[ "${#CONNECT_CANDIDATES[@]}" -gt 0 ]]; then
    local candidate=""
    echo "Reconnecting Android device over Wi-Fi..." >&2
    "${adb_bin}" disconnect >/dev/null 2>&1 || true

    stable_serial=""
    for candidate in "${CONNECT_CANDIDATES[@]}"; do
      stable_serial="$(connect_candidate "${adb_bin}" "${candidate}" || true)"
      if [[ -n "${stable_serial}" ]]; then
        export ANDROID_SERIAL="${stable_serial}"
        break
      fi
    done

    if [[ -z "${stable_serial}" ]]; then
      echo "Warning: could not establish a stable Wi-Fi adb serial; continuing with Expo device detection." >&2
    fi
  fi

  "${EXPO_RELEASE_COMMAND[@]}"
}

main "$@"
