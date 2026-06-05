#!/usr/bin/env bash
set -euo pipefail

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

cat > "$tmpdir/secretshape.yaml" <<'YAML'
secrets:
  API_KEY:
    required: true
    pattern: "^sk_[A-Za-z0-9]+$"
    description: API key used by the app
YAML

cat > "$tmpdir/.env.example" <<'ENV'
API_KEY=sk_example
ENV

node src/cli.js check --schema "$tmpdir/secretshape.yaml" --example "$tmpdir/.env.example" --json > "$tmpdir/check.json"
node src/cli.js docs --schema "$tmpdir/secretshape.yaml" --out "$tmpdir/secrets.md"
grep -q "API_KEY" "$tmpdir/secrets.md"
