#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="${TMPDIR:-/tmp}/secretshape-ci-gate"
REPORT_JSON="${OUT_DIR}/secretshape-check.json"
DOCS_MD="${OUT_DIR}/secrets.md"

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

node "${ROOT_DIR}/src/cli.js" check \
  --schema "${ROOT_DIR}/examples/basic/secretshape.yaml" \
  --example "${ROOT_DIR}/examples/basic/.env.example" \
  --json > "${REPORT_JSON}"

node "${ROOT_DIR}/src/cli.js" docs \
  --schema "${ROOT_DIR}/examples/basic/secretshape.yaml" \
  --out "${DOCS_MD}"

grep -q '"ok": true' "${REPORT_JSON}"
grep -q '"schemaSecrets": 2' "${REPORT_JSON}"
test -s "${DOCS_MD}"

printf 'SecretShape JSON report: %s\n' "${REPORT_JSON}"
printf 'Generated secret docs: %s\n' "${DOCS_MD}"
