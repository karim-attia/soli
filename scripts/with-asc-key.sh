#!/bin/bash
# Runs a command with the App Store Connect API key path in the environment:
#   scripts/with-asc-key.sh npx eas-cli submit ...
#
# eas.json (submit.production.ios) holds the Key ID + Issuer ID (not secret) and
# `"ascApiKeyPath": "$SOLI_ASC_API_KEY_PATH"`; eas-cli expands $VARS in exactly
# these three fields. The .p8 itself stays OUTSIDE the repo (public repo, and
# the EAS build archive uploads the project directory), so nothing key-shaped
# and no machine-specific path is committed. Decided 2026-11-26: simpler than a
# gitignored symlink inside the repo, and `eas submit --non-interactive` ignores
# the EXPO_ASC_* variables ("API Keys cannot be set up in --non-interactive
# mode"), so the key has to come through eas.json.
set -euo pipefail

export SOLI_ASC_API_KEY_PATH="${SOLI_ASC_API_KEY_PATH:-$HOME/.config/soli/AuthKey_3DC38PC55T.p8}"

if [ ! -f "${SOLI_ASC_API_KEY_PATH}" ]; then
  echo "Error: App Store Connect API key not found at '${SOLI_ASC_API_KEY_PATH}'." >&2
  echo "Put AuthKey_3DC38PC55T.p8 there (chmod 600) or set SOLI_ASC_API_KEY_PATH." >&2
  echo "See docs/external-package-guides/eas-submit.md." >&2
  exit 1
fi

exec "$@"
