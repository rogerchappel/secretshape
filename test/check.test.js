import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { checkFiles } from "../src/check.js";

const fixture = (name, file) => new URL(`./fixtures/${name}/${file}`, import.meta.url).pathname;

test("passes when example matches schema", async () => {
  const result = await checkFiles({
    schemaPath: fixture("passing", "secretshape.yaml"),
    examplePath: fixture("passing", ".env.example"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.summary.errors, 0);
});

test("reports missing required secrets", async () => {
  const result = await checkFiles({
    schemaPath: fixture("missing", "secretshape.yaml"),
    examplePath: fixture("missing", ".env.example"),
  });

  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "missing_required");
  assert.equal(result.issues[0].name, "API_KEY");
});

test("reports stale documented secrets as warnings", async () => {
  const result = await checkFiles({
    schemaPath: fixture("stale", "secretshape.yaml"),
    examplePath: fixture("stale", ".env.example"),
  });

  assert.equal(result.ok, true);
  assert.equal(result.issues[0].code, "stale");
  assert.equal(result.issues[0].severity, "warning");
});

test("does not expose invalid secret values in issues", async () => {
  const result = await checkFiles({
    schemaPath: fixture("invalid", "secretshape.yaml"),
    examplePath: fixture("invalid", ".env.example"),
  });

  const serialized = JSON.stringify(result);
  assert.equal(result.ok, false);
  assert.match(serialized, /pattern_mismatch/);
  assert.match(serialized, /enum_mismatch/);
  assert.doesNotMatch(serialized, /not-a-real-secret-value/);
});

test("duplicate variables fail checks for example and local files without exposing values", async () => {
  const dir = await mkdtemp(join(tmpdir(), "secretshape-duplicates-"));
  const schemaPath = join(dir, "secretshape.yaml");
  const examplePath = join(dir, ".env.example");
  const localPath = join(dir, ".env.local");
  await writeFile(schemaPath, "secrets:\n  API_KEY:\n    required: true\n");
  await writeFile(examplePath, "API_KEY=example-first\nAPI_KEY=example-second\n");
  await writeFile(localPath, "API_KEY=local-first\nAPI_KEY=local-second\n");

  const result = await checkFiles({ schemaPath, examplePath, localPath });
  const duplicates = result.issues.filter((issue) => issue.code === "duplicate_variable");

  assert.equal(result.ok, false);
  assert.deepEqual(duplicates.map(({ source, line, message }) => ({ source, line, message })), [
    {
      source: "example",
      line: 2,
      message: "API_KEY is defined more than once in example (lines 1 and 2)",
    },
    {
      source: "local",
      line: 2,
      message: "API_KEY is defined more than once in local (lines 1 and 2)",
    },
  ]);
  assert.doesNotMatch(JSON.stringify(result), /example-(?:first|second)|local-(?:first|second)/);
});
