#!/bin/bash
# Build Android Release Bundle with upload-keystore signing.

set -euo pipefail

ENV_FILE=".env"
REQUIRED_SIGNING_KEYS=(
  "SOLI_UPLOAD_STORE_FILE"
  "SOLI_UPLOAD_STORE_PASSWORD"
  "SOLI_UPLOAD_KEY_ALIAS"
  "SOLI_UPLOAD_KEY_PASSWORD"
)

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

# Navigate to android directory and build.
cd android
echo "Building Android App Bundle..."
./gradlew bundleRelease

echo "Build completed: android/app/build/outputs/bundle/release/app-release.aab"
