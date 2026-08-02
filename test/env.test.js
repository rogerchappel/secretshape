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
