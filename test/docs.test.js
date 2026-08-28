import assert from "node:assert/strict";
import test from "node:test";
import { renderDocs } from "../src/docs.js";
import { parseSchema } from "../src/schema.js";

test("renders markdown secret documentation", () => {
  const schema = parseSchema(`
secrets:
  API_KEY:
    required: true
    pattern: "^sk_"
    description: API token
`);

  const markdown = renderDocs(schema);
  assert.match(markdown, /# Secret Shape/);
  assert.match(markdown, /\| `API_KEY` \| required \| pattern: `\^sk_` \| API token \|/);
});

test("renders schema-parsed enum values safely in markdown tables", () => {
  const schema = parseSchema(`
secrets:
  MODE:
    required: true
    enum: ["left|right", "tick\`value", "\`edge\`"]
    description: "select a|b"
`);

  const markdown = renderDocs(schema);
  const row = markdown.split("\n").find((line) => line.includes("`MODE`"));

  assert.equal(
    row,
    "| `MODE` | required | one of: `left\\|right`, ``tick`value``, `` `edge` `` | select a\\|b |",
  );
  assert.equal(row.match(/(?<!\\)\|/g).length, 5);
});
