import { loadEnvShape } from "./env.js";
import { loadSchema } from "./schema.js";

export async function checkFiles({ schemaPath, examplePath, localPath }) {
  const schema = await loadSchema(schemaPath);
  const example = await loadEnvShape(examplePath);
  const local = localPath ? await loadEnvShape(localPath) : null;

  return checkShapes({ schema, example, local });
}

export function checkShapes({ schema, example, local = null }) {
  const required = Object.values(schema.secrets);
  const issues = [];
  const documentedNames = new Set(example.entries.keys());
  const schemaNames = new Set(required.map((secret) => secret.name));

  for (const parseError of example.errors) {
    issues.push({
      severity: "error",
      code: parseError.code,
      name: parseError.name,
      source: "example",
      line: parseError.line,
      message: formatParseError(parseError, "example"),
    });
  }

  for (const secret of required) {
    const documented = example.entries.get(secret.name);

    if (!documented && secret.required) {
      issues.push({
        severity: "error",
        code: "missing_required",
        name: secret.name,
        source: "example",
        message: `${secret.name} is required but missing from example`,
      });
      continue;
    }

    if (!documented) {
      continue;
    }

    validateEntry(issues, secret, documented, "example");
  }

  for (const name of documentedNames) {
    if (!schemaNames.has(name)) {
      issues.push({
        severity: "warning",
        code: "stale",
        name,
        source: "example",
        line: example.entries.get(name).line,
        message: `${name} appears in example but not in schema`,
      });
    }
  }

  if (local) {
    for (const parseError of local.errors) {
      issues.push({
        severity: "error",
        code: parseError.code,
        name: parseError.name,
        source: "local",
        line: parseError.line,
        message: formatParseError(parseError, "local"),
      });
    }

    for (const secret of required) {
      const entry = local.entries.get(secret.name);
      if (!entry && secret.required) {
        issues.push({
          severity: "error",
          code: "missing_local_required",
          name: secret.name,
          source: "local",
          message: `${secret.name} is required but missing from local env`,
        });
        continue;
      }

      if (entry) {
        validateEntry(issues, secret, entry, "local");
      }
    }
  }

  return {
    ok: issues.every((issue) => issue.severity !== "error"),
    issues,
    summary: {
      schemaSecrets: required.length,
      documentedSecrets: documentedNames.size,
      errors: issues.filter((issue) => issue.severity === "error").length,
      warnings: issues.filter((issue) => issue.severity === "warning").length,
    },
  };
}

function formatParseError(error, source) {
  if (error.code === "duplicate_variable") {
    return `${error.name} is defined more than once in ${source} (lines ${error.firstLine} and ${error.line})`;
  }
  return `invalid ${source} env line at ${error.line}`;
}

function validateEntry(issues, secret, entry, source) {
  if (secret.required && entry.empty) {
    issues.push({
      severity: "error",
      code: source === "local" ? "empty_local_required" : "empty_required",
      name: secret.name,
      source,
      line: entry.line,
      message: `${secret.name} is required but empty in ${source}`,
    });
  }

  if (secret.compiledPattern && !secret.compiledPattern.test(entry.value)) {
    issues.push({
      severity: "error",
      code: "pattern_mismatch",
      name: secret.name,
      source,
      line: entry.line,
      message: `${secret.name} does not match required pattern in ${source}`,
    });
  }

  if (secret.enum && !secret.enum.includes(entry.value)) {
    issues.push({
      severity: "error",
      code: "enum_mismatch",
      name: secret.name,
      source,
      line: entry.line,
      message: `${secret.name} is not one of the allowed values in ${source}`,
    });
  }
}
