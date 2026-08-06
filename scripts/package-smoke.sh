#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

package_name="$(npm pack --silent --pack-destination "$tmpdir")"
consumer="$tmpdir/consumer"
mkdir "$consumer"
cd "$consumer"
npm init --yes --silent >/dev/null
npm install --silent --ignore-scripts "$tmpdir/$package_name"

cli="$consumer/node_modules/.bin/secretshape"
basic="$repo_root/examples/basic"

"$cli" check --schema "$basic/secretshape.yaml" --example "$basic/.env.example" > check.out
grep -q '^secretshape: ok$' check.out

if "$cli" check --schema missing.yaml --example missing.env > invalid.out 2> invalid.err; then
  echo "expected invalid input to return non-zero" >&2
  exit 1
fi
test ! -s invalid.out
grep -q 'ENOENT' invalid.err

mkdir init
cd init
"$cli" init > init.out
grep -q '^created secretshape.yaml$' init.out
test -s secretshape.yaml

"$cli" docs --schema secretshape.yaml --out docs/secrets.md > docs.out
grep -q '^wrote docs/secrets.md$' docs.out
grep -q 'API_KEY' docs/secrets.md
