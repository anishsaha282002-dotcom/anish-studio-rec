#!/usr/bin/env bash
# Fail the build if read-only violations appear in src/
set -euo pipefail

PATTERNS=(
  'Keypair'
  'signTransaction'
  'sendTransaction'
  'PRIVATE_KEY'
)

FOUND=0
for pattern in "${PATTERNS[@]}"; do
  if rg -n --glob '*.ts' "$pattern" src/ 2>/dev/null; then
    echo "ERROR: Found forbidden pattern '$pattern' in src/" >&2
    FOUND=1
  fi
done

if [ "$FOUND" -ne 0 ]; then
  echo "Read-only check failed. This project must never sign or submit transactions." >&2
  exit 1
fi

echo "Read-only check passed."
