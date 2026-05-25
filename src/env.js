import { readFile } from "node:fs/promises";

export async function loadEnvShape(path) {
  const source = await readFile(path, "utf8");
  return parseEnvShape(source);
}

export function parseEnvShape(source) {
  const entries = new Map();
  const errors = [];
  const lines = source.split(/\r?\n/);

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      return;
    }

    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match) {
      errors.push({ line: lineNumber, code: "invalid_line", name: null });
      return;
    }

    const [, name, rawValue] = match;
    const value = normalizeValue(rawValue);
    entries.set(name, {
      name,
      line: lineNumber,
      present: true,
      empty: value.length === 0,
      value,
    });
  });

  return { entries, errors };
}

function normalizeValue(rawValue) {
  const trimmed = rawValue.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
