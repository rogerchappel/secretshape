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

package_file="$(npm pack --silent --pack-destination "$tmpdir")"
mkdir "$tmpdir/consumer"
cd "$tmpdir/consumer"
npm init --yes --silent >/dev/null
npm install --silent --ignore-scripts --no-audit --no-fund "$tmpdir/$package_file"

for help_arg in --help -h; do
  mkdir "$tmpdir/help-${help_arg#-}"
  cd "$tmpdir/help-${help_arg#-}"
  "$tmpdir/consumer/node_modules/.bin/secretshape" "$help_arg" >stdout 2>stderr
  grep -q '^Usage:' stdout
  test ! -s stderr
  test ! -e secretshape.yaml
done

for invalid_arg in unexpected --bogus; do
  invalid_dir="$tmpdir/invalid-${invalid_arg#-}"
  mkdir "$invalid_dir"
  cd "$invalid_dir"
  if "$tmpdir/consumer/node_modules/.bin/secretshape" init "$invalid_arg" >stdout 2>stderr; then
    echo "init unexpectedly accepted $invalid_arg" >&2
    exit 1
  fi
  test ! -s stdout
  grep -q 'unexpected argument' stderr
  test ! -e secretshape.yaml
done
