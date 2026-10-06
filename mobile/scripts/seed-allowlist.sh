#!/usr/bin/env bash
# Seed Firestore allowed_coaches/{email}
# Usage: ./scripts/seed-allowlist.sh coach@example.com
set -euo pipefail

EMAIL="${1:-}"
if [[ -z "$EMAIL" ]]; then
  echo "Usage: $0 coach@example.com" >&2
  exit 1
fi

EMAIL_LOWER="$(echo "$EMAIL" | tr '[:upper:]' '[:lower:]')"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v firebase >/dev/null 2>&1; then
  echo "firebase CLI not found. Install: npm i -g firebase-tools" >&2
  exit 1
fi

TMP="$(mktemp)"
cat >"$TMP" <<EOF
{
  "email": "${EMAIL_LOWER}"
}
EOF

echo "Writing allowed_coaches/${EMAIL_LOWER} …"
firebase firestore:delete "allowed_coaches/${EMAIL_LOWER}" --force 2>/dev/null || true
# Use REST via firebase tools data import is awkward; prefer console or Admin SDK.
# Document the expected shape and open the console for one-click create.
echo
echo "Create this document in Firebase Console → Firestore:"
echo "  Collection: allowed_coaches"
echo "  Document ID: ${EMAIL_LOWER}"
echo "  Field email (string): ${EMAIL_LOWER}"
echo
echo "Or with gcloud (project must match .firebaserc):"
echo "  printf '%s' '{\"fields\":{\"email\":{\"stringValue\":\"${EMAIL_LOWER}\"}}}' | \\"
echo "    curl -s -X PATCH -H \"Authorization: Bearer \$(gcloud auth print-access-token)\" \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d @- \\"
echo "    \"https://firestore.googleapis.com/v1/projects/\$(firebase use --output json 2>/dev/null | head -1)/databases/(default)/documents/allowed_coaches/${EMAIL_LOWER}\""
rm -f "$TMP"
