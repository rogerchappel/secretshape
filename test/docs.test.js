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
