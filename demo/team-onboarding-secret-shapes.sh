#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

check_json="/tmp/secretshape-team-onboarding-check.json"
docs_md="/tmp/secretshape-team-onboarding.md"

node src/cli.js check \
  --schema examples/team-onboarding/secretshape.yaml \
  --example examples/team-onboarding/.env.example \
  --json > "$check_json"

node src/cli.js docs \
  --schema examples/team-onboarding/secretshape.yaml \
  --out "$docs_md"

grep -q '"ok": true' "$check_json"
grep -q "GITHUB_TOKEN" "$docs_md"
grep -q "OPENAI_API_KEY" "$docs_md"

echo "Wrote $check_json and $docs_md"
