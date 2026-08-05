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

test("rejects unknown top-level keys with source, key path, and line", () => {
  assert.throws(
    () => parseSchema(
      "secrets:\n  API_KEY:\n    required: true\nversion: 1\n",
      "config/secretshape.yaml",
    ),
    /config\/secretshape\.yaml:4: unsupported key "version"/,
  );
});

test("rejects misspelled secret fields with source, key path, and line", () => {
  assert.throws(
    () => parseSchema(
      "secrets:\n  API_KEY:\n    requred: false\n",
      "config/secretshape.yaml",
    ),
    /config\/secretshape\.yaml:3: unsupported key "secrets\.API_KEY\.requred"/,
  );

  assert.throws(
    () => parseSchema(
      "secrets:\n  API_KEY:\n    required: true\n    patern: \"\^sk_\"\n",
      "config/secretshape.yaml",
    ),
    /config\/secretshape\.yaml:4: unsupported key "secrets\.API_KEY\.patern"/,
  );
});

test("rejects malformed patterns with the schema source and secret name", () => {
  assert.throws(
    () => parseSchema('secrets:\n  API_KEY:\n    pattern: "["\n', "config/secretshape.yaml"),
    /config\/secretshape\.yaml: invalid pattern for "API_KEY\.pattern"/,
  );
});

test("compiles valid patterns when the schema is parsed", () => {
  const schema = parseSchema('secrets:\n  API_KEY:\n    pattern: "^sk_[a-z]+$"\n');

  assert.equal(schema.secrets.API_KEY.compiledPattern.test("sk_valid"), true);
  assert.equal(schema.secrets.API_KEY.compiledPattern.test("invalid"), false);
});

test("rejects duplicate secret names with source and line context", () => {
  assert.throws(
    () => parseSchema(
      "secrets:\n  API_KEY:\n    required: true\n  API_KEY:\n    required: false\n",
      "config/secretshape.yaml",
    ),
    /config\/secretshape\.yaml:4: duplicate key "secrets\.API_KEY" \(first defined at line 2\)/,
  );
});

test("rejects duplicate shape fields at the same scope", () => {
  assert.throws(
    () => parseSchema(
      "secrets:\n  API_KEY:\n    required: true\n    required: false\n",
      "secretshape.yaml",
    ),
    /secretshape\.yaml:4: duplicate key "secrets\.API_KEY\.required" \(first defined at line 3\)/,
  );
});
