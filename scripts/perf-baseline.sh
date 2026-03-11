#!/usr/bin/env bash

set -euo pipefail

# Requirement perf-baseline: deterministic on-device gameplay profiling with repeatable inputs.

DEFAULT_RUNS=3
DEFAULT_PACKAGE_NAME="ch.karimattia.soli"
DEFAULT_ACTIVITY_NAME="ch.karimattia.soli.MainActivity"
DEFAULT_DEMO_TAP_X=515
DEFAULT_DEMO_TAP_Y=210
DEFAULT_DRAW_TAP_X=1000
DEFAULT_DRAW_TAP_Y=716
DEFAULT_UNDO_TAP_X=703
DEFAULT_UNDO_TAP_Y=713
DEFAULT_DRAW_TAPS=25
DEFAULT_UNDO_TAPS=8
DEFAULT_POST_LAUNCH_SLEEP_SEC=2
DEFAULT_POST_DEMO_SLEEP_SEC=3
DEFAULT_DRAW_SLEEP_SEC=0.35
DEFAULT_UNDO_SLEEP_SEC=0.30
DEFAULT_MAX_ATTEMPTS_PER_RUN=3

ADB_BIN="${ADB_BIN:-/Users/karim/Library/Android/sdk/platform-tools/adb}"
RUNS="${1:-$DEFAULT_RUNS}"
PACKAGE_NAME="${PACKAGE_NAME:-$DEFAULT_PACKAGE_NAME}"
ACTIVITY_NAME="${ACTIVITY_NAME:-$DEFAULT_ACTIVITY_NAME}"
SERIAL="${ADB_SERIAL:-}"

DEMO_TAP_X="${DEMO_TAP_X:-$DEFAULT_DEMO_TAP_X}"
DEMO_TAP_Y="${DEMO_TAP_Y:-$DEFAULT_DEMO_TAP_Y}"
DRAW_TAP_X="${DRAW_TAP_X:-$DEFAULT_DRAW_TAP_X}"
DRAW_TAP_Y="${DRAW_TAP_Y:-$DEFAULT_DRAW_TAP_Y}"
UNDO_TAP_X="${UNDO_TAP_X:-$DEFAULT_UNDO_TAP_X}"
UNDO_TAP_Y="${UNDO_TAP_Y:-$DEFAULT_UNDO_TAP_Y}"

DRAW_TAPS="${DRAW_TAPS:-$DEFAULT_DRAW_TAPS}"
UNDO_TAPS="${UNDO_TAPS:-$DEFAULT_UNDO_TAPS}"
POST_LAUNCH_SLEEP_SEC="${POST_LAUNCH_SLEEP_SEC:-$DEFAULT_POST_LAUNCH_SLEEP_SEC}"
POST_DEMO_SLEEP_SEC="${POST_DEMO_SLEEP_SEC:-$DEFAULT_POST_DEMO_SLEEP_SEC}"
DRAW_SLEEP_SEC="${DRAW_SLEEP_SEC:-$DEFAULT_DRAW_SLEEP_SEC}"
UNDO_SLEEP_SEC="${UNDO_SLEEP_SEC:-$DEFAULT_UNDO_SLEEP_SEC}"
MAX_ATTEMPTS_PER_RUN="${MAX_ATTEMPTS_PER_RUN:-$DEFAULT_MAX_ATTEMPTS_PER_RUN}"

if ! [[ "$RUNS" =~ ^[0-9]+$ ]] || [[ "$RUNS" -lt 1 ]]; then
  echo "RUNS must be a positive integer. Got: $RUNS" >&2
  exit 1
fi

if ! [[ "$MAX_ATTEMPTS_PER_RUN" =~ ^[0-9]+$ ]] || [[ "$MAX_ATTEMPTS_PER_RUN" -lt 1 ]]; then
  echo "MAX_ATTEMPTS_PER_RUN must be a positive integer. Got: $MAX_ATTEMPTS_PER_RUN" >&2
  exit 1
fi

if [[ ! -x "$ADB_BIN" ]]; then
  echo "ADB binary not found or not executable: $ADB_BIN" >&2
  exit 1
fi

detect_serial() {
  "$ADB_BIN" devices | awk 'NR>1 && $2=="device" { print $1; exit }'
}

if [[ -z "$SERIAL" ]]; then
  SERIAL="$(detect_serial || true)"
fi

if [[ -z "$SERIAL" ]]; then
  echo "No connected Android device found. Set ADB_SERIAL or connect a device." >&2
  exit 1
fi

extract_metric() {
  local content="$1"
  local label="$2"
  printf '%s\n' "$content" | sed -n "s/^${label}: //p" | head -n 1
}

sum_frames=0
sum_janky=0
sum_janky_pct=0
sum_p50=0
sum_p90=0
sum_p95=0
sum_p99=0
sum_slow_ui=0
sum_slow_draw=0

timestamp="$(date '+%Y-%m-%d %H:%M:%S')"

echo "Baseline run started at $timestamp"
echo "Device serial: $SERIAL"
echo "Package: $PACKAGE_NAME"
echo "Runs: $RUNS"
echo
echo "| Run | Frames | Janky | Janky % | P50 (ms) | P90 (ms) | P95 (ms) | P99 (ms) | Slow UI | Slow Draw |"
echo "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"

