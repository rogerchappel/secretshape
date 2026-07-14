#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${ROOT_DIR}/demo/output"

mkdir -p "${OUT_DIR}"

node "${ROOT_DIR}/src/cli.js" check \
  --schema "${ROOT_DIR}/examples/basic/secretshape.yaml" \
  --example "${ROOT_DIR}/examples/basic/.env.example"

node "${ROOT_DIR}/src/cli.js" check \
  --schema "${ROOT_DIR}/examples/basic/secretshape.yaml" \
  --example "${ROOT_DIR}/examples/basic/.env.example" \
  --json > "${OUT_DIR}/basic-check.json"

node "${ROOT_DIR}/src/cli.js" docs \
  --schema "${ROOT_DIR}/examples/basic/secretshape.yaml" \
  --out "${OUT_DIR}/secrets.md"

test -s "${OUT_DIR}/basic-check.json"
test -s "${OUT_DIR}/secrets.md"

printf 'Wrote %s\n' "${OUT_DIR}/basic-check.json"
printf 'Wrote %s\n' "${OUT_DIR}/secrets.md"
