import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const artifact = '${{ steps.package.outputs.tarball }}';

async function workflow(name) {
  return readFile(new URL(`../.github/workflows/${name}`, import.meta.url), 'utf8');
}

function occurrences(source, value) {
  return source.split(value).length - 1;
}

test('tag release publishes and attaches the single captured tarball', async () => {
  const source = await workflow('release.yml');

  assert.equal(occurrences(source, 'npm pack --silent'), 1, 'release must pack exactly once');
  assert.match(source, /id: package/);
  assert.match(source, /echo "tarball=\$tarball" >> "\$GITHUB_OUTPUT"/);
  assert.ok(
    source.includes(`npm publish "${artifact}" --access public --provenance`),
    'release must publish the captured artifact with provenance',
  );
  assert.ok(
    source.includes(`gh release create "\${GITHUB_REF_NAME}" --notes-file RELEASE_NOTES.md "${artifact}"`),
    'GitHub release must receive the same captured artifact',
  );
  assert.doesNotMatch(source, /gh release create[^\n]*\*\.tgz/);
});

test('PR release dry run packs once and dry-runs publication of that artifact', async () => {
  const source = await workflow('release-dry-run.yml');

  assert.equal(occurrences(source, 'npm pack --silent'), 1, 'dry run must pack exactly once');
  assert.match(source, /registry-url: https:\/\/registry\.npmjs\.org/);
  assert.ok(
    source.includes(`npm publish "${artifact}" --access public --dry-run`),
    'dry run must exercise publication of the captured artifact',
  );
});
