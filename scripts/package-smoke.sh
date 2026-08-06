#!/usr/bin/env bash
set -euo pipefail

tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/secretshape-package-smoke.XXXXXX")"
trap 'rm -rf "$tmpdir"' EXIT

package_name="$(npm pack --silent --pack-destination "$tmpdir")"
package_tarball="$tmpdir/$package_name"

expected_package_files=(
  "package/demo/ci-secretshape-gate.sh"
  "package/demo/team-onboarding-secret-shapes.sh"
  "package/demo/validate-secret-docs.sh"
  "package/docs/promo/ci-secretshape-gate-video-brief.md"
  "package/docs/promo/social-hooks.md"
  "package/docs/tutorials/secret-docs-without-values.md"
  "package/docs/tutorials/team-onboarding-secret-shapes.md"
  "package/examples/basic/.env.example"
  "package/examples/basic/secretshape.yaml"
  "package/examples/team-onboarding/.env.example"
  "package/examples/team-onboarding/secretshape.yaml"
)

package_files="$(tar -tzf "$package_tarball")"
for expected_file in "${expected_package_files[@]}"; do
  grep -Fqx "$expected_file" <<< "$package_files"
done

consumer="$tmpdir/consumer"
mkdir "$consumer"
cd "$consumer"
npm init --yes --silent >/dev/null
npm install --silent --ignore-scripts "$package_tarball"

cli="$consumer/node_modules/.bin/secretshape"
installed_package="$consumer/node_modules/secretshape"
basic="$installed_package/examples/basic"

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

cd "$installed_package"
mkdir "$tmpdir/demo-tmp"
for demo_script in demo/*.sh; do
  test -x "$demo_script"
  TMPDIR="$tmpdir/demo-tmp" bash "$demo_script"
done
