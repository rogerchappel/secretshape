import assert from "node:assert/strict";
import test from "node:test";
import { parseEnvShape } from "../src/env.js";

test("reports duplicate variables with both line numbers without exposing values", () => {
  const parsed = parseEnvShape("API_KEY=first-sensitive-value\nAPI_KEY=second-sensitive-value\n");

  assert.deepEqual(parsed.errors, [{
    line: 2,
    firstLine: 1,
    code: "duplicate_variable",
    name: "API_KEY",
  }]);
  assert.equal(parsed.entries.get("API_KEY").line, 1);
  assert.doesNotMatch(JSON.stringify(parsed.errors), /sensitive-value/);
});

test("removes whitespace-delimited inline comments from unquoted values", () => {
  const parsed = parseEnvShape("NODE_ENV=production # default runtime\nEMPTY= # intentionally empty\n");

  assert.equal(parsed.entries.get("NODE_ENV").value, "production");
  assert.equal(parsed.entries.get("EMPTY").value, "");
  assert.equal(parsed.entries.get("EMPTY").empty, true);
});

test("preserves quoted, adjacent, and escaped hash characters", () => {
  const parsed = parseEnvShape([
    'DOUBLE="value # in quotes"',
    "SINGLE='value # in quotes'",
    "ADJACENT=value#literal",
    "START=#literal",
    String.raw`ESCAPED=value \#literal`,
  ].join("\n"));

  assert.equal(parsed.entries.get("DOUBLE").value, "value # in quotes");
  assert.equal(parsed.entries.get("SINGLE").value, "value # in quotes");
  assert.equal(parsed.entries.get("ADJACENT").value, "value#literal");
  assert.equal(parsed.entries.get("START").value, "#literal");
  assert.equal(parsed.entries.get("ESCAPED").value, String.raw`value \#literal`);
});
