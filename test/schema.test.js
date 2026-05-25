import assert from "node:assert/strict";
import test from "node:test";
import { parseSchema } from "../src/schema.js";

test("parses supported secret schema fields", () => {
  const schema = parseSchema(`
secrets:
  API_KEY:
    required: true
    pattern: "^sk_"
    description: API key
  NODE_ENV:
    required: false
    enum: [development, test]
    description: Runtime
`);

  assert.equal(schema.secrets.API_KEY.required, true);
  assert.equal(schema.secrets.API_KEY.pattern, "^sk_");
  assert.equal(schema.secrets.NODE_ENV.required, false);
  assert.deepEqual(schema.secrets.NODE_ENV.enum, ["development", "test"]);
});

test("rejects schemas without a secrets map", () => {
  assert.throws(() => parseSchema("name: nope"), /top-level "secrets" map/);
});
