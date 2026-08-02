import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../src/cli.js";

test("check command emits JSON and returns non-zero on errors", async () => {
  const dir = await mkdtemp(join(tmpdir(), "secretshape-"));
  const schemaPath = join(dir, "secretshape.yaml");
  const examplePath = join(dir, ".env.example");
  await writeFile(schemaPath, "secrets:\n  API_KEY:\n    required: true\n");
  await writeFile(examplePath, "");

  let stdout = "";
  let stderr = "";
  const code = await main(
    ["check", "--schema", schemaPath, "--example", examplePath, "--json"],
    {
      stdout: { write: (value) => (stdout += value) },
      stderr: { write: (value) => (stderr += value) },
    },
  );

  assert.equal(code, 1);
  assert.equal(stderr, "");
  assert.equal(JSON.parse(stdout).issues[0].code, "missing_required");
});

test("docs command writes markdown output", async () => {
  const dir = await mkdtemp(join(tmpdir(), "secretshape-"));
  const schemaPath = join(dir, "secretshape.yaml");
  const outPath = join(dir, "docs", "secrets.md");
  await writeFile(schemaPath, "secrets:\n  API_KEY:\n    required: true\n");

  let stdout = "";
  const code = await main(["docs", "--schema", schemaPath, "--out", outPath], {
    stdout: { write: (value) => (stdout += value) },
    stderr: { write: () => {} },
  });

  assert.equal(code, 0);
  assert.match(stdout, /wrote/);
  assert.match(await readFile(outPath, "utf8"), /API_KEY/);
});

test("check command can fail CI on stale documented warnings", async () => {
  const dir = await mkdtemp(join(tmpdir(), "secretshape-"));
  const schemaPath = join(dir, "secretshape.yaml");
  const examplePath = join(dir, ".env.example");
  await writeFile(schemaPath, "secrets:\n  API_KEY:\n    required: true\n");
  await writeFile(examplePath, "API_KEY=sk_valid\nOLD_TOKEN=legacy\n");

  let stdout = "";
  const code = await main(
    ["check", "--schema", schemaPath, "--example", examplePath, "--json", "--fail-on-warning"],
    {
      stdout: { write: (value) => (stdout += value) },
      stderr: { write: () => {} },
    },
  );

  const parsed = JSON.parse(stdout);
  assert.equal(code, 1);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.failed, true);
  assert.equal(parsed.summary.warnings, 1);
});

test("check command rejects a misspelled option before reading default files", async () => {
  let stderr = "";
  const code = await main(["check", "--scheam", "intended.yaml", "--json"], {
    stdout: { write: () => assert.fail("validation must not run") },
    stderr: { write: (value) => (stderr += value) },
  });

  assert.equal(code, 1);
  assert.equal(stderr, "unknown option: --scheam\n");
});

test("commands reject options that belong to another command", async () => {
  for (const [argv, option] of [
    [["check", "--out", "secrets.md"], "--out"],
    [["docs", "--example", ".env.example"], "--example"],
    [["docs", "--json"], "--json"],
  ]) {
    let stderr = "";
    const code = await main(argv, {
      stdout: { write: () => assert.fail("command must not run") },
      stderr: { write: (value) => (stderr += value) },
    });

    assert.equal(code, 1);
    assert.equal(stderr, `unknown option: ${option}\n`);
  }
});

test("value options reject missing values and positional arguments", async () => {
  for (const [argv, message] of [
    [["check", "--schema", "--json"], "missing value for --schema"],
    [["docs", "--out"], "missing value for --out"],
    [["check", "schema.yaml"], "unexpected argument: schema.yaml"],
  ]) {
    let stderr = "";
    const code = await main(argv, {
      stdout: { write: () => assert.fail("command must not run") },
      stderr: { write: (value) => (stderr += value) },
    });

    assert.equal(code, 1);
    assert.equal(stderr, `${message}\n`);
  }
});
