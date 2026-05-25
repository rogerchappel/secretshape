import { readFile } from "node:fs/promises";

const SECRET_NAME_PATTERN = /^[A-Z_][A-Z0-9_]*$/;

export async function loadSchema(path) {
  const source = await readFile(path, "utf8");
  return parseSchema(source, path);
}

export function parseSchema(source, sourceName = "schema") {
  const parsed = parseYamlSubset(source);
  const secrets = parsed.secrets;

  if (!secrets || typeof secrets !== "object" || Array.isArray(secrets)) {
    throw new Error(`${sourceName}: expected top-level "secrets" map`);
  }

  const entries = Object.entries(secrets).map(([name, shape]) => {
    if (!SECRET_NAME_PATTERN.test(name)) {
      throw new Error(`${sourceName}: invalid secret name "${name}"`);
    }

    if (!shape || typeof shape !== "object" || Array.isArray(shape)) {
      throw new Error(`${sourceName}: secret "${name}" must be a map`);
    }

    const normalized = {
      name,
      required: shape.required !== false,
      optional: shape.required === false,
      pattern: shape.pattern,
      enum: shape.enum,
      description: shape.description ?? "",
    };

    if (normalized.pattern !== undefined && typeof normalized.pattern !== "string") {
      throw new Error(`${sourceName}: "${name}.pattern" must be a string`);
    }

    if (normalized.enum !== undefined) {
      if (!Array.isArray(normalized.enum) || normalized.enum.some((value) => typeof value !== "string")) {
        throw new Error(`${sourceName}: "${name}.enum" must be a string array`);
      }
    }

    if (typeof normalized.description !== "string") {
      throw new Error(`${sourceName}: "${name}.description" must be a string`);
    }

    if (shape.required !== undefined && typeof shape.required !== "boolean") {
      throw new Error(`${sourceName}: "${name}.required" must be true or false`);
    }

    return normalized;
  });

  return {
    secrets: Object.fromEntries(entries.map((secret) => [secret.name, secret])),
  };
}

function parseYamlSubset(source) {
  const root = {};
  const stack = [{ indent: -1, value: root }];
  const lines = source.split(/\r?\n/);

  for (const rawLine of lines) {
    const withoutComment = stripComment(rawLine);
    if (!withoutComment.trim()) {
      continue;
    }

    const indent = withoutComment.match(/^ */)[0].length;
    if (indent % 2 !== 0) {
      throw new Error("YAML indentation must use two-space steps");
    }

    const line = withoutComment.trim();
    const match = line.match(/^([^:]+):(.*)$/);
    if (!match) {
      throw new Error(`Unsupported YAML line: ${line}`);
    }

    const key = unquote(match[1].trim());
    const rawValue = match[2].trim();

    while (stack.at(-1).indent >= indent) {
      stack.pop();
    }

    const parent = stack.at(-1).value;
    if (!parent || typeof parent !== "object" || Array.isArray(parent)) {
      throw new Error(`Cannot assign "${key}" under a scalar value`);
    }

    if (rawValue === "") {
      const child = {};
      parent[key] = child;
      stack.push({ indent, value: child });
    } else {
      parent[key] = parseScalar(rawValue);
    }
  }

  return root;
}

function parseScalar(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "[]") return [];
  if (value.startsWith("[") && value.endsWith("]")) {
    const inner = value.slice(1, -1).trim();
    if (!inner) return [];
    return splitInlineList(inner).map((item) => unquote(item.trim()));
  }
  return unquote(value);
}

function splitInlineList(value) {
  const items = [];
  let current = "";
  let quote = null;

  for (const char of value) {
    if ((char === "\"" || char === "'") && quote === null) {
      quote = char;
    } else if (char === quote) {
      quote = null;
    }

    if (char === "," && quote === null) {
      items.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  items.push(current);
  return items;
}

function stripComment(line) {
  let quote = null;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if ((char === "\"" || char === "'") && quote === null) {
      quote = char;
    } else if (char === quote) {
      quote = null;
    } else if (char === "#" && quote === null) {
      return line.slice(0, index);
    }
  }
  return line;
}

function unquote(value) {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
