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

export async function main(argv = process.argv.slice(2), io = process) {
  const [command, ...args] = argv;

  try {
    if (command === "init") {
      await writeFile("secretshape.yaml", DEFAULT_SCHEMA, { flag: "wx" });
      io.stdout.write("created secretshape.yaml\n");
      return 0;
    }

    if (command === "check") {
      const options = parseOptions(args);
      const result = await checkFiles({
        schemaPath: options.schema ?? "secretshape.yaml",
        examplePath: options.example ?? ".env.example",
        localPath: options.local,
      });

      if (options.json) {
        io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        writeHumanCheck(result, io.stdout);
      }

      return result.ok ? 0 : 1;
    }

    if (command === "docs") {
      const options = parseOptions(args);
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

function parseOptions(args) {
  const options = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (!arg.startsWith("--")) {
      throw new Error(`unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
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
  secretshape check --schema secretshape.yaml --example .env.example [--local .env.local] [--json]
  secretshape docs --schema secretshape.yaml --out docs/secrets.md
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
