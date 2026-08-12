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
    const previous = entries.get(name);
    if (previous) {
      errors.push({
        line: lineNumber,
        firstLine: previous.line,
        code: "duplicate_variable",
        name,
      });
      return;
    }

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

  const comment = findInlineComment(trimmed, /^\s/.test(rawValue));
  return (comment === -1 ? trimmed : trimmed.slice(0, comment)).trimEnd();
}

function findInlineComment(value, commentAtStart) {
  for (let index = 0; index < value.length; index += 1) {
    if (
      value[index] !== "#" ||
      (index === 0 ? !commentAtStart : !/\s/.test(value[index - 1]))
    ) {
      continue;
    }

    let backslashes = 0;
    for (let cursor = index - 2; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
      backslashes += 1;
    }
    if (backslashes % 2 === 0) {
      return index;
    }
  }
  return -1;
}
