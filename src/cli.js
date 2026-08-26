#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkFiles } from "./check.js";
import { writeDocs } from "./docs.js";

const DEFAULT_SCHEMA = `secrets:
  API_KEY:
    required: true
    pattern: "^sk_[A-Za-z0-9]+$"
    description: API key used by the app
  NODE_ENV:
    required: false
    enum: [development, test, production]
    description: Runtime environment
`;

const CHECK_OPTIONS = {
  schema: "value",
  example: "value",
  local: "value",
  json: "boolean",
  "fail-on-warning": "boolean",
};
const DOCS_OPTIONS = { schema: "value", out: "value" };

export async function main(argv = process.argv.slice(2), io = process) {
  const [command, ...args] = argv;

  try {
    if ((command === "--help" || command === "-h") && args.length === 0) {
      io.stdout.write(usage());
      return 0;
    }

    if (command === "init") {
      rejectArguments(args);
      await writeFile("secretshape.yaml", DEFAULT_SCHEMA, { flag: "wx" });
      io.stdout.write("created secretshape.yaml\n");
      return 0;
    }

    if (command === "check") {
      const options = parseOptions(args, CHECK_OPTIONS);
      const result = await checkFiles({
        schemaPath: options.schema ?? "secretshape.yaml",
        examplePath: options.example ?? ".env.example",
        localPath: options.local,
      });
      const failed = result.ok === false || (options["fail-on-warning"] && result.summary.warnings > 0);

      if (options.json) {
        io.stdout.write(`${JSON.stringify({ ...result, failed }, null, 2)}\n`);
      } else {
        writeHumanCheck(result, io.stdout);
        if (failed && result.ok) {
          io.stdout.write("secretshape: failed because --fail-on-warning was set\n");
        }
      }

      return failed ? 1 : 0;
    }

    if (command === "docs") {
      const options = parseOptions(args, DOCS_OPTIONS);
      const outPath = options.out ?? "docs/secrets.md";
      await mkdir(dirname(outPath), { recursive: true });
      await writeDocs({
        schemaPath: options.schema ?? "secretshape.yaml",
        outPath,
      });
      io.stdout.write(`wrote ${outPath}\n`);
      return 0;
    }

    io.stderr.write(usage());
    return 2;
  } catch (error) {
    io.stderr.write(`${error.message}\n`);
    return 1;
  }
}

function rejectArguments(args) {
  if (args.length > 0) {
    throw new Error(`unexpected argument: ${args[0]}`);
  }
}

function parseOptions(args, allowedOptions) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      throw new Error(`unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const kind = allowedOptions[key];
    if (!kind) {
      throw new Error(`unknown option: ${arg}`);
    }
    if (kind === "boolean") {
      options[key] = true;
      continue;
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`missing value for ${arg}`);
    }
    options[key] = value;
    index += 1;
  }

  return options;
}

function writeHumanCheck(result, stdout) {
  stdout.write(`secretshape: ${result.ok ? "ok" : "failed"}\n`);
  stdout.write(
    `checked ${result.summary.documentedSecrets}/${result.summary.schemaSecrets} documented secrets, ` +
      `${result.summary.errors} errors, ${result.summary.warnings} warnings\n`,
  );

  for (const issue of result.issues) {
    const line = issue.line ? `:${issue.line}` : "";
    stdout.write(`${issue.severity.toUpperCase()} ${issue.source}${line} ${issue.code} ${issue.name ?? ""}\n`);
  }
}

function usage() {
  return `Usage:
  secretshape init
  secretshape check --schema secretshape.yaml --example .env.example [--local .env.local] [--json] [--fail-on-warning]
  secretshape docs --schema secretshape.yaml --out docs/secrets.md
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
