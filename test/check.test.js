import assert from "node:assert/strict";
import test from "node:test";
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
