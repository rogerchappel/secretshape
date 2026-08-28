import assert from "node:assert/strict";
import test from "node:test";
import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { main } from "../src/cli.js";

function captureIo() {
  let stdout = "";
  let stderr = "";
  return {
    io: {
      stdout: { write: (value) => (stdout += value) },
      stderr: { write: (value) => (stderr += value) },
    },
    output: () => ({ stdout, stderr }),
  };
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

test("help exits successfully on stdout without creating a schema", async () => {
  const dir = await mkdtemp(join(tmpdir(), "secretshape-help-"));
  const previousCwd = process.cwd();
  const capture = captureIo();
  process.chdir(dir);
  try {
    const code = await main(["--help"], capture.io);
    assert.equal(code, 0);
    assert.match(capture.output().stdout, /^Usage:/);
    assert.equal(capture.output().stderr, "");
    assert.equal(await pathExists(join(dir, "secretshape.yaml")), false);
  } finally {
    process.chdir(previousCwd);
  }
});

for (const args of [["init", "unexpected"], ["init", "--bogus"]]) {
  test(`init rejects ${args[1]} without creating a schema`, async () => {
    const dir = await mkdtemp(join(tmpdir(), "secretshape-init-"));
    const previousCwd = process.cwd();
    const capture = captureIo();
    process.chdir(dir);
    try {
      const code = await main(args, capture.io);
      assert.equal(code, 1);
      assert.equal(capture.output().stdout, "");
      assert.match(capture.output().stderr, /unexpected argument/);
      assert.equal(await pathExists(join(dir, "secretshape.yaml")), false);
    } finally {
      process.chdir(previousCwd);
    }
  });
}

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

test("check and check --json fail on duplicate example and local variables", async () => {
  const dir = await mkdtemp(join(tmpdir(), "secretshape-"));
  const schemaPath = join(dir, "secretshape.yaml");
  const examplePath = join(dir, ".env.example");
  const localPath = join(dir, ".env.local");
  await writeFile(schemaPath, "secrets:\n  API_KEY:\n    required: true\n");
  await writeFile(examplePath, "API_KEY=first-sensitive-value\nAPI_KEY=second-sensitive-value\n");
  await writeFile(localPath, "API_KEY=first-local-sensitive-value\nAPI_KEY=second-local-sensitive-value\n");

  let stdout = "";
  const jsonCode = await main(
    ["check", "--schema", schemaPath, "--example", examplePath, "--local", localPath, "--json"],
    {
      stdout: { write: (value) => (stdout += value) },
      stderr: { write: () => {} },
    },
  );

  const result = JSON.parse(stdout);
  assert.equal(jsonCode, 1);
  assert.equal(result.failed, true);
  assert.deepEqual(result.issues.map(({ source, code }) => ({ source, code })), [
    { source: "example", code: "duplicate_variable" },
    { source: "local", code: "duplicate_variable" },
  ]);
  assert.doesNotMatch(stdout, /sensitive-value/);

  stdout = "";
  const humanCode = await main(
    ["check", "--schema", schemaPath, "--example", examplePath, "--local", localPath],
    {
      stdout: { write: (value) => (stdout += value) },
      stderr: { write: () => {} },
    },
  );
  assert.equal(humanCode, 1);
  assert.match(stdout, /ERROR example:2 duplicate_variable API_KEY/);
  assert.match(stdout, /ERROR local:2 duplicate_variable API_KEY/);
  assert.doesNotMatch(stdout, /sensitive-value/);
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

test("docs command preserves markdown tables for special-character enum values", async () => {
  const dir = await mkdtemp(join(tmpdir(), "secretshape-"));
  const schemaPath = join(dir, "secretshape.yaml");
  const outPath = join(dir, "docs", "secrets.md");
  await writeFile(
    schemaPath,
    'secrets:\n  MODE:\n    enum: ["left|right", "tick`value"]\n    description: "select a|b"\n',
  );

  const code = await main(["docs", "--schema", schemaPath, "--out", outPath], {
    stdout: { write: () => {} },
    stderr: { write: () => {} },
  });

  assert.equal(code, 0);
  assert.match(
    await readFile(outPath, "utf8"),
    /\| `MODE` \| required \| one of: `left\\\|right`, ``tick`value`` \| select a\\\|b \|/,
  );
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