for run_index in $(seq 1 "$RUNS"); do
  attempt=1
  while true; do
    "$ADB_BIN" -s "$SERIAL" shell dumpsys gfxinfo "$PACKAGE_NAME" reset >/dev/null
    "$ADB_BIN" -s "$SERIAL" shell am start -n "$PACKAGE_NAME/$ACTIVITY_NAME" >/dev/null 2>&1
    sleep "$POST_LAUNCH_SLEEP_SEC"

    "$ADB_BIN" -s "$SERIAL" shell input tap "$DEMO_TAP_X" "$DEMO_TAP_Y"
    sleep "$POST_DEMO_SLEEP_SEC"

    for _ in $(seq 1 "$DRAW_TAPS"); do
      "$ADB_BIN" -s "$SERIAL" shell input tap "$DRAW_TAP_X" "$DRAW_TAP_Y"
      sleep "$DRAW_SLEEP_SEC"
    done

    for _ in $(seq 1 "$UNDO_TAPS"); do
      "$ADB_BIN" -s "$SERIAL" shell input tap "$UNDO_TAP_X" "$UNDO_TAP_Y"
      sleep "$UNDO_SLEEP_SEC"
    done

    gfx_segment="$("$ADB_BIN" -s "$SERIAL" shell dumpsys gfxinfo "$PACKAGE_NAME" \
      | sed -n '/\*\* Graphics info for pid/,/Profile data in ms/p')"

    frames="$(extract_metric "$gfx_segment" "Total frames rendered")"
    frames="${frames:-0}"

    if [[ "$frames" =~ ^[0-9]+$ ]] && [[ "$frames" -gt 0 ]]; then
      break
    fi

    if [[ "$attempt" -ge "$MAX_ATTEMPTS_PER_RUN" ]]; then
      echo "Failed to capture valid frame stats for run ${run_index} after ${MAX_ATTEMPTS_PER_RUN} attempts." >&2
      exit 1
    fi

    echo "Retrying run ${run_index} (attempt $((attempt + 1))/${MAX_ATTEMPTS_PER_RUN}) due to invalid frame sample..." >&2
    attempt=$((attempt + 1))
    sleep 1
  done

  janky_line="$(extract_metric "$gfx_segment" "Janky frames")"
  p50_raw="$(extract_metric "$gfx_segment" "50th percentile")"
  p90_raw="$(extract_metric "$gfx_segment" "90th percentile")"
  p95_raw="$(extract_metric "$gfx_segment" "95th percentile")"
  p99_raw="$(extract_metric "$gfx_segment" "99th percentile")"
  slow_ui="$(extract_metric "$gfx_segment" "Number Slow UI thread")"
  slow_draw="$(extract_metric "$gfx_segment" "Number Slow issue draw commands")"

  janky_count="$(printf '%s\n' "$janky_line" | sed -E 's/^([0-9]+).*/\1/')"
  janky_pct="$(printf '%s\n' "$janky_line" | sed -E 's/^[0-9]+ \(([^)]+)\).*/\1/')"
  p50="$(printf '%s\n' "$p50_raw" | sed 's/ms//')"
  p90="$(printf '%s\n' "$p90_raw" | sed 's/ms//')"
  p95="$(printf '%s\n' "$p95_raw" | sed 's/ms//')"
  p99="$(printf '%s\n' "$p99_raw" | sed 's/ms//')"

  sum_frames=$((sum_frames + frames))
  sum_janky=$((sum_janky + janky_count))
  sum_p50=$((sum_p50 + p50))
  sum_p90=$((sum_p90 + p90))
  sum_p95=$((sum_p95 + p95))
  sum_p99=$((sum_p99 + p99))
  sum_slow_ui=$((sum_slow_ui + slow_ui))
  sum_slow_draw=$((sum_slow_draw + slow_draw))
  sum_janky_pct="$(awk -v a="$sum_janky_pct" -v b="${janky_pct%\%}" 'BEGIN { printf "%.4f", a + b }')"

  echo "| ${run_index} | ${frames} | ${janky_count} | ${janky_pct} | ${p50} | ${p90} | ${p95} | ${p99} | ${slow_ui} | ${slow_draw} |"
done

avg_frames="$(awk -v s="$sum_frames" -v n="$RUNS" 'BEGIN { printf "%.2f", s / n }')"
avg_janky="$(awk -v s="$sum_janky" -v n="$RUNS" 'BEGIN { printf "%.2f", s / n }')"
avg_janky_pct="$(awk -v s="$sum_janky_pct" -v n="$RUNS" 'BEGIN { printf "%.2f%%", s / n }')"
avg_p50="$(awk -v s="$sum_p50" -v n="$RUNS" 'BEGIN { printf "%.2f", s / n }')"
avg_p90="$(awk -v s="$sum_p90" -v n="$RUNS" 'BEGIN { printf "%.2f", s / n }')"
avg_p95="$(awk -v s="$sum_p95" -v n="$RUNS" 'BEGIN { printf "%.2f", s / n }')"
avg_p99="$(awk -v s="$sum_p99" -v n="$RUNS" 'BEGIN { printf "%.2f", s / n }')"
avg_slow_ui="$(awk -v s="$sum_slow_ui" -v n="$RUNS" 'BEGIN { printf "%.2f", s / n }')"
avg_slow_draw="$(awk -v s="$sum_slow_draw" -v n="$RUNS" 'BEGIN { printf "%.2f", s / n }')"

echo "| Avg | ${avg_frames} | ${avg_janky} | ${avg_janky_pct} | ${avg_p50} | ${avg_p90} | ${avg_p95} | ${avg_p99} | ${avg_slow_ui} | ${avg_slow_draw} |"
